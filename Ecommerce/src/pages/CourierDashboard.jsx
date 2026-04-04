import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet default icon paths broken by Webpack ────────
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
    width:36px;height:36px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    border:3px solid white;box-shadow:0 4px 12px rgba(59,130,246,0.5);
    font-size:16px;">🚚</div>`,
  className: "",
  iconSize:   [36, 36],
  iconAnchor: [18, 18],
});

const customerIcon = new L.DivIcon({
  html: `<div style="
    background:linear-gradient(135deg,#ef4444,#dc2626);
    width:36px;height:36px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    display:flex;align-items:center;justify-content:center;
    border:3px solid white;box-shadow:0 4px 12px rgba(239,68,68,0.5);">
    <span style="transform:rotate(45deg);font-size:14px;">📍</span>
  </div>`,
  className: "",
  iconSize:   [36, 36],
  iconAnchor: [18, 36],
});

// ── Re-center map when courier moves ─────────────────────────
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom(), { animate: true });
  }, [position, map]);
  return null;
}

const BASE = "http://localhost:5000";

export default function CourierDashboard({ onLogout }) {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // ── Auth ─────────────────────────────────────────────────
  const courier = (() => {
    try { 
      const user = JSON.parse(localStorage.getItem("user"));
      // Handle both possible field names
      if (user && !user.id && user.userId) user.id = user.userId;
      if (user && !user.name && user.fullname) user.name = user.fullname;
      return user;
    }
    catch { return null; }
  })();

  // ── State ────────────────────────────────────────────────
  const [view, setView] = useState("list");
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [courierPos, setCourierPos] = useState(null);
  const [delivering, setDelivering] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [customerLocation, setCustomerLocation] = useState(null);
  const watchIdRef = useRef(null);

  // ── Socket setup ─────────────────────────────────────────
  useEffect(() => {
    if (!courier?.id) return;
    
    try {
      const socket = io(BASE, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      
      socketRef.current = socket;
      
      socket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        socket.emit("courier:join", courier.id);
      });
      
      socket.on('courier:joined', (data) => {
        console.log('📡 Joined courier room:', data);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // Don't show error to user, just log it
      });
      
      socket.on('new_assignment', (data) => {
        console.log('🆕 New order assigned:', data);
        fetchOrders(); // Refresh orders
        showMsg('📦 New order assigned to you!');
      });
      
    } catch (err) {
      console.error('Socket setup error:', err);
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [courier?.id]);

  // ── Fetch assigned orders ────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!courier?.id) {
      console.error('No courier ID found');
      setLoadingOrders(false);
      return;
    }
    
    try {
      setLoadingOrders(true);
      // ✅ Using correct route: GET /orders/courier/:courierId
      const res = await axios.get(`${BASE}/orders/courier/${courier.id}`);
      console.log('📋 Orders response:', res.data);
      
      // Filter out delivered orders
      const pendingOrders = (res.data || []).filter(o => o.status !== "Delivered");
      setOrders(pendingOrders);
      console.log(`Loaded ${pendingOrders.length} pending orders`);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(err.response?.data?.message || "Failed to load orders. Please refresh.");
    } finally {
      setLoadingOrders(false);
    }
  }, [courier?.id]);

  useEffect(() => { 
    if (courier?.id) {
      fetchOrders(); 
    }
  }, [fetchOrders, courier?.id]);

  const showMsg = (msg, isError = false) => {
    if (isError) { 
      setError(msg);   
      setTimeout(() => setError(""), 4000); 
    } else { 
      setSuccess(msg); 
      setTimeout(() => setSuccess(""), 4000); 
    }
  };

  // ── Geocode address to coordinates ──
  const geocodeAddress = useCallback(async (address) => {
    if (!address) return null;
    
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1
        }
      });
      
      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        return [parseFloat(lat), parseFloat(lon)];
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    
    // Fallback to Kigali center
    return [-1.9441, 30.0619];
  }, []);

  // ── Start delivery ──
  const startDelivery = async (order) => {
    setActiveOrder(order);
    setDelivering(true);
    setView("map");
    
    const coords = await geocodeAddress(order.location);
    setCustomerLocation(coords);

    if (!navigator.geolocation) {
      showMsg("Geolocation not supported on this device.", true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = [pos.coords.latitude, pos.coords.longitude];
        setCourierPos(position);
        updateCourierLocation(order.id, position[0], position[1]);
      },
      (err) => {
        console.error('Geolocation error:', err);
        showMsg("Could not get your location. Check GPS permissions.", true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const position = [lat, lng];
        setCourierPos(position);
        updateCourierLocation(order.id, lat, lng);
      },
      (err) => {
        console.error('Watch position error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };
  
  const updateCourierLocation = async (orderId, lat, lng) => {
    try {
      // Update courier's last known location in users table
      await axios.patch(`${BASE}/user/courier/${courier.id}/location`, { 
        latitude: lat, 
        longitude: lng 
      });
      
      // Emit via socket for real-time tracking
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("courier:location", {
          courierId: courier.id,
          orderId: orderId,
          lat,
          lng,
        });
      }
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // ── Mark as delivered ────────────────────────────────────
  const markDelivered = async () => {
    if (!activeOrder) return;
    
    if (!window.confirm(`Mark delivery to ${activeOrder.cust_name || 'customer'} as complete?`)) return;
    
    setMarkingDone(true);
    try {
      // ✅ Using correct route: PATCH /orders/:id/deliver
      await axios.patch(`${BASE}/orders/${activeOrder.id}/deliver`);
      
      stopTracking();
      
      // Remove from orders list
      setOrders(prev => prev.filter(o => o.id !== activeOrder.id));
      
      showMsg(`✅ Delivery to ${activeOrder.cust_name || 'customer'} marked as complete!`);
      
      // Reset states
      setView("list");
      setActiveOrder(null);
      setDelivering(false);
      setCourierPos(null);
      setCustomerLocation(null);
      
      // Notify via socket
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("order:delivered", {
          orderId: activeOrder.id,
          courierId: courier.id
        });
      }
      
    } catch (err) {
      console.error('Mark delivered error:', err);
      showMsg(err.response?.data?.message || "Failed to mark as delivered.", true);
    } finally {
      setMarkingDone(false);
    }
  };

  // ── Back to list ─────────────────────────────────────────
  const backToList = () => {
    stopTracking();
    setView("list");
    setActiveOrder(null);
    setDelivering(false);
    setCourierPos(null);
    setCustomerLocation(null);
  };

  // ── Logout ───────────────────────────────────────────────
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    
    stopTracking();
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    localStorage.removeItem("user");
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  };

  // ── Cleanup on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      stopTracking();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // ── Status color helper ──────────────────────────────────
  const statusColor = (s) => ({
    Pending:   { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    Paid:      { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    Assigned:  { bg: "#ede9fe", color: "#5b21b6", dot: "#7c3aed" },
    Delivered: { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  }[s] || { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" });

  // ── Default map center ───────────────────────────────────
  const mapCenter = courierPos || customerLocation || [-1.9441, 30.0619];

  // Check authentication
  if (!courier) {
    navigate("/login", { replace: true });
    return null;
  }

  return (
    <>
      <div className="cd-root">

        {/* ── Top Nav ── */}
        <nav className="cd-nav">
          <div className="cd-nav-left">
            {view === "map" && (
              <button className="cd-back-btn" onClick={backToList}>
                ← Back to List
              </button>
            )}
            <div className="cd-nav-brand">
              <span className="cd-nav-icon">🚚</span>
              <span>Courier Dashboard</span>
            </div>
          </div>
          <div className="cd-nav-right">
            <div className="cd-nav-user">
              <span className="cd-nav-avatar">
                {courier.name?.[0]?.toUpperCase() || courier.fullname?.[0]?.toUpperCase() || "C"}
              </span>
              <span className="cd-nav-name">{courier.name || courier.fullname || "Courier"}</span>
            </div>
            <button className="cd-logout-btn" onClick={handleLogout}>
              <span>🚪</span> Logout
            </button>
          </div>
        </nav>

        {/* ── Toasts ── */}
        {error   && <div className="cd-toast cd-toast-error">⚠️ {error}</div>}
        {success && <div className="cd-toast cd-toast-success">✅ {success}</div>}

        {/* ══════════════════════════════════════
            VIEW: DELIVERIES LIST
        ══════════════════════════════════════ */}
        {view === "list" && (
          <div className="cd-list-view">

            {/* Hero stats */}
            <div className="cd-hero">
              <div className="cd-hero-stat">
                <span className="cd-hero-num">{orders.length}</span>
                <span className="cd-hero-label">Total Orders</span>
              </div>
              <div className="cd-hero-divider" />
              <div className="cd-hero-stat">
                <span className="cd-hero-num cd-hero-num-green">
                  {orders.filter(o => o.status === "Assigned").length}
                </span>
                <span className="cd-hero-label">Ready to Deliver</span>
              </div>
              <div className="cd-hero-divider" />
              <div className="cd-hero-stat">
                <span className="cd-hero-num cd-hero-num-blue">
                  {orders.filter(o => o.status === "Paid").length}
                </span>
                <span className="cd-hero-label">Paid Orders</span>
              </div>
            </div>

            {/* List header */}
            <div className="cd-list-header">
              <h2>Your Deliveries</h2>
              <button className="cd-refresh-btn" onClick={fetchOrders} disabled={loadingOrders}>
                {loadingOrders ? "⟳ Loading..." : "↻ Refresh"}
              </button>
            </div>

            {/* Orders */}
            {loadingOrders ? (
              <div className="cd-loading">
                <div className="cd-spinner" />
                <p>Loading your deliveries...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="cd-empty">
                <span>📭</span>
                <h3>No pending deliveries</h3>
                <p>You're all caught up! New orders will appear here when assigned.</p>
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
                          <span className="cd-address-value">{order.location || "No address provided"}</span>
                        </div>
                      </div>

                      <div className="cd-card-meta">
                        <div className="cd-card-meta-item">
                          <span>🛍️</span>
                          <span>Qty: {order.qty || 1}</span>
                        </div>
                        <div className="cd-card-meta-item">
                          <span>🕒</span>
                          <span>{order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}</span>
                        </div>
                      </div>

                      <button
                        className="cd-start-btn"
                        onClick={() => startDelivery(order)}
                        disabled={order.status !== "Assigned" && order.status !== "Paid"}
                      >
                        <span>🗺️</span>
                        {order.status === "Assigned" ? "Start Delivery" : "Ready for Pickup"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            VIEW: MAP / ACTIVE DELIVERY
        ══════════════════════════════════════ */}
        {view === "map" && activeOrder && (
          <div className="cd-map-view">

            <div className="cd-delivery-bar">
              <div className="cd-delivery-info">
                <div className="cd-delivery-title">
                  <span className="cd-pulse-dot" />
                  Delivering to {activeOrder.cust_name || "Customer"}
                </div>
                <div className="cd-delivery-address">
                  📍 {activeOrder.location}
                </div>
                <div className="cd-delivery-phone">
                  📱 {activeOrder.cust_phone || "No phone provided"}
                </div>
              </div>
              <button
                className={`cd-delivered-btn ${markingDone ? "cd-delivered-btn-loading" : ""}`}
                onClick={markDelivered}
                disabled={markingDone}
              >
                {markingDone
                  ? <><span className="cd-btn-spinner" />Updating...</>
                  : <><span>✅</span>Mark as Delivered</>
                }
              </button>
            </div>

            <div className={`cd-gps-bar ${courierPos ? "cd-gps-active" : "cd-gps-searching"}`}>
              {courierPos
                ? <>📡 GPS Active — your location is being shared</>
                : <>⏳ Acquiring GPS signal...</>
              }
            </div>

            <div className="cd-map-container">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ width: "100%", height: "100%" }}
                zoomControl={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {courierPos && <RecenterMap position={courierPos} />}

                {/* Courier live location */}
                {courierPos && (
                  <Marker position={courierPos} icon={courierIcon}>
                    <Popup>
                      <strong>📍 Your Current Location</strong><br />
                      Lat: {courierPos[0].toFixed(6)}<br />
                      Lng: {courierPos[1].toFixed(6)}
                    </Popup>
                  </Marker>
                )}

                {/* Customer destination */}
                {customerLocation && (
                  <Marker position={customerLocation} icon={customerIcon}>
                    <Popup>
                      <strong>📦 Delivery Destination</strong><br />
                      {activeOrder.cust_name}<br />
                      {activeOrder.location}
                    </Popup>
                  </Marker>
                )}

                {/* Route line */}
                {courierPos && customerLocation && (
                  <Polyline
                    positions={[courierPos, customerLocation]}
                    pathOptions={{ color: "#3b82f6", weight: 4, dashArray: "8 6", opacity: 0.85 }}
                  />
                )}
              </MapContainer>

              <div className="cd-map-legend">
                <div className="cd-legend-item">
                  <span className="cd-legend-dot cd-legend-blue" />
                  <span>Your location</span>
                </div>
                <div className="cd-legend-item">
                  <span className="cd-legend-dot cd-legend-red" />
                  <span>Customer</span>
                </div>
                <div className="cd-legend-item">
                  <span className="cd-legend-line" />
                  <span>Route</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* All your existing styles remain exactly the same */
        * { margin:0; padding:0; box-sizing:border-box; }
        .cd-root {
          min-height: 100vh;
          background: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
        }

        .cd-nav {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          padding: 0 20px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }
        .cd-nav-left, .cd-nav-right { display:flex; align-items:center; gap:12px; }
        .cd-nav-brand { display:flex; align-items:center; gap:8px; color:white; font-size:18px; font-weight:700; }
        .cd-nav-icon { font-size:22px; }
        .cd-back-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cd-back-btn:hover { background: rgba(255,255,255,0.2); }
        .cd-nav-user { display:flex; align-items:center; gap:8px; }
        .cd-nav-avatar {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: 14px;
        }
        .cd-nav-name { color: #e2e8f0; font-size: 14px; font-weight: 500; }
        .cd-logout-btn {
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          color: #ef4444;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cd-logout-btn:hover { background: #ef4444; color: white; }

        .cd-toast {
          position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
          padding: 12px 24px; border-radius: 30px;
          font-size: 14px; font-weight: 600;
          z-index: 999; animation: cdSlideDown 0.3s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          white-space: nowrap;
        }
        @keyframes cdSlideDown { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .cd-toast-error   { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .cd-toast-success { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }

        .cd-list-view { flex:1; padding: 20px; max-width: 640px; margin: 0 auto; width: 100%; }

        .cd-hero {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-around;
          margin-bottom: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .cd-hero-stat { text-align: center; }
        .cd-hero-num { display: block; font-size: 36px; font-weight: 800; color: white; }
        .cd-hero-num-green { color: #34d399; }
        .cd-hero-num-blue  { color: #60a5fa; }
        .cd-hero-label { font-size: 12px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .cd-hero-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.1); }

        .cd-list-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px;
        }
        .cd-list-header h2 { font-size: 20px; font-weight: 700; color: #1e293b; }
        .cd-refresh-btn {
          background: white; border: 1px solid #e2e8f0;
          color: #3b82f6; padding: 7px 16px;
          border-radius: 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }
        .cd-refresh-btn:hover:not(:disabled) { background: #eff6ff; border-color: #3b82f6; }
        .cd-refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .cd-loading { text-align:center; padding:60px 20px; color:#64748b; }
        .cd-spinner { width:40px; height:40px; border:3px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; margin:0 auto 16px; animation:cdSpin 1s linear infinite; }
        @keyframes cdSpin { to{transform:rotate(360deg)} }
        .cd-empty { text-align:center; padding:60px 20px; }
        .cd-empty span { font-size:56px; display:block; margin-bottom:16px; }
        .cd-empty h3 { font-size:18px; font-weight:700; color:#1e293b; margin-bottom:8px; }
        .cd-empty p  { color:#64748b; font-size:14px; }

        .cd-orders { display:flex; flex-direction:column; gap:14px; }
        .cd-order-card {
          background: white;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .cd-order-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .cd-card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .cd-card-id { font-size:12px; font-weight:700; color:#94a3b8; letter-spacing:0.5px; }
        .cd-status-pill { display:flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
        .cd-status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

        .cd-card-customer { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
        .cd-customer-avatar {
          width: 44px; height: 44px; border-radius: 14px;
          background: linear-gradient(135deg, #ede9fe, #ddd6fe);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700; color: #7c3aed; flex-shrink: 0;
        }
        .cd-customer-detail h3 { font-size:15px; font-weight:700; color:#1e293b; margin-bottom:4px; }
        .cd-customer-meta { display:flex; flex-wrap:wrap; gap:10px; font-size:12px; color:#64748b; }

        .cd-card-address {
          display: flex; align-items: flex-start; gap:10px;
          background: #f8fafc; border-radius: 12px; padding: 12px;
          margin-bottom: 12px; border: 1px solid #e2e8f0;
        }
        .cd-address-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
        .cd-address-label { display:block; font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px; }
        .cd-address-value { font-size:14px; font-weight:600; color:#1e293b; }

        .cd-card-meta { display:flex; gap:16px; margin-bottom:16px; }
        .cd-card-meta-item { display:flex; align-items:center; gap:6px; font-size:13px; color:#64748b; }

        .cd-start-btn {
          width: 100%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white; border: none;
          padding: 14px;
          border-radius: 14px;
          font-size: 15px; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }
        .cd-start-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 20px rgba(59,130,246,0.4); }
        .cd-start-btn:active:not(:disabled) { transform:translateY(0); }
        .cd-start-btn:disabled { background: #94a3b8; cursor: not-allowed; opacity: 0.6; }

        .cd-map-view { flex:1; display:flex; flex-direction:column; overflow:hidden; }

        .cd-delivery-bar {
          background: white;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          z-index: 10;
          flex-wrap: wrap;
        }
        .cd-delivery-info { flex:1; min-width: 200px; }
        .cd-delivery-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px;
        }
        .cd-pulse-dot {
          width: 10px; height: 10px; border-radius: 50%; background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.25);
          animation: cdPulse 2s infinite;
        }
        @keyframes cdPulse { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.25)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0.1)} }
        .cd-delivery-address { font-size:13px; color:#64748b; margin-bottom:2px; }
        .cd-delivery-phone   { font-size:13px; color:#64748b; }

        .cd-delivered-btn {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white; border: none;
          padding: 12px 22px; border-radius: 14px;
          font-size: 14px; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(34,197,94,0.3);
          white-space: nowrap;
        }
        .cd-delivered-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 20px rgba(34,197,94,0.4); }
        .cd-delivered-btn:disabled { background:#94a3b8; cursor:not-allowed; }
        .cd-delivered-btn-loading { background: linear-gradient(135deg,#94a3b8,#64748b) !important; }
        .cd-btn-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:cdSpin 1s linear infinite; }

        .cd-gps-bar {
          padding: 8px 20px;
          font-size: 12px; font-weight: 600;
          text-align: center;
          transition: all 0.3s;
        }
        .cd-gps-active    { background:#dcfce7; color:#166534; }
        .cd-gps-searching { background:#fef3c7; color:#92400e; }

        .cd-map-container {
          flex: 1;
          position: relative;
          min-height: 0;
        }
        .cd-map-container .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          min-height: calc(100vh - 200px);
        }

        .cd-map-legend {
          position: absolute; bottom: 24px; left: 16px; z-index: 1000;
          background: white; border-radius: 12px; padding: 10px 14px;
          display: flex; flex-direction: column; gap: 6px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          border: 1px solid #e2e8f0;
        }
        .cd-legend-item { display:flex; align-items:center; gap:8px; font-size:12px; color:#475569; font-weight:500; }
        .cd-legend-dot  { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .cd-legend-blue { background:#3b82f6; }
        .cd-legend-red  { background:#ef4444; }
        .cd-legend-line {
          width: 16px; height: 3px;
          background: repeating-linear-gradient(90deg,#3b82f6 0,#3b82f6 5px,transparent 5px,transparent 9px);
          flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .cd-list-view { padding: 14px; }
          .cd-hero { padding: 18px 12px; }
          .cd-hero-num { font-size: 28px; }
          .cd-delivery-bar { flex-direction: column; align-items: stretch; }
          .cd-delivered-btn { width: 100%; justify-content: center; }
          .cd-nav-name { display: none; }
        }
      `}</style>
    </>
  );
}