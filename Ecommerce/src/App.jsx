import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/AdminDashboard";
import OrderForm from "./components/OrderForm";
import Login from "./pages/Login";
import Ulogin from "./pages/ulogin";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";
import MyOrders from "./pages/MyOrders";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/ulogin" element={<Ulogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/userdashboard" element={<UserDashboard />} />
        <Route path="/myorders" element={<MyOrders />} />
        {/* Redirect /account to /ulogin */}
        <Route path="/account" element={<Navigate to="/ulogin" replace />} />
        {/* Single item order (Buy Now) */}
        <Route path="/order/:productId" element={<OrderForm />} />
        {/* Multi-item cart checkout */}
        <Route path="/checkout" element={<OrderForm />} />
        {/* Catch all - redirect to home for any undefined routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}