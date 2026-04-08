const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      default: null
    },
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true
    },
    serviceAreaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceArea",
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "picked", "delivered", "cancelled"],
      default: "pending"
    },
    customerLocation: {
      address: {
        type: String,
        default: ""
      },
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    dealerLocation: {
      address: {
        type: String,
        default: ""
      },
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    amount: {
      type: Number,
      required: true
    },
    platformFee: {
      type: Number,
      default: 20
    },
    riderFee: {
      type: Number,
      default: 30
    },
    dealerAmount: {
      type: Number,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending"
    },
    razorpayOrderId: {
      type: String,
      default: null
    },
    razorpayPaymentId: {
      type: String,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    },
    otp: {
      type: String,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
