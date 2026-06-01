import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileText,
  History,
  Layers,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { retailApi } from "../services/retail.service.js";
import { downloadCsv, readCsvFile } from "../retail/retailCsv.js";
import { printHuellaLabel } from "../retail/retailLabelPrint.js";
import { RETAIL_PO_STATUS, RETAIL_PO_STATUS_LABELS } from "../retail/retailModuleConfig.js";
import { RetailEmptyRow, RetailStatusBadge } from "../retail/retailUi.jsx";
import RetailHuellaDesigner from "../retail/RetailHuellaDesigner.jsx";
import { defaultElements, primaryFormat } from "../retail/retailLabel.js";
import { Modal } from "../components/Modal.jsx";
import RetailDashboard from "./RetailDashboard.jsx";
import "./GestionRetail.css";

const INCIDENT_TYPES = [
  { id: "faltante", label: "Faltante" },
  { id: "sobrante", label: "Sobrante" },
  { id: "danado", label: "Producto danado" },
  { id: "caducidad", label: "Caducidad" },
  { id: "etiqueta", label: "Etiquetado" },
  { id: "otro", label: "Otro" },
];

const INVENTORY_TEMPLATE_HEADERS = [
  "codigo",
  "nombre",
  "presentacion",
  "etiqueta",
  "piezas_por_caja",
  "lote",
  "caducidad",
  "piezas",
];

function useRetailMutation(contexto) {
  const {
    applyRemoteWarehouseState,
    setState,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
  } = contexto;
  return async (promise) => {
    const result = await promise;
    const remoteState = result?.state || result?.data?.state;
    if (remoteState && typeof applyRemoteWarehouseState === "function") {
      applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    }
    return result;
  };
}

function StatChip({ label, value }) {
  return (
    <div className="retail-stat-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <div className="retail-search-wrap">
      <Search size={16} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Buscar..." />
    </div>
  );
}

function TabHeader({ title, subtitle, actions }) {
  return (
    <div className="retail-tab-header">
      <div className="retail-tab-heading">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="retail-tab-actions">{actions}</div> : null}
    </div>
  );
}

function ViewTabs({ tabs, active, onChange }) {
  return (
    <div className="retail-view-tabs">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" className={active === tab.id ? "active" : ""} onClick={() => onChange(tab.id)}>
          {tab.label}{tab.count != null ? ` (${tab.count})` : ""}
        </button>
      ))}
    </div>
  );
}

const OC_HISTORY_STATUSES = [RETAIL_PO_STATUS.CLOSED, RETAIL_PO_STATUS.CANCELLED];
const SURTIDO_PENDING_STATUSES = [RETAIL_PO_STATUS.PENDING_PICK, RETAIL_PO_STATUS.PICKING, RETAIL_PO_STATUS.PICKED_PARTIAL];
const SURTIDO_HISTORY_STATUSES = [RETAIL_PO_STATUS.PICKED, RETAIL_PO_STATUS.CLOSING, RETAIL_PO_STATUS.CLOSED];
const CERRADO_PENDING_STATUSES = [RETAIL_PO_STATUS.PICKED, RETAIL_PO_STATUS.PICKED_PARTIAL, RETAIL_PO_STATUS.CLOSING];
const CERRADO_HISTORY_STATUSES = [RETAIL_PO_STATUS.CLOSED, RETAIL_PO_STATUS.CANCELLED];

export default function GestionRetail({ contexto }) {
  const {
    retailState,
    navRetailTab = "dashboard",
    setNavRetailTab,
    canRetailAction,
    users = [],
  } = contexto;

  const goRetailTab = (tabId) => {
    if (typeof setNavRetailTab === "function") setNavRetailTab(tabId);
  };

  const retail = retailState || {};
  const clients = retail.clients || [];
  const products = retail.products || [];
  const footprints = retail.footprints || [];
  const purchaseOrders = retail.purchaseOrders || [];
  const preassembledBoxes = retail.preassembledBoxes || [];
  const incidents = retail.incidents || [];
  const printLog = retail.printLog || [];

  const can = (actionId) => (typeof canRetailAction === "function" ? canRetailAction(actionId) : false);
  const runMutation = useRetailMutation(contexto);

  const [search, setSearch] = useState("");
  const importInputRef = useRef(null);

  const metrics = useMemo(() => ({
    products: products.length,
    stock: products.reduce((sum, p) => sum + (Number(p.stockPieces) || 0), 0),
    openPo: purchaseOrders.filter((o) => o.status !== RETAIL_PO_STATUS.CLOSED && o.status !== RETAIL_PO_STATUS.CANCELLED).length,
    prearm: preassembledBoxes.filter((b) => b.status === "available").length,
  }), [products, purchaseOrders, preassembledBoxes]);

  const q = search.trim().toLowerCase();

  // --- Modals ---
  const [productModal, setProductModal] = useState(false);
  const [lotModal, setLotModal] = useState(false);
  const [clientModal, setClientModal] = useState(false);
  const [ocModal, setOcModal] = useState(false);
  const [prearmModal, setPrearmModal] = useState(false);
  const [incidentModal, setIncidentModal] = useState(false);

  // --- Forms ---
  const emptyInvForm = { id: "", code: "", name: "", presentation: "", labelTag: "", piecesPerBox: "1", lot: "", expiry: "", qty: "" };
  const [invForm, setInvForm] = useState(emptyInvForm);
  const emptyLotForm = { productId: "", lotId: "", lot: "", expiry: "", etiqueta: "", qty: "" };
  const [lotForm, setLotForm] = useState(emptyLotForm);
  const emptyClientForm = { id: "", name: "", code: "", clientFootprintId: "", boxFootprintId: "", palletFootprintId: "", designs: null };
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [ocClientId, setOcClientId] = useState("");
  const [ocProductId, setOcProductId] = useState("");
  const [ocQty, setOcQty] = useState("1");
  const [ocLines, setOcLines] = useState([]);
  const emptyPreForm = { productId: "", lot: "", expiry: "", qtyPieces: "" };
  const [preForm, setPreForm] = useState(emptyPreForm);
  const emptyIncidentForm = { id: "", purchaseOrderId: "", type: "faltante", description: "" };
  const [incidentForm, setIncidentForm] = useState(emptyIncidentForm);

  // --- Surtido / Cerrado (cards -> modal) ---
  const [pickPoId, setPickPoId] = useState("");
  const [pickQty, setPickQty] = useState({});
  const [pickLot, setPickLot] = useState({});
  const [closePoId, setClosePoId] = useState("");
  const [palletBoxes, setPalletBoxes] = useState([]);

  // --- Armado de cajas (composicion multi-producto por caja) ---
  const [boxDraft, setBoxDraft] = useState([]);

  // --- Sub-pestanas pendiente / historial ---
  const [ocViewTab, setOcViewTab] = useState("pending");
  const [surtidoViewTab, setSurtidoViewTab] = useState("pending");
  const [cerradoViewTab, setCerradoViewTab] = useState("pending");
  const [incidenciasViewTab, setIncidenciasViewTab] = useState("pending");

  // --- Inventario (expandible) ---
  const [expandedProductId, setExpandedProductId] = useState("");
  const [productDetailView, setProductDetailView] = useState("lotes");

  const pickOrder = purchaseOrders.find((o) => o.id === pickPoId) || null;
  const closeOrder = purchaseOrders.find((o) => o.id === closePoId) || null;

  // Carga el borrador de cajas al abrir una OC en surtido
  useEffect(() => {
    if (!pickPoId) { setBoxDraft([]); return; }
    const order = purchaseOrders.find((o) => o.id === pickPoId);
    setBoxDraft((order?.boxes || []).map((b) => ({
      id: b.id,
      folio: b.folio,
      items: (b.items || []).map((it) => ({ ...it })),
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickPoId]);

  function makeLocalId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Genera cajas automaticamente: por cada linea, llena cajas segun piezas por caja
  function autoArmarBoxes() {
    if (!pickOrder) return;
    const boxes = [];
    let n = 0;
    for (const line of pickOrder.lines) {
      const product = products.find((p) => p.id === line.productId);
      const per = Math.max(1, Number(product?.piecesPerBox) || 0) || 0;
      const total = Number(line.qtyPicked) || Number(line.qtyOrdered) || 0;
      if (!total) continue;
      const step = per || total;
      let remaining = total;
      while (remaining > 0) {
        const qty = Math.min(step, remaining);
        n += 1;
        boxes.push({
          id: makeLocalId("box"),
          folio: `CJ-${n}`,
          items: [{ productId: line.productId, productCode: line.productCode, productName: line.productName, qty, lot: line.lot || "" }],
        });
        remaining -= qty;
      }
    }
    setBoxDraft(boxes);
  }

  function addEmptyBox() {
    setBoxDraft((prev) => [...prev, { id: makeLocalId("box"), folio: `CJ-${prev.length + 1}`, items: [] }]);
  }
  function removeBox(id) {
    setBoxDraft((prev) => prev.filter((b) => b.id !== id));
  }
  function updateBoxFolio(id, folio) {
    setBoxDraft((prev) => prev.map((b) => (b.id === id ? { ...b, folio } : b)));
  }
  function addItemToBox(boxId) {
    if (!pickOrder) return;
    const firstLine = pickOrder.lines[0];
    if (!firstLine) return;
    const product = products.find((p) => p.id === firstLine.productId);
    setBoxDraft((prev) => prev.map((b) => (b.id === boxId ? {
      ...b,
      items: [...b.items, { productId: firstLine.productId, productCode: firstLine.productCode, productName: firstLine.productName, qty: Number(product?.piecesPerBox) || 1, lot: firstLine.lot || "" }],
    } : b)));
  }
  function updateBoxItem(boxId, index, patch) {
    setBoxDraft((prev) => prev.map((b) => {
      if (b.id !== boxId) return b;
      const items = b.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
      return { ...b, items };
    }));
  }
  function setBoxItemProduct(boxId, index, productId) {
    const line = pickOrder?.lines.find((l) => l.productId === productId);
    if (!line) return;
    updateBoxItem(boxId, index, { productId: line.productId, productCode: line.productCode, productName: line.productName, lot: line.lot || "" });
  }
  function removeBoxItem(boxId, index) {
    setBoxDraft((prev) => prev.map((b) => (b.id === boxId ? { ...b, items: b.items.filter((_, i) => i !== index) } : b)));
  }
  async function saveBoxes() {
    if (!pickOrder) return;
    await runMutation(retailApi.setOrderBoxes({ purchaseOrderId: pickOrder.id, boxes: boxDraft }));
  }

  function downloadInventoryTemplate() {
    downloadCsv("plantilla-inventario-retail.csv", INVENTORY_TEMPLATE_HEADERS, [
      { codigo: "7501000000001", nombre: "Producto ejemplo A", presentacion: "200 Caps", etiqueta: "RETAIL", piezas_por_caja: "12", lote: "L2601", caducidad: "2027-09-01", piezas: "480" },
      { codigo: "7501000000001", nombre: "Producto ejemplo A", presentacion: "200 Caps", etiqueta: "RETAIL", piezas_por_caja: "12", lote: "L2602", caducidad: "2027-12-01", piezas: "240" },
      { codigo: "7501000000002", nombre: "Producto ejemplo B", presentacion: "300 Caps", etiqueta: "NATURISTA", piezas_por_caja: "6", lote: "L7788", caducidad: "2028-01-15", piezas: "120" },
    ]);
  }

  async function importProductsCsv(file) {
    if (!file || !can("importRetailCatalog")) return;
    const rows = await readCsvFile(file);
    const groups = new Map();
    for (const row of rows) {
      const code = String(row.codigo || row.code || row.ean || "").trim();
      const name = String(row.nombre || row.name || "").trim();
      if (!code || !name) continue;
      const key = code.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, {
          code,
          name,
          presentation: row.presentacion || row.presentation || "",
          labelTag: row.etiqueta || row.label || "",
          piecesPerBox: row.piezas_por_caja || row.piecesperbox || 1,
          lots: [],
        });
      }
      const group = groups.get(key);
      const lot = String(row.lote || row.lot || "").trim();
      const qty = Number(row.piezas || row.qty || row.cantidad || 0) || 0;
      if (lot || qty > 0) {
        group.lots.push({ lot, expiry: row.caducidad || row.expiry || "", qty, etiqueta: row.etiqueta || group.labelTag || "" });
      }
    }
    for (const group of groups.values()) {
      const existing = products.find((p) => String(p.code).toLowerCase() === group.code.toLowerCase());
      await runMutation(retailApi.upsertProduct({
        id: existing?.id,
        code: group.code,
        ean: group.code,
        name: group.name,
        presentation: group.presentation,
        labelTag: group.labelTag,
        piecesPerBox: group.piecesPerBox,
        lots: group.lots,
      }));
    }
  }

  async function saveProduct() {
    const payload = {
      id: invForm.id || undefined,
      code: invForm.code,
      ean: invForm.code,
      name: invForm.name,
      presentation: invForm.presentation,
      labelTag: invForm.labelTag,
      piecesPerBox: invForm.piecesPerBox,
    };
    if (!invForm.id && invForm.lot) {
      payload.lots = [{ lot: invForm.lot, expiry: invForm.expiry, qty: Number(invForm.qty) || 0, etiqueta: invForm.labelTag }];
    }
    await runMutation(retailApi.upsertProduct(payload));
    setInvForm(emptyInvForm);
    setProductModal(false);
  }

  function openEditProduct(product) {
    setInvForm({
      id: product.id,
      code: product.code || "",
      name: product.name || "",
      presentation: product.presentation || "",
      labelTag: product.labelTag || "",
      piecesPerBox: String(product.piecesPerBox || 1),
      lot: "",
      expiry: "",
      qty: "",
    });
    setProductModal(true);
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Eliminar el producto "${product.name}"? Solo se permite si no esta en ordenes de compra.`)) return;
    await runMutation(retailApi.deleteProduct({ id: product.id }));
    if (expandedProductId === product.id) setExpandedProductId("");
  }

  function openEditLot(product, lot) {
    setLotForm({
      productId: product.id,
      lotId: lot.id,
      lot: lot.lot || "",
      expiry: lot.expiry || "",
      etiqueta: lot.etiqueta || "",
      qty: String(lot.qty ?? 0),
    });
    setLotModal(true);
  }

  async function saveLot() {
    await runMutation(retailApi.updateProductLot({
      productId: lotForm.productId,
      lotId: lotForm.lotId,
      lot: lotForm.lot,
      expiry: lotForm.expiry,
      etiqueta: lotForm.etiqueta,
      qty: Number(lotForm.qty) || 0,
    }));
    setLotForm(emptyLotForm);
    setLotModal(false);
  }

  async function deleteLot(product, lot) {
    if (!window.confirm(`Eliminar el lote "${lot.lot || "(sin lote)"}"?`)) return;
    await runMutation(retailApi.deleteProductLot({ productId: product.id, lotId: lot.id }));
  }

  async function deleteClient(client) {
    if (!window.confirm(`Eliminar el cliente "${client.name}" y sus huellas? Solo si no tiene ordenes de compra.`)) return;
    await runMutation(retailApi.deleteClient({ id: client.id }));
  }

  function elementsOf(footprintId) {
    const fp = footprints.find((f) => f.id === footprintId);
    const els = fp?.fieldMap?.elements;
    return Array.isArray(els) && els.length ? els : null;
  }

  function openNewClient() {
    setClientForm({
      ...emptyClientForm,
      designs: {
        producto: defaultElements("producto"),
        caja: defaultElements("caja"),
        tarima: defaultElements("tarima"),
      },
    });
    setClientModal(true);
  }

  function openEditClient(c) {
    setClientForm({
      id: c.id,
      name: c.name || "",
      code: c.code || "",
      clientFootprintId: c.clientFootprintId || "",
      boxFootprintId: c.boxFootprintId || "",
      palletFootprintId: c.palletFootprintId || "",
      designs: {
        producto: elementsOf(c.clientFootprintId) || defaultElements("producto"),
        caja: elementsOf(c.boxFootprintId) || defaultElements("caja"),
        tarima: elementsOf(c.palletFootprintId) || defaultElements("tarima"),
      },
    });
    setClientModal(true);
  }

  async function saveClient() {
    const ids = { producto: clientForm.clientFootprintId, caja: clientForm.boxFootprintId, tarima: clientForm.palletFootprintId };
    const result = { ...ids };
    if (can("manageRetailFootprints") && clientForm.designs) {
      const kindMap = { producto: "client", caja: "box", tarima: "pallet" };
      for (const kind of ["producto", "caja", "tarima"]) {
        const elements = clientForm.designs[kind] || [];
        const fpRes = await runMutation(retailApi.upsertFootprint({
          id: ids[kind] || undefined,
          name: `${clientForm.name} - ${kind}`.trim(),
          kind: kindMap[kind],
          ownerType: "client",
          barcodeType: primaryFormat(elements),
          fieldMap: { labelKind: kind, widthMm: 100, heightMm: 150, elements },
        }));
        result[kind] = fpRes?.data?.footprint?.id || ids[kind];
      }
    }
    await runMutation(retailApi.upsertClient({
      id: clientForm.id || undefined,
      name: clientForm.name,
      code: clientForm.code,
      clientFootprintId: result.producto || "",
      boxFootprintId: result.caja || "",
      palletFootprintId: result.tarima || "",
    }));
    setClientForm(emptyClientForm);
    setClientModal(false);
  }

  async function createOrder() {
    await runMutation(retailApi.createPurchaseOrder({ clientId: ocClientId, lines: ocLines }));
    setOcLines([]);
    setOcClientId("");
    setOcModal(false);
  }

  // --- Impresion de etiquetas reales desde el diseno de huella ---
  function huellaElements(footprintId) {
    const fp = footprints.find((f) => f.id === footprintId);
    return fp?.fieldMap?.elements || [];
  }

  function lineContext(order, line) {
    const product = products.find((p) => p.id === line.productId);
    const lot = line.lot || product?.lots?.[0]?.lot || "";
    const expiry = product?.lots?.find((l) => l.lot === lot)?.expiry || product?.lots?.[0]?.expiry || "";
    const client = clients.find((c) => c.id === order.clientId);
    return {
      clientName: order.clientName,
      clientCode: client?.code || "",
      productCode: line.productCode,
      productName: line.productName,
      lot,
      expiry,
      qty: line.qtyPicked || line.qtyOrdered,
      sscc: "",
      po: order.folio,
      date: new Date().toLocaleDateString("es-MX"),
    };
  }

  async function printProductLabel(order, line, reprint) {
    const client = clients.find((c) => c.id === order.clientId);
    await printHuellaLabel(huellaElements(client?.clientFootprintId), lineContext(order, line));
    await runMutation(retailApi.logLabelPrint({ purchaseOrderId: order.id, lineId: line.id, referenceId: line.id, kind: "product", footprintId: client?.clientFootprintId, reprint }));
  }

  // Construye los items (productos) que contiene una caja para la etiqueta
  function boxItems(box) {
    return (box?.items || []).map((it) => {
      const product = products.find((p) => p.id === it.productId);
      const lot = it.lot || product?.lots?.[0]?.lot || "";
      return { code: it.productCode, name: it.productName, qty: it.qty, lot, sscc: "" };
    });
  }

  async function printBoxLabel(order, box) {
    const client = clients.find((c) => c.id === order.clientId);
    const items = boxItems(box);
    const totalPieces = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    const ctx = {
      clientName: order.clientName,
      clientCode: client?.code || "",
      productCode: items[0]?.code || "",
      productName: items.length > 1 ? `${items.length} productos` : (items[0]?.name || ""),
      lot: items.length === 1 ? items[0]?.lot || "" : "",
      expiry: "",
      qty: totalPieces,
      sscc: box?.folio || "",
      po: order.folio,
      date: new Date().toLocaleDateString("es-MX"),
      items,
    };
    await printHuellaLabel(huellaElements(client?.boxFootprintId), ctx);
    await runMutation(retailApi.logLabelPrint({ purchaseOrderId: order.id, referenceId: box?.id || "", kind: "box", footprintId: client?.boxFootprintId, reprint: false }));
  }

  async function printPalletLabel(order, pal) {
    const client = clients.find((c) => c.id === order.clientId);
    const palletBoxList = (pal.boxIds || []).map((bid) => (order.boxes || []).find((b) => b.id === bid)).filter(Boolean);
    // Cada renglon de la tarima representa una caja; auto-ajusta segun cuantas lleve
    const items = palletBoxList.map((b, i) => {
      const pieces = (b.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
      return { code: b.folio || `CJ-${i + 1}`, name: `Caja ${b.folio || i + 1}`, qty: pieces, lot: "", sscc: b.folio || `${pal.folio}-${i + 1}` };
    });
    const totalQty = palletBoxList.reduce((s, b) => s + (b.items || []).reduce((ss, it) => ss + (Number(it.qty) || 0), 0), 0);
    const ctx = {
      clientName: order.clientName,
      clientCode: client?.code || "",
      productCode: "",
      productName: "",
      lot: "",
      expiry: "",
      qty: totalQty,
      sscc: pal.folio,
      po: order.folio,
      date: new Date().toLocaleDateString("es-MX"),
      items,
    };
    await printHuellaLabel(huellaElements(client?.palletFootprintId), ctx);
    await runMutation(retailApi.logLabelPrint({ purchaseOrderId: order.id, referenceId: pal.id, kind: "pallet", footprintId: client?.palletFootprintId, reprint: false }));
  }

  async function createPreBox() {
    await runMutation(retailApi.createPreassembledBox({ productId: preForm.productId, lot: preForm.lot, expiry: preForm.expiry, qtyPieces: preForm.qtyPieces, consumeStock: true }));
    setPreForm(emptyPreForm);
    setPrearmModal(false);
  }

  function openNewIncident() {
    setIncidentForm(emptyIncidentForm);
    setIncidentModal(true);
  }

  function openEditIncident(inc) {
    setIncidentForm({ id: inc.id, purchaseOrderId: inc.purchaseOrderId || "", type: inc.type || "otro", description: inc.description || "" });
    setIncidentModal(true);
  }

  async function saveIncident() {
    if (incidentForm.id) {
      await runMutation(retailApi.updateIncident({
        id: incidentForm.id,
        purchaseOrderId: incidentForm.purchaseOrderId,
        type: incidentForm.type,
        description: incidentForm.description,
      }));
    } else {
      await runMutation(retailApi.createIncident({
        purchaseOrderId: incidentForm.purchaseOrderId,
        type: incidentForm.type,
        description: incidentForm.description,
      }));
    }
    setIncidentForm(emptyIncidentForm);
    setIncidentModal(false);
  }

  async function toggleIncidentResolved(inc) {
    await runMutation(retailApi.updateIncident({ id: inc.id, resolved: !inc.resolved }));
  }

  async function deleteIncident(inc) {
    if (!window.confirm("Eliminar esta incidencia? Esta accion no se puede deshacer.")) return;
    await runMutation(retailApi.deleteIncident({ id: inc.id }));
  }

  // ============ INVENTARIO ============
  function productHistory(product) {
    const rows = [];
    purchaseOrders.forEach((order) => {
      (order.lines || []).forEach((line) => {
        if (line.productId !== product.id) return;
        rows.push({
          when: order.updatedAt || order.createdAt || "",
          ref: order.folio,
          detail: `${order.clientName || "Cliente"} - surtido ${line.qtyPicked || 0}/${line.qtyOrdered}`,
          lot: line.lot || "-",
          tag: RETAIL_PO_STATUS_LABELS[order.status] || order.status,
        });
      });
    });
    preassembledBoxes.forEach((box) => {
      if (box.productId !== product.id) return;
      rows.push({
        when: box.createdAt || "",
        ref: "Prearmado",
        detail: `Caja prearmada (${box.qtyPieces} pzs)`,
        lot: box.lot || "-",
        tag: box.status,
      });
    });
    return rows.sort((a, b) => String(b.when).localeCompare(String(a.when)));
  }

  function renderProductDetail(product) {
    const lots = product.lots || [];
    const history = productHistory(product);
    return (
      <div className="retail-product-detail">
        <div className="retail-product-detail-tabs">
          <button type="button" className={productDetailView === "lotes" ? "active" : ""} onClick={() => setProductDetailView("lotes")}>
            <Layers size={14} /> Ver lotes ({lots.length})
          </button>
          <button type="button" className={productDetailView === "historial" ? "active" : ""} onClick={() => setProductDetailView("historial")}>
            <History size={14} /> Historial ({history.length})
          </button>
        </div>
        {productDetailView === "lotes" ? (
          <div className="table-wrap retail-detail-table-wrap">
            <table className="data-table retail-data-table retail-detail-table">
              <thead><tr><th>Lote</th><th>Etiqueta</th><th>Caducidad</th><th>Piezas</th><th>Actualizado</th>{can("manageRetailCatalog") ? <th>Acciones</th> : null}</tr></thead>
              <tbody>
                {lots.length ? lots.map((lot) => (
                  <tr key={lot.id}>
                    <td><strong>{lot.lot || "(sin lote)"}</strong></td>
                    <td>{lot.etiqueta || "-"}</td>
                    <td>{lot.expiry || "-"}</td>
                    <td><span className="retail-stock-pill">{lot.qty} pzs</span></td>
                    <td className="subtle-line">{lot.updatedAt ? new Date(lot.updatedAt).toLocaleDateString("es-MX") : "-"}</td>
                    {can("manageRetailCatalog") ? (
                      <td>
                        <div className="retail-actions-row">
                          <button type="button" className="icon-button sm-button" onClick={(e) => { e.stopPropagation(); openEditLot(product, lot); }}><Pencil size={13} /> Editar</button>
                          <button type="button" className="icon-button sm-button danger" onClick={(e) => { e.stopPropagation(); deleteLot(product, lot); }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )) : <RetailEmptyRow colSpan={can("manageRetailCatalog") ? 6 : 5} message="Este producto no tiene lotes registrados." />}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap retail-detail-table-wrap">
            <table className="data-table retail-data-table retail-detail-table">
              <thead><tr><th>Fecha</th><th>Referencia</th><th>Movimiento</th><th>Lote</th><th>Estado</th></tr></thead>
              <tbody>
                {history.length ? history.map((row, i) => (
                  <tr key={`${row.ref}-${i}`}>
                    <td className="subtle-line">{row.when ? new Date(row.when).toLocaleString("es-MX") : "-"}</td>
                    <td><strong>{row.ref}</strong></td>
                    <td>{row.detail}</td>
                    <td>{row.lot}</td>
                    <td><span className="retail-status-badge">{row.tag}</span></td>
                  </tr>
                )) : <RetailEmptyRow colSpan={5} message="Sin movimientos para este producto." />}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderInventario() {
    const filtered = products.filter((p) => !q || [p.code, p.name, p.presentation].join(" ").toLowerCase().includes(q));
    return (
      <>
        <TabHeader
          title="Inventario retail"
          subtitle="Cada producto guarda varios lotes y caducidades. El stock baja al surtir y al prearmar. Haz clic en un producto para ver sus lotes e historial."
          actions={can("manageRetailCatalog") ? (
            <>
              <button type="button" className="icon-button sm-button" onClick={downloadInventoryTemplate}>
                <Download size={14} /> Plantilla CSV
              </button>
              <button type="button" className="icon-button sm-button" disabled={!can("importRetailCatalog")} onClick={() => importInputRef.current?.click()}>
                <Upload size={14} /> Importar CSV
              </button>
              <button type="button" className="primary-button" onClick={() => { setInvForm(emptyInvForm); setProductModal(true); }}>
                <Plus size={15} /> Nuevo producto
              </button>
              <input ref={importInputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { importProductsCsv(e.target.files?.[0]); e.target.value = ""; }} />
            </>
          ) : null}
        />
        <div className="retail-stat-strip">
          <StatChip label="Productos" value={metrics.products} />
          <StatChip label="Piezas en stock" value={metrics.stock.toLocaleString("es-MX")} />
          <StatChip label="Cajas prearmadas" value={metrics.prearm} />
        </div>
        <article className="surface-card retail-panel-card">
          <div className="retail-panel-toolbar"><SearchBox value={search} onChange={setSearch} /></div>
          <div className="table-wrap retail-table-scroll">
            <table className="data-table retail-data-table">
              <thead>
                <tr>
                  <th className="retail-col-caret" />
                  <th>Codigo</th><th>Nombre</th><th>Presentacion</th><th>Lotes</th><th>Stock</th><th>Prearmado</th>
                  {can("manageRetailCatalog") ? <th className="retail-col-actions">Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map((product) => {
                  const open = expandedProductId === product.id;
                  return (
                    <Fragment key={product.id}>
                      <tr className={`retail-clickable-row ${open ? "is-open" : ""}`} onClick={() => { setExpandedProductId(open ? "" : product.id); setProductDetailView("lotes"); }}>
                        <td className="retail-row-caret"><ChevronDown size={16} className={open ? "rotated" : ""} /></td>
                        <td><strong>{product.code}</strong></td>
                        <td>{product.name}</td>
                        <td>{product.presentation || "-"}</td>
                        <td><span className="retail-status-badge">{(product.lots || []).length} lotes</span></td>
                        <td><span className="retail-stock-pill">{product.stockPieces} pzs</span></td>
                        <td>{product.preassembledBoxCount ? <span className="retail-status-badge warn">{product.preassembledBoxCount} cajas</span> : "-"}</td>
                        {can("manageRetailCatalog") ? (
                          <td className="retail-col-actions" onClick={(e) => e.stopPropagation()}>
                            <div className="retail-actions-row">
                              <button type="button" className="icon-button sm-button" onClick={() => openEditProduct(product)}><Pencil size={13} /> Editar</button>
                              <button type="button" className="icon-button sm-button danger" onClick={() => deleteProduct(product)}><Trash2 size={13} /></button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                      {open ? (
                        <tr className="retail-detail-row">
                          <td colSpan={can("manageRetailCatalog") ? 8 : 7}>{renderProductDetail(product)}</td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                }) : <RetailEmptyRow colSpan={can("manageRetailCatalog") ? 8 : 7} message="No hay productos. Descarga la plantilla, importa un CSV o da de alta el primero." />}
              </tbody>
            </table>
          </div>
        </article>
      </>
    );
  }

  // ============ CLIENTES + HUELLAS (fusionados) ============
  function renderClientes() {
    const filteredClients = clients.filter((c) => !q || [c.name, c.code].join(" ").toLowerCase().includes(q));
    return (
      <>
        <TabHeader
          title="Clientes"
          subtitle="Cada cliente lleva su propia huella logistica. Al dar de alta o editar el cliente defines y previsualizas su etiqueta."
          actions={can("manageRetailClients") ? (
            <button type="button" className="primary-button" onClick={openNewClient}>
              <Plus size={15} /> Nuevo cliente
            </button>
          ) : null}
        />
        <article className="surface-card retail-panel-card">
          <div className="retail-panel-toolbar"><SearchBox value={search} onChange={setSearch} /></div>
          <div className="table-wrap retail-table-scroll">
            <table className="data-table retail-data-table retail-clients-table">
              <thead><tr><th>Cliente</th><th>Codigo</th><th>Huellas configuradas</th><th className="retail-col-actions">Acciones</th></tr></thead>
              <tbody>
                {filteredClients.length ? filteredClients.map((c) => {
                  const hasProd = Boolean(elementsOf(c.clientFootprintId));
                  const hasBox = Boolean(elementsOf(c.boxFootprintId));
                  const hasPallet = Boolean(elementsOf(c.palletFootprintId));
                  return (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.code || "-"}</td>
                      <td>
                        <div className="retail-huella-badges">
                          <span className={`retail-status-badge ${hasProd ? "ok" : ""}`}>Producto</span>
                          <span className={`retail-status-badge ${hasBox ? "ok" : ""}`}>Caja</span>
                          <span className={`retail-status-badge ${hasPallet ? "ok" : ""}`}>Tarima</span>
                        </div>
                      </td>
                      <td className="retail-col-actions">
                        {can("manageRetailClients") ? (
                          <div className="retail-actions-row">
                            <button type="button" className="icon-button sm-button" onClick={() => openEditClient(c)}><Pencil size={13} /> Editar</button>
                            <button type="button" className="icon-button sm-button danger" onClick={() => deleteClient(c)}><Trash2 size={13} /></button>
                          </div>
                        ) : "-"}
                      </td>
                    </tr>
                  );
                }) : <RetailEmptyRow colSpan={4} message="Sin clientes registrados. Crea el primero y disena sus huellas." />}
              </tbody>
            </table>
          </div>
        </article>
      </>
    );
  }

  // ============ ORDENES DE COMPRA ============
  function renderOrdenes() {
    const pendingOrders = purchaseOrders.filter((o) => !OC_HISTORY_STATUSES.includes(o.status));
    const historyOrders = purchaseOrders.filter((o) => OC_HISTORY_STATUSES.includes(o.status));
    const source = ocViewTab === "history" ? historyOrders : pendingOrders;
    const filtered = source.filter((o) => !q || [o.folio, o.clientName].join(" ").toLowerCase().includes(q));
    return (
      <>
        <TabHeader
          title="Ordenes de compra"
          subtitle="Pendientes: OC activas. Historial: cerradas y canceladas."
          actions={can("manageRetailPurchaseOrders") ? (
            <button type="button" className="primary-button" disabled={!clients.length || !products.length} onClick={() => setOcModal(true)}>
              <Plus size={15} /> Nueva OC
            </button>
          ) : null}
        />
        <ViewTabs
          active={ocViewTab}
          onChange={setOcViewTab}
          tabs={[
            { id: "pending", label: "Pendientes", count: pendingOrders.length },
            { id: "history", label: "Historial", count: historyOrders.length },
          ]}
        />
        <article className="surface-card retail-panel-card">
          <div className="retail-panel-toolbar"><SearchBox value={search} onChange={setSearch} /></div>
          <div className="table-wrap retail-table-scroll">
            <table className="data-table retail-data-table">
              <thead><tr><th>Folio</th><th>Cliente</th><th>Estado</th><th>Lineas</th><th>Accion</th></tr></thead>
              <tbody>
                {filtered.length ? filtered.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.folio}</strong></td>
                    <td>{order.clientName}</td>
                    <td><RetailStatusBadge status={order.status} /></td>
                    <td>{order.lines?.length || 0}</td>
                    <td>
                      {ocViewTab === "pending" && SURTIDO_PENDING_STATUSES.includes(order.status) ? (
                        <button type="button" className="icon-button sm-button" onClick={() => { setPickPoId(order.id); goRetailTab("surtido"); }}>Ir a surtido</button>
                      ) : ocViewTab === "pending" && CERRADO_PENDING_STATUSES.includes(order.status) ? (
                        <button type="button" className="icon-button sm-button" onClick={() => { setClosePoId(order.id); goRetailTab("cerrado"); }}>Ir a cierre</button>
                      ) : ocViewTab === "history" && order.status === RETAIL_PO_STATUS.CLOSED ? (
                        <button type="button" className="icon-button sm-button" onClick={() => { setClosePoId(order.id); goRetailTab("cerrado"); setCerradoViewTab("history"); }}>Ver cierre</button>
                      ) : <span className="subtle-line">-</span>}
                    </td>
                  </tr>
                )) : <RetailEmptyRow colSpan={5} message={ocViewTab === "history" ? "Sin ordenes en historial." : "Sin ordenes pendientes."} />}
              </tbody>
            </table>
          </div>
        </article>
      </>
    );
  }

  // ============ TARJETA DE OC (surtido / cerrado) ============
  function OcCard({ order, onClick, readonly = false }) {
    const ordered = (order.lines || []).reduce((s, l) => s + (Number(l.qtyOrdered) || 0), 0);
    const picked = (order.lines || []).reduce((s, l) => s + (Number(l.qtyPicked) || 0), 0);
    const pct = ordered ? Math.round((picked / ordered) * 100) : 0;
    const Tag = readonly ? "article" : "button";
    return (
      <Tag type={readonly ? undefined : "button"} className={`retail-oc-card ${readonly ? "retail-oc-card--readonly" : ""}`} onClick={onClick}>
        <div className="retail-oc-card-top">
          <strong>{order.folio}</strong>
          <RetailStatusBadge status={order.status} />
        </div>
        <div className="retail-oc-card-client">{order.clientName}</div>
        <div className="retail-oc-card-meta">{order.lines?.length || 0} lineas - {ordered.toLocaleString("es-MX")} pzs pedidas</div>
        <div className="retail-oc-progress"><span style={{ width: `${pct}%` }} /></div>
        <div className="retail-oc-card-foot">{picked.toLocaleString("es-MX")}/{ordered.toLocaleString("es-MX")} surtido - {pct}%</div>
      </Tag>
    );
  }

  // ============ SURTIDO ============
  function renderSurtido() {
    const pendingOrders = purchaseOrders.filter((o) => SURTIDO_PENDING_STATUSES.includes(o.status));
    const historyOrders = purchaseOrders.filter((o) => SURTIDO_HISTORY_STATUSES.includes(o.status));
    const source = surtidoViewTab === "history" ? historyOrders : pendingOrders;
    const filtered = source.filter((o) => !q || [o.folio, o.clientName].join(" ").toLowerCase().includes(q));
    return (
      <>
        <TabHeader title="Surtido" subtitle="Pendientes: por surtir. Historial: ya surtidas o cerradas." />
        <ViewTabs
          active={surtidoViewTab}
          onChange={setSurtidoViewTab}
          tabs={[
            { id: "pending", label: "Pendientes", count: pendingOrders.length },
            { id: "history", label: "Historial", count: historyOrders.length },
          ]}
        />
        {filtered.length ? (
          <div className="retail-oc-grid">
            {filtered.map((order) => (
              <OcCard
                key={order.id}
                order={order}
                onClick={surtidoViewTab === "pending" ? () => { setPickPoId(order.id); setPickQty({}); setPickLot({}); } : undefined}
                readonly={surtidoViewTab === "history"}
              />
            ))}
          </div>
        ) : (
          <article className="surface-card retail-empty-state">
            <Layers size={28} />
            <p>{surtidoViewTab === "history" ? "Sin ordenes surtidas en historial." : "No hay ordenes pendientes de surtido."}</p>
          </article>
        )}
      </>
    );
  }

  function renderPickModal() {
    if (!pickOrder) return null;
    return (
      <Modal
        open={Boolean(pickOrder)}
        title={`Surtido - ${pickOrder.folio}`}
        onClose={() => setPickPoId("")}
        onConfirm={async () => { await runMutation(retailApi.markPurchaseOrderPicked({ purchaseOrderId: pickOrder.id })); setPickPoId(""); }}
        confirmLabel="Marcar OC como surtida"
        confirmDisabled={!can("manageRetailPicking")}
        className="retail-modal retail-modal--wide"
      >
        <p className="retail-close-meta">Cliente: <strong>{pickOrder.clientName}</strong> - Estado: {RETAIL_PO_STATUS_LABELS[pickOrder.status]}</p>
        <div className="table-wrap">
          <table className="data-table retail-data-table">
            <thead><tr><th>Producto</th><th>Pedido</th><th>Surtido</th><th>Lote</th><th>Stock disponible</th><th /></tr></thead>
            <tbody>
              {pickOrder.lines.map((line) => {
                const product = products.find((p) => p.id === line.productId);
                return (
                  <tr key={line.id}>
                    <td><strong>{line.productCode}</strong><div className="subtle-line">{line.productName}</div></td>
                    <td>{line.qtyOrdered}</td>
                    <td><input type="number" min="0" max={line.qtyOrdered} value={pickQty[line.id] ?? line.qtyPicked ?? 0} onChange={(e) => setPickQty((mm) => ({ ...mm, [line.id]: e.target.value }))} className="retail-qty-input" /></td>
                    <td>
                      <select value={pickLot[line.id] ?? line.lot ?? ""} onChange={(e) => setPickLot((mm) => ({ ...mm, [line.id]: e.target.value }))} className="retail-lot-input">
                        <option value="">Auto / sin lote</option>
                        {(product?.lots || []).map((lot) => <option key={lot.id} value={lot.lot}>{lot.lot || "(sin lote)"} ({lot.qty} pzs)</option>)}
                      </select>
                    </td>
                    <td>
                      <ul className="retail-lot-inline-list">
                        {(product?.lots || []).map((lot) => <li key={lot.id}>{lot.lot || "(sin lote)"}: {lot.qty} pzs - cad {lot.expiry || "-"}</li>)}
                      </ul>
                      {product?.preassembledBoxCount ? <span className="retail-status-badge warn">{product.preassembledBoxCount} cajas prearmadas</span> : null}
                    </td>
                    <td>
                      <button type="button" className="primary-button sm" disabled={!can("manageRetailPicking")} onClick={() => runMutation(retailApi.pickPurchaseOrderLine({
                        purchaseOrderId: pickOrder.id,
                        lineId: line.id,
                        qtyPicked: Number(pickQty[line.id] ?? line.qtyOrdered),
                        lot: pickLot[line.id] || "",
                      }))}>{line.qtyPicked >= line.qtyOrdered ? "Resurtir" : "Surtir"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <hr className="retail-divider" />
        <div className="retail-armado-head">
          <div>
            <h3>Armado de cajas</h3>
            <p className="subtle-line">Define que productos van en cada caja. La etiqueta de caja listara estos codigos automaticamente; la de tarima listara las cajas. Todo se auto-ajusta.</p>
          </div>
          <div className="retail-actions-row">
            <button type="button" className="secondary-button" disabled={!can("manageRetailPicking")} onClick={autoArmarBoxes}>Auto-armar por piezas/caja</button>
            <button type="button" className="icon-button sm-button" disabled={!can("manageRetailPicking")} onClick={addEmptyBox}><Plus size={14} /> Caja vacia</button>
            <button type="button" className="primary-button sm" disabled={!can("manageRetailPicking")} onClick={saveBoxes}>Guardar armado</button>
          </div>
        </div>
        {boxDraft.length ? (
          <div className="retail-box-grid">
            {boxDraft.map((box, bi) => {
              const pieces = box.items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
              return (
                <article key={box.id} className="retail-box-card">
                  <header className="retail-box-card-head">
                    <input className="retail-box-folio" value={box.folio} onChange={(e) => updateBoxFolio(box.id, e.target.value)} placeholder={`CJ-${bi + 1}`} />
                    <span className="subtle-line">{box.items.length} prod. - {pieces} pzs</span>
                    <button type="button" className="icon-button sm-button danger" onClick={() => removeBox(box.id)}><Trash2 size={13} /></button>
                  </header>
                  {box.items.map((it, ii) => (
                    <div key={ii} className="retail-box-item">
                      <select value={it.productId} onChange={(e) => setBoxItemProduct(box.id, ii, e.target.value)}>
                        {pickOrder.lines.map((l) => <option key={l.id} value={l.productId}>{l.productCode} - {l.productName}</option>)}
                      </select>
                      <input type="number" min="0" className="retail-qty-input" value={it.qty} onChange={(e) => updateBoxItem(box.id, ii, { qty: Number(e.target.value) || 0 })} />
                      <button type="button" className="icon-button sm-button danger" onClick={() => removeBoxItem(box.id, ii)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <button type="button" className="icon-button sm-button retail-box-add" onClick={() => addItemToBox(box.id)}><Plus size={13} /> Producto</button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="subtle-line">Aun no hay cajas. Usa <strong>Auto-armar</strong> o crea cajas vacias y agrega productos.</p>
        )}
      </Modal>
    );
  }

  // ============ CERRADO ============
  function renderCerrado() {
    const pendingOrders = purchaseOrders.filter((o) => CERRADO_PENDING_STATUSES.includes(o.status));
    const historyOrders = purchaseOrders.filter((o) => CERRADO_HISTORY_STATUSES.includes(o.status));
    const source = cerradoViewTab === "history" ? historyOrders : pendingOrders;
    const filtered = source.filter((o) => !q || [o.folio, o.clientName].join(" ").toLowerCase().includes(q));
    return (
      <>
        <TabHeader title="Cierre de pedidos" subtitle="Pendientes: por cerrar. Historial: cerradas y canceladas." />
        <ViewTabs
          active={cerradoViewTab}
          onChange={setCerradoViewTab}
          tabs={[
            { id: "pending", label: "Pendientes", count: pendingOrders.length },
            { id: "history", label: "Historial", count: historyOrders.length },
          ]}
        />
        {filtered.length ? (
          <div className="retail-oc-grid">
            {filtered.map((order) => (
              <OcCard
                key={order.id}
                order={order}
                onClick={(cerradoViewTab === "pending" || order.status === RETAIL_PO_STATUS.CLOSED)
                  ? () => { setClosePoId(order.id); setPalletBoxes([]); }
                  : undefined}
                readonly={cerradoViewTab === "history" && order.status !== RETAIL_PO_STATUS.CLOSED}
              />
            ))}
          </div>
        ) : (
          <article className="surface-card retail-empty-state">
            <FileText size={28} />
            <p>{cerradoViewTab === "history" ? "Sin ordenes cerradas en historial." : "No hay ordenes pendientes de cierre."}</p>
          </article>
        )}
      </>
    );
  }

  function renderCloseModal() {
    if (!closeOrder) return null;
    return (
      <Modal
        open={Boolean(closeOrder)}
        title={`Cierre - ${closeOrder.folio}`}
        onClose={() => setClosePoId("")}
        onConfirm={async () => { await runMutation(retailApi.approveClosing({ purchaseOrderId: closeOrder.id })); }}
        confirmLabel="Aprobar cierre"
        confirmDisabled={!can("approveRetailClosing") || closeOrder.status === RETAIL_PO_STATUS.CLOSED}
        className="retail-modal retail-modal--wide"
      >
        <p className="retail-close-meta">Cliente: <strong>{closeOrder.clientName}</strong> - Las etiquetas se generan con el diseno de huella del cliente y los datos reales de cada linea/OC.</p>
        <div className="table-wrap">
          <table className="data-table retail-data-table">
            <thead><tr><th>Producto</th><th>Surtido</th><th>Lote</th><th>Checklist</th><th>Etiquetas</th></tr></thead>
            <tbody>
              {closeOrder.lines.map((line) => (
                <tr key={line.id}>
                  <td><strong>{line.productCode}</strong><div className="subtle-line">{line.productName}</div></td>
                  <td>{line.qtyPicked}/{line.qtyOrdered}</td>
                  <td>{line.lot || "-"}</td>
                  <td><input type="checkbox" checked={line.checklistOk === true} disabled={!can("manageRetailClosing")} onChange={(e) => runMutation(retailApi.updateClosingChecklist({ purchaseOrderId: closeOrder.id, lineId: line.id, checklistOk: e.target.checked }))} /></td>
                  <td>
                    {closeOrder.status === RETAIL_PO_STATUS.CLOSED ? (
                      <div className="retail-actions-row">
                        <button type="button" className="icon-button sm-button" disabled={!can("printRetailLabels")} onClick={() => printProductLabel(closeOrder, line, false)}><Printer size={13} /> Producto</button>
                        <button type="button" className="icon-button sm-button" disabled={!can("reprintRetailLabels")} onClick={() => printProductLabel(closeOrder, line, true)}>Reimprimir</button>
                      </div>
                    ) : <span className="subtle-line">Disponible al cerrar</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <hr className="retail-divider" />
        <h3>Cajas armadas</h3>
        {(closeOrder.boxes || []).length ? (
          <ul className="retail-pallet-list">
            {(closeOrder.boxes || []).map((box) => {
              const pieces = (box.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
              return (
                <li key={box.id}>
                  <span><strong>{box.folio}</strong> - {(box.items || []).length} prod. / {pieces} pzs</span>
                  {closeOrder.status === RETAIL_PO_STATUS.CLOSED ? (
                    <button type="button" className="icon-button sm-button" disabled={!can("printRetailLabels")} onClick={() => printBoxLabel(closeOrder, box)}><Printer size={13} /> Etiqueta caja</button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : <p className="subtle-line">No hay cajas armadas. Arma las cajas desde el surtido.</p>}

        <hr className="retail-divider" />
        <h3>Tarima (agrupa cajas armadas)</h3>
        {(closeOrder.boxes || []).length ? (
          <>
            <div className="retail-box-select">
              {(closeOrder.boxes || []).map((box) => {
                const checked = palletBoxes.includes(box.id);
                return (
                  <label key={box.id} className={`retail-box-chip ${checked ? "on" : ""}`}>
                    <input type="checkbox" checked={checked} onChange={(e) => setPalletBoxes((prev) => e.target.checked ? [...prev, box.id] : prev.filter((id) => id !== box.id))} />
                    {box.folio}
                  </label>
                );
              })}
            </div>
            <button type="button" className="secondary-button" disabled={!can("manageRetailClosing") || !palletBoxes.length} onClick={async () => { await runMutation(retailApi.closePallet({ purchaseOrderId: closeOrder.id, boxIds: palletBoxes })); setPalletBoxes([]); }}>Cerrar tarima con {palletBoxes.length} caja(s)</button>
          </>
        ) : <p className="subtle-line">Primero arma las cajas en el surtido.</p>}
        <ul className="retail-pallet-list">
          {(closeOrder.pallets || []).map((pal) => (
            <li key={pal.id}>
              <span>{pal.folio} ({pal.boxIds?.length || 0} cajas)</span>
              {closeOrder.status === RETAIL_PO_STATUS.CLOSED ? (
                <button type="button" className="icon-button sm-button" disabled={!can("printRetailLabels")} onClick={() => printPalletLabel(closeOrder, pal)}><Printer size={13} /> Etiqueta tarima</button>
              ) : null}
            </li>
          ))}
        </ul>
      </Modal>
    );
  }

  // ============ PREARMADO ============
  function renderPrearmado() {
    return (
      <>
        <TabHeader
          title="Prearmado de cajas"
          subtitle="Descuenta inventario al crear la caja. En surtido veras el contador de cajas por producto."
          actions={can("manageRetailPreassembly") ? (
            <button type="button" className="primary-button" disabled={!products.length} onClick={() => setPrearmModal(true)}>
              <Plus size={15} /> Nueva caja
            </button>
          ) : null}
        />
        <article className="surface-card retail-panel-card">
          <div className="table-wrap">
            <table className="data-table retail-data-table">
              <thead><tr><th>Producto</th><th>Lote</th><th>Piezas</th><th>Estado</th></tr></thead>
              <tbody>
                {preassembledBoxes.length ? preassembledBoxes.map((box) => (
                  <tr key={box.id}>
                    <td><strong>{box.productCode}</strong><div className="subtle-line">{box.productName}</div></td>
                    <td>{box.lot || "-"}</td>
                    <td>{box.qtyPieces}</td>
                    <td><span className={`retail-status-badge ${box.status === "available" ? "ok" : ""}`}>{box.status}</span></td>
                  </tr>
                )) : <RetailEmptyRow colSpan={4} message="Sin cajas prearmadas." />}
              </tbody>
            </table>
          </div>
        </article>
      </>
    );
  }

  // ============ INCIDENCIAS ============
  function renderIncidencias() {
    const typeLabel = (t) => INCIDENT_TYPES.find((x) => x.id === String(t).toLowerCase())?.label || t;
    const folioOf = (poId) => purchaseOrders.find((o) => o.id === poId)?.folio || "-";
    const pendingIncidents = incidents.filter((inc) => !inc.resolved);
    const historyIncidents = incidents.filter((inc) => inc.resolved);
    const source = incidenciasViewTab === "history" ? historyIncidents : pendingIncidents;
    const filtered = source.filter((inc) => !q || [inc.description, typeLabel(inc.type), folioOf(inc.purchaseOrderId)].join(" ").toLowerCase().includes(q));
    return (
      <>
        <TabHeader
          title="Incidencias"
          subtitle="Pendientes: abiertas. Historial: resueltas. Puedes editar, resolver o eliminar."
          actions={can("manageRetailIncidents") ? (
            <button type="button" className="primary-button" onClick={openNewIncident}>
              <Plus size={15} /> Registrar incidencia
            </button>
          ) : null}
        />
        <ViewTabs
          active={incidenciasViewTab}
          onChange={setIncidenciasViewTab}
          tabs={[
            { id: "pending", label: "Pendientes", count: pendingIncidents.length },
            { id: "history", label: "Historial", count: historyIncidents.length },
          ]}
        />
        <article className="surface-card retail-panel-card">
          <div className="retail-panel-toolbar"><SearchBox value={search} onChange={setSearch} /></div>
          <div className="table-wrap retail-table-scroll">
            <table className="data-table retail-data-table">
              <thead><tr><th>Tipo</th><th>Descripcion</th><th>OC</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {filtered.length ? filtered.map((inc) => (
                  <tr key={inc.id}>
                    <td><span className="retail-status-badge warn">{typeLabel(inc.type)}</span></td>
                    <td>{inc.description || "-"}</td>
                    <td>{folioOf(inc.purchaseOrderId)}</td>
                    <td>{inc.resolved ? <span className="retail-status-badge ok">Resuelta</span> : <span className="retail-status-badge">Abierta</span>}</td>
                    <td>
                      {can("manageRetailIncidents") ? (
                        <div className="retail-actions-row">
                          {incidenciasViewTab === "pending" ? (
                            <button type="button" className="icon-button sm-button" onClick={() => toggleIncidentResolved(inc)}>Resolver</button>
                          ) : (
                            <button type="button" className="icon-button sm-button" onClick={() => toggleIncidentResolved(inc)}>Reabrir</button>
                          )}
                          <button type="button" className="icon-button sm-button" onClick={() => openEditIncident(inc)}><Pencil size={13} /> Editar</button>
                          <button type="button" className="icon-button sm-button danger" onClick={() => deleteIncident(inc)}><Trash2 size={13} /> Borrar</button>
                        </div>
                      ) : "-"}
                    </td>
                  </tr>
                )) : <RetailEmptyRow colSpan={5} message={incidenciasViewTab === "history" ? "Sin incidencias resueltas." : "Sin incidencias abiertas."} />}
              </tbody>
            </table>
          </div>
        </article>
      </>
    );
  }

  const panelByTab = {
    dashboard: () => (
      <RetailDashboard
        retail={retail}
        purchaseOrders={purchaseOrders}
        products={products}
        printLog={printLog}
        incidents={incidents}
        users={users}
        can={can}
        onGoTab={goRetailTab}
      />
    ),
    inventario: renderInventario,
    clientes: renderClientes,
    "ordenes-compra": renderOrdenes,
    surtido: renderSurtido,
    cerrado: renderCerrado,
    prearmado: renderPrearmado,
    incidencias: renderIncidencias,
  };

  const renderPanel = panelByTab[navRetailTab] || panelByTab.dashboard;

  return (
    <section className="retail-workspace">
      {renderPanel()}
      {renderPickModal()}
      {renderCloseModal()}

      <Modal
        open={productModal}
        title={invForm.id ? "Editar producto" : "Nuevo producto"}
        onClose={() => { setProductModal(false); setInvForm(emptyInvForm); }}
        onConfirm={saveProduct}
        confirmLabel={invForm.id ? "Guardar cambios" : "Guardar producto"}
        confirmDisabled={!invForm.code || !invForm.name}
        className="retail-modal"
      >
        <div className="retail-modal-grid">
          <label><span>Codigo / EAN *</span><input value={invForm.code} onChange={(e) => setInvForm((f) => ({ ...f, code: e.target.value }))} /></label>
          <label><span>Nombre *</span><input value={invForm.name} onChange={(e) => setInvForm((f) => ({ ...f, name: e.target.value }))} /></label>
          <label><span>Presentacion</span><input value={invForm.presentation} onChange={(e) => setInvForm((f) => ({ ...f, presentation: e.target.value }))} /></label>
          <label><span>Etiqueta</span><input value={invForm.labelTag} onChange={(e) => setInvForm((f) => ({ ...f, labelTag: e.target.value }))} /></label>
          <label><span>Piezas por caja</span><input type="number" min="1" value={invForm.piecesPerBox} onChange={(e) => setInvForm((f) => ({ ...f, piecesPerBox: e.target.value }))} /></label>
          {!invForm.id ? (
            <>
              <label><span>Lote inicial</span><input value={invForm.lot} onChange={(e) => setInvForm((f) => ({ ...f, lot: e.target.value }))} /></label>
              <label><span>Caducidad</span><input type="date" value={invForm.expiry} onChange={(e) => setInvForm((f) => ({ ...f, expiry: e.target.value }))} /></label>
              <label><span>Piezas iniciales</span><input type="number" min="0" value={invForm.qty} onChange={(e) => setInvForm((f) => ({ ...f, qty: e.target.value }))} /></label>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={lotModal}
        title="Editar lote"
        onClose={() => { setLotModal(false); setLotForm(emptyLotForm); }}
        onConfirm={saveLot}
        confirmLabel="Guardar lote"
        confirmDisabled={!lotForm.lotId}
        className="retail-modal"
      >
        <div className="retail-modal-grid">
          <label><span>Lote *</span><input value={lotForm.lot} onChange={(e) => setLotForm((f) => ({ ...f, lot: e.target.value }))} /></label>
          <label><span>Etiqueta</span><input value={lotForm.etiqueta} onChange={(e) => setLotForm((f) => ({ ...f, etiqueta: e.target.value }))} /></label>
          <label><span>Caducidad</span><input type="date" value={lotForm.expiry} onChange={(e) => setLotForm((f) => ({ ...f, expiry: e.target.value }))} /></label>
          <label><span>Piezas</span><input type="number" min="0" value={lotForm.qty} onChange={(e) => setLotForm((f) => ({ ...f, qty: e.target.value }))} /></label>
        </div>
      </Modal>

      <Modal
        open={clientModal}
        title={clientForm.id ? "Cliente y diseno de huellas" : "Nuevo cliente y diseno de huellas"}
        onClose={() => { setClientModal(false); setClientForm(emptyClientForm); }}
        onConfirm={saveClient}
        confirmLabel={clientForm.id ? "Guardar cambios" : "Guardar cliente"}
        confirmDisabled={!clientForm.name}
        className="retail-modal retail-modal--designer"
      >
        {clientForm.designs ? (
          <RetailHuellaDesigner
            designs={clientForm.designs}
            client={{ name: clientForm.name, code: clientForm.code }}
            onClientChange={(field, value) => setClientForm((f) => ({ ...f, [field]: value }))}
            onChange={(kind, elements) => setClientForm((f) => ({ ...f, designs: { ...f.designs, [kind]: elements } }))}
          />
        ) : null}
      </Modal>

      <Modal
        open={ocModal}
        title="Nueva orden de compra"
        onClose={() => { setOcModal(false); setOcLines([]); }}
        onConfirm={createOrder}
        confirmLabel="Crear OC"
        confirmDisabled={!ocClientId || !ocLines.length}
        className="retail-modal retail-modal--wide"
      >
        <div className="retail-modal-grid">
          <label><span>Cliente *</span>
            <select value={ocClientId} onChange={(e) => setOcClientId(e.target.value)}>
              <option value="">Seleccionar</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <hr className="retail-divider" />
        <div className="retail-modal-grid">
          <label className="retail-field-wide"><span>Producto</span>
            <select value={ocProductId} onChange={(e) => setOcProductId(e.target.value)}>
              <option value="">Seleccionar</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name} (stock {p.stockPieces})</option>)}
            </select>
          </label>
          <label><span>Cantidad</span><input type="number" min="1" value={ocQty} onChange={(e) => setOcQty(e.target.value)} /></label>
        </div>
        <button type="button" className="secondary-button" disabled={!ocProductId} onClick={() => {
          const p = products.find((x) => x.id === ocProductId);
          if (!p) return;
          setOcLines((lines) => [...lines, { productId: p.id, productCode: p.code, productName: p.name, qtyOrdered: Number(ocQty) || 1 }]);
          setOcProductId("");
          setOcQty("1");
        }}><Plus size={14} /> Agregar linea</button>
        {ocLines.length ? (
          <table className="data-table retail-data-table" style={{ marginTop: "0.85rem" }}>
            <thead><tr><th>Producto</th><th>Cantidad</th><th /></tr></thead>
            <tbody>
              {ocLines.map((line, i) => (
                <tr key={`${line.productId}-${i}`}>
                  <td>{line.productCode} - {line.productName}</td>
                  <td>{line.qtyOrdered}</td>
                  <td><button type="button" className="icon-button sm-button" onClick={() => setOcLines((l) => l.filter((_, idx) => idx !== i))}>Quitar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="subtle-line" style={{ marginTop: "0.5rem" }}>Agrega al menos una linea de producto.</p>}
      </Modal>

      <Modal
        open={prearmModal}
        title="Nueva caja prearmada"
        onClose={() => setPrearmModal(false)}
        onConfirm={createPreBox}
        confirmLabel="Crear caja"
        confirmDisabled={!preForm.productId || !(Number(preForm.qtyPieces) > 0)}
        className="retail-modal"
      >
        <div className="retail-modal-grid">
          <label className="retail-field-wide"><span>Producto *</span>
            <select value={preForm.productId} onChange={(e) => setPreForm((f) => ({ ...f, productId: e.target.value }))}>
              <option value="">Seleccionar</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name} (stock {p.stockPieces})</option>)}
            </select>
          </label>
          <label><span>Lote</span><input value={preForm.lot} onChange={(e) => setPreForm((f) => ({ ...f, lot: e.target.value }))} /></label>
          <label><span>Caducidad</span><input type="date" value={preForm.expiry} onChange={(e) => setPreForm((f) => ({ ...f, expiry: e.target.value }))} /></label>
          <label><span>Piezas en caja *</span><input type="number" min="1" value={preForm.qtyPieces} onChange={(e) => setPreForm((f) => ({ ...f, qtyPieces: e.target.value }))} /></label>
        </div>
      </Modal>

      <Modal
        open={incidentModal}
        title={incidentForm.id ? "Editar incidencia" : "Registrar incidencia"}
        onClose={() => { setIncidentModal(false); setIncidentForm(emptyIncidentForm); }}
        onConfirm={saveIncident}
        confirmLabel={incidentForm.id ? "Guardar cambios" : "Registrar"}
        confirmDisabled={!incidentForm.description}
        className="retail-modal"
      >
        <div className="retail-modal-grid">
          <label><span>Tipo</span>
            <select value={incidentForm.type} onChange={(e) => setIncidentForm((f) => ({ ...f, type: e.target.value }))}>
              {INCIDENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label><span>Orden de compra</span>
            <select value={incidentForm.purchaseOrderId} onChange={(e) => setIncidentForm((f) => ({ ...f, purchaseOrderId: e.target.value }))}>
              <option value="">Sin OC</option>
              {purchaseOrders.map((o) => <option key={o.id} value={o.id}>{o.folio} - {o.clientName}</option>)}
            </select>
          </label>
          <label className="retail-field-wide"><span>Descripcion *</span>
            <textarea rows={3} value={incidentForm.description} onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
        </div>
      </Modal>
    </section>
  );
}
