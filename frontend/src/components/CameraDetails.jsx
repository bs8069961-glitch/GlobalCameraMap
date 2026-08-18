import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

function normalizeStatus(value) {
  const status = String(value || "unknown").toLowerCase().trim();

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

function getCameraType(camera) {
  return (
    camera?.camera_type ||
    camera?.cameraType ||
    camera?.type ||
    "Unknown Camera"
  );
}

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

  if (value.includes("traffic")) {
    return "📹";
  }

  return "📷";
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function formatCoordinate(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Not available";
  }

  return number.toFixed(6);
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const config = {
    active: {
      label: "Active",
      icon: "●",
      className: "camera-details-status-active",
    },
    inactive: {
      label: "Offline",
      icon: "●",
      className: "camera-details-status-inactive",
    },
    unknown: {
      label: "Unknown",
      icon: "●",
      className: "camera-details-status-unknown",
    },
  };

  const current = config[normalized];

  return (
    <span className={`camera-details-badge ${current.className}`}>
      <span>{current.icon}</span>
      {current.label}
    </span>
  );
}

function VerificationBadge({ status }) {
  const normalized = normalizeVerification(status);

  const config = {
    verified: {
      label: "Verified",
      icon: "✓",
      className: "camera-details-verification-verified",
    },
    approved: {
      label: "Approved",
      icon: "✓",
      className: "camera-details-verification-approved",
    },
    pending: {
      label: "Pending Verification",
      icon: "◷",
      className: "camera-details-verification-pending",
    },
    rejected: {
      label: "Rejected",
      icon: "×",
      className: "camera-details-verification-rejected",
    },
  };

  const current = config[normalized];

  return (
    <span
      className={`camera-details-badge ${current.className}`}
    >
      <span>{current.icon}</span>
      {current.label}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="camera-details-row">
      <div className="camera-details-row-label">
        {label}
      </div>

      <div className="camera-details-row-value">
        {value || "Not available"}
      </div>
    </div>
  );
}

export default function CameraDetails() {
  const { cameraId } = useParams();
  const navigate = useNavigate();

  const [camera, setCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCamera() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/cameras/${cameraId}`,
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

        const cameraData =
          data?.camera ||
          data?.data ||
          data;

        if (
          !cameraData ||
          typeof cameraData !== "object" ||
          Array.isArray(cameraData)
        ) {
          throw new Error(
            "Invalid camera response."
          );
        }

        if (!cancelled) {
          setCamera(cameraData);
        }
      } catch (err) {
        console.error(
          "Camera details error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load camera details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCamera();

    return () => {
      cancelled = true;
    };
  }, [cameraId]);

  const cameraType = useMemo(
    () => getCameraType(camera),
    [camera]
  );

  const latitude = Number(
    camera?.latitude
  );

  const longitude = Number(
    camera?.longitude
  );

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const mapUrl = hasCoordinates
    ? `/map?lat=${latitude}&lng=${longitude}&camera=${cameraId}`
    : "/map";

  if (loading) {
    return (
      <div className="camera-details-page">
        <div className="camera-details-loading">
          <div className="camera-details-loading-icon">
            📷
          </div>

          <h2>Loading camera</h2>

          <p>
            Retrieving camera information...
          </p>
        </div>
      </div>
    );
  }

  if (error || !camera) {
    return (
      <div className="camera-details-page">
        <div className="camera-details-error">
          <div className="camera-details-error-icon">
            !
          </div>

          <h2>
            Camera not found
          </h2>

          <p>
            {error ||
              "The requested camera could not be found."}
          </p>

          <div className="camera-details-actions">
            <button
              type="button"
              className="camera-details-primary-button"
              onClick={() => navigate("/map")}
            >
              ← Back to Camera Map
            </button>

            <Link
              to="/dashboard"
              className="camera-details-secondary-button"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-details-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="camera-details-header">

        <div className="camera-details-header-left">

          <Link
            to="/map"
            className="camera-details-back"
          >
            ←
            <span>Camera Map</span>
          </Link>

          <div className="camera-details-title-area">

            <div className="camera-details-icon">
              {getCameraIcon(cameraType)}
            </div>

            <div>
              <div className="camera-details-eyebrow">
                TRAFFIC CAMERA
              </div>

              <h1>
                {cameraType}
              </h1>

              <div className="camera-details-id">
                Camera ID #{camera.id ?? cameraId}
              </div>
            </div>

          </div>

        </div>

        <div className="camera-details-header-status">

          <StatusBadge
            status={camera.status}
          />

          <VerificationBadge
            status={
              camera.verification_status
            }
          />

        </div>

      </div>


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="camera-details-layout">

        {/* ===================================================
            LEFT COLUMN
        ==================================================== */}

        <div className="camera-details-main">

          {/* LOCATION */}

          <section className="camera-details-card">

            <div className="camera-details-card-header">

              <div>
                <div className="camera-details-card-kicker">
                  LOCATION
                </div>

                <h2>
                  Camera Location
                </h2>
              </div>

              <div className="camera-details-card-symbol">
                📍
              </div>

            </div>

            <div className="camera-details-location">

              <div className="camera-details-location-primary">
                {camera.road_name ||
                  camera.location_name ||
                  "Camera location"}
              </div>

              <div className="camera-details-location-secondary">

                {[
                  camera.city,
                  camera.state,
                  camera.country,
                ]
                  .filter(Boolean)
                  .join(", ") ||
                  "Location information unavailable"}

              </div>

            </div>

            <div className="camera-details-divider" />

            <DetailRow
              label="Country"
              value={camera.country}
            />

            <DetailRow
              label="State"
              value={camera.state}
            />

            <DetailRow
              label="City"
              value={camera.city}
            />

            <DetailRow
              label="Road"
              value={camera.road_name}
            />

          </section>


          {/* ENFORCEMENT */}

          <section className="camera-details-card">

            <div className="camera-details-card-header">

              <div>
                <div className="camera-details-card-kicker">
                  ENFORCEMENT
                </div>

                <h2>
                  Camera Configuration
                </h2>
              </div>

              <div className="camera-details-card-symbol">
                🚦
              </div>

            </div>

            <DetailRow
              label="Camera Type"
              value={cameraType}
            />

            <DetailRow
              label="Enforcement Type"
              value={
                camera.enforcement_type
              }
            />

            <DetailRow
              label="Speed Limit"
              value={
                camera.speed_limit !==
                  null &&
                camera.speed_limit !==
                  undefined
                  ? `${camera.speed_limit} km/h`
                  : null
              }
            />

            <DetailRow
              label="Status"
              value={
                <StatusBadge
                  status={camera.status}
                />
              }
            />

            <DetailRow
              label="Verification"
              value={
                <VerificationBadge
                  status={
                    camera.verification_status
                  }
                />
              }
            />

          </section>


          {/* COORDINATES */}

          <section className="camera-details-card">

            <div className="camera-details-card-header">

              <div>
                <div className="camera-details-card-kicker">
                  GEOSPATIAL DATA
                </div>

                <h2>
                  Coordinates
                </h2>
              </div>

              <div className="camera-details-card-symbol">
                🗺️
              </div>

            </div>

            <div className="camera-details-coordinates">

              <div className="camera-details-coordinate">

                <span>
                  Latitude
                </span>

                <strong>
                  {formatCoordinate(
                    camera.latitude
                  )}
                </strong>

              </div>

              <div className="camera-details-coordinate">

                <span>
                  Longitude
                </span>

                <strong>
                  {formatCoordinate(
                    camera.longitude
                  )}
                </strong>

              </div>

            </div>

            {hasCoordinates && (
              <div className="camera-details-map-preview">

                <div className="camera-details-map-preview-grid">

                  <div className="camera-details-map-pin">
                    {getCameraIcon(
                      cameraType
                    )}
                  </div>

                </div>

                <div className="camera-details-map-preview-label">
                  Camera location
                </div>

              </div>
            )}

          </section>

        </div>


        {/* ===================================================
            RIGHT COLUMN
        ==================================================== */}

        <aside className="camera-details-sidebar">

          {/* QUICK STATUS */}

          <section className="camera-details-card camera-details-status-card">

            <div className="camera-details-card-kicker">
              STATUS
            </div>

            <div className="camera-details-big-status">

              <StatusBadge
                status={camera.status}
              />

              <h2>
                {normalizeStatus(
                  camera.status
                ) === "active"
                  ? "Operational"
                  : "Needs Attention"}
              </h2>

            </div>

            <p>
              {normalizeStatus(
                camera.status
              ) === "active"
                ? "This camera is currently marked as operational in the system."
                : "This camera is not currently marked as active."}
            </p>

          </section>


          {/* VERIFICATION */}

          <section className="camera-details-card">

            <div className="camera-details-card-kicker">
              VERIFICATION
            </div>

            <h2>
              Verification Status
            </h2>

            <div className="camera-details-verification-large">

              <VerificationBadge
                status={
                  camera.verification_status
                }
              />

            </div>

            <p>
              {normalizeVerification(
                camera.verification_status
              ) === "verified"
                ? "Camera information has been verified."
                : normalizeVerification(
                    camera.verification_status
                  ) === "approved"
                ? "Camera information has been approved."
                : normalizeVerification(
                    camera.verification_status
                  ) === "rejected"
                ? "This camera has been rejected."
                : "This camera is awaiting verification."}
            </p>

          </section>


          {/* SOURCE */}

          <section className="camera-details-card">

            <div className="camera-details-card-kicker">
              DATA SOURCE
            </div>

            <h2>
              Source Information
            </h2>

            <DetailRow
              label="Source"
              value={camera.source}
            />

            <DetailRow
              label="Last Verified"
              value={formatDate(
                camera.last_verified
              )}
            />

            {camera.source_url && (
              <a
                href={camera.source_url}
                target="_blank"
                rel="noreferrer"
                className="camera-details-source-link"
              >
                View Official Source →
              </a>
            )}

          </section>


          {/* ACTIONS */}

          <section className="camera-details-card">

            <div className="camera-details-card-kicker">
              ACTIONS
            </div>

            <div className="camera-details-actions-column">

              {hasCoordinates && (
                <Link
                  to={mapUrl}
                  className="camera-details-primary-button"
                >
                  🗺️ View on Map
                </Link>
              )}

              <Link
                to="/report"
                className="camera-details-secondary-button"
              >
                📢 Report an Issue
              </Link>

              <Link
                to="/map"
                className="camera-details-secondary-button"
              >
                ← Back to Camera Map
              </Link>

            </div>

          </section>

        </aside>

      </div>

    </div>
  );
}