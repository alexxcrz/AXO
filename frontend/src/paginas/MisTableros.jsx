import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReturnsReconditionScanner from "../features/boards/ReturnsReconditionScanner.jsx";
import OperationalInspectionStartModal from "../components/OperationalInspectionStartModal.jsx";
import { SpanishDateInput } from "../components/SpanishDateInput";
import OperationalInspectionRecordModal from "../components/OperationalInspectionRecordModal.jsx";
import { BoardEditableInventoryPropertyInput, BoardEvidenceCell, BoardMultiSelectDetailCell } from "../components/BoardRuntimeFieldCells.jsx";
import { downloadBoardAsJson, parseBoardImportJson } from "../utils/boardImportExport";
import { resolveWeekdayOffsetForOperationalDate } from "../utils/boardNavigationFocus.js";
import { normalizeOperationalInspectionTemplate } from "../utils/operationalInspectionTemplate";
import {
  formatBoardMultiSelectDetailValue,
  formatInventoryLookupLabel,
  formatBoardRowAssigneeLabel,
  getLivePauseOverflowSeconds,
  getOperationalDateParts,
  normalizeOperationalDateKey,
  catalogItemMatchesBoardCategory,
  getBoardRowResponsibleIds,
  getOperationalElapsedSeconds,
  normalizeAreaOption,
  normalizeCleaningSite,
  normalizeSystemOperationalSettings,
  parseBoardWeekKey,
  addDays,
  resolveInventoryPropertySourceFieldId,
  normalizeInventoryDomain,
  evaluateBoardRowSla,
  renderBoardFieldLabel as renderBoardFieldLabelUtil,
} from "../utils/utilidades.jsx";
import { INVENTORY_DOMAIN_MAINTENANCE, BOARD_SLA_MIN_DURATION_RATIO } from "../utils/constantes.js";

const EDITABLE_INVENTORY_PROPERTIES = new Set(["lot", "expiry", "label"]);
const CLEANING_BOARD_NAVES = ["C1", "C2", "C3"];

function resolveCleaningBoardNaves(...extraSites) {
  const normalizedExtras = extraSites
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .map((site) => normalizeCleaningSite(site, ""))
    .filter((site) => CLEANING_BOARD_NAVES.includes(site));
  return [...new Set([...CLEANING_BOARD_NAVES, ...normalizedExtras])].sort();
}

function filterChecklistSiteOptions(siteOptions = []) {
  return Array.from(new Set(
    (Array.isArray(siteOptions) ? siteOptions : [])
      .map((site) => String(site || "").trim().toUpperCase())
      .filter((site) => CLEANING_BOARD_NAVES.includes(site)),
  )).sort();
}

function parseInventoryLotHistory(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue !== "string") return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getInventoryPropertySuggestions(item, property, fallbackValue = "") {
  const customFields = item?.customFields && typeof item.customFields === "object" ? item.customFields : {};
  const lotHistory = parseInventoryLotHistory(customFields.lotesCaducidades);
  const values = [];
  if (property === "lot") {
    values.push(customFields.lote);
    lotHistory.forEach((entry) => values.push(entry?.lot));
  } else if (property === "expiry") {
    values.push(customFields.caducidad);
    lotHistory.forEach((entry) => values.push(entry?.expiry));
  } else if (property === "label") {
    values.push(customFields.etiqueta);
    lotHistory.forEach((entry) => values.push(entry?.etiqueta || entry?.label));
  }

  if (fallbackValue) values.push(fallbackValue);

  const seen = new Set();
  return values
    .map((entry) => String(entry || "").trim())
    .filter((entry) => {
      if (!entry) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatBoardCellObjectValue(rawValue) {
  if (rawValue === null || rawValue === undefined) return "";
  if (typeof rawValue !== "object") return String(rawValue);

  const multiSelectLabel = formatBoardMultiSelectDetailValue(rawValue);
  if (multiSelectLabel) return multiSelectLabel;

  if (Array.isArray(rawValue)) {
    return rawValue
      .map((entry) => formatBoardCellObjectValue(entry))
      .filter(Boolean)
      .join(" | ");
  }

  const inventoryLookupLabel = formatInventoryLookupLabel(rawValue);
  if (inventoryLookupLabel) return inventoryLookupLabel;

  const code = String(rawValue.code || rawValue.sku || "").trim();
  const name = String(rawValue.name || "").trim();
  const presentation = String(rawValue.presentation || "").trim();
  if (code || name || presentation) {
    return [code, name, presentation].filter(Boolean).join(" · ");
  }

  if (rawValue.option || rawValue.label || rawValue.detail) {
    const optionLabel = String(rawValue.label || rawValue.option || "").trim();
    const detail = String(rawValue.detail || "").trim();
    return detail ? `${optionLabel}: ${detail}` : optionLabel;
  }

  const printableEntries = Object.entries(rawValue)
    .map(([key, value]) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return "";
      const printableValue = String(value).trim();
      return printableValue ? `${key}: ${printableValue}` : "";
    })
    .filter(Boolean);

  if (printableEntries.length) {
    return printableEntries.join(" | ");
  }

  try {
    return JSON.stringify(rawValue);
  } catch {
    return "";
  }
}

function normalizeMaintenanceInventoryLookupValue(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;
  if (!rawValue) return [];
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Ignore invalid JSON
    }
  }
  return [rawValue];
}

function BoardMaintenanceInventoryLookupCell({ field, inventoryItems, value, onChange, disabled }) {
  const selectedItems = normalizeMaintenanceInventoryLookupValue(value);
  const resolvedItems = selectedItems.map((entry) => {
    const item = resolveInventoryItemFromLookupValue(inventoryItems, entry);
    if (!item) return entry;
    return {
      ...entry,
      id: item.id,
      code: item.code,
      name: item.name,
      presentation: item.presentation,
      family: item.family,
      price: item.price,
      cost: item.cost,
      quantity: entry?.quantity ?? 1,
    };
  });

  function updateRowValue(nextItems) {
    onChange(nextItems);
  }

  function handleSelectItem(nextValue) {
    if (!nextValue) return;
    const existingIndex = resolvedItems.findIndex((entry) => String(entry?.id || entry).trim() === String(nextValue || "").trim());
    if (existingIndex !== -1) return;

    const nextItem = resolveInventoryItemFromLookupValue(inventoryItems, nextValue);
    if (!nextItem) return;

    updateRowValue([
      ...resolvedItems,
      {
        id: nextItem.id,
        code: nextItem.code,
        name: nextItem.name,
        presentation: nextItem.presentation,
        family: nextItem.family,
        price: nextItem.price,
        cost: nextItem.cost,
        quantity: 1,
      },
    ]);
  }

  function handleRemoveItem(itemId) {
    updateRowValue(resolvedItems.filter((item) => String(item?.id || item).trim() !== String(itemId || "").trim()));
  }

  function handleQuantityChange(itemId, nextQuantity) {
    const numeric = Number(nextQuantity);
    if (!Number.isFinite(numeric) || numeric < 0) return;
    updateRowValue(resolvedItems.map((item) => {
      if (String(item?.id || item).trim() !== String(itemId || "").trim()) return item;
      return { ...item, quantity: numeric };
    }));
  }

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <InventoryLookupInput
        inventoryItems={inventoryItems || []}
        value=""
        onChange={handleSelectItem}
        placeholder={field.placeholder || "Buscar insumo de mantenimiento"}
        disabled={disabled}
        style={{ width: "100%" }}
        title={field.helpText || field.label}
      />
      {resolvedItems.length ? (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {resolvedItems.map((selectedItem) => {
            const itemLabel = formatInventoryLookupLabel(selectedItem) || String(selectedItem.id || "");
            return (
              <div key={String(selectedItem.id || itemLabel)} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.45rem", padding: "0.45rem", border: "1px solid rgba(162, 170, 181, 0.2)", borderRadius: "0.85rem" }}>
                <div style={{ display: "grid", gap: "0.18rem" }}>
                  <strong style={{ fontSize: "0.78rem" }}>{itemLabel}</strong>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.74rem" }}>
                      Cantidad:
                      <input
                        type="number"
                        min="0"
                        value={selectedItem.quantity ?? 1}
                        onChange={(event) => handleQuantityChange(selectedItem.id, event.target.value)}
                        disabled={disabled}
                        style={{ width: "4.4rem", padding: "0.25rem 0.35rem", borderRadius: "0.55rem", border: "1px solid rgba(148, 163, 184, 0.4)" }}
                      />
                    </label>
                    {selectedItem.price !== undefined ? <span style={{ fontSize: "0.74rem", color: "#334155" }}>Precio: {selectedItem.price}</span> : null}
                    {selectedItem.cost !== undefined ? <span style={{ fontSize: "0.74rem", color: "#334155" }}>Costo: {selectedItem.cost}</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(selectedItem.id)}
                  disabled={disabled}
                  style={{ border: "none", background: "transparent", color: "#b91c1c", fontSize: "0.9rem", cursor: disabled ? "default" : "pointer" }}
                >
                  Eliminar
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function resolveInventoryItemFromLookupValue(inventoryItems, lookupValue) {
  const availableItems = Array.isArray(inventoryItems) ? inventoryItems : [];
  if (!availableItems.length) return null;

  const candidateTokens = [];
  const appendToken = (token) => {
    const nextToken = String(token || "").trim();
    if (nextToken) candidateTokens.push(nextToken);
  };

  const appendObjectTokens = (source) => {
    if (!source || typeof source !== "object") return;
    appendToken(source.id);
    appendToken(source.code);
    appendToken(source.sku);
    appendToken(source.name);
    appendToken(source.value);
  };

  if (lookupValue && typeof lookupValue === "object") {
    appendObjectTokens(lookupValue);
  } else {
    const rawText = String(lookupValue || "").trim();
    if (rawText) {
      appendToken(rawText);

      if ((rawText.startsWith("{") && rawText.endsWith("}")) || (rawText.startsWith("[") && rawText.endsWith("]"))) {
        try {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed)) {
            parsed.forEach((entry) => appendObjectTokens(entry));
          } else {
            appendObjectTokens(parsed);
          }
        } catch {
          // Ignore malformed JSON payloads and fall back to token matching.
        }
      }

      if (rawText.includes("·")) appendToken(rawText.split("·")[0]);
      if (rawText.includes("-")) appendToken(rawText.split("-")[0]);
    }
  }

  const seenTokens = new Set();
  const normalizedTokens = candidateTokens.filter((token) => {
    const key = String(token || "").trim().toLowerCase();
    if (!key || seenTokens.has(key)) return false;
    seenTokens.add(key);
    return true;
  });

  for (const token of normalizedTokens) {
    const tokenKey = token.toLowerCase();
    const matchedItem = availableItems.find((item) => {
      const idValue = String(item?.id || "").trim();
      const codeValue = String(item?.code || "").trim().toLowerCase();
      const skuValue = String(item?.sku || "").trim().toLowerCase();
      const nameValue = String(item?.name || "").trim().toLowerCase();
      return idValue === token || codeValue === tokenKey || skuValue === tokenKey || nameValue === tokenKey;
    });
    if (matchedItem) return matchedItem;
  }

  return null;
}

function normalizeCatalogSites(value) {
  return Array.from(new Set((Array.isArray(value) ? value : [])
    .map((entry) => String(entry || "").trim().toUpperCase())
    .filter(Boolean))).sort();
}

function formatBoardReadOnlyValue(field, rawValue, inventoryItems) {
  if (!field) return formatBoardCellObjectValue(rawValue);

  if (field.type === "inventoryLookup" || field.type === "maintenanceInventoryLookup") {
    const matchedItem = resolveInventoryItemFromLookupValue(inventoryItems, rawValue);
    if (matchedItem) return formatInventoryLookupLabel(matchedItem);
    if (Array.isArray(rawValue)) return formatBoardCellObjectValue(rawValue);
  }

  if (field.type === "multiSelectDetail") {
    return formatBoardMultiSelectDetailValue(rawValue);
  }

  return formatBoardCellObjectValue(rawValue);
}

function getBoardReadOnlyFieldDisplayValue(field, resolvedValue, rowValues, inventoryItems) {
  if (!field) return formatBoardCellObjectValue(resolvedValue);

  if (["inventoryLookup", "maintenanceInventoryLookup", "multiSelectDetail"].includes(field.type)) {
    return formatBoardReadOnlyValue(field, rowValues?.[field.id], inventoryItems);
  }

  return formatBoardReadOnlyValue(field, resolvedValue, inventoryItems);
}

export default function MisTableros({ contexto }) {
  const {
    visibleControlBoards: _visibleControlBoards,
    customBoardSearch: _customBoardSearch,
    setCustomBoardSearch: _setCustomBoardSearch,
    selectedCustomBoard,
    filteredVisibleControlBoards,
    setSelectedCustomBoardId,
    selectedCustomBoardId,
    selectedCustomBoardDisplay,
    selectedCustomBoardHistoryOptions,
    selectedCustomBoardSnapshot,
    selectedCustomBoardViewId,
    setSelectedCustomBoardViewId,
    selectedCustomBoardRowId,
    setSelectedCustomBoardRowId,
    boardNavigationFocus,
    clearBoardNavigationFocus,
    isHistoricalCustomBoardView,
    isHistoricalBoardReadOnly,
    canEditHistoricalBoardWeeks,
    canChangeSelectedBoardOperationalContext,
    customBoardMetrics: _customBoardMetrics,
    StatTile,
    customBoardActionsMenuRef,
    createBoardRow,
    selectedBoardActionPermissions,
    actionPermissions,
    Plus,
    Menu,
    Modal,
    customBoardActionsMenuOpen,
    setCustomBoardActionsMenuOpen,
    exportSelectedBoardToExcel,
    previewSelectedBoardPdf,
    exportSelectedBoardToPdf,
    userMap,
    boardRuntimeFeedback: _boardRuntimeFeedback,
    selectedCustomBoardSections,
    renderBoardFieldLabel,
    canEditBoardRowRecord,
    canDeleteBoardRowRecord,
    currentUser,
    normalizedPermissions,
    canOperateBoardRowRecord,
    STATUS_FINISHED,
    STATUS_PENDING,
    STATUS_PAUSED,
    STATUS_RUNNING,
    getBoardFieldValue,
    getFieldColorRule,
    getBoardFieldCellStyle,
    getBoardAssignmentSummary,
    getOrderedBoardColumns,
    buildSelectOptions,
    state,
    InventoryLookupInput,
    updateBoardRowValue,
    updateBoardRowTimeOverride,
    getBoardRowPatchEndpoint,
    visibleUsers,
    requestJson,
    applyRemoteWarehouseState,
    setState,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
    setBoardRuntimeFeedback,
    updateBoardOperationalContext,
    StatusBadge,
    formatDurationClock,
    getElapsedSeconds,
    now,
    changeBoardRowStatus,
    ClipboardList,
    Eye,
    Play,
    openBoardPauseModal,
    PauseCircle,
    openFinishBoardRowConfirm,
    Square,
    setDeleteBoardRowState,
    Trash2,
    LayoutDashboard,
    ROLE_JR,
    isRootLead: _isRootLead,
    canManageDashboardState,
    boardRowCreationPending,
    formatDate,
    formatTime,
    pushAppToast,
  } = contexto;

  const [localNowTick, setLocalNowTick] = useState(() => Date.now());
  const realtimeNow = Math.max(
    localNowTick,
    Number.isFinite(Number(now)) ? Number(now) : 0,
  );

  useEffect(() => {
    const timer = globalThis.setInterval(() => {
      setLocalNowTick(Date.now());
    }, 1000);
    return () => globalThis.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedCustomBoardRowId) return;
    const rowElement = document.querySelector(`[data-board-row-id="${selectedCustomBoardRowId}"]`);
    if (!rowElement) return;
    rowElement.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedCustomBoardRowId, selectedCustomBoardId, selectedCustomBoardViewId]);

  function normalizeTimeInput24h(value, strict = false) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const normalized = raw
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, "")
      .replace(/an$/g, "am")
      .replace(/pn$/g, "pm");

    const amPmMatch = normalized.match(/^(\d{1,2})(?::?(\d{1,2}))?(am|pm)$/);
    if (amPmMatch) {
      const hourValue = Number.parseInt(amPmMatch[1], 10);
      const minuteValue = Number.parseInt(amPmMatch[2] || "0", 10);
      if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return strict ? "" : raw;
      let hour24 = hourValue;
      if (amPmMatch[3] === "pm") hour24 = hourValue === 12 ? 12 : hourValue + 12;
      if (amPmMatch[3] === "am") hour24 = hourValue === 12 ? 0 : hourValue;
      if (hour24 < 0 || hour24 > 23 || minuteValue < 0 || minuteValue > 59) return strict ? "" : raw;
      return `${String(hour24).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")}:00`;
    }

    const compactDigits = normalized.replace(/[^\d:]/g, "");
    if (!compactDigits) return strict ? "" : "";

    if (!strict) {
      if (compactDigits.includes(":")) {
        const colonParts = compactDigits.split(":");
        const hPart = (colonParts[0] || "").slice(0, 2);
        const mPart = (colonParts[1] || "").slice(0, 2);
        const sPart = (colonParts[2] || "").slice(0, 2);
        return colonParts.length >= 3
          ? `${hPart}:${mPart}:${sPart}`
          : `${hPart}:${mPart}`;
      }
      if (compactDigits.length <= 2) return compactDigits;
      return `${compactDigits.slice(0, 2)}:${compactDigits.slice(2, 4)}`;
    }

    let hours = "";
    let minutes = "";
    let seconds = "00";
    if (compactDigits.includes(":")) {
      const colonParts = compactDigits.split(":");
      hours = (colonParts[0] || "").slice(0, 2);
      minutes = (colonParts[1] || "").slice(0, 2);
      if (colonParts.length >= 3) seconds = (colonParts[2] || "00").slice(0, 2).padStart(2, "0");
    } else {
      const digitsOnly = compactDigits.replace(":", "");
      if (digitsOnly.length < 3) return "";
      hours = digitsOnly.slice(0, 2);
      minutes = digitsOnly.slice(2, 4);
    }

    if (hours.length !== 2 || minutes.length !== 2) return "";
    const hourValue = Number.parseInt(hours, 10);
    const minuteValue = Number.parseInt(minutes, 10);
    const secondValue = Number.parseInt(seconds, 10);
    if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue) || !Number.isFinite(secondValue)) return "";
    if (hourValue < 0 || hourValue > 23 || minuteValue < 0 || minuteValue > 59 || secondValue < 0 || secondValue > 59) return "";
    return `${String(hourValue).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")}:${String(secondValue).padStart(2, "0")}`;
  }

  function _secondsToHhmm(secs) {
    const s = Math.max(0, Math.round(Number(secs) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function parseHhmmssToSeconds(value) {
    const parts = String(value || "").trim().split(":");
    if (parts.length < 2 || parts.length > 3) return null;
    const normalized = parts.map((part) => Number.parseInt(part, 10));
    if (normalized.some((part) => !Number.isFinite(part) || part < 0)) return null;
    const [hours, minutes, seconds = 0] = normalized;
    if (minutes > 59 || seconds > 59) return null;
    return (hours * 3600) + (minutes * 60) + seconds;
  }

  function hhmmToIso(hhmm, baseIso) {
    const parts = String(hhmm || "").split(":");
    const h = Number.parseInt(parts[0], 10);
    const m = Number.parseInt(parts[1] || "0", 10);
    const s = Number.parseInt(parts[2] || "0", 10);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59 || s > 59) return null;
    const base = baseIso ? new Date(baseIso) : new Date();
    if (!Number.isFinite(base.getTime())) return null;
    base.setHours(h, m, s, 0);
    return base.toISOString();
  }

  function addSecondsToIso(baseIso, secondsToAdd) {
    const baseDate = new Date(baseIso);
    if (!Number.isFinite(baseDate.getTime())) return baseIso || null;
    baseDate.setSeconds(baseDate.getSeconds() + Math.max(0, Math.round(Number(secondsToAdd) || 0)));
    return baseDate.toISOString();
  }

  const _auxLabels = {
    assignee: "Player",
    status: "Estado",
    time: "Tiempo",
    workflow: "Acciones",
  };
  const defaultAuxWidths = {
    assignee: 220,
    status: 150,
    time: 130,
    totalTime: 130,
    efficiency: 120,
    workflow: 190,
  };
  const auxMinWidths = {
    assignee: 190,
    status: 140,
    time: 120,
    totalTime: 120,
    efficiency: 100,
    workflow: 160,
  };
  const getAuxColumnStyle = (auxId) => {
    const configured = Number(selectedCustomBoard?.settings?.auxColumnWidths?.[auxId] || 0);
    const baseWidth = Number.isFinite(configured) && configured >= 90 ? Math.round(configured) : defaultAuxWidths[auxId] || 160;
    const widthPx = Math.max(auxMinWidths[auxId] || 120, baseWidth);
    return { minWidth: `${widthPx}px`, width: `${widthPx}px` };
  };
  const getFieldColumnStyle = (field) => {
    const baseStyle = getBoardFieldCellStyle(field) || {};
    if (baseStyle.width) return baseStyle;
    if (baseStyle.minWidth) return { ...baseStyle, width: baseStyle.minWidth };
    return baseStyle;
  };
  const formatFieldLabel = typeof renderBoardFieldLabel === "function"
    ? renderBoardFieldLabel
    : renderBoardFieldLabelUtil;
  const boardView = selectedCustomBoardDisplay || selectedCustomBoard;
  const boardShowMetrics = boardView?.settings?.showMetrics !== false;
  const catalogMap = useMemo(
    () => new Map((state?.catalog || []).map((item) => [item.id, item])),
    [state?.catalog],
  );
  const isBoardOwner = Boolean(selectedCustomBoard && currentUser && (currentUser.role === "Lead" || selectedCustomBoard.createdById === currentUser.id || selectedCustomBoard.ownerId === currentUser.id));
  const [openAssigneeMenuRowId, setOpenAssigneeMenuRowId] = useState("");
  const [isBoardImporting, setIsBoardImporting] = useState(false);
  const boardImportInputRef = useRef(null);
  const menuTriggerRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [selectedWeekdayFilter, setSelectedWeekdayFilter] = useState("auto");
  const [histViewNave, setHistViewNave] = useState("");
  const [currentWeekdayOffset, setCurrentWeekdayOffset] = useState(() => {
    const today = getOperationalDateParts(Date.now(), normalizeSystemOperationalSettings(state?.system?.operational).timeZone);
    const jsDay = today.jsDay;
    return jsDay === 0 ? 6 : jsDay - 1;
  });
  const [columnResizing, setColumnResizing] = useState({ isResizing: false, columnToken: null, startX: 0, startWidth: 0 });
  const [columnWidthsOverride, setColumnWidthsOverride] = useState({});
  const columnWidthsOverrideRef = useRef({});
  const assigneeMenuRef = useRef(null);
  const assigneeTriggerRef = useRef(null);
  const [assigneeMenuPosition, setAssigneeMenuPosition] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const [pauseDetailsRow, setPauseDetailsRow] = useState(null);
  const [inspectionModalState, setInspectionModalState] = useState({
    open: false,
    rowId: "",
    activityLabel: "",
    checklistTemplate: null,
    existingInspectionRecord: null,
    requireIncidentSiteSelection: false,
    incidentSiteOptions: [],
  });
  const [inspectionRecordModalState, setInspectionRecordModalState] = useState({
    open: false,
    rowId: "",
    activityLabel: "",
    record: null,
  });
  const [inspectionSubmitting, setInspectionSubmitting] = useState(false);
  // Local edit buffer for Lead time overrides: key = "rowId-colId", value = string being typed
  const [leadTimeEdits, setLeadTimeEdits] = useState({});
  const [fieldEditDrafts, setFieldEditDrafts] = useState({});
  function commitBoardFieldDraft(boardId, row, field, fieldEditKey, options = {}) {
    const hasDraft = Object.prototype.hasOwnProperty.call(fieldEditDrafts, fieldEditKey);
    if (!hasDraft) return;

    const draftValue = fieldEditDrafts[fieldEditKey];
    const nextValue = options.parseAsNumber
      ? (draftValue === "" ? "" : Number(draftValue))
      : draftValue;

    updateBoardRowValue(boardId, row.id, field, nextValue);
    setFieldEditDrafts((prev) => {
      const next = { ...prev };
      delete next[fieldEditKey];
      return next;
    });
  }

  const [pauseDurationEdits, setPauseDurationEdits] = useState({});
  const boardColumns = boardView ? getOrderedBoardColumns(boardView, isBoardOwner) : [];
  const systemOperationalSettings = normalizeSystemOperationalSettings(state?.system?.operational);
  const systemPauseControl = systemOperationalSettings.pauseControl;
  const operationalTimeZone = systemOperationalSettings.timeZone || "America/Mexico_City";
  // Resolve area-specific work hours if the board has ownerArea with a configured area pause
  const boardOwnerAreaKey = normalizeAreaOption(boardView?.settings?.ownerArea || "");
  const areaPauseControls = systemPauseControl?.areaPauseControls || {};
  const areaSpecificConfig = boardOwnerAreaKey ? areaPauseControls[boardOwnerAreaKey] : null;
  const areaHasOwnSchedule = Boolean(areaSpecificConfig?.enabled && areaSpecificConfig?.workHours);
  const effectiveWorkHours = areaHasOwnSchedule
    ? areaSpecificConfig.workHours
    : { startHour: 0, endHour: 24, startMinute: 0, endMinute: 0 };
  const pauseState = {
    workHours: effectiveWorkHours,
    workWeek: {},
    areaPauseControls: areaPauseControls,
  };
  const boardOperationalContextType = String(boardView?.settings?.operationalContextType || "none");
  const boardOperationalContextLabel = String(boardView?.settings?.operationalContextLabel || "").trim()
    || (boardOperationalContextType === "cleaningSite" ? "Sede de limpieza" : "Ubicación operativa");
  const boardOperationalContextOptions = boardOperationalContextType === "cleaningSite"
    ? [...CLEANING_BOARD_NAVES]
    : Array.isArray(boardView?.settings?.operationalContextOptions)
      ? boardView.settings.operationalContextOptions
        .map((option) => String(option || "").trim())
        .filter(Boolean)
      : [];
  const boardOperationalContextValue = boardOperationalContextType === "cleaningSite"
    ? normalizeCleaningSite(boardView?.settings?.operationalContextValue, CLEANING_BOARD_NAVES[0] || "C3")
    : String(boardView?.settings?.operationalContextValue || "").trim();
  const boardNameText = String(boardView?.name || "").toLowerCase();
  const boardCategoryText = String(boardView?.category || "").toLowerCase();
  const boardDescriptionText = String(boardView?.description || "").toLowerCase();
  const boardLooksCleaning = [boardNameText, boardCategoryText, boardDescriptionText].some((text) => text.includes("limp"));
  const boardLooksReturnsRecondition = [boardNameText, boardCategoryText, boardDescriptionText].some((text) => /(devol|reacond|maquila)/.test(text));
  const isCleaningRelatedBoard = boardOperationalContextType === "cleaningSite" || boardLooksCleaning;
  const visibleBoardColumns = boardLooksReturnsRecondition
    ? boardColumns.filter((column) => column.kind === "field")
    : boardColumns;

  // Compute available cleaning naves from inventory items that have activity consumptions
  const cleaningNaveOptions = (() => {
    const cleaningItems = (state.inventoryItems || []).filter(
      (item) => item.domain === "cleaning" && (item.activityConsumptions || []).length > 0
    );
    return [...new Set(cleaningItems
      .map((item) => normalizeCleaningSite(item.cleaningSite, ""))
      .filter((site) => CLEANING_BOARD_NAVES.includes(site)))].sort();
  })();

  const showCleaningNaveSelector = isCleaningRelatedBoard;
  const effectiveCleaningNaves = resolveCleaningBoardNaves(cleaningNaveOptions);
  const defaultCleaningNave = effectiveCleaningNaves[0] || "C3";
  const cleaningNaveValue = (() => {
    if (isHistoricalCustomBoardView && histViewNave) {
      const normalizedHistorical = normalizeCleaningSite(histViewNave, defaultCleaningNave);
      return effectiveCleaningNaves.includes(normalizedHistorical) ? normalizedHistorical : defaultCleaningNave;
    }
    const normalizedBoardNave = normalizeCleaningSite(boardOperationalContextValue, defaultCleaningNave);
    return effectiveCleaningNaves.includes(normalizedBoardNave) ? normalizedBoardNave : defaultCleaningNave;
  })();
  const effectiveWeekKey = String(
    (isHistoricalCustomBoardView
      ? selectedCustomBoardSnapshot?.weekKey
      : state?.boardWeeklyCycle?.activeWeekKey) || "",
  ).trim();
  const weekScheduleByNave = systemOperationalSettings.naveWeekSchedules?.[effectiveWeekKey] || null;
  const allowedWeekdaysForNave = showCleaningNaveSelector
    ? (Array.isArray(weekScheduleByNave?.[cleaningNaveValue]) ? weekScheduleByNave[cleaningNaveValue] : [])
    : [];
  const weekdayOptions = [
    { value: "auto", label: "Auto (hoy)" },
    { value: "0", label: "L" },
    { value: "1", label: "M" },
    { value: "2", label: "M" },
    { value: "3", label: "J" },
    { value: "4", label: "V" },
    { value: "5", label: "S" },
    { value: "6", label: "D" },
  ];
  const effectiveWeekdayOffset = selectedWeekdayFilter === "auto"
    ? currentWeekdayOffset
    : Number(selectedWeekdayFilter);
  const weekdayAllowedBySystemSchedule = !showCleaningNaveSelector
    || !allowedWeekdaysForNave.length
    || allowedWeekdaysForNave.includes(effectiveWeekdayOffset);
  const effectiveCatalogCleaningSite = showCleaningNaveSelector ? cleaningNaveValue : "";
  const boardDateField = (boardView?.fields || []).find((field) => field?.type === "date") || null;
  const assigneeSelectableUsers = useMemo(() => {
    const allUsers = Array.isArray(state?.users) ? state.users : [];
    const boardAssignedIds = new Set([
      String(boardView?.ownerId || "").trim(),
      String(boardView?.createdById || "").trim(),
      ...((Array.isArray(boardView?.accessUserIds) ? boardView.accessUserIds : []).map((userId) => String(userId || "").trim())),
    ].filter(Boolean));

    const userById = new Map(allUsers.map((user) => [String(user?.id || "").trim(), user]));
    const scopedUsers = Array.isArray(visibleUsers) ? [...visibleUsers] : [];
    const scopedIds = new Set(scopedUsers.map((user) => String(user?.id || "").trim()).filter(Boolean));
    boardAssignedIds.forEach((userId) => {
      if (!scopedIds.has(userId) && userById.has(userId)) {
        scopedUsers.push(userById.get(userId));
        scopedIds.add(userId);
      }
    });

    return scopedUsers;
  }, [boardView, state, visibleUsers]);
  const targetOperationalDateKey = (() => {
    if (selectedWeekdayFilter === "auto") {
      return getOperationalDateParts(Date.now(), operationalTimeZone).isoDate;
    }
    const parsedWeekStart = parseBoardWeekKey(effectiveWeekKey);
    if (!parsedWeekStart) return "";
    const targetDate = addDays(parsedWeekStart, effectiveWeekdayOffset);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  useEffect(() => {
    if (isHistoricalCustomBoardView || !showCleaningNaveSelector || !selectedCustomBoard?.id) return undefined;
    const rawBoardNave = String(selectedCustomBoard?.settings?.operationalContextValue || "").trim().toUpperCase();
    if (rawBoardNave && !effectiveCleaningNaves.includes(rawBoardNave)) {
      void updateBoardOperationalContext(selectedCustomBoard.id, cleaningNaveValue, "cleaningSite");
    }
  }, [
    cleaningNaveValue,
    effectiveCleaningNaves,
    isHistoricalCustomBoardView,
    selectedCustomBoard?.id,
    selectedCustomBoard?.settings?.operationalContextValue,
    showCleaningNaveSelector,
    updateBoardOperationalContext,
  ]);

  useEffect(() => {
    if (isHistoricalCustomBoardView || !showCleaningNaveSelector || !selectedCustomBoard?.id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!cancelled && remoteState) {
          applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        }
      } catch {
        // Ignorar errores de refresco oportunista del tablero de limpieza.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    applyRemoteWarehouseState,
    cleaningNaveValue,
    isHistoricalCustomBoardView,
    requestJson,
    selectedCustomBoard?.id,
    setLoginDirectory,
    setState,
    setSyncStatus,
    showCleaningNaveSelector,
    skipNextSyncRef,
    targetOperationalDateKey,
  ]);

  useEffect(() => {
    const timer = globalThis.setInterval(() => {
      const operationalNow = getOperationalDateParts(Date.now(), operationalTimeZone);
      const jsDay = operationalNow.jsDay;
      const nextOffset = jsDay === 0 ? 6 : jsDay - 1;
      setCurrentWeekdayOffset((current) => (current === nextOffset ? current : nextOffset));
    }, 60000);
    return () => globalThis.clearInterval(timer);
  }, [operationalTimeZone]);

  useEffect(() => {
    if (!openAssigneeMenuRowId) return undefined;

    function handlePointerDown(event) {
      const clickedInsideMenu = assigneeMenuRef.current?.contains(event.target);
      const clickedTrigger = assigneeTriggerRef.current?.contains(event.target);
      if (!clickedInsideMenu && !clickedTrigger) {
        setOpenAssigneeMenuRowId("");
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [openAssigneeMenuRowId]);

  useEffect(() => {
    if (!openAssigneeMenuRowId) return undefined;

    const updateAssigneeMenuPosition = () => {
      const triggerRect = assigneeTriggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const horizontalMargin = 8;
      const verticalMargin = 8;
      const estimatedMenuHeight = 290;
      const desiredWidth = Math.min(Math.max(triggerRect.width, 240), 360);
      const maxLeft = Math.max(horizontalMargin, viewportWidth - desiredWidth - horizontalMargin);
      const desiredLeft = triggerRect.right - desiredWidth;
      const left = Math.max(horizontalMargin, Math.min(maxLeft, desiredLeft));
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const openUp = spaceBelow < estimatedMenuHeight && triggerRect.top > estimatedMenuHeight;
      const top = openUp
        ? Math.max(verticalMargin, triggerRect.top - estimatedMenuHeight - 6)
        : Math.min(viewportHeight - verticalMargin, triggerRect.bottom + 6);

      setAssigneeMenuPosition({
        top,
        left,
        width: desiredWidth,
        openUp,
      });
    };

    updateAssigneeMenuPosition();
    window.addEventListener("resize", updateAssigneeMenuPosition, { passive: true });
    window.addEventListener("scroll", updateAssigneeMenuPosition, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", updateAssigneeMenuPosition);
      window.removeEventListener("scroll", updateAssigneeMenuPosition, { capture: true });
    };
  }, [openAssigneeMenuRowId]);

  // Handlers para redimensionamiento de columnas
  const getColumnMinWidth = (column) => {
    if (column.kind === "field") return 72;
    const minWidthMap = { assignee: 90, status: 80, time: 80, totalTime: 80, efficiency: 76, workflow: 96 };
    return minWidthMap[column.id] || 72;
  };

  const handleColumnResizeStart = (e, columnToken) => {
    e.preventDefault();
    const th = e.currentTarget.parentElement;
    const rect = th.getBoundingClientRect();
    setColumnResizing({
      isResizing: true,
      columnToken,
      startX: e.clientX,
      startWidth: rect.width,
    });
  };

  useEffect(() => {
    columnWidthsOverrideRef.current = columnWidthsOverride;
  }, [columnWidthsOverride]);

  useEffect(() => {
    if (!columnResizing.isResizing) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - columnResizing.startX;
      const newWidth = Math.max(getColumnMinWidth(visibleBoardColumns.find(c => c.token === columnResizing.columnToken)), columnResizing.startWidth + diff);
      const nextWidths = {
        ...columnWidthsOverrideRef.current,
        [columnResizing.columnToken]: newWidth,
      };
      columnWidthsOverrideRef.current = nextWidths;
      setColumnWidthsOverride(prev => ({
        ...prev,
        [columnResizing.columnToken]: newWidth,
      }));
    };

    const handleMouseUp = async () => {
      setColumnResizing({ isResizing: false, columnToken: null, startX: 0, startWidth: 0 });
      
      // Guardar los anchos personalizados en el board settings
      const pendingWidths = columnWidthsOverrideRef.current;
      if (selectedCustomBoard && Object.keys(pendingWidths).length > 0) {
        try {
          const response = await requestJson(`/warehouse/boards/${selectedCustomBoard.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              name: selectedCustomBoard.name,
              description: selectedCustomBoard.description,
              ownerId: selectedCustomBoard.ownerId,
              visibilityType: selectedCustomBoard.visibilityType,
              sharedDepartments: selectedCustomBoard.sharedDepartments,
              accessUserIds: selectedCustomBoard.accessUserIds,
              settings: {
                ...(selectedCustomBoard.settings || {}),
                columnWidths: {
                  ...(selectedCustomBoard.settings?.columnWidths || {}),
                  ...pendingWidths,
                },
              },
              columns: Array.isArray(selectedCustomBoard.fields) ? selectedCustomBoard.fields : [],
            }),
          });
          applyRemoteWarehouseState(response?.data?.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
          setBoardRuntimeFeedback({ tone: "success", message: "Ancho de columnas guardado." });
        } catch {
          setBoardRuntimeFeedback({ tone: "danger", message: "No se pudieron guardar los anchos de columna" });
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnResizing, visibleBoardColumns]);

  // Función para obtener el ancho efectivo de una columna
  const getEffectiveColumnWidth = (column) => {
    const transientWidth = Number(columnWidthsOverride[column.token] || 0);
    const persistedWidth = Number(selectedCustomBoard?.settings?.columnWidths?.[column.token] || 0);
    const resolvedWidth = transientWidth || persistedWidth;
    if (Number.isFinite(resolvedWidth) && resolvedWidth > 0) {
      return { minWidth: `${resolvedWidth}px`, width: `${resolvedWidth}px` };
    }
    if (column.kind === "field") return getFieldColumnStyle(column.field);
    return getAuxColumnStyle(column.id);
  };

  const activityListField = (boardView?.fields || []).find((field) => field?.type === "select" && field?.optionSource === "catalogByCategory") || null;
  const activityOptionNames = activityListField
    ? new Set(
      (weekdayAllowedBySystemSchedule
        ? buildSelectOptions(activityListField, state, {
            weekdayOffset: effectiveWeekdayOffset,
            cleaningSite: effectiveCatalogCleaningSite,
          })
        : [])
        .map((option) => String(option.value || "").trim().toLowerCase())
        .filter(Boolean),
    )
    : null;
  const visibleRows = (boardView?.rows || []).filter((row) => {
    if (!isHistoricalCustomBoardView && showCleaningNaveSelector && boardDateField && targetOperationalDateKey) {
      const rowDate = normalizeOperationalDateKey(row?.values?.[boardDateField.id]);
      const activityValue = activityListField
        ? String(row?.values?.[activityListField.id] || "").trim().toLowerCase()
        : "";
      const activityAllowedToday = !activityListField
        || !activityOptionNames
        || !activityValue
        || activityOptionNames.has(activityValue);
      // En limpieza, la lista operativa se limita estrictamente al dia seleccionado.
      if (rowDate && rowDate !== targetOperationalDateKey) return false;
      return activityAllowedToday;
    }
    if (!activityListField || !activityOptionNames) return true;
    const activityValue = String(row?.values?.[activityListField.id] || "").trim().toLowerCase();
    if (!activityValue) return true;
    return activityOptionNames.has(activityValue);
  });

  useEffect(() => {
    const focus = boardNavigationFocus;
    if (!focus?.boardId) return;
    if (String(focus.boardId) !== String(selectedCustomBoardId || "")) return;
    if (String(selectedCustomBoardViewId || "current") !== String(focus.boardViewId || "current")) return;

    let cancelled = false;

    (async () => {
      const isHistorical = String(focus.boardViewId || "current") !== "current";
      const weekKeyForDate = isHistorical
        ? String(selectedCustomBoardSnapshot?.weekKey || "").trim()
        : String(state?.boardWeeklyCycle?.activeWeekKey || "").trim();

      if (focus.cleaningSite) {
        if (isHistorical) {
          setHistViewNave(focus.cleaningSite);
        } else if (showCleaningNaveSelector && selectedCustomBoard?.id) {
          try {
            await updateBoardOperationalContext(selectedCustomBoard.id, focus.cleaningSite, "cleaningSite");
          } catch {
            /* ignore */
          }
        }
      }

      if (focus.operationalDate && weekKeyForDate) {
        const weekdayOffset = resolveWeekdayOffsetForOperationalDate(focus.operationalDate, weekKeyForDate);
        if (weekdayOffset !== null) {
          setSelectedWeekdayFilter(String(weekdayOffset));
        }
      }

      if (focus.rowId) {
        for (let attempt = 0; attempt < 25; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (cancelled) return;
          const rowElement = document.querySelector(`[data-board-row-id="${focus.rowId}"]`);
          if (rowElement) break;
        }
      }

      if (cancelled) return;

      if (focus.rowId) {
        setSelectedCustomBoardRowId?.(focus.rowId);
      }

      if (focus.openPauseDetails && focus.rowId) {
        const targetRow = (boardView?.rows || []).find((row) => String(row.id) === String(focus.rowId));
        if (targetRow) {
          setPauseDetailsRow(targetRow);
        }
      }

      clearBoardNavigationFocus?.();
    })();

    return () => { cancelled = true; };
  }, [
    boardNavigationFocus,
    boardView?.rows,
    clearBoardNavigationFocus,
    selectedCustomBoard?.id,
    selectedCustomBoardId,
    selectedCustomBoardSnapshot?.weekKey,
    selectedCustomBoardViewId,
    setSelectedCustomBoardRowId,
    showCleaningNaveSelector,
    state?.boardWeeklyCycle?.activeWeekKey,
    updateBoardOperationalContext,
  ]);

  function getRowActivityLabel(rowRecord) {
    if (!activityListField?.id) return "";
    return String(rowRecord?.values?.[activityListField.id] || "").trim();
  }

  function resolveCatalogItemByActivityLabel(activityLabel) {
    const normalizedLabel = String(activityLabel || "").trim().toLowerCase();
    if (!normalizedLabel) return null;
    const scopedCategory = String(activityListField?.optionCatalogCategory || "").trim().toLowerCase();
    return (state?.catalog || []).find((item) => {
      if (item?.isDeleted) return false;
      if (String(item?.name || "").trim().toLowerCase() !== normalizedLabel) return false;
      if (!scopedCategory || scopedCategory === "general") return true;
      return catalogItemMatchesBoardCategory(item, scopedCategory);
    }) || null;
  }

  function resolveChecklistTemplateForActivity(activityLabel) {
    const matchedCatalogItem = resolveCatalogItemByActivityLabel(activityLabel);
    const catalogChecklistConfig = matchedCatalogItem?.operationalChecklistConfig;
    if (catalogChecklistConfig?.enabled) {
      const catalogTemplate = normalizeOperationalInspectionTemplate(catalogChecklistConfig?.template);
      if (Array.isArray(catalogTemplate?.sections) && catalogTemplate.sections.length) {
        return catalogTemplate;
      }
    }

    const checklistConfig = boardView?.settings?.operationalChecklistConfig;
    if (!checklistConfig?.enabled) return null;

    const normalizedActivity = String(activityLabel || "").trim().toLowerCase();
    const linkedActivityNames = Array.isArray(checklistConfig?.linkedActivityNames)
      ? checklistConfig.linkedActivityNames
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
      : [];

    if (!normalizedActivity || !linkedActivityNames.includes(normalizedActivity)) {
      return null;
    }

    const resolvedTemplate = normalizeOperationalInspectionTemplate(checklistConfig?.template);
    return Array.isArray(resolvedTemplate?.sections) && resolvedTemplate.sections.length
      ? resolvedTemplate
      : null;
  }

  function getRowInspectionRecord(rowRecord) {
    return rowRecord?.operationalInspectionRecord && typeof rowRecord.operationalInspectionRecord === "object"
      ? rowRecord.operationalInspectionRecord
      : null;
  }

  function openInspectionRecord(rowRecord) {
    const record = getRowInspectionRecord(rowRecord);
    if (!record) return;
    setInspectionRecordModalState({
      open: true,
      rowId: rowRecord.id,
      activityLabel: getRowActivityLabel(rowRecord),
      record,
    });
  }

  function openManualChecklistModal(rowRecord) {
    if (!rowRecord?.id) return;
    // Abrir el inspection modal para crear un checklist manual sin actividad vinculada
    const defaultChecklistTemplate = {
      name: "Checklist manual",
      siteOptions: [],
      sections: [
        {
          id: `section-${Date.now()}`,
          title: "Verificaciones",
          checks: [],
        },
      ],
    };
    setInspectionModalState({
      open: true,
      rowId: rowRecord.id,
      activityLabel: `Checklist manual - ${rowRecord.id}`,
      checklistTemplate: defaultChecklistTemplate,
      existingInspectionRecord: getRowInspectionRecord(rowRecord),
      requireIncidentSiteSelection: false,
      incidentSiteOptions: [],
    });
  }

  async function handleStartRow(rowRecord) {
    if (!selectedCustomBoard || !rowRecord?.id) return;
    const activityLabel = getRowActivityLabel(rowRecord);
    const checklistTemplate = resolveChecklistTemplateForActivity(activityLabel);
    if (!checklistTemplate) {
      await changeBoardRowStatus(selectedCustomBoard.id, rowRecord.id, STATUS_RUNNING);
      return;
    }

    if (rowRecord.status === STATUS_PENDING || rowRecord.status === STATUS_PAUSED) {
      await changeBoardRowStatus(selectedCustomBoard.id, rowRecord.id, STATUS_RUNNING, { skipStartConfirm: true });
    }

    const templateSites = filterChecklistSiteOptions(checklistTemplate?.siteOptions);
    const resolvedIncidentSites = templateSites.length
      ? templateSites
      : (showCleaningNaveSelector ? [...CLEANING_BOARD_NAVES] : []);

    setInspectionModalState({
      open: true,
      rowId: rowRecord.id,
      activityLabel,
      checklistTemplate,
      existingInspectionRecord: getRowInspectionRecord(rowRecord),
      requireIncidentSiteSelection: resolvedIncidentSites.length > 0,
      incidentSiteOptions: resolvedIncidentSites,
    });
  }

  async function handleConfirmOperationalInspection({ draft, incidencias, shouldFinalize = true, recordPayload = null }) {
    if (!selectedCustomBoard || !inspectionModalState.rowId) return;

    setInspectionSubmitting(true);
    try {
      const incidentPayloads = Array.isArray(incidencias) ? incidencias : [];
      for (const payload of incidentPayloads) {
        const response = await requestJson("/warehouse/incidencias", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (response?.data?.state) {
          setState(response.data.state);
        }
      }

      const checklistRecord = {
        activityLabel: inspectionModalState.activityLabel,
        completedAt: shouldFinalize ? new Date().toISOString() : "",
        completedById: currentUser?.id || "",
        completedByName: currentUser?.name || "",
        template: inspectionModalState.checklistTemplate,
        draft,
        incidencias: incidentPayloads,
        ...(recordPayload && typeof recordPayload === "object" ? recordPayload : {}),
      };

      const patchedState = await requestJson(
        getBoardRowPatchEndpoint(selectedCustomBoard.id, inspectionModalState.rowId),
        {
          method: "PATCH",
          body: JSON.stringify({ operationalInspectionRecord: checklistRecord }),
        },
      );
      applyRemoteWarehouseState(patchedState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);

      if (shouldFinalize) {
        await changeBoardRowStatus(selectedCustomBoard.id, inspectionModalState.rowId, STATUS_FINISHED);
      }

      setInspectionModalState({
        open: false,
        rowId: "",
        activityLabel: "",
        checklistTemplate: null,
        existingInspectionRecord: null,
        requireIncidentSiteSelection: false,
        incidentSiteOptions: [],
      });

      const savedSite = String(recordPayload?.lastSite || "").trim().toUpperCase();
      if (shouldFinalize) {
        pushAppToast(
          `Checklist guardado. ${incidentPayloads.length} incidencia(s) generada(s) y la actividad quedó finalizada.`,
          "success",
        );
      } else if (savedSite) {
        pushAppToast(
          `Nave ${savedSite} guardada. Al volver a abrir el checklist continuarás con la siguiente nave pendiente.`,
          "success",
        );
      } else {
        pushAppToast(
          `Checklist guardado. ${incidentPayloads.length} incidencia(s) generada(s).`,
          "success",
        );
      }
    } catch (error) {
      setBoardRuntimeFeedback({
        tone: "danger",
        message: error?.message || "No se pudo guardar el checklist de inspeccion.",
      });
      throw error;
    } finally {
      setInspectionSubmitting(false);
    }
  }

  function updateRowResponsibleAssignments(rowId, nextResponsibleIds) {
    if (!selectedCustomBoard) return;
    const targetRow = (selectedCustomBoard.rows || []).find((entry) => entry.id === rowId);
    if (!targetRow || !canEditBoardRowRecord(currentUser, selectedCustomBoard, targetRow, normalizedPermissions)) {
      setBoardRuntimeFeedback({ tone: "danger", message: "No tienes permiso para asignar responsables en esta fila." });
      return;
    }

    const normalizedResponsibleIds = Array.from(new Set((Array.isArray(nextResponsibleIds) ? nextResponsibleIds : [])
      .map((userId) => String(userId || "").trim())
      .filter(Boolean)));
    const nextResponsibleId = normalizedResponsibleIds[0] || "";

    if (isHistoricalCustomBoardView && selectedCustomBoardSnapshot) {
      const snapshotId = selectedCustomBoardSnapshot.id;
      setState((current) => ({
        ...current,
        boardWeekHistory: (current.boardWeekHistory || []).map((snapshot) => (
          snapshot.id !== snapshotId
            ? snapshot
            : {
                ...snapshot,
                rows: (snapshot.rows || []).map((row) => (
                  row.id !== rowId
                    ? row
                    : {
                        ...row,
                        responsibleId: nextResponsibleId,
                        responsibleIds: normalizedResponsibleIds,
                      }
                )),
              }
        )),
      }));
    } else {
      setState((current) => ({
        ...current,
        controlBoards: (current.controlBoards || []).map((board) => (
          board.id !== selectedCustomBoard.id
            ? board
            : {
                ...board,
                rows: (board.rows || []).map((row) => (
                  row.id !== rowId
                    ? row
                    : {
                        ...row,
                        responsibleId: nextResponsibleId,
                        responsibleIds: normalizedResponsibleIds,
                      }
                )),
              }
        )),
      }));
    }

    requestJson(getBoardRowPatchEndpoint(selectedCustomBoard.id, rowId), {
      method: "PATCH",
      body: JSON.stringify({ responsibleIds: normalizedResponsibleIds, responsibleId: nextResponsibleId }),
    }).then((remoteState) => {
      applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    }).catch((error) => {
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo actualizar el responsable de la fila." });
    });
  }
  const visibleBoardMetrics = useMemo(() => {
    const delayedRows = [];
    const tooFastRows = [];
    visibleRows.forEach((row) => {
      const sla = evaluateBoardRowSla(boardView, row, catalogMap, realtimeNow, pauseState);
      if (sla.isDelayed) delayedRows.push({ row, sla });
      if (sla.isTooFast) tooFastRows.push({ row, sla });
    });
    return {
      totalRows: visibleRows.length,
      running: visibleRows.filter((row) => row.status === STATUS_RUNNING).length,
      completed: visibleRows.filter((row) => row.status === STATUS_FINISHED).length,
      delayedCount: delayedRows.length,
      tooFastCount: tooFastRows.length,
      delayedRows,
      tooFastRows,
    };
  }, [boardView, catalogMap, pauseState, realtimeNow, visibleRows, STATUS_FINISHED, STATUS_RUNNING]);
  const effectivePauseDetailsRow = useMemo(() => {
    if (!pauseDetailsRow?.id || !selectedCustomBoard?.rows) return pauseDetailsRow;
    return (selectedCustomBoard.rows || []).find((row) => row.id === pauseDetailsRow.id) || pauseDetailsRow;
  }, [pauseDetailsRow, selectedCustomBoard]);

  const pauseDetailsLogs = Array.isArray(effectivePauseDetailsRow?.pauseLogs)
    ? effectivePauseDetailsRow.pauseLogs
    : [];

  const getCountedPauseSeconds = (entry) => {
    const explicitCountedSeconds = Number(entry?.countedPauseDurationSeconds);
    if (Number.isFinite(explicitCountedSeconds)) {
      return Math.max(0, explicitCountedSeconds);
    }
    const fullPauseSeconds = Math.max(0, Number(entry?.pauseDurationSeconds || 0));
    const authorizedSeconds = Math.max(0, Number(entry?.pauseAuthorizedSeconds || 0));
    return Math.max(0, fullPauseSeconds - authorizedSeconds);
  };

  const getRowPauseSeconds = (rowRecord, referenceNow) => {
    if (!rowRecord) return 0;
    const persistedPauseLogs = Array.isArray(rowRecord.pauseLogs) ? rowRecord.pauseLogs : [];
    const persistedPauseSeconds = persistedPauseLogs.reduce((sum, entry) => sum + getCountedPauseSeconds(entry), 0);
    const livePauseSeconds = rowRecord.status === STATUS_PAUSED && rowRecord.pauseStartedAt
      ? Math.max(0, getLivePauseOverflowSeconds(rowRecord, referenceNow, pauseState))
      : 0;
    return Math.max(0, persistedPauseSeconds + livePauseSeconds);
  };

  function exportCurrentBoardAsJson() {
    if (!selectedCustomBoard) return;
    downloadBoardAsJson(selectedCustomBoard);
  }

  function handleBoardImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!actionPermissions?.createBoard) {
      if (typeof pushAppToast === "function") pushAppToast("No tienes permiso para importar tableros.", "danger");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const { createPayload } = parseBoardImportJson(String(evt.target.result || ""));
        setIsBoardImporting(true);
        const result = await requestJson("/warehouse/boards", {
          method: "POST",
          body: JSON.stringify(createPayload),
        });
        applyRemoteWarehouseState(result?.data?.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        if (result?.data?.boardId) {
          setSelectedCustomBoardId(result.data.boardId);
        }
        if (typeof pushAppToast === "function") pushAppToast(`Tablero "${createPayload.name}" importado correctamente.`, "success");
      } catch (err) {
        if (typeof pushAppToast === "function") pushAppToast(String(err?.message || "No se pudo importar el tablero."), "danger");
      } finally {
        setIsBoardImporting(false);
      }
    };
    reader.readAsText(file);
  }

  async function saveCurrentBoardAsTemplate() {
    if (!selectedCustomBoard) return;
    if (!actionPermissions?.saveTemplate) {
      setBoardRuntimeFeedback({ tone: "danger", message: "No tienes permiso para guardar plantillas." });
      return;
    }
    const columns = Array.isArray(selectedCustomBoard.fields) ? selectedCustomBoard.fields : [];
    if (!columns.length) {
      setBoardRuntimeFeedback({ tone: "danger", message: "Este tablero no tiene componentes para guardar como plantilla." });
      return;
    }

    try {
      const payload = {
        name: `${selectedCustomBoard.name || "Tablero"} · Plantilla`,
        description: selectedCustomBoard.description || `Plantilla generada desde ${selectedCustomBoard.name || "tablero"}.`,
        category: selectedCustomBoard.category || "Personalizada",
        visibilityType: selectedCustomBoard.visibilityType || "department",
        sharedDepartments: Array.isArray(selectedCustomBoard.sharedDepartments) ? selectedCustomBoard.sharedDepartments : [],
        sharedUserIds: Array.isArray(selectedCustomBoard.accessUserIds) ? selectedCustomBoard.accessUserIds : [],
        settings: { ...(selectedCustomBoard.settings || {}) },
        columns,
      };

      const result = await requestJson("/warehouse/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      applyRemoteWarehouseState(result?.data?.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setBoardRuntimeFeedback({ tone: "success", message: "Tablero guardado como plantilla." });
      if (typeof pushAppToast === "function") pushAppToast("Tablero guardado como plantilla.", "success");
    } catch (error) {
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo guardar como plantilla." });
      if (typeof pushAppToast === "function") pushAppToast(error?.message || "No se pudo guardar como plantilla.", "danger");
    }
  }

  async function setAsTarimaReviewBoard() {
    if (!selectedCustomBoard) return;
    try {
      await updateBoardOperationalContext(selectedCustomBoard.id, "Revision de tarimas", "custom");
      setBoardRuntimeFeedback({ tone: "success", message: "Tablero vinculado como revisión de tarimas." });
      if (typeof pushAppToast === "function") pushAppToast("Tablero vinculado como revisión de tarimas.", "success");
    } catch (error) {
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo vincular como revisión de tarimas." });
      if (typeof pushAppToast === "function") pushAppToast(error?.message || "No se pudo vincular como revisión de tarimas.", "danger");
    }
  }

  return (
    <section className="admin-page-layout mis-tableros-shell">
      {selectedCustomBoard ? (
        <>
          <div className="inventory-stat-grid custom-board-stat-grid">
            <StatTile label="Filas" value={visibleBoardMetrics.totalRows} className="custom-board-stat-tile" />
            <StatTile label="En curso" value={visibleBoardMetrics.running} tone="soft" className="custom-board-stat-tile" />
            <StatTile label="Terminadas" value={visibleBoardMetrics.completed} tone="success" className="custom-board-stat-tile" />
            {boardShowMetrics ? (
              <>
                <StatTile
                  label="Retrasos"
                  value={visibleBoardMetrics.delayedCount}
                  tone={visibleBoardMetrics.delayedCount > 0 ? "danger" : "soft"}
                  className="custom-board-stat-tile"
                />
                <StatTile
                  label="Muy rápidas"
                  value={visibleBoardMetrics.tooFastCount}
                  tone={visibleBoardMetrics.tooFastCount > 0 ? "soft" : "default"}
                  className="custom-board-stat-tile"
                />
              </>
            ) : null}
          </div>
          {boardShowMetrics && (visibleBoardMetrics.delayedCount > 0 || visibleBoardMetrics.tooFastCount > 0) ? (
            <div className="saved-board-list custom-board-sla-summary">
              {visibleBoardMetrics.delayedRows.map(({ row, sla }) => (
                <span key={`delay-${row.id}`} className="chip danger">
                  {sla.activityLabel || "Actividad"} · retraso +{formatDurationClock(sla.excessSeconds)} (límite {sla.limitMinutes} min)
                </span>
              ))}
              {visibleBoardMetrics.tooFastRows.map(({ row, sla }) => (
                <span key={`fast-${row.id}`} className="chip">
                  {sla.activityLabel || "Actividad"} · muy rápida ({formatDurationClock(sla.durationSeconds)} / mín. {formatDurationClock(sla.minDurationSeconds)})
                </span>
              ))}
            </div>
          ) : null}
          {boardShowMetrics && visibleBoardMetrics.totalRows > 0 && visibleBoardMetrics.delayedCount === 0 && visibleBoardMetrics.tooFastCount === 0 ? (
            <p className="subtle-line custom-board-sla-empty">
              Sin retrasos ni actividades sospechosamente rápidas en el día visible. Umbral rápido: menos del {Math.round(BOARD_SLA_MIN_DURATION_RATIO * 100)}% del tiempo límite del catálogo.
            </p>
          ) : null}

          <article className="surface-card full-width table-card admin-surface-card board-pdf-root" data-board-pdf-root="selected">
            <div className="card-header-row">
              <div>
                <h3>{boardView?.name || selectedCustomBoard.name}</h3>
                <div className="saved-board-list">
                  <span className={isHistoricalCustomBoardView ? "chip" : "chip success"}>{isHistoricalCustomBoardView ? "Histórico" : "Semana actual"}</span>
                  <span className="chip">{isHistoricalCustomBoardView ? selectedCustomBoardSnapshot?.weekName : "Operación activa"}</span>
                </div>
              </div>
              <div className="custom-board-header-controls board-pdf-hide">
              <div className="toolbar-actions custom-board-toolbar-actions">
                {filteredVisibleControlBoards.length > 1 ? (
                  <label className="board-top-select min-width board-board-select-inline">
                    <span>Tablero</span>
                    <select value={selectedCustomBoard.id} onChange={(event) => {
                      setSelectedCustomBoardId(event.target.value);
                      setSelectedCustomBoardViewId("current");
                    }}>
                      {filteredVisibleControlBoards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
                    </select>
                  </label>
                ) : null}
                <div className="board-context-inline-filters">
                  <label className="board-top-select min-width board-week-select-inline">
                    <span>Semana</span>
                    <select value={selectedCustomBoardViewId} onChange={(event) => setSelectedCustomBoardViewId(event.target.value)}>
                      <option value="current">Semana actual</option>
                      {selectedCustomBoardHistoryOptions.map((snapshot) => (
                        <option key={snapshot.id} value={snapshot.id}>{snapshot.weekName}</option>
                      ))}
                    </select>
                  </label>
                  {showCleaningNaveSelector ? (
                    <label className="board-top-select min-width board-cleaning-site-select-inline">
                      <span>Nave de limpieza</span>
                      <select
                        value={cleaningNaveValue}
                        onChange={(event) => {
                          if (isHistoricalCustomBoardView) {
                            setHistViewNave(event.target.value);
                          } else {
                            updateBoardOperationalContext(selectedCustomBoard.id, event.target.value, "cleaningSite");
                          }
                        }}
                        disabled={!isHistoricalCustomBoardView && !canChangeSelectedBoardOperationalContext}
                      >
                        {effectiveCleaningNaves.map((nave) => <option key={nave} value={nave}>{nave}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className="board-top-select min-width board-day-select-inline">
                    <span>Día</span>
                    <select value={selectedWeekdayFilter} onChange={(event) => setSelectedWeekdayFilter(event.target.value)}>
                      {weekdayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                {!showCleaningNaveSelector && boardOperationalContextType !== "none" ? (
                  <label className="board-top-select min-width">
                    <span>{boardOperationalContextLabel}</span>
                    <select
                      value={boardOperationalContextValue}
                      onChange={(event) => updateBoardOperationalContext(selectedCustomBoard.id, event.target.value)}
                      disabled={!isHistoricalCustomBoardView && !canChangeSelectedBoardOperationalContext}
                    >
                      {boardOperationalContextOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>
              <div className="custom-board-actions-menu-shell" ref={customBoardActionsMenuRef}>
                  <button
                    type="button"
                    className="primary-button custom-board-add-row-button"
                    title={boardRowCreationPending ? "Creando fila..." : "Nueva fila"}
                    aria-label="Nueva fila"
                    aria-busy={boardRowCreationPending}
                    onClick={() => createBoardRow(selectedCustomBoard.id)}
                    disabled={isHistoricalCustomBoardView || boardRowCreationPending || !selectedBoardActionPermissions.createBoardRow}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    ref={menuTriggerRef}
                    type="button"
                    className="icon-button custom-board-menu-trigger"
                    aria-label="Abrir acciones del tablero"
                    aria-expanded={customBoardActionsMenuOpen}
                    onClick={() => {
                      if (!customBoardActionsMenuOpen) {
                        const rect = menuTriggerRef.current?.getBoundingClientRect();
                        if (rect) setDropdownPos({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 244) });
                      }
                      setCustomBoardActionsMenuOpen((current) => !current);
                    }}
                    disabled={isHistoricalCustomBoardView}
                  >
                    <Menu size={16} />
                  </button>
                  {customBoardActionsMenuOpen && !isHistoricalCustomBoardView && dropdownPos ? createPortal(
                    <div
                      className="custom-board-actions-dropdown"
                      style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button type="button" className="custom-board-menu-item" onClick={() => { setCustomBoardActionsMenuOpen(false); void saveCurrentBoardAsTemplate(); }} disabled={!actionPermissions?.saveTemplate}>
                        Guardar como plantilla
                      </button>
                      <button type="button" className="custom-board-menu-item" onClick={() => { setCustomBoardActionsMenuOpen(false); void setAsTarimaReviewBoard(); }} disabled={!canChangeSelectedBoardOperationalContext}>
                        Usar para revisión de tarimas
                      </button>
                      <button type="button" className="custom-board-menu-item" onClick={() => { setCustomBoardActionsMenuOpen(false); exportSelectedBoardToExcel(); }} disabled={!selectedBoardActionPermissions.exportBoardExcel}>
                        Exportar Excel
                      </button>
                      <button type="button" className="custom-board-menu-item" onClick={() => { setCustomBoardActionsMenuOpen(false); previewSelectedBoardPdf(); }} disabled={!selectedBoardActionPermissions.previewBoardPdf}>
                        Vista PDF
                      </button>
                      <button type="button" className="custom-board-menu-item" onClick={() => { setCustomBoardActionsMenuOpen(false); exportSelectedBoardToPdf(); }} disabled={!selectedBoardActionPermissions.exportBoardPdf}>
                        Exportar PDF
                      </button>
                      <hr style={{ margin: "0.3rem 0", border: "none", borderTop: "1px solid rgba(49, 77, 105, 0.1)" }} />
                      <button type="button" className="custom-board-menu-item" onClick={() => { setCustomBoardActionsMenuOpen(false); exportCurrentBoardAsJson(); }}>
                        Exportar estructura JSON
                      </button>
                      <button type="button" className="custom-board-menu-item" disabled={isBoardImporting || !actionPermissions?.createBoard} onClick={() => { setCustomBoardActionsMenuOpen(false); boardImportInputRef.current?.click(); }}>
                        {isBoardImporting ? "Importando..." : "Importar tablero desde JSON"}
                      </button>
                      <input ref={boardImportInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleBoardImportFile} />
                    </div>,
                    document.body
                  ) : null}
              </div>
              </div>
            </div>

            <div className="board-meta-inline board-meta-inline-header">
              <span>Creó · {userMap.get(boardView?.createdById)?.name || "N/A"}</span>
              <span>Player principal · {userMap.get(boardView?.ownerId)?.name || "N/A"}</span>
              <span>{getBoardAssignmentSummary(boardView, userMap)}</span>
              {boardOperationalContextType !== "none" && boardOperationalContextValue ? <span>{boardOperationalContextLabel} · {boardOperationalContextValue}</span> : null}
              {isHistoricalCustomBoardView ? <span>Corte · {formatDate(selectedCustomBoardSnapshot?.startDate)} - {formatDate(selectedCustomBoardSnapshot?.endDate)}</span> : null}
            </div>
            {!weekdayAllowedBySystemSchedule && showCleaningNaveSelector ? <p className="validation-text">La nave {cleaningNaveValue} no tiene actividades configuradas para este día en la semana seleccionada.</p> : null}
            {isHistoricalBoardReadOnly ? (
              <p className="subtle-line">Vista histórica en solo lectura. El tablero activo ya quedó limpio para la semana actual.</p>
            ) : null}
            {canEditHistoricalBoardWeeks ? (
              <p className="subtle-line">Semana cerrada con edición habilitada. Puedes corregir registros o terminar actividades que quedaron pendientes.</p>
            ) : null}
            <p className="required-legend"><span className="required-mark" aria-hidden="true">*</span> obligatorio</p>

            {boardLooksReturnsRecondition ? (
              <ReturnsReconditionScanner
                boardView={boardView}
                currentUser={currentUser}
                inventoryItems={state.inventoryItems || []}
                state={state}
                requestJson={requestJson}
                applyRemoteWarehouseState={applyRemoteWarehouseState}
                setState={setState}
                setLoginDirectory={setLoginDirectory}
                skipNextSyncRef={skipNextSyncRef}
                setSyncStatus={setSyncStatus}
                setBoardRuntimeFeedback={setBoardRuntimeFeedback}
                operationalWorkHours={effectiveWorkHours}
                disabled={isHistoricalBoardReadOnly}
              />
            ) : null}

            <div className="table-wrap">
              <table className="admin-table-clean board-runtime-table">
                <thead>
                  {selectedCustomBoardSections.length && !boardLooksReturnsRecondition ? (
                    <tr className="board-pdf-hide">
                      {selectedCustomBoardSections.map((section, index) => (
                        <th key={`${section.name}-${index}`} colSpan={section.span} className="board-section-header-cell" style={{ backgroundColor: section.color }}>
                          {section.name}
                        </th>
                      ))}
                    </tr>
                  ) : null}
                  <tr>
                    {visibleBoardColumns.map((column) => (
                      <th key={column.token} className={`${column.kind !== "field" && column.id === "workflow" ? "board-pdf-hide" : ""} ${columnResizing.columnToken === column.token ? "resizing" : ""}`} style={getEffectiveColumnWidth(column)} title={column.kind === "field" ? `${column.field.helpText || column.field.label}${column.field.required ? " · Obligatorio" : ""}` : column.label}>
                        {column.kind === "field"
                          ? formatFieldLabel(
                            boardLooksReturnsRecondition && String(column.field.label || "").trim().toLowerCase() === "tarima"
                              ? "Caja"
                              : column.field.label,
                            column.field.required,
                          )
                          : column.label}
                        <div
                          onMouseDown={(e) => handleColumnResizeStart(e, column.token)}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: "8px",
                            cursor: "col-resize",
                            touchAction: "none",
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const canOverrideRowOperations = Boolean(canManageDashboardState);
                    const rowCaptureEnabled = !isHistoricalBoardReadOnly && canEditBoardRowRecord(currentUser, selectedCustomBoard, row, normalizedPermissions);
                    const rowWorkflowEnabled = !isHistoricalBoardReadOnly && canOperateBoardRowRecord(currentUser, selectedCustomBoard, row, normalizedPermissions);
                    const canDeleteBoardRows = canDeleteBoardRowRecord(currentUser, selectedCustomBoard, row, normalizedPermissions);
                    const rowDeleteEnabled = canDeleteBoardRows
                      && !isHistoricalCustomBoardView
                      && !isHistoricalBoardReadOnly;
                    const isFinishedRow = row.status === STATUS_FINISHED;
                    const rowSlaReferenceNow = isFinishedRow && row.endTime ? new Date(row.endTime).getTime() : realtimeNow;
                    const rowSla = boardShowMetrics
                      ? evaluateBoardRowSla(boardView, row, catalogMap, rowSlaReferenceNow, pauseState)
                      : null;
                    const rowFieldEditable = rowCaptureEnabled;
                    const rowAssigneeEditable = !isHistoricalBoardReadOnly
                      && canEditBoardRowRecord(currentUser, selectedCustomBoard, row, normalizedPermissions);
                    const rowDisplayReadOnly = isHistoricalBoardReadOnly;
                    const canStartRow = row.status === STATUS_PENDING || row.status === STATUS_PAUSED;
                    const canPauseRow = row.status === STATUS_RUNNING;
                    const checklistTemplateForRow = resolveChecklistTemplateForActivity(getRowActivityLabel(row));
                    const checklistRecordForRow = getRowInspectionRecord(row);
                    const checklistPendingCompletion = (() => {
                      if (!checklistTemplateForRow || row.status !== STATUS_RUNNING) return false;
                      if (!checklistRecordForRow) return true;

                      if (showCleaningNaveSelector) {
                        if (String(checklistRecordForRow?.completedAt || "").trim()) return false;
                        const completedSites = Array.isArray(checklistRecordForRow?.completedSites)
                          ? checklistRecordForRow.completedSites.map((site) => String(site || "").trim().toUpperCase())
                          : [];
                        return completedSites.length < CLEANING_BOARD_NAVES.length;
                      }

                      const matchedCatalogItem = resolveCatalogItemByActivityLabel(getRowActivityLabel(row));
                      const matchedSites = filterChecklistSiteOptions(matchedCatalogItem?.cleaningSites);
                      const recordSiteOptions = filterChecklistSiteOptions(checklistRecordForRow?.siteOptions);
                      const totalSites = recordSiteOptions.length || matchedSites.length;
                      if (totalSites > 1) {
                        const completedCount = Array.isArray(checklistRecordForRow?.completedSites) ? checklistRecordForRow.completedSites.length : 0;
                        return completedCount < totalSites;
                      }
                      return !String(checklistRecordForRow?.completedAt || "").trim();
                    })();
                    const canFinishRow = row.status === STATUS_RUNNING && !checklistPendingCompletion;
                    const canOpenChecklistWhileRunning = row.status === STATUS_RUNNING && Boolean(resolveChecklistTemplateForActivity(getRowActivityLabel(row)));
                    const rowResponsibleIds = getBoardRowResponsibleIds(row);
                    const assigneeDisplayLabel = formatBoardRowAssigneeLabel(row, userMap, { useInitialsForMultiple: true, emptyLabel: "Asignar player(s)" });
                    const assigneeFullLabel = formatBoardRowAssigneeLabel(row, userMap, { emptyLabel: "Asignar player(s)" });
                    const assigneeMenuOpen = openAssigneeMenuRowId === row.id;
                    return (
                      <tr key={row.id} data-board-row-id={row.id} style={row.id === selectedCustomBoardRowId ? { background: "rgba(14, 165, 233, 0.12)" } : undefined}>
                        {visibleBoardColumns.map((column) => {
                          if (column.kind !== "field") {
                            if (column.id === "assignee") {
                              return (
                                <td key={`${row.id}-${column.token}`} style={getEffectiveColumnWidth(column)}>
                                  <div className="board-assignee-select">
                                    <button
                                      ref={assigneeMenuOpen ? assigneeTriggerRef : null}
                                      type="button"
                                      onClick={() => rowAssigneeEditable && setOpenAssigneeMenuRowId((current) => current === row.id ? "" : row.id)}
                                      disabled={!rowAssigneeEditable}
                                      title={assigneeFullLabel}
                                      className={`board-assignee-trigger${assigneeMenuOpen ? " is-open" : ""}${rowAssigneeEditable ? "" : " is-disabled"}`}
                                    >
                                      <span className="board-assignee-trigger-label">{assigneeDisplayLabel}</span>
                                      <span className="board-assignee-trigger-caret" aria-hidden="true">▾</span>
                                    </button>
                                    {assigneeMenuOpen
                                      ? (
                                        createPortal(
                                          <div
                                            ref={assigneeMenuRef}
                                            className={`board-assignee-menu floating${assigneeMenuPosition.openUp ? " open-up" : ""}`}
                                            style={{
                                              top: `${assigneeMenuPosition.top}px`,
                                              left: `${assigneeMenuPosition.left}px`,
                                              width: `${assigneeMenuPosition.width || 240}px`,
                                            }}
                                          >
                                          <div className="board-assignee-menu-head">
                                            <span>Selecciona player(s)</span>
                                            <strong>{rowResponsibleIds.length}</strong>
                                          </div>
                                          <div className="board-assignee-list">
                                            {assigneeSelectableUsers.filter((user) => user.isActive).map((user) => {
                                              const checked = rowResponsibleIds.includes(user.id);
                                              return (
                                                <label key={user.id} className={`board-assignee-option${checked ? " is-selected" : ""}`}>
                                                  <input
                                                    type="checkbox"
                                                    className="board-assignee-checkbox"
                                                    checked={checked}
                                                    onChange={() => updateRowResponsibleAssignments(
                                                      row.id,
                                                      checked
                                                        ? rowResponsibleIds.filter((userId) => userId !== user.id)
                                                        : rowResponsibleIds.concat(user.id),
                                                    )}
                                                  />
                                                  <span className="board-assignee-name" title={user.name}>{user.name}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                          <div className="board-assignee-actions">
                                            <button type="button" className="icon-button board-assignee-clear" onClick={() => updateRowResponsibleAssignments(row.id, [])}>Limpiar</button>
                                            <button type="button" className="primary-button board-assignee-close" onClick={() => setOpenAssigneeMenuRowId("")}>Cerrar</button>
                                          </div>
                                          </div>,
                                          document.body,
                                        )
                                      )
                                      : null}
                                  </div>
                                </td>
                              );
                            }

                            if (column.id === "status") {
                              const persistedPauseLogs = Array.isArray(row.pauseLogs) ? row.pauseLogs : [];
                              const totalPauseSeconds = getRowPauseSeconds(row, realtimeNow);
                              const pauseCount = persistedPauseLogs.length + (row.status === STATUS_PAUSED && row.pauseStartedAt && !persistedPauseLogs.some((entry) => !entry?.resumedAt) ? 1 : 0);
                              const pauseReasonLabel = String(
                                row.lastPauseReason
                                || persistedPauseLogs[persistedPauseLogs.length - 1]?.reason
                                || "",
                              ).trim();
                              const showPauseReason = pauseReasonLabel && !/ajuste\s+manual\s+de\s+contadores/i.test(pauseReasonLabel);
                              return (
                                <td key={`${row.id}-${column.token}`} style={getEffectiveColumnWidth(column)}>
                                  <div style={{ display: "grid", gap: "0.2rem" }}>
                                    <StatusBadge status={row.status || STATUS_PENDING} />
                                    {rowSla?.isDelayed ? (
                                      <span className="chip danger">Retraso +{formatDurationClock(rowSla.excessSeconds)}</span>
                                    ) : null}
                                    {rowSla?.isTooFast ? (
                                      <span className="chip">Muy rápida · {formatDurationClock(rowSla.durationSeconds)}</span>
                                    ) : null}
                                    {rowSla && rowSla.limitMinutes > 0 && !rowSla.isDelayed && !rowSla.isTooFast && (row.startTime || rowSla.durationSeconds > 0) ? (
                                      <small className="subtle-line">SLA {rowSla.limitMinutes} min · {formatDurationClock(rowSla.durationSeconds)}</small>
                                    ) : null}
                                    {pauseCount > 0 ? <small className="subtle-line">{pauseCount} pausa(s) · {formatDurationClock(totalPauseSeconds)}</small> : null}
                                    {row.status === STATUS_PAUSED && showPauseReason ? <small className="subtle-line">Motivo: {pauseReasonLabel}</small> : null}
                                    {pauseCount > 0 ? (
                                      <button
                                        type="button"
                                        className="board-pdf-hide"
                                        style={{ background: "none", border: "none", padding: 0, color: "#5b8a8a", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline", textAlign: "left" }}
                                        onClick={() => setPauseDetailsRow(row)}
                                      >
                                        Ver pausas
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              );
                            }

                            if (column.id === "time") {
                              const effectiveNow = row.status === STATUS_FINISHED && row.endTime ? new Date(row.endTime).getTime() : realtimeNow;
                              const computedSecs = getElapsedSeconds(row, effectiveNow, pauseState);
                              if (canOverrideRowOperations) {
                                const editKey = `${row.id}-time`;
                                const editingVal = leadTimeEdits[editKey];
                                const displayVal = editingVal !== undefined ? editingVal : formatDurationClock(computedSecs);
                                return (
                                  <td key={`${row.id}-${column.token}`} style={getEffectiveColumnWidth(column)}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={displayVal}
                                      placeholder="HH:mm:ss"
                                      style={{ width: "100%" }}
                                      onChange={(event) => setLeadTimeEdits((prev) => ({ ...prev, [editKey]: event.target.value }))}
                                      onBlur={(event) => {
                                        setLeadTimeEdits((prev) => { const next = { ...prev }; delete next[editKey]; return next; });
                                        const secs = parseHhmmssToSeconds(event.target.value);
                                        if (secs !== null) {
                                          const computedPauseSecs = getRowPauseSeconds(row, effectiveNow);
                                          const computedTotalSecs = Math.max(0, computedSecs + computedPauseSecs);
                                          const existingOverride = Number(row.totalElapsedSecondsOverride);
                                          const preservedTotalSecs = Math.max(
                                            computedSecs,
                                            Number.isFinite(existingOverride) && existingOverride >= 0
                                              ? Math.max(0, existingOverride)
                                              : computedTotalSecs,
                                          );
                                          updateBoardRowTimeOverride(selectedCustomBoard.id, row.id, {
                                            accumulatedSeconds: secs,
                                            totalElapsedSecondsOverride: preservedTotalSecs,
                                          });
                                        }
                                      }}
                                    />
                                  </td>
                                );
                              }
                              return <td key={`${row.id}-${column.token}`} style={getEffectiveColumnWidth(column)}>{formatDurationClock(computedSecs)}</td>;
                            }

                            if (column.id === "totalTime") {
                              const effectiveNow = row.status === STATUS_FINISHED && row.endTime ? new Date(row.endTime).getTime() : realtimeNow;
                              const prodSecs = getElapsedSeconds(row, effectiveNow, pauseState);
                              const computedTotalSecs = row.status === STATUS_PAUSED
                                ? Math.max(0, prodSecs + getRowPauseSeconds(row, effectiveNow))
                                : Math.max(0, prodSecs + getRowPauseSeconds(row, effectiveNow));
                              const overriddenTotalSecs = Number(row.totalElapsedSecondsOverride);
                              const totalSecs = Number.isFinite(overriddenTotalSecs) && overriddenTotalSecs >= 0
                                ? Math.max(computedTotalSecs, Math.max(0, overriddenTotalSecs))
                                : computedTotalSecs;
                              if (canOverrideRowOperations) {
                                const editKey = `${row.id}-totalTime`;
                                const editingVal = leadTimeEdits[editKey];
                                const displayVal = editingVal !== undefined ? editingVal : formatDurationClock(totalSecs);
                                return (
                                  <td key={`${row.id}-${column.token}`} style={getEffectiveColumnWidth(column)}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={displayVal}
                                      placeholder="HH:mm:ss"
                                      style={{ width: "100%" }}
                                      onChange={(event) => setLeadTimeEdits((prev) => ({ ...prev, [editKey]: event.target.value }))}
                                      onBlur={(event) => {
                                        setLeadTimeEdits((prev) => { const next = { ...prev }; delete next[editKey]; return next; });
                                        const secs = parseHhmmssToSeconds(event.target.value);
                                        if (secs !== null) updateBoardRowTimeOverride(selectedCustomBoard.id, row.id, { totalElapsedSecondsOverride: secs });
                                      }}
                                    />
                                  </td>
                                );
                              }
                              return <td key={`${row.id}-${column.token}`} style={getEffectiveColumnWidth(column)}>{formatDurationClock(totalSecs)}</td>;
                            }

                            if (column.id === "efficiency") {
                              const effectiveNow = row.status === STATUS_FINISHED && row.endTime ? new Date(row.endTime).getTime() : realtimeNow;
                              const prodSecs = getElapsedSeconds(row, effectiveNow, pauseState);
                              const computedTotalSecs = row.status === STATUS_PAUSED
                                ? Math.max(0, prodSecs + getRowPauseSeconds(row, effectiveNow))
                                : Math.max(0, prodSecs + getRowPauseSeconds(row, effectiveNow));
                              const overriddenTotalSecs = Number(row.totalElapsedSecondsOverride);
                              const totalSecs = Number.isFinite(overriddenTotalSecs) && overriddenTotalSecs >= 0
                                ? Math.max(computedTotalSecs, Math.max(0, overriddenTotalSecs))
                                : computedTotalSecs;
                              const pct = totalSecs > 0 ? Math.round((prodSecs / totalSecs) * 100) : (row.startTime ? 100 : 0);
                              const color = pct >= 80 ? "#4f7da9" : pct >= 50 ? "#3f678f" : "#dc2626";
                              return (
                                <td key={`${row.id}-${column.token}`} style={getEffectiveColumnWidth(column)}>
                                  <span style={{ color, fontWeight: 600 }}>{row.startTime ? `${pct}%` : "—"}</span>
                                </td>
                              );
                            }

                            return (
                              <td key={`${row.id}-${column.token}`} className="board-workflow-cell board-pdf-hide" style={getEffectiveColumnWidth(column)}>
                                <div className="row-actions compact board-workflow-actions">
                                  {canStartRow ? (
                                    <button type="button" className="board-action-button start icon-only" title={row.status === STATUS_PAUSED ? "Reanudar" : "Iniciar"} aria-label={row.status === STATUS_PAUSED ? "Reanudar" : "Iniciar"} onClick={() => { void handleStartRow(row); }} disabled={!rowWorkflowEnabled}>
                                      <Play size={16} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                  {canOpenChecklistWhileRunning ? (
                                    <button type="button" className="board-action-button pause icon-only" title="Abrir checklist" aria-label="Abrir checklist" onClick={() => { void handleStartRow(row); }} disabled={!rowWorkflowEnabled}>
                                      <ClipboardList size={16} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                  {checklistTemplateForRow && !checklistRecordForRow ? (
                                    <button type="button" className="board-action-button icon-only" title="Crear checklist manual" aria-label="Crear checklist manual" onClick={() => openManualChecklistModal(row)} disabled={!rowWorkflowEnabled}>
                                      <Plus size={16} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                  {canPauseRow ? (
                                    <button type="button" className="board-action-button pause icon-only" title="Pausar" aria-label="Pausar" onClick={() => openBoardPauseModal(selectedCustomBoard.id, row.id)} disabled={!rowWorkflowEnabled}>
                                      <PauseCircle size={16} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                  {canFinishRow ? (
                                    <button type="button" className="board-action-button finish icon-only" title="Finalizar" aria-label="Finalizar" onClick={() => openFinishBoardRowConfirm(selectedCustomBoard.id, row.id)} disabled={!rowWorkflowEnabled}>
                                      <Square size={16} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                  {row.status === STATUS_RUNNING && checklistPendingCompletion ? (
                                    <button type="button" className="board-action-button finish icon-only" title="Completa todas las naves del checklist para finalizar" aria-label="Completa todas las naves del checklist para finalizar" disabled>
                                      <Square size={16} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                  {isFinishedRow ? (
                                    <button type="button" className="board-action-button finish icon-only static" title="Terminado" aria-label="Terminado" disabled>
                                      <Square size={16} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                  {getRowInspectionRecord(row) ? (
                                    <button type="button" className="board-action-button pause icon-only" title="Ver checklist realizado" aria-label="Ver checklist realizado" onClick={() => openInspectionRecord(row)}>
                                      <Eye size={16} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                  {canDeleteBoardRows ? (
                                    <button type="button" className={`board-action-button delete icon-only ${rowDeleteEnabled ? "enabled" : "locked"}`.trim()} title={rowDeleteEnabled ? "Eliminar fila" : "No disponible en esta vista"} aria-label={rowDeleteEnabled ? "Eliminar fila" : "No disponible en esta vista"} onClick={() => {
                                      if (!rowDeleteEnabled) return;
                                      setDeleteBoardRowState({ open: true, boardId: selectedCustomBoard.id, rowId: row.id });
                                    }} disabled={!rowDeleteEnabled}>
                                      <Trash2 size={16} strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            );
                          }

                          const field = column.field;
                          const value = getBoardFieldValue(boardView, row, field);
                          const rule = getFieldColorRule(field, value);
                          const columnStyle = getEffectiveColumnWidth(column);
                          const controlStyle = { width: "100%" };
                          const style = rule
                            ? {
                              backgroundColor: rule.color,
                              color: rule.textColor || "inherit",
                              borderRadius: "0.75rem",
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              padding: "0.45rem 0.6rem",
                              display: "inline-flex",
                              alignItems: "center",
                              maxWidth: "100%",
                            }
                            : undefined;
                          const isBoardActivityListField = field.type === "select" && field.optionSource === "catalogByCategory";
                          const options = isBoardActivityListField && !weekdayAllowedBySystemSchedule
                            ? []
                            : buildSelectOptions(field, state, {
                              weekdayOffset: effectiveWeekdayOffset,
                              cleaningSite: effectiveCatalogCleaningSite,
                            });

                          if (field.type === "evidenceGallery" && rowDisplayReadOnly) {
                            return (
                              <td key={field.id} style={columnStyle}>
                                <BoardEvidenceCell
                                  value={value}
                                  disabled={true}
                                  readOnly={true}
                                  label={field.label}
                                  onChange={() => {}}
                                />
                              </td>
                            );
                          }

                          if (rowDisplayReadOnly) {
                            const displayValue = getBoardReadOnlyFieldDisplayValue(field, value, row.values, state.inventoryItems || []);
                            const fallbackDisplayValue = field.type === "formula" ? (displayValue === "" ? "0" : displayValue) : displayValue;
                            return <td key={field.id} style={columnStyle}><span style={style}>{fallbackDisplayValue}</span></td>;
                          }

                          if (field.type === "inventoryLookup") {
                            return (
                              <td key={field.id} style={columnStyle}>
                                <InventoryLookupInput
                                  inventoryItems={state.inventoryItems || []}
                                  value={row.values?.[field.id] || ""}
                                  onChange={(nextValue) => updateBoardRowValue(selectedCustomBoard.id, row.id, field, nextValue)}
                                  placeholder={field.placeholder || "Buscar por código o nombre"}
                                  style={controlStyle}
                                  title={field.helpText || field.label}
                                  disabled={!rowFieldEditable}
                                />
                              </td>
                            );
                          }

                          if (field.type === "maintenanceInventoryLookup") {
                            const maintenanceItems = (state.inventoryItems || []).filter((item) => normalizeInventoryDomain(item.domain) === INVENTORY_DOMAIN_MAINTENANCE);
                            return (
                              <td key={field.id} style={columnStyle}>
                                <BoardMaintenanceInventoryLookupCell
                                  field={field}
                                  inventoryItems={maintenanceItems}
                                  value={row.values?.[field.id] || []}
                                  onChange={(nextValue) => updateBoardRowValue(selectedCustomBoard.id, row.id, field, nextValue)}
                                  disabled={!rowFieldEditable}
                                  InventoryLookupInput={InventoryLookupInput}
                                />
                              </td>
                            );
                          }

                          if (field.type === "select") {
                            const groupedOptions = options.reduce((accumulator, option) => {
                              const groupName = option.group || "Opciones";
                              if (!accumulator[groupName]) accumulator[groupName] = [];
                              accumulator[groupName].push(option);
                              return accumulator;
                            }, {});
                            const isActivityField = isBoardActivityListField && activityListField?.id === field.id;
                            const activityHasValue = String(row.values?.[field.id] || "").trim() !== "";
                            const disabled = !rowFieldEditable || (isActivityField && activityHasValue);
                            return (
                              <td key={field.id} style={columnStyle}>
                                <select value={row.values?.[field.id] || ""} onChange={(event) => updateBoardRowValue(selectedCustomBoard.id, row.id, field, event.target.value)} style={controlStyle} title={field.helpText || field.label} disabled={disabled}>
                                  <option value="">Seleccionar...</option>
                                  {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                                    <optgroup key={groupName} label={groupName}>
                                      {groupOptions.map((option) => <option key={`${groupName}-${option.value}`} value={option.value}>{option.label}</option>) }
                                    </optgroup>
                                  ))}
                                </select>
                              </td>
                            );
                          }

                          if (field.type === "multiSelectDetail") {
                            return (
                              <td key={field.id} style={columnStyle} className="board-cell-multiselect-detail">
                                <BoardMultiSelectDetailCell
                                  field={field}
                                  value={value}
                                  options={options}
                                  disabled={!rowFieldEditable}
                                  onChange={(nextValue) => updateBoardRowValue(selectedCustomBoard.id, row.id, field, nextValue)}
                                />
                              </td>
                            );
                          }

                          if (["number", "currency", "percentage"].includes(field.type)) {
                            const fieldEditKey = `${row.id}-${field.id}`;
                            const hasDraft = Object.prototype.hasOwnProperty.call(fieldEditDrafts, fieldEditKey);
                            const inputValue = hasDraft ? fieldEditDrafts[fieldEditKey] : (row.values?.[field.id] ?? "");
                            return (
                              <td key={field.id} style={columnStyle}>
                                <input
                                  type="number"
                                  value={inputValue}
                                  onChange={(event) => setFieldEditDrafts((prev) => ({ ...prev, [fieldEditKey]: event.target.value }))}
                                  onBlur={() => commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey, { parseAsNumber: true })}
                                  onKeyDown={(event) => {
                                    if (event.key !== "Enter") return;
                                    event.preventDefault();
                                    commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey, { parseAsNumber: true });
                                  }}
                                  placeholder={field.placeholder || "Escribe un valor"}
                                  style={controlStyle}
                                  title={field.helpText || field.label}
                                  disabled={!rowFieldEditable}
                                />
                              </td>
                            );
                          }

                          if (field.type === "textarea") {
                            const fieldEditKey = `${row.id}-${field.id}`;
                            const hasDraft = Object.prototype.hasOwnProperty.call(fieldEditDrafts, fieldEditKey);
                            const inputValue = hasDraft ? fieldEditDrafts[fieldEditKey] : (row.values?.[field.id] || "");
                            return (
                              <td key={field.id} style={columnStyle}>
                                <textarea
                                  rows={2}
                                  value={inputValue}
                                  onChange={(event) => setFieldEditDrafts((prev) => ({ ...prev, [fieldEditKey]: event.target.value }))}
                                  onBlur={() => commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      setFieldEditDrafts((prev) => {
                                        const next = { ...prev };
                                        delete next[fieldEditKey];
                                        return next;
                                      });
                                      return;
                                    }
                                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                                      event.preventDefault();
                                      commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey);
                                    }
                                  }}
                                  placeholder={field.placeholder || "Escribe una nota"}
                                  style={{ ...controlStyle, resize: "vertical", minHeight: "4.5rem", textAlign: "left" }}
                                  title={field.helpText || field.label}
                                  disabled={!rowFieldEditable}
                                />
                              </td>
                            );
                          }

                          if (field.type === "date") {
                            const fieldEditKey = `${row.id}-${field.id}`;
                            const hasDraft = Object.prototype.hasOwnProperty.call(fieldEditDrafts, fieldEditKey);
                            const inputValue = hasDraft ? fieldEditDrafts[fieldEditKey] : (row.values?.[field.id] || "");
                            return (
                              <td key={field.id} style={columnStyle}>
                                <SpanishDateInput
                                  className="board-inline-date"
                                  value={inputValue}
                                  onChange={(event) => {
                                    updateBoardRowValue(selectedCustomBoard.id, row.id, field, event.target.value);
                                    setFieldEditDrafts((prev) => {
                                      const next = { ...prev };
                                      delete next[fieldEditKey];
                                      return next;
                                    });
                                  }}
                                  placeholder="Seleccionar fecha"
                                  disabled={!rowFieldEditable}
                                />
                              </td>
                            );
                          }

                          if (field.type === "time") {
                            const rawTimeValue = String(row.values?.[field.id] || "");
                            const normalizedTimeLabel = String(field.label || "")
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .toLowerCase()
                              .trim();
                            const isStartTimeField = normalizedTimeLabel.includes("inicio") || normalizedTimeLabel.includes("start");
                            const isEndTimeField = normalizedTimeLabel.includes("fin") || normalizedTimeLabel.includes("final") || normalizedTimeLabel.includes("end");
                            const startTimeMs = row.startTime ? new Date(row.startTime).getTime() : NaN;
                            const hasStartTimeMs = Number.isFinite(startTimeMs);
                            const isAutoManagedTimeField = isStartTimeField || isEndTimeField;
                            const timeFieldEditable = rowFieldEditable && (!isAutoManagedTimeField || canOverrideRowOperations);

                            // For Lead editing hora inicio/fin: use local edit buffer or the ISO-derived value.
                            const leadEditKey = `${row.id}-${field.id}`;
                            let displayTimeValue;
                            if (canOverrideRowOperations && isAutoManagedTimeField && leadEditKey in leadTimeEdits) {
                              displayTimeValue = leadTimeEdits[leadEditKey];
                            } else if (!canOverrideRowOperations && Object.prototype.hasOwnProperty.call(fieldEditDrafts, leadEditKey)) {
                              displayTimeValue = fieldEditDrafts[leadEditKey];
                            } else if (isStartTimeField && hasStartTimeMs) {
                              displayTimeValue = formatTime(startTimeMs);
                            } else if (isEndTimeField && row.status === STATUS_FINISHED && row.endTime) {
                              displayTimeValue = formatTime(row.endTime);
                            } else {
                              displayTimeValue = normalizeTimeInput24h(rawTimeValue, false);
                            }

                            return (
                              <td key={field.id} style={columnStyle}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={displayTimeValue}
                                  onChange={(event) => {
                                    if (canOverrideRowOperations && isAutoManagedTimeField) {
                                      setLeadTimeEdits((prev) => ({ ...prev, [leadEditKey]: event.target.value }));
                                    } else {
                                      setFieldEditDrafts((prev) => ({
                                        ...prev,
                                        [leadEditKey]: normalizeTimeInput24h(event.target.value, false),
                                      }));
                                    }
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== "Enter") return;
                                    event.preventDefault();
                                    if (canOverrideRowOperations && isAutoManagedTimeField) {
                                      const hhmm = normalizeTimeInput24h(event.currentTarget.value, true);
                                      setLeadTimeEdits((prev) => {
                                        const next = { ...prev };
                                        delete next[leadEditKey];
                                        return next;
                                      });
                                      if (!hhmm) return;
                                      const baseIso = isStartTimeField ? (row.startTime || new Date().toISOString()) : (row.endTime || row.startTime || new Date().toISOString());
                                      const newIso = hhmmToIso(hhmm, baseIso);
                                      if (!newIso) return;
                                      const overrides = {};
                                      if (isStartTimeField) {
                                        overrides.startTime = newIso;
                                        if (row.endTime) {
                                          const endMs = new Date(row.endTime).getTime();
                                          const newStartMs = new Date(newIso).getTime();
                                          if (endMs > newStartMs) {
                                            overrides.accumulatedSeconds = Math.round((endMs - newStartMs) / 1000);
                                          }
                                        }
                                      } else {
                                        overrides.endTime = newIso;
                                        if (row.startTime) {
                                          const startMs = new Date(row.startTime).getTime();
                                          const newEndMs = new Date(newIso).getTime();
                                          if (newEndMs > startMs) {
                                            overrides.accumulatedSeconds = Math.round((newEndMs - startMs) / 1000);
                                          }
                                        }
                                      }
                                      updateBoardRowTimeOverride(selectedCustomBoard.id, row.id, overrides);
                                      return;
                                    }

                                    const typedValue = Object.prototype.hasOwnProperty.call(fieldEditDrafts, leadEditKey)
                                      ? fieldEditDrafts[leadEditKey]
                                      : normalizeTimeInput24h(event.currentTarget.value, false);
                                    const normalizedValue = normalizeTimeInput24h(typedValue, true);
                                    if (normalizedValue && normalizedValue !== rawTimeValue) {
                                      updateBoardRowValue(selectedCustomBoard.id, row.id, field, normalizedValue);
                                    }
                                    setFieldEditDrafts((prev) => {
                                      const next = { ...prev };
                                      delete next[leadEditKey];
                                      return next;
                                    });
                                  }}
                                  onBlur={() => {
                                    if (!timeFieldEditable) return;
                                    if (canOverrideRowOperations && isAutoManagedTimeField) {
                                      setLeadTimeEdits((prev) => {
                                        const next = { ...prev };
                                        delete next[leadEditKey];
                                        return next;
                                      });
                                    } else {
                                      setFieldEditDrafts((prev) => {
                                        const next = { ...prev };
                                        delete next[leadEditKey];
                                        return next;
                                      });
                                    }
                                  }}
                                  placeholder={field.placeholder || "HH:mm:ss"}
                                  style={controlStyle}
                                  title={field.helpText || field.label}
                                  disabled={!timeFieldEditable}
                                />
                              </td>
                            );
                          }

                          if (field.type === "email") {
                            const fieldEditKey = `${row.id}-${field.id}`;
                            const hasDraft = Object.prototype.hasOwnProperty.call(fieldEditDrafts, fieldEditKey);
                            const inputValue = hasDraft ? fieldEditDrafts[fieldEditKey] : (row.values?.[field.id] || "");
                            return <td key={field.id} style={columnStyle}><input type="email" value={inputValue} onChange={(event) => setFieldEditDrafts((prev) => ({ ...prev, [fieldEditKey]: event.target.value }))} onBlur={() => commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey)} onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey); }} placeholder={field.placeholder || "nombre@empresa.com"} style={controlStyle} title={field.helpText || field.label} disabled={!rowFieldEditable} /></td>;
                          }

                          if (field.type === "phone") {
                            const fieldEditKey = `${row.id}-${field.id}`;
                            const hasDraft = Object.prototype.hasOwnProperty.call(fieldEditDrafts, fieldEditKey);
                            const inputValue = hasDraft ? fieldEditDrafts[fieldEditKey] : (row.values?.[field.id] || "");
                            return <td key={field.id} style={columnStyle}><input type="tel" value={inputValue} onChange={(event) => setFieldEditDrafts((prev) => ({ ...prev, [fieldEditKey]: event.target.value }))} onBlur={() => commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey)} onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey); }} placeholder={field.placeholder || "Ej: 5512345678"} style={controlStyle} title={field.helpText || field.label} disabled={!rowFieldEditable} /></td>;
                          }

                          if (field.type === "url") {
                            const fieldEditKey = `${row.id}-${field.id}`;
                            const hasDraft = Object.prototype.hasOwnProperty.call(fieldEditDrafts, fieldEditKey);
                            const inputValue = hasDraft ? fieldEditDrafts[fieldEditKey] : (row.values?.[field.id] || "");
                            return <td key={field.id} style={columnStyle}><input type="url" value={inputValue} onChange={(event) => setFieldEditDrafts((prev) => ({ ...prev, [fieldEditKey]: event.target.value }))} onBlur={() => commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey)} onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey); }} placeholder={field.placeholder || "https://..."} style={controlStyle} title={field.helpText || field.label} disabled={!rowFieldEditable} /></td>;
                          }

                          if (field.type === "boolean") {
                            return (
                              <td key={field.id} style={columnStyle}>
                                <select value={row.values?.[field.id] || "No"} onChange={(event) => updateBoardRowValue(selectedCustomBoard.id, row.id, field, event.target.value)} style={controlStyle} title={field.helpText || field.label} disabled={!rowFieldEditable}>
                                  <option value="Si">Sí</option>
                                  <option value="No">No</option>
                                </select>
                              </td>
                            );
                          }

                          if (field.type === "status") {
                            return (
                              <td key={field.id} style={columnStyle}>
                                <select value={row.values?.[field.id] || STATUS_PENDING} onChange={(event) => updateBoardRowValue(selectedCustomBoard.id, row.id, field, event.target.value)} style={controlStyle} title={field.helpText || field.label} disabled={!rowFieldEditable}>
                                  <option value={STATUS_PENDING}>{STATUS_PENDING}</option>
                                  <option value={STATUS_RUNNING}>{STATUS_RUNNING}</option>
                                  <option value={STATUS_PAUSED}>{STATUS_PAUSED}</option>
                                  <option value={STATUS_FINISHED}>{STATUS_FINISHED}</option>
                                </select>
                              </td>
                            );
                          }

                          if (field.type === "user") {
                            return (
                              <td key={field.id} style={columnStyle}>
                                <select value={row.values?.[field.id] || ""} onChange={(event) => updateBoardRowValue(selectedCustomBoard.id, row.id, field, event.target.value)} style={controlStyle} title={field.helpText || field.label} disabled={!rowFieldEditable}>
                                  <option value="">Seleccionar player...</option>
                                  {visibleUsers.filter((user) => user.isActive).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                                </select>
                              </td>
                            );
                          }

                          if (field.type === "rating") {
                            const ratingVal = Math.min(5, Math.max(0, Number(row.values?.[field.id] || 0)));
                            return (
                              <td key={field.id} style={columnStyle}>
                                <div style={{ display: "flex", gap: "2px" }}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => rowFieldEditable && updateBoardRowValue(selectedCustomBoard.id, row.id, field, star)}
                                      style={{ background: "none", border: "none", cursor: rowFieldEditable ? "pointer" : "default", fontSize: "16px", padding: "0", color: star <= ratingVal ? "#4f7da9" : "#d1d5db" }}
                                      disabled={!rowFieldEditable}
                                      aria-label={`${star} estrella${star !== 1 ? "s" : ""}`}
                                    >★</button>
                                  ))}
                                </div>
                              </td>
                            );
                          }

                          if (field.type === "progress") {
                            const rawProgressValue = row.values?.[field.id];
                            const hasProgressValue = rawProgressValue !== "" && rawProgressValue !== null && rawProgressValue !== undefined;
                            const progVal = hasProgressValue ? Math.min(100, Math.max(0, Number(rawProgressValue))) : 0;
                            const progressInputValue = hasProgressValue ? progVal : "";
                            const progColor = progVal >= 80 ? "#4f7da9" : progVal >= 50 ? "#3f678f" : "#dc2626";
                            return (
                              <td key={field.id} style={columnStyle}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div style={{ flex: 1, height: "6px", borderRadius: "999px", background: "#e5e7eb", overflow: "hidden" }}>
                                    <div style={{ width: `${progVal}%`, height: "100%", background: progColor, borderRadius: "999px", transition: "width 0.2s" }} />
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={progressInputValue}
                                    onChange={(event) => {
                                      if (!rowFieldEditable) return;
                                      const rawValue = event.target.value;
                                      if (rawValue === "") {
                                        updateBoardRowValue(selectedCustomBoard.id, row.id, field, "");
                                        return;
                                      }
                                      const numericValue = Number(rawValue);
                                      updateBoardRowValue(selectedCustomBoard.id, row.id, field, Math.min(100, Math.max(0, numericValue)));
                                    }}
                                    style={{ width: "44px", fontSize: "11px", textAlign: "right", border: "none", background: "transparent" }}
                                    disabled={!rowFieldEditable}
                                  />
                                  <span style={{ fontSize: "11px", color: "#6b7280" }}>%</span>
                                </div>
                              </td>
                            );
                          }

                          if (field.type === "counter") {
                            const counterVal = Number(row.values?.[field.id] || 0);
                            return (
                              <td key={field.id} style={columnStyle}>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <button type="button" onClick={() => rowFieldEditable && updateBoardRowValue(selectedCustomBoard.id, row.id, field, Math.max(0, counterVal - 1))} disabled={!rowFieldEditable || counterVal <= 0} style={{ width: "22px", height: "22px", borderRadius: "50%", border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                                  <span style={{ minWidth: "28px", textAlign: "center", fontWeight: 600, fontSize: "13px" }}>{counterVal}</span>
                                  <button type="button" onClick={() => rowFieldEditable && updateBoardRowValue(selectedCustomBoard.id, row.id, field, counterVal + 1)} disabled={!rowFieldEditable} style={{ width: "22px", height: "22px", borderRadius: "50%", border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                                </div>
                              </td>
                            );
                          }

                          if (field.type === "tags") {
                            const fieldEditKey = `${row.id}-${field.id}`;
                            const hasDraft = Object.prototype.hasOwnProperty.call(fieldEditDrafts, fieldEditKey);
                            const inputValue = hasDraft ? fieldEditDrafts[fieldEditKey] : (row.values?.[field.id] || "");
                            return (
                              <td key={field.id} style={columnStyle}>
                                <input
                                  value={inputValue}
                                  onChange={(event) => setFieldEditDrafts((prev) => ({ ...prev, [fieldEditKey]: event.target.value }))}
                                  onBlur={() => commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey)}
                                  onKeyDown={(event) => {
                                    if (event.key !== "Enter") return;
                                    event.preventDefault();
                                    commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey);
                                  }}
                                  placeholder={field.placeholder || "tag1, tag2, tag3"}
                                  style={controlStyle}
                                  title={field.helpText || field.label}
                                  disabled={!rowFieldEditable}
                                />
                              </td>
                            );
                          }

                          if (field.type === "evidenceGallery") {
                            return (
                              <td key={field.id} style={columnStyle}>
                                <BoardEvidenceCell
                                  value={value}
                                  disabled={!rowFieldEditable}
                                  label={field.label}
                                  onChange={(nextValue) => updateBoardRowValue(selectedCustomBoard.id, row.id, field, nextValue)}
                                />
                              </td>
                            );
                          }

                          if (field.type === "inventoryProperty" && EDITABLE_INVENTORY_PROPERTIES.has(field.inventoryProperty)) {
                            const sourceFieldId = resolveInventoryPropertySourceFieldId(boardView?.fields || [], field.sourceFieldId, field.id);
                            const selectedInventoryId = row.values?.[sourceFieldId] || "";
                            const selectedInventoryItem = (state.inventoryItems || []).find((item) => item.id === selectedInventoryId) || null;
                            const suggestions = getInventoryPropertySuggestions(selectedInventoryItem, field.inventoryProperty, value);
                            return (
                              <td key={field.id} style={columnStyle}>
                                <BoardEditableInventoryPropertyInput
                                  value={String(value || "")}
                                  suggestions={suggestions}
                                  onChange={(nextValue) => updateBoardRowValue(selectedCustomBoard.id, row.id, field, nextValue)}
                                  placeholder={field.placeholder || "Selecciona o escribe un valor"}
                                  title={field.helpText || field.label}
                                  disabled={!rowFieldEditable}
                                />
                              </td>
                            );
                          }

                          if (field.type === "formula" || field.type === "inventoryProperty") {
                            const formattedValue = formatBoardCellObjectValue(value);
                            const displayValue = formattedValue === "" && field.type === "formula" ? "0" : formattedValue;
                            return <td key={field.id} style={columnStyle}><span style={style}>{displayValue}</span></td>;
                          }

                          const fieldEditKey = `${row.id}-${field.id}`;
                          const hasDraft = Object.prototype.hasOwnProperty.call(fieldEditDrafts, fieldEditKey);
                          const inputValue = hasDraft
                            ? fieldEditDrafts[fieldEditKey]
                            : formatBoardCellObjectValue(row.values?.[field.id] ?? "");
                          return <td key={field.id} style={columnStyle}><input value={inputValue} onChange={(event) => setFieldEditDrafts((prev) => ({ ...prev, [fieldEditKey]: event.target.value }))} onBlur={() => commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey)} onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); commitBoardFieldDraft(selectedCustomBoard.id, row, field, fieldEditKey); }} placeholder={field.placeholder || "Captura un valor"} style={rule ? { ...controlStyle, backgroundColor: rule.color, color: rule.textColor || "inherit" } : controlStyle} title={field.helpText || field.label} disabled={!rowFieldEditable} /></td>;
                        })}
                      </tr>
                    );
                  })}
                  {!visibleRows.length ? (
                    <tr>
                      <td colSpan={visibleBoardColumns.length || 1}>
                        <span className="subtle-line">{isHistoricalCustomBoardView ? "No hubo filas registradas en esa semana para este tablero." : "No hay actividades para el día y nave seleccionados."}</span>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : (
        <article className="surface-card empty-state">
          <LayoutDashboard size={44} />
          <h3>No tienes tableros asignados</h3>
          <p>{currentUser.role === ROLE_JR ? "Tu líder aún no te asigna un tablero." : "Crea un tablero desde Creador de tableros para comenzar."}</p>
        </article>
      )}

      <OperationalInspectionStartModal
        open={inspectionModalState.open}
        activityLabel={inspectionModalState.activityLabel}
        currentUser={currentUser}
        defaultArea={boardOperationalContextValue || boardOwnerAreaKey || ""}
        defaultProcess={boardView?.name || ""}
        checklistTemplate={inspectionModalState.checklistTemplate}
        existingInspectionRecord={inspectionModalState.existingInspectionRecord}
        requireIncidentSiteSelection={inspectionModalState.requireIncidentSiteSelection}
        incidentSiteOptions={inspectionModalState.incidentSiteOptions}
        onClose={() => {
          if (inspectionSubmitting) return;
          setInspectionModalState({
            open: false,
            rowId: "",
            activityLabel: "",
            checklistTemplate: null,
            existingInspectionRecord: null,
            requireIncidentSiteSelection: false,
            incidentSiteOptions: [],
          });
        }}
        onConfirm={handleConfirmOperationalInspection}
        confirmBusy={inspectionSubmitting}
      />
      <OperationalInspectionRecordModal
        open={inspectionRecordModalState.open}
        activityLabel={inspectionRecordModalState.activityLabel}
        record={inspectionRecordModalState.record}
        onClose={() => setInspectionRecordModalState({ open: false, rowId: "", activityLabel: "", record: null })}
      />

      <Modal
        open={Boolean(pauseDetailsRow)}
        title="Detalle de pausas"
        onClose={() => setPauseDetailsRow(null)}
        confirmLabel="Cerrar"
        hideCancel
      >
        {pauseDetailsRow ? (
          <div style={{ display: "grid", gap: "0.55rem" }}>
            <p className="subtle-line" style={{ margin: 0 }}>
              {(() => {
                const activityLabel = activityListField?.id ? String(pauseDetailsRow?.values?.[activityListField.id] || "").trim() : "";
                return activityLabel ? `Actividad: ${activityLabel}` : "Actividad sin nombre";
              })()}
            </p>
            {pauseDetailsLogs.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.45rem", maxHeight: "42vh", overflowY: "auto", paddingRight: "0.1rem" }}>
                {pauseDetailsLogs.map((entry, index) => {
                  const effectiveNow = pauseDetailsRow?.status === STATUS_FINISHED && pauseDetailsRow?.endTime
                    ? new Date(pauseDetailsRow.endTime).getTime()
                    : realtimeNow;
                  const liveProductionSeconds = getElapsedSeconds(pauseDetailsRow, effectiveNow, pauseState);
                  const startLabel = entry?.pausedAt ? formatTime(entry.pausedAt) : "--";
                  const endLabel = entry?.resumedAt ? formatTime(entry.resumedAt) : "En curso";
                  const durationSeconds = entry?.resumedAt
                    ? Math.max(0, Number(entry?.pauseDurationSeconds || 0))
                    : entry?.pausedAt
                      ? Math.max(0, getOperationalElapsedSeconds(entry.pausedAt, realtimeNow, pauseState, pauseDetailsRow?.cleaningSite))
                      : 0;
                  const countedDurationSeconds = entry?.resumedAt
                    ? getCountedPauseSeconds(entry)
                    : entry?.pausedAt
                      ? Math.max(0, getLivePauseOverflowSeconds({
                          ...pauseDetailsRow,
                          pauseStartedAt: entry.pausedAt,
                          pauseAuthorizedSeconds: Math.max(0, Number(entry?.pauseAuthorizedSeconds || pauseDetailsRow?.pauseAuthorizedSeconds || 0)),
                        }, realtimeNow, pauseState))
                      : 0;
                  const durationEditKey = `${pauseDetailsRow.id}:${entry?.id || index}`;
                  const durationEditValue = pauseDurationEdits[durationEditKey] ?? formatDurationClock(durationSeconds);
                  const canManagePauseLogs = !isHistoricalBoardReadOnly && (
                    canManageDashboardState
                    || canEditHistoricalBoardWeeks
                    || canEditBoardRowRecord(currentUser, selectedCustomBoard, pauseDetailsRow, normalizedPermissions)
                  );
                  const canEditPauseDuration = canManagePauseLogs && Boolean(entry?.resumedAt);
                  const canDeletePauseEntry = canManagePauseLogs;
                  return (
                    <article key={entry?.id || `${pauseDetailsRow.id}-pause-${index}`} style={{ border: "1px solid rgba(49, 77, 105, 0.14)", borderRadius: "0.8rem", padding: "0.48rem 0.58rem", display: "grid", gap: "0.2rem" }}>
                      <strong style={{ fontSize: "0.78rem" }}>Pausa {index + 1}</strong>
                      <span style={{ fontSize: "0.76rem" }}>Inicio: {startLabel}</span>
                      <span style={{ fontSize: "0.76rem" }}>Fin: {endLabel}</span>
                      {canEditPauseDuration ? (
                        <label style={{ display: "grid", gap: "0.18rem", fontSize: "0.76rem" }}>
                          <span>Duración</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={durationEditValue}
                            placeholder="HH:mm:ss"
                            style={{ width: "100%" }}
                            onChange={(event) => setPauseDurationEdits((prev) => ({ ...prev, [durationEditKey]: event.target.value }))}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") return;
                              event.preventDefault();
                              const nextSeconds = parseHhmmssToSeconds(event.target.value);
                              if (nextSeconds === null) {
                                setPauseDurationEdits((prev) => ({ ...prev, [durationEditKey]: formatDurationClock(durationSeconds) }));
                                return;
                              }
                              const nextPauseLogs = pauseDetailsLogs.map((logEntry, logIndex) => {
                                if ((logEntry?.id || `${logIndex}`) !== (entry?.id || `${index}`)) return logEntry;
                                return {
                                  ...logEntry,
                                  resumedAt: logEntry?.pausedAt ? addSecondsToIso(logEntry.pausedAt, nextSeconds) : logEntry?.resumedAt,
                                  pauseDurationSeconds: nextSeconds,
                                  countedPauseDurationSeconds: Math.max(0, nextSeconds - Math.max(0, Number(logEntry?.pauseAuthorizedSeconds || 0))),
                                };
                              });
                              const totalPauseSeconds = nextPauseLogs.reduce((sum, logEntry) => sum + getCountedPauseSeconds(logEntry), 0);
                              updateBoardRowTimeOverride(selectedCustomBoard.id, pauseDetailsRow.id, {
                                pauseLogs: nextPauseLogs,
                                totalElapsedSecondsOverride: liveProductionSeconds + totalPauseSeconds,
                              });
                              setPauseDurationEdits((prev) => ({ ...prev, [durationEditKey]: formatDurationClock(nextSeconds) }));
                            }}
                            onBlur={() => {
                              setPauseDurationEdits((prev) => ({ ...prev, [durationEditKey]: formatDurationClock(durationSeconds) }));
                            }}
                          />
                        </label>
                      ) : (
                        <span style={{ fontSize: "0.76rem" }}>Duración contable: {formatDurationClock(countedDurationSeconds)}</span>
                      )}
                      {entry?.reason && !/ajuste\s+manual\s+de\s+contadores/i.test(String(entry.reason)) ? <span style={{ fontSize: "0.74rem", color: "#4b6b66" }}>Motivo: {entry.reason}</span> : null}
                      {canDeletePauseEntry ? (
                        <button
                          type="button"
                          className="board-pdf-hide"
                          style={{ background: "none", border: "none", padding: 0, color: "#b05050", fontSize: "0.74rem", cursor: "pointer", textDecoration: "underline", textAlign: "left" }}
                          onClick={() => {
                            const nextPauseLogs = pauseDetailsLogs.filter((logEntry, logIndex) => {
                              const currentKey = logEntry?.id || `${logIndex}`;
                              const targetKey = entry?.id || `${index}`;
                              return currentKey !== targetKey;
                            });
                            const totalPauseSeconds = nextPauseLogs.reduce((sum, logEntry) => sum + getCountedPauseSeconds(logEntry), 0);
                            const livePauseSecondsForRow = pauseDetailsRow?.status === STATUS_PAUSED && pauseDetailsRow?.pauseStartedAt
                              ? Math.max(0, getLivePauseOverflowSeconds(pauseDetailsRow, realtimeNow, pauseState))
                              : 0;
                            updateBoardRowTimeOverride(selectedCustomBoard.id, pauseDetailsRow.id, {
                              pauseLogs: nextPauseLogs,
                              totalElapsedSecondsOverride: Math.max(0, liveProductionSeconds + totalPauseSeconds + livePauseSecondsForRow),
                            });
                          }}
                        >
                          Eliminar pausa
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="subtle-line" style={{ margin: 0 }}>Esta actividad no tiene pausas registradas.</p>
            )}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}