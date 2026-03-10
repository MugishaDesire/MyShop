import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const CATEGORIES = ["Electronics", "Fashion", "Food", "Art", "Beauty"];

export default function AdminDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", price: "", stock: "", description: "", category: "", imageFile: null });
  const [editId, setEditId] = useState(null);
  const [editItem, setEditItem] = useState({ name: "", price: "", stock: "", description: "", category: "", imageFile: null });
  const [activeTab, setActiveTab] = useState("products");
  const [loading, setLoading] = useState({ products: true, orders: true });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    sessionStorage.removeItem("adminVerified");
    sessionStorage.removeItem("pendingAdminId");
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  };

  const enrichedOrders = useMemo(() => {
    return orders.map(order => {
      const product = products.find(p => p.id === order.product_id);
      const productPrice = product ? parseFloat(product.price) : 0;
      const quantity = parseInt(order.qty) || 1;
      return { ...order, productName: product ? product.name : `Product #${order.product_id}`, productPrice, total: productPrice * quantity };
    });
  }, [orders, products]);

  const groupedOrders = useMemo(() => {
    const orderGroups = {};
    enrichedOrders.forEach(order => {
      const orderTime = new Date(order.created_at || order.date || Date.now());
      const timeKey = Math.floor(orderTime.getTime() / (60 * 1000));
      const groupKey = `${order.cust_phone}_${order.location}_${timeKey}`;
      if (!orderGroups[groupKey]) {
        orderGroups[groupKey] = { id: order.id, cust_name: order.cust_name, cust_phone: order.cust_phone, cust_email: order.cust_email, location: order.location, status: order.status, created_at: order.created_at || order.date, items: [], orderIds: [] };
      }
      orderGroups[groupKey].items.push({ id: order.id, productName: order.productName, qty: order.qty, price: order.productPrice, subtotal: order.total });
      orderGroups[groupKey].orderIds.push(order.id);
      const statusPriority = { 'Delivered': 3, 'Paid': 2, 'Pending': 1 };
      if ((statusPriority[order.status] || 0) > (statusPriority[orderGroups[groupKey].status] || 0)) orderGroups[groupKey].status = order.status;
    });
    return Object.values(orderGroups).map(group => ({
      ...group,
      totalAmount: group.items.reduce((sum, item) => sum + item.subtotal, 0),
      totalItems: group.items.reduce((sum, item) => sum + item.qty, 0)
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [enrichedOrders]);

  const pendingOrders = useMemo(() => groupedOrders.filter(o => o.status !== "Delivered" && o.status !== "Paid").length, [groupedOrders]);

  const salesByStatus = useMemo(() => {
    const stats = { total: 0, pending: 0, paid: 0, delivered: 0 };
    groupedOrders.forEach(order => {
      stats.total += order.totalAmount;
      if (order.status === 'Pending') stats.pending += order.totalAmount;
      else if (order.status === 'Paid') stats.paid += order.totalAmount;
      else if (order.status === 'Delivered') stats.delivered += order.totalAmount;
    });
    return stats;
  }, [groupedOrders]);

  const showMessage = (message, isError = false) => {
    if (isError) { setError(message); setTimeout(() => setError(""), 3000); }
    else { setSuccess(message); setTimeout(() => setSuccess(""), 3000); }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading({ products: true, orders: true });
        const [productsRes, ordersRes] = await Promise.all([axios.get("http://localhost:5000/products"), axios.get("http://localhost:5000/orders")]);
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
  }, []);

  const addProduct = async () => {
    if (!newItem.name || !newItem.price || !newItem.stock || !newItem.category) {
      showMessage("Please fill in all required fields including category", true);
      return;
    }
    try {
      const formData = new FormData();
      formData.append("name", newItem.name);
      formData.append("price", newItem.price);
      formData.append("description", newItem.description);
      formData.append("stock", Number(newItem.stock));
      formData.append("category", newItem.category);
      if (newItem.imageFile) formData.append("image", newItem.imageFile);
      const res = await axios.post("http://localhost:5000/products", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setProducts([...products, { id: res.data.productId, name: newItem.name, price: newItem.price, description: newItem.description, stock: Number(newItem.stock), category: newItem.category, image: res.data.image || null }]);
      setNewItem({ name: "", price: "", stock: "", description: "", category: "", imageFile: null });
      showMessage("Product added successfully!");
    } catch (err) {
      console.error(err);
      showMessage("Failed to add product", true);
    }
  };

  const deleteProduct = (id, name) => {
    if (!id) return showMessage("Invalid product ID", true);
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    axios.delete(`http://localhost:5000/products/${id}`)
      .then(() => { setProducts(products.filter((p) => p.id !== id)); showMessage("Product deleted successfully!"); })
      .catch((err) => { console.error(err); showMessage("Failed to delete product", true); });
  };

  const startEdit = (product) => {
    setEditId(product.id);
    setEditItem({ name: product.name, price: product.price, stock: product.stock, description: product.description || "", category: product.category || "", imageFile: null });
  };

  const saveEdit = () => {
    if (!editItem.name || !editItem.price || !editItem.stock || !editItem.category) {
      showMessage("Please fill in all required fields including category", true);
      return;
    }
    const formData = new FormData();
    formData.append("name", editItem.name);
    formData.append("price", editItem.price);
    formData.append("stock", editItem.stock);
    formData.append("description", editItem.description);
    formData.append("category", editItem.category);
    if (editItem.imageFile) formData.append("image", editItem.imageFile);
    axios.put(`http://localhost:5000/products/${editId}`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then(() => {
        setProducts(products.map((p) => p.id === editId ? { ...p, name: editItem.name, price: editItem.price, stock: editItem.stock, description: editItem.description, category: editItem.category } : p));
        setEditId(null);
        setEditItem({ name: "", price: "", stock: "", description: "", category: "", imageFile: null });
        showMessage("Product updated successfully!");
      })
      .catch(err => { console.error(err); showMessage("Failed to update product", true); });
  };

  const updateOrderStatus = async (orderGroup, customerName) => {
    const itemCount = orderGroup.items.length;
    if (!window.confirm(`Update status for ${customerName}'s order (${itemCount} item${itemCount > 1 ? 's' : ''})?`)) return;
    try {
      const responses = await Promise.all(orderGroup.orderIds.map(orderId => axios.patch(`http://localhost:5000/orders/${orderId}/status`)));
      const newStatus = responses[0].data.status;
      setOrders(orders.map(o => orderGroup.orderIds.includes(o.id) ? { ...o, status: newStatus } : o));
      showMessage(`Order status updated to ${newStatus}!`);
    } catch (err) { console.error(err); showMessage("Failed to update order status", true); }
  };

  const adminUser = (() => { try { return JSON.parse(localStorage.getItem("authUser")); } catch { return null; } })();

  return (
    <>
      <div className="dashboard-container">
        {/* Header Section */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="dashboard-title">
                <span className="title-icon">📊</span>
                Admin Dashboard
              </h1>
              <div className="welcome-badge">
                <span className="welcome-text">Welcome back,</span>
                <span className="admin-name">{adminUser?.name || adminUser?.email || "Admin"}</span>
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout}>
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card products">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <span className="stat-label">Total Products</span>
                <span className="stat-value">{products.length}</span>
              </div>
            </div>
            <div className="stat-card orders">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <span className="stat-label">Total Orders</span>
                <span className="stat-value">{groupedOrders.length}</span>
              </div>
            </div>
            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <span className="stat-label">Pending Orders</span>
                <span className="stat-value">{pendingOrders}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Notification Messages */}
        {error && (
          <div className="notification error">
            <span className="notification-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="notification success">
            <span className="notification-icon">✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === "products" ? "active" : ""}`} 
            onClick={() => setActiveTab("products")}
          >
            <span className="tab-icon">📦</span>
            <span>Products</span>
          </button>
          <button 
            className={`tab-button ${activeTab === "orders" ? "active" : ""}`} 
            onClick={() => setActiveTab("orders")}
          >
            <span className="tab-icon">📋</span>
            <span>Orders</span>
          </button>
        </div>

        {/* Products Tab Content */}
        {activeTab === "products" && (
          <>
            {/* Add Product Form */}
            <div className="form-section">
              <h2 className="section-header">
                <span className="header-icon">➕</span>
                Add New Product
              </h2>
              <div className="form-grid">
                <div className="form-field">
                  <label>Product Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Wireless Headphones" 
                    value={newItem.name} 
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Price ($) <span className="required">*</span></label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    min="0" 
                    step="0.01" 
                    value={newItem.price} 
                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Stock Quantity <span className="required">*</span></label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    min="0" 
                    value={newItem.stock} 
                    onChange={e => setNewItem({ ...newItem, stock: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Category <span className="required">*</span></label>
                  <select 
                    className="category-select" 
                    value={newItem.category} 
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-field full-width">
                  <label>Description</label>
                  <textarea 
                    rows={3} 
                    placeholder="Describe the product — features, materials, dimensions..." 
                    value={newItem.description} 
                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Product Image</label>
                  <div className="file-upload">
                    <input 
                      type="file" 
                      id="product-image" 
                      accept="image/*" 
                      onChange={e => setNewItem({ ...newItem, imageFile: e.target.files[0] })}
                    />
                    <label htmlFor="product-image" className="file-button">
                      <span>📁 Choose File</span>
                    </label>
                    <span className="file-name">
                      {newItem.imageFile ? newItem.imageFile.name : "No file chosen"}
                    </span>
                  </div>
                </div>
              </div>
              <button className="submit-button" onClick={addProduct}>
                <span>➕</span>
                Add Product
              </button>
            </div>

            {/* Product List */}
            <div className="list-section">
              <h2 className="section-header">
                <span className="header-icon">📋</span>
                Product List
              </h2>
              
              {loading.products ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📦</span>
                  <h3>No Products Found</h3>
                  <p>Add your first product using the form above</p>
                </div>
              ) : (
                <div className="product-grid">
                  {products.map(p => (
                    <div key={p.id} className="product-card">
                      {editId === p.id ? (
                        <div className="edit-form">
                          <h3>Edit Product</h3>
                          <div className="edit-grid">
                            <input 
                              type="text" 
                              placeholder="Product name" 
                              value={editItem.name} 
                              onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                            />
                            <input 
                              type="number" 
                              placeholder="Price" 
                              value={editItem.price} 
                              onChange={e => setEditItem({ ...editItem, price: e.target.value })}
                            />
                            <input 
                              type="number" 
                              placeholder="Stock" 
                              value={editItem.stock} 
                              onChange={e => setEditItem({ ...editItem, stock: e.target.value })}
                            />
                            <select 
                              className="category-select" 
                              value={editItem.category} 
                              onChange={e => setEditItem({ ...editItem, category: e.target.value })}
                            >
                              <option value="">Select category</option>
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <textarea 
                              className="full-width"
                              rows={2} 
                              placeholder="Description" 
                              value={editItem.description} 
                              onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                            />
                            <div className="file-upload full-width">
                              <input 
                                type="file" 
                                id={`edit-image-${p.id}`} 
                                accept="image/*" 
                                onChange={e => setEditItem({ ...editItem, imageFile: e.target.files[0] })}
                              />
                              <label htmlFor={`edit-image-${p.id}`} className="file-button small">
                                <span>📁 Change Image</span>
                              </label>
                              <span className="file-name">
                                {editItem.imageFile ? editItem.imageFile.name : "No file chosen"}
                              </span>
                            </div>
                          </div>
                          <div className="edit-actions">
                            <button className="save-button" onClick={saveEdit}>Save Changes</button>
                            <button className="cancel-button" onClick={() => setEditId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="product-image-container">
                            {p.image ? (
                              <img 
                                src={`http://localhost:5000/uploads/${p.image}`} 
                                alt={p.name}
                                onError={e => { 
                                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Crect width='24' height='24' rx='4' fill='%23e2e8f0'/%3E%3Ctext x='4' y='16' font-family='Arial' font-size='10' fill='%2364748b'%3ENo img%3C/text%3E%3C/svg%3E";
                                }} 
                              />
                            ) : (
                              <div className="no-image">📷</div>
                            )}
                          </div>
                          <div className="product-details">
                            <h3 className="product-title">{p.name}</h3>
                            <div className="product-meta">
                              <span className="product-price">${parseFloat(p.price || 0).toFixed(2)}</span>
                              <span className={`stock-badge ${p.stock < 10 ? "low" : p.stock < 50 ? "medium" : "high"}`}>
                                Stock: {p.stock}
                              </span>
                              {p.category && <span className="category-badge">{p.category}</span>}
                            </div>
                            {p.description && (
                              <p className="product-description">
                                {p.description.length > 60 ? p.description.slice(0, 60) + "..." : p.description}
                              </p>
                            )}
                          </div>
                          <div className="product-actions">
                            <button className="action-button edit" onClick={() => startEdit(p)}>
                              <span>✏️</span>
                              Edit
                            </button>
                            <button className="action-button delete" onClick={() => deleteProduct(p.id, p.name)}>
                              <span>🗑️</span>
                              Delete
                            </button>
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

        {/* Orders Tab Content */}
        {activeTab === "orders" && (
          <div className="list-section">
            <h2 className="section-header">
              <span className="header-icon">📋</span>
              Recent Orders
            </h2>
            
            {loading.orders ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading orders...</p>
              </div>
            ) : groupedOrders.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <h3>No Orders Yet</h3>
                <p>Orders will appear here when customers make purchases</p>
              </div>
            ) : (
              <div className="orders-list">
                {groupedOrders.map(orderGroup => (
                  <div key={orderGroup.id} className="order-card">
                    <div className="order-header">
                      <div className="customer-info">
                        <h3>{orderGroup.cust_name || 'Unknown Customer'}</h3>
                        <div className="customer-details">
                          <span>📱 {orderGroup.cust_phone || 'N/A'}</span>
                          {orderGroup.cust_email && <span>✉️ {orderGroup.cust_email}</span>}
                          <span>📍 {orderGroup.location || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="order-status-badge">
                        <span className={`status ${(orderGroup.status || 'pending').toLowerCase()}`}>
                          {orderGroup.status || "Pending"}
                        </span>
                      </div>
                    </div>

                    <div className="order-items-list">
                      <div className="items-header">
                        <span>{orderGroup.items.length} Item{orderGroup.items.length > 1 ? 's' : ''}</span>
                      </div>
                      {orderGroup.items.map(item => (
                        <div key={item.id} className="order-item">
                          <div className="item-info">
                            <span className="item-name">{item.productName}</span>
                            <span className="item-quantity">x{item.qty}</span>
                          </div>
                          <div className="item-total">
                            <span className="item-price">${item.price.toFixed(2)}</span>
                            <span className="item-subtotal">${item.subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="order-footer">
                      <div className="order-total">
                        <span>Total Amount:</span>
                        <strong>${orderGroup.totalAmount.toFixed(2)}</strong>
                      </div>
                      <button 
                        className="update-status-button" 
                        onClick={() => updateOrderStatus(orderGroup, orderGroup.cust_name)}
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Revenue Summary */}
        <div className="revenue-summary">
          <h2 className="summary-header">
            <span className="header-icon">💰</span>
            Revenue Overview
          </h2>
          <div className="summary-content">
            <div className="total-revenue">
              <span className="revenue-label">Total Revenue</span>
              <span className="revenue-amount">${salesByStatus.total.toFixed(2)}</span>
            </div>
            <div className="revenue-breakdown">
              <div className="revenue-item pending">
                <span>⏳ Pending</span>
                <strong>${salesByStatus.pending.toFixed(2)}</strong>
              </div>
              <div className="revenue-item paid">
                <span>💳 Paid</span>
                <strong>${salesByStatus.paid.toFixed(2)}</strong>
              </div>
              <div className="revenue-item delivered">
                <span>✅ Delivered</span>
                <strong>${salesByStatus.delivered.toFixed(2)}</strong>
              </div>
            </div>
            <div className="orders-count">
              From {groupedOrders.length} order{groupedOrders.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Global Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Header Styles */
        .dashboard-header {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .dashboard-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .title-icon {
          font-size: 32px;
        }

        .welcome-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 16px;
          border-radius: 30px;
          backdrop-filter: blur(10px);
        }

        .welcome-text {
          color: #94a3b8;
          font-size: 14px;
        }

        .admin-name {
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .logout-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-button:hover {
          background: #ef4444;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(239, 68, 68, 0.3);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 20px;
          border-radius: 16px;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.15);
        }

        .stat-icon {
          font-size: 32px;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          color: #94a3b8;
          font-size: 13px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          color: white;
          font-size: 32px;
          font-weight: 700;
        }

        /* Notifications */
        .notification {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .notification.error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        .notification.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
        }

        .notification-icon {
          font-size: 18px;
        }

        /* Tab Navigation */
        .tab-navigation {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
          background: white;
          padding: 6px;
          border-radius: 16px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .tab-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          color: #64748b;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-button:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .tab-button.active {
          background: #3b82f6;
          color: white;
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);
        }

        .tab-icon {
          font-size: 18px;
        }

        /* Section Headers */
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 20px;
        }

        .header-icon {
          font-size: 24px;
        }

        /* Form Styles */
        .form-section {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-field.full-width {
          grid-column: 1 / -1;
        }

        .form-field label {
          font-weight: 600;
          color: #475569;
          font-size: 14px;
        }

        .required {
          color: #ef4444;
          margin-left: 4px;
        }

        .form-field input,
        .form-field textarea,
        .category-select {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: #f8fafc;
        }

        .form-field input:focus,
        .form-field textarea:focus,
        .category-select:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .category-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-color: #f8fafc;
        }

        /* File Upload */
        .file-upload {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .file-upload input[type="file"] {
          display: none;
        }

        .file-button {
          background: #3b82f6;
          color: white;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
          white-space: nowrap;
        }

        .file-button.small {
          padding: 8px 12px;
          font-size: 12px;
        }

        .file-button:hover {
          background: #2563eb;
        }

        .file-name {
          color: #64748b;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
        }

        /* List Sections */
        .list-section {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: 60px;
          color: #64748b;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px;
          background: #f8fafc;
          border-radius: 16px;
          border: 2px dashed #e2e8f0;
        }

        .empty-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          color: #1e293b;
          margin-bottom: 8px;
        }

        .empty-state p {
          color: #64748b;
        }

        /* Product Grid */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .product-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
          border-color: #cbd5e1;
        }

        .product-image-container {
          width: 100%;
          height: 160px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
        }

        .product-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          font-size: 48px;
          opacity: 0.3;
        }

        .product-details {
          margin-bottom: 16px;
        }

        .product-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .product-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 10px;
        }

        .product-price {
          font-size: 18px;
          font-weight: 700;
          color: #059669;
        }

        .stock-badge {
          padding: 4px 10px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
        }

        .stock-badge.high {
          background: #dcfce7;
          color: #166534;
        }

        .stock-badge.medium {
          background: #fef3c7;
          color: #92400e;
        }

        .stock-badge.low {
          background: #fee2e2;
          color: #991b1b;
        }

        .category-badge {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 4px 10px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #bfdbfe;
        }

        .product-description {
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .product-actions {
          display: flex;
          gap: 10px;
        }

        .action-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-button.edit {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .action-button.edit:hover {
          background: #bfdbfe;
          transform: translateY(-1px);
        }

        .action-button.delete {
          background: #fee2e2;
          color: #dc2626;
        }

        .action-button.delete:hover {
          background: #fecaca;
          transform: translateY(-1px);
        }

        /* Edit Form */
        .edit-form {
          background: white;
          border-radius: 12px;
          padding: 16px;
        }

        .edit-form h3 {
          margin-bottom: 16px;
          color: #1e293b;
          font-size: 16px;
        }

        .edit-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .edit-grid input,
        .edit-grid select,
        .edit-grid textarea {
          padding: 10px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
        }

        .edit-actions {
          display: flex;
          gap: 10px;
        }

        .save-button,
        .cancel-button {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .save-button {
          background: #10b981;
          color: white;
        }

        .save-button:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .cancel-button {
          background: #f1f5f9;
          color: #64748b;
        }

        .cancel-button:hover {
          background: #e2e8f0;
          transform: translateY(-1px);
        }

        /* Orders List */
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 16px;
        }

        .customer-info h3 {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .customer-details {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: #64748b;
        }

        .order-status-badge .status {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status.delivered {
          background: #dcfce7;
          color: #166534;
        }

        .status.paid {
          background: #fef3c7;
          color: #92400e;
        }

        .status.pending {
          background: #fee2e2;
          color: #991b1b;
        }

        .order-items-list {
          background: white;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .items-header {
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .order-item:last-child {
          border-bottom: none;
        }

        .item-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .item-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 14px;
        }

        .item-quantity {
          color: #64748b;
          font-size: 12px;
        }

        .item-total {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .item-price {
          color: #64748b;
          font-size: 12px;
        }

        .item-subtotal {
          font-weight: 700;
          color: #059669;
          font-size: 14px;
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .order-total {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .order-total span {
          color: #64748b;
          font-size: 14px;
        }

        .order-total strong {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
        }

        .update-status-button {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .update-status-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 15px rgba(139, 92, 246, 0.3);
        }

        /* Revenue Summary */
        .revenue-summary {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border-radius: 20px;
          padding: 24px;
          color: white;
        }

        .summary-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          margin-bottom: 20px;
        }

        .summary-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .total-revenue {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
        }

        .revenue-label {
          font-size: 14px;
          opacity: 0.8;
        }

        .revenue-amount {
          font-size: 32px;
          font-weight: 800;
        }

        .revenue-breakdown {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .revenue-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          text-align: center;
          transition: transform 0.2s ease;
        }

        .revenue-item:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.15);
        }

        .revenue-item span {
          font-size: 12px;
          opacity: 0.8;
        }

        .revenue-item strong {
          font-size: 18px;
          font-weight: 700;
        }

        .revenue-item.pending strong { color: #fbbf24; }
        .revenue-item.paid strong { color: #60a5fa; }
        .revenue-item.delivered strong { color: #34d399; }

        .orders-count {
          text-align: center;
          font-size: 13px;
          opacity: 0.7;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 16px;
          }

          .header-content {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }

          .header-left {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .revenue-breakdown {
            grid-template-columns: 1fr;
          }

          .order-footer {
            flex-direction: column;
            gap: 16px;
          }

          .order-total {
            width: 100%;
            justify-content: space-between;
          }

          .update-status-button {
            width: 100%;
          }

          .product-grid {
            grid-template-columns: 1fr;
          }

          .edit-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}