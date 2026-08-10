import { useEffect, useState } from "react";

import "./AdminPanel.css";



const API_URL = "http://127.0.0.1:8000";



function AdminPanel(){


    const [cameras,setCameras] = useState([]);


    const [loading,setLoading] = useState(true);


    const [message,setMessage] = useState("");




    const [form,setForm] = useState({


        country:"India",

        state:"",

        city:"",

        location:"",

        road_name:"",

        latitude:"",

        longitude:"",

        camera_type:"Speed Camera",

        speed_limit:"",

        status:"Active"


    });







    // =========================
    // LOAD CAMERAS
    // =========================


    const loadCameras = async()=>{


        try{


            const response = await fetch(

                `${API_URL}/api/cameras`

            );



            const data = await response.json();



            setCameras(data);



        }


        catch(error){


            console.log(

                "Camera loading error",

                error

            );


            setMessage(

                "Unable to load cameras"

            );


        }


        finally{


            setLoading(false);


        }


    };









    // =========================
    // INPUT CHANGE
    // =========================


    const handleChange=(e)=>{


        setForm({

            ...form,

            [e.target.name]:e.target.value

        });


    };









    // =========================
    // ADD CAMERA
    // =========================


    const addCamera = async(e)=>{


        e.preventDefault();



        try{


            const response = await fetch(

                `${API_URL}/api/cameras`,

                {


                    method:"POST",


                    headers:{


                        "Content-Type":"application/json"

                    },


                    body:JSON.stringify({


                        ...form,


                        latitude:Number(form.latitude),


                        longitude:Number(form.longitude),


                        speed_limit:

                        form.speed_limit

                        ?

                        Number(form.speed_limit)

                        :

                        null


                    })

                }

            );





            if(!response.ok){


                throw new Error(

                    "Camera add failed"

                );


            }





            setMessage(

                "Camera added successfully ✅"

            );





            setForm({


                country:"India",

                state:"",

                city:"",

                location:"",

                road_name:"",

                latitude:"",

                longitude:"",

                camera_type:"Speed Camera",

                speed_limit:"",

                status:"Active"


            });




            loadCameras();



        }


        catch(error){


            console.log(error);


            setMessage(

                "Unable to add camera ❌"

            );


        }


    };









    // =========================
    // VERIFY CAMERA
    // =========================


    const verifyCamera = async(id)=>{


        try{


            const response = await fetch(

                `${API_URL}/api/cameras/${id}/verify`,

                {


                    method:"PUT",


                    headers:{


                        "Content-Type":"application/json"

                    },


                    body:JSON.stringify({


                        status:"Verified",

                        verified_by:"Admin"


                    })

                }

            );





            if(!response.ok){


                throw new Error(

                    "Verification failed"

                );


            }



            setMessage(

                "Camera verified successfully ✅"

            );



            loadCameras();



        }


        catch(error){


            console.log(error);



            setMessage(

                "Verification failed ❌"

            );


        }


    };









    // =========================
    // DELETE CAMERA
    // =========================


    const deleteCamera = async(id)=>{


        const confirmDelete = window.confirm(

            "Delete this camera?"

        );



        if(!confirmDelete)

            return;






        try{


            const response = await fetch(

                `${API_URL}/api/cameras/${id}`,

                {


                    method:"DELETE"

                }

            );





            if(!response.ok){


                throw new Error(

                    "Delete failed"

                );

            }




            setMessage(

                "Camera deleted 🗑️"

            );



            loadCameras();



        }


        catch(error){


            console.log(error);



            setMessage(

                "Unable to delete camera"

            );


        }


    };









    useEffect(()=>{


        loadCameras();



        const timer=setInterval(()=>{


            loadCameras();



        },10000);




        return()=>clearInterval(timer);



    },[]);









    return (


        <div className="admin-panel">



            <h1>

                ⚙️ Camera Administration Panel

            </h1>






            {

                message &&

                <div className="admin-message">

                    {message}

                </div>

            }









            <form

            className="camera-form"

            onSubmit={addCamera}

            >



                <input

                name="city"

                placeholder="City"

                value={form.city}

                onChange={handleChange}

                required

                />





                <input

                name="state"

                placeholder="State"

                value={form.state}

                onChange={handleChange}

                />





                <input

                name="road_name"

                placeholder="Road Name"

                value={form.road_name}

                onChange={handleChange}

                />





                <input

                name="latitude"

                placeholder="Latitude"

                value={form.latitude}

                onChange={handleChange}

                required

                />





                <input

                name="longitude"

                placeholder="Longitude"

                value={form.longitude}

                onChange={handleChange}

                required

                />





                <select

                name="camera_type"

                value={form.camera_type}

                onChange={handleChange}

                >


                    <option>

                        Speed Camera

                    </option>



                    <option>

                        Red Light Camera

                    </option>


                </select>





                <input

                name="speed_limit"

                placeholder="Speed Limit"

                value={form.speed_limit}

                onChange={handleChange}

                />






                <button type="submit">


                    ➕ Add Camera


                </button>




            </form>









            <h2>

                📷 Camera List

            </h2>








            {

                loading ?


                (

                    <p>

                        Loading cameras...

                    </p>

                )


                :



                (

                <div className="camera-list">



                {

                cameras.map((camera)=>(


                    <div

                    className="camera-item"

                    key={camera.id}

                    >



                        <div>


                            <h3>

                                📍 {camera.city}

                            </h3>


                            <p>

                                {camera.state}

                            </p>


                            <p>

                                {camera.camera_type}

                            </p>


                        </div>





                        <div>


                            <p>

                            Status:

                            {" "}

                            {camera.verification_status}

                            </p>



                            <button

                            onClick={()=>verifyCamera(camera.id)}

                            >

                                ✅ Verify

                            </button>




                            <button

                            onClick={()=>deleteCamera(camera.id)}

                            >

                                🗑 Delete

                            </button>



                        </div>





                    </div>


                ))

                }


                </div>

                )

            }





        </div>


    );


}



export default AdminPanel;