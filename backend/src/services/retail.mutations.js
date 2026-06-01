import {
  RETAIL_BASE_ACTION_IDS,
  RETAIL_TAB_SCOPE_IDS,
} from "../config/retailModuleConfig.js";
import {
  addRetailProductStock,
  createRetailId,
  deductRetailProductStock,
  nextRetailFolio,
  normalizeFootprintTemplate,
  normalizePoLine,
  normalizePreassembledBox,
  normalizeProductRecord,
  normalizePurchaseOrder,
  normalizeRetailState,
  normalizeSupplierRecord,
  normalizeClientRecord,
  RETAIL_PO_STATUS,
} from "./retail.store.js";
import {
  canUserDoWarehouseAction,
  findWarehouseUserById,
  getRawWarehouseState,
  replaceWarehouseState,
} from "./warehouse.store.js";

function requireUser(auth) {
  const user = findWarehouseUserById(auth?.userId);
  if (!user?.isActive) return { ok: false, reason: "auth_required" };
  return { ok: true, user };
}

function canRetailAction(user, permissions, actionId) {
  if (!actionId) return false;
  return canUserDoWarehouseAction(user, actionId, permissions);
}

function canRetailTab(user, permissions, tabKey, baseActionId) {
  const scopeId = RETAIL_TAB_SCOPE_IDS[tabKey];
  if (!scopeId || !baseActionId) return false;
  const scopedId = `${scopeId}__${baseActionId}`;
  if (canUserDoWarehouseAction(user, scopedId, permissions)) return true;
  if (canUserDoWarehouseAction(user, scopeId, permissions)) return true;
  return canUserDoWarehouseAction(user, baseActionId, permissions);
}

function withRetailState(mutator) {
  const currentState = getRawWarehouseState();
  const retail = normalizeRetailState(currentState.retail);
  const result = mutator(retail, currentState);
  if (!result?.ok) return result;
  const nextState = {
    ...currentState,
    retail: result.retail,
    auditLog: [
      ...(Array.isArray(currentState.auditLog) ? currentState.auditLog : []),
      ...(result.auditEntry ? [result.auditEntry] : []),
    ].slice(-5000),
  };
  return { ok: true, state: replaceWarehouseState(nextState), data: result.data || null };
}

function buildAudit(user, action, details = {}) {
  return {
    id: createRetailId("audit"),
    at: new Date().toISOString(),
    userId: user.id,
    userName: user.name || user.email || user.id,
    action,
    details,
  };
}

export function upsertRetailClient(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "clientes", payload?.id ? "manageRetailClients" : "manageRetailClients")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const record = normalizeClientRecord(payload, payload?.id);
    if (!record.name) return { ok: false, reason: "invalid_payload" };
    const clients = [...retail.clients];
    const idx = clients.findIndex((entry) => entry.id === record.id);
    if (idx >= 0) clients[idx] = { ...clients[idx], ...record, updatedAt: new Date().toISOString() };
    else clients.push({ ...record, createdAt: new Date().toISOString() });
    return {
      ok: true,
      retail: { ...retail, clients },
      data: { client: record },
      auditEntry: buildAudit(user, "retail.client.upsert", { clientId: record.id }),
    };
  });
}

export function upsertRetailSupplier(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "huellas", "manageRetailFootprints")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const record = normalizeSupplierRecord(payload, payload?.id);
    if (!record.name) return { ok: false, reason: "invalid_payload" };
    const suppliers = [...retail.suppliers];
    const idx = suppliers.findIndex((entry) => entry.id === record.id);
    if (idx >= 0) suppliers[idx] = { ...suppliers[idx], ...record, updatedAt: new Date().toISOString() };
    else suppliers.push({ ...record, createdAt: new Date().toISOString() });
    return {
      ok: true,
      retail: { ...retail, suppliers },
      data: { supplier: record },
      auditEntry: buildAudit(user, "retail.supplier.upsert", { supplierId: record.id }),
    };
  });
}

export function upsertRetailFootprint(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "huellas", "manageRetailFootprints")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const record = normalizeFootprintTemplate(payload, payload?.id);
    if (!record.name) return { ok: false, reason: "invalid_payload" };
    const footprints = [...retail.footprints];
    const idx = footprints.findIndex((entry) => entry.id === record.id);
    if (idx >= 0) footprints[idx] = { ...footprints[idx], ...record, updatedAt: new Date().toISOString() };
    else footprints.push({ ...record, createdAt: new Date().toISOString() });
    return {
      ok: true,
      retail: { ...retail, footprints },
      data: { footprint: record },
      auditEntry: buildAudit(user, "retail.footprint.upsert", { footprintId: record.id }),
    };
  });
}

export function upsertRetailProduct(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "inventario", "manageRetailCatalog")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const record = normalizeProductRecord(payload, payload?.id);
    if (!record.code || !record.name) return { ok: false, reason: "invalid_payload" };
    const products = [...retail.products];
    const duplicate = products.find((entry) => entry.code.toLowerCase() === record.code.toLowerCase() && entry.id !== record.id);
    if (duplicate) return { ok: false, reason: "duplicate_code" };
    const idx = products.findIndex((entry) => entry.id === record.id);
    if (idx >= 0) products[idx] = { ...products[idx], ...record, updatedAt: new Date().toISOString() };
    else products.push({ ...record, createdAt: new Date().toISOString() });
    return {
      ok: true,
      retail: { ...retail, products: products.map((p) => normalizeProductRecord(p, p.id)) },
      data: { product: record },
      auditEntry: buildAudit(user, "retail.product.upsert", { productId: record.id }),
    };
  });
}

export function createRetailPreassembledBox(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "prearmado", "manageRetailPreassembly")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const product = retail.products.find((entry) => entry.id === payload?.productId);
    if (!product) return { ok: false, reason: "product_not_found" };
    const qtyPieces = Math.max(1, Number(payload?.qtyPieces) || product.piecesPerBox || 1);
    const lot = String(payload?.lot || "").trim();
    const takeFromStock = payload?.consumeStock !== false;
    let products = retail.products;
    if (takeFromStock) {
      const available = (product.lots || []).find((entry) => !lot || entry.lot === lot);
      const availableQty = available ? Number(available.qty) : product.stockPieces;
      if (availableQty < qtyPieces) return { ok: false, reason: "insufficient_stock" };
      products = deductRetailProductStock(products, product.id, lot, qtyPieces, payload?.expiry, payload?.labelTag);
    }
    const box = normalizePreassembledBox({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      presentation: payload?.presentation || product.presentation,
      lot,
      expiry: payload?.expiry || "",
      labelTag: payload?.labelTag || product.labelTag,
      qtyPieces,
      status: "available",
      createdById: user.id,
    });
    const preassembledBoxes = [box, ...retail.preassembledBoxes];
    return {
      ok: true,
      retail: normalizeRetailState({ ...retail, products, preassembledBoxes }),
      data: { box },
      auditEntry: buildAudit(user, "retail.prearm.create", { boxId: box.id, productId: product.id }),
    };
  });
}

export function createRetailPurchaseOrder(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "ordenes-compra", "manageRetailPurchaseOrders")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const client = retail.clients.find((entry) => entry.id === payload?.clientId);
    const supplier = retail.suppliers.find((entry) => entry.id === payload?.supplierId);
    if (!client) return { ok: false, reason: "client_required" };
    const lines = (Array.isArray(payload?.lines) ? payload.lines : [])
      .map((line) => {
        const product = retail.products.find((entry) => entry.id === line?.productId);
        if (!product) return null;
        return normalizePoLine({
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          qtyOrdered: line?.qtyOrdered,
        });
      })
      .filter(Boolean);
    if (!lines.length) return { ok: false, reason: "lines_required" };
    const folioResult = nextRetailFolio(retail.counters, "purchaseOrder", "OC");
    const order = normalizePurchaseOrder({
      folio: folioResult.folio,
      clientId: client.id,
      clientName: client.name,
      supplierId: supplier?.id || "",
      supplierName: supplier?.name || "",
      status: RETAIL_PO_STATUS.PENDING_PICK,
      lines,
      notes: payload?.notes || "",
      createdById: user.id,
      updatedById: user.id,
    });
    return {
      ok: true,
      retail: {
        ...retail,
        counters: folioResult.counters,
        purchaseOrders: [order, ...retail.purchaseOrders],
      },
      data: { purchaseOrder: order },
      auditEntry: buildAudit(user, "retail.po.create", { purchaseOrderId: order.id }),
    };
  });
}

export function pickRetailPurchaseOrderLine(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "surtido", "manageRetailPicking")) {
    return { ok: false, reason: "forbidden" };
  }
  const purchaseOrderId = String(payload?.purchaseOrderId || "").trim();
  const lineId = String(payload?.lineId || "").trim();
  const qtyPicked = Math.max(0, Number(payload?.qtyPicked) || 0);
  const lot = String(payload?.lot || "").trim();
  return withRetailState((retail) => {
    const orders = [...retail.purchaseOrders];
    const idx = orders.findIndex((entry) => entry.id === purchaseOrderId);
    if (idx < 0) return { ok: false, reason: "po_not_found" };
    const order = { ...orders[idx] };
    if ([RETAIL_PO_STATUS.CLOSED, RETAIL_PO_STATUS.CANCELLED].includes(order.status)) {
      return { ok: false, reason: "po_locked" };
    }
    const lines = order.lines.map((line) => {
      if (line.id !== lineId) return line;
      const nextQty = Math.min(line.qtyOrdered, qtyPicked);
      return normalizePoLine({
        ...line,
        qtyPicked: nextQty,
        lot: lot || line.lot,
        expiry: payload?.expiry || line.expiry,
        labelTag: payload?.labelTag || line.labelTag,
        pickedAt: new Date().toISOString(),
        pickedById: user.id,
      });
    });
    const line = lines.find((entry) => entry.id === lineId);
    if (!line) return { ok: false, reason: "line_not_found" };
    const delta = qtyPicked - (order.lines.find((entry) => entry.id === lineId)?.qtyPicked || 0);
    let products = retail.products;
    if (delta > 0) {
      products = deductRetailProductStock(products, line.productId, lot || line.lot, delta, line.expiry, line.labelTag);
    }
    const allPicked = lines.every((entry) => entry.qtyPicked >= entry.qtyOrdered);
    const anyPicked = lines.some((entry) => entry.qtyPicked > 0);
    const status = allPicked
      ? RETAIL_PO_STATUS.PICKED
      : anyPicked
        ? RETAIL_PO_STATUS.PICKED_PARTIAL
        : RETAIL_PO_STATUS.PICKING;
    order.lines = lines;
    order.status = status === RETAIL_PO_STATUS.PICKING && order.status === RETAIL_PO_STATUS.PENDING_PICK
      ? RETAIL_PO_STATUS.PICKING
      : status;
    order.surtidoStartedAt = order.surtidoStartedAt || new Date().toISOString();
    if (allPicked) order.surtidoCompletedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    order.updatedById = user.id;
    orders[idx] = order;
    return {
      ok: true,
      retail: { ...retail, products: products.map((p) => normalizeProductRecord(p, p.id)), purchaseOrders: orders },
      data: { purchaseOrder: order },
      auditEntry: buildAudit(user, "retail.po.pick", { purchaseOrderId, lineId, qtyPicked }),
    };
  });
}

export function markRetailPurchaseOrderPicked(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "surtido", "manageRetailPicking")) {
    return { ok: false, reason: "forbidden" };
  }
  const purchaseOrderId = String(payload?.purchaseOrderId || "").trim();
  return withRetailState((retail) => {
    const orders = [...retail.purchaseOrders];
    const idx = orders.findIndex((entry) => entry.id === purchaseOrderId);
    if (idx < 0) return { ok: false, reason: "po_not_found" };
    const order = { ...orders[idx] };
    order.status = RETAIL_PO_STATUS.PICKED;
    order.surtidoCompletedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    order.updatedById = user.id;
    orders[idx] = order;
    return {
      ok: true,
      retail: { ...retail, purchaseOrders: orders },
      data: { purchaseOrder: order },
      auditEntry: buildAudit(user, "retail.po.mark_picked", { purchaseOrderId }),
    };
  });
}

export function updateRetailClosingChecklist(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "cerrado", "manageRetailClosing")) {
    return { ok: false, reason: "forbidden" };
  }
  const purchaseOrderId = String(payload?.purchaseOrderId || "").trim();
  const lineId = String(payload?.lineId || "").trim();
  return withRetailState((retail) => {
    const orders = [...retail.purchaseOrders];
    const idx = orders.findIndex((entry) => entry.id === purchaseOrderId);
    if (idx < 0) return { ok: false, reason: "po_not_found" };
    const order = { ...orders[idx] };
    if (![RETAIL_PO_STATUS.PICKED, RETAIL_PO_STATUS.PICKED_PARTIAL, RETAIL_PO_STATUS.CLOSING].includes(order.status)) {
      return { ok: false, reason: "invalid_status" };
    }
    order.lines = order.lines.map((line) => (
      line.id === lineId ? { ...line, checklistOk: payload?.checklistOk === true } : line
    ));
    order.status = RETAIL_PO_STATUS.CLOSING;
    order.updatedAt = new Date().toISOString();
    orders[idx] = order;
    return {
      ok: true,
      retail: { ...retail, purchaseOrders: orders },
      data: { purchaseOrder: order },
      auditEntry: buildAudit(user, "retail.po.checklist", { purchaseOrderId, lineId }),
    };
  });
}

export function approveRetailPurchaseOrderClosing(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "cerrado", "approveRetailClosing")) {
    return { ok: false, reason: "forbidden" };
  }
  const purchaseOrderId = String(payload?.purchaseOrderId || "").trim();
  return withRetailState((retail) => {
    const orders = [...retail.purchaseOrders];
    const idx = orders.findIndex((entry) => entry.id === purchaseOrderId);
    if (idx < 0) return { ok: false, reason: "po_not_found" };
    const order = { ...orders[idx] };
    const allChecked = order.lines.every((line) => line.checklistOk === true);
    if (!allChecked) return { ok: false, reason: "checklist_incomplete" };
    order.status = RETAIL_PO_STATUS.CLOSED;
    order.closedAt = new Date().toISOString();
    order.closedById = user.id;
    order.updatedAt = new Date().toISOString();
    orders[idx] = order;
    return {
      ok: true,
      retail: { ...retail, purchaseOrders: orders },
      data: { purchaseOrder: order },
      auditEntry: buildAudit(user, "retail.po.close", { purchaseOrderId }),
    };
  });
}

export function closeRetailPallet(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "cerrado", "manageRetailClosing")) {
    return { ok: false, reason: "forbidden" };
  }
  const purchaseOrderId = String(payload?.purchaseOrderId || "").trim();
  const boxIds = Array.isArray(payload?.boxIds) ? payload.boxIds.map((v) => String(v || "").trim()).filter(Boolean) : [];
  if (!boxIds.length) return { ok: false, reason: "boxes_required" };
  return withRetailState((retail) => {
    const orders = [...retail.purchaseOrders];
    const idx = orders.findIndex((entry) => entry.id === purchaseOrderId);
    if (idx < 0) return { ok: false, reason: "po_not_found" };
    const order = { ...orders[idx] };
    const folioResult = nextRetailFolio(retail.counters, "pallet", "TAR");
    const pallet = {
      id: createRetailId("rpal"),
      folio: folioResult.folio,
      purchaseOrderId,
      boxIds,
      closed: true,
      closedAt: new Date().toISOString(),
      closedById: user.id,
      labelPrintedAt: "",
      labelPrintCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    order.pallets = [...(order.pallets || []), pallet];
    orders[idx] = order;
    return {
      ok: true,
      retail: { ...retail, counters: folioResult.counters, purchaseOrders: orders },
      data: { pallet, purchaseOrder: order },
      auditEntry: buildAudit(user, "retail.pallet.close", { purchaseOrderId, palletId: pallet.id }),
    };
  });
}

export function logRetailLabelPrint(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  const actionId = payload?.reprint ? "reprintRetailLabels" : "printRetailLabels";
  if (!canRetailTab(user, state.permissions, "cerrado", actionId)) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const entry = {
      id: createRetailId("rprint"),
      kind: String(payload?.kind || "product").trim(),
      referenceId: String(payload?.referenceId || "").trim(),
      purchaseOrderId: String(payload?.purchaseOrderId || "").trim(),
      footprintId: String(payload?.footprintId || "").trim(),
      printedAt: new Date().toISOString(),
      printedById: user.id,
      reprint: payload?.reprint === true,
    };
    let purchaseOrders = retail.purchaseOrders;
    if (payload?.purchaseOrderId && payload?.lineId) {
      purchaseOrders = purchaseOrders.map((order) => {
        if (order.id !== payload.purchaseOrderId) return order;
        return {
          ...order,
          lines: order.lines.map((line) => (
            line.id === payload.lineId
              ? {
                ...line,
                labelPrintedAt: new Date().toISOString(),
                labelPrintCount: (Number(line.labelPrintCount) || 0) + 1,
              }
              : line
          )),
        };
      });
    }
    return {
      ok: true,
      retail: {
        ...retail,
        purchaseOrders,
        printLog: [entry, ...retail.printLog].slice(0, 2000),
      },
      data: { printLog: entry },
      auditEntry: buildAudit(user, "retail.label.print", { kind: entry.kind, referenceId: entry.referenceId }),
    };
  });
}

export function createRetailIncident(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "incidencias", "manageRetailIncidents")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const incident = {
      id: createRetailId("rinc"),
      purchaseOrderId: String(payload?.purchaseOrderId || "").trim(),
      productId: String(payload?.productId || "").trim(),
      type: String(payload?.type || "other").trim(),
      description: String(payload?.description || "").trim(),
      createdAt: new Date().toISOString(),
      createdById: user.id,
      resolved: false,
      resolvedAt: "",
    };
    if (!incident.description) return { ok: false, reason: "invalid_payload" };
    return {
      ok: true,
      retail: { ...retail, incidents: [incident, ...retail.incidents] },
      data: { incident },
      auditEntry: buildAudit(user, "retail.incident.create", { incidentId: incident.id }),
    };
  });
}

export function setRetailOrderBoxes(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "surtido", "manageRetailPicking")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const orders = [...retail.purchaseOrders];
    const idx = orders.findIndex((o) => o.id === String(payload?.purchaseOrderId || "").trim());
    if (idx < 0) return { ok: false, reason: "not_found" };
    const boxes = (Array.isArray(payload?.boxes) ? payload.boxes : []).map((box, i) => ({
      id: String(box?.id || "").trim() || createRetailId("rocb"),
      folio: String(box?.folio || "").trim() || `CJ-${i + 1}`,
      items: (Array.isArray(box?.items) ? box.items : []).map((it) => ({
        productId: String(it?.productId || "").trim(),
        productCode: String(it?.productCode || "").trim(),
        productName: String(it?.productName || "").trim(),
        qty: Math.max(0, Number(it?.qty) || 0),
        lot: String(it?.lot || "").trim(),
      })).filter((it) => it.productId || it.productCode),
    }));
    orders[idx] = { ...orders[idx], boxes, updatedAt: new Date().toISOString() };
    return {
      ok: true,
      retail: { ...retail, purchaseOrders: orders },
      data: { purchaseOrderId: orders[idx].id, boxes },
      auditEntry: buildAudit(user, "retail.po.boxes", { purchaseOrderId: orders[idx].id, boxes: boxes.length }),
    };
  });
}

export function updateRetailIncident(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "incidencias", "manageRetailIncidents")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const incidents = [...retail.incidents];
    const idx = incidents.findIndex((entry) => entry.id === String(payload?.id || "").trim());
    if (idx < 0) return { ok: false, reason: "not_found" };
    const current = incidents[idx];
    const resolved = payload?.resolved === undefined ? current.resolved : Boolean(payload.resolved);
    const next = {
      ...current,
      purchaseOrderId: payload?.purchaseOrderId !== undefined ? String(payload.purchaseOrderId).trim() : current.purchaseOrderId,
      type: payload?.type !== undefined ? String(payload.type).trim() : current.type,
      description: payload?.description !== undefined ? String(payload.description).trim() : current.description,
      resolved,
      resolvedAt: resolved ? (current.resolvedAt || new Date().toISOString()) : "",
      updatedAt: new Date().toISOString(),
    };
    if (!next.description) return { ok: false, reason: "invalid_payload" };
    incidents[idx] = next;
    return {
      ok: true,
      retail: { ...retail, incidents },
      data: { incident: next },
      auditEntry: buildAudit(user, "retail.incident.update", { incidentId: next.id }),
    };
  });
}

export function deleteRetailIncident(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "incidencias", "manageRetailIncidents")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const id = String(payload?.id || "").trim();
    const exists = retail.incidents.some((entry) => entry.id === id);
    if (!exists) return { ok: false, reason: "not_found" };
    return {
      ok: true,
      retail: { ...retail, incidents: retail.incidents.filter((entry) => entry.id !== id) },
      data: { id },
      auditEntry: buildAudit(user, "retail.incident.delete", { incidentId: id }),
    };
  });
}

export function deleteRetailClient(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "clientes", "manageRetailClients")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const id = String(payload?.id || "").trim();
    const client = retail.clients.find((entry) => entry.id === id);
    if (!client) return { ok: false, reason: "not_found" };
    const hasOrders = retail.purchaseOrders.some((order) => order.clientId === id);
    if (hasOrders) return { ok: false, reason: "has_orders" };
    const footprintIds = [client.clientFootprintId, client.boxFootprintId, client.palletFootprintId].filter(Boolean);
    return {
      ok: true,
      retail: {
        ...retail,
        clients: retail.clients.filter((entry) => entry.id !== id),
        footprints: retail.footprints.filter((entry) => !footprintIds.includes(entry.id)),
      },
      data: { id },
      auditEntry: buildAudit(user, "retail.client.delete", { clientId: id }),
    };
  });
}

export function deleteRetailProduct(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "inventario", "manageRetailCatalog")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const id = String(payload?.id || "").trim();
    const product = retail.products.find((entry) => entry.id === id);
    if (!product) return { ok: false, reason: "not_found" };
    const inUse = retail.purchaseOrders.some((order) => (order.lines || []).some((line) => line.productId === id));
    if (inUse) return { ok: false, reason: "in_use" };
    const hasPrearm = retail.preassembledBoxes.some((box) => box.productId === id);
    if (hasPrearm) return { ok: false, reason: "has_preassembled" };
    return {
      ok: true,
      retail: { ...retail, products: retail.products.filter((entry) => entry.id !== id) },
      data: { id },
      auditEntry: buildAudit(user, "retail.product.delete", { productId: id }),
    };
  });
}

export function updateRetailProductLot(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "inventario", "manageRetailCatalog")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const productId = String(payload?.productId || "").trim();
    const lotId = String(payload?.lotId || "").trim();
    const idx = retail.products.findIndex((entry) => entry.id === productId);
    if (idx < 0) return { ok: false, reason: "not_found" };
    const product = retail.products[idx];
    const lotIdx = (product.lots || []).findIndex((entry) => entry.id === lotId);
    if (lotIdx < 0) return { ok: false, reason: "lot_not_found" };
    const nextLot = {
      ...product.lots[lotIdx],
      lot: String(payload?.lot ?? product.lots[lotIdx].lot ?? "").trim(),
      expiry: String(payload?.expiry ?? product.lots[lotIdx].expiry ?? "").trim(),
      etiqueta: String(payload?.etiqueta ?? product.lots[lotIdx].etiqueta ?? "").trim(),
      qty: payload?.qty === undefined ? product.lots[lotIdx].qty : Math.max(0, Number(payload.qty) || 0),
      updatedAt: new Date().toISOString(),
    };
    const lots = [...product.lots];
    lots[lotIdx] = nextLot;
    const products = [...retail.products];
    products[idx] = normalizeProductRecord({ ...product, lots }, product.id);
    return {
      ok: true,
      retail: { ...retail, products },
      data: { productId, lot: nextLot },
      auditEntry: buildAudit(user, "retail.product.lot.update", { productId, lotId }),
    };
  });
}

export function deleteRetailProductLot(auth, payload) {
  const authResult = requireUser(auth);
  if (!authResult.ok) return authResult;
  const { user } = authResult;
  const state = getRawWarehouseState();
  if (!canRetailTab(user, state.permissions, "inventario", "manageRetailCatalog")) {
    return { ok: false, reason: "forbidden" };
  }
  return withRetailState((retail) => {
    const productId = String(payload?.productId || "").trim();
    const lotId = String(payload?.lotId || "").trim();
    const idx = retail.products.findIndex((entry) => entry.id === productId);
    if (idx < 0) return { ok: false, reason: "not_found" };
    const product = retail.products[idx];
    const exists = (product.lots || []).some((entry) => entry.id === lotId);
    if (!exists) return { ok: false, reason: "lot_not_found" };
    const lots = (product.lots || []).filter((entry) => entry.id !== lotId);
    const products = [...retail.products];
    products[idx] = normalizeProductRecord({ ...product, lots }, product.id);
    return {
      ok: true,
      retail: { ...retail, products },
      data: { productId, lotId },
      auditEntry: buildAudit(user, "retail.product.lot.delete", { productId, lotId }),
    };
  });
}

export function listRetailBaseActionsForBootstrap() {
  return RETAIL_BASE_ACTION_IDS;
}
