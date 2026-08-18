import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// CAMERA ICON
// ============================================================

const createCameraIcon = (type) => {
  const cameraType = String(type || "").toLowerCase();

  let emoji = "📷";

  if (cameraType.includes("speed")) {
    emoji = "🚗";
  } else if (
    cameraType.includes("red") ||
    cameraType.includes("traffic light")
  ) {
    emoji = "🚦";
  } else if (
    cameraType.includes("anpr") ||
    cameraType.includes("itms")
  ) {
    emoji = "🔎";
  } else if (cameraType.includes("traffic")) {
    emoji = "📹";
  }

  return L.divIcon({
    className: "camera-marker",
    html: `
      <div
        style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: white;
          border: 2px solid #222;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          box-shadow: 0 2px 7px rgba(0,0,0,0.35);
        "
      >
        ${emoji}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};

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

function getStatusColor(status) {
  switch (normalizeStatus(status)) {
    case "active":
      return "#16a34a";

    case "inactive":
      return "#dc2626";

    default:
      return "#f59e0b";
  }
}

function getStatusLabel(status) {
  switch (normalizeStatus(status)) {
    case "active":
      return "Active";

    case "inactive":
      return "Inactive / Offline";

    default:
      return "Pending / Unknown";
  }
}

function getVerificationColor(status) {
  const value = String(status || "")
    .toLowerCase()
    .trim();

  if (
    value === "verified" ||
    value === "approved"
  ) {
    return "#16a34a";
  }

  if (
    value === "rejected" ||
    value === "invalid"
  ) {
    return "#dc2626";
  }

  return "#f59e0b";
}

// ============================================================
// TRAFFIC HELPERS
// ============================================================

function normalizeCongestionLevel(value) {
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

function getTrafficColor(level) {
  switch (normalizeCongestionLevel(level)) {
    case "low":
      return "#22c55e";

    case "moderate":
      return "#eab308";

    case "high":
      return "#f97316";

    case "severe":
      return "#ef4444";

    default:
      return "#64748b";
  }
}

function getTrafficWeight(level) {
  switch (normalizeCongestionLevel(level)) {
    case "severe":
      return 8;

    case "high":
      return 7;

    case "moderate":
      return 6;

    case "low":
      return 5;

    default:
      return 5;
  }
}

// ============================================================
// TRAFFIC COORDINATES
// ============================================================

function getTrafficCoordinates(segment) {
  if (
    segment?.geometry &&
    segment.geometry.type === "LineString" &&
    Array.isArray(segment.geometry.coordinates)
  ) {
    const coordinates = segment.geometry.coordinates
      .map((point) => {
        if (
          !Array.isArray(point) ||
          point.length < 2
        ) {
          return null;
        }

        const longitude = Number(point[0]);
        const latitude = Number(point[1]);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        return [latitude, longitude];
      })
      .filter(Boolean);

    if (coordinates.length >= 2) {
      return coordinates;
    }
  }

  if (Array.isArray(segment?.coordinates)) {
    const coordinates = segment.coordinates
      .map((point) => {
        if (
          !Array.isArray(point) ||
          point.length < 2
        ) {
          return null;
        }

        const first = Number(point[0]);
        const second = Number(point[1]);

        if (
          !Number.isFinite(first) ||
          !Number.isFinite(second)
        ) {
          return null;
        }

        return [second, first];
      })
      .filter(Boolean);

    if (coordinates.length >= 2) {
      return coordinates;
    }
  }

  const startLatitude = Number(
    segment?.start_latitude
  );

  const startLongitude = Number(
    segment?.start_longitude
  );

  const endLatitude = Number(
    segment?.end_latitude
  );

  const endLongitude = Number(
    segment?.end_longitude
  );

  if (
    Number.isFinite(startLatitude) &&
    Number.isFinite(startLongitude) &&
    Number.isFinite(endLatitude) &&
    Number.isFinite(endLongitude)
  ) {
    return [
      [startLatitude, startLongitude],
      [endLatitude, endLongitude],
    ];
  }

  return null;
}

// ============================================================
// FIT MAP
// ============================================================

function FitMap({ cameras, fitTrigger }) {
  const map = useMap();

  useEffect(() => {
    if (!cameras || cameras.length === 0) {
      return;
    }

    const validCameras = cameras.filter(
      (camera) =>
        Number.isFinite(Number(camera.latitude)) &&
        Number.isFinite(Number(camera.longitude))
    );

    if (validCameras.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(
      validCameras.map((camera) => [
        Number(camera.latitude),
        Number(camera.longitude),
      ])
    );

    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 13,
    });
  }, [cameras, map, fitTrigger]);

  return null;
}

// ============================================================
// CAMERA POPUP
// ============================================================

function CameraPopup({ camera }) {
  const cameraType = getCameraType(camera);

  const status = normalizeStatus(
    camera?.status
  );

  const statusColor =
    getStatusColor(status);

  const verification =
    camera?.verification_status ||
    "pending";

  const verificationColor =
    getVerificationColor(
      verification
    );

  return (
    <div
      style={{
        minWidth: "270px",
        maxWidth: "330px",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "17px",
            }}
          >
            {cameraType}
          </h3>

          {camera?.id !== undefined && (
            <div
              style={{
                color: "#64748b",
                fontSize: "12px",
                marginTop: "3px",
              }}
            >
              Camera ID: {camera.id}
            </div>
          )}
        </div>

        <span
          style={{
            background: statusColor,
            color: "white",
            borderRadius: "999px",
            padding: "4px 8px",
            fontSize: "11px",
            fontWeight: "700",
            whiteSpace: "nowrap",
          }}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      <div
        style={{
          display: "inline-block",
          background:
            verificationColor,
          color: "white",
          borderRadius: "999px",
          padding: "4px 8px",
          fontSize: "11px",
          fontWeight: "700",
          marginBottom: "10px",
          textTransform: "capitalize",
        }}
      >
        {String(verification)}
      </div>

      <div
        style={{
          lineHeight: "1.65",
          fontSize: "13px",
        }}
      >
        {camera?.city && (
          <div>
            <strong>City:</strong>{" "}
            {camera.city}
          </div>
        )}

        {camera?.state && (
          <div>
            <strong>State:</strong>{" "}
            {camera.state}
          </div>
        )}

        {camera?.country && (
          <div>
            <strong>Country:</strong>{" "}
            {camera.country}
          </div>
        )}

        {camera?.road_name && (
          <div>
            <strong>Road:</strong>{" "}
            {camera.road_name}
          </div>
        )}

        {camera?.enforcement_type && (
          <div>
            <strong>Enforcement:</strong>{" "}
            {camera.enforcement_type}
          </div>
        )}

        {camera?.speed_limit !== null &&
          camera?.speed_limit !== undefined && (
            <div>
              <strong>Speed Limit:</strong>{" "}
              {camera.speed_limit} km/h
            </div>
          )}

        {camera?.latitude !== undefined &&
          camera?.longitude !== undefined && (
            <div>
              <strong>Coordinates:</strong>{" "}
              {Number(
                camera.latitude
              ).toFixed(5)}
              ,{" "}
              {Number(
                camera.longitude
              ).toFixed(5)}
            </div>
          )}

        {camera?.source && (
          <div>
            <strong>Source:</strong>{" "}
            {camera.source}
          </div>
        )}

        {camera?.last_verified && (
          <div>
            <strong>Last Verified:</strong>{" "}
            {new Date(
              camera.last_verified
            ).toLocaleString()}
          </div>
        )}
      </div>

      {camera?.source_url && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "10px",
            borderTop:
              "1px solid #e5e7eb",
          }}
        >
          <a
            href={camera.source_url}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#2563eb",
              fontWeight: "700",
              textDecoration: "none",
            }}
          >
            View Source →
          </a>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TRAFFIC POPUP
// ============================================================

function TrafficPopup({ segment }) {
  const congestion =
    normalizeCongestionLevel(
      segment?.congestion_level
    );

  const color =
    getTrafficColor(congestion);

  const trafficStatus =
    segment?.traffic_status
      ? String(
          segment.traffic_status
        ).replaceAll("_", " ")
      : "";

  return (
    <div
      style={{
        minWidth: "250px",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px 0",
          fontSize: "17px",
        }}
      >
        🚦{" "}
        {segment?.road_name ||
          "Traffic Segment"}
      </h3>

      <div
        style={{
          display: "inline-block",
          background: color,
          color: "white",
          padding: "5px 10px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: "700",
          textTransform: "capitalize",
          marginBottom: "10px",
        }}
      >
        {congestion} congestion
      </div>

      <div
        style={{
          lineHeight: "1.65",
          fontSize: "13px",
        }}
      >
        {trafficStatus && (
          <div>
            <strong>Status:</strong>{" "}
            {trafficStatus}
          </div>
        )}

        {segment?.current_speed !== null &&
          segment?.current_speed !==
            undefined && (
            <div>
              <strong>
                Current Speed:
              </strong>{" "}
              {segment.current_speed} km/h
            </div>
          )}

        {segment?.free_flow_speed !== null &&
          segment?.free_flow_speed !==
            undefined && (
            <div>
              <strong>
                Free Flow:
              </strong>{" "}
              {segment.free_flow_speed} km/h
            </div>
          )}

        {segment?.delay_seconds !== null &&
          segment?.delay_seconds !==
            undefined && (
            <div>
              <strong>Delay:</strong>{" "}
              {segment.delay_seconds} seconds
            </div>
          )}

        {segment?.source && (
          <div>
            <strong>Source:</strong>{" "}
            {segment.source}
          </div>
        )}

        {segment?.source_id && (
          <div>
            <strong>Source ID:</strong>{" "}
            {segment.source_id}
          </div>
        )}

        {segment?.observed_at && (
          <div>
            <strong>Observed:</strong>{" "}
            {new Date(
              segment.observed_at
            ).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CameraMap() {
  // ==========================================================
  // CAMERA STATE
  // ==========================================================

  const [cameras, setCameras] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("All");

  const [stateFilter, setStateFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [
    verificationFilter,
    setVerificationFilter,
  ] = useState("All");

  // ==========================================================
  // TRAFFIC STATE
  // ==========================================================

  const [
    trafficSegments,
    setTrafficSegments,
  ] = useState([]);

  const [
    trafficLoading,
    setTrafficLoading,
  ] = useState(true);

  const [
    trafficError,
    setTrafficError,
  ] = useState("");

  const [
    showTraffic,
    setShowTraffic,
  ] = useState(true);

  const [
    lastTrafficUpdate,
    setLastTrafficUpdate,
  ] = useState(null);

  const [
    lastCameraUpdate,
    setLastCameraUpdate,
  ] = useState(null);

  const [
    cameraRefreshing,
    setCameraRefreshing,
  ] = useState(false);

  const [
    trafficRefreshing,
    setTrafficRefreshing,
  ] = useState(false);

  const [
    fitTrigger,
    setFitTrigger,
  ] = useState(0);

  // ==========================================================
  // LOAD CAMERAS
  // ==========================================================

  const loadCameras = useCallback(
    async (manual = false) => {
      try {
        if (manual) {
          setCameraRefreshing(true);
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

        const data =
          await response.json();

        if (
          !Array.isArray(
            data?.cameras
          )
        ) {
          throw new Error(
            "Invalid API response: cameras is not an array."
          );
        }

        setCameras(
          data.cameras
        );

        setLastCameraUpdate(
          new Date()
        );
      } catch (err) {
        console.error(
          "Camera API error:",
          err
        );

        setError(
          err?.message ||
            "Failed to load cameras."
        );
      } finally {
        if (manual) {
          setCameraRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  // ==========================================================
  // LOAD TRAFFIC
  // ==========================================================

  const loadTraffic = useCallback(
    async (manual = false) => {
      try {
        if (manual) {
          setTrafficRefreshing(true);
        } else {
          setTrafficLoading(true);
        }

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

        const data =
          await response.json();

        if (
          !Array.isArray(
            data?.segments
          )
        ) {
          throw new Error(
            "Invalid traffic API response: segments is not an array."
          );
        }

        setTrafficSegments(
          data.segments
        );

        setLastTrafficUpdate(
          new Date()
        );
      } catch (err) {
        console.error(
          "Traffic API error:",
          err
        );

        setTrafficError(
          err?.message ||
            "Failed to load traffic."
        );
      } finally {
        if (manual) {
          setTrafficRefreshing(false);
        } else {
          setTrafficLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadTraffic();

    const timer = setInterval(() => {
      loadTraffic();
    }, 60 * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [loadTraffic]);

  // ==========================================================
  // CAMERA TYPES
  // ==========================================================

  const cameraTypes = useMemo(() => {
    const types = cameras
      .map((camera) =>
        getCameraType(camera)
      )
      .filter(Boolean);

    return [
      "All",
      ...Array.from(
        new Set(types)
      ).sort(),
    ];
  }, [cameras]);

  // ==========================================================
  // STATES
  // ==========================================================

  const states = useMemo(() => {
    const values = cameras
      .map(
        (camera) =>
          camera?.state
      )
      .filter(
        (state) =>
          state &&
          String(state).trim()
      );

    return [
      "All",
      ...Array.from(
        new Set(values)
      ).sort(),
    ];
  }, [cameras]);

  // ==========================================================
  // FILTER CAMERAS
  // ==========================================================

  const filteredCameras =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return cameras.filter(
        (camera) => {
          const cameraType =
            getCameraType(camera);

          const matchesType =
            typeFilter === "All" ||
            String(cameraType) ===
              String(typeFilter);

          const matchesState =
            stateFilter === "All" ||
            String(
              camera?.state || ""
            ) ===
              String(stateFilter);

          const matchesStatus =
            statusFilter === "All" ||
            normalizeStatus(
              camera?.status
            ) ===
              statusFilter;

          const cameraVerification =
            String(
              camera?.verification_status ||
                "pending"
            )
              .toLowerCase()
              .trim();

          const matchesVerification =
            verificationFilter ===
              "All" ||
            cameraVerification ===
              verificationFilter;

          const searchableText = [
            camera?.id,
            camera?.city,
            camera?.state,
            camera?.country,
            camera?.road_name,
            camera?.location_name,
            camera?.camera_type,
            camera?.enforcement_type,
            camera?.source,
          ]
            .filter(
              (value) =>
                value !==
                  null &&
                value !==
                  undefined
            )
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchableText.includes(
              query
            );

          return (
            matchesType &&
            matchesState &&
            matchesStatus &&
            matchesVerification &&
            matchesSearch
          );
        }
      );
    }, [
      cameras,
      search,
      typeFilter,
      stateFilter,
      statusFilter,
      verificationFilter,
    ]);

  // ==========================================================
  // VALID TRAFFIC
  // ==========================================================

  const validTrafficSegments =
    useMemo(() => {
      return trafficSegments
        .map((segment) => {
          const coordinates =
            getTrafficCoordinates(
              segment
            );

          if (!coordinates) {
            return null;
          }

          return {
            ...segment,
            _coordinates:
              coordinates,
          };
        })
        .filter(Boolean);
    }, [trafficSegments]);

  // ==========================================================
  // TRAFFIC COUNTS
  // ==========================================================

  const trafficCounts =
    useMemo(() => {
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
            normalizeCongestionLevel(
              segment?.congestion_level
            );

          if (
            Object.prototype.hasOwnProperty.call(
              counts,
              level
            )
          ) {
            counts[level] += 1;
          } else {
            counts.unknown += 1;
          }
        }
      );

      return counts;
    }, [trafficSegments]);

  // ==========================================================
  // CAMERA COUNTS
  // ==========================================================

  const cameraStatusCounts =
    useMemo(() => {
      const counts = {
        active: 0,
        inactive: 0,
        unknown: 0,
      };

      cameras.forEach(
        (camera) => {
          const status =
            normalizeStatus(
              camera?.status
            );

          counts[status] += 1;
        }
      );

      return counts;
    }, [cameras]);

  // ==========================================================
  // CLEAR FILTERS
  // ==========================================================

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("All");
    setStateFilter("All");
    setStatusFilter("All");
    setVerificationFilter("All");
  };

  // ==========================================================
  // DEFAULT INDIA CENTER
  // ==========================================================

  const defaultCenter = [
    22.9734,
    78.6569,
  ];

  // ==========================================================
  // UI STYLES
  // ==========================================================

  const controlStyle = {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    background: "white",
    boxShadow:
      "0 2px 6px rgba(0,0,0,0.15)",
    fontSize: "13px",
  };

  const buttonStyle = {
    ...controlStyle,
    cursor: "pointer",
    fontWeight: "700",
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* =====================================================
          TOP CONTROLS
      ====================================================== */}

      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: "10px",
          left: "10px",
          right: "10px",
          display: "flex",
          gap: "7px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* SEARCH */}

        <input
          type="text"
          placeholder="Search camera, city, road, state..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          style={{
            ...controlStyle,
            minWidth: "230px",
          }}
        />

        {/* CAMERA TYPE */}

        <select
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(
              event.target.value
            )
          }
          style={controlStyle}
        >
          {cameraTypes.map(
            (type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            )
          )}
        </select>

        {/* STATE */}

        <select
          value={stateFilter}
          onChange={(event) =>
            setStateFilter(
              event.target.value
            )
          }
          style={controlStyle}
        >
          {states.map(
            (state) => (
              <option
                key={state}
                value={state}
              >
                {state}
              </option>
            )
          )}
        </select>

        {/* STATUS */}

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
          style={controlStyle}
        >
          <option value="All">
            All Status
          </option>

          <option value="active">
            🟢 Active
          </option>

          <option value="unknown">
            🟠 Pending / Unknown
          </option>

          <option value="inactive">
            🔴 Inactive / Offline
          </option>
        </select>

        {/* VERIFICATION */}

        <select
          value={verificationFilter}
          onChange={(event) =>
            setVerificationFilter(
              event.target.value
            )
          }
          style={controlStyle}
        >
          <option value="All">
            All Verification
          </option>

          <option value="verified">
            ✅ Verified
          </option>

          <option value="pending">
            ⏳ Pending
          </option>

          <option value="approved">
            ✅ Approved
          </option>

          <option value="rejected">
            ❌ Rejected
          </option>
        </select>

        {/* CAMERA COUNT */}

        <div
          style={{
            ...controlStyle,
            fontWeight: "700",
          }}
        >
          📷{" "}
          {filteredCameras.length} /{" "}
          {cameras.length}
        </div>

        {/* ACTIVE */}

        <div
          style={{
            ...controlStyle,
            color: "#15803d",
            fontWeight: "700",
          }}
        >
          🟢 Active{" "}
          {cameraStatusCounts.active}
        </div>

        {/* VERIFIED */}

        <div
          style={{
            ...controlStyle,
            color: "#166534",
            fontWeight: "700",
          }}
        >
          ✅ Verified{" "}
          {
            cameras.filter(
              (camera) =>
                String(
                  camera?.verification_status ||
                    ""
                )
                  .toLowerCase()
                  .trim() ===
                "verified"
            ).length
          }
        </div>

        {/* PENDING */}

        <div
          style={{
            ...controlStyle,
            color: "#b45309",
            fontWeight: "700",
          }}
        >
          ⏳ Pending{" "}
          {
            cameras.filter(
              (camera) =>
                String(
                  camera?.verification_status ||
                    "pending"
                )
                  .toLowerCase()
                  .trim() ===
                "pending"
            ).length
          }
        </div>

        {/* TRAFFIC TOGGLE */}

        <button
          type="button"
          onClick={() =>
            setShowTraffic(
              (current) =>
                !current
            )
          }
          style={{
            ...buttonStyle,
            border:
              showTraffic
                ? "2px solid #2563eb"
                : "1px solid #d1d5db",
            background:
              showTraffic
                ? "#eff6ff"
                : "white",
            color:
              showTraffic
                ? "#1d4ed8"
                : "#333",
          }}
        >
          🚦 Traffic{" "}
          {showTraffic
            ? "ON"
            : "OFF"}
        </button>

        {/* REFRESH CAMERAS */}

        <button
          type="button"
          onClick={() =>
            loadCameras(true)
          }
          disabled={
            cameraRefreshing
          }
          style={{
            ...buttonStyle,
            opacity:
              cameraRefreshing
                ? 0.65
                : 1,
          }}
        >
          🔄{" "}
          {cameraRefreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

        {/* UPDATE TRAFFIC */}

        <button
          type="button"
          onClick={() =>
            loadTraffic(true)
          }
          disabled={
            trafficRefreshing
          }
          style={{
            ...buttonStyle,
            opacity:
              trafficRefreshing
                ? 0.65
                : 1,
          }}
        >
          🚦{" "}
          {trafficRefreshing
            ? "Updating..."
            : "Update Traffic"}
        </button>

        {/* FIT */}

        <button
          type="button"
          onClick={() =>
            setFitTrigger(
              (value) =>
                value + 1
            )
          }
          style={buttonStyle}
        >
          🎯 Fit All
        </button>

        {/* CLEAR */}

        <button
          type="button"
          onClick={clearFilters}
          style={buttonStyle}
        >
          ✕ Clear
        </button>
      </div>

      {/* =====================================================
          CAMERA LOADING
      ====================================================== */}

      {loading && (
        <div
          style={{
            position: "absolute",
            zIndex: 2000,
            top: "75px",
            left: "50%",
            transform:
              "translateX(-50%)",
            background: "white",
            padding: "10px 16px",
            borderRadius: "7px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.25)",
            fontWeight: "700",
          }}
        >
          Loading cameras...
        </div>
      )}

      {/* =====================================================
          CAMERA ERROR
      ====================================================== */}

      {error && (
        <div
          style={{
            position: "absolute",
            zIndex: 2000,
            top: "75px",
            left: "50%",
            transform:
              "translateX(-50%)",
            background: "white",
            border:
              "1px solid #ef4444",
            color: "#b91c1c",
            padding: "12px 16px",
            borderRadius: "7px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.25)",
            maxWidth: "500px",
          }}
        >
          <strong>
            Camera API Error
          </strong>

          <div
            style={{
              marginTop: "4px",
            }}
          >
            {error}
          </div>
        </div>
      )}

      {/* =====================================================
          TRAFFIC ERROR
      ====================================================== */}

      {trafficError && (
        <div
          style={{
            position: "absolute",
            zIndex: 2000,
            top: "75px",
            right: "15px",
            background: "white",
            border:
              "1px solid #ef4444",
            color: "#b91c1c",
            padding: "10px 14px",
            borderRadius: "7px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.2)",
            maxWidth: "400px",
          }}
        >
          <strong>
            Traffic API Error
          </strong>

          <div
            style={{
              marginTop: "3px",
            }}
          >
            {trafficError}
          </div>
        </div>
      )}

      {/* =====================================================
          MAP
      ====================================================== */}

      <MapContainer
        center={defaultCenter}
        zoom={5}
        scrollWheelZoom={true}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMap
          cameras={filteredCameras}
          fitTrigger={fitTrigger}
        />

        {/* =================================================
            TRAFFIC
        ================================================== */}

        {showTraffic &&
          validTrafficSegments.map(
            (segment) => {
              const congestion =
                normalizeCongestionLevel(
                  segment?.congestion_level
                );

              const color =
                getTrafficColor(
                  congestion
                );

              const weight =
                getTrafficWeight(
                  congestion
                );

              return (
                <Polyline
                  key={`traffic-${segment.id}`}
                  positions={
                    segment._coordinates
                  }
                  pathOptions={{
                    color,
                    weight,
                    opacity: 0.88,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                >
                  <Popup>
                    <TrafficPopup
                      segment={
                        segment
                      }
                    />
                  </Popup>
                </Polyline>
              );
            }
          )}

        {/* =================================================
            CAMERA CLUSTERS
        ================================================== */}

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
          maxClusterRadius={50}
        >
          {filteredCameras.map(
            (camera) => {
              const latitude =
                Number(
                  camera?.latitude
                );

              const longitude =
                Number(
                  camera?.longitude
                );

              if (
                !Number.isFinite(
                  latitude
                ) ||
                !Number.isFinite(
                  longitude
                )
              ) {
                return null;
              }

              return (
                <Marker
                  key={
                    camera.id
                  }
                  position={[
                    latitude,
                    longitude,
                  ]}
                  icon={createCameraIcon(
                    getCameraType(
                      camera
                    )
                  )}
                >
                  <Popup>
                    <CameraPopup
                      camera={
                        camera
                      }
                    />
                  </Popup>
                </Marker>
              );
            }
          )}
        </MarkerClusterGroup>
      </MapContainer>

      {/* =====================================================
          LEGEND
      ====================================================== */}

      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          bottom: "20px",
          right: "20px",
          background: "white",
          padding: "14px 16px",
          borderRadius: "9px",
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.25)",
          fontSize: "13px",
          minWidth: "205px",
        }}
      >
        {/* CAMERA TYPES */}

        <div
          style={{
            fontWeight: "800",
            marginBottom: "8px",
          }}
        >
          🇮🇳 Camera Types
        </div>

        <div style={{ marginBottom: "5px" }}>
          🚗 Speed Camera
        </div>

        <div style={{ marginBottom: "5px" }}>
          🚦 Red Light Camera
        </div>

        <div style={{ marginBottom: "5px" }}>
          📹 Traffic Camera
        </div>

        <div
          style={{
            marginBottom: "10px",
          }}
        >
          🔎 ANPR / ITMS
        </div>

        <div
          style={{
            borderTop:
              "1px solid #e5e7eb",
            marginBottom: "10px",
          }}
        />

        {/* CAMERA STATUS */}

        <div
          style={{
            fontWeight: "800",
            marginBottom: "8px",
          }}
        >
          Camera Status
        </div>

        <div
          style={{
            marginBottom: "5px",
          }}
        >
          🟢 Active
        </div>

        <div
          style={{
            marginBottom: "5px",
          }}
        >
          🟠 Pending / Unknown
        </div>

        <div
          style={{
            marginBottom: "10px",
          }}
        >
          🔴 Inactive / Offline
        </div>

        <div
          style={{
            borderTop:
              "1px solid #e5e7eb",
            marginBottom: "10px",
          }}
        />

        {/* TRAFFIC */}

        <div
          style={{
            fontWeight: "800",
            marginBottom: "8px",
          }}
        >
          🚦 Traffic
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "5px",
          }}
        >
          <span
            style={{
              width: "24px",
              height: "5px",
              borderRadius: "3px",
              background: "#22c55e",
            }}
          />

          Low (
          {trafficCounts.low})
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "5px",
          }}
        >
          <span
            style={{
              width: "24px",
              height: "5px",
              borderRadius: "3px",
              background: "#eab308",
            }}
          />

          Moderate (
          {trafficCounts.moderate})
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "5px",
          }}
        >
          <span
            style={{
              width: "24px",
              height: "5px",
              borderRadius: "3px",
              background: "#f97316",
            }}
          />

          High (
          {trafficCounts.high})
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "5px",
          }}
        >
          <span
            style={{
              width: "24px",
              height: "5px",
              borderRadius: "3px",
              background: "#ef4444",
            }}
          />

          Severe (
          {trafficCounts.severe})
        </div>

        {trafficCounts.unknown >
          0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              marginBottom: "5px",
            }}
          >
            <span
              style={{
                width: "24px",
                height: "5px",
                borderRadius: "3px",
                background: "#64748b",
              }}
            />

            Unknown (
            {trafficCounts.unknown})
          </div>
        )}

        {/* UPDATE INFO */}

        <div
          style={{
            marginTop: "10px",
            paddingTop: "9px",
            borderTop:
              "1px solid #e5e7eb",
            fontSize: "11px",
            color: "#64748b",
            lineHeight: "1.5",
          }}
        >
          <div>
            {trafficLoading
              ? "Loading traffic..."
              : `${trafficSegments.length} traffic segment${
                  trafficSegments.length ===
                  1
                    ? ""
                    : "s"
                } loaded`}
          </div>

          {lastTrafficUpdate && (
            <div>
              Traffic updated{" "}
              {lastTrafficUpdate.toLocaleTimeString()}
            </div>
          )}

          {lastCameraUpdate && (
            <div>
              Cameras updated{" "}
              {lastCameraUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}