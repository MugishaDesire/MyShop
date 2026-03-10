const db = require("../config/db");

/**
 * GET /orders
 * Fetch all orders (admin use)
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
 * GET /orders/user/:userId
 * Fetch orders for a specific user by user ID
 */
exports.getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    const [orders] = await db.query(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /orders/:productId
 * Create a new order (single product)
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
      user_id,        // NEW
    } = req.body;

    if (!cust_name || !cust_phone || !qty || !location) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await connection.beginTransaction();

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
        message: `Insufficient stock for ${products[0].name}. Only ${products[0].stock} available.`,
      });
    }

    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (product_id, user_id, cust_name, cust_phone, cust_email, qty, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        user_id || null,      // NEW
        cust_name,
        cust_phone,
        cust_email || null,
        qty,
        location,
        status || "Pending",
      ]
    );

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
      items,
      cust_name,
      cust_phone,
      cust_email,
      location,
      status,
      user_id,        // NEW
    } = req.body;

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
        stockIssues.push({ productId: item.productId, issue: "Product not found" });
        continue;
      }

      if (products[0].stock < item.qty) {
        stockIssues.push({
          productId: item.productId,
          productName: products[0].name,
          requested: item.qty,
          available: products[0].stock,
          issue: "Insufficient stock",
        });
      }
    }

    if (stockIssues.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Stock issues found", issues: stockIssues });
    }

    // Create orders and update stock
    for (const item of items) {
      const [orderResult] = await connection.query(
        `INSERT INTO orders 
         (product_id, user_id, cust_name, cust_phone, cust_email, qty, location, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.productId,
          user_id || null,      // NEW
          cust_name,
          cust_phone,
          cust_email || null,
          item.qty,
          location,
          status || "Pending",
        ]
      );

      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.qty, item.productId]
      );

      createdOrders.push({
        orderId: orderResult.insertId,
        productId: item.productId,
        quantity: item.qty,
      });
    }

    await connection.commit();

    res.status(201).json({
      message: "Orders created successfully",
      orders: createdOrders,
      totalOrders: createdOrders.length,
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
 * Update order status (Pending -> Paid -> Delivered)
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

    await db.query("UPDATE orders SET status = ? WHERE id = ?", [nextStatus, id]);

    res.json({
      message: "Order status updated",
      status: nextStatus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /orders/:id
 * Delete an order by ID (admin use)
 */
exports.deleteOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [orders] = await connection.query(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    );

    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[0];

    // Restore stock only for non-delivered orders
    if (order.status !== "Delivered") {
      await connection.query(
        "UPDATE products SET stock = stock + ? WHERE id = ?",
        [order.qty, order.product_id]
      );
    }

    await connection.query("DELETE FROM orders WHERE id = ?", [id]);

    await connection.commit();

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Delete order error:", error);
    res.status(500).json({ message: "Failed to delete order" });
  } finally {
    connection.release();
  }
};