import {
  getOllamaStatus,
  isOllamaConfigured,
  ollamaChatJson,
} from "./ollama.service.js";

const ALLOWED_FIELD_TYPES = new Set([
  "text", "textarea", "email", "phone", "url", "location",
  "number", "currency", "percentage", "weight", "temperature", "duration", "formula",
  "date", "time", "timeline",
  "boolean", "priority", "rating", "progress", "counter", "score", "color_tag",
  "select", "multiSelectDetail", "tags", "evidenceGallery",
  "inventoryLookup", "maintenanceInventoryLookup", "inventoryLookupLogistics", "inventoryProperty",
  "activityList",
]);

const FIELD_TYPE_GUIDE = [
  "text, textarea, number, date, time, duration, select, multiSelectDetail, evidenceGallery",
  "inventoryLookup = buscar/escanear producto del inventario",
  "inventoryLookupLogistics = buscador + piezas por caja + cajas por tarima",
  "maintenanceInventoryLookup = insumos de mantenimiento",
  "inventoryProperty = dato derivado del buscador (lote, codigo, presentacion)",
  "formula = calculo entre otros campos numericos",
  "activityList = checklist de actividades",
  "counter = contador con botones +1/-1",
  "boolean = si/no",
].join("\n");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesAny(text, keywords) {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function buildSystemPrompt(savedPresets = []) {
  const presetHints = (savedPresets || []).slice(0, 40).map((preset) => (
    `- ${preset.label} (${preset.type})${Array.isArray(preset.keywords) && preset.keywords.length ? `: ${preset.keywords.slice(0, 6).join(", ")}` : ""}`
  )).join("\n");

  return `Eres un arquitecto de tableros operativos para AXIS ORDO (logistica, almacen, calidad, produccion).
Tu trabajo: leer una necesidad en lenguaje natural y proponer CAMPOS concretos para una ficha de tablero.

REGLAS ESTRICTAS:
1. Responde SOLO JSON valido, sin markdown ni texto extra.
2. NO copies frases del usuario como nombre de campo.
3. Propon entre 3 y 12 campos utiles, con etiquetas cortas en espanol (2-5 palabras).
4. Usa solo estos tipos: ${[...ALLOWED_FIELD_TYPES].join(", ")}
5. Agrupa en secciones logicas (groupName): General, Almacen, Producto, Descuento, Control, etc.
6. Si mencionan escaneo o busqueda manual de inventario -> inventoryLookup.
7. Si mencionan cajas y piezas por empaque -> inventoryLookupLogistics o number separados.
8. Si mencionan confirmacion de cantidades -> number o counter para cajas y piezas.
9. Si mencionan estatus/opciones -> select con options[].
10. Si no existe un tipo para modales/ventanas, usa number + helpText explicando la confirmacion al capturar.

Formato exacto:
{
  "summary": "1-2 oraciones explicando el tablero propuesto",
  "components": [
    {
      "label": "Nombre visible",
      "type": "inventoryLookup",
      "groupName": "Almacen",
      "helpText": "Instruccion breve",
      "options": [],
      "optionCatalogCategory": "",
      "inventoryProperty": "code"
    }
  ]
}

Guia de tipos:
${FIELD_TYPE_GUIDE}

Presets guardados (reutiliza si encajan):
${presetHints || "(ninguno)"}`;
}

function normalizeAiComponent(raw, index) {
  const label = String(raw?.label || raw?.name || "").trim();
  const type = String(raw?.type || "").trim();
  if (!label || !ALLOWED_FIELD_TYPES.has(type)) return null;

  return {
    label,
    type,
    groupName: String(raw?.groupName || raw?.section || "General").trim() || "General",
    groupColor: String(raw?.groupColor || "#e2f4ec").trim() || "#e2f4ec",
    optionSource: Array.isArray(raw?.options) && raw.options.length ? "manual" : (raw?.optionSource || "manual"),
    options: Array.isArray(raw?.options) ? raw.options.map((item) => String(item || "").trim()).filter(Boolean) : [],
    optionCatalogCategory: String(raw?.optionCatalogCategory || "").trim(),
    inventoryProperty: String(raw?.inventoryProperty || "code").trim() || "code",
    helpText: String(raw?.helpText || raw?.description || "").trim(),
    placeholder: String(raw?.placeholder || "").trim(),
    fromPreset: false,
    isNewPreset: false,
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index,
  };
}

function mapAiPayloadToPlan(payload, source) {
  const components = Array.isArray(payload?.components) ? payload.components : [];
  const specs = components
    .map((item, index) => normalizeAiComponent(item, index))
    .filter(Boolean)
    .sort((left, right) => left.order - right.order)
    .map(({ order, ...spec }) => spec);

  return {
    specs,
    newPresets: [],
    summary: String(payload?.summary || "").trim() || (specs.length
      ? `Propuesta con ${specs.length} componente(s) generada por ${source}.`
      : "No se pudo interpretar la necesidad."),
    source,
    aiUsed: true,
  };
}

function isLowQualityAiPlan(plan, description) {
  if (!plan?.specs?.length) return true;
  const normalizedDesc = normalizeText(description);
  return plan.specs.some((spec) => {
    const label = normalizeText(spec.label);
    return label.length > 42
      || label.startsWith("necesito")
      || label.startsWith("que con")
      || label.startsWith("por favor")
      || (label.length > 18 && normalizedDesc.includes(label.slice(0, 18)));
  });
}

async function callOllamaPlanner(description, savedPresets) {
  if (!isOllamaConfigured()) return null;
  const parsed = await ollamaChatJson({
    system: buildSystemPrompt(savedPresets),
    user: description,
    temperature: 0.15,
  });
  return mapAiPayloadToPlan(parsed, "ollama");
}

function matchSavedPresets(description, savedPresets = []) {
  const normalized = normalizeText(description);
  const hits = (savedPresets || [])
    .map((preset) => {
      let score = 0;
      if (normalized.includes(normalizeText(preset.label))) score += 5;
      (preset.keywords || []).forEach((keyword) => {
        if (normalized.includes(normalizeText(keyword))) score += 3;
      });
      return { preset, score };
    })
    .filter((item) => item.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (!hits.length) return null;

  const specs = hits.map(({ preset }) => ({
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
    summary: `Reutilice ${specs.length} componente(s) guardados que coinciden con tu descripcion.`,
    source: "presets",
    aiUsed: false,
  };
}

function buildWarehouseBoxControlPlan(description) {
  const hasScan = includesAny(description, ["escane", "escan", "codigo de barras", "barcode"]);
  const hasManual = includesAny(description, ["manual", "busqueda manual", "buscar", "busqued"]);
  const hasLogistics = includesAny(description, ["caja", "cajas", "pieza", "piezas", "tarima", "empaque"]);

  const methodOptions = [];
  if (hasScan) methodOptions.push("Escaneo");
  if (hasManual) methodOptions.push("Busqueda manual");
  if (!methodOptions.length) methodOptions.push("Escaneo", "Busqueda manual");

  const productType = hasLogistics ? "inventoryLookupLogistics" : "inventoryLookup";

  const specs = [
    {
      label: "Producto",
      type: productType,
      groupName: "Almacen",
      groupColor: "#e2f4ec",
      optionSource: "manual",
      options: [],
      optionCatalogCategory: "",
      inventoryProperty: "code",
      helpText: "Escanea o busca el producto antes de descontar inventario.",
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
      helpText: "Indica si el descuento fue por escaneo o captura manual.",
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
      helpText: "Cantidad de cajas confirmadas al descontar del almacen.",
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
      helpText: "Piezas sueltas confirmadas en la ventana de descuento.",
      placeholder: "0",
      fromPreset: false,
      isNewPreset: false,
    },
    {
      label: "Area de origen",
      type: "select",
      groupName: "Almacen",
      groupColor: "#e2f4ec",
      optionSource: "manual",
      options: ["Almacen general", "Picking", "Cuarentena", "Devoluciones"],
      optionCatalogCategory: "",
      inventoryProperty: "code",
      helpText: "Zona del almacen de donde salen las cajas.",
      placeholder: "",
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
      helpText: "Notas del operador sobre el descuento o diferencias.",
      placeholder: "",
      fromPreset: false,
      isNewPreset: false,
    },
  ];

  return {
    specs,
    newPresets: [],
    summary: "Tablero de control de salida de cajas desde almacen: producto, metodo, cajas/piezas a descontar y trazabilidad.",
    source: "local-scenario",
    aiUsed: false,
  };
}

function buildLocalScenarioPlan(description) {
  const warehouseContext = includesAny(description, ["almacen", "inventario", "bodega", "stock", "warehouse"]);
  const warehouseItems = includesAny(description, ["caja", "cajas", "pieza", "piezas", "producto", "sku", "empaque", "tarima"]);
  const warehouseFlow = includesAny(description, ["control", "descont", "escane", "escan", "busqued", "tomar", "tomad", "salida", "registr", "listas"]);

  if ((warehouseContext && warehouseItems) || (warehouseItems && warehouseFlow)) {
    return buildWarehouseBoxControlPlan(description);
  }

  if (includesAny(description, ["evidencia", "foto", "calidad", "inspeccion", "rechaz"])) {
    return {
      specs: [
        { label: "Actividad", type: "text", groupName: "General", groupColor: "#e2f4ec", optionSource: "manual", options: [], optionCatalogCategory: "", inventoryProperty: "code", helpText: "", placeholder: "", fromPreset: false, isNewPreset: false },
        { label: "Resultado", type: "select", groupName: "Calidad", groupColor: "#fef3c7", optionSource: "manual", options: ["OK", "Rechazado", "Pendiente"], optionCatalogCategory: "", inventoryProperty: "code", helpText: "", placeholder: "", fromPreset: false, isNewPreset: false },
        { label: "Evidencias", type: "evidenceGallery", groupName: "Calidad", groupColor: "#fef3c7", optionSource: "manual", options: [], optionCatalogCategory: "", inventoryProperty: "code", helpText: "Fotos o videos del hallazgo.", placeholder: "", fromPreset: false, isNewPreset: false },
        { label: "Observaciones", type: "textarea", groupName: "Calidad", groupColor: "#fef3c7", optionSource: "manual", options: [], optionCatalogCategory: "", inventoryProperty: "code", helpText: "", placeholder: "", fromPreset: false, isNewPreset: false },
      ],
      newPresets: [],
      summary: "Tablero de control de calidad con estatus y evidencias.",
      source: "local-scenario",
      aiUsed: false,
    };
  }

  return null;
}

export async function getBoardComponentHelperEngineStatus() {
  return getOllamaStatus();
}

export function getBoardComponentHelperProviders() {
  return isOllamaConfigured() ? ["ollama"] : [];
}

export async function planBoardComponentsFromDescription(description, { savedPresets = [] } = {}) {
  const text = String(description || "").trim();
  if (!text) {
    return { ok: false, message: "Describe al menos un campo que necesitas." };
  }

  if (text.length > 4000) {
    return { ok: false, message: "La descripcion supera el limite de 4000 caracteres." };
  }

  const ollamaStatus = await getOllamaStatus();
  const errors = [];

  const scenarioPlan = buildLocalScenarioPlan(text);
  if (scenarioPlan?.specs?.length) {
    return {
      ok: true,
      plan: {
        ...scenarioPlan,
        hint: "Plantilla operativa lista segun tu descripcion.",
        providerErrors: errors,
        engine: ollamaStatus,
      },
      providersAvailable: getBoardComponentHelperProviders(),
      engine: ollamaStatus,
    };
  }

  if (isOllamaConfigured()) {
    try {
      const plan = await callOllamaPlanner(text, savedPresets);
      if (plan?.specs?.length && !isLowQualityAiPlan(plan, text)) {
        return {
          ok: true,
          plan: { ...plan, engine: ollamaStatus },
          providersAvailable: ["ollama"],
          engine: ollamaStatus,
        };
      }
      if (plan?.specs?.length) {
        errors.push("ollama: respuesta de baja calidad, usando plantilla");
      }
    } catch (error) {
      errors.push(`ollama: ${error?.message || "error"}`);
    }
  }

  const presetPlan = matchSavedPresets(text, savedPresets);
  if (presetPlan?.specs?.length) {
    return {
      ok: true,
      plan: { ...presetPlan, engine: ollamaStatus },
      providersAvailable: getBoardComponentHelperProviders(),
      engine: ollamaStatus,
    };
  }

  return {
    ok: true,
    plan: {
      specs: [],
      newPresets: [],
      summary: ollamaStatus.reachable
        ? "Ollama esta activo pero no interpreto la solicitud. Se mas especifico."
        : "Activa Ollama local para IA sin limites: ollama pull llama3.2",
      source: "none",
      aiUsed: false,
      providerErrors: errors,
      engine: ollamaStatus,
    },
    providersAvailable: getBoardComponentHelperProviders(),
    engine: ollamaStatus,
  };
}
