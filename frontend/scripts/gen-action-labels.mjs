import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "../src/utils/constantes.js"), "utf8");
const re = /\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"((?:\\.|[^"\\])*)"/g;
const labels = {};
let m;
while ((m = re.exec(src))) {
  labels[m[1]] = m[2].replace(/\\"/g, '"');
}
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\u0080-\uFFFF]/g, (c) => {
  const cp = c.codePointAt(0);
  return `\\u${cp.toString(16).padStart(4, "0")}`;
});
const lines = [
  "/** Etiquetas de acciones (UTF-8 seguro). */",
  "export const ACTION_LABELS_ES_MX = {",
  ...Object.entries(labels).map(([id, label]) => `  ${JSON.stringify(id)}: "${esc(label)}",`),
  "};",
  "",
  "export function getActionLabelEsMX(id, fallback = \"\") {",
  "  return ACTION_LABELS_ES_MX[id] || fallback || id;",
  "}",
  "",
];
fs.writeFileSync(path.join(__dirname, "../src/locale/actionLabelsEsMX.js"), lines.join("\n"), "utf8");
console.log("ok", Object.keys(labels).length);
