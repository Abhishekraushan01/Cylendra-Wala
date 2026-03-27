const crypto = require("crypto");

const buildPaymentBreakdown = ({ amount, platformFee = 20, riderFee = 30 }) => ({
  amount,
  platformFee,
  riderFee,
  dealerAmount: amount - platformFee - riderFee
});

const isRealRazorpayConfigured = () => {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_KEY_ID !== "your-key-id" &&
      process.env.RAZORPAY_KEY_SECRET !== "your-key-secret"
  );
};

const createRazorpayOrderPayload = ({ order, customer }) => ({
  id: `order_${crypto.randomBytes(8).toString("hex")}`,
  entity: "order",
  amount: order.amount * 100,
  amount_paid: 0,
  amount_due: order.amount * 100,
  currency: "INR",
  receipt: order.orderId,
  notes: {
    customerName: customer?.name || "Customer",
    customerPhone: customer?.phone || "",
    internalOrderId: String(order._id)
  }
});

const createPaymentSignature = ({ razorpayOrderId, razorpayPaymentId }) => {
  return crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "demo-secret")
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
};

const verifyPaymentSignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const expectedSignature = createPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId
  });

  return expectedSignature === razorpaySignature;
};

module.exports = {
  buildPaymentBreakdown,
  isRealRazorpayConfigured,
  createRazorpayOrderPayload,
  createPaymentSignature,
  verifyPaymentSignature
};
