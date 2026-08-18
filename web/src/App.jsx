import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";

import Dashboard from "./components/Dashboard";
import CameraMap from "./components/CameraMap";
import PendingCameras from "./components/PendingCameras";
import ReportCamera from "./components/ReportCamera";

import "./App.css";

/* ============================================================
   GLOBAL SETTINGS
============================================================ */

const THEME_KEY = "global-camera-map-theme";

/* ============================================================
   NAVIGATION
============================================================ */

function Navigation({ theme, setTheme }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ----------------------------------------------------------
     Close mobile navigation after route change
  ---------------------------------------------------------- */

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* ----------------------------------------------------------
     Apply theme globally
  ---------------------------------------------------------- */

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    document.body.classList.remove(
      "theme-light",
      "theme-dark"
    );

    document.body.classList.add(
      theme === "dark"
        ? "theme-dark"
        : "theme-light"
    );
  }, [theme]);

  /* ----------------------------------------------------------
     Theme toggle
  ---------------------------------------------------------- */

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark"
        ? "light"
        : "dark"
    );
  };

  /* ----------------------------------------------------------
     Navigation items
  ---------------------------------------------------------- */

  const navItems = [
    {
      path: "/dashboard",
      label: "Overview",
      icon: "◉",
    },
    {
      path: "/map",
      label: "Live Map",
      icon: "◈",
    },
    {
      path: "/pending",
      label: "Reports",
      icon: "◷",
    },
    {
      path: "/report",
      label: "Submit Camera",
      icon: "+",
    },
  ];

  const nextTheme =
    theme === "dark"
      ? "light"
      : "dark";

  return (
    <header className="site-header">
      <div className="header-inner">

        {/* ==================================================
            BRAND
        ================================================== */}

        <NavLink
          to="/dashboard"
          className="brand"
          aria-label="Global Camera Map"
        >
          <div className="brand-copy">
            <strong>
              GLOBAL CAMERA MAP
            </strong>

            <span>
              TRAFFIC INTELLIGENCE PLATFORM
            </span>
          </div>
        </NavLink>

        {/* ==================================================
            DESKTOP NAVIGATION
        ================================================== */}

        <nav
          className="desktop-nav"
          aria-label="Primary navigation"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span
                className="nav-icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>

              {item.path === "/pending" && (
                <span className="nav-badge">
                  0
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ==================================================
            HEADER ACTIONS
        ================================================== */}

        <div className="header-actions">

          {/* SYSTEM STATUS */}

          <div
            className="system-status"
            aria-label="System status operational"
          >
            <span
              className="status-pulse"
              aria-hidden="true"
            />

            <div>
              <small>
                SYSTEM STATUS
              </small>

              <strong>
                OPERATIONAL
              </strong>
            </div>
          </div>

          {/* THEME TOGGLE */}

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
          >
            <span
              className="theme-icon"
              aria-hidden="true"
            >
              {theme === "dark"
                ? "☀"
                : "☾"}
            </span>

            <span className="theme-label">
              {theme === "dark"
                ? "Light"
                : "Dark"}
            </span>
          </button>

          {/* MOBILE MENU */}

          <button
            type="button"
            className={`mobile-menu-button ${
              mobileOpen ? "open" : ""
            }`}
            onClick={() =>
              setMobileOpen(
                (current) => !current
              )
            }
            aria-label={
              mobileOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={mobileOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* ====================================================
          MOBILE NAVIGATION
      ==================================================== */}

      <div
        className={`mobile-navigation ${
          mobileOpen
            ? "mobile-navigation-open"
            : ""
        }`}
      >
        <div className="mobile-navigation-inner">

          {/* MOBILE SYSTEM STATUS */}

          <div className="mobile-system-card">
            <span
              className="status-pulse"
              aria-hidden="true"
            />

            <div>
              <small>
                SYSTEM STATUS
              </small>

              <strong>
                OPERATIONAL
              </strong>
            </div>
          </div>

          {/* MOBILE NAV LINKS */}

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `mobile-nav-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span
                className="mobile-nav-icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>

              {item.path === "/pending" && (
                <span className="mobile-nav-badge">
                  0
                </span>
              )}
            </NavLink>
          ))}

          {/* MOBILE THEME BUTTON */}

          <button
            type="button"
            className="mobile-theme-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} mode`}
          >
            <span aria-hidden="true">
              {theme === "dark"
                ? "☀"
                : "☾"}
            </span>

            <span>
              Switch to{" "}
              {theme === "dark"
                ? "Light"
                : "Dark"}{" "}
              Mode
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   APP SHELL
============================================================ */

function AppShell() {

  /* ----------------------------------------------------------
     Load saved theme
     
     Default:
     LIGHT
     
     Saved selection:
     localStorage
  ---------------------------------------------------------- */

  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme =
        localStorage.getItem(
          THEME_KEY
        );

      if (
        savedTheme === "light" ||
        savedTheme === "dark"
      ) {
        return savedTheme;
      }
    } catch (error) {
      console.warn(
        "Unable to read saved theme:",
        error
      );
    }

    return "light";
  });

  /* ----------------------------------------------------------
     Persist theme + apply globally
  ---------------------------------------------------------- */

  useEffect(() => {
    try {
      localStorage.setItem(
        THEME_KEY,
        theme
      );
    } catch (error) {
      console.warn(
        "Unable to save theme:",
        error
      );
    }

    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    document.body.classList.remove(
      "theme-light",
      "theme-dark"
    );

    document.body.classList.add(
      theme === "dark"
        ? "theme-dark"
        : "theme-light"
    );
  }, [theme]);

  /* ----------------------------------------------------------
     Application
  ---------------------------------------------------------- */

  return (
    <div
      className={`app ${
        theme === "dark"
          ? "app-dark"
          : "app-light"
      }`}
    >

      {/* GLOBAL HEADER */}

      <Navigation
        theme={theme}
        setTheme={setTheme}
      />

      {/* APPLICATION CONTENT */}

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
              LIVE CAMERA MAP
          ================================================== */}

          <Route
            path="/map"
            element={
              <CameraMap />
            }
          />

          {/* ==================================================
              REPORTS / PENDING CAMERAS
          ================================================== */}

          <Route
            path="/pending"
            element={
              <PendingCameras />
            }
          />

          {/* ==================================================
              SUBMIT CAMERA
          ================================================== */}

          <Route
            path="/report"
            element={
              <ReportCamera />
            }
          />

          {/* ==================================================
              FALLBACK
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

/* ============================================================
   APP ENTRY
============================================================ */

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}