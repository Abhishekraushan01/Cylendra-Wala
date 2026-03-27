const express = require("express");
const {
  getAllOrders,
  getRevenue,
  getRiders,
  createRider,
  updateRiderAdminStatus,
  deleteRider,
  getDealers,
  createDealer,
  updateDealerStatus,
  deleteDealer,
  getDealerNotifications
} = require("../controllers/adminController");
const { authorize, protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("admin"));
router.get("/orders", getAllOrders);
router.get("/revenue", getRevenue);
router.get("/riders", getRiders);
router.post("/riders", createRider);
router.put("/riders/:id/status", updateRiderAdminStatus);
router.delete("/riders/:id", deleteRider);
router.get("/dealers", getDealers);
router.post("/dealers", createDealer);
router.put("/dealers/:id/status", updateDealerStatus);
router.delete("/dealers/:id", deleteDealer);
router.get("/dealers/:id/notifications", getDealerNotifications);

module.exports = router;
