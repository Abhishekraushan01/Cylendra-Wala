const express = require("express");
const {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPasswordWithOtp,
  getUserProfile,
  updateUserLocation,
  getDealers,
  getServiceAreas,
  getPublicMetrics
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/dealers", getDealers);
router.get("/service-areas", getServiceAreas);
router.get("/public-metrics", getPublicMetrics);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPasswordWithOtp);
router.get("/profile", protect, getUserProfile);
router.post("/location", protect, updateUserLocation);

module.exports = router;
