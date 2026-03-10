import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function ForgotPassword() {
  const [email, setEmail]       = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setEmailError("");

    if (!email.trim())               return setEmailError("Email is required");
    if (!/\S+@\S+\.\S+/.test(email)) return setEmailError("Enter a valid email");

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/user/forgot-password", { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.brand}>⚡ MyShop</div>

        {success ? (
          // ── Success state ──
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📬</div>
            <h2 style={S.title}>Check Your Inbox</h2>
            <p style={S.subtitle}>
              We've sent a password reset link to <strong>{email}</strong>.<br />
              It expires in 1 hour. Check your spam folder too.
            </p>
            <Link to="/ulogin" style={S.backLink}>← Back to Login</Link>
          </div>
        ) : (
          // ── Form state ──
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔑</div>
            <h2 style={S.title}>Forgot Password?</h2>
            <p style={S.subtitle}>
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} style={{ textAlign: "left" }} noValidate>
              {error && <div style={S.alertError}>⚠️ {error}</div>}

              <div style={S.formGroup}>
                <label style={S.label}>Email Address</label>
                <div style={S.inputWrap}>
                  <span style={S.prefix}>✉️</span>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    style={{ ...S.input, ...(emailError ? S.inputErr : {}) }}
                  />
                </div>
                {emailError && <span style={S.fieldErr}>{emailError}</span>}
              </div>

              <button type="submit" style={S.btn} disabled={loading}>
                {loading
                  ? <><span style={S.spinner} /> Sending...</>
                  : "Send Reset Link"
                }
              </button>
            </form>

            <Link to="/ulogin" style={S.backLink}>← Back to Login</Link>
          </>
        )}
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