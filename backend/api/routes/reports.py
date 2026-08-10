from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from api.database import fetch_all
from scripts.database.db import get_connection


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


# =====================================================
# MODEL
# =====================================================

class ReportCreate(BaseModel):

    latitude: float
    longitude: float

    city: Optional[str] = None
    state: Optional[str] = None
    road_name: Optional[str] = None

    camera_type: Optional[str] = "Speed Camera"

    reporter_name: Optional[str] = None

    notes: Optional[str] = None

    image_path: Optional[str] = None


# =====================================================
# GET ALL REPORTS
# =====================================================

@router.get("")
def get_reports():

    query = """
        SELECT
            id,
            latitude,
            longitude,
            city,
            state,
            road_name,
            camera_type,
            reporter_name,
            notes,
            status,
            created_at,
            image_path
        FROM camera_reports
        ORDER BY id DESC
    """

    try:

        rows = fetch_all(query)

        reports = []

        for row in rows:

            reports.append({
                "id": row[0],
                "latitude": row[1],
                "longitude": row[2],
                "city": row[3],
                "state": row[4],
                "road_name": row[5],
                "camera_type": row[6],
                "reporter_name": row[7],
                "notes": row[8],
                "status": row[9],
                "created_at": row[10],
                "image_path": row[11]
            })

        return reports

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =====================================================
# CREATE REPORT
# =====================================================

@router.post("")
def create_report(report: ReportCreate):

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor()

        query = """
            INSERT INTO camera_reports
            (
                latitude,
                longitude,
                city,
                state,
                road_name,
                camera_type,
                reporter_name,
                notes,
                image_path,
                status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'pending'
            )
            RETURNING id
        """

        cursor.execute(
            query,
            (
                report.latitude,
                report.longitude,
                report.city,
                report.state,
                report.road_name,
                report.camera_type,
                report.reporter_name,
                report.notes,
                report.image_path
            )
        )

        report_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "Report submitted successfully",
            "id": report_id
        }

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# GET PENDING REPORTS
# =====================================================

@router.get("/pending")
def get_pending_reports():

    query = """
        SELECT
            id,
            latitude,
            longitude,
            city,
            state,
            road_name,
            camera_type,
            reporter_name,
            notes,
            status,
            created_at,
            image_path
        FROM camera_reports
        WHERE LOWER(status) = 'pending'
        ORDER BY id DESC
    """

    try:

        rows = fetch_all(query)

        reports = []

        for row in rows:

            reports.append({
                "id": row[0],
                "latitude": row[1],
                "longitude": row[2],
                "city": row[3],
                "state": row[4],
                "road_name": row[5],
                "camera_type": row[6],
                "reporter_name": row[7],
                "notes": row[8],
                "status": row[9],
                "created_at": row[10],
                "image_path": row[11]
            })

        return reports

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =====================================================
# APPROVE REPORT
# =====================================================

@router.put("/{report_id}/approve")
def approve_report(report_id: int):

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor()

        # Get report
        cursor.execute(
            """
            SELECT
                id,
                latitude,
                longitude,
                city,
                state,
                road_name,
                camera_type
            FROM camera_reports
            WHERE id = %s
            """,
            (report_id,)
        )

        report = cursor.fetchone()

        if report is None:

            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        # Insert report into cameras
        cursor.execute(
            """
            INSERT INTO cameras
            (
                country,
                state,
                city,
                road_name,
                latitude,
                longitude,
                camera_type,
                status,
                verification_status
            )
            VALUES
            (
                'India',
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'Active',
                'Verified'
            )
            RETURNING id
            """,
            (
                report[4],
                report[3],
                report[5],
                report[1],
                report[2],
                report[6]
            )
        )

        camera_id = cursor.fetchone()[0]

        # Update report
        cursor.execute(
            """
            UPDATE camera_reports
            SET status = 'approved'
            WHERE id = %s
            """,
            (report_id,)
        )

        connection.commit()

        return {
            "message": "Report approved",
            "report_id": report_id,
            "camera_id": camera_id
        }

    except HTTPException:

        if connection:
            connection.rollback()

        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =====================================================
# REJECT REPORT
# =====================================================

@router.put("/{report_id}/reject")
def reject_report(report_id: int):

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id
            FROM camera_reports
            WHERE id = %s
            """,
            (report_id,)
        )

        report = cursor.fetchone()

        if report is None:

            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        cursor.execute(
            """
            UPDATE camera_reports
            SET status = 'rejected'
            WHERE id = %s
            """,
            (report_id,)
        )

        connection.commit()

        return {
            "message": "Report rejected",
            "report_id": report_id
        }

    except HTTPException:

        if connection:
            connection.rollback()

        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()