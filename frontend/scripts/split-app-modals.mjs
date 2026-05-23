import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const appPath = path.join(root, "App.jsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const modalsStart = lines.findIndex(
  (l, i) => i > 7000 && l.trim().startsWith("<Modal open={pauseState.open}"),
);
const modalsEnd = lines.findIndex(
  (l, i) => i > modalsStart && l.trim().startsWith("<CopmecAIWidget"),
);
if (modalsStart === -1 || modalsEnd === -1) {
  console.error("Could not find modals block", { modalsStart, modalsEnd });
  process.exit(1);
}

const modalJsxRaw = lines
  .slice(modalsStart, modalsEnd)
  .map((l) => l.replace(/^      /, "    "))
  .join("\n");

const jsxKeywords = new Set([
  "true", "false", "null", "undefined", "className", "type", "value", "key", "style", "role", "aria",
  "div", "span", "p", "strong", "small", "article", "section", "label", "select", "option",
  "input", "textarea", "button", "form", "h3", "h4", "ul", "li", "table", "thead", "tbody",
  "tr", "th", "td", "Fragment", "Suspense", "open", "title", "confirmLabel", "cancelLabel",
  "onClose", "onConfirm", "onChange", "onClick", "placeholder", "disabled", "readOnly", "autoFocus",
  "htmlFor", "id", "name", "min", "max", "step", "rows", "cols", "defaultValue", "checked",
  "hidden", "required", "multiple", "size", "width", "height", "colSpan", "rowSpan",
]);

const componentNames = new Set([
  "Modal", "BoardBuilderModal", "BoardComponentStudioModal", "EmployeeProfileModal",
  "ForcedPasswordChangeModal", "InventoryActivityConsumptionEditor", "InventoryLookupInput",
]);

const identifierMatches = modalJsxRaw.match(/\b[A-Za-z_$][\w$]*\b/g) || [];
const modalIdentifiers = [...new Set(identifierMatches)]
  .filter((id) => !jsxKeywords.has(id) && !componentNames.has(id))
  .sort((a, b) => b.length - a.length);

let modalJsx = modalJsxRaw;
for (const id of modalIdentifiers) {
  modalJsx = modalJsx.replace(new RegExp(`\\b${id.replace(/[$]/g, "\\$&")}\\b`, "g"), `ctx.${id}`);
}

fs.writeFileSync(
  path.join(root, "components/AppModals.jsx"),
  `import { Modal } from "./Modal";
import { BoardBuilderModal, BoardComponentStudioModal } from "./ModalesConstructorTableros";
import {
  EmployeeProfileModal,
  ForcedPasswordChangeModal,
} from "./PerfilEmpleado";
import { InventoryActivityConsumptionEditor } from "./BarraLateral";
import { InventoryLookupInput } from "./BuscadorInventario";

export function AppModals({ ctxRef }) {
  const ctx = ctxRef.current;
  return (
    <>
${modalJsx}
    </>
  );
}
`,
);

const appImport = 'import { AppModals } from "./components/AppModals.jsx";';
let appLines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);
if (!appLines.some((l) => l.includes('from "./components/AppModals.jsx"'))) {
  const notificationImportIdx = appLines.findIndex((l) => l.includes('from "./services/notification.service.js"'));
  appLines.splice(notificationImportIdx + 1, 0, appImport);
}

const socketRefIdx = appLines.findIndex((l) => l.trim() === "const socketRef = useRef(null);");
if (socketRefIdx !== -1 && !appLines.some((l) => l.includes("appModalsCtxRef"))) {
  appLines.splice(socketRefIdx + 1, 0, "  const appModalsCtxRef = useRef({});");
}

const modalsStart2 = appLines.findIndex(
  (l, i) => i > 7000 && l.trim().startsWith("<Modal open={pauseState.open}"),
);
const modalsEnd2 = appLines.findIndex(
  (l, i) => i > modalsStart2 && l.trim().startsWith("<CopmecAIWidget"),
);

const assignmentLines = [
  "  appModalsCtxRef.current = {",
  ...modalIdentifiers.map((k) => `    ${k},`),
  "  };",
  "",
];

const returnIdx = appLines.findIndex((l, i) => i > modalsStart2 && l.trim() === "return (");
if (returnIdx === -1) {
  console.error("Could not find main return");
  process.exit(1);
}

appLines.splice(returnIdx, 0, ...assignmentLines);
const modalsStart3 = appLines.findIndex(
  (l, i) => i > 7000 && l.trim().startsWith("<Modal open={pauseState.open}"),
);
const modalsEnd3 = appLines.findIndex(
  (l, i) => i > modalsStart3 && l.trim().startsWith("<CopmecAIWidget"),
);
appLines.splice(modalsStart3, modalsEnd3 - modalsStart3, "      <AppModals ctxRef={appModalsCtxRef} />");

fs.writeFileSync(appPath, appLines.join("\n"));

console.log("AppModals identifiers:", modalIdentifiers.length);
console.log("AppModals lines extracted:", modalsEnd - modalsStart);
console.log("App.jsx new size:", fs.statSync(appPath).size, "bytes (", Math.round(fs.statSync(appPath).size / 1024), "KB)");
