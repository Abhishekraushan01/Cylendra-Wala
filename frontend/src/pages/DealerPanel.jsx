import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  dealerLogin,
  fetchDealerOrders,
  fetchDealerWorkspaceNotifications
} from "../services/api";
import { sanitizePhone } from "../utils/form";
import { getStoredRole, getStoredToken, setStoredRole, setStoredToken } from "../utils/storage";

function DealerPanel() {
  const navigate = useNavigate();
  const isLoggedInDealer = Boolean(getStoredToken()) && getStoredRole() === "dealer";
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [dealer, setDealer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadWorkspace = async () => {
    try {
      const [ordersResponse, notificationsResponse] = await Promise.all([
        fetchDealerOrders(),
        fetchDealerWorkspaceNotifications()
      ]);

      setOrders(ordersResponse.data);
      setNotifications(notificationsResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load dealer workspace");
    }
  };

  useEffect(() => {
    if (!isLoggedInDealer) {
      return;
    }

    loadWorkspace();
    const intervalId = window.setInterval(loadWorkspace, 8000);

    return () => window.clearInterval(intervalId);
  }, [isLoggedInDealer]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await dealerLogin(loginForm);
      setStoredToken(data.token);
      setStoredRole("dealer");
      setDealer(data.dealer);
      setMessage(`Logged in as ${data.dealer.agencyName}`);
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Dealer login failed");
    } finally {
      setLoading(false);
    }
  };

  if (getStoredToken() && getStoredRole() && getStoredRole() !== "dealer") {
    return (
      <section className="panel auth-panel mobile-auth-card">
        <h1>Dealer Only</h1>
        <p className="error-text">This panel is only available to dealer accounts.</p>
        <button className="primary-button" type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </section>
    );
  }

  return (
    <div className="stack">
      {!isLoggedInDealer && (
        <section className="panel auth-panel mobile-auth-card">
          <h1>Dealer Login</h1>
          <p className="helper-text">Use the dealer phone number and password created by admin onboarding. Seeded dealer: 7000000001 / 123456.</p>
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
              {loading ? "Signing in..." : "Dealer Login"}
            </button>
          </form>
          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
        </section>
      )}

      {isLoggedInDealer && (
        <>
          {message && <section className="panel"><p className="success-text">{message}</p></section>}
          {error && <section className="panel"><p className="error-text">{error}</p></section>}

          <section className="hero home-hero">
            <div>
              <p className="eyebrow">Dealer workspace</p>
              <h1>Monitor bookings routed to your agency in one place.</h1>
              <p className="hero-copy">
                Stay on top of new customer bookings, assigned riders, payment progress, and delivery status without entering the admin dashboard.
              </p>
            </div>
            <div className="hero-card hero-card-stack">
              <div>
                <h2>{dealer?.agencyName || "Dealer"}</h2>
                <div className="metric-list compact-metric-list">
                  <div>
                    <span>Total booked orders</span>
                    <strong>{orders.length}</strong>
                  </div>
                  <div>
                    <span>New notifications</span>
                    <strong>{notifications.filter((notification) => !notification.isRead).length}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Dealer Notifications</h2>
                <p>Every booking assigned to this dealer appears here as soon as it is created.</p>
              </div>
            </div>
            <div className="data-list compact-list management-list top-gap">
              {notifications.length ? (
                notifications.map((notification, index) => (
                  <div className="management-item" key={`${notification.createdAt}-${index}`}>
                    <p><strong>{notification.message}</strong></p>
                    <p>
                      Order: {notification.orderId?.orderId || "Pending"}
                      {notification.customerId?.phone ? ` | Customer: ${notification.customerId.phone}` : ""}
                    </p>
                    <p>Status: {notification.orderId?.status || "pending"}</p>
                  </div>
                ))
              ) : (
                <p>No dealer notifications yet.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Booked Orders</h2>
                <p>These are the orders currently routed to your agency.</p>
              </div>
            </div>
            <div className="data-list compact-list management-list top-gap">
              {orders.length ? (
                orders.map((order) => (
                  <div className="management-item" key={order._id}>
                    <p><strong>{order.orderId}</strong> - {order.status}</p>
                    <p>Customer: {order.customerId?.name || "Unknown"} ({order.customerId?.phone || "No contact"})</p>
                    <p>Rider: {order.riderId?.name || "Unassigned"} ({order.riderId?.phone || "No contact"})</p>
                    <p>Amount: Rs. {order.amount} | Payment: {order.paymentStatus}</p>
                    <p>Address: {order.customerLocation?.address || "No address"}</p>
                  </div>
                ))
              ) : (
                <p>No orders booked for this dealer yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default DealerPanel;


