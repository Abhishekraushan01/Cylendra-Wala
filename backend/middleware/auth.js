const jwt = require("jsonwebtoken");
const Dealer = require("../models/Dealer");
const Rider = require("../models/Rider");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user =
      decoded.role === "rider"
        ? await Rider.findById(decoded.id).select("-password")
        : decoded.role === "dealer"
          ? await Dealer.findById(decoded.id).select("-password")
          : await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.auth = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};

module.exports = { protect, authorize };
