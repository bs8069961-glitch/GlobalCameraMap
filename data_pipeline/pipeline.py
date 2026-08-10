import os
import sys
import csv
import hashlib
import datetime

import psycopg2 # pyright: ignore[reportMissingModuleSource]


# ============================================================
# PATH CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

INDIA_CSV = os.path.join(
    BASE_DIR,
    "india_cameras.csv"
)

EXTERNAL_CSV = os.path.join(
    BASE_DIR,
    "incoming",
    "external_cameras.csv"
)


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "global_camera"),
    "user": os.getenv("DB_USER", "camera_admin"),
    "password": os.getenv("DB_PASSWORD", "camera_password"),
}


# ============================================================
# CONNECT TO DATABASE
# ============================================================

def get_db_connection():

    return psycopg2.connect(
        host=DB_CONFIG["host"],
        port=DB_CONFIG["port"],
        database=DB_CONFIG["database"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
    )


# ============================================================
# DATA SOURCES
# ============================================================

SOURCES = [
    {
        "name": "India Camera Dataset",
        "type": "csv",
        "path": INDIA_CSV,
    },
    {
        "name": "External Traffic Authority",
        "type": "csv",
        "path": EXTERNAL_CSV,
    },
]


# ============================================================
# LOAD CSV
# ============================================================

def load_csv(source):

    path = source["path"]

    records = []

    if not os.path.exists(path):

        print(
            f"WARNING: Source file not found: {path}"
        )

        return records

    print(
        f"\nLoading source: {source['name']}"
    )

    with open(
        path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            row["source"] = (
                row.get("source")
                or source["name"]
            )

            row["source_url"] = (
                row.get("source_url")
                or None
            )

            records.append(row)

    print(
        f"Loaded {len(records)} records"
    )

    return records


# ============================================================
# LOAD ALL SOURCES
# ============================================================

def load_all_sources():

    all_records = []

    for source in SOURCES:

        records = load_csv(source)

        all_records.extend(records)

    print(
        f"\nTotal records loaded: {len(all_records)}"
    )

    return all_records


# ============================================================
# CLEAN VALUE
# ============================================================

def clean_value(value):

    if value is None:
        return None

    value = str(value).strip()

    if value == "":
        return None

    return value


# ============================================================
# CLEAN CAMERA DATA
# ============================================================

def clean_camera(camera):

    cleaned = {}

    for key, value in camera.items():

        cleaned[key] = clean_value(value)

    # Convert latitude
    if cleaned.get("latitude"):

        cleaned["latitude"] = float(
            cleaned["latitude"]
        )

    # Convert longitude
    if cleaned.get("longitude"):

        cleaned["longitude"] = float(
            cleaned["longitude"]
        )

    # Convert speed limit
    if cleaned.get("speed_limit"):

        cleaned["speed_limit"] = int(
            float(cleaned["speed_limit"])
        )

    # Default verification status
    if not cleaned.get(
        "verification_status"
    ):

        cleaned[
            "verification_status"
        ] = "pending"

    # Default status
    if not cleaned.get("status"):

        cleaned["status"] = "active"

    return cleaned


# ============================================================
# CLEAN ALL CAMERAS
# ============================================================

def clean_cameras(records):

    cleaned_records = []

    for record in records:

        try:

            cleaned = clean_camera(
                record
            )

            cleaned_records.append(
                cleaned
            )

        except Exception as error:

            print(
                "Cleaning error:",
                error
            )

    print(
        f"Cleaned {len(cleaned_records)} cameras"
    )

    return cleaned_records


# ============================================================
# VALIDATE CAMERA
# ============================================================

def validate_camera(camera):

    required_fields = [
        "latitude",
        "longitude",
        "country",
        "state",
        "city",
        "road_name",
        "camera_type",
    ]

    for field in required_fields:

        if not camera.get(field):

            return False

    latitude = camera["latitude"]

    longitude = camera["longitude"]

    if not (
        -90 <= latitude <= 90
    ):

        return False

    if not (
        -180 <= longitude <= 180
    ):

        return False

    return True


# ============================================================
# VALIDATE ALL CAMERAS
# ============================================================

def validate_cameras(records):

    valid_records = []

    invalid_count = 0

    for camera in records:

        if validate_camera(camera):

            valid_records.append(
                camera
            )

        else:

            invalid_count += 1

            print(
                "Invalid camera:",
                camera
            )

    print(
        f"Valid cameras: {len(valid_records)}"
    )

    print(
        f"Invalid cameras: {invalid_count}"
    )

    return valid_records


# ============================================================
# CREATE CAMERA UNIQUE KEY
# ============================================================

def camera_key(camera):

    latitude = round(
        float(camera["latitude"]),
        6
    )

    longitude = round(
        float(camera["longitude"]),
        6
    )

    city = (
        camera.get("city")
        or ""
    ).strip().lower()

    road = (
        camera.get("road_name")
        or ""
    ).strip().lower()

    camera_type = (
        camera.get("camera_type")
        or ""
    ).strip().lower()

    return (
        latitude,
        longitude,
        city,
        road,
        camera_type
    )


# ============================================================
# REMOVE DUPLICATES
# ============================================================

def remove_duplicates(records):

    unique_records = []

    seen = set()

    duplicate_count = 0

    for camera in records:

        key = camera_key(camera)

        if key in seen:

            duplicate_count += 1

            continue

        seen.add(key)

        unique_records.append(
            camera
        )

    print(
        f"\nRemoving duplicate records..."
    )

    print(
        f"Removed {duplicate_count} duplicate records"
    )

    print(
        f"Unique records: {len(unique_records)}"
    )

    return unique_records


# ============================================================
# CREATE LOCATION
# ============================================================

def create_location(
    cursor,
    latitude,
    longitude
):

    cursor.execute(
        """
        ST_SetSRID(
            ST_MakePoint(%s, %s),
            4326
        )
        """,
        (
            longitude,
            latitude
        )
    )


# ============================================================
# INSERT OR UPDATE CAMERA
# ============================================================

def upsert_camera(
    cursor,
    camera
):

    latitude = camera["latitude"]

    longitude = camera["longitude"]

    cursor.execute(
        """
        SELECT
            id,
            country,
            city,
            state,
            road_name,
            camera_type,
            enforcement_type,
            speed_limit,
            status,
            verification_status,
            source,
            source_url
        FROM cameras
        WHERE
            ABS(latitude - %s) < 0.000001
            AND ABS(longitude - %s) < 0.000001
            AND LOWER(city) = LOWER(%s)
            AND LOWER(road_name) = LOWER(%s)
            AND LOWER(camera_type) = LOWER(%s)
        LIMIT 1
        """,
        (
            latitude,
            longitude,
            camera["city"],
            camera["road_name"],
            camera["camera_type"],
        )
    )

    existing = cursor.fetchone()

    # ========================================================
    # INSERT NEW CAMERA
    # ========================================================

    if not existing:

        cursor.execute(
            """
            INSERT INTO cameras (
                latitude,
                longitude,
                location,
                country,
                city,
                state,
                road_name,
                camera_type,
                enforcement_type,
                speed_limit,
                status,
                verification_status,
                source,
                source_url,
                last_verified
            )
            VALUES (
                %s,
                %s,
                ST_SetSRID(
                    ST_MakePoint(%s, %s),
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
                %s,
                %s,
                NULL
            )
            """,
            (
                latitude,
                longitude,
                longitude,
                latitude,
                camera.get("country"),
                camera.get("city"),
                camera.get("state"),
                camera.get("road_name"),
                camera.get("camera_type"),
                camera.get(
                    "enforcement_type"
                ),
                camera.get(
                    "speed_limit"
                ),
                camera.get("status"),
                camera.get(
                    "verification_status"
                ),
                camera.get("source"),
                camera.get("source_url"),
            )
        )

        return "inserted"

    # ========================================================
    # CHECK IF DATA CHANGED
    # ========================================================

    existing_data = {

        "country": existing[1],

        "city": existing[2],

        "state": existing[3],

        "road_name": existing[4],

        "camera_type": existing[5],

        "enforcement_type": existing[6],

        "speed_limit": existing[7],

        "status": existing[8],

        "verification_status": existing[9],

        "source": existing[10],

        "source_url": existing[11],
    }

    new_data = {

        "country":
            camera.get("country"),

        "city":
            camera.get("city"),

        "state":
            camera.get("state"),

        "road_name":
            camera.get("road_name"),

        "camera_type":
            camera.get("camera_type"),

        "enforcement_type":
            camera.get(
                "enforcement_type"
            ),

        "speed_limit":
            camera.get(
                "speed_limit"
            ),

        "status":
            camera.get(
                "status"
            ),

        "verification_status":
            camera.get(
                "verification_status"
            ),

        "source":
            camera.get(
                "source"
            ),

        "source_url":
            camera.get(
                "source_url"
            ),
    }

    # ========================================================
    # NO CHANGES
    # ========================================================

    if existing_data == new_data:

        return "skipped"

    # ========================================================
    # UPDATE EXISTING CAMERA
    # ========================================================

    cursor.execute(
        """
        UPDATE cameras
        SET
            country = %s,
            city = %s,
            state = %s,
            road_name = %s,
            camera_type = %s,
            enforcement_type = %s,
            speed_limit = %s,
            status = %s,
            verification_status = %s,
            source = %s,
            source_url = %s,
            latitude = %s,
            longitude = %s,
            location = ST_SetSRID(
                ST_MakePoint(%s, %s),
                4326
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """,
        (
            camera.get("country"),
            camera.get("city"),
            camera.get("state"),
            camera.get("road_name"),
            camera.get("camera_type"),
            camera.get(
                "enforcement_type"
            ),
            camera.get(
                "speed_limit"
            ),
            camera.get("status"),
            camera.get(
                "verification_status"
            ),
            camera.get("source"),
            camera.get("source_url"),
            latitude,
            longitude,
            longitude,
            latitude,
            existing[0],
        )
    )

    return "updated"


# ============================================================
# SAVE PIPELINE RUN
# ============================================================

def save_pipeline_run(
    started_at,
    completed_at,
    status,
    inserted,
    updated,
    skipped,
    errors,
    total_records
):

    connection = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO pipeline_runs (
                started_at,
                completed_at,
                status,
                inserted,
                updated,
                skipped,
                errors,
                total_records
            )
            VALUES (
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
                started_at,
                completed_at,
                status,
                inserted,
                updated,
                skipped,
                errors,
                total_records,
            )
        )

        connection.commit()

        cursor.close()

        print(
            "\nPipeline run history saved successfully."
        )

    except Exception as error:

        print(
            "\nCould not save pipeline run:",
            error
        )

        if connection:

            connection.rollback()

    finally:

        if connection:

            connection.close()


# ============================================================
# MAIN PIPELINE
# ============================================================

def run_pipeline():

    started_at = datetime.datetime.now()

    inserted = 0

    updated = 0

    skipped = 0

    errors = 0

    total_records = 0

    status = "SUCCESS"

    print(
        "\n================================"
    )

    print(
        "GLOBAL CAMERA MAP DATA PIPELINE"
    )

    print(
        "================================"
    )

    # ========================================================
    # STEP 1
    # ========================================================

    print(
        "\nStep 1: Loading camera data..."
    )

    records = load_all_sources()

    total_records = len(records)

    # ========================================================
    # STEP 2
    # ========================================================

    print(
        "\nStep 2: Cleaning camera data..."
    )

    records = clean_cameras(
        records
    )

    # ========================================================
    # STEP 3
    # ========================================================

    print(
        "\nStep 3: Validating camera data..."
    )

    records = validate_cameras(
        records
    )

    # ========================================================
    # REMOVE DUPLICATES
    # ========================================================

    records = remove_duplicates(
        records
    )

    # ========================================================
    # STEP 4
    # ========================================================

    print(
        "\nStep 4: Loading cameras into PostGIS..."
    )

    connection = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor()

        for camera in records:

            try:

                result = upsert_camera(
                    cursor,
                    camera
                )

                if result == "inserted":

                    inserted += 1

                    print(
                        f"Inserted camera: "
                        f"{camera['city']} - "
                        f"{camera['road_name']}"
                    )

                elif result == "updated":

                    updated += 1

                    print(
                        f"Updated camera: "
                        f"{camera['city']} - "
                        f"{camera['road_name']}"
                    )

                elif result == "skipped":

                    skipped += 1

                    print(
                        f"Skipped unchanged: "
                        f"{camera['city']} - "
                        f"{camera['road_name']}"
                    )

            except Exception as error:

                errors += 1

                print(
                    f"Error processing camera: "
                    f"{camera.get('city')} - "
                    f"{camera.get('road_name')}"
                )

                print(
                    "Error:",
                    error
                )

                # Rollback failed transaction
                connection.rollback()

        connection.commit()

        cursor.close()

    except Exception as error:

        status = "FAILED"

        errors += 1

        print(
            "\nDatabase pipeline error:",
            error
        )

        if connection:

            connection.rollback()

    finally:

        if connection:

            connection.close()

    # ========================================================
    # FINAL STATUS
    # ========================================================

    if errors > 0:

        status = "FAILED"

    completed_at = datetime.datetime.now()

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

    print(
        "\n================================"
    )

    if status == "SUCCESS":

        print(
            "✅ PIPELINE COMPLETED"
        )

    else:

        print(
            "❌ PIPELINE COMPLETED WITH ERRORS"
        )

    print(
        "================================"
    )

    # ========================================================
    # SAVE PIPELINE HISTORY
    # ========================================================

    save_pipeline_run(
        started_at=started_at,
        completed_at=completed_at,
        status=status,
        inserted=inserted,
        updated=updated,
        skipped=skipped,
        errors=errors,
        total_records=total_records,
    )


# ============================================================
# RUN PIPELINE
# ============================================================

if __name__ == "__main__":

    run_pipeline()