from scripts.database.db import get_connection



# =========================================
# FETCH DATA
# =========================================

def fetch_all(query, params=None):

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute(

        query,

        params

    )


    result = cursor.fetchall()


    cursor.close()

    connection.close()


    return result





# =========================================
# INSERT / UPDATE / DELETE
# =========================================

def execute_query(query, params=None):

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute(

        query,

        params

    )


    connection.commit()


    cursor.close()

    connection.close()