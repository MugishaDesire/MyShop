import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function LoginForm({ onLogin }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isFocused, setIsFocused] = useState({ email: false, password: false });
  const emailRef = useRef(null);
  const navigate = useNavigate();

  const DEMO_CREDENTIALS = {
    email: "mugisha@gmail.com",
    password: "Password123"
  };

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
    if (emailRef.current) {
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, []);

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!emailRegex.test(formData.email)) errors.email = "Please enter a valid email address";
    if (!formData.password) errors.password = "Password is required";
    else if (formData.password.length < 6) errors.password = "Password must be at least 6 characters";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: "" }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/admin/login", {
        email: formData.email,
        password: formData.password,
      });

      console.log("Login response:", response.data); // DEBUG — remove after confirming

      // ✅ DEFENSIVE: handle both { user: {...} } and { id, email, ... } response shapes
      const user = response.data.admin ?? response.data.user ?? response.data;

      // ✅ Validate we actually got something real before storing
      if (!user || typeof user !== "object" || Object.keys(user).length === 0) {
        setError("Login failed: unexpected server response. Please contact support.");
        setLoading(false);
        return;
      }

      // ✅ Store in localStorage FIRST — before any state updates or navigation
      localStorage.setItem("authUser", JSON.stringify(user));

      // ✅ Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // ✅ Sync parent App state (for Navbar etc.) — AFTER storage is set
      if (onLogin) onLogin(user);

      // ✅ Navigate LAST — using replace so back button doesn't return to login
      navigate("/admin", { replace: true });

    } catch (err) {
      console.error("Login error:", err);

      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err.response) {
        switch (err.response.status) {
          case 401: errorMessage = "Invalid email or password. Please check your credentials."; break;
          case 403: errorMessage = "Access denied. Please contact your administrator."; break;
          case 404: errorMessage = "Service unavailable. Please try again later."; break;
          case 500: errorMessage = "Server error. Please try again in a few moments."; break;
          default:  errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err.request) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      setError(errorMessage);
      const container = document.querySelector(".form-container");
      container?.classList.add("shake");
      setTimeout(() => container?.classList.remove("shake"), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleFocus = (field) => setIsFocused(prev => ({ ...prev, [field]: true }));

  const handleBlur = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: false }));
    if (field === "email" && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setFormErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
      }
    }
    if (field === "password" && formData.password && formData.password.length < 6) {
      setFormErrors(prev => ({ ...prev, password: "Password must be at least 6 characters" }));
    }
  };

  const handleUseDemoCredentials = () => {
    setFormData({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
    setFormErrors({});
    setError("");
  };

  const getInputStyle = (field) => ({
    ...styles.input,
    ...(isFocused[field] ? styles.inputFocused : {}),
    ...(formErrors[field] ? styles.inputError : {}),
  });

  return (
    <div style={styles.container}>
      <div className="form-container" style={styles.formCard}>

        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="url(#gradient)" />
                <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" fill="url(#gradient)" />
                <defs>
                  <linearGradient id="gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#667eea" />
                    <stop offset="1" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 style={styles.companyName}>Admin Portal</h1>
          </div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Sign in to your admin dashboard</p>
        </div>

        {error && (
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <div style={styles.errorMessage}>
              <strong>Login Failed</strong>
              <p style={{ margin: "4px 0 0 0" }}>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>
              <span style={styles.labelText}>Email Address</span>
              {formErrors.email && <span style={styles.errorText}> • {formErrors.email}</span>}
            </label>
            <div style={styles.inputWrapper}>
              <div style={styles.inputIcon}>✉️</div>
              <input
                ref={emailRef}
                type="email" id="email" name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => handleFocus("email")}
                onBlur={() => handleBlur("email")}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
                style={getInputStyle("email")}
              />
              {formData.email && !formErrors.email && <div style={styles.validIcon}>✓</div>}
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>
              <span style={styles.labelText}>Password</span>
              {formErrors.password && <span style={styles.errorText}> • {formErrors.password}</span>}
            </label>
            <div style={styles.inputWrapper}>
              <div style={styles.inputIcon}>🔒</div>
              <input
                type={showPassword ? "text" : "password"}
                id="password" name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => handleFocus("password")}
                onBlur={() => handleBlur("password")}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
                style={getInputStyle("password")}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={styles.visibilityToggle} disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <div style={styles.passwordStrength}>
              <div style={styles.strengthMeter}>
                <div style={{
                  ...styles.strengthBar,
                  width: formData.password.length === 0 ? "0%" : formData.password.length < 3 ? "25%" : formData.password.length < 6 ? "50%" : formData.password.length < 8 ? "75%" : "100%",
                  backgroundColor: formData.password.length === 0 ? "#e2e8f0" : formData.password.length < 3 ? "#fc8181" : formData.password.length < 6 ? "#f6ad55" : formData.password.length < 8 ? "#68d391" : "#38a169",
                }} />
              </div>
              <span style={styles.strengthText}>
                {formData.password.length === 0 ? "Enter password" : formData.password.length < 3 ? "Weak" : formData.password.length < 6 ? "Fair" : formData.password.length < 8 ? "Good" : "Strong"}
              </span>
            </div>
          </div>

          <div style={styles.optionsRow}>
            <label style={styles.checkboxContainer}>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={loading} />
              <span style={styles.checkboxLabel}>Remember me</span>
            </label>
            <button type="button" onClick={() => navigate("/forgot-password")} style={styles.forgotPassword} disabled={loading}>
              Forgot password?
            </button>
          </div>

          <button type="submit" disabled={loading} style={{ ...styles.submitButton, ...(loading ? styles.submitButtonLoading : {}) }}>
            {loading ? (
              <><div style={styles.spinner}></div><span>Signing In...</span></>
            ) : (
              <><span>Sign In</span><div style={styles.buttonIcon}>→</div></>
            )}
          </button>

          <div style={styles.demoSection}>
            <div style={styles.demoDivider}>
              <span style={styles.demoDividerText}>Quick Access</span>
            </div>
            <button type="button" onClick={handleUseDemoCredentials} className="demo-button" style={styles.demoButton} disabled={loading}>
              <span style={styles.demoButtonIcon}>🚀</span>
              Use Demo Credentials
            </button>
            <div style={styles.demoHint}>
              <div style={styles.credentialDisplay}>
                <div style={styles.credentialItem}>
                  <span style={styles.credentialLabel}>Email:</span>
                  <code style={styles.credentialValue}>{DEMO_CREDENTIALS.email}</code>
                </div>
                <div style={styles.credentialItem}>
                  <span style={styles.credentialLabel}>Password:</span>
                  <code style={styles.credentialValue}>{DEMO_CREDENTIALS.password}</code>
                </div>
              </div>
              <small style={styles.demoNote}>Click above to auto-fill demo credentials</small>
            </div>
          </div>
        </form>

        <div style={styles.footer}>
          <div style={styles.securityInfo}>
            <div style={styles.securityIcon}>🔐</div>
            <span style={styles.securityText}>Secure Admin Portal</span>
          </div>
          <button onClick={() => navigate("/")} style={styles.backButton} disabled={loading}>
            ← Back to Homepage
          </button>
          <div style={styles.supportLink}>
            Need help? <a href="/contact" style={styles.supportLinkAnchor}>Contact Support</a>
          </div>
        </div>
      </div>

      <div style={styles.background}>
        <div style={styles.backgroundCircle1}></div>
        <div style={styles.backgroundCircle2}></div>
        <div style={styles.backgroundCircle3}></div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes demoFill { 0% { background-color: #f0f4ff; color: #667eea; } 50% { background-color: #667eea; color: white; } 100% { background-color: #f0f4ff; color: #667eea; } }
        .shake { animation: shake 0.5s ease-in-out; }
        .form-container { animation: fadeIn 0.6s ease-out; }
        .demo-button:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 8px 20px rgba(102,126,234,0.2) !important; }
      `}</style>
    </div>
  );
}

const styles = {
  container: { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: "#f8fafc", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", margin: 0, padding: "20px", position: "relative", overflow: "hidden" },
  background: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: "hidden" },
  backgroundCircle1: { position: "absolute", width: "400px", height: "400px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)", top: "-200px", right: "-200px" },
  backgroundCircle2: { position: "absolute", width: "300px", height: "300px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)", bottom: "-150px", left: "-150px" },
  backgroundCircle3: { position: "absolute", width: "200px", height: "200px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%)", top: "50%", right: "10%" },
  formCard: { backgroundColor: "#ffffff", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.08)", padding: "48px", width: "100%", maxWidth: "480px", position: "relative", zIndex: 1 },
  header: { marginBottom: "40px", textAlign: "center" },
  logoContainer: { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" },
  logoIcon: { display: "flex", alignItems: "center", justifyContent: "center" },
  companyName: { fontSize: "24px", fontWeight: "700", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 },
  title: { fontSize: "32px", fontWeight: "700", color: "#1a202c", margin: "0 0 8px 0" },
  subtitle: { fontSize: "16px", color: "#718096", margin: 0 },
  errorContainer: { backgroundColor: "#fff5f5", borderWidth: "1px", borderStyle: "solid", borderColor: "#fed7d7", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "flex", alignItems: "flex-start", gap: "12px" },
  errorIcon: { fontSize: "20px", flexShrink: 0 },
  errorMessage: { flex: 1, fontSize: "14px", color: "#c53030" },
  form: { marginBottom: "32px" },
  inputGroup: { marginBottom: "24px" },
  label: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  labelText: { fontSize: "14px", fontWeight: "600", color: "#4a5568" },
  errorText: { fontSize: "12px", color: "#e53e3e", fontWeight: "500" },
  inputWrapper: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: "16px", fontSize: "18px", zIndex: 1, pointerEvents: "none" },
  validIcon: { position: "absolute", right: "16px", color: "#38a169", fontSize: "16px", fontWeight: "bold", zIndex: 2 },
  input: { width: "100%", padding: "16px 16px 16px 48px", borderWidth: "2px", borderStyle: "solid", borderColor: "#e2e8f0", borderRadius: "12px", fontSize: "15px", backgroundColor: "#f8fafc", transition: "all 0.2s ease", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  inputFocused: { borderColor: "#667eea", backgroundColor: "#ffffff", boxShadow: "0 0 0 3px rgba(102,126,234,0.1)" },
  inputError: { borderColor: "#e53e3e", backgroundColor: "#fff5f5" },
  visibilityToggle: { position: "absolute", right: "16px", background: "none", borderWidth: 0, fontSize: "18px", cursor: "pointer", padding: "4px", borderRadius: "4px", zIndex: 2 },
  passwordStrength: { display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" },
  strengthMeter: { flex: 1, height: "4px", backgroundColor: "#e2e8f0", borderRadius: "2px", overflow: "hidden" },
  strengthBar: { height: "100%", borderRadius: "2px", transition: "width 0.3s ease, background-color 0.3s ease" },
  strengthText: { fontSize: "12px", color: "#718096", minWidth: "40px", textAlign: "right" },
  optionsRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" },
  checkboxContainer: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" },
  checkboxLabel: { fontSize: "14px", color: "#4a5568", fontWeight: "500" },
  forgotPassword: { background: "none", borderWidth: 0, color: "#667eea", fontSize: "14px", fontWeight: "500", cursor: "pointer", padding: "4px 8px", borderRadius: "4px" },
  submitButton: { width: "100%", padding: "18px 24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "#ffffff", borderWidth: 0, borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontFamily: "inherit" },
  submitButtonLoading: { cursor: "not-allowed", opacity: 0.9 },
  spinner: { width: "20px", height: "20px", borderWidth: "2px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#ffffff", borderRadius: "50%", animation: "spin 1s linear infinite" },
  buttonIcon: { fontSize: "18px" },
  demoSection: { marginTop: "32px", textAlign: "center" },
  demoDivider: { position: "relative", marginBottom: "20px" },
  demoDividerText: { display: "inline-block", padding: "0 16px", backgroundColor: "#ffffff", color: "#a0aec0", fontSize: "14px", fontWeight: "500" },
  demoButton: { width: "100%", padding: "14px 24px", backgroundColor: "#f0f4ff", color: "#667eea", borderWidth: "2px", borderStyle: "solid", borderColor: "#cbd5e0", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  demoButtonIcon: { fontSize: "18px" },
  credentialDisplay: { backgroundColor: "#f8fafc", borderRadius: "8px", padding: "12px", marginBottom: "8px" },
  credentialItem: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", justifyContent: "center" },
  credentialLabel: { fontSize: "13px", color: "#718096", fontWeight: "500", minWidth: "60px", textAlign: "right" },
  credentialValue: { fontSize: "13px", backgroundColor: "#e2e8f0", padding: "4px 10px", borderRadius: "6px", fontFamily: "monospace", color: "#2d3748", fontWeight: "500" },
  demoNote: { fontSize: "12px", color: "#a0aec0", fontStyle: "italic" },
  demoHint: { fontSize: "14px", color: "#4a5568", lineHeight: 1.4 },
  footer: { paddingTop: "24px", borderTop: "1px solid #edf2f7" },
  securityInfo: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "20px", fontSize: "14px", color: "#718096" },
  securityIcon: { fontSize: "16px" },
  securityText: { fontWeight: "500" },
  backButton: { width: "100%", padding: "12px 24px", backgroundColor: "transparent", color: "#667eea", borderWidth: "1px", borderStyle: "solid", borderColor: "#cbd5e0", borderRadius: "12px", fontSize: "15px", fontWeight: "500", cursor: "pointer", marginBottom: "16px" },
  supportLink: { textAlign: "center", fontSize: "14px", color: "#718096" },
  supportLinkAnchor: { color: "#667eea", textDecoration: "none", fontWeight: "500" },
};
