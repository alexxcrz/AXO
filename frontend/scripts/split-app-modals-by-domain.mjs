import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const appPath = path.join(root, "App.jsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

/** 1-indexed inclusive line ranges for modal blocks (content only). */
const CHUNKS = [
  {
    name: "AppPauseModals",
    ranges: [[7928, 8000], [9270, 9283]],
    imports: `import { Modal } from "../Modal";
import { formatDateTime, formatDurationClock } from "../../utils/utilidades.jsx";
`,
  },
  {
    name: "AppBoardModals",
    ranges: [[8002, 8073], [9017, 9037], [9265, 9268]],
    imports: `import { Modal } from "./Modal";
import {
  formatDurationClock,
  getElapsedSeconds,
  getOperationalElapsedSeconds,
} from "../utils/utilidades.jsx";
`,
  },
  {
    name: "AppCatalogModals",
    ranges: [[8074, 8270]],
    imports: `import { Modal } from "../Modal";
import { createEmptyCatalogModalState } from "../../app/catalogHelpers.js";
import {
  normalizeCatalogScheduledDays,
  normalizeCatalogScheduledDaysBySite,
  normalizeCatalogCleaningSites,
} from "../../utils/utilidades.jsx";
`,
  },
  {
    name: "AppUserModals",
    ranges: [[8271, 8565], [8770, 8770], [8772, 8869], [9250, 9258]],
    imports: `import { Eye, EyeOff } from "lucide-react";
import { Modal } from "./Modal";
import {
  EmployeeProfileModal,
  ForcedPasswordChangeModal,
} from "./PerfilEmpleado";
import { TEMPORARY_PASSWORD_MIN_LENGTH } from "../utils/constantes.js";
`,
  },
  {
    name: "AppBoardToolModals",
    ranges: [[8566, 8622], [8623, 8762]],
    imports: `import { Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { BoardBuilderModal, BoardComponentStudioModal } from "./ModalesConstructorTableros";
import { FORMULA_OPERATIONS } from "../utils/constantes.js";
import { createEmptyFieldDraft } from "../utils/utilidades.jsx";
`,
  },
  {
    name: "AppInventoryModals",
    ranges: [[8871, 9249], [9260, 9263]],
    imports: `import { Modal } from "./Modal";
import { InventoryActivityConsumptionEditor } from "./BarraLateral";
import {
  createInventoryModalState,
  normalizeInventoryDomain,
  inventoryDomainUsesPresentation,
  inventoryDomainUsesPackagingMetrics,
  formatDateTime,
} from "../utils/utilidades.jsx";
import { INVENTORY_DOMAIN_MAINTENANCE } from "../utils/constantes.js";
`,
  },
];

const JSX_KEYWORDS = new Set([
  "true", "false", "null", "undefined", "className", "type", "value", "key", "style", "role", "aria",
  "div", "span", "p", "strong", "small", "article", "section", "label", "select", "option",
  "input", "textarea", "button", "form", "h3", "h4", "ul", "li", "table", "thead", "tbody",
  "tr", "th", "td", "Fragment", "Suspense", "open", "title", "confirmLabel", "cancelLabel",
  "onClose", "onConfirm", "onChange", "onClick", "placeholder", "disabled", "readOnly", "autoFocus",
  "htmlFor", "id", "name", "min", "max", "step", "rows", "cols", "defaultValue", "checked",
  "hidden", "required", "multiple", "size", "width", "height", "colSpan", "rowSpan", "hideCancel",
  "confirmDisabled", "backdropClassName", "mode", "draft", "onConfirm", "catalog", "inventoryItems",
  "visibleUsers", "sectionOptions", "activityCategoryOptions", "contextoConstructor", "currentUser",
  "passwordForm", "onPasswordChange", "onSubmit", "onUpdateIdentity", "currentTheme", "themeOptions",
  "onThemeChange", "currentFont", "fontOptions", "onFontChange", "currentFontSize", "fontSizeOptions",
  "onFontSizeChange", "onLogout", "socket", "user", "connectCount", "children",
]);

const COMPONENT_NAMES = new Set([
  "Modal", "BoardBuilderModal", "BoardComponentStudioModal", "EmployeeProfileModal",
  "ForcedPasswordChangeModal", "InventoryActivityConsumptionEditor", "InventoryLookupInput",
  "ChatPro", "AlertModalProvider", "CopmecAIWidget", "Eye", "EyeOff",
]);

function extractChunk(ranges) {
  const parts = [];
  for (const [start, end] of ranges) {
    parts.push(...lines.slice(start - 1, end));
  }
  return parts.map((l) => l.replace(/^      /, "    ")).join("\n");
}

function collectIdentifiers(jsx) {
  const matches = jsx.match(/\b[A-Za-z_$][\w$]*\b/g) || [];
  return [...new Set(matches)]
    .filter((id) => !JSX_KEYWORDS.has(id) && !COMPONENT_NAMES.has(id))
    .sort((a, b) => a.localeCompare(b));
}

const outDir = path.join(root, "components", "app-modals");
fs.mkdirSync(outDir, { recursive: true });

const componentNames = [];
const allPropsByComponent = {};

for (const chunk of CHUNKS) {
  const jsx = extractChunk(chunk.ranges);
  const props = collectIdentifiers(jsx);
  allPropsByComponent[chunk.name] = props;
  componentNames.push(chunk.name);

  const propsDestruct = props.map((p) => `  ${p},`).join("\n");
  const fileContent = `${chunk.imports}
/** Modales extra�dos de App.jsx � ${chunk.name} */
export function ${chunk.name}({
${propsDestruct}
}) {
  return (
    <>
${jsx}
    </>
  );
}
`;

  fs.writeFileSync(path.join(outDir, `${chunk.name}.jsx`), fileContent);
  console.log(`Wrote ${chunk.name}.jsx (${props.length} props, ${jsx.split("\n").length} lines)`);
}

// Aggregator
const aggregatorImports = componentNames
  .map((n) => `import { ${n} } from "./app-modals/${n}.jsx";`)
  .join("\n");

const aggregatorBody = componentNames.map((n) => `      <${n} {...props} />`).join("\n");

fs.writeFileSync(
  path.join(root, "components", "AppModals.jsx"),
  `${aggregatorImports}

/** Contenedor de todos los modales de la aplicaci�n. */
export function AppModals(props) {
  return (
    <>
${aggregatorBody}
    </>
  );
}
`,
);

// Patch App.jsx: replace modal block with <AppModals ... />
const modalsStart = lines.findIndex((l, i) => i > 7900 && l.trim().startsWith("<Modal open={pauseState.open}"));
const copmecIdx = lines.findIndex((l, i) => i > modalsStart && l.trim().startsWith("<CopmecAIWidget"));

// Keep Chat block in App.jsx between modals and CopmecAIWidget
const chatStart = lines.findIndex((l) => l.includes("<AlertModalProvider>"));
const chatEnd = lines.findIndex(
  (l, i) => i > chatStart && l.trim() === ") : null}" && lines[i - 1]?.includes("ChatPro"),
);

if (modalsStart === -1 || copmecIdx === -1) {
  console.error("Markers not found", { modalsStart, copmecIdx });
  process.exit(1);
}

const allProps = [...new Set(Object.values(allPropsByComponent).flat())].sort((a, b) => a.localeCompare(b));

const modalContextLines = [
  "  const appModalContext = {",
  ...allProps.map((p) => `    ${p},`),
  "  };",
  "",
];

const replacement = ["      <AppModals {...appModalContext} />"];

const returnIdx = lines.findIndex((l, i) => i > 7000 && l.includes("warehouse-app") && lines[i - 1]?.trim() === "return (");
if (returnIdx === -1) {
  console.error("Could not find main return");
  process.exit(1);
}

const newLines = [
  ...lines.slice(0, returnIdx),
  ...modalContextLines,
  ...lines.slice(returnIdx, modalsStart),
  ...replacement,
];

// Insert chat block if it was inside extracted range
if (chatStart !== -1 && chatEnd !== -1 && chatStart >= modalsStart && chatStart < copmecIdx) {
  newLines.push(...lines.slice(chatStart, chatEnd + 1));
}

newLines.push(...lines.slice(copmecIdx));

// Add import for AppModals if missing
let appContent = newLines.join("\n");
if (!appContent.includes('from "./components/AppModals.jsx"')) {
  const notifImport = appContent.indexOf('from "./services/notification.service.js"');
  const lineEnd = appContent.indexOf("\n", notifImport);
  appContent = `${appContent.slice(0, lineEnd + 1)}import { AppModals } from "./components/AppModals.jsx";\n${appContent.slice(lineEnd + 1)}`;
}

fs.writeFileSync(appPath, appContent);

console.log("\nApp.jsx patched. Removed lines:", copmecIdx - modalsStart);
console.log("App.jsx new size:", fs.statSync(appPath).size, "bytes (", Math.round(fs.statSync(appPath).size / 1024), "KB)");
console.log("Total unique props:", allProps.length);
