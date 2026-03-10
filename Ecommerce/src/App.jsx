import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
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

const NAVBAR_PAGES = ["/", "/about", "/contact", "/services"];

function AppLayout({ authUser, user, handleAdminLogin, handleAdminLogout, handleUserLogin, handleUserLogout }) {
  // ✅ Bug 1 fixed — useEffect removed from here, moved to App()
  const location = useLocation();
  const showNavbar = NAVBAR_PAGES.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/about"   element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/services" element={<Services />} />
        <Route path="/signup"  element={<Signup />} />
        <Route path="/cart"    element={<Cart />} />
        <Route path="/wishlist"  element={<Wishlist />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/login"   element={authUser ? <Navigate to="/admin" replace /> : <Login onLogin={handleAdminLogin} />} />
        <Route path="/verify-otp" element={<VerifyOtp onLogin={handleAdminLogin} />} />
        <Route path="/ulogin"  element={<Ulogin onLogin={handleUserLogin} />} />
        <Route path="/admin"   element={authUser ? <AdminDashboard onLogout={handleAdminLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/userdashboard" element={user ? <UserDashboard onLogout={handleUserLogout} /> : <Navigate to="/ulogin" replace />} />
        <Route path="/myorders"      element={user ? <MyOrders />    : <Navigate to="/ulogin" replace />} />
        <Route path="/profile"       element={user ? <Profile />     : <Navigate to="/ulogin" replace />} />
        {/* <Route path="/wishlist"      element={user ? <Wishlist />    : <Navigate to="/ulogin" replace />} /> */}
        <Route path="/order/:productId" element={user ? <OrderForm /> : <Navigate to="/ulogin" replace />} />
        <Route path="/checkout"      element={user ? <OrderForm />   : <Navigate to="/ulogin" replace />} />
        <Route path="/account" element={<Navigate to="/ulogin" replace />} />
        <Route path="*"        element={<Navigate to="/"       replace />} />
        <Route path="/auth/google/user-success" element={<GoogleUserSuccess onLogin={handleUserLogin} />}
        />
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

 
  const handleAdminLogin = (u) => {
    localStorage.setItem("authUser", JSON.stringify(u));
    sessionStorage.setItem("adminVerified", "true");
    setAuthUser(u);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("authUser");
    sessionStorage.removeItem("adminVerified");
    sessionStorage.removeItem("pendingAdminId");
    setAuthUser(null);
  };

  const handleUserLogin  = (u) => { localStorage.setItem("user", JSON.stringify(u)); setUser(u); };
  const handleUserLogout = ()  => { localStorage.removeItem("user"); setUser(null); };

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