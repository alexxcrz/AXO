import {
  BOARD_ACTIVITY_LIST_FIELD,
  INVENTORY_LOOKUP_LOGISTICS_FIELD,
  PAGE_CUSTOM_BOARDS,
} from "../utils/constantes.js";
import { PROTECTED_SYSTEM_BOARD_TEMPLATE_IDS } from "../utils/systemBoardTemplates.js";
import {
  createEmptyFieldDraft,
  createEmptyBoardDraft,
  withDefaultBoardSettings,
  getNormalizedBoardColumnOrder,
  syncBoardFieldOrderIntoColumnOrder,
  buildTemplateColumns,
  normalizeBoardSharedDepartments,
  normalizeAreaOption,
  getUserArea,
  getAreaRoot,
  buildBoardSavePayload,
  resolveInventoryPropertySourceFieldId,
  getNormalizedFormulaTerms,
  buildInventoryBundleFields,
  buildUpdatedDraftColumns,
  mapColumnToFieldDraft,
  makeId,
  applyRemoteWarehouseState,
  buildImportedBoardRowValuesPatch,
} from "../utils/utilidades.jsx";

/** Constructor y plantillas de tablero */
export function createBoardToolModalActions(deps) {
  const {
    controlBoardDraft,
    setControlBoardDraft,
    editingDraftColumnId,
    setEditingDraftColumnId,
    setComponentStudioOpen,
    setControlBoardFeedback,
    templateEditorModal,
    setTemplateEditorModal,
    templateDeleteModal,
    setTemplateDeleteModal,
    templatePreviewId,
    setTemplatePreviewId,
    boardBuilderModal,
    setBoardBuilderModal,
    isBoardSaveSubmitting,
    setIsBoardSaveSubmitting,
    boardImportedRowsDraft,
    setBoardImportedRowsDraft,
    setExcelFormulaWizard,
    setHiddenBaseTemplateIds,
    customTemplateIds,
    availableBoardTemplates,
    currentUser,
    actionPermissions,
    selectedAreaSectionId,
    selectedAreaSection,
    userMap,
    visibleUsers,
    state,
    setState,
    setPage,
    setSelectedCustomBoardId,
    setSelectedCustomBoardViewId,
    setBoardRuntimeFeedback,
    activeAreaScopes,
    canDeleteBoardTemplateEntry,
    resolveProtectedSystemTemplate,
    getBoardVisibleToUser,
    requestJson,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
    EMPTY_OBJECT,
  } = deps;

    function addDraftColumn() {
      if (!controlBoardDraft.fieldLabel.trim()) {
        setControlBoardFeedback("Escribe una etiqueta para el campo antes de agregarlo.");
        return;
      }
      const resolvedInventorySourceFieldId = controlBoardDraft.fieldType === "inventoryProperty"
        ? resolveInventoryPropertySourceFieldId(controlBoardDraft.columns, controlBoardDraft.sourceFieldId)
        : controlBoardDraft.sourceFieldId || null;
      if (controlBoardDraft.fieldType === "inventoryProperty" && !resolvedInventorySourceFieldId) {
        setControlBoardFeedback("Agrega primero un Buscador de inventario y luego enlaza este dato derivado.");
        return;
      }
      const normalizedFormulaTerms = getNormalizedFormulaTerms(controlBoardDraft.formulaTerms, controlBoardDraft);
      if (controlBoardDraft.fieldType === "formula" && normalizedFormulaTerms.length < 2) {
        setControlBoardFeedback("Agrega al menos 2 términos para completar la fórmula o cálculo.");
        return;
      }
      const isActivityListField = controlBoardDraft.fieldType === BOARD_ACTIVITY_LIST_FIELD;
      const colorRules = controlBoardDraft.colorValue
        ? [{ operator: controlBoardDraft.colorOperator, value: controlBoardDraft.colorValue, color: controlBoardDraft.colorBg, textColor: controlBoardDraft.colorText }]
        : [];
      const normalizedWidthPx = Number(controlBoardDraft.fieldWidthPx || 0);
      const widthPx = Number.isFinite(normalizedWidthPx) && normalizedWidthPx >= 90 ? Math.round(normalizedWidthPx) : null;
      const field = {
        id: makeId("fld"),
        label: controlBoardDraft.fieldLabel.trim(),
        type: isActivityListField ? "select" : controlBoardDraft.fieldType,
        optionSource: isActivityListField ? "catalogByCategory" : controlBoardDraft.optionSource,
        optionCatalogCategory: controlBoardDraft.optionCatalogCategory,
        options: isActivityListField ? [] : controlBoardDraft.optionsText.split(",").map((item) => item.trim()).filter(Boolean),
        inventoryProperty: controlBoardDraft.inventoryProperty,
        sourceFieldId: resolvedInventorySourceFieldId,
        formulaOperation: controlBoardDraft.formulaOperation,
        formulaLeftFieldId: controlBoardDraft.formulaLeftFieldId || null,
        formulaRightFieldId: controlBoardDraft.formulaRightFieldId || null,
        formulaTerms: normalizedFormulaTerms,
        helpText: controlBoardDraft.fieldHelp.trim(),
        placeholder: controlBoardDraft.placeholder.trim(),
        defaultValue: controlBoardDraft.defaultValue,
        width: controlBoardDraft.fieldWidth,
        widthPx,
        required: controlBoardDraft.isRequired === "true",
        groupName: controlBoardDraft.groupName.trim() || "General",
        groupColor: controlBoardDraft.groupColor,
        colorRules,
      };
      if (editingDraftColumnId) {
        const existingColumn = controlBoardDraft.columns.find((item) => item.id === editingDraftColumnId);
        if (existingColumn?.layoutBlockRole) field.layoutBlockRole = existingColumn.layoutBlockRole;
        if (Array.isArray(existingColumn?.finishGateEditorUserIds)) {
          field.finishGateEditorUserIds = [...existingColumn.finishGateEditorUserIds];
        }
      }
      const isBundleField = controlBoardDraft.fieldType === INVENTORY_LOOKUP_LOGISTICS_FIELD;
      const fieldsToInsert = controlBoardDraft.fieldType === INVENTORY_LOOKUP_LOGISTICS_FIELD
        ? buildInventoryBundleFields(controlBoardDraft, editingDraftColumnId || null)
        : [field];
      setControlBoardDraft((current) => {
        const nextColumns = buildUpdatedDraftColumns(current.columns, editingDraftColumnId, isBundleField, fieldsToInsert);
        const currentSettings = current.settings ?? EMPTY_OBJECT;
        const nextColumnOrder = syncBoardFieldOrderIntoColumnOrder(nextColumns, currentSettings);
        return {
          ...current,
          columns: nextColumns,
          settings: {
            ...currentSettings,
            columnOrder: nextColumnOrder,
          },
          ...createEmptyFieldDraft(),
        };
      });
      setEditingDraftColumnId(null);
      setComponentStudioOpen(false);
      let feedbackMessage = "Componente agregado al tablero borrador.";
      if (editingDraftColumnId) {
        feedbackMessage = "Componente actualizado correctamente.";
      } else if (fieldsToInsert.length > 1) {
        feedbackMessage = "Buscador agregado con sus columnas automáticas.";
      }
      setControlBoardFeedback(feedbackMessage);
    }

    function removeDraftColumn(columnId) {
      setControlBoardDraft((current) => {
        const nextColumns = current.columns.filter((column) => column.id !== columnId);
        const currentSettings = current.settings ?? EMPTY_OBJECT;
        return {
          ...current,
          columns: nextColumns,
          settings: {
            ...currentSettings,
            columnOrder: getNormalizedBoardColumnOrder({ fields: nextColumns, settings: currentSettings }),
          },
        };
      });
      setControlBoardFeedback("Columna eliminada del borrador.");
    }

    function editDraftColumn(columnId) {
      const column = controlBoardDraft.columns.find((item) => item.id === columnId);
      if (!column) return;
      setControlBoardDraft((current) => ({
        ...current,
        ...mapColumnToFieldDraft(column, current.columns),
      }));
      setEditingDraftColumnId(columnId);
      setComponentStudioOpen(true);
      setControlBoardFeedback("");
    }

    function duplicateDraftColumn(columnId) {
      setControlBoardDraft((current) => {
        const index = current.columns.findIndex((item) => item.id === columnId);
        if (index === -1) return current;
        const currentSettings = current.settings ?? EMPTY_OBJECT;
        const source = current.columns[index];
        const duplicate = {
          ...source,
          id: makeId("fld"),
          label: `${source.label} copia`,
        };
        const nextColumns = [...current.columns];
        nextColumns.splice(index + 1, 0, duplicate);
        return {
          ...current,
          columns: nextColumns,
          settings: {
            ...currentSettings,
            columnOrder: syncBoardFieldOrderIntoColumnOrder(nextColumns, currentSettings),
          },
        };
      });
      setControlBoardFeedback("Componente duplicado.");
    }

    function moveDraftColumn(columnId, direction) {
      setControlBoardDraft((current) => {
        const index = current.columns.findIndex((item) => item.id === columnId);
        if (index === -1) return current;
        const currentSettings = current.settings ?? EMPTY_OBJECT;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= current.columns.length) return current;
        const nextColumns = [...current.columns];
        const [moved] = nextColumns.splice(index, 1);
        nextColumns.splice(targetIndex, 0, moved);
        return {
          ...current,
          columns: nextColumns,
          settings: {
            ...currentSettings,
            columnOrder: syncBoardFieldOrderIntoColumnOrder(nextColumns, currentSettings),
          },
        };
      });
    }

    function reorderDraftColumn(sourceColumnId, targetColumnId) {
      if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) return;
      setControlBoardDraft((current) => {
        const sourceIndex = current.columns.findIndex((item) => item.id === sourceColumnId);
        const targetIndex = current.columns.findIndex((item) => item.id === targetColumnId);
        if (sourceIndex === -1 || targetIndex === -1) return current;
        const currentSettings = current.settings ?? EMPTY_OBJECT;
        const nextColumns = [...current.columns];
        const [moved] = nextColumns.splice(sourceIndex, 1);
        nextColumns.splice(targetIndex, 0, moved);
        return {
          ...current,
          columns: nextColumns,
          settings: {
            ...currentSettings,
            columnOrder: syncBoardFieldOrderIntoColumnOrder(nextColumns, currentSettings),
          },
        };
      });
    }

    function applyBoardTemplate(templateId) {
      const template = availableBoardTemplates.find((item) => item.id === templateId);
      if (!template) return;

      const templateColumns = buildTemplateColumns(template);
      if (!templateColumns.length) {
        setControlBoardFeedback(`La plantilla ${template.name} no tiene columnas configuradas. Contacta al administrador.`);
        return;
      }

      const ownerId = currentUser?.id || "";
      const ownerArea = resolveBoardOwnerAreaByUserId(ownerId);
      const isSystemTemplate = PROTECTED_SYSTEM_BOARD_TEMPLATE_IDS.has(String(template.id || "").trim());
      const templateSettings = template.settings && typeof template.settings === "object" ? template.settings : undefined;

      setControlBoardDraft((current) => ({
        ...current,
        name: template.name,
        description: template.description,
        ownerId: ownerId || current.ownerId,
        visibilityType: isSystemTemplate && ownerArea ? "department" : current.visibilityType,
        sharedDepartments: isSystemTemplate && ownerArea ? normalizeBoardSharedDepartments([ownerArea]) : current.sharedDepartments,
        accessUserIds: isSystemTemplate ? [] : current.accessUserIds,
        settings: withDefaultBoardSettings({
          ...current.settings,
          ...templateSettings,
          ownerArea: ownerArea || current.settings?.ownerArea || "",
          columnOrder: [],
        }),
        columns: templateColumns,
        ...createEmptyFieldDraft(),
      }));
      setEditingDraftColumnId(null);
      setTemplatePreviewId(null);
      setControlBoardFeedback(`Plantilla ${template.name} cargada al borrador (${templateColumns.length} campos). Revisa el área y guarda el tablero.`);
    }

    function previewBoardTemplate(templateId) {
      setTemplatePreviewId(templateId);
    }

    async function saveDraftAsBoardTemplate() {
      if (!controlBoardDraft.name.trim() || !controlBoardDraft.columns.length || !actionPermissions.saveTemplate) {
        setControlBoardFeedback("Define nombre y al menos un componente antes de guardar una plantilla reutilizable.");
        return;
      }

      const templateName = controlBoardDraft.name.trim();
      const templatePayload = {
        name: templateName,
        description: controlBoardDraft.description.trim() || `Plantilla reutilizable para ${templateName}.`,
        category: "Personalizada",
        visibilityType: currentUser?.department ? "department" : "users",
        sharedDepartments: currentUser?.department ? [currentUser.department] : [],
        sharedUserIds: currentUser ? [currentUser.id] : [],
        settings: { ...controlBoardDraft.settings },
        columns: (controlBoardDraft.columns || []).map((column) => ({
          ...column,
          templateKey: column.templateKey || column.id,
        })),
      };

      try {
        const result = await requestJson("/warehouse/templates", {
          method: "POST",
          body: JSON.stringify(templatePayload),
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setControlBoardFeedback(`Plantilla ${templateName} guardada para reutilizarla cuando quieras.`);
      } catch (error) {
        setControlBoardFeedback(error?.message || "No se pudo guardar la plantilla.");
      }
    }

    async function submitBoardTemplateEdit() {
      setTemplateEditorModal((current) => ({ ...current, submitting: true }));
      if (!templateEditorModal.id || !templateEditorModal.name.trim() || !actionPermissions.editTemplate) {
        setTemplateEditorModal((current) => ({ ...current, submitting: false }));
        setControlBoardFeedback("La plantilla debe tener nombre para guardar los cambios.");
        return;
      }

      try {
        const result = await requestJson(`/warehouse/templates/${templateEditorModal.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: templateEditorModal.name.trim(),
            description: templateEditorModal.description.trim(),
            category: templateEditorModal.category.trim() || "Personalizada",
            visibilityType: templateEditorModal.visibilityType,
            sharedDepartments: templateEditorModal.sharedDepartments,
            sharedUserIds: templateEditorModal.sharedUserIds,
          }),
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setTemplateEditorModal({ open: false, id: null, name: "", description: "", category: "", visibilityType: "department", sharedDepartments: [], sharedUserIds: [], submitting: false });
        setControlBoardFeedback("Plantilla actualizada correctamente.");
      } catch (error) {
        setTemplateEditorModal((current) => ({ ...current, submitting: false }));
        setControlBoardFeedback(error?.message || "No se pudo actualizar la plantilla.");
      }
    }

    function openDeleteBoardTemplateModal(template) {
      if (!template) return;
      if (!canDeleteBoardTemplateEntry(template)) return;
      setTemplateDeleteModal({ open: true, id: template.id, name: template.name || "Plantilla" });
    }

    async function confirmDeleteBoardTemplate() {
      if (!templateDeleteModal.id) return;

      const templateToDelete = availableBoardTemplates.find((template) => template.id === templateDeleteModal.id) || null;
      if (templateToDelete && !canDeleteBoardTemplateEntry(templateToDelete)) {
        setTemplateDeleteModal({ open: false, id: null, name: "" });
        return;
      }

      if (!customTemplateIds.has(templateDeleteModal.id)) {
        setHiddenBaseTemplateIds((current) => current.includes(templateDeleteModal.id)
          ? current
          : current.concat(templateDeleteModal.id));
        if (templatePreviewId === templateDeleteModal.id) {
          setTemplatePreviewId(null);
        }
        setControlBoardFeedback(`Plantilla ${templateDeleteModal.name} eliminada correctamente.`);
        setTemplateDeleteModal({ open: false, id: null, name: "" });
        return;
      }

      try {
        const result = await requestJson(`/warehouse/templates/${templateDeleteModal.id}`, {
          method: "DELETE",
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        if (templatePreviewId === templateDeleteModal.id) {
          setTemplatePreviewId(null);
        }
        setControlBoardFeedback(`Plantilla ${templateDeleteModal.name} eliminada correctamente.`);
        setTemplateDeleteModal({ open: false, id: null, name: "" });
      } catch (error) {
        setControlBoardFeedback(error?.message || "No se pudo eliminar la plantilla.");
      }
    }

    function openComponentStudio() {
      setControlBoardDraft((current) => ({
        ...current,
        ...createEmptyFieldDraft(),
      }));
      setEditingDraftColumnId(null);
      setComponentStudioOpen(true);
      setControlBoardFeedback("");
    }

    function resolveBoardOwnerAreaByUserId(userId) {
      const sectionScopes = Array.isArray(selectedAreaSection?.scopes)
        ? selectedAreaSection.scopes.map((scope) => normalizeAreaOption(scope)).filter((scope) => scope && scope !== "SIN AREA")
        : [];
      if (selectedAreaSectionId !== "all" && sectionScopes.length) {
        return sectionScopes[0];
      }
      const responsibleUser = userMap.get(userId) || null;
      const normalizedArea = normalizeAreaOption(getAreaRoot(getUserArea(responsibleUser)) || getUserArea(responsibleUser));
      return normalizedArea && normalizedArea !== "SIN AREA" ? normalizedArea : "";
    }

    async function importDraftRowsIntoBoard(createdBoardId, payload, initialState) {
      const rowsToImport = boardImportedRowsDraft.slice(0, 500);
      const yesValues = new Set(["si", "sí", "true", "1", "yes", "y"]);

      const bulkRows = rowsToImport.map((importedRow) => {
        const values = buildImportedBoardRowValuesPatch(importedRow, payload.columns, visibleUsers, state.inventoryItems || [], yesValues);
        return { values };
      }).filter((item) => Object.keys(item.values).length > 0);

      if (!bulkRows.length) return initialState;

      const latestRemoteState = await requestJson(`/warehouse/boards/${createdBoardId}/rows/bulk`, {
        method: "POST",
        body: JSON.stringify({ rows: bulkRows }),
      });

      return latestRemoteState;
    }

    async function saveControlBoard() {
      if (isBoardSaveSubmitting) return;
      const isEditing = boardBuilderModal.mode === "edit" && boardBuilderModal.boardId;
      const hasPermission = isEditing ? actionPermissions.editBoard : actionPermissions.createBoard;
      if (!currentUser || !hasPermission || !controlBoardDraft.name.trim() || !controlBoardDraft.columns.length) {
        setControlBoardFeedback("Agrega nombre, dueño y al menos un campo para guardar el tablero.");
        return;
      }

      const sectionScopedBoardAreas = selectedAreaSectionId !== "all" && Array.isArray(selectedAreaSection?.scopes)
        ? selectedAreaSection.scopes.map((scope) => normalizeAreaOption(scope)).filter((scope) => scope && scope !== "SIN AREA")
        : [];
      const forcedBoardArea = sectionScopedBoardAreas[0] || "";
      const selectedBoardArea = forcedBoardArea || normalizeAreaOption(controlBoardDraft.settings?.ownerArea || "");
      if (!selectedBoardArea || selectedBoardArea === "SIN AREA") {
        setControlBoardFeedback("Selecciona el area duena del tablero para evitar cruces de datos en indicadores.");
        return;
      }

      const ownerId = controlBoardDraft.ownerId || currentUser.id;
      const { payload } = buildBoardSavePayload(controlBoardDraft, ownerId);
      const protectedTemplate = resolveProtectedSystemTemplate(controlBoardDraft);
      if (protectedTemplate) {
        payload.settings = {
          ...payload.settings,
          systemBoardTemplateId: protectedTemplate.id,
          systemBoardLocked: true,
        };
        if (!forcedBoardArea && selectedBoardArea) {
          payload.visibilityType = "department";
          payload.sharedDepartments = normalizeBoardSharedDepartments([selectedBoardArea]);
          payload.accessUserIds = [];
        }
      }
      if (forcedBoardArea) {
        payload.settings = {
          ...payload.settings,
          ownerArea: forcedBoardArea,
        };
      }
      setIsBoardSaveSubmitting(true);
      setControlBoardFeedback("");

      try {
        const result = await requestJson(
          isEditing ? `/warehouse/boards/${boardBuilderModal.boardId}` : "/warehouse/boards",
          {
            method: isEditing ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        );
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        const createdBoardId = result.data.boardId || boardBuilderModal.boardId || "";

        if (!isEditing && createdBoardId && boardImportedRowsDraft.length) {
          const latestRemoteState = await importDraftRowsIntoBoard(createdBoardId, payload, result.data.state);
          applyRemoteWarehouseState(latestRemoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
          setBoardRuntimeFeedback({
            tone: "success",
            message: `Se creó ${payload.name} y se importaron ${Math.min(boardImportedRowsDraft.length, 500)} fila(s) desde Excel.${boardImportedRowsDraft.length > 500 ? " Solo se importaron las primeras 500 por rendimiento." : ""}`,
          });
        }

        const savedBoard = (result.data.state?.controlBoards || []).find((board) => board.id === createdBoardId) || null;
        const boardVisibleInList = savedBoard && (() => {
          if (!getBoardVisibleToUser(savedBoard, currentUser)) return false;
          if (!activeAreaScopes.length) return true;
          const boardAreas = [
            ...(savedBoard?.settings?.ownerArea ? [savedBoard.settings.ownerArea] : []),
            ...(savedBoard.sharedDepartments || []),
          ];
          return boardAreas.some((area) =>
            activeAreaScopes.some((selectedArea) => normalizeAreaOption(area) === normalizeAreaOption(selectedArea)),
          );
        })();

        setSelectedCustomBoardId(createdBoardId);
        setSelectedCustomBoardViewId("current");
        if (!isEditing) {
          setPage(PAGE_CUSTOM_BOARDS);
        }
        setBoardBuilderModal({ open: false, mode: "create", boardId: null });
        setTemplatePreviewId(null);
        setControlBoardDraft({
          ...createEmptyBoardDraft(),
          ownerId: currentUser.id,
          settings: {
            ...withDefaultBoardSettings(createEmptyBoardDraft().settings),
            ownerArea: resolveBoardOwnerAreaByUserId(currentUser.id),
          },
        });
        setBoardImportedRowsDraft([]);
        setExcelFormulaWizard({ open: false, items: [] });
        setControlBoardFeedback("");
        if (isEditing || !boardImportedRowsDraft.length) {
          const boardAreaLabel = savedBoard?.settings?.ownerArea || payload.settings?.ownerArea || "sin área";
          setBoardRuntimeFeedback({
            tone: boardVisibleInList ? "success" : "warning",
            message: isEditing
              ? `Se actualizó ${payload.name} sin cambiarte de pantalla.`
              : boardVisibleInList
                ? `Se creó ${payload.name} y ya aparece en Mis tableros.`
                : `Se creó ${payload.name} (área ${boardAreaLabel}), pero no se ve en el filtro actual del menú lateral. Abre "Todas las áreas" o el área ${boardAreaLabel}.`,
          });
        }
      } catch (error) {
        setControlBoardFeedback(error?.message || "No se pudo guardar el tablero.");
      } finally {
        setIsBoardSaveSubmitting(false);
      }
    }

  return {
        addDraftColumn,
    removeDraftColumn,
    editDraftColumn,
    duplicateDraftColumn,
    moveDraftColumn,
    reorderDraftColumn,
    applyBoardTemplate,
    previewBoardTemplate,
    saveDraftAsBoardTemplate,
    submitBoardTemplateEdit,
    openDeleteBoardTemplateModal,
    confirmDeleteBoardTemplate,
    saveControlBoard,
    openComponentStudio,
    resolveBoardOwnerAreaByUserId,
  };
}
