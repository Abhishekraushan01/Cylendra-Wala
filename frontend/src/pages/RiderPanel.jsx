import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../components/MapView";
import {
  acceptRiderOrder,
  fetchRiderNotifications,
  fetchRiderOrders,
  markRiderNotificationsRead,
  requestRiderPasswordReset,
  resetRiderPassword,
  riderLogin,
  updateRiderOrderStatus,
  verifyDeliveryOtp
} from "../services/api";
import { sanitizeOtp, sanitizePhone } from "../utils/form";
import { getStoredRole, getStoredToken, setStoredRole, setStoredToken } from "../utils/storage";

function RiderPanel() {
  const navigate = useNavigate();
  const isLoggedInRider = Boolean(getStoredToken()) && getStoredRole() === "rider";
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [otpByOrder, setOtpByOrder] = useState({});
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetForm, setResetForm] = useState({ email: "", otp: "", newPassword: "" });
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const loadWorkspace = async () => {
    try {
      const [ordersResponse, notificationsResponse] = await Promise.all([
        fetchRiderOrders(),
        fetchRiderNotifications()
      ]);
      setOrders(ordersResponse.data);
      setNotifications(notificationsResponse.data);
      setSelectedOrderId((current) => current || ordersResponse.data[0]?._id || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load rider workspace");
    }
  };

  useEffect(() => {
    if (!isLoggedInRider) {
      return;
    }

    loadWorkspace();
    const intervalId = window.setInterval(loadWorkspace, 8000);

    return () => window.clearInterval(intervalId);
  }, [isLoggedInRider]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { data } = await riderLogin(loginForm);
      setStoredToken(data.token);
      setStoredRole("rider");
      setMessage(`Logged in as ${data.rider.name}`);
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Rider login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setResetError("");
    setResetMessage("");
    setDemoOtp("");

    try {
      const { data } = await requestRiderPasswordReset({ email: resetForm.email });
      setDemoOtp(data.otp || "");
      setResetMessage(
        data.deliveryMode === "demo"
          ? `Email delivery is in demo mode. Use OTP ${data.otp} to continue.`
          : "OTP sent to your registered email."
      );
    } catch (requestError) {
      setResetError(requestError.response?.data?.message || "Unable to send OTP");
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setResetError("");
    setResetMessage("");

    try {
      const { data } = await resetRiderPassword(resetForm);
      setResetMessage(data.message);
      setDemoOtp("");
      setForgotOpen(false);
      setResetForm({ email: "", otp: "", newPassword: "" });
    } catch (requestError) {
      setResetError(requestError.response?.data?.message || "Unable to reset rider password");
    }
  };

  const handleAccept = async (orderId) => {
    setError("");
    setMessage("");

    try {
      await acceptRiderOrder(orderId);
      setSelectedOrderId(orderId);
      setMessage("Order accepted by rider.");
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not accept order");
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await markRiderNotificationsRead();
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to mark notifications as read");
    }
  };

  const handleStatus = async (orderId, status) => {
    setError("");
    setMessage("");

    try {
      const { data } = await updateRiderOrderStatus(orderId, status);
      setSelectedOrderId(orderId);
      setMessage(
        status === "picked" && data.order.otp
          ? `Order marked picked. Customer OTP: ${data.order.otp}`
          : `Order moved to ${status}.`
      );
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update rider status");
    }
  };

  const handleVerifyOtp = async (orderId) => {
    setError("");
    setMessage("");

    try {
      await verifyDeliveryOtp(orderId, otpByOrder[orderId] || "");
      setSelectedOrderId(orderId);
      setMessage("Delivery completed successfully.");
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "OTP verification failed");
    }
  };

  const selectedOrder = orders.find((order) => order._id === selectedOrderId) || orders[0] || null;
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);

  if (getStoredToken() && getStoredRole() && getStoredRole() !== "rider") {
    return (
      <section className="panel auth-panel">
        <h1>Rider Only</h1>
        <p className="error-text">This panel is only available to rider accounts.</p>
        <button className="primary-button" type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </section>
    );
  }

  return (
    <div className="stack">
      {!isLoggedInRider && (
        <section className="panel auth-panel">
          <h1>Rider Panel</h1>
          <p className="helper-text">Use your rider phone and password to enter the delivery workspace. demo phone=1111111111 and pass=111111</p>
          <form className="form-grid" onSubmit={handleLogin}>
            <input
              placeholder="Phone"
              value={loginForm.phone}
              inputMode="numeric"
              maxLength="10"
              onChange={(event) => setLoginForm({ ...loginForm, phone: sanitizePhone(event.target.value) })}
            />
            <input
              placeholder="Password"
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
            />
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Rider Login"}
            </button>
          </form>
          <button className="text-button" type="button" onClick={() => setForgotOpen((current) => !current)}>
            {forgotOpen ? "Hide forgot password" : "Forgot password?"}
          </button>
          {forgotOpen && (
            <form className="form-grid forgot-card top-gap" onSubmit={handleResetPassword}>
              <input
                placeholder="Registered email"
                type="email"
                value={resetForm.email}
                onChange={(event) => setResetForm({ ...resetForm, email: event.target.value.trim().toLowerCase() })}
              />
              <button className="ghost-button" type="button" onClick={handleRequestOtp}>
                Get OTP On Email
              </button>
              <input
                placeholder="Enter OTP"
                value={resetForm.otp}
                inputMode="numeric"
                maxLength="6"
                onChange={(event) => setResetForm({ ...resetForm, otp: sanitizeOtp(event.target.value) })}
              />
              <input
                placeholder="New password"
                type="password"
                value={resetForm.newPassword}
                onChange={(event) => setResetForm({ ...resetForm, newPassword: event.target.value })}
              />
              <button className="primary-button" type="submit">
                Reset Password
              </button>
              {demoOtp && <p className="helper-text">Demo Email OTP: {demoOtp}</p>}
              {resetMessage && <p className="success-text">{resetMessage}</p>}
              {resetError && <p className="error-text">{resetError}</p>}
            </form>
          )}
          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
        </section>
      )}

      {isLoggedInRider && message && <section className="panel"><p className="success-text">{message}</p></section>}
      {isLoggedInRider && error && <section className="panel"><p className="error-text">{error}</p></section>}

      {isLoggedInRider && unreadNotifications.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Nearby Order Alerts</h2>
              <p>Fresh bookings near your current location appear here so you can accept quickly.</p>
            </div>
            <button className="ghost-button" type="button" onClick={handleMarkNotificationsRead}>
              Mark All Read
            </button>
          </div>
          <div className="data-list compact-list management-list top-gap">
            {unreadNotifications.map((notification, index) => (
              <div className="management-item" key={`${notification.createdAt}-${index}`}>
                <p><strong>{notification.message}</strong></p>
                <p>Order: {notification.orderId?.orderId || "Pending"}</p>
                <div className="action-row compact-actions">
                  {notification.orderId?._id && (
                    <button className="ghost-button" type="button" onClick={() => handleAccept(notification.orderId._id)}>
                      Accept Now
                    </button>
                  )}
                  {notification.orderId?._id && (
                    <button className="ghost-button" type="button" onClick={() => setSelectedOrderId(notification.orderId._id)}>
                      View Route
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isLoggedInRider && (
        <>
          <MapView
            title="Rider Navigation"
            description={selectedOrder ? "Use this route to move from dealer pickup to customer delivery." : "Accept an order to view a live route."}
            dealerLocation={selectedOrder?.dealerId?.location || selectedOrder?.dealerLocation || null}
            customerLocation={selectedOrder?.customerLocation || null}
            riderLocation={selectedOrder?.riderId?.currentLocation || null}
            mode="rider"
          />

          <section className="panel">
            <h2>Available Orders</h2>
            <div className="data-list rider-order-list">
              {orders.length ? (
                orders.map((order) => (
                  <article className="inner-card" key={order._id}>
                    <p><strong>{order.orderId}</strong> - {order.status}</p>
                    <p>{order.customerId?.name} - {order.customerLocation?.address}</p>
                    <p>Dealer: {order.dealerId?.agencyName}</p>
                    <div className="action-row">
                      <button className="ghost-button" type="button" onClick={() => setSelectedOrderId(order._id)}>
                        View Route
                      </button>
                      {order.status === "pending" && (
                        <button className="ghost-button" type="button" onClick={() => handleAccept(order._id)}>
                          Accept
                        </button>
                      )}
                      {order.status === "accepted" && (
                        <button className="ghost-button" type="button" onClick={() => handleStatus(order._id, "picked")}>
                          Mark Picked
                        </button>
                      )}
                    </div>
                    {order.status === "picked" && (
                      <div className="otp-row">
                        <input
                          placeholder="Enter delivery OTP"
                          value={otpByOrder[order._id] || ""}
                          inputMode="numeric"
                          maxLength="6"
                          onChange={(event) =>
                            setOtpByOrder({ ...otpByOrder, [order._id]: sanitizeOtp(event.target.value) })
                          }
                        />
                        <button className="ghost-button" type="button" onClick={() => handleVerifyOtp(order._id)}>
                          Verify OTP
                        </button>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <p>No rider orders visible yet. Create a customer order first.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default RiderPanel;
