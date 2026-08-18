import React, { useEffect, useMemo, useState } from "react";
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

const OSRM_URL = "https://router.project-osrm.org";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/* =========================================================
   CAMERA ICONS
========================================================= */

const speedIcon = new L.DivIcon({
  className: "camera-marker",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#2563eb;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:18px;
    ">🚗</div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const redLightIcon = new L.DivIcon({
  className: "camera-marker",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#dc2626;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:18px;
    ">🚦</div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const otherIcon = new L.DivIcon({
  className: "camera-marker",
  html: `
    <div style="
      width:32px;
      height:32px;
      border-radius:50%;
      background:#6b7280;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:17px;
    ">📷</div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const currentLocationIcon = new L.DivIcon({
  className: "current-location-marker",
  html: `
    <div style="
      width:22px;
      height:22px;
      border-radius:50%;
      background:#2563eb;
      border:4px solid white;
      box-shadow:0 0 0 8px rgba(37,99,235,.20),
                 0 2px 10px rgba(0,0,0,.35);
    "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/* =========================================================
   HELPERS
========================================================= */

function normalizeCameraType(cameraType) {
  const value = String(cameraType || "").toLowerCase();

  if (
    value.includes("speed") ||
    value.includes("speed enforcement")
  ) {
    return "speed";
  }

  if (
    value.includes("red light") ||
    value.includes("red-light") ||
    value.includes("redlight")
  ) {
    return "red";
  }

  return "other";
}

function getCameraIcon(cameraType) {
  const type = normalizeCameraType(cameraType);

  if (type === "speed") return speedIcon;
  if (type === "red") return redLightIcon;

  return otherIcon;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return value;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================================================
   MAP CONTROLLER
========================================================= */

function MapController({
  currentLocation,
  routes,
}) {
  const map = useMap();

  useEffect(() => {
    if (routes.length > 0) {
      const points = [];

      routes.forEach((route) => {
        if (route.geometry?.coordinates) {
          route.geometry.coordinates.forEach(([lon, lat]) => {
            points.push([lat, lon]);
          });
        }
      });

      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points), {
          padding: [60, 60],
        });
      }

      return;
    }

    if (currentLocation) {
      map.setView(
        [currentLocation.lat, currentLocation.lon],
        14
      );
    }
  }, [routes, currentLocation, map]);

  return null;
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function CameraMap() {
  const [cameras, setCameras] = useState([]);

  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Navigation */

  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState("");
  const [destinationLocation, setDestinationLocation] =
    useState(null);

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [destinationLoading, setDestinationLoading] =
    useState(false);

  /* Camera radar */

  const [cameraRadius, setCameraRadius] = useState(200);

  /* =======================================================
     LOAD CAMERAS
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadCameras() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/cameras`
        );

        if (!response.ok) {
          throw new Error(
            `Camera API returned HTTP ${response.status}`
          );
        }

        const data = await response.json();

        let list = [];

        if (Array.isArray(data)) {
          list = data;
        } else if (Array.isArray(data?.cameras)) {
          list = data.cameras;
        } else {
          throw new Error(
            "Unexpected /api/cameras response format."
          );
        }

        if (!cancelled) {
          setCameras(list);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load cameras."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCameras();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     CAMERA COUNTS
  ======================================================= */

  const speedCount = useMemo(
    () =>
      cameras.filter(
        (camera) =>
          normalizeCameraType(
            camera.camera_type
          ) === "speed"
      ).length,
    [cameras]
  );

  const redCount = useMemo(
    () =>
      cameras.filter(
        (camera) =>
          normalizeCameraType(
            camera.camera_type
          ) === "red"
      ).length,
    [cameras]
  );

  const otherCount =
    cameras.length - speedCount - redCount;

  const filteredCameras = useMemo(() => {
    if (filter === "all") {
      return cameras;
    }

    return cameras.filter(
      (camera) =>
        normalizeCameraType(
          camera.camera_type
        ) === filter
    );
  }, [cameras, filter]);

  /* =======================================================
     CURRENT LOCATION
  ======================================================= */

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setRouteError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);
    setRouteError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        setCurrentLocation(location);
        setLocationLoading(false);
      },
      (err) => {
        console.error(err);

        setLocationLoading(false);

        setRouteError(
          "Unable to detect your location. Please allow location access in your browser."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }

  /* =======================================================
     DESTINATION SEARCH
  ======================================================= */

  async function searchDestination() {
    const query = destination.trim();

    if (!query) {
      setRouteError("Enter a destination first.");
      return;
    }

    try {
      setDestinationLoading(true);
      setRouteError("");

      const params = new URLSearchParams({
        q: query,
        format: "json",
        limit: "1",
        addressdetails: "1",
      });

      const response = await fetch(
        `${NOMINATIM_URL}?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Destination search failed: HTTP ${response.status}`
        );
      }

      const results = await response.json();

      if (!results.length) {
        throw new Error(
          "Destination could not be found."
        );
      }

      const result = results[0];

      const location = {
        lat: Number(result.lat),
        lon: Number(result.lon),
        name: result.display_name,
      };

      setDestinationLocation(location);

      setDestination(result.display_name);
    } catch (err) {
      console.error(err);

      setRouteError(
        err.message ||
          "Unable to find destination."
      );
    } finally {
      setDestinationLoading(false);
    }
  }

  /* =======================================================
     ROUTING
  ======================================================= */

  async function calculateRoutes() {
    if (!currentLocation) {
      setRouteError(
        "Detect your current location first."
      );
      return;
    }

    if (!destinationLocation) {
      setRouteError(
        "Search for a destination first."
      );
      return;
    }

    try {
      setRouteLoading(true);
      setRouteError("");
      setRoutes([]);

      const coordinates = [
        `${currentLocation.lon},${currentLocation.lat}`,
        `${destinationLocation.lon},${destinationLocation.lat}`,
      ].join(";");

      const url =
        `${OSRM_URL}/route/v1/driving/${coordinates}` +
        `?alternatives=true` +
        `&steps=true` +
        `&overview=full` +
        `&geometries=geojson`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Routing request failed: HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (data.code !== "Ok") {
        throw new Error(
          "No driving route could be found."
        );
      }

      setRoutes(data.routes || []);
      setSelectedRoute(0);
    } catch (err) {
      console.error(err);

      setRouteError(
        err.message ||
          "Unable to calculate route."
      );
    } finally {
      setRouteLoading(false);
    }
  }

  /* =======================================================
     AUTOMATIC CAMERA RADAR
  ======================================================= */

  const routeCameras = useMemo(() => {
    if (!routes.length) {
      return [];
    }

    const route =
      routes[selectedRoute] || routes[0];

    if (!route?.geometry?.coordinates) {
      return [];
    }

    const coordinates =
      route.geometry.coordinates;

    const found = new Map();

    for (const camera of cameras) {
      const cameraLat = Number(camera.latitude);
      const cameraLon = Number(camera.longitude);

      if (
        !Number.isFinite(cameraLat) ||
        !Number.isFinite(cameraLon)
      ) {
        continue;
      }

      let closestDistance = Infinity;

      /*
       * Compare the camera against the route geometry.
       *
       * This deliberately samples the route coordinates
       * rather than doing expensive geometry calculations
       * in the browser for every camera.
       */

      for (const [lon, lat] of coordinates) {
        const distance = distanceMeters(
          cameraLat,
          cameraLon,
          lat,
          lon
        );

        if (distance < closestDistance) {
          closestDistance = distance;
        }

        if (closestDistance <= cameraRadius) {
          break;
        }
      }

      if (closestDistance <= cameraRadius) {
        found.set(camera.id, {
          ...camera,
          routeDistance: closestDistance,
        });
      }
    }

    return Array.from(found.values());
  }, [
    routes,
    selectedRoute,
    cameras,
    cameraRadius,
  ]);

  /* =======================================================
     ROUTE INFORMATION
  ======================================================= */

  const selectedRouteData =
    routes[selectedRoute];

  const routeDistanceKm =
    selectedRouteData
      ? selectedRouteData.distance / 1000
      : 0;

  const routeDurationMin =
    selectedRouteData
      ? selectedRouteData.duration / 60
      : 0;

  function formatMinutes(minutes) {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    return `${hours} hr ${mins} min`;
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div
        style={{
          padding: "30px",
          textAlign: "center",
          fontSize: "18px",
        }}
      >
        Loading camera map...
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div
        style={{
          padding: "30px",
          textAlign: "center",
        }}
      >
        <h2>Unable to load camera map</h2>

        <p style={{ color: "red" }}>
          {error}
        </p>

        <code>
          http://127.0.0.1:8000
        </code>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 80px)",
        minHeight: "700px",
        position: "relative",
      }}
    >
      {/* =================================================
          NAVIGATION PANEL
      ================================================= */}

      <div
        style={{
          position: "absolute",
          top: "15px",
          left: "15px",
          zIndex: 2000,
          width: "390px",
          maxWidth: "calc(100% - 30px)",
          background: "white",
          borderRadius: "14px",
          padding: "16px",
          boxShadow:
            "0 4px 20px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            fontSize: "20px",
            fontWeight: "800",
            marginBottom: "12px",
          }}
        >
          🌍 Global Camera Map
        </div>

        {/* Current location */}

        <button
          type="button"
          onClick={detectCurrentLocation}
          disabled={locationLoading}
          style={{
            width: "100%",
            padding: "11px",
            border: "none",
            borderRadius: "9px",
            background: "#2563eb",
            color: "white",
            fontWeight: "700",
            cursor: "pointer",
            marginBottom: "10px",
          }}
        >
          {locationLoading
            ? "📍 Detecting location..."
            : "📍 Use My Current Location"}
        </button>

        {currentLocation && (
          <div
            style={{
              fontSize: "12px",
              color: "#555",
              marginBottom: "10px",
            }}
          >
            Current location:
            <br />
            {currentLocation.lat.toFixed(5)},{" "}
            {currentLocation.lon.toFixed(5)}
          </div>
        )}

        {/* Destination */}

        <div
          style={{
            display: "flex",
            gap: "7px",
            marginBottom: "10px",
          }}
        >
          <input
            value={destination}
            onChange={(e) =>
              setDestination(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchDestination();
              }
            }}
            placeholder="Where do you want to go?"
            style={{
              flex: 1,
              padding: "11px",
              border:
                "1px solid #d1d5db",
              borderRadius: "9px",
              outline: "none",
            }}
          />

          <button
            type="button"
            onClick={searchDestination}
            disabled={destinationLoading}
            style={{
              padding: "0 13px",
              border: "none",
              borderRadius: "9px",
              background: "#111827",
              color: "white",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {destinationLoading
              ? "..."
              : "Search"}
          </button>
        </div>

        {destinationLocation && (
          <div
            style={{
              fontSize: "12px",
              color: "#555",
              marginBottom: "10px",
            }}
          >
            🎯 Destination found
          </div>
        )}

        {/* Calculate route */}

        <button
          type="button"
          onClick={calculateRoutes}
          disabled={
            routeLoading ||
            !currentLocation ||
            !destinationLocation
          }
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: "9px",
            background:
              !currentLocation ||
              !destinationLocation
                ? "#9ca3af"
                : "#16a34a",
            color: "white",
            fontWeight: "800",
            cursor: "pointer",
            marginBottom: "12px",
          }}
        >
          {routeLoading
            ? "🛣️ Finding routes..."
            : "🚗 Find Driving Routes"}
        </button>

        {routeError && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "10px",
            }}
          >
            {routeError}
          </div>
        )}

        {/* =================================================
            ROUTES
        ================================================= */}

        {routes.length > 0 && (
          <div>
            <div
              style={{
                fontWeight: "800",
                marginBottom: "8px",
              }}
            >
              🛣️ Available Routes
            </div>

            {routes.map((route, index) => {
              const km =
                route.distance / 1000;

              const minutes =
                route.duration / 60;

              const selected =
                selectedRoute === index;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    setSelectedRoute(index)
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px",
                    marginBottom: "7px",
                    borderRadius: "9px",
                    border: selected
                      ? "2px solid #2563eb"
                      : "1px solid #ddd",
                    background: selected
                      ? "#eff6ff"
                      : "white",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "800",
                    }}
                  >
                    {index === 0
                      ? "⭐ Recommended"
                      : `Alternative ${index}`}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      marginTop: "3px",
                    }}
                  >
                    {km.toFixed(1)} km •{" "}
                    {formatMinutes(minutes)}
                  </div>
                </button>
              );
            })}

            {/* =================================================
                CAMERA RADAR
            ================================================= */}

            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                background: "#f9fafb",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  fontWeight: "800",
                  marginBottom: "7px",
                }}
              >
                📡 Camera Radar
              </div>

              <div
                style={{
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                Cameras within{" "}
                <strong>
                  {cameraRadius} m
                </strong>{" "}
                of this route:
              </div>

              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={cameraRadius}
                onChange={(e) =>
                  setCameraRadius(
                    Number(e.target.value)
                  )
                }
                style={{
                  width: "100%",
                }}
              />

              <div
                style={{
                  marginTop: "8px",
                  fontSize: "22px",
                  fontWeight: "900",
                }}
              >
                📷 {routeCameras.length}
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                cameras detected on/near route
              </div>
            </div>

            {/* Route summary */}

            <div
              style={{
                marginTop: "10px",
                padding: "10px",
                borderRadius: "9px",
                background: "#ecfdf5",
                color: "#065f46",
              }}
            >
              <strong>
                Selected route
              </strong>

              <br />

              {routeDistanceKm.toFixed(1)} km •{" "}
              {formatMinutes(
                routeDurationMin
              )}

              <br />

              📷{" "}
              <strong>
                {routeCameras.length}
              </strong>{" "}
              cameras
            </div>
          </div>
        )}
      </div>

      {/* =================================================
          MAP
      ================================================= */}

      <MapContainer
        center={[22.5937, 78.9629]}
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

        <MapController
          currentLocation={
            currentLocation
          }
          routes={routes}
        />

        {/* =================================================
            CURRENT LOCATION
        ================================================= */}

        {currentLocation && (
          <Marker
            position={[
              currentLocation.lat,
              currentLocation.lon,
            ]}
            icon={currentLocationIcon}
          >
            <Popup>
              <strong>
                📍 Your Current Location
              </strong>
            </Popup>
          </Marker>
        )}

        {/* =================================================
            DESTINATION
        ================================================= */}

        {destinationLocation && (
          <Marker
            position={[
              destinationLocation.lat,
              destinationLocation.lon,
            ]}
          >
            <Popup>
              <strong>
                🎯 Destination
              </strong>

              <br />

              {destinationLocation.name}
            </Popup>
          </Marker>
        )}

        {/* =================================================
            ROUTES
        ================================================= */}

        {routes.map((route, index) => {
          if (!route.geometry) {
            return null;
          }

          const coordinates =
            route.geometry.coordinates.map(
              ([lon, lat]) => [lat, lon]
            );

          const selected =
            index === selectedRoute;

          return (
            <Polyline
              key={`route-${index}`}
              positions={coordinates}
              pathOptions={{
                color: selected
                  ? "#2563eb"
                  : "#94a3b8",
                weight: selected
                  ? 7
                  : 4,
                opacity: selected
                  ? 0.9
                  : 0.55,
              }}
            />
          );
        })}

        {/* =================================================
            CAMERA MARKERS
        ================================================= */}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {filteredCameras.map(
            (camera) => {
              const latitude =
                Number(camera.latitude);

              const longitude =
                Number(camera.longitude);

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

              const isRouteCamera =
                routeCameras.some(
                  (item) =>
                    item.id === camera.id
                );

              /*
               * When a route exists, only highlight
               * route cameras strongly.
               *
               * Other cameras remain visible but
               * less prominent.
               */

              return (
                <Marker
                  key={camera.id}
                  position={[
                    latitude,
                    longitude,
                  ]}
                  icon={getCameraIcon(
                    camera.camera_type
                  )}
                  opacity={
                    routes.length > 0 &&
                    !isRouteCamera
                      ? 0.25
                      : 1
                  }
                >
                  <Popup>
                    <div
                      style={{
                        minWidth: "240px",
                        lineHeight: "1.5",
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                        }}
                      >
                        {normalizeCameraType(
                          camera.camera_type
                        ) === "speed"
                          ? "🚗 Speed Camera"
                          : normalizeCameraType(
                              camera.camera_type
                            ) === "red"
                          ? "🚦 Red Light Camera"
                          : "📷 Traffic Camera"}
                      </h3>

                      {isRouteCamera && (
                        <div
                          style={{
                            background:
                              "#fee2e2",
                            color:
                              "#991b1b",
                            padding: "6px",
                            borderRadius:
                              "6px",
                            marginBottom:
                              "8px",
                            fontWeight:
                              "700",
                          }}
                        >
                          📡 CAMERA ON ROUTE
                        </div>
                      )}

                      <div>
                        <strong>ID:</strong>{" "}
                        {formatValue(
                          camera.id
                        )}
                      </div>

                      <div>
                        <strong>
                          Type:
                        </strong>{" "}
                        {formatValue(
                          camera.camera_type
                        )}
                      </div>

                      <div>
                        <strong>
                          City:
                        </strong>{" "}
                        {formatValue(
                          camera.city
                        )}
                      </div>

                      <div>
                        <strong>
                          State:
                        </strong>{" "}
                        {formatValue(
                          camera.state
                        )}
                      </div>

                      <div>
                        <strong>
                          Road:
                        </strong>{" "}
                        {formatValue(
                          camera.road_name
                        )}
                      </div>

                      <div>
                        <strong>
                          Enforcement:
                        </strong>{" "}
                        {formatValue(
                          camera.enforcement_type
                        )}
                      </div>

                      <div>
                        <strong>
                          Status:
                        </strong>{" "}
                        {formatValue(
                          camera.status
                        )}
                      </div>

                      <div>
                        <strong>
                          Verification:
                        </strong>{" "}
                        {formatValue(
                          camera.verification_status
                        )}
                      </div>

                      <div>
                        <strong>
                          Coordinates:
                        </strong>{" "}
                        {latitude.toFixed(5)},{" "}
                        {longitude.toFixed(5)}
                      </div>

                      {camera.source_url && (
                        <div
                          style={{
                            marginTop: "8px",
                          }}
                        >
                          <a
                            href={
                              camera.source_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Source
                          </a>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            }
          )}
        </MarkerClusterGroup>
      </MapContainer>

      {/* =================================================
          MAP LEGEND
      ================================================= */}

      <div
        style={{
          position: "absolute",
          bottom: "25px",
          right: "20px",
          zIndex: 1000,
          background: "white",
          borderRadius: "10px",
          padding: "12px 15px",
          boxShadow:
            "0 3px 12px rgba(0,0,0,.2)",
          fontSize: "14px",
        }}
      >
        <div
          style={{
            fontWeight: "700",
            marginBottom: "8px",
          }}
        >
          🗺️ Camera Legend
        </div>

        <div>🚗 Speed Camera</div>
        <div>🚦 Red Light Camera</div>
        <div>📷 Other Camera</div>

        {routes.length > 0 && (
          <div
            style={{
              marginTop: "6px",
              fontWeight: "700",
            }}
          >
            📡 Route Radar Active
          </div>
        )}
      </div>
    </div>
  );
}