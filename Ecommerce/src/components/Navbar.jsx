import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  
  // Check if current path matches link
  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            <span className="logo-icon">🛍️</span>
            <h1 className="logo-text">MyShop</h1>
          </Link>
          
          <div className="nav-links">
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
            
            <Link 
              to="/login" 
              className={`nav-link ${isActive("/login") ? "active" : ""}`}
            >
              <span className="nav-link-icon">🔐</span>
              <span className="nav-link-text">Admin</span>
            </Link>
          </div>
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
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 70px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: white;
          transition: transform 0.2s ease;
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

        .nav-links {
          display: flex;
          gap: 32px;
          align-items: center;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
          padding: 10px 0;
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

        .nav-link-text {
          position: relative;
        }

        /* Mobile responsiveness */
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

          .nav-links {
            gap: 12px;
          }

          .nav-link {
            padding: 8px 12px;
            font-size: 0.9rem;
          }

          .nav-link-icon {
            font-size: 16px;
          }
        }

        @media (max-width: 640px) {
          .nav-links {
            gap: 8px;
          }

          .nav-link-text {
            display: none;
          }

          .nav-link-icon {
            font-size: 20px;
          }

          .nav-link {
            padding: 10px;
            border-radius: 50%;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .nav-link.active::after {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            left: 50%;
            transform: translateX(-50%);
            bottom: 4px;
          }
        }

        /* Add a subtle animation on page load */
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

        /* Improve focus states for accessibility */
        .nav-link:focus {
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