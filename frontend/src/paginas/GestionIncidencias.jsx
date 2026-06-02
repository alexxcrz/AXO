import { useState, useMemo, useRef, useEffect } from "react";
import {
  OctagonAlert, Plus, Search, Pencil, Trash2, Eye,
  Wrench, Zap, Building2, ShieldAlert, HelpCircle, Package,
  Upload, X, Image, FileText, ExternalLink, TrendingDown,
  Calculator, CheckCircle2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Fuel,
  Star, ArrowRight, Clock, DollarSign, CreditCard, TriangleAlert,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { isImageMedia, MediaLightbox } from "../components/MediaLightbox.jsx";
import { uploadFileToCloudinary } from "../services/upload.service";
import "./GestionIncidencias.css";

const CATEGORIAS = ["Mecánico", "Eléctrico", "Infraestructura", "Equipo / Herramienta", "Seguridad", "Limpieza", "Sistemas", "Otro"];
const PRIORIDADES = ["baja", "media", "alta", "critica"];
const ESTADOS = ["abierta", "en_proceso", "resuelta", "cerrada"];
const PAGO_ESTADOS = ["pendiente", "pagado", "cancelado"];

const PRIORIDAD_LABEL = { baja: "Baja", media: "Media", alta: "Alta", critica: "Crítica" };
const ESTADO_LABEL = { abierta: "Abierta", en_proceso: "En proceso", resuelta: "Resuelta", cerrada: "Cerrada" };
const PAGO_LABEL = { pendiente: "Pendiente", pagado: "Pagado", cancelado: "Cancelado" };

const CAT_ICON = {
  "Mecánico": Wrench,
  "Eléctrico": Zap,
  "Infraestructura": Building2,
  "Equipo / Herramienta": Package,
  "Seguridad": ShieldAlert,
  "Limpieza": OctagonAlert,
  "Sistemas": OctagonAlert,
  "Otro": HelpCircle,
};

const DETAIL_TABS = ["info", "evidencias", "cotizaciones", "comparativa"];
const DETAIL_TAB_LABEL = { info: "Información", evidencias: "Evidencias", cotizaciones: "Cotizaciones", comparativa: "Comparativa" };

function formatCurrency(v) {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(v);
}

function calcCostoTransporte(distanciaKm, consumoLitros100km, precioCombustible) {
  if (!distanciaKm || !consumoLitros100km || !precioCombustible) return 0;
  const litros = (distanciaKm * 2 * consumoLitros100km) / 100;
  return litros * precioCombustible;
}

const EMPTY_DRAFT = {
  title: "",
  description: "",
  category: "Mecánico",
  area: "",
  priority: "media",
  status: "abierta",
  assignedToId: "",
  assignedToName: "",
  estimatedCost: "",
  actualCost: "",
  provider: "",
  invoiceNumber: "",
  paymentStatus: "pendiente",
  resolution: "",
};

const EMPTY_COT = {
  proveedor: "",
  descripcion: "",
  monto: "",
  tiempoEntrega: "",
  distanciaKm: "",
  consumoLitros100km: "10",
  precioCombustible: "24.50",
  notas: "",
  archivoUrl: "",
  archivoNombre: "",
};

// ── EvidenciaGrid ──────────────────────────────────────────────────────────
function EvidenciaGrid({ evidencias, canEdit, onDelete, onUpload, uploading, uploadProgress }) {
  const fileRef = useRef(null);
  const [lightbox, setLightbox] = useState(null); // { images, startIndex }

  function isImage(ev) {
    return isImageMedia({ mimeType: ev.type, name: ev.name, url: ev.url });
  }

  const imageEvidencias = evidencias.filter(isImage);

  function openLightbox(ev) {
    const idx = imageEvidencias.findIndex((e) => e.id === ev.id);
    setLightbox({ images: imageEvidencias, startIndex: idx >= 0 ? idx : 0 });
  }

  return (
    <div className="ev-section">
      {canEdit && (
        <div className="ev-upload-row">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) onUpload(files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="secondary-button sm-button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={13} />
            {uploading
              ? uploadProgress
                ? `Subiendo ${uploadProgress.done}/${uploadProgress.total}…`
                : "Subiendo…"
              : "Agregar evidencias"}
          </button>
          <span className="ev-hint">Imágenes, PDF, Excel, Word · Selección múltiple</span>
        </div>
      )}
      {evidencias.length === 0 ? (
        <div className="ev-empty">
          <Image size={32} />
          <span>No hay evidencias adjuntas aún.</span>
        </div>
      ) : (
        <div className="ev-grid">
          {evidencias.map((ev) => (
            <div key={ev.id} className="ev-card">
              {isImage(ev) ? (
                <button type="button" className="ev-thumb-link" onClick={() => openLightbox(ev)}>
                  <img
                    src={ev.thumbnailUrl || ev.url}
                    alt={ev.name}
                    className="ev-thumb"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.closest(".ev-thumb-link").classList.add("ev-thumb-broken");
                    }}
                  />
                </button>
              ) : (
                <a href={ev.url} target="_blank" rel="noopener noreferrer" className="ev-file-icon-wrap">
                  <FileText size={28} />
                </a>
              )}
              <div className="ev-card-footer">
                <span className="ev-name" title={ev.name}>{ev.name}</span>
                <div className="ev-card-actions">
                  <a href={ev.url} target="_blank" rel="noopener noreferrer" className="icon-button" title="Abrir">
                    <ExternalLink size={12} />
                  </a>
                  {canEdit && (
                    <button type="button" className="icon-button danger" title="Eliminar" onClick={() => onDelete(ev.id)}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              {ev.uploadedByName && <span className="ev-by">Por {ev.uploadedByName}</span>}
            </div>
          ))}
        </div>
      )}
      {lightbox ? (
        <MediaLightbox
          items={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
function CotizacionesPanel({ cotizaciones, canEdit, onAdd, onDelete, onSelect, _requestJson, _incidenciaId }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_COT);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  function setField(k, v) { setFormData((p) => ({ ...p, [k]: v })); }

  async function handleFileAttach(file) {
    setUploading(true);
    try {
      const result = await uploadFileToCloudinary(file);
      setField("archivoUrl", result.url);
      setField("archivoNombre", file.name);
    } catch {
      setError("Error al subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!formData.proveedor.trim()) { setError("El proveedor es obligatorio."); return; }
    setSaving(true);
    setError("");
    try {
      await onAdd({
        ...formData,
        monto: formData.monto !== "" ? Number(formData.monto) : 0,
        distanciaKm: formData.distanciaKm !== "" ? Number(formData.distanciaKm) : 0,
        consumoLitros100km: formData.consumoLitros100km !== "" ? Number(formData.consumoLitros100km) : 10,
        precioCombustible: formData.precioCombustible !== "" ? Number(formData.precioCombustible) : 0,
      });
      setFormData(EMPTY_COT);
      setShowForm(false);
    } catch (e) {
      setError(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cot-section">
      {canEdit && (
        <div className="cot-header-row">
          <button
            type="button"
            className="secondary-button sm-button"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? <ChevronUp size={13} /> : <Plus size={13} />} {showForm ? "Ocultar formulario" : "Nueva cotización"}
          </button>
        </div>
      )}

      {showForm && canEdit && (
        <div className="cot-form">
          <h4 className="cot-form-title">Agregar cotización</h4>
          <div className="cot-form-grid">
            <label className="full-col">
              Proveedor / Empresa *
              <input value={formData.proveedor} onChange={(e) => setField("proveedor", e.target.value)} placeholder="Nombre del proveedor" />
            </label>
            <label className="full-col">
              Descripción del servicio
              <textarea value={formData.descripcion} onChange={(e) => setField("descripcion", e.target.value)} rows={2} placeholder="Qué incluye esta cotización…" />
            </label>
            <label>
              Monto (MXN)
              <input type="number" min="0" step="0.01" value={formData.monto} onChange={(e) => setField("monto", e.target.value)} placeholder="0.00" />
            </label>
            <label>
              Tiempo de entrega
              <input value={formData.tiempoEntrega} onChange={(e) => setField("tiempoEntrega", e.target.value)} placeholder="Ej. 3-5 días hábiles" />
            </label>
            <div className="cot-logistics-section full-col">
              <span className="cot-subsection-title"><Fuel size={13} /> Logística y combustible</span>
              <div className="cot-logistics-grid">
                <label>
                  Distancia al proveedor (km)
                  <input type="number" min="0" step="0.1" value={formData.distanciaKm} onChange={(e) => setField("distanciaKm", e.target.value)} placeholder="0" />
                  <span className="input-hint">Se calculará ida y vuelta (×2)</span>
                </label>
                <label>
                  Consumo del vehículo (L/100 km)
                  <input type="number" min="1" step="0.1" value={formData.consumoLitros100km} onChange={(e) => setField("consumoLitros100km", e.target.value)} placeholder="10" />
                  <span className="input-hint">Litros cada 100 km recorridos</span>
                </label>
                <label>
                  Precio del combustible (MXN/L)
                  <input type="number" min="0" step="0.01" value={formData.precioCombustible} onChange={(e) => setField("precioCombustible", e.target.value)} placeholder="24.50" />
                </label>
                {(formData.distanciaKm && formData.consumoLitros100km && formData.precioCombustible) ? (
                  <div className="cot-preview-cost">
                    <span>Costo transporte estimado:</span>
                    <strong>{formatCurrency(calcCostoTransporte(Number(formData.distanciaKm), Number(formData.consumoLitros100km), Number(formData.precioCombustible)))}</strong>
                    <span>Total estimado:</span>
                    <strong className="highlight-total">{formatCurrency((Number(formData.monto) || 0) + calcCostoTransporte(Number(formData.distanciaKm), Number(formData.consumoLitros100km), Number(formData.precioCombustible)))}</strong>
                  </div>
                ) : null}
              </div>
            </div>
            <label className="full-col">
              Notas adicionales
              <textarea value={formData.notas} onChange={(e) => setField("notas", e.target.value)} rows={2} placeholder="Condiciones, garantía, observaciones…" />
            </label>
            <div className="full-col cot-attach-row">
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) handleFileAttach(e.target.files[0]); e.target.value = ""; }} />
              <button type="button" className="secondary-button sm-button" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload size={13} /> {uploading ? "Subiendo…" : "Adjuntar archivo"}
              </button>
              {formData.archivoNombre && (
                <span className="cot-attached-file">
                  <FileText size={13} /> {formData.archivoNombre}
                  <button type="button" className="icon-button danger" onClick={() => { setField("archivoUrl", ""); setField("archivoNombre", ""); }}><X size={11} /></button>
                </span>
              )}
            </div>
          </div>
          {error && <p className="validation-text">{error}</p>}
          <div className="cot-form-actions">
            <button type="button" className="secondary-button sm-button" onClick={() => { setShowForm(false); setFormData(EMPTY_COT); setError(""); }}>Cancelar</button>
            <button type="button" className="primary-button sm-button" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar cotización"}</button>
          </div>
        </div>
      )}

      {cotizaciones.length === 0 ? (
        <div className="cot-empty">
          <TrendingDown size={32} />
          <span>No hay cotizaciones registradas aún.</span>
        </div>
      ) : (
        <div className="cot-list">
          {cotizaciones.map((cot) => {
            const costoTransporte = calcCostoTransporte(cot.distanciaKm, cot.consumoLitros100km, cot.precioCombustible);
            const costoTotal = cot.monto + costoTransporte;
            return (
              <div key={cot.id} className={`cot-card ${cot.seleccionada ? "cot-card--selected" : ""}`}>
                <div className="cot-card-header">
                  <span className="cot-proveedor">{cot.proveedor}</span>
                  {cot.seleccionada && <span className="cot-badge-selected"><CheckCircle2 size={11} /> Seleccionada</span>}
                  <div className="cot-card-actions">
                    {canEdit && !cot.seleccionada && (
                      <button type="button" className="icon-button" title="Marcar como seleccionada" onClick={() => onSelect(cot.id)}>
                        <Star size={13} />
                      </button>
                    )}
                    {canEdit && (
                      <button type="button" className="icon-button danger" title="Eliminar" onClick={() => onDelete(cot.id)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                {cot.descripcion && <p className="cot-descripcion">{cot.descripcion}</p>}
                <div className="cot-metrics">
                  <div className="cot-metric">
                    <span className="cot-metric-label">Monto</span>
                    <span className="cot-metric-value">{formatCurrency(cot.monto)}</span>
                  </div>
                  {cot.distanciaKm > 0 && (
                    <>
                      <div className="cot-metric">
                        <span className="cot-metric-label">Distancia (ida/vuelta)</span>
                        <span className="cot-metric-value">{cot.distanciaKm} km × 2</span>
                      </div>
                      <div className="cot-metric">
                        <span className="cot-metric-label">Costo combustible</span>
                        <span className="cot-metric-value fuel-cost">{formatCurrency(costoTransporte)}</span>
                      </div>
                      <div className="cot-metric total">
                        <span className="cot-metric-label">Total real</span>
                        <span className="cot-metric-value total-value">{formatCurrency(costoTotal)}</span>
                      </div>
                    </>
                  )}
                  {cot.tiempoEntrega && (
                    <div className="cot-metric">
                      <span className="cot-metric-label">Entrega</span>
                      <span className="cot-metric-value">{cot.tiempoEntrega}</span>
                    </div>
                  )}
                </div>
                {cot.notas && <p className="cot-notas">{cot.notas}</p>}
                {cot.archivoUrl && (
                  <a href={cot.archivoUrl} target="_blank" rel="noopener noreferrer" className="cot-archivo-link">
                    <FileText size={13} /> {cot.archivoNombre || "Ver documento"}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ComparativaPanel ───────────────────────────────────────────────────────
function ComparativaPanel({ cotizaciones }) {
  const [precioGlobal, setPrecioGlobal] = useState("24.50");
  const [consumoGlobal, setConsumoGlobal] = useState("10");
  const [useGlobal, setUseGlobal] = useState(false);

  const rows = useMemo(() => {
    return cotizaciones.map((cot) => {
      const precio = useGlobal ? Number(precioGlobal) : cot.precioCombustible;
      const consumo = useGlobal ? Number(consumoGlobal) : cot.consumoLitros100km;
      const costoTransporte = calcCostoTransporte(cot.distanciaKm, consumo, precio);
      const costoTotal = cot.monto + costoTransporte;
      const litrosViaje = cot.distanciaKm > 0 ? (cot.distanciaKm * 2 * consumo) / 100 : 0;
      return { ...cot, costoTransporte, costoTotal, litrosViaje };
    });
  }, [cotizaciones, precioGlobal, consumoGlobal, useGlobal]);

  const winner = useMemo(() => {
    if (rows.length === 0) return null;
    return rows.reduce((best, r) => r.costoTotal < best.costoTotal ? r : best, rows[0]);
  }, [rows]);

  if (cotizaciones.length === 0) {
    return (
      <div className="comp-empty">
        <Calculator size={36} />
        <span>Agrega al menos una cotización para ver la comparativa.</span>
      </div>
    );
  }

  return (
    <div className="comp-section">
      <div className="comp-calculator">
        <div className="comp-calc-header">
          <Calculator size={15} />
          <span>Calculadora de costos logísticos</span>
          <label className="comp-toggle-label">
            <input type="checkbox" checked={useGlobal} onChange={(e) => setUseGlobal(e.target.checked)} />
            Usar valores globales
          </label>
        </div>
        {useGlobal && (
          <div className="comp-calc-inputs">
            <label>
              Precio combustible global (MXN/L)
              <input type="number" min="0" step="0.01" value={precioGlobal} onChange={(e) => setPrecioGlobal(e.target.value)} />
            </label>
            <label>
              Consumo global (L/100 km)
              <input type="number" min="1" step="0.1" value={consumoGlobal} onChange={(e) => setConsumoGlobal(e.target.value)} />
            </label>
          </div>
        )}
        <div className="comp-formula-note">
          Fórmula: <code>Costo transporte = (Distancia × 2 × L/100km ÷ 100) × precio/litro</code>
        </div>
      </div>

      {winner && (
        <div className="comp-winner-banner">
          <CheckCircle2 size={16} />
          <span>Mejor opción: <strong>{winner.proveedor}</strong> — {formatCurrency(winner.costoTotal)} total real</span>
          {winner.costoTransporte > 0 && (
            <span className="comp-winner-breakdown">({formatCurrency(winner.monto)} + {formatCurrency(winner.costoTransporte)} combustible)</span>
          )}
        </div>
      )}

      <div className="comp-table-wrap">
        <table className="comp-table">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Monto cotizado</th>
              <th>Distancia (km)</th>
              <th>Litros viaje</th>
              <th>Costo combustible</th>
              <th>Total real</th>
              <th>Entrega</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.id === winner?.id ? "comp-row--winner" : ""}>
                <td>
                  <div className="comp-proveedor-cell">
                    {row.id === winner?.id && <span className="comp-winner-badge">Mejor</span>}
                    <span>{row.proveedor}</span>
                    {row.seleccionada && <span className="comp-sel-badge">Seleccionada</span>}
                  </div>
                </td>
                <td className="comp-money">{formatCurrency(row.monto)}</td>
                <td className="comp-center">{row.distanciaKm > 0 ? `${row.distanciaKm} km` : "—"}</td>
                <td className="comp-center">{row.litrosViaje > 0 ? `${row.litrosViaje.toFixed(2)} L` : "—"}</td>
                <td className="comp-money comp-fuel">{row.costoTransporte > 0 ? formatCurrency(row.costoTransporte) : "—"}</td>
                <td className="comp-money comp-total">{formatCurrency(row.costoTotal)}</td>
                <td className="comp-center">{row.tiempoEntrega || "—"}</td>
                <td>
                  {row.archivoUrl && (
                    <a href={row.archivoUrl} target="_blank" rel="noopener noreferrer" className="icon-button" title="Ver documento">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="comp-diff-row">
              <td colSpan={5} className="comp-diff-label">
                <ArrowRight size={12} /> Diferencia entre mejor y peor opción
              </td>
              <td className="comp-money comp-diff-value">
                {rows.length > 1 ? formatCurrency(Math.max(...rows.map((r) => r.costoTotal)) - Math.min(...rows.map((r) => r.costoTotal))) : "—"}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="comp-savings-note">
        {rows.length > 1 && winner && (() => {
          const peor = rows.reduce((w, r) => r.costoTotal > w.costoTotal ? r : w, rows[0]);
          const ahorro = peor.costoTotal - winner.costoTotal;
          const pct = peor.costoTotal > 0 ? (ahorro / peor.costoTotal) * 100 : 0;
          return (
            <span>
              Elegir <strong>{winner.proveedor}</strong> vs <strong>{peor.proveedor}</strong> representa un ahorro de{" "}
              <strong>{formatCurrency(ahorro)}</strong> ({pct.toFixed(1)}% menos).
            </span>
          );
        })()}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function GestionIncidencias({ contexto }) {
  const {
    state,
    setState,
    requestJson,
    actionPermissions,
    formatDate,
    activeAssignableUsers,
    pendingOpenIncidenciaId,
    setPendingOpenIncidenciaId,
  } = contexto;

  const incidencias = useMemo(() => state.incidencias || [], [state.incidencias]);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const filtered = useMemo(() => {
    let list = [...incidencias].sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q) ||
        (i.area || "").toLowerCase().includes(q) ||
        (i.provider || "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") list = list.filter((i) => i.status === filterStatus);
    if (filterPriority !== "all") list = list.filter((i) => i.priority === filterPriority);
    if (filterCategory !== "all") list = list.filter((i) => i.category === filterCategory);
    return list;
  }, [incidencias, search, filterStatus, filterPriority, filterCategory]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = incidencias.length;
    const abiertas = incidencias.filter((i) => i.status === "abierta").length;
    const en_proceso = incidencias.filter((i) => i.status === "en_proceso").length;
    const resueltas = incidencias.filter((i) => i.status === "resuelta" || i.status === "cerrada").length;
    const criticas = incidencias.filter((i) => i.priority === "critica" && i.status !== "cerrada" && i.status !== "resuelta").length;
    const altaActivas = incidencias.filter((i) => i.priority === "alta" && i.status !== "cerrada" && i.status !== "resuelta").length;
    const totalGasto = incidencias.reduce((s, i) => s + (i.actualCost ?? 0), 0);
    const gastosCount = incidencias.filter((i) => (i.actualCost ?? 0) > 0).length;
    const pendientePagoList = incidencias.filter((i) => i.paymentStatus === "pendiente" && (i.actualCost ?? 0) > 0);
    const pendientePago = pendientePagoList.reduce((s, i) => s + i.actualCost, 0);
    const pendientePagoCount = pendientePagoList.length;
    return { total, abiertas, en_proceso, resueltas, criticas, altaActivas, totalGasto, gastosCount, pendientePago, pendientePagoCount };
  }, [incidencias]);

  // ── Create / Edit modal ───────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [step, setStep] = useState(1);

  // ── Delete modal ──────────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState(null);

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [detailId, setDetailId] = useState(null);
  const [detailTab, setDetailTab] = useState("info");
  const [uploadingEv, setUploadingEv] = useState(false);

  useEffect(() => {
    const targetId = String(pendingOpenIncidenciaId || "").trim();
    if (!targetId || typeof setPendingOpenIncidenciaId !== "function") return;
    const exists = incidencias.some((item) => item.id === targetId);
    if (!exists) {
      setPendingOpenIncidenciaId("");
      return;
    }
    setDetailId(targetId);
    setDetailTab("info");
    setPendingOpenIncidenciaId("");
  }, [incidencias, pendingOpenIncidenciaId, setPendingOpenIncidenciaId]);

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setEditId(null);
    setFormError("");
    setStep(1);
    setModalOpen(true);
  }

  function openEdit(item) {
    setDraft({
      title: item.title,
      description: item.description || "",
      category: item.category,
      area: item.area || "",
      priority: item.priority,
      status: item.status,
      assignedToId: item.assignedToId || "",
      assignedToName: item.assignedToName || "",
      estimatedCost: item.estimatedCost !== null && item.estimatedCost !== undefined ? String(item.estimatedCost) : "",
      actualCost: item.actualCost !== null && item.actualCost !== undefined ? String(item.actualCost) : "",
      provider: item.provider || "",
      invoiceNumber: item.invoiceNumber || "",
      paymentStatus: item.paymentStatus || "pendiente",
      resolution: item.resolution || "",
    });
    setEditId(item.id);
    setFormError("");
    setStep(1);
    setModalOpen(true);
  }

  function setField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!draft.title.trim()) { setFormError("El título es obligatorio."); return; }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        ...draft,
        estimatedCost: draft.estimatedCost !== "" ? Number(draft.estimatedCost) : null,
        actualCost: draft.actualCost !== "" ? Number(draft.actualCost) : null,
      };
      const method = editId ? "PATCH" : "POST";
      const url = editId ? `/warehouse/incidencias/${editId}` : "/warehouse/incidencias";
      const res = await requestJson(url, { method, body: JSON.stringify(payload) });
      if (res?.data?.state) setState(res.data.state);
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await requestJson(`/warehouse/incidencias/${deleteId}`, { method: "DELETE" });
      if (res?.data?.state) setState(res.data.state);
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  // ── Evidencias handlers ───────────────────────────────────────────────────
  const [uploadEvProgress, setUploadEvProgress] = useState(null);

  async function handleUploadEvidencia(files) {
    if (!detailId) return;
    const fileList = Array.isArray(files) ? files : [files];
    if (fileList.length === 0) return;
    setUploadingEv(true);
    setUploadEvProgress({ done: 0, total: fileList.length });
    let lastState = null;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const result = await uploadFileToCloudinary(file);
        const evidencia = {
          url: result.url,
          thumbnailUrl: result.thumbnailUrl || result.url,
          name: file.name,
          type: file.type,
        };
        const res = await requestJson(`/warehouse/incidencias/${detailId}/evidencias`, {
          method: "POST",
          body: JSON.stringify(evidencia),
        });
        if (res?.data?.state) lastState = res.data.state;
      } catch (err) {
        console.error(`Error al subir evidencia "${file.name}":`, err);
      }
      setUploadEvProgress({ done: i + 1, total: fileList.length });
    }
    if (lastState) setState(lastState);
    setUploadingEv(false);
    setUploadEvProgress(null);
  }

  async function handleDeleteEvidencia(evidenciaId) {
    if (!detailId) return;
    try {
      const res = await requestJson(`/warehouse/incidencias/${detailId}/evidencias/${evidenciaId}`, { method: "DELETE" });
      if (res?.data?.state) setState(res.data.state);
    } catch (err) {
      console.error("Error al eliminar evidencia:", err);
    }
  }

  // ── Cotizaciones handlers ─────────────────────────────────────────────────
  async function handleAddCotizacion(payload) {
    const res = await requestJson(`/warehouse/incidencias/${detailId}/cotizaciones`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res?.data?.state) setState(res.data.state);
  }

  async function handleDeleteCotizacion(cotizacionId) {
    if (!detailId) return;
    try {
      const res = await requestJson(`/warehouse/incidencias/${detailId}/cotizaciones/${cotizacionId}`, { method: "DELETE" });
      if (res?.data?.state) setState(res.data.state);
    } catch (err) {
      console.error("Error al eliminar cotización:", err);
    }
  }

  async function handleSelectCotizacion(cotizacionId) {
    if (!detailId) return;
    try {
      const res = await requestJson(`/warehouse/incidencias/${detailId}/cotizaciones/${cotizacionId}`, {
        method: "PATCH",
        body: JSON.stringify({ seleccionada: true }),
      });
      if (res?.data?.state) setState(res.data.state);
    } catch (err) {
      console.error("Error al seleccionar cotización:", err);
    }
  }

  const detailItem = detailId ? incidencias.find((i) => i.id === detailId) : null;

  return (
    <section className="incidencias-page">
      {/* ── KPI row ── */}
      <div className="incidencias-kpi-row">
        <div className="incidencias-kpi">
          <div className="incidencias-kpi-header">
            <OctagonAlert size={15} className={kpis.abiertas > 0 ? "kpi-icon amber" : "kpi-icon green"} />
            <span className="incidencias-kpi-label">Abiertas</span>
          </div>
          <span className={`incidencias-kpi-value ${kpis.abiertas > 0 ? "amber" : "green"}`}>{kpis.abiertas}</span>
          <span className="incidencias-kpi-sub">de {kpis.total} totales</span>
        </div>
        <div className="incidencias-kpi">
          <div className="incidencias-kpi-header">
            <Clock size={15} className="kpi-icon blue" />
            <span className="incidencias-kpi-label">En proceso</span>
          </div>
          <span className="incidencias-kpi-value blue">{kpis.en_proceso}</span>
          <span className="incidencias-kpi-sub">{kpis.resueltas} resueltas</span>
        </div>
        <div className="incidencias-kpi">
          <div className="incidencias-kpi-header">
            <TriangleAlert size={15} className={kpis.criticas > 0 ? "kpi-icon red" : "kpi-icon green"} />
            <span className="incidencias-kpi-label">Críticas activas</span>
          </div>
          <span className={`incidencias-kpi-value ${kpis.criticas > 0 ? "red" : "green"}`}>{kpis.criticas}</span>
          <span className="incidencias-kpi-sub">{kpis.altaActivas} de alta prioridad</span>
        </div>
        <div className="incidencias-kpi">
          <div className="incidencias-kpi-header">
            <DollarSign size={15} className="kpi-icon" />
            <span className="incidencias-kpi-label">Gasto total</span>
          </div>
          <span className="incidencias-kpi-value">{formatCurrency(kpis.totalGasto)}</span>
          <span className="incidencias-kpi-sub">en {kpis.gastosCount} incidencias</span>
        </div>
        <div className="incidencias-kpi">
          <div className="incidencias-kpi-header">
            <CreditCard size={15} className={kpis.pendientePago > 0 ? "kpi-icon amber" : "kpi-icon green"} />
            <span className="incidencias-kpi-label">Por pagar</span>
          </div>
          <span className={`incidencias-kpi-value ${kpis.pendientePago > 0 ? "amber" : "green"}`}>{formatCurrency(kpis.pendientePago)}</span>
          <span className="incidencias-kpi-sub">{kpis.pendientePagoCount} pendiente{kpis.pendientePagoCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── Main card ── */}
      <article className="surface-card full-width admin-tabs-shell">
        <div className="card-header-row">
          <div>
            <h3>Registro de incidencias</h3>
            <p className="subtle-line" style={{ margin: 0 }}>Problemas, fallas y gastos de mantenimiento del almacén</p>
          </div>
          {actionPermissions.createIncidencia ? (
            <button type="button" className="primary-button sm-button" onClick={openCreate}>
              <Plus size={14} />
              <span className="incidencias-new-label">Nueva incidencia</span>
            </button>
          ) : null}
        </div>

        {/* toolbar */}
        <div className="incidencias-toolbar" style={{ margin: "0.75rem 0" }}>
          <div className="incidencias-search-wrap">
            <Search size={14} />
            <input
              className="incidencias-search"
              placeholder="Buscar por título, área, proveedor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="incidencias-filters">
            <div className="filter-select-wrap">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Todos los estados</option>
                {ESTADOS.map((s) => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="filter-select-wrap">
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="all">Todas las prioridades</option>
                {PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDAD_LABEL[p]}</option>)}
              </select>
            </div>
            <div className="filter-select-wrap">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">Todas las categorías</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* table */}
        {filtered.length === 0 ? (
          <div className="incidencias-empty">
            <OctagonAlert size={40} />
            <p>{incidencias.length === 0 ? "No hay incidencias registradas aún." : "No hay resultados para los filtros aplicados."}</p>
          </div>
        ) : (
          <div className="incidencias-table-wrap">
            <table className="incidencias-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Categoría</th>
                  <th>Área</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Gasto real</th>
                  <th>Pago</th>
                  <th>Registrado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const CatIcon = CAT_ICON[item.category] || HelpCircle;
                  const cotCount = (item.cotizaciones || []).length;
                  const evCount = (item.evidencias || []).length;
                  return (
                    <tr key={item.id} data-priority={item.priority}>
                      <td className="incidencia-title-cell">
                        <span className="incidencia-title-text" title={item.title}>{item.title}</span>
                        {item.description ? (
                          <span className="incidencia-desc-snippet">{item.description}</span>
                        ) : null}
                        <div className="incidencia-title-meta">
                          {item.assignedToName ? <span className="incidencia-assignee">→ {item.assignedToName}</span> : null}
                          {cotCount > 0 ? <span className="incidencia-count-badge cot">{cotCount} cotiz.</span> : null}
                          {evCount > 0 ? <span className="incidencia-count-badge ev">{evCount} evidencia{evCount !== 1 ? "s" : ""}</span> : null}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <CatIcon size={13} style={{ flexShrink: 0, color: "#8a94a0" }} /> {item.category}
                        </span>
                      </td>
                      <td style={{ color: "#8a94a0" }}>{item.area || "—"}</td>
                      <td><span className={`badge badge-${item.priority}`}>{PRIORIDAD_LABEL[item.priority]}</span></td>
                      <td><span className={`badge badge-${item.status}`}>{ESTADO_LABEL[item.status]}</span></td>
                      <td style={{ fontWeight: (item.actualCost ?? 0) > 0 ? 600 : 400 }}>{formatCurrency(item.actualCost)}</td>
                      <td><span className={`badge badge-${item.paymentStatus}`}>{PAGO_LABEL[item.paymentStatus]}</span></td>
                      <td style={{ color: "#8a94a0", whiteSpace: "nowrap" }}>{formatDate ? formatDate(item.reportedAt) : item.reportedAt?.slice(0, 10)}</td>
                      <td>
                        <div className="incidencias-row-actions">
                          <button
                            type="button"
                            className="icon-button"
                            title="Ver detalle"
                            onClick={() => { setDetailId(item.id); setDetailTab("info"); }}
                          >
                            <Eye size={14} />
                          </button>
                          {actionPermissions.editIncidencia ? (
                            <button type="button" className="icon-button" title="Editar" onClick={() => openEdit(item)}>
                              <Pencil size={14} />
                            </button>
                          ) : null}
                          {actionPermissions.deleteIncidencia ? (
                            <button type="button" className="icon-button danger" title="Eliminar" onClick={() => setDeleteId(item.id)}>
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* ── Create / Edit modal por pasos ── */}
      {(() => {
        const isResolved = draft.status === "resuelta" || draft.status === "cerrada";
        const step2Label = isResolved ? "Resolución y costos" : "Estimación";

        function handleStep1Next() {
          if (!draft.title.trim()) { setFormError("El título es obligatorio."); return; }
          setFormError("");
          setStep(2);
        }

        return (
          <Modal
            open={modalOpen}
            title={editId ? "Editar incidencia" : "Nueva incidencia"}
            confirmLabel={step === 1 ? "Siguiente →" : (saving ? "Guardando…" : "Guardar")}
            cancelLabel="Cancelar"
            onClose={() => setModalOpen(false)}
            onConfirm={step === 1 ? handleStep1Next : handleSave}
            footerActions={step === 2 ? (
              <button
                type="button"
                className="sicfla-button ghost"
                style={{ marginRight: "auto" }}
                onClick={() => { setFormError(""); setStep(1); }}
              >
                ← Anterior
              </button>
            ) : null}
          >
            <div className="incidencia-form">
              {/* Indicador de pasos */}
              <div className="form-steps-indicator full-col">
                <div className={`form-step-item ${step === 1 ? "active" : "done"}`}>
                  <span className="form-step-num">{step === 1 ? "1" : "✓"}</span>
                  <span className="form-step-name">Información básica</span>
                </div>
                <div className="form-step-sep" />
                <div className={`form-step-item ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
                  <span className="form-step-num">2</span>
                  <span className="form-step-name">{step2Label}</span>
                </div>
              </div>

              {/* ── Paso 1: Información básica ── */}
              {step === 1 && (
                <>
                  <label className="full-col">
                    Título *
                    <input value={draft.title} onChange={(e) => setField("title", e.target.value)} placeholder="Ej. Fuga de aceite en compresor 2" autoFocus />
                  </label>
                  <label className="full-col">
                    Descripción
                    <textarea value={draft.description} onChange={(e) => setField("description", e.target.value)} placeholder="Describe el problema con detalle…" rows={3} />
                  </label>
                  <label>
                    Categoría
                    <select value={draft.category} onChange={(e) => setField("category", e.target.value)}>
                      {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label>
                    Área del almacén
                    <input value={draft.area} onChange={(e) => setField("area", e.target.value)} placeholder="Ej. Zona de carga, Oficinas…" />
                  </label>
                  <label>
                    Prioridad
                    <select value={draft.priority} onChange={(e) => setField("priority", e.target.value)}>
                      {PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDAD_LABEL[p]}</option>)}
                    </select>
                  </label>
                  <label>
                    Estado
                    <select value={draft.status} onChange={(e) => setField("status", e.target.value)}>
                      {ESTADOS.map((s) => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
                    </select>
                  </label>
                  <label className="full-col">
                    Asignado a
                    <select
                      value={draft.assignedToId}
                      onChange={(e) => {
                        const user = (activeAssignableUsers || []).find((u) => u.id === e.target.value);
                        setField("assignedToId", e.target.value);
                        setField("assignedToName", user ? user.name : "");
                      }}
                    >
                      <option value="">— Sin asignar —</option>
                      {(activeAssignableUsers || []).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </label>
                </>
              )}

              {/* ── Paso 2: Incidencia abierta o en proceso → solo estimado ── */}
              {step === 2 && !isResolved && (
                <>
                  <div className="form-info-note full-col">
                    <Calculator size={14} />
                    <span>
                      Para incidencias <strong>abiertas o en proceso</strong>, el costo definitivo se determinará
                      comparando las cotizaciones desde la vista de detalle. Puedes dejar un estimado inicial como referencia.
                    </span>
                  </div>
                  <label>
                    Costo estimado (MXN)
                    <input
                      type="number" min="0" step="0.01"
                      value={draft.estimatedCost}
                      onChange={(e) => setField("estimatedCost", e.target.value)}
                      placeholder="0.00"
                    />
                    <span className="input-hint">Opcional. Referencia inicial antes de cotizar.</span>
                  </label>
                </>
              )}

              {/* ── Paso 2: Incidencia resuelta / cerrada → todos los datos finales ── */}
              {step === 2 && isResolved && (
                <>
                  <div className="form-info-note full-col">
                    <CheckCircle2 size={14} />
                    <span>
                      Registra los datos finales de la resolución. El costo real puede obtenerse automáticamente
                      desde la cotización seleccionada en el detalle, o capturarlo manualmente aquí.
                    </span>
                  </div>
                  <label>
                    Costo real (MXN)
                    <input type="number" min="0" step="0.01" value={draft.actualCost} onChange={(e) => setField("actualCost", e.target.value)} placeholder="0.00" />
                  </label>
                  <label>
                    Estado de pago
                    <select value={draft.paymentStatus} onChange={(e) => setField("paymentStatus", e.target.value)}>
                      {PAGO_ESTADOS.map((s) => <option key={s} value={s}>{PAGO_LABEL[s]}</option>)}
                    </select>
                  </label>
                  <label>
                    Proveedor seleccionado
                    <input value={draft.provider} onChange={(e) => setField("provider", e.target.value)} placeholder="Nombre del proveedor o técnico" />
                  </label>
                  <label>
                    Folio / Factura
                    <input value={draft.invoiceNumber} onChange={(e) => setField("invoiceNumber", e.target.value)} placeholder="Número de factura u orden" />
                  </label>
                  <label className="full-col">
                    Resolución / Acciones tomadas
                    <textarea value={draft.resolution} onChange={(e) => setField("resolution", e.target.value)} placeholder="Describe qué se hizo para resolver el problema…" rows={4} />
                  </label>
                </>
              )}

              {formError ? <p className="validation-text" style={{ gridColumn: "1/-1", margin: 0 }}>{formError}</p> : null}
            </div>
          </Modal>
        );
      })()}

      {/* ── Detail modal with tabs ── */}
      <Modal
        open={!!detailItem}
        title="Detalle de incidencia"
        confirmLabel={actionPermissions.editIncidencia ? "Editar" : null}
        cancelLabel="Cerrar"
        onClose={() => setDetailId(null)}
        onConfirm={actionPermissions.editIncidencia ? () => { openEdit(detailItem); setDetailId(null); } : null}
        className="modal-wide"
      >
        {detailItem ? (
          <div className="detail-modal-body">
            {/* Tab strip */}
            <div className="detail-tabs-strip">
              {DETAIL_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`detail-tab-btn ${detailTab === tab ? "active" : ""}`}
                  onClick={() => setDetailTab(tab)}
                >
                  {DETAIL_TAB_LABEL[tab]}
                  {tab === "evidencias" && detailItem.evidencias?.length > 0 && (
                    <span className="tab-count">{detailItem.evidencias.length}</span>
                  )}
                  {tab === "cotizaciones" && detailItem.cotizaciones?.length > 0 && (
                    <span className="tab-count">{detailItem.cotizaciones.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Info tab */}
            {detailTab === "info" && (
              <div className="incidencia-detail">
                <div className="incidencia-detail-field full-col">
                  <span className="incidencia-detail-label">Título</span>
                  <span className="incidencia-detail-value" style={{ fontWeight: 700, fontSize: "1rem" }}>{detailItem.title}</span>
                </div>
                {detailItem.description ? (
                  <div className="incidencia-detail-field full-col">
                    <span className="incidencia-detail-label">Descripción</span>
                    <span className="incidencia-detail-value resolution">{detailItem.description}</span>
                  </div>
                ) : null}
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Categoría</span>
                  <span className="incidencia-detail-value">{detailItem.category}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Área</span>
                  <span className="incidencia-detail-value">{detailItem.area || "—"}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Prioridad</span>
                  <span className={`badge badge-${detailItem.priority}`}>{PRIORIDAD_LABEL[detailItem.priority]}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Estado</span>
                  <span className={`badge badge-${detailItem.status}`}>{ESTADO_LABEL[detailItem.status]}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Reportado por</span>
                  <span className="incidencia-detail-value">{detailItem.reportedByName || "—"}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Asignado a</span>
                  <span className="incidencia-detail-value">{detailItem.assignedToName || "— Sin asignar —"}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Fecha de reporte</span>
                  <span className="incidencia-detail-value">{formatDate ? formatDate(detailItem.reportedAt) : detailItem.reportedAt?.slice(0, 10)}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Fecha de resolución</span>
                  <span className="incidencia-detail-value">{detailItem.resolvedAt ? (formatDate ? formatDate(detailItem.resolvedAt) : detailItem.resolvedAt.slice(0, 10)) : "—"}</span>
                </div>
                <span className="section-divider full-col" style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8a94a0", borderTop: "1px solid var(--sicfla-border)", paddingTop: "0.6rem" }}>Gastos</span>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Costo estimado</span>
                  <span className="incidencia-detail-value cost">{formatCurrency(detailItem.estimatedCost)}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Costo real</span>
                  <span className="incidencia-detail-value cost">{formatCurrency(detailItem.actualCost)}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Proveedor / Técnico</span>
                  <span className="incidencia-detail-value">{detailItem.provider || "—"}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Folio / Factura</span>
                  <span className="incidencia-detail-value">{detailItem.invoiceNumber || "—"}</span>
                </div>
                <div className="incidencia-detail-field">
                  <span className="incidencia-detail-label">Estado de pago</span>
                  <span className={`badge badge-${detailItem.paymentStatus}`}>{PAGO_LABEL[detailItem.paymentStatus]}</span>
                </div>
                {detailItem.resolution ? (
                  <div className="incidencia-detail-field full-col">
                    <span className="incidencia-detail-label">Resolución</span>
                    <span className="incidencia-detail-value resolution">{detailItem.resolution}</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Evidencias tab */}
            {detailTab === "evidencias" && (
              <EvidenciaGrid
                evidencias={detailItem.evidencias || []}
                canEdit={!!actionPermissions.editIncidencia}
                onUpload={handleUploadEvidencia}
                onDelete={handleDeleteEvidencia}
                uploading={uploadingEv}
                uploadProgress={uploadEvProgress}
              />
            )}

            {/* Cotizaciones tab */}
            {detailTab === "cotizaciones" && (
              <CotizacionesPanel
                cotizaciones={detailItem.cotizaciones || []}
                canEdit={!!actionPermissions.editIncidencia}
                onAdd={handleAddCotizacion}
                onDelete={handleDeleteCotizacion}
                onSelect={handleSelectCotizacion}
                requestJson={requestJson}
                incidenciaId={detailId}
              />
            )}

            {/* Comparativa tab */}
            {detailTab === "comparativa" && (
              <ComparativaPanel cotizaciones={detailItem.cotizaciones || []} />
            )}
          </div>
        ) : null}
      </Modal>

      {/* ── Delete confirm modal ── */}
      <Modal
        open={!!deleteId}
        title="Eliminar incidencia"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
      >
        <p style={{ margin: 0 }}>¿Estás seguro de que quieres eliminar esta incidencia? Esta acción no se puede deshacer.</p>
      </Modal>
    </section>
  );
}
