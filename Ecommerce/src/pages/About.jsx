// src/pages/About.jsx
export default function About() {
  return (
    <>
      <div className="about-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Our Story</h1>
            <p className="hero-subtitle">
              Building a better shopping experience, one product at a time
            </p>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Happy Customers</span>
            </div>
            <div className="stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Quality Products</span>
            </div>
            <div className="stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Customer Support</span>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="about-content">
          <div className="mission-section">
            <div className="mission-content">
              <h2 className="section-title">Our Mission</h2>
              <p className="section-text">
                At MyShop, we believe that everyone deserves access to quality electronics 
                at affordable prices. Our mission is to bridge the gap between cutting-edge 
                technology and everyday consumers, making innovation accessible to all.
              </p>
              <div className="mission-highlights">
                <div className="highlight">
                  <span className="highlight-icon">⚡</span>
                  <h3>Fast Delivery</h3>
                  <p>Same-day shipping on most orders</p>
                </div>
                <div className="highlight">
                  <span className="highlight-icon">🛡️</span>
                  <h3>Quality Guarantee</h3>
                  <p>All products come with warranty</p>
                </div>
                <div className="highlight">
                  <span className="highlight-icon">💚</span>
                  <h3>Customer First</h3>
                  <p>30-day hassle-free returns</p>
                </div>
              </div>
            </div>
            <div className="mission-image">
              <div className="image-placeholder">
                <span className="image-text">Our Team</span>
              </div>
            </div>
          </div>

          {/* Values Section */}
          <div className="values-section">
            <h2 className="section-title">Our Values</h2>
            <div className="values-grid">
              <div className="value-card">
                <div className="value-icon">🤝</div>
                <h3>Trust & Transparency</h3>
                <p>
                  We believe in honest pricing and clear communication. 
                  No hidden fees, no surprises—just straightforward shopping.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">🌟</div>
                <h3>Quality Assurance</h3>
                <p>
                  Every product undergoes rigorous testing to ensure it meets 
                  our high standards before reaching your doorstep.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">🚀</div>
                <h3>Innovation</h3>
                <p>
                  We constantly explore new technologies to bring you the 
                  latest and most innovative products on the market.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">🌱</div>
                <h3>Sustainability</h3>
                <p>
                  Committed to eco-friendly practices and responsible 
                  sourcing to minimize our environmental impact.
                </p>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="team-section">
            <h2 className="section-title">Meet Our Leadership</h2>
            <p className="section-subtitle">
              Passionate individuals dedicated to revolutionizing your shopping experience
            </p>
            <div className="team-grid">
              <div className="team-member">
                <div className="member-avatar">👨‍💼</div>
                <h3>Rwanamiza Chris</h3>
                <p className="member-role">CEO & Founder</p>
                <p className="member-bio">
                  With 5+ years in e-commerce, Alex founded MyShop with a vision 
                  to make technology accessible to everyone.
                </p>
              </div>
              <div className="team-member">
                <div className="member-avatar">👩‍💻</div>
                <h3>Jayco</h3>
                <p className="member-role">CTO</p>
                <p className="member-bio">
                  Tech enthusiast dedicated to implementing cutting-edge solutions 
                  for seamless shopping experiences.
                </p>
              </div>
              <div className="team-member">
                <div className="member-avatar">👨‍💼</div>
                <h3>Mugisha</h3>
                <p className="member-role">Operations Director</p>
                <p className="member-bio">
                  Ensures smooth logistics and timely delivery of every order 
                  to customer satisfaction.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="cta-section">
            <h2 className="cta-title">Ready to Experience Quality Shopping?</h2>
            <p className="cta-text">
              Join thousands of satisfied customers who trust us for their electronics needs.
            </p>
            <div className="cta-buttons">
              <a href="/" className="primary-button">Shop Now</a>
              <a href="/contact" className="secondary-button">Contact Us</a>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CSS */}
      <style>{`
        .about-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          padding: 4rem 2rem 3rem;
          text-align: center;
          color: white;
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
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          opacity: 0.9;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 4rem;
          margin-top: 3rem;
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
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* About Content */
        .about-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem;
        }

        /* Mission Section */
        .mission-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          margin-bottom: 6rem;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1.5rem;
        }

        .section-text {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #475569;
          margin-bottom: 2rem;
        }

        .mission-highlights {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .highlight {
          text-align: center;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }

        .highlight:hover {
          transform: translateY(-5px);
        }

        .highlight-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 1rem;
        }

        .highlight h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .highlight p {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
        }

        .mission-image {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .image-placeholder {
          width: 100%;
          height: 400px;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .image-text {
          opacity: 0.8;
        }

        /* Values Section */
        .values-section {
          margin-bottom: 6rem;
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .value-card {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .value-card:hover {
          transform: translateY(-8px);
          border-color: #3b82f6;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .value-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .value-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .value-card p {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.6;
        }

        /* Team Section */
        .team-section {
          margin-bottom: 6rem;
        }

        .section-subtitle {
          font-size: 1.125rem;
          color: #64748b;
          text-align: center;
          max-width: 600px;
          margin: 0 auto 3rem;
          line-height: 1.6;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }

        .team-member {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: transform 0.3s ease;
        }

        .team-member:hover {
          transform: translateY(-5px);
        }

        .member-avatar {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto 1.5rem;
          color: white;
        }

        .team-member h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .member-role {
          color: #3b82f6;
          font-weight: 600;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .member-bio {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.6;
        }

        /* CTA Section */
        .cta-section {
          background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
          border-radius: 24px;
          padding: 4rem;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .cta-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }

        .cta-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
        }

        .cta-text {
          font-size: 1.125rem;
          opacity: 0.9;
          margin-bottom: 2rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 1;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .primary-button, .secondary-button {
          padding: 1rem 2rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .primary-button {
          background: white;
          color: #0f766e;
        }

        .primary-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .secondary-button {
          background: transparent;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .secondary-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: white;
          transform: translateY(-3px);
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .mission-section {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .hero-stats {
            gap: 2rem;
          }
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .hero-subtitle {
            font-size: 1.125rem;
          }

          .hero-stats {
            flex-direction: column;
            gap: 2rem;
          }

          .mission-highlights {
            grid-template-columns: 1fr;
          }

          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }

          .primary-button, .secondary-button {
            width: 100%;
            max-width: 300px;
          }

          .about-content {
            padding: 3rem 1rem;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 2rem;
          }

          .section-title {
            font-size: 2rem;
          }

          .cta-title {
            font-size: 2rem;
          }

          .cta-section {
            padding: 2rem 1.5rem;
          }

          .value-card, .team-member {
            padding: 1.5rem;
          }
        }
      `}</style>
    </>
  );
}