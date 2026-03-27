import React from "react";
function OrderButton({ onClick, label = "Book Cylinder", disabled = false }) {
  return (
    <button className="primary-button" onClick={onClick} type="button" disabled={disabled}>
      {label}
    </button>
  );
}

export default OrderButton;

