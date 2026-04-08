import React, { useEffect, useState } from "react";
import CustomerBookingCard from "../components/CustomerBookingCard";
import MapView from "../components/MapView";
import {
  acceptRiderOrder,
  fetchDealerOrders,
  fetchDealerWorkspaceNotifications,
  fetchDealers,
  fetchProfile,
  fetchPublicMetrics,
  fetchRiderNotifications,
  fetchRiderOrders,
  fetchUserOrders,
  markRiderNotificationsRead,
  updateRiderOrderStatus,
  verifyDeliveryOtp
} from "../services/api";
import { clearStoredToken, getStoredToken } from "../utils/storage";
import { sanitizeOtp } from "../utils/form";

const initialForm = {
  dealerId: "",
  address: "",
  latitude: "",
  longitude: ""
};

function Home() {
  const [dealers, setDealers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [nearbyRiders, setNearbyRiders] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [riderOrders, setRiderOrders] = useState([]);
  const [riderNotifications, setRiderNotifications] = useState([]);
  const [selectedRiderOrderId, setSelectedRiderOrderId] = useState(null);
  const [dealerOrders, setDealerOrders] = useState([]);
  const [dealerNotifications, setDealerNotifications] = useState([]);
  const [otpByOrder, setOtpByOrder] = useState({});
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRiderWorkspace = async () => {
    try {
      const [ordersResponse, notificationsResponse] = await Promise.all([
        fetchRiderOrders(),
        fetchRiderNotifications()
      ]);
      setRiderOrders(ordersResponse.data);
      setRiderNotifications(notificationsResponse.data);
      setSelectedRiderOrderId((current) => current || ordersResponse.data[0]?._id || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load rider orders");
    }
  };

  const loadDealerWorkspace = async () => {
    try {
      const [ordersResponse, notificationsResponse] = await Promise.all([
        fetchDealerOrders(),
        fetchDealerWorkspaceNotifications()
      ]);
      setDealerOrders(ordersResponse.data);
      setDealerNotifications(notificationsResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load dealer workspace");
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      setError("");

      try {
        const dealersResponse = await fetchDealers();
        const dealerList = dealersResponse.data;
        setDealers(dealerList);

        setForm((current) => ({
          ...current,
          dealerId: current.dealerId || dealerList[0]?._id || ""
        }));

        const token = getStoredToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const profileResponse = await fetchProfile();
        const nextProfile = profileResponse.data;
        setProfile(nextProfile);

        if (nextProfile.role === "admin") {
          const metricsResponse = await fetchPublicMetrics();
          setMetrics(metricsResponse.data);
        } else if (nextProfile.role === "rider") {
          await loadRiderWorkspace();
        } else if (nextProfile.role === "dealer") {
          await loadDealerWorkspace();
        } else {
          setForm((current) => ({
            ...current,
            address: current.address || nextProfile.address || "",
            latitude: current.latitude || (nextProfile.latitude ? String(nextProfile.latitude) : ""),
            longitude: current.longitude || (nextProfile.longitude ? String(nextProfile.longitude) : "")
          }));
          const ordersResponse = await fetchUserOrders(nextProfile._id);
          setOrders(ordersResponse.data);
          setCurrentOrder(ordersResponse.data[0] || null);
        }
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearStoredToken();
          setProfile(null);
        } else {
          setError(requestError.response?.data?.message || "Unable to load the dashboard");
        }
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  useEffect(() => {
    if (profile?.role !== "rider") {
      return;
    }

    const intervalId = window.setInterval(loadRiderWorkspace, 8000);
    return () => window.clearInterval(intervalId);
  }, [profile?.role]);

  useEffect(() => {
    if (profile?.role !== "dealer") {
      return;
    }

    const intervalId = window.setInterval(loadDealerWorkspace, 8000);
    return () => window.clearInterval(intervalId);
  }, [profile?.role]);

  const handleAcceptRiderOrder = async (orderId) => {
    setError("");
    setMessage("");

    try {
      await acceptRiderOrder(orderId);
      setSelectedRiderOrderId(orderId);
      setMessage("Order accepted by rider.");
      await loadRiderWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not accept order");
    }
  };

  const handleRiderStatus = async (orderId, status) => {
    setError("");
    setMessage("");

    try {
      const { data } = await updateRiderOrderStatus(orderId, status);
      setSelectedRiderOrderId(orderId);
      setMessage(
        status === "picked" && data.order.otp
          ? `Order marked picked. Customer OTP: ${data.order.otp}`
          : `Order moved to ${status}.`
      );
      await loadRiderWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update rider status");
    }
  };

  const handleVerifyRiderOtp = async (orderId) => {
    setError("");
    setMessage("");

    try {
      await verifyDeliveryOtp(orderId, otpByOrder[orderId] || "");
      setSelectedRiderOrderId(orderId);
      setMessage("Delivery completed successfully.");
      await loadRiderWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "OTP verification failed");
    }
  };

  const handleMarkRiderNotificationsRead = async () => {
    setError("");

    try {
      await markRiderNotificationsRead();
      await loadRiderWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to mark notifications as read");
    }
  };

  const selectedRiderOrder = riderOrders.find((order) => order._id === selectedRiderOrderId) || riderOrders[0] || null;
  const unreadRiderNotifications = riderNotifications.filter((notification) => !notification.isRead);
  const summaryCards = [
    { label: "Total orders", value: metrics?.totalOrders ?? 0 },
    { label: "Platform revenue", value: `Rs. ${metrics?.totalPlatformRevenue ?? 0}` },
    { label: "Active riders", value: metrics?.activeRiders ?? 0 },
    { label: "Active dealers", value: metrics?.activeDealers ?? 0 },
    { label: "Live areas", value: metrics?.activeServiceAreas ?? 0 }
  ];

  const isAdmin = profile?.role === "admin";
  const isRider = profile?.role === "rider";
  const isDealer = profile?.role === "dealer";
  const showCustomerHome = !isAdmin && !isRider && !isDealer;

  return (
    <div className="stack app-stack">
      <section className="hero home-hero app-hero">
        <div>
          <p className="eyebrow">Fast household delivery</p>
          <h1>Order LPG cylinders with location-aware launch control.</h1>
          <p className="hero-copy">The app now works more like a delivery app. Search addresses, use current location, or drag the delivery pin on the map.</p>
          {!profile && <p className="helper-text">Login first, then return here to place an order.</p>}
          {isAdmin && <p className="helper-text">Admin home focuses on business visibility. Use Dashboard for onboarding, registry control, and launch-area management.</p>}
          {isRider && <p className="helper-text">Rider home shows nearby alerts, available orders, and your active deliveries.</p>}
          {isDealer && <p className="helper-text">Dealer home shows bookings routed to your agency and the latest customer demand.</p>}
        </div>
        <div className="hero-card hero-card-stack handset-card">
          <div>
            <h2>Revenue Split</h2>
            <div className="metric-list">
              <div><span>Total</span><strong>Rs. 950</strong></div>
              <div><span>Dealer</span><strong>Rs. 900</strong></div>
              <div><span>Rider</span><strong>Rs. 30</strong></div>
              <div><span>Platform</span><strong>Rs. 20</strong></div>
            </div>
          </div>
          {isAdmin && <div><h2>Business Snapshot</h2><div className="metric-list compact-metric-list">{summaryCards.map((card) => <div key={card.label}><span>{card.label}</span><strong>{loading ? "..." : card.value}</strong></div>)}</div></div>}
          {isDealer && <div><h2>Dealer Snapshot</h2><div className="metric-list compact-metric-list"><div><span>Booked orders</span><strong>{dealerOrders.length}</strong></div><div><span>Notifications</span><strong>{dealerNotifications.length}</strong></div></div></div>}
        </div>
      </section>

      {showCustomerHome && <CustomerBookingCard profile={profile} dealers={dealers} form={form} setForm={setForm} loading={loading} currentOrder={currentOrder} setCurrentOrder={setCurrentOrder} orders={orders} setOrders={setOrders} nearbyRiders={nearbyRiders} setNearbyRiders={setNearbyRiders} message={message} setMessage={setMessage} error={error} setError={setError} />}

      {isRider && <><MapView title="Rider Navigation" description={selectedRiderOrder ? "Use this route to move from dealer pickup to customer delivery." : "Accept an order to view a live route."} dealerLocation={selectedRiderOrder?.dealerId?.location || selectedRiderOrder?.dealerLocation || null} customerLocation={selectedRiderOrder?.customerLocation || null} riderLocation={selectedRiderOrder?.riderId?.currentLocation || null} mode="rider" /><section className="panel handset-shell">{message && <p className="success-text">{message}</p>}{error && <p className="error-text">{error}</p>}<h2>Available And Assigned Orders</h2>{unreadRiderNotifications.length > 0 && <div className="data-list compact-list management-list top-gap"><div className="section-heading"><div><h3>Nearby Order Alerts</h3><p>New nearby bookings appear here instantly after creation so you can accept them first.</p></div><button className="ghost-button" type="button" onClick={handleMarkRiderNotificationsRead}>Mark All Read</button></div>{unreadRiderNotifications.map((notification, index) => <div className="management-item" key={`${notification.createdAt}-${index}`}><p><strong>{notification.message}</strong></p><p>Order: {notification.orderId?.orderId || "Pending"}</p><div className="action-row compact-actions">{notification.orderId?._id && <button className="ghost-button" type="button" onClick={() => handleAcceptRiderOrder(notification.orderId._id)}>Accept Now</button>}{notification.orderId?._id && <button className="ghost-button" type="button" onClick={() => setSelectedRiderOrderId(notification.orderId._id)}>View Route</button>}</div></div>)}</div>}<div className="data-list rider-order-list top-gap">{riderOrders.length ? riderOrders.map((order) => <article className="inner-card" key={order._id}><p><strong>{order.orderId}</strong> - {order.status}</p><p>{order.customerId?.name} - {order.customerLocation?.address}</p><p>Dealer: {order.dealerId?.agencyName}</p><div className="action-row"><button className="ghost-button" type="button" onClick={() => setSelectedRiderOrderId(order._id)}>View Route</button>{order.status === "pending" && <button className="ghost-button" type="button" onClick={() => handleAcceptRiderOrder(order._id)}>Accept</button>}{order.status === "accepted" && <button className="ghost-button" type="button" onClick={() => handleRiderStatus(order._id, "picked")}>Mark Picked</button>}</div>{order.status === "picked" && <div className="otp-row"><input placeholder="Enter delivery OTP" value={otpByOrder[order._id] || ""} inputMode="numeric" maxLength="6" onChange={(event) => setOtpByOrder({ ...otpByOrder, [order._id]: sanitizeOtp(event.target.value) })} /><button className="ghost-button" type="button" onClick={() => handleVerifyRiderOtp(order._id)}>Verify OTP</button></div>}</article>) : <p>No rider orders visible yet. Create a customer order first.</p>}</div></section></>}

      {isDealer && <><section className="panel handset-shell">{message && <p className="success-text">{message}</p>}{error && <p className="error-text">{error}</p>}<h2>Dealer Notifications</h2><div className="data-list compact-list management-list top-gap">{dealerNotifications.length ? dealerNotifications.map((notification, index) => <div className="management-item" key={`${notification.createdAt}-${index}`}><p><strong>{notification.message}</strong></p><p>Order: {notification.orderId?.orderId || "Pending"}{notification.customerId?.phone ? ` | Customer: ${notification.customerId.phone}` : ""}</p><p>Status: {notification.orderId?.status || "pending"}</p></div>) : <p>No dealer notifications yet.</p>}</div></section><section className="panel handset-shell"><h2>Orders Booked To Your Agency</h2><div className="data-list compact-list management-list top-gap">{dealerOrders.length ? dealerOrders.map((order) => <div className="management-item" key={order._id}><p><strong>{order.orderId}</strong> - {order.status}</p><p>Customer: {order.customerId?.name || "Unknown"} ({order.customerId?.phone || "No contact"})</p><p>Rider: {order.riderId?.name || "Unassigned"} ({order.riderId?.phone || "No contact"})</p><p>Payment: {order.paymentStatus} | Amount: Rs. {order.amount}</p><p>Address: {order.customerLocation?.address || "No address"}</p></div>) : <p>No orders booked to this dealer yet.</p>}</div></section></>}
    </div>
  );
}

export default Home;
