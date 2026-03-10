import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [tokenValid, setTokenValid] = useState(null); // null=checking
  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [passwordErr, setPasswordErr]       = useState("");
  const [confirmErr, setConfirmErr]         = useState("");
  const [loading, setLoading]               = useState(false);
  const [success, setSuccess]               = useState(false);
  const [error, setError]                   = useState("");

  // Verify token as soon as page loads
  useEffect(() => {
    if (!token) { setTokenValid(false); return; }

    axios
      .get(`http://localhost:5000/user/verify-reset-token/${token}`)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false));
  }, [token]);

  // Password strength helper
  const getStrength = (pw) => {
    if (!pw) return { label: "", color: "", width: "0%" };
    let s = 0;
    if (pw.length >= 6)          s++;
    if (pw.length >= 10)         s++;
    if (/[A-Z]/.test(pw))        s++;
    if (/[0-9]/.test(pw))        s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s <= 1) return { label: "Weak",      color: "#ef4444", width: "20%"  };
    if (s === 2) return { label: "Fair",      color: "#f59e0b", width: "45%"  };
    if (s === 3) return { label: "Good",      color: "#3b82f6", width: "65%"  };
    if (s === 4) return { label: "Strong",    color: "#10b981", width: "85%"  };
    return              { label: "Very Strong", color: "#059669", width: "100%" };
  };
  const strength = getStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setPasswordErr(""); setConfirmErr("");

    let ok = true;
    if (!newPassword)              { setPasswordErr("Password is required");          ok = false; }
    else if (newPassword.length<6) { setPasswordErr("At least 6 characters");         ok = false; }
    if (!confirmPassword)          { setConfirmErr("Please confirm your password");   ok = false; }
    else if (newPassword !== confirmPassword) { setConfirmErr("Passwords do not match"); ok = false; }
    if (!ok) return;

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/user/reset-password", { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate("/ulogin"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Checking token ──────────────────────────────────────────────────────────
  if (tokenValid === null) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={S.spinner} />
          <p style={{ color: "#64748b", marginTop: "1rem" }}>Verifying link...</p>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  // ── Invalid / expired token ─────────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏰</div>
          <h2 style={S.title}>Link Expired</h2>
          <p style={S.subtitle}>
            This reset link is invalid or has expired.<br />
            Please request a new one.
          </p>
          <Link to="/forgot-password" style={S.btn2}>Request New Link</Link>
          <br />
          <Link to="/ulogin" style={S.backLink}>← Back to Login</Link>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={S.title}>Password Reset!</h2>
          <p style={S.subtitle}>Your password has been updated.<br />Redirecting to login...</p>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  // ── Reset form ──────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.brand}>⚡ MyShop</div>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔒</div>
        <h2 style={S.title}>Set New Password</h2>
        <p style={S.subtitle}>Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit} style={{ textAlign: "left" }} noValidate>
          {error && <div style={S.alertError}>⚠️ {error}</div>}

          {/* New password */}
          <div style={S.formGroup}>
            <label style={S.label}>New Password</label>
            <div style={S.inputWrap}>
              <span style={S.prefix}>🔒</span>
              <input
                type={showNew ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordErr(""); }}
                style={{ ...S.input, ...(passwordErr ? S.inputErr : {}) }}
              />
              <button type="button" style={S.eyeBtn} onClick={() => setShowNew(v => !v)}>
                {showNew ? "🙈" : "👁️"}
              </button>
            </div>
            {passwordErr && <span style={S.fieldErr}>{passwordErr}</span>}
            {newPassword && (
              <div style={S.strengthWrap}>
                <div style={S.strengthBar}>
                  <div style={{ ...S.strengthFill, width: strength.width, background: strength.color }} />
                </div>
                <span style={{ ...S.strengthLabel, color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={S.formGroup}>
            <label style={S.label}>Confirm Password</label>
            <div style={S.inputWrap}>
              <span style={S.prefix}>🔒</span>
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmErr(""); }}
                style={{ ...S.input, ...(confirmErr ? S.inputErr : {}) }}
              />
              <button type="button" style={S.eyeBtn} onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {confirmErr && <span style={S.fieldErr}>{confirmErr}</span>}
            {confirmPassword && newPassword && (
              <span style={{
                fontSize: "0.8rem", fontWeight: 600, marginTop: "0.3rem", display: "block",
                color: newPassword === confirmPassword ? "#059669" : "#ef4444"
              }}>
                {newPassword === confirmPassword ? "✅ Passwords match" : "❌ Passwords do not match"}
              </span>
            )}
          </div>

          <button type="submit" style={S.btn} disabled={loading}>
            {loading ? <><span style={S.spinner} /> Resetting...</> : "Reset Password"}
          </button>
        </form>

        <Link to="/ulogin" style={S.backLink}>← Back to Login</Link>
      </div>
      <style>{css}</style>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#eff6ff 0%,#f0f9ff 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans',sans-serif", padding: "1.5rem",
  },
  card: {
    background: "white", borderRadius: "20px", padding: "2.5rem 2rem",
    width: "100%", maxWidth: "420px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.08)", textAlign: "center",
  },
  brand:    { fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", marginBottom: "1.5rem" },
  title:    { fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" },
  subtitle: { color: "#64748b", fontSize: "0.875rem", marginBottom: "1.75rem", lineHeight: 1.6 },
  formGroup:{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.25rem" },
  label:    { fontSize: "0.85rem", fontWeight: 600, color: "#374151" },
  inputWrap:{ position: "relative", display: "flex", alignItems: "center" },
  prefix:   { position: "absolute", left: "0.9rem", fontSize: "1rem", pointerEvents: "none" },
  input: {
    width: "100%", padding: "0.8rem 1rem 0.8rem 2.6rem",
    border: "2px solid #e2e8f0", borderRadius: "10px",
    fontSize: "0.95rem", fontFamily: "'DM Sans',sans-serif",
    color: "#1e293b", background: "#fafafa", outline: "none",
  },
  inputErr: { borderColor: "#ef4444", background: "#fff5f5" },
  fieldErr: { color: "#ef4444", fontSize: "0.8rem", fontWeight: 500 },
  eyeBtn:   { position: "absolute", right: "0.9rem", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", opacity: 0.6 },
  strengthWrap: { display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" },
  strengthBar:  { flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: "3px", transition: "width 0.4s, background 0.4s" },
  strengthLabel:{ fontSize: "0.78rem", fontWeight: 700, minWidth: "70px", textAlign: "right" },
  btn: {
    width: "100%", padding: "0.875rem",
    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
    color: "white", border: "none", borderRadius: "10px",
    fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    boxShadow: "0 4px 12px rgba(59,130,246,0.3)", marginTop: "0.5rem",
    fontFamily: "'DM Sans',sans-serif",
  },
  btn2: {
    display: "inline-block", padding: "0.75rem 2rem",
    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
    color: "white", borderRadius: "10px", textDecoration: "none",
    fontWeight: 700, fontSize: "0.9rem",
  },
  alertError: {
    background: "#fee2e2", color: "#991b1b", padding: "0.75rem 1rem",
    borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500,
    marginBottom: "1rem", textAlign: "left",
  },
  backLink: { display: "inline-block", marginTop: "1.5rem", color: "#3b82f6", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 },
  spinner:  { width: "15px", height: "15px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: "50%", display: "inline-block" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  [style*="border-top-color: white"], [style*="border-top-color:#3b82f6"] { animation: spin 0.9s linear infinite; }
`;