import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [cart, setCart] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  // ─── Enrich raw orders with product info (same as admin) ───────────────────
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

  // ─── Group orders placed together (same phone + location + within 1 min) ───
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
          cust_email: order.cust_email,
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
        qty: order.qty,
        price: order.productPrice,
        subtotal: order.total,
      });

      groups[groupKey].orderIds.push(order.id);

      // Keep the highest-priority status in the group
      const priority = { Delivered: 3, Paid: 2, Pending: 1 };
      if ((priority[order.status] || 0) > (priority[groups[groupKey].status] || 0)) {
        groups[groupKey].status = order.status;
      }
    });

    return Object.values(groups)
      .map((g) => ({
        ...g,
        totalAmount: g.items.reduce((s, i) => s + i.subtotal, 0),
        totalItems: g.items.reduce((s, i) => s + parseInt(i.qty), 0),
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [enrichedOrders]);

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalSpent = groupedOrders.reduce((s, o) => s + o.totalAmount, 0);
    const pendingOrders = groupedOrders.filter(
      (o) => o.status !== "Delivered" && o.status !== "Paid"
    ).length;
    const totalItems = groupedOrders.reduce((s, o) => s + o.totalItems, 0);
    return {
      totalOrders: groupedOrders.length,
      totalSpent,
      pendingOrders,
      totalItems,
      wishlistCount: 0,
    };
  }, [groupedOrders]);

  // ─── Handle pending redirect after loading ──────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const state = location.state || {};
    const { pendingRedirect, pendingCart, pendingProduct, loggedInUser } = state;
    if (!pendingRedirect) return;

    window.history.replaceState({}, document.title);

    const currentUser =
      loggedInUser ||
      (() => {
        try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
      })();

    if (pendingRedirect === "checkout") {
      const cartToUse =
        pendingCart?.length > 0
          ? pendingCart
          : JSON.parse(localStorage.getItem("shoppingCart") || "[]");
      if (cartToUse.length > 0) {
        navigate("/checkout", { state: { cart: cartToUse, user: currentUser } });
      }
    } else if (pendingRedirect.startsWith("order/") && pendingProduct) {
      navigate(`/${pendingRedirect}`, { state: { product: pendingProduct, user: currentUser } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ─── Load cart from localStorage ───────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("shoppingCart");
      if (saved) setCart(JSON.parse(saved));
    } catch (e) {
      console.error("Error parsing cart:", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("shoppingCart", JSON.stringify(cart));
  }, [cart]);

  // ─── Load user + fetch products & orders from backend ──────────────────────
  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData || userData === "undefined" || userData === "null") {
      localStorage.removeItem("user");
      navigate("/ulogin");
      return;
    }

    let parsedUser;
    try {
      parsedUser = JSON.parse(userData);
      if (!parsedUser || typeof parsedUser !== "object") throw new Error("Bad user data");
      setUser(parsedUser);
    } catch (e) {
      console.error("Error parsing user data:", e);
      localStorage.removeItem("user");
      navigate("/ulogin");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch products and all orders in parallel (same as admin)
        const [productsRes, ordersRes] = await Promise.all([
          axios.get("http://localhost:5000/products"),
          axios.get("http://localhost:5000/orders"),
        ]);

        setProducts(productsRes.data);

        // Filter orders that belong to the logged-in user
        // Match by phone number OR email (whichever the order recorded)
        const userPhone = parsedUser.phonenumber || parsedUser.phone || "";
        const userEmail = parsedUser.email || "";

        const myOrders = ordersRes.data.filter((order) => {
          const phoneMatch = userPhone && order.cust_phone === userPhone;
          const emailMatch = userEmail && order.cust_email === userEmail;
          return phoneMatch || emailMatch;
        });

        setOrders(myOrders);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load some data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // ─── Cart helpers ───────────────────────────────────────────────────────────
  const addToCart = (product) => {
    const item = { ...product, price: parseFloat(product.price) || 0, quantity: 1 };
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, item];
    });
    showNotification(`✅ ${product.name} added to cart!`);
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.id !== productId));
    showNotification("Item removed from cart", "info");
  };

  const clearCart = () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      setCart([]);
      localStorage.removeItem("shoppingCart");
      showNotification("Cart cleared", "info");
    }
  };

  const showNotification = (message, type = "success") => {
    const el = document.createElement("div");
    el.className = `notification ${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("show"), 100);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => document.body.removeChild(el), 300);
    }, 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const getStatusColor = (status = "") => {
    switch (status.toLowerCase()) {
      case "delivered": return { bg: "#d1fae5", text: "#059669" };
      case "paid":      return { bg: "#fef3c7", text: "#92400e" };
      case "shipped":   return { bg: "#dbeafe", text: "#3b82f6" };
      default:          return { bg: "#fee2e2", text: "#991b1b" };
    }
  };

  const totalItemsInCart = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2);

  const filteredAndSortedProducts = products
    .filter(
      (p) =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":  return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "name":       return a.name?.localeCompare(b.name);
        case "stock":      return b.stock - a.stock;
        default:           return 0;
      }
    });

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-container">
        {/* Cart Indicator */}
        {totalItemsInCart > 0 && (
          <div className="cart-indicator">
            <div className="cart-indicator-content">
              <div className="left-section">
                <Link to="/userdashboard" className="my-account-link active">
                  <span className="account-icon">👤</span>
                  <span className="account-text">
                    {user?.fullname || user?.name || user?.email || "My Account"}
                  </span>
                </Link>
              </div>
              <div className="cart-info">
                <span className="cart-icon">🛒</span>
                <span className="cart-count">{totalItemsInCart} item{totalItemsInCart !== 1 ? "s" : ""}</span>
                <span className="cart-total">Total: ${cartTotal}</span>
              </div>
              <div className="cart-actions">
                <button className="view-cart-btn" onClick={() => navigate("/checkout", { state: { cart, user } })}>Checkout Now</button>
                <button className="clear-cart-btn" onClick={clearCart}>Clear Cart</button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Bar */}
        <nav className="dashboard-nav" style={{ top: totalItemsInCart > 0 ? "70px" : "0" }}>
          <div className="nav-links">
            {/* <Link to="/" className="nav-link">Home</Link> */}
            <Link to="/userdashboard" className="nav-link active">Dashboard</Link>
            <Link to="/myorders" className="nav-link">My Orders</Link>
          </div>
          <div className="nav-user">
            <div className="user-dropdown">
              <div className="user-info">
                <span className="user-greeting">
                  Hello, {user?.fullname?.split(" ")[0] || user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "User"}
                </span>
                <div className="user-avatar">
                  {user?.fullname?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </div>
              <div className="dropdown-menu">
                <Link to="/profile" className="dropdown-item">Profile Settings</Link>
                <Link to="/wishlist" className="dropdown-item">Wishlist</Link>
                <div className="dropdown-divider"></div>
                <button onClick={handleLogout} className="dropdown-item logout">Sign Out</button>
              </div>
            </div>
          </div>
        </nav>

        {/* Welcome Banner */}
        <div className="welcome-banner" style={{ marginTop: totalItemsInCart > 0 ? "140px" : "2rem" }}>
          <div className="welcome-content">
            <h1>Welcome back, {user?.fullname || user?.name || user?.email?.split("@")[0] || "Valued Customer"}! 👋</h1>
            <p>Track your orders, manage your account, and discover new products</p>
          </div>
          <div className="banner-stats">
            <div className="banner-stat">
              <span className="stat-value">{stats.totalOrders}</span>
              <span className="stat-label">Total Orders</span>
            </div>
            <div className="banner-stat">
              <span className="stat-value">${stats.totalSpent.toFixed(2)}</span>
              <span className="stat-label">Total Spent</span>
            </div>
            <div className="banner-stat">
              <span className="stat-value">{stats.pendingOrders}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          {["overview", "shop", "my-orders", "activity"].map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview" ? "Overview" : tab === "shop" ? "Shop Products" : tab === "my-orders" ? `My Orders (${groupedOrders.length})` : "Activity"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="overview-tab">
              <div className="stats-grid">
                {[
                  { icon: "📦", value: stats.totalOrders,              label: "Total Orders" },
                  { icon: "💰", value: `$${stats.totalSpent.toFixed(2)}`, label: "Total Spent" },
                  { icon: "⏳", value: stats.pendingOrders,             label: "Pending Orders" },
                  { icon: "📊", value: stats.totalItems,                label: "Items Purchased" },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-icon">{s.icon}</div>
                    <div className="stat-details">
                      <span className="stat-value">{s.value}</span>
                      <span className="stat-label">{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="quick-actions-section">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                  <button onClick={() => setActiveTab("shop")} className="action-card">
                    <span className="action-icon">🛒</span>
                    <span className="action-text">Continue Shopping</span>
                  </button>
                  <button onClick={() => setActiveTab("my-orders")} className="action-card">
                    <span className="action-icon">📋</span>
                    <span className="action-text">Track Orders</span>
                  </button>
                  <Link to="/wishlist" className="action-card">
                    <span className="action-icon">❤️</span>
                    <span className="action-text">Wishlist</span>
                  </Link>
                  <Link to="/profile" className="action-card">
                    <span className="action-icon">⚙️</span>
                    <span className="action-text">Settings</span>
                  </Link>
                </div>
              </div>

              {/* Mini order preview */}
              {groupedOrders.length > 0 && (
                <div className="recent-orders-preview">
                  <div className="preview-header">
                    <h2>Recent Orders</h2>
                    <button className="view-all-btn" onClick={() => setActiveTab("/myorders")}>
                       →</button>
                  </div>
                  {groupedOrders.slice(0, 3).map((order) => {
                    const colors = getStatusColor(order.status);

                    return (
                      <div key={order.id} className="mini-order-card">
                        <div className="mini-order-left">
                          <span className="mini-order-date">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : "N/A"}
                          </span>
                          <span className="mini-order-items">
                            {order.items.map((i) => i.productName).join(", ")}
                          </span>
                        </div>
                        <div className="mini-order-right">
                          <span className="mini-order-total">${order.totalAmount.toFixed(2)}</span>
                          <span className="mini-status-badge" style={{ background: colors.bg, color: colors.text }}>
                            {order.status || "Pending"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SHOP ── */}
          {activeTab === "shop" && (
            <div className="shop-tab">
              <section className="hero-section">
                <div className="hero-content">
                  <h1 className="hero-title">Discover Amazing Products</h1>
                  <p className="hero-subtitle">Shop the latest electronics at unbeatable prices</p>
                  <div className="hero-search">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="search-input"
                    />
                    <span className="search-icon">🔍</span>
                  </div>
                </div>
                <div className="hero-stats">
                  <div className="stat"><span className="stat-number">{products.length}</span><span className="stat-label">Products</span></div>
                  <div className="stat"><span className="stat-number">{products.filter((p) => p.stock > 0).length}</span><span className="stat-label">In Stock</span></div>
                  <div className="stat"><span className="stat-number">{totalItemsInCart}</span><span className="stat-label">In Cart</span></div>
                </div>
              </section>

              <div className="controls">
                <div className="sort-control">
                  <label htmlFor="sort">Sort by:</label>
                  <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                    <option value="default">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name">Name: A to Z</option>
                    <option value="stock">Most in Stock</option>
                  </select>
                </div>
                <div className="results-count">Showing {filteredAndSortedProducts.length} of {products.length} products</div>
              </div>

              {error && <div className="error-message"><span>⚠️</span>{error}</div>}

              <div className="product-grid">
                {filteredAndSortedProducts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <h3>No products found</h3>
                    <p>{search ? `No results for "${search}"` : "Check back soon!"}</p>
                    {search && <button className="clear-search" onClick={() => setSearch("")}>Clear search</button>}
                  </div>
                ) : (
                  filteredAndSortedProducts.map((p) => {
                    const cartItem = cart.find((item) => item.id === p.id);
                    const isInCart = !!cartItem;
                    const cartQuantity = cartItem?.quantity || 0;

                    return (
                      <div key={p.id} className="product-card">
                        <div className="product-image-container">
                          <img
                            src={p.image ? `http://localhost:5000/uploads/${p.image}` : "https://placehold.co/300x200/3b82f6/white?text=No+Image"}
                            alt={p.name || "Product"}
                            className="product-image"
                            onError={(e) => { e.target.src = "https://placehold.co/300x200/3b82f6/white?text=No+Image"; e.target.onerror = null; }}
                          />
                          {p.stock <= 0 ? <div className="out-of-stock-badge">Out of Stock</div> : p.stock < 10 ? <div className="low-stock-badge">Low Stock</div> : null}
                          {isInCart && <div className="in-cart-badge">In Cart: {cartQuantity}</div>}
                        </div>
                        <div className="product-content">
                          <div className="product-header">
                            <h3 className="product-name">{p.name || "Unnamed Product"}</h3>
                            <div className="price-tag">${parseFloat(p.price || 0).toFixed(2)}</div>
                          </div>
                          {p.description && (
                            <p className="product-description">
                              {p.description.length > 100 ? `${p.description.substring(0, 100)}...` : p.description}
                            </p>
                          )}
                          <div className="product-footer">
                            <div className="stock-info">
                              <span className="stock-label">Available:</span>
                              <span className={`stock-count ${p.stock <= 0 ? "out" : p.stock < 10 ? "low" : "high"}`}>{p.stock || 0} units</span>
                            </div>
                            <div className="button-group">
                              <button className="add-to-cart-button" onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                                {isInCart ? <><span>➕</span>Add More ({cartQuantity})</> : <><span>🛒</span>Add to Cart</>}
                              </button>
                              <Link to={`/order/${p.id}`} state={{ product: p, user }}>
                                <button className="buy-now-button" disabled={p.stock <= 0}>
                                  {p.stock <= 0 ? "Out of Stock" : <><span>⚡</span>Buy Now</>}
                                </button>
                              </Link>
                            </div>
                            {isInCart && (
                              <button className="remove-from-cart-btn" onClick={() => removeFromCart(p.id)}>Remove from Cart</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 && (
                <div className="cart-summary-banner">
                  <div className="banner-content">
                    <div className="cart-summary-text">
                      <h3>🛒 Ready to Checkout?</h3>
                      <p>You have {totalItemsInCart} item{totalItemsInCart !== 1 ? "s" : ""} in your cart</p>
                      <div className="cart-total-summary">Total: <strong>${cartTotal}</strong></div>
                    </div>
                    <button className="checkout-now-btn" onClick={() => navigate("/checkout", { state: { cart, user } })}>
                      Proceed to Checkout →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MY ORDERS (real backend data) ── */}
          {activeTab === "my-orders" && (
            <div className="my-orders-tab">
              <h2>All Orders</h2>

              {groupedOrders.length === 0 ? (
                <div className="empty-orders">
                  <span className="empty-icon">📋</span>
                  <h3>No orders yet</h3>
                  <p>Your order history will appear here once you place an order.</p>
                  <button className="shop-now-btn" onClick={() => setActiveTab("shop")}>Start Shopping →</button>
                </div>
              ) : (
                <div className="orders-list-full">
                  {groupedOrders.map((orderGroup) => {
                    const colors = getStatusColor(orderGroup.status);
                    return (
                      <div key={orderGroup.id} className="order-card">
                        {/* Order Header */}
                        <div className="order-header">
                          <div>
                            <span className="order-id">Order #{orderGroup.id}</span>
                            <span className="order-date">
                              {orderGroup.created_at
                                ? new Date(orderGroup.created_at).toLocaleDateString("en-US", {
                                    year: "numeric", month: "short", day: "numeric",
                                  })
                                : "N/A"}
                            </span>
                          </div>
                          <span className="order-status" style={{ background: colors.bg, color: colors.text }}>
                            {orderGroup.status || "Pending"}
                          </span>
                        </div>

                        {/* Order Items */}
                        <div className="order-items-section">
                          {orderGroup.items.map((item) => (
                            <div key={item.id} className="order-item-row">
                              <div className="order-item-info">
                                <span className="order-item-name">{item.productName}</span>
                                <span className="order-item-qty">Qty: {item.qty}</span>
                              </div>
                              <div className="order-item-pricing">
                                <span className="order-item-unit">${item.price.toFixed(2)} each</span>
                                <span className="order-item-subtotal">${item.subtotal.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Footer */}
                        <div className="order-footer">
                          <div className="order-meta">
                            <span className="order-location">📍 {orderGroup.location || "N/A"}</span>
                            <span className="order-total-line">
                              Total: <strong>${orderGroup.totalAmount.toFixed(2)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {activeTab === "activity" && (
            <div className="activity-tab">
              <h2>Recent Activity</h2>
              <div className="activity-timeline">
                {groupedOrders.slice(0, 5).map((order, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-icon">
                      {order.status === "Delivered" ? "✅" : order.status === "Paid" ? "💳" : "⏳"}
                    </div>
                    <div className="activity-content">
                      <p>
                        Order of <strong>{order.items.map((i) => i.productName).join(", ")}</strong> — {order.status || "Pending"}
                      </p>
                      <span className="activity-time">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                ))}
                {groupedOrders.length === 0 && (
                  <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>No activity yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="account-info-section">
          <h2>Account Information</h2>
          <div className="info-cards">
            <div className="info-card">
              <h3>Personal Details</h3>
              <div className="info-content">
                <p><span>Name:</span> {user?.fullname || user?.name || "N/A"}</p>
                <p><span>Email:</span> {user?.email || "N/A"}</p>
                <p><span>Phone:</span> {user?.phonenumber || user?.phone || "N/A"}</p>
                <Link to="/profile"><button className="edit-info-btn">Edit</button></Link>
              </div>
            </div>
            <div className="info-card">
              <h3>Shipping Address</h3>
              <div className="info-content">
                <p>{user?.address || "123 Main Street"}</p>
                <p>{user?.city || "New York, NY 10001"}</p>
                <p>{user?.country || "United States"}</p>
                <Link to="/profile"><button className="edit-info-btn">Edit</button></Link>
              </div>
            </div>
            <div className="info-card">
              <h3>Payment Methods</h3>
              <div className="info-content">
                <p>💳 Visa ending in 4242</p>
                <p>💳 Mastercard ending in 5555</p>
                <button className="edit-info-btn">Manage</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-container { min-height: 100vh; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding-bottom: 2rem; }
        .cart-indicator { position: fixed; top: 0; left: 0; right: 0; background: white; padding: 15px 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.1); z-index: 1000; border-bottom: 3px solid #3b82f6; }
        .cart-indicator-content { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; gap: 1rem; }
        .left-section { flex: 0 0 auto; }
        .cart-info { flex: 1; display: flex; align-items: center; gap: 1rem; justify-content: center; }
        .cart-actions { flex: 0 0 auto; display: flex; gap: 0.5rem; }
        .my-account-link { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: #1e293b; font-weight: 600; padding: 0.5rem 1rem; border-radius: 8px; background: #f1f5f9; transition: all 0.2s ease; }
        .my-account-link.active { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; }
        .cart-icon { font-size: 1.5rem; }
        .cart-count { font-weight: 600; color: #1e293b; }
        .cart-total { font-weight: 600; color: #059669; }
        .view-cart-btn { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .view-cart-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .clear-cart-btn { background: #fee2e2; color: #dc2626; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .dashboard-nav { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 20px rgba(0,0,0,0.1); position: sticky; z-index: 999; }
        .nav-links { display: flex; gap: 2rem; align-items: center; }
        .nav-link { text-decoration: none; color: #64748b; font-weight: 600; padding: 0.5rem 1rem; border-radius: 8px; transition: all 0.2s ease; }
        .nav-link:hover { color: #3b82f6; background: #f1f5f9; }
        .nav-link.active { color: white; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .nav-user { position: relative; }
        .user-dropdown { position: relative; }
        .user-info { display: flex; align-items: center; gap: 1rem; cursor: pointer; padding: 0.5rem; border-radius: 50px; transition: all 0.2s ease; }
        .user-info:hover { background: #f1f5f9; }
        .user-greeting { font-weight: 600; color: #1e293b; }
        .user-avatar { width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.2rem; }
        .dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 0.5rem; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); min-width: 200px; opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.2s ease; z-index: 1000; }
        .user-dropdown:hover .dropdown-menu { opacity: 1; visibility: visible; transform: translateY(0); }
        .dropdown-item { display: block; padding: 0.75rem 1rem; text-decoration: none; color: #1e293b; transition: all 0.2s ease; width: 100%; text-align: left; border: none; background: none; font-size: 0.95rem; cursor: pointer; }
        .dropdown-item:hover { background: #f1f5f9; color: #3b82f6; }
        .dropdown-item.logout:hover { color: #dc2626; background: #fee2e2; }
        .dropdown-divider { height: 1px; background: #e2e8f0; margin: 0.5rem 0; }
        .welcome-banner { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); margin: 2rem; padding: 2rem; border-radius: 20px; color: white; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 2rem; box-shadow: 0 20px 40px rgba(59,130,246,0.3); }
        .welcome-content h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .welcome-content p { opacity: 0.9; }
        .banner-stats { display: flex; gap: 2rem; }
        .banner-stat { text-align: center; }
        .banner-stat .stat-value { font-size: 1.5rem; font-weight: 700; display: block; }
        .banner-stat .stat-label { font-size: 0.875rem; opacity: 0.9; }
        .dashboard-tabs { display: flex; gap: 1rem; padding: 0 2rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .tab-btn { padding: 0.75rem 1.5rem; background: white; border: none; border-radius: 50px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .tab-btn:hover { color: #3b82f6; transform: translateY(-2px); }
        .tab-btn.active { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; }
        .tab-content { padding: 0 2rem; margin-bottom: 2rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: white; padding: 1.5rem; border-radius: 16px; display: flex; align-items: center; gap: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 20px 30px rgba(59,130,246,0.1); }
        .stat-icon { font-size: 2.5rem; }
        .stat-details { display: flex; flex-direction: column; }
        .stat-value { font-size: 1.8rem; font-weight: 700; color: #1e293b; line-height: 1.2; }
        .stat-label { color: #64748b; font-size: 0.875rem; }
        .quick-actions-section { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-bottom: 2rem; }
        .quick-actions-section h2 { color: #1e293b; margin-bottom: 1.5rem; }
        .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
        .action-card { background: #f8fafc; padding: 1.5rem; border-radius: 12px; text-decoration: none; color: inherit; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; transition: all 0.2s ease; cursor: pointer; border: none; width: 100%; font-size: 1rem; }
        .action-card:hover { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; transform: translateY(-4px); }
        .action-icon { font-size: 2rem; }
        .action-text { font-size: 0.875rem; font-weight: 600; text-align: center; }

        /* Recent orders preview on overview */
        .recent-orders-preview { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .preview-header h2 { margin: 0; color: #1e293b; }
        .view-all-btn { background: none; border: none; color: #3b82f6; font-weight: 600; cursor: pointer; font-size: 0.95rem; }
        .mini-order-card { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem; background: #f8fafc; border-radius: 10px; margin-bottom: 0.75rem; border: 1px solid #e2e8f0; }
        .mini-order-left { display: flex; flex-direction: column; gap: 0.25rem; }
        .mini-order-date { font-size: 0.75rem; color: #64748b; }
        .mini-order-items { font-size: 0.9rem; font-weight: 600; color: #1e293b; }
        .mini-order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.375rem; }
        .mini-order-total { font-weight: 700; color: #059669; }
        .mini-status-badge { padding: 0.2rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; }

        /* My Orders tab */
        .my-orders-tab h2 { color: #1e293b; margin-bottom: 1.5rem; }
        .empty-orders { text-align: center; padding: 4rem 2rem; background: white; border-radius: 16px; border: 2px dashed #e2e8f0; }
        .empty-orders .empty-icon { font-size: 4rem; display: block; margin-bottom: 1rem; }
        .empty-orders h3 { color: #1e293b; margin-bottom: 0.5rem; }
        .empty-orders p { color: #64748b; margin-bottom: 1.5rem; }
        .shop-now-btn { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 0.75rem 2rem; border-radius: 50px; font-weight: 600; font-size: 1rem; cursor: pointer; }
        .orders-list-full { display: grid; gap: 1.25rem; }
        .order-card { background: white; border-radius: 14px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; }
        .order-id { font-weight: 700; color: #1e293b; margin-right: 1rem; }
        .order-date { color: #64748b; font-size: 0.875rem; }
        .order-status { padding: 0.3rem 0.875rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .order-items-section { background: #f8fafc; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
        .order-item-row { display: flex; justify-content: space-between; align-items: center; padding: 0.625rem; background: white; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid #e2e8f0; }
        .order-item-row:last-child { margin-bottom: 0; }
        .order-item-info { display: flex; flex-direction: column; gap: 0.2rem; }
        .order-item-name { font-weight: 600; color: #1e293b; }
        .order-item-qty { font-size: 0.8rem; color: #64748b; }
        .order-item-pricing { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
        .order-item-unit { font-size: 0.8rem; color: #94a3b8; }
        .order-item-subtotal { font-weight: 700; color: #059669; }
        .order-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; flex-wrap: wrap; gap: 0.5rem; }
        .order-meta { display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap; }
        .order-location { font-size: 0.875rem; color: #64748b; }
        .order-total-line { font-size: 1rem; color: #475569; }
        .order-total-line strong { color: #1e293b; font-size: 1.2rem; margin-left: 0.25rem; }

        /* Shop */
        .hero-section { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 20px; padding: 3rem 2rem; margin-bottom: 2rem; color: white; text-align: center; }
        .hero-title { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; -webkit-background-clip: text; }
        .hero-subtitle { font-size: 1.25rem; opacity: 0.9; margin-bottom: 2rem; }
        .hero-search { position: relative; max-width: 500px; margin: 0 auto; }
        .search-input { width: 100%; padding: 1rem 1.5rem 1rem 3rem; border: none; border-radius: 50px; font-size: 1rem; background: rgba(255,255,255,0.9); box-shadow: 0 10px 40px rgba(0,0,0,0.1); transition: all 0.3s ease; }
        .search-input:focus { outline: none; background: white; }
        .search-icon { position: absolute; left: 1.5rem; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; }
        .hero-stats { display: flex; justify-content: center; gap: 3rem; margin-top: 2rem; }
        .stat { display: flex; flex-direction: column; align-items: center; }
        .stat-number { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.25rem; }
        .controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .sort-control { display: flex; align-items: center; gap: 0.75rem; }
        .sort-control label { font-weight: 600; color: #475569; }
        .sort-select { padding: 0.5rem 2rem 0.5rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; background: white; font-size: 0.875rem; cursor: pointer; }
        .results-count { color: #64748b; font-size: 0.875rem; }
        .error-message { background: #fee2e2; color: #dc2626; padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
        .product-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: all 0.3s ease; display: flex; flex-direction: column; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .product-image-container { position: relative; height: 200px; overflow: hidden; }
        .product-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
        .product-card:hover .product-image { transform: scale(1.05); }
        .out-of-stock-badge, .low-stock-badge, .in-cart-badge { position: absolute; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .out-of-stock-badge { top: 1rem; left: 1rem; background: #dc2626; color: white; }
        .low-stock-badge { top: 1rem; left: 1rem; background: #f59e0b; color: white; }
        .in-cart-badge { top: 1rem; right: 1rem; background: #3b82f6; color: white; }
        .product-content { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; }
        .product-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
        .product-name { font-size: 1.125rem; font-weight: 700; color: #1e293b; margin: 0; flex: 1; }
        .price-tag { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 700; margin-left: 0.5rem; white-space: nowrap; }
        .product-description { color: #64748b; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1rem; flex: 1; }
        .product-footer { display: flex; flex-direction: column; gap: 1rem; margin-top: auto; }
        .stock-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .stock-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
        .stock-count { font-size: 0.875rem; font-weight: 600; }
        .stock-count.high { color: #059669; } .stock-count.low { color: #d97706; } .stock-count.out { color: #dc2626; }
        .button-group { display: flex; gap: 0.5rem; }
        .add-to-cart-button { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; flex: 2; justify-content: center; }
        .add-to-cart-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
        .buy-now-button { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; flex: 1; justify-content: center; }
        .buy-now-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .add-to-cart-button:disabled, .buy-now-button:disabled { background: #94a3b8; cursor: not-allowed; opacity: 0.7; }
        .remove-from-cart-btn { background: #fee2e2; color: #dc2626; border: none; padding: 0.5rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: white; border-radius: 16px; border: 2px dashed #e2e8f0; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
        .cart-summary-banner { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px; padding: 1.5rem 2rem; color: white; margin-top: 2rem; }
        .cart-summary-banner .banner-content { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
        .cart-summary-text h3 { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.25rem; }
        .cart-summary-text p { opacity: 0.9; }
        .cart-total-summary { font-size: 1.2rem; }
        .checkout-now-btn { background: white; color: #d97706; border: none; padding: 1rem 2rem; border-radius: 50px; font-size: 1rem; font-weight: 700; cursor: pointer; }

        /* Activity */
        .activity-tab h2 { color: #1e293b; margin-bottom: 1.5rem; }
        .activity-timeline { background: white; border-radius: 16px; padding: 1.5rem; }
        .activity-item { display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #e2e8f0; }
        .activity-item:last-child { border-bottom: none; }
        .activity-icon { width: 40px; height: 40px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .activity-content { flex: 1; }
        .activity-content p { margin-bottom: 0.25rem; color: #1e293b; }
        .activity-time { font-size: 0.875rem; color: #64748b; }

        /* Account Info */
        .account-info-section { padding: 2rem; background: rgba(255,255,255,0.9); margin-top: 2rem; }
        .account-info-section h2 { color: #1e293b; margin-bottom: 1.5rem; }
        .info-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
        .info-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .info-card h3 { color: #1e293b; margin-bottom: 1rem; font-size: 1.1rem; }
        .info-content p { margin-bottom: 0.5rem; color: #64748b; }
        .info-content p span { font-weight: 600; color: #1e293b; }
        .edit-info-btn { margin-top: 1rem; padding: 0.5rem 1rem; background: #f1f5f9; border: none; border-radius: 6px; color: #3b82f6; font-weight: 600; cursor: pointer; }
        .edit-info-btn:hover { background: #3b82f6; color: white; }

        /* Notification */
        .notification { position: fixed; top: 2rem; right: 2rem; padding: 1rem 2rem; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); font-weight: 600; z-index: 2000; opacity: 0; transform: translateX(100%); transition: all 0.3s ease; }
        .notification.show { opacity: 1; transform: translateX(0); }
        .notification.success { border-left: 4px solid #10b981; color: #059669; }
        .notification.info { border-left: 4px solid #3b82f6; color: #2563eb; }

        /* Loading */
        .dashboard-loading { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; }
        .loading-spinner { width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .cart-indicator-content { flex-wrap: wrap; flex-direction: column; align-items: stretch; }
          .dashboard-nav { flex-direction: column; gap: 1rem; padding: 1rem; }
          .nav-links { width: 100%; justify-content: center; flex-wrap: wrap; }
          .welcome-banner { margin: 1rem; padding: 1.5rem; flex-direction: column; text-align: center; }
          .banner-stats { width: 100%; justify-content: center; }
          .hero-title { font-size: 2rem; }
          .hero-stats { flex-direction: column; gap: 1.5rem; }
          .controls { flex-direction: column; gap: 1rem; }
          .product-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
          .button-group { flex-direction: column; }
          .cart-summary-banner .banner-content { flex-direction: column; text-align: center; }
          .order-footer { flex-direction: column; }
          .info-cards { grid-template-columns: 1fr; }
          .mini-order-card { flex-direction: column; gap: 0.5rem; }
        }
        @media (max-width: 480px) {
          .product-grid { grid-template-columns: 1fr; }
          .actions-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
