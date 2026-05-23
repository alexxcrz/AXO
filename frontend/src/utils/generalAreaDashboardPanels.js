import { APP_AREA_SECTIONS, normalizeAreaSectionId } from "../app/areaNavigationConfig.js";
import { STATUS_FINISHED } from "./constantes.js";
import { buildAreaExecutiveKpiCards } from "./areaDashboardKpis.js";
import { buildAreaDashboardSpotlights, getAreaDashboardTheme } from "./areaDashboardThemes.js";

function normalizeAreaMatch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getAreaRootLabel(areaValue) {
  return normalizeAreaMatch(String(areaValue || "").split("/")[0] || areaValue);
}

const SECTION_SCOPE_ALIASES = {
  "mejora-continua": ["mejora continua", "mejora-continua", "mejora"],
  transporte: ["transporte", "transport"],
  "recepcion-pedidos": ["recepcion de pedidos", "recepcion pedidos", "recepcion"],
  "mayoreo-comercio": ["mayoreo", "ecommerce", "e commerce", "pedidos detal", "mayoreo-telemarketing"],
};

function sectionScopeMatchers(section) {
  const scopes = Array.isArray(section?.scopes) ? section.scopes : [];
  const aliases = SECTION_SCOPE_ALIASES[section?.id] || [];
  return [...scopes, ...aliases].map((value) => normalizeAreaMatch(value)).filter(Boolean);
}

function areaLabelMatchesSection(areaLabel, section) {
  const normalizedArea = normalizeAreaMatch(areaLabel);
  if (!normalizedArea) return false;
  return sectionScopeMatchers(section).some((filter) => (
    normalizedArea === filter
    || normalizedArea.includes(filter)
    || filter.includes(normalizedArea)
  ));
}

export function recordMatchesAreaSection(record, section) {
  const filters = sectionScopeMatchers(section);
  if (!filters.length) return false;

  const scopedAreas = Array.isArray(record?.areaScopes) && record.areaScopes.length
    ? record.areaScopes
    : [record?.area];

  return scopedAreas.some((area) => {
    const root = getAreaRootLabel(area);
    return filters.some((filter) => root === filter || root.includes(filter) || filter.includes(root));
  });
}

export function itemMatchesAreaSection(item, section) {
  if (!item) return false;
  const areaValue = item.area || item.areaName || "";
  return areaLabelMatchesSection(areaValue, section);
}

export function mergeAreaSectionsForGeneralDashboard(areaNavSections = [], dynamicAreaSectionRoots = []) {
  const byId = new Map();

  APP_AREA_SECTIONS.forEach((section) => {
    byId.set(section.id, {
      id: section.id,
      label: section.label,
      scopes: Array.isArray(section.scopes) ? [...section.scopes] : [],
    });
  });

  (Array.isArray(dynamicAreaSectionRoots) ? dynamicAreaSectionRoots : []).forEach((rootArea) => {
    const root = String(rootArea || "").trim();
    if (!root) return;
    const id = normalizeAreaSectionId(root);
    if (!byId.has(id)) {
      byId.set(id, { id, label: root.toUpperCase(), scopes: [root] });
    }
  });

  (Array.isArray(areaNavSections) ? areaNavSections : []).forEach((section) => {
    if (!section?.id || section.id === "admin") return;
    const existing = byId.get(section.id) || { id: section.id, label: section.label, scopes: [] };
    byId.set(section.id, {
      ...existing,
      label: section.label || existing.label,
      scopes: Array.isArray(section.scopes) && section.scopes.length ? section.scopes : existing.scopes,
    });
  });

  return Array.from(byId.values()).filter((section) => section.id !== "admin");
}

function parseRecordDateMs(value) {
  const raw = String(value || "").trim();
  if (!raw) return Number.NaN;
  const normalized = raw.length === 10 ? `${raw}T12:00:00` : raw;
  const ms = new Date(normalized).getTime();
  return Number.isFinite(ms) ? ms : Number.NaN;
}

function recordInDateRange(record, startDate, endDate) {
  const startMs = startDate ? parseRecordDateMs(startDate) : Number.NaN;
  const endMs = endDate ? parseRecordDateMs(endDate) : Number.NaN;
  const dateMs = parseRecordDateMs(
    record?.occurredAt
    || record?.dateKey
    || record?.createdAt
    || record?.reportedAt,
  );
  if (!Number.isFinite(dateMs)) return !startDate && !endDate;
  if (Number.isFinite(startMs) && dateMs < startMs) return false;
  if (Number.isFinite(endMs) && dateMs > endMs + 86400000 - 1) return false;
  return true;
}

export function summarizeTransportForGeneralDashboard(transportRecords = [], dateFilters = {}) {
  const { startDate = "", endDate = "" } = dateFilters;
  let totalSalidas = 0;
  let totalCajas = 0;
  let totalPiezas = 0;
  const destinations = new Set();

  (Array.isArray(transportRecords) ? transportRecords : []).forEach((record) => {
    if (String(record?.status || "").trim() === "Cancelado") return;
    if (!recordInDateRange(record, startDate, endDate)) return;
    totalSalidas += 1;
    totalCajas += Math.max(0, Number(record?.boxes) || 0);
    totalPiezas += Math.max(0, Number(record?.pieces) || 0);
    const dest = String(record?.destination || "").trim();
    if (dest) destinations.add(dest);
  });

  return {
    totalSalidas,
    totalCajas,
    totalPiezas,
    totalDestinos: destinations.size,
    hasData: totalSalidas > 0,
  };
}

function getAreaRecordsForSection(section, filteredDashboardRecords, dashboardAreaRows) {
  let records = filteredDashboardRecords.filter((record) => recordMatchesAreaSection(record, section));

  if (!records.length && Array.isArray(dashboardAreaRows) && dashboardAreaRows.length) {
    const matchingAreaNames = dashboardAreaRows
      .filter((row) => areaLabelMatchesSection(row.area, section))
      .map((row) => String(row.area || "").trim())
      .filter(Boolean);

    if (matchingAreaNames.length) {
      records = filteredDashboardRecords.filter((record) => {
        const area = normalizeAreaMatch(record?.area);
        return matchingAreaNames.some((name) => {
          const normalizedName = normalizeAreaMatch(name);
          return area === normalizedName || area.includes(normalizedName) || normalizedName.includes(area);
        });
      });
    }
  }

  return records;
}

export function computeAreaMetricsFromRecords(records = []) {
  const list = Array.isArray(records) ? records : [];
  const completedRecords = list.filter((record) => record.status === STATUS_FINISHED);
  const totalSeconds = completedRecords.reduce((sum, record) => sum + Number(record.durationSeconds || 0), 0);
  const slaScoped = list.filter((record) => Number(record.limitMinutes) > 0);
  const within = slaScoped.filter((record) => record.durationSeconds <= record.limitMinutes * 60);
  const exceeded = slaScoped.filter((record) => record.durationSeconds > record.limitMinutes * 60);
  const totalPauseSeconds = list.reduce((sum, record) => sum + Number(record.pauseSeconds || 0), 0);
  const totalProductionSeconds = list.reduce((sum, record) => sum + Number(record.durationSeconds || 0), 0);
  const totalElapsedSeconds = list.reduce((sum, record) => sum + Number(record.totalElapsedSeconds || record.durationSeconds || 0), 0);

  return {
    total: list.length,
    completed: completedRecords.length,
    running: list.filter((record) => record.status === "running").length,
    paused: list.filter((record) => record.status === "paused").length,
    totalHours: totalSeconds / 3600,
    productionHours: totalProductionSeconds / 3600,
    pauseHours: totalPauseSeconds / 3600,
    pauseCount: list.reduce((sum, record) => sum + Number(record.pauseCount || 0), 0),
    withinPercent: slaScoped.length ? (within.length / slaScoped.length) * 100 : 0,
    outsidePercent: slaScoped.length ? (exceeded.length / slaScoped.length) * 100 : 0,
    exceeded,
    efficiency: totalElapsedSeconds > 0 ? (totalProductionSeconds / totalElapsedSeconds) * 100 : 100,
    areaCount: 1,
    boardCount: new Set(list.map((record) => record.boardName).filter(Boolean)).size,
  };
}

function buildPauseAnalysisForRecords(records = []) {
  const groups = new Map();
  records.forEach((record) => {
    const logs = Array.isArray(record.pauseLogEntries) ? record.pauseLogEntries : [];
    logs.forEach((log) => {
      const reason = String(log.pauseReason || log.reason || "Pausa sin motivo").trim() || "Pausa sin motivo";
      if (!groups.has(reason)) groups.set(reason, { reason, count: 0, totalSeconds: 0 });
      const entry = groups.get(reason);
      entry.count += 1;
      entry.totalSeconds += Number(log.pauseDurationSeconds || 0);
    });
  });
  const totalPauseSeconds = Array.from(groups.values()).reduce((sum, item) => sum + item.totalSeconds, 0);
  return Array.from(groups.values())
    .map((item) => ({ ...item, percent: totalPauseSeconds ? (item.totalSeconds / totalPauseSeconds) * 100 : 0 }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

function buildMetricsForSpecialSection(sectionId, baseMetrics, processAuditMetrics, transportSummary) {
  if (sectionId === "mejora-continua" && Number(processAuditMetrics?.totalAudits || 0) > 0) {
    return {
      ...baseMetrics,
      total: Number(processAuditMetrics.totalAudits || 0),
      completed: Number(processAuditMetrics.closedAuditCount || 0),
      running: Number(processAuditMetrics.openAuditCount || 0),
      paused: 0,
    };
  }

  if (sectionId === "transporte" && transportSummary?.hasData) {
    return {
      ...baseMetrics,
      total: transportSummary.totalSalidas,
      completed: transportSummary.totalSalidas,
      running: 0,
      paused: 0,
      boardCount: transportSummary.totalDestinos,
    };
  }

  return baseMetrics;
}

function resolveShareVolume(sectionId, metrics, processAuditMetrics, transportSummary) {
  if (sectionId === "transporte" && transportSummary?.hasData) {
    return transportSummary.totalSalidas;
  }
  if (sectionId === "mejora-continua" && Number(processAuditMetrics?.totalAudits || 0) > 0) {
    return Number(processAuditMetrics.totalAudits || 0);
  }
  return metrics.total;
}

function resolveHasActivity(sectionId, metrics, processAuditMetrics, transportSummary, boardRows) {
  if (sectionId === "mejora-continua") {
    return Number(processAuditMetrics?.totalAudits || 0) > 0 || metrics.total > 0 || boardRows.length > 0;
  }
  if (sectionId === "transporte") {
    return Boolean(transportSummary?.hasData) || metrics.total > 0 || boardRows.length > 0;
  }
  return metrics.total > 0 || boardRows.length > 0;
}

/**
 * Paneles del dashboard general: todas las areas con KPIs propios.
 */
export function buildGeneralAreaDashboardPanels({
  areaNavSections = [],
  dynamicAreaSectionRoots = [],
  filteredDashboardRecords = [],
  dashboardAreaRows = [],
  dashboardBoardInsightRows = [],
  dashboardInventoryProductTimeRows = [],
  dashboardResponsibleRows = [],
  dashboardPalletLeaderboardRows = [],
  processAuditMetrics = {},
  globalPeriodMetrics = {},
  transportRecords = [],
  dashboardDateFilters = {},
}) {
  const sections = mergeAreaSectionsForGeneralDashboard(areaNavSections, dynamicAreaSectionRoots);
  const transportSummary = summarizeTransportForGeneralDashboard(transportRecords, dashboardDateFilters);

  return sections
    .map((section) => {
      const theme = getAreaDashboardTheme(section.id);
      const areaRecords = getAreaRecordsForSection(section, filteredDashboardRecords, dashboardAreaRows);
      const baseMetrics = computeAreaMetricsFromRecords(areaRecords);
      const metrics = buildMetricsForSpecialSection(section.id, baseMetrics, processAuditMetrics, transportSummary);
      const boardRows = dashboardBoardInsightRows.filter((board) => itemMatchesAreaSection(board, section));
      const inventoryRows = dashboardInventoryProductTimeRows.filter((row) => itemMatchesAreaSection(row, section));
      const palletRows = dashboardPalletLeaderboardRows.filter((row) => itemMatchesAreaSection(row, section));
      const pauseAnalysis = buildPauseAnalysisForRecords(areaRecords);
      const areaResponsibleIds = new Set(areaRecords.map((record) => record.responsibleId).filter(Boolean));
      const areaResponsibleRows = (Array.isArray(dashboardResponsibleRows) ? dashboardResponsibleRows : [])
        .filter((row) => areaResponsibleIds.has(row.responsibleId));

      const shareVolume = resolveShareVolume(section.id, metrics, processAuditMetrics, transportSummary);
      const sharePercent = globalPeriodMetrics.total > 0
        ? Math.round((shareVolume / globalPeriodMetrics.total) * 100)
        : (shareVolume > 0 ? 100 : 0);

      const kpiCards = buildAreaExecutiveKpiCards(section.id, {
        metrics,
        boardRows,
        inventoryRows,
        mermaRows: [],
        pauseAnalysis,
        palletRows,
        responsibleRows: areaResponsibleRows,
        auditMetrics: processAuditMetrics,
        transportSummary,
      });

      const spotlights = buildAreaDashboardSpotlights(theme, metrics, {
        boards: boardRows.length,
        players: areaResponsibleRows.length,
        slaPercent: Math.round(metrics.withinPercent || 0),
        hours: `${(metrics.productionHours ?? metrics.totalHours ?? 0).toFixed(1)} h`,
        inventorySkus: new Set(inventoryRows.map((row) => row.productKey || row.productValue).filter(Boolean)).size,
        mermaRows: 0,
        pauseCauses: pauseAnalysis.length,
        running: metrics.running,
        paused: metrics.paused,
      });

      const hasActivity = resolveHasActivity(section.id, metrics, processAuditMetrics, transportSummary, boardRows);
      const dataSourceNote = section.id === "transporte" && transportSummary.hasData && !baseMetrics.total
        ? "Datos del modulo de Transporte (salidas, cajas y piezas)."
        : section.id === "mejora-continua" && Number(processAuditMetrics?.totalAudits || 0) > 0 && !baseMetrics.total
          ? "Datos del ciclo de auditorias (Mejora Continua)."
          : null;

      return {
        section,
        theme,
        metrics,
        sharePercent,
        kpiCards,
        spotlights,
        boardRows,
        hasActivity,
        dataSourceNote,
        transportSummary: section.id === "transporte" ? transportSummary : null,
        themeStyle: {
          "--dash-accent": theme.accent,
          "--dash-accent-soft": theme.accentSoft,
          "--dash-accent-border": theme.accentBorder,
        },
      };
    })
    .sort((left, right) => {
      if (right.hasActivity !== left.hasActivity) return right.hasActivity ? 1 : -1;
      return resolveShareVolume(right.section.id, right.metrics, processAuditMetrics, transportSummary)
        - resolveShareVolume(left.section.id, left.metrics, processAuditMetrics, transportSummary)
        || left.section.label.localeCompare(right.section.label, "es-MX");
    });
}
