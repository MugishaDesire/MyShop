import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { getWishlist, saveWishlist, toggleWishlist } from "./Wishlist";

const CATEGORIES = ["All", "Electronics", "Fashion", "Food", "Art", "Beauty"];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [imageZoom, setImageZoom] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined" && userData !== "null") {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setWishlist(getWishlist());
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("shoppingCart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        localStorage.removeItem("shoppingCart");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("shoppingCart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
  }, [cart]);

  useEffect(() => {
    axios.get("http://localhost:5000/products")
      .then(res => { setProducts(res.data); setLoading(false); })
      .catch(err => { setError("Failed to load products. Please try again later."); setLoading(false); });
  }, []);

  const addToCart = (product) => {
    const p = { ...product, price: parseFloat(product.price) || 0, quantity: 1 };
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      return existing
        ? prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, p];
    });
    setLastAdded(product);
    setCartOpen(true);
  };

  const handleWishlistToggle = (product) => {
    toggleWishlist(product);
    setWishlist(getWishlist());
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    document.body.style.overflow = "hidden";
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setImageZoom(false);
    document.body.style.overflow = "unset";
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("shoppingCart");
    window.dispatchEvent(new Event("cartUpdated"));
    setCartOpen(false);
  };

  const handleCheckout = () => {
    localStorage.setItem("shoppingCart", JSON.stringify(cart));
    if (!user) { localStorage.setItem("redirectAfterLogin", "checkout"); navigate("/ulogin", { state: { from: "checkout" } }); }
    else navigate("/checkout", { state: { cart, user } });
  };

  const handleBuyNow = (product) => {
    if (!user) {
      localStorage.setItem("buyNowProduct", JSON.stringify(product));
      localStorage.setItem("redirectAfterLogin", `order/${product.id}`);
      navigate("/ulogin", { state: { from: `order/${product.id}` } });
    } else {
      navigate(`/order/${product.id}`, { state: { product, user } });
    }
  };

  const totalItemsInCart = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2);

  const filteredProducts = products
    .filter(p => {
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === "All" || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const price = parseFloat(p.price) || 0;
      const matchPrice = price >= priceRange[0] && price <= priceRange[1];
      return matchSearch && matchCat && matchPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low": return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "name": return a.name?.localeCompare(b.name);
        case "stock": return b.stock - a.stock;
        default: return 0;
      }
    });

  const getUserInitials = (u) => {
    if (!u) return "U";
    return (u.fullname || u.name || u.email || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <>
      <div className="page-wrap">

        {/* ── CART BAR ── */}
        {totalItemsInCart > 0 && (
          <div className="cart-bar">
            <div className="cart-bar-inner">
              <Link to={user ? "/userdashboard" : "/ulogin"} className={`cb-account ${user ? "loggedin" : ""}`}>
                {user ? <><div className="cb-avatar">{getUserInitials(user)}</div><span>{user.fullname || user.name || user.email}</span></> : <><span>👤</span><span>My Account</span></>}
              </Link>
              <div className="cb-info">
                <span>🛒</span>
                <span className="cb-count">{totalItemsInCart} item{totalItemsInCart !== 1 ? "s" : ""}</span>
                <span className="cb-total">Total: <strong>${cartTotal}</strong></span>
              </div>
              <div className="cb-actions">
                <button className="cb-checkout" onClick={handleCheckout}>Checkout Now</button>
                <button className="cb-clear" onClick={clearCart}>Clear Cart</button>
              </div>
            </div>
          </div>
        )}

        {/* ── SEARCH BAR ── */}
        <div className="search-bar-wrap">
          <div className="search-bar-inner">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} title="Toggle filters">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="18" x2="12" y2="18"/>
              </svg>
              Filters
            </button>
            <div className="search-box">
              <svg className="search-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search products, brands, categories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input"
              />
              {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
            </div>
            <div className="search-meta">
              <span>{filteredProducts.length} of {products.length} products</span>
            </div>
          </div>
        </div>

        {/* ── BODY: SIDEBAR + GRID ── */}
        <div className="body-wrap">

          {/* FILTER SIDEBAR */}
          <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
            <div className="sidebar-card">
              <div className="filter-section">
                <h3 className="filter-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  Categories
                </h3>
                <div className="cat-list">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`cat-btn ${selectedCategory === cat ? "active" : ""}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat === "All" && "🏷️"}
                      {cat === "Electronics" && "⚡"}
                      {cat === "Fashion" && "👗"}
                      {cat === "Food" && "🍽️"}
                      {cat === "Art" && "🎨"}
                      {cat === "Beauty" && "💄"}
                      {" "}{cat}
                      <span className="cat-count">
                        {cat === "All" ? products.length : products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-divider" />

              <div className="filter-section">
                <h3 className="filter-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  Price Range
                </h3>
                <div className="price-display">
                  <span className="price-val">${priceRange[0].toLocaleString()}</span>
                  <span className="price-sep">—</span>
                  <span className="price-val">${priceRange[1].toLocaleString()}</span>
                </div>
                <div className="range-wrap">
                  <input
                    type="range"
                    min={0} max={5000} step={50}
                    value={priceRange[0]}
                    onChange={e => {
                      const val = Math.min(Number(e.target.value), priceRange[1] - 50);
                      setPriceRange([val, priceRange[1]]);
                    }}
                    className="range-slider range-min"
                  />
                  <input
                    type="range"
                    min={0} max={5000} step={50}
                    value={priceRange[1]}
                    onChange={e => {
                      const val = Math.max(Number(e.target.value), priceRange[0] + 50);
                      setPriceRange([priceRange[0], val]);
                    }}
                    className="range-slider range-max"
                  />
                </div>
                <div className="price-ticks">
                  <span>$0</span><span>$1,250</span><span>$2,500</span><span>$3,750</span><span>$5,000</span>
                </div>
                <button className="price-reset" onClick={() => setPriceRange([0, 5000])}>Reset Price</button>
              </div>

              <div className="filter-divider" />

              <div className="filter-section">
                <h3 className="filter-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 6h18M6 12h12M10 18h4"/>
                  </svg>
                  Sort By
                </h3>
                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="default">Featured</option>
                  <option value="price-low">Price: Low → High</option>
                  <option value="price-high">Price: High → Low</option>
                  <option value="name">Name: A → Z</option>
                  <option value="stock">Most in Stock</option>
                </select>
              </div>

              {(selectedCategory !== "All" || priceRange[0] > 0 || priceRange[1] < 5000 || search) && (
                <>
                  <div className="filter-divider" />
                  <button className="clear-all-btn" onClick={() => { setSelectedCategory("All"); setPriceRange([0, 5000]); setSearch(""); setSortBy("default"); }}>
                    ✕ Clear All Filters
                  </button>
                </>
              )}
            </div>
          </aside>

          {/* PRODUCT AREA */}
          <main className="main-area">
            {error && (
              <div className="error-msg">⚠️ {error}</div>
            )}

            {loading ? (
              <div className="loading-wrap">
                <div className="spinner" />
                <p>Loading products...</p>
              </div>
            ) : (
              <div className="product-grid">
                {filteredProducts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <h3>No products found</h3>
                    <p>{search ? `No results for "${search}"` : "Try adjusting your filters."}</p>
                    <button className="empty-reset" onClick={() => { setSearch(""); setSelectedCategory("All"); setPriceRange([0, 5000]); }}>
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  filteredProducts.map(p => {
                    const cartItem = cart.find(i => i.id === p.id);
                    const isInCart = !!cartItem;
                    const cartQty = cartItem?.quantity || 0;
                    const wishlisted = wishlist.some(w => w.id === p.id);

                    return (
                      <div key={p.id} className="product-card">
                        <div className="product-img-wrap" onClick={() => openProductModal(p)}>
                          <img
                            src={p.image ? `http://localhost:5000/uploads/${p.image}` : "https://placehold.co/300x200/3b82f6/white?text=No+Image"}
                            alt={p.name || "Product"}
                            className="product-img"
                            onError={e => { e.target.src = "https://placehold.co/300x200/3b82f6/white?text=No+Image"; e.target.onerror = null; }}
                          />
                          {p.stock <= 0 ? <span className="badge oos">Out of Stock</span>
                            : p.stock < 10 ? <span className="badge low-s">Low Stock</span>
                            : null}
                          {isInCart && <span className="badge in-c">In Cart: {cartQty}</span>}
                          <button
                            className={`heart-btn ${wishlisted ? "hearted" : ""}`}
                            onClick={e => { e.stopPropagation(); handleWishlistToggle(p); }}
                            title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                          >
                            {wishlisted ? "❤️" : "🤍"}
                          </button>
                          <div className="img-overlay">View Details</div>
                        </div>

                        <div className="product-body">
                          <div className="product-top">
                            <h3 className="product-name">{p.name || "Unnamed Product"}</h3>
                            <span className="price-tag">${parseFloat(p.price || 0).toFixed(2)}</span>
                          </div>
                          {p.description && (
                            <p className="product-desc">
                              {p.description.length > 90 ? `${p.description.substring(0, 90)}...` : p.description}
                            </p>
                          )}
                          <div className="product-bottom">
                            <span className={`stock-badge ${p.stock <= 0 ? "out" : p.stock < 10 ? "low" : "ok"}`}>
                              {p.stock <= 0 ? "Out of stock" : `${p.stock} units`}
                            </span>
                            <div className="btn-row">
                              <button className="btn-cart" onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                                {isInCart ? `➕ Add More (${cartQty})` : "🛒 Add to Cart"}
                              </button>
                              <button className="btn-buy" onClick={() => handleBuyNow(p)} disabled={p.stock <= 0}>
                                {p.stock <= 0 ? "Unavailable" : "⚡ Buy Now"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Cart Summary Banner */}
            {cart.length > 0 && (
              <div className="cart-banner">
                <div className="cart-banner-text">
                  <h3>🛒 Ready to Checkout?</h3>
                  <p>You have {totalItemsInCart} item{totalItemsInCart !== 1 ? "s" : ""} · Total: <strong>${cartTotal}</strong></p>
                </div>
                <button className="cart-banner-btn" onClick={handleCheckout}>Proceed to Checkout →</button>
              </div>
            )}

            {/* Hot Deal Banner */}
            {!loading && products.length > 0 && (
              <div className="deal-banner">
                <div className="deal-text">
                  <h3>🔥 Hot Deal of the Day</h3>
                  <p>Check out our featured product with special pricing</p>
                </div>
                <div className="deal-btns">
                  <button className="deal-cart" onClick={() => addToCart(products[0])}>Add to Cart</button>
                  <button className="deal-buy" onClick={() => handleBuyNow(products[0])}>Buy Now</button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── PRODUCT MODAL ── */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeProductModal}>✕</button>
            <div className="modal-body">
              <div className="modal-img-side">
                <div
                  className={`modal-img-wrap ${imageZoom ? "zoomed" : ""}`}
                  onClick={() => setImageZoom(!imageZoom)}
                >
                  <img
                    src={selectedProduct.image ? `http://localhost:5000/uploads/${selectedProduct.image}` : "https://placehold.co/600x500/3b82f6/white?text=No+Image"}
                    alt={selectedProduct.name}
                    className="modal-img"
                    onError={e => { e.target.src = "https://placehold.co/600x500/3b82f6/white?text=No+Image"; e.target.onerror = null; }}
                  />
                  <div className="zoom-hint">{imageZoom ? "🔍 Click to zoom out" : "🔍 Click to zoom in"}</div>
                </div>
                <div className={`modal-stock-badge ${selectedProduct.stock <= 0 ? "out" : selectedProduct.stock < 10 ? "low" : "in"}`}>
                  {selectedProduct.stock <= 0 ? "Out of Stock" : selectedProduct.stock < 10 ? `Only ${selectedProduct.stock} left` : `${selectedProduct.stock} in stock`}
                </div>
              </div>
              <div className="modal-detail-side">
                <h2 className="modal-name">{selectedProduct.name}</h2>
                <div className="modal-price-row">
                  <span className="modal-price">${parseFloat(selectedProduct.price || 0).toFixed(2)}</span>
                  <button
                    className={`modal-wish-btn ${wishlist.some(w => w.id === selectedProduct.id) ? "active" : ""}`}
                    onClick={() => handleWishlistToggle(selectedProduct)}
                  >
                    {wishlist.some(w => w.id === selectedProduct.id) ? "❤️ Wishlisted" : "🤍 Wishlist"}
                  </button>
                </div>
                <div className="modal-desc-block">
                  <h4>Description</h4>
                  <p>{selectedProduct.description || "No description available."}</p>
                </div>
                <div className="modal-info-grid">
                  <div className="info-item"><span className="info-label">Product ID</span><span className="info-val">#{selectedProduct.id}</span></div>
                  <div className="info-item"><span className="info-label">Category</span><span className="info-val">{selectedProduct.category || "General"}</span></div>
                  <div className="info-item"><span className="info-label">Availability</span><span className={`info-val ${selectedProduct.stock > 0 ? "avail" : "unavail"}`}>{selectedProduct.stock > 0 ? "In Stock" : "Out of Stock"}</span></div>
                  <div className="info-item"><span className="info-label">Stock</span><span className="info-val">{selectedProduct.stock} units</span></div>
                </div>
                <div className="modal-actions">
                  <button className="modal-btn-cart" onClick={() => { addToCart(selectedProduct); closeProductModal(); }} disabled={selectedProduct.stock <= 0}>🛒 Add to Cart</button>
                  <button className="modal-btn-buy" onClick={() => { handleBuyNow(selectedProduct); closeProductModal(); }} disabled={selectedProduct.stock <= 0}>⚡ Buy Now</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --brand: #0f172a;
          --accent: #f97316;
          --green: #10b981;
          --blue: #3b82f6;
          --red: #ef4444;
          --gold: #f59e0b;
          --bg: #f1f5f9;
          --card: #ffffff;
          --text: #1e293b;
          --muted: #64748b;
          --border: #e2e8f0;
          --radius: 12px;
          --sidebar-w: 260px;
        }

        .page-wrap {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
        }

        /* ── CART BAR ── */
        .cart-bar {
          position: sticky; top: 0; z-index: 900;
          background: white;
          border-bottom: 3px solid var(--blue);
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .cart-bar-inner {
          max-width: 1400px; margin: 0 auto;
          padding: 10px 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .cb-account {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; color: var(--text); font-weight: 600;
          padding: 6px 12px; border-radius: 8px; background: #f1f5f9;
          transition: all 0.2s;
        }
        .cb-account.loggedin { background: linear-gradient(135deg,#065f46,#10b981); color: white; }
        .cb-avatar { width: 28px; height: 28px; background: white; color: #08a47b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.72rem; }
        .cb-info { display: flex; align-items: center; gap: 12px; flex: 1; justify-content: center; }
        .cb-count { font-weight: 600; }
        .cb-total { color: var(--green); font-weight: 700; }
        .cb-actions { display: flex; gap: 8px; }
        .cb-checkout { background: var(--blue); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .cb-checkout:hover { background: #384051; transform: translateY(-1px); }
        .cb-clear { background: #fee2e2; color: var(--red); border: none; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .cb-clear:hover { background: #fecaca; }

        /* ── SEARCH BAR ── */
        .search-bar-wrap {
          background: white;
          border-bottom: 1px solid var(--border);
          position: sticky; top: ${totalItemsInCart > 0 ? '57px' : '0'}; z-index: 800;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .search-bar-inner {
          max-width: 1400px; margin: 0 auto;
          padding: 12px 24px;
          display: flex; align-items: center; gap: 16px;
        }
        .sidebar-toggle {
          display: flex; align-items: center; gap: 8px;
          background: var(--bg); border: 1.5px solid var(--border);
          color: var(--text); padding: 8px 14px; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .sidebar-toggle:hover { background: var(--accent); color: white; border-color: var(--accent); }
        .search-box {
          flex: 1; display: flex; align-items: center; gap: 10px;
          background: var(--bg); border: 1.5px solid var(--border);
          border-radius: 10px; padding: 0 14px; transition: all 0.2s;
        }
        .search-box:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(249,115,22,0.12); background: white; }
        .search-ico { color: var(--muted); flex-shrink: 0; }
        .search-input { flex: 1; border: none; outline: none; background: transparent; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; padding: 10px 0; color: var(--text); }
        .search-input::placeholder { color: var(--muted); }
        .search-clear { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 14px; padding: 4px; }
        .search-meta { color: var(--muted); font-size: 0.82rem; white-space: nowrap; }

        /* ── BODY LAYOUT ── */
        .body-wrap {
          max-width: 1400px; margin: 0 auto;
          padding: 24px;
          display: flex; gap: 24px; align-items: flex-start;
        }

        /* ── SIDEBAR ── */
        .sidebar {
          flex-shrink: 0;
          width: var(--sidebar-w);
          transition: width 0.3s ease, opacity 0.3s ease;
          overflow: hidden;
        }
        .sidebar.closed { width: 0; opacity: 0; }
        .sidebar.open { opacity: 1; }

        .sidebar-card {
          background: var(--card);
          border-radius: var(--radius);
          padding: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          border: 1px solid var(--border);
          position: sticky; top: 130px;
        }

        .filter-section { margin-bottom: 4px; }
        .filter-title {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Syne', sans-serif; font-size: 0.82rem;
          font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--muted); margin-bottom: 12px;
        }
        .filter-divider { height: 1px; background: var(--border); margin: 16px 0; }

        /* Category buttons */
        .cat-list { display: flex; flex-direction: column; gap: 4px; }
        .cat-btn {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 12px; border-radius: 8px;
          background: none; border: 1.5px solid transparent;
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
          color: var(--text); cursor: pointer; text-align: left;
          transition: all 0.15s;
        }
        .cat-btn:hover { background: #fff7ed; color: var(--accent); }
        .cat-btn.active { background: #fff7ed; border-color: var(--accent); color: var(--accent); font-weight: 700; }
        .cat-count {
          background: var(--bg); color: var(--muted);
          font-size: 0.72rem; font-weight: 700;
          padding: 2px 7px; border-radius: 20px;
        }
        .cat-btn.active .cat-count { background: var(--accent); color: white; }

        /* Price range */
        .price-display {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 14px;
        }
        .price-val {
          background: var(--bg); border: 1.5px solid var(--border);
          border-radius: 7px; padding: 5px 10px;
          font-size: 0.88rem; font-weight: 700; color: var(--text);
          flex: 1; text-align: center;
        }
        .price-sep { color: var(--muted); font-size: 0.8rem; }
        .range-wrap { position: relative; height: 36px; margin-bottom: 6px; }
        .range-slider {
          position: absolute; width: 100%; left: 0;
          -webkit-appearance: none; appearance: none;
          height: 4px; background: transparent;
          outline: none; pointer-events: none;
        }
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px;
          border-radius: 50%; background: var(--accent);
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(249,115,22,0.4);
          cursor: pointer; pointer-events: all;
          transition: transform 0.15s;
        }
        .range-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .range-slider::-webkit-slider-runnable-track { height: 4px; background: var(--border); border-radius: 4px; }
        .range-min::-webkit-slider-runnable-track { background: linear-gradient(to right, var(--border) 0%, var(--accent) 50%); }
        .price-ticks { display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--muted); margin-top: 4px; }
        .price-reset {
          width: 100%; margin-top: 10px;
          padding: 7px; border-radius: 7px;
          background: var(--bg); border: 1.5px solid var(--border);
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600;
          color: var(--muted); cursor: pointer; transition: all 0.15s;
        }
        .price-reset:hover { border-color: var(--accent); color: var(--accent); background: #fff7ed; }

        .sort-select {
          width: 100%; padding: 9px 12px; border-radius: 8px;
          border: 1.5px solid var(--border); background: var(--bg);
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
          color: var(--text); cursor: pointer; outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
          transition: all 0.2s;
        }
        .sort-select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); background-color: white; }

        .clear-all-btn {
          width: 100%; padding: 10px; border-radius: 8px;
          background: #fef2f2; border: 1.5px solid #fecaca;
          color: var(--red); font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; font-weight: 700; cursor: pointer;
          transition: all 0.15s;
        }
        .clear-all-btn:hover { background: #fee2e2; }

        /* ── MAIN AREA ── */
        .main-area { flex: 1; min-width: 0; }

        .error-msg { background: #fee2e2; color: var(--red); padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }

        .loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 16px; color: var(--muted); }
        .spinner { width: 44px; height: 44px; border: 4px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── PRODUCT GRID ── */
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; margin-bottom: 28px; }

        .product-card {
          background: var(--card); border-radius: var(--radius);
          border: 1px solid var(--border);
          overflow: hidden; display: flex; flex-direction: column;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transition: all 0.25s ease;
        }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.1); }

        .product-img-wrap {
          position: relative; height: 190px; overflow: hidden;
          cursor: pointer; background: #f8fafc;
        }
        .product-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
        .product-card:hover .product-img { transform: scale(1.06); }

        .img-overlay {
          position: absolute; inset: 0;
          background: rgba(15,23,42,0.45);
          color: white; font-weight: 700; font-size: 0.9rem;
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.25s;
          letter-spacing: 0.04em;
        }
        .product-card:hover .img-overlay { opacity: 1; }

        .badge {
          position: absolute; padding: 3px 10px; border-radius: 20px;
          font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
        }
        .badge.oos  { top: 10px; left: 10px; background: var(--red); color: white; }
        .badge.low-s { top: 10px; left: 10px; background: var(--gold); color: white; }
        .badge.in-c  { top: 10px; right: 10px; background: var(--blue); color: white; }

        .heart-btn {
          position: absolute; bottom: 10px; right: 10px;
          background: rgba(255,255,255,0.92); border: none; border-radius: 50%;
          width: 32px; height: 32px; font-size: 0.95rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12); transition: all 0.2s; z-index: 5;
        }
        .heart-btn:hover { transform: scale(1.15); }
        .heart-btn.hearted { background: #fff1f2; }

        .product-body { padding: 14px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .product-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .product-name { font-size: 0.98rem; font-weight: 700; color: var(--text); flex: 1; line-height: 1.3; }
        .price-tag { background: linear-gradient(135deg,#10b981,#059669); color: white; padding: 3px 10px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
        .product-desc { color: var(--muted); font-size: 0.82rem; line-height: 1.5; flex: 1; }
        .product-bottom { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
        .stock-badge { font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; align-self: flex-start; }
        .stock-badge.ok  { background: #d1fae5; color: #065f46; }
        .stock-badge.low { background: #fef3c7; color: #92400e; }
        .stock-badge.out { background: #fee2e2; color: var(--red); }
        .btn-row { display: flex; gap: 6px; }
        .btn-cart, .btn-buy {
          flex: 1; padding: 9px 6px; border: none; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px;
        }
        .btn-cart { background: linear-gradient(135deg,#10b981,#059669); color: white; flex: 2; }
        .btn-cart:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(16,185,129,0.3); }
        .btn-buy  { background: linear-gradient(135deg,#3b82f6,#2563eb); color: white; }
        .btn-buy:hover:not(:disabled)  { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(59,130,246,0.3); }
        .btn-cart:disabled, .btn-buy:disabled { background: #cbd5e1; cursor: not-allowed; }

        .empty-state { grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--card); border-radius: var(--radius); border: 2px dashed var(--border); }
        .empty-icon { font-size: 3.5rem; margin-bottom: 12px; opacity: 0.5; }
        .empty-state h3 { color: var(--text); margin-bottom: 6px; }
        .empty-state p { color: var(--muted); margin-bottom: 16px; }
        .empty-reset { background: var(--accent); color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }

        /* Cart banner */
        .cart-banner {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: var(--radius); padding: 20px 24px; color: white;
          display: flex; justify-content: space-between; align-items: center; gap: 20px;
          margin-bottom: 20px; box-shadow: 0 8px 24px rgba(245,158,11,0.25);
        }
        .cart-banner-text h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
        .cart-banner-text p { opacity: 0.9; font-size: 0.9rem; }
        .cart-banner-btn { background: white; color: #d97706; border: none; padding: 10px 20px; border-radius: 30px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .cart-banner-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }

        /* Deal banner */
        .deal-banner {
          background: linear-gradient(135deg, #241f2f, #7c3aed);
          border-radius: var(--radius); padding: 24px; color: white;
          display: flex; justify-content: space-between; align-items: center; gap: 20px;
          box-shadow: 0 8px 24px rgba(139,92,246,0.25);
        }
        .deal-text h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 4px; }
        .deal-text p { opacity: 0.85; font-size: 0.9rem; }
        .deal-btns { display: flex; gap: 10px; }
        .deal-cart { background: var(--gold); color: white; border: none; padding: 10px 20px; border-radius: 30px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .deal-cart:hover { background: #d97706; transform: translateY(-1px); }
        .deal-buy  { background: white; color: #2a2238; border: none; padding: 10px 22px; border-radius: 30px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .deal-buy:hover  { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }

        /* ── MODAL ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; animation: fadein 0.2s ease; }
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        .modal-content { background: white; border-radius: 20px; max-width: 960px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; animation: slideup 0.25s ease; box-shadow: 0 25px 60px rgba(0,0,0,0.25); }
        @keyframes slideup { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .modal-close { position: absolute; top: 16px; right: 16px; width: 38px; height: 38px; border-radius: 50%; background: rgba(0,0,0,0.08); border: none; font-size: 18px; cursor: pointer; z-index: 10; transition: all 0.2s; display: flex; align-items: center; justify-content: center; color: var(--muted); }
        .modal-close:hover { background: var(--red); color: white; transform: rotate(90deg); }
        .modal-body { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 2rem; }
        .modal-img-wrap { border-radius: 14px; overflow: hidden; background: #f8fafc; cursor: zoom-in; }
        .modal-img-wrap.zoomed { cursor: zoom-out; }
        .modal-img-wrap.zoomed .modal-img { transform: scale(1.5); }
        .modal-img { width: 100%; height: auto; display: block; transition: transform 0.3s; }
        .zoom-hint { text-align: center; padding: 8px; font-size: 0.78rem; color: var(--muted); font-weight: 600; }
        .modal-stock-badge { display: inline-block; margin-top: 10px; padding: 5px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; }
        .modal-stock-badge.out { background: #fee2e2; color: var(--red); }
        .modal-stock-badge.low { background: #fef3c7; color: #92400e; }
        .modal-stock-badge.in  { background: #d1fae5; color: #065f46; }
        .modal-detail-side { display: flex; flex-direction: column; gap: 1.2rem; }
        .modal-name { font-family: 'Syne', sans-serif; font-size: 1.7rem; font-weight: 800; color: var(--text); line-height: 1.2; }
        .modal-price-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .modal-price { font-size: 1.9rem; font-weight: 800; color: var(--green); }
        .modal-wish-btn { padding: 6px 14px; border-radius: 20px; border: 2px solid var(--border); background: white; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.2s; }
        .modal-wish-btn:hover, .modal-wish-btn.active { border-color: #e11d48; background: #fff1f2; color: #be123c; }
        .modal-desc-block h4 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 700; margin-bottom: 6px; }
        .modal-desc-block p { color: var(--muted); line-height: 1.6; font-size: 0.92rem; }
        .modal-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 10px; }
        .info-item { display: flex; flex-direction: column; gap: 3px; }
        .info-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 700; }
        .info-val { font-size: 0.92rem; font-weight: 700; color: var(--text); }
        .info-val.avail { color: var(--green); }
        .info-val.unavail { color: var(--red); }
        .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: auto; }
        .modal-btn-cart, .modal-btn-buy { padding: 14px; border: none; border-radius: 12px; font-weight: 700; font-size: 0.98rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: 'DM Sans', sans-serif; }
        .modal-btn-cart { background: linear-gradient(135deg,#10b981,#059669); color: white; }
        .modal-btn-cart:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16,185,129,0.3); }
        .modal-btn-buy  { background: linear-gradient(135deg,#3b82f6,#2563eb); color: white; }
        .modal-btn-buy:hover:not(:disabled)  { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(59,130,246,0.3); }
        .modal-btn-cart:disabled, .modal-btn-buy:disabled { background: #cbd5e1; cursor: not-allowed; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .body-wrap { padding: 16px; gap: 16px; }
          .sidebar { width: ${`var(--sidebar-w)`}; }
        }
        @media (max-width: 768px) {
          .sidebar { position: fixed; left: 0; top: 0; height: 100vh; z-index: 1500; background: white; box-shadow: 4px 0 24px rgba(0,0,0,0.15); overflow-y: auto; }
          .sidebar.closed { width: 0; }
          .sidebar.open { width: 280px; }
          .modal-body { grid-template-columns: 1fr; }
          .modal-actions { grid-template-columns: 1fr; }
          .cart-banner, .deal-banner { flex-direction: column; text-align: center; }
          .search-bar-inner { gap: 10px; }
          .cb-account span:last-child { display: none; }
        }
        @media (max-width: 480px) {
          .product-grid { grid-template-columns: 1fr; }
          .btn-row { flex-direction: column; }
          .body-wrap { padding: 12px; }
        }

        /* ── Cart Drawer ── */
        .cart-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 4000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        .cart-overlay.open { opacity: 1; pointer-events: all; }

        .cart-drawer {
          position: fixed;
          top: 0; right: 0;
          width: 400px;
          max-width: 100vw;
          height: 100vh;
          background: #fff;
          z-index: 4001;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
          box-shadow: -8px 0 40px rgba(0,0,0,0.18);
          font-family: 'DM Sans', sans-serif;
        }
        .cart-drawer.open { transform: translateX(0); }

        .cd-head {
          background: #0f172a;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .cd-head-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.1rem;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cd-head-badge {
          background: #f97316;
          color: #fff;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
        }
        .cd-close {
          background: rgba(255,255,255,0.12);
          border: none;
          color: #fff;
          width: 34px; height: 34px;
          border-radius: 8px;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .cd-close:hover { background: rgba(255,255,255,0.22); }

        /* just-added banner */
        .cd-added-banner {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border-bottom: 1px solid #bbf7d0;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          color: #166534;
          font-weight: 600;
          flex-shrink: 0;
        }
        .cd-added-img {
          width: 38px; height: 38px;
          border-radius: 8px;
          object-fit: cover;
          background: #e2e8f0;
          flex-shrink: 0;
        }
        .cd-added-name { font-weight: 700; }

        /* items list */
        .cd-items {
          flex: 1;
          overflow-y: auto;
          padding: 10px 0;
        }
        .cd-item {
          display: grid;
          grid-template-columns: 64px 1fr auto;
          gap: 12px;
          padding: 12px 18px;
          border-bottom: 1px solid #f1f5f9;
          align-items: center;
          transition: background 0.15s;
        }
        .cd-item:hover { background: #f8fafc; }
        .cd-item-img {
          width: 64px; height: 64px;
          border-radius: 10px;
          object-fit: cover;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }
        .cd-item-ph {
          width: 64px; height: 64px;
          border-radius: 10px;
          background: linear-gradient(135deg, #e2e8f0, #f1f5f9);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
        }
        .cd-item-info { min-width: 0; }
        .cd-item-name {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.88rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }
        .cd-item-price { color: #f97316; font-weight: 700; font-size: 0.92rem; }
        .cd-item-unit { color: #94a3b8; font-size: 0.78rem; }
        .cd-item-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .cd-qty-box {
          display: flex; align-items: center;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px; overflow: hidden;
        }
        .cd-qty-btn {
          width: 26px; height: 26px;
          background: #f8fafc;
          border: none; font-size: 1rem; font-weight: 700;
          cursor: pointer; color: #1e293b;
          transition: background 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .cd-qty-btn:hover { background: #f97316; color: #fff; }
        .cd-qty-num {
          width: 28px; text-align: center;
          font-weight: 700; font-size: 0.85rem;
          border-left: 1.5px solid #e2e8f0;
          border-right: 1.5px solid #e2e8f0;
          line-height: 26px;
        }
        .cd-remove {
          background: none; border: none;
          color: #ef4444; font-size: 0.75rem;
          cursor: pointer; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          padding: 0;
          transition: opacity 0.15s;
        }
        .cd-remove:hover { opacity: 0.7; }

        /* empty */
        .cd-empty {
          flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; color: #94a3b8; padding: 40px;
          text-align: center;
        }
        .cd-empty-icon { font-size: 3.5rem; }
        .cd-empty h3 { font-family: 'Syne', sans-serif; font-weight: 700; color: #1e293b; }

        /* footer */
        .cd-footer {
          border-top: 1px solid #e2e8f0;
          padding: 16px 18px;
          flex-shrink: 0;
          background: #fff;
        }
        .cd-totals { margin-bottom: 14px; }
        .cd-row {
          display: flex; justify-content: space-between;
          font-size: 0.9rem; padding: 4px 0;
        }
        .cd-row .cd-lbl { color: #64748b; }
        .cd-row.cd-grand {
          font-family: 'Syne', sans-serif;
          font-weight: 800; font-size: 1.1rem;
          color: #1e293b;
          border-top: 1px solid #e2e8f0;
          margin-top: 6px; padding-top: 10px;
        }
        .cd-free { color: #10b981; font-weight: 700; }
        .cd-btn-row { display: flex; gap: 8px; }
        .cd-btn-view {
          flex: 1;
          background: #0f172a; color: #fff;
          border: none; padding: 12px;
          border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: 0.92rem;
          cursor: pointer; text-align: center;
          text-decoration: none; display: flex;
          align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .cd-btn-view:hover { background: #1e3a5f; }
        .cd-btn-checkout {
          flex: 1.4;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff; border: none; padding: 12px;
          border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: 0.92rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cd-btn-checkout:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(249,115,22,0.35); }
        .cd-btn-clear {
          background: none; border: 1.5px solid #e2e8f0;
          color: #ef4444; padding: 8px 12px;
          border-radius: 8px; font-size: 0.8rem;
          font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s; margin-top: 8px;
          width: 100%;
        }
        .cd-btn-clear:hover { background: #ef4444; color: #fff; border-color: #ef4444; }

        @media (max-width: 440px) {
          .cart-drawer { width: 100vw; }
        }
      `}</style>

      {/* ── CART DRAWER ── */}
      <div className={`cart-overlay ${cartOpen ? "open" : ""}`} onClick={() => setCartOpen(false)} />
      <div className={`cart-drawer ${cartOpen ? "open" : ""}`}>

        {/* Header */}
        <div className="cd-head">
          <div className="cd-head-title">
            🛒 Your Cart
            {totalItemsInCart > 0 && <span className="cd-head-badge">{totalItemsInCart}</span>}
          </div>
          <button className="cd-close" onClick={() => setCartOpen(false)}>✕</button>
        </div>

        {/* Just-added banner */}
        {lastAdded && (
          <div className="cd-added-banner">
            {lastAdded.image_url
              ? <img className="cd-added-img" src={lastAdded.image_url} alt={lastAdded.name} onError={e => e.target.style.display="none"} />
              : <div className="cd-added-img" style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem"}}>🛍️</div>
            }
            <span>✅ <span className="cd-added-name">{lastAdded.name}</span> added to cart!</span>
          </div>
        )}

        {/* Items */}
        {cart.length === 0 ? (
          <div className="cd-empty">
            <div className="cd-empty-icon">🛒</div>
            <h3>Cart is empty</h3>
            <p>Add some products to get started.</p>
          </div>
        ) : (
          <div className="cd-items">
            {cart.map(item => {
              const price = parseFloat(item.price) || 0;
              return (
                <div className="cd-item" key={item.id}>
                  {item.image_url
                    ? <img className="cd-item-img" src={item.image_url} alt={item.name} onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
                    : null
                  }
                  <div className="cd-item-ph" style={item.image_url ? { display: "none" } : {}}>🛍️</div>
                  <div className="cd-item-info">
                    <div className="cd-item-name">{item.name}</div>
                    <div className="cd-item-price">${(price * item.quantity).toFixed(2)}</div>
                    <div className="cd-item-unit">${price.toFixed(2)} each</div>
                  </div>
                  <div className="cd-item-controls">
                    <div className="cd-qty-box">
                      <button className="cd-qty-btn" onClick={() => setCart(prev =>
                        prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0)
                      )}>−</button>
                      <span className="cd-qty-num">{item.quantity}</span>
                      <button className="cd-qty-btn" onClick={() => setCart(prev =>
                        prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
                      )}>+</button>
                    </div>
                    <button className="cd-remove" onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))}>🗑️ Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {cart.length > 0 && (
          <div className="cd-footer">
            <div className="cd-totals">
              <div className="cd-row">
                <span className="cd-lbl">Subtotal ({totalItemsInCart} items)</span>
                <span>${cartTotal}</span>
              </div>
              <div className="cd-row">
                <span className="cd-lbl">Shipping</span>
                <span className={parseFloat(cartTotal) > 100 ? "cd-free" : ""}>{parseFloat(cartTotal) > 100 ? "FREE ✓" : "$9.99"}</span>
              </div>
              <div className="cd-row cd-grand">
                <span>Total</span>
                <span>${(parseFloat(cartTotal) + (parseFloat(cartTotal) > 100 ? 0 : 9.99)).toFixed(2)}</span>
              </div>
            </div>
            <div className="cd-btn-row">
              <Link to="/cart" className="cd-btn-view" onClick={() => setCartOpen(false)}>View Cart</Link>
              <button className="cd-btn-checkout" onClick={() => { setCartOpen(false); handleCheckout(); }}>Checkout →</button>
            </div>
            <button className="cd-btn-clear" onClick={clearCart}>🧹 Clear Cart</button>
          </div>
        )}
      </div>
    </>
  );
}
