import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function VerifyOtp({ onLogin }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();

  const adminId = sessionStorage.getItem("pendingAdminId");

  useEffect(() => {
    if (!adminId) {
      navigate("/login", { replace: true });
    }
  }, [adminId, navigate]);

  useEffect(() => {
    let timer;
    if (resendTimer > 0 && !canResend) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer, canResend]);

  if (!adminId) return null;

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, "");
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    
    // Focus the next empty or last input
    const nextIndex = Math.min(pastedData.length, 5);
    document.getElementById(`otp-${nextIndex}`)?.focus();
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setError("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/admin/verify-otp", {
        adminId,
        otp: otpString,
      });
      sessionStorage.setItem("adminVerified", "true");
      sessionStorage.removeItem("pendingAdminId");
      localStorage.setItem("authUser", JSON.stringify(res.data.admin));
      if (onLogin) onLogin(res.data.admin);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP");
      // Shake animation on error
      const card = document.querySelector(".otp-card");
      card.classList.add("shake");
      setTimeout(() => card.classList.remove("shake"), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    try {
      await axios.post("http://localhost:5000/admin/resend-otp", { adminId });
      setError("");
      setCanResend(false);
      setResendTimer(30);
      // Show success toast
      showToast("New OTP sent to your email!", "success");
    } catch {
      setError("Failed to resend OTP. Please try again.");
    }
  };

  const showToast = (message, type) => {
    // Simple toast implementation
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const isOtpComplete = otp.every(digit => digit !== "");

  return (
    <>
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        
        .shake {
          animation: shake 0.5s ease-in-out;
        }

        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a202c;
          color: white;
          padding: 12px 24px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 1000;
          animation: slideUp 0.3s ease;
        }

        .toast.success {
          background: #10b981;
        }

        .toast.error {
          background: #ef4444;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .otp-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .button-loading {
          position: relative;
          color: transparent;
        }

        .button-loading::after {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid white;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        <div className="otp-card" style={styles.card}>
          <div style={styles.iconWrapper}>
            <div style={styles.icon}>📧</div>
            <div style={styles.iconRing}></div>
          </div>
          
          <h2 style={styles.title}>Verify OTP</h2>
          <p style={styles.subtitle}>
            Enter the 6-digit code sent to your email address
          </p>

          {error && (
            <div style={styles.error}>
              <span style={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}

          <div style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                style={{
                  ...styles.otpInput,
                  borderColor: digit ? "#6366f1" : "#e2e8f0",
                }}
                className="otp-input"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !isOtpComplete}
            style={{
              ...styles.button,
              ...(loading || !isOtpComplete ? styles.buttonDisabled : {}),
            }}
            className={loading ? "button-loading" : ""}
          >
            {loading ? "Verifying" : "Verify & Continue"}
          </button>

          <div style={styles.resendSection}>
            <p style={styles.resendText}>
              Didn't receive the code?{" "}
              <button
                onClick={handleResend}
                disabled={!canResend}
                style={{
                  ...styles.resendLink,
                  ...(!canResend ? styles.resendDisabled : {}),
                }}
              >
                Resend {!canResend && `(${resendTimer}s)`}
              </button>
            </p>
          </div>

          <div style={styles.divider}>
            <span style={styles.dividerText}>or</span>
          </div>

          <button onClick={() => navigate("/login")} style={styles.backBtn}>
            <span style={styles.backIcon}>←</span>
            Back to Login
          </button>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Code expires in <span style={styles.footerHighlight}>10 minutes</span>
          </p>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f9fafc",
    backgroundImage: "radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 30%)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "20px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "32px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
  },
  iconWrapper: {
    position: "relative",
    width: "80px",
    height: "80px",
    margin: "0 auto 24px",
  },
  icon: {
    fontSize: "40px",
    position: "relative",
    zIndex: 2,
    width: "80px",
    height: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f4ff",
    borderRadius: "24px",
  },
  iconRing: {
    position: "absolute",
    top: "-8px",
    left: "-8px",
    right: "-8px",
    bottom: "-8px",
    border: "2px solid #e0e7ff",
    borderRadius: "32px",
    animation: "pulse 2s infinite",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 12px 0",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "16px",
    color: "#475569",
    marginBottom: "32px",
    lineHeight: 1.6,
    maxWidth: "320px",
    margin: "0 auto 32px",
  },
  error: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fee2e2",
    color: "#b91c1c",
    padding: "14px 16px",
    borderRadius: "14px",
    marginBottom: "24px",
    fontSize: "14px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textAlign: "left",
  },
  errorIcon: {
    fontSize: "18px",
  },
  otpContainer: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginBottom: "32px",
    flexWrap: "wrap",
  },
  otpInput: {
    width: "56px",
    height: "64px",
    border: "2px solid #e2e8f0",
    borderRadius: "16px",
    fontSize: "24px",
    fontWeight: "600",
    textAlign: "center",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "white",
    color: "#0f172a",
  },
  button: {
    width: "100%",
    padding: "16px 24px",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "white",
    border: "none",
    borderRadius: "16px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "20px",
    boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    background: "linear-gradient(135deg, #94a3b8, #64748b)",
    boxShadow: "none",
  },
  resendSection: {
    marginBottom: "20px",
  },
  resendText: {
    fontSize: "14px",
    color: "#64748b",
  },
  resendLink: {
    background: "none",
    border: "none",
    color: "#4f46e5",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
    padding: "4px 8px",
    transition: "color 0.2s",
  },
  resendDisabled: {
    color: "#94a3b8",
    cursor: "not-allowed",
  },
  divider: {
    position: "relative",
    margin: "24px 0",
    borderTop: "1px solid #e2e8f0",
  },
  dividerText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "white",
    padding: "0 12px",
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "500",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    margin: "0 auto",
    padding: "12px 20px",
    borderRadius: "12px",
    transition: "all 0.2s",
  },
  backIcon: {
    fontSize: "18px",
    transition: "transform 0.2s",
  },
  footer: {
    marginTop: "24px",
  },
  footerText: {
    fontSize: "13px",
    color: "#94a3b8",
  },
  footerHighlight: {
    color: "#4f46e5",
    fontWeight: "600",
  },
};