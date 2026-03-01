import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const Ulogin = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Determine where the user came from (checkout or order)
  const redirectAfterLogin =
    location.state?.from || localStorage.getItem("redirectAfterLogin") || null;

  // // ✅ AUTO-REDIRECT: If user is already logged in, go straight to dashboard
  // useEffect(() => {
  //   const userData = localStorage.getItem("user");
  //   if (userData && userData !== "undefined" && userData !== "null") {
  //     try {
  //       JSON.parse(userData); // validate it's valid JSON
  //       navigate("/userdashboard", { replace: true });
  //       return;
  //     } catch {
  //       // Invalid user data, clear it
  //       localStorage.removeItem("user");
  //     }
  //   }
  // }, [navigate]);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/user/login", {
        email,
        password,
      });

      const user = response.data.user;

      if (!user) {
        throw new Error("Invalid response from server - no user data");
      }

      // Store user in localStorage
      localStorage.setItem("user", JSON.stringify(user));

      if (onLogin) onLogin(user);

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Success animation
      document.querySelector(".login-card")?.classList.add("success");

      setTimeout(() => {
        // Read redirect info ONCE
        const pendingRedirect =
          localStorage.getItem("redirectAfterLogin") || null;
        const pendingCart = JSON.parse(
          localStorage.getItem("shoppingCart") || "[]"
        );
        const buyNowProductRaw = localStorage.getItem("buyNowProduct");
        const pendingProduct = buyNowProductRaw
          ? JSON.parse(buyNowProductRaw)
          : null;

        // Clean up redirect flags
        localStorage.removeItem("redirectAfterLogin");
        localStorage.removeItem("buyNowProduct");

        // Always go to dashboard first — it handles the redirect
        navigate("/userdashboard", {
          state: {
            pendingRedirect: pendingRedirect || null,
            pendingCart,
            pendingProduct,
            loggedInUser: user,
          },
        });
      }, 800);
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage =
              "Invalid email or password. Please check your credentials.";
            break;
          case 403:
            errorMessage = "Access denied. Please contact your administrator.";
            break;
          case 404:
            errorMessage = "Service unavailable. Please try again later.";
            break;
          case 500:
            errorMessage = "Server error. Please try again in a few moments.";
            break;
          default:
            errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage =
          "Network error. Please check your internet connection.";
      }

      setError(errorMessage);

      document.querySelector(".login-card")?.classList.add("shake");
      setTimeout(() => {
        document.querySelector(".login-card")?.classList.remove("shake");
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-page">
        {/* Back to Home */}
        <div className="back-to-home">
          <Link to="/" className="back-home-link">
            <span className="back-icon">←</span>
            <span>Back to Shopping</span>
          </Link>
        </div>

        <div className="login-container">
          <div className="login-card">
            {/* Left - Branding */}
            <div className="login-branding">
              <div className="brand-content">
                <div className="logo">
                  <span className="logo-icon">⚡</span>
                  <span className="logo-text">FlowSpace</span>
                </div>
                <h1>Welcome back!</h1>
                <p>Sign in to continue your shopping journey</p>
                <div className="illustration">
                  <div className="circle"></div>
                  <div className="dots"></div>
                </div>
              </div>
            </div>

            {/* Right - Form */}
            <div className="login-form-container">
              <div className="form-content">
                <h2>Sign In</h2>
                <p className="form-subtitle">Access your account</p>

                {/* Redirect info banner */}
                {redirectAfterLogin && (
                  <div className="info-message">
                    <span className="info-icon">ℹ️</span>
                    Please sign in to continue with your{" "}
                    {redirectAfterLogin === "checkout" ? "checkout" : "order"}
                  </div>
                )}

                {error && (
                  <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <div className="input-wrapper">
                      <span className="input-icon">✉️</span>
                      <input
                        type="email"
                        id="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input
                        type="password"
                        id="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="form-options">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading}
                      />
                      <span className="checkmark"></span>
                      Remember me
                    </label>
                    <Link to="/forgot-password" className="forgot-link">
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    className={`signin-btn ${loading ? "loading" : ""}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                <div className="divider">
                  <span>or</span>
                </div>

                <button className="social-login-btn" disabled={loading}>
                  <span className="social-icon">G</span>
                  Sign in with Google
                </button>

                <p className="signup-text">
                  Don't have an account?{" "}
                  <Link to="/Signup">Sign up now</Link>
                </p>

                <div className="guest-section">
                  <Link to="/" className="guest-link">
                    <span className="guest-icon">🛒</span>
                    Continue as Guest
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
        }
        .back-to-home { position: fixed; top: 1.5rem; left: 2rem; z-index: 100; }
        .back-home-link {
          display: flex; align-items: center; gap: 0.5rem; text-decoration: none;
          color: white; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 50px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 4px 15px rgba(59,130,246,0.3); transition: all 0.3s ease;
        }
        .back-home-link:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59,130,246,0.4); }
        .back-icon { font-size: 1.2rem; }
        .login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
        .login-card {
          display: flex; max-width: 1000px; width: 100%; background: white;
          border-radius: 20px; box-shadow: 0 20px 40px -12px rgba(0,0,0,0.2);
          overflow: hidden; transition: all 0.3s ease;
        }
        .login-card:hover { transform: scale(1.02); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .login-card.success { animation: successPulse 0.5s ease; }
        @keyframes successPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px #10b981; }
          100% { transform: scale(1); }
        }
        .login-card.shake { animation: shake 0.5s ease; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .info-message {
          background: #dbeafe; color: #1e40af; padding: 0.75rem 1rem; border-radius: 8px;
          margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.9rem; animation: slideIn 0.3s ease;
        }
        .error-message {
          background: #fee2e2; color: #dc2626; padding: 0.75rem 1rem; border-radius: 8px;
          margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.9rem; animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .login-branding {
          flex: 1;
          background: linear-gradient(145deg, #1e40af 0%, #3b82f6 100%);
          color: white; padding: 3rem 2rem; display: flex; align-items: center;
          justify-content: center; position: relative; overflow: hidden;
        }
        .login-branding::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .brand-content { position: relative; z-index: 2; text-align: center; }
        .logo { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 2rem; }
        .logo-icon { font-size: 2.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
        .logo-text { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.5px; }
        .login-branding h1 {
          font-size: 2.2rem; font-weight: 700; margin-bottom: 1rem;
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .login-branding p { font-size: 1rem; opacity: 0.9; margin-bottom: 2rem; }
        .illustration { position: relative; width: 200px; height: 200px; margin: 0 auto; }
        .circle {
          position: absolute; width: 150px; height: 150px; background: rgba(255,255,255,0.1);
          border-radius: 50%; top: 20px; left: 25px; animation: float 6s ease-in-out infinite;
        }
        .dots {
          position: absolute; width: 100%; height: 100%;
          background-image: radial-gradient(rgba(255,255,255,0.2) 2px, transparent 2px);
          background-size: 20px 20px; animation: move 10s linear infinite;
        }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes move { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        .login-form-container { flex: 1; padding: 3rem 2.5rem; background: white; }
        .form-content { max-width: 360px; margin: 0 auto; }
        .form-content h2 { font-size: 2rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
        .form-subtitle { color: #64748b; font-size: 0.95rem; margin-bottom: 2rem; }
        .input-group { margin-bottom: 1.5rem; }
        .input-group label { display: block; font-size: 0.9rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 1rem; color: #94a3b8; font-size: 1.1rem; }
        .input-wrapper input {
          width: 100%; padding: 0.85rem 1rem 0.85rem 2.8rem;
          border: 2px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem;
          transition: all 0.3s ease; outline: none;
        }
        .input-wrapper input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .input-wrapper input:disabled { background: #f1f5f9; cursor: not-allowed; }
        .input-wrapper input::placeholder { color: #cbd5e1; }
        .form-options { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
        .checkbox-container { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #475569; cursor: pointer; }
        .checkbox-container input { width: 1rem; height: 1rem; accent-color: #3b82f6; }
        .forgot-link { color: #3b82f6; font-size: 0.9rem; text-decoration: none; font-weight: 500; }
        .forgot-link:hover { color: #1e40af; text-decoration: underline; }
        .signin-btn {
          width: 100%; padding: 0.9rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 600;
          cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(59,130,246,0.2);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .signin-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(59,130,246,0.3); }
        .signin-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .signin-btn.loading { background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); }
        .spinner {
          width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .divider { position: relative; text-align: center; margin: 1.5rem 0; }
        .divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e2e8f0; }
        .divider span { position: relative; background: white; padding: 0 0.75rem; color: #94a3b8; font-size: 0.9rem; }
        .social-login-btn {
          width: 100%; padding: 0.85rem; background: white; border: 2px solid #e2e8f0;
          border-radius: 12px; font-size: 0.95rem; font-weight: 500; color: #475569;
          display: flex; align-items: center; justify-content: center; gap: 0.75rem;
          cursor: pointer; transition: all 0.2s ease;
        }
        .social-login-btn:hover:not(:disabled) { background: #f8fafc; border-color: #3b82f6; }
        .social-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .social-icon { font-size: 1.2rem; font-weight: 600; color: #4285f4; }
        .signup-text { text-align: center; margin-top: 1.5rem; color: #64748b; font-size: 0.95rem; }
        .signup-text a { color: #3b82f6; font-weight: 600; text-decoration: none; }
        .signup-text a:hover { color: #1e40af; text-decoration: underline; }
        .guest-section { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px dashed #e2e8f0; text-align: center; }
        .guest-link {
          display: inline-flex; align-items: center; gap: 0.5rem; color: #64748b;
          text-decoration: none; font-size: 0.95rem; transition: all 0.2s ease;
          padding: 0.5rem 1rem; border-radius: 50px; background: #f8fafc;
        }
        .guest-link:hover { background: #f1f5f9; color: #1e293b; transform: translateY(-2px); }
        @media (max-width: 768px) {
          .login-card { flex-direction: column; max-width: 450px; }
          .login-branding { padding: 2rem 1.5rem; }
          .login-branding h1 { font-size: 1.8rem; }
          .login-form-container { padding: 2rem 1.5rem; }
          .back-to-home { top: 1rem; left: 1rem; }
        }
        @media (max-width: 480px) {
          .login-container { padding: 1rem; }
          .form-options { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
        }
      `}</style>
    </>
  );
};

export default Ulogin;