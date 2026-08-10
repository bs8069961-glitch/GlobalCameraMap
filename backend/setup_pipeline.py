from pathlib import Path

# ==========================================================
# GLOBAL CAMERA MAP PIPELINE SETUP
# ==========================================================

ROOT = Path(__file__).resolve().parent

folders = [
    "scripts",
    "scripts/importers",
    "scripts/cleaners",
    "scripts/database",
    "scripts/geocoding",
    "scripts/utils",
    "data",
    "data/raw",
    "data/cleaned",
    "data/imports",
    "logs"
]

files = [
    "scripts/config.py",
    "scripts/main.py",

    "scripts/importers/import_cameras.py",
    "scripts/importers/import_csv.py",
    "scripts/importers/import_openstreetmap.py",

    "scripts/cleaners/clean_cameras.py",
    "scripts/cleaners/deduplicate.py",
    "scripts/cleaners/validate.py",

    "scripts/database/db.py",

    "scripts/geocoding/geocode.py",

    "scripts/utils/logger.py",

    "logs/.gitkeep"
]

print("=" * 60)
print("Creating Global Camera Pipeline")
print("=" * 60)

for folder in folders:
    path = ROOT / folder
    path.mkdir(parents=True, exist_ok=True)
    print(f"✓ Folder : {folder}")

for file in files:
    path = ROOT / file
    path.parent.mkdir(parents=True, exist_ok=True)

    if not path.exists():
        path.touch()

    print(f"✓ File   : {file}")

print("\nPipeline created successfully!")