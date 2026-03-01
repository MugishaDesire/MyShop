import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/AdminDashboard";
import OrderForm from "./components/OrderForm";
import Login from "./pages/Login";
import Ulogin from "./pages/ulogin";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/userdashboard";
import MyOrders from "./pages/MyOrders";
import Profile from "./components/Profile";
import Wishlist from "./pages/Wishlist";

// ─── Single source of truth: React state (initialized from localStorage) ──────
// All route guards use the same `authUser` / `user` state passed down as props.
// localStorage is only used to PERSIST across page refreshes — never read
// mid-session for routing decisions. This eliminates all race conditions.

export default function App() {
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw || raw === "undefined" || raw === "null") return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch { return null; }
  });

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw || raw === "undefined" || raw === "null") return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch { return null; }
  });

  const handleAdminLogin = (userData) => {
    localStorage.setItem("authUser", JSON.stringify(userData));
    setAuthUser(userData);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("authUser");
    setAuthUser(null);
  };

  const handleUserLogin = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleUserLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Navbar authUser={authUser} user={user} />
      <Routes>

        {/* ── Public ──────────────────────────────────────────────────────── */}
        <Route path="/"        element={<Home />} />
        <Route path="/about"   element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/signup"  element={<Signup />} />

        {/* ── Admin login: if authUser state is set → already logged in ────── */}
        <Route
          path="/login"
          element={
            authUser
              ? <Navigate to="/admin" replace />
              : <Login onLogin={handleAdminLogin} />
          }
        />

        {/* ── User login ───────────────────────────────────────────────────── */}
        <Route
          path="/ulogin"
          element={
            user
              ? <Navigate to="/userdashboard" replace />
              : <Ulogin onLogin={handleUserLogin} />
          }
        />

        {/* ── Admin protected: guard uses authUser STATE (not localStorage) ── */}
        <Route
          path="/admin"
          element={
            authUser
              ? <AdminDashboard onLogout={handleAdminLogout} />
              : <Navigate to="/login" replace />
          }
        />

        {/* ── User protected: all use user STATE ───────────────────────────── */}
        <Route path="/userdashboard" element={user ? <UserDashboard onLogout={handleUserLogout} /> : <Navigate to="/ulogin" replace />} />
        <Route path="/myorders"      element={user ? <MyOrders />    : <Navigate to="/ulogin" replace />} />
        <Route path="/profile"       element={user ? <Profile />     : <Navigate to="/ulogin" replace />} />
        <Route path="/wishlist"      element={user ? <Wishlist />    : <Navigate to="/ulogin" replace />} />
        <Route path="/order/:productId" element={user ? <OrderForm /> : <Navigate to="/ulogin" replace />} />
        <Route path="/checkout"      element={user ? <OrderForm />   : <Navigate to="/ulogin" replace />} />

        {/* ── Fallbacks ────────────────────────────────────────────────────── */}
        <Route path="/account" element={<Navigate to="/ulogin" replace />} />
        <Route path="*"        element={<Navigate to="/"       replace />} />

      </Routes>
    </BrowserRouter>
  );
}
