from fastapi import APIRouter, HTTPException, Query

from api.database import fetch_all



router = APIRouter()



# ==========================================================
# GET ALL CAMERAS
# ==========================================================

@router.get("/cameras")
def get_cameras():


    query = """

    SELECT

        id,
        latitude,
        longitude,
        country,
        state,
        city,
        road_name,
        camera_type,
        enforcement_type,
        speed_limit,
        source

    FROM cameras

    ORDER BY id;


    """


    rows = fetch_all(query)


    cameras = []


    for row in rows:

        cameras.append({

            "id": row[0],
            "latitude": row[1],
            "longitude": row[2],
            "country": row[3],
            "state": row[4],
            "city": row[5],
            "road_name": row[6],
            "camera_type": row[7],
            "enforcement_type": row[8],
            "speed_limit": row[9],
            "source": row[10]

        })


    return {

        "total": len(cameras),

        "cameras": cameras

    }





# ==========================================================
# NEARBY CAMERAS USING POSTGIS
# ==========================================================

@router.get("/cameras/nearby")
def nearby_cameras(

    lat: float = Query(...),

    lon: float = Query(...),

    radius: float = Query(5)

):


    query = """

    SELECT


        id,

        latitude,

        longitude,

        country,

        state,

        city,

        road_name,

        camera_type,

        enforcement_type,

        speed_limit,

        source,


        ST_Distance(

            location,

            ST_SetSRID(

                ST_MakePoint(%s,%s),

                4326

            )::geography

        ) / 1000 AS distance_km



    FROM cameras



    WHERE ST_DWithin(

        location,

        ST_SetSRID(

            ST_MakePoint(%s,%s),

            4326

        )::geography,

        %s * 1000

    )



    ORDER BY distance_km;



    """



    rows = fetch_all(

        query,

        (

            lon,
            lat,

            lon,
            lat,

            radius

        )

    )



    cameras = []



    for row in rows:


        cameras.append({

            "id": row[0],

            "latitude": row[1],

            "longitude": row[2],

            "country": row[3],

            "state": row[4],

            "city": row[5],

            "road_name": row[6],

            "camera_type": row[7],

            "enforcement_type": row[8],

            "speed_limit": row[9],

            "source": row[10],

            "distance_km": round(row[11], 2)

        })



    return {


        "total": len(cameras),

        "radius_km": radius,

        "cameras": cameras

    }





# ==========================================================
# GET SINGLE CAMERA
# ==========================================================

@router.get("/cameras/{camera_id}")
def get_camera(camera_id: int):


    query = """

    SELECT

        id,
        latitude,
        longitude,
        country,
        state,
        city,
        road_name,
        camera_type,
        enforcement_type,
        speed_limit,
        source

    FROM cameras

    WHERE id=%s;


    """



    rows = fetch_all(

        query,

        (camera_id,)

    )



    if not rows:


        raise HTTPException(

            status_code=404,

            detail="Camera not found"

        )



    row = rows[0]



    return {


        "id": row[0],

        "latitude": row[1],

        "longitude": row[2],

        "country": row[3],

        "state": row[4],

        "city": row[5],

        "road_name": row[6],

        "camera_type": row[7],

        "enforcement_type": row[8],

        "speed_limit": row[9],

        "source": row[10]

    }