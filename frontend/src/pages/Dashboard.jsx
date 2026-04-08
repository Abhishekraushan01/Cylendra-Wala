import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createAdminDealer,
  createAdminRider,
  createAdminServiceArea,
  deleteAdminDealer,
  deleteAdminRider,
  deleteAdminServiceArea,
  fetchAdminDealers,
  fetchAdminOrders,
  fetchAdminRiders,
  fetchAdminServiceAreas,
  fetchDealerNotifications,
  fetchProfile,
  updateAdminDealerStatus,
  updateAdminRiderStatus,
  updateAdminServiceAreaStatus
} from "../services/api";
import { sanitizePhone } from "../utils/form";
import { getStoredRole } from "../utils/storage";

const initialDealerForm = {
  dealerName: "",
  agencyName: "",
  phone: "",
  password: "",
  address: "",
  latitude: "",
  longitude: "",
  subscriptionPlan: "basic",
  commissionRate: "20"
};

const initialRiderForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  bikeNumber: "",
  latitude: "",
  longitude: ""
};

const initialServiceAreaForm = {
  name: "",
  city: "",
  address: "",
  latitude: "",
  longitude: "",
  radiusKm: "5"
};

const panelOptions = [
  { id: "overview", label: "Admin overview" },
  { id: "areas", label: "Serviceable Areas" },
  { id: "dealer", label: "Onboard Dealer" },
  { id: "rider", label: "Onboard Rider" },
  { id: "registry", label: "Registry Explorer" }
];

function Dashboard() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [dealerNotifications, setDealerNotifications] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [dealerForm, setDealerForm] = useState(initialDealerForm);
  const [riderForm, setRiderForm] = useState(initialRiderForm);
  const [serviceAreaForm, setServiceAreaForm] = useState(initialServiceAreaForm);
  const [registryView, setRegistryView] = useState("orders");
  const [activePanel, setActivePanel] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const profileResponse = await fetchProfile();
      if (profileResponse.data.role !== "admin") {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const [ordersResponse, ridersResponse, dealersResponse, serviceAreasResponse] = await Promise.all([
        fetchAdminOrders(),
        fetchAdminRiders(),
        fetchAdminDealers(),
        fetchAdminServiceAreas()
      ]);

      setOrders(ordersResponse.data);
      setRiders(ridersResponse.data);
      setDealers(dealersResponse.data);
      setServiceAreas(serviceAreasResponse.data);

      const preferredDealerId = selectedDealerId || dealersResponse.data[0]?._id || "";
      setSelectedDealerId(preferredDealerId);

      if (preferredDealerId) {
        const notificationsResponse = await fetchDealerNotifications(preferredDealerId);
        setDealerNotifications(notificationsResponse.data.notifications);
      } else {
        setDealerNotifications([]);
      }
    } catch (requestError) {
      setAuthorized(false);
      setError(requestError.response?.data?.message || "Admin dashboard needs a valid admin login.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getStoredRole() !== "admin") {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    loadDashboard();
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!selectedDealerId || !authorized) {
        setDealerNotifications([]);
        return;
      }

      try {
        const response = await fetchDealerNotifications(selectedDealerId);
        setDealerNotifications(response.data.notifications);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load dealer notifications");
      }
    };

    if (selectedDealerId && authorized) {
      loadNotifications();
    }
  }, [selectedDealerId, authorized]);

  const handleCreateDealer = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await createAdminDealer({
        ...dealerForm,
        latitude: dealerForm.latitude ? Number(dealerForm.latitude) : null,
        longitude: dealerForm.longitude ? Number(dealerForm.longitude) : null,
        commissionRate: Number(dealerForm.commissionRate)
      });
      setMessage("Dealer onboarded successfully.");
      setDealerForm(initialDealerForm);
      setActivePanel("registry");
      setRegistryView("dealers");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create dealer");
    }
  };

  const handleCreateRider = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await createAdminRider({
        ...riderForm,
        latitude: riderForm.latitude ? Number(riderForm.latitude) : null,
        longitude: riderForm.longitude ? Number(riderForm.longitude) : null
      });
      setMessage("Rider onboarded successfully.");
      setRiderForm(initialRiderForm);
      setActivePanel("registry");
      setRegistryView("riders");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create rider");
    }
  };

  const handleCreateServiceArea = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await createAdminServiceArea({
        ...serviceAreaForm,
        latitude: Number(serviceAreaForm.latitude),
        longitude: Number(serviceAreaForm.longitude),
        radiusKm: Number(serviceAreaForm.radiusKm)
      });
      setMessage("Serviceable area launched successfully.");
      setServiceAreaForm(initialServiceAreaForm);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create serviceable area");
    }
  };

  const toggleDealer = async (dealerId, isActive) => {
    try {
      const response = await updateAdminDealerStatus(dealerId, !isActive);
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update dealer status");
    }
  };

  const toggleRider = async (riderId, isActive) => {
    try {
      const response = await updateAdminRiderStatus(riderId, !isActive);
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update rider status");
    }
  };

  const toggleServiceArea = async (serviceAreaId, isActive) => {
    try {
      const response = await updateAdminServiceAreaStatus(serviceAreaId, !isActive);
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update serviceable area status");
    }
  };

  const deleteDealer = async (dealerId, agencyName) => {
    if (!window.confirm(`Permanently delete dealer "${agencyName}"? This only works if no linked orders exist.`)) {
      return;
    }

    try {
      const response = await deleteAdminDealer(dealerId);
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete dealer");
    }
  };

  const deleteRider = async (riderId, riderName) => {
    if (!window.confirm(`Permanently delete rider "${riderName}"? This only works if no linked orders exist.`)) {
      return;
    }

    try {
      const response = await deleteAdminRider(riderId);
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete rider");
    }
  };

  const deleteServiceArea = async (serviceAreaId, serviceAreaName) => {
    if (!window.confirm(`Permanently delete serviceable area "${serviceAreaName}"? This only works if no linked orders exist.`)) {
      return;
    }

    try {
      const response = await deleteAdminServiceArea(serviceAreaId);
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete serviceable area");
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredOrders = useMemo(() => orders.filter((order) => {
    if (!normalizedSearch) {
      return true;
    }

    return [
      order.orderId,
      order.customerId?.name,
      order.customerId?.phone,
      order.riderId?.name,
      order.riderId?.phone,
      order.dealerId?.agencyName,
      order.dealerId?.phone,
      order.serviceAreaId?.name,
      order.serviceAreaId?.city
    ].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch);
  }), [orders, normalizedSearch]);

  const filteredRiders = useMemo(() => riders.filter((rider) => {
    if (!normalizedSearch) {
      return true;
    }

    return [rider.name, rider.phone, rider.email, rider.bikeNumber]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  }), [riders, normalizedSearch]);

  const filteredDealers = useMemo(() => dealers.filter((dealer) => {
    if (!normalizedSearch) {
      return true;
    }

    return [dealer.dealerName, dealer.agencyName, dealer.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  }), [dealers, normalizedSearch]);

  const renderOverview = () => (
    <div className="stack compact-stack">
      <section className="panel handset-shell">
        <p className="eyebrow">Admin control room</p>
        <h2>Launch city by city with serviceable areas and operator onboarding.</h2>
        <p>Keep onboarding, dealer notifications, and launch-area activation in one place so your rollout can start small and expand safely.</p>
      </section>

      <section className="panel handset-shell">
        <div className="table-toolbar">
          <div>
            <h3>Dealer Notifications</h3>
            <p>Review the latest order alerts for any active dealer.</p>
          </div>
          <select value={selectedDealerId} onChange={(event) => setSelectedDealerId(event.target.value)}>
            <option value="">Select dealer</option>
            {dealers.map((dealer) => (
              <option key={dealer._id} value={dealer._id}>{dealer.agencyName}</option>
            ))}
          </select>
        </div>
        <div className="data-list compact-list notification-list top-gap">
          {dealerNotifications.slice(0, 8).map((notification, index) => (
            <div className="management-item" key={`${notification.createdAt}-${index}`}>
              <p>{notification.message}</p>
              <p>
                Order: {notification.orderId?.orderId || "Pending"}
                {notification.customerId?.phone ? ` | Customer: ${notification.customerId.phone}` : ""}
              </p>
            </div>
          ))}
          {!dealerNotifications.length && !loading && <p>No dealer notifications yet.</p>}
        </div>
      </section>
    </div>
  );

  const renderAreas = () => (
    <div className="stack compact-stack">
      <section className="panel handset-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Launch control</p>
            <h2>Serviceable Areas</h2>
            <p>Add the cities or zones where the app should accept bookings right now.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={handleCreateServiceArea}>
          <input placeholder="Area name" value={serviceAreaForm.name} onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, name: event.target.value })} />
          <input placeholder="City" value={serviceAreaForm.city} onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, city: event.target.value })} />
          <input placeholder="Address or landmark" value={serviceAreaForm.address} onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, address: event.target.value })} />
          <div className="two-column-grid form-grid-inline">
            <input placeholder="Latitude" value={serviceAreaForm.latitude} onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, latitude: event.target.value })} />
            <input placeholder="Longitude" value={serviceAreaForm.longitude} onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, longitude: event.target.value })} />
          </div>
          <input placeholder="Radius (km)" value={serviceAreaForm.radiusKm} onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, radiusKm: event.target.value })} />
          <button className="primary-button" type="submit">Launch Area</button>
        </form>
      </section>

      <section className="panel handset-shell">
        <h3>Current Launch Areas</h3>
        <div className="data-list compact-list management-list top-gap">
          {serviceAreas.map((area) => (
            <div className="management-item" key={area._id}>
              <p><strong>{area.name}</strong> - {area.city}</p>
              <p>{area.address || "No landmark"}</p>
              <p>Radius: {area.radiusKm} km | {area.isActive ? "Live" : "Paused"}</p>
              <div className="action-row compact-actions">
                <button className="ghost-button" type="button" onClick={() => toggleServiceArea(area._id, area.isActive)}>
                  {area.isActive ? "Pause" : "Go Live"}
                </button>
                <button className="ghost-button danger-button" type="button" onClick={() => deleteServiceArea(area._id, area.name)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!serviceAreas.length && !loading && <p>No serviceable areas configured yet.</p>}
        </div>
      </section>
    </div>
  );

  const renderDealerForm = () => (
    <section className="panel handset-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin onboarding</p>
          <h2>Onboard Dealer</h2>
          <p>Add a new LPG agency with service location, plan, and login credentials.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleCreateDealer}>
        <input placeholder="Dealer name" value={dealerForm.dealerName} onChange={(event) => setDealerForm({ ...dealerForm, dealerName: event.target.value })} />
        <input placeholder="Agency name" value={dealerForm.agencyName} onChange={(event) => setDealerForm({ ...dealerForm, agencyName: event.target.value })} />
        <input placeholder="Phone" value={dealerForm.phone} inputMode="numeric" maxLength="10" onChange={(event) => setDealerForm({ ...dealerForm, phone: sanitizePhone(event.target.value) })} />
        <input placeholder="Password" type="password" value={dealerForm.password} onChange={(event) => setDealerForm({ ...dealerForm, password: event.target.value })} />
        <input placeholder="Address" value={dealerForm.address} onChange={(event) => setDealerForm({ ...dealerForm, address: event.target.value })} />
        <div className="two-column-grid form-grid-inline">
          <input placeholder="Latitude" value={dealerForm.latitude} onChange={(event) => setDealerForm({ ...dealerForm, latitude: event.target.value })} />
          <input placeholder="Longitude" value={dealerForm.longitude} onChange={(event) => setDealerForm({ ...dealerForm, longitude: event.target.value })} />
        </div>
        <div className="two-column-grid form-grid-inline">
          <input placeholder="Subscription plan" value={dealerForm.subscriptionPlan} onChange={(event) => setDealerForm({ ...dealerForm, subscriptionPlan: event.target.value })} />
          <input placeholder="Commission rate" value={dealerForm.commissionRate} onChange={(event) => setDealerForm({ ...dealerForm, commissionRate: event.target.value })} />
        </div>
        <button className="primary-button" type="submit">Create Dealer</button>
      </form>
    </section>
  );

  const renderRiderForm = () => (
    <section className="panel handset-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin onboarding</p>
          <h2>Onboard Rider</h2>
          <p>Create a rider account with login credentials, bike details, and starting location.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleCreateRider}>
        <input placeholder="Rider name" value={riderForm.name} onChange={(event) => setRiderForm({ ...riderForm, name: event.target.value })} />
        <input placeholder="Email" type="email" value={riderForm.email} onChange={(event) => setRiderForm({ ...riderForm, email: event.target.value.trim().toLowerCase() })} />
        <input placeholder="Phone" value={riderForm.phone} inputMode="numeric" maxLength="10" onChange={(event) => setRiderForm({ ...riderForm, phone: sanitizePhone(event.target.value) })} />
        <input placeholder="Password" type="password" value={riderForm.password} onChange={(event) => setRiderForm({ ...riderForm, password: event.target.value })} />
        <input placeholder="Bike number" value={riderForm.bikeNumber} onChange={(event) => setRiderForm({ ...riderForm, bikeNumber: event.target.value })} />
        <div className="two-column-grid form-grid-inline">
          <input placeholder="Latitude" value={riderForm.latitude} onChange={(event) => setRiderForm({ ...riderForm, latitude: event.target.value })} />
          <input placeholder="Longitude" value={riderForm.longitude} onChange={(event) => setRiderForm({ ...riderForm, longitude: event.target.value })} />
        </div>
        <button className="primary-button" type="submit">Create Rider</button>
      </form>
    </section>
  );

  const renderRegistry = () => (
    <section className="panel registry-panel handset-shell">
      <div className="table-toolbar">
        <div>
          <p className="eyebrow">Admin records</p>
          <h2>Registry Explorer</h2>
          <p>Pick one registry at a time and search by name, contact number, email, or area.</p>
        </div>
        <div className="toolbar-controls registry-controls">
          <select value={registryView} onChange={(event) => setRegistryView(event.target.value)}>
            <option value="orders">Order table</option>
            <option value="riders">Riders table</option>
            <option value="dealers">Dealer table</option>
          </select>
          <input placeholder="Search records" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
      </div>

      {registryView === "orders" && (
        <div className="data-list compact-list management-list top-gap">
          {filteredOrders.map((order) => (
            <div className="management-item" key={order._id}>
              <p><strong>{order.orderId}</strong> - {order.status}</p>
              <p>Customer: {order.customerId?.name || "Unknown"} ({order.customerId?.phone || "No contact"})</p>
              <p>Rider: {order.riderId?.name || "Unassigned"} ({order.riderId?.phone || "No contact"})</p>
              <p>Dealer: {order.dealerId?.agencyName || "Unknown"} ({order.dealerId?.phone || "No contact"})</p>
              <p>Area: {order.serviceAreaId?.name || "No area"}</p>
            </div>
          ))}
          {!filteredOrders.length && !loading && <p>No matching orders found.</p>}
        </div>
      )}

      {registryView === "riders" && (
        <div className="data-list compact-list management-list top-gap">
          {filteredRiders.map((rider) => (
            <div className="management-item" key={rider._id}>
              <p><strong>{rider.name}</strong> - {rider.isActive ? "Active" : "Disabled"}</p>
              <p>Email: {rider.email || "No email"}</p>
              <p>Contact: {rider.phone || "No contact"}</p>
              <p>Bike: {rider.bikeNumber}</p>
              <div className="action-row compact-actions">
                <button className="ghost-button" type="button" onClick={() => toggleRider(rider._id, rider.isActive)}>
                  {rider.isActive ? "Disable" : "Enable"}
                </button>
                <button className="ghost-button danger-button" type="button" onClick={() => deleteRider(rider._id, rider.name)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!filteredRiders.length && !loading && <p>No matching riders found.</p>}
        </div>
      )}

      {registryView === "dealers" && (
        <div className="data-list compact-list management-list top-gap">
          {filteredDealers.map((dealer) => (
            <div className="management-item" key={dealer._id}>
              <p><strong>{dealer.agencyName}</strong> - {dealer.isActive ? "Active" : "Disabled"}</p>
              <p>Dealer: {dealer.dealerName}</p>
              <p>Contact: {dealer.phone || "No contact"}</p>
              <div className="action-row compact-actions">
                <button className="ghost-button" type="button" onClick={() => toggleDealer(dealer._id, dealer.isActive)}>
                  {dealer.isActive ? "Disable" : "Enable"}
                </button>
                <button className="ghost-button danger-button" type="button" onClick={() => deleteDealer(dealer._id, dealer.agencyName)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!filteredDealers.length && !loading && <p>No matching dealers found.</p>}
        </div>
      )}
    </section>
  );

  const renderActivePanel = () => {
    if (activePanel === "areas") {
      return renderAreas();
    }

    if (activePanel === "dealer") {
      return renderDealerForm();
    }

    if (activePanel === "rider") {
      return renderRiderForm();
    }

    if (activePanel === "registry") {
      return renderRegistry();
    }

    return renderOverview();
  };

  if (!loading && !authorized) {
    return (
      <section className="panel auth-panel mobile-auth-card">
        <h1>Admin Only</h1>
        <p className="error-text">This dashboard is only available to admin accounts.</p>
        <button className="primary-button" type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </section>
    );
  }

  return (
    <section className="dashboard-shell">
      <div className="dashboard-stage">
        <aside className="dashboard-slide">
          <div className="dashboard-slide-head">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h2>Admin Tools</h2>
            </div>
            <nav className="dashboard-nav">
              {panelOptions.map((option) => (
                <button
                  key={option.id}
                  className={`dashboard-nav-button ${activePanel === option.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setActivePanel(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </nav>
          </div>

          {error && <section className="panel slim-panel"><p className="error-text">{error}</p></section>}
          {message && <section className="panel slim-panel"><p className="success-text">{message}</p></section>}

          <div className="dashboard-panel-body">
            {loading ? <section className="panel handset-shell"><p>Loading admin workspace...</p></section> : renderActivePanel()}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Dashboard;
