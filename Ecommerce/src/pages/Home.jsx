import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem("shoppingCart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("shoppingCart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    axios.get("http://localhost:5000/products")
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching products:", err);
        setError("Failed to load products. Please try again later.");
        setLoading(false);
      });
  }, []);

  // Add item to cart function
  const addToCart = (product) => {
  // Ensure price is a number
  const productWithNumberPrice = {
    ...product,
    price: parseFloat(product.price) || 0,
    quantity: 1
  };
  
  setCart(prevCart => {
    const existingItem = prevCart.find(item => item.id === product.id);
    
    if (existingItem) {
      // If item exists, increase quantity
      return prevCart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      // If item doesn't exist, add it with quantity 1
      return [...prevCart, productWithNumberPrice];
    }
  });
  
  // Show feedback
  alert(`✅ ${product.name} added to cart!`);
};

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("shoppingCart");
  };

  // Calculate total items in cart
  const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter(product => 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch(sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "name":
          return a.name.localeCompare(b.name);
        case "stock":
          return b.stock - a.stock;
        default:
          return 0;
      }
    });

  return (
    <>
      <div className="home-container">
        {/* Cart Indicator */}
        {totalItemsInCart > 0 && (
          <div className="cart-indicator">
            <div className="cart-indicator-content">
              <span className="cart-icon">🛒</span>
              <span className="cart-count">{totalItemsInCart} item{totalItemsInCart !== 1 ? 's' : ''}</span>
              <span className="cart-total">
                Total: ${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
              </span>
              <button 
                className="view-cart-btn"
                onClick={() => navigate("/checkout", { state: { cart } })}
              >
                Checkout Now
              </button>
              <button 
                className="clear-cart-btn"
                onClick={clearCart}
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Discover Amazing Products</h1>
            <p className="hero-subtitle">
              Shop the latest electronics at unbeatable prices with fast delivery
            </p>
            <div className="hero-search">
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">{products.length}</span>
              <span className="stat-label">Products</span>
            </div>
            <div className="stat">
              <span className="stat-number">
                {products.filter(p => p.stock > 0).length}
              </span>
              <span className="stat-label">In Stock</span>
            </div>
            <div className="stat">
              <span className="stat-number">{totalItemsInCart}</span>
              <span className="stat-label">In Your Cart</span>
            </div>
          </div>
        </section>

        {/* Controls */}
        <div className="controls">
          <div className="sort-control">
            <label htmlFor="sort">Sort by:</label>
            <select 
              id="sort" 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="default">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
              <option value="stock">Most in Stock</option>
            </select>
          </div>
          <div className="results-count">
            Showing {filteredAndSortedProducts.length} of {products.length} products
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading products...</p>
          </div>
        ) : (
          /* Products Grid */
          <div className="product-grid">
            {filteredAndSortedProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h3>No products found</h3>
                <p>{search ? `No results for "${search}"` : "Check back soon for new products!"}</p>
                {search && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filteredAndSortedProducts.map((p) => {
                // Check if this product is already in cart
                const cartItem = cart.find(item => item.id === p.id);
                const isInCart = !!cartItem;
                const cartQuantity = cartItem?.quantity || 0;
                
                return (
                  <div key={p.id} className="product-card">
                    <div className="product-image-container">
                      <img
                        src={p.image ? `http://localhost:5000/${p.image}` : "/placeholder-image.jpg"}
                        alt={p.name}
                        className="product-image"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                        }}
                      />
                      {p.stock <= 0 ? (
                        <div className="out-of-stock-badge">Out of Stock</div>
                      ) : p.stock < 10 ? (
                        <div className="low-stock-badge">Low Stock</div>
                      ) : null}
                      
                      {isInCart && (
                        <div className="in-cart-badge">
                          In Cart: {cartQuantity}
                        </div>
                      )}
                    </div>
                    
                    <div className="product-content">
                      <div className="product-header">
                        <h3 className="product-name">{p.name}</h3>
                        <div className="price-tag">${parseFloat(p.price).toFixed(2)}</div>
                      </div>
                      
                      {p.description && (
                        <p className="product-description">
                          {p.description.length > 100 
                            ? `${p.description.substring(0, 100)}...` 
                            : p.description}
                        </p>
                      )}
                      
                      <div className="product-footer">
                        <div className="stock-info">
                          <span className="stock-label">Available:</span>
                          <span className={`stock-count ${p.stock <= 0 ? 'out' : p.stock < 10 ? 'low' : 'high'}`}>
                            {p.stock} units
                          </span>
                        </div>
                        
                        <div className="button-group">
                          <button 
                            className="add-to-cart-button"
                            onClick={() => addToCart(p)}
                            disabled={p.stock <= 0}
                          >
                            {isInCart ? (
                              <>
                                <span className="button-icon">➕</span>
                                Add More ({cartQuantity})
                              </>
                            ) : (
                              <>
                                <span className="button-icon">🛒</span>
                                Add to Cart
                              </>
                            )}
                          </button>
                          
                          <Link to={`/order/${p.id}`} state={{ product: p }}>
                            <button 
                              className="buy-now-button"
                              disabled={p.stock <= 0}
                            >
                              {p.stock <= 0 ? "Out of Stock" : (
                                <>
                                  <span className="button-icon">⚡</span>
                                  Buy Now
                                </>
                              )}
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Cart Summary Banner (if items in cart) */}
        {cart.length > 0 && (
          <div className="cart-summary-banner">
            <div className="banner-content">
              <div className="cart-summary-text">
                <h3>🛒 Ready to Checkout?</h3>
                <p>You have {totalItemsInCart} item{totalItemsInCart !== 1 ? 's' : ''} in your cart</p>
                <div className="cart-total-summary">
                  Total: <strong>${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</strong>
                </div>
              </div>
              <button 
                className="checkout-now-btn"
                onClick={() => navigate("/checkout", { state: { cart } })}
              >
                Proceed to Checkout →
              </button>
            </div>
          </div>
        )}

        {/* Featured Banner */}
        {!loading && products.length > 0 && (
          <div className="featured-banner">
            <div className="banner-content">
              <h3>🔥 Hot Deal of the Day</h3>
              <p>Check out our featured product with special pricing</p>
              <div className="featured-buttons">
                <button 
                  className="featured-add-to-cart"
                  onClick={() => addToCart(products[0])}
                >
                  Add to Cart
                </button>
                <Link to={`/order/${products[0].id}`} state={{ product: products[0] }}>
                  <button className="featured-button">Buy Now</button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced CSS */}
      <style>{`
        .home-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 2rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding-top: ${totalItemsInCart > 0 ? '100px' : '2rem'};
        }

        /* Cart Indicator */
        .cart-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: white;
          padding: 15px 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          border-bottom: 3px solid #3b82f6;
        }

        .cart-indicator-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
        }

        .cart-icon {
          font-size: 1.5rem;
          margin-right: 10px;
        }

        .cart-count {
          font-weight: 600;
          color: #1e293b;
          margin-right: 20px;
        }

        .cart-total {
          font-weight: 600;
          color: #059669;
          margin-right: auto;
        }

        .view-cart-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          margin-left: 10px;
          transition: all 0.2s ease;
        }

        .view-cart-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .clear-cart-btn {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          margin-left: 10px;
          transition: all 0.2s ease;
        }

        .clear-cart-btn:hover {
          background: #fecaca;
        }

        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          border-radius: 20px;
          padding: 3rem 2rem;
          margin-bottom: 2rem;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 800px;
          margin: 0 auto;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          opacity: 0.9;
          margin-bottom: 2rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-search {
          position: relative;
          max-width: 500px;
          margin: 0 auto;
        }

        .search-input {
          width: 100%;
          padding: 1rem 1.5rem 1rem 3rem;
          border: none;
          border-radius: 50px;
          font-size: 1rem;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          background: white;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          transform: translateY(-2px);
        }

        .search-icon {
          position: absolute;
          left: 1.5rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
        }

        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 3rem;
          margin-top: 2rem;
          position: relative;
          z-index: 1;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.875rem;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Controls */
        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .sort-control {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sort-control label {
          font-weight: 600;
          color: #475569;
        }

        .sort-select {
          padding: 0.5rem 2rem 0.5rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23475569' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 16px;
        }

        .sort-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .results-count {
          color: #64748b;
          font-size: 0.875rem;
        }

        /* Error Message */
        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-text {
          color: #64748b;
          font-size: 1rem;
        }

        /* Product Grid */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        /* Product Card */
        .product-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .product-image-container {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-image {
          transform: scale(1.05);
        }

        .out-of-stock-badge, .low-stock-badge, .in-cart-badge {
          position: absolute;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .out-of-stock-badge {
          top: 1rem;
          left: 1rem;
          background: #dc2626;
          color: white;
        }

        .low-stock-badge {
          top: 1rem;
          left: 1rem;
          background: #f59e0b;
          color: white;
        }

        .in-cart-badge {
          top: 1rem;
          right: 1rem;
          background: #3b82f6;
          color: white;
        }

        .product-content {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .product-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          flex: 1;
        }

        .price-tag {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 700;
          margin-left: 0.5rem;
          white-space: nowrap;
        }

        .product-description {
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 1rem;
          flex: 1;
        }

        .product-footer {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: auto;
        }

        .stock-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stock-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stock-count {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .stock-count.high {
          color: #059669;
        }

        .stock-count.low {
          color: #d97706;
        }

        .stock-count.out {
          color: #dc2626;
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
        }

        .add-to-cart-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
          flex: 2;
          justify-content: center;
        }

        .add-to-cart-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .buy-now-button {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
          flex: 1;
          justify-content: center;
        }

        .buy-now-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .add-to-cart-button:disabled,
        .buy-now-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* Empty State */
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 16px;
          border: 2px dashed #e2e8f0;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #64748b;
          margin-bottom: 1.5rem;
        }

        .clear-search {
          background: #e2e8f0;
          color: #475569;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .clear-search:hover {
          background: #cbd5e1;
        }

        /* Cart Summary Banner */
        .cart-summary-banner {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 16px;
          padding: 1.5rem 2rem;
          color: white;
          margin-top: 2rem;
          box-shadow: 0 10px 25px rgba(245, 158, 11, 0.3);
        }

        .cart-summary-banner .banner-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .cart-summary-text h3 {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .cart-summary-text p {
          opacity: 0.9;
          margin-bottom: 0.25rem;
        }

        .cart-total-summary {
          font-size: 1.2rem;
        }

        .checkout-now-btn {
          background: white;
          color: #d97706;
          border: none;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .checkout-now-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        /* Featured Banner */
        .featured-banner {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          border-radius: 16px;
          padding: 2rem;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
          margin-top: 2rem;
        }

        .featured-banner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }

        .banner-content {
          position: relative;
          z-index: 1;
        }

        .featured-banner h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .featured-banner p {
          opacity: 0.9;
          margin-bottom: 1.5rem;
        }

        .featured-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .featured-add-to-cart {
          background: #f59e0b;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .featured-add-to-cart:hover {
          background: #d97706;
          transform: translateY(-2px);
        }

        .featured-button {
          background: white;
          color: #7c3aed;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .featured-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .home-container {
            padding: 1rem;
            padding-top: ${totalItemsInCart > 0 ? '120px' : '1rem'};
          }

          .hero-title {
            font-size: 2rem;
          }

          .hero-subtitle {
            font-size: 1rem;
          }

          .controls {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .sort-control {
            justify-content: space-between;
          }

          .product-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          }

          .hero-stats {
            flex-direction: column;
            gap: 1.5rem;
          }

          .cart-indicator-content {
            flex-wrap: wrap;
            gap: 10px;
          }

          .cart-total {
            margin-right: 0;
            width: 100%;
            text-align: center;
            order: 3;
          }

          .cart-summary-banner .banner-content {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .featured-buttons {
            flex-direction: column;
            align-items: center;
          }
        }

        @media (max-width: 480px) {
          .product-grid {
            grid-template-columns: 1fr;
          }

          .product-footer {
            flex-direction: column;
            gap: 1rem;
          }

          .button-group {
            flex-direction: column;
          }

          .add-to-cart-button, .buy-now-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}