import { Modal } from "../Modal";
import { createEmptyCatalogModalState } from "../../app/catalogHelpers.js";
import {
  normalizeCatalogScheduledDays,
  normalizeCatalogScheduledDaysBySite,
  normalizeCatalogCleaningSites,
} from "../../utils/utilidades.jsx";

/** Modales extra�dos de App.jsx � AppCatalogModals */

/** Modales extraidos de App.jsx � AppCatalogModals */
export function AppCatalogModals(props) {
  const {
  actionPermissions,
  addActivityToWeek,
  Agregar,
  Alcance,
  Area,
  areaDeleteModal,
  areaModal,
  areaName,
  areaOption,
  Boolean,
  bySite,
  CATALOG_WEEKDAY_OPTIONS,
  catalogAreaOptions,
  catalogMap,
  catalogModal,
  CLEANING_SITE_OPTIONS,
  cleaningSites,
  confirmAddArea,
  confirmDeleteArea,
  createEmptyCatalogModalState,
  currentDays,
  currentSites,
  deleteWeekActivity,
  Dias,
  editWeekActivityId,
  editWeekId,
  Esta,
  fallbackDays,
  filter,
  find,
  General,
  getActivityLabel,
  hasDay,
  hasSite,
  isActive,
  isDeleted,
  isDisabled,
  Lista,
  map,
  Naves,
  nextBySite,
  nextDays,
  nextSites,
  Nombre,
  normalizeCatalogCleaningSites,
  normalizeCatalogScheduledDays,
  normalizeCatalogScheduledDaysBySite,
  Obligatoria,
  Ocasional,
  parentArea,
  Plus,
  Por,
  Quitar,
  removeWeekActivity,
  scheduledDays,
  scheduledDaysBySite,
  Selecciona,
  Seleccionar,
  setAreaDeleteModal,
  setAreaModal,
  setCatalogModal,
  setEditWeekActivityId,
  setEditWeekId,
  Si,
  siteDays,
  siteLabel,
  siteMode,
  siteValue,
  sort,
  String,
  submitCatalogModal,
  submitting,
  Tiempo,
  Tipo,
  toUpperCase,
  Vas,
  weekId,
  } = props;

  return (
    <>
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
          <input value={catalogModal.category} onChange={(event) => setCatalogModal((current) => ({ ...current, category: event.target.value }))} placeholder="Ej: Limpieza, Seguridad, Producci├│n" />
        </label>
        <label className="app-modal-field">
          <span>Nombre de la actividad</span>
          <input value={catalogModal.name} onChange={(event) => setCatalogModal((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="app-modal-field catalog-activity-limit-field">
          <span>Tiempo l├¡mite (minutos)</span>
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

    <Modal open={areaModal.open} backdropClassName="area-modal-backdrop" title="Agregar área" confirmLabel="Guardar área" cancelLabel="Cancelar" onClose={() => setAreaModal({ open: false, target: "user", name: "", parentArea: "", error: "" })} onConfirm={confirmAddArea}>
      <div className="modal-form-grid">
        <label className="app-modal-field">
          <span>Nombre del área</span>
          <input value={areaModal.name} onChange={(event) => setAreaModal((current) => ({ ...current, name: event.target.value, error: "" }))} placeholder="Ej: LOGISTICA" />
        </label>
        {areaModal.error ? <p className="validation-text">{areaModal.error}</p> : null}
        <p className="modal-footnote">La nueva área se agregará al catálogo y se seleccionará automáticamente.</p>
      </div>
    </Modal>

    <Modal
      open={areaDeleteModal.open}
      title="Eliminar ├írea"
      confirmLabel={areaDeleteModal.submitting ? "Eliminando..." : "Eliminar"}
      cancelLabel="Cancelar"
      onClose={() => setAreaDeleteModal({ open: false, areaName: "", label: "", error: "", submitting: false })}
      onConfirm={confirmDeleteArea}
      confirmDisabled={areaDeleteModal.submitting || !areaDeleteModal.areaName}
    >
      <div className="modal-form-grid">
        <p>Vas a eliminar {areaDeleteModal.label || "esta ├írea"}.</p>
        <p className="modal-footnote">Si es sub├írea, los players migran al ├írea ra├¡z. Si es ├írea ra├¡z, se limpia el ├írea de los players asignados.</p>
        {areaDeleteModal.error ? <p className="validation-text">{areaDeleteModal.error}</p> : null}
      </div>
    </Modal>

    <Modal open={Boolean(editWeekId)} title="Editar semana" confirmLabel="Cerrar" hideCancel onClose={() => { setEditWeekId(null); setEditWeekActivityId(""); }}>
      <div className="modal-form-grid">
        <label className="app-modal-field">
          <span>Seleccionar actividad del cat├ílogo</span>
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

    </>
  );
}
