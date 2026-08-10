import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = "";

function AdminVerificationDashboard() {
  const [cameras, setCameras] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
  });

  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCamera, setSelectedCamera] =
    useState(null);

  const [history, setHistory] = useState([]);

  const [verificationStatus, setVerificationStatus] =
    useState("verified");

  const [reason, setReason] = useState("");

  const [verifiedBy, setVerifiedBy] =
    useState("");

  const [updating, setUpdating] = useState(false);

  const [selectedIds, setSelectedIds] =
    useState([]);

  // ============================================================
  // LOAD CAMERAS
  // ============================================================

  const loadCameras = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/cameras`
      );

      setCameras(response.data.cameras || []);
    } catch (err) {
      console.error(
        "Failed to load cameras:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Failed to load cameras"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD SUMMARY
  // ============================================================

  const loadSummary = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/verification/summary`
      );

      if (response.data.success) {
        setSummary(
          response.data.summary
        );
      }
    } catch (err) {
      console.error(
        "Failed to load summary:",
        err
      );
    }
  };

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    await Promise.all([
      loadCameras(),
      loadSummary(),
    ]);
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================
  // FILTER CAMERAS
  // ============================================================

  const filteredCameras =
    filter === "all"
      ? cameras
      : cameras.filter(
          (camera) =>
            camera.verification_status ===
            filter
        );

  // ============================================================
  // SELECT ALL
  // ============================================================

  const handleSelectAll = () => {
    if (
      selectedIds.length ===
      filteredCameras.length
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        filteredCameras.map(
          (camera) => camera.id
        )
      );
    }
  };

  // ============================================================
  // SELECT SINGLE CAMERA
  // ============================================================

  const handleSelectCamera = (
    cameraId
  ) => {
    setSelectedIds((previous) => {
      if (
        previous.includes(cameraId)
      ) {
        return previous.filter(
          (id) => id !== cameraId
        );
      }

      return [
        ...previous,
        cameraId,
      ];
    });
  };

  // ============================================================
  // OPEN CAMERA
  // ============================================================

  const openCamera = (camera) => {
    setSelectedCamera(camera);

    setVerificationStatus(
      camera.verification_status ||
        "pending"
    );

    setReason("");

    setVerifiedBy("");

    loadHistory(camera.id);
  };

  // ============================================================
  // LOAD VERIFICATION HISTORY
  // ============================================================

  const loadHistory = async (
    cameraId
  ) => {
    try {
      const response =
        await axios.get(
          `${API_BASE_URL}/api/cameras/${cameraId}/verification-history`
        );

      setHistory(
        response.data.history || []
      );
    } catch (err) {
      console.error(
        "Failed to load history:",
        err
      );

      setHistory([]);
    }
  };

  // ============================================================
  // UPDATE SINGLE CAMERA
  // ============================================================

  const updateVerification =
    async () => {
      if (!selectedCamera) {
        return;
      }

      if (!verifiedBy.trim()) {
        alert(
          "Please enter the verifier name."
        );

        return;
      }

      try {
        setUpdating(true);

        await axios.patch(
          `${API_BASE_URL}/api/cameras/${selectedCamera.id}/verification`,
          {
            verification_status:
              verificationStatus,

            reason:
              reason.trim() || null,

            verified_by:
              verifiedBy.trim(),
          }
        );

        alert(
          "Camera verification updated successfully."
        );

        setSelectedCamera(null);

        await loadData();

      } catch (err) {
        console.error(
          "Verification update failed:",
          err
        );

        alert(
          err.response?.data?.detail ||
            "Failed to update verification."
        );
      } finally {
        setUpdating(false);
      }
    };

  // ============================================================
  // BULK VERIFICATION
  // ============================================================

  const bulkUpdate =
    async () => {
      if (
        selectedIds.length === 0
      ) {
        alert(
          "Please select at least one camera."
        );

        return;
      }

      if (!verifiedBy.trim()) {
        alert(
          "Please enter the verifier name."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Are you sure you want to mark ${selectedIds.length} cameras as ${verificationStatus}?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setUpdating(true);

        await axios.post(
          `${API_BASE_URL}/api/cameras/bulk-verification`,
          {
            camera_ids:
              selectedIds,

            verification_status:
              verificationStatus,

            reason:
              reason.trim() || null,

            verified_by:
              verifiedBy.trim(),
          }
        );

        alert(
          "Bulk verification completed successfully."
        );

        setSelectedIds([]);

        setReason("");

        await loadData();

      } catch (err) {
        console.error(
          "Bulk verification failed:",
          err
        );

        alert(
          err.response?.data?.detail ||
            "Bulk verification failed."
        );
      } finally {
        setUpdating(false);
      }
    };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          Loading verification dashboard...
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="dashboard-container">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header">

        <div>
          <h1>
            Admin Verification Dashboard
          </h1>

          <p>
            Review and verify traffic camera records.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadData}
        >
          Refresh Data
        </button>

      </div>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}


      {/* =====================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="summary-grid">

        <div
          className="summary-card total"
          onClick={() =>
            setFilter("all")
          }
        >
          <h3>Total Cameras</h3>

          <strong>
            {summary.total}
          </strong>
        </div>


        <div
          className="summary-card verified"
          onClick={() =>
            setFilter("verified")
          }
        >
          <h3>Verified</h3>

          <strong>
            {summary.verified}
          </strong>
        </div>


        <div
          className="summary-card pending"
          onClick={() =>
            setFilter("pending")
          }
        >
          <h3>Pending</h3>

          <strong>
            {summary.pending}
          </strong>
        </div>


        <div
          className="summary-card rejected"
          onClick={() =>
            setFilter("rejected")
          }
        >
          <h3>Rejected</h3>

          <strong>
            {summary.rejected}
          </strong>
        </div>

      </div>


      {/* =====================================================
          BULK ACTION PANEL
      ====================================================== */}

      <div className="bulk-panel">

        <div>

          <strong>
            {selectedIds.length}
          </strong>

          {" cameras selected"}

        </div>


        <select
          value={verificationStatus}
          onChange={(event) =>
            setVerificationStatus(
              event.target.value
            )
          }
        >

          <option value="pending">
            Pending
          </option>

          <option value="verified">
            Verified
          </option>

          <option value="rejected">
            Rejected
          </option>

        </select>


        <input
          type="text"
          placeholder="Verified by"
          value={verifiedBy}
          onChange={(event) =>
            setVerifiedBy(
              event.target.value
            )
          }
        />


        <input
          type="text"
          placeholder="Reason"
          value={reason}
          onChange={(event) =>
            setReason(
              event.target.value
            )
          }
        />


        <button
          onClick={bulkUpdate}
          disabled={
            updating ||
            selectedIds.length === 0
          }
        >
          {updating
            ? "Updating..."
            : "Apply to Selected"}
        </button>

      </div>


      {/* =====================================================
          FILTERS
      ====================================================== */}

      <div className="filter-panel">

        <button
          className={
            filter === "all"
              ? "active-filter"
              : ""
          }
          onClick={() =>
            setFilter("all")
          }
        >
          All ({summary.total})
        </button>


        <button
          className={
            filter === "pending"
              ? "active-filter"
              : ""
          }
          onClick={() =>
            setFilter("pending")
          }
        >
          Pending ({summary.pending})
        </button>


        <button
          className={
            filter === "verified"
              ? "active-filter"
              : ""
          }
          onClick={() =>
            setFilter("verified")
          }
        >
          Verified ({summary.verified})
        </button>


        <button
          className={
            filter === "rejected"
              ? "active-filter"
              : ""
          }
          onClick={() =>
            setFilter("rejected")
          }
        >
          Rejected ({summary.rejected})
        </button>

      </div>


      {/* =====================================================
          CAMERA TABLE
      ====================================================== */}

      <div className="table-container">

        <table>

          <thead>

            <tr>

              <th>

                <input
                  type="checkbox"
                  checked={
                    filteredCameras.length >
                      0 &&
                    selectedIds.length ===
                      filteredCameras.length
                  }
                  onChange={
                    handleSelectAll
                  }
                />

              </th>

              <th>ID</th>

              <th>Location</th>

              <th>Road</th>

              <th>Camera Type</th>

              <th>Source</th>

              <th>Status</th>

              <th>Last Verified</th>

              <th>Action</th>

            </tr>

          </thead>


          <tbody>

            {filteredCameras.length ===
            0 ? (

              <tr>

                <td
                  colSpan="9"
                  className="empty-state"
                >
                  No cameras found.
                </td>

              </tr>

            ) : (

              filteredCameras.map(
                (camera) => (

                  <tr
                    key={camera.id}
                  >

                    <td>

                      <input
                        type="checkbox"
                        checked={selectedIds.includes(
                          camera.id
                        )}
                        onChange={() =>
                          handleSelectCamera(
                            camera.id
                          )
                        }
                      />

                    </td>


                    <td>
                      #{camera.id}
                    </td>


                    <td>

                      <strong>
                        {camera.city ||
                          "Unknown"}
                      </strong>

                      <br />

                      <small>
                        {camera.state ||
                          ""}
                      </small>

                    </td>


                    <td>
                      {camera.road_name ||
                        "-"}
                    </td>


                    <td>
                      {camera.camera_type ||
                        "-"}
                    </td>


                    <td>
                      {camera.source ||
                        "-"}
                    </td>


                    <td>

                      <span
                        className={`status-badge ${camera.verification_status}`}
                      >
                        {
                          camera.verification_status
                        }
                      </span>

                    </td>


                    <td>

                      {camera.last_verified
                        ? new Date(
                            camera.last_verified
                          ).toLocaleString()
                        : "Never"}

                    </td>


                    <td>

                      <button
                        className="review-button"
                        onClick={() =>
                          openCamera(
                            camera
                          )
                        }
                      >
                        Review
                      </button>

                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>


      {/* =====================================================
          VERIFICATION MODAL
      ====================================================== */}

      {selectedCamera && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h2>
                Verify Camera #
                {selectedCamera.id}
              </h2>

              <button
                onClick={() =>
                  setSelectedCamera(
                    null
                  )
                }
              >
                ×
              </button>

            </div>


            <div className="camera-details">

              <p>
                <strong>
                  City:
                </strong>{" "}
                {selectedCamera.city}
              </p>

              <p>
                <strong>
                  State:
                </strong>{" "}
                {selectedCamera.state}
              </p>

              <p>
                <strong>
                  Road:
                </strong>{" "}
                {selectedCamera.road_name}
              </p>

              <p>
                <strong>
                  Camera Type:
                </strong>{" "}
                {selectedCamera.camera_type}
              </p>

              <p>
                <strong>
                  Coordinates:
                </strong>{" "}
                {selectedCamera.latitude},{" "}
                {selectedCamera.longitude}
              </p>

              <p>
                <strong>
                  Source:
                </strong>{" "}
                {selectedCamera.source}
              </p>

            </div>


            <div className="form-group">

              <label>
                Verification Status
              </label>

              <select
                value={
                  verificationStatus
                }
                onChange={(event) =>
                  setVerificationStatus(
                    event.target.value
                  )
                }
              >

                <option value="pending">
                  Pending
                </option>

                <option value="verified">
                  Verified
                </option>

                <option value="rejected">
                  Rejected
                </option>

              </select>

            </div>


            <div className="form-group">

              <label>
                Verified By
              </label>

              <input
                type="text"
                placeholder="Enter your name"
                value={verifiedBy}
                onChange={(event) =>
                  setVerifiedBy(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="form-group">

              <label>
                Reason
              </label>

              <textarea
                placeholder="Enter verification reason..."
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value
                  )
                }
                rows="4"
              />

            </div>


            <div className="modal-actions">

              <button
                className="cancel-button"
                onClick={() =>
                  setSelectedCamera(
                    null
                  )
                }
              >
                Cancel
              </button>


              <button
                className="save-button"
                onClick={
                  updateVerification
                }
                disabled={updating}
              >
                {updating
                  ? "Saving..."
                  : "Save Verification"}
              </button>

            </div>


            {/* =================================================
                HISTORY
            ================================================== */}

            <div className="history-section">

              <h3>
                Verification History
              </h3>

              {history.length ===
              0 ? (

                <p>
                  No verification history yet.
                </p>

              ) : (

                <div className="history-list">

                  {history.map(
                    (item) => (

                      <div
                        className="history-item"
                        key={item.id}
                      >

                        <div>

                          <strong>
                            {item.old_status ||
                              "New"}
                            {" → "}
                            {
                              item.new_status
                            }
                          </strong>

                        </div>


                        <div>

                          <small>
                            By:{" "}
                            {item.verified_by ||
                              "Unknown"}
                          </small>

                        </div>


                        <div>

                          <small>
                            Reason:{" "}
                            {item.reason ||
                              "No reason provided"}
                          </small>

                        </div>


                        <div>

                          <small>
                            {item.created_at
                              ? new Date(
                                  item.created_at
                                ).toLocaleString()
                              : ""}
                          </small>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminVerificationDashboard;