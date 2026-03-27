const express = require("express");
const {
  createOrder,
  getOrderById,
  getOrdersByUser,
  createPaymentOrder,
  verifyPayment,
  demoPaymentSuccess,
  updateOrderStatus,
  verifyOrderOtp
} = require("../controllers/orderController");
const { authorize, protect } = require("../middleware/auth");

const router = express.Router();

router.post("/create", protect, authorize("user", "admin"), createOrder);
router.post("/payment/create", protect, authorize("user", "admin"), createPaymentOrder);
router.post("/payment/verify", protect, authorize("user", "admin"), verifyPayment);
router.post("/payment/demo-success", protect, authorize("user", "admin"), demoPaymentSuccess);
router.get("/user/:userid", protect, getOrdersByUser);
router.get("/:id", protect, getOrderById);
router.put("/status", protect, authorize("admin", "rider"), updateOrderStatus);
router.post("/verify-otp", protect, authorize("rider", "admin"), verifyOrderOtp);

module.exports = router;
