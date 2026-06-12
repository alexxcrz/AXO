import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { isImageMedia, isVideoMedia, MediaLightbox } from "./MediaLightbox.jsx";
import {
  normalizeOperationalInspectionTemplate,
  resolveInspectionSiteKeys,
} from "../utils/operationalInspectionTemplate";
import { formatDateTime } from "../utils/utilidades.jsx";

function normalizeInspectionRecord(record) {
  const safeRecord = record && typeof record === "object" ? record : {};
  const template = normalizeOperationalInspectionTemplate(safeRecord.template);
  const fallbackDraft = safeRecord.draft && typeof safeRecord.draft === "object"
    ? safeRecord.draft
    : { metadata: {}, checks: {}, observations: "" };
  const bySiteDrafts = safeRecord.bySiteDrafts && typeof safeRecord.bySiteDrafts === "object"
    ? safeRecord.bySiteDrafts
    : {};
  const siteKeys = resolveInspectionSiteKeys(safeRecord, template);
  return {
    ...safeRecord,
    template,
    draft: fallbackDraft,
    bySiteDrafts,
    siteKeys,
    incidencias: Array.isArray(safeRecord.incidencias) ? safeRecord.incidencias : [],
  };
}

function getCheckStatusLabel(status) {
  if (status === "no_ok") return "NO OK";
  if (status === "ok") return "OK";
  if (status === "na") return "N/A";
  return "Pendiente";
}

function getCheckStatusColor(status) {
  if (status === "no_ok") return "#b91c1c";
  if (status === "ok") return "#2d4f72";
  if (status === "na") return "#475569";
  return "#9ca3af";
}

function isImageEvidence(item = {}) {
  return String(item?.mimeType || "").toLowerCase().startsWith("image/")
    || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(item?.name || item?.url || ""));
}

function isVideoEvidence(item = {}) {
  return String(item?.mimeType || "").toLowerCase().startsWith("video/")
    || /\.(mp4|mov|webm|ogg|m4v)$/i.test(String(item?.name || item?.url || ""));
}

function formatInspectionDate(value) {
  if (!value) return "N/A";
  const formatted = formatDateTime(value);
  return formatted === "-" ? String(value) : formatted;
}

export default function OperationalInspectionRecordModal({
  open,
  onClose,
  record,
  activityLabel,
}) {
  const resolvedRecord = useMemo(() => normalizeInspectionRecord(record), [record]);
  const [activeSite, setActiveSite] = useState("");
  const [mediaLightbox, setMediaLightbox] = useState(null);
  const showSiteTabs = resolvedRecord.siteKeys.length > 1 || Boolean(resolvedRecord.multiSite);

  useEffect(() => {
    if (activeSite && resolvedRecord.siteKeys.includes(activeSite)) return;
    setActiveSite(resolvedRecord.siteKeys[0] || "GENERAL");
  }, [activeSite, resolvedRecord.siteKeys]);

  const currentSiteKey = activeSite || resolvedRecord.siteKeys[0] || "GENERAL";
  const currentDraft = resolvedRecord.bySiteDrafts[currentSiteKey] && typeof resolvedRecord.bySiteDrafts[currentSiteKey] === "object"
    ? resolvedRecord.bySiteDrafts[currentSiteKey]
    : resolvedRecord.draft;
  const completedAtLabel = formatInspectionDate(resolvedRecord.completedAt || currentDraft?.metadata?.date);

  async function handleExportPdf() {
    const { template, completedAt, completedByName } = resolvedRecord;
    const { loadJsPdfWithAutoTable } = await import("../utils/jspdfLoader.js");
    const { jsPDF, autoTable } = await loadJsPdfWithAutoTable();
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    pdf.setFontSize(15);
    pdf.text(`Checklist realizado${activityLabel ? ` · ${activityLabel}` : ""}`, 36, 40);
    pdf.setFontSize(9);
    pdf.text(`Plantilla: ${template.name}`, 36, 58);
    pdf.text(`Completado por: ${String(completedByName || resolvedRecord.draft?.metadata?.responsable || "N/A")}`, 36, 72);
    pdf.text(`Fecha: ${formatInspectionDate(completedAt || resolvedRecord.draft?.metadata?.date)}`, 36, 86);

    const body = [];
    resolvedRecord.siteKeys.forEach((siteKey) => {
      const siteDraft = resolvedRecord.bySiteDrafts[siteKey] && typeof resolvedRecord.bySiteDrafts[siteKey] === "object"
        ? resolvedRecord.bySiteDrafts[siteKey]
        : resolvedRecord.draft;
      template.sections.forEach((section) => {
        section.checks.forEach((check) => {
          const checkState = siteDraft?.checks?.[check.id] || {};
          const photos = Array.isArray(checkState.photos) ? checkState.photos : [];
          body.push([
            siteKey,
            section.title,
            check.label,
            getCheckStatusLabel(checkState.status),
            String(checkState.notes || "").trim() || "-",
            String(checkState.site || siteKey || "").trim() || "-",
            photos.map((photo) => String(photo?.url || "").trim()).filter(Boolean).join("\n") || "-",
          ]);
        });
      });
    });

    autoTable(pdf, {
      startY: 104,
      head: [["Nave", "Sección", "Check", "Resultado", "Observación", "Nave afectada", "Evidencias"]],
      body,
      styles: { fontSize: 7, cellPadding: 4, valign: "top" },
      headStyles: { fillColor: [3, 33, 33], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 120 },
        2: { cellWidth: 55 },
        3: { cellWidth: 100 },
        4: { cellWidth: 55 },
        5: { cellWidth: 95 },
      },
      margin: { left: 24, right: 24 },
    });

    if (String(currentDraft?.observations || "").trim()) {
      const finalY = (pdf.lastAutoTable?.finalY || 104) + 20;
      pdf.setFontSize(10);
      pdf.text("Observaciones generales", 36, finalY);
      pdf.setFontSize(8);
      pdf.text(String(currentDraft.observations).trim(), 36, finalY + 14, { maxWidth: 520 });
    }

    pdf.save(`checklist_${String(activityLabel || template.name || "operativo").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.pdf`);
  }

  return (
    <>
      <Modal
        open={open}
        title={`Checklist realizado${activityLabel ? ` · ${activityLabel}` : ""}`}
        onClose={onClose}
        onConfirm={onClose}
        confirmLabel="Cerrar"
        cancelLabel=""
        hideCancel
        footerActions={(
          <button type="button" className="icon-button" onClick={() => { void handleExportPdf(); }}>
            Exportar PDF
          </button>
        )}
        className="operational-inspection-modal inspection-record-modal"
      >
        <div className="inspection-record-body">
          <div className="inspection-record-summary">
            <div className="surface-card inspection-record-summary-card">
              <strong>Área</strong>
              <div>{String(currentDraft?.metadata?.area || "N/A")}</div>
            </div>
            <div className="surface-card inspection-record-summary-card">
              <strong>Fecha</strong>
              <div title={String(resolvedRecord.completedAt || currentDraft?.metadata?.date || "")}>{completedAtLabel}</div>
            </div>
            <div className="surface-card inspection-record-summary-card">
              <strong>Responsable</strong>
              <div>{String(resolvedRecord.completedByName || currentDraft?.metadata?.responsable || "N/A")}</div>
            </div>
            <div className="surface-card inspection-record-summary-card">
              <strong>Incidencias</strong>
              <div>{resolvedRecord.incidencias.length}</div>
            </div>
          </div>

          {showSiteTabs ? (
            <div className="history-area-tabs inspection-record-site-tabs">
              {resolvedRecord.siteKeys.map((siteKey) => {
                const siteDraft = resolvedRecord.bySiteDrafts[siteKey] && typeof resolvedRecord.bySiteDrafts[siteKey] === "object"
                  ? resolvedRecord.bySiteDrafts[siteKey]
                  : resolvedRecord.draft;
                const siteNoOk = Object.values(siteDraft?.checks || {}).filter((entry) => entry?.status === "no_ok").length;
                const siteCompleted = Array.isArray(resolvedRecord.completedSites)
                  ? resolvedRecord.completedSites.map((site) => String(site || "").trim().toUpperCase()).includes(siteKey)
                  : false;
                return (
                  <button
                    key={siteKey}
                    type="button"
                    className={`tab ${currentSiteKey === siteKey ? "active" : ""}`}
                    onClick={() => setActiveSite(siteKey)}
                  >
                    {siteKey}{siteNoOk ? ` (${siteNoOk})` : siteCompleted ? " (Hecha)" : ""}
                  </button>
                );
              })}
            </div>
          ) : null}

          {resolvedRecord.template.sections.map((section) => (
            <article key={section.id} className="inspection-record-section">
              <div className="board-meta-inline created-board-card-meta" style={{ margin: 0 }}>
                <strong>{section.title}</strong>
                <span>{section.incidenceCategory || "Otro"}</span>
              </div>
              <div className="inspection-record-check-list">
                {section.checks.map((check) => {
                  const current = currentDraft?.checks?.[check.id] || { status: "pending", notes: "", severity: "media", photos: [], site: "" };
                  const photos = Array.isArray(current.photos) ? current.photos : [];
                  return (
                    <div key={check.id} className="inspection-record-check-item">
                      <div className="inspection-record-check-head">
                        <span>{check.label}</span>
                        <strong style={{ color: getCheckStatusColor(current.status) }}>{getCheckStatusLabel(current.status)}</strong>
                      </div>

                      {String(current.notes || "").trim() ? (
                        <div>
                          <strong>Detalle</strong>
                          <div>{String(current.notes || "").trim()}</div>
                        </div>
                      ) : null}

                      {String(current.site || "").trim() ? (
                        <div>
                          <strong>Nave afectada</strong>
                          <div>{String(current.site || "").trim()}</div>
                        </div>
                      ) : null}

                      {photos.length ? (
                        <div className="inspection-record-evidence-grid">
                          {photos.map((photo) => (
                            <button
                              key={photo.id}
                              type="button"
                              className="inspection-record-evidence-btn"
                              onClick={() => {
                                const gallery = photos.filter((item) => isImageMedia(item) || isVideoMedia(item));
                                const startIndex = gallery.findIndex((item) => item.id === photo.id);
                                setMediaLightbox({ items: gallery, startIndex: startIndex >= 0 ? startIndex : 0 });
                              }}
                            >
                              {isImageEvidence(photo) ? (
                                <img src={photo.thumbnailUrl || photo.url} alt={photo.name || "Evidencia"} />
                              ) : isVideoEvidence(photo) ? (
                                <video src={photo.url} poster={photo.thumbnailUrl || undefined} muted playsInline preload="metadata" />
                              ) : (
                                <div className="inspection-record-evidence-file">Archivo</div>
                              )}
                              <small>{photo.name || "Archivo"}</small>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}

          {String(currentDraft?.observations || "").trim() ? (
            <label className="inspection-record-observations">
              <span>Observaciones generales</span>
              <div className="surface-card inspection-record-observations-copy">{String(currentDraft.observations).trim()}</div>
            </label>
          ) : null}
        </div>
      </Modal>

      {mediaLightbox ? (
        <MediaLightbox
          items={mediaLightbox.items}
          startIndex={mediaLightbox.startIndex}
          onClose={() => setMediaLightbox(null)}
        />
      ) : null}
    </>
  );
}
