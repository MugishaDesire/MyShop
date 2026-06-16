import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const Ulogin = ({ onLogin }) => {
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [role,          setRole]          = useState("user");
  const [rememberMe,    setRememberMe]    = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [shake,         setShake]         = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  const redirectAfterLogin =
    location.state?.from || localStorage.getItem("redirectAfterLogin") || null;

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
        role,
      });

      const user = response.data.user;
      if (!user) throw new Error("Invalid response from server - no user data");

      localStorage.setItem("user", JSON.stringify(user));

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      setTimeout(() => {
        const pendingRedirect = localStorage.getItem("redirectAfterLogin") || null;

        const pendingCart = (() => {
          try {
            return JSON.parse(localStorage.getItem("shoppingCart") || "[]");
          } catch { return []; }
        })();

        const pendingProduct = (() => {
          try {
            const raw = localStorage.getItem("buyNowProduct");
            return raw ? JSON.parse(raw) : null;
          } catch { return null; }
        })();

        localStorage.removeItem("redirectAfterLogin");
        localStorage.removeItem("buyNowProduct");

        if (user.role === "courier") {
          if (onLogin) onLogin(user);
          navigate("/courier/dashboard", { replace: true });
        } else if (pendingRedirect === "checkout" && pendingCart.length > 0) {
          navigate("/checkout", { state: { cart: pendingCart, user }, replace: true });
          if (onLogin) onLogin(user);
        } else if (pendingRedirect && pendingRedirect.startsWith("order/") && pendingProduct) {
          navigate(`/${pendingRedirect}`, { state: { product: pendingProduct, user }, replace: true });
          if (onLogin) onLogin(user);
        } else {
          if (onLogin) onLogin(user);
          navigate("/userdashboard", { replace: true });
        }
      }, 800);

    } catch (err) {
      console.error("Login error:", err);

      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err.response) {
        switch (err.response.status) {
          case 401:
            errorMessage = "Invalid email or password. Please check your credentials.";
            break;
          case 403:
            errorMessage = err.response.data?.message ||
              "This account is not registered for the selected role.";
            break;
          case 404:
            errorMessage = "Service unavailable. Please try again later.";
            break;
          case 500:
            errorMessage = "Server error. Please try again in a few moments.";
            break;
          default:
            errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err.request) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      setError(errorMessage);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-page">

        {/* Back to home */}
        <div className="back-to-home">
          <Link to="/" className="back-home-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to Shopping
          </Link>
        </div>

        <div className="login-container">
          <div className={`login-card${shake ? " shake" : ""}`}>

            {/* Brand header */}
            <div className="login-header">
              <div className="header-inner">
                <div className="logo-wrap">
                  <div className="logo-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      {/* <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/> */}
                    </svg>
                  </div>
                  <span className="logo-text">🛍️ MyShop</span>
                </div>
                <p className="header-sub">Sign in to continue</p>
              </div>
            </div>

            {/* Form area */}
            <div className="login-body">

              {/* Role selector */}
              <div className="role-tabs">
                <button
                  type="button"
                  className={`role-tab${role === "user" ? " active active-user" : ""}`}
                  onClick={() => setRole("user")}
                  disabled={loading}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Customer
                </button>
                <button
                  type="button"
                  className={`role-tab${role === "courier" ? " active active-courier" : ""}`}
                  onClick={() => setRole("courier")}
                  disabled={loading}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="1"/>
                    <path d="M16 8h4l3 5v3h-7V8z"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  Courier
                </button>
              </div>

              {/* Redirect info banner */}
              {redirectAfterLogin && (
                <div className="info-banner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  Please sign in to continue with your{" "}
                  {redirectAfterLogin === "checkout" ? "checkout" : "order"}
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="error-banner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>

                {/* Email */}
                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <div className="input-wrap">
                    <span className="input-prefix">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="M2 7l10 7 10-7"/>
                      </svg>
                    </span>
                    <input
                      type="email"
                      id="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="input-wrap">
                    <span className="input-prefix">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={loading}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={0}
                    >
                      {showPassword ? (
                        /* Eye-off icon */
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        /* Eye icon */
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me + Forgot */}
                <div className="form-options">
                  <label className="remember-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark" />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="forgot-link">
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className={`submit-btn${role === "courier" ? " courier" : " user"}${loading ? " loading" : ""}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      {role === "courier" ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" rx="1"/>
                          <path d="M16 8h4l3 5v3h-7V8z"/>
                          <circle cx="5.5" cy="18.5" r="2.5"/>
                          <circle cx="18.5" cy="18.5" r="2.5"/>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      )}
                      Sign in as {role === "courier" ? "Courier" : "Customer"}
                    </>
                  )}
                </button>
              </form>

              {/* Customer-only extras */}
              {role === "user" && (
                <>
                  <div className="divider"><span>or</span></div>

                  <button
                        className="google-btn"
                        disabled={loading}
                        onClick={() => {
                          const appState = localStorage.getItem("redirectAfterLogin") || "";
                          const url = appState
                            ? `http://localhost:5000/user/auth/google?appState=${encodeURIComponent(appState)}`
                            : "http://localhost:5000/user/auth/google";
                          window.location.href = url;
                        }}
                        type="button"
                      >
                  
                    <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <p className="signup-text">
                    Don't have an account?{" "}
                    <Link to="/Signup">Sign up now</Link>
                  </p>

                  <div className="guest-section">
                    <Link to="/" className="guest-link">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
                        <path d="M19 8v8M15 12h8"/>
                      </svg>
                      Continue as Guest
                    </Link>
                  </div>
                </>
              )}

              {/* Courier hint */}
              {role === "courier" && (
                <div className="courier-hint">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                  Courier accounts are created by the admin. Contact your administrator if you don't have an account.
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          min-height: 100vh;
          background: #f0f2f5;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        /* ── Back link ── */
        .back-to-home {
          position: fixed;
          top: 1.25rem;
          left: 1.5rem;
          z-index: 100;
        }
        .back-home-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          color: #475569;
          font-size: 13px;
          font-weight: 500;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 50px;
          padding: 7px 14px;
          transition: all .2s;
        }
        .back-home-link:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #1e293b;
        }

        /* ── Card ── */
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 5rem 1rem 2rem;
          width: 100%;
        }
        .login-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,.07);
        }
        .login-card.shake {
          animation: shake .45s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%,45%,75% { transform: translateX(-6px); }
          30%,60%,90% { transform: translateX(6px); }
        }

        /* ── Header ── */
        .login-header {
          background: #1a1f2e;
          padding: 1.5rem 1.75rem 1.35rem;
        }
        .header-inner { display: flex; flex-direction: column; gap: 4px; }
        .logo-wrap { display: flex; align-items: center; gap: 10px; }
        .logo-icon {
          width: 34px; height: 34px;
          // background: #2563eb;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .logo-text { font-size: 18px; font-weight: 600; color: #f8fafc; letter-spacing: -.3px; }
        .header-sub { font-size: 13px; color: #94a3b8; padding-left: 44px; }

        /* ── Body ── */
        .login-body { padding: 1.5rem 1.75rem 1.75rem; }

        /* ── Role tabs ── */
        .role-tabs {
          display: flex;
          gap: 6px;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 1.25rem;
        }
        .role-tab {
          flex: 1;
          padding: 8px 0;
          border: none;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #64748b;
          background: transparent;
          transition: all .18s;
        }
        .role-tab:hover:not(:disabled) { color: #1e293b; }
        .role-tab.active {
          background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,.1);
        }
        .role-tab.active-user  { color: #1d4ed8; }
        .role-tab.active-courier { color: #92400e; }
        .role-tab:disabled { opacity: .5; cursor: not-allowed; }

        /* ── Banners ── */
        .info-banner, .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 1rem;
        }
        .info-banner  { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .error-banner { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
        .info-banner svg, .error-banner svg { flex-shrink: 0; margin-top: 1px; }

        /* ── Fields ── */
        .field { margin-bottom: 1.1rem; }
        .field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
          letter-spacing: .2px;
          text-transform: uppercase;
        }
        .input-wrap {
          display: flex;
          align-items: center;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          transition: border-color .15s, box-shadow .15s;
          overflow: hidden;
        }
        .input-wrap:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,.12);
        }
        .input-prefix {
          padding: 0 10px;
          display: flex;
          align-items: center;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .input-wrap input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: #1e293b;
          padding: 11px 10px 11px 0;
          min-width: 0;
          font-family: inherit;
        }
        .input-wrap input::placeholder { color: #cbd5e1; }
        .input-wrap input:disabled { background: transparent; cursor: not-allowed; opacity: .6; }

        /* ── Eye button ── */
        .eye-btn {
          background: none;
          border: none;
          padding: 0 10px;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          flex-shrink: 0;
          transition: color .15s;
          outline: none;
        }
        .eye-btn:hover:not(:disabled) { color: #475569; }
        .eye-btn:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
          border-radius: 6px;
        }
        .eye-btn:disabled { cursor: not-allowed; opacity: .5; }

        /* ── Options row ── */
        .form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }
        .remember-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          user-select: none;
        }
        .remember-label input[type="checkbox"] {
          width: 15px;
          height: 15px;
          accent-color: #3b82f6;
          cursor: pointer;
        }
        .forgot-link {
          color: #2563eb;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
        }
        .forgot-link:hover { text-decoration: underline; }

        /* ── Submit button ── */
        .submit-btn {
          width: 100%;
          padding: 11px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: all .2s;
          font-family: inherit;
        }
        .submit-btn.user    { background: #2563eb; }
        .submit-btn.courier { background: #b45309; }
        .submit-btn.user:hover:not(:disabled)    { background: #1d4ed8; }
        .submit-btn.courier:hover:not(:disabled) { background: #92400e; }
        .submit-btn:active:not(:disabled) { transform: scale(.98); }
        .submit-btn:disabled { opacity: .65; cursor: not-allowed; }
        .submit-btn.loading { background: #94a3b8 !important; }

        /* ── Spinner ── */
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.35);
          border-radius: 50%;
          border-top-color: white;
          animation: spin .8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Divider ── */
        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 1.25rem 0;
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }
        .divider span { font-size: 12px; color: #94a3b8; white-space: nowrap; }

        /* ── Google button ── */
        .google-btn {
          width: 100%;
          padding: 10px;
          background: white;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: #374151;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all .18s;
          font-family: inherit;
          margin-bottom: 1.1rem;
        }
        .google-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #93c5fd;
        }
        .google-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* ── Sign up & guest ── */
        .signup-text {
          text-align: center;
          font-size: 13px;
          color: #64748b;
          margin-bottom: .9rem;
        }
        .signup-text a { color: #2563eb; font-weight: 600; text-decoration: none; }
        .signup-text a:hover { text-decoration: underline; }

        .guest-section { text-align: center; }
        .guest-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 50px;
          transition: all .18s;
        }
        .guest-link:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #1e293b;
        }

        /* ── Courier hint ── */
        .courier-hint {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12.5px;
          color: #92400e;
          line-height: 1.55;
          margin-top: 1rem;
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .login-body { padding: 1.25rem 1.25rem 1.5rem; }
          .login-header { padding: 1.25rem; }
          .back-to-home { top: .75rem; left: .75rem; }
          .form-options { flex-direction: column; align-items: flex-start; gap: 8px; }
        }
      `}</style>
    </>
  );
};

export default Ulogin;