import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../components/Modal";
import { downloadBoardAsJson, parseBoardImportJson } from "../utils/boardImportExport";
import {
  CLEANING_CHECKLIST_TEMPLATE_V2,
  OPERATIONAL_INSPECTION_TEMPLATE,
  generateChecklistTemplateId,
  normalizeOperationalInspectionTemplate,
} from "../utils/operationalInspectionTemplate";

const CHECKLIST_SITE_OPTIONS = ["C1", "C2", "C3", "P"];
const CHECKLIST_TEMPLATE_STORAGE_KEY = "copmec:operational-checklist-template:v1";

const CHECKLIST_AREA_OPTIONS = [
  { value: "LIMPIEZA", label: "LIMPIEZA" },
  { value: "MANTENIMIENTO", label: "MANTENIMIENTO" },
  { value: "REGULATORIO", label: "REGULATORIO" },
  { value: "CALIDAD", label: "CALIDAD" },
  { value: "INVENTARIO", label: "INVENTARIO" },
  { value: "OPERACIONES", label: "OPERACIONES" },
  { value: "ESTO", label: "ESTO" },
  { value: "GENERAL", label: "GENERAL" },
];

function normalizeChecklistAreaLabel(area) {
  return String(area || "").trim().toUpperCase() || "GENERAL";
}

function loadPersistedChecklistTemplate() {
  if (typeof window === "undefined") return normalizeOperationalInspectionTemplate(OPERATIONAL_INSPECTION_TEMPLATE);
  try {
    const raw = window.localStorage.getItem(CHECKLIST_TEMPLATE_STORAGE_KEY);
    if (!raw) return normalizeOperationalInspectionTemplate(OPERATIONAL_INSPECTION_TEMPLATE);
    const parsed = JSON.parse(raw);
    const normalized = normalizeOperationalInspectionTemplate(parsed);
    if (normalized.id === CLEANING_CHECKLIST_TEMPLATE_V2.id) {
      return normalizeOperationalInspectionTemplate(OPERATIONAL_INSPECTION_TEMPLATE);
    }
    return normalized;
  } catch {
    return normalizeOperationalInspectionTemplate(OPERATIONAL_INSPECTION_TEMPLATE);
  }
}

function resolveBoardAreaLabel(board, userMap) {
  const directArea = String(board?.settings?.ownerArea || board?.ownerArea || "").trim();
  if (directArea) return directArea;
  const ownerArea = String(userMap.get(board?.ownerId)?.area || "").trim();
  if (ownerArea) return ownerArea;
  return "Sin area";
}

function normalizeBoardAreaToken(value) {
  return String(value || "").trim().toUpperCase();
}

function resolveChecklistTemplateReferenceKey(template) {
  const source = template && typeof template === "object" ? template : {};
  const idKey = String(source.id || "").trim().toLowerCase();
  const nameKey = String(source.name || "").trim().toLowerCase();
  return idKey || nameKey;
}

export default function TablerosCreados({ contexto }) {
  const {
    visibleControlBoards,
    state,
    userMap,
    setSelectedCustomBoardId,
    setPage,
    PAGE_CUSTOM_BOARDS,
    LayoutDashboard,
    actionPermissions,
    canDoBoardAction,
    canDeleteControlBoardEntry,
    currentUser,
    duplicateBoardRecord,
    Copy,
    canEditBoard,
    getBoardAssignmentSummary,
    openCreateBoardBuilder,
    openEditBoardBuilder,
    openCatalogCreate,
    openCatalogEdit,
    softDeleteCatalog,
    exportCatalogToCsv,
    importCatalogFromCsv,
    getActivityFrequencyLabel,
    Plus,
    Pencil,
    setDeleteBoardId,
    Trash2,
    ROLE_LEAD,
    requestJson,
    applyRemoteWarehouseState,
    setState,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
    pushAppToast,
    selectedAreaSectionId,
    selectedAreaSection,
  } = contexto;

  const selectedSectionAreaScopes = useMemo(() => {
    if (selectedAreaSectionId === "all") return [];
    const sectionScopes = Array.isArray(selectedAreaSection?.scopes)
      ? selectedAreaSection.scopes
      : [selectedAreaSectionId];
    return Array.from(new Set(sectionScopes
      .map((scope) => normalizeBoardAreaToken(scope))
      .filter(Boolean)));
  }, [selectedAreaSection, selectedAreaSectionId]);

  const scopedVisibleControlBoards = useMemo(() => {
    if (!selectedSectionAreaScopes.length) return visibleControlBoards;
    return visibleControlBoards.filter((board) => selectedSectionAreaScopes.includes(normalizeBoardAreaToken(resolveBoardAreaLabel(board, userMap))));
  }, [selectedSectionAreaScopes, userMap, visibleControlBoards]);

  const allCatalogItems = state.catalog.filter((item) => !item.isDeleted);
  
  // Filtrar catálogo solo por el área actual
  const activeCatalogItems = useMemo(() => {
    if (selectedAreaSectionId === "all") {
      return allCatalogItems;
    }
    const areaScopes = (Array.isArray(selectedAreaSection?.scopes) ? selectedAreaSection.scopes : [selectedAreaSectionId])
      .map((scope) => String(scope || "").trim().toUpperCase())
      .filter(Boolean);
    if (!areaScopes.length) return allCatalogItems;
    return allCatalogItems.filter((item) => {
      const itemArea = String(item.area || item.category || "General").trim().toUpperCase();
      return areaScopes.some((scope) => {
        const scopeArea = String(scope || "").split("/")[0].trim().toUpperCase();
        return itemArea === scopeArea || itemArea === String(scope || "").trim().toUpperCase();
      });
    });
  }, [allCatalogItems, selectedAreaSection, selectedAreaSectionId]);
  
  const [creatorTab, setCreatorTab] = useState("boards");
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState("General");
  const [selectedBoardArea, setSelectedBoardArea] = useState("");
  const [selectedBoardCreatorId, setSelectedBoardCreatorId] = useState("");
  const [createListModal, setCreateListModal] = useState({ open: false, name: "", error: "" });
  const [isImporting, setIsImporting] = useState(false);
  const catalogImportRef = useRef(null);
  const boardImportRef = useRef(null);
  const isLeadCreatorView = currentUser?.role === ROLE_LEAD;

  const catalogCategories = useMemo(() => {
    const categories = new Set(["General"]);
    activeCatalogItems.forEach((item) => {
      const category = String(item.category || "General").trim() || "General";
      if (category !== "General") categories.add(category);
    });
    return Array.from(categories.values());
  }, [activeCatalogItems]);

  const filteredCatalogItems = useMemo(() => {
    if (selectedCatalogCategory === "General") return activeCatalogItems;
    return activeCatalogItems.filter((item) => (String(item.category || "General").trim() || "General") === selectedCatalogCategory);
  }, [activeCatalogItems, selectedCatalogCategory]);

  const boardAreaTabs = useMemo(() => {
    const grouped = new Map();
    scopedVisibleControlBoards.forEach((board) => {
      const areaLabel = resolveBoardAreaLabel(board, userMap);
      if (!grouped.has(areaLabel)) {
        grouped.set(areaLabel, {
          areaId: areaLabel,
          areaLabel,
          total: 0,
        });
      }
      grouped.get(areaLabel).total += 1;
    });

    return Array.from(grouped.values()).sort((left, right) => left.areaLabel.localeCompare(right.areaLabel, "es-MX"));
  }, [scopedVisibleControlBoards, userMap]);

  const visibleBoardsByArea = useMemo(() => {
    if (!selectedBoardArea) return scopedVisibleControlBoards;
    return scopedVisibleControlBoards.filter((board) => resolveBoardAreaLabel(board, userMap) === selectedBoardArea);
  }, [scopedVisibleControlBoards, selectedBoardArea, userMap]);

  const boardCreatorTabs = useMemo(() => {
    const grouped = new Map();
    visibleBoardsByArea.forEach((board) => {
      const creatorId = board.createdById || "unknown";
      if (!grouped.has(creatorId)) {
        grouped.set(creatorId, {
          creatorId,
          creatorName: userMap.get(creatorId)?.name || "Sin creador",
          total: 0,
        });
      }
      grouped.get(creatorId).total += 1;
    });

    return Array.from(grouped.values()).sort((left, right) => left.creatorName.localeCompare(right.creatorName, "es-MX"));
  }, [userMap, visibleBoardsByArea]);

  const visibleCreatorBoards = useMemo(() => {
    if (!selectedBoardCreatorId) return visibleBoardsByArea;
    return visibleBoardsByArea.filter((board) => (board.createdById || "unknown") === selectedBoardCreatorId);
  }, [selectedBoardCreatorId, visibleBoardsByArea]);

  const checklistBoards = useMemo(() => {
    return visibleCreatorBoards
      .map((board) => {
        const checklistConfig = board?.settings?.operationalChecklistConfig;
        if (!checklistConfig?.enabled) return null;

        const templateSections = Array.isArray(checklistConfig?.template?.sections)
          ? checklistConfig.template.sections
          : [];
        const checksCount = templateSections.reduce((total, section) => total + (Array.isArray(section?.checks) ? section.checks.length : 0), 0);
        const linkedActivityNames = Array.isArray(checklistConfig?.linkedActivityNames)
          ? checklistConfig.linkedActivityNames.map((item) => String(item || "").trim()).filter(Boolean)
          : [];

        return {
          board,
          checklistName: String(checklistConfig?.template?.name || "Checklist operativo").trim() || "Checklist operativo",
          sectionsCount: templateSections.length,
          checksCount,
          linkedActivityNames,
        };
      })
      .filter(Boolean);
  }, [visibleCreatorBoards]);

  const serverChecklistTemplates = useMemo(() => {
    const raw = Array.isArray(state?.operationalInspectionTemplates) ? state.operationalInspectionTemplates : [];
    return raw.map((entry) => normalizeOperationalInspectionTemplate(entry));
  }, [state?.operationalInspectionTemplates]);

  const allChecklistTemplates = useMemo(() => {
    const map = new Map();
    map.set(OPERATIONAL_INSPECTION_TEMPLATE.id, normalizeOperationalInspectionTemplate(OPERATIONAL_INSPECTION_TEMPLATE));
    map.set(CLEANING_CHECKLIST_TEMPLATE_V2.id, normalizeOperationalInspectionTemplate(CLEANING_CHECKLIST_TEMPLATE_V2));
    serverChecklistTemplates.forEach((template) => {
      if (!template?.id) return;
      if (template.id === OPERATIONAL_INSPECTION_TEMPLATE.id || template.id === CLEANING_CHECKLIST_TEMPLATE_V2.id) {
        map.set(template.id, normalizeOperationalInspectionTemplate({ ...template, isBuiltIn: true }));
        return;
      }
      map.set(template.id, normalizeOperationalInspectionTemplate({ ...template, isBuiltIn: false }));
    });
    return Array.from(map.values());
  }, [serverChecklistTemplates]);

  const checklistAreaFilter = useMemo(() => {
    if (selectedAreaSectionId === "all") return [];
    return selectedSectionAreaScopes.map((scope) => normalizeChecklistAreaLabel(scope));
  }, [selectedAreaSectionId, selectedSectionAreaScopes]);

  const checklistTemplatesByArea = useMemo(() => {
    const grouped = new Map();
    allChecklistTemplates.forEach((template) => {
      const areaKey = normalizeChecklistAreaLabel(template.area);
      if (checklistAreaFilter.length && !checklistAreaFilter.includes(areaKey)) return;
      if (!grouped.has(areaKey)) grouped.set(areaKey, []);
      grouped.get(areaKey).push(template);
    });
    return Array.from(grouped.entries())
      .map(([area, templates]) => ({
        area,
        templates: templates.slice().sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "es-MX")),
      }))
      .sort((left, right) => left.area.localeCompare(right.area, "es-MX"));
  }, [allChecklistTemplates, checklistAreaFilter]);

  const [checklistTemplateDraft, setChecklistTemplateDraft] = useState(() => loadPersistedChecklistTemplate());
  const [checklistEditorOpen, setChecklistEditorOpen] = useState(false);
  const [checklistEditorMode, setChecklistEditorMode] = useState("edit");
  const [checklistTemplateSaving, setChecklistTemplateSaving] = useState(false);
  const [checklistLinkModal, setChecklistLinkModal] = useState({
    open: false,
    category: "General",
    itemId: "",
    saving: false,
    error: "",
  });
  const [unlinkingChecklistItems, setUnlinkingChecklistItems] = useState({});

  const checklistCatalogCategoryOptions = useMemo(
    () => Array.from(new Set(activeCatalogItems.map((item) => String(item?.category || "General").trim() || "General"))).sort((left, right) => left.localeCompare(right, "es-MX")),
    [activeCatalogItems],
  );

  const checklistCatalogActivities = useMemo(
    () => activeCatalogItems
      .filter((item) => (String(item?.category || "General").trim() || "General") === checklistLinkModal.category)
      .sort((left, right) => String(left?.name || "").localeCompare(String(right?.name || ""), "es-MX")),
    [activeCatalogItems, checklistLinkModal.category],
  );

  const checklistLinkedCatalogActivitiesByTemplate = useMemo(() => {
    const map = new Map();
    activeCatalogItems.forEach((item) => {
      if (!item?.operationalChecklistConfig?.enabled) return;
      const templateKey = resolveChecklistTemplateReferenceKey(item.operationalChecklistConfig.template);
      if (!templateKey) return;
      const next = map.get(templateKey) || [];
      map.set(templateKey, next.concat(item));
    });
    return map;
  }, [activeCatalogItems]);

  function getScopedBoardAssignmentSummary(board) {
    if (!selectedSectionAreaScopes.length) {
      return getBoardAssignmentSummary(board, userMap);
    }
    const visibilityType = String(board?.visibilityType || "users").trim().toLowerCase();
    if (visibilityType !== "department") {
      return getBoardAssignmentSummary(board, userMap);
    }
    const scopedDepartments = Array.from(new Set((board?.sharedDepartments || [])
      .map((department) => normalizeBoardAreaToken(department))
      .filter((department) => selectedSectionAreaScopes.includes(department))));
    const safeBoard = {
      ...board,
      sharedDepartments: scopedDepartments,
    };
    return getBoardAssignmentSummary(safeBoard, userMap);
  }

  function createChecklistToken(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function updateChecklistTemplateDraft(updater) {
    setChecklistTemplateDraft((current) => normalizeOperationalInspectionTemplate(typeof updater === "function" ? updater(current) : updater));
  }

  function updateChecklistSection(sectionId, patch) {
    updateChecklistTemplateDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
    }));
  }

  function updateChecklistCheck(sectionId, checkId, patch) {
    updateChecklistTemplateDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          checks: section.checks.map((check) => (check.id === checkId ? { ...check, ...patch } : check)),
        };
      }),
    }));
  }

  function addChecklistSection() {
    updateChecklistTemplateDraft((current) => ({
      ...current,
      sections: current.sections.concat([{ id: createChecklistToken("section"), title: "Nueva sección", incidenceCategory: "Operativa", checks: [{ id: createChecklistToken("check"), label: "Nuevo check" }] }]),
    }));
  }

  function removeChecklistSection(sectionId) {
    updateChecklistTemplateDraft((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
    }));
  }

  function addChecklistCheck(sectionId) {
    updateChecklistTemplateDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => (
        section.id !== sectionId
          ? section
          : {
              ...section,
              checks: section.checks.concat([{ id: createChecklistToken("check"), label: "Nuevo check" }]),
            }
      )),
    }));
  }

  function removeChecklistCheck(sectionId, checkId) {
    updateChecklistTemplateDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const nextChecks = section.checks.filter((check) => check.id !== checkId);
        return {
          ...section,
          checks: nextChecks.length ? nextChecks : section.checks,
        };
      }),
    }));
  }

  function resetChecklistTemplateDraft() {
    const currentId = String(checklistTemplateDraft?.id || "").trim();
    if (currentId === CLEANING_CHECKLIST_TEMPLATE_V2.id) {
      setChecklistTemplateDraft(normalizeOperationalInspectionTemplate(CLEANING_CHECKLIST_TEMPLATE_V2));
    } else {
      setChecklistTemplateDraft(normalizeOperationalInspectionTemplate(OPERATIONAL_INSPECTION_TEMPLATE));
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(CHECKLIST_TEMPLATE_STORAGE_KEY);
      } catch {
        // noop
      }
    }
  }

  async function persistChecklistTemplateDraft() {
    if (typeof window === "undefined") return;
    setChecklistTemplateSaving(true);
    try {
      const normalizedDraft = normalizeOperationalInspectionTemplate(checklistTemplateDraft);
      const result = await requestJson("/warehouse/operational-templates", {
        method: "POST",
        body: JSON.stringify(normalizedDraft),
      });
      if (result?.ok) {
        try {
          applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        } catch (_syncError) {
          void _syncError;
        }
        const toastLabel = checklistEditorMode === "create"
          ? "Checklist creado."
          : "Cambios guardados.";
        pushAppToast(toastLabel, "success");
        setChecklistEditorOpen(false);
      } else {
        pushAppToast(result?.message || "No fue posible guardar el checklist en el servidor.", "danger");
      }
    } catch {
      pushAppToast("No se pudo procesar el checklist.", "danger");
    } finally {
      setChecklistTemplateSaving(false);
    }
  }

  function toggleChecklistSite(siteOption) {
    const normalizedSite = String(siteOption || "").trim().toUpperCase();
    if (!normalizedSite) return;
    updateChecklistTemplateDraft((current) => {
      const currentSites = Array.isArray(current.siteOptions) ? current.siteOptions : [];
      const hasSite = currentSites.includes(normalizedSite);
      return {
        ...current,
        siteOptions: hasSite
          ? currentSites.filter((site) => site !== normalizedSite)
          : currentSites.concat(normalizedSite),
      };
    });
  }

  function toggleChecklistCheckSite(sectionId, checkId, siteOption) {
    const normalizedSite = String(siteOption || "").trim().toUpperCase();
    if (!normalizedSite) return;
    updateChecklistTemplateDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          checks: section.checks.map((check) => {
            if (check.id !== checkId) return check;
            const currentSites = Array.isArray(check.siteOptions) ? check.siteOptions : [];
            const hasSite = currentSites.includes(normalizedSite);
            return {
              ...check,
              siteOptions: hasSite ? currentSites.filter((s) => s !== normalizedSite) : currentSites.concat(normalizedSite),
            };
          }),
        };
      }),
    }));
  }

  function openChecklistCreator(area = "") {
    const defaultArea = normalizeChecklistAreaLabel(area || currentUser?.area || "LIMPIEZA");
    setChecklistTemplateDraft(normalizeOperationalInspectionTemplate({
      id: generateChecklistTemplateId("checklist"),
      name: "Checklist nuevo",
      area: defaultArea,
      isBuiltIn: false,
      siteOptions: [],
      sections: [
        {
          id: createChecklistToken("section"),
          title: "Nueva sección",
          incidenceCategory: "Operativa",
          checks: [{ id: createChecklistToken("check"), label: "Nuevo check" }],
        },
      ],
    }));
    setChecklistEditorMode("create");
    setChecklistEditorOpen(true);
  }

  function openChecklistEditor(templateOrKey = "operational") {
    if (templateOrKey && typeof templateOrKey === "object") {
      setChecklistTemplateDraft(normalizeOperationalInspectionTemplate(templateOrKey));
      setChecklistEditorMode("edit");
      setChecklistEditorOpen(true);
      return;
    }
    const normalizedKey = String(templateOrKey || "").trim().toLowerCase();
    if (normalizedKey === "cleaning") {
      setChecklistTemplateDraft(normalizeOperationalInspectionTemplate(CLEANING_CHECKLIST_TEMPLATE_V2));
    } else {
      setChecklistTemplateDraft(normalizeOperationalInspectionTemplate(OPERATIONAL_INSPECTION_TEMPLATE));
    }
    setChecklistEditorMode("edit");
    setChecklistEditorOpen(true);
  }

  async function deleteCustomChecklistTemplate(templateId) {
    const id = String(templateId || "").trim();
    if (!id) return;
    if (!globalThis.confirm("¿Eliminar este checklist? Esta acción no se puede deshacer.")) return;
    try {
      const result = await requestJson(`/warehouse/operational-templates/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (result?.ok) {
        if (result.data?.state) {
          applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        }
        pushAppToast("Checklist eliminado.", "success");
      } else {
        pushAppToast(result?.message || "No fue posible eliminar el checklist.", "danger");
      }
    } catch (err) {
      pushAppToast(err?.message || "Error al eliminar el checklist.", "danger");
    }
  }

  function openChecklistLinkModal() {
    const nextCategory = checklistCatalogCategoryOptions[0] || "General";
    const nextItem = activeCatalogItems.find((item) => (String(item?.category || "General").trim() || "General") === nextCategory);
    setChecklistLinkModal({
      open: true,
      category: nextCategory,
      itemId: String(nextItem?.id || "").trim(),
      saving: false,
      error: "",
    });
  }

  async function submitChecklistActivityLink() {
    if (!checklistLinkModal.itemId || checklistLinkModal.saving) {
      setChecklistLinkModal((current) => ({ ...current, error: "Selecciona una actividad para vincular." }));
      return;
    }

    setChecklistLinkModal((current) => ({ ...current, saving: true, error: "" }));
    try {
      const selectedCatalogItem = activeCatalogItems.find((item) => String(item?.id || "").trim() === String(checklistLinkModal.itemId).trim());
      const selectedActivityName = String(selectedCatalogItem?.name || "").trim();
      const payload = {
        operationalChecklistConfig: {
          enabled: true,
          template: normalizeOperationalInspectionTemplate(checklistTemplateDraft),
          linkedAt: new Date().toISOString(),
          linkedById: String(currentUser?.id || "").trim(),
          linkedByName: String(currentUser?.name || "").trim(),
          linkedActivityNames: selectedActivityName ? [selectedActivityName] : [],
        },
      };
      const result = await requestJson(`/warehouse/catalog/${checklistLinkModal.itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      applyRemoteWarehouseState(result?.data?.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setChecklistLinkModal({ open: false, category: "General", itemId: "", saving: false, error: "" });
      pushAppToast("Checklist vinculado correctamente a la actividad seleccionada.", "success");
    } catch (error) {
      setChecklistLinkModal((current) => ({
        ...current,
        saving: false,
        error: error?.message || "No se pudo vincular el checklist a la actividad.",
      }));
    }
  }

  async function unlinkChecklistActivityFromCatalogItem(itemId) {
    if (!itemId || unlinkingChecklistItems[itemId]) return;
    setUnlinkingChecklistItems((current) => ({ ...current, [itemId]: true }));
    try {
      const catalogItem = activeCatalogItems.find((item) => String(item?.id || "").trim() === String(itemId).trim());
      if (!catalogItem) throw new Error("Actividad no encontrada.");
      const payload = {
        operationalChecklistConfig: {
          ...catalogItem.operationalChecklistConfig,
          enabled: false,
          linkedActivityNames: [],
        },
      };
      const result = await requestJson(`/warehouse/catalog/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      applyRemoteWarehouseState(result?.data?.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      pushAppToast("Se eliminó la vinculación del checklist con la actividad.", "success");
    } catch (error) {
      pushAppToast(error?.message || "No se pudo eliminar la actividad vinculada.", "danger");
    } finally {
      setUnlinkingChecklistItems((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    }
  }

  async function unlinkChecklistActivityFromBoard(boardId, activityName) {
    if (!boardId || !activityName || unlinkingChecklistItems[`${boardId}:${activityName}`]) return;
    setUnlinkingChecklistItems((current) => ({ ...current, [`${boardId}:${activityName}`]: true }));
    try {
      const board = visibleCreatorBoards.find((item) => item.id === boardId);
      if (!board) throw new Error("Tablero no encontrado.");
      const checklistConfig = board?.settings?.operationalChecklistConfig;
      if (!checklistConfig || !Array.isArray(checklistConfig.linkedActivityNames)) throw new Error("Configuración de checklist inválida.");
      const nextLinkedActivityNames = checklistConfig.linkedActivityNames.filter((name) => String(name || "").trim() !== String(activityName || "").trim());
      const payload = {
        settings: {
          ...board.settings,
          operationalChecklistConfig: {
            ...checklistConfig,
            linkedActivityNames: nextLinkedActivityNames,
          },
        },
      };
      const result = await requestJson(`/warehouse/boards/${boardId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      applyRemoteWarehouseState(result?.data?.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      pushAppToast("Se eliminó la actividad vinculada del checklist.", "success");
    } catch (error) {
      pushAppToast(error?.message || "No se pudo eliminar la actividad vinculada.", "danger");
    } finally {
      setUnlinkingChecklistItems((current) => {
        const next = { ...current };
        delete next[`${boardId}:${activityName}`];
        return next;
      });
    }
  }

  function updateChecklistLinkCategory(nextCategory) {
    const normalizedCategory = String(nextCategory || "General").trim() || "General";
    const firstItem = activeCatalogItems.find((item) => (String(item?.category || "General").trim() || "General") === normalizedCategory);
    setChecklistLinkModal((current) => ({
      ...current,
      category: normalizedCategory,
      itemId: String(firstItem?.id || "").trim(),
      error: "",
    }));
  }

  useEffect(() => {
    if (!boardAreaTabs.length) {
      if (selectedBoardArea) setSelectedBoardArea("");
      return;
    }
    if (!selectedBoardArea || !boardAreaTabs.some((item) => item.areaId === selectedBoardArea)) {
      setSelectedBoardArea(boardAreaTabs[0].areaId);
    }
  }, [boardAreaTabs, selectedBoardArea]);

  useEffect(() => {
    if (!boardCreatorTabs.length) {
      if (selectedBoardCreatorId) setSelectedBoardCreatorId("");
      return;
    }
    if (!selectedBoardCreatorId || !boardCreatorTabs.some((item) => item.creatorId === selectedBoardCreatorId)) {
      setSelectedBoardCreatorId(boardCreatorTabs[0].creatorId);
    }
  }, [boardCreatorTabs, selectedBoardCreatorId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(CHECKLIST_TEMPLATE_STORAGE_KEY);
        window.localStorage.removeItem("copmec:operational-checklist-template:v1:cleaning");
      } catch {
        // noop
      }
    }
  }, []);

  function handleOpenCreateCategoryModal() {
    setCreateListModal({ open: true, name: "", error: "" });
  }

  async function handleCatalogImportChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setIsImporting(true);
    try {
      const count = await importCatalogFromCsv(file);
      if (typeof pushAppToast === "function") {
        pushAppToast(`${count} actividad${count !== 1 ? "es" : ""} importada${count !== 1 ? "s" : ""} correctamente.`, "success");
      }
    } catch (err) {
      if (typeof pushAppToast === "function") {
        pushAppToast(err?.message || "Error al importar el archivo.", "danger");
      }
    } finally {
      setIsImporting(false);
    }
  }

  async function handleBoardImportChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setIsImporting(true);
    try {
      const text = await file.text();
      const { createPayload } = parseBoardImportJson(text);
      const result = await requestJson("/warehouse/boards", {
        method: "POST",
        body: JSON.stringify(createPayload),
      });
      applyRemoteWarehouseState(result?.data?.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      if (typeof pushAppToast === "function") pushAppToast(`Tablero "${createPayload.name}" importado correctamente.`, "success");
    } catch (err) {
      const message = err?.message || "Error al importar el tablero JSON.";
      if (typeof pushAppToast === "function") pushAppToast(message, "danger");
    } finally {
      setIsImporting(false);
    }
  }

  function handleCloseCreateCategoryModal() {
    setCreateListModal({ open: false, name: "", error: "" });
  }

  function handleConfirmCreateCategory() {
    const normalized = String(createListModal.name || "").trim();
    if (!normalized) return;
    const alreadyExists = catalogCategories.some((category) => category.toLowerCase() === normalized.toLowerCase());
    if (alreadyExists) {
      setCreateListModal((current) => ({ ...current, error: "Esa lista ya existe. Usa otro nombre." }));
      return;
    }

    setSelectedCatalogCategory(normalized);
    handleCloseCreateCategoryModal();
    openCatalogCreate(normalized);
  }

  return (
    <section className="page-grid created-boards-page">
      <article className="surface-card admin-tabs full-width admin-tabs-shell">
        <div className="creator-tabs-header">
          <div className="tab-strip">
            <button type="button" className={creatorTab === "boards" ? "tab active" : "tab"} onClick={() => setCreatorTab("boards")}>Tableros</button>
            <button type="button" className={creatorTab === "catalog" ? "tab active" : "tab"} onClick={() => setCreatorTab("catalog")}>Catálogo de actividades</button>
            <button type="button" className={creatorTab === "checklists" ? "tab active" : "tab"} onClick={() => setCreatorTab("checklists")}>Catálogo de checklist</button>
          </div>
          <div className="creator-tabs-actions">
            {creatorTab === "boards" ? (
              <>
                <button type="button" className="icon-button sm-button" onClick={() => boardImportRef.current?.click()} disabled={isImporting || !actionPermissions.createBoard}>
                  {isImporting ? "Importando..." : "Importar JSON"}
                </button>
                <input ref={boardImportRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleBoardImportChange} />
                <button type="button" className="primary-button" onClick={openCreateBoardBuilder} disabled={!actionPermissions.createBoard}>
                  <Plus size={16} /> Crear tablero
                </button>
              </>
            ) : null}
            {creatorTab === "checklists" ? (
              <button type="button" className="primary-button" onClick={() => openChecklistCreator("")} disabled={!actionPermissions.editCatalog}>
                <Plus size={16} /> Crear checklist
              </button>
            ) : null}
          </div>
        </div>
      </article>

      {creatorTab === "boards" ? (
        <>
          <article className="surface-card full-width compact-surface-card">
            <div className="saved-board-list board-creator-tabs">
              {boardAreaTabs.map((item) => (
                <button
                  key={item.areaId}
                  type="button"
                  className={selectedBoardArea === item.areaId ? "tab active" : "tab"}
                  onClick={() => {
                    setSelectedBoardArea(item.areaId);
                    setSelectedBoardCreatorId("");
                  }}
                >
                  {item.areaLabel} ({item.total})
                </button>
              ))}
            </div>
          </article>

          <article className="surface-card full-width compact-surface-card">
            <div className="saved-board-list board-creator-tabs">
              {boardCreatorTabs.map((item) => (
                <button
                  key={item.creatorId}
                  type="button"
                  className={selectedBoardCreatorId === item.creatorId ? "tab active" : "tab"}
                  onClick={() => setSelectedBoardCreatorId(item.creatorId)}
                >
                  {item.creatorName} ({item.total})
                </button>
              ))}
            </div>
          </article>

          <div className="created-board-grid full-width">
            {visibleCreatorBoards.length ? visibleCreatorBoards.map((board) => (
              <article key={board.id} className="created-board-card surface-card">
                <div className="created-board-card-top">
                  <div className="created-board-card-head">
                    <strong>{board.name}</strong>
                    <p>{board.description || "Sin descripción."}</p>
                  </div>
                  <div className="saved-board-list created-board-card-stats">
                    <span className="chip primary">Campos: {(board.fields || []).length}</span>
                    <span className="chip">Filas: {(board.rows || []).length}</span>
                  </div>
                </div>
                <div className="board-meta-inline created-board-card-meta">
                  <span>{resolveBoardAreaLabel(board, userMap)}</span>
                  <span>Player principal · {userMap.get(board.ownerId)?.name || "N/A"}</span>
                  <span>{userMap.get(board.createdById)?.name || "N/A"}</span>
                  <span>{getScopedBoardAssignmentSummary(board)}</span>
                </div>
                <div className="toolbar-actions">
                  <button type="button" className="primary-button created-board-open-action" onClick={() => {
                    setSelectedCustomBoardId(board.id);
                    setPage(PAGE_CUSTOM_BOARDS);
                  }}>
                    <LayoutDashboard size={16} /> Abrir en Mis tableros
                  </button>
                  {(actionPermissions.duplicateBoardWithRows || actionPermissions.duplicateBoard) && canDoBoardAction(currentUser, board) ? (
                    <button type="button" className="icon-button" onClick={() => duplicateBoardRecord(board, false)}>
                      <Copy size={15} /> Duplicar
                    </button>
                  ) : null}

                  {actionPermissions.editBoard && canEditBoard(currentUser, board) ? (
                    <button type="button" className="icon-button" onClick={() => openEditBoardBuilder(board)}>
                      <Pencil size={15} /> Editar tablero
                    </button>
                  ) : null}
                  <button type="button" className="icon-button" onClick={() => downloadBoardAsJson(board)}>
                    Exportar JSON
                  </button>
                  {actionPermissions.deleteBoard && canEditBoard(currentUser, board) && canDeleteControlBoardEntry(board) ? (
                    <button type="button" className="icon-button danger created-board-delete-action" onClick={() => setDeleteBoardId(board.id)}>
                      <Trash2 size={15} /> Eliminar tablero
                    </button>
                  ) : null}
                </div>
              </article>
            )) : (
              <article className="surface-card empty-state full-width">
                <LayoutDashboard size={44} />
                <h3>No hay tableros visibles</h3>
                <p>{isLeadCreatorView && selectedBoardCreatorId ? "Ese creador todavía no tiene tableros visibles en esta vista." : "Crea un tablero desde aquí o asigna acceso para empezar."}</p>
              </article>
            )}
          </div>
        </>
      ) : null}

      {creatorTab === "catalog" ? (
        <article className="surface-card full-width table-card admin-surface-card">
          <div className="card-header-row">
            <div>
              <h3>Catálogo de actividades</h3>
            </div>
            <div className="toolbar-actions">
              <button type="button" className="icon-button sm-button" title="Exportar catálogo a CSV" onClick={exportCatalogToCsv} disabled={!activeCatalogItems.length}>
                ↓ Exportar CSV
              </button>
              <button type="button" className="icon-button sm-button" title="Importar actividades desde CSV" onClick={() => catalogImportRef.current?.click()} disabled={isImporting || !actionPermissions.createCatalog}>
                {isImporting ? "Importando…" : "↑ Importar CSV"}
              </button>
              <input ref={catalogImportRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleCatalogImportChange} />
              {selectedCatalogCategory === "General" ? (
                <button type="button" className="primary-button sm-button" onClick={handleOpenCreateCategoryModal} disabled={!actionPermissions.createCatalog}>
                  <Plus size={14} /> Crear lista
                </button>
              ) : (
                <button type="button" className="primary-button sm-button" onClick={() => openCatalogCreate(selectedCatalogCategory)} disabled={!actionPermissions.createCatalog}>
                  <Plus size={14} /> Agregar actividad
                </button>
              )}
            </div>
          </div>
          <div className="saved-board-list board-builder-launch-list">
            {catalogCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={selectedCatalogCategory === category ? "tab active" : "tab"}
                onClick={() => setSelectedCatalogCategory(category)}
              >
                {category === "General" ? "General (todas las listas)" : category}
              </button>
            ))}
          </div>
          <div className="table-wrap">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th>Actividad</th>
                  <th>Grupo</th>
                  <th>Frecuencia</th>
                  <th>Tiempo límite</th>
                  <th>Tipo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalogItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td><span className="chip">{item.category || "General"}</span></td>
                    <td>{getActivityFrequencyLabel(item.frequency)}</td>
                    <td>{item.timeLimitMinutes} min</td>
                    <td>{item.isMandatory ? "Obligatoria" : "Ocasional"}</td>
                    <td>
                      <div className="row-actions compact">
                        <button type="button" className="icon-button" onClick={() => openCatalogEdit(item)} disabled={!actionPermissions.editCatalog}>
                          <Pencil size={15} /> Editar
                        </button>
                        <button type="button" className="icon-button danger" onClick={() => softDeleteCatalog(item.id)} disabled={!actionPermissions.deleteCatalog}>
                          <Trash2 size={15} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredCatalogItems.length ? (
                  <tr>
                    <td colSpan={6}>
                      <span className="subtle-line">
                        {selectedCatalogCategory === "General"
                          ? "No hay actividades registradas todavía."
                          : `No hay actividades en la lista ${selectedCatalogCategory}. Usa "Agregar actividad" para crear la primera.`}
                      </span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {creatorTab === "checklists" ? (
        <article className="surface-card full-width table-card admin-surface-card">
          <div className="card-header-row">
            <div>
              <h3>Catálogo de checklist</h3>
            </div>
          </div>

          {checklistTemplatesByArea.map(({ area, templates }) => (
            <section key={`area-${area}`} style={{ display: "grid", gap: "0.6rem", marginBottom: "1rem" }}>
              <div className="card-header-row" style={{ alignItems: "center", gap: "0.6rem" }}>
                <h4 style={{ margin: 0 }}>
                  <span className="chip primary" style={{ fontSize: "0.8rem" }}>{area}</span>
                </h4>
                <span className="subtle-line" style={{ margin: 0, fontSize: "0.78rem" }}>
                  {templates.length} {templates.length === 1 ? "checklist" : "checklists"}
                </span>
                <div style={{ marginLeft: "auto" }}>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => openChecklistCreator(area)}
                    disabled={!actionPermissions.editCatalog}
                    title={`Crear un checklist nuevo para ${area}`}
                  >
                    <Plus size={14} /> Nuevo en {area}
                  </button>
                </div>
              </div>

              <div className="created-board-grid full-width">
                {templates.map((template) => {
                  const templateKey = String(template.id || template.name || "").toLowerCase();
                  const linkedItems = checklistLinkedCatalogActivitiesByTemplate.get(templateKey) || [];
                  const sectionsCount = Array.isArray(template.sections) ? template.sections.length : 0;
                  const checksCount = (Array.isArray(template.sections) ? template.sections : [])
                    .reduce((total, section) => total + (Array.isArray(section?.checks) ? section.checks.length : 0), 0);
                  const siteOptions = Array.isArray(template.siteOptions) ? template.siteOptions : [];
                  return (
                    <article
                      key={`template-${template.id}`}
                      className="created-board-card surface-card"
                      style={{
                        border: "1px solid rgba(49, 77, 105, 0.14)",
                        background: template.isBuiltIn
                          ? "linear-gradient(180deg, rgba(49, 77, 105, 0.02) 0%, rgba(255, 255, 255, 0.98) 100%)"
                          : "linear-gradient(180deg, rgba(225, 245, 254, 0.45) 0%, rgba(255, 255, 255, 1) 100%)",
                        maxWidth: "560px",
                      }}
                    >
                      <div className="created-board-card-top">
                        <div className="created-board-card-head">
                          <strong>{template.name}</strong>
                        </div>
                        <div className="saved-board-list created-board-card-stats">
                          <span className="chip primary">Área: {normalizeChecklistAreaLabel(template.area)}</span>
                          <span className="chip primary">Secciones: {sectionsCount}</span>
                          <span className="chip">Checks: {checksCount}</span>
                          {template.isBuiltIn ? <span className="chip">Sistema</span> : null}
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.8rem" }}>
                        <div className="saved-board-list" style={{ marginBottom: "0.25rem" }}>
                          <span className="chip">Naves configuradas:</span>
                          {siteOptions.length
                            ? siteOptions.map((site) => <span key={site} className="chip primary">{site}</span>)
                            : <span className="subtle-line">Sin naves fijas (usa catálogo o contexto operativo)</span>}
                        </div>
                        {(Array.isArray(template.sections) ? template.sections : []).map((section) => (
                          <article key={section.id} className="surface-card" style={{ padding: "0.65rem 0.75rem", display: "grid", gap: "0.22rem" }}>
                            <strong style={{ fontSize: "0.86rem", lineHeight: 1.2 }}>{section.title}</strong>
                            <div className="board-meta-inline created-board-card-meta" style={{ margin: 0, fontSize: "0.74rem" }}>
                              <span>{section.incidenceCategory || "Otro"}</span>
                              <span>{section.checks.length} checks</span>
                            </div>
                          </article>
                        ))}

                        <div className="saved-board-list" style={{ marginTop: "0.25rem", gap: "0.35rem", alignItems: "center" }}>
                          <span className="chip primary">Actividades vinculadas: {linkedItems.length}</span>
                          {linkedItems.length
                            ? linkedItems.map((item) => (
                                <div key={`${template.id}-${item.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                                  <span className="chip">{item.category || "General"} · {item.name}</span>
                                  <button
                                    type="button"
                                    className="icon-button danger"
                                    onClick={() => void unlinkChecklistActivityFromCatalogItem(item.id)}
                                    disabled={Boolean(unlinkingChecklistItems[item.id])}
                                    title="Eliminar vínculo"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))
                            : <span className="subtle-line">Aun no hay actividades vinculadas.</span>}
                        </div>
                      </div>

                      <div className="toolbar-actions">
                        <button type="button" className="icon-button" onClick={() => openChecklistEditor(template)}>
                          <Pencil size={15} /> Editar checklist
                        </button>
                        <button
                          type="button"
                          className="primary-button created-board-open-action"
                          onClick={() => {
                            setChecklistTemplateDraft(normalizeOperationalInspectionTemplate(template));
                            openChecklistLinkModal();
                          }}
                          disabled={!actionPermissions.editCatalog || !activeCatalogItems.length}
                        >
                          <Plus size={16} /> Vincular a actividad
                        </button>
                        {!template.isBuiltIn ? (
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={() => void deleteCustomChecklistTemplate(template.id)}
                            disabled={!actionPermissions.editCatalog}
                            title="Eliminar checklist"
                          >
                            <Trash2 size={15} /> Eliminar
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {!checklistTemplatesByArea.length ? (
            <p className="subtle-line" style={{ margin: "0.5rem 0 1rem 0" }}>
              {selectedAreaSectionId === "all"
                ? "No hay checklists cargados todavía. Usa \"Crear checklist\" para agregar uno."
                : `No hay checklists para esta área. Usa "Crear checklist" para agregar uno.`}
            </p>
          ) : null}

          <div className="created-board-grid full-width">
            {checklistBoards.map(({ board, checklistName, sectionsCount, checksCount, linkedActivityNames }) => (
                <article key={`${board.id}-checklist`} className="created-board-card surface-card">
                  <div className="created-board-card-top">
                    <div className="created-board-card-head">
                      <strong>{checklistName}</strong>
                      <p>{board.name}</p>
                    </div>
                    <div className="saved-board-list created-board-card-stats">
                      <span className="chip primary">Secciones: {sectionsCount}</span>
                      <span className="chip">Checks: {checksCount}</span>
                    </div>
                  </div>

                  <div className="board-meta-inline created-board-card-meta">
                    <span>Player principal · {userMap.get(board.ownerId)?.name || "N/A"}</span>
                    <span>Creó · {userMap.get(board.createdById)?.name || "N/A"}</span>
                    <span>Actividades vinculadas · {linkedActivityNames.length}</span>
                  </div>

                  <div className="saved-board-list" style={{ marginBottom: "0.7rem", gap: "0.35rem", alignItems: "center" }}>
                    {linkedActivityNames.length
                      ? linkedActivityNames.map((activityName) => (
                          <div key={`${board.id}-${activityName}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <span className="chip">{activityName}</span>
                            <button
                              type="button"
                              className="icon-button danger"
                              onClick={() => void unlinkChecklistActivityFromBoard(board.id, activityName)}
                              disabled={Boolean(unlinkingChecklistItems[`${board.id}:${activityName}`])}
                              title="Eliminar vínculo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      : <span className="subtle-line">Sin actividades vinculadas todavía.</span>}
                  </div>

                  <div className="toolbar-actions">
                    <button type="button" className="primary-button created-board-open-action" onClick={() => {
                      setSelectedCustomBoardId(board.id);
                      setPage(PAGE_CUSTOM_BOARDS);
                    }}>
                      <LayoutDashboard size={16} /> Abrir en Mis tableros
                    </button>
                    {actionPermissions.editBoard && canEditBoard(currentUser, board) ? (
                      <button type="button" className="icon-button" onClick={() => openEditBoardBuilder(board)}>
                        <Pencil size={15} /> Editar checklist
                      </button>
                    ) : null}
                    <button type="button" className="icon-button" onClick={() => downloadBoardAsJson(board)}>
                      Exportar JSON
                    </button>
                  </div>
                </article>
              ))}
          </div>

          {!checklistBoards.length ? (
            <p className="subtle-line" style={{ margin: "0.9rem 0 0 0" }}>
              Todavía no hay tableros con checklist activo. La plantilla base ya está visible arriba para que la uses y la edites.
            </p>
          ) : null}
        </article>
      ) : null}

      <Modal
        open={checklistEditorOpen}
        title={checklistEditorMode === "create" ? "Crear checklist" : "Editar plantilla de checklist"}
        confirmLabel="Cerrar"
        hideCancel
        onClose={() => setChecklistEditorOpen(false)}
        onConfirm={() => setChecklistEditorOpen(false)}
        footerActions={(
          <button type="button" className="icon-button" onClick={persistChecklistTemplateDraft} disabled={checklistTemplateSaving}>
            {checklistTemplateSaving ? "Guardando..." : checklistEditorMode === "create" ? "Crear checklist" : "Guardar cambios"}
          </button>
        )}
      >
        <div style={{ display: "grid", gap: "0.85rem" }}>
          <div className="toolbar-actions" style={{ justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap" }}>
            <label className="app-modal-field" style={{ margin: 0, flex: 2, minWidth: "220px" }}>
              <span>Nombre de checklist</span>
              <input
                value={checklistTemplateDraft.name}
                onChange={(event) => updateChecklistTemplateDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Checklist operativo"
              />
            </label>
            <label className="app-modal-field" style={{ margin: 0, flex: 1, minWidth: "160px" }}>
              <span>Área</span>
              <select
                value={normalizeChecklistAreaLabel(checklistTemplateDraft.area)}
                onChange={(event) => updateChecklistTemplateDraft((current) => ({ ...current, area: normalizeChecklistAreaLabel(event.target.value) }))}
                disabled={checklistTemplateDraft.isBuiltIn}
              >
                {CHECKLIST_AREA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
                {!CHECKLIST_AREA_OPTIONS.some((option) => option.value === normalizeChecklistAreaLabel(checklistTemplateDraft.area))
                  ? <option value={normalizeChecklistAreaLabel(checklistTemplateDraft.area)}>{normalizeChecklistAreaLabel(checklistTemplateDraft.area)}</option>
                  : null}
              </select>
            </label>
            {!checklistTemplateDraft.isBuiltIn ? null : (
              <button type="button" className="icon-button" onClick={resetChecklistTemplateDraft}>Restaurar base</button>
            )}
          </div>

          <article className="surface-card" style={{ padding: "0.75rem", display: "grid", gap: "0.55rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <strong>Naves del checklist</strong>
              <div className="toolbar-actions" style={{ gap: "0.35rem" }}>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => updateChecklistTemplateDraft((current) => ({ ...current, siteOptions: [] }))}
                  title="Quitar todas las naves"
                >
                  Vaciar
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => updateChecklistTemplateDraft((current) => ({ ...current, siteOptions: [...CHECKLIST_SITE_OPTIONS] }))}
                  title="Marcar todas las naves"
                >
                  Marcar todas
                </button>
              </div>
            </div>
            <p className="subtle-line" style={{ margin: 0 }}>
              Toca cada nave para incluirla o quitarla. Si la lista está vacía, el checklist se ejecuta en modo nave única.
            </p>
            <div className="saved-board-list" style={{ gap: "0.4rem" }}>
              {CHECKLIST_SITE_OPTIONS.map((siteOption) => {
                const active = (Array.isArray(checklistTemplateDraft.siteOptions) ? checklistTemplateDraft.siteOptions : []).includes(siteOption);
                return (
                  <button
                    key={siteOption}
                    type="button"
                    className={active ? "tab active" : "tab"}
                    onClick={() => toggleChecklistSite(siteOption)}
                    aria-pressed={active}
                  >
                    {active ? "✓ " : ""}{siteOption}
                  </button>
                );
              })}
            </div>
          </article>

          <div style={{ display: "grid", gap: "0.7rem", maxHeight: "55vh", overflowY: "auto", paddingRight: "0.2rem" }}>
            {checklistTemplateDraft.sections.map((section) => (
              <article key={section.id} className="surface-card" style={{ padding: "0.75rem", display: "grid", gap: "0.55rem" }}>
                <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.8fr) auto" }}>
                  <label className="app-modal-field" style={{ margin: 0 }}>
                    <span>Sección</span>
                    <input value={section.title} onChange={(event) => updateChecklistSection(section.id, { title: event.target.value })} />
                  </label>
                  <label className="app-modal-field" style={{ margin: 0 }}>
                    <span>Categoría</span>
                    <input value={section.incidenceCategory || ""} onChange={(event) => updateChecklistSection(section.id, { incidenceCategory: event.target.value })} />
                  </label>
                  <button type="button" className="icon-button danger" onClick={() => removeChecklistSection(section.id)} disabled={checklistTemplateDraft.sections.length <= 1}>
                    <Trash2 size={15} />
                  </button>
                </div>

                <div style={{ display: "grid", gap: "0.45rem" }}>
                  {section.checks.map((check) => {
                    const templateSites = Array.isArray(checklistTemplateDraft.siteOptions) ? checklistTemplateDraft.siteOptions : [];
                    const checkSiteOptions = templateSites.length ? templateSites : CHECKLIST_SITE_OPTIONS;
                    return (
                      <div key={check.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "0.45rem", alignItems: "start" }}>
                        <div style={{ display: "grid", gap: "0.35rem" }}>
                          <label className="app-modal-field" style={{ margin: 0 }}>
                            <span>Check</span>
                            <input value={check.label} onChange={(event) => updateChecklistCheck(section.id, check.id, { label: event.target.value })} />
                          </label>
                          {checkSiteOptions.length ? (
                            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                              <span className="subtle-line" style={{ fontSize: "0.72rem" }}>Naves específicas (opcional):</span>
                              {checkSiteOptions.map((siteOption) => {
                                const active = Array.isArray(check.siteOptions) ? check.siteOptions.includes(siteOption) : false;
                                return (
                                  <button
                                    key={siteOption}
                                    type="button"
                                    className={active ? "tab active" : "tab"}
                                    onClick={() => toggleChecklistCheckSite(section.id, check.id, siteOption)}
                                    aria-pressed={active}
                                    style={{ fontSize: "0.8rem", padding: "0.25rem 0.45rem" }}
                                  >
                                    {active ? "✓ " : ""}{siteOption}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                        <button type="button" className="icon-button danger" onClick={() => removeChecklistCheck(section.id, check.id)} disabled={section.checks.length <= 1}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="toolbar-actions">
                  <button type="button" className="icon-button" onClick={() => addChecklistCheck(section.id)}>
                    <Plus size={15} /> Agregar check
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="toolbar-actions" style={{ justifyContent: "space-between" }}>
            <button type="button" className="icon-button" onClick={addChecklistSection}>
              <Plus size={15} /> Agregar sección
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setChecklistEditorOpen(false);
                openChecklistLinkModal();
              }}
              disabled={!actionPermissions.editCatalog || !activeCatalogItems.length}
            >
              Vincular esta versión a una actividad
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={checklistLinkModal.open}
        title="Vincular checklist a actividad"
        confirmLabel={checklistLinkModal.saving ? "Vinculando..." : "Vincular"}
        cancelLabel="Cancelar"
        onClose={() => {
          if (checklistLinkModal.saving) return;
          setChecklistLinkModal({ open: false, category: "General", itemId: "", saving: false, error: "" });
        }}
        onConfirm={() => { void submitChecklistActivityLink(); }}
        confirmDisabled={checklistLinkModal.saving || !checklistLinkModal.itemId}
      >
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <p className="subtle-line" style={{ margin: 0 }}>
            Selecciona primero el catálogo y después la actividad. Este checklist se abrirá al iniciar esa actividad.
          </p>
          <label className="app-modal-field" style={{ margin: 0 }}>
            <span>Catálogo</span>
            <select
              value={checklistLinkModal.category}
              onChange={(event) => updateChecklistLinkCategory(event.target.value)}
              disabled={checklistLinkModal.saving}
            >
              {checklistCatalogCategoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="app-modal-field" style={{ margin: 0 }}>
            <span>Actividad</span>
            <select
              value={checklistLinkModal.itemId}
              onChange={(event) => setChecklistLinkModal((current) => ({ ...current, itemId: event.target.value, error: "" }))}
              disabled={checklistLinkModal.saving || !checklistCatalogActivities.length}
            >
              {!checklistCatalogActivities.length ? <option value="">No hay actividades en este catálogo</option> : null}
              {checklistCatalogActivities.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          {checklistLinkModal.error ? <p className="validation-text" style={{ margin: 0 }}>{checklistLinkModal.error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={createListModal.open}
        title="Nueva lista de actividades"
        confirmLabel="Crear y agregar actividad"
        cancelLabel="Cancelar"
        onClose={handleCloseCreateCategoryModal}
        onConfirm={handleConfirmCreateCategory}
      >
        <p className="subtle-line">Define el nombre de la lista para agrupar actividades.</p>
        <label className="app-modal-field">
          <span>Nombre de la lista</span>
          <input
            value={createListModal.name}
            onChange={(event) => setCreateListModal((current) => ({ ...current, name: event.target.value, error: "" }))}
            placeholder="Ej: Limpieza, Seguridad, Producción"
            autoFocus
          />
        </label>
        {createListModal.error ? <p className="validation-text">{createListModal.error}</p> : null}
      </Modal>
    </section>
  );
}
