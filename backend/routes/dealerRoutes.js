const express = require("express");
const { loginDealer, getDealerOrders, getDealerNotifications } = require("../controllers/dealerController");
const { authorize, protect } = require("../middleware/auth");

const router = express.Router();

router.post("/login", loginDealer);
router.get("/orders", protect, authorize("dealer"), getDealerOrders);
router.get("/notifications", protect, authorize("dealer"), getDealerNotifications);

module.exports = router;
