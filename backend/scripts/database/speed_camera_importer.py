import csv
import sys
from pathlib import Path


# ============================================================
# PROJECT PATH
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


# ============================================================
# DATABASE
# ============================================================

try:
    from scripts.database.db import get_connection
except ModuleNotFoundError:
    from db import get_connection


# ============================================================
# CSV
# ============================================================

CSV_FILE = (
    BASE_DIR
    / "data"
    / "raw"
    / "speed_cameras_india.csv"
)


# ============================================================
# CONSTANTS
# ============================================================

EXPECTED_COUNTRY = "India"
EXPECTED_CAMERA_TYPE = "Speed Camera"


# ============================================================
# HELPERS
# ============================================================

def clean(value):
    if value is None:
        return ""

    return str(value).strip()


def valid_coordinate(latitude, longitude):

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        return False

    return (
        -90 <= lat <= 90
        and -180 <= lon <= 180
    )


def normalize_verification_status(value):

    value = clean(value).lower()

    if value in {
        "verified",
        "pending",
        "rejected",
    }:
        return value

    return "pending"


# ============================================================
# LOAD CSV
# ============================================================

def load_csv():

    if not CSV_FILE.exists():

        raise FileNotFoundError(
            f"CSV file not found:\n{CSV_FILE}"
        )

    records = []

    with CSV_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        if not reader.fieldnames:

            raise ValueError(
                "CSV does not contain a header row."
            )

        required_columns = {
            "source",
            "source_id",
            "country",
            "state",
            "city",
            "road_name",
            "latitude",
            "longitude",
            "camera_type",
            "enforcement_type",
            "speed_limit",
            "status",
            "verification_status",
            "source_url",
        }

        missing_columns = (
            required_columns
            - set(reader.fieldnames)
        )

        if missing_columns:

            raise ValueError(
                "CSV is missing required columns: "
                + ", ".join(
                    sorted(missing_columns)
                )
            )

        for row_number, row in enumerate(
            reader,
            start=2
        ):

            record = {
                key: clean(value)
                for key, value in row.items()
            }

            record["_row_number"] = row_number

            records.append(record)

    return records


# ============================================================
# VALIDATE RECORD
# ============================================================

def validate_record(record):

    errors = []

    country = clean(
        record.get("country")
    )

    camera_type = clean(
        record.get("camera_type")
    )

    city = clean(
        record.get("city")
    )

    state = clean(
        record.get("state")
    )

    road_name = clean(
        record.get("road_name")
    )

    source = clean(
        record.get("source")
    )

    source_id = clean(
        record.get("source_id")
    )

    latitude = clean(
        record.get("latitude")
    )

    longitude = clean(
        record.get("longitude")
    )

    # --------------------------------------------------------
    # COUNTRY
    # --------------------------------------------------------

    if country.lower() != EXPECTED_COUNTRY.lower():

        errors.append(
            "country is not India"
        )

    # --------------------------------------------------------
    # CAMERA TYPE
    # --------------------------------------------------------

    if (
        camera_type.lower()
        != EXPECTED_CAMERA_TYPE.lower()
    ):

        errors.append(
            "camera_type is not Speed Camera"
        )

    # --------------------------------------------------------
    # REQUIRED TEXT
    # --------------------------------------------------------

    if not source:
        errors.append("missing source")

    if not source_id:
        errors.append("missing source_id")

    if not state:
        errors.append("missing state")

    if not city:
        errors.append("missing city")

    if not road_name:
        errors.append("missing road name")

    # --------------------------------------------------------
    # COORDINATES
    # --------------------------------------------------------

    if not valid_coordinate(
        latitude,
        longitude
    ):

        errors.append(
            "invalid coordinates"
        )

    return errors


# ============================================================
# IMPORT INTO STAGING
# ============================================================

def import_records(records):

    connection = None
    cursor = None

    inserted = 0
    duplicates = 0
    skipped = 0

    try:

        connection = get_connection()

        print(
            "✅ Database connection successful"
        )

        cursor = connection.cursor()

        for record in records:

            errors = validate_record(
                record
            )

            if errors:

                skipped += 1

                print(
                    f"⚠️ Skipped "
                    f"{record.get('city', 'Unknown')} "
                    f"- {', '.join(errors)}"
                )

                continue

            # ------------------------------------------------
            # EXTRACT VALUES
            # ------------------------------------------------

            source = clean(
                record.get("source")
            )

            source_id = clean(
                record.get("source_id")
            )

            country = clean(
                record.get("country")
            )

            state = clean(
                record.get("state")
            )

            city = clean(
                record.get("city")
            )

            road_name = clean(
                record.get("road_name")
            )

            latitude = float(
                record.get("latitude")
            )

            longitude = float(
                record.get("longitude")
            )

            camera_type = clean(
                record.get("camera_type")
            )

            enforcement_type = clean(
                record.get("enforcement_type")
            )

            speed_limit_value = clean(
                record.get("speed_limit")
            )

            if speed_limit_value:

                try:
                    speed_limit = int(
                        float(speed_limit_value)
                    )

                except ValueError:

                    speed_limit = None

            else:

                speed_limit = None

            status = (
                clean(record.get("status"))
                or "unknown"
            )

            verification_status = (
                normalize_verification_status(
                    record.get(
                        "verification_status"
                    )
                )
            )

            source_url = clean(
                record.get("source_url")
            )

            if not source_url:
                source_url = None

            # ------------------------------------------------
            # DUPLICATE CHECK
            # ------------------------------------------------

            cursor.execute(
                """
                SELECT id
                FROM camera_import_staging
                WHERE source = %s
                  AND source_id = %s
                LIMIT 1
                """,
                (
                    source,
                    source_id,
                )
            )

            existing = cursor.fetchone()

            if existing:

                duplicates += 1

                print(
                    f"↪ Duplicate "
                    f"{city} "
                    f"({source_id})"
                )

                continue

            # ------------------------------------------------
            # INSERT
            # ------------------------------------------------

            cursor.execute(
                """
                INSERT INTO camera_import_staging
                (
                    source,
                    source_id,
                    country,
                    state,
                    city,
                    road_name,
                    latitude,
                    longitude,
                    camera_type,
                    enforcement_type,
                    speed_limit,
                    status,
                    verification_status,
                    source_url
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
                    %s
                )
                """,
                (
                    source,
                    source_id,
                    country,
                    state,
                    city,
                    road_name,
                    latitude,
                    longitude,
                    camera_type,
                    enforcement_type,
                    speed_limit,
                    status,
                    verification_status,
                    source_url,
                )
            )

            inserted += 1

            if source_url:

                print(
                    f"✅ Imported {city} "
                    f"- source URL available"
                )

            else:

                print(
                    f"⚠️ Imported {city} "
                    f"- pending verification "
                    f"(no source URL)"
                )

        connection.commit()

    except Exception:

        if connection:
            connection.rollback()

        raise

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

    return (
        inserted,
        duplicates,
        skipped,
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print(
        "Global Camera Map - India Speed Camera Importer"
    )
    print("=" * 60)
    print()

    print(
        f"CSV: {CSV_FILE}"
    )

    print()

    records = load_csv()

    print(
        f"Loaded {len(records)} "
        f"speed-camera records."
    )

    print()

    (
        inserted,
        duplicates,
        skipped,
    ) = import_records(records)

    print()

    print("=" * 60)
    print(
        "INDIA SPEED CAMERA STAGING IMPORT COMPLETE"
    )
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

    print()

    print(
        "Records have been placed in "
        "camera_import_staging."
    )

    print(
        "They have NOT been promoted into cameras yet."
    )

    print()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()