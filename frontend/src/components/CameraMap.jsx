import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";

import L from "leaflet";

import "leaflet/dist/leaflet.css";


// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = "http://127.0.0.1:8000";

const INDIA_CENTER = [22.9734, 78.6569];

const INDIA_BOUNDS = [
  [6.5, 68.0],
  [35.8, 97.5],
];


// ============================================================
// GLOBAL MAP STYLE
// ============================================================

const styles = {
  shell: {
    position: "relative",
    width: "100%",
    height: "calc(100vh - 70px)",
    minHeight: "600px",
    overflow: "hidden",
    background: "#e5e7eb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },

  map: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },

  glass: {
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.75)",
    boxShadow:
      "0 8px 30px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
  },

  searchPanel: {
    position: "absolute",
    zIndex: 1000,
    top: 18,
    left: 18,
    width: "min(430px, calc(100vw - 36px))",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 14px",
    borderRadius: 16,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    border: 0,
    outline: 0,
    background: "transparent",
    fontSize: 15,
    color: "#111827",
  },

  floatingPanel: {
    position: "absolute",
    zIndex: 1000,
    borderRadius: 16,
  },

  filterPanel: {
    top: 78,
    left: 18,
    width: "min(430px, calc(100vw - 36px))",
    padding: 14,
    borderRadius: 16,
  },

  statsPanel: {
    position: "absolute",
    zIndex: 1000,
    top: 18,
    right: 18,
    width: 280,
    padding: 16,
    borderRadius: 18,
  },

  controlsPanel: {
    position: "absolute",
    zIndex: 1000,
    right: 18,
    bottom: 22,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  controlButton: {
    width: 44,
    height: 44,
    border: 0,
    borderRadius: 13,
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow:
      "0 5px 18px rgba(0,0,0,0.15)",
    cursor: "pointer",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomPanel: {
    position: "absolute",
    zIndex: 1000,
    left: 18,
    bottom: 22,
    width: "min(390px, calc(100vw - 36px))",
    padding: 14,
    borderRadius: 18,
  },

  select: {
    width: "100%",
    padding: "9px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    outline: "none",
  },

  smallButton: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111827",
    borderRadius: 10,
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
};


// ============================================================
// CAMERA ICONS
// ============================================================

function getCameraEmoji(type) {
  const value = String(type || "").toLowerCase();

  if (
    value.includes("speed") ||
    value.includes("velocity")
  ) {
    return "🚗";
  }

  if (
    value.includes("red") ||
    value.includes("signal") ||
    value.includes("traffic light")
  ) {
    return "🚦";
  }

  if (
    value.includes("anpr") ||
    value.includes("itms") ||
    value.includes("number plate")
  ) {
    return "🔎";
  }

  if (
    value.includes("traffic") ||
    value.includes("surveillance")
  ) {
    return "📹";
  }

  return "📷";
}


function createCameraIcon(type, selected = false) {
  const emoji = getCameraEmoji(type);

  return L.divIcon({
    className: "global-camera-marker",

    html: `
      <div
        style="
          width: ${selected ? 44 : 38}px;
          height: ${selected ? 44 : 38}px;
          border-radius: 50%;
          background: rgba(255,255,255,0.97);
          border: ${selected ? "3px solid #007aff" : "2px solid rgba(0,0,0,0.18)"};
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:${selected ? 23 : 20}px;
          box-shadow:
            0 4px 14px rgba(0,0,0,0.24),
            0 1px 3px rgba(0,0,0,0.12);
          transform: translateY(0);
          transition: all .2s ease;
        "
      >
        ${emoji}
      </div>
    `,

    iconSize: selected ? [44, 44] : [38, 38],
    iconAnchor: selected
      ? [22, 22]
      : [19, 19],
    popupAnchor: [0, selected ? -22 : -19],
  });
}


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
  const status = String(
    value || "unknown"
  )
    .toLowerCase()
    .trim();

  if (
    [
      "active",
      "online",
      "operational",
      "working",
    ].includes(status)
  ) {
    return "active";
  }

  if (
    [
      "inactive",
      "offline",
      "disabled",
      "not working",
    ].includes(status)
  ) {
    return "inactive";
  }

  return "unknown";
}


function getStatusColor(status) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "active") {
    return "#34c759";
  }

  if (normalized === "inactive") {
    return "#ff3b30";
  }

  return "#ff9500";
}


function getStatusLabel(status) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "active") {
    return "Active";
  }

  if (normalized === "inactive") {
    return "Offline";
  }

  return "Unknown";
}


function normalizeVerification(value) {
  const verification = String(
    value || "pending"
  )
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


function getVerificationColor(value) {
  const status =
    normalizeVerification(value);

  if (
    status === "verified" ||
    status === "approved"
  ) {
    return "#34c759";
  }

  if (status === "rejected") {
    return "#ff3b30";
  }

  return "#ff9500";
}


function normalizeTraffic(value) {
  const level = String(
    value || "unknown"
  )
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


function trafficColor(value) {
  const level =
    normalizeTraffic(value);

  if (level === "low") {
    return "#34c759";
  }

  if (level === "moderate") {
    return "#ffcc00";
  }

  if (level === "high") {
    return "#ff9500";
  }

  if (level === "severe") {
    return "#ff3b30";
  }

  return "#8e8e93";
}


function trafficWeight(value) {
  const level =
    normalizeTraffic(value);

  if (level === "severe") {
    return 8;
  }

  if (level === "high") {
    return 7;
  }

  if (level === "moderate") {
    return 6;
  }

  return 5;
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}


// ============================================================
// TRAFFIC COORDINATES
// ============================================================

function getTrafficCoordinates(segment) {
  if (
    segment?.geometry?.type ===
      "LineString" &&
    Array.isArray(
      segment.geometry.coordinates
    )
  ) {
    const coordinates =
      segment.geometry.coordinates
        .map((point) => {
          if (
            !Array.isArray(point) ||
            point.length < 2
          ) {
            return null;
          }

          const longitude =
            Number(point[0]);

          const latitude =
            Number(point[1]);

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

  if (
    Array.isArray(
      segment?.coordinates
    )
  ) {
    const coordinates =
      segment.coordinates
        .map((point) => {
          if (
            !Array.isArray(point) ||
            point.length < 2
          ) {
            return null;
          }

          const longitude =
            Number(point[0]);

          const latitude =
            Number(point[1]);

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

  const startLat = Number(
    segment?.start_latitude
  );

  const startLng = Number(
    segment?.start_longitude
  );

  const endLat = Number(
    segment?.end_latitude
  );

  const endLng = Number(
    segment?.end_longitude
  );

  if (
    Number.isFinite(startLat) &&
    Number.isFinite(startLng) &&
    Number.isFinite(endLat) &&
    Number.isFinite(endLng)
  ) {
    return [
      [startLat, startLng],
      [endLat, endLng],
    ];
  }

  return null;
}


// ============================================================
// MAP VIEW CONTROLLER
// ============================================================

function MapController({
  cameras,
  fitTrigger,
}) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(cameras)) {
      return;
    }

    const valid = cameras.filter(
      (camera) =>
        Number.isFinite(
          Number(camera?.latitude)
        ) &&
        Number.isFinite(
          Number(camera?.longitude)
        )
    );

    if (!valid.length) {
      return;
    }

    const bounds = L.latLngBounds(
      valid.map((camera) => [
        Number(camera.latitude),
        Number(camera.longitude),
      ])
    );

    map.fitBounds(bounds, {
      paddingTopLeft: [40, 120],
      paddingBottomRight: [40, 120],
      maxZoom: 13,
      animate: true,
    });
  }, [cameras, fitTrigger, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}


// ============================================================
// MAP CLICK HANDLER
// ============================================================

function MapClickHandler({
  onMapClick,
}) {
  useMapEvents({
    click() {
      onMapClick();
    },
  });

  return null;
}


// ============================================================
// CAMERA POPUP
// ============================================================

function CameraPopup({
  camera,
}) {
  const type =
    getCameraType(camera);

  const status =
    normalizeStatus(camera?.status);

  const verification =
    normalizeVerification(
      camera?.verification_status
    );

  return (
    <div
      style={{
        minWidth: 270,
        maxWidth: 340,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background:
              "linear-gradient(135deg,#f2f2f7,#ffffff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 23,
            boxShadow:
              "inset 0 0 0 1px #e5e5ea",
          }}
        >
          {getCameraEmoji(type)}
        </div>

        <div
          style={{
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 750,
              color: "#111827",
            }}
          >
            {type}
          </div>

          <div
            style={{
              color: "#8e8e93",
              fontSize: 12,
              marginTop: 3,
            }}
          >
            Camera #{camera?.id ?? "—"}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 13,
        }}
      >
        <span
          style={{
            background:
              getStatusColor(status),
            color: "#fff",
            padding: "4px 9px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {getStatusLabel(status)}
        </span>

        <span
          style={{
            background:
              getVerificationColor(
                verification
              ),
            color: "#fff",
            padding: "4px 9px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "capitalize",
          }}
        >
          {verification}
        </span>
      </div>

      <div
        style={{
          borderTop:
            "1px solid #e5e5ea",
          paddingTop: 10,
          lineHeight: 1.7,
          fontSize: 13,
          color: "#3a3a3c",
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

        {camera?.speed_limit !==
          null &&
          camera?.speed_limit !==
            undefined && (
            <div>
              <strong>Speed:</strong>{" "}
              {camera.speed_limit} km/h
            </div>
          )}

        {camera?.latitude !==
          undefined &&
          camera?.longitude !==
            undefined && (
            <div>
              <strong>Location:</strong>{" "}
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
            <strong>Verified:</strong>{" "}
            {formatDate(
              camera.last_verified
            )}
          </div>
        )}
      </div>

      {camera?.source_url && (
        <a
          href={camera.source_url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            marginTop: 13,
            paddingTop: 11,
            borderTop:
              "1px solid #e5e5ea",
            color: "#007aff",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 13,
          }}
        >
          View official source →
        </a>
      )}
    </div>
  );
}


// ============================================================
// TRAFFIC POPUP
// ============================================================

function TrafficPopup({
  segment,
}) {
  const level =
    normalizeTraffic(
      segment?.congestion_level
    );

  return (
    <div
      style={{
        minWidth: 250,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 17,
          fontWeight: 750,
          marginBottom: 8,
        }}
      >
        🚦{" "}
        {segment?.road_name ||
          "Traffic Segment"}
      </div>

      <span
        style={{
          display: "inline-block",
          background:
            trafficColor(level),
          color: "#fff",
          padding: "5px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 750,
          textTransform: "capitalize",
          marginBottom: 11,
        }}
      >
        {level} congestion
      </span>

      <div
        style={{
          lineHeight: 1.7,
          fontSize: 13,
          color: "#3a3a3c",
        }}
      >
        {segment?.traffic_status && (
          <div>
            <strong>Status:</strong>{" "}
            {String(
              segment.traffic_status
            ).replaceAll("_", " ")}
          </div>
        )}

        {segment?.current_speed !==
          null &&
          segment?.current_speed !==
            undefined && (
            <div>
              <strong>Current speed:</strong>{" "}
              {segment.current_speed} km/h
            </div>
          )}

        {segment?.free_flow_speed !==
          null &&
          segment?.free_flow_speed !==
            undefined && (
            <div>
              <strong>Free flow:</strong>{" "}
              {segment.free_flow_speed} km/h
            </div>
          )}

        {segment?.delay_seconds !==
          null &&
          segment?.delay_seconds !==
            undefined && (
            <div>
              <strong>Delay:</strong>{" "}
              {segment.delay_seconds}s
            </div>
          )}

        {segment?.source && (
          <div>
            <strong>Source:</strong>{" "}
            {segment.source}
          </div>
        )}

        {segment?.observed_at && (
          <div>
            <strong>Observed:</strong>{" "}
            {formatDate(
              segment.observed_at
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================
// STAT CARD
// ============================================================

function MiniStat({
  icon,
  label,
  value,
  detail,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: "#f2f2f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#8e8e93",
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 750,
            color: "#111827",
          }}
        >
          {value}
        </div>

        {detail && (
          <div
            style={{
              fontSize: 10,
              color: "#8e8e93",
            }}
          >
            {detail}
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

  const [selectedCamera, setSelectedCamera] =
    useState(null);

  const [cameraRefreshing, setCameraRefreshing] =
    useState(false);

  const [lastCameraUpdate, setLastCameraUpdate] =
    useState(null);

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
  ] = useState(false);

  const [
    trafficError,
    setTrafficError,
  ] = useState("");

  const [
    trafficRefreshing,
    setTrafficRefreshing,
  ] = useState(false);

  const [
    showTraffic,
    setShowTraffic,
  ] = useState(true);

  const [
    lastTrafficUpdate,
    setLastTrafficUpdate,
  ] = useState(null);

  // ==========================================================
  // MAP STATE
  // ==========================================================

  const [fitTrigger, setFitTrigger] =
    useState(0);

  const [mapStyle, setMapStyle] =
    useState("standard");

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

        let result = [];

        if (Array.isArray(data)) {
          result = data;
        } else if (
          Array.isArray(data?.cameras)
        ) {
          result = data.cameras;
        } else {
          throw new Error(
            "Invalid camera API response."
          );
        }

        setCameras(result);

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
            "Unable to load cameras."
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

        let result = [];

        if (Array.isArray(data)) {
          result = data;
        } else if (
          Array.isArray(data?.segments)
        ) {
          result = data.segments;
        } else {
          throw new Error(
            "Invalid traffic API response."
          );
        }

        setTrafficSegments(result);

        setLastTrafficUpdate(
          new Date()
        );
      } catch (err) {
        console.warn(
          "Traffic API unavailable:",
          err
        );

        setTrafficSegments([]);

        setTrafficError(
          err?.message ||
            "Traffic data unavailable."
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

    const interval = setInterval(
      () => {
        loadTraffic();
      },
      60 * 1000
    );

    return () => {
      clearInterval(interval);
    };
  }, [loadTraffic]);


  // ==========================================================
  // CAMERA TYPES
  // ==========================================================

  const cameraTypes = useMemo(() => {
    const values = cameras
      .map((camera) =>
        getCameraType(camera)
      )
      .filter(Boolean);

    return [
      "All",
      ...Array.from(
        new Set(values)
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
      .filter(Boolean)
      .map((value) =>
        String(value)
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

  const filteredCameras = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return cameras.filter(
      (camera) => {
        const type =
          getCameraType(camera);

        const status =
          normalizeStatus(
            camera?.status
          );

        const verification =
          normalizeVerification(
            camera?.verification_status
          );

        const matchesType =
          typeFilter === "All" ||
          String(type) ===
            String(typeFilter);

        const matchesState =
          stateFilter === "All" ||
          String(
            camera?.state || ""
          ) ===
            String(stateFilter);

        const matchesStatus =
          statusFilter === "All" ||
          status === statusFilter;

        const matchesVerification =
          verificationFilter ===
            "All" ||
          verification ===
            verificationFilter;

        const searchable = [
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
              value !== null &&
              value !== undefined
          )
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query ||
          searchable.includes(query);

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
  // CAMERA COUNTS
  // ==========================================================

  const cameraStats = useMemo(() => {
    const stats = {
      active: 0,
      inactive: 0,
      unknown: 0,
      verified: 0,
      pending: 0,
      rejected: 0,
    };

    cameras.forEach((camera) => {
      const status =
        normalizeStatus(
          camera?.status
        );

      const verification =
        normalizeVerification(
          camera?.verification_status
        );

      stats[status] += 1;

      if (
        verification === "verified" ||
        verification === "approved"
      ) {
        stats.verified += 1;
      } else if (
        verification === "rejected"
      ) {
        stats.rejected += 1;
      } else {
        stats.pending += 1;
      }
    });

    return stats;
  }, [cameras]);


  // ==========================================================
  // TRAFFIC COUNTS
  // ==========================================================

  const trafficStats = useMemo(() => {
    const result = {
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

        result[level] += 1;
      }
    );

    return result;
  }, [trafficSegments]);


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
  // TILE MAP
  // ==========================================================

  const tileUrl =
    mapStyle === "light"
      ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div style={styles.shell}>

      {/* ====================================================
          MAP
      ===================================================== */}

      <MapContainer
        center={INDIA_CENTER}
        zoom={5}
        minZoom={4}
        maxZoom={18}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={0.7}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={true}
        style={styles.map}
      >

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
          maxZoom={19}
        />

        <MapController
          cameras={filteredCameras}
          fitTrigger={fitTrigger}
        />

        <MapClickHandler
          onMapClick={() =>
            setSelectedCamera(null)
          }
        />

        {/* ==================================================
            TRAFFIC
        =================================================== */}

        {showTraffic &&
          validTrafficSegments.map(
            (segment, index) => {
              const level =
                normalizeTraffic(
                  segment?.congestion_level
                );

              const key =
                segment?.id ??
                `traffic-${index}`;

              return (
                <Polyline
                  key={key}
                  positions={
                    segment._coordinates
                  }
                  pathOptions={{
                    color:
                      trafficColor(level),
                    weight:
                      trafficWeight(
                        level
                      ),
                    opacity: 0.9,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                >
                  <Popup>
                    <TrafficPopup
                      segment={segment}
                    />
                  </Popup>
                </Polyline>
              );
            }
          )}

        {/* ==================================================
            CAMERA MARKERS
        =================================================== */}

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
          maxClusterRadius={48}
        >
          {filteredCameras.map(
            (camera, index) => {
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

              const key =
                camera?.id ??
                `${latitude}-${longitude}-${index}`;

              const isSelected =
                selectedCamera?.id ===
                camera?.id;

              return (
                <Marker
                  key={key}
                  position={[
                    latitude,
                    longitude,
                  ]}
                  icon={createCameraIcon(
                    getCameraType(camera),
                    isSelected
                  )}
                  eventHandlers={{
                    click: () =>
                      setSelectedCamera(
                        camera
                      ),
                  }}
                >
                  <Popup
                    closeButton={true}
                    autoPan={true}
                  >
                    <CameraPopup
                      camera={camera}
                    />
                  </Popup>
                </Marker>
              );
            }
          )}
        </MarkerClusterGroup>

      </MapContainer>


      {/* ====================================================
          SEARCH
      ===================================================== */}

      <div
        style={{
          ...styles.searchPanel,
          ...styles.glass,
          borderRadius: 16,
        }}
      >

        <div style={styles.searchBox}>

          <span
            style={{
              fontSize: 19,
            }}
          >
            🔎
          </span>

          <input
            type="text"
            value={search}
            placeholder="Search cameras, cities, roads..."
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            style={styles.searchInput}
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              style={{
                border: 0,
                background:
                  "#e5e5ea",
                width: 25,
                height: 25,
                borderRadius: "50%",
                cursor: "pointer",
                color: "#555",
              }}
            >
              ×
            </button>
          )}

        </div>


        {/* ==================================================
            FILTERS
        =================================================== */}

        <div
          style={{
            padding:
              "0 14px 14px",
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 8,
          }}
        >

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value
              )
            }
            style={styles.select}
          >
            {cameraTypes.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type === "All"
                    ? "All camera types"
                    : type}
                </option>
              )
            )}
          </select>


          <select
            value={stateFilter}
            onChange={(event) =>
              setStateFilter(
                event.target.value
              )
            }
            style={styles.select}
          >
            {states.map(
              (state) => (
                <option
                  key={state}
                  value={state}
                >
                  {state === "All"
                    ? "All states"
                    : state}
                </option>
              )
            )}
          </select>


          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            style={styles.select}
          >
            <option value="All">
              All statuses
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Offline
            </option>

            <option value="unknown">
              Unknown
            </option>
          </select>


          <select
            value={verificationFilter}
            onChange={(event) =>
              setVerificationFilter(
                event.target.value
              )
            }
            style={styles.select}
          >
            <option value="All">
              All verification
            </option>

            <option value="verified">
              Verified
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="rejected">
              Rejected
            </option>
          </select>

        </div>


        {/* FILTER FOOTER */}

        <div
          style={{
            padding:
              "0 14px 13px",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 8,
          }}
        >

          <div
            style={{
              fontSize: 12,
              color: "#8e8e93",
            }}
          >
            Showing{" "}
            <strong
              style={{
                color: "#111827",
              }}
            >
              {filteredCameras.length}
            </strong>{" "}
            of {cameras.length}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            style={{
              ...styles.smallButton,
              color: "#007aff",
            }}
          >
            Clear filters
          </button>

        </div>

      </div>


      {/* ====================================================
          TOP RIGHT STATISTICS
      ===================================================== */}

      <div
        style={{
          ...styles.statsPanel,
          ...styles.glass,
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            marginBottom: 15,
          }}
        >

          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              India
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#8e8e93",
                marginTop: 2,
              }}
            >
              Traffic intelligence
            </div>
          </div>

          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background:
                "#f2f2f7",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              fontSize: 19,
            }}
          >
            🇮🇳
          </div>

        </div>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 14,
          }}
        >

          <MiniStat
            icon="📷"
            label="CAMERAS"
            value={cameras.length}
            detail={
              `${cameraStats.active} active`
            }
          />

          <MiniStat
            icon="✓"
            label="VERIFIED"
            value={
              cameraStats.verified
            }
            detail={
              `${cameraStats.pending} pending`
            }
          />

          <MiniStat
            icon="🚦"
            label="TRAFFIC"
            value={
              trafficSegments.length
            }
            detail={
              trafficSegments.length
                ? `${trafficStats.high + trafficStats.severe} congested`
                : "No live data"
            }
          />

          <MiniStat
            icon="🏙️"
            label="STATES"
            value={
              Math.max(
                states.length - 1,
                0
              )
            }
            detail="Coverage"
          />

        </div>


        {/* API STATUS */}

        <div
          style={{
            marginTop: 15,
            paddingTop: 12,
            borderTop:
              "1px solid #e5e5ea",
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11,
            color: "#8e8e93",
          }}
        >

          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                error
                  ? "#ff3b30"
                  : "#34c759",
              boxShadow:
                error
                  ? "0 0 0 3px rgba(255,59,48,.12)"
                  : "0 0 0 3px rgba(52,199,89,.12)",
            }}
          />

          {error
            ? "Camera API unavailable"
            : "Camera API online"}

        </div>

      </div>


      {/* ====================================================
          LEFT BOTTOM INFORMATION
      ===================================================== */}

      <div
        style={{
          ...styles.bottomPanel,
          ...styles.glass,
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 10,
          }}
        >

          <div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Live map
            </div>

            <div
              style={{
                marginTop: 3,
                fontSize: 11,
                color: "#8e8e93",
              }}
            >
              Camera enforcement &
              traffic intelligence
            </div>

          </div>


          <button
            type="button"
            onClick={() =>
              setShowTraffic(
                (value) => !value
              )
            }
            style={{
              border: 0,
              borderRadius: 10,
              padding:
                "8px 11px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 750,
              background:
                showTraffic
                  ? "#007aff"
                  : "#f2f2f7",
              color:
                showTraffic
                  ? "#fff"
                  : "#3a3a3c",
            }}
          >
            🚦{" "}
            {showTraffic
              ? "Traffic On"
              : "Traffic Off"}
          </button>

        </div>


        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
          }}
        >

          <span
            style={{
              background:
                "#e8f8ed",
              color: "#248a3d",
              padding:
                "5px 9px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ● {cameraStats.active} Active
          </span>

          <span
            style={{
              background:
                "#fff4df",
              color: "#a05a00",
              padding:
                "5px 9px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ● {cameraStats.pending} Pending
          </span>

          <span
            style={{
              background:
                "#f2f2f7",
              color: "#636366",
              padding:
                "5px 9px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            🚦{" "}
            {trafficSegments.length}{" "}
            Segments
          </span>

        </div>


        <div
          style={{
            marginTop: 10,
            fontSize: 10,
            color: "#8e8e93",
          }}
        >
          {lastCameraUpdate
            ? `Cameras updated ${lastCameraUpdate.toLocaleTimeString()}`
            : "Loading camera data..."}
        </div>

      </div>


      {/* ====================================================
          MAP CONTROLS
      ===================================================== */}

      <div
        style={styles.controlsPanel}
      >

        {/* FIT */}

        <button
          type="button"
          title="Fit all cameras"
          onClick={() =>
            setFitTrigger(
              (value) => value + 1
            )
          }
          style={
            styles.controlButton
          }
        >
          🎯
        </button>


        {/* REFRESH CAMERAS */}

        <button
          type="button"
          title="Refresh cameras"
          disabled={
            cameraRefreshing
          }
          onClick={() =>
            loadCameras(true)
          }
          style={{
            ...styles.controlButton,
            opacity:
              cameraRefreshing
                ? 0.55
                : 1,
          }}
        >
          🔄
        </button>


        {/* TRAFFIC UPDATE */}

        <button
          type="button"
          title="Update traffic"
          disabled={
            trafficRefreshing
          }
          onClick={() =>
            loadTraffic(true)
          }
          style={{
            ...styles.controlButton,
            opacity:
              trafficRefreshing
                ? 0.55
                : 1,
          }}
        >
          🚦
        </button>


        {/* MAP STYLE */}

        <button
          type="button"
          title="Change map style"
          onClick={() =>
            setMapStyle(
              (value) =>
                value === "standard"
                  ? "light"
                  : "standard"
            )
          }
          style={
            styles.controlButton
          }
        >
          🗺️
        </button>

      </div>


      {/* ====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <div
          style={{
            position: "absolute",
            zIndex: 2000,
            top: "50%",
            left: "50%",
            transform:
              "translate(-50%, -50%)",
            ...styles.glass,
            borderRadius: 16,
            padding:
              "15px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <span>🗺️</span>
          Loading camera network...
        </div>
      )}


      {/* ====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div
          style={{
            position: "absolute",
            zIndex: 2000,
            top: 150,
            left: "50%",
            transform:
              "translateX(-50%)",
            width:
              "min(450px, calc(100vw - 40px))",
            background:
              "rgba(255,255,255,.96)",
            border:
              "1px solid rgba(255,59,48,.35)",
            boxShadow:
              "0 8px 30px rgba(0,0,0,.15)",
            borderRadius: 14,
            padding: 14,
            color: "#b42318",
            fontSize: 12,
          }}
        >

          <strong>
            Camera data unavailable
          </strong>

          <div
            style={{
              marginTop: 5,
            }}
          >
            {error}
          </div>

          <button
            type="button"
            onClick={() =>
              loadCameras(true)
            }
            style={{
              marginTop: 10,
              border: 0,
              background:
                "#007aff",
              color: "#fff",
              borderRadius: 9,
              padding:
                "7px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retry
          </button>

        </div>
      )}


      {/* ====================================================
          TRAFFIC ERROR
      ===================================================== */}

      {trafficError &&
        trafficSegments.length ===
          0 && (
          <div
            style={{
              position: "absolute",
              zIndex: 999,
              bottom: 125,
              right: 18,
              maxWidth: 280,
              background:
                "rgba(255,255,255,.9)",
              backdropFilter:
                "blur(15px)",
              borderRadius: 12,
              padding:
                "8px 11px",
              fontSize: 10,
              color: "#8e8e93",
              boxShadow:
                "0 4px 15px rgba(0,0,0,.1)",
            }}
          >
            🚦 Live traffic data
            unavailable
          </div>
        )}


      {/* ====================================================
          SELECTED CAMERA CARD
      ===================================================== */}

      {selectedCamera && (
        <div
          style={{
            position: "absolute",
            zIndex: 1500,
            top: 155,
            right: 18,
            width:
              "min(320px, calc(100vw - 36px))",
            ...styles.glass,
            borderRadius: 17,
            padding: 15,
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: 10,
            }}
          >

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems:
                  "center",
              }}
            >

              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background:
                    "#f2f2f7",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontSize: 20,
                }}
              >
                {getCameraEmoji(
                  getCameraType(
                    selectedCamera
                  )
                )}
              </div>

              <div>

                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {getCameraType(
                    selectedCamera
                  )}
                </div>

                <div
                  style={{
                    color:
                      "#8e8e93",
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  Camera #
                  {selectedCamera.id ??
                    "—"}
                </div>

              </div>

            </div>


            <button
              type="button"
              onClick={() =>
                setSelectedCamera(
                  null
                )
              }
              style={{
                width: 27,
                height: 27,
                border: 0,
                borderRadius:
                  "50%",
                background:
                  "#f2f2f7",
                cursor:
                  "pointer",
                fontSize: 16,
              }}
            >
              ×
            </button>

          </div>


          <div
            style={{
              marginTop: 13,
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 8,
            }}
          >

            <div
              style={{
                padding: 9,
                borderRadius: 10,
                background:
                  "#f7f7f9",
              }}
            >

              <div
                style={{
                  fontSize: 9,
                  color:
                    "#8e8e93",
                }}
              >
                STATUS
              </div>

              <div
                style={{
                  marginTop: 2,
                  fontWeight: 750,
                  fontSize: 12,
                  color:
                    getStatusColor(
                      selectedCamera.status
                    ),
                }}
              >
                {getStatusLabel(
                  selectedCamera.status
                )}
              </div>

            </div>


            <div
              style={{
                padding: 9,
                borderRadius: 10,
                background:
                  "#f7f7f9",
              }}
            >

              <div
                style={{
                  fontSize: 9,
                  color:
                    "#8e8e93",
                }}
              >
                VERIFICATION
              </div>

              <div
                style={{
                  marginTop: 2,
                  fontWeight: 750,
                  fontSize: 12,
                  color:
                    getVerificationColor(
                      selectedCamera.verification_status
                    ),
                  textTransform:
                    "capitalize",
                }}
              >
                {normalizeVerification(
                  selectedCamera.verification_status
                )}
              </div>

            </div>

          </div>


          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "#3a3a3c",
              lineHeight: 1.6,
            }}
          >

            {selectedCamera.city && (
              <div>
                📍{" "}
                {selectedCamera.city}
                {selectedCamera.state
                  ? `, ${selectedCamera.state}`
                  : ""}
              </div>
            )}

            {selectedCamera.road_name && (
              <div>
                🛣️{" "}
                {selectedCamera.road_name}
              </div>
            )}

            {selectedCamera.speed_limit !==
              null &&
              selectedCamera.speed_limit !==
                undefined && (
                <div>
                  ⚡{" "}
                  {
                    selectedCamera.speed_limit
                  }{" "}
                  km/h
                </div>
              )}

          </div>

        </div>
      )}

    </div>
  );
}