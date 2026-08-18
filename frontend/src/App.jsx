import React from "react";
import {
  NavLink,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Dashboard from "./components/Dashboard";
import CameraMap from "./components/CameraMap";
import CameraDetails from "./components/CameraDetails";
import PendingCameras from "./components/PendingCameras";
import ReportCamera from "./components/ReportCamera";

import "./App.css";


/* ============================================================
   NAVIGATION
   ============================================================ */

function Navigation() {
  return (
    <header className="app-header">

      {/* BRAND */}

      <NavLink
        to="/dashboard"
        className="app-brand"
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


      {/* NAVIGATION */}

      <nav className="main-navigation">

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">
            🚦
          </span>

          <span>
            Dashboard
          </span>
        </NavLink>


        <NavLink
          to="/map"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">
            🗺️
          </span>

          <span>
            Camera Map
          </span>
        </NavLink>


        <NavLink
          to="/pending"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">
            ⏳
          </span>

          <span>
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
          <span className="nav-icon">
            📢
          </span>

          <span>
            Report Camera
          </span>
        </NavLink>

      </nav>


      {/* API STATUS */}

      <div className="api-status">

        <span className="api-dot"></span>

        <span className="api-status-text">
          API Online
        </span>

      </div>

    </header>
  );
}


/* ============================================================
   APP
   ============================================================ */

function App() {
  return (
    <div className="app-shell">

      <Navigation />

      <main className="app-content">

        <Routes>

          {/* DASHBOARD */}

          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/dashboard"
            element={
              <Dashboard />
            }
          />


          {/* CAMERA MAP */}

          <Route
            path="/map"
            element={
              <CameraMap />
            }
          />


          {/* CAMERA DETAILS */}

          <Route
            path="/camera/:cameraId"
            element={
              <CameraDetails />
            }
          />


          {/* PENDING REPORTS */}

          <Route
            path="/pending"
            element={
              <PendingCameras />
            }
          />


          {/* REPORT CAMERA */}

          <Route
            path="/report"
            element={
              <ReportCamera />
            }
          />


          {/* FALLBACK */}

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

      </main>

    </div>
  );
}


export default App;