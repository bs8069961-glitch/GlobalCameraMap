import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

// ============================================================
// CAMERA TYPE ICON
// ============================================================

function getCameraIcon(type) {
  const value = String(type || "").toLowerCase();

  if (value.includes("speed")) {
    return "🚗";
  }

  if (
    value.includes("red") ||
    value.includes("traffic light")
  ) {
    return "🚦";
  }

  if (
    value.includes("anpr") ||
    value.includes("itms")
  ) {
    return "🔎";
  }

  if (value.includes("enforcement")) {
    return "⚠️";
  }

  if (
    value.includes("traffic") ||
    value.includes("cctv")
  ) {
    return "📹";
  }

  return "📷";
}

// ============================================================
// MAIN DASHBOARD
// ============================================================

export default function Dashboard() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [cameras, setCameras] = useState([]);

  const [trafficSegments, setTrafficSegments] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [trafficLoading, setTrafficLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [trafficError, setTrafficError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [lastTrafficUpdated, setLastTrafficUpdated] =
    useState(null);

  const [refreshing, setRefreshing] =
    useState(false);

  // ==========================================================
  // LOAD CAMERAS
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
  // LOAD TRAFFIC
  // ==========================================================

  const loadTraffic = useCallback(
    async () => {
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
    },
    []
  );

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
      .slice(0, 8);
  }, [cameras]);

  const maximumCameraTypeCount = useMemo(() => {
    if (cameraTypeStats.length === 0) {
      return 1;
    }

    return Math.max(
      ...cameraTypeStats.map(
        ([, count]) => count
      )
    );
  }, [cameraTypeStats]);

  // ==========================================================
  // STATE STATISTICS
  // ==========================================================

  const stateStats = useMemo(() => {
    const counts = {};

    cameras.forEach((camera) => {
      const state =
        camera?.state ||
        "Unknown";

      counts[state] =
        (counts[state] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [cameras]);

  const maximumStateCount = useMemo(() => {
    if (stateStats.length === 0) {
      return 1;
    }

    return Math.max(
      ...stateStats.map(
        ([, count]) => count
      )
    );
  }, [stateStats]);

  // ==========================================================
  // TRAFFIC STATISTICS
  // ==========================================================

  const trafficStats = useMemo(() => {
    const counts = {
      low: 0,
      moderate: 0,
      high: 0,
      severe: 0,
      unknown: 0,
    };

    trafficSegments.forEach(
      (segment) => {
        const level =
          normalizeTraffic(
            segment?.congestion_level
          );

        counts[level] += 1;
      }
    );

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
      .slice(0, 6);
  }, [cameras]);

  // ==========================================================
  // TOP STATE
  // ==========================================================

  const topState =
    stateStats.length > 0
      ? stateStats[0]
      : null;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="dashboard-page">

      {/* ====================================================
          HERO
      ==================================================== */}

      <section className="dashboard-hero">

        <div className="dashboard-hero-content">

          <div className="dashboard-eyebrow">
            <span className="india-dot">
              🇮🇳
            </span>

            INDIA TRAFFIC INTELLIGENCE
          </div>

          <h1>
            Global Camera Map
          </h1>

          <p>
            Monitor traffic enforcement,
            camera coverage and road
            intelligence across India.
          </p>

        </div>

        <div className="dashboard-hero-actions">

          <div className="dashboard-api-status">
            <span className="status-pulse" />
            <span>API Online</span>
          </div>

          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={() => {
              loadCameras(true);
              loadTraffic();
            }}
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

        </div>

      </section>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div className="dashboard-alert dashboard-alert-error">
          <strong>
            Camera API unavailable
          </strong>

          <span>{error}</span>
        </div>
      )}

      {trafficError && (
        <div className="dashboard-alert dashboard-alert-warning">
          <strong>
            Traffic data unavailable
          </strong>

          <span>{trafficError}</span>
        </div>
      )}

      {/* ====================================================
          KPI CARDS
      ==================================================== */}

      <section className="dashboard-kpi-grid">

        <div className="dashboard-kpi-card">

          <div className="kpi-icon kpi-blue">
            📷
          </div>

          <div className="kpi-content">
            <span className="kpi-label">
              CAMERAS
            </span>

            <strong className="kpi-value">
              {loading
                ? "—"
                : formatNumber(
                    cameraStats.total
                  )}
            </strong>

            <span className="kpi-meta">
              Nationwide coverage
            </span>
          </div>

        </div>

        <div className="dashboard-kpi-card">

          <div className="kpi-icon kpi-green">
            ●
          </div>

          <div className="kpi-content">
            <span className="kpi-label">
              ACTIVE
            </span>

            <strong className="kpi-value">
              {loading
                ? "—"
                : formatNumber(
                    cameraStats.active
                  )}
            </strong>

            <span className="kpi-meta kpi-positive">
              Operational cameras
            </span>
          </div>

        </div>

        <div className="dashboard-kpi-card">

          <div className="kpi-icon kpi-purple">
            ✓
          </div>

          <div className="kpi-content">
            <span className="kpi-label">
              VERIFIED
            </span>

            <strong className="kpi-value">
              {loading
                ? "—"
                : formatNumber(
                    cameraStats.verified
                  )}
            </strong>

            <span className="kpi-meta">
              Verified locations
            </span>
          </div>

        </div>

        <div className="dashboard-kpi-card">

          <div className="kpi-icon kpi-orange">
            🏙️
          </div>

          <div className="kpi-content">
            <span className="kpi-label">
              STATES
            </span>

            <strong className="kpi-value">
              {loading
                ? "—"
                : formatNumber(
                    stateStats.length
                  )}
            </strong>

            <span className="kpi-meta">
              Geographic coverage
            </span>
          </div>

        </div>

      </section>

      {/* ====================================================
          MAIN GRID
      ==================================================== */}

      <section className="dashboard-main-grid">

        {/* ==================================================
            COVERAGE CARD
        ================================================== */}

        <div className="dashboard-panel coverage-panel">

          <div className="panel-header">

            <div>
              <span className="panel-eyebrow">
                COVERAGE
              </span>

              <h2>
                India Camera Network
              </h2>
            </div>

            <span className="panel-live">
              LIVE
            </span>

          </div>

          <div className="coverage-content">

            <div className="india-visual">

              <div className="india-glow">
                🇮🇳
              </div>

              <div className="coverage-center-number">
                {loading
                  ? "—"
                  : formatNumber(
                      cameraStats.total
                    )}
              </div>

              <div className="coverage-center-label">
                CAMERAS
              </div>

            </div>

            <div className="coverage-summary">

              <div className="coverage-row">
                <span>
                  Active network
                </span>

                <strong>
                  {formatNumber(
                    cameraStats.active
                  )}
                </strong>
              </div>

              <div className="coverage-row">
                <span>
                  Pending verification
                </span>

                <strong>
                  {formatNumber(
                    cameraStats.pending
                  )}
                </strong>
              </div>

              <div className="coverage-row">
                <span>
                  Offline / inactive
                </span>

                <strong>
                  {formatNumber(
                    cameraStats.inactive
                  )}
                </strong>
              </div>

              <div className="coverage-row">
                <span>
                  States covered
                </span>

                <strong>
                  {formatNumber(
                    stateStats.length
                  )}
                </strong>
              </div>

            </div>

          </div>

          <a
            href="/map"
            className="panel-action"
          >
            Open Live Camera Map
            <span>→</span>
          </a>

        </div>

        {/* ==================================================
            CAMERA TYPES
        ================================================== */}

        <div className="dashboard-panel">

          <div className="panel-header">

            <div>
              <span className="panel-eyebrow">
                ENFORCEMENT
              </span>

              <h2>
                Camera Distribution
              </h2>
            </div>

            <span className="panel-count">
              {cameraTypeStats.length}
            </span>

          </div>

          <div className="analytics-list">

            {cameraTypeStats.length === 0 ? (
              <div className="empty-state">
                No camera data available.
              </div>
            ) : (
              cameraTypeStats.map(
                ([type, count]) => {
                  const percentage =
                    Math.max(
                      5,
                      (count /
                        maximumCameraTypeCount) *
                        100
                    );

                  return (
                    <div
                      className="analytics-item"
                      key={type}
                    >

                      <div className="analytics-label">

                        <span>
                          <span className="analytics-icon">
                            {getCameraIcon(
                              type
                            )}
                          </span>

                          {type}
                        </span>

                        <strong>
                          {count}
                        </strong>

                      </div>

                      <div className="analytics-bar">
                        <span
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                    </div>
                  );
                }
              )
            )}

          </div>

        </div>

      </section>

      {/* ====================================================
          SECOND GRID
      ==================================================== */}

      <section className="dashboard-secondary-grid">

        {/* ==================================================
            TRAFFIC INTELLIGENCE
        ================================================== */}

        <div className="dashboard-panel traffic-panel">

          <div className="panel-header">

            <div>
              <span className="panel-eyebrow">
                TRAFFIC INTELLIGENCE
              </span>

              <h2>
                Road Conditions
              </h2>
            </div>

            <div className="traffic-live">
              <span className="status-pulse" />
              LIVE
            </div>

          </div>

          <div className="traffic-stat-grid">

            <div className="traffic-stat">
              <span className="traffic-indicator traffic-low" />
              <strong>
                {trafficStats.low}
              </strong>
              <small>
                Low
              </small>
            </div>

            <div className="traffic-stat">
              <span className="traffic-indicator traffic-moderate" />
              <strong>
                {trafficStats.moderate}
              </strong>
              <small>
                Moderate
              </small>
            </div>

            <div className="traffic-stat">
              <span className="traffic-indicator traffic-high" />
              <strong>
                {trafficStats.high}
              </strong>
              <small>
                High
              </small>
            </div>

            <div className="traffic-stat">
              <span className="traffic-indicator traffic-severe" />
              <strong>
                {trafficStats.severe}
              </strong>
              <small>
                Severe
              </small>
            </div>

          </div>

          <div className="traffic-summary">

            <span>
              🚦{" "}
              {formatNumber(
                trafficSegments.length
              )}{" "}
              monitored segments
            </span>

            <strong>
              {formatNumber(
                congestedSegments
              )} congested
            </strong>

          </div>

          {lastTrafficUpdated && (
            <div className="panel-updated">
              Updated{" "}
              {formatTime(
                lastTrafficUpdated
              )}
            </div>
          )}

        </div>

        {/* ==================================================
            STATE COVERAGE
        ================================================== */}

        <div className="dashboard-panel">

          <div className="panel-header">

            <div>
              <span className="panel-eyebrow">
                GEOGRAPHY
              </span>

              <h2>
                State Coverage
              </h2>
            </div>

            {topState && (
              <span className="top-state">
                {topState[0]}
              </span>
            )}

          </div>

          <div className="analytics-list">

            {stateStats.length === 0 ? (
              <div className="empty-state">
                No state data available.
              </div>
            ) : (
              stateStats.map(
                ([state, count]) => {
                  const percentage =
                    Math.max(
                      5,
                      (count /
                        maximumStateCount) *
                        100
                    );

                  return (
                    <div
                      className="analytics-item"
                      key={state}
                    >

                      <div className="analytics-label">

                        <span>
                          {state}
                        </span>

                        <strong>
                          {count}
                        </strong>

                      </div>

                      <div className="analytics-bar state-bar">
                        <span
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                    </div>
                  );
                }
              )
            )}

          </div>

        </div>

      </section>

      {/* ====================================================
          RECENT CAMERA ACTIVITY
      ==================================================== */}

      <section className="dashboard-panel recent-panel">

        <div className="panel-header">

          <div>
            <span className="panel-eyebrow">
              MONITORING
            </span>

            <h2>
              Recent Camera Activity
            </h2>
          </div>

          <a
            href="/map"
            className="panel-link"
          >
            View all →
          </a>

        </div>

        {recentCameras.length === 0 ? (
          <div className="empty-state large">
            {loading
              ? "Loading camera activity..."
              : "No camera activity available."}
          </div>
        ) : (
          <div className="recent-table">

            <div className="recent-table-header">
              <span>LOCATION</span>
              <span>TYPE</span>
              <span>STATUS</span>
              <span>VERIFICATION</span>
            </div>

            {recentCameras.map(
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
                    className="recent-table-row"
                    key={
                      camera?.id ??
                      `${location}-${index}`
                    }
                  >

                    <div className="recent-location">

                      <span className="recent-camera-icon">
                        {getCameraIcon(
                          getCameraType(
                            camera
                          )
                        )}
                      </span>

                      <div>
                        <strong>
                          {location}
                        </strong>

                        <small>
                          {camera?.road_name ||
                            camera?.state ||
                            "Camera location"}
                        </small>
                      </div>

                    </div>

                    <span className="recent-type">
                      {getCameraType(
                        camera
                      )}
                    </span>

                    <span
                      className={`status-pill status-${status}`}
                    >
                      <span />
                      {status === "active"
                        ? "Active"
                        : status ===
                            "inactive"
                          ? "Offline"
                          : "Unknown"}
                    </span>

                    <span
                      className={`verification-pill verification-${verification}`}
                    >
                      {verification ===
                        "verified" &&
                        "✓ "}
                      {verification}
                    </span>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* ====================================================
          FOOTER STATUS
      ==================================================== */}

      <section className="dashboard-footer-status">

        <div>
          <span className="status-pulse" />
          Camera API online
        </div>

        <div>
          {loading
            ? "Loading..."
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

      </section>

    </div>
  );
}