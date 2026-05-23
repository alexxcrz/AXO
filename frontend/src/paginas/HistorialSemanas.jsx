import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import OperationalInspectionRecordModal from "../components/OperationalInspectionRecordModal.jsx";
import {
  formatPercent,
  formatBoardPreviewValue,
  formatTime,
  isBoardActivityListField,
  resolveBoardRowHistoryTimeDisplay,
} from "../utils/utilidades";

// Fallback defaults for operational week settings used by the history views
const HISTORY_WORK_WEEK_DEFAULTS = {};

function getMonthKeyFromWeek(week) {
  const baseDate = week?.startDate || week?.endDate || "";
  return toDateParts(baseDate)?.month || "";
}

function getBoardRowHistoryDateValue(snapshot, row) {
  const dateField = (snapshot?.fields || []).find((field) => field?.type === "date");
  const fieldValue = dateField ? String(row?.values?.[dateField.id] || "").trim() : "";
  if (fieldValue) {
    return /^\d{4}-\d{2}-\d{2}$/.test(fieldValue) ? `${fieldValue}T00:00:00` : fieldValue;
  }
  return row?.endTime || row?.startTime || row?.createdAt || snapshot?.endDate || snapshot?.startDate;
}

function toDayStart(dateValue) {
  const next = parseHistoryDate(dateValue);
  if (!next) return null;
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDayEnd(dateValue) {
  const next = parseHistoryDate(dateValue);
  if (!next) return null;
  next.setHours(23, 59, 59, 999);
  return next;
}

function toIsoDate(value) {
  const date = parseHistoryDate(value);
  if (!date) return "";
  return getHistoryDateKey(date);
}

function parseHistoryDate(value) {
  if (value === null || value === undefined) return null;
  try {
    const str = String(value).trim();
    // Accept date-only YYYY-MM-DD
    const m = /^\d{4}-\d{2}-\d{2}$/.test(str);
    if (m) return new Date(`${str}T00:00:00`);
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch (_e) {
    return null;
  }
}

function getHistoryDateKey(date) {
  if (!date) return "";
  const d = typeof date === "string" ? parseHistoryDate(date) : date instanceof Date ? date : new Date(date);
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getHistoryMonthKeyFromDate(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const SECTION_AREA_SCOPE_MAP = {
  esto: ["ESTO"],
  transporte: ["TRANSPORTE"],
  limpieza: ["LIMPIEZA"],
  regulatorio: ["REGULATORIO"],
  calidad: ["CALIDAD"],
  inventario: ["INVENTARIO"],
  "recepcion-pedidos": ["RECEPCION DE PEDIDOS", "PEDIDOS"],
  operaciones: ["OPERACIONES"],
  mantenimiento: ["MANTENIMIENTO"],
  "mejora-continua": ["MEJORA CONTINUA"],
  "mayoreo-comercio": ["MAYOREO-TELEMARKETING", "ECOMMERCE", "PEDIDOS DETAL", "PEDIDOS"],
  retail: ["RETAIL"],
  fullfilment: ["FULLFILMENT"],
};

function normalizeHistoryAreaText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseHistoryDateOnly(value) {
  if (!value && value !== 0) return null;
  try {
    const str = String(value);
    // Accept plain date strings YYYY-MM-DD
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      return new Date(y, mo, d);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  } catch (_e) {
    return null;
  }
}

function toDateParts(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return null;
  const year = String(date.getFullYear());
  const month = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const day = `${month}-${String(date.getDate()).padStart(2, "0")}`;
  return { date, year, month, day };
}

function monthLabel(monthKey) {
  const [year, month] = String(monthKey || "").split("-");
  const safeDate = new Date(`${year || "1970"}-${month || "01"}-01T00:00:00`);
  if (Number.isNaN(safeDate.getTime())) return monthKey;
  return safeDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function renderHistoryFieldValue(field, rawValue, activity = null) {
  try {
    if (activity) {
      return resolveBoardRowHistoryTimeDisplay(
        {
          startTime: activity.startTime,
          endTime: activity.endTime,
        },
        field,
        rawValue,
      );
    }
    return formatBoardPreviewValue(rawValue, field, {}, []);
  } catch (_e) {
    return rawValue === undefined || rawValue === null ? "" : String(rawValue);
  }
}

function getHistoryExportWindow(week, periodType) {
  const baseDate = parseHistoryDate(week?.startDate || week?.endDate || new Date().toISOString());
  if (!baseDate) return null;

  if (periodType === "week") {
    const start = toDayStart(week?.startDate || baseDate);
    const end = toDayEnd(week?.endDate || week?.startDate || baseDate);
    if (!start || !end) return null;
    return {
      periodType,
      label: week?.name || `Semana ${toIsoDate(start)}`,
      start,
      end,
      fileSuffix: `semana_${toIsoDate(start)}`,
    };
  }

  if (periodType === "quincena1") {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const start = toDayStart(new Date(year, month, 1));
    const end = toDayEnd(new Date(year, month, 15));
    if (!start || !end) return null;
    const monthKey = getHistoryMonthKeyFromDate(start);
    return {
      periodType,
      label: `1ra quincena ${start.toLocaleDateString("es-MX", { month: "long", year: "numeric" })} (1-15)`,
      start,
      end,
      fileSuffix: `quincena_1_${monthKey}`,
    };
  }

  if (periodType === "quincena2") {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const start = toDayStart(new Date(year, month, 16));
    const end = toDayEnd(new Date(year, month + 1, 0));
    if (!start || !end) return null;
    const monthKey = getHistoryMonthKeyFromDate(start);
    return {
      periodType,
      label: `2da quincena ${start.toLocaleDateString("es-MX", { month: "long", year: "numeric" })} (16-${end.getDate()})`,
      start,
      end,
      fileSuffix: `quincena_2_${monthKey}`,
    };
  }

  const start = toDayStart(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
  const end = toDayEnd(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0));
  if (!start || !end) return null;
  const monthKey = getHistoryMonthKeyFromDate(start);
  return {
    periodType: "month",
    label: start.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
    start,
    end,
    fileSuffix: `mes_${monthKey}`,
  };
}

function getHistoryExportWindowFromMonthKey(monthKey, periodType) {
  const [yearValue, monthValue] = String(monthKey || "").split("-").map((part) => Number(part));
  if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue)) return null;
  const baseDate = periodType === "quincena2"
    ? new Date(yearValue, monthValue - 1, 16)
    : new Date(yearValue, monthValue - 1, 1);
  return getHistoryExportWindow({ startDate: baseDate }, periodType);
}

function sanitizeFileNamePart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function resolveBoardRowHistoryActivityValue(snapshot, row) {
  const fields = Array.isArray(snapshot?.fields) ? snapshot.fields : [];
  const rowValues = row?.values && typeof row.values === "object" ? row.values : {};

  const activityListField = fields.find((field) => isBoardActivityListField(field));
  if (activityListField?.id) {
    const rawActivityValue = String(rowValues?.[activityListField.id] || "").trim();
    if (rawActivityValue) return rawActivityValue;
  }

  const namedActivityField = fields.find((field) => String(field?.label || "").trim().toLowerCase().includes("actividad"));
  if (namedActivityField?.id) {
    const namedActivityValue = String(rowValues?.[namedActivityField.id] || "").trim();
    if (namedActivityValue) return namedActivityValue;
  }

  const preferredField = fields.find((field) => {
    const fieldType = String(field?.type || "").trim().toLowerCase();
    if (["date", "time", "duration", "status", "formula"].includes(fieldType)) return false;
    return String(rowValues?.[field?.id] || "").trim();
  });
  if (preferredField?.id) {
    const preferredValue = String(rowValues?.[preferredField.id] || "").trim();
    if (preferredValue) return preferredValue;
  }

  return String(Object.values(rowValues).find((value) => String(value || "").trim()) || "").trim();
}

function collectSnapshotFieldsFromActivities(activities = []) {
  const fieldMap = new Map();
  (Array.isArray(activities) ? activities : []).forEach((activity) => {
    if (!activity?.derivedFromBoardHistory || !Array.isArray(activity.snapshotFields)) return;
    activity.snapshotFields.forEach((field) => {
      const fieldId = String(field?.id || "").trim();
      if (!fieldId || fieldMap.has(fieldId)) return;
      fieldMap.set(fieldId, field);
    });
  });
  return Array.from(fieldMap.values());
}

function buildFallbackWeekReportSections(week) {
  const start = parseHistoryDate(week?.startDate);
  const end = parseHistoryDate(week?.endDate);
  if (!start || !end) return [];

  const normalizedStart = new Date(start);
  normalizedStart.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(end);
  normalizedEnd.setHours(0, 0, 0, 0);

  const yearMap = new Map();
  for (let cursor = new Date(normalizedStart); cursor <= normalizedEnd; cursor.setDate(cursor.getDate() + 1)) {
    const parts = toDateParts(cursor);
    if (!parts) continue;

    if (!yearMap.has(parts.year)) {
      yearMap.set(parts.year, {
        yearKey: parts.year,
        total: 0,
        completed: 0,
        totalSeconds: 0,
        months: new Map(),
      });
    }

    const yearEntry = yearMap.get(parts.year);
    if (!yearEntry.months.has(parts.month)) {
      yearEntry.months.set(parts.month, {
        monthKey: parts.month,
        total: 0,
        completed: 0,
        totalSeconds: 0,
        days: new Map(),
      });
    }

    const monthEntry = yearEntry.months.get(parts.month);
    monthEntry.days.set(parts.day, {
      dayKey: parts.day,
      total: 0,
      completed: 0,
      totalSeconds: 0,
    });
  }

  return Array.from(yearMap.values())
    .map((yearEntry) => ({
      ...yearEntry,
      months: Array.from(yearEntry.months.values())
        .map((monthEntry) => ({
          ...monthEntry,
          days: Array.from(monthEntry.days.values()).sort((left, right) => right.dayKey.localeCompare(left.dayKey)),
        }))
        .sort((left, right) => right.monthKey.localeCompare(left.monthKey)),
    }))
    .sort((left, right) => right.yearKey.localeCompare(left.yearKey));
}

function buildWeekDaySections(week, activities, finishedStatus, _workWeek) {
  const grouped = new Map();

  activities.forEach((activity) => {
    const parts = toDateParts(activity.activityDate);
    if (!parts) return;

    if (!grouped.has(parts.day)) {
      grouped.set(parts.day, {
        dayKey: parts.day,
        total: 0,
        completed: 0,
        totalSeconds: 0,
        activities: [],
      });
    }

    const entry = grouped.get(parts.day);
    entry.total += 1;
    entry.completed += activity.status === finishedStatus ? 1 : 0;
    entry.totalSeconds += Number(activity.accumulatedSeconds || 0);
    entry.activities.push(activity);
  });

  let start = parseHistoryDateOnly(week?.startDate);
  let end = parseHistoryDateOnly(week?.endDate);

  if (!start && end) {
    start = new Date(end);
    start.setDate(start.getDate() - 6);
  }
  if (!end && start) {
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  }

  if (!start || !end) {
    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        activities: [...entry.activities].sort((left, right) => (parseHistoryDate(left.activityDate)?.getTime() ?? 0) - (parseHistoryDate(right.activityDate)?.getTime() ?? 0)),
      }))
      .sort((left, right) => left.dayKey.localeCompare(right.dayKey));
  }

  const normalizedStart = new Date(start);
  normalizedStart.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(end);
  normalizedEnd.setHours(0, 0, 0, 0);

  const sections = [];
  for (const cursor = new Date(normalizedStart); cursor <= normalizedEnd; cursor.setDate(cursor.getDate() + 1)) {
    const parts = toDateParts(cursor);
    if (!parts) continue;

    const existing = grouped.get(parts.day);
    sections.push({
      dayKey: parts.day,
      total: existing?.total || 0,
      completed: existing?.completed || 0,
      totalSeconds: existing?.totalSeconds || 0,
      activities: existing
        ? [...existing.activities].sort((left, right) => (parseHistoryDate(left.activityDate)?.getTime() ?? 0) - (parseHistoryDate(right.activityDate)?.getTime() ?? 0))
        : [],
    });
  }

  return sections;
}

export default function HistorialSemanas({ contexto }) {
  const {
    state,
    StatTile,
    STATUS_FINISHED,
    formatDate,
    setSelectedHistoryWeekId,
    Search,
    historyWeek,
    MetricCard,
    getActivityLabel,
    getTimeLimitMinutes: _getTimeLimitMinutes,
    catalogMap,
    userMap,
    getUserArea,
    StatusBadge,
    formatTime,
    formatDurationClock,
    setEditWeekId,
    actionPermissions,
    deleteWeek,
    deleteBoardHistoryRecord,
    updateBoardHistoryRecord,
    removeWeekActivity,
    setState,
    pushAppToast,
    Trash2: Trash2Icon,
    operationalWorkWeek,
    selectedAreaSectionId,
    selectedAreaSection,
  } = contexto;

  const normalizedOperationalWorkWeek = useMemo(() => ({
    ...HISTORY_WORK_WEEK_DEFAULTS,
    ...(operationalWorkWeek && typeof operationalWorkWeek === "object" ? operationalWorkWeek : {}),
  }), [operationalWorkWeek]);

  const [deleteWeekModal, setDeleteWeekModal] = useState({ open: false, weekId: "", weekName: "", isSubmitting: false });
  const [selectedAreaTab, setSelectedAreaTab] = useState("");
  const [selectedBoardTab, setSelectedBoardTab] = useState("");
  const [selectedPlayerTab, setSelectedPlayerTab] = useState("all");
  const [selectedYearFilter, setSelectedYearFilter] = useState("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("all");
  const [selectedDayFilter, setSelectedDayFilter] = useState("all");
  const [historyExportPeriod, setHistoryExportPeriod] = useState("week");
  const [isExportingHistoryPdf, setIsExportingHistoryPdf] = useState(false);
  const [fallbackHistoryWeekId, setFallbackHistoryWeekId] = useState("");
  const [openReportMonth, setOpenReportMonth] = useState("");
  const [openReportYear, setOpenReportYear] = useState("");
  const [expandedDayKey, setExpandedDayKey] = useState("");
  const [openHistoryMonth, setOpenHistoryMonth] = useState("");
  const [historyDetailTab, setHistoryDetailTab] = useState("activities");
  const [selectedChecklistAreaTab, setSelectedChecklistAreaTab] = useState("");
  const [isExportingChecklistPdf, setIsExportingChecklistPdf] = useState(false);
  const [checklistRecordModalState, setChecklistRecordModalState] = useState({ open: false, activityLabel: "", record: null });
  const [historyEditModal, setHistoryEditModal] = useState({
    open: false,
    submitting: false,
    activity: null,
    draft: null,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function resolveBoardHistoryAreaLabel(snapshot, responsibleUser) {
    const boardArea = String(snapshot?.settings?.ownerArea || snapshot?.ownerArea || "").trim();
    if (boardArea) return boardArea;
    return String(getUserArea(responsibleUser) || "Sin area").trim() || "Sin area";
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function resolveBoardHistoryAreaRoot(snapshot, responsibleUser) {
    const areaLabel = resolveBoardHistoryAreaLabel(snapshot, responsibleUser);
    return areaLabel.split("/")[0]?.trim() || areaLabel;
  }

  const derivedBoardWeeks = useMemo(() => {
    const grouped = new Map();
    (state.boardWeekHistory || []).forEach((snapshot) => {
      const weekKey = String(snapshot?.weekKey || "").trim();
      if (!weekKey) return;
      if (!grouped.has(weekKey)) {
        grouped.set(weekKey, {
          id: weekKey,
          name: String(snapshot?.weekName || `Semana ${weekKey}`).trim() || `Semana ${weekKey}`,
          startDate: snapshot?.startDate || null,
          endDate: snapshot?.endDate || null,
          isActive: weekKey === state?.boardWeeklyCycle?.activeWeekKey,
        });
      }
    });

    const activeWeekKey = String(state?.boardWeeklyCycle?.activeWeekKey || "").trim();
    const hasCurrentBoardRows = (state.controlBoards || []).some((board) => Array.isArray(board?.rows) && board.rows.length > 0);
    if (activeWeekKey && hasCurrentBoardRows && !grouped.has(activeWeekKey)) {
      grouped.set(activeWeekKey, {
        id: activeWeekKey,
        name: `Semana activa ${activeWeekKey}`,
        startDate: state?.boardWeeklyCycle?.activeWeekStartDate || null,
        endDate: state?.boardWeeklyCycle?.activeWeekEndDate || null,
        isActive: true,
      });
    }

    return Array.from(grouped.values()).sort((left, right) => String(right.startDate || right.id).localeCompare(String(left.startDate || left.id)));
  }, [state.boardWeekHistory, state.controlBoards, state.boardWeeklyCycle?.activeWeekEndDate, state.boardWeeklyCycle?.activeWeekKey, state.boardWeeklyCycle?.activeWeekStartDate]);

  const useBoardHistoryFallback = (state.weeks || []).length === 0 && derivedBoardWeeks.length > 0;
  const effectiveWeeks = useMemo(
    () => useBoardHistoryFallback ? derivedBoardWeeks : (state.weeks || []),
    [useBoardHistoryFallback, derivedBoardWeeks, state.weeks],
  );
  const effectiveHistoryWeek = useBoardHistoryFallback
    ? (effectiveWeeks.find((week) => week.id === fallbackHistoryWeekId) || effectiveWeeks[0] || null)
    : historyWeek;

  function selectWeek(weekId) {
    if (!weekId) return;
    setSelectedHistoryWeekId(weekId);
    if (useBoardHistoryFallback) {
      setFallbackHistoryWeekId(weekId);
    }
  }

  function resolveHistoryActivityLabel(activity) {
    if (activity?.derivedFromBoardHistory) return String(activity.activityLabel || "Actividad").trim() || "Actividad";
    return getActivityLabel(activity, catalogMap);
  }

  function getHistoryPlayerKey(activity) {
    if (!activity?.responsibleId) return "__sin_player__";
    return String(activity.responsibleId);
  }

  function resolveHistoryPlayerLabel(activity) {
    if (!activity?.responsibleId) return "Sin player";
    return String(userMap.get(activity.responsibleId)?.name || "Sin player").trim() || "Sin player";
  }

  const weekAreaMap = useMemo(() => {
    const map = new Map();
    effectiveWeeks.forEach((week) => {
      const areas = new Set();

      if (!useBoardHistoryFallback) {
        (state.activities || [])
          .filter((activity) => activity.weekId === week.id)
          .forEach((activity) => {
            const areaValue = getUserArea(userMap.get(activity.responsibleId));
            areas.add(String(areaValue || "Sin area").trim() || "Sin area");
          });
      } else {
        (state.boardWeekHistory || [])
          .filter((snapshot) => String(snapshot?.weekKey || "").trim() === week.id)
          .forEach((snapshot) => {
            (snapshot?.rows || []).forEach((row) => {
              const responsibleUser = userMap.get(row.responsibleId);
              areas.add(resolveBoardHistoryAreaRoot(snapshot, responsibleUser));
            });
          });

        if (week.id === state?.boardWeeklyCycle?.activeWeekKey) {
          (state.controlBoards || []).forEach((board) => {
            (board?.rows || []).forEach((row) => {
              const responsibleUser = userMap.get(row.responsibleId);
              areas.add(resolveBoardHistoryAreaRoot(board, responsibleUser));
            });
          });
        }
      }

      map.set(week.id, areas.size);
    });
    return map;
  }, [effectiveWeeks, getUserArea, resolveBoardHistoryAreaRoot, state.activities, state.boardWeekHistory, state.controlBoards, state.boardWeeklyCycle?.activeWeekKey, useBoardHistoryFallback, userMap]);

  const weekStatsMap = useMemo(() => {
    const map = new Map();
    effectiveWeeks.forEach((week) => {
      const weekRows = useBoardHistoryFallback
        ? (state.boardWeekHistory || [])
          .filter((snapshot) => String(snapshot?.weekKey || "").trim() === week.id)
          .flatMap((snapshot) => (snapshot?.rows || []).map((row) => ({ ...row, weekId: week.id })))
          .concat(
            week.id === state?.boardWeeklyCycle?.activeWeekKey
              ? (state.controlBoards || []).flatMap((board) => (board?.rows || []).map((row) => ({ ...row, weekId: week.id })))
              : [],
          )
        : (state.activities || []).filter((activity) => activity.weekId === week.id);

      map.set(week.id, {
        total: weekRows.length,
        completed: weekRows.filter((activity) => activity.status === STATUS_FINISHED).length,
        areas: weekAreaMap.get(week.id) || 0,
      });
    });
    return map;
  }, [STATUS_FINISHED, effectiveWeeks, state, useBoardHistoryFallback, weekAreaMap]);

  const buildHistoryActivitiesForWeek = useCallback((week) => {
    if (!week?.id) return [];

    if (useBoardHistoryFallback) {
      const snapshots = (state.boardWeekHistory || [])
        .filter((snapshot) => String(snapshot?.weekKey || "").trim() === week.id);

      const activeWeekKey = String(state?.boardWeeklyCycle?.activeWeekKey || "").trim();
      const liveBoardsForWeek = week.id === activeWeekKey
        ? (state.controlBoards || []).map((board) => ({
          id: `${board.id}-live`,
          boardId: board.id,
          sourceBoardId: board.id,
          ownerId: board.ownerId,
          ownerArea: board.ownerArea,
          boardName: board.name,
          rows: board.rows || [],
          fields: board.fields || [],
          settings: board.settings || {},
          startDate: state?.boardWeeklyCycle?.activeWeekStartDate || null,
          endDate: state?.boardWeeklyCycle?.activeWeekEndDate || null,
        }))
        : [];

      const allSources = snapshots.concat(liveBoardsForWeek);

      return allSources.flatMap((snapshot) => {
        const snapshotBoardKey = String(snapshot?.boardId || snapshot?.sourceBoardId || snapshot?.id || "").trim()
          || String(snapshot?.id || "").trim();
        const boardContext = String(snapshot?.settings?.operationalContextValue || "").trim();
        const boardName = String(snapshot?.boardName || "Tablero").trim() || "Tablero";
        return (snapshot?.rows || []).map((row) => {
          const user = userMap.get(row.responsibleId);
          const areaLabel = resolveBoardHistoryAreaLabel(snapshot, user);
          const areaRoot = resolveBoardHistoryAreaRoot(snapshot, user);
          const rowDateIso = getBoardRowHistoryDateValue(snapshot, row);
          const activityDate = new Date(rowDateIso);
          const hasValidDate = !Number.isNaN(activityDate.getTime());
          const dayLabel = hasValidDate
            ? activityDate.toLocaleDateString("es-MX", { weekday: "long" })
            : "Sin dia";
          const normalizedDayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
          const rowValueText = resolveBoardRowHistoryActivityValue(snapshot, row);

          const historyIsLive = String(snapshot?.id || "").endsWith("-live");
          return {
            id: `${snapshot.id}-${row.id}`,
            historySnapshotId: snapshot.id,
            historyRowId: row.id,
            historyBoardId: String(snapshot?.boardId || snapshot?.sourceBoardId || "").trim(),
            historyIsLive,
            weekId: week.id,
            activityDate: rowDateIso,
            responsibleId: row.responsibleId,
            status: row.status,
            startTime: row.startTime,
            endTime: row.endTime,
            accumulatedSeconds: Number(row.accumulatedSeconds || 0),
            areaLabel,
            areaRoot,
            boardKey: snapshotBoardKey || boardName,
            boardName,
            naveLabel: boardContext || boardName,
            dayLabel: normalizedDayLabel,
            activityLabel: String(rowValueText || boardName || "Actividad").trim() || "Actividad",
            lastPauseReason: String(row?.lastPauseReason || "").trim(),
            snapshotFields: Array.isArray(snapshot.fields) ? snapshot.fields : [],
            rowValues: row.values && typeof row.values === "object" ? row.values : {},
            operationalInspectionRecord: row?.operationalInspectionRecord && typeof row.operationalInspectionRecord === "object"
              ? row.operationalInspectionRecord
              : null,
            derivedFromBoardHistory: true,
          };
        });
      });
    }

    return (state.activities || [])
      .filter((activity) => activity.weekId === week.id)
      .map((activity) => {
        const user = userMap.get(activity.responsibleId);
        const areaLabel = String(getUserArea(user) || "Sin area").trim() || "Sin area";
        const areaRoot = areaLabel.split("/")[0]?.trim() || areaLabel;
        const catalogItem = catalogMap.get(activity.catalogActivityId);
        const boardName = String(catalogItem?.category || catalogItem?.area || "General").trim() || "General";
        const cleaningSites = Array.isArray(catalogItem?.cleaningSites)
          ? catalogItem.cleaningSites.map((site) => String(site || "").trim()).filter(Boolean)
          : [];
        const naveLabel = cleaningSites.length
          ? cleaningSites.join(", ")
          : (boardName || "Sin nave");

        const activityDate = new Date(activity.activityDate);
        const hasValidDate = !Number.isNaN(activityDate.getTime());
        const dayLabel = hasValidDate
          ? activityDate.toLocaleDateString("es-MX", { weekday: "long" })
          : "Sin dia";
        const normalizedDayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);

        return {
          ...activity,
          areaLabel,
          areaRoot,
          boardKey: String(activity.catalogActivityId || boardName).trim() || boardName,
          boardName,
          naveLabel,
          dayLabel: normalizedDayLabel,
          derivedFromBoardHistory: false,
        };
      });
  }, [catalogMap, getUserArea, resolveBoardHistoryAreaLabel, resolveBoardHistoryAreaRoot, state, useBoardHistoryFallback, userMap]);

  const historyActivities = useMemo(
    () => buildHistoryActivitiesForWeek(effectiveHistoryWeek),
    [buildHistoryActivitiesForWeek, effectiveHistoryWeek],
  );

  const selectedSectionAreaScopes = useMemo(() => {
    const sectionScopes = Array.isArray(selectedAreaSection?.scopes)
      ? selectedAreaSection.scopes.map((area) => String(area || "").trim()).filter(Boolean)
      : [];
    if (sectionScopes.length) return sectionScopes;

    const normalizedSectionId = String(selectedAreaSectionId || "").trim().toLowerCase();
    if (!normalizedSectionId || normalizedSectionId === "all") return [];
    return SECTION_AREA_SCOPE_MAP[normalizedSectionId] || [];
  }, [selectedAreaSection, selectedAreaSectionId]);

  const scopedHistoryActivities = useMemo(() => {
    if (!selectedSectionAreaScopes.length) return historyActivities;
    const normalizedScopes = selectedSectionAreaScopes.map((area) => normalizeHistoryAreaText(area)).filter(Boolean);
    if (!normalizedScopes.length) return historyActivities;
    return historyActivities.filter((activity) => {
      const areaRoot = normalizeHistoryAreaText(activity.areaRoot);
      return normalizedScopes.some((scope) => areaRoot === scope || areaRoot.includes(scope) || scope.includes(areaRoot));
    });
  }, [historyActivities, selectedSectionAreaScopes]);

  const areaTabs = useMemo(() => {
    const grouped = new Map();

    if (selectedSectionAreaScopes.length) {
      selectedSectionAreaScopes.forEach((areaScope) => {
        const areaRoot = String(areaScope || "").split("/")[0]?.trim();
        if (!areaRoot) return;
        if (!grouped.has(areaRoot)) grouped.set(areaRoot, 0);
      });
    } else {
      (state.areaCatalog || []).forEach((areaEntry) => {
        const areaRoot = String(areaEntry || "").split("/")[0]?.trim();
        if (!areaRoot) return;
        if (!grouped.has(areaRoot)) grouped.set(areaRoot, 0);
      });
    }

    scopedHistoryActivities.forEach((activity) => {
      grouped.set(activity.areaRoot, (grouped.get(activity.areaRoot) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([area, total]) => ({ value: area, label: area, total }))
      .sort((left, right) => left.label.localeCompare(right.label, "es-MX"));
  }, [scopedHistoryActivities, selectedSectionAreaScopes, state.areaCatalog]);

  const areaScopedActivities = useMemo(() => {
    if (!selectedAreaTab) return [];
    return scopedHistoryActivities.filter((activity) => activity.areaRoot === selectedAreaTab);
  }, [scopedHistoryActivities, selectedAreaTab]);

  const boardTabs = useMemo(() => {
    const grouped = new Map();
    areaScopedActivities.forEach((activity) => {
      const boardKey = String(activity.boardKey || activity.boardName || "General").trim() || "General";
      const boardName = String(activity.boardName || "General").trim() || "General";
      if (!grouped.has(boardKey)) {
        grouped.set(boardKey, { value: boardKey, label: boardName, total: 0 });
      }
      grouped.get(boardKey).total += 1;
    });
    return Array.from(grouped.values())
      .sort((left, right) => left.label.localeCompare(right.label, "es-MX"));
  }, [areaScopedActivities]);

  const boardScopedActivities = useMemo(() => {
    if (!selectedBoardTab) return [];
    return areaScopedActivities.filter((activity) => {
      const boardKey = String(activity.boardKey || activity.boardName || "").trim();
      return boardKey === selectedBoardTab;
    });
  }, [areaScopedActivities, selectedBoardTab]);

  const playerTabs = useMemo(() => {
    const grouped = new Map();

    boardScopedActivities.forEach((activity) => {
      const playerKey = getHistoryPlayerKey(activity);
      const playerLabel = resolveHistoryPlayerLabel(activity);
      if (!grouped.has(playerKey)) {
        grouped.set(playerKey, { value: playerKey, label: playerLabel, total: 0 });
      }
      grouped.get(playerKey).total += 1;
    });

    return Array.from(grouped.values()).sort((left, right) => left.label.localeCompare(right.label, "es-MX"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardScopedActivities, resolveHistoryPlayerLabel, userMap]);

  const playerScopedActivities = useMemo(() => {
    if (selectedPlayerTab === "all") return boardScopedActivities;
    return boardScopedActivities.filter((activity) => getHistoryPlayerKey(activity) === selectedPlayerTab);
  }, [boardScopedActivities, selectedPlayerTab]);

  const yearOptions = useMemo(() => {
    const years = new Set();
    playerScopedActivities.forEach((activity) => {
      const parts = toDateParts(activity.activityDate);
      if (parts) years.add(parts.year);
    });
    return Array.from(years.values()).sort((left, right) => right.localeCompare(left));
  }, [playerScopedActivities]);

  const monthOptions = useMemo(() => {
    const months = new Set();
    playerScopedActivities.forEach((activity) => {
      const parts = toDateParts(activity.activityDate);
      if (!parts) return;
      if (selectedYearFilter !== "all" && parts.year !== selectedYearFilter) return;
      months.add(parts.month);
    });
    return Array.from(months.values()).sort((left, right) => right.localeCompare(left));
  }, [playerScopedActivities, selectedYearFilter]);

  const dayOptions = useMemo(() => {
    const days = new Set();
    buildWeekDaySections(effectiveHistoryWeek, playerScopedActivities, STATUS_FINISHED, normalizedOperationalWorkWeek).forEach((entry) => {
      const parts = toDateParts(entry.dayKey);
      if (!parts) return;
      if (selectedYearFilter !== "all" && parts.year !== selectedYearFilter) return;
      if (selectedMonthFilter !== "all" && parts.month !== selectedMonthFilter) return;
      days.add(parts.day);
    });
    playerScopedActivities.forEach((activity) => {
      const parts = toDateParts(activity.activityDate);
      if (!parts) return;
      if (selectedYearFilter !== "all" && parts.year !== selectedYearFilter) return;
      if (selectedMonthFilter !== "all" && parts.month !== selectedMonthFilter) return;
      days.add(parts.day);
    });
    return Array.from(days.values()).sort((left, right) => right.localeCompare(left));
  }, [STATUS_FINISHED, effectiveHistoryWeek, normalizedOperationalWorkWeek, playerScopedActivities, selectedMonthFilter, selectedYearFilter]);

  const visibleHistoryActivities = useMemo(() => {
    return [...playerScopedActivities]
      .filter((activity) => {
        const parts = toDateParts(activity.activityDate);
        if (!parts) return false;
        if (selectedYearFilter !== "all" && parts.year !== selectedYearFilter) return false;
        if (selectedMonthFilter !== "all" && parts.month !== selectedMonthFilter) return false;
        if (selectedDayFilter !== "all" && parts.day !== selectedDayFilter) return false;
        return true;
      })
      .sort((left, right) => {
        const leftTime = parseHistoryDate(left.activityDate)?.getTime() ?? 0;
        const rightTime = parseHistoryDate(right.activityDate)?.getTime() ?? 0;
        if (leftTime !== rightTime) return leftTime - rightTime;
        return String(left.boardName || "").localeCompare(String(right.boardName || ""), "es-MX");
      });
  }, [playerScopedActivities, selectedDayFilter, selectedMonthFilter, selectedYearFilter]);

  const visibleHistorySummary = useMemo(() => {
    const activities = visibleHistoryActivities;
    const accumulatedSeconds = activities.reduce((sum, activity) => sum + Number(activity.accumulatedSeconds || 0), 0);
    const elapsedSeconds = activities.reduce((sum, activity) => {
      const start = parseHistoryDate(activity.startTime);
      const end = parseHistoryDate(activity.endTime);
      if (!start || !end) return sum;
      const duration = Math.max(0, end.getTime() - start.getTime());
      return sum + duration / 1000;
    }, 0);
    const efficiencyPercent = elapsedSeconds > 0 ? (accumulatedSeconds / elapsedSeconds) * 100 : 0;
    return {
      accumulatedSeconds,
      efficiencyPercent,
    };
  }, [visibleHistoryActivities]);

  const checklistActivities = useMemo(
    () => scopedHistoryActivities.filter((activity) => activity?.operationalInspectionRecord),
    [scopedHistoryActivities],
  );

  const checklistAreaTabs = useMemo(() => {
    const grouped = new Map();

    if (selectedSectionAreaScopes.length) {
      selectedSectionAreaScopes.forEach((areaScope) => {
        const areaRoot = String(areaScope || "").split("/")[0]?.trim();
        if (!areaRoot) return;
        if (!grouped.has(areaRoot)) grouped.set(areaRoot, 0);
      });
    } else {
      (state.areaCatalog || []).forEach((areaEntry) => {
        const areaRoot = String(areaEntry || "").split("/")[0]?.trim();
        if (!areaRoot) return;
        if (!grouped.has(areaRoot)) grouped.set(areaRoot, 0);
      });
    }

    checklistActivities.forEach((activity) => {
      grouped.set(activity.areaRoot, (grouped.get(activity.areaRoot) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([area, total]) => ({ value: area, label: area, total }))
      .sort((left, right) => left.label.localeCompare(right.label, "es-MX"));
  }, [checklistActivities, selectedSectionAreaScopes, state.areaCatalog]);

  const checklistAreaScopedActivities = useMemo(() => {
    if (!selectedChecklistAreaTab) return [];
    return checklistActivities
      .filter((activity) => activity.areaRoot === selectedChecklistAreaTab)
      .sort((left, right) => {
        const leftTime = parseHistoryDate(left.activityDate)?.getTime() ?? 0;
        const rightTime = parseHistoryDate(right.activityDate)?.getTime() ?? 0;
        return leftTime - rightTime;
      });
  }, [checklistActivities, selectedChecklistAreaTab]);

  const visibleChecklistActivities = useMemo(
    () => checklistAreaScopedActivities,
    [checklistAreaScopedActivities],
  );

  const reportYearSections = useMemo(() => {
    const grouped = new Map();

    playerScopedActivities.forEach((activity) => {
      const parts = toDateParts(activity.activityDate);
      if (!parts) return;

      const yearKey = parts.year;
      const monthKey = parts.month;
      const dayKey = parts.day;

      if (!grouped.has(yearKey)) {
        grouped.set(yearKey, {
          yearKey,
          total: 0,
          completed: 0,
          totalSeconds: 0,
          months: new Map(),
        });
      }

      const yearEntry = grouped.get(yearKey);
      yearEntry.total += 1;
      yearEntry.completed += activity.status === STATUS_FINISHED ? 1 : 0;
      yearEntry.totalSeconds += Number(activity.accumulatedSeconds || 0);

      if (!yearEntry.months.has(monthKey)) {
        yearEntry.months.set(monthKey, {
          monthKey,
          total: 0,
          completed: 0,
          totalSeconds: 0,
          days: new Map(),
        });
      }

      const monthEntry = yearEntry.months.get(monthKey);
      monthEntry.total += 1;
      monthEntry.completed += activity.status === STATUS_FINISHED ? 1 : 0;
      monthEntry.totalSeconds += Number(activity.accumulatedSeconds || 0);

      if (!monthEntry.days.has(dayKey)) {
        monthEntry.days.set(dayKey, {
          dayKey,
          total: 0,
          completed: 0,
          totalSeconds: 0,
        });
      }

      const dayEntry = monthEntry.days.get(dayKey);
      dayEntry.total += 1;
      dayEntry.completed += activity.status === STATUS_FINISHED ? 1 : 0;
      dayEntry.totalSeconds += Number(activity.accumulatedSeconds || 0);
    });

    const computed = Array.from(grouped.values())
      .map((yearEntry) => ({
        ...yearEntry,
        months: Array.from(yearEntry.months.values())
          .map((monthEntry) => ({
            ...monthEntry,
            days: Array.from(monthEntry.days.values()).sort((left, right) => right.dayKey.localeCompare(left.dayKey)),
          }))
          .sort((left, right) => right.monthKey.localeCompare(left.monthKey)),
      }))
      .sort((left, right) => right.yearKey.localeCompare(left.yearKey));

    if (computed.length) return computed;
    return buildFallbackWeekReportSections(effectiveHistoryWeek);
  }, [STATUS_FINISHED, effectiveHistoryWeek, playerScopedActivities]);

  const activeReportYear = useMemo(() => {
    if (selectedYearFilter !== "all") return selectedYearFilter;
    if (openReportYear) return openReportYear;
    return reportYearSections[0]?.yearKey || "";
  }, [openReportYear, reportYearSections, selectedYearFilter]);

  const reportMonthSections = useMemo(() => {
    const activeYearSection = reportYearSections.find((entry) => entry.yearKey === activeReportYear);
    if (!activeYearSection) return [];
    if (selectedMonthFilter === "all") return activeYearSection.months;
    return activeYearSection.months.filter((entry) => entry.monthKey === selectedMonthFilter);
  }, [activeReportYear, reportYearSections, selectedMonthFilter]);

  const _selectedDayActivities = useMemo(() => {
    if (selectedDayFilter === "all") return [];
    return visibleHistoryActivities.filter((activity) => {
      const parts = toDateParts(activity.activityDate);
      return parts?.day === selectedDayFilter;
    });
  }, [selectedDayFilter, visibleHistoryActivities]);

  const currentWeekStats = useMemo(() => {
    if (!effectiveHistoryWeek?.id) return { total: 0, completed: 0, areas: 0 };
    return weekStatsMap.get(effectiveHistoryWeek.id) || { total: 0, completed: 0, areas: 0 };
  }, [effectiveHistoryWeek, weekStatsMap]);

  const monthWeekSections = useMemo(() => {
    const grouped = new Map();

    effectiveWeeks.forEach((week) => {
      const monthKey = getMonthKeyFromWeek(week);
      if (!monthKey) return;

      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, {
          monthKey,
          weeks: [],
        });
      }

      grouped.get(monthKey).weeks.push(week);
    });

    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        weeks: [...entry.weeks].sort((left, right) => String(left.startDate || left.id).localeCompare(String(right.startDate || right.id))),
      }))
      .sort((left, right) => right.monthKey.localeCompare(left.monthKey));
  }, [effectiveWeeks]);

  const activeHistoryMonthKey = useMemo(() => {
    if (openHistoryMonth && monthWeekSections.some((entry) => entry.monthKey === openHistoryMonth)) return openHistoryMonth;
    return "";
  }, [monthWeekSections, openHistoryMonth]);

  const activeMonthWeeks = useMemo(() => {
    return monthWeekSections.find((entry) => entry.monthKey === activeHistoryMonthKey)?.weeks || [];
  }, [activeHistoryMonthKey, monthWeekSections]);

  const selectedWeekIndexInMonth = useMemo(() => {
    if (!effectiveHistoryWeek?.id) return -1;
    return activeMonthWeeks.findIndex((week) => week.id === effectiveHistoryWeek.id);
  }, [activeMonthWeeks, effectiveHistoryWeek]);

  const weeklyDaySections = useMemo(() => {
    return buildWeekDaySections(effectiveHistoryWeek, playerScopedActivities, STATUS_FINISHED, normalizedOperationalWorkWeek);
  }, [STATUS_FINISHED, effectiveHistoryWeek, normalizedOperationalWorkWeek, playerScopedActivities]);

  const canEditHistoricalWeekActivities = Boolean(
    actionPermissions.editHistoryRecords || actionPermissions.manageWeeks || actionPermissions.deleteWeekActivity,
  );
  const canDeleteHistoricalRecords = Boolean(
    actionPermissions.deleteWeekActivity || actionPermissions.editHistoryRecords || actionPermissions.manageWeeks,
  );

  function toDateTimeLocalValue(isoValue) {
    const date = parseHistoryDate(isoValue);
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d}T${hh}:${mm}`;
  }

  function fromDateTimeLocalValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  }

  function openHistoryEditModal(activity) {
    if (!activity) return;
    const editableFields = (activity.snapshotFields || []).filter((field) => {
      if (!field?.id) return false;
      if (field.type === "time" || field.type === "date" || field.type === "text" || field.type === "textarea" || field.type === "number") {
        return true;
      }
      return false;
    });
    setHistoryEditModal({
      open: true,
      submitting: false,
      activity,
      draft: {
        status: activity.status || "",
        startTimeLocal: toDateTimeLocalValue(activity.startTime),
        endTimeLocal: toDateTimeLocalValue(activity.endTime),
        accumulatedMinutes: Math.round(Number(activity.accumulatedSeconds || 0) / 60),
        responsibleId: activity.responsibleId || "",
        fieldValues: Object.fromEntries(editableFields.map((field) => [field.id, String(activity.rowValues?.[field.id] ?? "").trim()])),
        editableFields,
      },
    });
  }

  async function submitHistoryEditModal() {
    const { activity, draft } = historyEditModal;
    if (!activity || !draft || historyEditModal.submitting) return;
    setHistoryEditModal((current) => ({ ...current, submitting: true }));
    try {
      if (activity.derivedFromBoardHistory) {
        const patch = {
          status: draft.status,
          startTime: fromDateTimeLocalValue(draft.startTimeLocal) || null,
          endTime: fromDateTimeLocalValue(draft.endTimeLocal) || null,
          accumulatedSeconds: Math.max(0, Number(draft.accumulatedMinutes || 0) * 60),
          values: { ...(activity.rowValues || {}), ...(draft.fieldValues || {}) },
        };
        if (draft.responsibleId) patch.responsibleId = draft.responsibleId;
        await updateBoardHistoryRecord(
          activity.historySnapshotId,
          activity.historyRowId,
          patch,
          { boardId: activity.historyBoardId, isLive: activity.historyIsLive },
        );
      } else {
        setState((current) => ({
          ...current,
          activities: (current.activities || []).map((entry) => (
            entry.id === activity.id
              ? {
                ...entry,
                status: draft.status,
                startTime: fromDateTimeLocalValue(draft.startTimeLocal) || entry.startTime,
                endTime: fromDateTimeLocalValue(draft.endTimeLocal) || entry.endTime,
                accumulatedSeconds: Math.max(0, Number(draft.accumulatedMinutes || 0) * 60),
                responsibleId: draft.responsibleId || entry.responsibleId,
              }
              : entry
          )),
        }));
        pushAppToast("Actividad de semana actualizada.", "success");
      }
      setHistoryEditModal({ open: false, submitting: false, activity: null, draft: null });
    } catch {
      setHistoryEditModal((current) => ({ ...current, submitting: false }));
    }
  }

  async function handleDeleteHistoryActivity(activity) {
    if (!activity || !canDeleteHistoricalRecords) return;
    const label = resolveHistoryActivityLabel(activity);
    if (!globalThis.confirm(`¿Eliminar "${label}" del historial? Esta acción no se puede deshacer.`)) return;
    try {
      if (activity.derivedFromBoardHistory) {
        await deleteBoardHistoryRecord(
          activity.historySnapshotId,
          activity.historyRowId,
          { boardId: activity.historyBoardId, isLive: activity.historyIsLive },
        );
      } else if (typeof removeWeekActivity === "function") {
        removeWeekActivity(activity.id);
        pushAppToast("Actividad eliminada de la semana.", "success");
      }
    } catch {
      // El toast de error lo muestra el helper del contexto.
    }
  }

  const applyHistoryTabFilters = useCallback((activities) => {
    let filtered = Array.isArray(activities) ? activities : [];

    if (selectedSectionAreaScopes.length) {
      const normalizedScopes = selectedSectionAreaScopes.map((area) => normalizeHistoryAreaText(area)).filter(Boolean);
      if (normalizedScopes.length) {
        filtered = filtered.filter((activity) => {
          const areaRoot = normalizeHistoryAreaText(activity.areaRoot);
          return normalizedScopes.some((scope) => areaRoot === scope || areaRoot.includes(scope) || scope.includes(areaRoot));
        });
      }
    }

    if (selectedAreaTab) {
      filtered = filtered.filter((activity) => activity.areaRoot === selectedAreaTab);
    }

    if (selectedBoardTab) {
      filtered = filtered.filter((activity) => {
        const boardKey = String(activity.boardKey || activity.boardName || "").trim();
        return boardKey === selectedBoardTab;
      });
    }

    if (selectedPlayerTab !== "all") {
      filtered = filtered.filter((activity) => getHistoryPlayerKey(activity) === selectedPlayerTab);
    }

    return filtered;
  }, [selectedAreaTab, selectedBoardTab, selectedPlayerTab, selectedSectionAreaScopes]);

  const resolveHistoryExportBundle = useCallback(({ periodType, week, monthKey }) => {
    const normalizedPeriodType = String(periodType || "week").trim();
    let weeksForExport = [];

    if (monthKey) {
      const monthSection = monthWeekSections.find((entry) => entry.monthKey === monthKey);
      weeksForExport = monthSection?.weeks?.length
        ? monthSection.weeks
        : effectiveWeeks.filter((entry) => getMonthKeyFromWeek(entry) === monthKey);
    } else if (week?.id) {
      weeksForExport = [week];
    } else if (effectiveHistoryWeek?.id) {
      weeksForExport = [effectiveHistoryWeek];
    }

    const rawActivities = weeksForExport.flatMap((entry) => buildHistoryActivitiesForWeek(entry));
    const tabFilteredActivities = applyHistoryTabFilters(rawActivities);
    const exportWeek = week || effectiveHistoryWeek;
    const computedWindow = monthKey
      ? getHistoryExportWindowFromMonthKey(monthKey, normalizedPeriodType)
      : getHistoryExportWindow(exportWeek, normalizedPeriodType);

    if (!computedWindow) {
      return { computedWindow: null, exportActivities: [] };
    }

    const startMs = computedWindow.start.getTime();
    const endMs = computedWindow.end.getTime();
    const exportActivities = tabFilteredActivities
      .filter((activity) => {
        const activityMs = parseHistoryDate(activity.activityDate)?.getTime() ?? Number.NaN;
        return Number.isFinite(activityMs) && activityMs >= startMs && activityMs <= endMs;
      })
      .sort((left, right) => {
        const leftMs = parseHistoryDate(left.activityDate)?.getTime() ?? 0;
        const rightMs = parseHistoryDate(right.activityDate)?.getTime() ?? 0;
        if (leftMs !== rightMs) return leftMs - rightMs;
        return String(left.boardName || "").localeCompare(String(right.boardName || ""), "es-MX");
      });

    return { computedWindow, exportActivities };
  }, [
    applyHistoryTabFilters,
    buildHistoryActivitiesForWeek,
    effectiveHistoryWeek,
    effectiveWeeks,
    monthWeekSections,
  ]);

  const exportMonthKey = useMemo(() => {
    if (activeHistoryMonthKey) return activeHistoryMonthKey;
    return getMonthKeyFromWeek(effectiveHistoryWeek) || "";
  }, [activeHistoryMonthKey, effectiveHistoryWeek]);

  const exportableHistoryActivities = useMemo(() => {
    const monthKey = historyExportPeriod === "week" ? undefined : exportMonthKey;
    return resolveHistoryExportBundle({
      periodType: historyExportPeriod,
      week: effectiveHistoryWeek,
      monthKey,
    }).exportActivities;
  }, [effectiveHistoryWeek, exportMonthKey, historyExportPeriod, resolveHistoryExportBundle]);

  const exportableChecklistActivities = useMemo(() => {
    const monthKey = historyExportPeriod === "week" ? undefined : exportMonthKey;
    return resolveHistoryExportBundle({
      periodType: historyExportPeriod,
      week: effectiveHistoryWeek,
      monthKey,
    }).exportActivities.filter((activity) => activity?.operationalInspectionRecord);
  }, [effectiveHistoryWeek, exportMonthKey, historyExportPeriod, resolveHistoryExportBundle]);

  async function exportHistoryToPdf({ periodType = historyExportPeriod, week = effectiveHistoryWeek, monthKey } = {}) {
    if (isExportingHistoryPdf) return;
    const { computedWindow, exportActivities } = resolveHistoryExportBundle({ periodType, week, monthKey });
    if (!computedWindow) {
      pushAppToast("No hay rango de exportación válido.", "danger");
      return;
    }
    if (!exportActivities.length) {
      pushAppToast("No hay actividades en el rango de exportación.", "danger");
      return;
    }

    try {
      setIsExportingHistoryPdf(true);
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = autoTableModule.default || autoTableModule.autoTable;
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      pdf.setFillColor(15, 76, 92);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 48, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.text("Historial operativo AXIS ORDO", 36, 28);
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Periodo: ${computedWindow.label}`, 36, 64);
      pdf.text(`Area: ${selectedAreaTab || "-"} | Tablero: ${selectedBoardTab || "-"} | Player: ${selectedPlayerTab === "all" ? "Todos" : (playerTabs.find((tab) => tab.value === selectedPlayerTab)?.label || selectedPlayerTab)}`, 36, 80);
      pdf.text(`Generado: ${new Date().toLocaleString("es-MX")}`, 36, 96);

      const pdfBoardFields = collectSnapshotFieldsFromActivities(exportActivities);
      const pdfHeaders = pdfBoardFields.length > 0
        ? [...pdfBoardFields.map((f) => String(f.label || f.id || "")), "Player", "Estado", "Fecha", "Inicio", "Fin", "Tiempo"]
        : ["Area", "Tablero", "Actividad", "Player", "Estado", "Fecha", "Inicio", "Fin", "Tiempo"];

      // Group activities by day
      const dayGroups = new Map();
      exportActivities.forEach((activity) => {
        const parts = toDateParts(activity.activityDate);
        const dayKey = parts?.day || "sin-fecha";
        if (!dayGroups.has(dayKey)) {
          dayGroups.set(dayKey, []);
        }
        dayGroups.get(dayKey).push(activity);
      });

      // Sort days chronologically
      const sortedDays = Array.from(dayGroups.keys()).sort();

      // Generate one table per day
      let yPos = 104;
      const pageHeight = pdf.internal.pageSize.getHeight();
      for (const dayKey of sortedDays) {
        const activities = dayGroups.get(dayKey);
        // Check if we need a new page (reserve space for header and table)
        if (yPos > pageHeight - 80) {
          pdf.addPage();
          yPos = 20;
        }

        // Add day header
        const dayDate = parseHistoryDate(dayKey);
        const dayLabel = dayDate
          ? dayDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
          : dayKey;
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.text(`${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}`, 36, yPos);
        pdf.setFont(undefined, "normal");
        yPos += 14;

        // Build table body for this day
        const body = activities.map((activity) => {
          if (pdfBoardFields.length > 0) {
            return [
              ...pdfBoardFields.map((field) => String(activity.rowValues?.[field.id] ?? "")),
              resolveHistoryPlayerLabel(activity),
              String(activity.status || ""),
              formatDate(activity.activityDate),
              formatTime(activity.startTime),
              formatTime(activity.endTime),
              formatDurationClock(activity.accumulatedSeconds),
            ];
          }
          return [activity.areaRoot, activity.boardName || "General", resolveHistoryActivityLabel(activity), resolveHistoryPlayerLabel(activity), String(activity.status || ""), formatDate(activity.activityDate), formatTime(activity.startTime), formatTime(activity.endTime), formatDurationClock(activity.accumulatedSeconds)];
        });

        // Add table for this day
        autoTable(pdf, {
          startY: yPos,
          head: [pdfHeaders],
          body,
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: [3, 33, 33], textColor: [255, 255, 255] },
          theme: "grid",
        });

        yPos = (pdf.lastAutoTable?.finalY || yPos + 50) + 16;
      }

      const fileSuffix = sanitizeFileNamePart(computedWindow.fileSuffix || "historial");
      pdf.save(`copmec_historial_${fileSuffix || "export"}.pdf`);
      pushAppToast("PDF de historial exportado correctamente.", "success");
    } catch (error) {
      pushAppToast(error?.message || "No se pudo exportar el historial a PDF.", "danger");
    } finally {
      setIsExportingHistoryPdf(false);
    }
  }

  async function exportChecklistHistoryToPdf({ periodType = historyExportPeriod, week = effectiveHistoryWeek, monthKey } = {}) {
    if (isExportingChecklistPdf) return;
    const { computedWindow, exportActivities: periodActivities } = resolveHistoryExportBundle({ periodType, week, monthKey });
    if (!computedWindow) {
      pushAppToast("No hay rango de exportación válido.", "danger");
      return;
    }
    const exportActivities = periodActivities.filter((activity) => activity?.operationalInspectionRecord);
    if (!exportActivities.length) {
      pushAppToast("No hay checklist realizados para exportar.", "danger");
      return;
    }
    try {
      setIsExportingChecklistPdf(true);
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = autoTableModule.default || autoTableModule.autoTable;
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      pdf.setFillColor(15, 76, 92);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 48, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.text("Checklist realizados AXIS ORDO", 36, 28);
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Periodo: ${computedWindow.label}`, 36, 64);
      pdf.text(`Area: ${selectedChecklistAreaTab || "-"}`, 36, 80);
      pdf.text(`Generado: ${new Date().toLocaleString("es-MX")}`, 36, 96);

      const body = exportActivities.map((activity) => {
        const record = activity.operationalInspectionRecord || {};
        const observations = String(record?.draft?.observations || "").trim() || "-";
        const evidenceUrls = Object.values(record?.draft?.checks || {})
          .flatMap((check) => (Array.isArray(check?.photos) ? check.photos : []))
          .map((photo) => String(photo?.url || "").trim())
          .filter(Boolean)
          .join("\n") || "-";
        return [
          formatDate(activity.activityDate),
          activity.areaRoot,
          activity.boardName || "General",
          resolveHistoryActivityLabel(activity),
          resolveHistoryPlayerLabel(activity),
          String(record?.completedAt || activity.activityDate || ""),
          String(record?.incidencias?.length || 0),
          observations,
          evidenceUrls,
        ];
      });

      autoTable(pdf, {
        startY: 104,
        head: [["Fecha", "Area", "Tablero", "Actividad", "Player", "Completado", "Incidencias", "Observaciones", "Evidencias"]],
        body,
        styles: { fontSize: 7, cellPadding: 4, valign: "top" },
        headStyles: { fillColor: [3, 33, 33], textColor: [255, 255, 255] },
        theme: "grid",
      });

      const fileSuffix = sanitizeFileNamePart(computedWindow.fileSuffix || "checklists");
      pdf.save(`copmec_checklists_${fileSuffix || "export"}.pdf`);
      pushAppToast("PDF de checklist exportado correctamente.", "success");
    } catch (error) {
      pushAppToast(error?.message || "No se pudo exportar el checklist a PDF.", "danger");
    } finally {
      setIsExportingChecklistPdf(false);
    }
  }

  const confirmDeleteWeek = useCallback(async () => {
    if (!deleteWeekModal.weekId || deleteWeekModal.isSubmitting) return;
    setDeleteWeekModal((current) => ({ ...current, isSubmitting: true }));
    try {
      await deleteWeek(deleteWeekModal.weekId);
      pushAppToast(`Semana ${deleteWeekModal.weekName} eliminada correctamente.`, "success");
      setDeleteWeekModal({ open: false, weekId: "", weekName: "", isSubmitting: false });
    } catch (error) {
      pushAppToast(error?.message || "No se pudo eliminar la semana.", "danger");
      setDeleteWeekModal((current) => ({ ...current, isSubmitting: false }));
    }
  }, [deleteWeek, deleteWeekModal.isSubmitting, deleteWeekModal.weekId, deleteWeekModal.weekName, pushAppToast]);

  useEffect(() => {
    setSelectedAreaTab("");
    setSelectedChecklistAreaTab("");
    setSelectedBoardTab("");
    setSelectedPlayerTab("all");
    setSelectedYearFilter("all");
    setSelectedMonthFilter("all");
    setSelectedDayFilter("all");
    setOpenReportMonth("");
    setOpenReportYear("");
    setExpandedDayKey("");
  }, [effectiveHistoryWeek?.id]);

  useEffect(() => {
    if (!reportMonthSections.length) {
      setOpenReportMonth("");
      return;
    }
    if (openReportMonth && reportMonthSections.some((entry) => entry.monthKey === openReportMonth)) return;
    setOpenReportMonth(reportMonthSections[0]?.monthKey || "");
  }, [openReportMonth, reportMonthSections]);

  useEffect(() => {
    if (!reportYearSections.length) {
      setOpenReportYear("");
      return;
    }
    if (activeReportYear && reportYearSections.some((entry) => entry.yearKey === activeReportYear)) return;
    setOpenReportYear(reportYearSections[0]?.yearKey || "");
  }, [activeReportYear, reportYearSections]);

  useEffect(() => {
    if (!areaTabs.length) {
      if (selectedAreaTab) setSelectedAreaTab("");
      return;
    }
    if (!selectedAreaTab || !areaTabs.some((tab) => tab.value === selectedAreaTab)) {
      setSelectedAreaTab(areaTabs[0].value);
    }
  }, [areaTabs, selectedAreaTab]);

  useEffect(() => {
    if (!checklistAreaTabs.length) {
      if (selectedChecklistAreaTab) setSelectedChecklistAreaTab("");
      return;
    }
    if (!selectedChecklistAreaTab || !checklistAreaTabs.some((tab) => tab.value === selectedChecklistAreaTab)) {
      setSelectedChecklistAreaTab(checklistAreaTabs[0].value);
    }
  }, [checklistAreaTabs, selectedChecklistAreaTab]);

  useEffect(() => {
    setSelectedBoardTab("");
    setSelectedPlayerTab("all");
  }, [selectedAreaTab]);

  useEffect(() => {
    setSelectedPlayerTab("all");
  }, [selectedBoardTab]);

  useEffect(() => {
    if (!boardTabs.length) {
      if (selectedBoardTab) setSelectedBoardTab("");
      return;
    }
    if (!selectedBoardTab || !boardTabs.some((tab) => tab.value === selectedBoardTab)) {
      setSelectedBoardTab(boardTabs[0].value);
    }
  }, [boardTabs, selectedBoardTab]);

  useEffect(() => {
    if (selectedPlayerTab === "all") return;
    if (!playerTabs.some((tab) => tab.value === selectedPlayerTab)) {
      setSelectedPlayerTab("all");
    }
  }, [playerTabs, selectedPlayerTab]);

  useEffect(() => {
    if (selectedYearFilter !== "all" && !yearOptions.includes(selectedYearFilter)) {
      setSelectedYearFilter("all");
    }
  }, [selectedYearFilter, yearOptions]);

  useEffect(() => {
    if (selectedMonthFilter !== "all" && !monthOptions.includes(selectedMonthFilter)) {
      setSelectedMonthFilter("all");
    }
  }, [monthOptions, selectedMonthFilter]);

  useEffect(() => {
    if (selectedDayFilter !== "all" && !dayOptions.includes(selectedDayFilter)) {
      setSelectedDayFilter("all");
    }
  }, [dayOptions, selectedDayFilter]);

  useEffect(() => {
    if (!deleteWeekModal.open) return undefined;

    function handleDeleteWeekHotkeys(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!deleteWeekModal.isSubmitting) {
          setDeleteWeekModal({ open: false, weekId: "", weekName: "", isSubmitting: false });
        }
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (!deleteWeekModal.isSubmitting) {
          void confirmDeleteWeek();
        }
      }
    }

    globalThis.addEventListener("keydown", handleDeleteWeekHotkeys);
    return () => globalThis.removeEventListener("keydown", handleDeleteWeekHotkeys);
  }, [confirmDeleteWeek, deleteWeekModal.isSubmitting, deleteWeekModal.open]);

  return (
    <section className="history-page-layout">
      <article className="history-summary-card">
        <div>
          <h3>Historial de Semanas</h3>
          <p>Consulta el histórico operativo con navegación por semana, área, tablero y fecha.</p>
        </div>
        <span className="chip">{effectiveWeeks.length} semanas</span>
      </article>

      <div className="history-stat-strip">
        <StatTile label="Semanas activas" value={effectiveWeeks.filter((week) => week.isActive).length} />
        <StatTile label="Semanas cerradas" value={effectiveWeeks.filter((week) => !week.isActive).length} tone="soft" />
        <StatTile label="Actividades históricas" value={scopedHistoryActivities.length} tone="success" />
      </div>

      <article className="surface-card table-card history-detail-card" style={{ display: "grid", gap: "1rem" }}>
        <div className="card-header-row" style={{ alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h3>Historial por mes</h3>
            <p>Abre un mes y revisa una sola semana a la vez con flechas para avanzar o retroceder.</p>
          </div>

        </div>

        {effectiveHistoryWeek ? (
          <>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div className="history-area-tabs">
                <button type="button" className={`tab ${historyDetailTab === "activities" ? "active" : ""}`} onClick={() => setHistoryDetailTab("activities")}>Actividades</button>
                <button type="button" className={`tab ${historyDetailTab === "checklists" ? "active" : ""}`} onClick={() => setHistoryDetailTab("checklists")}>Checklist realizados</button>
              </div>

              {historyDetailTab === "activities" ? (
                <>
                  <div className="history-area-tabs">
                    {areaTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        className={`tab ${selectedAreaTab === tab.value ? "active" : ""}`}
                        onClick={() => setSelectedAreaTab(tab.value)}
                      >
                        {tab.label} ({tab.total})
                      </button>
                    ))}
                  </div>

                  <div className="history-area-tabs" style={{ paddingLeft: "0.35rem" }}>
                    {boardTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        className={`tab ${selectedBoardTab === tab.value ? "active" : ""}`}
                        onClick={() => setSelectedBoardTab(tab.value)}
                      >
                        {tab.label} ({tab.total})
                      </button>
                    ))}
                  </div>

                  <div className="history-area-tabs" style={{ paddingLeft: "0.7rem" }}>
                    <button
                      type="button"
                      className={`tab ${selectedPlayerTab === "all" ? "active" : ""}`}
                      onClick={() => setSelectedPlayerTab("all")}
                    >
                      Todos los players ({boardScopedActivities.length})
                    </button>
                    {playerTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        className={`tab ${selectedPlayerTab === tab.value ? "active" : ""}`}
                        onClick={() => setSelectedPlayerTab(tab.value)}
                      >
                        {tab.label} ({tab.total})
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="history-area-tabs" style={{ paddingLeft: "0.35rem" }}>
                  {checklistAreaTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={`tab ${selectedChecklistAreaTab === tab.value ? "active" : ""}`}
                      onClick={() => setSelectedChecklistAreaTab(tab.value)}
                    >
                      {tab.label} ({tab.total})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: "0.9rem" }}>
              {monthWeekSections.map((monthEntry) => {
                const isOpen = activeHistoryMonthKey === monthEntry.monthKey;
                const monthWeekIsSelected = monthEntry.weeks.some((week) => week.id === effectiveHistoryWeek.id);
                const shownWeek = monthWeekIsSelected ? effectiveHistoryWeek : monthEntry.weeks[0] || null;

                return (
                  <article key={monthEntry.monthKey} className="surface-card" style={{ padding: "1rem 1.1rem", display: "grid", gap: "0.9rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isOpen) {
                          setOpenHistoryMonth("");
                          return;
                        }
                        setOpenHistoryMonth(monthEntry.monthKey);
                        if (shownWeek?.id && shownWeek.id !== effectiveHistoryWeek.id) {
                          selectWeek(shownWeek.id);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0, color: "#314d69", fontSize: "1rem" }}>{monthLabel(monthEntry.monthKey)}</h3>
                        <p className="subtle-line" style={{ margin: "0.25rem 0 0" }}>{monthEntry.weeks.length} semanas registradas</p>
                      </div>
                      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span className="chip">{monthEntry.weeks.length} semanas</span>
                        <span className="chip primary">{isOpen ? "Ocultar" : "Ver mes"}</span>
                      </div>
                    </button>

                    <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setHistoryExportPeriod("quincena1");
                          void exportHistoryToPdf({ periodType: "quincena1", monthKey: monthEntry.monthKey });
                        }}
                      >
                        1ra quincena
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setHistoryExportPeriod("quincena2");
                          void exportHistoryToPdf({ periodType: "quincena2", monthKey: monthEntry.monthKey });
                        }}
                      >
                        2da quincena
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setHistoryExportPeriod("month");
                          void exportHistoryToPdf({ periodType: "month", monthKey: monthEntry.monthKey });
                        }}
                      >
                        Mes
                      </button>
                    </div>

                    {isOpen && shownWeek ? (
                      <>
                        <div className="history-summary-card" style={{ marginBottom: 0 }}>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => selectWeek(activeMonthWeeks[selectedWeekIndexInMonth - 1]?.id)}
                            disabled={selectedWeekIndexInMonth <= 0}
                          >
                            ← Semana anterior
                          </button>
                          <div>
                            <h3>{effectiveHistoryWeek.name}</h3>
                            <p>{effectiveHistoryWeek.startDate && effectiveHistoryWeek.endDate ? `${formatDate(effectiveHistoryWeek.startDate)} - ${formatDate(effectiveHistoryWeek.endDate)}` : "Semana sin rango definido"}</p>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <span className="chip">{currentWeekStats.total} registros</span>
                            <span className="chip">{currentWeekStats.completed} completadas</span>
                            <span className="chip">{formatDurationClock(historyActivities.reduce((sum, activity) => sum + Number(activity.accumulatedSeconds || 0), 0))}</span>
                            <span className="chip">Acumulado: {formatDurationClock(visibleHistorySummary.accumulatedSeconds)}</span>
                            <span className="chip">Eficiencia: {formatPercent(visibleHistorySummary.efficiencyPercent)}</span>
                          </div>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => selectWeek(activeMonthWeeks[selectedWeekIndexInMonth + 1]?.id)}
                            disabled={selectedWeekIndexInMonth < 0 || selectedWeekIndexInMonth >= activeMonthWeeks.length - 1}
                          >
                            Semana siguiente →
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap" }}>
                          <label className="board-top-select" style={{ minWidth: 180 }}>
                            <span>Descargar</span>
                            <select value={historyExportPeriod} onChange={(event) => setHistoryExportPeriod(event.target.value)}>
                              <option value="week">Semana</option>
                              <option value="quincena1">Quincena 1 (1-15)</option>
                              <option value="quincena2">Quincena 2 (16-Última)</option>
                              <option value="month">Mes</option>
                            </select>
                          </label>
                           <button
                             type="button"
                             className="icon-button"
                            onClick={() => {
                              const exportParams = {
                                periodType: historyExportPeriod,
                                week: shownWeek,
                                monthKey: historyExportPeriod === "week" ? undefined : monthEntry.monthKey,
                              };
                              if (historyDetailTab === "checklists") {
                                void exportChecklistHistoryToPdf(exportParams);
                                return;
                              }
                              void exportHistoryToPdf(exportParams);
                            }}
                             disabled={historyDetailTab === "checklists"
                               ? (!exportableChecklistActivities.length || isExportingChecklistPdf)
                               : (!exportableHistoryActivities.length || isExportingHistoryPdf)}
                             title={historyDetailTab === "checklists"
                               ? (isExportingChecklistPdf ? "Exportando PDF" : "Exportar checklist a PDF")
                               : (isExportingHistoryPdf ? "Exportando PDF" : "Exportar a PDF")}
                           >
                             {historyDetailTab === "checklists"
                               ? (isExportingChecklistPdf ? "Exportando PDF..." : "Exportar PDF")
                               : (isExportingHistoryPdf ? "Exportando PDF..." : "Exportar PDF")}
                           </button>
                           <button
                             type="button"
                             className="icon-button"
                             onClick={() => {
                               setHistoryExportPeriod("week");
                               void exportHistoryToPdf({ periodType: "week", week: shownWeek });
                             }}
                             disabled={!shownWeek || isExportingHistoryPdf}
                           >
                             Descargar semana
                           </button>
                          {effectiveHistoryWeek && canEditHistoricalWeekActivities && !useBoardHistoryFallback ? (
                            <button type="button" className="icon-button" onClick={() => setEditWeekId(effectiveHistoryWeek.id)}>
                              Editar semana (catálogo)
                            </button>
                          ) : null}
                          {useBoardHistoryFallback ? (
                            <span className="chip soft">Edita o elimina cada fila desde la tabla del día</span>
                          ) : null}
                        </div>

                        <div style={{ display: "grid", gap: "0.9rem" }}>
                          {historyDetailTab === "checklists" ? buildWeekDaySections(effectiveHistoryWeek, visibleChecklistActivities, STATUS_FINISHED, normalizedOperationalWorkWeek).map((dayEntry) => {
                            const dayToggleKey = `check-${dayEntry.dayKey}`;
                            const isExpanded = expandedDayKey === dayToggleKey;
                            const dayDate = parseHistoryDate(dayEntry.dayKey);
                            const weekday = dayDate ? dayDate.toLocaleDateString("es-MX", { weekday: "long" }) : "";
                            const weekdayLabel = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                            return (
                              <article key={dayToggleKey} className="surface-card" style={{ padding: "1rem 1.1rem", display: "grid", gap: "0.9rem" }}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedDayKey(isExpanded ? "" : dayToggleKey)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "1rem",
                                    width: "100%",
                                    background: "transparent",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                    textAlign: "left",
                                  }}
                                >
                                  <div>
                                    <h3 style={{ margin: 0, color: "#314d69", fontSize: "1rem" }}>{weekdayLabel}</h3>
                                    <p className="subtle-line" style={{ margin: "0.25rem 0 0" }}>{dayDate ? formatDate(dayDate) : dayEntry.dayKey}</p>
                                  </div>
                                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    <span className="chip">{dayEntry.activities.length} checklist</span>
                                    <span className="chip">{dayEntry.activities.reduce((sum, activity) => sum + Number(activity?.operationalInspectionRecord?.incidencias?.length || 0), 0)} incidencias</span>
                                    <span className="chip primary">{isExpanded ? "Ocultar" : "Ver día"}</span>
                                  </div>
                                </button>

                                {isExpanded ? (
                                  dayEntry.activities.length ? (
                                    <div style={{ display: "grid", gap: "0.75rem" }}>
                                      {dayEntry.activities.map((activity) => {
                                        const record = activity.operationalInspectionRecord;
                                        const evidenceCount = Object.values(record?.draft?.checks || {}).reduce((sum, check) => sum + (Array.isArray(check?.photos) ? check.photos.length : 0), 0);
                                        return (
                                          <article key={activity.id} className="surface-card" style={{ padding: "0.9rem", display: "grid", gap: "0.55rem" }}>
                                            <div className="card-header-row">
                                              <div>
                                                <strong>{activity.activityLabel}</strong>
                                                <p className="subtle-line" style={{ margin: "0.2rem 0 0" }}>{activity.boardName || "General"} · {resolveHistoryPlayerLabel(activity)}</p>
                                              </div>
                                              <button
                                                type="button"
                                                className="icon-button"
                                                onClick={() => setChecklistRecordModalState({ open: true, activityLabel: activity.activityLabel, record })}
                                              >
                                                Ver checklist
                                              </button>
                                            </div>
                                            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                                              <span className="chip">Incidencias: {record?.incidencias?.length || 0}</span>
                                              <span className="chip">Evidencias: {evidenceCount}</span>
                                              <span className="chip">Fecha: {formatDate(record?.completedAt || activity.activityDate)}</span>
                                            </div>
                                            {String(record?.draft?.observations || "").trim() ? (
                                              <p className="subtle-line" style={{ margin: 0 }}>{String(record.draft.observations).trim()}</p>
                                            ) : null}
                                          </article>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="subtle-line">No hay checklist realizados para este día.</span>
                                  )
                                ) : null}
                              </article>
                            );
                          }) : weeklyDaySections.map((dayEntry) => {
                            const isExpanded = expandedDayKey === dayEntry.dayKey;
                            const dayDate = parseHistoryDate(dayEntry.dayKey);
                            const weekday = dayDate ? dayDate.toLocaleDateString("es-MX", { weekday: "long" }) : "";
                            const weekdayLabel = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                            return (
                              <article key={dayEntry.dayKey} className="surface-card" style={{ padding: "1rem 1.1rem", display: "grid", gap: "0.9rem" }}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedDayKey(isExpanded ? "" : dayEntry.dayKey)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "1rem",
                                    width: "100%",
                                    background: "transparent",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                    textAlign: "left",
                                  }}
                                >
                                  <div>
                                    <h3 style={{ margin: 0, color: "#314d69", fontSize: "1rem" }}>{weekdayLabel}</h3>
                                    <p className="subtle-line" style={{ margin: "0.25rem 0 0" }}>{dayDate ? formatDate(dayDate) : dayEntry.dayKey}</p>
                                  </div>
                                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    <span className="chip">{dayEntry.total} actividades</span>
                                    <span className="chip">{dayEntry.completed} completadas</span>
                                    <span className="chip">{formatDurationClock(dayEntry.totalSeconds)}</span>
                                    <span className="chip primary">{isExpanded ? "Ocultar" : "Ver día"}</span>
                                  </div>
                                </button>

                                {isExpanded ? (
                                  dayEntry.activities.length ? (
                                    <div className="table-wrap compact-table">
                                      {(() => {
                                        const dynamicFields = collectSnapshotFieldsFromActivities(dayEntry.activities);
                                        const hasDynamicFields = dynamicFields.length > 0;
                                        return (
                                          <table className="history-table-clean">
                                            <thead>
                                              <tr>
                                                {hasDynamicFields
                                                  ? dynamicFields.map((field) => <th key={field.id}>{field.label || field.id}</th>)
                                                  : (<><th>Área</th><th>Tablero</th><th>Actividad</th></>)
                                                }
                                                <th>Player</th>
                                                <th>Estado</th>
                                                {!hasDynamicFields && <><th>Inicio</th><th>Fin</th></>}
                                                <th>Tiempo</th>
                                                {canEditHistoricalWeekActivities ? <th>Acciones</th> : null}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {dayEntry.activities.map((activity) => (
                                                <tr key={activity.id}>
                                                  {hasDynamicFields
                                                    ? dynamicFields.map((field) => <td key={field.id}>{renderHistoryFieldValue(field, activity.rowValues?.[field.id], activity)}</td>)
                                                    : (<><td>{activity.areaRoot}</td><td>{activity.boardName || "General"}</td><td>{resolveHistoryActivityLabel(activity)}</td></>)
                                                  }
                                                  <td title={resolveHistoryPlayerLabel(activity)}>{resolveHistoryPlayerLabel(activity)}</td>
                                                  <td><StatusBadge status={activity.status} /></td>
                                                  {!hasDynamicFields && (
                                                    <>
                                                      <td>{formatTime(activity.startTime)}</td>
                                                      <td>{formatTime(activity.endTime)}</td>
                                                    </>
                                                  )}
                                                  <td>{formatDurationClock(activity.accumulatedSeconds)}</td>
                                                  {canEditHistoricalWeekActivities ? (
                                                    <td>
                                                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                                                        <button type="button" className="icon-button" title="Editar registro" onClick={() => openHistoryEditModal(activity)}>
                                                          <Pencil size={14} />
                                                        </button>
                                                        {canDeleteHistoricalRecords ? (
                                                          <button type="button" className="icon-button danger" title="Eliminar registro" onClick={() => { void handleDeleteHistoryActivity(activity); }}>
                                                            <Trash2 size={14} />
                                                          </button>
                                                        ) : null}
                                                      </div>
                                                    </td>
                                                  ) : null}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <span className="subtle-line">No hay actividades registradas para este día.</span>
                                  )
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      </>
                    ) : null}
                  </article>
                );
              })}
            </div>

          </>
        ) : (
          <article className="surface-card" style={{ padding: "1rem 1.2rem" }}>
            <span className="subtle-line">Selecciona una semana para ver el historial.</span>
          </article>
        )}
      </article>

      {deleteWeekModal.open ? createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="delete-week-title" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0, 0, 0, 0.45)", padding: "1rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "1.25rem", padding: "1.5rem", maxWidth: 460, width: "100%", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)" }}>
            <h3 id="delete-week-title" style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "#314d69" }}>¿Borrar semana completa?</h3>
            <p style={{ margin: "0 0 1.2rem", color: "#555555", fontSize: "0.92rem", lineHeight: 1.5 }}>
              Se eliminará {deleteWeekModal.weekName || "esta semana"} junto con todas sus actividades y pausas asociadas.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{ padding: "0.5rem 1rem", borderRadius: "0.75rem", border: "1px solid #dddddd", background: "#f3f4f6", cursor: "pointer" }}
                onClick={() => setDeleteWeekModal({ open: false, weekId: "", weekName: "", isSubmitting: false })}
                disabled={deleteWeekModal.isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{ padding: "0.5rem 1rem", borderRadius: "0.75rem", border: "none", background: "#7f1d1d", color: "#ffffff", cursor: "pointer" }}
                onClick={() => { void confirmDeleteWeek(); }}
                disabled={deleteWeekModal.isSubmitting}
              >
                {deleteWeekModal.isSubmitting ? "Borrando..." : "Sí, borrar"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      <Modal
        open={historyEditModal.open}
        title="Editar registro del historial"
        confirmLabel={historyEditModal.submitting ? "Guardando..." : "Guardar cambios"}
        cancelLabel="Cancelar"
        confirmDisabled={historyEditModal.submitting}
        onClose={() => setHistoryEditModal({ open: false, submitting: false, activity: null, draft: null })}
        onConfirm={() => { void submitHistoryEditModal(); }}
      >
        {historyEditModal.draft ? (
          <div className="modal-form-grid">
            <label className="app-modal-field">
              <span>Estado</span>
              <select
                value={historyEditModal.draft.status}
                onChange={(event) => setHistoryEditModal((current) => ({
                  ...current,
                  draft: { ...current.draft, status: event.target.value },
                }))}
              >
                <option value="Terminado">Terminado</option>
                <option value="En curso">En curso</option>
                <option value="Pausado">Pausado</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </label>
            <label className="app-modal-field">
              <span>Inicio</span>
              <input
                type="datetime-local"
                value={historyEditModal.draft.startTimeLocal}
                onChange={(event) => setHistoryEditModal((current) => ({
                  ...current,
                  draft: { ...current.draft, startTimeLocal: event.target.value },
                }))}
              />
            </label>
            <label className="app-modal-field">
              <span>Fin</span>
              <input
                type="datetime-local"
                value={historyEditModal.draft.endTimeLocal}
                onChange={(event) => setHistoryEditModal((current) => ({
                  ...current,
                  draft: { ...current.draft, endTimeLocal: event.target.value },
                }))}
              />
            </label>
            <label className="app-modal-field">
              <span>Tiempo acumulado (minutos)</span>
              <input
                type="number"
                min="0"
                value={historyEditModal.draft.accumulatedMinutes}
                onChange={(event) => setHistoryEditModal((current) => ({
                  ...current,
                  draft: { ...current.draft, accumulatedMinutes: event.target.value },
                }))}
              />
            </label>
            {(historyEditModal.draft.editableFields || []).map((field) => (
              <label key={field.id} className="app-modal-field">
                <span>{field.label || field.id}</span>
                {field.type === "time" ? (
                  <input
                    type="time"
                    step="1"
                    value={historyEditModal.draft.fieldValues?.[field.id] || ""}
                    onChange={(event) => setHistoryEditModal((current) => ({
                      ...current,
                      draft: {
                        ...current.draft,
                        fieldValues: {
                          ...current.draft.fieldValues,
                          [field.id]: event.target.value,
                        },
                      },
                    }))}
                  />
                ) : field.type === "date" ? (
                  <input
                    type="date"
                    value={historyEditModal.draft.fieldValues?.[field.id] || ""}
                    onChange={(event) => setHistoryEditModal((current) => ({
                      ...current,
                      draft: {
                        ...current.draft,
                        fieldValues: {
                          ...current.draft.fieldValues,
                          [field.id]: event.target.value,
                        },
                      },
                    }))}
                  />
                ) : (
                  <input
                    value={historyEditModal.draft.fieldValues?.[field.id] || ""}
                    onChange={(event) => setHistoryEditModal((current) => ({
                      ...current,
                      draft: {
                        ...current.draft,
                        fieldValues: {
                          ...current.draft.fieldValues,
                          [field.id]: event.target.value,
                        },
                      },
                    }))}
                  />
                )}
              </label>
            ))}
            <p className="modal-footnote">
              Las horas inicio/fin se alinean automáticamente al guardar. Si hay muchos datos antiguos incorrectos, ejecuta en el servidor: npm run repair:history-times
            </p>
          </div>
        ) : null}
      </Modal>

      <OperationalInspectionRecordModal
        open={checklistRecordModalState.open}
        activityLabel={checklistRecordModalState.activityLabel}
        record={checklistRecordModalState.record}
        onClose={() => setChecklistRecordModalState({ open: false, activityLabel: "", record: null })}
      />
    </section>
  );
}
