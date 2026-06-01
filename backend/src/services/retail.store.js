const EMPTY_OBJECT = Object.freeze({});

export const RETAIL_PO_STATUS = {
  DRAFT: "draft",
  PENDING_PICK: "pending_pick",
  PICKING: "picking",
  PICKED_PARTIAL: "picked_partial",
  PICKED: "picked",
  CLOSING: "closing",
  CLOSED: "closed",
  CANCELLED: "cancelled",
};

function createRetailId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toNonNegativeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeEanCode(value) {
  return String(value || "").replace(/\D/g, "").trim();
}

function normalizeLotEntry(entry = EMPTY_OBJECT) {
  const lot = String(entry.lot || "").trim();
  const expiry = String(entry.expiry || entry.caducidad || "").trim();
  const etiqueta = String(entry.etiqueta || entry.labelCode || "").trim();
  const qty = toNonNegativeNumber(entry.qty ?? entry.pieces);
  if (!lot && qty <= 0) return null;
  return {
    id: String(entry.id || createRetailId("lot")).trim(),
    lot,
    expiry,
    etiqueta,
    qty,
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
  };
}

function normalizeProductRecord(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("rp")).trim();
  const code = String(entry.code || "").trim();
  const name = String(entry.name || "").trim();
  const lots = (Array.isArray(entry.lots) ? entry.lots : [])
    .map((lot) => normalizeLotEntry(lot))
    .filter(Boolean);
  const stockPieces = lots.reduce((sum, lot) => sum + toNonNegativeNumber(lot.qty), 0);
  return {
    id,
    code,
    ean: normalizeEanCode(entry.ean || code),
    name,
    presentation: String(entry.presentation || "").trim(),
    labelTag: String(entry.labelTag || entry.etiqueta || "").trim(),
    piecesPerBox: Math.max(1, toNonNegativeNumber(entry.piecesPerBox) || 1),
    lots,
    stockPieces,
    preassembledBoxCount: toNonNegativeNumber(entry.preassembledBoxCount),
    active: entry.active !== false,
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
  };
}

function normalizeClientRecord(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("rc")).trim();
  return {
    id,
    name: String(entry.name || "").trim(),
    code: String(entry.code || "").trim(),
    supplierFootprintId: String(entry.supplierFootprintId || "").trim(),
    clientFootprintId: String(entry.clientFootprintId || "").trim(),
    palletFootprintId: String(entry.palletFootprintId || "").trim(),
    boxFootprintId: String(entry.boxFootprintId || "").trim(),
    notes: String(entry.notes || "").trim(),
    active: entry.active !== false,
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
  };
}

function normalizeSupplierRecord(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("rs")).trim();
  return {
    id,
    name: String(entry.name || "").trim(),
    code: String(entry.code || "").trim(),
    footprintId: String(entry.footprintId || "").trim(),
    active: entry.active !== false,
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
  };
}

function normalizeFootprintTemplate(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("rf")).trim();
  return {
    id,
    name: String(entry.name || "").trim(),
    kind: String(entry.kind || "client").trim(),
    ownerType: String(entry.ownerType || "client").trim(),
    ownerId: String(entry.ownerId || "").trim(),
    barcodeType: String(entry.barcodeType || "EAN").trim(),
    templatePdfDataUrl: String(entry.templatePdfDataUrl || "").trim(),
    templateCsvText: String(entry.templateCsvText || "").trim(),
    fieldMap: entry.fieldMap && typeof entry.fieldMap === "object" ? entry.fieldMap : {},
    active: entry.active !== false,
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
  };
}

function normalizePoLine(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("pol")).trim();
  const qtyOrdered = toNonNegativeNumber(entry.qtyOrdered);
  const qtyPicked = toNonNegativeNumber(entry.qtyPicked);
  return {
    id,
    productId: String(entry.productId || "").trim(),
    productCode: String(entry.productCode || "").trim(),
    productName: String(entry.productName || "").trim(),
    qtyOrdered,
    qtyPicked,
    lot: String(entry.lot || "").trim(),
    expiry: String(entry.expiry || "").trim(),
    labelTag: String(entry.labelTag || "").trim(),
    checklistOk: entry.checklistOk === true,
    pickedAt: String(entry.pickedAt || "").trim(),
    pickedById: String(entry.pickedById || "").trim(),
    closedAt: String(entry.closedAt || "").trim(),
    labelPrintedAt: String(entry.labelPrintedAt || "").trim(),
    labelPrintCount: toNonNegativeNumber(entry.labelPrintCount),
  };
}

function normalizePalletRecord(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("rpal")).trim();
  return {
    id,
    folio: String(entry.folio || "").trim(),
    purchaseOrderId: String(entry.purchaseOrderId || "").trim(),
    boxIds: Array.isArray(entry.boxIds) ? entry.boxIds.map((v) => String(v || "").trim()).filter(Boolean) : [],
    closed: entry.closed === true,
    closedAt: String(entry.closedAt || "").trim(),
    closedById: String(entry.closedById || "").trim(),
    labelPrintedAt: String(entry.labelPrintedAt || "").trim(),
    labelPrintCount: toNonNegativeNumber(entry.labelPrintCount),
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
  };
}

function normalizePreassembledBox(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("rbox")).trim();
  return {
    id,
    productId: String(entry.productId || "").trim(),
    productCode: String(entry.productCode || "").trim(),
    productName: String(entry.productName || "").trim(),
    presentation: String(entry.presentation || "").trim(),
    lot: String(entry.lot || "").trim(),
    expiry: String(entry.expiry || "").trim(),
    labelTag: String(entry.labelTag || "").trim(),
    qtyPieces: Math.max(1, toNonNegativeNumber(entry.qtyPieces) || 1),
    status: String(entry.status || "available").trim(),
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
    createdById: String(entry.createdById || "").trim(),
  };
}

function normalizeOrderBox(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("rocb")).trim();
  const items = (Array.isArray(entry.items) ? entry.items : []).map((it) => ({
    productId: String(it.productId || "").trim(),
    productCode: String(it.productCode || "").trim(),
    productName: String(it.productName || "").trim(),
    qty: toNonNegativeNumber(it.qty),
    lot: String(it.lot || "").trim(),
  })).filter((it) => it.productId || it.productCode);
  return {
    id,
    folio: String(entry.folio || "").trim(),
    items,
  };
}

function normalizePurchaseOrder(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("rpo")).trim();
  const lines = (Array.isArray(entry.lines) ? entry.lines : []).map((line) => normalizePoLine(line)).filter(Boolean);
  const pallets = (Array.isArray(entry.pallets) ? entry.pallets : []).map((pallet) => normalizePalletRecord(pallet)).filter(Boolean);
  const boxes = (Array.isArray(entry.boxes) ? entry.boxes : []).map((box) => normalizeOrderBox(box)).filter(Boolean);
  const status = Object.values(RETAIL_PO_STATUS).includes(String(entry.status || "").trim())
    ? String(entry.status).trim()
    : RETAIL_PO_STATUS.DRAFT;
  return {
    id,
    folio: String(entry.folio || "").trim(),
    clientId: String(entry.clientId || "").trim(),
    clientName: String(entry.clientName || "").trim(),
    supplierId: String(entry.supplierId || "").trim(),
    supplierName: String(entry.supplierName || "").trim(),
    status,
    lines,
    pallets,
    boxes,
    notes: String(entry.notes || "").trim(),
    surtidoStartedAt: String(entry.surtidoStartedAt || "").trim(),
    surtidoCompletedAt: String(entry.surtidoCompletedAt || "").trim(),
    closedAt: String(entry.closedAt || "").trim(),
    closedById: String(entry.closedById || "").trim(),
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
    createdById: String(entry.createdById || "").trim(),
    updatedById: String(entry.updatedById || "").trim(),
  };
}

function normalizeIncident(entry = EMPTY_OBJECT, fallbackId = "") {
  const id = String(entry.id || fallbackId || createRetailId("rinc")).trim();
  return {
    id,
    purchaseOrderId: String(entry.purchaseOrderId || "").trim(),
    productId: String(entry.productId || "").trim(),
    type: String(entry.type || "other").trim(),
    description: String(entry.description || "").trim(),
    createdAt: String(entry.createdAt || new Date().toISOString()),
    createdById: String(entry.createdById || "").trim(),
    resolved: entry.resolved === true,
    resolvedAt: String(entry.resolvedAt || "").trim(),
  };
}

function normalizePrintLog(entry = EMPTY_OBJECT, fallbackId = "") {
  return {
    id: String(entry.id || fallbackId || createRetailId("rprint")).trim(),
    kind: String(entry.kind || "product").trim(),
    referenceId: String(entry.referenceId || "").trim(),
    purchaseOrderId: String(entry.purchaseOrderId || "").trim(),
    footprintId: String(entry.footprintId || "").trim(),
    printedAt: String(entry.printedAt || new Date().toISOString()),
    printedById: String(entry.printedById || "").trim(),
    reprint: entry.reprint === true,
  };
}

export function normalizeRetailState(raw) {
  const source = raw && typeof raw === "object" ? raw : EMPTY_OBJECT;
  const products = (Array.isArray(source.products) ? source.products : [])
    .map((entry) => normalizeProductRecord(entry))
    .filter((entry) => entry.code);
  const preassembledBoxes = (Array.isArray(source.preassembledBoxes) ? source.preassembledBoxes : [])
    .map((entry) => normalizePreassembledBox(entry));
  const productPrearmCounts = preassembledBoxes
    .filter((box) => box.status === "available")
    .reduce((map, box) => {
      if (!box.productId) return map;
      map[box.productId] = (map[box.productId] || 0) + 1;
      return map;
    }, {});
  const productsWithPrearm = products.map((product) => ({
    ...product,
    preassembledBoxCount: productPrearmCounts[product.id] || 0,
  }));

  return {
    clients: (Array.isArray(source.clients) ? source.clients : []).map((entry) => normalizeClientRecord(entry)).filter((e) => e.name),
    suppliers: (Array.isArray(source.suppliers) ? source.suppliers : []).map((entry) => normalizeSupplierRecord(entry)).filter((e) => e.name),
    footprints: (Array.isArray(source.footprints) ? source.footprints : []).map((entry) => normalizeFootprintTemplate(entry)).filter((e) => e.name),
    products: productsWithPrearm,
    preassembledBoxes,
    purchaseOrders: (Array.isArray(source.purchaseOrders) ? source.purchaseOrders : []).map((entry) => normalizePurchaseOrder(entry)),
    incidents: (Array.isArray(source.incidents) ? source.incidents : []).map((entry) => normalizeIncident(entry)),
    printLog: (Array.isArray(source.printLog) ? source.printLog : []).map((entry) => normalizePrintLog(entry)).slice(-2000),
    counters: {
      purchaseOrder: Math.max(1, Number(source.counters?.purchaseOrder) || 1),
      pallet: Math.max(1, Number(source.counters?.pallet) || 1),
    },
  };
}

export function deductRetailProductStock(products, productId, lot, qty, expiry = "", etiqueta = "") {
  const amount = toNonNegativeNumber(qty);
  if (!productId || amount <= 0) return products;
  return products.map((product) => {
    if (product.id !== productId) return product;
    const lots = [...(product.lots || [])];
    const lotKey = String(lot || "").trim().toLowerCase();
    let remaining = amount;
    const nextLots = lots.map((entry) => {
      if (remaining <= 0) return entry;
      const matchesLot = lotKey ? String(entry.lot || "").trim().toLowerCase() === lotKey : true;
      if (!matchesLot) return entry;
      const take = Math.min(remaining, toNonNegativeNumber(entry.qty));
      remaining -= take;
      return { ...entry, qty: toNonNegativeNumber(entry.qty) - take, updatedAt: new Date().toISOString() };
    }).filter((entry) => toNonNegativeNumber(entry.qty) > 0);
    if (remaining > 0 && lotKey) {
      nextLots.push(normalizeLotEntry({ lot, expiry, etiqueta, qty: 0 }));
    }
    const normalized = normalizeProductRecord({ ...product, lots: nextLots }, product.id);
    return normalized;
  });
}

export function addRetailProductStock(products, productId, lot, qty, expiry = "", etiqueta = "") {
  const amount = toNonNegativeNumber(qty);
  if (!productId || amount <= 0) return products;
  return products.map((product) => {
    if (product.id !== productId) return product;
    const lots = [...(product.lots || [])];
    const lotKey = String(lot || "").trim().toLowerCase();
    const idx = lots.findIndex((entry) => String(entry.lot || "").trim().toLowerCase() === lotKey);
    if (idx >= 0) {
      lots[idx] = {
        ...lots[idx],
        qty: toNonNegativeNumber(lots[idx].qty) + amount,
        expiry: expiry || lots[idx].expiry,
        etiqueta: etiqueta || lots[idx].etiqueta,
        updatedAt: new Date().toISOString(),
      };
    } else {
      lots.push(normalizeLotEntry({ lot, expiry, etiqueta, qty: amount }));
    }
    return normalizeProductRecord({ ...product, lots }, product.id);
  });
}

export function nextRetailFolio(counters, key, prefix) {
  const current = Math.max(1, Number(counters?.[key]) || 1);
  const folio = `${prefix}-${String(current).padStart(5, "0")}`;
  return {
    folio,
    counters: { ...counters, [key]: current + 1 },
  };
}

export {
  createRetailId,
  normalizeClientRecord,
  normalizeFootprintTemplate,
  normalizeProductRecord,
  normalizePurchaseOrder,
  normalizePoLine,
  normalizePreassembledBox,
  normalizeSupplierRecord,
};
