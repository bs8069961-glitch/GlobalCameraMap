import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// HELPERS
// ============================================================

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function getReportId(report) {
  return report?.id ?? report?.report_id;
}

function getCameraType(report) {
  return (
    report?.camera_type ||
    report?.cameraType ||
    report?.type ||
    "Unknown Camera"
  );
}

function getLocation(report) {
  return (
    report?.location ||
    report?.location_name ||
    report?.address ||
    report?.road_name ||
    "Location not provided"
  );
}

function getStatus(report) {
  return String(
    report?.status ||
      report?.verification_status ||
      "pending"
  )
    .toLowerCase()
    .trim();
}


// ============================================================
// ICON
// ============================================================

function CameraIcon() {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 23,
        flexShrink: 0,
      }}
    >
      📷
    </div>
  );
}


// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }) {
  const normalized = String(status || "pending").toLowerCase();

  let background = "#fff7ed";
  let color = "#c2410c";
  let label = "Pending";

  if (normalized === "approved" || normalized === "verified") {
    background = "#f0fdf4";
    color = "#15803d";
    label = "Approved";
  }

  if (normalized === "rejected" || normalized === "invalid") {
    background = "#fef2f2";
    color = "#b91c1c";
    label = "Rejected";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 9px",
        borderRadius: 999,
        background,
        color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <span>●</span>
      {label}
    </span>
  );
}


// ============================================================
// REPORT DETAILS
// ============================================================

function ReportDetails({ report }) {
  const latitude =
    report?.latitude ??
    report?.lat;

  const longitude =
    report?.longitude ??
    report?.lng ??
    report?.lon;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 12,
        marginTop: 18,
      }}
    >
      <Detail
        label="Camera Type"
        value={getCameraType(report)}
      />

      <Detail
        label="City"
        value={report?.city}
      />

      <Detail
        label="State"
        value={report?.state}
      />

      <Detail
        label="Country"
        value={report?.country}
      />

      <Detail
        label="Road"
        value={report?.road_name}
      />

      <Detail
        label="Enforcement"
        value={report?.enforcement_type}
      />

      <Detail
        label="Latitude"
        value={latitude}
      />

      <Detail
        label="Longitude"
        value={longitude}
      />

      <Detail
        label="Source"
        value={report?.source}
      />

      <Detail
        label="Submitted"
        value={formatDate(
          report?.created_at ||
            report?.submitted_at ||
            report?.reported_at
        )}
      />
    </div>
  );
}


// ============================================================
// DETAIL
// ============================================================

function Detail({ label, value }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#0f172a",
          fontSize: 13,
          fontWeight: 600,
          wordBreak: "break-word",
        }}
      >
        {formatValue(value)}
      </div>
    </div>
  );
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PendingCameras() {
  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [actionError, setActionError] =
    useState("");

  const [processingId, setProcessingId] =
    useState(null);

  const [search, setSearch] = useState("");

  const [filter, setFilter] =
    useState("all");

  const [lastUpdated, setLastUpdated] =
    useState(null);


  // ==========================================================
  // LOAD REPORTS
  // ==========================================================

  const loadReports = useCallback(
    async (manual = false) => {
      try {
        if (manual) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          `${API_URL}/api/reports/pending`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Reports API returned HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        let reportData = [];

        if (Array.isArray(data)) {
          reportData = data;
        } else if (
          Array.isArray(data?.reports)
        ) {
          reportData = data.reports;
        } else {
          throw new Error(
            "Invalid reports API response."
          );
        }

        setReports(reportData);
        setLastUpdated(new Date());
      } catch (err) {
        console.error(
          "Pending reports error:",
          err
        );

        setError(
          err?.message ||
            "Failed to load pending reports."
        );
      } finally {
        if (manual) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadReports();
  }, [loadReports]);


  // ==========================================================
  // AUTOMATIC REFRESH
  // ==========================================================

  useEffect(() => {
    const timer = setInterval(() => {
      loadReports(true);
    }, 60 * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [loadReports]);


  // ==========================================================
  // FILTERED REPORTS
  // ==========================================================

  const filteredReports = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return reports.filter((report) => {
      const status = getStatus(report);

      if (
        filter !== "all" &&
        status !== filter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        getReportId(report),
        getCameraType(report),
        report?.city,
        report?.state,
        report?.country,
        report?.road_name,
        report?.location,
        report?.location_name,
        report?.address,
        report?.source,
        report?.description,
        report?.reporter_name,
        report?.email,
      ]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined
        )
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [reports, search, filter]);


  // ==========================================================
  // COUNTS
  // ==========================================================

  const counts = useMemo(() => {
    const result = {
      total: reports.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    reports.forEach((report) => {
      const status = getStatus(report);

      if (status === "approved") {
        result.approved += 1;
      } else if (
        status === "rejected"
      ) {
        result.rejected += 1;
      } else {
        result.pending += 1;
      }
    });

    return result;
  }, [reports]);


  // ==========================================================
  // APPROVE REPORT
  // ==========================================================

  const approveReport = async (report) => {
    const reportId = getReportId(report);

    if (
      reportId === null ||
      reportId === undefined
    ) {
      setActionError(
        "Unable to approve this report because the report ID is missing."
      );

      return;
    }

    const confirmed = window.confirm(
      `Approve camera report #${reportId}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(reportId);
      setActionError("");

      const response = await fetch(
        `${API_URL}/api/reports/${reportId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

      if (!response.ok) {
        let message = `Approval failed with HTTP ${response.status}`;

        try {
          const data =
            await response.json();

          if (data?.detail) {
            message = data.detail;
          }
        } catch {
          // Ignore invalid error body.
        }

        throw new Error(message);
      }

      await loadReports(true);
    } catch (err) {
      console.error(
        "Approve report error:",
        err
      );

      setActionError(
        err?.message ||
          "Failed to approve report."
      );
    } finally {
      setProcessingId(null);
    }
  };


  // ==========================================================
  // REJECT REPORT
  // ==========================================================

  const rejectReport = async (report) => {
    const reportId = getReportId(report);

    if (
      reportId === null ||
      reportId === undefined
    ) {
      setActionError(
        "Unable to reject this report because the report ID is missing."
      );

      return;
    }

    const confirmed = window.confirm(
      `Reject camera report #${reportId}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(reportId);
      setActionError("");

      const response = await fetch(
        `${API_URL}/api/reports/${reportId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

      if (!response.ok) {
        let message = `Rejection failed with HTTP ${response.status}`;

        try {
          const data =
            await response.json();

          if (data?.detail) {
            message = data.detail;
          }
        } catch {
          // Ignore invalid error body.
        }

        throw new Error(message);
      }

      await loadReports(true);
    } catch (err) {
      console.error(
        "Reject report error:",
        err
      );

      setActionError(
        err?.message ||
          "Failed to reject report."
      );
    } finally {
      setProcessingId(null);
    }
  };


  // ==========================================================
  // STYLES
  // ==========================================================

  const buttonBase = {
    border: "none",
    borderRadius: 9,
    padding: "9px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      style={{
        minHeight: "100%",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
        padding: "28px",
        boxSizing: "border-box",
      }}
    >

      {/* ====================================================
          HEADER
      ===================================================== */}

      <div
        style={{
          maxWidth: 1250,
          margin: "0 auto",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >

          <div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 7,
              }}
            >
              <span
                style={{
                  fontSize: 28,
                }}
              >
                ⏳
              </span>

              <h1
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                Pending Reports
              </h1>
            </div>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Review and manage reported traffic
              cameras before they become part of
              the verified camera network.
            </p>

          </div>


          {/* REFRESH */}

          <button
            type="button"
            onClick={() =>
              loadReports(true)
            }
            disabled={refreshing}
            style={{
              ...buttonBase,
              background: "#ffffff",
              color: "#0f172a",
              border:
                "1px solid #dbe2ea",
              boxShadow:
                "0 2px 8px rgba(15,23,42,0.06)",
              opacity:
                refreshing ? 0.6 : 1,
            }}
          >
            🔄{" "}
            {refreshing
              ? "Refreshing..."
              : "Refresh Reports"}
          </button>

        </div>


        {/* ==================================================
            STAT CARDS
        =================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >

          <StatCard
            icon="📋"
            label="Total Reports"
            value={counts.total}
          />

          <StatCard
            icon="⏳"
            label="Pending"
            value={counts.pending}
            accent="orange"
          />

          <StatCard
            icon="✅"
            label="Approved"
            value={counts.approved}
            accent="green"
          />

          <StatCard
            icon="❌"
            label="Rejected"
            value={counts.rejected}
            accent="red"
          />

        </div>


        {/* ==================================================
            ACTION ERROR
        =================================================== */}

        {actionError && (
          <div
            style={{
              background: "#fff1f2",
              border:
                "1px solid #fecdd3",
              color: "#be123c",
              borderRadius: 12,
              padding: "13px 15px",
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⚠️ {actionError}
          </div>
        )}


        {/* ==================================================
            API ERROR
        =================================================== */}

        {error && (
          <div
            style={{
              background: "#fff1f2",
              border:
                "1px solid #fecdd3",
              color: "#be123c",
              borderRadius: 12,
              padding: "16px",
              marginBottom: 16,
            }}
          >
            <strong>
              Unable to load pending reports
            </strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 13,
              }}
            >
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                loadReports(true)
              }
              style={{
                ...buttonBase,
                marginTop: 10,
                background: "#be123c",
                color: "#ffffff",
              }}
            >
              Try Again
            </button>
          </div>
        )}


        {/* ==================================================
            FILTER BAR
        =================================================== */}

        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 18,
            boxShadow:
              "0 2px 10px rgba(15,23,42,0.04)",
          }}
        >

          <div
            style={{
              position: "relative",
              flex: "1 1 300px",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform:
                  "translateY(-50%)",
                fontSize: 16,
              }}
            >
              🔎
            </span>

            <input
              type="text"
              placeholder="Search reports, city, state, road..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding:
                  "10px 12px 10px 38px",
                border:
                  "1px solid #dbe2ea",
                borderRadius: 9,
                outline: "none",
                fontSize: 13,
                background: "#f8fafc",
              }}
            />
          </div>


          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value
              )
            }
            style={{
              padding: "10px 12px",
              border:
                "1px solid #dbe2ea",
              borderRadius: 9,
              background: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              color: "#334155",
            }}
          >
            <option value="all">
              All Reports
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="rejected">
              Rejected
            </option>
          </select>


          <div
            style={{
              color: "#64748b",
              fontSize: 12,
              fontWeight: 600,
              padding: "0 5px",
            }}
          >
            Showing{" "}
            <strong
              style={{
                color: "#0f172a",
              }}
            >
              {filteredReports.length}
            </strong>{" "}
            of {reports.length}
          </div>

        </div>


        {/* ==================================================
            LOADING
        =================================================== */}

        {loading && (
          <div
            style={{
              background: "#ffffff",
              border:
                "1px solid #e2e8f0",
              borderRadius: 16,
              padding: "55px 20px",
              textAlign: "center",
              boxShadow:
                "0 2px 10px rgba(15,23,42,0.04)",
            }}
          >
            <div
              style={{
                fontSize: 30,
                marginBottom: 10,
              }}
            >
              ⏳
            </div>

            <div
              style={{
                color: "#334155",
                fontWeight: 700,
              }}
            >
              Loading pending reports...
            </div>

            <div
              style={{
                color: "#94a3b8",
                fontSize: 12,
                marginTop: 5,
              }}
            >
              Connecting to the camera intelligence API
            </div>
          </div>
        )}


        {/* ==================================================
            EMPTY STATE
        =================================================== */}

        {!loading &&
          !error &&
          filteredReports.length === 0 && (
            <div
              style={{
                background: "#ffffff",
                border:
                  "1px solid #e2e8f0",
                borderRadius: 16,
                padding: "65px 20px",
                textAlign: "center",
                boxShadow:
                  "0 2px 10px rgba(15,23,42,0.04)",
              }}
            >

              <div
                style={{
                  fontSize: 45,
                  marginBottom: 12,
                }}
              >
                {reports.length === 0
                  ? "🎉"
                  : "🔎"}
              </div>

              <h2
                style={{
                  margin:
                    "0 0 7px",
                  color: "#0f172a",
                  fontSize: 20,
                }}
              >
                {reports.length === 0
                  ? "No pending reports"
                  : "No matching reports"}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                {reports.length === 0
                  ? "All reported cameras have been reviewed."
                  : "Try changing your search or filter."}
              </p>

            </div>
          )}


        {/* ==================================================
            REPORT LIST
        =================================================== */}

        {!loading &&
          filteredReports.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >

              {filteredReports.map(
                (report, index) => {
                  const reportId =
                    getReportId(report);

                  const status =
                    getStatus(report);

                  const processing =
                    processingId ===
                    reportId;

                  return (
                    <article
                      key={
                        reportId ??
                        `report-${index}`
                      }
                      style={{
                        background:
                          "#ffffff",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 16,
                        padding: 20,
                        boxShadow:
                          "0 3px 12px rgba(15,23,42,0.05)",
                      }}
                    >

                      {/* REPORT HEADER */}

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: 15,
                          flexWrap:
                            "wrap",
                        }}
                      >

                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            gap: 12,
                          }}
                        >

                          <CameraIcon />

                          <div>

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: 8,
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              <h2
                                style={{
                                  margin: 0,
                                  fontSize: 17,
                                  color:
                                    "#0f172a",
                                }}
                              >
                                {getCameraType(
                                  report
                                )}
                              </h2>

                              <StatusBadge
                                status={
                                  status
                                }
                              />
                            </div>

                            <div
                              style={{
                                color:
                                  "#64748b",
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              Report #
                              {formatValue(
                                reportId
                              )}
                            </div>

                          </div>

                        </div>


                        {/* LOCATION */}

                        <div
                          style={{
                            color:
                              "#475569",
                            fontSize: 13,
                            fontWeight: 600,
                            maxWidth: 350,
                          }}
                        >
                          📍{" "}
                          {getLocation(
                            report
                          )}
                        </div>

                      </div>


                      {/* DETAILS */}

                      <ReportDetails
                        report={report}
                      />


                      {/* DESCRIPTION */}

                      {report?.description && (
                        <div
                          style={{
                            marginTop: 14,
                            padding: 13,
                            borderRadius: 10,
                            background:
                              "#f8fafc",
                            border:
                              "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#64748b",
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform:
                                "uppercase",
                              marginBottom: 5,
                            }}
                          >
                            Description
                          </div>

                          <div
                            style={{
                              color:
                                "#334155",
                              fontSize: 13,
                              lineHeight:
                                1.55,
                            }}
                          >
                            {
                              report.description
                            }
                          </div>
                        </div>
                      )}


                      {/* REPORTER */}

                      {(report?.reporter_name ||
                        report?.email) && (
                        <div
                          style={{
                            marginTop: 14,
                            paddingTop: 12,
                            borderTop:
                              "1px solid #e2e8f0",
                            display: "flex",
                            gap: 18,
                            flexWrap:
                              "wrap",
                            fontSize: 12,
                            color:
                              "#64748b",
                          }}
                        >

                          {report?.reporter_name && (
                            <span>
                              👤{" "}
                              <strong>
                                Reporter:
                              </strong>{" "}
                              {
                                report.reporter_name
                              }
                            </span>
                          )}

                          {report?.email && (
                            <span>
                              ✉️{" "}
                              <strong>
                                Email:
                              </strong>{" "}
                              {report.email}
                            </span>
                          )}

                        </div>
                      )}


                      {/* SOURCE */}

                      {report?.source_url && (
                        <div
                          style={{
                            marginTop: 13,
                          }}
                        >
                          <a
                            href={
                              report.source_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color:
                                "#2563eb",
                              fontSize: 13,
                              fontWeight: 700,
                              textDecoration:
                                "none",
                            }}
                          >
                            🔗 View Evidence / Source →
                          </a>
                        </div>
                      )}


                      {/* ACTIONS */}

                      {status !==
                        "approved" &&
                        status !==
                          "rejected" && (
                          <div
                            style={{
                              marginTop: 18,
                              paddingTop: 15,
                              borderTop:
                                "1px solid #e2e8f0",
                              display:
                                "flex",
                              justifyContent:
                                "flex-end",
                              gap: 9,
                              flexWrap:
                                "wrap",
                            }}
                          >

                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                rejectReport(
                                  report
                                )
                              }
                              style={{
                                ...buttonBase,
                                background:
                                  "#fef2f2",
                                color:
                                  "#b91c1c",
                                border:
                                  "1px solid #fecaca",
                                opacity:
                                  processing
                                    ? 0.55
                                    : 1,
                              }}
                            >
                              ❌{" "}
                              {processing
                                ? "Processing..."
                                : "Reject Report"}
                            </button>


                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                approveReport(
                                  report
                                )
                              }
                              style={{
                                ...buttonBase,
                                background:
                                  "#16a34a",
                                color:
                                  "#ffffff",
                                boxShadow:
                                  "0 2px 5px rgba(22,163,74,0.2)",
                                opacity:
                                  processing
                                    ? 0.55
                                    : 1,
                              }}
                            >
                              ✅{" "}
                              {processing
                                ? "Processing..."
                                : "Approve Camera"}
                            </button>

                          </div>
                        )}

                    </article>
                  );
                }
              )}

            </div>
          )}


        {/* ==================================================
            FOOTER
        =================================================== */}

        {!loading &&
          !error &&
          lastUpdated && (
            <div
              style={{
                textAlign: "center",
                marginTop: 18,
                color: "#94a3b8",
                fontSize: 11,
              }}
            >
              API updated{" "}
              {lastUpdated.toLocaleTimeString()}
              {" • "}
              Auto-refresh every 60 seconds
            </div>
          )}

      </div>
    </div>
  );
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  icon,
  label,
  value,
  accent,
}) {
  const accentColors = {
    orange: "#f59e0b",
    green: "#16a34a",
    red: "#dc2626",
  };

  const accentColor =
    accentColors[accent] ||
    "#2563eb";

  return (
    <div
      style={{
        background: "#ffffff",
        border:
          "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 17,
        display: "flex",
        alignItems: "center",
        gap: 13,
        boxShadow:
          "0 2px 10px rgba(15,23,42,0.04)",
      }}
    >

      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: `${accentColor}12`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
        }}
      >
        {icon}
      </div>

      <div>

        <div
          style={{
            color: "#64748b",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>

        <div
          style={{
            color: "#0f172a",
            fontSize: 24,
            fontWeight: 800,
            lineHeight: 1.2,
            marginTop: 2,
          }}
        >
          {value}
        </div>

      </div>

    </div>
  );
}