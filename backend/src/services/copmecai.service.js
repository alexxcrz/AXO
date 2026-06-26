/**
 * AXO AI — Cerebro Operativo y Guardián de Datos
 * Motor de inteligencia local: conversacional, contextual y orientado a datos reales.
 */

import {
  getWarehouseState,
  findWarehouseUserById,
  replaceWarehouseState,
  createWarehouseBoardRow,
  patchWarehouseBoardRow,
} from "./warehouse.store.js";
import { isOllamaConfigured, ollamaChat, getOllamaStatus } from "./ollama.service.js";
import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, "../../data/uploads/reports");
const HISTORY_DIR = join(__dirname, "../../data/uploads/chat");

// Asegurar que exista el directorio de reportes
if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true });

// Limpiar reportes de más de 1 hora al iniciar
try {
  const now = Date.now();
  readdirSync(REPORTS_DIR).forEach((f) => {
    const fp = join(REPORTS_DIR, f);
    try { if (now - statSync(fp).mtimeMs > 3600000) unlinkSync(fp); } catch {}
  });
} catch {}

// ─── Estados de filas (AXIS ORDO usa español en producción) ───────────────────
const ROW_STATUS_PENDING  = "pending";
const ROW_STATUS_RUNNING  = "running";
const ROW_STATUS_PAUSED   = "paused";
const ROW_STATUS_FINISHED = "finished";

function normalizeRowStatus(value) {
  const key = norm(String(value || ""));
  if (["en curso", "running", "activo", "activa"].includes(key)) return ROW_STATUS_RUNNING;
  if (["pausado", "pausada", "paused", "detenido", "detenida"].includes(key)) return ROW_STATUS_PAUSED;
  if (["terminado", "terminada", "finalizado", "finalizada", "finished", "completado", "completada"].includes(key)) return ROW_STATUS_FINISHED;
  if (["pendiente", "pending"].includes(key)) return ROW_STATUS_PENDING;
  return null;
}

function rowMatchesStatus(row, bucket) {
  return normalizeRowStatus(row?.status) === bucket;
}

function rowStatusLabel(row) {
  const labels = {
    [ROW_STATUS_RUNNING]:  "▶️ En curso",
    [ROW_STATUS_PAUSED]:   "⏸️ Pausada",
    [ROW_STATUS_FINISHED]: "✅ Terminada",
    [ROW_STATUS_PENDING]:  "⏳ Pendiente",
  };
  return labels[normalizeRowStatus(row?.status)] || row?.status || "—";
}

/** Inventario base es catálogo de referencia; no tiene control de existencias. */
function isStockTrackedInventoryItem(item) {
  return norm(item?.domain || "base") !== "base";
}

function getStockTrackedInventory(items) {
  return (Array.isArray(items) ? items : []).filter(isStockTrackedInventoryItem);
}

function isInventoryItemLowStock(item) {
  if (!isStockTrackedInventoryItem(item)) return false;
  const s = Number(item.stockUnits || 0);
  const m = Number(item.minStockUnits || 0);
  return m > 0 && s <= m;
}

function isInventoryItemOutOfStock(item) {
  if (!isStockTrackedInventoryItem(item)) return false;
  return Number(item.stockUnits || 0) === 0;
}

// ─── Utilidades ─────────────────────────────────────────────────────────────
function norm(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function has(text, keywords) {
  const n = norm(text);
  return keywords.some((kw) => n.includes(norm(kw)));
}

function fmt(n, d = 0) {
  const p = Number(n);
  if (!Number.isFinite(p)) return "—";
  return p.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function pct(n) {
  if (!Number.isFinite(Number(n))) return "—%";
  return `${Number(n).toFixed(1)}%`;
}

function timeAgo(date) {
  if (!date) return "";
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)} día(s)`;
}

function getOperationalTimeZone() {
  const state = getWarehouseState();
  return String(state?.system?.operational?.timeZone || "America/Mexico_City").trim() || "America/Mexico_City";
}

function getOperationalTodayKey() {
  const tz = getOperationalTimeZone();
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function findBoardDateField(board) {
  return (board?.fields || []).find((field) => field?.type === "date") || null;
}

function normalizeOperationalDateKey(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoPrefix) return isoPrefix[1];
  const localized = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (localized) {
    const year = localized[3].length === 2 ? `20${localized[3]}` : localized[3];
    return `${year}-${String(localized[2]).padStart(2, "0")}-${String(localized[1]).padStart(2, "0")}`;
  }
  return raw;
}

function getRowOperationalDateKey(board, row) {
  const dateField = findBoardDateField(board);
  if (!dateField) return "";
  return normalizeOperationalDateKey(row?.values?.[dateField.id]);
}

function formatRealTimestamp(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString("es-MX", {
    timeZone: getOperationalTimeZone(),
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatClockTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleTimeString("es-MX", {
    timeZone: getOperationalTimeZone(),
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function findActivityListField(fields = []) {
  return (fields || []).find((field) => field?.type === "select" && field?.optionSource === "catalogByCategory") || null;
}

function getRowActivityLabel(board, row) {
  const activityField = findActivityListField(board?.fields || []);
  if (activityField && row?.values?.[activityField.id]) {
    return String(row.values[activityField.id]).trim();
  }
  return Object.values(row?.values || {}).find((value) => String(value || "").trim()) || "";
}

function textMatchesHint(value, hint) {
  const v = norm(value);
  const h = norm(hint);
  if (!v || !h) return false;
  if (v.includes(h) || h.includes(v)) return true;
  const tokens = h.split(/\s+/).filter((token) => token.length > 3);
  if (tokens.length === 0) return false;
  const matched = tokens.filter((token) => v.includes(token)).length;
  return matched >= Math.ceil(tokens.length * 0.6);
}

function extractActivityHint(message) {
  const raw = String(message || "").trim();
  const patterns = [
    /(?:podrias|puedes|por favor|quiero que|necesito que|me ayudas a|ayudame a)\s*(?:a\s*)?(?:iniciar|inicia|empezar|empieza|arrancar|arranca|comenzar|comienza|activar|activa|pausar|pausa|terminar|termina|finalizar|finaliza|reanudar|reanuda|continuar|continua|retomar|retoma)\s*(?:la|el|una|un|mi)?\s*(?:actividad(?: de)?|proceso(?: de)?|piso(?: de)?|fila(?: de)?)?\s*(.+)$/i,
    /(?:iniciar|inicia|empezar|empieza|arrancar|arranca|comenzar|comienza|activar|activa|pausar|pausa|terminar|termina|finalizar|finaliza|reanudar|reanuda|continuar|continua|retomar|retoma)\s*(?:la|el|una|un|mi)?\s*(?:actividad(?: de)?|proceso(?: de)?|piso(?: de)?|fila(?: de)?)?\s*(.+)$/i,
    /(?:actividad(?: de)?|proceso(?: de)?|piso(?: de)?)\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1].replace(/[?.!]+$/, "").trim();
  }
  return raw.replace(/[?.!]+$/, "").trim();
}

function matchCatalogActivity(snap, hint) {
  const h = norm(hint);
  if (!h) return null;
  const items = (snap.catalog || []).filter((item) => !item.isDeleted);
  const exact = items.find((item) => norm(item.name) === h);
  if (exact) return exact;
  const partial = items.filter((item) => norm(item.name).includes(h) || h.includes(norm(item.name)));
  partial.sort((a, b) => norm(a.name).length - norm(b.name).length);
  return partial[0] || null;
}

function pickBoardForActivity(snap, hint, message, catalogItem) {
  const todayKey = getOperationalTodayKey();
  const activityName = catalogItem?.name || hint;
  let bestBoard = null;
  let bestScore = -1;

  snap.boards.forEach((board) => {
    let score = 0;
    if (findActivityListField(board.fields || [])) score += 20;

    const matchingRows = (board.rows || []).filter((row) => textMatchesHint(getRowActivityLabel(board, row), activityName));
    if (matchingRows.length > 0) score += 50;
    if (matchingRows.some((row) => getRowOperationalDateKey(board, row) === todayKey)) score += 200;

    if (score > bestScore) {
      bestScore = score;
      bestBoard = board;
    }
  });

  if (bestBoard) return bestBoard;

  const msgNorm = norm(message);
  const byMessageBoard = snap.boards.find((board) => msgNorm.includes(norm(board.name)));
  if (byMessageBoard) return byMessageBoard;

  return snap.boards.find((board) => findActivityListField(board.fields || [])) || snap.boards[0] || null;
}

function scoreActionCandidate(board, row, label, hint, todayKey, allowedStatuses) {
  const status = normalizeRowStatus(row.status);
  if (!allowedStatuses.includes(status)) return -1;
  if (!textMatchesHint(label, hint)) return -1;

  let score = 0;
  const rowDate = getRowOperationalDateKey(board, row);
  if (rowDate === todayKey) score += 1000;
  else if (rowDate) {
    const dayDiff = Math.abs(new Date(`${rowDate}T12:00:00`).getTime() - new Date(`${todayKey}T12:00:00`).getTime()) / 86400000;
    score -= Math.min(800, Math.round(dayDiff * 10));
  }

  if (norm(label) === norm(hint)) score += 100;
  else score += 40;

  if (findActivityListField(board.fields || [])) score += 30;

  if (status === ROW_STATUS_PENDING) score += 20;
  else if (status === ROW_STATUS_PAUSED) score += 15;
  else if (status === ROW_STATUS_RUNNING) score += 5;

  return score;
}

function findActionableRow(snap, hint, allowedStatuses) {
  const todayKey = getOperationalTodayKey();
  let best = null;
  let bestScore = -1;

  snap.boards.forEach((board) => {
    (board.rows || []).forEach((row) => {
      const label = getRowActivityLabel(board, row);
      const score = scoreActionCandidate(board, row, label, hint, todayKey, allowedStatuses);
      if (score > bestScore) {
        bestScore = score;
        best = { board, row, label, status: normalizeRowStatus(row.status) };
      }
    });
  });

  return best;
}

function buildActionResult(actionType, {
  executed,
  stateUpdated,
  brief,
  boardName = "",
  activityName = "",
  statusLabel = "",
  timeIso = "",
  responsibleName = "",
}) {
  return {
    executed,
    stateUpdated,
    actionType,
    brief,
    boardName,
    activityName,
    statusLabel,
    timeLabel: formatRealTimestamp(timeIso),
    clockLabel: formatClockTime(timeIso),
    responsibleName,
  };
}

function buildActionDirectResponse(actionOutcome, user) {
  const firstName = user?.name?.split(" ")[0] || "";
  const greeting = firstName ? `Listo, ${firstName}.` : "Listo.";

  if (!actionOutcome?.executed) {
    return `⚠️ ${actionOutcome?.brief || "No pude ejecutar la accion en el sistema."}`;
  }

  if (actionOutcome.actionType === "start_activity") {
    return `${greeting} **${actionOutcome.activityName}** quedo **${actionOutcome.statusLabel}** en el tablero **${actionOutcome.boardName}**.\n\n- **Inicio real:** ${actionOutcome.timeLabel}\n- **Hora:** ${actionOutcome.clockLabel}\n- **Responsable:** ${actionOutcome.responsibleName}\n\nYa puedes verla actualizada en el tablero de hoy.`;
  }

  if (actionOutcome.actionType === "pause_activity") {
    return `${greeting} Pausé **${actionOutcome.activityName}** en **${actionOutcome.boardName}**.\n\n- **Hora de pausa:** ${actionOutcome.timeLabel}\n- **Hora:** ${actionOutcome.clockLabel}`;
  }

  if (actionOutcome.actionType === "finish_activity") {
    return `${greeting} Terminé **${actionOutcome.activityName}** en **${actionOutcome.boardName}**.\n\n- **Cierre:** ${actionOutcome.timeLabel}\n- **Hora:** ${actionOutcome.clockLabel}`;
  }

  return actionOutcome.brief;
}

function warehouseReasonMessage(reason) {
  const map = {
    auth_required: "Necesitas iniciar sesion para ejecutar acciones.",
    forbidden: "No tienes permiso para operar ese tablero o actividad.",
    board_not_found: "No encontre el tablero indicado.",
    row_not_found: "No encontre la fila o actividad indicada.",
  };
  return map[reason] || "No pude completar la accion en el sistema.";
}

function detectActionIntent(msg) {
  const t = norm(msg);
  const hint = extractActivityHint(msg);
  const snap = buildSnap();
  const catalogMatch = hint ? matchCatalogActivity(snap, hint) : null;
  const hasContext = has(t, ["actividad", "piso", "proceso", "fila", "tablero", "produccion", "reparacion", "operacion", "bano", "banos", "limpieza", "snack", "basura"])
    || Boolean(catalogMatch);
  const isStart = has(t, ["iniciar", "inicia", "empezar", "empieza", "arrancar", "arranca", "comenzar", "comienza", "activar", "activa", "reanudar", "reanuda", "continuar", "continua", "retomar", "retoma"]);
  const isPause = has(t, ["pausar", "pausa", "detener", "deten", "detenerla", "detenerlo"]);
  const isFinish = has(t, ["terminar", "termina", "finalizar", "finaliza", "cerrar", "cierra", "concluir", "concluye"]);

  if (isStart && hasContext) return "start_activity";
  if (isPause && hasContext) return "pause_activity";
  if (isFinish && hasContext) return "finish_activity";
  return null;
}

function executeCopmecAIAction(auth, actionType, message, user) {
  const snap = buildSnap();
  const hint = extractActivityHint(message);
  const userId = auth?.userId || "";
  const catalogItem = matchCatalogActivity(snap, hint);
  const activityName = catalogItem?.name || hint;

  if (!hint) {
    return buildActionResult(actionType, {
      executed: false,
      stateUpdated: false,
      brief: "No identifique que actividad o proceso quieres operar.",
    });
  }

  if (actionType === "start_activity") {
    const target = findActionableRow(snap, activityName, [ROW_STATUS_PENDING, ROW_STATUS_PAUSED]);

    if (!target) {
      const board = pickBoardForActivity(snap, hint, message, catalogItem);
      if (!board) {
        return buildActionResult(actionType, {
          executed: false,
          stateUpdated: false,
          brief: "No hay tableros disponibles para registrar la actividad.",
        });
      }

      const createResult = createWarehouseBoardRow(auth, board.id);
      if (!createResult.ok) {
        return buildActionResult(actionType, {
          executed: false,
          stateUpdated: false,
          brief: warehouseReasonMessage(createResult.reason),
        });
      }

      const activityField = findActivityListField(board.fields || []);
      const dateField = findBoardDateField(board);
      const valuesPatch = { ...(activityField ? { [activityField.id]: activityName } : {}) };
      if (dateField) valuesPatch[dateField.id] = getOperationalTodayKey();

      const startResult = patchWarehouseBoardRow(auth, board.id, createResult.row.id, {
        values: valuesPatch,
        status: "En curso",
        responsibleId: userId,
      });
      if (!startResult.ok) {
        return buildActionResult(actionType, {
          executed: false,
          stateUpdated: false,
          brief: warehouseReasonMessage(startResult.reason),
        });
      }

      const row = startResult.row;
      return buildActionResult(actionType, {
        executed: true,
        stateUpdated: true,
        brief: "Actividad iniciada.",
        boardName: board.name,
        activityName: getRowActivityLabel(board, row) || activityName,
        statusLabel: "En curso",
        timeIso: row.startTime,
        responsibleName: user?.name || "usuario actual",
      });
    }

    const { board, row, status } = target;
    const label = target.label || getRowActivityLabel(board, row);

    if (status === ROW_STATUS_RUNNING) {
      return buildActionResult(actionType, {
        executed: true,
        stateUpdated: false,
        brief: "La actividad ya estaba en curso.",
        boardName: board.name,
        activityName: label,
        statusLabel: "En curso",
        timeIso: row.startTime,
        responsibleName: user?.name || "usuario actual",
      });
    }

    const startResult = patchWarehouseBoardRow(auth, board.id, row.id, {
      status: "En curso",
      responsibleId: userId,
    });
    if (!startResult.ok) {
      return buildActionResult(actionType, {
        executed: false,
        stateUpdated: false,
        brief: warehouseReasonMessage(startResult.reason),
      });
    }

    const updatedRow = startResult.row;
    return buildActionResult(actionType, {
      executed: true,
      stateUpdated: true,
      brief: "Actividad iniciada.",
      boardName: board.name,
      activityName: label,
      statusLabel: "En curso",
      timeIso: updatedRow.startTime,
      responsibleName: user?.name || "usuario actual",
    });
  }

  if (actionType === "pause_activity") {
    const target = findActionableRow(snap, activityName, [ROW_STATUS_RUNNING]);
    if (!target) {
      return buildActionResult(actionType, {
        executed: false,
        stateUpdated: false,
        brief: `No encontre una actividad en curso que coincida con "${activityName}".`,
      });
    }

    const pauseResult = patchWarehouseBoardRow(auth, target.board.id, target.row.id, {
      status: "Pausado",
      lastPauseReason: "Solicitud AXO AI",
    });
    if (!pauseResult.ok) {
      return buildActionResult(actionType, {
        executed: false,
        stateUpdated: false,
        brief: warehouseReasonMessage(pauseResult.reason),
      });
    }

    const row = pauseResult.row;
    return buildActionResult(actionType, {
      executed: true,
      stateUpdated: true,
      brief: "Actividad pausada.",
      boardName: target.board.name,
      activityName: target.label || getRowActivityLabel(target.board, row),
      statusLabel: "Pausado",
      timeIso: row.pauseStartedAt || new Date().toISOString(),
      responsibleName: user?.name || "usuario actual",
    });
  }

  if (actionType === "finish_activity") {
    const target = findActionableRow(snap, activityName, [ROW_STATUS_RUNNING, ROW_STATUS_PAUSED]);
    if (!target) {
      return buildActionResult(actionType, {
        executed: false,
        stateUpdated: false,
        brief: `No encontre una actividad activa que coincida con "${activityName}".`,
      });
    }

    const finishResult = patchWarehouseBoardRow(auth, target.board.id, target.row.id, {
      status: "Terminado",
    });
    if (!finishResult.ok) {
      return buildActionResult(actionType, {
        executed: false,
        stateUpdated: false,
        brief: warehouseReasonMessage(finishResult.reason),
      });
    }

    const row = finishResult.row;
    return buildActionResult(actionType, {
      executed: true,
      stateUpdated: true,
      brief: "Actividad terminada.",
      boardName: target.board.name,
      activityName: target.label || getRowActivityLabel(target.board, row),
      statusLabel: "Terminado",
      timeIso: row.endTime,
      responsibleName: user?.name || "usuario actual",
    });
  }

  return buildActionResult(actionType, { executed: false, stateUpdated: false, brief: "" });
}

function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildSnap() {
  const state = getWarehouseState();
  const boards      = Array.isArray(state.controlBoards)    ? state.controlBoards    : [];
  const users       = Array.isArray(state.users)             ? state.users            : [];
  const inventory   = Array.isArray(state.inventoryItems)    ? state.inventoryItems   : [];
  const incidencias = Array.isArray(state.incidencias)       ? state.incidencias      : [];
  const catalog     = Array.isArray(state.catalog)           ? state.catalog          : [];
  const weekHistory = Array.isArray(state.boardWeekHistory)  ? state.boardWeekHistory : [];
  const transport = state.transport && typeof state.transport === "object" ? state.transport : {};
  const retail = state.retail && typeof state.retail === "object" ? state.retail : {};

  const allRows = boards.flatMap((b) =>
    (Array.isArray(b.rows) ? b.rows : []).map((row) => ({
      ...row,
      _boardName: b.name,
      _boardId: b.id,
      _area: b.settings?.area || b.area || "",
    }))
  );

  const stockInventory = getStockTrackedInventory(inventory);

  return { state, boards, users, inventory, stockInventory, incidencias, catalog, weekHistory, transport, retail, allRows };
}

const OLLAMA_RULE_ONLY_INTENTS = new Set(["dashboard_fix"]);

function buildSnapContextForLLM(snap) {
  const running = snap.allRows.filter((row) => rowMatchesStatus(row, ROW_STATUS_RUNNING)).length;
  const paused = snap.allRows.filter((row) => rowMatchesStatus(row, ROW_STATUS_PAUSED)).length;
  const finished = snap.allRows.filter((row) => rowMatchesStatus(row, ROW_STATUS_FINISHED)).length;
  const pending = snap.allRows.filter((row) => rowMatchesStatus(row, ROW_STATUS_PENDING)).length;
  const openInc = snap.incidencias.filter((item) => item.status !== "cerrada" && item.status !== "resuelta").length;
  const lowStock = snap.stockInventory.filter(isInventoryItemLowStock).length;
  const zeroStock = snap.stockInventory.filter(isInventoryItemOutOfStock).length;
  const activeUsers = snap.users.filter((user) => user.isActive).length;
  const boardNames = snap.boards.slice(0, 25).map((board) => board.name).filter(Boolean);

  return [
    `Tableros: ${snap.boards.length} (${boardNames.join(", ") || "sin nombre"})`,
    `Filas: ${snap.allRows.length} total | activas ${running} | pausadas ${paused} | terminadas ${finished} | pendientes ${pending}`,
    `Inventario: ${snap.inventory.length} articulos | stock bajo ${lowStock} | agotados ${zeroStock}`,
    `Incidencias abiertas: ${openInc}`,
    `Usuarios activos: ${activeUsers}`,
    `Actividades en catalogo: ${snap.catalog.filter((item) => !item.isDeleted).length}`,
  ].join("\n");
}

function buildAxoAiSystemPrompt(snap, user, intent, factualBrief = "") {
  const userName = user?.name ? user.name.split(" ")[0] : "operador";
  const hour = new Date().getHours();
  const saludo = hour < 12 ? "Buenos dias" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return `Eres AXO AI, asistente operativo inteligente de AXIS ORDO.
Hablas como un colega experto en planta/logistica: cercano, claro y util. Nunca suenas a manual tecnico rigido.

REGLAS DE ESTILO:
- Responde en espanol mexicano operativo.
- Varía la redaccion: NO copies plantillas ni bloques de reporte tal cual.
- Usa markdown ligero (**negritas**, listas cortas). Maximo 2-3 emojis por respuesta.
- Integra los HECHOS verificados en prosa natural, como si estuvieras conversando.
- Si hay alertas (pausas, stock bajo, incidencias), mencionalas con tono proactivo.
- No inventes numeros, horarios ni nombres que no aparezcan en los hechos.
- Nunca menciones Ollama, modelos de IA, LLM ni tecnologia interna. Eres AXO, punto.
- Si los hechos dicen ACCION EJECUTADA EN EL SISTEMA, confirma lo hecho y usa EXACTAMENTE las horas indicadas.
- Cierra con una pregunta o sugerencia concreta cuando tenga sentido.

Contexto: ${saludo}. Usuario: ${userName}. Intento detectado: ${intent}.

Panorama general del sistema:
${buildSnapContextForLLM(snap)}

HECHOS VERIFICADOS PARA ESTA CONSULTA (obligatorio usarlos):
${factualBrief || "Responde con base en el panorama general."}`;
}

function buildRecentOllamaMessages(auth, limit = 6) {
  const history = loadUserHistory(auth?.userId || "anon").slice(-limit);
  const messages = [];
  history.forEach((entry) => {
    messages.push({ role: "user", content: String(entry.userMessage || "").trim() });
    messages.push({ role: "assistant", content: String(entry.aiResponse || "").trim() });
  });
  return messages.filter((item) => item.content);
}

async function generateAxoAiResponseWithOllama(snap, user, message, intent, factualBrief, auth) {
  const historyMessages = buildRecentOllamaMessages(auth, 4);
  const content = await ollamaChat({
    temperature: 0.62,
    messages: [
      { role: "system", content: buildAxoAiSystemPrompt(snap, user, intent, factualBrief) },
      ...historyMessages,
      { role: "user", content: message },
    ],
  });
  if (!content) throw new Error("Ollama devolvio respuesta vacia.");
  return content;
}

export async function getCopmecAIEngineStatus() {
  return getOllamaStatus();
}

export function isCopmecAIOllamaEnabled() {
  if (String(process.env.OLLAMA_AXO_AI || "true").trim().toLowerCase() === "false") return false;
  return isOllamaConfigured();
}

function getHistoryFilePath(userId) {
  return join(HISTORY_DIR, `copmec-ai-history-${userId || "anon"}.json`);
}

function loadUserHistory(userId) {
  const fp = getHistoryFilePath(userId);
  if (!existsSync(fp)) return [];
  try {
    const raw = readFileSync(fp, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveUserHistory(userId, history) {
  const fp = getHistoryFilePath(userId);
  writeFileSync(fp, JSON.stringify(history, null, 2), "utf-8");
}

function detectRequestedFormats(msg) {
  const t = norm(msg);
  const formats = [];
  if (t.includes("pdf")) formats.push("pdf");
  if (t.includes("doc") || t.includes("word") || t.includes("documento")) formats.push("doc");
  if (
    t.includes("xlsx") || t.includes("xslx") || t.includes("xslxs") ||
    t.includes("xlsly") || t.includes("xlsy") ||
    t.includes("excel") || t.includes("spreadsheet") ||
    t.includes("hoja de calculo") ||
    /\bxls\b/.test(t)
  ) formats.push("xlsx");
  return [...new Set(formats)];
}

function detectExportScope(msg, intent) {
  const t = norm(msg);
  if (intent === "inventory" || has(t, ["inventario", "stock", "insumo", "producto"])) return "inventory";
  if (intent === "boards_detail" || intent === "boards_status" || intent === "boards_paused" || has(t, ["tablero", "tableros", "proceso", "filas"])) return "boards";
  if (intent === "incidencias" || has(t, ["incidencia", "falla", "problema", "novedad"])) return "incidencias";
  if (intent === "users" || has(t, ["usuario", "equipo", "personal", "operador"])) return "users";
  return "general";
}

function detectInventoryDomain(msg) {
  const t = norm(msg);
  if (has(t, ["inventario base", "base", "productos base"])) return "base";
  if (has(t, ["limpieza", "cleaning", "aseo"])) return "cleaning";
  if (has(t, ["pedidos", "orders", "empaque", "embalaje"])) return "orders";
  return null;
}

function detectExportContext(msg, intent) {
  return {
    scope: detectExportScope(msg, intent),
    inventoryDomain: detectInventoryDomain(msg),
  };
}

function shouldGenerateFile(msg, intent) {
  const t = norm(msg);
  const hasExportWords = has(t, ["descarga", "descargar", "archivo", "exporta", "exportar", "genera", "generar", "formato"]);
  if (detectRequestedFormats(msg).length > 0) return true;
  if (intent === "download_report") return true;
  return hasExportWords && ["report", "boards_detail", "boards_status", "inventory", "incidencias", "users"].includes(intent);
}

function saveConversationEntry(auth, payload) {
  const userId = auth?.userId || "anon";
  const history = loadUserHistory(userId);
  const next = [
    ...history,
    {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      userId,
      ...payload,
    },
  ].slice(-250);
  saveUserHistory(userId, next);
}

export function getCopmecAIHistory(auth, limit = 80) {
  const userId = auth?.userId || "anon";
  const history = loadUserHistory(userId);
  const recent = history.slice(-Math.max(1, Math.min(Number(limit) || 80, 250)));
  const messages = [];
  recent.forEach((entry) => {
    messages.push({ role: "user", content: entry.userMessage, createdAt: entry.createdAt });
    messages.push({
      role: "ai",
      content: entry.aiResponse,
      createdAt: entry.createdAt,
      reportToken: entry.reportToken || null,
      availableFormats: Array.isArray(entry.availableFormats) ? entry.availableFormats : [],
      dashboardFixed: Boolean(entry.dashboardFixed),
    });
  });
  return messages;
}

export function clearCopmecAIHistory(auth) {
  const userId = auth?.userId || "anon";
  saveUserHistory(userId, []);
  return { ok: true };
}

// ─── Clasificador de intención ────────────────────────────────────────────────
function classifyIntent(msg) {
  const t = norm(msg);

  if (has(t, ["hola", "buenos dias", "buenas tardes", "buenas noches", "que tal", "como estas", "hey", "ola"])) return "greeting";
  if (has(t, ["ayuda", "que puedes", "que sabes", "funciones", "comandos", "capacidades", "que haces", "para que sirves"])) return "help";

  if (has(t, ["sin stock", "stock cero", "agotado", "sin existencia", "agotados"])) return "no_stock";
  if (has(t, ["stock bajo", "bajo stock", "bajo minimo", "alerta stock", "poco stock", "escaso"])) return "low_stock";
  if (has(t, ["inventario", "stock", "productos", "articulos", "items", "insumo", "existencia", "mercancia"])) return "inventory";

  if (has(t, ["detalle", "detallado", "completo", "fila", "filas", "mostrar filas"]) &&
      has(t, ["tablero", "board", "proceso", "actividad", "informe", "reporte"])) return "boards_detail";

  if (has(t, ["pausado", "pausada", "detenido", "bloqueado", "en espera", "pausa"])) return "boards_paused";
  if (has(t, ["tablero", "tableros", "board", "proceso", "actividades"])) return "boards_status";

  if (has(t, ["usuario", "player", "players", "equipo", "quien", "personal", "operador", "team", "gente"])) return "users";
  if (has(t, ["incidencia", "problema", "falla", "issue", "novedad"])) return "incidencias";
  if (has(t, ["reporte", "resumen", "informe", "panorama", "estado general", "como vamos", "como estamos", "summary"])) return "report";
  if (has(t, ["cuello", "bottleneck", "lento", "retrasado", "demora", "tarda"])) return "bottleneck";
  if (has(t, ["prediccion", "prevenir", "riesgo", "anticipa", "alerta", "futuro", "que puede pasar"])) return "prediction";
  if (has(t, ["auditoria", "cumplimiento", "normativa", "calidad", "revision"])) return "audit";
  if (has(t, ["catalogo", "frecuencia", "tarea programada", "actividad programada"])) return "catalog";
  if (has(t, ["transporte", "unidad", "ruta", "camion", "camión", "flota"])) return "transport";
  if (has(t, ["retail", "tienda", "venta", "punto de venta"])) return "retail";
  if (has(t, ["historial", "semana", "semanas", "cierre semanal"])) return "week_history";
  if (has(t, ["biblioteca", "documento", "archivo", "manual"])) return "biblioteca";
  if (has(t, ["chat", "mensaje", "grupo", "comunicacion", "comunicación"])) return "chat";
  if (has(t, ["axo", "axis ordo", "sistema", "modulos", "módulos", "que es", "qué es", "plataforma"])) return "system_overview";

  if (has(t, ["arregla", "corrige", "corrije", "corregir", "arreglar", "fix", "reparar", "soluciona"]) &&
      has(t, ["dashboard", "panel", "tablero", "datos", "informacion", "muestra", "display"])) return "dashboard_fix";

  if (has(t, ["descargar", "descargate", "genera reporte", "generar reporte", "exportar", "dame el archivo", "reporte descargable"])) return "download_report";

  return "unknown";
}

// ─── Handlers conversacionales ───────────────────────────────────────────────

function handleGreeting(snap, user) {
  const hour   = new Date().getHours();
  const saludo = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const nombre = user?.name ? `, ${user.name.split(" ")[0]}` : "";

  const running   = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_RUNNING)).length;
  const paused    = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
  const openInc   = snap.incidencias.filter((i) => i.status !== "cerrada" && i.status !== "resuelta").length;
  const lowStock  = snap.stockInventory.filter(isInventoryItemLowStock).length;

  const estado = [];
  if (running > 0)  estado.push(`${running} proceso(s) activo(s)`);
  if (paused  > 0)  estado.push(`**⚠️ ${paused} pausado(s) que necesitan atención**`);
  else              estado.push("sin pausas activas");
  if (openInc > 0)  estado.push(`**🔴 ${openInc} incidencia(s) abierta(s)**`);
  if (lowStock > 0) estado.push(`**📦 ${lowStock} artículo(s) con stock bajo**`);

  const intro = randomOf([
    `${saludo}${nombre}! Aquí el Cerebro Operativo de AXO. En este momento: ${estado.join(", ")}.`,
    `${saludo}${nombre}! Listo para ayudarte. Resumen rápido: ${estado.join(", ")}.`,
    `${saludo}${nombre}! Monitoreando el sistema. Estado actual: ${estado.join(", ")}.`,
  ]);

  return `${intro}\n\n¿Qué necesitas? Puedes preguntarme sobre tableros, inventario, equipo, incidencias o pedirme un reporte completo.`;
}

function handleHelp() {
  return `Soy **AXO AI**, el cerebro operativo de AXIS ORDO. Puedo analizar datos reales del sistema y generar reportes.\n\n**📊 Reportes y estado**\n- *"dame un resumen"* → Panorama completo del sistema\n- *"estado de los tableros"* → Ver todos los tableros con su actividad\n- *"informe detallado de los tableros"* → Ver cada tablero con sus filas y estados\n\n**📦 Inventario**\n- *"qué tenemos en inventario"* → Resumen por categoría\n- *"qué está con stock bajo"* → Solo los artículos críticos\n- *"qué está agotado"* → Artículos con cero existencia\n\n**⏸️ Procesos**\n- *"qué está pausado"* → Procesos detenidos con detalle\n- *"hay cuellos de botella"* → Detectar tableros con flujo bloqueado\n\n**👥 Equipo y operación**\n- *"cómo está el equipo"* → Usuarios activos y roles\n- *"catálogo de actividades"* → Tareas programadas por frecuencia\n- *"qué riesgos hay"* → Alertas preventivas\n\n**⚠️ Incidencias**\n- *"qué incidencias hay"* → Las que siguen abiertas\n\n**📥 Exportación**\n- *"genera reporte en PDF"* o *"en Excel"* → Archivo descargable\n\nTambién puedes mencionar el nombre de un tablero, artículo o módulo (chat, biblioteca, transporte, retail) y te doy el detalle.`;
}

function handleInventoryNoStock(snap) {
  const zero = snap.stockInventory.filter(isInventoryItemOutOfStock);
  if (zero.length === 0) return `Buenas noticias: no hay ningún artículo completamente agotado en este momento. Todos tienen al menos algo de existencia.`;

  const lines = [`Encontré **${zero.length} artículo(s) completamente agotados** — sin ninguna unidad disponible:\n`];
  zero.slice(0, 15).forEach((item) => {
    lines.push(`- **${item.name}** *(${item.code || item.id})* — Mínimo requerido: ${fmt(item.minStockUnits)} ${item.unitLabel || "uds"}`);
  });
  if (zero.length > 15) lines.push(`- *...y ${zero.length - 15} más*`);
  lines.push(`\nEsto es urgente. Gestiona el reabastecimiento desde **Inventario > Movimientos** lo antes posible.`);
  return lines.join("\n");
}

function handleLowStock(snap) {
  const low = snap.stockInventory.filter(isInventoryItemLowStock);
  if (low.length === 0) return `Todo bien con el inventario operativo. Ningún artículo con control de stock está por debajo de su mínimo. Hay ${snap.stockInventory.length} artículo(s) monitoreados (${snap.inventory.length - snap.stockInventory.length} en catálogo base sin control de existencias).`;

  const zero     = low.filter((i) => Number(i.stockUnits||0) === 0);
  const critical = low.filter((i) => { const s = Number(i.stockUnits||0); const m = Number(i.minStockUnits||0); return s > 0 && s <= m * 0.5; });
  const warning  = low.filter((i) => { const s = Number(i.stockUnits||0); const m = Number(i.minStockUnits||0); return s > m * 0.5 && s <= m; });

  const lines = [`Revisé el inventario y encontré **${low.length} artículo(s) con stock bajo**:\n`];
  if (zero.length > 0) {
    lines.push(`**🔴 Sin existencia (${zero.length}):**`);
    zero.slice(0, 6).forEach((i) => lines.push(`- **${i.name}** — 0 unidades (mín. ${fmt(i.minStockUnits)} ${i.unitLabel || "uds"})`));
    lines.push("");
  }
  if (critical.length > 0) {
    lines.push(`**🟠 Crítico — menos del 50% del mínimo (${critical.length}):**`);
    critical.slice(0, 6).forEach((i) => { const s = Number(i.stockUnits||0); const m = Number(i.minStockUnits||0); lines.push(`- **${i.name}** — ${fmt(s)} / ${fmt(m)} ${i.unitLabel || "uds"} (${pct((s/m)*100)})`); });
    lines.push("");
  }
  if (warning.length > 0) {
    lines.push(`**🟡 Atención — entre 50%–100% del mínimo (${warning.length}):**`);
    warning.slice(0, 6).forEach((i) => { const s = Number(i.stockUnits||0); const m = Number(i.minStockUnits||0); lines.push(`- **${i.name}** — ${fmt(s)} / ${fmt(m)} ${i.unitLabel || "uds"}`); });
  }
  lines.push(`\n💡 Gestiona el reabastecimiento desde **Inventario > Movimientos**.`);
  return lines.join("\n");
}

function handleInventory(snap) {
  if (snap.inventory.length === 0) return `El inventario está vacío — no se han registrado artículos todavía.`;

  const domains = {};
  snap.inventory.forEach((i) => {
    const d = i.domain || "base";
    if (!domains[d]) domains[d] = { total: 0, low: 0, zero: 0, tracked: isStockTrackedInventoryItem(i) };
    domains[d].total++;
    if (!isStockTrackedInventoryItem(i)) return;
    const s = Number(i.stockUnits||0); const m = Number(i.minStockUnits||0);
    if (s === 0) domains[d].zero++;
    else if (m > 0 && s <= m) domains[d].low++;
  });

  const lowTotal  = snap.stockInventory.filter(isInventoryItemLowStock).length;
  const zeroTotal = snap.stockInventory.filter(isInventoryItemOutOfStock).length;
  const baseCount = snap.inventory.length - snap.stockInventory.length;
  const domainLabel = { base: "Productos base (catálogo)", cleaning: "Insumos de limpieza", orders: "Insumos de pedidos" };

  const lines = [`Aquí tienes el inventario con sus **${snap.inventory.length} artículos**:\n`,
    `| Categoría | Total | Con alerta | Agotados |`,
    `|-----------|-------|------------|----------|`];

  Object.entries(domains).forEach(([key, d]) => {
    const alertCol = key === "base" ? "—" : String(d.low);
    const zeroCol = key === "base" ? "—" : String(d.zero);
    lines.push(`| ${domainLabel[key] || key} | ${d.total} | ${alertCol} | ${zeroCol} |`);
  });

  lines.push("");
  if (baseCount > 0) lines.push(`ℹ️ **${baseCount} artículo(s) de inventario base** son catálogo de referencia y no se evalúan como agotados.`);
  if (zeroTotal > 0)       lines.push(`🔴 **${zeroTotal} artículo(s) agotados** (inventario operativo) — urgente. Escríbeme *"agotados"* para el detalle.`);
  else if (lowTotal > 0)   lines.push(`🟡 **${lowTotal} artículo(s) bajo el mínimo.** Escríbeme *"stock bajo"* para ver cuáles.`);
  else if (snap.stockInventory.length > 0) lines.push(`✅ El inventario operativo está en niveles saludables.`);
  else                     lines.push(`✅ Sin alertas de stock en inventario operativo.`);

  return lines.join("\n");
}

function handleBoardsDetail(snap, msg) {
  if (snap.boards.length === 0) return `No hay tableros creados todavía.`;

  const msgNorm = norm(msg);
  const specificBoard = snap.boards.find((b) => msgNorm.includes(norm(b.name)));
  const boardsToShow  = specificBoard ? [specificBoard] : snap.boards;
  const intro = specificBoard
    ? `Aquí el detalle completo del tablero **${specificBoard.name}**:\n`
    : `Te muestro el detalle de todos los tableros, fila por fila:\n`;

  const lines = [intro];

  boardsToShow.forEach((board) => {
    const rows     = Array.isArray(board.rows) ? board.rows : [];
    const area     = board.settings?.area || board.area || "sin área";
    const running  = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_RUNNING)).length;
    const paused   = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
    const finished = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_FINISHED)).length;

    lines.push(`---`);
    lines.push(`**📋 ${board.name}** *(${area})* — ${rows.length} filas · ${running} en curso · ${paused} pausadas · ${finished} terminadas`);

    if (rows.length === 0) {
      lines.push(`*(Sin filas registradas aún)*`);
    } else {
      lines.push(`\n| # | SKU / Producto | Estado | Inicio | Pausa |`);
      lines.push(`|---|----------------|--------|--------|-------|`);
      rows.slice(0, 30).forEach((row, idx) => {
        const statusLabel = rowStatusLabel(row);
        const sku     = row.sku || row.product || row.name || row.label || `Fila ${idx+1}`;
        const started = row.startedAt ? timeAgo(row.startedAt) : "—";
        const pausedA = row.pausedAt  ? timeAgo(row.pausedAt)  : "—";
        lines.push(`| ${idx+1} | ${sku} | ${statusLabel} | ${started} | ${row.pausedAt ? pausedA : "—"} |`);
      });
      if (rows.length > 30) lines.push(`*...y ${rows.length - 30} filas más*`);
    }
    lines.push("");
  });

  const totalPaused = boardsToShow.flatMap((b) => b.rows || []).filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
  if (totalPaused > 0) lines.push(`⚠️ Hay **${totalPaused} fila(s) pausada(s)**. Revísalas en el tablero para reanudar o cerrar.`);

  return lines.join("\n");
}

function handleBoardsStatus(snap, msg) {
  if (snap.boards.length === 0) return `No hay tableros creados todavía. Puedes crearlos desde la sección *Creador de tableros*.`;

  if (has(norm(msg), ["detalle", "detallado", "completo", "todo", "informe", "reporte", "fila", "filas"])) {
    return handleBoardsDetail(snap, msg);
  }

  const lines = [`Tienes **${snap.boards.length} tablero(s)** en el sistema. Estado actual:\n`];

  snap.boards.forEach((board) => {
    const rows     = Array.isArray(board.rows) ? board.rows : [];
    const running  = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_RUNNING)).length;
    const paused   = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
    const finished = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_FINISHED)).length;
    const pending  = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PENDING)).length;
    const area     = board.settings?.area || board.area || "sin área";
    const issues   = paused > 0 ? ` ⚠️ ${paused} pausado(s)` : "";
    lines.push(`**📋 ${board.name}** *(${area})*`);
    lines.push(`  - ${rows.length} filas: ${running} en curso · ${paused} pausadas · ${finished} terminadas · ${pending} pendientes${issues}`);
  });

  const totalPaused = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
  if (totalPaused > 0) lines.push(`\n⚠️ **${totalPaused} proceso(s) pausado(s)** en total. Escríbeme *"qué está pausado"* para el detalle.`);
  else                 lines.push(`\n✅ Sin pausas activas. Todo fluye bien.`);
  lines.push(`\n¿Quieres el detalle de un tablero específico? Dime el nombre.`);
  return lines.join("\n");
}

function handlePausedBoards(snap) {
  const paused = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED));
  if (paused.length === 0) return `No hay ningún proceso pausado ahora mismo. Todo está corriendo sin interrupciones.`;

  const byBoard = new Map();
  paused.forEach((row) => {
    const key = row._boardName || "Tablero sin nombre";
    if (!byBoard.has(key)) byBoard.set(key, []);
    byBoard.get(key).push(row);
  });

  const lines = [`Hay **${paused.length} proceso(s) pausado(s)** que necesitan atención:\n`];
  byBoard.forEach((rows, boardName) => {
    lines.push(`**📋 ${boardName}** — ${rows.length} pausado(s)`);
    rows.slice(0, 8).forEach((row) => {
      const sku    = row.sku || row.product || row.name || row.label || "(sin nombre)";
      const since  = row.pausedAt ? ` — pausado ${timeAgo(row.pausedAt)}` : "";
      const reason = row.pauseReason ? ` · Motivo: *"${row.pauseReason}"*` : "";
      lines.push(`  - **${sku}**${since}${reason}`);
    });
    if (rows.length > 8) lines.push(`  - *...y ${rows.length - 8} más*`);
    lines.push("");
  });
  lines.push(`💡 Entra al tablero correspondiente y decide si reanudas o cierras cada proceso.`);
  return lines.join("\n");
}

function handleUsers(snap) {
  if (snap.users.length === 0) return `No hay usuarios registrados todavía.`;

  const active   = snap.users.filter((u) => u.isActive !== false);
  const inactive = snap.users.filter((u) => u.isActive === false);
  const byRole   = {};
  active.forEach((u) => { const r = u.role || "sin_rol"; if (!byRole[r]) byRole[r] = []; byRole[r].push(u); });
  const roleLabel = { lead: "Lead", sr: "SR", ssr: "SSR", jr: "JR" };

  const lines = [`El equipo tiene **${active.length} usuario(s) activo(s)** y ${inactive.length} inactivo(s).\n`];
  Object.entries(byRole).forEach(([role, list]) => {
    lines.push(`**${roleLabel[role] || role}** (${list.length}):`);
    list.forEach((u) => { const dept = u.area || u.department ? ` · ${u.area || u.department}` : ""; lines.push(`  - ${u.name}${dept}`); });
    lines.push("");
  });
  if (inactive.length > 0) lines.push(`*Inactivos: ${inactive.map((u) => u.name).slice(0,5).join(", ")}${inactive.length > 5 ? "..." : ""}*`);
  return lines.join("\n");
}

function handleIncidencias(snap) {
  if (snap.incidencias.length === 0) return `No hay incidencias registradas en el sistema. Todo tranquilo por ese lado.`;

  const open   = snap.incidencias.filter((i) => i.status !== "cerrada" && i.status !== "resuelta");
  const closed = snap.incidencias.filter((i) => i.status === "cerrada"  || i.status === "resuelta");

  if (open.length === 0) return `Todas las incidencias están cerradas. Se han registrado ${snap.incidencias.length} en total. Buen trabajo de seguimiento.`;

  const lines = [`Hay **${open.length} incidencia(s) abierta(s)** de ${snap.incidencias.length} registradas:\n`];
  open.slice(0, 10).forEach((inc) => {
    const fecha  = inc.createdAt ? new Date(inc.createdAt).toLocaleDateString("es-MX") : "—";
    const titulo = inc.title || inc.descripcion || "Sin título";
    const prio   = inc.priority || inc.severidad ? ` *(${inc.priority || inc.severidad})*` : "";
    const status = inc.status ? ` — *${inc.status}*` : "";
    lines.push(`- [${fecha}] **${titulo}**${prio}${status}`);
  });
  if (open.length > 10)   lines.push(`- *...y ${open.length - 10} más*`);
  if (closed.length > 0)  lines.push(`\n*${closed.length} incidencia(s) cerrada(s) en historial.*`);
  lines.push(`\n¿Quieres más detalle de alguna?`);
  return lines.join("\n");
}

function handleReport(snap) {
  const now      = new Date();
  const running  = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_RUNNING)).length;
  const paused   = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
  const finished = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_FINISHED)).length;
  const pending  = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PENDING)).length;
  const total    = snap.allRows.length;
  const closePct = total > 0 ? ((finished / total) * 100).toFixed(1) : "0.0";

  const lowStock  = snap.stockInventory.filter(isInventoryItemLowStock).length;
  const zeroStock = snap.stockInventory.filter(isInventoryItemOutOfStock).length;
  const openInc   = snap.incidencias.filter((i) => i.status !== "cerrada" && i.status !== "resuelta").length;
  const activeU   = snap.users.filter((u) => u.isActive !== false).length;

  const issues = [];
  const goods  = [];
  if (paused > 0)    issues.push(`**${paused} proceso(s) pausado(s)**`);
  else               goods.push("flujo sin interrupciones");
  if (zeroStock > 0) issues.push(`**${zeroStock} artículo(s) agotado(s)**`);
  if (lowStock > 0)  issues.push(`**${lowStock} artículo(s) bajo el mínimo**`);
  else if (!zeroStock) goods.push("inventario saludable");
  if (openInc > 0)   issues.push(`**${openInc} incidencia(s) abierta(s)**`);
  else               goods.push("sin incidencias pendientes");

  const diagnostico = issues.length > 0
    ? `Hay puntos de atención: ${issues.join(", ")}.`
    : `El sistema opera sin alertas. ${goods.join(", ")}.`;

  const lines = [
    `**REPORTE GENERAL — ${now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}**\n`,
    diagnostico, "",
    `**🏭 Producción**`,
    `- ${snap.boards.length} tablero(s) en el sistema`,
    `- ${total} fila(s): ${running} en curso · ${paused} pausadas · ${finished} terminadas · ${pending} pendientes`,
    `- Tasa de cierre: **${closePct}%**`, "",
    `**📦 Inventario** (${snap.inventory.length} artículos, ${snap.stockInventory.length} con control de stock)`,
    zeroStock > 0 ? `- 🔴 ${zeroStock} agotado(s) operativo(s)` : `- ✅ Sin agotados operativos`,
    lowStock  > 0 ? `- 🟡 ${lowStock} bajo el mínimo` : `- ✅ Todos sobre el mínimo`, "",
    `**👥 Equipo** — ${activeU} de ${snap.users.length} activos`, "",
    `**⚠️ Incidencias**`,
    openInc > 0 ? `- 🔴 ${openInc} abierta(s)` : `- ✅ Sin pendientes`,
  ];

  if (issues.length > 0) {
    lines.push(`\n**¿Qué hacer?**`);
    if (paused > 0)    lines.push(`- Revisa los pausados: *"qué está pausado"*`);
    if (zeroStock > 0) lines.push(`- Reabastecimiento urgente: *"agotados"*`);
    if (lowStock > 0)  lines.push(`- Atiende el stock: *"stock bajo"*`);
    if (openInc > 0)   lines.push(`- Cierra incidencias: *"incidencias"*`);
  }

  return lines.join("\n");
}

function handleBottleneck(snap) {
  const metrics = snap.boards.map((board) => {
    const rows     = Array.isArray(board.rows) ? board.rows : [];
    const paused   = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
    const running  = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_RUNNING)).length;
    const finished = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_FINISHED)).length;
    const total    = rows.length;
    return { name: board.name, area: board.settings?.area || "—", total, paused, running, finished, pauseRate: total > 0 ? paused/total : 0 };
  }).filter((m) => m.total > 0).sort((a, b) => b.pauseRate - a.pauseRate);

  if (metrics.length === 0) return `No hay datos suficientes para detectar cuellos de botella. Los tableros no tienen filas registradas.`;

  const problematic = metrics.filter((m) => m.pauseRate > 0.25);
  const lines = [];

  if (problematic.length === 0) {
    lines.push(`No detecto cuellos de botella significativos. El flujo operativo se ve bien.\n`);
  } else {
    lines.push(`Detecté **${problematic.length} tablero(s) con flujo bloqueado** (más del 25% de sus procesos pausados):\n`);
    problematic.forEach((m) => {
      lines.push(`- **${m.name}** *(${m.area})* — ${pct(m.pauseRate * 100)} pausado (${m.paused} de ${m.total} filas)`);
    });
    lines.push(`\nEsto bloquea el flujo. Te recomiendo revisarlos con *"qué está pausado"*.\n`);
  }

  lines.push(`**Ranking de tableros:**\n`);
  lines.push(`| Tablero | Área | Pausados | Total | % Pausa |`);
  lines.push(`|---------|------|----------|-------|---------|`);
  metrics.forEach((m) => {
    const flag = m.pauseRate > 0.5 ? " 🔴" : m.pauseRate > 0.25 ? " 🟡" : "";
    lines.push(`| ${m.name}${flag} | ${m.area} | ${m.paused} | ${m.total} | ${pct(m.pauseRate * 100)} |`);
  });

  return lines.join("\n");
}

function handlePrediction(snap) {
  const alerts = [];

  const stockRisk = snap.stockInventory.filter((i) => { const s = Number(i.stockUnits||0); const m = Number(i.minStockUnits||0); return m > 0 && s <= m * 0.5; });
  if (stockRisk.length > 0) alerts.push({ level: "🔴 ALTA", titulo: `Riesgo de desabasto — ${stockRisk.length} artículo(s)`, detalle: stockRisk.slice(0,3).map((i) => i.name).join(", ") + (stockRisk.length > 3 ? `... y ${stockRisk.length-3} más` : ""), accion: "Gestiona reabastecimiento en Inventario de inmediato" });

  const stuckBoards = snap.boards.filter((b) => { const rows = b.rows||[]; return rows.length > 0 && rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length / rows.length > 0.5; });
  if (stuckBoards.length > 0) alerts.push({ level: "🟡 MEDIA", titulo: `Procesos estancados — ${stuckBoards.length} tablero(s)`, detalle: stuckBoards.map((b) => b.name).join(", "), accion: "Revisa y reanuda los procesos pausados" });

  const oldInc = snap.incidencias.filter((i) => { if (i.status === "cerrada" || i.status === "resuelta") return false; return i.createdAt && (Date.now() - new Date(i.createdAt).getTime()) > 3*86400000; });
  if (oldInc.length > 0) alerts.push({ level: "🟡 MEDIA", titulo: `Incidencias sin resolver >3 días — ${oldInc.length}`, detalle: oldInc.slice(0,2).map((i) => i.title||"Sin título").join(", "), accion: "Dar seguimiento y cerrar incidencias pendientes" });

  if (alerts.length === 0) return `No detecto riesgos operativos inminentes. Sin stock crítico, sin procesos muy estancados, sin incidencias antiguas. El sistema está bien.`;

  const lines = [`Analicé el sistema y encontré **${alerts.length} alerta(s) preventiva(s)**:\n`];
  alerts.forEach((a) => {
    lines.push(`**${a.level} — ${a.titulo}**`);
    if (a.detalle) lines.push(`*Afecta: ${a.detalle}*`);
    lines.push(`💡 ${a.accion}`);
    lines.push("");
  });
  lines.push(`¿Profundizo en alguno?`);
  return lines.join("\n");
}

function handleAudit(snap) {
  const total    = snap.allRows.length;
  const finished = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_FINISHED)).length;
  const paused   = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
  const closePct = total > 0 ? (finished/total*100).toFixed(1) : "0.0";
  const lowStock = snap.stockInventory.filter(isInventoryItemLowStock).length;
  const openInc  = snap.incidencias.filter((i) => i.status !== "cerrada" && i.status !== "resuelta").length;
  const cumple   = Number(closePct) >= 85;

  const lines = [
    `**CUMPLIMIENTO OPERATIVO**\n`,
    `- Tasa de cierre: **${closePct}%** ${cumple ? "✅ *(≥85% — cumple)*" : "⚠️ *(por debajo de 85%)*"}`,
    `- Procesos pausados: ${paused > 0 ? `⚠️ ${paused}` : "✅ Ninguno"}`,
    `- Inventario bajo mínimos: ${lowStock > 0 ? `⚠️ ${lowStock} artículo(s)` : "✅ Dentro de mínimos"}`,
    `- Incidencias abiertas: ${openInc > 0 ? `🔴 ${openInc}` : "✅ Sin pendientes"}`, "",
    cumple && openInc === 0 && lowStock === 0
      ? `Los indicadores muestran buen cumplimiento operativo. Sigan así.`
      : `Hay áreas de mejora. Prioriza cerrar pausas y atender alertas de inventario.`,
    `\n*Para reporte formal: sección **Auditorías** del sistema.*`,
  ];
  return lines.join("\n");
}

function handleCatalog(snap) {
  if (snap.catalog.length === 0) return `El catálogo está vacío. Configúralo desde *Creador de tableros > Catálogo de actividades*.`;

  const byFreq = {};
  snap.catalog.forEach((item) => { const f = item.frequency||"Sin frecuencia"; if (!byFreq[f]) byFreq[f]=[]; byFreq[f].push(item.name||item.label||"Sin nombre"); });

  const lines = [`El catálogo tiene **${snap.catalog.length} actividad(es)**:\n`];
  Object.entries(byFreq).forEach(([freq, names]) => {
    lines.push(`**${freq}** (${names.length}):`);
    names.slice(0,6).forEach((n) => lines.push(`  - ${n}`));
    if (names.length > 6) lines.push(`  - *...y ${names.length-6} más*`);
    lines.push("");
  });
  return lines.join("\n");
}

function handleSystemOverview(snap) {
  const running = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_RUNNING)).length;
  const paused = snap.allRows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
  const openInc = snap.incidencias.filter((i) => i.status !== "cerrada" && i.status !== "resuelta").length;
  const transportUnits = Array.isArray(snap.transport?.transportUnits) ? snap.transport.transportUnits.length : 0;
  const retailStores = Array.isArray(snap.retail?.stores) ? snap.retail.stores.length : 0;

  return [
    "**AXIS ORDO — Cerebro operativo AXO AI**",
    "",
    "Módulos conectados en tiempo real:",
    `- **Tableros:** ${snap.boards.length} tablero(s), ${snap.allRows.length} fila(s) (${running} en curso, ${paused} pausadas)`,
    `- **Inventario:** ${snap.inventory.length} artículo(s)`,
    `- **Catálogo:** ${snap.catalog.length} actividad(es) programadas`,
    `- **Incidencias abiertas:** ${openInc}`,
    `- **Usuarios activos:** ${snap.users.filter((u) => u.isActive !== false).length}`,
    `- **Historial semanal:** ${snap.weekHistory.length} semana(s) registradas`,
    `- **Transporte:** ${transportUnits} unidad(es)`,
    `- **Retail:** ${retailStores} punto(s)`,
    "",
    "Puedo generar resúmenes, detectar riesgos, revisar pausas, exportar PDF/Excel y corregir datos del dashboard.",
    'Escribe **"ayuda"** para ver comandos o **"dame un resumen"** para el panorama completo.',
  ].join("\n");
}

function handleTransport(snap) {
  const units = Array.isArray(snap.transport?.transportUnits) ? snap.transport.transportUnits : [];
  const expenses = Array.isArray(snap.transport?.transportExpenses) ? snap.transport.transportExpenses : [];
  if (!units.length && !expenses.length) {
    return "No hay datos de transporte registrados todavía. Configúralos en el módulo **Transporte**.";
  }
  const lines = [`**Transporte** — ${units.length} unidad(es), ${expenses.length} gasto(s) registrados:\n`];
  units.slice(0, 10).forEach((unit) => {
    lines.push(`- **${unit.name || unit.plate || unit.id || "Unidad"}**${unit.status ? ` · ${unit.status}` : ""}`);
  });
  if (units.length > 10) lines.push(`- *...y ${units.length - 10} más*`);
  return lines.join("\n");
}

function handleRetail(snap) {
  const stores = Array.isArray(snap.retail?.stores) ? snap.retail.stores : [];
  if (!stores.length) return "No hay puntos retail registrados. Configúralos en el módulo **Retail**.";
  const lines = [`**Retail** — ${stores.length} punto(s) registrados:\n`];
  stores.slice(0, 12).forEach((store) => {
    lines.push(`- **${store.name || store.code || store.id || "Punto"}**`);
  });
  if (stores.length > 12) lines.push(`- *...y ${stores.length - 12} más*`);
  return lines.join("\n");
}

function handleWeekHistory(snap) {
  if (!snap.weekHistory.length) return "Aún no hay semanas cerradas en el historial.";
  const lines = [`**Historial semanal** — ${snap.weekHistory.length} semana(s):\n`];
  snap.weekHistory.slice(-8).reverse().forEach((week) => {
    lines.push(`- **${week.weekKey || week.id || "Semana"}**${week.closedAt ? ` · cerrada ${new Date(week.closedAt).toLocaleDateString("es-MX")}` : ""}`);
  });
  return lines.join("\n");
}

function handleBiblioteca() {
  return "La **Biblioteca** centraliza documentos y manuales del sistema. Desde ahí puedes subir, buscar y descargar archivos por área. Si necesitas un reporte operativo en PDF o Excel, pídemelo directamente aquí.";
}

function handleChatModule() {
  return "El **Chat** de AXIS ORDO incluye mensajes privados, grupos, llamadas, historial y **AXO AI** como asistente operativo. Los avisos del sistema pueden llegar como mensajes del asistente.";
}

function handleUnknown(snap, msg) {
  const t = norm(msg);

  // Tablero específico mencionado
  const board = snap.boards.find((b) => t.includes(norm(b.name)));
  if (board) return handleBoardsDetail(snap, msg);

  // Artículo específico mencionado
  const item = snap.inventory.find((i) => t.includes(norm(i.name)) || (i.code && t.includes(norm(i.code))));
  if (item) {
    const s = Number(item.stockUnits||0); const m = Number(item.minStockUnits||0);
    const tracked = isStockTrackedInventoryItem(item);
    const status = !tracked
      ? "📋 Catálogo base (sin control de existencias)"
      : s === 0 ? "🔴 Agotado" : (m > 0 && s <= m ? "🟡 Bajo mínimo" : "✅ En stock");
    return `Encontré **${item.name}** *(${item.code||item.id})*:\n\n- Stock actual: **${fmt(s)} ${item.unitLabel||"uds"}**\n- Mínimo requerido: **${fmt(m)} ${item.unitLabel||"uds"}**\n- Estado: **${status}**${item.domain ? `\n- Categoría: *${item.domain}*` : ""}`;
  }

  return `No identifiqué una consulta exacta sobre *"${msg.slice(0, 80)}${msg.length > 80 ? "..." : ""}"*, pero aquí va un panorama rápido del sistema:\n\n${handleSystemOverview(snap)}\n\nPrueba también:\n- *"ayuda"* → Ver todo lo que puedo hacer\n- *"dame un resumen"* → Reporte general\n- *"qué está pausado"* → Procesos detenidos\n- *"stock bajo"* → Alertas de inventario`;
}

// ─── Generación de reportes ──────────────────────────────────────────────────

function buildReportData(snap, context = {}) {
  const scope = context?.scope || "general";
  const inventoryDomain = context?.inventoryDomain || null;
  const now = new Date();
  const filteredInventory = inventoryDomain
    ? snap.inventory.filter((i) => norm(i.domain || "base") === norm(inventoryDomain))
    : snap.inventory;
  const stockInventoryForReport = getStockTrackedInventory(filteredInventory);

  const boardsForReport = scope === "boards" ? snap.boards : snap.boards;
  const allRowsForReport = boardsForReport.flatMap((b) => Array.isArray(b.rows) ? b.rows : []);

  const running  = allRowsForReport.filter((r) => rowMatchesStatus(r, ROW_STATUS_RUNNING)).length;
  const paused   = allRowsForReport.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
  const finished = allRowsForReport.filter((r) => rowMatchesStatus(r, ROW_STATUS_FINISHED)).length;
  const pending  = allRowsForReport.filter((r) => rowMatchesStatus(r, ROW_STATUS_PENDING)).length;
  const lowStock = stockInventoryForReport.filter(isInventoryItemLowStock);
  const openInc  = snap.incidencias.filter((i) => i.status !== "cerrada" && i.status !== "resuelta");

  return {
    meta: {
      format: "AXO-OPS-REPORT",
      version: "1.0",
      generatedAt: now.toISOString(),
      generatedBy: "AXO AI — Cerebro Operativo",
      scope,
      inventoryDomain: inventoryDomain || "all",
    },
    resumen: {
      totalTableros: boardsForReport.length,
      totalFilas: allRowsForReport.length,
      filasEnCurso: running,
      filasPausadas: paused,
      filasTerminadas: finished,
      filasPendientes: pending,
      tasaCierre: allRowsForReport.length > 0 ? ((finished / allRowsForReport.length) * 100).toFixed(1) + "%" : "0%",
      totalInventario: filteredInventory.length,
      articulosBajoMinimo: lowStock.length,
      articulosAgotados: lowStock.filter(isInventoryItemOutOfStock).length,
      incidenciasAbiertas: openInc.length,
      totalUsuarios: snap.users.length,
      usuariosActivos: snap.users.filter((u) => u.isActive !== false).length,
    },
    tableros: boardsForReport.map((board) => {
      const rows     = Array.isArray(board.rows) ? board.rows : [];
      const area     = board.settings?.area || board.area || "sin área";
      const running  = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_RUNNING)).length;
      const paused   = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PAUSED)).length;
      const finished = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_FINISHED)).length;
      const pending  = rows.filter((r) => rowMatchesStatus(r, ROW_STATUS_PENDING)).length;
      return {
        id: board.id,
        nombre: board.name,
        area,
        totalFilas: rows.length,
        enCurso: running,
        pausadas: paused,
        terminadas: finished,
        pendientes: pending,
        filas: rows.map((row, idx) => ({
          numero: idx + 1,
          sku: row.sku || row.product || row.name || row.label || `Fila ${idx + 1}`,
          estado: row.status || "—",
          inicio: row.startedAt || null,
          pausa: row.pausedAt || null,
          motivo: row.pauseReason || null,
        })),
      };
    }),
    inventarioDetalle: filteredInventory.map((i) => ({
      codigo: i.code || i.id,
      nombre: i.name,
      stockActual: Number(i.stockUnits || 0),
      minimo: Number(i.minStockUnits || 0),
      unidad: i.unitLabel || "uds",
      categoria: i.domain || "base",
      ubicacion: i.location || i.zone || "—",
    })),
    inventarioCritico: lowStock.map((i) => ({
      codigo: i.code || i.id,
      nombre: i.name,
      stockActual: Number(i.stockUnits || 0),
      minimo: Number(i.minStockUnits || 0),
      unidad: i.unitLabel || "uds",
      categoria: i.domain || "base",
    })),
    incidenciasAbiertas: openInc.map((inc) => ({
      titulo: inc.title || inc.descripcion || "Sin título",
      estado: inc.status,
      prioridad: inc.priority || inc.severidad || "—",
      fecha: inc.createdAt || null,
    })),
  };
}

function generateCopBuffer(snap, context = {}) {
  const data = buildReportData(snap, context);
  return Buffer.from(JSON.stringify(data, null, 2), "utf-8");
}

function generatePdfBuffer(snap, context = {}) {
  return new Promise((resolve) => {
    const data   = buildReportData(snap, context);
    const doc    = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const DARK   = "#032121";
    const GREEN  = "#22c55e";
    const GRAY   = "#555555";
    const now    = new Date(data.meta.generatedAt);
    const fecha  = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    // Encabezado
    doc.rect(0, 0, doc.page.width, 80).fill(DARK);
    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold").text("AXO — Reporte Operativo", 50, 25);
    doc.fillColor(GREEN).fontSize(11).font("Helvetica").text(`Generado: ${fecha}`, 50, 52);
    doc.moveDown(2);

    // Resumen ejecutivo
    doc.fillColor(DARK).fontSize(14).font("Helvetica-Bold").text("Resumen Ejecutivo", { underline: true });
    doc.moveDown(0.4);
    const R = data.resumen;
    const summaryLines = [
      `Tableros: ${R.totalTableros}   |   Filas totales: ${R.totalFilas}   |   Tasa de cierre: ${R.tasaCierre}`,
      `En curso: ${R.filasEnCurso}   |   Pausadas: ${R.filasPausadas}   |   Terminadas: ${R.filasTerminadas}`,
      `Inventario: ${R.totalInventario} artículos   |   Bajo mínimo: ${R.articulosBajoMinimo}   |   Agotados: ${R.articulosAgotados}`,
      `Incidencias abiertas: ${R.incidenciasAbiertas}   |   Usuarios activos: ${R.usuariosActivos}/${R.totalUsuarios}`,
    ];
    doc.fillColor(GRAY).fontSize(10).font("Helvetica");
    summaryLines.forEach((l) => { doc.text(l); doc.moveDown(0.2); });
    doc.moveDown(0.8);

    // Tableros
    doc.fillColor(DARK).fontSize(13).font("Helvetica-Bold").text("Tableros de Control", { underline: true });
    doc.moveDown(0.4);
    data.tableros.forEach((board) => {
      doc.fillColor(DARK).fontSize(11).font("Helvetica-Bold").text(`📋 ${board.nombre}  (${board.area})`);
      doc.fillColor(GRAY).fontSize(9).font("Helvetica")
        .text(`  ${board.totalFilas} filas: ${board.enCurso} en curso · ${board.pausadas} pausadas · ${board.terminadas} terminadas · ${board.pendientes} pendientes`);
      if (board.filas.length > 0) {
        doc.moveDown(0.2);
        board.filas.slice(0, 20).forEach((row) => {
          const statusMap = { running: "▶ En curso", paused: "⏸ Pausada", finished: "✔ Terminada", pending: "… Pendiente" };
          const st = statusMap[normalizeRowStatus(row.estado)] || row.estado;
          doc.fillColor("#333").fontSize(8).font("Helvetica")
            .text(`    ${row.numero}. ${row.sku} — ${st}${row.motivo ? `  (Motivo: ${row.motivo})` : ""}`);
        });
        if (board.filas.length > 20) doc.fillColor(GRAY).fontSize(8).text(`    ...y ${board.filas.length - 20} filas más`);
      }
      doc.moveDown(0.6);
    });

    // Inventario (completo o crítico según alcance)
    if (data.inventarioDetalle.length > 0 && (data.meta.scope === "inventory" || data.meta.inventoryDomain !== "all")) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 70).fill(DARK);
      doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold").text("Inventario Solicitado", 50, 25);
      doc.fillColor(GREEN).fontSize(10).font("Helvetica").text(`${data.inventarioDetalle.length} artículo(s)`, 50, 48);
      doc.moveDown(2.5);
      data.inventarioDetalle.forEach((item) => {
        const agotado = item.categoria !== "base" && item.stockActual === 0;
        doc.fillColor(agotado ? "#dc2626" : "#0f172a").fontSize(10).font("Helvetica-Bold")
          .text(`${agotado ? "🔴" : "•"} ${item.nombre}  (${item.codigo})`);
        doc.fillColor(GRAY).fontSize(9).font("Helvetica")
          .text(`   Stock: ${item.stockActual} ${item.unidad}  |  Mínimo: ${item.minimo} ${item.unidad}  |  Categoría: ${item.categoria}  |  Ubicación: ${item.ubicacion}`);
        doc.moveDown(0.35);
      });
    } else if (data.inventarioCritico.length > 0) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 70).fill(DARK);
      doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold").text("Inventario Crítico", 50, 25);
      doc.fillColor(GREEN).fontSize(10).font("Helvetica").text(`${data.inventarioCritico.length} artículo(s) bajo o en cero`, 50, 48);
      doc.moveDown(2.5);
      data.inventarioCritico.forEach((item) => {
        const agotado = item.stockActual === 0;
        doc.fillColor(agotado ? "#dc2626" : "#d97706").fontSize(10).font("Helvetica-Bold")
          .text(`${agotado ? "🔴" : "🟡"} ${item.nombre}  (${item.codigo})`);
        doc.fillColor(GRAY).fontSize(9).font("Helvetica")
          .text(`   Stock: ${item.stockActual} ${item.unidad}  |  Mínimo: ${item.minimo} ${item.unidad}  |  Categoría: ${item.categoria}`);
        doc.moveDown(0.4);
      });
    }

    // Incidencias
    if (data.incidenciasAbiertas.length > 0) {
      doc.moveDown(0.5);
      doc.fillColor(DARK).fontSize(13).font("Helvetica-Bold").text("Incidencias Abiertas", { underline: true });
      doc.moveDown(0.4);
      data.incidenciasAbiertas.forEach((inc) => {
        const fecha = inc.fecha ? new Date(inc.fecha).toLocaleDateString("es-MX") : "—";
        doc.fillColor("#dc2626").fontSize(10).font("Helvetica-Bold").text(`⚠ ${inc.titulo}`);
        doc.fillColor(GRAY).fontSize(9).font("Helvetica")
          .text(`   Estado: ${inc.estado}  |  Prioridad: ${inc.prioridad}  |  Fecha: ${fecha}`);
        doc.moveDown(0.4);
      });
    }

    // Pie
    const pageCount = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
    doc.fillColor(GRAY).fontSize(8).text(`Generado por AXO AI — ${data.meta.generatedAt}  |  Formato: ${data.meta.format} v${data.meta.version}`, 50, doc.page.height - 40, { align: "center" });
    doc.end();
  });
}

function generateDocBuffer(snap, context = {}) {
  const data = buildReportData(snap, context);
  const R = data.resumen;
  const boardRows = data.tableros
    .map((b) => `<tr><td>${b.nombre}</td><td>${b.area}</td><td>${b.totalFilas}</td><td>${b.enCurso}</td><td>${b.pausadas}</td><td>${b.terminadas}</td></tr>`)
    .join("");
  const invRows = (data.meta.scope === "inventory" || data.meta.inventoryDomain !== "all" ? data.inventarioDetalle : data.inventarioCritico)
    .map((i) => `<tr><td>${i.nombre}</td><td>${i.codigo}</td><td>${i.stockActual}</td><td>${i.minimo}</td><td>${i.unidad}</td></tr>`)
    .join("");
  const incRows = data.incidenciasAbiertas
    .map((i) => `<tr><td>${i.titulo}</td><td>${i.estado}</td><td>${i.prioridad}</td><td>${i.fecha || "—"}</td></tr>`)
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>AXO Reporte</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; color: #1f2937; padding: 28px; }
    h1 { color: #032121; margin-bottom: 4px; }
    .sub { color: #6b7280; margin-bottom: 18px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 18px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
    th { background: #ecfdf5; color: #032121; text-align: left; }
  </style>
</head>
<body>
  <h1>AXO - Reporte Operativo</h1>
  <div class="sub">Generado ${new Date(data.meta.generatedAt).toLocaleString("es-MX")} | Alcance: ${data.meta.scope}${data.meta.inventoryDomain !== "all" ? `/${data.meta.inventoryDomain}` : ""}</div>

  <h2>Resumen</h2>
  <p>Tableros: <strong>${R.totalTableros}</strong> | Filas: <strong>${R.totalFilas}</strong> | Tasa de cierre: <strong>${R.tasaCierre}</strong></p>
  <p>Inventario total: <strong>${R.totalInventario}</strong> | Bajo mínimo: <strong>${R.articulosBajoMinimo}</strong> | Agotados: <strong>${R.articulosAgotados}</strong></p>
  <p>Incidencias abiertas: <strong>${R.incidenciasAbiertas}</strong> | Usuarios activos: <strong>${R.usuariosActivos}/${R.totalUsuarios}</strong></p>

  <h2>Tableros</h2>
  <table>
    <thead><tr><th>Tablero</th><th>Área</th><th>Total</th><th>En curso</th><th>Pausadas</th><th>Terminadas</th></tr></thead>
    <tbody>${boardRows || "<tr><td colspan='6'>Sin datos</td></tr>"}</tbody>
  </table>

  <h2>${(data.meta.scope === "inventory" || data.meta.inventoryDomain !== "all") ? "Inventario solicitado" : "Inventario crítico"}</h2>
  <table>
    <thead><tr><th>Nombre</th><th>Código</th><th>Stock</th><th>Mínimo</th><th>Unidad</th></tr></thead>
    <tbody>${invRows || "<tr><td colspan='5'>Sin alertas</td></tr>"}</tbody>
  </table>

  <h2>Incidencias abiertas</h2>
  <table>
    <thead><tr><th>Título</th><th>Estado</th><th>Prioridad</th><th>Fecha</th></tr></thead>
    <tbody>${incRows || "<tr><td colspan='4'>Sin incidencias</td></tr>"}</tbody>
  </table>
</body>
</html>`;

  return Buffer.from(html, "utf-8");
}

async function generateXlsxBuffer(snap, context = {}) {
  const data = buildReportData(snap, context);
  const wb = new ExcelJS.Workbook();
  wb.creator = "AXO AI";
  wb.created = new Date();

  const wsResumen = wb.addWorksheet("Resumen");
  wsResumen.columns = [
    { header: "Métrica", key: "metric", width: 32 },
    { header: "Valor", key: "value", width: 24 },
  ];
  const R = data.resumen;
  [
    ["Alcance", data.meta.scope],
    ["Tableros", R.totalTableros],
    ["Filas totales", R.totalFilas],
    ["En curso", R.filasEnCurso],
    ["Pausadas", R.filasPausadas],
    ["Terminadas", R.filasTerminadas],
    ["Pendientes", R.filasPendientes],
    ["Tasa de cierre", R.tasaCierre],
    ["Inventario total", R.totalInventario],
    ["Artículos bajo mínimo", R.articulosBajoMinimo],
    ["Artículos agotados", R.articulosAgotados],
    ["Incidencias abiertas", R.incidenciasAbiertas],
    ["Usuarios activos", `${R.usuariosActivos}/${R.totalUsuarios}`],
  ].forEach(([metric, value]) => wsResumen.addRow({ metric, value }));

  const wsTab = wb.addWorksheet("Tableros");
  wsTab.columns = [
    { header: "Tablero", key: "nombre", width: 34 },
    { header: "Área", key: "area", width: 18 },
    { header: "Total", key: "totalFilas", width: 10 },
    { header: "En curso", key: "enCurso", width: 10 },
    { header: "Pausadas", key: "pausadas", width: 10 },
    { header: "Terminadas", key: "terminadas", width: 11 },
    { header: "Pendientes", key: "pendientes", width: 11 },
  ];
  data.tableros.forEach((b) => wsTab.addRow(b));

  const wsInv = wb.addWorksheet(data.meta.scope === "inventory" || data.meta.inventoryDomain !== "all" ? "Inventario solicitado" : "Inventario crítico");
  wsInv.columns = [
    { header: "Código", key: "codigo", width: 20 },
    { header: "Nombre", key: "nombre", width: 36 },
    { header: "Stock", key: "stockActual", width: 10 },
    { header: "Mínimo", key: "minimo", width: 10 },
    { header: "Unidad", key: "unidad", width: 10 },
    { header: "Categoría", key: "categoria", width: 16 },
  ];
  const invRows = data.meta.scope === "inventory" || data.meta.inventoryDomain !== "all" ? data.inventarioDetalle : data.inventarioCritico;
  invRows.forEach((i) => wsInv.addRow(i));

  const wsInc = wb.addWorksheet("Incidencias");
  wsInc.columns = [
    { header: "Título", key: "titulo", width: 48 },
    { header: "Estado", key: "estado", width: 16 },
    { header: "Prioridad", key: "prioridad", width: 14 },
    { header: "Fecha", key: "fecha", width: 20 },
  ];
  data.incidenciasAbiertas.forEach((i) => wsInc.addRow(i));

  const buff = await wb.xlsx.writeBuffer();
  return Buffer.from(buff);
}

async function createReportFiles(snap, formats = ["pdf"], context = {}) {
  const token = randomUUID();
  const requestedFormats = [...new Set(formats)].filter((f) => ["pdf", "doc", "xlsx"].includes(f));
  const writtenPaths = [];

  for (const fmt of requestedFormats) {
    let buf = null;
    if (fmt === "pdf") buf = await generatePdfBuffer(snap, context);
    if (fmt === "doc") buf = generateDocBuffer(snap, context);
    if (fmt === "xlsx") buf = await generateXlsxBuffer(snap, context);
    if (!buf) continue;
    const p = join(REPORTS_DIR, `${token}.${fmt}`);
    writeFileSync(p, buf);
    writtenPaths.push(p);
  }

  // Auto-limpiar en 30 minutos
  setTimeout(() => {
    writtenPaths.forEach((p) => {
      try { unlinkSync(p); } catch {}
    });
  }, 30 * 60 * 1000);

  return { token, formats: requestedFormats };
}

// ─── Dashboard Fix ────────────────────────────────────────────────────────────

function handleDashboardFix(snap) {
  const state = getWarehouseState();
  const boards = Array.isArray(state.controlBoards) ? state.controlBoards : [];
  const fixes  = [];

  const fixedBoards = boards.map((board) => {
    let changed = false;
    const b = { ...board };

    // Fix 1: Asegurar que boardKey exista
    if (!b.boardKey) {
      b.boardKey = `board-${b.id || randomUUID().slice(0, 8)}`;
      fixes.push(`✅ Tablero **${b.name}**: se asignó \`boardKey\` faltante`);
      changed = true;
    }

    // Fix 2: Asegurar que settings exista
    if (!b.settings || typeof b.settings !== "object") {
      b.settings = {};
      fixes.push(`✅ Tablero **${b.name}**: se inicializó objeto \`settings\``);
      changed = true;
    }

    // Fix 3: Normalizar filas con status inválido
    const validStatuses = new Set([ROW_STATUS_PENDING, ROW_STATUS_RUNNING, ROW_STATUS_PAUSED, ROW_STATUS_FINISHED]);
    const rows = Array.isArray(b.rows) ? b.rows : [];
    let rowFixed = 0;
    const fixedRows = rows.map((row) => {
      if (!validStatuses.has(normalizeRowStatus(row.status))) {
        rowFixed++;
        return { ...row, status: "Pendiente" };
      }
      return row;
    });
    if (rowFixed > 0) {
      b.rows = fixedRows;
      fixes.push(`✅ Tablero **${b.name}**: ${rowFixed} fila(s) con estado inválido corregidas → \`Pendiente\``);
      changed = true;
    }

    // Fix 4: Asegurar que name no sea undefined/null
    if (!b.name || typeof b.name !== "string") {
      b.name = `Tablero sin nombre (${b.id || "?"})`;
      fixes.push(`✅ Tablero sin nombre: se asignó nombre de respaldo`);
      changed = true;
    }

    // Fix 5: Asegurar que displayOrder sea numérico
    if (typeof b.displayOrder !== "number") {
      b.displayOrder = 0;
      changed = true;
    }

    return changed ? b : board;
  });

  // Fix 6: Verificar configuración del sistema operativo
  const sysCfg = state.systemOperationalSettings || {};
  const sysFixed = {};
  if (typeof sysCfg.pauseRequiresAuth !== "boolean") {
    sysFixed.pauseRequiresAuth = false;
    fixes.push(`✅ \`pauseRequiresAuth\`: valor inválido corregido → \`false\``);
  }

  if (fixes.length === 0) {
    return {
      text: `Revisé la estructura del dashboard y todo está bien configurado. No encontré datos corruptos ni campos faltantes en los **${boards.length} tablero(s)**.\n\n¿Hay algún problema específico que ves en la pantalla? Descríbemelo y lo analizo.`,
      fixed: false,
    };
  }

  // Aplicar correcciones
  const newState = {
    ...state,
    controlBoards: fixedBoards,
    systemOperationalSettings: { ...sysCfg, ...sysFixed },
  };
  replaceWarehouseState(newState);

  const lines = [
    `Listo. Analicé y corregí la estructura del dashboard. Apliqué **${fixes.length} corrección(es)**:\n`,
    ...fixes,
    `\nLos cambios ya están guardados. **Recarga el dashboard** para ver la información actualizada.`,
    `\n💡 Si el problema persiste, dime exactamente qué módulo no muestra bien los datos y lo investigo más profundo.`,
  ];

  return { text: lines.join("\n"), fixed: true };
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────

export async function processCopmecAIMessage(auth, message) {
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return { ok: false, message: "Mensaje vacío." };
  }

  const user    = auth?.userId ? findWarehouseUserById(auth.userId) : null;
  const trimmed = message.trim();
  const actionType = detectActionIntent(trimmed);

  if (actionType) {
    const actionOutcome = executeCopmecAIAction(auth, actionType, trimmed, user);
    const response = buildActionDirectResponse(actionOutcome, user);
    saveConversationEntry(auth, {
      intent: actionOutcome.executed ? `${actionType}_executed` : actionType,
      userMessage: trimmed,
      aiResponse: response,
      dashboardFixed: false,
      reportToken: null,
      availableFormats: [],
    });
    return {
      ok: true,
      response,
      intent: actionOutcome.executed ? `${actionType}_executed` : actionType,
      engine: "system",
      actionExecuted: Boolean(actionOutcome.executed),
      stateUpdated: Boolean(actionOutcome.stateUpdated),
      dashboardFixed: false,
      reportToken: null,
      availableFormats: [],
    };
  }

  const snap    = buildSnap();
  const intent  = classifyIntent(trimmed);
  const requestedFormats = detectRequestedFormats(trimmed);
  const exportContext = detectExportContext(trimmed, intent);
  const ollamaEnabled = isCopmecAIOllamaEnabled();
  const ollamaStatus = ollamaEnabled ? await getOllamaStatus() : { reachable: false, modelReady: false };
  const ollamaReady = ollamaEnabled && ollamaStatus.reachable && ollamaStatus.modelReady;

  const reportIntents = new Set(["report", "boards_detail", "download_report", "boards_status", "inventory", "incidencias", "users"]);

  const handlers = {
    greeting:       () => handleGreeting(snap, user),
    help:           () => handleHelp(),
    no_stock:       () => handleInventoryNoStock(snap),
    low_stock:      () => handleLowStock(snap),
    inventory:      () => handleInventory(snap),
    boards_status:  () => handleBoardsStatus(snap, trimmed),
    boards_detail:  () => handleBoardsDetail(snap, trimmed),
    boards_paused:  () => handlePausedBoards(snap),
    users:          () => handleUsers(snap),
    incidencias:    () => handleIncidencias(snap),
    report:         () => handleReport(snap),
    bottleneck:     () => handleBottleneck(snap),
    prediction:     () => handlePrediction(snap),
    audit:          () => handleAudit(snap),
    catalog:        () => handleCatalog(snap),
    transport:      () => handleTransport(snap),
    retail:         () => handleRetail(snap),
    week_history:   () => handleWeekHistory(snap),
    biblioteca:     () => handleBiblioteca(),
    chat:           () => handleChatModule(),
    system_overview:() => handleSystemOverview(snap),
    download_report:() => handleReport(snap),
    unknown:        () => handleUnknown(snap, trimmed),
  };

  // Dashboard fix — sincrónico especial (no pasa por IA)
  if (intent === "dashboard_fix") {
    const result = handleDashboardFix(snap);
    saveConversationEntry(auth, {
      intent,
      userMessage: trimmed,
      aiResponse: result.text,
      dashboardFixed: result.fixed,
      reportToken: null,
      availableFormats: [],
    });
    return { ok: true, response: result.text, intent, dashboardFixed: result.fixed, reportToken: null, availableFormats: [], engine: "rules" };
  }

  const handler = handlers[intent] || handlers.unknown;
  const factualBrief = handler();

  // IA local Ollama: reescribe los hechos reales en lenguaje conversacional
  if (ollamaReady && !OLLAMA_RULE_ONLY_INTENTS.has(intent)) {
    try {
      let response = await generateAxoAiResponseWithOllama(snap, user, trimmed, intent, factualBrief, auth);

      let reportToken = null;
      let availableFormats = [];
      const shouldExport = shouldGenerateFile(trimmed, intent);
      if ((reportIntents.has(intent) || intent === "unknown") && shouldExport) {
        const formats = requestedFormats.length > 0 ? requestedFormats : ["pdf"];
        try {
          const generated = await createReportFiles(snap, formats, exportContext);
          reportToken = generated.token;
          availableFormats = generated.formats;
          if (availableFormats.length > 0) {
            response = `${response}\n\nTambien te deje listo el archivo en **${availableFormats.map((f) => f.toUpperCase()).join(", ")}** para descargar abajo.`;
          }
        } catch (err) {
          console.error("[AXO AI] Error generando reporte:", err);
        }
      }

      saveConversationEntry(auth, {
        intent: `${intent}_ai`,
        userMessage: trimmed,
        aiResponse: response,
        dashboardFixed: false,
        reportToken,
        availableFormats,
      });

      return {
        ok: true,
        response,
        intent: `${intent}_ai`,
        engine: "ai",
        actionExecuted: false,
        stateUpdated: false,
        dashboardFixed: false,
        reportToken,
        availableFormats,
      };
    } catch (error) {
      console.warn("[AXO AI] Ollama fallback a reglas:", error?.message || error);
    }
  }

  let response = factualBrief;

  // Generar archivos de reporte si aplica
  let reportToken = null;
  let availableFormats = [];
  const shouldExport = shouldGenerateFile(trimmed, intent);
  if ((reportIntents.has(intent) || intent === "unknown") && shouldExport) {
    const formats = requestedFormats.length > 0 ? requestedFormats : ["pdf"];
    try {
      const generated = await createReportFiles(snap, formats, exportContext);
      reportToken = generated.token;
      availableFormats = generated.formats;
      if (availableFormats.length > 0) {
        response = `${response}\n\nListo, ya te generé el archivo en formato: **${availableFormats.map((f) => f.toUpperCase()).join(", ")}**.`;
      }
    } catch (err) {
      console.error("[AXO AI] Error generando reporte:", err);
    }
  }

  saveConversationEntry(auth, {
    intent,
    userMessage: trimmed,
    aiResponse: response,
    dashboardFixed: false,
    reportToken,
    availableFormats,
  });

  return {
    ok: true,
    response,
    intent,
    reportToken,
    availableFormats,
    actionExecuted: false,
    stateUpdated: false,
    engine: ollamaReady ? "ai" : "rules",
  };
}
