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

  // Enrich orders with product information and calculate totals
  const enrichedOrders = useMemo(() => {
    return orders.map(order => {
      // Find the product for this order
      const product = products.find(p => p.id === order.product_id);
      const productPrice = product ? parseFloat(product.price) : 0;
      const quantity = parseInt(order.qty) || 1;
      const total = productPrice * quantity;
      
      return {
        ...order,
        productName: product ? product.name : `Product #${order.product_id}`,
        productPrice: productPrice,
        total: total
      };
    });
  }, [orders, products]);

  // Group orders by customer and location (orders placed together)
  const groupedOrders = useMemo(() => {
    // Create a map to group orders by customer phone + location + approximate time
    const orderGroups = {};
    
    enrichedOrders.forEach(order => {
      // Create a unique key for orders that should be grouped together
      // Group by: customer phone, location, and orders within 1 minute of each other
      const orderTime = new Date(order.created_at || order.date || Date.now());
      const timeKey = Math.floor(orderTime.getTime() / (60 * 1000)); // Group by minute
      const groupKey = `${order.cust_phone}_${order.location}_${timeKey}`;
      
      if (!orderGroups[groupKey]) {
        orderGroups[groupKey] = {
          id: order.id, // Use first order's ID as group ID
          cust_name: order.cust_name,
          cust_phone: order.cust_phone,
          cust_email: order.cust_email,
          location: order.location,
          status: order.status,
          created_at: order.created_at || order.date,
          items: [],
          orderIds: [] // Track all order IDs in this group
        };
      }
      
      // Add this order's item to the group
      orderGroups[groupKey].items.push({
        id: order.id,
        productName: order.productName,
        qty: order.qty,
        price: order.productPrice,
        subtotal: order.total
      });
      
      orderGroups[groupKey].orderIds.push(order.id);
      
      // Update status to the "latest" status in the group
      // Priority: Delivered > Paid > Pending
      const statusPriority = { 'Delivered': 3, 'Paid': 2, 'Pending': 1 };
      const currentPriority = statusPriority[orderGroups[groupKey].status] || 0;
      const newPriority = statusPriority[order.status] || 0;
      if (newPriority > currentPriority) {
        orderGroups[groupKey].status = order.status;
      }
    });
    
    // Convert to array and calculate totals
    return Object.values(orderGroups).map(group => ({
      ...group,
      totalAmount: group.items.reduce((sum, item) => sum + item.subtotal, 0),
      totalItems: group.items.reduce((sum, item) => sum + item.qty, 0)
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [enrichedOrders]);

  // Calculate pending orders using grouped orders
  const pendingOrders = useMemo(() => {
    return groupedOrders.filter(o => o.status !== "Delivered" && o.status !== "Paid").length;
  }, [groupedOrders]);

  // Calculate sales by status
  const salesByStatus = useMemo(() => {
    const stats = {
      total: 0,
      pending: 0,
      paid: 0,
      delivered: 0
    };

    groupedOrders.forEach(order => {
      stats.total += order.totalAmount;
      
      if (order.status === 'Pending') {
        stats.pending += order.totalAmount;
      } else if (order.status === 'Paid') {
        stats.paid += order.totalAmount;
      } else if (order.status === 'Delivered') {
        stats.delivered += order.totalAmount;
      }
    });

    return stats;
  }, [groupedOrders]);

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
        setProducts(products.map((p) => p.id === editId ? { ...p, name: editItem.name, price: editItem.price, stock: editItem.stock } : p));
        setEditId(null);
        setEditItem({ name: "", price: "", stock: "", imageFile: null });
        showMessage("Product updated successfully!");
      })
      .catch(err => {
        console.error(err);
        showMessage("Failed to update product", true);
      });
  };

  // Update Order Status - now handles grouped orders
  const updateOrderStatus = async (orderGroup, customerName) => {
    const itemCount = orderGroup.items.length;
    const confirmMsg = `Update status for ${customerName}'s order (${itemCount} item${itemCount > 1 ? 's' : ''})?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      // Update all orders in the group
      const updatePromises = orderGroup.orderIds.map(orderId =>
        axios.patch(`http://localhost:5000/orders/${orderId}/status`)
      );
      
      const responses = await Promise.all(updatePromises);
      const newStatus = responses[0].data.status; // All will have same status
      
      // Update local state
      setOrders(orders.map(o => {
        if (orderGroup.orderIds.includes(o.id)) {
          return { ...o, status: newStatus };
        }
        return o;
      }));
      
      showMessage(`Order status updated to ${newStatus}!`);
    } catch (err) {
      console.error(err);
      showMessage("Failed to update order status", true);
    }
  };

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
              <span className="stat-value">{groupedOrders.length}</span>
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
                          <input 
                            type="text" 
                            placeholder="Product name"
                            value={editItem.name} 
                            onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} 
                          />
                          <input 
                            type="number" 
                            placeholder="Price"
                            value={editItem.price} 
                            onChange={(e) => setEditItem({ ...editItem, price: e.target.value })} 
                          />
                          <input 
                            type="number" 
                            placeholder="Stock"
                            value={editItem.stock} 
                            onChange={(e) => setEditItem({ ...editItem, stock: e.target.value })} 
                          />
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => setEditItem({ ...editItem, imageFile: e.target.files[0] })} 
                          />
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
                              <span className="price">${parseFloat(p.price || 0).toFixed(2)}</span>
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

        {/* Orders Section - Updated to show grouped orders */}
        {activeTab === "orders" && (
          <div className="section">
            <h2 className="section-title">Recent Orders</h2>
            {loading.orders ? (
              <div className="loading">Loading orders...</div>
            ) : groupedOrders.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>No orders yet. Orders will appear here.</p>
              </div>
            ) : (
              <div className="list">
                {groupedOrders.map((orderGroup) => (
                  <div key={orderGroup.id} className="card order-card">
                    <div className="order-header">
                      <div className="order-customer">
                        <h3>{orderGroup.cust_name || 'Unknown Customer'}</h3>
                        <div className="customer-details">
                          <span className="phone">📱 {orderGroup.cust_phone || 'N/A'}</span>
                          {orderGroup.cust_email && (
                            <span className="email">✉️ {orderGroup.cust_email}</span>
                          )}
                          <span className="location">📍 {orderGroup.location || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="order-status">
                        <span className={`status-badge ${(orderGroup.status || 'pending').toLowerCase()}`}>
                          {orderGroup.status || "Pending"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="order-items">
                      <div className="items-header">
                        <span className="items-count">
                          {orderGroup.items.length} item{orderGroup.items.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {orderGroup.items.map((item) => (
                        <div key={item.id} className="order-item">
                          <div className="item-details">
                            <span className="item-name">{item.productName}</span>
                            <span className="item-qty">Qty: {item.qty}</span>
                          </div>
                          <div className="item-pricing">
                            <span className="item-unit-price">
                              ${item.price.toFixed(2)} each
                            </span>
                            <span className="item-subtotal">
                              ${item.subtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="order-footer">
                      <div className="order-total">
                        <span className="total-label">Total Amount:</span>
                        <strong className="total-amount">
                          ${orderGroup.totalAmount.toFixed(2)}
                        </strong>
                      </div>
                      <button 
                        className="status-btn"
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

        <div className="summary-card">
          <h2 className="summary-title">💰 Total Revenue</h2>
          <p className="summary-amount">${salesByStatus.total.toFixed(2)}</p>
          <div className="revenue-breakdown">
            <div className="breakdown-item pending">
              <span className="breakdown-label">⏳ Pending</span>
              <span className="breakdown-value">${salesByStatus.pending.toFixed(2)}</span>
            </div>
            <div className="breakdown-item paid">
              <span className="breakdown-label">💳 Paid</span>
              <span className="breakdown-value">${salesByStatus.paid.toFixed(2)}</span>
            </div>
            <div className="breakdown-item delivered">
              <span className="breakdown-label">✅ Delivered</span>
              <span className="breakdown-value">${salesByStatus.delivered.toFixed(2)}</span>
            </div>
          </div>
          <p className="summary-note">
            From {groupedOrders.length} order{groupedOrders.length !== 1 ? 's' : ''}
          </p>
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
          background-clip: text;
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
        }

        .edit-form h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #1e293b;
        }

        .edit-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .edit-grid input {
          padding: 0.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
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
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
        }

        .items-header {
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .items-count {
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: white;
          border-radius: 6px;
          margin-bottom: 0.5rem;
          border: 1px solid #e2e8f0;
        }

        .order-item:last-child {
          margin-bottom: 0;
        }

        .item-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .item-name {
          font-weight: 600;
          color: #1e293b;
        }

        .item-qty {
          font-size: 0.875rem;
          color: #64748b;
        }

        .item-pricing {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .item-unit-price {
          font-size: 0.875rem;
          color: #64748b;
        }

        .item-subtotal {
          font-weight: 600;
          color: #059669;
          font-size: 1rem;
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 2px solid #f1f5f9;
        }

        .order-total {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .total-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 600;
        }

        .total-amount {
          font-size: 1.5rem;
          font-weight: 800;
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
          margin-bottom: 1.5rem;
        }

        .revenue-breakdown {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .breakdown-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .breakdown-item:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .breakdown-label {
          font-size: 0.875rem;
          opacity: 0.9;
          font-weight: 600;
        }

        .breakdown-value {
          font-size: 1.5rem;
          font-weight: 800;
        }

        .summary-note {
          opacity: 0.9;
          font-size: 0.875rem;
        }

        .btn-icon {
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .order-footer {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .order-total {
            align-items: center;
          }

          .status-btn {
            width: 100%;
          }

          .item-pricing {
            align-items: flex-start;
          }

          .revenue-breakdown {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}