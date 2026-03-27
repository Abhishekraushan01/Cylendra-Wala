import React from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import DealerPanel from "./pages/DealerPanel";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RiderPanel from "./pages/RiderPanel";

function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rider" element={<RiderPanel />} />
          <Route path="/dealer" element={<DealerPanel />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
