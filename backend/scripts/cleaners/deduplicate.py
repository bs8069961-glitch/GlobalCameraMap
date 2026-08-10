import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]


INPUT_FILE = (
    BASE_DIR /
    "data" /
    "cleaned" /
    "cameras_clean.json"
)


OUTPUT_FILE = (
    BASE_DIR /
    "data" /
    "cleaned" /
    "cameras_unique.json"
)



def remove_duplicates():

    if not INPUT_FILE.exists():

        print("❌ Clean file not found")

        return


    with open(
        INPUT_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        cameras = json.load(file)



    unique = []

    seen = set()



    for camera in cameras:

        key = (
            camera["latitude"],
            camera["longitude"]
        )


        if key not in seen:

            seen.add(key)

            unique.append(camera)



    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            unique,
            file,
            indent=4
        )



    print("✅ Duplicate removal completed")

    print(
        f"Before: {len(cameras)}"
    )

    print(
        f"After : {len(unique)}"
    )

    print(
        f"Saved file: {OUTPUT_FILE}"
    )



if __name__ == "__main__":

    remove_duplicates()