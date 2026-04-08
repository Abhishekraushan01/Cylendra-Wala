import React, { useEffect, useMemo, useState } from "react";
import LocationPicker from "./LocationPicker";
import MapView from "./MapView";
import OrderButton from "./OrderButton";
import OrderStatus from "./OrderStatus";
import {
  createOrder,
  createPaymentOrder,
  demoPaymentSuccess,
  verifyPayment
} from "../services/api";
import { loadRazorpayScript } from "../utils/razorpay";

function CustomerBookingCard({
  profile,
  dealers,
  form,
  setForm,
  loading,
  currentOrder,
  setCurrentOrder,
  orders,
  setOrders,
  nearbyRiders,
  setNearbyRiders,
  message,
  setMessage,
  error,
  setError
}) {
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState(form.address || "");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showCoordinateFields, setShowCoordinateFields] = useState(false);

  useEffect(() => {
    setSearchQuery(form.address || "");
  }, [form.address]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=5&q=${encodeURIComponent(searchQuery)}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json"
            }
          }
        );

        if (!response.ok) {
          throw new Error("Unable to search addresses right now.");
        }

        const data = await response.json();
        setSearchResults(data);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setSearchResults([]);
        }
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const hasCapturedLocation = Boolean(form.latitude && form.longitude);
  const deliveryPoint = useMemo(() => {
    if (!hasCapturedLocation) {
      return null;
    }

    return {
      latitude: Number(form.latitude),
      longitude: Number(form.longitude)
    };
  }, [form.latitude, form.longitude, hasCapturedLocation]);

  const syncCurrentOrder = (updatedOrder) => {
    setCurrentOrder(updatedOrder);
    setOrders((current) => current.map((order) => (order._id === updatedOrder._id ? updatedOrder : order)));
  };

  const updateLocationCoordinates = ({ latitude, longitude }) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6)
    }));
  };

  const applySearchResult = (result) => {
    setForm((current) => ({
      ...current,
      address: result.display_name,
      latitude: Number(result.lat).toFixed(6),
      longitude: Number(result.lon).toFixed(6)
    }));
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setMessage("Delivery point updated from search. You can drag the pin if you want to fine-tune it.");
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Current location is not supported in this browser.");
      return;
    }

    setLocating(true);
    setError("");
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocationCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setForm((current) => ({
          ...current,
          address: current.address || "Current location selected"
        }));
        setSearchQuery((current) => current || "Current location selected");
        setLocating(false);
        setMessage("Current location added. You can refine the address or drag the pin before booking.");
      },
      (locationError) => {
        setLocating(false);
        setError(locationError.message || "Unable to fetch current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleOrder = async () => {
    if (!profile) {
      setError("Login as a customer before creating an order.");
      return;
    }

    if (!form.latitude || !form.longitude) {
      setError("Add your delivery location before booking.");
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
          address: form.address || searchQuery || "Current location selected",
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
      setMessage(`Cylinder booked successfully in ${data.serviceArea.name}. Complete payment to confirm the order financially.`);
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

  return (
    <>
      <section className="panel form-panel handset-shell booking-app-shell">
        <div className="section-heading">
          <div>
            <h2>Book Cylinder</h2>
            <p>Search your address, use current location, or drag the pin to your doorstep. We will check availability automatically.</p>
          </div>
          <OrderButton
            onClick={handleOrder}
            disabled={!profile || loading || submitting || dealers.length === 0}
            label={submitting ? "Booking..." : "Book Cylinder"}
          />
        </div>

        <div className="booking-grid">
          <div className="booking-card">
            <p className="booking-card-label">Assigned Dealer</p>
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
          </div>

          <div className="booking-card location-card full-span">
            <div className="location-card-head">
              <div>
                <p className="booking-card-label">Delivery Location</p>
                <h3>{hasCapturedLocation ? "Pin your doorstep" : "Search or use current location"}</h3>
              </div>
              <button className="primary-button" type="button" onClick={handleUseCurrentLocation} disabled={locating || !profile || loading}>
                {locating ? "Locating..." : "Use Current Location"}
              </button>
            </div>

            <input
              placeholder="Search your address, area, or landmark"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setForm((current) => ({ ...current, address: event.target.value }));
              }}
              disabled={!profile || loading}
            />

            {searching && <p className="helper-text">Searching addresses...</p>}
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    className="search-result-item"
                    type="button"
                    onClick={() => applySearchResult(result)}
                  >
                    <strong>{result.display_name.split(",")[0]}</strong>
                    <span>{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            <LocationPicker
              latitude={deliveryPoint?.latitude}
              longitude={deliveryPoint?.longitude}
              onChange={updateLocationCoordinates}
            />

            <div className="location-badges">
              <span className={`location-badge ${hasCapturedLocation ? "active" : ""}`}>
                {hasCapturedLocation ? `Lat ${form.latitude}` : "Latitude pending"}
              </span>
              <span className={`location-badge ${hasCapturedLocation ? "active" : ""}`}>
                {hasCapturedLocation ? `Lng ${form.longitude}` : "Longitude pending"}
              </span>
              <button className="text-button compact-toggle" type="button" onClick={() => setShowCoordinateFields((current) => !current)}>
                {showCoordinateFields ? "Hide manual coordinates" : "Edit coordinates manually"}
              </button>
            </div>

            <input
              placeholder="Flat, floor, landmark or delivery note"
              value={form.address}
              onChange={(event) => {
                setForm({ ...form, address: event.target.value });
                setSearchQuery(event.target.value);
              }}
              disabled={!profile || loading}
            />

            {showCoordinateFields && (
              <div className="two-column-grid form-grid-inline top-gap">
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
            )}
          </div>
        </div>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}
        <p className="helper-text">If your delivery point is outside our active launch zones, we will let you know that service is not available there yet.</p>
      </section>

      <OrderStatus currentStatus={currentOrder?.status || "pending"} />

      <section className="table-grid history-grid">
        <article className="panel handset-shell">
          <h3>Current order</h3>
          {currentOrder ? (
            <div className="data-list compact-list">
              <p><strong>Order:</strong> {currentOrder.orderId}</p>
              <p><strong>Status:</strong> {currentOrder.status}</p>
              <p><strong>Payment:</strong> {currentOrder.paymentStatus}</p>
              <p><strong>Area:</strong> {currentOrder.serviceAreaId?.name || "Live zone"}</p>
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

        <article className="panel handset-shell">
          <h3>Nearby riders</h3>
          {nearbyRiders.length ? (
            <div className="data-list compact-list">
              {nearbyRiders.map((rider) => (
                <p key={rider.riderId}>
                  {rider.name} - {rider.distance.toFixed(2)} km away
                </p>
              ))}
            </div>
          ) : (
            <p>Nearby rider matching will appear after order creation.</p>
          )}
        </article>

        <article className="panel handset-shell">
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
  );
}

export default CustomerBookingCard;
