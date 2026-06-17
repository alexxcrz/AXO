/* eslint-disable no-unused-vars -- props desde App.jsx */
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "../Modal";
import { createEmptyCatalogModalState } from "../../app/catalogHelpers.js";
import {
  normalizeCatalogScheduledDays,
  normalizeCatalogScheduledDaysBySite,
  normalizeCatalogCleaningSites,
} from "../../utils/utilidades.jsx";

/** Modales extra�dos de App.jsx � AppCatalogModals */
export function AppCatalogModals(props) {
  const {
    catalogModal,
    setCatalogModal,
    createEmptyCatalogModalState,
    submitCatalogModal,
    catalogAreaOptions,
    normalizeCatalogCleaningSites,
    normalizeCatalogScheduledDays,
    normalizeCatalogScheduledDaysBySite,
    CATALOG_WEEKDAY_OPTIONS,
    CLEANING_SITE_OPTIONS,
    areaModal,
    setAreaModal,
    AREA_T,
    confirmAddArea,
    areaDeleteModal,
    setAreaDeleteModal,
    confirmDeleteArea,
    editWeekId,
    setEditWeekId,
    editWeekActivityId,
    setEditWeekActivityId,
    addActivityToWeek,
    state,
    getActivityLabel,
    catalogMap,
    actionPermissions,
    removeWeekActivity,
  } = props;

  return (
    <>
<Modal className="modal-wide catalog-activity-modal" open={catalogModal.open} title={catalogModal.mode === "create" ? "Nueva actividad" : "Editar actividad"} confirmLabel={catalogModal.mode === "create" ? "Guardar" : "Guardar cambios"} cancelLabel="Cancelar" onClose={() => setCatalogModal(createEmptyCatalogModalState())} onConfirm={submitCatalogModal} confirmDisabled={catalogModal.submitting}>
      <div className="modal-form-grid catalog-activity-modal-grid">
        <label className="app-modal-field">
          <span>Area propietaria</span>
          <select value={catalogModal.area} onChange={(event) => setCatalogModal((current) => ({ ...current, area: event.target.value }))}>
            {catalogAreaOptions.map((areaOption) => <option key={areaOption} value={areaOption}>{areaOption}</option>)}
          </select>
        </label>
        <label className="app-modal-field">
          <span>Lista de actividades</span>
          <input value={catalogModal.category} onChange={(event) => setCatalogModal((current) => ({ ...current, category: event.target.value }))} placeholder="Ej: Limpieza, Seguridad, Producción" />
        </label>
        <label className="app-modal-field">
          <span>Nombre de la actividad</span>
          <input value={catalogModal.name} onChange={(event) => setCatalogModal((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="app-modal-field catalog-activity-limit-field">
          <span>Tiempo límite (minutos)</span>
          <input type="number" value={catalogModal.limit} onChange={(event) => setCatalogModal((current) => ({ ...current, limit: event.target.value }))} />
        </label>
        <label className="app-modal-field">
          <span>Tipo</span>
          <select value={catalogModal.mandatory} onChange={(event) => setCatalogModal((current) => ({ ...current, mandatory: event.target.value }))}>
            <option value="true">Obligatoria</option>
            <option value="false">Ocasional</option>
          </select>
        </label>
        <label className="app-modal-field catalog-activity-chip-field">
          <span>Alcance de naves</span>
          <div className="catalog-activity-chip-row">
            <button
              type="button"
              className={`catalog-site-chip ${catalogModal.siteMode !== "bySite" ? "active" : ""}`.trim()}
              onClick={() => setCatalogModal((current) => ({
                ...current,
                siteMode: "general",
                cleaningSites: [],
                scheduledDaysBySite: {},
              }))}
            >
              General (todas)
            </button>
            <button
              type="button"
              className={`catalog-site-chip ${catalogModal.siteMode === "bySite" ? "active" : ""}`.trim()}
              onClick={() => setCatalogModal((current) => ({
                ...current,
                siteMode: "bySite",
              }))}
            >
              Por nave
            </button>
          </div>
        </label>
        <label className="app-modal-field catalog-activity-chip-field">
          <span>Naves {catalogModal.siteMode === "bySite" ? "(seleccion obligatoria)" : "(no aplica en general)"}</span>
          <div className="catalog-activity-chip-row">
            {CLEANING_SITE_OPTIONS.map((site) => {
              const siteValue = String(site.value || "").trim().toUpperCase();
              const isActive = (catalogModal.cleaningSites || []).includes(siteValue);
              const isDisabled = catalogModal.siteMode !== "bySite";
              return (
                <button
                  key={siteValue}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setCatalogModal((current) => {
                    if (current.siteMode !== "bySite") return current;
                    const currentSites = normalizeCatalogCleaningSites(current.cleaningSites);
                    const hasSite = currentSites.includes(siteValue);
                    const nextSites = hasSite
                      ? currentSites.filter((entry) => entry !== siteValue)
                      : currentSites.concat([siteValue]).sort();
                    const nextBySite = { ...(current.scheduledDaysBySite || {}) };
                    if (hasSite) {
                      delete nextBySite[siteValue];
                    } else {
                      nextBySite[siteValue] = normalizeCatalogScheduledDays(current.scheduledDays, current.frequency);
                    }
                    return { ...current, cleaningSites: nextSites, scheduledDaysBySite: nextBySite };
                  })}
                  className={`catalog-site-chip ${isActive ? "active" : ""}`.trim()}
                >
                  {site.label}
                </button>
              );
            })}
          </div>
        </label>
        <label className="app-modal-field catalog-activity-chip-field">
          <span>Dias por nave</span>
          <div className="modal-form-grid catalog-days-by-site-grid">
            {catalogModal.siteMode !== "bySite" ? (
              <p className="modal-footnote">Esta actividad queda en modo general. Si hay incidencia, la nave se podra elegir al reportarla.</p>
            ) : (catalogModal.cleaningSites || []).length ? (catalogModal.cleaningSites || []).map((siteValue) => {
              const siteLabel = CLEANING_SITE_OPTIONS.find((site) => String(site.value || "").trim().toUpperCase() === siteValue)?.label || siteValue;
              const siteDays = normalizeCatalogScheduledDaysBySite(catalogModal.scheduledDaysBySite, normalizeCatalogScheduledDays(catalogModal.scheduledDays, catalogModal.frequency))[siteValue]
                || normalizeCatalogScheduledDays(catalogModal.scheduledDays, catalogModal.frequency);
              return (
                <div key={siteValue} className="app-modal-field">
                  <span>{siteLabel}</span>
                  <div className="catalog-activity-chip-row">
                    {CATALOG_WEEKDAY_OPTIONS.map((option) => {
                      const isActive = siteDays.includes(option.value);
                      return (
                        <button
                          key={`${siteValue}-${option.value}`}
                          type="button"
                          onClick={() => setCatalogModal((current) => {
                            const fallbackDays = normalizeCatalogScheduledDays(current.scheduledDays, current.frequency);
                            const bySite = normalizeCatalogScheduledDaysBySite(current.scheduledDaysBySite, fallbackDays);
                            const currentDays = bySite[siteValue] || fallbackDays;
                            const hasDay = currentDays.includes(option.value);
                            const nextDays = hasDay
                              ? currentDays.filter((day) => day !== option.value)
                              : currentDays.concat([option.value]).sort((a, b) => a - b);
                            return {
                              ...current,
                              scheduledDaysBySite: {
                                ...bySite,
                                [siteValue]: nextDays,
                              },
                            };
                          })}
                          className={`catalog-day-chip ${isActive ? "active" : ""}`.trim()}
                          title={option.label}
                        >
                          {option.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }) : <p className="modal-footnote">Selecciona una o mas naves para configurar dias especificos por nave.</p>}
          </div>
        </label>
      </div>
    </Modal>

    <Modal open={areaModal.open} backdropClassName="area-modal-backdrop" title={AREA_T.addArea} confirmLabel={AREA_T.saveArea} cancelLabel={AREA_T.cancel} onClose={() => setAreaModal({ open: false, target: "user", name: "", parentArea: "", error: "" })} onConfirm={confirmAddArea}>
      <div className="modal-form-grid">
        <label className="app-modal-field">
          <span>{AREA_T.areaName}</span>
          <input value={areaModal.name} onChange={(event) => setAreaModal((current) => ({ ...current, name: event.target.value, error: "" }))} placeholder={AREA_T.areaPlaceholder} />
        </label>
        {areaModal.error ? <p className="validation-text">{areaModal.error}</p> : null}
        <p className="modal-footnote">{AREA_T.footnoteArea}</p>
      </div>
    </Modal>

    <Modal
      open={areaDeleteModal.open}
      title={AREA_T.deleteTitle}
      confirmLabel={areaDeleteModal.submitting ? AREA_T.deleting : AREA_T.delete}
      cancelLabel={AREA_T.cancel}
      onClose={() => setAreaDeleteModal({ open: false, areaName: "", label: "", error: "", submitting: false })}
      onConfirm={confirmDeleteArea}
      confirmDisabled={areaDeleteModal.submitting || !areaDeleteModal.areaName}
    >
      <div className="modal-form-grid">
        <p>{AREA_T.deleteConfirm(areaDeleteModal.label)}</p>
        <p className="modal-footnote">{AREA_T.deleteFootnote}</p>
        {areaDeleteModal.error ? <p className="validation-text">{areaDeleteModal.error}</p> : null}
      </div>
    </Modal>

    <Modal open={Boolean(editWeekId)} title="Editar semana" confirmLabel="Cerrar" hideCancel onClose={() => { setEditWeekId(null); setEditWeekActivityId(""); }}>
      <div className="modal-form-grid">
        <label className="app-modal-field">
          <span>Seleccionar actividad del catálogo</span>
          <select value={editWeekActivityId} onChange={(event) => setEditWeekActivityId(event.target.value)}>
            <option value="">Seleccionar...</option>
            {state.catalog.filter((item) => !item.isDeleted).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <button type="button" className="primary-button" onClick={addActivityToWeek}><Plus size={16} /> Agregar a semana</button>
        <div className="week-activity-list">
          {state.activities.filter((activity) => activity.weekId === editWeekId).map((activity) => (
            <div key={activity.id} className="week-activity-item">
              <div>
                <strong>{getActivityLabel(activity, catalogMap)}</strong>
                <span>{activity.status}</span>
              </div>
              {actionPermissions.deleteWeekActivity ? <button type="button" className="icon-button danger" onClick={() => removeWeekActivity(activity.id)}><Trash2 size={15} /> Quitar</button> : null}
            </div>
          ))}
        </div>
      </div>
    </Modal>
    </>
  );
}
