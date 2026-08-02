import { io } from "socket.io-client";

let socket = null;
let socketToken = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected && socketToken === token) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(import.meta.env.VITE_API_URL || "http://localhost:3001", {
    auth: { token },
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
