import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function GoogleUserSuccess({ onLogin }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const userRaw = searchParams.get("user");
      if (!userRaw) {
        navigate("/ulogin", { replace: true });
        return;
      }

      const user = JSON.parse(decodeURIComponent(userRaw));

      // Same as normal user login
      localStorage.setItem("user", JSON.stringify(user));
      if (onLogin) onLogin(user);

      navigate("/userdashboard", { replace: true });
    } catch {
      navigate("/ulogin", { replace: true });
    }
  }, []);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      fontFamily: "Inter, sans-serif",
      flexDirection: "column",
      gap: "16px"
    }}>
      <div style={{
        width: "40px", height: "40px",
        border: "3px solid #e2e8f0",
        borderTopColor: "#3b82f6",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <p style={{ color: "#64748b" }}>Signing you in with Google...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}