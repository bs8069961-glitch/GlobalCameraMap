import os
from dotenv import load_dotenv


# Load environment variables
load_dotenv()


# PostgreSQL / PostGIS Database Configuration

DATABASE_CONFIG = {

    "host": os.getenv(
        "DB_HOST",
        "localhost"
    ),

    "port": os.getenv(
        "DB_PORT",
        "5432"
    ),

    "database": os.getenv(
        "DB_NAME",
        "global_camera"
    ),

    "user": os.getenv(
        "DB_USER",
        "camera_admin"
    ),

    "password": os.getenv(
        "DB_PASSWORD",
        ""
    )

}


# Pipeline Folder Configuration

PIPELINE_CONFIG = {

    "raw_data": "data/raw",

    "cleaned_data": "data/cleaned",

    "import_data": "data/imports",

    "logs": "logs"

}