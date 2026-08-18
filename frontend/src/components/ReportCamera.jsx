import React, { useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function ReportCamera() {
  const [form, setForm] = useState({
    camera_type: "Speed Camera",
    city: "",
    state: "",
    road_name: "",
    latitude: "",
    longitude: "",
    description: "",
    source: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setMessage("");
      setError("");

      if (!form.city.trim()) {
        throw new Error("Please enter the city.");
      }

      if (!form.latitude || !form.longitude) {
        throw new Error(
          "Please enter both latitude and longitude."
        );
      }

      const payload = {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      };

      const response = await fetch(
        `${API_URL}/api/reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const text = await response.text();

        throw new Error(
          text || `Report API returned HTTP ${response.status}`
        );
      }

      setMessage(
        "Camera report submitted successfully."
      );

      setForm({
        camera_type: "Speed Camera",
        city: "",
        state: "",
        road_name: "",
        latitude: "",
        longitude: "",
        description: "",
        source: "",
      });
    } catch (err) {
      console.error("Report camera error:", err);

      setError(
        err.message || "Failed to submit camera report."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxSizing: "border-box",
    fontSize: "14px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontWeight: "600",
    fontSize: "14px",
  };

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#f5f7fb",
        padding: "30px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1>Report a Camera</h1>

        <p style={{ color: "#666" }}>
          Submit information about a traffic enforcement
          camera.
        </p>

        {message && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "7px",
              background: "#dcfce7",
              color: "#166534",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "7px",
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            background: "white",
            padding: "25px",
            borderRadius: "10px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>
              Camera Type
            </label>

            <select
              name="camera_type"
              value={form.camera_type}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="Speed Camera">
                Speed Camera
              </option>
              <option value="Red Light Camera">
                Red Light Camera
              </option>
              <option value="Traffic Camera">
                Traffic Camera
              </option>
              <option value="ANPR">
                ANPR
              </option>
              <option value="ITMS">
                ITMS
              </option>
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "18px",
            }}
          >
            <div>
              <label style={labelStyle}>
                City *
              </label>

              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Chandigarh"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                State
              </label>

              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="e.g. Punjab"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Road Name
              </label>

              <input
                name="road_name"
                value={form.road_name}
                onChange={handleChange}
                placeholder="e.g. Madhya Marg"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Latitude *
              </label>

              <input
                type="number"
                step="any"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                placeholder="30.7333"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Longitude *
              </label>

              <input
                type="number"
                step="any"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                placeholder="76.7794"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Source
              </label>

              <input
                name="source"
                value={form.source}
                onChange={handleChange}
                placeholder="Source or website"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: "18px" }}>
            <label style={labelStyle}>
              Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Provide additional information..."
              rows="5"
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "20px",
              padding: "12px 22px",
              border: "none",
              borderRadius: "6px",
              background: "#2563eb",
              color: "white",
              cursor: submitting
                ? "not-allowed"
                : "pointer",
              fontWeight: "600",
            }}
          >
            {submitting
              ? "Submitting..."
              : "Submit Camera Report"}
          </button>
        </form>
      </div>
    </div>
  );
}