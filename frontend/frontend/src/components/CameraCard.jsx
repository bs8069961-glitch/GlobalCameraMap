function CameraCard({ camera, updateVerification }) {
  return (
    <div className="camera-card">

      <div className="camera-header">

        <h3>Camera #{camera.id}</h3>

        <span
          className={`badge ${camera.verification_status}`}
        >
          {camera.verification_status}
        </span>

      </div>

      <div className="camera-body">

        <p>
          <strong>City:</strong> {camera.city}
        </p>

        <p>
          <strong>State:</strong> {camera.state}
        </p>

        <p>
          <strong>Country:</strong> {camera.country}
        </p>

        <p>
          <strong>Road:</strong> {camera.road_name}
        </p>

        <p>
          <strong>Camera Type:</strong> {camera.camera_type}
        </p>

        <p>
          <strong>Enforcement:</strong> {camera.enforcement_type}
        </p>

        <p>
          <strong>Coordinates:</strong><br />
          {camera.latitude}, {camera.longitude}
        </p>

        <p>
          <strong>Source:</strong> {camera.source}
        </p>

      </div>

      <div className="action-buttons">

        <button
          className="verify-btn"
          disabled={camera.verification_status === "verified"}
          onClick={() =>
            updateVerification(camera.id, "verified")
          }
        >
          Verify
        </button>

        <button
          className="pending-btn"
          disabled={camera.verification_status === "pending"}
          onClick={() =>
            updateVerification(camera.id, "pending")
          }
        >
          Pending
        </button>

        <button
          className="reject-btn"
          disabled={camera.verification_status === "rejected"}
          onClick={() =>
            updateVerification(camera.id, "rejected")
          }
        >
          Reject
        </button>

      </div>

    </div>
  );
}

export default CameraCard;