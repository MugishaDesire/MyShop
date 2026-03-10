export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="footer">

        {/* ── TOP WAVE DIVIDER ── */}
        <div className="footer-wave">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#0f172a" />
          </svg>
        </div>

        <div className="footer-body">
          <div className="footer-inner">

            {/* ── COL 1: BRAND ── */}
            <div className="footer-col brand-col">
              <a href="/" className="footer-logo">🛍️ <span>MyShop</span></a>
              <p className="footer-tagline">Your one-stop destination for Electronics, Fashion, Food, Art &amp; Beauty — delivered with care.</p>
              <div className="social-links">
                <a href="#" className="social-btn" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="#" className="social-btn" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="#" className="social-btn" aria-label="Twitter / X">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className="social-btn" aria-label="WhatsApp">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.845L.057 23.5l5.835-1.53A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.001-1.37l-.36-.214-3.716.974.992-3.617-.235-.372A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
                </a>
                <a href="#" className="social-btn" aria-label="YouTube">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="#0f172a" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
                </a>
              </div>
            </div>

            {/* ── COL 2: QUICK LINKS ── */}
            <div className="footer-col">
              <h4 className="footer-heading">Quick Links</h4>
              <ul className="footer-links">
                <li><a href="/">🏠 Home</a></li>
                <li><a href="/about">ℹ️ About Us</a></li>
                <li><a href="/contact">📬 Contact</a></li>
                <li><a href="/ulogin">🔐 My Account</a></li>
                <li><a href="/signup">✨ Sign Up</a></li>
              </ul>
            </div>

            {/* ── COL 3: CATEGORIES ── */}
            <div className="footer-col">
              <h4 className="footer-heading">Categories</h4>
              <ul className="footer-links">
                <li><a href="/category/electronics">⚡ Electronics</a></li>
                <li><a href="/category/fashion">👗 Fashion</a></li>
                <li><a href="/category/food">🍽️ Food</a></li>
                <li><a href="/category/art">🎨 Art</a></li>
                <li><a href="/category/beauty">💄 Beauty</a></li>
              </ul>
            </div>

            {/* ── COL 4: CONTACT ── */}
            <div className="footer-col">
              <h4 className="footer-heading">Contact Us</h4>
              <ul className="footer-contact">
                <li>
                  <span className="contact-icon">📍</span>
                  <span>KG 123 St, Kigali, Rwanda</span>
                </li>
                <li>
                  <span className="contact-icon">📞</span>
                  <a href="tel:+250780000000">+250 781 539 501</a>
                </li>
                <li>
                  <span className="contact-icon">✉️</span>
                  <a href="mailto:hello@myshop.rw">support@myshop.com</a>
                </li>
                <li>
                  <span className="contact-icon">🕐</span>
                  <span>24/7</span>
                </li>
              </ul>
            </div>

          </div>

          {/* ── DIVIDER ── */}
          <div className="footer-divider" />

          {/* ── BOTTOM BAR ── */}
          <div className="footer-bottom">
            <p className="footer-copy">© {year} <strong>MyShop</strong>. All rights reserved.</p>
            <div className="footer-legal">
              <a href="/privacy-policy">Privacy Policy</a>
              <span className="sep">·</span>
              <a href="/terms">Terms of Service</a>
              <span className="sep">·</span>
              <a href="/cookies">Cookie Policy</a>
            </div>
          </div>

        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .footer {
          margin-top: auto;
          font-family: 'DM Sans', sans-serif;
        }

        /* Wave */
        .footer-wave {
          display: block;
          line-height: 0;
          background: #f1f5f9;
        }
        .footer-wave svg {
          width: 100%;
          height: 60px;
          display: block;
        }

        /* Body */
        .footer-body {
          background: #0f172a;
          padding: 3rem 2rem 1.5rem;
        }

        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.4fr;
          gap: 3rem;
        }

        /* Brand column */
        .footer-logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          font-family: 'Syne', sans-serif;
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 1rem;
        }
        .footer-logo span { color: #f97316; }

        .footer-tagline {
          color: rgba(255,255,255,0.55);
          font-size: 0.875rem;
          line-height: 1.7;
          margin: 0 0 1.5rem;
          max-width: 260px;
        }

        /* Social */
        .social-links { display: flex; gap: 10px; flex-wrap: wrap; }
        .social-btn {
          width: 38px; height: 38px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .social-btn svg { width: 16px; height: 16px; }
        .social-btn:hover {
          background: #f97316;
          border-color: #f97316;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(249,115,22,0.35);
        }

        /* Headings */
        .footer-heading {
          font-family: 'Syne', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          color: #f97316;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin: 0 0 1.25rem;
        }

        /* Link lists */
        .footer-links {
          list-style: none;
          margin: 0; padding: 0;
          display: flex; flex-direction: column; gap: 0.6rem;
        }
        .footer-links a {
          text-decoration: none;
          color: rgba(255,255,255,0.6);
          font-size: 0.88rem;
          font-weight: 500;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .footer-links a:hover {
          color: white;
          transform: translateX(4px);
        }

        /* Contact list */
        .footer-contact {
          list-style: none;
          margin: 0; padding: 0;
          display: flex; flex-direction: column; gap: 0.75rem;
        }
        .footer-contact li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: rgba(255,255,255,0.6);
          font-size: 0.87rem;
          line-height: 1.5;
        }
        .contact-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
        .footer-contact a {
          text-decoration: none;
          color: rgba(255,255,255,0.6);
          transition: color 0.15s;
        }
        .footer-contact a:hover { color: #f97316; }

        /* Divider */
        .footer-divider {
          max-width: 1200px;
          margin: 2.5rem auto 1.5rem;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        /* Bottom bar */
        .footer-bottom {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .footer-copy {
          color: rgba(255,255,255,0.4);
          font-size: 0.82rem;
          margin: 0;
        }
        .footer-copy strong { color: rgba(255,255,255,0.65); }
        .footer-legal {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .footer-legal a {
          text-decoration: none;
          color: rgba(255,255,255,0.4);
          font-size: 0.8rem;
          transition: color 0.15s;
        }
        .footer-legal a:hover { color: #f97316; }
        .sep { color: rgba(255,255,255,0.2); font-size: 0.75rem; }

        /* Responsive */
        @media (max-width: 900px) {
          .footer-inner { grid-template-columns: 1fr 1fr; gap: 2rem; }
          .brand-col { grid-column: 1 / -1; }
          .footer-tagline { max-width: 100%; }
        }
        @media (max-width: 560px) {
          .footer-inner { grid-template-columns: 1fr; gap: 2rem; }
          .footer-bottom { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </>
  );
}