import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../components/MapView";
import OrderButton from "../components/OrderButton";
import OrderStatus from "../components/OrderStatus";
import {
  acceptRiderOrder,
  createOrder,
  createPaymentOrder,
  demoPaymentSuccess,
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
  verifyDeliveryOtp,
  verifyPayment
} from "../services/api";
import { clearStoredToken, getStoredToken } from "../utils/storage";
import { sanitizeOtp } from "../utils/form";
import { loadRazorpayScript } from "../utils/razorpay";

const initialForm = {
  dealerId: "",
  address: "221B Green Avenue, Kolkata",
  latitude: "22.5726",
  longitude: "88.3639"
};

function Home() {
  const navigate = useNavigate();
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
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);

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

        if (dealerList.length > 0) {
          setForm((current) => ({
            ...current,
            dealerId: current.dealerId || dealerList[0]._id
          }));
        }

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
          setLoading(false);
          return;
        }

        if (nextProfile.role === "rider") {
          await loadRiderWorkspace();
          setLoading(false);
          return;
        }

        if (nextProfile.role === "dealer") {
          await loadDealerWorkspace();
          setLoading(false);
          return;
        }

        const ordersResponse = await fetchUserOrders(nextProfile._id);
        setOrders(ordersResponse.data);
        setCurrentOrder(ordersResponse.data[0] || null);
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

  const syncCurrentOrder = (updatedOrder) => {
    setCurrentOrder(updatedOrder);
    setOrders((current) => current.map((order) => (order._id === updatedOrder._id ? updatedOrder : order)));
  };

  const handleOrder = async () => {
    if (!profile) {
      setError("Login as a customer before creating an order.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const selectedDealer = dealers.find((dealer) => dealer._id === form.dealerId);
      const payload = {
        dealerId: form.dealerId,
        customerLocation: {
          address: form.address,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude)
        },
        dealerLocation: selectedDealer.location,
        amount: 950,
        platformFee: 20,
        riderFee: 30
      };

      const { data } = await createOrder(payload);
      setCurrentOrder(data.order);
      setNearbyRiders(data.nearbyRiders);
      setOrders((current) => [data.order, ...current]);
      setMessage("Cylinder booked successfully. Complete payment to confirm the order financially.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    if (!currentOrder) {
      setError("Create an order before starting payment.");
      return;
    }

    setPaying(true);
    setMessage("");
    setError("");

    try {
      const { data } = await createPaymentOrder(currentOrder._id);

      if (data.demoMode) {
        const demoResponse = await demoPaymentSuccess(currentOrder._id);
        syncCurrentOrder(demoResponse.data.order);
        setMessage("Demo payment completed successfully. You can continue the rider flow now.");
        return;
      }

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        setError("Razorpay checkout could not be loaded. Check your internet connection and try again.");
        return;
      }

      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: data.key,
          amount: data.razorpayOrder.amount,
          currency: data.razorpayOrder.currency,
          name: "Cylendra Wala",
          description: `Payment for ${currentOrder.orderId}`,
          order_id: data.razorpayOrder.id,
          prefill: {
            name: profile?.name || "",
            contact: profile?.phone || ""
          },
          notes: data.razorpayOrder.notes,
          handler: async (response) => {
            try {
              const verifyResponse = await verifyPayment({
                orderId: currentOrder._id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              syncCurrentOrder(verifyResponse.data.order);
              setMessage("Payment verified successfully.");
              resolve();
            } catch (requestError) {
              setError(requestError.response?.data?.message || "Payment verification failed");
              reject(requestError);
            }
          },
          modal: {
            ondismiss: () => resolve()
          },
          theme: {
            color: "#ba5f18"
          }
        });

        razorpay.open();
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to start payment");
    } finally {
      setPaying(false);
    }
  };

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

  const customerMapLocation = currentOrder?.customerLocation || (profile
    ? {
        address: profile.address,
        latitude: profile.latitude,
        longitude: profile.longitude
      }
    : null);

  const dealerMapLocation = currentOrder?.dealerLocation || dealers.find((dealer) => dealer._id === form.dealerId)?.location;
  const riderMapLocation = currentOrder?.riderId?.currentLocation || null;
  const selectedRiderOrder = riderOrders.find((order) => order._id === selectedRiderOrderId) || riderOrders[0] || null;
  const unreadRiderNotifications = riderNotifications.filter((notification) => !notification.isRead);

  const summaryCards = [
    { label: "Total orders", value: metrics?.totalOrders ?? 0 },
    { label: "Platform revenue", value: `Rs. ${metrics?.totalPlatformRevenue ?? 0}` },
    { label: "Active riders", value: metrics?.activeRiders ?? 0 },
    { label: "Active dealers", value: metrics?.activeDealers ?? 0 }
  ];

  const isAdmin = profile?.role === "admin";
  const isRider = profile?.role === "rider";
  const isDealer = profile?.role === "dealer";
  const showCustomerHome = !isAdmin && !isRider && !isDealer;

  return (
    <div className="stack">
      <section className="hero home-hero">
        <div>
          <p className="eyebrow">Fast household delivery</p>
          <h1>Order LPG cylinders with live rider allocation and admin-ready analytics.</h1>
          <p className="hero-copy">
            Book a cylinder, pay online, assign a dealer, and track the delivery lifecycle from pending to delivered.
            Use the seeded demo accounts to showcase the full product flow.
          </p>
          {!profile && <p className="helper-text">Login first, then return here to place an order.</p>}
          {isAdmin && <p className="helper-text">Admin home focuses on business visibility. Use Dashboard for onboarding, registry control, and dealer management.</p>}
          {isRider && <p className="helper-text">Rider home shows nearby alerts, available orders, and your active deliveries.</p>}
          {isDealer && <p className="helper-text">Dealer home shows the bookings routed to your agency and the latest booking notifications.</p>}
        </div>
        <div className="hero-card hero-card-stack">
          <div>
            <h2>Revenue Split</h2>
            <div className="metric-list">
              <div>
                <span>Total</span>
                <strong>Rs. 950</strong>
              </div>
              <div>
                <span>Dealer</span>
                <strong>Rs. 900</strong>
              </div>
              <div>
                <span>Rider</span>
                <strong>Rs. 30</strong>
              </div>
              <div>
                <span>Platform</span>
                <strong>Rs. 20</strong>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div>
              <h2>Business Snapshot</h2>
              <div className="metric-list compact-metric-list">
                {summaryCards.map((card) => (
                  <div key={card.label}>
                    <span>{card.label}</span>
                    <strong>{loading ? "..." : card.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isRider && selectedRiderOrder && (
            <div>
              <h2>Current Delivery</h2>
              <p><strong>{selectedRiderOrder.orderId}</strong> - {selectedRiderOrder.status}</p>
              <p className="helper-text">Customer: {selectedRiderOrder.customerId?.name || "Unknown"}</p>
            </div>
          )}
          {isDealer && (
            <div>
              <h2>Dealer Snapshot</h2>
              <div className="metric-list compact-metric-list">
                <div>
                  <span>Booked orders</span>
                  <strong>{dealerOrders.length}</strong>
                </div>
                <div>
                  <span>Notifications</span>
                  <strong>{dealerNotifications.length}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {showCustomerHome && (
        <>
          <section className="panel form-panel">
            <div className="section-heading">
              <div>
                <h2>Book Cylinder</h2>
                <p>Create a customer order with dealer routing and delivery-ready location data.</p>
              </div>
              <OrderButton
                onClick={handleOrder}
                disabled={!profile || loading || submitting || dealers.length === 0}
                label={submitting ? "Booking..." : "Book Cylinder"}
              />
            </div>
            <div className="form-grid two-column-grid">
              <select
                value={form.dealerId}
                onChange={(event) => setForm({ ...form, dealerId: event.target.value })}
                disabled={!profile || loading || dealers.length === 0}
              >
                {dealers.map((dealer) => (
                  <option key={dealer._id} value={dealer._id}>
                    {dealer.agencyName} - {dealer.location.address}
                  </option>
                ))}
              </select>
              <input
                placeholder="Delivery address"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                disabled={!profile || loading}
              />
              <input
                placeholder="Latitude"
                value={form.latitude}
                onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                disabled={!profile || loading}
              />
              <input
                placeholder="Longitude"
                value={form.longitude}
                onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                disabled={!profile || loading}
              />
            </div>
            {message && <p className="success-text">{message}</p>}
            {error && <p className="error-text">{error}</p>}
            {!dealers.length && !loading && (
              <p className="helper-text">No dealers found yet. Run `npm run seed` inside the backend folder.</p>
            )}
          </section>

          <OrderStatus currentStatus={currentOrder?.status || "pending"} />
          <MapView
            title="Customer Tracking View"
            description={currentOrder ? "Track dealer, customer, and rider locations for the active order." : "Preview dealer and delivery area before placing an order."}
            customerLocation={customerMapLocation}
            dealerLocation={dealerMapLocation}
            riderLocation={riderMapLocation}
            mode="customer"
          />

          <section className="table-grid history-grid">
            <article className="panel">
              <h3>Current order</h3>
              {currentOrder ? (
                <div className="data-list compact-list">
                  <p><strong>Order:</strong> {currentOrder.orderId}</p>
                  <p><strong>Status:</strong> {currentOrder.status}</p>
                  <p><strong>Payment:</strong> {currentOrder.paymentStatus}</p>
                  <p><strong>Amount:</strong> Rs. {currentOrder.amount}</p>
                  <p><strong>Paid at:</strong> {currentOrder.paidAt ? new Date(currentOrder.paidAt).toLocaleString() : "Not paid yet"}</p>
                  <div className="payment-actions">
                    <OrderButton
                      onClick={handlePayNow}
                      disabled={paying || currentOrder.paymentStatus === "success"}
                      label={
                        currentOrder.paymentStatus === "success"
                          ? "Payment Completed"
                          : paying
                            ? "Processing Payment..."
                            : "Pay Now"
                      }
                    />
                  </div>
                </div>
              ) : (
                <p>No order created yet.</p>
              )}
            </article>

            <article className="panel">
              <h3>Nearby riders</h3>
              {nearbyRiders.length ? (
                <div className="data-list compact-list">
                  {nearbyRiders.map((rider) => (
                    <p key={rider.riderId}>
                      {rider.name} - {rider.distance.toFixed(4)} units away
                    </p>
                  ))}
                </div>
              ) : (
                <p>Nearby rider matching will appear after order creation.</p>
              )}
            </article>

            <article className="panel">
              <h3>Order history</h3>
              {orders.length ? (
                <div className="data-list compact-list">
                  {orders.map((order) => (
                    <p key={order._id}>
                      {order.orderId} - {order.status} - {order.paymentStatus} - Rs. {order.amount}
                    </p>
                  ))}
                </div>
              ) : (
                <p>Your past orders will appear here.</p>
              )}
            </article>
          </section>
        </>
      )}

      {isRider && (
        <>
          {message && <section className="panel"><p className="success-text">{message}</p></section>}
          {error && <section className="panel"><p className="error-text">{error}</p></section>}

          {unreadRiderNotifications.length > 0 && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Nearby Order Alerts</h2>
                  <p>New nearby bookings appear here instantly after creation so you can accept them first.</p>
                </div>
                <button className="ghost-button" type="button" onClick={handleMarkRiderNotificationsRead}>
                  Mark All Read
                </button>
              </div>
              <div className="data-list compact-list management-list top-gap">
                {unreadRiderNotifications.map((notification, index) => (
                  <div className="management-item" key={`${notification.createdAt}-${index}`}>
                    <p><strong>{notification.message}</strong></p>
                    <p>Order: {notification.orderId?.orderId || "Pending"}</p>
                    <div className="action-row compact-actions">
                      {notification.orderId?._id && (
                        <button className="ghost-button" type="button" onClick={() => handleAcceptRiderOrder(notification.orderId._id)}>
                          Accept Now
                        </button>
                      )}
                      {notification.orderId?._id && (
                        <button className="ghost-button" type="button" onClick={() => setSelectedRiderOrderId(notification.orderId._id)}>
                          View Route
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <MapView
            title="Rider Navigation"
            description={selectedRiderOrder ? "Use this route to move from dealer pickup to customer delivery." : "Accept an order to view a live route."}
            dealerLocation={selectedRiderOrder?.dealerId?.location || selectedRiderOrder?.dealerLocation || null}
            customerLocation={selectedRiderOrder?.customerLocation || null}
            riderLocation={selectedRiderOrder?.riderId?.currentLocation || null}
            mode="rider"
          />
          <section className="panel">
            <h2>Available And Assigned Orders</h2>
            <div className="data-list rider-order-list">
              {riderOrders.length ? (
                riderOrders.map((order) => (
                  <article className="inner-card" key={order._id}>
                    <p><strong>{order.orderId}</strong> - {order.status}</p>
                    <p>{order.customerId?.name} - {order.customerLocation?.address}</p>
                    <p>Dealer: {order.dealerId?.agencyName}</p>
                    <div className="action-row">
                      <button className="ghost-button" type="button" onClick={() => setSelectedRiderOrderId(order._id)}>
                        View Route
                      </button>
                      {order.status === "pending" && (
                        <button className="ghost-button" type="button" onClick={() => handleAcceptRiderOrder(order._id)}>
                          Accept
                        </button>
                      )}
                      {order.status === "accepted" && (
                        <button className="ghost-button" type="button" onClick={() => handleRiderStatus(order._id, "picked")}>
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
                        <button className="ghost-button" type="button" onClick={() => handleVerifyRiderOtp(order._id)}>
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

      {isDealer && (
        <>
          {message && <section className="panel"><p className="success-text">{message}</p></section>}
          {error && <section className="panel"><p className="error-text">{error}</p></section>}

          <section className="panel">
            <h2>Dealer Notifications</h2>
            <div className="data-list compact-list management-list top-gap">
              {dealerNotifications.length ? (
                dealerNotifications.map((notification, index) => (
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
            <h2>Orders Booked To Your Agency</h2>
            <div className="data-list compact-list management-list top-gap">
              {dealerOrders.length ? (
                dealerOrders.map((order) => (
                  <div className="management-item" key={order._id}>
                    <p><strong>{order.orderId}</strong> - {order.status}</p>
                    <p>Customer: {order.customerId?.name || "Unknown"} ({order.customerId?.phone || "No contact"})</p>
                    <p>Rider: {order.riderId?.name || "Unassigned"} ({order.riderId?.phone || "No contact"})</p>
                    <p>Payment: {order.paymentStatus} | Amount: Rs. {order.amount}</p>
                    <p>Address: {order.customerLocation?.address || "No address"}</p>
                  </div>
                ))
              ) : (
                <p>No orders booked to this dealer yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Home;
