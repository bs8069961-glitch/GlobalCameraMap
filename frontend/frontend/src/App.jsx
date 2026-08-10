import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import "./App.css";



// Speed Camera Icon

const speedIcon = new L.Icon({

  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/854/854878.png",

  iconSize: [35, 35],

});



// Red Light Camera Icon

const redLightIcon = new L.Icon({

  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/2554/2554978.png",

  iconSize: [35, 35],

});




function App() {


  const [cameras, setCameras] = useState([]);

  const [filteredCameras, setFilteredCameras] = useState([]);

  const [search, setSearch] = useState("");

  const [type, setType] = useState("All");

  const [loading, setLoading] = useState(true);



  const [stats, setStats] = useState({

    total: 0,

    speed: 0,

    redLight: 0,

    active: 0

  });





  // Fetch camera data

  useEffect(() => {


    fetch(
      "http://127.0.0.1:8000/api/cameras"
    )


      .then((response) => response.json())


      .then((data) => {


        console.log(
          "Camera Data:",
          data
        );


        setCameras(data);

        setFilteredCameras(data);



        setStats({

          total: data.length,


          speed: data.filter(

            camera =>
              camera.camera_type === "Speed Camera"

          ).length,



          redLight: data.filter(

            camera =>
              camera.camera_type === "Red Light Camera"

          ).length,



          active: data.filter(

            camera =>
              camera.status === "Active"

          ).length


        });



        setLoading(false);


      })


      .catch((error) => {


        console.error(
          "API Error:",
          error
        );


        setLoading(false);


      });



  }, []);






  // Search and filter logic

  useEffect(() => {


    let result = [...cameras];



    if (search.trim() !== "") {


      result = result.filter((camera) =>


        camera.city
          ?.toLowerCase()
          .includes(search.toLowerCase())


        ||


        camera.state
          ?.toLowerCase()
          .includes(search.toLowerCase())


        ||


        camera.location
          ?.toLowerCase()
          .includes(search.toLowerCase())


      );


    }





    if (type !== "All") {


      result = result.filter(

        (camera) =>

          camera.camera_type === type

      );


    }



    setFilteredCameras(result);



  }, [search, type, cameras]);






  return (

    <div className="app">





      <header className="header">


        <h1>

          🌍 Global Camera Map

        </h1>



        <h2>

          Cameras: {filteredCameras.length}

        </h2>



      </header>






      <div className="dashboard">





        {/* Sidebar */}


        <aside className="sidebar">


          <h2>

            📊 Dashboard

          </h2>





          <div className="stat-card">


            <h3>

              Total Cameras

            </h3>


            <p>

              {stats.total}

            </p>


          </div>





          <div className="stat-card">


            <h3>

              Speed Cameras

            </h3>


            <p>

              {stats.speed}

            </p>


          </div>





          <div className="stat-card">


            <h3>

              Red Light Cameras

            </h3>


            <p>

              {stats.redLight}

            </p>


          </div>





          <div className="stat-card">


            <h3>

              Active Cameras

            </h3>


            <p>

              {stats.active}

            </p>


          </div>



        </aside>






        <main className="map-container">





          <div className="controls">



            <input


              type="text"


              placeholder="Search city or state..."


              value={search}


              onChange={(e) =>

                setSearch(e.target.value)

              }


            />





            <select


              value={type}


              onChange={(e) =>

                setType(e.target.value)

              }


            >


              <option value="All">

                All Cameras

              </option>



              <option value="Speed Camera">

                Speed Camera

              </option>



              <option value="Red Light Camera">

                Red Light Camera

              </option>



            </select>



          </div>






          {


            loading ?


            (

              <div className="loading">

                Loading cameras...

              </div>


            )


            :


            (



              <MapContainer


                center={[22.9734, 78.6569]}


                zoom={5}


                className="map"


              >




                <TileLayer


                  attribution="&copy; OpenStreetMap contributors"


                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"


                />






                {


                  filteredCameras.map((camera) => (



                    <Marker



                      key={camera.id}



                      position={[


                        camera.latitude,


                        camera.longitude



                      ]}




                      icon={



                        camera.camera_type === "Speed Camera"


                          ? speedIcon


                          : redLightIcon



                      }



                    >





                      <Popup>



                        <h3>

                          📍 {camera.city}

                        </h3>




                        <p>

                          <b>State:</b>{" "}

                          {camera.state}

                        </p>





                        <p>

                          <b>Location:</b>{" "}

                          {camera.location || "N/A"}

                        </p>





                        <p>

                          <b>Type:</b>{" "}

                          {camera.camera_type}

                        </p>





                        <p>

                          <b>Status:</b>{" "}

                          {camera.status || "Active"}

                        </p>





                        <p>

                          <b>Coordinates:</b>

                          <br />

                          {camera.latitude},

                          {" "}

                          {camera.longitude}

                        </p>




                      </Popup>






                    </Marker>



                  ))



                }






              </MapContainer>



            )


          }





        </main>





      </div>





    </div>

  );

}



export default App;