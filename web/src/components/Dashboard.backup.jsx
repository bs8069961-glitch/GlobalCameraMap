import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
const API_URL = "http://127.0.0.1:8000";

function normalizeCameraType(type) {
  const value = String(type || "").toLowerCase();

  if (
    value.includes("speed") ||
    value.includes("velocity")
  ) {
    return "speed";
  }

  if (
    value.includes("red") ||
    value.includes("signal") ||
    value.includes("traffic light")
  ) {
    return "red";
  }

  return "other";
}

function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [cameraResponse, reportResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/cameras`),
            fetch(`${API_URL}/api/reports/pending`),
          ]);

        if (!cameraResponse.ok) {
          throw new Error(
            `Camera API returned HTTP ${cameraResponse.status}`
          );
        }

        if (!reportResponse.ok) {
          throw new Error(
            `Reports API returned HTTP ${reportResponse.status}`
          );
        }

        const cameraData =
          await cameraResponse.json();

        const reportData =
          await reportResponse.json();

        let cameraList = [];

        if (Array.isArray(cameraData)) {
          cameraList = cameraData;
        } else if (
          Array.isArray(cameraData?.cameras)
        ) {
          cameraList = cameraData.cameras;
        }

        let reportCount = 0;

        if (typeof reportData?.count === "number") {
          reportCount = reportData.count;
        } else if (Array.isArray(reportData)) {
          reportCount = reportData.length;
        } else if (
          Array.isArray(reportData?.reports)
        ) {
          reportCount = reportData.reports.length;
        }

        if (!cancelled) {
          setCameras(cameraList);
          setPendingCount(reportCount);
          setApiOnline(true);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setApiOnline(false);
          setError(
            err.message ||
              "Unable to load dashboard data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const statistics = useMemo(() => {
    const speed = cameras.filter(
      (camera) =>
        normalizeCameraType(
          camera.camera_type
        ) === "speed"
    ).length;

    const red = cameras.filter(
      (camera) =>
        normalizeCameraType(
          camera.camera_type
        ) === "red"
    ).length;

    const other =
      cameras.length - speed - red;

    const verified = cameras.filter(
      (camera) =>
        String(
          camera.verification_status || ""
        ).toLowerCase() === "verified"
    ).length;

    const pendingVerification =
      cameras.filter(
        (camera) =>
          String(
            camera.verification_status || ""
          ).toLowerCase() === "pending"
      ).length;

    const cities = new Set(
      cameras
        .map((camera) => camera.city)
        .filter(Boolean)
        .map((city) =>
          String(city).trim().toLowerCase()
        )
    ).size;

    const states = new Set(
      cameras
        .map((camera) => camera.state)
        .filter(Boolean)
        .map((state) =>
          String(state).trim().toLowerCase()
        )
    ).size;

    return {
      total: cameras.length,
      speed,
      red,
      other,
      verified,
      pendingVerification,
      cities,
      states,
    };
  }, [cameras]);

  const verificationPercentage =
    statistics.total > 0
      ? Math.round(
          (statistics.verified /
            statistics.total) *
            100
        )
      : 0;

  const typePercentage = (value) =>
    statistics.total > 0
      ? Math.round(
          (value / statistics.total) * 100
        )
      : 0;

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-orb">
          <span>🌍</span>
        </div>

        <h2>Loading Global Camera Intelligence</h2>

        <p>
          Connecting to the camera network...
        </p>

        <div className="loading-bar">
          <div />
        </div>
      </div>
    );
  }

  return (
    <main className="dashboard-page">
      {/* HERO */}

      <section className="dashboard-hero">
        <div className="hero-background-orb hero-orb-one" />
        <div className="hero-background-orb hero-orb-two" />

        <div className="hero-content">
          <div className="hero-kicker">
            <span className="live-dot" />
            LIVE TRAFFIC INTELLIGENCE
          </div>

          <h1>
            Global Camera
            <span> Network</span>
          </h1>

          <p>
            Monitor traffic enforcement cameras,
            verification activity and reported
            locations from one unified dashboard.
          </p>

          <div className="hero-actions">
            <Link
              to="/map"
              className="hero-primary-button"
            >
              🗺️ Explore Camera Map
              <span>→</span>
            </Link>

            <Link
              to="/report"
              className="hero-secondary-button"
            >
              📢 Report a Camera
            </Link>
          </div>
        </div>

        <div className="hero-status-card">
          <div className="status-card-header">
            <span>NETWORK STATUS</span>

            <span
              className={
                apiOnline
                  ? "status-pill online"
                  : "status-pill offline"
              }
            >
              <span />
              {apiOnline
                ? "ONLINE"
                : "OFFLINE"}
            </span>
          </div>

          <div className="status-card-value">
            {statistics.total}
          </div>

          <div className="status-card-label">
            Cameras currently indexed
          </div>

          <div className="status-card-footer">
            <span>
              ● Database connected
            </span>

            <span>
              API {apiOnline ? "Healthy" : "Unavailable"}
            </span>
          </div>
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <section className="dashboard-error">
          <strong>Dashboard connection issue</strong>
          <span>{error}</span>
        </section>
      )}

      {/* STATISTICS */}

      <section className="stats-grid">
        <div className="stat-card stat-main">
          <div className="stat-icon">📷</div>

          <div className="stat-content">
            <span className="stat-label">
              TOTAL CAMERAS
            </span>

            <strong>
              {statistics.total}
            </strong>

            <span className="stat-subtitle">
              Across the indexed network
            </span>
          </div>

          <div className="stat-decoration">
            01
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon speed-icon">
            🚗
          </div>

          <div className="stat-content">
            <span className="stat-label">
              SPEED CAMERAS
            </span>

            <strong>
              {statistics.speed}
            </strong>

            <span className="stat-subtitle">
              {typePercentage(statistics.speed)}%
              of network
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red-icon">
            🚦
          </div>

          <div className="stat-content">
            <span className="stat-label">
              RED LIGHT
            </span>

            <strong>
              {statistics.red}
            </strong>

            <span className="stat-subtitle">
              {typePercentage(statistics.red)}%
              of network
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon city-icon">
            🏙️
          </div>

          <div className="stat-content">
            <span className="stat-label">
              CITIES
            </span>

            <strong>
              {statistics.cities}
            </strong>

            <span className="stat-subtitle">
              {statistics.states} states / regions
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon verified-icon">
            ✓
          </div>

          <div className="stat-content">
            <span className="stat-label">
              VERIFIED
            </span>

            <strong>
              {statistics.verified}
            </strong>

            <span className="stat-subtitle">
              {verificationPercentage}% verified
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending-icon">
            ⏳
          </div>

          <div className="stat-content">
            <span className="stat-label">
              PENDING REPORTS
            </span>

            <strong>
              {pendingCount}
            </strong>

            <span className="stat-subtitle">
              Community submissions
            </span>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}

      <section className="dashboard-columns">
        {/* CAMERA DISTRIBUTION */}

        <div className="dashboard-panel distribution-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">
                NETWORK ANALYTICS
              </span>

              <h2>
                Camera Distribution
              </h2>
            </div>

            <span className="panel-badge">
              LIVE
            </span>
          </div>

          <div className="distribution-content">
            <div className="donut-wrapper">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(
                    #2563eb 0 ${typePercentage(
                      statistics.speed
                    )}%,
                    #ef4444 ${typePercentage(
                      statistics.speed
                    )}% ${typePercentage(
                      statistics.speed +
                        statistics.red
                    )}%,
                    #94a3b8 ${typePercentage(
                      statistics.speed +
                        statistics.red
                    )}% 100%
                  )`,
                }}
              >
                <div className="donut-inner">
                  <strong>
                    {statistics.total}
                  </strong>

                  <span>
                    cameras
                  </span>
                </div>
              </div>
            </div>

            <div className="distribution-list">
              <div className="distribution-row">
                <div>
                  <span className="legend-dot speed-dot" />
                  <span>
                    Speed Cameras
                  </span>
                </div>

                <strong>
                  {statistics.speed}
                </strong>
              </div>

              <div className="distribution-row">
                <div>
                  <span className="legend-dot red-dot" />
                  <span>
                    Red Light Cameras
                  </span>
                </div>

                <strong>
                  {statistics.red}
                </strong>
              </div>

              <div className="distribution-row">
                <div>
                  <span className="legend-dot other-dot" />
                  <span>
                    Other Cameras
                  </span>
                </div>

                <strong>
                  {statistics.other}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* VERIFICATION */}

        <div className="dashboard-panel verification-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">
                DATA QUALITY
              </span>

              <h2>
                Verification Status
              </h2>
            </div>
          </div>

          <div className="verification-number">
            {verificationPercentage}
            <span>%</span>
          </div>

          <div className="verification-track">
            <div
              style={{
                width: `${verificationPercentage}%`,
              }}
            />
          </div>

          <div className="verification-stats">
            <div>
              <strong>
                {statistics.verified}
              </strong>

              <span>Verified</span>
            </div>

            <div>
              <strong>
                {statistics.pendingVerification}
              </strong>

              <span>Pending</span>
            </div>
          </div>

          <p className="panel-description">
            Camera records are continuously
            reviewed to improve the quality and
            reliability of the map.
          </p>
        </div>
      </section>

      {/* QUICK ACTIONS */}

      <section className="quick-section">
        <div className="section-title">
          <span className="panel-eyebrow">
            QUICK ACCESS
          </span>

          <h2>
            What would you like to do?
          </h2>
        </div>

        <div className="quick-grid">
          <Link
            to="/map"
            className="quick-card map-action"
          >
            <div className="quick-card-icon">
              🗺️
            </div>

            <div>
              <h3>
                Explore Camera Map
              </h3>

              <p>
                Browse cameras, locations and
                route coverage.
              </p>
            </div>

            <span className="quick-arrow">
              →
            </span>
          </Link>

          <Link
            to="/pending"
            className="quick-card reports-action"
          >
            <div className="quick-card-icon">
              ⏳
            </div>

            <div>
              <h3>
                Review Reports
              </h3>

              <p>
                Review and verify community
                camera submissions.
              </p>
            </div>

            <span className="quick-count">
              {pendingCount}
            </span>
          </Link>

          <Link
            to="/report"
            className="quick-card report-action"
          >
            <div className="quick-card-icon">
              📢
            </div>

            <div>
              <h3>
                Report a Camera
              </h3>

              <p>
                Help expand and improve the
                camera database.
              </p>
            </div>

            <span className="quick-arrow">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* FOOTER STATUS */}

      <section className="dashboard-footer-status">
        <div>
          <span className="live-dot" />
          <strong>
            Global Camera Network
          </strong>
        </div>

        <div>
          {statistics.total} cameras
          &nbsp;•&nbsp;
          {statistics.cities} cities
          &nbsp;•&nbsp;
          {statistics.verified} verified
        </div>
      </section>
    </main>
  );
}

export default Dashboard;