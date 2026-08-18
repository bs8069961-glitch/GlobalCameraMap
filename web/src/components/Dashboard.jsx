import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [pendingReports, setPendingReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState("CHECKING");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);

        const [cameraResponse, reportResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/cameras`),
            fetch(`${API_URL}/api/reports/pending`),
          ]);

        if (!cameraResponse.ok) {
          throw new Error("Camera API request failed");
        }

        const cameraData = await cameraResponse.json();

        let cameraList = [];

        if (Array.isArray(cameraData)) {
          cameraList = cameraData;
        } else if (Array.isArray(cameraData?.cameras)) {
          cameraList = cameraData.cameras;
        } else if (Array.isArray(cameraData?.data)) {
          cameraList = cameraData.data;
        }

        let reportCount = 0;

        if (reportResponse.ok) {
          const reportData = await reportResponse.json();

          if (Array.isArray(reportData)) {
            reportCount = reportData.length;
          } else if (
            typeof reportData?.count === "number"
          ) {
            reportCount = reportData.count;
          } else if (
            Array.isArray(reportData?.reports)
          ) {
            reportCount = reportData.reports.length;
          }
        }

        if (!mounted) return;

        setCameras(cameraList);
        setPendingReports(reportCount);
        setApiStatus("HEALTHY");
      } catch (error) {
        console.error(
          "Dashboard data loading error:",
          error
        );

        if (!mounted) return;

        setApiStatus("UNAVAILABLE");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    const interval = setInterval(
      loadDashboard,
      30000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    const total = cameras.length;

    const speedCameras = cameras.filter((camera) => {
      const type = String(
        camera.camera_type ||
          camera.type ||
          camera.enforcement_type ||
          ""
      ).toLowerCase();

      return (
        type.includes("speed") ||
        type.includes("velocity")
      );
    }).length;

    const redLightCameras = cameras.filter(
      (camera) => {
        const type = String(
          camera.camera_type ||
            camera.type ||
            camera.enforcement_type ||
            ""
        ).toLowerCase();

        return (
          type.includes("red") ||
          type.includes("traffic signal") ||
          type.includes("signal")
        );
      }
    ).length;

    const verified = cameras.filter((camera) => {
      const value = String(
        camera.verification_status ||
          camera.verification ||
          ""
      ).toLowerCase();

      return (
        value === "verified" ||
        value === "approved" ||
        value === "confirmed"
      );
    }).length;

    const cities = new Set(
      cameras
        .map((camera) =>
          String(camera.city || "").trim()
        )
        .filter(Boolean)
        .map((city) => city.toLowerCase())
    ).size;

    const states = new Set(
      cameras
        .map((camera) =>
          String(
            camera.state ||
              camera.region ||
              ""
          ).trim()
        )
        .filter(Boolean)
        .map((state) => state.toLowerCase())
    ).size;

    const pendingVerification = Math.max(
      total - verified,
      0
    );

    const otherCameras = Math.max(
      total -
        speedCameras -
        redLightCameras,
      0
    );

    const percentage = (value) =>
      total > 0
        ? Math.round((value / total) * 100)
        : 0;

    return {
      total,
      speedCameras,
      redLightCameras,
      otherCameras,
      verified,
      pendingVerification,
      cities,
      states,
      verifiedPercentage: percentage(verified),
      speedPercentage: percentage(speedCameras),
      redLightPercentage:
        percentage(redLightCameras),
      otherPercentage:
        percentage(otherCameras),
    };
  }, [cameras]);

  const {
    total,
    speedCameras,
    redLightCameras,
    otherCameras,
    verified,
    pendingVerification,
    cities,
    states,
    verifiedPercentage,
    speedPercentage,
    redLightPercentage,
    otherPercentage,
  } = stats;

  const displayRegions =
    states > 0 ? states : 23;

  const displayCities =
    cities > 0 ? cities : 0;

  return (
    <div className="dashboard">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="dashboard-hero">

        <div className="hero-copy">

          <div className="eyebrow">
            <span>GCM</span>
            <span>/</span>
            <span>NETWORK</span>
            <span>/</span>
            <span>LIVE</span>
          </div>

          <div className="hero-live-label">
            <span className="live-dot" />
            LIVE TRAFFIC INTELLIGENCE
          </div>

          <h1>
            Global Camera
            <span>Network</span>
          </h1>

          <p>
            A unified intelligence platform for
            monitoring traffic enforcement cameras,
            verification activity and community
            reports.
          </p>

          <div className="hero-actions">

            <Link
              to="/map"
              className="primary-action"
            >
              <span>Explore Live Map</span>
              <span>→</span>
            </Link>

            <Link
              to="/report"
              className="secondary-action"
            >
              <span>+</span>
              <span>Report Camera</span>
            </Link>

          </div>
        </div>

        {/* NETWORK STATUS */}

        <div className="hero-status-panel">

          <div className="status-panel-top">
            <div>
              <span className="status-kicker">
                NETWORK STATUS
              </span>

              <strong>
                OPERATIONAL
              </strong>
            </div>

            <span className="status-indicator">
              <span className="live-dot" />
            </span>
          </div>

          <div className="status-main-number">
            {loading ? "—" : total}
          </div>

          <div className="status-main-label">
            CAMERA RECORDS INDEXED
          </div>

          <div className="status-divider" />

          <div className="status-health-grid">

            <div>
              <span>DATABASE</span>
              <strong>
                CONNECTED
              </strong>
            </div>

            <div>
              <span>API</span>
              <strong
                className={
                  apiStatus === "HEALTHY"
                    ? "health-good"
                    : ""
                }
              >
                {apiStatus}
              </strong>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          NETWORK OVERVIEW
      ===================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>
            <span className="section-code">
              GCM / 01
            </span>

            <h2>
              Network Overview
            </h2>

            <p>
              Intelligence at a glance
            </p>
          </div>

          <div className="section-live">
            <span className="live-dot" />
            LIVE DATA
          </div>

        </div>

        <div className="stats-grid">

          <StatCard
            number="01"
            icon="◉"
            label="TOTAL CAMERAS"
            value={total}
            description="Across the indexed network"
          />

          <StatCard
            number="02"
            icon="⌁"
            label="SPEED CAMERAS"
            value={speedCameras}
            description={`${speedPercentage}% of network`}
          />

          <StatCard
            number="03"
            icon="◈"
            label="RED LIGHT"
            value={redLightCameras}
            description={`${redLightPercentage}% of network`}
          />

          <StatCard
            number="04"
            icon="◇"
            label="CITIES"
            value={displayCities}
            description="Across indexed regions"
          />

          <StatCard
            number="05"
            icon="✓"
            label="VERIFIED"
            value={verified}
            description={`${verifiedPercentage}% verified`}
          />

          <StatCard
            number="06"
            icon="+"
            label="PENDING REPORTS"
            value={pendingReports}
            description="Community submissions"
          />

        </div>

        <div className="nominal-banner">
          <span className="nominal-icon">
            ✓
          </span>

          <div>
            <strong>
              ALL SYSTEMS NOMINAL
            </strong>

            <span>
              Camera network operating normally
            </span>
          </div>
        </div>

      </section>

      {/* =====================================================
          ANALYTICS
      ===================================================== */}

      <section className="dashboard-section analytics-section">

        <div className="section-heading">

          <div>
            <span className="section-code">
              NETWORK ANALYTICS
            </span>

            <h2>
              Camera Intelligence
            </h2>

            <p>
              Distribution and data quality across
              the indexed network.
            </p>
          </div>

          <div className="section-live">
            <span className="live-dot" />
            LIVE
          </div>

        </div>

        <div className="analytics-grid">

          {/* CAMERA DISTRIBUTION */}

          <article className="analytics-card">

            <div className="analytics-card-header">

              <div>
                <span className="analytics-number">
                  01
                </span>

                <h3>
                  Camera Distribution
                </h3>
              </div>

              <span className="analytics-label">
                DISTRIBUTION
              </span>

            </div>

            <div className="distribution-total">
              <strong>
                {total}
              </strong>

              <span>
                CAMERAS
              </span>
            </div>

            <DistributionRow
              label="Speed Cameras"
              value={speedCameras}
              percentage={speedPercentage}
            />

            <DistributionRow
              label="Red Light Cameras"
              value={redLightCameras}
              percentage={redLightPercentage}
            />

            <DistributionRow
              label="Other Cameras"
              value={otherCameras}
              percentage={otherPercentage}
            />

            <div className="analytics-footer">
              <span>
                ALL CAMERA RECORDS
              </span>

              <strong>
                {total}
              </strong>

              <span>
                ACTIVE INDEX
              </span>
            </div>

          </article>

          {/* VERIFICATION */}

          <article className="analytics-card">

            <div className="analytics-card-header">

              <div>
                <span className="analytics-number">
                  02
                </span>

                <h3>
                  Verification Status
                </h3>
              </div>

              <span className="analytics-label">
                DATA QUALITY
              </span>

            </div>

            <div className="verification-content">

              <div className="verification-ring">
                <div
                  className="verification-ring-progress"
                  style={{
                    "--verification":
                      `${verifiedPercentage * 3.6}deg`,
                  }}
                >
                  <div>
                    <strong>
                      {verifiedPercentage}%
                    </strong>

                    <span>
                      VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              <div className="verification-copy">

                <div className="coverage-label">
                  NETWORK COVERAGE
                </div>

                <strong>
                  {verifiedPercentage}%
                </strong>

                <p>
                  {verified} verified records
                </p>

              </div>

            </div>

            <div className="verification-list">

              <div>
                <span>
                  <i className="legend-dot verified" />
                  Verified
                </span>

                <strong>
                  {verified}
                </strong>
              </div>

              <div>
                <span>
                  <i className="legend-dot pending" />
                  Pending
                </span>

                <strong>
                  {pendingVerification}
                </strong>
              </div>

              <div>
                <span>
                  <i className="legend-dot total" />
                  Total
                </span>

                <strong>
                  {total}
                </strong>
              </div>

            </div>

            <p className="analytics-note">
              Camera records are continuously
              reviewed to improve network
              reliability and data quality.
            </p>

          </article>

        </div>
      </section>

      {/* =====================================================
          SYSTEM MONITOR
      ===================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>
            <span className="section-code">
              SYSTEM MONITOR
            </span>

            <h2>
              Live Network Activity
            </h2>

            <p>
              Real-time platform status.
            </p>
          </div>

          <div className="section-live">
            <span className="live-dot" />
            LIVE
          </div>

        </div>

        <div className="monitor-grid">

          <MonitorCard
            category="DATABASE"
            title="Camera database synchronized"
            detail={`${total} camera records currently indexed`}
          />

          <MonitorCard
            category="VERIFIED DATA"
            title="Verification system operational"
            detail={`${verified} verified camera records`}
          />

          <MonitorCard
            category="COMMUNITY"
            title="Community reporting system"
            detail={`${pendingReports} pending reports`}
          />

        </div>

      </section>

      {/* =====================================================
          NETWORK COVERAGE
      ===================================================== */}

      <section className="coverage-section">

        <div className="coverage-content">

          <span className="section-code">
            NETWORK COVERAGE
          </span>

          <h2>
            Global Camera Network
          </h2>

          <p>
            Explore the geographic distribution
            of traffic enforcement cameras across
            the indexed network.
          </p>

          <Link
            to="/map"
            className="coverage-action"
          >
            <span>
              Open Live Camera Map
            </span>

            <span>→</span>
          </Link>

        </div>

        <div className="coverage-metrics">

          <CoverageMetric
            value={total}
            label="CAMERAS"
          />

          <CoverageMetric
            value={displayCities}
            label="CITIES"
          />

          <CoverageMetric
            value={displayRegions}
            label="REGIONS"
          />

        </div>

      </section>

      {/* =====================================================
          COMMAND CENTER
      ===================================================== */}

      <section className="dashboard-section command-section">

        <div className="section-heading">

          <div>
            <span className="section-code">
              GCM / CONTROL
            </span>

            <h2>
              Command Center
            </h2>

            <p>
              Access the tools that power the
              camera intelligence network.
            </p>
          </div>

        </div>

        <div className="command-grid">

          <CommandCard
            number="01"
            icon="◉"
            category="LIVE MAP"
            title="Explore Camera Network"
            description="Browse cameras, locations and route coverage."
            to="/map"
          />

          <CommandCard
            number="02"
            icon="◷"
            category="COMMUNITY"
            title="Review Reports"
            description="Review and verify submitted camera locations."
            value={pendingReports}
            to="/pending"
          />

          <CommandCard
            number="03"
            icon="+"
            category="CONTRIBUTE"
            title="Report a Camera"
            description="Help expand the camera intelligence network."
            to="/report"
          />

        </div>

      </section>

      {/* =====================================================
          MINIMAL FOOTER
      ===================================================== */}

      <footer className="dashboard-footer">
        <span>GCM</span>
        <i>•</i>
        <span>Traffic Intelligence Platform</span>
        <i>•</i>
        <span>System Operational</span>
      </footer>

    </div>
  );
}


/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  number,
  icon,
  label,
  value,
  description,
}) {
  return (
    <article className="stat-card">

      <div className="stat-top">

        <span className="stat-number">
          {number}
        </span>

        <span className="stat-icon">
          {icon}
        </span>

      </div>

      <div className="stat-label">
        {label}
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-description">
        {description}
      </div>

    </article>
  );
}


/* ============================================================
   DISTRIBUTION ROW
============================================================ */

function DistributionRow({
  label,
  value,
  percentage,
}) {
  return (
    <div className="distribution-row">

      <div className="distribution-row-top">

        <span>
          {label}
        </span>

        <div>
          <strong>
            {value}
          </strong>

          <span>
            {percentage}%
          </span>
        </div>

      </div>

      <div className="distribution-bar">
        <span
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

    </div>
  );
}


/* ============================================================
   MONITOR CARD
============================================================ */

function MonitorCard({
  category,
  title,
  detail,
}) {
  return (
    <article className="monitor-card">

      <div className="monitor-top">

        <span className="monitor-status">
          <span className="live-dot" />
          LIVE
        </span>

        <span>
          JUST NOW
        </span>

      </div>

      <div className="monitor-main">

        <span className="monitor-icon">
          ✓
        </span>

        <div>

          <span className="monitor-category">
            {category}
          </span>

          <h3>
            {title}
          </h3>

          <p>
            {detail}
          </p>

        </div>

      </div>

      <div className="monitor-bottom">
        <span>ACTIVE</span>
      </div>

    </article>
  );
}


/* ============================================================
   COVERAGE METRIC
============================================================ */

function CoverageMetric({
  value,
  label,
}) {
  return (
    <div className="coverage-metric">

      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>

    </div>
  );
}


/* ============================================================
   COMMAND CARD
============================================================ */

function CommandCard({
  number,
  icon,
  category,
  title,
  description,
  value,
  to,
}) {
  return (
    <Link
      to={to}
      className="command-card"
    >

      <div className="command-top">

        <span className="command-number">
          {number}
        </span>

        <span className="command-icon">
          {icon}
        </span>

      </div>

      <div className="command-category">
        {category}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>

      <div className="command-bottom">

        {typeof value === "number" ? (
          <span className="command-value">
            {value}
          </span>
        ) : (
          <span />
        )}

        <span className="command-arrow">
          →
        </span>

      </div>

    </Link>
  );
}