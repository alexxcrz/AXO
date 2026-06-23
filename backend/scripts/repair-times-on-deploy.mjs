/**
 * Reparación de tiempos que se ejecuta automáticamente en cada deploy/arranque.
 *
 * Corrige datos ya guardados en disco:
 *  - Alinea columnas de hora (HH:mm:ss) con startTime/endTime.
 *  - Recorta tiempos de producción imposibles en filas terminadas
 *    (accumulatedSeconds que superan el tiempo real entre inicio y fin),
 *    eliminando los valores duplicados del bug histórico de doble finalización.
 *
 * Se engancha en `npm start` (ver backend/package.json), por lo que en Render
 * corre una sola vez por deploy, antes de levantar el servidor.
 *
 * IMPORTANTE: este script NUNCA debe bloquear el arranque. Cualquier error se
 * registra y termina con código 0 para que el servidor inicie igualmente.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repairWarehouseBoardTimes } from "../src/services/boardHistoryTimeRepair.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Misma resolución de rutas que warehouse.store.js (disco persistente en Render).
const dataDirectory = process.env.RENDER ? "/var/data" : path.resolve(__dirname, "../data");
const dataFilePath = path.join(dataDirectory, "warehouse-state.json");
const backupDirectory = path.join(dataDirectory, "warehouse-state-backups");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function log(message) {
  console.log(`[repair-times-on-deploy] ${message}`);
}

function main() {
  if (!fs.existsSync(dataFilePath)) {
    log(`No existe ${dataFilePath}; nada que reparar.`);
    return;
  }

  const raw = fs.readFileSync(dataFilePath, "utf8");
  let state;
  try {
    state = JSON.parse(raw);
  } catch (error) {
    log(`Estado no es JSON válido, se omite la reparación: ${error?.message || error}`);
    return;
  }

  const { state: repairedState, stats, changed } = repairWarehouseBoardTimes(state);

  log(`Filas revisadas: ${stats.rowsScanned}, corregidas: ${stats.rowsChanged}`);
  log(`Tiempos de producción recortados (imposibles): ${stats.accumulatedCapped || 0}`);
  log(`Tiempos totales recortados: ${stats.totalOverrideCapped || 0}`);
  log(`Columnas hora alineadas: ${stats.valuesAligned}, ISO reconstruidos: ${stats.isoRebuilt}`);

  if (!changed) {
    log("No había correcciones pendientes.");
    return;
  }

  try {
    fs.mkdirSync(backupDirectory, { recursive: true });
    const backupPath = path.join(backupDirectory, `warehouse-state-before-deploy-repair-${timestamp()}.json`);
    fs.writeFileSync(backupPath, raw, "utf8");
    log(`Respaldo creado: ${backupPath}`);
  } catch (error) {
    log(`No se pudo crear el respaldo (se continúa de todos modos): ${error?.message || error}`);
  }

  const nextState = {
    ...repairedState,
    revision: Number(state?.revision || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(dataFilePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  log("Estado actualizado correctamente.");
}

try {
  main();
} catch (error) {
  // Nunca bloquear el deploy por un fallo de reparación.
  log(`Error no fatal: ${error?.message || error}`);
}

process.exit(0);
