import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Services from "./pages/Services";
import AdminDashboard from "./pages/AdminDashboard";
import OrderForm from "./components/OrderForm";
import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GoogleUserSuccess from "./pages/GoogleUserSuccess";
import Ulogin from "./pages/ulogin";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/userdashboard";
import MyOrders from "./pages/MyOrders";
import Profile from "./components/Profile";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import CourierDashboard from "./pages/CourierDashboard"; // ✅ uncommented

const NAVBAR_PAGES = ["/", "/about", "/contact", "/services"];

// ✅ Guard for courier-only routes
function CourierRoute({ user, children }) {
  if (!user)               return <Navigate to="/ulogin" replace />;
  if (user.role !== "courier") return <Navigate to="/userdashboard" replace />;
  return children;
}

// ✅ Guard for user-only routes (blocks couriers from user pages)
function UserRoute({ user, children }) {
  if (!user)                   return <Navigate to="/ulogin" replace />;
  if (user.role === "courier") return <Navigate to="/courier/dashboard" replace />;
  return children;
}

function AppLayout({
  authUser, user,
  handleAdminLogin, handleAdminLogout,
  handleUserLogin,  handleUserLogout,
}) {
  const location  = useLocation();
  const showNavbar = NAVBAR_PAGES.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>

        {/* ── Public routes ──────────────────────────────── */}
        <Route path="/"               element={<Home />} />
        <Route path="/about"          element={<About />} />
        <Route path="/products"       element={<ProductCard />} />
        <Route path="/contact"        element={<Contact />} />
        <Route path="/services"       element={<Services />} />
        <Route path="/signup"         element={<Signup />} />
        <Route path="/cart"           element={<Cart />} />
        <Route path="/wishlist"       element={<Wishlist />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/auth/google/user-success"
          element={<GoogleUserSuccess onLogin={handleUserLogin} />}
        />

        {/* ── Auth routes ────────────────────────────────── */}
        <Route path="/login"
          element={authUser
            ? <Navigate to="/admin" replace />
            : <Login onLogin={handleAdminLogin} />}
        />
        <Route path="/verify-otp"
          element={<VerifyOtp onLogin={handleAdminLogin} />}
        />
        <Route path="/ulogin"
          element={<Ulogin onLogin={handleUserLogin} />}
        />

        {/* ── Admin routes ───────────────────────────────── */}
        <Route path="/admin"
          element={authUser
            ? <AdminDashboard onLogout={handleAdminLogout} />
            : <Navigate to="/login" replace />}
        />

        {/* ── Courier routes ─────────────────────────────── */}
        <Route path="/courier/dashboard"
          element={
            <CourierRoute user={user}>
              <CourierDashboard onLogout={handleUserLogout} />
            </CourierRoute>
          }
        />

        {/* ── User routes (blocked for couriers) ─────────── */}
        <Route path="/userdashboard"
          element={
            <UserRoute user={user}>
              <UserDashboard onLogout={handleUserLogout} />
            </UserRoute>
          }
        />
        <Route path="/myorders"
          element={
            <UserRoute user={user}>
              <MyOrders />
            </UserRoute>
          }
        />
        <Route path="/profile"
          element={
            <UserRoute user={user}>
              <Profile />
            </UserRoute>
          }
        />
        <Route path="/order/:productId"
          element={
            <UserRoute user={user}>
              <OrderForm />
            </UserRoute>
          }
        />
        <Route path="/checkout"
          element={
            <UserRoute user={user}>
              <OrderForm />
            </UserRoute>
          }
        />

        {/* ── Fallbacks ──────────────────────────────────── */}
        <Route path="/account" element={<Navigate to="/ulogin" replace />} />
        <Route path="*"        element={<Navigate to="/"       replace />} />

      </Routes>
      <Footer />
    </>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw || raw === "undefined" || raw === "null") return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch { return null; }
  });

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw || raw === "undefined" || raw === "null") return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch { return null; }
  });

  useEffect(() => {
    const verified = sessionStorage.getItem("adminVerified");
    if (authUser && (!verified || verified !== "true")) {
      localStorage.removeItem("authUser");
      setAuthUser(null);
    }
  }, []);

  const handleAdminLogin  = (u) => {
    sessionStorage.setItem("authUser",      JSON.stringify(u));
    sessionStorage.setItem("adminVerified", "true");
    setAuthUser(u);
  };
  const handleAdminLogout = () => {
    localStorage.removeItem("authUser");
    sessionStorage.removeItem("adminVerified");
    sessionStorage.removeItem("pendingAdminId");
    setAuthUser(null);
  };

  const handleUserLogin  = (u) => {
    localStorage.setItem("user", JSON.stringify(u)); // ✅ fixed: was sessionStorage
    setUser(u);
  };
  const handleUserLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <AppLayout
        authUser={authUser}
        user={user}
        handleAdminLogin={handleAdminLogin}
        handleAdminLogout={handleAdminLogout}
        handleUserLogin={handleUserLogin}
        handleUserLogout={handleUserLogout}
      />
    </BrowserRouter>
  );
}