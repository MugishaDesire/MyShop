import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────
// Wishlist helpers — import these in any file that needs them
// ─────────────────────────────────────────────────────────────────
export const getWishlist = () => {
  try {
    return JSON.parse(localStorage.getItem("wishlist") || "[]");
  } catch {
    return [];
  }
};

export const saveWishlist = (items) => {
  localStorage.setItem("wishlist", JSON.stringify(items));
};

export const isWishlisted = (productId) => {
  return getWishlist().some((item) => item.id === productId);
};

export const toggleWishlist = (product) => {
  const current = getWishlist();
  const exists = current.some((item) => item.id === product.id);
  if (exists) {
    const updated = current.filter((item) => item.id !== product.id);
    saveWishlist(updated);
    return false; // removed
  } else {
    saveWishlist([...current, { ...product, price: parseFloat(product.price) || 0 }]);
    return true; // added
  }
};
// ─────────────────────────────────────────────────────────────────

export default function Wishlist() {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [notification, setNotification] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  // Load user, wishlist, cart on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined" && userData !== "null") {
      try { setUser(JSON.parse(userData)); } catch { /* guest */ }
    }

    setWishlist(getWishlist());

    try {
      setCart(JSON.parse(localStorage.getItem("shoppingCart") || "[]"));
    } catch {
      setCart([]);
    }
  }, []);

  // Sync cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("shoppingCart", JSON.stringify(cart));
  }, [cart]);

  // ── Notification ────────────────────────────────────────────────
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Remove from wishlist ────────────────────────────────────────
  const removeFromWishlist = (productId) => {
    setRemovingId(productId);
    setTimeout(() => {
      const updated = wishlist.filter((item) => item.id !== productId);
      setWishlist(updated);
      saveWishlist(updated);
      setRemovingId(null);
      showNotification("Removed from wishlist", "info");
    }, 300);
  };

  // ── Add single item to cart ─────────────────────────────────────
  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, price: parseFloat(product.price) || 0, quantity: 1 }];
    });
    showNotification(`🛒 ${product.name} added to cart!`);
  };

  // ── Move ALL wishlist items to cart ────────────────────────────
  const moveAllToCart = () => {
    if (wishlist.length === 0) return;
    let newCart = [...cart];
    wishlist.forEach((product) => {
      const exists = newCart.find((item) => item.id === product.id);
      if (exists) {
        newCart = newCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        newCart.push({ ...product, price: parseFloat(product.price) || 0, quantity: 1 });
      }
    });
    setCart(newCart);
    showNotification(`🛒 All ${wishlist.length} items moved to cart!`);
  };

  // ── Buy Now ─────────────────────────────────────────────────────
  const handleBuyNow = (product) => {
    if (!user) {
      localStorage.setItem("buyNowProduct", JSON.stringify(product));
      localStorage.setItem("redirectAfterLogin", `order/${product.id}`);
      navigate("/ulogin", { state: { from: `order/${product.id}` } });
    } else {
      navigate(`/order/${product.id}`, { state: { product, user } });
    }
  };

  const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Floating notification */}
      {notification && (
        <div className={`notif notif-${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="wl-page">
        {/* ── NAV ── */}
        <nav className="wl-nav">
          <div className="wl-nav-inner">
            <Link to="/userdashboard" className="wl-nav-back">← Dashboard</Link>
            <div className="wl-nav-brand">⚡ FlowSpace</div>
            <div className="wl-nav-right">
              <Link to="/userdashboard" className="wl-cart-link">
                🛒
                {totalItemsInCart > 0 && (
                  <span className="cart-bubble">{totalItemsInCart}</span>
                )}
              </Link>
              <Link to="/profile" className="wl-avatar">
                {(user?.fullname || user?.email || "U").charAt(0).toUpperCase()}
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <div className="wl-hero">
          <div className="wl-hero-inner">
            <div className="wl-hero-text">
              <h1 className="wl-hero-title">My Wishlist</h1>
              <p className="wl-hero-sub">
                {wishlist.length === 0
                  ? "Your wishlist is empty"
                  : `${wishlist.length} item${wishlist.length !== 1 ? "s" : ""} saved`}
              </p>
            </div>
            {wishlist.length > 0 && (
              <div className="wl-hero-actions">
                <button className="btn-move-all" onClick={moveAllToCart}>
                  🛒 Move All to Cart
                </button>
                <button
                  className="btn-clear-all"
                  onClick={() => {
                    if (window.confirm("Clear your entire wishlist?")) {
                      setWishlist([]);
                      saveWishlist([]);
                      showNotification("Wishlist cleared", "info");
                    }
                  }}
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          {/* Decorative hearts */}
          <div className="wl-hero-deco">
            {["💗","❤️","🧡","💛","💚","💙","💜"].map((h, i) => (
              <span key={i} className="deco-heart" style={{ animationDelay: `${i * 0.4}s`, left: `${8 + i * 13}%` }}>{h}</span>
            ))}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="wl-content">
          {wishlist.length === 0 ? (
            /* Empty state */
            <div className="wl-empty">
              <div className="empty-heart">💔</div>
              <h2>Nothing saved yet</h2>
              <p>Browse our products and tap the heart icon to save items you love</p>
              <div className="empty-actions">
                <Link to="/" className="btn-browse">Browse Products</Link>
                <Link to="/userdashboard" className="btn-browse-outline">Go to Dashboard</Link>
              </div>
            </div>
          ) : (
            <div className="wl-grid">
              {wishlist.map((item, index) => {
                const inCart = cart.find((c) => c.id === item.id);
                const isRemoving = removingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`wl-card ${isRemoving ? "removing" : ""}`}
                    style={{ animationDelay: `${index * 0.06}s` }}
                  >
                    {/* Remove button */}
                    <button
                      className="wl-remove"
                      onClick={() => removeFromWishlist(item.id)}
                      title="Remove from wishlist"
                    >
                      ✕
                    </button>

                    {/* Image */}
                    <div className="wl-img-wrap">
                      <img
                        src={
                          item.image
                            ? `http://localhost:5000/uploads/${item.image}`
                            : "https://placehold.co/300x220/f1f5f9/94a3b8?text=No+Image"
                        }
                        alt={item.name}
                        className="wl-img"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/300x220/f1f5f9/94a3b8?text=No+Image";
                          e.target.onerror = null;
                        }}
                      />
                      {item.stock <= 0 && (
                        <div className="wl-out-badge">Out of Stock</div>
                      )}
                      {item.stock > 0 && item.stock < 10 && (
                        <div className="wl-low-badge">Only {item.stock} left</div>
                      )}
                      {inCart && (
                        <div className="wl-in-cart-badge">In Cart ×{inCart.quantity}</div>
                      )}
                      <div className="wl-heart-stamp">❤️</div>
                    </div>

                    {/* Info */}
                    <div className="wl-card-body">
                      <h3 className="wl-name">{item.name || "Unnamed Product"}</h3>
                      {item.description && (
                        <p className="wl-desc">
                          {item.description.length > 80
                            ? `${item.description.slice(0, 80)}...`
                            : item.description}
                        </p>
                      )}
                      <div className="wl-price-row">
                        <span className="wl-price">${parseFloat(item.price || 0).toFixed(2)}</span>
                        <span className={`wl-stock ${item.stock <= 0 ? "out" : item.stock < 10 ? "low" : "ok"}`}>
                          {item.stock <= 0 ? "Out of stock" : `${item.stock} in stock`}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="wl-actions">
                        <button
                          className="wl-btn-cart"
                          onClick={() => addToCart(item)}
                          disabled={item.stock <= 0}
                        >
                          {inCart ? `🛒 Add More (${inCart.quantity})` : "🛒 Add to Cart"}
                        </button>
                        <button
                          className="wl-btn-buy"
                          onClick={() => handleBuyNow(item)}
                          disabled={item.stock <= 0}
                        >
                          ⚡ Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart CTA if items in cart */}
        {totalItemsInCart > 0 && (
          <div className="wl-cart-cta">
            <div className="cta-inner">
              <span>🛒 {totalItemsInCart} item{totalItemsInCart !== 1 ? "s" : ""} in your cart</span>
              <button
                className="cta-checkout"
                onClick={() => navigate("/checkout", { state: { cart, user } })}
              >
                Checkout Now →
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Mulish:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .wl-page {
          min-height: 100vh;
          background: #fdf4f4;
          font-family: 'Mulish', sans-serif;
          padding-bottom: 6rem;
        }

        /* ── NOTIFICATION ── */
        .notif {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 9999;
          padding: 0.85rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          font-family: 'Mulish', sans-serif;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          animation: notifIn 0.35s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes notifIn {
          from { opacity: 0; transform: translateX(80px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .notif-success { background: #1e293b; color: white; }
        .notif-info    { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

        /* ── NAV ── */
        .wl-nav {
          background: white;
          border-bottom: 1px solid #fde4e4;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 16px rgba(220,38,38,0.06);
        }
        .wl-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .wl-nav-back {
          text-decoration: none;
          color: #e11d48;
          font-weight: 700;
          font-size: 0.875rem;
          transition: gap 0.2s;
          letter-spacing: 0.02em;
        }
        .wl-nav-back:hover { opacity: 0.7; }
        .wl-nav-brand {
          font-family: 'Syne', sans-serif;
          font-size: 1.3rem;
          font-weight: 800;
          color: #1e293b;
        }
        .wl-nav-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .wl-cart-link {
          position: relative;
          font-size: 1.4rem;
          text-decoration: none;
        }
        .cart-bubble {
          position: absolute;
          top: -6px;
          right: -8px;
          background: #e11d48;
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
        }
        .wl-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.9rem;
          text-decoration: none;
          font-family: 'Syne', sans-serif;
        }

        /* ── HERO ── */
        .wl-hero {
          background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 60%, #fecdd3 100%);
          border-bottom: 2px solid #fda4af;
          padding: 3rem 2rem 2.5rem;
          position: relative;
          overflow: hidden;
        }
        .wl-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          position: relative;
          z-index: 2;
        }
        .wl-hero-title {
          font-family: 'Syne', sans-serif;
          font-size: 2.8rem;
          font-weight: 800;
          color: #881337;
          line-height: 1;
          margin-bottom: 0.5rem;
        }
        .wl-hero-sub {
          color: #9f1239;
          font-size: 1rem;
          font-weight: 500;
          opacity: 0.8;
        }
        .wl-hero-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .btn-move-all {
          background: #e11d48;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: 'Mulish', sans-serif;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(225,29,72,0.35);
        }
        .btn-move-all:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(225,29,72,0.45); }
        .btn-clear-all {
          background: white;
          color: #e11d48;
          border: 2px solid #fda4af;
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: 'Mulish', sans-serif;
          transition: all 0.2s;
        }
        .btn-clear-all:hover { border-color: #e11d48; background: #fff1f2; }

        /* Floating hearts */
        .wl-hero-deco { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
        .deco-heart {
          position: absolute;
          font-size: 1.5rem;
          opacity: 0.15;
          animation: floatHeart 6s ease-in-out infinite;
          bottom: 0;
        }
        @keyframes floatHeart {
          0%,100% { transform: translateY(0) rotate(-10deg); }
          50%      { transform: translateY(-30px) rotate(10deg); }
        }

        /* ── CONTENT ── */
        .wl-content {
          max-width: 1200px;
          margin: 2.5rem auto;
          padding: 0 1.5rem;
        }

        /* ── EMPTY STATE ── */
        .wl-empty {
          text-align: center;
          padding: 5rem 2rem;
          background: white;
          border-radius: 24px;
          border: 2px dashed #fda4af;
        }
        .empty-heart {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.1); }
        }
        .wl-empty h2 {
          font-family: 'Syne', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.75rem;
        }
        .wl-empty p { color: #64748b; font-size: 1rem; margin-bottom: 2rem; max-width: 380px; margin-left: auto; margin-right: auto; }
        .empty-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .btn-browse {
          background: #e11d48;
          color: white;
          text-decoration: none;
          padding: 0.8rem 2rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(225,29,72,0.3);
        }
        .btn-browse:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(225,29,72,0.4); }
        .btn-browse-outline {
          background: white;
          color: #e11d48;
          text-decoration: none;
          padding: 0.8rem 2rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.9rem;
          border: 2px solid #fda4af;
          transition: all 0.2s;
        }
        .btn-browse-outline:hover { border-color: #e11d48; background: #fff1f2; }

        /* ── GRID ── */
        .wl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 1.5rem;
        }

        /* ── CARD ── */
        .wl-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.07);
          position: relative;
          display: flex;
          flex-direction: column;
          animation: cardIn 0.4s cubic-bezier(.34,1.56,.64,1) both;
          transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .wl-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(225,29,72,0.12);
        }
        .wl-card.removing {
          opacity: 0;
          transform: scale(0.9) translateY(10px);
          pointer-events: none;
        }

        /* Remove btn */
        .wl-remove {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          z-index: 10;
          width: 28px;
          height: 28px;
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: 50%;
          font-size: 0.7rem;
          font-weight: 800;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .wl-remove:hover { background: #e11d48; color: white; transform: scale(1.1); }

        /* Image */
        .wl-img-wrap {
          position: relative;
          height: 200px;
          overflow: hidden;
          background: #f8fafc;
        }
        .wl-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .wl-card:hover .wl-img { transform: scale(1.06); }
        .wl-out-badge {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          background: #dc2626;
          color: white;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.25rem 0.6rem;
          border-radius: 50px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .wl-low-badge {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          background: #f59e0b;
          color: white;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.25rem 0.6rem;
          border-radius: 50px;
        }
        .wl-in-cart-badge {
          position: absolute;
          bottom: 0.75rem;
          left: 0.75rem;
          background: #3b82f6;
          color: white;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.25rem 0.6rem;
          border-radius: 50px;
        }
        .wl-heart-stamp {
          position: absolute;
          bottom: 0.75rem;
          right: 0.75rem;
          font-size: 1.3rem;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
          animation: heartbeat 1.8s ease-in-out infinite;
        }
        @keyframes heartbeat {
          0%,100% { transform: scale(1); }
          15%      { transform: scale(1.2); }
          30%      { transform: scale(1); }
          45%      { transform: scale(1.1); }
        }

        /* Card body */
        .wl-card-body { padding: 1.25rem; flex: 1; display: flex; flex-direction: column; gap: 0.6rem; }
        .wl-name { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; color: #1e293b; line-height: 1.3; }
        .wl-desc { font-size: 0.8rem; color: #94a3b8; line-height: 1.5; }
        .wl-price-row { display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; }
        .wl-price { font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 800; color: #e11d48; }
        .wl-stock { font-size: 0.78rem; font-weight: 600; }
        .wl-stock.ok  { color: #059669; }
        .wl-stock.low { color: #d97706; }
        .wl-stock.out { color: #dc2626; }

        /* Actions */
        .wl-actions { display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.75rem; }
        .wl-btn-cart {
          flex: 2;
          background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
          color: white;
          border: none;
          padding: 0.7rem 0.75rem;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Mulish', sans-serif;
          transition: all 0.2s;
        }
        .wl-btn-cart:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(225,29,72,0.35);
        }
        .wl-btn-buy {
          flex: 1;
          background: #1e293b;
          color: white;
          border: none;
          padding: 0.7rem 0.75rem;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Mulish', sans-serif;
          transition: all 0.2s;
        }
        .wl-btn-buy:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(30,41,59,0.3);
          background: #0f172a;
        }
        .wl-btn-cart:disabled,
        .wl-btn-buy:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* ── CART CTA BANNER ── */
        .wl-cart-cta {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          padding: 1rem 2rem;
          z-index: 200;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
        }
        .cta-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .cta-checkout {
          background: #e11d48;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 50px;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: 'Mulish', sans-serif;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(225,29,72,0.4);
        }
        .cta-checkout:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(225,29,72,0.5); }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .wl-hero-title { font-size: 2rem; }
          .wl-hero-inner { flex-direction: column; align-items: flex-start; }
          .wl-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
          .cta-inner { flex-direction: column; text-align: center; }
          .cta-checkout { width: 100%; }
        }
        @media (max-width: 480px) {
          .wl-grid { grid-template-columns: 1fr; }
          .wl-nav-inner { padding: 0 1rem; }
          .wl-content { padding: 0 1rem; }
        }
      `}</style>
    </>
  );
}