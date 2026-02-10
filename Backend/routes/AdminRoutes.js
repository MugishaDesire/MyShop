const express = require("express");
const router = express.Router();
const { login, registerAdmin } = require("../controllers/AdminControllers");

// POST /admin/login
router.post("/login", login);

// POST /admin/register
router.post("/register", registerAdmin);

module.exports = router;
