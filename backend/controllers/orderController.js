const Dealer = require("../models/Dealer");
const Order = require("../models/Order");
const Rider = require("../models/Rider");
const ServiceArea = require("../models/ServiceArea");
const User = require("../models/User");
const { generateOTP } = require("../utils/otp");
const {
  buildPaymentBreakdown,
  createPaymentSignature,
  createRazorpayOrderPayload,
  isRealRazorpayConfigured,
  verifyPaymentSignature
} = require("../utils/payment");

const createOrderId = () => `CW-${Date.now()}`;

const haversineKm = (origin, destination) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const startLatitude = toRadians(origin.latitude);
  const endLatitude = toRadians(destination.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const distanceBetween = haversineKm;

const extractId = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && value._id) {
    return String(value._id);
  }

  return String(value);
};

const canAccessOrder = (order, auth) => {
  return (
    auth.role === "admin" ||
    extractId(order.customerId) === String(auth.id) ||
    (auth.role === "dealer" && extractId(order.dealerId) === String(auth.id))
  );
};

const markOrderPaid = async (order, { razorpayOrderId, razorpayPaymentId }) => {
  order.paymentStatus = "success";
  order.razorpayOrderId = razorpayOrderId || order.razorpayOrderId;
  order.razorpayPaymentId = razorpayPaymentId || order.razorpayPaymentId;
  order.paidAt = new Date();
  await order.save();
  return order;
};

const findMatchingServiceArea = async (customerLocation) => {
  const activeAreas = await ServiceArea.find({ isActive: true }).sort({ radiusKm: 1, createdAt: 1 });

  return (
    activeAreas.find((serviceArea) => {
      const customerAreaDistance = haversineKm(
        { latitude: serviceArea.latitude, longitude: serviceArea.longitude },
        customerLocation
      );

      return customerAreaDistance <= serviceArea.radiusKm;
    }) || null
  );
};

const createOrder = async (req, res) => {
  try {
    const {
      dealerId,
      customerLocation,
      dealerLocation,
      amount = 950,
      platformFee = 20,
      riderFee = 30
    } = req.body;

    const dealer = await Dealer.findById(dealerId);
    if (!dealer || !dealer.isActive) {
      return res.status(404).json({ message: "Dealer not found or inactive" });
    }

    const serviceArea = await findMatchingServiceArea(customerLocation);
    if (!serviceArea) {
      return res.status(400).json({
        message: "Delivery for this location is not available yet. We will be there soon."
      });
    }

    const payment = buildPaymentBreakdown({ amount, platformFee, riderFee });
    const order = await Order.create({
      orderId: createOrderId(),
      customerId: req.user._id,
      dealerId,
      serviceAreaId: serviceArea._id,
      customerLocation,
      dealerLocation,
      amount: payment.amount,
      platformFee: payment.platformFee,
      riderFee: payment.riderFee,
      dealerAmount: payment.dealerAmount
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { orders: order._id } });
    await Dealer.findByIdAndUpdate(dealerId, {
      $inc: { totalOrders: 1 },
      $push: {
        notifications: {
          message: `New booking received from ${req.user.name} for order ${order.orderId}`,
          orderId: order._id,
          customerId: req.user._id,
          type: "order_booked",
          isRead: false
        }
      }
    });

    const riders = await Rider.find({
      availability: true,
      isActive: true,
      onboardingStatus: "active",
      "currentLocation.latitude": { $ne: null },
      "currentLocation.longitude": { $ne: null }
    });

    const nearbyRiders = riders
      .map((rider) => ({
        riderId: rider._id,
        name: rider.name,
        distance: distanceBetween(rider.currentLocation, customerLocation)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    if (nearbyRiders.length) {
      await Rider.updateMany(
        { _id: { $in: nearbyRiders.map((rider) => rider.riderId) } },
        {
          $push: {
            notifications: {
              message: `New nearby order ${order.orderId} is ready to accept`,
              orderId: order._id,
              type: "nearby_order",
              isRead: false
            }
          }
        }
      );
    }

    return res.status(201).json({
      message: "Order created",
      order,
      nearbyRiders,
      serviceArea: {
        id: serviceArea._id,
        name: serviceArea.name,
        city: serviceArea.city
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name phone address latitude longitude")
      .populate("riderId", "name phone bikeNumber currentLocation")
      .populate("dealerId", "dealerName agencyName phone location")
      .populate("serviceAreaId", "name city address latitude longitude radiusKm");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrder(order, req.auth)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getOrdersByUser = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.userid })
      .populate("dealerId", "dealerName agencyName location")
      .populate("riderId", "name currentLocation")
      .populate("serviceAreaId", "name city")
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createPaymentOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.body.orderId).populate("customerId", "name phone");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrder(order, req.auth)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (order.paymentStatus === "success") {
      return res.status(400).json({ message: "Order is already paid", order });
    }

    const razorpayOrder = createRazorpayOrderPayload({ order, customer: order.customerId });
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return res.json({
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_demo_key",
      demoMode: !isRealRazorpayConfigured(),
      razorpayOrder,
      order: {
        id: order._id,
        orderId: order.orderId,
        amount: order.amount,
        paymentStatus: order.paymentStatus
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrder(order, req.auth)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    })) {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    await markOrderPaid(order, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id
    });

    return res.json({ message: "Payment verified", order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const demoPaymentSuccess = async (req, res) => {
  try {
    const order = await Order.findById(req.body.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrder(order, req.auth)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const razorpayOrderId = order.razorpayOrderId || `order_demo_${Date.now()}`;
    const razorpayPaymentId = `pay_demo_${Date.now()}`;
    const razorpaySignature = createPaymentSignature({ razorpayOrderId, razorpayPaymentId });

    await markOrderPaid(order, { razorpayOrderId, razorpayPaymentId });

    return res.json({
      message: "Demo payment completed",
      order,
      payment: {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;

    if (status === "picked" && !order.otp) {
      order.otp = generateOTP();
    }

    if (status === "delivered") {
      order.deliveredAt = new Date();

      if (order.riderId) {
        await Rider.findByIdAndUpdate(order.riderId, {
          $inc: {
            totalDeliveries: 1,
            earnings: order.riderFee
          },
          $set: { availability: true }
        });
      }
    }

    await order.save();
    return res.json({ message: "Order status updated", order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const verifyOrderOtp = async (req, res) => {
  try {
    const { orderId, otp } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    order.status = "delivered";
    order.deliveredAt = new Date();
    await order.save();

    if (order.riderId) {
      await Rider.findByIdAndUpdate(order.riderId, {
        $inc: {
          totalDeliveries: 1,
          earnings: order.riderFee
        },
        $set: { availability: true }
      });
    }

    return res.json({ message: "OTP verified and delivery completed", order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByUser,
  createPaymentOrder,
  verifyPayment,
  demoPaymentSuccess,
  updateOrderStatus,
  verifyOrderOtp
};
