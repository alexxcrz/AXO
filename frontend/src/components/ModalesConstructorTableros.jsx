import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Modal } from "./Modal";
const COMPONENT_TYPE_CATEGORIES = [
  {
    label: "Texto y contacto",
    icon: "📝",
    types: [
      { value: "text", emoji: "📝", label: "Texto corto" },
      { value: "textarea", emoji: "📋", label: "Notas / Texto largo" },
      { value: "email", emoji: "📧", label: "Correo electrónico" },
      { value: "phone", emoji: "📞", label: "Teléfono" },
      { value: "url", emoji: "🔗", label: "Enlace / URL" },
      { value: "location", emoji: "📍", label: "Ubicación" },
    ],
  },
  {
    label: "Números y cálculo",
    icon: "🔢",
    types: [
      { value: "number", emoji: "🔢", label: "Número" },
      { value: "currency", emoji: "💲", label: "Monto ($)" },
      { value: "percentage", emoji: "%", label: "Porcentaje" },
      { value: "weight", emoji: "⚖️", label: "Peso (kg)" },
      { value: "temperature", emoji: "🌡️", label: "Temperatura" },
      { value: "duration", emoji: "⏱️", label: "Duración (hh:mm)" },
      { value: "formula", emoji: "🧮", label: "Fórmula / Cálculo" },
    ],
  },
  {
    label: "Fecha y tiempo",
    icon: "📅",
    types: [
      { value: "date", emoji: "📅", label: "Fecha" },
      { value: "time", emoji: "🕐", label: "Hora" },
      { value: "timeline", emoji: "📆", label: "Rango de fechas" },
    ],
  },
  {
    label: "Estado y control",
    icon: "✅",
    types: [
      { value: "boolean", emoji: "✅", label: "Sí / No" },
      { value: "priority", emoji: "🎯", label: "Prioridad" },
      { value: "rating", emoji: "⭐", label: "Calificación (★)" },
      { value: "progress", emoji: "📊", label: "Progreso" },
      { value: "counter", emoji: "🔢", label: "Contador (+1)" },
      { value: "score", emoji: "🏅", label: "Puntuación 1-10" },
      { value: "color_tag", emoji: "🎨", label: "Etiqueta de color" },
    ],
  },
  {
    label: "Selección",
    icon: "📋",
    types: [
      { value: "select", emoji: "📋", label: "Menú desplegable" },
      { value: "multiSelectDetail", emoji: "🧾", label: "Selección múltiple + detalle" },
      { value: "tags", emoji: "🏷️", label: "Etiquetas múltiples" },
      { value: "evidenceGallery", emoji: "🖼️", label: "Evidencias" },
    ],
  },
  {
    label: "Inventario",
    icon: "📦",
    types: [
      { value: "inventoryLookup", emoji: "🔍", label: "Buscador de inventario" },
      { value: "maintenanceInventoryLookup", emoji: "🛠️", label: "Buscador de insumos de mantenimiento" },
      { value: "inventoryLookupLogistics", emoji: "📦", label: "Buscador + empaque" },
      { value: "inventoryProperty", emoji: "📄", label: "Dato derivado" },
    ],
  },
  {
    label: "Actividades",
    icon: "⚡",
    types: [
      { value: "activityList", emoji: "⚡", label: "Lista de actividades" },
    ],
  },
];

function getDraftFormulaTerms(draft) {
  const source = Array.isArray(draft?.formulaTerms) ? draft.formulaTerms : [];
  const normalized = source.map((term, index) => ({
    fieldId: String(term?.fieldId || "").trim(),
    ...(index > 0 ? { operation: String(term?.operation || "add").trim() || "add" } : {}),
  }));
  if (normalized.length) return normalized;
  return [
    { fieldId: String(draft?.formulaLeftFieldId || "").trim() },
    { operation: String(draft?.formulaOperation || "add").trim() || "add", fieldId: String(draft?.formulaRightFieldId || "").trim() },
  ];
}

function ensureMinimumFormulaTerms(terms) {
  const normalized = Array.isArray(terms) ? terms : [];
  if (normalized.length >= 2) return normalized;
  if (normalized.length === 1) return normalized.concat([{ operation: "add", fieldId: "" }]);
  return [{ fieldId: "" }, { operation: "add", fieldId: "" }];
}

function getFormulaOperationSymbol(operation) {
  return { add: "+", subtract: "−", multiply: "×", divide: "÷", average: "prom", min: "mín", max: "máx", percent: "%" }[operation] || operation;
}

export function BoardComponentStudioModal({
  open,
  mode,
  draft,
  onChange,
  onClose,
  onConfirm,
  catalog,
  inventoryItems,
  visibleUsers,
  sectionOptions,
  activityCategoryOptions,
  contextoConstructor,
}) {
  const {
    BOARD_ACTIVITY_LIST_FIELD,
    BOARD_FIELD_TYPES,
    BOARD_FIELD_WIDTHS,
    COLOR_RULE_OPERATORS,
    FORMULA_OPERATIONS,
    INVENTORY_LOOKUP_LOGISTICS_FIELD,
    INVENTORY_PROPERTIES,
    OPTION_SOURCE_TYPES,
    getBoardFieldTypeDescription,
  } = contextoConstructor;

  const studioSteps = [
    { title: "Tipo", subtitle: "Qué componente necesitas" },
    { title: "Base", subtitle: "Nombre y estructura" },
    { title: "Reglas", subtitle: "Automatización y color" },
  ];
  const [currentStep, setCurrentStep] = useState(0);
  const selectedType = draft.fieldType;
  const selectedTypeOption = BOARD_FIELD_TYPES.find((type) => type.value === selectedType);
  const normalizedActivityCategoryOptions = Array.from(new Set((activityCategoryOptions || []).map((option) => String(option || "").trim()).filter(Boolean)));
  const trimmedActivityCategory = String(draft.optionCatalogCategory || "").trim();
  const matchedActivityCategory = normalizedActivityCategoryOptions.find((option) => option.toLowerCase() === trimmedActivityCategory.toLowerCase()) || "";
  const hasCustomActivityCategory = Boolean(trimmedActivityCategory) && !matchedActivityCategory;
  const activityCategorySelectionValue = hasCustomActivityCategory ? "__custom__" : matchedActivityCategory || "";
  const showOptionSource = ["select", "multiSelectDetail"].includes(selectedType);
  const showManualOptions = showOptionSource && draft.optionSource === "manual";
  const showActivityListSelector = selectedType === BOARD_ACTIVITY_LIST_FIELD;
  const showCustomActivityCategoryInput = showActivityListSelector && activityCategorySelectionValue === "__custom__";
  const showInventoryProperty = selectedType === "inventoryProperty";
  const showFormulaFields = selectedType === "formula";
  const showColorRules = selectedType !== "formula";
  const isInventoryBundleType = selectedType === INVENTORY_LOOKUP_LOGISTICS_FIELD;
  const formulaTerms = ensureMinimumFormulaTerms(getDraftFormulaTerms(draft));
  const manualOptions = String(draft.optionsText || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  function updateFormulaTerms(nextTerms) {
    const safeTerms = ensureMinimumFormulaTerms(nextTerms.map((term, index) => ({
      fieldId: String(term?.fieldId || "").trim(),
      ...(index > 0 ? { operation: String(term?.operation || "add").trim() || "add" } : {}),
    })));
    onChange((current) => ({
      ...current,
      formulaTerms: safeTerms,
      formulaLeftFieldId: safeTerms[0]?.fieldId || "",
      formulaOperation: safeTerms[1]?.operation || "add",
      formulaRightFieldId: safeTerms[1]?.fieldId || "",
    }));
  }
  const autoGeneratedFieldLabels = selectedType === INVENTORY_LOOKUP_LOGISTICS_FIELD
    ? ["Piezas por caja", "Cajas por tarima"]
    : [];
  const selectedTypeUsage = selectedType === INVENTORY_LOOKUP_LOGISTICS_FIELD
    ? "Sirve cuando quieres usar el mismo buscador de inventario de siempre, pero dejando dos columnas extra editables para piezas por caja y cajas por tarima."
    : getBoardFieldTypeDescription(selectedType);
  const colorOperatorNeedsValue = !["isEmpty", "isNotEmpty", "isTrue", "isFalse"].includes(draft.colorOperator);
  const colorValueUsesBooleanSelect = selectedType === "boolean" && ["equals", "notEquals"].includes(draft.colorOperator);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [manualOptionInput, setManualOptionInput] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStep(0);
      setFeedback({ type: "", message: "" });
      setManualOptionInput("");
    }
  }, [open, mode]);

  const isLastStep = currentStep === studioSteps.length - 1;
  const inventorySourceFields = (draft.columns || []).filter((column) => ["inventoryLookup", "maintenanceInventoryLookup", INVENTORY_LOOKUP_LOGISTICS_FIELD].includes(column.type));
  const resolvedInventorySourceFieldId = inventorySourceFields.some((column) => column.id === draft.sourceFieldId)
    ? draft.sourceFieldId
    : inventorySourceFields[inventorySourceFields.length - 1]?.id || "";
  const selectedInventorySourceField = inventorySourceFields.find((column) => column.id === resolvedInventorySourceFieldId) || null;

  useEffect(() => {
    if (!open || selectedType !== "inventoryProperty") return;
    if ((draft.sourceFieldId || "") === resolvedInventorySourceFieldId) return;
    onChange((current) => ({
      ...current,
      sourceFieldId: resolvedInventorySourceFieldId,
    }));
  }, [draft.sourceFieldId, onChange, open, resolvedInventorySourceFieldId, selectedType]);

  function formatInventorySourceFieldLabel(column) {
    const sectionLabel = String(column?.groupName || "").trim();
    return sectionLabel ? `${column.label} · ${sectionLabel}` : column?.label || "Buscador";
  }

  function validateField() {
    if (!draft.fieldLabel.trim()) {
      setFeedback({ type: "error", message: "Escribe una etiqueta para el campo antes de continuar." });
      return false;
    }
    if (selectedType === BOARD_ACTIVITY_LIST_FIELD && !trimmedActivityCategory) {
      setFeedback({ type: "error", message: "Selecciona una lista existente o escribe una nueva para este componente." });
      return false;
    }
    if (selectedType === "inventoryProperty" && !inventorySourceFields.length) {
      setFeedback({ type: "error", message: "Agrega primero un Buscador de inventario antes de crear un dato derivado." });
      return false;
    }
    if (selectedType === "inventoryProperty" && !resolvedInventorySourceFieldId) {
      setFeedback({ type: "error", message: "Selecciona el buscador de inventario que alimentará este dato." });
      return false;
    }
    if (showManualOptions && !manualOptions.length) {
      setFeedback({ type: "error", message: "Agrega al menos una opción manual para el desplegable." });
      return false;
    }
    setFeedback({ type: "", message: "" });
    return true;
  }

  function handleAddManualOption() {
    const nextOption = String(manualOptionInput || "").trim();
    if (!nextOption) return;
    const hasDuplicate = manualOptions.some((item) => item.toLowerCase() === nextOption.toLowerCase());
    if (hasDuplicate) {
      setFeedback({ type: "error", message: `La opción "${nextOption}" ya existe.` });
      return;
    }
    const nextOptions = [...manualOptions, nextOption];
    onChange((current) => ({
      ...current,
      optionsText: nextOptions.join(", "),
    }));
    setManualOptionInput("");
    setFeedback({ type: "", message: "" });
  }

  function handleRemoveManualOption(optionIndex) {
    const nextOptions = manualOptions.filter((_, index) => index !== optionIndex);
    onChange((current) => ({
      ...current,
      optionsText: nextOptions.join(", "),
    }));
  }

  function handleTypeSelection(nextType) {
    onChange((current) => {
      const nextDraft = { ...current, fieldType: nextType };
      if (nextType === BOARD_ACTIVITY_LIST_FIELD) {
        nextDraft.optionSource = "catalogByCategory";
        if (!String(current.optionCatalogCategory || "").trim()) {
          nextDraft.optionCatalogCategory = normalizedActivityCategoryOptions[0] || "";
        }
        return nextDraft;
      }
      if (nextType === "inventoryProperty") {
        const sourceFields = (current.columns || []).filter((column) => ["inventoryLookup", "maintenanceInventoryLookup", INVENTORY_LOOKUP_LOGISTICS_FIELD].includes(column.type));
        const fallbackSourceFieldId = sourceFields.some((column) => column.id === current.sourceFieldId)
          ? current.sourceFieldId
          : sourceFields[sourceFields.length - 1]?.id || "";
        nextDraft.sourceFieldId = fallbackSourceFieldId;
        nextDraft.inventoryProperty = current.inventoryProperty || "code";
        return nextDraft;
      }
      if (["select", "multiSelectDetail"].includes(nextType)) {
        nextDraft.optionSource = current.optionSource && current.optionSource !== "catalogByCategory" ? current.optionSource : "manual";
      }
      return nextDraft;
    });
  }

  function handleActivityCategorySelection(nextValue) {
    onChange((current) => {
      if (nextValue === "__custom__") {
        return {
          ...current,
          optionCatalogCategory: hasCustomActivityCategory ? trimmedActivityCategory : "",
        };
      }
      return {
        ...current,
        optionCatalogCategory: nextValue,
      };
    });
  }

  function handleStepConfirm() {
    if (!isLastStep) {
      setCurrentStep((step) => Math.min(step + 1, studioSteps.length - 1));
      setFeedback({ type: "", message: "" });
      return;
    }
    if (!validateField()) return;
    onConfirm();
  }

  let colorValuePlaceholder = "Ej: Alta, 20, Crítico";
  let colorValueHelp = "Cuando la celda llegue a este valor, se aplicará el color.";

  if (["contains", "notContains", "startsWith", "endsWith"].includes(draft.colorOperator)) {
    colorValuePlaceholder = "Ej: Crítico, Urgente, LIB";
    colorValueHelp = "Usa una palabra o fragmento de texto para activar el color.";
  } else if (["inList", "notInList"].includes(draft.colorOperator)) {
    colorValuePlaceholder = "Ej: Alta, Media, Crítica";
    colorValueHelp = "Escribe varios valores separados por coma para comparar contra una lista.";
  } else if ([">", ">=", "<", "<="].includes(draft.colorOperator)) {
    colorValuePlaceholder = "Ej: 20, 3.5 o 2026-04-10";
    colorValueHelp = "Funciona con números y también con fechas comparables.";
  } else if (draft.colorOperator === "notEquals") {
    colorValuePlaceholder = "Ej: Rechazado, No, 0";
    colorValueHelp = "El color se activa cuando el valor sea distinto al capturado aquí.";
  } else if (!colorOperatorNeedsValue) {
    colorValueHelp = "Esta condición se activa sola; no necesitas capturar un valor adicional.";
  }

  return (
    <Modal
      open={open}
      className="component-studio-modal"
      title={mode === "edit" ? "Editar componente" : "Studio de Componentes"}
      confirmLabel={isLastStep ? (mode === "edit" ? "Guardar cambios" : "Agregar componente") : "Siguiente"}
      cancelLabel="Cerrar"
      onClose={onClose}
      onConfirm={handleStepConfirm}
      footerActions={currentStep > 0 ? (
        <>
          <div className="component-studio-footer-progress">Paso {currentStep + 1} de {studioSteps.length}</div>
          <button type="button" className="sicfla-button ghost" onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}>Anterior</button>
        </>
      ) : <div className="component-studio-footer-progress">Paso 1 de {studioSteps.length}</div>}
    >
      <div className="component-studio-shell">
        {feedback.message ? (
          <div className={`feedback-banner feedback-${feedback.type}`}>
            <strong>{feedback.type === "error" ? "Atención" : "Confirmado"}</strong>
            <p>{feedback.message}</p>
          </div>
        ) : null}
        <div className="component-studio-intro">
          <span className="chip primary">{mode === "edit" ? "Edición guiada" : "Diseño guiado"}</span>
          <p>{mode === "edit" ? "Actualiza este componente sin perder orden ni claridad en el tablero." : "Ahora el alta va por pasos para que primero elijas qué necesitas y después configures solo lo importante."}</p>
          <div className="saved-board-list">
            <span className="chip">Catálogo: {catalog.filter((item) => !item.isDeleted).length}</span>
            <span className="chip">Inventario: {(inventoryItems || []).length}</span>
            <span className="chip">Players: {visibleUsers.filter((item) => item.isActive).length}</span>
          </div>
        </div>

        <div className="component-studio-stepper">
          {studioSteps.map((step, index) => (
            <button key={step.title} type="button" className={index === currentStep ? "component-studio-step active" : index < currentStep ? "component-studio-step complete" : "component-studio-step"} onClick={() => setCurrentStep(index)}>
              <span className="component-studio-step-number">{index + 1}</span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.subtitle}</small>
              </span>
            </button>
          ))}
        </div>

        {currentStep === 0 ? (
          <>
            <section className="component-studio-type-picker">
              {COMPONENT_TYPE_CATEGORIES.map((category) => {
                // Resolve actual values accounting for special names
                const categoryTypes = category.types.map((t) => {
                  let actualValue = t.value;
                  if (t.value === "inventoryLookupLogistics") actualValue = contextoConstructor.INVENTORY_LOOKUP_LOGISTICS_FIELD || "inventoryLookupLogistics";
                  if (t.value === "maintenanceInventoryLookup") actualValue = contextoConstructor.MAINTENANCE_INVENTORY_LOOKUP_FIELD || "maintenanceInventoryLookup";
                  if (t.value === "activityList") actualValue = contextoConstructor.BOARD_ACTIVITY_LIST_FIELD || "activityList";
                  return { ...t, actualValue };
                });
                return (
                  <div key={category.label} className="ctp-category">
                    <div className="ctp-category-head">
                      <span className="ctp-category-icon">{category.icon}</span>
                      <span className="ctp-category-label">{category.label}</span>
                    </div>
                    <div className="ctp-type-row">
                      {categoryTypes.map((t) => {
                        const isActive = draft.fieldType === t.actualValue;
                        const isDisabled = t.actualValue === contextoConstructor.INVENTORY_LOOKUP_LOGISTICS_FIELD;
                        return (
                          <button
                            key={`${t.value}-${t.actualValue}`}
                            type="button"
                            className={["ctp-type-chip", isActive ? "active" : "", isDisabled ? "hidden" : ""].filter(Boolean).join(" ")}
                            onClick={() => !isDisabled && handleTypeSelection(t.actualValue)}
                          >
                            <span className="ctp-type-emoji">{t.emoji}</span>
                            <span className="ctp-type-name">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>

            {selectedTypeOption ? (
              <div className="ctp-selection-preview">
                <strong>{selectedTypeOption.label}</strong>
                <p>{selectedTypeUsage}</p>
                {autoGeneratedFieldLabels.length ? (
                  <div className="saved-board-list" style={{ marginTop: "0.4rem" }}>
                    {autoGeneratedFieldLabels.map((label) => <span key={label} className="chip">{label}</span>)}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {currentStep === 1 ? (
          <section className="component-studio-section three-columns">
            <div className="component-studio-section-head component-studio-field-span-full">
              <div>
                <h4>2. Datos base</h4>
                <p>Define el nombre, la sección y la ayuda visual del componente.</p>
              </div>
            </div>
            <label className="app-modal-field">
              <span>Sección<span className="required-mark" aria-hidden="true"> *</span></span>
              <select value={draft.groupName} onChange={(event) => onChange((current) => ({ ...current, groupName: event.target.value }))}>
                {(sectionOptions || ["General"]).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <small className="builder-help-text">Agrupa componentes relacionados para mantener el tablero ordenado.</small>
            </label>
            <label className="app-modal-field component-studio-color-field">
              <span>Color de sección</span>
              <input type="color" value={draft.groupColor} onChange={(event) => onChange((current) => ({ ...current, groupColor: event.target.value }))} />
            </label>
            <label className="app-modal-field">
              <span>Nombre visible<span className="required-mark" aria-hidden="true"> *</span></span>
              <input value={draft.fieldLabel} onChange={(event) => onChange((current) => ({ ...current, fieldLabel: event.target.value }))} placeholder="Ej: SKU, Piezas surtidas, Fecha de corte" />
              <small className="builder-help-text">Es el nombre que verá el equipo en la cabecera del tablero.</small>
            </label>
            <label className="app-modal-field">
              <span>Ayuda corta</span>
              <input value={draft.fieldHelp} onChange={(event) => onChange((current) => ({ ...current, fieldHelp: event.target.value }))} placeholder="Ej: Selecciona el producto para autollenar datos" />
            </label>
            <label className="app-modal-field">
              <span>Placeholder</span>
              <input value={draft.placeholder} onChange={(event) => onChange((current) => ({ ...current, placeholder: event.target.value }))} placeholder="Ej: Escribe el folio o el comentario" />
            </label>
            <label className="app-modal-field">
              <span>Valor inicial</span>
              <input value={draft.defaultValue} onChange={(event) => onChange((current) => ({ ...current, defaultValue: event.target.value }))} placeholder="Ej: Pendiente, 0, No o una fecha" />
              <small className="builder-help-text">Se coloca automáticamente cuando se crea una fila nueva.</small>
            </label>
            <label className="app-modal-field component-studio-field-compact">
              <span>Ancho<span className="required-mark" aria-hidden="true"> *</span></span>
              <select value={draft.fieldWidth} onChange={(event) => onChange((current) => ({ ...current, fieldWidth: event.target.value }))}>
                {BOARD_FIELD_WIDTHS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="app-modal-field component-studio-field-compact">
              <span>Campo obligatorio</span>
              <select value={draft.isRequired} onChange={(event) => onChange((current) => ({ ...current, isRequired: event.target.value }))}>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </label>
            <label className="app-modal-field component-studio-manual-width-field">
              <span>Ancho manual (px)</span>
              <input
                type="range"
                min="90"
                max="520"
                step="10"
                value={draft.fieldWidthPx || "180"}
                onChange={(event) => onChange((current) => ({ ...current, fieldWidthPx: event.target.value }))}
              />
              <small className="builder-help-text">{draft.fieldWidthPx || "180"} px</small>
            </label>
          </section>
        ) : null}

        {currentStep === 2 ? (
          <div className="component-studio-logic-stack">
            {isInventoryBundleType ? (
              <section className="component-studio-section component-studio-spotlight">
                <div>
                  <span className="chip primary">Bundle automático</span>
                  <strong>Buscador con empaque editable</strong>
                  <p>Al guardar, este componente crea el buscador principal y dos columnas numéricas editables para piezas por caja y cajas por tarima.</p>
                </div>
                <div className="saved-board-list">
                  <span className="chip">Buscador de inventario</span>
                  <span className="chip">Piezas por caja</span>
                  <span className="chip">Cajas por tarima</span>
                </div>
              </section>
            ) : null}

            {showActivityListSelector ? (
              <section className="component-studio-section three-columns component-studio-short-grid">
                <label className="app-modal-field">
                  <span>Lista de actividades<span className="required-mark" aria-hidden="true"> *</span></span>
                  <select value={activityCategorySelectionValue} onChange={(event) => handleActivityCategorySelection(event.target.value)}>
                    <option value="">Seleccionar lista...</option>
                    {normalizedActivityCategoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    <option value="__custom__">Crear nueva lista...</option>
                  </select>
                  <small className="builder-help-text">Selecciona una lista existente o crea aquí mismo el nombre de una nueva para este tablero.</small>
                </label>
                {showCustomActivityCategoryInput ? (
                  <label className="app-modal-field">
                    <span>Nueva lista<span className="required-mark" aria-hidden="true"> *</span></span>
                    <input value={draft.optionCatalogCategory} onChange={(event) => onChange((current) => ({ ...current, optionCatalogCategory: event.target.value }))} placeholder="Ej: Arranque de turno" />
                    <small className="builder-help-text">Si aún no tiene actividades, podrás usar este mismo nombre después en el catálogo.</small>
                  </label>
                ) : <div className="component-rule-hint compact-surface-card"><strong>Tablero precargado</strong><p>Cada actividad de la lista elegida se convertirá en una fila del tablero.</p></div>}
                <div className="component-rule-hint compact-surface-card"><strong>No es un desplegable</strong><p>Si necesitas un menú dentro de cada fila, usa el tipo Menú desplegable.</p></div>
              </section>
            ) : null}

            {showOptionSource ? (
              <section className="component-studio-section three-columns component-studio-short-grid">
                <label className="app-modal-field">
                  <span>Origen de datos<span className="required-mark" aria-hidden="true"> *</span></span>
                  <select value={draft.optionSource} onChange={(event) => onChange((current) => ({ ...current, optionSource: event.target.value }))}>
                    {OPTION_SOURCE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <small className="builder-help-text">Define si el menú tomará sus opciones de forma manual, desde players, inventario o catálogo.</small>
                </label>
                {showManualOptions ? (
                  <div className="app-modal-field">
                    <span>Opciones manuales</span>
                    <div className="saved-board-list" style={{ gap: "0.45rem", alignItems: "center" }}>
                      <input
                        value={manualOptionInput}
                        onChange={(event) => setManualOptionInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          handleAddManualOption();
                        }}
                        placeholder="Ej: Estación 1"
                      />
                      <button type="button" className="icon-button" onClick={handleAddManualOption}>
                        <Plus size={14} /> Agregar opción
                      </button>
                    </div>
                    {manualOptions.length ? (
                      <div className="saved-board-list" style={{ marginTop: "0.45rem", gap: "0.35rem" }}>
                        {manualOptions.map((option, index) => (
                          <span key={`${option}-${index}`} className="chip">
                            {option}
                            <button
                              type="button"
                              className="icon-button"
                              style={{ marginLeft: "0.35rem", minHeight: "1.2rem", padding: "0.05rem 0.3rem", fontSize: "0.72rem" }}
                              onClick={() => handleRemoveManualOption(index)}
                              aria-label={`Quitar opción ${option}`}
                              title={`Quitar opción ${option}`}
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <small className="builder-help-text">Agrega cada opción con el botón y aparecerá en el desplegable real.</small>
                  </div>
                ) : <div className="component-rule-hint compact-surface-card"><strong>Origen conectado</strong><p>Las opciones del menú se llenarán automáticamente desde {OPTION_SOURCE_TYPES.find((option) => option.value === draft.optionSource)?.label || "otra fuente"}.</p></div>}
                <div className="component-rule-hint compact-surface-card"><strong>Desplegable real</strong><p>Este componente sí muestra un menú dentro de cada fila del tablero.</p></div>
              </section>
            ) : null}

            {showInventoryProperty ? (
              inventorySourceFields.length ? (
                <section className="component-studio-section three-columns component-studio-short-grid">
                  <label className="app-modal-field">
                    <span>Campo origen</span>
                    <select value={resolvedInventorySourceFieldId} onChange={(event) => onChange((current) => ({ ...current, sourceFieldId: event.target.value }))}>
                      {inventorySourceFields.map((column) => <option key={column.id} value={column.id}>{formatInventorySourceFieldLabel(column)}</option>)}
                    </select>
                    <small className="builder-help-text">Elige el buscador de inventario del que se tomará la información.</small>
                  </label>
                  <label className="app-modal-field">
                    <span>Dato de inventario</span>
                    <select value={draft.inventoryProperty} onChange={(event) => onChange((current) => ({ ...current, inventoryProperty: event.target.value }))}>
                      {INVENTORY_PROPERTIES.map((property) => <option key={property.value} value={property.value}>{property.label}</option>)}
                    </select>
                    <small className="builder-help-text">Trae automáticamente código, nombre, presentación o conversiones.</small>
                  </label>
                  <div className="component-rule-hint compact-surface-card">
                    <strong>Enlace automático</strong>
                    <p>{selectedInventorySourceField ? `Quedará ligado a ${formatInventorySourceFieldLabel(selectedInventorySourceField)} y puedes cambiarlo aquí cuando lo necesites.` : "Se ligará en automático al último buscador de inventario disponible."}</p>
                  </div>
                </section>
              ) : (
                <section className="component-studio-section component-studio-empty">
                  <strong>Falta un buscador de inventario</strong>
                  <p>Primero agrega un componente Buscador de inventario y después crea el dato derivado para que siempre tenga una fuente válida.</p>
                </section>
              )
            ) : null}

            {showFormulaFields ? (
              <section className="component-studio-section">
                <div className="component-rule-hint compact-surface-card" style={{ marginBottom: "0.55rem" }}>
                  <strong>Fórmula compuesta</strong>
                  <p>Combina varios campos en secuencia. Ejemplo: Cajas + Bono - Descuento o Piezas × Cajas × Tarimas.</p>
                </div>
                <div className="formula-composer-grid" style={{ display: "grid", gap: "0.6rem" }}>
                  {formulaTerms.map((term, index) => (
                    <div key={`formula-term-${index}`} className="formula-composer-row" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.55rem", alignItems: "end" }}>
                      {index > 0 ? (
                        <label className="app-modal-field">
                          <span>Operación</span>
                          <select value={term.operation || "add"} onChange={(event) => updateFormulaTerms(formulaTerms.map((currentTerm, currentIndex) => currentIndex === index ? { ...currentTerm, operation: event.target.value } : currentTerm))}>
                            {FORMULA_OPERATIONS.map((operation) => <option key={operation.value} value={operation.value}>{operation.label}</option>)}
                          </select>
                        </label>
                      ) : <div />}
                      <label className="app-modal-field">
                        <span>{index === 0 ? "Valor base" : `Campo ${getFormulaOperationSymbol(term.operation || "add")}`}<span className="required-mark" aria-hidden="true"> *</span></span>
                        <select value={term.fieldId || ""} onChange={(event) => updateFormulaTerms(formulaTerms.map((currentTerm, currentIndex) => currentIndex === index ? { ...currentTerm, fieldId: event.target.value } : currentTerm))}>
                          <option value="">Seleccionar...</option>
                          {draft.columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
                        </select>
                      </label>
                      <div className="row-actions compact formula-composer-row-actions">
                        <button
                          type="button"
                          className="icon-button formula-composer-remove-button"
                          onClick={() => updateFormulaTerms(formulaTerms.filter((_, currentIndex) => currentIndex !== index))}
                          disabled={formulaTerms.length <= 2}
                          title={formulaTerms.length <= 2 ? "La fórmula necesita al menos 2 términos" : "Quitar término"}
                        >
                          <Trash2 size={14} /> Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="row-actions compact formula-add-actions" style={{ marginTop: "0.5rem" }}>
                  <button type="button" className="icon-button formula-add-button" onClick={() => updateFormulaTerms(formulaTerms.concat({ operation: "add", fieldId: "" }))}>
                    <Plus size={14} /> Agregar operación
                  </button>
                </div>
                <small className="builder-help-text">El primer campo es la base. Cada fila siguiente aplica su operación sobre el resultado acumulado.</small>
              </section>
            ) : null}

            {showColorRules ? (
              <section className={`component-studio-section ${colorOperatorNeedsValue ? "three-columns" : "color-rule-two-columns"}`}>
                <label className="app-modal-field">
                  <span>Condición de color</span>
                  <select value={draft.colorOperator} onChange={(event) => onChange((current) => ({ ...current, colorOperator: event.target.value }))}>
                    {COLOR_RULE_OPERATORS.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                  </select>
                  <small className="builder-help-text">Se usa para pintar la celda cuando cumpla una regla.</small>
                </label>
                {colorOperatorNeedsValue ? (
                  <label className="app-modal-field">
                    <span>Valor de comparación</span>
                    {colorValueUsesBooleanSelect ? (
                      <select value={draft.colorValue || "Sí"} onChange={(event) => onChange((current) => ({ ...current, colorValue: event.target.value }))}>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <input value={draft.colorValue} onChange={(event) => onChange((current) => ({ ...current, colorValue: event.target.value }))} placeholder={colorValuePlaceholder} />
                    )}
                    <small className="builder-help-text">{colorValueHelp}</small>
                  </label>
                ) : (
                  <div className="component-rule-hint compact-surface-card">
                    <strong>Sin valor adicional</strong>
                    <p>{colorValueHelp}</p>
                  </div>
                )}
                <div className="component-color-grid">
                  <label className="app-modal-field">
                    <span>Color fondo</span>
                    <input type="color" value={draft.colorBg} onChange={(event) => onChange((current) => ({ ...current, colorBg: event.target.value }))} />
                    <small className="builder-help-text">Color del fondo cuando la regla se active.</small>
                  </label>
                  <label className="app-modal-field">
                    <span>Color texto</span>
                    <input type="color" value={draft.colorText} onChange={(event) => onChange((current) => ({ ...current, colorText: event.target.value }))} />
                    <small className="builder-help-text">Color del texto para mantener la lectura clara.</small>
                  </label>
                </div>
              </section>
            ) : null}

            {!showOptionSource && !showInventoryProperty && !showFormulaFields && !showColorRules ? (
              <section className="component-studio-section component-studio-empty">
                <strong>Sin reglas adicionales</strong>
                <p>Este tipo de componente no necesita configuración extra. Puedes agregarlo directamente desde aquí.</p>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function BoardBuilderModal({
  open,
  mode,
  selectedAreaSectionId = "all",
  selectedAreaSection = null,
  draft,
  onChange,
  onClose,
  onConfirm,
  confirmDisabled = false,
  confirmLabel,
  onOpenComponentStudio,
  onImportFromExcel,
  onSaveTemplate,
  onClear,
  feedback,
  templateSearch,
  onTemplateSearchChange,
  templateCategoryFilter,
  onTemplateCategoryChange,
  templateCategories = [],
  filteredBoardTemplates = [],
  onPreviewTemplate,
  onApplyTemplate,
  onDeleteTemplate,
  canDeleteTemplate,
  selectedPreviewTemplate,
  onClearTemplatePreview,
  previewBoard,
  _draftColumnGroups,
  _onMoveDraftColumn,
  _onReorderDraftColumn,
  _onDuplicateDraftColumn,
  onEditDraftColumn,
  onRemoveDraftColumn,
  visibleUsers,
  catalog = [],
  departmentOptions = [],
  currentUser,
  userMap,
  inventoryItems,
  contextoConstructor,
  boardOperationalContextOptions = [],
}) {
  const {
    BOARD_AUX_COLUMN_DEFINITIONS,
    BOARD_FIELD_TYPES,
    BOARD_FIELD_WIDTH_STYLES,
    FORMULA_OPERATIONS,
    STATUS_PENDING,
    STATUS_RUNNING,
    formatBoardPreviewValue,
    _getBoardFieldDisplayType,
    _getBoardFieldTypeDescription,
    getNormalizedBoardColumnOrder,
    getOrderedBoardColumns,
    getBoardSectionGroups,
    reorderBoardColumnOrderTokens,
    _renderBoardFieldLabel,
    sortBoardFieldsByColumnOrder,
    getAreaRoot,
    normalizeAreaOption,
  } = contextoConstructor;

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [accessMenuOpen, setAccessMenuOpen] = useState(false);
  const [builderTab, setBuilderTab] = useState("base");
  const [baseTemplatesCollapsed, setBaseTemplatesCollapsed] = useState(true);
  const [accessSearch, setAccessSearch] = useState("");
  const [pendingAccessUserIds, setPendingAccessUserIds] = useState([]);
  const [draggingColumnToken, setDraggingColumnToken] = useState("");
  const [resizingToken, setResizingToken] = useState("");
  const actionMenuRef = useRef(null);
  const accessMenuRef = useRef(null);
  const templateSearchInputRef = useRef(null);
  const resizeStateRef = useRef({ kind: "", id: "", startX: 0, startWidth: 0 });
  const draggingColumnTokenRef = useRef("");
  const previewSections = getBoardSectionGroups(previewBoard);
  const previewRows = previewBoard?.rows?.slice(0, 2) || [];
  const orderedPreviewColumns = getOrderedBoardColumns(previewBoard || { fields: draft.columns, settings: draft.settings }, true);
  const activeUsers = visibleUsers.filter((user) => user.isActive);
  const availableOperationalUsers = activeUsers.filter((user) => user.id !== draft.ownerId);
  const normalizedDepartmentOptions = Array.from(new Set((departmentOptions || []).map((option) => String(option || "").trim()).filter(Boolean)));
  const normalizeArea = (value) => {
    const normalized = typeof normalizeAreaOption === "function" ? normalizeAreaOption(value) : String(value || "").trim().toUpperCase();
    return normalized === "SIN AREA" ? "" : normalized;
  };
  const getAreaRootSafe = (value) => {
    if (typeof getAreaRoot === "function") {
      return getAreaRoot(value);
    }
    const normalized = normalizeArea(value);
    if (!normalized) return "";
    return normalized.split("/")[0]?.trim() || "";
  };
  const boardAreaOptions = Array.from(new Set(normalizedDepartmentOptions
    .map((option) => normalizeArea(getAreaRootSafe(option) || option))
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  const sectionScopedBoardAreas = selectedAreaSectionId !== "all" && Array.isArray(selectedAreaSection?.scopes)
    ? Array.from(new Set(selectedAreaSection.scopes.map((scope) => normalizeArea(scope)).filter(Boolean)))
    : [];
  const isSectionScoped = selectedAreaSectionId !== "all" && sectionScopedBoardAreas.length > 0;
  const filteredOperationalUsers = availableOperationalUsers.filter((user) => user.name.toLowerCase().includes(accessSearch.trim().toLowerCase()));
  const visibilityType = String(draft.visibilityType || "users");
  const effectiveVisibilityType = visibilityType === "all" ? "department" : visibilityType;
  const ownerAreaByUserId = (userId) => {
    const areaValue = userMap.get(userId)?.area || userMap.get(userId)?.department || "";
    return normalizeArea(getAreaRootSafe(areaValue) || areaValue);
  };
  const selectedBoardArea = normalizeArea(draft.settings?.ownerArea || "");
  const fallbackBoardArea = isSectionScoped
    ? sectionScopedBoardAreas[0] || ""
    : ownerAreaByUserId(draft.ownerId || currentUser?.id || "") || boardAreaOptions[0] || "";
  const displayOwnerArea = selectedBoardArea || fallbackBoardArea;
  const ownerName = userMap.get(draft.ownerId)?.name || currentUser?.name || "Sin player";
  const selectedPlayersLabel = draft.accessUserIds?.length
    ? `${draft.accessUserIds.length + 1} players con acceso`
    : `Solo ${ownerName}`;
  const selectedDepartmentsLabel = (draft.sharedDepartments || []).length
    ? (draft.sharedDepartments || []).join(", ")
    : "Sin áreas seleccionadas";
  const previewOwnerName = userMap.get(previewBoard?.ownerId)?.name || currentUser?.name || "Sin player";
  const previewAccessNames = (previewBoard?.accessUserIds || []).map((userId) => userMap.get(userId)?.name).filter(Boolean);
  const previewSharedDepartments = Array.isArray(previewBoard?.sharedDepartments) ? previewBoard.sharedDepartments : [];
  const previewAssignmentSummary = previewBoard?.visibilityType === "all"
    ? "Visible para todos"
    : previewBoard?.visibilityType === "department"
      ? `Áreas · ${previewSharedDepartments.join(", ") || "Sin áreas"}`
      : previewAccessNames.length
        ? `Players · ${[previewOwnerName].concat(previewAccessNames).join(", ")}`
        : `Player asignado · ${previewOwnerName}`;
  const operationalContextType = String(draft.settings?.operationalContextType || "none");
  const operationalContextLabel = String(draft.settings?.operationalContextLabel || "").trim();
  const operationalContextOptions = operationalContextType === "cleaningSite"
    ? ["C1", "C2", "C3"]
    : Array.isArray(draft.settings?.operationalContextOptions)
      ? draft.settings.operationalContextOptions.map((option) => String(option || "").trim()).filter(Boolean)
      : [];
  const operationalContextOptionsText = operationalContextType === "custom" ? operationalContextOptions.join(", ") : "";
  const operationalContextValue = String(draft.settings?.operationalContextValue || "").trim()
    || operationalContextOptions[0]
    || "";
  const selectedPreviewTemplateId = selectedPreviewTemplate?.id || "";
  const defaultAuxWidths = Object.fromEntries(Object.values(BOARD_AUX_COLUMN_DEFINITIONS).map((item) => [item.id, item.defaultWidth]));
  const fieldTypeMinWidths = {
    inventoryLookup: 210,
    inventoryLookupLogistics: 210,
    select: 190,
    user: 190,
    status: 150,
    time: 130,
    date: 140,
  };
  const auxMinWidths = Object.fromEntries(Object.values(BOARD_AUX_COLUMN_DEFINITIONS).map((item) => [item.id, item.minWidth]));
  const builderTabs = ["base", "identity"];
  const builderTabLabels = {
    base: "Base",
    identity: "Identidad",
  };
  const currentBuilderTabIndex = Math.max(0, builderTabs.indexOf(builderTab));
  const hasBuilderPrev = currentBuilderTabIndex > 0;
  const hasBuilderNext = currentBuilderTabIndex < builderTabs.length - 1;

  function getPreviewAssigneeLabel(row) {
    const responsibleIds = Array.from(new Set((Array.isArray(row?.responsibleIds) ? row.responsibleIds : [])
      .map((userId) => String(userId || "").trim())
      .filter(Boolean)));
    const fallbackResponsibleId = String(row?.responsibleId || "").trim();
    if (!responsibleIds.length && fallbackResponsibleId) responsibleIds.push(fallbackResponsibleId);
    const names = responsibleIds.map((userId) => userMap.get(userId)?.name || "").filter(Boolean);
    if (!names.length) return currentUser?.name || "Player";
    if (names.length === 1) return names[0];
    return names
      .map((name) => String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 3).map((part) => `${part.charAt(0).toUpperCase()}.`).join(""))
      .join(" ");
  }

  function getTemplateOperationalContext(template) {
    const templateSettings = template?.settings && typeof template.settings === "object" ? template.settings : {};
    const contextType = String(templateSettings.operationalContextType || "none").trim() || "none";
    const contextLabel = String(templateSettings.operationalContextLabel || "").trim()
      || (contextType === "cleaningSite" ? "Sede de limpieza" : contextType === "custom" ? "Ubicación operativa" : "");
    const contextOptions = contextType === "cleaningSite"
      ? ["C1", "C2", "C3"]
      : Array.isArray(templateSettings.operationalContextOptions)
        ? templateSettings.operationalContextOptions.map((option) => String(option || "").trim()).filter(Boolean)
        : [];
    const contextValue = String(templateSettings.operationalContextValue || "").trim() || contextOptions[0] || "";

    return {
      contextType,
      contextLabel,
      contextOptions,
      contextValue,
    };
  }

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBuilderTab("base");
    setBaseTemplatesCollapsed(true);
  }, [open]);

  useEffect(() => {
    if (!open || builderTab !== "base" || baseTemplatesCollapsed) return;
    const focusTimer = globalThis.setTimeout(() => {
      templateSearchInputRef.current?.focus();
      templateSearchInputRef.current?.select();
    }, 0);
    return () => globalThis.clearTimeout(focusTimer);
  }, [open, builderTab, baseTemplatesCollapsed]);

  useEffect(() => {
    if (!actionMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!actionMenuRef.current?.contains(event.target)) {
        setActionMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [actionMenuOpen]);

  useEffect(() => {
    if (!accessMenuOpen) return undefined;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingAccessUserIds(draft.accessUserIds || []);
    setAccessSearch("");

    function handlePointerDown(event) {
      if (!accessMenuRef.current?.contains(event.target)) {
        setAccessMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [accessMenuOpen, draft.accessUserIds]);

  useEffect(() => {
    if (!open) return;
    const nextOwnerArea = isSectionScoped
      ? (sectionScopedBoardAreas[0] || "")
      : (normalizeArea(draft.settings?.ownerArea || "") || fallbackBoardArea);
    if (!nextOwnerArea) return;
    onChange((current) => {
      const currentArea = normalizeArea(current.settings?.ownerArea || "");
      if (currentArea === nextOwnerArea) return current;
      return {
        ...current,
        settings: {
          ...current.settings,
          ownerArea: nextOwnerArea,
        },
      };
    });
  }, [fallbackBoardArea, isSectionScoped, onChange, open, sectionScopedBoardAreas]);

  function handleTogglePendingAccess(userId) {
    setPendingAccessUserIds((current) => current.includes(userId)
      ? current.filter((item) => item !== userId)
      : Array.from(new Set([...current, userId])).filter((item) => item !== draft.ownerId));
  }

  function handleSaveAccessSelection() {
    onChange((current) => ({
      ...current,
      accessUserIds: pendingAccessUserIds.filter((userId) => userId !== current.ownerId),
    }));
    setAccessMenuOpen(false);
  }

  function handleOwnerChange(nextOwnerId) {
    const nextOwnerArea = ownerAreaByUserId(nextOwnerId);
    onChange((current) => ({
      ...current,
      ownerId: nextOwnerId,
      accessUserIds: (current.accessUserIds || []).filter((userId) => userId !== nextOwnerId),
      settings: {
        ...current.settings,
        ownerArea: isSectionScoped
          ? sectionScopedBoardAreas[0] || ""
          : (normalizeArea(current.settings?.ownerArea || "") || nextOwnerArea),
      },
    }));
  }

  function handleVisibilityTypeChange(nextVisibilityType) {
    onChange((current) => {
      const ownerArea = normalizeArea(current.settings?.ownerArea || "") || fallbackBoardArea;
      const seededDepartments = current.sharedDepartments?.length
        ? current.sharedDepartments
        : ownerArea
          ? [ownerArea]
          : [];
      return {
        ...current,
        visibilityType: nextVisibilityType,
        sharedDepartments: nextVisibilityType === "department"
          ? seededDepartments
          : current.sharedDepartments || [],
        accessUserIds: nextVisibilityType === "users"
          ? (current.accessUserIds || [])
          : [],
      };
    });
  }

  function handleToggleSharedDepartment(department) {
    onChange((current) => {
      const currentDepartments = Array.isArray(current.sharedDepartments) ? current.sharedDepartments : [];
      const nextDepartments = currentDepartments.includes(department)
        ? currentDepartments.filter((item) => item !== department)
        : [...currentDepartments, department];
      return {
        ...current,
        sharedDepartments: nextDepartments,
      };
    });
  }

  function updateOperationalContext(nextType, nextLabel = operationalContextLabel, nextOptions = operationalContextOptions, nextValue = operationalContextValue) {
    const resolvedOptions = nextType === "cleaningSite"
      ? ["C1", "C2", "C3"]
      : Array.from(new Set((Array.isArray(nextOptions) ? nextOptions : []).map((option) => String(option || "").trim()).filter(Boolean)));
    const resolvedValue = nextType === "none"
      ? ""
      : nextType === "cleaningSite"
        ? (["C1", "C2", "C3"].includes(nextValue) ? nextValue : "C3")
        : (resolvedOptions.includes(nextValue) ? nextValue : resolvedOptions[0] || "");

    onChange((current) => ({
      ...current,
      settings: {
        ...current.settings,
        operationalContextType: nextType,
        operationalContextLabel: nextType === "none"
          ? ""
          : String(nextLabel || "").trim() || (nextType === "cleaningSite" ? "Sede de limpieza" : "Ubicación operativa"),
        operationalContextOptions: nextType === "none" ? [] : resolvedOptions,
        operationalContextValue: resolvedValue,
      },
    }));
  }

  function updateChecklistConfig(nextConfig) {
    onChange((current) => ({
      ...current,
      settings: {
        ...current.settings,
        operationalChecklistConfig: {
          ...nextConfig,
          linkedActivityNames: Array.from(new Set((nextConfig?.linkedActivityNames || []).map((item) => String(item || "").trim()).filter(Boolean))),
        },
      },
    }));
  }

  function toggleChecklistLinkedActivity(activityName) {
    const normalizedName = String(activityName || "").trim();
    if (!normalizedName) return;
    const hasActivity = checklistLinkedActivities.some((item) => item.toLowerCase() === normalizedName.toLowerCase());
    updateChecklistConfig({
      ...checklistConfigRaw,
      enabled: checklistEnabled,
      template: checklistTemplate,
      linkedActivityNames: hasActivity
        ? checklistLinkedActivities.filter((item) => item.toLowerCase() !== normalizedName.toLowerCase())
        : [...checklistLinkedActivities, normalizedName],
    });
  }

  function updateChecklistSection(sectionId, patch) {
    const nextSections = checklistTemplate.sections.map((section) => (
      section.id === sectionId ? { ...section, ...patch } : section
    ));
    updateChecklistConfig({
      ...checklistConfigRaw,
      enabled: checklistEnabled,
      linkedActivityNames: checklistLinkedActivities,
      template: {
        ...checklistTemplate,
        sections: nextSections,
      },
    });
  }

  function updateChecklistCheck(sectionId, checkId, patch) {
    const nextSections = checklistTemplate.sections.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        checks: section.checks.map((check) => (check.id === checkId ? { ...check, ...patch } : check)),
      };
    });
    updateChecklistConfig({
      ...checklistConfigRaw,
      enabled: checklistEnabled,
      linkedActivityNames: checklistLinkedActivities,
      template: {
        ...checklistTemplate,
        sections: nextSections,
      },
    });
  }

  function handlePreviewColumnDrop(targetToken, fromTokenOverride = "") {
    const fromToken = fromTokenOverride || draggingColumnTokenRef.current || draggingColumnToken;
    if (!fromToken || !targetToken || fromToken === targetToken) return;
    onChange((current) => {
      const currentOrder = getNormalizedBoardColumnOrder({ fields: current.columns || [], settings: current.settings || {} });
      const nextOrder = reorderBoardColumnOrderTokens(fromToken, targetToken, currentOrder);
      return {
        ...current,
        columns: sortBoardFieldsByColumnOrder(current.columns || [], nextOrder),
        settings: {
          ...current.settings,
          columnOrder: nextOrder,
        },
      };
    });
    draggingColumnTokenRef.current = "";
    setDraggingColumnToken("");
  }

  function resolveFieldWidthPx(field) {
    const typeMinimum = fieldTypeMinWidths[field?.type] || 120;
    const manualWidth = Number(field?.widthPx || 0);
    if (Number.isFinite(manualWidth) && manualWidth >= 90) {
      return Math.max(typeMinimum, Math.round(manualWidth));
    }
    const fallbackWidth = BOARD_FIELD_WIDTH_STYLES[field?.width]?.minWidth || BOARD_FIELD_WIDTH_STYLES.md?.minWidth || "180px";
    const parsed = Number.parseInt(String(fallbackWidth).replace("px", ""), 10);
    const normalized = Number.isFinite(parsed) ? parsed : 180;
    return Math.max(typeMinimum, normalized);
  }

  function resolveAuxWidthPx(auxId) {
    const configuredWidth = Number((previewBoard?.settings?.auxColumnWidths || draft?.settings?.auxColumnWidths || {})[auxId] || 0);
    if (Number.isFinite(configuredWidth) && configuredWidth >= 90) {
      return Math.max(auxMinWidths[auxId] || 120, Math.round(configuredWidth));
    }
    return Math.max(auxMinWidths[auxId] || 120, defaultAuxWidths[auxId] || 160);
  }

  function getPreviewCellStyle(field) {
    const widthPx = resolveFieldWidthPx(field);
    return { minWidth: `${widthPx}px`, width: `${widthPx}px` };
  }

  function getPreviewAuxCellStyle(auxId) {
    const widthPx = resolveAuxWidthPx(auxId);
    return { minWidth: `${widthPx}px`, width: `${widthPx}px` };
  }

  function persistFieldWidth(fieldId, widthPx) {
    const targetField = (draft.columns || []).find((column) => column.id === fieldId);
    const minimum = fieldTypeMinWidths[targetField?.type] || 120;
    const boundedWidth = Math.max(minimum, Math.min(800, Math.round(widthPx)));
    onChange((current) => ({
      ...current,
      columns: (current.columns || []).map((column) => (column.id === fieldId ? { ...column, widthPx: boundedWidth } : column)),
    }));
  }

  function persistAuxWidth(auxId, widthPx) {
    const boundedWidth = Math.max(auxMinWidths[auxId] || 120, Math.min(800, Math.round(widthPx)));
    onChange((current) => ({
      ...current,
      settings: {
        ...current.settings,
        auxColumnWidths: {
          ...(current.settings?.auxColumnWidths || {}),
          [auxId]: boundedWidth,
        },
      },
    }));
  }

  function handleFieldResizeStart(field, event) {
    event.preventDefault();
    event.stopPropagation();
    const currentWidth = resolveFieldWidthPx(field);
    resizeStateRef.current = {
      kind: "field",
      id: field.id,
      startX: event.clientX,
      startWidth: currentWidth,
    };
    setResizingToken(`field:${field.id}`);

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - resizeStateRef.current.startX;
      const nextWidth = resizeStateRef.current.startWidth + delta;
      persistFieldWidth(field.id, nextWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setResizingToken("");
      resizeStateRef.current = { kind: "", id: "", startX: 0, startWidth: 0 };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleAuxResizeStart(auxId, event) {
    event.preventDefault();
    event.stopPropagation();
    const currentWidth = resolveAuxWidthPx(auxId);
    resizeStateRef.current = {
      kind: "aux",
      id: auxId,
      startX: event.clientX,
      startWidth: currentWidth,
    };
    setResizingToken(`aux:${auxId}`);

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - resizeStateRef.current.startX;
      const nextWidth = resizeStateRef.current.startWidth + delta;
      persistAuxWidth(auxId, nextWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setResizingToken("");
      resizeStateRef.current = { kind: "", id: "", startX: 0, startWidth: 0 };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function goToPrevBuilderTab() {
    if (!hasBuilderPrev) return;
    setBuilderTab(builderTabs[currentBuilderTabIndex - 1]);
  }

  function goToNextBuilderTab() {
    if (!hasBuilderNext) return;
    setBuilderTab(builderTabs[currentBuilderTabIndex + 1]);
  }

  const focusLayoutClassName = [
    "board-builder-focus-layout",
    builderTab === "identity" ? "identity-stage" : "",
    builderTab === "base" ? "base-stage" : "",
  ].filter(Boolean).join(" ");

  return (
    <Modal
      open={open}
      className="board-builder-modal"
      title={mode === "edit" ? "Editar tablero" : "Nuevo tablero"}
      confirmLabel={confirmLabel || (mode === "edit" ? "Guardar cambios" : "Crear tablero")}
      cancelLabel="Cerrar"
      confirmDisabled={confirmDisabled}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="board-builder-modal-shell">
        <section className="board-builder-intuitive-header">
          <div className="board-builder-intuitive-main">
            <div className="board-builder-intuitive-title-row">
              <h3>{mode === "edit" ? "Editor de tablero" : "Creador de tableros"}</h3>
              <div className="board-builder-fixed-area-banner" role="status" aria-live="polite">
                <span>Área dueña</span>
                <strong>{displayOwnerArea || "Sin área"}</strong>
              </div>
            </div>
            <div className="board-meta-inline board-meta-inline-header">
              <span>Creador · {currentUser?.name || userMap.get(previewBoard.ownerId)?.name || "Sin asignar"}</span>
              <span>{previewAssignmentSummary}</span>
              {operationalContextType !== "none" && operationalContextValue ? <span>{operationalContextLabel || "Contexto operativo"} · {operationalContextValue}</span> : null}
            </div>
            <div className="saved-board-list board-builder-intuitive-chips">
              <button type="button" className={builderTab === "base" ? "tab active" : "tab"} onClick={() => setBuilderTab("base")}>Base</button>
              <button type="button" className={builderTab === "identity" ? "tab active" : "tab"} onClick={() => setBuilderTab("identity")}>Identidad</button>
            </div>
          </div>
        </section>

        <section className="board-builder-wizard-nav" aria-label="Navegación del creador de tableros">
          <div className="board-builder-wizard-nav-start">
            <button type="button" className="icon-button" onClick={goToPrevBuilderTab} disabled={!hasBuilderPrev}>Anterior</button>
            {builderTab === "base" ? (
              <button
                type="button"
                className={baseTemplatesCollapsed ? "board-builder-template-panel-toggle primary-button" : "board-builder-template-panel-toggle icon-button"}
                onClick={() => setBaseTemplatesCollapsed((current) => !current)}
                aria-expanded={!baseTemplatesCollapsed}
                aria-controls="bb-step-base"
              >
                <Menu size={15} />
                <span>{baseTemplatesCollapsed ? "Plantillas" : "Ocultar"}</span>
              </button>
            ) : null}
          </div>
          <span className="board-builder-wizard-step">Paso {currentBuilderTabIndex + 1} de {builderTabs.length} · {builderTabLabels[builderTab]}</span>
          <button type="button" className="primary-button" onClick={goToNextBuilderTab} disabled={!hasBuilderNext}>Siguiente</button>
        </section>
        <div className={focusLayoutClassName}>
        {builderTab !== "preview" ? (
        <section className={builderTab === "base" ? (baseTemplatesCollapsed ? "board-builder-workbench board-builder-template-workbench collapsed" : "board-builder-workbench board-builder-template-workbench") : "board-builder-workbench"} aria-hidden="true">
          {builderTab === "base" ? (
          <section id="bb-step-base" className={baseTemplatesCollapsed ? "board-template-library collapsed" : "board-template-library"}>
            <div className="builder-section-head board-builder-section-head">
              <div>
                <h4>Plantillas rápidas</h4>
                <p>Activa una plantilla cuando lo necesites y mantén la vista previa libre para diseñar mejor.</p>
              </div>
              <div className="saved-board-list compact-template-actions">
                {!baseTemplatesCollapsed && selectedPreviewTemplateId ? <button type="button" className="icon-button" onClick={onClearTemplatePreview}>Volver al borrador</button> : null}
                {!baseTemplatesCollapsed && onSaveTemplate ? <button type="button" className="primary-button board-builder-save-template-btn" onClick={onSaveTemplate}>Guardar como plantilla</button> : null}
              </div>
            </div>

            {!baseTemplatesCollapsed ? (
            <>
            <div className="builder-template-toolbar compact-template-toolbar compact-template-toolbar-grid">
              <label className="app-modal-field compact-template-search-field">
                <span>Buscar por nombre</span>
                <input ref={templateSearchInputRef} value={templateSearch || ""} onChange={(event) => onTemplateSearchChange?.(event.target.value)} placeholder="Ej: devoluciones" />
              </label>
              <label className="app-modal-field">
                <span>Categoría</span>
                <select value={templateCategoryFilter || "Todas"} onChange={(event) => onTemplateCategoryChange?.(event.target.value)}>
                  {(templateCategories || []).map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
            </div>

            {feedback ? (
              <div className="feedback-banner feedback-success">
                <strong>Actualización</strong>
                <p>{feedback}</p>
              </div>
            ) : null}

            {filteredBoardTemplates.length ? (
              <div className="board-template-rail">
                {filteredBoardTemplates.map((template) => {
                  const { contextType, contextLabel, contextOptions, contextValue } = getTemplateOperationalContext(template);
                  const isActiveTemplate = selectedPreviewTemplateId === template.id;
                  return (
                    <article key={template.id} className={isActiveTemplate ? "board-template-rail-item active" : "board-template-rail-item"}>
                      <div className="board-template-rail-main">
                        <strong>{template.name}</strong>
                        <p>{template.description || "Plantilla reutilizable para arrancar más rápido el tablero."}</p>
                        <div className="saved-board-list board-template-rail-meta">
                          <span className="chip">{template.category || "Operación"}</span>
                          {contextType !== "none" ? <span className="chip primary">{contextLabel || "Contexto"} · {contextValue || contextOptions[0]}</span> : null}
                          {contextType === "custom" && contextOptions.length ? <span className="chip">{contextOptions.length} opción(es)</span> : null}
                        </div>
                      </div>
                      <div className="board-template-rail-actions">
                        <button type="button" className="icon-button" onClick={() => onPreviewTemplate?.(template.id)}>{isActiveTemplate ? "Vista activa" : "Previsualizar"}</button>
                        <button type="button" className="primary-button" onClick={() => onApplyTemplate?.(template.id)}>Usar</button>
                        {onDeleteTemplate && (!canDeleteTemplate || canDeleteTemplate(template)) ? (
                          <button type="button" className="icon-button danger" onClick={() => onDeleteTemplate(template)}>Eliminar</button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="builder-empty-state compact-builder-empty-state">
                <div>
                  <strong>No hay plantillas para ese filtro</strong>
                  <p>Ajusta la búsqueda o guarda tu borrador actual como plantilla reutilizable.</p>
                </div>
              </div>
            )}
            </>
            ) : null}
          </section>
          ) : null}

          {builderTab === "identity" ? (
          <section id="bb-step-identity" className="builder-card compact-builder-card board-builder-identity-panel">
            <div className="builder-section-head board-builder-section-head">
              <div>
                <h4>Identidad y acceso del tablero</h4>
                <p>Define nombre, responsable y con quién se comparte. El área dueña queda fija según dónde creas el tablero.</p>
              </div>
            </div>

            <div className="board-builder-identity-grid">
              <label className="app-modal-field board-preview-edit-field">
                <span>Nombre del tablero<span className="required-mark" aria-hidden="true"> *</span></span>
                <input value={draft.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} placeholder="Ej: Control semanal C3" />
              </label>
              <label className="app-modal-field board-preview-edit-field">
                <span>Descripción</span>
                <input value={draft.description} onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))} placeholder="Describe qué controla este tablero" />
              </label>
              <label className="app-modal-field board-preview-edit-field board-preview-owner-field">
                <span>Player principal</span>
                <select value={draft.ownerId || currentUser?.id || ""} onChange={(event) => handleOwnerChange(event.target.value)}>
                  {activeUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>

              <section className="board-builder-share-panel board-preview-assignment-panel">
                <label className="app-modal-field board-preview-edit-field">
                  <span>Compartir tablero con</span>
                  <select value={effectiveVisibilityType} onChange={(event) => handleVisibilityTypeChange(event.target.value)}>
                    <option value="users">Players específicos (cualquier área)</option>
                    <option value="department">Otras áreas</option>
                  </select>
                </label>

                {effectiveVisibilityType === "users" ? (
                  <div className="board-access-selector" ref={accessMenuRef}>
                    <button type="button" className="board-access-trigger" onClick={() => setAccessMenuOpen((current) => !current)} aria-expanded={accessMenuOpen}>
                      <span>{selectedPlayersLabel}</span>
                      <ArrowDown size={16} />
                    </button>
                    {accessMenuOpen ? (
                      <div className="board-access-dropdown">
                        <label className="app-modal-field board-access-search-field">
                          <span>Buscar player</span>
                          <input value={accessSearch} onChange={(event) => setAccessSearch(event.target.value)} placeholder="Escribe un nombre" />
                        </label>
                        <div className="board-access-list">
                          {filteredOperationalUsers.length ? filteredOperationalUsers.map((user) => {
                            const checked = pendingAccessUserIds.includes(user.id);
                            const userArea = normalizeArea(user.area || user.department || "");
                            return (
                              <label key={user.id} className="board-access-option">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleTogglePendingAccess(user.id)}
                                />
                                <span>{user.name}{userArea ? ` · ${userArea}` : ""}</span>
                              </label>
                            );
                          }) : <p className="board-access-empty">No hay players disponibles para seleccionar.</p>}
                        </div>
                        <div className="board-access-actions">
                          <button type="button" className="icon-button" onClick={() => setAccessMenuOpen(false)}>Cancelar</button>
                          <button type="button" className="primary-button" onClick={handleSaveAccessSelection}>Guardar</button>
                        </div>
                      </div>
                    ) : null}
                    <p className="board-assignment-hint">Puedes invitar players de otras áreas además del responsable principal.</p>
                  </div>
                ) : null}

                {effectiveVisibilityType === "department" ? (
                  <div className="board-builder-department-share">
                    <span className="board-builder-department-share-label">Áreas con acceso</span>
                    <div className="saved-board-list board-builder-department-chips">
                      {normalizedDepartmentOptions.length ? normalizedDepartmentOptions.map((department) => {
                        const selected = (draft.sharedDepartments || []).includes(department);
                        return (
                          <button
                            key={department}
                            type="button"
                            className={selected ? "chip primary" : "chip"}
                            onClick={() => handleToggleSharedDepartment(department)}
                          >
                            {department}
                          </button>
                        );
                      }) : <span className="board-assignment-hint">No hay áreas configuradas en el sistema.</span>}
                    </div>
                    <p className="board-assignment-hint">Marca una o varias áreas para compartir el tablero entre equipos.</p>
                    {(draft.sharedDepartments || []).length ? <span className="chip soft board-assignment-chip">{selectedDepartmentsLabel}</span> : null}
                  </div>
                ) : null}
              </section>

              <div className="board-builder-feature-switches">
                <div className="builder-card compact-builder-card board-builder-switch-row">
                  <div>
                    <strong>Workflow</strong>
                    <span>Acciones de la fila</span>
                  </div>
                  <button type="button" className={draft.settings.showWorkflow ? "switch-button on" : "switch-button"} aria-label="Alternar workflow" aria-pressed={draft.settings.showWorkflow} onClick={() => onChange((current) => ({ ...current, settings: { ...current.settings, showWorkflow: !current.settings.showWorkflow } }))}>
                    <span className="switch-thumb" />
                  </button>
                </div>
                <div className="builder-card compact-builder-card board-builder-switch-row">
                  <div>
                    <strong>Métricas</strong>
                    <span>Resumen del tablero</span>
                  </div>
                  <button type="button" className={draft.settings.showMetrics ? "switch-button on" : "switch-button"} aria-label="Alternar métricas" aria-pressed={draft.settings.showMetrics} onClick={() => onChange((current) => ({ ...current, settings: { ...current.settings, showMetrics: !current.settings.showMetrics } }))}>
                    <span className="switch-thumb" />
                  </button>
                </div>
                <div className="builder-card compact-builder-card board-builder-switch-row">
                  <div>
                    <strong>Player visible</strong>
                    <span>Columna en tabla</span>
                  </div>
                  <button type="button" className={draft.settings.showAssignee ? "switch-button on" : "switch-button"} aria-label="Alternar player visible" aria-pressed={draft.settings.showAssignee} onClick={() => onChange((current) => ({ ...current, settings: { ...current.settings, showAssignee: !current.settings.showAssignee } }))}>
                    <span className="switch-thumb" />
                  </button>
                </div>
                <div className="builder-card compact-builder-card board-builder-switch-row">
                  <div>
                    <strong>Fechas visibles</strong>
                    <span>Tiempos y fechas</span>
                  </div>
                  <button type="button" className={draft.settings.showDates ? "switch-button on" : "switch-button"} aria-label="Alternar fechas visibles" aria-pressed={draft.settings.showDates} onClick={() => onChange((current) => ({ ...current, settings: { ...current.settings, showDates: !current.settings.showDates } }))}>
                    <span className="switch-thumb" />
                  </button>
                </div>
                <div className="builder-card compact-builder-card board-builder-switch-row">
                  <div>
                    <strong>Acumulado</strong>
                    <span>Columna de tiempo total</span>
                  </div>
                  <button type="button" className={draft.settings.showTotalTime !== false ? "switch-button on" : "switch-button"} aria-label="Alternar columna acumulado" aria-pressed={draft.settings.showTotalTime !== false} onClick={() => onChange((current) => ({ ...current, settings: { ...current.settings, showTotalTime: current.settings.showTotalTime === false } }))}>
                    <span className="switch-thumb" />
                  </button>
                </div>
                <div className="builder-card compact-builder-card board-builder-switch-row">
                  <div>
                    <strong>Eficiencia</strong>
                    <span>Columna de eficiencia</span>
                  </div>
                  <button type="button" className={draft.settings.showEfficiency !== false ? "switch-button on" : "switch-button"} aria-label="Alternar columna eficiencia" aria-pressed={draft.settings.showEfficiency !== false} onClick={() => onChange((current) => ({ ...current, settings: { ...current.settings, showEfficiency: current.settings.showEfficiency === false } }))}>
                    <span className="switch-thumb" />
                  </button>
                </div>
              </div>

              <div className="builder-card compact-builder-card board-context-card">
                <div className="board-context-grid">
                  <label className="app-modal-field">
                    <span>Contexto operativo</span>
                    <select value={operationalContextType} onChange={(event) => updateOperationalContext(event.target.value)}>
                      {boardOperationalContextOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>

                  {operationalContextType !== "none" ? (
                    <label className="app-modal-field">
                      <span>Etiqueta visible</span>
                      <input value={operationalContextLabel} onChange={(event) => updateOperationalContext(operationalContextType, event.target.value)} placeholder={operationalContextType === "cleaningSite" ? "Sede de limpieza" : "Ej: Nave, estación o zona"} />
                    </label>
                  ) : null}

                  {operationalContextType === "custom" ? (
                    <label className="app-modal-field">
                      <span>Opciones manuales</span>
                      <input value={operationalContextOptionsText} onChange={(event) => updateOperationalContext(operationalContextType, operationalContextLabel, event.target.value.split(/[;,]/))} placeholder="Ej: Nave 1, Estación A, Estación B" />
                    </label>
                  ) : null}

                  {operationalContextType !== "none" ? (
                    <label className="app-modal-field">
                      <span>Valor activo</span>
                      <select value={operationalContextValue} onChange={(event) => updateOperationalContext(operationalContextType, operationalContextLabel, operationalContextOptions, event.target.value)}>
                        {operationalContextOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                  ) : null}
                </div>
                <p className="board-context-help">
                  Usa este contexto para que cada tablero opere por semana y además quede ligado manualmente a una sede, nave, estación o zona. Cuando el contexto sea C1, C2 o C3, el descuento automático de limpieza saldrá sólo de esa sede.
                </p>
              </div>
            </div>
          </section>
          ) : null}
        </section>
        ) : null}

        {builderTab === "base" ? (
        <aside className="board-builder-preview-panel">
          <div className="board-preview-surface">
            <div className="board-preview-head">
              <div className="board-preview-head-main">
                <div className="saved-board-list compact-preview-metrics board-preview-summary-chips">
                  <span className="chip">Campos: {(previewBoard.fields || []).length}</span>
                  <span className="chip">Secciones: {previewSections.length}</span>
                  <span className="chip">Filas demo: {previewRows.length}</span>
                </div>
              </div>
              <div className="board-preview-head-side">
                <div className="board-builder-toolbar" ref={actionMenuRef}>
                  <button
                    type="button"
                    className="icon-button board-builder-menu-trigger"
                    aria-label="Abrir acciones del constructor"
                    aria-expanded={actionMenuOpen}
                    onClick={() => setActionMenuOpen((current) => !current)}
                  >
                    <Menu size={16} />
                  </button>
                  {actionMenuOpen ? (
                    <div className="board-builder-actions-dropdown">
                      <button type="button" className="board-builder-menu-item" onClick={() => { setActionMenuOpen(false); onImportFromExcel?.(); }}>
                        Importar desde Excel
                      </button>
                      <button type="button" className="board-builder-menu-item danger" onClick={() => { setActionMenuOpen(false); onClear(); }}>
                        Limpiar
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            {(previewBoard.fields || []).length ? (
              <div className="table-wrap board-preview-table-wrap">
                <table className="admin-table-clean board-preview-table">
                  <thead>
                    {previewSections.length ? (
                      <tr>
                        {previewSections.map((section, index) => (
                          <th key={`${section.name}-${index}`} colSpan={section.span} className="board-section-header-cell" style={{ backgroundColor: section.color }}>
                            {section.name}
                          </th>
                        ))}
                      </tr>
                    ) : null}
                    <tr>
                      {orderedPreviewColumns.map((column) => (
                        <th
                          key={column.token}
                          draggable={!resizingToken}
                          onDragStart={e => {
                            if (resizingToken) return;
                            draggingColumnTokenRef.current = column.token;
                            setDraggingColumnToken(column.token);
                            e.dataTransfer.effectAllowed = "move";
                            try {
                              e.dataTransfer.setData("text/plain", column.token);
                              e.dataTransfer.setData("text", column.token);
                            } catch {
                              // Some browsers can block setData for custom drags; state/ref still preserve token.
                            }
                          }}
                          onDragEnd={() => {
                            draggingColumnTokenRef.current = "";
                            setDraggingColumnToken("");
                          }}
                          onDragOver={event => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={event => {
                            event.preventDefault();
                            const fromToken = event.dataTransfer.getData("text/plain")
                              || event.dataTransfer.getData("text")
                              || draggingColumnTokenRef.current
                              || draggingColumnToken;
                            handlePreviewColumnDrop(column.token, fromToken);
                          }}
                          className={[
                            "board-preview-field-heading",
                            draggingColumnToken === column.token ? "dragging" : "",
                            resizingToken === `${column.kind}:${column.id}` ? "is-resizing" : "",
                            draggingColumnToken && draggingColumnToken !== column.token ? "drop-target" : "",
                          ].filter(Boolean).join(" ")}
                          title="Arrastra para reordenar"
                          style={{
                            ...(column.kind === "field" ? getPreviewCellStyle(column.field) : getPreviewAuxCellStyle(column.id)),
                            cursor: resizingToken ? "col-resize" : draggingColumnToken ? "grabbing" : "grab",
                            opacity: draggingColumnToken === column.token ? 0.5 : 1,
                            background: draggingColumnToken && draggingColumnToken !== column.token ? "rgba(49, 77, 105, 0.06)" : undefined,
                            zIndex: draggingColumnToken === column.token ? 2 : 1,
                            position: draggingColumnToken ? "relative" : undefined,
                            boxShadow: draggingColumnToken === column.token ? "0 4px 24px 0 rgba(49, 77, 105, 0.10)" : undefined,
                            transition: "background 0.15s, opacity 0.15s, box-shadow 0.2s, transform 0.25s cubic-bezier(.4,1.6,.6,1)",
                            transform: draggingColumnToken === column.token ? "scale(1.04) translateY(-2px)" : "none"
                          }}
                        >
                          <div style={{ display: "grid", gap: "0.3rem" }}>
                            <span className="board-preview-field-label">{column.kind === "field" ? `${column.field.label}${column.field.required ? " *" : ""}` : column.label}</span>
                          </div>
                          <button
                            type="button"
                            className="board-preview-resize-handle"
                            onMouseDown={(event) => {
                              if (column.kind === "field") {
                                handleFieldResizeStart(column.field, event);
                                return;
                              }
                              handleAuxResizeStart(column.id, event);
                            }}
                            onClick={(event) => event.preventDefault()}
                            aria-label={`Ajustar ancho de ${column.kind === "field" ? column.field.label : column.label}`}
                            title="Arrastra para ajustar ancho"
                          />
                        </th>
                      ))}
                      <th className="board-preview-add-col-th">
                        <button
                          type="button"
                          className="board-preview-add-col-btn"
                          onClick={onOpenComponentStudio}
                          title="Agregar columna"
                        >
                          <Plus size={14} />
                          <span>Columna</span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.length ? previewRows.map((row) => (
                      <tr key={row.id}>
                        {orderedPreviewColumns.map((column) => {
                          if (column.kind === "field") {
                            return <td key={`${row.id}-${column.token}`} style={getPreviewCellStyle(column.field)}>{formatBoardPreviewValue(row.values?.[column.field.id], column.field, userMap, inventoryItems)}</td>;
                          }
                          if (column.id === "assignee") return <td key={`${row.id}-${column.token}`} style={getPreviewAuxCellStyle(column.id)} title={getPreviewAssigneeLabel(row)}>{getPreviewAssigneeLabel(row)}</td>;
                          if (column.id === "status") return <td key={`${row.id}-${column.token}`} style={getPreviewAuxCellStyle(column.id)}><span className="chip">{row.status || STATUS_PENDING}</span></td>;
                          if (column.id === "time") return <td key={`${row.id}-${column.token}`} style={getPreviewAuxCellStyle(column.id)}>{row.accumulatedSeconds ? `${Math.round(row.accumulatedSeconds / 60)} min` : "0 min"}</td>;
                          if (column.id === "totalTime") return <td key={`${row.id}-${column.token}`} style={getPreviewAuxCellStyle(column.id)}>{"00:00:00"}</td>;
                          if (column.id === "efficiency") return <td key={`${row.id}-${column.token}`} style={getPreviewAuxCellStyle(column.id)}><span style={{ color: "#4f7da9", fontWeight: 600 }}>{"—"}</span></td>;
                          return <td key={`${row.id}-${column.token}`} style={getPreviewAuxCellStyle(column.id)}><span className={row.status === STATUS_RUNNING ? "chip success" : "chip"}>Inicia · Pausa · Fin</span></td>;
                        })}
                        <td className="board-preview-add-col-td" />
                      </tr>
                    )) : (
                      <tr>
                        {orderedPreviewColumns.map((column) => (
                          <td key={column.token} style={column.kind === "field" ? getPreviewCellStyle(column.field) : getPreviewAuxCellStyle(column.id)} className="board-preview-empty-cell">—</td>
                        ))}
                        <td className="board-preview-add-col-td" />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="builder-preview-empty">
                <LayoutDashboard size={32} />
                <div>
                  <strong>La estructura aparecerá aquí</strong>
                  <p>Haz clic en <strong>+ Agregar columna</strong> o previsualiza una plantilla para ver el tablero terminado.</p>
                </div>
                <button type="button" className="primary-button" onClick={onOpenComponentStudio}>
                  <Plus size={15} /> Agregar primera columna
                </button>
              </div>
            )}

            <section className="board-inline-components">
              <div className="builder-section-head board-builder-section-head">
                <div>
                  <h4>Componentes dentro del constructor</h4>
                </div>
                <span className="chip primary">{draft.columns.length} componente(s)</span>
              </div>
              <div className="saved-board-list board-inline-components-list">
                {(previewBoard.fields || []).map((field) => {
                  const typeOption = BOARD_FIELD_TYPES.find((t) => t.value === field.type);
                  const typeLabel = typeOption?.label || field.type || "Campo";
                  const formulaDetail = field.type === "formula"
                    ? getDraftFormulaTerms(field)
                      .map((term, index) => {
                        const termLabel = (previewBoard.fields || []).find((candidate) => candidate.id === term.fieldId)?.label || "";
                        if (!termLabel) return "";
                        return index === 0 ? termLabel : `${getFormulaOperationSymbol(term.operation || "add")} ${termLabel}`;
                      })
                      .filter(Boolean)
                      .join(" ")
                    : null;
                  return (
                    <article key={field.id} className="board-inline-component-chip">
                      <div className="board-inline-component-main">
                        <span className="chip primary board-inline-component-label">{field.label}</span>
                        <span className="board-inline-component-type">{typeLabel}</span>
                        {formulaDetail ? (
                          <span className="board-inline-component-formula">{formulaDetail}</span>
                        ) : null}
                        <span className="board-inline-component-actions">
                          <button type="button" className="icon-button" onClick={() => onEditDraftColumn(field.id)}><Pencil size={14} /> Editar</button>
                          <button type="button" className="icon-button danger" onClick={() => onRemoveDraftColumn(field.id)}><Trash2 size={14} /> Quitar</button>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </aside>
        ) : null}
        </div>
      </div>
    </Modal>
  );
}
