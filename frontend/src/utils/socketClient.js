import { io } from "socket.io-client";

export function createAppSocket(baseUrl, extraOptions = {}) {
  const socket = io(baseUrl, {
    withCredentials: true,
    path: "/socket.io",
    transports: ["websocket", "polling"],
    upgrade: true,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 12000,
    reconnectionAttempts: Infinity,
    timeout: 25000,
    ...extraOptions,
  });

  socket.on("connect_error", (error) => {
    const message = String(error?.message || "");
    if (message.includes("Session ID unknown") || message.includes("xhr poll error")) {
      socket.io.opts.transports = ["polling", "websocket"];
      if (socket.connected) {
        socket.disconnect();
      }
      socket.connect();
    }
  });

  return socket;
}
