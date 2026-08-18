import React from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./pages/Dashboard.jsx";
import CameraMap from "./components/CameraMap.jsx";
import PendingCameras from "./components/PendingCameras.jsx";
import ReportCamera from "./components/ReportCamera.jsx";

import "./App.css";

// ============================================================
// NAVIGATION
// ============================================================

function Navigation() {
  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: "▦",
    },
    {
      path: "/map",
      label: "Camera Map",
      icon: "⌖",
    },
    {
      path: "/pending",
      label: "Pending Reports",
      icon: "◷",
    },
    {
      path: "/report",
      label: "Report Camera",
      icon: "＋",
    },
  ];

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* BRAND */}
        <NavLink to="/dashboard" className="app-brand">
          <div className="app-brand-mark">
            <span className="brand-camera">●</span>
            <span className="brand-signal signal-one" />
            <span className="brand-signal signal-two" />
          </div>

          <div className="app-brand-text">
            <strong>Global Camera Map</strong>
            <span>India Traffic Intelligence</span>
          </div>
        </NavLink>

        {/* NAVIGATION */}
        <nav className="app-navigation" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `app-nav-link ${
                  isActive ? "app-nav-link-active" : ""
                }`
              }
            >
              <span className="app-nav-icon">{item.icon}</span>
              <span>{item.label}</span>

              {item.path === "/pending" && (
                <span className="nav-badge">0</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* API STATUS */}
        <div className="header-api-status">
          <span className="api-status-dot" />
          <span>API Online</span>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// APP FOOTER
// ============================================================

function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">●</span>

          <div>
            <strong>Global Camera Map</strong>
            <span>
              Traffic enforcement intelligence platform
            </span>
          </div>
        </div>

        <div className="footer-status">
          <span className="api-status-dot" />
          System operational
        </div>

        <div className="footer-copy">
          © {new Date().getFullYear()} Global Camera Map
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// PAGE SHELL
// ============================================================

function PageShell({ children }) {
  return (
    <div className="app-shell">
      <Navigation />

      <main className="app-main">
        {children}
      </main>

      <AppFooter />
    </div>
  );
}

// ============================================================
// NOT FOUND
// ============================================================

function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-icon">⌖</div>

        <span className="panel-eyebrow">
          PAGE NOT FOUND
        </span>

        <h1>Nothing here.</h1>

        <p>
          The page you're looking for doesn't exist
          or may have moved.
        </p>

        <NavLink
          to="/dashboard"
          className="not-found-button"
        >
          Return to Dashboard
        </NavLink>
      </div>
    </div>
  );
}

// ============================================================
// APP
// ============================================================

export default function App() {
  return (
    <PageShell>
      <Routes>
        {/* DEFAULT ROUTE */}
        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* CAMERA MAP */}
        <Route
          path="/map"
          element={<CameraMap />}
        />

        {/* PENDING REPORTS */}
        <Route
          path="/pending"
          element={<PendingCameras />}
        />

        {/* REPORT CAMERA */}
        <Route
          path="/report"
          element={<ReportCamera />}
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>
    </PageShell>
  );
}