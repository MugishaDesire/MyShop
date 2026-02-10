const db = require("../config/db");

/**
 * GET /products
 */
exports.getProducts = async (req, res) => {
  try {
    const [products] = await db.query("SELECT * FROM products");
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /products
 */
exports.addProduct = async (req, res) => {
  try {
    const { name, price, description, category, stock } = req.body;
    const image = req.file ? req.file.filename : null;

    const sql = `
      INSERT INTO products (name, price, description, category, image, stock)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      name,
      price,
      description,
      category,
      image,
      stock || 0
    ]);

    res.status(201).json({
      message: "Product added",
      productId: result.insertId
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /products/:id
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const image = req.file ? req.file.filename : null;

    let sql = `
      UPDATE products
      SET name=?, price=?, description=?, category=?, stock=?
      ${image ? ", image=?" : ""}
      WHERE id=?
    `;

    const values = [
      req.body.name,
      req.body.price,
      req.body.description,
      req.body.category,
      req.body.stock
    ];

    if (image) values.push(image);
    values.push(id);

    await db.query(sql, values);

    res.json({ message: "Product updated" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /products/:id
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    await db.query("DELETE FROM products WHERE id = ?", [id]);

    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
