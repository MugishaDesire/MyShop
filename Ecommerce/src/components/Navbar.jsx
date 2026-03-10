import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { label: "Electronics", icon: "⚡" },
  { label: "Fashion",     icon: "👗" },
  { label: "Food",        icon: "🍽️" },
  { label: "Art",         icon: "🎨" },
  { label: "Beauty",      icon: "💄" },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const readCounts = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
      setCartCount(cart.reduce((s, i) => s + (i.quantity || 1), 0));
    } catch { setCartCount(0); }
    try {
      const wl = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setWishlistCount(wl.length);
    } catch { setWishlistCount(0); }
  };

  useEffect(() => {
    readCounts();
    window.addEventListener("cartUpdated", readCounts);
    window.addEventListener("wishlistUpdated", readCounts);
    window.addEventListener("storage", readCounts);
    window.addEventListener("focus", readCounts);
    return () => {
      window.removeEventListener("cartUpdated", readCounts);
      window.removeEventListener("wishlistUpdated", readCounts);
      window.removeEventListener("storage", readCounts);
      window.removeEventListener("focus", readCounts);
    };
  }, []);
  
  const categoryRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined" && userData !== "null") {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, [location]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenCategory(null);
  }, [location]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (path) => location.pathname === path;

  const getUserInitials = () => {
    if (!user) return "U";
    const name = user.fullname || user.name || user.email || "U";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setIsMobileMenuOpen(false);
    window.location.href = "/";
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <>
      <header className="site-header">
        {/* ── PROMO / DISCOVER BAR ── */}
        <div className="discover-bar">
          <span className="discover-text">✨ Discover Amazing Products</span>
        </div>

        {/* ── TOP BAR ── */}
        <div className="top-bar">
          <div className="top-bar-inner">

            {/* Logo */}
            <Link to="/" className="logo">
              <span className="logo-icon">🛍️</span>
              <span className="logo-text">MyShop</span>
            </Link>

            {/* Category Dropdown */}
            <div className="categories-wrap" ref={categoryRef}>
              <button
                className="all-categories-btn"
                onClick={() => setOpenCategory(openCategory === "all" ? null : "all")}
                aria-expanded={openCategory === "all"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                All Categories
                <svg className={`chevron ${openCategory === "all" ? "up" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {openCategory === "all" && (
                <div className="mega-dropdown">
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.label}
                      to={`/category/${cat.label.toLowerCase()}`}
                      className="mega-cat-link"
                      onClick={() => setOpenCategory(null)}
                    >
                      <span className="mega-cat-icon">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Search Bar */}
            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="text"
                className="search-input"
                placeholder="Search products, brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-btn" aria-label="Search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </form>

            {/* Right Icons */}
            <div className="top-actions">
              {/* Wishlist */}
              <Link to="/wishlist" className="action-icon-btn" aria-label="Wishlist">
                <span className="action-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {wishlistCount > 0 && <span className="badge red">{wishlistCount}</span>}
                </span>
                <span className="action-label">Wishlist</span>
              </Link>

              {/* Cart */}
              <Link to="/cart" className="action-icon-btn" aria-label="Cart">
                <span className="action-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  {cartCount > 0 && <span className="badge yellow">{cartCount}</span>}
                </span>
                <span className="action-label">Cart</span>
              </Link>

              {/* My Account */}
              <Link
                to={user ? "/userdashboard" : "/ulogin"}
                className={`account-btn ${user ? "logged-in" : ""}`}
                aria-label="My Account"
              >
                {user ? (
                  <>
                    <div className="avatar">{getUserInitials()}</div>
                    <div className="account-info">
                      <span className="account-name">{user.fullname || user.name || user.email}</span>
                      <span className="account-status">● Logged In</span>
                    </div>
                  </>
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <div className="account-info">
                      <span className="account-name">My Account</span>
                      <span className="account-status">Sign In / Register</span>
                    </div>
                  </>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* ── BOTTOM NAV BAR ── */}
        <div className="bottom-bar">
          <div className="bottom-bar-inner">

            {/* Hamburger + Categories label */}
            <button
              className={`hamburger-btn ${isMobileMenuOpen ? "open" : ""}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="hamburger-icon">☰</span>
              <span className="hamburger-label">Menu</span>
            </button>

            {/* Nav Links */}
            <nav className="bottom-nav-links">
              <Link to="/" className={`bnav-link ${isActive("/") ? "active" : ""}`}>Home</Link>
              <Link to="/about" className={`bnav-link ${isActive("/about") ? "active" : ""}`}>About Us</Link>
              <Link to="/contact" className={`bnav-link ${isActive("/contact") ? "active" : ""}`}>Contact</Link>
              <Link to="/services" className={`bnav-link ${isActive("/services") ? "active" : ""}`}>Services</Link>
            </nav>

            {/* Promo tag */}
            <span className="promo-tag">🔥 Free shipping on orders over $50</span>
          </div>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OUT MENU ── */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      <div className={`mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <span className="drawer-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Menu
          </span>
          <button className="drawer-close" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
        </div>

        <div className="drawer-body">
          {user && (
            <div className="drawer-user-card">
              <div className="drawer-avatar">{getUserInitials()}</div>
              <div>
                <div className="drawer-username">{user.fullname || user.name || user.email}</div>
                <div className="drawer-userstatus">● Logged In</div>
              </div>
            </div>
          )}

          {/* Categories Section */}
          <div className="drawer-section-title">Categories</div>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={`/category/${cat.label.toLowerCase()}`}
              className="drawer-nav-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>{cat.icon}</span> {cat.label}
            </Link>
          ))}

          <div className="drawer-divider" />
          <div className="drawer-section-title">Navigation</div>

          {[
            { to: "/", label: "Home", icon: "🏠" },
            { to: "/about", label: "About Us", icon: "ℹ️" },
            { to: "/contact", label: "Contact", icon: "📞" },
            { to: "/services", label: "Services", icon: "🛠️" },
          ].map(({ to, label, icon }) => (
            <Link key={to} to={to} className={`drawer-nav-link ${isActive(to) ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
              <span>{icon}</span> {label}
            </Link>
          ))}

          <div className="drawer-divider" />

          {user ? (
            <>
              <Link to="/userdashboard" className="drawer-nav-link" onClick={() => setIsMobileMenuOpen(false)}>📊 Dashboard</Link>
              <Link to="/profile" className="drawer-nav-link" onClick={() => setIsMobileMenuOpen(false)}>⚙️ Profile Settings</Link>
              <button className="drawer-nav-link logout" onClick={handleLogout}>🚪 Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/ulogin" className="drawer-nav-link" onClick={() => setIsMobileMenuOpen(false)}>👤 My Account</Link>
              <Link to="/login" className="drawer-nav-link" onClick={() => setIsMobileMenuOpen(false)}>🔐 Admin</Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        /* ─────────────────────────────────────────
           FONTS & ROOT
        ───────────────────────────────────────── */
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --brand: #0f172a;
          --brand2: #1e293b;
          --accent: #f97316;
          --accent2: #fb923c;
          --gold: #fbbf24;
          --white: #ffffff;
          --light: #f8fafc;
          --muted: #94a3b8;
          --green: #10b981;
          --red: #ef4444;
          --radius: 10px;
          --shadow: 0 4px 24px rgba(0,0,0,0.12);
        }

        /* ─────────────────────────────────────────
           HEADER SHELL
        ───────────────────────────────────────── */
        .site-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          font-family: 'DM Sans', sans-serif;
          box-shadow: var(--shadow);
        }

        /* ─────────────────────────────────────────
           TOP BAR
        ───────────────────────────────────────── */
        .top-bar {
          background: var(--brand);
          border-bottom: 2px solid rgba(249,115,22,0.35);
        }

        .top-bar-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          height: 68px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        /* Logo */
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .logo:hover { transform: scale(1.04); }
        .logo-icon { font-size: 26px; }
        .logo-text {
          font-family: 'Syne', sans-serif;
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--white);
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #fff 30%, var(--accent2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* All Categories Button */
        .categories-wrap { position: relative; flex-shrink: 0; }

        .all-categories-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: var(--white);
          border: none;
          padding: 10px 16px;
          border-radius: var(--radius);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .all-categories-btn:hover {
          background: var(--accent2);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(249,115,22,0.4);
        }
        .chevron { transition: transform 0.25s; flex-shrink: 0; }
        .chevron.up { transform: rotate(180deg); }

        /* Discover Bar */
        .discover-bar {
          background: linear-gradient(90deg, #5b5e67, #585c65, #62666f);
          background-size: 200% 100%;
          animation: shimmer 4s linear infinite;
          text-align: center;
          padding: 5px 16px;
        }
        @keyframes shimmer {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        .discover-text {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* Mega Dropdown — flat list */
        .mega-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: 200px;
          background: var(--white);
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.18);
          overflow: hidden;
          z-index: 2000;
          animation: dropIn 0.2s ease;
          border: 1px solid #e2e8f0;
          padding: 6px 0;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mega-cat-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 20px;
          color: var(--brand2);
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 600;
          transition: all 0.15s;
        }
        .mega-cat-link:hover {
          background: #fff7ed;
          color: var(--accent);
          padding-left: 26px;
        }
        .mega-cat-icon { font-size: 1.1rem; }

        /* Search */
        .search-form {
          flex: 1;
          display: flex;
          min-width: 0;
          background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.15);
          border-radius: var(--radius);
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-form:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.2);
          background: rgba(255,255,255,0.12);
        }
        .search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: var(--white);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.93rem;
          padding: 0 16px;
          min-width: 0;
        }
        .search-input::placeholder { color: rgba(255,255,255,0.45); }
        .search-btn {
          background: var(--accent);
          border: none;
          color: white;
          width: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .search-btn:hover { background: var(--accent2); }

        /* Right Actions */
        .top-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .action-icon-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          padding: 6px 12px;
          border-radius: var(--radius);
          transition: all 0.2s;
        }
        .action-icon-btn:hover {
          color: white;
          background: rgba(255,255,255,0.1);
        }
        .action-icon {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .badge {
          position: absolute;
          top: -6px;
          right: -8px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 0.65rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: 2px solid var(--brand);
        }
        .badge.red  { background: var(--red); }
        .badge.yellow { background: var(--accent); }
        .action-label { font-size: 0.7rem; font-weight: 500; }

        /* Account Button */
        .account-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.9);
          text-decoration: none;
          padding: 8px 14px;
          border-radius: var(--radius);
          border: 1.5px solid rgba(255,255,255,0.2);
          transition: all 0.2s;
          background: rgba(255,255,255,0.08);
        }
        .account-btn:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.35);
          transform: translateY(-1px);
        }
        .account-btn.logged-in {
          background: linear-gradient(135deg, #065f46, #10b981);
          border-color: rgba(255,255,255,0.3);
          box-shadow: 0 2px 10px rgba(16,185,129,0.3);
        }
        .account-btn.logged-in:hover {
          box-shadow: 0 4px 16px rgba(16,185,129,0.45);
        }
        .avatar {
          width: 34px; height: 34px;
          background: white;
          color: #065f46;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 0.82rem;
          flex-shrink: 0;
        }
        .account-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .account-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: white;
          max-width: 130px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .account-status {
          font-size: 0.68rem;
          color: rgba(255,255,255,0.7);
        }

        /* ─────────────────────────────────────────
           BOTTOM NAV BAR
        ───────────────────────────────────────── */
        .bottom-bar {
          background: var(--brand2);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .bottom-bar-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          height: 46px;
          display: flex;
          align-items: center;
          gap: 0;
        }

        /* Hamburger */
        .hamburger-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(249,115,22,0.15);
          border: 1px solid rgba(249,115,22,0.3);
          color: var(--accent);
          padding: 6px 14px;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          margin-right: 20px;
          flex-shrink: 0;
        }
        .hamburger-btn:hover {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .hamburger-icon {
          font-size: 1.2rem;
          line-height: 1;
        }
        .hamburger-label { white-space: nowrap; }

        /* Bottom Nav Links */
        .bottom-nav-links {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
        }
        .bnav-link {
          color: rgba(255,255,255,0.75);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          padding: 6px 16px;
          border-radius: 6px;
          position: relative;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .bnav-link:hover {
          color: white;
          background: rgba(255,255,255,0.08);
        }
        .bnav-link.active {
          color: var(--accent);
          font-weight: 600;
        }
        .bnav-link.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 16px; right: 16px;
          height: 2px;
          background: var(--accent);
          border-radius: 2px;
        }

        /* Promo Tag */
        .promo-tag {
          color: var(--gold);
          font-size: 0.8rem;
          font-weight: 500;
          white-space: nowrap;
          margin-left: auto;
          animation: pulse 2.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* ─────────────────────────────────────────
           MOBILE DRAWER
        ───────────────────────────────────────── */
        .mobile-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1999;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }

        .mobile-drawer {
          position: fixed;
          top: 0; left: -340px;
          width: 320px;
          height: 100vh;
          background: var(--white);
          z-index: 2000;
          transition: left 0.3s cubic-bezier(0.4,0,0.2,1);
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 24px rgba(0,0,0,0.2);
        }
        .mobile-drawer.open { left: 0; }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          height: 56px;
          background: var(--brand);
          color: white;
          flex-shrink: 0;
        }
        .drawer-title {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: 1rem;
        }
        .drawer-close {
          background: rgba(255,255,255,0.15);
          border: none; color: white;
          width: 34px; height: 34px;
          border-radius: 50%;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .drawer-close:hover { background: rgba(255,255,255,0.3); transform: rotate(90deg); }

        .drawer-body {
          flex: 1; overflow-y: auto;
          padding: 16px;
        }

        .drawer-user-card {
          display: flex; align-items: center; gap: 12px;
          background: linear-gradient(135deg, #065f46, #10b981);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 16px;
        }
        .drawer-avatar {
          width: 44px; height: 44px;
          background: white; color: #065f46;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.9rem;
        }
        .drawer-username { color: white; font-weight: 700; font-size: 0.95rem; }
        .drawer-userstatus { color: rgba(255,255,255,0.8); font-size: 0.75rem; }

        .drawer-section-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          padding: 4px 4px 8px;
          margin-top: 4px;
        }

        .drawer-cat-btn {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          background: none;
          border: none;
          padding: 11px 12px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--brand2);
          cursor: pointer;
          margin-bottom: 2px;
          transition: background 0.15s;
        }
        .drawer-cat-btn:hover { background: #f8fafc; }

        .drawer-divider { height: 1px; background: #e2e8f0; margin: 12px 0; }

        .drawer-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          color: var(--brand2);
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.15s;
          margin-bottom: 2px;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
        .drawer-nav-link:hover { background: #f1f5f9; transform: translateX(4px); }
        .drawer-nav-link.active { background: #fff7ed; color: var(--accent); font-weight: 600; }
        .drawer-nav-link.logout { color: var(--red); }
        .drawer-nav-link.logout:hover { background: #fef2f2; }

        /* ─────────────────────────────────────────
           RESPONSIVE
        ───────────────────────────────────────── */
        @media (max-width: 1100px) {
          .account-info { display: none; }
          .account-btn { padding: 8px; }
          .promo-tag { display: none; }
        }

        @media (max-width: 900px) {
          .top-bar-inner { gap: 14px; }
          .action-label { display: none; }
          .logo-text { font-size: 1.5rem; }
        }

        @media (max-width: 768px) {
          .top-bar-inner { height: 58px; padding: 0 16px; gap: 10px; }
          .bottom-bar-inner { padding: 0 16px; }
          .bottom-nav-links { display: none; }
          .all-categories-btn .categories-label { display: none; }
        }

        @media (max-width: 480px) {
          .mobile-drawer { width: 100%; left: -100%; }
          .logo-text { font-size: 1.35rem; }
        }
      `}</style>
    </>
  );
}