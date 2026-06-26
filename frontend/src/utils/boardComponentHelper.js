import {
  BOARD_ACTIVITY_LIST_FIELD,
  INVENTORY_LOOKUP_LOGISTICS_FIELD,
  MAINTENANCE_INVENTORY_LOOKUP_FIELD,
} from "./constantes.js";
import { buildInventoryBundleFields } from "./utilidades.jsx";

function makeHelperId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const INTENT_RULES = [
  { type: "date", keywords: ["fecha", "dia", "calendario", "vencimiento", "caducidad", "corte"], defaultLabel: "Fecha" },
  { type: "time", keywords: ["hora", "horario", "inicio", "fin", "turno"], defaultLabel: "Hora" },
  { type: "duration", keywords: ["duracion", "tiempo total", "hh:mm"], defaultLabel: "Duracion" },
  { type: INVENTORY_LOOKUP_LOGISTICS_FIELD, keywords: ["empaque", "piezas por caja", "cajas por tarima", "logistica"], defaultLabel: "Producto con empaque" },
  { type: "inventoryLookup", keywords: ["buscador", "inventario", "sku", "producto", "articulo", "material"], defaultLabel: "Producto" },
  { type: MAINTENANCE_INVENTORY_LOOKUP_FIELD, keywords: ["insumo", "mantenimiento", "refaccion"], defaultLabel: "Insumo" },
  { type: "inventoryProperty", keywords: ["lote", "nombre producto", "presentacion", "codigo derivado"], defaultLabel: "Dato de inventario", inventoryProperty: "lot" },
  { type: "evidenceGallery", keywords: ["evidencia", "foto", "fotos", "imagen", "video", "galeria"], defaultLabel: "Evidencias" },
  { type: "multiSelectDetail", keywords: ["multi", "causal", "causales", "detalle multiple"], defaultLabel: "Seleccion con detalle" },
  { type: "select", keywords: ["menu", "desplegable", "opciones", "estatus", "estado", "prioridad", "turno", "estacion"], defaultLabel: "Seleccion" },
  { type: "formula", keywords: ["formula", "calculo", "total", "suma"], defaultLabel: "Total calculado" },
  { type: BOARD_ACTIVITY_LIST_FIELD, keywords: ["actividades", "lista de actividades", "checklist", "lista actividad"], defaultLabel: "Actividades" },
  { type: "number", keywords: ["numero", "piezas", "cajas", "cantidad", "conteo", "tarimas", "pallets"], defaultLabel: "Cantidad" },
  { type: "textarea", keywords: ["notas", "observaciones", "comentario largo", "detalle", "descripcion larga"], defaultLabel: "Observaciones" },
  { type: "text", keywords: ["texto", "folio", "tarima", "comentario", "nombre", "codigo", "referencia"], defaultLabel: "Texto" },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitDescriptionSegments(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  // Texto largo en lenguaje natural: no partir en fragmentos (evita labels absurdos).
  if (raw.length > 80) return [];

  const hasStructuredSeparators = /[\n;]|(?:\d+[\).\-\s]+)/.test(raw)
    || (/,/.test(raw) && raw.split(",").filter((part) => part.trim().length > 2).length > 1);
  if (!hasStructuredSeparators) return [raw];

  return raw
    .split(/\n+|(?:,\s*)|(?:;\s*)|(?:\d+[\).\-\s]+)/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function includesAny(text, keywords) {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function buildWarehouseBoxControlPlan(description) {
  const hasScan = includesAny(description, ["escane", "escan", "codigo de barras", "barcode"]);
  const hasManual = includesAny(description, ["manual", "busqueda manual", "buscar", "busqued"]);
  const hasLogistics = includesAny(description, ["caja", "cajas", "pieza", "piezas", "tarima", "empaque"]);

  const methodOptions = [];
  if (hasScan) methodOptions.push("Escaneo");
  if (hasManual) methodOptions.push("Busqueda manual");
  if (!methodOptions.length) methodOptions.push("Escaneo", "Busqueda manual");

  const specs = [
    {
      label: "Producto",
      type: hasLogistics ? INVENTORY_LOOKUP_LOGISTICS_FIELD : "inventoryLookup",
      groupName: "Almacen",
      groupColor: "#e2f4ec",
      optionSource: "manual",
      options: [],
      optionCatalogCategory: "",
      inventoryProperty: "code",
      helpText: "Escanea o busca el producto; muestra datos de empaque cuando aplique.",
      placeholder: "Buscar por SKU, codigo o nombre",
      fromPreset: false,
      isNewPreset: false,
    },
    {
      label: "Cajas disponibles",
      type: "number",
      groupName: "Almacen",
      groupColor: "#e2f4ec",
      optionSource: "manual",
      options: [],
      optionCatalogCategory: "",
      inventoryProperty: "code",
      helpText: "Cajas listas para tomar al seleccionar el producto.",
      placeholder: "0",
      fromPreset: false,
      isNewPreset: false,
    },
    {
      label: "Metodo de descuento",
      type: "select",
      groupName: "Control",
      groupColor: "#fef3c7",
      optionSource: "manual",
      options: methodOptions,
      optionCatalogCategory: "",
      inventoryProperty: "code",
      helpText: "Escaneo o captura manual antes de descontar.",
      placeholder: "",
      fromPreset: false,
      isNewPreset: false,
    },
    {
      label: "Cajas a descontar",
      type: "number",
      groupName: "Descuento",
      groupColor: "#fee2e2",
      optionSource: "manual",
      options: [],
      optionCatalogCategory: "",
      inventoryProperty: "code",
      helpText: "Cajas confirmadas al descontar del almacen.",
      placeholder: "0",
      fromPreset: false,
      isNewPreset: false,
    },
    {
      label: "Piezas a descontar",
      type: "number",
      groupName: "Descuento",
      groupColor: "#fee2e2",
      optionSource: "manual",
      options: [],
      optionCatalogCategory: "",
      inventoryProperty: "code",
      helpText: "Piezas sueltas confirmadas en el descuento.",
      placeholder: "0",
      fromPreset: false,
      isNewPreset: false,
    },
    {
      label: "Fecha del movimiento",
      type: "date",
      groupName: "Control",
      groupColor: "#fef3c7",
      optionSource: "manual",
      options: [],
      optionCatalogCategory: "",
      inventoryProperty: "code",
      helpText: "",
      placeholder: "",
      fromPreset: false,
      isNewPreset: false,
    },
    {
      label: "Observaciones",
      type: "textarea",
      groupName: "Control",
      groupColor: "#fef3c7",
      optionSource: "manual",
      options: [],
      optionCatalogCategory: "",
      inventoryProperty: "code",
      helpText: "Notas del operador sobre el descuento.",
      placeholder: "",
      fromPreset: false,
      isNewPreset: false,
    },
  ];

  return {
    specs,
    newPresets: [],
    summary: "Control de salida de almacen: producto, cajas disponibles, metodo de descuento y cantidades a descontar.",
    source: "local-scenario",
    aiUsed: false,
  };
}

export function isLowQualityComponentPlan(plan, description) {
  if (!plan?.specs?.length) return true;
  const normalizedDesc = normalizeText(description);
  return plan.specs.some((spec) => {
    const label = normalizeText(spec.label);
    return label.length > 42
      || label.startsWith("necesito")
      || label.startsWith("que con")
      || label.startsWith("por favor")
      || label.startsWith("porfav")
      || (label.length > 18 && normalizedDesc.includes(label.slice(0, 18)));
  });
}

export function resolveBestComponentPlan(description, apiPlan, { savedPresets = [] } = {}) {
  const text = String(description || "").trim();
  const localPlan = detectLocalComponentPlan(text, { savedPresets });
  let parsed = null;

  if (localPlan?.source === "local-scenario" && localPlan.specs?.length) {
    return localPlan;
  }

  if (apiPlan?.specs?.length && !isLowQualityComponentPlan(apiPlan, text)) {
    return apiPlan;
  }

  if (localPlan?.specs?.length) {
    return localPlan;
  }

  if (text.length <= 80) {
    parsed = parseBoardComponentDescription(text, { savedPresets });
    if (parsed?.specs?.length && !isLowQualityComponentPlan(parsed, text)) {
      return parsed;
    }
  }

  if (apiPlan?.specs?.length) {
    return apiPlan;
  }

  if (parsed?.specs?.length) {
    return parsed;
  }

  return localPlan || apiPlan || {
    specs: [],
    newPresets: [],
    summary: "No se detectaron componentes. Describe el proceso o agrega campos manualmente.",
    source: "none",
    aiUsed: false,
  };
}

export function detectLocalComponentPlan(description, { savedPresets = [] } = {}) {
  const text = String(description || "").trim();
  if (!text) return null;

  const presetHits = (savedPresets || [])
    .map((preset) => {
      let score = 0;
      if (normalizeText(text).includes(normalizeText(preset.label))) score += 5;
      (preset.keywords || []).forEach((keyword) => {
        if (normalizeText(text).includes(normalizeText(keyword))) score += 3;
      });
      return { preset, score };
    })
    .filter((item) => item.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (presetHits.length) {
    const specs = presetHits.map(({ preset }) => ({
      label: preset.label,
      type: preset.type || "text",
      groupName: preset.groupName || "General",
      groupColor: preset.groupColor || "#e2f4ec",
      optionSource: preset.optionSource || "manual",
      options: Array.isArray(preset.options) ? preset.options : [],
      optionCatalogCategory: preset.optionCatalogCategory || "",
      inventoryProperty: preset.inventoryProperty || "code",
      helpText: preset.helpText || preset.description || "",
      placeholder: preset.placeholder || "",
      fromPreset: true,
      isNewPreset: false,
    }));
    return {
      specs,
      newPresets: [],
      summary: `Reutilice ${specs.length} componente(s) guardados.`,
      source: "presets",
      aiUsed: false,
    };
  }

  const warehouseContext = includesAny(text, ["almacen", "inventario", "bodega", "stock", "warehouse"]);
  const warehouseItems = includesAny(text, ["caja", "cajas", "pieza", "piezas", "producto", "sku", "empaque", "tarima"]);
  const warehouseFlow = includesAny(text, ["control", "descont", "escane", "escan", "busqued", "tomar", "tomad", "salida", "registr", "listas"]);

  if ((warehouseContext && warehouseItems) || (warehouseItems && warehouseFlow)) {
    return buildWarehouseBoxControlPlan(text);
  }

  return null;
}

function extractSectionName(segment) {
  const match = segment.match(/(?:seccion|bloque|grupo)\s+([^,;]+)/i);
  return match ? match[1].trim() : "";
}

function extractLabel(segment, fallback) {
  const cleaned = segment
    .replace(/(?:seccion|bloque|grupo)\s+[^,;]+/gi, "")
    .replace(/^(?:un|una|el|la|los|las|de|para|con|del|al)\s+/i, "")
    .trim();
  if (!cleaned) return fallback;
  const words = cleaned.split(/\s+/).slice(0, 6);
  const label = words.join(" ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function extractSelectOptions(segment) {
  const optionsMatch = segment.match(/(?:opciones?|valores?)\s*:?\s*(.+)$/i);
  if (!optionsMatch) return [];
  return optionsMatch[1]
    .split(/[,/|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scorePresetMatch(segment, preset) {
  const normalizedSegment = normalizeText(segment);
  const keywords = Array.isArray(preset.keywords) ? preset.keywords : [];
  let score = 0;
  keywords.forEach((keyword) => {
    if (normalizedSegment.includes(normalizeText(keyword))) score += 3;
  });
  if (normalizedSegment.includes(normalizeText(preset.label))) score += 5;
  if (normalizedSegment.includes(normalizeText(preset.description))) score += 2;
  return score;
}

function matchPreset(segment, presets) {
  let best = null;
  let bestScore = 0;
  (presets || []).forEach((preset) => {
    const score = scorePresetMatch(segment, preset);
    if (score > bestScore) {
      bestScore = score;
      best = preset;
    }
  });
  return bestScore >= 3 ? best : null;
}

function matchIntent(segment) {
  const normalized = normalizeText(segment);
  let best = null;
  let bestScore = 0;
  INTENT_RULES.forEach((rule) => {
    let score = 0;
    rule.keywords.forEach((keyword) => {
      if (normalized.includes(normalizeText(keyword))) score += keyword.split(" ").length;
    });
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  });
  return bestScore > 0 ? best : null;
}

function buildSpecFromPreset(preset, segment) {
  return {
    id: preset.id,
    label: preset.label || extractLabel(segment, "Campo"),
    type: preset.type || "text",
    groupName: preset.groupName || extractSectionName(segment) || "General",
    groupColor: preset.groupColor || "#e2f4ec",
    optionSource: preset.optionSource || "manual",
    options: Array.isArray(preset.options) ? preset.options : [],
    optionCatalogCategory: preset.optionCatalogCategory || "",
    inventoryProperty: preset.inventoryProperty || "code",
    helpText: preset.helpText || preset.description || "",
    placeholder: preset.placeholder || "",
    fromPreset: true,
    isNewPreset: false,
  };
}

function buildSpecFromIntent(intent, segment) {
  const options = intent.type === "select" ? extractSelectOptions(segment) : [];
  return {
    label: extractLabel(segment, intent.defaultLabel),
    type: intent.type,
    groupName: extractSectionName(segment) || "General",
    groupColor: "#e2f4ec",
    optionSource: options.length ? "manual" : intent.type === BOARD_ACTIVITY_LIST_FIELD ? "catalogByCategory" : "manual",
    options,
    optionCatalogCategory: intent.type === BOARD_ACTIVITY_LIST_FIELD ? extractLabel(segment, "Actividades") : "",
    inventoryProperty: intent.inventoryProperty || "code",
    helpText: "",
    placeholder: "",
    fromPreset: false,
    isNewPreset: false,
  };
}

function buildFallbackSpec(segment) {
  return {
    label: extractLabel(segment, "Campo personalizado"),
    type: "text",
    groupName: extractSectionName(segment) || "General",
    groupColor: "#e2f4ec",
    optionSource: "manual",
    options: [],
    optionCatalogCategory: "",
    inventoryProperty: "code",
    helpText: segment.trim(),
    placeholder: "",
    fromPreset: false,
    isNewPreset: true,
    keywords: segment
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 8),
    description: segment.trim(),
  };
}

export function parseBoardComponentDescription(description, { savedPresets = [] } = {}) {
  const scenarioPlan = detectLocalComponentPlan(description, { savedPresets });
  if (scenarioPlan?.specs?.length) return scenarioPlan;

  const segments = splitDescriptionSegments(description);
  if (!segments.length) {
    return {
      specs: [],
      newPresets: [],
      summary: "No se detectaron componentes. Verifica la conexion al servidor o agrega campos manualmente.",
    };
  }

  const specs = [];
  const newPresets = [];
  const seenLabels = new Set();

  segments.forEach((segment) => {
    const preset = matchPreset(segment, savedPresets);
    const spec = preset
      ? buildSpecFromPreset(preset, segment)
      : (() => {
        const intent = matchIntent(segment);
        if (intent) return buildSpecFromIntent(intent, segment);
        return buildFallbackSpec(segment);
      })();

    const labelKey = normalizeText(spec.label);
    if (seenLabels.has(labelKey)) return;
    seenLabels.add(labelKey);

    specs.push(spec);
    if (spec.isNewPreset) {
      newPresets.push({
        id: makeHelperId("bcp"),
        label: spec.label,
        description: spec.description || spec.helpText || spec.label,
        type: spec.type,
        groupName: spec.groupName,
        groupColor: spec.groupColor,
        optionSource: spec.optionSource,
        options: spec.options,
        optionCatalogCategory: spec.optionCatalogCategory,
        inventoryProperty: spec.inventoryProperty,
        keywords: spec.keywords || [],
        createdAt: new Date().toISOString(),
      });
    }
  });

  return {
    specs,
    newPresets,
    summary: specs.length
      ? `Se detectaron ${specs.length} componente(s) listos para agregar.`
      : "No se detectaron componentes. Intenta ser mas especifico.",
  };
}

export function buildBoardFieldsFromHelperSpecs(specs, { existingColumns = [], defaultGroupColor = "#e2f4ec" } = {}) {
  const created = [];
  const columnIds = new Set((existingColumns || []).map((column) => column.id));

  specs.forEach((spec) => {
    if (spec.type === INVENTORY_LOOKUP_LOGISTICS_FIELD) {
      const bundleFields = buildInventoryBundleFields({
        fieldLabel: String(spec.label || "Producto").trim(),
        fieldType: INVENTORY_LOOKUP_LOGISTICS_FIELD,
        groupName: spec.groupName || "General",
        groupColor: spec.groupColor || defaultGroupColor,
        fieldHelp: spec.helpText || "",
        placeholder: spec.placeholder || "",
        fieldWidth: spec.width || "md",
        fieldWidthPx: spec.widthPx || null,
        isRequired: "false",
        colorValue: "",
      });
      created.push(...bundleFields);
      bundleFields.forEach((field) => columnIds.add(field.id));
      return;
    }

    const field = {
      id: makeHelperId("fld"),
      label: String(spec.label || "Campo").trim(),
      type: spec.type === BOARD_ACTIVITY_LIST_FIELD ? "select" : spec.type,
      optionSource: spec.type === BOARD_ACTIVITY_LIST_FIELD ? "catalogByCategory" : (spec.optionSource || "manual"),
      optionCatalogCategory: spec.optionCatalogCategory || "",
      options: Array.isArray(spec.options) ? spec.options : [],
      inventoryProperty: spec.inventoryProperty || "code",
      sourceFieldId: spec.type === "inventoryProperty"
        ? (existingColumns.concat(created)).find((column) => ["inventoryLookup", "maintenanceInventoryLookup", INVENTORY_LOOKUP_LOGISTICS_FIELD].includes(column.type))?.id || null
        : null,
      formulaOperation: "add",
      formulaLeftFieldId: null,
      formulaRightFieldId: null,
      formulaTerms: spec.type === "formula"
        ? [
          { fieldId: existingColumns[0]?.id || created[0]?.id || "" },
          { operation: "add", fieldId: existingColumns[1]?.id || created[1]?.id || "" },
        ]
        : [],
      helpText: spec.helpText || "",
      placeholder: spec.placeholder || "",
      defaultValue: "",
      width: "md",
      widthPx: null,
      required: false,
      groupName: spec.groupName || "General",
      groupColor: spec.groupColor || defaultGroupColor,
      colorRules: [],
    };

    if (field.type === "formula" && (!field.formulaTerms[0]?.fieldId || !field.formulaTerms[1]?.fieldId)) {
      field.type = "number";
      field.label = `${field.label} (ajusta formula despues)`;
      field.formulaTerms = [];
    }

    created.push(field);
    columnIds.add(field.id);
  });

  return created;
}

export async function requestBoardComponentPlan(description, { savedPresets = [], requestJson } = {}) {
  if (typeof requestJson !== "function") {
    throw new Error("requestJson no disponible.");
  }

  const response = await requestJson("/warehouse/board-component-helper/plan", {
    method: "POST",
    body: {
      description,
      savedPresets,
    },
  });

  const plan = response?.data?.plan || response?.plan;
  if (!plan) {
    throw new Error("Respuesta invalida del asistente.");
  }

  return {
    ...plan,
    providersAvailable: response?.data?.providersAvailable || response?.providersAvailable || [],
  };
}
