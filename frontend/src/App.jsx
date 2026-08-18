import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./components/Dashboard";
import CameraMap from "./components/CameraMap";
import PendingCameras from "./components/PendingCameras";
import ReportCamera from "./components/ReportCamera";

import "./App.css";


// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// NAVIGATION
// ============================================================

function Navigation({ pendingCount }) {
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
          <span className="nav-icon">
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
          <span className="nav-icon">
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
          <span className="nav-icon">
            ⏳
          </span>

          <span className="nav-label">
            Pending Reports
          </span>

          <span className="nav-badge">
            {pendingCount}
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
        title="Backend API status"
      >
        <span className="api-dot"></span>

        <span className="api-status-text">
          API Online
        </span>
      </div>

    </header>
  );
}


// ============================================================
// APP
// ============================================================

function App() {

  const [pendingCount, setPendingCount] = useState(0);


  // ==========================================================
  // LOAD PENDING REPORT COUNT
  // ==========================================================

  const loadPendingCount = useCallback(async () => {
    try {

      const response = await fetch(
        `${API_URL}/api/reports/pending`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Pending reports API returned HTTP ${response.status}`
        );
      }

      const data = await response.json();


      // Backend normally returns:
      //
      // {
      //   count: 2,
      //   reports: [...]
      // }

      if (
        typeof data?.count === "number"
      ) {
        setPendingCount(data.count);
        return;
      }


      // Fallback if API returns an array.

      if (Array.isArray(data)) {
        setPendingCount(data.length);
        return;
      }


      // Fallback if reports exists.

      if (Array.isArray(data?.reports)) {
        setPendingCount(
          data.reports.length
        );
        return;
      }


      setPendingCount(0);

    } catch (error) {

      console.error(
        "Failed to load pending report count:",
        error
      );

      // Do not break the application
      // if this endpoint is temporarily unavailable.

      setPendingCount(0);
    }
  }, []);


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    loadPendingCount();

  }, [loadPendingCount]);


  // ==========================================================
  // REFRESH PENDING COUNT
  // ==========================================================

  useEffect(() => {

    const interval = setInterval(() => {
      loadPendingCount();
    }, 30000);

    return () => {
      clearInterval(interval);
    };

  }, [loadPendingCount]);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="app-shell">

      {/* ====================================================
          HEADER
      ===================================================== */}

      <Navigation
        pendingCount={pendingCount}
      />


      {/* ====================================================
          APPLICATION CONTENT
      ===================================================== */}

      <main className="app-content">

        <Routes>

          {/* ==================================================
              ROOT
          ================================================== */}

          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />


          {/* ==================================================
              DASHBOARD
          ================================================== */}

          <Route
            path="/dashboard"
            element={
              <Dashboard />
            }
          />


          {/* ==================================================
              CAMERA MAP
          ================================================== */}

          <Route
            path="/map"
            element={
              <CameraMap />
            }
          />


          {/* ==================================================
              PENDING REPORTS
          ================================================== */}

          <Route
            path="/pending"
            element={
              <PendingCameras />
            }
          />


          {/* ==================================================
              REPORT CAMERA
          ================================================== */}

          <Route
            path="/report"
            element={
              <ReportCamera />
            }
          />


          {/* ==================================================
              UNKNOWN ROUTE
          ================================================== */}

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


// ============================================================
// EXPORT
// ============================================================

export default App;