from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel

from typing import Optional

from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor


# ============================================================
# APP CONFIG
# ============================================================

app = FastAPI(
    title="Global Camera Map API",
    version="1.0"
)



# ============================================================
# CORS
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]

)



# ============================================================
# DATABASE CONFIG
# ============================================================

DB_HOST = "localhost"
DB_NAME = "global_camera"
DB_USER = "camera_admin"
DB_PASSWORD = "camera_password"
DB_PORT = "5432"



def get_db_connection():

    return psycopg2.connect(

        host=DB_HOST,

        database=DB_NAME,

        user=DB_USER,

        password=DB_PASSWORD,

        port=DB_PORT

    )



# ============================================================
# MODELS
# ============================================================


class CameraCreate(BaseModel):

    country: str

    state: Optional[str] = None

    city: str

    location: Optional[str] = None

    road_name: Optional[str] = None

    latitude: float

    longitude: float

    camera_type: str

    speed_limit: Optional[int] = None

    enforcement_type: Optional[str] = None

    source: Optional[str] = None

    source_url: Optional[str] = None



# ============================================================
# ROOT
# ============================================================


@app.get("/")
def home():

    return {

        "message":
        "Global Camera Map API Running"

    }



# ============================================================
# HEALTH
# ============================================================


@app.get("/health")
def health():

    try:

        conn = get_db_connection()

        conn.close()


        return {

            "status":
            "healthy",

            "database":
            "connected"

        }


    except Exception as e:

        return {

            "status":
            "failed",

            "error":
            str(e)

        }



# ============================================================
# GET ALL CAMERAS
# ============================================================


@app.get("/api/cameras")
def get_cameras():

    try:

        conn = get_db_connection()


        cursor = conn.cursor(
            cursor_factory=RealDictCursor
        )


        cursor.execute(

            """
            SELECT *
            FROM cameras
            ORDER BY id;
            """

        )


        cameras = cursor.fetchall()


        cursor.close()

        conn.close()


        return cameras



    except Exception as e:


        raise HTTPException(

            status_code=500,

            detail=str(e)

        )



# ============================================================
# SEARCH CAMERAS
# ============================================================


@app.get("/api/cameras/search")
def search_camera(q: str):

    conn = get_db_connection()

    cursor = conn.cursor(
        cursor_factory=RealDictCursor
    )


    cursor.execute(

        """

        SELECT *

        FROM cameras

        WHERE city ILIKE %s

        OR state ILIKE %s

        OR location ILIKE %s;


        """,

        (

            f"%{q}%",

            f"%{q}%",

            f"%{q}%"

        )

    )


    data = cursor.fetchall()


    cursor.close()

    conn.close()


    return data



# ============================================================
# ADD CAMERA
# ============================================================


@app.post("/api/cameras")
def add_camera(camera: CameraCreate):

    conn = get_db_connection()

    cursor = conn.cursor(
        cursor_factory=RealDictCursor
    )


    cursor.execute(

        """

        INSERT INTO cameras

        (
        country,
        state,
        city,
        location,
        road_name,
        latitude,
        longitude,
        camera_type,
        speed_limit,
        enforcement_type,
        source,
        source_url
        )

        VALUES

        (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)

        RETURNING *;


        """,

        (

        camera.country,

        camera.state,

        camera.city,

        camera.location,

        camera.road_name,

        camera.latitude,

        camera.longitude,

        camera.camera_type,

        camera.speed_limit,

        camera.enforcement_type,

        camera.source,

        camera.source_url

        )

    )


    result = cursor.fetchone()


    conn.commit()


    cursor.close()

    conn.close()


    return result



# ============================================================
# REPORTS
# ============================================================


@app.get("/api/reports")
def reports():

    try:

        conn = get_db_connection()


        cursor = conn.cursor(
            cursor_factory=RealDictCursor
        )


        cursor.execute(

            """

            SELECT *

            FROM camera_reports

            ORDER BY id DESC;


            """

        )


        data = cursor.fetchall()


        cursor.close()

        conn.close()


        return data



    except Exception as e:


        raise HTTPException(

            status_code=500,

            detail=str(e)

        )



# ============================================================
# STATS
# ============================================================


@app.get("/api/stats")
def stats():

    conn = get_db_connection()

    cursor = conn.cursor(
        cursor_factory=RealDictCursor
    )


    cursor.execute(

        """

        SELECT COUNT(*) AS total_cameras

        FROM cameras;

        """

    )


    result = cursor.fetchone()


    cursor.close()

    conn.close()


    return result



# ============================================================
# ERROR HANDLER
# ============================================================


@app.exception_handler(Exception)
async def error_handler(request, exc):

    return JSONResponse(

        status_code=500,

        content={

            "error":
            str(exc)

        }

    )



# ============================================================
# START SERVER
# ============================================================


if __name__ == "__main__":

    import uvicorn


    uvicorn.run(

        "main:app",

        host="0.0.0.0",

        port=8000,

        reload=True

    )