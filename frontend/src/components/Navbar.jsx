import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { clearStoredToken, getStoredRole, getStoredToken } from "../utils/storage";

function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(getStoredToken());
  const role = getStoredRole();

  const handleLogout = () => {
    clearStoredToken();
    navigate("/");
    window.location.reload();
  };

  const getNavClassName = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`.trim();

  return (
    <header className="navbar">
      <div>
        <p className="eyebrow">LPG Delivery Aggregator</p>
        <NavLink className="brand" to="/">
          Cylendra Wala
        </NavLink>
      </div>
      <nav className="nav-links mobile-bottom-nav">
        <NavLink className={getNavClassName} to="/" end>
          Home
        </NavLink>
        {role === "admin" && (
          <NavLink className={getNavClassName} to="/dashboard">
            Dashboard
          </NavLink>
        )}
        {!isLoggedIn && (
          <NavLink className={getNavClassName} to="/login">
            Login
          </NavLink>
        )}
        {!isLoggedIn && (
          <NavLink className={getNavClassName} to="/register">
            Register
          </NavLink>
        )}
        {!isLoggedIn && (
          <NavLink className={getNavClassName} to="/rider">
            Rider
          </NavLink>
        )}
        {!isLoggedIn && (
          <NavLink className={getNavClassName} to="/dealer">
            Dealer
          </NavLink>
        )}
        {isLoggedIn && (
          <button className="ghost-button logout-nav-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
