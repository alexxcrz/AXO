import { io } from "socket.io-client";

let socket = null;

export function initSocketIO() {
  if (socket?.connected) return socket;

  const usePollingOnly = import.meta.env.PROD;
  socket = io(window.location.origin, {
    path: "/socket.io",
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: usePollingOnly ? ["polling"] : ["polling", "websocket"],
    upgrade: !usePollingOnly,
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("[Socket.IO] Conectado al servidor");
  });

  socket.on("disconnect", () => {
    console.log("[Socket.IO] Desconectado del servidor");
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket.IO] Error de conexión:", error?.message);
  });

  return socket;
}

export function getSocket() {
  if (!socket) {
    return initSocketIO();
  }
  return socket;
}

export function onTransportRecordCreated(callback) {
  const sock = getSocket();
  sock.off("transport_record_created");
  sock.on("transport_record_created", callback);
}

export function onTransportRouteAssigned(callback) {
  const sock = getSocket();
  sock.off("transport_route_assigned");
  sock.on("transport_route_assigned", callback);
}

export function onTransportStatusUpdated(callback) {
  const sock = getSocket();
  sock.off("transport_status_updated");
  sock.on("transport_status_updated", callback);
}

export function onWarehouseUpdated(callback) {
  const sock = getSocket();
  sock.off("warehouse_updated");
  sock.on("warehouse_updated", callback);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
