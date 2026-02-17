const express = require("express");
const router = express.Router();
const { login, registerUser } = require("../controllers/UserControllers");

// POST /User/login
router.post("/login", login);

// POST /user/register
router.post("/register", registerUser);

module.exports = router;