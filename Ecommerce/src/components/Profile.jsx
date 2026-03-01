import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");

  // Personal details form
  const [personalForm, setPersonalForm] = useState({
    fullname: "",
    email: "",
    phonenumber: "",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Payment methods (UI only for now)
  const [cards] = useState([
    { id: 1, type: "Visa", last4: "4242", expiry: "12/26", isDefault: true },
    { id: 2, type: "Mastercard", last4: "5555", expiry: "08/25", isDefault: false },
  ]);

  // State management
  const [personalLoading, setPersonalLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [personalSuccess, setPersonalSuccess] = useState("");
  const [personalError, setPersonalError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [personalErrors, setPersonalErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Load user on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData || userData === "undefined" || userData === "null") {
      navigate("/ulogin");
      return;
    }
    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      setPersonalForm({
        fullname: parsed.fullname || parsed.name || "",
        email: parsed.email || "",
        phonenumber: parsed.phonenumber || parsed.phone || "",
      });
    } catch {
      navigate("/ulogin");
    }
  }, [navigate]);

  const clearMessages = () => {
    setPersonalSuccess("");
    setPersonalError("");
    setPasswordSuccess("");
    setPasswordError("");
  };

  // ── Personal details ──────────────────────────────────────────────
  const validatePersonal = () => {
    const errs = {};
    if (!personalForm.fullname.trim()) errs.fullname = "Full name is required";
    if (!personalForm.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(personalForm.email)) errs.email = "Enter a valid email";
    if (!personalForm.phonenumber.trim()) errs.phonenumber = "Phone number is required";
    else if (!/^[0-9+ ]{7,15}$/.test(personalForm.phonenumber))
      errs.phonenumber = "Enter a valid phone number";
    setPersonalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!validatePersonal()) return;

    setPersonalLoading(true);
    try {
      // Endpoint: PUT http://localhost:5000/user/:id
      // Swap this URL to match your actual backend route
      const res = await axios.put(`http://localhost:5000/user/${user.id}`, {
        fullname: personalForm.fullname,
        email: personalForm.email,
        phonenumber: personalForm.phonenumber,
      });

      // Update localStorage with new user data
      const updatedUser = { ...user, ...res.data.user || personalForm };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      setPersonalSuccess("Profile updated successfully!");
      setTimeout(() => setPersonalSuccess(""), 4000);
    } catch (err) {
      setPersonalError(
        err.response?.data?.message || "Failed to update profile. Please try again."
      );
    } finally {
      setPersonalLoading(false);
    }
  };

  // ── Password change ───────────────────────────────────────────────
  const validatePassword = () => {
    const errs = {};
    if (!passwordForm.currentPassword) errs.currentPassword = "Current password is required";
    if (!passwordForm.newPassword) errs.newPassword = "New password is required";
    else if (passwordForm.newPassword.length < 6)
      errs.newPassword = "Password must be at least 6 characters";
    if (!passwordForm.confirmPassword) errs.confirmPassword = "Please confirm your new password";
    else if (passwordForm.newPassword !== passwordForm.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    if (passwordForm.currentPassword === passwordForm.newPassword)
      errs.newPassword = "New password must be different from current password";
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!validatePassword()) return;

    setPasswordLoading(true);
    try {
      // Endpoint: PUT http://localhost:5000/user/password/:id
      // Swap this URL to match your actual backend route
      await axios.put(`http://localhost:5000/user/password/${user.id}`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess("Password changed successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch (err) {
      if (err.response?.status === 401) {
        setPasswordError("Current password is incorrect.");
      } else {
        setPasswordError(
          err.response?.data?.message || "Failed to change password. Please try again."
        );
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/ulogin";
  };

  // Password strength indicator
  const getPasswordStrength = (pw) => {
    if (!pw) return { label: "", color: "", width: "0%" };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Weak", color: "#ef4444", width: "20%" };
    if (score === 2) return { label: "Fair", color: "#f59e0b", width: "45%" };
    if (score === 3) return { label: "Good", color: "#3b82f6", width: "65%" };
    if (score === 4) return { label: "Strong", color: "#10b981", width: "85%" };
    return { label: "Very Strong", color: "#059669", width: "100%" };
  };

  const pwStrength = getPasswordStrength(passwordForm.newPassword);

  if (!user) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  // Avatar initials
  const initials = (user.fullname || user.name || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div className="profile-page">
        {/* Top Nav */}
        <nav className="profile-nav">
          <div className="nav-inner">
            <div className="nav-left">
              <Link to="/userdashboard" className="nav-back">
                ← Dashboard
              </Link>
            </div>
            <div className="nav-brand">⚡ FlowSpace</div>
            <div className="nav-right">
              <button onClick={handleLogout} className="nav-logout">
                Sign Out
              </button>
            </div>
          </div>
        </nav>

        <div className="profile-layout">
          {/* Sidebar */}
          <aside className="profile-sidebar">
            {/* Avatar card */}
            <div className="avatar-card">
              <div className="avatar-ring">
                <div className="avatar">{initials}</div>
              </div>
              <h2 className="sidebar-name">
                {user.fullname || user.name || "User"}
              </h2>
              <p className="sidebar-email">{user.email}</p>
              <div className="sidebar-badge">
                <span className="badge-dot"></span>
                Active Account
              </div>
            </div>

            {/* Nav links */}
            <div className="sidebar-nav">
              {[
                { id: "personal", icon: "👤", label: "Personal Details" },
                { id: "password", icon: "🔒", label: "Change Password" },
                { id: "payment",  icon: "💳", label: "Payment Methods" },
              ].map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-link ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => { setActiveTab(item.id); clearMessages(); }}
                >
                  <span className="link-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="link-arrow">›</span>
                </button>
              ))}
            </div>

            <Link to="/userdashboard" className="back-to-dash">
              🏠 Back to Dashboard
            </Link>
          </aside>

          {/* Main content */}
          <main className="profile-main">

            {/* ── PERSONAL DETAILS ── */}
            {activeTab === "personal" && (
              <div className="tab-panel">
                <div className="panel-header">
                  <div className="panel-title-group">
                    <h1 className="panel-title">Personal Details</h1>
                    <p className="panel-subtitle">Update your name, email and phone number</p>
                  </div>
                </div>

                {personalSuccess && (
                  <div className="alert success">
                    <span>✅</span> {personalSuccess}
                  </div>
                )}
                {personalError && (
                  <div className="alert error">
                    <span>⚠️</span> {personalError}
                  </div>
                )}

                <form onSubmit={handlePersonalSubmit} className="profile-form" noValidate>
                  <div className="form-grid">
                    <div className="form-group full">
                      <label htmlFor="fullname">Full Name <span className="req">*</span></label>
                      <div className="input-wrap">
                        <span className="input-prefix">👤</span>
                        <input
                          id="fullname"
                          type="text"
                          placeholder="John Doe"
                          value={personalForm.fullname}
                          onChange={(e) => {
                            setPersonalForm((p) => ({ ...p, fullname: e.target.value }));
                            if (personalErrors.fullname) setPersonalErrors((p) => ({ ...p, fullname: "" }));
                          }}
                          className={personalErrors.fullname ? "error" : ""}
                        />
                      </div>
                      {personalErrors.fullname && <span className="field-error">{personalErrors.fullname}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email Address <span className="req">*</span></label>
                      <div className="input-wrap">
                        <span className="input-prefix">✉️</span>
                        <input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={personalForm.email}
                          onChange={(e) => {
                            setPersonalForm((p) => ({ ...p, email: e.target.value }));
                            if (personalErrors.email) setPersonalErrors((p) => ({ ...p, email: "" }));
                          }}
                          className={personalErrors.email ? "error" : ""}
                        />
                      </div>
                      {personalErrors.email && <span className="field-error">{personalErrors.email}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="phonenumber">Phone Number <span className="req">*</span></label>
                      <div className="input-wrap">
                        <span className="input-prefix">📱</span>
                        <input
                          id="phonenumber"
                          type="tel"
                          placeholder="+1 234 567 8900"
                          value={personalForm.phonenumber}
                          onChange={(e) => {
                            setPersonalForm((p) => ({ ...p, phonenumber: e.target.value }));
                            if (personalErrors.phonenumber) setPersonalErrors((p) => ({ ...p, phonenumber: "" }));
                          }}
                          className={personalErrors.phonenumber ? "error" : ""}
                        />
                      </div>
                      {personalErrors.phonenumber && <span className="field-error">{personalErrors.phonenumber}</span>}
                    </div>
                  </div>

                  {/* Read-only info row */}
                  <div className="info-row">
                    <div className="info-chip">
                      <span className="info-chip-label">Account ID</span>
                      <span className="info-chip-value">#{user.id || "—"}</span>
                    </div>
                    <div className="info-chip">
                      <span className="info-chip-label">Account Status</span>
                      <span className="info-chip-value status-active">● Active</span>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setPersonalForm({
                          fullname: user.fullname || user.name || "",
                          email: user.email || "",
                          phonenumber: user.phonenumber || user.phone || "",
                        });
                        setPersonalErrors({});
                        clearMessages();
                      }}
                      disabled={personalLoading}
                    >
                      Reset
                    </button>
                    <button type="submit" className="btn-save" disabled={personalLoading}>
                      {personalLoading ? (
                        <><span className="spinner"></span> Saving...</>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── CHANGE PASSWORD ── */}
            {activeTab === "password" && (
              <div className="tab-panel">
                <div className="panel-header">
                  <div className="panel-title-group">
                    <h1 className="panel-title">Change Password</h1>
                    <p className="panel-subtitle">Keep your account secure with a strong password</p>
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="alert success">
                    <span>✅</span> {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="alert error">
                    <span>⚠️</span> {passwordError}
                  </div>
                )}

                <div className="security-tips">
                  <p className="tips-title">🛡️ Password tips</p>
                  <ul>
                    <li>At least 6 characters long</li>
                    <li>Mix uppercase and lowercase letters</li>
                    <li>Include numbers and special characters</li>
                    <li>Don't reuse a recent password</li>
                  </ul>
                </div>

                <form onSubmit={handlePasswordSubmit} className="profile-form" noValidate>
                  {/* Current password */}
                  <div className="form-group full">
                    <label htmlFor="currentPassword">Current Password <span className="req">*</span></label>
                    <div className="input-wrap">
                      <span className="input-prefix">🔑</span>
                      <input
                        id="currentPassword"
                        type={showCurrentPw ? "text" : "password"}
                        placeholder="Your current password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => {
                          setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }));
                          if (passwordErrors.currentPassword) setPasswordErrors((p) => ({ ...p, currentPassword: "" }));
                        }}
                        className={passwordErrors.currentPassword ? "error" : ""}
                      />
                      <button type="button" className="pw-toggle" onClick={() => setShowCurrentPw((v) => !v)}>
                        {showCurrentPw ? "🙈" : "👁️"}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && <span className="field-error">{passwordErrors.currentPassword}</span>}
                  </div>

                  {/* New password */}
                  <div className="form-group full">
                    <label htmlFor="newPassword">New Password <span className="req">*</span></label>
                    <div className="input-wrap">
                      <span className="input-prefix">🔒</span>
                      <input
                        id="newPassword"
                        type={showNewPw ? "text" : "password"}
                        placeholder="Enter new password"
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          setPasswordForm((p) => ({ ...p, newPassword: e.target.value }));
                          if (passwordErrors.newPassword) setPasswordErrors((p) => ({ ...p, newPassword: "" }));
                        }}
                        className={passwordErrors.newPassword ? "error" : ""}
                      />
                      <button type="button" className="pw-toggle" onClick={() => setShowNewPw((v) => !v)}>
                        {showNewPw ? "🙈" : "👁️"}
                      </button>
                    </div>
                    {passwordErrors.newPassword && <span className="field-error">{passwordErrors.newPassword}</span>}
                    {/* Strength bar */}
                    {passwordForm.newPassword && (
                      <div className="strength-bar-wrap">
                        <div className="strength-bar">
                          <div className="strength-fill" style={{ width: pwStrength.width, background: pwStrength.color }}></div>
                        </div>
                        <span className="strength-label" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="form-group full">
                    <label htmlFor="confirmPassword">Confirm New Password <span className="req">*</span></label>
                    <div className="input-wrap">
                      <span className="input-prefix">🔒</span>
                      <input
                        id="confirmPassword"
                        type={showConfirmPw ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }));
                          if (passwordErrors.confirmPassword) setPasswordErrors((p) => ({ ...p, confirmPassword: "" }));
                        }}
                        className={passwordErrors.confirmPassword ? "error" : ""}
                      />
                      <button type="button" className="pw-toggle" onClick={() => setShowConfirmPw((v) => !v)}>
                        {showConfirmPw ? "🙈" : "👁️"}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && <span className="field-error">{passwordErrors.confirmPassword}</span>}
                    {/* Match indicator */}
                    {passwordForm.confirmPassword && passwordForm.newPassword && (
                      <span className={`match-indicator ${passwordForm.newPassword === passwordForm.confirmPassword ? "match" : "no-match"}`}>
                        {passwordForm.newPassword === passwordForm.confirmPassword ? "✅ Passwords match" : "❌ Passwords do not match"}
                      </span>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        setPasswordErrors({});
                        clearMessages();
                      }}
                      disabled={passwordLoading}
                    >
                      Clear
                    </button>
                    <button type="submit" className="btn-save" disabled={passwordLoading}>
                      {passwordLoading ? (
                        <><span className="spinner"></span> Changing...</>
                      ) : (
                        "Change Password"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── PAYMENT METHODS ── */}
            {activeTab === "payment" && (
              <div className="tab-panel">
                <div className="panel-header">
                  <div className="panel-title-group">
                    <h1 className="panel-title">Payment Methods</h1>
                    <p className="panel-subtitle">Manage your saved cards</p>
                  </div>
                  <button className="btn-add-card" onClick={() => alert("Add card feature coming soon!")}>
                    + Add Card
                  </button>
                </div>

                <div className="cards-list">
                  {cards.map((card) => (
                    <div key={card.id} className={`card-item ${card.isDefault ? "default" : ""}`}>
                      <div className="card-left">
                        <div className={`card-logo ${card.type.toLowerCase()}`}>
                          {card.type === "Visa" ? "VISA" : "MC"}
                        </div>
                        <div className="card-details">
                          <span className="card-number">•••• •••• •••• {card.last4}</span>
                          <span className="card-expiry">Expires {card.expiry}</span>
                        </div>
                      </div>
                      <div className="card-right">
                        {card.isDefault && <span className="default-badge">Default</span>}
                        <button className="card-action edit" onClick={() => alert("Edit card coming soon!")}>Edit</button>
                        <button className="card-action remove" onClick={() => alert("Remove card coming soon!")}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="payment-notice">
                  <span>🔒</span>
                  <p>Your payment information is encrypted and stored securely. We never store your full card number.</p>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .profile-page {
          min-height: 100vh;
          background: #f0f4f8;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── NAV ── */
        .profile-nav {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 12px rgba(0,0,0,0.06);
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-back {
          text-decoration: none;
          color: #3b82f6;
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: gap 0.2s;
        }
        .nav-back:hover { gap: 0.7rem; }
        .nav-brand {
          font-family: 'DM Serif Display', serif;
          font-size: 1.4rem;
          color: #1e293b;
          letter-spacing: -0.5px;
        }
        .nav-logout {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          padding: 0.5rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-logout:hover { background: #fecaca; transform: translateY(-1px); }

        /* ── LAYOUT ── */
        .profile-layout {
          max-width: 1100px;
          margin: 2rem auto;
          padding: 0 1.5rem 4rem;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        /* ── SIDEBAR ── */
        .profile-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: sticky;
          top: 80px;
        }
        .avatar-card {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          border-radius: 20px;
          padding: 2rem 1.5rem;
          text-align: center;
          color: white;
          box-shadow: 0 10px 30px rgba(59,130,246,0.3);
        }
        .avatar-ring {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          border: 3px solid rgba(255,255,255,0.4);
        }
        .avatar {
          width: 64px;
          height: 64px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e40af;
          font-family: 'DM Serif Display', serif;
        }
        .sidebar-name {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          font-family: 'DM Serif Display', serif;
        }
        .sidebar-email {
          font-size: 0.8rem;
          opacity: 0.8;
          margin-bottom: 1rem;
          word-break: break-all;
        }
        .sidebar-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255,255,255,0.2);
          padding: 0.3rem 0.8rem;
          border-radius: 50px;
          font-size: 0.78rem;
          font-weight: 600;
        }
        .badge-dot {
          width: 6px;
          height: 6px;
          background: #4ade80;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .sidebar-nav {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .sidebar-link {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: none;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #475569;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .sidebar-link:last-child { border-bottom: none; }
        .sidebar-link:hover { background: #f8fafc; color: #1e293b; }
        .sidebar-link.active {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #1d4ed8;
          font-weight: 600;
          border-left: 3px solid #3b82f6;
        }
        .link-icon { font-size: 1.1rem; }
        .link-arrow { margin-left: auto; font-size: 1.2rem; color: #cbd5e1; }
        .sidebar-link.active .link-arrow { color: #3b82f6; }
        .back-to-dash {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          text-decoration: none;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.75rem;
          background: white;
          border-radius: 12px;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .back-to-dash:hover { background: #f1f5f9; color: #1e293b; }

        /* ── MAIN PANEL ── */
        .profile-main {
          min-height: 500px;
        }
        .tab-panel {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          animation: fadeUp 0.3s ease;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .panel-header {
          padding: 2rem 2rem 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2rem;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 1.5rem;
        }
        .panel-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1.6rem;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        .panel-subtitle {
          color: #64748b;
          font-size: 0.875rem;
        }

        /* ── ALERTS ── */
        .alert {
          margin: 0 2rem 1.5rem;
          padding: 0.875rem 1.25rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .alert.success { background: #d1fae5; color: #065f46; }
        .alert.error   { background: #fee2e2; color: #991b1b; }

        /* ── FORM ── */
        .profile-form { padding: 0 2rem 2rem; }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group.full { grid-column: 1 / -1; }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.02em;
        }
        .req { color: #ef4444; }
        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-prefix {
          position: absolute;
          left: 0.9rem;
          font-size: 1rem;
          pointer-events: none;
          z-index: 1;
        }
        .input-wrap input {
          width: 100%;
          padding: 0.8rem 1rem 0.8rem 2.6rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          font-family: 'DM Sans', sans-serif;
          color: #1e293b;
          background: #fafafa;
          transition: all 0.2s;
          outline: none;
        }
        .input-wrap input:focus {
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .input-wrap input.error {
          border-color: #ef4444;
          background: #fff5f5;
        }
        .input-wrap input.error:focus {
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
        }
        .pw-toggle {
          position: absolute;
          right: 0.9rem;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 0.2rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .pw-toggle:hover { opacity: 1; }
        .field-error {
          color: #ef4444;
          font-size: 0.8rem;
          font-weight: 500;
        }

        /* Strength bar */
        .strength-bar-wrap {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .strength-bar {
          flex: 1;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }
        .strength-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.4s ease, background 0.4s ease;
        }
        .strength-label {
          font-size: 0.78rem;
          font-weight: 700;
          min-width: 70px;
          text-align: right;
        }

        /* Match indicator */
        .match-indicator {
          font-size: 0.8rem;
          font-weight: 600;
          margin-top: 0.4rem;
          display: block;
        }
        .match-indicator.match   { color: #059669; }
        .match-indicator.no-match { color: #ef4444; }

        /* Info row */
        .info-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .info-chip {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.6rem 1rem;
        }
        .info-chip-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          font-weight: 600;
        }
        .info-chip-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
        }
        .status-active { color: #059669; }

        /* Security tips */
        .security-tips {
          margin: 0 2rem 1.5rem;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 12px;
          padding: 1rem 1.25rem;
        }
        .tips-title {
          font-weight: 700;
          color: #0369a1;
          font-size: 0.875rem;
          margin-bottom: 0.6rem;
        }
        .security-tips ul {
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .security-tips ul li {
          font-size: 0.83rem;
          color: #0c4a6e;
        }

        /* Form actions */
        .form-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
        }
        .btn-ghost {
          padding: 0.75rem 1.5rem;
          background: none;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-ghost:hover:not(:disabled) { border-color: #cbd5e1; background: #f8fafc; }
        .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-save {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }
        .btn-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(59,130,246,0.4);
        }
        .btn-save:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }
        .spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── PAYMENT ── */
        .btn-add-card {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-add-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.35); }
        .cards-list {
          padding: 0 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .card-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          gap: 1rem;
          transition: all 0.2s;
        }
        .card-item.default {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
        }
        .card-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .card-left { display: flex; align-items: center; gap: 1rem; }
        .card-logo {
          width: 52px;
          height: 34px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .card-logo.visa { background: #1a1f71; color: white; }
        .card-logo.mastercard { background: linear-gradient(135deg, #eb001b, #f79e1b); color: white; }
        .card-details { display: flex; flex-direction: column; gap: 0.2rem; }
        .card-number { font-weight: 600; font-size: 0.95rem; color: #1e293b; letter-spacing: 0.05em; }
        .card-expiry { font-size: 0.8rem; color: #64748b; }
        .card-right { display: flex; align-items: center; gap: 0.6rem; }
        .default-badge {
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 50px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .card-action {
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          border: none;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .card-action.edit { background: #f1f5f9; color: #475569; }
        .card-action.edit:hover { background: #3b82f6; color: white; }
        .card-action.remove { background: #fee2e2; color: #dc2626; }
        .card-action.remove:hover { background: #dc2626; color: white; }
        .payment-notice {
          margin: 0 2rem 2rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          font-size: 0.83rem;
          color: #64748b;
          line-height: 1.5;
        }
        .payment-notice span { font-size: 1.1rem; margin-top: 0.1rem; }

        /* Loading */
        .profile-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: #f0f4f8;
          color: #64748b;
          font-family: 'DM Sans', sans-serif;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .profile-layout {
            grid-template-columns: 1fr;
          }
          .profile-sidebar {
            position: static;
            flex-direction: row;
            flex-wrap: wrap;
          }
          .avatar-card { flex: 1; min-width: 220px; }
          .sidebar-nav { flex: 2; min-width: 260px; }
          .back-to-dash { display: none; }
        }
        @media (max-width: 600px) {
          .profile-layout { padding: 0 1rem 3rem; margin: 1rem auto; }
          .panel-header { flex-direction: column; gap: 1rem; }
          .form-grid { grid-template-columns: 1fr; }
          .form-group.full { grid-column: 1; }
          .form-actions { flex-direction: column-reverse; }
          .btn-ghost, .btn-save { width: 100%; justify-content: center; }
          .card-item { flex-direction: column; align-items: flex-start; }
          .card-right { width: 100%; justify-content: flex-end; }
          .profile-sidebar { flex-direction: column; }
          .nav-inner { padding: 0 1rem; }
        }
      `}</style>
    </>
  );
}