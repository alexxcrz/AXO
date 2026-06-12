export const OPERATIONAL_INSPECTION_TEMPLATE = {
  id: "operational-inspection-v1",
  name: "Checklist - Inspeccion Operativa",
  area: "MANTENIMIENTO",
  isBuiltIn: true,
  version: 1,
  incidenceRules: {
    createOnNoOk: true,
    requirePhotoOnNoOk: true,
    autoAssignToReporter: true,
    defaultStatus: "abierta",
    defaultPriority: "media",
  },
  metadataFields: [
    { key: "area", label: "Area", required: true },
    { key: "date", label: "Fecha", required: true },
    { key: "responsable", label: "Responsable", required: true },
    { key: "shift", label: "Turno", required: false },
    { key: "process", label: "Proceso/Tablero", required: false },
  ],
  siteOptions: [],
  sections: [
    {
      id: "naves",
      title: "Revision de Naves",
      incidenceCategory: "Infraestructura",
      checks: [
        { id: "naves-condiciones-generales", label: "Condiciones generales de la nave" },
        { id: "naves-salitre", label: "Presencia de salitre en muros/estructuras" },
        { id: "naves-racks", label: "Estado de racks (sin golpes o danos)" },
        { id: "naves-orden-limpieza", label: "Orden y limpieza" },
      ],
    },
    {
      id: "cisternas",
      title: "Revision de Cisternas",
      incidenceCategory: "Infraestructura",
      checks: [
        { id: "cisternas-nivel-agua", label: "Nivel de agua adecuado" },
        { id: "cisternas-sin-fugas", label: "Sin fugas visibles" },
        { id: "cisternas-tapas", label: "Tapas en buen estado" },
        { id: "cisternas-limpieza", label: "Limpieza general" },
      ],
    },
    {
      id: "tanques-montacargas",
      title: "Revision de Tanques y Montacargas",
      incidenceCategory: "Equipo / Herramienta",
      checks: [
        { id: "tanques-estado", label: "Estado de tanques" },
        { id: "tanques-sin-fugas", label: "Sin fugas en tanques" },
        { id: "montacargas-cambio-tanque", label: "Cambio de tanque de montacargas realizado" },
        { id: "montacargas-funcionamiento", label: "Funcionamiento correcto del montacargas" },
      ],
    },
    {
      id: "oficinas-limpieza",
      title: "Revision de Oficinas y Limpieza",
      incidenceCategory: "Limpieza",
      checks: [
        { id: "oficinas-wc-viernes", label: "Limpieza de cajas de WC (viernes de cada semana)" },
        { id: "oficinas-muebles", label: "Chequeo de muebles (estado general)" },
        { id: "oficinas-electricos", label: "Chequeo de aparatos electricos (funcionamiento y estado)" },
      ],
    },
  ],
};

export const CLEANING_CHECKLIST_TEMPLATE_V2 = {
  id: "cleaning-checklist-v2",
  name: "Checklist - Área de Limpieza",
  area: "LIMPIEZA",
  isBuiltIn: true,
  version: 2,
  incidenceRules: {
    createOnNoOk: true,
    requirePhotoOnNoOk: true,
    autoAssignToReporter: true,
    defaultStatus: "abierta",
    defaultPriority: "media",
  },
  metadataFields: [
    { key: "area", label: "Area", required: true },
    { key: "date", label: "Fecha", required: true },
    { key: "responsable", label: "Responsable", required: true },
    { key: "shift", label: "Turno", required: false },
    { key: "process", label: "Proceso/Tablero", required: false },
  ],
  siteOptions: ["C1", "C2", "C3"],
  sections: [
    {
      id: "control-fauna",
      title: "Control de Fauna Nociva",
      incidenceCategory: "Limpieza",
      checks: [
        { id: "fauna-verificacion", label: "Verificar que no haya fauna nociva (insectos, roedores)" },
        { id: "fauna-trampa-control", label: "Trampas de control en buen estado y posicionadas" },
        { id: "fauna-evidencia", label: "Ausencia de evidencia de plagas (heces, nidos)" },
        { id: "fauna-alimentos", label: "Alimentos y residuos no accesibles para fauna" },
      ],
    },
    {
      id: "sanitarios-limpieza",
      title: "Servicios Higiénicos",
      incidenceCategory: "Limpieza",
      checks: [
        { id: "sanitarios-limpieza-general", label: "Limpieza completa de sanitarios" },
        { id: "sanitarios-desinfectante", label: "Desinfectante aplicado en pisos y superficies" },
        { id: "sanitarios-papel", label: "Papel higiénico disponible en todos los inodoros" },
        { id: "sanitarios-toallas", label: "Toallas de manos disponibles y limpias" },
        { id: "sanitarios-jabonera", label: "Jabón disponible en lavamanos" },
        { id: "sanitarios-olor", label: "Ausencia de olores desagradables" },
        { id: "sanitarios-espejos", label: "Espejos y superficies reflectantes limpios" },
      ],
    },
    {
      id: "comedor-empleados",
      title: "Comedor de Empleados",
      incidenceCategory: "Limpieza",
      checks: [
        { id: "comedor-mesas", label: "Mesas limpias y desinfectadas" },
        { id: "comedor-sillas", label: "Sillas y bancas en buen estado y limpias" },
        { id: "comedor-piso", label: "Piso limpio sin derrames ni residuos" },
        { id: "comedor-basura", label: "Basura recolectada y contenedores limpios" },
        { id: "comedor-ventilacion", label: "Ventilación adecuada y ausencia de olores desagradables" },
        { id: "comedor-microondas", label: "Microondas y áreas de preparación limpias" },
        { id: "comedor-nevera", label: "Nevera organizada y sin alimentos vencidos" },
      ],
    },
    {
      id: "areas-almacenamiento",
      title: "Tarimas y Almacenamiento",
      incidenceCategory: "Limpieza",
      checks: [
        { id: "tarimas-orden", label: "Tarimas ordenadas y posicionadas correctamente" },
        { id: "tarimas-limpieza", label: "Tarimas limpias sin restos de producto o polvo" },
        { id: "encharcamientos", label: "Ausencia de encharcamientos y derrames de líquidos" },
        { id: "playas-orden", label: "Playas de almacenamiento sin carros fuera de lugar" },
        { id: "carros-posicionados", label: "Carros de transporte en sus lugares asignados" },
        { id: "estanterias-limpieza", label: "Estanterías y anaqueles libres de polvo y residuos" },
        { id: "productos-etiquetados", label: "Productos correctamente etiquetados y organizados" },
      ],
    },
    {
      id: "epp-seguridad",
      title: "Equipos de Protección Personal",
      incidenceCategory: "Seguridad",
      checks: [
        { id: "epp-disponibilidad", label: "EPP disponible en cantidad suficiente" },
        { id: "epp-estado", label: "EPP en buen estado y sin daños" },
        { id: "epp-signalizacion", label: "Señalización clara de uso obligatorio de EPP" },
        { id: "epp-almacenamiento", label: "EPP almacenado correctamente y accesible" },
        { id: "epp-limpieza", label: "EPP limpio y en condiciones higiénicas" },
      ],
    },
    {
      id: "areas-comunes",
      title: "Áreas Comunes",
      incidenceCategory: "Limpieza",
      checks: [
        { id: "pasillos-limpieza", label: "Pasillos limpios sin obstáculos" },
        { id: "escritorios-limpieza", label: "Escritorios y superficies de trabajo limpias" },
        { id: "cables-organizacion", label: "Cables eléctricos organizados y asegurados" },
        { id: "basura-separacion", label: "Recipientes de basura diferenciados y disponibles" },
        { id: "articulos-limpieza", label: "Artículos de limpieza disponibles (trapos, escobas, trapeadores)" },
        { id: "iluminacion-adecuada", label: "Iluminación adecuada en áreas de trabajo y limpieza" },
        { id: "ventanas-limpieza", label: "Ventanas y vidrios limpios y transparentes" },
      ],
    },
    {
      id: "revision-naves",
      title: "Revisión de Naves",
      incidenceCategory: "Limpieza",
      checks: [
        { id: "naves-piso-limpieza", label: "Piso de naves completamente limpio y sin residuos" },
        { id: "naves-paredes-limpieza", label: "Paredes y estructuras libres de polvo y suciedad" },
        { id: "naves-techo-inspeccion", label: "Techo y luminarias libres de polvo acumulado" },
        { id: "naves-maquinaria-limpieza", label: "Maquinaria y equipos limpios y libres de residuos" },
        { id: "naves-ventilacion-filtros", label: "Filtros de ventilación limpios y funcionales" },
        { id: "naves-drenajes-libres", label: "Drenajes y desagües libres de obstrucciones" },
        { id: "naves-orden-general", label: "Orden general en áreas de producción y almacenamiento" },
        { id: "naves-seguridad-pasos", label: "Pasos de seguridad y áreas de evacuación despejadas" },
      ],
    },
    {
      id: "insumos-limpieza",
      title: "Insumos y Equipos de Limpieza",
      incidenceCategory: "Limpieza",
      checks: [
        { id: "insumos-disponibilidad", label: "Todos los insumos de limpieza disponibles en cantidades adecuadas" },
        { id: "insumos-vencimiento", label: "Productos de limpieza dentro de fecha de vencimiento" },
        { id: "insumos-almacenamiento", label: "Insumos almacenados correctamente y con etiquetado adecuado" },
        { id: "equipos-funcionamiento", label: "Equipos de limpieza en buen estado y funcionamiento" },
        { id: "equipos-calibracion", label: "Equipos de medición y dosificación calibrados" },
        { id: "seguridad-productos", label: "Productos químicos almacenados con medidas de seguridad" },
      ],
    },
  ],
};

function makeChecklistToken(value, fallback) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export function generateChecklistTemplateId(prefix = "checklist") {
  const safePrefix = makeChecklistToken(prefix, "checklist") || "checklist";
  const random = Math.random().toString(36).slice(2, 8);
  return `${safePrefix}-${Date.now()}-${random}`;
}

function normalizeChecklistArea(rawArea, fallback = "") {
  const value = String(rawArea || "").trim();
  if (!value) return String(fallback || "").trim().toUpperCase();
  return value.toUpperCase();
}

export function normalizeOperationalInspectionTemplate(rawTemplate) {
  const source = rawTemplate && typeof rawTemplate === "object" ? rawTemplate : OPERATIONAL_INSPECTION_TEMPLATE;
  const sourceSections = Array.isArray(source.sections) ? source.sections : [];
  const normalizedSiteOptions = Array.isArray(source.siteOptions)
    ? Array.from(new Set(source.siteOptions
      .map((site) => String(site || "").trim().toUpperCase())
      .filter(Boolean)))
    : [];

  const normalizedSections = sourceSections
    .map((section, sectionIndex) => {
      const sectionTitle = String(section?.title || `Seccion ${sectionIndex + 1}`).trim();
      const sectionId = String(section?.id || "").trim() || makeChecklistToken(sectionTitle, `sec-${sectionIndex + 1}`);
      const checks = (Array.isArray(section?.checks) ? section.checks : [])
        .map((check, checkIndex) => {
          const checkLabel = String(check?.label || "").trim();
          if (!checkLabel) return null;
          const checkId = String(check?.id || "").trim() || `${sectionId}-${makeChecklistToken(checkLabel, `chk-${checkIndex + 1}`)}`;
          const normalizedCheckSiteOptions = Array.isArray(check?.siteOptions)
            ? Array.from(new Set(check.siteOptions.map((s) => String(s || "").trim().toUpperCase()).filter(Boolean)))
            : [];
          return { id: checkId, label: checkLabel, siteOptions: normalizedCheckSiteOptions };
        })
        .filter(Boolean);

      if (!checks.length) return null;
      return {
        id: sectionId,
        title: sectionTitle,
        incidenceCategory: String(section?.incidenceCategory || "Otro").trim() || "Otro",
        checks,
      };
    })
    .filter(Boolean);

  const sanitizedSourceId = String(source.id || "").trim();
  const resolvedId = sanitizedSourceId || generateChecklistTemplateId("checklist");
  const isBuiltIn = Boolean(
    source.isBuiltIn
    || sanitizedSourceId === OPERATIONAL_INSPECTION_TEMPLATE.id
    || sanitizedSourceId === CLEANING_CHECKLIST_TEMPLATE_V2.id,
  );
  const resolvedArea = normalizeChecklistArea(source.area, sanitizedSourceId === CLEANING_CHECKLIST_TEMPLATE_V2.id ? "LIMPIEZA" : sanitizedSourceId === OPERATIONAL_INSPECTION_TEMPLATE.id ? "MANTENIMIENTO" : "");

  return {
    ...OPERATIONAL_INSPECTION_TEMPLATE,
    ...source,
    id: resolvedId,
    area: resolvedArea,
    isBuiltIn,
    name: String(source.name || OPERATIONAL_INSPECTION_TEMPLATE.name).trim() || OPERATIONAL_INSPECTION_TEMPLATE.name,
    version: Number(source.version || OPERATIONAL_INSPECTION_TEMPLATE.version) || OPERATIONAL_INSPECTION_TEMPLATE.version,
    incidenceRules: {
      ...OPERATIONAL_INSPECTION_TEMPLATE.incidenceRules,
      ...(source.incidenceRules && typeof source.incidenceRules === "object" ? source.incidenceRules : {}),
    },
    metadataFields: Array.isArray(source.metadataFields) && source.metadataFields.length
      ? source.metadataFields
      : OPERATIONAL_INSPECTION_TEMPLATE.metadataFields,
    siteOptions: normalizedSiteOptions,
    sections: normalizedSections.length
      ? normalizedSections
      : OPERATIONAL_INSPECTION_TEMPLATE.sections,
  };
}

export const OPERATIONAL_INSPECTION_ACTIVITY_BINDINGS = [
  {
    templateId: OPERATIONAL_INSPECTION_TEMPLATE.id,
    activityMatchers: [
      "chequeo de naves",
      "revision de naves",
      "inspeccion operativa",
      "revisar naves",
    ],
  },
  {
    templateId: CLEANING_CHECKLIST_TEMPLATE_V2.id,
    activityMatchers: [
      "limpieza general",
      "limpieza de areas",
      "limpieza",
      "checklist limpieza",
      "inspeccion limpieza",
      "verificacion limpieza",
      "area de limpieza",
      "revision limpieza",
      "control limpieza",
    ],
  },
];

export function shouldOpenOperationalInspectionForActivity(activityLabel = "") {
  const normalizedLabel = String(activityLabel || "").trim().toLowerCase();
  if (!normalizedLabel) return false;
  for (const binding of OPERATIONAL_INSPECTION_ACTIVITY_BINDINGS) {
    const matchers = Array.isArray(binding?.activityMatchers) ? binding.activityMatchers : [];
    if (matchers.some((matcher) => normalizedLabel.includes(String(matcher || "").trim().toLowerCase()))) {
      return true;
    }
  }
  return false;
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString();
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? new Date().toISOString() : asDate.toISOString();
}

function toInspectionHour(value, fallbackDate = "") {
  const candidate = value || fallbackDate;
  const asDate = new Date(candidate);
  if (Number.isNaN(asDate.getTime())) return "N/A";
  const hh = String(asDate.getHours()).padStart(2, "0");
  const mm = String(asDate.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function createOperationalInspectionDraft(template = OPERATIONAL_INSPECTION_TEMPLATE) {
  const checkMap = {};
  for (const section of template.sections || []) {
    for (const check of section.checks || []) {
      checkMap[check.id] = {
        status: "pending", // pending | ok | no_ok | na
        notes: "",
        severity: "media", // baja | media | alta | critica
        photos: [],
        site: "",
      };
    }
  }

  return {
    templateId: template.id,
    metadata: {
      area: "",
      date: new Date().toISOString().slice(0, 10),
      inspectedAt: new Date().toISOString(),
      responsable: "",
      shift: "",
      process: "",
      requireIncidentSiteSelection: false,
    },
    checks: checkMap,
    observations: "",
  };
}

export function validateOperationalInspection(draft, template = OPERATIONAL_INSPECTION_TEMPLATE) {
  const errors = [];
  const metadata = draft?.metadata || {};

  for (const field of template.metadataFields || []) {
    if (!field.required) continue;
    if (!String(metadata[field.key] || "").trim()) {
      errors.push(`Falta campo obligatorio: ${field.label}.`);
    }
  }

  for (const section of template.sections || []) {
    for (const check of section.checks || []) {
      const state = draft?.checks?.[check.id];
      if (!state) {
        errors.push(`Falta estado del check: ${check.label}.`);
        continue;
      }
      if (state.status === "pending") {
        errors.push(`Marca resultado para: ${check.label}.`);
      }
      if (state.status === "no_ok" && template.incidenceRules?.requirePhotoOnNoOk) {
        if (!Array.isArray(state.photos) || state.photos.length === 0) {
          errors.push(`Debes adjuntar evidencia para incidencia: ${check.label}.`);
        }
      }
      if (state.status === "no_ok" && draft?.metadata?.requireIncidentSiteSelection) {
        if (!String(state.site || "").trim()) {
          errors.push(`Selecciona la nave afectada para incidencia: ${check.label}.`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function buildIncidenciasFromOperationalInspection({
  draft,
  template = OPERATIONAL_INSPECTION_TEMPLATE,
  currentUser,
}) {
  const incidencias = [];
  const metadata = draft?.metadata || {};
  const reporterId = String(currentUser?.id || "").trim();
  const reporterName = String(currentUser?.name || "").trim();

  for (const section of template.sections || []) {
    for (const check of section.checks || []) {
      const state = draft?.checks?.[check.id];
      if (!state || state.status !== "no_ok") continue;
      const inspectedSite = String(metadata.site || metadata.area || "").trim().toUpperCase();
      const affectedSite = String(state.site || inspectedSite || "").trim().toUpperCase();

      const notes = String(state.notes || "").trim();
      const photos = Array.isArray(state.photos) ? state.photos : [];
      const evidencias = photos
        .map((photo, index) => {
          const url = String(photo?.url || photo?.secureUrl || "").trim();
          if (!url) return null;
          return {
            url,
            thumbnailUrl: String(photo?.thumbnailUrl || url).trim(),
            name: String(photo?.name || `evidencia-${index + 1}`).trim(),
            type: String(photo?.type || "image").trim(),
          };
        })
        .filter(Boolean);

      const descriptionParts = [
        notes || "Hallazgo detectado durante checklist de inspección operativa.",
        "",
        `Origen: ${template.name}`,
        `Seccion: ${section.title}`,
        `Check: ${check.label}`,
        `Área inspección: ${String(metadata.area || "").trim() || "N/A"}`,
        `Nave afectada: ${affectedSite || "N/A"}`,
        `Responsable inspección: ${String(metadata.responsable || "").trim() || reporterName || "N/A"}`,
        `Fecha inspección: ${toIsoDate(metadata.date)}`,
        `Hora inspección: ${toInspectionHour(metadata.inspectedAt, metadata.date)}`,
        `Proceso/Tablero: ${String(metadata.process || "").trim() || "N/A"}`,
      ];

      const normalizedArea = String(metadata.area || section.title || "").trim();
      const normalizedAreaUpper = normalizedArea.toUpperCase();
      const resolvedArea = affectedSite && affectedSite !== normalizedAreaUpper
        ? `${normalizedArea || "General"} · ${affectedSite}`
        : (normalizedArea || affectedSite || "General");

      incidencias.push({
        title: `[Inspeccion] ${check.label}`,
        description: descriptionParts.join("\n"),
        category: section.incidenceCategory || "Otro",
        area: resolvedArea,
        priority: ["baja", "media", "alta", "critica"].includes(state.severity) ? state.severity : template.incidenceRules.defaultPriority || "media",
        status: template.incidenceRules.defaultStatus || "abierta",
        assignedToId: template.incidenceRules.autoAssignToReporter ? reporterId : "",
        assignedToName: template.incidenceRules.autoAssignToReporter ? reporterName : "",
        evidencias,
      });
    }
  }

  return incidencias;
}

export async function createIncidenciasFromOperationalInspection({
  draft,
  template = OPERATIONAL_INSPECTION_TEMPLATE,
  currentUser,
  requestJson,
}) {
  const payloads = buildIncidenciasFromOperationalInspection({ draft, template, currentUser });
  const results = [];

  for (const payload of payloads) {
    const response = await requestJson("/warehouse/incidencias", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    results.push({ payload, response });
  }

  return {
    created: payloads.length,
    payloads,
    results,
  };
}

export const DEFAULT_CLEANING_CHECKLIST_SITES = ["C1", "C2", "C3"];

const DEPRECATED_INSPECTION_SITE_KEYS = new Set([
  "P",
  "PATIO",
  "P/PATIO",
  "PPATIO",
  "P/P",
  "PATIO/P",
]);

export function isDeprecatedInspectionSite(site) {
  const key = String(site || "").trim().toUpperCase().replaceAll(" ", "");
  return DEPRECATED_INSPECTION_SITE_KEYS.has(key);
}

export function sanitizeInspectionSiteKeys(sites = []) {
  const cleaned = uniqueInspectionSites(sites).filter((site) => !isDeprecatedInspectionSite(site));
  const cleaningMatches = DEFAULT_CLEANING_CHECKLIST_SITES.filter((site) => cleaned.includes(site));
  if (cleaningMatches.length >= 2) {
    return cleaningMatches;
  }
  return cleaned;
}

function uniqueInspectionSites(list = []) {
  return Array.from(new Set(
    (Array.isArray(list) ? list : [])
      .map((site) => String(site || "").trim().toUpperCase())
      .filter(Boolean),
  ));
}

function orderInspectionSites(preferredOrder = [], available = []) {
  const availableSet = new Set(available);
  const ordered = uniqueInspectionSites(preferredOrder).filter((site) => availableSet.has(site));
  const extras = available.filter((site) => !ordered.includes(site)).sort();
  return [...ordered, ...extras];
}

export function resolveInspectionSiteKeys(record, template = null) {
  const safeRecord = record && typeof record === "object" ? record : {};
  const normalizedTemplate = normalizeOperationalInspectionTemplate(template || safeRecord.template);
  const siteOptions = uniqueInspectionSites(safeRecord.siteOptions);
  const templateSites = uniqueInspectionSites(normalizedTemplate?.siteOptions);
  const completedSites = uniqueInspectionSites(safeRecord.completedSites);
  const bySiteDraftKeys = uniqueInspectionSites(Object.keys(safeRecord.bySiteDrafts || {}));
  const merged = sanitizeInspectionSiteKeys([
    ...siteOptions,
    ...templateSites,
    ...completedSites,
    ...bySiteDraftKeys,
  ]);

  if (merged.length > 1) {
    const preferredOrder = siteOptions.length > 1
      ? sanitizeInspectionSiteKeys(siteOptions)
      : (templateSites.length > 1 ? sanitizeInspectionSiteKeys(templateSites) : DEFAULT_CLEANING_CHECKLIST_SITES);
    const ordered = orderInspectionSites(preferredOrder, merged);
    return ordered.length > 1 ? ordered : merged.sort();
  }

  if (safeRecord.multiSite && templateSites.length > 1) {
    return sanitizeInspectionSiteKeys(templateSites);
  }

  if (merged.length === 1) return merged;
  return ["GENERAL"];
}
