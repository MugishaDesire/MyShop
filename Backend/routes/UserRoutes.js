const express = require("express");
const router = express.Router();
const passport = require("../config/passport"); // ADD THIS
const {
  login,
  registerUser,
  updateUser,
  changePassword,
  getAllUsers,
  getUserById,
  deleteUser,
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require("../controllers/UserControllers");

router.post("/login", login);
router.post("/register", registerUser);
router.get("/", getAllUsers);
router.put("/password/:id", changePassword);
router.post("/forgot-password", forgotPassword);
router.get("/verify-reset-token/:token", verifyResetToken);
router.post("/reset-password", resetPassword);

// ADD THESE TWO ROUTES — before /:id to avoid conflicts
router.get("/auth/google",
 passport.authenticate("google-user", { scope: ["profile", "email"] })
);
router.get("/auth/google/callback",
  passport.authenticate("google-user", {
    failureRedirect: "http://localhost:5173/ulogin?error=google_failed",
  }),
  (req, res) => {
    const user = req.user;
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      phonenumber: user.phonenumber,
    }));
    res.redirect(`http://localhost:5173/auth/google/user-success?user=${userData}`);
  }
);

router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;