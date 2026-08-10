from importers.import_csv import import_csv
from importers.import_openstreetmap import fetch_osm_cameras
from importers.merge_sources import merge_sources

from cleaners.clean_cameras import clean_cameras
from cleaners.deduplicate import remove_duplicates
from cleaners.validate import validate_cameras

from database.db_loader import load_cameras

from utils.logger import get_logger



logger = get_logger()




def run_pipeline():


    logger.info(
        "========== PIPELINE STARTED =========="
    )


    print("=" * 60)
    print("GLOBAL CAMERA PIPELINE STARTED")
    print("=" * 60)



    try:


        # ------------------------------------
        # 1. CSV IMPORT
        # ------------------------------------

        print(
            "\n1. Importing CSV camera data..."
        )


        import_csv()


        logger.info(
            "CSV import completed"
        )




        # ------------------------------------
        # 2. OSM IMPORT
        # ------------------------------------

        print(
            "\n2. Importing OpenStreetMap cameras..."
        )


        fetch_osm_cameras()


        logger.info(
            "OpenStreetMap import completed"
        )




        # ------------------------------------
        # 3. MERGE SOURCES
        # ------------------------------------

        print(
            "\n3. Merging camera sources..."
        )


        merge_sources()


        logger.info(
            "Camera sources merged"
        )




        # ------------------------------------
        # 4. CLEAN
        # ------------------------------------

        print(
            "\n4. Cleaning camera data..."
        )


        clean_cameras()


        logger.info(
            "Camera cleaning completed"
        )




        # ------------------------------------
        # 5. REMOVE DUPLICATES
        # ------------------------------------

        print(
            "\n5. Removing duplicates..."
        )


        remove_duplicates()


        logger.info(
            "Duplicate removal completed"
        )




        # ------------------------------------
        # 6. VALIDATE
        # ------------------------------------

        print(
            "\n6. Validating cameras..."
        )


        validate_cameras()


        logger.info(
            "Validation completed"
        )




        # ------------------------------------
        # 7. DATABASE LOAD
        # ------------------------------------

        print(
            "\n7. Loading database..."
        )


        load_cameras()


        logger.info(
            "Database loading completed"
        )




        logger.info(
            "========== PIPELINE COMPLETED =========="
        )



        print(
            "\n" + "=" * 60
        )

        print(
            "PIPELINE COMPLETED SUCCESSFULLY"
        )

        print(
            "=" * 60
        )




    except Exception as e:


        logger.error(
            f"Pipeline failed: {e}"
        )


        print(
            "Pipeline failed:",
            e
        )





if __name__ == "__main__":

    run_pipeline()