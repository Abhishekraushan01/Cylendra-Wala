import React, { useMemo } from "react";

const defaultCenter = {
  latitude: 22.5726,
  longitude: 88.3639
};

function LocationPicker({ latitude, longitude }) {
  const center = useMemo(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }

    return defaultCenter;
  }, [latitude, longitude]);

  const iframeSrc = `https://maps.google.com/maps?q=${center.latitude},${center.longitude}&z=${Number.isFinite(latitude) && Number.isFinite(longitude) ? 16 : 12}&output=embed`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`;

  return (
    <div className="location-picker-shell">
      <div className="location-picker-map-shell">
        <iframe
          className="location-picker-map"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={iframeSrc}
          title="Delivery location preview"
        />
      </div>
      <div className="location-picker-copy">
        <p className="helper-text">Use current location, address search, or manual coordinates to place your delivery point. The preview updates automatically.</p>
        <a className="ghost-button map-link" href={mapsLink} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}

export default LocationPicker;
