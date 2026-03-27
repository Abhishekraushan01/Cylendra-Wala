const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Rider = require("../models/Rider");
const { sendResetOtpEmail } = require("../utils/email");
const { normalizeEmail, isValidEmail } = require("../utils/emailValidation");
const { generateOTP } = require("../utils/otp");
const { isValidPhone, normalizePhone } = require("../utils/phone");

const generateToken = (rider) =>
  jwt.sign({ id: rider._id, role: rider.role }, process.env.JWT_SECRET, {
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

const loginRider = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const { password } = req.body;

    if (!validatePhoneOrRespond(res, phone)) {
      return;
    }

    const rider = await Rider.findOne({ phone });

    if (!rider || !(await bcrypt.compare(password, rider.password))) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    if (!rider.isActive || rider.onboardingStatus !== "active") {
      return res.status(403).json({ message: "Rider account is inactive" });
    }

    return res.json({
      token: generateToken(rider),
      rider: {
        id: rider._id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const requestRiderPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!validateEmailOrRespond(res, email)) {
      return;
    }

    const rider = await Rider.findOne({ email });
    if (!rider) {
      return res.status(404).json({ message: "No rider account found for this email address" });
    }

    const otp = generateOTP();
    rider.passwordResetOtp = otp;
    rider.passwordResetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await rider.save();

    const emailResult = await sendResetOtpEmail({ to: email, name: rider.name, otp });

    return res.json({
      message: emailResult.deliveryMode === "email" ? "OTP sent to your registered email." : "Email delivery is not configured yet. Demo OTP is shown below.",
      otp: emailResult.deliveryMode === "demo" ? otp : undefined,
      expiresAt: rider.passwordResetOtpExpires,
      deliveryMode: emailResult.deliveryMode
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetRiderPasswordWithOtp = async (req, res) => {
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

    const rider = await Rider.findOne({ email });
    if (!rider) {
      return res.status(404).json({ message: "No rider account found for this email address" });
    }

    if (!rider.passwordResetOtp || rider.passwordResetOtp !== otp || !rider.passwordResetOtpExpires || rider.passwordResetOtpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    rider.password = await bcrypt.hash(newPassword, 10);
    rider.passwordResetOtp = null;
    rider.passwordResetOtpExpires = null;
    await rider.save();

    return res.json({ message: "Password reset successful. Please login with your new password." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { status: "pending" },
        {
          riderId: new mongoose.Types.ObjectId(req.user._id),
          status: { $in: ["accepted", "picked"] }
        }
      ]
    })
      .populate("customerId", "name phone address latitude longitude")
      .populate("dealerId", "dealerName agencyName location isActive")
      .populate("riderId", "name currentLocation")
      .sort({ createdAt: -1 });

    return res.json(orders.filter((order) => order.status !== "pending" || order.dealerId?.isActive !== false));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getRiderNotifications = async (req, res) => {
  try {
    const rider = await Rider.findById(req.user._id).populate("notifications.orderId", "orderId status amount customerLocation dealerLocation");
    return res.json(
      [...(rider?.notifications || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markRiderNotificationsRead = async (req, res) => {
  try {
    req.user.notifications = (req.user.notifications || []).map((notification) => ({
      ...notification.toObject(),
      isRead: true
    }));
    await req.user.save();
    return res.json({ message: "Notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const rider = req.user;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!rider.isActive || rider.onboardingStatus !== "active") {
      return res.status(403).json({ message: "Rider account is inactive" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order is no longer available" });
    }

    order.status = "accepted";
    order.riderId = rider._id;
    await order.save();

    rider.availability = false;
    rider.notifications = (rider.notifications || []).map((notification) => {
      const next = notification.toObject ? notification.toObject() : notification;
      if (String(next.orderId) === String(order._id)) {
        return { ...next, isRead: true };
      }
      return next;
    });
    await rider.save();

    return res.json({ message: "Order accepted", order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateRiderLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    req.user.currentLocation = { latitude, longitude };
    await req.user.save();

    return res.json({ message: "Rider location updated", rider: req.user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateRiderStatus = async (req, res) => {
  try {
    req.user.availability = req.body.availability;
    await req.user.save();

    return res.json({ message: "Availability updated", rider: req.user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  loginRider,
  requestRiderPasswordReset,
  resetRiderPasswordWithOtp,
  getAvailableOrders,
  getRiderNotifications,
  markRiderNotificationsRead,
  acceptOrder,
  updateRiderLocation,
  updateRiderStatus
};
