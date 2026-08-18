import { useEffect, useMemo, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "./App.css";


// ============================================================
// API
// ============================================================

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// CAMERA ICONS
// ============================================================

const speedIcon = new L.Icon({
  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const redLightIcon = new L.Icon({
  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/2554/2554978.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});


// ============================================================
// ROUTE CAMERA SEARCH RADIUS
// ============================================================

const ROUTE_CAMERA_RADIUS_METERS = 1000;


// ============================================================
// HAVERSINE DISTANCE
// ============================================================

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    R *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}


// ============================================================
// DISTANCE FROM CAMERA TO ROUTE
// ============================================================

function minimumDistanceToRoute(camera, routeCoordinates) {
  if (!routeCoordinates || routeCoordinates.length === 0) {
    return Infinity;
  }

  let minimum = Infinity;

  for (const point of routeCoordinates) {
    const latitude = Number(point[0]);
    const longitude = Number(point[1]);

    const distance = distanceMeters(
      Number(camera.latitude),
      Number(camera.longitude),
      latitude,
      longitude
    );

    if (distance < minimum) {
      minimum = distance;
    }
  }

  return minimum;
}


// ============================================================
// MAP CONTROLLER
// ============================================================

function MapController({ cameras }) {
  const map = useMap();

  useEffect(() => {
    if (!cameras || cameras.length === 0) {
      return;
    }

    const validCameras = cameras
      .map((camera) => [
        Number(camera.latitude),
        Number(camera.longitude),
      ])
      .filter(
        ([lat, lng]) =>
          Number.isFinite(lat) &&
          Number.isFinite(lng)
      );

    if (validCameras.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(validCameras);

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
    });
  }, [cameras, map]);

  return null;
}


// ============================================================
// ROUTE FIT CONTROLLER
// ============================================================

function RouteController({ route }) {
  const map = useMap();

  useEffect(() => {
    if (!route || route.length < 2) {
      return;
    }

    const validRoute = route.filter(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1]))
    );

    if (validRoute.length < 2) {
      return;
    }

    const bounds = L.latLngBounds(validRoute);

    map.fitBounds(bounds, {
      padding: [50, 50],
    });
  }, [route, map]);

  return null;
}


// ============================================================
// CAMERA ICON SELECTOR
// ============================================================

function getCameraIcon(camera) {
  const type = String(
    camera.camera_type ||
      camera.enforcement_type ||
      ""
  ).toLowerCase();

  if (
    type.includes("red") ||
    type.includes("traffic light") ||
    type.includes("signal")
  ) {
    return redLightIcon;
  }

  return speedIcon;
}


// ============================================================
// CAMERA POPUP
// ============================================================

function CameraPopup({ camera }) {
  return (
    <Popup>
      <div className="camera-popup">
        <h3>
          {camera.camera_type ||
            camera.enforcement_type ||
            "Traffic Camera"}
        </h3>

        <p>
          <strong>City:</strong>{" "}
          {camera.city || "Unknown"}
        </p>

        {camera.state && (
          <p>
            <strong>State:</strong>{" "}
            {camera.state}
          </p>
        )}

        {camera.road_name && (
          <p>
            <strong>Road:</strong>{" "}
            {camera.road_name}
          </p>
        )}

        {camera.speed_limit && (
          <p>
            <strong>Speed Limit:</strong>{" "}
            {camera.speed_limit}
          </p>
        )}

        <p>
          <strong>Status:</strong>{" "}
          {camera.status || "Unknown"}
        </p>

        <p>
          <strong>Verification:</strong>{" "}
          {camera.verification_status || "Unknown"}
        </p>

        {camera.source && (
          <p>
            <strong>Source:</strong>{" "}
            {camera.source}
          </p>
        )}

        {camera.latitude !== undefined &&
          camera.longitude !== undefined && (
            <p>
              <strong>Coordinates:</strong>{" "}
              {Number(camera.latitude).toFixed(6)},{" "}
              {Number(camera.longitude).toFixed(6)}
            </p>
          )}
      </div>
    </Popup>
  );
}


// ============================================================
// APP
// ============================================================

function App() {
  const [cameras, setCameras] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [route, setRoute] = useState([]);

  const [routeLoading, setRouteLoading] =
    useState(false);

  const [routeError, setRouteError] =
    useState("");

  const [startLocation, setStartLocation] =
    useState("");

  const [endLocation, setEndLocation] =
    useState("");

  const [showRouteCameras, setShowRouteCameras] =
    useState(false);


  // ==========================================================
  // LOAD CAMERAS
  // ==========================================================

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
            `HTTP ${response.status}`
          );
        }

        const data = await response.json();

        let cameraData = data;

        // Support either:
        // [ ... ]
        // or { cameras: [ ... ] }

        if (
          data &&
          !Array.isArray(data) &&
          Array.isArray(data.cameras)
        ) {
          cameraData = data.cameras;
        }

        if (!Array.isArray(cameraData)) {
          throw new Error(
            "Camera API returned an unexpected response."
          );
        }

        if (!cancelled) {
          setCameras(cameraData);
        }
      } catch (err) {
        console.error(
          "Failed to load cameras:",
          err
        );

        if (!cancelled) {
          setError(
            "Unable to load cameras from the backend."
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


  // ==========================================================
  // FILTER CAMERAS
  // ==========================================================

  const filteredCameras = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return cameras;
    }

    return cameras.filter((camera) => {
      const values = [
        camera.city,
        camera.state,
        camera.country,
        camera.road_name,
        camera.camera_type,
        camera.enforcement_type,
        camera.status,
        camera.source,
      ];

      return values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [cameras, search]);


  // ==========================================================
  // CAMERAS NEAR ROUTE
  // ==========================================================

  const routeCameras = useMemo(() => {
    if (!route || route.length < 2) {
      return [];
    }

    return cameras
      .map((camera) => ({
        ...camera,
        routeDistance: minimumDistanceToRoute(
          camera,
          route
        ),
      }))
      .filter(
        (camera) =>
          camera.routeDistance <=
          ROUTE_CAMERA_RADIUS_METERS
      )
      .sort(
        (a, b) =>
          a.routeDistance -
          b.routeDistance
      );
  }, [cameras, route]);


  // ==========================================================
  // ROUTE CALCULATION
  // ==========================================================

  async function calculateRoute() {
    const start = startLocation.trim();
    const end = endLocation.trim();

    if (!start || !end) {
      setRouteError(
        "Enter both a starting location and destination."
      );
      return;
    }

    try {
      setRouteLoading(true);
      setRouteError("");
      setRoute([]);

      // ------------------------------------------------------
      // Geocode start location
      // ------------------------------------------------------

      const startResponse =
        await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
            start
          )}`,
          {
            headers: {
              Accept:
                "application/json",
              "User-Agent":
                "GlobalCameraMap/1.0",
            },
          }
        );

      if (!startResponse.ok) {
        throw new Error(
          "Unable to find starting location."
        );
      }

      const startData =
        await startResponse.json();

      if (
        !Array.isArray(startData) ||
        startData.length === 0
      ) {
        throw new Error(
          `Starting location "${start}" was not found.`
        );
      }

      const startLat =
        Number(startData[0].lat);

      const startLng =
        Number(startData[0].lon);


      // ------------------------------------------------------
      // Geocode destination
      // ------------------------------------------------------

      const endResponse =
        await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
            end
          )}`,
          {
            headers: {
              Accept:
                "application/json",
              "User-Agent":
                "GlobalCameraMap/1.0",
            },
          }
        );

      if (!endResponse.ok) {
        throw new Error(
          "Unable to find destination."
        );
      }

      const endData =
        await endResponse.json();

      if (
        !Array.isArray(endData) ||
        endData.length === 0
      ) {
        throw new Error(
          `Destination "${end}" was not found.`
        );
      }

      const endLat =
        Number(endData[0].lat);

      const endLng =
        Number(endData[0].lon);


      // ------------------------------------------------------
      // OSRM route
      // ------------------------------------------------------

      const routeResponse =
        await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
        );

      if (!routeResponse.ok) {
        throw new Error(
          "Unable to calculate driving route."
        );
      }

      const routeData =
        await routeResponse.json();

      if (
        routeData.code !== "Ok" ||
        !routeData.routes ||
        routeData.routes.length === 0
      ) {
        throw new Error(
          "No driving route was found."
        );
      }

      const coordinates =
        routeData.routes[0].geometry
          .coordinates;

      const leafletCoordinates =
        coordinates.map(
          ([lng, lat]) => [lat, lng]
        );

      setRoute(
        leafletCoordinates
      );

      setShowRouteCameras(true);
    } catch (err) {
      console.error(
        "Route calculation failed:",
        err
      );

      setRouteError(
        err.message ||
          "Unable to calculate route."
      );
    } finally {
      setRouteLoading(false);
    }
  }


  // ==========================================================
  // CLEAR ROUTE
  // ==========================================================

  function clearRoute() {
    setRoute([]);
    setRouteError("");
    setStartLocation("");
    setEndLocation("");
    setShowRouteCameras(false);
  }


  // ==========================================================
  // MAP CENTER
  // ==========================================================

  const defaultCenter = [22.9734, 78.6569];


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="app">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="app-header">

        <div>
          <h1>
            Global Camera Map
          </h1>

          <p>
            Traffic enforcement camera map
          </p>
        </div>

        <div className="camera-count">
          <strong>
            {cameras.length}
          </strong>

          <span>
            Cameras
          </span>
        </div>

      </header>


      {/* ====================================================
          SEARCH / ROUTE CONTROLS
      ==================================================== */}

      <section className="controls">

        <div className="search-section">

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search city, state, road, camera type..."
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
            >
              Clear
            </button>
          )}

        </div>


        <div className="route-section">

          <input
            type="text"
            value={startLocation}
            onChange={(event) =>
              setStartLocation(
                event.target.value
              )
            }
            placeholder="Starting location"
          />

          <input
            type="text"
            value={endLocation}
            onChange={(event) =>
              setEndLocation(
                event.target.value
              )
            }
            placeholder="Destination"
          />

          <button
            type="button"
            onClick={calculateRoute}
            disabled={routeLoading}
          >
            {routeLoading
              ? "Calculating..."
              : "Calculate Route"}
          </button>

          {route.length > 0 && (
            <button
              type="button"
              onClick={clearRoute}
            >
              Clear Route
            </button>
          )}

        </div>


        {routeError && (
          <div className="route-error">
            {routeError}
          </div>
        )}


        {route.length > 0 && (
          <div className="route-summary">

            <strong>
              Cameras near route:
              {" "}
              {routeCameras.length}
            </strong>

            <button
              type="button"
              onClick={() =>
                setShowRouteCameras(
                  (current) =>
                    !current
                )
              }
            >
              {showRouteCameras
                ? "Hide Route Cameras"
                : "Show Route Cameras"}
            </button>

          </div>
        )}

      </section>


      {/* ====================================================
          STATUS
      ==================================================== */}

      {loading && (
        <div className="status-message">
          Loading cameras...
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}


      {/* ====================================================
          MAP
      ==================================================== */}

      <main className="map-wrapper">

        <MapContainer
          center={defaultCenter}
          zoom={5}
          scrollWheelZoom={true}
          className="map-container"
        >

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />


          {/* ================================================
              MAP CONTROLLER
          ================================================ */}

          {filteredCameras.length > 0 &&
            route.length === 0 && (
              <MapController
                cameras={
                  filteredCameras
                }
              />
            )}


          {/* ================================================
              ROUTE CONTROLLER
          ================================================ */}

          {route.length > 1 && (
            <RouteController
              route={route}
            />
          )}


          {/* ================================================
              ROUTE LINE
          ================================================ */}

          {route.length > 1 && (
            <Polyline
              positions={route}
              pathOptions={{
                weight: 6,
              }}
            />
          )}


          {/* ================================================
              CAMERAS
          ================================================ */}

          {filteredCameras.map(
            (camera, index) => {
              const latitude =
                Number(
                  camera.latitude
                );

              const longitude =
                Number(
                  camera.longitude
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

              const isRouteCamera =
                showRouteCameras &&
                routeCameras.some(
                  (routeCamera) =>
                    routeCamera.id ===
                    camera.id
                );

              if (
                route.length > 0 &&
                showRouteCameras &&
                !isRouteCamera
              ) {
                return null;
              }

              return (
                <Marker
                  key={
                    camera.id ??
                    `${latitude}-${longitude}-${index}`
                  }
                  position={[
                    latitude,
                    longitude,
                  ]}
                  icon={getCameraIcon(
                    camera
                  )}
                >
                  <CameraPopup
                    camera={
                      camera
                    }
                  />
                </Marker>
              );
            }
          )}

        </MapContainer>

      </main>


      {/* ====================================================
          FOOTER / RESULTS
      ==================================================== */}

      <footer className="app-footer">

        <span>
          Showing{" "}
          <strong>
            {route.length > 0 &&
            showRouteCameras
              ? routeCameras.length
              : filteredCameras.length}
          </strong>{" "}
          cameras
        </span>

        {search && (
          <span>
            Search:{" "}
            <strong>
              {search}
            </strong>
          </span>
        )}

      </footer>

    </div>
  );
}

export default App;