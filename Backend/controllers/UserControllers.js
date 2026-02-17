const db = require("../config/db");
const bcrypt = require("bcryptjs");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check if admin exists
    const [users] = await db.query(
      "SELECT id,fullname,phonenumber, email, password FROM users WHERE email = ?",
      [email]
    );

    if (!users.length) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user= users[0];

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3️⃣ Success (NO JWT)
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        fullname: user.fullname,
        phonenumber: user.phonenumber,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Register/Create Admin with hashed password
exports.registerUser = async (req, res) => {
  try {
    const { fullname, phonenumber, email, password } = req.body;

    // Validate input
    if (!fullname ||!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if admin already exists
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length) {
      return res.status(409).json({ message: "users already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin with hashed password
    await db.query(
      "INSERT INTO users (fullname, phonenumber, email, password) VALUES (?, ?, ?, ?)",
      [fullname, phonenumber, email, hashedPassword]
    );

    res.status(201).json({success:true, message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
