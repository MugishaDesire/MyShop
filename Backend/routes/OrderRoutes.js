const express = require("express");
const router = express.Router();
const orderController = require("../controllers/OrderControllers");

// Get all orders
router.get("/", orderController.getOrders);

// IMPORTANT: /batch must come BEFORE /:productId to avoid conflicts
router.post("/batch", orderController.createBatchOrders);

// Create single order
router.post("/:productId", orderController.createOrder);

// Update order status
router.patch("/:id/status", orderController.updateOrderStatus);

module.exports = router;