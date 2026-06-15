// Notificaciones de inventario (insumos para pedidos)

export const ORDER_INVENTORY_NOTIFY_ACTIONS = [
  "viewOrderInventory",
  "manageOrderInventory",
  "deleteOrderInventory",
  "importOrderInventory",
];

/**
 * Usuarios con acceso a la pestaña de insumos para pedidos.
 * @param {Object} options  { excludeUserId }
 */
export function resolveOrderInventoryRecipientUserIds(users, permissions, canDo, options = {}) {
  const excludeId = String(options?.excludeUserId || "").trim();
  const usersList = Array.isArray(users) ? users : [];
  const recipients = [];

  for (const user of usersList) {
    if (!user || user.isActive === false) continue;
    const id = String(user.id || "").trim();
    if (!id) continue;
    if (excludeId && id === excludeId) continue;

    const isRecipient = ORDER_INVENTORY_NOTIFY_ACTIONS.some((actionId) => {
      try { return canDo(user, actionId, permissions); }
      catch { return false; }
    });
    if (isRecipient) recipients.push(id);
  }

  return recipients;
}
