const express = require("express");
const router = express.Router();
const {
  getOrders,
  updateOrderStatus,
  createOrder,
} = require("../controllers/OrderControllers");

router.get("/", getOrders);
router.post("/:productId", createOrder);   // ✅ ADD THIS
router.put("/:id/status", updateOrderStatus);

module.exports = router;
