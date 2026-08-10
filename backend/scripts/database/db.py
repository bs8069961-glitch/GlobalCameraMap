import psycopg2

from pathlib import Path
import sys


BASE_DIR = Path(__file__).resolve().parents[2]

sys.path.append(str(BASE_DIR))


from scripts.config import DATABASE_CONFIG



def get_connection():

    try:

        connection = psycopg2.connect(
            host=DATABASE_CONFIG["host"],
            port=DATABASE_CONFIG["port"],
            database=DATABASE_CONFIG["database"],
            user=DATABASE_CONFIG["user"],
            password=DATABASE_CONFIG["password"]
        )

        print("✅ Database connection successful")

        return connection


    except Exception as e:

        print("❌ Database connection failed")

        print(e)

        return None



if __name__ == "__main__":

    conn = get_connection()

    if conn:

        conn.close()

        print("✅ Connection closed")