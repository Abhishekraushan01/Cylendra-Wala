const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Dealer = require("../models/Dealer");
const Order = require("../models/Order");
const { isValidPhone, normalizePhone } = require("../utils/phone");

const generateToken = (dealer) =>
  jwt.sign({ id: dealer._id, role: dealer.role }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

const validatePhoneOrRespond = (res, phone) => {
  if (!isValidPhone(phone)) {
    res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    return false;
  }

  return true;
};

const loginDealer = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const { password } = req.body;

    if (!validatePhoneOrRespond(res, phone)) {
      return;
    }

    const dealer = await Dealer.findOne({ phone });
    if (!dealer || !(await bcrypt.compare(password, dealer.password))) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    if (!dealer.isActive) {
      return res.status(403).json({ message: "Dealer account is inactive" });
    }

    return res.json({
      token: generateToken(dealer),
      dealer: {
        id: dealer._id,
        dealerName: dealer.dealerName,
        agencyName: dealer.agencyName,
        phone: dealer.phone,
        role: dealer.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDealerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ dealerId: req.user._id })
      .populate("customerId", "name phone address")
      .populate("riderId", "name phone currentLocation")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDealerNotifications = async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.user._id)
      .populate("notifications.orderId", "orderId status amount paymentStatus")
      .populate("notifications.customerId", "name phone");

    return res.json(
      [...(dealer?.notifications || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  loginDealer,
  getDealerOrders,
  getDealerNotifications
};
