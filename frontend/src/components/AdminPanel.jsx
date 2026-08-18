import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function normalizeStatus(value) {
  const status = String(value || "unknown").toLowerCase().trim();

  if (
    status === "active" ||
    status === "online" ||
    status === "operational"
  ) {
    return "active";
  }

  if (
    status === "inactive" ||
    status === "offline" ||
    status === "disabled"
  ) {
    return "inactive";
  }

  return "unknown";
}

function normalizeVerification(value) {
  const verification = String(value || "pending")
    .toLowerCase()
    .trim();

  if (verification === "verified") return "verified";
  if (verification === "approved") return "approved";
  if (verification === "rejected") return "rejected";

  return "pending";
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const styles = {
    active: {
      background: "#dcfce7",
      color: "#166534",
    },
    inactive: {
      background: "#fee2e2",
      color: "#991b1b",
    },
    unknown: {
      background: "#fef3c7",
      color: "#92400e",
    },
  };

  return (
    <span
      style={{
        ...styles[normalized],
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 9px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      {normalized === "active" && "● Active"}
      {normalized === "inactive" && "● Offline"}
      {normalized === "unknown" && "● Unknown"}
    </span>
  );
}

function VerificationBadge({ status }) {
  const normalized = normalizeVerification(status);

  const styles = {
    verified: {
      background: "#dcfce7",
      color: "#166534",
    },
    approved: {
      background: "#dbeafe",
      color: "#1d4ed8",
    },
    pending: {
      background: "#fef3c7",
      color: "#92400e",
    },
    rejected: {
      background: "#fee2e2",
      color: "#991b1b",
    },
  };

  return (
    <span
      style={{
        ...styles[normalized],
        display: "inline-flex",
        padding: "5px 9px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {normalized}
    </span>
  );
}

export default function AdminPanel() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [verificationFilter, setVerificationFilter] =
    useState("All");

  const loadCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/cameras`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Camera API returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setCameras(data);
      } else if (Array.isArray(data?.cameras)) {
        setCameras(data.cameras);
      } else {
        throw new Error(
          "Invalid camera API response."
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load camera data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  const statistics = useMemo(() => {
    const total = cameras.length;

    const active = cameras.filter(
      (camera) =>
        normalizeStatus(camera?.status) === "active"
    ).length;

    const verified = cameras.filter((camera) => {
      const value = normalizeVerification(
        camera?.verification_status
      );

      return (
        value === "verified" ||
        value === "approved"
      );
    }).length;

    const pending = cameras.filter(
      (camera) =>
        normalizeVerification(
          camera?.verification_status
        ) === "pending"
    ).length;

    const inactive = cameras.filter(
      (camera) =>
        normalizeStatus(camera?.status) ===
        "inactive"
    ).length;

    return {
      total,
      active,
      verified,
      pending,
      inactive,
    };
  }, [cameras]);

  const filteredCameras = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cameras.filter((camera) => {
      const status = normalizeStatus(
        camera?.status
      );

      const verification =
        normalizeVerification(
          camera?.verification_status
        );

      const searchableText = [
        camera?.id,
        camera?.city,
        camera?.state,
        camera?.country,
        camera?.road_name,
        camera?.camera_type,
        camera?.enforcement_type,
        camera?.source,
      ]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined
        )
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchableText.includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        status === statusFilter;

      const matchesVerification =
        verificationFilter === "All" ||
        verification === verificationFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesVerification
      );
    });
  }, [
    cameras,
    search,
    statusFilter,
    verificationFilter,
  ]);

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "28px",
        background: "#f5f5f7",
        color: "#111827",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Administration
        </div>

        <h1
          style={{
            margin: "6px 0",
            fontSize: "32px",
            letterSpacing: "-0.04em",
          }}
        >
          Camera Management
        </h1>

        <p
          style={{
            margin: 0,
            color: "#6b7280",
          }}
        >
          Manage, review and monitor registered
          traffic cameras.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          }}
        >
          <strong>API Error</strong>
          <div style={{ marginTop: 4 }}>
            {error}
          </div>
        </div>
      )}

      {/* STATISTICS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {[
          [
            "📷",
            "Total Cameras",
            statistics.total,
          ],
          [
            "🟢",
            "Active",
            statistics.active,
          ],
          [
            "✓",
            "Verified",
            statistics.verified,
          ],
          [
            "⏳",
            "Pending",
            statistics.pending,
          ],
          [
            "🔴",
            "Offline",
            statistics.inactive,
          ],
        ].map(
          ([icon, label, value]) => (
            <div
              key={label}
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                padding: "20px",
                border:
                  "1px solid rgba(0,0,0,0.06)",
                boxShadow:
                  "0 4px 18px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                }}
              >
                {icon}
              </div>

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "30px",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                {value}
              </div>

              <div
                style={{
                  marginTop: "3px",
                  color: "#6b7280",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            </div>
          )
        )}
      </div>

      {/* TABLE CARD */}

      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          border:
            "1px solid rgba(0,0,0,0.06)",
          overflow: "hidden",
          boxShadow:
            "0 5px 24px rgba(0,0,0,0.05)",
        }}
      >
        {/* TOOLBAR */}

        <div
          style={{
            padding: "18px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            borderBottom:
              "1px solid #e5e7eb",
          }}
        >
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search cameras..."
            style={{
              flex: "1 1 260px",
              padding: "11px 14px",
              borderRadius: "11px",
              border:
                "1px solid #d1d5db",
              outline: "none",
              fontSize: "14px",
            }}
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            style={{
              padding: "11px 14px",
              borderRadius: "11px",
              border:
                "1px solid #d1d5db",
              background: "#ffffff",
            }}
          >
            <option value="All">
              All statuses
            </option>
            <option value="active">
              Active
            </option>
            <option value="inactive">
              Offline
            </option>
            <option value="unknown">
              Unknown
            </option>
          </select>

          <select
            value={verificationFilter}
            onChange={(event) =>
              setVerificationFilter(
                event.target.value
              )
            }
            style={{
              padding: "11px 14px",
              borderRadius: "11px",
              border:
                "1px solid #d1d5db",
              background: "#ffffff",
            }}
          >
            <option value="All">
              All verification
            </option>
            <option value="verified">
              Verified
            </option>
            <option value="approved">
              Approved
            </option>
            <option value="pending">
              Pending
            </option>
            <option value="rejected">
              Rejected
            </option>
          </select>

          <button
            type="button"
            onClick={loadCameras}
            style={{
              padding: "11px 16px",
              borderRadius: "11px",
              border: "none",
              background: "#111827",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* RESULT COUNT */}

        <div
          style={{
            padding: "14px 18px",
            color: "#6b7280",
            fontSize: "13px",
          }}
        >
          Showing{" "}
          <strong>
            {filteredCameras.length}
          </strong>{" "}
          of{" "}
          <strong>
            {cameras.length}
          </strong>{" "}
          cameras
        </div>

        {/* LOADING */}

        {loading && (
          <div
            style={{
              padding: "50px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Loading camera database...
          </div>
        )}

        {/* TABLE */}

        {!loading && (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: "900px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f9fafb",
                    textAlign: "left",
                  }}
                >
                  {[
                    "ID",
                    "Camera",
                    "Location",
                    "Type",
                    "Status",
                    "Verification",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding:
                          "13px 16px",
                        fontSize: "12px",
                        color: "#6b7280",
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          "0.05em",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredCameras.map(
                  (camera, index) => (
                    <tr
                      key={
                        camera?.id ??
                        `${index}`
                      }
                      style={{
                        borderTop:
                          "1px solid #f0f0f0",
                      }}
                    >
                      <td
                        style={{
                          padding:
                            "14px 16px",
                          fontWeight: 700,
                        }}
                      >
                        #{camera?.id}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 16px",
                          fontWeight: 700,
                        }}
                      >
                        {camera?.road_name ||
                          camera?.location_name ||
                          "Camera"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 16px",
                        }}
                      >
                        {camera?.city ||
                          "—"}
                        {camera?.state && (
                          <div
                            style={{
                              color:
                                "#6b7280",
                              fontSize:
                                "12px",
                              marginTop:
                                "3px",
                            }}
                          >
                            {
                              camera.state
                            }
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 16px",
                        }}
                      >
                        {camera?.camera_type ||
                          "Unknown"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 16px",
                        }}
                      >
                        <StatusBadge
                          status={
                            camera?.status
                          }
                        />
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 16px",
                        }}
                      >
                        <VerificationBadge
                          status={
                            camera?.verification_status
                          }
                        />
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 16px",
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            padding:
                              "7px 11px",
                            borderRadius:
                              "8px",
                            border:
                              "1px solid #d1d5db",
                            background:
                              "#ffffff",
                            cursor:
                              "pointer",
                            fontWeight:
                              600,
                          }}
                          onClick={() =>
                            alert(
                              `Camera #${camera?.id}`
                            )
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading &&
          filteredCameras.length ===
            0 && (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              No cameras match your
              filters.
            </div>
          )}
      </div>
    </div>
  );
}