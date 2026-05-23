import fs from "node:fs";

const lines = fs.readFileSync("tmp-original-app.jsx", "utf8").split(/\r?\n/);
const dashStart = 2473;
const dashEnd = 3625;
const dashPresentationStart = 5326;
const dashPresentationEnd = 5369;

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
    catalogByNormalizedName,
    userMap,
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

fs.writeFileSync("src/hooks/useDashboardMetrics.js", `${dashImports}${dashBody1}\n${dashBody2}${dashReturn}`);
console.log("Hook regenerated, size", fs.statSync("src/hooks/useDashboardMetrics.js").size);
