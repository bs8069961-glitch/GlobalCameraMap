import { useEffect, useState } from "react";

import "./Dashboard.css";



function AdminDashboard(){


    const [stats,setStats]=useState({

        total:0,

        speed_cameras:0,

        red_light_cameras:0,

        cities:0

    });



    const [reports,setReports]=useState([]);






    const loadDashboard=async()=>{


        try{


            const statsResponse = await fetch(

                "http://127.0.0.1:8000/api/stats"

            );



            const statsData = await statsResponse.json();





            const cameraResponse = await fetch(

                "http://127.0.0.1:8000/api/cameras"

            );



            const cameras = await cameraResponse.json();





            const reportResponse = await fetch(

                "http://127.0.0.1:8000/api/reports"

            );



            const reportData = await reportResponse.json();





            const cities = new Set(

                cameras.map(

                    camera=>camera.city

                )

            ).size;





            setStats({


                total:statsData.total || 0,


                speed_cameras:

                    statsData.speed_cameras || 0,


                red_light_cameras:

                    statsData.red_light_cameras || 0,


                cities


            });





            setReports(reportData);



        }



        catch(error){


            console.log(

                "Dashboard loading error",

                error

            );


        }


    };







    useEffect(()=>{


        loadDashboard();



        const timer=setInterval(()=>{


            loadDashboard();


        },10000);



        return ()=>clearInterval(timer);



    },[]);








    return (

        <div className="dashboard-page">


            <h1>

                🚦 Camera Statistics

            </h1>







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

                    Cities

                    </h2>

                    <p>

                    {stats.cities}

                    </p>


                </div>



            </div>









            <div className="dashboard-actions">


                <a href="/map">

                    🗺 View Camera Map

                </a>



                <a href="/pending">

                    ⏳ Review Reports

                    {" "}

                    ({reports.length})

                </a>




                <a href="/report">

                    📢 Report Camera

                </a>


            </div>





        </div>

    );



}



export default AdminDashboard;