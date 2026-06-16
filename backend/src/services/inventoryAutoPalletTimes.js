import {
  CATALOG_AUTO_LIMITS_MIN_WEEKS,
  CATALOG_AUTO_LIMITS_MAX_WEEKS,
  CATALOG_AUTO_LIMITS_ROUND_STEP,
  roundMinutesToScaleOfFiveCeil,
  roundMinutesPerBoxCeil,
} from "./catalogAutoTimeLimits.js";

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeInventoryDomain(value) {
  const key = normalizeKey(value);
  if (["cleaning", "limpieza", "clean"].includes(key)) return "cleaning";
  if (["orders", "order", "pedidos", "pedido"].includes(key)) return "orders";
  if (["maintenance", "mantenimiento"].includes(key)) return "maintenance";
  return "base";
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

function isPalletReviewBoard(board) {
  const systemTemplateId = normalizeKey(board?.settings?.systemBoardTemplateId || "");
  if (systemTemplateId === "revision-tarimas") return true;
  const nameBlob = [board?.name, board?.category, board?.description]
    .map((entry) => normalizeKey(entry))
    .filter(Boolean)
    .join(" ");
  return nameBlob.includes("revision") && nameBlob.includes("tarima");
}

function findBoardInventoryLookupField(fields = []) {
  const list = Array.isArray(fields) ? fields : [];
  return list.find((field) => normalizeKey(field?.templateKey) === "productorevisiontarima")
    || list.find((field) => normalizeKey(field?.type) === "inventorylookup")
    || null;
}

function findBoardBoxesReviewedField(fields = []) {
  const list = Array.isArray(fields) ? fields : [];
  return list.find((field) => normalizeKey(field?.templateKey) === "cajasrevisadasrevision")
    || list.find((field) => {
      const label = normalizeKey(field?.label || field?.name || "");
      return label.includes("cajas") && label.includes("revis");
    })
    || null;
}

function resolveBoardRowBoxesToReview(board, row) {
  const boxesField = findBoardBoxesReviewedField(board?.fields || []);
  if (!boxesField) return 0;
  const rawValue = row?.values?.[boxesField.id];
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
}

function resolveBoardRowInventoryProductId(board, row, inventoryItems = []) {
  const lookupField = findBoardInventoryLookupField(board?.fields || []);
  if (!lookupField) return "";
  const rawValue = String(row?.values?.[lookupField.id] || "").trim();
  if (!rawValue) return "";

  const baseItems = (inventoryItems || []).filter((item) => normalizeInventoryDomain(item?.domain) === "base");
  const direct = baseItems.find((item) => item.id === rawValue);
  if (direct) return direct.id;

  const normalizedValue = normalizeKey(rawValue);
  const match = baseItems.find((item) => (
    normalizeKey(item.id) === normalizedValue
    || normalizeKey(item.code) === normalizedValue
    || normalizeKey(item.name) === normalizedValue
  ));
  return match?.id || "";
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
    if (!isPalletReviewBoard(board)) return sum;
    return sum + (board.rows || []).filter((row) => isFinishedRow(row)).length;
  }, 0);
  return `${activeWeekKey}|${historyCount}|${finishedCount}`;
}

function ingestPalletSample(samplesByInventoryId, inventoryId, weekKey, durationSeconds, boxesReviewed = 0) {
  if (!inventoryId || !weekKey || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
  if (!samplesByInventoryId.has(inventoryId)) {
    samplesByInventoryId.set(inventoryId, {
      durationSecondsTotal: 0,
      sampleCount: 0,
      weeks: new Set(),
      boxRateSecondsTotal: 0,
      boxSampleCount: 0,
    });
  }
  const bucket = samplesByInventoryId.get(inventoryId);
  bucket.durationSecondsTotal += durationSeconds;
  bucket.sampleCount += 1;
  bucket.weeks.add(weekKey);
  const boxes = Math.max(0, Number(boxesReviewed || 0));
  if (boxes > 0) {
    bucket.boxRateSecondsTotal += durationSeconds / boxes;
    bucket.boxSampleCount += 1;
  }
}

function collectPalletDurationSamples(state, allowedWeekKeys) {
  const inventoryItems = Array.isArray(state?.inventoryItems) ? state.inventoryItems : [];
  const samplesByInventoryId = new Map();
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
    };
    if (!isPalletReviewBoard(board)) return;
    (snapshot?.rows || []).forEach((row) => {
      const inventoryId = resolveBoardRowInventoryProductId(board, row, inventoryItems);
      const durationSeconds = getFinishedRowDurationSeconds(row);
      if (!inventoryId || durationSeconds === null) return;
      ingestPalletSample(
        samplesByInventoryId,
        inventoryId,
        weekKey,
        durationSeconds,
        resolveBoardRowBoxesToReview(board, row),
      );
    });
  });

  (Array.isArray(state?.controlBoards) ? state.controlBoards : []).forEach((board) => {
    if (!isPalletReviewBoard(board) || !activeWeekKey || !allowedWeekKeys.has(activeWeekKey)) return;
    (board?.rows || []).forEach((row) => {
      const inventoryId = resolveBoardRowInventoryProductId(board, row, inventoryItems);
      const durationSeconds = getFinishedRowDurationSeconds(row);
      if (!inventoryId || durationSeconds === null) return;
      ingestPalletSample(
        samplesByInventoryId,
        inventoryId,
        activeWeekKey,
        durationSeconds,
        resolveBoardRowBoxesToReview(board, row),
      );
    });
  });

  return { inventoryItems, samplesByInventoryId };
}

export function applyInventoryAutoPalletTimes(state, options = {}) {
  const force = Boolean(options.force);
  const fingerprint = buildAutomationFingerprint(state);
  const previousMeta = state?.inventoryAutoPalletTimes && typeof state.inventoryAutoPalletTimes === "object"
    ? state.inventoryAutoPalletTimes
    : {};
  if (!force && String(previousMeta.lastFingerprint || "") === fingerprint) {
    return { state, changed: false, updates: [] };
  }

  const allowedWeekKeys = collectRecentWeekKeys(state);
  const { inventoryItems, samplesByInventoryId } = collectPalletDurationSamples(state, allowedWeekKeys);
  const updates = [];
  let changed = false;

  const nextInventoryItems = (inventoryItems || []).map((item) => {
    if (normalizeInventoryDomain(item?.domain) !== "base") return item;
    const bucket = samplesByInventoryId.get(item.id);
    if (!bucket || bucket.sampleCount <= 0) return item;

    const sampleWeeks = bucket.weeks.size;
    if (sampleWeeks < CATALOG_AUTO_LIMITS_MIN_WEEKS) return item;

    const avgSessionMinutes = (bucket.durationSecondsTotal / bucket.sampleCount) / 60;
    const avgMinutesPerBox = bucket.boxSampleCount > 0
      ? (bucket.boxRateSecondsTotal / bucket.boxSampleCount) / 60
      : 0;
    const boxesPerPallet = Math.max(0, Number(item.boxesPerPallet || 0));

    const suggestedPerBox = avgMinutesPerBox > 0 ? roundMinutesPerBoxCeil(avgMinutesPerBox) : 0;
    const suggestedPerPallet = suggestedPerBox > 0 && boxesPerPallet > 0
      ? roundMinutesToScaleOfFiveCeil(suggestedPerBox * boxesPerPallet)
      : roundMinutesToScaleOfFiveCeil(avgSessionMinutes);

    const currentPerBox = Math.max(0, Number(item.minutesPerBox || 0));
    const currentPerPallet = Math.max(0, Number(item.minutesPerPallet || 0));
    const nextPerBox = suggestedPerBox || currentPerBox;
    const nextPerPallet = suggestedPerPallet || currentPerPallet;

    if ((!nextPerBox || nextPerBox === currentPerBox) && (!nextPerPallet || nextPerPallet === currentPerPallet)) {
      return item;
    }

    changed = true;
    updates.push({
      inventoryId: item.id,
      code: item.code,
      name: item.name,
      previousMinutesPerBox: currentPerBox,
      nextMinutesPerBox: nextPerBox,
      previousMinutesPerPallet: currentPerPallet,
      nextMinutesPerPallet: nextPerPallet,
      avgMinutesPerBox: avgMinutesPerBox,
      avgSessionMinutes,
      sampleCount: bucket.sampleCount,
      boxSampleCount: bucket.boxSampleCount,
      sampleWeeks,
    });

    return {
      ...item,
      minutesPerBox: nextPerBox,
      minutesPerPallet: nextPerPallet,
      autoPalletTimeMeta: {
        avgMinutesPerBox: Number(avgMinutesPerBox.toFixed(2)),
        avgSessionMinutes: Number(avgSessionMinutes.toFixed(2)),
        sampleCount: bucket.sampleCount,
        boxSampleCount: bucket.boxSampleCount,
        sampleWeeks,
        previousMinutesPerBox: currentPerBox,
        previousMinutesPerPallet: currentPerPallet,
        updatedAt: new Date().toISOString(),
        roundedToStep: CATALOG_AUTO_LIMITS_ROUND_STEP,
        roundedPerBoxStep: 0.5,
      },
    };
  });

  if (!changed) {
    return {
      state: {
        ...state,
        inventoryAutoPalletTimes: {
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
      inventoryItems: nextInventoryItems,
      inventoryAutoPalletTimes: {
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
