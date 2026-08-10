import logging
from pathlib import Path



BASE_DIR = Path(__file__).resolve().parents[2]


LOG_FOLDER = BASE_DIR / "logs"

LOG_FOLDER.mkdir(
    exist_ok=True
)


LOG_FILE = LOG_FOLDER / "pipeline.log"



logging.basicConfig(

    filename=LOG_FILE,

    level=logging.INFO,

    format=
    "%(asctime)s | %(levelname)s | %(message)s"

)



def get_logger():

    return logging.getLogger("GlobalCameraPipeline")