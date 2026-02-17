import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Check if current path matches link
  const isActive = (path) => location.pathname === path;

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            <span className="logo-icon">🛍️</span>
            <h1 className="logo-text">MyShop</h1>
          </Link>
          
          {/* Desktop Navigation Links */}
          <div className="desktop-nav-links">
            <Link 
              to="/" 
              className={`nav-link ${isActive("/") ? "active" : ""}`}
            >
              <span className="nav-link-icon">🏠</span>
              <span className="nav-link-text">Home</span>
            </Link>
            
            <Link 
              to="/about" 
              className={`nav-link ${isActive("/about") ? "active" : ""}`}
            >
              <span className="nav-link-icon">ℹ️</span>
              <span className="nav-link-text">About Us</span>
            </Link>
            
            <Link 
              to="/contact" 
              className={`nav-link ${isActive("/contact") ? "active" : ""}`}
            >
              <span className="nav-link-icon">📞</span>
              <span className="nav-link-text">Contact</span>
            </Link>
          </div>

          {/* Right Section: My Account and Menu Toggle */}
          <div className="right-section">
            {/* My Account Button */}
            <Link to="/account" className="account-button">
              <span className="account-icon">👤</span>
              <span className="account-text">My Account</span>
            </Link>

            {/* Menu Toggle Button */}
            <button 
              className={`menu-toggle ${isMenuOpen ? 'open' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>
          
          {/* Mobile Menu - Admin Link in Mobile Menu */}
          <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">Menu</span>
              <button 
                className="mobile-menu-close"
                onClick={() => setIsMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="mobile-menu-links">
              <Link 
                to="/" 
                className={`mobile-nav-link ${isActive("/") ? "active" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="nav-link-icon">🏠</span>
                <span className="nav-link-text">Home</span>
              </Link>
              
              <Link 
                to="/about" 
                className={`mobile-nav-link ${isActive("/about") ? "active" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="nav-link-icon">ℹ️</span>
                <span className="nav-link-text">About Us</span>
              </Link>
              
              <Link 
                to="/contact" 
                className={`mobile-nav-link ${isActive("/contact") ? "active" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="nav-link-icon">📞</span>
                <span className="nav-link-text">Contact</span>
              </Link>
              
              <div className="mobile-menu-divider"></div>
              
              <Link 
                to="/account" 
                className={`mobile-nav-link ${isActive("/account") ? "active" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="nav-link-icon">👤</span>
                <span className="nav-link-text">My Account</span>
              </Link>
              
              <Link 
                to="/login" 
                className={`mobile-nav-link ${isActive("/login") ? "active" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="nav-link-icon">🔐</span>
                <span className="nav-link-text">Admin</span>
              </Link>
            </div>
          </div>

          {/* Overlay for mobile menu */}
          {isMenuOpen && (
            <div className="menu-overlay" onClick={() => setIsMenuOpen(false)} />
          )}
        </div>
      </nav>

      {/* Enhanced CSS with improved UX */}
      <style>{`
        .navbar {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          width: 100%;
        }

        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 70px;
          position: relative;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: white;
          transition: transform 0.2s ease;
          z-index: 1002;
        }

        .logo:hover {
          transform: scale(1.05);
        }

        .logo-icon {
          font-size: 24px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        .logo-text {
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin: 0;
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Desktop Navigation Links */
        .desktop-nav-links {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        /* Right Section */
        .right-section {
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 1002;
        }

        /* Account Button */
        .account-button {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .account-button:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .account-icon {
          font-size: 18px;
        }

        .account-text {
          font-weight: 500;
        }

        /* Menu Toggle Button */
        .menu-toggle {
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          width: 30px;
          height: 30px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          cursor: pointer;
          padding: 6px;
          z-index: 1002;
          transition: all 0.3s ease;
        }

        .menu-toggle:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .menu-toggle:focus {
          outline: 2px solid rgba(255, 255, 255, 0.5);
        }

        .hamburger-line {
          width: 100%;
          height: 2px;
          background: white;
          border-radius: 10px;
          transition: all 0.3s linear;
          transform-origin: 1px;
        }

        .menu-toggle.open .hamburger-line:first-child {
          transform: rotate(45deg) translate(2px, -2px);
        }

        .menu-toggle.open .hamburger-line:nth-child(2) {
          opacity: 0;
          transform: translateX(10px);
        }

        .menu-toggle.open .hamburger-line:nth-child(3) {
          transform: rotate(-45deg) translate(2px, 2px);
        }

        /* Desktop Navigation Links Styling */
        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
          position: relative;
          transition: all 0.3s ease;
          border-radius: 6px;
          padding: 8px 16px;
        }

        .nav-link:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }

        .nav-link.active {
          color: white;
          background: rgba(255, 255, 255, 0.15);
        }

        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 16px;
          right: 16px;
          height: 3px;
          background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
          border-radius: 3px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        .nav-link-icon {
          font-size: 18px;
          opacity: 0.9;
          transition: transform 0.2s ease;
        }

        .nav-link:hover .nav-link-icon {
          transform: scale(1.1);
        }

        /* Mobile Menu */
        .mobile-menu {
          position: fixed;
          top: 0;
          right: -400px;
          width: 350px;
          height: 100vh;
          background: white;
          z-index: 1003;
          transition: right 0.3s ease;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
        }

        .mobile-menu.open {
          right: 0;
        }

        .mobile-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
        }

        .mobile-menu-title {
          font-size: 1.2rem;
          font-weight: 600;
        }

        .mobile-menu-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .mobile-menu-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .mobile-menu-links {
          padding: 20px;
          flex: 1;
          overflow-y: auto;
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 20px;
          color: #333;
          text-decoration: none;
          font-size: 1.1rem;
          border-radius: 8px;
          transition: all 0.3s ease;
          margin-bottom: 8px;
        }

        .mobile-nav-link:hover {
          background: #f3f4f6;
          transform: translateX(5px);
        }

        .mobile-nav-link.active {
          background: #e0f2fe;
          color: #0369a1;
          font-weight: 600;
        }

        .mobile-nav-link.active .nav-link-icon {
          color: #0369a1;
        }

        .mobile-menu-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 20px 0;
        }

        /* Menu Overlay */
        .menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1002;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .desktop-nav-links {
            display: none;
          }
          
          .account-text {
            display: none;
          }
          
          .account-button {
            padding: 8px;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .account-icon {
            font-size: 20px;
            margin: 0;
          }
        }

        @media (max-width: 768px) {
          .nav-container {
            padding: 0 16px;
            height: 60px;
          }

          .logo-icon {
            font-size: 20px;
          }

          .logo-text {
            font-size: 1.5rem;
          }

          .mobile-menu {
            width: 300px;
          }
        }

        @media (max-width: 480px) {
          .mobile-menu {
            width: 100%;
            right: -100%;
          }
        }

        /* Animations */
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .navbar {
          animation: fadeInDown 0.4s ease;
        }

        /* Focus States */
        .nav-link:focus,
        .account-button:focus,
        .menu-toggle:focus {
          outline: 2px solid rgba(255, 255, 255, 0.5);
          outline-offset: 2px;
        }

        .logo:focus {
          outline: 2px solid rgba(255, 255, 255, 0.5);
          outline-offset: 4px;
          border-radius: 6px;
        }
      `}</style>
    </>
  );
}