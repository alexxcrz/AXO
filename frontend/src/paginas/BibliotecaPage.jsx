import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import bibliotecaWelcome from "../assets/biblioteca-welcome.jpeg";
import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  FolderUp,
  Loader2,
  Maximize2,
  Minimize2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Modal } from "../components/Modal.jsx";
import "./BibliotecaPage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";

const PREDEFINED_AREAS = ["NOM"];

const getFileUrl = (f) =>
  f?.fileName ? `${API_BASE}/biblioteca/files/${encodeURIComponent(f.fileName)}` : f?.fileUrl || null;

const MIME_LABELS = {
  "application/pdf": "PDF",
  "image/png": "Imagen",
  "image/jpeg": "Imagen",
  "image/jpg": "Imagen",
  "image/webp": "Imagen",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/vnd.ms-excel": "Excel",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "text/plain": "Texto",
};

function mimeLabel(mimeType) {
  return MIME_LABELS[mimeType] || "Archivo";
}

function isImage(mimeType) {
  return String(mimeType).startsWith("image/");
}

function isPdf(mimeType) {
  return mimeType === "application/pdf";
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BibliotecaPage({
  _currentUser,
  canUpload,
  canRenameName,
  canDelete,
  pendingOpenFileId = "",
  onPendingOpenFileConsumed,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("NOM");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadArea, setUploadArea] = useState("NOM");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCustomArea, setUploadCustomArea] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [contentFullscreen, setContentFullscreen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [coverUploadId, setCoverUploadId] = useState(null); // fileId al que se está subiendo portada
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef(null);
  // Prioridad y notificación — subida individual
  const [uploadPriority, setUploadPriority] = useState("baja");
  const [uploadNotify, setUploadNotify] = useState(false);
  const [uploadCoverFile, setUploadCoverFile] = useState(null); // portada para subida individual
  // Carga masiva
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkCovers, setBulkCovers] = useState({}); // { index: File } portadas por archivo
  const [bulkArea, setBulkArea] = useState("NOM");
  const [bulkCustomArea, setBulkCustomArea] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkErrors, setBulkErrors] = useState([]);
  // Prioridad y notificación — carga masiva
  const [bulkPriority, setBulkPriority] = useState("baja");
  const [bulkNotify, setBulkNotify] = useState(false);
  const fileInputRef = useRef(null);
  const uploadCoverRef = useRef(null);
  const bulkFileInputRef = useRef(null);
  const bulkCoverRefs = useRef({}); // refs por índice para inputs de portada bulk

  // Cargar archivo como blob para preview autenticado
  useEffect(() => {
    if (!previewFile) {
      setPreviewBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      setContentFullscreen(false);
      return;
    }
    const url = getFileUrl(previewFile);
    if (!url || (!isImage(previewFile.fileMimeType) && !isPdf(previewFile.fileMimeType))) return;
    let revoked = false;
    setPreviewLoading(true);
    setPreviewBlobUrl(null);
    fetch(url, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        if (!revoked) setPreviewBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => { if (!revoked) setPreviewBlobUrl(null); })
      .finally(() => { if (!revoked) setPreviewLoading(false); });
    return () => {
      revoked = true;
      setPreviewLoading(false);
    };
  }, [previewFile]);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/biblioteca`, { credentials: "include" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Error al cargar");
      setFiles(json.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    const fileId = String(pendingOpenFileId || "").trim();
    if (!fileId || loading) return;
    const match = files.find((entry) => entry.id === fileId);
    if (match) {
      if (match.area) setAreaFilter(match.area);
      setPreviewFile(match);
    }
    onPendingOpenFileConsumed?.();
  }, [files, loading, onPendingOpenFileConsumed, pendingOpenFileId]);

  const areas = useMemo(() => {
    const set = new Set([...PREDEFINED_AREAS, ...files.map((f) => f.area || "General")]);
    return Array.from(set);
  }, [files]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return files.filter((f) => {
      const matchArea = f.area === areaFilter;
      const matchSearch = !q ||
        f.originalName?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.area?.toLowerCase().includes(q);
      return matchArea && matchSearch;
    });
  }, [files, search, areaFilter]);

  const groupedByArea = useMemo(() => {
    const map = new Map();
    filtered.forEach((f) => {
      const area = f.area || "General";
      if (!map.has(area)) map.set(area, []);
      map.get(area).push(f);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function getCoverUrl(f) {
    if (f?.coverFileName) return `${API_BASE}/biblioteca/files/${encodeURIComponent(f.coverFileName)}`;
    return f?.fileThumbUrl || null;
  }

  useEffect(() => {
    const previewUrls = filtered
      .map((file) => {
        if (isImage(file.fileMimeType)) return file.fileThumbUrl || getFileUrl(file);
        return getCoverUrl(file);
      })
      .filter(Boolean)
      .slice(0, 48);

    previewUrls.forEach((url) => {
      const img = new Image();
      img.decoding = "sync";
      img.fetchPriority = "high";
      img.src = url;
    });
  }, [filtered]);

  async function handleCoverFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !coverUploadId) return;
    setCoverUploading(true);
    try {
      const form = new FormData();
      form.append("cover", file);
      const res = await fetch(`${API_BASE}/biblioteca/${coverUploadId}/cover`, {
        method: "PATCH",
        credentials: "include",
        body: form,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Error al subir portada");
      setFiles((prev) => prev.map((f) => (f.id === coverUploadId ? json.data : f)));
    } catch (err) {
      console.error("[cover upload]", err.message);
    } finally {
      setCoverUploading(false);
      setCoverUploadId(null);
    }
  }

  async function handleDeleteCover(fileId) {
    try {
      const res = await fetch(`${API_BASE}/biblioteca/${fileId}/cover`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (json.ok) setFiles((prev) => prev.map((f) => (f.id === fileId ? json.data : f)));
    } catch (err) {
      console.error("[cover delete]", err.message);
    }
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    const resolvedArea = uploadArea === "__custom__" ? uploadCustomArea.trim() || "General" : uploadArea;
    const form = new FormData();
    form.append("file", uploadFile);
    form.append("area", resolvedArea);
    form.append("description", uploadDescription);
    form.append("priority", uploadPriority);
    form.append("notifyPlayers", String(uploadNotify));
    try {
      const res = await fetch(`${API_BASE}/biblioteca`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Error al subir");
      let entry = json.data;
      // Subir portada si se seleccionó una
      if (uploadCoverFile && entry?.id) {
        const coverForm = new FormData();
        coverForm.append("cover", uploadCoverFile);
        const coverRes = await fetch(`${API_BASE}/biblioteca/${entry.id}/cover`, {
          method: "PATCH",
          credentials: "include",
          body: coverForm,
        });
        const coverJson = await coverRes.json();
        if (coverJson.ok) entry = coverJson.data;
      }
      setFiles((prev) => [...prev, entry]);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadCoverFile(null);
      setUploadDescription("");
      setUploadArea(areaFilter);
      setUploadCustomArea("");
      setUploadPriority("baja");
      setUploadNotify(false);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`${API_BASE}/biblioteca/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Error al eliminar");
      setFiles((prev) => prev.filter((f) => f.id !== deleteId));
    } finally {
      setDeleteId(null);
    }
  }

  function openRenameModal(file) {
    setRenameTarget(file);
    setRenameDraft(String(file?.originalName || ""));
    setRenameError("");
  }

  async function handleRenameFileName() {
    if (!renameTarget?.id) return;
    const nextName = String(renameDraft || "").replaceAll(/\s+/g, " ").trim();
    if (!nextName) {
      setRenameError("Escribe un nombre válido.");
      return;
    }
    if (nextName.length > 220) {
      setRenameError("El nombre no puede exceder 220 caracteres.");
      return;
    }

    setRenaming(true);
    setRenameError("");
    try {
      const res = await fetch(`${API_BASE}/biblioteca/${renameTarget.id}/name`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName: nextName }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "No se pudo actualizar el nombre.");

      setFiles((prev) => prev.map((file) => (file.id === renameTarget.id ? json.data : file)));
      setPreviewFile((current) => (current?.id === renameTarget.id ? json.data : current));
      setRenameTarget(null);
      setRenameDraft("");
    } catch (err) {
      setRenameError(err.message || "No se pudo actualizar el nombre.");
    } finally {
      setRenaming(false);
    }
  }

  const existingAreas = useMemo(() => {
    const set = new Set([...PREDEFINED_AREAS, ...files.map((f) => f.area || "General").filter(Boolean)]);
    return Array.from(set);
  }, [files]);

  async function handleBulkUpload() {
    if (!bulkFiles.length) return;
    const resolvedArea = bulkArea === "__custom__" ? bulkCustomArea.trim() || "General" : bulkArea;
    setBulkUploading(true);
    setBulkErrors([]);
    setBulkProgress({ done: 0, total: bulkFiles.length });
    const added = [];
    const errors = [];
    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      const form = new FormData();
      form.append("file", file);
      form.append("area", resolvedArea);
      form.append("priority", bulkPriority);
      form.append("notifyPlayers", i === 0 ? String(bulkNotify) : "false");
      try {
        const res = await fetch(`${API_BASE}/biblioteca`, { method: "POST", credentials: "include", body: form });
        const json = await res.json();
        if (!json.ok) throw new Error(json.message || "Error");
        let entry = json.data;
        // Subir portada individual si se asignó
        const coverFile = bulkCovers[i];
        if (coverFile && entry?.id) {
          const coverForm = new FormData();
          coverForm.append("cover", coverFile);
          const coverRes = await fetch(`${API_BASE}/biblioteca/${entry.id}/cover`, {
            method: "PATCH",
            credentials: "include",
            body: coverForm,
          });
          const coverJson = await coverRes.json();
          if (coverJson.ok) entry = coverJson.data;
        }
        added.push(entry);
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
      setBulkProgress({ done: i + 1, total: bulkFiles.length });
    }
    if (added.length) setFiles((prev) => [...prev, ...added]);
    setBulkErrors(errors);
    setBulkUploading(false);
    if (!errors.length) {
      setBulkOpen(false);
      setBulkFiles([]);
      setBulkCovers({});
      setBulkArea(areaFilter);
      setBulkCustomArea("");
      setBulkPriority("baja");
      setBulkNotify(false);
    }
  }

  return (
    <div className="biblioteca-page">
      {/* Header bar */}
      <div className="biblioteca-toolbar">
        <div className="biblioteca-search-wrap">
          <Search size={15} className="biblioteca-search-icon" />
          <input
            className="biblioteca-search"
            type="text"
            placeholder="Buscar archivo, área o descripción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button type="button" className="biblioteca-search-clear" onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          ) : null}
        </div>

        {canUpload ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="primary-button sm-button" onClick={() => { setUploadArea(areaFilter); setUploadOpen(true); }}>
              <Upload size={14} /> Subir archivo
            </button>
            <button type="button" className="primary-button sm-button" onClick={() => { setBulkArea(areaFilter); setBulkOpen(true); }} title="Carga masiva">
              <FolderUp size={14} /> Carga masiva
            </button>
          </div>
        ) : null}
      </div>

      {/* Tabs de área (hojas) */}
      <div className="biblioteca-area-tabs">
        {areas.map((a) => (
          <button
            key={a}
            type="button"
            className={`biblioteca-area-tab${areaFilter === a && !showWelcome ? " active" : ""}`}
            onClick={() => { setAreaFilter(a); setShowWelcome(false); }}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Welcome image — shown until user picks a tab */}
      {showWelcome ? (
        <div className="biblioteca-welcome-cover">
          <img src={bibliotecaWelcome} alt="Biblioteca" className="biblioteca-welcome-img" />
        </div>
      ) : loading ? (
        <div className="biblioteca-loading">
          <Loader2 size={24} className="spin" />
          <span>Cargando biblioteca…</span>
        </div>
      ) : error ? (
        <div className="biblioteca-error">
          <p>{error}</p>
          <button type="button" className="primary-button sm-button" onClick={fetchFiles}>Reintentar</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="biblioteca-empty">
          <BookOpen size={40} />
          <p>{files.length === 0 ? "La biblioteca está vacía." : "No hay archivos que coincidan con la búsqueda."}</p>
          {canUpload && files.length === 0 ? (
            <button type="button" className="primary-button sm-button" onClick={() => { setUploadArea(areaFilter); setUploadOpen(true); }}>
              <Upload size={14} /> Subir primer archivo
            </button>
          ) : null}
        </div>
      ) : (
        <div className="biblioteca-groups">
          {groupedByArea.map(([area, areaFiles]) => (
            <section key={area} className="biblioteca-area-section">
              <h3 className="biblioteca-area-title">{area} <span>{areaFiles.length}</span></h3>
              <div className="biblioteca-files-grid">
                {areaFiles.map((f) => {
                  const coverUrl = getCoverUrl(f);
                  return (
                    <div key={f.id} className="biblioteca-file-card">
                      <button
                        type="button"
                        className="biblioteca-file-preview-btn"
                        onClick={() => setPreviewFile(f)}
                        title="Ver archivo"
                      >
                        {isImage(f.fileMimeType) ? (
                          <img src={f.fileThumbUrl || getFileUrl(f)} alt={f.originalName} className="biblioteca-thumb" loading="eager" decoding="sync" fetchPriority="high" />
                        ) : coverUrl ? (
                          <img src={coverUrl} alt={`Portada de ${f.originalName}`} className="biblioteca-thumb biblioteca-thumb-cover" loading="eager" decoding="sync" fetchPriority="high" />
                        ) : (
                          <div className="biblioteca-file-icon">
                            <FileText size={28} />
                            <span className="biblioteca-mime-badge">{mimeLabel(f.fileMimeType)}</span>
                          </div>
                        )}
                      </button>
                      <div className="biblioteca-file-info">
                        <p className="biblioteca-file-name" title={f.originalName}>{f.originalName}</p>
                        {f.description ? <p className="biblioteca-file-desc">{f.description}</p> : null}
                        <p className="biblioteca-file-meta">{formatDate(f.uploadedAt)} · {formatBytes(f.bytes)}</p>
                      </div>
                      <div className="biblioteca-file-actions">
                        <a href={getFileUrl(f)} target="_blank" rel="noopener noreferrer" className="icon-button" title="Abrir en pestaña">
                          <ExternalLink size={13} />
                        </a>
                        <a href={getFileUrl(f)} download={f.originalName} className="icon-button" title="Descargar">
                          <Download size={13} />
                        </a>
                        {canUpload && !isImage(f.fileMimeType) ? (
                          <button
                            type="button"
                            className="icon-button"
                            title={coverUrl ? "Cambiar portada" : "Subir portada"}
                            disabled={coverUploading && coverUploadId === f.id}
                            onClick={() => { setCoverUploadId(f.id); coverInputRef.current?.click(); }}
                          >
                            <Upload size={13} />
                          </button>
                        ) : null}
                        {canUpload && !isImage(f.fileMimeType) && coverUrl ? (
                          <button
                            type="button"
                            className="icon-button danger"
                            title="Quitar portada"
                            onClick={() => handleDeleteCover(f.id)}
                          >
                            <X size={13} />
                          </button>
                        ) : null}
                        {canRenameName ? (
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openRenameModal(f)}
                            title="Editar nombre"
                          >
                            <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>✎</span>
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="icon-button danger"
                            style={{ marginLeft: "auto" }}
                            onClick={() => setDeleteId(f.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Input oculto para subir portada */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleCoverFileChange}
      />

      {/* Preview modal */}
      {previewFile ? (
        <div className="biblioteca-preview-backdrop" onClick={() => setPreviewFile(null)}>
          <div className="biblioteca-preview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="biblioteca-preview-header">
              <span className="biblioteca-preview-title">{previewFile.originalName}</span>
              <div className="biblioteca-preview-header-actions">
                <button
                  type="button"
                  className="icon-button"
                  title={contentFullscreen ? "Reducir" : "Expandir archivo"}
                  onClick={() => setContentFullscreen((v) => !v)}
                >
                  {contentFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                <a
                  href={getFileUrl(previewFile)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-button"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink size={15} />
                </a>
                <a href={getFileUrl(previewFile)} download={previewFile.originalName} className="icon-button" title="Descargar">
                  <Download size={15} />
                </a>
                <button type="button" className="icon-button" onClick={() => setPreviewFile(null)} title="Cerrar">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="biblioteca-preview-body">
              {contentFullscreen ? (
                <div className="biblioteca-fullscreen-toolbar">
                  <button type="button" className="biblioteca-fullscreen-close" onClick={() => setContentFullscreen(false)} title="Salir de pantalla completa">
                    <Minimize2 size={16} /> Salir
                  </button>
                  <button type="button" className="biblioteca-fullscreen-close" onClick={() => setPreviewFile(null)} title="Cerrar">
                    <X size={16} /> Cerrar
                  </button>
                </div>
              ) : null}
              {previewLoading ? (
                <div className="biblioteca-loading"><Loader2 size={24} className="spin" /><span>Cargando…</span></div>
              ) : isImage(previewFile.fileMimeType) ? (
                <img
                  src={previewBlobUrl || getFileUrl(previewFile)}
                  alt={previewFile.originalName}
                  className={contentFullscreen ? "biblioteca-content-fullscreen" : "biblioteca-preview-img"}
                />
              ) : isPdf(previewFile.fileMimeType) ? (
                <embed
                  src={previewBlobUrl || getFileUrl(previewFile)}
                  type="application/pdf"
                  className={contentFullscreen ? "biblioteca-content-fullscreen" : "biblioteca-preview-iframe"}
                />
              ) : (
                <div className="biblioteca-preview-unsupported">
                  <FileText size={48} />
                  <p>Vista previa no disponible para este tipo de archivo.</p>
                  <a
                    href={getFileUrl(previewFile)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-button sm-button"
                  >
                    <ExternalLink size={14} /> Abrir en nueva pestaña
                  </a>
                </div>
              )}
            </div>
            {previewFile.description ? (
              <div className="biblioteca-preview-footer">{previewFile.description}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        title="Subir archivo a la biblioteca"
        confirmLabel={uploading ? "Subiendo…" : "Subir archivo"}
        onConfirm={handleUpload}
        confirmDisabled={!uploadFile || uploading}
        onClose={() => { setUploadOpen(false); setUploadFile(null); setUploadCoverFile(null); setUploadError(null); setUploadArea(areaFilter); setUploadPriority("baja"); setUploadNotify(false); }}
        className="biblioteca-upload-modal"
      >
        <div className="modal-form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="field-group">
            <label>Hoja / Sección</label>
            <select
              className="field-input"
              value={uploadArea}
              onChange={(e) => setUploadArea(e.target.value)}
            >
              {existingAreas.map((a) => <option key={a} value={a}>{a}</option>)}
              <option value="__custom__">+ Nueva sección…</option>
            </select>
          </div>
          {uploadArea === "__custom__" ? (
            <div className="field-group">
              <label>Nombre de la nueva sección</label>
              <input
                className="field-input"
                type="text"
                placeholder="Ej. Recursos Humanos"
                value={uploadCustomArea}
                onChange={(e) => setUploadCustomArea(e.target.value)}
              />
            </div>
          ) : null}
          <div className="field-group">
            <label>Descripción (opcional)</label>
            <input
              className="field-input"
              type="text"
              placeholder="Ej. HAT actualizado Q1 2026"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label>Prioridad del documento</label>
            <div className="biblioteca-priority-selector">
              {[["alta", "🔴 Alta"], ["media", "🟡 Media"], ["baja", "⚪ Baja"]].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  className={`biblioteca-priority-btn ${val}${uploadPriority === val ? " active" : ""}`}
                  onClick={() => setUploadPriority(val)}
                >{lbl}</button>
              ))}
            </div>
          </div>
          <div className="field-group biblioteca-notify-row">
            <span>Notificar a todos los players</span>
            <button
              type="button"
              role="switch"
              aria-checked={uploadNotify}
              className={`biblioteca-switch${uploadNotify ? " on" : ""}`}
              onClick={() => setUploadNotify((v) => !v)}
            />
          </div>
          <div className="field-group">
            <label>Archivo</label>
            <div className="biblioteca-upload-dropzone" onClick={() => fileInputRef.current?.click()}>
              {uploadFile ? (
                <span className="biblioteca-upload-filename"><FileText size={14} /> {uploadFile.name}</span>
              ) : (
                <span className="biblioteca-upload-placeholder"><Upload size={16} /> Haz clic para seleccionar archivo</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc,.txt"
              style={{ display: "none" }}
              onChange={(e) => { setUploadFile(e.target.files[0] || null); e.target.value = ""; }}
            />
          </div>
          <div className="field-group">
            <label>Portada (opcional) <span style={{ fontWeight: 400, color: "#8a94a0" }}>— imagen que se mostrará en la tarjeta</span></label>
            <div className="biblioteca-upload-dropzone biblioteca-cover-dropzone" onClick={() => uploadCoverRef.current?.click()}>
              {uploadCoverFile ? (
                <span className="biblioteca-upload-filename" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <img src={URL.createObjectURL(uploadCoverFile)} alt="preview" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
                  {uploadCoverFile.name}
                  <button type="button" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#dc2626" }} onClick={(e) => { e.stopPropagation(); setUploadCoverFile(null); }}><X size={13} /></button>
                </span>
              ) : (
                <span className="biblioteca-upload-placeholder"><Upload size={14} /> Seleccionar imagen de portada…</span>
              )}
            </div>
            <input
              ref={uploadCoverRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => { setUploadCoverFile(e.target.files[0] || null); e.target.value = ""; }}
            />
          </div>
          {uploadError ? <p className="biblioteca-upload-error">{uploadError}</p> : null}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={Boolean(renameTarget)}
        title="Editar nombre"
        confirmLabel={renaming ? "Guardando..." : "Guardar"}
        onConfirm={handleRenameFileName}
        confirmDisabled={renaming}
        onClose={() => {
          if (renaming) return;
          setRenameTarget(null);
          setRenameDraft("");
          setRenameError("");
        }}
        className="biblioteca-rename-modal"
      >
        <div className="modal-form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <label className="app-modal-field">
            <span>Nombre visible del archivo</span>
            <input
              type="text"
              value={renameDraft}
              onChange={(event) => {
                setRenameDraft(event.target.value);
                if (renameError) setRenameError("");
              }}
              maxLength={220}
              placeholder="Ej. ICH GUIA Q9 GESTIÓN DE RIESGO"
              autoFocus
            />
          </label>
          <p className="biblioteca-rename-helper">{renameDraft.length}/220</p>
          {renameError ? <p className="biblioteca-upload-error">{renameError}</p> : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        title="Eliminar archivo"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      >
        <p>¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.</p>
      </Modal>

      {/* Carga masiva */}
      <Modal
        open={bulkOpen}
        title="Carga masiva de archivos"
        confirmLabel={bulkUploading ? `Subiendo ${bulkProgress.done}/${bulkProgress.total}…` : "Subir todos"}
        onConfirm={handleBulkUpload}
        confirmDisabled={!bulkFiles.length || bulkUploading}
        onClose={() => { if (!bulkUploading) { setBulkOpen(false); setBulkFiles([]); setBulkCovers({}); setBulkErrors([]); setBulkArea(areaFilter); setBulkCustomArea(""); setBulkPriority("baja"); setBulkNotify(false); } }}
        className="biblioteca-upload-modal"
      >
        <div className="modal-form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="field-group">
            <label>Hoja / Sección para todos los archivos</label>
            <select className="field-input" value={bulkArea} onChange={(e) => setBulkArea(e.target.value)}>
              {existingAreas.map((a) => <option key={a} value={a}>{a}</option>)}
              <option value="__custom__">+ Nueva sección…</option>
            </select>
          </div>
          {bulkArea === "__custom__" ? (
            <div className="field-group">
              <label>Nombre de la nueva sección</label>
              <input className="field-input" type="text" placeholder="Ej. Normas Internas" value={bulkCustomArea} onChange={(e) => setBulkCustomArea(e.target.value)} />
            </div>
          ) : null}
          <div className="field-group">
            <label>Prioridad de los archivos</label>
            <div className="biblioteca-priority-selector">
              {[["alta", "🔴 Alta"], ["media", "🟡 Media"], ["baja", "⚪ Baja"]].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  className={`biblioteca-priority-btn ${val}${bulkPriority === val ? " active" : ""}`}
                  onClick={() => setBulkPriority(val)}
                >{lbl}</button>
              ))}
            </div>
          </div>
          <div className="field-group biblioteca-notify-row">
            <span>Notificar a todos los players</span>
            <button
              type="button"
              role="switch"
              aria-checked={bulkNotify}
              className={`biblioteca-switch${bulkNotify ? " on" : ""}`}
              onClick={() => setBulkNotify((v) => !v)}
            />
          </div>
          <div className="field-group">
            <label>Archivos ({bulkFiles.length} seleccionados)</label>
            <div
              className="biblioteca-upload-dropzone"
              onClick={() => !bulkFiles.length && bulkFileInputRef.current?.click()}
              style={bulkFiles.length ? { cursor: "default", padding: "0.5rem" } : {}}
            >
              {bulkFiles.length ? (
                <div className="biblioteca-bulk-list">
                  {bulkFiles.map((f, i) => (
                    <div key={i} className="biblioteca-bulk-item-row">
                      <FileText size={12} />
                      <span className="biblioteca-bulk-item-name">{f.name}</span>
                      {bulkCovers[i] ? (
                        <span className="biblioteca-bulk-cover-preview">
                          <img src={URL.createObjectURL(bulkCovers[i])} alt="portada" style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 3 }} />
                          <button type="button" className="biblioteca-bulk-cover-clear" onClick={() => setBulkCovers((prev) => { const next = { ...prev }; delete next[i]; return next; })}><X size={10} /></button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="biblioteca-bulk-cover-btn"
                          title="Agregar portada"
                          onClick={() => { bulkCoverRefs.current[i]?.click(); }}
                        ><Upload size={11} /> portada</button>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: "none" }}
                        ref={(el) => { bulkCoverRefs.current[i] = el; }}
                        onChange={(e) => { const file = e.target.files[0]; if (file) setBulkCovers((prev) => ({ ...prev, [i]: file })); e.target.value = ""; }}
                      />
                    </div>
                  ))}
                  <button type="button" className="biblioteca-bulk-add-more" onClick={() => bulkFileInputRef.current?.click()}>
                    <FolderUp size={13} /> Cambiar selección
                  </button>
                </div>
              ) : (
                <span className="biblioteca-upload-placeholder"><FolderUp size={16} /> Haz clic para seleccionar archivos (puedes seleccionar varios)</span>
              )}
            </div>
            <input
              ref={bulkFileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc,.txt"
              style={{ display: "none" }}
              onChange={(e) => { setBulkFiles(Array.from(e.target.files)); setBulkCovers({}); e.target.value = ""; }}
            />
          </div>
          {bulkUploading ? (
            <div className="biblioteca-bulk-progress">
              <div className="biblioteca-bulk-bar" style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }} />
              <span>{bulkProgress.done} de {bulkProgress.total} archivos</span>
            </div>
          ) : null}
          {bulkErrors.length ? (
            <div className="biblioteca-upload-error">
              {bulkErrors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
