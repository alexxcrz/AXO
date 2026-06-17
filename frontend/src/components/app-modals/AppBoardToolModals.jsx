/* eslint-disable no-unused-vars -- props desde App.jsx */
import { Suspense } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../Modal";
import { BoardBuilderModal, BoardComponentStudioModal } from "../ModalesConstructorTableros";
import { FORMULA_OPERATIONS } from "../../utils/constantes.js";
import { createEmptyFieldDraft } from "../../utils/utilidades.jsx";

/** Modales extra�dos de App.jsx � AppBoardToolModals */
export function AppBoardToolModals(props) {
  const {
    templateEditorModal,
    setTemplateEditorModal,
    submitBoardTemplateEdit,
    departmentOptions,
    activeAssignableUsers,
    templateDeleteModal,
    setTemplateDeleteModal,
    confirmDeleteBoardTemplate,
    boardBuilderModal,
    controlBoardDraft,
    setControlBoardDraft,
    closeBoardBuilderModal,
    saveControlBoard,
    isBoardSaveSubmitting,
    openComponentStudio,
    openBoardExcelImportPicker,
    saveDraftAsBoardTemplate,
    clearControlBoardDraft,
    controlBoardFeedback,
    templateSearch,
    setTemplateSearch,
    templateCategoryFilter,
    setTemplateCategoryFilter,
    templateCategories,
    filteredBoardTemplates,
    previewBoardTemplate,
    applyBoardTemplate,
    openDeleteBoardTemplateModal,
    canDeleteBoardTemplateEntry,
    selectedPreviewTemplate,
    setTemplatePreviewId,
    boardBuilderPreview,
    draftColumnGroups,
    moveDraftColumn,
    reorderDraftColumn,
    duplicateDraftColumn,
    editDraftColumn,
    removeDraftColumn,
    visibleUsers,
    userMap,
    selectedAreaSectionId,
    selectedAreaSection,
    BOARD_OPERATIONAL_CONTEXT_OPTIONS,
    boardExcelFileInputRef,
    importBoardStructureFromExcel,
    componentStudioOpen,
    setComponentStudioOpen,
    editingDraftColumnId,
    setEditingDraftColumnId,
    createEmptyFieldDraft,
    addDraftColumn,
    boardSectionOptions,
    activityCatalogCategoryOptions,
    contextoConstructor,
    excelFormulaWizard,
    setExcelFormulaWizard,
    applyExcelFormulaWizard,
    updateExcelFormulaWizardItem,
    removeExcelFormulaWizardItem,
    FORMULA_OPERATIONS,
    actionPermissions,
    currentUser,
    state,
  } = props;

  return (
    <>
<Modal open={templateEditorModal.open} title="Editar plantilla guardada" confirmLabel="Guardar cambios" cancelLabel="Cancelar" onClose={() => setTemplateEditorModal({ open: false, id: null, name: "", description: "", category: "", visibilityType: "department", sharedDepartments: [], sharedUserIds: [], submitting: false })} onConfirm={submitBoardTemplateEdit} confirmDisabled={templateEditorModal.submitting}>
      <div className="modal-form-grid">
        <label className="app-modal-field">
          <span>Nombre de plantilla</span>
          <input value={templateEditorModal.name} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="app-modal-field">
          <span>Categoría</span>
          <input value={templateEditorModal.category} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, category: event.target.value }))} placeholder="Ej: Embarques, Calidad, Producción" />
        </label>
        <label className="app-modal-field">
          <span>Compartir con</span>
          <select value={templateEditorModal.visibilityType} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, visibilityType: event.target.value }))}>
            <option value="department">Departamento</option>
                      <option value="users">Players específicos</option>
            <option value="all">Todos</option>
          </select>
        </label>
        {templateEditorModal.visibilityType === "department" ? (
          <label className="app-modal-field">
            <span>Departamentos con acceso</span>
            <select multiple value={templateEditorModal.sharedDepartments} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, sharedDepartments: Array.from(event.target.selectedOptions).map((option) => option.value) }))}>
              {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </label>
        ) : null}
        {templateEditorModal.visibilityType === "users" ? (
          <label className="app-modal-field">
                      <span>Players con acceso</span>
            <select multiple value={templateEditorModal.sharedUserIds} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, sharedUserIds: Array.from(event.target.selectedOptions).map((option) => option.value) }))}>
              {activeAssignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className="app-modal-field">
          <span>Descripción</span>
          <input value={templateEditorModal.description} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, description: event.target.value }))} placeholder="Explica para qué sirve esta plantilla" />
        </label>
      </div>
    </Modal>

    <Modal
      open={templateDeleteModal.open}
      backdropClassName="template-delete-backdrop"
      title="Eliminar plantilla"
      confirmLabel="Eliminar plantilla"
      cancelLabel="Cancelar"
      onClose={() => setTemplateDeleteModal({ open: false, id: null, name: "" })}
      onConfirm={confirmDeleteBoardTemplate}
    >
      <div className="modal-form-grid">
        <p className="subtle-line">Esta acción eliminará la plantilla guardada para todos los usuarios con acceso.</p>
        <p><strong>{templateDeleteModal.name || "Plantilla"}</strong></p>
        <p className="validation-text">No se puede deshacer.</p>
      </div>
    </Modal>

    <Suspense fallback={null}>
    <BoardBuilderModal
      open={boardBuilderModal.open}
      mode={boardBuilderModal.mode}
      selectedAreaSectionId={selectedAreaSectionId}
      selectedAreaSection={selectedAreaSection}
      draft={controlBoardDraft}
      onChange={setControlBoardDraft}
      onClose={closeBoardBuilderModal}
      onConfirm={saveControlBoard}
      confirmDisabled={isBoardSaveSubmitting}
      confirmLabel={isBoardSaveSubmitting ? (boardBuilderModal.mode === "edit" ? "Guardando cambios..." : "Creando tablero...") : undefined}
      onOpenComponentStudio={openComponentStudio}
      onImportFromExcel={openBoardExcelImportPicker}
      onSaveTemplate={actionPermissions.saveTemplate ? saveDraftAsBoardTemplate : null}
      onClear={clearControlBoardDraft}
      feedback={controlBoardFeedback}
      templateSearch={templateSearch}
      onTemplateSearchChange={setTemplateSearch}
      templateCategoryFilter={templateCategoryFilter}
      onTemplateCategoryChange={setTemplateCategoryFilter}
      templateCategories={templateCategories}
      filteredBoardTemplates={filteredBoardTemplates}
      onPreviewTemplate={previewBoardTemplate}
      onApplyTemplate={applyBoardTemplate}
      onDeleteTemplate={openDeleteBoardTemplateModal}
      canDeleteTemplate={canDeleteBoardTemplateEntry}
      selectedPreviewTemplate={selectedPreviewTemplate}
      onClearTemplatePreview={() => setTemplatePreviewId(null)}
      previewBoard={boardBuilderPreview}
      draftColumnGroups={draftColumnGroups}
      onMoveDraftColumn={moveDraftColumn}
      onReorderDraftColumn={reorderDraftColumn}
      onDuplicateDraftColumn={duplicateDraftColumn}
      onEditDraftColumn={editDraftColumn}
      onRemoveDraftColumn={removeDraftColumn}
      visibleUsers={visibleUsers}
      catalog={state.catalog}
      departmentOptions={departmentOptions}
      currentUser={currentUser}
      userMap={userMap}
      inventoryItems={state.inventoryItems}
      contextoConstructor={contextoConstructor}
      boardOperationalContextOptions={BOARD_OPERATIONAL_CONTEXT_OPTIONS}
      canSaveTemplate={actionPermissions.saveTemplate}
      canSaveBoard={actionPermissions.createBoard || actionPermissions.editBoard}
    />

    <input
      ref={boardExcelFileInputRef}
      type="file"
      accept=".xlsx"
      hidden
      onChange={importBoardStructureFromExcel}
    />

    <BoardComponentStudioModal open={componentStudioOpen} mode={editingDraftColumnId ? "edit" : "create"} draft={controlBoardDraft} onChange={setControlBoardDraft} onClose={() => { setComponentStudioOpen(false); setEditingDraftColumnId(null); setControlBoardDraft((current) => ({ ...current, ...createEmptyFieldDraft() })); }} onConfirm={addDraftColumn} catalog={state.catalog} inventoryItems={state.inventoryItems} visibleUsers={visibleUsers} sectionOptions={boardSectionOptions} activityCategoryOptions={activityCatalogCategoryOptions} contextoConstructor={contextoConstructor} />
    </Suspense>
    <Modal open={excelFormulaWizard.open} title="Asistente de fórmulas de Excel" confirmLabel="Aplicar mapeo" cancelLabel="Cerrar" onClose={() => setExcelFormulaWizard({ open: false, items: [] })} onConfirm={applyExcelFormulaWizard}>
      <div className="modal-form-grid">
        <p className="modal-footnote">Estas columnas tenían fórmulas que no se pudieron convertir automáticamente. Elige cómo debe comportarse cada campo en el tablero.</p>
        {(excelFormulaWizard.items || []).map((item, index) => (
          <section key={`${item.targetFieldId || item.targetLabel}-${index}`} className="surface-card" style={{ padding: "0.8rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
              <strong>{item.targetLabel}</strong>
              {item.fromMemory ? (
                <span style={{ fontSize: "0.7rem", background: "#314d69", color: "#ffffff", borderRadius: "999px", padding: "0.1rem 0.55rem", fontWeight: 600 }}>Desde memoria</span>
              ) : item.fromClassification ? (
                <span style={{ fontSize: "0.7rem", background: "#1d4ed8", color: "#ffffff", borderRadius: "999px", padding: "0.1rem 0.55rem", fontWeight: 600 }}>Auto-detectado</span>
              ) : null}
              {item.classification?.label ? (
                <span style={{ fontSize: "0.7rem", background: "#f3f4f6", color: "#374151", borderRadius: "999px", padding: "0.1rem 0.55rem" }}>{item.classification.label}</span>
              ) : null}
              <button
                type="button"
                className="icon-button danger"
                style={{ marginLeft: "auto", fontSize: "0.75rem" }}
                onClick={() => removeExcelFormulaWizardItem(index)}
                title="Omitir este campo del asistente"
              >
                <Trash2 size={13} /> Omitir
              </button>
            </div>
            {item.classification?.description ? (
              <p className="modal-footnote" style={{ marginBottom: "0.35rem", color: "#374151" }}>{item.classification.description}</p>
            ) : null}
            <p className="modal-footnote" style={{ marginBottom: "0.5rem" }}>
              Fórmula original: <code style={{ fontSize: "0.78rem", background: "#f1f5f9", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>{item.formula}</code>
            </p>

            <label className="app-modal-field" style={{ marginBottom: "0.6rem" }}>
              <span>Convertir como</span>
              <select
                value={item.targetType || "formula"}
                onChange={(event) => updateExcelFormulaWizardItem(index, "targetType", event.target.value)}
                style={{ fontWeight: 600 }}
              >
                <option value="formula">Fórmula (operación entre campos)</option>
                <option value="inventoryLookup">Buscador de inventario</option>
                <option value="number">Número (valor estático)</option>
                <option value="text">Texto (valor estático)</option>
                <option value="select">Menú desplegable</option>
              </select>
            </label>

            {(item.targetType === "inventoryLookup") ? (
              <p className="modal-footnote" style={{ color: "#2c4b6b", background: "#dfe9f4", borderRadius: "8px", padding: "0.4rem 0.6rem" }}>
                Este campo se configurará como Buscador de inventario. Los operadores podrán buscar y vincular artículos del inventario del sistema.
              </p>
            ) : (item.targetType === "text" || item.targetType === "number" || item.targetType === "select") ? (
              <p className="modal-footnote" style={{ color: "#92400e", background: "#fef3c7", borderRadius: "8px", padding: "0.4rem 0.6rem" }}>
                El campo se importará como <strong>{item.targetType === "text" ? "Texto" : item.targetType === "number" ? "Número" : "Menú desplegable"}</strong> con los valores calculados por Excel.
              </p>
            ) : (
              <div className="modal-form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                <label className="app-modal-field">
                  <span>Operando izquierdo<span className="required-mark" aria-hidden="true"> *</span></span>
                  <select value={item.formulaLeftFieldId || ""} onChange={(event) => updateExcelFormulaWizardItem(index, "formulaLeftFieldId", event.target.value)}>
                    <option value="">Seleccionar...</option>
                    {(controlBoardDraft.columns || []).filter((field) => field.id !== item.targetFieldId).map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
                  </select>
                </label>
                <label className="app-modal-field">
                  <span>Operación<span className="required-mark" aria-hidden="true"> *</span></span>
                  <select value={item.operation || "add"} onChange={(event) => updateExcelFormulaWizardItem(index, "operation", event.target.value)}>
                    {FORMULA_OPERATIONS.map((operation) => <option key={operation.value} value={operation.value}>{operation.label}</option>)}
                  </select>
                </label>
                <label className="app-modal-field">
                  <span>Operando derecho<span className="required-mark" aria-hidden="true"> *</span></span>
                  <select value={item.formulaRightFieldId || ""} onChange={(event) => updateExcelFormulaWizardItem(index, "formulaRightFieldId", event.target.value)}>
                    <option value="">Seleccionar...</option>
                    {(controlBoardDraft.columns || []).filter((field) => field.id !== item.targetFieldId).map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
                  </select>
                </label>
              </div>
            )}
          </section>
        ))}
      </div>
    </Modal>
    </>
  );
}
