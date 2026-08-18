import React, { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [cameraResponse, reportResponse] = await Promise.all([
          fetch(`${API_URL}/api/cameras`),
          fetch(`${API_URL}/api/reports/pending`),
        ]);

        if (!cameraResponse.ok) {
          throw new Error(
            `Camera API returned HTTP ${cameraResponse.status}`
          );
        }

        if (!reportResponse.ok) {
          throw new Error(
            `Reports API returned HTTP ${reportResponse.status}`
          );
        }

        const cameraData = await cameraResponse.json();
        const reportData = await reportResponse.json();

        console.log("Dashboard camera data:", cameraData);
        console.log("Dashboard report data:", reportData);

        const cameraList = Array.isArray(cameraData.cameras)
          ? cameraData.cameras
          : [];

        const reportList = Array.isArray(reportData.reports)
          ? reportData.reports
          : [];

        setCameras(cameraList);
        setPendingReports(reportList);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const activeCameras = cameras.filter(
    (camera) =>
      String(camera.status || "").toLowerCase() === "active"
  ).length;

  const verifiedCameras = cameras.filter(
    (camera) =>
      String(camera.verification_status || "").toLowerCase() ===
      "verified"
  ).length;

  const pendingVerification = cameras.filter(
    (camera) =>
      String(camera.verification_status || "").toLowerCase() ===
      "pending"
  ).length;

  const cities = new Set(
    cameras
      .map((camera) => camera.city)
      .filter((city) => city && String(city).trim())
  ).size;

  const cameraTypes = {};

  cameras.forEach((camera) => {
    const type =
      camera.camera_type ||
      camera.cameraType ||
      camera.type ||
      "Unknown";

    cameraTypes[type] = (cameraTypes[type] || 0) + 1;
  });

  const stateCounts = {};

  cameras.forEach((camera) => {
    const state = camera.state || "Unknown";
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  });

  return (
    <div
      style={{
        padding: "24px",
        minHeight: "100%",
        background: "#f5f7fb",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              color: "#172033",
            }}
          >
            Dashboard
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#667085",
              fontSize: "15px",
            }}
          >
            India Traffic Camera Intelligence
          </p>
        </div>

        {loading && (
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            Loading dashboard data...
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #f0b4b4",
              color: "#a40000",
              padding: "16px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            <strong>Dashboard API Error</strong>
            <div style={{ marginTop: "5px" }}>{error}</div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <StatCard
            title="Total Cameras"
            value={cameras.length}
            icon="📷"
          />

          <StatCard
            title="Active Cameras"
            value={activeCameras}
            icon="🟢"
          />

          <StatCard
            title="Verified Cameras"
            value={verifiedCameras}
            icon="✅"
          />

          <StatCard
            title="Pending Verification"
            value={pendingVerification}
            icon="⏳"
          />

          <StatCard
            title="Cities"
            value={cities}
            icon="🏙️"
          />

          <StatCard
            title="Pending Reports"
            value={pendingReports.length}
            icon="📢"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "20px",
          }}
        >
          <DashboardCard title="Camera Type Breakdown">
            {Object.keys(cameraTypes).length === 0 ? (
              <p style={{ color: "#667085" }}>
                No camera data available.
              </p>
            ) : (
              Object.entries(cameraTypes)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div
                    key={type}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #eef0f4",
                    }}
                  >
                    <span>{type}</span>
                    <strong>{count}</strong>
                  </div>
                ))
            )}
          </DashboardCard>

          <DashboardCard title="Cameras by State">
            {Object.keys(stateCounts).length === 0 ? (
              <p style={{ color: "#667085" }}>
                No state data available.
              </p>
            ) : (
              Object.entries(stateCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15)
                .map(([state, count]) => (
                  <div
                    key={state}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #eef0f4",
                    }}
                  >
                    <span>{state}</span>
                    <strong>{count}</strong>
                  </div>
                ))
            )}
          </DashboardCard>

          <DashboardCard title="Pending Reports">
            {pendingReports.length === 0 ? (
              <div
                style={{
                  padding: "15px",
                  background: "#f0fff4",
                  borderRadius: "8px",
                  color: "#16794a",
                }}
              >
                No pending reports.
              </div>
            ) : (
              pendingReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #eef0f4",
                  }}
                >
                  <strong>
                    Report #{report.id}
                  </strong>

                  <div
                    style={{
                      marginTop: "5px",
                      color: "#667085",
                    }}
                  >
                    {report.city ||
                      report.location ||
                      "Location unavailable"}
                  </div>
                </div>
              ))
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          fontSize: "25px",
          marginBottom: "10px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#667085",
          fontSize: "14px",
          marginBottom: "6px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "30px",
          fontWeight: "700",
          color: "#172033",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DashboardCard({ title, children }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <h2
        style={{
          margin: "0 0 15px 0",
          fontSize: "19px",
          color: "#172033",
        }}
      >
        {title}
      </h2>

      {children}
    </div>
  );
}