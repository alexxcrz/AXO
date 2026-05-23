import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../src");

const BAD = [
  "\uFFFD",
  "?",
  "?",
  "?",
  "�",
  "�",
  "�",
  "pesta?",
  "contrase?",
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(jsx?|css)$/.test(name)) out.push(full);
  }
  return out;
}

const hits = [];
for (const file of walk(root)) {
  const text = fs.readFileSync(file, "utf8");
  for (const token of BAD) {
    if (text.includes(token)) hits.push({ file: path.relative(root, file), token });
  }
}

console.log(hits.length ? hits.map((h) => `${h.file} :: ${h.token}`).join("\n") : "OK: no known bad sequences");
