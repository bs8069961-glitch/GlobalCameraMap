import math
import logging
import os
from typing import Any, Dict, List, Optional

import requests
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.database import get_db_connection
from backend.services.traffic import analyze_traffic


logger = logging.getLogger("global-camera-map.routing")


router = APIRouter(
    prefix="/routing",
    tags=["Routing"],
)


# ============================================================
# CONFIGURATION
# ============================================================

OSRM_BASE_URL = os.getenv(
    "OSRM_BASE_URL",
    "https://router.project-osrm.org",
)

GOOGLE_ROUTES_URL = (
    "https://routes.googleapis.com/"
    "directions/v2:computeRoutes"
)

GOOGLE_MAPS_API_KEY = os.getenv(
    "GOOGLE_MAPS_API_KEY",
    "",
).strip()

TRAFFIC_PROVIDER = os.getenv(
    "TRAFFIC_PROVIDER",
    "google",
).strip().lower()

DEFAULT_CAMERA_RADIUS_METERS = 200

TRAFFIC_TIMEOUT_SECONDS = 20


# ============================================================
# PYDANTIC MODELS
# ============================================================

class RouteRequest(BaseModel):
    """
    Request a route between two coordinates.
    """

    start_lat: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    start_lng: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    destination_lat: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    destination_lng: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    profile: str = "driving"

    alternatives: bool = True

    camera_radius_meters: float = Field(
        default=DEFAULT_CAMERA_RADIUS_METERS,
        ge=25,
        le=1000,
    )


class RoutePoint(BaseModel):
    latitude: float
    longitude: float


# ============================================================
# HELPERS
# ============================================================

def haversine_distance_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate straight-line distance between two GPS coordinates.
    """

    earth_radius = 6_371_000

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(
        lat2 - lat1
    )

    delta_lon = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )

    return earth_radius * c


def validate_profile(
    profile: str,
) -> str:
    """
    Validate supported routing profiles.
    """

    allowed = {
        "driving",
        "walking",
        "cycling",
    }

    profile = profile.lower().strip()

    if profile not in allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported routing profile. "
                "Use driving, walking, or cycling."
            ),
        )

    return profile


# ============================================================
# OSRM ROUTING
# ============================================================

def get_osrm_routes(
    start_lat: float,
    start_lng: float,
    destination_lat: float,
    destination_lng: float,
    profile: str,
    alternatives: bool,
):
    """
    Request route geometry and navigation information from OSRM.

    OSRM remains responsible for:
        - route geometry
        - distance
        - navigation steps
        - route alternatives
    """

    profile = validate_profile(
        profile
    )

    coordinates = (
        f"{start_lng},{start_lat};"
        f"{destination_lng},{destination_lat}"
    )

    url = (
        f"{OSRM_BASE_URL}/route/v1/"
        f"{profile}/{coordinates}"
    )

    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "true",
        "alternatives": (
            "true"
            if alternatives
            else "false"
        ),
    }

    try:

        response = requests.get(
            url,
            params=params,
            timeout=30,
        )

    except requests.RequestException as exc:

        logger.error(
            "OSRM request failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Routing service is currently "
                "unavailable."
            ),
        )

    if not response.ok:

        logger.error(
            "OSRM returned HTTP %s: %s",
            response.status_code,
            response.text[:500],
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Routing provider returned an error."
            ),
        )

    try:

        data = response.json()

    except ValueError:

        raise HTTPException(
            status_code=502,
            detail=(
                "Invalid response from routing provider."
            ),
        )

    if data.get("code") != "Ok":

        raise HTTPException(
            status_code=400,
            detail=data.get(
                "message",
                "Unable to calculate route.",
            ),
        )

    return data


# ============================================================
# GOOGLE LIVE TRAFFIC
# ============================================================

def parse_google_duration(
    duration_value: Any,
) -> Optional[float]:
    """
    Convert Google's duration string into seconds.

    Examples:

        "518s"
        "518.5s"
        "1234.25s"
    """

    if duration_value is None:
        return None

    try:

        value = str(
            duration_value
        ).strip()

        if value.endswith("s"):
            value = value[:-1]

        return float(value)

    except (
        TypeError,
        ValueError,
    ):

        logger.warning(
            "Unable to parse Google duration: %r",
            duration_value,
        )

        return None


def empty_traffic_result(
    normal_duration_seconds: float,
    provider: Optional[str] = None,
    status: str = "Live traffic data unavailable",
):
    """
    Safe fallback traffic object.

    The API never fabricates current traffic data.
    """

    return {
        "available": False,

        "provider": provider,

        "normal_duration_seconds": round(
            float(
                normal_duration_seconds
            ),
            1,
        ),

        "current_duration_seconds": None,

        "delay_seconds": None,

        "delay_percentage": None,

        "congestion_score": None,

        "traffic_level": "unknown",

        "traffic_status": status,

        "updated_at": None,
    }


def get_google_live_traffic(
    start_lat: float,
    start_lng: float,
    destination_lat: float,
    destination_lng: float,
    normal_duration_seconds: float,
):
    """
    Retrieve current traffic-aware duration from
    Google Routes API.

    Google TRAFFIC_AWARE returns:

        duration
            Current traffic-aware ETA.

        staticDuration
            ETA without current traffic.

    The existing analyze_traffic() service compares
    these values and calculates delay/congestion.
    """

    if not GOOGLE_MAPS_API_KEY:

        logger.warning(
            "GOOGLE_MAPS_API_KEY is not configured."
        )

        return empty_traffic_result(
            normal_duration_seconds,
            provider="google",
            status=(
                "Live traffic unavailable: "
                "Google API key is not configured"
            ),
        )

    if TRAFFIC_PROVIDER != "google":

        return empty_traffic_result(
            normal_duration_seconds,
            provider=None,
            status=(
                "Live traffic provider is disabled."
            ),
        )

    payload = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": start_lat,
                    "longitude": start_lng,
                }
            }
        },

        "destination": {
            "location": {
                "latLng": {
                    "latitude": destination_lat,
                    "longitude": destination_lng,
                }
            }
        },

        "travelMode": "DRIVE",

        "routingPreference": "TRAFFIC_AWARE",

        "computeAlternativeRoutes": False,

        "languageCode": "en-US",

        "units": "METRIC",
    }

    headers = {
        "Content-Type": "application/json",

        "X-Goog-Api-Key": (
            GOOGLE_MAPS_API_KEY
        ),

        "X-Goog-FieldMask": (
            "routes.duration,"
            "routes.staticDuration,"
            "routes.distanceMeters"
        ),
    }

    try:

        response = requests.post(
            GOOGLE_ROUTES_URL,
            json=payload,
            headers=headers,
            timeout=TRAFFIC_TIMEOUT_SECONDS,
        )

    except requests.RequestException as exc:

        logger.error(
            "Google traffic request failed: %s",
            exc,
        )

        return empty_traffic_result(
            normal_duration_seconds,
            provider="google",
            status=(
                "Live traffic provider "
                "temporarily unavailable"
            ),
        )

    if not response.ok:

        logger.error(
            "Google traffic API returned HTTP %s: %s",
            response.status_code,
            response.text[:1000],
        )

        return empty_traffic_result(
            normal_duration_seconds,
            provider="google",
            status=(
                "Live traffic provider "
                "returned an error"
            ),
        )

    try:

        data = response.json()

    except ValueError:

        logger.error(
            "Google traffic API returned invalid JSON."
        )

        return empty_traffic_result(
            normal_duration_seconds,
            provider="google",
            status=(
                "Invalid response from "
                "live traffic provider"
            ),
        )

    routes = data.get(
        "routes",
        [],
    )

    if not routes:

        logger.warning(
            "Google traffic API returned no routes."
        )

        return empty_traffic_result(
            normal_duration_seconds,
            provider="google",
            status=(
                "Live traffic data unavailable "
                "for this route"
            ),
        )

    google_route = routes[0]

    current_duration_seconds = (
        parse_google_duration(
            google_route.get(
                "duration"
            )
        )
    )

    static_duration_seconds = (
        parse_google_duration(
            google_route.get(
                "staticDuration"
            )
        )
    )

    if current_duration_seconds is None:

        return empty_traffic_result(
            normal_duration_seconds,
            provider="google",
            status=(
                "Live traffic duration "
                "was not returned"
            ),
        )

    # Prefer Google's own static duration because
    # it is the traffic-unaware duration corresponding
    # to the traffic-aware calculation.
    if static_duration_seconds is None:

        static_duration_seconds = (
            float(
                normal_duration_seconds
            )
        )

    try:

        analysis = analyze_traffic(
            normal_duration_seconds=(
                static_duration_seconds
            ),
            current_duration_seconds=(
                current_duration_seconds
            ),
        )

    except (
        ValueError,
        TypeError,
    ) as exc:

        logger.error(
            "Traffic analysis failed: %s",
            exc,
        )

        return empty_traffic_result(
            normal_duration_seconds,
            provider="google",
            status=(
                "Traffic analysis failed"
            ),
        )

    return {
        "available": True,

        "provider": "google",

        "normal_duration_seconds": (
            analysis.normal_duration_seconds
        ),

        "current_duration_seconds": (
            analysis.current_duration_seconds
        ),

        "delay_seconds": (
            analysis.delay_seconds
        ),

        "delay_percentage": (
            analysis.delay_percentage
        ),

        "congestion_score": (
            analysis.congestion_score
        ),

        "traffic_level": (
            analysis.traffic_level
        ),

        "traffic_status": (
            analysis.traffic_status
        ),

        "updated_at": (
            analysis.updated_at
        ),
    }


# ============================================================
# TRAFFIC INTELLIGENCE
# ============================================================

def build_traffic_analysis(
    normal_duration_seconds: float,
    start_lat: Optional[float] = None,
    start_lng: Optional[float] = None,
    destination_lat: Optional[float] = None,
    destination_lng: Optional[float] = None,
):
    """
    Build the complete traffic object.

    If Google live traffic is configured, the function
    retrieves the current traffic-aware duration.

    If live traffic is unavailable, the API safely
    returns an unavailable traffic object.

    No fake current-duration values are generated.
    """

    normal_duration_seconds = float(
        normal_duration_seconds
    )

    if (
        start_lat is not None
        and start_lng is not None
        and destination_lat is not None
        and destination_lng is not None
    ):

        return get_google_live_traffic(
            start_lat=start_lat,
            start_lng=start_lng,
            destination_lat=destination_lat,
            destination_lng=destination_lng,
            normal_duration_seconds=(
                normal_duration_seconds
            ),
        )

    return empty_traffic_result(
        normal_duration_seconds,
        provider=(
            "google"
            if GOOGLE_MAPS_API_KEY
            else None
        ),
    )


# ============================================================
# CAMERA SEARCH
# ============================================================

def find_cameras_near_route(
    route_coordinates,
    radius_meters: float,
):
    """
    Find cameras near the route using PostGIS ST_DWithin.
    """

    if not route_coordinates:
        return []

    connection = None

    try:

        connection = get_db_connection()

        coordinate_text = ", ".join(
            f"{float(lng)} {float(lat)}"
            for lng, lat in route_coordinates
        )

        route_geometry = (
            f"LINESTRING({coordinate_text})"
        )

        query = """
            SELECT
                id,
                latitude,
                longitude,
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
                last_verified,

                ST_Distance(
                    location,
                    ST_SetSRID(
                        ST_GeomFromText(%s),
                        4326
                    )::geography
                ) AS distance_from_route

            FROM cameras

            WHERE ST_DWithin(
                location,
                ST_SetSRID(
                    ST_GeomFromText(%s),
                    4326
                )::geography,
                %s
            )

            ORDER BY distance_from_route ASC
        """

        with connection.cursor() as cursor:

            cursor.execute(
                query,
                (
                    route_geometry,
                    route_geometry,
                    radius_meters,
                ),
            )

            rows = cursor.fetchall()

        columns = [
            "id",
            "latitude",
            "longitude",
            "country",
            "city",
            "state",
            "road_name",
            "camera_type",
            "enforcement_type",
            "speed_limit",
            "status",
            "verification_status",
            "source",
            "source_url",
            "last_verified",
            "distance_from_route",
        ]

        cameras = []

        for row in rows:

            camera = dict(
                zip(
                    columns,
                    row,
                )
            )

            if (
                camera["distance_from_route"]
                is not None
            ):

                camera["distance_from_route"] = round(
                    float(
                        camera[
                            "distance_from_route"
                        ]
                    ),
                    2,
                )

            cameras.append(
                camera
            )

        return cameras

    except HTTPException:
        raise

    except Exception as exc:

        logger.exception(
            "Camera route search failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to find cameras near route."
            ),
        )

    finally:

        if connection:
            connection.close()


# ============================================================
# FORMAT ROUTE
# ============================================================

def format_route(
    route,
    route_index: int,
    cameras,
    traffic,
):
    """
    Convert an OSRM route into frontend-friendly JSON.
    """

    geometry = route.get(
        "geometry",
        {},
    )

    coordinates = geometry.get(
        "coordinates",
        [],
    )

    # --------------------------------------------------------
    # Distance
    # --------------------------------------------------------

    distance_meters = float(
        route.get(
            "distance",
            0,
        )
    )

    # --------------------------------------------------------
    # Duration
    # --------------------------------------------------------

    duration_seconds = float(
        route.get(
            "duration",
            0,
        )
    )

    # --------------------------------------------------------
    # Navigation steps
    # --------------------------------------------------------

    steps = []

    for leg in route.get(
        "legs",
        [],
    ):

        for step in leg.get(
            "steps",
            [],
        ):

            maneuver = step.get(
                "maneuver",
                {},
            )

            step_location = maneuver.get(
                "location",
                [],
            )

            steps.append(
                {
                    "instruction": step.get(
                        "name",
                        "",
                    ),

                    "distance_meters": round(
                        float(
                            step.get(
                                "distance",
                                0,
                            )
                        ),
                        1,
                    ),

                    "duration_seconds": round(
                        float(
                            step.get(
                                "duration",
                                0,
                            )
                        ),
                        1,
                    ),

                    "maneuver": maneuver.get(
                        "type"
                    ),

                    "modifier": maneuver.get(
                        "modifier"
                    ),

                    "location": (
                        {
                            "longitude": (
                                step_location[0]
                            ),
                            "latitude": (
                                step_location[1]
                            ),
                        }
                        if len(
                            step_location
                        ) >= 2
                        else None
                    ),
                }
            )

    # --------------------------------------------------------
    # Final formatted route
    # --------------------------------------------------------

    return {
        "route_index": route_index,

        "distance_meters": round(
            distance_meters,
            1,
        ),

        "distance_km": round(
            distance_meters / 1000,
            2,
        ),

        "duration_seconds": round(
            duration_seconds,
            1,
        ),

        "duration_minutes": round(
            duration_seconds / 60,
            1,
        ),

        "geometry": {
            "type": "LineString",
            "coordinates": coordinates,
        },

        "cameras": cameras,

        "camera_count": len(
            cameras
        ),

        "traffic": traffic,

        "steps": steps,
    }


# ============================================================
# CALCULATE ROUTES
# ============================================================

@router.post("/calculate")
def calculate_routes(
    request: RouteRequest,
):
    """
    Calculate route alternatives, detect cameras,
    and attach live traffic intelligence.
    """

    # --------------------------------------------------------
    # Validate coordinates
    # --------------------------------------------------------

    if (
        request.start_lat
        == request.destination_lat
        and
        request.start_lng
        == request.destination_lng
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Starting point and destination "
                "cannot be identical."
            ),
        )

    # --------------------------------------------------------
    # Validate profile
    # --------------------------------------------------------

    profile = validate_profile(
        request.profile
    )

    # --------------------------------------------------------
    # Get route geometry from OSRM
    # --------------------------------------------------------

    data = get_osrm_routes(
        start_lat=request.start_lat,
        start_lng=request.start_lng,
        destination_lat=request.destination_lat,
        destination_lng=request.destination_lng,
        profile=profile,
        alternatives=request.alternatives,
    )

    raw_routes = data.get(
        "routes",
        [],
    )

    if not raw_routes:

        raise HTTPException(
            status_code=404,
            detail="No route could be found.",
        )

    # --------------------------------------------------------
    # Format routes
    # --------------------------------------------------------

    formatted_routes = []

    for index, route in enumerate(
        raw_routes
    ):

        coordinates = (
            route
            .get(
                "geometry",
                {}
            )
            .get(
                "coordinates",
                []
            )
        )

        cameras = find_cameras_near_route(
            coordinates,
            request.camera_radius_meters,
        )

        normal_duration_seconds = float(
            route.get(
                "duration",
                0,
            )
        )

        # ----------------------------------------------------
        # LIVE TRAFFIC
        # ----------------------------------------------------

        traffic = build_traffic_analysis(
            normal_duration_seconds=(
                normal_duration_seconds
            ),

            start_lat=request.start_lat,
            start_lng=request.start_lng,

            destination_lat=(
                request.destination_lat
            ),

            destination_lng=(
                request.destination_lng
            ),
        )

        formatted_route = format_route(
            route=route,
            route_index=index,
            cameras=cameras,
            traffic=traffic,
        )

        formatted_routes.append(
            formatted_route
        )

    # --------------------------------------------------------
    # Sort by distance
    # --------------------------------------------------------

    formatted_routes.sort(
        key=lambda item: item[
            "distance_meters"
        ]
    )

    # --------------------------------------------------------
    # Re-number routes
    # --------------------------------------------------------

    for index, route in enumerate(
        formatted_routes
    ):

        route["route_index"] = index

    # --------------------------------------------------------
    # Shortest route
    # --------------------------------------------------------

    shortest_route = formatted_routes[0]

    # --------------------------------------------------------
    # Final response
    # --------------------------------------------------------

    return {
        "success": True,

        "profile": profile,

        "start": {
            "latitude": request.start_lat,
            "longitude": request.start_lng,
        },

        "destination": {
            "latitude": request.destination_lat,
            "longitude": request.destination_lng,
        },

        "route_count": len(
            formatted_routes
        ),

        "shortest_route": {
            "route_index": (
                shortest_route[
                    "route_index"
                ]
            ),

            "distance_km": (
                shortest_route[
                    "distance_km"
                ]
            ),

            "duration_minutes": (
                shortest_route[
                    "duration_minutes"
                ]
            ),

            "camera_count": (
                shortest_route[
                    "camera_count"
                ]
            ),

            "traffic": (
                shortest_route[
                    "traffic"
                ]
            ),
        },

        "camera_radius_meters": (
            request.camera_radius_meters
        ),

        "traffic_provider": (
            "google"
            if GOOGLE_MAPS_API_KEY
            else None
        ),

        "traffic_available": bool(
            GOOGLE_MAPS_API_KEY
        ),

        "routes": formatted_routes,
    }


# ============================================================
# SIMPLE GET ENDPOINT
# ============================================================

@router.get("/calculate")
def calculate_routes_get(
    start_lat: float = Query(...),
    start_lng: float = Query(...),
    destination_lat: float = Query(...),
    destination_lng: float = Query(...),

    profile: str = Query(
        default="driving"
    ),

    alternatives: bool = Query(
        default=True
    ),

    camera_radius_meters: float = Query(
        default=DEFAULT_CAMERA_RADIUS_METERS,
        ge=25,
        le=1000,
    ),
):
    """
    GET version of route calculation.
    """

    request = RouteRequest(
        start_lat=start_lat,
        start_lng=start_lng,

        destination_lat=destination_lat,

        destination_lng=destination_lng,

        profile=profile,

        alternatives=alternatives,

        camera_radius_meters=(
            camera_radius_meters
        ),
    )

    return calculate_routes(
        request
    )