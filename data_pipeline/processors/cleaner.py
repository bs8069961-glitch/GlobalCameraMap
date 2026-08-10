def clean_camera(camera):

    cleaned = {}

    # Latitude
    cleaned["latitude"] = float(
        camera["latitude"]
    )

    # Longitude
    cleaned["longitude"] = float(
        camera["longitude"]
    )

    # Text fields
    cleaned["country"] = (
        camera.get("country") or "India"
    ).strip()

    cleaned["state"] = (
        camera.get("state") or ""
    ).strip()

    cleaned["city"] = (
        camera.get("city") or ""
    ).strip()

    cleaned["road_name"] = (
        camera.get("road_name") or ""
    ).strip()

    cleaned["camera_type"] = (
        camera.get("camera_type") or "other"
    ).strip()

    cleaned["enforcement_type"] = (
        camera.get("enforcement_type") or "other"
    ).strip()

    cleaned["status"] = (
        camera.get("status") or "unknown"
    ).strip()

    cleaned["verification_status"] = (
        camera.get("verification_status")
        or "pending"
    ).strip()

    cleaned["source"] = (
        camera.get("source") or "unknown"
    ).strip()

    # Speed limit
    speed_limit = (
        camera.get("speed_limit") or ""
    ).strip()

    if speed_limit:

        cleaned["speed_limit"] = int(
            float(speed_limit)
        )

    else:

        cleaned["speed_limit"] = None

    return cleaned


def clean_cameras(cameras):

    cleaned_cameras = []

    for camera in cameras:

        try:

            cleaned_camera = clean_camera(
                camera
            )

            cleaned_cameras.append(
                cleaned_camera
            )

        except Exception as error:

            print(
                "Skipping invalid camera:",
                error
            )

    print(
        f"Cleaned {len(cleaned_cameras)} cameras"
    )

    return cleaned_cameras