const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Dealer = require("../models/Dealer");
const Order = require("../models/Order");
const Rider = require("../models/Rider");
const ServiceArea = require("../models/ServiceArea");
const User = require("../models/User");
const { sendResetOtpEmail } = require("../utils/email");
const { normalizeEmail, isValidEmail } = require("../utils/emailValidation");
const { generateOTP } = require("../utils/otp");
const { isValidPhone, normalizePhone } = require("../utils/phone");

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

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

const registerUser = async (req, res) => {
  try {
    const { name, password, address, latitude, longitude } = req.body;
    const phone = normalizePhone(req.body.phone);
    const email = normalizeEmail(req.body.email);

    if (!validatePhoneOrRespond(res, phone) || !validateEmailOrRespond(res, email)) {
      return;
    }

    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: existingUser.phone === phone ? "Phone already registered" : "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      address,
      latitude,
      longitude,
      role: "user"
    });

    return res.status(201).json({
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const { password } = req.body;

    if (!validatePhoneOrRespond(res, phone)) {
      return;
    }

    const user = await User.findOne({ phone });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    return res.json({
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!validateEmailOrRespond(res, email)) {
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found for this email address" });
    }

    const otp = generateOTP();
    user.passwordResetOtp = otp;
    user.passwordResetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailResult = await sendResetOtpEmail({
      to: email,
      name: user.name,
      otp
    });

    return res.json({
      message: emailResult.deliveryMode === "email" ? "OTP sent to your registered email." : "Email delivery is not configured yet. Demo OTP is shown below.",
      otp: emailResult.deliveryMode === "demo" ? otp : undefined,
      expiresAt: user.passwordResetOtpExpires,
      deliveryMode: emailResult.deliveryMode
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetPasswordWithOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").replace(/\D/g, "").slice(0, 6);
    const { newPassword } = req.body;

    if (!validateEmailOrRespond(res, email)) {
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be exactly 6 digits" });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found for this email address" });
    }

    if (!user.passwordResetOtp || user.passwordResetOtp !== otp || !user.passwordResetOtpExpires || user.passwordResetOtpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetOtp = null;
    user.passwordResetOtpExpires = null;
    await user.save();

    return res.json({ message: "Password reset successful. Please login with your new password." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => res.json(req.user);

const updateUserLocation = async (req, res) => {
  try {
    const { address, latitude, longitude } = req.body;

    req.user.address = address ?? req.user.address;
    req.user.latitude = latitude ?? req.user.latitude;
    req.user.longitude = longitude ?? req.user.longitude;
    await req.user.save();

    return res.json({ message: "Location updated", user: req.user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDealers = async (_req, res) => {
  try {
    const dealers = await Dealer.find({ isActive: true }).sort({ createdAt: -1 });
    return res.json(dealers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getServiceAreas = async (_req, res) => {
  try {
    const serviceAreas = await ServiceArea.find({ isActive: true }).sort({ city: 1, name: 1 });
    return res.json(serviceAreas);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPublicMetrics = async (_req, res) => {
  try {
    const [totalOrders, activeRiders, activeDealers, activeServiceAreas, paidOrders] = await Promise.all([
      Order.countDocuments({}),
      Rider.countDocuments({ isActive: true }),
      Dealer.countDocuments({ isActive: true }),
      ServiceArea.countDocuments({ isActive: true }),
      Order.find({ paymentStatus: "success" }).select("platformFee riderFee dealerAmount")
    ]);

    const revenue = paidOrders.reduce(
      (totals, order) => {
        totals.totalPlatformRevenue += order.platformFee;
        totals.totalRiderPayout += order.riderFee;
        totals.totalDealerRevenue += order.dealerAmount;
        return totals;
      },
      {
        totalPlatformRevenue: 0,
        totalRiderPayout: 0,
        totalDealerRevenue: 0
      }
    );

    return res.json({
      totalOrders,
      activeRiders,
      activeDealers,
      activeServiceAreas,
      ...revenue
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPasswordWithOtp,
  getUserProfile,
  updateUserLocation,
  getDealers,
  getServiceAreas,
  getPublicMetrics
};
