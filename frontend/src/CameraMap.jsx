import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
  Polyline,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "./CameraMap.css";

const API_URL = "http://127.0.0.1:8000";

const DEFAULT_CENTER = [22.9734, 78.6569];
const DEFAULT_ZOOM = 5;

const REFRESH_INTERVAL = 60000;

const CAMERA_TYPES = {
  all: "All",
  speed: "Speed",
  red_light: "Red Light",
  other: "Other",
};

function normalizeCameraType(camera) {
  const value = String(
    camera?.camera_type ||
      camera?.type ||
      camera?.cameraType ||
      ""
  )
    .trim()
    .toLowerCase();

  if (
    value.includes("speed") ||
    value.includes("speed camera")
  ) {
    return "speed";
  }

  if (
    value.includes("red") ||
    value.includes("traffic light") ||
    value.includes("red-light")
  ) {
    return "red_light";
  }

  return "other";
}

function getCameraLabel(camera) {
  const type = normalizeCameraType(camera);

  if (type === "speed") return "Speed Camera";
  if (type === "red_light") return "Red Light Camera";

  return "Other Camera";
}

function getLatitude(camera) {
  return Number(
    camera?.latitude ??
      camera?.lat ??
      camera?.location?.latitude
  );
}

function getLongitude(camera) {
  return Number(
    camera?.longitude ??
      camera?.lng ??
      camera?.lon ??
      camera?.location?.longitude
  );
}

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function getCameraColor(camera) {
  const type = normalizeCameraType(camera);

  if (type === "speed") return "#2563eb";
  if (type === "red_light") return "#dc2626";

  return "#64748b";
}

function getCameraIcon(camera) {
  const color = getCameraColor(camera);

  return L.divIcon({
    className: "gcm-camera-marker-wrapper",
    html: `
      <div
        class="gcm-camera-marker"
        style="
          --camera-color:${color};
          --camera-shadow:${color}66;
        "
      >
        <span class="gcm-camera-marker-dot"></span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function getStatusClass(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (
    value.includes("active") ||
    value.includes("online") ||
    value.includes("operational")
  ) {
    return "active";
  }

  if (
    value.includes("inactive") ||
    value.includes("offline") ||
    value.includes("disabled")
  ) {
    return "inactive";
  }

  return "unknown";
}

function formatStatus(status) {
  if (!status) return "Unknown";

  const value = String(status).trim();

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatVerification(value) {
  if (!value) return "Pending";

  const normalized = String(value)
    .trim()
    .toLowerCase();

  if (
    normalized === "verified" ||
    normalized === "true" ||
    normalized === "approved"
  ) {
    return "Verified";
  }

  if (
    normalized === "pending" ||
    normalized === "false"
  ) {
    return "Pending";
  }

  return String(value);
}

function getCameraName(camera) {
  return (
    camera?.road_name ||
    camera?.road ||
    camera?.name ||
    camera?.location_name ||
    camera?.city ||
    "Traffic Camera"
  );
}

function getCameraLocation(camera) {
  const parts = [
    camera?.road_name || camera?.road,
    camera?.city,
    camera?.state,
    camera?.country,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return "Location unavailable";
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function MapFitToCameras({ cameras }) {
  const map = useMap();

  useEffect(() => {
    if (!cameras || cameras.length === 0) {
      return;
    }

    const points = cameras
      .map((camera) => [
        getLatitude(camera),
        getLongitude(camera),
      ])
      .filter(([lat, lng]) =>
        isValidCoordinate(lat, lng)
      );

    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 13, {
        animate: true,
      });

      return;
    }

    const bounds = L.latLngBounds(points);

    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 12,
      animate: true,
    });
  }, [cameras, map]);

  return null;
}

function MapController({
  onMapReady,
  onZoomChange,
}) {
  const map = useMap();

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useEffect(() => {
    const handleZoom = () => {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
    };

    map.on("zoomend", handleZoom);

    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      if (onMapClick) {
        onMapClick(event.latlng);
      }
    },
  });

  return null;
}

function CurrentLocationMarker({ position }) {
  if (!position) {
    return null;
  }

  return (
    <>
      <CircleMarker
        center={position}
        radius={22}
        pathOptions={{
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.12,
          weight: 1,
        }}
      />

      <CircleMarker
        center={position}
        radius={7}
        pathOptions={{
          color: "#ffffff",
          fillColor: "#2563eb",
          fillOpacity: 1,
          weight: 3,
        }}
      />
    </>
  );
}

function CameraPopup({ camera }) {
  const cameraType = getCameraLabel(camera);

  const status = formatStatus(camera?.status);
  const verification = formatVerification(
    camera?.verification_status ??
      camera?.verificationStatus
  );

  const speedLimit =
    camera?.speed_limit ??
    camera?.speedLimit;

  const source =
    camera?.source ||
    camera?.source_name;

  const sourceUrl =
    camera?.source_url ||
    camera?.sourceUrl;

  return (
    <div className="gcm-popup">
      <div className="gcm-popup-header">
        <div>
          <div className="gcm-popup-eyebrow">
            GCM / CAMERA RECORD
          </div>

          <div className="gcm-popup-title">
            {getCameraName(camera)}
          </div>
        </div>

        <span
          className={`gcm-popup-type ${normalizeCameraType(
            camera
          )}`}
        >
          {cameraType}
        </span>
      </div>

      <div className="gcm-popup-location">
        {getCameraLocation(camera)}
      </div>

      <div className="gcm-popup-grid">
        <div className="gcm-popup-field">
          <span>Status</span>
          <strong
            className={`gcm-popup-status ${getStatusClass(
              camera?.status
            )}`}
          >
            {status}
          </strong>
        </div>

        <div className="gcm-popup-field">
          <span>Verification</span>
          <strong>{verification}</strong>
        </div>

        {speedLimit !== undefined &&
          speedLimit !== null &&
          speedLimit !== "" && (
            <div className="gcm-popup-field">
              <span>Speed Limit</span>
              <strong>{speedLimit} km/h</strong>
            </div>
          )}

        {camera?.enforcement_type && (
          <div className="gcm-popup-field">
            <span>Enforcement</span>
            <strong>
              {camera.enforcement_type}
            </strong>
          </div>
        )}
      </div>

      <div className="gcm-popup-coordinates">
        {getLatitude(camera).toFixed(6)},{" "}
        {getLongitude(camera).toFixed(6)}
      </div>

      {(source || sourceUrl) && (
        <div className="gcm-popup-source">
          {source && <span>Source: {source}</span>}

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              View source
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingOverlay({ visible }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="gcm-map-loading">
      <div className="gcm-loading-spinner" />

      <span>
        Synchronizing camera network…
      </span>
    </div>
  );
}

function ErrorOverlay({ message, onRetry }) {
  if (!message) {
    return null;
  }

  return (
    <div className="gcm-map-error">
      <div className="gcm-error-icon">!</div>

      <div className="gcm-error-content">
        <strong>Network synchronization failed</strong>

        <span>{message}</span>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="gcm-error-retry"
      >
        Retry
      </button>
    </div>
  );
}

function CameraFilter({
  filter,
  setFilter,
  counts,
}) {
  return (
    <div className="gcm-filter-panel">
      <div className="gcm-section-label">
        CAMERA FILTER
      </div>

      <div className="gcm-filter-tabs">
        <button
          type="button"
          className={
            filter === "all"
              ? "active"
              : ""
          }
          onClick={() => setFilter("all")}
        >
          <span>All</span>
          <strong>{counts.all}</strong>
        </button>

        <button
          type="button"
          className={
            filter === "speed"
              ? "active"
              : ""
          }
          onClick={() => setFilter("speed")}
        >
          <span>Speed</span>
          <strong>{counts.speed}</strong>
        </button>

        <button
          type="button"
          className={
            filter === "red_light"
              ? "active"
              : ""
          }
          onClick={() =>
            setFilter("red_light")
          }
        >
          <span>Red Light</span>
          <strong>{counts.red_light}</strong>
        </button>

        <button
          type="button"
          className={
            filter === "other"
              ? "active"
              : ""
          }
          onClick={() => setFilter("other")}
        >
          <span>Other</span>
          <strong>{counts.other}</strong>
        </button>
      </div>
    </div>
  );
}

function MapZoomControls({ map }) {
  if (!map) {
    return null;
  }

  return (
    <div className="gcm-custom-zoom">
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => map.zoomIn()}
      >
        +
      </button>

      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => map.zoomOut()}
      >
        −
      </button>
    </div>
  );
}

export default function CameraMap() {
  const [cameras, setCameras] = useState([]);

  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [map, setMap] = useState(null);

  const [currentLocation, setCurrentLocation] =
    useState(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [destination, setDestination] =
    useState("");

  const [routeLoading, setRouteLoading] =
    useState(false);

  const [routeError, setRouteError] =
    useState("");

  const [route, setRoute] = useState([]);

  const [routeDistance, setRouteDistance] =
    useState(null);

  const [routeDuration, setRouteDuration] =
    useState(null);

  const [zoom, setZoom] = useState(
    DEFAULT_ZOOM
  );

  const fetchCameras = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/cameras`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Camera API returned HTTP ${response.status}`
          );
        }

        const data = await response.json();

        let records = [];

        if (Array.isArray(data)) {
          records = data;
        } else if (
          Array.isArray(data?.cameras)
        ) {
          records = data.cameras;
        } else if (
          Array.isArray(data?.data)
        ) {
          records = data.data;
        }

        const cleaned = records.filter(
          (camera) => {
            const latitude =
              getLatitude(camera);

            const longitude =
              getLongitude(camera);

            return isValidCoordinate(
              latitude,
              longitude
            );
          }
        );

        setCameras(cleaned);

        setLastUpdated(new Date());
      } catch (fetchError) {
        console.error(
          "Camera fetch failed:",
          fetchError
        );

        setError(
          fetchError?.message ||
            "Unable to load camera data."
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchCameras();

    const interval = window.setInterval(() => {
      fetchCameras({ silent: true });
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchCameras]);

  const counts = useMemo(() => {
    const result = {
      all: cameras.length,
      speed: 0,
      red_light: 0,
      other: 0,
    };

    cameras.forEach((camera) => {
      const type =
        normalizeCameraType(camera);

      if (type === "speed") {
        result.speed += 1;
      } else if (type === "red_light") {
        result.red_light += 1;
      } else {
        result.other += 1;
      }
    });

    return result;
  }, [cameras]);

  const filteredCameras = useMemo(() => {
    if (filter === "all") {
      return cameras;
    }

    return cameras.filter(
      (camera) =>
        normalizeCameraType(camera) ===
        filter
    );
  }, [cameras, filter]);

  const handleMapReady = useCallback(
    (leafletMap) => {
      setMap(leafletMap);
      setZoom(leafletMap.getZoom());
    },
    []
  );

  const handleZoomChange = useCallback(
    (newZoom) => {
      setZoom(newZoom);
    },
    []
  );

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        setCurrentLocation(coords);
        setLocationLoading(false);

        if (map) {
          map.flyTo(coords, 14, {
            duration: 1.2,
          });
        }
      },
      (geoError) => {
        console.error(
          "Geolocation failed:",
          geoError
        );

        setLocationLoading(false);

        if (
          geoError?.code ===
          geoError.PERMISSION_DENIED
        ) {
          setLocationError(
            "Location permission was denied."
          );
        } else {
          setLocationError(
            "Unable to determine your current location."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [map]);

  const searchDestination = useCallback(
    async () => {
      const query = destination.trim();

      if (!query) {
        setRouteError(
          "Enter a destination first."
        );

        return;
      }

      setRouteLoading(true);
      setRouteError("");

      try {
        const url =
          "https://nominatim.openstreetmap.org/search?" +
          new URLSearchParams({
            q: query,
            format: "json",
            limit: "1",
          }).toString();

        const response = await fetch(url, {
          headers: {
            Accept:
              "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            "Destination search failed."
          );
        }

        const data = await response.json();

        if (
          !Array.isArray(data) ||
          data.length === 0
        ) {
          throw new Error(
            "Destination could not be found."
          );
        }

        const destinationPoint = [
          Number(data[0].lat),
          Number(data[0].lon),
        ];

        if (
          !isValidCoordinate(
            destinationPoint[0],
            destinationPoint[1]
          )
        ) {
          throw new Error(
            "Destination coordinates are invalid."
          );
        }

        if (map) {
          map.flyTo(
            destinationPoint,
            13,
            {
              duration: 1.2,
            }
          );
        }

        if (
          currentLocation &&
          isValidCoordinate(
            currentLocation[0],
            currentLocation[1]
          )
        ) {
          await calculateRoute(
            currentLocation,
            destinationPoint
          );
        }
      } catch (searchError) {
        console.error(
          "Destination search failed:",
          searchError
        );

        setRouteError(
          searchError?.message ||
            "Unable to find destination."
        );
      } finally {
        setRouteLoading(false);
      }
    },
    [currentLocation, destination, map]
  );

  const calculateRoute = useCallback(
    async (
      start,
      end
    ) => {
      setRouteLoading(true);
      setRouteError("");

      try {
        const coordinates =
          `${start[1]},${start[0]};${end[1]},${end[0]}`;

        const url =
          `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
          "?overview=full&geometries=geojson";

        const response = await fetch(url, {
          headers: {
            Accept:
              "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            "Route service is unavailable."
          );
        }

        const data = await response.json();

        if (
          data?.code !== "Ok" ||
          !data?.routes?.length
        ) {
          throw new Error(
            "No driving route was found."
          );
        }

        const selectedRoute =
          data.routes[0];

        const routeCoordinates =
          selectedRoute.geometry.coordinates.map(
            ([longitude, latitude]) => [
              latitude,
              longitude,
            ]
          );

        setRoute(routeCoordinates);

        setRouteDistance(
          selectedRoute.distance
        );

        setRouteDuration(
          selectedRoute.duration
        );

        if (
          map &&
          routeCoordinates.length > 1
        ) {
          const bounds =
            L.latLngBounds(
              routeCoordinates
            );

          map.fitBounds(bounds, {
            padding: [70, 70],
            maxZoom: 14,
            animate: true,
          });
        }
      } catch (routeFetchError) {
        console.error(
          "Route calculation failed:",
          routeFetchError
        );

        setRouteError(
          routeFetchError?.message ||
            "Unable to calculate route."
        );
      } finally {
        setRouteLoading(false);
      }
    },
    [map]
  );

  const findDrivingRoute = useCallback(
    async () => {
      if (!currentLocation) {
        setRouteError(
          "Use your current location first to calculate a driving route."
        );

        return;
      }

      const query = destination.trim();

      if (!query) {
        setRouteError(
          "Enter a destination first."
        );

        return;
      }

      setRouteLoading(true);
      setRouteError("");

      try {
        const url =
          "https://nominatim.openstreetmap.org/search?" +
          new URLSearchParams({
            q: query,
            format: "json",
            limit: "1",
          }).toString();

        const response = await fetch(url, {
          headers: {
            Accept:
              "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            "Destination search failed."
          );
        }

        const data = await response.json();

        if (
          !Array.isArray(data) ||
          data.length === 0
        ) {
          throw new Error(
            "Destination could not be found."
          );
        }

        const destinationPoint = [
          Number(data[0].lat),
          Number(data[0].lon),
        ];

        await calculateRoute(
          currentLocation,
          destinationPoint
        );
      } catch (routeErrorValue) {
        console.error(
          "Route search failed:",
          routeErrorValue
        );

        setRouteError(
          routeErrorValue?.message ||
            "Unable to create route."
        );

        setRouteLoading(false);
      }
    },
    [
      calculateRoute,
      currentLocation,
      destination,
    ]
  );

  const clearRoute = useCallback(() => {
    setRoute([]);
    setRouteDistance(null);
    setRouteDuration(null);
    setRouteError("");
  }, []);

  const handleFilterChange = useCallback(
    (nextFilter) => {
      setFilter(nextFilter);

      if (!map) {
        return;
      }

      const nextCameras =
        nextFilter === "all"
          ? cameras
          : cameras.filter(
              (camera) =>
                normalizeCameraType(
                  camera
                ) === nextFilter
            );

      if (nextCameras.length === 0) {
        return;
      }

      const points = nextCameras
        .map((camera) => [
          getLatitude(camera),
          getLongitude(camera),
        ])
        .filter(([lat, lng]) =>
          isValidCoordinate(
            lat,
            lng
          )
        );

      if (points.length === 1) {
        map.flyTo(points[0], 13, {
          duration: 0.8,
        });
      } else if (points.length > 1) {
        map.fitBounds(
          L.latLngBounds(points),
          {
            padding: [60, 60],
            maxZoom: 12,
            animate: true,
          }
        );
      }
    },
    [cameras, map]
  );

  const formattedUpdatedTime =
    lastUpdated
      ? lastUpdated.toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        )
      : "--:--:--";

  const formattedDistance =
    routeDistance !== null
      ? routeDistance >= 1000
        ? `${(
            routeDistance / 1000
          ).toFixed(1)} km`
        : `${Math.round(
            routeDistance
          )} m`
      : null;

  const formattedDuration =
    routeDuration !== null
      ? routeDuration >= 3600
        ? `${Math.floor(
            routeDuration / 3600
          )}h ${Math.round(
            (routeDuration % 3600) /
              60
          )}m`
        : `${Math.max(
            1,
            Math.round(
              routeDuration / 60
            )
          )} min`
      : null;

  return (
    <div className="camera-map-page">
      <div className="camera-map-shell">
        <header className="camera-map-header">
          <div className="camera-map-brand">
            <div className="camera-map-brand-mark">
              G
            </div>

            <div>
              <div className="camera-map-brand-title">
                GLOBAL CAMERA MAP
              </div>

              <div className="camera-map-brand-subtitle">
                TRAFFIC INTELLIGENCE PLATFORM
              </div>
            </div>
          </div>

          <div className="camera-map-header-right">
            <span className="camera-map-live-indicator">
              <span className="live-dot" />
              NETWORK / LIVE
            </span>

            <button
              type="button"
              className="camera-map-refresh"
              onClick={() =>
                fetchCameras()
              }
              title="Refresh camera network"
              disabled={loading}
            >
              ↻
            </button>
          </div>
        </header>

        <div className="camera-map-main">
          <div className="camera-map-map-wrap">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              minZoom={3}
              maxZoom={19}
              zoomControl={false}
              scrollWheelZoom={true}
              doubleClickZoom={true}
              dragging={true}
              touchZoom={true}
              className="gcm-leaflet-map"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

              <MapResizeHandler />

              <MapController
                onMapReady={
                  handleMapReady
                }
                onZoomChange={
                  handleZoomChange
                }
              />

              <MapFitToCameras
                cameras={
                  filter === "all"
                    ? cameras
                    : []
                }
              />

              <MapClickHandler />

              {filteredCameras.map(
                (camera, index) => {
                  const latitude =
                    getLatitude(
                      camera
                    );

                  const longitude =
                    getLongitude(
                      camera
                    );

                  const cameraId =
                    camera?.id ??
                    camera?.camera_id ??
                    `camera-${index}`;

                  return (
                    <Marker
                      key={cameraId}
                      position={[
                        latitude,
                        longitude,
                      ]}
                      icon={getCameraIcon(
                        camera
                      )}
                    >
                      <Popup
                        closeButton={true}
                        className="gcm-camera-popup"
                      >
                        <CameraPopup
                          camera={camera}
                        />
                      </Popup>
                    </Marker>
                  );
                }
              )}

              <CurrentLocationMarker
                position={
                  currentLocation
                }
              />

              {route.length > 1 && (
                <Polyline
                  positions={route}
                  pathOptions={{
                    color: "#111827",
                    weight: 5,
                    opacity: 0.9,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              )}
            </MapContainer>

            <MapZoomControls map={map} />

            <div className="gcm-map-attribution">
              <span>Leaflet</span>
              <span>© OpenStreetMap contributors</span>
              <span>© CARTO</span>
            </div>

            <LoadingOverlay
              visible={
                loading &&
                cameras.length === 0
              }
            />

            <ErrorOverlay
              message={error}
              onRetry={() =>
                fetchCameras()
              }
            />

            <div className="gcm-map-top-overlay">
              <div className="gcm-map-kicker">
                GCM / LIVE NETWORK
              </div>

              <h1>
                Global Camera Map
              </h1>

              <p>
                Traffic enforcement
                intelligence
              </p>
            </div>

            <div className="gcm-map-stat-strip">
              <div className="gcm-map-stat">
                <strong>
                  {filteredCameras.length}
                </strong>

                <span>VISIBLE</span>
              </div>

              <div className="gcm-map-stat">
                <strong>
                  {cameras.length}
                </strong>

                <span>INDEXED</span>
              </div>

              <div className="gcm-map-stat-live">
                <span className="live-dot" />
                <span>LIVE</span>
              </div>

              <div className="gcm-map-stat-updated">
                UPDATED{" "}
                {formattedUpdatedTime}
              </div>
            </div>

            <aside className="gcm-map-control-panel">
              <CameraFilter
                filter={filter}
                setFilter={
                  handleFilterChange
                }
                counts={counts}
              />

              <div className="gcm-location-section">
                <button
                  type="button"
                  className="gcm-location-button"
                  onClick={
                    useCurrentLocation
                  }
                  disabled={
                    locationLoading
                  }
                >
                  <span className="gcm-location-icon">
                    ◎
                  </span>

                  <span>
                    {locationLoading
                      ? "Locating…"
                      : "Use My Current Location"}
                  </span>
                </button>

                {locationError && (
                  <div className="gcm-inline-error">
                    {locationError}
                  </div>
                )}
              </div>

              <div className="gcm-route-section">
                <div className="gcm-section-label">
                  ROUTE PLANNER
                </div>

                <div className="gcm-route-title">
                  Find camera coverage
                </div>

                <div className="gcm-search-box">
                  <span className="gcm-search-icon">
                    ⌕
                  </span>

                  <input
                    type="text"
                    value={destination}
                    onChange={(event) =>
                      setDestination(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        searchDestination();
                      }
                    }}
                    placeholder="Search destination..."
                    aria-label="Search destination"
                  />

                  {destination && (
                    <button
                      type="button"
                      className="gcm-search-clear"
                      onClick={() =>
                        setDestination(
                          ""
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="gcm-route-actions">
                  <button
                    type="button"
                    className="gcm-route-search"
                    onClick={
                      searchDestination
                    }
                    disabled={
                      routeLoading
                    }
                  >
                    {routeLoading
                      ? "Searching…"
                      : "Search"}
                  </button>

                  <button
                    type="button"
                    className="gcm-route-button"
                    onClick={
                      findDrivingRoute
                    }
                    disabled={
                      routeLoading ||
                      !currentLocation
                    }
                  >
                    Find Driving Route
                  </button>
                </div>

                {routeError && (
                  <div className="gcm-inline-error">
                    {routeError}
                  </div>
                )}

                {route.length > 1 && (
                  <div className="gcm-route-result">
                    <div>
                      <span>ROUTE ACTIVE</span>

                      <strong>
                        {formattedDistance ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>EST. TIME</span>

                      <strong>
                        {formattedDuration ||
                          "—"}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={
                        clearRoute
                      }
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="gcm-network-status">
                <span className="network-status-dot" />

                <span>
                  Network Operational
                </span>
              </div>
            </aside>

            <div className="gcm-map-footer">
              <span>
                GCM / NETWORK / LIVE
              </span>

              <span>
                {filteredCameras.length}{" "}
                cameras visible
              </span>
            </div>

            <div className="gcm-legend">
              <div className="gcm-section-label">
                CAMERA LEGEND
              </div>

              <div className="gcm-legend-item">
                <span className="legend-marker speed" />
                <span>Speed Camera</span>
              </div>

              <div className="gcm-legend-item">
                <span className="legend-marker red" />
                <span>
                  Red Light Camera
                </span>
              </div>

              <div className="gcm-legend-item">
                <span className="legend-marker other" />
                <span>Other Camera</span>
              </div>
            </div>

            <div className="gcm-map-zoom-readout">
              ZOOM {zoom}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}