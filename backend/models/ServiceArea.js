const mongoose = require("mongoose");

const serviceAreaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      default: "",
      trim: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    radiusKm: {
      type: Number,
      required: true,
      min: 0.5,
      default: 5
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceArea", serviceAreaSchema);
