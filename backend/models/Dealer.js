const mongoose = require("mongoose");

const dealerSchema = new mongoose.Schema(
  {
    dealerName: {
      type: String,
      required: true,
      trim: true
    },
    agencyName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"]
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["dealer"],
      default: "dealer"
    },
    location: {
      address: {
        type: String,
        default: ""
      },
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
      }
    },
    subscriptionPlan: {
      type: String,
      default: "basic"
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    commissionRate: {
      type: Number,
      default: 20
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    notifications: [
      {
        message: {
          type: String,
          required: true
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
          default: null
        },
        customerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null
        },
        type: {
          type: String,
          default: "order_booked"
        },
        isRead: {
          type: Boolean,
          default: false
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dealer", dealerSchema);
