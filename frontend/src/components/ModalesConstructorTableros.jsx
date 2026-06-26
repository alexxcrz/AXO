import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  LayoutDashboard,
  Menu,
  Pencil,
  PauseCircle,
  Play,
  Plus,
  Square,
  Trash2,
  Users,
  GripVertical,
  Sparkles,
  Layers,
  Palette,
} from "lucide-react";
import { Modal } from "./Modal";
import BoardActivityFinishGateSwitch from "./BoardActivityFinishGateSwitch.jsx";
import { BoardComponentHelperPanel } from "./BoardComponentHelperPanel.jsx";
import { CLEANING_CARD_SLOT_DEFINITIONS, CLEANING_LAYOUT_BLOCK_TYPES } from "../utils/constantes.js";
import {
  applyCleaningLayoutBlock,
  appendFinishGateFieldToBoardDraft,
  assignBoardFieldLayoutRole,
  buildBoardCardLineLayout,
  findBoardFinishGateField,
  getBoardFieldLayoutRoleOptions,
  getCleaningBoardFieldGroups,
  getCleaningCardLayout,
  getCleaningLayoutBlockFeedbackMessage,
  isCleaningLayoutBlockActive,
  normalizeFinishGateAuthorizedUserIds,
  reorderBoardCardLineItems,
  reorderCleaningCardLayoutSlots,
  resolveBoardCardCellRole,
  resolveBoardCardLineItemHeaderMeta,
  buildBoardCardSectionHeaderGroups,
  formatBoardOperationalDateLabel,
  shouldShowBoardCardSectionRow,
  toggleCleaningCardSlotVisibility,
  toggleFinishGateAuthorizedUser,
  toggleFinishGateFieldEditorUser,
} from "../utils/utilidades.jsx";
const COMPONENT_TYPE_CATEGORIES = [
  {
    label: "Asistente",
    types: [],
    isHelper: true,
  },
  {
    label: "Texto y contacto",
    types: [
      { value: "text", label: "Texto corto", hint: "Folio, tarima, comentario breve" },
      { value: "textarea", label: "Notas largas", hint: "Observaciones multilínea" },
      { value: "email", label: "Correo electrónico", hint: "Contacto con validación" },
      { value: "phone", label: "Teléfono", hint: "Número de contacto operativo" },
      { value: "url", label: "Enlace / URL", hint: "Documentos o referencias web" },
      { value: "location", label: "Ubicación", hint: "Nave, zona o dirección" },
    ],
  },
  {
    label: "Números y cálculo",
    types: [
      { value: "number", label: "Número", hint: "Piezas, cajas, conteos" },
      { value: "currency", label: "Monto ($)", hint: "Costos, gastos o ventas" },
      { value: "percentage", label: "Porcentaje (%)", hint: "Avance, merma o cumplimiento" },
      { value: "weight", label: "Peso (kg)", hint: "Logística o calidad" },
      { value: "temperature", label: "Temperatura (°C)", hint: "Cadena de frío" },
      { value: "duration", label: "Duración", hint: "Tiempo total hh:mm" },
      { value: "formula", label: "Fórmula", hint: "Calcula entre otros campos" },
    ],
  },
  {
    label: "Fecha y tiempo",
    types: [
      { value: "date", label: "Fecha", hint: "Día de la actividad o revisión" },
      { value: "time", label: "Hora", hint: "Inicio, fin o corte" },
      { value: "timeline", label: "Rango de fechas", hint: "Inicio y fin de un periodo" },
    ],
  },
  {
    label: "Estado y control",
    types: [
      { value: "boolean", label: "Sí / No", hint: "Confirmación rápida" },
      { value: "priority", label: "Prioridad", hint: "Crítica, alta, media o baja" },
      { value: "rating", label: "Calificación (★)", hint: "De 1 a 5 estrellas" },
      { value: "progress", label: "Progreso", hint: "Barra de avance 0-100%" },
      { value: "counter", label: "Contador (+1)", hint: "Incremento con botones" },
      { value: "score", label: "Puntuación 1-10", hint: "Auditorías o evaluaciones" },
      { value: "color_tag", label: "Etiqueta de color", hint: "Clasificación visual" },
    ],
  },
  {
    label: "Selección",
    types: [
      { value: "select", label: "Menú desplegable", hint: "Opciones fijas o del catálogo" },
      { value: "multiSelectDetail", label: "Multi + detalle", hint: "Causales con cantidad" },
      { value: "tags", label: "Etiquetas múltiples", hint: "Marcadores separados por coma" },
      { value: "evidenceGallery", label: "Evidencias", hint: "Fotos o videos en la ficha" },
    ],
  },
  {
    label: "Inventario",
    types: [
      { value: "inventoryLookup", label: "Buscador", hint: "Vincula producto del inventario" },
      { value: "inventoryProperty", label: "Dato derivado", hint: "Lote, nombre, piezas/caja" },
      { value: "maintenanceInventoryLookup", label: "Insumos mant.", hint: "Buscador de insumos" },
      { value: "inventoryLookupLogistics", label: "Buscador + empaque", hint: "Piezas y cajas por tarima" },
    ],
  },
  {
    label: "Operación",
    types: [
      { value: "activityList", label: "Lista actividades", hint: "Una fila por actividad" },
    ],
  },
];

const COMPONENT_TYPE_GLYPHS = {
  text: "Aa",
  textarea: "¶",
  email: "@",
  phone: "☎",
  url: "↗",
  location: "⌖",
  number: "12",
  currency: "$",
  percentage: "%",
  weight: "kg",
  temperature: "°",
  date: "D",
  time: "T",
  duration: "⏱",
  timeline: "↔",
  boolean: "✓",
  priority: "!",
  rating: "★",
  progress: "▰",
  counter: "+",
  score: "#",
  color_tag: "◆",
  select: "▾",
  multiSelectDetail: "☑",
  tags: "#",
  evidenceGallery: "▣",
  inventoryLookup: "⌕",
  inventoryProperty: "↗",
  maintenanceInventoryLookup: "⚙",
  inventoryLookupLogistics: "▦",
  formula: "ƒ",
  activityList: "⚡",
};

const FORGE_RAIL_STEPS = [
  { icon: Layers, title: "Tipo", subtitle: "Elige qué capturar" },
  { icon: Pencil, title: "Identidad", subtitle: "Nombre y sección" },
  { icon: Palette, title: "Automatizar", subtitle: "Color condicional" },
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

function resolveComponentTypeValue(value, contextoConstructor) {
  if (value === "inventoryLookupLogistics") return contextoConstructor.INVENTORY_LOOKUP_LOGISTICS_FIELD || "inventoryLookupLogistics";
  if (value === "maintenanceInventoryLookup") return contextoConstructor.MAINTENANCE_INVENTORY_LOOKUP_FIELD || "maintenanceInventoryLookup";
  if (value === "activityList") return contextoConstructor.BOARD_ACTIVITY_LIST_FIELD || "activityList";
  return value;
}

function findComponentTypeMeta(typeValue, contextoConstructor) {
  return COMPONENT_TYPE_CATEGORIES
    .flatMap((category) => category.types)
    .find((type) => resolveComponentTypeValue(type.value, contextoConstructor) === typeValue) || null;
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
  catalog: _catalog,
  inventoryItems: _inventoryItems,
  visibleUsers: _visibleUsers,
  sectionOptions,
  activityCategoryOptions,
  contextoConstructor,
  boardComponentPresets = [],
  onApplyHelperComponents,
}) {
  const {
    BOARD_ACTIVITY_LIST_FIELD,
    COLOR_RULE_OPERATORS,
    FORMULA_OPERATIONS,
    INVENTORY_LOOKUP_LOGISTICS_FIELD,
    INVENTORY_PROPERTIES,
    OPTION_SOURCE_TYPES,
    getBoardFieldTypeDescription,
  } = contextoConstructor;

  const studioSteps = [
    { title: "Tipo", subtitle: "Qué vas a capturar" },
    { title: "Configurar", subtitle: "Nombre y reglas mínimas" },
    { title: "Automatización", subtitle: "Color y condiciones" },
  ];
  const [currentStep, setCurrentStep] = useState(0);
  const selectedType = draft.fieldType;
  const selectedTypeMeta = findComponentTypeMeta(selectedType, contextoConstructor);
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
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStep(0);
      setActiveCategoryIndex(0);
      setFeedback({ type: "", message: "" });
      setManualOptionInput("");
    }
  }, [open, mode]);

  useEffect(() => {
    if (!feedback.message) return undefined;
    const timer = window.setTimeout(() => {
      setFeedback({ type: "", message: "" });
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [feedback.message, feedback.type]);

  const isLastStep = currentStep === studioSteps.length - 1;
  const inventorySourceFields = (draft.columns || []).filter((column) => ["inventoryLookup", "maintenanceInventoryLookup", INVENTORY_LOOKUP_LOGISTICS_FIELD].includes(column.type));
  const resolvedInventorySourceFieldId = inventorySourceFields.some((column) => column.id === draft.sourceFieldId)
    ? draft.sourceFieldId
    : inventorySourceFields[inventorySourceFields.length - 1]?.id || "";

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
    if (currentStep === 0) {
      if (!selectedType) {
        setFeedback({ type: "error", message: "Elige un tipo de componente para continuar." });
        return;
      }
      setCurrentStep(1);
      setFeedback({ type: "", message: "" });
      return;
    }
    if (currentStep === 1) {
      if (!validateField()) return;
      setCurrentStep(2);
      setFeedback({ type: "", message: "" });
      return;
    }
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

  const headerHint = currentStep === 0
    ? "Selecciona una familia y el tipo de dato que verás en cada fila de la ficha."
    : currentStep === 1
      ? "Define cómo se verá el encabezado y el nombre del campo."
      : "Opcional: colorea la celda cuando se cumpla una condición.";

  function goToForgeStep(index) {
    if (index === 0) {
      setCurrentStep(0);
      setFeedback({ type: "", message: "" });
      return;
    }
    if (index === 1 && selectedType) {
      setCurrentStep(1);
      setFeedback({ type: "", message: "" });
      return;
    }
    if (index === 2 && selectedType && validateField()) {
      setCurrentStep(2);
      setFeedback({ type: "", message: "" });
    }
  }

  const activeCategory = COMPONENT_TYPE_CATEGORIES[activeCategoryIndex] || COMPONENT_TYPE_CATEGORIES[0];
  const isHelperCategory = Boolean(activeCategory?.isHelper);
  const activeCategoryTypes = (activeCategory?.types || []).map((type) => ({
    ...type,
    actualValue: resolveComponentTypeValue(type.value, contextoConstructor),
    glyph: COMPONENT_TYPE_GLYPHS[type.value] || "•",
  }));
  const previewFieldLabel = draft.fieldLabel.trim() || "Nombre del campo";
  const previewSectionLabel = draft.groupName || "General";
  const colorOperatorLabel = COLOR_RULE_OPERATORS.find((operator) => operator.value === draft.colorOperator)?.label || draft.colorOperator;

  return (
    <Modal
      open={open}
      className="component-studio-modal component-studio-modal-forge"
      backdropClassName="component-studio-backdrop-forge"
      title={mode === "edit" ? "Editar componente" : "Nuevo componente"}
      confirmLabel={isLastStep ? (mode === "edit" ? "Guardar cambios" : "Agregar a la ficha") : "Continuar"}
      cancelLabel="Cerrar"
      onClose={onClose}
      onConfirm={handleStepConfirm}
      footerActions={currentStep > 0 ? (
        <>
          <div className="cs-forge-footer-meta">
            <span className="cs-forge-footer-step">Paso {currentStep + 1} / {studioSteps.length}</span>
            <strong>{studioSteps[currentStep]?.title}</strong>
          </div>
          <button type="button" className="sicfla-button ghost cs-forge-back-btn" onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}>Anterior</button>
        </>
      ) : (
        <div className="cs-forge-footer-meta">
          <span className="cs-forge-footer-step">Paso 1 / {studioSteps.length}</span>
          <strong>Elige el tipo de componente</strong>
        </div>
      )}
    >
      <div className="cs-forge">
        <header className="cs-forge-hero">
          <div className="cs-forge-hero-copy">
            <span className="cs-forge-eyebrow">{mode === "edit" ? "Edición en vivo" : "Constructor de fichas"}</span>
            <h2>{mode === "edit" ? "Editar componente" : "Nuevo componente"}</h2>
            <p>{headerHint}</p>
          </div>
          <div className="cs-forge-hero-badge" aria-hidden="true">
            <Sparkles size={18} />
          </div>
        </header>

        <div className="cs-forge-layout">
          {feedback.message ? (
            <div className={`cs-forge-alert cs-forge-alert--toast cs-forge-alert--${feedback.type}`} role="alert">
              <strong>{feedback.type === "error" ? "Revisa esto" : "Listo"}</strong>
              <p>{feedback.message}</p>
            </div>
          ) : null}

          <div className="cs-forge-layout-inner">
          <nav className="cs-forge-rail" aria-label="Pasos del asistente">
            {FORGE_RAIL_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <button
                  key={step.title}
                  type="button"
                  className={[
                    "cs-forge-rail-item",
                    index === currentStep ? "is-active" : "",
                    index < currentStep ? "is-done" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => goToForgeStep(index)}
                >
                  <span className="cs-forge-rail-icon"><StepIcon size={16} strokeWidth={2.2} /></span>
                  <span className="cs-forge-rail-copy">
                    <strong>{step.title}</strong>
                    <small>{step.subtitle}</small>
                  </span>
                  {index < currentStep ? <Check size={14} className="cs-forge-rail-check" /> : null}
                </button>
              );
            })}
          </nav>

          <div className={`cs-forge-stage ${currentStep > 0 ? "cs-forge-stage--split" : ""}`}>
            <div className="cs-forge-workspace">
              {currentStep === 0 ? (
                <div className="cs-forge-type-stage">
                  <div className="cs-forge-category-tabs" role="tablist" aria-label="Familias de componente">
                    {COMPONENT_TYPE_CATEGORIES.map((category, index) => (
                      <button
                        key={category.label}
                        type="button"
                        role="tab"
                        aria-selected={index === activeCategoryIndex}
                        className={index === activeCategoryIndex ? "cs-forge-category-tab is-active" : "cs-forge-category-tab"}
                        onClick={() => setActiveCategoryIndex(index)}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>

                  {isHelperCategory ? (
                    <div className="cs-forge-helper-wrap">
                      <BoardComponentHelperPanel
                        savedPresets={boardComponentPresets}
                        onApply={onApplyHelperComponents}
                        onAddManualComponent={() => setActiveCategoryIndex(1)}
                      />
                    </div>
                  ) : (
                  <>
                  <div className="cs-forge-type-mosaic">
                    {activeCategoryTypes.map((type) => {
                      const isActive = draft.fieldType === type.actualValue;
                      const isDisabled = type.actualValue === INVENTORY_LOOKUP_LOGISTICS_FIELD;
                      return (
                        <button
                          key={`${type.value}-${type.actualValue}`}
                          type="button"
                          className={["cs-forge-type-tile", isActive ? "is-active" : "", isDisabled ? "is-hidden" : ""].filter(Boolean).join(" ")}
                          onClick={() => !isDisabled && handleTypeSelection(type.actualValue)}
                        >
                          <span className="cs-forge-type-glyph">{type.glyph}</span>
                          <strong>{type.label}</strong>
                          <span>{type.hint}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedTypeMeta ? (
                    <div className="cs-forge-type-spotlight">
                      <div>
                        <span className="cs-forge-type-spotlight-kicker">Seleccionado</span>
                        <strong>{selectedTypeMeta.label}</strong>
                        <p>{selectedTypeUsage}</p>
                      </div>
                      {autoGeneratedFieldLabels.length ? (
                        <div className="cs-forge-chip-row">
                          {autoGeneratedFieldLabels.map((label) => <span key={label} className="cs-forge-chip">{label}</span>)}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="cs-forge-type-empty">
                      <Layers size={20} />
                      <p>Elige un bloque para continuar al siguiente paso.</p>
                    </div>
                  )}
                  </>
                  )}
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div className="cs-forge-form-stage">
                  <div className="cs-forge-form-stack">
                    <article className="cs-forge-field-card">
                      <div className="cs-forge-field-card-head">
                        <span className="cs-forge-field-card-icon">§</span>
                        <div>
                          <strong>Sección<span className="required-mark" aria-hidden="true"> *</span></strong>
                          <small>Bloque de encabezado en la ficha</small>
                        </div>
                      </div>
                      <select value={draft.groupName} onChange={(event) => onChange((current) => ({ ...current, groupName: event.target.value }))}>
                        {(sectionOptions || ["General"]).map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </article>

                    <article className="cs-forge-field-card cs-forge-field-card--color">
                      <div className="cs-forge-field-card-head">
                        <span className="cs-forge-field-card-icon cs-forge-color-swatch" style={{ background: draft.groupColor }} aria-hidden="true" />
                        <div>
                          <strong>Color de sección</strong>
                          <small>Tono del encabezado agrupador</small>
                        </div>
                      </div>
                      <input type="color" value={draft.groupColor} onChange={(event) => onChange((current) => ({ ...current, groupColor: event.target.value }))} />
                    </article>

                    <article className="cs-forge-field-card">
                      <div className="cs-forge-field-card-head">
                        <span className="cs-forge-field-card-icon">Aa</span>
                        <div>
                          <strong>Nombre visible<span className="required-mark" aria-hidden="true"> *</span></strong>
                          <small>Etiqueta que verá el equipo</small>
                        </div>
                      </div>
                      <input value={draft.fieldLabel} onChange={(event) => onChange((current) => ({ ...current, fieldLabel: event.target.value }))} placeholder="Ej: SKU, Piezas surtidas, Fecha de corte" />
                    </article>
                  </div>

                  {isInventoryBundleType ? (
                    <article className="cs-forge-panel cs-forge-panel--accent">
                      <strong>Buscador con empaque</strong>
                      <p>Se crearán tres columnas: buscador, piezas por caja y cajas por tarima.</p>
                      <div className="cs-forge-chip-row">
                        <span className="cs-forge-chip">Buscador</span>
                        <span className="cs-forge-chip">Piezas por caja</span>
                        <span className="cs-forge-chip">Cajas por tarima</span>
                      </div>
                    </article>
                  ) : null}

                  {showActivityListSelector ? (
                    <article className="cs-forge-panel">
                      <h4>Lista de actividades</h4>
                      <div className="cs-forge-panel-grid">
                        <label className="cs-forge-control">
                          <span>Lista<span className="required-mark" aria-hidden="true"> *</span></span>
                          <select value={activityCategorySelectionValue} onChange={(event) => handleActivityCategorySelection(event.target.value)}>
                            <option value="">Seleccionar lista...</option>
                            {normalizedActivityCategoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            <option value="__custom__">Crear nueva lista...</option>
                          </select>
                        </label>
                        {showCustomActivityCategoryInput ? (
                          <label className="cs-forge-control">
                            <span>Nueva lista<span className="required-mark" aria-hidden="true"> *</span></span>
                            <input value={draft.optionCatalogCategory} onChange={(event) => onChange((current) => ({ ...current, optionCatalogCategory: event.target.value }))} placeholder="Ej: Arranque de turno" />
                          </label>
                        ) : null}
                      </div>
                    </article>
                  ) : null}

                  {showOptionSource ? (
                    <article className="cs-forge-panel">
                      <h4>Opciones del menú</h4>
                      <div className="cs-forge-panel-grid">
                        <label className="cs-forge-control">
                          <span>Origen<span className="required-mark" aria-hidden="true"> *</span></span>
                          <select value={draft.optionSource} onChange={(event) => onChange((current) => ({ ...current, optionSource: event.target.value }))}>
                            {OPTION_SOURCE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>
                        {showManualOptions ? (
                          <div className="cs-forge-control cs-forge-control--wide">
                            <span>Opciones manuales</span>
                            <div className="cs-forge-inline-add">
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
                              <button type="button" className="cs-forge-mini-btn" onClick={handleAddManualOption}>
                                <Plus size={14} /> Agregar
                              </button>
                            </div>
                            {manualOptions.length ? (
                              <div className="cs-forge-chip-row">
                                {manualOptions.map((option, index) => (
                                  <span key={`${option}-${index}`} className="cs-forge-chip">
                                    {option}
                                    <button type="button" className="cs-forge-chip-remove" onClick={() => handleRemoveManualOption(index)} aria-label={`Quitar ${option}`}>×</button>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ) : null}

                  {showInventoryProperty ? (
                    inventorySourceFields.length ? (
                      <article className="cs-forge-panel">
                        <h4>Dato del inventario</h4>
                        <div className="cs-forge-panel-grid">
                          <label className="cs-forge-control">
                            <span>Campo origen</span>
                            <select value={resolvedInventorySourceFieldId} onChange={(event) => onChange((current) => ({ ...current, sourceFieldId: event.target.value }))}>
                              {inventorySourceFields.map((column) => <option key={column.id} value={column.id}>{formatInventorySourceFieldLabel(column)}</option>)}
                            </select>
                          </label>
                          <label className="cs-forge-control">
                            <span>Dato a traer</span>
                            <select value={draft.inventoryProperty} onChange={(event) => onChange((current) => ({ ...current, inventoryProperty: event.target.value }))}>
                              {INVENTORY_PROPERTIES.map((property) => <option key={property.value} value={property.value}>{property.label}</option>)}
                            </select>
                          </label>
                        </div>
                      </article>
                    ) : (
                      <article className="cs-forge-panel cs-forge-panel--warn">
                        <strong>Falta un buscador de inventario</strong>
                        <p>Agrega primero un buscador y después crea el dato derivado.</p>
                      </article>
                    )
                  ) : null}

                  {showFormulaFields ? (
                    <article className="cs-forge-panel">
                      <h4>Fórmula</h4>
                      <div className="cs-forge-formula-list">
                        {formulaTerms.map((term, index) => (
                          <div key={`formula-term-${index}`} className="cs-forge-formula-row">
                            {index > 0 ? (
                              <label className="cs-forge-control">
                                <span>Operación</span>
                                <select value={term.operation || "add"} onChange={(event) => updateFormulaTerms(formulaTerms.map((currentTerm, currentIndex) => currentIndex === index ? { ...currentTerm, operation: event.target.value } : currentTerm))}>
                                  {FORMULA_OPERATIONS.map((operation) => <option key={operation.value} value={operation.value}>{operation.label}</option>)}
                                </select>
                              </label>
                            ) : null}
                            <label className="cs-forge-control">
                              <span>{index === 0 ? "Valor base" : `Campo ${getFormulaOperationSymbol(term.operation || "add")}`}<span className="required-mark" aria-hidden="true"> *</span></span>
                              <select value={term.fieldId || ""} onChange={(event) => updateFormulaTerms(formulaTerms.map((currentTerm, currentIndex) => currentIndex === index ? { ...currentTerm, fieldId: event.target.value } : currentTerm))}>
                                <option value="">Seleccionar...</option>
                                {draft.columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="cs-forge-mini-btn cs-forge-mini-btn--ghost"
                              onClick={() => updateFormulaTerms(formulaTerms.filter((_, currentIndex) => currentIndex !== index))}
                              disabled={formulaTerms.length <= 2}
                              title={formulaTerms.length <= 2 ? "La fórmula necesita al menos 2 términos" : "Quitar término"}
                            >
                              <Trash2 size={14} /> Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="cs-forge-mini-btn" onClick={() => updateFormulaTerms(formulaTerms.concat({ operation: "add", fieldId: "" }))}>
                        <Plus size={14} /> Agregar operación
                      </button>
                    </article>
                  ) : null}
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="cs-forge-auto-stage">
                  {showColorRules ? (
                    <>
                      <article className="cs-forge-panel">
                        <h4>Condición</h4>
                        <div className="cs-forge-panel-grid">
                          <label className="cs-forge-control">
                            <span>Operador</span>
                            <select value={draft.colorOperator} onChange={(event) => onChange((current) => ({ ...current, colorOperator: event.target.value }))}>
                              {COLOR_RULE_OPERATORS.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                            </select>
                          </label>
                          {colorOperatorNeedsValue ? (
                            <label className="cs-forge-control">
                              <span>Valor</span>
                              {colorValueUsesBooleanSelect ? (
                                <select value={draft.colorValue || "Sí"} onChange={(event) => onChange((current) => ({ ...current, colorValue: event.target.value }))}>
                                  <option value="Sí">Sí</option>
                                  <option value="No">No</option>
                                </select>
                              ) : (
                                <input value={draft.colorValue} onChange={(event) => onChange((current) => ({ ...current, colorValue: event.target.value }))} placeholder={colorValuePlaceholder} />
                              )}
                              <small>{colorValueHelp}</small>
                            </label>
                          ) : (
                            <div className="cs-forge-auto-note">
                              <strong>Sin valor extra</strong>
                              <p>{colorValueHelp}</p>
                            </div>
                          )}
                        </div>
                      </article>

                      <article className="cs-forge-panel">
                        <h4>Colores de la celda</h4>
                        <div className="cs-forge-color-pickers">
                          <label className="cs-forge-control">
                            <span>Fondo</span>
                            <input type="color" value={draft.colorBg} onChange={(event) => onChange((current) => ({ ...current, colorBg: event.target.value }))} />
                          </label>
                          <label className="cs-forge-control">
                            <span>Texto</span>
                            <input type="color" value={draft.colorText} onChange={(event) => onChange((current) => ({ ...current, colorText: event.target.value }))} />
                          </label>
                        </div>
                      </article>
                    </>
                  ) : (
                    <article className="cs-forge-panel cs-forge-panel--warn">
                      <strong>Sin automatización de color</strong>
                      <p>Las fórmulas calculan valores; no aplican reglas de color desde aquí.</p>
                    </article>
                  )}
                </div>
              ) : null}
            </div>

            {currentStep > 0 ? (
              <aside className="cs-forge-preview-dock" aria-label="Vista previa">
                <span className="cs-forge-preview-kicker">Vista previa</span>
                {currentStep === 2 && showColorRules ? (
                  <>
                    <div className="cs-forge-ficha-preview">
                      <div className="cs-forge-ficha-section" style={{ background: draft.groupColor }}>
                        {previewSectionLabel}
                      </div>
                      <div className="cs-forge-ficha-row">
                        <span>{previewFieldLabel}</span>
                        <strong style={{ background: draft.colorBg, color: draft.colorText }}>Ejemplo</strong>
                      </div>
                    </div>
                    <p className="cs-forge-preview-caption">
                      Si <em>{colorOperatorLabel}</em>
                      {colorOperatorNeedsValue && draft.colorValue ? ` "${draft.colorValue}"` : ""}, la celda usará estos colores.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="cs-forge-ficha-preview">
                      <div className="cs-forge-ficha-section" style={{ background: draft.groupColor }}>
                        {previewSectionLabel}
                      </div>
                      <div className="cs-forge-ficha-row">
                        <span>{previewFieldLabel}</span>
                        <strong>{selectedTypeMeta?.label || "Valor"}</strong>
                      </div>
                    </div>
                    <p className="cs-forge-preview-caption">{selectedTypeMeta?.hint || selectedTypeUsage}</p>
                  </>
                )}
              </aside>
            ) : null}
          </div>
          </div>
        </div>
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
  _catalog = [],
  departmentOptions = [],
  currentUser,
  userMap,
  inventoryItems,
  contextoConstructor,
  boardOperationalContextOptions = [],
  boardComponentPresets = [],
  onApplyHelperComponents,
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
    renderBoardFieldLabel,
    sortBoardFieldsByColumnOrder,
    getAreaRoot,
    normalizeAreaOption,
  } = contextoConstructor;

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [accessMenuOpen, setAccessMenuOpen] = useState(false);
  const [builderTab, setBuilderTab] = useState("base");
  const [baseTemplatesCollapsed, setBaseTemplatesCollapsed] = useState(true);
  const [accessSearch, setAccessSearch] = useState("");
  const [finishGateUserSearch, setFinishGateUserSearch] = useState("");
  const [finishGateMenuOpen, setFinishGateMenuOpen] = useState(false);
  const [pendingAccessUserIds, setPendingAccessUserIds] = useState([]);
  const [draggingColumnToken, setDraggingColumnToken] = useState("");
  const [draggingSlotId, setDraggingSlotId] = useState("");
  const [draggingLineKey, setDraggingLineKey] = useState("");
  const [layoutBlockFeedback, setLayoutBlockFeedback] = useState("");
  const [resizingToken, setResizingToken] = useState("");
  const actionMenuRef = useRef(null);
  const accessMenuRef = useRef(null);
  const finishGateMenuRef = useRef(null);
  const templateSearchInputRef = useRef(null);
  const resizeStateRef = useRef({ kind: "", id: "", startX: 0, startWidth: 0 });
  const draggingColumnTokenRef = useRef("");
  const previewRows = previewBoard?.rows?.slice(0, 2) || [];
  const orderedPreviewColumns = getOrderedBoardColumns(previewBoard || { fields: draft.columns, settings: draft.settings }, true);
  const normalizeRoleKey = (label) => String(label || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const initialsFromLabel = (label) => {
    const parts = String(label || "?").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0][0] || "?").toUpperCase();
  };
  const getPreviewUserAvatarUrl = (user) => {
    const avatarValue = String(
      user?.photoThumbnailUrl || user?.photoThumbnail || user?.photo || user?.avatarUrl || user?.avatar || user?.imageUrl || user?.profileImage || "",
    ).trim();
    const lowered = avatarValue.toLowerCase();
    if (!avatarValue || ["null", "undefined", "nan", "[object object]"].includes(lowered)) return "";
    return avatarValue;
  };
  const previewStatusPillClass = (status) => (status === STATUS_RUNNING ? "running" : status === "Pausado" ? "paused" : status === "Terminado" ? "finished" : "pending");
  const cleaningCardLayout = getCleaningCardLayout(draft?.settings || previewBoard?.settings || {});
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
  const getPreviewColumnWidthPx = (column) => {
    if (column.kind === "field") {
      const manualWidth = Number(column.field?.widthPx || 0);
      const typeMinimum = fieldTypeMinWidths[column.field?.type] || 120;
      if (Number.isFinite(manualWidth) && manualWidth >= 90) return Math.max(typeMinimum, Math.round(manualWidth));
      return typeMinimum;
    }
    return auxMinWidths[column.id] || defaultAuxWidths[column.id] || 120;
  };
  const previewLineLayout = buildBoardCardLineLayout(
    cleaningCardLayout,
    orderedPreviewColumns,
    getPreviewColumnWidthPx,
  );
  const showPreviewSectionRow = shouldShowBoardCardSectionRow(previewLineLayout.lineItems, orderedPreviewColumns);
  const previewSectionGroups = useMemo(
    () => buildBoardCardSectionHeaderGroups(
      previewLineLayout.lineItems,
      previewLineLayout.widths,
      (lineItem) => resolveBoardCardLineItemHeaderMeta(lineItem, orderedPreviewColumns),
    ),
    [previewLineLayout.lineItems, previewLineLayout.widths, orderedPreviewColumns],
  );
  const buildPreviewFichaRoles = (row) => {
    const roles = { extras: [], cellsByToken: {} };
    orderedPreviewColumns.forEach((column) => {
      let value = "";
      if (column.kind === "field") {
        value = formatBoardPreviewValue(row.values?.[column.field.id], column.field, userMap, inventoryItems);
      } else if (column.id === "assignee") {
        value = getPreviewAssigneeLabel(row);
        roles.player = value;
      } else if (column.id === "status") {
        roles.status = row.status || STATUS_PENDING;
        value = roles.status;
      } else if (column.id === "time") {
        roles.time = row.accumulatedSeconds ? `${Math.round(row.accumulatedSeconds / 60)} min` : "00:00:00";
        value = roles.time;
      } else if (column.id === "totalTime") {
        roles.totalTime = "00:00:00";
        value = roles.totalTime;
      } else if (column.id === "efficiency") {
        roles.efficiency = "—";
        value = roles.efficiency;
      }

      const role = resolveBoardCardCellRole(column, orderedPreviewColumns);
      if (role === "activity") roles.activity = value || roles.activity;
      else if (role === "finishGate") roles.finishGate = value || "No";
      else if (role === "date") roles.date = value;
      else if (role === "lot") roles.lot = value;
      else if (role === "expiry") roles.expiry = value;
      else if (role === "labelTag") roles.labelTag = value;
      else if (role === "laboratory") roles.laboratory = value;
      else if (role === "start") roles.start = value;
      else if (role === "end") roles.end = value;
      else if (role === "field" && String(value || "").trim()) {
        roles.extras.push({
          label: column.field?.label || "",
          value,
          token: column.token,
        });
      }

      const label = column.kind === "field" ? String(column.field?.label || "") : String(column.label || "");
      roles.cellsByToken[column.token] = { label, value };
    });
    if (!roles.date) {
      const previewDateKey = row?.values?.[orderedPreviewColumns.find((column) => column.kind === "field" && column.field?.type === "date")?.field?.id]
        || new Date().toISOString().slice(0, 10);
      roles.date = formatBoardOperationalDateLabel(String(previewDateKey).slice(0, 10));
    }
    return roles;
  };
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
  const finishGateField = findBoardFinishGateField(draft.columns || []);
  const finishGateAuthorizedUserIds = normalizeFinishGateAuthorizedUserIds(draft.settings?.finishGateAuthorizedUserIds);
  const finishGateUsersLabel = finishGateAuthorizedUserIds.length
    ? `${finishGateAuthorizedUserIds.length} player(s) autorizado(s)`
    : "Lead y dueño del tablero (por defecto)";
  const filteredFinishGateUsers = activeUsers.filter((user) => user.name.toLowerCase().includes(finishGateUserSearch.trim().toLowerCase()));
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

  function getPreviewAssigneeUser(row) {
    const responsibleIds = Array.from(new Set((Array.isArray(row?.responsibleIds) ? row.responsibleIds : [])
      .map((userId) => String(userId || "").trim())
      .filter(Boolean)));
    const fallbackResponsibleId = String(row?.responsibleId || "").trim();
    const primaryId = responsibleIds[0] || fallbackResponsibleId;
    return primaryId ? userMap.get(primaryId) : currentUser;
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
    if (!layoutBlockFeedback) return undefined;
    const timer = globalThis.setTimeout(() => setLayoutBlockFeedback(""), 3200);
    return () => globalThis.clearTimeout(timer);
  }, [layoutBlockFeedback]);

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
    if (!finishGateMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!finishGateMenuRef.current?.contains(event.target)) {
        setFinishGateMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [finishGateMenuOpen]);

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

  function handlePreviewColumnDrop(targetToken, fromTokenOverride = "") {
    const fromToken = fromTokenOverride || draggingColumnTokenRef.current || draggingColumnToken;
    if (!fromToken || !targetToken || fromToken === targetToken) return;
    onChange((current) => {
      const currentOrder = getNormalizedBoardColumnOrder({ fields: current.columns || [], settings: current.settings || {} });
      const nextOrder = reorderBoardColumnOrderTokens(fromToken, targetToken, currentOrder);
      const nextDraft = {
        ...current,
        columns: sortBoardFieldsByColumnOrder(current.columns || [], nextOrder),
        settings: {
          ...current.settings,
          columnOrder: nextOrder,
        },
      };
      const layout = getCleaningCardLayout(nextDraft.settings);
      if (!layout.lineItemOrder.length) return nextDraft;
      return reorderBoardCardLineItems(
        nextDraft,
        `col:${fromToken}`,
        `col:${targetToken}`,
        buildBoardCardLineLayout(
          layout,
          getOrderedBoardColumns({ fields: nextDraft.columns, settings: nextDraft.settings }, true),
          getPreviewColumnWidthPx,
        ).lineItems,
      );
    });
    draggingColumnTokenRef.current = "";
    setDraggingColumnToken("");
  }

  function resolveFieldColumnToken(fieldId) {
    return orderedPreviewColumns.find((column) => column.kind === "field" && column.field?.id === fieldId)?.token || "";
  }

  function startFieldColumnDrag(fieldId, event) {
    const token = resolveFieldColumnToken(fieldId);
    if (!token || !event?.dataTransfer) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", token);
    draggingColumnTokenRef.current = token;
    setDraggingColumnToken(token);
  }

  function finishFieldColumnDrag() {
    draggingColumnTokenRef.current = "";
    setDraggingColumnToken("");
  }

  function handleAddLayoutBlock(blockType) {
    let feedbackMessage = "";
    onChange((current) => {
      const result = applyCleaningLayoutBlock(current, blockType);
      feedbackMessage = getCleaningLayoutBlockFeedbackMessage(result.feedbackKey, blockType);
      return result.draft;
    });
    setLayoutBlockFeedback(feedbackMessage);
    const blockMeta = CLEANING_LAYOUT_BLOCK_TYPES.find((block) => block.value === blockType);
    if (blockMeta?.slotId) {
      globalThis.requestAnimationFrame(() => {
        document.querySelector(`[data-cleaning-slot="${blockMeta.slotId}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  function handleSlotDrop(targetSlotId) {
    const fromSlotId = draggingSlotId;
    if (!fromSlotId || !targetSlotId || fromSlotId === targetSlotId) return;
    onChange((current) => reorderCleaningCardLayoutSlots(current, fromSlotId, targetSlotId));
    setDraggingSlotId("");
  }

  function getLineItemKey(lineItem) {
    if (!lineItem) return "";
    return lineItem.kind === "slot" ? `slot:${lineItem.slotId}` : `col:${lineItem.column.token}`;
  }

  function handlePreviewLineHeaderDrop(targetLineItem) {
    const fromKey = draggingLineKey;
    const toKey = getLineItemKey(targetLineItem);
    if (!fromKey || !toKey || fromKey === toKey) return;
    onChange((current) => reorderBoardCardLineItems(
      current,
      fromKey,
      toKey,
      buildBoardCardLineLayout(
        getCleaningCardLayout(current.settings),
        getOrderedBoardColumns({ fields: current.columns, settings: current.settings }, true),
        getPreviewColumnWidthPx,
      ).lineItems,
    ));
    setDraggingLineKey("");
    setLayoutBlockFeedback("Orden de la ficha actualizado.");
  }

  function handleAssignFieldLayoutRole(fieldId, role) {
    onChange((current) => assignBoardFieldLayoutRole(current, fieldId, role));
    setLayoutBlockFeedback(role
      ? `Campo mezclado en bloque «${getBoardFieldLayoutRoleOptions().find((option) => option.value === role)?.label || role}».`
      : "Campo devuelto a la línea de la ficha.");
  }

  function handleToggleCleaningSlot(slotId) {
    const isHidden = cleaningCardLayout.hiddenSlots.includes(slotId);
    onChange((current) => toggleCleaningCardSlotVisibility(current, slotId, isHidden));
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

  function renderDraftFieldChip(field) {
    const typeOption = BOARD_FIELD_TYPES.find((t) => t.value === field.type);
    const typeLabel = typeOption?.label || field.type || "Campo";
    const currentLayoutRole = String(field.layoutBlockRole || "").trim();
    const columnToken = resolveFieldColumnToken(field.id);
    const isInlineField = Boolean(columnToken) && !currentLayoutRole;
    const isDraggingField = draggingColumnToken === columnToken;
    const formulaDetail = field.type === "formula"
      ? getDraftFormulaTerms(field)
        .map((term, index) => {
          const termLabel = (draft.columns || []).find((candidate) => candidate.id === term.fieldId)?.label || "";
          if (!termLabel) return "";
          return index === 0 ? termLabel : `${getFormulaOperationSymbol(term.operation || "add")} ${termLabel}`;
        })
        .filter(Boolean)
        .join(" ")
      : null;
    return (
      <article
        key={field.id}
        className={`board-inline-component-chip board-inline-component-chip--builder${isDraggingField ? " dragging" : ""}`}
        draggable={isInlineField}
        onDragStart={(event) => startFieldColumnDrag(field.id, event)}
        onDragEnd={finishFieldColumnDrag}
        onDragOver={(event) => {
          if (!isInlineField) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          handlePreviewColumnDrop(resolveFieldColumnToken(field.id));
        }}
      >
        <div className="board-inline-component-chip-head">
          {isInlineField ? (
            <span className="board-inline-component-grip" aria-hidden="true" title="Arrastra para reordenar">
              <GripVertical size={14} />
            </span>
          ) : null}
          <div className="board-inline-component-chip-title">
            <span className="chip primary board-inline-component-label">{field.label}</span>
            <span className="board-inline-component-type">{typeLabel}</span>
          </div>
        </div>
        {formulaDetail ? (
          <span className="board-inline-component-formula">{formulaDetail}</span>
        ) : null}
        {currentLayoutRole === "finishGate" ? (
          <div className="board-finish-gate-field-editors">
            <span className="board-field-mix-label">Players autorizados (campo)</span>
            <div className="board-finish-gate-field-editor-list">
              {activeUsers.map((user) => {
                const checked = Array.isArray(field.finishGateEditorUserIds)
                  && field.finishGateEditorUserIds.includes(user.id);
                return (
                  <label key={user.id} className={`board-finish-gate-field-editor-option${checked ? " is-selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onChange((current) => toggleFinishGateFieldEditorUser(current, field.id, user.id))}
                    />
                    <span>{user.name}</span>
                  </label>
                );
              })}
            </div>
            <p className="board-assignment-hint">Opcional: restringe este switch solo a estos players. Si queda vacío, usa la lista del tablero.</p>
          </div>
        ) : null}
        <div className="board-inline-component-chip-foot">
          <label className="board-field-mix-control">
            <span className="board-field-mix-label">Mezclar</span>
            <select
              value={currentLayoutRole}
              onChange={(event) => handleAssignFieldLayoutRole(field.id, event.target.value)}
              title="Mezclar este campo dentro de un bloque compuesto de la ficha"
            >
              {getBoardFieldLayoutRoleOptions().map((option) => (
                <option key={option.value || "inline"} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="board-inline-component-chip-actions">
            <button type="button" className="icon-button" onClick={() => onEditDraftColumn(field.id)}><Pencil size={13} /></button>
            <button type="button" className="icon-button danger" onClick={() => onRemoveDraftColumn(field.id)}><Trash2 size={13} /></button>
          </div>
        </div>
      </article>
    );
  }

  const cleaningFieldGroups = getCleaningBoardFieldGroups(draft);

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
                    <span>Pie de ficha · visible para operadores</span>
                  </div>
                  <button type="button" className={draft.settings.showTotalTime !== false ? "switch-button on" : "switch-button"} aria-label="Alternar acumulado en pie de ficha" aria-pressed={draft.settings.showTotalTime !== false} onClick={() => onChange((current) => ({ ...current, settings: { ...current.settings, showTotalTime: current.settings.showTotalTime === false } }))}>
                    <span className="switch-thumb" />
                  </button>
                </div>
                <div className="builder-card compact-builder-card board-builder-switch-row">
                  <div>
                    <strong>Eficiencia</strong>
                    <span>Pie de ficha · visible para operadores</span>
                  </div>
                  <button type="button" className={draft.settings.showEfficiency !== false ? "switch-button on" : "switch-button"} aria-label="Alternar eficiencia en pie de ficha" aria-pressed={draft.settings.showEfficiency !== false} onClick={() => onChange((current) => ({ ...current, settings: { ...current.settings, showEfficiency: current.settings.showEfficiency === false } }))}>
                    <span className="switch-thumb" />
                  </button>
                </div>
              </div>

              <div className="builder-card compact-builder-card board-finish-gate-builder-panel">
                <div className="board-finish-gate-builder-head">
                  <div>
                    <strong>Switch de finalización</strong>
                    <span>Bloquea finalizar la fila hasta activarlo. Define quién puede encenderlo.</span>
                  </div>
                  <BoardActivityFinishGateSwitch
                    enabled={Boolean(finishGateField)}
                    disabled
                    label={finishGateField?.label || "¿Se terminó la actividad?"}
                    compact
                  />
                </div>

                {finishGateField ? (
                  <>
                    <p className="board-finish-gate-builder-field">
                      Campo vinculado: <strong>{finishGateField.label}</strong>
                    </p>
                    <div className="board-access-selector" ref={finishGateMenuRef}>
                      <button
                        type="button"
                        className="board-access-trigger"
                        onClick={() => setFinishGateMenuOpen((current) => !current)}
                        aria-expanded={finishGateMenuOpen}
                      >
                        <span>{finishGateUsersLabel}</span>
                        <ArrowDown size={16} />
                      </button>
                      {finishGateMenuOpen ? (
                        <div className="board-access-dropdown">
                          <label className="app-modal-field board-access-search-field">
                            <span>Players que pueden activar el switch</span>
                            <input
                              value={finishGateUserSearch}
                              onChange={(event) => setFinishGateUserSearch(event.target.value)}
                              placeholder="Buscar player"
                            />
                          </label>
                          <p className="board-assignment-hint">
                            Si no seleccionas a nadie, solo el Lead y el dueño del tablero podrán activarlo.
                          </p>
                          <div className="board-access-list">
                            {filteredFinishGateUsers.length ? filteredFinishGateUsers.map((user) => {
                              const checked = finishGateAuthorizedUserIds.includes(user.id);
                              return (
                                <label key={user.id} className={`board-access-option${checked ? " is-selected" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => onChange((current) => toggleFinishGateAuthorizedUser(current, user.id))}
                                  />
                                  <span>{user.name}</span>
                                </label>
                              );
                            }) : <span className="board-assignment-hint">No hay players activos para mostrar.</span>}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {finishGateAuthorizedUserIds.length ? (
                      <div className="board-finish-gate-builder-chips">
                        {finishGateAuthorizedUserIds.map((userId) => {
                          const userName = userMap.get(userId)?.name || userId;
                          return <span key={userId} className="chip soft">{userName}</span>;
                        })}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="board-finish-gate-builder-empty">
                    <p className="board-assignment-hint">
                      Aún no hay un campo de switch en este tablero. Agrégalo para exigir confirmación antes de finalizar actividades.
                    </p>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => onChange((current) => appendFinishGateFieldToBoardDraft(current))}
                    >
                      Agregar switch de finalización
                    </button>
                  </div>
                )}
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
            <BoardComponentHelperPanel
              savedPresets={boardComponentPresets}
              onApply={onApplyHelperComponents}
              disabled={!onApplyHelperComponents}
              onAddManualComponent={onOpenComponentStudio}
            />
            <div className="board-cleaning-layout-editor board-cleaning-layout-editor--split">
              <section className="board-mix-components-panel board-mix-components-panel--compact">
                <div className="board-mix-components-head">
                  <div>
                    <h4 className="board-mix-components-title">Mezclar componentes</h4>
                    <p className="subtle-line board-mix-components-hint">
                      Botones + para bloques. Arrastra los encabezados del preview para reordenar la ficha.
                    </p>
                  </div>
                  <div className="board-mix-components-head-actions">
                    <button type="button" className="chip primary board-cleaning-add-field-btn" onClick={onOpenComponentStudio}>
                      <Plus size={13} /> Agregar componente
                    </button>
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
                <div className="board-cleaning-layout-add-section">
                  <span className="board-cleaning-layout-add-label">Bloques compuestos</span>
                  <div className="board-cleaning-layout-add">
                    {CLEANING_LAYOUT_BLOCK_TYPES.map((block) => {
                      const isActive = isCleaningLayoutBlockActive(draft, block.value);
                      return (
                        <button
                          key={block.value}
                          type="button"
                          className={`chip primary board-cleaning-layout-add-btn board-mix-block-btn${isActive ? " is-active" : ""}`}
                          onClick={() => handleAddLayoutBlock(block.value)}
                          title={isActive ? `${block.label} ya está en la ficha` : `Agregar ${block.label}`}
                          aria-pressed={isActive}
                        >
                          {isActive ? <Check size={14} /> : <Plus size={14} />}
                          {block.label}
                        </button>
                      );
                    })}
                  </div>
                  {layoutBlockFeedback ? (
                    <p className="board-cleaning-layout-feedback" role="status" aria-live="polite">{layoutBlockFeedback}</p>
                  ) : null}
                </div>
              </section>

              <div className="board-builder-preview-hero">
                <div className="board-preview-fichas-head">
                  <span className="board-preview-fichas-title">Vista final · encabezados + ficha</span>
                  <span className="board-preview-fichas-hint">
                    Sujeta y arrastra cada encabezado para cambiar el orden. Los colores de sección son los del tablero.
                  </span>
                </div>

                <div
                  className="board-builder-ficha-preview-wrap"
                  style={previewLineLayout.gridTemplateColumns
                    ? { "--cleaning-grid-cols": previewLineLayout.gridTemplateColumns }
                    : undefined}
                >
                  <div className="board-builder-ficha-preview board-cards-view">
                    <div className="cleaning-cards-thead">
                      {showPreviewSectionRow ? (
                      <div className="cleaning-cards-section-row">
                        {previewSectionGroups.map((group, groupIndex) => (
                          <div
                            key={`section-group-${groupIndex}-${group.sectionKey}`}
                            className={`cleaning-slot-section-cell board-section-header-cell${group.span > 1 ? " is-group-span" : ""}`}
                            style={{
                              gridColumn: `span ${group.span}`,
                              backgroundColor: group.color,
                            }}
                            title={group.sectionName}
                          >
                            {group.sectionName}
                          </div>
                        ))}
                      </div>
                      ) : null}
                      <div className="cleaning-cards-header-row">
                        {previewLineLayout.lineItems.map((lineItem, lineIndex) => {
                          const headerMeta = resolveBoardCardLineItemHeaderMeta(lineItem, orderedPreviewColumns);
                          const lineWidth = previewLineLayout.widths[lineIndex];
                          const lineKey = getLineItemKey(lineItem);
                          const isDragging = draggingLineKey === lineKey;
                          return (
                            <div
                              key={`head-${lineKey}`}
                              className={`cleaning-slot-header-cell board-builder-line-header${isDragging ? " dragging" : ""}${draggingLineKey && draggingLineKey !== lineKey ? " drop-target" : ""}`}
                              style={{
                                ...(lineWidth ? { minWidth: `${lineWidth}px`, width: `${lineWidth}px` } : {}),
                                "--cleaning-slot-accent": headerMeta.color,
                              }}
                              title={`${headerMeta.description || headerMeta.label} · Arrastra para reordenar`}
                              draggable
                              onDragStart={(event) => {
                                if (!event.dataTransfer) return;
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", lineKey);
                                setDraggingLineKey(lineKey);
                              }}
                              onDragEnd={() => setDraggingLineKey("")}
                              onDragOver={(event) => {
                                event.preventDefault();
                                if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                handlePreviewLineHeaderDrop(lineItem);
                              }}
                            >
                              <span className="board-builder-line-header-label">{headerMeta.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="board-builder-ficha-preview-body">
                      {(previewRows.length ? previewRows : [null]).slice(0, 1).map((row, idx) => {
                      const roles = row
                        ? buildPreviewFichaRoles(row)
                        : { status: STATUS_PENDING, activity: "Referencia de ejemplo", date: "24/06/2026", extras: [], cellsByToken: {} };
                      const status = roles.status || STATUS_PENDING;
                      const playerLabel = roles.player && !/^(sin |asignar)/i.test(roles.player) ? roles.player : "";
                      const previewResponsibleIds = row
                        ? Array.from(new Set((Array.isArray(row.responsibleIds) ? row.responsibleIds : [])
                          .map((userId) => String(userId || "").trim())
                          .filter(Boolean)))
                        : [];
                      if (row && !previewResponsibleIds.length && String(row.responsibleId || "").trim()) {
                        previewResponsibleIds.push(String(row.responsibleId).trim());
                      }
                      const showGroupPlayerIcon = previewResponsibleIds.length > 1;
                      const previewUser = row ? getPreviewAssigneeUser(row) : null;
                      const avatarUrl = previewUser ? getPreviewUserAvatarUrl(previewUser) : "";
                      const avatarInitials = initialsFromLabel(previewUser?.name || playerLabel);
                      const renderPreviewSlot = (slotId, orderIndex) => {
                        if (slotId === "info") {
                          return (
                            <div className="cleaning-card-info cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              <div className="cleaning-card-title">{roles.activity || "Referencia"}</div>
                              {roles.date ? <div className="cleaning-card-date">{roles.date}</div> : null}
                            </div>
                          );
                        }
                        if (slotId === "player") {
                          return (
                            <div className="cleaning-card-player cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              <span
                                className={`board-assignee-trigger has-cleaning-avatar${playerLabel ? "" : " is-disabled"}${showGroupPlayerIcon ? " is-group-players" : ""}`}
                                data-assigned={playerLabel ? "1" : "0"}
                                title={playerLabel || undefined}
                              >
                                <span className={`board-assignee-avatar${showGroupPlayerIcon ? " is-group-icon" : ""}`} aria-hidden="true">
                                  {showGroupPlayerIcon ? (
                                    <Users className="board-assignee-avatar-group-icon" strokeWidth={2.2} aria-hidden="true" />
                                  ) : (
                                    <>
                                      {avatarUrl ? <img src={avatarUrl} alt="" className="board-assignee-avatar-image" /> : null}
                                      {!avatarUrl ? <span className="board-assignee-avatar-fallback">{avatarInitials}</span> : null}
                                    </>
                                  )}
                                </span>
                                <span className="board-assignee-trigger-label">{playerLabel || "Asignar player(s)"}</span>
                              </span>
                            </div>
                          );
                        }
                        if (slotId === "timeline") {
                          return (
                            <div className="cleaning-card-timeline cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              <div className="tl-point tl-point--start">
                                <span className="tl-cap">Inicio</span>
                                <div className="tl-time">{roles.start || "--:--"}</div>
                              </div>
                              <div className="tl-track" aria-hidden="true"><span className="tl-fill" /></div>
                              <div className="tl-point tl-point--end">
                                <span className="tl-cap">Fin</span>
                                <div className="tl-time">{roles.end || "--:--"}</div>
                              </div>
                              {roles.time ? <div className="tl-duration">{roles.time}</div> : null}
                            </div>
                          );
                        }
                        if (slotId === "status") {
                          return (
                            <div className="cleaning-card-status cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              <span className={`board-status-pill ${previewStatusPillClass(status)}`}>{status}</span>
                            </div>
                          );
                        }
                        if (slotId === "actions") {
                          return (
                            <div className="cleaning-card-actions cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              {roles.finishGate !== undefined ? (
                                <div className="cleaning-card-finish-gate">
                                  <BoardActivityFinishGateSwitch
                                    enabled={String(roles.finishGate || "").toLowerCase() === "si"}
                                    disabled
                                    label={finishGateField?.label || "¿Se terminó la actividad?"}
                                    compact
                                  />
                                </div>
                              ) : null}
                              <div className="board-workflow-actions">
                                <span className="board-action-button start icon-only" aria-hidden="true"><Play size={16} strokeWidth={2.5} /></span>
                                <span className="board-action-button pause icon-only" aria-hidden="true"><PauseCircle size={16} strokeWidth={2.5} /></span>
                                <span className="board-action-button finish icon-only" aria-hidden="true"><Square size={16} strokeWidth={2.5} /></span>
                              </div>
                            </div>
                          );
                        }
                        if (slotId === "lotExpiry") {
                          if (!roles.lot && !roles.expiry) return null;
                          return (
                            <div className="cleaning-card-lot-expiry cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              {roles.lot ? <div className="cleaning-card-lot">{roles.lot}</div> : null}
                              {roles.expiry ? <div className="cleaning-card-expiry">{roles.expiry}</div> : null}
                            </div>
                          );
                        }
                        if (slotId === "labelLab") {
                          if (!roles.labelTag && !roles.laboratory) return null;
                          return (
                            <div className="cleaning-card-label-lab cleaning-card-slot" data-slot={slotId} style={{ order: orderIndex }} key={slotId}>
                              {roles.labelTag ? <div className="cleaning-card-label-tag">{roles.labelTag}</div> : null}
                              {roles.laboratory ? <div className="cleaning-card-laboratory">{roles.laboratory}</div> : null}
                            </div>
                          );
                        }
                        return null;
                      };
                      const renderPreviewColumn = (lineItem, orderIndex) => {
                        const cell = roles.cellsByToken?.[lineItem.column.token];
                        if (!cell) return null;
                        return (
                          <div
                            className="cleaning-card-field-slot cleaning-card-slot"
                            data-slot="meta"
                            data-column-token={lineItem.column.token}
                            style={{ order: orderIndex }}
                            key={`preview-col-${lineItem.column.token}`}
                          >
                            <div className="cleaning-field-inline" data-label={cell.label}>
                              <span className="subtle-line">{cell.value || "—"}</span>
                            </div>
                          </div>
                        );
                      };
                      return (
                        <div key={row?.id || `ficha-demo-${idx}`} className="cleaning-card-row board-builder-ficha-preview-row" data-status={status}>
                          <div className="cleaning-card-host">
                            <div className="cleaning-card cleaning-card--preview" data-status={status}>
                              <span className="cleaning-card-rail" aria-hidden="true" />
                              <div className="cleaning-card-scroll">
                                <div
                                  className="cleaning-card-body cleaning-card-body--single-line"
                                  style={previewLineLayout.gridTemplateColumns
                                    ? { gridTemplateColumns: previewLineLayout.gridTemplateColumns }
                                    : undefined}
                                >
                                  {previewLineLayout.lineItems.map((lineItem, orderIndex) => (
                                    lineItem.kind === "slot"
                                      ? renderPreviewSlot(lineItem.slotId, orderIndex)
                                      : renderPreviewColumn(lineItem, orderIndex)
                                  ))}
                                </div>
                                {(draft.settings.showTotalTime !== false && roles.totalTime)
                                || (draft.settings.showEfficiency !== false && roles.efficiency) ? (
                                  <div className="cleaning-card-meta">
                                    {draft.settings.showTotalTime !== false && roles.totalTime ? (
                                      <div className="cleaning-meta-chip" data-label="Acumulado">{roles.totalTime}</div>
                                    ) : null}
                                    {draft.settings.showEfficiency !== false && roles.efficiency ? (
                                      <div className="cleaning-meta-chip" data-label="Eficiencia">{roles.efficiency}</div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>

              <div className="board-cleaning-slot-palette board-cleaning-slot-palette--compact">
                <span className="board-cleaning-layout-add-label">Bloques · arrastra</span>
                {cleaningCardLayout.slotOrder.map((slotId) => {
                  const slotDef = CLEANING_CARD_SLOT_DEFINITIONS[slotId];
                  const hidden = cleaningCardLayout.hiddenSlots.includes(slotId);
                  return (
                    <div
                      key={slotId}
                      data-cleaning-slot={slotId}
                      className={`board-cleaning-slot-chip board-cleaning-slot-chip--compact${hidden ? " is-hidden" : ""}${draggingSlotId === slotId ? " dragging" : ""}`}
                      draggable={!hidden}
                      onDragStart={() => setDraggingSlotId(slotId)}
                      onDragEnd={() => setDraggingSlotId("")}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleSlotDrop(slotId);
                      }}
                    >
                      <GripVertical size={12} aria-hidden="true" />
                      <strong>{slotDef?.label || slotId}</strong>
                      <button type="button" className="icon-button" onClick={() => handleToggleCleaningSlot(slotId)}>
                        {hidden ? "Mostrar" : "Ocultar"}
                      </button>
                    </div>
                  );
                })}
              </div>
              </div>

              {!draft.columns.length ? (
                <div className="builder-preview-empty board-cleaning-preview-empty">
                  <LayoutDashboard size={32} />
                  <div>
                    <strong>Agrega bloques o campos para armar la ficha</strong>
                    <p>Usa «Mezclar componentes» arriba o agrega un campo individual abajo.</p>
                  </div>
                  <button type="button" className="primary-button" onClick={onOpenComponentStudio}>
                    <Plus size={15} /> Agregar primer campo
                  </button>
                </div>
              ) : null}

              <div className="board-builder-fields-scroll">
            <section className="board-inline-components">
              <div className="builder-section-head board-builder-section-head">
                <div>
                  <h4>Campos por bloque</h4>
                  <p className="subtle-line board-cleaning-fields-help">
                    Campos en <strong>3 columnas</strong>. Arrastra ⋮⋮ para reordenar columnas en línea. Selector <strong>Mezclar</strong> para meter en bloques.
                  </p>
                </div>
                <div className="board-inline-components-head-actions">
                  <button type="button" className="chip primary board-cleaning-add-field-btn" onClick={onOpenComponentStudio}>
                    <Plus size={13} /> Campo individual
                  </button>
                  <span className="chip primary">{draft.columns.length} componente(s)</span>
                </div>
              </div>
              <div className="board-cleaning-field-groups">
                {cleaningFieldGroups.map((group) => (
                    <article
                      key={group.key}
                      className={`board-cleaning-field-group${group.hidden ? " is-hidden" : ""}`}
                      data-cleaning-slot={group.slotId}
                    >
                      <header className="board-cleaning-field-group-head">
                        <div>
                          <strong>{group.label}</strong>
                          <span className="subtle-line">{group.hidden ? "Oculto en la ficha" : "Visible en la ficha"}</span>
                        </div>
                        <button type="button" className="icon-button" onClick={() => handleToggleCleaningSlot(group.slotId)}>
                          {group.hidden ? "Mostrar bloque" : "Ocultar bloque"}
                        </button>
                      </header>
                      <div className="board-cleaning-field-group-items board-builder-field-grid">
                        {group.kind === "aux" ? (
                          (group.auxItems || []).map((auxItem) => (
                            <article key={auxItem.id} className="board-inline-component-chip is-system">
                              <div className="board-inline-component-main">
                                <span className="chip board-inline-component-label">{auxItem.label}</span>
                                <span className="board-inline-component-type">Columna del sistema</span>
                              </div>
                            </article>
                          ))
                        ) : null}
                        {group.kind === "meta" ? (
                          <>
                            {(group.auxItems || []).map((auxItem) => (
                              <article key={auxItem.id} className="board-inline-component-chip is-system">
                                <div className="board-inline-component-main">
                                  <span className="chip board-inline-component-label">{auxItem.label}</span>
                                  <span className="board-inline-component-type">Columna del sistema</span>
                                </div>
                              </article>
                            ))}
                            {(group.fields || []).map((field) => renderDraftFieldChip(field))}
                          </>
                        ) : null}
                        {group.kind === "fields" ? (
                          group.fields.length
                            ? group.fields.map((field) => renderDraftFieldChip(field))
                            : (
                              <p className="subtle-line board-cleaning-field-group-empty">
                                Sin campos aún. Pulsa + {group.label} arriba para crearlos.
                              </p>
                            )
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
            </section>
              </div>
            </div>
          </div>
        </aside>
        ) : null}
        </div>
      </div>
    </Modal>
  );
}
