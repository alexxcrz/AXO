import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.resolve(__dirname, "../backend/data/warehouse-state.json");
const SYSTEM_TEMPLATES_JS = path.resolve(__dirname, "../frontend/src/utils/systemBoardTemplates.js");

const OFFICIAL_TEMPLATE_SPECS = [
  {
    id: "actividades-reparaciones",
    templateName: "Actividades y Reparaciones",
    boardName: "Actividades y Reparaciones",
    category: "Mantenimiento",
    description: "Plantilla oficial para registro de actividades y reparaciones de mantenimiento.",
    aliases: [],
  },
  {
    id: "revision-tarimas",
    templateName: "Revisi\u00f3n de tarimas",
    boardName: "Revisi\u00f3n de tarimas - Fernando",
    category: "Revisi\u00f3n",
    description: "Plantilla oficial para revisi\u00f3n de tarimas con conteo, causales y evidencias.",
    aliases: ["revisi\u00f3n de tarimas", "revision de tarimas", "revisi\u00f3n de tarimas - fernando"],
  },
  {
    id: "actividades-limpieza",
    templateName: "Activiades de Limpieza",
    boardName: "Activiades de Limpieza",
    category: "Limpieza",
    description: "Plantilla oficial para control de actividades de limpieza.",
    aliases: ["activiades de limpieza", "actividades de limpieza", "control de actividades de limpieza"],
  },
  {
    id: "devoluciones-reacondicionado",
    templateName: "Devoluciones / Reacondicionado por tarima",
    boardName: "Devoluciones / Reacondicionado por tarima",
    category: "Revisi\u00f3n",
    description: "Plantilla oficial para flujo de escaneo continuo por tarima.",
    aliases: ["devoluciones / reacondicionado", "devoluciones y reacondicionado", "reacondicionado por tarima"],
  },
];

function stripRuntimeBoardSettings(settings = {}) {
  const {
    columnWidths,
    auxColumnWidths,
    ownerArea,
    systemBoardTemplateId,
    systemBoardLocked,
    ...rest
  } = settings;
  return {
    ...rest,
    systemBoardTemplateId: undefined,
    systemBoardLocked: undefined,
  };
}

function fieldToColumn(field = {}) {
  const column = {
    templateKey: field.templateKey || field.id || field.label,
    label: field.label,
    type: field.type,
    optionSource: field.optionSource,
    optionCatalogCategory: field.optionCatalogCategory,
    options: Array.isArray(field.options) ? [...field.options] : undefined,
    inventoryProperty: field.inventoryProperty,
    sourceFieldId: field.sourceFieldId,
    formulaOperation: field.formulaOperation,
    formulaLeftFieldId: field.formulaLeftFieldId,
    formulaRightFieldId: field.formulaRightFieldId,
    helpText: field.helpText,
    placeholder: field.placeholder,
    defaultValue: field.defaultValue,
    width: field.width,
    widthPx: field.widthPx,
    required: field.required,
    groupName: field.groupName,
    groupColor: field.groupColor,
    layoutBlockRole: field.layoutBlockRole,
  };
  Object.keys(column).forEach((key) => {
    if (column[key] === undefined || column[key] === null || column[key] === "") {
      if (!["defaultValue", "required", "options"].includes(key)) delete column[key];
    }
  });
  if (Array.isArray(column.options) && !column.options.length) delete column.options;
  return column;
}

function boardToTemplateDefinition(board, spec) {
  return {
    id: spec.id,
    name: spec.templateName || board?.name || spec.boardName,
    category: spec.category,
    description: spec.description,
    aliases: spec.aliases,
    settings: stripRuntimeBoardSettings(board?.settings || {}),
    columns: (board?.fields || []).map(fieldToColumn),
  };
}

function boardToPersistedTemplate(board, spec, existingTemplate) {
  const settings = {
    ...stripRuntimeBoardSettings(board?.settings || {}),
    systemBoardTemplateId: spec.id,
    systemBoardLocked: true,
  };
  return {
    id: existingTemplate?.id || `tpl-${spec.id}`,
    name: spec.templateName || board?.name || spec.boardName,
    category: spec.category,
    description: spec.description,
    isCustom: false,
    visibilityType: existingTemplate?.visibilityType || "department",
    sharedDepartments: existingTemplate?.sharedDepartments || [],
    sharedUserIds: existingTemplate?.sharedUserIds || [],
    createdById: existingTemplate?.createdById || board?.createdById || null,
    settings,
    columns: (board?.fields || []).map((field) => ({
      ...field,
      templateKey: field.templateKey || field.id || field.label,
    })),
  };
}

function serializeJsValue(value, indent = 0) {
  const pad = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return `[\n${value.map((item) => `${inner}${serializeJsValue(item, indent + 1)}`).join(",\n")}\n${pad}]`;
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  if (!entries.length) return "{}";
  return `{\n${entries.map(([key, val]) => `${inner}${key}: ${serializeJsValue(val, indent + 1)}`).join(",\n")}\n${pad}}`;
}

function renderSystemBoardTemplatesModule(definitions) {
  const body = definitions.map((template) => serializeJsValue(template, 1)).join(",\n");
  return `import { BOARD_ACTIVITY_LIST_FIELD } from "./constantes";

/** Plantillas oficiales de sistema (4 fijas). Configuracion tomada de tableros operativos. */
export const EXTRA_SYSTEM_BOARD_TEMPLATES = [
${body}
];

export const PROTECTED_SYSTEM_BOARD_TEMPLATE_IDS = new Set([
  "actividades-reparaciones",
  "actividades-limpieza",
  "revision-tarimas",
  "devoluciones-reacondicionado",
]);
`;
}

function matchesSpecBoard(board, spec) {
  if (!board) return false;
  if (board?.settings?.systemBoardTemplateId === spec.id) return true;
  if (board.name === spec.boardName) return true;
  if (spec.id === "revision-tarimas" && /revisi.n de tarimas/i.test(String(board.name || ""))) return true;
  if (spec.id === "actividades-limpieza" && /activi.* limpieza/i.test(String(board.name || ""))) return true;
  if (spec.id === "actividades-reparaciones" && /actividades y reparaciones/i.test(String(board.name || ""))) return true;
  if (spec.id === "devoluciones-reacondicionado" && /devoluciones.*reacondicionado/i.test(String(board.name || ""))) return true;
  return false;
}

function findBoard(state, spec) {
  const boards = Array.isArray(state.controlBoards) ? state.controlBoards : [];
  const templates = Array.isArray(state.boardTemplates) ? state.boardTemplates : [];
  const byBoard = boards.find((board) => matchesSpecBoard(board, spec));
  if (byBoard) return byBoard;
  const byTemplate = templates.find((entry) => matchesSpecBoard(entry, spec));
  if (byTemplate) {
    return {
      name: byTemplate.name,
      settings: byTemplate.settings,
      fields: byTemplate.columns || [],
      createdById: byTemplate.createdById,
    };
  }
  throw new Error(`No se encontro tablero/plantilla para ${spec.id}`);
}

function main() {
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const definitions = OFFICIAL_TEMPLATE_SPECS.map((spec) => boardToTemplateDefinition(findBoard(state, spec), spec));

  const existingTemplates = Array.isArray(state.boardTemplates) ? state.boardTemplates : [];
  const nextTemplates = OFFICIAL_TEMPLATE_SPECS.map((spec) => {
    const board = findBoard(state, spec);
    const existing = existingTemplates.find(
      (entry) => entry?.settings?.systemBoardTemplateId === spec.id || entry.name === spec.boardName,
    );
    return boardToPersistedTemplate(board, spec, existing);
  });

  state.boardTemplates = nextTemplates;
  state.controlBoards = (state.controlBoards || []).map((board) => {
    const spec = OFFICIAL_TEMPLATE_SPECS.find((entry) => matchesSpecBoard(board, entry));
    if (!spec) return board;
    return {
      ...board,
      settings: {
        ...(board.settings || {}),
        systemBoardTemplateId: spec.id,
        systemBoardLocked: true,
      },
    };
  });
  state.revision = Number(state.revision || 0) + 1;

  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  fs.writeFileSync(SYSTEM_TEMPLATES_JS, renderSystemBoardTemplatesModule(definitions), { encoding: "utf8" });

  console.log("Plantillas oficiales alineadas:");
  definitions.forEach((template) => console.log(`  - ${template.id} ù ${template.name} (${template.columns.length} columnas)`));
  console.log(`Actualizado ${STATE_PATH}`);
  console.log(`Actualizado ${SYSTEM_TEMPLATES_JS}`);
}

main();
