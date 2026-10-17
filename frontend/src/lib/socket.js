import { io } from "socket.io-client";

let socket = null;
let socketToken = null;

function socketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && !apiUrl.startsWith("/")) {
    return apiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  return window.location.origin;
}

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected && socketToken === token) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  // WebSocket-only: required for pm2 cluster mode (no sticky sessions), and
  // avoids the polling handshake round-trips on high-latency links.
  socket = io(socketUrl(), {
    auth: { token: token || undefined },
    withCredentials: true,
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
  });
  socketToken = token;
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}
