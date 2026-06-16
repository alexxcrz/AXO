
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DASHBOARD_WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const DASHBOARD_DETAIL_VIEW_PREFS_KEY = "copmec-dashboard-detail-view-prefs";

function parseDashboardDate(value) {
  if (!value) return null;
  const next = new Date(`${value}T00:00:00`);
  return Number.isNaN(next.getTime()) ? null : next;
}

function formatDashboardDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDashboardDateLabel(date) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function isSameDashboardDay(left, right) {
  return Boolean(left && right)
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function buildDashboardCalendarDays(monthDate) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(gridStart);
    next.setDate(gridStart.getDate() + index);
    return next;
  });
}

function getDashboardDatePopoverStyle(triggerElement) {
  if (!triggerElement) return null;

  const rect = triggerElement.getBoundingClientRect();
  const viewportWidth = globalThis.innerWidth;
  const viewportHeight = globalThis.innerHeight;
  const gap = 8;
  const minWidth = 332;
  const maxWidth = viewportWidth - 16;
  const width = Math.min(Math.max(rect.width, minWidth), maxWidth);
  const left = Math.min(Math.max(8, rect.left), Math.max(8, viewportWidth - width - 8));
  const estimatedHeight = 360;
  const openUpwards = rect.bottom + gap + estimatedHeight > viewportHeight && rect.top > estimatedHeight;
  const top = openUpwards ? Math.max(8, rect.top - gap - estimatedHeight) : rect.bottom + gap;

  return {
    position: "fixed",
    top,
    left,
    width,
    zIndex: 80,
  };
}

import { formatMinutesToHourMinute, formatTime, getDashboardPeriodKey, normalizeBoardMultiSelectDetailValue, resolveDashboardInventoryRowMetrics } from "../utils/utilidades";
import { createDashboardPdfContext, DASHBOARD_PDF_THEME, getDashboardPdfAreaAccent, getDashboardPdfBoardAccent } from "../utils/dashboardPdfTheme";
import {
  appendGeneralAreaPanelsToPdf,
  buildDashboardPdfFileName,
  exportAreaPanelDashboardPdf,
  kpiCardsToPdfGridItems,
  spotlightsToPdfTableBody,
} from "../utils/dashboardPdfExport";
import {
  buildAreaDashboardSpotlights,
  getAreaDashboardTheme,
  getAreaDashboardZoneWrapClass,
} from "../utils/areaDashboardThemes";
import { buildAreaBridgeKpiCards, buildAreaExecutiveKpiCards } from "../utils/areaDashboardKpis";
import { navigateToAreaDashboard } from "../utils/areaDashboardNavigation";
import {
  buildGeneralAreaDashboardPanels,
  mergeAreaSectionsForGeneralDashboard,
  summarizeTransportForGeneralDashboard,
} from "../utils/generalAreaDashboardPanels";
import { getAreaDashboardSections } from "../utils/areaDashboardThemes";
import { PAGE_CUSTOM_BOARDS, STATUS_FINISHED, STATUS_PAUSED, STATUS_RUNNING } from "../utils/constantes";
import { formatDurationClock } from "../utils/utilidades.jsx";
import {
  buildBoardNavigationFocusFromDashboardRecord,
  pauseReasonsMatch,
} from "../utils/boardNavigationFocus.js";
import { DashboardRecordStatusCell, formatDashboardRecordStatusSummary } from "../components/ComponentesDashboard";
import "./PanelIndicadores.css";

function DashboardDateRangePicker({ startDate, endDate, onChange }) {
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDashboardDate(startDate) || parseDashboardDate(endDate) || new Date());
  const [draftStartDate, setDraftStartDate] = useState(startDate || "");
  const [draftEndDate, setDraftEndDate] = useState(endDate || "");
  const [popoverStyle, setPopoverStyle] = useState(null);

  const start = parseDashboardDate(startDate);
  const end = parseDashboardDate(endDate);
  const draftStart = parseDashboardDate(draftStartDate);
  const draftEnd = parseDashboardDate(draftEndDate);
  const calendarDays = buildDashboardCalendarDays(visibleMonth);
  const monthLabel = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(visibleMonth);
  const buttonLabel = start && end
    ? `${formatDashboardDateLabel(start)} - ${formatDashboardDateLabel(end)}`
    : start
      ? `${formatDashboardDateLabel(start)} - Selecciona fin`
      : "Seleccionar rango de fechas";

  const applyDraftAndClose = useCallback(() => {
    onChange({ startDate: draftStartDate, endDate: draftEndDate });
    setIsOpen(false);
  }, [draftEndDate, draftStartDate, onChange]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      const clickedTrigger = pickerRef.current?.contains(event.target);
      const clickedPopover = popoverRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedPopover) {
        applyDraftAndClose();
      }
    }

    globalThis.addEventListener("pointerdown", handlePointerDown);
    return () => globalThis.removeEventListener("pointerdown", handlePointerDown);
  }, [applyDraftAndClose, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function updatePopoverPosition() {
      setPopoverStyle(getDashboardDatePopoverStyle(triggerRef.current));
    }

    updatePopoverPosition();
    globalThis.addEventListener("resize", updatePopoverPosition, { passive: true });
    globalThis.addEventListener("scroll", updatePopoverPosition, { capture: true, passive: true });
    return () => {
      globalThis.removeEventListener("resize", updatePopoverPosition);
      globalThis.removeEventListener("scroll", updatePopoverPosition, { capture: true });
    };
  }, [isOpen]);

  function handleDaySelection(day) {
    const selectedValue = formatDashboardDateValue(day);
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStartDate(selectedValue);
      setDraftEndDate("");
      return;
    }

    if (day.getTime() < draftStart.getTime()) {
      setDraftStartDate(selectedValue);
      setDraftEndDate(formatDashboardDateValue(draftStart));
      return;
    }

    setDraftEndDate(selectedValue);
  }

  return (
    <div ref={pickerRef} className="dashboard-date-range-shell">
      <button
        ref={triggerRef}
        type="button"
        className={`dashboard-date-range-trigger ${isOpen ? "open" : ""}`}
        onClick={() => {
          setIsOpen((current) => {
            if (current) return false;
            setDraftStartDate(startDate || "");
            setDraftEndDate(endDate || "");
            return true;
          });
        }}
      >
        <span>{buttonLabel}</span>
        <small>{startDate || endDate ? "Rango activo" : "Sin filtro por fecha"}</small>
      </button>
      {isOpen && popoverStyle ? createPortal(
        <div ref={popoverRef} className="dashboard-date-range-popover" style={popoverStyle}>
          <div className="dashboard-date-range-header">
            <button type="button" className="icon-button" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>{"<"}</button>
            <strong>{monthLabel}</strong>
            <button type="button" className="icon-button" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>{">"}</button>
          </div>
          <div className="dashboard-date-range-weekdays">
            {DASHBOARD_WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
          </div>
          <div className="dashboard-date-range-grid">
            {calendarDays.map((day) => {
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelectedStart = isSameDashboardDay(day, draftStart);
              const isSelectedEnd = isSameDashboardDay(day, draftEnd);
              const isInRange = draftStart && draftEnd && day.getTime() > draftStart.getTime() && day.getTime() < draftEnd.getTime();
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`dashboard-date-cell ${isCurrentMonth ? "" : "muted"} ${isSelectedStart || isSelectedEnd ? "selected" : ""} ${isInRange ? "in-range" : ""}`.trim()}
                  onClick={() => handleDaySelection(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="dashboard-date-range-footer">
            <button type="button" className="icon-button" onClick={() => { setDraftStartDate(""); setDraftEndDate(""); }}>Limpiar</button>
            <button type="button" className="icon-button" onClick={applyDraftAndClose}>Confirmar</button>
            <button type="button" className="icon-button" onClick={applyDraftAndClose}>Cerrar</button>
          </div>
        </div>,
        globalThis.document.body,
      ) : null}
    </div>
  );
}

export default function PanelIndicadores({ contexto }) {
  const {
    setDashboardSectionsOpen,
    dashboardFilters,
    setDashboardFilters,
    visibleUsers,
    inventoryItemsById,
    departmentOptions,
    DashboardSection,
    dashboardMetrics,
    Gauge,
    DashboardKpiCard,
    DashboardKpiBento,
    ClipboardList,
    CircleCheckBig,
    Play,
    PauseCircle,
    formatMetricNumber,
    Clock3,
    CalendarDays,
    AlertTriangle,
    Pause,
    OctagonAlert,
    Users,
    dashboardSectionsOpen,
    dashboardResponsibleRows,
    DashboardBarRow,
    DashboardRankItem,
    getResponsibleVisual,
    dashboardActivityRows,
    dashboardActivitySlaSummaryRows,
    dashboardCatalogFrequencyRows,
    dashboardCatalogTypeRows,
    dashboardDynamicMetricRows,
    dashboardAreaBoardDetailedRows,
    dashboardInventoryProductTimeRows,
    dashboardPalletLeaderboardRows,
    dashboardProductPerformanceRows,
    dashboardProductAggregateRows,
    dashboardBoardInsightRows,
    dashboardBoardKpiCards,
    processAuditMetrics,
    dateFilteredDashboardRecords,
    dashboardRecords,
    areaNavSections,
    dynamicAreaSectionRoots,
    transportRecords,
    PAGE_DASHBOARD,
    PAGE_PROCESS_AUDITS,
    PAGE_TRANSPORT,
    setPage,
    setSelectedAreaSectionId,
    setNavTransportSection,
    setAuditShortcutPreset,
    DashboardProgressMetric,
    PieChart,
    dashboardDistributionRows,
    DashboardPieChart,
    dashboardTrendRows,
    dashboardAreaRows,
    BarChart3,
    DashboardColumnChart,
    DashboardLineChart,
    Search,
    dashboardParetoRows,
    DashboardParetoChart,
    DashboardParetoRow,
    dashboardIshikawaRows,
    DashboardIshikawaDiagram,
    DashboardCauseCard,
    pauseAnalysis,
    formatMinutes,
    formatPercent,
    getActivityFrequencyLabel,
    Download,
    RotateCcw,
    hardResetDashboard,
    canManageDashboardState,
    canManageDashboardControls,
    canExportDashboardData,
    isDemoMode,
    activateDemoMode,
    deactivateDemoMode,
    pushAppToast,
    getBoardFieldValue,
    filteredDashboardRecords,
    filteredVisibleControlBoards,
    dashboardVisibleControlBoards: rawDashboardVisibleControlBoards,
    selectedAreaSectionId,
    selectedAreaSection,
    Zap,
    dashboardPauseLogs,
    setSelectedCustomBoardId,
    setSelectedCustomBoardViewId,
    setSelectedCustomBoardRowId,
    navigateToBoardFocus,
    state,
  } = contexto;

  const catalogAutoLimitUpdates = useMemo(() => {
    const updates = state?.catalogAutoLimits?.updates;
    return Array.isArray(updates) ? updates : [];
  }, [state?.catalogAutoLimits?.updates]);

  const dashboardVisibleControlBoards = useMemo(
    () => rawDashboardVisibleControlBoards ?? filteredVisibleControlBoards ?? [],
    [rawDashboardVisibleControlBoards, filteredVisibleControlBoards],
  );

  const canManageDashboardActions = Boolean(canManageDashboardControls ?? canManageDashboardState);
  const canExportDashboardActions = Boolean(canExportDashboardData ?? true);
  const showGlobalAreaFilter = selectedAreaSectionId === "all" || selectedAreaSectionId === "admin";
  const dashboardAreaOptions = useMemo(() => {
    const options = Array.from(new Set((Array.isArray(departmentOptions) ? departmentOptions : [])
      .map((area) => String(area || "").trim())
      .filter(Boolean)
      .filter((area) => area.toLowerCase() !== "general")));
    return [{ value: "all", label: "Todas las áreas" }].concat(
      options.sort((left, right) => left.localeCompare(right, "es-MX")).map((area) => ({ value: area, label: area })),
    );
  }, [departmentOptions]);

  const visibleDashboardSections = useMemo(
    () => new Set(["executive", "players", "alerts", "merma", "trends", "inventory", "causes"]),
    [],
  );

  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseModalData, setPauseModalData] = useState(null);
  const [liveOperationalAlertsModalOpen, setLiveOperationalAlertsModalOpen] = useState(false);

  function resolvePauseLogsForBoardReason(board, reasonEntry) {
    const records = (filteredDashboardRecords || []).filter((record) => {
      if (record.source !== "board") return false;
      const sameBoard = board?.boardId
        ? String(record.boardId) === String(board.boardId)
        : String(record.boardName || "") === String(board.boardName || "");
      if (!sameBoard) return false;
      const logs = Array.isArray(record.pauseLogEntries) ? record.pauseLogEntries : [];
      if (logs.length) {
        return logs.some((log) => pauseReasonsMatch(log.reason, reasonEntry?.reason));
      }
      const reasons = Array.isArray(record.pauseReasons) ? record.pauseReasons : [];
      return reasons.some((reason) => pauseReasonsMatch(reason, reasonEntry?.reason));
    });

    const logs = records.flatMap((record) => (
      (Array.isArray(record.pauseLogEntries) ? record.pauseLogEntries : [])
        .filter((log) => pauseReasonsMatch(log.reason, reasonEntry?.reason))
        .map((log) => ({
          ...log,
          activityLabel: log.activityLabel || record.label || record.boardName || "",
          sourceRecord: record,
        }))
    ));

    return { records, logs };
  }

  function openPauseDetailsForReason(board, reasonEntry) {
    const { records, logs } = resolvePauseLogsForBoardReason(board, reasonEntry);
    setPauseModalData({ board, reasonEntry, logs, records });
    setPauseModalOpen(true);
  }

  function goToBoardFromDashboardRecord(record, options = {}) {
    const isLiveBoardRecord = record?.source === "board"
      && !String(record?.id || "").startsWith("board-history-");
    const focus = buildBoardNavigationFocusFromDashboardRecord(record, {
      ...options,
      boardViewId: isLiveBoardRecord ? "current" : options.boardViewId,
      revealRow: options.revealRow !== false && Boolean(options.rowId || record?.rowId),
    });
    if (!focus?.boardId) {
      pushAppToast?.("No se pudo ubicar el tablero de esta actividad.", "warning");
      return;
    }
    navigateToBoardFocus?.({
      ...focus,
      boardViewId: isLiveBoardRecord ? "current" : focus.boardViewId,
      revealRow: Boolean(focus.rowId),
      openPauseDetails: Boolean(options.openPauseDetails || record?.status === STATUS_PAUSED),
    });
    setLiveOperationalAlertsModalOpen(false);
    setPauseModalOpen(false);
  }

  function goToBoardFromPauseLogEntry(entry) {
    const record = entry?.sourceRecord;
    const boardId = String(entry?.boardId || record?.boardId || pauseModalData?.board?.boardId || "").trim();
    if (!boardId) {
      pushAppToast?.("No se pudo ubicar el tablero de esta pausa.", "warning");
      return;
    }
    const historySnapshotId = String(entry?.historySnapshotId || record?.historySnapshotId || "").trim();
    const boardViewId = historySnapshotId || "current";
    const focusRecord = record?.source === "board"
      ? record
      : {
          source: "board",
          boardId,
          rowId: entry?.rowId || "",
          operationalDate: entry?.operationalDate || entry?.pausedAt || "",
          cleaningSite: entry?.cleaningSite || "",
          historySnapshotId: boardViewId !== "current" ? boardViewId : "",
        };
    goToBoardFromDashboardRecord(focusRecord, {
      boardId,
      rowId: entry?.rowId || record?.rowId || "",
      operationalDate: entry?.operationalDate || record?.operationalDate || entry?.pausedAt || "",
      cleaningSite: entry?.cleaningSite || record?.cleaningSite || "",
      boardViewId,
      openPauseDetails: true,
    });
  }

  const hasDashboardSection = useCallback((sectionType) => visibleDashboardSections.has(sectionType), [visibleDashboardSections]);

  const areaDashboardThemeEarly = useMemo(
    () => getAreaDashboardTheme(selectedAreaSectionId),
    [selectedAreaSectionId],
  );

  const isCleaningDashboard = useMemo(() => {
    const sectionId = String(selectedAreaSectionId || "").toLowerCase();
    return sectionId.includes("limpieza") || areaDashboardThemeEarly?.layout === "cleaning";
  }, [selectedAreaSectionId, areaDashboardThemeEarly?.layout]);

  const supportsCatalogAutoLimits = useMemo(() => {
    const sectionId = String(selectedAreaSectionId || "").toLowerCase();
    return isCleaningDashboard
      || sectionId.includes("mantenimiento")
      || areaDashboardThemeEarly?.layout === "maintenance";
  }, [isCleaningDashboard, selectedAreaSectionId, areaDashboardThemeEarly?.layout]);

  const enabledAreaDashboardSections = useMemo(
    () => new Set(getAreaDashboardSections(areaDashboardThemeEarly)),
    [areaDashboardThemeEarly],
  );

  const isDashboardSectionEnabled = useCallback((sectionType) => {
    if (!hasDashboardSection(sectionType)) return false;
    if (showGlobalAreaFilter) {
      if (sectionType === "areas") return true;
      return true;
    }
    return enabledAreaDashboardSections.has(sectionType);
  }, [enabledAreaDashboardSections, hasDashboardSection, showGlobalAreaFilter]);

  const globalPeriodMetrics = useMemo(() => {
    const records = Array.isArray(dateFilteredDashboardRecords) ? dateFilteredDashboardRecords : [];
    const filtered = records.filter((record) => {
      const periodOk = dashboardFilters.periodKey === "all"
        || getDashboardPeriodKey(record.occurredAt, dashboardFilters.periodType) === dashboardFilters.periodKey;
      const responsibleOk = dashboardFilters.responsibleId === "all" || record.responsibleId === dashboardFilters.responsibleId;
      const sourceOk = dashboardFilters.source === "all" || record.source === dashboardFilters.source;
      return periodOk && responsibleOk && sourceOk;
    });
    const completed = filtered.filter((record) => record.status === STATUS_FINISHED).length;
    const transportSummary = summarizeTransportForGeneralDashboard(transportRecords, {
      startDate: dashboardFilters.startDate,
      endDate: dashboardFilters.endDate,
    });
    const auditVolume = Number(processAuditMetrics?.totalAudits || 0);
    const transportVolume = transportSummary.hasData ? transportSummary.totalSalidas : 0;
    const boardVolume = filtered.length;
    return {
      total: boardVolume + transportVolume + auditVolume,
      completed,
      running: filtered.filter((record) => record.status === "running").length,
      paused: filtered.filter((record) => record.status === "paused").length,
      boardVolume,
      transportVolume,
      auditVolume,
    };
  }, [
    dashboardFilters.endDate,
    dashboardFilters.periodKey,
    dashboardFilters.periodType,
    dashboardFilters.responsibleId,
    dashboardFilters.source,
    dashboardFilters.startDate,
    dateFilteredDashboardRecords,
    processAuditMetrics?.totalAudits,
    transportRecords,
  ]);

  const dashboardNavigationHandlers = useMemo(() => ({
    setSelectedAreaSectionId,
    setPage,
    PAGE_DASHBOARD,
    PAGE_PROCESS_AUDITS,
    PAGE_TRANSPORT,
    setNavTransportSection,
    setAuditShortcutPreset,
    setDashboardFilters,
  }), [PAGE_DASHBOARD, PAGE_PROCESS_AUDITS, PAGE_TRANSPORT, setAuditShortcutPreset, setDashboardFilters, setNavTransportSection, setPage, setSelectedAreaSectionId]);

  const allAreaSectionsForGeneral = useMemo(
    () => mergeAreaSectionsForGeneralDashboard(areaNavSections, dynamicAreaSectionRoots),
    [areaNavSections, dynamicAreaSectionRoots],
  );

  const linkedAreaSections = useMemo(() => {
    if (showGlobalAreaFilter) {
      return allAreaSectionsForGeneral;
    }
    return allAreaSectionsForGeneral.filter((section) => section.id !== selectedAreaSectionId);
  }, [allAreaSectionsForGeneral, selectedAreaSectionId, showGlobalAreaFilter]);

  const generalAreaDashboardPanels = useMemo(() => {
    if (!showGlobalAreaFilter) return [];
    return buildGeneralAreaDashboardPanels({
      areaNavSections,
      dynamicAreaSectionRoots,
      filteredDashboardRecords,
      dashboardAreaRows,
      dashboardBoardInsightRows,
      dashboardInventoryProductTimeRows,
      dashboardResponsibleRows,
      dashboardPalletLeaderboardRows,
      processAuditMetrics,
      globalPeriodMetrics,
      transportRecords,
      dashboardDateFilters: {
        startDate: dashboardFilters.startDate,
        endDate: dashboardFilters.endDate,
      },
    });
  }, [
    areaNavSections,
    dashboardAreaRows,
    dashboardBoardInsightRows,
    dynamicAreaSectionRoots,
    dashboardInventoryProductTimeRows,
    dashboardPalletLeaderboardRows,
    dashboardResponsibleRows,
    filteredDashboardRecords,
    globalPeriodMetrics,
    processAuditMetrics,
    dashboardFilters.endDate,
    dashboardFilters.startDate,
    transportRecords,
    showGlobalAreaFilter,
  ]);

  const areAllSectionsOpen = Object.values(dashboardSectionsOpen).every(Boolean);
  const dashboardExportRef = useRef(null);
  const detailPrefsRef = useRef(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportingAreaPanelId, setExportingAreaPanelId] = useState(null);
  const [trendChartType, setTrendChartType] = useState("line");
  const [peopleChartType, setPeopleChartType] = useState("bar");
  const [areaChartType, setAreaChartType] = useState("bar");
  const [mermaChartType, setMermaChartType] = useState("bar");
  const [inventoryChartType, setInventoryChartType] = useState("bar");
  const [inventoryMetric, setInventoryMetric] = useState("secondsPerPiece");
  const [inventoryView, setInventoryView] = useState("all");
  const [productLeaderboardSearch, setProductLeaderboardSearch] = useState("");
  const [showAllProductPerformanceRows, setShowAllProductPerformanceRows] = useState(false);
  const [showInventoryDetailTable, setShowInventoryDetailTable] = useState(false);
  const [isExportingProductPdf, setIsExportingProductPdf] = useState(false);
  const [catalogTypeChartType, setCatalogTypeChartType] = useState("bar");
  const [catalogFreqChartType, setCatalogFreqChartType] = useState("bar");
  const [distributionChartType, setDistributionChartType] = useState("pie");
  const [detailBoardFilter, setDetailBoardFilter] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(DASHBOARD_DETAIL_VIEW_PREFS_KEY) || "null");
      return String(stored?.boardFilter || "all");
    } catch {
      return "all";
    }
  });
  const [detailStatusFilter, setDetailStatusFilter] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(DASHBOARD_DETAIL_VIEW_PREFS_KEY) || "null");
      return String(stored?.statusFilter || "all");
    } catch {
      return "all";
    }
  });
  const [detailSortBy, setDetailSortBy] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(DASHBOARD_DETAIL_VIEW_PREFS_KEY) || "null");
      return String(stored?.sortBy || "volume");
    } catch {
      return "volume";
    }
  });
  const [detailSearchText, setDetailSearchText] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(DASHBOARD_DETAIL_VIEW_PREFS_KEY) || "null");
      return String(stored?.searchText || "");
    } catch {
      return "";
    }
  });
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [leaderboardBoardFilter, setLeaderboardBoardFilter] = useState("all");

  const isWeeklyDashboardPeriod = dashboardFilters?.periodType === "week";
  const effectiveTrendChartType = isWeeklyDashboardPeriod ? "line" : trendChartType;
  const effectiveAreaChartType = isWeeklyDashboardPeriod ? "line" : areaChartType;

  useEffect(() => {
    if (!isWeeklyDashboardPeriod) return;
    setTrendChartType("line");
    setAreaChartType("line");
  }, [isWeeklyDashboardPeriod]);

  useEffect(() => {
    if (!confirmResetOpen) return undefined;

    function handleConfirmResetHotkeys(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isResetSubmitting) setConfirmResetOpen(false);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (!isResetSubmitting) {
          void confirmHardReset();
        }
      }
    }

    globalThis.addEventListener("keydown", handleConfirmResetHotkeys);
    return () => globalThis.removeEventListener("keydown", handleConfirmResetHotkeys);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmResetOpen, isResetSubmitting]);

  useEffect(() => {
    detailPrefsRef.current = {
      boardFilter: detailBoardFilter,
      statusFilter: detailStatusFilter,
      sortBy: detailSortBy,
      searchText: detailSearchText,
    };
  }, [detailBoardFilter, detailSearchText, detailSortBy, detailStatusFilter]);

  useEffect(() => {
    if (!detailPrefsRef.current) return;
    localStorage.setItem(DASHBOARD_DETAIL_VIEW_PREFS_KEY, JSON.stringify(detailPrefsRef.current));
  }, [detailBoardFilter, detailSearchText, detailSortBy, detailStatusFilter]);

  useEffect(() => {
    function normalizeAreaFilterValue(value) {
      if (Array.isArray(value)) {
        return value
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
          .sort((left, right) => left.localeCompare(right, "es-MX"));
      }
      return String(value || "").trim();
    }

    const currentAreaFilter = normalizeAreaFilterValue(dashboardFilters.area);
    if (selectedAreaSectionId === "all" || selectedAreaSectionId === "admin") {
      if (currentAreaFilter === "all" && dashboardFilters.source === "all") return;
      setDashboardFilters((current) => ({ ...current, area: "all", source: "all" }));
      return;
    }

    const sectionScopes = Array.isArray(selectedAreaSection?.scopes)
      ? selectedAreaSection.scopes.map((scope) => String(scope || "").trim()).filter(Boolean)
      : [];
    const targetAreaFilter = sectionScopes.length > 1
      ? sectionScopes
      : (sectionScopes[0] || String(selectedAreaSection?.label || "").trim() || "all");

    const normalizedTargetAreaFilter = normalizeAreaFilterValue(targetAreaFilter);
    const areaIsSynced = JSON.stringify(currentAreaFilter) === JSON.stringify(normalizedTargetAreaFilter);
    if (areaIsSynced && dashboardFilters.source === "all") return;
    setDashboardFilters((current) => ({ ...current, area: targetAreaFilter, source: "all" }));
  }, [
    dashboardFilters.area,
    dashboardFilters.source,
    selectedAreaSection?.label,
    selectedAreaSection?.scopes,
    selectedAreaSectionId,
    setDashboardFilters,
  ]);

  const activeAreaLabel = (selectedAreaSectionId === "all" || selectedAreaSectionId === "admin")
    ? (dashboardFilters.area === "all" ? "General" : dashboardFilters.area)
    : (selectedAreaSection?.label || "Área");

  const liveOperationalBoardAlerts = useMemo(() => {
    const records = Array.isArray(dashboardRecords) ? dashboardRecords : [];
    const areaScopes = showGlobalAreaFilter
      ? []
      : (Array.isArray(selectedAreaSection?.scopes) && selectedAreaSection.scopes.length
        ? selectedAreaSection.scopes.map((scope) => String(scope || "").trim().toLowerCase()).filter(Boolean)
        : [String(selectedAreaSection?.label || "").trim().toLowerCase()].filter(Boolean));

    const matchesArea = (record) => {
      if (!areaScopes.length) return true;
      const recordAreas = (Array.isArray(record.areaScopes) && record.areaScopes.length
        ? record.areaScopes
        : [record.area])
        .map((area) => String(area || "").trim().toLowerCase())
        .filter(Boolean);
      return recordAreas.some((area) => areaScopes.some((scope) => area.includes(scope) || scope.includes(area)));
    };

    const priority = (record) => {
      if (record.excessSeconds > 0 && record.status !== STATUS_FINISHED) return 0;
      if (record.status === STATUS_PAUSED) return 1;
      if (record.status === STATUS_RUNNING) return 2;
      return 3;
    };

    return records
      .filter((record) => record.source === "board" && !String(record.id).startsWith("board-history-"))
      .filter(matchesArea)
      .filter((record) => record.status === STATUS_RUNNING
        || record.status === STATUS_PAUSED
        || (record.excessSeconds > 0 && record.status !== STATUS_FINISHED))
      .sort((left, right) => {
        const priorityDiff = priority(left) - priority(right);
        if (priorityDiff !== 0) return priorityDiff;
        return Number(right.excessSeconds || 0) - Number(left.excessSeconds || 0);
      });
  }, [dashboardRecords, selectedAreaSection?.label, selectedAreaSection?.scopes, showGlobalAreaFilter]);

  const normalizeAreaText = useCallback((value) => {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }, []);

  const getAreaRootLabel = useCallback((areaValue) => {
    const parts = String(areaValue || "")
      .split("/")
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    return parts[0] || String(areaValue || "").trim();
  }, []);

  const areaMatchesFilter = useCallback((areaValue, selectedArea) => {
    if (selectedArea === "all") return true;
    const normalizedSelected = normalizeAreaText(selectedArea);
    const normalizedArea = normalizeAreaText(areaValue);
    const normalizedRoot = normalizeAreaText(getAreaRootLabel(areaValue));
    if (!normalizedSelected) return true;
    if (normalizedArea === normalizedSelected) return true;
    if (normalizedRoot === normalizedSelected) return true;
    if (normalizedArea.includes(`/${normalizedSelected}`) || normalizedArea.includes(`${normalizedSelected}/`)) return true;
    return false;
  }, [normalizeAreaText, getAreaRootLabel]);

  const formatInventoryFieldValue = useCallback((value) => {
    if (value === null || value === undefined || value === "") return "";
    if (Array.isArray(value)) return value.map((v) => formatInventoryFieldValue(v)).join(", ");
    if (typeof value === "object") {
      if (value.name || value.label || value.title) {
        return String(value.name || value.label || value.title);
      }
      return JSON.stringify(value);
    }
    return String(value);
  }, []);

  const getInventoryRowValue = useCallback((item, keywords = []) => {
    const normalizedKeywords = keywords.map((keyword) => String(keyword || "").toLowerCase()).filter(Boolean);
    const fields = Array.isArray(item.sourceFields) ? item.sourceFields : [];

    const matchField = fields.find((field) => {
      const label = String(field?.label || field?.name || field?.key || "").toLowerCase();
      return normalizedKeywords.some((keyword) => label.includes(keyword));
    });

    if (matchField) {
      const values = item.rowValues || {};
      const rawValue = values[matchField.id] ?? values[matchField.key] ?? values[matchField.name];
      if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
        // Si es un campo inventoryLookup, resolver ID a nombre del producto
        if (matchField.type === "inventoryLookup" && inventoryItemsById) {
          const inventoryItem = inventoryItemsById.get(rawValue);
          if (inventoryItem && inventoryItem.name) {
            return formatInventoryFieldValue(inventoryItem.name);
          }
        }
        return formatInventoryFieldValue(rawValue);
      }
    }

    const values = item.rowValues || {};
    const matchEntry = Object.entries(values).find(([key]) => {
      const normalizedKey = String(key || "").toLowerCase();
      return normalizedKeywords.some((keyword) => normalizedKey.includes(keyword));
    });
    if (matchEntry) return formatInventoryFieldValue(matchEntry[1]);

    return "";
  }, [formatInventoryFieldValue, inventoryItemsById]);

  const getInventoryProductLabel = useCallback((item) => {
    const productKeywords = ["nombre producto", "nombre", "descripcion", "producto", "sku", "articulo", "item", "producto/sku"];
    const normalizedKeywords = productKeywords.map((keyword) => String(keyword || "").toLowerCase()).filter(Boolean);
    const fields = Array.isArray(item.sourceFields) ? item.sourceFields : [];

    const matchField = fields.find((field) => {
      const label = String(field?.label || field?.name || field?.key || "").toLowerCase();
      return normalizedKeywords.some((keyword) => label.includes(keyword));
    });

    if (matchField) {
      const values = item.rowValues || {};
      const rawValue = values[matchField.id] ?? values[matchField.key] ?? values[matchField.name];
      if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
        if (matchField.type === "inventoryLookup" && inventoryItemsById) {
          const inventoryItem = inventoryItemsById.get(rawValue);
          if (inventoryItem) {
            const nameLabel = inventoryItem.name || formatInventoryFieldValue(rawValue);
            const presentation = String(inventoryItem.presentation || "").trim();
            return presentation ? `${nameLabel} - ${presentation}` : nameLabel;
          }
        }
        return formatInventoryFieldValue(rawValue);
      }
    }

    return String(item.rowLabel || "").trim();
  }, [formatInventoryFieldValue, inventoryItemsById]);

  const resolveInventoryRowFieldValue = useCallback((item, keywords = []) => {
    const normalizedKeywords = keywords.map((keyword) => String(keyword || "").toLowerCase()).filter(Boolean);
    const fields = Array.isArray(item.sourceFields) ? item.sourceFields : [];
    const field = fields.find((fieldItem) => {
      const haystack = [fieldItem?.label, fieldItem?.name, fieldItem?.key, fieldItem?.id]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return normalizedKeywords.some((keyword) => haystack.includes(keyword));
    });
    if (!field) return "";
    const values = item.rowValues || {};
    const rawValue = values[field.id] ?? values[field.key] ?? values[field.name];
    if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
      if (Array.isArray(rawValue) || (typeof rawValue === "object" && !String(rawValue.name || rawValue.label || rawValue.title).trim())) {
        return rawValue;
      }
      return formatInventoryFieldValue(rawValue);
    }
    return getInventoryRowValue(item, keywords);
  }, [formatInventoryFieldValue, getInventoryRowValue]);

  const resolveInventoryRowNumericValue = useCallback((item, keywords = []) => {
    const rawValue = resolveInventoryRowFieldValue(item, keywords);
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return null;
    const normalized = String(rawValue).replace(/\./g, "").replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/g);
    if (!normalized || !normalized.length) return null;
    const numeric = Number(normalized[0]);
    return Number.isFinite(numeric) ? numeric : null;
  }, [resolveInventoryRowFieldValue]);

  

  const scopedInventoryProductTimeRows = useMemo(() => {
    const rows = Array.isArray(dashboardInventoryProductTimeRows) ? dashboardInventoryProductTimeRows : [];
    const areaFiltered = dashboardFilters.area === "all" ? rows : rows.filter((item) => areaMatchesFilter(item.area, dashboardFilters.area));
    const boardFiltered = leaderboardBoardFilter === "all"
      ? areaFiltered
      : areaFiltered.filter((item) => String(item.boardId || "") === leaderboardBoardFilter);

    return boardFiltered.map((item) => {
      const metrics = resolveDashboardInventoryRowMetrics(item, inventoryItemsById);
      const loteValue = getInventoryRowValue(item, ["lote", "batch", "corrida"]);
      const caducityValue = getInventoryRowValue(item, ["caducidad", "vence", "expira", "expiracion"]);
      const startValue = item.startTime
        ? formatTime(item.startTime)
        : getInventoryRowValue(item, ["inicio", "fecha inicio", "hora inicio", "start", "start time", "hora de inicio"]);
      const endValue = item.endTime
        ? formatTime(item.endTime)
        : getInventoryRowValue(item, ["fin", "fecha fin", "hora fin", "end", "end time", "hora de fin"]);

      return {
        ...item,
        ...metrics,
        loteValue: loteValue || "-",
        caducityValue: caducityValue || "-",
        startValue: startValue || "-",
        endValue: endValue || "-",
        occurredAtLabel: item.occurredAt ? new Date(item.occurredAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "-",
        mermas: metrics.mermasText,
      };
    });
  }, [dashboardFilters.area, dashboardInventoryProductTimeRows, leaderboardBoardFilter, areaMatchesFilter, getInventoryRowValue, inventoryItemsById]);

  const scopedProductAggregateRows = useMemo(() => {
    const rows = Array.isArray(dashboardProductAggregateRows) ? dashboardProductAggregateRows : [];
    const areaFiltered = dashboardFilters.area === "all" ? rows : rows.filter((item) => areaMatchesFilter(item.area, dashboardFilters.area));
    if (leaderboardBoardFilter === "all") return areaFiltered;
    return areaFiltered.filter((item) => String(item.boardId || "") === leaderboardBoardFilter);
  }, [dashboardFilters.area, dashboardProductAggregateRows, areaMatchesFilter, leaderboardBoardFilter]);

  const leaderboardBoardOptions = useMemo(() => {
    const base = Array.isArray(dashboardInventoryProductTimeRows) ? dashboardInventoryProductTimeRows : [];
    const areaFiltered = dashboardFilters.area === "all" ? base : base.filter((item) => areaMatchesFilter(item.area, dashboardFilters.area));
    const map = new Map();
    areaFiltered.forEach((item) => {
      const boardId = String(item.boardId || "");
      if (boardId && !map.has(boardId)) {
        map.set(boardId, { value: boardId, label: item.boardName || boardId });
      }
    });
    return [{ value: "all", label: "Todos los tableros" }].concat(
      Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "es-MX")),
    );
  }, [dashboardFilters.area, dashboardInventoryProductTimeRows, areaMatchesFilter]);

  // Si el tablero seleccionado ya no existe en las opciones, resetear
  const leaderboardBoardFilterSafe = leaderboardBoardOptions.some((o) => o.value === leaderboardBoardFilter) ? leaderboardBoardFilter : "all";

  const scopedProductPerformanceRows = useMemo(() => {
    if (leaderboardBoardFilterSafe === "all" && Array.isArray(dashboardProductPerformanceRows) && dashboardProductPerformanceRows.length) {
      return dashboardProductPerformanceRows;
    }

    const productMap = new Map();
    scopedInventoryProductTimeRows.forEach((row) => {
      const productKey = row.productKey || String(row.productValue || "sin producto").trim().toLowerCase();
      const tarimaKey = String(row.tarimaValue || "Sin tarima").trim() || "Sin tarima";

      if (!productMap.has(productKey)) {
        productMap.set(productKey, {
          key: productKey,
          product: row.productValue || "Sin producto",
          productCode: row.productCode || "",
          productName: row.productName || "",
          productPresentation: row.productPresentation || "",
          sessions: 0,
          totalMinutes: 0,
          totalPieces: 0,
          tarimaKeys: new Set(),
        });
      }

      const productEntry = productMap.get(productKey);
      productEntry.sessions += 1;
      productEntry.totalMinutes += Math.max(0, Number(row.durationMinutes || 0));
      productEntry.totalPieces += Math.max(0, Number(row.piecesReviewed || 0));
      productEntry.tarimaKeys.add(tarimaKey);
    });

    return Array.from(productMap.values())
      .map((entry) => {
        const palletCount = entry.tarimaKeys.size;
        return {
          key: entry.key,
          product: entry.product,
          productCode: entry.productCode,
          productName: entry.productName,
          productPresentation: entry.productPresentation,
          sessions: entry.sessions,
          palletCount,
          totalMinutes: entry.totalMinutes,
          totalPieces: entry.totalPieces,
          avgMinutesPerPallet: palletCount > 0 ? entry.totalMinutes / palletCount : 0,
          avgMinutesPerSession: entry.sessions > 0 ? entry.totalMinutes / entry.sessions : 0,
          secondsPerPiece: entry.totalPieces > 0 ? (entry.totalMinutes * 60) / entry.totalPieces : null,
        };
      })
      .sort((left, right) => right.totalPieces - left.totalPieces || right.totalMinutes - left.totalMinutes);
  }, [dashboardProductPerformanceRows, leaderboardBoardFilterSafe, scopedInventoryProductTimeRows]);

  const filteredProductPerformanceRows = useMemo(() => {
    const query = productLeaderboardSearch.trim().toLowerCase();
    if (!query) return scopedProductPerformanceRows;
    return scopedProductPerformanceRows.filter((product) => {
      const haystack = [
        product.product,
        product.productCode,
        product.productName,
        product.productPresentation,
      ].map((value) => String(value || "").toLowerCase()).join(" ");
      return haystack.includes(query);
    });
  }, [scopedProductPerformanceRows, productLeaderboardSearch]);

  const chartProductPerformanceRows = useMemo(
    () => filteredProductPerformanceRows.slice(0, 10),
    [filteredProductPerformanceRows],
  );

  const visibleProductPerformanceRows = useMemo(() => {
    if (productLeaderboardSearch.trim() || showAllProductPerformanceRows) {
      return filteredProductPerformanceRows;
    }
    return filteredProductPerformanceRows.slice(0, 5);
  }, [filteredProductPerformanceRows, productLeaderboardSearch, showAllProductPerformanceRows]);

  const reviewedTarimaSearchOptions = useMemo(() => {
    const tarimaSet = new Set();
    scopedInventoryProductTimeRows.forEach((row) => {
      const tarima = String(row.tarimaValue || "").trim();
      if (tarima && tarima !== "Sin tarima") tarimaSet.add(tarima);
    });
    return Array.from(tarimaSet).sort((left, right) => left.localeCompare(right, "es-MX", { numeric: true }));
  }, [scopedInventoryProductTimeRows]);

  const scopedPalletLeaderboardRows = useMemo(() => {
    const sourceRows = leaderboardBoardFilterSafe === "all"
      ? (Array.isArray(dashboardPalletLeaderboardRows) ? dashboardPalletLeaderboardRows : [])
      : (() => {
        const palletMap = new Map();
        scopedInventoryProductTimeRows.forEach((row) => {
          const tarimaKey = String(row.tarimaValue || "Sin tarima").trim() || "Sin tarima";
          const durationMinutes = Math.max(0, Number(row.durationMinutes || 0));
          const pieces = Math.max(0, Number(row.piecesReviewed || row.realPieces || row.expectedPieces || 0));
          if (!palletMap.has(tarimaKey)) {
            palletMap.set(tarimaKey, {
              key: tarimaKey,
              tarima: tarimaKey,
              sessions: 0,
              totalMinutes: 0,
              totalPieces: 0,
            });
          }
          const entry = palletMap.get(tarimaKey);
          entry.sessions += 1;
          entry.totalMinutes += durationMinutes;
          entry.totalPieces += pieces;
        });
        return Array.from(palletMap.values()).map((entry) => ({
          ...entry,
          avgMinutesPerSession: entry.sessions > 0 ? entry.totalMinutes / entry.sessions : 0,
          secondsPerPiece: entry.totalPieces > 0 ? (entry.totalMinutes * 60) / entry.totalPieces : null,
        }));
      })();
    return sourceRows.sort((left, right) => {
      const metricKey = inventoryMetric === "secondsPerPiece" ? "secondsPerPiece" : inventoryMetric;
      const leftValue = Number(left[metricKey] || left.totalMinutes || 0);
      const rightValue = Number(right[metricKey] || right.totalMinutes || 0);
      return rightValue - leftValue;
    });
  }, [dashboardPalletLeaderboardRows, inventoryMetric, leaderboardBoardFilterSafe, scopedInventoryProductTimeRows]);

  const scopedLeaderboardBoardRecords = useMemo(() => {
    const rows = Array.isArray(filteredDashboardRecords)
      ? filteredDashboardRecords.filter((item) => item.source === "board")
      : [];
    const areaFiltered = dashboardFilters.area === "all"
      ? rows
      : rows.filter((item) => areaMatchesFilter(item.area, dashboardFilters.area));
    const boardFiltered = leaderboardBoardFilterSafe === "all"
      ? areaFiltered
      : areaFiltered.filter((item) => String(item.boardId || "") === leaderboardBoardFilterSafe);

    return [...boardFiltered].sort((left, right) => new Date(right.occurredAt || 0).getTime() - new Date(left.occurredAt || 0).getTime());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardFilters.area, filteredDashboardRecords, leaderboardBoardFilterSafe]);

  const leaderboardDynamicBoardFields = useMemo(() => {
    if (leaderboardBoardFilterSafe === "all") return [];
    const fieldMap = new Map();

    scopedLeaderboardBoardRecords.forEach((record) => {
      const fields = Array.isArray(record.sourceFields) ? record.sourceFields : [];
      fields.forEach((field, index) => {
        const key = String(field?.id || field?.key || field?.name || `field-${index}`);
        if (!key || fieldMap.has(key)) return;
        fieldMap.set(key, {
          key,
          label: String(field?.label || field?.name || key),
          type: String(field?.type || "text"),
          order: Number.isFinite(Number(field?.order)) ? Number(field.order) : index,
        });
      });
    });

    if (!fieldMap.size) {
      scopedLeaderboardBoardRecords.forEach((record) => {
        Object.keys(record?.rowValues || {}).forEach((rawKey, index) => {
          const key = String(rawKey || "").trim();
          if (!key || fieldMap.has(key)) return;
          fieldMap.set(key, {
            key,
            label: key,
            type: "text",
            order: index,
          });
        });
      });
    }

    return Array.from(fieldMap.values())
      .sort((left, right) => left.order - right.order)
      .slice(0, 14);
  }, [leaderboardBoardFilterSafe, scopedLeaderboardBoardRecords]);

  // Board map for resolving getBoardFieldValue (needs board object with .fields)
  const leaderboardBoardMap = useMemo(() => {
    const boards = Array.isArray(dashboardVisibleControlBoards) ? dashboardVisibleControlBoards : [];
    return new Map(boards.map((b) => [String(b.id || ""), b]));
  }, [dashboardVisibleControlBoards]);

  function resolveBoardRecordFieldValue(record, field) {
    const board = leaderboardBoardMap.get(String(record?.boardId || ""));
    if (board && getBoardFieldValue) {
      // Build a minimal row compatible with getBoardFieldValue
      const fakeRow = { values: record?.rowValues || {}, id: record?.rawId || "", status: record?.status };
      const realField = (board.fields || []).find((f) => String(f.id || "") === String(field.key || "")) || field;
      try {
        const resolved = getBoardFieldValue(board, fakeRow, realField);
        if (resolved !== null && resolved !== undefined && String(resolved).trim() !== "") return resolved;
      } catch {
        // fallback below
      }
    }
    // Fallback: direct rowValues lookup
    const values = record?.rowValues && typeof record.rowValues === "object" ? record.rowValues : {};
    const candidates = [field.key, field.id, field.name, field.label].filter(Boolean);
    for (const candidate of candidates) {
      if (Object.prototype.hasOwnProperty.call(values, candidate)) return values[candidate];
    }
    const lowerMap = new Map(Object.keys(values).map((k) => [String(k).toLowerCase(), k]));
    for (const candidate of candidates) {
      const lc = String(candidate).toLowerCase();
      if (lowerMap.has(lc)) return values[lowerMap.get(lc)];
    }
    return "";
  }

  function findLeaderboardFieldByKeywords(keywords = []) {
    return leaderboardDynamicBoardFields.find((field) => {
      const label = String(field?.label || "").toLowerCase();
      return keywords.some((keyword) => label.includes(keyword));
    }) || null;
  }

  function findRecordFieldByKeywords(record, keywords = []) {
    if (!record || !Array.isArray(keywords) || !keywords.length) return null;
    const normalizedKeywords = keywords.map((keyword) => String(keyword || "").toLowerCase()).filter(Boolean);

    const sourceFields = Array.isArray(record.sourceFields) ? record.sourceFields : [];
    const fromSourceFields = sourceFields.find((field) => {
      const haystack = [field?.label, field?.name, field?.key, field?.id]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return normalizedKeywords.some((keyword) => haystack.includes(keyword));
    });
    if (fromSourceFields) {
      return {
        key: String(fromSourceFields.id || fromSourceFields.key || fromSourceFields.name || fromSourceFields.label || "").trim(),
        id: String(fromSourceFields.id || fromSourceFields.key || "").trim(),
        name: String(fromSourceFields.name || fromSourceFields.label || "").trim(),
        label: String(fromSourceFields.label || fromSourceFields.name || fromSourceFields.id || "").trim(),
        type: fromSourceFields.type || "text",
      };
    }

    const rowValues = record?.rowValues && typeof record.rowValues === "object" ? record.rowValues : {};
    const rowKey = Object.keys(rowValues).find((key) => {
      const lc = String(key || "").toLowerCase();
      return normalizedKeywords.some((keyword) => lc.includes(keyword));
    });
    if (!rowKey) return null;
    return { key: rowKey, id: rowKey, name: rowKey, label: rowKey, type: "text" };
  }

  function resolveLeaderboardNumericField(record, keywords = []) {
    const field = findRecordFieldByKeywords(record, keywords) || findLeaderboardFieldByKeywords(keywords);
    if (!field) return null;
    const raw = resolveBoardRecordFieldValue(record, field);
    const parsed = Number(String(raw || "").replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function resolveLeaderboardMermaPieces(record) {
    return Math.max(
      0,
      resolveLeaderboardNumericField(record, ["piezas merma", "merma piezas", "piezas de merma", "rechazo", "defect", "dano", "danado"]) || 0,
    );
  }

  function parseCausalesFromRecord(record) {
    const field = findRecordFieldByKeywords(record, ["causal"]) || findLeaderboardFieldByKeywords(["causal"]);
    if (!field) return [];
    const raw = resolveBoardRecordFieldValue(record, field);
    const normalized = normalizeBoardMultiSelectDetailValue(raw);
    if (normalized.length) {
      return normalized.map((item) => ({
        motivo: String(item.label || item.option || "").trim(),
        piezas: Number(String(item.detail || "").replace(/,/g, ".")),
      })).filter((item) => item.motivo);
    }

    const text = String(raw || "").trim();
    if (!text) return [];
    return text
      .split("|")
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .map((part) => {
        const [motivoRaw, detailRaw = ""] = part.split(":");
        return {
          motivo: String(motivoRaw || "").trim(),
          piezas: Number(String(detailRaw || "").replace(/,/g, ".")),
        };
      })
      .filter((item) => item.motivo);
  }

  // ── Merma analysis ──────────────────────────────────────────────────────────
  const mermaAnalysisRows = useMemo(() => {
    const map = new Map();
    scopedLeaderboardBoardRecords.forEach((record) => {
      const totalMermaPieces = resolveLeaderboardMermaPieces(record);
      const totalMissingPieces = Math.max(0, resolveLeaderboardNumericField(record, ["piezas falt", "faltante", "diferencia", "faltan"]) || 0);
      const causales = parseCausalesFromRecord(record);

      // Exclude rows with no causales and no merma/faltantes values.
      if (!causales.length && totalMermaPieces <= 0 && totalMissingPieces <= 0) {
        return;
      }

      if (!causales.length) {
        const motivo = "Sin motivo especificado";
        if (!map.has(motivo)) map.set(motivo, { motivo, count: 0, totalPiezas: 0, totalPiezasFaltantes: 0 });
        const entry = map.get(motivo);
        entry.count += 1;
        entry.totalPiezas += totalMermaPieces;
        entry.totalPiezasFaltantes += totalMissingPieces;
        return;
      }

      const withPieces = causales
        .map((item) => ({ ...item, piezas: Number.isFinite(item.piezas) && item.piezas > 0 ? item.piezas : 0 }))
        .filter((item) => item.motivo);
      const explicitPieces = withPieces.reduce((sum, item) => sum + item.piezas, 0);
      const withoutPieces = withPieces.filter((item) => item.piezas <= 0);
      const remainingPieces = Math.max(0, totalMermaPieces - explicitPieces);
      const distributed = withoutPieces.length > 0
        ? (explicitPieces > 0 ? remainingPieces / withoutPieces.length : (totalMermaPieces > 0 ? totalMermaPieces / withoutPieces.length : 0))
        : 0;

      withPieces.forEach((item) => {
        const motivo = String(item.motivo || "Sin motivo especificado").trim() || "Sin motivo especificado";
        if (!map.has(motivo)) map.set(motivo, { motivo, count: 0, totalPiezas: 0, totalPiezasFaltantes: 0 });
        const entry = map.get(motivo);
        entry.count += 1;
        entry.totalPiezas += item.piezas > 0 ? item.piezas : distributed;
      });

      const distributedMissingPieces = withPieces.length > 0 ? totalMissingPieces / withPieces.length : 0;
      withPieces.forEach((item) => {
        const motivo = String(item.motivo || "Sin motivo especificado").trim() || "Sin motivo especificado";
        const entry = map.get(motivo);
        entry.totalPiezasFaltantes += distributedMissingPieces;
      });
    });

    return Array.from(map.values())
      .filter((row) => row.totalPiezas > 0 || row.count > 0)
      .sort((a, b) => b.totalPiezas - a.totalPiezas || b.count - a.count);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboardDynamicBoardFields, scopedLeaderboardBoardRecords]);

  const mermaChartRows = useMemo(() => {
    const rows = mermaAnalysisRows
      .filter((row) => Number.isFinite(row.totalPiezas) && row.totalPiezas > 0)
      .slice(0, 10)
      .map((row) => ({
        key: row.motivo,
        label: row.motivo.length > 28 ? `${row.motivo.slice(0, 27)}…` : row.motivo,
        value: Number(row.totalPiezas || 0),
        valueLabel: `${formatMetricNumber(Number(row.totalPiezas || 0), 0)} pzas de merma`,
        tooltip: `${row.motivo}: ${formatMetricNumber(row.totalPiezas || 0, 0)} pzas de merma · ${formatMetricNumber(row.totalPiezasFaltantes || 0, 0)} pzas faltantes · ${row.count} registro(s)`,
        color: "linear-gradient(180deg, #b91c1c 0%, #f87171 100%)",
      }));

    const totalMissingPieces = mermaAnalysisRows.reduce((sum, row) => sum + Number(row.totalPiezasFaltantes || 0), 0);
    if (totalMissingPieces > 0) {
      rows.push({
        key: "piezas-faltantes",
        label: "Piezas faltantes",
        value: totalMissingPieces,
        valueLabel: `${formatMetricNumber(totalMissingPieces, 0)} pzas faltantes`,
        tooltip: `Piezas faltantes totales: ${formatMetricNumber(totalMissingPieces, 0)} · ${mermaAnalysisRows.reduce((sum, row) => sum + (row.count || 0), 0)} registro(s)`,
        color: "linear-gradient(180deg, #d97706 0%, #fbbf24 100%)",
      });
    }

    return rows;
  }, [formatMetricNumber, mermaAnalysisRows]);

  // ── Template export/import ────────────────────────────────────────────────
  const scopedAreaBoardDetailedRows = useMemo(() => {
    const rows = Array.isArray(dashboardAreaBoardDetailedRows) ? dashboardAreaBoardDetailedRows : [];
    if (dashboardFilters.area === "all") return rows;
    return rows.filter((item) => areaMatchesFilter(item.area, dashboardFilters.area));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardAreaBoardDetailedRows, dashboardFilters.area]);

  const detailBoardFilterOptions = useMemo(() => {
    const map = new Map();
    scopedAreaBoardDetailedRows.forEach((areaItem) => {
      (areaItem.boards || []).forEach((board) => {
        if (!map.has(board.boardToken)) {
          map.set(board.boardToken, {
            value: board.boardToken,
            label: `${board.boardName} (${areaItem.area})`,
          });
        }
      });
    });
    return [{ value: "all", label: "Todos los tableros" }].concat(
      Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label, "es-MX")),
    );
  }, [scopedAreaBoardDetailedRows]);

  useEffect(() => {
    if (detailBoardFilter === "all") return;
    if (!detailBoardFilterOptions.some((option) => option.value === detailBoardFilter)) {
      setDetailBoardFilter("all");
    }
  }, [detailBoardFilter, detailBoardFilterOptions]);

  const filteredAreaBoardDetailedRows = useMemo(() => {
    function boardMatchesStatus(board) {
      if (detailStatusFilter === "all") return true;
      if (detailStatusFilter === "paused") return board.paused > 0;
      if (detailStatusFilter === "running") return board.running > 0;
      if (detailStatusFilter === "completed") return board.completed > 0;
      if (detailStatusFilter === "pending") return board.totalRecords - (board.completed + board.running + board.paused) > 0;
      return true;
    }

    function sortBoards(boards) {
      const next = [...boards];
      if (detailSortBy === "efficiency") {
        return next.sort((left, right) => right.efficiencyPercent - left.efficiencyPercent || right.totalRecords - left.totalRecords);
      }
      if (detailSortBy === "pause") {
        return next.sort((left, right) => right.pauseHours - left.pauseHours || right.totalRecords - left.totalRecords);
      }
      if (detailSortBy === "cycle") {
        return next.sort((left, right) => right.averageCycleMinutes - left.averageCycleMinutes || right.totalRecords - left.totalRecords);
      }
      if (detailSortBy === "completion") {
        return next.sort((left, right) => right.completionPercent - left.completionPercent || right.totalRecords - left.totalRecords);
      }
      return next.sort((left, right) => right.totalRecords - left.totalRecords || left.boardName.localeCompare(right.boardName, "es-MX"));
    }

    const normalizedQuery = String(detailSearchText || "").trim().toLowerCase();

    return scopedAreaBoardDetailedRows
      .map((areaItem) => {
        const boards = (areaItem.boards || []).filter((board) => {
          const boardOk = detailBoardFilter === "all" || board.boardToken === detailBoardFilter;
          const boardText = `${board.boardName} ${board.sourceLabel} ${(board.inventoryProducts || []).map((item) => item.product).join(" ")} ${(board.dynamicMetrics || []).map((item) => item.fieldLabel).join(" ")}`.toLowerCase();
          const searchOk = !normalizedQuery || boardText.includes(normalizedQuery) || String(areaItem.area || "").toLowerCase().includes(normalizedQuery);
          return boardOk && boardMatchesStatus(board) && searchOk;
        });

        const visibleTotalRecords = boards.reduce((sum, board) => sum + (board.totalRecords || 0), 0);
        const visibleCompleted = boards.reduce((sum, board) => sum + (board.completed || 0), 0);
        const visibleRunning = boards.reduce((sum, board) => sum + (board.running || 0), 0);
        const visiblePaused = boards.reduce((sum, board) => sum + (board.paused || 0), 0);
        const visibleProductionHours = boards.reduce((sum, board) => sum + (board.productionHours || 0), 0);
        const visiblePauseHours = boards.reduce((sum, board) => sum + (board.pauseHours || 0), 0);
        const visibleCompletionPercent = visibleTotalRecords ? (visibleCompleted / visibleTotalRecords) * 100 : 0;

        return {
          ...areaItem,
          visibleTotalRecords,
          visibleCompleted,
          visibleRunning,
          visiblePaused,
          visibleProductionHours,
          visiblePauseHours,
          visibleCompletionPercent,
          visibleBoardCount: boards.length,
          boards: sortBoards(boards),
        };
      })
      .filter((areaItem) => areaItem.boards.length > 0)
      .sort((left, right) => right.totalRecords - left.totalRecords || left.area.localeCompare(right.area, "es-MX"));
  }, [detailBoardFilter, detailSearchText, detailSortBy, detailStatusFilter, scopedAreaBoardDetailedRows]);

  function resetDetailViewFilters() {
    setDetailBoardFilter("all");
    setDetailStatusFilter("all");
    setDetailSortBy("volume");
    setDetailSearchText("");
  }

  async function confirmHardReset() {
    if (isResetSubmitting) return;
    try {
      setIsResetSubmitting(true);
      await hardResetDashboard();
      setConfirmResetOpen(false);
    } catch (error) {
      pushAppToast(error?.message || "No fue posible reiniciar el dashboard.", "danger");
    } finally {
      setIsResetSubmitting(false);
    }
  }

  async function exportProductPerformancePdf() {
    if (!canExportDashboardActions) return;
    if (isExportingProductPdf) return;

    try {
      setIsExportingProductPdf(true);
      const { loadJsPdfWithAutoTable } = await import("../utils/jspdfLoader.js");
      const { jsPDF, autoTable } = await loadJsPdfWithAutoTable();
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pdfCtx = createDashboardPdfContext(pdf, {
        areaLabel: activeAreaLabel,
        accent: DASHBOARD_PDF_THEME.brand,
      });
      const { addPageHeader, addPageFooter, drawSectionTable, marginX } = pdfCtx;

      addPageHeader("Rendimiento por producto — Resumen consolidado", "Promedios acumulados por código, nombre y presentación");
      drawSectionTable(
        "Promedio por producto",
        ["Producto", "Tarimas", "Sesiones", "Piezas revisadas", "Min total", "Min / tarima", "Min / sesión", "Seg / pieza"],
        scopedProductPerformanceRows.map((product) => [
          product.product,
          String(product.palletCount || 0),
          String(product.sessions || 0),
          formatMetricNumber(product.totalPieces, 0),
          formatMetricNumber(product.totalMinutes, 1),
          formatMetricNumber(product.avgMinutesPerPallet, 1),
          formatMetricNumber(product.avgMinutesPerSession, 1),
          product.secondsPerPiece !== null ? formatMetricNumber(product.secondsPerPiece, 1) : "-",
        ]),
        { autoTable, accent: DASHBOARD_PDF_THEME.brandLight },
      );

      addPageFooter("Rendimiento por producto");
      pdf.save(`rendimiento-productos-${new Date().toISOString().slice(0, 10)}.pdf`);
      pushAppToast?.("PDF de rendimiento por producto descargado.", "success");
    } catch (error) {
      pushAppToast?.(error?.message || "No fue posible exportar el PDF de productos.", "danger");
    } finally {
      setIsExportingProductPdf(false);
    }
  }

  async function exportDashboardToPdf() {
    if (!canExportDashboardActions) return;
    if (isExportingPdf) return;

    try {
      setIsExportingPdf(true);
      const exportKpiCardsForPdf = showGlobalAreaFilter
        ? executiveKpiCards
          .filter((item) => new Set([
            "Registros analizados",
            "Cerrados",
            "En curso",
            "Pausados",
            "Tiempo promedio",
            "Horas productivas",
            "Eficiencia operativa",
            "Áreas activas",
          ]).has(item.title))
          .map((item) => ({
            cardKey: `global-${item.title}`,
            title: item.title,
            value: item.value,
            valueMeta: item.valueMeta,
            subtitle: item.subtitle,
            tone: item.tone,
            icon: item.icon,
            progress: item.progress,
          }))
          .concat(dashboardBoardKpiCards || [])
        : buildAreaExecutiveKpiCards(selectedAreaSectionId, {
          metrics: dashboardMetrics,
          boardRows: dashboardBoardInsightRows,
          inventoryRows: scopedInventoryProductTimeRows,
          mermaRows: mermaAnalysisRows,
          pauseAnalysis,
          palletRows: dashboardPalletLeaderboardRows,
          responsibleRows: dashboardResponsibleRows,
          auditMetrics: processAuditMetrics,
        }).concat(buildAreaBridgeKpiCards(globalPeriodMetrics, dashboardMetrics));
      const exportAreaSpotlightsForPdf = showGlobalAreaFilter
        ? []
        : buildAreaDashboardSpotlights(areaDashboardThemeEarly, dashboardMetrics, {
          boards: dashboardBoardInsightRows.length,
          players: dashboardResponsibleRows.length,
          slaPercent: Math.round(dashboardMetrics.withinPercent || 0),
          hours: `${formatMetricNumber(dashboardMetrics.totalHours, 1)} h`,
          inventorySkus: scopedInventoryProductTimeRows.length,
          mermaRows: mermaAnalysisRows.length,
          pauseCauses: pauseAnalysis.length,
          running: dashboardMetrics.running,
          paused: dashboardMetrics.paused,
        });
      const exportGeneralAreaPanelsForPdf = showGlobalAreaFilter ? generalAreaDashboardPanels : [];
      const { loadJsPdfWithAutoTable } = await import("../utils/jspdfLoader.js");
      const { jsPDF, autoTable } = await loadJsPdfWithAutoTable();
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const marginX = 28;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const printableWidth = pageWidth - marginX * 2;
      const BRAND_GREEN = DASHBOARD_PDF_THEME.brand;
      const BRAND_LIGHT = DASHBOARD_PDF_THEME.brandLight;
      const TEXT_DARK = DASHBOARD_PDF_THEME.textDark;
      const TEXT_MID = DASHBOARD_PDF_THEME.textMid;
      const TEXT_MUTED = DASHBOARD_PDF_THEME.textMuted;
      const COLOR_GREEN = DASHBOARD_PDF_THEME.success;
      const COLOR_AMBER = DASHBOARD_PDF_THEME.warning;
      const COLOR_RED = DASHBOARD_PDF_THEME.danger;
      const COLOR_BLUE = DASHBOARD_PDF_THEME.info;
      const pdfCtx = createDashboardPdfContext(pdf, { areaLabel: activeAreaLabel, accent: BRAND_GREEN });
      const exportDate = pdfCtx.exportDate;

      function addPageHeader(title, subtitle, headerAccent = BRAND_GREEN) {
        pdfCtx.addPageHeader(title, subtitle, headerAccent);
      }

      function addPageFooter() {
        pdfCtx.addPageFooter("Dashboard operativo AXIS ORDO");
      }

      function drawSectionTable(title, head, body, options = {}) {
        const areaAccent = options.areaAccent || BRAND_LIGHT;
        pdfCtx.drawSectionTable(title, head, body, {
          autoTable,
          accent: areaAccent,
          tableConfig: options,
        });
      }

      function drawMiniBarChart(startX, startY, chartWidth, chartHeight, rows, titleText, unit = "") {
        if (!rows.length) return;
        const max = Math.max(...rows.map((r) => r.value), 1);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...TEXT_DARK);
        pdf.text(titleText, startX, startY);
        const chartTop = startY + 8;
        const barAreaHeight = chartHeight - 28;
        const barWidth = Math.min((chartWidth - 20) / rows.length, 50);
        rows.forEach((row, i) => {
          const bh = Math.max(2, (row.value / max) * barAreaHeight);
          const bx = startX + 10 + i * barWidth;
          const by = chartTop + barAreaHeight - bh;
          const color = row.color || BRAND_LIGHT;
          pdf.setFillColor(...color);
          pdf.roundedRect(bx + 1, by, barWidth - 4, bh, 1, 1, "F");
          pdf.setFontSize(6);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...TEXT_MUTED);
          const labelText = String(row.label || "").substring(0, 7);
          pdf.text(labelText, bx + 1, chartTop + barAreaHeight + 10);
          pdf.setFontSize(6.5);
          pdf.setTextColor(...TEXT_DARK);
          pdf.text(`${Math.round(row.value)}${unit}`, bx + 1, by - 2);
        });
      }

      function drawKpiGrid(startY, items) {
        return pdfCtx.drawKpiGrid(startY, items, 6);
      }

      // ─── PORTADA ─────────────────────────────────────────────────────────────────
      pdf.setFillColor(...BRAND_GREEN);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.setFillColor(...BRAND_LIGHT);
      pdf.rect(0, pageHeight * 0.55, pageWidth, pageHeight * 0.45, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(32);
      pdf.text("Reporte Operativo", marginX, 120);
      pdf.setFontSize(22);
      pdf.text("Dashboard AXIS ORDO", marginX, 150);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(13);
      pdf.setTextColor(180, 230, 210);
      pdf.text(`Área: ${activeAreaLabel}`, marginX, 185);
      pdf.text(`Exportado: ${exportDate}`, marginX, 205);
      pdf.setFontSize(10);
      pdf.setTextColor(140, 200, 180);
      pdf.text("Análisis integral · Producción · Pausas · SLA · Pareto · Ishikawa", marginX, 240);
      // KPIs resumen en portada
      const coverKpis = [
        { label: "Registros", value: dashboardMetrics.total },
        { label: "Cerrados", value: dashboardMetrics.completed },
        { label: "En pausa", value: dashboardMetrics.paused },
        { label: `Eficiencia ${formatMetricNumber(dashboardMetrics.efficiency ?? 100, 0)}%`, value: null },
      ];
      coverKpis.forEach((kpi, i) => {
        const bx = marginX + i * (printableWidth / 4 + 6);
        const by = pageHeight * 0.62;
        pdf.setFillColor(255, 255, 255, 0.12);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(kpi.value !== null ? 28 : 16);
        pdf.text(kpi.value !== null ? String(kpi.value) : kpi.label, bx, by + 32);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(180, 230, 210);
        if (kpi.value !== null) pdf.text(kpi.label, bx, by + 48);
      });

      // ─── PÁGINA 2: FILTROS + RESUMEN EJECUTIVO ────────────────────────────────
      pdf.addPage();
      addPageHeader("Resumen Ejecutivo", `Análisis de ${dashboardMetrics.total} registros · ${activeAreaLabel}`);
      const filterSummaryRows = [
        ["Área", activeAreaLabel],
        ["Player", dashboardFilters.responsibleId === "all" ? "Todos los players" : visibleUsers.find((u) => u.id === dashboardFilters.responsibleId)?.name || "Player filtrado"],
        ["Rango", dashboardFilters.startDate || dashboardFilters.endDate ? `${dashboardFilters.startDate || "inicio"} → ${dashboardFilters.endDate || "fin"}` : "Sin filtro por fecha"],
      ];
      autoTable(pdf, {
        startY: 66,
        head: [["Filtro", "Valor"]],
        body: filterSummaryRows,
        margin: { left: marginX, right: marginX },
        tableWidth: printableWidth * 0.45,
        styles: { fontSize: 7.5, cellPadding: 4 },
        headStyles: { fillColor: BRAND_LIGHT, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [247, 250, 248] },
      });
      // KPI grid — mismos KPIs visibles en pantalla
      const kpiItems = kpiCardsToPdfGridItems(exportKpiCardsForPdf);
      drawKpiGrid((pdf.lastAutoTable?.finalY || 66) + 18, kpiItems);

      if (!showGlobalAreaFilter && exportAreaSpotlightsForPdf.length) {
        drawSectionTable(
          "Indicadores destacados del área",
          ["Indicador", "Valor"],
          spotlightsToPdfTableBody(exportAreaSpotlightsForPdf),
          { areaAccent: getDashboardPdfAreaAccent(activeAreaLabel) },
        );
      }

      // ─── PÁGINA 3: GRÁFICA PLAYER + DISTRIBUCIÓN ─────────────────────────────
      pdf.addPage();
      addPageHeader("Análisis por Player", "Tiempo promedio, carga y distribución operativa");
      const halfW = (printableWidth - 20) / 2;
      drawMiniBarChart(marginX, 76, halfW, 140, dashboardResponsibleRows.slice(0, 10).map((r) => ({ label: r.label.split(" ")[0], value: r.averageMinutes, color: BRAND_LIGHT })), "Tiempo Promedio por Player (min)", " min");
      drawMiniBarChart(marginX + halfW + 20, 76, halfW, 140, dashboardDistributionRows.slice(0, 10).map((r) => ({ label: r.label.split(" ")[0], value: r.count, color: COLOR_BLUE })), "Distribución de Carga (registros)");
      drawSectionTable("Desempeño detallado por player", ["Player", "Área", "Prom. (min)", "Cierres", "% Carga"], dashboardResponsibleRows.map((item) => [item.label, item.area || "—", formatMetricNumber(item.averageMinutes, 1), String(item.totalRecords), `${formatMetricNumber((item.totalRecords / Math.max(dashboardMetrics.completed, 1)) * 100, 1)}%`]));

      // ─── PÁGINA 4: ANÁLISIS DE TIEMPO PRODUCTIVO VS PAUSA ───────────────────
      pdf.addPage();
      addPageHeader("Tiempo Productivo vs Pausa", "Diagnóstico de eficiencia y tiempo perdido por interrupciones");
      const timeY = 76;
      const timeData = [
        { label: "Producción", value: dashboardMetrics.productionHours ?? dashboardMetrics.totalHours, color: COLOR_GREEN },
        { label: "Pausa", value: dashboardMetrics.pauseHours, color: COLOR_RED },
      ];
      drawMiniBarChart(marginX, timeY, halfW, 110, timeData, "Distribución de Tiempo Total (horas)", " h");
      // Efficiency gauge text
      const effVal = dashboardMetrics.efficiency ?? 100;
      const effColor = effVal >= 80 ? COLOR_GREEN : effVal >= 60 ? COLOR_AMBER : COLOR_RED;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...TEXT_DARK);
      pdf.text("Eficiencia operativa global", marginX + halfW + 20, timeY);
      pdf.setFontSize(36);
      pdf.setTextColor(...effColor);
      pdf.text(`${Math.round(effVal)}%`, marginX + halfW + 20, timeY + 48);
      pdf.setFontSize(8);
      pdf.setTextColor(...TEXT_MID);
      pdf.text(effVal >= 80 ? "✓ Rendimiento óptimo" : effVal >= 60 ? "⚠ Rendimiento moderado" : "✗ Atención requerida", marginX + halfW + 20, timeY + 64);
      pdf.text(`Producción: ${formatMetricNumber(dashboardMetrics.productionHours ?? dashboardMetrics.totalHours, 2)} h`, marginX + halfW + 20, timeY + 80);
      pdf.text(`Pausa: ${formatMetricNumber(dashboardMetrics.pauseHours, 2)} h · ${dashboardMetrics.pauseCount} interrupciones`, marginX + halfW + 20, timeY + 92);

      drawSectionTable("Top de pausas — Causas de tiempo perdido", ["Motivo de pausa", "Eventos", "Minutos perdidos", "% del tiempo en pausa", "Clasificación"], pauseAnalysis.map((item) => [
        item.reason || "Sin motivo registrado",
        String(item.count),
        String(Math.round(item.totalSeconds / 60)),
        `${formatMetricNumber(item.percent, 1)}%`,
        item.cumulativePercent <= 80 ? "⚠ Crítica (80%)" : "Secundaria",
      ]));

      // ─── PÁGINA 5: SLA Y ALERTAS ─────────────────────────────────────────────
      pdf.addPage();
      addPageHeader("Registro de Alertas y Cumplimiento SLA", "Detección de retrasos y operaciones fuera del objetivo");
      const slaKpis = [
        { value: `${formatMetricNumber(dashboardMetrics.withinPercent, 1)}%`, label: "Dentro de SLA", sub: "operaciones en tiempo" },
        { value: `${formatMetricNumber(dashboardMetrics.outsidePercent, 1)}%`, label: "Fuera de SLA", sub: "requieren atención", alert: dashboardMetrics.outsidePercent > 20 },
        { value: dashboardMetrics.exceeded?.length || 0, label: "Alertas activas", sub: "excedieron límite", alert: (dashboardMetrics.exceeded?.length || 0) > 0 },
        { value: `${formatMetricNumber(dashboardMetrics.averageMinutes, 1)} min`, label: "Promedio real", sub: "vs objetivo establecido" },
      ];
      drawKpiGrid(76, slaKpis);
      drawSectionTable("Registros que excedieron el límite de tiempo", ["Operación", "Fuente", "Player", "Área", "Tiempo real", "Límite objetivo", "Exceso", "Severidad"], dashboardMetrics.exceeded.map((record) => {
        const excess = Math.max(0, Math.round(record.durationSeconds / 60 - record.limitMinutes));
        return [
          record.label,
          record.sourceLabel,
          record.responsibleName,
          record.area || "—",
          formatMinutes(record.durationSeconds / 60),
          `${record.limitMinutes} min`,
          `+${excess} min`,
          excess > record.limitMinutes ? "Crítico" : "Moderado",
        ];
      }), { columnStyles: { 6: { textColor: [220, 38, 38], fontStyle: "bold" } } });

      drawSectionTable("Actividad vs Tiempo Objetivo", ["Actividad", "Prom. real (min)", "Límite (min)", "Diferencia", "Estado"], dashboardActivityRows.map((item) => {
        const diff = item.averageMinutes - item.limitMinutes;
        return [item.label, formatMetricNumber(item.averageMinutes, 1), String(item.limitMinutes), diff >= 0 ? `+${Math.round(diff)} min` : `${Math.round(diff)} min`, item.limitMinutes > 0 && item.averageMinutes > item.limitMinutes ? "⚠ Excedido" : "✓ OK"];
      }), { columnStyles: { 4: { fontStyle: "bold" } } });

      // ─── PÁGINA 6: PARETO E ISHIKAWA ─────────────────────────────────────────
      pdf.addPage();
      addPageHeader("Análisis de Causa Raíz — Pareto + Ishikawa", "Priorización de incidencias y categorización de causas operativas");
      drawMiniBarChart(marginX, 76, printableWidth * 0.6, 130, dashboardParetoRows.slice(0, 10).map((item) => ({ label: item.label.substring(0, 10), value: item.impactSeconds / 60, color: item.cumulativePercent <= 80 ? COLOR_RED : COLOR_AMBER })), "Pareto de Incidencias — Impacto en minutos", " min");
      drawSectionTable("Pareto detallado", ["Prioridad", "Incidencia", "Eventos", "Impacto (min)", "% Individual", "% Acumulado", "Acción"], dashboardParetoRows.map((item, i) => [
        String(i + 1),
        item.label,
        String(item.count),
        String(Math.round(item.impactSeconds / 60)),
        `${formatMetricNumber(item.percent, 1)}%`,
        `${formatMetricNumber(item.cumulativePercent, 1)}%`,
        item.cumulativePercent <= 80 ? "Intervención inmediata" : "Monitoreo",
      ]), { columnStyles: { 6: { fontStyle: "bold" } } });
      drawSectionTable("Ishikawa operativo — Categorías de causa raíz", ["Categoría", "Impacto %", "Eventos", "Causa principal", "Ejemplos"], dashboardIshikawaRows.map((item) => [item.category, `${formatMetricNumber(item.impact, 1)}%`, String(item.count), item.examples?.[0] || "—", (item.examples || []).join(" · ")]));

      // ─── PÁGINA 7: TENDENCIAS Y ÁREAS ────────────────────────────────────────
      pdf.addPage();
      addPageHeader("Tendencias y Áreas Operativas", "Evolución temporal y consolidado por área");
      drawMiniBarChart(marginX, 76, halfW, 130, dashboardTrendRows.slice(0, 12).map((item) => ({ label: item.label.substring(0, 8), value: item.total, color: COLOR_BLUE })), "Tendencia de registros por periodo");
      drawMiniBarChart(marginX + halfW + 20, 76, halfW, 130, dashboardAreaRows.slice(0, 8).map((item) => ({ label: item.area.substring(0, 8), value: item.total, color: [20, 184, 166] })), "Registros por área");
      drawSectionTable("Tendencia general", ["Periodo", "Registros", "Cerrados", "En curso", "Pausados", "Horas prod."], dashboardTrendRows.map((item) => [item.label, String(item.total), String(item.completed), String(item.running || 0), String(item.paused || 0), formatMetricNumber(item.totalSeconds / 3600, 1)]));
      drawSectionTable("Consolidado por área", ["Área", "Registros", "Cerrados", "Promedio (min)", "SLA %", "Tableros / Fuentes"], dashboardAreaRows.map((item) => [item.area, String(item.total), String(item.completed), formatMetricNumber(item.averageMinutes, 1), `${formatMetricNumber(item.slaPercent, 1)}%`, String(item.boardCount)]));

      if (showGlobalAreaFilter && exportGeneralAreaPanelsForPdf.length) {
        appendGeneralAreaPanelsToPdf(pdf, pdfCtx, {
          panels: exportGeneralAreaPanelsForPdf,
          autoTable,
          formatMetricNumber,
        });
      }

      // ─── PÁGINA 8: DETALLE ÁREA -> TABLERO ───────────────────────────────────
      pdf.addPage();
      addPageHeader("Detalle Operativo por Área y Tablero", "Resumen granular con estado, eficiencia, pausas y métricas detectadas");
      drawSectionTable("Detalle consolidado", ["Área", "Tablero", "Registros por estado", "Tiempo", "Eficiencia", "Pausas top", "Métricas top", "SKU/Producto top"], filteredAreaBoardDetailedRows.flatMap((areaItem) =>
        areaItem.boards.map((board) => [
          areaItem.area,
          board.boardName,
          formatDashboardRecordStatusSummary({
            completed: board.completed,
            running: board.running,
            paused: board.paused,
            totalRecords: board.totalRecords,
            completionPercent: board.completionPercent,
          }).pdfLine,
          `${formatMetricNumber(board.productionHours, 1)}h prod / ${formatMetricNumber(board.pauseHours, 1)}h pausa`,
          `${formatMetricNumber(board.efficiencyPercent, 1)}%`,
          (board.topPauseReasons || []).slice(0, 2).map((reason) => `${reason.reason} (${formatMetricNumber((reason.seconds || 0) / 60, 1)}m)`).join(" | ") || "Sin pausas",
          (board.dynamicMetrics || []).slice(0, 2).map((metric) => `${metric.fieldLabel}: ${formatMetricNumber(metric.average, 1)}${metric.unit ? ` ${metric.unit}` : ""}`).join(" | ") || "Sin métricas",
          (board.inventoryProducts || []).slice(0, 2).map((product) => `${product.product}: ${formatMetricNumber(product.totalMinutes, 1)}m`).join(" | ") || "N/A",
        ]),
      ));
      if (dashboardBoardInsightRows.length) {
        pdf.addPage();
        addPageHeader("KPIs por tablero", "Métricas automáticas por tablero, área y flujo operativo");
        drawSectionTable(
          "Resumen por tablero",
          ["Área", "Tablero", "Registros", "Cerrados", "En curso", "Pausados", "Ciclo prom.", "Eficiencia", "Métricas top"],
          dashboardBoardInsightRows.map((board) => [
            board.area,
            board.boardName,
            String(board.totalRecords || 0),
            String(board.completed || 0),
            String(board.running || 0),
            String(board.paused || 0),
            formatMetricNumber(board.averageCycleMinutes, 1),
            `${formatMetricNumber(board.efficiencyPercent, 1)}%`,
            (board.dynamicMetrics || []).slice(0, 2).map((metric) => `${metric.fieldLabel}: ${formatMetricNumber(metric.average, 1)}${metric.unit ? ` ${metric.unit}` : ""}`).join(" | ") || "—",
          ]),
          { areaAccent: getDashboardPdfBoardAccent(dashboardBoardInsightRows[0]?.boardName, dashboardBoardInsightRows[0]?.area) },
        );
        const returnsBoard = dashboardBoardInsightRows.find((board) => board.isReturnsBoard);
        if (returnsBoard) {
          drawSectionTable(
            "Devoluciones / Reacondicionado",
            ["Indicador", "Valor"],
            [
              ["Registros totales", String(returnsBoard.totalRecords || 0)],
              ["Flujo devolución", String(returnsBoard.returnsDevolucion || 0)],
              ["Flujo reacondicionado", String(returnsBoard.returnsReacondicionado || 0)],
              ["Tarimas distintas", String(returnsBoard.tarimaCount || 0)],
              ["Piezas revisadas", String(Math.round(returnsBoard.piecesTotal || 0))],
            ],
            { areaAccent: getDashboardPdfBoardAccent(returnsBoard.boardName, returnsBoard.area) },
          );
        }
      }

      if (scopedProductPerformanceRows.length) {
        pdf.addPage();
        addPageHeader("Rendimiento por producto", "Promedios por producto con desglose de tarimas", DASHBOARD_PDF_THEME.brandLight);
        drawSectionTable(
          "Promedio por producto",
          ["Producto", "Tarimas", "Sesiones", "Piezas", "Min total", "Min/tarima", "Min/sesión", "Seg/pieza"],
          scopedProductPerformanceRows.map((product) => [
            product.product,
            String(product.palletCount || 0),
            String(product.sessions || 0),
            formatMetricNumber(product.totalPieces, 0),
            formatMetricNumber(product.totalMinutes, 1),
            formatMetricNumber(product.avgMinutesPerPallet, 1),
            formatMetricNumber(product.avgMinutesPerSession, 1),
            product.secondsPerPiece !== null ? formatMetricNumber(product.secondsPerPiece, 1) : "-",
          ]),
        );
      }

      if (scopedInventoryProductTimeRows.length) {
        pdf.addPage();
        addPageHeader("Inventario literal", "Registros de producto, tarima y merma con causas identificadas");
        drawSectionTable(
          "Inventario literal",
          ["Tablero", "Tarima", "Producto", "Piezas revisadas", "Pzas esperadas", "Pzas merma", "Pzas faltantes", "Minutos", "Player", "Causal"],
          scopedInventoryProductTimeRows.slice(0, 20).map((item) => [
            item.boardName || "—",
            item.tarimaValue || "—",
            item.productValue || "—",
            formatMetricNumber(item.piecesReviewed, 0),
            Number.isFinite(item.expectedPieces) ? formatMetricNumber(item.expectedPieces, 0) : "-",
            Number.isFinite(item.totalMermaPieces) ? formatMetricNumber(item.totalMermaPieces, 0) : "-",
            Number.isFinite(item.missingPieces) ? formatMetricNumber(item.missingPieces, 0) : "-",
            formatMetricNumber(item.durationMinutes, 1),
            item.responsibleName || "-",
            item.mermas || "-",
          ]),
          {
            styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
            columnStyles: { 0: { cellWidth: 55 }, 2: { cellWidth: 75 }, 13: { cellWidth: 90 } },
          },
        );
      }

      if (mermaAnalysisRows.length) {
        pdf.addPage();
        addPageHeader("Merma por causa", "Motivos de merma con impacto numérico y frecuencia");
        drawSectionTable(
          "Merma por causa",
          ["Motivo", "Registros", "Piezas de merma", "Piezas faltantes", "Piezas/registro"],
          mermaAnalysisRows.map((row) => [
            row.motivo || "-",
            String(row.count || 0),
            String(formatMetricNumber(row.totalPiezas || 0, 0)),
            String(formatMetricNumber(row.totalPiezasFaltantes || 0, 0)),
            String(formatMetricNumber(row.count ? row.totalPiezas / row.count : 0, 2)),
          ]),
          { styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak" } },
        );
      }

      // ─── PÁGINA 9: CATÁLOGO ───────────────────────────────────────────────────
      pdf.addPage();
      addPageHeader("Catálogo de Actividades", "Tipo, frecuencia y distribución del catálogo operativo");
      drawSectionTable("Catálogo por tipo", ["Tipo", "Cantidad", "% del catálogo"], dashboardCatalogTypeRows.map((item) => [item.label, String(item.value), `${dashboardMetrics.catalogActiveCount ? formatMetricNumber((item.value / dashboardMetrics.catalogActiveCount) * 100, 1) : 0}%`]));
      drawSectionTable("Catálogo por frecuencia", ["Frecuencia", "Actividades", "% del catálogo"], dashboardCatalogFrequencyRows.map((item) => [item.label, String(item.value), `${dashboardMetrics.catalogActiveCount ? formatMetricNumber((item.value / dashboardMetrics.catalogActiveCount) * 100, 1) : 0}%`]));

      // ─── PÁGINA 10: DIAGNÓSTICO E INFORME EJECUTIVO ──────────────────────────
      pdf.addPage();
      addPageHeader("Informe de Diagnóstico Operativo", "Identificación de problemas, cuellos de botella y recomendaciones");
      let diagY = 76;
      const diagSections = [];

      if (dashboardMetrics.paused > 0) {
        diagSections.push({ title: "⚠ Operaciones pausadas activamente", detail: `Hay ${dashboardMetrics.paused} operación(es) detenida(s). Pausa acumulada: ${formatMetricNumber(dashboardMetrics.pauseHours, 1)} h.`, level: "Crítico" });
      }
      if ((dashboardMetrics.efficiency ?? 100) < 80) {
        diagSections.push({ title: "⚠ Eficiencia operativa por debajo del 80%", detail: `Eficiencia actual: ${formatMetricNumber(dashboardMetrics.efficiency ?? 100, 1)}%. El tiempo de producción real es inferior al tiempo total transcurrido.`, level: "Importante" });
      }
      if (dashboardMetrics.outsidePercent > 20) {
        diagSections.push({ title: "⚠ Alto porcentaje fuera de SLA", detail: `${formatMetricNumber(dashboardMetrics.outsidePercent, 1)}% de operaciones superaron el tiempo objetivo. Revisar capacidad y distribución.`, level: "Crítico" });
      }
      if (pauseAnalysis.length > 0) {
        const topPause = pauseAnalysis[0];
        diagSections.push({ title: `⚠ Principal causa de pausa: "${topPause.reason || "Sin motivo"}"`, detail: `${topPause.count} evento(s) · ${Math.round(topPause.totalSeconds / 60)} min perdidos · ${formatMetricNumber(topPause.percent, 1)}% del tiempo en pausa.`, level: "Importante" });
      }
      if (dashboardParetoRows.length > 0 && dashboardParetoRows[0].cumulativePercent <= 80) {
        diagSections.push({ title: `📊 Pareto: "${dashboardParetoRows[0].label}" genera ${formatMetricNumber(dashboardParetoRows[0].percent, 1)}% del impacto`, detail: "Concentrar esfuerzos en las primeras 3 causas del Pareto resolverá el 80% del tiempo perdido.", level: "Recomendación" });
      }
      if (diagSections.length === 0) {
        diagSections.push({ title: "✓ Sin alertas críticas detectadas", detail: "Los indicadores operativos están dentro de parámetros normales.", level: "OK" });
      }
      diagSections.forEach((item) => {
        const levelColor = item.level === "Crítico" ? COLOR_RED : item.level === "Importante" ? COLOR_AMBER : item.level === "Recomendación" ? COLOR_BLUE : COLOR_GREEN;
        pdf.setFillColor(...levelColor);
        pdf.roundedRect(marginX, diagY, 4, 32, 2, 2, "F");
        pdf.setFillColor(249, 250, 249);
        pdf.setDrawColor(220, 228, 220);
        pdf.roundedRect(marginX + 4, diagY, printableWidth - 4, 32, 2, 2, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...TEXT_DARK);
        pdf.text(item.title, marginX + 12, diagY + 12);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...TEXT_MID);
        pdf.text(item.detail, marginX + 12, diagY + 24);
        pdf.setFontSize(7);
        pdf.setTextColor(...levelColor);
        pdf.text(item.level, pageWidth - marginX, diagY + 12, { align: "right" });
        diagY += 40;
      });

      autoTable(pdf, {
        startY: diagY + 8,
        head: [["Prioridad", "Acción recomendada", "Indicador afectado", "Impacto estimado"]],
        body: [
          ["Alta", "Atender operaciones pausadas de inmediato", "Eficiencia operativa", `${formatMetricNumber(dashboardMetrics.pauseHours, 1)} h recuperables`],
          ["Alta", "Revisar causas top del Pareto", "Tiempo en pausa", `${pauseAnalysis[0] ? Math.round(pauseAnalysis[0].totalSeconds / 60) : 0} min`],
          ["Media", "Redistribuir carga entre players", "Distribución", `${dashboardResponsibleRows.length} players`],
          ["Media", "Monitorear SLA en actividades excedidas", "Cumplimiento SLA", `${formatMetricNumber(dashboardMetrics.outsidePercent, 1)}% fuera`],
          ["Baja", "Revisar frecuencia del catálogo", "Catálogo activo", `${dashboardMetrics.catalogActiveCount} actividades`],
        ],
        margin: { left: marginX, right: marginX },
        tableWidth: printableWidth,
        styles: { fontSize: 7.5, cellPadding: 5 },
        headStyles: { fillColor: BRAND_LIGHT, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [247, 250, 248] },
        columnStyles: { 0: { fontStyle: "bold", textColor: [180, 40, 40] } },
      });

      addPageFooter();
      pdf.save(buildDashboardPdfFileName({
        areaLabel: activeAreaLabel,
        sectionId: selectedAreaSectionId,
        startDate: dashboardFilters.startDate,
        endDate: dashboardFilters.endDate,
        isGeneralView: showGlobalAreaFilter,
      }));
      pushAppToast?.("PDF del dashboard descargado con todos los KPIs visibles.", "success");
    } catch (error) {
      pushAppToast?.(error?.message || "No fue posible exportar el PDF del dashboard.", "danger");
    } finally {
      setIsExportingPdf(false);
    }
  }

  const hasActivityUsage = Number(dashboardMetrics.activityRecords || 0) > 0;
  const hasAnyUsage = Number(dashboardMetrics.total || 0) > 0;
  const hasCatalogUsage = Number(dashboardMetrics.catalogActiveCount || 0) > 0;
  const hasActivityGoalUsage = Array.isArray(dashboardActivityRows) && dashboardActivityRows.length > 0;
  const hasDistributionUsage = Array.isArray(dashboardDistributionRows) && dashboardDistributionRows.length > 0;
  const hasCatalogTypeUsage = Array.isArray(dashboardCatalogTypeRows) && dashboardCatalogTypeRows.some((item) => Number(item?.value || 0) > 0);
  const hasCatalogFrequencyUsage = Array.isArray(dashboardCatalogFrequencyRows) && dashboardCatalogFrequencyRows.length > 0;
  const hasPauseUsage = Number(dashboardMetrics.pauseCount || 0) > 0 || Number(dashboardMetrics.pauseHours || 0) > 0 || Number(dashboardMetrics.paused || 0) > 0;
  const hasSlaUsage = Number(dashboardMetrics.withinPercent || 0) > 0 || Number(dashboardMetrics.outsidePercent || 0) > 0 || Number(dashboardMetrics.exceeded?.length || 0) > 0;

  const executiveKpiCards = [
    { title: "Registros analizados", value: String(dashboardMetrics.total), subtitle: "actividades y filas dentro del filtro", tone: "cyan", icon: ClipboardList, visible: true },
    { title: "Cerrados", value: String(dashboardMetrics.completed), subtitle: "registros terminados", tone: "green", icon: CircleCheckBig, visible: true },
    { title: "En curso", value: String(dashboardMetrics.running), subtitle: "operaciones activas", tone: "amber", icon: Play, visible: true },
    { title: "Pausados", value: String(dashboardMetrics.paused), subtitle: "registros detenidos", tone: "red", icon: PauseCircle, visible: true },
    {
      title: "Tiempo promedio",
      value: `${formatMetricNumber(dashboardMetrics.averageMinutes, 2)} min`,
      valueMeta: `${formatMinutesToHourMinute(dashboardMetrics.averageMinutes)}`,
      subtitle: "promedio de cierre",
      tone: "cyan",
      icon: Gauge,
      visible: hasAnyUsage,
    },
    {
      title: "Mediana",
      value: `${formatMetricNumber(dashboardMetrics.medianMinutes, 2)} min`,
      valueMeta: `${formatMinutesToHourMinute(dashboardMetrics.medianMinutes)}`,
      subtitle: "punto medio del ciclo",
      tone: "slate",
      icon: Clock3,
      visible: hasAnyUsage,
    },
    { title: "Horas productivas", value: `${formatMetricNumber(dashboardMetrics.productionHours ?? dashboardMetrics.totalHours, 1)} h`, subtitle: "tiempo real de producción", tone: "green", icon: CalendarDays, visible: hasAnyUsage },
    { title: "Horas en pausa", value: `${formatMetricNumber(dashboardMetrics.pauseHours, 1)} h`, subtitle: "tiempo no productivo acumulado", tone: "red", icon: OctagonAlert, visible: hasPauseUsage },
    { title: "Eficiencia operativa", value: `${formatMetricNumber(dashboardMetrics.efficiency ?? 100, 1)}%`, subtitle: "producción / tiempo total", tone: dashboardMetrics.efficiency >= 80 ? "lime" : dashboardMetrics.efficiency >= 60 ? "amber" : "red", icon: Zap, progress: dashboardMetrics.efficiency, visible: hasAnyUsage },
    { title: "Cumplimiento SLA", value: `${formatMetricNumber(dashboardMetrics.withinPercent, 1)}%`, subtitle: "porcentaje dentro del límite", tone: "lime", icon: Zap, progress: dashboardMetrics.withinPercent, visible: hasSlaUsage && hasActivityUsage },
    { title: "Fuera de SLA", value: `${formatMetricNumber(dashboardMetrics.outsidePercent, 1)}%`, subtitle: "proporción fuera del objetivo", tone: "amber", icon: AlertTriangle, progress: dashboardMetrics.outsidePercent, visible: hasSlaUsage && hasActivityUsage },
    { title: "Pausas registradas", value: String(dashboardMetrics.pauseCount), subtitle: "interrupciones con log", tone: "slate", icon: Pause, visible: hasPauseUsage },
    { title: "Áreas activas", value: String(dashboardMetrics.areaCount), subtitle: "áreas con movimiento operativo", tone: "cyan", icon: Users, visible: hasAnyUsage },
    { title: "Catálogo activo", value: String(dashboardMetrics.catalogActiveCount), subtitle: "actividades disponibles", tone: "slate", icon: ClipboardList, visible: hasCatalogUsage },
    { title: "Obligatorias", value: String(dashboardMetrics.catalogMandatoryCount), subtitle: "actividades base", tone: "green", icon: CircleCheckBig, visible: hasCatalogUsage },
    { title: "Ocasionales", value: String(dashboardMetrics.catalogOptionalCount), subtitle: "actividades complementarias", tone: "amber", icon: PauseCircle, visible: hasCatalogUsage },
    { title: "Horas totales", value: `${formatMetricNumber(dashboardMetrics.totalHours, 1)} h`, subtitle: "tiempo completado acumulado", tone: "cyan", icon: CalendarDays, visible: hasAnyUsage },
    { title: "Frecuencias activas", value: String(dashboardMetrics.catalogFrequencyTypes), subtitle: "tipos de periodicidad en uso", tone: "cyan", icon: CalendarDays, visible: hasCatalogUsage },
  ].filter((item) => item.visible !== false);

  const unifiedDashboardKpiCards = useMemo(() => {
    if (!showGlobalAreaFilter) {
      const areaCards = buildAreaExecutiveKpiCards(selectedAreaSectionId, {
        metrics: dashboardMetrics,
        boardRows: dashboardBoardInsightRows,
        inventoryRows: scopedInventoryProductTimeRows,
        mermaRows: mermaAnalysisRows,
        pauseAnalysis,
        palletRows: dashboardPalletLeaderboardRows,
        responsibleRows: dashboardResponsibleRows,
        auditMetrics: processAuditMetrics,
      });
      const bridgeCards = buildAreaBridgeKpiCards(globalPeriodMetrics, dashboardMetrics);
      return areaCards.concat(bridgeCards);
    }

    const essentialTitles = new Set([
      "Registros analizados",
      "Cerrados",
      "En curso",
      "Pausados",
      "Tiempo promedio",
      "Horas productivas",
      "Eficiencia operativa",
      "Áreas activas",
    ]);
    const globalCards = executiveKpiCards
      .filter((item) => essentialTitles.has(item.title))
      .map((item) => ({
        cardKey: `global-${item.title}`,
        title: item.title,
        value: item.value,
        valueMeta: item.valueMeta,
        subtitle: item.subtitle,
        tone: item.tone,
        icon: item.icon,
        progress: item.progress,
      }));
    return globalCards.concat(dashboardBoardKpiCards || []);
  }, [
    dashboardBoardInsightRows,
    dashboardBoardKpiCards,
    dashboardMetrics,
    dashboardPalletLeaderboardRows,
    dashboardResponsibleRows,
    executiveKpiCards,
    mermaAnalysisRows,
    pauseAnalysis,
    globalPeriodMetrics,
    processAuditMetrics,
    scopedInventoryProductTimeRows,
    selectedAreaSectionId,
    showGlobalAreaFilter,
  ]);

  const areaDashboardTheme = areaDashboardThemeEarly;

  const areaDashboardSpotlights = useMemo(() => {
    if (showGlobalAreaFilter) return [];
    return buildAreaDashboardSpotlights(areaDashboardTheme, dashboardMetrics, {
      boards: dashboardBoardInsightRows.length,
      players: dashboardResponsibleRows.length,
      slaPercent: Math.round(dashboardMetrics.withinPercent || 0),
      hours: `${formatMetricNumber(dashboardMetrics.totalHours, 1)} h`,
      inventorySkus: scopedInventoryProductTimeRows.length,
      mermaRows: mermaAnalysisRows.length,
      pauseCauses: pauseAnalysis.length,
      running: dashboardMetrics.running,
      paused: dashboardMetrics.paused,
    });
  }, [
    areaDashboardTheme,
    dashboardBoardInsightRows.length,
    dashboardMetrics,
    dashboardResponsibleRows.length,
    mermaAnalysisRows.length,
    pauseAnalysis.length,
    scopedInventoryProductTimeRows.length,
    showGlobalAreaFilter,
  ]);

  const exportAreaPanelToPdf = useCallback(async (panel) => {
    if (!canExportDashboardActions || !panel) return;
    if (exportingAreaPanelId) return;
    try {
      setExportingAreaPanelId(panel.section.id);
      await exportAreaPanelDashboardPdf({
        panel,
        dashboardFilters,
        visibleUsers,
        formatMetricNumber,
      });
      pushAppToast?.(`PDF de ${panel.section.label} descargado.`, "success");
    } catch (error) {
      pushAppToast?.(error?.message || "No fue posible exportar el PDF del área.", "danger");
    } finally {
      setExportingAreaPanelId(null);
    }
  }, [
    canExportDashboardActions,
    dashboardFilters,
    exportingAreaPanelId,
    formatMetricNumber,
    pushAppToast,
    visibleUsers,
  ]);

  const dashboardModeClass = showGlobalAreaFilter
    ? "dashboard-page--general"
    : `dashboard-page--section dashboard-page--${selectedAreaSectionId} dashboard-page--layout-${areaDashboardTheme.layout}`;

  const dashboardThemeStyle = showGlobalAreaFilter
    ? undefined
    : {
        "--dash-accent": areaDashboardTheme.accent,
        "--dash-accent-soft": areaDashboardTheme.accentSoft,
        "--dash-accent-border": areaDashboardTheme.accentBorder,
      };

  const zoneWrap = (zoneKey, node) => (
    <div className={showGlobalAreaFilter ? "dashboard-zone-wrap" : getAreaDashboardZoneWrapClass(areaDashboardTheme, zoneKey)}>
      {node}
    </div>
  );

  return (
    <section
      ref={dashboardExportRef}
      className={`dashboard-page dashboard-page-v2 ${dashboardModeClass}`}
      style={dashboardThemeStyle}
    >
      <header className={`dashboard-hero dashboard-hero--${showGlobalAreaFilter ? "general" : areaDashboardTheme.heroVariant}`}>
        <div className="dashboard-hero-copy">
          <p className="dashboard-hero-eyebrow">{showGlobalAreaFilter ? "Vista corporativa" : areaDashboardTheme.eyebrow}</p>
          <h2 className="dashboard-hero-title">{showGlobalAreaFilter ? "Dashboard general" : `Dashboard · ${activeAreaLabel}`}</h2>
          <p className="dashboard-hero-subtitle">
            {showGlobalAreaFilter
              ? "Cada bloque resume un aspecto distinto. Los datos de tableros se muestran tal cual fueron capturados."
              : areaDashboardTheme.subtitle}
          </p>
        </div>
        {areaDashboardTheme.heroVariant === "scorecard" && !showGlobalAreaFilter ? (
          <div className="dashboard-hero-scorecard" aria-label="Cumplimiento SLA">
            <span>SLA en periodo</span>
            <strong>{formatMetricNumber(dashboardMetrics.withinPercent, 0)}%</strong>
            <small>{dashboardMetrics.exceeded?.length || 0} fuera de objetivo</small>
          </div>
        ) : (
          <div className="dashboard-hero-stats">
            <div className="dashboard-hero-stat">
              <span>Registros</span>
              <strong>{dashboardMetrics.total}</strong>
            </div>
            <div className="dashboard-hero-stat">
              <span>Cerrados</span>
              <strong>{dashboardMetrics.completed}</strong>
            </div>
            <div className="dashboard-hero-stat">
              <span>{showGlobalAreaFilter ? "Áreas" : "Tableros"}</span>
              <strong>{showGlobalAreaFilter ? dashboardMetrics.areaCount : dashboardBoardInsightRows.length}</strong>
            </div>
          </div>
        )}
      </header>

      {liveOperationalBoardAlerts.length ? (
        <section className="dashboard-live-alerts surface-card" aria-label="Alertas operativas en vivo">
          <header className="dashboard-live-alerts-header">
            <div>
              <h3>Operación en vivo</h3>
              <p className="subtle-line">Clic en una alerta para ir al tablero vigente y ubicar la actividad.</p>
              <button
                type="button"
                className="icon-button dashboard-live-alerts-open"
                onClick={() => setLiveOperationalAlertsModalOpen(true)}
              >
                Abrir listado de alertas ({liveOperationalBoardAlerts.length})
              </button>
            </div>
            <button
              type="button"
              className="chip danger"
              onClick={() => setLiveOperationalAlertsModalOpen(true)}
              title="Ver listado de alertas"
            >
              {liveOperationalBoardAlerts.length}
            </button>
          </header>
          <div className="custom-board-sla-summary board-operational-alerts dashboard-live-alerts-chips dashboard-live-alerts-chips-inline">
            {liveOperationalBoardAlerts.slice(0, 3).map((record) => {
              const isDelayed = record.excessSeconds > 0 && record.status !== STATUS_FINISHED;
              const chipTone = isDelayed ? "danger" : record.status === STATUS_PAUSED ? "warning" : "primary";
              const detail = isDelayed
                ? `retraso +${formatDurationClock(record.excessSeconds)}`
                : record.status === STATUS_PAUSED
                  ? "en pausa"
                  : "en curso";
              return (
                <button
                  key={record.id}
                  type="button"
                  className={`chip ${chipTone} custom-board-sla-chip`}
                  onClick={() => goToBoardFromDashboardRecord(record, { openPauseDetails: record.status === STATUS_PAUSED })}
                  title={`Ir a ${record.label} en ${record.boardName}`}
                >
                  {record.label} · {detail} · {record.boardName}
                </button>
              );
            })}
            {liveOperationalBoardAlerts.length > 3 ? (
              <button
                type="button"
                className="chip custom-board-sla-chip custom-board-sla-chip-more"
                onClick={() => setLiveOperationalAlertsModalOpen(true)}
              >
                +{liveOperationalBoardAlerts.length - 3} alertas más
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {!showGlobalAreaFilter && areaDashboardSpotlights.length ? (
        <div className={`dashboard-area-spotlight dashboard-area-spotlight--${areaDashboardTheme.layout}`}>
          {areaDashboardSpotlights.map((item) => (
            <article key={item.key} className={`dashboard-area-spotlight-card dashboard-area-spotlight-card--${item.tone}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      ) : null}

      {showGlobalAreaFilter ? (
      <nav className="dashboard-area-hub" aria-label="Navegación entre dashboard general y áreas">
        <span className="dashboard-area-hub-label">Ir al dashboard del área</span>
        <div className="dashboard-area-hub-links">
          {linkedAreaSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="dashboard-area-hub-link"
              onClick={() => navigateToAreaDashboard(section, dashboardNavigationHandlers)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </nav>
      ) : null}

      <div className="dashboard-topbar dashboard-topbar-v2">
        <div className="dashboard-topbar-heading">
          <h3>Filtros del periodo</h3>
        </div>
        <div className="dashboard-filter-panel dashboard-filter-panel-v2">
          <div className="dashboard-filter-grid-v2">
            <div className="dashboard-filter-grid-fields">
              <label className="dashboard-filter-field dashboard-filter-field-range">
                <span>Rango de fechas</span>
                <DashboardDateRangePicker
                  startDate={dashboardFilters.startDate}
                  endDate={dashboardFilters.endDate}
                  onChange={({ startDate, endDate }) => setDashboardFilters((current) => ({ ...current, startDate, endDate }))}
                />
              </label>
              {showGlobalAreaFilter ? (
                <label className="dashboard-filter-field dashboard-filter-field-area">
                  <span>Área</span>
                  <select value={dashboardFilters.area} onChange={(event) => setDashboardFilters((current) => ({ ...current, area: event.target.value }))}>
                    {dashboardAreaOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="dashboard-filter-field dashboard-filter-field-area">
                  <span>Área vinculada</span>
                  <span className="dashboard-filter-locked-area" title="Sincronizada con el menú lateral">
                    {activeAreaLabel}
                  </span>
                </label>
              )}
              <label className="dashboard-filter-field dashboard-filter-field-player">
                <span>Player</span>
                <select value={dashboardFilters.responsibleId} onChange={(event) => setDashboardFilters((current) => ({ ...current, responsibleId: event.target.value }))}>
                  <option value="all">Todos los players</option>
                  {visibleUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            </div>
            <div className="dashboard-action-row dashboard-filter-inline-actions dashboard-filter-grid-actions" role="group" aria-label="Acciones del dashboard">
              {canManageDashboardActions ? (
                <button
                  type="button"
                  className="icon-button dashboard-filter-icon-button"
                  onClick={() => setConfirmResetOpen(true)}
                  title="Reiniciar datos reales del dashboard"
                  aria-label="Reiniciar datos reales del dashboard"
                >
                  <RotateCcw size={16} />
                </button>
              ) : null}
              {canManageDashboardActions ? (
                <button
                  type="button"
                  className="icon-button dashboard-filter-icon-button"
                  onClick={isDemoMode ? deactivateDemoMode : activateDemoMode}
                  title={isDemoMode ? "Desactivar demo" : "Activar demo"}
                  aria-label={isDemoMode ? "Desactivar demo" : "Activar demo"}
                  aria-pressed={isDemoMode}
                  style={isDemoMode ? { color: "#f59e0b" } : undefined}
                >
                  <Zap size={16} />
                </button>
              ) : null}
              {canExportDashboardActions ? (
                <button
                  type="button"
                  className="icon-button dashboard-filter-icon-button"
                  onClick={exportDashboardToPdf}
                  disabled={isExportingPdf}
                  title={isExportingPdf ? "Generando PDF…" : "Descargar PDF con todos los KPIs visibles"}
                  aria-label={isExportingPdf ? "Generando PDF…" : "Descargar PDF con todos los KPIs visibles"}
                >
                  <Download size={16} />
                </button>
              ) : null}
              <button
                type="button"
                className="icon-button dashboard-filter-icon-button"
                onClick={() => setDashboardSectionsOpen({
                  executive: !areAllSectionsOpen,
                  people: !areAllSectionsOpen,
                  trends: !areAllSectionsOpen,
                  causes: !areAllSectionsOpen,
                  alerts: !areAllSectionsOpen,
                })}
                title={areAllSectionsOpen ? "Contraer todo" : "Expandir todo"}
                aria-label={areAllSectionsOpen ? "Contraer todo" : "Expandir todo"}
                aria-pressed={areAllSectionsOpen}
              >
                {areAllSectionsOpen ? <PauseCircle size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isDashboardSectionEnabled("executive") ? zoneWrap("executive", (
      <DashboardSection zone="executive" title={showGlobalAreaFilter ? "Resumen corporativo" : areaDashboardTheme.executiveTitle} subtitle={showGlobalAreaFilter ? "Totales del periodo. Debajo verás el dashboard completo de cada área con sus KPIs específicos." : areaDashboardTheme.executiveSubtitle} summary={`${dashboardMetrics.total} registros · ${dashboardMetrics.completed} cerrados · ${dashboardAreaRows.length} áreas activas`} icon={Gauge} open={dashboardSectionsOpen.executive} onToggle={() => setDashboardSectionsOpen((current) => ({ ...current, executive: !current.executive }))}>
        <div className={`dashboard-kpi-bento-grid dashboard-kpi-bento-grid-6 dashboard-kpi-bento-grid-compact-cards${!showGlobalAreaFilter ? ` dashboard-kpi-bento-grid--area-${areaDashboardTheme.layout}` : ""}`}>
          {unifiedDashboardKpiCards.map((item) => (
            <DashboardKpiBento
              key={item.cardKey}
              title={item.title}
              value={item.valueMeta ? `${item.value} (${item.valueMeta})` : item.value}
              subtitle={item.subtitle}
              tone={item.tone}
              icon={item.icon || Gauge}
              progress={item.progress}
              compact
            />
          ))}
        </div>
        {!unifiedDashboardKpiCards.length ? (
          <p className="dashboard-empty-text">No hay indicadores para el filtro actual.</p>
        ) : null}
        {!showGlobalAreaFilter && dashboardBoardInsightRows.length > 0 ? (
          <div className="dashboard-area-board-summary">
            <h4 className="dashboard-area-board-summary-title">Tableros del área en este periodo</h4>
            <div className="dashboard-table-wrap">
              <table className="dashboard-table-clean dashboard-table-compact">
                <thead>
                  <tr>
                    <th>Tablero</th>
                    <th>Registros</th>
                    <th>Cumplimiento</th>
                    <th>Piezas</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardBoardInsightRows.slice(0, 12).map((board) => (
                    <tr key={board.key}>
                      <td>{board.boardName}</td>
                      <td>{board.totalRecords}</td>
                      <td>{Math.round(board.completionPercent || 0)}%</td>
                      <td>{board.piecesTotal > 0 ? formatMetricNumber(board.piecesTotal, 0) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </DashboardSection>
      )) : null}

      {showGlobalAreaFilter && isDashboardSectionEnabled("areas") ? zoneWrap("areas", (
      <DashboardSection
        zone="areas"
        title="Dashboards por área operativa"
        subtitle="Cada bloque replica el dashboard dedicado del área con sus KPIs propios (mismo periodo y filtros que el general)."
        summary={`${generalAreaDashboardPanels.filter((panel) => panel.hasActivity).length} con actividad · ${generalAreaDashboardPanels.length} áreas en el sistema`}
        icon={BarChart3}
        open={dashboardSectionsOpen.byArea ?? true}
        onToggle={() => setDashboardSectionsOpen((current) => ({ ...current, byArea: !(current.byArea ?? true) }))}
      >
        <div className="dashboard-general-areas-stack">
          {generalAreaDashboardPanels.map((panel) => (
            <article
              key={panel.section.id}
              className={`dashboard-general-area-panel dashboard-general-area-panel--${panel.theme.layout}${panel.hasActivity ? "" : " dashboard-general-area-panel--empty"}`}
              style={panel.themeStyle}
            >
              <header className={`dashboard-general-area-panel-hero dashboard-hero--${panel.theme.heroVariant}`}>
                <div className="dashboard-general-area-panel-hero-copy">
                  <p className="dashboard-hero-eyebrow">{panel.theme.eyebrow}</p>
                  <h3 className="dashboard-general-area-panel-title">{panel.section.label}</h3>
                  <p className="dashboard-hero-subtitle">{panel.theme.subtitle}</p>
                </div>
                <div className="dashboard-general-area-panel-hero-meta">
                  {panel.hasActivity ? (
                    <span className="dashboard-general-area-share">{panel.sharePercent}% del general</span>
                  ) : (
                    <span className="dashboard-general-area-share dashboard-general-area-share--muted">Sin actividad</span>
                  )}
                  <div className="dashboard-general-area-panel-actions">
                    {canExportDashboardActions ? (
                      <button
                        type="button"
                        className="dashboard-general-area-download-btn"
                        onClick={() => exportAreaPanelToPdf(panel)}
                        disabled={exportingAreaPanelId === panel.section.id}
                        title="Descargar PDF con todos los KPIs de esta área"
                      >
                        <Download size={14} />
                        {exportingAreaPanelId === panel.section.id ? "Generando…" : "Descargar PDF"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="dashboard-general-area-open-btn"
                      onClick={() => navigateToAreaDashboard(panel.section, dashboardNavigationHandlers)}
                    >
                      Abrir dashboard
                    </button>
                  </div>
                </div>
              </header>

              {panel.spotlights.length ? (
                <div className={`dashboard-area-spotlight dashboard-area-spotlight--${panel.theme.layout}`}>
                  {panel.spotlights.map((item) => (
                    <article key={`${panel.section.id}-${item.key}`} className={`dashboard-area-spotlight-card dashboard-area-spotlight-card--${item.tone}`}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : null}

              {panel.dataSourceNote ? (
                <p className="dashboard-general-area-source-note">{panel.dataSourceNote}</p>
              ) : null}

              <div className={`dashboard-kpi-bento-grid dashboard-kpi-bento-grid-6 dashboard-kpi-bento-grid-compact-cards dashboard-kpi-bento-grid--area-${panel.theme.layout}`}>
                {panel.kpiCards.map((item) => (
                  <DashboardKpiBento
                    key={`${panel.section.id}-${item.cardKey}`}
                    title={item.title}
                    value={item.valueMeta ? `${item.value} (${item.valueMeta})` : item.value}
                    subtitle={item.subtitle}
                    tone={item.tone}
                    icon={item.icon || Gauge}
                    progress={item.progress}
                    compact
                  />
                ))}
              </div>

              {panel.boardRows.length > 0 ? (
                <div className="dashboard-area-board-summary">
                  <h4 className="dashboard-area-board-summary-title">Tableros · {panel.section.label}</h4>
                  <div className="dashboard-table-wrap">
                    <table className="dashboard-table-clean dashboard-table-compact">
                      <thead>
                        <tr>
                          <th>Tablero</th>
                          <th>Registros</th>
                          <th>Cumplimiento</th>
                          <th>Piezas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panel.boardRows.slice(0, 8).map((board) => (
                          <tr key={`${panel.section.id}-${board.key}`}>
                            <td>{board.boardName}</td>
                            <td>{board.totalRecords}</td>
                            <td>{Math.round(board.completionPercent || 0)}%</td>
                            <td>{board.piecesTotal > 0 ? formatMetricNumber(board.piecesTotal, 0) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="dashboard-empty-text">Sin registros de tableros en el periodo para esta área.</p>
              )}
            </article>
          ))}
        </div>
      </DashboardSection>
      )) : null}

      {isDashboardSectionEnabled("players") ? zoneWrap("players", (
      <DashboardSection zone="players" title={showGlobalAreaFilter ? "Análisis por player" : (areaDashboardTheme.playersTitle || "Análisis por player")} subtitle={showGlobalAreaFilter ? "Desempeño individual, carga y cumplimiento por persona." : (areaDashboardTheme.playersSubtitle || "Desempeño individual y carga del periodo.")} summary={`${dashboardResponsibleRows.length} players con métricas`} icon={Users} open={dashboardSectionsOpen.people} onToggle={() => setDashboardSectionsOpen((current) => ({ ...current, people: !current.people }))}>
        <div className="dashboard-main-grid">
          <article className="dashboard-panel dashboard-panel-wide">
            <div className="dashboard-panel-header">
              <h3>Tiempo Promedio por Player</h3>
              <div className="dashboard-chart-toggle">
                <button
                  type="button"
                  className={`dashboard-chart-toggle-btn${peopleChartType === "bar" ? " active" : ""}`}
                  onClick={() => setPeopleChartType("bar")}
                  title="Barras horizontales"
                  aria-pressed={peopleChartType === "bar"}
                >
                  <BarChart3 size={13} />
                  <span>Barras</span>
                </button>
                <button
                  type="button"
                  className={`dashboard-chart-toggle-btn${peopleChartType === "line" ? " active" : ""}`}
                  onClick={() => setPeopleChartType("line")}
                  title="Línea con puntos por player"
                  aria-pressed={peopleChartType === "line"}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                  <span>Líneas</span>
                </button>
              </div>
            </div>
            {peopleChartType === "bar" ? (
              <div className="dashboard-bars-list">
                {dashboardResponsibleRows.map((item) => (
                  <DashboardBarRow key={item.responsibleId} label={item.label} value={item.averageMinutes} max={item.max} color={item.color} trailing={`${Math.round(item.averageMinutes)} min · ${item.totalRecords} cierres`} initial={item.initial} />
                ))}
              </div>
            ) : (
              <DashboardLineChart
                series={[
                  {
                    key: "avgTime",
                    label: "Tiempo promedio (min)",
                    color: "#0ea5e9",
                    valueSuffix: " min",
                    data: dashboardResponsibleRows.map((item) => ({ label: item.label.split(" ")[0], y: Math.round(item.averageMinutes) })),
                  },
                  {
                    key: "totalRecords",
                    label: "Total registros",
                    color: "#405db0",
                    data: dashboardResponsibleRows.map((item) => ({ label: item.label.split(" ")[0], y: item.totalRecords })),
                  },
                ]}
                emptyLabel="No hay datos de players para mostrar."
              />
            )}
          </article>

          <aside className="dashboard-panel dashboard-panel-rank">
            <div className="dashboard-panel-header">
              <h3>Ranking de Desempeño</h3>
              <Clock3 size={18} />
            </div>
            <ol className="dashboard-rank-list">
              {dashboardResponsibleRows.map((item, index) => (
                <DashboardRankItem key={item.responsibleId} index={index + 1} label={item.label} value={`${Math.round(item.averageMinutes)} min prom. · ${item.totalRecords} cierres`} color={getResponsibleVisual(item.label).badge} highlighted={index === 0} />
              ))}
            </ol>
          </aside>
        </div>

        {(hasActivityGoalUsage || hasDistributionUsage) ? (
        <>
        <div className="dashboard-main-grid dashboard-lower-middle-grid">
          {hasActivityGoalUsage ? (
          <article className="dashboard-panel dashboard-panel-half">
            <div className="dashboard-panel-header">
              <h3>Actividad vs. Tiempo Objetivo</h3>
              <AlertTriangle size={18} />
            </div>
            <div className="dashboard-progress-list">
              {dashboardActivityRows.map((item) => (
                <DashboardProgressMetric key={item.label} label={item.label} valueText={`${Math.round(item.averageMinutes)} / ${item.limitMinutes} min`} percent={item.percent} color={item.color} />
              ))}
            </div>
          </article>
          ) : null}

          {hasDistributionUsage ? (
          <article className="dashboard-panel dashboard-panel-half">
            <div className="dashboard-panel-header">
              <h3>Distribución de Carga</h3>
              <div className="dashboard-chart-toggle">
                <button
                  className={`dashboard-chart-toggle-btn${distributionChartType === "pie" ? " active" : ""}`}
                  onClick={() => setDistributionChartType("pie")}
                >Pastel</button>
                <button
                  className={`dashboard-chart-toggle-btn${distributionChartType === "line" ? " active" : ""}`}
                  onClick={() => setDistributionChartType("line")}
                >Líneas</button>
              </div>
            </div>
            {distributionChartType === "pie" ? (
              <>
                <DashboardPieChart rows={dashboardDistributionRows} />
                <div className="dashboard-progress-list dashboard-distribution-list">
                  {dashboardDistributionRows.map((item) => (
                    <DashboardProgressMetric key={item.responsibleId} label={item.label} valueText={`${item.count} registros · ${Math.round(item.percent)}%`} percent={item.percent} color={item.color} />
                  ))}
                </div>
              </>
            ) : (
              <DashboardLineChart
                series={[{
                  label: "Registros por player",
                  color: "#0ea5e9",
                  data: dashboardDistributionRows.map((item) => ({ label: item.label.split(" ")[0], y: item.count })),
                  valueSuffix: " reg.",
                }]}
                emptyLabel="No hay datos de distribución para este periodo."
              />
            )}
          </article>
          ) : null}
        </div>
        </>
        ) : null}

        {(hasCatalogTypeUsage || hasCatalogFrequencyUsage) ? (
        <>
        <div className="dashboard-main-grid dashboard-lower-middle-grid">
          {hasCatalogTypeUsage ? (
          <article className="dashboard-panel dashboard-panel-half">
            <div className="dashboard-panel-header">
              <h3>Tipo de Actividades (Catálogo)</h3>
              <div className="dashboard-chart-toggle">
                <button
                  className={`dashboard-chart-toggle-btn${catalogTypeChartType === "bar" ? " active" : ""}`}
                  onClick={() => setCatalogTypeChartType("bar")}
                >Barras</button>
                <button
                  className={`dashboard-chart-toggle-btn${catalogTypeChartType === "line" ? " active" : ""}`}
                  onClick={() => setCatalogTypeChartType("line")}
                >Líneas</button>
              </div>
            </div>
            {catalogTypeChartType === "bar" ? (
              <>
                <DashboardColumnChart
                  rows={dashboardCatalogTypeRows.map((item) => ({
                    key: item.id,
                    label: item.label,
                    value: item.value,
                    valueLabel: `${item.value}`,
                    tooltip: `${item.value} actividades ${item.label.toLowerCase()}`,
                    color: item.id === "mandatory"
                      ? "linear-gradient(180deg, #4f7da9 0%, #b4cde3 100%)"
                      : "linear-gradient(180deg, #f59e0b 0%, #fde68a 100%)",
                  }))}
                  emptyLabel="No hay actividades en catálogo para este análisis."
                />
                <div className="dashboard-progress-list">
                  {dashboardCatalogTypeRows.map((item) => (
                    <DashboardProgressMetric
                      key={item.id}
                      label={item.label}
                      valueText={`${item.value} actividades`}
                      percent={dashboardMetrics.catalogActiveCount ? (item.value / dashboardMetrics.catalogActiveCount) * 100 : 0}
                      color={item.id === "mandatory" ? "linear-gradient(90deg, #4f7da9 0%, #b4cde3 100%)" : "linear-gradient(90deg, #f59e0b 0%, #fde68a 100%)"}
                    />
                  ))}
                </div>
              </>
            ) : (
              <DashboardLineChart
                series={[{
                  label: "Actividades por tipo",
                  color: "#4f7da9",
                  data: dashboardCatalogTypeRows.map((item) => ({ label: item.label, y: item.value })),
                }]}
                emptyLabel="No hay actividades en catálogo para este análisis."
              />
            )}
          </article>
          ) : null}

          {hasCatalogFrequencyUsage ? (
          <article className="dashboard-panel dashboard-panel-half">
            <div className="dashboard-panel-header">
              <h3>Frecuencia de Actividades (Catálogo)</h3>
              <div className="dashboard-chart-toggle">
                <button
                  className={`dashboard-chart-toggle-btn${catalogFreqChartType === "bar" ? " active" : ""}`}
                  onClick={() => setCatalogFreqChartType("bar")}
                >Barras</button>
                <button
                  className={`dashboard-chart-toggle-btn${catalogFreqChartType === "line" ? " active" : ""}`}
                  onClick={() => setCatalogFreqChartType("line")}
                >Líneas</button>
              </div>
            </div>
            {catalogFreqChartType === "bar" ? (
              <>
                <DashboardColumnChart
                  rows={dashboardCatalogFrequencyRows.map((item) => ({
                    key: item.id,
                    label: item.label,
                    value: item.value,
                    valueLabel: `${item.value}`,
                    tooltip: `${item.value} actividades con frecuencia ${item.label.toLowerCase()}`,
                    color: "linear-gradient(180deg, #0ea5e9 0%, #22d3ee 100%)",
                  }))}
                  emptyLabel="No hay frecuencias registradas en el catálogo."
                />
                <div className="dashboard-bars-list">
                  {dashboardCatalogFrequencyRows.map((item) => (
                    <DashboardBarRow
                      key={item.id}
                      label={getActivityFrequencyLabel(item.id)}
                      value={item.value}
                      max={Math.max(...dashboardCatalogFrequencyRows.map((row) => row.value), 1)}
                      color="linear-gradient(90deg, #0ea5e9 0%, #22d3ee 100%)"
                      trailing={`${item.value} actividades`}
                      initial={item.label.charAt(0).toUpperCase()}
                    />
                  ))}
                </div>
              </>
            ) : (
              <DashboardLineChart
                series={[{
                  label: "Actividades por frecuencia",
                  color: "#0ea5e9",
                  data: dashboardCatalogFrequencyRows.map((item) => ({ label: item.label, y: item.value })),
                }]}
                emptyLabel="No hay frecuencias registradas en el catálogo."
              />
            )}
          </article>
          ) : null}
        </div>
        </>
        ) : null}
      </DashboardSection>
      )) : null}

      {isDashboardSectionEnabled("trends") || isDashboardSectionEnabled("inventory") || isDashboardSectionEnabled("merma") ? zoneWrap("trends", (
      <DashboardSection zone="trends" title={showGlobalAreaFilter ? "Tendencias, áreas e inventario" : (areaDashboardTheme.trendsTitle || "Tendencias y evolución")} subtitle={showGlobalAreaFilter ? "Evolución del flujo, consolidado por área y leaderboards de inventario/merma." : (areaDashboardTheme.trendsSubtitle || "Evolución del periodo y métricas de apoyo.")} summary={`${dashboardTrendRows.length} periodos · ${dashboardAreaRows.length} áreas`} icon={BarChart3} open={dashboardSectionsOpen.trends} onToggle={() => setDashboardSectionsOpen((current) => ({ ...current, trends: !current.trends }))}>
        <div className="dashboard-main-grid dashboard-lower-middle-grid">
          <article className="dashboard-panel dashboard-panel-half">
            <div className="dashboard-panel-header">
              <h3>Tendencia general</h3>
              {!isWeeklyDashboardPeriod ? (
              <div className="dashboard-chart-toggle">
                <button
                  type="button"
                  className={`dashboard-chart-toggle-btn${effectiveTrendChartType === "bar" ? " active" : ""}`}
                  onClick={() => setTrendChartType("bar")}
                  title="Gráfico de barras"
                  aria-pressed={effectiveTrendChartType === "bar"}
                >
                  <BarChart3 size={13} />
                  <span>Barras</span>
                </button>
                <button
                  type="button"
                  className={`dashboard-chart-toggle-btn${effectiveTrendChartType === "line" ? " active" : ""}`}
                  onClick={() => setTrendChartType("line")}
                  title="Gráfico de líneas con puntos"
                  aria-pressed={effectiveTrendChartType === "line"}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                  <span>Líneas</span>
                </button>
              </div>
              ) : (
                <span className="dashboard-chart-mode-label">Vista semanal · líneas</span>
              )}
            </div>
            {effectiveTrendChartType === "bar" ? (
              <DashboardColumnChart
                rows={dashboardTrendRows.map((item) => ({
                  key: item.key,
                  label: item.label,
                  value: item.total,
                  valueLabel: `${item.completed}/${item.total}`,
                  tooltip: `${item.completed}/${item.total} cierres · ${formatMetricNumber(item.totalSeconds / 3600, 1)} h`,
                  color: "linear-gradient(180deg, #0ea5e9 0%, #8eb5d6 100%)",
                }))}
                emptyLabel="No hay tendencia disponible para el periodo seleccionado."
              />
            ) : (
              <DashboardLineChart
                series={[
                  {
                    key: "total",
                    label: "Registros",
                    color: "#0ea5e9",
                    data: dashboardTrendRows.map((item) => ({ label: item.label, y: item.total })),
                  },
                  {
                    key: "completed",
                    label: "Cerrados",
                    color: "#405db0",
                    data: dashboardTrendRows.map((item) => ({ label: item.label, y: item.completed })),
                  },
                  {
                    key: "paused",
                    label: "Pausados",
                    color: "#f59e0b",
                    data: dashboardTrendRows.map((item) => ({ label: item.label, y: item.paused || 0 })),
                  },
                ]}
                emptyLabel="No hay tendencia disponible para el periodo seleccionado."
              />
            )}
            <div className="dashboard-progress-list">
              {dashboardTrendRows.map((item) => (
                <DashboardProgressMetric key={item.key} label={item.label} valueText={`${item.completed}/${item.total} cierres · ${formatMetricNumber(item.totalSeconds / 3600, 1)} h`} percent={item.total ? (item.completed / item.total) * 100 : 0} color="linear-gradient(90deg, #0ea5e9 0%, #8eb5d6 100%)" />
              ))}
            </div>
          </article>

          <article className="dashboard-panel dashboard-panel-half">
            <div className="dashboard-panel-header">
              <h3>Resumen Consolidado por Área</h3>
              {!isWeeklyDashboardPeriod ? (
              <div className="dashboard-chart-toggle">
                <button
                  type="button"
                  className={`dashboard-chart-toggle-btn${effectiveAreaChartType === "bar" ? " active" : ""}`}
                  onClick={() => setAreaChartType("bar")}
                  title="Gráfico de barras"
                  aria-pressed={effectiveAreaChartType === "bar"}
                >
                  <BarChart3 size={13} />
                  <span>Barras</span>
                </button>
                <button
                  type="button"
                  className={`dashboard-chart-toggle-btn${effectiveAreaChartType === "line" ? " active" : ""}`}
                  onClick={() => setAreaChartType("line")}
                  title="Línea comparativa por área"
                  aria-pressed={effectiveAreaChartType === "line"}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                  <span>Líneas</span>
                </button>
              </div>
              ) : null}
            </div>
            {effectiveAreaChartType === "bar" ? (
              <DashboardColumnChart
                rows={dashboardAreaRows.slice(0, 6).map((item) => ({
                  key: item.area,
                  label: item.area,
                  value: item.total,
                  valueLabel: `${item.total}`,
                  tooltip: `${item.total} registros · ${item.boardCount} tableros`,
                  color: "linear-gradient(180deg, #405db0 0%, #3375af 100%)",
                }))}
                emptyLabel="No hay áreas con datos para mostrar."
              />
            ) : (
              <DashboardLineChart
                series={[
                  {
                    key: "registros",
                    label: "Registros por área",
                    color: "#405db0",
                    data: dashboardAreaRows.slice(0, 8).map((item) => ({ label: item.area.substring(0, 8), y: item.total })),
                  },
                  {
                    key: "tableros",
                    label: "Tableros activos",
                    color: "#3375af",
                    data: dashboardAreaRows.slice(0, 8).map((item) => ({ label: item.area.substring(0, 8), y: item.boardCount })),
                  },
                ]}
                emptyLabel="No hay áreas con datos para mostrar."
              />
            )}
            <div className="dashboard-bars-list">
              {dashboardAreaRows.map((item) => (
                <DashboardBarRow key={item.area} label={item.area} value={item.total} max={Math.max(...dashboardAreaRows.map((row) => row.total), 1)} color="linear-gradient(90deg, #405db0 0%, #3375af 100%)" trailing={`${item.total} reg · ${item.boardCount} tableros`} initial={item.area.charAt(0).toUpperCase()} />
              ))}
            </div>
          </article>
        </div>

        {/* Panel completo: gráfica de líneas multi-serie — Horas productivas por periodo */}
        {dashboardDynamicMetricRows.length ? (
        <div className="dashboard-main-grid">
          <article className="dashboard-panel dashboard-panel-full">
            <div className="dashboard-panel-header">
              <h3>Evolución de productividad por periodo</h3>
              <Zap size={18} />
            </div>
            <p className="dashboard-panel-subtitle">Evolución de horas productivas acumuladas por periodo.</p>
            <DashboardLineChart
              series={[
                {
                  key: "productiveHours",
                  label: "Horas productivas",
                  color: "#a855f7",
                  valueSuffix: " h",
                  data: dashboardTrendRows.map((item) => ({ label: item.label, y: Math.round((item.totalSeconds || 0) / 3600 * 10) / 10 })),
                },
              ]}
              emptyLabel="No hay datos de tendencia disponibles para el periodo seleccionado."
            />
          </article>
        </div>
        ) : null}

        {scopedInventoryProductTimeRows.length ? (
        <div className="dashboard-main-grid">
          <article className="dashboard-panel dashboard-panel-full">
            <div className="dashboard-panel-header">
              <h3>Métricas detectadas automáticamente por tableros</h3>
              <Gauge size={18} />
            </div>
            <p className="dashboard-panel-subtitle">
              El dashboard detecta campos medibles de tus tableros (número, tiempo, porcentaje, progreso, contador, rating, moneda y fórmula) y los consolida por área.
            </p>
            <DashboardColumnChart
              rows={dashboardDynamicMetricRows.slice(0, 10).map((item) => ({
                key: item.key,
                label: `${item.area.substring(0, 8)} · ${item.fieldLabel.substring(0, 12)}`,
                value: item.average,
                valueLabel: `${formatMetricNumber(item.average, 1)}${item.unit ? ` ${item.unit}` : ""}`,
                tooltip: `${item.area} · ${item.boardName} · ${item.fieldLabel}: promedio ${formatMetricNumber(item.average, 2)}${item.unit ? ` ${item.unit}` : ""}`,
                color: "linear-gradient(180deg, #355f88 0%, #405db0 100%)",
              }))}
              emptyLabel="No hay campos medibles detectados para este filtro."
            />
            <div className="dashboard-table-wrap">
              <table className="dashboard-table-clean">
                <thead>
                  <tr>
                    <th>Área</th>
                    <th>Tablero</th>
                    <th>Métrica</th>
                    <th>Promedio</th>
                    <th>Mín</th>
                    <th>Máx</th>
                    <th>Muestras</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardDynamicMetricRows.slice(0, 24).map((item) => (
                    <tr key={item.key}>
                      <td>{item.area}</td>
                      <td>{item.boardName}</td>
                      <td>{item.fieldLabel}</td>
                      <td>{formatMetricNumber(item.average, 2)}{item.unit ? ` ${item.unit}` : ""}</td>
                      <td>{formatMetricNumber(item.min, 2)}{item.unit ? ` ${item.unit}` : ""}</td>
                      <td>{formatMetricNumber(item.max, 2)}{item.unit ? ` ${item.unit}` : ""}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
        ) : null}

        {isDashboardSectionEnabled("inventory") ? (
        <>
        <div className="dashboard-main-grid">
          <article className="dashboard-panel dashboard-panel-full dashboard-product-leaderboard">
            <div className="dashboard-panel-header">
              <h3>Rendimiento por producto (tarimas y piezas)</h3>
              <div className="dashboard-product-leaderboard-actions">
                {canExportDashboardActions ? (
                  <button
                    type="button"
                    className="icon-button dashboard-export-product-btn"
                    onClick={exportProductPerformancePdf}
                    disabled={isExportingProductPdf || !scopedProductPerformanceRows.length}
                    title="Descargar PDF con promedios por producto"
                  >
                    <Download size={16} />
                    <span>{isExportingProductPdf ? "Generando…" : "PDF productos"}</span>
                  </button>
                ) : null}
                <Clock3 size={18} />
              </div>
            </div>
            <p className="dashboard-panel-subtitle">
              Resume cada producto por código, nombre y presentación: suma todas las revisiones del mismo SKU y muestra promedios generales (sin desglose fila por fila).
            </p>
            <div className="dashboard-product-leaderboard-toolbar">
              <label className="dashboard-product-search">
                <Search size={16} />
                <input
                  type="search"
                  value={productLeaderboardSearch}
                  onChange={(event) => setProductLeaderboardSearch(event.target.value)}
                  placeholder="Buscar por código, nombre o presentación…"
                  list="dashboard-reviewed-tarimas"
                />
                <datalist id="dashboard-reviewed-tarimas">
                  {reviewedTarimaSearchOptions.map((tarima) => (
                    <option key={tarima} value={tarima} />
                  ))}
                </datalist>
              </label>
              <label className="dashboard-filter-field">
                <span>Métrica</span>
                <select value={inventoryMetric} onChange={(event) => setInventoryMetric(event.target.value)}>
                  <option value="secondsPerPiece">Segundos por pieza</option>
                  <option value="totalPieces">Piezas revisadas</option>
                  <option value="avgMinutesPerPallet">Promedio min / tarima</option>
                  <option value="avgMinutesPerSession">Promedio min / sesión</option>
                  <option value="totalMinutes">Tiempo total</option>
                  <option value="palletCount">Tarimas distintas</option>
                </select>
              </label>
              <label className="dashboard-filter-field">
                <span>Tablero</span>
                <select value={leaderboardBoardFilterSafe} onChange={(event) => setLeaderboardBoardFilter(event.target.value)}>
                  {leaderboardBoardOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <div className="dashboard-chart-toggle">
                <button
                  type="button"
                  className={`dashboard-chart-toggle-btn${inventoryChartType === "bar" ? " active" : ""}`}
                  onClick={() => setInventoryChartType("bar")}
                >
                  Barras
                </button>
                <button
                  type="button"
                  className={`dashboard-chart-toggle-btn${inventoryChartType === "line" ? " active" : ""}`}
                  onClick={() => setInventoryChartType("line")}
                >
                  Líneas
                </button>
              </div>
            </div>
            {chartProductPerformanceRows.length > 0 ? (
              <DashboardColumnChart
                rows={chartProductPerformanceRows.map((product) => {
                  const metricValue = Number(product[inventoryMetric] || 0);
                  const valueLabel = inventoryMetric === "secondsPerPiece"
                    ? `${formatMetricNumber(metricValue, 1)} s/pieza`
                    : inventoryMetric === "totalPieces" || inventoryMetric === "palletCount" || inventoryMetric === "sessions"
                      ? `${formatMetricNumber(metricValue, 0)}${inventoryMetric === "palletCount" ? " tarimas" : inventoryMetric === "sessions" ? " sesiones" : " pzas"}`
                      : `${formatMetricNumber(metricValue, 1)} min`;
                  const shortLabel = product.product.length > 28 ? `${product.product.slice(0, 28)}…` : product.product;
                  return {
                    key: product.key,
                    label: shortLabel,
                    value: metricValue,
                    valueLabel,
                    tooltip: `${product.product}: ${valueLabel} · ${product.palletCount} tarima(s) · ${formatMetricNumber(product.totalPieces, 0)} piezas`,
                    color: "linear-gradient(180deg, #0f766e 0%, #14b8a6 100%)",
                  };
                })}
                emptyLabel="No hay productos con datos para este filtro."
              />
            ) : null}
            {filteredProductPerformanceRows.length > visibleProductPerformanceRows.length ? (
              <div className="dashboard-product-detail-toggle-wrap">
                <button
                  type="button"
                  className="icon-button dashboard-product-expand-btn"
                  onClick={() => setShowAllProductPerformanceRows((current) => !current)}
                  aria-expanded={showAllProductPerformanceRows}
                >
                  {showAllProductPerformanceRows
                    ? `▲ Ocultar lista · mostrando ${filteredProductPerformanceRows.length} productos`
                    : `▼ Ver todos los productos (${filteredProductPerformanceRows.length})`}
                </button>
              </div>
            ) : null}
            <div className="dashboard-product-card-grid">
              {visibleProductPerformanceRows.map((product, index) => (
                <section key={product.key} className="dashboard-product-card">
                  <div className="dashboard-product-card-toggle dashboard-product-card-static">
                    <div className="dashboard-product-card-rank">#{index + 1}</div>
                    <div className="dashboard-product-card-main">
                      <h4>{product.product}</h4>
                      <p>{product.palletCount} tarima(s) · {product.sessions} sesión(es) · promedio consolidado</p>
                    </div>
                    <div className="dashboard-product-card-metrics">
                      <span><strong>{formatMetricNumber(product.totalPieces, 0)}</strong> piezas</span>
                      <span><strong>{formatMetricNumber(product.totalMinutes, 1)}</strong> min total</span>
                      <span>
                        <strong>
                          {product.secondsPerPiece !== null ? `${formatMetricNumber(product.secondsPerPiece, 1)} s` : "-"}
                        </strong>
                        {" "}/ pieza
                      </span>
                    </div>
                  </div>
                  <div className="dashboard-product-card-detail dashboard-product-card-detail--summary">
                    <div className="dashboard-product-card-summary">
                      <span>Promedio por tarima: <strong>{formatMetricNumber(product.avgMinutesPerPallet, 1)} min</strong></span>
                      <span>Promedio por sesión: <strong>{formatMetricNumber(product.avgMinutesPerSession, 1)} min</strong></span>
                    </div>
                  </div>
                </section>
              ))}
            </div>
            {filteredProductPerformanceRows.length === 0 ? (
              <p className="dashboard-product-leaderboard-empty">No hay productos ni tarimas que coincidan con la búsqueda actual.</p>
            ) : null}
            <div className="dashboard-product-detail-toggle-wrap">
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowInventoryDetailTable((current) => !current)}
              >
                {showInventoryDetailTable ? "Ocultar registros detallados" : `Ver registros detallados (${scopedInventoryProductTimeRows.length})`}
              </button>
            </div>
            {showInventoryDetailTable ? (
              <div className="dashboard-table-wrap dashboard-product-detail-table">
                <table className="dashboard-table-clean">
                  <thead>
                    <tr>
                      <th>Tablero</th>
                      <th>Tarima</th>
                      <th>Producto</th>
                      <th>Piezas revisadas</th>
                      <th>Piezas esperadas</th>
                      <th>Mermas</th>
                      <th>Faltantes</th>
                      <th>Tiempo (min)</th>
                      <th>Fecha</th>
                      <th>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopedInventoryProductTimeRows.slice(0, 40).map((item) => (
                      <tr key={item.key}>
                        <td>{item.boardName}</td>
                        <td>{item.tarimaValue}</td>
                        <td>{item.productValue}</td>
                        <td>{formatMetricNumber(item.piecesReviewed, 0)}</td>
                        <td>{Number.isFinite(item.expectedPieces) ? formatMetricNumber(item.expectedPieces, 0) : "-"}</td>
                        <td>{item.totalMermaPieces > 0 ? formatMetricNumber(item.totalMermaPieces, 0) : "-"}</td>
                        <td>{Number.isFinite(item.missingPieces) ? formatMetricNumber(item.missingPieces, 0) : "-"}</td>
                        <td>{formatMetricNumber(item.durationMinutes, 2)}</td>
                        <td>{item.occurredAtLabel}</td>
                        <td>{item.responsibleName || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        </div>
        {scopedInventoryProductTimeRows.length === 0 && filteredProductPerformanceRows.length === 0 ? (
          <p className="dashboard-empty-text">No hay datos de inventario en este periodo. Se mostrarán al capturar productos y tarimas en los tableros del área.</p>
        ) : null}
        </>
        ) : null}

        {isDashboardSectionEnabled("merma") ? (
        <div className="dashboard-main-grid">
          <article className="dashboard-panel dashboard-panel-full">
            <div className="dashboard-panel-header">
              <h3>Análisis de merma por motivo</h3>
              <AlertTriangle size={18} />
            </div>
            <p className="dashboard-panel-subtitle">
              Motivos de merma con mayor frecuencia y una barra adicional dedicada a piezas faltantes.
            </p>
            <div className="dashboard-chart-toggle" style={{ marginBottom: "0.7rem" }}>
              <button
                type="button"
                className={`dashboard-chart-toggle-btn${mermaChartType === "bar" ? " active" : ""}`}
                onClick={() => setMermaChartType("bar")}
                title="Gráfico de barras"
                aria-pressed={mermaChartType === "bar"}
              >
                <BarChart3 size={13} />
                <span>Barras</span>
              </button>
              <button
                type="button"
                className={`dashboard-chart-toggle-btn${mermaChartType === "line" ? " active" : ""}`}
                onClick={() => setMermaChartType("line")}
                title="Gráfico de líneas"
                aria-pressed={mermaChartType === "line"}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                <span>Líneas</span>
              </button>
            </div>
            {mermaChartType === "bar" ? (
              <DashboardColumnChart
                rows={mermaChartRows}
                emptyLabel="No hay datos de merma con motivo registrado."
              />
            ) : (
              <DashboardLineChart
                series={[
                  {
                    key: "mermaPorCausa",
                    label: "Merma por causa",
                    color: "#b91c1c",
                    valueSuffix: " pzas",
                    data: mermaAnalysisRows.slice(0, 10).map((row) => ({
                      label: row.motivo.length > 18 ? `${row.motivo.slice(0, 17)}…` : row.motivo,
                      y: Number(row.totalPiezas || 0),
                    })),
                  },
                ]}
                emptyLabel="No hay datos para la línea de merma por causa."
              />
            )}
            <div className="dashboard-table-wrap">
              <table className="dashboard-table-clean">
                <thead>
                  <tr>
                    <th>Motivo de merma</th>
                    <th>Registros</th>
                    <th>Piezas de merma</th>
                    <th>Piezas faltantes</th>
                    <th>Piezas/registro</th>
                  </tr>
                </thead>
                <tbody>
                  {mermaAnalysisRows.map((row) => (
                    <tr key={row.motivo}>
                      <td>{row.motivo}</td>
                      <td>{row.count}</td>
                      <td>{formatMetricNumber(row.totalPiezas, 0)}</td>
                      <td>{formatMetricNumber(row.totalPiezasFaltantes || 0, 0)}</td>
                      <td>{formatMetricNumber(row.count ? row.totalPiezas / row.count : 0, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
        ) : null}
        {!mermaAnalysisRows.length && isDashboardSectionEnabled("merma") ? (
          <p className="dashboard-empty-text">No hay merma registrada en el periodo seleccionado.</p>
        ) : null}

        <div className="dashboard-main-grid">
          <article className="dashboard-panel dashboard-panel-full">
            <div className="dashboard-panel-header">
              <h3>Detalle completo por área y tablero</h3>
              <BarChart3 size={18} />
            </div>
            <p className="dashboard-panel-subtitle">
              Vista de alta resolución operativa: cada área agrupa sus tableros con productividad, estados, pausas, métricas detectadas y productos/SKU más demandantes en tiempo.
            </p>
            <div className="dashboard-detail-controls">
              <label className="dashboard-filter-field">
                <span>Buscar</span>
                <input
                  type="text"
                  value={detailSearchText}
                  onChange={(event) => setDetailSearchText(event.target.value)}
                  placeholder="Tablero, métrica o producto/SKU"
                />
              </label>
              <label className="dashboard-filter-field">
                <span>Tablero</span>
                <select value={detailBoardFilter} onChange={(event) => setDetailBoardFilter(event.target.value)}>
                  {detailBoardFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="dashboard-filter-field">
                <span>Estatus</span>
                <select value={detailStatusFilter} onChange={(event) => setDetailStatusFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  <option value="paused">Con pausa</option>
                  <option value="running">En curso</option>
                  <option value="completed">Con cierres</option>
                  <option value="pending">Con pendientes</option>
                </select>
              </label>
              <label className="dashboard-filter-field">
                <span>Ordenar por</span>
                <select value={detailSortBy} onChange={(event) => setDetailSortBy(event.target.value)}>
                  <option value="volume">Mayor volumen</option>
                  <option value="efficiency">Mayor eficiencia</option>
                  <option value="pause">Mayor pausa</option>
                  <option value="cycle">Mayor ciclo</option>
                  <option value="completion">Mayor cumplimiento</option>
                </select>
              </label>
              <div className="dashboard-filter-field dashboard-detail-clear-field">
                <span>Acciones</span>
                <button type="button" className="icon-button" onClick={resetDetailViewFilters}>
                  Limpiar filtros
                </button>
              </div>
            </div>
            {filteredAreaBoardDetailedRows.length ? (
              <div className="dashboard-area-detail-grid">
                {filteredAreaBoardDetailedRows.map((areaItem) => (
                  <section key={areaItem.area} className="dashboard-area-detail-card">
                    <div className="dashboard-panel-header">
                      <h3>{areaItem.area}</h3>
                      <span>{areaItem.visibleBoardCount} tablero(s) visibles</span>
                    </div>
                    <div className="dashboard-progress-list">
                      <DashboardProgressMetric label="Cumplimiento" valueText={`${formatMetricNumber(areaItem.visibleCompletionPercent, 1)}%`} percent={areaItem.visibleCompletionPercent} color="linear-gradient(90deg, #0ea5e9 0%, #5f8fbe 100%)" />
                      <DashboardProgressMetric label="Registros" valueText={`${areaItem.visibleTotalRecords} visibles`} percent={100} color="linear-gradient(90deg, #355f88 0%, #405db0 100%)" />
                      <DashboardProgressMetric label="Pausas" valueText={`${formatMetricNumber(areaItem.visiblePauseHours, 1)} h`} percent={areaItem.visibleProductionHours > 0 ? Math.min(100, (areaItem.visiblePauseHours / areaItem.visibleProductionHours) * 100) : 0} color="linear-gradient(90deg, #dc2626 0%, #f59e0b 100%)" />
                    </div>
                    <div className="dashboard-table-wrap">
                      <table className="dashboard-table-clean">
                        <thead>
                          <tr>
                            <th>Tablero</th>
                            <th>Fuente</th>
                            <th>Registros por estado</th>
                            <th>Tiempo</th>
                            <th>Eficiencia</th>
                            <th>Pausas top</th>
                            <th>Métricas detectadas</th>
                            <th>Productos/SKU top</th>
                          </tr>
                        </thead>
                        <tbody>
                          {areaItem.boards.map((board) => (
                            <tr key={board.boardToken}>
                              <td>
                                <strong>{board.boardName}</strong>
                                <br />
                                <small>{board.totalRecords} registros · {board.responsibleCount} responsables</small>
                              </td>
                              <td>{board.sourceLabel}</td>
                              <td>
                                <DashboardRecordStatusCell
                                  completed={board.completed}
                                  running={board.running}
                                  paused={board.paused}
                                  totalRecords={board.totalRecords}
                                  completionPercent={board.completionPercent}
                                  compact
                                />
                              </td>
                              <td>
                                {formatMetricNumber(board.productionHours, 2)} h prod.
                                <br />
                                <small>{formatMetricNumber(board.pauseHours, 2)} h pausa · {formatMetricNumber(board.averageCycleMinutes, 1)} min ciclo</small>
                              </td>
                              <td>{formatMetricNumber(board.efficiencyPercent, 1)}%</td>
                              <td>
                                {(board.topPauseReasons || []).length ? board.topPauseReasons.map((reason) => (
                                  <div key={reason.reason}>
                                    <button type="button" style={{ background: "none", border: "none", padding: 0, color: "#0366d6", cursor: "pointer", textDecoration: "underline" }} onClick={() => openPauseDetailsForReason(board, reason)}>
                                      {reason.reason}: {formatMetricNumber((reason.seconds || 0) / 60, 1)} min
                                    </button>
                                  </div>
                                )) : <span>Sin pausas registradas</span>}
                              </td>
                              <td>
                                {(board.dynamicMetrics || []).length ? board.dynamicMetrics.slice(0, 4).map((metric) => (
                                  <div key={metric.key}>
                                    {metric.fieldLabel}: {formatMetricNumber(metric.average, 2)}{metric.unit ? ` ${metric.unit}` : ""}
                                  </div>
                                )) : <span>Sin métricas detectadas</span>}
                              </td>
                              <td>
                                {(board.inventoryProducts || []).length ? board.inventoryProducts.slice(0, 4).map((product) => (
                                  <div key={product.key}>
                                    {product.product} · {product.tarima || "Sin tarima"}: {formatMetricNumber(product.totalMinutes, 1)} min · {formatMetricNumber(product.totalPieces || 0, 0)} pzas
                                  </div>
                                )) : <span>No aplica / sin datos</span>}
                              </td>
                            </tr>
                          ))}
                          <tr className="dashboard-area-summary-row">
                            <td>
                              <strong>Total visible área</strong>
                            </td>
                            <td>{areaItem.visibleBoardCount} tablero(s)</td>
                            <td>
                              <DashboardRecordStatusCell
                                completed={areaItem.visibleCompleted}
                                running={areaItem.visibleRunning}
                                paused={areaItem.visiblePaused}
                                totalRecords={areaItem.visibleTotalRecords}
                                completionPercent={areaItem.visibleCompletionPercent}
                                compact
                              />
                            </td>
                            <td>
                              {formatMetricNumber(areaItem.visibleProductionHours, 2)} h prod.
                              <br />
                              <small>{formatMetricNumber(areaItem.visiblePauseHours, 2)} h pausa</small>
                            </td>
                            <td colSpan={4}>{areaItem.visibleTotalRecords} registros visibles en esta área</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="dashboard-empty-text">No hay datos detallados para el filtro seleccionado.</p>
            )}
          </article>
        </div>
      </DashboardSection>
      )) : null}

      {isDashboardSectionEnabled("causes") ? zoneWrap("causes", (
      <DashboardSection zone="causes" title={showGlobalAreaFilter ? "Pausas y excesos de tiempo" : (areaDashboardTheme.causesTitle || "Pausas y excesos de tiempo")} subtitle={showGlobalAreaFilter ? "Pareto de causas que consumen tiempo (pausas registradas y actividades fuera del tiempo establecido) y análisis Ishikawa." : (areaDashboardTheme.causesSubtitle || "Pareto e Ishikawa del periodo.")} summary={`${dashboardParetoRows.length} causas priorizadas · ${dashboardIshikawaRows.length} categorías`} icon={Search} open={dashboardSectionsOpen.causes} onToggle={() => setDashboardSectionsOpen((current) => ({ ...current, causes: !current.causes }))}>
        <div className="dashboard-main-grid dashboard-lower-middle-grid">
          <article className="dashboard-panel dashboard-panel-half">
            <div className="dashboard-panel-header">
              <h3>Pareto de causas por impacto en tiempo</h3>
              <BarChart3 size={18} />
            </div>
            {dashboardParetoRows.length ? (
            <DashboardParetoChart rows={dashboardParetoRows} />
            ) : (
              <p className="dashboard-empty-text">Sin causas priorizadas en el periodo.</p>
            )}
            <div className="dashboard-pareto-list">
              {dashboardParetoRows.map((item, index) => (
                <DashboardParetoRow key={item.label} label={item.label} percent={item.percent} cumulativePercent={item.cumulativePercent} impactText={`${Math.round(item.impactSeconds / 60)} min · ${item.count} evento(s)`} highlight={index < 3 || item.cumulativePercent <= 80} />
              ))}
            </div>
          </article>

          <article className="dashboard-panel dashboard-panel-half">
            <div className="dashboard-panel-header">
              <h3>Ishikawa Operativo</h3>
              <Search size={18} />
            </div>
            {dashboardIshikawaRows.length ? (
            <DashboardIshikawaDiagram rows={dashboardIshikawaRows} />
            ) : (
              <p className="dashboard-empty-text">Sin categorías Ishikawa para este filtro.</p>
            )}
            <div className="dashboard-cause-grid">
              {dashboardIshikawaRows.map((item) => (
                <DashboardCauseCard key={item.category} title={item.category} share={item.impact} count={item.count} examples={item.examples} />
              ))}
            </div>
          </article>
        </div>
      </DashboardSection>
      )) : null}

      {isDashboardSectionEnabled("alerts") ? zoneWrap("alerts", (
      <DashboardSection zone="alerts" title={showGlobalAreaFilter ? "Alertas y tablas ejecutivas" : (areaDashboardTheme.alertsTitle || "Alertas y tablas ejecutivas")} subtitle={showGlobalAreaFilter ? "Resumen por actividad y consolidado por área (promedios generales, sin desglose de cada registro)." : (areaDashboardTheme.alertsSubtitle || "Resumen de excepciones y pausas del periodo.")} summary={`${dashboardActivitySlaSummaryRows.filter((row) => row.exceededCount > 0).length} actividades con alertas · ${pauseAnalysis.length} causas de pausa`} icon={OctagonAlert} open={dashboardSectionsOpen.alerts} onToggle={() => setDashboardSectionsOpen((current) => ({ ...current, alerts: !current.alerts }))}>
        <div className="dashboard-main-grid dashboard-bottom-grid">
          <article className="dashboard-panel dashboard-panel-wide">
            <div className="dashboard-panel-header with-badge">
              <div>
                <h3>Resumen de actividades vs. límite SLA</h3>
                <p>
                  Promedio general por tipo de actividad. No lista cada registro individual.
                  {supportsCatalogAutoLimits ? " Los tiempos del catálogo se actualizan automáticamente tras 3 semanas de datos (máx. 30), redondeados al alza en bloques de 5 min." : ""}
                </p>
              </div>
              <span className="dashboard-alert-pill">{dashboardActivitySlaSummaryRows.filter((row) => row.exceededCount > 0).length} con exceso</span>
            </div>
            {supportsCatalogAutoLimits && catalogAutoLimitUpdates.length ? (
              <div className="dashboard-auto-limit-banner" role="status">
                <strong>Tiempos del catálogo actualizados automáticamente:</strong>
                {" "}
                {catalogAutoLimitUpdates.map((entry) => `${entry.name}: ${entry.previousLimitMinutes} → ${entry.nextLimitMinutes} min`).join(" · ")}
              </div>
            ) : null}
            <div className="dashboard-table-wrap">
              <table className="dashboard-table-clean">
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th>Eventos</th>
                    <th>Con exceso</th>
                    <th>% exceso</th>
                    <th>Límite</th>
                    <th>Prom. real</th>
                    <th>Límite sugerido</th>
                    <th>Prom. exceso</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardActivitySlaSummaryRows.length ? dashboardActivitySlaSummaryRows.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label.toUpperCase()}</td>
                      <td>{row.totalEvents}</td>
                      <td className={row.exceededCount > 0 ? "dashboard-number-warning" : ""}>{row.exceededCount}</td>
                      <td>{formatPercent(row.exceededPercent)}</td>
                      <td>{row.limitMinutes} min</td>
                      <td>{formatMinutes(row.avgRealMinutes)}</td>
                      <td className={row.hasEnoughSamplesForAutoLimit && row.suggestedLimitMinutes !== row.limitMinutes ? "dashboard-number-warning" : ""}>
                        {row.hasEnoughSamplesForAutoLimit ? `${row.suggestedLimitMinutes} min` : `— (${row.sampleWeekCount || 0}/3 sem.)`}
                      </td>
                      <td>{row.exceededCount > 0 ? formatMinutes(row.avgExcessMinutes) : "—"}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8}>No hay actividades con límite SLA en el periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="dashboard-panel dashboard-panel-rank dashboard-pause-panel">
            <div className="dashboard-panel-header">
              <div>
                <h3>Top de Pausas</h3>
                <p>Causas más frecuentes de interrupción por impacto</p>
              </div>
              <PauseCircle size={18} />
            </div>
            <div className="dashboard-pause-list">
              {pauseAnalysis.length ? pauseAnalysis.map((item) => (
                <div key={item.reason} className="dashboard-pause-card">
                  <span className="dashboard-pause-icon" />
                  <div>
                    <strong>{item.reason}</strong>
                    <small>{item.count} pausas · {Math.round(item.totalSeconds / 60)} min</small>
                  </div>
                  <span className="dashboard-pause-dot">{Math.round(item.percent)}</span>
                </div>
              )) : (
                <p className="dashboard-empty-text">Sin pausas registradas en el periodo.</p>
              )}
            </div>
          </aside>
        </div>

        <article className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-header with-badge">
            <div>
              <h3>Tabla Ejecutiva por Área</h3>
              <p>Resumen general consolidado aunque existan múltiples tableros y fuentes operativas.</p>
            </div>
            <span className="dashboard-alert-pill">{dashboardAreaRows.length} áreas</span>
          </div>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table-clean">
              <thead>
                <tr>
                  <th>Área</th>
                  <th>Registros</th>
                  <th>Cerrados</th>
                  <th>Promedio</th>
                  <th>SLA</th>
                  <th>Tableros / Fuentes</th>
                </tr>
              </thead>
              <tbody>
                {dashboardAreaRows.map((item) => (
                  <tr key={item.area}>
                    <td>{item.area}</td>
                    <td>{item.total}</td>
                    <td>{item.completed}</td>
                    <td>{formatMinutes(item.averageMinutes)}</td>
                    <td>{formatPercent(item.slaPercent)}</td>
                    <td>{item.boardCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </DashboardSection>
      )) : null}

      {confirmResetOpen ? createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0, 0, 0, 0.45)", padding: "1rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "1.25rem", padding: "2rem", maxWidth: 420, width: "100%", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)" }}>
            <h3 id="reset-confirm-title" style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "#314d69" }}>¿Reiniciar datos del dashboard?</h3>
            <p style={{ margin: "0 0 1.5rem", color: "#555555", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Este reinicio es global y permanente. Se eliminarán semanas, actividades, pausas y filas operativas del dashboard para todos los usuarios.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{ padding: "0.5rem 1.25rem", borderRadius: "0.75rem", border: "1px solid #dddddd", background: "#f3f4f6", cursor: "pointer" }}
                onClick={() => setConfirmResetOpen(false)}
                disabled={isResetSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{ padding: "0.5rem 1.25rem", borderRadius: "0.75rem", border: "none", background: "#314d69", color: "#ffffff", cursor: "pointer" }}
                onClick={() => { void confirmHardReset(); }}
                disabled={isResetSubmitting}
              >
                {isResetSubmitting ? "Reiniciando..." : "Sí, reiniciar"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
      {liveOperationalAlertsModalOpen && liveOperationalBoardAlerts.length ? createPortal(
        <div role="dialog" aria-modal="true" className="sicfla-modal-backdrop" style={{ zIndex: 9998 }}>
          <div className="surface-card" style={{ width: "min(720px, 96vw)", maxHeight: "82vh", overflow: "auto", padding: "1rem" }}>
            <div className="dashboard-live-alerts-header">
              <div>
                <h3 style={{ margin: 0 }}>Alertas operativas en vivo</h3>
                <p className="subtle-line">Selecciona una actividad para ir al tablero vigente.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setLiveOperationalAlertsModalOpen(false)}>Cerrar</button>
            </div>
            <div className="board-operational-alerts-modal-list" style={{ marginTop: "0.75rem" }}>
              {liveOperationalBoardAlerts.map((record) => {
                const isDelayed = record.excessSeconds > 0 && record.status !== STATUS_FINISHED;
                const chipTone = isDelayed ? "danger" : record.status === STATUS_PAUSED ? "warning" : "primary";
                const detail = isDelayed
                  ? `Retraso +${formatDurationClock(record.excessSeconds)}`
                  : record.status === STATUS_PAUSED
                    ? "En pausa"
                    : "En curso";
                return (
                  <button
                    key={record.id}
                    type="button"
                    className={`chip ${chipTone} custom-board-sla-chip board-operational-alerts-modal-item`}
                    onClick={() => goToBoardFromDashboardRecord(record, { openPauseDetails: record.status === STATUS_PAUSED })}
                  >
                    <strong>{record.label}</strong>
                    <span>{detail} · {record.boardName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
      {pauseModalOpen && pauseModalData ? createPortal(
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0, 0, 0, 0.45)", padding: "1rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "1rem", padding: "1rem", maxWidth: 760, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: 0 }}>{pauseModalData.reasonEntry.reason} · {pauseModalData.board.boardName}</h3>
                <small>{(pauseModalData.logs || []).length} evento(s) · {Math.round(((pauseModalData.reasonEntry.seconds || 0) / 60))} min</small>
              </div>
              <button type="button" style={{ padding: "0.4rem 0.8rem", borderRadius: "0.6rem", border: "1px solid #ddd", background: "#f3f4f6" }} onClick={() => setPauseModalOpen(false)}>Cerrar</button>
            </div>
            <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
              {(pauseModalData.logs || []).length ? (pauseModalData.logs || []).map((entry, idx) => {
                const activityLabel = String(entry.activityLabel || entry.sourceRecord?.label || "").trim();
                const playerName = String(entry.sourceRecord?.responsibleName || "").trim();
                const naveLabel = String(entry.cleaningSite || entry.sourceRecord?.cleaningSite || entry.sourceRecord?.operationalContextValue || "").trim();
                const dateLabel = String(entry.operationalDate || entry.sourceRecord?.operationalDate || "").trim();
                return (
                <div key={entry.id || `${entry.rowId}-${entry.pausedAt}-${idx}`} style={{ border: "1px solid rgba(49, 77, 105, 0.12)", borderRadius: "0.6rem", padding: "0.65rem", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "0.5rem", alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1f2937" }}>{activityLabel || "Actividad sin nombre"}</div>
                    <div style={{ fontSize: "0.84rem", color: "#374151", marginTop: "0.15rem" }}>
                      Motivo: {entry.reason || pauseModalData.reasonEntry.reason}
                    </div>
                    {(playerName || naveLabel || dateLabel) ? (
                      <div style={{ fontSize: "0.8rem", color: "#4b5563", marginTop: "0.2rem" }}>
                        {[playerName ? `Player: ${playerName}` : null, naveLabel ? `Nave: ${naveLabel}` : null, dateLabel ? `Día: ${dateLabel}` : null].filter(Boolean).join(" · ")}
                      </div>
                    ) : null}
                    <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      Pausado: {entry.pausedAt ? new Date(entry.pausedAt).toLocaleString("es-MX") : "-"} · Reanudó: {entry.resumedAt ? new Date(entry.resumedAt).toLocaleString("es-MX") : "-"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "0.35rem", justifyItems: "end" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "#1f2937" }}>{Math.round((entry.pauseDurationSeconds || 0) / 60)} min</div>
                      <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>Aut: {Math.round((entry.pauseAuthorizedSeconds || 0) / 60)}m</div>
                      <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>Contado: {Math.round((entry.countedPauseDurationSeconds || entry.pauseDurationSeconds || 0) / 60)}m</div>
                    </div>
                    <button
                      type="button"
                      style={{ padding: "0.35rem 0.65rem", borderRadius: "0.5rem", border: "none", background: "#314d69", color: "#fff", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                      onClick={() => goToBoardFromPauseLogEntry(entry)}
                    >
                      Ver en tablero
                    </button>
                  </div>
                </div>
              );}) : <div>No hay eventos de pausa para esta causa en el tablero.</div>}
            </div>
          </div>
        </div>, document.body) : null}
    </section>
  );
}
