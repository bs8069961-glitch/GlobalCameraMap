import json
from pathlib import Path
from datetime import datetime


# ============================================================
# PROJECT ROOT
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]


# ============================================================
# FILES
# ============================================================

RAW_DIR = BASE_DIR / "data" / "raw"

OSM_FILE = RAW_DIR / "osm_cameras.json"

OUTPUT_FILE = RAW_DIR / "all_cameras.json"


# ============================================================
# POSSIBLE DEMO DATA FILES
# ============================================================

DEMO_JSON_FILES = [
    RAW_DIR / "demo_cameras.json",
    RAW_DIR / "cameras.json",
    RAW_DIR / "demo_data.json",
]


DEMO_CSV_FILES = [
    RAW_DIR / "cameras.csv",
    RAW_DIR / "demo_cameras.csv",
]


# ============================================================
# HELPERS
# ============================================================

def load_json_file(file_path):
    """
    Load a JSON file containing a list of cameras.
    """

    if not file_path.exists():
        return []

    try:

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

    except Exception as error:

        print(
            f"WARNING: Could not read {file_path}: {error}"
        )

        return []

    if not isinstance(data, list):

        print(
            f"WARNING: {file_path} does not contain a list."
        )

        return []

    return data


# ============================================================
# NORMALIZE CAMERA
# ============================================================

def normalize_camera(camera, default_source=None):

    if not isinstance(camera, dict):
        return None

    latitude = camera.get("latitude")
    longitude = camera.get("longitude")

    if latitude is None or longitude is None:
        return None

    try:

        latitude = float(latitude)
        longitude = float(longitude)

    except (TypeError, ValueError):

        return None

    # --------------------------------------------------------
    # Determine source
    # --------------------------------------------------------

    source = camera.get(
        "source",
        default_source
    )

    if not source:
        source = "Unknown"

    # --------------------------------------------------------
    # Preserve camera type
    # --------------------------------------------------------

    camera_type = camera.get(
        "camera_type",
        "Traffic Camera"
    )

    # --------------------------------------------------------
    # Preserve enforcement type
    # --------------------------------------------------------

    enforcement_type = camera.get(
        "enforcement_type"
    )

    # --------------------------------------------------------
    # Build normalized record
    # --------------------------------------------------------

    normalized = {

        "source": source,

        "source_id": camera.get(
            "source_id"
        ),

        "latitude": latitude,

        "longitude": longitude,

        "country": camera.get(
            "country",
            "India"
        ),

        "state": camera.get(
            "state"
        ),

        "city": camera.get(
            "city"
        ),

        "road_name": camera.get(
            "road_name",
            "Unknown Road"
        ),

        "camera_type": camera_type,

        "enforcement_type": enforcement_type,

        "speed_limit": camera.get(
            "speed_limit"
        ),

        "status": camera.get(
            "status",
            "active"
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

        "imported_at": camera.get(
            "imported_at",
            datetime.now().isoformat()
        )
    }

    return normalized


# ============================================================
# LOAD OSM
# ============================================================

def load_osm_cameras():

    print()
    print("Loading OpenStreetMap data...")
    print(
        f"File: {OSM_FILE}"
    )

    cameras = load_json_file(
        OSM_FILE
    )

    normalized = []

    for camera in cameras:

        item = normalize_camera(
            camera,
            "OpenStreetMap"
        )

        if item:
            normalized.append(item)

    print(
        f"OSM records loaded: {len(normalized)}"
    )

    return normalized


# ============================================================
# LOAD DEMO DATA
# ============================================================

def load_demo_cameras():

    print()
    print("Searching for Demo Dataset...")

    for file_path in DEMO_JSON_FILES:

        if not file_path.exists():
            continue

        print(
            f"Demo source found: {file_path}"
        )

        cameras = load_json_file(
            file_path
        )

        normalized = []

        for camera in cameras:

            item = normalize_camera(
                camera,
                "Demo Dataset"
            )

            if item:
                normalized.append(item)

        print(
            f"Demo records loaded: {len(normalized)}"
        )

        return normalized

    print(
        "No separate demo JSON file found."
    )

    return []


# ============================================================
# DEDUPLICATION
# ============================================================

def deduplicate_cameras(cameras):

    unique = {}

    exact_duplicates = 0

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

        city = camera.get(
            "city"
        )

        road_name = camera.get(
            "road_name"
        )

        camera_type = camera.get(
            "camera_type"
        )

        # ----------------------------------------------------
        # Best identity:
        # source + source_id
        # ----------------------------------------------------

        if source_id:

            key = (
                "SOURCE_ID",
                source,
                str(source_id)
            )

        else:

            # ------------------------------------------------
            # Fallback identity for records without source_id
            # ------------------------------------------------

            key = (
                "COORDINATE",
                source,
                round(float(latitude), 7),
                round(float(longitude), 7),
                city,
                road_name,
                camera_type
            )

        if key in unique:

            exact_duplicates += 1
            continue

        unique[key] = camera

    return list(
        unique.values()
    ), exact_duplicates


# ============================================================
# SAVE OUTPUT
# ============================================================

def save_cameras(cameras):

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            cameras,
            file,
            indent=4,
            ensure_ascii=False
        )

    print()
    print(
        f"Saved merged file: {OUTPUT_FILE}"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("Global Camera Map - Source Merger")
    print("=" * 60)

    # --------------------------------------------------------
    # Load sources
    # --------------------------------------------------------

    osm_cameras = load_osm_cameras()

    demo_cameras = load_demo_cameras()

    # --------------------------------------------------------
    # Combine
    # --------------------------------------------------------

    all_cameras = []

    all_cameras.extend(
        demo_cameras
    )

    all_cameras.extend(
        osm_cameras
    )

    print()
    print(
        f"Records before deduplication: {len(all_cameras)}"
    )

    # --------------------------------------------------------
    # Deduplicate
    # --------------------------------------------------------

    unique_cameras, duplicates = deduplicate_cameras(
        all_cameras
    )

    print(
        f"Exact duplicates removed: {duplicates}"
    )

    print(
        f"Final merged records: {len(unique_cameras)}"
    )

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    save_cameras(
        unique_cameras
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    from collections import Counter

    sources = Counter(
        camera.get("source")
        for camera in unique_cameras
    )

    camera_types = Counter(
        camera.get("camera_type")
        for camera in unique_cameras
    )

    print()
    print("Source summary:")

    for source, count in sources.items():

        print(
            f"  {source}: {count}"
        )

    print()
    print("Camera type summary:")

    for camera_type, count in camera_types.items():

        print(
            f"  {camera_type}: {count}"
        )

    print()
    print("=" * 60)
    print("MERGE COMPLETED")
    print("=" * 60)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()