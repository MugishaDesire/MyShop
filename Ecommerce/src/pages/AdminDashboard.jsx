import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

const CATEGORIES = ["Electronics", "Fashion", "Food", "Art", "Beauty"];
const BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

export default function AdminDashboard({ onLogout }) {
  const navigate = useNavigate();

  // ── Original state (unchanged) ──────────────────────────────
  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [newItem,  setNewItem]  = useState({ name: "", price: "", stock: "", description: "", category: "", imageFile: null });
  const [editId,   setEditId]   = useState(null);
  const [editItem, setEditItem] = useState({ name: "", price: "", stock: "", description: "", category: "", imageFile: null });
  const [activeTab, setActiveTab] = useState("products");
  const [loading,   setLoading]   = useState({ products: true, orders: true });
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  // ── Cashout state (unchanged) ───────────────────────────────
  const [cashout,       setCashout]       = useState({ phone: "", amount: "" });
  const [cashoutStatus, setCashoutStatus] = useState(null);
  const [cashoutRef,    setCashoutRef]    = useState(null);
  const [cashoutError,  setCashoutError]  = useState("");

  // ── Courier state ──────────────────────────────────────────
  const [couriers,        setCouriers]        = useState([]);
  const [courierLoading,  setCourierLoading]  = useState(false);
  const [newCourier,      setNewCourier]      = useState({ name: "", email: "", phone: "", password: "" });
  const [courierFormErr,  setCourierFormErr]  = useState("");
  const [courierFormOk,   setCourierFormOk]   = useState("");
  const [creatingCourier, setCreatingCourier] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Assign modal state ─────────────────────────────────────
  const [assignModal,   setAssignModal]   = useState(null);
  const [assignCourier, setAssignCourier] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // ── View Details modal state ───────────────────────────────
  const [detailsModal, setDetailsModal] = useState(null);

  // ── Socket: live order status updates from courier ──────────
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(BASE);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("admin:join");
    });

    socket.on("order:status_changed", ({ orderId, status }) => {
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status } : o)
      );
      showMessage(
        status === "Delivered"
          ? `✅ Order #${orderId} has been delivered!`
          : `🚚 Order #${orderId} updated to ${status}`
      );
    });

    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCashout = async () => {
    const { phone, amount } = cashout;
    if (!phone || !amount)
      return setCashoutError("Both phone number and amount are required.");
    if (!/^07[2389]\d{7}$/.test(phone.replace(/\s+/g, "")))
      return setCashoutError("Enter a valid MTN or Airtel Rwanda number (e.g. 078xxxxxxx).");
    if (Number(amount) < 100)
      return setCashoutError("Minimum cashout amount is 100 RWF.");
    setCashoutError("");
    setCashoutStatus("loading");
    try {
      const res = await axios.post(`${BASE}/api/payment/cashout`, {
        amount: Math.round(Number(amount)), phone,
      });
      const { ref } = res.data;
      setCashoutRef(ref);
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await axios.get(`${BASE}/api/payment/status/${ref}`);
          if (statusRes.data.status === "successful") { clearInterval(interval); setCashoutStatus("successful"); }
          else if (statusRes.data.status === "failed") { clearInterval(interval); setCashoutStatus("failed"); setCashoutError("Transfer was rejected. Please try again."); }
          else if (attempts >= 20) { clearInterval(interval); setCashoutStatus("failed"); setCashoutError("Transfer timed out. Check your Paypack dashboard."); }
        } catch { clearInterval(interval); setCashoutStatus("failed"); setCashoutError("Could not verify transfer status."); }
      }, 3000);
    } catch (err) { setCashoutStatus("failed"); setCashoutError(err.response?.data?.error || "Transfer failed. Please try again."); }
  };

  const resetCashout = () => {
    setCashout({ phone: "", amount: "" });
    setCashoutStatus(null);
    setCashoutRef(null);
    setCashoutError("");
  };

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    sessionStorage.removeItem("adminVerified");
    sessionStorage.removeItem("pendingAdminId");
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  };

  const enrichedOrders = useMemo(() => {
    return orders.map(order => {
      const product      = products.find(p => p.id === order.product_id);
      const productPrice = product ? parseFloat(product.price) : 0;
      const quantity     = parseInt(order.qty) || 1;
      return {
        ...order,
        productName:  product ? product.name : `Product #${order.product_id}`,
        productPrice,
        total: productPrice * quantity,
      };
    });
  }, [orders, products]);

  const groupedOrders = useMemo(() => {
    const orderGroups = {};
    enrichedOrders.forEach(order => {
      const orderTime = new Date(order.created_at || order.date || Date.now());
      const timeKey   = Math.floor(orderTime.getTime() / (60 * 1000));
      const groupKey  = `${order.cust_phone}_${order.location}_${timeKey}`;
      if (!orderGroups[groupKey]) {
        orderGroups[groupKey] = {
          id:         order.id,
          cust_name:  order.cust_name,
          cust_phone: order.cust_phone,
          cust_email: order.cust_email,
          location:   order.location,
          status:     order.status,
          courier_id: order.courier_id,
          created_at: order.created_at || order.date,
          items:      [],
          orderIds:   [],
        };
      }
      orderGroups[groupKey].items.push({
        id:          order.id,
        productName: order.productName,
        qty:         order.qty,
        price:       order.productPrice,
        subtotal:    order.total,
      });
      orderGroups[groupKey].orderIds.push(order.id);
      const statusPriority = { Delivered: 4, Assigned: 3, Paid: 2, Pending: 1 };
      if ((statusPriority[order.status] || 0) > (statusPriority[orderGroups[groupKey].status] || 0))
        orderGroups[groupKey].status = order.status;
    });
    return Object.values(orderGroups).map(group => ({
      ...group,
      totalAmount: group.items.reduce((sum, item) => sum + item.subtotal, 0),
      totalItems:  group.items.reduce((sum, item) => sum + item.qty,      0),
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [enrichedOrders]);

  const pendingOrders = useMemo(() =>
    groupedOrders.filter(o => o.status !== "Delivered" && o.status !== "Paid").length,
  [groupedOrders]);

  const salesByStatus = useMemo(() => {
    const stats = { total: 0, pending: 0, paid: 0, delivered: 0 };
    groupedOrders.forEach(order => {
      stats.total += order.totalAmount;
      if      (order.status === "Pending")   stats.pending   += order.totalAmount;
      else if (order.status === "Paid")      stats.paid      += order.totalAmount;
      else if (order.status === "Delivered") stats.delivered += order.totalAmount;
    });
    return stats;
  }, [groupedOrders]);

  const showMessage = (message, isError = false) => {
    if (isError) { setError(message);   setTimeout(() => setError(""),   3000); }
    else         { setSuccess(message); setTimeout(() => setSuccess(""), 3000); }
  };

  // ── Fetch couriers ─────────────────────────────────────────
  const fetchCouriers = async () => {
    try {
      setCourierLoading(true);
      const res = await axios.get(`${BASE}/user/couriers`);
      setCouriers(Array.isArray(res.data.couriers) ? res.data.couriers : []);
    } catch (err) {
      console.error("Failed to load couriers", err);
      setCouriers([]);
      showMessage("Failed to load couriers", true);
    } finally {
      setCourierLoading(false);
    }
  };

  // ── Fetch products + orders + couriers on mount ────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading({ products: true, orders: true });
        const [productsRes, ordersRes] = await Promise.all([
          axios.get(`${BASE}/products`),
          axios.get(`${BASE}/orders`),
        ]);
        setProducts(productsRes.data);
        setOrders(ordersRes.data);
        setLoading({ products: false, orders: false });
      } catch (err) {
        console.error(err);
        setError("Failed to load data. Please check your connection.");
        setLoading({ products: false, orders: false });
      }
    };
    fetchData();
    fetchCouriers();
  }, []);

  // ── Product CRUD (unchanged) ────────────────────────────────
  const addProduct = async () => {
    if (!newItem.name || !newItem.price || !newItem.stock || !newItem.category) {
      showMessage("Please fill in all required fields including category", true); return;
    }
    try {
      const formData = new FormData();
      formData.append("name",        newItem.name);
      formData.append("price",       newItem.price);
      formData.append("description", newItem.description);
      formData.append("stock",       Number(newItem.stock));
      formData.append("category",    newItem.category);
      if (newItem.imageFile) formData.append("image", newItem.imageFile);
      const res = await axios.post(`${BASE}/products`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setProducts([...products, {
        id:          res.data.productId,
        name:        newItem.name,
        price:       newItem.price,
        description: newItem.description,
        stock:       Number(newItem.stock),
        category:    newItem.category,
        image:       res.data.image || null,
      }]);
      setNewItem({ name: "", price: "", stock: "", description: "", category: "", imageFile: null });
      showMessage("Product added successfully!");
    } catch (err) { console.error(err); showMessage("Failed to add product", true); }
  };

  const deleteProduct = (id, name) => {
    if (!id) return showMessage("Invalid product ID", true);
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    axios.delete(`${BASE}/products/${id}`)
      .then(() => { setProducts(products.filter(p => p.id !== id)); showMessage("Product deleted successfully!"); })
      .catch(err => { console.error(err); showMessage("Failed to delete product", true); });
  };

  const startEdit = (product) => {
    setEditId(product.id);
    setEditItem({
      name:        product.name,
      price:       product.price,
      stock:       product.stock,
      description: product.description || "",
      category:    product.category    || "",
      imageFile:   null,
    });
  };

  const saveEdit = () => {
    if (!editItem.name || !editItem.price || !editItem.stock || !editItem.category) {
      showMessage("Please fill in all required fields including category", true); return;
    }
    const formData = new FormData();
    formData.append("name",        editItem.name);
    formData.append("price",       editItem.price);
    formData.append("stock",       editItem.stock);
    formData.append("description", editItem.description);
    formData.append("category",    editItem.category);
    if (editItem.imageFile) formData.append("image", editItem.imageFile);
    axios.put(`${BASE}/products/${editId}`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then(() => {
        setProducts(products.map(p => p.id === editId
          ? { ...p, name: editItem.name, price: editItem.price, stock: editItem.stock, description: editItem.description, category: editItem.category }
          : p
        ));
        setEditId(null);
        setEditItem({ name: "", price: "", stock: "", description: "", category: "", imageFile: null });
        showMessage("Product updated successfully!");
      })
      .catch(err => { console.error(err); showMessage("Failed to update product", true); });
  };

  // ── Order status update ────────────────────────────────────
  const updateOrderStatus = async (orderGroup, customerName) => {
    const itemCount = orderGroup.items.length;
    if (!window.confirm(`Update status for ${customerName}'s order (${itemCount} item${itemCount > 1 ? "s" : ""})?`)) return;
    try {
      const responses = await Promise.all(
        orderGroup.orderIds.map(orderId => axios.patch(`${BASE}/orders/${orderId}/status`))
      );
      const newStatus = responses[0].data.status;
      setOrders(orders.map(o => orderGroup.orderIds.includes(o.id) ? { ...o, status: newStatus } : o));
      showMessage(`Order status updated to ${newStatus}!`);
      // If detailsModal is open for this order, update it too
      if (detailsModal && detailsModal.id === orderGroup.id) {
        setDetailsModal(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) { console.error(err); showMessage("Failed to update order status", true); }
  };

  // ── Courier CRUD ────────────────────────────────────────────
  const createCourier = async () => {
    const { name, email, phone, password } = newCourier;
    setCourierFormErr("");
    setCourierFormOk("");

    if (!name || !email || !phone || !password)
      return setCourierFormErr("All fields are required.");
    if (password.length < 6)
      return setCourierFormErr("Password must be at least 6 characters.");
    if (!/^07[2389]\d{7}$/.test(phone.replace(/\s+/g, "")))
      return setCourierFormErr("Enter a valid MTN or Airtel Rwanda number.");

    setCreatingCourier(true);
    try {
      await axios.post(`${BASE}/user/courier`, {
        fullname:    name,
        email,
        phonenumber: phone,
        password,
      });
      setCourierFormOk(`✅ Courier account for ${name} created successfully!`);
      setNewCourier({ name: "", email: "", phone: "", password: "" });
      fetchCouriers();
      setTimeout(() => setCourierFormOk(""), 4000);
    } catch (err) {
      setCourierFormErr(err.response?.data?.message || "Failed to create courier account.");
    } finally {
      setCreatingCourier(false);
    }
  };

  const deleteCourier = async (id, name) => {
    if (!window.confirm(`Remove courier "${name}"?\nTheir undelivered orders will be unassigned.`)) return;
    try {
      await axios.delete(`${BASE}/user/courier/${id}`);
      setCouriers(couriers.filter(c => c.id !== id));
      setOrders(orders.map(o => o.courier_id === id ? { ...o, courier_id: null, status: "Paid" } : o));
      showMessage("Courier removed successfully!");
    } catch (err) {
      console.error(err);
      showMessage("Failed to remove courier", true);
    }
  };

  const openAssignModal = (orderGroup) => {
    setAssignModal(orderGroup);
    setAssignCourier(orderGroup.courier_id?.toString() || "");
  };

  const confirmAssign = async () => {
    if (!assignCourier) {
      showMessage("Please select a courier", true);
      return;
    }
    setAssignLoading(true);
    try {
      await Promise.all(
        assignModal.orderIds.map(id =>
          axios.patch(`${BASE}/orders/${id}/assign`, {
            courier_id: Number(assignCourier),
          })
        )
      );
      setOrders(prev =>
        prev.map(o =>
          assignModal.orderIds.includes(o.id)
            ? { ...o, courier_id: Number(assignCourier), status: "Assigned" }
            : o
        )
      );
      const assignedCourier = couriers.find(c => c.id === Number(assignCourier));
      showMessage(`✅ Order assigned to ${assignedCourier?.fullname || "courier"} successfully!`);
      setAssignModal(null);
      setAssignCourier("");
    } catch (err) {
      console.error("Assignment error:", err);
      showMessage(err.response?.data?.message || "Failed to assign courier", true);
    } finally {
      setAssignLoading(false);
    }
  };

  const getCourierName = (courier_id) => {
    const c = couriers.find(c => c.id === courier_id);
    return c ? c.fullname : null;
  };

  const couriersWithStats = useMemo(() => {
    if (!Array.isArray(couriers)) return [];
    return couriers.map(c => ({
      ...c,
      activeCount:    orders.filter(o => o.courier_id === c.id && o.status === "Assigned").length,
      deliveredCount: orders.filter(o => o.courier_id === c.id && o.status === "Delivered").length,
    }));
  }, [couriers, orders]);

  const unassignedOrders = useMemo(() =>
    groupedOrders.filter(o => o.status === "Paid" && !o.courier_id),
  [groupedOrders]);

  const filteredOrders = useMemo(() =>
    statusFilter === "all"
      ? groupedOrders
      : groupedOrders.filter(o => o.status === statusFilter),
  [groupedOrders, statusFilter]);

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem("authUser")); }
    catch { return null; }
  })();

  const markDelivered = async (orderGroup) => {
    if (!window.confirm(`Mark ${orderGroup.cust_name}'s order as Delivered?`)) return;
    try {
      await Promise.all(
        orderGroup.orderIds.map(id =>
          axios.patch(`${BASE}/orders/${id}/status`, { status: "Delivered" })
        )
      );
      setOrders(prev =>
        prev.map(o =>
          orderGroup.orderIds.includes(o.id) ? { ...o, status: "Delivered" } : o
        )
      );
      showMessage(`✅ Order marked as Delivered!`);
      if (detailsModal && detailsModal.id === orderGroup.id) {
        setDetailsModal(prev => ({ ...prev, status: "Delivered" }));
      }
    } catch (err) {
      console.error(err);
      showMessage("Failed to mark as delivered", true);
    }
  };

  // ── Format date helper ─────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("en-RW", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          VIEW DETAILS MODAL
      ══════════════════════════════════════════════════════ */}
      {detailsModal && (
        <div className="modal-overlay" onClick={() => setDetailsModal(null)}>
          <div className="modal-box details-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <span className="modal-icon">📋</span>
                <h3>Order Details</h3>
              </div>
              <button className="modal-close" onClick={() => setDetailsModal(null)}>✕</button>
            </div>

            <div className="modal-body details-modal-body">
              {/* Customer info */}
              <div className="details-customer-card">
                <div className="details-customer-avatar">
                  {detailsModal.cust_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="details-customer-info">
                  <h4>{detailsModal.cust_name}</h4>
                  <div className="details-customer-meta">
                    {detailsModal.cust_phone && <span>📱 {detailsModal.cust_phone}</span>}
                    {detailsModal.cust_email && <span>✉️ {detailsModal.cust_email}</span>}
                    {detailsModal.location   && <span>📍 {detailsModal.location}</span>}
                  </div>
                </div>
                <div className="details-status-badge">
                  <span className={`status ${detailsModal.status?.toLowerCase()}`}>
                    {detailsModal.status}
                  </span>
                </div>
              </div>

              {/* Order meta */}
              <div className="details-meta-row">
                <div className="details-meta-item">
                  <span className="details-meta-label">Order Date</span>
                  <span className="details-meta-value">{formatDate(detailsModal.created_at)}</span>
                </div>
                <div className="details-meta-item">
                  <span className="details-meta-label">Items</span>
                  <span className="details-meta-value">{detailsModal.totalItems} item{detailsModal.totalItems !== 1 ? "s" : ""}</span>
                </div>
                {detailsModal.courier_id && (
                  <div className="details-meta-item">
                    <span className="details-meta-label">Courier</span>
                    <span className="details-meta-value courier-highlight">
                      🚚 {getCourierName(detailsModal.courier_id) || `Courier #${detailsModal.courier_id}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Products ordered */}
              <div className="details-section-label">Products Ordered</div>
              <div className="details-items-list">
                <div className="details-items-header">
                  <span>Product</span>
                  <span>Qty</span>
                  <span>Unit Price</span>
                  <span>Subtotal</span>
                </div>
                {detailsModal.items.map((item, i) => (
                  <div key={item.id || i} className="details-item-row">
                    <div className="details-item-name">
                      <div className="details-item-dot" />
                      <span>{item.productName}</span>
                    </div>
                    <span className="details-item-qty">×{item.qty}</span>
                    <span className="details-item-price">${parseFloat(item.price || 0).toFixed(2)}</span>
                    <span className="details-item-subtotal">${parseFloat(item.subtotal || 0).toFixed(2)}</span>
                  </div>
                ))}
                <div className="details-items-total">
                  <span>Total</span>
                  <span className="details-total-amount">${detailsModal.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="modal-footer details-modal-footer">
              {detailsModal.status !== "Delivered" && detailsModal.status !== "Pending" && (
                <button
                  className={`assign-courier-btn ${!detailsModal.courier_id && detailsModal.status === "Paid" ? "assign-courier-btn-urgent" : ""}`}
                  onClick={() => { setDetailsModal(null); openAssignModal(detailsModal); }}
                >
                  🚚 {detailsModal.courier_id ? "Reassign Courier" : "Assign Courier"}
                </button>
              )}
              {detailsModal.status !== "Delivered" && (
                <button
                  className="mark-delivered-btn"
                  onClick={() => { markDelivered(detailsModal); setDetailsModal(null); }}
                >
                  ✅ Mark Delivered
                </button>
              )}
              {detailsModal.status !== "Delivered" && (
                <button
                  className="update-status-button"
                  onClick={() => updateOrderStatus(detailsModal, detailsModal.cust_name)}
                >
                  🔄 Update Status
                </button>
              )}
              <button className="modal-cancel-btn" onClick={() => setDetailsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ASSIGN COURIER MODAL
      ══════════════════════════════════════════════════════ */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <span className="modal-icon">🚚</span>
                <h3>Assign Courier</h3>
              </div>
              <button className="modal-close" onClick={() => setAssignModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-order-info">
                <div className="modal-order-customer">
                  <span className="modal-order-avatar">{assignModal.cust_name?.[0]?.toUpperCase()}</span>
                  <div>
                    <strong>{assignModal.cust_name}</strong>
                    <span>{assignModal.items.length} item{assignModal.items.length > 1 ? "s" : ""} · 📍 {assignModal.location}</span>
                  </div>
                </div>
              </div>
              <p className="modal-section-label">Select a courier</p>
              {couriers.length === 0 ? (
                <div className="modal-no-couriers">
                  <span>😕</span>
                  <p>No couriers yet. Create one in the <strong>Couriers</strong> tab first.</p>
                </div>
              ) : (
                <div className="courier-options">
                  {couriersWithStats.map(c => (
                    <label key={c.id} className={`courier-option ${assignCourier === c.id.toString() ? "selected" : ""}`}>
                      <input type="radio" name="courier" value={c.id} checked={assignCourier === c.id.toString()} onChange={e => setAssignCourier(e.target.value)} />
                      <div className="co-avatar">{c.fullname?.[0]?.toUpperCase()}</div>
                      <div className="co-info">
                        <strong>{c.fullname}</strong>
                        <span>{c.phonenumber || c.email}</span>
                      </div>
                      <div className="co-stats">
                        <span className="co-stat active">{c.activeCount} active</span>
                        <span className="co-stat done">{c.deliveredCount} done</span>
                      </div>
                      {assignCourier === c.id.toString() && <span className="co-check">✓</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="modal-confirm-btn" onClick={confirmAssign} disabled={!assignCourier || assignLoading || couriers.length === 0}>
                {assignLoading ? <><span className="btn-spinner" />Assigning...</> : "✓ Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-container">

        {/* ── Header ── */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="dashboard-title"><span className="title-icon">📊</span>Admin Dashboard</h1>
              <div className="welcome-badge">
                <span className="welcome-text">Welcome back,</span>
                <span className="admin-name">{adminUser?.name || adminUser?.email || "Admin"}</span>
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout}><span>🚪</span><span>Logout</span></button>
          </div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon">📦</div><div className="stat-content"><span className="stat-label">Total Products</span><span className="stat-value">{products.length}</span></div></div>
            <div className="stat-card"><div className="stat-icon">📋</div><div className="stat-content"><span className="stat-label">Total Orders</span><span className="stat-value">{groupedOrders.length}</span></div></div>
            <div className="stat-card"><div className="stat-icon">⏳</div><div className="stat-content"><span className="stat-label">Pending Orders</span><span className="stat-value">{pendingOrders}</span></div></div>
            <div className="stat-card"><div className="stat-icon">🚚</div><div className="stat-content"><span className="stat-label">Couriers</span><span className="stat-value">{couriers.length}</span></div></div>
          </div>
        </header>

        {/* ── Notifications ── */}
        {error   && <div className="notification error"><span>⚠️</span><span>{error}</span></div>}
        {success && <div className="notification success"><span>✅</span><span>{success}</span></div>}

        {/* ── Tabs ── */}
        <div className="tab-navigation">
          <button className={`tab-button ${activeTab === "products" ? "active" : ""}`} onClick={() => setActiveTab("products")}><span>📦</span><span>Products</span></button>
          <button className={`tab-button ${activeTab === "orders" ? "active" : ""}`} onClick={() => setActiveTab("orders")}>
            <span>📋</span><span>Orders</span>
            {unassignedOrders.length > 0 && <span className="tab-badge">{unassignedOrders.length}</span>}
          </button>
          <button className={`tab-button ${activeTab === "couriers" ? "active" : ""}`} onClick={() => setActiveTab("couriers")}><span>🚚</span><span>Couriers</span></button>
        </div>

        {/* ══════════════════════════════════════════════════════
            PRODUCTS TAB
        ══════════════════════════════════════════════════════ */}
        {activeTab === "products" && (
          <>
            <div className="form-section">
              <h2 className="section-header"><span className="header-icon">➕</span>Add New Product</h2>
              <div className="form-grid">
                <div className="form-field"><label>Product Name <span className="required">*</span></label><input type="text" placeholder="e.g. Wireless Headphones" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></div>
                <div className="form-field"><label>Price ($) <span className="required">*</span></label><input type="number" placeholder="0.00" min="0" step="0.01" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} /></div>
                <div className="form-field"><label>Stock Quantity <span className="required">*</span></label><input type="number" placeholder="0" min="0" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: e.target.value })} /></div>
                <div className="form-field">
                  <label>Category <span className="required">*</span></label>
                  <select className="category-select" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                    <option value="">Select a category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-field full-width"><label>Description</label><textarea rows={3} placeholder="Describe the product..." value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} /></div>
                <div className="form-field">
                  <label>Product Image</label>
                  <div className="file-upload">
                    <input type="file" id="product-image" accept="image/*" onChange={e => setNewItem({ ...newItem, imageFile: e.target.files[0] })} />
                    <label htmlFor="product-image" className="file-button"><span>📁 Choose File</span></label>
                    <span className="file-name">{newItem.imageFile ? newItem.imageFile.name : "No file chosen"}</span>
                  </div>
                </div>
              </div>
              <button className="submit-button" onClick={addProduct}><span>➕</span>Add Product</button>
            </div>

            <div className="list-section">
              <h2 className="section-header"><span className="header-icon">📋</span>Product List</h2>
              {loading.products ? (
                <div className="loading-state"><div className="spinner"></div><p>Loading products...</p></div>
              ) : products.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📦</span><h3>No Products Found</h3><p>Add your first product using the form above</p></div>
              ) : (
                <div className="product-grid">
                  {products.map(p => (
                    <div key={p.id} className="product-card">
                      {editId === p.id ? (
                        <div className="edit-form">
                          <h3>Edit Product</h3>
                          <div className="edit-grid">
                            <input type="text"   placeholder="Product name" value={editItem.name}        onChange={e => setEditItem({ ...editItem, name: e.target.value })} />
                            <input type="number" placeholder="Price"        value={editItem.price}       onChange={e => setEditItem({ ...editItem, price: e.target.value })} />
                            <input type="number" placeholder="Stock"        value={editItem.stock}       onChange={e => setEditItem({ ...editItem, stock: e.target.value })} />
                            <select className="category-select" value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value })}>
                              <option value="">Select category</option>
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <textarea className="full-width" rows={2} placeholder="Description" value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} />
                            <div className="file-upload full-width">
                              <input type="file" id={`edit-image-${p.id}`} accept="image/*" onChange={e => setEditItem({ ...editItem, imageFile: e.target.files[0] })} />
                              <label htmlFor={`edit-image-${p.id}`} className="file-button small"><span>📁 Change Image</span></label>
                              <span className="file-name">{editItem.imageFile ? editItem.imageFile.name : "No file chosen"}</span>
                            </div>
                          </div>
                          <div className="edit-actions">
                            <button className="save-button"   onClick={saveEdit}>Save Changes</button>
                            <button className="cancel-button" onClick={() => setEditId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="product-image-container">
                            {p.image
                              ? <img src={`${BASE}/uploads/${p.image}`} alt={p.name} onError={e => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='4' fill='%23e2e8f0'/%3E%3C/svg%3E"; }} />
                              : <div className="no-image">📷</div>}
                          </div>
                          <div className="product-details">
                            <h3 className="product-title">{p.name}</h3>
                            <div className="product-meta">
                              <span className="product-price">${parseFloat(p.price || 0).toFixed(2)}</span>
                              <span className={`stock-badge ${p.stock < 10 ? "low" : p.stock < 50 ? "medium" : "high"}`}>Stock: {p.stock}</span>
                              {p.category && <span className="category-badge">{p.category}</span>}
                            </div>
                            {p.description && <p className="product-description">{p.description.length > 60 ? p.description.slice(0, 60) + "..." : p.description}</p>}
                          </div>
                          <div className="product-actions">
                            <button className="action-button edit"   onClick={() => startEdit(p)}><span>✏️</span>Edit</button>
                            <button className="action-button delete" onClick={() => deleteProduct(p.id, p.name)}><span>🗑️</span>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            ORDERS TAB
        ══════════════════════════════════════════════════════ */}
        {activeTab === "orders" && (
          <div className="list-section">
            <h2 className="section-header"><span className="header-icon">📋</span>Recent Orders</h2>

            {/* ── Status filter bar ── */}
            <div className="order-filter-bar">
              {["all", "Pending", "Paid", "Assigned", "Delivered"].map(s => (
                <button
                  key={s}
                  className={`ofb-btn ${statusFilter === s ? "active" : ""} ofb-${s.toLowerCase()}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s}
                  <span className="ofb-count">
                    {s === "all"
                      ? groupedOrders.length
                      : groupedOrders.filter(o => o.status === s).length}
                  </span>
                </button>
              ))}
            </div>

            {unassignedOrders.length > 0 && statusFilter !== "Delivered" && (
              <div className="unassigned-banner">
                <span>⚠️</span>
                <span><strong>{unassignedOrders.length}</strong> paid order{unassignedOrders.length > 1 ? "s" : ""} need a courier assigned</span>
              </div>
            )}

            {loading.orders ? (
              <div className="loading-state"><div className="spinner"></div><p>Loading orders...</p></div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <h3>No {statusFilter === "all" ? "" : statusFilter} Orders</h3>
                <p>{statusFilter === "all" ? "Orders will appear here when customers make purchases" : `No orders with status "${statusFilter}" found`}</p>
              </div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map(orderGroup => (
                  <div
                    key={orderGroup.id}
                    className={`order-card ${
                      orderGroup.status === "Assigned"                        ? "order-card-assigned"      :
                      orderGroup.status === "Delivered"                       ? "order-card-delivered"     :
                      orderGroup.status === "Paid" && !orderGroup.courier_id  ? "order-card-needs-courier" :
                      ""
                    }`}
                  >
                    {/* ── Order header: customer name + status ── */}
                    <div className="order-header">
                      <div className="customer-info">
                        <div className="customer-name-row">
                          <div className="order-avatar">{orderGroup.cust_name?.[0]?.toUpperCase() || "?"}</div>
                          <div>
                            <h3>{orderGroup.cust_name}</h3>
                            <div className="customer-details">
                              {orderGroup.cust_phone && <span>📱 {orderGroup.cust_phone}</span>}
                              {orderGroup.location   && <span>📍 {orderGroup.location}</span>}
                              <span>🕐 {formatDate(orderGroup.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="order-status-badge">
                        <span className={`status ${orderGroup.status?.toLowerCase()}`}>{orderGroup.status}</span>
                      </div>
                    </div>

                    {/* ── Assigned courier bar ── */}
                    {orderGroup.status === "Assigned" && orderGroup.courier_id && (
                      <div className="order-status-bar order-status-bar-assigned">
                        <span className="osb-pulse-dot" />
                        <span>Out for delivery</span>
                        <span className="osb-courier-name">🚚 {getCourierName(orderGroup.courier_id) || `Courier #${orderGroup.courier_id}`}</span>
                      </div>
                    )}
                    {orderGroup.status === "Delivered" && (
                      <div className="order-status-bar order-status-bar-delivered">
                        ✅ Delivered successfully
                      </div>
                    )}

                    {/* ── Products ordered (inline preview) ── */}
                    <div className="order-items-preview">
                      <div className="order-items-preview-label">
                        🛍️ {orderGroup.totalItems} item{orderGroup.totalItems !== 1 ? "s" : ""} ordered
                      </div>
                      <div className="order-items-chips">
                        {orderGroup.items.slice(0, 3).map((item, i) => (
                          <div key={item.id || i} className="order-item-chip">
                            <span className="chip-name">{item.productName}</span>
                            <span className="chip-qty">×{item.qty}</span>
                            <span className="chip-price">${parseFloat(item.subtotal || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        {orderGroup.items.length > 3 && (
                          <div className="order-item-chip chip-more">
                            +{orderGroup.items.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Footer: total + actions ── */}
                    <div className="order-footer">
                      <div className="order-total">
                        <span>Total:</span>
                        <strong>${orderGroup.totalAmount.toFixed(2)}</strong>
                      </div>
                      <div className="order-actions-row">
                        {/* View Details replaces Update Status as primary action */}
                        <button
                          className="view-details-btn"
                          onClick={() => setDetailsModal(orderGroup)}
                        >
                          👁 View Details
                        </button>

                        {orderGroup.status !== "Delivered" && orderGroup.status !== "Pending" && (
                          <button
                            className={`assign-courier-btn ${!orderGroup.courier_id && orderGroup.status === "Paid" ? "assign-courier-btn-urgent" : ""}`}
                            onClick={() => openAssignModal(orderGroup)}
                          >
                            🚚 {orderGroup.courier_id ? "Reassign" : "Assign Courier"}
                          </button>
                        )}

                        {orderGroup.status !== "Delivered" && (
                          <button
                            className="mark-delivered-btn"
                            onClick={() => markDelivered(orderGroup)}
                          >
                            ✅ Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            COURIERS TAB
        ══════════════════════════════════════════════════════ */}
        {activeTab === "couriers" && (
          <>
            <div className="form-section">
              <h2 className="section-header"><span className="header-icon">➕</span>Create Courier Account</h2>
              <p className="courier-form-hint">Create a login account for a new delivery courier. They will use these credentials to access the Courier Dashboard.</p>
              <div className="form-grid">
                <div className="form-field"><label>Full Name <span className="required">*</span></label><input type="text" placeholder="e.g. Jean Paul Hakizimana" value={newCourier.name} onChange={e => setNewCourier({ ...newCourier, name: e.target.value })} disabled={creatingCourier} /></div>
                <div className="form-field"><label>Email Address <span className="required">*</span></label><input type="email" placeholder="courier@example.com" value={newCourier.email} onChange={e => setNewCourier({ ...newCourier, email: e.target.value })} disabled={creatingCourier} /></div>
                <div className="form-field"><label>Phone Number <span className="required">*</span></label><input type="tel" placeholder="078xxxxxxx" value={newCourier.phone} onChange={e => setNewCourier({ ...newCourier, phone: e.target.value })} disabled={creatingCourier} /></div>
                <div className="form-field"><label>Password <span className="required">*</span></label><input type="password" placeholder="Min. 6 characters" value={newCourier.password} onChange={e => setNewCourier({ ...newCourier, password: e.target.value })} disabled={creatingCourier} /></div>
              </div>
              {courierFormErr && <div className="courier-form-error">⚠️ {courierFormErr}</div>}
              {courierFormOk  && <div className="courier-form-ok">{courierFormOk}</div>}
              <button className={`submit-button ${creatingCourier ? "submit-button-loading" : ""}`} onClick={createCourier} disabled={creatingCourier}>
                {creatingCourier ? <><span className="btn-spinner-dark" />Creating account...</> : <><span>🚚</span>Create Courier Account</>}
              </button>
            </div>

            <div className="list-section">
              <div className="couriers-list-header">
                <h2 className="section-header" style={{ margin: 0 }}><span className="header-icon">🚚</span>Active Couriers</h2>
                <button className="cd-refresh-small" onClick={fetchCouriers}>↻ Refresh</button>
              </div>
              {courierLoading ? (
                <div className="loading-state"><div className="spinner"></div><p>Loading couriers...</p></div>
              ) : couriersWithStats.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">🚚</span><h3>No Couriers Yet</h3><p>Use the form above to create the first courier account.</p></div>
              ) : (
                <div className="couriers-grid">
                  {couriersWithStats.map(c => (
                    <div key={c.id} className="courier-card">
                      <div className="cc-avatar">{c.fullname?.[0]?.toUpperCase()}</div>
                      <div className="cc-info">
                        <h3 className="cc-name">{c.fullname}</h3>
                        <div className="cc-meta">
                          {c.email      && <span>✉️ {c.email}</span>}
                          {c.phonenumber && <span>📱 {c.phonenumber}</span>}
                        </div>
                        <div className="cc-stats">
                          <div className="cc-stat"><span className="cc-stat-num cc-active">{c.activeCount}</span><span className="cc-stat-label">On Delivery</span></div>
                          <div className="cc-stat-divider" />
                          <div className="cc-stat"><span className="cc-stat-num cc-done">{c.deliveredCount}</span><span className="cc-stat-label">Delivered</span></div>
                          <div className="cc-stat-divider" />
                          <div className="cc-stat"><span className="cc-stat-num cc-total">{c.activeCount + c.deliveredCount}</span><span className="cc-stat-label">Total</span></div>
                        </div>
                      </div>
                      <div className="cc-actions">
                        <button className="action-button delete" onClick={() => deleteCourier(c.id, c.fullname)}><span>🗑️</span>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {unassignedOrders.length > 0 && (
              <div className="list-section">
                <h2 className="section-header">
                  <span className="header-icon">⚡</span>
                  Needs Courier Assignment
                  <span className="needs-count">{unassignedOrders.length}</span>
                </h2>
                <p className="courier-form-hint">These orders are paid and waiting for a courier.</p>
                <div className="orders-list">
                  {unassignedOrders.map(og => (
                    <div key={og.id} className="order-card order-card-needs-courier">
                      <div className="order-header">
                        <div className="customer-info">
                          <div className="customer-name-row">
                            <div className="order-avatar">{og.cust_name?.[0]?.toUpperCase() || "?"}</div>
                            <div>
                              <h3>{og.cust_name}</h3>
                              <div className="customer-details">
                                <span>📱 {og.cust_phone}</span>
                                <span>📍 {og.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className={`status ${og.status?.toLowerCase()}`}>{og.status}</span>
                      </div>
                      <div className="order-footer" style={{ marginTop: 0 }}>
                        <div className="order-total"><span>Total:</span><strong>${og.totalAmount.toFixed(2)}</strong></div>
                        <div className="order-actions-row">
                          <button className="view-details-btn" onClick={() => setDetailsModal(og)}>👁 View Details</button>
                          <button className="assign-courier-btn assign-courier-btn-urgent" onClick={() => openAssignModal(og)}>🚚 Assign Courier</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            CASHOUT SECTION
        ══════════════════════════════════════════════════════ */}
        <div className="cashout-section">
          <h2 className="cashout-title"><span>💸</span> Cashout</h2>
          <p className="cashout-subtitle">Transfer money directly to any MTN or Airtel Rwanda mobile money number.</p>
          {cashoutStatus === "successful" ? (
            <div className="cashout-success">
              <div className="cashout-success-icon">🎉</div>
              <h3>Transfer Successful!</h3>
              <p>Money has been sent to <strong>{cashout.phone}</strong></p>
              <p className="cashout-ref">Reference: {cashoutRef}</p>
              <button className="cashout-reset-btn" onClick={resetCashout}>Make Another Transfer</button>
            </div>
          ) : (
            <div className="cashout-form">
              <div className="cashout-field">
                <label>📱 Recipient Phone Number <span className="required">*</span></label>
                <input type="tel" placeholder="078xxxxxxx" value={cashout.phone} onChange={e => { setCashout({ ...cashout, phone: e.target.value }); setCashoutError(""); }} disabled={cashoutStatus === "loading"} />
                <small>MTN or Airtel Rwanda number only</small>
              </div>
              <div className="cashout-field">
                <label>💰 Amount (RWF) <span className="required">*</span></label>
                <input type="number" placeholder="e.g. 5000" min="100" value={cashout.amount} onChange={e => { setCashout({ ...cashout, amount: e.target.value }); setCashoutError(""); }} disabled={cashoutStatus === "loading"} />
                <small>Minimum: 100 RWF</small>
              </div>
              {cashoutError && <div className="cashout-error">⚠️ {cashoutError}</div>}
              {cashoutStatus === "loading" && (
                <div className="cashout-pending">
                  <div className="cashout-spinner"></div>
                  <div>
                    <p>⏳ Sending {Number(cashout.amount).toLocaleString()} RWF to {cashout.phone}...</p>
                    <p style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: 4 }}>Ref: {cashoutRef}</p>
                  </div>
                </div>
              )}
              {cashoutStatus !== "loading" && (
                <button className="cashout-send-btn" onClick={handleCashout} disabled={!cashout.phone || !cashout.amount}>
                  💸 Send {cashout.amount ? `${Number(cashout.amount).toLocaleString()} RWF` : "Money"}
                </button>
              )}
              {cashoutStatus === "failed" && (
                <button className="cashout-retry-btn" onClick={resetCashout}>🔄 Reset & Try Again</button>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            REVENUE SUMMARY
        ══════════════════════════════════════════════════════ */}
        <div className="revenue-summary">
          <h2 className="summary-header"><span className="header-icon">💰</span>Revenue Overview</h2>
          <div className="summary-content">
            <div className="total-revenue">
              <span className="revenue-label">Total Revenue</span>
              <span className="revenue-amount">${salesByStatus.total.toFixed(2)}</span>
            </div>
            <div className="revenue-breakdown">
              <div className="revenue-item pending"><span>⏳ Pending</span><strong>${salesByStatus.pending.toFixed(2)}</strong></div>
              <div className="revenue-item paid"><span>💳 Paid</span><strong>${salesByStatus.paid.toFixed(2)}</strong></div>
              <div className="revenue-item delivered"><span>✅ Delivered</span><strong>${salesByStatus.delivered.toFixed(2)}</strong></div>
            </div>
            <div className="orders-count">From {groupedOrders.length} order{groupedOrders.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

      </div>

      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        .dashboard-container { max-width:1400px; margin:0 auto; padding:24px; background:#f8fafc; min-height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
        .dashboard-header { background:linear-gradient(135deg,#1e293b,#0f172a); border-radius:20px; padding:24px; margin-bottom:24px; box-shadow:0 10px 30px rgba(0,0,0,.1); }
        .header-content { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
        .header-left { display:flex; align-items:center; gap:24px; }
        .dashboard-title { display:flex; align-items:center; gap:12px; font-size:28px; font-weight:700; color:white; margin:0; }
        .title-icon { font-size:32px; }

        .order-filter-bar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
        .ofb-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:20px; border:1px solid #e2e8f0; background:#f8fafc; color:#64748b; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
        .ofb-btn:hover, .ofb-btn.active { border-color:#3b82f6; background:#eff6ff; color:#1d4ed8; }
        .ofb-btn.ofb-pending.active, .ofb-btn.ofb-pending:hover   { background:#fffbeb; color:#92400e; border-color:#fde68a; }
        .ofb-btn.ofb-paid.active, .ofb-btn.ofb-paid:hover         { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
        .ofb-btn.ofb-assigned.active, .ofb-btn.ofb-assigned:hover { background:#faf5ff; color:#6d28d9; border-color:#c4b5fd; }
        .ofb-btn.ofb-delivered.active, .ofb-btn.ofb-delivered:hover { background:#f0fdf4; color:#166534; border-color:#86efac; }
        .ofb-count { background:rgba(0,0,0,.08); padding:1px 7px; border-radius:10px; font-size:11px; }

        /* ── Order card: customer name row ── */
        .customer-name-row { display:flex; align-items:center; gap:12px; }
        .order-avatar { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#3b82f6,#2563eb); display:flex; align-items:center; justify-content:center; color:white; font-size:16px; font-weight:700; flex-shrink:0; }

        /* ── Products preview chips ── */
        .order-items-preview { background:white; border-radius:12px; padding:12px 14px; margin-bottom:16px; border:1px solid #e2e8f0; }
        .order-items-preview-label { font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; }
        .order-items-chips { display:flex; flex-wrap:wrap; gap:8px; }
        .order-item-chip { display:flex; align-items:center; gap:6px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:20px; padding:5px 12px; font-size:13px; }
        .chip-name { font-weight:600; color:#1e293b; }
        .chip-qty { color:#64748b; font-size:12px; }
        .chip-price { color:#059669; font-weight:700; font-size:12px; }
        .chip-more { color:#3b82f6; font-weight:700; background:#eff6ff; border-color:#bfdbfe; }

        /* ── View Details button ── */
        .view-details-btn { background:linear-gradient(135deg,#0ea5e9,#0284c7); color:white; border:none; padding:10px 18px; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:6px; }
        .view-details-btn:hover { transform:translateY(-1px); box-shadow:0 5px 15px rgba(14,165,233,.35); }

        .mark-delivered-btn { background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; padding:10px 18px; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; transition:all .2s; }
        .mark-delivered-btn:hover { transform:translateY(-1px); box-shadow:0 5px 15px rgba(22,163,74,.3); }

        /* ── Details modal ── */
        .details-modal-box { max-width:560px !important; }
        .details-modal-body { padding:20px 24px; max-height:65vh; overflow-y:auto; }
        .details-modal-body::-webkit-scrollbar { width:4px; }
        .details-modal-body::-webkit-scrollbar-track { background:#f1f5f9; border-radius:4px; }
        .details-modal-body::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:4px; }

        .details-customer-card { display:flex; align-items:center; gap:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; margin-bottom:16px; }
        .details-customer-avatar { width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg,#3b82f6,#2563eb); display:flex; align-items:center; justify-content:center; color:white; font-size:20px; font-weight:700; flex-shrink:0; }
        .details-customer-info { flex:1; min-width:0; }
        .details-customer-info h4 { font-size:16px; font-weight:700; color:#1e293b; margin-bottom:6px; }
        .details-customer-meta { display:flex; flex-direction:column; gap:3px; font-size:12px; color:#64748b; }
        .details-status-badge { flex-shrink:0; }

        .details-meta-row { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
        .details-meta-item { flex:1; min-width:120px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 14px; display:flex; flex-direction:column; gap:4px; }
        .details-meta-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; }
        .details-meta-value { font-size:13px; font-weight:600; color:#1e293b; }
        .courier-highlight { color:#7c3aed; }

        .details-section-label { font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; }
        .details-items-list { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:4px; }
        .details-items-header { display:grid; grid-template-columns:1fr 48px 80px 80px; gap:8px; padding:10px 14px; background:#f1f5f9; border-bottom:1px solid #e2e8f0; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
        .details-items-header span:not(:first-child) { text-align:right; }
        .details-item-row { display:grid; grid-template-columns:1fr 48px 80px 80px; gap:8px; padding:11px 14px; border-bottom:1px solid #e2e8f0; align-items:center; transition:background .15s; }
        .details-item-row:last-of-type { border-bottom:none; }
        .details-item-row:hover { background:#f0f9ff; }
        .details-item-name { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#1e293b; }
        .details-item-dot { width:8px; height:8px; border-radius:50%; background:#3b82f6; flex-shrink:0; }
        .details-item-qty  { font-size:13px; color:#64748b; text-align:right; }
        .details-item-price { font-size:13px; color:#64748b; text-align:right; }
        .details-item-subtotal { font-size:14px; font-weight:700; color:#059669; text-align:right; }
        .details-items-total { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:white; border-top:2px solid #e2e8f0; font-size:14px; font-weight:700; color:#1e293b; }
        .details-total-amount { font-size:18px; font-weight:800; color:#1e293b; }

        .details-modal-footer { display:flex; gap:8px; padding:14px 24px; border-top:1px solid #e2e8f0; background:#f8fafc; flex-wrap:wrap; }
        .details-modal-footer .assign-courier-btn,
        .details-modal-footer .mark-delivered-btn,
        .details-modal-footer .update-status-button { flex:1; min-width:120px; justify-content:center; }
        .details-modal-footer .modal-cancel-btn { flex:0 0 auto; min-width:80px; }

        .welcome-badge { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.1); padding:8px 16px; border-radius:30px; }
        .welcome-text { color:#94a3b8; font-size:14px; }
        .admin-name { color:white; font-weight:600; font-size:14px; }
        .logout-button { display:flex; align-items:center; gap:8px; background:rgba(239,68,68,.2); border:1px solid rgba(239,68,68,.3); color:#ef4444; padding:10px 20px; border-radius:12px; font-weight:600; font-size:14px; cursor:pointer; transition:all .2s; }
        .logout-button:hover { background:#ef4444; color:white; transform:translateY(-2px); }
        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .stat-card { display:flex; align-items:center; gap:16px; background:rgba(255,255,255,.1); padding:20px; border-radius:16px; transition:transform .2s; }
        .stat-card:hover { transform:translateY(-2px); background:rgba(255,255,255,.15); }
        .stat-icon { font-size:32px; }
        .stat-content { display:flex; flex-direction:column; }
        .stat-label { color:#94a3b8; font-size:13px; font-weight:500; text-transform:uppercase; letter-spacing:.5px; }
        .stat-value { color:white; font-size:32px; font-weight:700; }
        .notification { display:flex; align-items:center; gap:12px; padding:16px 20px; border-radius:12px; margin-bottom:20px; animation:slideIn .3s ease; }
        @keyframes slideIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        .notification.error   { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }
        .notification.success { background:#f0fdf4; border:1px solid #bbf7d0; color:#16a34a; }
        .tab-navigation { display:flex; gap:10px; margin-bottom:24px; background:white; padding:6px; border-radius:16px; box-shadow:0 2px 10px rgba(0,0,0,.05); }
        .tab-button { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:14px; border:none; border-radius:12px; font-weight:600; font-size:15px; color:#64748b; background:transparent; cursor:pointer; transition:all .2s; position:relative; }
        .tab-button:hover { background:#f1f5f9; color:#1e293b; }
        .tab-button.active { background:#3b82f6; color:white; box-shadow:0 4px 10px rgba(59,130,246,.2); }
        .tab-badge { background:#ef4444; color:white; font-size:11px; font-weight:700; padding:2px 7px; border-radius:20px; margin-left:2px; }
        .section-header { display:flex; align-items:center; gap:10px; font-size:20px; font-weight:700; color:#1e293b; margin-bottom:20px; }
        .header-icon { font-size:24px; }
        .form-section,.list-section { background:white; border-radius:20px; padding:24px; margin-bottom:32px; box-shadow:0 4px 20px rgba(0,0,0,.05); border:1px solid #e2e8f0; }
        .form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:20px; margin-bottom:24px; }
        .form-field { display:flex; flex-direction:column; gap:8px; }
        .form-field.full-width { grid-column:1/-1; }
        .form-field label { font-weight:600; color:#475569; font-size:14px; }
        .required { color:#ef4444; margin-left:4px; }
        .form-field input,.form-field textarea,.category-select { padding:12px 16px; border:2px solid #e2e8f0; border-radius:12px; font-size:14px; transition:all .2s; background:#f8fafc; }
        .form-field input:focus,.form-field textarea:focus,.category-select:focus { outline:none; border-color:#3b82f6; background:white; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
        .category-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; background-color:#f8fafc; }
        .file-upload { display:flex; align-items:center; gap:10px; }
        .file-upload input[type="file"] { display:none; }
        .file-button { background:#3b82f6; color:white; padding:10px 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; }
        .file-button.small { padding:8px 12px; font-size:12px; }
        .file-button:hover { background:#2563eb; }
        .file-name { color:#64748b; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .submit-button { display:flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border:none; padding:14px 24px; border-radius:12px; font-weight:600; font-size:15px; cursor:pointer; transition:all .2s; width:100%; }
        .submit-button:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 20px rgba(59,130,246,.3); }
        .submit-button:disabled { opacity:.7; cursor:not-allowed; }
        .submit-button-loading { background:linear-gradient(135deg,#94a3b8,#64748b) !important; }
        .loading-state { text-align:center; padding:60px; color:#64748b; }
        .spinner { width:40px; height:40px; border:3px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; margin:0 auto 16px; animation:spin 1s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .empty-state { text-align:center; padding:60px; background:#f8fafc; border-radius:16px; border:2px dashed #e2e8f0; }
        .empty-icon { font-size:48px; display:block; margin-bottom:16px; }
        .empty-state h3 { color:#1e293b; margin-bottom:8px; }
        .empty-state p { color:#64748b; }
        .product-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(350px,1fr)); gap:20px; }
        .product-card { background:#f8fafc; border-radius:16px; padding:20px; border:1px solid #e2e8f0; transition:all .2s; }
        .product-card:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,.05); border-color:#cbd5e1; }
        .product-image-container { width:100%; height:160px; background:white; border-radius:12px; overflow:hidden; margin-bottom:16px; display:flex; align-items:center; justify-content:center; border:1px solid #e2e8f0; }
        .product-image-container img { width:100%; height:100%; object-fit:cover; }
        .no-image { font-size:48px; opacity:.3; }
        .product-details { margin-bottom:16px; }
        .product-title { font-size:18px; font-weight:700; color:#1e293b; margin-bottom:8px; }
        .product-meta { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px; }
        .product-price { font-size:18px; font-weight:700; color:#059669; }
        .stock-badge { padding:4px 10px; border-radius:30px; font-size:12px; font-weight:600; }
        .stock-badge.high   { background:#dcfce7; color:#166534; }
        .stock-badge.medium { background:#fef3c7; color:#92400e; }
        .stock-badge.low    { background:#fee2e2; color:#991b1b; }
        .category-badge { background:#eff6ff; color:#1d4ed8; padding:4px 10px; border-radius:30px; font-size:12px; font-weight:600; border:1px solid #bfdbfe; }
        .product-description { color:#64748b; font-size:13px; line-height:1.5; }
        .product-actions { display:flex; gap:10px; }
        .action-button { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px; border:none; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; transition:all .2s; }
        .action-button.edit   { background:#dbeafe; color:#1d4ed8; }
        .action-button.edit:hover   { background:#bfdbfe; transform:translateY(-1px); }
        .action-button.delete { background:#fee2e2; color:#dc2626; }
        .action-button.delete:hover { background:#fecaca; transform:translateY(-1px); }
        .edit-form { background:white; border-radius:12px; padding:16px; }
        .edit-form h3 { margin-bottom:16px; color:#1e293b; font-size:16px; }
        .edit-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
        .edit-grid input,.edit-grid select,.edit-grid textarea { padding:10px; border:2px solid #e2e8f0; border-radius:8px; font-size:13px; }
        .edit-actions { display:flex; gap:10px; }
        .save-button,.cancel-button { flex:1; padding:10px; border:none; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; transition:all .2s; }
        .save-button   { background:#10b981; color:white; }
        .save-button:hover   { background:#059669; transform:translateY(-1px); }
        .cancel-button { background:#f1f5f9; color:#64748b; }
        .cancel-button:hover { background:#e2e8f0; transform:translateY(-1px); }
        .orders-list { display:flex; flex-direction:column; gap:16px; }

        .order-card { background:#f8fafc; border-radius:16px; padding:20px; border:1px solid #e2e8f0; transition:all .3s ease; }
        .order-card-needs-courier { border-color:#fbbf24 !important; background:#fffbeb !important; }
        .order-card-assigned      { border-color:#a78bfa !important; background:linear-gradient(160deg,#faf5ff 0%,#f5f3ff 100%) !important; }
        .order-card-delivered     { border-color:#86efac !important; background:linear-gradient(160deg,#f0fdf4 0%,#ecfdf5 100%) !important; opacity:.92; }

        .order-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:16px; border-bottom:2px solid #e2e8f0; margin-bottom:16px; }
        .customer-info h3 { font-size:16px; font-weight:700; color:#1e293b; margin-bottom:8px; }
        .customer-details { display:flex; flex-wrap:wrap; gap:16px; font-size:13px; color:#64748b; }
        .assigned-courier-badge { background:#ede9fe; color:#6d28d9; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid #c4b5fd; }
        .order-status-badge .status { display:inline-block; padding:6px 14px; border-radius:30px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
        .status { display:inline-block; padding:6px 14px; border-radius:30px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
        .status.delivered { background:#dcfce7; color:#166534; }
        .status.paid      { background:#fef3c7; color:#92400e; }
        .status.pending   { background:#fee2e2; color:#991b1b; }
        .status.assigned  { background:#ede9fe; color:#5b21b6; }

        .order-status-bar { display:flex; align-items:center; gap:10px; border-radius:10px; padding:10px 14px; margin-bottom:14px; font-size:13px; font-weight:600; flex-wrap:wrap; }
        .order-status-bar-assigned  { background:#ede9fe; border:1px solid #c4b5fd; color:#5b21b6; }
        .order-status-bar-delivered { background:#dcfce7; border:1px solid #86efac; color:#166534; justify-content:center; }
        .osb-pulse-dot { width:9px; height:9px; border-radius:50%; background:#7c3aed; flex-shrink:0; animation:osbPulse 1.8s ease infinite; }
        @keyframes osbPulse { 0%{box-shadow:0 0 0 0 rgba(124,58,237,.5)} 70%{box-shadow:0 0 0 7px rgba(124,58,237,0)} 100%{box-shadow:0 0 0 0 rgba(124,58,237,0)} }
        .osb-courier-name { margin-left:auto; background:white; padding:3px 10px; border-radius:20px; font-size:12px; border:1px solid #c4b5fd; white-space:nowrap; }

        .order-footer { display:flex; justify-content:space-between; align-items:center; }
        .order-total { display:flex; align-items:baseline; gap:10px; }
        .order-total span   { color:#64748b; font-size:14px; }
        .order-total strong { font-size:20px; font-weight:800; color:#1e293b; }
        .order-actions-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .update-status-button { background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:white; border:none; padding:10px 20px; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; transition:all .2s; }
        .update-status-button:hover { transform:translateY(-1px); box-shadow:0 5px 15px rgba(139,92,246,.3); }
        .assign-courier-btn { background:linear-gradient(135deg,#7c3aed,#6d28d9); color:white; border:none; padding:10px 18px; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; transition:all .2s; }
        .assign-courier-btn:hover { transform:translateY(-1px); box-shadow:0 5px 15px rgba(109,40,217,.3); }
        .assign-courier-btn-urgent { background:linear-gradient(135deg,#f59e0b,#d97706) !important; animation:urgentPulse 2s infinite; }
        @keyframes urgentPulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.4)} 50%{box-shadow:0 0 0 6px rgba(245,158,11,0)} }
        .unassigned-banner { display:flex; align-items:center; gap:10px; background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:12px 16px; margin-bottom:20px; font-size:14px; color:#92400e; font-weight:600; }
        .courier-form-hint { color:#64748b; font-size:13px; margin-bottom:20px; background:#f8fafc; padding:12px 16px; border-radius:10px; border-left:4px solid #3b82f6; line-height:1.5; }
        .courier-form-error { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:12px 16px; border-radius:10px; font-size:13px; font-weight:600; margin-bottom:16px; }
        .courier-form-ok    { background:#f0fdf4; border:1px solid #bbf7d0; color:#16a34a; padding:12px 16px; border-radius:10px; font-size:13px; font-weight:600; margin-bottom:16px; }
        .btn-spinner-dark { width:18px; height:18px; border:2px solid rgba(255,255,255,.3); border-top-color:white; border-radius:50%; animation:spin 1s linear infinite; display:inline-block; }
        .couriers-list-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .cd-refresh-small { background:white; border:1px solid #e2e8f0; color:#3b82f6; padding:7px 14px; border-radius:20px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
        .cd-refresh-small:hover { background:#eff6ff; border-color:#3b82f6; }
        .couriers-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:16px; }
        .courier-card { background:#f8fafc; border-radius:16px; padding:20px; border:1px solid #e2e8f0; display:flex; align-items:center; gap:16px; transition:all .2s; }
        .courier-card:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,.06); border-color:#cbd5e1; }
        .cc-avatar { width:52px; height:52px; border-radius:16px; flex-shrink:0; background:linear-gradient(135deg,#7c3aed,#6d28d9); display:flex; align-items:center; justify-content:center; color:white; font-size:20px; font-weight:700; }
        .cc-info { flex:1; min-width:0; }
        .cc-name { font-size:15px; font-weight:700; color:#1e293b; margin-bottom:6px; }
        .cc-meta { display:flex; flex-direction:column; gap:3px; font-size:12px; color:#64748b; margin-bottom:12px; }
        .cc-stats { display:flex; align-items:center; gap:8px; }
        .cc-stat { display:flex; flex-direction:column; align-items:center; min-width:48px; }
        .cc-stat-num { font-size:18px; font-weight:800; }
        .cc-stat-label { font-size:10px; color:#94a3b8; font-weight:600; text-transform:uppercase; }
        .cc-stat-divider { width:1px; height:28px; background:#e2e8f0; }
        .cc-active { color:#7c3aed; }
        .cc-done   { color:#059669; }
        .cc-total  { color:#3b82f6; }
        .cc-actions { display:flex; flex-direction:column; }
        .needs-count { background:#ef4444; color:white; font-size:12px; font-weight:700; padding:2px 8px; border-radius:20px; margin-left:8px; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .2s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal-box { background:white; border-radius:20px; width:100%; max-width:480px; box-shadow:0 25px 60px rgba(0,0,0,.25); animation:slideUp .25s ease; overflow:hidden; }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .modal-header { display:flex; justify-content:space-between; align-items:center; padding:20px 24px; background:linear-gradient(135deg,#1e293b,#0f172a); }
        .modal-title-row { display:flex; align-items:center; gap:10px; }
        .modal-icon { font-size:22px; }
        .modal-header h3 { color:white; font-size:18px; font-weight:700; }
        .modal-close { background:rgba(255,255,255,.1); border:none; color:white; width:32px; height:32px; border-radius:8px; font-size:16px; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; }
        .modal-close:hover { background:rgba(255,255,255,.2); }
        .modal-body { padding:20px 24px; }
        .modal-order-info { background:#f8fafc; border-radius:12px; padding:14px; margin-bottom:18px; border:1px solid #e2e8f0; }
        .modal-order-customer { display:flex; align-items:center; gap:12px; }
        .modal-order-avatar { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#3b82f6,#2563eb); display:flex; align-items:center; justify-content:center; color:white; font-size:16px; font-weight:700; flex-shrink:0; }
        .modal-order-customer > div { display:flex; flex-direction:column; gap:3px; }
        .modal-order-customer strong { font-size:15px; color:#1e293b; }
        .modal-order-customer span  { font-size:12px; color:#64748b; }
        .modal-section-label { font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; }
        .modal-no-couriers { text-align:center; padding:24px; background:#f8fafc; border-radius:12px; color:#64748b; font-size:14px; }
        .modal-no-couriers span { font-size:2rem; display:block; margin-bottom:8px; }
        .courier-options { display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto; padding-right:4px; }
        .courier-options::-webkit-scrollbar { width:4px; }
        .courier-options::-webkit-scrollbar-track { background:#f1f5f9; border-radius:4px; }
        .courier-options::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:4px; }
        .courier-option { display:flex; align-items:center; gap:12px; padding:12px 14px; border:2px solid #e2e8f0; border-radius:12px; cursor:pointer; transition:all .2s; position:relative; }
        .courier-option input { display:none; }
        .courier-option:hover  { border-color:#a78bfa; background:#faf5ff; }
        .courier-option.selected { border-color:#7c3aed; background:#faf5ff; }
        .co-avatar { width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg,#7c3aed,#6d28d9); display:flex; align-items:center; justify-content:center; color:white; font-size:15px; font-weight:700; flex-shrink:0; }
        .co-info { flex:1; display:flex; flex-direction:column; gap:2px; }
        .co-info strong { font-size:14px; color:#1e293b; }
        .co-info span   { font-size:12px; color:#64748b; }
        .co-stats { display:flex; flex-direction:column; gap:2px; align-items:flex-end; }
        .co-stat { font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; white-space:nowrap; }
        .co-stat.active { background:#ede9fe; color:#6d28d9; }
        .co-stat.done   { background:#dcfce7; color:#166534; }
        .co-check { background:#7c3aed; color:white; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
        .modal-footer { display:flex; gap:10px; padding:16px 24px; border-top:1px solid #e2e8f0; background:#f8fafc; }
        .modal-cancel-btn { flex:1; padding:12px; border:2px solid #e2e8f0; border-radius:12px; background:white; color:#64748b; font-weight:600; font-size:14px; cursor:pointer; transition:all .2s; }
        .modal-cancel-btn:hover { background:#f1f5f9; border-color:#cbd5e1; }
        .modal-confirm-btn { flex:2; padding:12px; background:linear-gradient(135deg,#7c3aed,#6d28d9); color:white; border:none; border-radius:12px; font-weight:700; font-size:14px; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .modal-confirm-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 16px rgba(109,40,217,.3); }
        .modal-confirm-btn:disabled { background:#94a3b8; cursor:not-allowed; transform:none; }
        .btn-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.3); border-top-color:white; border-radius:50%; animation:spin 1s linear infinite; }
        .cashout-section { background:linear-gradient(135deg,#0f172a,#1e3a5f); border-radius:20px; padding:28px; margin-bottom:24px; box-shadow:0 10px 30px rgba(0,0,0,.15); }
        .cashout-title { display:flex; align-items:center; gap:10px; font-size:22px; font-weight:700; color:white; margin-bottom:8px; }
        .cashout-subtitle { color:#94a3b8; font-size:14px; margin-bottom:24px; }
        .cashout-form { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:end; }
        .cashout-field { display:flex; flex-direction:column; gap:8px; }
        .cashout-field label { font-weight:600; color:#e2e8f0; font-size:14px; }
        .cashout-field input { padding:14px 16px; border:2px solid rgba(255,255,255,.15); border-radius:12px; font-size:15px; background:rgba(255,255,255,.08); color:white; transition:all .2s; outline:none; }
        .cashout-field input::placeholder { color:#64748b; }
        .cashout-field input:focus { border-color:#f97316; background:rgba(255,255,255,.12); box-shadow:0 0 0 3px rgba(249,115,22,.2); }
        .cashout-field input:disabled { opacity:.5; cursor:not-allowed; }
        .cashout-field small { color:#64748b; font-size:12px; }
        .cashout-error { grid-column:1/-1; background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.3); color:#fca5a5; padding:12px 16px; border-radius:10px; font-size:13px; font-weight:600; }
        .cashout-pending { grid-column:1/-1; display:flex; align-items:center; gap:14px; background:rgba(249,115,22,.15); border:1px solid rgba(249,115,22,.3); padding:14px 16px; border-radius:10px; color:#fed7aa; font-weight:600; font-size:14px; }
        .cashout-spinner { width:24px; height:24px; border:3px solid rgba(249,115,22,.3); border-top-color:#f97316; border-radius:50%; animation:spin 1s linear infinite; flex-shrink:0; }
        .cashout-send-btn { grid-column:1/-1; background:linear-gradient(135deg,#f97316,#ea580c); color:white; border:none; padding:16px; border-radius:12px; font-weight:700; font-size:16px; cursor:pointer; transition:all .2s; }
        .cashout-send-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 20px rgba(249,115,22,.4); }
        .cashout-send-btn:disabled { background:#475569; cursor:not-allowed; transform:none; }
        .cashout-retry-btn { grid-column:1/-1; background:rgba(239,68,68,.2); border:1px solid rgba(239,68,68,.3); color:#fca5a5; padding:12px; border-radius:10px; font-weight:600; font-size:14px; cursor:pointer; transition:all .2s; }
        .cashout-retry-btn:hover { background:rgba(239,68,68,.3); }
        .cashout-success { text-align:center; padding:20px; }
        .cashout-success-icon { font-size:3rem; margin-bottom:12px; }
        .cashout-success h3 { color:white; font-size:1.3rem; font-weight:700; margin-bottom:8px; }
        .cashout-success p { color:#94a3b8; font-size:14px; margin-bottom:4px; }
        .cashout-success strong { color:white; }
        .cashout-ref { font-size:12px !important; opacity:.7; margin-top:4px !important; }
        .cashout-reset-btn { margin-top:16px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); color:white; padding:10px 24px; border-radius:10px; font-weight:600; cursor:pointer; transition:all .2s; }
        .cashout-reset-btn:hover { background:rgba(255,255,255,.2); }
        .revenue-summary { background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:20px; padding:24px; color:white; }
        .summary-header { display:flex; align-items:center; gap:10px; font-size:18px; margin-bottom:20px; }
        .summary-content { display:flex; flex-direction:column; gap:20px; }
        .total-revenue { display:flex; justify-content:space-between; align-items:center; padding:16px; background:rgba(255,255,255,.1); border-radius:16px; }
        .revenue-label  { font-size:14px; opacity:.8; }
        .revenue-amount { font-size:32px; font-weight:800; }
        .revenue-breakdown { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .revenue-item { display:flex; flex-direction:column; gap:6px; padding:16px; background:rgba(255,255,255,.1); border-radius:12px; text-align:center; transition:transform .2s; }
        .revenue-item:hover { transform:translateY(-2px); background:rgba(255,255,255,.15); }
        .revenue-item span   { font-size:12px; opacity:.8; }
        .revenue-item strong { font-size:18px; font-weight:700; }
        .revenue-item.pending  strong { color:#fbbf24; }
        .revenue-item.paid     strong { color:#60a5fa; }
        .revenue-item.delivered strong { color:#34d399; }
        .orders-count { text-align:center; font-size:13px; opacity:.7; padding-top:12px; border-top:1px solid rgba(255,255,255,.1); }
        @media (max-width:768px) {
          .dashboard-container { padding:16px; }
          .header-content { flex-direction:column; gap:16px; align-items:flex-start; }
          .header-left { flex-direction:column; align-items:flex-start; gap:12px; }
          .stats-grid { grid-template-columns:1fr 1fr; }
          .cashout-form { grid-template-columns:1fr; }
          .cashout-send-btn,.cashout-retry-btn,.cashout-error,.cashout-pending { grid-column:1; }
          .revenue-breakdown { grid-template-columns:1fr; }
          .order-footer { flex-direction:column; gap:12px; align-items:stretch; }
          .order-actions-row { flex-direction:column; }
          .assign-courier-btn,.view-details-btn,.mark-delivered-btn { width:100%; text-align:center; justify-content:center; }
          .product-grid { grid-template-columns:1fr; }
          .edit-grid { grid-template-columns:1fr; }
          .couriers-grid { grid-template-columns:1fr; }
          .courier-card { flex-wrap:wrap; }
          .details-items-header, .details-item-row { grid-template-columns:1fr 40px 64px 64px; }
          .details-modal-footer { flex-direction:column; }
          .details-modal-footer button { width:100%; }
        }
      `}</style>
    </>
  );
}