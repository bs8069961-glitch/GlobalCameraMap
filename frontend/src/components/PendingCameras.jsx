import React, { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function PendingCameras() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/reports/pending`);

      if (!response.ok) {
        throw new Error(
          `Pending reports API returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      console.log("Pending reports:", data);

      setReports(
        Array.isArray(data?.reports)
          ? data.reports
          : Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error("Pending reports error:", err);
      setError(err.message || "Failed to load pending reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleAction = async (reportId, action) => {
    try {
      setActionLoading(reportId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/reports/${reportId}/${action}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          text || `Request failed with HTTP ${response.status}`
        );
      }

      await loadReports();
    } catch (err) {
      console.error("Report action error:", err);
      setError(err.message || "Failed to process report.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      style={{
        padding: "30px",
        minHeight: "100%",
        background: "#f5f7fb",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
              }}
            >
              Pending Reports
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#666",
              }}
            >
              Camera reports waiting for review.
            </p>
          </div>

          <button
            onClick={loadReports}
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: "6px",
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            Loading pending reports...
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#b91c1c",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "10px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h2>No Pending Reports</h2>
            <p style={{ color: "#666" }}>
              There are currently no camera reports waiting for review.
            </p>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {reports.map((report) => (
              <div
                key={report.id}
                style={{
                  background: "white",
                  padding: "22px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "20px",
                    marginBottom: "15px",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "20px",
                    }}
                  >
                    {report.camera_type ||
                      report.cameraType ||
                      "Camera Report"}
                  </h2>

                  <span
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      padding: "5px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                  >
                    PENDING
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "10px",
                    lineHeight: "1.6",
                  }}
                >
                  {report.city && (
                    <div>
                      <strong>City:</strong> {report.city}
                    </div>
                  )}

                  {report.state && (
                    <div>
                      <strong>State:</strong> {report.state}
                    </div>
                  )}

                  {report.road_name && (
                    <div>
                      <strong>Road:</strong> {report.road_name}
                    </div>
                  )}

                  {report.latitude !== undefined && (
                    <div>
                      <strong>Latitude:</strong> {report.latitude}
                    </div>
                  )}

                  {report.longitude !== undefined && (
                    <div>
                      <strong>Longitude:</strong> {report.longitude}
                    </div>
                  )}

                  {report.source && (
                    <div>
                      <strong>Source:</strong> {report.source}
                    </div>
                  )}
                </div>

                {report.description && (
                  <div
                    style={{
                      marginTop: "15px",
                      padding: "12px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                    }}
                  >
                    <strong>Description:</strong>
                    <div style={{ marginTop: "5px" }}>
                      {report.description}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "20px",
                  }}
                >
                  <button
                    disabled={actionLoading === report.id}
                    onClick={() =>
                      handleAction(report.id, "approve")
                    }
                    style={{
                      padding: "10px 18px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#16a34a",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    {actionLoading === report.id
                      ? "Processing..."
                      : "Approve"}
                  </button>

                  <button
                    disabled={actionLoading === report.id}
                    onClick={() =>
                      handleAction(report.id, "reject")
                    }
                    style={{
                      padding: "10px 18px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#dc2626",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}