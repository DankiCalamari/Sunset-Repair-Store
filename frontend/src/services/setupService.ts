import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const setupApi = {
  status: async () => {
    try {
      const response = await axios.get(`${API_BASE}/setup/status`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to check setup status");
    }
  },
};
