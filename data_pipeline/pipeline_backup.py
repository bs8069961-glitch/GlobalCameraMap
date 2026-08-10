import csv
import os
import psycopg # type: ignore


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "global_camera",
    "user": "camera_admin",
    "password": "camera_password",
}


# ============================================================
# FILE CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

CSV_FILE = os.path.join(
    BASE_DIR,
    "india_cameras.csv"
)


# ============================================================
# REQUIRED COLUMNS
# ============================================================

REQUIRED_COLUMNS = [
    "latitude",
    "longitude",
    "country",
    "state",
    "city",
    "road_name",
    "camera_type",
    "enforcement_type",
    "status",
    "verification_status",
    "source",
]


# ============================================================
# LOAD CSV
# ============================================================

def load_csv():

    print("\nStep 1: Loading camera data...")

    cameras = []

    try:

        with open(
            CSV_FILE,
            "r",
            encoding="utf-8-sig"
        ) as file:

            reader = csv.DictReader(file)

            for row in reader:

                cameras.append(row)

    except FileNotFoundError:

        print(
            f"ERROR: CSV file not found: {CSV_FILE}"
        )

        return []


    print(
        f"Loaded {len(cameras)} camera records"
    )

    return cameras


# ============================================================
# CLEAN SINGLE CAMERA
# ============================================================

def clean_camera(camera):

    cleaned = {}

    # Clean all text values

    for key, value in camera.items():

        if value is None:

            value = ""

        cleaned[key] = value.strip()


    # --------------------------------------------------------
    # Convert latitude
    # --------------------------------------------------------

    cleaned["latitude"] = float(
        cleaned["latitude"]
    )


    # --------------------------------------------------------
    # Convert longitude
    # --------------------------------------------------------

    cleaned["longitude"] = float(
        cleaned["longitude"]
    )


    # --------------------------------------------------------
    # Convert speed limit
    # --------------------------------------------------------

    if cleaned.get("speed_limit"):

        cleaned["speed_limit"] = int(
            float(
                cleaned["speed_limit"]
            )
        )

    else:

        cleaned["speed_limit"] = None


    return cleaned


# ============================================================
# CLEAN ALL CAMERAS
# ============================================================

def clean_cameras(cameras):

    print(
        "\nStep 2: Cleaning camera data..."
    )

    cleaned_cameras = []

    for camera in cameras:

        try:

            cleaned_camera = clean_camera(
                camera
            )

            cleaned_cameras.append(
                cleaned_camera
            )

        except Exception as error:

            print(
                "Skipping invalid record:",
                error
            )


    print(
        f"Cleaned {len(cleaned_cameras)} cameras"
    )

    return cleaned_cameras


# ============================================================
# VALIDATE SINGLE CAMERA
# ============================================================

def validate_camera(camera):

    # --------------------------------------------------------
    # Check required fields
    # --------------------------------------------------------

    for field in REQUIRED_COLUMNS:

        if not camera.get(field):

            return False


    # --------------------------------------------------------
    # Validate latitude
    # --------------------------------------------------------

    if not (
        -90
        <= camera["latitude"]
        <= 90
    ):

        return False


    # --------------------------------------------------------
    # Validate longitude
    # --------------------------------------------------------

    if not (
        -180
        <= camera["longitude"]
        <= 180
    ):

        return False


    return True


# ============================================================
# VALIDATE ALL CAMERAS
# ============================================================

def validate_cameras(cameras):

    print(
        "\nStep 3: Validating camera data..."
    )

    valid = []

    invalid_count = 0


    for camera in cameras:

        if validate_camera(camera):

            valid.append(
                camera
            )

        else:

            invalid_count += 1


    print(
        f"Valid cameras: {len(valid)}"
    )

    print(
        f"Invalid cameras: {invalid_count}"
    )


    return valid


# ============================================================
# CREATE CAMERA UNIQUE KEY
# ============================================================

def get_camera_key(camera):

    return (

        round(
            camera["latitude"],
            6
        ),

        round(
            camera["longitude"],
            6
        ),

        camera["camera_type"],

        camera["road_name"]

    )


# ============================================================
# INSERT OR UPDATE CAMERAS
# ============================================================

def insert_cameras(cameras):

    print(
        "\nStep 4: Loading cameras into PostGIS..."
    )


    connection = None

    cursor = None


    inserted = 0

    updated = 0

    skipped = 0

    errors = 0


    try:

        # ----------------------------------------------------
        # Connect to PostgreSQL / PostGIS
        # ----------------------------------------------------

        connection = psycopg.connect(
            **DB_CONFIG
        )

        cursor = connection.cursor()


        # ----------------------------------------------------
        # Process each camera
        # ----------------------------------------------------

        for camera in cameras:

            try:

                # ============================================
                # CHECK IF CAMERA ALREADY EXISTS
                # ============================================

                cursor.execute(

                    """
                    SELECT
                        id,
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

                    FROM cameras

                    WHERE
                        latitude = %s

                        AND longitude = %s

                        AND camera_type = %s

                        AND road_name = %s
                    """,

                    (

                        camera["latitude"],

                        camera["longitude"],

                        camera["camera_type"],

                        camera["road_name"]

                    )

                )


                existing = cursor.fetchone()


                # ============================================
                # CAMERA EXISTS
                # ============================================

                if existing:

                    camera_id = existing[0]


                    # ----------------------------------------
                    # Compare existing data
                    # ----------------------------------------

                    existing_values = (

                        existing[1],

                        existing[2],

                        existing[3],

                        existing[4],

                        existing[5],

                        existing[6],

                        existing[7],

                        existing[8],

                        existing[9],

                        existing[10]

                    )


                    new_values = (

                        camera["country"],

                        camera["state"],

                        camera["city"],

                        camera["road_name"],

                        camera["camera_type"],

                        camera["enforcement_type"],

                        camera["speed_limit"],

                        camera["status"],

                        camera["verification_status"],

                        camera["source"]

                    )


                    # ----------------------------------------
                    # Skip if nothing changed
                    # ----------------------------------------

                    if existing_values == new_values:

                        skipped += 1

                        continue


                    # ========================================
                    # UPDATE EXISTING CAMERA
                    # ========================================

                    cursor.execute(

                        """
                        UPDATE cameras

                        SET

                            country = %s,

                            state = %s,

                            city = %s,

                            road_name = %s,

                            camera_type = %s,

                            enforcement_type = %s,

                            speed_limit = %s,

                            status = %s,

                            verification_status = %s,

                            source = %s,

                            location = ST_SetSRID(
                                ST_MakePoint(
                                    %s,
                                    %s
                                ),
                                4326
                            ),

                            updated_at = NOW()

                        WHERE id = %s
                        """,

                        (

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

                            # PostGIS Point
                            # longitude first
                            camera["longitude"],

                            # latitude second
                            camera["latitude"],

                            camera_id

                        )

                    )


                    updated += 1


                    print(

                        f"Updated camera: "

                        f"{camera['city']} - "

                        f"{camera['road_name']}"

                    )


                    continue


                # ============================================
                # INSERT NEW CAMERA
                # ============================================

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

                        ),

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

                    )
                    """,

                    (

                        # Latitude
                        camera["latitude"],

                        # Longitude
                        camera["longitude"],


                        # PostGIS Point
                        # Longitude FIRST
                        camera["longitude"],

                        # Latitude SECOND
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

                        camera["source"]

                    )

                )


                inserted += 1


                print(

                    f"Inserted camera: "

                    f"{camera['city']} - "

                    f"{camera['road_name']}"

                )


            except Exception as error:

                errors += 1


                print(
                    "\nError processing camera:"
                )

                print(
                    error
                )

                # Roll back failed individual transaction
                connection.rollback()


        # ----------------------------------------------------
        # Commit successful changes
        # ----------------------------------------------------

        connection.commit()


    except Exception as error:

        print(
            "\nDATABASE CONNECTION ERROR:"
        )

        print(
            error
        )


        if connection:

            connection.rollback()


    finally:

        # ----------------------------------------------------
        # Close cursor
        # ----------------------------------------------------

        if cursor:

            cursor.close()


        # ----------------------------------------------------
        # Close database connection
        # ----------------------------------------------------

        if connection:

            connection.close()


    # ========================================================
    # PIPELINE RESULTS
    # ========================================================

    print(
        "\nPipeline Results:"
    )

    print(
        f"Successfully inserted: {inserted}"
    )

    print(
        f"Successfully updated: {updated}"
    )

    print(
        f"Skipped unchanged: {skipped}"
    )

    print(
        f"Errors: {errors}"
    )


# ============================================================
# MAIN PIPELINE
# ============================================================

def main():

    print(
        "\n================================"
    )

    print(
        "GLOBAL CAMERA MAP DATA PIPELINE"
    )

    print(
        "================================"
    )


    # --------------------------------------------------------
    # STEP 1
    # --------------------------------------------------------

    cameras = load_csv()


    if not cameras:

        print(
            "\nNo camera data found."
        )

        return


    # --------------------------------------------------------
    # STEP 2
    # --------------------------------------------------------

    cameras = clean_cameras(
        cameras
    )


    # --------------------------------------------------------
    # STEP 3
    # --------------------------------------------------------

    cameras = validate_cameras(
        cameras
    )


    # --------------------------------------------------------
    # STEP 4
    # --------------------------------------------------------

    if cameras:

        insert_cameras(
            cameras
        )

    else:

        print(
            "\nNo valid cameras to insert."
        )


    # --------------------------------------------------------
    # COMPLETE
    # --------------------------------------------------------

    print(
        "\n================================"
    )

    print(
        "✅ PIPELINE COMPLETED"
    )

    print(
        "================================"
    )


# ============================================================
# RUN PIPELINE
# ============================================================

if __name__ == "__main__":

    main()