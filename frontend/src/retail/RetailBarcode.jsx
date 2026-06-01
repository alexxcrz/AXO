import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

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

export default function RetailBarcode({ value, format = "CODE128", width = 200, height = 60 }) {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const isQr = String(format).toUpperCase() === "QR";

  useEffect(() => {
    if (isQr || !svgRef.current) return;
    const fmt = JSBARCODE_FORMAT[format] || "CODE128";
    try {
      JsBarcode(svgRef.current, sanitize(value, fmt), {
        format: fmt,
        displayValue: true,
        height: Math.max(18, height - 16),
        width: 2,
        margin: 0,
        fontSize: 11,
        background: "#ffffff",
      });
    } catch {
      try {
        JsBarcode(svgRef.current, String(value || "000"), { format: "CODE128", height: Math.max(18, height - 16), width: 2, margin: 0, fontSize: 11, background: "#ffffff" });
      } catch {
        /* ignore */
      }
    }
  }, [value, format, height, isQr]);

  useEffect(() => {
    if (!isQr || !canvasRef.current) return;
    const side = Math.max(40, Math.min(width, height));
    QRCode.toCanvas(canvasRef.current, String(value || " "), { width: side, margin: 0 }, () => {});
  }, [value, width, height, isQr]);

  if (isQr) return <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "100%" }} />;
  return <svg ref={svgRef} style={{ maxWidth: "100%", maxHeight: "100%" }} />;
}
