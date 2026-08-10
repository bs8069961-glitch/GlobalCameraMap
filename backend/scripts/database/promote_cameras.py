# ============================================================
# Global Camera Map
# Camera Promotion Script
# ============================================================

import sys
from pathlib import Path


# ============================================================
# PROJECT ROOT
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


# ============================================================
# DATABASE IMPORT
# ============================================================

from scripts.database.db import get_connection


# ============================================================
# HEADER
# ============================================================

def print_header():

    print()
    print("=" * 60)
    print("Global Camera Map - Camera Promotion")
    print("=" * 60)
    print()


# ============================================================
# PROMOTE CAMERAS
# ============================================================

def promote_cameras():

    connection = None

    inserted = 0
    duplicates = 0
    skipped = 0

    try:

        # ----------------------------------------------------
        # DATABASE CONNECTION
        # ----------------------------------------------------

        connection = get_connection()

        print("Database connection successful")
        print()

        with connection.cursor() as cursor:

            # ------------------------------------------------
            # LOAD STAGING RECORDS
            # ------------------------------------------------

            cursor.execute(
                """
                SELECT
                    id,
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
                    last_verified
                FROM camera_import_staging
                ORDER BY id
                """
            )

            staging_records = cursor.fetchall()

            print(
                f"Staging records found: {len(staging_records)}"
            )

            print()

            # ------------------------------------------------
            # PROCESS EACH STAGING RECORD
            # ------------------------------------------------

            for record in staging_records:

                (
                    staging_id,
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
                    last_verified,
                ) = record

                # --------------------------------------------
                # BASIC VALIDATION
                # --------------------------------------------

                if latitude is None or longitude is None:

                    print(
                        f"Skipping staging ID {staging_id}: "
                        "missing coordinates"
                    )

                    skipped += 1
                    continue

                try:

                    latitude = float(latitude)
                    longitude = float(longitude)

                except (TypeError, ValueError):

                    print(
                        f"Skipping staging ID {staging_id}: "
                        "invalid coordinates"
                    )

                    skipped += 1
                    continue

                if not (-90 <= latitude <= 90):

                    print(
                        f"Skipping staging ID {staging_id}: "
                        "invalid latitude"
                    )

                    skipped += 1
                    continue

                if not (-180 <= longitude <= 180):

                    print(
                        f"Skipping staging ID {staging_id}: "
                        "invalid longitude"
                    )

                    skipped += 1
                    continue

                if not country:

                    print(
                        f"Skipping staging ID {staging_id}: "
                        "missing country"
                    )

                    skipped += 1
                    continue

                if not camera_type:

                    print(
                        f"Skipping staging ID {staging_id}: "
                        "missing camera type"
                    )

                    skipped += 1
                    continue

                # --------------------------------------------
                # DUPLICATE CHECK
                #
                # cameras has this unique identity:
                #
                # latitude
                # longitude
                # city
                # road_name
                # camera_type
                # --------------------------------------------

                cursor.execute(
                    """
                    SELECT id
                    FROM cameras
                    WHERE latitude = %s
                      AND longitude = %s
                      AND city IS NOT DISTINCT FROM %s
                      AND road_name IS NOT DISTINCT FROM %s
                      AND camera_type = %s
                    LIMIT 1
                    """,
                    (
                        latitude,
                        longitude,
                        city,
                        road_name,
                        camera_type,
                    )
                )

                existing_camera = cursor.fetchone()

                if existing_camera:

                    duplicates += 1

                    continue

                # --------------------------------------------
                # INSERT NEW CAMERA
                # --------------------------------------------

                cursor.execute(
                    """
                    INSERT INTO cameras
                    (
                        latitude,
                        longitude,
                        location,
                        country,
                        city,
                        camera_type,
                        speed_limit,
                        status,
                        verification_status,
                        source,
                        created_at,
                        updated_at,
                        state,
                        road_name,
                        enforcement_type,
                        source_url,
                        last_verified,
                        operational_status,
                        is_active
                    )
                    VALUES
                    (
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
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        CASE
                            WHEN %s = 'active'
                            THEN 'active'
                            ELSE 'unknown'
                        END,
                        TRUE
                    )
                    RETURNING id
                    """,
                    (
                        latitude,
                        longitude,

                        # PostGIS expects:
                        # longitude, latitude
                        longitude,
                        latitude,

                        country,
                        city,
                        camera_type,
                        speed_limit,
                        status,
                        verification_status,
                        source,
                        state,
                        road_name,
                        enforcement_type,
                        source_url,
                        last_verified,

                        status,
                    )
                )

                new_camera = cursor.fetchone()

                if new_camera:

                    inserted += 1

                    print(
                        f"Promoted staging {staging_id} "
                        f"-> camera {new_camera[0]}"
                    )

            # ------------------------------------------------
            # COMMIT
            # ------------------------------------------------

            connection.commit()

    except Exception as error:

        if connection:

            connection.rollback()

        print()
        print("=" * 60)
        print("PROMOTION FAILED")
        print("=" * 60)
        print()
        print(f"Error: {error}")
        print()

        raise

    finally:

        if connection:

            connection.close()

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("CAMERA PROMOTION COMPLETE")
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

    return inserted


# ============================================================
# MAIN
# ============================================================

def main():

    print_header()

    promote_cameras()

    print()
    print(
        "Promotion stage completed."
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()