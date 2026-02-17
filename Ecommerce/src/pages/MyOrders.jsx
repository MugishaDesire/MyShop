import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/ulogin");
      return;
    }

    // Mock orders data - replace with actual API call
    const mockOrders = [
      { 
        id: "ORD-1001", 
        date: "2024-02-15", 
        total: 299.99, 
        status: "Delivered", 
        items: [
          { name: "Wireless Headphones", quantity: 1, price: 199.99 },
          { name: "Phone Case", quantity: 2, price: 50.00 }
        ],
        tracking: "TRK123456789",
        estimatedDelivery: "2024-02-18"
      },
      { 
        id: "ORD-1002", 
        date: "2024-02-10", 
        total: 149.50, 
        status: "Shipped", 
        items: [
          { name: "Smart Watch", quantity: 1, price: 149.50 }
        ],
        tracking: "TRK987654321",
        estimatedDelivery: "2024-02-14"
      },
      { 
        id: "ORD-1003", 
        date: "2024-02-05", 
        total: 79.99, 
        status: "Processing", 
        items: [
          { name: "Bluetooth Speaker", quantity: 1, price: 79.99 }
        ],
        tracking: null,
        estimatedDelivery: "2024-02-09"
      },
      { 
        id: "ORD-1004", 
        date: "2024-01-28", 
        total: 459.97, 
        status: "Delivered", 
        items: [
          { name: "Laptop Backpack", quantity: 1, price: 89.99 },
          { name: "Wireless Mouse", quantity: 1, price: 49.99 },
          { name: "USB-C Hub", quantity: 1, price: 319.99 }
        ],
        tracking: "TRK456789123",
        estimatedDelivery: "2024-01-31"
      },
      { 
        id: "ORD-1005", 
        date: "2024-01-20", 
        total: 1299.99, 
        status: "Delivered", 
        items: [
          { name: "Gaming Laptop", quantity: 1, price: 1299.99 }
        ],
        tracking: "TRK789123456",
        estimatedDelivery: "2024-01-25"
      }
    ];

    setOrders(mockOrders);
    setLoading(false);
  }, [navigate]);

  const filteredOrders = filter === "all" 
    ? orders 
    : orders.filter(order => order.status.toLowerCase() === filter.toLowerCase());

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case "delivered": return "#10b981";
      case "shipped": return "#3b82f6";
      case "processing": return "#f59e0b";
      case "cancelled": return "#ef4444";
      default: return "#64748b";
    }
  };

  const getStatusIcon = (status) => {
    switch(status.toLowerCase()) {
      case "delivered": return "✅";
      case "shipped": return "📦";
      case "processing": return "⏳";
      case "cancelled": return "❌";
      default: return "📋";
    }
  };

  if (loading) {
    return (
      <div className="orders-loading">
        <div className="loading-spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <>
      <div className="myorders-container">
        {/* Navigation Bar */}
        <nav className="orders-nav">
          {/* <div className="nav-brand">
            <Link to="/" className="brand-link">
              <span className="brand-icon">🛍️</span>
              <span className="brand-name">ShopHub</span>
            </Link>
          </div> */}
          
          <div className="nav-links">
            {/* <Link to="/" className="nav-link">Home</Link> */}
            <Link to="/userdashboard" className="nav-link">Dashboard</Link>
            <Link to="/myorders" className="nav-link active">My Orders</Link>
          </div>
          
          <div className="nav-user">
            <Link to="/userdashboard" className="back-to-dashboard">
              ← Back to Dashboard
            </Link>
          </div>
        </nav>

        {/* Header */}
        <div className="orders-header">
          <div className="header-content">
            <h1>My Orders</h1>
            <p>Track and manage all your orders in one place</p>
          </div>
          
          <div className="order-filters">
            <button 
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All Orders
            </button>
            <button 
              className={`filter-btn ${filter === "processing" ? "active" : ""}`}
              onClick={() => setFilter("processing")}
            >
              Processing
            </button>
            <button 
              className={`filter-btn ${filter === "shipped" ? "active" : ""}`}
              onClick={() => setFilter("shipped")}
            >
              Shipped
            </button>
            <button 
              className={`filter-btn ${filter === "delivered" ? "active" : ""}`}
              onClick={() => setFilter("delivered")}
            >
              Delivered
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="orders-list-container">
          {filteredOrders.length > 0 ? (
            filteredOrders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div className="order-id-section">
                    <span className="order-id-label">Order ID</span>
                    <span className="order-id-value">{order.id}</span>
                  </div>
                  <div className="order-status-badge" style={{ backgroundColor: getStatusColor(order.status) + "15", color: getStatusColor(order.status) }}>
                    <span className="status-icon">{getStatusIcon(order.status)}</span>
                    {order.status}
                  </div>
                </div>

                <div className="order-card-body">
                  <div className="order-details-grid">
                    <div className="order-detail">
                      <span className="detail-label">Order Date</span>
                      <span className="detail-value">{new Date(order.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="order-detail">
                      <span className="detail-label">Total Amount</span>
                      <span className="detail-value total">${order.total.toFixed(2)}</span>
                    </div>
                    <div className="order-detail">
                      <span className="detail-label">Items</span>
                      <span className="detail-value">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                    </div>
                    <div className="order-detail">
                      <span className="detail-label">Est. Delivery</span>
                      <span className="detail-value">{order.estimatedDelivery}</span>
                    </div>
                  </div>

                  <div className="order-items-preview">
                    <h4>Order Items</h4>
                    <div className="items-list">
                      {order.items.map((item, index) => (
                        <div key={index} className="order-item">
                          <span className="item-name">{item.name}</span>
                          <span className="item-quantity">x{item.quantity}</span>
                          <span className="item-price">${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.tracking && (
                    <div className="tracking-info">
                      <span className="tracking-label">Tracking Number:</span>
                      <span className="tracking-number">{order.tracking}</span>
                      <button className="track-order-btn">Track Package</button>
                    </div>
                  )}
                </div>

                <div className="order-card-footer">
                  <button className="order-action-btn">View Details</button>
                  <button className="order-action-btn">Buy Again</button>
                  {order.status === "Delivered" && (
                    <button className="order-action-btn review">Write a Review</button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-orders">
              <div className="no-orders-icon">📦</div>
              <h3>No orders found</h3>
              <p>{filter !== "all" ? `You don't have any ${filter} orders` : "You haven't placed any orders yet"}</p>
              <Link to="/" className="start-shopping-btn">Start Shopping</Link>
            </div>
          )}
        </div>

        {/* Order Summary */}
        {filteredOrders.length > 0 && (
          <div className="order-summary">
            <div className="summary-card">
              <h3>Order Summary</h3>
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="stat-label">Total Orders</span>
                  <span className="stat-value">{orders.length}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">Total Spent</span>
                  <span className="stat-value">${orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">Delivered</span>
                  <span className="stat-value">{orders.filter(o => o.status === "Delivered").length}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">In Transit</span>
                  <span className="stat-value">{orders.filter(o => o.status === "Shipped" || o.status === "Processing").length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Styles */}
      <style>{`
        .myorders-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding-bottom: 2rem;
        }

        /* Navigation */
        .orders-nav {
          background: white;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .nav-brand {
          flex: 0 0 auto;
        }

        .brand-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .brand-icon {
          font-size: 1.8rem;
        }

        .brand-name {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .nav-link {
          text-decoration: none;
          color: #64748b;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .nav-link:hover {
          color: #3b82f6;
          background: #f1f5f9;
        }

        .nav-link.active {
          color: #3b82f6;
          background: #eff6ff;
        }

        .back-to-dashboard {
          text-decoration: none;
          color: #3b82f6;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .back-to-dashboard:hover {
          background: #f1f5f9;
        }

        /* Header */
        .orders-header {
          background: white;
          margin: 2rem;
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .header-content h1 {
          font-size: 2rem;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .header-content p {
          color: #64748b;
        }

        .order-filters {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.5rem 1.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 50px;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .filter-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        /* Orders List */
        .orders-list-container {
          padding: 0 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .order-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .order-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .order-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }

        .order-id-section {
          display: flex;
          flex-direction: column;
        }

        .order-id-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .order-id-value {
          font-weight: 700;
          color: #1e293b;
        }

        .order-status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-weight: 600;
        }

        .status-icon {
          font-size: 1.1rem;
        }

        .order-card-body {
          padding: 1.5rem;
        }

        .order-details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .order-detail {
          display: flex;
          flex-direction: column;
        }

        .detail-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .detail-value {
          font-weight: 600;
          color: #1e293b;
        }

        .detail-value.total {
          color: #059669;
          font-size: 1.2rem;
        }

        .order-items-preview h4 {
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .item-name {
          flex: 2;
          font-weight: 500;
          color: #1e293b;
        }

        .item-quantity {
          flex: 0 0 60px;
          color: #64748b;
        }

        .item-price {
          flex: 0 0 80px;
          text-align: right;
          font-weight: 600;
          color: #059669;
        }

        .tracking-info {
          margin-top: 1rem;
          padding: 1rem;
          background: #eff6ff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .tracking-label {
          color: #1e293b;
          font-weight: 600;
        }

        .tracking-number {
          color: #3b82f6;
          font-family: monospace;
          font-weight: 600;
        }

        .track-order-btn {
          margin-left: auto;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .track-order-btn:hover {
          background: #2563eb;
        }

        .order-card-footer {
          display: flex;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 2px solid #e2e8f0;
        }

        .order-action-btn {
          padding: 0.5rem 1rem;
          background: transparent;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          color: #1e293b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .order-action-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .order-action-btn.review {
          background: #f59e0b;
          border-color: #f59e0b;
          color: white;
        }

        .order-action-btn.review:hover {
          background: #d97706;
        }

        /* No Orders */
        .no-orders {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 16px;
        }

        .no-orders-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .no-orders h3 {
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .no-orders p {
          color: #64748b;
          margin-bottom: 1.5rem;
        }

        .start-shopping-btn {
          display: inline-block;
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .start-shopping-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        /* Order Summary */
        .order-summary {
          padding: 2rem;
        }

        .summary-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .summary-card h3 {
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .summary-stat {
          display: flex;
          flex-direction: column;
        }

        .summary-stat .stat-label {
          font-size: 0.875rem;
          color: #64748b;
        }

        .summary-stat .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        /* Loading State */
        .orders-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .order-details-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .summary-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .orders-nav {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }

          .nav-links {
            width: 100%;
            justify-content: center;
          }

          .orders-header {
            margin: 1rem;
            padding: 1.5rem;
          }

          .order-filters {
            justify-content: center;
          }

          .order-card-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .order-details-grid {
            grid-template-columns: 1fr;
          }

          .tracking-info {
            flex-direction: column;
            align-items: flex-start;
          }

          .track-order-btn {
            margin-left: 0;
            width: 100%;
          }

          .order-card-footer {
            flex-wrap: wrap;
          }

          .order-action-btn {
            flex: 1;
          }

          .summary-stats {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .orders-list-container {
            padding: 0 1rem;
          }

          .order-item {
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .item-name {
            flex: 100%;
          }

          .item-quantity, .item-price {
            flex: 1;
            text-align: left;
          }

          .order-card-footer {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}