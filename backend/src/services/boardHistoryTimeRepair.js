/**
 * Repara horas inicio/fin en snapshots de tableros e filas activas.
 * - Congela columnas HH:mm:ss desde startTime/endTime ISO cuando existen.
 * - Reconstruye ISO faltantes desde Fecha + columna de hora (zona local).
 *
 * Se ejecuta automùticamente al normalizar el estado del almacùn (cada carga/sync).
 * Para corregir datos ya guardados en disco sin esperar al siguiente arranque:
 *   npm run repair:history-times
 * Simulaciùn sin guardar:
 *   npm run repair:history-times:dry
 */

function normalizeTimeFieldLabel(field) {
  return String(field?.label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatBoardRowClockTime(isoValue) {
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

function parseClockString(clockValue) {
  const raw = String(clockValue || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] || 0),
  };
}

function parseDateKey(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function combineDateKeyAndClock(dateKey, clockValue) {
  const key = parseDateKey(dateKey);
  const clock = parseClockString(clockValue);
  if (!key || !clock) return null;
  const [year, month, day] = key.split("-").map(Number);
  const local = new Date(year, month - 1, day, clock.hour, clock.minute, clock.second);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

function clockTokensEqual(left, right) {
  const a = parseClockString(left);
  const b = parseClockString(right);
  if (!a || !b) return String(left || "").trim() === String(right || "").trim();
  return a.hour === b.hour && a.minute === b.minute && a.second === b.second;
}

function findBoardTimeFields(fields = []) {
  const startFields = [];
  const endFields = [];
  const dateField = (Array.isArray(fields) ? fields : []).find((field) => field?.type === "date") || null;

  (Array.isArray(fields) ? fields : []).forEach((field) => {
    if (field?.type !== "time") return;
    const label = normalizeTimeFieldLabel(field);
    if (label.includes("fin") || label.includes("final") || label.includes("end")) {
      endFields.push(field);
      return;
    }
    if (label.includes("inicio") || label.includes("start")) {
      startFields.push(field);
    }
  });

  return { dateField, startFields, endFields };
}

function resolveRowActivityDateKey(row, snapshot = {}) {
  const { dateField } = findBoardTimeFields(snapshot.fields || []);
  const fromField = dateField ? row?.values?.[dateField.id] : "";
  const parsed = parseDateKey(fromField);
  if (parsed) return parsed;
  const fromIso = parseDateKey(row?.endTime || row?.startTime || row?.createdAt);
  if (fromIso) return fromIso;
  return parseDateKey(snapshot?.startDate || snapshot?.endDate || snapshot?.archivedAt);
}

function isFinishedRow(row) {
  const status = String(row?.status || "").trim().toLowerCase();
  return status === "terminado" || status === "finalizado" || status === "finished";
}

function getCountedPauseSeconds(row) {
  const logs = Array.isArray(row?.pauseLogs) ? row.pauseLogs : [];
  return logs.reduce((sum, entry) => {
    const counted = Number(entry?.countedPauseDurationSeconds);
    if (Number.isFinite(counted)) return sum + Math.max(0, counted);
    const duration = Number(entry?.pauseDurationSeconds);
    const authorized = Number(entry?.pauseAuthorizedSeconds);
    if (Number.isFinite(duration)) {
      return sum + Math.max(0, duration - (Number.isFinite(authorized) ? authorized : 0));
    }
    return sum;
  }, 0);
}

/**
 * Corrige tiempos de producciùn imposibles en filas terminadas.
 *
 * Invariante fùsico: el tiempo de producciùn (accumulatedSeconds) NUNCA puede
 * superar el tiempo de reloj transcurrido entre inicio y fin. Si lo supera, el
 * dato quedù inflado (p. ej. por el bug histùrico de doble finalizaciùn que
 * sumaba el intervalo dos veces) y se recorta al mùximo posible descontando las
 * pausas contabilizadas. Solo toca filas con datos imposibles: las correctas
 * quedan intactas.
 */
function repairBoardRowAccumulatedSeconds(row, stats) {
  if (!isFinishedRow(row)) return false;
  const startMs = new Date(row?.startTime || "").getTime();
  const endMs = new Date(row?.endTime || "").getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return false;
  }
  const wallSeconds = Math.floor((endMs - startMs) / 1000);
  let changed = false;

  const accumulated = Number(row?.accumulatedSeconds);
  if (Number.isFinite(accumulated) && accumulated > wallSeconds) {
    const countedPause = getCountedPauseSeconds(row);
    row.accumulatedSeconds = Math.max(0, wallSeconds - countedPause);
    stats.accumulatedCapped = (stats.accumulatedCapped || 0) + 1;
    changed = true;
  }

  const totalOverride = Number(row?.totalElapsedSecondsOverride);
  if (Number.isFinite(totalOverride) && totalOverride > wallSeconds) {
    row.totalElapsedSecondsOverride = wallSeconds;
    stats.totalOverrideCapped = (stats.totalOverrideCapped || 0) + 1;
    changed = true;
  }

  return changed;
}

function repairBoardRowTimes(row, fields = [], snapshot = {}, stats) {
  const next = {
    ...row,
    values: { ...(row?.values || {}) },
  };
  const { startFields, endFields } = findBoardTimeFields(fields);
  const dateKey = resolveRowActivityDateKey(next, snapshot);
  let changed = false;

  const applyIsoToFields = (isoValue, targets) => {
    if (!isoValue || !targets.length) return;
    const clock = formatBoardRowClockTime(isoValue);
    targets.forEach((field) => {
      const previous = String(next.values[field.id] || "").trim();
      if (previous !== clock) {
        next.values[field.id] = clock;
        changed = true;
        stats.valuesAligned += 1;
      }
    });
  };

  const maybeRebuildIso = (clockValue, targets, isoKey) => {
    const rebuilt = combineDateKeyAndClock(dateKey, clockValue);
    if (!rebuilt) return;
    if (next[isoKey] !== rebuilt) {
      next[isoKey] = rebuilt;
      changed = true;
      stats.isoRebuilt += 1;
    }
    applyIsoToFields(rebuilt, targets);
  };

  if (next.startTime) {
    applyIsoToFields(next.startTime, startFields);
    const primaryStartField = startFields[0];
    const valueClock = primaryStartField ? next.values[primaryStartField.id] : "";
    if (valueClock && !clockTokensEqual(valueClock, formatBoardRowClockTime(next.startTime))) {
      maybeRebuildIso(valueClock, startFields, "startTime");
    }
  } else if (startFields.length) {
    const valueClock = String(next.values[startFields[0].id] || "").trim();
    if (valueClock) {
      maybeRebuildIso(valueClock, startFields, "startTime");
    }
  }

  if (next.endTime) {
    applyIsoToFields(next.endTime, endFields);
    const primaryEndField = endFields[0];
    const valueClock = primaryEndField ? next.values[primaryEndField.id] : "";
    if (valueClock && !clockTokensEqual(valueClock, formatBoardRowClockTime(next.endTime))) {
      maybeRebuildIso(valueClock, endFields, "endTime");
    }
  } else if (isFinishedRow(next) && endFields.length) {
    const valueClock = String(next.values[endFields[0].id] || "").trim();
    if (valueClock) {
      maybeRebuildIso(valueClock, endFields, "endTime");
    }
  }

  if (repairBoardRowAccumulatedSeconds(next, stats)) {
    changed = true;
  }

  if (changed) {
    stats.rowsChanged += 1;
  }

  return { row: next, changed };
}

function repairBoardHistorySnapshot(snapshot, stats) {
  const fields = Array.isArray(snapshot?.fields) ? snapshot.fields : [];
  const rows = Array.isArray(snapshot?.rows) ? snapshot.rows : [];
  if (!rows.length) return snapshot;

  let snapshotChanged = false;
  const nextRows = rows.map((row) => {
    const { row: repaired, changed } = repairBoardRowTimes(row, fields, snapshot, stats);
    if (changed) snapshotChanged = true;
    return repaired;
  });

  if (!snapshotChanged) return snapshot;
  stats.snapshotsChanged += 1;
  return { ...snapshot, rows: nextRows };
}

function repairControlBoard(board, stats) {
  const fields = Array.isArray(board?.fields) ? board.fields : [];
  const rows = Array.isArray(board?.rows) ? board.rows : [];
  if (!rows.length) return board;

  let boardChanged = false;
  const nextRows = rows.map((row) => {
    const { row: repaired, changed } = repairBoardRowTimes(row, fields, { startDate: new Date().toISOString() }, stats);
    if (changed) boardChanged = true;
    return repaired;
  });

  if (!boardChanged) return board;
  stats.boardsChanged += 1;
  return { ...board, rows: nextRows };
}

export function repairWarehouseBoardTimes(state) {
  const stats = {
    snapshotsScanned: 0,
    snapshotsChanged: 0,
    boardsScanned: 0,
    boardsChanged: 0,
    rowsScanned: 0,
    rowsChanged: 0,
    valuesAligned: 0,
    isoRebuilt: 0,
    accumulatedCapped: 0,
    totalOverrideCapped: 0,
  };

  const history = Array.isArray(state?.boardWeekHistory) ? state.boardWeekHistory : [];
  const boards = Array.isArray(state?.controlBoards) ? state.controlBoards : [];

  const nextHistory = history.map((snapshot) => {
    stats.snapshotsScanned += 1;
    const rowCount = Array.isArray(snapshot?.rows) ? snapshot.rows.length : 0;
    stats.rowsScanned += rowCount;
    return repairBoardHistorySnapshot(snapshot, stats);
  });

  const nextBoards = boards.map((board) => {
    stats.boardsScanned += 1;
    const rowCount = Array.isArray(board?.rows) ? board.rows.length : 0;
    stats.rowsScanned += rowCount;
    return repairControlBoard(board, stats);
  });

  return {
    state: {
      ...state,
      boardWeekHistory: nextHistory,
      controlBoards: nextBoards,
    },
    stats,
    changed: stats.snapshotsChanged > 0 || stats.boardsChanged > 0,
  };
}

export {
  repairBoardRowTimes,
  repairBoardHistorySnapshot,
  formatBoardRowClockTime,
  combineDateKeyAndClock,
};
