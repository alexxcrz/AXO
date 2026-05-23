import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const appPath = path.join(root, "src/App.jsx");
const originalPath = path.join(root, "tmp-original-app.jsx");

const originalLines = fs.readFileSync(originalPath, "utf8").split(/\r?\n/);
const modalsStart = originalLines.findIndex((l) => l.trim().startsWith("<Modal open={pauseState.open}"));
const modalsEnd = originalLines.findIndex(
  (l, i) => i > modalsStart && l.trim().startsWith("<CopmecAIWidget"),
);
const modalBlock = originalLines.slice(modalsStart, modalsEnd);

let appLines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

// Remove broken assignment block
const assignStart = appLines.findIndex((l) => l.trim() === "appModalsCtxRef.current = {");
const assignEnd = appLines.findIndex(
  (l, idx) => idx > assignStart && l.trim() === "};" && appLines[idx + 1]?.trim() === "",
);
if (assignStart !== -1 && assignEnd !== -1) {
  appLines.splice(assignStart, assignEnd - assignStart + 2);
}

// Remove AppModals import and ref
appLines = appLines.filter((l) => !l.includes('from "./components/AppModals.jsx"'));
appLines = appLines.filter((l) => l.trim() !== "const appModalsCtxRef = useRef({});");

// Replace AppModals tag with original modal JSX
const appModalsIdx = appLines.findIndex((l) => l.includes("<AppModals ctxRef={appModalsCtxRef} />"));
if (appModalsIdx === -1) {
  console.error("AppModals tag not found");
  process.exit(1);
}
appLines.splice(appModalsIdx, 1, ...modalBlock);

fs.writeFileSync(appPath, appLines.join("\n"));
fs.unlinkSync(originalPath);
try { fs.unlinkSync(path.join(root, "src/components/AppModals.jsx")); } catch { /* noop */ }

console.log("Restored modals inline:", modalBlock.length, "lines");
console.log("App.jsx size:", fs.statSync(appPath).size, "bytes (", Math.round(fs.statSync(appPath).size / 1024), "KB)");
