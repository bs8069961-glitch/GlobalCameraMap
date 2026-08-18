import os
import logging
from pathlib import Path

import psycopg2
from fastapi import HTTPException
from dotenv import load_dotenv


# ============================================================
# PATH / ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE, override=True)


# ============================================================
# LOGGING
# ============================================================

logger = logging.getLogger("global-camera-map")


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db_connection():
    """
    Create and return a PostgreSQL connection.

    Database configuration comes from the project's .env file.
    """

    load_dotenv(ENV_FILE, override=True)

    host = os.getenv("DB_HOST", "127.0.0.1")
    port = int(os.getenv("DB_PORT", "5432"))
    database = os.getenv("DB_NAME", "global_camera")
    user = os.getenv("DB_USER", "camera_admin")
    password = os.getenv("DB_PASSWORD", "")

    if not password:
        logger.error(
            "DB_PASSWORD is empty. PostgreSQL password is required."
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to connect to database: DB_PASSWORD is empty",
        )

    try:
        connection = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password,
            connect_timeout=5,
        )

        return connection

    except psycopg2.Error as exc:
        logger.error(
            "Database connection failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to connect to database",
        )