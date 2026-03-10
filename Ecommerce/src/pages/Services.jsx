import { Link } from "react-router-dom";

const SERVICES = [
  {
    icon: "⚡",
    title: "Electronics",
    tag: "Tech & Gadgets",
    color: "#3b82f6",
    bg: "#eff6ff",
    desc: "From smartphones and laptops to smart home devices — we stock the latest tech at unbeatable prices with full warranty coverage.",
    features: ["Official warranties", "Expert setup support", "Same-day dispatch", "Price match guarantee"],
  },
  {
    icon: "👗",
    title: "Fashion",
    tag: "Clothing & Style",
    color: "#ec4899",
    bg: "#fdf2f8",
    desc: "Curated collections for every style and season. From everyday essentials to statement pieces, delivered fresh to your door.",
    features: ["Free returns (30 days)", "Size guides & styling tips", "New drops weekly", "Authentic brands only"],
  },
  {
    icon: "🍽️",
    title: "Food & Grocery",
    tag: "Fresh Delivery",
    color: "#10b981",
    bg: "#f0fdf4",
    desc: "Quality groceries, artisan foods and specialty items sourced locally and internationally — delivered same day in Kigali.",
    features: ["Same-day delivery", "Fresh & cold-chain", "Local & imported", "Subscription bundles"],
  },
  {
    icon: "🎨",
    title: "Art & Decor",
    tag: "Creative Living",
    color: "#f59e0b",
    bg: "#fffbeb",
    desc: "Original artworks, prints, sculptures and home décor from Rwandan and African artists. Every piece tells a story.",
    features: ["Artist-authenticated", "Gift wrapping", "Custom framing", "Corporate orders"],
  },
  {
    icon: "💄",
    title: "Beauty",
    tag: "Skincare & Wellness",
    color: "#a855f7",
    bg: "#faf5ff",
    desc: "Premium skincare, makeup and wellness products. Clean beauty options, dermatologist-tested and suited for all skin types.",
    features: ["Clean ingredients", "All skin types", "Expert recommendations", "Loyalty rewards"],
  },
  {
    icon: "🚚",
    title: "Express Delivery",
    tag: "Logistics",
    color: "#f97316",
    bg: "#fff7ed",
    desc: "Reliable delivery across Kigali and beyond. Track your order in real time from checkout to your doorstep.",
    features: ["Real-time tracking", "Same-day in Kigali", "Nationwide shipping", "Secure packaging"],
  },
];

const PROCESS = [
  { step: "01", title: "Browse & Discover", desc: "Explore thousands of products across all categories with smart filters and search.", icon: "🔍" },
  { step: "02", title: "Add to Cart", desc: "Build your order at your own pace — your cart is saved even if you leave.", icon: "🛒" },
  { step: "03", title: "Secure Checkout", desc: "Fast, secure payment with multiple methods. Your data is always protected.", icon: "🔒" },
  { step: "04", title: "Track & Receive", desc: "Real-time updates from dispatch to delivery. We keep you informed every step.", icon: "📦" },
];

const STATS = [
  { value: "10K+", label: "Happy Customers" },
  { value: "5K+", label: "Products Listed" },
  { value: "50+", label: "Brand Partners" },
  { value: "4.9★", label: "Average Rating" },
];

export default function Services() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

        :root {
          --brand: #0f172a;
          --accent: #f97316;
          --green: #10b981;
          --bg: #f1f5f9;
          --card: #ffffff;
          --border: #e2e8f0;
          --text: #1e293b;
          --muted: #64748b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .sv-page {
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          background: var(--bg);
          min-height: 100vh;
        }

        /* ── HERO ── */
        .sv-hero {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%);
          padding: 80px 24px 90px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .sv-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 70% 50%, rgba(249,115,22,0.12) 0%, transparent 60%),
                      radial-gradient(ellipse at 20% 80%, rgba(59,130,246,0.1) 0%, transparent 50%);
        }
        .sv-hero-inner { position: relative; max-width: 720px; margin: 0 auto; }
        .sv-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(249,115,22,0.15);
          border: 1px solid rgba(249,115,22,0.3);
          color: #fb923c;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 20px;
          margin-bottom: 24px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .sv-hero h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(2.2rem, 5vw, 3.6rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 20px;
        }
        .sv-hero h1 span { color: #f97316; }
        .sv-hero p {
          color: rgba(255,255,255,0.65);
          font-size: 1.1rem;
          line-height: 1.7;
          max-width: 540px;
          margin: 0 auto 36px;
        }
        .sv-hero-cta {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .sv-btn-primary {
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff;
          padding: 13px 28px;
          border-radius: 12px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.97rem;
          text-decoration: none;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sv-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(249,115,22,0.4); }
        .sv-btn-secondary {
          background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.2);
          color: #fff;
          padding: 13px 28px;
          border-radius: 12px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.97rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .sv-btn-secondary:hover { background: rgba(255,255,255,0.15); }

        /* ── WAVE ── */
        .sv-wave { display: block; line-height: 0; background: var(--brand); }
        .sv-wave svg { width: 100%; height: 56px; display: block; }

        /* ── STATS BAR ── */
        .sv-stats {
          background: var(--brand);
          padding: 0 24px 48px;
        }
        .sv-stats-inner {
          max-width: 900px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2px;
          background: rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .sv-stat {
          padding: 28px 20px;
          text-align: center;
          background: rgba(255,255,255,0.03);
        }
        .sv-stat-val {
          font-family: 'Syne', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #f97316;
          display: block;
          margin-bottom: 4px;
        }
        .sv-stat-lbl {
          color: rgba(255,255,255,0.5);
          font-size: 0.82rem;
          font-weight: 500;
        }
        @media (max-width: 600px) {
          .sv-stats-inner { grid-template-columns: repeat(2, 1fr); }
        }

        /* ── SECTION WRAPPER ── */
        .sv-section { padding: 72px 24px; }
        .sv-section-alt { background: var(--card); }
        .sv-section-inner { max-width: 1160px; margin: 0 auto; }
        .sv-section-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #ea580c;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 20px;
          margin-bottom: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .sv-section-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(1.6rem, 3.5vw, 2.4rem);
          font-weight: 800;
          color: var(--text);
          margin-bottom: 12px;
          line-height: 1.2;
        }
        .sv-section-title span { color: var(--accent); }
        .sv-section-sub {
          color: var(--muted);
          font-size: 1rem;
          line-height: 1.7;
          max-width: 520px;
          margin-bottom: 48px;
        }

        /* ── SERVICE CARDS ── */
        .sv-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 960px) { .sv-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .sv-grid { grid-template-columns: 1fr; } }

        .sv-card {
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: 18px;
          padding: 28px;
          transition: all 0.25s;
          position: relative;
          overflow: hidden;
        }
        .sv-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--c, #f97316);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .sv-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.1); border-color: transparent; }
        .sv-card:hover::before { transform: scaleX(1); }

        .sv-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          margin-bottom: 18px;
          background: var(--ibg, #fff7ed);
        }
        .sv-card-tag {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--c, #f97316);
          margin-bottom: 6px;
        }
        .sv-card-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 10px;
        }
        .sv-card-desc {
          color: var(--muted);
          font-size: 0.88rem;
          line-height: 1.7;
          margin-bottom: 18px;
        }
        .sv-card-features {
          list-style: none;
          padding: 0; margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sv-card-features li {
          font-size: 0.82rem;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .sv-card-features li::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--c, #f97316);
          flex-shrink: 0;
        }

        /* ── PROCESS ── */
        .sv-process {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          position: relative;
        }
        .sv-process::before {
          content: '';
          position: absolute;
          top: 36px;
          left: 10%;
          right: 10%;
          height: 2px;
          background: linear-gradient(90deg, #f97316, #3b82f6);
          z-index: 0;
        }
        @media (max-width: 768px) {
          .sv-process { grid-template-columns: repeat(2, 1fr); }
          .sv-process::before { display: none; }
        }
        @media (max-width: 460px) { .sv-process { grid-template-columns: 1fr; } }

        .sv-step {
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .sv-step-num {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 1.1rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 8px 24px rgba(249,115,22,0.3);
          position: relative;
        }
        .sv-step-emoji {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 28px;
          height: 28px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .sv-step-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: var(--text);
          margin-bottom: 8px;
        }
        .sv-step-desc {
          color: var(--muted);
          font-size: 0.84rem;
          line-height: 1.6;
        }

        /* ── WHY US BANNER ── */
        .sv-why {
          background: linear-gradient(135deg, #0f172a, #1e3a5f);
          padding: 72px 24px;
        }
        .sv-why-inner {
          max-width: 1160px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        @media (max-width: 768px) { .sv-why-inner { grid-template-columns: 1fr; gap: 36px; } }
        .sv-why-text .sv-section-label { background: rgba(249,115,22,0.15); border-color: rgba(249,115,22,0.3); color: #fb923c; }
        .sv-why-text .sv-section-title { color: #fff; }
        .sv-why-text .sv-section-sub { color: rgba(255,255,255,0.55); margin-bottom: 32px; }
        .sv-why-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sv-why-item {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .sv-why-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: rgba(249,115,22,0.15);
          border: 1px solid rgba(249,115,22,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .sv-why-item-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          color: #fff;
          font-size: 0.95rem;
          margin-bottom: 3px;
        }
        .sv-why-item-desc { color: rgba(255,255,255,0.5); font-size: 0.84rem; line-height: 1.5; }
        .sv-why-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .sv-why-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 20px;
          text-align: center;
        }
        .sv-why-card-val {
          font-family: 'Syne', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          color: #f97316;
          display: block;
          margin-bottom: 4px;
        }
        .sv-why-card-lbl { color: rgba(255,255,255,0.5); font-size: 0.8rem; }

        /* ── CTA STRIP ── */
        .sv-cta {
          background: linear-gradient(135deg, #f97316, #ea580c);
          padding: 56px 24px;
          text-align: center;
        }
        .sv-cta h2 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 800;
          color: #fff;
          margin-bottom: 12px;
        }
        .sv-cta p { color: rgba(255,255,255,0.8); font-size: 1rem; margin-bottom: 28px; }
        .sv-cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .sv-cta-btn-w {
          background: #fff;
          color: #ea580c;
          padding: 13px 28px;
          border-radius: 12px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.97rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .sv-cta-btn-w:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .sv-cta-btn-t {
          background: rgba(255,255,255,0.15);
          border: 2px solid rgba(255,255,255,0.4);
          color: #fff;
          padding: 13px 28px;
          border-radius: 12px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.97rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .sv-cta-btn-t:hover { background: rgba(255,255,255,0.25); }
      `}</style>

      <div className="sv-page">

        {/* ── HERO ── */}
        <section className="sv-hero">
          <div className="sv-hero-inner">
            <div className="sv-hero-badge">✦ What We Offer</div>
            <h1>Everything You Need,<br /><span>One Place to Find It</span></h1>
            <p>From tech gadgets to fresh groceries, fashion to fine art — MyShop brings Rwanda's best products and services right to your door.</p>
            <div className="sv-hero-cta">
              <Link to="/" className="sv-btn-primary">🛍️ Shop Now</Link>
              <Link to="/contact" className="sv-btn-secondary">Talk to Us</Link>
            </div>
          </div>
        </section>

        {/* ── WAVE ── */}
        <div className="sv-wave" style={{ background: "#f1f5f9" }}>
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,28 C360,56 1080,0 1440,28 L1440,56 L0,56 Z" fill="#0f172a" />
          </svg>
        </div>

        {/* ── STATS ── */}
        <div className="sv-stats">
          <div className="sv-stats-inner">
            {STATS.map(s => (
              <div className="sv-stat" key={s.label}>
                <span className="sv-stat-val">{s.value}</span>
                <span className="sv-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── SERVICES GRID ── */}
        <section className="sv-section">
          <div className="sv-section-inner">
            <div className="sv-section-label">✦ Our Services</div>
            <h2 className="sv-section-title">Categories We <span>Specialise In</span></h2>
            <p className="sv-section-sub">Every category is carefully managed with dedicated product teams, quality checks, and fast fulfilment.</p>

            <div className="sv-grid">
              {SERVICES.map(s => (
                <div
                  className="sv-card"
                  key={s.title}
                  style={{ "--c": s.color, "--ibg": s.bg }}
                >
                  <div className="sv-card-icon" style={{ background: s.bg }}>{s.icon}</div>
                  <div className="sv-card-tag">{s.tag}</div>
                  <div className="sv-card-title">{s.title}</div>
                  <p className="sv-card-desc">{s.desc}</p>
                  <ul className="sv-card-features">
                    {s.features.map(f => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="sv-section sv-section-alt">
          <div className="sv-section-inner">
            <div className="sv-section-label">✦ How It Works</div>
            <h2 className="sv-section-title">Shop in <span>4 Simple Steps</span></h2>
            <p className="sv-section-sub">We've made the shopping experience as smooth as possible — from discovery to your doorstep.</p>

            <div className="sv-process">
              {PROCESS.map(p => (
                <div className="sv-step" key={p.step}>
                  <div className="sv-step-num">
                    {p.step}
                    <div className="sv-step-emoji">{p.icon}</div>
                  </div>
                  <div className="sv-step-title">{p.title}</div>
                  <p className="sv-step-desc">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY CHOOSE US ── */}
        <section className="sv-why">
          <div className="sv-why-inner">
            <div className="sv-why-text">
              <div className="sv-section-label">✦ Why MyShop</div>
              <h2 className="sv-section-title">Built for <span>Rwandans</span>,<br />Trusted by All</h2>
              <p className="sv-section-sub">We're not just a shop — we're a platform built around your convenience, safety, and satisfaction.</p>
              <div className="sv-why-list">
                {[
                  { icon: "🛡️", title: "Buyer Protection", desc: "Every purchase is protected. Full refund if something goes wrong." },
                  { icon: "⚡", title: "Lightning Fast Delivery", desc: "Same-day delivery in Kigali. Orders placed before 12PM arrive today." },
                  { icon: "🤝", title: "Verified Sellers Only", desc: "All vendors go through strict verification — no fakes, no surprises." },
                  { icon: "💬", title: "24/7 Support", desc: "Our support team is always on standby via WhatsApp, email or phone." },
                ].map(w => (
                  <div className="sv-why-item" key={w.title}>
                    <div className="sv-why-icon">{w.icon}</div>
                    <div>
                      <div className="sv-why-item-title">{w.title}</div>
                      <div className="sv-why-item-desc">{w.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sv-why-cards">
              {[
                { val: "99%", lbl: "On-time Delivery" },
                { val: "24/7", lbl: "Customer Support" },
                { val: "30d", lbl: "Easy Returns" },
                { val: "0%", lbl: "Hidden Fees" },
              ].map(c => (
                <div className="sv-why-card" key={c.lbl}>
                  <span className="sv-why-card-val">{c.val}</span>
                  <span className="sv-why-card-lbl">{c.lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="sv-cta">
          <h2>Ready to Start Shopping?</h2>
          <p>Join thousands of happy customers across Rwanda. Your next favourite product is one click away.</p>
          <div className="sv-cta-btns">
            <Link to="/" className="sv-cta-btn-w">🛍️ Explore Products</Link>
            <Link to="/contact" className="sv-cta-btn-t">📞 Contact Us</Link>
          </div>
        </section>

      </div>
    </>
  );
}
