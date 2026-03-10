const db = require("../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");  
const nodemailer = require("nodemailer");        // NEW — built-in Node module
// const mailer = require("../config/mailer"); // NEW — our mailer config


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,    
  },
});


// ─── HELPER: generate & save OTP ────────────────────────────────────────────
async function sendOtp(adminId, email) {
  // Generate a secure 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString(); // NEW

  // Expires in 10 minutes from now
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // NEW

  // Save hashed OTP to DB (never store plaintext)
  const hashedOtp = await bcrypt.hash(otp, 10); // NEW
  await db.query(
    "UPDATE admins SET otp = ?, otp_expires_at = ? WHERE id = ?",
    [hashedOtp, expiresAt, adminId]
  );

  // Send email
  await transporter.sendMail({
    from: `"Admin Panel" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Your login verification code",
    text: `Your OTP is: ${otp}\n\nIt expires in 10 minutes. Do not share it.`,
  });
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [admins] = await db.query(
      "SELECT id, email, password FROM admins WHERE email = ?",
      [email]
    );
    if (!admins.length) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const admin = admins[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // NEW: Instead of logging in immediately, send OTP and ask frontend to verify
    await sendOtp(admin.id, admin.email);

    // Return adminId so the frontend knows who to verify next step
    // ⚠️ This is NOT a session yet — just a pending state
    return res.status(200).json({
      message: "OTP sent to your email",
      adminId: admin.id,   // NEW — frontend stores this temporarily
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── VERIFY OTP (used after login AND after returning to tab) ────────────────
exports.verifyOtp = async (req, res) => { // NEW FUNCTION
  try {
    const { adminId, otp } = req.body;

    const [admins] = await db.query(
      "SELECT id, email, otp, otp_expires_at FROM admins WHERE id = ?",
      [adminId]
    );
    if (!admins.length) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const admin = admins[0];

    // Check expiry
    if (!admin.otp || new Date() > new Date(admin.otp_expires_at)) {
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }

    // Compare submitted OTP against hashed OTP in DB
    const isValid = await bcrypt.compare(otp, admin.otp);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // ✅ OTP is correct — clear it so it can't be reused
    await db.query(
      "UPDATE admins SET otp = NULL, otp_expires_at = NULL WHERE id = ?",
      [admin.id]
    );

    // Now issue the real session/token
    // Using a simple approach: store adminId in a session or return it as "verified"
    // If you add JWT later, sign and return it here
    return res.status(200).json({
      message: "OTP verified. Login successful.",
      admin: { id: admin.id, email: admin.email },
      verified: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── RESEND OTP ──────────────────────────────────────────────────────────────
exports.resendOtp = async (req, res) => { // NEW FUNCTION
  try {
    const { adminId } = req.body;

    const [admins] = await db.query(
      "SELECT id, email FROM admins WHERE id = ?",
      [adminId]
    );
    if (!admins.length) {
      return res.status(404).json({ message: "Admin not found" });
    }

    await sendOtp(admins[0].id, admins[0].email);
    return res.status(200).json({ message: "New OTP sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── REGISTER (unchanged logic, no OTP needed here) ─────────────────────────
exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const [existing] = await db.query("SELECT id FROM admins WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ message: "Admin already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO admins (email, password) VALUES (?, ?)", [email, hashedPassword]);
    res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};