import axios from "axios";
import { getStoredToken } from "../utils/storage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const registerUser = (payload) => api.post("/user/register", payload);
export const loginUser = (payload) => api.post("/user/login", payload);
export const requestUserPasswordReset = (payload) => api.post("/user/forgot-password", payload);
export const resetUserPassword = (payload) => api.post("/user/reset-password", payload);
export const fetchProfile = () => api.get("/user/profile");
export const fetchDealers = () => api.get("/user/dealers");
export const fetchServiceAreas = () => api.get("/user/service-areas");
export const fetchPublicMetrics = () => api.get("/user/public-metrics");
export const createOrder = (payload) => api.post("/order/create", payload);
export const fetchUserOrders = (userId) => api.get(`/order/user/${userId}`);
export const createPaymentOrder = (orderId) => api.post("/order/payment/create", { orderId });
export const verifyPayment = (payload) => api.post("/order/payment/verify", payload);
export const demoPaymentSuccess = (orderId) => api.post("/order/payment/demo-success", { orderId });

export const riderLogin = (payload) => api.post("/rider/login", payload);
export const requestRiderPasswordReset = (payload) => api.post("/rider/forgot-password", payload);
export const resetRiderPassword = (payload) => api.post("/rider/reset-password", payload);
export const fetchRiderOrders = () => api.get("/rider/orders");
export const fetchRiderNotifications = () => api.get("/rider/notifications");
export const markRiderNotificationsRead = () => api.put("/rider/notifications/read");
export const acceptRiderOrder = (orderId) => api.put("/rider/accept", { orderId });
export const updateRiderOrderStatus = (orderId, status) => api.put("/order/status", { orderId, status });
export const verifyDeliveryOtp = (orderId, otp) => api.post("/order/verify-otp", { orderId, otp });

export const dealerLogin = (payload) => api.post("/dealer/login", payload);
export const fetchDealerOrders = () => api.get("/dealer/orders");
export const fetchDealerWorkspaceNotifications = () => api.get("/dealer/notifications");

export const fetchAdminOrders = () => api.get("/admin/orders");
export const fetchAdminRevenue = () => api.get("/admin/revenue");
export const fetchAdminRiders = () => api.get("/admin/riders");
export const createAdminRider = (payload) => api.post("/admin/riders", payload);
export const updateAdminRiderStatus = (riderId, isActive) => api.put(`/admin/riders/${riderId}/status`, { isActive });
export const deleteAdminRider = (riderId) => api.delete(`/admin/riders/${riderId}`);
export const fetchAdminDealers = () => api.get("/admin/dealers");
export const createAdminDealer = (payload) => api.post("/admin/dealers", payload);
export const updateAdminDealerStatus = (dealerId, isActive) => api.put(`/admin/dealers/${dealerId}/status`, { isActive });
export const deleteAdminDealer = (dealerId) => api.delete(`/admin/dealers/${dealerId}`);
export const fetchDealerNotifications = (dealerId) => api.get(`/admin/dealers/${dealerId}/notifications`);
export const fetchAdminServiceAreas = () => api.get("/admin/service-areas");
export const createAdminServiceArea = (payload) => api.post("/admin/service-areas", payload);
export const updateAdminServiceAreaStatus = (serviceAreaId, isActive) => api.put(`/admin/service-areas/${serviceAreaId}/status`, { isActive });
export const deleteAdminServiceArea = (serviceAreaId) => api.delete(`/admin/service-areas/${serviceAreaId}`);

export default api;
