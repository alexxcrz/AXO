/**
 * Repara horas inicio/fin en warehouse-state.json (historial + tableros activos).
 *
 * Uso:
 *   node scripts/repair-board-history-times.mjs
 *   node scripts/repair-board-history-times.mjs --dry-run
 *   node scripts/repair-board-history-times.mjs --file backend/data/warehouse-state.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repairWarehouseBoardTimes } from "../backend/src/services/boardHistoryTimeRepair.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const defaultStatePath = path.join(rootDir, "backend/data/warehouse-state.json");
const backupDir = path.join(rootDir, "backend/data/warehouse-state-backups");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    file: defaultStatePath,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--file" && argv[i + 1]) {
      args.file = path.resolve(rootDir, argv[i + 1]);
      i += 1;
      continue;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const raw = await fs.readFile(args.file, "utf8");
  const state = JSON.parse(raw);

  const { state: repairedState, stats, changed } = repairWarehouseBoardTimes(state);

  console.log("Archivo:", args.file);
  console.log("Modo:", args.dryRun ? "simulacion (sin guardar)" : "aplicar cambios");
  console.log("---");
  console.log("Snapshots revisados:", stats.snapshotsScanned);
  console.log("Snapshots modificados:", stats.snapshotsChanged);
  console.log("Tableros activos revisados:", stats.boardsScanned);
  console.log("Tableros activos modificados:", stats.boardsChanged);
  console.log("Filas revisadas:", stats.rowsScanned);
  console.log("Filas corregidas:", stats.rowsChanged);
  console.log("Columnas hora alineadas:", stats.valuesAligned);
  console.log("ISO reconstruidos (fecha+hora):", stats.isoRebuilt);
  console.log("---");

  if (!changed) {
    console.log("No se encontraron correcciones pendientes.");
    process.exit(0);
  }

  if (args.dryRun) {
    console.log("Hay cambios por aplicar. Ejecuta sin --dry-run para guardar.");
    process.exit(0);
  }

  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `warehouse-state-before-time-repair-${timestamp()}.json`);
  await fs.writeFile(backupPath, raw, "utf8");
  await fs.writeFile(args.file, `${JSON.stringify(repairedState, null, 2)}\n`, "utf8");

  const previousPath = path.join(rootDir, "backend/data/warehouse-state.previous.json");
  await fs.writeFile(previousPath, raw, "utf8");

  console.log("Respaldo creado:", backupPath);
  console.log("Estado actualizado correctamente.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error?.message || error);
  process.exit(1);
});
