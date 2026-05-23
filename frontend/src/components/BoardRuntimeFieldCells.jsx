import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, Plus, Upload } from "lucide-react";
import { createPortal } from "react-dom";
import { Modal } from "./Modal";
import { uploadFileToCloudinary } from "../services/upload.service";
import { normalizeBoardEvidenceValue, normalizeBoardMultiSelectDetailValue } from "../utils/utilidades.jsx";

function isImageEvidence(evidence) {
  return String(evidence?.mimeType || "").toLowerCase().startsWith("image/");
}

function isVideoEvidence(evidence) {
  return String(evidence?.mimeType || "").toLowerCase().startsWith("video/");
}

export function BoardMultiSelectDetailCell({ field, value, options, disabled, onChange }) {
  const selections = normalizeBoardMultiSelectDetailValue(value);
  const selectedMap = useMemo(() => new Map(selections.map((item) => [item.option, item])), [selections]);

  function handleToggleOption(option) {
    const optionValue = String(option.value || "").trim();
    if (!optionValue) return;
    if (selectedMap.has(optionValue)) {
      onChange(selections.filter((item) => item.option !== optionValue));
      return;
    }
    onChange([...selections, { option: optionValue, label: option.label || optionValue, detail: "" }]);
  }

  function handleDetailChange(option, detail) {
    const optionValue = String(option.value || "").trim();
    onChange(selections.map((item) => (item.option === optionValue ? { ...item, label: option.label || optionValue, detail } : item)));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.18rem", minWidth: 0 }}>
      {(options || []).map((option) => {
        const optionValue = String(option.value || "").trim();
        const selectedItem = selectedMap.get(optionValue) || null;
        const isSelected = Boolean(selectedItem);
        return (
          <div key={optionValue} style={{ border: "1px solid rgba(162, 170, 181, 0.16)", borderRadius: "0.55rem", padding: "0.16rem 0.24rem", display: "grid", gap: "0.12rem", background: isSelected ? "rgba(49, 77, 105, 0.03)" : "#ffffff" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.24rem", fontSize: "0.66rem", fontWeight: 600, color: "#244040", lineHeight: 1.1 }}>
              <input type="checkbox" checked={isSelected} onChange={() => handleToggleOption(option)} disabled={disabled} style={{ width: "14px", height: "14px", margin: 0 }} />
              <span>{option.label || optionValue}</span>
            </label>
            {isSelected ? (
              <input
                type="text"
                inputMode="text"
                value={selectedItem?.detail || ""}
                onChange={(event) => handleDetailChange(option, event.target.value)}
                placeholder={field.placeholder || "Dato adicional"}
                disabled={disabled}
                style={{ width: "100%", minHeight: "24px", fontSize: "0.66rem", padding: "0.16rem 0.3rem", borderRadius: "0.46rem" }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function BoardEditableInventoryPropertyInput({ value, suggestions, disabled, placeholder, title, onChange }) {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const normalizedValue = String(value || "");
  const [draftValue, setDraftValue] = useState(normalizedValue);
  const normalizedSuggestions = useMemo(
    () => (Array.isArray(suggestions) ? suggestions.map((item) => String(item || "").trim()).filter(Boolean) : []),
    [suggestions],
  );
  const filteredSuggestions = useMemo(() => {
    const search = draftValue.trim().toLowerCase();
    if (!search) return normalizedSuggestions;
    return normalizedSuggestions.filter((option) => option.toLowerCase().includes(search));
  }, [draftValue, normalizedSuggestions]);

  useEffect(() => {
    setDraftValue(normalizedValue);
  }, [normalizedValue]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen || !rootRef.current) return undefined;

    function updateDropdownPosition() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const estimatedHeight = Math.min(240, Math.max(56, filteredSuggestions.length * 36 + 18));
      const spaceBelow = Math.max(0, globalThis.innerHeight - rect.bottom - 8);
      const spaceAbove = Math.max(0, rect.top - 8);
      // Only open above if there is very little space below AND more space above.
      const shouldOpenAbove = spaceBelow < 64 && spaceAbove > spaceBelow;
      const cappedHeight = shouldOpenAbove
        ? Math.min(estimatedHeight, spaceAbove)
        : Math.min(estimatedHeight, Math.max(64, spaceBelow));

      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        top: shouldOpenAbove
          ? Math.max(8, rect.top - cappedHeight - 6)
          : rect.bottom + 6,
        maxDropdownHeight: `${cappedHeight}px`,
      });
    }

    updateDropdownPosition();
    globalThis.addEventListener("resize", updateDropdownPosition, { passive: true });
    globalThis.addEventListener("scroll", updateDropdownPosition, { capture: true, passive: true });
    return () => {
      globalThis.removeEventListener("resize", updateDropdownPosition);
      globalThis.removeEventListener("scroll", updateDropdownPosition, { capture: true });
    };
  }, [filteredSuggestions.length, isOpen]);

  function commitDraft(nextValue = draftValue) {
    const normalizedNextValue = String(nextValue || "");
    setDraftValue(normalizedNextValue);
    if (normalizedNextValue !== normalizedValue) {
      onChange(normalizedNextValue);
    }
  }

  return (
    <div ref={rootRef} style={{ position: "relative", minWidth: 0 }}>
      <input
        type="text"
        value={draftValue}
        onFocus={() => !disabled && filteredSuggestions.length && setIsOpen(true)}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);
          if (!disabled && normalizedSuggestions.length) {
            setIsOpen(true);
          }
        }}
        onBlur={() => commitDraft()}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commitDraft();
          setIsOpen(false);
        }}
        placeholder={placeholder}
        title={title}
        disabled={disabled}
        style={{ width: "100%", paddingRight: normalizedSuggestions.length ? "2rem" : undefined }}
      />
      {normalizedSuggestions.length ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => !disabled && setIsOpen((current) => !current)}
          disabled={disabled}
          aria-label="Mostrar opciones"
          title="Mostrar opciones"
          style={{
            position: "absolute",
            right: "0.38rem",
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: "#5c6f74",
            fontSize: "0.82rem",
            lineHeight: 1,
            cursor: disabled ? "default" : "pointer",
            padding: 0,
          }}
        >
          ▼
        </button>
      ) : null}
      {isOpen && filteredSuggestions.length && dropdownStyle ? createPortal(
        <div
          style={{
            ...dropdownStyle,
            zIndex: 9200,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: "0.22rem",
            maxHeight: dropdownStyle.maxDropdownHeight || "7.6rem",
            overflowY: "auto",
            padding: "0.32rem",
            border: "1px solid rgba(162, 170, 181, 0.28)",
            borderRadius: "0.7rem",
            background: "#ffffff",
            boxShadow: "0 12px 24px rgba(49, 77, 105, 0.12)",
          }}
        >
          {filteredSuggestions.map((option) => {
            const isActive = option === draftValue;
            return (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  commitDraft(option);
                  setIsOpen(false);
                }}
                style={{
                  minHeight: "2rem",
                  borderRadius: "0.58rem",
                  border: isActive ? "1px solid #3f678f" : "1px solid rgba(162, 170, 181, 0.22)",
                  background: isActive ? "rgba(42, 96, 143, 0.1)" : "#f9fbfb",
                  color: "#244040",
                  fontSize: "0.72rem",
                  fontWeight: isActive ? 700 : 600,
                  lineHeight: 1.15,
                  padding: "0.32rem 0.46rem",
                  textAlign: "left",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={option}
              >
                {option}
              </button>
            );
          })}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

export function BoardEvidenceCell({ value, disabled, onChange, label, readOnly = false }) {
  const pickerInputId = useId();
  const fileInputRef = useRef(null);
  const evidences = normalizeBoardEvidenceValue(value);
  const latestValueRef = useRef(evidences);
  const [uploading, setUploading] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(null);

  useEffect(() => {
    latestValueRef.current = normalizeBoardEvidenceValue(value);
  }, [value]);

  const displayItems = pendingItems.concat(evidences);
  const viewerItems = evidences;
  const activeViewerItem = viewerIndex === null ? null : viewerItems[viewerIndex] || null;

  async function handleFileSelection(event) {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (!files.length) return;
    setUploading(true);

    try {
      for (const file of files) {
        const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const tempUrl = URL.createObjectURL(file);
        setPendingItems((current) => current.concat([{
          id: tempId,
          url: tempUrl,
          thumbnailUrl: tempUrl,
          mimeType: file.type,
          name: file.name,
          isPending: true,
        }]));

        try {
          const uploaded = await uploadFileToCloudinary(file);
          const nextItem = {
            url: uploaded.url,
            thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
            mimeType: uploaded.fileMimeType || file.type,
            name: uploaded.originalName || file.name,
            publicId: uploaded.publicId || "",
          };
          const nextValue = latestValueRef.current.concat([nextItem]);
          latestValueRef.current = nextValue;
          onChange(nextValue);
        } finally {
          URL.revokeObjectURL(tempUrl);
          setPendingItems((current) => current.filter((item) => item.id !== tempId));
        }
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function handleOpenPicker() {
    if (disabled || readOnly) return;
    fileInputRef.current?.click();
  }

  function openViewerAt(index) {
    if (!viewerItems.length) return;
    setViewerIndex(index);
  }

  function moveViewer(step) {
    setViewerIndex((current) => {
      if (current === null || !viewerItems.length) return current;
      return (current + step + viewerItems.length) % viewerItems.length;
    });
  }

  return (
    <>
      {!readOnly ? (
        <input
          id={pickerInputId}
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFileSelection}
          disabled={disabled || uploading}
        />
      ) : null}
      <div style={{ display: "grid", gap: "0.4rem", minWidth: 0 }}>
        <label
          htmlFor={!readOnly && !disabled && !uploading ? pickerInputId : undefined}
          style={{
            width: "100%",
            minHeight: "78px",
            borderRadius: "0.82rem",
            border: "1px dashed rgba(30, 57, 81, 0.32)",
            background: "#ffffff",
            padding: "0.34rem",
            display: "grid",
            gap: "0.28rem",
            alignContent: displayItems.length ? "start" : "center",
            cursor: readOnly || disabled ? "default" : "pointer",
            overflow: "hidden",
          }}
          title={readOnly ? (label || "Evidencias") : (disabled ? label || "Evidencias" : "Agregar evidencias")}
        >
          {displayItems.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.26rem" }}>
              {displayItems.slice(0, 4).map((item, index) => {
                const previewStyle = {
                  width: "100%",
                  height: "48px",
                  borderRadius: "0.55rem",
                  objectFit: "contain",
                  background: "#f3f5f8",
                  padding: "0.18rem",
                };
                const evidenceIndex = evidences.findIndex((evidence) => evidence.url === item.url && evidence.name === item.name);
                return (
                  <div key={`${item.url}-${item.name}-${index}`} style={{ position: "relative" }}>
                    {isImageEvidence(item) ? (
                      <img src={item.thumbnailUrl || item.url} alt={item.name || "Evidencia"} style={previewStyle} />
                    ) : isVideoEvidence(item) ? (
                      <video src={item.url} poster={item.thumbnailUrl || undefined} style={previewStyle} muted playsInline preload="metadata" />
                    ) : (
                      <div style={{ ...previewStyle, display: "grid", placeItems: "center" }}><ImageIcon size={20} /></div>
                    )}
                    {!item.isPending && evidenceIndex >= 0 ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openViewerAt(evidenceIndex);
                        }}
                        style={{ position: "absolute", inset: 0, border: 0, background: "transparent", cursor: "pointer" }}
                        aria-label={`Ver evidencia ${item.name || index + 1}`}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "grid", justifyItems: "center", gap: "0.25rem", color: "#456060" }}>
              {readOnly ? (
                <strong style={{ fontSize: "0.82rem" }}>Sin evidencia</strong>
              ) : (
                <>
                  <Upload size={18} />
                  <strong style={{ fontSize: "0.82rem" }}>{uploading ? "Subiendo..." : "Agregar evidencias"}</strong>
                  <span style={{ fontSize: "0.74rem" }}>Foto o video</span>
                </>
              )}
            </div>
          )}
        </label>
        {displayItems.length && !readOnly ? (
          <button type="button" className="icon-button" onClick={handleOpenPicker} disabled={disabled || uploading}>
            <Plus size={14} /> {uploading ? "Subiendo..." : "Agregar más"}
          </button>
        ) : null}
      </div>

      <Modal
        open={viewerIndex !== null && Boolean(activeViewerItem)}
        title={label || "Evidencias"}
        onClose={() => setViewerIndex(null)}
        confirmLabel="Cerrar"
        hideCancel
        footerActions={viewerItems.length > 1 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginRight: "auto" }}>
            <button type="button" className="icon-button" onClick={() => moveViewer(-1)}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "0.82rem", color: "#5b6b73" }}>{(viewerIndex || 0) + 1} / {viewerItems.length}</span>
            <button type="button" className="icon-button" onClick={() => moveViewer(1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}
      >
        {activeViewerItem ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ minHeight: "360px", maxHeight: "65vh", display: "grid", placeItems: "center", background: "#0f1720", borderRadius: "1rem", overflow: "hidden" }}>
              {isImageEvidence(activeViewerItem) ? (
                <img src={activeViewerItem.url} alt={activeViewerItem.name || "Evidencia"} style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain" }} />
              ) : isVideoEvidence(activeViewerItem) ? (
                <video src={activeViewerItem.url} poster={activeViewerItem.thumbnailUrl || undefined} style={{ maxWidth: "100%", maxHeight: "65vh" }} controls autoPlay />
              ) : (
                <a href={activeViewerItem.url} target="_blank" rel="noreferrer" className="icon-button">Abrir archivo</a>
              )}
            </div>
            <div>
              <strong>{activeViewerItem.name || "Evidencia"}</strong>
              <p className="subtle-line" style={{ marginTop: "0.2rem" }}>{activeViewerItem.mimeType || "Archivo"}</p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
                <a href={activeViewerItem.url} target="_blank" rel="noreferrer" className="icon-button" style={{ textDecoration: "none" }}>
                  Abrir
                </a>
                <a href={activeViewerItem.url} download={activeViewerItem.name || "evidencia"} className="icon-button" style={{ textDecoration: "none" }}>
                  Descargar
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}