import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";
import { sanitizePhone } from "../utils/form";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await registerUser(form);
      setMessage("Registration successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 900);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Registration failed");
    }
  };

  return (
    <section className="panel auth-panel">
      <h1>Create account</h1>
      <form className="form-grid" onSubmit={handleSubmit}>
        <input
          placeholder="Full name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value.trim().toLowerCase() })}
        />
        <input
          placeholder="Phone"
          value={form.phone}
          inputMode="numeric"
          maxLength="10"
          onChange={(event) => setForm({ ...form, phone: sanitizePhone(event.target.value) })}
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        <textarea
          placeholder="Address"
          rows="3"
          value={form.address}
          onChange={(event) => setForm({ ...form, address: event.target.value })}
        />
        <button className="primary-button" type="submit">
          Register
        </button>
      </form>
      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default Register;
