import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// If a lazy-loaded chunk fails (e.g. a new deploy replaced old hashed files),
// reload once so the browser fetches the fresh bundle. Guard against reload loops.
window.addEventListener("vite:preloadError", () => {
  const last = Number(sessionStorage.getItem("vite-preload-reloaded") || 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem("vite-preload-reloaded", String(Date.now()));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
