import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";

import "./RoutePlanner.css";


// --------------------------------------------------
// Icons
// --------------------------------------------------

const cameraIcon = new L.Icon({
  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});


// --------------------------------------------------
// Geocoding using OpenStreetMap Nominatim
// --------------------------------------------------

async function geocode(place) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      place
    )}`
  );

  if (!response.ok) {
    throw new Error("Unable to find location");
  }

  const data = await response.json();

  if (!data.length) {
    throw new Error(`Location not found: ${place}`);
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    displayName: data[0].display_name,
  };
}


// --------------------------------------------------
// Route camera detection
// --------------------------------------------------

async function findRouteCameras(routeCoordinates) {
  const response = await fetch("/api/route/cameras", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: routeCoordinates.map(([lat, lon]) => [
        lon,
        lat,
      ]),
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to detect route cameras");
  }

  return response.json();
}


// --------------------------------------------------
// Route line component
// --------------------------------------------------

function RouteLine({ start, destination, onRouteReady }) {
  const map = useMap();

  useState(() => {
    if (!start || !destination) {
      return;
    }

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start.lat, start.lon),
        L.latLng(destination.lat, destination.lon),
      ],

      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),

      lineOptions: {
        styles: [
          {
            color: "#2563eb",
            opacity: 0.8,
            weight: 6,
          },
        ],
      },

      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,

      createMarker: () => null,

      show: false,
    }).addTo(map);


    routingControl.on("routesfound", async (event) => {
      try {
        const route = event.routes[0];

        const coordinates = route.coordinates.map((point) => [
          point.lat,
          point.lng,
        ]);

        onRouteReady(coordinates);
      } catch (error) {
        console.error("Route processing error:", error);
      }
    });


    return () => {
      map.removeControl(routingControl);
    };
  }, [map, start, destination, onRouteReady]);

  return null;
}


// --------------------------------------------------
// Main component
// --------------------------------------------------

function RoutePlanner() {
  const [startText, setStartText] = useState("");
  const [destinationText, setDestinationText] = useState("");

  const [start, setStart] = useState(null);
  const [destination, setDestination] = useState(null);

  const [routeCoordinates, setRouteCoordinates] = useState([]);

  const [routeCameras, setRouteCameras] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // ------------------------------------------------
  // Calculate route
  // ------------------------------------------------

  async function calculateRoute() {
    if (!startText.trim() || !destinationText.trim()) {
      setError("Enter both start and destination.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const startLocation = await geocode(startText);
      const destinationLocation = await geocode(
        destinationText
      );

      setStart(startLocation);
      setDestination(destinationLocation);

      setRouteCoordinates([]);
      setRouteCameras([]);
    } catch (err) {
      console.error(err);

      setError(
        err.message || "Unable to calculate route."
      );
    } finally {
      setLoading(false);
    }
  }


  // ------------------------------------------------
  // Route found
  // ------------------------------------------------

  async function handleRouteReady(coordinates) {
    setRouteCoordinates(coordinates);

    try {
      setLoading(true);

      const result = await findRouteCameras(coordinates);

      setRouteCameras(result.cameras || []);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to find cameras on this route."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="route-planner">

      <div className="route-panel">

        <h2>🗺️ Plan Your Route</h2>

        <div className="route-inputs">

          <input
            type="text"
            placeholder="Start location e.g. Chandigarh"
            value={startText}
            onChange={(e) =>
              setStartText(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Destination e.g. Shimla"
            value={destinationText}
            onChange={(e) =>
              setDestinationText(e.target.value)
            }
          />

          <button
            onClick={calculateRoute}
            disabled={loading}
          >
            {loading
              ? "Calculating..."
              : "Find Route"}
          </button>

        </div>


        {error && (
          <div className="route-error">
            {error}
          </div>
        )}

      </div>


      <div className="route-map-wrapper">

        <MapContainer
          center={[30.7333, 76.7794]}
          zoom={7}
          className="route-map"
        >

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />


          {start && destination && (
            <RouteLine
              start={start}
              destination={destination}
              onRouteReady={handleRouteReady}
            />
          )}


          {routeCameras.map((camera) => (
            <Marker
              key={camera.id}
              position={[
                camera.latitude,
                camera.longitude,
              ]}
              icon={cameraIcon}
            >
              <Popup>

                <h3>📷 Camera Ahead</h3>

                <p>
                  <b>City:</b>{" "}
                  {camera.city || "Unknown"}
                </p>

                <p>
                  <b>State:</b>{" "}
                  {camera.state || "Unknown"}
                </p>

                <p>
                  <b>Type:</b>{" "}
                  {camera.camera_type}
                </p>

                <p>
                  <b>Distance from route:</b>{" "}
                  {Math.round(
                    camera.distance_from_route
                  )} m
                </p>

              </Popup>
            </Marker>
          ))}


          {routeCoordinates.length > 0 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#2563eb",
                weight: 5,
              }}
            />
          )}

        </MapContainer>

      </div>


      <div className="route-camera-list">

        <h2>
          📷 Cameras on Route
        </h2>

        {routeCameras.length === 0 ? (

          <p>
            No cameras detected on this route yet.
          </p>

        ) : (

          routeCameras.map((camera, index) => (

            <div
              className="route-camera-card"
              key={camera.id}
            >

              <div className="camera-number">
                {index + 1}
              </div>

              <div>

                <h3>
                  {camera.camera_type}
                </h3>

                <p>
                  {camera.city},{" "}
                  {camera.state}
                </p>

                <p>
                  📍{" "}
                  {Math.round(
                    camera.distance_from_route
                  )} m from route
                </p>

              </div>

            </div>

          ))

        )}

      </div>

    </div>
  );
}

export default RoutePlanner;