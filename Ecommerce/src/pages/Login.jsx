import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function LoginForm({ onLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isFocused, setIsFocused] = useState({ email: false, password: false });
  const emailRef = useRef(null);
  const navigate = useNavigate();

  // Your demo credentials
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
    // Auto-focus email field on mount
    if (emailRef.current) {
      setTimeout(() => emailRef.current.focus(), 100);
    }
  }, []);

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field-specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/admin/login", {
        email: formData.email,
        password: formData.password,
      });

      const user = response.data.user;

      if (onLogin) onLogin(user);

      // Remember email if checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Show success animation before navigation
      document.querySelector('.form-container').classList.add('success');
      setTimeout(() => {
        if (response.status === 200) {
          navigate("/admin");
        }
      }, 800);

    } catch (error) {
      console.error("Login error:", error);
      
      // Enhanced error handling
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage = "Invalid email or password. Please check your credentials.";
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
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      setError(errorMessage);
      
      // Shake animation for error
      document.querySelector('.form-container').classList.add('shake');
      setTimeout(() => {
        document.querySelector('.form-container').classList.remove('shake');
      }, 500);
      
    } finally {
      setLoading(false);
    }
  };

  const handleFocus = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: false }));
    // Validate field on blur
    if (field === 'email' && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setFormErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
      }
    }
    if (field === 'password' && formData.password && formData.password.length < 6) {
      setFormErrors(prev => ({ ...prev, password: "Password must be at least 6 characters" }));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e);
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  const handleUseDemoCredentials = () => {
    setFormData({
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password
    });
    setFormErrors({});
    setError("");
    
    // Show visual feedback
    const demoButton = document.querySelector('.demo-button');
    if (demoButton) {
      demoButton.classList.add('demo-activated');
      setTimeout(() => {
        demoButton.classList.remove('demo-activated');
      }, 1000);
    }
  };

  return (
    <div style={styles.container}>
      <div className="form-container" style={styles.formCard}>
        
        {/* Header with Logo */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

        {/* Error Message */}
        {error && (
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <div style={styles.errorMessage}>
              <strong>Login Failed</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} onKeyPress={handleKeyPress} style={styles.form}>
          
          {/* Email Field */}
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>
              <span style={styles.labelText}>Email Address</span>
              {formErrors.email && <span style={styles.errorText}> • {formErrors.email}</span>}
            </label>
            <div style={styles.inputWrapper}>
              <div style={styles.inputIcon}>✉️</div>
              <input
                ref={emailRef}
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => handleFocus('email')}
                onBlur={() => handleBlur('email')}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
                style={{
                  ...styles.input,
                  ...(isFocused.email ? styles.inputFocused : {}),
                  ...(formErrors.email ? styles.inputError : {}),
                }}
              />
              {formData.email && !formErrors.email && (
                <div style={styles.validIcon}>✓</div>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>
              <span style={styles.labelText}>Password</span>
              {formErrors.password && <span style={styles.errorText}> • {formErrors.password}</span>}
            </label>
            <div style={styles.inputWrapper}>
              <div style={styles.inputIcon}>🔒</div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => handleFocus('password')}
                onBlur={() => handleBlur('password')}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
                style={{
                  ...styles.input,
                  ...(isFocused.password ? styles.inputFocused : {}),
                  ...(formErrors.password ? styles.inputError : {}),
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.visibilityToggle}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <div style={styles.passwordStrength}>
              <div style={styles.strengthMeter}>
                <div style={{
                  ...styles.strengthBar,
                  width: formData.password.length === 0 ? '0%' :
                         formData.password.length < 3 ? '25%' :
                         formData.password.length < 6 ? '50%' :
                         formData.password.length < 8 ? '75%' : '100%',
                  backgroundColor: formData.password.length === 0 ? '#e2e8f0' :
                                  formData.password.length < 3 ? '#fc8181' :
                                  formData.password.length < 6 ? '#f6ad55' :
                                  formData.password.length < 8 ? '#68d391' : '#38a169'
                }} />
              </div>
              <span style={styles.strengthText}>
                {formData.password.length === 0 ? 'Enter password' :
                 formData.password.length < 3 ? 'Weak' :
                 formData.password.length < 6 ? 'Fair' :
                 formData.password.length < 8 ? 'Good' : 'Strong'}
              </span>
            </div>
          </div>

          {/* Options */}
          <div style={styles.optionsRow}>
            <label style={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={styles.checkbox}
                disabled={loading}
              />
              <span style={styles.checkboxLabel}>Remember me</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              style={styles.forgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              ...(loading ? styles.submitButtonLoading : {}),
            }}
          >
            {loading ? (
              <>
                <div style={styles.spinner}></div>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <div style={styles.buttonIcon}>→</div>
              </>
            )}
          </button>

          {/* Demo Credentials Section */}
          <div style={styles.demoSection}>
            <div style={styles.demoDivider}>
              <span style={styles.demoDividerText}>Quick Access</span>
            </div>
            <button
              type="button"
              onClick={handleUseDemoCredentials}
              className="demo-button"
              style={styles.demoButton}
              disabled={loading}
            >
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

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.securityInfo}>
            <div style={styles.securityIcon}>🔐</div>
            <span style={styles.securityText}>Secure Admin Portal</span>
          </div>
          <button
            onClick={() => navigate("/")}
            style={styles.backButton}
            disabled={loading}
          >
            ← Back to Homepage
          </button>
          <div style={styles.supportLink}>
            Need help? <a href="/support" style={styles.supportLinkAnchor}>Contact Support</a>
          </div>
        </div>

      </div>

      {/* Background Elements */}
      <div style={styles.background}>
        <div style={styles.backgroundCircle1}></div>
        <div style={styles.backgroundCircle2}></div>
        <div style={styles.backgroundCircle3}></div>
      </div>

      {/* Inline Styles for Animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes success {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
          
          @keyframes demoFill {
            0% { transform: scale(1); background-color: #f0f4ff; }
            50% { transform: scale(1.05); background-color: #667eea; color: white; }
            100% { transform: scale(1); background-color: #f0f4ff; }
          }
          
          .shake {
            animation: shake 0.5s ease-in-out;
          }
          
          .success {
            animation: success 0.8s ease-out;
          }
          
          .demo-activated {
            animation: demoFill 1s ease-out;
          }
          
          .form-container {
            animation: fadeIn 0.6s ease-out;
          }
          
          input:focus {
            border-color: #667eea !important;
            background-color: #ffffff !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
          }
          
          .demo-button:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2) !important;
          }
        `}
      </style>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#f8fafc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    margin: 0,
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: "hidden",
  },
  backgroundCircle1: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
    top: "-200px",
    right: "-200px",
  },
  backgroundCircle2: {
    position: "absolute",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)",
    bottom: "-150px",
    left: "-150px",
  },
  backgroundCircle3: {
    position: "absolute",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
    top: "50%",
    right: "10%",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)",
    padding: "48px",
    width: "100%",
    maxWidth: "480px",
    position: "relative",
    zIndex: 1,
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },
  header: {
    marginBottom: "40px",
    textAlign: "center",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  logoIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  companyName: {
    fontSize: "24px",
    fontWeight: "700",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#1a202c",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "16px",
    color: "#718096",
    margin: 0,
    fontWeight: "400",
  },
  errorContainer: {
    backgroundColor: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  errorIcon: {
    fontSize: "20px",
    flexShrink: 0,
    marginTop: "2px",
  },
  errorMessage: {
    flex: 1,
  },
  form: {
    marginBottom: "32px",
  },
  inputGroup: {
    marginBottom: "24px",
  },
  label: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  labelText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#4a5568",
  },
  errorText: {
    fontSize: "12px",
    color: "#e53e3e",
    fontWeight: "500",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "16px",
    fontSize: "18px",
    zIndex: 1,
    pointerEvents: "none",
  },
  validIcon: {
    position: "absolute",
    right: "16px",
    color: "#38a169",
    fontSize: "16px",
    fontWeight: "bold",
    zIndex: 2,
  },
  input: {
    width: "100%",
    padding: "16px 16px 16px 48px",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    fontSize: "15px",
    backgroundColor: "#f8fafc",
    transition: "all 0.2s ease",
    outline: "none",
    fontFamily: "inherit",
  },
  inputFocused: {
    borderColor: "#667eea",
    backgroundColor: "#ffffff",
    boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)",
  },
  inputError: {
    borderColor: "#e53e3e",
    backgroundColor: "#fff5f5",
  },
  visibilityToggle: {
    position: "absolute",
    right: "16px",
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    zIndex: 2,
  },
  passwordStrength: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "8px",
  },
  strengthMeter: {
    flex: 1,
    height: "4px",
    backgroundColor: "#e2e8f0",
    borderRadius: "2px",
    overflow: "hidden",
  },
  strengthBar: {
    height: "100%",
    borderRadius: "2px",
    transition: "width 0.3s ease, background-color 0.3s ease",
  },
  strengthText: {
    fontSize: "12px",
    color: "#718096",
    minWidth: "40px",
    textAlign: "right",
  },
  optionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
  },
  checkboxContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    userSelect: "none",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    borderRadius: "4px",
    border: "2px solid #cbd5e0",
    appearance: "none",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.2s ease",
  },
  checkboxLabel: {
    fontSize: "14px",
    color: "#4a5568",
    fontWeight: "500",
  },
  forgotPassword: {
    background: "none",
    border: "none",
    color: "#667eea",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "4px",
    transition: "all 0.2s ease",
    textDecoration: "none",
  },
  submitButton: {
    width: "100%",
    padding: "18px 24px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    fontFamily: "inherit",
    position: "relative",
    overflow: "hidden",
  },
  submitButtonLoading: {
    cursor: "not-allowed",
    opacity: 0.9,
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTop: "2px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  buttonIcon: {
    fontSize: "18px",
    transition: "transform 0.2s ease",
  },
  demoSection: {
    marginTop: "32px",
    textAlign: "center",
  },
  demoDivider: {
    position: "relative",
    marginBottom: "20px",
  },
  demoDividerText: {
    display: "inline-block",
    padding: "0 16px",
    backgroundColor: "#ffffff",
    color: "#a0aec0",
    fontSize: "14px",
    fontWeight: "500",
    position: "relative",
    zIndex: 1,
  },
  demoButton: {
    width: "100%",
    padding: "14px 24px",
    backgroundColor: "#f0f4ff",
    color: "#667eea",
    border: "2px solid #cbd5e0",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  demoButtonIcon: {
    fontSize: "18px",
  },
  credentialDisplay: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "8px",
  },
  credentialItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
    justifyContent: "center",
  },
  credentialLabel: {
    fontSize: "13px",
    color: "#718096",
    fontWeight: "500",
    minWidth: "60px",
    textAlign: "right",
  },
  credentialValue: {
    fontSize: "13px",
    backgroundColor: "#e2e8f0",
    padding: "4px 10px",
    borderRadius: "6px",
    fontFamily: "'Roboto Mono', monospace",
    color: "#2d3748",
    fontWeight: "500",
  },
  demoNote: {
    fontSize: "12px",
    color: "#a0aec0",
    fontStyle: "italic",
  },
  demoHint: {
    fontSize: "14px",
    color: "#4a5568",
    lineHeight: 1.4,
  },
  footer: {
    paddingTop: "24px",
    borderTop: "1px solid #edf2f7",
  },
  securityInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    color: "#718096",
  },
  securityIcon: {
    fontSize: "16px",
  },
  securityText: {
    fontWeight: "500",
  },
  backButton: {
    width: "100%",
    padding: "12px 24px",
    backgroundColor: "transparent",
    color: "#667eea",
    border: "1px solid #cbd5e0",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginBottom: "16px",
  },
  supportLink: {
    textAlign: "center",
    fontSize: "14px",
    color: "#718096",
  },
  supportLinkAnchor: {
    color: "#667eea",
    textDecoration: "none",
    fontWeight: "500",
    transition: "color 0.2s ease",
  },
};

// Add hover effects
Object.assign(styles, {
  formCard: {
    ...styles.formCard,
    ':hover': {
      boxShadow: "0 25px 70px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.02)",
    }
  },
  checkbox: {
    ...styles.checkbox,
    ':checked': {
      backgroundColor: "#667eea",
      borderColor: "#667eea",
    },
    ':checked::after': {
      content: '"✓"',
      position: "absolute",
      color: "white",
      fontSize: "12px",
      fontWeight: "bold",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    }
  },
  forgotPassword: {
    ...styles.forgotPassword,
    ':hover': {
      backgroundColor: "#f0f4ff",
      transform: "translateY(-1px)",
    }
  },
  submitButton: {
    ...styles.submitButton,
    ':hover:not(:disabled)': {
      transform: "translateY(-2px)",
      boxShadow: "0 12px 30px rgba(102, 126, 234, 0.4)",
    },
    ':hover:not(:disabled) .buttonIcon': {
      transform: "translateX(3px)",
    }
  },
  demoButton: {
    ...styles.demoButton,
    ':hover:not(:disabled)': {
      backgroundColor: "#667eea",
      color: "#ffffff",
      borderColor: "#667eea",
      transform: "translateY(-2px)",
      boxShadow: "0 8px 20px rgba(102, 126, 234, 0.2)",
    }
  },
  backButton: {
    ...styles.backButton,
    ':hover:not(:disabled)': {
      backgroundColor: "#f0f4ff",
      borderColor: "#667eea",
    }
  },
  supportLinkAnchor: {
    ...styles.supportLinkAnchor,
    ':hover': {
      color: "#553c9a",
      textDecoration: "underline",
    }
  },
  visibilityToggle: {
    ...styles.visibilityToggle,
    ':hover': {
      backgroundColor: "#f0f4ff",
    }
  }
});