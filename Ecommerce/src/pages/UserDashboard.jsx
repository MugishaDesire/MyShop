import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";

const CATEGORIES = ["All", "Electronics", "Fashion", "Food", "Art", "Beauty"];

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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [imageZoom, setImageZoom] = useState(false);
  const [wishlist, setWishlist] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  // ── Enrich orders ─────────────────────────────────────────────────────────
  const enrichedOrders = useMemo(() => orders.map((order) => {
    const product = products.find((p) => p.id === order.product_id);
    const productPrice = product ? parseFloat(product.price) : 0;
    const quantity = parseInt(order.qty) || 1;
    return { ...order, productName: product ? product.name : `Product #${order.product_id}`, productPrice, total: productPrice * quantity };
  }), [orders, products]);

  const groupedOrders = useMemo(() => {
    const groups = {};
    enrichedOrders.forEach((order) => {
      const orderTime = new Date(order.created_at || order.date || Date.now());
      const timeKey = Math.floor(orderTime.getTime() / (60 * 1000));
      const groupKey = `${order.cust_phone}_${order.location}_${timeKey}`;
      if (!groups[groupKey]) {
        groups[groupKey] = { id: order.id, cust_name: order.cust_name, cust_phone: order.cust_phone, cust_email: order.cust_email, location: order.location, status: order.status, created_at: order.created_at || order.date, items: [], orderIds: [] };
      }
      groups[groupKey].items.push({ id: order.id, productName: order.productName, qty: order.qty, price: order.productPrice, subtotal: order.total });
      groups[groupKey].orderIds.push(order.id);
      const priority = { Delivered: 3, Paid: 2, Pending: 1 };
      if ((priority[order.status] || 0) > (priority[groups[groupKey].status] || 0)) groups[groupKey].status = order.status;
    });
    return Object.values(groups).map((g) => ({ ...g, totalAmount: g.items.reduce((s, i) => s + i.subtotal, 0), totalItems: g.items.reduce((s, i) => s + parseInt(i.qty), 0) }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [enrichedOrders]);

  const stats = useMemo(() => {
    const totalSpent = groupedOrders.reduce((s, o) => s + o.totalAmount, 0);
    const pendingOrders = groupedOrders.filter((o) => o.status !== "Delivered" && o.status !== "Paid").length;
    const totalItems = groupedOrders.reduce((s, o) => s + o.totalItems, 0);
    return { totalOrders: groupedOrders.length, totalSpent, pendingOrders, totalItems };
  }, [groupedOrders]);

 // ── Single consolidated redirect handler ──────────────────────────────────
useEffect(() => {
  if (loading) return;

  // 1. Google OAuth callback — reads appState from URL
  const params = new URLSearchParams(window.location.search);
  const appState = params.get("appState");

  if (appState) {
    window.history.replaceState({}, "", "/userdashboard");
    localStorage.removeItem("redirectAfterLogin");

    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
    })();

    if (appState === "checkout") {
      const savedCart = (() => {
        try { return JSON.parse(localStorage.getItem("shoppingCart") || "[]"); } catch { return []; }
      })();
      if (savedCart.length > 0) {
        navigate("/checkout", { state: { cart: savedCart, user: currentUser }, replace: true });
        return;
      }
    } else if (appState.startsWith("order/")) {
      const product = (() => {
        try {
          const raw = localStorage.getItem("buyNowProduct");
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();
      if (product) {
        localStorage.removeItem("buyNowProduct");
        navigate(`/${appState}`, { state: { product, user: currentUser }, replace: true });
        return;
      }
    }
  }

  // 2. location.state pendingRedirect (normal email/password login)
  const state = location.state || {};
  const { pendingRedirect, pendingCart, pendingProduct, loggedInUser } = state;
  if (!pendingRedirect) return;

  window.history.replaceState({}, document.title);
  const currentUser = loggedInUser || (() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  })();

  if (pendingRedirect === "checkout") {
    const cartToUse = pendingCart?.length > 0
      ? pendingCart
      : (() => { try { return JSON.parse(localStorage.getItem("shoppingCart") || "[]"); } catch { return []; } })();
    if (cartToUse.length > 0) {
      navigate("/checkout", { state: { cart: cartToUse, user: currentUser }, replace: true });
    }
  } else if (pendingRedirect.startsWith("order/") && pendingProduct) {
    navigate(`/${pendingRedirect}`, { state: { product: pendingProduct, user: currentUser }, replace: true });
  }
}, [loading]); // fires once when loading flips false

  // ── Cart persistence ──────────────────────────────────────────────────────
  useEffect(() => {
    try { const saved = localStorage.getItem("shoppingCart"); if (saved) setCart(JSON.parse(saved)); } catch (e) {}
    const wl = localStorage.getItem("wishlist"); if (wl) try { setWishlist(JSON.parse(wl)); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("shoppingCart", JSON.stringify(cart)); }, [cart]);

  // ── Load user + data ──────────────────────────────────────────────────────
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData || userData === "undefined" || userData === "null") { localStorage.removeItem("user"); navigate("/ulogin"); return; }
    let parsedUser;
    try { parsedUser = JSON.parse(userData); if (!parsedUser || typeof parsedUser !== "object") throw new Error(); setUser(parsedUser); }
    catch (e) { localStorage.removeItem("user"); navigate("/ulogin"); return; }

    const fetchData = async () => {
      try {
        const [productsRes, ordersRes] = await Promise.all([axios.get("http://localhost:5000/products"), axios.get("http://localhost:5000/orders")]);
        setProducts(productsRes.data);
        const userPhone = parsedUser.phonenumber || parsedUser.phone || "";
        const userEmail = parsedUser.email || "";
        setOrders(ordersRes.data.filter((o) => (userPhone && o.cust_phone === userPhone) || (userEmail && o.cust_email === userEmail)));
      } catch (err) { setError("Failed to load some data. Please refresh."); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [navigate]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addToCart = (product) => {
    const item = { ...product, price: parseFloat(product.price) || 0, quantity: 1 };
    setCart((prev) => { const ex = prev.find((i) => i.id === product.id); return ex ? prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, item]; });
    notify(`✅ ${product.name} added to cart!`);
  };
  const removeFromCart = (id) => { setCart((prev) => prev.filter((i) => i.id !== id)); notify("Item removed", "info"); };
  const clearCart = () => { if (window.confirm("Clear your cart?")) { setCart([]); localStorage.removeItem("shoppingCart"); } };

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.some((w) => w.id === product.id);
      const updated = exists ? prev.filter((w) => w.id !== product.id) : [...prev, product];
      localStorage.setItem("wishlist", JSON.stringify(updated));
      return updated;
    });
  };

  const openModal = (product) => { setSelectedProduct(product); document.body.style.overflow = "hidden"; };
  const closeModal = () => { setSelectedProduct(null); setImageZoom(false); document.body.style.overflow = "unset"; };

  const notify = (message, type = "success") => {
    const el = document.createElement("div");
    el.className = `ud-notif ${type}`; el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("show"), 100);
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => document.body.removeChild(el), 300); }, 3000);
  };

  const handleLogout = () => { localStorage.removeItem("user"); window.location.href = "/ulogin"; };
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

  const getUserInitials = () => {
    if (!user) return "U";
    return (user.fullname || user.name || user.email || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const filteredProducts = products
    .filter((p) => {
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === "All" || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const price = parseFloat(p.price) || 0;
      return matchSearch && matchCat && price >= priceRange[0] && price <= priceRange[1];
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":  return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "name":       return a.name?.localeCompare(b.name);
        case "stock":      return b.stock - a.stock;
        default:           return 0;
      }
    });

  if (loading) return (
    <div className="ud-loading">
      <div className="ud-spinner" />
      <p>Loading your dashboard...</p>
    </div>
  );

  return (
    <>
      <div className="ud-root">

        {/* ── CART BAR ── */}
        {totalItemsInCart > 0 && (
          <div className="ud-cart-bar">
            <div className="ud-cart-inner">
              <div className="ud-cb-user">
                <div className="ud-cb-avatar">{getUserInitials()}</div>
                <span>{user?.fullname || user?.name || user?.email}</span>
              </div>
              <div className="ud-cb-info">
                <span>🛒</span>
                <span className="ud-cb-count">{totalItemsInCart} item{totalItemsInCart !== 1 ? "s" : ""}</span>
                <span className="ud-cb-total">Total: <strong>${cartTotal}</strong></span>
              </div>
              <div className="ud-cb-actions">
                <button className="ud-cb-checkout" onClick={() => navigate("/checkout", { state: { cart, user } })}>Checkout Now</button>
                <button className="ud-cb-clear" onClick={clearCart}>Clear</button>
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD NAV ── */}
        <nav className="ud-nav">
          <div className="ud-nav-left">
            <Link to="/" className="ud-logo">🛍️ <span>MyShop</span></Link>
            <div className="ud-nav-links">
              <Link to="/userdashboard" className="ud-nav-link active">Dashboard</Link>
              <Link to="/myorders" className="ud-nav-link">My Orders</Link>
            </div>
          </div>
          <div className="ud-nav-right">
            <div className="ud-user-drop">
              <div className="ud-user-trigger">
                <span className="ud-greet">Hello, {user?.fullname?.split(" ")[0] || user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "User"}</span>
                <div className="ud-avatar">{getUserInitials()}</div>
              </div>
              <div className="ud-dropdown">
                <Link to="/profile" className="ud-drop-item">⚙️ Profile Settings</Link>
                <Link to="/wishlist" className="ud-drop-item">❤️ Wishlist</Link>
                <div className="ud-drop-divider" />
                <button onClick={handleLogout} className="ud-drop-item logout">🚪 Sign Out</button>
              </div>
            </div>
          </div>
        </nav>

        {/* ── WELCOME BANNER ── */}
        <div className="ud-welcome">
          <div className="ud-welcome-text">
            <h1>Welcome back, {user?.fullname || user?.name || user?.email?.split("@")[0] || "Valued Customer"}! 👋</h1>
            <p>Track your orders, manage your account, and discover new products</p>
          </div>
          <div className="ud-welcome-stats">
            {[
              { val: stats.totalOrders,              label: "Total Orders" },
              { val: `$${stats.totalSpent.toFixed()}`, label: "Total Spent" },
              { val: stats.pendingOrders,             label: "Pending" },
            ].map((s, i) => (
              <div key={i} className="ud-wstat">
                <span className="ud-wstat-val">{s.val}</span>
                <span className="ud-wstat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="ud-tabs">
          {[
            { key: "overview",   label: "Overview" },
            { key: "shop",       label: "Shop Products" },
            { key: "my-orders",  label: `My Orders (${groupedOrders.length})` },
            { key: "activity",   label: "Activity" },
          ].map((t) => (
            <button key={t.key} className={`ud-tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="ud-tab-content">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="ud-stats-grid">
                {[
                  { icon: "📦", value: stats.totalOrders,                 label: "Total Orders" },
                  { icon: "💰", value: `$${stats.totalSpent.toFixed(


                  )}`, label: "Total Spent" },
                  { icon: "⏳", value: stats.pendingOrders,               label: "Pending Orders" },
                  { icon: "📊", value: stats.totalItems,                  label: "Items Purchased" },
                ].map((s, i) => (
                  <div key={i} className="ud-stat-card">
                    <div className="ud-stat-icon">{s.icon}</div>
                    <div><div className="ud-stat-val">{s.value}</div><div className="ud-stat-lbl">{s.label}</div></div>
                  </div>
                ))}
              </div>

              <div className="ud-quick-section">
                <h2>Quick Actions</h2>
                <div className="ud-quick-grid">
                  {[
                    { icon: "🛒", label: "Continue Shopping", action: () => setActiveTab("shop") },
                    { icon: "📋", label: "Track Orders",      action: () => setActiveTab("my-orders") },
                  ].map((a, i) => (
                    <button key={i} className="ud-action-card" onClick={a.action}>
                      <span className="ud-action-icon">{a.icon}</span>
                      <span>{a.label}</span>
                    </button>
                  ))}
                  <Link to="/wishlist" className="ud-action-card"><span className="ud-action-icon">❤️</span><span>Wishlist</span></Link>
                  <Link to="/profile" className="ud-action-card"><span className="ud-action-icon">⚙️</span><span>Settings</span></Link>
                </div>
              </div>

              {groupedOrders.length > 0 && (
                <div className="ud-recent-orders">
                  <div className="ud-ro-header">
                    <h2>Recent Orders</h2>
                    <button className="ud-view-all" onClick={() => setActiveTab("my-orders")}>View All →</button>
                  </div>
                  {groupedOrders.slice(0, 3).map((o) => {
                    const c = getStatusColor(o.status);
                    return (
                      <div key={o.id} className="ud-mini-order">
                        <div>
                          <div className="ud-mo-date">{o.created_at ? new Date(o.created_at).toLocaleDateString() : "N/A"}</div>
                          <div className="ud-mo-items">{o.items.map((i) => i.productName).join(", ")}</div>
                        </div>
                        <div className="ud-mo-right">
                          <span className="ud-mo-total">${o.totalAmount.toFixed(2)}</span>
                          <span className="ud-mo-status" style={{ background: c.bg, color: c.text }}>{o.status || "Pending"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SHOP TAB — matches Home page layout ── */}
          {activeTab === "shop" && (
            <div className="ud-shop-wrap">

              {/* Search Bar */}
              <div className="ud-search-bar">
                <button className="ud-filter-toggle" onClick={() => setSidebarOpen((o) => !o)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="18" x2="12" y2="18"/>
                  </svg>
                  Filters
                </button>
                <div className="ud-search-box">
                  <svg className="ud-search-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search products, brands, categories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ud-search-input"
                  />
                  {search && <button className="ud-search-clear" onClick={() => setSearch("")}>✕</button>}
                </div>
                <span className="ud-search-meta">{filteredProducts.length} of {products.length} products</span>
              </div>

              {/* Sidebar + Grid */}
              <div className="ud-shop-body">

                {/* SIDEBAR */}
                <aside className={`ud-sidebar ${sidebarOpen ? "open" : "closed"}`}>
                  <div className="ud-sidebar-card">

                    {/* Categories */}
                    <div className="ud-filter-section">
                      <h3 className="ud-filter-title">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        Categories
                      </h3>
                      <div className="ud-cat-list">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            className={`ud-cat-btn ${selectedCategory === cat ? "active" : ""}`}
                            onClick={() => setSelectedCategory(cat)}
                          >
                            <span>
                              {cat === "All" && "🏷️ "}
                              {cat === "Electronics" && "⚡ "}
                              {cat === "Fashion" && "👗 "}
                              {cat === "Food" && "🍽️ "}
                              {cat === "Art" && "🎨 "}
                              {cat === "Beauty" && "💄 "}
                              {cat}
                            </span>
                            <span className="ud-cat-count">
                              {cat === "All" ? products.length : products.filter((p) => p.category?.toLowerCase() === cat.toLowerCase()).length}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="ud-filter-divider" />

                    {/* Price Range */}
                    <div className="ud-filter-section">
                      <h3 className="ud-filter-title">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        Price Range
                      </h3>
                      <div className="ud-price-display">
                        <span className="ud-price-val">${priceRange[0].toLocaleString()}</span>
                        <span className="ud-price-sep">—</span>
                        <span className="ud-price-val">${priceRange[1].toLocaleString()}</span>
                      </div>
                      <div className="ud-range-wrap">
                        <input type="range" min={0} max={5000} step={50} value={priceRange[0]}
                          onChange={(e) => setPriceRange([Math.min(Number(e.target.value), priceRange[1] - 50), priceRange[1]])}
                          className="ud-range ud-range-min" />
                        <input type="range" min={0} max={5000} step={50} value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0] + 50)])}
                          className="ud-range ud-range-max" />
                      </div>
                      {/* <div className="ud-price-ticks">
                        <span>$0</span><span>$1,250</span><span>$2,500</span><span>$3,750</span><span>$5,000</span>
                      </div> */}
                      <button className="ud-price-reset" onClick={() => setPriceRange([0, 5000])}>Reset Price</button>
                    </div>

                    <div className="ud-filter-divider" />

                    {/* Sort By */}
                    <div className="ud-filter-section">
                      <h3 className="ud-filter-title">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M3 6h18M6 12h12M10 18h4"/>
                        </svg>
                        Sort By
                      </h3>
                      <select className="ud-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="default">Featured</option>
                        <option value="price-low">Price: Low → High</option>
                        <option value="price-high">Price: High → Low</option>
                        <option value="name">Name: A → Z</option>
                        <option value="stock">Most in Stock</option>
                      </select>
                    </div>

                    {(selectedCategory !== "All" || priceRange[0] > 0 || priceRange[1] < 5000 || search) && (
                      <>
                        <div className="ud-filter-divider" />
                        <button className="ud-clear-all" onClick={() => { setSelectedCategory("All"); setPriceRange([0, 5000]); setSearch(""); setSortBy("default"); }}>
                          ✕ Clear All Filters
                        </button>
                      </>
                    )}
                  </div>
                </aside>

                {/* PRODUCT GRID */}
                <main className="ud-shop-main">
                  {error && <div className="ud-error">⚠️ {error}</div>}

                  {loading ? (
                    <div className="ud-grid-loading"><div className="ud-spinner" /><p>Loading products...</p></div>
                  ) : (
                    <div className="ud-product-grid">
                      {filteredProducts.length === 0 ? (
                        <div className="ud-empty">
                          <div className="ud-empty-icon">📦</div>
                          <h3>No products found</h3>
                          <p>{search ? `No results for "${search}"` : "Try adjusting your filters."}</p>
                          <button className="ud-empty-reset" onClick={() => { setSearch(""); setSelectedCategory("All"); setPriceRange([0, 5000]); }}>Clear Filters</button>
                        </div>
                      ) : (
                        filteredProducts.map((p) => {
                          const cartItem = cart.find((i) => i.id === p.id);
                          const isInCart = !!cartItem;
                          const cartQty = cartItem?.quantity || 0;
                          const wishlisted = wishlist.some((w) => w.id === p.id);

                          return (
                            <div key={p.id} className="ud-product-card">
                              <div className="ud-product-img-wrap" onClick={() => openModal(p)}>
                                <img
                                  src={p.image ? `http://localhost:5000/uploads/${p.image}` : "https://placehold.co/300x200/3b82f6/white?text=No+Image"}
                                  alt={p.name || "Product"}
                                  className="ud-product-img"
                                  onError={(e) => { e.target.src = "https://placehold.co/300x200/3b82f6/white?text=No+Image"; e.target.onerror = null; }}
                                />
                                {p.stock <= 0 ? <span className="ud-badge oos">Out of Stock</span>
                                  : p.stock < 10 ? <span className="ud-badge low-s">Low Stock</span>
                                  : null}
                                {isInCart && <span className="ud-badge in-c">In Cart: {cartQty}</span>}
                                <button
                                  className={`ud-heart ${wishlisted ? "hearted" : ""}`}
                                  onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
                                  title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                                >
                                  {wishlisted ? "❤️" : "🤍"}
                                </button>
                                <div className="ud-img-overlay">View Details</div>
                              </div>

                              <div className="ud-product-body">
                                <div className="ud-product-top">
                                  <h3 className="ud-product-name">{p.name || "Unnamed Product"}</h3>
                                  <span className="ud-price-tag">${parseFloat(p.price || 0).toFixed(2)}</span>
                                </div>
                                {p.description && (
                                  <p className="ud-product-desc">
                                    {p.description.length > 90 ? `${p.description.substring(0, 90)}...` : p.description}
                                  </p>
                                )}
                                <div className="ud-product-footer">
                                  <span className={`ud-stock-badge ${p.stock <= 0 ? "out" : p.stock < 10 ? "low" : "ok"}`}>
                                    {p.stock <= 0 ? "Out of stock" : `${p.stock} units`}
                                  </span>
                                  <div className="ud-btn-row">
                                    <button className="ud-btn-cart" onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                                      {isInCart ? `➕ Add More (${cartQty})` : "🛒 Add to Cart"}
                                    </button>
                                    <Link to={`/order/${p.id}`} state={{ product: p, user }}>
                                      <button className="ud-btn-buy" disabled={p.stock <= 0}>
                                        {p.stock <= 0 ? "Unavailable" : "⚡ Buy Now"}
                                      </button>
                                    </Link>
                                  </div>
                                  {isInCart && (
                                    <button className="ud-btn-remove" onClick={() => removeFromCart(p.id)}>Remove from Cart</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {cart.length > 0 && (
                    <div className="ud-cart-banner">
                      <div>
                        <h3>🛒 Ready to Checkout?</h3>
                        <p>You have {totalItemsInCart} item{totalItemsInCart !== 1 ? "s" : ""} · Total: <strong>${cartTotal}</strong></p>
                      </div>
                      <button className="ud-cart-banner-btn" onClick={() => navigate("/checkout", { state: { cart, user } })}>
                        Proceed to Checkout →
                      </button>
                    </div>
                  )}
                </main>
              </div>
            </div>
          )}

          {/* MY ORDERS */}
          {activeTab === "my-orders" && (
            <div>
              <h2 className="ud-section-title">All Orders</h2>
              {groupedOrders.length === 0 ? (
                <div className="ud-empty-orders">
                  <span style={{ fontSize: "4rem" }}>📋</span>
                  <h3>No orders yet</h3>
                  <p>Your order history will appear here once you place an order.</p>
                  <button className="ud-shop-now-btn" onClick={() => setActiveTab("shop")}>Start Shopping →</button>
                </div>
              ) : (
                <div className="ud-orders-list">
                  {groupedOrders.map((orderGroup) => {
                    const c = getStatusColor(orderGroup.status);
                    return (
                      <div key={orderGroup.id} className="ud-order-card">
                        <div className="ud-order-header">
                          <div>
                            <span className="ud-order-id">Order #{orderGroup.id}</span>
                            <span className="ud-order-date">
                              {orderGroup.created_at ? new Date(orderGroup.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                            </span>
                          </div>
                          <span className="ud-order-status" style={{ background: c.bg, color: c.text }}>{orderGroup.status || "Pending"}</span>
                        </div>
                        <div className="ud-order-items">
                          {orderGroup.items.map((item) => (
                            <div key={item.id} className="ud-order-item">
                              <div><div className="ud-oi-name">{item.productName}</div><div className="ud-oi-qty">Qty: {item.qty}</div></div>
                              <div className="ud-oi-right">
                                <span className="ud-oi-unit">${item.price.toFixed(2)} each</span>
                                <span className="ud-oi-sub">${item.subtotal.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="ud-order-footer">
                          <span className="ud-order-loc">📍 {orderGroup.location || "N/A"}</span>
                          <span className="ud-order-total">Total: <strong>${orderGroup.totalAmount.toFixed(2)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY */}
          {activeTab === "activity" && (
            <div>
              <h2 className="ud-section-title">Recent Activity</h2>
              <div className="ud-activity-list">
                {groupedOrders.length === 0 ? (
                  <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>No activity yet.</p>
                ) : (
                  groupedOrders.slice(0, 5).map((order, i) => (
                    <div key={i} className="ud-activity-item">
                      <div className="ud-activity-icon">{order.status === "Delivered" ? "✅" : order.status === "Paid" ? "💳" : "⏳"}</div>
                      <div className="ud-activity-text">
                        <p>Order of <strong>{order.items.map((i) => i.productName).join(", ")}</strong> — {order.status || "Pending"}</p>
                        <span>{order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ACCOUNT INFO */}
        <div className="ud-account-section">
          <h2 className="ud-section-title">Account Information</h2>
          <div className="ud-info-cards">
            {[
              {
                title: "Personal Details",
                content: (
                  <>
                    <p><span>Name:</span> {user?.fullname || user?.name || "N/A"}</p>
                    <p><span>Email:</span> {user?.email || "N/A"}</p>
                    <p><span>Phone:</span> {user?.phonenumber || user?.phone || "N/A"}</p>
                    <Link to="/profile"><button className="ud-edit-btn">Edit</button></Link>
                  </>
                ),
              },
              {
                title: "Shipping Address",
                content: (
                  <>
                    <p>{user?.address || "123 Main Street"}</p>
                    <p>{user?.city || "New York, NY 10001"}</p>
                    <p>{user?.country || "United States"}</p>
                    <Link to="/profile"><button className="ud-edit-btn">Edit</button></Link>
                  </>
                ),
              },
              {
                title: "Payment Methods",
                content: (
                  <>
                    <p>💳 Visa ending in 4242</p>
                    <p>💳 Mastercard ending in 5555</p>
                    <button className="ud-edit-btn">Manage</button>
                  </>
                ),
              },
            ].map((card, i) => (
              <div key={i} className="ud-info-card">
                <h3>{card.title}</h3>
                <div className="ud-info-content">{card.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCT MODAL */}
      {selectedProduct && (
        <div className="ud-modal-overlay" onClick={closeModal}>
          <div className="ud-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ud-modal-close" onClick={closeModal}>✕</button>
            <div className="ud-modal-body">
              <div>
                <div className={`ud-modal-img-wrap ${imageZoom ? "zoomed" : ""}`} onClick={() => setImageZoom(!imageZoom)}>
                  <img
                    src={selectedProduct.image ? `http://localhost:5000/uploads/${selectedProduct.image}` : "https://placehold.co/600x500/3b82f6/white?text=No+Image"}
                    alt={selectedProduct.name}
                    className="ud-modal-img"
                    onError={(e) => { e.target.src = "https://placehold.co/600x500/3b82f6/white?text=No+Image"; e.target.onerror = null; }}
                  />
                  <div className="ud-zoom-hint">{imageZoom ? "🔍 Click to zoom out" : "🔍 Click to zoom in"}</div>
                </div>
                <div className={`ud-modal-stock ${selectedProduct.stock <= 0 ? "out" : selectedProduct.stock < 10 ? "low" : "in"}`}>
                  {selectedProduct.stock <= 0 ? "Out of Stock" : selectedProduct.stock < 10 ? `Only ${selectedProduct.stock} left` : `${selectedProduct.stock} in stock`}
                </div>
              </div>
              <div className="ud-modal-details">
                <h2>{selectedProduct.name}</h2>
                <div className="ud-modal-price-row">
                  <span className="ud-modal-price">${parseFloat(selectedProduct.price || 0).toFixed(2)}</span>
                  <button
                    className={`ud-modal-wish ${wishlist.some((w) => w.id === selectedProduct.id) ? "active" : ""}`}
                    onClick={() => toggleWishlist(selectedProduct)}
                  >
                    {wishlist.some((w) => w.id === selectedProduct.id) ? "❤️ Wishlisted" : "🤍 Wishlist"}
                  </button>
                </div>
                <div className="ud-modal-desc">
                  <h4>Description</h4>
                  <p>{selectedProduct.description || "No description available."}</p>
                </div>
                <div className="ud-modal-info-grid">
                  {[
                    { label: "Product ID", value: `#${selectedProduct.id}` },
                    { label: "Category",   value: selectedProduct.category || "General" },
                    { label: "Availability", value: selectedProduct.stock > 0 ? "In Stock" : "Out of Stock", cls: selectedProduct.stock > 0 ? "avail" : "unavail" },
                    { label: "Stock", value: `${selectedProduct.stock} units` },
                  ].map((item, i) => (
                    <div key={i} className="ud-minfo-item">
                      <span className="ud-minfo-label">{item.label}</span>
                      <span className={`ud-minfo-val ${item.cls || ""}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="ud-modal-actions">
                  <button className="ud-modal-btn-cart" onClick={() => { addToCart(selectedProduct); closeModal(); }} disabled={selectedProduct.stock <= 0}>🛒 Add to Cart</button>
                  <Link to={`/order/${selectedProduct.id}`} state={{ product: selectedProduct, user }}>
                    <button className="ud-modal-btn-buy" disabled={selectedProduct.stock <= 0} onClick={closeModal}>⚡ Buy Now</button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        
        *, *::before, *::after { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        :root {
          --brand: #0f172a; 
          --brand-2: #1e293b; 
          --accent: #f97316; 
          --accent-light: #fb923c;
          --accent-dark: #ea580c;
          --green: #10b981;
          --green-dark: #059669;
          --blue: #3b82f6; 
          --blue-dark: #2563eb;
          --red: #ef4444; 
          --red-dark: #dc2626;
          --gold: #f59e0b;
          --bg: #f8fafc; 
          --card: #fff; 
          --text: #1e293b; 
          --text-light: #475569;
          --text-muted: #64748b; 
          --border: #e2e8f0; 
          --border-light: #f1f5f9;
          --radius-sm: 8px;
          --radius: 12px; 
          --radius-lg: 16px;
          --sidebar-w: 260px;
          --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
          --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
          --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
          --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ROOT */
        .ud-root { 
          min-height: 100vh; 
          background: var(--bg); 
          font-family: 'DM Sans', sans-serif; 
          padding-bottom: 3rem; 
        }

        /* LOADING */
        .ud-loading { 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          gap: 1.5rem; 
          background: linear-gradient(135deg, #181a22, #2b2c2d); 
          color: white; 
        }
        
        .ud-spinner { 
          width: 48px; 
          height: 48px; 
          border: 4px solid rgba(255,255,255,0.2); 
          border-top-color: white; 
          border-radius: 50%; 
          animation: spin 0.8s linear infinite; 
        }
        
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }

        /* CART BAR */
        .ud-cart-bar { 
          background: white; 
          border-bottom: 3px solid var(--blue); 
          box-shadow: var(--shadow-md); 
          position: sticky; 
          top: 0; 
          z-index: 900; 
        }
        
        .ud-cart-inner { 
          max-width: 1400px; 
          margin: 0 auto; 
          padding: 12px 24px; 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          gap: 16px; 
        }
        
        .ud-cb-user { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-weight: 600; 
          color: var(--text); 
        }
        
        .ud-cb-avatar { 
          width: 30px; 
          height: 30px; 
          background: var(--blue); 
          color: white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 800; 
          font-size: 0.75rem; 
        }
        
        .ud-cb-info { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          flex: 1; 
          justify-content: center; 
        }
        
        .ud-cb-count { 
          font-weight: 600; 
        }
        
        .ud-cb-total { 
          color: var(--green); 
          font-weight: 600; 
        }
        
        .ud-cb-actions { 
          display: flex; 
          gap: 8px; 
        }
        
        .ud-cb-checkout { 
          background: var(--blue); 
          color: white; 
          border: none; 
          padding: 8px 18px; 
          border-radius: var(--radius-sm); 
          font-weight: 600; 
          cursor: pointer; 
          transition: var(--transition); 
          font-family: 'DM Sans', sans-serif; 
        }
        
        .ud-cb-checkout:hover { 
          background: var(--blue-dark); 
          transform: translateY(-1px); 
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }
        
        .ud-cb-clear { 
          background: #fee2e2; 
          color: var(--red); 
          border: none; 
          padding: 8px 16px; 
          border-radius: var(--radius-sm); 
          font-weight: 600; 
          cursor: pointer; 
          font-family: 'DM Sans', sans-serif; 
          transition: var(--transition);
        }
        
        .ud-cb-clear:hover {
          background: #fecaca;
          color: var(--red-dark);
        }

        /* NAV */
        .ud-nav { 
          background: rgba(255,255,255,0.98); 
          backdrop-filter: blur(10px); 
          padding: 14px 24px; 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          box-shadow: var(--shadow-sm); 
          position: sticky; 
          top: 0; 
          z-index: 800; 
        }
        
        .ud-nav-left { 
          display: flex; 
          align-items: center; 
          gap: 32px; 
        }
        
        .ud-logo { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          text-decoration: none; 
          font-family: 'Syne', sans-serif; 
          font-size: 1.5rem; 
          font-weight: 800; 
          color: var(--brand); 
        }
        
        .ud-logo span { 
          background: linear-gradient(135deg, #1e40af, #3b82f6); 
          -webkit-background-clip: text; 
          -webkit-text-fill-color: transparent; 
        }
        
        .ud-nav-links { 
          display: flex; 
          gap: 8px; 
        }
        
        .ud-nav-link { 
          text-decoration: none; 
          color: var(--text-muted); 
          font-weight: 600; 
          padding: 8px 18px; 
          border-radius: var(--radius-sm); 
          transition: var(--transition); 
          font-size: 0.95rem; 
        }
        
        .ud-nav-link:hover { 
          color: var(--blue); 
          background: #eff6ff; 
        }
        
        .ud-nav-link.active { 
          background: var(--blue); 
          color: white; 
        }
        
        .ud-nav-right { 
          position: relative; 
        }
        
        .ud-user-drop { 
          position: relative; 
        }
        
        .ud-user-trigger { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          cursor: pointer; 
          padding: 6px 12px; 
          border-radius: 30px; 
          transition: var(--transition); 
        }
        
        .ud-user-trigger:hover { 
          background: var(--border-light); 
        }
        
        .ud-greet { 
          font-weight: 600; 
          color: var(--text); 
          font-size: 0.95rem; 
        }
        
        .ud-avatar { 
          width: 38px; 
          height: 38px; 
          background: linear-gradient(135deg, #1e40af, #3b82f6); 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          font-family: 'Syne', sans-serif; 
          font-weight: 800; 
          font-size: 0.85rem; 
          box-shadow: 0 2px 8px rgba(59,130,246,0.3);
        }
        
        .ud-dropdown { 
          position: absolute; 
          top: calc(100% + 10px); 
          right: 0; 
          background: white; 
          border-radius: var(--radius); 
          box-shadow: var(--shadow-lg); 
          min-width: 220px; 
          opacity: 0; 
          visibility: hidden; 
          transform: translateY(-8px); 
          transition: var(--transition); 
          z-index: 1000; 
          overflow: hidden; 
          border: 1px solid var(--border); 
        }
        
        .ud-user-drop:hover .ud-dropdown { 
          opacity: 1; 
          visibility: visible; 
          transform: translateY(0); 
        }
        
        .ud-drop-item { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          padding: 12px 18px; 
          text-decoration: none; 
          color: var(--text); 
          font-size: 0.95rem; 
          font-weight: 500; 
          transition: var(--transition); 
          background: none; 
          border: none; 
          width: 100%; 
          text-align: left; 
          cursor: pointer; 
          font-family: 'DM Sans', sans-serif; 
        }
        
        .ud-drop-item:hover { 
          background: #f8fafc; 
          color: var(--blue); 
        }
        
        .ud-drop-item.logout:hover { 
          background: #fef2f2; 
          color: var(--red); 
        }
        
        .ud-drop-divider { 
          height: 1px; 
          background: var(--border); 
          margin: 4px 0; 
        }

        /* WELCOME */
        .ud-welcome { 
          background: linear-gradient(135deg, #1d2233, #141820); 
          margin: 24px 24px 0; 
          padding: 32px 36px; 
          border-radius: var(--radius-lg); 
          color: white; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          flex-wrap: wrap; 
          gap: 24px; 
          box-shadow: var(--shadow-lg); 
        }
        
        .ud-welcome-text h1 { 
          font-family: 'Syne', sans-serif; 
          font-size: 1.8rem; 
          margin-bottom: 8px; 
        }
        
        .ud-welcome-text p { 
          opacity: 0.9; 
          font-size: 1rem; 
        }
        
        .ud-welcome-stats { 
          display: flex; 
          gap: 32px; 
        }
        
        .ud-wstat { 
          text-align: center; 
        }
        
        .ud-wstat-val { 
          display: block; 
          font-family: 'Syne', sans-serif; 
          font-size: 1.6rem; 
          font-weight: 800; 
        }
        
        .ud-wstat-label { 
          font-size: 0.8rem; 
          opacity: 0.85; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
        }

        /* TABS */
        .ud-tabs { 
          display: flex; 
          gap: 12px; 
          padding: 24px 24px 0; 
          flex-wrap: wrap; 
        }
        
        .ud-tab { 
          padding: 10px 22px; 
          background: white; 
          border: none; 
          border-radius: 30px; 
          font-family: 'DM Sans', sans-serif; 
          font-weight: 600; 
          color: var(--text-muted); 
          cursor: pointer; 
          transition: var(--transition); 
          box-shadow: var(--shadow-sm); 
          font-size: 0.95rem; 
        }
        
        .ud-tab:hover { 
          color: var(--blue); 
          transform: translateY(-1px); 
          box-shadow: var(--shadow-md);
        }
        
        .ud-tab.active { 
          background: var(--blue); 
          color: white; 
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }

        /* TAB CONTENT */
        .ud-tab-content { 
          padding: 24px; 
        }
        
        .ud-section-title { 
          font-family: 'Syne', sans-serif; 
          font-size: 1.3rem; 
          font-weight: 700; 
          color: var(--text); 
          margin-bottom: 20px; 
        }

        /* OVERVIEW */
        .ud-stats-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
          gap: 16px; 
          margin-bottom: 24px; 
        }
        
        .ud-stat-card { 
          background: var(--card); 
          padding: 22px; 
          border-radius: var(--radius); 
          display: flex; 
          align-items: center; 
          gap: 16px; 
          box-shadow: var(--shadow-sm); 
          border: 1px solid var(--border); 
          transition: var(--transition); 
        }
        
        .ud-stat-card:hover { 
          transform: translateY(-3px); 
          box-shadow: var(--shadow-md); 
          border-color: var(--blue);
        }
        
        .ud-stat-icon { 
          font-size: 2.5rem; 
        }
        
        .ud-stat-val { 
          font-family: 'Syne', sans-serif; 
          font-size: 1.8rem; 
          font-weight: 800; 
          color: var(--text); 
          line-height: 1.2; 
        }
        
        .ud-stat-lbl { 
          color: var(--text-muted); 
          font-size: 0.85rem; 
        }
        
        .ud-quick-section { 
          background: var(--card); 
          border-radius: var(--radius); 
          padding: 22px; 
          box-shadow: var(--shadow-sm); 
          border: 1px solid var(--border); 
          margin-bottom: 24px; 
        }
        
        .ud-quick-section h2 { 
          font-family: 'Syne', sans-serif; 
          font-size: 1rem; 
          font-weight: 700; 
          color: var(--text); 
          margin-bottom: 16px; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
        }
        
        .ud-quick-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
          gap: 12px; 
        }
        
        .ud-action-card { 
          background: #f8fafc; 
          padding: 22px 12px; 
          border-radius: var(--radius-sm); 
          text-decoration: none; 
          color: var(--text); 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          gap: 10px; 
          transition: var(--transition); 
          cursor: pointer; 
          border: 1.5px solid transparent; 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.9rem; 
          font-weight: 600; 
          width: 100%; 
        }
        
        .ud-action-card:hover { 
          background: var(--blue); 
          color: white; 
          transform: translateY(-3px); 
          border-color: var(--blue); 
          box-shadow: 0 6px 16px rgba(59,130,246,0.2);
        }
        
        .ud-action-icon { 
          font-size: 2rem; 
        }
        
        .ud-recent-orders { 
          background: var(--card); 
          border-radius: var(--radius); 
          padding: 22px; 
          box-shadow: var(--shadow-sm); 
          border: 1px solid var(--border); 
        }
        
        .ud-ro-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 16px; 
        }
        
        .ud-ro-header h2 { 
          font-family: 'Syne', sans-serif; 
          font-size: 1rem; 
          font-weight: 700; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          color: var(--text); 
        }
        
        .ud-view-all { 
          background: none; 
          border: none; 
          color: var(--blue); 
          font-weight: 600; 
          cursor: pointer; 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.9rem; 
          transition: var(--transition);
        }
        
        .ud-view-all:hover {
          color: var(--blue-dark);
          transform: translateX(4px);
        }
        
        .ud-mini-order { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 14px; 
          background: #f8fafc; 
          border-radius: var(--radius-sm); 
          margin-bottom: 10px; 
          border: 1px solid var(--border); 
          transition: var(--transition);
        }
        
        .ud-mini-order:hover {
          border-color: var(--blue);
          background: white;
        }
        
        .ud-mo-date { 
          font-size: 0.75rem; 
          color: var(--text-muted); 
          margin-bottom: 4px; 
        }
        
        .ud-mo-items { 
          font-size: 0.9rem; 
          font-weight: 600; 
          color: var(--text); 
        }
        
        .ud-mo-right { 
          display: flex; 
          flex-direction: column; 
          align-items: flex-end; 
          gap: 4px; 
        }
        
        .ud-mo-total { 
          font-weight: 700; 
          color: var(--green); 
        }
        
        .ud-mo-status { 
          padding: 3px 12px; 
          border-radius: 20px; 
          font-size: 0.75rem; 
          font-weight: 700; 
        }

        /* ── SHOP TAB ── */
        .ud-shop-wrap { 
          display: flex; 
          flex-direction: column; 
          gap: 0; 
        }
        
        .ud-search-bar { 
          background: white; 
          border: 1px solid var(--border); 
          border-radius: var(--radius); 
          padding: 14px 18px; 
          display: flex; 
          align-items: center; 
          gap: 16px; 
          margin-bottom: 20px; 
          box-shadow: var(--shadow-sm); 
        }
        
        .ud-filter-toggle { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          background: var(--bg); 
          border: 1.5px solid var(--border); 
          color: var(--text); 
          padding: 9px 16px; 
          border-radius: var(--radius-sm); 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.9rem; 
          font-weight: 600; 
          cursor: pointer; 
          transition: var(--transition); 
          white-space: nowrap; 
        }
        
        .ud-filter-toggle:hover { 
          background: var(--accent); 
          color: white; 
          border-color: var(--accent); 
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(249,115,22,0.2);
        }
        
        .ud-search-box { 
          flex: 1; 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          background: var(--bg); 
          border: 1.5px solid var(--border); 
          border-radius: 30px; 
          padding: 0 16px; 
          transition: var(--transition); 
        }
        
        .ud-search-box:focus-within { 
          border-color: var(--accent); 
          box-shadow: 0 0 0 3px rgba(249,115,22,0.1); 
          background: white; 
        }
        
        .ud-search-ico { 
          color: var(--text-muted); 
          flex-shrink: 0; 
        }
        
        .ud-search-input { 
          flex: 1; 
          border: none; 
          outline: none; 
          background: transparent; 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.95rem; 
          padding: 12px 0; 
          color: var(--text); 
        }
        
        .ud-search-input::placeholder { 
          color: var(--text-muted); 
        }
        
        .ud-search-clear { 
          background: none; 
          border: none; 
          color: var(--text-muted); 
          cursor: pointer; 
          font-size: 14px; 
          padding: 4px; 
          transition: var(--transition);
        }
        
        .ud-search-clear:hover {
          color: var(--red);
        }
        
        .ud-search-meta { 
          color: var(--text-muted); 
          font-size: 0.85rem; 
          white-space: nowrap; 
          background: #f1f5f9;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .ud-shop-body { 
          display: flex; 
          gap: 20px; 
          align-items: flex-start; 
        }

        /* SIDEBAR */
        .ud-sidebar { 
          flex-shrink: 0; 
          width: var(--sidebar-w); 
          transition: width 0.3s ease, opacity 0.3s ease; 
          overflow: hidden; 
        }
        
        .ud-sidebar.closed { 
          width: 0; 
          opacity: 0; 
        }
        
        .ud-sidebar.open { 
          opacity: 1; 
        }
        
        .ud-sidebar-card { 
          background: var(--card); 
          border-radius: var(--radius); 
          padding: 20px; 
          box-shadow: var(--shadow-sm); 
          border: 1px solid var(--border); 
          position: sticky; 
          top: 120px; 
        }
        
        .ud-filter-section { 
          margin-bottom: 6px; 
        }
        
        .ud-filter-title { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-family: 'Syne', sans-serif; 
          font-size: 0.8rem; 
          font-weight: 700; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          color: var(--text-muted); 
          margin-bottom: 14px; 
        }
        
        .ud-filter-divider { 
          height: 1px; 
          background: var(--border); 
          margin: 16px 0; 
        }
        
        .ud-cat-list { 
          display: flex; 
          flex-direction: column; 
          gap: 4px; 
        }
        
        .ud-cat-btn { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 10px 14px; 
          border-radius: var(--radius-sm); 
          background: none; 
          border: 1.5px solid transparent; 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.9rem; 
          font-weight: 500; 
          color: var(--text); 
          cursor: pointer; 
          text-align: left; 
          transition: var(--transition); 
        }
        
        .ud-cat-btn:hover { 
          background: #fff7ed; 
          color: var(--accent); 
        }
        
        .ud-cat-btn.active { 
          background: #fff7ed; 
          border-color: var(--accent); 
          color: var(--accent); 
          font-weight: 700; 
        }
        
        .ud-cat-count { 
          background: var(--bg); 
          color: var(--text-muted); 
          font-size: 0.75rem; 
          font-weight: 700; 
          padding: 3px 8px; 
          border-radius: 20px; 
        }
        
        .ud-cat-btn.active .ud-cat-count { 
          background: var(--accent); 
          color: white; 
        }
        
        .ud-price-display { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          margin-bottom: 14px; 
        }
        
        .ud-price-val { 
          background: var(--bg); 
          border: 1.5px solid var(--border); 
          border-radius: var(--radius-sm); 
          padding: 6px 12px; 
          font-size: 0.9rem; 
          font-weight: 700; 
          color: var(--text); 
          flex: 1; 
          text-align: center; 
        }
        
        .ud-price-sep { 
          color: var(--text-muted); 
          font-size: 0.9rem; 
        }
        
        .ud-range-wrap { 
          position: relative; 
          height: 40px; 
          margin-bottom: 6px; 
        }
        
        .ud-range { 
          position: absolute; 
          width: 100%; 
          left: 0; 
          -webkit-appearance: none; 
          appearance: none; 
          height: 4px; 
          background: transparent; 
          outline: none; 
          pointer-events: none; 
        }
        
        .ud-range::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          width: 22px; 
          height: 22px; 
          border-radius: 50%; 
          background: var(--accent); 
          border: 3px solid white; 
          box-shadow: 0 2px 8px rgba(249,115,22,0.4); 
          cursor: pointer; 
          pointer-events: all; 
          transition: transform 0.15s; 
        }
        
        .ud-range::-webkit-slider-thumb:hover { 
          transform: scale(1.2); 
        }
        
        .ud-range::-webkit-slider-runnable-track { 
          height: 4px; 
          background: var(--border); 
          border-radius: 4px; 
        }
        
        .ud-price-ticks { 
          display: flex; 
          justify-content: space-between; 
          font-size: 0.7rem; 
          color: var(--text-muted); 
          margin-top: 8px; 
        }
        
        .ud-price-reset { 
          width: 100%; 
          margin-top: 10px; 
          padding: 8px; 
          border-radius: var(--radius-sm); 
          background: var(--bg); 
          border: 1.5px solid var(--border); 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.85rem; 
          font-weight: 600; 
          color: var(--text-muted); 
          cursor: pointer; 
          transition: var(--transition); 
        }
        
        .ud-price-reset:hover { 
          border-color: var(--accent); 
          color: var(--accent); 
          background: #fff7ed; 
        }
        
        .ud-sort-select { 
          width: 100%; 
          padding: 10px 14px; 
          border-radius: var(--radius-sm); 
          border: 1.5px solid var(--border); 
          background: var(--bg); 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.9rem; 
          font-weight: 500; 
          color: var(--text); 
          cursor: pointer; 
          outline: none; 
          appearance: none; 
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); 
          background-repeat: no-repeat; 
          background-position: right 14px center; 
          transition: var(--transition); 
        }
        
        .ud-sort-select:focus { 
          border-color: var(--blue); 
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1); 
          background-color: white; 
        }
        
        .ud-clear-all { 
          width: 100%; 
          padding: 10px; 
          border-radius: var(--radius-sm); 
          background: #fef2f2; 
          border: 1.5px solid #fecaca; 
          color: var(--red); 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.9rem; 
          font-weight: 700; 
          cursor: pointer; 
          transition: var(--transition); 
        }
        
        .ud-clear-all:hover { 
          background: #fee2e2; 
          border-color: var(--red);
        }

        /* PRODUCT GRID */
        .ud-shop-main { 
          flex: 1; 
          min-width: 0; 
        }
        
        .ud-error { 
          background: #fee2e2; 
          color: var(--red); 
          padding: 14px 18px; 
          border-radius: var(--radius-sm); 
          margin-bottom: 16px; 
        }
        
        .ud-grid-loading { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          min-height: 300px; 
          gap: 16px; 
          color: var(--text-muted); 
        }
        
        .ud-product-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); 
          gap: 18px; 
          margin-bottom: 28px; 
        }
        
        .ud-product-card { 
          background: var(--card); 
          border-radius: var(--radius); 
          border: 1px solid var(--border); 
          overflow: hidden; 
          display: flex; 
          flex-direction: column; 
          box-shadow: var(--shadow-sm); 
          transition: var(--transition); 
        }
        
        .ud-product-card:hover { 
          transform: translateY(-4px); 
          box-shadow: var(--shadow-lg); 
          border-color: var(--blue);
        }
        
        .ud-product-img-wrap { 
          position: relative; 
          height: 200px; 
          overflow: hidden; 
          cursor: pointer; 
          background: #f8fafc; 
        }
        
        .ud-product-img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          transition: transform 0.4s; 
        }
        
        .ud-product-card:hover .ud-product-img { 
          transform: scale(1.08); 
        }
        
        .ud-img-overlay { 
          position: absolute; 
          inset: 0; 
          background: rgba(15,23,42,0.45); 
          color: white; 
          font-weight: 700; 
          font-size: 0.9rem; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          opacity: 0; 
          transition: opacity 0.3s; 
          letter-spacing: 0.5px; 
          backdrop-filter: blur(2px);
        }
        
        .ud-product-card:hover .ud-img-overlay { 
          opacity: 1; 
        }
        
        .ud-badge { 
          position: absolute; 
          padding: 4px 12px; 
          border-radius: 20px; 
          font-size: 0.7rem; 
          font-weight: 700; 
          text-transform: uppercase; 
          letter-spacing: 0.5px;
        }
        
        .ud-badge.oos  { 
          top: 12px; 
          left: 12px; 
          background: var(--red); 
          color: white; 
          box-shadow: 0 2px 8px rgba(239,68,68,0.3);
        }
        
        .ud-badge.low-s { 
          top: 12px; 
          left: 12px; 
          background: var(--gold); 
          color: white; 
        }
        
        .ud-badge.in-c  { 
          top: 12px; 
          right: 12px; 
          background: var(--blue); 
          color: white; 
        }
        
        .ud-heart { 
          position: absolute; 
          bottom: 12px; 
          right: 12px; 
          background: rgba(255,255,255,0.95); 
          border: none; 
          border-radius: 50%; 
          width: 36px; 
          height: 36px; 
          font-size: 1rem; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.15); 
          transition: var(--transition); 
          z-index: 5; 
        }
        
        .ud-heart:hover { 
          transform: scale(1.15); 
          background: white;
        }
        
        .ud-heart.hearted { 
          background: #fff1f2; 
        }
        
        .ud-product-body { 
          padding: 16px; 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          gap: 8px; 
        }
        
        .ud-product-top { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          gap: 10px; 
        }
        
        .ud-product-name { 
          font-size: 1rem; 
          font-weight: 700; 
          color: var(--text); 
          flex: 1; 
          line-height: 1.4; 
        }
        
        .ud-price-tag { 
          background: linear-gradient(135deg, #10b981, #059669); 
          color: white; 
          padding: 4px 12px; 
          border-radius: 20px; 
          font-size: 0.85rem; 
          font-weight: 700; 
          white-space: nowrap; 
          flex-shrink: 0; 
        }
        
        .ud-product-desc { 
          color: var(--text-muted); 
          font-size: 0.85rem; 
          line-height: 1.6; 
          flex: 1; 
        }
        
        .ud-product-footer { 
          margin-top: auto; 
          display: flex; 
          flex-direction: column; 
          gap: 10px; 
        }
        
        .ud-stock-badge { 
          font-size: 0.75rem; 
          font-weight: 700; 
          padding: 4px 12px; 
          border-radius: 20px; 
          align-self: flex-start; 
        }
        
        .ud-stock-badge.ok  { 
          background: #d1fae5; 
          color: #065f46; 
        }
        
        .ud-stock-badge.low { 
          background: #fef3c7; 
          color: #92400e; 
        }
        
        .ud-stock-badge.out { 
          background: #fee2e2; 
          color: var(--red); 
        }
        
        .ud-btn-row { 
          display: flex; 
          gap: 8px; 
        }
        
        .ud-btn-cart, .ud-btn-buy { 
          flex: 1; 
          padding: 10px 8px; 
          border: none; 
          border-radius: var(--radius-sm); 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.8rem; 
          font-weight: 700; 
          cursor: pointer; 
          transition: var(--transition); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 4px; 
        }
        
        .ud-btn-cart { 
          background: linear-gradient(135deg, #10b981, #059669); 
          color: white; 
          flex: 2; 
        }
        
        .ud-btn-cart:hover:not(:disabled) { 
          transform: translateY(-1px); 
          box-shadow: 0 4px 12px rgba(16,185,129,0.3); 
        }
        
        .ud-btn-buy  { 
          background: linear-gradient(135deg, #3b82f6, #2563eb); 
          color: white; 
        }
        
        .ud-btn-buy:hover:not(:disabled)  { 
          transform: translateY(-1px); 
          box-shadow: 0 4px 12px rgba(59,130,246,0.3); 
        }
        
        .ud-btn-buy a { 
          color: inherit; 
          text-decoration: none; 
        }
        
        .ud-btn-cart:disabled, .ud-btn-buy:disabled { 
          background: #cbd5e1; 
          cursor: not-allowed; 
        }
        
        .ud-btn-remove { 
          background: #fee2e2; 
          color: var(--red); 
          border: none; 
          padding: 7px; 
          border-radius: var(--radius-sm); 
          font-size: 0.85rem; 
          font-weight: 600; 
          cursor: pointer; 
          font-family: 'DM Sans', sans-serif; 
          transition: var(--transition);
        }
        
        .ud-btn-remove:hover {
          background: #fecaca;
          color: var(--red-dark);
        }
        
        .ud-empty { 
          grid-column: 1/-1; 
          text-align: center; 
          padding: 70px 20px; 
          background: var(--card); 
          border-radius: var(--radius); 
          border: 2px dashed var(--border); 
        }
        
        .ud-empty-icon { 
          font-size: 4rem; 
          margin-bottom: 16px; 
          opacity: 0.6; 
        }
        
        .ud-empty h3 { 
          color: var(--text); 
          margin-bottom: 8px; 
        }
        
        .ud-empty p { 
          color: var(--text-muted); 
          margin-bottom: 20px; 
        }
        
        .ud-empty-reset { 
          background: var(--accent); 
          color: white; 
          border: none; 
          padding: 10px 24px; 
          border-radius: var(--radius-sm); 
          font-weight: 600; 
          cursor: pointer; 
          font-family: 'DM Sans', sans-serif; 
          transition: var(--transition);
        }
        
        .ud-empty-reset:hover {
          background: var(--accent-dark);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(249,115,22,0.3);
        }
        
        .ud-cart-banner { 
          background: linear-gradient(135deg, #f59e0b, #d97706); 
          border-radius: var(--radius); 
          padding: 20px 24px; 
          color: white; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          gap: 20px; 
          margin-bottom: 24px; 
          box-shadow: var(--shadow-md);
        }
        
        .ud-cart-banner h3 { 
          font-size: 1.1rem; 
          font-weight: 700; 
          margin-bottom: 4px; 
        }
        
        .ud-cart-banner p { 
          opacity: 0.95; 
          font-size: 0.9rem; 
        }
        
        .ud-cart-banner-btn { 
          background: white; 
          color: #d97706; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 30px; 
          font-weight: 700; 
          cursor: pointer; 
          font-family: 'DM Sans', sans-serif; 
          white-space: nowrap; 
          transition: var(--transition); 
        }
        
        .ud-cart-banner-btn:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 6px 18px rgba(0,0,0,0.15); 
        }

        /* MY ORDERS */
        .ud-empty-orders { 
          text-align: center; 
          padding: 70px 20px; 
          background: var(--card); 
          border-radius: var(--radius); 
          border: 2px dashed var(--border); 
        }
        
        .ud-empty-orders h3 { 
          color: var(--text); 
          margin: 16px 0 8px; 
        }
        
        .ud-empty-orders p { 
          color: var(--text-muted); 
          margin-bottom: 20px; 
        }
        
        .ud-shop-now-btn { 
          background: var(--blue); 
          color: white; 
          border: none; 
          padding: 12px 28px; 
          border-radius: 30px; 
          font-weight: 700; 
          cursor: pointer; 
          font-family: 'DM Sans', sans-serif; 
          transition: var(--transition);
        }
        
        .ud-shop-now-btn:hover {
          background: var(--blue-dark);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }
        
        .ud-orders-list { 
          display: grid; 
          gap: 16px; 
        }
        
        .ud-order-card { 
          background: var(--card); 
          border-radius: var(--radius); 
          padding: 22px; 
          box-shadow: var(--shadow-sm); 
          border: 1px solid var(--border); 
          transition: var(--transition);
        }
        
        .ud-order-card:hover {
          border-color: var(--blue);
          box-shadow: var(--shadow-md);
        }
        
        .ud-order-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 16px; 
          padding-bottom: 14px; 
          border-bottom: 1px solid var(--border-light); 
        }
        
        .ud-order-id { 
          font-weight: 700; 
          color: var(--text); 
          margin-right: 14px; 
        }
        
        .ud-order-date { 
          color: var(--text-muted); 
          font-size: 0.85rem; 
        }
        
        .ud-order-status { 
          padding: 5px 14px; 
          border-radius: 20px; 
          font-size: 0.8rem; 
          font-weight: 700; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
        }
        
        .ud-order-items { 
          background: #f8fafc; 
          border-radius: var(--radius-sm); 
          padding: 14px; 
          margin-bottom: 14px; 
          display: flex; 
          flex-direction: column; 
          gap: 10px; 
        }
        
        .ud-order-item { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 12px; 
          background: white; 
          border-radius: var(--radius-sm); 
          border: 1px solid var(--border); 
        }
        
        .ud-oi-name { 
          font-weight: 600; 
          color: var(--text); 
          font-size: 0.95rem; 
          margin-bottom: 3px; 
        }
        
        .ud-oi-qty { 
          font-size: 0.8rem; 
          color: var(--text-muted); 
        }
        
        .ud-oi-right { 
          display: flex; 
          flex-direction: column; 
          align-items: flex-end; 
          gap: 3px; 
        }
        
        .ud-oi-unit { 
          font-size: 0.8rem; 
          color: #94a3b8; 
        }
        
        .ud-oi-sub { 
          font-weight: 700; 
          color: var(--green); 
          font-size: 0.95rem; 
        }
        
        .ud-order-footer { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding-top: 12px; 
          border-top: 1px solid var(--border-light); 
          flex-wrap: wrap; 
          gap: 10px; 
        }
        
        .ud-order-loc { 
          font-size: 0.85rem; 
          color: var(--text-muted); 
        }
        
        .ud-order-total { 
          font-size: 1rem; 
          color: var(--text-light); 
        }
        
        .ud-order-total strong { 
          color: var(--text); 
          font-size: 1.2rem; 
          margin-left: 6px; 
        }

        /* ACTIVITY */
        .ud-activity-list { 
          background: var(--card); 
          border-radius: var(--radius); 
          padding: 22px; 
          box-shadow: var(--shadow-sm); 
          border: 1px solid var(--border); 
        }
        
        .ud-activity-item { 
          display: flex; 
          gap: 16px; 
          padding: 14px 0; 
          border-bottom: 1px solid var(--border); 
        }
        
        .ud-activity-item:last-child { 
          border-bottom: none; 
        }
        
        .ud-activity-icon { 
          width: 42px; 
          height: 42px; 
          background: #f1f5f9; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 1.2rem; 
          flex-shrink: 0; 
        }
        
        .ud-activity-text p { 
          color: var(--text); 
          font-size: 0.95rem; 
          margin-bottom: 4px; 
        }
        
        .ud-activity-text span { 
          font-size: 0.8rem; 
          color: var(--text-muted); 
        }

        /* ACCOUNT INFO */
        .ud-account-section { 
          padding: 0 24px 24px; 
        }
        
        .ud-info-cards { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
          gap: 18px; 
        }
        
        .ud-info-card { 
          background: var(--card); 
          border-radius: var(--radius); 
          padding: 22px; 
          box-shadow: var(--shadow-sm); 
          border: 1px solid var(--border); 
          transition: var(--transition);
        }
        
        .ud-info-card:hover {
          border-color: var(--blue);
          box-shadow: var(--shadow-md);
        }
        
        .ud-info-card h3 { 
          font-family: 'Syne', sans-serif; 
          font-size: 1rem; 
          font-weight: 700; 
          color: var(--text); 
          margin-bottom: 16px; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
        }
        
        .ud-info-content p { 
          margin-bottom: 8px; 
          color: var(--text-muted); 
          font-size: 0.95rem; 
        }
        
        .ud-info-content p span { 
          font-weight: 600; 
          color: var(--text); 
        }
        
        .ud-edit-btn { 
          margin-top: 14px; 
          padding: 8px 18px; 
          background: #f1f5f9; 
          border: none; 
          border-radius: var(--radius-sm); 
          color: var(--blue); 
          font-weight: 600; 
          cursor: pointer; 
          font-family: 'DM Sans', sans-serif; 
          font-size: 0.9rem; 
          transition: var(--transition); 
        }
        
        .ud-edit-btn:hover { 
          background: var(--blue); 
          color: white; 
          transform: translateY(-1px);
        }

        /* MODAL */
        .ud-modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(0,0,0,0.7); 
          backdrop-filter: blur(5px); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 9999; 
          padding: 20px; 
          animation: fadein 0.2s ease; 
        }
        
        @keyframes fadein { 
          from { opacity: 0; } 
          to { opacity: 1; } 
        }
        
        .ud-modal { 
          background: white; 
          border-radius: 24px; 
          max-width: 1000px; 
          width: 100%; 
          max-height: 90vh; 
          overflow-y: auto; 
          position: relative; 
          animation: slideup 0.3s ease; 
          box-shadow: 0 30px 70px rgba(0,0,0,0.3); 
        }
        
        @keyframes slideup { 
          from { opacity: 0; transform: translateY(25px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        .ud-modal-close { 
          position: absolute; 
          top: 18px; 
          right: 18px; 
          width: 40px; 
          height: 40px; 
          border-radius: 50%; 
          background: rgba(0,0,0,0.06); 
          border: none; 
          font-size: 18px; 
          cursor: pointer; 
          z-index: 10; 
          transition: var(--transition); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: var(--text-muted); 
        }
        
        .ud-modal-close:hover { 
          background: var(--red); 
          color: white; 
          transform: rotate(90deg); 
        }
        
        .ud-modal-body { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 2.5rem; 
          padding: 2.5rem; 
        }
        
        .ud-modal-img-wrap { 
          border-radius: var(--radius-lg); 
          overflow: hidden; 
          background: #f8fafc; 
          cursor: zoom-in; 
          box-shadow: var(--shadow-sm);
        }
        
        .ud-modal-img-wrap.zoomed { 
          cursor: zoom-out; 
        }
        
        .ud-modal-img-wrap.zoomed .ud-modal-img { 
          transform: scale(1.5); 
        }
        
        .ud-modal-img { 
          width: 100%; 
          height: auto; 
          display: block; 
          transition: transform 0.3s; 
        }
        
        .ud-zoom-hint { 
          text-align: center; 
          padding: 8px; 
          font-size: 0.8rem; 
          color: var(--text-muted); 
          font-weight: 600; 
        }
        
        .ud-modal-stock { 
          display: inline-block; 
          margin-top: 12px; 
          padding: 6px 16px; 
          border-radius: 20px; 
          font-size: 0.85rem; 
          font-weight: 700; 
        }
        
        .ud-modal-stock.out { 
          background: #fee2e2; 
          color: var(--red); 
        }
        
        .ud-modal-stock.low { 
          background: #fef3c7; 
          color: #92400e; 
        }
        
        .ud-modal-stock.in  { 
          background: #d1fae5; 
          color: #065f46; 
        }
        
        .ud-modal-details { 
          display: flex; 
          flex-direction: column; 
          gap: 1.2rem; 
        }
        
        .ud-modal-details h2 { 
          font-family: 'Syne', sans-serif; 
          font-size: 1.8rem; 
          font-weight: 800; 
          color: var(--text); 
          line-height: 1.3; 
        }
        
        .ud-modal-price-row { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          gap: 14px; 
        }
        
        .ud-modal-price { 
          font-size: 2rem; 
          font-weight: 800; 
          color: var(--green); 
          font-family: 'Syne', sans-serif; 
        }
        
        .ud-modal-wish { 
          padding: 8px 16px; 
          border-radius: 20px; 
          border: 2px solid var(--border); 
          background: white; 
          font-weight: 600; 
          font-size: 0.9rem; 
          cursor: pointer; 
          transition: var(--transition); 
          font-family: 'DM Sans', sans-serif; 
        }
        
        .ud-modal-wish:hover, .ud-modal-wish.active { 
          border-color: #e11d48; 
          background: #fff1f2; 
          color: #be123c; 
        }
        
        .ud-modal-desc h4 { 
          font-size: 0.8rem; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          color: var(--text-muted); 
          font-weight: 700; 
          margin-bottom: 8px; 
        }
        
        .ud-modal-desc p { 
          color: var(--text-light); 
          line-height: 1.7; 
          font-size: 0.95rem; 
        }
        
        .ud-modal-info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
          background: #f8fafc; 
          padding: 16px; 
          border-radius: var(--radius-sm); 
        }
        
        .ud-minfo-item { 
          display: flex; 
          flex-direction: column; 
          gap: 4px; 
        }
        
        .ud-minfo-label { 
          font-size: 0.7rem; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          color: var(--text-muted); 
          font-weight: 700; 
        }
        
        .ud-minfo-val { 
          font-size: 0.95rem; 
          font-weight: 700; 
          color: var(--text); 
        }
        
        .ud-minfo-val.avail { 
          color: var(--green); 
        }
        
        .ud-minfo-val.unavail { 
          color: var(--red); 
        }
        
        .ud-modal-actions { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
          margin-top: auto; 
        }
        
        .ud-modal-btn-cart, .ud-modal-btn-buy { 
          padding: 14px; 
          border: none; 
          border-radius: var(--radius-sm); 
          font-weight: 700; 
          font-size: 1rem; 
          cursor: pointer; 
          transition: var(--transition); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 8px; 
          font-family: 'DM Sans', sans-serif; 
          width: 100%; 
        }
        
        .ud-modal-btn-cart { 
          background: linear-gradient(135deg, #10b981, #059669); 
          color: white; 
        }
        
        .ud-modal-btn-cart:hover:not(:disabled) { 
          transform: translateY(-2px); 
          box-shadow: 0 6px 18px rgba(16,185,129,0.3); 
        }
        
        .ud-modal-btn-buy  { 
          background: linear-gradient(135deg, #3b82f6, #2563eb); 
          color: white; 
        }
        
        .ud-modal-btn-buy:hover:not(:disabled)  { 
          transform: translateY(-2px); 
          box-shadow: 0 6px 18px rgba(59,130,246,0.3); 
        }
        
        .ud-modal-btn-cart:disabled, .ud-modal-btn-buy:disabled { 
          background: #cbd5e1; 
          cursor: not-allowed; 
        }

        /* NOTIFICATION */
        .ud-notif { 
          position: fixed; 
          top: 2rem; 
          right: 2rem; 
          padding: 14px 24px; 
          background: white; 
          border-radius: var(--radius); 
          box-shadow: var(--shadow-lg); 
          font-weight: 600; 
          z-index: 9999; 
          opacity: 0; 
          transform: translateX(100%); 
          transition: all 0.3s ease; 
          font-family: 'DM Sans', sans-serif; 
        }
        
        .ud-notif.show { 
          opacity: 1; 
          transform: translateX(0); 
        }
        
        .ud-notif.success { 
          border-left: 4px solid var(--green); 
          color: #059669; 
        }
        
        .ud-notif.info { 
          border-left: 4px solid var(--blue); 
          color: var(--blue); 
        }

        /* RESPONSIVE */
        @media (max-width: 900px) { 
          .ud-welcome { margin: 16px 16px 0; padding: 24px; } 
          .ud-tabs { padding: 16px 16px 0; } 
          .ud-tab-content { padding: 16px; } 
          .ud-account-section { padding: 0 16px 16px; } 
        }
        
        @media (max-width: 768px) {
          .ud-nav { flex-direction: column; gap: 12px; padding: 12px 16px; }
          .ud-nav-left { width: 100%; justify-content: space-between; }
          .ud-welcome { flex-direction: column; text-align: center; }
          .ud-welcome-stats { justify-content: center; }
          .ud-sidebar { position: fixed; left: 0; top: 0; height: 100vh; z-index: 1500; background: white; box-shadow: 4px 0 24px rgba(0,0,0,0.15); overflow-y: auto; }
          .ud-sidebar.closed { width: 0; }
          .ud-sidebar.open { width: 280px; }
          .ud-modal-body { grid-template-columns: 1fr; }
          .ud-modal-actions { grid-template-columns: 1fr; }
          .ud-cart-banner { flex-direction: column; text-align: center; }
          .ud-cart-inner { flex-direction: column; align-items: stretch; text-align: center; }
          .ud-cb-info { flex-direction: column; }
          .ud-cb-actions { justify-content: center; }
        }
        
        @media (max-width: 480px) { 
          .ud-product-grid { grid-template-columns: 1fr; } 
          .ud-btn-row { flex-direction: column; } 
          .ud-stats-grid { grid-template-columns: 1fr 1fr; } 
          .ud-quick-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </>
  );
}