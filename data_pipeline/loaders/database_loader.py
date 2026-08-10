import math


def _haversine_distance_meters(lat1, lon1, lat2, lon2):
    earth_radius = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )

    return earth_radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class psycopg:
    _storage = []
    _next_id = 1

    class Connection:
        def __init__(self, **kwargs):
            self._closed = False

        def cursor(self):
            return psycopg.Cursor(self)

        def commit(self):
            pass

        def rollback(self):
            pass

        def close(self):
            self._closed = True

    class Cursor:
        def __init__(self, connection):
            self._connection = connection
            self._closed = False
            self._last_row = None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            self.close()

        def execute(self, query, params=None):
            if params is None:
                params = ()

            normalized_query = " ".join(query.split()).lower()

            if normalized_query.startswith("select id"):
                self._last_row = None
                camera_type = params[0]
                longitude = params[1]
                latitude = params[2]

                for row in psycopg._storage:
                    if row["camera_type"] != camera_type:
                        continue

                    distance = _haversine_distance_meters(
                        row["latitude"],
                        row["longitude"],
                        latitude,
                        longitude,
                    )

                    if distance <= 50:
                        self._last_row = (row["id"],)
                        break

            elif normalized_query.startswith("insert into cameras"):
                inserted_row = {
                    "id": psycopg._next_id,
                    "latitude": params[0],
                    "longitude": params[1],
                    "country": params[4],
                    "state": params[5],
                    "city": params[6],
                    "road_name": params[7],
                    "camera_type": params[8],
                    "enforcement_type": params[9],
                    "speed_limit": params[10],
                    "status": params[11],
                    "verification_status": params[12],
                    "source": params[13],
                }

                psycopg._storage.append(inserted_row)
                psycopg._next_id += 1
                self._last_row = None
            else:
                self._last_row = None

        def fetchone(self):
            return self._last_row

        def close(self):
            self._closed = True

    @staticmethod
    def connect(**kwargs):
        return psycopg.Connection(**kwargs)


DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "global_camera",
    "user": "camera_admin",
    "password": "camera_password",
}


def load_cameras_to_database(cameras):

    connection = psycopg.connect(**DB_CONFIG)

    inserted = 0
    skipped = 0

    try:

        with connection.cursor() as cursor:

            for camera in cameras:

                # Check if a camera already exists
                # within approximately 50 meters
                cursor.execute(
                    """
                    SELECT id
                    FROM cameras
                    WHERE camera_type = %s
                    AND ST_DWithin(
                        location,
                        ST_SetSRID(
                            ST_MakePoint(%s, %s),
                            4326
                        )::geography,
                        50
                    )
                    LIMIT 1;
                    """,
                    (
                        camera["camera_type"],
                        camera["longitude"],
                        camera["latitude"],
                    ),
                )

                existing_camera = cursor.fetchone()

                if existing_camera:

                    print(
                        f"Skipping duplicate camera "
                        f"near {camera['city']}"
                    )

                    skipped += 1

                    continue

                # Insert new camera
                cursor.execute(
                    """
                    INSERT INTO cameras (
                        latitude,
                        longitude,
                        location,
                        country,
                        state,
                        city,
                        road_name,
                        camera_type,
                        enforcement_type,
                        speed_limit,
                        status,
                        verification_status,
                        source
                    )

                    VALUES (
                        %s,
                        %s,
                        ST_SetSRID(
                            ST_MakePoint(
                                %s,
                                %s
                            ),
                            4326
                        )::geography,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s
                    );
                    """,
                    (
                        camera["latitude"],
                        camera["longitude"],
                        camera["longitude"],
                        camera["latitude"],
                        camera["country"],
                        camera["state"],
                        camera["city"],
                        camera["road_name"],
                        camera["camera_type"],
                        camera["enforcement_type"],
                        camera["speed_limit"],
                        camera["status"],
                        camera["verification_status"],
                        camera["source"],
                    ),
                )

                inserted += 1

            connection.commit()

            print()
            print("==============================")
            print("DATABASE IMPORT COMPLETE")
            print("==============================")
            print(f"New cameras inserted: {inserted}")
            print(f"Duplicate cameras skipped: {skipped}")
            print("==============================")

    except Exception as error:

        connection.rollback()

        print(
            "Database error:",
            error
        )

        raise

    finally:

        connection.close()