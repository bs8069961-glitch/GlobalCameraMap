from fastapi import APIRouter

from api.database import fetch_all


router = APIRouter(
    tags=["Statistics"]
)



# ============================================================
# CAMERA STATISTICS
# ============================================================

@router.get("/stats")
def get_stats():

    query = """
        SELECT
            COUNT(*) AS total,

            COUNT(
                CASE
                    WHEN camera_type ILIKE '%Speed%'
                    THEN 1
                END
            ) AS speed_cameras,


            COUNT(
                CASE
                    WHEN camera_type ILIKE '%Red%'
                    THEN 1
                END
            ) AS red_light_cameras

        FROM cameras;
    """


    result = fetch_all(query)


    row = result[0]


    return {

        "total": row[0],

        "speed_cameras": row[1],

        "red_light_cameras": row[2]

    }





# ============================================================
# CITY LIST
# ============================================================

@router.get("/stats/cities")
def get_cities():


    query = """

        SELECT DISTINCT city

        FROM cameras

        WHERE city IS NOT NULL

        ORDER BY city;

    """


    result = fetch_all(query)



    cities = []


    for row in result:

        cities.append(row[0])



    return cities