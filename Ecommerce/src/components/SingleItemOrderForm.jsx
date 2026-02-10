import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

export default function SingleItemOrderForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { productId } = useParams();

  // Get product from navigation state
  const [product, setProduct] = useState(location.state?.product || {
    id: 1,
    name: "Sample Product",
    price: 100,
    stock: 10,
  });

  // Form states
  const [formData, setFormData] = useState({
    customer: "",
    telephone: "",
    email: "",
    quantity: 1,
    locationText: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [totalPrice, setTotalPrice] = useState(product.price);

  // Calculate total price when quantity changes
  useEffect(() => {
    setTotalPrice((product.price * formData.quantity).toFixed(2));
  }, [formData.quantity, product.price]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.customer.trim()) {
      newErrors.customer = "Name is required";
    }
    
    if (!formData.telephone.trim()) {
      newErrors.telephone = "Phone number is required";
    } else if (!/^[0-9+ ]{7,15}$/.test(formData.telephone)) {
      newErrors.telephone = "Enter a valid phone number (7-15 digits)";
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }
    
    if (!formData.locationText.trim()) {
      newErrors.locationText = "Delivery location is required";
    }
    
    if (formData.quantity < 1) {
      newErrors.quantity = "Quantity must be at least 1";
    } else if (formData.quantity > product.stock) {
      newErrors.quantity = `Only ${product.stock} items available`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      document.querySelector(`[name="${firstErrorField}"]`)?.focus();
      return;
    }

    const newOrder = {
      product_id: productId,
      cust_name: formData.customer,
      cust_phone: formData.telephone,
      cust_email: formData.email,
      qty: formData.quantity,
      location: formData.locationText,
      date: new Date(),
      status: "Pending",
    };

    try {
      setLoading(true);
      await axios.post(`http://localhost:5000/orders/${productId}`, newOrder, {
        headers: { "Content-Type": "application/json" },
      });
      setLoading(false);
      alert("✅ Order placed successfully!");
      navigate("/");
    } catch (err) {
      setLoading(false);
      console.error(err);
      alert("❌ Failed to place order. Please try again.");
    }
  };

  return (
    <>
      <div className="order-container">
        {/* Header with product info */}
        <div className="order-header">
          <h2 className="order-title">Order Form</h2>
          <div className="product-summary">
            <h3>{product.name}</h3>
            <div className="price-info">
              <span className="price">${product.price} each</span>
              <span className="stock">({product.stock} available)</span>
            </div>
          </div>
        </div>

        {/* Order summary card */}
        <div className="summary-card">
          <div className="summary-row">
            <span>Quantity:</span>
            <span>{formData.quantity}</span>
          </div>
          <div className="summary-row total">
            <span>Total Amount:</span>
            <span className="total-price">${totalPrice}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="order-form" noValidate>
          <div className="form-group">
            <label htmlFor="customer">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="customer"
              name="customer"
              type="text"
              placeholder="John Doe"
              value={formData.customer}
              onChange={(e) => handleInputChange('customer', e.target.value)}
              className={errors.customer ? 'error' : ''}
            />
            {errors.customer && <span className="error-message">{errors.customer}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="telephone">
              Phone Number <span className="required">*</span>
            </label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              placeholder="+1 234 567 8900"
              value={formData.telephone}
              onChange={(e) => handleInputChange('telephone', e.target.value)}
              className={errors.telephone ? 'error' : ''}
            />
            {errors.telephone && <span className="error-message">{errors.telephone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="quantity">
              Quantity <span className="required">*</span>
              <span className="hint">(Max: {product.stock})</span>
            </label>
            <div className="quantity-control">
              <button
                type="button"
                className="qty-btn"
                onClick={() => handleInputChange('quantity', Math.max(1, formData.quantity - 1))}
                disabled={formData.quantity <= 1}
              >
                −
              </button>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max={product.stock}
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', Number(e.target.value))}
                className={`quantity-input ${errors.quantity ? 'error' : ''}`}
              />
              <button
                type="button"
                className="qty-btn"
                onClick={() => handleInputChange('quantity', Math.min(product.stock, formData.quantity + 1))}
                disabled={formData.quantity >= product.stock}
              >
                +
              </button>
            </div>
            {errors.quantity && <span className="error-message">{errors.quantity}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="locationText">
              Delivery Address <span className="required">*</span>
            </label>
            <textarea
              id="locationText"
              name="locationText"
              placeholder="Enter your complete delivery address"
              value={formData.locationText}
              onChange={(e) => handleInputChange('locationText', e.target.value)}
              className={errors.locationText ? 'error' : ''}
              rows="3"
            />
            {errors.locationText && <span className="error-message">{errors.locationText}</span>}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                `Place Order - $${totalPrice}`
              )}
            </button>
          </div>

          <div className="form-footer">
            <p className="note">
              <span className="required">*</span> Required fields
            </p>
          </div>
        </form>
      </div>
    </>
  );
}