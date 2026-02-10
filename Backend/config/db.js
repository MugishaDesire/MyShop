const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "localhost",
  user: "root",          // change if needed
  password: "password",          // your MySQL password
  database: "ecommerce",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db;
