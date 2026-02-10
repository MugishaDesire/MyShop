const db = require("../config/db");
const bcrypt = require("bcryptjs");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check if admin exists
    const [admins] = await db.query(
      "SELECT id, email, password FROM admins WHERE email = ?",
      [email]
    );

    if (!admins.length) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const admin = admins[0];

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3️⃣ Success (NO JWT)
    res.status(200).json({
      message: "Login successful",
      admin: {
        id: admin.id,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Register/Create Admin with hashed password
exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if admin already exists
    const [existing] = await db.query(
      "SELECT id FROM admins WHERE email = ?",
      [email]
    );

    if (existing.length) {
      return res.status(409).json({ message: "Admin already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin with hashed password
    await db.query(
      "INSERT INTO admins (email, password) VALUES (?, ?)",
      [email, hashedPassword]
    );

    res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
