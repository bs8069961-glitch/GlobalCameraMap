from dataclasses import dataclass
from datetime import datetime, timezone


# ============================================================
# TRAFFIC RESULT
# ============================================================

@dataclass
class TrafficResult:
    normal_duration_seconds: float
    current_duration_seconds: float
    delay_seconds: float
    delay_percentage: float
    congestion_score: float
    traffic_level: str
    traffic_status: str
    updated_at: str


# ============================================================
# TRAFFIC ANALYSIS
# ============================================================

def analyze_traffic(
    normal_duration_seconds: float,
    current_duration_seconds: float,
) -> TrafficResult:
    """
    Analyze traffic using normal/free-flow travel time
    versus current estimated travel time.

    This is the traffic-analysis layer.

    It does NOT claim to provide real-time traffic by itself.
    A live traffic provider must supply current_duration_seconds.
    """

    normal_duration_seconds = float(normal_duration_seconds)
    current_duration_seconds = float(current_duration_seconds)

    if normal_duration_seconds <= 0:
        raise ValueError(
            "normal_duration_seconds must be greater than zero."
        )

    if current_duration_seconds < 0:
        raise ValueError(
            "current_duration_seconds cannot be negative."
        )

    delay_seconds = max(
        current_duration_seconds - normal_duration_seconds,
        0,
    )

    delay_percentage = (
        delay_seconds
        / normal_duration_seconds
        * 100
    )

    # Keep congestion score between 0 and 100.
    congestion_score = min(
        max(delay_percentage, 0),
        100,
    )

    # --------------------------------------------------------
    # Traffic classification
    # --------------------------------------------------------

    if delay_percentage < 10:
        traffic_level = "free"
        traffic_status = "Free-flowing traffic"

    elif delay_percentage < 25:
        traffic_level = "light"
        traffic_status = "Light traffic"

    elif delay_percentage < 50:
        traffic_level = "moderate"
        traffic_status = "Moderate traffic"

    elif delay_percentage < 75:
        traffic_level = "heavy"
        traffic_status = "Heavy traffic"

    else:
        traffic_level = "severe"
        traffic_status = "Severe congestion"

    return TrafficResult(
        normal_duration_seconds=round(
            normal_duration_seconds,
            1,
        ),

        current_duration_seconds=round(
            current_duration_seconds,
            1,
        ),

        delay_seconds=round(
            delay_seconds,
            1,
        ),

        delay_percentage=round(
            delay_percentage,
            2,
        ),

        congestion_score=round(
            congestion_score,
            2,
        ),

        traffic_level=traffic_level,

        traffic_status=traffic_status,

        updated_at=datetime.now(
            timezone.utc
        ).isoformat(),
    )