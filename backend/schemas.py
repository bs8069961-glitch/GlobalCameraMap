from pydantic import BaseModel


class CameraCreate(BaseModel):

    latitude: float
    longitude: float

    city: str
    state: str

    road_name: str | None = None

    camera_type: str

    status: str = "active"

    verification_status: str = "pending"

    source: str = "Admin Added"