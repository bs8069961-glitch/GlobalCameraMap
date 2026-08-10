import csv
import json
from pathlib import Path


# Project paths

BASE_DIR = Path(__file__).resolve().parents[2]

IMPORT_FILE = BASE_DIR / "data" / "imports" / "cameras.csv"

RAW_FILE = BASE_DIR / "data" / "raw" / "cameras.json"



def import_csv():

    cameras = []


    if not IMPORT_FILE.exists():

        print("❌ CSV file not found:")
        print(IMPORT_FILE)
        return



    with open(
        IMPORT_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        reader = csv.DictReader(file)


        for row in reader:

            cameras.append(row)



    RAW_FILE.parent.mkdir(
        exist_ok=True
    )


    with open(
        RAW_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            cameras,
            file,
            indent=4
        )


    print("✅ CSV import completed")

    print(
        f"Total cameras imported: {len(cameras)}"
    )

    print(
        f"Saved file: {RAW_FILE}"
    )



if __name__ == "__main__":

    import_csv()