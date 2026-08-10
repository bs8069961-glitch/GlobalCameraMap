import { useEffect, useState } from "react";
import "./PendingCameras.css";

const API_URL = "http://127.0.0.1:8000";

function PendingCameras() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // =====================================================
    // LOAD PENDING REPORTS
    // =====================================================

    const loadReports = async () => {
        try {
            setError("");

            const response = await fetch(
                `${API_URL}/api/reports/pending`
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to load reports (${response.status})`
                );
            }

            const data = await response.json();

            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(
                "Error loading pending reports:",
                error
            );

            setError(
                "Unable to load pending reports. Please make sure the backend is running."
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {
        loadReports();
    }, []);

    // =====================================================
    // APPROVE REPORT
    // =====================================================

    const approveReport = async (id) => {
        try {
            setProcessingId(id);
            setError("");
            setSuccess("");

            const response = await fetch(
                `${API_URL}/api/reports/${id}/approve`,
                {
                    method: "PUT",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Failed to approve report"
                );
            }

            setSuccess(
                `Report #${id} approved successfully. Camera added to the map.`
            );

            await loadReports();

        } catch (error) {
            console.error(
                "Approval error:",
                error
            );

            setError(
                error.message ||
                "Failed to approve report."
            );
        } finally {
            setProcessingId(null);
        }
    };

    // =====================================================
    // REJECT REPORT
    // =====================================================

    const rejectReport = async (id) => {
        try {
            setProcessingId(id);
            setError("");
            setSuccess("");

            const response = await fetch(
                `${API_URL}/api/reports/${id}/reject`,
                {
                    method: "PUT",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Failed to reject report"
                );
            }

            setSuccess(
                `Report #${id} rejected successfully.`
            );

            await loadReports();

        } catch (error) {
            console.error(
                "Rejection error:",
                error
            );

            setError(
                error.message ||
                "Failed to reject report."
            );
        } finally {
            setProcessingId(null);
        }
    };

    // =====================================================
    // REFRESH
    // =====================================================

    const handleRefresh = async () => {
        setLoading(true);
        setSuccess("");
        setError("");

        await loadReports();
    };

    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return "Unknown";
        }

        try {
            return new Date(dateValue).toLocaleString();
        } catch {
            return dateValue;
        }
    };

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className="pending-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="pending-header">

                <div>
                    <h1>⏳ Pending Camera Reports</h1>

                    <p>
                        Review camera reports submitted by users.
                    </p>
                </div>

                <button
                    className="refresh-btn"
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    {loading
                        ? "Refreshing..."
                        : "🔄 Refresh"}
                </button>

            </div>


            {/* =================================================
                SUCCESS MESSAGE
            ================================================= */}

            {success && (
                <div className="success-message">
                    ✅ {success}
                </div>
            )}


            {/* =================================================
                ERROR MESSAGE
            ================================================= */}

            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}


            {/* =================================================
                REPORT COUNT
            ================================================= */}

            {!loading && (
                <div className="pending-count">

                    <strong>
                        {reports.length}
                    </strong>

                    <span>
                        {reports.length === 1
                            ? " Pending Report"
                            : " Pending Reports"}
                    </span>

                </div>
            )}


            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (
                <div className="empty-state">
                    <p>Loading reports...</p>
                </div>
            )}


            {/* =================================================
                NO REPORTS
            ================================================= */}

            {!loading &&
                reports.length === 0 &&
                !error && (
                    <div className="empty-state">

                        <div className="empty-icon">
                            ✅
                        </div>

                        <h2>
                            No Pending Reports
                        </h2>

                        <p>
                            All submitted camera reports
                            have been reviewed.
                        </p>

                    </div>
                )}


            {/* =================================================
                REPORT LIST
            ================================================= */}

            {!loading &&
                reports.length > 0 && (

                    <div className="pending-list">

                        {reports.map((report) => {

                            const isProcessing =
                                processingId === report.id;

                            return (

                                <div
                                    className="pending-card"
                                    key={report.id}
                                >

                                    {/* =================================
                                        CARD HEADER
                                    ================================== */}

                                    <div className="pending-card-header">

                                        <div>

                                            <h2>
                                                📷{" "}
                                                {report.city ||
                                                    "Unknown City"}
                                            </h2>

                                            <span className="report-id">
                                                Report #{report.id}
                                            </span>

                                        </div>

                                        <span className="status-badge">
                                            {report.verification_status ||
                                                "pending"}
                                        </span>

                                    </div>


                                    {/* =================================
                                        LOCATION
                                    ================================== */}

                                    <div className="report-section">

                                        <h3>
                                            📍 Location
                                        </h3>

                                        <p>
                                            <strong>
                                                City:
                                            </strong>{" "}
                                            {report.city ||
                                                "Not provided"}
                                        </p>

                                        <p>
                                            <strong>
                                                State:
                                            </strong>{" "}
                                            {report.state ||
                                                "Not provided"}
                                        </p>

                                        <p>
                                            <strong>
                                                Road:
                                            </strong>{" "}
                                            {report.road_name ||
                                                "Not provided"}
                                        </p>

                                        <p>
                                            <strong>
                                                Latitude:
                                            </strong>{" "}
                                            {report.latitude ??
                                                "Not provided"}
                                        </p>

                                        <p>
                                            <strong>
                                                Longitude:
                                            </strong>{" "}
                                            {report.longitude ??
                                                "Not provided"}
                                        </p>

                                    </div>


                                    {/* =================================
                                        CAMERA INFORMATION
                                    ================================== */}

                                    <div className="report-section">

                                        <h3>
                                            🚦 Camera Information
                                        </h3>

                                        <p>
                                            <strong>
                                                Type:
                                            </strong>{" "}
                                            {report.camera_type ||
                                                "Not provided"}
                                        </p>

                                        <p>
                                            <strong>
                                                Status:
                                            </strong>{" "}
                                            {report.status ||
                                                "Pending"}
                                        </p>

                                        {report.speed_limit != null && (
                                            <p>
                                                <strong>
                                                    Speed Limit:
                                                </strong>{" "}
                                                {report.speed_limit} km/h
                                            </p>
                                        )}

                                    </div>


                                    {/* =================================
                                        REPORTER
                                    ================================== */}

                                    <div className="report-section">

                                        <h3>
                                            👤 Reporter
                                        </h3>

                                        <p>
                                            <strong>
                                                Name:
                                            </strong>{" "}
                                            {report.reporter_name ||
                                                report.reported_by ||
                                                "Anonymous"}
                                        </p>

                                        <p>
                                            <strong>
                                                Submitted:
                                            </strong>{" "}
                                            {formatDate(
                                                report.created_at ||
                                                report.report_date
                                            )}
                                        </p>

                                    </div>


                                    {/* =================================
                                        NOTES
                                    ================================== */}

                                    {report.notes && (
                                        <div className="report-section">

                                            <h3>
                                                📝 Notes
                                            </h3>

                                            <p className="report-notes">
                                                {report.notes}
                                            </p>

                                        </div>
                                    )}


                                    {/* =================================
                                        IMAGE
                                    ================================== */}

                                    {(report.image_url ||
                                        report.image_path) && (

                                        <div className="report-section">

                                            <h3>
                                                📷 Evidence
                                            </h3>

                                            {report.image_url ? (

                                                <img
                                                    src={report.image_url}
                                                    alt="Camera report evidence"
                                                    className="report-image"
                                                />

                                            ) : (

                                                <p>
                                                    {report.image_path}
                                                </p>

                                            )}

                                        </div>
                                    )}


                                    {/* =================================
                                        SOURCE
                                    ================================== */}

                                    {report.source && (
                                        <div className="report-section">

                                            <h3>
                                                🔗 Source
                                            </h3>

                                            <p>
                                                {report.source}
                                            </p>

                                        </div>
                                    )}


                                    {/* =================================
                                        ACTIONS
                                    ================================== */}

                                    <div className="report-actions">

                                        <button
                                            className="approve-btn"
                                            onClick={() =>
                                                approveReport(
                                                    report.id
                                                )
                                            }
                                            disabled={isProcessing}
                                        >
                                            {isProcessing
                                                ? "Processing..."
                                                : "✅ Approve"}
                                        </button>


                                        <button
                                            className="reject-btn"
                                            onClick={() =>
                                                rejectReport(
                                                    report.id
                                                )
                                            }
                                            disabled={isProcessing}
                                        >
                                            {isProcessing
                                                ? "Processing..."
                                                : "❌ Reject"}
                                        </button>

                                    </div>

                                </div>

                            );
                        })}

                    </div>

                )}

        </div>
    );
}

export default PendingCameras;