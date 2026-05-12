import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─────────────────────────────────────────────────────────────
// SOCKET SINGLETON
// ─────────────────────────────────────────────────────────────
let _socket = null;

function getSocket(base) {
  if (_socket && (_socket.connected || _socket.connecting)) return _socket;
  if (_socket) { _socket.disconnect(); _socket = null; }
  _socket = io(base, {
    transports:           ["websocket", "polling"],
    reconnection:         true,
    reconnectionAttempts: 10,
    reconnectionDelay:    1000,
    timeout:              10000,
    autoConnect:          true,
    forceNew:             false,
  });
  return _socket;
}

// ── Fix Leaflet default icon paths ───────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom icons ─────────────────────────────────────────────
const courierIcon = new L.DivIcon({
  html: `<div style="
    background:linear-gradient(135deg,#3b82f6,#1d4ed8);
    width:44px;height:44px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    border:3px solid white;box-shadow:0 4px 12px rgba(59,130,246,0.6);
    font-size:20px;">🚚</div>`,
  className: "",
  iconSize:   [44, 44],
  iconAnchor: [22, 22],
});

const customerIcon = new L.DivIcon({
  html: `<div style="
    background:linear-gradient(135deg,#ef4444,#dc2626);
    width:44px;height:44px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    display:flex;align-items:center;justify-content:center;
    border:3px solid white;box-shadow:0 4px 12px rgba(239,68,68,0.6);">
    <span style="transform:rotate(45deg);font-size:18px;">📍</span>
  </div>`,
  className: "",
  iconSize:   [44, 44],
  iconAnchor: [22, 44],
});

// ─────────────────────────────────────────────────────────────
// LiveMap
// initialCenter priority:
//   courierPos (live GPS) → initialCenter (login GPS) → customerLoc → Kigali
// ─────────────────────────────────────────────────────────────
function LiveMap({ courierPos, customerLoc, activeOrder, initialCenter }) {
  const containerRef   = useRef(null);
  const mapRef         = useRef(null);
  const courierMarker  = useRef(null);
  const customerMarker = useRef(null);
  const polylineRef    = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // ✅ Open map at courier's position — never a blank/wrong location
    const center = courierPos || initialCenter || customerLoc || [-1.9441, 30.0619];

    const map = L.map(containerRef.current, { center, zoom: 15, zoomControl: true });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current         = null;
      courierMarker.current  = null;
      customerMarker.current = null;
      polylineRef.current    = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const redrawPolyline = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const cp = courierMarker.current?.getLatLng();
    const cu = customerMarker.current?.getLatLng();
    if (!cp || !cu) return;
    const latlngs = [[cp.lat, cp.lng], [cu.lat, cu.lng]];
    if (!polylineRef.current) {
      polylineRef.current = L.polyline(latlngs, {
        color: "#3b82f6", weight: 4, dashArray: "8 6", opacity: 0.85,
      }).addTo(map);
    } else {
      polylineRef.current.setLatLngs(latlngs);
    }
  }, []);

  // ── Courier marker ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !courierPos) return;
    if (!courierMarker.current) {
      courierMarker.current = L.marker(courierPos, { icon: courierIcon })
        .addTo(map)
        .bindPopup(`<strong>📍 You are here</strong><br/>Lat: ${courierPos[0].toFixed(5)}<br/>Lng: ${courierPos[1].toFixed(5)}`);
    } else {
      courierMarker.current.setLatLng(courierPos);
      courierMarker.current.setPopupContent(
        `<strong>📍 You are here</strong><br/>Lat: ${courierPos[0].toFixed(5)}<br/>Lng: ${courierPos[1].toFixed(5)}`
      );
    }
    map.panTo(courierPos, { animate: true, duration: 0.5 });
    redrawPolyline();
  }, [courierPos, redrawPolyline]);

  // ── Customer marker ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !customerLoc) return;
    if (!customerMarker.current) {
      customerMarker.current = L.marker(customerLoc, { icon: customerIcon })
        .addTo(map)
        .bindPopup(
          `<strong>📦 Delivery Destination</strong><br/>${activeOrder?.cust_name || ""}<br/>${activeOrder?.location || ""}`
        );
    } else {
      customerMarker.current.setLatLng(customerLoc);
    }
    redrawPolyline();
  }, [customerLoc, activeOrder, redrawPolyline]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 210px)" }} />
  );
}

// ─────────────────────────────────────────────────────────────
const BASE             = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
const PUSH_INTERVAL_MS = 5000;

export default function CourierDashboard({ onLogout }) {
  const navigate = useNavigate();

  // ── Auth ──────────────────────────────────────────────────
  const courierRef = useRef(null);
  if (!courierRef.current) {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user && !user.id   && user.userId)  user.id   = user.userId;
      if (user && !user.name && user.fullname) user.name = user.fullname;
      courierRef.current = user;
    } catch {}
  }
  const courier = courierRef.current;

  // ── State ─────────────────────────────────────────────────
  const [view,          setView]          = useState("list");
  const [orders,        setOrders]        = useState([]);
  const [activeOrder,   setActiveOrder]   = useState(null);
  const [courierPos,    setCourierPos]    = useState(null);
  const [customerLoc,   setCustomerLoc]   = useState(null);

  // ✅ Seed map starting point from login-time GPS in localStorage
  const [initialCenter, setInitialCenter] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.latitude && user?.longitude)
        return [parseFloat(user.latitude), parseFloat(user.longitude)];
    } catch {}
    return null;
  });

  const [loadingOrders,  setLoadingOrders]  = useState(true);
  const [autoDelivered,  setAutoDelivered]  = useState(false);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState("");
  const [distance,       setDistance]       = useState(null);
  const [gpsLoading,     setGpsLoading]     = useState(false);
  const [loginLocStatus, setLoginLocStatus] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      return user?.latitude ? "updated" : "none";
    } catch {}
    return "none";
  });

  const watchIdRef     = useRef(null);
  const pushTimerRef   = useRef(null);
  const activeOrderRef = useRef(null);
  const latestPosRef   = useRef({ lat: null, lng: null });

  // ── Helpers ───────────────────────────────────────────────
  const showMsg = useCallback((msg, isError = false) => {
    if (isError) { setError(msg);   setTimeout(() => setError(""),   5000); }
    else         { setSuccess(msg); setTimeout(() => setSuccess(""), 5000); }
  }, []);

  // Helper: read login GPS from localStorage
  const getLoginGPS = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user?.latitude && user?.longitude)
        return [parseFloat(user.latitude), parseFloat(user.longitude)];
    } catch {}
    return null;
  };

  // ─────────────────────────────────────────────────────────
  // updateLoginLocation — fires once on mount
  // Sends current GPS → PATCH /user/courier/login-location
  // Stores result in localStorage + sets initialCenter
  // ─────────────────────────────────────────────────────────
  const updateLoginLocation = useCallback(async () => {
    if (!courier?.id || !navigator.geolocation) return;
    setLoginLocStatus("fetching");

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          await axios.patch(`${BASE}/user/courier/login-location`, {
            courierId: courier.id,
            latitude,
            longitude,
          });

          // ✅ Persist so map start point survives refresh
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          stored.latitude  = latitude;
          stored.longitude = longitude;
          localStorage.setItem("user", JSON.stringify(stored));

          // ✅ This becomes the map's starting point when delivery starts
          setInitialCenter([latitude, longitude]);
          setLoginLocStatus("updated");
          console.log(`✅ Login location (map start): ${latitude}, ${longitude}`);
        } catch (err) {
          console.warn("Login location update failed:", err.message);
          setLoginLocStatus("failed");
        }
      },
      (err) => {
        console.warn("GPS denied:", err.message);
        setLoginLocStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [courier?.id]);

  useEffect(() => { updateLoginLocation(); }, [updateLoginLocation]);

  // ── Fetch orders ──────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!courier?.id) { setLoadingOrders(false); return; }
    try {
      setLoadingOrders(true);
      const res = await axios.get(`${BASE}/orders/courier/${courier.id}`);
      setOrders((res.data || []).filter(o => o.status !== "Delivered"));
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed to load orders.", true);
    } finally {
      setLoadingOrders(false);
    }
  }, [courier?.id, showMsg]);

  useEffect(() => { if (courier?.id) fetchOrders(); }, [fetchOrders]);

  // ── Socket ────────────────────────────────────────────────
  useEffect(() => {
    if (!courier?.id) return;
    const socket = getSocket(BASE);

    const onConnect = () => {
      console.log("✅ Socket connected:", socket.id);
      socket.emit("courier:join", courier.id);
    };
    const onNewAssignment = () => {
      fetchOrders();
      showMsg("📦 New order assigned to you!");
    };
    const onAutoDelivered = ({ orderId, message }) => {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setAutoDelivered(true);
      showMsg(message || "✅ Order automatically delivered!");
      setTimeout(() => {
        stopTracking();
        setView("list");
        setActiveOrder(null);
        activeOrderRef.current = null;
        setCourierPos(null);
        setCustomerLoc(null);
        setDistance(null);
        setAutoDelivered(false);
        // ✅ Restore login GPS as center after delivery completes
        const loginGPS = getLoginGPS();
        if (loginGPS) setInitialCenter(loginGPS);
      }, 5000);
    };

    socket.off("connect",              onConnect);
    socket.off("new_assignment",       onNewAssignment);
    socket.off("order:auto_delivered", onAutoDelivered);
    socket.on("connect",               onConnect);
    socket.on("new_assignment",        onNewAssignment);
    socket.on("order:auto_delivered",  onAutoDelivered);

    if (socket.connected) onConnect();
    return () => {
      socket.off("connect",              onConnect);
      socket.off("new_assignment",       onNewAssignment);
      socket.off("order:auto_delivered", onAutoDelivered);
    };
  }, [courier?.id, fetchOrders, showMsg]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push location during delivery ─────────────────────────
  const pushLocation = useCallback(async (orderId, lat, lng) => {
    try {
      const res = await axios.patch(`${BASE}/orders/${orderId}/location`, { lat, lng, label: "" });
      if (res.data?.distance !== undefined) setDistance(res.data.distance);
      const socket = getSocket(BASE);
      if (socket.connected)
        socket.emit("courier:location", { courierId: courier?.id, orderId, lat, lng });
    } catch (err) {
      console.warn("pushLocation error:", err.message);
    }
  }, [courier?.id]);

  // ── Stop GPS ──────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pushTimerRef.current) {
      clearInterval(pushTimerRef.current);
      pushTimerRef.current = null;
    }
    latestPosRef.current = { lat: null, lng: null };
  }, []);

  // ─────────────────────────────────────────────────────────
  // ✅ resolveCustomerLocation
  // Priority 1: order.delivery_lat / delivery_lng (real GPS coords)
  // Priority 2: Geocode order.location text via Nominatim
  // Priority 3: Kigali city centre fallback
  // ─────────────────────────────────────────────────────────
  const resolveCustomerLocation = useCallback(async (order) => {
    // ── Real coords already on the order ─────────────────
    if (order.delivery_lat && order.delivery_lng) {
      const lat = parseFloat(order.delivery_lat);
      const lng = parseFloat(order.delivery_lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log(`🛰️ Using order GPS coords: ${lat}, ${lng}`);
        return [lat, lng];
      }
    }

    // ── Geocode the text address ──────────────────────────
    if (order.location) {
      try {
        const res = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: { q: order.location, format: "json", limit: 1 },
          headers: { "Accept-Language": "en" },
        });
        if (res.data?.length > 0) {
          const lat = parseFloat(res.data[0].lat);
          const lng = parseFloat(res.data[0].lon);
          console.log(`🗺️ Geocoded "${order.location}" → ${lat}, ${lng}`);
          return [lat, lng];
        }
      } catch (err) {
        console.warn("Geocode failed:", err.message);
      }
    }

    console.warn("⚠️ Customer location unresolvable, falling back to Kigali");
    return [-1.9441, 30.0619];
  }, []);

  // ─────────────────────────────────────────────────────────
  // ✅ startDelivery
  //
  // Timeline:
  // 1. Immediately set initialCenter = login-time GPS
  //    → map opens at courier's known position instantly
  // 2. Resolve customer destination in parallel (non-blocking)
  //    → customer marker appears as soon as geocoding finishes
  // 3. Get fresh live GPS fix
  //    → replaces initialCenter with exact current position
  //    → courier marker placed, route line drawn
  // 4. Open map view
  // 5. Start watchPosition + push interval
  // ─────────────────────────────────────────────────────────
  const startDelivery = async (order) => {
    if (!navigator.geolocation) {
      showMsg("Geolocation is not supported by your device.", true);
      return;
    }

    stopTracking();
    setGpsLoading(true);
    setActiveOrder(order);
    activeOrderRef.current = order;
    setAutoDelivered(false);
    setDistance(null);
    setCourierPos(null);
    setCustomerLoc(null);

    // ✅ Step 1: Set login GPS as starting center immediately
    // Map will open here even before live GPS resolves
    const loginGPS = getLoginGPS();
    setInitialCenter(loginGPS);

    // ── Notify customer via socket ────────────────────────
    const socket = getSocket(BASE);
    if (socket.connected) {
      socket.emit("courier:started_delivery", { courierId: courier.id, orderId: order.id });
    }

    // ✅ Step 2: Resolve customer destination (non-blocking)
    resolveCustomerLocation(order).then(coords => {
      console.log(`🎯 Customer pin placed at: ${coords}`);
      setCustomerLoc(coords);
    });

    // ✅ Step 3: Get precise live GPS fix
    await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude: lat, longitude: lng } }) => {
          const pos = [lat, lng];
          setCourierPos(pos);
          setInitialCenter(pos); // override with exact live fix
          latestPosRef.current = { lat, lng };
          pushLocation(order.id, lat, lng);
          setGpsLoading(false);
          console.log(`🚚 Live start position: ${lat}, ${lng}`);
          resolve();
        },
        (err) => {
          console.error("GPS error:", err.code, err.message);
          // ✅ Map still opens at login GPS — graceful degradation
          if (err.code === 1) showMsg("Location permission denied. Map opens at your last known position.", true);
          else                showMsg("GPS signal weak. Map opens at your login position.", true);
          setGpsLoading(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

    // ✅ Step 4: Open map — always has a starting point
    setView("map");

    // ✅ Step 5: Continuous GPS watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        latestPosRef.current = { lat, lng };
        setCourierPos([lat, lng]);
      },
      (err) => {
        if (err.code === 3) console.warn("GPS timeout, retrying…");
        else console.warn("watchPosition err:", err.code, err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );

    // ✅ Step 5b: Server push every 5s (geofence auto-delivery)
    pushTimerRef.current = setInterval(() => {
      const currentOrder     = activeOrderRef.current;
      const { lat, lng }     = latestPosRef.current;
      if (currentOrder && lat !== null) pushLocation(currentOrder.id, lat, lng);
    }, PUSH_INTERVAL_MS);
  };

  // ── Back to list ──────────────────────────────────────────
  const backToList = () => {
    stopTracking();
    setView("list");
    setActiveOrder(null);
    activeOrderRef.current = null;
    setCourierPos(null);
    setCustomerLoc(null);
    setDistance(null);
    setAutoDelivered(false);
    // ✅ Restore login GPS as center
    const loginGPS = getLoginGPS();
    if (loginGPS) setInitialCenter(loginGPS);
  };

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = () => {
    if (!window.confirm("Logout?")) return;
    stopTracking();
    if (_socket) { _socket.disconnect(); _socket = null; }
    localStorage.removeItem("user");
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  };

  useEffect(() => () => stopTracking(), [stopTracking]);

  const statusColor = (s) => ({
    Pending:   { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    Paid:      { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    Assigned:  { bg: "#ede9fe", color: "#5b21b6", dot: "#7c3aed" },
    Delivered: { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  }[s] || { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" });

  const loginLocBadge = {
    fetching: { label: "📡 Updating location…", bg: "#fef3c7", color: "#92400e" },
    updated:  { label: "📍 Location updated",   bg: "#dcfce7", color: "#166534" },
    denied:   { label: "⚠️ GPS denied",          bg: "#fef2f2", color: "#dc2626" },
    failed:   { label: "⚠️ Location error",      bg: "#fef2f2", color: "#dc2626" },
  }[loginLocStatus] || null;

  if (!courier) { navigate("/login", { replace: true }); return null; }

  return (
    <>
      <div className="cd-root">

        {/* ── Nav ── */}
        <nav className="cd-nav">
          <div className="cd-nav-left">
            {view === "map" && (
              <button className="cd-back-btn" onClick={backToList}>← Back</button>
            )}
            <div className="cd-nav-brand">
              <span className="cd-nav-icon">🚚</span>
              <span>Courier Dashboard</span>
            </div>
          </div>
          <div className="cd-nav-right">
            {loginLocBadge && (
              <span className="cd-loc-badge" style={{ background: loginLocBadge.bg, color: loginLocBadge.color }}>
                {loginLocBadge.label}
              </span>
            )}
            <div className="cd-nav-user">
              <span className="cd-nav-avatar">
                {(courier.name || courier.fullname || "C")[0].toUpperCase()}
              </span>
              <span className="cd-nav-name">{courier.name || courier.fullname || "Courier"}</span>
            </div>
            <button className="cd-logout-btn" onClick={handleLogout}>🚪 Logout</button>
          </div>
        </nav>

        {/* ── Toasts ── */}
        {error   && <div className="cd-toast cd-toast-error">⚠️ {error}</div>}
        {success && <div className="cd-toast cd-toast-success">{success}</div>}

        {/* ══════════════ LIST VIEW ══════════════ */}
        {view === "list" && (
          <div className="cd-list-view">

            {loginLocStatus === "updated" && initialCenter && (
              <div className="cd-login-loc-bar">
                <span>📍</span>
                <span>
                  Your position recorded —&nbsp;
                  <strong>{initialCenter[0].toFixed(5)}, {initialCenter[1].toFixed(5)}</strong>
                  &nbsp;· Map will start here when you begin a delivery
                </span>
              </div>
            )}
            {loginLocStatus === "denied" && (
              <div className="cd-login-loc-bar cd-login-loc-warn">
                <span>⚠️</span>
                <span>GPS denied — map will open at a default position. Enable location and refresh.</span>
              </div>
            )}

            <div className="cd-hero">
              <div className="cd-hero-stat">
                <span className="cd-hero-num">{orders.length}</span>
                <span className="cd-hero-label">Total</span>
              </div>
              <div className="cd-hero-divider" />
              <div className="cd-hero-stat">
                <span className="cd-hero-num cd-hero-num-green">
                  {orders.filter(o => o.status === "Assigned").length}
                </span>
                <span className="cd-hero-label">Assigned</span>
              </div>
              <div className="cd-hero-divider" />
              <div className="cd-hero-stat">
                <span className="cd-hero-num cd-hero-num-blue">
                  {orders.filter(o => o.status === "Paid").length}
                </span>
                <span className="cd-hero-label">Paid</span>
              </div>
            </div>

            <div className="cd-list-header">
              <h2>Your Deliveries</h2>
              <button className="cd-refresh-btn" onClick={fetchOrders} disabled={loadingOrders}>
                {loadingOrders ? "⟳ Loading..." : "↻ Refresh"}
              </button>
            </div>

            {loadingOrders ? (
              <div className="cd-loading"><div className="cd-spinner" /><p>Loading deliveries...</p></div>
            ) : orders.length === 0 ? (
              <div className="cd-empty">
                <span>📭</span>
                <h3>No pending deliveries</h3>
                <p>New orders appear here when assigned to you.</p>
              </div>
            ) : (
              <div className="cd-orders">
                {orders.map(order => {
                  const sc = statusColor(order.status);
                  return (
                    <div key={order.id} className="cd-order-card">
                      <div className="cd-card-top">
                        <div className="cd-card-id">Order #{order.id}</div>
                        <span className="cd-status-pill" style={{ background: sc.bg, color: sc.color }}>
                          <span className="cd-status-dot" style={{ background: sc.dot }} />
                          {order.status}
                        </span>
                      </div>

                      <div className="cd-card-customer">
                        <div className="cd-customer-avatar">
                          {order.cust_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="cd-customer-detail">
                          <h3>{order.cust_name || "Customer"}</h3>
                          <div className="cd-customer-meta">
                            <span>📱 {order.cust_phone || "N/A"}</span>
                            {order.cust_email && <span>✉️ {order.cust_email}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="cd-card-address">
                        <span className="cd-address-icon">📍</span>
                        <div>
                          <span className="cd-address-label">Delivery address</span>
                          <span className="cd-address-value">{order.location || "No address"}</span>
                          {/* ✅ Badge when real GPS coords are already on the order */}
                          {order.delivery_lat && order.delivery_lng && (
                            <span className="cd-address-coords">🛰️ GPS coordinates available</span>
                          )}
                        </div>
                      </div>

                      <div className="cd-card-meta">
                        <div className="cd-card-meta-item"><span>🛍️</span><span>Qty: {order.qty || 1}</span></div>
                        <div className="cd-card-meta-item">
                          <span>🕒</span>
                          <span>{order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}</span>
                        </div>
                      </div>

                      <button
                        className="cd-start-btn"
                        onClick={() => startDelivery(order)}
                        disabled={(order.status !== "Assigned" && order.status !== "Paid") || gpsLoading}
                      >
                        {gpsLoading
                          ? <><span className="cd-btn-spinner-white" />Getting GPS…</>
                          : <><span>🚀</span>Start Delivery</>
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ MAP VIEW ══════════════ */}
        {view === "map" && activeOrder && (
          <div className="cd-map-view">
            <div className="cd-delivery-bar">
              <div className="cd-delivery-info">
                <div className="cd-delivery-title">
                  <span className="cd-pulse-dot" />
                  Delivering to {activeOrder.cust_name || "Customer"}
                </div>
                <div className="cd-delivery-address">📍 {activeOrder.location}</div>
                <div className="cd-delivery-phone">📱 {activeOrder.cust_phone || "N/A"}</div>
              </div>

              {distance !== null && (
                <div className={`cd-distance-badge ${
                  distance <= 100 ? "cd-distance-close" :
                  distance <= 500 ? "cd-distance-near" : "cd-distance-far"
                }`}>
                  <span className="cd-distance-num">
                    {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
                  </span>
                  <span className="cd-distance-label">to customer</span>
                </div>
              )}
            </div>

            {autoDelivered && (
              <div className="cd-auto-delivered-banner">
                🎉 Arrived! Order marked as Delivered. Returning to list…
              </div>
            )}

            {/* ✅ GPS bar shows which position source is active */}
            <div className={`cd-gps-bar ${courierPos ? "cd-gps-active" : "cd-gps-searching"}`}>
              {courierPos
                ? `📡 Live GPS — ${courierPos[0].toFixed(5)}, ${courierPos[1].toFixed(5)} · Auto-delivers within 100 m`
                : initialCenter
                  ? `📍 Map opened at login position — acquiring live GPS signal…`
                  : `⏳ Acquiring GPS signal…`
              }
            </div>

            <div className="cd-map-container">
              <LiveMap
                key={activeOrder.id}
                courierPos={courierPos}
                customerLoc={customerLoc}
                activeOrder={activeOrder}
                initialCenter={initialCenter}
              />

              <div className="cd-map-legend">
                <div className="cd-legend-item"><span className="cd-legend-dot cd-legend-blue" /><span>You</span></div>
                <div className="cd-legend-item"><span className="cd-legend-dot cd-legend-red"  /><span>Customer</span></div>
                <div className="cd-legend-item"><span className="cd-legend-line" /><span>Route</span></div>
              </div>

              <div className="cd-auto-hint">
                🎯 Auto-delivers when within 100 m of customer
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        .cd-root { min-height:100vh; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; display:flex; flex-direction:column; }

        .cd-nav { background:linear-gradient(135deg,#1e293b,#0f172a); padding:0 20px; height:60px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; box-shadow:0 2px 12px rgba(0,0,0,0.2); }
        .cd-nav-left,.cd-nav-right { display:flex; align-items:center; gap:12px; }
        .cd-nav-brand { display:flex; align-items:center; gap:8px; color:white; font-size:18px; font-weight:700; }
        .cd-nav-icon { font-size:22px; }
        .cd-back-btn { background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white; padding:6px 14px; border-radius:20px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; }
        .cd-back-btn:hover { background:rgba(255,255,255,0.2); }
        .cd-nav-user { display:flex; align-items:center; gap:8px; }
        .cd-nav-avatar { width:32px; height:32px; background:linear-gradient(135deg,#3b82f6,#2563eb); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:14px; }
        .cd-nav-name { color:#e2e8f0; font-size:14px; font-weight:500; }
        .cd-logout-btn { background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#ef4444; padding:6px 14px; border-radius:20px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; }
        .cd-logout-btn:hover { background:#ef4444; color:white; }
        .cd-loc-badge { padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; white-space:nowrap; }

        .cd-login-loc-bar { background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:flex-start; gap:10px; font-size:13px; font-weight:500; line-height:1.5; }
        .cd-login-loc-warn { background:#fef2f2; border-color:#fecaca; color:#dc2626; }

        .cd-toast { position:fixed; top:70px; left:50%; transform:translateX(-50%); padding:12px 24px; border-radius:30px; font-size:14px; font-weight:600; z-index:999; animation:cdSlideDown 0.3s ease; box-shadow:0 8px 24px rgba(0,0,0,0.15); white-space:nowrap; max-width:90vw; text-align:center; }
        @keyframes cdSlideDown { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .cd-toast-error   { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .cd-toast-success { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }

        .cd-list-view { flex:1; padding:20px; max-width:640px; margin:0 auto; width:100%; }
        .cd-hero { background:linear-gradient(135deg,#1e293b,#0f172a); border-radius:20px; padding:24px; display:flex; align-items:center; justify-content:space-around; margin-bottom:24px; box-shadow:0 8px 24px rgba(0,0,0,0.12); }
        .cd-hero-stat { text-align:center; }
        .cd-hero-num { display:block; font-size:36px; font-weight:800; color:white; }
        .cd-hero-num-green { color:#34d399; }
        .cd-hero-num-blue  { color:#60a5fa; }
        .cd-hero-label { font-size:12px; color:#94a3b8; font-weight:500; text-transform:uppercase; letter-spacing:0.5px; }
        .cd-hero-divider { width:1px; height:40px; background:rgba(255,255,255,0.1); }
        .cd-list-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
        .cd-list-header h2 { font-size:20px; font-weight:700; color:#1e293b; }
        .cd-refresh-btn { background:white; border:1px solid #e2e8f0; color:#3b82f6; padding:7px 16px; border-radius:20px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; box-shadow:0 2px 6px rgba(0,0,0,0.05); }
        .cd-refresh-btn:hover:not(:disabled) { background:#eff6ff; border-color:#3b82f6; }
        .cd-refresh-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .cd-loading { text-align:center; padding:60px 20px; color:#64748b; }
        .cd-spinner { width:40px; height:40px; border:3px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; margin:0 auto 16px; animation:cdSpin 1s linear infinite; }
        @keyframes cdSpin { to{transform:rotate(360deg)} }
        .cd-empty { text-align:center; padding:60px 20px; }
        .cd-empty span { font-size:56px; display:block; margin-bottom:16px; }
        .cd-empty h3 { font-size:18px; font-weight:700; color:#1e293b; margin-bottom:8px; }
        .cd-empty p  { color:#64748b; font-size:14px; }

        .cd-orders { display:flex; flex-direction:column; gap:14px; }
        .cd-order-card { background:white; border-radius:18px; padding:18px; box-shadow:0 4px 16px rgba(0,0,0,0.06); border:1px solid #e2e8f0; transition:all 0.2s; }
        .cd-order-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.1); }
        .cd-card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .cd-card-id { font-size:12px; font-weight:700; color:#94a3b8; letter-spacing:0.5px; }
        .cd-status-pill { display:flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
        .cd-status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .cd-card-customer { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
        .cd-customer-avatar { width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg,#ede9fe,#ddd6fe); display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#7c3aed; flex-shrink:0; }
        .cd-customer-detail h3 { font-size:15px; font-weight:700; color:#1e293b; margin-bottom:4px; }
        .cd-customer-meta { display:flex; flex-wrap:wrap; gap:10px; font-size:12px; color:#64748b; }
        .cd-card-address { display:flex; align-items:flex-start; gap:10px; background:#f8fafc; border-radius:12px; padding:12px; margin-bottom:12px; border:1px solid #e2e8f0; }
        .cd-address-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
        .cd-address-label { display:block; font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px; }
        .cd-address-value { font-size:14px; font-weight:600; color:#1e293b; display:block; }
        .cd-address-coords { font-size:11px; color:#16a34a; font-weight:600; margin-top:4px; display:block; }
        .cd-card-meta { display:flex; gap:16px; margin-bottom:16px; }
        .cd-card-meta-item { display:flex; align-items:center; gap:6px; font-size:13px; color:#64748b; }
        .cd-start-btn { width:100%; background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border:none; padding:14px; border-radius:14px; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s; box-shadow:0 4px 12px rgba(59,130,246,0.3); }
        .cd-start-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 20px rgba(59,130,246,0.4); }
        .cd-start-btn:disabled { background:#94a3b8; cursor:not-allowed; opacity:0.6; box-shadow:none; }
        .cd-btn-spinner-white { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:cdSpin 0.8s linear infinite; flex-shrink:0; }

        .cd-map-view { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .cd-delivery-bar { background:white; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; gap:16px; box-shadow:0 2px 12px rgba(0,0,0,0.08); z-index:10; flex-wrap:wrap; }
        .cd-delivery-info { flex:1; min-width:200px; }
        .cd-delivery-title { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:700; color:#1e293b; margin-bottom:4px; }
        .cd-pulse-dot { width:10px; height:10px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,0.25); animation:cdPulse 2s infinite; flex-shrink:0; }
        @keyframes cdPulse { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.25)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0.1)} }
        .cd-delivery-address { font-size:13px; color:#64748b; margin-bottom:2px; }
        .cd-delivery-phone   { font-size:13px; color:#64748b; }
        .cd-distance-badge { display:flex; flex-direction:column; align-items:center; padding:10px 18px; border-radius:14px; min-width:84px; transition:all 0.4s ease; }
        .cd-distance-far   { background:#f1f5f9; border:2px solid #e2e8f0; }
        .cd-distance-near  { background:#fef3c7; border:2px solid #f59e0b; }
        .cd-distance-close { background:#dcfce7; border:2px solid #22c55e; animation:distPulse 1s infinite; }
        @keyframes distPulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }
        .cd-distance-num { font-size:18px; font-weight:800; color:#1e293b; line-height:1.2; }
        .cd-distance-close .cd-distance-num { color:#166534; }
        .cd-distance-near  .cd-distance-num { color:#92400e; }
        .cd-distance-label { font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
        .cd-auto-delivered-banner { background:linear-gradient(135deg,#10b981,#059669); color:white; padding:16px 20px; text-align:center; font-size:15px; font-weight:700; z-index:20; animation:slideDown 0.4s ease; }
        @keyframes slideDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        .cd-gps-bar { padding:8px 20px; font-size:12px; font-weight:600; text-align:center; transition:all 0.3s; }
        .cd-gps-active    { background:#dcfce7; color:#166534; }
        .cd-gps-searching { background:#fef3c7; color:#92400e; }
        .cd-map-container { flex:1; position:relative; min-height:0; }
        .cd-map-container > div:first-child { width:100%; height:100%; min-height:calc(100vh - 210px); }
        .cd-map-legend { position:absolute; bottom:60px; left:16px; z-index:1000; background:white; border-radius:12px; padding:10px 14px; display:flex; flex-direction:column; gap:6px; box-shadow:0 4px 16px rgba(0,0,0,0.12); border:1px solid #e2e8f0; }
        .cd-legend-item { display:flex; align-items:center; gap:8px; font-size:12px; color:#475569; font-weight:500; }
        .cd-legend-dot  { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .cd-legend-blue { background:#3b82f6; }
        .cd-legend-red  { background:#ef4444; }
        .cd-legend-line { width:16px; height:3px; background:repeating-linear-gradient(90deg,#3b82f6 0,#3b82f6 5px,transparent 5px,transparent 9px); flex-shrink:0; }
        .cd-auto-hint { position:absolute; bottom:16px; left:50%; transform:translateX(-50%); z-index:1000; background:rgba(15,23,42,0.85); color:white; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:600; white-space:nowrap; backdrop-filter:blur(4px); }

        @media (max-width:480px) {
          .cd-list-view { padding:14px; }
          .cd-hero { padding:18px 12px; }
          .cd-hero-num { font-size:28px; }
          .cd-delivery-bar { flex-direction:column; align-items:stretch; }
          .cd-distance-badge { align-self:center; }
          .cd-nav-name { display:none; }
          .cd-loc-badge { display:none; }
          .cd-auto-hint { font-size:11px; padding:6px 12px; white-space:normal; text-align:center; max-width:80vw; }
        }
      `}</style>
    </>
  );
}