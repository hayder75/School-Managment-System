import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith("/auth/")) {
      window.location.href = "/auth/login";
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
