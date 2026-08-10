import json
from pathlib import Path
from datetime import datetime
import sys


# ============================================================
# PROJECT ROOT
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

sys.path.append(str(BASE_DIR))


# ============================================================
# IMPORTS
# ============================================================

from scripts.database.db import get_connection


# ============================================================
# INPUT FILE
# ============================================================

INPUT_FILE = (
    BASE_DIR
    / "data"
    / "cleaned"
    / "validated_cameras.json"
)


# ============================================================
# LOAD VALIDATED JSON
# ============================================================

def load_cameras():

    if not INPUT_FILE.exists():

        print()
        print("ERROR: Validated camera file not found.")
        print(f"Expected: {INPUT_FILE}")

        return []


    try:

        with open(
            INPUT_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            cameras = json.load(file)

    except Exception as error:

        print()
        print(
            f"ERROR: Could not read validated JSON: {error}"
        )

        return []


    if not isinstance(cameras, list):

        print()
        print(
            "ERROR: validated_cameras.json must contain a list."
        )

        return []


    print()
    print(
        f"Loaded {len(cameras)} validated camera records."
    )

    return cameras


# ============================================================
# VALIDATE CAMERA RECORD
# ============================================================

def validate_camera(camera):

    latitude = camera.get("latitude")
    longitude = camera.get("longitude")


    # --------------------------------------------------------
    # Coordinates must exist
    # --------------------------------------------------------

    if latitude is None or longitude is None:

        return None


    # --------------------------------------------------------
    # Convert coordinates to float
    # --------------------------------------------------------

    try:

        latitude = float(latitude)
        longitude = float(longitude)

    except (TypeError, ValueError):

        return None


    # --------------------------------------------------------
    # Coordinate ranges
    # --------------------------------------------------------

    if not (-90 <= latitude <= 90):

        return None


    if not (-180 <= longitude <= 180):

        return None


    # --------------------------------------------------------
    # Normalize values
    # --------------------------------------------------------

    source = camera.get("source")

    if not source:

        source = "Unknown"


    source_id = camera.get("source_id")


    if source_id is not None:

        source_id = str(source_id)


    city = camera.get("city")

    road_name = camera.get("road_name")

    camera_type = camera.get("camera_type")


    # --------------------------------------------------------
    # Return normalized record
    # --------------------------------------------------------

    return {

        "source": source,

        "source_id": source_id,

        "latitude": latitude,

        "longitude": longitude,

        "country": camera.get("country"),

        "state": camera.get("state"),

        "city": city,

        "road_name": road_name,

        "camera_type": camera_type,

        "enforcement_type": camera.get(
            "enforcement_type"
        ),

        "speed_limit": camera.get(
            "speed_limit"
        ),

        "status": camera.get(
            "status",
            "unknown"
        ),

        "verification_status": camera.get(
            "verification_status",
            "pending"
        ),

        "source_url": camera.get(
            "source_url"
        ),

        "raw_data": camera.get(
            "raw_data",
            {}
        ),

        "last_verified": camera.get(
            "last_verified"
        )
    }


# ============================================================
# CHECK WHETHER RECORD ALREADY EXISTS
# ============================================================

def staging_record_exists(cursor, camera):

    source = camera["source"]

    source_id = camera["source_id"]

    latitude = camera["latitude"]

    longitude = camera["longitude"]

    city = camera["city"]

    road_name = camera["road_name"]

    camera_type = camera["camera_type"]


    # ========================================================
    # CASE 1
    # SOURCE ID EXISTS
    #
    # OSM records have source_id.
    #
    # Example:
    # OpenStreetMap + 10709257849
    # ========================================================

    if source_id:

        cursor.execute(
            """
            SELECT 1
            FROM camera_import_staging
            WHERE source = %s
              AND source_id = %s
            LIMIT 1
            """,
            (
                source,
                source_id
            )
        )

        if cursor.fetchone():

            return True


    # ========================================================
    # CASE 2
    # SOURCE ID IS NULL
    #
    # Demo Dataset records do not have source_id.
    #
    # Therefore use the camera identity fields.
    # ========================================================

    else:

        cursor.execute(
            """
            SELECT 1
            FROM camera_import_staging
            WHERE source = %s
              AND source_id IS NULL
              AND latitude = %s
              AND longitude = %s
              AND city IS NOT DISTINCT FROM %s
              AND road_name IS NOT DISTINCT FROM %s
              AND camera_type = %s
            LIMIT 1
            """,
            (
                source,
                latitude,
                longitude,
                city,
                road_name,
                camera_type
            )
        )

        if cursor.fetchone():

            return True


    # ========================================================
    # CASE 3
    #
    # Coordinate + identity protection.
    #
    # This protects against duplicate records even when
    # source_id is inconsistent.
    # ========================================================

    cursor.execute(
        """
        SELECT 1
        FROM camera_import_staging
        WHERE source = %s
          AND latitude = %s
          AND longitude = %s
          AND city IS NOT DISTINCT FROM %s
          AND road_name IS NOT DISTINCT FROM %s
          AND camera_type = %s
        LIMIT 1
        """,
        (
            source,
            latitude,
            longitude,
            city,
            road_name,
            camera_type
        )
    )

    if cursor.fetchone():

        return True


    return False


# ============================================================
# INSERT INTO STAGING
# ============================================================

def load_into_staging(cameras):

    if not cameras:

        print()
        print("No cameras to load.")

        return


    connection = None

    inserted = 0

    duplicates = 0

    skipped = 0


    try:

        connection = get_connection()


        print()
        print("✅ Database connection successful")


        with connection.cursor() as cursor:

            for original_camera in cameras:


                # ====================================================
                # VALIDATE / NORMALIZE
                # ====================================================

                camera = validate_camera(
                    original_camera
                )


                if camera is None:

                    skipped += 1

                    continue


                # ====================================================
                # DUPLICATE CHECK
                # ====================================================

                if staging_record_exists(
                    cursor,
                    camera
                ):

                    duplicates += 1

                    continue


                # ====================================================
                # RAW DATA
                # ====================================================

                raw_data = camera["raw_data"]


                try:

                    raw_json = json.dumps(
                        raw_data,
                        ensure_ascii=False
                    )

                except Exception:

                    raw_json = "{}"


                # ====================================================
                # INSERT
                # ====================================================

                cursor.execute(
                    """
                    INSERT INTO camera_import_staging
                    (
                        source,
                        source_id,
                        latitude,
                        longitude,
                        country,
                        state,
                        city,
                        road_name,
                        camera_type,
                        enforcement_type,
                        speed_limit,
                        status,
                        verification_status,
                        source_url,
                        raw_data,
                        imported_at,
                        last_verified
                    )
                    VALUES
                    (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s::jsonb,
                        %s,
                        %s
                    )
                    """,
                    (
                        camera["source"],

                        camera["source_id"],

                        camera["latitude"],

                        camera["longitude"],

                        camera["country"],

                        camera["state"],

                        camera["city"],

                        camera["road_name"],

                        camera["camera_type"],

                        camera["enforcement_type"],

                        camera["speed_limit"],

                        camera["status"],

                        camera["verification_status"],

                        camera["source_url"],

                        raw_json,

                        datetime.now(),

                        camera["last_verified"]
                    )
                )


                inserted += 1


        # ========================================================
        # COMMIT
        # ========================================================

        connection.commit()


    except Exception as error:

        if connection:

            connection.rollback()


        print()
        print(
            f"ERROR: Database insert failed: {error}"
        )

        raise


    finally:

        if connection:

            connection.close()


    # ============================================================
    # SUMMARY
    # ============================================================

    print()

    print("=" * 60)

    print("STAGING IMPORT COMPLETE")

    print("=" * 60)

    print(
        f"Inserted   : {inserted}"
    )

    print(
        f"Duplicates : {duplicates}"
    )

    print(
        f"Skipped    : {skipped}"
    )

    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print("=" * 60)

    print(
        "Global Camera Map - Validated Camera Staging Loader"
    )

    print("=" * 60)


    cameras = load_cameras()


    if not cameras:

        return


    load_into_staging(cameras)


    print()

    print(
        "Validated records are now in camera_import_staging."
    )

    print(
        "They have NOT been promoted into cameras yet."
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()