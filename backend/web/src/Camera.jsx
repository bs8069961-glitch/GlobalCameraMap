import {
    useEffect,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import "./CameraMap.css";


// ============================================================
// API
// ============================================================

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// CAMERA MAP
// ============================================================

function CameraMap() {

    const navigate = useNavigate();


    // ========================================================
    // CAMERA DATA
    // ========================================================

    const [cameras, setCameras] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");


    // ========================================================
    // USER LOCATION
    // ========================================================

    const [userLocation, setUserLocation] = useState(null);


    // ========================================================
    // SELECTED CAMERA
    // ========================================================

    const [selectedCamera, setSelectedCamera] = useState(null);


    // ========================================================
    // SEARCH
    // ========================================================

    const [search, setSearch] = useState("");


    // ========================================================
    // CAMERA FILTER
    // ========================================================

    const [cameraType, setCameraType] = useState("all");


    // ========================================================
    // LOAD CAMERAS
    // ========================================================

    const loadCameras = async () => {

        try {

            setLoading(true);

            setError("");


            const response = await fetch(
                `${API_URL}/api/cameras`
            );


            if (!response.ok) {

                throw new Error(
                    `Camera API failed: ${response.status}`
                );

            }


            let data = await response.json();


            console.log(
                "CAMERAS FROM API:",
                data
            );


            // =================================================
            // NORMALIZE API RESPONSE
            // =================================================

            if (!Array.isArray(data)) {

                data =
                    data.cameras ||

                    data.data ||

                    [];

            }


            // =================================================
            // NORMALIZE CAMERA VALUES
            // =================================================

            const normalizedCameras = data.map(
                camera => ({

                    ...camera,

                    latitude:
                        Number(camera.latitude),

                    longitude:
                        Number(camera.longitude),

                    camera_type:
                        camera.camera_type || "Unknown",

                    city:
                        camera.city || "Unknown",

                    state:
                        camera.state || "",

                    road_name:
                        camera.road_name || "Unknown Road",

                    verification_status:
                        camera.verification_status || "pending"

                })
            );


            console.log(
                "NORMALIZED CAMERAS:",
                normalizedCameras
            );


            setCameras(
                normalizedCameras
            );

        }


        catch (err) {

            console.error(
                "Camera loading error:",
                err
            );


            setError(
                "Unable to load cameras"
            );

        }


        finally {

            setLoading(false);

        }

    };


    // ========================================================
    // GET USER LOCATION
    // ========================================================

    const getUserLocation = () => {

        if (!navigator.geolocation) {

            setError(
                "Geolocation is not supported by this browser."
            );

            return;

        }


        navigator.geolocation.getCurrentPosition(

            position => {

                const location = {

                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude

                };


                console.log(
                    "USER LOCATION:",
                    location
                );


                setUserLocation(
                    location
                );

            },


            error => {

                console.error(
                    "Location error:",
                    error
                );


                setError(
                    "Unable to get your location."
                );

            },


            {

                enableHighAccuracy: true,

                timeout: 10000,

                maximumAge: 0

            }

        );

    };


    // ========================================================
    // LOAD DATA ON START
    // ========================================================

    useEffect(() => {

        loadCameras();

        getUserLocation();


        // Refresh camera data every 10 seconds

        const timer = setInterval(

            () => {

                loadCameras();

            },

            10000

        );


        return () => {

            clearInterval(timer);

        };

    }, []);


    // ========================================================
    // CAMERA FILTERING
    // ========================================================

    const filteredCameras = cameras.filter(

        camera => {

            const matchesSearch =

                search.trim() === "" ||

                camera.city
                    .toLowerCase()
                    .includes(
                        search.toLowerCase()
                    ) ||

                camera.state
                    .toLowerCase()
                    .includes(
                        search.toLowerCase()
                    ) ||

                camera.road_name
                    .toLowerCase()
                    .includes(
                        search.toLowerCase()
                    );


            const matchesType =

                cameraType === "all" ||

                camera.camera_type
                    .toLowerCase()
                    .trim()
                    === cameraType;


            return (
                matchesSearch &&
                matchesType
            );

        }

    );


    // ========================================================
    // CAMERA SELECTION
    // ========================================================

    const handleCameraClick = camera => {

        console.log(
            "SELECTED CAMERA:",
            camera
        );


        setSelectedCamera(
            camera
        );

    };


    // ========================================================
    // PLACEHOLDER
    // ========================================================
    //
    // The actual MAP and ROUTE detection will be added
    // in the next parts.
    //
    // ========================================================


    return (

        <div className="camera-map">

            <h1>
                🗺️ Camera Map
            </h1>


            <div className="camera-map-toolbar">

                <button
                    onClick={() => navigate("/dashboard")}
                >
                    🚦 Dashboard
                </button>


                <button
                    onClick={getUserLocation}
                >
                    📍 My Location
                </button>


                <button
                    onClick={() => navigate("/report")}
                >
                    📢 Report Camera
                </button>

            </div>


            <div className="camera-controls">

                <input
                    type="text"
                    placeholder="Search city, state or road..."
                    value={search}
                    onChange={
                        event =>
                            setSearch(
                                event.target.value
                            )
                    }
                />


                <select
                    value={cameraType}
                    onChange={
                        event =>
                            setCameraType(
                                event.target.value
                            )
                    }
                >

                    <option value="all">
                        All Cameras
                    </option>

                    <option value="speed camera">
                        Speed Cameras
                    </option>

                    <option value="red light camera">
                        Red Light Cameras
                    </option>

                    <option value="traffic camera">
                        Traffic Cameras
                    </option>

                </select>

            </div>


            {
                loading && (

                    <p>
                        Loading cameras...
                    </p>

                )
            }


            {
                error && (

                    <p className="error">
                        {error}
                    </p>

                )
            }


            <div className="camera-count">

                Showing{" "}

                <strong>
                    {filteredCameras.length}
                </strong>

                {" "}of{" "}

                <strong>
                    {cameras.length}
                </strong>

                cameras

            </div>


            <div className="camera-list">

                {
                    filteredCameras.map(

                        camera => (

                            <div
                                key={camera.id}
                                className="camera-card"
                                onClick={() =>
                                    handleCameraClick(
                                        camera
                                    )
                                }
                            >

                                <h3>
                                    📷{" "}
                                    {camera.camera_type}
                                </h3>


                                <p>
                                    <strong>
                                        City:
                                    </strong>{" "}
                                    {camera.city}
                                </p>


                                <p>
                                    <strong>
                                        Road:
                                    </strong>{" "}
                                    {camera.road_name}
                                </p>


                                <p>
                                    <strong>
                                        Status:
                                    </strong>{" "}
                                    {camera.verification_status}
                                </p>


                                <p>
                                    <strong>
                                        Coordinates:
                                    </strong>{" "}
                                    {camera.latitude},{" "}
                                    {camera.longitude}
                                </p>

                            </div>

                        )

                    )
                }

            </div>


            {
                selectedCamera && (

                    <div className="selected-camera">

                        <h2>
                            📷 Selected Camera
                        </h2>


                        <p>
                            <strong>
                                Type:
                            </strong>{" "}
                            {selectedCamera.camera_type}
                        </p>


                        <p>
                            <strong>
                                City:
                            </strong>{" "}
                            {selectedCamera.city}
                        </p>


                        <p>
                            <strong>
                                Road:
                            </strong>{" "}
                            {selectedCamera.road_name}
                        </p>


                        <button
                            onClick={() =>
                                setSelectedCamera(null)
                            }
                        >
                            Close
                        </button>

                    </div>

                )
            }

        </div>

    );

}


export default CameraMap;
import {
    useEffect,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    CircleMarker,
    useMap
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import "./CameraMap.css";


// ============================================================
// API
// ============================================================

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// FIX LEAFLET MARKER ICON
// ============================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({

    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"

});


// ============================================================
// MAP CENTER
// ============================================================

const INDIA_CENTER = [
    22.9734,
    78.6569
];


// ============================================================
// CAMERA ICONS
// ============================================================

const speedCameraIcon = new L.DivIcon({

    className: "camera-marker speed-camera-marker",

    html: `
        <div class="camera-marker-icon">
            🚗
        </div>
    `,

    iconSize: [
        36,
        36
    ],

    iconAnchor: [
        18,
        18
    ],

    popupAnchor: [
        0,
        -18
    ]

});


const redLightCameraIcon = new L.DivIcon({

    className: "camera-marker red-light-camera-marker",

    html: `
        <div class="camera-marker-icon">
            🚦
        </div>
    `,

    iconSize: [
        36,
        36
    ],

    iconAnchor: [
        18,
        18
    ],

    popupAnchor: [
        0,
        -18
    ]

});


const trafficCameraIcon = new L.DivIcon({

    className: "camera-marker traffic-camera-marker",

    html: `
        <div class="camera-marker-icon">
            📷
        </div>
    `,

    iconSize: [
        36,
        36
    ],

    iconAnchor: [
        18,
        18
    ],

    popupAnchor: [
        0,
        -18
    ]

});


// ============================================================
// GET CAMERA ICON
// ============================================================

const getCameraIcon = cameraType => {

    const type =
        (cameraType || "")
            .toLowerCase()
            .trim();


    if (
        type === "speed camera"
    ) {

        return speedCameraIcon;

    }


    if (
        type === "red light camera"
    ) {

        return redLightCameraIcon;

    }


    return trafficCameraIcon;

};


// ============================================================
// MAP FLY COMPONENT
// ============================================================

function MapController({
    userLocation
}) {

    const map = useMap();


    useEffect(() => {

        if (!userLocation) {

            return;

        }


        map.flyTo(

            [
                userLocation.latitude,
                userLocation.longitude
            ],

            15,

            {
                duration: 1.5
            }

        );

    }, [
        userLocation,
        map
    ]);


    return null;

}


// ============================================================
// CAMERA MAP
// ============================================================

function CameraMap() {

    const navigate = useNavigate();


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
        error,
        setError
    ] = useState("");


    // ========================================================
    // USER LOCATION
    // ========================================================

    const [
        userLocation,
        setUserLocation
    ] = useState(null);


    // ========================================================
    // SELECTED CAMERA
    // ========================================================

    const [
        selectedCamera,
        setSelectedCamera
    ] = useState(null);


    // ========================================================
    // SEARCH
    // ========================================================

    const [
        search,
        setSearch
    ] = useState("");


    // ========================================================
    // CAMERA FILTER
    // ========================================================

    const [
        cameraType,
        setCameraType
    ] = useState("all");


    // ========================================================
    // LOAD CAMERAS
    // ========================================================

    const loadCameras = async () => {

        try {

            setError("");


            const response =
                await fetch(
                    `${API_URL}/api/cameras`
                );


            if (!response.ok) {

                throw new Error(
                    `Camera API failed: ${response.status}`
                );

            }


            let data =
                await response.json();


            console.log(
                "CAMERAS FROM API:",
                data
            );


            // =================================================
            // NORMALIZE API RESPONSE
            // =================================================

            if (!Array.isArray(data)) {

                data =
                    data.cameras ||

                    data.data ||

                    [];

            }


            // =================================================
            // NORMALIZE CAMERAS
            // =================================================

            const normalizedCameras =
                data

                    .map(camera => ({

                        ...camera,

                        latitude:
                            Number(
                                camera.latitude
                            ),

                        longitude:
                            Number(
                                camera.longitude
                            ),

                        camera_type:
                            camera.camera_type ||
                            "Unknown",

                        city:
                            camera.city ||
                            "Unknown",

                        state:
                            camera.state ||
                            "",

                        road_name:
                            camera.road_name ||
                            "Unknown Road",

                        verification_status:
                            camera.verification_status ||
                            "pending"

                    }))

                    .filter(

                        camera =>

                            Number.isFinite(
                                camera.latitude
                            ) &&

                            Number.isFinite(
                                camera.longitude
                            )

                    );


            console.log(
                "NORMALIZED CAMERAS:",
                normalizedCameras
            );


            setCameras(
                normalizedCameras
            );

        }


        catch (err) {

            console.error(
                "Camera loading error:",
                err
            );


            setError(
                "Unable to load cameras"
            );

        }


        finally {

            setLoading(false);

        }

    };


    // ========================================================
    // GET USER LOCATION
    // ========================================================

    const getUserLocation = () => {

        if (
            !navigator.geolocation
        ) {

            setError(
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
                        position.coords.longitude

                };


                console.log(
                    "USER LOCATION:",
                    location
                );


                setUserLocation(
                    location
                );

            },


            locationError => {

                console.error(
                    "Location error:",
                    locationError
                );


                setError(
                    "Unable to get your location."
                );

            },


            {

                enableHighAccuracy:
                    true,

                timeout:
                    10000,

                maximumAge:
                    0

            }

        );

    };


    // ========================================================
    // INITIAL LOAD
    // ========================================================

    useEffect(() => {

        loadCameras();

        getUserLocation();


        const timer =
            setInterval(

                () => {

                    loadCameras();

                },

                10000

            );


        return () => {

            clearInterval(
                timer
            );

        };

    }, []);


    // ========================================================
    // FILTER CAMERAS
    // ========================================================

    const filteredCameras =
        cameras.filter(

            camera => {

                const searchText =
                    search
                        .trim()
                        .toLowerCase();


                const matchesSearch =

                    searchText === "" ||

                    camera.city
                        .toLowerCase()
                        .includes(
                            searchText
                        ) ||

                    camera.state
                        .toLowerCase()
                        .includes(
                            searchText
                        ) ||

                    camera.road_name
                        .toLowerCase()
                        .includes(
                            searchText
                        );


                const matchesType =

                    cameraType === "all" ||

                    camera.camera_type
                        .toLowerCase()
                        .trim()
                        === cameraType;


                return (

                    matchesSearch &&

                    matchesType

                );

            }

        );


    // ========================================================
    // CAMERA CLICK
    // ========================================================

    const handleCameraClick =
        camera => {

            console.log(
                "SELECTED CAMERA:",
                camera
            );


            setSelectedCamera(
                camera
            );

        };


    // ========================================================
    // UI
    // ========================================================

    return (

        <div className="camera-map">


            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="camera-map-header">

                <div>

                    <h1>
                        🗺️ Global Camera Map
                    </h1>

                    <p>
                        Traffic and enforcement
                        cameras across India
                    </p>

                </div>


                <div className="header-buttons">

                    <button
                        onClick={() =>
                            navigate(
                                "/dashboard"
                            )
                        }
                    >
                        🚦 Dashboard
                    </button>


                    <button
                        onClick={
                            getUserLocation
                        }
                    >
                        📍 My Location
                    </button>


                    <button
                        onClick={() =>
                            navigate(
                                "/report"
                            )
                        }
                    >
                        📢 Report Camera
                    </button>

                </div>

            </div>


            {/* ==================================================
                CONTROLS
            ================================================== */}

            <div className="camera-controls">


                <input
                    type="text"
                    placeholder="Search city, state or road..."
                    value={search}
                    onChange={
                        event =>
                            setSearch(
                                event.target.value
                            )
                    }
                />


                <select
                    value={cameraType}
                    onChange={
                        event =>
                            setCameraType(
                                event.target.value
                            )
                    }
                >

                    <option value="all">
                        All Cameras
                    </option>

                    <option value="speed camera">
                        Speed Cameras
                    </option>

                    <option value="red light camera">
                        Red Light Cameras
                    </option>

                    <option value="traffic camera">
                        Traffic Cameras
                    </option>

                </select>


                <div className="camera-count">

                    Showing{" "}

                    <strong>
                        {filteredCameras.length}
                    </strong>

                    {" "}cameras

                </div>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {
                error && (

                    <div className="error">

                        {error}

                    </div>

                )
            }


            {/* ==================================================
                MAP
            ================================================== */}

            <div className="map-wrapper">

                <MapContainer

                    center={
                        INDIA_CENTER
                    }

                    zoom={5}

                    scrollWheelZoom={
                        true
                    }

                    className="camera-leaflet-map"

                >

                    <TileLayer

                        attribution='&copy; OpenStreetMap contributors'

                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

                    />


                    {/* USER LOCATION */}

                    {
                        userLocation && (

                            <>

                                <CircleMarker

                                    center={[
                                        userLocation.latitude,
                                        userLocation.longitude
                                    ]}

                                    radius={10}

                                    pathOptions={{
                                        color:
                                            "blue",
                                        fillColor:
                                            "blue",
                                        fillOpacity:
                                            0.8
                                    }}

                                >

                                    <Popup>

                                        📍

                                        <strong>
                                            {" "}Your Location
                                        </strong>

                                    </Popup>

                                </CircleMarker>


                                <MapController
                                    userLocation={
                                        userLocation
                                    }
                                />

                            </>

                        )
                    }


                    {/* CAMERA MARKERS */}

                    {
                        filteredCameras.map(

                            camera => (

                                <Marker

                                    key={
                                        camera.id
                                    }

                                    position={[
                                        camera.latitude,
                                        camera.longitude
                                    ]}

                                    icon={
                                        getCameraIcon(
                                            camera.camera_type
                                        )
                                    }

                                    eventHandlers={{

                                        click:
                                            () =>
                                                handleCameraClick(
                                                    camera
                                                )

                                    }}

                                >

                                    <Popup>

                                        <div className="camera-popup">

                                            <h3>

                                                {camera.camera_type}

                                            </h3>


                                            <p>

                                                <strong>
                                                    City:
                                                </strong>{" "}

                                                {camera.city}

                                            </p>


                                            <p>

                                                <strong>
                                                    Road:
                                                </strong>{" "}

                                                {camera.road_name}

                                            </p>


                                            <p>

                                                <strong>
                                                    State:
                                                </strong>{" "}

                                                {camera.state}

                                            </p>


                                            <p>

                                                <strong>
                                                    Verification:
                                                </strong>{" "}

                                                {camera.verification_status}

                                            </p>


                                            <p>

                                                <strong>
                                                    Coordinates:
                                                </strong>

                                                <br />

                                                {camera.latitude},
                                                {" "}
                                                {camera.longitude}

                                            </p>


                                            <button

                                                onClick={() =>
                                                    handleCameraClick(
                                                        camera
                                                    )
                                                }

                                            >

                                                View Camera

                                            </button>

                                        </div>

                                    </Popup>

                                </Marker>

                            )

                        )

                    }

                </MapContainer>


                {/* =================================================
                    LOADING
                ================================================= */}

                {
                    loading && (

                        <div className="map-loading">

                            Loading cameras...

                        </div>

                    )
                }

            </div>


            {/* ==================================================
                SELECTED CAMERA PANEL
            ================================================== */}

            {
                selectedCamera && (

                    <div className="selected-camera-panel">


                        <div>

                            <h2>
                                📷{" "}
                                {
                                    selectedCamera.camera_type
                                }
                            </h2>


                            <p>

                                <strong>
                                    City:
                                </strong>{" "}

                                {
                                    selectedCamera.city
                                }

                            </p>


                            <p>

                                <strong>
                                    Road:
                                </strong>{" "}

                                {
                                    selectedCamera.road_name
                                }

                            </p>


                            <p>

                                <strong>
                                    State:
                                </strong>{" "}

                                {
                                    selectedCamera.state
                                }

                            </p>


                            <p>

                                <strong>
                                    Verification:
                                </strong>{" "}

                                {
                                    selectedCamera.verification_status
                                }

                            </p>

                        </div>


                        <button

                            onClick={() =>
                                setSelectedCamera(
                                    null
                                )
                            }

                        >

                            ✕ Close

                        </button>

                    </div>

                )
            }


        </div>

    );

}


export default CameraMap;
import {
    useEffect,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    CircleMarker,
    Polyline,
    useMap
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import "./CameraMap.css";


// ============================================================
// API
// ============================================================

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// LEAFLET MARKER FIX
// ============================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({

    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"

});


// ============================================================
// MAP CENTER
// ============================================================

const INDIA_CENTER = [
    22.9734,
    78.6569
];


// ============================================================
// CAMERA ICONS
// ============================================================

const speedCameraIcon = new L.DivIcon({

    className:
        "camera-marker speed-camera-marker",

    html: `
        <div class="camera-marker-icon">
            🚗
        </div>
    `,

    iconSize: [
        36,
        36
    ],

    iconAnchor: [
        18,
        18
    ]

});


const redLightCameraIcon = new L.DivIcon({

    className:
        "camera-marker red-light-camera-marker",

    html: `
        <div class="camera-marker-icon">
            🚦
        </div>
    `,

    iconSize: [
        36,
        36
    ],

    iconAnchor: [
        18,
        18
    ]

});


const trafficCameraIcon = new L.DivIcon({

    className:
        "camera-marker traffic-camera-marker",

    html: `
        <div class="camera-marker-icon">
            📷
        </div>
    `,

    iconSize: [
        36,
        36
    ],

    iconAnchor: [
        18,
        18
    ]

});


// ============================================================
// GET CAMERA ICON
// ============================================================

const getCameraIcon = cameraType => {

    const type =
        (cameraType || "")
            .toLowerCase()
            .trim();


    if (
        type === "speed camera"
    ) {

        return speedCameraIcon;

    }


    if (
        type === "red light camera"
    ) {

        return redLightCameraIcon;

    }


    return trafficCameraIcon;

};


// ============================================================
// ROUTE MAP CONTROLLER
// ============================================================

function RouteMapController({
    route
}) {

    const map = useMap();


    useEffect(() => {

        if (
            !route ||
            route.length === 0
        ) {

            return;

        }


        const bounds =
            L.latLngBounds(
                route
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

    }, [
        route,
        map
    ]);


    return null;

}


// ============================================================
// CAMERA MAP
// ============================================================

function CameraMap() {

    const navigate =
        useNavigate();


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
        error,
        setError
    ] = useState("");


    // ========================================================
    // USER LOCATION
    // ========================================================

    const [
        userLocation,
        setUserLocation
    ] = useState(null);


    // ========================================================
    // SELECTED CAMERA
    // ========================================================

    const [
        selectedCamera,
        setSelectedCamera
    ] = useState(null);


    // ========================================================
    // SEARCH
    // ========================================================

    const [
        search,
        setSearch
    ] = useState("");


    // ========================================================
    // CAMERA TYPE
    // ========================================================

    const [
        cameraType,
        setCameraType
    ] = useState("all");


    // ========================================================
    // ROUTE INPUTS
    // ========================================================

    const [
        startLocation,
        setStartLocation
    ] = useState("");


    const [
        destination,
        setDestination
    ] = useState("");


    // ========================================================
    // ROUTE
    // ========================================================

    const [
        route,
        setRoute
    ] = useState([]);


    // ========================================================
    // ROUTE CAMERAS
    // ========================================================

    const [
        routeCameras,
        setRouteCameras
    ] = useState([]);


    const [
        routeLoading,
        setRouteLoading
    ] = useState(false);


    const [
        routeError,
        setRouteError
    ] = useState("");


    // ========================================================
    // ROUTE DISTANCE
    // ========================================================

    const [
        routeDistance,
        setRouteDistance
    ] = useState(0);


    // ========================================================
    // LOAD CAMERAS
    // ========================================================

    const loadCameras = async () => {

        try {

            setError("");


            const response =
                await fetch(
                    `${API_URL}/api/cameras`
                );


            if (!response.ok) {

                throw new Error(
                    `Camera API failed: ${response.status}`
                );

            }


            let data =
                await response.json();


            console.log(
                "CAMERAS FROM API:",
                data
            );


            if (
                !Array.isArray(data)
            ) {

                data =
                    data.cameras ||

                    data.data ||

                    [];

            }


            const normalizedCameras =
                data

                    .map(camera => ({

                        ...camera,

                        latitude:
                            Number(
                                camera.latitude
                            ),

                        longitude:
                            Number(
                                camera.longitude
                            ),

                        camera_type:
                            camera.camera_type ||
                            "Unknown",

                        city:
                            camera.city ||
                            "Unknown",

                        state:
                            camera.state ||
                            "",

                        road_name:
                            camera.road_name ||
                            "Unknown Road",

                        verification_status:
                            camera.verification_status ||
                            "pending"

                    }))

                    .filter(

                        camera =>

                            Number.isFinite(
                                camera.latitude
                            ) &&

                            Number.isFinite(
                                camera.longitude
                            )

                    );


            setCameras(
                normalizedCameras
            );

        }


        catch (err) {

            console.error(
                "Camera loading error:",
                err
            );


            setError(
                "Unable to load cameras"
            );

        }


        finally {

            setLoading(false);

        }

    };


    // ========================================================
    // GET USER LOCATION
    // ========================================================

    const getUserLocation = () => {

        if (
            !navigator.geolocation
        ) {

            setError(
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
                        position.coords.longitude

                };


                setUserLocation(
                    location
                );


                // Use current location
                // as starting point

                setStartLocation(
                    `${location.latitude}, ${location.longitude}`
                );

            },


            locationError => {

                console.error(
                    "Location error:",
                    locationError
                );


                setError(
                    "Unable to get your location."
                );

            },


            {

                enableHighAccuracy:
                    true,

                timeout:
                    10000,

                maximumAge:
                    0

            }

        );

    };


    // ========================================================
    // GEOCODING
    // ========================================================

    const geocodeLocation =
        async locationText => {

            const response =
                await fetch(

                    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationText)}`

                );


            if (
                !response.ok
            ) {

                throw new Error(
                    "Location search failed"
                );

            }


            const data =
                await response.json();


            if (
                !data ||
                data.length === 0
            ) {

                throw new Error(
                    `Location not found: ${locationText}`
                );

            }


            return {

                latitude:
                    Number(
                        data[0].lat
                    ),

                longitude:
                    Number(
                        data[0].lon
                    )

            };

        };


    // ========================================================
    // HAVERSINE DISTANCE
    // ========================================================

    const calculateDistance =
        (
            lat1,
            lon1,
            lat2,
            lon2
        ) => {

            const R =
                6371;


            const dLat =
                (
                    lat2 -
                    lat1
                ) *
                Math.PI /
                180;


            const dLon =
                (
                    lon2 -
                    lon1
                ) *
                Math.PI /
                180;


            const a =

                Math.sin(
                    dLat / 2
                ) ** 2 +

                Math.cos(
                    lat1 *
                    Math.PI /
                    180
                ) *

                Math.cos(
                    lat2 *
                    Math.PI /
                    180
                ) *

                Math.sin(
                    dLon / 2
                ) ** 2;


            const c =
                2 *
                Math.atan2(
                    Math.sqrt(a),
                    Math.sqrt(1 - a)
                );


            return R * c;

        };


    // ========================================================
    // FIND CAMERAS NEAR ROUTE
    // ========================================================

    const findRouteCameras =
        routePoints => {

            if (
                !routePoints ||
                routePoints.length === 0
            ) {

                return [];

            }


            const CAMERA_DISTANCE_KM =
                0.5;


            const matches = [];


            cameras.forEach(camera => {

                let closestDistance =
                    Infinity;


                routePoints.forEach(
                    point => {

                        const distance =
                            calculateDistance(

                                point[0],
                                point[1],

                                camera.latitude,
                                camera.longitude

                            );


                        if (
                            distance <
                            closestDistance
                        ) {

                            closestDistance =
                                distance;

                        }

                    }
                );


                if (
                    closestDistance <=
                    CAMERA_DISTANCE_KM
                ) {

                    matches.push({

                        ...camera,

                        route_distance_km:
                            closestDistance

                    });

                }

            });


            return matches.sort(

                (
                    a,
                    b
                ) =>

                    a.route_distance_km -
                    b.route_distance_km

            );

        };


    // ========================================================
    // BUILD ROUTE
    // ========================================================

    const calculateRoute =
        async () => {

            try {

                setRouteError("");

                setRouteLoading(true);

                setRoute([]);

                setRouteCameras([]);

                setRouteDistance(0);


                if (
                    !startLocation.trim()
                ) {

                    throw new Error(
                        "Please enter a starting location."
                    );

                }


                if (
                    !destination.trim()
                ) {

                    throw new Error(
                        "Please enter a destination."
                    );

                }


                console.log(
                    "START:",
                    startLocation
                );


                console.log(
                    "DESTINATION:",
                    destination
                );


                // =================================================
                // GEOCODE START
                // =================================================

                const start =
                    await geocodeLocation(
                        startLocation
                    );


                // =================================================
                // GEOCODE DESTINATION
                // =================================================

                const end =
                    await geocodeLocation(
                        destination
                    );


                console.log(
                    "START COORDINATES:",
                    start
                );


                console.log(
                    "DESTINATION COORDINATES:",
                    end
                );


                // =================================================
                // OSRM ROUTING
                // =================================================

                const routeResponse =
                    await fetch(

                        `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`

                    );


                if (
                    !routeResponse.ok
                ) {

                    throw new Error(
                        "Route service failed."
                    );

                }


                const routeData =
                    await routeResponse.json();


                if (
                    routeData.code !==
                    "Ok" ||

                    !routeData.routes ||

                    routeData.routes.length === 0
                ) {

                    throw new Error(
                        "No route found."
                    );

                }


                const selectedRoute =
                    routeData.routes[0];


                // =================================================
                // GEOJSON COORDINATES
                // =================================================

                const coordinates =
                    selectedRoute
                        .geometry
                        .coordinates;


                const leafletRoute =
                    coordinates.map(

                        coordinate => [

                            coordinate[1],
                            coordinate[0]

                        ]

                    );


                setRoute(
                    leafletRoute
                );


                // =================================================
                // DISTANCE
                // =================================================

                setRouteDistance(

                    selectedRoute.distance /
                    1000

                );


                // =================================================
                // FIND CAMERAS
                // =================================================

                const camerasOnRoute =
                    findRouteCameras(
                        leafletRoute
                    );


                console.log(
                    "CAMERAS ON ROUTE:",
                    camerasOnRoute
                );


                setRouteCameras(
                    camerasOnRoute
                );


            }


            catch (err) {

                console.error(
                    "Route calculation error:",
                    err
                );


                setRouteError(
                    err.message ||
                    "Unable to calculate route."
                );

            }


            finally {

                setRouteLoading(false);

            }

        };


    // ========================================================
    // CLEAR ROUTE
    // ========================================================

    const clearRoute = () => {

        setRoute([]);

        setRouteCameras([]);

        setRouteDistance(0);

        setRouteError("");

    };


    // ========================================================
    // INITIAL LOAD
    // ========================================================

    useEffect(() => {

        loadCameras();

        getUserLocation();


        const timer =
            setInterval(

                () => {

                    loadCameras();

                },

                10000

            );


        return () => {

            clearInterval(
                timer
            );

        };

    }, []);


    // ========================================================
    // CAMERA FILTER
    // ========================================================

    const filteredCameras =
        cameras.filter(

            camera => {

                const searchText =
                    search
                        .trim()
                        .toLowerCase();


                const matchesSearch =

                    searchText === "" ||

                    camera.city
                        .toLowerCase()
                        .includes(
                            searchText
                        ) ||

                    camera.state
                        .toLowerCase()
                        .includes(
                            searchText
                        ) ||

                    camera.road_name
                        .toLowerCase()
                        .includes(
                            searchText
                        );


                const matchesType =

                    cameraType === "all" ||

                    camera.camera_type
                        .toLowerCase()
                        .trim()
                        === cameraType;


                return (
                    matchesSearch &&
                    matchesType
                );

            }

        );


    // ========================================================
    // DISPLAYED CAMERAS
    // ========================================================

    const displayedCameras =

        route.length > 0

            ? routeCameras

            : filteredCameras;


    // ========================================================
    // UI
    // ========================================================

    return (

        <div className="camera-map">


            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="camera-map-header">

                <div>

                    <h1>
                        🗺️ Camera Map
                    </h1>

                    <p>
                        Find traffic cameras along
                        your route
                    </p>

                </div>


                <div className="header-buttons">

                    <button
                        onClick={() =>
                            navigate(
                                "/dashboard"
                            )
                        }
                    >
                        🚦 Dashboard
                    </button>


                    <button
                        onClick={
                            getUserLocation
                        }
                    >
                        📍 My Location
                    </button>


                    <button
                        onClick={() =>
                            navigate(
                                "/report"
                            )
                        }
                    >
                        📢 Report Camera
                    </button>

                </div>

            </div>


            {/* ==================================================
                ROUTE SEARCH
            ================================================== */}

            <div className="route-panel">

                <h2>
                    🛣️ Find Cameras On Your Route
                </h2>


                <div className="route-inputs">


                    <div className="route-input-group">

                        <label>
                            Starting Location
                        </label>

                        <input

                            type="text"

                            value={
                                startLocation
                            }

                            onChange={
                                event =>
                                    setStartLocation(
                                        event.target.value
                                    )
                            }

                            placeholder="Example: Chandigarh"

                        />

                    </div>


                    <div className="route-input-group">

                        <label>
                            Destination
                        </label>

                        <input

                            type="text"

                            value={
                                destination
                            }

                            onChange={
                                event =>
                                    setDestination(
                                        event.target.value
                                    )
                            }

                            placeholder="Example: Mohali"

                        />

                    </div>


                    <button

                        className="route-button"

                        onClick={
                            calculateRoute
                        }

                        disabled={
                            routeLoading
                        }

                    >

                        {
                            routeLoading
                                ? "Finding Route..."
                                : "🚗 Find Route"
                        }

                    </button>


                    {
                        route.length > 0 && (

                            <button

                                className="clear-route-button"

                                onClick={
                                    clearRoute
                                }

                            >

                                ✕ Clear Route

                            </button>

                        )
                    }

                </div>


                {
                    routeError && (

                        <div className="route-error">

                            {routeError}

                        </div>

                    )
                }


                {
                    route.length > 0 && (

                        <div className="route-summary">

                            <div>

                                🛣️

                                <strong>
                                    {" "}
                                    Route Distance:
                                </strong>

                                {" "}

                                {
                                    routeDistance.toFixed(
                                        1
                                    )
                                }

                                {" "}km

                            </div>


                            <div>

                                📷

                                <strong>
                                    {" "}
                                    Cameras Near Route:
                                </strong>

                                {" "}

                                {
                                    routeCameras.length
                                }

                            </div>

                        </div>

                    )
                }

            </div>


            {/* ==================================================
                SEARCH + FILTER
            ================================================== */}

            <div className="camera-controls">

                <input

                    type="text"

                    placeholder="Search city, state or road..."

                    value={
                        search
                    }

                    onChange={
                        event =>
                            setSearch(
                                event.target.value
                            )
                    }

                />


                <select

                    value={
                        cameraType
                    }

                    onChange={
                        event =>
                            setCameraType(
                                event.target.value
                            )
                    }

                >

                    <option value="all">
                        All Cameras
                    </option>

                    <option value="speed camera">
                        Speed Cameras
                    </option>

                    <option value="red light camera">
                        Red Light Cameras
                    </option>

                    <option value="traffic camera">
                        Traffic Cameras
                    </option>

                </select>


                <div className="camera-count">

                    {
                        route.length > 0
                            ? "Route cameras: "
                            : "Showing: "
                    }

                    <strong>
                        {
                            displayedCameras.length
                        }
                    </strong>

                </div>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {
                error && (

                    <div className="error">

                        {error}

                    </div>

                )
            }


            {/* ==================================================
                MAP
            ================================================== */}

            <div className="map-wrapper">

                <MapContainer

                    center={
                        INDIA_CENTER
                    }

                    zoom={5}

                    scrollWheelZoom={
                        true
                    }

                    className="camera-leaflet-map"

                >

                    <TileLayer

                        attribution='&copy; OpenStreetMap contributors'

                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

                    />


                    {/* =================================================
                        ROUTE
                    ================================================= */}

                    {
                        route.length > 0 && (

                            <>

                                <Polyline

                                    positions={
                                        route
                                    }

                                    pathOptions={{
                                        color:
                                            "#2563eb",

                                        weight:
                                            6,

                                        opacity:
                                            0.8
                                    }}

                                />


                                <Marker

                                    position={
                                        route[0]
                                    }

                                >

                                    <Popup>

                                        🟢

                                        <strong>
                                            {" "}Starting Location
                                        </strong>

                                    </Popup>

                                </Marker>


                                <Marker

                                    position={
                                        route[
                                            route.length - 1
                                        ]
                                    }

                                >

                                    <Popup>

                                        🔴

                                        <strong>
                                            {" "}Destination
                                        </strong>

                                    </Popup>

                                </Marker>


                                <RouteMapController

                                    route={
                                        route
                                    }

                                />

                            </>

                        )
                    }


                    {/* =================================================
                        USER LOCATION
                    ================================================= */}

                    {
                        userLocation && (

                            <CircleMarker

                                center={[
                                    userLocation.latitude,
                                    userLocation.longitude
                                ]}

                                radius={8}

                                pathOptions={{
                                    color:
                                        "blue",

                                    fillColor:
                                        "blue",

                                    fillOpacity:
                                        0.8
                                }}

                            >

                                <Popup>

                                    📍

                                    <strong>
                                        {" "}Your Location
                                    </strong>

                                </Popup>

                            </CircleMarker>

                        )
                    }


                    {/* =================================================
                        CAMERA MARKERS
                    ================================================= */}

                    {
                        displayedCameras.map(

                            camera => (

                                <Marker

                                    key={
                                        camera.id
                                    }

                                    position={[
                                        camera.latitude,
                                        camera.longitude
                                    ]}

                                    icon={
                                        getCameraIcon(
                                            camera.camera_type
                                        )
                                    }

                                    eventHandlers={{

                                        click:
                                            () =>
                                                setSelectedCamera(
                                                    camera
                                                )

                                    }}

                                >

                                    <Popup>

                                        <div className="camera-popup">

                                            <h3>

                                                {
                                                    camera.camera_type
                                                }

                                            </h3>


                                            <p>

                                                <strong>
                                                    City:
                                                </strong>

                                                {" "}

                                                {
                                                    camera.city
                                                }

                                            </p>


                                            <p>

                                                <strong>
                                                    Road:
                                                </strong>

                                                {" "}

                                                {
                                                    camera.road_name
                                                }

                                            </p>


                                            <p>

                                                <strong>
                                                    State:
                                                </strong>

                                                {" "}

                                                {
                                                    camera.state
                                                }

                                            </p>


                                            <p>

                                                <strong>
                                                    Verification:
                                                </strong>

                                                {" "}

                                                {
                                                    camera.verification_status
                                                }

                                            </p>


                                            {
                                                route.length > 0 && (

                                                    <p>

                                                        <strong>
                                                            Distance from route:
                                                        </strong>

                                                        {" "}

                                                        {
                                                            camera.route_distance_km.toFixed(
                                                                2
                                                            )
                                                        }

                                                        {" "}km

                                                    </p>

                                                )
                                            }

                                        </div>

                                    </Popup>

                                </Marker>

                            )

                        )

                    }

                </MapContainer>


                {
                    loading && (

                        <div className="map-loading">

                            Loading cameras...

                        </div>

                    )
                }

            </div>


            {/* ==================================================
                ROUTE CAMERA LIST
            ================================================== */}

            {
                route.length > 0 && (

                    <div className="route-camera-list">

                        <h2>
                            📷 Cameras Detected On Route
                        </h2>


                        {
                            routeCameras.length === 0 ? (

                                <div className="no-route-cameras">

                                    No cameras found within
                                    500 meters of this route.

                                </div>

                            ) : (

                                <div className="route-camera-grid">

                                    {
                                        routeCameras.map(

                                            camera => (

                                                <div

                                                    className="route-camera-card"

                                                    key={
                                                        camera.id
                                                    }

                                                    onClick={() =>
                                                        setSelectedCamera(
                                                            camera
                                                        )
                                                    }

                                                >

                                                    <div className="route-camera-icon">

                                                        {
                                                            camera.camera_type
                                                                .toLowerCase()
                                                                .includes(
                                                                    "speed"
                                                                )
                                                                ? "🚗"
                                                                : camera.camera_type
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        "red"
                                                                    )
                                                                    ? "🚦"
                                                                    : "📷"
                                                        }

                                                    </div>


                                                    <div>

                                                        <h3>
                                                            {
                                                                camera.camera_type
                                                            }
                                                        </h3>


                                                        <p>
                                                            {
                                                                camera.city
                                                            }
                                                        </p>


                                                        <p>
                                                            {
                                                                camera.road_name
                                                            }
                                                        </p>


                                                        <small>

                                                            {
                                                                camera.route_distance_km.toFixed(
                                                                    2
                                                                )
                                                            }

                                                            {" "}km from route

                                                        </small>

                                                    </div>

                                                </div>

                                            )

                                        )
                                    }

                                </div>

                            )
                        }

                    </div>

                )
            }


            {/* ==================================================
                SELECTED CAMERA
            ================================================== */}

            {
                selectedCamera && (

                    <div className="selected-camera-panel">

                        <div>

                            <h2>

                                📷

                                {" "}

                                {
                                    selectedCamera.camera_type
                                }

                            </h2>


                            <p>

                                <strong>
                                    City:
                                </strong>

                                {" "}

                                {
                                    selectedCamera.city
                                }

                            </p>


                            <p>

                                <strong>
                                    Road:
                                </strong>

                                {" "}

                                {
                                    selectedCamera.road_name
                                }

                            </p>


                            <p>

                                <strong>
                                    State:
                                </strong>

                                {" "}

                                {
                                    selectedCamera.state
                                }

                            </p>


                            <p>

                                <strong>
                                    Verification:
                                </strong>

                                {" "}

                                {
                                    selectedCamera.verification_status
                                }

                            </p>

                        </div>


                        <button

                            onClick={() =>
                                setSelectedCamera(
                                    null
                                )
                            }

                        >

                            ✕ Close

                        </button>

                    </div>

                )
            }

        </div>

    );

}


export default CameraMap;