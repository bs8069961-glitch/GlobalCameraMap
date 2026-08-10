import {
    BrowserRouter,
    Routes,
    Route,
    Link
} from "react-router-dom";

import {
    useEffect,
    useState
} from "react";


import Dashboard from "./components/Dashboard";
import CameraMap from "./components/CameraMap";
import PendingCameras from "./components/PendingCameras";
import ReportCamera from "./components/ReportCamera";


import "./App.css";



const API_URL = "http://127.0.0.1:8000";



function App() {


    const [pendingCount, setPendingCount] = useState(0);





    // ============================================================
    // LOAD PENDING REPORT COUNT
    // ============================================================

    const loadPendingCount = async () => {


        try {


            const response = await fetch(

                `${API_URL}/api/reports/pending`

            );



            if (!response.ok) {


                throw new Error(

                    `Pending API Error: ${response.status}`

                );


            }





            const data = await response.json();





            console.log(

                "PENDING REPORT DATA:",

                data

            );






            const reports = Array.isArray(data)

                ? data

                : [];






            setPendingCount(

                reports.length

            );





        }


        catch(error) {


            console.error(

                "Pending count loading error:",

                error

            );



            setPendingCount(0);



        }


    };









    // ============================================================
    // LOAD WHEN APP STARTS + AUTO REFRESH
    // ============================================================

    useEffect(() => {


        loadPendingCount();




        const interval = setInterval(() => {


            loadPendingCount();



        }, 10000);






        return () => {


            clearInterval(interval);


        };



    }, []);









    return (

        <BrowserRouter>



            {/* ================= HEADER ================= */}


            <header className="header">


                <div className="header-left">


                    <h1>

                        🌍 Global Camera Map

                    </h1>


                </div>







                <nav className="header-right">





                    <Link

                        className="nav-link"

                        to="/dashboard"

                    >

                        🚦 Dashboard


                    </Link>








                    <Link

                        className="nav-link"

                        to="/map"

                    >

                        🗺️ Camera Map


                    </Link>








                    <Link

                        className="nav-link"

                        to="/pending"

                    >

                        ⏳ Pending Reports

<span className="badge">

    {pendingCount}

</span>
                    </Link>








                    <Link

                        className="nav-link"

                        to="/report"

                    >

                        📢 Report Camera


                    </Link>





                </nav>



            </header>









            {/* ================= CONTENT ================= */}


            <main className="page-container">


                <Routes>




                    <Route

                        path="/"

                        element={

                            <Dashboard />

                        }

                    />







                    <Route

                        path="/dashboard"

                        element={

                            <Dashboard />

                        }

                    />








                    <Route

                        path="/map"

                        element={

                            <CameraMap />

                        }

                    />








                    <Route

                        path="/pending"

                        element={

                            <PendingCameras />

                        }

                    />








                    <Route

                        path="/report"

                        element={

                            <ReportCamera />

                        }

                    />





                </Routes>


            </main>




        </BrowserRouter>

    );


}



export default App;