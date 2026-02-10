import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

export default function OrderForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { productId } = useParams();
  
  // Determine if this is a single item order or multi-item checkout
  const isCheckoutPage = window.location.pathname.includes('/checkout');
  
  // Get product or cart items from navigation state or localStorage
  const [product, setProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Form states
  const [formData, setFormData] = useState({
    customer: "",
    telephone: "",
    email: "",
    quantity: 1,
    locationText: "",
  });

  // Helper function to ensure price is a number
  const ensureNumberPrice = (item) => ({
    ...item,
    price: parseFloat(item.price) || 0
  });

  useEffect(() => {
    if (isCheckoutPage) {
      // Multi-item checkout: Load cart from localStorage or navigation state
      const cartFromState = location.state?.cart;
      if (cartFromState && cartFromState.length > 0) {
        // Ensure all prices are numbers
        const processedCart = cartFromState.map(ensureNumberPrice);
        setCartItems(processedCart);
      } else {
        const savedCart = localStorage.getItem("shoppingCart");
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart);
            // Ensure all prices are numbers
            const processedCart = parsedCart.map(ensureNumberPrice);
            setCartItems(processedCart);
          } catch (error) {
            console.error("Error parsing cart from localStorage:", error);
            navigate("/");
          }
        } else {
          // If no cart items, redirect to home
          navigate("/");
        }
      }
    } else {
      // Single item order: Get product from params or navigation state
      if (location.state?.product) {
        const processedProduct = ensureNumberPrice(location.state.product);
        setProduct(processedProduct);
        setFormData(prev => ({ ...prev, quantity: 1 }));
      } else if (productId) {
        // Fetch product by ID if not in state
        axios.get(`http://localhost:5000/products/${productId}`)
          .then(res => {
            const processedProduct = ensureNumberPrice(res.data);
            setProduct(processedProduct);
            setFormData(prev => ({ ...prev, quantity: 1 }));
          })
          .catch(() => navigate("/"));
      } else {
        navigate("/");
      }
    }
  }, [isCheckoutPage, location.state, productId, navigate]);

  // Calculate totals when cart items or quantity changes
  useEffect(() => {
    if (isCheckoutPage && cartItems.length > 0) {
      const total = cartItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0);
      const itemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      
      setTotalPrice(total);
      setTotalItems(itemsCount);
    } else if (product) {
      // Single item order
      setTotalPrice((product.price * formData.quantity));
      setTotalItems(formData.quantity);
    }
  }, [cartItems, product, formData.quantity, isCheckoutPage]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(productId);
      return;
    }

    setCartItems(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
          // Check stock availability
          if (newQuantity > item.stock) {
            alert(`Only ${item.stock} items available for ${item.name}`);
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
    
    // Update localStorage
    localStorage.setItem("shoppingCart", JSON.stringify(cartItems));
  };

  const removeItem = (productId) => {
    const newCart = cartItems.filter(item => item.id !== productId);
    setCartItems(newCart);
    
    // Update localStorage
    localStorage.setItem("shoppingCart", JSON.stringify(newCart));
    
    // If cart becomes empty, redirect to home
    if (newCart.length === 0) {
      navigate("/");
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
    
    if (!isCheckoutPage && product) {
      // Single item quantity validation
      if (formData.quantity < 1) {
        newErrors.quantity = "Quantity must be at least 1";
      } else if (formData.quantity > product.stock) {
        newErrors.quantity = `Only ${product.stock} items available`;
      }
    }
    
    // Check if cart has items for checkout
    if (isCheckoutPage && cartItems.length === 0) {
      alert("Your cart is empty! Please add items before checking out.");
      return false;
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

    try {
      setLoading(true);
      
      if (isCheckoutPage) {
        // Multi-item order processing
        // First, check stock availability for all items
        const stockCheckPromises = cartItems.map(item =>
          axios.get(`http://localhost:5000/products/${item.id}`)
        );
        
        const stockResponses = await Promise.all(stockCheckPromises);
        const stockIssues = [];
        
        stockResponses.forEach((response, index) => {
          const product = response.data;
          const cartItem = cartItems[index];
          
          if (cartItem.quantity > product.stock) {
            stockIssues.push({
              product: cartItem.name,
              requested: cartItem.quantity,
              available: product.stock
            });
          }
        });
        
        if (stockIssues.length > 0) {
          let message = "Stock issues found:\n";
          stockIssues.forEach(issue => {
            message += `• ${issue.product}: Requested ${issue.requested}, Available ${issue.available}\n`;
          });
          alert(message);
          setLoading(false);
          return;
        }
        
        // Create individual orders for each item
        const orderPromises = cartItems.map(item =>
          axios.post(`http://localhost:5000/orders/${item.id}`, {
            product_id: item.id,
            cust_name: formData.customer,
            cust_phone: formData.telephone,
            cust_email: formData.email,
            qty: item.quantity,
            location: formData.locationText,
            date: new Date(),
            status: "Pending",
          }, {
            headers: { "Content-Type": "application/json" },
          })
        );
        
        await Promise.all(orderPromises);
        
        // Clear cart after successful order
        localStorage.removeItem("shoppingCart");
        
        alert("✅ Order placed successfully!");
        navigate("/");
      } else {
        // Single item order processing
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

        await axios.post(`http://localhost:5000/orders/${productId}`, newOrder, {
          headers: { "Content-Type": "application/json" },
        });
        
        alert("✅ Order placed successfully!");
        navigate("/");
      }
      
    } catch (err) {
      console.error("Order error:", err);
      
      if (err.response?.data?.message) {
        alert(`❌ ${err.response.data.message}`);
      } else {
        alert("❌ Failed to place order. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // If cart is empty for checkout page, show message
  if (isCheckoutPage && cartItems.length === 0) {
    return (
      <div className="empty-cart-message">
        <h2>Your cart is empty</h2>
        <p>Please add items to your cart before placing an order.</p>
        <button onClick={() => navigate("/")}>Continue Shopping</button>
        <style>{`
          .empty-cart-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            padding: 2rem;
            text-align: center;
          }
          .empty-cart-message h2 {
            color: #1e293b;
            margin-bottom: 1rem;
          }
          .empty-cart-message p {
            color: #64748b;
            margin-bottom: 2rem;
          }
          .empty-cart-message button {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className="order-container">
        {/* Header */}
        <div className="order-header">
          <h2 className="order-title">
            {isCheckoutPage ? "Checkout - Multiple Items" : "Order Form"}
          </h2>
          <div className="order-summary">
            {isCheckoutPage ? (
              <>
                <h3>Order Summary</h3>
                <div className="summary-info">
                  <span className="items-count">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                  <span className="order-total">Total: ${totalPrice.toFixed(2)}</span>
                </div>
              </>
            ) : product && (
              <>
                <h3>{product.name}</h3>
                <div className="price-info">
                  <span className="price">${product.price.toFixed(2)} each</span>
                  <span className="stock">({product.stock} available)</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cart Items List (for checkout only) */}
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
                        <span className="item-price">${item.price.toFixed(2)} each</span>
                      </div>
                      <div className="item-stock">
                        {item.stock <= 0 ? (
                          <span className="out-of-stock">Out of Stock</span>
                        ) : item.stock < 10 ? (
                          <span className="low-stock">Only {item.stock} left</span>
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
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="quantity-input"
                        />
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                        >
                          +
                        </button>
                      </div>
                      
                      <div className="item-total">
                        <span>Item Total:</span>
                        <span className="item-total-price">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary Card (for checkout) */}
            <div className="summary-card">
              <div className="summary-row">
                <span>Items:</span>
                <span>{totalItems}</span>
              </div>
              {cartItems.map((item) => (
                <div key={item.id} className="summary-item">
                  <span>{item.name} (x{item.quantity}):</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="summary-row total">
                <span>Order Total:</span>
                <span className="total-price">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        {/* Single Item Order Summary */}
        {!isCheckoutPage && product && (
          <div className="summary-card">
            <div className="summary-row">
              <span>Quantity:</span>
              <span>{formData.quantity}</span>
            </div>
            <div className="summary-row total">
              <span>Total Amount:</span>
              <span className="total-price">${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Customer Information Form */}
        <form onSubmit={handleSubmit} className="order-form" noValidate>
          <h3 className="section-title">Customer Information</h3>
          
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

          {/* Quantity Control (for single item only) */}
          {!isCheckoutPage && product && (
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
          )}

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
              {isCheckoutPage ? "Back to Cart" : "Cancel"}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || (isCheckoutPage && cartItems.length === 0)}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                `Place Order - $${isCheckoutPage ? totalPrice.toFixed(2) : totalPrice.toFixed(2)}`
              )}
            </button>
          </div>

          <div className="form-footer">
            <p className="note">
              <span className="required">*</span> Required fields
            </p>
            <p className="disclaimer">
              By placing this order, you agree to our terms and conditions. 
              You'll receive an order confirmation via email/SMS.
            </p>
          </div>
        </form>
      </div>

      {/* Enhanced CSS */}
      <style>{`
        .order-container {
          max-width: 800px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .order-header {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          padding: 30px;
          border-radius: 16px 16px 0 0;
          color: white;
          margin-bottom: 2px;
        }

        .order-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 20px;
          text-align: center;
        }

        .order-summary h3 {
          font-size: 1.3rem;
          margin: 0 0 12px 0;
          opacity: 0.9;
        }

        .summary-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1.1rem;
        }

        .items-count {
          font-weight: 600;
        }

        .order-total {
          font-size: 1.4rem;
          font-weight: 800;
        }

        .price-info {
          display: flex;
          gap: 12px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.95rem;
        }

        .price {
          font-weight: 600;
        }

        .cart-items-section {
          background: white;
          padding: 25px;
          border-radius: 0 0 12px 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 1.2rem;
          color: #1e293b;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #f1f5f9;
        }

        .cart-items-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cart-item-card {
          background: #f8fafc;
          padding: 20px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .item-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .item-name-price h4 {
          margin: 0 0 8px 0;
          color: #334155;
          font-size: 1.1rem;
        }

        .item-price {
          color: #059669;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .item-stock {
          font-size: 0.85rem;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .out-of-stock {
          color: #dc2626;
          background: #fee2e2;
        }

        .low-stock {
          color: #d97706;
          background: #fef3c7;
        }

        .in-stock {
          color: #059669;
          background: #d1fae5;
        }

        .item-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .quantity-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qty-btn {
          width: 36px;
          height: 36px;
          border: 2px solid #cbd5e1;
          background: white;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .qty-btn:hover:not(:disabled) {
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .qty-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quantity-input {
          width: 60px;
          padding: 8px;
          text-align: center;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          font-size: 1rem;
        }

        .item-total {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-size: 0.9rem;
          color: #64748b;
        }

        .item-total-price {
          font-weight: 600;
          color: #1e293b;
          font-size: 1.1rem;
        }

        .remove-btn {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .remove-btn:hover {
          background: #fecaca;
        }

        .summary-card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          margin-bottom: 25px;
          border: 2px solid #3b82f6;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          color: #475569;
          font-size: 1rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-left: 20px;
          color: #64748b;
          font-size: 0.95rem;
        }

        .summary-row.total {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 2px solid #e2e8f0;
          font-weight: 700;
          color: #1e293b;
          font-size: 1.2rem;
        }

        .total-price {
          color: #059669;
          font-size: 1.4rem;
          font-weight: 800;
        }

        .order-form {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #334155;
          font-size: 0.9rem;
        }

        .required {
          color: #ef4444;
        }

        .hint {
          color: #94a3b8;
          font-size: 0.85rem;
          margin-left: 8px;
          font-weight: normal;
        }

        .order-form input,
        .order-form textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .order-form input:focus,
        .order-form textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .order-form input.error,
        .order-form textarea.error {
          border-color: #ef4444;
        }

        .order-form input.error:focus,
        .order-form textarea.error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .error-message {
          color: #ef4444;
          font-size: 0.85rem;
          margin-top: 4px;
          display: block;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 30px;
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 16px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #059669, #047857);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #047857, #065f46);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        }

        .btn-primary:disabled {
          background: #94a3b8;
          opacity: 0.7;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-right: 8px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .form-footer {
          margin-top: 25px;
          text-align: center;
        }

        .note {
          color: #64748b;
          font-size: 0.85rem;
          margin-bottom: 10px;
        }

        .disclaimer {
          color: #94a3b8;
          font-size: 0.8rem;
          font-style: italic;
          margin: 10px 0 0 0;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .order-container {
            padding: 0 15px;
          }

          .item-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .quantity-control {
            justify-content: center;
          }

          .item-total {
            align-items: center;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .order-header {
            padding: 20px;
          }

          .order-title {
            font-size: 1.5rem;
          }

          .item-info {
            flex-direction: column;
            gap: 10px;
          }
        }
      `}</style>
    </>
  );
}