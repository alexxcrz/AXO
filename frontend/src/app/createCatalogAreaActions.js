import { createEmptyCatalogModalState } from "./catalogHelpers.js";
import {
  normalizeAreaOption,
  normalizeCatalogArea,
  normalizeCatalogCleaningSites,
  normalizeCatalogScheduledDays,
  normalizeCatalogScheduledDaysBySite,
  normalizeActivityFrequency,
  buildWeekActivitiesFromCatalogItem,
  getAreaRoot,
  applyRemoteWarehouseState,
} from "../utils/utilidades.jsx";
import { isDeprecatedDynamicArea } from "../config/deprecatedAreas.js";

/** Acciones de cat�logo y �reas */
export function createCatalogAreaActions(deps) {
  const {
    areaModal,
    setAreaModal,
    areaDeleteModal,
    setAreaDeleteModal,
    catalogModal,
    setCatalogModal,
    departmentOptions,
    setUserModal,
    setBootstrapLeadForm,
    editWeekId,
    editWeekActivityId,
    setEditWeekActivityId,
    state,
    setState,
    actionPermissions,
    requestJson,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
    pushAppToast,
  } = deps;

    async function confirmAddArea() {
      const nextArea = normalizeAreaOption(areaModal.name);
      if (!nextArea) {
        setAreaModal((current) => ({ ...current, error: "Escribe el nombre del área." }));
        return;
      }
      if (isDeprecatedDynamicArea(nextArea)) {
        setAreaModal((current) => ({ ...current, error: "Esa área ya no está disponible. Usa OPERACIONES." }));
        return;
      }
      if (departmentOptions.includes(nextArea)) {
        setAreaModal((current) => ({ ...current, error: "Esa área ya existe." }));
        return;
      }

      try {
        const result = await requestJson("/warehouse/areas", {
          method: "POST",
          body: JSON.stringify({ name: areaModal.name }),
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      } catch (error) {
        setAreaModal((current) => ({ ...current, error: error?.message || "No se pudo agregar el área." }));
        return;
      }

      if (areaModal.target === "bootstrap") {
        setBootstrapLeadForm((current) => ({ ...current, area: nextArea }));
      } else {
        setUserModal((current) => ({
          ...current,
          area: nextArea,
        }));
      }

      setAreaModal({ open: false, target: "user", name: "", parentArea: "", error: "" });
    }

    async function confirmDeleteArea() {
      if (!areaDeleteModal.areaName) return;
      setAreaDeleteModal((current) => ({ ...current, submitting: true, error: "" }));
      try {
        const result = await requestJson(`/warehouse/areas/${encodeURIComponent(areaDeleteModal.areaName)}`, {
          method: "DELETE",
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);

        const removedArea = normalizeAreaOption(areaDeleteModal.areaName);
        const removedRoot = getAreaRoot(removedArea);
        setUserModal((current) => {
          const currentArea = normalizeAreaOption(current.area);
          if (currentArea === removedArea || currentArea === removedRoot) {
            return { ...current, area: "" };
          }
          return current;
        });

        setAreaDeleteModal({ open: false, areaName: "", label: "", error: "", submitting: false });
        pushAppToast("Área eliminada correctamente.", "success");
      } catch (error) {
        setAreaDeleteModal((current) => ({
          ...current,
          submitting: false,
          error: error?.message || "No se pudo eliminar el área.",
        }));
      }
    }

    function openCatalogCreate(preferredCategory = "General") {
      const normalizedCategory = String(preferredCategory || "General").trim() || "General";
      setCatalogModal({ ...createEmptyCatalogModalState(), open: true, mode: "create", category: normalizedCategory, area: normalizeCatalogArea(normalizedCategory) });
    }

    function openCatalogEdit(item) {
      const itemCleaningSites = normalizeCatalogCleaningSites(item.cleaningSites);
      setCatalogModal({
        ...createEmptyCatalogModalState(),
        open: true,
        mode: "edit",
        id: item.id,
        name: item.name,
        limit: String(item.timeLimitMinutes),
        mandatory: String(item.isMandatory),
        frequency: normalizeActivityFrequency(item.frequency),
        category: String(item.category || "General").trim() || "General",
        area: normalizeCatalogArea(item.area, item.category),
        scheduledDays: normalizeCatalogScheduledDays(item.scheduledDays, item.frequency),
        scheduledDaysBySite: normalizeCatalogScheduledDaysBySite(item.scheduledDaysBySite, normalizeCatalogScheduledDays(item.scheduledDays, item.frequency)),
        cleaningSites: itemCleaningSites,
        siteMode: itemCleaningSites.length ? "bySite" : "general",
      });
    }

    async function submitCatalogModal() {
      setCatalogModal((current) => ({ ...current, submitting: true }));
      const siteMode = catalogModal.siteMode === "bySite" ? "bySite" : "general";
      const normalizedCleaningSites = siteMode === "bySite"
        ? normalizeCatalogCleaningSites(catalogModal.cleaningSites)
        : [];
      const normalizedScheduledDays = normalizeCatalogScheduledDays(catalogModal.scheduledDays, catalogModal.frequency);
      const payload = {
        name: catalogModal.name.trim(),
        timeLimitMinutes: Number(catalogModal.limit || 0),
        isMandatory: catalogModal.mandatory === "true",
        frequency: normalizeActivityFrequency(catalogModal.frequency),
        scheduledDays: normalizedScheduledDays,
        cleaningSites: normalizedCleaningSites,
        scheduledDaysBySite: siteMode === "bySite"
          ? normalizeCatalogScheduledDaysBySite(catalogModal.scheduledDaysBySite, normalizedScheduledDays)
          : {},
        category: String(catalogModal.category || "General").trim() || "General",
        area: normalizeCatalogArea(catalogModal.area, catalogModal.category),
        isDeleted: false,
      };

      if (!payload.name || payload.timeLimitMinutes <= 0) {
        setCatalogModal((current) => ({ ...current, submitting: false }));
        return;
      }

      try {
        const result = await requestJson(
          catalogModal.mode === "create" ? "/warehouse/catalog" : `/warehouse/catalog/${catalogModal.id}`,
          {
            method: catalogModal.mode === "create" ? "POST" : "PATCH",
            body: JSON.stringify(payload),
          },
        );
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setCatalogModal(createEmptyCatalogModalState());
      } catch {
        setCatalogModal((current) => ({ ...current, submitting: false }));
        // Keep modal open if the save fails.
      }
    }

    async function softDeleteCatalog(id) {
      try {
        const result = await requestJson(`/warehouse/catalog/${id}`, {
          method: "DELETE",
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      } catch {
        // Ignore delete failures silently for now.
      }
    }

    function addActivityToWeek() {
      if (!editWeekId || !editWeekActivityId) return;
      const targetWeek = state.weeks.find((week) => week.id === editWeekId);
      const catalogItem = state.catalog.find((item) => item.id === editWeekActivityId);
      const defaultResponsible = state.users.find((user) => user.isActive) || state.users[0] || null;
      if (!targetWeek || !catalogItem) return;
      const generatedActivities = buildWeekActivitiesFromCatalogItem(editWeekId, catalogItem, new Date(targetWeek.startDate), defaultResponsible?.id || null);

      setState((current) => ({
        ...current,
        activities: current.activities.concat(generatedActivities),
      }));

      setEditWeekActivityId("");
    }

    function removeWeekActivity(activityId) {
      if (!actionPermissions.deleteWeekActivity) return;
      setState((current) => ({
        ...current,
        activities: current.activities.filter((activity) => activity.id !== activityId),
        pauseLogs: current.pauseLogs.filter((log) => log.weekActivityId !== activityId),
      }));
    }


  return {
        confirmAddArea,
    confirmDeleteArea,
    openCatalogCreate,
    openCatalogEdit,
    submitCatalogModal,
    softDeleteCatalog,
    addActivityToWeek,
    removeWeekActivity,
  };
}
