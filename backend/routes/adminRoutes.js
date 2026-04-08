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
  getDealerNotifications,
  getServiceAreas,
  createServiceArea,
  updateServiceAreaStatus,
  deleteServiceArea
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
router.get("/service-areas", getServiceAreas);
router.post("/service-areas", createServiceArea);
router.put("/service-areas/:id/status", updateServiceAreaStatus);
router.delete("/service-areas/:id", deleteServiceArea);

module.exports = router;
