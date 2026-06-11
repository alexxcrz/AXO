import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "./Modal";
import { isImageMedia, isVideoMedia, MediaLightbox } from "./MediaLightbox.jsx";
import { SpanishDateInput } from "./SpanishDateInput";
import { uploadFileToCloudinary } from "../services/upload.service";
import {
  OPERATIONAL_INSPECTION_TEMPLATE,
  createOperationalInspectionDraft,
  validateOperationalInspection,
  buildIncidenciasFromOperationalInspection,
  normalizeOperationalInspectionTemplate,
} from "../utils/operationalInspectionTemplate";

const SEVERITY_OPTIONS = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Critica" },
];

function buildInitialDraft(template, currentUser, defaultArea, defaultProcess, requireIncidentSiteSelection = false) {
  const base = createOperationalInspectionDraft(template);
  const normalizedChecks = Object.fromEntries(Object.entries(base.checks || {}).map(([checkId, checkState]) => ([
    checkId,
    {
      ...checkState,
      status: "ok",
    },
  ])));
  return {
    ...base,
    metadata: {
      ...base.metadata,
      area: String(defaultArea || "").trim(),
      process: String(defaultProcess || "").trim(),
      responsable: String(currentUser?.name || "").trim(),
      requireIncidentSiteSelection: Boolean(requireIncidentSiteSelection),
    },
    checks: normalizedChecks,
  };
}

export default function OperationalInspectionStartModal({
  open,
  activityLabel,
  currentUser,
  defaultArea,
  defaultProcess,
  onClose,
  onConfirm,
  confirmBusy = false,
  requireIncidentSiteSelection = false,
  incidentSiteOptions = [],
  checklistTemplate,
  existingInspectionRecord,
  saveConfirmLabel = "",
}) {
  const resolvedTemplate = useMemo(
    () => normalizeOperationalInspectionTemplate(checklistTemplate || OPERATIONAL_INSPECTION_TEMPLATE),
    [checklistTemplate],
  );
  const [siteDrafts, setSiteDrafts] = useState({});
  const [activeSite, setActiveSite] = useState("");
  const [completedSites, setCompletedSites] = useState([]);

  const [savingEvidenceByCheckId, setSavingEvidenceByCheckId] = useState({});
  const [formError, setFormError] = useState("");
  const [mediaLightbox, setMediaLightbox] = useState(null);
  const galleryInputRefs = useRef({});
  const cameraInputRefs = useRef({});
  const hasInitializedOpenCycleRef = useRef(false);
  const normalizedIncidentSiteOptions = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(incidentSiteOptions) ? incidentSiteOptions : [])
      .map((entry) => String(entry || "").trim().toUpperCase())
      .filter((entry) => {
        if (!entry || seen.has(entry)) return false;
        seen.add(entry);
        return true;
      });
  }, [incidentSiteOptions]);

  const isMultiSiteMode = normalizedIncidentSiteOptions.length > 1;
  const singleSiteKey = "__single__";
  const currentSiteKey = isMultiSiteMode ? activeSite : singleSiteKey;
  const currentDraft = siteDrafts[currentSiteKey] || buildInitialDraft(resolvedTemplate, currentUser, defaultArea, defaultProcess, requireIncidentSiteSelection);

  const saveActionLabel = useMemo(() => {
    if (confirmBusy) return "Guardando...";
    if (String(saveConfirmLabel || "").trim()) return String(saveConfirmLabel).trim();
    if (!isMultiSiteMode) return "Guardar y finalizar";
    const alreadyCompleted = new Set(completedSites);
    alreadyCompleted.add(currentSiteKey);
    if (alreadyCompleted.size >= normalizedIncidentSiteOptions.length) return "Guardar y finalizar";
    return `Guardar ${currentSiteKey}`;
  }, [completedSites, confirmBusy, currentSiteKey, isMultiSiteMode, normalizedIncidentSiteOptions.length, saveConfirmLabel]);

  function hydrateDraft(rawDraft = null, site = "") {
    const base = buildInitialDraft(resolvedTemplate, currentUser, defaultArea, defaultProcess, requireIncidentSiteSelection);
    const source = rawDraft && typeof rawDraft === "object" ? rawDraft : {};
    const mergedChecks = { ...base.checks };
    Object.keys(mergedChecks).forEach((checkId) => {
      const sourceCheck = source?.checks?.[checkId] && typeof source.checks[checkId] === "object" ? source.checks[checkId] : null;
      if (!sourceCheck) return;
      mergedChecks[checkId] = {
        ...mergedChecks[checkId],
        ...sourceCheck,
        photos: Array.isArray(sourceCheck.photos) ? sourceCheck.photos : mergedChecks[checkId].photos,
      };
    });
    return {
      ...base,
      ...source,
      metadata: {
        ...base.metadata,
        ...(source.metadata && typeof source.metadata === "object" ? source.metadata : {}),
        site: String(site || source?.metadata?.site || "").trim().toUpperCase(),
      },
      checks: mergedChecks,
      observations: String(source.observations || "").trim(),
    };
  }

  function updateCurrentDraft(updater) {
    setSiteDrafts((prev) => {
      const previousDraft = prev[currentSiteKey] || hydrateDraft(null, isMultiSiteMode ? currentSiteKey : "");
      const nextDraft = typeof updater === "function" ? updater(previousDraft) : previousDraft;
      return {
        ...prev,
        [currentSiteKey]: nextDraft,
      };
    });
  }

  useEffect(() => {
    if (!open) {
      hasInitializedOpenCycleRef.current = false;
      return;
    }
    if (hasInitializedOpenCycleRef.current) return;

    if (isMultiSiteMode) {
      const nextDrafts = {};
      const previousBySiteDrafts = existingInspectionRecord?.bySiteDrafts && typeof existingInspectionRecord.bySiteDrafts === "object"
        ? existingInspectionRecord.bySiteDrafts
        : {};
      normalizedIncidentSiteOptions.forEach((site) => {
        nextDrafts[site] = hydrateDraft(previousBySiteDrafts[site], site);
      });
      const normalizedCompleted = Array.isArray(existingInspectionRecord?.completedSites)
        ? existingInspectionRecord.completedSites.map((site) => String(site || "").trim().toUpperCase()).filter((site) => normalizedIncidentSiteOptions.includes(site))
        : [];
      const firstPendingSite = normalizedIncidentSiteOptions.find((site) => !normalizedCompleted.includes(site)) || normalizedIncidentSiteOptions[0];
      setSiteDrafts(nextDrafts);
      setCompletedSites(normalizedCompleted);
      setActiveSite(firstPendingSite || "");
    } else {
      setSiteDrafts({
        [singleSiteKey]: hydrateDraft(existingInspectionRecord?.draft || null),
      });
      setCompletedSites(existingInspectionRecord?.draft ? [singleSiteKey] : []);
      setActiveSite(singleSiteKey);
    }
    setSavingEvidenceByCheckId({});
    setFormError("");
    hasInitializedOpenCycleRef.current = true;
  }, [
    open,
    resolvedTemplate,
    currentUser,
    defaultArea,
    defaultProcess,
    requireIncidentSiteSelection,
    existingInspectionRecord,
    isMultiSiteMode,
    normalizedIncidentSiteOptions,
  ]);



  const totalNoOk = useMemo(() => {
    return Object.values(currentDraft.checks || {}).filter((entry) => entry?.status === "no_ok").length;
  }, [currentDraft.checks]);

  function updateMetadata(key, value) {
    updateCurrentDraft((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value,
      },
    }));
  }

  function updateCheck(checkId, patch) {
    updateCurrentDraft((prev) => ({
      ...prev,
      checks: {
        ...prev.checks,
        [checkId]: {
          ...(prev.checks?.[checkId] || {
            status: Object.hasOwn(patch || {}, "notes")
              || Object.hasOwn(patch || {}, "severity")
              || Object.hasOwn(patch || {}, "photos")
              || Object.hasOwn(patch || {}, "site")
              ? "no_ok"
              : "pending",
            notes: "",
            severity: "media",
            photos: [],
            site: "",
          }),
          ...patch,
        },
      },
    }));
  }

  async function handleUploadEvidence(checkId, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const saveKey = `${currentSiteKey}:${checkId}`;
    setSavingEvidenceByCheckId((prev) => ({ ...prev, [saveKey]: true }));
    setFormError("");

    try {
      const uploaded = [];
      for (const file of files) {
        const result = await uploadFileToCloudinary(file);
        uploaded.push({
          id: result.publicId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: result.originalName || file.name,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl || result.url,
          type: file.type,
        });
      }
      updateCurrentDraft((prev) => {
        const previousPhotos = Array.isArray(prev.checks?.[checkId]?.photos) ? prev.checks[checkId].photos : [];
        return {
          ...prev,
          checks: {
            ...prev.checks,
            [checkId]: {
              ...(prev.checks?.[checkId] || { status: "no_ok", notes: "", severity: "media", photos: [], site: "" }),
              status: "no_ok",
              photos: [...previousPhotos, ...uploaded],
            },
          },
        };
      });
    } catch (error) {
      setFormError(error?.message || "No se pudo subir una evidencia.");
    } finally {
      setSavingEvidenceByCheckId((prev) => ({ ...prev, [saveKey]: false }));
    }
  }

  async function handleConfirm() {
    const validation = validateOperationalInspection(currentDraft, resolvedTemplate);
    if (!validation.ok) {
      setFormError(validation.errors[0] || "Completa la inspeccion antes de continuar.");
      return;
    }

    const incidencias = buildIncidenciasFromOperationalInspection({
      draft: currentDraft,
      template: resolvedTemplate,
      currentUser,
    });

    setFormError("");

    try {
      if (isMultiSiteMode) {
        const nextCompletedSites = Array.from(new Set([...completedSites, currentSiteKey]));
        const shouldFinalize = nextCompletedSites.length >= normalizedIncidentSiteOptions.length;
        const nextBySiteDrafts = {
          ...siteDrafts,
          [currentSiteKey]: currentDraft,
        };
        await onConfirm?.({
          draft: currentDraft,
          incidencias,
          shouldFinalize,
          recordPayload: {
            activityLabel,
            template: resolvedTemplate,
            multiSite: true,
            siteOptions: normalizedIncidentSiteOptions,
            bySiteDrafts: nextBySiteDrafts,
            completedSites: nextCompletedSites,
            lastSite: currentSiteKey,
            partialUpdatedAt: new Date().toISOString(),
            draft: currentDraft,
          },
        });
        return;
      }

      await onConfirm?.({
        draft: currentDraft,
        incidencias,
        shouldFinalize: true,
        recordPayload: {
          activityLabel,
          template: resolvedTemplate,
          multiSite: false,
          draft: currentDraft,
        },
      });
    } catch (error) {
      setFormError(error?.message || "No se pudo guardar el checklist.");
    }
  }

  return (
    <>
    <Modal
      open={open}
      title={`Checklist de inicio${activityLabel ? ` · ${activityLabel}` : ""}`}
      onClose={confirmBusy ? undefined : onClose}
      onConfirm={handleConfirm}
      confirmLabel={saveActionLabel}
      cancelLabel="Cancelar"
      confirmDisabled={confirmBusy}
      disableBackdropClose
      className="operational-inspection-modal"
    >
      <div style={{ display: "grid", gap: "0.85rem" }}>
        {isMultiSiteMode ? (
          <div className="history-area-tabs" style={{ paddingLeft: 0 }}>
            {normalizedIncidentSiteOptions.map((siteOption) => {
              const done = completedSites.includes(siteOption);
              const active = currentSiteKey === siteOption;
              return (
                <button
                  key={siteOption}
                  type="button"
                  className={`tab ${active ? "active" : ""}`}
                  onClick={() => setActiveSite(siteOption)}
                >
                  {siteOption} {done ? "(Hecha)" : "(Pendiente)"}
                </button>
              );
            })}
          </div>
        ) : null}



        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.55rem" }}>
          <label style={{ display: "grid", gap: "0.2rem" }}>
            <span>Area</span>
            <input value={currentDraft.metadata.area} onChange={(event) => updateMetadata("area", event.target.value)} placeholder="Area" />
          </label>
          <label style={{ display: "grid", gap: "0.2rem" }}>
            <span>Fecha</span>
            <SpanishDateInput value={currentDraft.metadata.date} onChange={(event) => updateMetadata("date", event.target.value)} placeholder="Seleccionar fecha" />
          </label>
          <label style={{ display: "grid", gap: "0.2rem" }}>
            <span>Responsable</span>
            <input value={currentDraft.metadata.responsable} onChange={(event) => updateMetadata("responsable", event.target.value)} placeholder="Responsable" />
          </label>
        </div>

        {resolvedTemplate.sections.map((section) => (
          <article key={section.id} style={{ border: "1px solid rgba(49, 77, 105, 0.14)", borderRadius: "0.9rem", padding: "0.7rem", display: "grid", gap: "0.6rem" }}>
            <strong>{section.title}</strong>
            <div style={{ display: "grid", gap: "0.45rem" }}>
              {section.checks.map((check) => {
                const current = currentDraft.checks?.[check.id] || { status: "pending", notes: "", severity: "media", photos: [], site: "" };
                const isNoOk = current.status === "no_ok";
                const photos = Array.isArray(current.photos) ? current.photos : [];
                const saveKey = `${currentSiteKey}:${check.id}`;
                return (
                  <div key={check.id} style={{ border: "1px solid rgba(49, 77, 105, 0.08)", borderRadius: "0.75rem", padding: "0.55rem", display: "grid", gap: "0.45rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap" }}>
                      <span>{check.label}</span>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontWeight: 700 }}>
                        <span style={{ color: isNoOk ? "#b91c1c" : "#2d4f72" }}>{isNoOk ? "NO OK" : "OK"}</span>
                        <button
                          type="button"
                          aria-label={`Cambiar estado de ${check.label}`}
                          aria-pressed={!isNoOk}
                          onClick={() => updateCheck(check.id, { status: isNoOk ? "ok" : "no_ok" })}
                          style={{
                            cursor: "pointer",
                            position: "relative",
                            width: "44px",
                            height: "24px",
                            borderRadius: "999px",
                            background: isNoOk ? "#dc2626" : "#4f7da9",
                            transition: "all 0.2s ease",
                            border: "none",
                            padding: 0,
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: "3px",
                              left: isNoOk ? "3px" : "23px",
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              background: "#ffffff",
                              transition: "all 0.2s ease",
                            }}
                          />
                        </button>
                      </div>
                    </div>

                    {isNoOk ? (
                      <>
                        <label style={{ display: "grid", gap: "0.2rem" }}>
                          <span>Detalle de incidencia</span>
                          <textarea
                            value={current.notes}
                            onChange={(event) => updateCheck(check.id, { notes: event.target.value })}
                            rows={2}
                            placeholder="Describe el hallazgo"
                          />
                        </label>

                        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "0.45rem", alignItems: "center" }}>
                          <label style={{ display: "grid", gap: "0.2rem" }}>
                            <span>Prioridad</span>
                            <select value={current.severity} onChange={(event) => updateCheck(check.id, { severity: event.target.value })}>
                              {SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>

                          <div style={{ display: "grid", gap: "0.2rem" }}>
                            <span>Evidencia (obligatoria)</span>
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                              <button type="button" className="icon-button" onClick={() => galleryInputRefs.current[saveKey]?.click()} disabled={savingEvidenceByCheckId[saveKey]}>
                                {savingEvidenceByCheckId[saveKey] ? "Subiendo..." : "Galería"}
                              </button>
                              <button type="button" className="icon-button" onClick={() => cameraInputRefs.current[saveKey]?.click()} disabled={savingEvidenceByCheckId[saveKey]}>
                                {savingEvidenceByCheckId[saveKey] ? "Subiendo..." : "Cámara"}
                              </button>
                            </div>
                            <input
                              ref={(node) => {
                                if (node) galleryInputRefs.current[saveKey] = node;
                              }}
                              type="file"
                              accept="image/*"
                              multiple
                              style={{ display: "none" }}
                              onChange={(event) => handleUploadEvidence(check.id, event.target.files)}
                              disabled={savingEvidenceByCheckId[saveKey]}
                            />
                            <input
                              ref={(node) => {
                                if (node) cameraInputRefs.current[saveKey] = node;
                              }}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              style={{ display: "none" }}
                              onChange={(event) => handleUploadEvidence(check.id, event.target.files)}
                              disabled={savingEvidenceByCheckId[saveKey]}
                            />
                          </div>
                        </div>

                        {normalizedIncidentSiteOptions.length ? (
                          <label style={{ display: "grid", gap: "0.2rem" }}>
                            <span>{requireIncidentSiteSelection ? "Nave afectada (obligatoria)" : "Nave afectada (opcional)"}</span>
                            <select
                              value={current.site || ""}
                              onChange={(event) => updateCheck(check.id, { site: event.target.value })}
                            >
                              <option value="">Seleccionar nave</option>
                              {normalizedIncidentSiteOptions.map((siteOption) => (
                                <option key={siteOption} value={siteOption}>{siteOption}</option>
                              ))}
                            </select>
                          </label>
                        ) : null}

                        {photos.length ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.35rem" }}>
                            {photos.map((photo, photoIndex) => (
                              <button
                                key={photo.id}
                                type="button"
                                onClick={() => {
                                  const gallery = photos.filter((item) => isImageMedia(item) || isVideoMedia(item));
                                  const startIndex = gallery.findIndex((item) => item.id === photo.id);
                                  setMediaLightbox({ items: gallery, startIndex: startIndex >= 0 ? startIndex : photoIndex });
                                }}
                                style={{ display: "grid", gap: "0.2rem", border: "1px solid rgba(49, 77, 105, 0.14)", borderRadius: "0.6rem", padding: "0.3rem", background: "#ffffff", cursor: "pointer", textAlign: "left" }}
                              >
                                <img src={photo.thumbnailUrl || photo.url} alt={photo.name} style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "0.45rem" }} />
                                <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.name}</small>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>
        ))}

        <label style={{ display: "grid", gap: "0.2rem" }}>
          <span>Observaciones generales</span>
          <textarea value={currentDraft.observations} onChange={(event) => updateCurrentDraft((prev) => ({ ...prev, observations: event.target.value }))} rows={3} placeholder="Opcional" />
        </label>

        <p className="subtle-line" style={{ margin: 0 }}>
          Se generaran {totalNoOk} incidencia(s) en el modulo de incidencias, autoasignadas a quien inicia la actividad.
        </p>
        {formError ? <p className="validation-text" style={{ margin: 0 }}>{formError}</p> : null}
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
