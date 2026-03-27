import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, requestUserPasswordReset, resetUserPassword } from "../services/api";
import { setStoredRole, setStoredToken } from "../utils/storage";
import { sanitizeOtp, sanitizePhone } from "../utils/form";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetForm, setResetForm] = useState({ email: "", otp: "", newPassword: "" });
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const { data } = await loginUser(form);
      setStoredToken(data.token);
      setStoredRole(data.user.role);
      setResponse(data.user);
      navigate(data.user.role === "admin" ? "/dashboard" : "/");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed");
    }
  };

  const handleRequestOtp = async () => {
    setResetError("");
    setResetMessage("");
    setDemoOtp("");

    try {
      const { data } = await requestUserPasswordReset({ email: resetForm.email });
      setDemoOtp(data.otp || "");
      setResetMessage(
        data.deliveryMode === "demo"
          ? `Email delivery is in demo mode. Use OTP ${data.otp} to continue.`
          : "OTP sent to your registered email."
      );
    } catch (requestError) {
      setResetError(requestError.response?.data?.message || "Unable to send OTP");
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setResetError("");
    setResetMessage("");

    try {
      const { data } = await resetUserPassword(resetForm);
      setResetMessage(data.message);
      setDemoOtp("");
      setForgotOpen(false);
      setResetForm({ email: "", otp: "", newPassword: "" });
    } catch (requestError) {
      setResetError(requestError.response?.data?.message || "Unable to reset password");
    }
  };

  return (
    <section className="panel auth-panel">
      <h1>Login</h1>
      <p className="helper-text">Demo customer: 8888888888 / 123456. Demo admin: 9999999999 / 123456.</p>
      <p className="helper-text">Riders should use <Link to="/rider">Rider Login</Link>.</p>
      <form className="form-grid" onSubmit={handleSubmit}>
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
        <button className="primary-button" type="submit">
          Sign In
        </button>
      </form>
      <button className="text-button" type="button" onClick={() => setForgotOpen((current) => !current)}>
        {forgotOpen ? "Hide forgot password" : "Forgot password?"}
      </button>
      {forgotOpen && (
        <form className="form-grid forgot-card top-gap" onSubmit={handleResetPassword}>
          <input
            placeholder="Registered email"
            type="email"
            value={resetForm.email}
            onChange={(event) => setResetForm({ ...resetForm, email: event.target.value.trim().toLowerCase() })}
          />
          <button className="ghost-button" type="button" onClick={handleRequestOtp}>
            Get OTP On Email
          </button>
          <input
            placeholder="Enter OTP"
            value={resetForm.otp}
            inputMode="numeric"
            maxLength="6"
            onChange={(event) => setResetForm({ ...resetForm, otp: sanitizeOtp(event.target.value) })}
          />
          <input
            placeholder="New password"
            type="password"
            value={resetForm.newPassword}
            onChange={(event) => setResetForm({ ...resetForm, newPassword: event.target.value })}
          />
          <button className="primary-button" type="submit">
            Reset Password
          </button>
          {demoOtp && <p className="helper-text">Demo Email OTP: {demoOtp}</p>}
          {resetMessage && <p className="success-text">{resetMessage}</p>}
          {resetError && <p className="error-text">{resetError}</p>}
        </form>
      )}
      {response && <p>Welcome back, {response.name}.</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default Login;
