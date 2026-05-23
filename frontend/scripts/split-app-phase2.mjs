import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const appPath = path.join(root, "App.jsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const ctxStart = lines.findIndex((l) => l.trim() === "const paginasContexto = {");
const ctxEnd = lines.findIndex((l, i) => {
  if (i <= ctxStart || l.trim() !== "};") return false;
  for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
    const next = lines[j].trim();
    if (!next) continue;
    return next.startsWith("// Socket.IO");
  }
  return false;
});
if (ctxStart === -1 || ctxEnd === -1) {
  console.error("Could not find paginasContexto block", { ctxStart, ctxEnd });
  process.exit(1);
}

const ctxLines = lines.slice(ctxStart + 1, ctxEnd);
const converted = ctxLines
  .map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) return line;
    const shorthand = trimmed.match(/^([A-Za-z_$][\w$]*),$/);
    if (shorthand) return line.replace(shorthand[1], `${shorthand[1]}: d.${shorthand[1]}`);
    return line
      .replace(/\bsetState\b/g, "d.setState")
      .replace(/\bsetLoginDirectory\b/g, "d.setLoginDirectory")
      .replace(/\bskipNextSyncRef\b/g, "d.skipNextSyncRef")
      .replace(/\bsetSyncStatus\b/g, "d.setSyncStatus")
      .replace(/\bpushAppToast\b/g, "d.pushAppToast")
      .replace(/\brequestJson\b/g, "d.requestJson")
      .replace(/\bapplyRemoteWarehouseState\b/g, "d.applyRemoteWarehouseState")
      .replace(/\bstate\b/g, "d.state");
  })
  .join("\n");

fs.writeFileSync(
  path.join(root, "app/buildPageContext.js"),
  `/** Contexto compartido por paginas lazy-loaded. */
export function buildPaginasContexto(d) {
  return {
${converted}
  };
}
`,
);

const modalsStart = lines.findIndex(
  (l, i) => i > 7800 && l.trim().startsWith("<Modal open={pauseState.open}"),
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
  "true", "false", "null", "undefined", "className", "type", "value", "key", "style",
  "div", "span", "p", "strong", "small", "article", "section", "label", "select", "option",
  "input", "textarea", "button", "form", "h3", "h4", "ul", "li", "table", "thead", "tbody",
  "tr", "th", "td", "Fragment", "Suspense",
]);

const identifierMatches = modalJsxRaw.match(/\b[A-Za-z_$][\w$]*\b/g) || [];
const modalIdentifiers = [...new Set(identifierMatches)]
  .filter((id) => !jsxKeywords.has(id) && id !== "Modal" && id !== "BoardBuilderModal" && id !== "BoardComponentStudioModal"
    && id !== "EmployeeProfileModal" && id !== "ForcedPasswordChangeModal" && id !== "InventoryActivityConsumptionEditor"
    && id !== "InventoryLookupInput" && id !== "formatDate" && id !== "formatDateTime" && id !== "formatDurationClock")
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
import {
  formatDate,
  formatDateTime,
  formatDurationClock,
} from "../utils/utilidades.jsx";

export function AppModals({ ctx }) {
  return (
    <>
${modalJsx}
    </>
  );
}
`,
);

// Replace paginasContexto block with buildPaginasContexto call
const ctxKeys = ctxLines
  .map((line) => {
    const m = line.trim().match(/^([A-Za-z_$][\w$]*),$/);
    return m ? m[1] : null;
  })
  .filter(Boolean);

const buildCall = `  const paginasContexto = buildPaginasContexto({
${ctxKeys.map((k) => `    ${k},`).join("\n")}
  });`;

const newLines = [...lines.slice(0, ctxStart), buildCall, ...lines.slice(ctxEnd + 1)];
let appLines = newLines;

// Replace modals block with <AppModals ctx={modalsCtx} />
const modalsStart2 = appLines.findIndex(
  (l, i) => i > 7800 && l.trim().startsWith("<Modal open={pauseState.open}"),
);
const modalsEnd2 = appLines.findIndex(
  (l, i) => i > modalsStart2 && l.trim().startsWith("<CopmecAIWidget"),
);

const modalsCtxKeys = [
  "pauseState", "setPauseState", "pauseContinueTimerRef", "handleConfirmPause",
  "pauseReasonOptions", "CUSTOM_PAUSE_REASON_VALUE",
  "boardPauseState", "setBoardPauseState", "boardPauseContinueTimerRef", "handleConfirmBoardPause",
  "boardPauseIsOutOfTime", "boardPauseOvertimeSeconds", "boardPauseRemainingSeconds",
  "finishBoardRowState", "setFinishBoardRowState", "confirmFinishBoardRow",
  "deleteBoardRowState", "setDeleteBoardRowState", "confirmDeleteBoardRow",
  "boardRuntimeFeedback", "setBoardRuntimeFeedback",
  "profileModalOpen", "setProfileModalOpen", "profileForm", "setProfileForm", "profileSaving", "profileError",
  "submitProfileForm", "forcedPasswordChangeOpen", "forcedPasswordForm", "setForcedPasswordForm",
  "forcedPasswordError", "submitForcedPasswordChange",
  "catalogModal", "setCatalogModal", "submitCatalogModal", "CATALOG_WEEKDAY_OPTIONS",
  "serializeCatalogScheduledDaysBySite", "parseCatalogScheduledDaysBySite",
  "userModal", "setUserModal", "submitUserModal", "creatableRoles", "departmentOptions",
  "inventoryModal", "setInventoryModal", "submitInventoryModal", "inventoryDomainUsesPresentation",
  "inventoryDomainUsesPackagingMetrics", "getInventoryPresentationLabel", "getInventoryPresentationPlaceholder",
  "getInventoryUnitPlaceholder", "getInventoryStoragePlaceholder", "inventorySavedLocationsByDomain",
  "inventoryModalLotOptions", "inventoryModalExpiryOptions", "inventoryModalLabelOptions",
  "inventoryMovementModal", "setInventoryMovementModal", "submitInventoryMovementModal",
  "inventoryTransferConfirmModal", "setInventoryTransferConfirmModal", "submitInventoryTransferConfirm",
  "inventoryRestockModal", "setInventoryRestockModal", "submitInventoryRestockModal",
  "inventoryBulkRestockModal", "setInventoryBulkRestockModal", "submitInventoryBulkRestockModal",
  "inventoryDestinationModal", "closeInventoryDestinationModal", "submitInventoryDestinationModal",
  "inventoryTransferViewer", "setInventoryTransferViewer", "viewedOrderInventoryTransferMovements",
  "shouldShowTransferRemainingUnits", "formatDateTime",
  "controlBoardDraft", "setControlBoardDraft", "boardSectionOptions", "activityCatalogCategoryOptions",
  "contextoConstructor", "submitControlBoardDraft", "boardBuilderModalOpen", "setBoardBuilderModalOpen",
  "boardComponentStudioModalOpen", "setBoardComponentStudioModalOpen",
  "deleteUserId", "setDeleteUserId", "deleteUser",
  "transferLeadTargetId", "setTransferLeadTargetId", "transferLead", "state",
  "deleteInventoryId", "setDeleteInventoryId", "deleteInventoryItem",
  "deleteBoardId", "setDeleteBoardId", "deleteControlBoard",
  "historyPauseActivityId", "setHistoryPauseActivityId", "historyPauseLogs",
  "formatDurationClock", "buildSelectOptions", "EXCEL_FUNCTION_DESCRIPTIONS", "FORMULA_MEMORY_LS_KEY",
  "loadFormulasMemory", "saveFormulaToMemory", "evaluateFormulaFieldValue", "getNormalizedFormulaTerms",
  "mergeInventoryColumnsWithSystem", "InventoryActivityConsumptionEditor",
];

const modalsReplacement = `      <AppModals ctx={{
${[...new Set(modalIdentifiers)].map((k) => `        ${k},`).join("\n")}
      }} />`;

appLines.splice(modalsStart2, modalsEnd2 - modalsStart2, modalsReplacement);
fs.writeFileSync(appPath, appLines.join("\n"));

console.log("buildPageContext lines:", ctxEnd - ctxStart);
console.log("AppModals lines:", modalsEnd - modalsStart);
console.log("App.jsx new size:", fs.statSync(appPath).size, "bytes");
