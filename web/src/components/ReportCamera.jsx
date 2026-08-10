import { useState } from "react";

import "./ReportCamera.css";


const API_URL = "http://127.0.0.1:8000";



function ReportCamera(){


    const [form,setForm]=useState({

        latitude:"",

        longitude:"",

        city:"",

        state:"",

        road_name:"",

        camera_type:"Speed Camera",

        reporter_name:"",

        notes:""

    });



    const [message,setMessage]=useState("");





    const handleChange=(e)=>{


        setForm({

            ...form,

            [e.target.name]:e.target.value

        });


    };







    const submitReport=async(e)=>{


        e.preventDefault();



        try{


            const response = await fetch(

                `${API_URL}/api/reports`,

                {


                    method:"POST",


                    headers:{


                        "Content-Type":"application/json"

                    },


                    body:JSON.stringify({


                        ...form,


                        latitude:Number(form.latitude),

                        longitude:Number(form.longitude)


                    })


                }

            );





            if(!response.ok){


                throw new Error(

                    "Report submission failed"

                );

            }





            setMessage(

                "Camera report submitted successfully ✅"

            );





            setForm({


                latitude:"",

                longitude:"",

                city:"",

                state:"",

                road_name:"",

                camera_type:"Speed Camera",

                reporter_name:"",

                notes:""


            });





        }


        catch(error){


            console.log(error);



            setMessage(

                "Unable to submit report ❌"

            );


        }


    };








    return (

        <div className="report-page">


            <h1>

                📢 Report New Camera

            </h1>






            {

                message &&

                <div className="report-message">

                    {message}

                </div>

            }







            <form

            className="report-form"

            onSubmit={submitReport}

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

                name="reporter_name"

                placeholder="Your Name"

                value={form.reporter_name}

                onChange={handleChange}

                />








                <textarea

                name="notes"

                placeholder="Additional details"

                value={form.notes}

                onChange={handleChange}

                />








                <button type="submit">


                    📢 Submit Report


                </button>





            </form>



        </div>

    );


}



export default ReportCamera;