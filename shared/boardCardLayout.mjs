export const DEFAULT_BOARD_CARD_SLOT_ORDER = ["info", "player", "timeline", "status", "actions", "lotExpiry", "labelLab", "meta"];

export function normalizeFieldLabelKey(label = "") {
  return String(label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isBoardFinishGateField(field) {
  if (!field || typeof field !== "object") return false;
  if (String(field.layoutBlockRole || "").trim() === "finishGate") return true;

  const key = normalizeFieldLabelKey(field.label);
  if (!key) return false;

  const looksLikeCompletionQuestion = /termin/.test(key) && /activid/.test(key);
  if (field.type === "boolean" && /termin/.test(key)) return true;
  if (looksLikeCompletionQuestion) return true;

  if (field.type === "select" && Array.isArray(field.options)) {
    const options = field.options.map((option) => normalizeFieldLabelKey(option));
    const hasYesNo = options.includes("si") && options.includes("no");
    if (hasYesNo && looksLikeCompletionQuestion) return true;
  }

  return false;
}

export function isBoardActivityPrimaryField(field) {
  if (!field || typeof field !== "object" || isBoardFinishGateField(field)) return false;

  const explicitRole = String(field.layoutBlockRole || "").trim();
  if (explicitRole === "finishGate") return false;
  if (explicitRole === "activity") return true;
  if (explicitRole && explicitRole !== "activity") return false;

  const key = normalizeFieldLabelKey(field.label);
  if (key === "tarima") return true;
  if (key === "actividad" || key.startsWith("actividad/") || key.startsWith("actividad ")) return true;
  if (field.type === "select" && field.optionSource === "catalogByCategory") return true;
  if (field.type === "activityList") return true;

  return false;
}

export function resolveBoardFieldLayoutRole(field) {
  if (isBoardFinishGateField(field)) return "finishGate";
  if (isBoardActivityPrimaryField(field)) return "activity";

  const key = normalizeFieldLabelKey(field?.label);
  if (key.includes("fecha") || key.includes("date")) return "date";
  if (key.includes("inicio") || key.includes("start") || key.includes("arranc")) return "start";
  if (key.includes("fin") || key.includes("end") || key.includes("cierre")) return "end";
  if (field?.type === "date") return "date";
  if (field?.type === "time") {
    if (key.includes("fin") || key.includes("end") || key.includes("termin")) return "end";
    return "start";
  }
  if (field?.type === "inventoryProperty") {
    const inventoryProperty = String(field.inventoryProperty || "").trim();
    if (inventoryProperty === "lot") return "lot";
    if (inventoryProperty === "expiry") return "expiry";
    if (inventoryProperty === "label") return "labelTag";
  }
  if (key === "lote" || key.startsWith("lote ")) return "lot";
  if (key.includes("caducidad") || key.includes("vencim")) return "expiry";
  if (key === "etiqueta" || key.startsWith("etiqueta")) return "labelTag";
  if (key === "laboratorio" || key.includes("laboratorio")) return "laboratory";
  return "";
}

export function inferBoardFieldLayoutRole(field) {
  const explicitRole = String(field?.layoutBlockRole || "").trim();
  if (explicitRole === "finishGate" || isBoardFinishGateField(field)) return "finishGate";
  if (explicitRole === "activity" && isBoardActivityPrimaryField(field)) return "activity";
  if (explicitRole && !isBoardFinishGateField(field) && explicitRole !== "activity") return explicitRole;
  return resolveBoardFieldLayoutRole(field);
}

export function findBoardFinishGateField(fields = []) {
  return (Array.isArray(fields) ? fields : []).find((field) => isBoardFinishGateField(field)) || null;
}

export function isBoardFinishGateValueEnabled(rawValue) {
  const normalized = normalizeFieldLabelKey(String(rawValue ?? "").trim());
  return normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1";
}

export function canUserEditBoardFinishGate(user, board, field, options = {}) {
  const userId = String(user?.id || "").trim();
  if (!userId) return false;

  const canManage = Boolean(options.canManageDashboardState);
  if (canManage) return true;

  const ownerId = String(board?.ownerId || "").trim();
  if (ownerId && ownerId === userId) return true;

  const fieldEditors = Array.isArray(field?.finishGateEditorUserIds)
    ? field.finishGateEditorUserIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (fieldEditors.includes(userId)) return true;

  const boardEditors = Array.isArray(board?.settings?.finishGateAuthorizedUserIds)
    ? board.settings.finishGateAuthorizedUserIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (boardEditors.includes(userId)) return true;

  return false;
}

function boardHasLotExpiryFields(fields = []) {
  return fields.some((field) => {
    const role = inferBoardFieldLayoutRole(field);
    if (role === "lot" || role === "expiry") return true;
    return field?.type === "inventoryProperty"
      && ["lot", "expiry"].includes(String(field.inventoryProperty || "").trim());
  });
}

function boardHasLabelLabFields(fields = []) {
  return fields.some((field) => {
    const role = inferBoardFieldLayoutRole(field);
    if (role === "labelTag" || role === "laboratory") return true;
    return field?.type === "inventoryProperty" && String(field.inventoryProperty || "").trim() === "label";
  });
}

function syncBoardCardHiddenSlots(fields, rawLayout = {}) {
  const rawHidden = Array.isArray(rawLayout.hiddenSlots)
    ? rawLayout.hiddenSlots.filter((slotId) => slotId !== "info" && DEFAULT_BOARD_CARD_SLOT_ORDER.includes(slotId))
    : [];
  const nextHidden = new Set(rawHidden);

  if (!boardHasLotExpiryFields(fields)) {
    nextHidden.add("lotExpiry");
  } else if (!rawHidden.includes("lotExpiry")) {
    nextHidden.delete("lotExpiry");
  }

  if (!boardHasLabelLabFields(fields)) {
    nextHidden.add("labelLab");
  } else if (!rawHidden.includes("labelLab")) {
    nextHidden.delete("labelLab");
  }

  return [...nextHidden];
}

export function ensureBoardCardLayout(board) {
  if (!board || typeof board !== "object") return board;

  const sourceFields = Array.isArray(board.fields)
    ? board.fields
    : Array.isArray(board.columns)
      ? board.columns
      : [];

  let fieldsChanged = false;
  const fields = sourceFields.map((field) => {
    const nextField = { ...field };
    const inferredRole = resolveBoardFieldLayoutRole(nextField);
    const previousRole = String(nextField.layoutBlockRole || "").trim();
    if (inferredRole) {
      if (previousRole !== inferredRole) fieldsChanged = true;
      nextField.layoutBlockRole = inferredRole;
    } else if (previousRole) {
      fieldsChanged = true;
      delete nextField.layoutBlockRole;
    }
    return nextField;
  });

  const settings = board.settings && typeof board.settings === "object" ? { ...board.settings } : {};
  let settingsChanged = false;
  if (settings.useBoardCardsView === undefined) {
    settings.useBoardCardsView = true;
    settingsChanged = true;
  }

  const rawLayout = settings.cleaningCardLayout && typeof settings.cleaningCardLayout === "object"
    ? settings.cleaningCardLayout
    : {};

  const slotOrder = Array.isArray(rawLayout.slotOrder) && rawLayout.slotOrder.length
    ? [...rawLayout.slotOrder]
    : [...DEFAULT_BOARD_CARD_SLOT_ORDER];
  DEFAULT_BOARD_CARD_SLOT_ORDER.forEach((slotId) => {
    if (slotOrder.includes(slotId)) return;
    const defaultIndex = DEFAULT_BOARD_CARD_SLOT_ORDER.indexOf(slotId);
    let insertAt = slotOrder.length;
    for (let index = defaultIndex + 1; index < DEFAULT_BOARD_CARD_SLOT_ORDER.length; index += 1) {
      const nextSlotId = DEFAULT_BOARD_CARD_SLOT_ORDER[index];
      const existingIndex = slotOrder.indexOf(nextSlotId);
      if (existingIndex !== -1) {
        insertAt = existingIndex;
        break;
      }
    }
    slotOrder.splice(insertAt, 0, slotId);
  });

  const hiddenSlots = syncBoardCardHiddenSlots(fields, rawLayout);

  const lineItemOrder = Array.isArray(rawLayout.lineItemOrder)
    ? rawLayout.lineItemOrder.map((key) => String(key || "").trim()).filter(Boolean)
    : [];

  const nextLayout = { slotOrder, hiddenSlots, lineItemOrder };
  const layoutChanged = JSON.stringify(rawLayout) !== JSON.stringify(nextLayout);

  if (!fieldsChanged && !layoutChanged && !settingsChanged) {
    return board;
  }

  return {
    ...board,
    fields,
    settings: {
      ...settings,
      cleaningCardLayout: nextLayout,
    },
  };
}

export function formatBoardOperationalDateLabel(isoDateKey = "") {
  const safeKey = String(isoDateKey || "").trim();
  if (!safeKey) return "";
  const match = safeKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return safeKey;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return safeKey;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
