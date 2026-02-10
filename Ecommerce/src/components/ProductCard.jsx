import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function ProductCard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:5000/products")
      .then(res => {
        console.log("Full API Response:", res);
        console.log("Response data:", res.data);
        
        // Handle different response structures
        const data = res.data.data || res.data.products || res.data || [];
        
        if (!Array.isArray(data)) {
          console.error("Expected array but got:", typeof data, data);
          setProducts([]);
          setLoading(false);
          return;
        }
        
        // Log each product's structure
        data.forEach((product, index) => {
          console.log(`Product ${index}:`, {
            id: product.id,
            name: product.name,
            imageField: product.image,
            imageUrl: product.imageUrl,
            img: product.img,
            allKeys: Object.keys(product)
          });
        });
        
        // Deduplicate by product ID
        const uniqueProducts = [
          ...new Map(data.map(p => [p.id, p])).values()
        ];
        
        console.log("Unique products:", uniqueProducts);
        setProducts(uniqueProducts);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching products:", err);
        console.error("Error details:", err.response?.data || err.message);
        setError("Failed to load products. Please try again.");
        setLoading(false);
      });
  }, []);

  // Helper function to get correct image URL
  const getImageUrl = (product) => {
    // Try different possible image field names
    const imagePath = product.image || product.imageUrl || product.img || product.photo || "";
    
    console.log(`Getting image for ${product.name}:`, {
      imagePath,
      productKeys: Object.keys(product)
    });
    
    if (!imagePath || imagePath === "undefined" || imagePath === "null") {
      console.log(`No valid image path for ${product.name}, using placeholder`);
      return "/placeholder.jpg";
    }
    
    // If it's already a full URL, return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Clean the path - remove leading/trailing slashes
    let cleanPath = imagePath.trim();
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    
    // Construct full URL
    const fullUrl = `http://localhost:5000/uploads/${cleanPath}`;
    console.log(`Constructed URL for ${product.name}:`, fullUrl);
    
    return fullUrl;
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading products...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <p className="error-text">{error}</p>
        <button 
          className="retry-btn"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="empty-container">
        <div className="empty-icon">📦</div>
        <h3 className="empty-title">No Products Found</h3>
        <p className="empty-text">Check back soon for new arrivals!</p>
      </div>
    );
  }

  // Products grid
  return (
    <div className="products-grid">
      {products.map(product => {
        const imageUrl = getImageUrl(product);
        
        return (
          <div key={product.id} className="card">
            <div className="image-container">
              <img 
                src={imageUrl}
                alt={product.name || "Product image"}
                className="card-img"
                loading="lazy"
                onError={(e) => {
                  console.error(`Image failed to load for ${product.name}:`, {
                    attemptedUrl: imageUrl,
                    product: product
                  });
                  e.target.src = "/placeholder.jpg";
                  e.target.className = "card-img placeholder";
                  e.target.alt = "Failed to load product image";
                }}
                onLoad={() => {
                  console.log(`Image loaded successfully for ${product.name}`);
                }}
              />
              {product.stock <= 0 && (
                <div className="out-of-stock-badge">Out of Stock</div>
              )}
              {product.stock > 0 && product.stock < 10 && (
                <div className="low-stock-badge">Low Stock</div>
              )}
            </div>
            <div className="card-body">
              <h3 className="card-title">{product.name || "Unnamed Product"}</h3>
              {product.description && (
                <p className="card-desc">{product.description}</p>
              )}
              <div className="price-stock-container">
                <div className="price-container">
                  <span className="price-label">Price:</span>
                  <span className="card-price">
                    Frw {product.price ? parseFloat(product.price).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div className="stock-container">
                  <span className="stock-label">Stock:</span>
                  <span className={`card-stock ${product.stock <= 0 ? 'out' : product.stock < 10 ? 'low' : 'high'}`}>
                    {product.stock || 0} units
                  </span>
                </div>
              </div>
              <Link
                to={`/order/${product.id}`}
                state={{ product }}
                className={`buy-btn ${product.stock <= 0 ? 'disabled' : ''}`}
                onClick={(e) => {
                  if (product.stock <= 0) {
                    e.preventDefault();
                  }
                }}
              >
                {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                {product.stock > 0 && <span className="btn-arrow">→</span>}
              </Link>
            </div>
          </div>

        );
      })}

      <style>{`
        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 20px;
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
          to { transform: rotate(360deg); }
        }

        .loading-text {
          color: #64748b;
          font-size: 1.1rem;
          font-weight: 500;
        }

        /* Error State */
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
          text-align: center;
          padding: 40px 20px;
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 10px;
        }

        .error-text {
          color: #dc2626;
          font-size: 1.1rem;
          max-width: 400px;
          line-height: 1.5;
        }

        .retry-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 10px;
        }

        .retry-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        /* Empty State */
        .empty-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
          text-align: center;
          padding: 40px 20px;
        }

        .empty-icon {
          font-size: 4rem;
          opacity: 0.5;
          margin-bottom: 10px;
        }

        .empty-title {
          color: #1e293b;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .empty-text {
          color: #64748b;
          font-size: 1rem;
          max-width: 300px;
          line-height: 1.5;
        }

        /* Products Grid */
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          position: relative;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.15);
        }

        .image-container {
          position: relative;
          height: 200px;
          overflow: hidden;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }

        .card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .card-img.placeholder {
          object-fit: contain;
          padding: 40px;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }

        .card:hover .card-img:not(.placeholder) {
          transform: scale(1.05);
        }

        .out-of-stock-badge,
        .low-stock-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          z-index: 1;
        }

        .out-of-stock-badge {
          background: #ef4444;
          color: white;
        }

        .low-stock-badge {
          background: #f59e0b;
          color: white;
        }

        .card-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 10px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-desc {
          font-size: 0.9rem;
          color: #64748b;
          margin-bottom: 16px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }

        .price-stock-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 10px;
        }

        .price-container,
        .stock-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .price-label,
        .stock-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .card-price {
          font-size: 1.3rem;
          font-weight: 800;
          color: #059669;
          letter-spacing: -0.5px;
        }

        .card-stock {
          font-size: 0.9rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          display: inline-block;
        }

        .card-stock.high {
          background: #dcfce7;
          color: #166534;
        }

        .card-stock.low {
          background: #fef3c7;
          color: #92400e;
        }

        .card-stock.out {
          background: #fee2e2;
          color: #991b1b;
        }

        .buy-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 14px 20px;
          border-radius: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s ease;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          text-align: center;
        }

        .buy-btn:not(.disabled):hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
        }

        .buy-btn.disabled {
          background: #94a3b8;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .btn-arrow {
          transition: transform 0.3s ease;
        }

        .buy-btn:not(.disabled):hover .btn-arrow {
          transform: translateX(4px);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            padding: 20px;
          }

          .card-title {
            font-size: 1.1rem;
          }

          .card-price {
            font-size: 1.2rem;
          }

          .image-container {
            height: 180px;
          }
        }

        @media (max-width: 640px) {
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 16px;
            padding: 16px;
          }

          .price-stock-container {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .price-container,
          .stock-container {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .products-grid {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: 0 auto;
          }

          .card {
            max-width: 100%;
          }
        }

        /* Animation for card appearance */
        .card {
          animation: fadeInUp 0.5s ease;
          animation-fill-mode: both;
        }

        .card:nth-child(1) { animation-delay: 0.1s; }
        .card:nth-child(2) { animation-delay: 0.2s; }
        .card:nth-child(3) { animation-delay: 0.3s; }
        .card:nth-child(4) { animation-delay: 0.4s; }
        .card:nth-child(5) { animation-delay: 0.5s; }
        .card:nth-child(6) { animation-delay: 0.6s; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}