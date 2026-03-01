const express = require("express");
const router = express.Router();
const {
  login,
  registerUser,
  updateUser,
  changePassword,
  getAllUsers,
  getUserById,
  deleteUser,
} = require("../controllers/UserControllers");

router.post("/login", login);
router.post("/register", registerUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/password/:id", changePassword);  // ⚠️ must be before /:id
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;