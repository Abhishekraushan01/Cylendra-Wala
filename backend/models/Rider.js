const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"]
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
    bikeNumber: {
      type: String,
      required: true,
      trim: true
    },
    currentLocation: {
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
      }
    },
    availability: {
      type: Boolean,
      default: true
    },
    rating: {
      type: Number,
      default: 5
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    earnings: {
      type: Number,
      default: 0
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
    onboardingStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    role: {
      type: String,
      enum: ["rider"],
      default: "rider"
    },
    passwordResetOtp: {
      type: String,
      default: null
    },
    passwordResetOtpExpires: {
      type: Date,
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
        type: {
          type: String,
          default: "nearby_order"
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

module.exports = mongoose.model("Rider", riderSchema);
