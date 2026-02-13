const db = require("../config/db");

/**
 * GET /orders
 * Fetch all orders
 */
exports.getOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /orders/:productId
 * Create a new order (single product)
 * This endpoint is used for both single-item orders and multi-item checkout
 */
exports.createOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { productId } = req.params;
    const {
      cust_name,
      cust_phone,
      cust_email,
      qty,
      location,
      status,
      date,
    } = req.body;

    // Basic validation
    if (!cust_name || !cust_phone || !qty || !location) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await connection.beginTransaction();

    // Check product stock
    const [products] = await connection.query(
      "SELECT stock, name FROM products WHERE id = ?",
      [productId]
    );

    if (!products.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    if (products[0].stock < qty) {
      await connection.rollback();
      return res.status(400).json({ 
        message: `Insufficient stock for ${products[0].name}. Only ${products[0].stock} available.` 
      });
    }

    // Insert order
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (product_id, cust_name, cust_phone, cust_email, qty, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        cust_name,
        cust_phone,
        cust_email || null,
        qty,
        location,
        status || "Pending",
      ]
    );

    // Reduce product stock
    await connection.query(
      "UPDATE products SET stock = stock - ? WHERE id = ?",
      [qty, productId]
    );

    await connection.commit();

    res.status(201).json({
      message: "Order created successfully",
      orderId: orderResult.insertId,
    });

  } catch (error) {
    await connection.rollback();
    console.error("Order creation error:", error);
    res.status(500).json({ message: "Failed to create order" });
  } finally {
    connection.release();
  }
};

/**
 * POST /orders/batch
 * Create multiple orders at once (for cart checkout)
 */
exports.createBatchOrders = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      items, // Array of { productId, qty }
      cust_name,
      cust_phone,
      cust_email,
      location,
      status,
    } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    if (!cust_name || !cust_phone || !location) {
      return res.status(400).json({ message: "Missing required customer information" });
    }

    await connection.beginTransaction();

    const createdOrders = [];
    const stockIssues = [];

    // Check stock for all items first
    for (const item of items) {
      const [products] = await connection.query(
        "SELECT stock, name FROM products WHERE id = ?",
        [item.productId]
      );

      if (!products.length) {
        stockIssues.push({
          productId: item.productId,
          issue: "Product not found"
        });
        continue;
      }

      if (products[0].stock < item.qty) {
        stockIssues.push({
          productId: item.productId,
          productName: products[0].name,
          requested: item.qty,
          available: products[0].stock,
          issue: `Insufficient stock`
        });
      }
    }

    // If there are any stock issues, rollback and return error
    if (stockIssues.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "Stock issues found",
        issues: stockIssues
      });
    }

    // Create orders and update stock for each item
    for (const item of items) {
      // Insert order
      const [orderResult] = await connection.query(
        `INSERT INTO orders 
         (product_id, cust_name, cust_phone, cust_email, qty, location, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.productId,
          cust_name,
          cust_phone,
          cust_email || null,
          item.qty,
          location,
          status || "Pending",
        ]
      );

      // Reduce product stock
      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.qty, item.productId]
      );

      createdOrders.push({
        orderId: orderResult.insertId,
        productId: item.productId,
        quantity: item.qty
      });
    }

    await connection.commit();

    res.status(201).json({
      message: "Orders created successfully",
      orders: createdOrders,
      totalOrders: createdOrders.length
    });

  } catch (error) {
    await connection.rollback();
    console.error("Batch order creation error:", error);
    res.status(500).json({ message: "Failed to create orders" });
  } finally {
    connection.release();
  }
};

/**
 * PATCH /orders/:id/status
 * Update order status (Pending → Paid → Delivered)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await db.query(
      "SELECT status FROM orders WHERE id = ?",
      [id]
    );

    if (!orders.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentStatus = orders[0].status;

    const nextStatus =
      currentStatus === "Pending"
        ? "Paid"
        : currentStatus === "Paid"
        ? "Delivered"
        : "Delivered";

    await db.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [nextStatus, id]
    );

    res.json({
      message: "Order status updated",
      status: nextStatus,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};