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
      "SELECT stock FROM products WHERE id = ?",
      [productId]
    );

    if (!products.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    if (products[0].stock < qty) {
      await connection.rollback();
      return res.status(400).json({ message: "Insufficient stock" });
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
    console.error(error);
    res.status(500).json({ message: "Failed to create order" });
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
