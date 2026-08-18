import React from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./components/Dashboard";
import CameraMap from "./components/CameraMap";
import PendingCameras from "./components/PendingCameras";
import ReportCamera from "./components/ReportCamera";

import "./App.css";


// ============================================================
// NAVIGATION
// ============================================================

function Navigation() {
  return (
    <header className="app-header">

      {/* ======================================================
          BRAND
      ====================================================== */}

      <NavLink
        to="/dashboard"
        className="app-brand"
        aria-label="Global Camera Map Dashboard"
      >
        <div className="brand-icon">
          🌍
        </div>

        <div className="brand-text">
          <div className="brand-title">
            Global Camera Map
          </div>

          <div className="brand-subtitle">
            India Traffic Intelligence
          </div>
        </div>
      </NavLink>


      {/* ======================================================
          MAIN NAVIGATION
      ====================================================== */}

      <nav
        className="main-navigation"
        aria-label="Main navigation"
      >

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon" aria-hidden="true">
            🚦
          </span>

          <span className="nav-label">
            Dashboard
          </span>
        </NavLink>


        <NavLink
          to="/map"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon" aria-hidden="true">
            🗺️
          </span>

          <span className="nav-label">
            Camera Map
          </span>
        </NavLink>


        <NavLink
          to="/pending"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon" aria-hidden="true">
            ⏳
          </span>

          <span className="nav-label">
            Pending Reports
          </span>

          <span className="nav-badge">
            0
          </span>
        </NavLink>


        <NavLink
          to="/report"
          className={({ isActive }) =>
            `nav-item report-nav ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon" aria-hidden="true">
            📢
          </span>

          <span className="nav-label">
            Report Camera
          </span>
        </NavLink>

      </nav>


      {/* ======================================================
          API STATUS
      ====================================================== */}

      <div
        className="api-status"
        title="Backend API connection"
      >
        <span
          className="api-dot"
          aria-hidden="true"
        />

        <span className="api-status-text">
          API Online
        </span>
      </div>

    </header>
  );
}


// ============================================================
// APP ROUTES
// ============================================================

function AppRoutes() {
  return (
    <Routes>

      {/* Default route */}

      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />


      {/* Dashboard */}

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />


      {/* Camera Map */}

      <Route
        path="/map"
        element={<CameraMap />}
      />


      {/* Pending Reports */}

      <Route
        path="/pending"
        element={<PendingCameras />}
      />


      {/* Report Camera */}

      <Route
        path="/report"
        element={<ReportCamera />}
      />


      {/* Unknown route */}

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

    </Routes>
  );
}


// ============================================================
// APPLICATION
// ============================================================

function App() {
  return (
    <div className="app-shell">

      <Navigation />

      <main className="app-content">
        <AppRoutes />
      </main>

    </div>
  );
}


// ============================================================
// EXPORT
// ============================================================

export default App;