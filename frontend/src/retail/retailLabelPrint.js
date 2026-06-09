import { loadJsPdf } from "../utils/jspdfLoader.js";
import { loadJsBarcode, loadQRCode } from "./barcodeLoader.js";

const JSBARCODE_FORMAT = {
  EAN13: "EAN13",
  "EAN-13": "EAN13",
  EAN: "EAN13",
  UPC: "UPC",
  ITF14: "ITF14",
  ITF: "ITF",
  CODE128: "CODE128",
  "GS1-128": "CODE128",
};

function sanitize(value, fmt) {
  const v = String(value ?? "");
  if (fmt === "EAN13") return v.replace(/\D/g, "").padEnd(12, "0").slice(0, 12) || "000000000000";
  if (fmt === "UPC") return v.replace(/\D/g, "").padEnd(11, "0").slice(0, 11) || "00000000000";
  if (fmt === "ITF14") return v.replace(/\D/g, "").padEnd(13, "0").slice(0, 13) || "0000000000000";
  return v || "000";
}

function resolveItemValue(source, item = {}) {
  switch (source) {
    case "item.code": return item.code || "";
    case "item.name": return item.name || "";
    case "item.qty": return item.qty != null ? String(item.qty) : "";
    case "item.lot": return item.lot || "";
    case "item.sscc": return item.sscc || "";
    default: return "";
  }
}

export function resolveLabelValue(source, ctx = {}) {
  switch (source) {
    case "static": return "";
    case "client.name": return ctx.clientName || "";
    case "client.code": return ctx.clientCode || "";
    case "product.code": return ctx.productCode || "";
    case "product.name": return ctx.productName || "";
    case "lot": return ctx.lot || "";
    case "expiry": return ctx.expiry || "";
    case "qty": return ctx.qty != null ? String(ctx.qty) : "";
    case "sscc": return ctx.sscc || "";
    case "po": return ctx.po || "";
    case "date": return ctx.date || "";
    default: return "";
  }
}

async function barcodeDataUrl(el, value) {
  const isQr = String(el.barcodeFormat).toUpperCase() === "QR";
  if (isQr) {
    const QRCode = await loadQRCode();
    return QRCode.toDataURL(String(value || " "), { margin: 0, width: 320 });
  }
  const JsBarcode = await loadJsBarcode();
  const fmt = JSBARCODE_FORMAT[el.barcodeFormat] || "CODE128";
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, sanitize(value, fmt), { format: fmt, displayValue: true, height: 130, width: 2, margin: 0, fontSize: 30, background: "#ffffff" });
  } catch {
    try {
      JsBarcode(canvas, String(value || "000"), { format: "CODE128", height: 130, width: 2, margin: 0, fontSize: 30, background: "#ffffff" });
    } catch {
      return "";
    }
  }
  return canvas.toDataURL("image/png");
}

export async function buildHuellaPdf(elements, ctx = {}, size = { widthMm: 100, heightMm: 150 }) {
  const jsPDF = await loadJsPdf();
  const widthMm = size.widthMm || 100;
  const heightMm = size.heightMm || 150;
  const doc = new jsPDF({ unit: "mm", format: [widthMm, heightMm], orientation: heightMm >= widthMm ? "portrait" : "landscape" });

  for (const el of elements || []) {
    if (el.type === "text") {
      const value = `${el.text || ""}${resolveLabelValue(el.source, ctx)}`;
      if (!value) continue;
      const fontSize = el.fontSize || 12;
      doc.setFont("helvetica", el.bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      const align = el.align || "left";
      const tx = align === "center" ? el.x + el.w / 2 : align === "right" ? el.x + el.w : el.x;
      doc.text(String(value), tx, el.y + fontSize * 0.34, { align, maxWidth: el.w });
    } else if (el.type === "barcode") {
      const value = el.source === "static" ? (el.text || "") : resolveLabelValue(el.source, ctx);
      const url = await barcodeDataUrl(el, value);
      if (url) doc.addImage(url, "PNG", el.x, el.y, el.w, el.height || 28);
    } else if (el.type === "list") {
      const items = Array.isArray(ctx.items) ? ctx.items : [];
      const n = Math.max(1, items.length);
      const baseRow = el.rowHeight || 16;
      const rowH = Math.min(baseRow, el.h / n);
      const ratio = rowH / baseRow;
      const fontSize = Math.max(4, (el.fontSize || 9) * ratio);
      const bcH = Math.max(3, (el.barcodeHeight || 10) * ratio);
      for (let i = 0; i < items.length; i += 1) {
        const it = items[i];
        const rowTop = el.y + i * rowH;
        let cursorY = rowTop + fontSize * 0.34 + 0.5;
        const qtySuffix = el.textSource !== "item.qty" && it.qty ? `  x${it.qty}` : "";
        const text = `${el.textPrefix || ""}${resolveItemValue(el.textSource, it)}${qtySuffix}`;
        if (text) {
          doc.setFont("helvetica", el.bold ? "bold" : "normal");
          doc.setFontSize(fontSize);
          const align = el.align || "left";
          const tx = align === "center" ? el.x + el.w / 2 : align === "right" ? el.x + el.w : el.x;
          doc.text(String(text), tx, cursorY, { align, maxWidth: el.w });
          cursorY += 1;
        }
        if (el.showBarcode) {
          const bcValue = resolveItemValue(el.barcodeSource, it) || it.code;
          const url = await barcodeDataUrl({ barcodeFormat: el.barcodeFormat }, bcValue);
          if (url) doc.addImage(url, "PNG", el.x, cursorY, el.w, Math.max(3, Math.min(bcH, rowTop + rowH - cursorY)));
        }
      }
    }
  }
  return doc;
}

export async function printHuellaLabel(elements, ctx = {}, size) {
  const doc = await buildHuellaPdf(elements, ctx, size);
  const url = doc.output("bloburl");
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      try { win.focus(); win.print(); } catch { /* ignore */ }
    });
  }
}
