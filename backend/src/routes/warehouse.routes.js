import { Router } from "express";
import { requireAuth, requireWarehouseAction, requireWarehouseStateWriteAccess } from "../middleware/auth.middleware.js";
import { auditSecurityEvent } from "../services/security-events.service.js";
import { buildOperationalAnalyticsFromLocalState } from "../services/warehouse.analytics.local.js";
import { getRoadNewsForMexico } from "../services/transport-news.service.js";
import {
  addWarehouseArea,
  createWarehouseCatalogItem,
  createWarehouseBoard,
  bulkImportWarehouseBoardRows,
  createWarehouseBoardRow,
  createWarehouseInventoryItem,
  duplicateWarehouseInventoryItem,
  createWarehouseInventoryColumn,
  deleteWarehouseInventoryColumn,
  createWarehouseInventoryMovement,
  createWarehouseTemplate,
  createWarehouseUser,
  deleteWarehouseCatalogItem,
  deleteWarehouseBoard,
  deleteWarehouseBoardRow,
  deleteBoardHistoryRow,
  patchBoardHistoryRow,
  deleteWarehouseInventoryItem,
  deleteWarehouseTemplate,
  deleteWarehouseUser,
  createWarehouseWeekFromCatalog,
  deleteWarehouseWeek,
  resetWarehouseDashboardData,
  duplicateWarehouseBoard,
  getWarehouseState,
  getRawWarehouseState,
  importWarehouseInventoryItems,
  patchWarehouseBoardRow,
  replaceWarehouseState,
  subscribeWarehouseState,
  updateWarehouseBoard,
  updateWarehouseBoardAssignment,
  updateWarehouseBoardOperationalContext,
  updateWarehouseCatalogItem,
  updateWarehouseInventoryItem,
  updateWarehouseInventoryLotHistory,
  createWarehouseInventoryDestination,
  updateWarehouseInventoryDestination,
  deleteWarehouseInventoryDestination,
  createWarehouseTransportRecord,
  updateWarehouseTransportRecord,
  updateWarehouseTransportLogistics,
  deleteWarehouseTransportRecord,
  postponeTransportRecord,
  reactivatePostponedTransportRecord,
  assignTransportRoute,
  updateTransportRecordStatus,
  getTransportRecordsByDriver,
  getPendingTransportRecords,
  updateWarehousePermissionOverride,
  updateWarehousePermissionsModel,
  updateWarehouseSelfProfile,
  updateWarehouseTemplate,
  updateWarehouseUser,
  toggleWarehouseUserActive,
  transferWarehouseLead,
  getCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  createIncidencia,
  updateIncidencia,
  deleteIncidencia,
  addEvidenciaToIncidencia,
  removeEvidenciaFromIncidencia,
  removeWarehouseArea,
  addCotizacionToIncidencia,
  updateCotizacion,
  deleteCotizacion,
  upsertProcessAuditTemplate,
  upsertOperationalInspectionTemplate,
  deleteOperationalInspectionTemplate,
  deleteProcessAuditTemplate,
  createProcessAudit,
  updateProcessAudit,
  updateWarehouseSystemOperationalSettings,
  deleteProcessAudit,
  resetProcessAuditStats,
  addProcessAuditEvidence,
  removeProcessAuditEvidence,
  restoreWarehouseStateForDemo,
  createDocumentacionRecord,
  updateDocumentacionRecord,
  assignDocumentacionRoute,
  updateDocumentacionRecordStatus,
  addDocumentacionArea,
  deleteDocumentacionArea,
  publishTransportNotification,
  getTransportNotificationRecipients,
  listTransportNotificationsForUser,
  markTransportNotificationsAsRead,
  markInboxNotificationsAsRead,
} from "../services/warehouse.store.js";
import { getIO } from "../config/socket.js";

export const warehouseRouter = Router();

const TRANSPORT_AREA_LABELS = {
  retail: "Retail",
  pedidos: "Pedidos",
  inventario: "Inventario",
  foraneas: "Foráneas",
  documentacion: "Documentación",
};

function dispatchTransportAlert({
  type,
  title,
  message,
  meta = "",
  tone = "info",
  alertMode = "sound-vibration",
  targetPage = "transport",
  recordId = "",
  excludeUserId = "",
  extraUserIds = [],
}) {
  try {
    const recipients = getTransportNotificationRecipients({ excludeUserId });
    const extras = (Array.isArray(extraUserIds) ? extraUserIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean)
      .filter((id) => id !== excludeUserId);
    const targetUserIds = Array.from(new Set([...recipients, ...extras]));
    if (!targetUserIds.length) return null;
    return publishTransportNotification({
      type, title, message, meta, tone, alertMode,
      targetPage, recordId, targetUserIds,
      highlightUserIds: extras,
    });
  } catch (err) {
    console.warn("[transport_dispatch] error:", err?.message || err);
    return null;
  }
}

warehouseRouter.get("/state", (_req, res) => {
  res.json(getWarehouseState());
});

warehouseRouter.get("/analytics/operational", requireAuth, (req, res) => {
  try {
    const state = getWarehouseState();
    const analytics = buildOperationalAnalyticsFromLocalState(state, {
      now: req.query?.now || undefined,
    });
    res.json({ ok: true, data: analytics });
  } catch (error) {
    auditSecurityEvent("warehouse_operational_analytics_failed", req, {
      message: String(error?.message || "analytics_error"),
    });
    res.status(500).json({ ok: false, message: "No fue posible construir la analítica operativa local." });
  }
});

warehouseRouter.put("/state", requireWarehouseStateWriteAccess, (req, res) => {
  const incomingState = req.body || {};
  const currentState = getRawWarehouseState();
  const currentUsers = Array.isArray(currentState?.users) ? currentState.users : [];
  const nextUsers = Array.isArray(incomingState?.users) ? incomingState.users : null;

  if (currentUsers.length > 0 && Array.isArray(nextUsers) && nextUsers.length === 0) {
    auditSecurityEvent("warehouse_state_replace_rejected", req, {
      reason: "empty_users_payload",
      currentUsers: currentUsers.length,
    });
    res.status(409).json({ ok: false, message: "Se rechazó un reemplazo total que vaciaba los usuarios del sistema." });
    return;
  }

  const nextState = replaceWarehouseState(incomingState);
  auditSecurityEvent("warehouse_state_replaced", req, {
    revision: nextState?.revision,
    users: Array.isArray(nextState?.users) ? nextState.users.length : 0,
    boards: Array.isArray(nextState?.controlBoards) ? nextState.controlBoards.length : 0,
  });
  res.json(nextState);
});

warehouseRouter.post("/state/restore-demo", requireAuth, (req, res) => {
  const result = restoreWarehouseStateForDemo(req.auth, req.body?.snapshot || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible restaurar el estado demo." });
    return;
  }

  auditSecurityEvent("warehouse_demo_state_restored", req, {
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state } });
});

warehouseRouter.post("/weeks", requireWarehouseAction("createWeek"), (_req, res) => {
  const nextState = createWarehouseWeekFromCatalog();
  auditSecurityEvent("warehouse_week_created", _req, {
    revision: nextState?.revision,
    totalWeeks: Array.isArray(nextState?.weeks) ? nextState.weeks.length : 0,
  });
  res.status(201).json(nextState);
});

warehouseRouter.delete("/weeks/:weekId", requireWarehouseAction("deleteWeek"), (req, res) => {
  const result = deleteWarehouseWeek(req.auth, req.params.weekId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "week_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar la semana." });
    return;
  }

  auditSecurityEvent("warehouse_week_deleted", req, {
    weekId: result.weekId,
    weekName: result.weekName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, weekId: result.weekId, weekName: result.weekName } });
});

warehouseRouter.post("/dashboard/reset-data", requireWarehouseAction("manageWeeks"), (req, res) => {
  const result = resetWarehouseDashboardData(req.auth);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible reiniciar los datos del dashboard." });
    return;
  }

  auditSecurityEvent("warehouse_dashboard_data_reset", req, {
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state } });
});

warehouseRouter.patch("/system/operational", requireWarehouseAction("manageSystemSettings"), (req, res) => {
  const result = updateWarehouseSystemOperationalSettings(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar la configuración del sistema." });
    return;
  }

  auditSecurityEvent("warehouse_system_operational_updated", req, {
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, operational: result.operational } });
});

warehouseRouter.post("/boards", requireWarehouseAction("saveBoard"), (req, res) => {
  const result = createWarehouseBoard(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible crear el tablero." });
    return;
  }

  auditSecurityEvent("warehouse_board_created", req, {
    boardId: result.boardId,
    boardName: result.boardName,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, boardId: result.boardId, boardName: result.boardName } });
});

warehouseRouter.patch("/boards/:boardId", requireWarehouseAction("saveBoard"), (req, res) => {
  const result = updateWarehouseBoard(req.auth, req.params.boardId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "board_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar el tablero." });
    return;
  }

  auditSecurityEvent("warehouse_board_updated", req, {
    boardId: result.boardId,
    boardName: result.boardName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, boardId: result.boardId, boardName: result.boardName } });
});

warehouseRouter.delete("/boards/:boardId", requireWarehouseAction("deleteBoard"), (req, res) => {
  const result = deleteWarehouseBoard(req.auth, req.params.boardId);
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "board_not_found"
        ? 404
        : result.reason === "forbidden" || result.reason === "system_board"
          ? 403
          : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar el tablero." });
    return;
  }

  auditSecurityEvent("warehouse_board_deleted", req, {
    boardId: result.boardId,
    boardName: result.boardName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, boardId: result.boardId, boardName: result.boardName } });
});

warehouseRouter.post("/boards/:boardId/duplicate", (req, res) => {
  const result = duplicateWarehouseBoard(req.auth, req.params.boardId, Boolean(req.body?.includeRows));
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "board_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible duplicar el tablero." });
    return;
  }

  auditSecurityEvent("warehouse_board_duplicated", req, {
    sourceBoardId: req.params.boardId,
    boardId: result.boardId,
    boardName: result.boardName,
    includeRows: Boolean(req.body?.includeRows),
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, boardId: result.boardId, boardName: result.boardName } });
});

warehouseRouter.post("/templates", requireWarehouseAction("saveTemplate"), (req, res) => {
  const result = createWarehouseTemplate(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible guardar la plantilla." });
    return;
  }

  auditSecurityEvent("warehouse_template_created", req, {
    templateId: result.templateId,
    templateName: result.templateName,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, templateId: result.templateId, templateName: result.templateName } });
});

warehouseRouter.patch("/templates/:templateId", requireWarehouseAction("editTemplate"), (req, res) => {
  const result = updateWarehouseTemplate(req.auth, req.params.templateId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "template_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar la plantilla." });
    return;
  }

  auditSecurityEvent("warehouse_template_updated", req, {
    templateId: result.templateId,
    templateName: result.templateName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, templateId: result.templateId, templateName: result.templateName } });
});

warehouseRouter.delete("/templates/:templateId", requireAuth, (req, res) => {
  const result = deleteWarehouseTemplate(req.auth, req.params.templateId);
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "template_not_found"
        ? 404
        : result.reason === "forbidden" || result.reason === "system_template"
          ? 403
          : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar la plantilla." });
    return;
  }

  auditSecurityEvent("warehouse_template_deleted", req, {
    templateId: result.templateId,
    templateName: result.templateName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, templateId: result.templateId, templateName: result.templateName } });
});

warehouseRouter.post("/inventory", requireAuth, (req, res) => {
  const result = createWarehouseInventoryItem(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : result.reason === "duplicate_code" ? 409 : 400;
    res.status(status).json({ ok: false, message: result.reason === "duplicate_code" ? "Ya existe un artículo con ese código." : "No fue posible crear el artículo de inventario." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_item_created", req, {
    itemId: result.itemId,
    itemCode: result.itemCode,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, itemId: result.itemId, itemCode: result.itemCode } });
});

warehouseRouter.patch("/inventory/:itemId", requireAuth, (req, res) => {
  const result = updateWarehouseInventoryItem(req.auth, req.params.itemId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : result.reason === "duplicate_code" ? 409 : 400;
    res.status(status).json({ ok: false, message: result.reason === "duplicate_code" ? "Ya existe un artículo con ese código." : "No fue posible actualizar el artículo de inventario." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_item_updated", req, {
    itemId: result.itemId,
    itemCode: result.itemCode,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, itemId: result.itemId, itemCode: result.itemCode } });
});

warehouseRouter.patch("/inventory/:itemId/lot-history", requireAuth, (req, res) => {
  const result = updateWarehouseInventoryLotHistory(req.auth, req.params.itemId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible guardar el historial de lotes del inventario." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_lot_history_updated", req, {
    itemId: result.itemId,
    itemCode: result.itemCode,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, itemId: result.itemId, itemCode: result.itemCode } });
});

warehouseRouter.post("/inventory/destinations", requireAuth, (req, res) => {
  const result = createWarehouseInventoryDestination(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : result.reason === "duplicate_destination" ? 409 : 400;
    const messages = {
      duplicate_destination: "Ya existe una nave destino con los mismos datos.",
      invalid_payload: "La nave destino no es válida.",
    };
    res.status(status).json({ ok: false, message: messages[result.reason] || "No fue posible guardar la nave destino." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_destination_created", req, {
    destinationId: result.destinationId,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, destinationId: result.destinationId } });
});

warehouseRouter.patch("/inventory/destinations/:destinationId", requireAuth, (req, res) => {
  const result = updateWarehouseInventoryDestination(req.auth, req.params.destinationId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "destination_not_found" ? 404 : result.reason === "forbidden" ? 403 : result.reason === "duplicate_destination" ? 409 : 400;
    const messages = {
      destination_not_found: "No se encontró la nave destino.",
      duplicate_destination: "Ya existe una nave destino con los mismos datos.",
      invalid_payload: "La nave destino no es válida.",
    };
    res.status(status).json({ ok: false, message: messages[result.reason] || "No fue posible actualizar la nave destino." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_destination_updated", req, {
    destinationId: result.destinationId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, destinationId: result.destinationId } });
});

warehouseRouter.delete("/inventory/destinations/:destinationId", requireAuth, (req, res) => {
  const result = deleteWarehouseInventoryDestination(req.auth, req.params.destinationId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "destination_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar la nave destino." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_destination_deleted", req, {
    destinationId: result.destinationId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, destinationId: result.destinationId } });
});

warehouseRouter.post("/transport/records", requireAuth, (req, res) => {
  const result = createWarehouseTransportRecord(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "forbidden"
        ? 403
        : 400;
    const message = result.reason === "evidence_required"
      ? "Debes adjuntar una evidencia para guardar el envio."
      : "No fue posible guardar el registro de transporte.";
    res.status(status).json({ ok: false, message });
    return;
  }

  let createdRecord = null;
  try {
    const currentState = getWarehouseState();
    const transport = currentState?.transport || {};
    createdRecord = (transport?.activeRecords || []).find((r) => r.id === result.recordId);
    const io = getIO();
    io.emit("transport_record_created", {
      recordId: result.recordId,
      record: createdRecord,
      createdByName: createdRecord?.createdByName,
      areaId: createdRecord?.areaId,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[transport_create] socket emit error:", socketErr?.message);
  }

  if (createdRecord) {
    const areaLabel = TRANSPORT_AREA_LABELS[createdRecord.areaId] || createdRecord.areaId || "Transporte";
    dispatchTransportAlert({
      type: "transport_record_created",
      title: `Nuevo envío de ${areaLabel}`,
      message: `${createdRecord.shipmentCode || ""} hacia ${createdRecord.destination || "destino"}`.trim(),
      meta: createdRecord.createdByName || "",
      tone: "warning",
      alertMode: "sound-vibration",
      recordId: createdRecord.id,
      excludeUserId: req.auth?.userId,
    });
  }

  setImmediate(() => {
    import("../services/transport-road-monitor.service.js")
      .then((module) => module.runTransportRoadMonitorTick())
      .catch((err) => console.debug("[road_monitor] post-create tick:", err?.message));
  });

  auditSecurityEvent("warehouse_transport_record_created", req, {
    recordId: result.recordId,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, recordId: result.recordId } });
});

warehouseRouter.patch("/transport/records/:recordId", requireAuth, (req, res) => {
  const result = updateWarehouseTransportRecord(req.auth, req.params.recordId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "record_not_found"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : 400;
    const message = result.reason === "evidence_required"
      ? "Debes adjuntar una evidencia para guardar el envio."
      : "No fue posible actualizar el registro de transporte.";
    res.status(status).json({ ok: false, message });
    return;
  }

  let updatedRecord = null;
  try {
    const currentState = result.state || getWarehouseState();
    const transport = currentState?.transport || {};
    updatedRecord = (transport?.activeRecords || []).find((r) => r.id === result.recordId)
      || (transport?.history || []).find((r) => r.id === result.recordId)
      || null;
    const io = getIO();
    io.emit("transport_record_updated", {
      recordId: result.recordId,
      record: updatedRecord,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[transport_update] socket emit error:", socketErr?.message);
  }

  if (updatedRecord) {
    const areaLabel = TRANSPORT_AREA_LABELS[updatedRecord.areaId] || updatedRecord.areaId || "Transporte";
    dispatchTransportAlert({
      type: "transport_record_updated",
      title: `Envío editado (${areaLabel})`,
      message: `${updatedRecord.shipmentCode || ""} • ${updatedRecord.destination || "destino"}`.trim(),
      meta: req.auth?.userName || "",
      tone: "info",
      alertMode: "vibration-only",
      recordId: updatedRecord.id,
      excludeUserId: req.auth?.userId,
    });
  }

  auditSecurityEvent("warehouse_transport_record_updated", req, {
    recordId: result.recordId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, recordId: result.recordId } });
});

warehouseRouter.delete("/transport/records/:recordId", requireAuth, (req, res) => {
  const result = deleteWarehouseTransportRecord(req.auth, req.params.recordId);
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "record_not_found"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar el registro de transporte." });
    return;
  }

  try {
    const io = getIO();
    io.emit("transport_record_deleted", {
      recordId: result.recordId,
      record: result.record,
      deletedByName: req.auth?.userName || result.deletedByName || null,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[transport_delete] socket emit error:", socketErr?.message);
  }

  if (result.record) {
    const areaLabel = TRANSPORT_AREA_LABELS[result.record.areaId] || result.record.areaId || "Transporte";
    dispatchTransportAlert({
      type: "transport_record_deleted",
      title: `Envío eliminado (${areaLabel})`,
      message: `${result.record.shipmentCode || ""} • ${result.record.destination || "destino"}`.trim(),
      meta: req.auth?.userName || "",
      tone: "danger",
      alertMode: "sound-vibration",
      recordId: result.record.id,
      excludeUserId: req.auth?.userId,
    });
  }

  auditSecurityEvent("warehouse_transport_record_deleted", req, {
    recordId: result.recordId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, recordId: result.recordId } });
});

warehouseRouter.post("/transport/records/:recordId/assign", requireAuth, (req, res) => {
  const result = assignTransportRoute(req.auth, req.params.recordId, req.body?.driverId || "");
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "record_not_found" || result.reason === "invalid_driver"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : 400;
    res.status(status).json({ ok: false, message: "No fue posible asignar la ruta al conductor." });
    return;
  }

  try {
    const io = getIO();
    io.emit("transport_route_assigned", {
      recordId: result.recordId,
      record: result.record,
      driver: result.driver,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[transport_assign] socket emit error:", socketErr?.message);
  }

  if (result.record) {
    const areaLabel = TRANSPORT_AREA_LABELS[result.record.areaId] || result.record.areaId || "Transporte";
    dispatchTransportAlert({
      type: "transport_route_assigned",
      title: `Ruta asignada (${areaLabel})`,
      message: `${result.record.shipmentCode || ""} → ${result.driver?.name || "conductor"}`.trim(),
      meta: req.auth?.userName || "",
      tone: "info",
      alertMode: "sound-vibration",
      recordId: result.record.id,
      excludeUserId: req.auth?.userId,
      extraUserIds: result.driver?.id ? [result.driver.id] : [],
    });
  }

  auditSecurityEvent("warehouse_transport_route_assigned", req, {
    recordId: result.recordId,
    driverId: result.driver?.id,
    driverName: result.driver?.name,
  });
  res.json({ ok: true, data: { recordId: result.recordId, record: result.record } });
});

warehouseRouter.post("/transport/records/:recordId/postpone", requireAuth, (req, res) => {
  const result = postponeTransportRecord(req.auth, req.params.recordId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "record_not_found"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : 400;
    const message = result.reason === "invalid_postponed_until" || result.reason === "postponed_until_in_past"
      ? "Debes indicar una fecha y hora futura para posponer el envío."
      : result.reason === "invalid_reminder"
        ? "El tiempo de anticipación para recordar no es válido."
        : "No fue posible posponer el envío.";
    res.status(status).json({ ok: false, message });
    return;
  }

  try {
    const io = getIO();
    io.emit("transport_record_postponed", {
      recordId: result.recordId,
      record: result.record,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[transport_postpone] socket emit error:", socketErr?.message);
  }

  if (result.record) {
    const areaLabel = TRANSPORT_AREA_LABELS[result.record.areaId] || result.record.areaId || "Transporte";
    dispatchTransportAlert({
      type: "transport_record_postponed",
      title: `Envío pospuesto (${areaLabel})`,
      message: `${result.record.shipmentCode || ""} • ${result.record.destination || ""}`.trim(),
      meta: req.auth?.userName || "",
      tone: "warning",
      alertMode: "vibration-only",
      recordId: result.record.id,
      excludeUserId: req.auth?.userId,
    });
  }

  auditSecurityEvent("warehouse_transport_record_postponed", req, {
    recordId: result.recordId,
    postponedUntil: result.record?.postponedUntil,
    remindAt: result.record?.postponedRemindAt,
  });
  res.json({ ok: true, data: { recordId: result.recordId, record: result.record } });
});

warehouseRouter.post("/transport/records/:recordId/reactivate", requireAuth, (req, res) => {
  const result = reactivatePostponedTransportRecord(req.auth, req.params.recordId);
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "record_not_found"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : 400;
    res.status(status).json({ ok: false, message: "No fue posible reactivar el envío pospuesto." });
    return;
  }

  try {
    const io = getIO();
    io.emit("transport_status_updated", {
      recordId: result.recordId,
      record: result.record,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[transport_reactivate] socket emit error:", socketErr?.message);
  }

  if (result.record) {
    const areaLabel = TRANSPORT_AREA_LABELS[result.record.areaId] || result.record.areaId || "Transporte";
    dispatchTransportAlert({
      type: "transport_record_reactivated",
      title: `Envío reactivado (${areaLabel})`,
      message: `${result.record.shipmentCode || ""} • ${result.record.destination || ""}`.trim(),
      meta: req.auth?.userName || "",
      tone: "info",
      alertMode: "vibration-only",
      recordId: result.record.id,
      excludeUserId: req.auth?.userId,
    });
  }

  auditSecurityEvent("warehouse_transport_record_reactivated", req, {
    recordId: result.recordId,
    status: result.record?.status,
  });
  res.json({ ok: true, data: { recordId: result.recordId, record: result.record } });
});

warehouseRouter.patch("/transport/records/:recordId/status", requireAuth, (req, res) => {
  const result = updateTransportRecordStatus(
    req.auth,
    req.params.recordId,
    req.body?.status || "",
    {
      ...(req.body?.deliveryEvidence || {}),
      reason: req.body?.reason || "",
    }
  );
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "record_not_found"
        ? 404
        : result.reason === "forbidden" || result.reason === "invalid_status"
          ? 403
          : 400;
    const message = result.reason === "reason_required"
      ? "Debes indicar el motivo para marcar la ruta en retorno."
      : "No fue posible actualizar el estado de la ruta.";
    res.status(status).json({ ok: false, message });
    return;
  }

  try {
    const io = getIO();
    io.emit("transport_status_updated", {
      recordId: result.recordId,
      record: result.record,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[transport_status] socket emit error:", socketErr?.message);
  }

  if (result.record) {
    const areaLabel = TRANSPORT_AREA_LABELS[result.record.areaId] || result.record.areaId || "Transporte";
    const statusLabel = String(result.record.status || "").trim() || "actualizado";
    dispatchTransportAlert({
      type: "transport_status_updated",
      title: `Ruta ${statusLabel} (${areaLabel})`,
      message: `${result.record.shipmentCode || ""} • ${result.record.destination || ""}`.trim(),
      meta: req.auth?.userName || "",
      tone: statusLabel.toLowerCase().includes("entreg") ? "success" : "info",
      alertMode: "sound-vibration",
      recordId: result.record.id,
      excludeUserId: req.auth?.userId,
    });
  }

  auditSecurityEvent("warehouse_transport_status_updated", req, {
    recordId: result.recordId,
    newStatus: result.record?.status,
  });
  res.json({ ok: true, data: { recordId: result.recordId, record: result.record } });
});

warehouseRouter.get("/transport/routes/assigned/:driverId", requireAuth, (req, res) => {
  const result = getTransportRecordsByDriver(req.auth, req.params.driverId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : 400;
    res.status(status).json({ ok: false, message: "No fue posible obtener las rutas asignadas." });
    return;
  }

  res.json({ ok: true, data: { records: result.records } });
});

warehouseRouter.get("/transport/records/pending", requireAuth, (req, res) => {
  const result = getPendingTransportRecords(req.auth);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : 400;
    res.status(status).json({ ok: false, message: "No fue posible obtener los envíos pendientes." });
    return;
  }

  res.json({ ok: true, data: { records: result.records } });
});

warehouseRouter.get("/transport/news", requireAuth, async (req, res) => {
  try {
    const data = await getRoadNewsForMexico({
      topic: req.query?.topic,
      region: req.query?.region,
      q: req.query?.q,
      hours: req.query?.hours,
      limit: req.query?.limit,
    });

    res.json({ ok: true, data });
  } catch (error) {
    auditSecurityEvent("warehouse_transport_news_fetch_failed", req, {
      message: String(error?.message || "transport_news_error"),
    });
    const detail = String(error?.message || "").trim();
    res.status(502).json({
      ok: false,
      message: "No fue posible consultar noticias viales por el momento. Intenta de nuevo en unos minutos.",
      detail: detail && !detail.includes("password") ? detail : undefined,
    });
  }
});

warehouseRouter.patch("/transport/logistics", requireAuth, (req, res) => {
  const result = updateWarehouseTransportLogistics(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible guardar la logística de transporte." });
    return;
  }

  auditSecurityEvent("warehouse_transport_logistics_updated", req, {
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state } });
});

// ─── Notificaciones de transporte (persistencia server-side) ─────────────────
warehouseRouter.get("/transport/notifications", requireAuth, (req, res) => {
  const limit = Number.parseInt(req.query?.limit, 10);
  const result = listTransportNotificationsForUser(req.auth, {
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 300) : 100,
  });
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : 400;
    res.status(status).json({ ok: false, message: "No fue posible obtener las notificaciones." });
    return;
  }
  res.json({ ok: true, data: { notifications: result.notifications } });
});

warehouseRouter.post("/transport/notifications/read", requireAuth, (req, res) => {
  const ids = Array.isArray(req.body?.notificationIds)
    ? req.body.notificationIds
    : [req.body?.notificationId].filter(Boolean);
  const result = markTransportNotificationsAsRead(req.auth, ids);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : 400;
    res.status(status).json({ ok: false, message: "No fue posible marcar las notificaciones." });
    return;
  }
  res.json({ ok: true });
});

warehouseRouter.post("/notifications/read", requireAuth, (req, res) => {
  const ids = Array.isArray(req.body?.notificationIds)
    ? req.body.notificationIds
    : [req.body?.notificationId].filter(Boolean);
  const result = markInboxNotificationsAsRead(req.auth, ids);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : 400;
    res.status(status).json({ ok: false, message: "No fue posible marcar las notificaciones como leídas." });
    return;
  }
  res.json({ ok: true, data: { readIds: result.readIds || [] } });
});

// ─── Documentación ───────────────────────────────────────────────────────────
warehouseRouter.post("/documentacion/records", requireAuth, (req, res) => {
  const result = createDocumentacionRecord(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    const messages = {
      document_required: "Debes adjuntar el documento para guardar el registro.",
      area_required: "El área es obligatoria.",
      dirigidoA_required: "El campo 'Dirigido a' es obligatorio.",
      invalid_ubicacion: "La ubicación no es válida.",
    };
    res.status(status).json({ ok: false, message: messages[result.reason] || "No fue posible guardar el registro de documentación." });
    return;
  }

  let createdDocRecord = null;
  try {
    const io = getIO();
    const docRecords = Array.isArray(result.state?.documentacion?.records) ? result.state.documentacion.records : [];
    createdDocRecord = docRecords.find((entry) => entry.id === result.recordId) || null;
    io.emit("documentacion_record_created", {
      recordId: result.recordId,
      record: createdDocRecord,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[documentacion_create] socket emit error:", socketErr?.message);
  }

  if (createdDocRecord) {
    dispatchTransportAlert({
      type: "documentacion_record_created",
      title: "Nueva documentación",
      message: `${createdDocRecord.dirigidoA || "Destinatario"} • ${createdDocRecord.area || ""}`.trim(),
      meta: req.auth?.userName || "",
      tone: "warning",
      alertMode: "sound-vibration",
      targetPage: "documentacion",
      recordId: createdDocRecord.id,
      excludeUserId: req.auth?.userId,
    });
  }

  auditSecurityEvent("documentacion_record_created", req, { recordId: result.recordId });
  res.status(201).json({ ok: true, data: { state: result.state, recordId: result.recordId } });
});

warehouseRouter.patch("/documentacion/records/:recordId", requireAuth, (req, res) => {
  const result = updateDocumentacionRecord(req.auth, req.params.recordId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "record_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar el registro de documentación." });
    return;
  }

  let updatedDocRecord = null;
  try {
    const io = getIO();
    const docRecords = Array.isArray(result.state?.documentacion?.records) ? result.state.documentacion.records : [];
    updatedDocRecord = docRecords.find((entry) => entry.id === result.recordId) || null;
    io.emit("documentacion_record_updated", {
      recordId: result.recordId,
      record: updatedDocRecord,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[documentacion_update] socket emit error:", socketErr?.message);
  }

  if (updatedDocRecord) {
    dispatchTransportAlert({
      type: "documentacion_record_updated",
      title: "Documentación editada",
      message: `${updatedDocRecord.dirigidoA || "Destinatario"} • ${updatedDocRecord.area || ""}`.trim(),
      meta: req.auth?.userName || "",
      tone: "info",
      alertMode: "vibration-only",
      targetPage: "documentacion",
      recordId: updatedDocRecord.id,
      excludeUserId: req.auth?.userId,
    });
  }

  auditSecurityEvent("documentacion_record_updated", req, { recordId: result.recordId });
  res.json({ ok: true, data: { state: result.state, recordId: result.recordId } });
});

warehouseRouter.post("/documentacion/records/:recordId/assign", requireAuth, (req, res) => {
  const result = assignDocumentacionRoute(req.auth, req.params.recordId, req.body?.driverId || "");
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "record_not_found" || result.reason === "invalid_driver"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : 400;
    res.status(status).json({ ok: false, message: "No fue posible asignar la ruta de documentación." });
    return;
  }

  try {
    const io = getIO();
    io.emit("documentacion_route_assigned", {
      recordId: result.recordId,
      record: result.record,
      driver: result.driver,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[documentacion_assign] socket emit error:", socketErr?.message);
  }

  if (result.record) {
    dispatchTransportAlert({
      type: "documentacion_route_assigned",
      title: "Documentación asignada",
      message: `${result.record.dirigidoA || ""} → ${result.driver?.name || "conductor"}`.trim(),
      meta: req.auth?.userName || "",
      tone: "info",
      alertMode: "sound-vibration",
      targetPage: "documentacion",
      recordId: result.record.id,
      excludeUserId: req.auth?.userId,
      extraUserIds: result.driver?.id ? [result.driver.id] : [],
    });
  }

  auditSecurityEvent("documentacion_route_assigned", req, {
    recordId: result.recordId,
    driverId: result.driver?.id,
    driverName: result.driver?.name,
  });
  res.json({ ok: true, data: { recordId: result.recordId, record: result.record } });
});

warehouseRouter.patch("/documentacion/records/:recordId/status", requireAuth, (req, res) => {
  const result = updateDocumentacionRecordStatus(req.auth, req.params.recordId, req.body?.status || "", {
    reason: req.body?.reason || "",
  });
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "record_not_found"
        ? 404
        : result.reason === "forbidden" || result.reason === "invalid_status"
          ? 403
          : 400;
    const message = result.reason === "reason_required"
      ? "Debes indicar el motivo para marcar la ruta en retorno."
      : "No fue posible actualizar el estado de documentación.";
    res.status(status).json({ ok: false, message });
    return;
  }

  try {
    const io = getIO();
    io.emit("documentacion_status_updated", {
      recordId: result.recordId,
      record: result.record,
      ts: Date.now(),
    });
  } catch (socketErr) {
    console.debug("[documentacion_status] socket emit error:", socketErr?.message);
  }

  if (result.record) {
    const statusLabel = String(result.record.status || "").trim() || "actualizado";
    dispatchTransportAlert({
      type: "documentacion_status_updated",
      title: `Documentación ${statusLabel}`,
      message: `${result.record.dirigidoA || ""} • ${result.record.area || ""}`.trim(),
      meta: req.auth?.userName || "",
      tone: statusLabel.toLowerCase().includes("entreg") ? "success" : "info",
      alertMode: "sound-vibration",
      targetPage: "documentacion",
      recordId: result.record.id,
      excludeUserId: req.auth?.userId,
    });
  }

  auditSecurityEvent("documentacion_status_updated", req, {
    recordId: result.recordId,
    newStatus: result.record?.status,
  });
  res.json({ ok: true, data: { recordId: result.recordId, record: result.record } });
});

warehouseRouter.post("/documentacion/areas", requireAuth, (req, res) => {
  const result = addDocumentacionArea(req.auth, req.body?.name || "");
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : 400;
    const message = result.reason === "already_exists" ? "Esa área ya existe." : "No fue posible agregar el área.";
    res.status(status).json({ ok: false, message });
    return;
  }
  res.status(201).json({ ok: true, data: { state: result.state } });
});

warehouseRouter.delete("/documentacion/areas/:name", requireAuth, (req, res) => {
  const result = deleteDocumentacionArea(req.auth, decodeURIComponent(req.params.name || ""));
  if (!result.ok) {
    res.status(result.reason === "auth_required" ? 401 : 400).json({ ok: false, message: "No fue posible eliminar el área." });
    return;
  }
  res.json({ ok: true, data: { state: result.state } });
});

warehouseRouter.delete("/inventory/:itemId", requireAuth, (req, res) => {
  const result = deleteWarehouseInventoryItem(req.auth, req.params.itemId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar el artículo de inventario." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_item_deleted", req, {
    itemId: result.itemId,
    itemCode: result.itemCode,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, itemId: result.itemId, itemCode: result.itemCode } });
});

warehouseRouter.post("/inventory/:itemId/duplicate", requireAuth, (req, res) => {
  const result = duplicateWarehouseInventoryItem(req.auth, req.params.itemId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible duplicar el artículo de inventario." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_item_duplicated", req, {
    sourceItemId: result.sourceItemId,
    itemId: result.itemId,
    itemCode: result.itemCode,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, itemId: result.itemId, itemCode: result.itemCode } });
});

warehouseRouter.post("/inventory/columns", requireAuth, (req, res) => {
  const result = createWarehouseInventoryColumn(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible crear la columna de inventario." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_column_created", req, {
    columnId: result.column?.id,
    columnKey: result.column?.key,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, column: result.column } });
});

warehouseRouter.delete("/inventory/columns/:columnId", requireAuth, (req, res) => {
  const result = deleteWarehouseInventoryColumn(req.auth, req.params.columnId);
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "column_not_found"
        ? 404
        : result.reason === "forbidden" || result.reason === "system_column"
          ? 403
          : 400;
    const message = result.reason === "system_column"
      ? "La columna es del sistema y no se puede eliminar."
      : "No fue posible eliminar la columna de inventario.";
    res.status(status).json({ ok: false, message });
    return;
  }

  auditSecurityEvent("warehouse_inventory_column_deleted", req, {
    columnId: result.columnId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, columnId: result.columnId } });
});

warehouseRouter.post("/process-audits/templates", requireAuth, (req, res) => {
  const result = upsertProcessAuditTemplate(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible guardar la plantilla de auditoría." });
    return;
  }

  auditSecurityEvent("warehouse_process_audit_template_saved", req, {
    templateId: result.templateId,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, templateId: result.templateId } });
});

warehouseRouter.post("/operational-templates", requireAuth, (req, res) => {
  try {
    const result = upsertOperationalInspectionTemplate(req.auth, req.body || {});
    if (!result.ok) {
      const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
      res.status(status).json({ ok: false, message: "No fue posible guardar la plantilla operativa." });
      return;
    }

    auditSecurityEvent("warehouse_operational_template_saved", req, {
      templateId: result.templateId,
      revision: result.state?.revision,
    });
    res.status(201).json({ ok: true, data: { state: result.state, templateId: result.templateId } });
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err?.message || "error") });
  }
});

warehouseRouter.delete("/operational-templates/:templateId", requireAuth, (req, res) => {
  try {
    const result = deleteOperationalInspectionTemplate(req.auth, req.params.templateId);
    if (!result.ok) {
      const statusByReason = {
        auth_required: 401,
        forbidden: 403,
        forbidden_builtin: 403,
        not_found: 404,
        invalid_payload: 400,
      };
      const status = statusByReason[result.reason] || 400;
      const messageByReason = {
        forbidden_builtin: "No se puede eliminar un checklist de sistema.",
        not_found: "Checklist no encontrado.",
      };
      res.status(status).json({ ok: false, message: messageByReason[result.reason] || "No fue posible eliminar el checklist." });
      return;
    }

    auditSecurityEvent("warehouse_operational_template_deleted", req, {
      templateId: result.templateId,
      revision: result.state?.revision,
    });
    res.status(200).json({ ok: true, data: { state: result.state, templateId: result.templateId } });
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err?.message || "error") });
  }
});

warehouseRouter.delete("/process-audits/templates/:templateId", requireAuth, (req, res) => {
  const result = deleteProcessAuditTemplate(req.auth, req.params.templateId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "template_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar la plantilla de auditoría." });
    return;
  }

  auditSecurityEvent("warehouse_process_audit_template_deleted", req, {
    templateId: result.templateId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, templateId: result.templateId } });
});

warehouseRouter.post("/process-audits", requireAuth, (req, res) => {
  const result = createProcessAudit(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible crear la auditoría." });
    return;
  }

  auditSecurityEvent("warehouse_process_audit_created", req, {
    auditId: result.auditId,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, auditId: result.auditId } });
});

warehouseRouter.patch("/process-audits/:auditId", requireAuth, (req, res) => {
  const result = updateProcessAudit(req.auth, req.params.auditId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "audit_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar la auditoría." });
    return;
  }

  auditSecurityEvent("warehouse_process_audit_updated", req, {
    auditId: result.auditId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, auditId: result.auditId } });
});

warehouseRouter.delete("/process-audits/:auditId", requireAuth, (req, res) => {
  const result = deleteProcessAudit(req.auth, req.params.auditId, req.body?.leadPassword);
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "audit_not_found"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : 400;
    const message = result.reason === "lead_password_required"
      ? "Captura la contraseña de un Lead para eliminar la auditoría."
      : result.reason === "invalid_lead_password"
        ? "La contraseña del Lead no es válida."
        : "No fue posible eliminar la auditoría.";
    res.status(status).json({ ok: false, message });
    return;
  }

  auditSecurityEvent("warehouse_process_audit_deleted", req, {
    auditId: result.auditId,
    approvedByLeadId: result.approvedByLeadId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, auditId: result.auditId } });
});

warehouseRouter.post("/process-audits/reset-stats", requireAuth, (req, res) => {
  const result = resetProcessAuditStats(req.auth);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    const message = result.reason === "forbidden"
      ? "Solo el Lead principal puede reiniciar los contadores."
      : "No fue posible reiniciar los contadores.";
    res.status(status).json({ ok: false, message });
    return;
  }
  auditSecurityEvent("warehouse_process_audit_stats_reset", req, { revision: result.state?.revision });
  res.json({ ok: true, data: { state: result.state } });
});

warehouseRouter.post("/process-audits/:auditId/evidences", requireAuth, (req, res) => {
  const result = addProcessAuditEvidence(req.auth, req.params.auditId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "audit_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible agregar la evidencia." });
    return;
  }

  auditSecurityEvent("warehouse_process_audit_evidence_added", req, {
    auditId: result.auditId,
    evidenceId: result.evidenceId,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, auditId: result.auditId, evidenceId: result.evidenceId } });
});

warehouseRouter.delete("/process-audits/:auditId/evidences/:evidenceId", requireAuth, (req, res) => {
  const result = removeProcessAuditEvidence(req.auth, req.params.auditId, req.params.evidenceId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "audit_not_found" ? 404 : result.reason === "evidence_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar la evidencia." });
    return;
  }

  auditSecurityEvent("warehouse_process_audit_evidence_deleted", req, {
    auditId: result.auditId,
    evidenceId: result.evidenceId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, auditId: result.auditId, evidenceId: result.evidenceId } });
});

warehouseRouter.post("/inventory/import", requireAuth, (req, res) => {
  const result = importWarehouseInventoryItems(req.auth, req.body?.items || []);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible importar el inventario." });
    return;
  }

  auditSecurityEvent("warehouse_inventory_imported", req, {
    createdCount: result.createdCount,
    updatedCount: result.updatedCount,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, createdCount: result.createdCount, updatedCount: result.updatedCount } });
});

warehouseRouter.post("/inventory/movements", requireAuth, (req, res) => {
  const result = createWarehouseInventoryMovement(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "item_not_found"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : result.reason === "insufficient_stock"
            ? 409
            : 400;
    const message = result.reason === "insufficient_stock"
      ? "No hay stock suficiente para registrar este movimiento."
      : result.reason === "invalid_transfer_target"
        ? "Define una nave o un resguardo para registrar la transferencia."
        : result.reason === "remaining_units_required"
          ? "Indica cuántas unidades quedan en ese destino antes de registrar una nueva transferencia."
          : "No fue posible registrar el movimiento de inventario.";
    res.status(status).json({ ok: false, message });
    return;
  }

  auditSecurityEvent("warehouse_inventory_movement_created", req, {
    movementId: result.movementId,
    itemId: result.itemId,
    itemCode: result.itemCode,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, movementId: result.movementId, itemId: result.itemId, itemCode: result.itemCode } });
});

warehouseRouter.patch("/permissions", requireWarehouseAction("managePermissions"), (req, res) => {
  const result = updateWarehousePermissionsModel(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar las reglas de permisos." });
    return;
  }

  auditSecurityEvent("warehouse_permissions_updated", req, {
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state } });
});

warehouseRouter.patch("/permissions/users/:userId", requireWarehouseAction("managePermissions"), (req, res) => {
  const result = updateWarehousePermissionOverride(req.auth, req.params.userId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "user_not_found" ? 404 : result.reason === "invalid_target" ? 400 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar los permisos directos del player." });
    return;
  }

  auditSecurityEvent("warehouse_permission_override_updated", req, {
    targetUserId: req.params.userId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, userId: result.userId } });
});

warehouseRouter.patch("/boards/:boardId/assignment", requireWarehouseAction("managePermissions"), (req, res) => {
  const result = updateWarehouseBoardAssignment(req.auth, req.params.boardId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "board_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar la asignación del tablero." });
    return;
  }

  auditSecurityEvent("warehouse_board_assignment_updated", req, {
    boardId: result.boardId,
    boardName: result.boardName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, boardId: result.boardId, boardName: result.boardName } });
});

warehouseRouter.patch("/boards/:boardId/context", requireAuth, (req, res) => {
  const result = updateWarehouseBoardOperationalContext(req.auth, req.params.boardId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "board_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar el contexto del tablero." });
    return;
  }

  auditSecurityEvent("warehouse_board_context_updated", req, {
    boardId: result.boardId,
    boardName: result.boardName,
    operationalContextValue: result.operationalContextValue,
    revision: result.state?.revision,
  });
  res.json({
    ok: true,
    data: {
      state: result.state,
      boardId: result.boardId,
      boardName: result.boardName,
      operationalContextValue: result.operationalContextValue,
    },
  });
});

warehouseRouter.post("/users", requireWarehouseAction("manageUsers"), (req, res) => {
  const result = createWarehouseUser(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "duplicate_email" ? 409 : result.reason === "forbidden" ? 403 : 400;
    const message = result.reason === "duplicate_email"
      ? "Ya existe un player con ese acceso."
      : result.reason === "weak_temporary_password"
        ? "La contraseña temporal debe tener al menos 4 caracteres."
        : "No fue posible crear el player.";
    res.status(status).json({ ok: false, message });
    return;
  }

  auditSecurityEvent("warehouse_user_created", req, {
    targetUserId: result.userId,
    targetUserName: result.userName,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, userId: result.userId, userName: result.userName } });
});

warehouseRouter.patch("/users/:userId", requireWarehouseAction("manageUsers"), (req, res) => {
  const result = updateWarehouseUser(req.auth, req.params.userId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "user_not_found" ? 404 : result.reason === "duplicate_email" ? 409 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: result.reason === "duplicate_email" ? "Ya existe un player con ese acceso." : "No fue posible actualizar el player." });
    return;
  }

  auditSecurityEvent("warehouse_user_updated", req, {
    targetUserId: result.userId,
    targetUserName: result.userName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, userId: result.userId, userName: result.userName } });
});

warehouseRouter.delete("/users/:userId", requireWarehouseAction("deleteUsers"), (req, res) => {
  const result = deleteWarehouseUser(req.auth, req.params.userId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "user_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar el player." });
    return;
  }

  auditSecurityEvent("warehouse_user_deleted", req, {
    targetUserId: result.userId,
    targetUserName: result.userName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, userId: result.userId, userName: result.userName } });
});

warehouseRouter.post("/users/:userId/transfer-lead", (req, res) => {
  const result = transferWarehouseLead(req.auth, req.params.userId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "user_not_found" ? 404 : 403;
    res.status(status).json({ ok: false, message: "No fue posible transferir el rol de Lead." });
    return;
  }
  auditSecurityEvent("warehouse_lead_transferred", req, {
    targetUserId: result.targetUserId,
    targetUserName: result.targetUserName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state } });
});

warehouseRouter.patch("/users/:userId/active", requireWarehouseAction("manageUsers"), (req, res) => {
  const result = toggleWarehouseUserActive(req.auth, req.params.userId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "user_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible cambiar el estado del player." });
    return;
  }

  auditSecurityEvent("warehouse_user_active_toggled", req, {
    targetUserId: result.userId,
    isActive: result.isActive,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, userId: result.userId, isActive: result.isActive } });
});

warehouseRouter.patch("/users/me/profile", (req, res) => {
  const result = updateWarehouseSelfProfile(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "duplicate_email" ? 409 : result.reason === "self_edit_limit_reached" ? 403 : 400;
    res.status(status).json({
      ok: false,
      message: result.reason === "duplicate_email"
        ? "Ya existe un player con ese acceso."
        : result.reason === "self_edit_limit_reached"
          ? "La autoedicion ya fue utilizada."
          : result.reason === "invalid_email"
            ? "El correo electronico no es valido."
            : "No fue posible actualizar el perfil.",
    });
    return;
  }

  auditSecurityEvent("warehouse_self_profile_updated", req, {
    targetUserId: result.userId,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, userId: result.userId } });
});

warehouseRouter.post("/areas", requireWarehouseAction("manageUsers"), (req, res) => {
  const result = addWarehouseArea(req.auth, req.body?.name || "", req.body?.parentArea || "");
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : result.reason === "duplicate_area" ? 409 : 400;
    res.status(status).json({ ok: false, message: result.reason === "duplicate_area" ? "Esa área ya existe." : "No fue posible agregar el área." });
    return;
  }

  auditSecurityEvent("warehouse_area_added", req, {
    area: result.area,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, area: result.area } });
});

warehouseRouter.delete("/areas/:areaName", requireWarehouseAction("manageUsers"), (req, res) => {
  const targetArea = decodeURIComponent(String(req.params.areaName || ""));
  const result = removeWarehouseArea(req.auth, targetArea);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : result.reason === "area_not_found" ? 404 : 400;
    res.status(status).json({ ok: false, message: result.reason === "area_not_found" ? "Área no encontrada." : "No fue posible eliminar el área." });
    return;
  }

  auditSecurityEvent("warehouse_area_removed", req, {
    area: result.removedArea,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, removedArea: result.removedArea } });
});

warehouseRouter.post("/catalog", requireWarehouseAction("createCatalog"), (req, res) => {
  const result = createWarehouseCatalogItem(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible crear la actividad del catálogo." });
    return;
  }

  auditSecurityEvent("warehouse_catalog_item_created", req, {
    itemId: result.itemId,
    itemName: result.itemName,
    revision: result.state?.revision,
  });
  res.status(201).json({ ok: true, data: { state: result.state, itemId: result.itemId, itemName: result.itemName } });
});

warehouseRouter.patch("/catalog/:itemId", requireWarehouseAction("editCatalog"), (req, res) => {
  const result = updateWarehouseCatalogItem(req.auth, req.params.itemId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible actualizar la actividad del catálogo." });
    return;
  }

  auditSecurityEvent("warehouse_catalog_item_updated", req, {
    itemId: result.itemId,
    itemName: result.itemName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, itemId: result.itemId, itemName: result.itemName } });
});

warehouseRouter.delete("/catalog/:itemId", requireWarehouseAction("deleteCatalog"), (req, res) => {
  const result = deleteWarehouseCatalogItem(req.auth, req.params.itemId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: "No fue posible eliminar la actividad del catálogo." });
    return;
  }

  auditSecurityEvent("warehouse_catalog_item_deleted", req, {
    itemId: result.itemId,
    itemName: result.itemName,
    revision: result.state?.revision,
  });
  res.json({ ok: true, data: { state: result.state, itemId: result.itemId, itemName: result.itemName } });
});

warehouseRouter.post("/boards/:boardId/rows/bulk", (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const result = bulkImportWarehouseBoardRows(req.auth, req.params.boardId, rows);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "board_not_found" ? 404 : 403;
    res.status(status).json({ ok: false, message: "No fue posible importar las filas." });
    return;
  }
  auditSecurityEvent("warehouse_board_rows_bulk_imported", req, {
    boardId: req.params.boardId,
    count: result.count,
    revision: result.state?.revision,
  });
  res.status(201).json(result.state);
});

warehouseRouter.post("/boards/:boardId/rows", (req, res) => {
  const result = createWarehouseBoardRow(req.auth, req.params.boardId);
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "board_not_found"
        ? 404
          : 403;
    res.status(status).json({ ok: false, message: "No fue posible crear la fila solicitada." });
    return;
  }

  auditSecurityEvent("warehouse_board_row_created", req, {
    boardId: req.params.boardId,
    rowId: result.row?.id,
    revision: result.state?.revision,
  });
  res.status(201).json(result.state);
});

warehouseRouter.patch("/boards/:boardId/rows/:rowId", (req, res) => {
  const result = patchWarehouseBoardRow(req.auth, req.params.boardId, req.params.rowId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "row_not_found"
        ? 404
        : result.reason === "pause_daily_limit_reached"
          ? 429
        : result.reason === "pause_reason_blocked"
          ? 422
          : 403;
    const message = result.reason === "pause_daily_limit_reached"
      ? `Ya alcanzaste el máximo de pausas autorizadas para hoy (${Number(result.limit || 0)}).`
      : result.reason === "pause_reason_blocked"
        ? "Ese motivo no está permitido para pausar la actividad."
      : "No fue posible actualizar la fila solicitada.";
    res.status(status).json({ ok: false, message });
    return;
  }

  auditSecurityEvent("warehouse_board_row_updated", req, {
    boardId: req.params.boardId,
    rowId: req.params.rowId,
    revision: result.state?.revision,
  });
  res.json(result.state);
});

warehouseRouter.delete("/boards/:boardId/rows/:rowId", (req, res) => {
  const result = deleteWarehouseBoardRow(req.auth, req.params.boardId, req.params.rowId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "row_not_found" || result.reason === "board_not_found" ? 404 : 403;
    res.status(status).json({ ok: false, message: "No fue posible eliminar la fila solicitada." });
    return;
  }

  auditSecurityEvent("warehouse_board_row_deleted", req, {
    boardId: req.params.boardId,
    rowId: req.params.rowId,
    revision: result.state?.revision,
  });
  res.json(result.state);
});

warehouseRouter.patch("/board-history/:snapshotId/rows/:rowId", requireWarehouseAction("editHistoryRecords"), (req, res) => {
  const result = patchBoardHistoryRow(req.auth, req.params.snapshotId, req.params.rowId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "snapshot_not_found" || result.reason === "row_not_found"
        ? 404
        : 403;
    res.status(status).json({ ok: false, message: "No fue posible actualizar el registro del historial." });
    return;
  }

  auditSecurityEvent("warehouse_board_history_row_updated", req, {
    snapshotId: req.params.snapshotId,
    rowId: req.params.rowId,
    revision: result.state?.revision,
  });
  res.json(result.state);
});

warehouseRouter.delete("/board-history/:snapshotId/rows/:rowId", requireAuth, (req, res) => {
  const result = deleteBoardHistoryRow(req.auth, req.params.snapshotId, req.params.rowId);
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "snapshot_not_found" || result.reason === "row_not_found"
        ? 404
        : 403;
    res.status(status).json({ ok: false, message: "No fue posible eliminar el registro del historial." });
    return;
  }

  auditSecurityEvent("warehouse_board_history_row_deleted", req, {
    snapshotId: req.params.snapshotId,
    rowId: req.params.rowId,
    revision: result.state?.revision,
  });
  res.json(result.state);
});

// ─── Roles personalizados ──────────────────────────────────────────────────
warehouseRouter.get("/roles", requireAuth, (_req, res) => {
  res.json({ ok: true, data: getCustomRoles() });
});

warehouseRouter.post("/roles", requireWarehouseAction("managePermissions"), (req, res) => {
  try {
    const role = createCustomRole(req.body?.name);
    res.status(201).json({ ok: true, data: role });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

warehouseRouter.patch("/roles/:roleId", requireWarehouseAction("managePermissions"), (req, res) => {
  try {
    const role = updateCustomRole(req.params.roleId, req.body?.name);
    if (!role) return res.status(404).json({ ok: false, message: "Rol no encontrado." });
    res.json({ ok: true, data: role });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

warehouseRouter.delete("/roles/:roleId", requireWarehouseAction("managePermissions"), (req, res) => {
  deleteCustomRole(req.params.roleId);
  res.json({ ok: true });
});

// ─── Incidencias ───────────────────────────────────────────────────────────
warehouseRouter.post("/incidencias", requireWarehouseAction("createIncidencia"), (req, res) => {
  const result = createIncidencia(req.auth, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "forbidden" ? 403 : 400;
    return res.status(status).json({ ok: false, message: "No fue posible registrar la incidencia." });
  }
  auditSecurityEvent("incidencia_created", req, { itemId: result.itemId, revision: result.state?.revision });
  return res.status(201).json({ ok: true, data: { state: result.state, itemId: result.itemId } });
});

warehouseRouter.patch("/incidencias/:itemId", requireWarehouseAction("editIncidencia"), (req, res) => {
  const result = updateIncidencia(req.auth, req.params.itemId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    return res.status(status).json({ ok: false, message: "No fue posible actualizar la incidencia." });
  }
  auditSecurityEvent("incidencia_updated", req, { itemId: result.itemId, revision: result.state?.revision });
  return res.json({ ok: true, data: { state: result.state, itemId: result.itemId } });
});

warehouseRouter.delete("/incidencias/:itemId", requireWarehouseAction("deleteIncidencia"), (req, res) => {
  const result = deleteIncidencia(req.auth, req.params.itemId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    return res.status(status).json({ ok: false, message: "No fue posible eliminar la incidencia." });
  }
  auditSecurityEvent("incidencia_deleted", req, { itemId: result.itemId, revision: result.state?.revision });
  return res.json({ ok: true, data: { state: result.state, itemId: result.itemId } });
});

warehouseRouter.post("/incidencias/:itemId/evidencias", requireWarehouseAction("editIncidencia"), (req, res) => {
  const result = addEvidenciaToIncidencia(req.auth, req.params.itemId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    return res.status(status).json({ ok: false, message: "No fue posible agregar la evidencia." });
  }
  return res.status(201).json({ ok: true, data: { state: result.state, itemId: result.itemId } });
});

warehouseRouter.delete("/incidencias/:itemId/evidencias/:evidenciaId", requireWarehouseAction("editIncidencia"), (req, res) => {
  const result = removeEvidenciaFromIncidencia(req.auth, req.params.itemId, req.params.evidenciaId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    return res.status(status).json({ ok: false, message: "No fue posible eliminar la evidencia." });
  }
  return res.json({ ok: true, data: { state: result.state, itemId: result.itemId } });
});

warehouseRouter.post("/incidencias/:itemId/cotizaciones", requireWarehouseAction("editIncidencia"), (req, res) => {
  const result = addCotizacionToIncidencia(req.auth, req.params.itemId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    return res.status(status).json({ ok: false, message: "No fue posible agregar la cotización." });
  }
  return res.status(201).json({ ok: true, data: { state: result.state, itemId: result.itemId } });
});

warehouseRouter.patch("/incidencias/:itemId/cotizaciones/:cotizacionId", requireWarehouseAction("editIncidencia"), (req, res) => {
  const result = updateCotizacion(req.auth, req.params.itemId, req.params.cotizacionId, req.body || {});
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    return res.status(status).json({ ok: false, message: "No fue posible actualizar la cotización." });
  }
  return res.json({ ok: true, data: { state: result.state, itemId: result.itemId } });
});

warehouseRouter.delete("/incidencias/:itemId/cotizaciones/:cotizacionId", requireWarehouseAction("editIncidencia"), (req, res) => {
  const result = deleteCotizacion(req.auth, req.params.itemId, req.params.cotizacionId);
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "item_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    return res.status(status).json({ ok: false, message: "No fue posible eliminar la cotización." });
  }
  return res.json({ ok: true, data: { state: result.state, itemId: result.itemId } });
});

warehouseRouter.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  // Prevent QUIC/HTTP3 from being used for this long-lived SSE connection
  res.setHeader("Alt-Svc", "clear");
  res.flushHeaders?.();

  let closed = false;

  const safeWrite = (chunk) => {
    if (closed || res.writableEnded || res.destroyed) return false;
    try {
      res.write(chunk);
      return true;
    } catch {
      closed = true;
      return false;
    }
  };

  const sendState = (state) => {
    safeWrite(`data: ${JSON.stringify({ type: "state", state })}\n\n`);
  };

  sendState(getWarehouseState());
  const unsubscribe = subscribeWarehouseState(sendState);

  const heartbeat = setInterval(() => {
    safeWrite(`: heartbeat ${Date.now()}\n\n`);
  }, 15000);

  const closeStream = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  };

  req.on("aborted", closeStream);
  req.on("close", closeStream);
  res.on("close", closeStream);
  res.on("error", closeStream);
});