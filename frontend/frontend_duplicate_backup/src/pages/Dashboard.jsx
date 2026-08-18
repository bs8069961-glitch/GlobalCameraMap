import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "./Dashboard.css";

function Dashboard() {
  const [stats, setStats] = useState({
    total_cameras: 0,
    total_reports: 0,
    pending_reports: 0,
    approved_reports: 0,
    rejected_reports: 0,
    verified_cameras: 0,
  });

  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load statistics");
        }

        return res.json();
      })
      .then((data) => {
        console.log("Statistics:", data);
        setStats(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load statistics");
      });
  }, []);

  return (
    <div className="dashboard">
      <h1>📊 Camera Statistics</h1>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      <div className="stats-container">
        <div className="stat-card">
          <h2>Total Cameras</h2>
          <p>{stats.total_cameras}</p>
        </div>

        <div className="stat-card">
          <h2>Total Reports</h2>
          <p>{stats.total_reports}</p>
        </div>

        <div className="stat-card">
          <h2>Pending Reports</h2>
          <p>{stats.pending_reports}</p>
        </div>

        <div className="stat-card">
          <h2>Verified Cameras</h2>
          <p>{stats.verified_cameras}</p>
        </div>

        <div className="stat-card">
          <h2>Approved Reports</h2>
          <p>{stats.approved_reports}</p>
        </div>

        <div className="stat-card">
          <h2>Rejected Reports</h2>
          <p>{stats.rejected_reports}</p>
        </div>
      </div>

      <div className="dashboard-actions">
        <Link
          to="/map"
          className="dashboard-btn"
        >
          🗺 View Camera Map
        </Link>

        <Link
          to="/pending"
          className="dashboard-btn"
        >
          ⏳ Review Reports
        </Link>

        <Link
          to="/report"
          className="dashboard-btn"
        >
          📢 Report Camera
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;