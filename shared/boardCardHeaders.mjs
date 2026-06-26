import { inferBoardFieldLayoutRole, normalizeFieldLabelKey } from "./boardCardLayout.mjs";

const SLOT_SECTION_META = {
  player: { sectionName: "Asignaci\u00f3n", label: "Player", color: "#e0f2fe" },
  status: { sectionName: "Acciones", label: "Estatus", color: "#fef3c7" },
  actions: { sectionName: "Acciones", label: "Acciones", color: "#fef3c7" },
};

const DISPLAY_LABEL_BY_ROLE = {
  activity: "Actividad",
  date: "Fecha",
  start: "Inicio",
  end: "Fin",
  lot: "Lote",
  expiry: "Caducidad",
  labelTag: "Etiqueta",
  laboratory: "Laboratorio",
  finishGate: "Finalizaci\u00f3n",
};

const DISPLAY_LABEL_OVERRIDES = {
  "actividad/reparacion": "Actividad",
  "hora inicio": "Inicio",
  "hora fin": "Fin",
  "fecha revision": "Fecha",
  "antes/despues": "Antes / Despu\u00e9s",
  "insumos a utilizar": "Insumos",
  "cajas tarima": "Cajas",
  "total piezas esperadas": "Esperadas",
  "piezas faltantes": "Faltantes",
  "piezas merma": "Merma",
  "piezas por caja": "Pz / caja",
  "se termino la actividad?": "Finalizaci\u00f3n",
  producto: "Asignaci\u00f3n",
  estacion: "Estaci\u00f3n",
  observaciones: "Observaciones",
  causales: "Causales",
  reparacion: "Reparaci\u00f3n",
  area: "\u00c1rea",
};

function resolveBoardHeaderProfile(board) {
  const name = normalizeFieldLabelKey(board?.name);
  if (/revision.*tarima|tarimas.*fernando/.test(name)) return "palletReview";
  if (/limpieza/.test(name)) return "cleaning";
  if (/reparacion|actividades/.test(name)) return "repairs";
  return "default";
}

const GROUP_POLICIES = {
  repairs: {
    General: { name: "Registro", color: "#e8f4fc" },
    Captura: { name: "Captura", color: "#dbeafe" },
    Tiempos: { name: "Tiempos", color: "#fee2e2" },
    Seguimiento: { name: "Seguimiento", color: "#fef3c7" },
    Evidencia: { name: "Evidencia", color: "#f3e8ff" },
    Inventario: { name: "Registro", color: "#e8f4fc" },
    Insumos: { name: "Registro", color: "#e8f4fc" },
    Registro: { name: "Registro", color: "#e8f4fc" },
  },
  palletReview: {
    Control: { name: "Control", color: "#ede9fe" },
    Trazabilidad: { name: "Trazabilidad", color: "#dcfce7" },
    Tiempo: { name: "Tiempos", color: "#fee2e2" },
    Tiempos: { name: "Tiempos", color: "#fee2e2" },
    Producto: { name: "Asignaci\u00f3n", color: "#e0f2fe" },
    "Asignaci\u00f3n": { name: "Asignaci\u00f3n", color: "#e0f2fe" },
    Conteo: { name: "Conteo", color: "#fef3c7" },
    Resultado: { name: "Resultado", color: "#fecaca" },
    Resultados: { name: "Resultado", color: "#fecaca" },
  },
  cleaning: {
    General: { name: "Registro", color: "#e8f4fc" },
    Seguimiento: { name: "Ejecuci\u00f3n", color: "#dbeafe" },
    Ejecucion: { name: "Ejecuci\u00f3n", color: "#dbeafe" },
    "Ejecuci\u00f3n": { name: "Ejecuci\u00f3n", color: "#dbeafe" },
  },
};

export function normalizeBoardCardSectionKey(sectionName = "") {
  return normalizeFieldLabelKey(sectionName);
}

export function resolveBoardCardDisplayHeaderLabel(field, fallbackLabel = "") {
  const safeFallback = String(fallbackLabel || field?.label || "").trim();
  if (!field) return safeFallback;

  const role = inferBoardFieldLayoutRole(field);
  if (role && DISPLAY_LABEL_BY_ROLE[role]) {
    return DISPLAY_LABEL_BY_ROLE[role];
  }

  const key = normalizeFieldLabelKey(field.label);
  if (DISPLAY_LABEL_OVERRIDES[key]) {
    return DISPLAY_LABEL_OVERRIDES[key];
  }

  return safeFallback;
}

export function resolveBoardCardSlotSectionMeta(slotId) {
  return SLOT_SECTION_META[slotId] || null;
}

export function polishBoardCardFieldGroups(board) {
  const profile = resolveBoardHeaderProfile(board);
  const palette = GROUP_POLICIES[profile];
  if (!palette) return board;

  const fields = (Array.isArray(board.fields) ? board.fields : []).map((field) => {
    const currentGroup = String(field.groupName || "General").trim() || "General";
    const policy = palette[currentGroup] || palette.General;
    if (!policy) return field;

    return {
      ...field,
      groupName: policy.name,
      groupColor: policy.color || field.groupColor || "#e2f4ec",
    };
  });

  return {
    ...board,
    fields,
  };
}

export function buildBoardCardSectionHeaderGroups(lineItems = [], widths = [], resolveHeaderMeta) {
  const groups = [];

  lineItems.forEach((lineItem, index) => {
    const meta = resolveHeaderMeta(lineItem);
    const sectionKey = normalizeBoardCardSectionKey(meta.sectionName);
    const width = Number(widths[index] || 0);
    const previous = groups[groups.length - 1];

    if (previous && previous.sectionKey === sectionKey) {
      previous.span += 1;
      previous.width += width;
      previous.lineItemIndices.push(index);
      return;
    }

    groups.push({
      sectionKey,
      sectionName: meta.sectionName,
      color: meta.color,
      span: 1,
      width,
      lineItemIndices: [index],
    });
  });

  return groups;
}
