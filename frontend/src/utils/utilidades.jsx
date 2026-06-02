/* eslint-disable */
import {
  STORAGE_KEY, SIDEBAR_COLLAPSED_KEY, ACTIVE_PAGE_KEY, DASHBOARD_SECTIONS_KEY, NOTIFICATION_READ_KEY, NOTIFICATION_DELETED_KEY, NOTIFICATION_INBOX_KEY, EMPTY_OBJECT, BOOTSTRAP_MASTER_ID, MASTER_USERNAME, API_BASE_URL, ENABLE_LEGACY_WHOLE_STATE_SYNC, PAGE_BOARD, PAGE_CUSTOM_BOARDS, PAGE_ADMIN, PAGE_DASHBOARD, PAGE_DASHBOARD_BUILDER, PAGE_HISTORY, PAGE_PROCESS_AUDITS, PAGE_INVENTORY, PAGE_TRANSPORT, PAGE_RETAIL, PAGE_USERS, PAGE_BIBLIOTECA, PAGE_INCIDENCIAS, PAGE_NOT_FOUND, PAGE_AREA_SHELL, PAGE_ROUTE_SLUGS, PAGE_ROUTE_ALIASES, EMPTY_LOGIN_DIRECTORY, ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR, STATUS_PENDING, STATUS_RUNNING, STATUS_PAUSED, STATUS_FINISHED, INVENTORY_DOMAIN_BASE, INVENTORY_DOMAIN_CLEANING, INVENTORY_DOMAIN_ORDERS, INVENTORY_DOMAIN_MAINTENANCE, INVENTORY_DOMAIN_DESTINATIONS, INVENTORY_MOVEMENT_RESTOCK, INVENTORY_MOVEMENT_CONSUME, INVENTORY_MOVEMENT_TRANSFER, CONTROL_STATUS_OPTIONS, USER_ROLES, PERMISSION_SCHEMA_VERSION, ROLE_LEVEL, TEMPORARY_PASSWORD_MIN_LENGTH, PROFILE_SELF_EDIT_LIMIT, DEFAULT_AREA_OPTIONS, DEFAULT_BOARD_SECTION_OPTIONS, INVENTORY_LOOKUP_LOGISTICS_FIELD, BOARD_ACTIVITY_LIST_FIELD, DEFAULT_JOB_TITLE_BY_ROLE, DASHBOARD_CHART_PALETTE, DEFAULT_DASHBOARD_SECTION_STATE, DEFAULT_ADMIN_TAB, ACTIVITY_FREQUENCY_OPTIONS, ACTIVITY_FREQUENCY_LABELS, ACTIVITY_FREQUENCY_DAY_OFFSETS, BOARD_FIELD_TYPES, BOARD_FIELD_TYPE_DETAILS, BOARD_FIELD_WIDTHS, COLOR_RULE_OPERATORS, BOARD_FIELD_WIDTH_STYLES, BOARD_FIELD_MIN_WIDTH_BY_TYPE, DEFAULT_BOARD_AUX_COLUMNS_ORDER, BOARD_AUX_COLUMN_DEFINITIONS, BOARD_AUX_COLUMN_IDS, BOARD_TEMPLATES, FORMULA_OPERATIONS, OPTION_SOURCE_TYPES, INVENTORY_PROPERTIES, INVENTORY_IMPORT_FIELD_ALIASES, INVENTORY_DOMAIN_OPTIONS, INVENTORY_MOVEMENT_OPTIONS, CLEANING_SITE_OPTIONS, DEFAULT_CLEANING_SITE, BOARD_OPERATIONAL_CONTEXT_NONE, BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE, BOARD_OPERATIONAL_CONTEXT_CUSTOM, BOARD_OPERATIONAL_CONTEXT_OPTIONS, NAV_ITEMS, ACTION_DEFINITIONS, BOARD_PERMISSION_ACTION_IDS, BOARD_PERMISSION_ACTIONS, PAGE_ACTION_GROUPS, PERMISSION_PRESETS, RESPONSIBLE_VISUALS, ALL_PAGES, ALL_ACTION_IDS, ROLE_PERMISSION_MATRIX, KPI_STYLES
} from "./constantes.js";
import { getExcelJsModule } from "./utilidadesImportExcel.js";
import {
  normalizeUserPermissionOverride,
  hasUserOverrideValues,
  normalizeDelegationGrants,
} from "./userDelegationGrants.js";
import {
  resolveCanDoAction,
  resolveCanAccessPage,
  canAccessAreaNavItem,
  canAccessAreaDashboardPage,
  canAccessAreaShellPage,
  canAccessGlobalDashboardPage,
  userHasAnyRetailAreaScope,
} from "./permissionResolver.js";

export { canAccessAreaNavItem, canAccessAreaDashboardPage, canAccessAreaShellPage, canAccessGlobalDashboardPage, userHasAnyRetailAreaScope };

// Convierte milisegundos a formato hh:mm:ss
export function formatElapsedMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function getInitialRouteState() {
  const pathSegments = globalThis.location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => String(segment || "").trim().toLowerCase());

  const params = new URLSearchParams(globalThis.location.search);
  let inferredArea = "all";
  let inferredPage = PAGE_DASHBOARD;
  let inferredTransportSection = "";

  if (pathSegments.length === 1) {
    inferredPage = PAGE_ROUTE_ALIASES[pathSegments[0]] || PAGE_DASHBOARD;
  } else if (pathSegments.length >= 2) {
    const [firstSegment, secondSegment] = pathSegments;
    if (PAGE_ROUTE_ALIASES[secondSegment]) {
      inferredArea = firstSegment;
      inferredPage = PAGE_ROUTE_ALIASES[secondSegment];
    } else if (firstSegment === PAGE_ROUTE_SLUGS[PAGE_TRANSPORT]) {
      inferredArea = firstSegment;
      inferredPage = PAGE_TRANSPORT;
      inferredTransportSection = secondSegment;
    } else {
      inferredPage = PAGE_ROUTE_ALIASES[firstSegment] || PAGE_DASHBOARD;
    }
  }

  const routePage = String(params.get("page") || "").trim();
  const routeArea = String(params.get("area") || inferredArea || "all").trim() || "all";

  return {
    page: PAGE_ROUTE_ALIASES[routePage] || inferredPage || PAGE_DASHBOARD,
    adminTab: normalizeAdminTab(params.get("tab") || DEFAULT_ADMIN_TAB),
    selectedBoardId: params.get("board") || "",
    selectedWeekId: params.get("week") || "",
    selectedHistoryWeekId: params.get("history") || "",
    area: routeArea,
    transportSection: String(params.get("transportSection") || inferredTransportSection || "").trim(),
  };
}


export function toBoardAuxColumnToken(auxId) {
  return `aux:${auxId}`;
}

export function isBoardAuxColumnToken(token) {
  return String(token || "").startsWith("aux:");
}

export function getBoardAuxColumnIdFromToken(token) {
  return isBoardAuxColumnToken(token) ? String(token).slice(4) : "";
}

export function getBoardFields(board) {
  if (Array.isArray(board?.fields)) return board.fields;
  if (Array.isArray(board?.columns)) return board.columns;
  return [];
}

export function getBoardVisibleAuxColumnIds(settings = {}, isOwner = false) {
  const visible = [];
  if (settings?.showWorkflow !== false) visible.push("status");
  if (settings?.showDates !== false) visible.push("time");
  if (isOwner || settings?.showTotalTime !== false) visible.push("totalTime");
  if (isOwner || settings?.showEfficiency !== false) visible.push("efficiency");
  if (settings?.showWorkflow !== false) visible.push("workflow");
  if (settings?.showAssignee !== false) visible.push("assignee");
  return visible;
}

export function getBoardAuxColumnOrder(settings = {}) {
  const configured = Array.isArray(settings?.auxColumnsOrder) && settings.auxColumnsOrder.length
    ? settings.auxColumnsOrder.filter((auxId) => BOARD_AUX_COLUMN_DEFINITIONS[auxId])
    : DEFAULT_BOARD_AUX_COLUMNS_ORDER.filter((auxId) => BOARD_AUX_COLUMN_DEFINITIONS[auxId]);
  return configured.concat(BOARD_AUX_COLUMN_IDS.filter((auxId) => !configured.includes(auxId)));
}

export function getNormalizedBoardColumnOrder(board) {
  const fields = getBoardFields(board);
  const settings = board?.settings ?? EMPTY_OBJECT;
  const fieldIds = fields.map((field) => field.id).filter(Boolean);
  const validFieldIds = new Set(fieldIds);
  const fallbackOrder = fieldIds.concat(getBoardAuxColumnOrder(settings).map((auxId) => toBoardAuxColumnToken(auxId)));
  const storedOrder = Array.isArray(settings?.columnOrder) ? settings.columnOrder : [];
  const normalizedStoredOrder = storedOrder.filter((token) => {
    if (isBoardAuxColumnToken(token)) {
      return BOARD_AUX_COLUMN_DEFINITIONS[getBoardAuxColumnIdFromToken(token)];
    }
    return validFieldIds.has(token);
  });
  return normalizedStoredOrder.concat(fallbackOrder.filter((token) => !normalizedStoredOrder.includes(token)));
}

export function sortBoardFieldsByColumnOrder(fields = [], columnOrder = []) {
  const safeColumnOrder = Array.isArray(columnOrder) ? columnOrder : [];
  const fieldOrder = safeColumnOrder.filter((token) => !isBoardAuxColumnToken(token));
  const indexByFieldId = new Map(fieldOrder.map((fieldId, index) => [fieldId, index]));
  return [...fields].sort((left, right) => {
    const leftIndex = indexByFieldId.get(left.id);
    const rightIndex = indexByFieldId.get(right.id);
    if (leftIndex === undefined && rightIndex === undefined) return 0;
    if (leftIndex === undefined) return 1;
    if (rightIndex === undefined) return -1;
    return leftIndex - rightIndex;
  });
}

export function syncBoardFieldOrderIntoColumnOrder(fields = [], settings = {}) {
  const normalizedOrder = getNormalizedBoardColumnOrder({ fields, settings });
  const fieldIds = fields.map((field) => field.id).filter(Boolean);
  let fieldCursor = 0;
  return normalizedOrder.map((token) => {
    if (isBoardAuxColumnToken(token)) return token;
    const nextFieldId = fieldIds[fieldCursor];
    fieldCursor += 1;
    return nextFieldId || token;
  });
}

export function reorderBoardColumnOrderTokens(sourceToken, targetToken, columnOrder = []) {
  if (!sourceToken || !targetToken || sourceToken === targetToken) return columnOrder;
  const nextOrder = [...columnOrder];
  const sourceIndex = nextOrder.indexOf(sourceToken);
  const targetIndex = nextOrder.indexOf(targetToken);
  if (sourceIndex === -1 || targetIndex === -1) return columnOrder;
  const [movedToken] = nextOrder.splice(sourceIndex, 1);
  nextOrder.splice(targetIndex, 0, movedToken);
  return nextOrder;
}

export function getOrderedBoardColumns(board, isOwner = false) {
  const fields = getBoardFields(board);
  const fieldMap = new Map(fields.map((field) => [field.id, field]));
  const visibleAuxIds = new Set(getBoardVisibleAuxColumnIds(board?.settings ?? EMPTY_OBJECT, isOwner));

  return getNormalizedBoardColumnOrder(board).flatMap((token) => {
    if (isBoardAuxColumnToken(token)) {
      const auxId = getBoardAuxColumnIdFromToken(token);
      if (!visibleAuxIds.has(auxId)) return [];
      const meta = BOARD_AUX_COLUMN_DEFINITIONS[auxId];
      if (!meta) return [];
      return [{
        token,
        kind: "aux",
        id: auxId,
        label: meta.label,
        sectionName: meta.sectionName,
        sectionColor: meta.sectionColor,
        defaultWidth: meta.defaultWidth,
        minWidth: meta.minWidth,
      }];
    }

    const field = fieldMap.get(token);
    if (!field) return [];
    return [{
      token,
      kind: "field",
      id: field.id,
      field,
      label: field.label,
      sectionName: field.groupName || "General",
      sectionColor: field.groupColor || "#e2f4ec",
    }];
  });
}


export function normalizeInventoryDomain(value) {
  const key = normalizeKey(value);
  if (["cleaning", "limpieza", "clean"].includes(key)) return INVENTORY_DOMAIN_CLEANING;
  if (["orders", "order", "pedidos", "pedido"].includes(key)) return INVENTORY_DOMAIN_ORDERS;
  if (["maintenance", "mantenimiento", "mantenimiento pedidos", "pedido mantenimiento"].includes(key)) return INVENTORY_DOMAIN_MAINTENANCE;
  return INVENTORY_DOMAIN_BASE;
}

const INVENTORY_SYSTEM_COLUMNS = Object.freeze([
  { id: "invcol-base-lote", domain: INVENTORY_DOMAIN_BASE, label: "Lote", key: "lote", createdAt: "1970-01-01T00:00:00.000Z", isSystem: true },
  { id: "invcol-base-caducidad", domain: INVENTORY_DOMAIN_BASE, label: "Caducidad", key: "caducidad", createdAt: "1970-01-01T00:00:00.000Z", isSystem: true },
  { id: "invcol-base-etiqueta", domain: INVENTORY_DOMAIN_BASE, label: "Etiqueta", key: "etiqueta", createdAt: "1970-01-01T00:00:00.000Z", isSystem: true },
]);

export function mergeInventoryColumnsWithSystem(columns = []) {
  const normalizedColumns = (Array.isArray(columns) ? columns : [])
    .map((entry) => ({
      id: String(entry?.id || `invcol-${Math.random().toString(36).slice(2, 10)}`).trim(),
      domain: normalizeInventoryDomain(entry?.domain),
      label: String(entry?.label || "").trim(),
      key: String(entry?.key || "").trim(),
      createdAt: entry?.createdAt || new Date().toISOString(),
      isSystem: Boolean(entry?.isSystem),
    }))
    .filter((entry) => entry.label && entry.key);

  const byDomainAndKey = new Map(normalizedColumns.map((entry) => [`${entry.domain}::${normalizeKey(entry.key)}`, entry]));
  const merged = [...normalizedColumns];

  INVENTORY_SYSTEM_COLUMNS.forEach((systemColumn) => {
    const domainKey = `${systemColumn.domain}::${normalizeKey(systemColumn.key)}`;
    const existing = byDomainAndKey.get(domainKey);
    if (existing) {
      const index = merged.findIndex((entry) => entry.id === existing.id);
      if (index >= 0) {
        merged[index] = {
          ...existing,
          label: systemColumn.label,
          key: systemColumn.key,
          domain: systemColumn.domain,
          isSystem: true,
        };
      }
      return;
    }
    merged.push({ ...systemColumn });
  });

  return merged;
}

export function inventoryDomainUsesPresentation(domain) {
  const normalized = normalizeInventoryDomain(domain);
  return normalized !== INVENTORY_DOMAIN_ORDERS && normalized !== INVENTORY_DOMAIN_MAINTENANCE;
}

export function inventoryDomainUsesPackagingMetrics(domain) {
  return normalizeInventoryDomain(domain) === INVENTORY_DOMAIN_BASE;
}

export function getInventoryPresentationLabel(domain) {
  return normalizeInventoryDomain(domain) === INVENTORY_DOMAIN_CLEANING ? "Formato / contenido" : "Presentación";
}

export function getInventoryPresentationPlaceholder(domain) {
  return normalizeInventoryDomain(domain) === INVENTORY_DOMAIN_CLEANING
    ? "Ej: Bidón 20 L · dilución 1:40"
    : "Ej: Caja master, paquete, rollo";
}

export function getInventoryUnitPlaceholder(domain) {
  const normalized = normalizeInventoryDomain(domain);
  if (normalized === INVENTORY_DOMAIN_CLEANING) {
    return "Ej: bidones, rollos, bolsas";
  }
  if (normalized === INVENTORY_DOMAIN_ORDERS || normalized === INVENTORY_DOMAIN_MAINTENANCE) {
    return "Ej: pzas, rollos, paquetes";
  }
  return "Ej: pzas, rollos";
}

export function getInventoryStoragePlaceholder(domain) {
  const normalized = normalizeInventoryDomain(domain);
  if (normalized === INVENTORY_DOMAIN_CLEANING) {
    return "Ej: Cuarto de limpieza · anaquel 2";
  }
  if (normalized === INVENTORY_DOMAIN_ORDERS || normalized === INVENTORY_DOMAIN_MAINTENANCE) {
    return "Ej: Nave 2 · rack de surtido";
  }
  return "Ej: Nave 2 · Estante 4";
}

export function getInventoryEntityLabel(domain) {
  const normalized = normalizeInventoryDomain(domain);
  if (normalized === INVENTORY_DOMAIN_CLEANING) return "insumo de limpieza";
  if (normalized === INVENTORY_DOMAIN_ORDERS) return "insumo para pedidos";
  if (normalized === INVENTORY_DOMAIN_MAINTENANCE) return "insumo de mantenimiento";
  return "producto";
}

export function normalizeCleaningSite(value, fallback = DEFAULT_CLEANING_SITE) {
  const key = normalizeKey(value).replaceAll(" ", "");
  if (key === "c1") return "C1";
  if (key === "c2") return "C2";
  if (["c3", "principal", "main", "default"].includes(key)) return "C3";
  if (["p", "patio", "ppatio", "p/patio", "patio/p"].includes(key)) return "P";
  return fallback;
}

export function normalizeBoardOperationalContextType(value) {
  const normalizedValue = normalizeKey(value).replaceAll(" ", "");
  if (["cleaningsite", "cleaning", "sedelimpieza"].includes(normalizedValue)) {
    return BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE;
  }
  if (["custom", "manual", "station", "estacion", "nave", "ubicacionoperativa"].includes(normalizedValue)) {
    return BOARD_OPERATIONAL_CONTEXT_CUSTOM;
  }
  return BOARD_OPERATIONAL_CONTEXT_NONE;
}

export function normalizeBoardOperationalContextOptions(value, contextType = BOARD_OPERATIONAL_CONTEXT_NONE) {
  if (contextType === BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE) {
    return CLEANING_SITE_OPTIONS.map((option) => option.value);
  }

  let sourceValues = [];
  if (Array.isArray(value)) {
    sourceValues = value;
  } else if (typeof value === "string") {
    sourceValues = value.split(/[;,]/);
  }
  const seen = new Set();

  return sourceValues
    .map((entry) => String(entry || "").trim())
    .filter((entry) => {
      const normalizedEntry = normalizeKey(entry);
      if (!normalizedEntry || seen.has(normalizedEntry)) return false;
      seen.add(normalizedEntry);
      return true;
    });
}

export function normalizeBoardOperationalContextLabel(value, contextType = BOARD_OPERATIONAL_CONTEXT_NONE) {
  let fallbackLabel = "";
  if (contextType === BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE) {
    fallbackLabel = "Sede de limpieza";
  } else if (contextType === BOARD_OPERATIONAL_CONTEXT_CUSTOM) {
    fallbackLabel = "Ubicación operativa";
  }
  return String(value || "").trim() || fallbackLabel;
}

export function normalizeBoardOperationalContextValue(value, contextType = BOARD_OPERATIONAL_CONTEXT_NONE, contextOptions = []) {
  if (contextType === BOARD_OPERATIONAL_CONTEXT_NONE) return "";
  if (contextType === BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE) {
    return normalizeCleaningSite(value, DEFAULT_CLEANING_SITE);
  }

  const trimmedValue = String(value || "").trim();
  if (!contextOptions.length) return trimmedValue;
  return contextOptions.includes(trimmedValue) ? trimmedValue : contextOptions[0] || "";
}

export function normalizeInventoryActivityConsumptions(value, fallbackActivityIds = [], fallbackConsumptionPerStart = 0) {
  const normalizedFallbackQuantity = Math.max(0, Number(fallbackConsumptionPerStart || 0));
  const consumptionMap = new Map();

  function rememberConsumption(rawCatalogActivityId, rawQuantity = 0) {
    const catalogActivityId = String(rawCatalogActivityId || "").trim();
    if (!catalogActivityId) return;

    const quantity = Math.max(0, Number(rawQuantity || 0));
    const currentEntry = consumptionMap.get(catalogActivityId);
    if (!currentEntry || quantity >= currentEntry.quantity) {
      consumptionMap.set(catalogActivityId, { catalogActivityId, quantity });
    }
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (entry && typeof entry === "object") {
        rememberConsumption(entry.catalogActivityId || entry.activityCatalogId || entry.id, entry.quantity);
        return;
      }
      rememberConsumption(entry, normalizedFallbackQuantity);
    });
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([catalogActivityId, quantity]) => rememberConsumption(catalogActivityId, quantity));
  } else if (typeof value === "string") {
    value.split(/[;,]/).forEach((entry) => {
      const trimmedEntry = String(entry || "").trim();
      if (!trimmedEntry) return;
      const [catalogActivityId, rawQuantity] = trimmedEntry.split(":");
      rememberConsumption(catalogActivityId, rawQuantity === undefined ? normalizedFallbackQuantity : rawQuantity);
    });
  }

  let fallbackActivityIdsList = [];
  if (Array.isArray(fallbackActivityIds)) {
    fallbackActivityIdsList = fallbackActivityIds;
  } else if (typeof fallbackActivityIds === "string") {
    fallbackActivityIdsList = fallbackActivityIds.split(/[;,]/).map((entry) => entry.trim()).filter(Boolean);
  }

  Array.from(new Set(fallbackActivityIdsList)).forEach((catalogActivityId) => {
    if (!consumptionMap.has(catalogActivityId)) {
      rememberConsumption(catalogActivityId, normalizedFallbackQuantity);
    }
  });

  return Array.from(consumptionMap.values());
}

export function normalizeInventoryMovementType(value) {
  const key = normalizeKey(value);
  if (["consume", "consumo", "usage", "uso"].includes(key)) return INVENTORY_MOVEMENT_CONSUME;
  if (["transfer", "transferencia", "traslado"].includes(key)) return INVENTORY_MOVEMENT_TRANSFER;
  return INVENTORY_MOVEMENT_RESTOCK;
}

export function buildInventoryTransferTargetKey(warehouse = "", storageLocation = "") {
  const normalizedWarehouse = normalizeKey(warehouse) || "sin-destino";
  const normalizedStorage = normalizeKey(storageLocation) || "sin-resguardo";
  return `${normalizedWarehouse}::${normalizedStorage}`;
}

export function normalizeInventoryTransferTargetRecord(target, fallbackUnitLabel = "pzas") {
  const warehouse = String(target?.warehouse || "").trim();
  const storageLocation = String(target?.storageLocation || "").trim();
  return {
    destinationKey: buildInventoryTransferTargetKey(warehouse, storageLocation),
    warehouse,
    storageLocation,
    recipientName: String(target?.recipientName || "").trim(),
    unitLabel: String(target?.unitLabel || fallbackUnitLabel || "pzas").trim() || "pzas",
    availableUnits: Math.max(0, Number(target?.availableUnits ?? target?.stockUnits ?? 0)),
    updatedAt: target?.updatedAt || target?.createdAt || "",
  };
}

export function resolveInventorySourceStockUnits(domain, rawStockUnits, transferTargets, stockTrackingMode) {
  if (domain !== INVENTORY_DOMAIN_ORDERS) {
    return rawStockUnits;
  }

  if (normalizeKey(stockTrackingMode) === "source") {
    return rawStockUnits;
  }

  return Math.max(0, rawStockUnits - sumInventoryTransferTargetUnits(transferTargets));
}

export function normalizeInventoryItemRecord(item) {
  const domain = normalizeInventoryDomain(item?.domain);
  const usesPresentation = inventoryDomainUsesPresentation(domain);
  const usesPackagingMetrics = inventoryDomainUsesPackagingMetrics(domain);
  const transferTargets = Array.isArray(item?.transferTargets)
    ? item.transferTargets
    : [];
  const normalizedTransferTargets = domain === INVENTORY_DOMAIN_ORDERS
    ? transferTargets.map((target) => normalizeInventoryTransferTargetRecord(target, item?.unitLabel || "pzas")).filter((target) => target.warehouse || target.storageLocation || target.availableUnits > 0)
    : [];
  const rawStockUnits = domain === INVENTORY_DOMAIN_BASE ? 0 : Math.max(0, Number(item?.stockUnits || 0));
  const fallbackConsumptionPerStart = Math.max(0, Number(item?.consumptionPerStart || 0));
  const activityConsumptions = domain === INVENTORY_DOMAIN_CLEANING
    ? normalizeInventoryActivityConsumptions(item?.activityConsumptions, item?.activityCatalogIds, fallbackConsumptionPerStart)
    : [];

  return {
    ...item,
    domain,
    presentation: usesPresentation ? String(item?.presentation || "").trim() : "",
    piecesPerBox: usesPackagingMetrics ? Number(item?.piecesPerBox || 0) : 0,
    boxesPerPallet: usesPackagingMetrics ? Number(item?.boxesPerPallet || 0) : 0,
    stockUnits: resolveInventorySourceStockUnits(domain, rawStockUnits, normalizedTransferTargets, item?.stockTrackingMode),
    minStockUnits: domain === INVENTORY_DOMAIN_BASE ? 0 : Math.max(0, Number(item?.minStockUnits || 0)),
    storageLocation: domain === INVENTORY_DOMAIN_BASE ? "" : String(item?.storageLocation || "").trim(),
    cleaningSite: domain === INVENTORY_DOMAIN_CLEANING ? normalizeCleaningSite(item?.cleaningSite) : "",
    unitLabel: String(item?.unitLabel || "pzas").trim() || "pzas",
    stockTrackingMode: domain === INVENTORY_DOMAIN_ORDERS ? "source" : "",
    transferTargets: normalizedTransferTargets,
    activityCatalogIds: activityConsumptions.map((entry) => entry.catalogActivityId),
    activityConsumptions,
    consumptionPerStart: domain === INVENTORY_DOMAIN_CLEANING ? fallbackConsumptionPerStart : 0,
  };
}

export function normalizeInventoryMovementRecord(movement) {
  const warehouse = String(movement?.warehouse || "").trim();
  const storageLocation = String(movement?.storageLocation || "").trim();
  const remainingUnits = movement?.remainingUnits;
  const destinationBalanceUnits = movement?.destinationBalanceUnits;
  const destinationKey = warehouse || storageLocation
    ? buildInventoryTransferTargetKey(warehouse, storageLocation)
    : String(movement?.destinationKey || "").trim() || buildInventoryTransferTargetKey(warehouse, storageLocation);
  return {
    ...movement,
    domain: normalizeInventoryDomain(movement?.domain),
    movementType: normalizeInventoryMovementType(movement?.movementType),
    quantity: Math.max(0, Number(movement?.quantity || 0)),
    warehouse,
    recipientName: String(movement?.recipientName || "").trim(),
    storageLocation,
    cleaningSite: normalizeInventoryDomain(movement?.domain) === INVENTORY_DOMAIN_CLEANING ? normalizeCleaningSite(movement?.cleaningSite) : "",
    unitLabel: String(movement?.unitLabel || "pzas").trim() || "pzas",
    remainingUnits: remainingUnits === undefined || remainingUnits === null || String(remainingUnits).trim() === "" ? null : Math.max(0, Number(remainingUnits || 0)),
    destinationBalanceUnits: destinationBalanceUnits === undefined || destinationBalanceUnits === null || String(destinationBalanceUnits).trim() === "" ? null : Math.max(0, Number(destinationBalanceUnits || 0)),
    destinationKey,
  };
}

export function findInventoryTransferTarget(item, warehouse = "", storageLocation = "") {
  const destinationKey = buildInventoryTransferTargetKey(warehouse, storageLocation);
  return (item?.transferTargets || []).find((target) => target.destinationKey === destinationKey) || null;
}

export function sumInventoryTransferTargetUnits(targets = []) {
  return (Array.isArray(targets) ? targets : []).reduce((sum, target) => sum + Math.max(0, Number(target?.availableUnits || 0)), 0);
}

export function hasInventoryBalanceInput(value) {
  return !(value === undefined || value === null || String(value).trim() === "");
}

export function getInventoryAllocatedUnits(item) {
  return sumInventoryTransferTargetUnits(item?.transferTargets || []);
}

export function getInventoryAvailableToTransfer(item, remainingUnits = null, destinationKey = "") {
  const normalizedItem = normalizeInventoryItemRecord(item);
  return Math.max(0, Number(normalizedItem.stockUnits || 0));
}

export function getComparableDateMs(value) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatInventoryTransferDestinationLabel(destination) {
  const parts = [destination?.warehouse || "Sin nave", destination?.storageLocation || "Sin resguardo"];
  if (destination?.recipientName) {
    parts.push(destination.recipientName);
  }
  return parts.join(" · ");
}

export function getInventorySavedStorageLocations(item, movements = []) {
  const locationMap = new Map();

  function rememberLocation(location, updatedAt = "") {
    const trimmedLocation = String(location || "").trim();
    if (!trimmedLocation) return;

    const locationKey = normalizeKey(trimmedLocation);
    const currentRecord = locationMap.get(locationKey);
    const nextRecord = { key: locationKey, label: trimmedLocation, updatedAt };
    if (!currentRecord || getComparableDateMs(updatedAt) >= getComparableDateMs(currentRecord.updatedAt)) {
      locationMap.set(locationKey, nextRecord);
    }
  }

  rememberLocation(item?.storageLocation);
  (movements || [])
    .filter((movement) => movement.itemId === item?.id)
    .forEach((movement) => rememberLocation(movement.storageLocation, movement.createdAt || movement.updatedAt || ""));

  return Array.from(locationMap.values()).sort((left, right) => {
    const byDate = getComparableDateMs(right.updatedAt) - getComparableDateMs(left.updatedAt);
    if (byDate !== 0) return byDate;
    return left.label.localeCompare(right.label, "es-MX");
  });
}

export function getInventorySavedTransferDestinations(item, movements = []) {
  const destinationMap = new Map();

  function rememberDestination(destination, updatedAt = "") {
    const normalizedDestination = normalizeInventoryTransferTargetRecord({
      ...destination,
      updatedAt: destination?.updatedAt || updatedAt,
    }, item?.unitLabel || "pzas");

    if (!normalizedDestination.warehouse && !normalizedDestination.storageLocation) {
      return;
    }

    const currentRecord = destinationMap.get(normalizedDestination.destinationKey);
    if (!currentRecord || getComparableDateMs(normalizedDestination.updatedAt) >= getComparableDateMs(currentRecord.updatedAt)) {
      destinationMap.set(normalizedDestination.destinationKey, normalizedDestination);
      return;
    }

    if (normalizedDestination.recipientName && !currentRecord.recipientName) {
      destinationMap.set(normalizedDestination.destinationKey, {
        ...currentRecord,
        recipientName: normalizedDestination.recipientName,
      });
    }
  }

  (item?.transferTargets || []).forEach((target) => rememberDestination(target, target?.updatedAt || ""));
  (movements || [])
    .filter((movement) => movement.itemId === item?.id && movement.movementType === INVENTORY_MOVEMENT_TRANSFER)
    .forEach((movement) => rememberDestination(movement, movement.createdAt || movement.updatedAt || ""));

  return Array.from(destinationMap.values()).sort((left, right) => {
    const byDate = getComparableDateMs(right.updatedAt) - getComparableDateMs(left.updatedAt);
    if (byDate !== 0) return byDate;
    return formatInventoryTransferDestinationLabel(left).localeCompare(formatInventoryTransferDestinationLabel(right), "es-MX");
  });
}

export function getInventoryDefaultTransferDestination(item, movements = []) {
  return getInventorySavedTransferDestinations(item, movements)[0] || null;
}

export function getInventoryDeleteActionId(domain) {
  if (domain === INVENTORY_DOMAIN_CLEANING) return "deleteCleaningInventory";
  if (domain === INVENTORY_DOMAIN_MAINTENANCE) return "deleteMaintenanceInventory";
  if (domain === INVENTORY_DOMAIN_ORDERS) return "deleteOrderInventory";
  return "deleteInventory";
}

export function getInventoryManageActionId(domain) {
  if (domain === INVENTORY_DOMAIN_CLEANING) return "manageCleaningInventory";
  if (domain === INVENTORY_DOMAIN_MAINTENANCE) return "manageMaintenanceInventory";
  if (domain === INVENTORY_DOMAIN_ORDERS) return "manageOrderInventory";
  return "manageInventory";
}

export function getInventoryImportActionId(domain) {
  if (domain === INVENTORY_DOMAIN_CLEANING) return "importCleaningInventory";
  if (domain === INVENTORY_DOMAIN_MAINTENANCE) return "importMaintenanceInventory";
  if (domain === INVENTORY_DOMAIN_ORDERS) return "importOrderInventory";
  return "importInventory";
}

export function getInventoryViewActionId(domain) {
  if (domain === INVENTORY_DOMAIN_CLEANING) return "viewCleaningInventory";
  if (domain === INVENTORY_DOMAIN_MAINTENANCE) return "viewMaintenanceInventory";
  if (domain === INVENTORY_DOMAIN_ORDERS) return "viewOrderInventory";
  return "viewBaseInventory";
}

export function createInventoryModalState(mode = "create", item = {}, fallbackDomain = INVENTORY_DOMAIN_BASE) {
  const normalized = normalizeInventoryItemRecord(item);
  return {
    open: false,
    mode,
    id: normalized.id || null,
    domain: normalized.domain || fallbackDomain,
    code: normalized.code || "",
    name: normalized.name || "",
    presentation: normalized.presentation || "",
    piecesPerBox: normalized.piecesPerBox ? String(normalized.piecesPerBox) : "",
    boxesPerPallet: normalized.boxesPerPallet ? String(normalized.boxesPerPallet) : "",
    stockUnits: normalized.stockUnits ? String(normalized.stockUnits) : "",
    minStockUnits: normalized.minStockUnits ? String(normalized.minStockUnits) : "",
    storageLocation: normalized.storageLocation || "",
    cleaningSite: normalized.cleaningSite || DEFAULT_CLEANING_SITE,
    unitLabel: normalized.unitLabel || "pzas",
    activityCatalogIds: normalized.activityCatalogIds || [],
    activityConsumptions: (normalized.activityConsumptions || []).map((entry) => ({
      catalogActivityId: entry.catalogActivityId,
      quantity: entry.quantity ? String(entry.quantity) : "",
    })),
    customFields: { ...(normalized.customFields || {}) },
    submitting: false,
  };
}

export function createInventoryMovementModalState(item = null, movementType = INVENTORY_MOVEMENT_RESTOCK, fallbackDomain = INVENTORY_DOMAIN_BASE, options = EMPTY_OBJECT) {
  const normalizedItem = item ? normalizeInventoryItemRecord(item) : null;
  const isTransferContext = normalizedItem?.domain === INVENTORY_DOMAIN_ORDERS || fallbackDomain === INVENTORY_DOMAIN_ORDERS || movementType === INVENTORY_MOVEMENT_TRANSFER;
  const defaultDestination = isTransferContext ? options.defaultDestination || null : null;
  return {
    open: false,
    itemId: normalizedItem?.id || null,
    itemCode: normalizedItem?.code || "",
    itemName: normalizedItem?.name || "",
    domain: normalizedItem?.domain || fallbackDomain,
    movementType,
    quantity: "",
    notes: "",
    warehouse: defaultDestination?.warehouse || "",
    recipientName: defaultDestination?.recipientName || "",
    storageLocation: isTransferContext ? defaultDestination?.storageLocation || "" : normalizedItem?.storageLocation || "",
    remainingUnits: "",
    transferTargetKey: defaultDestination?.destinationKey || "",
    unitLabel: normalizedItem?.unitLabel || "pzas",
    submitting: false,
    selectedTransferDestinationTab: "",
  };
}

export function createInventoryTransferConfirmModalState() {
  return {
    open: false,
    itemId: null,
    itemName: "",
    warehouse: "",
    storageLocation: "",
    recipientName: "",
    quantity: 0,
    unitLabel: "pzas",
    remainingUnits: "",
    lastKnownUnits: null,
    pendingPayload: null,
    draftMovementModal: null,
  };
}

export function createInventoryDestinationModalState(mode = "create", destination = {}) {
  return {
    open: false,
    mode,
    id: destination?.id || null,
    warehouse: destination?.warehouse || "",
    storageLocation: destination?.storageLocation || "",
    recipientName: destination?.recipientName || "",
    submitting: false,
  };
}

export function readNotificationReadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_READ_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readNotificationDeletedState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_DELETED_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readNotificationInboxState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_INBOX_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function formatNotificationTimestamp(value) {
  if (!value) return "Sin fecha";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(parsed));
}

export function createInventoryRestockModalState(domain = INVENTORY_DOMAIN_CLEANING, itemIds = []) {
  const safeItemIds = Array.isArray(itemIds) ? itemIds.filter(Boolean) : [];
  return {
    open: false,
    domain,
    itemIds: safeItemIds,
    quantities: Object.fromEntries(safeItemIds.map((itemId) => [itemId, ""])),
  };
}

export function inferFeedbackToneFromMessage(message) {
  const normalizedMessage = normalizeKey(message);
  if (!normalizedMessage) return "success";

  const successMarkers = [
    "agregado",
    "agregada",
    "actualizado",
    "actualizada",
    "eliminado",
    "eliminada",
    "duplicado",
    "duplicada",
    "guardado",
    "guardada",
    "limpiado",
    "limpiada",
    "creado",
    "creada",
    "exportado",
    "exportada",
    "descargado",
    "descargada",
    "correctamente",
  ];
  if (successMarkers.some((term) => normalizedMessage.includes(term))) {
    return "success";
  }

  const warningMarkers = [
    "completa",
    "define",
    "escribe",
    "selecciona",
    "agrega primero",
    "agrega al menos",
    "antes de guardar",
    "debe tener",
    "no se aplicaron",
  ];
  if (warningMarkers.some((term) => normalizedMessage.includes(term))) {
    return "warning";
  }

  const dangerMarkers = ["no se pudo", "error", "fallo", "inval", "obligatoria", "obligatorio"];
  if (dangerMarkers.some((term) => normalizedMessage.includes(term))) {
    return "danger";
  }

  return "success";
}


export function buildDefaultPermissions(extraRoles = []) {
  const knownRoles = new Set([...USER_ROLES, ...extraRoles]);
  const resolveRoles = (roles = []) => roles.filter((role) => knownRoles.has(role));

  return {
    version: PERMISSION_SCHEMA_VERSION,
    pages: Object.fromEntries(NAV_ITEMS.map((item) => [
      item.id,
      { roles: resolveRoles(item.roles || []), userIds: [], departments: [] },
    ])),
    actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => [
      item.id,
      { roles: resolveRoles(item.defaultRoles || []), userIds: [], departments: [] },
    ])),
  };
}

export function hasExplicitOverrideValues(override) {
  return hasUserOverrideValues(override);
}

export function remapPermissionsModel(permissions, users = []) {
  const defaults = buildDefaultPermissions();
  const knownUserIds = new Set((users || []).map((user) => user.id));
  const userById = new Map((users || []).map((user) => [user.id, user]));
  const nextOverrides = Object.fromEntries(Object.entries(permissions?.userOverrides ?? EMPTY_OBJECT)
    .filter(([userId]) => knownUserIds.has(userId))
    .filter(([userId]) => supportsManagedPermissionOverrides(userById.get(userId)?.role))
    .map(([userId, override]) => {
      const normalized = normalizeUserPermissionOverride({
        pages: Object.fromEntries(NAV_ITEMS.map((item) => [item.id, typeof override?.pages?.[item.id] === "boolean" ? override.pages[item.id] : null])),
        actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => [item.id, typeof override?.actions?.[item.id] === "boolean" ? override.actions[item.id] : null])),
        delegation: override?.delegation,
      });
      return [userId, {
        pages: Object.fromEntries(NAV_ITEMS.map((item) => [item.id, typeof normalized.pages?.[item.id] === "boolean" ? normalized.pages[item.id] : null])),
        actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => [item.id, typeof normalized.actions?.[item.id] === "boolean" ? normalized.actions[item.id] : null])),
        delegation: normalized.delegation,
      }];
    })
    .filter(([, override]) => hasUserOverrideValues(override)));

  return {
    version: PERMISSION_SCHEMA_VERSION,
    pages: Object.fromEntries(NAV_ITEMS.map((item) => [
      item.id,
      {
        roles: Array.isArray(permissions?.pages?.[item.id]?.roles) ? permissions.pages[item.id].roles : defaults.pages[item.id].roles,
        userIds: Array.isArray(permissions?.pages?.[item.id]?.userIds) ? permissions.pages[item.id].userIds.filter((userId) => knownUserIds.has(userId)) : [],
        departments: Array.isArray(permissions?.pages?.[item.id]?.departments) ? permissions.pages[item.id].departments.filter(Boolean) : [],
      },
    ])),
    actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => [
      item.id,
      {
        roles: Array.isArray(permissions?.actions?.[item.id]?.roles) ? permissions.actions[item.id].roles : defaults.actions[item.id].roles,
        userIds: Array.isArray(permissions?.actions?.[item.id]?.userIds) ? permissions.actions[item.id].userIds.filter((userId) => knownUserIds.has(userId)) : [],
        departments: Array.isArray(permissions?.actions?.[item.id]?.departments) ? permissions.actions[item.id].departments.filter(Boolean) : [],
      },
    ])),
    userOverrides: nextOverrides,
  };
}

export function normalizePermissionEntry(entry, fallbackRoles = []) {
  return {
    roles: Array.isArray(entry?.roles) ? entry.roles : fallbackRoles,
    userIds: Array.isArray(entry?.userIds) ? entry.userIds : [],
    departments: Array.isArray(entry?.departments) ? entry.departments : [],
  };
}

export function normalizePermissions(permissions) {
  const defaults = buildDefaultPermissions();
  return {
    pages: Object.fromEntries(NAV_ITEMS.map((item) => [
      item.id,
      normalizePermissionEntry(permissions?.pages?.[item.id], defaults.pages[item.id].roles),
    ])),
    actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => [
      item.id,
      normalizePermissionEntry(permissions?.actions?.[item.id], defaults.actions[item.id].roles),
    ])),
    userOverrides: Object.fromEntries(Object.entries(permissions?.userOverrides ?? EMPTY_OBJECT).map(([userId, override]) => {
      const normalized = normalizeUserPermissionOverride(override);
      return [userId, {
        pages: Object.fromEntries(NAV_ITEMS.map((item) => [item.id, typeof normalized.pages?.[item.id] === "boolean" ? normalized.pages[item.id] : null])),
        actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => [item.id, typeof normalized.actions?.[item.id] === "boolean" ? normalized.actions[item.id] : null])),
        delegation: normalized.delegation,
      }];
    })),
  };
}

export function buildBoardPermissions(basePermissions, board = null) {
  const visibility = getNormalizedBoardVisibility(board);
  const visibilityUserIds = visibility.visibilityType === "all"
    ? []
    : Array.from(new Set([visibility.ownerId, ...visibility.accessUserIds].filter(Boolean)));
  return {
    isEnabled: false,
    visibility: {
      roles: [],
      userIds: visibilityUserIds,
      departments: visibility.visibilityType === "department" ? visibility.sharedDepartments : [],
    },
    actions: Object.fromEntries(BOARD_PERMISSION_ACTIONS.map((item) => [
      item.id,
      normalizePermissionEntry(basePermissions?.actions?.[item.id], item.defaultRoles),
    ])),
  };
}

export function normalizeBoardPermissions(permissions, basePermissions, board = null) {
  const defaults = buildBoardPermissions(basePermissions, board);
  return {
    isEnabled: Boolean(permissions?.isEnabled),
    visibility: normalizePermissionEntry(permissions?.visibility, defaults.visibility.roles),
    actions: Object.fromEntries(BOARD_PERMISSION_ACTIONS.map((item) => [
      item.id,
      normalizePermissionEntry(permissions?.actions?.[item.id], defaults.actions[item.id].roles),
    ])),
  };
}

export function buildPermissionsFromPreset(presetId) {
  const permissions = buildDefaultPermissions();

  if (presetId === "supervised") {
    permissions.pages[PAGE_USERS].roles = [ROLE_LEAD, ROLE_SR];
    permissions.pages[PAGE_INVENTORY].roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.exportDashboardData.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR];
    permissions.actions.manageDashboardState.roles = [ROLE_LEAD];
    permissions.actions.accessNavEsto.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavTransporte.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavLimpieza.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavRegulatorio.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavCalidad.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavInventario.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavRecepcion.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavOperaciones.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavMayoreo.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavRetail.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavFullfilment.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavMejoraContinua.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavProduccion.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavRecursos.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavEquipo.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];

    permissions.actions.createCatalog.roles = [ROLE_LEAD];
    permissions.actions.editCatalog.roles = [ROLE_LEAD];
    permissions.actions.deleteCatalog.roles = [ROLE_LEAD];
    permissions.actions.manageWeeks.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.createUsers.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.editUsers.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.deleteUsers.roles = [ROLE_LEAD];
    permissions.actions.resetPasswords.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.manageInventory.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.deleteInventory.roles = [ROLE_LEAD];
    permissions.actions.importInventory.roles = [ROLE_LEAD];
    permissions.actions.manageCleaningInventory.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.deleteCleaningInventory.roles = [ROLE_LEAD];
    permissions.actions.importCleaningInventory.roles = [ROLE_LEAD];
    permissions.actions.manageOrderInventory.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.deleteOrderInventory.roles = [ROLE_LEAD];
    permissions.actions.importOrderInventory.roles = [ROLE_LEAD];
    permissions.actions.createBoard.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.editBoard.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.deleteBoard.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.saveTemplate.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.editTemplate.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.deleteTemplate.roles = [ROLE_LEAD];
    permissions.actions.duplicateBoard.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.duplicateBoardWithRows.roles = [ROLE_LEAD];
    permissions.actions.exportBoardExcel.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.previewBoardPdf.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.exportBoardPdf.roles = [ROLE_LEAD, ROLE_SR];
  }

  if (presetId === "readonly") {
    permissions.pages[PAGE_USERS].roles = [ROLE_LEAD];
    permissions.pages[PAGE_INVENTORY].roles = [ROLE_LEAD, ROLE_SR];

    Object.keys(permissions.actions).forEach((actionId) => {
      permissions.actions[actionId].roles = [];
    });

    Object.keys(permissions.actions).forEach((actionId) => {
      if (actionId.startsWith("accessNav") || actionId.startsWith("scope")) {
        permissions.actions[actionId].roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
      }
    });

    permissions.actions.previewBoardPdf.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.exportBoardExcel.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.exportBoardPdf.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.exportDashboardData.roles = [ROLE_LEAD, ROLE_SR];
    permissions.actions.accessNavEsto.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavTransporte.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavLimpieza.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavRegulatorio.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavCalidad.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavInventario.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavRecepcion.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavOperaciones.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavMayoreo.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavRetail.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavFullfilment.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavMejoraContinua.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavProduccion.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavRecursos.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.accessNavEquipo.roles = [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR];
    permissions.actions.managePermissions.roles = [ROLE_LEAD];
  }

  return permissions;
}

export function buildAuditEntry(currentUser, scope, message) {
  return {
    id: makeId("audit"),
    scope,
    message,
    userId: currentUser?.id || null,
    userName: currentUser?.name || "Sistema",
    createdAt: new Date().toISOString(),
  };
}

export function appendAuditLog(currentState, entry) {
  return {
    ...currentState,
    auditLog: [entry].concat(currentState.auditLog || []).slice(0, 120),
  };
}

export function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const SESSION_STORAGE_KEY = "copmec_sess";

let _onSessionExpiredGlobal = null;

export function setSessionExpiredHandler(handler) {
  _onSessionExpiredGlobal = handler;
}

export function clearSessionExpiredHandler() {
  _onSessionExpiredGlobal = null;
}

function shouldRetryInventoryRequestInDev(path, method) {
  if (!import.meta.env.DEV) return false;
  if (String(method || "GET").toUpperCase() !== "POST") return false;
  if (path === "/warehouse/inventory/columns") return true;
  return /^\/warehouse\/inventory\/[^/]+\/duplicate$/.test(String(path || ""));
}

function shouldRetryLoginOptionsInDev(path, method, status) {
  if (!import.meta.env.DEV) return false;
  if (String(method || "GET").toUpperCase() !== "GET") return false;
  if (path !== "/auth/login-options") return false;
  return status === 502 || status === 503 || status === 504 || status === 0;
}

function buildDevBackendUrl(path) {
  const protocol = globalThis.location?.protocol || "http:";
  const hostname = globalThis.location?.hostname || "localhost";
  return `${protocol}//${hostname}:4000/api${path}`;
}

function isTransientNetworkFetchError(error) {
  if (!error || error.status) return false;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("failed to fetch")
    || msg.includes("network")
    || msg.includes("load failed")
    || msg.includes("aborted");
}

function shouldRetryWarehouseGetInProd(path, method) {
  if (method !== "GET") return false;
  const normalized = String(path || "");
  return normalized === "/warehouse/state" || normalized === "/warehouse/meta";
}

export async function requestJson(path, options = {}) {
  const requestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? EMPTY_OBJECT),
    },
    ...options,
  };

  const requestMethod = String(requestInit.method || "GET").toUpperCase();
  let response;

  const performFetch = async () => {
    try {
      return await fetch(`${API_BASE_URL}${path}`, requestInit);
    } catch (error) {
      if (shouldRetryLoginOptionsInDev(path, requestMethod, 0)) {
        return fetch(buildDevBackendUrl(path), requestInit);
      }
      throw error;
    }
  };

  try {
    response = await performFetch();
  } catch (error) {
    if (shouldRetryWarehouseGetInProd(path, requestMethod) && isTransientNetworkFetchError(error)) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 1200));
      response = await performFetch();
    } else {
      throw error;
    }
  }

  if (response.status === 404 && shouldRetryInventoryRequestInDev(path, requestMethod)) {
    response = await fetch(buildDevBackendUrl(path), requestInit);
  }

  if (shouldRetryLoginOptionsInDev(path, requestMethod, response.status)) {
    response = await fetch(buildDevBackendUrl(path), requestInit);
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const error = new Error(errorPayload.message || `HTTP ${response.status}`);
    error.status = response.status;
    // Auto-logout on 401 when a handler is registered (user is logged in)
    if (response.status === 401 && _onSessionExpiredGlobal) {
      const handler = _onSessionExpiredGlobal;
      _onSessionExpiredGlobal = null; // prevent repeat triggers
      handler();
    }
    throw error;
  }

  return response.json();
}

export function isSessionRequiredError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.status === 401 || (error?.status === 400 && message.includes("sesi"));
}

const warehouseSyncHooks = {
  onApplied: null,
};

export function setWarehouseSyncHooks(hooks = {}) {
  if (typeof hooks.onApplied === "function") warehouseSyncHooks.onApplied = hooks.onApplied;
  else if (hooks.onApplied === null) warehouseSyncHooks.onApplied = null;
}

export function applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus) {
  skipNextSyncRef.current = true;
  const normalizedState = normalizeWarehouseState(remoteState);
  setState(normalizedState);
  setLoginDirectory(buildLoginDirectoryFromState(normalizedState));
  setSyncStatus("Sincronizado");
  warehouseSyncHooks.onApplied?.(normalizedState);
  return normalizedState;
}

export function createWarehouseEventSource() {
  return new EventSource(`${API_BASE_URL}/warehouse/events`, { withCredentials: true });
}

export function buildLoginDirectoryFromState(state) {
  return {
    system: {
      masterBootstrapEnabled: Boolean(state?.system?.masterBootstrapEnabled),
      masterUsername: null,
      showBootstrapMasterHint: false,
    },
    demoUsers: [],
  };
}

export function buildRouteQuery({ page, adminTab, selectedBoardId, selectedWeekId, selectedHistoryWeekId }) {
  const params = new URLSearchParams();
  if (adminTab && adminTab !== DEFAULT_ADMIN_TAB && page === PAGE_ADMIN) params.set("tab", adminTab);
  if (selectedBoardId && page === PAGE_CUSTOM_BOARDS) params.set("board", selectedBoardId);
  if (selectedHistoryWeekId && page === PAGE_HISTORY) params.set("history", selectedHistoryWeekId);
  return params.toString();
}

export function buildRoutePath(page, area = "all", subPath = "") {
  const pageSlug = PAGE_ROUTE_SLUGS[page] || PAGE_ROUTE_SLUGS[PAGE_DASHBOARD];
  const normalizedArea = String(area || "").trim().toLowerCase().replaceAll(/\s+/g, "-").replace(/(^-|-$)/g, "");
  const normalizedSubPath = String(subPath || "").trim().toLowerCase().replaceAll(/\s+/g, "-").replace(/(^-|-$)/g, "");

  if (!normalizedArea || normalizedArea === "all") {
    if (page === PAGE_TRANSPORT && normalizedSubPath) {
      return `/${pageSlug}/${normalizedSubPath}`;
    }
    if (page !== PAGE_DASHBOARD) {
      return `/${pageSlug}`;
    }
    return normalizedSubPath ? `/${normalizedSubPath}` : `/${pageSlug}`;
  }

  if (page === PAGE_TRANSPORT && normalizedSubPath) {
    return `/${normalizedArea}/${normalizedSubPath}`;
  }

  return normalizedSubPath
    ? `/${normalizedArea}/${pageSlug}/${normalizedSubPath}`
    : `/${normalizedArea}/${pageSlug}`;
}

export function normalizeAdminTab(value) {
  return value === "weeks" ? "weeks" : DEFAULT_ADMIN_TAB;
}

export function normalizeActivityFrequency(value) {
  const normalizedValue = String(value || "").trim();
  return ACTIVITY_FREQUENCY_LABELS[normalizedValue] ? normalizedValue : "weekly";
}

function normalizeWeekdayOffset(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.trunc(numeric);
  return rounded >= 0 && rounded <= 6 ? rounded : null;
}

export function normalizeCatalogScheduledDays(value, fallbackFrequency = "weekly") {
  const fromArray = Array.isArray(value)
    ? value.map((entry) => normalizeWeekdayOffset(entry)).filter((entry) => entry !== null)
    : [];
  const unique = [...new Set(fromArray)].sort((a, b) => a - b);
  if (unique.length) return unique;
  return [...(ACTIVITY_FREQUENCY_DAY_OFFSETS[normalizeActivityFrequency(fallbackFrequency)] || ACTIVITY_FREQUENCY_DAY_OFFSETS.weekly || [0])];
}

export function normalizeCatalogCleaningSites(value) {
  const validSites = new Set((CLEANING_SITE_OPTIONS || []).map((entry) => String(entry.value || "").trim()).filter(Boolean));
  const fromArray = Array.isArray(value)
    ? value
      .map((entry) => normalizeCleaningSite(entry, ""))
      .filter((entry) => validSites.has(entry))
    : [];
  return [...new Set(fromArray)];
}

export function normalizeCatalogArea(value, fallback = "General") {
  const normalizedValue = String(value || fallback || "General").trim();
  return normalizedValue || "General";
}

export function normalizeCatalogScheduledDaysBySite(value, fallbackDays = []) {
  const validSites = new Set((CLEANING_SITE_OPTIONS || []).map((entry) => String(entry.value || "").trim().toUpperCase()).filter(Boolean));
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalizedFallbackDays = normalizeCatalogScheduledDays(fallbackDays, "weekly");
  const entries = Object.entries(value)
    .map(([rawSite, rawDays]) => {
      const site = normalizeCleaningSite(rawSite, "");
      if (!validSites.has(site)) return null;
      const directDays = Array.isArray(rawDays)
        ? rawDays.map((entry) => normalizeWeekdayOffset(entry)).filter((entry) => entry !== null)
        : [];
      const uniqueDays = [...new Set(directDays)].sort((a, b) => a - b);
      return [site, uniqueDays.length ? uniqueDays : normalizedFallbackDays];
    })
    .filter(Boolean);
  return Object.fromEntries(entries);
}

export function getCatalogScheduledDaysForSite(item, cleaningSite = "") {
  const baseDays = normalizeCatalogScheduledDays(item?.scheduledDays, item?.frequency);
  const normalizedSite = normalizeCleaningSite(cleaningSite, "");
  if (!normalizedSite) return baseDays;
  const bySite = normalizeCatalogScheduledDaysBySite(item?.scheduledDaysBySite, baseDays);
  return bySite[normalizedSite] || baseDays;
}

export function getCurrentWeekdayOffset(now = new Date()) {
  const jsDay = now.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function isCatalogItemScheduledForDay(item, dayOffset, cleaningSite = "") {
  const normalizedDay = normalizeWeekdayOffset(dayOffset);
  if (normalizedDay === null) return true;
  const scheduledDays = getCatalogScheduledDaysForSite(item, cleaningSite);
  return scheduledDays.includes(normalizedDay);
}

export function isCatalogItemAvailableForCleaningSite(item, cleaningSite) {
  const normalizedSite = normalizeCleaningSite(cleaningSite, "");
  if (!normalizedSite) return true;
  const allowedSites = normalizeCatalogCleaningSites(item?.cleaningSites);
  if (!allowedSites.length) return true;
  return allowedSites.includes(normalizedSite);
}

export function getActivityFrequencyLabel(value) {
  return ACTIVITY_FREQUENCY_LABELS[normalizeActivityFrequency(value)] || ACTIVITY_FREQUENCY_LABELS.weekly;
}

export function normalizeCatalogItemRecord(item = {}) {
  const frequency = normalizeActivityFrequency(item.frequency);
  const scheduledDays = normalizeCatalogScheduledDays(item.scheduledDays, frequency);
  return {
    ...item,
    frequency,
    scheduledDays,
    scheduledDaysBySite: normalizeCatalogScheduledDaysBySite(item.scheduledDaysBySite, scheduledDays),
    cleaningSites: normalizeCatalogCleaningSites(item.cleaningSites),
    category: String(item.category || "General").trim() || "General",
    area: normalizeCatalogArea(item.area, item.category),
  };
}

export function buildWeekActivitiesFromCatalogItem(weekId, item, weekStart, responsibleId) {
  const fallbackOffsets = ACTIVITY_FREQUENCY_DAY_OFFSETS[normalizeActivityFrequency(item.frequency)] || ACTIVITY_FREQUENCY_DAY_OFFSETS.weekly;
  const baseDays = normalizeCatalogScheduledDays(item?.scheduledDays, item?.frequency);
  const cleaningSites = normalizeCatalogCleaningSites(item?.cleaningSites);
  const bySite = normalizeCatalogScheduledDaysBySite(item?.scheduledDaysBySite, baseDays);
  const offsets = cleaningSites.length
    ? [...new Set(cleaningSites.flatMap((site) => bySite[site] || baseDays))].sort((a, b) => a - b)
    : baseDays;
  const effectiveOffsets = offsets.length ? offsets : fallbackOffsets;
  return effectiveOffsets.map((dayOffset) => ({
    id: makeId("act"),
    weekId,
    catalogActivityId: item.id,
    responsibleId: responsibleId || null,
    status: STATUS_PENDING,
    activityDate: isoAt(addDays(weekStart, dayOffset), 8, 0),
    startTime: null,
    endTime: null,
    accumulatedSeconds: 0,
    lastResumedAt: null,
    customName: item.name,
  }));
}

export function isoAt(date, hours, minutes) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}

export function isStrongPassword(value) {
  const password = String(value || "");
  return password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function isTemporaryPassword(value) {
  return String(value || "").trim().length >= TEMPORARY_PASSWORD_MIN_LENGTH;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfWeek(date) {
  return addDays(startOfWeek(date), 6);
}

export function getBoardWeekStart(date) {
  return startOfWeek(date);
}

export function getBoardWeekEnd(date) {
  return addDays(getBoardWeekStart(date), 6);
}

export function formatBoardWeekKey(date) {
  const target = getBoardWeekStart(date);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

export function parseBoardWeekKey(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : getBoardWeekStart(parsed);
}

export function getBoardWeekLabel(value) {
  const weekStart = parseBoardWeekKey(value) || getBoardWeekStart(new Date(value || Date.now()));
  return `Semana ${formatDate(weekStart)} - ${formatDate(getBoardWeekEnd(weekStart))}`;
}

export function normalizeBoardWeeklyCycle(cycle, referenceDate = new Date()) {
  const weekStart = getBoardWeekStart(referenceDate);
  const activeWeekKey = String(cycle?.activeWeekKey || "").trim() || formatBoardWeekKey(weekStart);
  const parsedStart = parseBoardWeekKey(activeWeekKey) || weekStart;
  return {
    activeWeekKey: formatBoardWeekKey(parsedStart),
    activeWeekStartDate: cycle?.activeWeekStartDate || parsedStart.toISOString(),
    activeWeekEndDate: cycle?.activeWeekEndDate || getBoardWeekEnd(parsedStart).toISOString(),
    updatedAt: cycle?.updatedAt || new Date().toISOString(),
  };
}

export function withDefaultBoardSettings(settings) {
  const resolvedSettings = settings && typeof settings === "object" ? settings : undefined;
  const operationalContextType = normalizeBoardOperationalContextType(resolvedSettings?.operationalContextType);
  const operationalContextOptions = normalizeBoardOperationalContextOptions(resolvedSettings?.operationalContextOptions, operationalContextType);
  return {
    showWorkflow: true,
    showMetrics: true,
    showAssignee: true,
    showDates: true,
    showTotalTime: true,
    showEfficiency: true,
    ...resolvedSettings,
    ownerArea: normalizeBoardOwnerArea(resolvedSettings?.ownerArea),
    operationalContextType,
    operationalContextLabel: normalizeBoardOperationalContextLabel(resolvedSettings?.operationalContextLabel, operationalContextType),
    operationalContextOptions,
    operationalContextValue: normalizeBoardOperationalContextValue(resolvedSettings?.operationalContextValue, operationalContextType, operationalContextOptions),
  };
}

function normalizeBoardTimeFieldLabel(field) {
  return String(field?.label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function formatBoardRowClockTime(isoValue) {
  if (!isoValue) return "";
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return String(isoValue || "").trim();
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(parsed);
}

/** Alinea columnas hora inicio/fin del tablero con los ISO persistidos (evita desfases en historial). */
export function freezeBoardRowTimeFields(row, fields = []) {
  const cloned = cloneBoardRowSnapshot(row);
  const nextValues = { ...(cloned.values || {}) };
  (Array.isArray(fields) ? fields : []).forEach((field) => {
    if (field?.type !== "time") return;
    const label = normalizeBoardTimeFieldLabel(field);
    const isEndField = label.includes("fin") || label.includes("final") || label.includes("end");
    const isStartField = label.includes("inicio") || label.includes("start");
    if (isEndField && cloned.endTime) {
      nextValues[field.id] = formatBoardRowClockTime(cloned.endTime);
    }
    if (isStartField && cloned.startTime) {
      nextValues[field.id] = formatBoardRowClockTime(cloned.startTime);
    }
  });
  cloned.values = nextValues;
  return cloned;
}

export function resolveBoardRowHistoryTimeDisplay(row, field, rawValue) {
  if (field?.type !== "time") {
    return formatBoardPreviewValue(rawValue, field, {}, []);
  }
  const label = normalizeBoardTimeFieldLabel(field);
  const isEndField = label.includes("fin") || label.includes("final") || label.includes("end");
  const isStartField = label.includes("inicio") || label.includes("start");
  if (isEndField && row?.endTime) return formatBoardRowClockTime(row.endTime);
  if (isStartField && row?.startTime) return formatBoardRowClockTime(row.startTime);
  const trimmed = String(rawValue || "").trim();
  if (trimmed) return trimmed;
  return formatBoardPreviewValue(rawValue, field, {}, []);
}

export function cloneBoardRowSnapshot(row) {
  const responsibleIds = normalizeBoardResponsibleIds(row?.responsibleIds, row?.responsibleId);
  return {
    ...row,
    responsibleId: responsibleIds[0] || "",
    responsibleIds,
    values: { ...(row?.values ?? EMPTY_OBJECT) },
    // Preserve any UI-level computed or raw fields so history reflects the board "as seen"
    sourceFields: Array.isArray(row?.sourceFields) ? row.sourceFields : row?.sourceFields || undefined,
    rowValues: row?.rowValues ?? undefined,
    rawRecord: row?.rawRecord ?? undefined,
    rawRowValues: row?.rawRowValues ?? undefined,
  };
}

export function normalizeBoardHistorySnapshot(snapshot) {
  const weekKey = String(snapshot?.weekKey || "").trim() || formatBoardWeekKey(new Date(snapshot?.startDate || Date.now()));
  const weekStart = parseBoardWeekKey(weekKey) || getBoardWeekStart(new Date(snapshot?.startDate || Date.now()));
  const visibility = getNormalizedBoardVisibility(snapshot);
  return {
    id: snapshot?.id || makeId("boardhist"),
    boardId: String(snapshot?.boardId || "").trim(),
    boardName: String(snapshot?.boardName || snapshot?.name || "Tablero").trim() || "Tablero",
    description: String(snapshot?.description || "").trim(),
    createdById: snapshot?.createdById ?? snapshot?.ownerId ?? null,
    ownerId: visibility.ownerId || snapshot?.createdById || null,
    visibilityType: visibility.visibilityType,
    sharedDepartments: visibility.sharedDepartments,
    accessUserIds: visibility.accessUserIds,
    weekKey,
    weekName: String(snapshot?.weekName || "").trim() || getBoardWeekLabel(weekKey),
    startDate: snapshot?.startDate || weekStart.toISOString(),
    endDate: snapshot?.endDate || getBoardWeekEnd(weekStart).toISOString(),
    archivedAt: snapshot?.archivedAt || new Date().toISOString(),
    settings: withDefaultBoardSettings(snapshot?.settings),
    fields: Array.isArray(snapshot?.fields)
      ? snapshot.fields.map((field) => ({ ...field, colorRules: field.colorRules || [] }))
      : [],
    rows: Array.isArray(snapshot?.rows)
      ? snapshot.rows.map((row) => freezeBoardRowTimeFields(row, snapshot?.fields || []))
      : [],
  };
}

export function buildBoardHistorySnapshot(board, weekKey, archivedAt = new Date().toISOString()) {
  const weekStart = parseBoardWeekKey(weekKey) || getBoardWeekStart(new Date());
  return normalizeBoardHistorySnapshot({
    id: makeId("boardhist"),
    boardId: board.id,
    boardName: board.name,
    description: board.description || "",
    createdById: board.createdById,
    ownerId: board.ownerId,
    visibilityType: board.visibilityType,
    sharedDepartments: board.sharedDepartments || [],
    accessUserIds: board.accessUserIds || [],
    weekKey,
    weekName: getBoardWeekLabel(weekKey),
    startDate: weekStart.toISOString(),
    endDate: getBoardWeekEnd(weekStart).toISOString(),
    archivedAt,
    settings: { ...(board.settings ?? EMPTY_OBJECT) },
    fields: (board.fields || []).map((field) => ({ ...field, colorRules: field.colorRules || [] })),
    rows: (board.rows || []).map((row) => freezeBoardRowTimeFields(row, board.fields || [])),
  });
}

export function advanceBoardWeekKey(weekKey) {
  const current = parseBoardWeekKey(weekKey) || getBoardWeekStart(new Date());
  return formatBoardWeekKey(addDays(current, 7));
}

export function applyBoardWeeklyCutToState(state, referenceDate = new Date()) {
  const currentWeekStart = getBoardWeekStart(referenceDate);
  const currentWeekKey = formatBoardWeekKey(currentWeekStart);
  const normalizedCycle = normalizeBoardWeeklyCycle(state?.boardWeeklyCycle, referenceDate);
  let activeWeekKey = normalizedCycle.activeWeekKey;
  let nextBoards = (state?.controlBoards || []).map((board) => ({ ...board, rows: Array.isArray(board.rows) ? board.rows : [] }));
  let nextHistory = Array.isArray(state?.boardWeekHistory) ? [...state.boardWeekHistory] : [];
  let changed = false;

  const isBoardRowActive = (row) => {
    const status = String(row?.status || "").trim().toLowerCase();
    return status !== "terminado";
  };

  while (activeWeekKey < currentWeekKey) {
    const archivedAt = new Date().toISOString();
    const existingKeys = new Set(nextHistory.map((snapshot) => `${snapshot.boardId}|${snapshot.weekKey}`));
    nextBoards.forEach((board) => {
      const snapshotKey = `${board.id}|${activeWeekKey}`;
      if (existingKeys.has(snapshotKey)) return;
      nextHistory.push(buildBoardHistorySnapshot(board, activeWeekKey, archivedAt));
      existingKeys.add(snapshotKey);
      changed = true;
    });
    nextBoards = nextBoards.map((board) => ({
      ...board,
      rows: (board.rows || []).filter(isBoardRowActive),
    }));
    activeWeekKey = advanceBoardWeekKey(activeWeekKey);
  }

  const nextCycle = {
    activeWeekKey: currentWeekKey,
    activeWeekStartDate: currentWeekStart.toISOString(),
    activeWeekEndDate: getBoardWeekEnd(currentWeekStart).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!changed && normalizedCycle.activeWeekKey === nextCycle.activeWeekKey) {
    return { state, changed: false };
  }

  return {
    changed: true,
    state: {
      ...state,
      controlBoards: nextBoards,
      boardWeekHistory: nextHistory,
      boardWeeklyCycle: nextCycle,
    },
  };
}

export function startOfMonth(date) {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfMonth(date) {
  const next = startOfMonth(date);
  next.setMonth(next.getMonth() + 1, 0);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function startOfFortnight(date) {
  const next = new Date(date);
  next.setDate(next.getDate() <= 15 ? 1 : 16);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfFortnight(date) {
  const next = startOfFortnight(date);
  if (next.getDate() === 1) {
    next.setDate(15);
  } else {
    next.setMonth(next.getMonth() + 1, 0);
  }
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getDashboardPeriodTypeLabel(periodType) {
  if (periodType === "fortnight") return "Quincena";
  if (periodType === "month") return "Mes";
  return "Semana";
}

export function getDashboardPeriodRange(dateValue, periodType) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  if (periodType === "month") {
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }
  if (periodType === "fortnight") {
    return { start: startOfFortnight(date), end: endOfFortnight(date) };
  }
  return { start: startOfWeek(date), end: endOfWeek(date) };
}

export function getDashboardPeriodKey(dateValue, periodType) {
  const range = getDashboardPeriodRange(dateValue, periodType);
  if (!range) return "";
  return range.start.toISOString().slice(0, 10);
}

export function formatDateRangeCompact(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function formatDashboardPeriodLabel(periodKey, periodType) {
  if (!periodKey) return "Sin periodo";
  const range = getDashboardPeriodRange(periodKey, periodType);
  if (!range) return "Sin periodo";
  if (periodType === "month") {
    return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(range.start);
  }
  if (periodType === "fortnight") {
    const halfLabel = range.start.getDate() === 1 ? "1ra quincena" : "2da quincena";
    return `${halfLabel} · ${new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(range.start)}`;
  }
  return `Semana · ${formatDateRangeCompact(range.start, range.end)}`;
}

export function getDashboardFilterStartDate(dateValue) {
  if (!dateValue) return null;
  const next = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(next.getTime()) ? null : next;
}

export function getDashboardFilterEndDate(dateValue) {
  if (!dateValue) return null;
  const next = new Date(`${dateValue}T23:59:59.999`);
  return Number.isNaN(next.getTime()) ? null : next;
}

export function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return "-";
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function formatDurationClock(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0));
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${remainder}`;
}


// Formatea minutos a 'h:mm' (ejemplo: 420 -> '7:00 h')
export function formatMinutesToHourMinute(value) {
  if (!Number.isFinite(value)) return "0:00 h";
  const totalMinutes = Math.round(value);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")} h`;
}

export function formatMinutes(value) {
  if (!Number.isFinite(value)) return "0 min";
  return `${value.toFixed(1)} min`;
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

export function formatMetricNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(digits);
}

export function getAuditPeriodMs(period) {
  if (period === "7d") return 7 * 24 * 60 * 60 * 1000;
  if (period === "30d") return 30 * 24 * 60 * 60 * 1000;
  return null;
}

export function normalizeKey(value) {
  return (value || "")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildPlayerAccessBase(value, fallback = "player") {
  const normalized = normalizeKey(value)
    .replaceAll(/[^a-z0-9\s._-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(".")
    .replaceAll(/\.+/g, ".")
    .replaceAll(/^\.+|\.+$/g, "");

  return normalized || fallback;
}

export function buildUniquePlayerAccess(value, existingUsers = [], excludedUserId = null, fallback = "player") {
  const base = buildPlayerAccessBase(value, fallback);
  const usedValues = new Set(
    (existingUsers || [])
      .filter((user) => user?.id !== excludedUserId)
      .map((user) => normalizeKey(user?.email || user?.username || ""))
      .filter(Boolean),
  );

  let candidate = base;
  let suffix = 2;
  while (usedValues.has(normalizeKey(candidate))) {
    candidate = `${base}.${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function getIshikawaCategory(label) {
  const normalizedLabel = normalizeKey(label);

  if (!normalizedLabel) {
    return "Gestion";
  }

  if (["material", "insumo", "inventario", "stock", "surtido", "faltante", "abasto", "consumible", "refaccion"].some((keyword) => normalizedLabel.includes(keyword))) {
    return "Materiales";
  }

  if (["equipo", "maquina", "montacarga", "herramienta", "impresora", "sistema", "software", "tablet", "scanner", "mantenimiento"].some((keyword) => normalizedLabel.includes(keyword))) {
    return "Maquinaria y sistemas";
  }

  if (["operador", "player", "usuario", "personal", "ausencia", "turno", "capacitacion", "mano de obra", "responsable"].some((keyword) => normalizedLabel.includes(keyword))) {
    return "Mano de obra";
  }

  if (["proceso", "metodo", "flujo", "arranque", "espera", "autorizacion", "configuracion", "cambio", "prioridad", "planeacion"].some((keyword) => normalizedLabel.includes(keyword))) {
    return "Metodo";
  }

  if (["calidad", "medicion", "registro", "validacion", "conteo", "auditoria", "captura", "revision", "inspeccion"].some((keyword) => normalizedLabel.includes(keyword))) {
    return "Medicion y control";
  }

  if (["area", "ruta", "rampa", "trafico", "espacio", "seguridad", "limpieza", "ambiente", "entorno", "clima", "nave"].some((keyword) => normalizedLabel.includes(keyword))) {
    return "Entorno";
  }

  return "Gestion";
}

export function normalizeImportHeader(value) {
  return normalizeKey(value).replaceAll(/[^a-z0-9]/g, "");
}

export function normalizeMeridiemHour(hourValue, meridiem) {
  if (meridiem === "pm") {
    return hourValue === 12 ? 12 : hourValue + 12;
  }

  return hourValue === 12 ? 0 : hourValue;
}

export function normalizeTimeValue24h(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  const compact = raw.toLowerCase().replaceAll(/\s+/g, "").replaceAll(".", "");
  const ampmMatch = /^(\d{1,2}):(\d{2})(am|pm)$/.exec(compact);
  if (ampmMatch) {
    const hourValue = Number.parseInt(ampmMatch[1], 10);
    const minuteValue = Number.parseInt(ampmMatch[2], 10);
    if (Number.isFinite(hourValue) && Number.isFinite(minuteValue)) {
      const normalizedHour = normalizeMeridiemHour(hourValue, ampmMatch[3]);
      return `${String(Math.max(0, Math.min(23, normalizedHour))).padStart(2, "0")}:${String(Math.max(0, Math.min(59, minuteValue))).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(parsed);
  }

  return raw;
}

export function isEmptyRuleValue(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

export function parseComparableNumber(value) {
  if (isEmptyRuleValue(value)) return null;
  const parsed = Number(String(value).replaceAll(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseComparableDate(value) {
  if (isEmptyRuleValue(value)) return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function compareRuleValues(left, right) {
  const leftNumber = parseComparableNumber(left);
  const rightNumber = parseComparableNumber(right);
  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }

  const leftDate = parseComparableDate(left);
  const rightDate = parseComparableDate(right);
  if (leftDate !== null && rightDate !== null) {
    return leftDate - rightDate;
  }

  return normalizeKey(left).localeCompare(normalizeKey(right), "es", { numeric: true, sensitivity: "base" });
}

export function parseRuleValueList(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeKey(item))
    .filter(Boolean);
}

export function isTruthyRuleValue(value) {
  const normalized = normalizeKey(value);
  return ["si", "sí", "true", "1", "verdadero", "activo"].includes(normalized);
}

export function isFalsyRuleValue(value) {
  const normalized = normalizeKey(value);
  return ["no", "false", "0", "falso", "inactivo"].includes(normalized);
}

export function doesFieldColorRuleMatch(rule, value) {
  const normalizedValue = normalizeKey(value);
  const normalizedRuleValue = normalizeKey(rule.value);
  const valueList = parseRuleValueList(rule.value);

  switch (rule.operator) {
    case "isEmpty":
      return isEmptyRuleValue(value);
    case "isNotEmpty":
      return !isEmptyRuleValue(value);
    case "isTrue":
      return isTruthyRuleValue(value);
    case "isFalse":
      return isFalsyRuleValue(value);
    case "equals":
      return normalizedValue === normalizedRuleValue;
    case "notEquals":
      return normalizedValue !== normalizedRuleValue;
    case ">=":
      return compareRuleValues(value, rule.value) >= 0;
    case "<=":
      return compareRuleValues(value, rule.value) <= 0;
    case ">":
      return compareRuleValues(value, rule.value) > 0;
    case "<":
      return compareRuleValues(value, rule.value) < 0;
    case "contains":
      return normalizedValue.includes(normalizedRuleValue);
    case "notContains":
      return !normalizedValue.includes(normalizedRuleValue);
    case "startsWith":
      return normalizedValue.startsWith(normalizedRuleValue);
    case "endsWith":
      return normalizedValue.endsWith(normalizedRuleValue);
    case "inList":
      return valueList.includes(normalizedValue);
    case "notInList":
      return !valueList.includes(normalizedValue);
    default:
      return false;
  }
}

export function getFieldColorRule(field, value) {
  return (field.colorRules || []).find((rule) => doesFieldColorRuleMatch(rule, value)) || null;
}

export function formatInventoryLookupLabel(item) {
  if (!item) return "";
  return `${item.name} · ${item.presentation}`;
}

export function isInventoryLookupFieldType(type) {
  return ["inventoryLookup", "maintenanceInventoryLookup", INVENTORY_LOOKUP_LOGISTICS_FIELD].includes(type);
}

export function getInventoryLookupSourceFields(fields = [], excludedFieldIds = []) {
  const blockedIds = new Set((Array.isArray(excludedFieldIds) ? excludedFieldIds : [excludedFieldIds]).filter(Boolean));
  return (fields || []).filter((field) => field && isInventoryLookupFieldType(field.type) && !blockedIds.has(field.id));
}

export function resolveInventoryPropertySourceFieldId(fields = [], preferredSourceFieldId = "", excludedFieldIds = []) {
  const sourceFields = getInventoryLookupSourceFields(fields, excludedFieldIds);
  if (!sourceFields.length) return "";
  if (preferredSourceFieldId && sourceFields.some((field) => field.id === preferredSourceFieldId)) {
    return preferredSourceFieldId;
  }
  return sourceFields.at(-1)?.id || "";
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

export function resolveInventoryPropertyValue(item, property) {
  const normalizedItem = item && typeof item === "object" ? item : null;
  if (!normalizedItem) return "";

  if (Array.isArray(normalizedItem)) {
    const inventoryItems = normalizedItem.filter((entry) => entry && typeof entry === "object");
    if (!inventoryItems.length) return "";

    switch (property) {
      case "lot":
      case "expiry":
      case "label":
        return Array.from(new Set(inventoryItems.map((entry) => resolveInventoryPropertyValue(entry, property)).filter(Boolean))).join(" / ");
      case "family": {
        const families = Array.from(new Set(inventoryItems.map((entry) => String(entry.family || "").trim()).filter(Boolean)));
        return families.length === 1 ? families[0] : families.length > 1 ? "Mixto" : "";
      }
      case "price": {
        const prices = Array.from(new Set(inventoryItems.map((entry) => entry.price).filter((value) => value !== undefined && value !== null && String(value).trim() !== "")));
        return prices.length === 1 ? prices[0] : prices.length > 1 ? prices.join(" / ") : "";
      }
      case "cost": {
        return inventoryItems.reduce((sum, entry) => {
          const qty = Number(entry.quantity || 1);
          const unitCost = Number(entry.cost ?? (entry.price || 0));
          return sum + (Number.isFinite(qty) ? qty * unitCost : 0);
        }, 0);
      }
      default:
        return String(inventoryItems[0]?.[property] ?? "");
    }
  }

  const customFields = normalizedItem.customFields && typeof normalizedItem.customFields === "object"
    ? normalizedItem.customFields
    : EMPTY_OBJECT;
  const latestLotRecord = parseInventoryLotHistory(customFields.lotesCaducidades)[0] || null;

  switch (property) {
    case "lot":
      return customFields.lote ?? latestLotRecord?.lot ?? "";
    case "expiry":
      return customFields.caducidad ?? latestLotRecord?.expiry ?? "";
    case "label":
      return customFields.etiqueta ?? latestLotRecord?.etiqueta ?? latestLotRecord?.label ?? "";
    default:
      return normalizedItem?.[property] ?? "";
  }
}

export function getInventoryBundleEditableFields(fields, lookupFieldId) {
  return (fields || []).filter((field) => field.bundleParentId === lookupFieldId && field.bundleType === INVENTORY_LOOKUP_LOGISTICS_FIELD);
}

export function inferInventoryBundleFieldType(fields, column) {
  if (column?.type !== "inventoryLookup") return column?.type ?? "text";
  const editableFields = getInventoryBundleEditableFields(fields, column.id);
  const editableRoles = new Set(editableFields.map((field) => field.bundleRole));
  if (editableRoles.has("piecesPerBox") && editableRoles.has("boxesPerPallet")) {
    return INVENTORY_LOOKUP_LOGISTICS_FIELD;
  }
  return column.type || "text";
}

export function isBoardActivityListField(field) {
  return field?.type === BOARD_ACTIVITY_LIST_FIELD || (field?.type === "select" && field?.optionSource === "catalogByCategory");
}

export function getBoardFieldDisplayType(fields, column) {
  if (isBoardActivityListField(column)) return BOARD_ACTIVITY_LIST_FIELD;
  return inferInventoryBundleFieldType(fields, column);
}

export function buildInventoryBundleFields(draft, preservedLookupId = null) {
  const baseLabel = draft.fieldLabel.trim() || "Producto";
  const groupName = draft.groupName.trim() || "General";
  const colorRules = draft.colorValue
    ? [{ operator: draft.colorOperator, value: draft.colorValue, color: draft.colorBg, textColor: draft.colorText }]
    : [];
  const lookupId = preservedLookupId || makeId("fld");
  const lookupField = {
    id: lookupId,
    label: baseLabel,
    type: "inventoryLookup",
    optionSource: "manual",
    optionCatalogCategory: "",
    options: [],
    inventoryProperty: "code",
    sourceFieldId: null,
    formulaOperation: "add",
    formulaLeftFieldId: null,
    formulaRightFieldId: null,
    formulaTerms: [],
    helpText: draft.fieldHelp.trim() || "Busca el artículo y deja listos los campos de piezas por caja y cajas por tarima para captura manual.",
    placeholder: draft.placeholder.trim() || "Buscar por nombre o presentación",
    defaultValue: "",
    width: draft.fieldWidth,
    widthPx: draft.fieldWidthPx ? Number(draft.fieldWidthPx) : null,
    required: draft.isRequired === "true",
    groupName,
    groupColor: draft.groupColor,
    colorRules,
  };

  if (draft.fieldType !== INVENTORY_LOOKUP_LOGISTICS_FIELD) {
    return [lookupField];
  }

  return [
    lookupField,
    {
      id: makeId("fld"),
      label: `${baseLabel} · Piezas por caja`,
      type: "number",
      optionSource: "manual",
      optionCatalogCategory: "",
      options: [],
      inventoryProperty: "code",
      sourceFieldId: null,
      formulaOperation: "add",
      formulaLeftFieldId: null,
      formulaRightFieldId: null,
      formulaTerms: [],
      helpText: "Campo editable para capturar o ajustar cuántas piezas tiene cada caja.",
      placeholder: "Ej: 24",
      defaultValue: "",
      width: "sm",
      required: false,
      groupName,
      groupColor: draft.groupColor,
      colorRules: [],
      bundleParentId: lookupId,
      bundleType: INVENTORY_LOOKUP_LOGISTICS_FIELD,
      bundleRole: "piecesPerBox",
    },
    {
      id: makeId("fld"),
      label: `${baseLabel} · Cajas por tarima`,
      type: "number",
      optionSource: "manual",
      optionCatalogCategory: "",
      options: [],
      inventoryProperty: "code",
      sourceFieldId: null,
      formulaOperation: "add",
      formulaLeftFieldId: null,
      formulaRightFieldId: null,
      formulaTerms: [],
      helpText: "Campo editable para capturar o ajustar cuántas cajas caben por tarima.",
      placeholder: "Ej: 30",
      defaultValue: "",
      width: "sm",
      required: false,
      groupName,
      groupColor: draft.groupColor,
      colorRules: [],
      bundleParentId: lookupId,
      bundleType: INVENTORY_LOOKUP_LOGISTICS_FIELD,
      bundleRole: "boxesPerPallet",
    },
  ];
}

export function buildUpdatedDraftColumns(currentColumns, editingDraftColumnId, isBundleField, fieldsToInsert) {
  if (!editingDraftColumnId) {
    return currentColumns.concat(fieldsToInsert);
  }

  return currentColumns.flatMap((column) => {
    if (!isBundleField) {
      return column.id === editingDraftColumnId ? fieldsToInsert : [column];
    }

    const derivedIds = new Set(getInventoryBundleEditableFields(currentColumns, editingDraftColumnId).map((item) => item.id));
    if (column.id === editingDraftColumnId) return fieldsToInsert;
    if (derivedIds.has(column.id)) return [];
    return [column];
  });
}

export function findInventoryItemByQuery(items, query) {
  const normalizedQuery = normalizeKey(query);
  if (!normalizedQuery) return null;

  return (items || []).find((item) => {
    const code = normalizeKey(item.code);
    const name = normalizeKey(item.name);
    const combined = normalizeKey(`${item.code} ${item.name}`);
    return code === normalizedQuery || name === normalizedQuery || combined === normalizedQuery;
  }) || null;
}

export function createEmptyFieldDraft() {
  return {
    fieldLabel: "",
    fieldType: "text",
    optionSource: "manual",
    optionCatalogCategory: "",
    optionsText: "",
    inventoryProperty: "code",
    sourceFieldId: "",
    formulaOperation: "add",
    formulaLeftFieldId: "",
    formulaRightFieldId: "",
    formulaTerms: [
      { fieldId: "" },
      { operation: "add", fieldId: "" },
    ],
    colorOperator: ">=",
    colorValue: "",
    colorBg: "#dbeafe",
    colorText: "#1d4ed8",
    fieldHelp: "",
    placeholder: "",
    defaultValue: "",
    fieldWidth: "md",
    fieldWidthPx: "",
    isRequired: "false",
    groupName: "General",
    groupColor: "#e2f4ec",
  };
}

export function createEmptyBoardDraft() {
  return {
    name: "",
    description: "",
    ownerId: "",
    visibilityType: "users",
    sharedDepartments: [],
    accessUserIds: [],
    settings: {
      showWorkflow: true,
      showMetrics: true,
      showAssignee: true,
      showDates: true,
      auxColumnsOrder: [...DEFAULT_BOARD_AUX_COLUMNS_ORDER],
      columnOrder: [],
      auxColumnWidths: {},
      ownerArea: "",
      operationalContextType: BOARD_OPERATIONAL_CONTEXT_NONE,
      operationalContextLabel: "",
      operationalContextOptions: [],
      operationalContextValue: "",
    },
    columns: [],
    ...createEmptyFieldDraft(),
  };
}

export function cloneDraftColumns(fields) {
  return (fields || []).map((field) => ({
    ...field,
    options: Array.isArray(field.options) ? [...field.options] : [],
    formulaTerms: getNormalizedFormulaTerms(field?.formulaTerms, field).map((term) => ({ ...term })),
    colorRules: (field.colorRules || []).map((rule) => ({ ...rule })),
  }));
}

function normalizeFormulaTermEntry(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const fieldId = String(entry.fieldId || "").trim();
  if (!fieldId) return null;
  if (index === 0) return { fieldId };
  return {
    operation: String(entry.operation || "add").trim() || "add",
    fieldId,
  };
}

export function getNormalizedFormulaTerms(value, fallbackField = null) {
  const source = Array.isArray(value) ? value : [];
  const normalizedTerms = source
    .map((entry, index) => normalizeFormulaTermEntry(entry, index))
    .filter(Boolean);

  if (normalizedTerms.length) return normalizedTerms;

  const leftFieldId = String(fallbackField?.formulaLeftFieldId || "").trim();
  const rightFieldId = String(fallbackField?.formulaRightFieldId || "").trim();
  if (!leftFieldId && !rightFieldId) return [];

  const legacyTerms = [];
  if (leftFieldId) legacyTerms.push({ fieldId: leftFieldId });
  if (rightFieldId) {
    legacyTerms.push({
      operation: String(fallbackField?.formulaOperation || "add").trim() || "add",
      fieldId: rightFieldId,
    });
  }
  return legacyTerms;
}

function applyFormulaOperation(left, right, operation) {
  if (operation === "subtract") return left - right;
  if (operation === "multiply") return left * right;
  if (operation === "divide") return right === 0 ? 0 : left / right;
  if (operation === "average") return (left + right) / 2;
  if (operation === "min") return Math.min(left, right);
  if (operation === "max") return Math.max(left, right);
  if (operation === "percent") return right === 0 ? 0 : Math.round((left / right) * 10000) / 100;
  return left + right;
}

export function evaluateFormulaFieldValue(field, resolveFieldValue) {
  const formulaTerms = getNormalizedFormulaTerms(field?.formulaTerms, field);
  if (!formulaTerms.length || typeof resolveFieldValue !== "function") return 0;
  const firstValue = Number(resolveFieldValue(formulaTerms[0].fieldId));
  let result = Number.isFinite(firstValue) ? firstValue : 0;

  for (let index = 1; index < formulaTerms.length; index += 1) {
    const term = formulaTerms[index];
    const nextValue = Number(resolveFieldValue(term.fieldId));
    result = applyFormulaOperation(result, Number.isFinite(nextValue) ? nextValue : 0, term.operation);
  }

  return Number.isFinite(result) ? result : 0;
}

export function createBoardDraftFromBoard(board) {
  return {
    name: board?.name || "",
    description: board?.description || "",
    ownerId: board?.ownerId || "",
    visibilityType: normalizeBoardVisibilityType(board?.visibilityType),
    sharedDepartments: normalizeBoardSharedDepartments(board?.sharedDepartments),
    accessUserIds: [...(board?.accessUserIds || [])],
    settings: {
      ...withDefaultBoardSettings(board?.settings),
      auxColumnsOrder: [...DEFAULT_BOARD_AUX_COLUMNS_ORDER],
    },
    columns: cloneDraftColumns(board?.fields || []),
    ...createEmptyFieldDraft(),
  };
}

export function hasFieldDefaultValue(field) {
  return field.defaultValue !== undefined && field.defaultValue !== null && String(field.defaultValue).trim() !== "";
}

export function getFieldDefaultPreviewValue(field) {
  if (!hasFieldDefaultValue(field)) return undefined;
  if (["number", "currency", "percentage"].includes(field.type)) return Number(field.defaultValue || 0);
  if (field.type === "boolean") return String(field.defaultValue).toLowerCase() === "si" ? "Si" : field.defaultValue;
  return field.defaultValue;
}

export function getPreviewDateValue(variant) {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + variant);
  return nextDate.toISOString().slice(0, 10);
}

export function getDirectPreviewSeedValue(fieldType, currentUserId, variant) {
  const directPreviewValueByType = {
    status: variant === 0 ? STATUS_PENDING : STATUS_RUNNING,
    date: getPreviewDateValue(variant),
    time: variant === 0 ? "08:00" : "09:30",
    boolean: variant === 0 ? "Si" : "No",
    user: currentUserId || "",
  };
  return Object.hasOwn(directPreviewValueByType, fieldType) ? directPreviewValueByType[fieldType] : undefined;
}

export function getTextPreviewSeedValue(field, variant) {
  if (field.type === "textarea") {
    return variant === 0 ? (field.placeholder || "Notas rápidas de ejemplo") : "Seguimiento validado en vista previa";
  }
  if (["text", "email", "phone", "url"].includes(field.type)) {
    return variant === 0 ? (field.placeholder || field.label || "Dato") : `${field.label || "Dato"} 2`;
  }
  return undefined;
}

export function getTypedPreviewSeedValue(field, currentUserId, sampleInventory, variant) {
  if (isBoardActivityListField(field)) return variant === 0 ? "Actividad 1" : "Actividad 2";
  if (isInventoryLookupFieldType(field.type)) return sampleInventory?.id || "preview-inventory";
  if (field.type === "multiSelectDetail") {
    const firstOption = field.options?.[0] || "Opción 1";
    const secondOption = field.options?.[1] || field.options?.[0] || "Opción 2";
    if (variant === 0) {
      return [{ option: firstOption, label: firstOption, detail: "3" }];
    }
    return [
      { option: firstOption, label: firstOption, detail: "2" },
      { option: secondOption, label: secondOption, detail: "1" },
    ];
  }
  if (field.type === "evidenceGallery") {
    return [
      {
        url: "https://placehold.co/640x480/png",
        thumbnailUrl: "https://placehold.co/320x240/png",
        mimeType: "image/png",
        name: variant === 0 ? "evidencia-1.png" : "evidencia-2.png",
      },
    ];
  }

  if (["number", "currency", "percentage"].includes(field.type)) {
    return variant === 0 ? 12 : 18;
  }
  if (field.type === "select") {
    return field.options?.[variant] || field.options?.[0] || "Opción";
  }

  const directPreviewValue = getDirectPreviewSeedValue(field.type, currentUserId, variant);
  if (directPreviewValue !== undefined) return directPreviewValue;

  const textPreviewValue = getTextPreviewSeedValue(field, variant);
  if (textPreviewValue !== undefined) return textPreviewValue;

  return field.placeholder || field.label || "Dato";
}

export function getPreviewFieldSeedValue(field, currentUserId, sampleInventory, variant = 0) {
  const defaultValue = getFieldDefaultPreviewValue(field);
  if (defaultValue !== undefined) return defaultValue;
  return getTypedPreviewSeedValue(field, currentUserId, sampleInventory, variant);
}

export function buildPreviewRowValues(fields, currentUserId, inventoryItems, variant = 0) {
  const sampleInventory = (inventoryItems || [])[variant] || (inventoryItems || [])[0] || null;
  const values = {};

  fields.forEach((field) => {
    if (field.type === "inventoryProperty" || field.type === "formula") return;
    values[field.id] = getPreviewFieldSeedValue(field, currentUserId, sampleInventory, variant);
  });

  fields.forEach((field) => {
    if (field.type !== "inventoryProperty") return;
    const resolvedSourceFieldId = resolveInventoryPropertySourceFieldId(fields, field.sourceFieldId, field.id);
    const lookupId = values[resolvedSourceFieldId];
    const selectedInventory = (inventoryItems || []).find((item) => item.id === lookupId) || sampleInventory;
    values[field.id] = resolveInventoryPropertyValue(selectedInventory, field.inventoryProperty) || "Auto";
  });

  fields.forEach((field) => {
    if (field.type !== "formula") return;
    values[field.id] = evaluateFormulaFieldValue(field, (fieldId) => values[fieldId]);
  });

  return values;
}

export function buildBoardPreviewModel(baseBoard, currentUserId, inventoryItems) {
  const fields = cloneDraftColumns(baseBoard?.fields || []);
  const previewRows = fields.length
    ? [0, 1].map((variant) => ({
        id: `preview-row-${variant + 1}`,
        values: buildPreviewRowValues(fields, currentUserId, inventoryItems, variant),
        responsibleId: baseBoard?.ownerId || currentUserId || "",
        status: variant === 0 ? STATUS_PENDING : STATUS_RUNNING,
        startTime: null,
        endTime: null,
        accumulatedSeconds: variant === 0 ? 0 : 18 * 60,
        lastResumedAt: null,
        createdAt: new Date().toISOString(),
      }))
    : [];

  return {
    id: baseBoard?.id || "preview-board",
    name: baseBoard?.name || "Nuevo tablero",
    description: baseBoard?.description || "La vista previa se actualiza en tiempo real conforme agregas o ajustas componentes.",
    createdById: currentUserId || null,
    ownerId: baseBoard?.ownerId || currentUserId || "",
    visibilityType: normalizeBoardVisibilityType(baseBoard?.visibilityType),
    sharedDepartments: normalizeBoardSharedDepartments(baseBoard?.sharedDepartments),
    accessUserIds: [...(baseBoard?.accessUserIds || [])],
    settings: {
      ...withDefaultBoardSettings(baseBoard?.settings),
      auxColumnsOrder: [...DEFAULT_BOARD_AUX_COLUMNS_ORDER],
    },
    fields,
    rows: previewRows,
  };
}

export function buildDraftPreviewBoard(draft, currentUserId, inventoryItems) {
  return buildBoardPreviewModel({
    name: draft?.name,
    description: draft?.description,
    ownerId: draft?.ownerId,
    visibilityType: draft?.visibilityType,
    sharedDepartments: draft?.sharedDepartments,
    accessUserIds: draft?.accessUserIds,
    settings: draft?.settings,
    fields: draft?.columns,
  }, currentUserId, inventoryItems);
}

export function buildTemplatePreviewBoard(template, currentUserId, inventoryItems) {
  const fields = cloneBoardFields(getTemplateFields(template)).fields;
  return buildBoardPreviewModel({
    name: template?.name,
    description: template?.description,
    ownerId: currentUserId,
    settings: template?.settings,
    fields,
  }, currentUserId, inventoryItems);
}

export function getTypedBoardPreviewValue(value, field, userMap, inventoryItems) {
  if (isInventoryLookupFieldType(field.type)) {
    const inventoryItem = (inventoryItems || []).find((item) => item.id === value);
    return inventoryItem ? `${inventoryItem.name} · ${inventoryItem.presentation}` : "Producto vinculado";
  }
  if (field.type === "multiSelectDetail") {
    return formatBoardMultiSelectDetailValue(value) || "Sin selección";
  }
  if (field.type === "evidenceGallery") {
    const evidences = normalizeBoardEvidenceValue(value);
    return evidences.length ? `${evidences.length} evidencia(s)` : "Sin evidencia";
  }

  switch (field.type) {
    case "user":
      return userMap.get(value)?.name || "Player";
    case "date":
      return value ? formatDate(value) : null;
    case "currency":
      return value ? `$${Number(value).toFixed(2)}` : "$0.00";
    case "percentage":
      return value ? `${Number(value)}%` : "0%";
    case "boolean":
      return value === "Si" ? "Sí" : "No";
    default:
      return null;
  }
}

export function formatBoardPreviewValue(value, field, userMap, inventoryItems) {
  const typedValue = getTypedBoardPreviewValue(value, field, userMap, inventoryItems);
  if (typedValue !== null) return typedValue;
  if (value === "" || value === null || value === undefined) {
    return field.placeholder || "Sin captura";
  }
  return String(value);
}

export function normalizeBoardMultiSelectDetailValue(value) {
  let source = value;

  const unwrapNestedSource = (input) => {
    let current = input;
    const visited = new Set();

    while (current && typeof current === "object" && !Array.isArray(current)) {
      if (visited.has(current)) break;
      visited.add(current);

      const nestedCandidate = [
        current.items,
        current.values,
        current.selectedOptions,
        current.selectedItems,
        current.selections,
        current.entries,
        current.data,
        current.value,
      ].find((entry) => entry !== undefined && entry !== null);

      if (nestedCandidate === undefined || nestedCandidate === current) break;
      current = nestedCandidate;
    }

    return current;
  };

  const buildMultiSelectItem = (item, fallbackOption = "") => {
    if (item === null || item === undefined) return null;

    if (typeof item === "string" || typeof item === "number") {
      const option = String(item).trim();
      return option ? { option, label: option, detail: "" } : null;
    }

    if (typeof item !== "object") return null;

    const nestedOption = String(
      item.option
      || item.label
      || item.name
      || item.title
      || item.text
      || item.key
      || item.code
      || item.id
      || fallbackOption,
    ).trim();
    const label = String(item.label || item.option || item.name || item.title || item.text || nestedOption).trim();
    const detailSource = item.detail ?? item.quantity ?? item.value ?? item.count ?? item.total ?? item.note ?? item.notes ?? item.observation ?? item.observations ?? "";
    const detail = detailSource && typeof detailSource === "object"
      ? String(detailSource.detail ?? detailSource.quantity ?? detailSource.value ?? detailSource.count ?? detailSource.total ?? "").trim()
      : String(detailSource ?? "").trim();

    if (!nestedOption) return null;
    return { option: nestedOption, label: label || nestedOption, detail };
  };

  if (typeof source === "string") {
    const rawText = source.trim();
    if (!rawText) return [];
    if ((rawText.startsWith("[") && rawText.endsWith("]")) || (rawText.startsWith("{") && rawText.endsWith("}"))) {
      try {
        source = JSON.parse(rawText);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  source = unwrapNestedSource(source);

  if (Array.isArray(source)) {
    return source
      .map((item) => buildMultiSelectItem(item))
      .filter((item) => item?.option);
  }

  if (source && typeof source === "object") {
    if (source.option || source.label || source.detail || source.quantity || source.value) {
      const item = buildMultiSelectItem(source);
      return item?.option ? [item] : [];
    }

    return Object.entries(source)
      .map(([key, detailValue]) => {
        const option = String(key || "").trim();
        if (!option) return null;
        if (typeof detailValue === "boolean") {
          return detailValue ? { option, label: option, detail: "" } : null;
        }
        if (detailValue && typeof detailValue === "object") {
          const nestedItem = buildMultiSelectItem(detailValue, option);
          return nestedItem ? { ...nestedItem, option, label: nestedItem.label || option } : { option, label: option, detail: "" };
        }
        return { option, label: option, detail: String(detailValue ?? "").trim() };
      })
      .filter(Boolean);
  }

  return [];
}

function formatDashboardInventoryFieldValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.map((entry) => formatDashboardInventoryFieldValue(entry)).join(", ");
  if (typeof value === "object") {
    if (value.name || value.label || value.title) {
      return String(value.name || value.label || value.title);
    }
    return "";
  }
  return String(value);
}

function findDashboardInventoryField(fields, keywords = []) {
  const normalizedKeywords = keywords.map((keyword) => String(keyword || "").toLowerCase()).filter(Boolean);
  return (Array.isArray(fields) ? fields : []).find((field) => {
    const label = String(field?.label || field?.name || field?.key || "").toLowerCase();
    return normalizedKeywords.some((keyword) => label.includes(keyword));
  }) || null;
}

function readDashboardInventoryFieldValue(row, field) {
  if (!field) return "";
  const values = row?.rowValues && typeof row.rowValues === "object" ? row.rowValues : {};
  const rawValue = values[field.id] ?? values[field.key] ?? values[field.name];
  if (rawValue === undefined || rawValue === null || rawValue === "") return "";
  if (field.type === "inventoryLookup" && row?.inventoryItemsById instanceof Map) {
    const inventoryItem = row.inventoryItemsById.get(rawValue);
    if (inventoryItem?.name) return String(inventoryItem.name).trim();
  }
  return formatDashboardInventoryFieldValue(rawValue);
}

function readDashboardInventoryNumericValue(row, keywords = []) {
  const field = findDashboardInventoryField(row?.sourceFields, keywords);
  if (!field) return null;
  const raw = readDashboardInventoryFieldValue(row, field);
  if (!String(raw || "").trim()) return null;
  const normalized = String(raw).replace(/\./g, "").replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/g);
  if (!normalized?.length) return null;
  const numeric = Number(normalized[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

function readDashboardInventoryProductLabel(row) {
  const fields = Array.isArray(row?.sourceFields) ? row.sourceFields : [];
  const productKeywords = ["nombre producto", "nombre", "descripcion", "producto", "sku", "articulo", "item", "producto/sku"];
  const matchField = findDashboardInventoryField(fields, productKeywords);
  if (matchField) {
    const label = readDashboardInventoryFieldValue(row, matchField);
    if (label) {
      if (matchField.type === "inventoryLookup" && row?.inventoryItemsById instanceof Map) {
        const values = row.rowValues || {};
        const rawValue = values[matchField.id] ?? values[matchField.key] ?? values[matchField.name];
        const inventoryItem = row.inventoryItemsById.get(rawValue);
        if (inventoryItem) {
          const nameLabel = inventoryItem.name || label;
          const presentation = String(inventoryItem.presentation || "").trim();
          return presentation ? `${nameLabel} - ${presentation}` : nameLabel;
        }
      }
      return label;
    }
  }
  return String(row?.rowLabel || "").trim();
}

function sumDashboardInventoryPieceFields(row, excludeFieldIds = new Set()) {
  const fields = Array.isArray(row?.sourceFields) ? row.sourceFields : [];
  const values = row?.rowValues && typeof row.rowValues === "object" ? row.rowValues : {};
  let total = 0;
  let found = false;

  fields.forEach((field) => {
    const fieldId = String(field?.id || field?.key || field?.name || "").trim();
    if (!fieldId || excludeFieldIds.has(fieldId)) return;
    const label = String(field?.label || field?.name || field?.key || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (!label.includes("pieza") && !label.includes("pza") && !label.includes("cantidad")) return;
    if (label.includes("merma") || label.includes("faltante") || label.includes("esperad") || label.includes("por caja")) return;
    const raw = values[field.id] ?? values[field.key] ?? values[field.name];
    if (raw === undefined || raw === null || raw === "") return;
    const normalized = String(raw).replace(/\./g, "").replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/g);
    if (!normalized?.length) return;
    const numeric = Number(normalized[0]);
    if (Number.isFinite(numeric) && numeric > 0) {
      total += numeric;
      found = true;
    }
  });

  return found ? total : null;
}

/** Métricas de inventario/tarima para dashboard (piezas, mermas, tiempos). */
export function resolveDashboardInventoryRowMetrics(row, inventoryItemsById = null) {
  const fields = Array.isArray(row?.sourceFields) ? row.sourceFields : [];
  const enrichedRow = {
    ...row,
    sourceFields: fields,
    inventoryItemsById: inventoryItemsById instanceof Map ? inventoryItemsById : null,
  };

  const tarimaValue = readDashboardInventoryFieldValue(enrichedRow, findDashboardInventoryField(fields, ["tarima", "pallet", "palet"])) || "Sin tarima";
  const productValue = readDashboardInventoryProductLabel(enrichedRow) || "Sin producto";

  const explicitExpectedPieces = readDashboardInventoryNumericValue(enrichedRow, ["piezas esperadas", "piezas esperada", "piezas a revisar", "cantidad esperada", "esperadas", "esperado", "piezas previstas", "total piezas"]);
  const cajasTarima = readDashboardInventoryNumericValue(enrichedRow, ["cajas tarima", "cajas", "tarimas", "palets", "pallets"]);
  const piezasPorCaja = readDashboardInventoryNumericValue(enrichedRow, ["piezas por caja", "piezas/caja", "pieza por caja", "pieza caja", "piezas caja"]);

  const lookupProductField = findDashboardInventoryField(fields, ["producto", "sku", "articulo", "item", "nombre producto"]);
  const productLookupId = lookupProductField
    ? (row?.rowValues?.[lookupProductField.id] ?? row?.rowValues?.[lookupProductField.key] ?? row?.rowValues?.[lookupProductField.name])
    : null;
  const inventoryProduct = inventoryItemsById instanceof Map && productLookupId
    ? inventoryItemsById.get(productLookupId)
    : null;
  const fallbackPiecesPerBox = Number.isFinite(piezasPorCaja)
    ? piezasPorCaja
    : inventoryProduct && Number.isFinite(Number(inventoryProduct.piecesPerBox))
      ? Number(inventoryProduct.piecesPerBox)
      : null;

  const expectedPieces = Number.isFinite(explicitExpectedPieces)
    ? explicitExpectedPieces
    : (Number.isFinite(cajasTarima) && Number.isFinite(fallbackPiecesPerBox) ? cajasTarima * fallbackPiecesPerBox : null);

  const missingPieces = readDashboardInventoryNumericValue(enrichedRow, ["piezas faltantes", "faltantes", "faltante", "diferencia", "faltan", "piezas faltan"]);
  const explicitRealPieces = readDashboardInventoryNumericValue(enrichedRow, ["piezas reales", "reales", "piezas finales", "resultado", "total real", "piezas revisadas", "revisadas", "piezas surtidas", "surtidas"]);

  const mermaField = fields.find((field) => field?.type === "multiSelectDetail")
    || fields.find((field) => {
      const label = String(field?.label || field?.name || field?.key || "").toLowerCase();
      return (label.includes("causal") || label.includes("causales") || label.includes("motivo")) && !label.includes("pieza");
    });
  let rawMerma = mermaField
    ? (row?.rowValues?.[mermaField.id] ?? row?.rowValues?.[mermaField.key] ?? row?.rowValues?.[mermaField.name])
    : null;
  const normalizedMerma = normalizeBoardMultiSelectDetailValue(rawMerma);
  const mermas = normalizedMerma.length
    ? normalizedMerma.map((entry) => ({
      motivo: String(entry.label || entry.option || "").trim(),
      piezas: Number(String(entry.detail || "").replace(/,/g, ".")),
    }))
    : [];
  const totalMermaPieces = mermas.reduce((sum, entry) => sum + (Number.isFinite(entry.piezas) ? entry.piezas : 0), 0);

  const realPieces = Number.isFinite(explicitRealPieces)
    ? explicitRealPieces
    : (Number.isFinite(expectedPieces) ? Math.max(0, expectedPieces - totalMermaPieces - Math.max(0, missingPieces || 0)) : null);

  const scannedPieces = sumDashboardInventoryPieceFields(enrichedRow);
  const piecesReviewed = Number.isFinite(realPieces) && realPieces > 0
    ? realPieces
    : (Number.isFinite(expectedPieces) && expectedPieces > 0 ? expectedPieces : (Number.isFinite(scannedPieces) && scannedPieces > 0 ? scannedPieces : 0));

  const durationSeconds = Math.max(0, Number(row?.durationSeconds || 0));
  const durationMinutes = durationSeconds / 60;

  return {
    tarimaValue,
    productValue,
    productKey: String(productValue || "Sin producto").trim().toLowerCase().replace(/\s+/g, " "),
    expectedPieces: Number.isFinite(expectedPieces) ? expectedPieces : null,
    totalMermaPieces,
    missingPieces: Number.isFinite(missingPieces) ? missingPieces : null,
    realPieces: Number.isFinite(realPieces) ? realPieces : null,
    piecesReviewed: Math.max(0, Number(piecesReviewed || 0)),
    durationSeconds,
    durationMinutes,
    secondsPerPiece: piecesReviewed > 0 ? durationSeconds / piecesReviewed : null,
    mermasText: mermas.filter((entry) => Number.isFinite(entry.piezas) && entry.piezas > 0)
      .map((entry) => `${entry.motivo}: ${Math.round(entry.piezas)}`)
      .join(", ") || "-",
  };
}

function buildBoardAssigneeInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join("");
}

export function normalizeBoardResponsibleIds(entries = [], fallbackResponsibleId = "") {
  const normalized = Array.from(new Set((Array.isArray(entries) ? entries : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)));
  if (normalized.length) return normalized;
  const fallbackId = String(fallbackResponsibleId || "").trim();
  return fallbackId ? [fallbackId] : [];
}

export function getBoardRowResponsibleIds(row) {
  return normalizeBoardResponsibleIds(row?.responsibleIds, row?.responsibleId);
}

export function formatBoardRowAssigneeLabel(row, userMap, options = {}) {
  const responsibleIds = getBoardRowResponsibleIds(row);
  const names = responsibleIds
    .map((userId) => userMap?.get?.(userId)?.name || "")
    .filter(Boolean);

  if (!names.length) {
    return options.emptyLabel || "Sin asignar";
  }

  if (names.length === 1 || !options.useInitialsForMultiple) {
    return names.join(", ");
  }

  return names.map((name) => buildBoardAssigneeInitials(name)).join(" ");
}

export function formatBoardMultiSelectDetailValue(value) {
  return normalizeBoardMultiSelectDetailValue(value)
    .map((item) => (item.detail ? `${item.label || item.option}: ${item.detail}` : (item.label || item.option)))
    .join(" | ");
}

export function normalizeBoardEvidenceValue(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      url: String(item.url || "").trim(),
      thumbnailUrl: String(item.thumbnailUrl || item.thumbUrl || item.url || "").trim(),
      mimeType: String(item.mimeType || "").trim(),
      name: String(item.name || "").trim(),
      publicId: String(item.publicId || "").trim(),
    }))
    .filter((item) => item.url);
}

export function getBoardFieldTypeDescription(type) {
  return BOARD_FIELD_TYPE_DETAILS[type] || "Componente flexible para construir tableros operativos.";
}

export function renderBoardFieldLabel(label, required = false) {
  return (
    <>
      {label}
      {required ? <span className="required-mark" aria-hidden="true"> *</span> : null}
    </>
  );
}

export function getProfileEditAvailabilityMessage(canBypassEditLimit, hasSelfEditAvailable) {
  if (canBypassEditLimit) return "Edición libre por nivel interno.";
  if (hasSelfEditAvailable) return "Disponible 1 corrección personal del perfil.";
  return "La siguiente corrección requiere apoyo de Senior o Lead.";
}

export function getHeaderEyebrowText(page) {
  if (page === PAGE_DASHBOARD) return "Panel principal";
  if (page === PAGE_USERS) return "Players y permisos";
  if (page === PAGE_BIBLIOTECA) return "Documentos y recursos";
  if (page === PAGE_PROCESS_AUDITS) return "Auditoría operativa";
  return "Operación diaria";
}

export function buildTemplateColumns(template) {
  const keyToId = new Map();
  const columns = (template.columns || []).map((column) => {
    const id = makeId("fld");
    keyToId.set(column.templateKey || column.id || column.label, id);
    return {
      id,
      label: column.label,
      type: column.type,
      optionSource: column.optionSource || "manual",
      optionCatalogCategory: column.optionCatalogCategory || "",
      options: column.options || [],
      inventoryProperty: column.inventoryProperty || "code",
      sourceFieldId: column.sourceFieldId || null,
      formulaOperation: column.formulaOperation || "add",
      formulaLeftFieldId: column.formulaLeftFieldId || null,
      formulaRightFieldId: column.formulaRightFieldId || null,
      formulaTerms: getNormalizedFormulaTerms(column.formulaTerms, column),
      helpText: column.helpText || "",
      placeholder: column.placeholder || "",
      defaultValue: column.defaultValue ?? "",
      width: column.width || "md",
      widthPx: column.widthPx ? Number(column.widthPx) : null,
      required: Boolean(column.required),
      groupName: column.groupName || "General",
      groupColor: column.groupColor || "#e2f4ec",
      colorRules: column.colorRules || [],
    };
  });

  return columns.map((column) => ({
    ...column,
    sourceFieldId: keyToId.get(column.sourceFieldId) || column.sourceFieldId,
    formulaLeftFieldId: keyToId.get(column.formulaLeftFieldId) || column.formulaLeftFieldId,
    formulaRightFieldId: keyToId.get(column.formulaRightFieldId) || column.formulaRightFieldId,
    formulaTerms: getNormalizedFormulaTerms(column.formulaTerms, column).map((term) => ({
      ...term,
      fieldId: keyToId.get(term.fieldId) || term.fieldId,
    })),
  }));
}

export function cloneBoardFields(fields) {
  const keyToId = new Map();
  const clonedFields = (fields || []).map((field) => {
    const id = makeId("fld");
    keyToId.set(field.id, id);
    keyToId.set(field.templateKey || field.label, id);
    return {
      ...field,
      id,
      formulaTerms: getNormalizedFormulaTerms(field.formulaTerms, field),
      colorRules: field.colorRules || [],
    };
  });

  return clonedFields.map((field) => ({
    ...field,
    sourceFieldId: keyToId.get(field.sourceFieldId) || field.sourceFieldId,
    formulaLeftFieldId: keyToId.get(field.formulaLeftFieldId) || field.formulaLeftFieldId,
    formulaRightFieldId: keyToId.get(field.formulaRightFieldId) || field.formulaRightFieldId,
    formulaTerms: getNormalizedFormulaTerms(field.formulaTerms, field).map((term) => ({
      ...term,
      fieldId: keyToId.get(term.fieldId) || term.fieldId,
    })),
  }));
}

export function cloneBoardFieldBundle(fields) {
  const keyToId = new Map();
  const clonedFields = (fields || []).map((field) => {
    const id = makeId("fld");
    keyToId.set(field.id, id);
    keyToId.set(field.templateKey || field.label, id);
    return {
      ...field,
      id,
      formulaTerms: getNormalizedFormulaTerms(field.formulaTerms, field),
      colorRules: field.colorRules || [],
    };
  });

  return {
    idMap: keyToId,
    fields: clonedFields.map((field) => ({
      ...field,
      sourceFieldId: keyToId.get(field.sourceFieldId) || field.sourceFieldId,
      formulaLeftFieldId: keyToId.get(field.formulaLeftFieldId) || field.formulaLeftFieldId,
      formulaRightFieldId: keyToId.get(field.formulaRightFieldId) || field.formulaRightFieldId,
      formulaTerms: getNormalizedFormulaTerms(field.formulaTerms, field).map((term) => ({
        ...term,
        fieldId: keyToId.get(term.fieldId) || term.fieldId,
      })),
    })),
  };
}

export function getBoardTemplateCategory(template) {
  return template?.category || template?.columns?.[0]?.groupName || template?.fields?.[0]?.groupName || "Operación";
}

export function getTemplateFields(template) {
  return template?.columns || template?.fields || [];
}

export function getTemplateFieldGroups(template) {
  const groups = new Map();
  getTemplateFields(template).forEach((field) => {
    const key = field.groupName || "General";
    if (!groups.has(key)) {
      groups.set(key, {
        name: key,
        color: field.groupColor || "#e2f4ec",
        fields: [],
      });
    }
    groups.get(key).fields.push(field);
  });
  return Array.from(groups.values());
}

export function getTemplateFieldDetail(field) {
  if (isBoardActivityListField(field)) {
    return `Lista: ${field.optionCatalogCategory || "Sin definir"} · cada actividad genera una fila del tablero`;
  }
  if (field.type === "select") {
    return field.optionSource === "manual"
      ? `Opciones: ${(field.options || []).join(", ") || "Sin opciones"}`
      : `Fuente: ${OPTION_SOURCE_TYPES.find((item) => item.value === field.optionSource)?.label || "Catálogo"}`;
  }
  if (field.type === "multiSelectDetail") {
    return `Selección múltiple: ${(field.options || []).join(", ") || "Sin opciones"}`;
  }
  if (field.type === "evidenceGallery") {
    return "Miniaturas con carga de foto/video y vista previa en modal.";
  }
  if (field.type === "inventoryProperty") {
    return `Dato: ${INVENTORY_PROPERTIES.find((item) => item.value === field.inventoryProperty)?.label || field.inventoryProperty}`;
  }
  if (field.type === "formula") {
    const formulaTerms = getNormalizedFormulaTerms(field.formulaTerms, field);
    if (formulaTerms.length >= 2) {
      return `Operación compuesta: ${formulaTerms.length} término(s)`;
    }
    return `Operación: ${FORMULA_OPERATIONS.find((item) => item.value === field.formulaOperation)?.label || field.formulaOperation}`;
  }
  if (field.type === "boolean") {
    return "Valores: Sí / No";
  }
  if (field.type === "status") {
    return "Estados: Pendiente, En curso, Pausado, Terminado";
  }
  return field.placeholder || field.helpText || "Configuración lista para capturar.";
}

export function isBoardFieldValueFilled(value, fieldType) {
  if (["number", "currency", "percentage", "rating", "progress", "counter"].includes(fieldType)) {
    if (value === "" || value === null || value === undefined) return false;
    const parsed = Number(value);
    return Number.isFinite(parsed);
  }
  if (fieldType === "boolean") return value === "Si" || value === "No";
  if (fieldType === "formula") return value !== null && value !== undefined;
  if (fieldType === "multiSelectDetail") return normalizeBoardMultiSelectDetailValue(value).length > 0;
  if (fieldType === "evidenceGallery") return normalizeBoardEvidenceValue(value).length > 0;
  return String(value ?? "").trim() !== "";
}

export function getBoardSectionGroups(board) {
  const groups = [];
  let current = null;

  getOrderedBoardColumns(board).forEach((column) => {
    const name = column.sectionName || "General";
    const color = column.sectionColor || "#e2f4ec";
    if (!current || current.name !== name || current.color !== color) {
      current = { name, color, span: 0 };
      groups.push(current);
    }
    current.span += 1;
  });

  return groups;
}

export function mapColumnToFieldDraft(column, columns = []) {
  const primaryRule = column.colorRules?.[0] || {};
  return {
    ...createEmptyFieldDraft(),
    fieldLabel: column.label || "",
    fieldType: getBoardFieldDisplayType(columns, column),
    optionSource: column.optionSource || "manual",
    optionCatalogCategory: column.optionCatalogCategory || "",
    optionsText: Array.isArray(column.options) ? column.options.join(", ") : "",
    inventoryProperty: column.inventoryProperty || "code",
    sourceFieldId: column.sourceFieldId || "",
    formulaOperation: column.formulaOperation || "add",
    formulaLeftFieldId: column.formulaLeftFieldId || "",
    formulaRightFieldId: column.formulaRightFieldId || "",
    formulaTerms: getNormalizedFormulaTerms(column.formulaTerms, column).length
      ? getNormalizedFormulaTerms(column.formulaTerms, column)
      : [
          { fieldId: column.formulaLeftFieldId || "" },
          { operation: column.formulaOperation || "add", fieldId: column.formulaRightFieldId || "" },
        ],
    colorOperator: primaryRule.operator || ">=",
    colorValue: primaryRule.value || "",
    colorBg: primaryRule.color || "#dbeafe",
    colorText: primaryRule.textColor || "#1d4ed8",
    fieldHelp: column.helpText || "",
    placeholder: column.placeholder || "",
    defaultValue: column.defaultValue ?? "",
    fieldWidth: column.width || "md",
    fieldWidthPx: column.widthPx ? String(column.widthPx) : "",
    isRequired: column.required ? "true" : "false",
    groupName: column.groupName || "General",
    groupColor: column.groupColor || "#e2f4ec",
  };
}

export function getBoardFieldDefaultValue(field, currentUserId) {
  if (field.defaultValue !== undefined && field.defaultValue !== null && String(field.defaultValue).trim() !== "") {
    if (["number", "currency", "percentage", "rating", "progress", "counter"].includes(field.type)) {
      const parsed = Number(field.defaultValue);
      return Number.isFinite(parsed) && parsed !== 0 ? parsed : "";
    }
    if (field.type === "boolean") return String(field.defaultValue).toLowerCase() === "si" ? "Si" : field.defaultValue;
    return field.defaultValue;
  }

  if (field.type === "status") return STATUS_PENDING;
  if (field.type === "user") return currentUserId || "";
  if (field.type === "boolean") return "No";
  if (field.type === "date") return new Date().toISOString().slice(0, 10);
  if (field.type === "time") return "08:00";
  if (["rating", "progress", "counter"].includes(field.type)) return "";
  return "";
}

export function toInventoryNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value || "")
    .trim()
    .replaceAll(",", ".")
    .replaceAll(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function decodeCsvBuffer(buffer) {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const hasReplacementChars = utf8.includes("\uFFFD");
  const hasMojibake = /Ã.|Â.|â./.test(utf8);

  if (!hasReplacementChars && !hasMojibake) {
    return utf8;
  }

  return new TextDecoder("windows-1252", { fatal: false }).decode(buffer);
}

export function pushCsvRowIfNotEmpty(rows, currentRow, currentValue) {
  const nextRow = currentRow.concat(currentValue);
  if (nextRow.some((value) => String(value).trim() !== "")) {
    rows.push(nextRow);
  }
}

export function isCsvRowBreak(character, isInsideQuotes) {
  return !isInsideQuotes && (character === "\n" || character === "\r");
}

export function isCsvColumnBreak(character, isInsideQuotes) {
  return !isInsideQuotes && character === ",";
}

export function consumeCsvCharacter(parserState, rows, character, nextCharacter) {
  if (character === '"') {
    if (parserState.isInsideQuotes && nextCharacter === '"') {
      parserState.currentValue += '"';
      return true;
    }
    parserState.isInsideQuotes = !parserState.isInsideQuotes;
    return false;
  }

  if (isCsvColumnBreak(character, parserState.isInsideQuotes)) {
    parserState.currentRow.push(parserState.currentValue);
    parserState.currentValue = "";
    return false;
  }

  if (isCsvRowBreak(character, parserState.isInsideQuotes)) {
    pushCsvRowIfNotEmpty(rows, parserState.currentRow, parserState.currentValue);
    parserState.currentRow = [];
    parserState.currentValue = "";
    return character === "\r" && nextCharacter === "\n";
  }

  parserState.currentValue += character;
  return false;
}

export function parseCsvTextToObjects(text) {
  const rows = [];
  const parserState = {
    currentRow: [],
    currentValue: "",
    isInsideQuotes: false,
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    const shouldSkipNext = consumeCsvCharacter(parserState, rows, character, nextCharacter);
    if (shouldSkipNext) {
      index += 1;
    }
  }

  pushCsvRowIfNotEmpty(rows, parserState.currentRow, parserState.currentValue);

  if (!rows.length) return [];

  const headers = rows[0].map((header, index) => String(header || `columna_${index + 1}`).trim());
  return rows.slice(1).map((row) =>
    headers.reduce((accumulator, header, index) => {
      accumulator[header] = row[index] ?? "";
      return accumulator;
    }, {}),
  );
}


export function triggerBrowserDownload(buffer, fileName, mimeType) {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function sanitizeImportedText(value) {
  if (typeof value !== "string") return value;

  if (/Ã.|Â.|â./.test(value)) {
    try {
      const bytes = Uint8Array.from(value, (character) => character.codePointAt(0) || 0);
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch {
      return value;
    }
  }

  return value;
}

export function mapInventoryImportRow(row, index, defaultDomain = "base") {
  const normalizedRow = Object.entries(row ?? EMPTY_OBJECT).reduce((accumulator, [key, value]) => {
    const alias = INVENTORY_IMPORT_FIELD_ALIASES[normalizeImportHeader(key)];
    if (alias) accumulator[alias] = sanitizeImportedText(value);
    return accumulator;
  }, {});

  const code = String(normalizedRow.code || "").trim();
  const name = String(normalizedRow.name || "").trim();
  // Use domain from file if specified, otherwise use defaultDomain (the current tab)
  const domain = normalizedRow.domain ? normalizeInventoryDomain(normalizedRow.domain) : defaultDomain;
  const usesPresentation = inventoryDomainUsesPresentation(domain);
  const usesPackagingMetrics = inventoryDomainUsesPackagingMetrics(domain);

  if (!code || !name) return null;

  return {
    id: `import-${index + 1}`,
    code,
    name,
    domain,
    presentation: usesPresentation ? String(normalizedRow.presentation || "").trim() : "",
    piecesPerBox: usesPackagingMetrics ? toInventoryNumber(normalizedRow.piecesPerBox) : 0,
    boxesPerPallet: usesPackagingMetrics ? toInventoryNumber(normalizedRow.boxesPerPallet) : 0,
    stockUnits: toInventoryNumber(normalizedRow.stockUnits),
    minStockUnits: toInventoryNumber(normalizedRow.minStockUnits),
    storageLocation: String(normalizedRow.storageLocation || "").trim(),
    family: String(normalizedRow.family || "").trim(),
    price: toInventoryNumber(normalizedRow.price),
    cost: toInventoryNumber(normalizedRow.cost),
    cleaningSite: normalizeCleaningSite(normalizedRow.cleaningSite),
    unitLabel: String(normalizedRow.unitLabel || "pzas").trim() || "pzas",
    activityCatalogIds: String(normalizedRow.activityCatalogIds || "").split(/[;,]/).map((entry) => entry.trim()).filter(Boolean),
    activityConsumptions: normalizeInventoryActivityConsumptions(normalizedRow.activityConsumptions, normalizedRow.activityCatalogIds, toInventoryNumber(normalizedRow.consumptionPerStart)),
    consumptionPerStart: toInventoryNumber(normalizedRow.consumptionPerStart),
  };
}

export async function parseInventoryImportFile(file, defaultDomain = "base") {
  const buffer = await file.arrayBuffer();
  const isCsv = /\.csv$/i.test(file.name);
  let rows = [];

  if (isCsv) {
    rows = parseCsvTextToObjects(decodeCsvBuffer(buffer));
  } else {
    const ExcelJS = await getExcelJsModule();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const firstSheet = workbook.worksheets[0];

    if (!firstSheet) {
      throw new Error("No se encontró ninguna hoja en el archivo.");
    }

    const headerRow = firstSheet.getRow(1);
    const headers = [];
    const columnCount = headerRow.actualCellCount || headerRow.cellCount || firstSheet.columnCount || 0;

    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      headers.push(String(headerRow.getCell(columnIndex).text || `columna_${columnIndex}`).trim());
    }

    rows = [];
    for (let rowIndex = 2; rowIndex <= firstSheet.rowCount; rowIndex += 1) {
      const worksheetRow = firstSheet.getRow(rowIndex);
      const row = headers.reduce((accumulator, header, columnIndex) => {
        accumulator[header] = worksheetRow.getCell(columnIndex + 1).text || "";
        return accumulator;
      }, {});

      if (Object.values(row).some((value) => String(value).trim() !== "")) {
        rows.push(row);
      }
    }
  }

  return rows
    .map((row, index) => mapInventoryImportRow(row, index, defaultDomain))
    .filter(Boolean);
}

export function buildImportedBoardRowValuesPatch(importedRow, columns, visibleUsers, inventoryItems, yesValues) {
  const valuesPatch = {};

  (columns || []).forEach((field) => {
    const raw = importedRow?.[field.label];
    if (raw === undefined || raw === null || String(raw).trim() === "") return;

    if (["number", "currency", "percentage", "formula"].includes(field.type)) {
      const parsed = Number(String(raw).replaceAll(/[,$%\s]/g, ""));
      valuesPatch[field.id] = Number.isFinite(parsed) ? parsed : 0;
      return;
    }

    if (field.type === "rating") {
      const parsed = Math.min(5, Math.max(0, Math.round(Number(String(raw).replaceAll(/[^\d.]/g, "")) || 0)));
      valuesPatch[field.id] = parsed;
      return;
    }

    if (field.type === "progress") {
      const parsed = Math.min(100, Math.max(0, Number(String(raw).replaceAll(/[%\s]/g, "")) || 0));
      valuesPatch[field.id] = parsed;
      return;
    }

    if (field.type === "counter") {
      const parsed = Math.max(0, Math.round(Number(String(raw).replaceAll(/[^\d]/g, "")) || 0));
      valuesPatch[field.id] = parsed;
      return;
    }

    if (field.type === "boolean") {
      valuesPatch[field.id] = yesValues.has(String(raw).trim().toLowerCase()) ? "Si" : "No";
      return;
    }

    if (field.type === "user") {
      const match = visibleUsers.find((user) => normalizeKey(user.name) === normalizeKey(raw));
      valuesPatch[field.id] = match?.id || "";
      return;
    }

    if (isInventoryLookupFieldType(field.type)) {
      const item = findInventoryItemByQuery(inventoryItems || [], raw);
      valuesPatch[field.id] = item?.id || "";
      return;
    }

    if (field.type === "date") {
      // Handle Excel date serials (numbers) or parseable strings
      const rawStr = String(raw).trim();
      // Try ISO date
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawStr)) {
        valuesPatch[field.id] = rawStr;
        return;
      }
      // Try localized formats dd/mm/yyyy or mm/dd/yyyy
      const parts = rawStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (parts) {
        const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
        const isoDate = `${year}-${String(parts[2]).padStart(2, "0")}-${String(parts[1]).padStart(2, "0")}`;
        const test = new Date(isoDate);
        if (!Number.isNaN(test.getTime())) {
          valuesPatch[field.id] = isoDate;
          return;
        }
      }
      const parsed = new Date(rawStr);
      if (!Number.isNaN(parsed.getTime())) {
        valuesPatch[field.id] = parsed.toISOString().slice(0, 10);
        return;
      }
      valuesPatch[field.id] = rawStr;
      return;
    }

    valuesPatch[field.id] = String(raw);
  });

  return valuesPatch;
}

export function buildBoardSavePayload(controlBoardDraft, ownerId) {
  const normalizedColumnOrder = getNormalizedBoardColumnOrder({
    fields: controlBoardDraft.columns || [],
    settings: controlBoardDraft.settings ?? EMPTY_OBJECT,
  });
  const visibilityType = normalizeBoardVisibilityType(controlBoardDraft.visibilityType);

  return {
    normalizedColumnOrder,
    payload: {
      name: controlBoardDraft.name.trim(),
      description: controlBoardDraft.description.trim(),
      ownerId,
      visibilityType,
      sharedDepartments: visibilityType === "department" ? normalizeBoardSharedDepartments(controlBoardDraft.sharedDepartments) : [],
      accessUserIds: visibilityType === "users" ? normalizeBoardAccessUserIds(controlBoardDraft.accessUserIds, ownerId) : [],
      settings: {
        ...withDefaultBoardSettings(controlBoardDraft.settings),
        columnOrder: normalizedColumnOrder,
      },
      columns: sortBoardFieldsByColumnOrder(cloneDraftColumns(controlBoardDraft.columns || []), normalizedColumnOrder),
    },
  };
}

export function formatBoardExportFieldValue(field, value, inventoryItems, userMap) {
  if (field.type === "inventoryLookup") {
    const inventoryItem = (inventoryItems || []).find((item) => item.id === value);
    return inventoryItem ? `${inventoryItem.name} · ${inventoryItem.presentation}` : "";
  }
  if (field.type === "multiSelectDetail") {
    return formatBoardMultiSelectDetailValue(value);
  }
  if (field.type === "evidenceGallery") {
    return normalizeBoardEvidenceValue(value).map((item) => item.name || item.url).join(", ");
  }
  if (field.type === "user") {
    return userMap.get(value)?.name || "";
  }
  if (field.type === "rating") {
    const stars = Math.min(5, Math.max(0, Number(value || 0)));
    return stars ? `${"★".repeat(stars)}${"☆".repeat(5 - stars)}` : "";
  }
  if (field.type === "progress") {
    return value !== "" && value !== undefined ? `${Number(value || 0)}%` : "";
  }
  if (field.type === "counter") {
    return value !== "" && value !== undefined ? String(Number(value || 0)) : "";
  }
  return value;
}

export async function downloadInventoryTemplateFile(domain = INVENTORY_DOMAIN_BASE) {
  const ExcelJS = await getExcelJsModule();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Inventario");

  const normalizedDomain = normalizeInventoryDomain(domain);
  const templateConfig = normalizedDomain === INVENTORY_DOMAIN_CLEANING
    ? {
        fileName: "plantilla-inventario-limpieza.xlsx",
        columns: [
          { header: "codigo", key: "codigo", width: 18 },
          { header: "dominio", key: "dominio", width: 18 },
          { header: "nombre", key: "nombre", width: 28 },
          { header: "presentacion", key: "presentacion", width: 20 },
          { header: "stock_actual", key: "stock_actual", width: 18 },
          { header: "stock_minimo", key: "stock_minimo", width: 18 },
          { header: "sede_limpieza", key: "sede_limpieza", width: 18 },
          { header: "ubicacion", key: "ubicacion", width: 24 },
          { header: "unidad", key: "unidad", width: 14 },
          { header: "actividad_catalogo_ids", key: "actividad_catalogo_ids", width: 28 },
          { header: "consumo_por_inicio", key: "consumo_por_inicio", width: 20 },
          { header: "consumos_por_actividad", key: "consumos_por_actividad", width: 32 },
        ],
        sampleRow: {
          codigo: "LIMP-001",
          dominio: "cleaning",
          nombre: "Detergente industrial",
          presentacion: "Bidon 20L",
          stock_actual: 18,
          stock_minimo: 8,
          sede_limpieza: "C3",
          ubicacion: "Cuarto de limpieza",
          unidad: "bidones",
          actividad_catalogo_ids: "cat-piso;cat-oficinas",
          consumo_por_inicio: 1,
          consumos_por_actividad: "cat-piso:1;cat-oficinas:2",
        },
      }
    : normalizedDomain === INVENTORY_DOMAIN_ORDERS
      ? {
          fileName: "plantilla-inventario-pedidos.xlsx",
          columns: [
            { header: "codigo", key: "codigo", width: 18 },
            { header: "dominio", key: "dominio", width: 18 },
            { header: "nombre", key: "nombre", width: 28 },
            { header: "stock_actual", key: "stock_actual", width: 18 },
            { header: "stock_minimo", key: "stock_minimo", width: 18 },
            { header: "ubicacion", key: "ubicacion", width: 24 },
            { header: "unidad", key: "unidad", width: 14 },
          ],
          sampleRow: {
            codigo: "PED-001",
            dominio: "orders",
            nombre: "Esquinero de carton 2 x 2 x 48",
            stock_actual: 150,
            stock_minimo: 70,
            ubicacion: "Nave 1 · rack empaque",
            unidad: "pzas",
          },
        }
      : normalizedDomain === INVENTORY_DOMAIN_MAINTENANCE
        ? {
            fileName: "plantilla-inventario-mantenimiento.xlsx",
            columns: [
              { header: "codigo", key: "codigo", width: 18 },
              { header: "dominio", key: "dominio", width: 18 },
              { header: "nombre", key: "nombre", width: 28 },
              { header: "stock_actual", key: "stock_actual", width: 18 },
              { header: "stock_minimo", key: "stock_minimo", width: 18 },
              { header: "ubicacion", key: "ubicacion", width: 24 },
              { header: "unidad", key: "unidad", width: 14 },
            ],
            sampleRow: {
              codigo: "MNT-001",
              dominio: "maintenance",
              nombre: "Cable eléctrico 2.5mm",
              stock_actual: 40,
              stock_minimo: 12,
              ubicacion: "Taller mantenimiento",
              unidad: "metros",
            },
          }
        : {
          fileName: "plantilla-inventario-productos.xlsx",
          columns: [
            { header: "codigo", key: "codigo", width: 18 },
            { header: "dominio", key: "dominio", width: 18 },
            { header: "nombre", key: "nombre", width: 28 },
            { header: "presentacion", key: "presentacion", width: 20 },
            { header: "piezas_por_caja", key: "piezas_por_caja", width: 18 },
            { header: "cajas_por_tarima", key: "cajas_por_tarima", width: 18 },
            { header: "ubicacion", key: "ubicacion", width: 24 },
            { header: "unidad", key: "unidad", width: 14 },
          ],
          sampleRow: {
            codigo: "ALM-001",
            dominio: "base",
            nombre: "Tarima estandar",
            presentacion: "Tarima",
            piezas_por_caja: 1,
            cajas_por_tarima: 1,
            ubicacion: "Almacen central",
            unidad: "pzas",
          },
        };

  worksheet.columns = templateConfig.columns;
  worksheet.addRow(templateConfig.sampleRow);
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  triggerBrowserDownload(buffer, templateConfig.fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function getResponsibleVisual(userName) {
  const firstName = normalizeKey(userName).split(" ")[0];
  return RESPONSIBLE_VISUALS[firstName] || RESPONSIBLE_VISUALS.default;
}

export function getRoleBadgeClass(role) {
  const key = normalizeKey(role);
  if (key.includes("lead")) return "master";
  if (key.includes("senior") && key.includes("semi")) return "soft";
  if (key.includes("senior")) return "admin";
  return "standard";
}

export function normalizeRole(role) {
  const key = normalizeKey(role);
  if (key.includes("lead") || key.includes("maestro")) return ROLE_LEAD;
  if (key.includes("semi") || key.includes("ssr")) return ROLE_SSR;
  if (key.includes("senior") || key.includes("administrador")) return ROLE_SR;
  return ROLE_JR;
}

// Un usuario solo puede crear/editar players de su mismo nivel o por debajo.
export function canCreateRole(actorRole, targetRole) {
  const normalizedActorRole = normalizeRole(actorRole);
  const normalizedTargetRole = normalizeRole(targetRole);
  if (normalizedActorRole === ROLE_LEAD) return true;
  if (normalizedActorRole === ROLE_SR) return [ROLE_SR, ROLE_SSR, ROLE_JR].includes(normalizedTargetRole);
  if (normalizedActorRole === ROLE_SSR) return [ROLE_SSR, ROLE_JR].includes(normalizedTargetRole);
  return false;
}

// Todos los roles pueden tener overrides individuales de permisos.
export function supportsManagedPermissionOverrides(_role) {
  return true;
}

export function createUserModalState(overrides = {}) {
  const permissionOverrides = overrides.permissionOverrides ?? EMPTY_OBJECT;
  return {
    open: false,
    mode: "create",
    id: null,
    name: "",
    username: "",
    role: ROLE_JR,
    area: "",
    subArea: "",
    jobTitle: "",
    isActive: "true",
    password: "",
    managerId: "",
    permissionPageId: "",
    submitting: false,
    ...overrides,
    permissionOverrides: {
      pages: { ...(permissionOverrides.pages ?? EMPTY_OBJECT) },
      actions: { ...(permissionOverrides.actions ?? EMPTY_OBJECT) },
    },
    delegationGrants: normalizeDelegationGrants(overrides.delegationGrants ?? overrides.delegation ?? EMPTY_OBJECT),
    delegationPageId: "",
  };
}

export function getManagedUserIds(users, userId) {
  const descendants = new Set();
  let changed = true;

  while (changed) {
    changed = false;
    users.forEach((user) => {
      if (user.id === userId) return;
      if (user.managerId === userId || descendants.has(user.managerId)) {
        if (!descendants.has(user.id)) {
          descendants.add(user.id);
          changed = true;
        }
      }
    });
  }

  return descendants;
}

export function normalizeAreaOption(area) {
  return String(area || "")
    .trim()
    .toUpperCase()
    .replaceAll("\\", "/")
    .replaceAll(" - ", " / ")
    .replaceAll(" > ", " / ")
    .replace(/\s*\/\s*/g, " / ");
}

export function getAreaRoot(area) {
  const normalized = normalizeAreaOption(area);
  if (!normalized) return "";
  return normalized.split("/")[0]?.trim() || "";
}

export function splitAreaAndSubArea(area) {
  const normalized = normalizeAreaOption(area);
  if (!normalized) return { area: "", subArea: "" };
  const parts = normalized.split("/").map((entry) => String(entry || "").trim()).filter(Boolean);
  return {
    area: parts[0] || "",
    subArea: parts.length > 1 ? parts.slice(1).join(" / ") : "",
  };
}

export function joinAreaAndSubArea(area, subArea = "") {
  const normalizedArea = normalizeAreaOption(area);
  const normalizedSubArea = normalizeAreaOption(subArea);
  if (!normalizedArea) return "";
  return normalizedSubArea ? `${normalizedArea} / ${normalizedSubArea}` : normalizedArea;
}

export function normalizeBoardVisibilityType(value) {
  const normalizedValue = String(value || "").trim();
  return ["all", "department", "users"].includes(normalizedValue) ? normalizedValue : "users";
}

export function normalizeBoardSharedDepartments(entries = []) {
  return Array.from(new Set((Array.isArray(entries) ? entries : [])
    .map((entry) => normalizeAreaOption(entry))
    .filter(Boolean)));
}

export function normalizeBoardAccessUserIds(entries = [], ownerId = "") {
  return Array.from(new Set((Array.isArray(entries) ? entries : [])
    .map((entry) => String(entry || "").trim())
    .filter((entry) => entry && entry !== ownerId)));
}

export function normalizeBoardOwnerArea(area) {
  const normalized = normalizeAreaOption(area);
  if (!normalized || normalized === "SIN AREA") return "";
  return normalizeAreaOption(getAreaRoot(normalized) || normalized);
}

export function getNormalizedBoardVisibility(board) {
  const ownerId = String(board?.ownerId || "").trim();
  const visibilityType = normalizeBoardVisibilityType(board?.visibilityType);
  return {
    ownerId,
    visibilityType,
    sharedDepartments: visibilityType === "department" ? normalizeBoardSharedDepartments(board?.sharedDepartments) : [],
    accessUserIds: visibilityType === "users" ? normalizeBoardAccessUserIds(board?.accessUserIds, ownerId) : [],
  };
}

export function doesBoardMatchUserArea(board, user) {
  if (!board || !user) return false;
  const ownerArea = normalizeBoardOwnerArea(board?.settings?.ownerArea || board?.ownerArea || "");
  if (!ownerArea) return true;
  const userAreaRoot = normalizeAreaOption(getAreaRoot(getUserArea(user)) || getUserArea(user));
  return Boolean(userAreaRoot) && userAreaRoot === ownerArea;
}

export function getBoardAssignmentSummary(board, userMap) {
  const visibility = getNormalizedBoardVisibility(board);
  if (visibility.visibilityType === "all") {
    return "Visible para todos";
  }

  if (visibility.visibilityType === "department") {
    return visibility.sharedDepartments.length
      ? `Áreas · ${visibility.sharedDepartments.join(", ")}`
      : "Áreas · Sin área configurada";
  }

  const ownerName = userMap?.get?.(visibility.ownerId)?.name || "Sin player principal";
  const extraNames = visibility.accessUserIds.map((userId) => userMap?.get?.(userId)?.name || "N/A").filter(Boolean);
  return extraNames.length
    ? `Players · ${[ownerName].concat(extraNames).join(", ")}`
    : `Player asignado · ${ownerName}`;
}

export function buildAreaCatalog(users = [], catalog = []) {
  return Array.from(new Set((catalog || []).concat((users || []).map((user) => normalizeAreaOption(getUserArea(user))))).values())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function getUserArea(user) {
  return String(user?.area || user?.department || "").trim();
}

export function getUserJobTitle(user) {
  return String(user?.jobTitle || DEFAULT_JOB_TITLE_BY_ROLE[user?.role] || "").trim();
}

export function hasLeadUser(users) {
  return (users || []).some((user) => normalizeRole(user.role) === ROLE_LEAD);
}

export function normalizeUserRecord(user, fallbackManagerId = null) {
  const role = normalizeRole(user.role);
  const area = String(user.area ?? user.department ?? "").trim();
  const selfIdentityEditCount = Number(user.selfIdentityEditCount ?? 0);
  const username = String(user.email ?? user.username ?? "").trim();
  return {
    ...user,
    email: username,
    role,
    area,
    department: area,
    jobTitle: String(user.jobTitle ?? DEFAULT_JOB_TITLE_BY_ROLE[role] ?? "").trim(),
    password: String(user.password || ""),
    mustChangePassword: Boolean(user.mustChangePassword),
    temporaryPasswordIssuedAt: user.temporaryPasswordIssuedAt || null,
    managerId: user.managerId ?? fallbackManagerId,
    createdById: user.createdById ?? fallbackManagerId,
    selfIdentityEditCount: Number.isFinite(selfIdentityEditCount) ? Math.max(0, selfIdentityEditCount) : 0,
  };
}

export function canBypassSelfProfileEditLimit(user) {
  return (ROLE_LEVEL[normalizeRole(user?.role)] || 0) >= ROLE_LEVEL[ROLE_SR];
}

export function canViewUserByAreaScope(actor, target) {
  if (!actor || !target) return false;
  if (actor.role === ROLE_LEAD) return true;
  if (actor.id === target.id) return true;
  if ([ROLE_SR, ROLE_SSR].includes(actor.role)) {
    const actorAreaRoot = getAreaRoot(getUserArea(actor));
    const targetAreaRoot = getAreaRoot(getUserArea(target));
    return Boolean(actorAreaRoot) && actorAreaRoot === targetAreaRoot;
  }
  return false;
}

export function userMatchesPermissionEntry(user, entry) {
  if (!user || !entry) return false;
  if ((entry.roles || []).includes(user.role)) return true;
  if ((entry.userIds || []).includes(user.id)) return true;
  if ((entry.departments || []).includes(getUserArea(user))) return true;
  return false;
}

const INVENTORY_PAGE_ACCESS_ACTION_IDS = [
  "viewBaseInventory",
  "manageInventory",
  "deleteInventory",
  "importInventory",
  "viewCleaningInventory",
  "manageCleaningInventory",
  "deleteCleaningInventory",
  "importCleaningInventory",
  "viewOrderInventory",
  "manageOrderInventory",
  "deleteOrderInventory",
  "importOrderInventory",
  "viewMaintenanceInventory",
  "manageMaintenanceInventory",
  "deleteMaintenanceInventory",
  "importMaintenanceInventory",
];

export function canAccessPage(user, pageId, permissions) {
  if (pageId === PAGE_DASHBOARD) {
    return canAccessGlobalDashboardPage(user, permissions);
  }
  if (pageId === PAGE_RETAIL) {
    return userHasAnyRetailAreaScope(user, permissions);
  }
  if (resolveCanAccessPage(user, pageId, permissions)) return true;
  if (pageId === PAGE_INVENTORY) {
    return INVENTORY_PAGE_ACCESS_ACTION_IDS.some((actionId) => resolveCanDoAction(user, actionId, permissions));
  }
  return false;
}

export function canDoAction(user, actionId, permissions) {
  return resolveCanDoAction(user, actionId, permissions);
}

const POST_LOGIN_PAGE_PRIORITY = [
  PAGE_CUSTOM_BOARDS,
  PAGE_TRANSPORT,
  PAGE_BIBLIOTECA,
  PAGE_DASHBOARD,
  PAGE_BOARD,
  PAGE_PROCESS_AUDITS,
  PAGE_INCIDENCIAS,
  PAGE_INVENTORY,
  PAGE_HISTORY,
  PAGE_USERS,
  PAGE_ADMIN,
];

export function resolveFirstAccessiblePage(user, permissions) {
  if (!user) return PAGE_DASHBOARD;
  const allowed = NAV_ITEMS
    .filter((item) => item.id !== PAGE_DASHBOARD_BUILDER)
    .filter((item) => canAccessPage(user, item.id, permissions))
    .map((item) => item.id);
  if (!allowed.length) return PAGE_BIBLIOTECA;
  if (normalizeRole(user.role) === ROLE_JR) {
    return allowed.includes(PAGE_CUSTOM_BOARDS) ? PAGE_CUSTOM_BOARDS : allowed[0];
  }
  const preferred = POST_LOGIN_PAGE_PRIORITY.find((pageId) => allowed.includes(pageId));
  return preferred || allowed[0];
}

export function normalizeStoredActivePage(pageId) {
  const resolved = pageId && PAGE_ROUTE_ALIASES[pageId] ? PAGE_ROUTE_ALIASES[pageId] : pageId;
  if (!resolved || resolved === PAGE_DASHBOARD_BUILDER) return PAGE_DASHBOARD;
  if (resolved === PAGE_AREA_SHELL) return PAGE_AREA_SHELL;
  return resolved;
}

export function canUserAccessTemplate(template, user) {
  if (!template || !user) return false;
  if (!template.isCustom) return true;
  if (user.role === ROLE_LEAD) return true;
  if (template.createdById === user.id) return true;
  if (template.visibilityType === "all") return true;
  if (template.visibilityType === "department" && (template.sharedDepartments || []).includes(user.department || "")) return true;
  if (template.visibilityType === "users" && (template.sharedUserIds || []).includes(user.id)) return true;
  return false;
}

export function canManageBoard(user, board) {
  if (!user || !board) return false;
  if (user.role === ROLE_LEAD) return true;
  if (!doesBoardMatchUserArea(board, user)) return false;
  if (board.createdById === user.id || board.ownerId === user.id) return true;
  if (board.visibilityType === "users" && (board.accessUserIds || []).includes(user.id)) return true;
  if (board.visibilityType === "all") return true;
  if (board.visibilityType === "department") {
    const userArea = normalizeAreaOption(getUserArea(user));
    return Boolean(userArea) && (board.sharedDepartments || []).includes(userArea);
  }
  return false;
}

export function canEditBoard(user, board) {
  if (!user || !board) return false;
  if (user.role === ROLE_LEAD) return true;
  return board.createdById === user.id;
}

export function getBoardVisibleToUser(board, user) {
  return canManageBoard(user, board);
}

export function canDoBoardAction(user, board) {
  return canManageBoard(user, board);
}

export function canEditBoardRowRecord(user, board, row, permissions, actionId = "createBoardRow") {
  if (!user || !board || !row) return false;
  if (!canDoBoardAction(user, board)) return false;
  // Lead always has full row edit access on boards they can manage.
  if (normalizeRole(user.role) === ROLE_LEAD) return true;
  if (row.status === STATUS_FINISHED) return false;
  if (!canDoAction(user, actionId, permissions)) return false;
  return true;
}

export function canOperateBoardRowRecord(user, board, row, permissions) {
  return canEditBoardRowRecord(user, board, row, permissions, "boardWorkflow");
}

export function toSelectOption(value, group = "") {
  const normalized = String(value || "").trim();
  return {
    value: normalized,
    label: normalized,
    group,
  };
}

export function buildSelectOptions(field, state, context = {}) {
  if (field.optionSource === "users") {
    return state.users
      .filter((user) => user.isActive)
      .map((user) => ({ value: user.name, label: user.name, group: "Players" }));
  }
  if (field.optionSource === "inventory") {
    return (state.inventoryItems || []).map((item) => ({ value: item.name, label: item.name, group: item.domain || "Inventario" }));
  }
  if (field.optionSource === "catalog") {
    return state.catalog
      .filter((item) => !item.isDeleted)
      .map((item) => ({ value: item.name, label: item.name, group: item.category || "General" }));
  }
  if (field.optionSource === "catalogByCategory") {
    const selectedCategory = String(field.optionCatalogCategory || "").trim();
    const candidates = state.catalog.filter((item) => !item.isDeleted);
    const filteredByCategory = selectedCategory
      ? candidates.filter((item) => String(item.category || "General").trim() === selectedCategory)
      : candidates;
    const hasDayFilter = Number.isFinite(Number(context?.weekdayOffset));
    const weekdayOffset = hasDayFilter ? Number(context.weekdayOffset) : null;
    const cleaningSite = String(context?.cleaningSite || "").trim().toUpperCase();
    const filtered = filteredByCategory
      .filter((item) => isCatalogItemScheduledForDay(item, weekdayOffset, cleaningSite))
      .filter((item) => isCatalogItemAvailableForCleaningSite(item, cleaningSite));
    return filtered.map((item) => ({ value: item.name, label: item.name, group: item.category || "General" }));
  }
  if (field.optionSource === "status") {
    return [STATUS_PENDING, STATUS_RUNNING, STATUS_PAUSED, STATUS_FINISHED].map((value) => toSelectOption(value, "Estados"));
  }
  return (field.options || []).map((value) => toSelectOption(value, "Manual"));
}

export function getWeekName(date) {
  const week = startOfWeek(date);
  const start = formatDate(week);
  const end = formatDate(endOfWeek(date));
  return `Semana ${start} - ${end}`;
}

export function getActivityLabel(activity, catalogMap) {
  return activity.customName || catalogMap.get(activity.catalogActivityId)?.name || "Actividad sin nombre";
}

export function getTimeLimitMinutes(activity, catalogMap) {
  return catalogMap.get(activity.catalogActivityId)?.timeLimitMinutes || 0;
}

/**
 * Calculates how many seconds between `fromMs` and `toMs` fall within
 * the daily work window [startHour, endHour). Handles multi-day spans.
 */
function calcWorkSeconds(fromMs, toMs, startHour, endHour, startMinute = 0, endMinute = 0) {
  if (toMs <= fromMs || startHour >= endHour) return Math.max(0, Math.floor((toMs - fromMs) / 1000));
  const MS_PER_HOUR = 3600000;
  const MS_PER_MINUTE = 60000;
  let total = 0;
  const fromDate = new Date(fromMs);
  const startOfDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  let dayStart = startOfDay.getTime();
  while (dayStart < toMs) {
    const windowOpen = dayStart + startHour * MS_PER_HOUR + startMinute * MS_PER_MINUTE;
    const windowClose = dayStart + endHour * MS_PER_HOUR + endMinute * MS_PER_MINUTE;
    const overlapStart = Math.max(fromMs, windowOpen);
    const overlapEnd = Math.min(toMs, windowClose);
    if (overlapEnd > overlapStart) {
      total += Math.floor((overlapEnd - overlapStart) / 1000);
    }
    dayStart += 86400000;
  }
  return total;
}

export function getEffectiveOperationalNow(now, pauseState, areaKey = "") {
  let effectiveNow = typeof now === "number" ? now : Number(now);
  if (!Number.isFinite(effectiveNow)) {
    effectiveNow = new Date(now).getTime();
  }
  if (!Number.isFinite(effectiveNow)) {
    effectiveNow = Date.now();
  }

  return effectiveNow;
}

function parseOperationalTimestamp(value, referenceNow) {
  if (!value) return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value || "").trim();
  if (!raw) return null;

  const parsed = new Date(raw).getTime();
  if (Number.isFinite(parsed)) return parsed;

  const clockMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!clockMatch) return null;

  const hours = Number(clockMatch[1]);
  const minutes = Number(clockMatch[2]);
  const seconds = Number(clockMatch[3] || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;

  const referenceMs = typeof referenceNow === "number" ? referenceNow : new Date(referenceNow).getTime();
  const base = Number.isFinite(referenceMs) ? new Date(referenceMs) : new Date();
  base.setHours(hours, minutes, seconds, 0);
  return base.getTime();
}

export function getOperationalElapsedSeconds(startTime, now, pauseState, areaKey = "") {
  if (!startTime) return 0;
  const startMs = parseOperationalTimestamp(startTime, now);
  if (!Number.isFinite(startMs)) return 0;
  const effectiveNow = typeof now === "number" ? now : new Date(now).getTime();
  const resolvedNow = Number.isFinite(effectiveNow) ? effectiveNow : Date.now();
  const cappedNow = getEffectiveOperationalNow(resolvedNow, pauseState, areaKey);

  const workHours = resolveWorkHoursForArea(pauseState, areaKey) || {};
  const startHour = Math.min(23, Math.max(0, Math.round(Number(workHours.startHour ?? 0))));
  const startMinute = Math.min(59, Math.max(0, Math.round(Number(workHours.startMinute ?? 0))));
  const endHour = Math.min(24, Math.max(0, Math.round(Number(workHours.endHour ?? 24))));
  const endMinute = Math.min(59, Math.max(0, Math.round(Number(workHours.endMinute ?? 0))));

  return Math.max(0, calcWorkSeconds(startMs, cappedNow, startHour, endHour, startMinute, endMinute));
}

export function resolveWorkHoursForArea(pauseState, areaKey) {
  const alwaysOpen = { startHour: 0, startMinute: 0, endHour: 24, endMinute: 0 };
  if (!areaKey) return alwaysOpen;
  const areaConfig = pauseState?.areaPauseControls?.[areaKey];
  if (areaConfig?.enabled && areaConfig?.workHours) {
    return areaConfig.workHours;
  }
  return alwaysOpen;
}

export function getElapsedSeconds(activity, now, pauseState) {
  if (!activity) return 0;
  const areaKey = String(activity.cleaningSite || activity.area || "").trim().toUpperCase();
  const accumulatedSeconds = Number(activity.accumulatedSeconds || 0);
  if (activity.status !== STATUS_RUNNING) {
    if (activity.status === STATUS_PAUSED) {
      return Math.max(0, accumulatedSeconds);
    }
    // Fallback for legacy finished rows that have start/end but accumulatedSeconds was not persisted.
    if (activity.status === STATUS_FINISHED && accumulatedSeconds <= 0 && activity.startTime && activity.endTime) {
      return Math.max(0, getOperationalElapsedSeconds(activity.startTime, activity.endTime, pauseState, areaKey));
    }
    return Math.max(0, accumulatedSeconds);
  }

  const baselineTimestamp = activity.lastResumedAt || activity.startTime;
  if (!baselineTimestamp) {
    return Math.max(0, accumulatedSeconds);
  }

  // If the row is marked as running but still carries a paused timestamp without a resume marker,
  // do not infer elapsed time from the original start time because that can include paused duration.
  if (!activity.lastResumedAt && activity.pauseStartedAt) {
    return Math.max(0, accumulatedSeconds);
  }

  return Math.max(
    0,
    accumulatedSeconds + getOperationalElapsedSeconds(baselineTimestamp, now, pauseState, areaKey),
  );
}

export function getLivePauseOverflowSeconds(activity, now, pauseState) {
  if (!activity?.pauseStartedAt) return 0;
  const areaKey = String(activity.cleaningSite || activity.area || "").trim().toUpperCase();
  const authorizedPauseSeconds = Math.max(0, Number(activity.pauseAuthorizedSeconds || 0));
  const pausedElapsedSeconds = getOperationalElapsedSeconds(
    activity.pauseStartedAt,
    now,
    pauseState,
    areaKey,
  );
  if (authorizedPauseSeconds <= 0) return Math.max(0, pausedElapsedSeconds);
  return Math.max(0, pausedElapsedSeconds - authorizedPauseSeconds);
}

export function getOperationalDateParts(now = Date.now(), timeZone = "America/Mexico_City") {
  const resolvedDate = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  const fallbackDate = Number.isFinite(resolvedDate.getTime()) ? resolvedDate : new Date();
  const resolvedTimeZone = String(timeZone || "").trim() || "America/Mexico_City";

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: resolvedTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const values = formatter.formatToParts(fallbackDate).reduce((accumulator, entry) => {
      if (entry.type !== "literal") {
        accumulator[entry.type] = entry.value;
      }
      return accumulator;
    }, {});
    const weekdayMap = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const year = Number(values.year);
    const month = Number(values.month);
    const day = Number(values.day);
    const hours = Number(values.hour);
    const minutes = Number(values.minute);

    return {
      year: Number.isFinite(year) ? year : fallbackDate.getFullYear(),
      month: Number.isFinite(month) ? month : fallbackDate.getMonth() + 1,
      day: Number.isFinite(day) ? day : fallbackDate.getDate(),
      hours: Number.isFinite(hours) ? hours : fallbackDate.getHours(),
      minutes: Number.isFinite(minutes) ? minutes : fallbackDate.getMinutes(),
      jsDay: weekdayMap[values.weekday] ?? fallbackDate.getDay(),
      isoDate: `${values.year || fallbackDate.getFullYear()}-${values.month || String(fallbackDate.getMonth() + 1).padStart(2, "0")}-${values.day || String(fallbackDate.getDate()).padStart(2, "0")}`,
    };
  } catch {
    const year = fallbackDate.getFullYear();
    const month = fallbackDate.getMonth() + 1;
    const day = fallbackDate.getDate();
    return {
      year,
      month,
      day,
      hours: fallbackDate.getHours(),
      minutes: fallbackDate.getMinutes(),
      jsDay: fallbackDate.getDay(),
      isoDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    };
  }
}

const SYSTEM_OPERATIONAL_NAVE_KEYS = ["C1", "C2", "C3", "P"];

function normalizeWeekdayOffsetsList(value) {
  const source = Array.isArray(value) ? value : [];
  const unique = new Set();
  source.forEach((entry) => {
    const numeric = Number(entry);
    if (!Number.isInteger(numeric)) return;
    if (numeric < 0 || numeric > 5) return;
    unique.add(numeric);
  });
  return Array.from(unique).sort((left, right) => left - right);
}

function normalizeSystemNaveWeekSchedule(value) {
  const source = value && typeof value === "object" ? value : EMPTY_OBJECT;
  const keys = Object.keys(source).length ? Object.keys(source) : SYSTEM_OPERATIONAL_NAVE_KEYS;
  return keys.reduce((accumulator, areaKey) => {
    const normalizedArea = normalizeAreaOption(getAreaRoot(areaKey) || areaKey);
    if (!normalizedArea) return accumulator;
    const previousDays = Array.isArray(accumulator[normalizedArea]) ? accumulator[normalizedArea] : [];
    const nextDays = normalizeWeekdayOffsetsList(source[areaKey]);
    accumulator[normalizedArea] = normalizeWeekdayOffsetsList(previousDays.concat(nextDays));
    return accumulator;
  }, {});
}

function normalizeSystemNaveWeekSchedules(value) {
  const source = value && typeof value === "object" ? value : EMPTY_OBJECT;
  const normalized = {};
  Object.entries(source).forEach(([weekKey, schedule]) => {
    const normalizedWeekKey = String(weekKey || "").trim();
    if (!normalizedWeekKey) return;
    normalized[normalizedWeekKey] = normalizeSystemNaveWeekSchedule(schedule);
  });
  return normalized;
}

function normalizeSystemPauseReason(reason, fallback = EMPTY_OBJECT) {
  const source = reason && typeof reason === "object" ? reason : EMPTY_OBJECT;
  const fallbackSource = fallback && typeof fallback === "object" ? fallback : EMPTY_OBJECT;
  const numericMinutes = Number(source.authorizedMinutes ?? fallbackSource.authorizedMinutes ?? 0);
  const numericDailyUsageLimit = Number(source.dailyUsageLimit ?? fallbackSource.dailyUsageLimit ?? 0);
  return {
    id: String(source.id || fallbackSource.id || makeId("pause-rule")).trim(),
    label: String(source.label || fallbackSource.label || "Pausa").trim() || "Pausa",
    enabled: Boolean(source.enabled ?? fallbackSource.enabled ?? true),
    affectsTimer: Boolean(source.affectsTimer ?? fallbackSource.affectsTimer ?? false),
    authorizedMinutes: Number.isFinite(numericMinutes) ? Math.max(0, Math.round(numericMinutes)) : 0,
    dailyUsageLimit: Number.isFinite(numericDailyUsageLimit) ? Math.max(0, Math.round(numericDailyUsageLimit)) : 0,
  };
}

function normalizeWorkHoursWithMinutes(source, fallbackStartHour = 0, fallbackEndHour = 24) {
  const data = source && typeof source === "object" ? source : EMPTY_OBJECT;
  const startHourRaw = Number(data.startHour ?? fallbackStartHour);
  const startMinuteRaw = Number(data.startMinute ?? 0);
  const endHourRaw = Number(data.endHour ?? fallbackEndHour);
  const endMinuteRaw = Number(data.endMinute ?? 0);
  return {
    startHour: Number.isFinite(startHourRaw) ? Math.min(23, Math.max(0, Math.round(startHourRaw))) : fallbackStartHour,
    startMinute: Number.isFinite(startMinuteRaw) ? Math.min(59, Math.max(0, Math.round(startMinuteRaw))) : 0,
    endHour: Number.isFinite(endHourRaw) ? Math.min(24, Math.max(0, Math.round(endHourRaw))) : fallbackEndHour,
    endMinute: Number.isFinite(endMinuteRaw) ? Math.min(59, Math.max(0, Math.round(endMinuteRaw))) : 0,
  };
}

export function normalizeSystemOperationalSettings(value) {
  const source = value && typeof value === "object" ? value : EMPTY_OBJECT;
  const defaultReasons = [
    { id: "material", label: "Falta de material", enabled: true, affectsTimer: false, authorizedMinutes: 10, dailyUsageLimit: 0 },
    { id: "operativa", label: "Detención operativa", enabled: true, affectsTimer: true, authorizedMinutes: 0, dailyUsageLimit: 0 },
    { id: "calidad", label: "Ajuste de calidad", enabled: true, affectsTimer: false, authorizedMinutes: 5, dailyUsageLimit: 0 },
  ];
  const incomingReasons = Array.isArray(source.pauseControl?.reasons) ? source.pauseControl.reasons : defaultReasons;
  const seen = new Set();
  const normalizedReasons = incomingReasons
    .map((reason, index) => normalizeSystemPauseReason(reason, defaultReasons[index] || EMPTY_OBJECT))
    .filter((reason) => {
      const key = String(reason.id || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return {
    naveWeekSchedules: normalizeSystemNaveWeekSchedules(source.naveWeekSchedules),
    pauseControl: {
      reasons: normalizedReasons.length ? normalizedReasons : defaultReasons.map((entry) => normalizeSystemPauseReason(entry, entry)),
      areaPauseControls: (() => {
        const areaSource = source.pauseControl?.areaPauseControls && typeof source.pauseControl.areaPauseControls === "object"
          ? source.pauseControl.areaPauseControls
          : EMPTY_OBJECT;
        const keys = Object.keys(areaSource).length ? Object.keys(areaSource) : SYSTEM_OPERATIONAL_NAVE_KEYS;
        return keys.reduce((accumulator, key) => {
          const normalizedArea = normalizeAreaOption(getAreaRoot(key) || key);
          if (!normalizedArea) return accumulator;
          const current = accumulator[normalizedArea] || { enabled: false, workHours: normalizeWorkHoursWithMinutes(EMPTY_OBJECT, 0, 24) };
          const rawAreaSource = areaSource[key] || EMPTY_OBJECT;
          accumulator[normalizedArea] = {
            enabled: Boolean(rawAreaSource?.enabled ?? current.enabled),
            workHours: normalizeWorkHoursWithMinutes(rawAreaSource?.workHours || current.workHours, 0, 24),
          };
          return accumulator;
        }, {});
      })(),
    },
      timeZone: (() => {
        const raw = String(source.timeZone || "").trim();
        return raw || "America/Mexico_City";
      })(),
  };
}

export function buildDemoUsers() {
  const leadId = makeId("usr-demo-lead");
  return [
    {
      id: leadId,
      name: "Demo Lead",
      email: "lead@copmec.local",
      area: "INVENTARIO",
      department: "INVENTARIO",
      jobTitle: "Encargado de area",
      role: ROLE_LEAD,
      isActive: true,
      managerId: null,
      createdById: BOOTSTRAP_MASTER_ID,
    },
    {
      id: makeId("usr-demo-sr"),
      name: "Demo Senior",
      email: "senior@copmec.local",
      area: "PEDIDOS",
      department: "PEDIDOS",
      jobTitle: "Supervisor senior",
      role: ROLE_SR,
      isActive: true,
      managerId: leadId,
      createdById: leadId,
    },
    {
      id: makeId("usr-demo-jr"),
      name: "Demo Player",
      email: "demo@copmec.local",
      area: "INVENTARIO",
      department: "INVENTARIO",
      jobTitle: "Player operativo",
      role: ROLE_JR,
      isActive: true,
      managerId: leadId,
      createdById: leadId,
    },
  ];
}

export function buildSampleState() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const previousWeekStart = addDays(weekStart, -7);
  const oldWeekStart = addDays(weekStart, -14);
  const users = buildDemoUsers();

  const catalog = [
    normalizeCatalogItemRecord({ id: "cat-piso", name: "Piso producción", timeLimitMinutes: 50, isMandatory: true, isDeleted: false, frequency: "daily", category: "Limpieza" }),
    normalizeCatalogItemRecord({ id: "cat-banos", name: "Lavado de baños", timeLimitMinutes: 40, isMandatory: true, isDeleted: false, frequency: "daily", category: "Limpieza" }),
    normalizeCatalogItemRecord({ id: "cat-inspeccion", name: "Inspección nave", timeLimitMinutes: 75, isMandatory: true, isDeleted: false, frequency: "threeTimesWeek", category: "Seguridad" }),
    normalizeCatalogItemRecord({ id: "cat-oficinas", name: "Limpieza oficinas", timeLimitMinutes: 50, isMandatory: true, isDeleted: false, frequency: "weekdays", category: "Limpieza" }),
    normalizeCatalogItemRecord({ id: "cat-comedor", name: "Comedor", timeLimitMinutes: 50, isMandatory: true, isDeleted: false, frequency: "daily", category: "Servicios" }),
    normalizeCatalogItemRecord({ id: "cat-vidrios", name: "Limpieza vidrios", timeLimitMinutes: 50, isMandatory: false, isDeleted: false, frequency: "twiceWeek", category: "Limpieza" }),
    normalizeCatalogItemRecord({ id: "cat-rampas", name: "Revisión de rampas", timeLimitMinutes: 35, isMandatory: false, isDeleted: false, frequency: "weekly", category: "Seguridad" }),
  ];

  const inventoryItems = [
    normalizeInventoryItemRecord({ id: "inv-1", code: "ALM-001", name: "Tarima estándar", presentation: "Tarima", piecesPerBox: 1, boxesPerPallet: 1, domain: INVENTORY_DOMAIN_BASE, stockUnits: 36, minStockUnits: 10, storageLocation: "Almacén central", unitLabel: "pzas" }),
    normalizeInventoryItemRecord({ id: "inv-2", code: "ALM-002", name: "Caja master", presentation: "Paquete", piecesPerBox: 20, boxesPerPallet: 48, domain: INVENTORY_DOMAIN_BASE, stockUnits: 240, minStockUnits: 80, storageLocation: "Racks A-2", unitLabel: "pzas" }),
    normalizeInventoryItemRecord({ id: "inv-3", code: "ALM-003", name: "Playo transparente", presentation: "Rollo", piecesPerBox: 6, boxesPerPallet: 40, domain: INVENTORY_DOMAIN_BASE, stockUnits: 120, minStockUnits: 36, storageLocation: "Racks B-1", unitLabel: "rollos" }),
    normalizeInventoryItemRecord({ id: "inv-4", code: "LIMP-001", name: "Detergente neutro multiusos", presentation: "Bidón 20 L · dilución 1:40", piecesPerBox: 0, boxesPerPallet: 0, domain: INVENTORY_DOMAIN_CLEANING, stockUnits: 12, minStockUnits: 4, cleaningSite: "C3", storageLocation: "Cuarto de limpieza · anaquel 1", unitLabel: "bidones", activityConsumptions: [{ catalogActivityId: "cat-piso", quantity: 1 }, { catalogActivityId: "cat-oficinas", quantity: 1 }] }),
    normalizeInventoryItemRecord({ id: "inv-5", code: "LIMP-002", name: "Papel higiénico jumbo", presentation: "Rollo jumbo 400 m", piecesPerBox: 0, boxesPerPallet: 0, domain: INVENTORY_DOMAIN_CLEANING, stockUnits: 96, minStockUnits: 24, cleaningSite: "C3", storageLocation: "Cuarto de limpieza · rack baños", unitLabel: "rollos", activityConsumptions: [{ catalogActivityId: "cat-banos", quantity: 2 }] }),
    normalizeInventoryItemRecord({ id: "inv-6", code: "PED-001", name: "Esquinero de cartón 2 x 2 x 48", presentation: "", piecesPerBox: 0, boxesPerPallet: 0, domain: INVENTORY_DOMAIN_ORDERS, stockUnits: 150, minStockUnits: 70, storageLocation: "Nave 1 · rack empaque", unitLabel: "pzas" }),
    normalizeInventoryItemRecord({ id: "inv-7", code: "PED-002", name: "Etiqueta térmica 4 x 6", presentation: "", piecesPerBox: 0, boxesPerPallet: 0, domain: INVENTORY_DOMAIN_ORDERS, stockUnits: 28, minStockUnits: 10, storageLocation: "Mesa de surtido · gaveta 2", unitLabel: "rollos" }),
  ];

  const weeks = [
    {
      id: "week-active",
      name: getWeekName(weekStart),
      startDate: weekStart.toISOString(),
      endDate: endOfWeek(weekStart).toISOString(),
      isActive: true,
    },
    {
      id: "week-prev",
      name: getWeekName(previousWeekStart),
      startDate: previousWeekStart.toISOString(),
      endDate: endOfWeek(previousWeekStart).toISOString(),
      isActive: false,
    },
    {
      id: "week-old",
      name: getWeekName(oldWeekStart),
      startDate: oldWeekStart.toISOString(),
      endDate: endOfWeek(oldWeekStart).toISOString(),
      isActive: false,
    },
  ];

  const activities = [];
  const pauseLogs = [];
  const controlRows = [];
  const controlBoards = [];
  const demoLeadUser = users.find((user) => user.role === ROLE_LEAD) || users[0] || null;
  const starterWorkspace = demoLeadUser ? buildStarterWorkspace(demoLeadUser, catalog, inventoryItems, buildDefaultPermissions(), users) : null;

  return {
    system: {
      masterBootstrapEnabled: false,
      masterUsername: MASTER_USERNAME,
      operational: normalizeSystemOperationalSettings(null),
    },
    currentUserId: null,
    areaCatalog: [...DEFAULT_AREA_OPTIONS],
    users,
    weeks: starterWorkspace?.weeks || weeks,
    catalog,
    inventoryItems,
    inventoryColumns: mergeInventoryColumnsWithSystem([]),
    inventoryMovements: [],
    activities: starterWorkspace?.activities || activities,
    pauseLogs: starterWorkspace?.pauseLogs || pauseLogs,
    controlRows: starterWorkspace?.controlRows || controlRows,
    controlBoards: starterWorkspace?.controlBoards || controlBoards,
    boardWeeklyCycle: normalizeBoardWeeklyCycle(null, now),
    boardWeekHistory: [],
    boardTemplates: [],
    permissions: buildDefaultPermissions(),
    auditLog: [],
    processAuditTemplates: [],
    processAudits: [],
  };
}

export function normalizeBoardRowValues(row, timeFieldIds) {
  return Object.entries(row.values || {}).reduce((accumulator, [fieldId, fieldValue]) => {
    accumulator[fieldId] = timeFieldIds.has(fieldId) ? normalizeTimeValue24h(fieldValue) : fieldValue;
    return accumulator;
  }, {});
}

export function normalizeControlBoard(board, users, normalizedPermissions) {
  const timeFieldIds = new Set((board.fields || []).filter((field) => field.type === "time").map((field) => field.id));
  const ownerId = board.ownerId ?? board.createdById ?? users[0]?.id ?? null;
  const visibility = getNormalizedBoardVisibility({
    ...board,
    ownerId,
  });
  const normalizedBoard = {
    ...board,
    createdById: board.createdById ?? users[0]?.id ?? null,
    ownerId,
    visibilityType: visibility.visibilityType,
    sharedDepartments: visibility.sharedDepartments,
    accessUserIds: visibility.accessUserIds,
    settings: withDefaultBoardSettings(board.settings),
    rows: Array.isArray(board.rows)
      ? board.rows.map((row) => ({
          ...row,
          responsibleId: getBoardRowResponsibleIds(row)[0] || "",
          responsibleIds: getBoardRowResponsibleIds(row),
          values: normalizeBoardRowValues(row, timeFieldIds),
        }))
      : [],
  };

  return {
    ...normalizedBoard,
    permissions: normalizeBoardPermissions(board.permissions, normalizedPermissions, normalizedBoard),
  };
}

export function getNormalizedControlBoards(controlBoards, users, normalizedPermissions, sampleState) {
  if (!Array.isArray(controlBoards)) {
    return sampleState.controlBoards;
  }
  return controlBoards.map((board) => normalizeControlBoard(board, users, normalizedPermissions));
}

export function resolveHydratedWorkspaceCollection(parsedCollection, sampleCollection, shouldHydrateDemoWorkspace, requireNonEmpty = false) {
  if (!shouldHydrateDemoWorkspace) return parsedCollection;
  if (!Array.isArray(parsedCollection)) return sampleCollection;
  if (requireNonEmpty && parsedCollection.length === 0) return sampleCollection;
  return parsedCollection;
}

export function buildNormalizedWarehouseState(parsed, sampleState, users, normalizedPermissions, shouldHydrateDemoWorkspace) {
  return {
    ...parsed,
    system: {
      ...(parsed.system || EMPTY_OBJECT),
      masterBootstrapEnabled: parsed.system?.masterBootstrapEnabled ?? !hasLeadUser(users),
      masterUsername: MASTER_USERNAME,
      operational: normalizeSystemOperationalSettings(parsed.system?.operational),
    },
    users,
    areaCatalog: buildAreaCatalog(users, parsed.areaCatalog),
    weeks: resolveHydratedWorkspaceCollection(parsed.weeks, sampleState.weeks, shouldHydrateDemoWorkspace, true),
    catalog: Array.isArray(parsed.catalog) && parsed.catalog.length ? parsed.catalog.map((item) => normalizeCatalogItemRecord(item)) : sampleState.catalog,
    activities: resolveHydratedWorkspaceCollection(parsed.activities, sampleState.activities, shouldHydrateDemoWorkspace, true),
    pauseLogs: resolveHydratedWorkspaceCollection(parsed.pauseLogs, sampleState.pauseLogs, shouldHydrateDemoWorkspace),
    controlRows: resolveHydratedWorkspaceCollection(parsed.controlRows, sampleState.controlRows, shouldHydrateDemoWorkspace, true),
    boardWeeklyCycle: normalizeBoardWeeklyCycle(parsed.boardWeeklyCycle),
    boardWeekHistory: Array.isArray(parsed.boardWeekHistory)
      ? parsed.boardWeekHistory.map((snapshot) => normalizeBoardHistorySnapshot(snapshot))
      : sampleState.boardWeekHistory,
    controlBoards: getNormalizedControlBoards(parsed.controlBoards, users, normalizedPermissions, sampleState),
    inventoryItems: Array.isArray(parsed.inventoryItems) && parsed.inventoryItems.length ? parsed.inventoryItems.map((item) => normalizeInventoryItemRecord(item)) : sampleState.inventoryItems,
    inventoryColumns: mergeInventoryColumnsWithSystem(Array.isArray(parsed.inventoryColumns) ? parsed.inventoryColumns : sampleState.inventoryColumns),
    inventoryMovements: Array.isArray(parsed.inventoryMovements) ? parsed.inventoryMovements : sampleState.inventoryMovements,
    boardTemplates: Array.isArray(parsed.boardTemplates) ? parsed.boardTemplates : [],
    permissions: normalizedPermissions,
    auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
    processAuditTemplates: Array.isArray(parsed.processAuditTemplates) ? parsed.processAuditTemplates : sampleState.processAuditTemplates,
    processAudits: Array.isArray(parsed.processAudits) ? parsed.processAudits : sampleState.processAudits,
  };
}

export function normalizeWarehouseState(parsed) {
  if (!parsed) return buildSampleState();
  const sampleState = buildSampleState();
  const shouldHydrateDemoWorkspace = !Array.isArray(parsed.users) || parsed.users.length === 0;
  const sourceUsers = shouldHydrateDemoWorkspace ? sampleState.users : parsed.users;
  const users = sourceUsers.map((user) => normalizeUserRecord(user, user.managerId ?? parsed.currentUserId ?? null));
  const normalizedPermissions = normalizePermissions(remapPermissionsModel(parsed.permissions, users));
  const normalizedState = buildNormalizedWarehouseState(parsed, sampleState, users, normalizedPermissions, shouldHydrateDemoWorkspace);

  return applyBoardWeeklyCutToState(normalizedState).state;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSampleState();
    const parsed = JSON.parse(raw);
    if (!parsed) return buildSampleState();
    return normalizeWarehouseState(parsed);
  } catch {
    return buildSampleState();
  }
}

export function buildWeekActivities(weekId, catalog, users) {
  const activeUsers = users.filter((user) => user.isActive);
  const baseDate = startOfWeek(new Date());
  let assigneeIndex = 0;

  return catalog
    .filter((item) => !item.isDeleted)
    .flatMap((item) => {
      const responsible = activeUsers[assigneeIndex % activeUsers.length] || users[0] || null;
      assigneeIndex += 1;
      return buildWeekActivitiesFromCatalogItem(weekId, item, baseDate, responsible?.id || null);
    })
    .sort((left, right) => new Date(left.activityDate) - new Date(right.activityDate));
}

export function buildStarterWorkspace(leadUser, catalog, inventoryItems, permissions, workspaceUsers = [leadUser]) {
  const now = new Date();
  const activeWeekStart = startOfWeek(now);
  const previousWeekStart = addDays(activeWeekStart, -7);
  const activityUsers = Array.isArray(workspaceUsers) && workspaceUsers.length ? workspaceUsers : [leadUser];
  const weeks = [
    {
      id: makeId("week"),
      name: getWeekName(activeWeekStart),
      startDate: activeWeekStart.toISOString(),
      endDate: endOfWeek(activeWeekStart).toISOString(),
      isActive: true,
    },
    {
      id: makeId("week"),
      name: getWeekName(previousWeekStart),
      startDate: previousWeekStart.toISOString(),
      endDate: endOfWeek(previousWeekStart).toISOString(),
      isActive: false,
    },
  ];

  const activeActivities = buildWeekActivities(weeks[0].id, catalog, activityUsers).map((activity, index) => {
    const startTime = isoAt(addDays(activeWeekStart, index % 5), 8 + (index % 3), 0);
    const durationSeconds = [32, 46, 18, 64, 27, 41, 53][index % 7] * 60;
    if (index === 1) {
      return {
        ...activity,
        status: STATUS_RUNNING,
        startTime,
        lastResumedAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
        accumulatedSeconds: 12 * 60,
      };
    }
    if (index === 2) {
      return {
        ...activity,
        status: STATUS_PAUSED,
        startTime,
        accumulatedSeconds: 28 * 60,
        lastResumedAt: null,
      };
    }
    return {
      ...activity,
      status: STATUS_FINISHED,
      startTime,
      endTime: new Date(new Date(startTime).getTime() + durationSeconds * 1000).toISOString(),
      accumulatedSeconds: durationSeconds,
      lastResumedAt: null,
    };
  });

  const previousActivities = buildWeekActivities(weeks[1].id, catalog, activityUsers).map((activity, index) => {
    const startTime = isoAt(addDays(previousWeekStart, index % 5), 7 + (index % 2), 30);
    const durationSeconds = [38, 55, 43, 62, 34, 48, 58][index % 7] * 60;
    return {
      ...activity,
      status: STATUS_FINISHED,
      startTime,
      endTime: new Date(new Date(startTime).getTime() + durationSeconds * 1000).toISOString(),
      accumulatedSeconds: durationSeconds,
      lastResumedAt: null,
    };
  });

  const pauseLogs = [
    {
      id: makeId("pause"),
      weekActivityId: activeActivities[1]?.id,
      pauseReason: "Faltante de material",
      pausedAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      resumedAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      pauseDurationSeconds: 6 * 60,
    },
    {
      id: makeId("pause"),
      weekActivityId: activeActivities[2]?.id,
      pauseReason: "Ajuste de proceso",
      pausedAt: new Date(Date.now() - 36 * 60 * 1000).toISOString(),
      resumedAt: null,
      pauseDurationSeconds: 8 * 60,
    },
  ].filter((entry) => entry.weekActivityId);

  const sampleBoardTemplate = BOARD_TEMPLATES.find((template) => template.id === "surtido") || BOARD_TEMPLATES[0];
  const sampleFields = buildTemplateColumns(sampleBoardTemplate);
  const inventoryIds = (inventoryItems || []).map((item) => item.id);
  const skuField = sampleFields.find((field) => field.type === "inventoryLookup");
  const askedField = sampleFields.find((field) => normalizeKey(field.label).includes("pedidas") || normalizeKey(field.label).includes("objetivo"));
  const suppliedField = sampleFields.find((field) => normalizeKey(field.label).includes("surtidas") || normalizeKey(field.label).includes("reales"));
  const routeField = sampleFields.find((field) => normalizeKey(field.label).includes("ruta"));
  const priorityField = sampleFields.find((field) => normalizeKey(field.label).includes("prioridad"));

  const boardRows = [
    { status: STATUS_FINISHED, asked: 12, supplied: 12, route: "Ruta Norte", priority: "Alta", inventoryId: inventoryIds[0], accumulatedSeconds: 54 * 60 },
    { status: STATUS_RUNNING, asked: 8, supplied: 5, route: "Ruta Centro", priority: "Media", inventoryId: inventoryIds[1] || inventoryIds[0], accumulatedSeconds: 26 * 60 },
    { status: STATUS_PENDING, asked: 14, supplied: 0, route: "Ruta Sur", priority: "Alta", inventoryId: inventoryIds[2] || inventoryIds[0], accumulatedSeconds: 0 },
  ].map((sample, index) => {
    const values = sampleFields.reduce((accumulator, field) => {
      accumulator[field.id] = getBoardFieldDefaultValue(field, leadUser.id);
      return accumulator;
    }, {});

    if (skuField) values[skuField.id] = sample.inventoryId || "";
    if (askedField) values[askedField.id] = sample.asked;
    if (suppliedField) values[suppliedField.id] = sample.supplied;
    if (routeField) values[routeField.id] = sample.route;
    if (priorityField) values[priorityField.id] = sample.priority;

    return {
      id: makeId("row"),
      values,
      responsibleId: leadUser.id,
      status: sample.status,
      startTime: sample.status === STATUS_PENDING ? null : isoAt(addDays(activeWeekStart, index), 9, 0),
      endTime: sample.status === STATUS_FINISHED ? isoAt(addDays(activeWeekStart, index), 9, 54) : null,
      accumulatedSeconds: sample.accumulatedSeconds,
      lastResumedAt: sample.status === STATUS_RUNNING ? new Date(Date.now() - 12 * 60 * 1000).toISOString() : null,
      createdAt: isoAt(addDays(activeWeekStart, index), 8, 40),
    };
  });

  const board = {
    id: makeId("board"),
    name: sampleBoardTemplate?.name || "Surtido inicial",
    description: sampleBoardTemplate?.description || "Tablero inicial de operación para COPMEC.",
    createdById: leadUser.id,
    ownerId: leadUser.id,
    accessUserIds: [],
    settings: {
      ...withDefaultBoardSettings(sampleBoardTemplate?.settings),
      auxColumnsOrder: [...DEFAULT_BOARD_AUX_COLUMNS_ORDER],
    },
    fields: sampleFields,
    rows: boardRows,
  };

  const controlRows = [
    { id: makeId("ctrl"), product: "200 Billion Probiotics", pallets: 2, boxes: 10, responsibleId: leadUser.id, status: "Terminado" },
    { id: makeId("ctrl"), product: "3 Mag Blend", pallets: 1, boxes: 5, responsibleId: leadUser.id, status: "En curso" },
    { id: makeId("ctrl"), product: "60 Billion Probiotics", pallets: 0, boxes: 0, responsibleId: leadUser.id, status: "Pendiente" },
  ];

  return {
    weeks,
    activities: activeActivities.concat(previousActivities),
    pauseLogs,
    controlRows,
    controlBoards: [{ ...board, permissions: buildBoardPermissions(permissions, board) }],
  };
}

export function updateElapsedForFinish(activity, nowIso, pauseState) {
  if (!activity) return 0;
  if (activity.status !== STATUS_RUNNING) {
    return Math.max(0, Number(activity.accumulatedSeconds || 0));
  }
  const baselineTimestamp = activity.lastResumedAt || activity.startTime;
  if (!baselineTimestamp) {
    return Math.max(0, Number(activity.accumulatedSeconds || 0));
  }
  return getElapsedSeconds(
    {
      ...activity,
      status: STATUS_RUNNING,
      lastResumedAt: baselineTimestamp,
    },
    nowIso,
    pauseState,
  );
}


