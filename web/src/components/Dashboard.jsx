import {
    useEffect,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import "./Dashboard.css";


const API_URL = "http://127.0.0.1:8000";


function Dashboard() {

    const navigate = useNavigate();


    const [stats, setStats] = useState({

        total: 0,

        speed_cameras: 0,

        red_light_cameras: 0,

        cities: 0,

        verified: 0,

        pending: 0

    });


    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");


    // =====================================================
    // LOAD DASHBOARD DATA
    // =====================================================

    const loadDashboard = async () => {

        try {

            setError("");


            // -------------------------------------------------
            // Get cameras and reports
            // -------------------------------------------------

            const [

                camerasResponse,

                pendingResponse

            ] = await Promise.all([

                fetch(
                    `${API_URL}/api/cameras`
                ),

                fetch(
                    `${API_URL}/api/reports/pending`
                )

            ]);


            if (

                !camerasResponse.ok ||

                !pendingResponse.ok

            ) {

                throw new Error(
                    "Dashboard API request failed"
                );

            }


            // =================================================
            // CAMERAS
            // =================================================

            let camerasData =
                await camerasResponse.json();


            console.log(
                "CAMERAS FROM API:",
                camerasData
            );


            // -------------------------------------------------
            // Normalize API response
            // -------------------------------------------------

            if (!Array.isArray(camerasData)) {

                camerasData =

                    camerasData.cameras ||

                    camerasData.data ||

                    [];

            }


            console.log(
                "NORMALIZED CAMERAS:",
                camerasData
            );


            // =================================================
            // TOTAL CAMERAS
            // =================================================

            const total =
                camerasData.length;


            // =================================================
            // SPEED CAMERAS
            // =================================================

            const speed_cameras =
                camerasData.filter(

                    camera =>

                        String(
                            camera.camera_type || ""
                        )
                            .trim()
                            .toLowerCase()
                            === "speed camera"

                ).length;


            // =================================================
            // RED LIGHT CAMERAS
            // =================================================

            const red_light_cameras =
                camerasData.filter(

                    camera =>

                        String(
                            camera.camera_type || ""
                        )
                            .trim()
                            .toLowerCase()
                            === "red light camera"

                ).length;


            // =================================================
            // VERIFIED CAMERAS
            // =================================================

            const verified =
                camerasData.filter(

                    camera =>

                        String(
                            camera.verification_status || ""
                        )
                            .trim()
                            .toLowerCase()
                            === "verified"

                ).length;


            // =================================================
            // UNIQUE CITIES
            // =================================================

            const uniqueCities = new Set(

                camerasData

                    .map(
                        camera =>
                            String(
                                camera.city || ""
                            )
                                .trim()
                                .toLowerCase()
                    )

                    .filter(
                        city =>
                            city !== ""
                    )

            );


            const cities =
                uniqueCities.size;


            // =================================================
            // PENDING REPORTS
            // =================================================

            const pendingReports =
                await pendingResponse.json();


            let pending = 0;


            if (Array.isArray(pendingReports)) {

                pending =
                    pendingReports.length;

            }

            else if (
                pendingReports &&
                Array.isArray(
                    pendingReports.reports
                )
            ) {

                pending =
                    pendingReports.reports.length;

            }


            // =================================================
            // UPDATE STATE
            // =================================================

            const dashboardStats = {

                total,

                speed_cameras,

                red_light_cameras,

                cities,

                verified,

                pending

            };


            console.log(
                "DASHBOARD STATS:",
                dashboardStats
            );


            setStats(
                dashboardStats
            );


        }


        catch (err) {

            console.error(
                "Dashboard loading error:",
                err
            );


            setError(
                "Unable to load statistics"
            );

        }


        finally {

            setLoading(false);

        }

    };


    // =====================================================
    // INITIAL LOAD + AUTO REFRESH
    // =====================================================

    useEffect(() => {

        loadDashboard();


        const timer =
            setInterval(

                () => {

                    loadDashboard();

                },

                10000

            );


        return () => {

            clearInterval(timer);

        };

    }, []);


    // =====================================================
    // UI
    // =====================================================

    return (

        <div className="dashboard">


            {/* =================================================
                TITLE
            ================================================= */}

            <h1>
                🚦 Camera Statistics
            </h1>


            {/* =================================================
                LOADING / ERROR / STATISTICS
            ================================================= */}

            {

                loading ? (

                    <h3 className="loading">

                        Loading statistics...

                    </h3>

                )

                :

                error ? (

                    <h3 className="loading">

                        {error}

                    </h3>

                )

                :

                (

                    <div className="stats-grid">


                        {/* =====================================
                            TOTAL
                        ===================================== */}

                        <div className="stat-card">

                            <h2>
                                📷
                            </h2>

                            <h3>
                                Total Cameras
                            </h3>

                            <p>
                                {stats.total}
                            </p>

                        </div>


                        {/* =====================================
                            SPEED
                        ===================================== */}

                        <div className="stat-card">

                            <h2>
                                🚗
                            </h2>

                            <h3>
                                Speed Cameras
                            </h3>

                            <p>
                                {stats.speed_cameras}
                            </p>

                        </div>


                        {/* =====================================
                            RED LIGHT
                        ===================================== */}

                        <div className="stat-card">

                            <h2>
                                🚦
                            </h2>

                            <h3>
                                Red Light Cameras
                            </h3>

                            <p>
                                {stats.red_light_cameras}
                            </p>

                        </div>


                        {/* =====================================
                            CITIES
                        ===================================== */}

                        <div className="stat-card">

                            <h2>
                                🏙️
                            </h2>

                            <h3>
                                Cities
                            </h3>

                            <p>
                                {stats.cities}
                            </p>

                        </div>


                        {/* =====================================
                            VERIFIED
                        ===================================== */}

                        <div className="stat-card">

                            <h2>
                                ✅
                            </h2>

                            <h3>
                                Verified
                            </h3>

                            <p>
                                {stats.verified}
                            </p>

                        </div>


                        {/* =====================================
                            PENDING REPORTS
                        ===================================== */}

                        <div className="stat-card">

                            <h2>
                                ⏳
                            </h2>

                            <h3>
                                Pending Reports
                            </h3>

                            <p>
                                {stats.pending}
                            </p>

                        </div>


                    </div>

                )

            }


            {/* =================================================
                NAVIGATION BUTTONS
            ================================================= */}

            <div className="dashboard-buttons">


                <button
                    onClick={() =>
                        navigate("/map")
                    }
                >

                    🗺 View Camera Map

                </button>


                <button
                    onClick={() =>
                        navigate("/pending")
                    }
                >

                    ⏳ Review Reports

                </button>


                <button
                    onClick={() =>
                        navigate("/report")
                    }
                >

                    📢 Report Camera

                </button>


            </div>


        </div>

    );

}


export default Dashboard;