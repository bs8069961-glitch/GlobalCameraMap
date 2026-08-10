from pydantic import BaseModel
from typing import Optional



class Camera(BaseModel):

    id: int

    latitude: float

    longitude: float

    country: str

    state: Optional[str]

    city: Optional[str]

    road_name: Optional[str]

    camera_type: str

    enforcement_type: Optional[str]

    speed_limit: Optional[int]

    source: Optional[str]