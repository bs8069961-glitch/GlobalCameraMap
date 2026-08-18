import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";

import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "./CameraMap.css";


// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = "http://127.0.0.1:8000";

const INDIA_CENTER = [22.5937, 78.9629];

const DEFAULT_ZOOM = 5;

const ROUTE_CAMERA_RADIUS_KM = 1;

const CAMERA_REFRESH_MS = 60_000;


// ============================================================
// HELPERS
// ============================================================

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}


function normalizeCameras(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.cameras)) {
    return payload.cameras;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}


function normalizeCamera(camera) {
  return {
    ...camera,
    latitude: safeNumber(camera?.latitude),
    longitude: safeNumber(camera?.longitude),
    speed_limit: safeNumber(camera?.speed_limit),
  };
}


function isValidCamera(camera) {
  return (
    camera &&
    Number.isFinite(camera.latitude) &&
    Number.isFinite(camera.longitude) &&
    camera.latitude >= -90 &&
    camera.latitude <= 90 &&
    camera.longitude >= -180 &&
    camera.longitude <= 180
  );
}


function getCameraType(camera) {
  const type = String(
    camera?.camera_type ||
      camera?.enforcement_type ||
      ""
  ).toLowerCase();

  if (
    type.includes("speed") ||
    type.includes("velocity")
  ) {
    return "speed";
  }

  if (
    type.includes("red light") ||
    type.includes("red-light") ||
    type.includes("signal") ||
    type.includes("traffic light")
  ) {
    return "red";
  }

  return "other";
}


function getCameraTypeLabel(camera) {
  const type = getCameraType(camera);

  if (type === "speed") {
    return "Speed Camera";
  }

  if (type === "red") {
    return "Red Light Camera";
  }

  return "Other Camera";
}


function getStatusLabel(status) {
  const value = String(status || "unknown").toLowerCase();

  if (value === "active") {
    return "Active";
  }

  if (value === "inactive") {
    return "Inactive";
  }

  if (value === "maintenance") {
    return "Maintenance";
  }

  return "Unknown";
}


function getVerificationLabel(status) {
  const value = String(status || "pending").toLowerCase();

  if (value === "verified") {
    return "Verified";
  }

  if (value === "rejected") {
    return "Rejected";
  }

  return "Pending";
}


function formatUpdatedTime(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}


function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}


// ============================================================
// CAMERA ICONS
// ============================================================

function createCameraIcon(type) {
  const configuration = {
    speed: {
      label: "S",
      className: "gcm-marker-speed",
    },

    red: {
      label: "R",
      className: "gcm-marker-red",
    },

    other: {
      label: "C",
      className: "gcm-marker-other",
    },
  };

  const selected =
    configuration[type] || configuration.other;

  return L.divIcon({
    className: "gcm-camera-marker-wrapper",

    html: `
      <div
        class="gcm-camera-marker ${selected.className}"
        aria-label="${selected.label} camera"
      >
        <span>${selected.label}</span>
      </div>
    `,

    iconSize: [34, 34],

    iconAnchor: [17, 17],

    popupAnchor: [0, -19],
  });
}


const CAMERA_ICONS = {
  speed: createCameraIcon("speed"),
  red: createCameraIcon("red"),
  other: createCameraIcon("other"),
};


// ============================================================
// MAP CONTROLLER
// ============================================================

function MapController({
  focusLocation,
  fitCoordinates,
}) {
  const map = useMap();

  useEffect(() => {
    if (
      Array.isArray(focusLocation) &&
      focusLocation.length === 2
    ) {
      map.flyTo(
        focusLocation,
        Math.max(map.getZoom(), 12),
        {
          duration: 0.8,
        }
      );
    }
  }, [focusLocation, map]);

  useEffect(() => {
    if (
      Array.isArray(fitCoordinates) &&
      fitCoordinates.length > 1
    ) {
      const bounds = L.latLngBounds(fitCoordinates);

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 14,
          animate: true,
        });
      }
    }
  }, [fitCoordinates, map]);

  return null;
}


// ============================================================
// MAP ZOOM CONTROLS
// ============================================================

function ZoomControls() {
  const map = useMap();

  return (
    <div className="gcm-map-controls">
      <button
        type="button"
        className="gcm-map-control"
        title="Zoom in"
        aria-label="Zoom in"
        onClick={() => map.zoomIn()}
      >
        +
      </button>

      <button
        type="button"
        className="gcm-map-control"
        title="Zoom out"
        aria-label="Zoom out"
        onClick={() => map.zoomOut()}
      >
        −
      </button>
    </div>
  );
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CameraMap() {
  const [cameras, setCameras] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [activeFilter, setActiveFilter] =
    useState("all");

  const [search, setSearch] = useState("");

  const [focusLocation, setFocusLocation] =
    useState(null);

  const [route, setRoute] = useState([]);

  const [routeCameras, setRouteCameras] =
    useState([]);

  const [destination, setDestination] =
    useState("");

  const [routeLoading, setRouteLoading] =
    useState(false);

  const [routeError, setRouteError] =
    useState("");

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [mapReady, setMapReady] =
    useState(false);

  const refreshTimerRef = useRef(null);

  const mapContainerRef = useRef(null);


  // ==========================================================
  // LOAD CAMERAS
  // ==========================================================

  const loadCameras = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          `${API_URL}/api/cameras`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Camera API returned ${response.status}`
          );
        }

        const payload = await response.json();

        const normalized = normalizeCameras(payload)
          .map(normalizeCamera)
          .filter(isValidCamera);

        setCameras(normalized);

        setLastUpdated(new Date());
      } catch (requestError) {
        console.error(
          "Global Camera Map: camera loading failed",
          requestError
        );

        setError(
          "Unable to connect to the camera network."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );


  useEffect(() => {
    loadCameras();

    refreshTimerRef.current = setInterval(() => {
      loadCameras({ silent: true });
    }, CAMERA_REFRESH_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [loadCameras]);


  // ==========================================================
  // CAMERA STATISTICS
  // ==========================================================

  const statistics = useMemo(() => {
    let speed = 0;
    let red = 0;
    let other = 0;

    cameras.forEach((camera) => {
      const type = getCameraType(camera);

      if (type === "speed") {
        speed += 1;
      } else if (type === "red") {
        red += 1;
      } else {
        other += 1;
      }
    });

    return {
      all: cameras.length,
      speed,
      red,
      other,
    };
  }, [cameras]);


  // ==========================================================
  // FILTER CAMERAS
  // ==========================================================

  const visibleCameras = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cameras.filter((camera) => {
      const type = getCameraType(camera);

      if (
        activeFilter !== "all" &&
        type !== activeFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        camera.city,
        camera.state,
        camera.country,
        camera.road_name,
        camera.camera_type,
        camera.enforcement_type,
        camera.source,
        camera.status,
        camera.verification_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [cameras, activeFilter, search]);


  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  const handleCurrentLocation = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        setFocusLocation(coordinates);

        setLocationLoading(false);
      },
      (locationPositionError) => {
        console.error(
          "Geolocation error",
          locationPositionError
        );

        setLocationError(
          "Unable to determine your current location."
        );

        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };


  // ==========================================================
  // SEARCH CAMERA COVERAGE
  // ==========================================================

  const handleCameraSearch = () => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return;
    }

    const match = cameras.find((camera) => {
      const searchable = [
        camera.city,
        camera.state,
        camera.road_name,
        camera.camera_type,
        camera.enforcement_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });

    if (match) {
      setFocusLocation([
        match.latitude,
        match.longitude,
      ]);
    }
  };


  // ==========================================================
  // GEOCODE DESTINATION
  // ==========================================================

  const geocodeDestination = async (query) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Geocoding service returned ${response.status}`
      );
    }

    const results = await response.json();

    if (!results.length) {
      throw new Error(
        "Destination could not be located."
      );
    }

    return [
      Number(results[0].lat),
      Number(results[0].lon),
    ];
  };


  // ==========================================================
  // FIND DRIVING ROUTE
  // ==========================================================

  const handleRoute = async () => {
    const query = destination.trim();

    if (!query) {
      setRouteError(
        "Enter a destination first."
      );

      return;
    }

    setRouteLoading(true);
    setRouteError("");
    setRoute([]);
    setRouteCameras([]);

    try {
      let start;

      if (focusLocation) {
        start = focusLocation;
      } else if (navigator.geolocation) {
        start = await new Promise(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve([
                  position.coords.latitude,
                  position.coords.longitude,
                ]);
              },
              () => {
                reject(
                  new Error(
                    "Allow location access to create a route."
                  )
                );
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000,
              }
            );
          }
        );
      } else {
        throw new Error(
          "Location services are unavailable."
        );
      }

      const end =
        await geocodeDestination(query);

      const osrmUrl =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${start[1]},${start[0]};${end[1]},${end[0]}` +
        `?overview=full&geometries=geojson`;

      const routeResponse =
        await fetch(osrmUrl);

      if (!routeResponse.ok) {
        throw new Error(
          "Driving route service is unavailable."
        );
      }

      const routePayload =
        await routeResponse.json();

      if (
        routePayload.code !== "Ok" ||
        !routePayload.routes?.length
      ) {
        throw new Error(
          "No driving route was found."
        );
      }

      const geometry =
        routePayload.routes[0]?.geometry?.coordinates;

      if (!Array.isArray(geometry)) {
        throw new Error(
          "Route geometry was unavailable."
        );
      }

      const routeCoordinates = geometry.map(
        ([longitude, latitude]) => [
          latitude,
          longitude,
        ]
      );

      setRoute(routeCoordinates);

      // --------------------------------------------------------
      // Find cameras close to the calculated route.
      // --------------------------------------------------------

      const nearby = cameras.filter((camera) => {
        return routeCoordinates.some(
          ([latitude, longitude]) => {
            return (
              haversineDistanceKm(
                camera.latitude,
                camera.longitude,
                latitude,
                longitude
              ) <= ROUTE_CAMERA_RADIUS_KM
            );
          }
        );
      });

      setRouteCameras(nearby);

      if (routeCoordinates.length) {
        setFocusLocation(
          routeCoordinates[
            Math.floor(routeCoordinates.length / 2)
          ]
        );
      }
    } catch (routeRequestError) {
      console.error(
        "Global Camera Map: route error",
        routeRequestError
      );

      setRouteError(
        routeRequestError?.message ||
          "Unable to calculate driving route."
      );
    } finally {
      setRouteLoading(false);
    }
  };


  // ==========================================================
  // CLEAR ROUTE
  // ==========================================================

  const clearRoute = () => {
    setRoute([]);
    setRouteCameras([]);
    setRouteError("");
  };


  // ==========================================================
  // ROUTE CAMERA IDS
  // ==========================================================

  const routeCameraIds = useMemo(() => {
    return new Set(
      routeCameras.map((camera) =>
        String(camera.id)
      )
    );
  }, [routeCameras]);


  // ==========================================================
  // FIT VISIBLE CAMERAS
  // ==========================================================

  const fitCoordinates = useMemo(() => {
    if (!mapReady) {
      return [];
    }

    if (route.length > 1) {
      return route;
    }

    return [];
  }, [route, mapReady]);


  // ==========================================================
  // CAMERA REFRESH BUTTON
  // ==========================================================

  const handleRefresh = async () => {
    await loadCameras();
  };


  // ==========================================================
  // CAMERA POPUP
  // ==========================================================

  const renderCameraPopup = (camera) => {
    const type = getCameraType(camera);

    const status = getStatusLabel(
      camera.status
    );

    const verification =
      getVerificationLabel(
        camera.verification_status
      );

    const routeCamera =
      routeCameraIds.has(
        String(camera.id)
      );

    return (
      <Popup className="gcm-camera-popup">
        <div className="gcm-popup">
          <div className="gcm-popup-header">
            <div>
              <span className="gcm-popup-eyebrow">
                GCM / CAMERA
              </span>

              <h3>
                {getCameraTypeLabel(camera)}
              </h3>
            </div>

            <span
              className={`gcm-popup-type gcm-popup-type-${type}`}
            >
              {type === "speed"
                ? "S"
                : type === "red"
                ? "R"
                : "C"}
            </span>
          </div>

          <div className="gcm-popup-status-row">
            <span
              className={`gcm-status-badge gcm-status-${String(
                camera.status || "unknown"
              ).toLowerCase()}`}
            >
              {status}
            </span>

            <span
              className={`gcm-verification-badge gcm-verification-${String(
                camera.verification_status ||
                  "pending"
              ).toLowerCase()}`}
            >
              {verification}
            </span>
          </div>

          <div className="gcm-popup-grid">
            <div className="gcm-popup-field">
              <span>LOCATION</span>

              <strong>
                {camera.city ||
                  camera.state ||
                  "Unknown location"}
              </strong>
            </div>

            <div className="gcm-popup-field">
              <span>ROAD</span>

              <strong>
                {camera.road_name ||
                  "Not specified"}
              </strong>
            </div>

            <div className="gcm-popup-field">
              <span>STATE</span>

              <strong>
                {camera.state ||
                  "Not specified"}
              </strong>
            </div>

            <div className="gcm-popup-field">
              <span>CAMERA ID</span>

              <strong>
                #{camera.id ?? "—"}
              </strong>
            </div>

            {camera.speed_limit !== null && (
              <div className="gcm-popup-field">
                <span>SPEED LIMIT</span>

                <strong>
                  {camera.speed_limit}
                </strong>
              </div>
            )}

            {camera.enforcement_type && (
              <div className="gcm-popup-field gcm-popup-field-wide">
                <span>ENFORCEMENT</span>

                <strong>
                  {camera.enforcement_type}
                </strong>
              </div>
            )}

            {camera.source && (
              <div className="gcm-popup-field gcm-popup-field-wide">
                <span>SOURCE</span>

                <strong>
                  {camera.source}
                </strong>
              </div>
            )}
          </div>

          {routeCamera && (
            <div className="gcm-route-match">
              <span>●</span>

              Camera detected near current route
            </div>
          )}

          {camera.source_url && (
            <a
              className="gcm-source-link"
              href={camera.source_url}
              target="_blank"
              rel="noreferrer"
            >
              View source →
            </a>
          )}
        </div>
      </Popup>
    );
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="gcm-map-page"
      ref={mapContainerRef}
    >

      {/* ======================================================
          TOP NETWORK BAR
      ====================================================== */}

      <header className="gcm-map-header">
        <div className="gcm-brand">
          <div className="gcm-brand-mark">
            G
          </div>

          <div className="gcm-brand-copy">
            <strong>
              GLOBAL CAMERA MAP
            </strong>

            <span>
              TRAFFIC INTELLIGENCE PLATFORM
            </span>
          </div>
        </div>

        <div className="gcm-header-right">
          <span className="gcm-breadcrumb">
            GCM / NETWORK / LIVE
          </span>

          <button
            type="button"
            className="gcm-header-refresh"
            title="Refresh camera network"
            aria-label="Refresh camera network"
            onClick={handleRefresh}
            disabled={loading}
          >
            ↻
          </button>
        </div>
      </header>


      {/* ======================================================
          MAP
      ====================================================== */}

      <section className="gcm-map-shell">

        <MapContainer
          center={INDIA_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={3}
          maxZoom={18}
          scrollWheelZoom={true}
          zoomControl={false}
          className="gcm-leaflet-map"
          whenReady={() => setMapReady(true)}
        >

          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />

          <ZoomControls />

          <MapController
            focusLocation={focusLocation}
            fitCoordinates={fitCoordinates}
          />


          {/* ==================================================
              ROUTE
          ================================================== */}

          {route.length > 1 && (
            <>
              <Polyline
                positions={route}
                pathOptions={{
                  className: "gcm-route-line",
                  weight: 6,
                  opacity: 0.9,
                }}
              />

              <Polyline
                positions={route}
                pathOptions={{
                  className:
                    "gcm-route-line-core",
                  weight: 2,
                  opacity: 1,
                }}
              />
            </>
          )}


          {/* ==================================================
              CAMERAS
          ================================================== */}

          <MarkerClusterGroup
            chunkedLoading={true}
            maxClusterRadius={45}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
            removeOutsideVisibleBounds={true}
            animate={true}
          >
            {visibleCameras.map((camera) => {
              const type =
                getCameraType(camera);

              return (
                <Marker
                  key={String(camera.id)}
                  position={[
                    camera.latitude,
                    camera.longitude,
                  ]}
                  icon={CAMERA_ICONS[type]}
                  title={
                    getCameraTypeLabel(camera)
                  }
                >
                  {renderCameraPopup(camera)}
                </Marker>
              );
            })}
          </MarkerClusterGroup>

        </MapContainer>


        {/* ====================================================
            MAP BRAND PANEL
        ==================================================== */}

        <div className="gcm-map-brand-panel">
          <span className="gcm-panel-kicker">
            GCM / LIVE NETWORK
          </span>

          <h1>
            Global Camera Map
          </h1>

          <p>
            Traffic enforcement intelligence
          </p>
        </div>


        {/* ====================================================
            LIVE COUNTERS
        ==================================================== */}

        <div className="gcm-live-counter-panel">

          <div className="gcm-live-counter">
            <strong>
              {visibleCameras.length}
            </strong>

            <span>
              VISIBLE
            </span>
          </div>

          <div className="gcm-live-counter">
            <strong>
              {cameras.length}
            </strong>

            <span>
              INDEXED
            </span>
          </div>

          <div className="gcm-live-indicator">
            <span />
            LIVE
          </div>

          {lastUpdated && (
            <div className="gcm-updated">
              Updated{" "}
              {formatUpdatedTime(lastUpdated)}
            </div>
          )}

        </div>


        {/* ====================================================
            CAMERA FILTER
        ==================================================== */}

        <aside className="gcm-control-panel">

          <div className="gcm-control-heading">
            <span>
              CAMERA FILTER
            </span>

            <small>
              {visibleCameras.length} visible
            </small>
          </div>

          <div className="gcm-filter-grid">

            <button
              type="button"
              className={
                activeFilter === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveFilter("all")
              }
            >
              <span>All</span>
              <strong>
                {statistics.all}
              </strong>
            </button>

            <button
              type="button"
              className={
                activeFilter === "speed"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveFilter("speed")
              }
            >
              <span>Speed</span>
              <strong>
                {statistics.speed}
              </strong>
            </button>

            <button
              type="button"
              className={
                activeFilter === "red"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveFilter("red")
              }
            >
              <span>Red Light</span>
              <strong>
                {statistics.red}
              </strong>
            </button>

            <button
              type="button"
              className={
                activeFilter === "other"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveFilter("other")
              }
            >
              <span>Other</span>
              <strong>
                {statistics.other}
              </strong>
            </button>

          </div>


          {/* ==================================================
              CAMERA SEARCH
          ================================================== */}

          <div className="gcm-search-row">

            <span className="gcm-search-icon">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              placeholder="Search cameras, city or road..."
              onChange={(event) =>
                setSearch(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleCameraSearch();
                }
              }}
            />

            <button
              type="button"
              onClick={handleCameraSearch}
              disabled={!search.trim()}
            >
              Search
            </button>

          </div>


          {/* ==================================================
              CURRENT LOCATION
          ================================================== */}

          <button
            type="button"
            className="gcm-location-button"
            onClick={handleCurrentLocation}
            disabled={locationLoading}
          >
            <span>
              ◎
            </span>

            {locationLoading
              ? "Locating..."
              : "Use My Current Location"}
          </button>

          {locationError && (
            <div className="gcm-inline-error">
              {locationError}
            </div>
          )}


          {/* ==================================================
              ROUTE PLANNER
          ================================================== */}

          <div className="gcm-route-planner">

            <div className="gcm-section-label">
              ROUTE PLANNER
            </div>

            <div className="gcm-route-title">
              Find camera coverage
            </div>

            <div className="gcm-route-search">

              <span>
                ⌕
              </span>

              <input
                type="text"
                value={destination}
                placeholder="Search destination..."
                onChange={(event) =>
                  setDestination(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleRoute();
                  }
                }}
              />

              <button
                type="button"
                onClick={handleRoute}
                disabled={
                  routeLoading ||
                  !destination.trim()
                }
              >
                {routeLoading
                  ? "..."
                  : "Search"}
              </button>

            </div>

            <button
              type="button"
              className="gcm-route-button"
              onClick={handleRoute}
              disabled={
                routeLoading ||
                !destination.trim()
              }
            >
              {routeLoading
                ? "Calculating route..."
                : "Find Driving Route"}
            </button>

            {route.length > 1 && (
              <button
                type="button"
                className="gcm-clear-route"
                onClick={clearRoute}
              >
                Clear route
              </button>
            )}

            {routeError && (
              <div className="gcm-inline-error">
                {routeError}
              </div>
            )}

            {route.length > 1 && (
              <div className="gcm-route-result">
                <span className="gcm-route-dot" />

                <div>
                  <strong>
                    Route coverage active
                  </strong>

                  <small>
                    {routeCameras.length} camera
                    {routeCameras.length === 1
                      ? ""
                      : "s"} near route
                  </small>
                </div>
              </div>
            )}

          </div>


          {/* ==================================================
              NETWORK STATUS
          ================================================== */}

          <div className="gcm-network-status">
            <span className="gcm-network-status-dot" />

            <span>
              Network Operational
            </span>

            <span className="gcm-network-status-count">
              {visibleCameras.length}
              {" "}
              visible cameras
            </span>
          </div>

        </aside>


        {/* ====================================================
            LEGEND
        ==================================================== */}

        <div className="gcm-map-legend">

          <div className="gcm-legend-title">
            CAMERA LEGEND
          </div>

          <div className="gcm-legend-item">
            <span className="gcm-legend-marker speed">
              S
            </span>

            <span>
              Speed Camera
            </span>
          </div>

          <div className="gcm-legend-item">
            <span className="gcm-legend-marker red">
              R
            </span>

            <span>
              Red Light Camera
            </span>
          </div>

          <div className="gcm-legend-item">
            <span className="gcm-legend-marker other">
              C
            </span>

            <span>
              Other Camera
            </span>
          </div>

        </div>


        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading && (
          <div className="gcm-map-loading">
            <div className="gcm-spinner" />

            <span>
              Loading camera network...
            </span>
          </div>
        )}


        {/* ====================================================
            API ERROR
        ==================================================== */}

        {error && !loading && (
          <div className="gcm-map-error">

            <strong>
              Network connection issue
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={handleRefresh}
            >
              Retry
            </button>

          </div>
        )}

      </section>

    </div>
  );
}