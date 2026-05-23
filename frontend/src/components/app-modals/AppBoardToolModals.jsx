import { Trash2 } from "lucide-react";
import { Modal } from "../Modal";
import { BoardBuilderModal, BoardComponentStudioModal } from "../ModalesConstructorTableros";
import { FORMULA_OPERATIONS } from "../../utils/constantes.js";
import { createEmptyFieldDraft } from "../../utils/utilidades.jsx";

/** Modales extra�dos de App.jsx � AppBoardToolModals */

/** Modales extraidos de App.jsx � AppBoardToolModals */
export function AppBoardToolModals(props) {
  const {
  actionPermissions,
  activeAssignableUsers,
  activityCatalogCategoryOptions,
  addDraftColumn,
  alignItems,
  applyBoardTemplate,
  applyExcelFormulaWizard,
  Array,
  Auto,
  BOARD_OPERATIONAL_CONTEXT_OPTIONS,
  boardBuilderModal,
  boardBuilderPreview,
  boardExcelFileInputRef,
  boardOperationalContextOptions,
  boardSectionOptions,
  borderRadius,
  Buscador,
  canDeleteBoardTemplateEntry,
  canDeleteTemplate,
  canSaveBoard,
  canSaveTemplate,
  Categor,
  clearControlBoardDraft,
  closeBoardBuilderModal,
  Compartir,
  componentStudioOpen,
  confirmDeleteBoardTemplate,
  controlBoardDraft,
  controlBoardFeedback,
  Convertir,
  createBoard,
  createEmptyFieldDraft,
  Departamento,
  Departamentos,
  departmentOptions,
  Descripci,
  Desde,
  draftColumnGroups,
  duplicateDraftColumn,
  editBoard,
  editDraftColumn,
  editingDraftColumnId,
  El,
  Elige,
  Esta,
  Estas,
  Este,
  Excel,
  excelFormulaWizard,
  F,
  filter,
  filteredBoardTemplates,
  flexWrap,
  fontSize,
  fontWeight,
  FORMULA_OPERATIONS,
  formulaLeftFieldId,
  formulaRightFieldId,
  fromClassification,
  fromMemory,
  gridTemplateColumns,
  importBoardStructureFromExcel,
  isBoardSaveSubmitting,
  Los,
  map,
  marginBottom,
  marginLeft,
  Men,
  moveDraftColumn,
  N,
  No,
  Nombre,
  Omitir,
  onApplyTemplate,
  onClear,
  onClearTemplatePreview,
  onDeleteTemplate,
  onDuplicateDraftColumn,
  onEditDraftColumn,
  onImportFromExcel,
  onMoveDraftColumn,
  onOpenComponentStudio,
  onPreviewTemplate,
  onRemoveDraftColumn,
  onReorderDraftColumn,
  onSaveTemplate,
  onTemplateCategoryChange,
  onTemplateSearchChange,
  openBoardExcelImportPicker,
  openComponentStudio,
  openDeleteBoardTemplateModal,
  Operaci,
  Operando,
  Players,
  previewBoard,
  previewBoardTemplate,
  removeDraftColumn,
  removeExcelFormulaWizardItem,
  reorderDraftColumn,
  saveControlBoard,
  saveDraftAsBoardTemplate,
  saveTemplate,
  Seleccionar,
  selectedAreaSection,
  selectedAreaSectionId,
  selectedOptions,
  selectedPreviewTemplate,
  setComponentStudioOpen,
  setControlBoardDraft,
  setEditingDraftColumnId,
  setExcelFormulaWizard,
  setTemplateCategoryFilter,
  setTemplateDeleteModal,
  setTemplateEditorModal,
  setTemplatePreviewId,
  setTemplateSearch,
  sharedDepartments,
  sharedUserIds,
  submitBoardTemplateEdit,
  submitting,
  targetFieldId,
  targetLabel,
  targetType,
  templateCategories,
  templateCategoryFilter,
  templateDeleteModal,
  templateEditorModal,
  templateSearch,
  Texto,
  Todos,
  updateExcelFormulaWizardItem,
  userMap,
  visibilityType,
  } = props;

  return (
    <>
return (
    <>
    <Modal open={templateEditorModal.open} title="Editar plantilla guardada" confirmLabel="Guardar cambios" cancelLabel="Cancelar" onClose={() => setTemplateEditorModal({ open: false, id: null, name: "", description: "", category: "", visibilityType: "department", sharedDepartments: [], sharedUserIds: [], submitting: false })} onConfirm={submitBoardTemplateEdit} confirmDisabled={templateEditorModal.submitting}>
      <div className="modal-form-grid">
        <label className="app-modal-field">
          <span>Nombre de plantilla</span>
          <input value={templateEditorModal.name} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="app-modal-field">
          <span>Categor├¡a</span>
          <input value={templateEditorModal.category} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, category: event.target.value }))} placeholder="Ej: Embarques, Calidad, Producci├│n" />
        </label>
        <label className="app-modal-field">
          <span>Compartir con</span>
          <select value={templateEditorModal.visibilityType} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, visibilityType: event.target.value }))}>
            <option value="department">Departamento</option>
                      <option value="users">Players espec├¡ficos</option>
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
          <span>Descripci├│n</span>
          <input value={templateEditorModal.description} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, description: event.target.value }))} placeholder="Explica para qu├® sirve esta plantilla" />
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
        <p className="subtle-line">Esta acci├│n eliminar├í la plantilla guardada para todos los usuarios con acceso.</p>
        <p><strong>{templateDeleteModal.name || "Plantilla"}</strong></p>
        <p className="validation-text">No se puede deshacer.</p>
      </div>
    </Modal>

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

    <Modal open={excelFormulaWizard.open} title="Asistente de f├│rmulas de Excel" confirmLabel="Aplicar mapeo" cancelLabel="Cerrar" onClose={() => setExcelFormulaWizard({ open: false, items: [] })} onConfirm={applyExcelFormulaWizard}>
      <div className="modal-form-grid">
        <p className="modal-footnote">Estas columnas ten├¡an f├│rmulas que no se pudieron convertir autom├íticamente. Elige c├│mo debe comportarse cada campo en el tablero.</p>
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
              F├│rmula original: <code style={{ fontSize: "0.78rem", background: "#f1f5f9", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>{item.formula}</code>
            </p>

            <label className="app-modal-field" style={{ marginBottom: "0.6rem" }}>
              <span>Convertir como</span>
              <select
                value={item.targetType || "formula"}
                onChange={(event) => updateExcelFormulaWizardItem(index, "targetType", event.target.value)}
                style={{ fontWeight: 600 }}
              >
                <option value="formula">F├│rmula (operaci├│n entre campos)</option>
                <option value="inventoryLookup">Buscador de inventario</option>
                <option value="number">N├║mero (valor est├ítico)</option>
                <option value="text">Texto (valor est├ítico)</option>
                <option value="select">Men├║ desplegable</option>
              </select>
            </label>

            {(item.targetType === "inventoryLookup") ? (
              <p className="modal-footnote" style={{ color: "#2c4b6b", background: "#dfe9f4", borderRadius: "8px", padding: "0.4rem 0.6rem" }}>
                Este campo se configurar├í como Buscador de inventario. Los operadores podr├ín buscar y vincular art├¡culos del inventario del sistema.
              </p>
            ) : (item.targetType === "text" || item.targetType === "number" || item.targetType === "select") ? (
              <p className="modal-footnote" style={{ color: "#92400e", background: "#fef3c7", borderRadius: "8px", padding: "0.4rem 0.6rem" }}>
                El campo se importar├í como <strong>{item.targetType === "text" ? "Texto" : item.targetType === "number" ? "N├║mero" : "Men├║ desplegable"}</strong> con los valores calculados por Excel.
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
                  <span>Operaci├│n<span className="required-mark" aria-hidden="true"> *</span></span>
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

    </>
  );
}
