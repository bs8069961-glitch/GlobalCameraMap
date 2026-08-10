import json
import time
from pathlib import Path
from datetime import datetime

import requests


# ============================================================
# GLOBAL CAMERA MAP
# OpenStreetMap Camera Importer
# ============================================================


BASE_DIR = Path(__file__).resolve().parents[2]


# ============================================================
# OUTPUT
# ============================================================

OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / "raw"
    / "osm_cameras.json"
)


# ============================================================
# OVERPASS SERVERS
# ============================================================

OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]


# ============================================================
# REQUEST SETTINGS
# ============================================================

USER_AGENT = (
    "GlobalCameraMap/1.0 "
    "(OpenStreetMap camera data importer)"
)

REQUEST_TIMEOUT = 180


# ============================================================
# REGION
# ============================================================
# Current testing region:
#
# South = 30.65
# West  = 76.70
# North = 30.80
# East  = 76.85
#
# This is intentionally kept as Chandigarh for now.
# We will expand to India in the next step.
# ============================================================

REGION_NAME = "Chandigarh"

SOUTH = 30.65
WEST = 76.70
NORTH = 30.80
EAST = 76.85


# ============================================================
# CAMERA CLASSIFICATION
# ============================================================

def classify_camera(tags):
    """
    Classify an OSM object based on its available tags.

    Important:
    We do NOT assume every surveillance object is
    an enforcement camera.
    """

    highway = str(tags.get("highway", "")).lower().strip()
    surveillance = str(
        tags.get("surveillance", "")
    ).lower().strip()

    surveillance_type = str(
        tags.get("surveillance:type", "")
    ).lower().strip()

    camera_type = str(
        tags.get("camera:type", "")
    ).lower().strip()

    enforcement = str(
        tags.get("enforcement", "")
    ).lower().strip()

    traffic_signals = str(
        tags.get("traffic_signals", "")
    ).lower().strip()

    # --------------------------------------------------------
    # SPEED CAMERA
    # --------------------------------------------------------

    if highway == "speed_camera":
        return (
            "Speed Camera",
            "speed enforcement"
        )

    if camera_type in {
        "speed",
        "speed_camera",
        "speed enforcement",
    }:
        return (
            "Speed Camera",
            "speed enforcement"
        )

    if surveillance_type in {
        "speed",
        "speed_camera",
        "speed enforcement",
    }:
        return (
            "Speed Camera",
            "speed enforcement"
        )

    # --------------------------------------------------------
    # RED LIGHT / TRAFFIC SIGNAL ENFORCEMENT
    # --------------------------------------------------------

    red_light_keywords = {
        "redlight",
        "red_light",
        "red light",
        "traffic signal",
        "traffic_signals",
        "intersection",
    }

    combined_values = " ".join(
        [
            highway,
            surveillance,
            surveillance_type,
            camera_type,
            enforcement,
            traffic_signals,
        ]
    )

    if any(
        keyword in combined_values
        for keyword in red_light_keywords
    ):
        if (
            "red" in combined_values
            or "enforcement" in combined_values
        ):
            return (
                "Red Light Camera",
                "red light enforcement"
            )

    # --------------------------------------------------------
    # ENFORCEMENT CAMERA
    # --------------------------------------------------------

    if enforcement in {
        "yes",
        "traffic",
        "enforcement",
    }:
        return (
            "Traffic Enforcement Camera",
            "traffic enforcement"
        )

    if "enforcement" in combined_values:
        return (
            "Traffic Enforcement Camera",
            "traffic enforcement"
        )

    # --------------------------------------------------------
    # GENERIC SURVEILLANCE
    # --------------------------------------------------------

    if (
        tags.get("man_made") == "surveillance"
        or surveillance
        or surveillance_type
        or camera_type == "surveillance"
    ):
        return (
            "Surveillance Camera",
            "surveillance"
        )

    # --------------------------------------------------------
    # GENERIC TRAFFIC CAMERA
    # --------------------------------------------------------

    if (
        tags.get("highway") == "traffic_signals"
        or tags.get("camera") == "traffic"
    ):
        return (
            "Traffic Camera",
            "traffic monitoring"
        )

    # --------------------------------------------------------
    # UNKNOWN
    # --------------------------------------------------------

    return (
        "Traffic Camera",
        "unknown"
    )


# ============================================================
# SPEED LIMIT EXTRACTION
# ============================================================

def extract_speed_limit(tags):
    """
    Extract maxspeed when OSM provides it.
    """

    value = tags.get("maxspeed")

    if value is None:
        return None

    try:
        value = str(value)

        # Examples:
        # 50
        # 50 km/h
        # 50 mph

        number = ""

        for character in value:
            if character.isdigit():
                number += character
            elif number:
                break

        if number:
            return int(number)

    except Exception:
        pass

    return None


# ============================================================
# ROAD NAME
# ============================================================

def extract_road_name(tags):
    """
    Try several common OSM road-name tags.
    """

    for key in [
        "name",
        "ref",
        "official_name",
        "alt_name",
    ]:
        value = tags.get(key)

        if value:
            return str(value).strip()

    return "Unknown Road"


# ============================================================
# CITY
# ============================================================

def extract_city(tags):
    """
    Extract city information when available.
    """

    for key in [
        "addr:city",
        "addr:town",
        "addr:municipality",
    ]:
        value = tags.get(key)

        if value:
            return str(value).strip()

    return REGION_NAME


# ============================================================
# STATE
# ============================================================

def extract_state(tags):
    """
    Current test region is Chandigarh.

    For the India-wide importer we will replace this
    with region-specific state information.
    """

    value = tags.get("addr:state")

    if value:
        return str(value).strip()

    return "Chandigarh"


# ============================================================
# BUILD CAMERA RECORD
# ============================================================

def build_camera_record(element):
    """
    Convert one OSM element into the application's
    normalized camera format.
    """

    tags = element.get("tags", {})

    latitude = element.get("lat")
    longitude = element.get("lon")

    if latitude is None or longitude is None:
        return None

    camera_type, enforcement_type = classify_camera(tags)

    source_id = str(
        element.get("id")
    )

    camera = {
        "source": "OpenStreetMap",

        "source_id": source_id,

        "latitude": float(latitude),

        "longitude": float(longitude),

        "country": "India",

        "state": extract_state(tags),

        "city": extract_city(tags),

        "road_name": extract_road_name(tags),

        "camera_type": camera_type,

        "enforcement_type": enforcement_type,

        "speed_limit": extract_speed_limit(tags),

        "status": "active",

        "verification_status": "pending",

        "source_url": (
            "https://www.openstreetmap.org/"
            f"{element.get('type', 'node')}/"
            f"{source_id}"
        ),

        "raw_data": element,

        "imported_at": datetime.now().isoformat(),

        "last_verified": None,
    }

    return camera


# ============================================================
# OVERPASS QUERY
# ============================================================

def build_query():
    """
    Build the Overpass query for the current region.

    We intentionally collect several camera-related
    OSM structures instead of assuming every surveillance
    object is an enforcement camera.
    """

    query = f"""
[out:json][timeout:120];

(
    node["highway"="speed_camera"]
        ({SOUTH},{WEST},{NORTH},{EAST});

    node["man_made"="surveillance"]
        ({SOUTH},{WEST},{NORTH},{EAST});

    node["camera:type"]
        ({SOUTH},{WEST},{NORTH},{EAST});

    node["surveillance:type"]
        ({SOUTH},{WEST},{NORTH},{EAST});

    node["enforcement"]
        ({SOUTH},{WEST},{NORTH},{EAST});

);

out body;
"""

    return query


# ============================================================
# FETCH FROM OVERPASS
# ============================================================

def fetch_from_server(server, query):
    """
    Request data from one Overpass server.
    """

    print()
    print(f"Trying server: {server}")

    response = requests.post(
        server,
        data=query,
        headers={
            "User-Agent": USER_AGENT
        },
        timeout=REQUEST_TIMEOUT,
    )

    print(
        f"HTTP status: {response.status_code}"
    )

    if response.status_code != 200:
        print(
            "Server response:",
            response.text[:500]
        )

        return None

    return response


# ============================================================
# FETCH OSM CAMERAS
# ============================================================

def fetch_osm_cameras():
    """
    Fetch and normalize OSM camera records.
    """

    print()
    print("=" * 60)
    print("Global Camera Map - OpenStreetMap Import")
    print("=" * 60)

    print()
    print("Region:")
    print(f"South = {SOUTH}")
    print(f"West  = {WEST}")
    print(f"North = {NORTH}")
    print(f"East  = {EAST}")

    query = build_query()

    response = None

    # --------------------------------------------------------
    # TRY SERVERS
    # --------------------------------------------------------

    for server in OVERPASS_SERVERS:

        try:

            response = fetch_from_server(
                server,
                query
            )

            if response is not None:
                break

        except requests.RequestException as error:

            print()
            print(
                f"Server failed: {error}"
            )

        except Exception as error:

            print()
            print(
                f"Unexpected error: {error}"
            )

        time.sleep(2)

    # --------------------------------------------------------
    # ALL SERVERS FAILED
    # --------------------------------------------------------

    if response is None:

        print()
        print(
            "ERROR: All Overpass servers failed."
        )

        print(
            "Existing OSM data has not been modified."
        )

        return []

    # --------------------------------------------------------
    # PARSE RESPONSE
    # --------------------------------------------------------

    try:

        data = response.json()

    except Exception as error:

        print()
        print(
            f"ERROR: Invalid Overpass JSON: {error}"
        )

        return []

    elements = data.get(
        "elements",
        []
    )

    print()
    print(
        f"OSM elements received: {len(elements)}"
    )

    # --------------------------------------------------------
    # NORMALIZE
    # --------------------------------------------------------

    cameras = []

    seen_ids = set()

    for element in elements:

        source_id = element.get("id")

        if source_id is None:
            continue

        source_id = str(source_id)

        # Avoid duplicate elements returned
        # by overlapping OSM query conditions.

        if source_id in seen_ids:
            continue

        seen_ids.add(source_id)

        camera = build_camera_record(
            element
        )

        if camera is not None:
            cameras.append(camera)

    # --------------------------------------------------------
    # SORT
    # --------------------------------------------------------

    cameras.sort(
        key=lambda camera: (
            camera["city"],
            camera["latitude"],
            camera["longitude"],
        )
    )

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("OSM IMPORT COMPLETE")
    print("=" * 60)

    print(
        f"Unique cameras: {len(cameras)}"
    )

    print(
        f"Saved file: {OUTPUT_FILE}"
    )

    print()
    print("Camera type summary:")

    type_counts = {}

    for camera in cameras:

        camera_type = camera["camera_type"]

        type_counts[camera_type] = (
            type_counts.get(
                camera_type,
                0
            ) + 1
        )

    for camera_type, count in sorted(
        type_counts.items()
    ):

        print(
            f"  {camera_type}: {count}"
        )

    print()
    print("Enforcement summary:")

    enforcement_counts = {}

    for camera in cameras:

        enforcement_type = (
            camera["enforcement_type"]
        )

        enforcement_counts[
            enforcement_type
        ] = (
            enforcement_counts.get(
                enforcement_type,
                0
            ) + 1
        )

    for enforcement_type, count in sorted(
        enforcement_counts.items()
    ):

        print(
            f"  {enforcement_type}: {count}"
        )

    print()
    print("=" * 60)

    return cameras


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    fetch_osm_cameras()