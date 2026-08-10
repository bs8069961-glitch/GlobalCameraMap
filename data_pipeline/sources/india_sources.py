import csv
from pathlib import Path


def load_india_camera_csv():

    # Find the CSV file in the data_pipeline folder
    base_dir = Path(__file__).resolve().parent.parent

    csv_file = base_dir / "india_cameras.csv"

    if not csv_file.exists():

        raise FileNotFoundError(
            f"Camera CSV file not found: {csv_file}"
        )

    cameras = []

    with open(
        csv_file,
        "r",
        encoding="utf-8"
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            cameras.append(row)

    print(
        f"Loaded {len(cameras)} camera records"
    )

    return cameras