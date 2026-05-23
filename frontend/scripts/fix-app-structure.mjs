import fs from "node:fs";

const appPath = "src/App.jsx";
let lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const returnBad = lines.findIndex(
  (l, i) => l.trim() === "return (" && lines[i + 1]?.trim().startsWith("const appModalContext"),
);
const mainLine = lines.findIndex((l) => l.trim().startsWith("<main className={`warehouse-app"));
if (returnBad === -1 || mainLine === -1) {
  console.error("markers", returnBad, mainLine);
  process.exit(1);
}
lines.splice(returnBad, mainLine - returnBad);

const modals = fs.readFileSync("tmp-modals.txt", "utf8").split(/\r?\n/);
const copmecIdx = lines.findIndex((l, i) => i > 7000 && l.trim().startsWith("<CopmecAIWidget"));
if (copmecIdx === -1) {
  console.error("copmec not found");
  process.exit(1);
}
lines.splice(copmecIdx, 0, ...modals);

lines = lines.filter((l) => !l.includes('from "./components/AppModals.jsx"'));

const mainIdx2 = lines.findIndex((l) => l.trim().startsWith("<main className={`warehouse-app"));
if (lines[mainIdx2 - 1]?.trim() !== "return (") {
  lines.splice(mainIdx2, 0, "  return (");
}

fs.writeFileSync(appPath, lines.join("\n"));
try {
  fs.unlinkSync("tmp-modals.txt");
} catch {
  /* noop */
}

console.log("Fixed App.jsx structure, lines", lines.length);
