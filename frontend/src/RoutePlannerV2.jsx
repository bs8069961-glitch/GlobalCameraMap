import { useState } from "react";


// ============================================================
// CONFIGURATION
// ============================================================

const ROUTE_SERVICE_URL =
  "https://router.project-osrm.org/route/v1/driving/";

const NOMINATIM_URL =
  "https://nominatim.openstreetmap.org/search";


// ============================================================
// GEOCODING
// ============================================================

async function geocodeLocation(query) {
  const trimmed = String(query || "").trim();

  if (!trimmed) {
    throw new Error("Please enter a location.");
  }

  const url =
    `${NOMINATIM_URL}` +
    `?format=jsonv2` +
    `&limit=1` +
    `&q=${encodeURIComponent(trimmed)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      "Location search failed. Please try again."
    );
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      `Could not find location: ${trimmed}`
    );
  }

  const latitude = Number(data[0]?.lat);
  const longitude = Number(data[0]?.lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(
      `Invalid coordinates for: ${trimmed}`
    );
  }

  return {
    latitude,
    longitude,
    displayName:
      data[0]?.display_name || trimmed,
  };
}


// ============================================================
// FORMAT DISTANCE
// ============================================================

function formatDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "—";
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}


// ============================================================
// FORMAT DURATION
// ============================================================

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "—";
  }

  const totalMinutes = Math.round(seconds / 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    if (minutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${minutes} min`;
  }

  return `${minutes} min`;
}


// ============================================================
// ROUTE PLANNER V2
// ============================================================

function RoutePlannerV2({
  onRouteCalculated,
  onRouteCleared,
  routeCameraCount = 0,
  routeCameraRadiusKm = 1,
}) {
  const [startLocation, setStartLocation] =
    useState("");

  const [destination, setDestination] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [routeSummary, setRouteSummary] =
    useState(null);


  // ==========================================================
  // SWAP LOCATIONS
  // ==========================================================

  function swapLocations() {
    setStartLocation(destination);
    setDestination(startLocation);
    setError("");
  }


  // ==========================================================
  // CALCULATE ROUTE
  // ==========================================================

  async function calculateRoute() {
    if (loading) {
      return;
    }

    try {
      setError("");
      setRouteSummary(null);

      if (!startLocation.trim()) {
        setError(
          "Please enter a starting location."
        );

        return;
      }

      if (!destination.trim()) {
        setError(
          "Please enter a destination."
        );

        return;
      }

      setLoading(true);

      // ------------------------------------------------------
      // GEOCODE START
      // ------------------------------------------------------

      const start =
        await geocodeLocation(
          startLocation
        );

      // ------------------------------------------------------
      // GEOCODE DESTINATION
      // ------------------------------------------------------

      const end =
        await geocodeLocation(
          destination
        );

      // ------------------------------------------------------
      // BUILD OSRM URL
      // ------------------------------------------------------

      const routeUrl =
        ROUTE_SERVICE_URL +
        `${start.longitude},${start.latitude};` +
        `${end.longitude},${end.latitude}` +
        "?overview=full" +
        "&geometries=geojson" +
        "&steps=true";

      // ------------------------------------------------------
      // REQUEST ROUTE
      // ------------------------------------------------------

      const response =
        await fetch(routeUrl);

      if (!response.ok) {
        throw new Error(
          "Route service failed. Please try again."
        );
      }

      const data =
        await response.json();

      if (
        data?.code !== "Ok" ||
        !Array.isArray(data?.routes) ||
        data.routes.length === 0
      ) {
        throw new Error(
          "No driving route was found between these locations."
        );
      }

      const selectedRoute =
        data.routes[0];

      // ------------------------------------------------------
      // ROUTE GEOMETRY
      // ------------------------------------------------------

      const coordinates =
        selectedRoute?.geometry?.coordinates ||
        [];

      const leafletRoute =
        coordinates
          .map(
            ([longitude, latitude]) => [
              Number(latitude),
              Number(longitude),
            ]
          )
          .filter(
            ([latitude, longitude]) =>
              Number.isFinite(latitude) &&
              Number.isFinite(longitude)
          );

      if (leafletRoute.length < 2) {
        throw new Error(
          "The routing service returned no usable route."
        );
      }

      // ------------------------------------------------------
      // SUMMARY
      // ------------------------------------------------------

      const distance =
        Number(
          selectedRoute?.distance
        ) || 0;

      const duration =
        Number(
          selectedRoute?.duration
        ) || 0;

      const summary = {
        distance,
        duration,

        distanceText:
          formatDistance(distance),

        durationText:
          formatDuration(duration),

        start: {
          latitude: start.latitude,
          longitude: start.longitude,
          displayName: start.displayName,
        },

        destination: {
          latitude: end.latitude,
          longitude: end.longitude,
          displayName: end.displayName,
        },

        cameraCount:
          routeCameraCount,

        radiusKm:
          routeCameraRadiusKm,
      };

      setRouteSummary(summary);

      // ------------------------------------------------------
      // SEND DATA TO CAMERA MAP
      // ------------------------------------------------------

      if (
        typeof onRouteCalculated ===
        "function"
      ) {
        onRouteCalculated({
          route: leafletRoute,

          summary,

          start,

          destination: end,

          rawRoute: selectedRoute,
        });
      }
    } catch (err) {
      console.error(
        "Route calculation failed:",
        err
      );

      setRouteSummary(null);

      setError(
        err?.message ||
          "Unable to calculate route."
      );

      if (
        typeof onRouteCalculated ===
        "function"
      ) {
        onRouteCalculated(null);
      }
    } finally {
      setLoading(false);
    }
  }


  // ==========================================================
  // CLEAR ROUTE
  // ==========================================================

  function clearRoute() {
    setRouteSummary(null);
    setError("");

    if (
      typeof onRouteCleared ===
      "function"
    ) {
      onRouteCleared();
    }
  }


  // ==========================================================
  // KEYBOARD HANDLER
  // ==========================================================

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      calculateRoute();
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="route-section">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="route-header">

        <div>
          <h2>
            Route Camera Search
          </h2>

          <p>
            Find traffic cameras within{" "}
            <strong>
              {routeCameraRadiusKm} km
            </strong>{" "}
            of your driving route.
          </p>
        </div>

      </div>


      {/* ======================================================
          INPUT CONTROLS
      ====================================================== */}

      <div className="route-controls">

        <div className="route-input-group">

          <label htmlFor="route-start">
            Starting Location
          </label>

          <input
            id="route-start"
            type="text"
            value={startLocation}
            onChange={(event) =>
              setStartLocation(
                event.target.value
              )
            }
            onKeyDown={handleKeyDown}
            placeholder="e.g. Chandigarh"
            disabled={loading}
            autoComplete="off"
          />

        </div>


        {/* ====================================================
            SWAP
        ==================================================== */}

        <button
          type="button"
          className="route-swap-button"
          onClick={swapLocations}
          disabled={
            loading ||
            (!startLocation &&
              !destination)
          }
          title="Swap locations"
          aria-label="Swap starting location and destination"
        >
          ⇄
        </button>


        <div className="route-input-group">

          <label htmlFor="route-destination">
            Destination
          </label>

          <input
            id="route-destination"
            type="text"
            value={destination}
            onChange={(event) =>
              setDestination(
                event.target.value
              )
            }
            onKeyDown={handleKeyDown}
            placeholder="e.g. New Delhi"
            disabled={loading}
            autoComplete="off"
          />

        </div>


        {/* ====================================================
            CALCULATE
        ==================================================== */}

        <button
          type="button"
          className="route-calculate-button"
          onClick={calculateRoute}
          disabled={loading}
        >
          {loading
            ? "Calculating..."
            : "Calculate Route"}
        </button>


        {/* ====================================================
            CLEAR
        ==================================================== */}

        {routeSummary && (
          <button
            type="button"
            className="route-clear-button"
            onClick={clearRoute}
            disabled={loading}
          >
            Clear Route
          </button>
        )}

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="route-error">
          <strong>
            Route Error:
          </strong>{" "}
          {error}
        </div>
      )}


      {/* ======================================================
          ROUTE SUMMARY
      ====================================================== */}

      {routeSummary && (
        <div className="route-summary">

          {/* ==================================================
              DISTANCE
          ================================================== */}

          <div className="route-summary-card">

            <span className="route-summary-label">
              Route Distance
            </span>

            <strong className="route-summary-value">
              {
                routeSummary.distanceText
              }
            </strong>

          </div>


          {/* ==================================================
              DRIVE TIME
          ================================================== */}

          <div className="route-summary-card">

            <span className="route-summary-label">
              Estimated Drive Time
            </span>

            <strong className="route-summary-value">
              {
                routeSummary.durationText
              }
            </strong>

          </div>


          {/* ==================================================
              CAMERAS
          ================================================== */}

          <div className="route-summary-card">

            <span className="route-summary-label">
              Cameras Within{" "}
              {routeCameraRadiusKm} km
            </span>

            <strong className="route-summary-value">
              {routeCameraCount}
            </strong>

          </div>


          {/* ==================================================
              SEARCH RADIUS
          ================================================== */}

          <div className="route-summary-card">

            <span className="route-summary-label">
              Search Radius
            </span>

            <strong className="route-summary-value">
              {routeCameraRadiusKm} km
            </strong>

          </div>

        </div>
      )}


      {/* ======================================================
          ROUTE LOCATIONS
      ====================================================== */}

      {routeSummary && (
        <div className="route-location-summary">

          <div className="route-location">

            <span className="route-location-icon">
              📍
            </span>

            <div>
              <span className="route-location-label">
                Start
              </span>

              <strong>
                {
                  routeSummary.start
                    ?.displayName ||
                  startLocation
                }
              </strong>
            </div>

          </div>


          <div className="route-location-arrow">
            →
          </div>


          <div className="route-location">

            <span className="route-location-icon">
              🏁
            </span>

            <div>
              <span className="route-location-label">
                Destination
              </span>

              <strong>
                {
                  routeSummary
                    .destination
                    ?.displayName ||
                  destination
                }
              </strong>
            </div>

          </div>

        </div>
      )}

    </section>
  );
}


// ============================================================
// EXPORT
// ============================================================

export default RoutePlannerV2;