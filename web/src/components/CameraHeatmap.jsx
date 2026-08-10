import { useEffect } from "react";

import { useMap } from "react-leaflet";

import L from "leaflet";

import "leaflet.heat";



function CameraHeatmap({ cameras }) {


    const map = useMap();



    useEffect(()=>{


        if(!cameras || cameras.length === 0){

            return;

        }



        const points = cameras.map(

            camera => [

                camera.latitude,

                camera.longitude,

                0.8

            ]

        );




        const heatLayer =

        L.heatLayer(

            points,

            {

                radius:40,

                blur:30,

                maxZoom:10

            }

        );




        heatLayer.addTo(map);





        return ()=>{


            map.removeLayer(

                heatLayer

            );


        };



    },[cameras,map]);




    return null;

}



export default CameraHeatmap;