def validate_camera(camera):

    latitude = camera["latitude"]

    longitude = camera["longitude"]


    # Validate latitude

    if latitude < -90 or latitude > 90:

        return False


    # Validate longitude

    if longitude < -180 or longitude > 180:

        return False


    # India geographic bounds
    # Approximate bounds used for basic validation

    if latitude < 6 or latitude > 37:

        return False

    if longitude < 68 or longitude > 98:

        return False


    # Country validation

    if camera["country"].lower() != "india":

        return False


    return True


def validate_cameras(cameras):

    valid_cameras = []

    invalid_count = 0


    for camera in cameras:

        if validate_camera(camera):

            valid_cameras.append(
                camera
            )

        else:

            invalid_count += 1


    print(
        f"Valid cameras: {len(valid_cameras)}"
    )

    print(
        f"Invalid cameras: {invalid_count}"
    )


    return valid_cameras