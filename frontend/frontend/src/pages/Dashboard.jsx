import { useEffect, useState } from "react";

import {
    Link
} from "react-router-dom";

import "./Dashboard.css";



function Dashboard(){


    const [stats,setStats] = useState({

        total:0,

        speed_cameras:0,

        red_light_cameras:0

    });



    const [error,setError] = useState("");





    useEffect(()=>{


        fetch(

            "http://127.0.0.1:8000/api/stats"

        )

        .then(res=>{


            if(!res.ok){

                throw new Error(
                    "Unable to load statistics"
                );

            }


            return res.json();


        })


        .then(data=>{


            console.log(
                "Statistics:",
                data
            );


            setStats(data);


        })


        .catch(err=>{


            console.log(
                err
            );


            setError(
                "Unable to load statistics"
            );


        });



    },[]);







    return (


        <div className="dashboard">



            <h1>
                🚦 Camera Statistics
            </h1>





            {
                error &&

                <p className="error">

                    {error}

                </p>

            }







            <div className="stats-container">



                <div className="stat-card">


                    <h2>
                        Total Cameras
                    </h2>


                    <p>
                        {stats.total}
                    </p>


                </div>





                <div className="stat-card">


                    <h2>
                        Speed Cameras
                    </h2>


                    <p>
                        {stats.speed_cameras}
                    </p>


                </div>







                <div className="stat-card">


                    <h2>
                        Red Light Cameras
                    </h2>


                    <p>
                        {stats.red_light_cameras}
                    </p>


                </div>





                <div className="stat-card">


                    <h2>
                        Total Types
                    </h2>


                    <p>
                        {
                            stats.speed_cameras > 0 ||
                            stats.red_light_cameras > 0

                            ?

                            2

                            :

                            0
                        }

                    </p>


                </div>




            </div>







            <div className="dashboard-actions">


                <Link

                    to="/map"

                    className="dashboard-btn"

                >

                    🗺 View Camera Map


                </Link>






                <Link

                    to="/pending"

                    className="dashboard-btn"

                >

                    ⏳ Review Reports


                </Link>






                <Link

                    to="/report"

                    className="dashboard-btn"

                >

                    📢 Report Camera


                </Link>



            </div>





        </div>


    );


}



export default Dashboard;