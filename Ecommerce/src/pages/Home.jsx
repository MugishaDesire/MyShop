import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { getWishlist, saveWishlist, toggleWishlist } from "./Wishlist";

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
  const navigate = useNavigate();

  // Load user from localStorage on component mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined" && userData !== "null") {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (e) {
        console.error("Error parsing user data:", e);
        localStorage.removeItem("user");
      }
    }
    // Load wishlist
    setWishlist(getWishlist());
  }, []);

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem("shoppingCart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error parsing cart from localStorage:", e);
        localStorage.removeItem("shoppingCart");
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("shoppingCart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    axios.get("http://localhost:5000/products")
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching products:", err);
        setError("Failed to load products. Please try again later.");
        setLoading(false);
      });
  }, []);

  const addToCart = (product) => {
    const productWithNumberPrice = {
      ...product,
      price: parseFloat(product.price) || 0,
      quantity: 1
    };
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, productWithNumberPrice];
      }
    });
    
    alert(`✅ ${product.name} added to cart!`);
  };

  const handleWishlistToggle = (product) => {
    const added = toggleWishlist(product);
    setWishlist(getWishlist());
    // brief visual feedback via window title flash — no alert needed
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    document.body.style.overflow = 'hidden';
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setImageZoom(false);
    document.body.style.overflow = 'unset';
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      setCart([]);
      localStorage.removeItem("shoppingCart");
    }
  };

  // Handle checkout — requires login
  const handleCheckout = () => {
    // Save cart first
    localStorage.setItem("shoppingCart", JSON.stringify(cart));

    if (!user) {
      // Not logged in → go to login, remember intent
      localStorage.setItem("redirectAfterLogin", "checkout");
      navigate("/ulogin", { state: { from: "checkout" } });
    } else {
      // Logged in → go straight to checkout
      navigate("/checkout", { state: { cart, user } });
    }
  };

  // Handle buy now — requires login
  const handleBuyNow = (product) => {
    if (!user) {
      // Not logged in → save product, go to login
      localStorage.setItem("buyNowProduct", JSON.stringify(product));
      localStorage.setItem("redirectAfterLogin", `order/${product.id}`);
      navigate("/ulogin", { state: { from: `order/${product.id}` } });
    } else {
      // Logged in → go straight to order page
      navigate(`/order/${product.id}`, { state: { product, user } });
    }
  };

  const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);

  const filteredAndSortedProducts = products
    .filter(product =>
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

  return (
    <>
      <div className="home-container">
        {/* Account Header (when cart is empty) */}
        {totalItemsInCart === 0 && (
          <div className="account-header">
            <Link to={user ? "/userdashboard" : "/ulogin"} className={`header-account-link ${user ? "logged-in" : ""}`}>
              {user ? (
                <>
                  <div className="user-avatar">
                    {((user.fullname || user.name || user.email || "U")
                      .split(" ")
                      .map(w => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2))}
                  </div>
                  <div className="user-info-text">
                    <span className="user-name-display">{user.fullname || user.name || user.email}</span>
                    <span className="logged-in-badge">● Logged In</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="account-icon">👤</span>
                  <span className="account-text">My Account</span>
                </>
              )}
            </Link>
          </div>
        )}

        {/* Cart Indicator */}
        {totalItemsInCart > 0 && (
          <div className="cart-indicator">
            <div className="cart-indicator-content">
              <div className="left-section">
                <Link to={user ? "/userdashboard" : "/ulogin"} className={`my-account-link ${user ? "logged-in" : ""}`}>
                  {user ? (
                    <>
                      <div className="user-avatar-small">
                        {((user.fullname || user.name || user.email || "U")
                          .split(" ")
                          .map(w => w[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2))}
                      </div>
                      <div className="user-info-text-small">
                        <span className="user-name-small">{user.fullname || user.name || user.email}</span>
                        <span className="logged-badge-small">● Logged In</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="account-icon">👤</span>
                      <span className="account-text">My Account</span>
                    </>
                  )}
                </Link>
              </div>
              <div className="cart-info">
                <span className="cart-icon">🛒</span>
                <span className="cart-count">{totalItemsInCart} item{totalItemsInCart !== 1 ? 's' : ''}</span>
                <span className="cart-total">Total: ${cartTotal}</span>
              </div>
              <div className="cart-actions">
                <button className="view-cart-btn" onClick={handleCheckout}>
                  Checkout Now
                </button>
                <button className="clear-cart-btn" onClick={clearCart}>
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Discover Amazing Products</h1>
            <p className="hero-subtitle">
              Shop the latest electronics at unbeatable prices with fast delivery
            </p>
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
            <div className="stat">
              <span className="stat-number">{products.length}</span>
              <span className="stat-label">Products</span>
            </div>
            <div className="stat">
              <span className="stat-number">{products.filter(p => p.stock > 0).length}</span>
              <span className="stat-label">In Stock</span>
            </div>
            <div className="stat">
              <span className="stat-number">{totalItemsInCart}</span>
              <span className="stat-label">In Your Cart</span>
            </div>
          </div>
        </section>

        {/* Controls */}
        <div className="controls">
          <div className="sort-control">
            <label htmlFor="sort">Sort by:</label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="default">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
              <option value="stock">Most in Stock</option>
            </select>
          </div>
          <div className="results-count">
            Showing {filteredAndSortedProducts.length} of {products.length} products
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading products...</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredAndSortedProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h3>No products found</h3>
                <p>{search ? `No results for "${search}"` : "Check back soon for new products!"}</p>
                {search && (
                  <button className="clear-search" onClick={() => setSearch("")}>
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filteredAndSortedProducts.map((p) => {
                const cartItem = cart.find(item => item.id === p.id);
                const isInCart = !!cartItem;
                const cartQuantity = cartItem?.quantity || 0;
                const wishlisted = wishlist.some(w => w.id === p.id);

                return (
                  <div key={p.id} className="product-card">
                    <div 
                      className="product-image-container"
                      onClick={() => openProductModal(p)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view details"
                    >
                      <img
                        src={p.image
                          ? `http://localhost:5000/uploads/${p.image}`
                          : "https://placehold.co/300x200/3b82f6/white?text=No+Image"
                        }
                        alt={p.name || "Product"}
                        className="product-image"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/300x200/3b82f6/white?text=No+Image";
                          e.target.onerror = null;
                        }}
                      />
                      {p.stock <= 0 ? (
                        <div className="out-of-stock-badge">Out of Stock</div>
                      ) : p.stock < 10 ? (
                        <div className="low-stock-badge">Low Stock</div>
                      ) : null}
                      {isInCart && (
                        <div className="in-cart-badge">In Cart: {cartQuantity}</div>
                      )}
                      <button
                        className={`heart-btn${wishlisted ? " hearted" : ""}`}
                        onClick={() => handleWishlistToggle(p)}
                        title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        {wishlisted ? "❤️" : "🤍"}
                      </button>
                    </div>

                    <div className="product-content">
                      <div className="product-header">
                        <h3 className="product-name">{p.name || "Unnamed Product"}</h3>
                        <div className="price-tag">${parseFloat(p.price || 0).toFixed(2)}</div>
                      </div>

                      {p.description && (
                        <p className="product-description">
                          {p.description.length > 100
                            ? `${p.description.substring(0, 100)}...`
                            : p.description}
                        </p>
                      )}

                      <div className="product-footer">
                        <div className="stock-info">
                          <span className="stock-label">Available:</span>
                          <span className={`stock-count ${p.stock <= 0 ? 'out' : p.stock < 10 ? 'low' : 'high'}`}>
                            {p.stock || 0} units
                          </span>
                        </div>

                        {/* <button
                          className="view-details-button"
                          onClick={() => openProductModal(p)}
                        >
                          👁️ View Details
                        </button> */}
                        <div className="button-group">
                          <button
                            className="add-to-cart-button"
                            onClick={() => addToCart(p)}
                            disabled={p.stock <= 0}
                          >
                            {isInCart ? (
                              <><span className="button-icon">➕</span> Add More ({cartQuantity})</>
                            ) : (
                              <><span className="button-icon">🛒</span> Add to Cart</>
                            )}
                          </button>

                          <button
                            className="buy-now-button"
                            onClick={() => handleBuyNow(p)}
                            disabled={p.stock <= 0}
                          >
                            {p.stock <= 0 ? "Out of Stock" : (
                              <><span className="button-icon">⚡</span> Buy Now</>
                            )}
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
          <div className="cart-summary-banner">
            <div className="banner-content">
              <div className="cart-summary-text">
                <h3>🛒 Ready to Checkout?</h3>
                <p>You have {totalItemsInCart} item{totalItemsInCart !== 1 ? 's' : ''} in your cart</p>
                <div className="cart-total-summary">Total: <strong>${cartTotal}</strong></div>
              </div>
              <button className="checkout-now-btn" onClick={handleCheckout}>
                Proceed to Checkout →
              </button>
            </div>
          </div>
        )}

        {/* Featured Banner */}
        {!loading && products.length > 0 && (
          <div className="featured-banner">
            <div className="banner-content">
              <h3>🔥 Hot Deal of the Day</h3>
              <p>Check out our featured product with special pricing</p>
              <div className="featured-buttons">
                <button className="featured-add-to-cart" onClick={() => addToCart(products[0])}>
                  Add to Cart
                </button>
                <button className="featured-button" onClick={() => handleBuyNow(products[0])}>
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .home-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 2rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding-top: ${totalItemsInCart > 0 ? '100px' : '2rem'};
          position: relative;
        }
        .account-header { position: fixed; top: 1rem; right: 2rem; z-index: 999; }
        .header-account-link {
          display: flex; align-items: center; gap: 0.5rem; text-decoration: none;
          color: white; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 50px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 4px 15px rgba(59,130,246,0.3); transition: all 0.3s ease;
        }
        .header-account-link:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59,130,246,0.4); }
        .cart-indicator {
          position: fixed; top: 0; left: 0; right: 0; background: white;
          padding: 15px 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          z-index: 1000; border-bottom: 3px solid #3b82f6;
        }
        .cart-indicator-content {
          display: flex; align-items: center; justify-content: space-between;
          max-width: 1200px; margin: 0 auto; gap: 1rem;
        }
        .left-section { flex: 0 0 auto; }
        .cart-info { flex: 1; display: flex; align-items: center; gap: 1rem; justify-content: center; }
        .cart-actions { flex: 0 0 auto; display: flex; gap: 0.5rem; }
        .my-account-link {
          display: flex; align-items: center; gap: 0.5rem; text-decoration: none;
          color: #1e293b; font-weight: 600; padding: 0.5rem 1rem; border-radius: 8px;
          background: #f1f5f9; transition: all 0.2s ease;
        }
        .my-account-link:hover { background: #e2e8f0; transform: translateY(-2px); }
        .account-icon { font-size: 1.2rem; }
        .account-text { font-size: 0.95rem; }
        .cart-icon { font-size: 1.5rem; }
        .cart-count { font-weight: 600; color: #1e293b; }
        .cart-total { font-weight: 600; color: #059669; }
        .view-cart-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white; border: none; padding: 8px 16px; border-radius: 6px;
          font-weight: 600; cursor: pointer; transition: all 0.2s ease;
        }
        .view-cart-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .clear-cart-btn {
          background: #fee2e2; color: #dc2626; border: none; padding: 8px 16px;
          border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
        }
        .clear-cart-btn:hover { background: #fecaca; }
        .hero-section {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          border-radius: 20px; padding: 3rem 2rem; margin-bottom: 2rem;
          color: white; text-align: center; position: relative; overflow: hidden;
        }
        .hero-section::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
        .hero-title {
          font-size: 3rem; font-weight: 800; margin-bottom: 1rem;
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-subtitle { font-size: 1.25rem; opacity: 0.9; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        .hero-search { position: relative; max-width: 500px; margin: 0 auto; }
        .search-input {
          width: 100%; padding: 1rem 1.5rem 1rem 3rem; border: none; border-radius: 50px;
          font-size: 1rem; background: rgba(255,255,255,0.9); box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }
        .search-input:focus { outline: none; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.2); transform: translateY(-2px); }
        .search-icon { position: absolute; left: 1.5rem; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; }
        .hero-stats { display: flex; justify-content: center; gap: 3rem; margin-top: 2rem; position: relative; z-index: 1; }
        .stat { display: flex; flex-direction: column; align-items: center; }
        .stat-number { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.25rem; }
        .stat-label { font-size: 0.875rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.05em; }
        .controls {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 2rem; padding: 1rem; background: white; border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .sort-control { display: flex; align-items: center; gap: 0.75rem; }
        .sort-control label { font-weight: 600; color: #475569; }
        .sort-select {
          padding: 0.5rem 2rem 0.5rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px;
          background: white; font-size: 0.875rem; font-weight: 500; cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23475569' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 16px;
        }
        .sort-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .results-count { color: #64748b; font-size: 0.875rem; }
        .error-message {
          background: #fee2e2; color: #dc2626; padding: 1rem 1.5rem; border-radius: 8px;
          margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;
        }
        .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 1rem; }
        .loading-spinner {
          width: 50px; height: 50px; border: 4px solid #e2e8f0;
          border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { color: #64748b; font-size: 1rem; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
        .product-card {
          background: white; border-radius: 16px; overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: all 0.3s ease;
          display: flex; flex-direction: column;
        }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); }
        .product-image-container { position: relative; height: 200px; overflow: hidden; }
        .product-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
        .product-card:hover .product-image { transform: scale(1.05); }
        .out-of-stock-badge, .low-stock-badge, .in-cart-badge {
          position: absolute; padding: 0.25rem 0.75rem; border-radius: 9999px;
          font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .out-of-stock-badge { top: 1rem; left: 1rem; background: #dc2626; color: white; }
        .low-stock-badge { top: 1rem; left: 1rem; background: #f59e0b; color: white; }
        .in-cart-badge { top: 1rem; right: 1rem; background: #3b82f6; color: white; }
        .product-content { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; }
        .product-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
        .product-name { font-size: 1.125rem; font-weight: 700; color: #1e293b; margin: 0; flex: 1; }
        .price-tag {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white; padding: 0.375rem 0.75rem; border-radius: 9999px;
          font-size: 0.875rem; font-weight: 700; margin-left: 0.5rem; white-space: nowrap;
        }
        .product-description { color: #64748b; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1rem; flex: 1; }
        .product-footer { display: flex; flex-direction: column; gap: 1rem; margin-top: auto; }
        .stock-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .stock-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .stock-count { font-size: 0.875rem; font-weight: 600; }
        .stock-count.high { color: #059669; }
        .stock-count.low { color: #d97706; }
        .stock-count.out { color: #dc2626; }
        .button-group { display: flex; gap: 0.5rem; }
        .add-to-cart-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px;
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease;
          flex: 2; justify-content: center;
        }
        .add-to-cart-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
        .buy-now-button {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px;
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease;
          flex: 1; justify-content: center;
        }
        .buy-now-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .add-to-cart-button:disabled, .buy-now-button:disabled { background: #94a3b8; cursor: not-allowed; opacity: 0.7; }
        .empty-state {
          grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;
          background: white; border-radius: 16px; border: 2px dashed #e2e8f0;
        }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
        .empty-state h3 { color: #1e293b; margin-bottom: 0.5rem; }
        .empty-state p { color: #64748b; margin-bottom: 1.5rem; }
        .clear-search { background: #e2e8f0; color: #475569; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem; cursor: pointer; }
        .clear-search:hover { background: #cbd5e1; }
        .cart-summary-banner {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 16px; padding: 1.5rem 2rem; color: white;
          margin-top: 2rem; box-shadow: 0 10px 25px rgba(245,158,11,0.3);
        }
        .cart-summary-banner .banner-content { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
        .cart-summary-text h3 { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.25rem; }
        .cart-summary-text p { opacity: 0.9; margin-bottom: 0.25rem; }
        .cart-total-summary { font-size: 1.2rem; }
        .checkout-now-btn {
          background: white; color: #d97706; border: none; padding: 1rem 2rem;
          border-radius: 50px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.3s ease; white-space: nowrap;
        }
        .checkout-now-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .featured-banner {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          border-radius: 16px; padding: 2rem; color: white; text-align: center;
          position: relative; overflow: hidden; margin-top: 2rem;
        }
        .featured-banner::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .banner-content { position: relative; z-index: 1; }
        .featured-banner h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .featured-banner p { opacity: 0.9; margin-bottom: 1.5rem; }
        .featured-buttons { display: flex; gap: 1rem; justify-content: center; }
        .featured-add-to-cart { background: #f59e0b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 50px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
        .featured-add-to-cart:hover { background: #d97706; transform: translateY(-2px); }
        .featured-button { background: white; color: #7c3aed; border: none; padding: 0.75rem 2rem; border-radius: 50px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
        .featured-button:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }

        /* Heart button on product cards */
        .heart-btn {
          position: absolute;
          bottom: 0.75rem;
          right: 0.75rem;
          background: rgba(255,255,255,0.92);
          border: none;
          border-radius: 50%;
          width: 34px;
          height: 34px;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          transition: all 0.2s ease;
          z-index: 5;
        }
        .heart-btn:hover { transform: scale(1.15); box-shadow: 0 4px 12px rgba(225,29,72,0.25); }
        .heart-btn.hearted { background: #fff1f2; }
        .heart-btn.hearted:hover { transform: scale(1.15); }


        /* Logged-in user indicator styles */
        .header-account-link.logged-in {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 0.5rem 1rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .header-account-link.logged-in:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          background: white;
          color: #059669;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.9rem;
          font-family: 'DM Sans', sans-serif;
        }
        .user-info-text {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          align-items: flex-start;
        }
        .user-name-display {
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .logged-in-badge {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* Cart indicator logged-in styles */
        .my-account-link.logged-in {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 0.4rem 0.8rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        .my-account-link.logged-in:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        .user-avatar-small {
          width: 32px;
          height: 32px;
          background: white;
          color: #059669;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
          font-family: 'DM Sans', sans-serif;
        }
        .user-info-text-small {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .user-name-small {
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .logged-badge-small {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.7rem;
          font-weight: 600;
        }


        /* View Details Button */
        .view-details-button {
          width: 100%;
          padding: 0.65rem;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .view-details-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        /* Modal Overlay */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: fadeIn 0.2s ease;
          backdrop-filter: blur(4px);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Modal Content */
        .modal-content {
          background: white;
          border-radius: 20px;
          max-width: 1000px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          animation: slideUp 0.3s ease;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Modal Close Button */
        .modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.1);
          border: none;
          font-size: 20px;
          cursor: pointer;
          z-index: 10;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }
        .modal-close:hover {
          background: #ef4444;
          color: white;
          transform: rotate(90deg);
        }

        /* Modal Body Layout */
        .modal-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          padding: 2rem;
        }

        /* Image Section */
        .modal-image-section {
          position: relative;
        }
        .modal-image-wrapper {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: #f8fafc;
          cursor: zoom-in;
          transition: all 0.3s ease;
        }
        .modal-image-wrapper.zoomed {
          cursor: zoom-out;
        }
        .modal-image-wrapper.zoomed .modal-product-image {
          transform: scale(1.5);
        }
        .modal-product-image {
          width: 100%;
          height: auto;
          display: block;
          transition: transform 0.3s ease;
        }
        .zoom-hint {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }
        .modal-image-wrapper:hover .zoom-hint {
          opacity: 1;
        }
        .modal-stock-badge {
          margin-top: 1rem;
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .modal-stock-badge.out { background: #fee2e2; color: #dc2626; }
        .modal-stock-badge.low { background: #fef3c7; color: #d97706; }
        .modal-stock-badge.in { background: #d1fae5; color: #059669; }

        /* Details Section */
        .modal-details-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .modal-product-name {
          font-size: 1.8rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
          line-height: 1.2;
        }
        .modal-price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .modal-price {
          font-size: 2rem;
          font-weight: 800;
          color: #10b981;
        }
        .modal-wishlist-btn {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          border: 2px solid #e2e8f0;
          background: white;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .modal-wishlist-btn:hover {
          border-color: #e11d48;
          background: #fff1f2;
        }
        .modal-wishlist-btn.active {
          background: #fee2e2;
          border-color: #e11d48;
          color: #be123c;
        }

        /* Description */
        .modal-description h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .modal-description p {
          color: #64748b;
          line-height: 1.6;
          font-size: 0.95rem;
        }

        /* Info Grid */
        .modal-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .info-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          font-weight: 600;
        }
        .info-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
        }
        .info-value.available { color: #059669; }
        .info-value.unavailable { color: #dc2626; }

        /* Modal Actions */
        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: auto;
        }
        .modal-add-to-cart, .modal-buy-now {
          padding: 1rem;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .modal-add-to-cart {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        .modal-add-to-cart:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
        }
        .modal-buy-now {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }
        .modal-buy-now:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
        }
        .modal-add-to-cart:disabled, .modal-buy-now:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
          transform: none;
        }

        /* Responsive Modal */
        @media (max-width: 768px) {
          .modal-body {
            grid-template-columns: 1fr;
          }
          .modal-actions {
            grid-template-columns: 1fr;
          }
          .modal-product-name {
            font-size: 1.4rem;
          }
          .modal-price {
            font-size: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .home-container { padding: 1rem; padding-top: ${totalItemsInCart > 0 ? '120px' : '1rem'}; }
          .hero-title { font-size: 2rem; }
          .controls { flex-direction: column; gap: 1rem; align-items: stretch; }
          .product-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
          .hero-stats { flex-direction: column; gap: 1.5rem; }
          .cart-indicator-content { flex-wrap: wrap; gap: 10px; flex-direction: column; align-items: stretch; }
          .cart-info { flex-direction: column; align-items: center; gap: 0.5rem; }
          .cart-actions { justify-content: center; }
          .account-header { top: 0.5rem; right: 1rem; }
          .cart-summary-banner .banner-content { flex-direction: column; text-align: center; gap: 1rem; }
          .featured-buttons { flex-direction: column; align-items: center; }
        }
        @media (max-width: 480px) {
          .product-grid { grid-template-columns: 1fr; }
          .button-group { flex-direction: column; }
          .add-to-cart-button, .buy-now-button { width: 100%; justify-content: center; }
        }
      `}</style>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeProductModal}>✕</button>
            
            <div className="modal-body">
              {/* Image Section */}
              <div className="modal-image-section">
                <div 
                  className={`modal-image-wrapper ${imageZoom ? 'zoomed' : ''}`}
                  onClick={() => setImageZoom(!imageZoom)}
                  title={imageZoom ? "Click to zoom out" : "Click to zoom in"}
                >
                  <img
                    src={selectedProduct.image
                      ? `http://localhost:5000/uploads/${selectedProduct.image}`
                      : "https://placehold.co/600x500/3b82f6/white?text=No+Image"
                    }
                    alt={selectedProduct.name}
                    className="modal-product-image"
                    onError={(e) => {
                      e.target.src = "https://placehold.co/600x500/3b82f6/white?text=No+Image";
                      e.target.onerror = null;
                    }}
                  />
                  <div className="zoom-hint">{imageZoom ? "🔍 Click to zoom out" : "🔍 Click to zoom in"}</div>
                </div>
                
                {/* Stock Badge */}
                {selectedProduct.stock <= 0 ? (
                  <div className="modal-stock-badge out">Out of Stock</div>
                ) : selectedProduct.stock < 10 ? (
                  <div className="modal-stock-badge low">Only {selectedProduct.stock} left</div>
                ) : (
                  <div className="modal-stock-badge in">{selectedProduct.stock} in stock</div>
                )}
              </div>

              {/* Details Section */}
              <div className="modal-details-section">
                <h2 className="modal-product-name">{selectedProduct.name || "Unnamed Product"}</h2>
                <div className="modal-price-row">
                  <span className="modal-price">${parseFloat(selectedProduct.price || 0).toFixed(2)}</span>
                  <button
                    className={`modal-wishlist-btn ${wishlist.some(w => w.id === selectedProduct.id) ? 'active' : ''}`}
                    onClick={() => handleWishlistToggle(selectedProduct)}
                  >
                    {wishlist.some(w => w.id === selectedProduct.id) ? '❤️ Wishlisted' : '🤍 Add to Wishlist'}
                  </button>
                </div>

                {/* Description */}
                <div className="modal-description">
                  <h3>Description</h3>
                  <p>{selectedProduct.description || "No description available for this product."}</p>
                </div>

                {/* Product Info Grid */}
                <div className="modal-info-grid">
                  <div className="info-item">
                    <span className="info-label">Product ID</span>
                    <span className="info-value">#{selectedProduct.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Category</span>
                    <span className="info-value">{selectedProduct.category || "General"}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Availability</span>
                    <span className={`info-value ${selectedProduct.stock > 0 ? 'available' : 'unavailable'}`}>
                      {selectedProduct.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Stock Level</span>
                    <span className="info-value">{selectedProduct.stock} units</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="modal-actions">
                  <button
                    className="modal-add-to-cart"
                    onClick={() => {
                      addToCart(selectedProduct);
                      closeProductModal();
                    }}
                    disabled={selectedProduct.stock <= 0}
                  >
                    🛒 Add to Cart
                  </button>
                  <button
                    className="modal-buy-now"
                    onClick={() => {
                      handleBuyNow(selectedProduct);
                      closeProductModal();
                    }}
                    disabled={selectedProduct.stock <= 0}
                  >
                    ⚡ Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
