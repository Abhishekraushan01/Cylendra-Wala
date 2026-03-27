import React from "react";

const buildMapQuery = (point) => {
  if (!point) {
    return "India";
  }

  if (typeof point.latitude === "number" && typeof point.longitude === "number") {
    return `${point.latitude},${point.longitude}`;
  }

  return point.address || "India";
};

const buildDirectionsLink = ({ origin, destination, travelMode = "driving" }) => {
  const originQuery = encodeURIComponent(buildMapQuery(origin));
  const destinationQuery = encodeURIComponent(buildMapQuery(destination));
  return `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destinationQuery}&travelmode=${travelMode}`;
};

function MapView({
  title = "Live Map",
  description = "Track the delivery route and locations.",
  customerLocation,
  dealerLocation,
  riderLocation,
  mode = "customer"
}) {
  const primaryPoint = riderLocation || customerLocation || dealerLocation;
  const iframeQuery = encodeURIComponent(buildMapQuery(primaryPoint));
  const iframeSrc = `https://maps.google.com/maps?q=${iframeQuery}&z=14&output=embed`;
  const routeLink = buildDirectionsLink({
    origin: riderLocation || dealerLocation,
    destination: customerLocation || dealerLocation
  });
  const dealerToCustomerLink = buildDirectionsLink({
    origin: dealerLocation,
    destination: customerLocation
  });

  return (
    <section className="panel map-panel">
      <div className="map-frame-wrap">
        <iframe
          className="map-frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={iframeSrc}
          title={title}
        />
      </div>
      <div className="map-copy">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="location-list compact-list">
          {dealerLocation && <p><strong>Dealer:</strong> {dealerLocation.address || buildMapQuery(dealerLocation)}</p>}
          {customerLocation && <p><strong>Customer:</strong> {customerLocation.address || buildMapQuery(customerLocation)}</p>}
          {riderLocation && <p><strong>Rider:</strong> {buildMapQuery(riderLocation)}</p>}
        </div>
        <div className="map-actions">
          <a className="ghost-button map-link" href={routeLink} target="_blank" rel="noreferrer">
            {mode === "rider" ? "Open Rider Route" : "Open Live Route"}
          </a>
          {dealerLocation && customerLocation && (
            <a className="ghost-button map-link" href={dealerToCustomerLink} target="_blank" rel="noreferrer">
              Dealer to Customer
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export default MapView;
