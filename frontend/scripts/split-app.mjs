import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const appPath = path.join(root, "App.jsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

// ?? 1. Fix extracted module headers/exports ?????????????????????????????????
const uiPrefsPath = path.join(root, "app/uiPreferencesConfig.js");
const uiPrefsBody = fs.readFileSync(uiPrefsPath, "utf8").trim();
fs.writeFileSync(uiPrefsPath, `import { Palette, Type } from "lucide-react";
import { getInitialRouteState } from "../utils/utilidades.jsx";

${uiPrefsBody}

export {
  INITIAL_ROUTE_STATE,
  HIDDEN_BASE_TEMPLATES_KEY,
  UI_THEME_KEY,
  UI_FONT_KEY,
  UI_FONT_SIZE_KEY,
  getUserUiThemeKey,
  getUserUiFontKey,
  getUserUiFontSizeKey,
  UI_THEME_OPTIONS,
  UI_FONT_OPTIONS,
  UI_FONT_SIZE_OPTIONS,
};
`);

const catalogPath = path.join(root, "app/catalogHelpers.js");
const catalogBody = fs.readFileSync(catalogPath, "utf8").replace(/^\];\s*\n/, "").trim();
fs.writeFileSync(catalogPath, `import { normalizeCatalogScheduledDaysBySite } from "../utils/utilidades.jsx";

${catalogBody}

export {
  CATALOG_WEEKDAY_OPTIONS,
  serializeCatalogScheduledDaysBySite,
  parseCatalogScheduledDaysBySite,
  createEmptyCatalogModalState,
};
`);

const scrollPath = path.join(root, "app/horizontalScrollEnhancements.js");
const scrollBody = fs.readFileSync(scrollPath, "utf8").trim();
fs.writeFileSync(scrollPath, `${scrollBody.replace(/^function setupGlobalHorizontalScrollEnhancements/, "export function setupGlobalHorizontalScrollEnhancements")}\n`);

const pushPath = path.join(root, "app/pushHelpers.js");
const pushBody = fs.readFileSync(pushPath, "utf8").trim();
fs.writeFileSync(pushPath, `${pushBody.replace(/^function urlBase64ToUint8Array/, "export function urlBase64ToUint8Array").replace(/^function uint8ArrayEquals/, "export function uint8ArrayEquals")}\n`);

const areaPath = path.join(root, "app/areaNavigationConfig.js");
const areaBody = fs.readFileSync(areaPath, "utf8").trim();
if (!areaBody.includes("export function normalizeAreaSectionId")) {
  fs.writeFileSync(areaPath, `${areaBody.replace(/^function normalizeAreaSectionId/, "export function normalizeAreaSectionId").replace(/^function findAreaSectionByLabel/, "export function findAreaSectionByLabel")}

export {
  APP_AREA_SECTIONS,
  NAV_AREA_ACTION_BY_SECTION,
  NAV_UTILITY_ACTION_BY_GROUP,
  AREA_TAB_PERMISSION_ACTIONS,
  TRANSPORT_SECTION_ACTIONS,
  AREA_TAB_BASE_ACTIONS,
};
`);
}

// ?? 2. Extract dashboard hook (lines 2474-3626 + 5327-5370) ?????????????????
const dashStart = 2473; // 0-indexed: line 2474
const dashEnd = 3625;   // line 3626 historyPauseLogs closing
const dashPresentationStart = 5326; // dashboardResponsibleRows
const dashPresentationEnd = 5369;   // dashboardDistributionRows closing

const dashImports = `import { useEffect, useMemo } from "react";
import {
  STATUS_PENDING,
  STATUS_RUNNING,
  STATUS_PAUSED,
  STATUS_FINISHED,
  ROLE_LEAD,
  RESPONSIBLE_VISUALS,
} from "../utils/constantes.js";
import {
  normalizeAreaOption,
  normalizeCatalogArea,
  getAreaRoot,
  getUserArea,
  getNormalizedBoardVisibility,
  getActivityLabel,
  getTimeLimitMinutes,
  getElapsedSeconds,
  getLivePauseOverflowSeconds,
  getOperationalElapsedSeconds,
  getManagedUserIds,
  getBoardVisibleToUser,
  getDashboardFilterStartDate,
  getDashboardFilterEndDate,
  getDashboardPeriodKey,
  getDashboardPeriodRange,
  formatDashboardPeriodLabel,
  getDashboardPeriodTypeLabel,
  getIshikawaCategory,
  getResponsibleVisual,
} from "../utils/utilidades.jsx";

export function useDashboardMetrics({
  state,
  currentUser,
  selectedWeekId,
  selectedHistoryWeekId,
  dashboardFilters,
  setDashboardFilters,
  now,
  operationalPauseState,
  historyPauseActivityId,
}) {
`;

const dashBody1 = lines.slice(dashStart, dashEnd + 1).join("\n");
const dashBody2 = lines.slice(dashPresentationStart, dashPresentationEnd + 1).join("\n");

const dashReturn = `
  return {
    catalogMap,
    userMap,
    activeWeek,
    historyWeek,
    visibleDashboardActivities,
    completedActivities,
    dashboardVisibleControlBoards,
    dashboardVisibleBoardHistorySnapshots,
    activityPauseSummaryMap,
    dashboardRecords,
    dateFilteredDashboardRecords,
    dashboardPeriodOptions,
    dashboardEffectiveAreaFilter,
    filteredDashboardRecords,
    filteredDashboardActivities,
    filteredDashboardCompleted,
    dashboardPauseLogs,
    dashboardMetrics,
    rankingByUser,
    distributionByUser,
    activityVsLimit,
    pauseAnalysis,
    dashboardDynamicMetricRows,
    dashboardInventoryProductTimeRows,
    dashboardProductAggregateRows,
    dashboardAreaBoardDetailedRows,
    dashboardAreaRows,
    dashboardTrendRows,
    dashboardParetoRows,
    dashboardIshikawaRows,
    adminReportRows,
    historyPauseLogs,
    dashboardResponsibleRows,
    dashboardActivityRows,
    dashboardDistributionRows,
  };
}
`;

const hookPath = path.join(root, "hooks/useDashboardMetrics.js");
fs.mkdirSync(path.dirname(hookPath), { recursive: true });
fs.writeFileSync(hookPath, `${dashImports}${dashBody1}\n${dashBody2}${dashReturn}`);

// ?? 3. Patch App.jsx: remove extracted blocks, add imports ?????????????????
const importInsertAfter = '} from "./utils/utilidades.jsx";';
const newImports = `
import {
  INITIAL_ROUTE_STATE,
  HIDDEN_BASE_TEMPLATES_KEY,
  getUserUiThemeKey,
  getUserUiFontKey,
  getUserUiFontSizeKey,
  UI_THEME_OPTIONS,
  UI_FONT_OPTIONS,
  UI_FONT_SIZE_OPTIONS,
} from "./app/uiPreferencesConfig.js";
import {
  CATALOG_WEEKDAY_OPTIONS,
  serializeCatalogScheduledDaysBySite,
  parseCatalogScheduledDaysBySite,
  createEmptyCatalogModalState,
} from "./app/catalogHelpers.js";
import { setupGlobalHorizontalScrollEnhancements } from "./app/horizontalScrollEnhancements.js";
import { urlBase64ToUint8Array, uint8ArrayEquals } from "./app/pushHelpers.js";
import {
  APP_AREA_SECTIONS,
  NAV_AREA_ACTION_BY_SECTION,
  NAV_UTILITY_ACTION_BY_GROUP,
  AREA_TAB_PERMISSION_ACTIONS,
  TRANSPORT_SECTION_ACTIONS,
  AREA_TAB_BASE_ACTIONS,
  normalizeAreaSectionId,
  findAreaSectionByLabel,
} from "./app/areaNavigationConfig.js";
import { useDashboardMetrics } from "./hooks/useDashboardMetrics.js";
import { AppToastStack, AppNotificationCenter } from "./components/Notificaciones.jsx";
import { InventoryLookupInput } from "./components/BuscadorInventario.jsx";
import { io } from "socket.io-client";
import ChatPro from "./components/ChatPro.jsx";
import { AlertModalProvider } from "./components/AlertModal.jsx";
import {
  initNotificationService,
  showTransportNotification,
  showTransportNotificationForNewRecord,
  showTransportNotificationForAssignment,
  showTransportNotificationForStatusUpdate,
} from "./services/notification.service.js";
`;

let appContent = fs.readFileSync(appPath, "utf8");
if (!appContent.includes('from "./app/uiPreferencesConfig.js"')) {
  appContent = appContent.replace(importInsertAfter, `${importInsertAfter}${newImports}`);
}

// Remove lines 515-1014 (module-level constants/helpers) - 1-indexed
let appLines = appContent.split(/\r?\n/);
appLines.splice(514, 1014 - 514 + 1);
appContent = appLines.join("\n");
appLines = appContent.split(/\r?\n/);

// Find dashboard block start (catalogMap = useMemo after managedUserIds)
const catalogMapIdx = appLines.findIndex((l) => l.trim() === "const catalogMap = useMemo(() => new Map(state.catalog.map((item) => [item.id, item])), [state.catalog]);");
const historyPauseIdx = appLines.findIndex((l, i) => i > catalogMapIdx && l.trim().startsWith("const historyPauseLogs = useMemo"));

// Find dashboard presentation rows block
const respRowsIdx = appLines.findIndex((l) => l.trim() === "const dashboardResponsibleRows = useMemo(() => {");
const distRowsEndIdx = appLines.findIndex((l, i) => i > respRowsIdx && l.trim() === "}, [distributionByUser, userMap]);");

if (catalogMapIdx === -1 || historyPauseIdx === -1 || respRowsIdx === -1 || distRowsEndIdx === -1) {
  console.error("Could not find dashboard block markers", { catalogMapIdx, historyPauseIdx, respRowsIdx, distRowsEndIdx });
  process.exit(1);
}

// Replace dashboard block with hook call
const hookCall = `  const {
    catalogMap,
    userMap,
    activeWeek,
    historyWeek,
    visibleDashboardActivities,
    completedActivities,
    dashboardVisibleControlBoards,
    dashboardVisibleBoardHistorySnapshots,
    dashboardRecords,
    dateFilteredDashboardRecords,
    dashboardPeriodOptions,
    dashboardEffectiveAreaFilter,
    filteredDashboardRecords,
    filteredDashboardActivities,
    filteredDashboardCompleted,
    dashboardPauseLogs,
    dashboardMetrics,
    rankingByUser,
    distributionByUser,
    activityVsLimit,
    pauseAnalysis,
    dashboardDynamicMetricRows,
    dashboardInventoryProductTimeRows,
    dashboardProductAggregateRows,
    dashboardAreaBoardDetailedRows,
    dashboardAreaRows,
    dashboardTrendRows,
    dashboardParetoRows,
    dashboardIshikawaRows,
    adminReportRows,
    historyPauseLogs,
    dashboardResponsibleRows,
    dashboardActivityRows,
    dashboardDistributionRows,
  } = useDashboardMetrics({
    state,
    currentUser,
    selectedWeekId,
    selectedHistoryWeekId,
    dashboardFilters,
    setDashboardFilters,
    now,
    operationalPauseState,
    historyPauseActivityId,
  });`;

// Remove catalogMap through historyPauseLogs block (before visibleUsers)
const visibleUsersIdx = appLines.findIndex((l, i) => i > historyPauseIdx && l.trim() === "const visibleUsers = useMemo(() => {");
appLines.splice(catalogMapIdx, visibleUsersIdx - catalogMapIdx, hookCall);

// Re-find presentation rows after splice shifted indices
appContent = appLines.join("\n");
appLines = appContent.split(/\r?\n/);
const respRowsIdx2 = appLines.findIndex((l) => l.trim() === "const dashboardResponsibleRows = useMemo(() => {");
const distRowsEndIdx2 = appLines.findIndex((l, i) => i > respRowsIdx2 && l.trim() === "}, [distributionByUser, userMap]);");
if (respRowsIdx2 !== -1 && distRowsEndIdx2 !== -1) {
  appLines.splice(respRowsIdx2, distRowsEndIdx2 - respRowsIdx2 + 1);
}

fs.writeFileSync(appPath, appLines.join("\n"));

const newSize = fs.statSync(appPath).size;
console.log("App.jsx new size:", newSize, "bytes", "(" + Math.round(newSize / 1024) + " KB)");
console.log("Hook written:", hookPath);
