import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function OrderForm() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { productId } = useParams();

  const isCheckoutPage = useRef(
    window.location.pathname.includes("/checkout")
  ).current;

  const [product,         setProduct]         = useState(null);
  const [cartItems,       setCartItems]       = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [errors,          setErrors]          = useState({});
  const [totalPrice,      setTotalPrice]      = useState(0);
  const [totalItems,      setTotalItems]      = useState(0);
  const [user,            setUser]            = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Payment states
  const [paymentStatus,  setPaymentStatus]  = useState(null); // null | pending | successful | failed
  const [transactionRef, setTransactionRef] = useState(null);

  const [formData, setFormData] = useState({
    customer:     "",
    telephone:    "",
    email:        "",
    quantity:     1,
    locationText: "",
  });

  // ── Load user & auto-fill form ──────────────────────────────
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined" && userData !== "null") {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setFormData((prev) => ({
          ...prev,
          customer:     parsedUser.fullname     || parsedUser.name     || "",
          email:        parsedUser.email        || "",
          telephone:    parsedUser.phonenumber  || parsedUser.phone    || "",
          locationText: parsedUser.address      || parsedUser.location || "",
        }));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  const ensureNumberPrice = (item) => ({
    ...item,
    price: parseFloat(item.price) || 0,
  });

  const navigateFallback = () => {
    const storedUser = localStorage.getItem("user");
    const hasUser =
      storedUser && storedUser !== "undefined" && storedUser !== "null";
    navigate(hasUser ? "/userdashboard" : "/");
  };

  // ── Load product or cart ────────────────────────────────────
  useEffect(() => {
    if (isCheckoutPage) {
      const cartFromState = location.state?.cart;
      if (cartFromState && cartFromState.length > 0) {
        setCartItems(cartFromState.map(ensureNumberPrice));
      } else {
        const savedCart = localStorage.getItem("shoppingCart");
        if (savedCart) {
          try {
            const parsed = JSON.parse(savedCart);
            if (parsed.length > 0) {
              setCartItems(parsed.map(ensureNumberPrice));
            } else {
              navigateFallback();
            }
          } catch {
            navigateFallback();
          }
        } else {
          navigateFallback();
        }
      }
    } else {
      if (location.state?.product) {
        setProduct(ensureNumberPrice(location.state.product));
      } else if (productId) {
        axios
          .get(`http://localhost:5000/products/${productId}`)
          .then((res) => setProduct(ensureNumberPrice(res.data)))
          .catch(() => navigateFallback());
      } else {
        navigateFallback();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Calculate totals ────────────────────────────────────────
  useEffect(() => {
    if (isCheckoutPage && cartItems.length > 0) {
      setTotalPrice(
        cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      );
      setTotalItems(
        cartItems.reduce((sum, item) => sum + item.quantity, 0)
      );
    } else if (product) {
      setTotalPrice(product.price * formData.quantity);
      setTotalItems(formData.quantity);
    }
  }, [cartItems, product, formData.quantity, isCheckoutPage]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ── GPS location detection ──────────────────────────────────
  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          const address =
            data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          handleInputChange("locationText", address);
        } catch {
          handleInputChange(
            "locationText",
            `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === 1) {
          alert(
            "Location permission denied. Please type your address manually."
          );
        } else {
          alert(
            "Could not retrieve your location. Please type your address manually."
          );
        }
      },
      { timeout: 10000 }
    );
  };

  const updateQuantity = (id, newQty) => {
    if (newQty < 1) { removeItem(id); return; }
    setCartItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== id) return item;
        if (newQty > item.stock) {
          alert(`Only ${item.stock} items available for ${item.name}`);
          return item;
        }
        return { ...item, quantity: newQty };
      });
      localStorage.setItem("shoppingCart", JSON.stringify(updated));
      return updated;
    });
  };

  const removeItem = (id) => {
    const newCart = cartItems.filter((item) => item.id !== id);
    setCartItems(newCart);
    localStorage.setItem("shoppingCart", JSON.stringify(newCart));
    if (newCart.length === 0) navigateFallback();
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.customer.trim())
      newErrors.customer = "Name is required";
    if (!formData.telephone.trim())
      newErrors.telephone = "Phone number is required";
    else if (!/^07[2389]\d{7}$/.test(formData.telephone.replace(/\s+/g, "")))
      newErrors.telephone =
        "Enter a valid MTN or Airtel Rwanda number (e.g. 078xxxxxxx)";
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Enter a valid email address";
    if (!formData.locationText.trim())
      newErrors.locationText = "Delivery location is required";
    if (!isCheckoutPage && product) {
      if (formData.quantity < 1)
        newErrors.quantity = "Quantity must be at least 1";
      else if (formData.quantity > product.stock)
        newErrors.quantity = `Only ${product.stock} items available`;
    }
    if (isCheckoutPage && cartItems.length === 0) {
      alert("Your cart is empty! Please add items before checking out.");
      return false;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goAfterOrder = () => {
    if (user) navigate("/userdashboard");
    else navigate("/");
  };

  // ── Save order to DB (called after payment confirmed) ───────
  const saveOrder = async (paymentRef) => {
    try {
      setLoading(true);

      if (isCheckoutPage) {
        const orderData = {
          items: cartItems.map((item) => ({
            productId: item.id,
            qty: item.quantity,
          })),
          cust_name:   formData.customer,
          cust_phone:  formData.telephone,
          cust_email:  formData.email,
          location:    formData.locationText,
          status:      "Paid",
          payment_ref: paymentRef,
          userId:      user?.id || null,
        };

        await axios.post("http://localhost:5000/orders/batch", orderData, {
          headers: { "Content-Type": "application/json" },
        });

        localStorage.removeItem("shoppingCart");
        window.dispatchEvent(new Event("cartUpdated"));

      } else {
        const newOrder = {
          product_id:  productId,
          cust_name:   formData.customer,
          cust_phone:  formData.telephone,
          cust_email:  formData.email,
          qty:         formData.quantity,
          location:    formData.locationText,
          date:        new Date(),
          status:      "Paid",
          payment_ref: paymentRef,
          userId:      user?.id || null,
        };

        await axios.post(
          `http://localhost:5000/orders/${productId}`,
          newOrder,
          { headers: { "Content-Type": "application/json" } }
        );
      }

    } catch (err) {
      console.error("Order save error:", err);
      alert(
        `Payment was successful but order could not be saved.\n` +
        `Please contact support with your payment reference: ${paymentRef}`
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Main submit: initiate payment then save order ───────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);

      // 1. Initiate Paypack cashin
      const amount = Math.round(totalPrice); // RWF — whole numbers only
      const payRes = await axios.post(
        "http://localhost:5000/api/payment/cashin",
        { amount, phone: formData.telephone }
      );

      const { ref } = payRes.data;
      setTransactionRef(ref);
      setPaymentStatus("pending");
      setLoading(false);

      // 2. Poll every 3 seconds (max 20 attempts = 60s)
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await axios.get(
            `http://localhost:5000/api/payment/status/${ref}`
          );
          const { status } = statusRes.data;

          if (status === "successful") {
            clearInterval(interval);
            setPaymentStatus("successful");
            await saveOrder(ref); // 3. Save order only after payment confirmed

          } else if (status === "failed") {
            clearInterval(interval);
            setPaymentStatus("failed");

          } else if (attempts >= 20) {
            // 60s passed — stop polling, webhook handles the rest
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
          clearInterval(interval);
        }
      }, 3000);

    } catch (err) {
      setLoading(false);
      console.error("Payment initiation error:", err);
      if (err.response?.data?.error) {
        alert(`Payment failed: ${err.response.data.error}`);
      } else {
        alert(
          "Could not initiate payment. Please check your phone number and try again."
        );
      }
    }
  };

  // ── Empty cart guard ────────────────────────────────────────
  if (isCheckoutPage && cartItems.length === 0) {
    return (
      <div className="empty-cart-message">
        <div className="empty-cart-icon">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Please add items to your cart before placing an order.</p>
        <button
          onClick={() =>
            user ? navigate("/userdashboard") : navigate("/")
          }
        >
          {user ? "Back to Dashboard" : "Continue Shopping"}
        </button>
        <style>{`
          .empty-cart-message { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:70vh; padding:2rem; text-align:center; gap:1rem; }
          .empty-cart-icon { font-size:5rem; opacity:0.5; }
          .empty-cart-message h2 { color:#1e293b; margin:0; }
          .empty-cart-message p  { color:#64748b; margin:0; }
          .empty-cart-message button { background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border:none; padding:.75rem 2rem; border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer; }
          .empty-cart-message button:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(59,130,246,.3); }
        `}</style>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      <div className="order-container">

        {/* Back bar */}
        <div className="order-back-bar">
          <button
            className="back-btn"
            onClick={() =>
              user ? navigate("/userdashboard") : navigate(-1)
            }
            disabled={paymentStatus === "pending"}
          >
            {user ? "← Back to Dashboard" : "← Back"}
          </button>
          {user && (
            <div className="user-indicator">
              <span className="indicator-dot">✓</span>
              Signed in as{" "}
              <strong>{user.fullname || user.name || user.email}</strong>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="order-header">
          <h2 className="order-title">
            {isCheckoutPage ? "Checkout" : "Place Your Order"}
          </h2>
          <div className="order-summary">
            {isCheckoutPage ? (
              <>
                <h3>Order Summary</h3>
                <div className="summary-info">
                  <span className="items-count">
                    {totalItems} item{totalItems !== 1 ? "s" : ""}
                  </span>
                  <span className="order-total">
                    Total: {totalPrice.toFixed(0)} RWF
                  </span>
                </div>
              </>
            ) : product && (
              <>
                <h3>{product.name}</h3>
                <div className="price-info">
                  <span className="price">
                    {product.price.toFixed(0)} RWF each
                  </span>
                  <span className="stock-hint">
                    ({product.stock} available)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cart Items (checkout only) */}
        {isCheckoutPage && cartItems.length > 0 && (
          <>
            <div className="cart-items-section">
              <h3 className="section-title">Items in Your Order</h3>
              <div className="cart-items-list">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item-card">
                    <div className="item-info">
                      <div className="item-name-price">
                        <h4>{item.name}</h4>
                        <span className="item-price">
                          {item.price.toFixed(0)} RWF each
                        </span>
                      </div>
                      <div className="item-stock">
                        {item.stock <= 0 ? (
                          <span className="out-of-stock">Out of Stock</span>
                        ) : item.stock < 10 ? (
                          <span className="low-stock">
                            Only {item.stock} left
                          </span>
                        ) : (
                          <span className="in-stock">In Stock</span>
                        )}
                      </div>
                    </div>
                    <div className="item-controls">
                      <div className="quantity-control">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={
                            item.quantity <= 1 || paymentStatus === "pending"
                          }
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="quantity-input"
                          disabled={paymentStatus === "pending"}
                        />
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={
                            item.quantity >= item.stock ||
                            paymentStatus === "pending"
                          }
                        >
                          +
                        </button>
                      </div>
                      <div className="item-total">
                        <span>Item Total:</span>
                        <span className="item-total-price">
                          {(item.price * item.quantity).toFixed(0)} RWF
                        </span>
                      </div>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeItem(item.id)}
                        disabled={paymentStatus === "pending"}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-row">
                <span>Items:</span>
                <span>{totalItems}</span>
              </div>
              {cartItems.map((item) => (
                <div key={item.id} className="summary-item">
                  <span>
                    {item.name} (x{item.quantity}):
                  </span>
                  <span>{(item.price * item.quantity).toFixed(0)} RWF</span>
                </div>
              ))}
              <div className="summary-row total">
                <span>Order Total:</span>
                <span className="total-price">
                  {totalPrice.toFixed(0)} RWF
                </span>
              </div>
            </div>
          </>
        )}

        {/* Single item summary */}
        {!isCheckoutPage && product && (
          <div className="summary-card">
            <div className="summary-row">
              <span>Quantity:</span>
              <span>{formData.quantity}</span>
            </div>
            <div className="summary-row total">
              <span>Total Amount:</span>
              <span className="total-price">
                {totalPrice.toFixed(0)} RWF
              </span>
            </div>
          </div>
        )}

        {/* Customer Form */}
        <form onSubmit={handleSubmit} className="order-form" noValidate>
          <h3 className="section-title">Customer Information</h3>

          {user && (
            <div className="auto-fill-notice">
              <span>ℹ️</span> Your information has been auto-filled from
              your account. You can edit if needed.
            </div>
          )}

          <div className="form-group">
            <label htmlFor="customer">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="customer"
              type="text"
              placeholder="John Doe"
              value={formData.customer}
              onChange={(e) =>
                handleInputChange("customer", e.target.value)
              }
              className={errors.customer ? "error" : ""}
              disabled={paymentStatus === "pending"}
            />
            {errors.customer && (
              <span className="error-message">{errors.customer}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="telephone">
              Phone Number (Mobile Money){" "}
              <span className="required">*</span>
            </label>
            <input
              id="telephone"
              type="tel"
              placeholder="078xxxxxxx"
              value={formData.telephone}
              onChange={(e) =>
                handleInputChange("telephone", e.target.value)
              }
              className={errors.telephone ? "error" : ""}
              disabled={paymentStatus === "pending"}
            />
            <small style={{ color: "#64748b", fontSize: "0.8rem" }}>
              MTN or Airtel Rwanda number — payment prompt will be sent here
            </small>
            {errors.telephone && (
              <span className="error-message">{errors.telephone}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={errors.email ? "error" : ""}
              disabled={paymentStatus === "pending"}
            />
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          {!isCheckoutPage && product && (
            <div className="form-group">
              <label htmlFor="quantity">
                Quantity <span className="required">*</span>{" "}
                <span className="hint">(Max: {product.stock})</span>
              </label>
              <div className="quantity-control">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() =>
                    handleInputChange(
                      "quantity",
                      Math.max(1, formData.quantity - 1)
                    )
                  }
                  disabled={
                    formData.quantity <= 1 || paymentStatus === "pending"
                  }
                >
                  −
                </button>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.stock}
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", Number(e.target.value))
                  }
                  className={`quantity-input ${errors.quantity ? "error" : ""}`}
                  disabled={paymentStatus === "pending"}
                />
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() =>
                    handleInputChange(
                      "quantity",
                      Math.min(product.stock, formData.quantity + 1)
                    )
                  }
                  disabled={
                    formData.quantity >= product.stock ||
                    paymentStatus === "pending"
                  }
                >
                  +
                </button>
              </div>
              {errors.quantity && (
                <span className="error-message">{errors.quantity}</span>
              )}
            </div>
          )}

          {/* ── Delivery Address with GPS ── */}
          <div className="form-group">
            <label htmlFor="locationText">
              Delivery Address <span className="required">*</span>
            </label>

            <button
              type="button"
              className="geo-btn"
              onClick={detectLocation}
              disabled={locationLoading || paymentStatus === "pending"}
            >
              {locationLoading ? (
                <>
                  <span className="spinner geo-spinner"></span>
                  Detecting location…
                </>
              ) : (
                <>
                  <svg
                    className="geo-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
                  </svg>
                  Use my current location
                </>
              )}
            </button>

            <textarea
              id="locationText"
              placeholder="Or type your complete delivery address"
              value={formData.locationText}
              onChange={(e) =>
                handleInputChange("locationText", e.target.value)
              }
              className={errors.locationText ? "error" : ""}
              rows="3"
              disabled={paymentStatus === "pending"}
            />
            {errors.locationText && (
              <span className="error-message">{errors.locationText}</span>
            )}
          </div>

          {/* ── Payment Status Messages ── */}
          {paymentStatus === "pending" && (
            <div className="payment-status pending">
              <p className="ps-title">📱 Check your phone!</p>
              <p className="ps-body">
                A USSD prompt has been sent to{" "}
                <strong>{formData.telephone}</strong>.<br />
                Approve the payment to complete your order.
              </p>
              <p className="ps-ref">
                ⏳ Waiting for confirmation... &nbsp;|&nbsp; Ref:{" "}
                {transactionRef}
              </p>
            </div>
          )}

          {paymentStatus === "successful" && (
            <div className="payment-status successful">
              <p style={{ fontSize: "2rem" }}>🎉</p>
              <p className="ps-title" style={{ color: "#166534" }}>
                Payment Successful! Order Placed.
              </p>
              <p className="ps-ref" style={{ color: "#166534" }}>
                Ref: {transactionRef}
              </p>
              <button
                type="button"
                className="btn-go-dashboard"
                onClick={goAfterOrder}
              >
                {user ? "Go to Dashboard →" : "Back to Shop →"}
              </button>
            </div>
          )}

          {paymentStatus === "failed" && (
            <div className="payment-status failed">
              <p className="ps-title" style={{ color: "#991b1b" }}>
                ❌ Payment failed or was rejected.
              </p>
              <p className="ps-body" style={{ color: "#991b1b" }}>
                Please try again or use a different number.
              </p>
              <button
                type="button"
                className="btn-retry"
                onClick={() => setPaymentStatus(null)}
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Form Actions (hidden after success) ── */}
          {paymentStatus !== "successful" && (
            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  user ? navigate("/userdashboard") : navigate(-1)
                }
                disabled={loading || paymentStatus === "pending"}
              >
                {isCheckoutPage ? "Back" : "Cancel"}
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={
                  loading ||
                  paymentStatus === "pending" ||
                  (isCheckoutPage && cartItems.length === 0)
                }
              >
                {loading ? (
                  <>
                    <span className="spinner"></span> Processing...
                  </>
                ) : paymentStatus === "pending" ? (
                  "⏳ Awaiting Payment..."
                ) : (
                  `Pay ${Math.round(totalPrice).toLocaleString()} RWF →`
                )}
              </button>
            </div>
          )}

          <div className="form-footer">
            <p className="note">
              <span className="required">*</span> Required fields
            </p>
            <p className="disclaimer">
              By placing this order, you agree to our terms and conditions.
              Payment is processed securely via Paypack Mobile Money.
            </p>
          </div>
        </form>
      </div>

      <style>{`
        .order-container { max-width:800px; margin:40px auto; padding:0 20px 60px; }
        .order-back-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
        .back-btn { background:#f1f5f9; color:#475569; border:none; padding:.6rem 1.2rem; border-radius:8px; font-weight:600; cursor:pointer; font-size:.95rem; transition:all .2s; }
        .back-btn:hover:not(:disabled) { background:#e2e8f0; transform:translateX(-2px); }
        .back-btn:disabled { opacity:.5; cursor:not-allowed; }
        .user-indicator { display:flex; align-items:center; gap:.5rem; background:#d1fae5; color:#065f46; padding:.5rem 1rem; border-radius:50px; font-size:.875rem; }
        .indicator-dot { width:20px; height:20px; background:#10b981; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; }
        .order-header { background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%); padding:30px; border-radius:16px 16px 0 0; color:white; margin-bottom:2px; }
        .order-title { font-size:2rem; font-weight:800; margin-bottom:20px; text-align:center; }
        .order-summary h3 { font-size:1.3rem; margin:0 0 12px; opacity:.9; }
        .summary-info { display:flex; justify-content:space-between; align-items:center; }
        .items-count { font-weight:600; }
        .order-total { font-size:1.4rem; font-weight:800; }
        .price-info { display:flex; gap:12px; color:rgba(255,255,255,.9); font-size:.95rem; }
        .price { font-weight:600; }
        .stock-hint { opacity:.8; }
        .cart-items-section { background:white; padding:25px; border-radius:0 0 12px 12px; box-shadow:0 4px 6px rgba(0,0,0,.05); margin-bottom:20px; }
        .section-title { font-size:1.2rem; color:#1e293b; margin-bottom:20px; padding-bottom:10px; border-bottom:2px solid #f1f5f9; }
        .auto-fill-notice { background:#dbeafe; color:#1e40af; padding:.75rem 1rem; border-radius:8px; margin-bottom:1.5rem; display:flex; align-items:center; gap:.5rem; font-size:.9rem; }
        .cart-items-list { display:flex; flex-direction:column; gap:16px; }
        .cart-item-card { background:#f8fafc; padding:20px; border-radius:10px; border:1px solid #e2e8f0; }
        .item-info { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; }
        .item-name-price h4 { margin:0 0 8px; color:#334155; font-size:1.1rem; }
        .item-price { color:#059669; font-weight:600; font-size:.95rem; }
        .item-stock { font-size:.85rem; padding:4px 8px; border-radius:4px; }
        .out-of-stock { color:#dc2626; background:#fee2e2; }
        .low-stock { color:#d97706; background:#fef3c7; }
        .in-stock { color:#059669; background:#d1fae5; }
        .item-controls { display:flex; align-items:center; justify-content:space-between; gap:15px; }
        .quantity-control { display:flex; align-items:center; gap:8px; }
        .qty-btn { width:36px; height:36px; border:2px solid #cbd5e1; background:white; border-radius:6px; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
        .qty-btn:hover:not(:disabled) { border-color:#3b82f6; }
        .qty-btn:disabled { opacity:.5; cursor:not-allowed; }
        .quantity-input { width:60px; padding:8px; text-align:center; border:2px solid #e2e8f0; border-radius:6px; font-size:1rem; }
        .item-total { display:flex; flex-direction:column; align-items:flex-end; font-size:.9rem; color:#64748b; }
        .item-total-price { font-weight:600; color:#1e293b; font-size:1.1rem; }
        .remove-btn { background:#fee2e2; color:#dc2626; border:none; padding:8px 16px; border-radius:6px; font-size:.9rem; font-weight:600; cursor:pointer; transition:all .2s; }
        .remove-btn:hover:not(:disabled) { background:#fecaca; }
        .remove-btn:disabled { opacity:.5; cursor:not-allowed; }
        .summary-card { background:white; padding:25px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,.05); margin-bottom:25px; border:2px solid #3b82f6; }
        .summary-row { display:flex; justify-content:space-between; margin-bottom:12px; color:#475569; font-size:1rem; }
        .summary-item { display:flex; justify-content:space-between; margin-bottom:8px; padding-left:20px; color:#64748b; font-size:.95rem; }
        .summary-row.total { margin-top:15px; padding-top:15px; border-top:2px solid #e2e8f0; font-weight:700; color:#1e293b; font-size:1.2rem; }
        .total-price { color:#059669; font-size:1.4rem; font-weight:800; }
        .order-form { background:white; padding:25px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,.05); }
        .form-group { margin-bottom:20px; }
        .form-group label { display:block; margin-bottom:6px; font-weight:500; color:#334155; font-size:.9rem; }
        .required { color:#ef4444; }
        .hint { color:#94a3b8; font-size:.85rem; margin-left:8px; font-weight:normal; }
        .order-form input, .order-form textarea { width:100%; padding:12px 16px; border:2px solid #e2e8f0; border-radius:8px; font-size:1rem; outline:none; transition:all .2s; box-sizing:border-box; }
        .order-form input:focus, .order-form textarea:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
        .order-form input.error, .order-form textarea.error { border-color:#ef4444; }
        .order-form input:disabled, .order-form textarea:disabled { background:#f8fafc; cursor:not-allowed; opacity:.7; }
        .error-message { color:#ef4444; font-size:.85rem; margin-top:4px; display:block; }

        /* GPS location button */
        .geo-btn { display:flex; align-items:center; gap:8px; margin-bottom:10px; padding:10px 16px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:8px; font-size:.9rem; font-weight:600; cursor:pointer; transition:all .2s; width:auto; }
        .geo-btn:hover:not(:disabled) { background:#dbeafe; border-color:#93c5fd; }
        .geo-btn:disabled { opacity:.6; cursor:not-allowed; }
        .geo-icon { width:16px; height:16px; flex-shrink:0; }
        .geo-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(29,78,216,.3); border-radius:50%; border-top-color:#1d4ed8; animation:spin 1s ease-in-out infinite; flex-shrink:0; }

        /* Payment status boxes */
        .payment-status { border-radius:12px; padding:20px; margin:20px 0; text-align:center; }
        .payment-status.pending { background:#fff7ed; border:1px solid #fed7aa; }
        .payment-status.successful { background:#f0fdf4; border:1px solid #bbf7d0; }
        .payment-status.failed { background:#fef2f2; border:1px solid #fecaca; }
        .ps-title { font-size:1.1rem; font-weight:700; margin-bottom:8px; }
        .ps-body { font-size:.9rem; color:#78350f; margin-bottom:8px; line-height:1.5; }
        .ps-ref { font-size:.8rem; color:#92400e; margin-top:8px; }
        .btn-go-dashboard { margin-top:14px; padding:10px 28px; background:#0f172a; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:.95rem; transition:all .2s; }
        .btn-go-dashboard:hover { background:#1e3a5f; transform:translateY(-1px); }
        .btn-retry { margin-top:10px; padding:8px 20px; background:#ef4444; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600; transition:all .2s; }
        .btn-retry:hover { background:#dc2626; }

        /* Form actions */
        .form-actions { display:flex; gap:12px; margin-top:30px; }
        .btn-primary, .btn-secondary { flex:1; padding:16px; border:none; border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer; transition:all .2s; }
        .btn-primary { background:linear-gradient(135deg,#f97316,#ea580c); color:white; display:flex; align-items:center; justify-content:center; gap:8px; }
        .btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 4px 12px rgba(249,115,22,.35); }
        .btn-primary:disabled { background:#94a3b8; cursor:not-allowed; transform:none; }
        .btn-secondary { background:#f1f5f9; color:#475569; }
        .btn-secondary:hover:not(:disabled) { background:#e2e8f0; }
        .btn-secondary:disabled { opacity:.5; cursor:not-allowed; }
        .spinner { display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,.3); border-radius:50%; border-top-color:white; animation:spin 1s ease-in-out infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .form-footer { margin-top:25px; text-align:center; }
        .note { color:#64748b; font-size:.85rem; margin-bottom:10px; }
        .disclaimer { color:#94a3b8; font-size:.8rem; font-style:italic; line-height:1.4; }

        @media (max-width:768px) {
          .order-container { padding:0 15px 40px; }
          .order-back-bar { flex-direction:column; align-items:stretch; }
          .item-controls { flex-direction:column; align-items:stretch; gap:10px; }
          .quantity-control { justify-content:center; }
          .item-total { align-items:center; }
          .form-actions { flex-direction:column; }
          .btn-primary, .btn-secondary { width:100%; }
        }
        @media (max-width:480px) {
          .order-header { padding:20px; }
          .order-title { font-size:1.5rem; }
          .item-info { flex-direction:column; gap:10px; }
        }
      `}</style>
    </>
  );
}