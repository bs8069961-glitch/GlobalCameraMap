import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]


INPUT_FILE = (
    BASE_DIR /
    "data" /
    "cleaned" /
    "cameras_unique.json"
)


OUTPUT_FILE = (
    BASE_DIR /
    "data" /
    "cleaned" /
    "validated_cameras.json"
)



REQUIRED_FIELDS = [
    "country",
    "state",
    "city",
    "road_name",
    "latitude",
    "longitude",
    "camera_type"
]



def validate_cameras():

    if not INPUT_FILE.exists():

        print("❌ Input file missing")

        return


    with open(
        INPUT_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        cameras = json.load(file)



    valid = []



    for camera in cameras:

        try:

            # Check required fields

            if not all(
                camera.get(field)
                for field in REQUIRED_FIELDS
            ):
                continue



            # Coordinate validation

            lat = float(camera["latitude"])

            lon = float(camera["longitude"])



            if not (-90 <= lat <= 90):
                continue


            if not (-180 <= lon <= 180):
                continue



            valid.append(camera)



        except Exception:

            continue



    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            valid,
            file,
            indent=4
        )



    print("✅ Validation completed")

    print(
        f"Input records : {len(cameras)}"
    )

    print(
        f"Valid records : {len(valid)}"
    )

    print(
        f"Saved file: {OUTPUT_FILE}"
    )



if __name__ == "__main__":

    validate_cameras()