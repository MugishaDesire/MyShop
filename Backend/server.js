require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport"); // ✅ single import

const app = express();

app.use(cors());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());  // ✅ only once
app.use(passport.session());     // ✅ only once

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.use("/products", require("./routes/ProductRoutes"));
app.use("/orders",   require("./routes/OrderRoutes"));
app.use("/admin",    require("./routes/AdminRoutes"));
app.use("/user",     require("./routes/UserRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));