import {
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
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";


// ============================================================
// CONFIGURATION
// ============================================================

const API_URL =
  "http://127.0.0.1:8000";

const NOMINATIM_URL =
  "https://nominatim.openstreetmap.org/search";

const OSRM_URL =
  "https://router.project-osrm.org/route/v1/driving";

const ROUTE_CAMERA_RADIUS_METERS = 1000;

const DEFAULT_CENTER = [
  22.9734,
  78.6569,
];

const DEFAULT_ZOOM = 5;


// ============================================================
// NORMALIZATION HELPERS
// ============================================================

function normalizeValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


function normalizeLower(value) {
  return normalizeValue(value).toLowerCase();
}


function getCameraType(camera) {
  const value =
    camera?.camera_type ??
    camera?.type ??
    camera?.cameraType ??
    "Traffic Camera";

  return normalizeValue(value) ||
    "Traffic Camera";
}


function getCameraStatus(camera) {
  const value =
    camera?.status ??
    "Unknown";

  return (
    normalizeValue(value) ||
    "Unknown"
  );
}


function getCameraVerification(camera) {
  const value =
    camera?.verification_status ??
    camera?.verification ??
    "Pending";

  return (
    normalizeValue(value) ||
    "Pending"
  );
}


// ============================================================
// FORMATTERS
// ============================================================

function formatDistance(meters) {
  const value = Number(meters);

  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value < 1000) {
    return `${Math.round(value)} m`;
  }

  return `${(
    value / 1000
  ).toFixed(1)} km`;
}


function formatRouteDistance(meters) {
  return formatDistance(meters);
}


function formatRouteDuration(seconds) {
  const value = Number(seconds);

  if (!Number.isFinite(value)) {
    return "—";
  }

  const totalMinutes =
    Math.round(value / 60);

  const hours =
    Math.floor(totalMinutes / 60);

  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    if (minutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${minutes} min`;
  }

  return `${minutes} min`;
}


// ============================================================
// CAMERA ICONS
// ============================================================

function createCameraIcon(
  type,
  className
) {
  return L.divIcon({
    className:
      "custom-camera-marker",
    html: `
      <div class="${className}">
        <span>●</span>
      </div>
    `,
    iconSize: [
      28,
      28,
    ],
    iconAnchor: [
      14,
      14,
    ],
    popupAnchor: [
      0,
      -14,
    ],
  });
}


const speedIcon =
  createCameraIcon(
    "speed",
    "camera-marker camera-marker-speed"
  );


const redLightIcon =
  createCameraIcon(
    "red-light",
    "camera-marker camera-marker-red"
  );


const trafficIcon =
  createCameraIcon(
    "traffic",
    "camera-marker camera-marker-traffic"
  );


function getCameraIcon(camera) {
  const type =
    normalizeLower(
      getCameraType(camera)
    );

  if (
    type.includes("speed")
  ) {
    return speedIcon;
  }

  if (
    type.includes("red") ||
    type.includes("signal")
  ) {
    return redLightIcon;
  }

  return trafficIcon;
}


// ============================================================
// DISTANCE BETWEEN TWO POINTS
// ============================================================

function distanceBetweenPoints(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const earthRadius = 6371000;

  const lat1 =
    (latitude1 * Math.PI) / 180;

  const lat2 =
    (latitude2 * Math.PI) / 180;

  const deltaLat =
    ((latitude2 - latitude1) *
      Math.PI) /
    180;

  const deltaLon =
    ((longitude2 - longitude1) *
      Math.PI) /
    180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


// ============================================================
// DISTANCE FROM POINT TO ROUTE
// ============================================================

function distancePointToSegment(
  point,
  segmentStart,
  segmentEnd
) {
  const [pointLat, pointLon] =
    point;

  const [startLat, startLon] =
    segmentStart;

  const [endLat, endLon] =
    segmentEnd;

  const averageLatitude =
    (
      pointLat +
      startLat +
      endLat
    ) /
    3;

  const latitudeScale =
    111320;

  const longitudeScale =
    111320 *
    Math.cos(
      (averageLatitude *
        Math.PI) /
        180
    );

  const px =
    pointLon *
    longitudeScale;

  const py =
    pointLat *
    latitudeScale;

  const ax =
    startLon *
    longitudeScale;

  const ay =
    startLat *
    latitudeScale;

  const bx =
    endLon *
    longitudeScale;

  const by =
    endLat *
    latitudeScale;

  const dx =
    bx - ax;

  const dy =
    by - ay;

  if (
    dx === 0 &&
    dy === 0
  ) {
    return distanceBetweenPoints(
      pointLat,
      pointLon,
      startLat,
      startLon
    );
  }

  const t =
    Math.max(
      0,
      Math.min(
        1,
        ((px - ax) * dx +
          (py - ay) * dy) /
          (dx * dx + dy * dy)
      )
    );

  const closestX =
    ax + t * dx;

  const closestY =
    ay + t * dy;

  const closestLon =
    closestX /
    longitudeScale;

  const closestLat =
    closestY /
    latitudeScale;

  return distanceBetweenPoints(
    pointLat,
    pointLon,
    closestLat,
    closestLon
  );
}


function distanceCameraToRoute(
  camera,
  route
) {
  const latitude =
    Number(camera?.latitude);

  const longitude =
    Number(camera?.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return Infinity;
  }

  if (
    !Array.isArray(route) ||
    route.length < 2
  ) {
    return Infinity;
  }

  const point = [
    latitude,
    longitude,
  ];

  let minimumDistance =
    Infinity;

  for (
    let index = 0;
    index <
    route.length - 1;
    index += 1
  ) {
    const distance =
      distancePointToSegment(
        point,
        route[index],
        route[index + 1]
      );

    if (
      distance <
      minimumDistance
    ) {
      minimumDistance =
        distance;
    }
  }

  return minimumDistance;
}


// ============================================================
// MAP CONTROLLER
// ============================================================

function MapController({
  cameras,
  route,
}) {
  const map =
    useMap();

  useEffect(() => {
    if (
      Array.isArray(route) &&
      route.length >= 2
    ) {
      const bounds =
        L.latLngBounds(route);

      map.fitBounds(
        bounds,
        {
          padding: [
            50,
            50,
          ],
        }
      );

      return;
    }

    if (
      Array.isArray(cameras) &&
      cameras.length > 0
    ) {
      const validCoordinates =
        cameras
          .map((camera) => {
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

            return [
              latitude,
              longitude,
            ];
          })
          .filter(Boolean);

      if (
        validCoordinates.length === 0
      ) {
        return;
      }

      const bounds =
        L.latLngBounds(
          validCoordinates
        );

      map.fitBounds(
        bounds,
        {
          padding: [
            40,
            40,
          ],
          maxZoom: 12,
        }
      );
    }
  }, [
    cameras,
    route,
    map,
  ]);

  return null;
}


// ============================================================
// MAIN COMPONENT
// ============================================================

function CameraMap() {

  // ==========================================================
  // CAMERA STATE
  // ==========================================================

  const [
    cameras,
    setCameras,
  ] = useState([]);

  const [
    pendingReports,
    setPendingReports,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  // ==========================================================
  // FILTER STATE
  // ==========================================================

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedState,
    setSelectedState,
  ] = useState(
    "All States"
  );

  const [
    selectedType,
    setSelectedType,
  ] = useState(
    "All Camera Types"
  );

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState(
    "All Status"
  );

  const [
    selectedVerification,
    setSelectedVerification,
  ] = useState(
    "All Verification"
  );


  // ==========================================================
  // ROUTE PLANNER STATE
  //
  // This replaces the old collection of:
  //
  // routeStart
  // routeEnd
  // routeLoading
  // routeError
  // routeDistance
  // routeDuration
  // route
  //
  // ==========================================================

  const [
    routePlanner,
    setRoutePlanner,
  ] = useState({
    startLocation: "",
    destination: "",
    route: [],
    loading: false,
    error: "",
    summary: null,
  });


  // ==========================================================
  // LOAD CAMERAS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadCameras() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `${API_URL}/api/cameras`
          );

        if (!response.ok) {
          throw new Error(
            `Camera API returned ${response.status}`
          );
        }

        const data =
          await response.json();

        if (
          !Array.isArray(data)
        ) {
          throw new Error(
            "Camera API returned an invalid response."
          );
        }

        if (!cancelled) {
          setCameras(data);
        }
      } catch (err) {
        console.error(
          "Failed to load cameras:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
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


  // ==========================================================
  // LOAD PENDING REPORTS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadPendingReports() {
      try {
        const response =
          await fetch(
            `${API_URL}/api/reports/pending`
          );

        if (!response.ok) {
          throw new Error(
            `Pending reports API returned ${response.status}`
          );
        }

        const data =
          await response.json();

        let reports = [];

        if (
          Array.isArray(data)
        ) {
          reports = data;
        } else if (
          Array.isArray(
            data?.reports
          )
        ) {
          reports =
            data.reports;
        }

        if (!cancelled) {
          setPendingReports(
            reports
          );
        }
      } catch (err) {
        console.error(
          "Failed to load pending reports:",
          err
        );

        if (!cancelled) {
          setPendingReports([]);
        }
      }
    }

    loadPendingReports();

    return () => {
      cancelled = true;
    };
  }, []);


  // ==========================================================
  // STATES
  // ==========================================================

  const states =
    useMemo(() => {
      const values =
        cameras
          .map((camera) =>
            normalizeValue(
              camera?.state
            )
          )
          .filter(Boolean);

      return [
        "All States",
        ...Array.from(
          new Set(values)
        ).sort(),
      ];
    }, [
      cameras,
    ]);


  // ==========================================================
  // CAMERA TYPES
  // ==========================================================

  const cameraTypes =
    useMemo(() => {
      const values =
        cameras
          .map((camera) =>
            getCameraType(camera)
          )
          .filter(Boolean);

      return [
        "All Camera Types",
        ...Array.from(
          new Set(values)
        ).sort(),
      ];
    }, [
      cameras,
    ]);


  // ==========================================================
  // FILTERED CAMERAS
  // ==========================================================

  const filteredCameras =
    useMemo(() => {
      const searchValue =
        normalizeLower(search);

      return cameras.filter(
        (camera) => {

          const cameraState =
            normalizeValue(
              camera?.state
            ) ||
            "Unknown";

          const cameraType =
            getCameraType(
              camera
            );

          const cameraStatus =
            getCameraStatus(
              camera
            );

          const cameraVerification =
            getCameraVerification(
              camera
            );

          const searchableText =
            [
              camera?.id,
              camera?.city,
              camera?.state,
              camera?.road_name,
              camera?.camera_type,
              camera?.type,
              camera?.enforcement_type,
              camera?.source,
              camera?.country,
            ]
              .map(
                normalizeLower
              )
              .join(" ");

          const matchesSearch =
            !searchValue ||
            searchableText.includes(
              searchValue
            );

          const matchesState =
            selectedState ===
              "All States" ||
            cameraState ===
              selectedState;

          const matchesType =
            selectedType ===
              "All Camera Types" ||
            cameraType ===
              selectedType;

          const matchesStatus =
            selectedStatus ===
              "All Status" ||
            normalizeLower(
              cameraStatus
            ) ===
              normalizeLower(
                selectedStatus
              );

          const matchesVerification =
            selectedVerification ===
              "All Verification" ||
            normalizeLower(
              cameraVerification
            ) ===
              normalizeLower(
                selectedVerification
              );

          return (
            matchesSearch &&
            matchesState &&
            matchesType &&
            matchesStatus &&
            matchesVerification
          );
        }
      );
    }, [
      cameras,
      search,
      selectedState,
      selectedType,
      selectedStatus,
      selectedVerification,
    ]);


  // ==========================================================
  // STATISTICS
  // ==========================================================

  const statistics =
    useMemo(() => {

      const total =
        cameras.length;

      const active =
        cameras.filter(
          (camera) =>
            normalizeLower(
              getCameraStatus(
                camera
              )
            ) === "active"
        ).length;

      const verified =
        cameras.filter(
          (camera) =>
            normalizeLower(
              getCameraVerification(
                camera
              )
            ) === "verified"
        ).length;

      const pendingVerification =
        cameras.filter(
          (camera) =>
            normalizeLower(
              getCameraVerification(
                camera
              )
            ) === "pending"
        ).length;

      const cities =
        new Set(
          cameras
            .map((camera) =>
              normalizeValue(
                camera?.city
              )
            )
            .filter(Boolean)
        ).size;

      return {
        total,
        active,
        verified,
        pendingVerification,
        cities,
      };
    }, [
      cameras,
    ]);


  // ==========================================================
  // TYPE BREAKDOWN
  // ==========================================================

  const typeBreakdown =
    useMemo(() => {
      const counts = {};

      cameras.forEach(
        (camera) => {
          const type =
            getCameraType(
              camera
            );

          counts[type] =
            (counts[type] || 0) +
            1;
        }
      );

      return Object.entries(
        counts
      ).sort(
        (a, b) =>
          b[1] - a[1]
      );
    }, [
      cameras,
    ]);


  // ==========================================================
  // STATE BREAKDOWN
  // ==========================================================

  const stateBreakdown =
    useMemo(() => {
      const counts = {};

      cameras.forEach(
        (camera) => {
          const state =
            normalizeValue(
              camera?.state
            ) ||
            "Unknown";

          counts[state] =
            (counts[state] || 0) +
            1;
        }
      );

      return Object.entries(
        counts
      ).sort(
        (a, b) =>
          b[1] - a[1]
      );
    }, [
      cameras,
    ]);


  // ==========================================================
  // ROUTE CAMERAS
  // ==========================================================

  const routeCameras =
    useMemo(() => {

      const route =
        routePlanner.route;

      if (
        !Array.isArray(route) ||
        route.length < 2
      ) {
        return [];
      }

      return cameras
        .map((camera) => {

          const distance =
            distanceCameraToRoute(
              camera,
              route
            );

          return {
            ...camera,
            routeDistance:
              distance,
          };
        })
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

    }, [
      cameras,
      routePlanner.route,
    ]);


  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  function resetFilters() {
    setSearch("");
    setSelectedState(
      "All States"
    );
    setSelectedType(
      "All Camera Types"
    );
    setSelectedStatus(
      "All Status"
    );
    setSelectedVerification(
      "All Verification"
    );
  }


  // ==========================================================
  // UPDATE ROUTE STATE
  // ==========================================================

  function updateRoutePlanner(
    changes
  ) {
    setRoutePlanner(
      (current) => ({
        ...current,
        ...changes,
      })
    );
  }


  // ==========================================================
  // GEOCODE LOCATION
  // ==========================================================

  async function geocodeLocation(
    query
  ) {
    const trimmed =
      normalizeValue(query);

    if (!trimmed) {
      throw new Error(
        "Please enter a location."
      );
    }

    const url =
      `${NOMINATIM_URL}` +
      `?format=jsonv2` +
      `&limit=1` +
      `&countrycodes=in` +
      `&q=${encodeURIComponent(
        trimmed
      )}`;

    const response =
      await fetch(
        url,
        {
          headers: {
            Accept:
              "application/json",
            "Accept-Language":
              "en",
          },
        }
      );

    if (!response.ok) {
      throw new Error(
        "Location search failed. Please try again."
      );
    }

    const data =
      await response.json();

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {
      throw new Error(
        `Could not find location: ${trimmed}`
      );
    }

    const latitude =
      Number(
        data[0]?.lat
      );

    const longitude =
      Number(
        data[0]?.lon
      );

    if (
      !Number.isFinite(
        latitude
      ) ||
      !Number.isFinite(
        longitude
      )
    ) {
      throw new Error(
        `Invalid coordinates for: ${trimmed}`
      );
    }

    return {
      latitude,
      longitude,
      displayName:
        data[0]?.display_name ||
        trimmed,
    };
  }


  // ==========================================================
  // CALCULATE ROUTE
  // ==========================================================

  async function calculateRoute() {

    if (
      routePlanner.loading
    ) {
      return;
    }

    const startLocation =
      routePlanner.startLocation;

    const destination =
      routePlanner.destination;

    if (
      !normalizeValue(
        startLocation
      )
    ) {
      updateRoutePlanner({
        error:
          "Please enter a starting location.",
      });

      return;
    }

    if (
      !normalizeValue(
        destination
      )
    ) {
      updateRoutePlanner({
        error:
          "Please enter a destination.",
      });

      return;
    }

    if (
      normalizeLower(
        startLocation
      ) ===
      normalizeLower(
        destination
      )
    ) {
      updateRoutePlanner({
        error:
          "Starting location and destination cannot be the same.",
      });

      return;
    }

    updateRoutePlanner({
      loading: true,
      error: "",
      summary: null,
      route: [],
    });

    try {

      // --------------------------------------------------------
      // GEOCODE START
      // --------------------------------------------------------

      const start =
        await geocodeLocation(
          startLocation
        );


      // --------------------------------------------------------
      // GEOCODE DESTINATION
      // --------------------------------------------------------

      const end =
        await geocodeLocation(
          destination
        );


      // --------------------------------------------------------
      // BUILD OSRM URL
      // --------------------------------------------------------

      const routeUrl =
        `${OSRM_URL}/` +
        `${start.longitude},${start.latitude};` +
        `${end.longitude},${end.latitude}` +
        `?overview=full` +
        `&geometries=geojson` +
        `&steps=true`;


      // --------------------------------------------------------
      // REQUEST ROUTE
      // --------------------------------------------------------

      const response =
        await fetch(
          routeUrl
        );

      if (!response.ok) {
        throw new Error(
          "Route service failed. Please try again."
        );
      }

      const data =
        await response.json();


      if (
        data?.code !== "Ok" ||
        !Array.isArray(
          data?.routes
        ) ||
        data.routes.length === 0
      ) {
        throw new Error(
          "No driving route was found between these locations."
        );
      }


      // --------------------------------------------------------
      // SELECT ROUTE
      // --------------------------------------------------------

      const selectedRoute =
        data.routes[0];


      // --------------------------------------------------------
      // CONVERT GEOJSON TO LEAFLET
      // --------------------------------------------------------

      const coordinates =
        selectedRoute
          ?.geometry
          ?.coordinates || [];

      const leafletRoute =
        coordinates
          .map(
            (
              [
                longitude,
                latitude,
              ]
            ) => [
              Number(latitude),
              Number(longitude),
            ]
          )
          .filter(
            (
              [
                latitude,
                longitude,
              ]
            ) =>
              Number.isFinite(
                latitude
              ) &&
              Number.isFinite(
                longitude
              )
          );


      if (
        leafletRoute.length < 2
      ) {
        throw new Error(
          "The routing service returned no usable route."
        );
      }


      // --------------------------------------------------------
      // ROUTE SUMMARY
      // --------------------------------------------------------

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
          formatRouteDistance(
            distance
          ),

        durationText:
          formatRouteDuration(
            duration
          ),

        start: {
          latitude:
            start.latitude,

          longitude:
            start.longitude,

          displayName:
            start.displayName,
        },

        destination: {
          latitude:
            end.latitude,

          longitude:
            end.longitude,

          displayName:
            end.displayName,
        },

        radiusKm:
          ROUTE_CAMERA_RADIUS_METERS /
          1000,
      };


      // --------------------------------------------------------
      // SAVE ROUTE
      // --------------------------------------------------------

      updateRoutePlanner({
        route:
          leafletRoute,

        loading:
          false,

        error:
          "",

        summary,
      });

    } catch (err) {

      console.error(
        "Route calculation failed:",
        err
      );

      updateRoutePlanner({
        route: [],
        loading: false,
        summary: null,

        error:
          err?.message ||
          "Unable to calculate route.",
      });
    }
  }


  // ==========================================================
  // CLEAR ROUTE
  // ==========================================================

  function clearRoute() {
    setRoutePlanner({
      startLocation: "",
      destination: "",
      route: [],
      loading: false,
      error: "",
      summary: null,
    });
  }


  // ==========================================================
  // SWAP ROUTE LOCATIONS
  // ==========================================================

  function swapRouteLocations() {
    setRoutePlanner(
      (current) => ({
        ...current,

        startLocation:
          current.destination,

        destination:
          current.startLocation,

        error: "",
      })
    );
  }


  // ==========================================================
  // ROUTE ENTER KEY
  // ==========================================================

  function handleRouteKeyDown(
    event
  ) {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();

    calculateRoute();
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="camera-map-container">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="dashboard-header">

        <div>

          <h1>
            Global Camera Map
          </h1>

          <p>
            Traffic enforcement
            camera database
          </p>

        </div>

      </header>


      {/* ==================================================
          STATISTICS
      ================================================== */}

      <section className="stats-grid">

        <div className="stat-card">

          <div className="stat-value">
            {statistics.total}
          </div>

          <div className="stat-label">
            Total Cameras
          </div>

        </div>


        <div className="stat-card">

          <div className="stat-value">
            {statistics.active}
          </div>

          <div className="stat-label">
            Active
          </div>

        </div>


        <div className="stat-card">

          <div className="stat-value">
            {statistics.verified}
          </div>

          <div className="stat-label">
            Verified
          </div>

        </div>


        <div className="stat-card">

          <div className="stat-value">
            {
              statistics.pendingVerification
            }
          </div>

          <div className="stat-label">
            Pending Verification
          </div>

        </div>


        <div className="stat-card">

          <div className="stat-value">
            {statistics.cities}
          </div>

          <div className="stat-label">
            Cities
          </div>

        </div>


        <div className="stat-card">

          <div className="stat-value">
            {pendingReports.length}
          </div>

          <div className="stat-label">
            Pending Reports
          </div>

        </div>

      </section>


      {/* ==================================================
          SEARCH & FILTERS
      ================================================== */}

      <section className="filter-section">

        <h2>
          Camera Search &amp; Filters
        </h2>

        <div className="camera-count">

          Showing{" "}

          <strong>
            {filteredCameras.length}
          </strong>

          {" "}of{" "}

          <strong>
            {cameras.length}
          </strong>

        </div>


        <div className="filter-grid">

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search cameras, cities, roads..."
            className="search-input"
          />


          <select
            value={
              selectedState
            }
            onChange={(event) =>
              setSelectedState(
                event.target.value
              )
            }
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


          <select
            value={
              selectedType
            }
            onChange={(event) =>
              setSelectedType(
                event.target.value
              )
            }
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


          <select
            value={
              selectedStatus
            }
            onChange={(event) =>
              setSelectedStatus(
                event.target.value
              )
            }
          >

            <option value="All Status">
              All Status
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Inactive">
              Inactive
            </option>

            <option value="Unknown">
              Unknown
            </option>

          </select>


          <select
            value={
              selectedVerification
            }
            onChange={(event) =>
              setSelectedVerification(
                event.target.value
              )
            }
          >

            <option value="All Verification">
              All Verification
            </option>

            <option value="Verified">
              Verified
            </option>

            <option value="Pending">
              Pending
            </option>

          </select>


          <button
            type="button"
            onClick={
              resetFilters
            }
          >
            Reset
          </button>

        </div>

      </section>


      {/* ==================================================
          ROUTE PLANNER
      ================================================== */}

      <section className="route-section">

        <div className="route-header">

          <div>

            <h2>
              Route Camera Search
            </h2>

            <p>
              Find traffic cameras
              within{" "}

              <strong>
                {
                  ROUTE_CAMERA_RADIUS_METERS /
                  1000
                }{" "}
                km
              </strong>

              {" "}of your driving
              route.
            </p>

          </div>

        </div>


        {/* ==================================================
            ROUTE INPUTS
        ================================================== */}

        <div className="route-controls">

          <div className="route-input-group">

            <label
              htmlFor="route-start"
            >
              Starting Location
            </label>

            <input
              id="route-start"
              type="text"
              value={
                routePlanner.startLocation
              }
              onChange={(event) =>
                updateRoutePlanner({
                  startLocation:
                    event.target.value,
                  error: "",
                })
              }
              onKeyDown={
                handleRouteKeyDown
              }
              placeholder="e.g. Chandigarh"
              disabled={
                routePlanner.loading
              }
              autoComplete="off"
            />

          </div>


          <button
            type="button"
            className="route-swap-button"
            onClick={
              swapRouteLocations
            }
            disabled={
              routePlanner.loading ||
              (
                !routePlanner.startLocation &&
                !routePlanner.destination
              )
            }
            title="Swap locations"
            aria-label="Swap starting location and destination"
          >
            ⇄
          </button>


          <div className="route-input-group">

            <label
              htmlFor="route-destination"
            >
              Destination
            </label>

            <input
              id="route-destination"
              type="text"
              value={
                routePlanner.destination
              }
              onChange={(event) =>
                updateRoutePlanner({
                  destination:
                    event.target.value,
                  error: "",
                })
              }
              onKeyDown={
                handleRouteKeyDown
              }
              placeholder="e.g. New Delhi"
              disabled={
                routePlanner.loading
              }
              autoComplete="off"
            />

          </div>


          <button
            type="button"
            className="route-calculate-button"
            onClick={
              calculateRoute
            }
            disabled={
              routePlanner.loading
            }
          >
            {
              routePlanner.loading
                ? "Calculating..."
                : "Calculate Route"
            }
          </button>


          {routePlanner.route.length >
            0 && (
              <button
                type="button"
                className="route-clear-button"
                onClick={
                  clearRoute
                }
                disabled={
                  routePlanner.loading
                }
              >
                Clear Route
              </button>
            )}

        </div>


        {/* ==================================================
            ROUTE ERROR
        ================================================== */}

        {routePlanner.error && (
          <div className="route-error">

            <strong>
              Route Error:
            </strong>{" "}

            {
              routePlanner.error
            }

          </div>
        )}


        {/* ==================================================
            ROUTE SUMMARY
        ================================================== */}

        {routePlanner.route.length >=
          2 && (
          <div className="route-summary">

            <div className="route-summary-card">

              <span>
                Route Distance
              </span>

              <strong>
                {
                  routePlanner.summary
                    ?.distanceText ||
                  formatRouteDistance(
                    routePlanner.summary
                      ?.distance
                  )
                }
              </strong>

            </div>


            <div className="route-summary-card">

              <span>
                Estimated Drive Time
              </span>

              <strong>
                {
                  routePlanner.summary
                    ?.durationText ||
                  formatRouteDuration(
                    routePlanner.summary
                      ?.duration
                  )
                }
              </strong>

            </div>


            <div className="route-summary-card">

              <span>
                Cameras Within 1 km
              </span>

              <strong>
                {
                  routeCameras.length
                }
              </strong>

            </div>


            <div className="route-summary-card">

              <span>
                Search Radius
              </span>

              <strong>
                1 km
              </strong>

            </div>

          </div>
        )}


        {/* ==================================================
            ROUTE LOCATIONS
        ================================================== */}

        {routePlanner.summary && (
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
                    routePlanner.summary
                      ?.start
                      ?.displayName ||
                    routePlanner.startLocation
                  }
                </strong>

              </div>

            </div>


            <div className="route-location-arrow">
              →
            </div>


            <div className="route-location">

              <span className="route-location-icon">
                📍
              </span>

              <div>

                <span className="route-location-label">
                  Destination
                </span>

                <strong>
                  {
                    routePlanner.summary
                      ?.destination
                      ?.displayName ||
                    routePlanner.destination
                  }
                </strong>

              </div>

            </div>

          </div>
        )}

      </section>


      {/* ==================================================
          MAP
      ================================================== */}

      <section className="map-section">

        {loading && (
          <div className="map-loading">
            Loading cameras...
          </div>
        )}


        {error && (
          <div className="map-error">

            <strong>
              Failed to load cameras
            </strong>

            <div>
              {error}
            </div>

          </div>
        )}


        <MapContainer
          center={
            DEFAULT_CENTER
          }
          zoom={
            DEFAULT_ZOOM
          }
          scrollWheelZoom={
            true
          }
          className="camera-map"
        >

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />


          <MapController
            cameras={
              filteredCameras
            }
            route={
              routePlanner.route
            }
          />


          {/* ==================================================
              ROUTE POLYLINE
          ================================================== */}

          {routePlanner.route.length >=
            2 && (
            <Polyline
              positions={
                routePlanner.route
              }
              pathOptions={{
                weight: 5,
              }}
            />
          )}


          {/* ==================================================
              CAMERA MARKERS
          ================================================== */}

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

              const cameraId =
                camera?.id ??
                `${latitude}-${longitude}`;


              return (
                <Marker
                  key={
                    cameraId
                  }
                  position={[
                    latitude,
                    longitude,
                  ]}
                  icon={
                    getCameraIcon(
                      camera
                    )
                  }
                >

                  <Popup>

                    <div className="camera-popup">

                      <h3>
                        {
                          getCameraType(
                            camera
                          )
                        }
                      </h3>


                      <p>
                        <strong>
                          Camera ID:
                        </strong>{" "}

                        {
                          camera?.id ??
                          "N/A"
                        }
                      </p>


                      {camera?.city && (
                        <p>

                          <strong>
                            City:
                          </strong>{" "}

                          {
                            camera.city
                          }

                        </p>
                      )}


                      {camera?.state && (
                        <p>

                          <strong>
                            State:
                          </strong>{" "}

                          {
                            camera.state
                          }

                        </p>
                      )}


                      {camera?.road_name && (
                        <p>

                          <strong>
                            Road:
                          </strong>{" "}

                          {
                            camera.road_name
                          }

                        </p>
                      )}


                      {camera?.enforcement_type && (
                        <p>

                          <strong>
                            Enforcement:
                          </strong>{" "}

                          {
                            camera.enforcement_type
                          }

                        </p>
                      )}


                      {camera?.speed_limit !==
                        null &&
                        camera?.speed_limit !==
                          undefined &&
                        camera?.speed_limit !==
                          "" && (
                          <p>

                            <strong>
                              Speed Limit:
                            </strong>{" "}

                            {
                              camera.speed_limit
                            }

                          </p>
                        )}


                      <p>

                        <strong>
                          Status:
                        </strong>{" "}

                        {
                          getCameraStatus(
                            camera
                          )
                        }

                      </p>


                      <p>

                        <strong>
                          Verification:
                        </strong>{" "}

                        {
                          getCameraVerification(
                            camera
                          )
                        }

                      </p>


                      <p>

                        <strong>
                          Coordinates:
                        </strong>{" "}

                        {
                          latitude.toFixed(
                            5
                          )
                        }

                        ,{" "}

                        {
                          longitude.toFixed(
                            5
                          )
                        }

                      </p>


                      {camera?.source && (
                        <p>

                          <strong>
                            Source:
                          </strong>{" "}

                          {
                            camera.source
                          }

                        </p>
                      )}


                      {camera?.source_url && (
                        <p>

                          <a
                            href={
                              camera.source_url
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            View Source
                          </a>

                        </p>
                      )}

                    </div>

                  </Popup>

                </Marker>
              );
            }
          )}

        </MapContainer>

      </section>


      {/* ==================================================
          MAP LEGEND
      ================================================== */}

      <section className="map-legend">

        <h2>
          Camera Types
        </h2>


        <div className="legend-items">

          <div className="legend-item">

            <div className="legend-marker legend-marker-speed">
              ●
            </div>

            <span>
              Speed Camera
            </span>

          </div>


          <div className="legend-item">

            <div className="legend-marker legend-marker-red">
              ●
            </div>

            <span>
              Red Light Camera
            </span>

          </div>


          <div className="legend-item">

            <div className="legend-marker legend-marker-traffic">
              ●
            </div>

            <span>
              Traffic / CCTV /
              Enforcement
            </span>

          </div>

        </div>

      </section>


      {/* ==================================================
          CAMERAS ON ROUTE
      ================================================== */}

      {routePlanner.route.length >=
        2 && (
        <section className="route-camera-section">

          <div className="section-heading-row">

            <div>

              <h2>
                Cameras on Route
              </h2>

              <p>

                {
                  routeCameras.length
                }{" "}

                camera
                {
                  routeCameras.length ===
                  1
                    ? ""
                    : "s"
                }

                {" "}found within{" "}

                {
                  ROUTE_CAMERA_RADIUS_METERS /
                  1000
                }{" "}
                km of the route.

              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                updateRoutePlanner({
                  showRouteCameras:
                    !routePlanner.showRouteCameras,
                })
              }
            >
              {
                routePlanner
                  .showRouteCameras !==
                false
                  ? "Hide"
                  : "Show"
              }{" "}

              Route Cameras

            </button>

          </div>


          {routePlanner
            .showRouteCameras !==
            false && (
            <div className="route-camera-list">

              {routeCameras.length ===
                0 ? (
                <div className="empty-state">
                  No cameras were found
                  near this route.
                </div>
              ) : (

                routeCameras.map(
                  (camera) => (

                    <div
                      className="route-camera-card"
                      key={
                        camera?.id ??
                        `${camera?.latitude}-${camera?.longitude}`
                      }
                    >

                      <div>

                        <strong>
                          {
                            getCameraType(
                              camera
                            )
                          }
                        </strong>


                        <div>

                          {camera?.city
                            ? `${camera.city}, `
                            : ""}

                          {
                            camera?.state ||
                            "India"
                          }

                        </div>


                        {camera?.road_name && (
                          <div>
                            {
                              camera.road_name
                            }
                          </div>
                        )}


                        <div>

                          Status:{" "}

                          {
                            getCameraStatus(
                              camera
                            )
                          }

                        </div>

                      </div>


                      <div className="route-distance">

                        {
                          formatDistance(
                            camera.routeDistance
                          )
                        }

                        <span>
                          from route
                        </span>

                      </div>

                    </div>

                  )
                )

              )}

            </div>
          )}

        </section>
      )}


      {/* ==================================================
          CAMERA TYPE BREAKDOWN
      ================================================== */}

      <section className="breakdown-section">

        <h2>
          Camera Type Breakdown
        </h2>


        <div className="breakdown-list">

          {typeBreakdown.map(
            ([
              type,
              count,
            ]) => (

              <div
                className="breakdown-row"
                key={
                  type
                }
              >

                <span>
                  {type}
                </span>

                <strong>
                  {count}
                </strong>

              </div>

            )
          )}

        </div>

      </section>


      {/* ==================================================
          STATE BREAKDOWN
      ================================================== */}

      <section className="breakdown-section">

        <h2>
          Cameras by State
        </h2>


        <div className="breakdown-list">

          {stateBreakdown.map(
            ([
              state,
              count,
            ]) => (

              <div
                className="breakdown-row"
                key={
                  state
                }
              >

                <span>
                  {state}
                </span>

                <strong>
                  {count}
                </strong>

              </div>

            )
          )}

        </div>

      </section>


      {/* ==================================================
          PENDING REPORTS
      ================================================== */}

      <section className="reports-section">

        <div className="section-heading-row">

          <h2>
            Pending Camera Reports
          </h2>

          <strong>
            {
              pendingReports.length
            }
          </strong>

        </div>


        {pendingReports.length ===
          0 ? (

          <div className="empty-state">
            No pending camera reports.
          </div>

        ) : (

          <div className="reports-list">

            {pendingReports.map(
              (report) => {

                const reportId =
                  report?.id ??
                  report?.report_id ??
                  `report-${report?.latitude}-${report?.longitude}`;

                const latitude =
                  report?.latitude;

                const longitude =
                  report?.longitude;


                return (

                  <div
                    className="report-card"
                    key={
                      reportId
                    }
                  >

                    <h3>
                      Report #
                      {reportId}
                    </h3>


                    <p>

                      <strong>
                        Coordinates:
                      </strong>{" "}

                      {
                        latitude ??
                        "N/A"
                      }

                      ,{" "}

                      {
                        longitude ??
                        "N/A"
                      }

                    </p>


                    <p>

                      <strong>
                        Status:
                      </strong>{" "}

                      {
                        report?.status ||
                        "Pending"
                      }

                    </p>


                    {report?.description && (
                      <p>

                        <strong>
                          Description:
                        </strong>{" "}

                        {
                          report.description
                        }

                      </p>
                    )}


                    {report?.city && (
                      <p>

                        <strong>
                          City:
                        </strong>{" "}

                        {
                          report.city
                        }

                      </p>
                    )}


                    {report?.state && (
                      <p>

                        <strong>
                          State:
                        </strong>{" "}

                        {
                          report.state
                        }

                      </p>
                    )}

                  </div>

                );
              }
            )}

          </div>

        )}

      </section>

    </div>
  );
}


// ============================================================
// EXPORT
// ============================================================

export default CameraMap;