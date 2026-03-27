import React from "react";
const statuses = ["pending", "accepted", "picked", "delivered"];

function OrderStatus({ currentStatus = "pending" }) {
  return (
    <section className="panel">
      <h3>Order Status</h3>
      <div className="status-row">
        {statuses.map((status) => (
          <div
            className={`status-pill ${status === currentStatus ? "active" : ""}`}
            key={status}
          >
            {status}
          </div>
        ))}
      </div>
    </section>
  );
}

export default OrderStatus;

