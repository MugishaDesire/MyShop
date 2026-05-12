const db = require("../config/db");
const fetch = require("node-fetch");

// ── Haversine formula — distance in meters between two coords ──
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Geocode a text address → [lat, lng] using Nominatim ────────
async function geocodeAddress(address) {
  try {
    const fetch = (await import("node-fetch")).default;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res  = await fetch(url, { headers: { "User-Agent": "MyShopApp/1.0" } });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error("Geocode error:", err.message);
  }
  return null;
}

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
      user_id,
      payment_ref,
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
       (product_id, user_id, cust_name, cust_phone, cust_email, qty, location, status, payment_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        user_id     || null,
        cust_name,
        cust_phone,
        cust_email  || null,
        qty,
        location,
        status      || "Pending",
        payment_ref || null,
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
      user_id,
      payment_ref,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    if (!cust_name || !cust_phone || !location) {
      return res.status(400).json({ message: "Missing required customer information" });
    }

    await connection.beginTransaction();

    const createdOrders = [];
    const stockIssues   = [];

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
          productId:   item.productId,
          productName: products[0].name,
          requested:   item.qty,
          available:   products[0].stock,
          issue:       "Insufficient stock",
        });
      }
    }

    if (stockIssues.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Stock issues found", issues: stockIssues });
    }

    for (const item of items) {
      const [orderResult] = await connection.query(
        `INSERT INTO orders 
         (product_id, user_id, cust_name, cust_phone, cust_email, qty, location, status, payment_ref)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.productId,
          user_id     || null,
          cust_name,
          cust_phone,
          cust_email  || null,
          item.qty,
          location,
          status      || "Pending",
          payment_ref || null,
        ]
      );

      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.qty, item.productId]
      );

      createdOrders.push({
        orderId:   orderResult.insertId,
        productId: item.productId,
        quantity:  item.qty,
      });
    }

    await connection.commit();

    res.status(201).json({
      message:     "Orders created successfully",
      orders:      createdOrders,
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
 * Update order status (Pending -> Paid -> Delivered) — admin manual update
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
      currentStatus === "Pending"  ? "Paid"      :
      currentStatus === "Paid"     ? "Delivered"  :
                                     "Delivered";

    await db.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [nextStatus, id]
    );

    res.json({ message: "Order status updated", status: nextStatus });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PATCH /orders/payment/:ref
 * Called by Paypack webhook
 */
exports.updateOrderByPaymentRef = async (req, res) => {
  try {
    const { ref }    = req.params;
    const { status } = req.body;

    if (!ref || !status) {
      return res.status(400).json({ message: "ref and status are required" });
    }

    const [result] = await db.query(
      "UPDATE orders SET status = ? WHERE payment_ref = ?",
      [status, ref]
    );

    if (result.affectedRows === 0) {
      console.warn(`⚠️  No order found with payment_ref: ${ref}`);
      return res.status(200).json({ message: "No matching order found, skipped" });
    }

    console.log(`✅ ${result.affectedRows} order(s) updated to "${status}" for payment_ref: ${ref}`);
    res.json({ message: "Order updated successfully", affectedRows: result.affectedRows });

  } catch (error) {
    console.error("❌ updateOrderByPaymentRef error:", error.message);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

/**
 * PATCH /orders/:id/assign
 * Admin assigns an order to a courier
 */
exports.assignOrderToCourier = async (req, res) => {
  try {
    const { id }         = req.params;
    const { courier_id } = req.body;

    if (!courier_id)
      return res.status(400).json({ message: "courier_id is required" });

    const [orders] = await db.query(
      "SELECT * FROM orders WHERE id = ?", [id]
    );

    if (!orders.length)
      return res.status(404).json({ message: "Order not found" });

    if (orders[0].status === "Delivered")
      return res.status(400).json({ message: "Cannot assign an already delivered order" });

    // Fetch courier name for notification
    const [couriers] = await db.query(
      "SELECT id, fullname FROM users WHERE id = ? AND role = 'courier'",
      [courier_id]
    );
    const courierName = couriers[0]?.fullname || "Your courier";

    await db.query(
      "UPDATE orders SET courier_id = ?, status = 'Assigned' WHERE id = ?",
      [courier_id, id]
    );

    // ── Notify customer via socket ──────────────────────────
    const io = req.app.get("io");
    if (io && orders[0].user_id) {
      io.to(`user_${orders[0].user_id}`).emit("order:status", {
        orderId:     Number(id),
        status:      "Assigned",
        courierName,
        message:     `Your courier ${courierName} has been assigned and will pick up your order soon.`,
      });
    }

    // ── Notify courier of new assignment ────────────────────
    if (io) {
      io.to(`courier_${courier_id}`).emit("new_assignment", {
        orderId:  Number(id),
        message:  "You have a new order assignment!",
      });
    }

    res.json({ message: "Order assigned to courier successfully", orderId: id, courier_id });

  } catch (error) {
    console.error("assignOrderToCourier error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /orders/courier/:courierId
 * Fetch all orders assigned to a specific courier
 */
exports.getOrdersByCourier = async (req, res) => {
  try {
    const { courierId } = req.params;

    if (!courierId) {
      return res.status(400).json({ message: "Courier ID required" });
    }

    const [orders] = await db.query(
      "SELECT * FROM orders WHERE courier_id = ? ORDER BY created_at DESC",
      [courierId]
    );

    res.json(orders);

  } catch (error) {
    console.error("getOrdersByCourier error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PATCH /orders/:id/deliver
 * Internal — called automatically when courier is within 100m of customer.
 * Can also be called manually as fallback.
 */
exports.markAsDelivered = async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await db.query(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    );

    if (!orders.length)
      return res.status(404).json({ message: "Order not found" });

    if (orders[0].status === "Delivered")
      return res.status(200).json({ message: "Order already delivered", alreadyDone: true });

    if (!orders[0].courier_id)
      return res.status(400).json({ message: "No courier assigned to this order" });

    await db.query(
      "UPDATE orders SET status = 'Delivered' WHERE id = ?", [id]
    );

    const order = orders[0];
    const io    = req.app.get("io");

    // ── Notify customer in-app (socket) ─────────────────────
    if (io && order.user_id) {
      io.to(`user_${order.user_id}`).emit("order:status", {
        orderId: Number(id),
        status:  "Delivered",
        message: "Your order has been delivered! Thank you for shopping with us. 🎉",
      });
    }

    // ── Notify admin dashboard ───────────────────────────────
    if (io) {
      io.to("admin").emit("order:status_changed", {
        orderId: Number(id),
        status:  "Delivered",
      });
    }

    // ── Send email notification ──────────────────────────────
    if (order.cust_email) {
      sendDeliveryEmail(order).catch(err =>
        console.error("Email send error:", err.message)
      );
    }

    console.log(`✅ Order ${id} auto-marked as Delivered`);
    res.json({ message: "Order marked as delivered", orderId: id });

  } catch (error) {
    console.error("markAsDelivered error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PATCH /orders/:id/location
 * Courier sends live GPS location.
 * AUTO-DELIVERS if courier is within 100 metres of customer address.
 * Also notifies customer that courier is on the way (first ping only).
 */
exports.updateCourierLocation = async (req, res) => {
  try {
    const { id }              = req.params;
    const { lat, lng, label } = req.body;

    if (lat === undefined || lng === undefined)
      return res.status(400).json({ message: "lat and lng are required" });

    // ── Fetch full order ─────────────────────────────────────
    const [orders] = await db.query(
      "SELECT * FROM orders WHERE id = ?", [id]
    );

    if (!orders.length)
      return res.status(404).json({ message: "Order not found" });

    const order = orders[0];

    if (order.status === "Delivered")
      return res.status(200).json({ message: "Already delivered", alreadyDone: true });

    if (!order.courier_id)
      return res.status(400).json({ message: "No courier assigned" });

    const io = req.app.get("io");

    // ── First location ping → notify customer courier is coming ─
    // We use delivery_lat being NULL as "first ping" signal
    if (order.delivery_lat === null && order.user_id) {
      // Fetch courier name
      const [couriers] = await db.query(
        "SELECT fullname FROM users WHERE id = ?", [order.courier_id]
      );
      const courierName = couriers[0]?.fullname || "Your courier";

      if (io) {
        io.to(`user_${order.user_id}`).emit("order:courier_on_way", {
          orderId:     Number(id),
          courierName,
          message:     `${courierName} has picked up your order and is on the way! 🚚`,
        });
      }

      // Send "on the way" email
      if (order.cust_email) {
        sendOnTheWayEmail(order, courierName).catch(err =>
          console.error("On-the-way email error:", err.message)
        );
      }

      console.log(`🚚 Courier is on the way — notified user_${order.user_id}`);
    }

    // ── Save courier's current location to DB ─────────────────
    await db.query(
      `UPDATE orders
       SET delivery_lat        = ?,
           delivery_lng        = ?,
           delivery_label      = ?,
           location_updated_at = NOW()
       WHERE id = ?`,
      [lat, lng, label || null, id]
    );

    // ── Emit live location to anyone tracking this order ──────
    if (io) {
      io.to(`order_${id}`).emit("courier:location", {
        courierId: order.courier_id,
        orderId:   Number(id),
        lat,
        lng,
      });
    }

    // ── Geofence check — auto-deliver if within 100 m ─────────
    const DELIVERY_RADIUS_M = 100;

    if (order.location) {
      const customerCoords = await geocodeAddress(order.location);

      if (customerCoords) {
        const distance = getDistanceMeters(lat, lng, customerCoords.lat, customerCoords.lng);
        console.log(`📍 Order ${id}: courier is ${Math.round(distance)}m from customer`);

        if (distance <= DELIVERY_RADIUS_M) {
          console.log(`🎯 Within ${DELIVERY_RADIUS_M}m — auto-marking order ${id} as Delivered`);

          // Mark delivered in DB
          await db.query(
            "UPDATE orders SET status = 'Delivered' WHERE id = ?", [id]
          );

          // Notify customer
          if (io && order.user_id) {
            io.to(`user_${order.user_id}`).emit("order:status", {
              orderId: Number(id),
              status:  "Delivered",
              message: "Your order has been delivered! Enjoy! 🎉",
            });
          }

          // Notify admin
          if (io) {
            io.to("admin").emit("order:status_changed", {
              orderId: Number(id),
              status:  "Delivered",
            });
          }

          // Notify courier dashboard to remove from list
          if (io) {
            io.to(`courier_${order.courier_id}`).emit("order:auto_delivered", {
              orderId: Number(id),
              message: "Order automatically marked as delivered — you have arrived! 🎉",
            });
          }

          // Send delivery email
          if (order.cust_email) {
            sendDeliveryEmail(order).catch(err =>
              console.error("Delivery email error:", err.message)
            );
          }

          return res.json({
            message:       "Location updated — order auto-delivered",
            autoDelivered: true,
            distance:      Math.round(distance),
          });
        }
      }
    }

    res.json({
      message:       "Location updated",
      autoDelivered: false,
      orderId:       Number(id),
      location:      { lat, lng, label: label || null },
    });

  } catch (error) {
    console.error("updateCourierLocation error:", error);
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
      "SELECT * FROM orders WHERE id = ?", [id]
    );

    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[0];

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

// ════════════════════════════════════════════════════════════
//  EMAIL HELPERS
// ════════════════════════════════════════════════════════════

async function sendDeliveryEmail(order) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from:    `"MyShop" <${process.env.EMAIL_USER}>`,
    to:      order.cust_email,
    subject: `✅ Your order #${order.id} has been delivered!`,
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
        <div style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;border-radius:12px;margin-bottom:24px;text-align:center;">
          <div style="font-size:3rem;margin-bottom:8px;">✅</div>
          <h1 style="color:white;margin:0;font-size:1.5rem;font-weight:800;">Order Delivered!</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">Your order has arrived successfully</p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;margin-bottom:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:0.9rem;border-bottom:1px solid #f1f5f9;">Order ID</td><td style="padding:8px 0;font-weight:700;color:#1e293b;text-align:right;">#${order.id}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:0.9rem;border-bottom:1px solid #f1f5f9;">Delivered To</td><td style="padding:8px 0;font-weight:600;color:#1e293b;text-align:right;">${order.location || "N/A"}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:0.9rem;">Recipient</td><td style="padding:8px 0;font-weight:600;color:#1e293b;text-align:right;">${order.cust_name || "N/A"}</td></tr>
          </table>
        </div>
        <div style="background:#d1fae5;border-radius:10px;padding:16px;text-align:center;border:1px solid #6ee7b7;">
          <p style="margin:0;color:#065f46;font-weight:600;">🎉 Thank you for shopping with us!</p>
        </div>
      </div>
    `,
  });
  console.log(`📧 Delivery email sent to ${order.cust_email}`);
}

async function sendOnTheWayEmail(order, courierName) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from:    `"MyShop" <${process.env.EMAIL_USER}>`,
    to:      order.cust_email,
    subject: `🚚 Your order #${order.id} is on the way!`,
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
        <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;border-radius:12px;margin-bottom:24px;text-align:center;">
          <div style="font-size:3rem;margin-bottom:8px;">🚚</div>
          <h1 style="color:white;margin:0;font-size:1.5rem;font-weight:800;">On The Way!</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">Your courier has picked up your order</p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;margin-bottom:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:0.9rem;border-bottom:1px solid #f1f5f9;">Order ID</td><td style="padding:8px 0;font-weight:700;color:#1e293b;text-align:right;">#${order.id}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:0.9rem;border-bottom:1px solid #f1f5f9;">Courier</td><td style="padding:8px 0;font-weight:700;color:#7c3aed;text-align:right;">${courierName}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:0.9rem;">Delivering To</td><td style="padding:8px 0;font-weight:600;color:#1e293b;text-align:right;">${order.location || "N/A"}</td></tr>
          </table>
        </div>
        <div style="background:#ede9fe;border-radius:10px;padding:16px;text-align:center;border:1px solid #c4b5fd;">
          <p style="margin:0;color:#6d28d9;font-weight:600;">📍 Please be ready to receive your order at your delivery address.</p>
        </div>
      </div>
    `,
  });
  console.log(`📧 On-the-way email sent to ${order.cust_email}`);
}