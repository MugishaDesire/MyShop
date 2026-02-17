import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [cart, setCart] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    wishlistCount: 0,
    pendingOrders: 0,
    totalItems: 0,
  });

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Handle pending redirect AFTER dashboard finishes loading
  // This runs once when loading flips from true → false
  useEffect(() => {
    if (loading) return;

    const state = location.state || {};
    const { pendingRedirect, pendingCart, pendingProduct, loggedInUser } = state;

    if (!pendingRedirect) return;

    // Clear location state so back-button doesn't retrigger
    window.history.replaceState({}, document.title);

    const currentUser =
      loggedInUser ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem("user"));
        } catch {
          return null;
        }
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
      navigate(`/${pendingRedirect}`, {
        state: { product: pendingProduct, user: currentUser },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // ← intentionally only fires once when dashboard is ready

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("shoppingCart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error parsing cart:", e);
      }
    }
  }, []);

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem("shoppingCart", JSON.stringify(cart));
  }, [cart]);

  // Load user and dashboard data
  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData || userData === "undefined" || userData === "null") {
      localStorage.removeItem("user");
      navigate("/ulogin");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (!parsedUser || typeof parsedUser !== "object") throw new Error("Bad user data");
      setUser(parsedUser);
    } catch (e) {
      console.error("Error parsing user data:", e);
      localStorage.removeItem("user");
      navigate("/ulogin");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const productsRes = await axios.get("http://localhost:5000/products");
        setProducts(productsRes.data);

        const mockOrders = [
          {
            id: "ORD-1001",
            date: "2024-02-15",
            total: 299.99,
            status: "Delivered",
            items: 3,
            products: ["Wireless Headphones", "Phone Case", "Screen Protector"],
          },
          {
            id: "ORD-1002",
            date: "2024-02-10",
            total: 149.50,
            status: "Shipped",
            items: 2,
            products: ["Smart Watch", "Watch Band"],
          },
          {
            id: "ORD-1003",
            date: "2024-02-05",
            total: 79.99,
            status: "Processing",
            items: 1,
            products: ["Bluetooth Speaker"],
          },
          {
            id: "ORD-1004",
            date: "2024-01-28",
            total: 459.97,
            status: "Delivered",
            items: 3,
            products: ["Laptop Backpack", "Wireless Mouse", "USB-C Hub"],
          },
        ];

        setRecentOrders(mockOrders);

        const totalSpent = mockOrders.reduce((sum, o) => sum + o.total, 0);
        const pendingOrders = mockOrders.filter(
          (o) => o.status === "Processing" || o.status === "Shipped"
        ).length;
        const totalItems = mockOrders.reduce((sum, o) => sum + o.items, 0);

        setStats({
          totalOrders: mockOrders.length,
          totalSpent,
          wishlistCount: 8,
          pendingOrders,
          totalItems,
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load some data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const addToCart = (product) => {
    const productWithNumberPrice = {
      ...product,
      price: parseFloat(product.price) || 0,
      quantity: 1,
    };

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, productWithNumberPrice];
    });

    showNotification(`✅ ${product.name} added to cart!`);
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
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
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add("show"), 100);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  };

  // ✅ Logout: clear user, go to home
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "delivered": return { bg: "#d1fae5", text: "#059669" };
      case "shipped": return { bg: "#dbeafe", text: "#3b82f6" };
      case "processing": return { bg: "#fed7aa", text: "#d97706" };
      default: return { bg: "#e2e8f0", text: "#64748b" };
    }
  };

  const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
    .toFixed(2);

  const filteredAndSortedProducts = products
    .filter(
      (product) =>
        product.name?.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low": return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "name": return a.name?.localeCompare(b.name);
        case "stock": return b.stock - a.stock;
        default: return 0;
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
                <span className="cart-count">
                  {totalItemsInCart} item{totalItemsInCart !== 1 ? "s" : ""}
                </span>
                <span className="cart-total">Total: ${cartTotal}</span>
              </div>
              <div className="cart-actions">
                <button
                  className="view-cart-btn"
                  onClick={() => navigate("/checkout", { state: { cart, user } })}
                >
                  Checkout Now
                </button>
                <button className="clear-cart-btn" onClick={clearCart}>
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Bar */}
        <nav className="dashboard-nav" style={{ top: totalItemsInCart > 0 ? "70px" : "0" }}>
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/userdashboard" className="nav-link active">Dashboard</Link>
            <Link to="/myorders" className="nav-link">My Orders</Link>
          </div>

          <div className="nav-user">
            <div className="user-dropdown">
              <div className="user-info">
                <span className="user-greeting">
                  Hello,{" "}
                  {user?.fullname?.split(" ")[0] ||
                    user?.name?.split(" ")[0] ||
                    user?.email?.split("@")[0] ||
                    "User"}
                </span>
                <div className="user-avatar">
                  {user?.fullname?.charAt(0)?.toUpperCase() ||
                    user?.name?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
              </div>
              <div className="dropdown-menu">
                <Link to="/profile" className="dropdown-item">Profile Settings</Link>
                <Link to="/wishlist" className="dropdown-item">Wishlist</Link>
                <div className="dropdown-divider"></div>
                <button onClick={handleLogout} className="dropdown-item logout">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Welcome Banner */}
        <div
          className="welcome-banner"
          style={{ marginTop: totalItemsInCart > 0 ? "140px" : "2rem" }}
        >
          <div className="welcome-content">
            <h1>
              Welcome back,{" "}
              {user?.fullname ||
                user?.name ||
                user?.email?.split("@")[0] ||
                "Valued Customer"}! 👋
            </h1>
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
              <span className="stat-label">In Transit</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          {["overview", "shop", "recent", "activity"].map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview" ? "Overview" :
               tab === "shop" ? "Shop Products" :
               tab === "recent" ? "Recent Orders" : "Activity"}
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
                  { icon: "📦", value: stats.totalOrders, label: "Total Orders" },
                  { icon: "💰", value: `$${stats.totalSpent.toFixed(2)}`, label: "Total Spent" },
                  { icon: "❤️", value: stats.wishlistCount, label: "Wishlist" },
                  { icon: "⏳", value: stats.pendingOrders, label: "Pending Orders" },
                  { icon: "📊", value: stats.totalItems, label: "Items Purchased" },
                  { icon: "⭐", value: "4.8", label: "Avg Rating" },
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
                  <button onClick={() => setActiveTab("recent")} className="action-card">
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
                  <div className="stat"><span className="stat-number">{totalItemsInCart}</span><span className="stat-label">In Your Cart</span></div>
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
                              <button className="remove-from-cart-btn" onClick={() => removeFromCart(p.id)}>
                                Remove from Cart
                              </button>
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

              {!loading && products.length > 0 && (
                <div className="featured-banner">
                  <div className="banner-content">
                    <h3>🔥 Hot Deal of the Day</h3>
                    <p>Check out our featured product with special pricing</p>
                    <div className="featured-buttons">
                      <button className="featured-add-to-cart" onClick={() => addToCart(products[0])}>Add to Cart</button>
                      <Link to={`/order/${products[0].id}`} state={{ product: products[0], user }}>
                        <button className="featured-button">Buy Now</button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── RECENT ORDERS ── */}
          {activeTab === "recent" && (
            <div className="recent-tab">
              <h2>Recent Orders</h2>
              <div className="orders-list-full">
                {recentOrders.map((order) => {
                  const statusColors = getStatusColor(order.status);
                  return (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div>
                          <span className="order-id">{order.id}</span>
                          <span className="order-date">{new Date(order.date).toLocaleDateString()}</span>
                        </div>
                        <span className="order-status" style={{ backgroundColor: statusColors.bg, color: statusColors.text }}>
                          {order.status}
                        </span>
                      </div>
                      <div className="order-body">
                        <div className="order-products">
                          {order.products.map((product, i) => (
                            <span key={i} className="product-tag">{product}</span>
                          ))}
                        </div>
                        <div className="order-total">
                          <span>Total:</span>
                          <strong>${order.total.toFixed(2)}</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        <button className="order-action">Track Package</button>
                        <button className="order-action">Buy Again</button>
                        <button className="order-action review">Write Review</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link to="/myorders" className="view-all-orders">View All Orders →</Link>
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {activeTab === "activity" && (
            <div className="activity-tab">
              <h2>Recent Activity</h2>
              <div className="activity-timeline">
                {[
                  { icon: "🛒", text: <>You ordered <strong>Wireless Headphones</strong></>, time: "2 hours ago" },
                  { icon: "❤️", text: <>Added <strong>Smart Watch</strong> to wishlist</>, time: "Yesterday" },
                  { icon: "📦", text: <>Your order <strong>#ORD-1002</strong> has been shipped</>, time: "2 days ago" },
                  { icon: "⭐", text: <>You reviewed <strong>Bluetooth Speaker</strong></>, time: "3 days ago" },
                ].map((item, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-icon">{item.icon}</div>
                    <div className="activity-content">
                      <p>{item.text}</p>
                      <span className="activity-time">{item.time}</span>
                    </div>
                  </div>
                ))}
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
        .my-account-link:hover { background: #e2e8f0; }
        .my-account-link.active { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; }
        .account-icon { font-size: 1.2rem; }
        .account-text { font-size: 0.95rem; }
        .cart-icon { font-size: 1.5rem; }
        .cart-count { font-weight: 600; color: #1e293b; }
        .cart-total { font-weight: 600; color: #059669; }
        .view-cart-btn { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .view-cart-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .clear-cart-btn { background: #fee2e2; color: #dc2626; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .clear-cart-btn:hover { background: #fecaca; }
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
        .dashboard-tabs { display: flex; gap: 1rem; padding: 0 2rem; margin-bottom: 2rem; }
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
        .quick-actions-section { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .quick-actions-section h2 { color: #1e293b; margin-bottom: 1.5rem; }
        .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
        .action-card { background: #f8fafc; padding: 1.5rem; border-radius: 12px; text-decoration: none; color: inherit; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; transition: all 0.2s ease; cursor: pointer; border: none; width: 100%; font-size: 1rem; }
        .action-card:hover { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; transform: translateY(-4px); }
        .action-icon { font-size: 2rem; }
        .action-text { font-size: 0.875rem; font-weight: 600; text-align: center; }
        .hero-section { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 20px; padding: 3rem 2rem; margin-bottom: 2rem; color: white; text-align: center; position: relative; overflow: hidden; }
        .hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
        .hero-title { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-subtitle { font-size: 1.25rem; opacity: 0.9; margin-bottom: 2rem; }
        .hero-search { position: relative; max-width: 500px; margin: 0 auto; }
        .search-input { width: 100%; padding: 1rem 1.5rem 1rem 3rem; border: none; border-radius: 50px; font-size: 1rem; background: rgba(255,255,255,0.9); box-shadow: 0 10px 40px rgba(0,0,0,0.1); transition: all 0.3s ease; }
        .search-input:focus { outline: none; background: white; }
        .search-icon { position: absolute; left: 1.5rem; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; }
        .hero-stats { display: flex; justify-content: center; gap: 3rem; margin-top: 2rem; position: relative; z-index: 1; }
        .stat { display: flex; flex-direction: column; align-items: center; }
        .stat-number { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.25rem; }
        .controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .sort-control { display: flex; align-items: center; gap: 0.75rem; }
        .sort-control label { font-weight: 600; color: #475569; }
        .sort-select { padding: 0.5rem 2rem 0.5rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; background: white; font-size: 0.875rem; cursor: pointer; appearance: none; }
        .sort-select:focus { outline: none; border-color: #3b82f6; }
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
        .buy-now-button { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; flex: 1; justify-content: center; text-decoration: none; }
        .buy-now-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .add-to-cart-button:disabled, .buy-now-button:disabled { background: #94a3b8; cursor: not-allowed; opacity: 0.7; }
        .remove-from-cart-btn { background: #fee2e2; color: #dc2626; border: none; padding: 0.5rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
        .remove-from-cart-btn:hover { background: #fecaca; }
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: white; border-radius: 16px; border: 2px dashed #e2e8f0; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
        .cart-summary-banner { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px; padding: 1.5rem 2rem; color: white; margin-top: 2rem; }
        .cart-summary-banner .banner-content { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
        .cart-summary-text h3 { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.25rem; }
        .cart-summary-text p { opacity: 0.9; }
        .cart-total-summary { font-size: 1.2rem; }
        .checkout-now-btn { background: white; color: #d97706; border: none; padding: 1rem 2rem; border-radius: 50px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.3s ease; white-space: nowrap; }
        .checkout-now-btn:hover { transform: translateY(-2px); }
        .featured-banner { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 16px; padding: 2rem; color: white; text-align: center; position: relative; overflow: hidden; margin-top: 2rem; }
        .featured-banner .banner-content { position: relative; z-index: 1; }
        .featured-banner h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .featured-banner p { opacity: 0.9; margin-bottom: 1.5rem; }
        .featured-buttons { display: flex; gap: 1rem; justify-content: center; }
        .featured-add-to-cart { background: #f59e0b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 50px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
        .featured-add-to-cart:hover { background: #d97706; transform: translateY(-2px); }
        .featured-button { background: white; color: #7c3aed; border: none; padding: 0.75rem 2rem; border-radius: 50px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
        .featured-button:hover { transform: translateY(-2px); }
        .orders-list-full { display: grid; gap: 1rem; }
        .order-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .order-id { font-weight: 700; color: #1e293b; margin-right: 1rem; }
        .order-date { color: #64748b; font-size: 0.875rem; }
        .order-status { padding: 0.25rem 1rem; border-radius: 50px; font-size: 0.875rem; font-weight: 600; }
        .order-body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .order-products { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .product-tag { background: #f1f5f9; padding: 0.25rem 0.75rem; border-radius: 50px; font-size: 0.875rem; color: #475569; }
        .order-total { font-size: 1.1rem; }
        .order-total strong { color: #059669; margin-left: 0.5rem; }
        .order-footer { display: flex; gap: 1rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
        .order-action { padding: 0.5rem 1rem; background: #f1f5f9; border: none; border-radius: 6px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s ease; }
        .order-action:hover { background: #3b82f6; color: white; }
        .order-action.review { background: #f59e0b; color: white; }
        .view-all-orders { display: inline-block; margin-top: 1rem; color: #3b82f6; text-decoration: none; font-weight: 600; }
        .activity-timeline { background: white; border-radius: 16px; padding: 1.5rem; }
        .activity-item { display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #e2e8f0; }
        .activity-item:last-child { border-bottom: none; }
        .activity-icon { width: 40px; height: 40px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
        .activity-content { flex: 1; }
        .activity-content p { margin-bottom: 0.25rem; color: #1e293b; }
        .activity-time { font-size: 0.875rem; color: #64748b; }
        .account-info-section { padding: 2rem; background: rgba(255,255,255,0.9); margin-top: 2rem; }
        .account-info-section h2 { color: #1e293b; margin-bottom: 1.5rem; }
        .info-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
        .info-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .info-card h3 { color: #1e293b; margin-bottom: 1rem; font-size: 1.1rem; }
        .info-content p { margin-bottom: 0.5rem; color: #64748b; }
        .info-content p span { font-weight: 600; color: #1e293b; }
        .edit-info-btn { margin-top: 1rem; padding: 0.5rem 1rem; background: #f1f5f9; border: none; border-radius: 6px; color: #3b82f6; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .edit-info-btn:hover { background: #3b82f6; color: white; }
        .notification { position: fixed; top: 2rem; right: 2rem; padding: 1rem 2rem; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); font-weight: 600; z-index: 2000; opacity: 0; transform: translateX(100%); transition: all 0.3s ease; }
        .notification.show { opacity: 1; transform: translateX(0); }
        .notification.success { border-left: 4px solid #10b981; color: #059669; }
        .notification.info { border-left: 4px solid #3b82f6; color: #2563eb; }
        .dashboard-loading { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; }
        .loading-spinner { width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .cart-indicator-content { flex-wrap: wrap; flex-direction: column; align-items: stretch; }
          .cart-info { flex-direction: column; align-items: center; }
          .cart-actions { justify-content: center; }
          .dashboard-nav { flex-direction: column; gap: 1rem; padding: 1rem; }
          .nav-links { width: 100%; justify-content: center; flex-wrap: wrap; }
          .welcome-banner { margin: 1rem; padding: 1.5rem; flex-direction: column; text-align: center; }
          .banner-stats { width: 100%; justify-content: center; }
          .dashboard-tabs { flex-wrap: wrap; justify-content: center; }
          .stats-grid { grid-template-columns: 1fr; }
          .hero-title { font-size: 2rem; }
          .hero-stats { flex-direction: column; gap: 1.5rem; }
          .controls { flex-direction: column; gap: 1rem; }
          .product-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
          .button-group { flex-direction: column; }
          .cart-summary-banner .banner-content { flex-direction: column; text-align: center; }
          .order-header, .order-body, .order-footer { flex-direction: column; }
          .info-cards { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .product-grid { grid-template-columns: 1fr; }
          .actions-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
