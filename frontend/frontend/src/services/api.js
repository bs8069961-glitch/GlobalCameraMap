import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export const getCameras = async () => {
  const response = await API.get("/api/cameras");
  return response.data;
};

export const verifyCamera = async (id, status) => {
  const response = await API.patch(
    `/api/cameras/${id}/verification`,
    {
      verification_status: status,
      verified_by: "Admin",
      reason: `Changed to ${status}`,
    }
  );

  return response.data;
};

export default API;