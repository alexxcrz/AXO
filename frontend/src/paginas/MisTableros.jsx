import { cloneElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReturnsReconditionScanner from "../features/boards/ReturnsReconditionScanner.jsx";
import OperationalInspectionStartModal from "../components/OperationalInspectionStartModal.jsx";
import { SpanishDateInput } from "../components/SpanishDateInput";
import OperationalInspectionRecordModal from "../components/OperationalInspectionRecordModal.jsx";
import { BoardEditableInventoryPropertyInput, BoardEvidenceCell, BoardMultiSelectDetailCell } from "../components/BoardRuntimeFieldCells.jsx";
import { downloadBoardAsJson, parseBoardImportJson } from "../utils/boardImportExport";
import { enrichBoardRowNavigationMeta, resolveWeekdayOffsetForOperationalDate } from "../utils/boardNavigationFocus.js";
import { normalizeOperationalInspectionTemplate } from "../utils/operationalInspectionTemplate";
import BoardActivityFinishGateSwitch from "../components/BoardActivityFinishGateSwitch.jsx";
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
  isPalletReviewBoard,
  ensureSelectOptionsIncludeValue,
  renderBoardFieldLabel as renderBoardFieldLabelUtil,
  buildBoardCardLineLayout,
  getCleaningCardLayout,
  resolveCleaningSlotHeaderMeta,
  resolveBoardCardCellRole,
  resolveBoardCardLineItemHeaderMeta,
  formatBoardOperationalDateLabel,
  inferCleaningFieldLayoutRole,
  findBoardFinishGateField,
  isBoardFinishGateField,
  isBoardFinishGateValueEnabled,
  canUserEditBoardFinishGate,
  shouldShowBoardCardFooterMetric,
  shouldUseBoardCardsView,
  shouldShowBoardCardSectionRow,
} from "../utils/utilidades.jsx";
import { Users } from "lucide-react";
import { INVENTORY_DOMAIN_MAINTENANCE, INVENTORY_DOMAIN_BASE, BOARD_AUX_COLUMN_DEFINITIONS } from "../utils/constantes.js";

const EDITABLE_INVENTORY_PROPERTIES = new Set(["lot", "expiry", "label"]);
const CLEANING_BOARD_NAVES = ["C1", "C2", "C3"];

function computeAssigneeMenuPosition(triggerRect, menuHeight = 290) {
  if (!triggerRect) return null;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const horizontalMargin = 8;
  const verticalMargin = 8;
  const gap = 6;
  const desiredWidth = Math.min(Math.max(triggerRect.width, 240), 360);
  const maxLeft = Math.max(horizontalMargin, viewportWidth - desiredWidth - horizontalMargin);
  const left = Math.max(horizontalMargin, Math.min(maxLeft, triggerRect.left));
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const openUp = spaceBelow < menuHeight && triggerRect.top > menuHeight;
  const top = openUp
    ? Math.max(verticalMargin, triggerRect.top - menuHeight - gap)
    : Math.min(viewportHeight - verticalMargin, triggerRect.bottom + gap);
  return {
    top,
    left,
    width: desiredWidth,
    openUp,
  };
}

function getCleaningBoardUserAvatarUrl(user) {
  const avatarValue = String(
    user?.photoThumbnailUrl
      || user?.photoThumbnail
      || user?.photo
      || user?.avatarUrl
      || user?.avatar
      || user?.imageUrl
      || user?.profileImage
      || "",
  ).trim();
  const lowered = avatarValue.toLowerCase();
  if (!avatarValue || ["null", "undefined", "nan", "[object object]"].includes(lowered) || avatarValue.includes("\\fakepath\\")) {
    return "";
  }
  return avatarValue;
}

function getCleaningBoardUserInitials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0][0] || "?").toUpperCase();
}

const EMPTY_PALLET_PACKAGING_MODAL = {
  open: false,
  mode: "product-select",
  boardId: "",
  rowId: "",
  field: null,
  lookupValue: "",
  itemId: "",
  itemCode: "",
  itemName: "",
  boxesPerPallet: "",
  piecesPerBox: "",
  submitting: false,
  error: "",
};

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
    navigateToBoardFocus,
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
  const inventoryItemsById = useMemo(() => {
    const map = new Map();
    (state?.inventoryItems || []).forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
    return map;
  }, [state?.inventoryItems]);
  const isBoardOwner = Boolean(selectedCustomBoard && currentUser && (currentUser.role === "Lead" || selectedCustomBoard.createdById === currentUser.id || selectedCustomBoard.ownerId === currentUser.id));
  const canAccessBoardBuilder = Boolean(actionPermissions?.createBoard || canManageDashboardState || isBoardOwner);
  const [openAssigneeMenuRowId, setOpenAssigneeMenuRowId] = useState("");
  const [isBoardImporting, setIsBoardImporting] = useState(false);
  const boardImportInputRef = useRef(null);
  const menuTriggerRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [selectedWeekdayFilter, setSelectedWeekdayFilter] = useState("auto");

  useEffect(() => {
    if (!selectedCustomBoardRowId) return;
    const rowElement = document.querySelector(`[data-board-row-id="${selectedCustomBoardRowId}"]`);
    if (!rowElement) return;
    rowElement.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedCustomBoardRowId, selectedCustomBoardId, selectedCustomBoardViewId, selectedWeekdayFilter]);

  const [histViewNave, setHistViewNave] = useState("");
  const [currentWeekdayOffset, setCurrentWeekdayOffset] = useState(() => {
    const today = getOperationalDateParts(Date.now(), normalizeSystemOperationalSettings(state?.system?.operational).timeZone);
    const jsDay = today.jsDay;
    return jsDay === 0 ? 6 : jsDay - 1;
  });
  const [columnResizing, setColumnResizing] = useState({ isResizing: false, columnToken: null, startX: 0, startWidth: 0 });
  const [columnWidthsOverride, setColumnWidthsOverride] = useState({});
  const columnWidthsOverrideRef = useRef({});
  const [cleaningSlotWidthsOverride, setCleaningSlotWidthsOverride] = useState({});
  const cleaningSlotWidthsOverrideRef = useRef({});
  const [cleaningSlotResizing, setCleaningSlotResizing] = useState({
    isResizing: false,
    slotId: "",
    startX: 0,
    startWidth: 0,
  });
  const assigneeMenuRef = useRef(null);
  const assigneeTriggerByRowRef = useRef(new Map());
  const [assigneeMenuPosition, setAssigneeMenuPosition] = useState({ top: 0, left: 0, width: 240, openUp: false });
  const [pauseDetailsRow, setPauseDetailsRow] = useState(null);
  const [operationalAlertsModal, setOperationalAlertsModal] = useState("");
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
  const [palletPackagingModal, setPalletPackagingModal] = useState(EMPTY_PALLET_PACKAGING_MODAL);
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

  function commitBoardTimeFieldDraft(row, field, typedRawValue, {
    canOverrideRowOperations,
    isStartTimeField,
    isEndTimeField,
    isAutoManagedTimeField,
    rawTimeValue,
  }) {
    const leadEditKey = `${row.id}-${field.id}`;

    if (canOverrideRowOperations && isAutoManagedTimeField) {
      const hhmm = normalizeTimeInput24h(typedRawValue, true);
      setLeadTimeEdits((prev) => {
        const next = { ...prev };
        delete next[leadEditKey];
        return next;
      });
      if (!hhmm) return;

      const currentDisplay = isStartTimeField && row.startTime
        ? formatTime(row.startTime)
        : isEndTimeField && row.endTime
          ? formatTime(row.endTime)
          : normalizeTimeInput24h(rawTimeValue, true);
      if (hhmm === normalizeTimeInput24h(currentDisplay, true)) return;

      const baseIso = isStartTimeField
        ? (row.startTime || new Date().toISOString())
        : (row.endTime || row.startTime || new Date().toISOString());
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
      : normalizeTimeInput24h(typedRawValue, false);
    const normalizedValue = normalizeTimeInput24h(typedValue, true);
    setFieldEditDrafts((prev) => {
      const next = { ...prev };
      delete next[leadEditKey];
      return next;
    });
    if (normalizedValue && normalizedValue !== normalizeTimeInput24h(rawTimeValue, true)) {
      updateBoardRowValue(selectedCustomBoard.id, row.id, field, normalizedValue);
    }
  }

  const [pauseDurationEdits, setPauseDurationEdits] = useState({});
  const boardColumns = boardView ? getOrderedBoardColumns(boardView, canAccessBoardBuilder) : [];
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
  const useBoardCardsView = shouldUseBoardCardsView(boardView?.settings);
  const useCleaningCardLayout = useBoardCardsView;
  const visibleBoardColumns = boardColumns;
  const cleaningCardLayout = useMemo(
    () => (useBoardCardsView ? getCleaningCardLayout(boardView?.settings) : null),
    [useBoardCardsView, boardView?.settings?.cleaningCardLayout],
  );

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
    { value: "all", label: "Todos" },
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
    : selectedWeekdayFilter === "all"
      ? null
      : Number(selectedWeekdayFilter);
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
    if (selectedWeekdayFilter === "all") return "";
    if (selectedWeekdayFilter === "auto") {
      return getOperationalDateParts(Date.now(), operationalTimeZone).isoDate;
    }
    const parsedWeekStart = parseBoardWeekKey(effectiveWeekKey);
    if (!parsedWeekStart || effectiveWeekdayOffset === null || Number.isNaN(effectiveWeekdayOffset)) return "";
    const targetDate = addDays(parsedWeekStart, effectiveWeekdayOffset);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();
  const resolvedCatalogWeekdayOffset = useMemo(() => {
    if (selectedWeekdayFilter === "all") return null;
    if (targetOperationalDateKey) {
      const fromOperationalDate = resolveWeekdayOffsetForOperationalDate(targetOperationalDateKey, effectiveWeekKey);
      if (fromOperationalDate !== null) return fromOperationalDate;
    }
    if (selectedWeekdayFilter === "auto") return currentWeekdayOffset;
    const parsed = Number(selectedWeekdayFilter);
    return Number.isFinite(parsed) ? parsed : currentWeekdayOffset;
  }, [selectedWeekdayFilter, targetOperationalDateKey, effectiveWeekKey, currentWeekdayOffset]);
  const weekdayAllowedBySystemSchedule = selectedWeekdayFilter === "all"
    || !showCleaningNaveSelector
    || !allowedWeekdaysForNave.length
    || allowedWeekdaysForNave.includes(resolvedCatalogWeekdayOffset);

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

  const handleAssigneeTriggerClick = (rowId, editable, event) => {
    if (!editable) return;
    if (openAssigneeMenuRowId === rowId) {
      setOpenAssigneeMenuRowId("");
      return;
    }
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const nextPosition = computeAssigneeMenuPosition(triggerRect);
    if (nextPosition) setAssigneeMenuPosition(nextPosition);
    setOpenAssigneeMenuRowId(rowId);
  };

  useEffect(() => {
    if (!openAssigneeMenuRowId) return undefined;

    function handlePointerDown(event) {
      const clickedInsideMenu = assigneeMenuRef.current?.contains(event.target);
      const clickedTrigger = Array.from(assigneeTriggerByRowRef.current.values()).some(
        (triggerEl) => triggerEl?.contains(event.target),
      );
      if (!clickedInsideMenu && !clickedTrigger) {
        setOpenAssigneeMenuRowId("");
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [openAssigneeMenuRowId]);

  useLayoutEffect(() => {
    if (!openAssigneeMenuRowId) return undefined;

    const updateAssigneeMenuPosition = () => {
      const triggerEl = assigneeTriggerByRowRef.current.get(openAssigneeMenuRowId);
      const triggerRect = triggerEl?.getBoundingClientRect();
      if (!triggerRect) return;
      const menuHeight = assigneeMenuRef.current?.offsetHeight || 290;
      const nextPosition = computeAssigneeMenuPosition(triggerRect, menuHeight);
      if (nextPosition) setAssigneeMenuPosition(nextPosition);
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
  const getColumnMinWidth = () => 1;

  const handleColumnResizeStart = (e, columnToken) => {
    e.preventDefault();
    e.stopPropagation();
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
    cleaningSlotWidthsOverrideRef.current = cleaningSlotWidthsOverride;
  }, [cleaningSlotWidthsOverride]);

  useEffect(() => {
    setCleaningSlotWidthsOverride({});
    cleaningSlotWidthsOverrideRef.current = {};
  }, [selectedCustomBoard?.id]);

  useEffect(() => {
    if (!columnResizing.isResizing) {
      document.body.classList.remove("board-column-resizing");
      return undefined;
    }

    document.body.classList.add("board-column-resizing");

    const handleMouseMove = (e) => {
      const diff = e.clientX - columnResizing.startX;
      const newWidth = Math.max(1, columnResizing.startWidth + diff);
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
      document.body.classList.remove("board-column-resizing");
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

  const getColumnWidthPx = (column) => {
    const style = getEffectiveColumnWidth(column);
    const parsed = Number.parseInt(String(style.width || style.minWidth || "").replace("px", ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : getColumnMinWidth(column);
  };

  const boardCardLine = useMemo(() => {
    if (!useBoardCardsView || !cleaningCardLayout) {
      return { lineItems: [], widths: [], slotWidths: {}, gridTemplateColumns: "" };
    }
    return buildBoardCardLineLayout(
      cleaningCardLayout,
      visibleBoardColumns,
      getColumnWidthPx,
      {
        storedSlotWidths: selectedCustomBoard?.settings?.cleaningCardSlotWidths || {},
        slotWidthOverrides: cleaningSlotWidthsOverride,
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    useBoardCardsView,
    cleaningCardLayout,
    visibleBoardColumns,
    columnWidthsOverride,
    cleaningSlotWidthsOverride,
    selectedCustomBoard?.settings?.columnWidths,
    selectedCustomBoard?.settings?.cleaningCardSlotWidths,
  ]);

  const boardCardsGridTemplate = useBoardCardsView ? boardCardLine.gridTemplateColumns : "";
  const showBoardCardSectionRow = useBoardCardsView
    ? shouldShowBoardCardSectionRow(boardCardLine.lineItems, visibleBoardColumns)
    : false;

  const handleCleaningSlotResizeStart = (event, slotId) => {
    event.preventDefault();
    event.stopPropagation();
    const headerCell = event.currentTarget.parentElement;
    const rect = headerCell.getBoundingClientRect();
    setCleaningSlotResizing({
      isResizing: true,
      slotId,
      startX: event.clientX,
      startWidth: rect.width,
    });
  };

  useEffect(() => {
    if (!cleaningSlotResizing.isResizing) {
      if (useBoardCardsView) document.body.classList.remove("board-column-resizing");
      return undefined;
    }

    document.body.classList.add("board-column-resizing");

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - cleaningSlotResizing.startX;
      const nextWidth = Math.max(1, Math.round(cleaningSlotResizing.startWidth + diff));
      const nextOverrides = {
        ...cleaningSlotWidthsOverrideRef.current,
        [cleaningSlotResizing.slotId]: nextWidth,
      };
      cleaningSlotWidthsOverrideRef.current = nextOverrides;
      setCleaningSlotWidthsOverride(nextOverrides);
    };

    const handleMouseUp = async () => {
      const slotId = cleaningSlotResizing.slotId;
      setCleaningSlotResizing({ isResizing: false, slotId: "", startX: 0, startWidth: 0 });

      const pendingOverrides = cleaningSlotWidthsOverrideRef.current;
      if (!selectedCustomBoard || !slotId || !pendingOverrides[slotId]) return;

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
              cleaningCardSlotWidths: {
                ...(selectedCustomBoard.settings?.cleaningCardSlotWidths || {}),
                ...pendingOverrides,
              },
            },
            columns: Array.isArray(selectedCustomBoard.fields) ? selectedCustomBoard.fields : [],
          }),
        });
        applyRemoteWarehouseState(response?.data?.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setBoardRuntimeFeedback({ tone: "success", message: "Ancho de bloques guardado." });
      } catch {
        setBoardRuntimeFeedback({ tone: "danger", message: "No se pudieron guardar los anchos de los bloques." });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaningSlotResizing, useBoardCardsView, selectedCustomBoard?.id]);

  const activityListField = (boardView?.fields || []).find((field) => field?.type === "select" && field?.optionSource === "catalogByCategory") || null;
  const finishGateField = findBoardFinishGateField(boardView?.fields || []);
  const activityOptionNames = activityListField
    ? new Set(
      (weekdayAllowedBySystemSchedule
        ? buildSelectOptions(activityListField, state, {
            weekdayOffset: resolvedCatalogWeekdayOffset,
            cleaningSite: effectiveCatalogCleaningSite,
          })
        : [])
        .map((option) => String(option.value || "").trim().toLowerCase())
        .filter(Boolean),
    )
    : null;
  const showAllWeekdays = selectedWeekdayFilter === "all";
  const visibleRows = (boardView?.rows || []).filter((row) => {
    const rowOperationalDateKey = (() => {
      if (boardDateField) {
        const fieldDate = normalizeOperationalDateKey(row?.values?.[boardDateField.id]);
        if (fieldDate) return fieldDate;
      }
      const timeIso = row?.endTime || row?.startTime || row?.createdAt;
      if (!timeIso) return "";
      return getOperationalDateParts(new Date(timeIso).getTime(), operationalTimeZone).isoDate;
    })();

    if (targetOperationalDateKey && rowOperationalDateKey && rowOperationalDateKey !== targetOperationalDateKey) {
      return false;
    }

    if (showAllWeekdays) return true;

    if (!isHistoricalCustomBoardView && showCleaningNaveSelector && boardDateField && targetOperationalDateKey) {
      const activityValue = activityListField
        ? String(row?.values?.[activityListField.id] || "").trim().toLowerCase()
        : "";
      const activityAllowedToday = !activityListField
        || !activityOptionNames
        || !activityValue
        || activityOptionNames.has(activityValue);
      return activityAllowedToday;
    }
    if (!activityListField || !activityOptionNames) return true;
    const activityValue = String(row?.values?.[activityListField.id] || "").trim().toLowerCase();
    if (!activityValue) return true;
    if (activityOptionNames.has(activityValue)) return true;
    return Boolean(targetOperationalDateKey && rowOperationalDateKey === targetOperationalDateKey);
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

      if (focus.revealRow) {
        setSelectedWeekdayFilter("all");
      } else if (focus.operationalDate && weekKeyForDate) {
        const weekdayOffset = resolveWeekdayOffsetForOperationalDate(focus.operationalDate, weekKeyForDate);
        if (weekdayOffset !== null) {
          setSelectedWeekdayFilter(String(weekdayOffset));
        }
      }

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

      if (focus.rowId) {
        for (let attempt = 0; attempt < 40; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (cancelled) return;
          const rowElement = document.querySelector(`[data-board-row-id="${focus.rowId}"]`);
          if (rowElement) {
            rowElement.scrollIntoView({ block: "center", behavior: "smooth" });
            break;
          }
        }
      }

      if (cancelled) return;

      if (focus.rowId) {
        setSelectedCustomBoardRowId?.(focus.rowId);
      }

      if (focus.openPauseDetails && focus.rowId) {
        const rowSource = String(focus.boardViewId || "current") === "current"
          ? (selectedCustomBoard?.rows || [])
          : (boardView?.rows || []);
        const targetRow = rowSource.find((row) => String(row.id) === String(focus.rowId));
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
        message: error?.message || "No se pudo guardar el checklist de inspección.",
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
  const boardAlertMetrics = useMemo(() => {
    const alertBoard = isHistoricalCustomBoardView ? boardView : selectedCustomBoard;
    const alertRows = isHistoricalCustomBoardView
      ? (boardView?.rows || [])
      : visibleRows;

    const allRows = [];
    const delayedRows = [];
    const tooFastRows = [];
    const pausedRows = [];
    const runningRows = [];
    const finishedRows = [];

    alertRows.forEach((row) => {
      const sla = evaluateBoardRowSla(alertBoard, row, catalogMap, realtimeNow, pauseState, { inventoryMap: inventoryItemsById });
      allRows.push({ row, sla });
      if (sla.isDelayed) delayedRows.push({ row, sla });
      if (sla.isTooFast) tooFastRows.push({ row, sla });
      if (row.status === STATUS_PAUSED) pausedRows.push({ row, sla });
      if (row.status === STATUS_RUNNING) runningRows.push({ row, sla });
      if (row.status === STATUS_FINISHED) finishedRows.push({ row, sla });
    });

    delayedRows.sort((left, right) => (right.sla?.excessSeconds || 0) - (left.sla?.excessSeconds || 0));

    return {
      allRows,
      delayedCount: delayedRows.length,
      tooFastCount: tooFastRows.length,
      pausedCount: pausedRows.length,
      runningCount: runningRows.length,
      finishedCount: finishedRows.length,
      delayedRows,
      tooFastRows,
      pausedRows,
      runningRows,
      finishedRows,
    };
  }, [STATUS_PAUSED, STATUS_RUNNING, STATUS_FINISHED, boardView, catalogMap, inventoryItemsById, isHistoricalCustomBoardView, pauseState, realtimeNow, selectedCustomBoard, visibleRows]);

  const visibleBoardMetrics = useMemo(() => {
    const delayedRows = [];
    const tooFastRows = [];
    visibleRows.forEach((row) => {
      const sla = evaluateBoardRowSla(boardView, row, catalogMap, realtimeNow, pauseState, { inventoryMap: inventoryItemsById });
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

  function revealBoardRowOnScreen(rowId, options = {}) {
    if (!rowId) return;
    const delayMs = Number(options.delayMs || 320);
    globalThis.setTimeout(() => {
      const rowElement = document.querySelector(`[data-board-row-id="${rowId}"]`);
      if (rowElement) {
        rowElement.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, delayMs);
  }

  function configureBoardRowFocus(targetRow, options = {}) {
    if (!targetRow?.id || !selectedCustomBoard?.id) return null;
    const liveRow = (selectedCustomBoard?.rows || []).find((entry) => entry.id === targetRow.id) || null;
    const useLiveBoard = Boolean(liveRow) || !isHistoricalCustomBoardView;
    const alertBoard = useLiveBoard ? selectedCustomBoard : boardView;
    const resolvedRow = liveRow || targetRow;
    const meta = enrichBoardRowNavigationMeta(
      alertBoard,
      resolvedRow,
      useLiveBoard ? "" : selectedCustomBoardViewId,
    );

    setSelectedWeekdayFilter("all");
    if (useLiveBoard) {
      setSelectedCustomBoardViewId("current");
    }
    setSelectedCustomBoardRowId(resolvedRow.id);

    if (meta.cleaningSite && showCleaningNaveSelector && useLiveBoard && selectedCustomBoard?.id) {
      void updateBoardOperationalContext(selectedCustomBoard.id, meta.cleaningSite, "cleaningSite");
    }

    if (options.openPauseDetails) {
      globalThis.setTimeout(() => {
        const freshRow = (selectedCustomBoard?.rows || []).find((entry) => entry.id === resolvedRow.id) || resolvedRow;
        setPauseDetailsRow(freshRow);
      }, 360);
    }

    revealBoardRowOnScreen(resolvedRow.id, { delayMs: 380 });

    return {
      boardId: selectedCustomBoard.id,
      rowId: resolvedRow.id,
      operationalDate: meta.operationalDate,
      cleaningSite: meta.cleaningSite,
      boardViewId: useLiveBoard ? "current" : selectedCustomBoardViewId,
      revealRow: true,
      openPauseDetails: Boolean(options.openPauseDetails || resolvedRow.status === STATUS_PAUSED),
      useLiveBoard,
    };
  }

  function focusBoardRowAlert(row, options = {}) {
    if (!row?.id || !selectedCustomBoard?.id) return;
    const focusPayload = configureBoardRowFocus(row, options);
    if (!focusPayload) return;

    const alreadyOnLiveBoard = focusPayload.useLiveBoard
      && String(selectedCustomBoardId || "") === String(selectedCustomBoard.id)
      && String(selectedCustomBoardViewId || "current") === "current";

    if (alreadyOnLiveBoard) return;

    navigateToBoardFocus?.(focusPayload);
  }

  function handleRevisionInventoryLookupChange(board, row, field, nextValue) {
    if (!board?.id || !row?.id || !field) return;

    const clearedValue = nextValue === null || nextValue === undefined
      || (typeof nextValue === "string" && !nextValue.trim());
    if (clearedValue) {
      updateBoardRowValue(board.id, row.id, field, nextValue);
      return;
    }

    if (isPalletReviewBoard(board) && field.type === "inventoryLookup") {
      const matchedItem = resolveInventoryItemFromLookupValue(state.inventoryItems || [], nextValue);
      if (matchedItem && normalizeInventoryDomain(matchedItem.domain) === INVENTORY_DOMAIN_BASE) {
        const existingBoxes = Math.max(0, Number(matchedItem.boxesPerPallet || 0));
        const existingPieces = Math.max(0, Number(matchedItem.piecesPerBox || 0));
        const needsPackagingSetup = existingBoxes <= 0 || existingPieces <= 0;

        if (needsPackagingSetup) {
          setPalletPackagingModal({
            open: true,
            mode: "product-select",
            boardId: board.id,
            rowId: row.id,
            field,
            lookupValue: nextValue,
            itemId: matchedItem.id,
            itemCode: String(matchedItem.code || "").trim(),
            itemName: String(matchedItem.name || "").trim(),
            boxesPerPallet: existingBoxes > 0 ? String(existingBoxes) : "",
            piecesPerBox: existingPieces > 0 ? String(existingPieces) : "",
            submitting: false,
            error: "",
          });
          return;
        }
      }
    }

    updateBoardRowValue(board.id, row.id, field, nextValue);
  }

  function openPiecesPerBoxEditor(board, row, piecesField) {
    if (!board?.id || !row?.id || !piecesField || !isPalletReviewBoard(board)) return;

    const sourceFieldId = resolveInventoryPropertySourceFieldId(board?.fields || [], piecesField.sourceFieldId, piecesField.id);
    const lookupValue = row.values?.[sourceFieldId];
    const matchedItem = resolveInventoryItemFromLookupValue(state.inventoryItems || [], lookupValue);
    if (!matchedItem || normalizeInventoryDomain(matchedItem.domain) !== INVENTORY_DOMAIN_BASE) {
      setBoardRuntimeFeedback({ tone: "warning", message: "Selecciona primero un producto del inventario base." });
      return;
    }

    const existingBoxes = Math.max(0, Number(matchedItem.boxesPerPallet || 0));
    const existingPieces = Math.max(0, Number(matchedItem.piecesPerBox || 0));
    setPalletPackagingModal({
      open: true,
      mode: "pieces-edit",
      boardId: board.id,
      rowId: row.id,
      field: null,
      lookupValue: "",
      itemId: matchedItem.id,
      itemCode: String(matchedItem.code || "").trim(),
      itemName: String(matchedItem.name || "").trim(),
      boxesPerPallet: existingBoxes > 0 ? String(existingBoxes) : "",
      piecesPerBox: existingPieces > 0 ? String(existingPieces) : "",
      submitting: false,
      error: "",
    });
  }

  function closePalletPackagingModal() {
    if (palletPackagingModal.submitting) return;
    setPalletPackagingModal(EMPTY_PALLET_PACKAGING_MODAL);
  }

  async function confirmPalletPackagingModal() {
    if (palletPackagingModal.submitting) return;

    const piecesPerBox = Number(palletPackagingModal.piecesPerBox || 0);
    if (!Number.isFinite(piecesPerBox) || piecesPerBox <= 0) {
      setPalletPackagingModal((current) => ({
        ...current,
        error: "Indica cuántas piezas trae cada caja (mayor a 0).",
      }));
      return;
    }

    const boxesPerPallet = Number(palletPackagingModal.boxesPerPallet || 0);
    if (!Number.isFinite(boxesPerPallet) || boxesPerPallet <= 0) {
      setPalletPackagingModal((current) => ({
        ...current,
        error: "Indica cuántas cajas trae una tarima completa (mayor a 0).",
      }));
      return;
    }

    const {
      mode,
      boardId,
      rowId,
      field,
      lookupValue,
      itemId,
      itemCode,
      itemName,
    } = palletPackagingModal;
    if (!itemId) {
      setPalletPackagingModal(EMPTY_PALLET_PACKAGING_MODAL);
      return;
    }
    if (mode === "product-select" && (!boardId || !rowId || !field)) {
      setPalletPackagingModal(EMPTY_PALLET_PACKAGING_MODAL);
      return;
    }

    const productLabel = itemCode || itemName || "el producto";
    setPalletPackagingModal((current) => ({ ...current, submitting: true, error: "" }));

    try {
      const result = await requestJson(`/warehouse/inventory/${itemId}/packaging`, {
        method: "PATCH",
        body: JSON.stringify({ boxesPerPallet, piecesPerBox }),
      });
      applyRemoteWarehouseState(result?.data?.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setPalletPackagingModal(EMPTY_PALLET_PACKAGING_MODAL);
      if (mode === "product-select") {
        updateBoardRowValue(boardId, rowId, field, lookupValue);
      }
      setBoardRuntimeFeedback({
        tone: "success",
        message: mode === "pieces-edit"
          ? `Piezas por caja actualizadas para ${productLabel}.`
          : `Datos de empaque guardados para ${productLabel}.`,
      });
    } catch (error) {
      setPalletPackagingModal((current) => ({
        ...current,
        submitting: false,
        error: error?.message || "No se pudo guardar el empaque del producto.",
      }));
    }
  }

  function openOperationalAlertsModal(kind) {
    if (!kind) return;
    setOperationalAlertsModal(kind);
  }

  const operationalAlertsModalEntries = useMemo(() => {
    if (!operationalAlertsModal) return [];
    if (operationalAlertsModal === "rows") return boardAlertMetrics.allRows;
    if (operationalAlertsModal === "delayed") return boardAlertMetrics.delayedRows;
    if (operationalAlertsModal === "paused") return boardAlertMetrics.pausedRows;
    if (operationalAlertsModal === "running") return boardAlertMetrics.runningRows;
    if (operationalAlertsModal === "finished") return boardAlertMetrics.finishedRows;
    if (operationalAlertsModal === "fast") return boardAlertMetrics.tooFastRows;
    return [
      ...boardAlertMetrics.delayedRows,
      ...boardAlertMetrics.pausedRows.filter(({ row }) => !boardAlertMetrics.delayedRows.some((entry) => entry.row.id === row.id)),
      ...boardAlertMetrics.runningRows.filter(({ row }) => !boardAlertMetrics.delayedRows.some((entry) => entry.row.id === row.id)),
    ];
  }, [boardAlertMetrics, operationalAlertsModal]);

  const operationalAlertsModalTitle = (() => {
    if (operationalAlertsModal === "rows") return "Filas visibles del tablero";
    if (operationalAlertsModal === "delayed") return "Actividades con retraso";
    if (operationalAlertsModal === "paused") return "Actividades en pausa";
    if (operationalAlertsModal === "running") return "Actividades en curso";
    if (operationalAlertsModal === "finished") return "Actividades terminadas";
    if (operationalAlertsModal === "fast") return "Actividades muy rápidas";
    if (operationalAlertsModal === "all") return "Alertas operativas del tablero";
    return "";
  })();

  function getOperationalAlertModalDetail(row, sla) {
    if (sla?.isDelayed) {
      return `Retraso +${formatDurationClock(sla.excessSeconds)} (límite ${sla.limitMinutes} min)`;
    }
    if (row.status === STATUS_PAUSED) return "En pausa";
    if (row.status === STATUS_RUNNING) return "En curso";
    if (row.status === STATUS_FINISHED) {
      return sla?.durationSeconds
        ? `Terminada · ${formatDurationClock(sla.durationSeconds)}`
        : "Terminada";
    }
    if (sla?.isTooFast) {
      return `Muy rápida (${formatDurationClock(sla.durationSeconds)} / mín. ${formatDurationClock(sla.minDurationSeconds)})`;
    }
    return "Pendiente";
  }

  function getOperationalAlertModalChipTone(row, sla) {
    if (sla?.isDelayed) return "danger";
    if (row.status === STATUS_PAUSED) return "warning";
    if (row.status === STATUS_FINISHED) return "success";
    if (row.status === STATUS_RUNNING) return "primary";
    return "";
  }
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
            <StatTile label="Filas" value={visibleBoardMetrics.totalRows} className="custom-board-stat-tile" onClick={() => openOperationalAlertsModal("rows")} title="Ver detalle de filas visibles" />
            <StatTile label="En curso" value={boardAlertMetrics.runningCount} tone="soft" className="custom-board-stat-tile" onClick={() => openOperationalAlertsModal("running")} title="Ver actividades en curso" />
            <StatTile label="En pausa" value={boardAlertMetrics.pausedCount} tone={boardAlertMetrics.pausedCount > 0 ? "warning" : "soft"} className="custom-board-stat-tile" onClick={() => openOperationalAlertsModal("paused")} title="Ver actividades en pausa" />
            <StatTile label="Terminadas" value={visibleBoardMetrics.completed} tone="success" className="custom-board-stat-tile" onClick={() => openOperationalAlertsModal("finished")} title="Ver actividades terminadas" />
            {boardShowMetrics ? (
              <>
                <StatTile
                  label="Retrasos"
                  value={boardAlertMetrics.delayedCount}
                  tone={boardAlertMetrics.delayedCount > 0 ? "danger" : "soft"}
                  className="custom-board-stat-tile"
                  onClick={() => openOperationalAlertsModal("delayed")}
                  title="Ver actividades con retraso"
                />
                <StatTile
                  label="Muy rápidas"
                  value={boardAlertMetrics.tooFastCount}
                  tone={boardAlertMetrics.tooFastCount > 0 ? "soft" : "default"}
                  className="custom-board-stat-tile"
                  onClick={() => openOperationalAlertsModal("fast")}
                  title="Ver actividades muy rápidas"
                />
              </>
            ) : null}
          </div>

          <article className="surface-card full-width table-card admin-surface-card board-pdf-root" data-board-pdf-root="selected">
            <div className="card-header-row">
              <div>
                <h3>{boardView?.name || selectedCustomBoard.name}</h3>
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
                  <div className="board-day-actions-row">
                    <label className="board-top-select min-width board-day-select-inline">
                      <span>Día</span>
                      <select value={selectedWeekdayFilter} onChange={(event) => setSelectedWeekdayFilter(event.target.value)}>
                        {weekdayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <div className="custom-board-actions-menu-shell board-day-actions-inline" ref={customBoardActionsMenuRef}>
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
              </div>
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
              <table
                className={`admin-table-clean board-runtime-table${useBoardCardsView ? " board-cards-view" : ""}`}
                style={useBoardCardsView && boardCardsGridTemplate
                  ? { "--cleaning-grid-cols": boardCardsGridTemplate }
                  : undefined}
              >
                <thead className={useBoardCardsView ? "cleaning-cards-thead" : undefined}>
                  {useBoardCardsView ? (
                    <>
                    {showBoardCardSectionRow ? (
                    <tr className="cleaning-cards-section-row board-pdf-hide">
                      {boardCardLine.lineItems.map((lineItem, lineIndex) => {
                        const headerMeta = resolveBoardCardLineItemHeaderMeta(lineItem, visibleBoardColumns);
                        const lineWidth = boardCardLine.widths[lineIndex];
                        const lineKey = lineItem.kind === "slot"
                          ? `section-slot-${lineItem.slotId}`
                          : `section-col-${lineItem.column.token}`;
                        return (
                          <th
                            key={lineKey}
                            className="cleaning-slot-section-cell board-section-header-cell"
                            style={{
                              ...(lineWidth ? { minWidth: `${lineWidth}px`, width: `${lineWidth}px` } : {}),
                              backgroundColor: headerMeta.color,
                            }}
                            title={headerMeta.sectionName}
                          >
                            {headerMeta.sectionName}
                          </th>
                        );
                      })}
                    </tr>
                    ) : null}
                    <tr className="cleaning-cards-header-row">
                      {boardCardLine.lineItems.map((lineItem, lineIndex) => {
                        const headerMeta = resolveBoardCardLineItemHeaderMeta(lineItem, visibleBoardColumns);
                        const lineWidth = boardCardLine.widths[lineIndex];
                        const lineKey = lineItem.kind === "slot"
                          ? `head-slot-${lineItem.slotId}`
                          : `head-col-${lineItem.column.token}`;
                        const isSlotResizing = lineItem.kind === "slot" && cleaningSlotResizing.slotId === lineItem.slotId;
                        const isColumnResizing = lineItem.kind === "column" && columnResizing.columnToken === lineItem.column.token;
                        return (
                          <th
                            key={lineKey}
                            className={`cleaning-slot-header-cell${isSlotResizing || isColumnResizing ? " resizing" : ""}`}
                            style={{
                              ...(lineWidth ? { minWidth: `${lineWidth}px`, width: `${lineWidth}px` } : {}),
                              "--cleaning-slot-accent": headerMeta.color,
                            }}
                            title={headerMeta.description || headerMeta.label}
                          >
                            {headerMeta.label}
                            <div
                              className="board-column-resize-handle"
                              onMouseDown={(event) => {
                                if (lineItem.kind === "slot") {
                                  handleCleaningSlotResizeStart(event, lineItem.slotId);
                                  return;
                                }
                                handleColumnResizeStart(event, lineItem.column.token);
                              }}
                              style={{
                                position: "absolute",
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: "12px",
                                cursor: "col-resize",
                                touchAction: "none",
                                zIndex: 2,
                              }}
                            />
                          </th>
                        );
                      })}
                    </tr>
                    </>
                  ) : (
                    <>
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
                          className="board-column-resize-handle"
                          onMouseDown={(e) => handleColumnResizeStart(e, column.token)}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: "12px",
                            cursor: "col-resize",
                            touchAction: "none",
                            zIndex: 2,
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                    </>
                  )}
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
                      ? evaluateBoardRowSla(boardView, row, catalogMap, rowSlaReferenceNow, pauseState, { inventoryMap: inventoryItemsById })
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
                    const finishGateEnabled = !finishGateField
                      || isBoardFinishGateValueEnabled(row.values?.[finishGateField.id]);
                    const finishGateBlockedTitle = finishGateField
                      ? `Activa «${finishGateField.label}» para finalizar`
                      : "";
                    const canFinishRow = row.status === STATUS_RUNNING && !checklistPendingCompletion && finishGateEnabled;
                    const showFinishGateBlocked = row.status === STATUS_RUNNING && !checklistPendingCompletion && finishGateField && !finishGateEnabled;
                    const canOpenChecklistWhileRunning = row.status === STATUS_RUNNING && Boolean(resolveChecklistTemplateForActivity(getRowActivityLabel(row)));
                    const rowResponsibleIds = getBoardRowResponsibleIds(row);
                    const showGroupPlayerIcon = useBoardCardsView && rowResponsibleIds.length > 1;
                    const assigneeDisplayLabel = formatBoardRowAssigneeLabel(row, userMap, { useInitialsForMultiple: true, emptyLabel: "Asignar player(s)" });
                    const assigneeFullLabel = formatBoardRowAssigneeLabel(row, userMap, { emptyLabel: "Asignar player(s)" });
                    const assigneeMenuOpen = openAssigneeMenuRowId === row.id;
                    const renderedCells = visibleBoardColumns.map((column) => {
                        const __cellEl = (() => {
                          if (column.kind !== "field") {
                            if (column.id === "assignee") {
                              const primaryAssigneeUser = rowResponsibleIds.length
                                ? userMap.get(rowResponsibleIds[0])
                                : null;
                              const assigneeAvatarUrl = primaryAssigneeUser ? getCleaningBoardUserAvatarUrl(primaryAssigneeUser) : "";
                              const assigneeInitials = getCleaningBoardUserInitials(primaryAssigneeUser?.name || assigneeDisplayLabel);
                              return (
                                <td key={`${row.id}-${column.token}`} style={getEffectiveColumnWidth(column)}>
                                  <div className="board-assignee-select">
                                    <button
                                      ref={(element) => {
                                        if (element) assigneeTriggerByRowRef.current.set(row.id, element);
                                        else assigneeTriggerByRowRef.current.delete(row.id);
                                      }}
                                      type="button"
                                      onClick={(event) => handleAssigneeTriggerClick(row.id, rowAssigneeEditable, event)}
                                      disabled={!rowAssigneeEditable}
                                      title={assigneeFullLabel}
                                      className={`board-assignee-trigger${assigneeMenuOpen ? " is-open" : ""}${rowAssigneeEditable ? "" : " is-disabled"}${useBoardCardsView ? " has-cleaning-avatar" : ""}${showGroupPlayerIcon ? " is-group-players" : ""}`}
                                      data-assigned={rowResponsibleIds.length ? "1" : "0"}
                                    >
                                      {useBoardCardsView ? (
                                        <span className={`board-assignee-avatar${showGroupPlayerIcon ? " is-group-icon" : ""}`} aria-hidden="true">
                                          {showGroupPlayerIcon ? (
                                            <Users className="board-assignee-avatar-group-icon" strokeWidth={2.2} aria-hidden="true" />
                                          ) : (
                                            <>
                                              {assigneeAvatarUrl ? (
                                                <img
                                                  src={assigneeAvatarUrl}
                                                  alt=""
                                                  className="board-assignee-avatar-image"
                                                  onError={(event) => {
                                                    event.currentTarget.hidden = true;
                                                    const fallback = event.currentTarget.nextElementSibling;
                                                    if (fallback) fallback.hidden = false;
                                                  }}
                                                />
                                              ) : null}
                                              <span className="board-assignee-avatar-fallback" hidden={Boolean(assigneeAvatarUrl)}>{assigneeInitials}</span>
                                            </>
                                          )}
                                        </span>
                                      ) : null}
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
                                      <small className="subtle-line">
                                        SLA {rowSla.limitMinutes} min
                                        {rowSla.revisionTimeBasis === "perBox" && rowSla.boxesToReview > 0 && rowSla.minutesPerBox > 0
                                          ? ` · ${rowSla.boxesToReview} cajas × ${rowSla.minutesPerBox} min/caja`
                                          : ` · ${formatDurationClock(rowSla.durationSeconds)}`}
                                      </small>
                                    ) : null}
                                    {rowSla?.isDelayed && rowSla.revisionTimeBasis === "perBox" && rowSla.boxesToReview > 0 && rowSla.minutesPerBox > 0 ? (
                                      <small className="subtle-line">Objetivo: {rowSla.boxesToReview} cajas × {rowSla.minutesPerBox} min/caja</small>
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
                                  {showFinishGateBlocked ? (
                                    <button type="button" className="board-action-button finish icon-only" title={finishGateBlockedTitle} aria-label={finishGateBlockedTitle} disabled>
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
                          const savedSelectValue = String(row.values?.[field.id] || "").trim();
                          const baseSelectOptions = isBoardActivityListField && !weekdayAllowedBySystemSchedule
                            ? []
                            : buildSelectOptions(field, state, {
                              weekdayOffset: resolvedCatalogWeekdayOffset,
                              cleaningSite: effectiveCatalogCleaningSite,
                            });
                          const options = isBoardActivityListField
                            ? ensureSelectOptionsIncludeValue(baseSelectOptions, savedSelectValue)
                            : baseSelectOptions;

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
                                  onChange={(nextValue) => handleRevisionInventoryLookupChange(boardView, row, field, nextValue)}
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
                            if (isBoardFinishGateField(field)) {
                              const gateEnabled = isBoardFinishGateValueEnabled(row.values?.[field.id]);
                              const canToggleGate = canUserEditBoardFinishGate(currentUser, selectedCustomBoard, field, {
                                canManageDashboardState,
                              });
                              return (
                                <td key={field.id} style={columnStyle}>
                                  <BoardActivityFinishGateSwitch
                                    enabled={gateEnabled}
                                    disabled={!rowFieldEditable || !canToggleGate}
                                    label={field.label}
                                    compact={useBoardCardsView}
                                    onChange={(nextEnabled) => updateBoardRowValue(
                                      selectedCustomBoard.id,
                                      row.id,
                                      field,
                                      nextEnabled ? "Si" : "No",
                                    )}
                                  />
                                </td>
                              );
                            }
                            const groupedOptions = options.reduce((accumulator, option) => {
                              const groupName = option.group || "Opciones";
                              if (!accumulator[groupName]) accumulator[groupName] = [];
                              accumulator[groupName].push(option);
                              return accumulator;
                            }, {});
                            const isActivityField = isBoardActivityListField && activityListField?.id === field.id;
                            const activityHasValue = savedSelectValue !== "";
                            const disabled = !rowFieldEditable || (isActivityField && activityHasValue);
                            if (isActivityField && activityHasValue) {
                              return (
                                <td key={field.id} style={columnStyle}>
                                  <span style={style} title={field.helpText || field.label}>{savedSelectValue}</span>
                                </td>
                              );
                            }
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
                                    commitBoardTimeFieldDraft(row, field, event.currentTarget.value, {
                                      canOverrideRowOperations,
                                      isStartTimeField,
                                      isEndTimeField,
                                      isAutoManagedTimeField,
                                      rawTimeValue,
                                    });
                                  }}
                                  onBlur={(event) => {
                                    if (!timeFieldEditable) return;
                                    commitBoardTimeFieldDraft(row, field, event.currentTarget.value, {
                                      canOverrideRowOperations,
                                      isStartTimeField,
                                      isEndTimeField,
                                      isAutoManagedTimeField,
                                      rawTimeValue,
                                    });
                                  }}
                                  enterKeyHint="done"
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

                          if (field.type === "inventoryProperty" && field.inventoryProperty === "piecesPerBox" && isPalletReviewBoard(boardView)) {
                            const formattedValue = formatBoardCellObjectValue(value);
                            const displayValue = formattedValue === "" ? "—" : formattedValue;
                            const piecesEditTitle = rowFieldEditable
                              ? "Doble clic para actualizar piezas por caja en inventario"
                              : field.helpText || field.label;
                            return (
                              <td key={field.id} style={columnStyle}>
                                <span
                                  className={rowFieldEditable ? "board-pieces-per-box-cell" : undefined}
                                  style={style}
                                  title={piecesEditTitle}
                                  onDoubleClick={() => rowFieldEditable && openPiecesPerBoxEditor(boardView, row, field)}
                                >
                                  {displayValue}
                                </span>
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
                        })();
                        if (!useBoardCardsView || !__cellEl) return __cellEl;
                        const __role = resolveBoardCardCellRole(column, visibleBoardColumns);
                        const __label = column.kind === "field" ? String(column.field?.label || "") : String(column.label || "");
                        const __extraProps = { "data-col": __role, "data-label": __label };
                        if (__role === "player") {
                          __extraProps["data-assigned"] = rowResponsibleIds.length ? "1" : "0";
                        }
                        return cloneElement(__cellEl, __extraProps);
                    });
                    if (useBoardCardsView) {
                      const byRole = {};
                      const cellsByToken = {};
                      renderedCells.forEach((cell, cellIndex) => {
                        if (!cell) return;
                        const column = visibleBoardColumns[cellIndex];
                        if (column) cellsByToken[column.token] = cell;
                        const role = cell.props?.["data-col"];
                        if (!role || role === "field") return;
                        byRole[role] = cell;
                      });
                      const cardStatus = row.status || STATUS_PENDING;
                      const resolveBoardCardInfoDate = () => {
                        if (byRole.date) return byRole.date;
                        const rowOperationalDateKey = (() => {
                          if (boardDateField) {
                            const fieldDate = normalizeOperationalDateKey(row?.values?.[boardDateField.id]);
                            if (fieldDate) return fieldDate;
                          }
                          const timeIso = row?.endTime || row?.startTime || row?.createdAt;
                          if (!timeIso) return targetOperationalDateKey || "";
                          return getOperationalDateParts(new Date(timeIso).getTime(), operationalTimeZone).isoDate;
                        })();
                        const label = formatBoardOperationalDateLabel(rowOperationalDateKey);
                        return label ? <span className="cleaning-card-date-fallback">{label}</span> : null;
                      };
                      const cardInfoDate = resolveBoardCardInfoDate();
                      const boardCardSettings = boardView?.settings || {};
                      const showFooterTotalTime = shouldShowBoardCardFooterMetric(boardCardSettings, "totalTime", canAccessBoardBuilder) && byRole.totalTime;
                      const showFooterEfficiency = shouldShowBoardCardFooterMetric(boardCardSettings, "efficiency", canAccessBoardBuilder) && byRole.efficiency;
                      const renderCleaningSlot = (slotId, orderIndex) => {
                        if (slotId === "info") {
                          return (
                            <div className="cleaning-card-info cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              {byRole.activity ? <div className="cleaning-card-title">{byRole.activity}</div> : null}
                              {cardInfoDate ? <div className="cleaning-card-date">{cardInfoDate}</div> : null}
                            </div>
                          );
                        }
                        if (slotId === "player" && byRole.player) {
                          return <div className="cleaning-card-player cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>{byRole.player}</div>;
                        }
                        if (slotId === "timeline") {
                          return (
                            <div className="cleaning-card-timeline cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              <div className="tl-point tl-point--start">
                                <span className="tl-cap">Inicio</span>
                                <div className="tl-time">{byRole.start || "--:--"}</div>
                              </div>
                              <div className="tl-track" aria-hidden="true"><span className="tl-fill" /></div>
                              <div className="tl-point tl-point--end">
                                <span className="tl-cap">Fin</span>
                                <div className="tl-time">{byRole.end || "--:--"}</div>
                              </div>
                              {byRole.time ? <div className="tl-duration">{byRole.time}</div> : null}
                            </div>
                          );
                        }
                        if (slotId === "status" && byRole.status) {
                          return <div className="cleaning-card-status cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>{byRole.status}</div>;
                        }
                        if (slotId === "actions") {
                          if (!byRole.finishGate && !byRole.actions) return null;
                          return (
                            <div className="cleaning-card-actions cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              {byRole.finishGate ? <div className="cleaning-card-finish-gate">{byRole.finishGate}</div> : null}
                              {byRole.actions}
                            </div>
                          );
                        }
                        if (slotId === "lotExpiry") {
                          if (!byRole.lot && !byRole.expiry) return null;
                          return (
                            <div className="cleaning-card-lot-expiry cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              {byRole.lot ? <div className="cleaning-card-lot">{byRole.lot}</div> : null}
                              {byRole.expiry ? <div className="cleaning-card-expiry">{byRole.expiry}</div> : null}
                            </div>
                          );
                        }
                        if (slotId === "labelLab") {
                          if (!byRole.labelTag && !byRole.laboratory) return null;
                          return (
                            <div className="cleaning-card-label-lab cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              {byRole.labelTag ? <div className="cleaning-card-label-tag">{byRole.labelTag}</div> : null}
                              {byRole.laboratory ? <div className="cleaning-card-laboratory">{byRole.laboratory}</div> : null}
                            </div>
                          );
                        }
                        return null;
                      };
                      const renderLineColumnItem = (lineItem, orderIndex) => {
                        const column = lineItem.column;
                        const cell = cellsByToken[column.token];
                        if (!cell) return null;
                        const label = column.kind === "field"
                          ? String(column.field?.label || "")
                          : String(column.label || "");
                        return (
                          <div
                            className="cleaning-card-field-slot cleaning-card-slot"
                            data-slot="meta"
                            data-column-token={column.token}
                            style={{ order: orderIndex }}
                            key={`col-${column.token}`}
                          >
                            <div className="cleaning-field-inline" data-label={label}>
                              {cell}
                            </div>
                          </div>
                        );
                      };
                      const renderLineItem = (lineItem, orderIndex) => (
                        lineItem.kind === "slot"
                          ? renderCleaningSlot(lineItem.slotId, orderIndex)
                          : renderLineColumnItem(lineItem, orderIndex)
                      );
                      return (
                        <tr key={row.id} data-board-row-id={row.id} data-status={cardStatus} className={`cleaning-card-row${row.id === selectedCustomBoardRowId ? " is-row-selected" : ""}`}>
                          <td colSpan={visibleBoardColumns.length || 1} className="cleaning-card-host">
                            <div className="cleaning-card" data-status={cardStatus}>
                              <span className="cleaning-card-rail" aria-hidden="true" />
                              <div className="cleaning-card-scroll">
                                <div
                                  className="cleaning-card-body cleaning-card-body--single-line"
                                  style={boardCardLine.gridTemplateColumns
                                    ? { gridTemplateColumns: boardCardLine.gridTemplateColumns }
                                    : undefined}
                                >
                                  {boardCardLine.lineItems.map((lineItem, orderIndex) => renderLineItem(lineItem, orderIndex))}
                                </div>
                                {showFooterTotalTime || showFooterEfficiency ? (
                                  <div className="cleaning-card-meta">
                                    {showFooterTotalTime ? (
                                      <div className="cleaning-meta-chip" data-label={BOARD_AUX_COLUMN_DEFINITIONS.totalTime?.label || "Acumulado"}>
                                        {byRole.totalTime}
                                      </div>
                                    ) : null}
                                    {showFooterEfficiency ? (
                                      <div className="cleaning-meta-chip" data-label={BOARD_AUX_COLUMN_DEFINITIONS.efficiency?.label || "Eficiencia"}>
                                        {byRole.efficiency}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={row.id} data-board-row-id={row.id} data-status={row.status} className={row.id === selectedCustomBoardRowId ? "is-row-selected" : undefined}>
                        {renderedCells}
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
        open={Boolean(operationalAlertsModal)}
        title={operationalAlertsModalTitle}
        onClose={() => setOperationalAlertsModal("")}
        confirmLabel="Cerrar"
        hideCancel
      >
        {operationalAlertsModalEntries.length ? (
          <div className="board-operational-alerts-modal-list">
            {operationalAlertsModalEntries.map(({ row, sla }) => {
              const isPaused = row.status === STATUS_PAUSED;
              const chipTone = getOperationalAlertModalChipTone(row, sla);
              const detail = getOperationalAlertModalDetail(row, sla);
              return (
                <button
                  key={`${operationalAlertsModal}-${row.id}`}
                  type="button"
                  className={`chip ${chipTone} custom-board-sla-chip board-operational-alerts-modal-item`}
                  onClick={() => {
                    setOperationalAlertsModal("");
                    focusBoardRowAlert(row, { openPauseDetails: isPaused });
                  }}
                >
                  <strong>{sla.activityLabel || "Actividad"}</strong>
                  <span>{detail}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="subtle-line">No hay alertas en esta categoría.</p>
        )}
      </Modal>

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

      <Modal
        open={palletPackagingModal.open}
        title={palletPackagingModal.mode === "pieces-edit" ? "Actualizar piezas por caja" : "Definir empaque del producto"}
        className="pallet-packaging-modal"
        onClose={closePalletPackagingModal}
        onConfirm={confirmPalletPackagingModal}
        confirmLabel={palletPackagingModal.submitting
          ? "Guardando..."
          : palletPackagingModal.mode === "pieces-edit"
            ? "Guardar"
            : "Guardar y continuar"}
        cancelLabel="Cancelar"
        confirmDisabled={palletPackagingModal.submitting}
        disableBackdropClose={palletPackagingModal.submitting}
      >
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <p className="subtle-line" style={{ margin: 0 }}>
            {palletPackagingModal.itemCode
              ? `${palletPackagingModal.itemCode} · ${palletPackagingModal.itemName}`
              : palletPackagingModal.itemName || "Producto seleccionado"}
            {palletPackagingModal.mode === "pieces-edit"
              ? " — actualiza las piezas por caja si cambiaron para este lote o presentación."
              : " — este producto aún no tiene empaque completo en inventario. Define las piezas por caja y las cajas por tarima; solo se pedirá esta vez."}
          </p>
          <label className="app-modal-field">
            <span>Piezas por caja</span>
            <input
              type="number"
              min="1"
              step="1"
              autoFocus={palletPackagingModal.mode === "pieces-edit"}
              value={palletPackagingModal.piecesPerBox}
              onChange={(event) => setPalletPackagingModal((current) => ({
                ...current,
                piecesPerBox: event.target.value,
                error: "",
              }))}
              placeholder="Ej. 30"
              disabled={palletPackagingModal.submitting}
            />
          </label>
          <label className="app-modal-field">
            <span>Cajas por tarima completa</span>
            <input
              type="number"
              min="1"
              step="1"
              autoFocus={palletPackagingModal.mode !== "pieces-edit"}
              value={palletPackagingModal.boxesPerPallet}
              onChange={(event) => setPalletPackagingModal((current) => ({
                ...current,
                boxesPerPallet: event.target.value,
                error: "",
              }))}
              placeholder="Ej. 48"
              disabled={palletPackagingModal.submitting || (
                palletPackagingModal.mode === "pieces-edit" && Number(palletPackagingModal.boxesPerPallet || 0) > 0
              )}
            />
          </label>
          {palletPackagingModal.error ? (
            <p className="subtle-line" style={{ margin: 0, color: "var(--danger, #dc2626)" }}>{palletPackagingModal.error}</p>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}