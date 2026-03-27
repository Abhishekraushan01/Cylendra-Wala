require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const Dealer = require("./models/Dealer");
const Rider = require("./models/Rider");
const User = require("./models/User");

const seed = async () => {
  await connectDB();

  await Promise.all([
    Dealer.deleteMany({}),
    Rider.deleteMany({}),
    User.deleteMany({ phone: { $in: ["9999999999", "8888888888"] } })
  ]);

  const hashedPassword = await bcrypt.hash("123456", 10);

  const admin = await User.create({
    name: "Admin Demo",
    email: "admin@cylendrawala.demo",
    phone: "9999999999",
    password: hashedPassword,
    address: "Control Room, City Center",
    role: "admin"
  });

  const demoUser = await User.create({
    name: "Customer Demo",
    email: "customer@cylendrawala.demo",
    phone: "8888888888",
    password: hashedPassword,
    address: "221B Green Avenue, Kolkata",
    latitude: 22.5726,
    longitude: 88.3639,
    role: "user"
  });

  const dealers = await Dealer.insertMany([
    {
      dealerName: "Rakesh Gupta",
      agencyName: "Gupta Gas Agency",
      phone: "7000000001",
      password: hashedPassword,
      location: {
        address: "Park Street Depot, Kolkata",
        latitude: 22.5522,
        longitude: 88.3526
      },
      subscriptionPlan: "premium",
      commissionRate: 20
    },
    {
      dealerName: "Anita Sharma",
      agencyName: "Safe Flame LPG",
      phone: "7000000002",
      password: hashedPassword,
      location: {
        address: "Salt Lake Service Hub, Kolkata",
        latitude: 22.585,
        longitude: 88.417
      },
      subscriptionPlan: "growth",
      commissionRate: 22
    }
  ]);

  const riders = await Rider.insertMany([
    {
      name: "Rahul Rider",
      email: "rahul.rider@cylendrawala.demo",
      phone: "7000000011",
      password: hashedPassword,
      bikeNumber: "WB01AA1234",
      currentLocation: {
        latitude: 22.57,
        longitude: 88.36
      },
      availability: true,
      rating: 4.8
    },
    {
      name: "Imran Rider",
      email: "imran.rider@cylendrawala.demo",
      phone: "7000000012",
      password: hashedPassword,
      bikeNumber: "WB02BB5678",
      currentLocation: {
        latitude: 22.59,
        longitude: 88.4
      },
      availability: true,
      rating: 4.6
    }
  ]);

  console.log("Seed complete");
  console.log({
    admin: { phone: admin.phone, email: admin.email, password: "123456" },
    customer: { phone: demoUser.phone, email: demoUser.email, password: "123456" },
    dealers: dealers.map((dealer) => ({ phone: dealer.phone, agencyName: dealer.agencyName, password: "123456" })),
    riders: riders.map((rider) => ({ phone: rider.phone, email: rider.email, password: "123456" }))
  });

  process.exit(0);
};

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
