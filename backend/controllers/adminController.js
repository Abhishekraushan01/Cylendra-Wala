const bcrypt = require("bcryptjs");
const Dealer = require("../models/Dealer");
const Order = require("../models/Order");
const Rider = require("../models/Rider");
const ServiceArea = require("../models/ServiceArea");
const { normalizeEmail, isValidEmail } = require("../utils/emailValidation");
const { isValidPhone, normalizePhone } = require("../utils/phone");

const validatePhoneOrRespond = (res, phone) => {
  if (!isValidPhone(phone)) {
    res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    return false;
  }

  return true;
};

const validateEmailOrRespond = (res, email) => {
  if (!isValidEmail(email)) {
    res.status(400).json({ message: "Enter a valid email address" });
    return false;
  }

  return true;
};

const getAllOrders = async (_req, res) => {
  try {
    const orders = await Order.find({})
      .populate("customerId", "name phone")
      .populate("riderId", "name phone email")
      .populate("dealerId", "dealerName agencyName phone")
      .populate("serviceAreaId", "name city")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getRevenue = async (_req, res) => {
  try {
    const deliveredOrders = await Order.find({ paymentStatus: "success" });
    const revenue = deliveredOrders.reduce(
      (accumulator, order) => {
        accumulator.totalOrders += 1;
        accumulator.totalPlatformRevenue += order.platformFee;
        accumulator.totalRiderPayout += order.riderFee;
        accumulator.totalDealerRevenue += order.dealerAmount;
        return accumulator;
      },
      {
        totalOrders: 0,
        totalPlatformRevenue: 0,
        totalRiderPayout: 0,
        totalDealerRevenue: 0
      }
    );

    return res.json(revenue);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getRiders = async (_req, res) => {
  try {
    const riders = await Rider.find({}).select("-password");
    return res.json(riders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createRider = async (req, res) => {
  try {
    const { name, password, bikeNumber, latitude, longitude } = req.body;
    const phone = normalizePhone(req.body.phone);
    const email = normalizeEmail(req.body.email);

    if (!validatePhoneOrRespond(res, phone) || !validateEmailOrRespond(res, email)) {
      return;
    }

    const existing = await Rider.findOne({ $or: [{ phone }, { email }] });
    if (existing) {
      return res.status(400).json({ message: existing.phone === phone ? "Rider phone already exists" : "Rider email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rider = await Rider.create({
      name,
      email,
      phone,
      password: hashedPassword,
      bikeNumber,
      currentLocation: {
        latitude: latitude ?? null,
        longitude: longitude ?? null
      },
      createdByAdmin: req.user._id,
      onboardingStatus: "active",
      isActive: true
    });

    return res.status(201).json({
      message: "Rider created successfully",
      rider: await Rider.findById(rider._id).select("-password")
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateRiderAdminStatus = async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    const isActive = Boolean(req.body.isActive);
    rider.isActive = isActive;
    rider.onboardingStatus = isActive ? "active" : "inactive";
    rider.availability = isActive ? rider.availability : false;
    await rider.save();

    return res.json({
      message: `Rider ${isActive ? "enabled" : "disabled"} successfully`,
      rider: await Rider.findById(rider._id).select("-password")
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteRider = async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    const linkedOrder = await Order.findOne({ riderId: rider._id });
    if (linkedOrder) {
      return res.status(400).json({ message: "Cannot delete rider with linked orders. Disable instead." });
    }

    await Rider.findByIdAndDelete(rider._id);
    return res.json({ message: "Rider deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDealers = async (_req, res) => {
  try {
    const dealers = await Dealer.find({}).select("-password");
    return res.json(dealers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createDealer = async (req, res) => {
  try {
    const {
      dealerName,
      agencyName,
      address,
      latitude,
      longitude,
      subscriptionPlan,
      commissionRate,
      password
    } = req.body;
    const phone = normalizePhone(req.body.phone);

    if (!validatePhoneOrRespond(res, phone)) {
      return;
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Dealer password must be at least 6 characters" });
    }

    const existing = await Dealer.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: "Dealer phone already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dealer = await Dealer.create({
      dealerName,
      agencyName,
      phone,
      password: hashedPassword,
      location: {
        address,
        latitude: latitude ?? null,
        longitude: longitude ?? null
      },
      subscriptionPlan: subscriptionPlan || "basic",
      commissionRate: commissionRate ?? 20,
      createdByAdmin: req.user._id,
      isActive: true
    });

    return res.status(201).json({
      message: "Dealer created successfully",
      dealer: await Dealer.findById(dealer._id).select("-password")
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateDealerStatus = async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    dealer.isActive = Boolean(req.body.isActive);
    await dealer.save();

    return res.json({
      message: `Dealer ${dealer.isActive ? "enabled" : "disabled"} successfully`,
      dealer: await Dealer.findById(dealer._id).select("-password")
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteDealer = async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const linkedOrder = await Order.findOne({ dealerId: dealer._id });
    if (linkedOrder) {
      return res.status(400).json({ message: "Cannot delete dealer with linked orders. Disable instead." });
    }

    await Dealer.findByIdAndDelete(dealer._id);
    return res.json({ message: "Dealer deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDealerNotifications = async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id)
      .populate("notifications.orderId", "orderId status amount paymentStatus")
      .populate("notifications.customerId", "name phone");

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    return res.json({
      dealerId: dealer._id,
      agencyName: dealer.agencyName,
      notifications: dealer.notifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getServiceAreas = async (_req, res) => {
  try {
    const serviceAreas = await ServiceArea.find({}).sort({ city: 1, name: 1 });
    return res.json(serviceAreas);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createServiceArea = async (req, res) => {
  try {
    const { name, city, address, latitude, longitude, radiusKm } = req.body;

    if (!name || !city) {
      return res.status(400).json({ message: "Area name and city are required" });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const parsedRadius = Number(radiusKm);

    if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
      return res.status(400).json({ message: "Area latitude and longitude are required" });
    }

    if (Number.isNaN(parsedRadius) || parsedRadius < 0.5) {
      return res.status(400).json({ message: "Radius must be at least 0.5 km" });
    }

    const serviceArea = await ServiceArea.create({
      name,
      city,
      address,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      radiusKm: parsedRadius,
      isActive: true,
      createdByAdmin: req.user._id
    });

    return res.status(201).json({
      message: "Serviceable area created successfully",
      serviceArea
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateServiceAreaStatus = async (req, res) => {
  try {
    const serviceArea = await ServiceArea.findById(req.params.id);
    if (!serviceArea) {
      return res.status(404).json({ message: "Serviceable area not found" });
    }

    serviceArea.isActive = Boolean(req.body.isActive);
    await serviceArea.save();

    return res.json({
      message: `Serviceable area ${serviceArea.isActive ? "enabled" : "disabled"} successfully`,
      serviceArea
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteServiceArea = async (req, res) => {
  try {
    const serviceArea = await ServiceArea.findById(req.params.id);
    if (!serviceArea) {
      return res.status(404).json({ message: "Serviceable area not found" });
    }

    const linkedOrder = await Order.findOne({ serviceAreaId: serviceArea._id });
    if (linkedOrder) {
      return res.status(400).json({ message: "Cannot delete a serviceable area with linked orders. Disable instead." });
    }

    await ServiceArea.findByIdAndDelete(serviceArea._id);
    return res.json({ message: "Serviceable area deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
