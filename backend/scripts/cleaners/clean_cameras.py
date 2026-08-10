import json
from pathlib import Path


# ============================================================
# PROJECT ROOT
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]


# ============================================================
# INPUT / OUTPUT
# ============================================================

RAW_FILE = (
    BASE_DIR
    / "data"
    / "raw"
    / "all_cameras.json"
)

OSM_FILE = (
    BASE_DIR
    / "data"
    / "raw"
    / "osm_cameras.json"
)

CLEAN_FILE = (
    BASE_DIR
    / "data"
    / "cleaned"
    / "cameras_clean.json"
)

VALIDATED_FILE = (
    BASE_DIR
    / "data"
    / "cleaned"
    / "validated_cameras.json"
)


# ============================================================
# HELPERS
# ============================================================

def safe_float(value):

    try:
        return float(value)

    except (TypeError, ValueError):

        return None


def safe_int(value):

    try:
        return int(value)

    except (TypeError, ValueError):

        return None


def normalize_camera(camera):

    latitude = safe_float(
        camera.get("latitude")
    )

    longitude = safe_float(
        camera.get("longitude")
    )

    # --------------------------------------------------------
    # Basic location validation
    # --------------------------------------------------------

    if latitude is None:
        return None

    if longitude is None:
        return None

    if not (-90 <= latitude <= 90):
        return None

    if not (-180 <= longitude <= 180):
        return None

    # --------------------------------------------------------
    # Source
    # --------------------------------------------------------

    source = (
        camera.get("source")
        or "Unknown"
    )

    source_id = camera.get(
        "source_id"
    )

    # --------------------------------------------------------
    # Country / location
    # --------------------------------------------------------

    country = (
        camera.get("country")
        or "India"
    )

    state = (
        camera.get("state")
        or "Unknown State"
    )

    city = (
        camera.get("city")
        or "Unknown City"
    )

    road_name = (
        camera.get("road_name")
        or "Unknown Road"
    )

    # --------------------------------------------------------
    # Camera type
    # --------------------------------------------------------

    camera_type = (
        camera.get("camera_type")
        or "Unknown"
    )

    enforcement_type = (
        camera.get("enforcement_type")
        or "unknown"
    )

    # --------------------------------------------------------
    # Status
    # --------------------------------------------------------

    status = (
        camera.get("status")
        or "active"
    )

    verification_status = (
        camera.get(
            "verification_status"
        )
        or "pending"
    )

    # --------------------------------------------------------
    # Speed limit
    # --------------------------------------------------------

    speed_limit = safe_int(
        camera.get("speed_limit")
    )

    # --------------------------------------------------------
    # Return normalized record
    # --------------------------------------------------------

    return {

        "source": source,

        "source_id": (
            str(source_id)
            if source_id is not None
            else None
        ),

        "latitude": latitude,

        "longitude": longitude,

        "country": country,

        "state": state,

        "city": city,

        "road_name": road_name,

        "camera_type": camera_type,

        "enforcement_type":
            enforcement_type,

        "speed_limit":
            speed_limit,

        "status": status,

        "verification_status":
            verification_status,

        "source_url":
            camera.get("source_url"),

        "raw_data":
            camera.get("raw_data"),

        "imported_at":
            camera.get("imported_at"),

        "last_verified":
            camera.get("last_verified"),

    }


# ============================================================
# LOAD RAW DATA
# ============================================================

def load_json_file(path):

    if not path.exists():

        return []

    try:

        with open(
            path,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

        if not isinstance(data, list):

            print(
                f"WARNING: {path} "
                "does not contain a list."
            )

            return []

        return data

    except Exception as error:

        print(
            f"ERROR reading {path}: "
            f"{error}"
        )

        return []


# ============================================================
# REMOVE EXACT DUPLICATES
# ============================================================

def deduplicate_exact(cameras):

    unique = []

    seen_source_ids = set()

    seen_coordinates = set()

    duplicates = 0

    for camera in cameras:

        source = camera.get(
            "source"
        )

        source_id = camera.get(
            "source_id"
        )

        latitude = camera.get(
            "latitude"
        )

        longitude = camera.get(
            "longitude"
        )

        # ----------------------------------------------------
        # Strongest duplicate key:
        # source + source_id
        # ----------------------------------------------------

        if source_id:

            source_key = (
                source,
                source_id
            )

            if source_key in seen_source_ids:

                duplicates += 1
                continue

            seen_source_ids.add(
                source_key
            )

        # ----------------------------------------------------
        # Exact coordinate duplicate
        # ----------------------------------------------------

        coordinate_key = (
            round(latitude, 7),
            round(longitude, 7)
        )

        if coordinate_key in seen_coordinates:

            duplicates += 1
            continue

        seen_coordinates.add(
            coordinate_key
        )

        unique.append(camera)

    return unique, duplicates


# ============================================================
# CLEAN CAMERAS
# ============================================================

def clean_cameras():

    print()
    print("=" * 60)
    print("Global Camera Map - Camera Cleaner")
    print("=" * 60)

    # --------------------------------------------------------
    # Determine available input
    # --------------------------------------------------------

    cameras = []

    if RAW_FILE.exists():

        print(
            f"Loading merged data:"
            f" {RAW_FILE}"
        )

        cameras = load_json_file(
            RAW_FILE
        )

    elif OSM_FILE.exists():

        print(
            "all_cameras.json not found."
        )

        print(
            f"Using OSM data:"
            f" {OSM_FILE}"
        )

        cameras = load_json_file(
            OSM_FILE
        )

    else:

        print()
        print(
            "ERROR: No camera input found."
        )

        print(
            f"Expected either:"
        )

        print(
            f"  {RAW_FILE}"
        )

        print(
            f"  {OSM_FILE}"
        )

        return

    print(
        f"Raw records: {len(cameras)}"
    )

    # --------------------------------------------------------
    # Normalize
    # --------------------------------------------------------

    cleaned = []

    invalid = 0

    for camera in cameras:

        normalized = normalize_camera(
            camera
        )

        if normalized is None:

            invalid += 1
            continue

        cleaned.append(
            normalized
        )

    print(
        f"Valid records: {len(cleaned)}"
    )

    print(
        f"Invalid records: {invalid}"
    )

    # --------------------------------------------------------
    # Exact duplicate removal
    # --------------------------------------------------------

    cleaned, duplicates = (
        deduplicate_exact(cleaned)
    )

    print(
        f"Exact duplicates removed:"
        f" {duplicates}"
    )

    # --------------------------------------------------------
    # Create output directory
    # --------------------------------------------------------

    CLEAN_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # Save cleaned data
    # --------------------------------------------------------

    with open(
        CLEAN_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            cleaned,
            file,
            indent=4,
            ensure_ascii=False
        )

    print()
    print(
        f"Cleaned file saved:"
        f" {CLEAN_FILE}"
    )

    print(
        f"Final cleaned records:"
        f" {len(cleaned)}"
    )

    # --------------------------------------------------------
    # Also create validated file
    #
    # The existing database loader expects:
    # validated_cameras.json
    # --------------------------------------------------------

    with open(
        VALIDATED_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            cleaned,
            file,
            indent=4,
            ensure_ascii=False
        )

    print(
        f"Validated file saved:"
        f" {VALIDATED_FILE}"
    )

    # --------------------------------------------------------
    # Camera type summary
    # --------------------------------------------------------

    type_counts = {}

    for camera in cleaned:

        camera_type = camera[
            "camera_type"
        ]

        type_counts[camera_type] = (
            type_counts.get(
                camera_type,
                0
            ) + 1
        )

    print()
    print("Camera type summary:")

    for camera_type, count in sorted(
        type_counts.items()
    ):

        print(
            f"  {camera_type}: {count}"
        )

    print()
    print("=" * 60)
    print("CLEANING COMPLETED")
    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    clean_cameras()