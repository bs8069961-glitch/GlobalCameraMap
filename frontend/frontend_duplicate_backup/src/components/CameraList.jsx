import CameraCard from "./CameraCard";

function CameraList({
  cameras,
  updateVerification,
}) {
  if (cameras.length === 0) {
    return (
      <div className="message">
        No cameras found.
      </div>
    );
  }

  return (
    <div className="camera-grid">
      {cameras.map((camera) => (
        <CameraCard
          key={camera.id}
          camera={camera}
          updateVerification={updateVerification}
        />
      ))}
    </div>
  );
}

export default CameraList;
