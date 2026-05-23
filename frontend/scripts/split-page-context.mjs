import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const appPath = path.join(root, "App.jsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const ctxStart = lines.findIndex((l) => l.trim() === "const paginasContexto = {");
const ctxEnd = lines.findIndex((l, i) => {
  if (i <= ctxStart || l.trim() !== "};") return false;
  for (let j = i + 1; j < Math.min(i + 5, lines.length); j += 1) {
    const next = lines[j].trim();
    if (!next) continue;
    return next.includes("Socket.IO");
  }
  return false;
});

if (ctxStart === -1 || ctxEnd === -1) {
  console.error("paginasContexto block not found", { ctxStart, ctxEnd });
  process.exit(1);
}

const bodyLines = lines.slice(ctxStart + 1, ctxEnd);

function transformBodyLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//")) return line;

  const shorthand = trimmed.match(/^([A-Za-z_$][\w$]*),$/);
  if (shorthand) {
    return line.replace(shorthand[1], `${shorthand[1]}: d.${shorthand[1]}`);
  }

  return line
    .replace(/\bsetState\b/g, "d.setState")
    .replace(/\bsetLoginDirectory\b/g, "d.setLoginDirectory")
    .replace(/\bskipNextSyncRef\b/g, "d.skipNextSyncRef")
    .replace(/\bsetSyncStatus\b/g, "d.setSyncStatus")
    .replace(/\bpushAppToast\b/g, "d.pushAppToast")
    .replace(/\brequestJson\b/g, "d.requestJson")
    .replace(/\bapplyRemoteWarehouseState\b/g, "d.applyRemoteWarehouseState")
    .replace(/(?<!\.)\bstate\b/g, "d.state");
}

const convertedBody = bodyLines.map(transformBodyLine).join("\n");

const keys = [];
for (const line of bodyLines) {
  const trimmed = line.trim();
  const shorthand = trimmed.match(/^([A-Za-z_$][\w$]*),$/);
  if (shorthand) {
    keys.push(shorthand[1]);
  }
}
// Tras generar buildPageContext.js, re-leer solo claves `key: d.key` para el llamado en App.jsx

const outPath = path.join(root, "app", "buildPageContext.js");
fs.writeFileSync(
  outPath,
  `/**
 * Contexto compartido por paginas lazy-loaded (Tableros, Inventario, Dashboard, etc.).
 * Generado desde App.jsx � mantener sincronizado al agregar props al contexto.
 */
export function buildPaginasContexto(d) {
  return {
${convertedBody}
  };
}
`,
);

const builtCtx = fs.readFileSync(outPath, "utf8");
const appKeys = [];
for (const line of builtCtx.split(/\r?\n/)) {
  const m = line.match(/^\s+([A-Za-z_$][\w$]*):\s+d\.([A-Za-z_$][\w$]*),?\s*$/);
  if (m && m[1] === m[2]) appKeys.push(m[1]);
}
if (builtCtx.includes("currentInventorySupplyableItems")) appKeys.push("currentInventorySupplyableItems");
const uniqueAppKeys = [...new Set(appKeys)].sort((a, b) => a.localeCompare(b));

const buildCall = `  const paginasContexto = buildPaginasContexto({
${uniqueAppKeys.map((k) => `    ${k},`).join("\n")}
  });`;

const newLines = [
  ...lines.slice(0, ctxStart),
  buildCall,
  ...lines.slice(ctxEnd + 1),
];

let appContent = newLines.join("\n");
if (!appContent.includes('from "./app/buildPageContext.js"')) {
  const hookImport = appContent.indexOf('from "./hooks/useDashboardMetrics.js"');
  const lineEnd = appContent.indexOf("\n", hookImport);
  appContent = `${appContent.slice(0, lineEnd + 1)}import { buildPaginasContexto } from "./app/buildPageContext.js";\n${appContent.slice(lineEnd + 1)}`;
}

fs.writeFileSync(appPath, appContent);

console.log("buildPageContext.js:", fs.statSync(outPath).size, "bytes");
console.log("Keys:", keys.length);
console.log("App.jsx:", fs.statSync(appPath).size, "bytes (", Math.round(fs.statSync(appPath).size / 1024), "KB)");
