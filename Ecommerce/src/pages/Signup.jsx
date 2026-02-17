import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "", // Added phone number field
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ""
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    // Phone number validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid 10-digit phone number";
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain at least one letter and one number";
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    // Terms agreement validation
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = "You must agree to the terms and conditions";
    }
    
    return newErrors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate form
  const newErrors = validateForm();
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  
  setLoading(true);
  setServerError("");
  
  try {
    // ✅ FIXED: Use correct field names from formData state
    const payload = {
      fullname: formData.name,        // ✅ Changed: formData.name (not fullname)
      phonenumber: formData.phoneNumber,  // ✅ Changed: formData.phoneNumber
      email: formData.email,
      password: formData.password
    };
    
    console.log("📤 Sending payload:", payload); // Debug log
    
    const response = await axios.post("http://localhost:5000/user/register", payload);
    
    console.log("✅ Response:", response.data); // Debug log
    
    // ✅ FIXED: Check status code instead of success flag
    if (response.status === 201) {
      alert("✅ Account created successfully! Please login.");
      navigate("/ulogin");
    }
  } catch (error) {
    console.error("❌ Signup error:", error);
    console.error("❌ Error response:", error.response?.data); // Important debug log
    
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
  return (
    <div className="signup-container">
      <div className="signup-card">
        {/* Left side - Branding/Illustration */}
        <div className="signup-branding">
          <div className="brand-content">
            <div className="logo">
              <span className="logo-icon">⚡</span>
              <span className="logo-text">FlowSpace</span>
            </div>
            <h1>Join Us Today!</h1>
            <p>Create an account and start your journey with us</p>
            <div className="illustration">
              <div className="circle"></div>
              <div className="dots"></div>
            </div>
            <div className="testimonial">
              <p>"Amazing platform! Highly recommended."</p>
              <span>- Happy Customer</span>
            </div>
          </div>
        </div>

        {/* Right side - Signup Form */}
        <div className="signup-form-container">
          <div className="form-content">
            <h2>Create Account</h2>
            <p className="form-subtitle">Fill in your details to get started</p>

            {/* Server Error Message */}
            {serverError && (
              <div className="server-error">
                <span className="error-icon">⚠️</span>
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Full Name Field */}
              <div className="input-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? "error" : ""}
                  />
                </div>
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              {/* Phone Number Field - Added after Full Name */}
              <div className="input-group">
                <label htmlFor="phoneNumber">Phone Number</label>
                <div className="input-wrapper">
                  <span className="input-icon">📱</span>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="1234567890"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={errors.phoneNumber ? "error" : ""}
                    maxLength="10"
                  />
                </div>
                {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
                <span className="input-hint">Enter 10-digit mobile number</span>
              </div>

              {/* Email Field */}
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">✉️</span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? "error" : ""}
                  />
                </div>
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              {/* Password Field */}
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? "error" : ""}
                  />
                  <button 
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
                <span className="input-hint">Minimum 6 characters with letters and numbers</span>
              </div>

              {/* Confirm Password Field */}
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? "error" : ""}
                  />
                  <button 
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>

              {/* Terms and Conditions */}
              <div className="terms-group">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  <span className="terms-text">
                    I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
                  </span>
                </label>
                {errors.agreeTerms && <span className="error-message">{errors.agreeTerms}</span>}
              </div>

              {/* Sign Up Button */}
              <button 
                type="submit" 
                className="signup-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <span>or</span>
            </div>

            {/* Social Signup */}
            <button className="social-signup-btn">
              <span className="social-icon">G</span>
              Sign up with Google
            </button>

            {/* Login Link */}
            <p className="login-text">
              Already have an account? <Link to="/ulogin">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      {/* CSS Styles - Keeping your existing styles exactly as they were */}
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }

        .signup-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1.5rem;
        }

        .signup-card {
          display: flex;
          max-width: 1100px;
          width: 100%;
          background: white;
          border-radius: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          transition: transform 0.3s ease;
        }

        .signup-card:hover {
          transform: scale(1.02);
        }

        /* Left side - Branding */
        .signup-branding {
          flex: 1;
          background: linear-gradient(145deg, #6B46C1 0%, #9F7AEA 100%);
          color: white;
          padding: 3rem 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .brand-content {
          position: relative;
          z-index: 2;
          text-align: center;
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .logo-icon {
          font-size: 2.5rem;
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
        }

        .logo-text {
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .signup-branding h1 {
          font-size: 2.2rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .signup-branding p {
          font-size: 1rem;
          opacity: 0.9;
          margin-bottom: 2rem;
        }

        .illustration {
          position: relative;
          width: 200px;
          height: 200px;
          margin: 0 auto 2rem;
        }

        .circle {
          position: absolute;
          width: 150px;
          height: 150px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          top: 20px;
          left: 25px;
          animation: float 6s ease-in-out infinite;
        }

        .dots {
          position: absolute;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(rgba(255,255,255,0.2) 2px, transparent 2px);
          background-size: 20px 20px;
          animation: move 10s linear infinite;
        }

        .testimonial {
          background: rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 1rem;
          backdrop-filter: blur(10px);
        }

        .testimonial p {
          font-size: 0.9rem;
          font-style: italic;
          margin-bottom: 0.5rem;
        }

        .testimonial span {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes move {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }

        /* Right side - Form */
        .signup-form-container {
          flex: 1;
          padding: 3rem 2.5rem;
          background: white;
        }

        .form-content {
          max-width: 400px;
          margin: 0 auto;
        }

        .form-content h2 {
          font-size: 2rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.25rem;
        }

        .form-subtitle {
          color: #718096;
          font-size: 0.95rem;
          margin-bottom: 2rem;
        }

        /* Server Error */
        .server-error {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        /* Input Groups */
        .input-group {
          margin-bottom: 1.5rem;
        }

        .input-group label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: #4a5568;
          margin-bottom: 0.5rem;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #a0aec0;
          font-size: 1.1rem;
          z-index: 1;
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 2.8rem;
          border: 2px solid #e2e8f0;
          border-radius: 1rem;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          outline: none;
        }

        .input-wrapper input:focus {
          border-color: #9f7aea;
          box-shadow: 0 0 0 3px rgba(159, 122, 234, 0.1);
        }

        .input-wrapper input.error {
          border-color: #dc2626;
        }

        .input-wrapper input.error:focus {
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          color: #a0aec0;
          padding: 0;
          z-index: 1;
        }

        .password-toggle:hover {
          color: #4a5568;
        }

        .error-message {
          display: block;
          color: #dc2626;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        .input-hint {
          display: block;
          color: #718096;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        /* Terms Group */
        .terms-group {
          margin-bottom: 1.5rem;
        }

        .checkbox-container {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #4a5568;
          cursor: pointer;
        }

        .checkbox-container input {
          margin-top: 0.2rem;
          accent-color: #9f7aea;
        }

        .terms-text {
          line-height: 1.4;
        }

        .terms-text a {
          color: #9f7aea;
          text-decoration: none;
          font-weight: 500;
        }

        .terms-text a:hover {
          text-decoration: underline;
        }

        /* Signup Button */
        .signup-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(145deg, #9f7aea 0%, #6b46c1 100%);
          color: white;
          border: none;
          border-radius: 1rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(107, 70, 193, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .signup-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(107, 70, 193, 0.3);
        }

        .signup-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #ffffff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Divider */
        .divider {
          position: relative;
          text-align: center;
          margin: 1.5rem 0;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e2e8f0;
        }

        .divider span {
          position: relative;
          background: white;
          padding: 0 0.75rem;
          color: #a0aec0;
          font-size: 0.9rem;
        }

        /* Social Signup */
        .social-signup-btn {
          width: 100%;
          padding: 0.85rem;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 1rem;
          font-size: 0.95rem;
          font-weight: 500;
          color: #4a5568;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1.5rem;
        }

        .social-signup-btn:hover {
          background: #f7fafc;
          border-color: #cbd5e0;
        }

        .social-icon {
          font-size: 1.2rem;
          font-weight: 600;
          color: #4285f4;
        }

        /* Login Link */
        .login-text {
          text-align: center;
          color: #718096;
          font-size: 0.95rem;
        }

        .login-text a {
          color: #9f7aea;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .login-text a:hover {
          color: #6b46c1;
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .signup-card {
            flex-direction: column;
            max-width: 500px;
          }
          
          .signup-branding {
            padding: 2rem 1.5rem;
          }
          
          .signup-branding h1 {
            font-size: 1.8rem;
          }
          
          .signup-form-container {
            padding: 2rem 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .signup-container {
            padding: 0.5rem;
          }
          
          .form-content h2 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </div>
  );
}