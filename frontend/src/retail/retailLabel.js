export const LABEL_KINDS = [
  { id: "producto", label: "Producto" },
  { id: "caja", label: "Caja" },
  { id: "tarima", label: "Tarima" },
];

export const LABEL_SIZE = { widthMm: 100, heightMm: 150 };

export const DATA_SOURCES = [
  { id: "static", label: "Texto fijo" },
  { id: "client.name", label: "Nombre cliente" },
  { id: "client.code", label: "Codigo cliente" },
  { id: "product.code", label: "Codigo / EAN producto" },
  { id: "product.name", label: "Nombre producto" },
  { id: "lot", label: "Lote" },
  { id: "expiry", label: "Caducidad" },
  { id: "qty", label: "Cantidad piezas" },
  { id: "sscc", label: "SSCC (tarima)" },
  { id: "po", label: "Folio OC" },
  { id: "date", label: "Fecha" },
];

export const BARCODE_FORMATS = ["EAN13", "UPC", "ITF14", "CODE128", "GS1-128", "QR"];

// Fuentes a nivel de item dentro de una lista (contenido de la caja / tarima)
export const ITEM_SOURCES = [
  { id: "item.code", label: "Codigo del item" },
  { id: "item.name", label: "Nombre del item" },
  { id: "item.qty", label: "Cantidad del item" },
  { id: "item.lot", label: "Lote del item" },
  { id: "item.sscc", label: "SSCC / folio del item" },
];

// Items de muestra para la vista previa del elemento lista
export function sampleItems(kind) {
  if (kind === "tarima") {
    return [
      { code: "CJ-1", name: "Caja 1", qty: 3, sscc: "00750123450000000018", lot: "" },
      { code: "CJ-2", name: "Caja 2", qty: 2, sscc: "00750123450000000025", lot: "" },
      { code: "CJ-3", name: "Caja 3", qty: 4, sscc: "00750123450000000032", lot: "" },
    ];
  }
  return [
    { code: "7501234567890", name: "Producto A 200 Caps", qty: 12, lot: "L2601", sscc: "" },
    { code: "7501111111118", name: "Producto B 300 Caps", qty: 6, lot: "L7788", sscc: "" },
    { code: "7502222222225", name: "Producto C 100 Caps", qty: 24, lot: "L9001", sscc: "" },
  ];
}

export function resolveItemValue(source, item = {}) {
  switch (source) {
    case "item.code": return item.code || "";
    case "item.name": return item.name || "";
    case "item.qty": return item.qty != null ? String(item.qty) : "";
    case "item.lot": return item.lot || "";
    case "item.sscc": return item.sscc || "";
    default: return "";
  }
}

const SAMPLE_DATA = {
  "product.code": "7501234567890",
  "product.name": "PRODUCTO EJEMPLO 200 CAPS",
  lot: "L2601",
  expiry: "2027-09-01",
  qty: "480",
  sscc: "00750123450000000018",
  po: "OC-000123",
  date: "2026-05-29",
};

export function sampleValue(source, client = {}) {
  if (source === "static") return "";
  if (source === "client.name") return client.name || "WALMART DE MEXICO";
  if (source === "client.code") return client.code || "CLI-WMT";
  return SAMPLE_DATA[source] ?? "";
}

let counter = 0;
function newId() {
  counter += 1;
  return `el-${Date.now().toString(36)}-${counter}`;
}

export function newListElement(kind) {
  const isPallet = kind === "tarima";
  return {
    id: newId(),
    type: "list",
    x: 6,
    y: 70,
    w: 88,
    h: 70,
    rowHeight: 16,
    textSource: isPallet ? "item.code" : "item.name",
    textPrefix: "",
    fontSize: 9,
    bold: false,
    align: "left",
    showBarcode: true,
    barcodeSource: isPallet ? "item.sscc" : "item.code",
    barcodeFormat: isPallet ? "GS1-128" : "EAN13",
    barcodeHeight: 10,
  };
}

export function defaultElements(kind) {
  if (kind === "tarima") {
    return [
      { id: newId(), type: "text", x: 6, y: 5, w: 88, fontSize: 17, bold: true, align: "left", source: "client.name", text: "" },
      { id: newId(), type: "text", x: 6, y: 18, w: 88, fontSize: 10, bold: false, align: "left", source: "static", text: "ETIQUETA LOGISTICA DE TARIMA" },
      { id: newId(), type: "text", x: 6, y: 28, w: 44, fontSize: 11, bold: false, align: "left", source: "po", text: "OC: " },
      { id: newId(), type: "text", x: 52, y: 28, w: 42, fontSize: 11, bold: false, align: "left", source: "qty", text: "Pzs: " },
      { id: newId(), type: "text", x: 6, y: 37, w: 88, fontSize: 9, bold: true, align: "left", source: "static", text: "Cajas en esta tarima:" },
      { id: newId(), type: "list", x: 6, y: 45, w: 88, h: 70, rowHeight: 16, textSource: "item.code", textPrefix: "", fontSize: 9, bold: false, align: "left", showBarcode: true, barcodeSource: "item.sscc", barcodeFormat: "GS1-128", barcodeHeight: 9 },
    ];
  }
  if (kind === "caja") {
    return [
      { id: newId(), type: "text", x: 6, y: 5, w: 88, fontSize: 15, bold: true, align: "left", source: "client.name", text: "" },
      { id: newId(), type: "text", x: 6, y: 17, w: 44, fontSize: 10, bold: false, align: "left", source: "po", text: "OC: " },
      { id: newId(), type: "text", x: 52, y: 17, w: 42, fontSize: 10, bold: false, align: "left", source: "date", text: "" },
      { id: newId(), type: "text", x: 6, y: 26, w: 88, fontSize: 9, bold: true, align: "left", source: "static", text: "Contenido de la caja:" },
      { id: newId(), type: "list", x: 6, y: 34, w: 88, h: 110, rowHeight: 18, textSource: "item.name", textPrefix: "", fontSize: 9, bold: false, align: "left", showBarcode: true, barcodeSource: "item.code", barcodeFormat: "EAN13", barcodeHeight: 10 },
    ];
  }
  return [
    { id: newId(), type: "text", x: 6, y: 6, w: 88, fontSize: 14, bold: true, align: "left", source: "product.name", text: "" },
    { id: newId(), type: "text", x: 6, y: 20, w: 88, fontSize: 10, bold: false, align: "left", source: "client.name", text: "" },
    { id: newId(), type: "barcode", x: 8, y: 34, w: 84, height: 28, source: "product.code", barcodeFormat: "EAN13", align: "center" },
  ];
}

export function newElement(type) {
  if (type === "barcode") {
    return { id: newId(), type: "barcode", x: 10, y: 10, w: 80, height: 28, source: "product.code", barcodeFormat: "EAN13", align: "center" };
  }
  if (type === "list") {
    return newListElement("caja");
  }
  return { id: newId(), type: "text", x: 10, y: 10, w: 80, fontSize: 12, bold: false, align: "left", source: "static", text: "Texto" };
}

export function primaryFormat(elements) {
  const bc = (elements || []).find((el) => el.type === "barcode");
  return bc?.barcodeFormat || "EAN13";
}

export const LABEL_CSV_HEADERS = ["elemento", "tipo", "valor", "origen", "codigo", "x", "y", "ancho", "alto", "tamano", "negrita", "alineacion"];

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function elementsToCsvRows(elements) {
  return (elements || []).map((el, i) => ({
    elemento: i + 1,
    tipo: el.type === "barcode" ? "codigo" : el.type === "list" ? "lista" : "texto",
    valor: el.type === "list" ? (el.textPrefix || "") : (el.text || ""),
    origen: el.type === "list" ? (el.textSource || "item.code") : (el.source || "static"),
    codigo: el.type === "barcode" ? (el.barcodeFormat || "CODE128") : el.type === "list" ? (el.barcodeFormat || "CODE128") : "",
    x: Math.round(el.x),
    y: Math.round(el.y),
    ancho: Math.round(el.w),
    alto: el.type === "barcode" ? Math.round(el.height || 28) : el.type === "list" ? Math.round(el.h || 70) : "",
    tamano: el.type === "barcode" ? "" : (el.fontSize || 12),
    negrita: el.bold ? "si" : "no",
    alineacion: el.align || "left",
  }));
}

export function csvRowsToElements(rows) {
  return (rows || []).map((r) => {
    const isCode = String(r.tipo || "").toLowerCase().startsWith("cod");
    const base = {
      id: newId(),
      x: num(r.x, 6),
      y: num(r.y, 6),
      w: num(r.ancho, 80),
      align: r.alineacion || "left",
      source: r.origen || "static",
      text: r.valor || "",
    };
    if (isCode) {
      return { ...base, type: "barcode", height: num(r.alto, 28), barcodeFormat: r.codigo || "CODE128" };
    }
    return { ...base, type: "text", fontSize: num(r.tamano, 12), bold: String(r.negrita || "").toLowerCase() === "si" };
  }).filter((el) => el.type === "text" || el.type === "barcode");
}
