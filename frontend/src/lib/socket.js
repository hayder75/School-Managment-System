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
  socket = io(socketUrl(), { auth: { token } });
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
