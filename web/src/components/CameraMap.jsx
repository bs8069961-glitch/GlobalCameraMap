import React, {
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import {
    MapContainer,
    Marker,
    Popup,
    Polyline,
    TileLayer,
    useMap
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

// ============================================================
// CONFIGURATION
// ============================================================

const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000";

// ============================================================
// MAP DEFAULTS
// ============================================================

const DEFAULT_CENTER = [
    22.9734,
    78.6569
];

const DEFAULT_ZOOM = 5;

// ============================================================
// ROUTE CAMERA RADIUS
//
// 500 meters = 0.5 kilometers
// ============================================================

const ROUTE_CAMERA_RADIUS_KM = 0.5;

// ============================================================
// DISTANCE CALCULATION
//
// Haversine formula.
// Returns distance in kilometers.
// ============================================================

const calculateDistance = (
    latitude1,
    longitude1,
    latitude2,
    longitude2
) => {

    const lat1 = Number(latitude1);
    const lon1 = Number(longitude1);
    const lat2 = Number(latitude2);
    const lon2 = Number(longitude2);

    if (
        !Number.isFinite(lat1) ||
        !Number.isFinite(lon1) ||
        !Number.isFinite(lat2) ||
        !Number.isFinite(lon2)
    ) {
        return null;
    }

    const earthRadiusKm = 6371;

    const toRadians = degrees =>
        degrees * Math.PI / 180;

    const dLatitude =
        toRadians(lat2 - lat1);

    const dLongitude =
        toRadians(lon2 - lon1);

    const a =
        Math.sin(dLatitude / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLongitude / 2) ** 2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadiusKm * c;
};

// ============================================================
// POINT TO SEGMENT DISTANCE
//
// Finds the shortest distance from a camera point
// to one route segment.
// ============================================================

const getPointToSegmentDistance = (
    cameraLatitude,
    cameraLongitude,
    point1,
    point2
) => {

    const lat1 = Number(point1[0]);
    const lon1 = Number(point1[1]);

    const lat2 = Number(point2[0]);
    const lon2 = Number(point2[1]);

    const lat3 = Number(cameraLatitude);
    const lon3 = Number(cameraLongitude);

    if (
        !Number.isFinite(lat1) ||
        !Number.isFinite(lon1) ||
        !Number.isFinite(lat2) ||
        !Number.isFinite(lon2) ||
        !Number.isFinite(lat3) ||
        !Number.isFinite(lon3)
    ) {
        return null;
    }

    const earthRadiusKm = 6371;
    const radians = Math.PI / 180;

    const averageLatitude =
        (
            lat1 +
            lat2 +
            lat3
        ) / 3;

    const cosLatitude =
        Math.cos(
            averageLatitude * radians
        );

    const x1 =
        lon1 *
        radians *
        cosLatitude;

    const y1 =
        lat1 *
        radians;

    const x2 =
        lon2 *
        radians *
        cosLatitude;

    const y2 =
        lat2 *
        radians;

    const x3 =
        lon3 *
        radians *
        cosLatitude;

    const y3 =
        lat3 *
        radians;

    const dx =
        x2 - x1;

    const dy =
        y2 - y1;

    const segmentLengthSquared =
        dx * dx +
        dy * dy;

    let t = 0;

    if (
        segmentLengthSquared > 0
    ) {

        t =
            (
                (x3 - x1) * dx +
                (y3 - y1) * dy
            ) /
            segmentLengthSquared;

        t =
            Math.max(
                0,
                Math.min(1, t)
            );
    }

    const closestX =
        x1 + t * dx;

    const closestY =
        y1 + t * dy;

    const distanceRadians =
        Math.sqrt(
            (x3 - closestX) ** 2 +
            (y3 - closestY) ** 2
        );

    return distanceRadians * earthRadiusKm;
};

// ============================================================
// DISTANCE FROM CAMERA TO ENTIRE ROUTE
//
// Checks every route segment.
// ============================================================

const getDistanceFromRoute = (
    camera,
    routeCoordinates
) => {

    if (
        !camera ||
        !Array.isArray(routeCoordinates) ||
        routeCoordinates.length < 2
    ) {
        return null;
    }

    const cameraLatitude =
        Number(camera.latitude);

    const cameraLongitude =
        Number(camera.longitude);

    if (
        !Number.isFinite(cameraLatitude) ||
        !Number.isFinite(cameraLongitude)
    ) {
        return null;
    }

    let closestDistance =
        Infinity;

    for (
        let index = 0;
        index < routeCoordinates.length - 1;
        index++
    ) {

        const point1 =
            routeCoordinates[index];

        const point2 =
            routeCoordinates[index + 1];

        const segmentDistance =
            getPointToSegmentDistance(
                cameraLatitude,
                cameraLongitude,
                point1,
                point2
            );

        if (
            segmentDistance !== null &&
            segmentDistance < closestDistance
        ) {

            closestDistance =
                segmentDistance;
        }
    }

    if (
        closestDistance === Infinity
    ) {
        return null;
    }

    return closestDistance;
};

// ============================================================
// DISTANCE ALONG ROUTE
//
// Finds approximately where the closest point to the
// camera occurs along the route.
// ============================================================

const getDistanceAlongRoute = (
    camera,
    routeCoordinates
) => {

    if (
        !camera ||
        !Array.isArray(routeCoordinates) ||
        routeCoordinates.length < 2
    ) {
        return null;
    }

    const cameraLatitude =
        Number(camera.latitude);

    const cameraLongitude =
        Number(camera.longitude);

    if (
        !Number.isFinite(cameraLatitude) ||
        !Number.isFinite(cameraLongitude)
    ) {
        return null;
    }

    let travelledKm = 0;

    let closestDistance =
        Infinity;

    let closestRouteDistance =
        null;

    for (
        let index = 0;
        index < routeCoordinates.length - 1;
        index++
    ) {

        const point1 =
            routeCoordinates[index];

        const point2 =
            routeCoordinates[index + 1];

        const latitude1 =
            Number(point1[0]);

        const longitude1 =
            Number(point1[1]);

        const latitude2 =
            Number(point2[0]);

        const longitude2 =
            Number(point2[1]);

        if (
            !Number.isFinite(latitude1) ||
            !Number.isFinite(longitude1) ||
            !Number.isFinite(latitude2) ||
            !Number.isFinite(longitude2)
        ) {
            continue;
        }

        const segmentDistance =
            calculateDistance(
                latitude1,
                longitude1,
                latitude2,
                longitude2
            );

        if (
            segmentDistance === null
        ) {
            continue;
        }

        const radians =
            Math.PI / 180;

        const averageLatitude =
            (
                latitude1 +
                latitude2 +
                cameraLatitude
            ) / 3;

        const cosLatitude =
            Math.cos(
                averageLatitude * radians
            );

        const x1 =
            longitude1 *
            radians *
            cosLatitude;

        const y1 =
            latitude1 *
            radians;

        const x2 =
            longitude2 *
            radians *
            cosLatitude;

        const y2 =
            latitude2 *
            radians;

        const x3 =
            cameraLongitude *
            radians *
            cosLatitude;

        const y3 =
            cameraLatitude *
            radians;

        const dx =
            x2 - x1;

        const dy =
            y2 - y1;

        const segmentLengthSquared =
            dx * dx +
            dy * dy;

        let t = 0;

        if (
            segmentLengthSquared > 0
        ) {

            t =
                (
                    (x3 - x1) * dx +
                    (y3 - y1) * dy
                ) /
                segmentLengthSquared;

            t =
                Math.max(
                    0,
                    Math.min(1, t)
                );
        }

        const closestX =
            x1 + t * dx;

        const closestY =
            y1 + t * dy;

        const distanceRadians =
            Math.sqrt(
                (x3 - closestX) ** 2 +
                (y3 - closestY) ** 2
            );

        const distanceKm =
            distanceRadians * 6371;

        if (
            distanceKm <
            closestDistance
        ) {

            closestDistance =
                distanceKm;

            closestRouteDistance =
                travelledKm +
                segmentDistance * t;
        }

        travelledKm +=
            segmentDistance;
    }

    return closestRouteDistance;
};

// ============================================================
// CAMERA ICON
// ============================================================

const createCameraIcon = (
    cameraType,
    verificationStatus = "pending",
    isRouteCamera = false
) => {

    const type =
        String(cameraType || "")
            .trim()
            .toLowerCase();

    const verification =
        String(
            verificationStatus || "pending"
        )
            .trim()
            .toLowerCase();

    let backgroundColor =
        "#f59e0b";

    if (
        verification === "verified"
    ) {
        backgroundColor =
            "#16a34a";
    }

    if (
        verification === "rejected"
    ) {
        backgroundColor =
            "#dc2626";
    }

    if (
        isRouteCamera
    ) {
        backgroundColor =
            "#dc2626";
    }

    let symbol =
        "📷";

    if (
        type.includes("speed")
    ) {

        symbol =
            "⚡";

    } else if (
        type.includes("red")
    ) {

        symbol =
            "🚦";

    } else if (
        type.includes("traffic")
    ) {

        symbol =
            "📷";
    }

    return L.divIcon({

        className:
            "camera-marker-icon",

        html: `
            <div
                style="
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: ${backgroundColor};
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 17px;
                "
            >
                ${symbol}
            </div>
        `,

        iconSize: [
            34,
            34
        ],

        iconAnchor: [
            17,
            17
        ],

        popupAnchor: [
            0,
            -17
        ]
    });
};

// ============================================================
// DESTINATION ICON
// ============================================================

const destinationIcon =
    L.divIcon({

        className:
            "destination-marker-icon",

        html: `
            <div
                style="
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: #2563eb;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                "
            >
                🏁
            </div>
        `,

        iconSize: [
            38,
            38
        ],

        iconAnchor: [
            19,
            19
        ],

        popupAnchor: [
            0,
            -19
        ]
    });

// ============================================================
// USER LOCATION ICON
// ============================================================

const userLocationIcon =
    L.divIcon({

        className:
            "user-location-marker-icon",

        html: `
            <div
                style="
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: #7c3aed;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                "
            >
                📍
            </div>
        `,

        iconSize: [
            38,
            38
        ],

        iconAnchor: [
            19,
            19
        ],

        popupAnchor: [
            0,
            -19
        ]
    });

// ============================================================
// MAP REF CONTROLLER
// ============================================================

function MapRefController({
    mapRef
}) {

    const map =
        useMap();

    useEffect(() => {

        mapRef.current =
            map;

        return () => {

            if (
                mapRef.current === map
            ) {

                mapRef.current =
                    null;
            }
        };

    }, [
        map,
        mapRef
    ]);

    return null;
}

// ============================================================
// MAP CONTROLLER
// ============================================================

function MapController({
    routeCoordinates,
    destination,
    userLocation
}) {

    const map =
        useMap();

    useEffect(() => {

        if (
            routeCoordinates &&
            routeCoordinates.length > 1
        ) {

            const bounds =
                L.latLngBounds(
                    routeCoordinates
                );

            map.fitBounds(
                bounds,
                {
                    padding: [
                        40,
                        40
                    ]
                }
            );

            return;
        }

        if (
            destination
        ) {

            map.flyTo(
                [
                    destination.latitude,
                    destination.longitude
                ],
                12,
                {
                    duration: 1
                }
            );

            return;
        }

        if (
            userLocation
        ) {

            map.flyTo(
                [
                    userLocation.latitude,
                    userLocation.longitude
                ],
                12,
                {
                    duration: 1
                }
            );
        }

    }, [
        map,
        routeCoordinates,
        destination,
        userLocation
    ]);

    return null;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CameraMap() {

    // ========================================================
    // CAMERA DATA
    // ========================================================

    const [
        cameras,
        setCameras
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        cameraError,
        setCameraError
    ] = useState(false);

    // ========================================================
    // SEARCH
    // ========================================================

    const [
        searchQuery,
        setSearchQuery
    ] = useState("");

    const [
        searchLoading,
        setSearchLoading
    ] = useState(false);

    const [
        searchError,
        setSearchError
    ] = useState("");

    // ========================================================
    // DESTINATION
    // ========================================================

    const [
        destination,
        setDestination
    ] = useState(null);

    // ========================================================
    // USER LOCATION
    // ========================================================

    const [
        userLocation,
        setUserLocation
    ] = useState(null);

    const [
        locationLoading,
        setLocationLoading
    ] = useState(false);

    // ========================================================
    // ROUTE
    // ========================================================

    const [
        routeCoordinates,
        setRouteCoordinates
    ] = useState([]);

    const [
        routeDistance,
        setRouteDistance
    ] = useState(null);

    const [
        routeDuration,
        setRouteDuration
    ] = useState(null);

    const [
        routeCreated,
        setRouteCreated
    ] = useState(false);

    const [
        routeLoading,
        setRouteLoading
    ] = useState(false);

    const [
        routeError,
        setRouteError
    ] = useState("");

    // ========================================================
    // FILTERS
    // ========================================================

    const [
        cameraTypeFilter,
        setCameraTypeFilter
    ] = useState("All");

    const [
        verificationFilter,
        setVerificationFilter
    ] = useState("All");

    // ========================================================
    // MAP REF
    // ========================================================

    const mapRef =
        useRef(null);

    // ========================================================
    // LOAD CAMERAS
    // ========================================================

    const loadCameras = async () => {

        try {

            setLoading(true);

            setCameraError(false);

            const response =
                await fetch(
                    `${API_URL}/api/cameras`
                );

            if (
                !response.ok
            ) {

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
                    "Camera API did not return an array"
                );
            }

            setCameras(data);

        } catch (error) {

            console.error(
                "Failed to load cameras:",
                error
            );

            setCameras([]);

            setCameraError(
                true
            );

        } finally {

            setLoading(
                false
            );
        }
    };

    // ========================================================
    // INITIAL CAMERA LOAD
    // ========================================================

    useEffect(() => {

        loadCameras();

    }, []);

    // ========================================================
    // LOCATE USER
    // ========================================================

    const locateUser = () => {

        if (
            !navigator.geolocation
        ) {

            alert(
                "Geolocation is not supported by this browser."
            );

            return;
        }

        setLocationLoading(
            true
        );

        navigator.geolocation.getCurrentPosition(

            position => {

                const location = {

                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude
                };

                setUserLocation(
                    location
                );

                setLocationLoading(
                    false
                );

                if (
                    mapRef.current
                ) {

                    mapRef.current.flyTo(
                        [
                            location.latitude,
                            location.longitude
                        ],
                        12,
                        {
                            duration: 1
                        }
                    );
                }
            },

            error => {

                console.error(
                    "Location error:",
                    error
                );

                setLocationLoading(
                    false
                );

                alert(
                    "Unable to get your current location. Please allow location access."
                );
            },

            {
                enableHighAccuracy:
                    true,

                timeout:
                    15000,

                maximumAge:
                    0
            }
        );
    };

    // ========================================================
    // FIND DESTINATION
    // ========================================================

    const findDestination = async () => {

        const query =
            searchQuery.trim();

        if (
            !query
        ) {

            setSearchError(
                "Please enter a city, state or road."
            );

            return;
        }

        try {

            setSearchLoading(
                true
            );

            setSearchError(
                ""
            );

            const url =
                `https://nominatim.openstreetmap.org/search?` +
                `format=json` +
                `&q=${encodeURIComponent(query)}` +
                `&countrycodes=in` +
                `&limit=1`;

            const response =
                await fetch(
                    url,
                    {
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            if (
                !response.ok
            ) {

                throw new Error(
                    "Destination search failed"
                );
            }

            const results =
                await response.json();

            if (
                !Array.isArray(results) ||
                results.length === 0
            ) {

                setSearchError(
                    `Destination "${query}" was not found.`
                );

                return;
            }

            const result =
                results[0];

            const latitude =
                Number(result.lat);

            const longitude =
                Number(result.lon);

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                throw new Error(
                    "Invalid destination coordinates"
                );
            }

            const newDestination = {

                name:
                    result.display_name
                        ?.split(",")
                        ?.slice(0, 2)
                        ?.join(",")
                        ?.trim()
                    || query,

                query,

                latitude,

                longitude
            };

            setDestination(
                newDestination
            );

            setRouteCreated(
                false
            );

            setRouteCoordinates(
                []
            );

            setRouteDistance(
                null
            );

            setRouteDuration(
                null
            );

            setRouteError(
                ""
            );

        } catch (error) {

            console.error(
                "Destination search error:",
                error
            );

            setSearchError(
                "Unable to find destination."
            );

        } finally {

            setSearchLoading(
                false
            );
        }
    };

    // ========================================================
    // CREATE ROUTE
    // ========================================================

    const createRoute = async () => {

        if (
            !destination
        ) {

            setRouteError(
                "Find a destination first."
            );

            return;
        }

        if (
            !userLocation
        ) {

            setRouteError(
                "Please click Locate Me first so the route can start from your current location."
            );

            return;
        }

        try {

            setRouteLoading(
                true
            );

            setRouteError(
                ""
            );

            const start =
                `${userLocation.longitude},${userLocation.latitude}`;

            const end =
                `${destination.longitude},${destination.latitude}`;

            const url =
                `https://router.project-osrm.org/route/v1/driving/` +
                `${start};${end}` +
                `?overview=full&geometries=geojson`;

            const response =
                await fetch(
                    url
                );

            if (
                !response.ok
            ) {

                throw new Error(
                    "Routing service failed"
                );
            }

            const data =
                await response.json();

            if (
                data.code !== "Ok" ||
                !data.routes ||
                data.routes.length === 0
            ) {

                throw new Error(
                    "No route could be created."
                );
            }

            const route =
                data.routes[0];

            const coordinates =
                route.geometry.coordinates.map(
                    point => [
                        Number(point[1]),
                        Number(point[0])
                    ]
                );

            setRouteCoordinates(
                coordinates
            );

            setRouteDistance(
                Number(route.distance) / 1000
            );

            setRouteDuration(
                Number(route.duration) / 60
            );

            setRouteCreated(
                true
            );

        } catch (error) {

            console.error(
                "Route creation error:",
                error
            );

            setRouteError(
                "Unable to create route. Please try again."
            );

        } finally {

            setRouteLoading(
                false
            );
        }
    };

    // ========================================================
    // CLEAR ROUTE
    // ========================================================

    const clearRoute = () => {

        setRouteCoordinates(
            []
        );

        setRouteDistance(
            null
        );

        setRouteDuration(
            null
        );

        setRouteCreated(
            false
        );

        setRouteError(
            ""
        );
    };

    // ========================================================
    // ROUTE SPEED CAMERAS
    //
    // ONLY speed cameras within 500 meters.
    // ========================================================

    const routeSpeedCameras =
        useMemo(() => {

            if (
                !routeCreated ||
                routeCoordinates.length < 2
            ) {

                return [];
            }

            return cameras

                .filter(camera => {

                    const type =
                        String(
                            camera.camera_type || ""
                        )
                            .trim()
                            .toLowerCase();

                    return type.includes(
                        "speed"
                    );
                })

                .map(camera => {

                    const fromRouteKm =
                        getDistanceFromRoute(
                            camera,
                            routeCoordinates
                        );

                    const routeDistanceKm =
                        getDistanceAlongRoute(
                            camera,
                            routeCoordinates
                        );

                    const distanceToDestination =
                        destination
                            ? calculateDistance(
                                Number(
                                    camera.latitude
                                ),
                                Number(
                                    camera.longitude
                                ),
                                Number(
                                    destination.latitude
                                ),
                                Number(
                                    destination.longitude
                                )
                            )
                            : null;

                    return {
                        ...camera,
                        fromRouteKm,
                        routeDistanceKm,
                        distanceToDestination
                    };
                })

                .filter(camera =>
                    camera.fromRouteKm !== null &&
                    camera.fromRouteKm <=
                    ROUTE_CAMERA_RADIUS_KM
                )

                .sort(
                    (a, b) =>
                        (
                            a.routeDistanceKm ??
                            Infinity
                        ) -
                        (
                            b.routeDistanceKm ??
                            Infinity
                        )
                );

        }, [
            cameras,
            routeCoordinates,
            routeCreated,
            destination
        ]);

    // ========================================================
    // FILTER CAMERAS
    // ========================================================

    const filteredCameras =
        useMemo(() => {

            return cameras.filter(
                camera => {

                    const cameraType =
                        String(
                            camera.camera_type || ""
                        )
                            .trim()
                            .toLowerCase();

                    const verification =
                        String(
                            camera.verification_status || ""
                        )
                            .trim()
                            .toLowerCase();

                    const typeMatch =
                        cameraTypeFilter === "All" ||
                        cameraType.includes(
                            cameraTypeFilter.toLowerCase()
                        );

                    const verificationMatch =
                        verificationFilter === "All" ||
                        verification ===
                        verificationFilter.toLowerCase();

                    return (
                        typeMatch &&
                        verificationMatch
                    );
                }
            );

        }, [
            cameras,
            cameraTypeFilter,
            verificationFilter
        ]);

    // ========================================================
    // STATISTICS
    // ========================================================

    const statistics =
        useMemo(() => {

            const total =
                filteredCameras.length;

            const speed =
                filteredCameras.filter(
                    camera =>
                        String(
                            camera.camera_type || ""
                        )
                            .toLowerCase()
                            .includes("speed")
                ).length;

            const redLight =
                filteredCameras.filter(
                    camera =>
                        String(
                            camera.camera_type || ""
                        )
                            .toLowerCase()
                            .includes("red")
                ).length;

            const verified =
                filteredCameras.filter(
                    camera =>
                        String(
                            camera.verification_status || ""
                        )
                            .toLowerCase() ===
                        "verified"
                ).length;

            const pending =
                filteredCameras.filter(
                    camera =>
                        String(
                            camera.verification_status || ""
                        )
                            .toLowerCase() ===
                        "pending"
                ).length;

            const cities =
                new Set(
                    filteredCameras
                        .map(
                            camera =>
                                String(
                                    camera.city || ""
                                )
                                    .trim()
                                    .toLowerCase()
                        )
                        .filter(Boolean)
                ).size;

            return {
                total,
                speed,
                redLight,
                verified,
                pending,
                cities
            };

        }, [
            filteredCameras
        ]);

    // ========================================================
    // CAMERA DISTANCE FROM USER
    // ========================================================

    const getCameraDistance =
        camera => {

            if (
                !userLocation
            ) {

                return null;
            }

            return calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                Number(camera.latitude),
                Number(camera.longitude)
            );
        };

    // ========================================================
    // FORMAT DISTANCE
    // ========================================================

    const formatDistance =
        km => {

            if (
                km === null ||
                km === undefined ||
                !Number.isFinite(km)
            ) {

                return null;
            }

            return km < 1
                ? `${Math.round(km * 1000)} m`
                : `${km.toFixed(2)} km`;
        };

    // ========================================================
    // FORMAT ROUTE TIME
    // ========================================================

    const formatRouteTime =
        minutes => {

            if (
                minutes === null ||
                minutes === undefined ||
                !Number.isFinite(minutes)
            ) {

                return "";
            }

            const rounded =
                Math.round(minutes);

            const hours =
                Math.floor(
                    rounded / 60
                );

            const mins =
                rounded % 60;

            if (
                hours > 0
            ) {

                return `${hours} hr ${mins} min`;
            }

            return `${mins} min`;
        };

    // ========================================================
    // CAMERA VERIFICATION DISPLAY
    // ========================================================

    const verificationLabel =
        camera => {

            const value =
                String(
                    camera.verification_status ||
                    "Pending"
                )
                    .trim()
                    .toLowerCase();

            if (
                value === "verified"
            ) {

                return "Verified";
            }

            if (
                value === "rejected"
            ) {

                return "Rejected";
            }

            return "Pending";
        };

    // ========================================================
    // ROUTE CAMERA MESSAGE
    // ========================================================

    const routeCameraMessage =
        routeSpeedCameras.length === 0
            ? "No speed cameras found within 500 meters of your route."
            : `Found ${routeSpeedCameras.length} speed camera${
                routeSpeedCameras.length === 1
                    ? ""
                    : "s"
            } within 500 meters of your route.`;

    // ========================================================
    // RENDER
    // ========================================================

    return (

        <div className="camera-map-page">

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="page-header">

                <div>

                    <h1>
                        🗺 Global Camera Map
                    </h1>

                    <p>
                        Find traffic cameras and plan safer routes.
                    </p>

                </div>

            </div>

            {/* ==================================================
                CONTROLS
            ================================================== */}

            <div className="map-controls">

                {/* SEARCH */}

                <div className="destination-search">

                    <input
                        type="text"
                        value={searchQuery}
                        onChange={event =>
                            setSearchQuery(
                                event.target.value
                            )
                        }
                        onKeyDown={event => {

                            if (
                                event.key === "Enter"
                            ) {

                                findDestination();
                            }
                        }}
                        placeholder="Search city, state or road..."
                    />

                    <button
                        type="button"
                        onClick={findDestination}
                        disabled={searchLoading}
                    >
                        {searchLoading
                            ? "🔍 Searching..."
                            : "🔍 Find Destination"}
                    </button>

                </div>

                {/* ROUTE */}

                <button
                    type="button"
                    onClick={createRoute}
                    disabled={
                        routeLoading ||
                        !destination
                    }
                    className="route-button"
                >
                    {routeLoading
                        ? "🚗 Creating Route..."
                        : "🚗 Create Route"}
                </button>

                {/* CAMERA TYPE */}

                <select
                    value={cameraTypeFilter}
                    onChange={event =>
                        setCameraTypeFilter(
                            event.target.value
                        )
                    }
                >

                    <option value="All">
                        All Camera Types
                    </option>

                    <option value="Speed Camera">
                        Speed Camera
                    </option>

                    <option value="Red Light Camera">
                        Red Light Camera
                    </option>

                    <option value="Traffic Camera">
                        Traffic Camera
                    </option>

                </select>

                {/* VERIFICATION */}

                <select
                    value={verificationFilter}
                    onChange={event =>
                        setVerificationFilter(
                            event.target.value
                        )
                    }
                >

                    <option value="All">
                        All Verification
                    </option>

                    <option value="Verified">
                        Verified
                    </option>

                    <option value="Pending">
                        Pending
                    </option>

                    <option value="Rejected">
                        Rejected
                    </option>

                </select>

                {/* LOCATE */}

                <button
                    type="button"
                    onClick={locateUser}
                    disabled={locationLoading}
                >
                    {locationLoading
                        ? "📍 Locating..."
                        : "📍 Locate Me"}
                </button>

            </div>

            {/* ==================================================
                SEARCH ERROR
            ================================================== */}

            {searchError && (

                <div className="error-message">

                    ⚠️ {searchError}

                </div>

            )}

            {/* ==================================================
                DESTINATION
            ================================================== */}

            {destination && (

                <div className="destination-info">

                    <strong>
                        🏁 Destination:
                    </strong>{" "}

                    {destination.query}

                    {" — "}

                    {destination.latitude.toFixed(5)}

                    {", "}

                    {destination.longitude.toFixed(5)}

                </div>

            )}

            {/* ==================================================
                ROUTE INFORMATION
            ================================================== */}

            {routeCreated &&
                routeDistance !== null && (

                    <div className="route-summary">

                        <div className="route-title">
                            🚗 Route Created
                        </div>

                        <div>

                            🚗 Route:{" "}

                            <strong>
                                {routeDistance.toFixed(2)} km
                            </strong>

                            {" | "}

                            ⏱️{" "}

                            <strong>
                                {formatRouteTime(
                                    routeDuration
                                )}
                            </strong>

                        </div>

                        <div className="route-warning">

                            ⚠️ Speed Cameras on Route:{" "}

                            <strong>
                                {routeSpeedCameras.length}
                            </strong>{" "}

                            camera
                            {routeSpeedCameras.length === 1
                                ? ""
                                : "s"}

                            {" "}
                            (within 500 m of route)

                        </div>

                        <button
                            type="button"
                            onClick={clearRoute}
                            className="clear-route-button"
                        >
                            ✕ Clear Route
                        </button>

                    </div>
                )}

            {/* ==================================================
                ROUTE ERROR
            ================================================== */}

            {routeError && (

                <div className="error-message">

                    ⚠️ {routeError}

                </div>

            )}

            {/* ==================================================
                STATISTICS
            ================================================== */}

            <div className="camera-statistics">

                <div className="stat-card">

                    <span>
                        Total
                    </span>

                    <strong>
                        {statistics.total}
                    </strong>

                </div>

                <div className="stat-card">

                    <span>
                        Speed
                    </span>

                    <strong>
                        {statistics.speed}
                    </strong>

                </div>

                <div className="stat-card">

                    <span>
                        Red Light
                    </span>

                    <strong>
                        {statistics.redLight}
                    </strong>

                </div>

                <div className="stat-card">

                    <span>
                        Verified
                    </span>

                    <strong>
                        {statistics.verified}
                    </strong>

                </div>

                <div className="stat-card">

                    <span>
                        Pending
                    </span>

                    <strong>
                        {statistics.pending}
                    </strong>

                </div>

                <div className="stat-card">

                    <span>
                        Cities
                    </span>

                    <strong>
                        {statistics.cities}
                    </strong>

                </div>

            </div>

            {/* ==================================================
                ROUTE CAMERA WARNING
            ================================================== */}

            {routeCreated && (

                <div className="route-camera-section">

                    <h2>
                        ⚠️ Speed Cameras on Your Route
                    </h2>

                    <p>
                        {routeCameraMessage}
                    </p>

                    {routeSpeedCameras.length > 0 && (

                        <div className="route-camera-list">

                            {routeSpeedCameras.map(
                                camera => {

                                    const distanceFromRoute =
                                        camera.fromRouteKm *
                                        1000;

                                    return (

                                        <div
                                            className="route-camera-card"
                                            key={camera.id}
                                        >

                                            <h3>

                                                ⚠️{" "}

                                                {camera.city ||
                                                    "Unknown City"}

                                                {" — "}

                                                {camera.road_name ||
                                                    "Unknown Road"}

                                            </h3>

                                            <p>

                                                📍{" "}

                                                <strong>
                                                    {Math.round(
                                                        distanceFromRoute
                                                    )} m
                                                </strong>{" "}
                                                from route

                                            </p>

                                            {camera.routeDistanceKm !==
                                                null && (

                                                <p>

                                                    🚗 About{" "}

                                                    <strong>
                                                        {camera.routeDistanceKm.toFixed(
                                                            2
                                                        )} km
                                                    </strong>{" "}
                                                    from start

                                                </p>
                                            )}

                                            {camera.distanceToDestination !==
                                                null && (

                                                <p>

                                                    🏁{" "}

                                                    <strong>
                                                        {camera.distanceToDestination.toFixed(
                                                            2
                                                        )} km
                                                    </strong>{" "}
                                                    to destination

                                                </p>
                                            )}

                                            <p>

                                                🏎{" "}

                                                {camera.camera_type ||
                                                    "Speed Camera"}

                                            </p>

                                            <p>

                                                {verificationLabel(
                                                    camera
                                                ) === "Verified"
                                                    ? "✅"
                                                    : verificationLabel(
                                                        camera
                                                    ) === "Rejected"
                                                        ? "🔴"
                                                        : "🟡"}

                                                {" "}

                                                Verification:{" "}

                                                {verificationLabel(
                                                    camera
                                                )}

                                            </p>

                                        </div>
                                    );
                                }
                            )}

                        </div>
                    )}

                </div>
            )}

            {/* ==================================================
                CAMERA LIST
            ================================================== */}

            <div className="camera-list-section">

                <h2>
                    Cameras ({filteredCameras.length})
                </h2>

                {/* LOADING */}

                {loading && (

                    <div className="loading-message">
                        Loading camera data...
                    </div>

                )}

                {/* ERROR */}

                {!loading &&
                    cameraError && (

                        <div className="error-message">

                            ⚠️ Unable to load camera data.

                            <br />

                            <button
                                type="button"
                                onClick={loadCameras}
                            >
                                Retry
                            </button>

                        </div>
                    )}

                {/* EMPTY */}

                {!loading &&
                    !cameraError &&
                    filteredCameras.length === 0 && (

                        <div className="empty-message">

                            No cameras match the selected filters.

                        </div>
                    )}

                {/* CAMERA CARDS */}

                {!loading &&
                    !cameraError &&
                    filteredCameras.length > 0 && (

                        <div className="camera-list">

                            {filteredCameras.map(
                                camera => {

                                    const distance =
                                        getCameraDistance(
                                            camera
                                        );

                                    const routeCamera =
                                        routeSpeedCameras.find(
                                            routeCameraItem =>
                                                routeCameraItem.id ===
                                                camera.id
                                        );

                                    return (

                                        <div
                                            className="camera-card"
                                            key={camera.id}
                                        >

                                            <h3>

                                                📍{" "}

                                                {camera.city ||
                                                    "Unknown City"}

                                            </h3>

                                            {camera.state && (

                                                <p>

                                                    <strong>
                                                        State:
                                                    </strong>{" "}

                                                    {camera.state}

                                                </p>
                                            )}

                                            <p>

                                                <strong>
                                                    Road:
                                                </strong>{" "}

                                                {camera.road_name ||
                                                    "Unknown Road"}

                                            </p>

                                            <p>

                                                <strong>
                                                    Type:
                                                </strong>{" "}

                                                {camera.camera_type ||
                                                    "Unknown"}

                                            </p>

                                            <p>

                                                <strong>
                                                    Verification:
                                                </strong>{" "}

                                                {verificationLabel(
                                                    camera
                                                )}

                                            </p>

                                            {distance !== null && (

                                                <p>

                                                    <strong>
                                                        Distance:
                                                    </strong>{" "}

                                                    {formatDistance(
                                                        distance
                                                    )}

                                                </p>
                                            )}

                                            {routeCamera && (

                                                <>

                                                    <p>

                                                        ⚠️{" "}

                                                        <strong>
                                                            Speed camera within
                                                            500 m of your route
                                                        </strong>

                                                    </p>

                                                    <p>

                                                        🚗{" "}

                                                        <strong>
                                                            Route Distance:
                                                        </strong>{" "}

                                                        {routeCamera.routeDistanceKm !==
                                                            null

                                                            ? routeCamera.routeDistanceKm.toFixed(
                                                                2
                                                            )

                                                            : "—"}

                                                        {" km"}

                                                    </p>

                                                    <p>

                                                        📍{" "}

                                                        <strong>
                                                            From Route:
                                                        </strong>{" "}

                                                        {Math.round(
                                                            routeCamera.fromRouteKm *
                                                            1000
                                                        )}

                                                        {" m"}

                                                    </p>

                                                </>
                                            )}

                                        </div>
                                    );
                                }
                            )}

                        </div>
                    )}

            </div>

            {/* ==================================================
                MAP
            ================================================== */}

            <div
                className="camera-map-container"
                style={{
                    height: "600px",
                    width: "100%",
                    marginTop: "30px"
                }}
            >

                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    style={{
                        height: "100%",
                        width: "100%"
                    }}
                >

                    {/* MAP REF */}

                    <MapRefController
                        mapRef={mapRef}
                    />

                    {/* MAP CONTROLLER */}

                    <MapController
                        routeCoordinates={
                            routeCoordinates
                        }
                        destination={
                            destination
                        }
                        userLocation={
                            userLocation
                        }
                    />

                    {/* TILE LAYER */}

                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* ==================================================
                        CAMERA MARKERS
                    ================================================== */}

                    {filteredCameras.map(
                        camera => {

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
                                routeSpeedCameras.some(
                                    routeCamera =>
                                        routeCamera.id ===
                                        camera.id
                                );

                            const routeCameraDetails =
                                routeSpeedCameras.find(
                                    routeCamera =>
                                        routeCamera.id ===
                                        camera.id
                                );

                            return (

                                <Marker
                                    key={camera.id}
                                    position={[
                                        latitude,
                                        longitude
                                    ]}
                                    icon={
                                        createCameraIcon(
                                            camera.camera_type,
                                            camera.verification_status,
                                            isRouteCamera
                                        )
                                    }
                                >

                                    <Popup>

                                        <div>

                                            <h3>

                                                {isRouteCamera
                                                    ? "⚠️ "
                                                    : "📍 "}

                                                {camera.city ||
                                                    "Unknown City"}

                                            </h3>

                                            {isRouteCamera && (

                                                <p>

                                                    <strong>
                                                        ⚠️ Speed camera
                                                        within 500 m
                                                        of your route
                                                    </strong>

                                                </p>
                                            )}

                                            <p>

                                                <strong>
                                                    State:
                                                </strong>{" "}

                                                {camera.state ||
                                                    "Unknown"}

                                            </p>

                                            <p>

                                                <strong>
                                                    Road:
                                                </strong>{" "}

                                                {camera.road_name ||
                                                    "Unknown Road"}

                                            </p>

                                            <p>

                                                <strong>
                                                    Type:
                                                </strong>{" "}

                                                {camera.camera_type ||
                                                    "Unknown"}

                                            </p>

                                            <p>

                                                <strong>
                                                    Verification:
                                                </strong>{" "}

                                                {verificationLabel(
                                                    camera
                                                )}

                                            </p>

                                            {isRouteCamera &&
                                                routeCameraDetails && (

                                                    <>

                                                        <p>

                                                            <strong>
                                                                From Route:
                                                            </strong>{" "}

                                                            {Math.round(
                                                                routeCameraDetails.fromRouteKm *
                                                                1000
                                                            )}

                                                            {" m"}

                                                        </p>

                                                        {routeCameraDetails.routeDistanceKm !==
                                                            null && (

                                                            <p>

                                                                <strong>
                                                                    Route Distance:
                                                                </strong>{" "}

                                                                {routeCameraDetails.routeDistanceKm.toFixed(
                                                                    2
                                                                )}

                                                                {" km"}

                                                            </p>
                                                        )}

                                                        {routeCameraDetails.distanceToDestination !==
                                                            null && (

                                                            <p>

                                                                <strong>
                                                                    To Destination:
                                                                </strong>{" "}

                                                                {routeCameraDetails.distanceToDestination.toFixed(
                                                                    2
                                                                )}

                                                                {" km"}

                                                            </p>
                                                        )}

                                                    </>
                                                )}

                                        </div>

                                    </Popup>

                                </Marker>
                            );
                        }
                    )}

                    {/* ==================================================
                        DESTINATION MARKER
                    ================================================== */}

                    {destination && (

                        <Marker
                            position={[
                                destination.latitude,
                                destination.longitude
                            ]}
                            icon={
                                destinationIcon
                            }
                        >

                            <Popup>

                                <strong>
                                    🏁 Destination
                                </strong>

                                <br />

                                {destination.query}

                                <br />

                                {destination.latitude.toFixed(
                                    5
                                )}

                                {", "}

                                {destination.longitude.toFixed(
                                    5
                                )}

                            </Popup>

                        </Marker>
                    )}

                    {/* ==================================================
                        USER LOCATION MARKER
                    ================================================== */}

                    {userLocation && (

                        <Marker
                            position={[
                                userLocation.latitude,
                                userLocation.longitude
                            ]}
                            icon={
                                userLocationIcon
                            }
                        >

                            <Popup>
                                📍 Your Location
                            </Popup>

                        </Marker>
                    )}

                    {/* ==================================================
                        ROUTE
                    ================================================== */}

                    {routeCoordinates.length > 1 && (

                        <Polyline
                            positions={
                                routeCoordinates
                            }
                            pathOptions={{
                                color:
                                    "#2563eb",

                                weight:
                                    6,

                                opacity:
                                    0.85
                            }}
                        />
                    )}

                </MapContainer>

            </div>

            {/* ==================================================
                MAP LEGEND
            ================================================== */}

            <div className="map-legend">

                <h3>
                    Camera Status
                </h3>

                <p>
                    🟢 Verified
                </p>

                <p>
                    🟡 Pending
                </p>

                <p>
                    🔴 Rejected
                </p>

                {routeCreated && (

                    <p>
                        ⚠️ Red marker = Speed camera within
                        500 m of route
                    </p>

                )}

                {userLocation && (

                    <p>
                        📍 Your Location
                    </p>

                )}

                {destination && (

                    <p>
                        🏁 Destination
                    </p>

                )}

            </div>

        </div>
    );
}