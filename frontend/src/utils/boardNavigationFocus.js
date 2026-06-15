import {
  normalizeOperationalDateKey,
  parseBoardWeekKey,
  resolveBoardRowCleaningSite,
} from "./utilidades.jsx";

export function normalizePauseReasonLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function pauseReasonsMatch(left, right) {
  const a = normalizePauseReasonLabel(left);
  const b = normalizePauseReasonLabel(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function extractBoardRowOperationalDate(board, row) {
  const dateField = (board?.fields || []).find((field) => field?.type === "date");
  if (dateField?.id) {
    const fromField = normalizeOperationalDateKey(row?.values?.[dateField.id]);
    if (fromField) return fromField;
  }
  return normalizeOperationalDateKey(row?.startTime || row?.endTime || row?.createdAt || "");
}

export function resolveWeekdayOffsetForOperationalDate(dateKey, weekKey) {
  const normalizedDate = normalizeOperationalDateKey(dateKey);
  const weekStart = parseBoardWeekKey(weekKey);
  if (!normalizedDate || !weekStart) return null;
  const target = new Date(`${normalizedDate}T12:00:00`);
  const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 12);
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (diffDays >= 0 && diffDays <= 6) return diffDays;
  return null;
}

export function buildBoardNavigationFocusFromDashboardRecord(record, overrides = {}) {
  if (!record || record.source !== "board") return null;
  const boardId = String(overrides.boardId || record.boardId || "").trim();
  if (!boardId) return null;
  const rowId = String(overrides.rowId || record.rowId || "").trim();
  const boardViewId = String(overrides.boardViewId || record.historySnapshotId || "current").trim() || "current";
  return {
    boardId,
    rowId,
    operationalDate: normalizeOperationalDateKey(overrides.operationalDate || record.operationalDate || record.occurredAt || ""),
    cleaningSite: String(overrides.cleaningSite || record.cleaningSite || record.operationalContextValue || "").trim(),
    boardViewId,
    openPauseDetails: Boolean(overrides.openPauseDetails),
    revealRow: Boolean(overrides.revealRow),
  };
}

export function enrichBoardRowNavigationMeta(board, row, snapshotId = "") {
  return {
    rowId: String(row?.id || "").trim(),
    cleaningSite: resolveBoardRowCleaningSite(board, row),
    operationalDate: extractBoardRowOperationalDate(board, row),
    historySnapshotId: String(snapshotId || "").trim(),
  };
}
