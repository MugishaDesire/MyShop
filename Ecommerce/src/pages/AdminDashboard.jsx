import { useState, useEffect, useMemo } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", price: "", stock: "", imageFile: null });
  const [editId, setEditId] = useState(null);
  const [editItem, setEditItem] = useState({ name: "", price: "", stock: "", imageFile: null });
  const [activeTab, setActiveTab] = useState("products");
  const [loading, setLoading] = useState({ products: true, orders: true });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Calculate pending orders using useMemo to avoid recalculating on every render
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status !== "Delivered" && o.status !== "Paid").length;
  }, [orders]);

  // Show success/error messages temporarily
  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setTimeout(() => setError(""), 3000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // Fetch products & orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading({ products: true, orders: true });
        const [productsRes, ordersRes] = await Promise.all([
          axios.get("http://localhost:5000/products"),
          axios.get("http://localhost:5000/orders")
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
  }, []);

  // Add Product
  const addProduct = async () => {
    if (!newItem.name || !newItem.price || !newItem.stock) {
      showMessage("Please fill in all required fields", true);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", newItem.name);
      formData.append("price", newItem.price);
      formData.append("stock", Number(newItem.stock));
      if (newItem.imageFile) {
        formData.append("image", newItem.imageFile);
      }

      const res = await axios.post(
        "http://localhost:5000/products",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setProducts([
        ...products,
        {
          id: res.data.productId,
          name: newItem.name,
          price: newItem.price,
          stock: Number(newItem.stock),
          image: res.data.image || null,
        },
      ]);

      setNewItem({ name: "", price: "", stock: "", imageFile: null });
      showMessage("Product added successfully!");
    } catch (err) {
      console.error(err);
      showMessage("Failed to add product", true);
    }
  };

  // Delete Product
  const deleteProduct = (id, name) => {
    if (!id) return showMessage("Invalid product ID", true);

    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    axios
      .delete(`http://localhost:5000/products/${id}`)
      .then(() => {
        setProducts(products.filter((p) => p.id !== id));
        showMessage("Product deleted successfully!");
      })
      .catch((err) => {
        console.error(err);
        showMessage("Failed to delete product", true);
      });
  };

  // Start Edit
  const startEdit = (product) => {
    setEditId(product.id);
    setEditItem({ name: product.name, price: product.price, stock: product.stock, imageFile: null });
  };

  // Save Edit
  const saveEdit = () => {
    if (!editItem.name || !editItem.price || !editItem.stock) {
      showMessage("Please fill in all required fields", true);
      return;
    }

    const formData = new FormData();
    formData.append("name", editItem.name);
    formData.append("price", editItem.price);
    formData.append("stock", editItem.stock);
    if (editItem.imageFile) {
      formData.append("image", editItem.imageFile);
    }

    axios.put(`http://localhost:5000/products/${editId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
      .then(res => {
        setProducts(products.map((p) => p.id === editId ? { ...p, ...editItem } : p));
        setEditId(null);
        setEditItem({ name: "", price: "", stock: "", imageFile: null });
        showMessage("Product updated successfully!");
      })
      .catch(err => {
        console.error(err);
        showMessage("Failed to update product", true);
      });
  };

  // Update Order Status
  const updateOrderStatus = (orderId, customerName) => {
    if (!window.confirm(`Update status for ${customerName}'s order?`)) return;

    axios.put(`http://localhost:5000/orders/${orderId}/status`)
      .then(res => {
        setOrders(orders.map(o => {
          if (o.id === orderId) {
            return { ...o, status: res.data.status };
          }
          return o;
        }));
        showMessage("Order status updated!");
      })
      .catch(err => {
        console.error(err);
        showMessage("Failed to update order status", true);
      });
  };

  // Total Sales
  const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <>
      <div className="dashboard">
        <div className="header">
          <h1 className="title">Admin Dashboard</h1>
          <div className="stats">
            <div className="stat-card">
              <span className="stat-label">Total Products</span>
              <span className="stat-value">{products.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Orders</span>
              <span className="stat-value">{orders.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Pending Orders</span>
              <span className="stat-value">{pendingOrders}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === "products" ? "active" : ""}`} 
            onClick={() => setActiveTab("products")}
          >
            <span className="tab-icon">📦</span>
            Products
          </button>
          <button 
            className={`tab ${activeTab === "orders" ? "active" : ""}`} 
            onClick={() => setActiveTab("orders")}
          >
            <span className="tab-icon">📋</span>
            Orders
          </button>
        </div>

        {/* Add Product */}
        {activeTab === "products" && (
          <div className="form-card">
            <h2 className="form-title">
              <span className="form-icon">➕</span>
              Add New Product
            </h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="productName">Product Name *</label>
                <input 
                  id="productName"
                  type="text" 
                  placeholder="Enter product name" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label htmlFor="price">Price ($) *</label>
                <input 
                  id="price"
                  type="number" 
                  placeholder="0.00" 
                  min="0"
                  step="0.01"
                  value={newItem.price} 
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label htmlFor="stock">Stock Quantity *</label>
                <input 
                  id="stock"
                  type="number" 
                  placeholder="0" 
                  min="0"
                  value={newItem.stock} 
                  onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label htmlFor="image">Product Image</label>
                <div className="file-input">
                  <input 
                    id="image"
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setNewItem({ ...newItem, imageFile: e.target.files[0] })} 
                  />
                  <span className="file-name">
                    {newItem.imageFile ? newItem.imageFile.name : "Choose file..."}
                  </span>
                </div>
              </div>
            </div>
            <button className="primary-btn" onClick={addProduct}>
              Add Product
            </button>
          </div>
        )}

        {/* Products Section */}
        {activeTab === "products" && (
          <div className="section">
            <h2 className="section-title">Product List</h2>
            {loading.products ? (
              <div className="loading">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📦</span>
                <p>No products found. Add your first product!</p>
              </div>
            ) : (
              <div className="list">
                {products.map((p) => (
                  <div key={p.id} className="card product-card">
                    {editId === p.id ? (
                      <div className="edit-form">
                        <h3>Edit Product</h3>
                        <div className="edit-grid">
                          <input type="text" value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
                          <input type="number" value={editItem.price} onChange={(e) => setEditItem({ ...editItem, price: Number(e.target.value) })} />
                          <input type="number" value={editItem.stock} onChange={(e) => setEditItem({ ...editItem, stock: Number(e.target.value) })} />
                          <input type="file" accept="image/*" onChange={(e) => setEditItem({ ...editItem, imageFile: e.target.files[0] })} />
                        </div>
                        <div className="actions">
                          <button onClick={saveEdit} className="save-btn">Save Changes</button>
                          <button onClick={() => setEditId(null)} className="cancel-btn">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="product-header">
                          <div className="product-info">
                            <h3 className="product-name">{p.name}</h3>
                            <div className="product-meta">
                              <span className="price">${p.price}</span>
                              <span className={`stock ${p.stock < 10 ? "low" : p.stock < 50 ? "medium" : "high"}`}>
                                Stock: {p.stock}
                              </span>
                            </div>
                          </div>
                          {p.image && (
                            <div className="product-image">
                              <img src={`http://localhost:5000/${p.image}`} alt={p.name} />
                            </div>
                          )}
                        </div>
                        <div className="actions">
                          <button className="edit-btn" onClick={() => startEdit(p)}>
                            <span className="btn-icon">✏️</span>
                            Edit
                          </button>
                          <button className="delete-btn" onClick={() => deleteProduct(p.id, p.name)}>
                            <span className="btn-icon">🗑️</span>
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
        )}

        {/* Orders Section */}
        {activeTab === "orders" && (
          <div className="section">
            <h2 className="section-title">Recent Orders</h2>
            {loading.orders ? (
              <div className="loading">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>No orders yet. Orders will appear here.</p>
              </div>
            ) : (
              <div className="list">
                {orders.map((o) => (
                  <div key={o.id} className="card order-card">
                    <div className="order-header">
                      <div className="order-customer">
                        <h3>{o.cust_name}</h3>
                        <div className="customer-details">
                          <span className="phone">📱 {o.cust_phone}</span>
                          <span className="email">✉️ {o.cust_email}</span>
                          <span className="location">📍 {o.location}</span>
                        </div>
                      </div>
                      <div className="order-status">
                        <span className={`status-badge ${o.status?.toLowerCase() || 'pending'}`}>
                          {o.status || "Pending"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="order-items">
                      <div className="order-item">
                        <span>{o.productName}</span>
                        <span>{o.qty} × ${(o.total / o.qty).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="order-footer">
                      <div className="order-total">
                        <strong>Total: ${o.total}</strong>
                      </div>
                      <button 
                        className="status-btn"
                        onClick={() => updateOrderStatus(o.id, o.cust_name)}
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

        <div className="summary-card">
          <h2 className="summary-title">💰 Total Sales</h2>
          <p className="summary-amount">${totalSales.toFixed(2)}</p>
          <p className="summary-note">Total revenue from all orders</p>
        </div>
      </div>

      {/* Enhanced CSS */}
      <style>{`
        .dashboard { 
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          min-height: 100vh;
        }

        .header {
          margin-bottom: 2rem;
        }

        .title { 
          font-size: 2.5rem;
          font-weight: 800;
          text-align: center;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1.5rem;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-label {
          display: block;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
        }

        .message {
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .error {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .success {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          background: white;
          padding: 0.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .tab {
          flex: 1;
          padding: 1rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .tab:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .tab.active {
          background: #3b82f6;
          color: white;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }

        .form-card {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
          border: 1px solid #e2e8f0;
        }

        .form-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #475569;
          font-size: 0.875rem;
        }

        .form-group input {
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .file-input {
          position: relative;
          overflow: hidden;
        }

        .file-input input[type="file"] {
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }

        .file-name {
          display: block;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          color: #64748b;
          font-size: 0.875rem;
        }

        .primary-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 0.875rem 2rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .primary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .section {
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1.5rem;
        }

        .loading, .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
          background: white;
          border-radius: 12px;
          border: 2px dashed #e2e8f0;
        }

        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .product-card {
          padding: 1.5rem;
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .product-info {
          flex: 1;
        }

        .product-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .product-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .price {
          font-size: 1.125rem;
          font-weight: 700;
          color: #059669;
        }

        .stock {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .stock.high { background: #dcfce7; color: #166534; }
        .stock.medium { background: #fef3c7; color: #92400e; }
        .stock.low { background: #fee2e2; color: #991b1b; }

        .product-image {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .edit-btn, .delete-btn, .save-btn, .cancel-btn, .status-btn {
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          transition: all 0.2s ease;
          border: none;
        }

        .edit-btn {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .edit-btn:hover {
          background: #bfdbfe;
        }

        .delete-btn {
          background: #fee2e2;
          color: #dc2626;
        }

        .delete-btn:hover {
          background: #fecaca;
        }

        .save-btn {
          background: #10b981;
          color: white;
        }

        .save-btn:hover {
          background: #059669;
        }

        .cancel-btn {
          background: #f1f5f9;
          color: #64748b;
        }

        .cancel-btn:hover {
          background: #e2e8f0;
        }

        .edit-form {
          background: #f8fafc;
          border-radius: 8px;
          padding: 1.5rem;
          margin: -0.5rem;
        }

        .edit-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .order-card {
          padding: 1.5rem;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f1f5f9;
        }

        .order-customer h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .customer-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.875rem;
          color: #64748b;
        }

        .status-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge.delivered { background: #dcfce7; color: #166534; }
        .status-badge.paid { background: #fef3c7; color: #92400e; }
        .status-badge.pending { background: #fee2e2; color: #991b1b; }

        .order-items {
          margin-bottom: 1rem;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          font-weight: 500;
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 2px solid #f1f5f9;
        }

        .order-total {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        .status-btn {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 0.5rem 1.5rem;
        }

        .status-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .summary-card {
          background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
          color: white;
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          margin-top: 2rem;
        }

        .summary-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .summary-amount {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .summary-note {
          opacity: 0.9;
          font-size: 0.875rem;
        }

        .btn-icon {
          font-size: 0.875rem;
        }
      `}</style>
    </>
  );
}