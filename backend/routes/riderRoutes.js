const express = require("express");
const {
  loginRider,
  requestRiderPasswordReset,
  resetRiderPasswordWithOtp,
  getAvailableOrders,
  getRiderNotifications,
  markRiderNotificationsRead,
  acceptOrder,
  updateRiderLocation,
  updateRiderStatus
} = require("../controllers/riderController");
const { authorize, protect } = require("../middleware/auth");

const router = express.Router();

router.post("/login", loginRider);
router.post("/forgot-password", requestRiderPasswordReset);
router.post("/reset-password", resetRiderPasswordWithOtp);
router.get("/orders", protect, authorize("rider"), getAvailableOrders);
router.get("/notifications", protect, authorize("rider"), getRiderNotifications);
router.put("/notifications/read", protect, authorize("rider"), markRiderNotificationsRead);
router.put("/accept", protect, authorize("rider"), acceptOrder);
router.put("/location", protect, authorize("rider"), updateRiderLocation);
router.put("/status", protect, authorize("rider"), updateRiderStatus);

module.exports = router;
