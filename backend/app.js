require("dotenv").config();
const cors = require("cors");
const express = require("express");
const adminRoutes = require("./routes/adminRoutes");
const dealerRoutes = require("./routes/dealerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const riderRoutes = require("./routes/riderRoutes");
const userRoutes = require("./routes/userRoutes");

const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL || "*"
    })
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      service: "cylendra-wala-backend",
      message: "Backend is live. Use the /api routes to access the application API.",
      health: "/api/health"
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "cylendra-wala-backend" });
  });

  app.use("/api/user", userRoutes);
  app.use("/api/order", orderRoutes);
  app.use("/api/rider", riderRoutes);
  app.use("/api/dealer", dealerRoutes);
  app.use("/api/admin", adminRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
};

module.exports = createApp;
