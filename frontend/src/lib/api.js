import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Routes that must never be redirected away from on a 401, because they are
// reachable without signing in.
const PUBLIC_PATHS = ["/auth/", "/help", "/share/"];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401 && !isPublicPath(window.location.pathname)) {
      window.location.href = "/auth/login";
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
