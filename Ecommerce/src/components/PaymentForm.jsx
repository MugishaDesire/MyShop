import { useState } from "react";

export default function PaymentForm() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState(null); // null | "pending" | "successful" | "failed"
  const [transactionRef, setTransactionRef] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!phone || !amount) return alert("Please fill all fields");

    setLoading(true);
    setStatus(null);

    try {
      // 1. Initiate cashin
      const res = await fetch("http://localhost:5000/api/payment/cashin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), phone }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Payment failed");

      setTransactionRef(data.ref);
      setStatus("pending");

      // 2. Poll for status every 3 seconds (max 10 times = 30s)
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;

        const statusRes = await fetch(
          `http://localhost:5000/api/payment/status/${data.ref}`
        );
        const statusData = await statusRes.json();

        if (statusData.status === "successful") {
          setStatus("successful");
          clearInterval(interval);
        } else if (statusData.status === "failed") {
          setStatus("failed");
          clearInterval(interval);
        } else if (attempts >= 10) {
          // Timeout — rely on webhook instead
          clearInterval(interval);
        }
      }, 3000);
    } catch (err) {
      console.error(err);
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>Pay with Mobile Money</h2>

      <input
        type="text"
        placeholder="Phone (e.g. 078xxxxxxx)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ display: "block", width: "100%", padding: 10, marginBottom: 12 }}
      />

      <input
        type="number"
        placeholder="Amount (RWF)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ display: "block", width: "100%", padding: 10, marginBottom: 12 }}
      />

      <button
        onClick={handlePayment}
        disabled={loading}
        style={{ padding: "10px 24px", background: "#0070f3", color: "#fff", border: "none", cursor: "pointer" }}
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>

      {status === "pending" && (
        <p style={{ color: "orange" }}>⏳ Waiting for payment confirmation... Check your phone!</p>
      )}
      {status === "successful" && (
        <p style={{ color: "green" }}>✅ Payment successful! Ref: {transactionRef}</p>
      )}
      {status === "failed" && (
        <p style={{ color: "red" }}>❌ Payment failed. Please try again.</p>
      )}
    </div>
  );
}