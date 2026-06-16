export const CATALOG_AUTO_LIMITS_MIN_WEEKS = 3;
export const CATALOG_AUTO_LIMITS_MAX_WEEKS = 30;
export const CATALOG_AUTO_LIMITS_ROUND_STEP = 5;

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function roundMinutesToScaleOfFiveCeil(minutes) {
  const numeric = Number(minutes);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return CATALOG_AUTO_LIMITS_ROUND_STEP;
  }
  return Math.max(
    CATALOG_AUTO_LIMITS_ROUND_STEP,
    Math.ceil(numeric / CATALOG_AUTO_LIMITS_ROUND_STEP) * CATALOG_AUTO_LIMITS_ROUND_STEP,
  );
}

export function roundMinutesPerBoxCeil(minutes) {
  const numeric = Number(minutes);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0.5;
  }
  return Math.max(0.5, Math.ceil(numeric * 2) / 2);
}

function findBoardActivityListField(fields = []) {
  return (fields || []).find((field) => field?.type === "select" && field?.optionSource === "catalogByCategory") || null;
}

function resolveBoardRowCatalogActivityId(board, row, catalog = []) {
  const directCatalogActivityId = String(row?.catalogActivityId || row?.values?.catalogActivityId || "").trim();
  if (directCatalogActivityId) return directCatalogActivityId;

  const activityListField = findBoardActivityListField(board?.fields || []);
  const activityName = activityListField ? String(row?.values?.[activityListField.id] || "").trim() : "";
  if (!activityName) return "";

  return String((catalog || []).find((item) => normalizeKey(item?.name) === normalizeKey(activityName))?.id || "").trim();
}

function isFinishedRow(row) {
  const status = normalizeKey(row?.status);
  return status === "terminado" || status === "finished" || status === "completado";
}

function getFinishedRowDurationSeconds(row) {
  if (!isFinishedRow(row)) return null;
  const accumulated = Number(row?.accumulatedSeconds || 0);
  if (Number.isFinite(accumulated) && accumulated > 0) {
    return Math.max(0, accumulated);
  }
  if (row?.startTime && row?.endTime) {
    const startMs = new Date(row.startTime).getTime();
    const endMs = new Date(row.endTime).getTime();
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      return Math.max(0, Math.round((endMs - startMs) / 1000));
    }
  }
  return null;
}

function isCleaningCatalogItem(item) {
  if (!item || item.isDeleted) return false;
  const area = normalizeKey(item?.area || "");
  const category = normalizeKey(item?.category || "");
  return area.includes("limpieza") || category.includes("limpieza");
}

function isMaintenanceCatalogItem(item) {
  if (!item || item.isDeleted) return false;
  const area = normalizeKey(item?.area || "");
  const category = normalizeKey(item?.category || "");
  return area.includes("mantenimiento") || category.includes("mantenimiento") || area.includes("maintenance") || category.includes("maintenance");
}

function isAutoLimitCatalogItem(item) {
  return isCleaningCatalogItem(item) || isMaintenanceCatalogItem(item);
}

function isCleaningBoard(board) {
  const ownerArea = normalizeKey(board?.settings?.ownerArea || board?.ownerArea || "");
  const sharedDepartments = Array.isArray(board?.sharedDepartments)
    ? board.sharedDepartments.map((entry) => normalizeKey(entry)).join(" ")
    : "";
  const contextType = normalizeKey(board?.settings?.operationalContextType || "");
  const nameBlob = [board?.name, board?.category, board?.description, ownerArea, sharedDepartments]
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
  return contextType === "cleaningsite" || nameBlob.includes("limpieza") || nameBlob.includes("cleaning");
}

function isMaintenanceBoard(board) {
  if (isCleaningBoard(board)) return false;
  const ownerArea = normalizeKey(board?.settings?.ownerArea || board?.ownerArea || "");
  const sharedDepartments = Array.isArray(board?.sharedDepartments)
    ? board.sharedDepartments.map((entry) => normalizeKey(entry)).join(" ")
    : "";
  const systemTemplateId = normalizeKey(board?.settings?.systemBoardTemplateId || "");
  const nameBlob = [board?.name, board?.category, board?.description, ownerArea, sharedDepartments]
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
  return systemTemplateId === "operational-inspection-v1"
    || ownerArea.includes("mantenimiento")
    || nameBlob.includes("mantenimiento")
    || nameBlob.includes("maintenance");
}

function isAutoLimitBoard(board) {
  return isCleaningBoard(board) || isMaintenanceBoard(board);
}

function collectRecentWeekKeys(state) {
  const activeWeekKey = String(state?.boardWeeklyCycle?.activeWeekKey || "").trim();
  const historyWeekKeys = (Array.isArray(state?.boardWeekHistory) ? state.boardWeekHistory : [])
    .map((snapshot) => String(snapshot?.weekKey || "").trim())
    .filter(Boolean);
  const unique = Array.from(new Set([activeWeekKey, ...historyWeekKeys].filter(Boolean))).sort();
  if (unique.length <= CATALOG_AUTO_LIMITS_MAX_WEEKS) return new Set(unique);
  return new Set(unique.slice(unique.length - CATALOG_AUTO_LIMITS_MAX_WEEKS));
}

function buildAutomationFingerprint(state) {
  const activeWeekKey = String(state?.boardWeeklyCycle?.activeWeekKey || "").trim();
  const historyCount = Array.isArray(state?.boardWeekHistory) ? state.boardWeekHistory.length : 0;
  const finishedCount = (Array.isArray(state?.controlBoards) ? state.controlBoards : []).reduce((sum, board) => {
    if (!isAutoLimitBoard(board)) return sum;
    return sum + (board.rows || []).filter((row) => isFinishedRow(row)).length;
  }, 0);
  return `${activeWeekKey}|${historyCount}|${finishedCount}`;
}

function ingestFinishedRowSample(samplesByCatalogId, catalogId, weekKey, durationSeconds) {
  if (!catalogId || !weekKey || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
  if (!samplesByCatalogId.has(catalogId)) {
    samplesByCatalogId.set(catalogId, {
      durationSecondsTotal: 0,
      sampleCount: 0,
      weeks: new Set(),
    });
  }
  const bucket = samplesByCatalogId.get(catalogId);
  bucket.durationSecondsTotal += durationSeconds;
  bucket.sampleCount += 1;
  bucket.weeks.add(weekKey);
}

function collectCatalogDurationSamples(state, allowedWeekKeys) {
  const catalog = Array.isArray(state?.catalog) ? state.catalog : [];
  const samplesByCatalogId = new Map();
  const activeWeekKey = String(state?.boardWeeklyCycle?.activeWeekKey || "").trim();

  (Array.isArray(state?.boardWeekHistory) ? state.boardWeekHistory : []).forEach((snapshot) => {
    const weekKey = String(snapshot?.weekKey || "").trim();
    if (!weekKey || !allowedWeekKeys.has(weekKey)) return;
    const board = {
      fields: snapshot?.fields || [],
      settings: snapshot?.settings || {},
      name: snapshot?.boardName || snapshot?.name || "",
      category: snapshot?.category || "",
      description: snapshot?.description || "",
      sharedDepartments: snapshot?.sharedDepartments || [],
    };
    if (!isAutoLimitBoard(board)) return;
    (snapshot?.rows || []).forEach((row) => {
      const catalogId = resolveBoardRowCatalogActivityId(board, row, catalog);
      const durationSeconds = getFinishedRowDurationSeconds(row);
      if (!catalogId || durationSeconds === null) return;
      ingestFinishedRowSample(samplesByCatalogId, catalogId, weekKey, durationSeconds);
    });
  });

  (Array.isArray(state?.controlBoards) ? state.controlBoards : []).forEach((board) => {
    if (!isAutoLimitBoard(board) || !activeWeekKey || !allowedWeekKeys.has(activeWeekKey)) return;
    (board?.rows || []).forEach((row) => {
      const catalogId = resolveBoardRowCatalogActivityId(board, row, catalog);
      const durationSeconds = getFinishedRowDurationSeconds(row);
      if (!catalogId || durationSeconds === null) return;
      ingestFinishedRowSample(samplesByCatalogId, catalogId, activeWeekKey, durationSeconds);
    });
  });

  return { catalog, samplesByCatalogId };
}

export function applyCatalogAutoTimeLimits(state, options = {}) {
  const force = Boolean(options.force);
  const fingerprint = buildAutomationFingerprint(state);
  const previousMeta = state?.catalogAutoLimits && typeof state.catalogAutoLimits === "object"
    ? state.catalogAutoLimits
    : {};
  if (!force && String(previousMeta.lastFingerprint || "") === fingerprint) {
    return { state, changed: false, updates: [] };
  }

  const allowedWeekKeys = collectRecentWeekKeys(state);
  const { catalog, samplesByCatalogId } = collectCatalogDurationSamples(state, allowedWeekKeys);
  const updates = [];
  let changed = false;

  const nextCatalog = (catalog || []).map((item) => {
    if (!isAutoLimitCatalogItem(item)) return item;
    const bucket = samplesByCatalogId.get(item.id);
    if (!bucket || bucket.sampleCount <= 0) return item;

    const sampleWeeks = bucket.weeks.size;
    if (sampleWeeks < CATALOG_AUTO_LIMITS_MIN_WEEKS) return item;

    const avgMinutes = (bucket.durationSecondsTotal / bucket.sampleCount) / 60;
    const suggestedLimit = roundMinutesToScaleOfFiveCeil(avgMinutes);
    const currentLimit = Math.max(0, Number(item.timeLimitMinutes || 0));
    if (!suggestedLimit || suggestedLimit === currentLimit) return item;

    changed = true;
    updates.push({
      catalogId: item.id,
      name: item.name,
      previousLimitMinutes: currentLimit,
      nextLimitMinutes: suggestedLimit,
      avgMinutes,
      sampleCount: bucket.sampleCount,
      sampleWeeks,
    });

    return {
      ...item,
      timeLimitMinutes: suggestedLimit,
      autoLimitMeta: {
        avgMinutes: Number(avgMinutes.toFixed(2)),
        sampleCount: bucket.sampleCount,
        sampleWeeks,
        previousLimitMinutes: currentLimit,
        updatedAt: new Date().toISOString(),
        roundedToStep: CATALOG_AUTO_LIMITS_ROUND_STEP,
      },
    };
  });

  if (!changed) {
    return {
      state: {
        ...state,
        catalogAutoLimits: {
          ...previousMeta,
          lastFingerprint: fingerprint,
          lastRunAt: new Date().toISOString(),
          updates: [],
        },
      },
      changed: false,
      updates: [],
    };
  }

  return {
    state: {
      ...state,
      catalog: nextCatalog,
      catalogAutoLimits: {
        lastFingerprint: fingerprint,
        lastRunAt: new Date().toISOString(),
        minWeeks: CATALOG_AUTO_LIMITS_MIN_WEEKS,
        maxWeeks: CATALOG_AUTO_LIMITS_MAX_WEEKS,
        roundStep: CATALOG_AUTO_LIMITS_ROUND_STEP,
        updates,
      },
    },
    changed: true,
    updates,
  };
}
