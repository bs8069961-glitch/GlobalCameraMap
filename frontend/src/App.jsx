import { useEffect, useState } from "react";


function App() {

  const [cameras, setCameras] = useState([]);


  useEffect(() => {

    fetch("http://127.0.0.1:8000/api/cameras")

      .then((response) => response.json())

      .then((data) => {

        console.log("Camera Data:", data);

        setCameras(data);

      })

      .catch((error) => {

        console.error(
          "Camera API Error:",
          error
        );

      });


  }, []);



  return (

    <div>

      <h1>
        Global Camera Map
      </h1>


      <h2>
        Total Cameras: {cameras.length}
      </h2>


      <hr />


      {

        cameras.map((camera) => (

          <div key={camera.id}>

            <h3>
              {camera.city}
            </h3>


            <p>
              State: {camera.state}
            </p>


            <p>
              Type: {camera.camera_type}
            </p>


            <p>
              Latitude: {camera.latitude}
              <br />
              Longitude: {camera.longitude}
            </p>


          </div>

        ))

      }


    </div>

  );

}


export default App;