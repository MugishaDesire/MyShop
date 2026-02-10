import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/AdminDashboard";
import OrderForm from "./components/OrderForm"; // Single component for both
import Login from "./pages/Login";

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
        {/* Single item order (Buy Now) */}
        <Route path="/order/:productId" element={<OrderForm />} />
        {/* Multi-item cart checkout */}
        <Route path="/checkout" element={<OrderForm />} />
      </Routes>
    </BrowserRouter>
  );
}