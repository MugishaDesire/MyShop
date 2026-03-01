import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/ulogin");
      return;
    }

    let parsedUser;
    try {
      parsedUser = JSON.parse(userData);
      if (!parsedUser || typeof parsedUser !== "object") throw new Error("Bad user data");
    } catch (e) {
      localStorage.removeItem("user");
      navigate("/ulogin");
      return;
    }

    const fetchData = async () => {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          axios.get("http://localhost:5000/products"),
          axios.get("http://localhost:5000/orders"),
        ]);

        setProducts(productsRes.data);

        // Filter only this user's orders
        const userPhone = parsedUser.phonenumber || parsedUser.phone || "";
        const userEmail = parsedUser.email || "";

        const myOrders = ordersRes.data.filter((order) => {
          const phoneMatch = userPhone && order.cust_phone === userPhone;
          const emailMatch = userEmail && order.cust_email === userEmail;
          return phoneMatch || emailMatch;
        });

        setOrders(myOrders);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Enrich orders with product info
  const enrichedOrders = useMemo(() => {
    return orders.map((order) => {
      const product = products.find((p) => p.id === order.product_id);
      const productPrice = product ? parseFloat(product.price) : 0;
      const quantity = parseInt(order.qty) || 1;
      return {
        ...order,
        productName: product ? product.name : `Product #${order.product_id}`,
        productPrice,
        total: productPrice * quantity,
      };
    });
  }, [orders, products]);

  // Group orders placed together (same phone + location + within 1 min)
  const groupedOrders = useMemo(() => {
    const groups = {};

    enrichedOrders.forEach((order) => {
      const orderTime = new Date(order.created_at || order.date || Date.now());
      const timeKey = Math.floor(orderTime.getTime() / (60 * 1000));
      const groupKey = `${order.cust_phone}_${order.location}_${timeKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: order.id,
          cust_name: order.cust_name,
          cust_phone: order.cust_phone,
          location: order.location,
          status: order.status,
          created_at: order.created_at || order.date,
          items: [],
          orderIds: [],
        };
      }

      groups[groupKey].items.push({
        id: order.id,
        productName: order.productName,
        qty: parseInt(order.qty) || 1,
        price: order.productPrice,
        subtotal: order.total,
      });

      groups[groupKey].orderIds.push(order.id);

      // Keep highest-priority status
      const priority = { Delivered: 3, Paid: 2, Pending: 1 };
      if ((priority[order.status] || 0) > (priority[groups[groupKey].status] || 0)) {
        groups[groupKey].status = order.status;
      }
    });

    return Object.values(groups)
      .map((g) => ({
        ...g,
        totalAmount: g.items.reduce((s, i) => s + i.subtotal, 0),
        totalItems: g.items.reduce((s, i) => s + i.qty, 0),
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [enrichedOrders]);

  // Summary stats
  const summaryStats = useMemo(() => ({
    total: groupedOrders.length,
    totalSpent: groupedOrders.reduce((s, o) => s + o.totalAmount, 0),
    delivered: groupedOrders.filter((o) => o.status === "Delivered").length,
    pending: groupedOrders.filter((o) => o.status !== "Delivered" && o.status !== "Paid").length,
    paid: groupedOrders.filter((o) => o.status === "Paid").length,
  }), [groupedOrders]);

  // Filter mapping to match real statuses
  const filteredOrders = useMemo(() => {
    if (filter === "all") return groupedOrders;
    if (filter === "pending")   return groupedOrders.filter((o) => o.status === "Pending");
    if (filter === "paid")      return groupedOrders.filter((o) => o.status === "Paid");
    if (filter === "delivered") return groupedOrders.filter((o) => o.status === "Delivered");
    return groupedOrders;
  }, [groupedOrders, filter]);

  const getStatusColor = (status = "") => {
    switch (status.toLowerCase()) {
      case "delivered": return "#10b981";
      case "paid":      return "#f59e0b";
      case "pending":   return "#ef4444";
      default:          return "#64748b";
    }
  };

  const getStatusIcon = (status = "") => {
    switch (status.toLowerCase()) {
      case "delivered": return "✅";
      case "paid":      return "💳";
      case "pending":   return "⏳";
      default:          return "📋";
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
          <div className="nav-links">
            <Link to="/userdashboard" className="nav-link">Dashboard</Link>
            <Link to="/myorders" className="nav-link active">My Orders</Link>
          </div>
          <div className="nav-user">
            <Link to="/userdashboard" className="back-to-dashboard">← Back to Dashboard</Link>
          </div>
        </nav>

        {/* Header */}
        <div className="orders-header">
          <div className="header-content">
            <h1>My Orders</h1>
            <p>Track and manage all your orders in one place</p>
          </div>
          <div className="order-filters">
            {[
              { key: "all",       label: `All Orders (${groupedOrders.length})` },
              { key: "pending",   label: `Pending (${summaryStats.pending})` },
              { key: "paid",      label: `Paid (${summaryStats.paid})` },
              { key: "delivered", label: `Delivered (${summaryStats.delivered})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`filter-btn ${filter === key ? "active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="orders-list-container">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((orderGroup) => (
              <div key={orderGroup.id} className="order-card">
                {/* Card Header */}
                <div className="order-card-header">
                  <div className="order-id-section">
                    <span className="order-id-label">Order ID</span>
                    <span className="order-id-value">#{orderGroup.id}</span>
                  </div>
                  <div
                    className="order-status-badge"
                    style={{
                      backgroundColor: getStatusColor(orderGroup.status) + "18",
                      color: getStatusColor(orderGroup.status),
                    }}
                  >
                    <span className="status-icon">{getStatusIcon(orderGroup.status)}</span>
                    {orderGroup.status || "Pending"}
                  </div>
                </div>

                {/* Card Body */}
                <div className="order-card-body">
                  {/* Details Grid */}
                  <div className="order-details-grid">
                    <div className="order-detail">
                      <span className="detail-label">Order Date</span>
                      <span className="detail-value">
                        {orderGroup.created_at
                          ? new Date(orderGroup.created_at).toLocaleDateString("en-US", {
                              year: "numeric", month: "long", day: "numeric",
                            })
                          : "N/A"}
                      </span>
                    </div>
                    <div className="order-detail">
                      <span className="detail-label">Total Amount</span>
                      <span className="detail-value total">${orderGroup.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="order-detail">
                      <span className="detail-label">Items</span>
                      <span className="detail-value">{orderGroup.totalItems} item{orderGroup.totalItems !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="order-detail">
                      <span className="detail-label">Location</span>
                      <span className="detail-value">📍 {orderGroup.location || "N/A"}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="order-items-preview">
                    <h4>Order Items</h4>
                    <div className="items-list">
                      {orderGroup.items.map((item) => (
                        <div key={item.id} className="order-item">
                          <span className="item-name">{item.productName}</span>
                          <span className="item-quantity">x{item.qty}</span>
                          <span className="item-price">${item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="order-card-footer">
                  {orderGroup.status === "Delivered" && (
                    <button className="order-action-btn review">Write a Review</button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-orders">
              <div className="no-orders-icon">📦</div>
              <h3>No orders found</h3>
              <p>
                {filter !== "all"
                  ? `You don't have any ${filter} orders`
                  : "You haven't placed any orders yet"}
              </p>
              <Link to="/userdashboard" className="start-shopping-btn">Start Shopping</Link>
            </div>
          )}
        </div>

        {/* Order Summary */}
        {groupedOrders.length > 0 && (
          <div className="order-summary">
            <div className="summary-card">
              <h3>Order Summary</h3>
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="stat-label">Total Orders</span>
                  <span className="stat-value">{summaryStats.total}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">Total Spent</span>
                  <span className="stat-value">${summaryStats.totalSpent.toFixed(2)}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">Delivered</span>
                  <span className="stat-value">{summaryStats.delivered}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">Pending</span>
                  <span className="stat-value">{summaryStats.pending}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .myorders-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding-bottom: 2rem;
        }

        .orders-nav {
          background: white;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .nav-links { display: flex; gap: 2rem; align-items: center; }
        .nav-link { text-decoration: none; color: #64748b; font-weight: 600; padding: 0.5rem 1rem; border-radius: 8px; transition: all 0.2s ease; }
        .nav-link:hover { color: #3b82f6; background: #f1f5f9; }
        .nav-link.active { color: #3b82f6; background: #eff6ff; }
        .back-to-dashboard { text-decoration: none; color: #3b82f6; font-weight: 600; padding: 0.5rem 1rem; border-radius: 8px; transition: all 0.2s ease; }
        .back-to-dashboard:hover { background: #f1f5f9; }

        .orders-header {
          background: white;
          margin: 2rem;
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .header-content h1 { font-size: 2rem; color: #1e293b; margin-bottom: 0.5rem; }
        .header-content p { color: #64748b; }

        .order-filters { display: flex; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap; }
        .filter-btn { padding: 0.5rem 1.5rem; border: 2px solid #e2e8f0; border-radius: 50px; background: transparent; color: #64748b; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .filter-btn:hover { border-color: #3b82f6; color: #3b82f6; }
        .filter-btn.active { background: #3b82f6; border-color: #3b82f6; color: white; }

        .orders-list-container { padding: 0 2rem; display: flex; flex-direction: column; gap: 1.5rem; }

        .order-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }
        .order-card:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }

        .order-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }

        .order-id-section { display: flex; flex-direction: column; }
        .order-id-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .order-id-value { font-weight: 700; color: #1e293b; }

        .order-status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .status-icon { font-size: 1.1rem; }

        .order-card-body { padding: 1.5rem; }

        .order-details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .order-detail { display: flex; flex-direction: column; }
        .detail-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
        .detail-value { font-weight: 600; color: #1e293b; }
        .detail-value.total { color: #059669; font-size: 1.2rem; }

        .order-items-preview h4 { color: #1e293b; margin-bottom: 1rem; }
        .items-list { display: flex; flex-direction: column; gap: 0.5rem; }

        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.625rem 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .item-name { flex: 2; font-weight: 500; color: #1e293b; }
        .item-quantity { flex: 0 0 60px; color: #64748b; }
        .item-price { flex: 0 0 80px; text-align: right; font-weight: 700; color: #059669; }

        .order-card-footer {
          display: flex;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 2px solid #e2e8f0;
          min-height: 60px;
          align-items: center;
        }

        .order-action-btn { padding: 0.5rem 1rem; background: transparent; border: 2px solid #e2e8f0; border-radius: 6px; color: #1e293b; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .order-action-btn:hover { border-color: #3b82f6; color: #3b82f6; }
        .order-action-btn.review { background: #f59e0b; border-color: #f59e0b; color: white; }
        .order-action-btn.review:hover { background: #d97706; }

        .no-orders { text-align: center; padding: 4rem 2rem; background: white; border-radius: 16px; }
        .no-orders-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
        .no-orders h3 { color: #1e293b; margin-bottom: 0.5rem; }
        .no-orders p { color: #64748b; margin-bottom: 1.5rem; }
        .start-shopping-btn { display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.2s ease; }
        .start-shopping-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }

        .order-summary { padding: 2rem; }
        .summary-card { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .summary-card h3 { color: #1e293b; margin-bottom: 1rem; }
        .summary-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .summary-stat { display: flex; flex-direction: column; }
        .summary-stat .stat-label { font-size: 0.875rem; color: #64748b; }
        .summary-stat .stat-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }

        .orders-loading { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
        .loading-spinner { width: 50px; height: 50px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .order-details-grid { grid-template-columns: repeat(2, 1fr); }
          .summary-stats { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .orders-nav { flex-direction: column; gap: 1rem; padding: 1rem; }
          .nav-links { width: 100%; justify-content: center; }
          .orders-header { margin: 1rem; padding: 1.5rem; }
          .order-filters { justify-content: center; }
          .order-card-header { flex-direction: column; gap: 1rem; align-items: flex-start; }
          .order-details-grid { grid-template-columns: 1fr; }
          .order-card-footer { flex-wrap: wrap; }
          .order-action-btn { flex: 1; }
          .summary-stats { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .orders-list-container { padding: 0 1rem; }
          .order-item { flex-wrap: wrap; gap: 0.5rem; }
          .item-name { flex: 100%; }
          .item-quantity, .item-price { flex: 1; text-align: left; }
          .order-card-footer { flex-direction: column; }
        }
      `}</style>
    </>
  );
}