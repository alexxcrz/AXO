// transport.notifications.js � Notificaciones server-side de transporte
// Resuelve destinatarios, persiste alertas y env�a Web Push a usuarios offline.

import { sendPushToNick } from "./push.service.js";

const TRANSPORT_NOTIFY_ACTIONS = [
  "accessNavTransporte",
  "viewTransportRetail", "manageTransportRetail",
  "viewTransportPedidos", "manageTransportPedidos",
  "viewTransportInventario", "manageTransportInventario",
  "viewTransportDocumentacion", "manageTransportDocumentacion",
  "viewTransportAssignments", "manageTransportAssignments",
  "viewTransportMyRoutes", "manageTransportMyRoutes",
  "viewTransportPostponed", "manageTransportPostponed",
  "viewTransportLogistics", "manageTransportLogistics",
  "viewTransportConsolidated", "manageTransportConsolidated",
];

const TRANSPORT_AREA_NOTIFY_ACTIONS = {
  retail: ["viewTransportRetail", "manageTransportRetail"],
  pedidos: ["viewTransportPedidos", "manageTransportPedidos"],
  inventario: ["viewTransportInventario", "manageTransportInventario"],
  foraneas: ["viewTransportLogistics", "manageTransportLogistics", "viewTransportPedidos", "manageTransportPedidos"],
  documentacion: ["viewTransportDocumentacion", "manageTransportDocumentacion"],
};

function makeNotificationId(prefix = "tn") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Resuelve la lista de userIds que deben recibir notificaci�n de transporte.
 * @param {Array} users  state.users
 * @param {Object} permissions  state.permissions
 * @param {Function} canDo  warehouse.store.canUserDoWarehouseAction
 * @param {Object} options  { excludeUserId, restrictToUserIds }
 * @returns {Array<string>}
 */
export function resolveTransportRecipientUserIds(users, permissions, canDo, options = {}) {
  const excludeId = String(options?.excludeUserId || "").trim();
  const restrict = Array.isArray(options?.restrictToUserIds) && options.restrictToUserIds.length
    ? new Set(options.restrictToUserIds.map((id) => String(id || "").trim()).filter(Boolean))
    : null;
  const transportAreaId = String(options?.transportAreaId || options?.areaId || "").trim().toLowerCase();
  const notificationType = String(options?.type || "").trim().toLowerCase();
  let areaActions = transportAreaId ? TRANSPORT_AREA_NOTIFY_ACTIONS[transportAreaId] : null;
  if (!areaActions?.length && notificationType.startsWith("documentacion")) {
    areaActions = TRANSPORT_AREA_NOTIFY_ACTIONS.documentacion;
  }
  const actionsToCheck = areaActions?.length ? areaActions : TRANSPORT_NOTIFY_ACTIONS;
  const usersList = Array.isArray(users) ? users : [];
  const recipients = [];
  for (const user of usersList) {
    if (!user || user.isActive === false) continue;
    const id = String(user.id || "").trim();
    if (!id) continue;
    if (excludeId && id === excludeId) continue;
    if (restrict && !restrict.has(id)) continue;
    const isRecipient = actionsToCheck.some((actionId) => {
      try { return canDo(user, actionId, permissions); }
      catch { return false; }
    });
    if (isRecipient) recipients.push(id);
  }
  return recipients;
}

/**
 * Construye una notificaci�n normalizada para guardar en state.
 */
export function buildTransportNotification({
  type,
  title,
  message,
  meta = "",
  tone = "info",
  targetUserIds = [],
  targetPage = "transport",
  alertMode = "sound-vibration",
  recordId = "",
  highlightUserIds = [],
}) {
  const normalizedTargets = Array.from(new Set((Array.isArray(targetUserIds) ? targetUserIds : [])
    .map((id) => String(id || "").trim())
    .filter(Boolean)));
  const normalizedHighlight = Array.from(new Set((Array.isArray(highlightUserIds) ? highlightUserIds : [])
    .map((id) => String(id || "").trim())
    .filter(Boolean)));
  return {
    id: makeNotificationId("tn"),
    type: String(type || "transport_event").trim(),
    title: String(title || "Notificaci�n").trim(),
    message: String(message || "").trim(),
    meta: String(meta || "").trim(),
    tone: String(tone || "info").trim(),
    targetPage: String(targetPage || "transport").trim(),
    alertMode: String(alertMode || "sound-vibration").trim(),
    recordId: String(recordId || "").trim(),
    targetUserIds: normalizedTargets,
    highlightUserIds: normalizedHighlight,
    readByUserIds: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Recorta notificaciones para que la lista no crezca infinitamente.
 * Se mantienen las �ltimas N y se descartan las le�das m�s antiguas.
 */
export function trimTransportNotifications(list, { maxTotal = 400, maxAgeDays = 30 } = {}) {
  const arr = Array.isArray(list) ? list : [];
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const filtered = arr.filter((entry) => {
    if (!entry?.createdAt) return true;
    const ts = Date.parse(entry.createdAt);
    return Number.isFinite(ts) ? ts >= cutoff : true;
  });
  if (filtered.length <= maxTotal) return filtered;
  return filtered.slice(0, maxTotal);
}

/**
 * Env�a Web Push a los usuarios destinatarios.
 * Resuelve userIds ? nicknames del state.users y delega a sendPushToNick.
 */
export async function sendTransportPushToUsers(users, targetUserIds, payload) {
  const userMap = new Map();
  for (const user of (Array.isArray(users) ? users : [])) {
    if (!user?.id) continue;
    userMap.set(String(user.id).trim(), user);
  }
  const nicknames = (Array.isArray(targetUserIds) ? targetUserIds : [])
    .map((id) => userMap.get(String(id || "").trim())?.name)
    .map((name) => String(name || "").trim())
    .filter(Boolean);
  const uniqueNicknames = Array.from(new Set(nicknames));
  await Promise.allSettled(uniqueNicknames.map((nick) => sendPushToNick(nick, payload)));
}

/**
 * Marca una notificaci�n como le�da por un userId.
 */
export function markTransportNotificationsRead(list, userId, notificationIds) {
  const targetUserId = String(userId || "").trim();
  if (!targetUserId) return list;
  const ids = new Set((Array.isArray(notificationIds) ? notificationIds : [])
    .map((id) => String(id || "").trim())
    .filter(Boolean));
  if (!ids.size) return list;
  return (Array.isArray(list) ? list : []).map((entry) => {
    if (!entry || !ids.has(entry.id)) return entry;
    const readSet = new Set(Array.isArray(entry.readByUserIds) ? entry.readByUserIds : []);
    readSet.add(targetUserId);
    return { ...entry, readByUserIds: Array.from(readSet) };
  });
}

/**
 * Devuelve las notificaciones visibles para un userId.
 */
export function getTransportNotificationsForUser(list, userId, { limit = 100 } = {}) {
  const targetUserId = String(userId || "").trim();
  if (!targetUserId) return [];
  const arr = Array.isArray(list) ? list : [];
  const visible = arr.filter((entry) => {
    if (!entry) return false;
    const targets = Array.isArray(entry.targetUserIds) ? entry.targetUserIds : [];
    return targets.length === 0 || targets.includes(targetUserId);
  });
  return visible.slice(0, limit);
}

export { TRANSPORT_NOTIFY_ACTIONS, TRANSPORT_AREA_NOTIFY_ACTIONS };
