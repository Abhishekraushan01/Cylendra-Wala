process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cylendra-wala-tests";
process.env.MONGODB_URL = process.env.MONGODB_URI;
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "your-key-id";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "your-key-secret";
process.env.SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
process.env.SMTP_PORT = process.env.SMTP_PORT || "587";
process.env.SMTP_USER = "your-gmail-address@gmail.com";
process.env.SMTP_PASS = "your-gmail-app-password";
process.env.SMTP_FROM = "Cylendra Wala <your-gmail-address@gmail.com>";

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const createApp = require("../app");
const connectDB = require("../config/db");
const { disconnectDB } = require("../config/db");
const Dealer = require("../models/Dealer");
const Order = require("../models/Order");
const Rider = require("../models/Rider");
const ServiceArea = require("../models/ServiceArea");
const User = require("../models/User");

const app = createApp();
let server;
let baseUrl;
let customerToken;
let adminToken;
let riderToken;
let dealerToken;
let dealer;
let rider;
let serviceArea;
let createdOrder;

const cleanupPhones = [
  "9100000001",
  "9100000002",
  "9100000003",
  "9100000004",
  "9100000090",
  "9100000091"
];

const cleanupEmails = [
  "customer@test.demo",
  "admin@test.demo",
  "rider@test.demo",
  "deleterider@test.demo"
];

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = null;
  const text = await response.text();
  if (text) {
    data = JSON.parse(text);
  }

  return { status: response.status, data };
};

test.before(async () => {
  await connectDB();
  await Promise.all([
    Order.deleteMany({}),
    Dealer.deleteMany({}),
    Rider.deleteMany({}),
    ServiceArea.deleteMany({}),
    User.deleteMany({
      $or: [
        { phone: { $in: cleanupPhones } },
        { email: { $in: cleanupEmails } }
      ]
    })
  ]);

  const password = await bcrypt.hash("123456", 10);

  await User.create({
    name: "Test Customer",
    email: "customer@test.demo",
    phone: "9100000001",
    password,
    address: "Test Address, Kolkata",
    latitude: 22.5726,
    longitude: 88.3639,
    role: "user"
  });

  await User.create({
    name: "Test Admin",
    email: "admin@test.demo",
    phone: "9100000002",
    password,
    address: "HQ",
    role: "admin"
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }

  await Promise.all([
    Order.deleteMany({}),
    Dealer.deleteMany({}),
    Rider.deleteMany({}),
    ServiceArea.deleteMany({}),
    User.deleteMany({
      $or: [
        { phone: { $in: cleanupPhones } },
        { email: { $in: cleanupEmails } }
      ]
    })
  ]);
  await disconnectDB();
});

test("auth endpoints log in seeded customer and admin", async () => {
  const customerLogin = await requestJson("/api/user/login", {
    method: "POST",
    body: { phone: "9100000001", password: "123456" }
  });
  assert.equal(customerLogin.status, 200);
  customerToken = customerLogin.data.token;

  const adminLogin = await requestJson("/api/user/login", {
    method: "POST",
    body: { phone: "9100000002", password: "123456" }
  });
  assert.equal(adminLogin.status, 200);
  adminToken = adminLogin.data.token;
});

test("phone validation rejects non-10-digit customer registration", async () => {
  const invalidRegister = await requestJson("/api/user/register", {
    method: "POST",
    body: {
      name: "Bad Phone",
      email: "badphone@test.demo",
      phone: "12345",
      password: "123456",
      address: "Bad Address"
    }
  });

  assert.equal(invalidRegister.status, 400);
  assert.equal(invalidRegister.data.message, "Phone number must be exactly 10 digits");
});

test("user forgot password flow resets password using email OTP", async () => {
  const requestOtp = await requestJson("/api/user/forgot-password", {
    method: "POST",
    body: { email: "customer@test.demo" }
  });

  assert.equal(requestOtp.status, 200);
  assert.match(requestOtp.data.otp, /^\d{6}$/);

  const resetPassword = await requestJson("/api/user/reset-password", {
    method: "POST",
    body: {
      email: "customer@test.demo",
      otp: requestOtp.data.otp,
      newPassword: "654321"
    }
  });

  assert.equal(resetPassword.status, 200);

  const loginWithNewPassword = await requestJson("/api/user/login", {
    method: "POST",
    body: { phone: "9100000001", password: "654321" }
  });
  assert.equal(loginWithNewPassword.status, 200);
  customerToken = loginWithNewPassword.data.token;
});

test("admin can launch a serviceable area", async () => {
  const createAreaResponse = await requestJson("/api/admin/service-areas", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Central Kolkata",
      city: "Kolkata",
      address: "Park Street",
      latitude: 22.5726,
      longitude: 88.3639,
      radiusKm: 8
    }
  });

  assert.equal(createAreaResponse.status, 201);
  serviceArea = createAreaResponse.data.serviceArea;

  const publicAreasResponse = await requestJson("/api/user/service-areas");
  assert.equal(publicAreasResponse.status, 200);
  assert.ok(publicAreasResponse.data.some((area) => area._id === serviceArea._id));
});

test("admin can onboard dealer and rider with valid contact info", async () => {
  const dealerResponse = await requestJson("/api/admin/dealers", {
    method: "POST",
    token: adminToken,
    body: {
      dealerName: "Dealer Test",
      agencyName: "Dealer Test Agency",
      phone: "9100000090",
      password: "123456",
      address: "Dealer Hub, Kolkata",
      latitude: 22.5522,
      longitude: 88.3526,
      subscriptionPlan: "premium",
      commissionRate: 20
    }
  });

  assert.equal(dealerResponse.status, 201);
  dealer = dealerResponse.data.dealer;
  assert.equal(dealer.isActive, true);

  const dealerLoginResponse = await requestJson("/api/dealer/login", {
    method: "POST",
    body: { phone: "9100000090", password: "123456" }
  });
  assert.equal(dealerLoginResponse.status, 200);
  dealerToken = dealerLoginResponse.data.token;

  const riderResponse = await requestJson("/api/admin/riders", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Test Rider",
      email: "rider@test.demo",
      phone: "9100000003",
      password: "123456",
      bikeNumber: "WB10TEST1",
      latitude: 22.57,
      longitude: 88.36
    }
  });

  assert.equal(riderResponse.status, 201);
  rider = riderResponse.data.rider;
  assert.equal(rider.onboardingStatus, "active");

  const riderLoginResponse = await requestJson("/api/rider/login", {
    method: "POST",
    body: { phone: "9100000003", password: "123456" }
  });
  assert.equal(riderLoginResponse.status, 200);
  riderToken = riderLoginResponse.data.token;
});

test("rider forgot password flow resets password using email OTP", async () => {
  const requestOtp = await requestJson("/api/rider/forgot-password", {
    method: "POST",
    body: { email: "rider@test.demo" }
  });

  assert.equal(requestOtp.status, 200);
  assert.match(requestOtp.data.otp, /^\d{6}$/);

  const resetPassword = await requestJson("/api/rider/reset-password", {
    method: "POST",
    body: {
      email: "rider@test.demo",
      otp: requestOtp.data.otp,
      newPassword: "654321"
    }
  });

  assert.equal(resetPassword.status, 200);

  const riderLoginWithNewPassword = await requestJson("/api/rider/login", {
    method: "POST",
    body: { phone: "9100000003", password: "654321" }
  });
  assert.equal(riderLoginWithNewPassword.status, 200);
  riderToken = riderLoginWithNewPassword.data.token;
});

test("admin rider creation rejects invalid email", async () => {
  const invalidRider = await requestJson("/api/admin/riders", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Invalid Rider",
      email: "wrong-email",
      phone: "1234567890",
      password: "123456",
      bikeNumber: "WB10BAD1",
      latitude: 22.58,
      longitude: 88.37
    }
  });
  assert.equal(invalidRider.status, 400);
  assert.equal(invalidRider.data.message, "Enter a valid email address");
});

test("customer can fetch dealers and create an order inside the launched service area", async () => {
  const dealersResponse = await requestJson("/api/user/dealers");
  assert.equal(dealersResponse.status, 200);
  assert.ok(dealersResponse.data.some((item) => item._id === dealer._id));

  const createOrderResponse = await requestJson("/api/order/create", {
    method: "POST",
    token: customerToken,
    body: {
      dealerId: dealer._id,
      customerLocation: {
        address: "Test Address, Kolkata",
        latitude: 22.5726,
        longitude: 88.3639
      },
      dealerLocation: dealer.location,
      amount: 950,
      platformFee: 20,
      riderFee: 30
    }
  });

  assert.equal(createOrderResponse.status, 201);
  createdOrder = createOrderResponse.data.order;

  const outOfAreaOrderResponse = await requestJson("/api/order/create", {
    method: "POST",
    token: customerToken,
    body: {
      dealerId: dealer._id,
      customerLocation: {
        address: "Far Away",
        latitude: 23.2,
        longitude: 87.9
      },
      dealerLocation: dealer.location,
      amount: 950,
      platformFee: 20,
      riderFee: 30
    }
  });
  assert.equal(outOfAreaOrderResponse.status, 400);
  assert.equal(
    outOfAreaOrderResponse.data.message,
    "Delivery for this location is not available yet. We will be there soon."
  );

  const notificationsResponse = await requestJson(`/api/admin/dealers/${dealer._id}/notifications`, {
    token: adminToken
  });
  assert.equal(notificationsResponse.status, 200);
  assert.equal(notificationsResponse.data.notifications.length, 1);

  const riderNotificationsResponse = await requestJson("/api/rider/notifications", {
    token: riderToken
  });
  assert.equal(riderNotificationsResponse.status, 200);
  assert.ok(riderNotificationsResponse.data.some((notification) => notification.orderId?._id === createdOrder._id));
});

test("dealer can log in and see booked orders routed to the agency", async () => {
  const dealerOrdersResponse = await requestJson("/api/dealer/orders", {
    token: dealerToken
  });
  assert.equal(dealerOrdersResponse.status, 200);
  assert.ok(dealerOrdersResponse.data.some((order) => order._id === createdOrder._id));

  const dealerNotificationsResponse = await requestJson("/api/dealer/notifications", {
    token: dealerToken
  });
  assert.equal(dealerNotificationsResponse.status, 200);
  assert.ok(dealerNotificationsResponse.data.some((notification) => notification.orderId?.orderId === createdOrder.orderId));
});

test("admin can disable and re-enable dealer rider and service area", async () => {
  const disableDealer = await requestJson(`/api/admin/dealers/${dealer._id}/status`, {
    method: "PUT",
    token: adminToken,
    body: { isActive: false }
  });
  assert.equal(disableDealer.status, 200);

  const disableRider = await requestJson(`/api/admin/riders/${rider._id}/status`, {
    method: "PUT",
    token: adminToken,
    body: { isActive: false }
  });
  assert.equal(disableRider.status, 200);

  const disableArea = await requestJson(`/api/admin/service-areas/${serviceArea._id}/status`, {
    method: "PUT",
    token: adminToken,
    body: { isActive: false }
  });
  assert.equal(disableArea.status, 200);

  const publicAreasAfterDisable = await requestJson("/api/user/service-areas");
  assert.equal(publicAreasAfterDisable.status, 200);
  assert.equal(publicAreasAfterDisable.data.some((area) => area._id === serviceArea._id), false);

  const riderLoginBlocked = await requestJson("/api/rider/login", {
    method: "POST",
    body: { phone: "9100000003", password: "654321" }
  });
  assert.equal(riderLoginBlocked.status, 403);

  const enableDealer = await requestJson(`/api/admin/dealers/${dealer._id}/status`, {
    method: "PUT",
    token: adminToken,
    body: { isActive: true }
  });
  assert.equal(enableDealer.status, 200);

  const enableRider = await requestJson(`/api/admin/riders/${rider._id}/status`, {
    method: "PUT",
    token: adminToken,
    body: { isActive: true }
  });
  assert.equal(enableRider.status, 200);

  const enableArea = await requestJson(`/api/admin/service-areas/${serviceArea._id}/status`, {
    method: "PUT",
    token: adminToken,
    body: { isActive: true }
  });
  assert.equal(enableArea.status, 200);
});

test("customer payment flow creates a payment order and completes demo payment", async () => {
  const paymentCreateResponse = await requestJson("/api/order/payment/create", {
    method: "POST",
    token: customerToken,
    body: { orderId: createdOrder._id }
  });

  assert.equal(paymentCreateResponse.status, 200);
  assert.ok(paymentCreateResponse.data.razorpayOrder.id);

  const demoPaymentResponse = await requestJson("/api/order/payment/demo-success", {
    method: "POST",
    token: customerToken,
    body: { orderId: createdOrder._id }
  });

  assert.equal(demoPaymentResponse.status, 200);
  assert.equal(demoPaymentResponse.data.order.paymentStatus, "success");
});

test("rider can accept order mark picked and complete OTP delivery", async () => {
  const riderLoginAgain = await requestJson("/api/rider/login", {
    method: "POST",
    body: { phone: "9100000003", password: "654321" }
  });
  assert.equal(riderLoginAgain.status, 200);
  riderToken = riderLoginAgain.data.token;

  const riderOrdersResponse = await requestJson("/api/rider/orders", {
    token: riderToken
  });

  assert.equal(riderOrdersResponse.status, 200);
  const pendingOrder = riderOrdersResponse.data.find((order) => order._id === createdOrder._id);
  assert.ok(pendingOrder);

  const acceptResponse = await requestJson("/api/rider/accept", {
    method: "PUT",
    token: riderToken,
    body: { orderId: createdOrder._id }
  });
  assert.equal(acceptResponse.status, 200);

  const pickedResponse = await requestJson("/api/order/status", {
    method: "PUT",
    token: riderToken,
    body: { orderId: createdOrder._id, status: "picked" }
  });
  assert.equal(pickedResponse.status, 200);
  assert.ok(pickedResponse.data.order.otp);

  const verifyOtpResponse = await requestJson("/api/order/verify-otp", {
    method: "POST",
    token: riderToken,
    body: { orderId: createdOrder._id, otp: pickedResponse.data.order.otp }
  });
  assert.equal(verifyOtpResponse.status, 200);
  assert.equal(verifyOtpResponse.data.order.status, "delivered");
});

test("linked rider dealer and service area cannot be deleted but unlinked ones can", async () => {
  const deleteLinkedDealer = await requestJson(`/api/admin/dealers/${dealer._id}`, {
    method: "DELETE",
    token: adminToken
  });
  assert.equal(deleteLinkedDealer.status, 400);

  const deleteLinkedRider = await requestJson(`/api/admin/riders/${rider._id}`, {
    method: "DELETE",
    token: adminToken
  });
  assert.equal(deleteLinkedRider.status, 400);

  const deleteLinkedArea = await requestJson(`/api/admin/service-areas/${serviceArea._id}`, {
    method: "DELETE",
    token: adminToken
  });
  assert.equal(deleteLinkedArea.status, 400);

  const extraAreaResponse = await requestJson("/api/admin/service-areas", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Unused Zone",
      city: "Kolkata",
      address: "Unused",
      latitude: 22.61,
      longitude: 88.41,
      radiusKm: 3
    }
  });
  assert.equal(extraAreaResponse.status, 201);

  const extraDealerResponse = await requestJson("/api/admin/dealers", {
    method: "POST",
    token: adminToken,
    body: {
      dealerName: "Delete Dealer",
      agencyName: "Delete Dealer Agency",
      phone: "9100000091",
      password: "123456",
      address: "Delete Dealer Address",
      latitude: 22.55,
      longitude: 88.35,
      subscriptionPlan: "basic",
      commissionRate: 20
    }
  });
  assert.equal(extraDealerResponse.status, 201);

  const extraRiderResponse = await requestJson("/api/admin/riders", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Delete Rider",
      email: "deleterider@test.demo",
      phone: "9100000004",
      password: "123456",
      bikeNumber: "WB10DEL1",
      latitude: 22.58,
      longitude: 88.37
    }
  });
  assert.equal(extraRiderResponse.status, 201);

  const deleteArea = await requestJson(`/api/admin/service-areas/${extraAreaResponse.data.serviceArea._id}`, {
    method: "DELETE",
    token: adminToken
  });
  assert.equal(deleteArea.status, 200);

  const deleteDealer = await requestJson(`/api/admin/dealers/${extraDealerResponse.data.dealer._id}`, {
    method: "DELETE",
    token: adminToken
  });
  assert.equal(deleteDealer.status, 200);

  const deleteRider = await requestJson(`/api/admin/riders/${extraRiderResponse.data.rider._id}`, {
    method: "DELETE",
    token: adminToken
  });
  assert.equal(deleteRider.status, 200);
});

test("admin revenue reflects delivered paid order", async () => {
  const revenueResponse = await requestJson("/api/admin/revenue", {
    token: adminToken
  });

  assert.equal(revenueResponse.status, 200);
  assert.deepEqual(revenueResponse.data, {
    totalOrders: 1,
    totalPlatformRevenue: 20,
    totalRiderPayout: 30,
    totalDealerRevenue: 900
  });
});

