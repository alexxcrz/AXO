import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, Trash2, Type, Barcode as BarcodeIcon } from "lucide-react";
import RetailBarcode from "./RetailBarcode.jsx";
import { downloadCsv } from "./retailCsv.js";
import { List as ListIcon } from "lucide-react";
import {
  BARCODE_FORMATS,
  DATA_SOURCES,
  ITEM_SOURCES,
  LABEL_CSV_HEADERS,
  LABEL_KINDS,
  LABEL_SIZE,
  defaultElements,
  elementsToCsvRows,
  newElement,
  newListElement,
  resolveItemValue,
  sampleItems,
  sampleValue,
} from "./retailLabel.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeScale() {
  const h = typeof window !== "undefined" ? window.innerHeight : 900;
  return clamp((h * 0.74) / LABEL_SIZE.heightMm, 3.2, 6); // px per mm, fits the viewport height
}

function toNumber(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Vista previa del elemento lista: distribuye N items en la altura disponible.
// Si hay mas items, las filas se encogen proporcionalmente (auto-ajuste sin perder formato).
function ListPreview({ el, scale, items }) {
  const list = items && items.length ? items : [{ code: "�", name: "(sin items)", qty: "", lot: "", sscc: "" }];
  const n = list.length;
  const baseRow = el.rowHeight || 16;
  const rowH = Math.min(baseRow, el.h / n);
  const ratio = rowH / baseRow;
  const fontPx = Math.max(5, (el.fontSize || 9) * ratio) * (scale / 3);
  const bcH = Math.max(4, (el.barcodeHeight || 10) * ratio) * scale;
  return (
    <div style={{ height: el.h * scale, width: el.w * scale, overflow: "hidden" }}>
      {list.map((it, i) => (
        <div key={i} style={{ height: rowH * scale, display: "flex", flexDirection: "column", justifyContent: "center", borderBottom: "1px dashed rgba(15,23,42,0.12)" }}>
          <span style={{ fontSize: `${fontPx}px`, fontWeight: el.bold ? 700 : 400, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: el.align }}>
            {(el.textPrefix || "")}{resolveItemValue(el.textSource, it)}
            {el.textSource !== "item.qty" && it.qty ? `  x${it.qty}` : ""}
          </span>
          {el.showBarcode ? (
            <RetailBarcode value={resolveItemValue(el.barcodeSource, it) || it.code} format={el.barcodeFormat} width={el.w * scale} height={bcH} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function RetailHuellaDesigner({ designs, onChange, client, onClientChange }) {
  const [activeKind, setActiveKind] = useState("tarima");
  const [selectedId, setSelectedId] = useState("");
  const [SCALE, setScale] = useState(computeScale);
  const canvasRef = useRef(null);

  useEffect(() => {
    const onResize = () => setScale(computeScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const elements = designs?.[activeKind] || [];
  const selected = elements.find((el) => el.id === selectedId) || null;
  const W = LABEL_SIZE.widthMm;
  const H = LABEL_SIZE.heightMm;

  function setElements(next) {
    onChange(activeKind, next);
  }
  function updateEl(id, patch) {
    setElements(elements.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  }
  function addEl(type) {
    const el = type === "list" ? newListElement(activeKind) : newElement(type);
    setElements([...elements, el]);
    setSelectedId(el.id);
  }
  function removeEl(id) {
    setElements(elements.filter((el) => el.id !== id));
    setSelectedId("");
  }

  function startDrag(event, el) {
    event.preventDefault();
    setSelectedId(el.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const origX = el.x;
    const origY = el.y;
    function move(ev) {
      const dx = (ev.clientX - startX) / SCALE;
      const dy = (ev.clientY - startY) / SCALE;
      updateEl(el.id, { x: clamp(Math.round(origX + dx), 0, W - 4), y: clamp(Math.round(origY + dy), 0, H - 4) });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function elementText(el) {
    if (el.source === "static") return el.text || "";
    return `${el.text || ""}${sampleValue(el.source, client)}`;
  }
  function barcodeValue(el) {
    return el.source === "static" ? (el.text || "") : sampleValue(el.source, client);
  }

  return (
    <div className="rhd">
      <div className="rhd-head">
        <label className="rhd-client"><span>Cliente *</span>
          <input value={client?.name || ""} onChange={(e) => onClientChange?.("name", e.target.value)} />
        </label>
        <label className="rhd-client"><span>Codigo</span>
          <input value={client?.code || ""} onChange={(e) => onClientChange?.("code", e.target.value)} placeholder="EAN / SKU" />
        </label>
        <div className="rhd-tabs">
          {LABEL_KINDS.map((k) => (
            <button key={k.id} type="button" className={activeKind === k.id ? "active" : ""} onClick={() => { setActiveKind(k.id); setSelectedId(""); }}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="rhd-toolbar">
          <button type="button" className="icon-button sm-button" onClick={() => addEl("text")}><Type size={14} /> Texto</button>
          <button type="button" className="icon-button sm-button" onClick={() => addEl("barcode")}><BarcodeIcon size={14} /> Codigo</button>
          <button type="button" className="icon-button sm-button" onClick={() => addEl("list")}><ListIcon size={14} /> Lista</button>
          <span className="rhd-toolbar-sep" />
          <button type="button" className="icon-button sm-button" onClick={() => downloadCsv(`huella-${activeKind}.csv`, LABEL_CSV_HEADERS, elementsToCsvRows(elements))}><Download size={14} /> Exportar CSV</button>
          <button type="button" className="icon-button sm-button" onClick={() => { setElements(defaultElements(activeKind)); setSelectedId(""); }}><RotateCcw size={14} /> Restablecer</button>
        </div>
      </div>

      <div className="rhd-body">
        <div className="rhd-stage">
          <div
            ref={canvasRef}
            className="rhd-canvas"
            style={{ width: W * SCALE, height: H * SCALE }}
            onPointerDown={(e) => { if (e.target === canvasRef.current) setSelectedId(""); }}
          >
            {elements.map((el) => (
              <div
                key={el.id}
                className={`rhd-el ${selectedId === el.id ? "sel" : ""}`}
                style={{ left: el.x * SCALE, top: el.y * SCALE, width: el.w * SCALE, textAlign: el.align }}
                onPointerDown={(e) => startDrag(e, el)}
              >
                {el.type === "text" ? (
                  <span style={{ fontSize: `${(el.fontSize || 12) * (SCALE / 3)}px`, fontWeight: el.bold ? 700 : 400, lineHeight: 1.1 }}>
                    {elementText(el) || "Texto"}
                  </span>
                ) : el.type === "list" ? (
                  <ListPreview el={el} scale={SCALE} items={sampleItems(activeKind)} />
                ) : (
                  <div className="rhd-bc" style={{ height: (el.height || 28) * SCALE }}>
                    <RetailBarcode value={barcodeValue(el)} format={el.barcodeFormat} width={el.w * SCALE} height={(el.height || 28) * SCALE} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="subtle-line rhd-hint">Etiqueta {W} x {H} mm. Arrastra los elementos para acomodarlos. Datos de muestra; en la etiqueta real se llenan con el producto y la OC.</p>
        </div>

        <div className="rhd-props">
          {selected ? (
            <>
              <div className="rhd-props-head">
                <strong>{selected.type === "barcode" ? "Codigo de barras" : selected.type === "list" ? "Lista de contenido" : "Texto"}</strong>
                <button type="button" className="icon-button sm-button danger" onClick={() => removeEl(selected.id)}><Trash2 size={13} /> Eliminar</button>
              </div>
              {selected.type === "list" ? (
                <>
                  <p className="subtle-line" style={{ margin: "0 0 0.4rem" }}>
                    Se repite automaticamente por cada {activeKind === "tarima" ? "caja de la tarima" : "producto de la caja"}. Si hay mas elementos, las filas se ajustan solas.
                  </p>
                  <label className="rhd-field"><span>Texto de cada renglon</span>
                    <select value={selected.textSource} onChange={(e) => updateEl(selected.id, { textSource: e.target.value })}>
                      {ITEM_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </label>
                  <label className="rhd-field"><span>Prefijo</span>
                    <input value={selected.textPrefix || ""} onChange={(e) => updateEl(selected.id, { textPrefix: e.target.value })} placeholder="ej. Caja: " />
                  </label>
                  <div className="rhd-row">
                    <label className="rhd-field"><span>Tamano texto (pt)</span>
                      <input type="number" min="4" step="1" value={selected.fontSize} onChange={(e) => updateEl(selected.id, { fontSize: toNumber(e.target.value, selected.fontSize) })} />
                    </label>
                    <label className="rhd-field rhd-check"><span>Negrita</span>
                      <input type="checkbox" checked={!!selected.bold} onChange={(e) => updateEl(selected.id, { bold: e.target.checked })} />
                    </label>
                  </div>
                  <label className="rhd-field rhd-check"><span>Mostrar codigo de barras por renglon</span>
                    <input type="checkbox" checked={!!selected.showBarcode} onChange={(e) => updateEl(selected.id, { showBarcode: e.target.checked })} />
                  </label>
                  {selected.showBarcode ? (
                    <div className="rhd-row">
                      <label className="rhd-field"><span>Codigo del renglon</span>
                        <select value={selected.barcodeSource} onChange={(e) => updateEl(selected.id, { barcodeSource: e.target.value })}>
                          {ITEM_SOURCES.filter((s) => s.id === "item.code" || s.id === "item.sscc").map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </label>
                      <label className="rhd-field"><span>Formato</span>
                        <select value={selected.barcodeFormat} onChange={(e) => updateEl(selected.id, { barcodeFormat: e.target.value })}>
                          {BARCODE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </label>
                      <label className="rhd-field"><span>Alto codigo (mm)</span>
                        <input type="number" min="3" step="1" value={selected.barcodeHeight} onChange={(e) => updateEl(selected.id, { barcodeHeight: toNumber(e.target.value, selected.barcodeHeight) })} />
                      </label>
                    </div>
                  ) : null}
                  <div className="rhd-row">
                    <label className="rhd-field"><span>Alto renglon (mm)</span>
                      <input type="number" min="4" step="1" value={selected.rowHeight} onChange={(e) => updateEl(selected.id, { rowHeight: toNumber(e.target.value, selected.rowHeight) })} />
                    </label>
                    <label className="rhd-field"><span>Alto total (mm)</span>
                      <input type="number" min="6" step="1" value={selected.h} onChange={(e) => updateEl(selected.id, { h: toNumber(e.target.value, selected.h) })} />
                    </label>
                  </div>
                  <div className="rhd-row">
                    <label className="rhd-field"><span>Ancho (mm)</span>
                      <input type="number" min="2" step="1" value={selected.w} onChange={(e) => updateEl(selected.id, { w: toNumber(e.target.value, selected.w) })} />
                    </label>
                    <label className="rhd-field"><span>X (mm)</span>
                      <input type="number" step="1" value={selected.x} onChange={(e) => updateEl(selected.id, { x: toNumber(e.target.value, selected.x) })} />
                    </label>
                    <label className="rhd-field"><span>Y (mm)</span>
                      <input type="number" step="1" value={selected.y} onChange={(e) => updateEl(selected.id, { y: toNumber(e.target.value, selected.y) })} />
                    </label>
                  </div>
                </>
              ) : (
              <>
              <label className="rhd-field"><span>Origen del dato</span>
                <select value={selected.source} onChange={(e) => updateEl(selected.id, { source: e.target.value })}>
                  {DATA_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="rhd-field"><span>{selected.source === "static" ? "Texto" : "Prefijo (ej. \"Lote: \")"}</span>
                <input value={selected.text || ""} onChange={(e) => updateEl(selected.id, { text: e.target.value })} />
              </label>
              {selected.type === "text" ? (
                <div className="rhd-row">
                  <label className="rhd-field"><span>Tamano (pt)</span>
                    <input type="number" min="4" step="1" value={selected.fontSize} onChange={(e) => updateEl(selected.id, { fontSize: toNumber(e.target.value, selected.fontSize) })} />
                  </label>
                  <label className="rhd-field"><span>Alineacion</span>
                    <select value={selected.align} onChange={(e) => updateEl(selected.id, { align: e.target.value })}>
                      <option value="left">Izquierda</option>
                      <option value="center">Centro</option>
                      <option value="right">Derecha</option>
                    </select>
                  </label>
                  <label className="rhd-field rhd-check"><span>Negrita</span>
                    <input type="checkbox" checked={!!selected.bold} onChange={(e) => updateEl(selected.id, { bold: e.target.checked })} />
                  </label>
                </div>
              ) : (
                <div className="rhd-row">
                  <label className="rhd-field"><span>Formato</span>
                    <select value={selected.barcodeFormat} onChange={(e) => updateEl(selected.id, { barcodeFormat: e.target.value })}>
                      {BARCODE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </label>
                  <label className="rhd-field"><span>Alto (mm)</span>
                    <input type="number" min="4" step="1" value={selected.height} onChange={(e) => updateEl(selected.id, { height: toNumber(e.target.value, selected.height) })} />
                  </label>
                </div>
              )}
              <div className="rhd-row">
                <label className="rhd-field"><span>Ancho (mm)</span>
                  <input type="number" min="2" step="1" value={selected.w} onChange={(e) => updateEl(selected.id, { w: toNumber(e.target.value, selected.w) })} />
                </label>
                <label className="rhd-field"><span>X (mm)</span>
                  <input type="number" step="1" value={selected.x} onChange={(e) => updateEl(selected.id, { x: toNumber(e.target.value, selected.x) })} />
                </label>
                <label className="rhd-field"><span>Y (mm)</span>
                  <input type="number" step="1" value={selected.y} onChange={(e) => updateEl(selected.id, { y: toNumber(e.target.value, selected.y) })} />
                </label>
                <label className="rhd-field rhd-check"><span>Ancho completo</span>
                  <input type="checkbox" checked={Math.round(selected.w) >= W && Math.round(selected.x) === 0} onChange={(e) => updateEl(selected.id, e.target.checked ? { x: 0, w: W } : {})} />
                </label>
              </div>
              </>
              )}
            </>
          ) : (
            <div className="rhd-props-empty">
              <p>Selecciona un elemento del lienzo para editarlo, o agrega <strong>Texto</strong>, <strong>Codigo</strong> o <strong>Lista</strong>.</p>
              <p className="subtle-line">La <strong>Lista</strong> se llena sola con los productos de la caja (o las cajas de la tarima) y se auto-ajusta segun cuantos haya.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
