import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid 10-digit phone number";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain at least one letter and one number";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = "You must agree to the terms and conditions";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      const payload = {
        fullname: formData.name,
        phonenumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
      };

      console.log("📤 Sending payload:", payload);

      const response = await axios.post("http://localhost:5000/user/register", payload);

      console.log("✅ Response:", response.data);

      if (response.status === 201) {
        alert("✅ Account created successfully! Please login.");
        navigate("/ulogin");
      }
    } catch (error) {
      console.error("❌ Signup error:", error);
      console.error("❌ Error response:", error.response?.data);

      if (error.response) {
        setServerError(error.response.data.message || "Signup failed. Please try again.");
      } else if (error.request) {
        setServerError("Network error. Please check your connection.");
      } else {
        setServerError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── SVG icons ── */
  const IconUser = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );

  const IconPhone = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <circle cx="12" cy="17" r="1"/>
    </svg>
  );

  const IconMail = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M2 7l10 7 10-7"/>
    </svg>
  );

  const IconLock = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );

  const IconEye = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const IconEyeOff = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  const IconAlert = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4M12 16h.01"/>
    </svg>
  );

  return (
    <>
      <div className="signup-page">
        <div className="signup-container">
          <div className="signup-card">

            {/* ── Left branding panel ── */}
            <div className="signup-branding">
              <div className="brand-content">
                <div className="logo-wrap">
                  <div className="logo-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      {/* <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/> */}
                    </svg>
                  </div>
                  <span className="logo-text">🛍️ MyShop</span>
                </div>

                <h1>Join Us Today</h1>
                <p className="brand-desc">Create your account and start shopping in minutes.</p>

                <div className="brand-features">
                  <div className="feature-item">
                    <span className="feature-dot" />
                    Free shipping on first order
                  </div>
                  <div className="feature-item">
                    <span className="feature-dot" />
                    Exclusive member deals
                  </div>
                  <div className="feature-item">
                    <span className="feature-dot" />
                    Easy returns & refunds
                  </div>
                </div>

                <div className="testimonial-card">
                  <p>"Amazing platform! Highly recommended."</p>
                  <span>— Happy Customer</span>
                </div>
              </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="signup-form-container">
              <div className="form-content">
                <h2>Create Account</h2>
                <p className="form-subtitle">Fill in your details to get started</p>

                {/* Server error */}
                {serverError && (
                  <div className="server-error">
                    <IconAlert />
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>

                  {/* Full Name */}
                  <div className="field">
                    <label htmlFor="name">Full name</label>
                    <div className={`input-wrap${errors.name ? " has-error" : ""}`}>
                      <span className="input-prefix"><IconUser /></span>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        autoComplete="name"
                      />
                    </div>
                    {errors.name && <span className="field-error">{errors.name}</span>}
                  </div>

                  {/* Phone */}
                  <div className="field">
                    <label htmlFor="phoneNumber">Phone number</label>
                    <div className={`input-wrap${errors.phoneNumber ? " has-error" : ""}`}>
                      <span className="input-prefix"><IconPhone /></span>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        placeholder="1234567890"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        maxLength="10"
                        autoComplete="tel"
                      />
                    </div>
                    {errors.phoneNumber
                      ? <span className="field-error">{errors.phoneNumber}</span>
                      : <span className="field-hint">Enter 10-digit mobile number</span>
                    }
                  </div>

                  {/* Email */}
                  <div className="field">
                    <label htmlFor="email">Email address</label>
                    <div className={`input-wrap${errors.email ? " has-error" : ""}`}>
                      <span className="input-prefix"><IconMail /></span>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>

                  {/* Password */}
                  <div className="field">
                    <label htmlFor="password">Password</label>
                    <div className={`input-wrap${errors.password ? " has-error" : ""}`}>
                      <span className="input-prefix"><IconLock /></span>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                    {errors.password
                      ? <span className="field-error">{errors.password}</span>
                      : <span className="field-hint">Minimum 6 characters with letters and numbers</span>
                    }
                  </div>

                  {/* Confirm Password */}
                  <div className="field">
                    <label htmlFor="confirmPassword">Confirm password</label>
                    <div className={`input-wrap${errors.confirmPassword ? " has-error" : ""}`}>
                      <span className="input-prefix"><IconLock /></span>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <span className="field-error">{errors.confirmPassword}</span>
                    )}
                  </div>

                  {/* Terms */}
                  <div className="terms-field">
                    <label className="terms-label">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                      />
                      <span className="terms-text">
                        I agree to the{" "}
                        <Link to="/terms">Terms of Service</Link> and{" "}
                        <Link to="/privacy">Privacy Policy</Link>
                      </span>
                    </label>
                    {errors.agreeTerms && (
                      <span className="field-error">{errors.agreeTerms}</span>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" />
                        Creating account…
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                        Create Account
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="divider"><span>or</span></div>

                {/* Google signup */}
                <button className="google-btn" type="button">
                  <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Sign up with Google
                </button>

                <p className="login-text">
                  Already have an account?{" "}
                  <Link to="/ulogin">Sign in</Link>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .signup-page {
          min-height: 100vh;
          background: #f0f2f5;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Outer container ── */
        .signup-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem 1rem;
          width: 100%;
        }

        /* ── Card ── */
        .signup-card {
          display: flex;
          max-width: 960px;
          width: 100%;
          background: white;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 32px rgba(0,0,0,.08);
          overflow: hidden;
        }

        /* ── Left branding ── */
        .signup-branding {
          flex: 0 0 320px;
          background: #1a1f2e;
          color: white;
          padding: 2.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-content { width: 100%; }

        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 2rem;
        }
        .logo-icon {
          width: 34px; height: 34px;
          // background: #201f30;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .logo-text { font-size: 18px; font-weight: 600; color: #f8fafc; letter-spacing: -.3px; }

        .brand-content h1 {
          font-size: 1.75rem;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: .5rem;
          letter-spacing: -.3px;
        }
        .brand-desc {
          font-size: 13.5px;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 1.75rem;
        }

        .brand-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 2rem;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #cbd5e1;
        }
        .feature-dot {
          width: 6px; height: 6px;
          background: #3b82f6;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .testimonial-card {
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px;
          padding: 14px 16px;
        }
        .testimonial-card p {
          font-size: 13px;
          font-style: italic;
          color: #e2e8f0;
          margin-bottom: 6px;
          line-height: 1.5;
        }
        .testimonial-card span { font-size: 12px; color: #94a3b8; }

        /* ── Right form ── */
        .signup-form-container {
          flex: 1;
          padding: 2.5rem 2.25rem;
          background: white;
          overflow-y: auto;
        }

        .form-content { max-width: 380px; margin: 0 auto; }

        .form-content h2 {
          font-size: 1.6rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
          letter-spacing: -.3px;
        }
        .form-subtitle {
          font-size: 13.5px;
          color: #64748b;
          margin-bottom: 1.5rem;
        }

        /* ── Server error ── */
        .server-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 1.25rem;
        }

        /* ── Fields ── */
        .field { margin-bottom: 1rem; }

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
        .input-wrap.has-error { border-color: #ef4444; }
        .input-wrap.has-error:focus-within {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239,68,68,.1);
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
          padding: 10px 10px 10px 0;
          font-family: inherit;
          min-width: 0;
        }
        .input-wrap input::placeholder { color: #cbd5e1; }
        .input-wrap input:disabled { opacity: .6; cursor: not-allowed; }

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
          flex-shrink: 0;
          transition: color .15s;
          outline: none;
          height: 100%;
        }
        .eye-btn:hover { color: #475569; }
        .eye-btn:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
          border-radius: 4px;
        }

        /* ── Field messages ── */
        .field-error {
          display: block;
          font-size: 12px;
          color: #dc2626;
          margin-top: 5px;
        }
        .field-hint {
          display: block;
          font-size: 12px;
          color: #94a3b8;
          margin-top: 5px;
        }

        /* ── Terms ── */
        .terms-field { margin-bottom: 1.25rem; }
        .terms-label {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
        }
        .terms-label input[type="checkbox"] {
          width: 15px;
          height: 15px;
          accent-color: #2563eb;
          flex-shrink: 0;
          margin-top: 2px;
          cursor: pointer;
        }
        .terms-text {
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
        }
        .terms-text a { color: #2563eb; font-weight: 500; text-decoration: none; }
        .terms-text a:hover { text-decoration: underline; }

        /* ── Submit button ── */
        .submit-btn {
          width: 100%;
          padding: 11px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: all .2s;
          font-family: inherit;
        }
        .submit-btn:hover:not(:disabled) { background: #1d4ed8; }
        .submit-btn:active:not(:disabled) { transform: scale(.98); }
        .submit-btn:disabled { opacity: .65; cursor: not-allowed; }

        /* ── Spinner ── */
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: white;
          border-radius: 50%;
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
        .google-btn:hover {
          background: #f8fafc;
          border-color: #93c5fd;
        }

        /* ── Login link ── */
        .login-text {
          text-align: center;
          font-size: 13px;
          color: #64748b;
        }
        .login-text a { color: #2563eb; font-weight: 600; text-decoration: none; }
        .login-text a:hover { text-decoration: underline; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .signup-card { flex-direction: column; max-width: 480px; }
          .signup-branding { flex: none; padding: 1.75rem 1.5rem; }
          .brand-features, .testimonial-card { display: none; }
          .brand-content h1 { font-size: 1.4rem; margin-bottom: .25rem; }
          .signup-form-container { padding: 1.75rem 1.5rem; }
        }

        @media (max-width: 480px) {
          .signup-container { padding: 1rem .75rem; }
          .signup-form-container { padding: 1.5rem 1.25rem; }
        }
      `}</style>
    </>
  );
}