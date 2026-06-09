import { io } from "socket.io-client";

let socket = null;

export function getSocketUrl() {
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000"
  );
}

export function getCallSocket() {
  if (typeof window === "undefined") return null;
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

/** Run callback when socket is connected (handles race on first join) */
export function whenSocketReady(callback) {
  const s = getCallSocket();
  if (!s) return;
  if (s.connected) {
    callback(s);
    return;
  }
  s.once("connect", () => callback(s));
  if (!s.active) s.connect();
}

export function disconnectCallSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
