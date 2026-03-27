const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
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
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    passwordResetOtp: {
      type: String,
      default: null
    },
    passwordResetOtpExpires: {
      type: Date,
      default: null
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
