import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// HELPERS
// ============================================================

function getCameraType(camera) {
  return (
    camera?.camera_type ||
    camera?.cameraType ||
    camera?.type ||
    "Unknown"
  );
}

function getState(camera) {
  return (
    camera?.state ||
    camera?.state_name ||
    camera?.province ||
    "Unknown"
  );
}

function normalizeStatus(value) {
  const status = String(value || "unknown")
    .toLowerCase()
    .trim();

  if (
    status === "active" ||
    status === "online" ||
    status === "operational"
  ) {
    return "active";
  }

  if (
    status === "inactive" ||
    status === "offline" ||
    status === "disabled"
  ) {
    return "inactive";
  }

  return "unknown";
}

function normalizeVerification(value) {
  const verification = String(value || "pending")
    .toLowerCase()
    .trim();

  if (verification === "verified") {
    return "verified";
  }

  if (verification === "approved") {
    return "approved";
  }

  if (
    verification === "rejected" ||
    verification === "invalid"
  ) {
    return "rejected";
  }

  return "pending";
}

function normalizeTraffic(value) {
  const level = String(value || "unknown")
    .toLowerCase()
    .trim();

  if (level === "low") {
    return "low";
  }

  if (
    level === "moderate" ||
    level === "medium"
  ) {
    return "moderate";
  }

  if (level === "high") {
    return "high";
  }

  if (
    level === "severe" ||
    level === "critical"
  ) {
    return "severe";
  }

  return "unknown";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatTime(date) {
  if (!date) {
    return "—";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getCameraIcon(type) {
  const value = String(type || "").toLowerCase();

  if (value.includes("speed")) {
    return "S";
  }

  if (
    value.includes("red") ||
    value.includes("traffic light")
  ) {
    return "R";
  }

  if (
    value.includes("anpr") ||
    value.includes("itms")
  ) {
    return "A";
  }

  if (value.includes("enforcement")) {
    return "E";
  }

  if (
    value.includes("traffic") ||
    value.includes("cctv")
  ) {
    return "T";
  }

  return "C";
}

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [trafficSegments, setTrafficSegments] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [trafficLoading, setTrafficLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [trafficError, setTrafficError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [lastTrafficUpdated, setLastTrafficUpdated] =
    useState(null);

  // ==========================================================
  // CAMERA API
  // ==========================================================

  const loadCameras = useCallback(
    async (manual = false) => {
      try {
        if (manual) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          `${API_URL}/api/cameras`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Camera API returned HTTP ${response.status}`
          );
        }

        const data = await response.json();

        let cameraData = [];

        if (Array.isArray(data)) {
          cameraData = data;
        } else if (
          Array.isArray(data?.cameras)
        ) {
          cameraData = data.cameras;
        } else {
          throw new Error(
            "Invalid camera API response."
          );
        }

        setCameras(cameraData);
        setLastUpdated(new Date());
      } catch (err) {
        console.error(
          "Dashboard camera API error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load camera data."
        );
      } finally {
        if (manual) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  // ==========================================================
  // TRAFFIC API
  // ==========================================================

  const loadTraffic = useCallback(async () => {
    try {
      setTrafficLoading(true);
      setTrafficError("");

      const response = await fetch(
        `${API_URL}/api/traffic/segments`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Traffic API returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      let segments = [];

      if (Array.isArray(data)) {
        segments = data;
      } else if (
        Array.isArray(data?.segments)
      ) {
        segments = data.segments;
      } else {
        throw new Error(
          "Invalid traffic API response."
        );
      }

      setTrafficSegments(segments);
      setLastTrafficUpdated(new Date());
    } catch (err) {
      console.error(
        "Dashboard traffic API error:",
        err
      );

      setTrafficError(
        err?.message ||
          "Unable to load traffic data."
      );
    } finally {
      setTrafficLoading(false);
    }
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadCameras();
    loadTraffic();
  }, [loadCameras, loadTraffic]);

  // ==========================================================
  // CAMERA STATISTICS
  // ==========================================================

  const cameraStats = useMemo(() => {
    const stats = {
      total: cameras.length,
      active: 0,
      inactive: 0,
      unknown: 0,
      verified: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    };

    cameras.forEach((camera) => {
      const status = normalizeStatus(
        camera?.status
      );

      if (
        Object.prototype.hasOwnProperty.call(
          stats,
          status
        )
      ) {
        stats[status] += 1;
      }

      const verification =
        normalizeVerification(
          camera?.verification_status
        );

      if (
        Object.prototype.hasOwnProperty.call(
          stats,
          verification
        )
      ) {
        stats[verification] += 1;
      }
    });

    return stats;
  }, [cameras]);

  // ==========================================================
  // STATES
  // ==========================================================

  const stateStats = useMemo(() => {
    const counts = {};

    cameras.forEach((camera) => {
      const state = getState(camera);

      if (state !== "Unknown") {
        counts[state] =
          (counts[state] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);
  }, [cameras]);

  const uniqueStates = stateStats.length;

  // ==========================================================
  // CAMERA TYPES
  // ==========================================================

  const cameraTypeStats = useMemo(() => {
    const counts = {};

    cameras.forEach((camera) => {
      const type = getCameraType(camera);

      counts[type] =
        (counts[type] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [cameras]);

  const maximumCameraTypeCount =
    cameraTypeStats.length
      ? Math.max(
          ...cameraTypeStats.map(
            ([, count]) => count
          )
        )
      : 1;

  // ==========================================================
  // TRAFFIC
  // ==========================================================

  const trafficStats = useMemo(() => {
    const counts = {
      low: 0,
      moderate: 0,
      high: 0,
      severe: 0,
      unknown: 0,
    };

    trafficSegments.forEach((segment) => {
      const level = normalizeTraffic(
        segment?.congestion_level
      );

      counts[level] += 1;
    });

    return counts;
  }, [trafficSegments]);

  const congestedSegments =
    trafficStats.high +
    trafficStats.severe;

  // ==========================================================
  // RECENT CAMERAS
  // ==========================================================

  const recentCameras = useMemo(() => {
    return [...cameras]
      .sort((a, b) => {
        const first =
          new Date(
            b?.updated_at ||
              b?.last_verified ||
              b?.created_at ||
              0
          ).getTime();

        const second =
          new Date(
            a?.updated_at ||
              a?.last_verified ||
              a?.created_at ||
              0
          ).getTime();

        return first - second;
      })
      .slice(0, 5);
  }, [cameras]);

  // ==========================================================
  // REFRESH
  // ==========================================================

  function handleRefresh() {
    loadCameras(true);
    loadTraffic();
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="apple-dashboard">

      {/* ====================================================
          TOP HERO
      ==================================================== */}

      <section className="apple-hero">

        <div className="apple-hero-copy">

          <div className="apple-kicker">
            <span className="apple-live-dot" />
            INDIA TRAFFIC INTELLIGENCE
          </div>

          <h1>
            India, at a glance.
          </h1>

          <p>
            Explore traffic cameras, enforcement
            coverage and road intelligence across
            the country.
          </p>

          <div className="apple-hero-actions">

            <Link
              to="/map"
              className="apple-primary-button"
            >
              Explore Camera Map
              <span>→</span>
            </Link>

            <button
              type="button"
              className="apple-secondary-button"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <span
                className={
                  refreshing
                    ? "apple-refresh spinning"
                    : "apple-refresh"
                }
              >
                ↻
              </span>

              {refreshing
                ? "Updating"
                : "Refresh"}
            </button>

          </div>

        </div>

        <div className="apple-hero-status">

          <div className="apple-status-card">

            <div className="apple-status-header">
              <span>
                NETWORK STATUS
              </span>

              <span className="apple-online">
                ONLINE
              </span>
            </div>

            <div className="apple-status-number">
              {loading
                ? "—"
                : formatNumber(
                    cameraStats.total
                  )}
            </div>

            <div className="apple-status-label">
              cameras monitored
            </div>

            <div className="apple-status-divider" />

            <div className="apple-status-grid">

              <div>
                <strong>
                  {loading
                    ? "—"
                    : formatNumber(
                        cameraStats.active
                      )}
                </strong>

                <span>Active</span>
              </div>

              <div>
                <strong>
                  {loading
                    ? "—"
                    : formatNumber(
                        cameraStats.verified
                      )}
                </strong>

                <span>Verified</span>
              </div>

              <div>
                <strong>
                  {loading
                    ? "—"
                    : formatNumber(
                        uniqueStates
                      )}
                </strong>

                <span>States</span>
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* ====================================================
          ALERTS
      ==================================================== */}

      {error && (
        <div className="apple-alert apple-alert-error">
          <strong>Camera service unavailable</strong>
          <span>{error}</span>
        </div>
      )}

      {trafficError && (
        <div className="apple-alert apple-alert-warning">
          <strong>Traffic service unavailable</strong>
          <span>{trafficError}</span>
        </div>
      )}

      {/* ====================================================
          MAP PREVIEW
      ==================================================== */}

      <section className="apple-map-section">

        <div className="apple-map-card">

          <div className="apple-map-overlay">

            <div className="apple-map-title">
              <span className="apple-kicker">
                LIVE COVERAGE
              </span>

              <h2>
                India Camera Network
              </h2>

              <p>
                {loading
                  ? "Loading camera network..."
                  : `${formatNumber(
                      cameraStats.total
                    )} cameras across ${uniqueStates} states`}
              </p>
            </div>

            <Link
              to="/map"
              className="apple-map-button"
            >
              Open Map
              <span>→</span>
            </Link>

          </div>

          <div className="india-map-art">

            <div className="map-grid" />

            <div className="india-shape">

              <div className="map-point point-1" />
              <div className="map-point point-2" />
              <div className="map-point point-3" />
              <div className="map-point point-4" />
              <div className="map-point point-5" />
              <div className="map-point point-6" />
              <div className="map-point point-7" />
              <div className="map-point point-8" />
              <div className="map-point point-9" />
              <div className="map-point point-10" />

              <div className="map-line map-line-1" />
              <div className="map-line map-line-2" />
              <div className="map-line map-line-3" />

            </div>

            <div className="map-floating-info">

              <span className="apple-live-dot" />

              LIVE NETWORK

              <strong>
                {formatNumber(
                  cameraStats.active
                )} active
              </strong>

            </div>

          </div>

        </div>

      </section>

      {/* ====================================================
          QUICK STATS
      ==================================================== */}

      <section className="apple-stat-grid">

        <article className="apple-stat-card">

          <div className="apple-stat-icon blue">
            C
          </div>

          <div>
            <span>
              CAMERAS
            </span>

            <strong>
              {loading
                ? "—"
                : formatNumber(
                    cameraStats.total
                  )}
            </strong>

            <small>
              Nationwide network
            </small>
          </div>

        </article>

        <article className="apple-stat-card">

          <div className="apple-stat-icon green">
            ●
          </div>

          <div>
            <span>
              ACTIVE
            </span>

            <strong>
              {loading
                ? "—"
                : formatNumber(
                    cameraStats.active
                  )}
            </strong>

            <small>
              Operational cameras
            </small>
          </div>

        </article>

        <article className="apple-stat-card">

          <div className="apple-stat-icon purple">
            ✓
          </div>

          <div>
            <span>
              VERIFIED
            </span>

            <strong>
              {loading
                ? "—"
                : formatNumber(
                    cameraStats.verified
                  )}
            </strong>

            <small>
              Verified locations
            </small>
          </div>

        </article>

        <article className="apple-stat-card">

          <div className="apple-stat-icon orange">
            S
          </div>

          <div>
            <span>
              STATES
            </span>

            <strong>
              {loading
                ? "—"
                : formatNumber(
                    uniqueStates
                  )}
            </strong>

            <small>
              Geographic coverage
            </small>
          </div>

        </article>

      </section>

      {/* ====================================================
          TWO COLUMN ANALYTICS
      ==================================================== */}

      <section className="apple-content-grid">

        {/* CAMERA TYPES */}

        <article className="apple-card">

          <div className="apple-card-header">

            <div>
              <span className="apple-kicker">
                ENFORCEMENT
              </span>

              <h2>
                Camera distribution
              </h2>
            </div>

            <span className="apple-card-badge">
              {cameraTypeStats.length}
            </span>

          </div>

          <div className="apple-bars">

            {cameraTypeStats.map(
              ([type, count]) => {

                const width = Math.max(
                  8,
                  (count /
                    maximumCameraTypeCount) *
                    100
                );

                return (
                  <div
                    className="apple-bar-row"
                    key={type}
                  >

                    <div className="apple-bar-label">

                      <span>
                        <i className="camera-type-badge">
                          {getCameraIcon(type)}
                        </i>

                        {type}
                      </span>

                      <strong>
                        {formatNumber(count)}
                      </strong>

                    </div>

                    <div className="apple-bar-track">
                      <span
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </div>

                  </div>
                );
              }
            )}

          </div>

        </article>

        {/* ROAD CONDITIONS */}

        <article className="apple-card">

          <div className="apple-card-header">

            <div>
              <span className="apple-kicker">
                TRAFFIC INTELLIGENCE
              </span>

              <h2>
                Road conditions
              </h2>
            </div>

            <span className="apple-online">
              LIVE
            </span>

          </div>

          <div className="apple-traffic-grid">

            <div className="apple-traffic-item">

              <span className="traffic-dot low" />

              <strong>
                {trafficLoading
                  ? "—"
                  : trafficStats.low}
              </strong>

              <span>
                Low
              </span>

            </div>

            <div className="apple-traffic-item">

              <span className="traffic-dot moderate" />

              <strong>
                {trafficLoading
                  ? "—"
                  : trafficStats.moderate}
              </strong>

              <span>
                Moderate
              </span>

            </div>

            <div className="apple-traffic-item">

              <span className="traffic-dot high" />

              <strong>
                {trafficLoading
                  ? "—"
                  : trafficStats.high}
              </strong>

              <span>
                High
              </span>

            </div>

            <div className="apple-traffic-item">

              <span className="traffic-dot severe" />

              <strong>
                {trafficLoading
                  ? "—"
                  : trafficStats.severe}
              </strong>

              <span>
                Severe
              </span>

            </div>

          </div>

          <div className="apple-traffic-summary">

            <span>
              {formatNumber(
                trafficSegments.length
              )} monitored segments
            </span>

            <strong>
              {formatNumber(
                congestedSegments
              )} congested
            </strong>

          </div>

          {lastTrafficUpdated && (
            <small className="apple-updated">
              Updated{" "}
              {formatTime(
                lastTrafficUpdated
              )}
            </small>
          )}

        </article>

      </section>

      {/* ====================================================
          STATE COVERAGE
      ==================================================== */}

      <section className="apple-card">

        <div className="apple-card-header">

          <div>
            <span className="apple-kicker">
              GEOGRAPHY
            </span>

            <h2>
              State coverage
            </h2>
          </div>

          <span className="apple-card-badge">
            {uniqueStates} states
          </span>

        </div>

        <div className="apple-state-grid">

          {stateStats
            .slice(0, 8)
            .map(([state, count], index) => {

              const maximum =
                stateStats[0]?.[1] || 1;

              const width =
                (count / maximum) * 100;

              return (
                <div
                  className="apple-state-item"
                  key={state}
                >

                  <div className="apple-state-top">

                    <span>
                      <b>
                        {index + 1}
                      </b>

                      {state}
                    </span>

                    <strong>
                      {formatNumber(count)}
                    </strong>

                  </div>

                  <div className="apple-state-track">
                    <span
                      style={{
                        width: `${Math.max(
                          5,
                          width
                        )}%`,
                      }}
                    />
                  </div>

                </div>
              );
            })}

        </div>

      </section>

      {/* ====================================================
          RECENT ACTIVITY
      ==================================================== */}

      <section className="apple-card">

        <div className="apple-card-header">

          <div>
            <span className="apple-kicker">
              MONITORING
            </span>

            <h2>
              Recent camera activity
            </h2>
          </div>

          <Link
            to="/map"
            className="apple-text-link"
          >
            View all →
          </Link>

        </div>

        <div className="apple-activity-list">

          {recentCameras.length === 0 ? (

            <div className="apple-empty">
              {loading
                ? "Loading camera activity..."
                : "No camera activity available."}
            </div>

          ) : (

            recentCameras.map(
              (camera, index) => {

                const status =
                  normalizeStatus(
                    camera?.status
                  );

                const verification =
                  normalizeVerification(
                    camera?.verification_status
                  );

                const location =
                  camera?.city ||
                  camera?.state ||
                  camera?.country ||
                  "Unknown location";

                return (
                  <div
                    className="apple-activity-row"
                    key={
                      camera?.id ??
                      `${location}-${index}`
                    }
                  >

                    <div className="activity-icon">
                      {getCameraIcon(
                        getCameraType(camera)
                      )}
                    </div>

                    <div className="activity-location">

                      <strong>
                        {location}
                      </strong>

                      <span>
                        {camera?.road_name ||
                          camera?.state ||
                          "Camera location"}
                      </span>

                    </div>

                    <div className="activity-type">
                      {getCameraType(camera)}
                    </div>

                    <div
                      className={`activity-status ${status}`}
                    >
                      <span />
                      {status === "active"
                        ? "Active"
                        : status === "inactive"
                          ? "Offline"
                          : "Unknown"}
                    </div>

                    <div
                      className={`activity-verification ${verification}`}
                    >
                      {verification ===
                        "verified"
                        ? "Verified"
                        : verification}
                    </div>

                  </div>
                );
              }
            )

          )}

        </div>

      </section>

      {/* ====================================================
          BOTTOM ACTION
      ==================================================== */}

      <section className="apple-bottom-banner">

        <div>

          <span className="apple-kicker">
            EXPLORE INDIA
          </span>

          <h2>
            See every camera on the map.
          </h2>

          <p>
            Search locations, inspect cameras
            and explore enforcement coverage.
          </p>

        </div>

        <Link
          to="/map"
          className="apple-primary-button"
        >
          Open Camera Map
          <span>→</span>
        </Link>

      </section>

      {/* ====================================================
          FOOTER STATUS
      ==================================================== */}

      <footer className="apple-dashboard-footer">

        <div>
          <span className="apple-live-dot" />
          Camera API online
        </div>

        <div>
          {loading
            ? "Loading network..."
            : `${formatNumber(
                cameraStats.total
              )} cameras monitored`}
        </div>

        <div>
          {lastUpdated
            ? `Updated ${formatTime(
                lastUpdated
              )}`
            : "Waiting for update"}
        </div>

      </footer>

    </main>
  );
}