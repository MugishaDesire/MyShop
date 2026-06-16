import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Cart() {
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem("shoppingCart");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u && u !== "undefined" && u !== "null") setUser(JSON.parse(u));
    } catch {}
    setLoaded(true);
  }, []);

  // Only save back to localStorage AFTER initial load — prevents overwriting on mount
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("shoppingCart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
  }, [cart, loaded]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev
        .map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const removeItem = (id, name) => {
    setCart(prev => prev.filter(i => i.id !== id));
    showToast(`🗑️ ${name} removed`);
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("shoppingCart");
    showToast("🧹 Cart cleared");
  };

  const handleCheckout = () => {
  if (!user) {
    localStorage.setItem("redirectAfterLogin", "checkout");
    localStorage.setItem("shoppingCart", JSON.stringify(cart)); // ensure latest cart is saved
    navigate("/ulogin", { state: { from: "checkout" } });
  } else {
    navigate("/checkout", { state: { cart, user } });
  }
};

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + (parseFloat(i.price) || 0) * i.quantity, 0);
  const shipping = subtotal > 100 ? 0 : subtotal === 0 ? 0 : 9.99;
  const total = subtotal + shipping;

  const getInitials = (name) =>
    (name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        :root {
          --brand: #0f172a; --accent: #f97316; --green: #10b981;
          --red: #ef4444; --blue: #3b82f6; --gold: #f59e0b;
          --bg: #f1f5f9; --card: #ffffff; --border: #e2e8f0;
          --text: #1e293b; --muted: #64748b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .cart-page { min-height: 100vh; background: var(--bg); font-family: 'DM Sans', sans-serif; color: var(--text); }
        .cart-topbar { background: var(--brand); padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .cart-topbar-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.25rem; background: linear-gradient(90deg, #fff 0%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-decoration: none; }
        .cart-topbar-right { display: flex; align-items: center; gap: 12px; }
        .tb-back { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; text-decoration: none; display: flex; align-items: center; gap: 6px; transition: background 0.2s; }
        .tb-back:hover { background: rgba(255,255,255,0.18); }
        .cart-hero { background: linear-gradient(135deg, var(--brand) 0%, #1e3a5f 100%); padding: 28px 24px 24px; color: #fff; }
        .cart-hero h1 { font-family: 'Syne', sans-serif; font-size: 1.8rem; font-weight: 800; margin-bottom: 4px; }
        .cart-hero p { opacity: 0.75; font-size: 0.95rem; }
        .cart-body { max-width: 1100px; margin: 0 auto; padding: 28px 20px; display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; }
        @media (max-width: 820px) { .cart-body { grid-template-columns: 1fr; } }
        .cart-items-card { background: var(--card); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; }
        .cart-items-header { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .cart-items-header h2 { font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 700; }
        .cart-items-header span { background: var(--accent); color: #fff; font-size: 0.78rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .cart-item { display: grid; grid-template-columns: 90px 1fr auto; gap: 16px; padding: 18px 22px; border-bottom: 1px solid var(--border); align-items: center; transition: background 0.15s; }
        .cart-item:last-child { border-bottom: none; }
        .cart-item:hover { background: #f8fafc; }
        .ci-img { width: 90px; height: 90px; border-radius: 12px; object-fit: cover; background: var(--bg); border: 1px solid var(--border); }
        .ci-img-placeholder { width: 90px; height: 90px; border-radius: 12px; background: linear-gradient(135deg, #e2e8f0, #f1f5f9); display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        .ci-info { min-width: 0; }
        .ci-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1rem; color: var(--text); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ci-cat { display: inline-block; background: #eff6ff; color: var(--blue); font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 20px; margin-bottom: 8px; }
        .ci-price-row { display: flex; align-items: center; gap: 8px; }
        .ci-unit { color: var(--muted); font-size: 0.88rem; }
        .ci-line-total { font-weight: 700; color: var(--accent); font-size: 1rem; }
        .ci-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
        .qty-box { display: flex; align-items: center; border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden; }
        .qty-btn { width: 32px; height: 32px; background: #f8fafc; border: none; font-size: 1.1rem; font-weight: 700; cursor: pointer; color: var(--text); transition: background 0.15s; display: flex; align-items: center; justify-content: center; }
        .qty-btn:hover { background: var(--accent); color: #fff; }
        .qty-num { width: 36px; text-align: center; font-weight: 700; font-size: 0.95rem; border-left: 1.5px solid var(--border); border-right: 1.5px solid var(--border); line-height: 32px; }
        .ci-remove { background: none; border: 1.5px solid var(--border); color: var(--red); border-radius: 8px; padding: 5px 10px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
        .ci-remove:hover { background: var(--red); color: #fff; border-color: var(--red); }
        .cart-empty { padding: 64px 24px; text-align: center; }
        .cart-empty-icon { font-size: 4rem; margin-bottom: 16px; }
        .cart-empty h3 { font-family: 'Syne', sans-serif; font-size: 1.4rem; font-weight: 700; margin-bottom: 8px; }
        .cart-empty p { color: var(--muted); margin-bottom: 24px; }
        .cart-empty-btn { background: var(--accent); color: #fff; border: none; padding: 12px 28px; border-radius: 12px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1rem; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .cart-empty-btn:hover { background: #ea6f0a; transform: translateY(-2px); }
        .cart-clear-bar { padding: 12px 22px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }
        .btn-clear-all { background: none; border: 1.5px solid var(--border); color: var(--red); padding: 7px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .btn-clear-all:hover { background: var(--red); color: #fff; border-color: var(--red); }
        .cart-summary { background: var(--card); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; position: sticky; top: 68px; }
        .cs-header { padding: 18px 22px; border-bottom: 1px solid var(--border); }
        .cs-header h2 { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.1rem; }
        .cs-body { padding: 20px 22px; }
        .cs-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 0.95rem; }
        .cs-row.divider { border-top: 1px solid var(--border); margin-top: 8px; padding-top: 16px; }
        .cs-row.total { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.15rem; color: var(--text); }
        .cs-row .label { color: var(--muted); }
        .cs-row .value { font-weight: 600; }
        .cs-row .free { color: var(--green); font-weight: 700; }
        .cs-free-note { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; font-size: 0.82rem; color: #166534; margin: 14px 0; display: flex; gap: 6px; align-items: center; }
        .btn-checkout { width: 100%; background: linear-gradient(135deg, var(--accent), #ea580c); color: #fff; border: none; padding: 15px; border-radius: 12px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.05rem; cursor: pointer; transition: all 0.2s; margin-top: 6px; }
        .btn-checkout:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(249,115,22,0.35); }
        .btn-checkout:disabled { background: #cbd5e1; cursor: not-allowed; }
        .btn-shop-more { width: 100%; background: var(--brand); color: #fff; border: none; padding: 11px; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 0.95rem; cursor: pointer; margin-top: 10px; text-decoration: none; display: block; text-align: center; transition: background 0.2s; }
        .btn-shop-more:hover { background: #1e3a5f; }
        .cs-user { margin: 18px 22px 0; padding: 12px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; display: flex; align-items: center; gap: 10px; }
        .cs-user-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--green), #059669); color: #fff; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cs-user-info { min-width: 0; }
        .cs-user-name { font-weight: 700; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cs-user-sub { color: var(--muted); font-size: 0.78rem; }
        .cs-login-note { margin: 18px 22px 0; padding: 10px 14px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; font-size: 0.83rem; color: #9a3412; text-align: center; }
        .cs-login-note a { color: var(--accent); font-weight: 700; text-decoration: none; }
        .cart-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(80px); background: var(--brand); color: #fff; padding: 12px 24px; border-radius: 30px; font-weight: 600; font-size: 0.95rem; box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 9999; opacity: 0; transition: all 0.3s; white-space: nowrap; }
        .cart-toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
      `}</style>

      <div className="cart-page">
        <div className="cart-topbar">
          <Link to="/" className="cart-topbar-logo">🛍️ MyShop</Link>
          <div className="cart-topbar-right">
            <Link to="/" className="tb-back">← Continue Shopping</Link>
          </div>
        </div>

        <div className="cart-hero">
          <h1>🛒 Your Cart</h1>
          <p>{totalItems > 0 ? `${totalItems} item${totalItems !== 1 ? "s" : ""} ready for checkout` : "Your cart is empty"}</p>
        </div>

        <div className="cart-body">
          <div>
            <div className="cart-items-card">
              <div className="cart-items-header">
                <h2>Cart Items</h2>
                {totalItems > 0 && <span>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>}
              </div>

              {cart.length === 0 ? (
                <div className="cart-empty">
                  <div className="cart-empty-icon">🛒</div>
                  <h3>Nothing here yet!</h3>
                  <p>Browse our products and add your favourites.</p>
                  <Link to="/" className="cart-empty-btn">Start Shopping →</Link>
                </div>
              ) : (
                <>
                  {cart.map(item => {
                    const price = parseFloat(item.price) || 0;
                    const lineTotal = (price * item.quantity).toFixed(2);
                    return (
                      <div className="cart-item" key={item.id}>
                        {item.image_url
                          ? <img className="ci-img" src={item.image_url} alt={item.name} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                          : null}
                        <div className="ci-img-placeholder" style={item.image_url ? { display: "none" } : {}}>🛍️</div>
                        <div className="ci-info">
                          <div className="ci-name">{item.name}</div>
                          {item.category && <span className="ci-cat">{item.category}</span>}
                          <div className="ci-price-row">
                            <span className="ci-unit">${price.toFixed(2)} each</span>
                            <span>·</span>
                            <span className="ci-line-total">${lineTotal}</span>
                          </div>
                        </div>
                        <div className="ci-controls">
                          <div className="qty-box">
                            <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                            <span className="qty-num">{item.quantity}</span>
                            <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                          </div>
                          <button className="ci-remove" onClick={() => removeItem(item.id, item.name)}>🗑️ Remove</button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="cart-clear-bar">
                    <button className="btn-clear-all" onClick={clearCart}>🧹 Clear All</button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            {user ? (
              <div className="cs-user">
                <div className="cs-user-avatar">{getInitials(user.fullname || user.name)}</div>
                <div className="cs-user-info">
                  <div className="cs-user-name">{user.fullname || user.name || user.email}</div>
                  <div className="cs-user-sub">Logged in · ready to checkout</div>
                </div>
              </div>
            ) : (
              <div className="cs-login-note">
                <Link to="/ulogin">Log in</Link> to track your orders and save your cart.
              </div>
            )}

            <div className="cart-summary" style={{ marginTop: "14px" }}>
              <div className="cs-header"><h2>Order Summary</h2></div>
              <div className="cs-body">
                <div className="cs-row">
                  <span className="label">Subtotal ({totalItems} items)</span>
                  <span className="value">${subtotal.toFixed(2)}</span>
                </div>
                <div className="cs-row">
                  <span className="label">Shipping</span>
                  <span className={shipping === 0 && subtotal > 0 ? "free" : "value"}>
                    {subtotal === 0 ? "$0.00" : shipping === 0 ? "FREE ✓" : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                {subtotal > 0 && subtotal <= 100 && (
                  <div className="cs-free-note">🚚 Add <strong>${(100 - subtotal).toFixed(2)}</strong> more for free shipping!</div>
                )}
                {subtotal > 100 && (
                  <div className="cs-free-note">🎉 You've unlocked free shipping!</div>
                )}
                <div className="cs-row divider total">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <button className="btn-checkout" onClick={handleCheckout} disabled={cart.length === 0}>
                  {user ? "Proceed to Checkout →" : "Login & Checkout →"}
                </button>
                <Link to="/" className="btn-shop-more">← Continue Shopping</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`cart-toast ${toast ? "show" : ""}`}>{toast}</div>
    </>
  );
}
