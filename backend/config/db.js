const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connectionString = process.env.MONGODB_URI || process.env.MONGODB_URL;

    if (!connectionString) {
      throw new Error("Missing MONGODB_URI or MONGODB_URL in environment variables");
    }

    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    await mongoose.connect(connectionString);
    console.log("MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    if (process.env.NODE_ENV === "test") {
      throw error;
    }

    process.exit(1);
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
