import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "../src/app/permissionRegistry.js");
let source = fs.readFileSync(target, "utf8");

source = source.replace(
  /label: "Restablecer contrase[^"]+"/,
  'label: "Restablecer contrase\\u00f1as"',
);
source = source.replace(
  /label: "PLAYERS \(ESTA P[^"]+"/,
  'label: "PLAYERS (ESTA P\\u00c1GINA)"',
);

fs.writeFileSync(target, source, "utf8");
console.log("permissionRegistry labels patched");
