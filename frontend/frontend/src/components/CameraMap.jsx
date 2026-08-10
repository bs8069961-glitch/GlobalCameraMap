import { useEffect, useState } from "react";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import "./CameraMap.css";



// ================================
// Marker Icons
// ================================

const speedIcon = new L.Icon({

    iconUrl:
        "https://cdn-icons-png.flaticon.com/512/854/854878.png",

    iconSize:[35,35],

});



const redIcon = new L.Icon({

    iconUrl:
        "https://cdn-icons-png.flaticon.com/512/2554/2554978.png",

    iconSize:[35,35],

});





function CameraMap(){


    const [cameras,setCameras] = useState([]);

    const [loading,setLoading] = useState(true);





    // ================================
    // LOAD CAMERAS
    // ================================


    useEffect(()=>{


        fetch(
            "http://127.0.0.1:8000/api/cameras"
        )

        .then(response=>response.json())

        .then(data=>{


            console.log(
                "Camera Data:",
                data
            );


            setCameras(data);


            setLoading(false);


        })


        .catch(error=>{


            console.log(
                "Camera loading error",
                error
            );


            setLoading(false);


        });



    },[]);





    return (

        <div className="camera-map-page">


            <h2>
                🗺 Camera Map
            </h2>



            {
                loading ?

                <h3>
                    Loading cameras...
                </h3>

                :

                <h3>

                    Total Cameras:
                    {" "}
                    {cameras.length}

                </h3>

            }






            <MapContainer


                center={[22.9734,78.6569]}

                zoom={5}

                className="camera-map"



            >


                <TileLayer

                    url=
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

                />





                {

                    cameras.map(camera=>(


                        <Marker


                            key={camera.id}


                            position={[

                                camera.latitude,

                                camera.longitude

                            ]}


                            icon={

                                camera.camera_type === "Speed Camera"

                                ?

                                speedIcon

                                :

                                redIcon

                            }


                        >



                            <Popup>


                                <h3>

                                    📍 {camera.city}

                                </h3>


                                <p>

                                    <b>
                                    State:
                                    </b>

                                    {" "}

                                    {camera.state}

                                </p>



                                <p>

                                    <b>
                                    Type:
                                    </b>

                                    {" "}

                                    {camera.camera_type}

                                </p>



                                <p>

                                    <b>
                                    Latitude:
                                    </b>

                                    {" "}

                                    {camera.latitude}

                                </p>



                                <p>

                                    <b>
                                    Longitude:
                                    </b>

                                    {" "}

                                    {camera.longitude}

                                </p>



                            </Popup>



                        </Marker>


                    ))

                }





            </MapContainer>



        </div>

    );


}



export default CameraMap;