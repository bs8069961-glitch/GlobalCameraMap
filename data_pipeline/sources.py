import os


# ============================================================
# DATA SOURCE CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

INCOMING_DIR = os.path.join(
    BASE_DIR,
    "incoming"
)


# ============================================================
# AVAILABLE DATA SOURCES
# ============================================================

SOURCES = [

    {
        "name": "India Camera Dataset",
        "type": "csv",
        "path": os.path.join(
            BASE_DIR,
            "india_cameras.csv"
        ),
        "country": "India",
        "enabled": True,
    },

    {
        "name": "External Traffic Authority",
        "type": "csv",
        "path": os.path.join(
            INCOMING_DIR,
            "external_cameras.csv"
        ),
        "country": "India",
        "enabled": True,
    },

]


# ============================================================
# GET ENABLED SOURCES
# ============================================================

def get_enabled_sources():

    return [

        source

        for source in SOURCES

        if source.get(
            "enabled",
            False
        )

    ]


# ============================================================
# DISPLAY SOURCES
# ============================================================

def print_sources():

    print(
        "\nConfigured Data Sources:"
    )

    for source in get_enabled_sources():

        print(
            f"- {source['name']}"
        )

        print(
            f"  Type: {source['type']}"
        )

        print(
            f"  Path: {source['path']}"
        )


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print_sources()