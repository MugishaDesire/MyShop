const db = require("../config/db");
const bcrypt = require("bcryptjs");

// ── LOGIN ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [users] = await db.query(
      "SELECT id, fullname, phonenumber, email, password FROM users WHERE email = ?",
      [email]
    );

    if (!users.length) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

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
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── REGISTER ──────────────────────────────────────────────────────────────────
exports.registerUser = async (req, res) => {
  try {
    const { fullname, phonenumber, email, password } = req.body;

    if (!fullname || !email || !password || !phonenumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (fullname, phonenumber, email, password) VALUES (?, ?, ?, ?)",
      [fullname, phonenumber, email, hashedPassword]
    );

    res.status(201).json({ success: true, message: "User created successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, email, phonenumber } = req.body;

    if (!fullname || !email || !phonenumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check user exists
    const [users] = await db.query("SELECT id FROM users WHERE id = ?", [id]);
    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check email not taken by someone else
    const [emailCheck] = await db.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, id]
    );
    if (emailCheck.length) {
      return res.status(409).json({ message: "Email already in use by another account" });
    }

    await db.query(
      "UPDATE users SET fullname = ?, email = ?, phonenumber = ? WHERE id = ?",
      [fullname, email, phonenumber, id]
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: Number(id),
        fullname,
        email,
        phonenumber,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords are required" });
    }

    // Fetch user
    const [users] = await db.query(
      "SELECT id, password FROM users WHERE id = ?",
      [id]
    );
    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, id]);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET ALL USERS (optional/admin use) ───────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, fullname, phonenumber, email, created_at FROM users ORDER BY created_at DESC"
    );
    res.status(200).json({ users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET SINGLE USER ───────────────────────────────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      "SELECT id, fullname, phonenumber, email, created_at FROM users WHERE id = ?",
      [id]
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── DELETE USER ───────────────────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query("SELECT id FROM users WHERE id = ?", [id]);
    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.query("DELETE FROM users WHERE id = ?", [id]);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};