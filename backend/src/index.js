import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEnv } from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const dotenv = await import("dotenv");
  dotenv.default.config({ path: path.resolve(__dirname, "../.env") });
} catch {
  // In production the platform already injects environment variables.
}

validateEnv();

const { app } = await import("./app.js");
const { initSocket } = await import("./config/socket.js");

// Las tablas de chat las crea prisma db push en el preDeployCommand (chat.prisma → SQLite)
console.log("[startup] iniciando servidor...");

const PORT = Number(process.env.PORT || 4000);

const server = http.createServer(app);
initSocket(server);

// Bridge warehouse state changes → Socket.IO "warehouse_updated" signal
// This lets clients know they should refresh their state, used as fallback when SSE drops.
const { subscribeWarehouseState, getRawWarehouseState } = await import("./services/warehouse.store.js");
const { getIO } = await import("./config/socket.js");
subscribeWarehouseState((state) => {
  try {
    getIO().volatile.emit("warehouse_updated", {
      ts: Date.now(),
      revision: Number(state?.revision || 0),
    });
  } catch (emitErr) {
    // Socket.IO might not be fully ready (e.g. in tests); skip silently.
    console.debug("[warehouse_bridge] socket not ready:", emitErr?.message);
  }
});

// Periodic tick to evaluate timed operational automations.
// Without this, automations only fire when a request arrives (e.g. if no clients are connected).
setInterval(() => {
  try {
    getRawWarehouseState();
  } catch (tickErr) {
    console.debug("[auto_tick] state tick error:", tickErr?.message);
  }
}, 60_000);

const { runTransportRoadMonitorTick, MONITOR_INTERVAL_MS } = await import("./services/transport-road-monitor.service.js");
setInterval(() => {
  runTransportRoadMonitorTick()
    .then((result) => {
      if (result?.newAlerts > 0) {
        console.log(`[road_monitor] ${result.newAlerts} alerta(s) nueva(s) en ${result.checked} envio(s)`);
      }
    })
    .catch((err) => {
      console.debug("[road_monitor] tick error:", err?.message);
    });
}, MONITOR_INTERVAL_MS);
setTimeout(() => {
  runTransportRoadMonitorTick().catch((err) => {
    console.debug("[road_monitor] initial tick error:", err?.message);
  });
}, 12_000);

const { startReunionReminderPoller } = await import("./services/reunion-reminders.service.js");
startReunionReminderPoller();

server.listen(PORT, () => {
  console.log(`COPMEC API listening on port ${PORT}`);
});
