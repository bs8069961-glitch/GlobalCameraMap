import { useEffect, useMemo, useState } from "react";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

import "./CameraMap.css";


// ============================================================
// ICONS
// ============================================================

const cameraIcon = new L.Icon({
    iconUrl:
        "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const startIcon = new L.Icon({
    iconUrl:
        "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [35, 35],
    iconAnchor: [17, 35]
});

const destinationIcon = new L.Icon({
    iconUrl:
        "https://cdn-icons-png.flaticon.com/512/149/149060.png",
    iconSize: [35, 35],
    iconAnchor: [17, 35]
});


// ============================================================
// DISTANCE BETWEEN TWO GPS POINTS
// ============================================================

function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) * Math.PI / 180;

    const dLon =
        (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}


// ============================================================
// DISTANCE FROM CAMERA TO ROUTE
// ============================================================

function distancePointToSegment(
    pointLat,
    pointLng,
    startLat,
    startLng,
    endLat,
    endLng
) {

    const x =
        (pointLng - startLng) *
        Math.cos(
            ((startLat + endLat) / 2) *
            Math.PI / 180
        );

    const y =
        pointLat - startLat;

    const dx =
        (endLng - startLng) *
        Math.cos(
            ((startLat + endLat) / 2) *
            Math.PI / 180
        );

    const dy =
        endLat - startLat;

    const lengthSquared =
        dx * dx + dy * dy;

    let t = 0;

    if (lengthSquared !== 0) {

        t =
            (x * dx + y * dy) /
            lengthSquared;

        t =
            Math.max(
                0,
                Math.min(1, t)
            );
    }

    const closestLat =
        startLat + t * dy;

    const closestLng =
        startLng + t * (
            endLng - startLng
        );

    return calculateDistance(
        pointLat,
        pointLng,
        closestLat,
        closestLng
    );
}


// ============================================================
// CAMERA DISTANCE FROM ROUTE
// ============================================================

function getDistanceFromRoute(
    camera,
    routeCoordinates
) {

    if (
        !routeCoordinates ||
        routeCoordinates.length < 2
    ) {
        return Infinity;
    }

    const cameraLat =
        Number(camera.latitude);

    const cameraLng =
        Number(camera.longitude);

    let minimumDistance =
        Infinity;

    for (
        let i = 0;
        i < routeCoordinates.length - 1;
        i++
    ) {

        const start =
            routeCoordinates[i];

        const end =
            routeCoordinates[i + 1];

        const distance =
            distancePointToSegment(
                cameraLat,
                cameraLng,
                Number(start[0]),
                Number(start[1]),
                Number(end[0]),
                Number(end[1])
            );

        minimumDistance =
            Math.min(
                minimumDistance,
                distance
            );
    }

    return minimumDistance;
}


// ============================================================
// CAMERA DISTANCE ALONG ROUTE
// ============================================================

function getDistanceAlongRoute(
    camera,
    routeCoordinates
) {

    if (
        !routeCoordinates ||
        routeCoordinates.length < 2
    ) {
        return Infinity;
    }

    const cameraLat =
        Number(camera.latitude);

    const cameraLng =
        Number(camera.longitude);

    let accumulatedDistance = 0;

    let bestDistance = Infinity;

    let bestRouteDistance = Infinity;

    for (
        let i = 0;
        i < routeCoordinates.length - 1;
        i++
    ) {

        const start =
            routeCoordinates[i];

        const end =
            routeCoordinates[i + 1];

        const segmentDistance =
            calculateDistance(
                Number(start[0]),
                Number(start[1]),
                Number(end[0]),
                Number(end[1])
            );

        const distanceFromSegment =
            distancePointToSegment(
                cameraLat,
                cameraLng,
                Number(start[0]),
                Number(start[1]),
                Number(end[0]),
                Number(end[1])
            );

        if (
            distanceFromSegment <
            bestDistance
        ) {

            bestDistance =
                distanceFromSegment;

            const startToCamera =
                calculateDistance(
                    Number(start[0]),
                    Number(start[1]),
                    cameraLat,
                    cameraLng
                );

            bestRouteDistance =
                accumulatedDistance +
                Math.min(
                    segmentDistance,
                    startToCamera
                );
        }

        accumulatedDistance +=
            segmentDistance;
    }

    return bestRouteDistance;
}


// ============================================================
// ROUTING COMPONENT
// ============================================================

function Routing({
    start,
    destination,
    setRouteCoordinates,
    setRouteDistance,
    setRouteTime
}) {

    const map = useMap();

    useEffect(() => {

        if (!start || !destination) {
            return;
        }

        const routingControl =
            L.Routing.control({

                waypoints: [

                    L.latLng(
                        start.latitude,
                        start.longitude
                    ),

                    L.latLng(
                        destination.latitude,
                        destination.longitude
                    )

                ],

                router:
                    L.Routing.osrmv1({

                        serviceUrl:
                            "https://router.project-osrm.org/route/v1"

                    }),

                addWaypoints: false,

                draggableWaypoints: false,

                routeWhileDragging: false,

                show: false,

                createMarker: () => null,

                lineOptions: {

                    styles: [

                        {
                            color: "#2563eb",
                            weight: 6,
                            opacity: 0.8
                        }

                    ]

                }

            }).addTo(map);


        routingControl.on(
            "routesfound",
            event => {

                const route =
                    event.routes[0];

                console.log(
                    "ROUTE FOUND",
                    route
                );


                const coordinates =
                    route.coordinates.map(
                        point => [
                            point.lat,
                            point.lng
                        ]
                    );


                setRouteCoordinates(
                    coordinates
                );


                setRouteDistance(
                    route.summary.totalDistance / 1000
                );


                setRouteTime(
                    route.summary.totalTime / 60
                );


                const bounds =
                    L.latLngBounds(
                        coordinates
                    );

                map.fitBounds(
                    bounds,
                    {
                        padding: [50, 50]
                    }
                );

            }
        );


        return () => {

            map.removeControl(
                routingControl
            );

        };

    }, [
        map,
        start,
        destination,
        setRouteCoordinates,
        setRouteDistance,
        setRouteTime
    ]);


    return null;
}


// ============================================================
// MAIN COMPONENT
// ============================================================

function CameraMap() {

    const [
        cameras,
        setCameras
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        start,
        setStart
    ] = useState(null);

    const [
        destination,
        setDestination
    ] = useState(null);


    const [
        startText,
        setStartText
    ] = useState("");

    const [
        destinationText,
        setDestinationText
    ] = useState("");


    const [
        routeCoordinates,
        setRouteCoordinates
    ] = useState(null);


    const [
        routeDistance,
        setRouteDistance
    ] = useState(null);


    const [
        routeTime,
        setRouteTime
    ] = useState(null);


    const [
        nearbyCameras,
        setNearbyCameras
    ] = useState([]);


    // ========================================================
    // LOAD CAMERAS
    // ========================================================

    useEffect(() => {

        fetch("/api/cameras")

            .then(response => {

                if (!response.ok) {
                    throw new Error(
                        "Failed to load cameras"
                    );
                }

                return response.json();

            })

            .then(data => {

                console.log(
                    "Loaded cameras:",
                    data.length
                );

                setCameras(data);

                setLoading(false);

            })

            .catch(error => {

                console.error(
                    "Camera loading error:",
                    error
                );

                setLoading(false);

            });

    }, []);


    // ========================================================
    // CAMERA DETECTION
    // ========================================================

    const camerasOnRoute = useMemo(() => {

        if (
            !routeCoordinates ||
            routeCoordinates.length < 2
        ) {
            return [];
        }

        const ROUTE_CORRIDOR_KM =
            0.15;

        return cameras

            .map(camera => {

                const distanceFromRoute =
                    getDistanceFromRoute(
                        camera,
                        routeCoordinates
                    );

                const distanceAlongRoute =
                    getDistanceAlongRoute(
                        camera,
                        routeCoordinates
                    );

                return {

                    ...camera,

                    distanceFromRoute,

                    distanceAlongRoute

                };

            })

            .filter(camera =>
                camera.distanceFromRoute <=
                ROUTE_CORRIDOR_KM
            )

            .sort(
                (a, b) =>
                    a.distanceAlongRoute -
                    b.distanceAlongRoute
            );

    }, [
        cameras,
        routeCoordinates
    ]);


    // Keep state synchronized

    useEffect(() => {

        setNearbyCameras(
            camerasOnRoute
        );

    }, [camerasOnRoute]);


    // ========================================================
    // LOCATION SEARCH
    // ========================================================

    async function geocodeLocation(
        text
    ) {

        if (!text.trim()) {
            return null;
        }

        try {

            const response =
                await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(text)}`
                );

            const data =
                await response.json();

            if (!data.length) {

                alert(
                    `Location not found: ${text}`
                );

                return null;
            }

            return {

                latitude:
                    Number(data[0].lat),

                longitude:
                    Number(data[0].lon),

                name:
                    data[0].display_name

            };

        } catch (error) {

            console.error(
                "Geocoding error:",
                error
            );

            alert(
                "Unable to find location."
            );

            return null;
        }
    }


    // ========================================================
    // CREATE ROUTE
    // ========================================================

    async function createRoute() {

        if (
            !startText.trim() ||
            !destinationText.trim()
        ) {

            alert(
                "Enter both start and destination."
            );

            return;
        }


        setRouteCoordinates(null);

        setNearbyCameras([]);

        const startLocation =
            await geocodeLocation(
                startText
            );

        if (!startLocation) {
            return;
        }


        const destinationLocation =
            await geocodeLocation(
                destinationText
            );

        if (!destinationLocation) {
            return;
        }


        console.log(
            "START:",
            startLocation
        );

        console.log(
            "DESTINATION:",
            destinationLocation
        );


        setStart(
            startLocation
        );

        setDestination(
            destinationLocation
        );

    }


    // ========================================================
    // CURRENT LOCATION
    // ========================================================

    function useCurrentLocation() {

        if (!navigator.geolocation) {

            alert(
                "Geolocation is not supported."
            );

            return;
        }


        navigator.geolocation.getCurrentPosition(

            position => {

                const location = {

                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude,

                    name:
                        "Your current location"

                };

                setStart(location);

                setStartText(
                    `${location.latitude}, ${location.longitude}`
                );

            },

            error => {

                console.error(
                    error
                );

                alert(
                    "Unable to get your location."
                );

            }

        );

    }


    // ========================================================
    // DISTANCE FORMAT
    // ========================================================

    function formatDistance(km) {

        if (km < 1) {

            return `${Math.round(km * 1000)} m`;

        }

        return `${km.toFixed(2)} km`;
    }


    return (

        <div className="camera-map-page">

            <div className="route-panel">

                <h2>
                    🚗 Route Camera Planner
                </h2>


                <div className="route-input">

                    <input
                        type="text"
                        placeholder="Start location"
                        value={startText}
                        onChange={e =>
                            setStartText(
                                e.target.value
                            )
                        }
                    />

                    <button
                        onClick={
                            useCurrentLocation
                        }
                    >
                        📍 My Location
                    </button>

                </div>


                <div className="route-input">

                    <input
                        type="text"
                        placeholder="Destination"
                        value={destinationText}
                        onChange={e =>
                            setDestinationText(
                                e.target.value
                            )
                        }
                    />

                    <button
                        onClick={
                            createRoute
                        }
                    >
                        🚗 Create Route
                    </button>

                </div>


                {routeDistance !== null && (

                    <div className="route-summary">

                        <strong>
                            Route:
                        </strong>{" "}

                        {routeDistance.toFixed(1)}
                        {" km"}

                        {" • "}

                        {Math.round(routeTime)}
                        {" min"}

                    </div>

                )}


                {routeCoordinates && (

                    <div className="camera-route-list">

                        <h3>
                            📷 Cameras on Route
                        </h3>


                        <p>
                            Found{" "}
                            <strong>
                                {nearbyCameras.length}
                            </strong>
                            {" "}cameras
                        </p>


                        {nearbyCameras.map(
                            (camera, index) => (

                                <div
                                    className="route-camera"
                                    key={camera.id}
                                >

                                    <div>

                                        <strong>
                                            {index + 1}.{" "}
                                            {camera.camera_type}
                                        </strong>

                                        <br />

                                        {camera.city}
                                        {camera.state
                                            ? `, ${camera.state}`
                                            : ""}

                                    </div>


                                    <div>

                                        <strong>
                                            {formatDistance(
                                                camera.distanceAlongRoute
                                            )}
                                        </strong>

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}

            </div>


            {loading ? (

                <div className="loading">

                    Loading cameras...

                </div>

            ) : (

                <MapContainer

                    center={[
                        22.9734,
                        78.6569
                    ]}

                    zoom={5}

                    className="camera-map"

                >

                    <TileLayer

                        attribution="&copy; OpenStreetMap contributors"

                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"

                    />


                    {start && (

                        <Marker
                            position={[
                                start.latitude,
                                start.longitude
                            ]}
                            icon={startIcon}
                        >

                            <Popup>

                                <strong>
                                    📍 Start
                                </strong>

                                <br />

                                {start.name}

                            </Popup>

                        </Marker>

                    )}


                    {destination && (

                        <Marker
                            position={[
                                destination.latitude,
                                destination.longitude
                            ]}
                            icon={destinationIcon}
                        >

                            <Popup>

                                <strong>
                                    🏁 Destination
                                </strong>

                                <br />

                                {destination.name}

                            </Popup>

                        </Marker>

                    )}


                    {nearbyCameras.map(
                        camera => (

                            <Marker

                                key={
                                    camera.id
                                }

                                position={[
                                    Number(
                                        camera.latitude
                                    ),
                                    Number(
                                        camera.longitude
                                    )
                                ]}

                                icon={
                                    cameraIcon
                                }

                            >

                                <Popup>

                                    <h3>
                                        📷 Camera
                                    </h3>

                                    <p>
                                        <strong>
                                            Type:
                                        </strong>{" "}
                                        {camera.camera_type}
                                    </p>

                                    <p>
                                        <strong>
                                            City:
                                        </strong>{" "}
                                        {camera.city}
                                    </p>

                                    <p>
                                        <strong>
                                            State:
                                        </strong>{" "}
                                        {camera.state}
                                    </p>

                                    <p>
                                        <strong>
                                            Distance along route:
                                        </strong>{" "}
                                        {formatDistance(
                                            camera.distanceAlongRoute
                                        )}
                                    </p>

                                    <p>
                                        <strong>
                                            Distance from route:
                                        </strong>{" "}
                                        {Math.round(
                                            camera.distanceFromRoute *
                                            1000
                                        )}{" "}
                                        m
                                    </p>

                                </Popup>

                            </Marker>

                        )
                    )}


                    {start && destination && (

                        <Routing

                            start={start}

                            destination={
                                destination
                            }

                            setRouteCoordinates={
                                setRouteCoordinates
                            }

                            setRouteDistance={
                                setRouteDistance
                            }

                            setRouteTime={
                                setRouteTime
                            }

                        />

                    )}

                </MapContainer>

            )}

        </div>

    );

}


export default CameraMap;
