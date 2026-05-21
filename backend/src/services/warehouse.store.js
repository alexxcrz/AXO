import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { publicLoginDirectoryEnabled } from "../config/env.js";
import { INTERNAL_STORAGE_ONLY, isInternalStorageUrl } from "../config/storage.js";
import { hashPassword, isStrongPassword, isTemporaryPassword, verifyPassword } from "../utils/passwords.js";
import { sendIncidenciaAssignedEmail } from "./email-notifications.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Usar disco persistente de Render si está disponible
const dataDirectory = process.env.RENDER ? "/var/data" : path.resolve(__dirname, "../../data");
const dataFilePath = path.join(dataDirectory, "warehouse-state.json");
const backupDirectory = path.join(dataDirectory, "warehouse-state-backups");
const latestBackupFilePath = path.join(dataDirectory, "warehouse-state.previous.json");
const MAX_WAREHOUSE_STATE_BACKUPS = 24;
const OPERATIONAL_TIMEZONE = String(process.env.WAREHOUSE_OPERATIONAL_TIMEZONE || "America/Mexico_City").trim() || "America/Mexico_City";
const warehouseEvents = new EventEmitter();
export const BOOTSTRAP_MASTER_ID = "bootstrap-master";
const EMPTY_OBJECT = Object.freeze({});
const DEFAULT_CLEANING_SITE = "C3";
const BOARD_OPERATIONAL_CONTEXT_NONE = "none";
const BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE = "cleaningSite";
const BOARD_OPERATIONAL_CONTEXT_CUSTOM = "custom";
const BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE_OPTIONS = ["C1", "C2", "C3", "P"];
const INVENTORY_SYSTEM_COLUMNS = Object.freeze([
  { id: "invcol-base-lote", domain: "base", label: "Lote", key: "lote", createdAt: "1970-01-01T00:00:00.000Z", isSystem: true },
  { id: "invcol-base-caducidad", domain: "base", label: "Caducidad", key: "caducidad", createdAt: "1970-01-01T00:00:00.000Z", isSystem: true },
]);

const ROLE_LEAD = "Lead";
const ROLE_SR = "Senior (Sr)";
const ROLE_SSR = "Semi-Senior (Ssr)";
const ROLE_JR = "Junior (Jr)";
const PROCESS_AUDIT_QUESTION_TYPES = Object.freeze(["yesno", "text", "scale", "number", "date", "select", "multi"]);
const PROCESS_AUDIT_IMPACT_LEVELS = Object.freeze(["low", "medium", "high"]);
const PROCESS_AUDIT_LIFECYCLE_STATUSES = Object.freeze([
  "pending",
  "in_review",
  "proposal_sent",
  "accepted",
  "in_implementation",
  "in_validation",
  "closed",
]);
const PROCESS_AUDIT_PROPOSAL_TYPES = Object.freeze(["improvement", "correction", "redesign"]);
const PROCESS_AUDIT_EFFORT_LEVELS = Object.freeze(["low", "medium", "high"]);

const PAGE_PERMISSIONS = {
  index: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  customBoards: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  admin: [ROLE_LEAD, ROLE_SR],
  dashboard: [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  history: [ROLE_LEAD, ROLE_SR],
  processAudits: [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  inventory: [ROLE_LEAD, ROLE_SR],
  transport: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  users: [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  biblioteca: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  incidencias: [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  systemSettings: [ROLE_LEAD, ROLE_SR],
};

const ACTION_PERMISSIONS = {
  exportDashboardData:      [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  manageDashboardState:     [ROLE_LEAD],
  accessNavEsto:            [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavTransporte:      [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavLimpieza:        [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavRegulatorio:     [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavCalidad:         [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavInventario:      [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavRecepcion:       [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavOperaciones:     [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavMantenimiento:   [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavMayoreo:         [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavRetail:          [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavFullfilment:     [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavMejoraContinua:  [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavProduccion:      [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavRecursos:        [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  accessNavEquipo:          [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeEstoDashboard:       [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeEstoBoardBuilder:    [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeEstoMyBoards:        [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeEstoHistory:         [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeLimpiezaDashboard:   [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeLimpiezaBoardBuilder:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeLimpiezaMyBoards:    [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeLimpiezaHistory:     [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRegulatorioDashboard:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRegulatorioBoardBuilder:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRegulatorioMyBoards: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRegulatorioHistory:  [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeCalidadDashboard:    [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeCalidadBoardBuilder: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeCalidadMyBoards:     [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeCalidadHistory:      [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeInventarioDashboard: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeInventarioBoardBuilder:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeInventarioMyBoards:  [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeInventarioHistory:   [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRecepcionDashboard:  [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRecepcionBoardBuilder:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRecepcionMyBoards:   [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRecepcionHistory:    [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeOperacionesDashboard:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeOperacionesBoardBuilder:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeOperacionesMyBoards: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeOperacionesHistory:  [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeMantenimientoIncidencias:[ROLE_LEAD, ROLE_SR, ROLE_SSR],
  scopeMantenimientoDashboard:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeMantenimientoBoardBuilder:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeMantenimientoMyBoards:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeMantenimientoHistory:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeMayoreoDashboard:    [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeMayoreoBoardBuilder: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeMayoreoMyBoards:     [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeMayoreoHistory:      [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRetailDashboard:     [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRetailBoardBuilder:  [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRetailMyBoards:      [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeRetailHistory:       [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeFullfilmentDashboard:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeFullfilmentBoardBuilder:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeFullfilmentMyBoards: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeFullfilmentHistory:  [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeTransporteRegistrosEnvios:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeTransporteControl:   [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeTransporteIncidencias:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeTransporteConsolidados:[ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeTransporteDashboard: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  scopeTransporteLogistica: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  createWeek:              [ROLE_LEAD, ROLE_SR],
  deleteWeek:              [ROLE_LEAD, ROLE_SR],
  createCatalog:           [ROLE_LEAD, ROLE_SR],
  editCatalog:             [ROLE_LEAD, ROLE_SR],
  deleteCatalog:           [ROLE_LEAD, ROLE_SR],
  manageWeeks:             [ROLE_LEAD, ROLE_SR],
  managePermissions:       [ROLE_LEAD],
  createUsers:             [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  editUsers:               [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  deleteUsers:             [ROLE_LEAD, ROLE_SR],
  resetPasswords:          [ROLE_LEAD, ROLE_SR],
  manageInventory:         [ROLE_LEAD, ROLE_SR],
  deleteInventory:         [ROLE_LEAD, ROLE_SR],
  importInventory:         [ROLE_LEAD, ROLE_SR],
  viewBaseInventory:       [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageCleaningInventory: [ROLE_LEAD, ROLE_SR],
  deleteCleaningInventory: [ROLE_LEAD, ROLE_SR],
  importCleaningInventory: [ROLE_LEAD, ROLE_SR],
  viewCleaningInventory:   [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageOrderInventory:    [ROLE_LEAD, ROLE_SR],
  deleteOrderInventory:    [ROLE_LEAD, ROLE_SR],
  importOrderInventory:    [ROLE_LEAD, ROLE_SR],
  viewOrderInventory:      [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  viewTransportRetail:     [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageTransportRetail:   [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  viewTransportPedidos:    [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageTransportPedidos:  [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  viewTransportInventario: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageTransportInventario: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  viewTransportDocumentacion: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageTransportDocumentacion: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  viewTransportAssignments: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageTransportAssignments: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  viewTransportPostponed: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageTransportPostponed: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  viewTransportMyRoutes: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  viewTransportLogistics: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageTransportLogistics: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  viewTransportConsolidated: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  deleteTransportRecord: [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  createBoard:             [ROLE_LEAD, ROLE_SR],
  editBoard:               [ROLE_LEAD, ROLE_SR],
  deleteBoard:             [ROLE_LEAD, ROLE_SR],
  saveTemplate:            [ROLE_LEAD, ROLE_SR],
  editTemplate:            [ROLE_LEAD, ROLE_SR],
  deleteTemplate:          [ROLE_LEAD, ROLE_SR],
  createBoardFromTemplate: [ROLE_LEAD, ROLE_SR],
  createBoardRow:          [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  editFinishedBoardRow:    [ROLE_LEAD],
  boardWorkflow:           [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  duplicateBoard:          [ROLE_LEAD, ROLE_SR],
  duplicateBoardWithRows:  [ROLE_LEAD, ROLE_SR],
  exportBoardExcel:        [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  previewBoardPdf:         [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  exportBoardPdf:          [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  uploadBiblioteca:        [ROLE_LEAD, ROLE_SR],
  editBibliotecaName:      [ROLE_LEAD, ROLE_SR],
  deleteBiblioteca:        [ROLE_LEAD, ROLE_SR],
  createIncidencia:        [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  editIncidencia:          [ROLE_LEAD, ROLE_SR],
  deleteIncidencia:        [ROLE_LEAD, ROLE_SR],
  viewProcessAudits:       [ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR],
  manageProcessAudits:     [ROLE_LEAD, ROLE_SR, ROLE_SSR],
  manageProcessAuditTemplates: [ROLE_LEAD, ROLE_SR],
  manageSystemSettings:    [ROLE_LEAD, ROLE_SR],
  useCopmecAI:             [ROLE_LEAD],
};

const AREA_TAB_SCOPED_ACTION_CONFIG = [
  ["scopeEstoDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeEstoBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeEstoMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeEstoHistory", ["editHistoryRecords"]],
  ["scopeLimpiezaDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeLimpiezaBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeLimpiezaMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeLimpiezaHistory", ["editHistoryRecords"]],
  ["scopeRegulatorioDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeRegulatorioBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeRegulatorioMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeRegulatorioHistory", ["editHistoryRecords"]],
  ["scopeCalidadDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeCalidadBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeCalidadMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeCalidadHistory", ["editHistoryRecords"]],
  ["scopeInventarioDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeInventarioBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeInventarioMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeInventarioHistory", ["editHistoryRecords"]],
  ["scopeRecepcionDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeRecepcionBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeRecepcionMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeRecepcionHistory", ["editHistoryRecords"]],
  ["scopeOperacionesDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeOperacionesBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeOperacionesMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeOperacionesHistory", ["editHistoryRecords"]],
  ["scopeMayoreoDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeMayoreoBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeMayoreoMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeMayoreoHistory", ["editHistoryRecords"]],
  ["scopeRetailDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeRetailBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeRetailMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeRetailHistory", ["editHistoryRecords"]],
  ["scopeFullfilmentDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeFullfilmentBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeFullfilmentMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeFullfilmentHistory", ["editHistoryRecords"]],
  ["scopeMantenimientoIncidencias", ["createIncidencia", "editIncidencia", "deleteIncidencia"]],
  ["scopeMantenimientoDashboard", ["exportDashboardData", "manageDashboardState"]],
  ["scopeMantenimientoBoardBuilder", ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"]],
  ["scopeMantenimientoMyBoards", ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"]],
  ["scopeMantenimientoHistory", ["editHistoryRecords"]],
  ["scopeTransporteRegistrosEnvios", ["viewTransportRetail", "manageTransportRetail", "viewTransportPedidos", "manageTransportPedidos", "viewTransportInventario", "manageTransportInventario"]],
  ["scopeTransporteControl", ["viewTransportDocumentacion", "manageTransportDocumentacion", "viewTransportAssignments", "manageTransportAssignments", "viewTransportPostponed", "manageTransportPostponed", "viewTransportMyRoutes"]],
  ["scopeTransporteIncidencias", []],
  ["scopeTransporteConsolidados", ["viewTransportConsolidated"]],
  ["scopeTransporteDashboard", []],
  ["scopeTransporteLogistica", ["viewTransportLogistics", "manageTransportLogistics"]],
];

const getScopedAreaActionPermissionId = (scopeId, baseActionId) => `${scopeId}__${baseActionId}`;

Object.assign(
  ACTION_PERMISSIONS,
  Object.fromEntries(
    AREA_TAB_SCOPED_ACTION_CONFIG.flatMap(([scopeId, baseActionIds]) => baseActionIds.map((baseActionId) => [
      getScopedAreaActionPermissionId(scopeId, baseActionId),
      [...(ACTION_PERMISSIONS[baseActionId] || [])],
    ])),
  ),
);

const TRANSPORT_AREA_CONFIG = Object.freeze([
  {
    id: "foraneas",
    groupId: "retail",
    groupLabel: "Area retail",
    label: "Entregas foraneas",
    destinations: Object.freeze([
      "SUPER NATURISTA",
      "LA COMER",
      "SANBORNS",
      "GOMAFA (COSTCO)",
      "SAN PABLO",
      "H.E.B.",
      "CUBBO",
      "WALMART",
      "MELI",
    ]),
  },
  {
    id: "locales",
    groupId: "retail",
    groupLabel: "Area retail",
    label: "Entregas locales",
    destinations: Object.freeze([
      "COPPEL",
      "MEDINA",
      "FARMACIAS DEL AHORRO",
      "EL CARMEN",
    ]),
  },
  {
    id: "pedidos",
    groupId: "pedidos",
    groupLabel: "Area de pedidos",
    label: "Area de pedidos",
    destinations: Object.freeze([
      "DHL",
      "FEDEX",
      "ESTAFETA",
      "MERCADO LIBRE",
      "UPS",
      "IMILE",
      "MIEMBROS",
      "OTROS",
    ]),
  },
  {
    id: "inventarioTraslados",
    groupId: "inventario",
    groupLabel: "Inventario",
    label: "Inventario - traslados entre naves",
    destinations: Object.freeze([
      "CEDIS",
      "NAVE 1 (16 DE SEPTIEMBRE)",
      "NAVE GUADALUPE",
    ]),
  },
]);

function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  if (value.includes("lead") || value.includes("maestro")) return ROLE_LEAD;
  if (value.includes("semi") || value.includes("ssr")) return ROLE_SSR;
  if (value.includes("senior") || value.includes("administrador")) return ROLE_SR;
  return ROLE_JR;
}

function supportsManagedPermissionOverrides(role) {
  return true;
}

function defaultPassword() {
  // Generate a cryptographically random 12-char temporary password.
  // Format: Aa1!XXXXXXXX — guarantees strong-password policy compliance.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const specials = "!@#$%&*";
  const randomPart = Array.from(randomBytes(8)).map((b) => chars[b % chars.length]).join("");
  const specialChar = specials[randomBytes(1)[0] % specials.length];
  // Always starts with Aa1! prefix to satisfy all character-class requirements
  return `T${specialChar}1${randomPart}`;
}

function makeId(prefix) {
  // Use crypto.randomUUID() for unpredictable, cryptographically secure IDs.
  return `${prefix}-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfWeek(date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  return next;
}

function isoAt(date, hours, minutes) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getWeekName(date) {
  const weekStart = startOfWeek(date);
  return `Semana ${formatDate(weekStart)} - ${formatDate(endOfWeek(date))}`;
}

function getBoardWeekStart(date) {
  return startOfWeek(date);
}

function getBoardWeekEnd(date) {
  return addDays(getBoardWeekStart(date), 6);
}

function formatBoardWeekKey(date) {
  const target = getBoardWeekStart(date);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

function parseBoardWeekKey(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : getBoardWeekStart(parsed);
}

function getBoardWeekNameByKey(weekKey) {
  const weekStart = parseBoardWeekKey(weekKey) || getBoardWeekStart(new Date());
  return `Semana ${formatDate(weekStart)} - ${formatDate(getBoardWeekEnd(weekStart))}`;
}

function hasOwn(record, key) {
  return Object.hasOwn(record ?? EMPTY_OBJECT, key);
}

function normalizeBoardOperationalContextType(value) {
  const normalizedValue = normalizeKey(value).replaceAll(" ", "");
  if (["cleaningsite", "cleaning", "sedelimpieza"].includes(normalizedValue)) {
    return BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE;
  }
  if (["custom", "manual", "station", "estacion", "nave", "ubicacionoperativa"].includes(normalizedValue)) {
    return BOARD_OPERATIONAL_CONTEXT_CUSTOM;
  }
  return BOARD_OPERATIONAL_CONTEXT_NONE;
}

function normalizeBoardOperationalContextOptions(value, contextType = BOARD_OPERATIONAL_CONTEXT_NONE) {
  if (contextType === BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE) {
    return [...BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE_OPTIONS];
  }

  let sourceValues = [];
  if (Array.isArray(value)) {
    sourceValues = value;
  } else if (typeof value === "string") {
    sourceValues = value.split(/[;,]/);
  }
  const seen = new Set();

  return sourceValues
    .map((entry) => String(entry || "").trim())
    .filter((entry) => {
      const normalizedEntry = normalizeKey(entry);
      if (!normalizedEntry || seen.has(normalizedEntry)) return false;
      seen.add(normalizedEntry);
      return true;
    });
}

function normalizeBoardOperationalContextLabel(value, contextType = BOARD_OPERATIONAL_CONTEXT_NONE) {
  let fallbackLabel = "";
  if (contextType === BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE) {
    fallbackLabel = "Sede de limpieza";
  } else if (contextType === BOARD_OPERATIONAL_CONTEXT_CUSTOM) {
    fallbackLabel = "Ubicación operativa";
  }
  return String(value || "").trim() || fallbackLabel;
}

function normalizeBoardOperationalContextValue(value, contextType = BOARD_OPERATIONAL_CONTEXT_NONE, contextOptions = []) {
  if (contextType === BOARD_OPERATIONAL_CONTEXT_NONE) return "";
  if (contextType === BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE) {
    return normalizeCleaningSite(value, DEFAULT_CLEANING_SITE);
  }

  const trimmedValue = String(value || "").trim();
  if (!contextOptions.length) return trimmedValue;
  return contextOptions.includes(trimmedValue) ? trimmedValue : contextOptions[0] || "";
}

const SYSTEM_OPERATIONAL_NAVE_KEYS = ["C1", "C2", "C3", "P"];
const SYSTEM_OPERATIONAL_DEFAULT_PAUSE_REASONS = [
  { id: "material", label: "Falta de material", enabled: true, affectsTimer: false, authorizedMinutes: 10, dailyUsageLimit: 0 },
  { id: "operativa", label: "Detención operativa", enabled: true, affectsTimer: true, authorizedMinutes: 0, dailyUsageLimit: 0 },
  { id: "calidad", label: "Ajuste de calidad", enabled: true, affectsTimer: false, authorizedMinutes: 5, dailyUsageLimit: 0 },
];

function normalizeWeekdayOffsets(value) {
  const source = Array.isArray(value) ? value : [];
  const unique = new Set();
  source.forEach((entry) => {
    const numeric = Number(entry);
    if (!Number.isInteger(numeric)) return;
    if (numeric < 0 || numeric > 5) return;
    unique.add(numeric);
  });
  return Array.from(unique).sort((left, right) => left - right);
}

function normalizeSystemNaveWeekSchedule(value) {
  const source = value && typeof value === "object" ? value : EMPTY_OBJECT;
  const keys = Object.keys(source).length ? Object.keys(source) : SYSTEM_OPERATIONAL_NAVE_KEYS;
  return keys.reduce((accumulator, areaKey) => {
    const normalizedArea = normalizeBoardOwnerArea(areaKey) || normalizeAreaOption(areaKey);
    if (!normalizedArea) return accumulator;
    const previousDays = Array.isArray(accumulator[normalizedArea]) ? accumulator[normalizedArea] : [];
    const nextDays = normalizeWeekdayOffsets(source[areaKey]);
    accumulator[normalizedArea] = normalizeWeekdayOffsets(previousDays.concat(nextDays));
    return accumulator;
  }, {});
}

function normalizeSystemNaveWeekSchedules(value) {
  const source = value && typeof value === "object" ? value : EMPTY_OBJECT;
  const normalized = {};
  Object.entries(source).forEach(([weekKey, schedule]) => {
    const normalizedWeekKey = String(weekKey || "").trim();
    if (!normalizedWeekKey) return;
    normalized[normalizedWeekKey] = normalizeSystemNaveWeekSchedule(schedule);
  });
  return normalized;
}

function normalizeSystemPauseReasonEntry(value, fallback = null) {
  const source = value && typeof value === "object" ? value : EMPTY_OBJECT;
  const fallbackSource = fallback && typeof fallback === "object" ? fallback : EMPTY_OBJECT;
  const fallbackId = String(fallbackSource.id || "").trim();
  const normalizedId = String(source.id || fallbackId || "").trim() || makeId("pause-rule");
  const normalizedLabel = String(source.label || fallbackSource.label || "").trim() || "Pausa";
  const authorizedMinutesValue = Number(source.authorizedMinutes ?? fallbackSource.authorizedMinutes ?? 0);
  const dailyUsageLimitValue = Number(source.dailyUsageLimit ?? fallbackSource.dailyUsageLimit ?? 0);
  return {
    id: normalizedId,
    label: normalizedLabel,
    enabled: Boolean(source.enabled ?? fallbackSource.enabled ?? true),
    affectsTimer: Boolean(source.affectsTimer ?? fallbackSource.affectsTimer ?? false),
    authorizedMinutes: Number.isFinite(authorizedMinutesValue) ? Math.max(0, Math.round(authorizedMinutesValue)) : 0,
    dailyUsageLimit: Number.isFinite(dailyUsageLimitValue) ? Math.max(0, Math.round(dailyUsageLimitValue)) : 0,
  };
}

function normalizeWorkHoursWithMinutes(source = {}) {
  const rawStartHour = Number(source.startHour ?? 0);
  const rawStartMinute = Number(source.startMinute ?? 0);
  const rawEndHour = Number(source.endHour ?? 24);
  const rawEndMinute = Number(source.endMinute ?? 0);
  const startHour = Number.isFinite(rawStartHour) ? Math.min(23, Math.max(0, Math.round(rawStartHour))) : 0;
  const startMinute = Number.isFinite(rawStartMinute) ? Math.min(59, Math.max(0, Math.round(rawStartMinute))) : 0;
  const endHour = Number.isFinite(rawEndHour) ? Math.min(24, Math.max(0, Math.round(rawEndHour))) : 24;
  const endMinute = Number.isFinite(rawEndMinute) ? Math.min(59, Math.max(0, Math.round(rawEndMinute))) : 0;
  return { startHour, startMinute, endHour, endMinute };
}

const PAUSE_WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DEFAULT_OPERATIONAL_WORK_WEEK = {
  mon: { enabled: true, workHours: { startHour: 8, startMinute: 0, endHour: 16, endMinute: 0 } },
  tue: { enabled: true, workHours: { startHour: 8, startMinute: 0, endHour: 16, endMinute: 0 } },
  wed: { enabled: true, workHours: { startHour: 8, startMinute: 0, endHour: 16, endMinute: 0 } },
  thu: { enabled: true, workHours: { startHour: 8, startMinute: 0, endHour: 16, endMinute: 0 } },
  fri: { enabled: true, workHours: { startHour: 8, startMinute: 0, endHour: 16, endMinute: 0 } },
  sat: { enabled: true, workHours: { startHour: 8, startMinute: 0, endHour: 12, endMinute: 0 } },
  sun: { enabled: false, workHours: { startHour: 0, startMinute: 0, endHour: 24, endMinute: 0 } },
};

function normalizeWorkWeekSchedule(source, fallbackWorkHours = EMPTY_OBJECT) {
  const weekSource = source && typeof source === "object" ? source : EMPTY_OBJECT;
  return PAUSE_WEEKDAY_KEYS.reduce((accumulator, dayKey) => {
    const dayDefault = DEFAULT_OPERATIONAL_WORK_WEEK[dayKey] || { enabled: true, workHours: normalizeWorkHoursWithMinutes(fallbackWorkHours) };
    const daySource = weekSource[dayKey] && typeof weekSource[dayKey] === "object" ? weekSource[dayKey] : EMPTY_OBJECT;
    const hasOwnEnabled = Object.prototype.hasOwnProperty.call(daySource, "enabled");
    const mergedWorkHoursSource = daySource.workHours && typeof daySource.workHours === "object"
      ? daySource.workHours
      : daySource;
    accumulator[dayKey] = {
      enabled: hasOwnEnabled ? Boolean(daySource.enabled) : Boolean(dayDefault.enabled),
      workHours: normalizeWorkHoursWithMinutes(mergedWorkHoursSource || dayDefault.workHours || fallbackWorkHours),
    };
    return accumulator;
  }, {});
}

function normalizeAreaPauseControl(value) {
  const source = value && typeof value === "object" ? value : EMPTY_OBJECT;
  return {
    enabled: Boolean(source.enabled),
    workHours: normalizeWorkHoursWithMinutes(source.workHours),
  };
}

function resolveOperationalTimeZone(value) {
  const raw = String(value || "").trim();
  if (!raw) return OPERATIONAL_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw }).format(new Date());
    return raw;
  } catch {
    return OPERATIONAL_TIMEZONE;
  }
}

function normalizeSystemPauseControl(value) {
  const source = value && typeof value === "object" ? value : EMPTY_OBJECT;
  const fallbackReasons = SYSTEM_OPERATIONAL_DEFAULT_PAUSE_REASONS.map((reason) => normalizeSystemPauseReasonEntry(reason, reason));
  const reasonsSource = Array.isArray(source.reasons) ? source.reasons : fallbackReasons;
  const seen = new Set();
  const reasons = reasonsSource
    .map((reason, index) => normalizeSystemPauseReasonEntry(reason, fallbackReasons[index] || null))
    .filter((reason) => {
      const key = String(reason.id || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  
  const areaSource = source.areaPauseControls && typeof source.areaPauseControls === "object" ? source.areaPauseControls : {};
  const areaKeys = Object.keys(areaSource);
  const areaPauseControls = areaKeys.reduce((accumulator, areaKey) => {
    const normalizedArea = normalizeBoardOwnerArea(areaKey) || normalizeAreaOption(areaKey);
    if (!normalizedArea) return accumulator;
    const mergedCurrent = accumulator[normalizedArea] || normalizeAreaPauseControl(EMPTY_OBJECT);
    const rawAreaSource = areaSource[areaKey] && typeof areaSource[areaKey] === "object" ? areaSource[areaKey] : EMPTY_OBJECT;
    const normalizedIncoming = normalizeAreaPauseControl(rawAreaSource);
    accumulator[normalizedArea] = {
      enabled: Object.hasOwn(rawAreaSource, "enabled")
        ? Boolean(rawAreaSource.enabled)
        : Boolean(mergedCurrent.enabled),
      workHours: normalizeWorkHoursWithMinutes(normalizedIncoming.workHours || mergedCurrent.workHours || EMPTY_OBJECT),
    };
    return accumulator;
  }, {});

  return {
    reasons: reasons.length ? reasons : fallbackReasons,
    areaPauseControls,
  };
}

function getTimePartsInOperationalTimezone(nowMs, timeZone = OPERATIONAL_TIMEZONE) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: resolveOperationalTimeZone(timeZone),
      hourCycle: "h23",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = formatter.formatToParts(new Date(nowMs));
    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
    const weekdayRaw = String(parts.find((part) => part.type === "weekday")?.value || "").trim().toLowerCase();
    const weekdayMap = {
      mon: "mon",
      tue: "tue",
      wed: "wed",
      thu: "thu",
      fri: "fri",
      sat: "sat",
      sun: "sun",
    };
    const weekdayKey = weekdayMap[weekdayRaw.slice(0, 3)] || "mon";
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return { hour, minute, weekdayKey };
    }
  } catch {
    // Fallback to server local time if timezone resolution fails.
  }
  const now = new Date(nowMs);
  const jsDay = now.getDay();
  const weekdayByIndex = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    weekdayKey: weekdayByIndex[jsDay] || "mon",
  };
}

function isWithinPauseControlWorkHours(nowMs, workHours, workWeek = EMPTY_OBJECT, timeZone = OPERATIONAL_TIMEZONE) {
  const normalizedWeek = normalizeWorkWeekSchedule(workWeek, workHours);
  const timeParts = getTimePartsInOperationalTimezone(nowMs, timeZone);
  const dayConfig = normalizedWeek[timeParts.weekdayKey] && typeof normalizedWeek[timeParts.weekdayKey] === "object"
    ? normalizedWeek[timeParts.weekdayKey]
    : null;
  if (dayConfig && dayConfig.enabled === false) {
    return false;
  }

  const source = dayConfig?.workHours && typeof dayConfig.workHours === "object"
    ? dayConfig.workHours
    : (workHours && typeof workHours === "object" ? workHours : EMPTY_OBJECT);
  const startHour = Math.min(23, Math.max(0, Math.round(Number(source.startHour ?? 0))));
  const startMinute = Math.min(59, Math.max(0, Math.round(Number(source.startMinute ?? 0))));
  const endHour = Math.min(24, Math.max(0, Math.round(Number(source.endHour ?? 24))));
  const endMinute = Math.min(59, Math.max(0, Math.round(Number(source.endMinute ?? 0))));
  const startTotal = (startHour * 60) + startMinute;
  const endTotal = (endHour * 60) + endMinute;
  if (startTotal === endTotal) return false;

  const nowTotal = (timeParts.hour * 60) + timeParts.minute;
  return nowTotal >= startTotal && nowTotal < endTotal;
}

function normalizeSystemOperationalSettings(value) {
  const source = value && typeof value === "object" ? value : EMPTY_OBJECT;
  return {
    timeZone: resolveOperationalTimeZone(source.timeZone),
    naveWeekSchedules: normalizeSystemNaveWeekSchedules(source.naveWeekSchedules),
    pauseControl: normalizeSystemPauseControl(source.pauseControl),
  };
}

function withDefaultBoardSettings(settings) {
  const resolvedSettings = settings && typeof settings === "object" ? settings : undefined;
  const operationalContextType = normalizeBoardOperationalContextType(resolvedSettings?.operationalContextType);
  const operationalContextOptions = normalizeBoardOperationalContextOptions(resolvedSettings?.operationalContextOptions, operationalContextType);
  return {
    showWorkflow: true,
    showMetrics: true,
    showAssignee: true,
    showDates: true,
    ...resolvedSettings,
    ownerArea: normalizeBoardOwnerArea(resolvedSettings?.ownerArea),
    operationalContextType,
    operationalContextLabel: normalizeBoardOperationalContextLabel(resolvedSettings?.operationalContextLabel, operationalContextType),
    operationalContextOptions,
    operationalContextValue: normalizeBoardOperationalContextValue(resolvedSettings?.operationalContextValue, operationalContextType, operationalContextOptions),
  };
}

function normalizeBoardOwnerArea(areaValue) {
  const normalized = normalizeAreaOption(areaValue);
  if (!normalized || normalized === "SIN AREA") return "";
  return normalizeAreaOption(splitAreaAndSubArea(normalized).area || normalized);
}

function normalizeInventoryTransferTargets(targets, fallbackUnitLabel = "pzas") {
  const sourceTargets = Array.isArray(targets) ? targets : [];
  return sourceTargets
    .map((target) => normalizeInventoryTransferTargetRecord(target, fallbackUnitLabel))
    .filter((target) => target.warehouse || target.storageLocation || target.availableUnits > 0);
}

function resolveInventorySourceStockUnits(domain, rawStockUnits, transferTargets, stockTrackingMode) {
  if (domain !== "orders") {
    return rawStockUnits;
  }

  if (String(stockTrackingMode || "").trim().toLowerCase() === "source") {
    return rawStockUnits;
  }

  return Math.max(0, rawStockUnits - sumInventoryTransferTargetUnits(transferTargets));
}

function getInventoryTransferTargetSource(nextItem, currentItem) {
  if (Array.isArray(nextItem?.transferTargets) && nextItem.transferTargets.length) {
    return nextItem.transferTargets;
  }

  if (Array.isArray(currentItem?.transferTargets)) {
    return currentItem.transferTargets;
  }

  return [];
}

function resolveUserPasswordHash(incomingPassword, storedPasswordHash, previousUser, role) {
  if (incomingPassword) {
    return hashPassword(incomingPassword);
  }

  if (storedPasswordHash) {
    return storedPasswordHash;
  }

  if (previousUser?.passwordHash) {
    return previousUser.passwordHash;
  }

  return hashPassword(defaultPassword());
}

function resolveUserSessionVersion(previousUser, user, role, passwordHash, mustChangePassword) {
  if (!previousUser) {
    return Math.max(1, Number(user.sessionVersion || 1));
  }

  const previousSessionVersion = Math.max(1, Number(previousUser.sessionVersion || 1));
  const shouldIncrement = previousUser.passwordHash !== passwordHash
    || previousUser.role !== role
    || Boolean(previousUser.isActive) !== Boolean(user.isActive)
    || Boolean(previousUser.mustChangePassword) !== Boolean(mustChangePassword);

  return shouldIncrement ? previousSessionVersion + 1 : previousSessionVersion;
}

function normalizeBoardFields(board) {
  if (Array.isArray(board?.fields)) {
    return board.fields;
  }

  if (Array.isArray(board?.columns)) {
    return board.columns.map((field) => ({
      ...field,
      label: field.label || field.name,
      type: field.type || "text",
      colorRules: field.colorRules || [],
    }));
  }

  return [];
}

function normalizeMisplacedHistoryBoardEntry(snapshot) {
  const boardId = String(snapshot?.id || "").trim();
  if (!boardId || !boardId.startsWith("board-")) return null;
  const boardName = String(snapshot?.boardName || "").trim();
  if (!boardName) return null;
  if (String(snapshot?.boardId || "").trim()) return null;

  return {
    id: boardId,
    name: boardName,
    description: String(snapshot?.description || "").trim(),
    createdById: snapshot?.createdById ?? null,
    ownerId: snapshot?.ownerId ?? snapshot?.createdById ?? null,
    visibilityType: snapshot?.visibilityType || "users",
    sharedDepartments: Array.isArray(snapshot?.sharedDepartments) ? snapshot.sharedDepartments : [],
    accessUserIds: Array.isArray(snapshot?.accessUserIds) ? snapshot.accessUserIds : [],
    settings: withDefaultBoardSettings(snapshot?.settings),
    fields: normalizeBoardFields(snapshot),
    rows: Array.isArray(snapshot?.rows) ? snapshot.rows : [],
    permissions: snapshot?.permissions,
  };
}

function normalizeBoardWeeklyCycle(cycle, referenceDate = new Date()) {
  const weekStart = getBoardWeekStart(referenceDate);
  const activeWeekKey = String(cycle?.activeWeekKey || "").trim() || formatBoardWeekKey(weekStart);
  const parsedStart = parseBoardWeekKey(activeWeekKey) || weekStart;
  return {
    activeWeekKey: formatBoardWeekKey(parsedStart),
    activeWeekStartDate: cycle?.activeWeekStartDate || parsedStart.toISOString(),
    activeWeekEndDate: cycle?.activeWeekEndDate || getBoardWeekEnd(parsedStart).toISOString(),
    updatedAt: cycle?.updatedAt || new Date().toISOString(),
  };
}

function cloneBoardRowSnapshot(row) {
  const responsibleIds = normalizeBoardResponsibleIds(row?.responsibleIds, row?.responsibleId);
  return {
    ...row,
    responsibleId: responsibleIds[0] || "",
    responsibleIds,
    values: { ...(row?.values ?? EMPTY_OBJECT) },
    // Preserve UI-level computed or raw fields so backend history contains the board view
    sourceFields: Array.isArray(row?.sourceFields) ? row.sourceFields : row?.sourceFields || undefined,
    rowValues: row?.rowValues ?? undefined,
    rawRecord: row?.rawRecord ?? undefined,
    rawRowValues: row?.rawRowValues ?? undefined,
  };
}

function normalizeBoardHistorySnapshot(snapshot, permissions, fallbackUsers = []) {
  const ownerId = snapshot?.ownerId ?? snapshot?.createdById ?? fallbackUsers[0]?.id ?? null;
  const createdById = snapshot?.createdById ?? ownerId ?? fallbackUsers[0]?.id ?? null;
  const weekKey = String(snapshot?.weekKey || "").trim() || formatBoardWeekKey(new Date(snapshot?.startDate || Date.now()));
  const parsedWeekStart = parseBoardWeekKey(weekKey) || getBoardWeekStart(new Date(snapshot?.startDate || Date.now()));
  const visibility = resolveBoardVisibilitySnapshot(snapshot, ownerId);
  return {
    id: snapshot?.id || makeId("boardhist"),
    boardId: String(snapshot?.boardId || "").trim(),
    boardName: String(snapshot?.boardName || snapshot?.name || "Tablero").trim() || "Tablero",
    description: String(snapshot?.description || "").trim(),
    createdById,
    ownerId,
    visibilityType: visibility.visibilityType,
    sharedDepartments: visibility.sharedDepartments,
    accessUserIds: visibility.accessUserIds,
    weekKey,
    weekName: String(snapshot?.weekName || "").trim() || getBoardWeekNameByKey(weekKey),
    startDate: snapshot?.startDate || parsedWeekStart.toISOString(),
    endDate: snapshot?.endDate || getBoardWeekEnd(parsedWeekStart).toISOString(),
    archivedAt: snapshot?.archivedAt || new Date().toISOString(),
    settings: withDefaultBoardSettings(snapshot?.settings),
    fields: Array.isArray(snapshot?.fields)
      ? snapshot.fields.map((field) => ({ ...field, colorRules: field.colorRules || [] }))
      : [],
    permissions: normalizeBoardPermissions(snapshot?.permissions, permissions, snapshot),
    rows: Array.isArray(snapshot?.rows) ? snapshot.rows.map((row) => cloneBoardRowSnapshot(row)) : [],
  };
}

function buildBoardHistorySnapshot(board, weekKey, permissions, archivedAt = new Date().toISOString()) {
  const weekStart = parseBoardWeekKey(weekKey) || getBoardWeekStart(new Date());
  return normalizeBoardHistorySnapshot({
    id: makeId("boardhist"),
    boardId: board.id,
    boardName: board.name,
    description: board.description || "",
    createdById: board.createdById,
    ownerId: board.ownerId,
    visibilityType: board.visibilityType,
    sharedDepartments: board.sharedDepartments || [],
    accessUserIds: board.accessUserIds || [],
    weekKey,
    weekName: getBoardWeekNameByKey(weekKey),
    startDate: weekStart.toISOString(),
    endDate: getBoardWeekEnd(weekStart).toISOString(),
    archivedAt,
    settings: { ...(board.settings ?? EMPTY_OBJECT) },
    fields: (board.fields || []).map((field) => ({ ...field, colorRules: field.colorRules || [] })),
    permissions: board.permissions,
    rows: (board.rows || []).map((row) => cloneBoardRowSnapshot(row)),
  }, permissions);
}

function advanceBoardWeekKey(weekKey) {
  const current = parseBoardWeekKey(weekKey) || getBoardWeekStart(new Date());
  return formatBoardWeekKey(addDays(current, 7));
}

function applyAutomatedBoardWeeklyCut(state, referenceDate = new Date()) {
  const currentWeekStart = getBoardWeekStart(referenceDate);
  const currentWeekKey = formatBoardWeekKey(currentWeekStart);
  const normalizedCycle = normalizeBoardWeeklyCycle(state?.boardWeeklyCycle, referenceDate);
  let activeWeekKey = normalizedCycle.activeWeekKey;
  let nextBoards = (state?.controlBoards || []).map((board) => ({ ...board, rows: Array.isArray(board.rows) ? board.rows : [] }));
  let nextHistory = Array.isArray(state?.boardWeekHistory) ? [...state.boardWeekHistory] : [];
  let changed = activeWeekKey !== currentWeekKey;

  const isBoardRowActive = (row) => {
    const status = String(row?.status || "").trim().toLowerCase();
    return status !== "terminado";
  };

  while (activeWeekKey < currentWeekKey) {
    const archivedAt = new Date().toISOString();
    const existingKeys = new Set(nextHistory.map((snapshot) => `${snapshot.boardId}|${snapshot.weekKey}`));
    nextBoards.forEach((board) => {
      const snapshotKey = `${board.id}|${activeWeekKey}`;
      if (existingKeys.has(snapshotKey)) return;
      nextHistory.push(buildBoardHistorySnapshot(board, activeWeekKey, state.permissions, archivedAt));
      existingKeys.add(snapshotKey);
      changed = true;
    });
    nextBoards = nextBoards.map((board) => ({
      ...board,
      rows: (board.rows || []).filter(isBoardRowActive),
    }));
    activeWeekKey = advanceBoardWeekKey(activeWeekKey);
  }

  if (!changed) {
    return { state, changed: false };
  }

  return {
    changed: true,
    state: {
      ...state,
      controlBoards: nextBoards,
      boardWeekHistory: nextHistory,
      boardWeeklyCycle: {
        activeWeekKey: currentWeekKey,
        activeWeekStartDate: currentWeekStart.toISOString(),
        activeWeekEndDate: getBoardWeekEnd(currentWeekStart).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

function applyAutomatedBoardDailyRows(state, referenceDate = new Date()) {
  const todayKey = formatLocalDateKey(referenceDate);
  const weekdayOffset = getCatalogWeekdayOffset(referenceDate);
  let changed = false;

  const nextBoards = (state?.controlBoards || []).map((board) => {
    const fields = normalizeBoardFields(board);
    const activityListField = findBoardActivityListField(fields);
    const dateField = fields.find((field) => field?.type === "date") || null;
    if (!activityListField || !dateField) return board;

    const settings = withDefaultBoardSettings(board?.settings);
    const isCleaningContext = normalizeBoardOperationalContextType(settings?.operationalContextType) === BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE;
    const cleaningSite = isCleaningContext ? normalizeCleaningSite(settings?.operationalContextValue, "") : "";

    const expectedActivityNames = getBoardActivityListValuesForOperationalDay(
      activityListField,
      state?.catalog || [],
      weekdayOffset,
      cleaningSite,
    );
    if (!expectedActivityNames.length) return board;

    const rows = Array.isArray(board?.rows) ? [...board.rows] : [];
    const existingTodayActivities = new Set(
      rows
        .filter((row) => String(row?.values?.[dateField.id] || "").trim() === todayKey)
        .map((row) => normalizeKey(row?.values?.[activityListField.id] || ""))
        .filter(Boolean),
    );

    const missingActivityNames = expectedActivityNames.filter((activityName) => !existingTodayActivities.has(normalizeKey(activityName)));
    if (!missingActivityNames.length) return board;

    const addedRows = missingActivityNames.map((activityName) => createBoardRowRecord(fields, "", {
      status: "Pendiente",
      startTime: null,
      endTime: null,
      accumulatedSeconds: 0,
      lastResumedAt: null,
      lastPauseReason: "",
      pauseUsageByDay: {},
      pauseLogs: [],
      values: {
        [activityListField.id]: activityName,
        [dateField.id]: todayKey,
      },
    }));

    changed = true;
    return {
      ...board,
      fields,
      rows: rows.concat(addedRows),
    };
  });

  if (!changed) {
    return { state, changed: false };
  }

  return {
    changed: true,
    state: {
      ...state,
      controlBoards: nextBoards,
    },
  };
}

function normalizeInventoryDomain(value) {
  const key = String(value || "").trim().toLowerCase();
  if (["cleaning", "limpieza", "clean"].includes(key)) return "cleaning";
  if (["orders", "order", "pedidos", "pedido", "insumos para pedidos"].includes(key)) return "orders";
  return "base";
}

function normalizeInventoryColumnRecord(column = {}) {
  return {
    id: String(column?.id || makeId("invcol")).trim(),
    domain: normalizeInventoryDomain(column?.domain),
    label: String(column?.label || "").trim(),
    key: String(column?.key || "").trim(),
    createdAt: column?.createdAt || new Date().toISOString(),
    isSystem: Boolean(column?.isSystem),
  };
}

function withSystemInventoryColumns(columns = []) {
  const normalizedColumns = (Array.isArray(columns) ? columns : [])
    .map((entry) => normalizeInventoryColumnRecord(entry))
    .filter((entry) => entry.label && entry.key);

  const byDomainAndKey = new Map(normalizedColumns.map((entry) => [`${entry.domain}::${normalizeKey(entry.key)}`, entry]));

  const merged = [...normalizedColumns];
  INVENTORY_SYSTEM_COLUMNS.forEach((systemColumn) => {
    const key = `${systemColumn.domain}::${normalizeKey(systemColumn.key)}`;
    const existing = byDomainAndKey.get(key);
    if (existing) {
      const next = {
        ...existing,
        label: systemColumn.label,
        key: systemColumn.key,
        domain: systemColumn.domain,
        isSystem: true,
      };
      const index = merged.findIndex((entry) => entry.id === existing.id);
      if (index >= 0) merged[index] = next;
      return;
    }
    merged.push({ ...systemColumn });
  });

  return merged;
}

function inventoryDomainUsesPresentation(domain) {
  return normalizeInventoryDomain(domain) !== "orders";
}

function inventoryDomainUsesPackagingMetrics(domain) {
  return normalizeInventoryDomain(domain) === "base";
}

function normalizeInventoryTransferTargetSegment(value) {
  return String(value || "")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function buildInventoryTransferTargetKey(warehouse = "", storageLocation = "") {
  const normalizedWarehouse = normalizeInventoryTransferTargetSegment(warehouse) || "sin-destino";        
  const normalizedStorage = normalizeInventoryTransferTargetSegment(storageLocation) || "sin-resguardo";  
  return `${normalizedWarehouse}::${normalizedStorage}`;
}

function normalizeInventoryTransferTargetRecord(target, fallbackUnitLabel = "pzas") {
  const warehouse = String(target?.warehouse || "").trim();
  const storageLocation = String(target?.storageLocation || "").trim();
  return {
    destinationKey: buildInventoryTransferTargetKey(warehouse, storageLocation),
    warehouse,
    storageLocation,
    recipientName: String(target?.recipientName || "").trim(),
    unitLabel: String(target?.unitLabel || fallbackUnitLabel || "pzas").trim() || "pzas",
    availableUnits: Math.max(0, Number(target?.availableUnits ?? target?.stockUnits ?? 0)),
    updatedAt: target?.updatedAt || target?.createdAt || "",
  };
}

function sumInventoryTransferTargetUnits(targets = []) {
  return (Array.isArray(targets) ? targets : []).reduce((sum, target) => sum + Math.max(0, Number(target?.availableUnits || 0)), 0);
}

function mergeInventoryItemTransferTargets(currentItem, nextItem) {
  const nextDomain = normalizeInventoryDomain(nextItem?.domain || currentItem?.domain);
  if (nextDomain !== "orders") {
    return {
      ...nextItem,
      transferTargets: [],
    };
  }

  const sourceTargets = getInventoryTransferTargetSource(nextItem, currentItem);

  return {
    ...nextItem,
    transferTargets: normalizeInventoryTransferTargets(sourceTargets, nextItem?.unitLabel || currentItem?.unitLabel || "pzas"),
  };
}

function hasInventoryBalanceInput(value) {
  return !(value === undefined || value === null || String(value).trim() === "");
}

function normalizeCleaningSite(value, fallback = DEFAULT_CLEANING_SITE) {
  const key = String(value || "").trim().toLowerCase().replaceAll(" ", "");
  if (key === "c1") return "C1";
  if (key === "c2") return "C2";
  if (["c3", "principal", "main", "default"].includes(key)) return "C3";
  if (["p", "patio"].includes(key)) return "P";
  return fallback;
}

function resolveBoardOperationalCleaningSite(board) {
  const settings = withDefaultBoardSettings(board?.settings);
  const contextValue = String(settings?.operationalContextValue || "").trim();
  if (!contextValue) return "";
  return normalizeCleaningSite(contextValue, "");
}

function normalizeInventoryActivityIds(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)));
  }
  if (typeof value === "string") {
    return Array.from(new Set(value.split(/[;,]/).map((item) => String(item || "").trim()).filter(Boolean)));
  }
  return [];
}

function normalizeInventoryActivityConsumptions(value, fallbackActivityIds = [], fallbackConsumptionPerStart = 0) {
  const normalizedFallbackQuantity = Math.max(0, Number(fallbackConsumptionPerStart || 0));
  const consumptionMap = new Map();

  function rememberConsumption(rawCatalogActivityId, rawQuantity = 0) {
    const catalogActivityId = String(rawCatalogActivityId || "").trim();
    if (!catalogActivityId) return;

    const quantity = Math.max(0, Number(rawQuantity || 0));
    const currentEntry = consumptionMap.get(catalogActivityId);
    if (!currentEntry || quantity >= currentEntry.quantity) {
      consumptionMap.set(catalogActivityId, { catalogActivityId, quantity });
    }
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (entry && typeof entry === "object") {
        rememberConsumption(entry.catalogActivityId || entry.activityCatalogId || entry.id, entry.quantity);
        return;
      }
      rememberConsumption(entry, normalizedFallbackQuantity);
    });
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([catalogActivityId, quantity]) => rememberConsumption(catalogActivityId, quantity));
  } else if (typeof value === "string") {
    value.split(/[;,]/).forEach((entry) => {
      const trimmedEntry = String(entry || "").trim();
      if (!trimmedEntry) return;
      const [catalogActivityId, rawQuantity] = trimmedEntry.split(":");
      rememberConsumption(catalogActivityId, rawQuantity === undefined ? normalizedFallbackQuantity : rawQuantity);
    });
  }

  normalizeInventoryActivityIds(fallbackActivityIds).forEach((catalogActivityId) => {
    if (!consumptionMap.has(catalogActivityId)) {
      rememberConsumption(catalogActivityId, normalizedFallbackQuantity);
    }
  });

  return Array.from(consumptionMap.values());
}

function resolveBoardRowCatalogActivityId(board, row, catalog = []) {
  const directCatalogActivityId = String(row?.catalogActivityId || row?.values?.catalogActivityId || "").trim();
  if (directCatalogActivityId) {
    return directCatalogActivityId;
  }

  const activityListField = findBoardActivityListField(board?.fields || []);
  const activityName = activityListField ? String(row?.values?.[activityListField.id] || "").trim() : "";
  if (!activityName) {
    return "";
  }

  return String((catalog || []).find((item) => normalizeKey(item?.name) === normalizeKey(activityName))?.id || "").trim();
}

function applyBoardRowCleaningInventoryConsumption(currentState, row, board, currentUser, nowIso) {
  const catalogActivityId = resolveBoardRowCatalogActivityId(board, row, currentState.catalog || []);
  if (!catalogActivityId) {
    return currentState;
  }

  const targetCleaningSite = resolveBoardOperationalCleaningSite(board) || DEFAULT_CLEANING_SITE;

  const nextInventoryItems = [...(currentState.inventoryItems || [])];
  const nextInventoryMovements = [...(currentState.inventoryMovements || [])];
  let didChange = false;

  nextInventoryItems.forEach((currentItem, itemIndex) => {
    const normalizedItem = normalizeInventoryItemRecord(currentItem, currentItem.id);
    if (normalizedItem.domain !== "cleaning" || normalizedItem.cleaningSite !== targetCleaningSite) {
      return;
    }

    const activityConsumption = (normalizedItem.activityConsumptions || []).find((entry) => entry.catalogActivityId === catalogActivityId);
    const quantity = Math.max(0, Number(activityConsumption?.quantity || 0));
    if (!quantity || Number(normalizedItem.stockUnits || 0) < quantity) {
      return;
    }

    didChange = true;
    nextInventoryItems[itemIndex] = normalizeInventoryItemRecord({
      ...normalizedItem,
      stockUnits: Math.max(0, Number(normalizedItem.stockUnits || 0) - quantity),
    }, normalizedItem.id);

    nextInventoryMovements.unshift(normalizeInventoryMovementRecord({
      itemId: normalizedItem.id,
      itemCode: normalizedItem.code,
      itemName: normalizedItem.name,
      domain: normalizedItem.domain,
      movementType: "consume",
      quantity,
      unitLabel: normalizedItem.unitLabel || "pzas",
      notes: `Consumo automatico por inicio de actividad · ${targetCleaningSite}`,
      activityId: row?.id || null,
      catalogActivityId,
      storageLocation: normalizedItem.storageLocation,
      cleaningSite: normalizedItem.cleaningSite,
      performedById: currentUser?.id || null,
      createdAt: nowIso,
    }, normalizedItem));
  });

  if (!didChange) {
    return currentState;
  }

  return {
    ...currentState,
    inventoryItems: nextInventoryItems,
    inventoryMovements: nextInventoryMovements,
  };
}

function normalizeInventoryItemRecord(item, fallbackId = null) {
  const domain = normalizeInventoryDomain(item?.domain);
  const usesPresentation = inventoryDomainUsesPresentation(domain);
  const usesPackagingMetrics = inventoryDomainUsesPackagingMetrics(domain);
  const transferTargets = domain === "orders"
    ? normalizeInventoryTransferTargets(item?.transferTargets, item?.unitLabel || "pzas")
    : [];
  const rawStockUnits = Math.max(0, Number(item?.stockUnits || 0));
  const fallbackConsumptionPerStart = Math.max(0, Number(item?.consumptionPerStart || 0));
  const activityConsumptions = domain === "cleaning"
    ? normalizeInventoryActivityConsumptions(item?.activityConsumptions, item?.activityCatalogIds, fallbackConsumptionPerStart)
    : [];
  const customFields = item?.customFields && typeof item.customFields === "object"
    ? Object.fromEntries(Object.entries(item.customFields)
      .map(([key, value]) => [String(key || "").trim(), String(value || "").trim()])
      .filter(([key]) => key))
    : {};
  return {
    id: fallbackId || item?.id || makeId("inv"),
    code: String(item?.code || "").trim(),
    name: String(item?.name || "").trim(),
    presentation: usesPresentation ? String(item?.presentation || "").trim() : "",
    piecesPerBox: usesPackagingMetrics ? Number(item?.piecesPerBox || 0) : 0,
    boxesPerPallet: usesPackagingMetrics ? Number(item?.boxesPerPallet || 0) : 0,
    domain,
    stockUnits: resolveInventorySourceStockUnits(domain, rawStockUnits, transferTargets, item?.stockTrackingMode),
    minStockUnits: Math.max(0, Number(item?.minStockUnits || 0)),
    storageLocation: String(item?.storageLocation || "").trim(),
    cleaningSite: domain === "cleaning" ? normalizeCleaningSite(item?.cleaningSite) : "",
    unitLabel: String(item?.unitLabel || "pzas").trim() || "pzas",
    stockTrackingMode: domain === "orders" ? "source" : "",
    transferTargets,
    activityCatalogIds: activityConsumptions.map((entry) => entry.catalogActivityId),
    activityConsumptions,
    consumptionPerStart: fallbackConsumptionPerStart,
    customFields,
  };
}

function normalizeInventoryDestination(destination = EMPTY_OBJECT, fallbackId = null) {
  const warehouse = String(destination?.warehouse || "").trim();
  const storageLocation = String(destination?.storageLocation || "").trim();
  if (!warehouse || !storageLocation) return null;

  const recipientName = String(destination?.recipientName || "").trim();
  const nowIso = new Date().toISOString();
  const createdAt = String(destination?.createdAt || nowIso).trim() || nowIso;
  const updatedAt = String(destination?.updatedAt || nowIso).trim() || nowIso;

  return {
    id: fallbackId || String(destination?.id || "").trim() || makeId("invdest"),
    warehouse,
    storageLocation,
    recipientName,
    destinationKey: buildInventoryTransferTargetKey(warehouse, storageLocation),
    createdAt,
    updatedAt,
  };
}

function normalizeInventoryMovementType(value) {
  const key = String(value || "").trim().toLowerCase();
  if (["restock", "entrada", "reabasto", "reabastecimiento"].includes(key)) return "restock";
  if (["consume", "consumo", "usage", "uso"].includes(key)) return "consume";
  if (["transfer", "transferencia", "traslado"].includes(key)) return "transfer";
  return "restock";
}

function normalizeInventoryMovementRecord(movement, item = null, fallbackId = null) {
  const warehouse = String(movement?.warehouse || "").trim();
  const storageLocation = String(movement?.storageLocation || item?.storageLocation || "").trim();
  const remainingUnits = movement?.remainingUnits;
  const destinationBalanceUnits = movement?.destinationBalanceUnits;
  const destinationKey = warehouse || storageLocation
    ? buildInventoryTransferTargetKey(warehouse, storageLocation)
    : String(movement?.destinationKey || "").trim() || buildInventoryTransferTargetKey(warehouse, storageLocation);
  return {
    id: fallbackId || movement?.id || makeId("invmov"),
    itemId: String(movement?.itemId || item?.id || "").trim(),
    itemCode: String(movement?.itemCode || item?.code || "").trim(),
    itemName: String(movement?.itemName || item?.name || "").trim(),
    domain: normalizeInventoryDomain(movement?.domain || item?.domain),
    movementType: normalizeInventoryMovementType(movement?.movementType),
    quantity: Math.max(0, Number(movement?.quantity || 0)),
    unitLabel: String(movement?.unitLabel || item?.unitLabel || "pzas").trim() || "pzas",
    notes: String(movement?.notes || "").trim(),
    activityId: movement?.activityId ? String(movement.activityId).trim() : null,
    catalogActivityId: movement?.catalogActivityId ? String(movement.catalogActivityId).trim() : null,
    warehouse,
    recipientName: String(movement?.recipientName || "").trim(),
    storageLocation,
    cleaningSite: normalizeInventoryDomain(movement?.domain || item?.domain) === "cleaning" ? normalizeCleaningSite(movement?.cleaningSite || item?.cleaningSite) : "",
    remainingUnits: remainingUnits === undefined || remainingUnits === null || String(remainingUnits).trim() === "" ? null : Math.max(0, Number(remainingUnits || 0)),
    destinationBalanceUnits: destinationBalanceUnits === undefined || destinationBalanceUnits === null || String(destinationBalanceUnits).trim() === "" ? null : Math.max(0, Number(destinationBalanceUnits || 0)),
    destinationKey,
    performedById: String(movement?.performedById || "").trim() || null,
    createdAt: movement?.createdAt || new Date().toISOString(),
  };
}

function getDefaultInventoryItems() {
  return [
    normalizeInventoryItemRecord({ id: "inv-1", code: "ALM-001", name: "Tarima estándar", presentation: "Tarima", piecesPerBox: 1, boxesPerPallet: 1, domain: "base", stockUnits: 36, minStockUnits: 10, storageLocation: "Almacén central", unitLabel: "pzas" }),
    normalizeInventoryItemRecord({ id: "inv-2", code: "ALM-002", name: "Caja master", presentation: "Paquete", piecesPerBox: 20, boxesPerPallet: 48, domain: "base", stockUnits: 240, minStockUnits: 80, storageLocation: "Racks A-2", unitLabel: "pzas" }),
    normalizeInventoryItemRecord({ id: "inv-3", code: "ALM-003", name: "Playo transparente", presentation: "Rollo", piecesPerBox: 6, boxesPerPallet: 40, domain: "base", stockUnits: 120, minStockUnits: 36, storageLocation: "Racks B-1", unitLabel: "rollos" }),
    normalizeInventoryItemRecord({ id: "inv-4", code: "LIMP-001", name: "Detergente neutro multiusos", presentation: "Bidón 20 L · dilución 1:40", piecesPerBox: 0, boxesPerPallet: 0, domain: "cleaning", stockUnits: 12, minStockUnits: 4, cleaningSite: "C3", storageLocation: "Cuarto de limpieza · anaquel 1", unitLabel: "bidones", activityConsumptions: [{ catalogActivityId: "cat-piso", quantity: 1 }, { catalogActivityId: "cat-oficinas", quantity: 1 }] }),
    normalizeInventoryItemRecord({ id: "inv-5", code: "LIMP-002", name: "Papel higiénico jumbo", presentation: "Rollo jumbo 400 m", piecesPerBox: 0, boxesPerPallet: 0, domain: "cleaning", stockUnits: 96, minStockUnits: 24, cleaningSite: "C3", storageLocation: "Cuarto de limpieza · rack baños", unitLabel: "rollos", activityConsumptions: [{ catalogActivityId: "cat-banos", quantity: 2 }] }),
    normalizeInventoryItemRecord({ id: "inv-6", code: "PED-001", name: "Esquinero de cartón 2 x 2 x 48", presentation: "", piecesPerBox: 0, boxesPerPallet: 0, domain: "orders", stockUnits: 150, minStockUnits: 70, storageLocation: "Nave 1 · rack empaque", unitLabel: "pzas" }),
    normalizeInventoryItemRecord({ id: "inv-7", code: "PED-002", name: "Etiqueta térmica 4 x 6", presentation: "", piecesPerBox: 0, boxesPerPallet: 0, domain: "orders", stockUnits: 28, minStockUnits: 10, storageLocation: "Mesa de surtido · gaveta 2", unitLabel: "rollos" }),
  ];
}

function buildDefaultPermissions() {
  return {
    pages: Object.fromEntries(Object.entries(PAGE_PERMISSIONS).map(([key, roles]) => [key, { roles, userIds: [], departments: [] }])),
    actions: Object.fromEntries(Object.entries(ACTION_PERMISSIONS).map(([key, roles]) => [key, { roles, userIds: [], departments: [] }])),
  };
}

function normalizePermissionEntry(entry, fallbackRoles = []) {
  return {
    roles: Array.isArray(entry?.roles) ? entry.roles : fallbackRoles,
    userIds: Array.isArray(entry?.userIds) ? entry.userIds : [],
    departments: Array.isArray(entry?.departments) ? entry.departments : [],
  };
}

function normalizePermissions(permissions) {
  const defaults = buildDefaultPermissions();
  const normalized = {
    pages: Object.fromEntries(Object.keys(PAGE_PERMISSIONS).map((key) => [key, normalizePermissionEntry(permissions?.pages?.[key], defaults.pages[key].roles)])),
    actions: Object.fromEntries(Object.keys(ACTION_PERMISSIONS).map((key) => [key, normalizePermissionEntry(permissions?.actions?.[key], defaults.actions[key].roles)])),
    userOverrides: Object.fromEntries(Object.entries(permissions?.userOverrides ?? EMPTY_OBJECT).map(([userId, override]) => [
      userId,
      {
        pages: Object.fromEntries(Object.keys(PAGE_PERMISSIONS).map((key) => [key, typeof override?.pages?.[key] === "boolean" ? override.pages[key] : null])),
        actions: Object.fromEntries(Object.keys(ACTION_PERMISSIONS).map((key) => [key, typeof override?.actions?.[key] === "boolean" ? override.actions[key] : null])),
      },
    ])),
  };

  // Hard-lock default visibility: only LEAD has AI access unless explicit user override is set.
  if (normalized.actions?.useCopmecAI) {
    normalized.actions.useCopmecAI.roles = [ROLE_LEAD];
    normalized.actions.useCopmecAI.userIds = [];
    normalized.actions.useCopmecAI.departments = [];
  }

  return normalized;
}

function userMatchesPermissionEntry(user, entry) {
  if (!user || !entry) return false;
  const normalizedRole = normalizeRole(user.role);
  if (Array.isArray(entry.roles) && entry.roles.includes(normalizedRole)) return true;
  if (Array.isArray(entry.userIds) && entry.userIds.includes(user.id)) return true;
  const department = String(user.department || user.area || "").trim();
  if (department && Array.isArray(entry.departments) && entry.departments.includes(department)) return true;
  return false;
}

function buildBoardPermissions(basePermissions, board = null) {
  const ownerId = String(board?.ownerId || "").trim();
  const visibility = resolveBoardVisibilitySnapshot(board, ownerId);
  const visibilityUserIds = visibility.visibilityType === "all"
    ? []
    : Array.from(new Set([ownerId, ...visibility.accessUserIds].filter(Boolean)));
  return {
    isEnabled: false,
    visibility: {
      roles: [],
      userIds: visibilityUserIds,
      departments: visibility.visibilityType === "department" ? visibility.sharedDepartments : [],
    },
    actions: {
      createBoardRow: normalizePermissionEntry(basePermissions?.actions?.createBoardRow, ACTION_PERMISSIONS.createBoardRow),
      boardWorkflow: normalizePermissionEntry(basePermissions?.actions?.boardWorkflow, ACTION_PERMISSIONS.boardWorkflow),
      exportBoardExcel: normalizePermissionEntry(basePermissions?.actions?.exportBoardExcel, ACTION_PERMISSIONS.exportBoardExcel),
      previewBoardPdf: normalizePermissionEntry(basePermissions?.actions?.previewBoardPdf, ACTION_PERMISSIONS.previewBoardPdf),
      exportBoardPdf: normalizePermissionEntry(basePermissions?.actions?.exportBoardPdf, ACTION_PERMISSIONS.exportBoardPdf),
      duplicateBoard: normalizePermissionEntry(basePermissions?.actions?.duplicateBoard, ACTION_PERMISSIONS.duplicateBoard),
      duplicateBoardWithRows: normalizePermissionEntry(basePermissions?.actions?.duplicateBoardWithRows, ACTION_PERMISSIONS.duplicateBoardWithRows),
    },
  };
}

function normalizeBoardPermissions(permissions, basePermissions, board = null) {
  const defaults = buildBoardPermissions(basePermissions, board);
  return {
    isEnabled: Boolean(permissions?.isEnabled),
    visibility: normalizePermissionEntry(permissions?.visibility, defaults.visibility.roles),
    actions: {
      createBoardRow: normalizePermissionEntry(permissions?.actions?.createBoardRow, defaults.actions.createBoardRow.roles),
      boardWorkflow: normalizePermissionEntry(permissions?.actions?.boardWorkflow, defaults.actions.boardWorkflow.roles),
      exportBoardExcel: normalizePermissionEntry(permissions?.actions?.exportBoardExcel, defaults.actions.exportBoardExcel.roles),
      previewBoardPdf: normalizePermissionEntry(permissions?.actions?.previewBoardPdf, defaults.actions.previewBoardPdf.roles),
      exportBoardPdf: normalizePermissionEntry(permissions?.actions?.exportBoardPdf, defaults.actions.exportBoardPdf.roles),
      duplicateBoard: normalizePermissionEntry(permissions?.actions?.duplicateBoard, defaults.actions.duplicateBoard.roles),
      duplicateBoardWithRows: normalizePermissionEntry(permissions?.actions?.duplicateBoardWithRows, defaults.actions.duplicateBoardWithRows.roles),
    },
  };
}

function getOperationalDateKey(referenceDate = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: resolveOperationalTimeZone(OPERATIONAL_TIMEZONE),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(referenceDate);
    const year = String(parts.find((part) => part.type === "year")?.value || "").trim();
    const month = String(parts.find((part) => part.type === "month")?.value || "").trim();
    const day = String(parts.find((part) => part.type === "day")?.value || "").trim();
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fallback below.
  }
  return formatLocalDateKey(referenceDate);
}

function getTransportAreaConfig() {
  return TRANSPORT_AREA_CONFIG.map((entry) => ({
    id: entry.id,
    groupId: entry.groupId,
    groupLabel: entry.groupLabel,
    label: entry.label,
    destinations: [...entry.destinations],
  }));
}

function normalizeTransportEvidence(evidence = EMPTY_OBJECT) {
  const url = String(evidence?.url || "").trim();
  if (!url) return null;
  return {
    url,
    thumbnailUrl: String(evidence?.thumbnailUrl || url).trim(),
    name: String(evidence?.name || "evidencia").trim() || "evidencia",
    type: String(evidence?.type || "image").trim() || "image",
  };
}

function normalizeTransportAddress(address = EMPTY_OBJECT) {
  const customerName = String(address?.customerName || address?.name || "").trim();
  const addressText = String(address?.address || address?.fullAddress || "").trim();
  const destination = String(address?.destination || address?.routeLabel || customerName || "").trim();
  if (!customerName && !addressText && !destination) return null;

  const rawServiceType = String(address?.serviceType || "").trim().toLowerCase();
  const serviceType = ["local", "foraneo", "paqueteria", "traslado", "otro"].includes(rawServiceType)
    ? rawServiceType
    : "otro";

  return {
    id: String(address?.id || "").trim() || makeId("taddr"),
    customerName,
    destination,
    address: addressText,
    contactName: String(address?.contactName || "").trim(),
    phone: String(address?.phone || "").trim(),
    areaId: String(address?.areaId || "").trim() || null,
    serviceType,
    routeLabel: String(address?.routeLabel || "").trim() || null,
    notes: String(address?.notes || "").trim() || null,
    createdById: String(address?.createdById || "").trim() || null,
    createdByName: String(address?.createdByName || "").trim() || null,
    createdAt: String(address?.createdAt || "").trim() || new Date().toISOString(),
    updatedAt: String(address?.updatedAt || "").trim() || new Date().toISOString(),
  };
}

function normalizeTransportExpense(expense = EMPTY_OBJECT) {
  const amount = Number(expense?.amount);
  const description = String(expense?.description || expense?.concept || "").trim();
  const expenseType = String(expense?.expenseType || expense?.type || "").trim();
  if (!description && !expenseType && !Number.isFinite(amount)) return null;

  return {
    id: String(expense?.id || "").trim() || makeId("texp"),
    dateKey: String(expense?.dateKey || "").trim() || getOperationalDateKey(new Date()),
    expenseType,
    amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
    description,
    areaId: String(expense?.areaId || "").trim() || null,
    routeLabel: String(expense?.routeLabel || "").trim() || null,
    reference: String(expense?.reference || "").trim() || null,
    createdById: String(expense?.createdById || "").trim() || null,
    createdByName: String(expense?.createdByName || "").trim() || null,
    createdAt: String(expense?.createdAt || "").trim() || new Date().toISOString(),
    updatedAt: String(expense?.updatedAt || "").trim() || new Date().toISOString(),
  };
}

function normalizeTransportUnit(unit = EMPTY_OBJECT) {
  const unitName = String(unit?.unitName || unit?.name || "").trim();
  const plate = String(unit?.plate || "").trim();
  if (!unitName && !plate) return null;

  return {
    id: String(unit?.id || "").trim() || makeId("tunit"),
    unitName,
    unitCode: String(unit?.unitCode || "").trim() || null,
    plate: plate || null,
    model: String(unit?.model || "").trim() || null,
    areaId: String(unit?.areaId || "").trim() || null,
    notes: String(unit?.notes || "").trim() || null,
    photo: normalizeTransportEvidence(unit?.photo),
    createdById: String(unit?.createdById || "").trim() || null,
    createdByName: String(unit?.createdByName || "").trim() || null,
    createdAt: String(unit?.createdAt || "").trim() || new Date().toISOString(),
    updatedAt: String(unit?.updatedAt || "").trim() || new Date().toISOString(),
  };
}

function normalizeTransportChecklistItem(item = EMPTY_OBJECT) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const rawStatus = String(item?.status || "").trim().toLowerCase();
    const status = ["good", "bad", "na"].includes(rawStatus)
      ? rawStatus
      : (item?.ok === false ? "bad" : "good");
    return {
      status,
      label: String(item?.label || "").trim() || null,
      section: String(item?.section || "").trim() || null,
      notes: String(item?.notes || "").trim() || null,
      evidence: normalizeTransportEvidence(item?.evidence),
    };
  }

  if (typeof item === "boolean") {
    return {
      status: item ? "good" : "bad",
      label: null,
      section: null,
      notes: null,
      evidence: null,
    };
  }

  return {
    status: "good",
    label: null,
    section: null,
    notes: null,
    evidence: null,
  };
}

function normalizeTransportChecklist(checklist = EMPTY_OBJECT) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) return null;

  return Object.entries(checklist).reduce((acc, [rawKey, rawValue]) => {
    const key = String(rawKey || "").trim();
    if (!key) return acc;
    acc[key] = normalizeTransportChecklistItem(rawValue);
    return acc;
  }, {});
}

function normalizeTransportUnitServiceLog(log = EMPTY_OBJECT) {
  const unitId = String(log?.unitId || "").trim();
  const serviceLabel = String(log?.serviceLabel || "").trim();
  const hasChecklist = Boolean(log?.checklist && typeof log.checklist === "object");
  if (!unitId || (!serviceLabel && !hasChecklist)) return null;

  const kmBeforeRaw = Number(log?.kmBefore);
  const kmAfterRaw = Number(log?.kmAfter);
  const kmBefore = Number.isFinite(kmBeforeRaw) ? Math.max(0, kmBeforeRaw) : null;
  const kmAfter = Number.isFinite(kmAfterRaw) ? Math.max(0, kmAfterRaw) : null;
  const kmDelta = (kmBefore !== null && kmAfter !== null) ? Math.max(0, kmAfter - kmBefore) : null;

  return {
    id: String(log?.id || "").trim() || makeId("tunitlog"),
    unitId,
    dateKey: String(log?.dateKey || "").trim() || getOperationalDateKey(new Date()),
    serviceLabel,
    kmBefore,
    kmAfter,
    kmDelta,
    notes: String(log?.notes || "").trim() || null,
    evidence: normalizeTransportEvidence(log?.evidence),
    checklist: hasChecklist ? normalizeTransportChecklist(log.checklist) : null,
    createdById: String(log?.createdById || "").trim() || null,
    createdByName: String(log?.createdByName || "").trim() || null,
    createdAt: String(log?.createdAt || "").trim() || new Date().toISOString(),
    updatedAt: String(log?.updatedAt || "").trim() || new Date().toISOString(),
  };
}

function normalizeTransportRecord(record = EMPTY_OBJECT, fallbackId = null) {
  const boxes = Math.max(0, Number(record?.boxes || 0));
  const pieces = Math.max(0, Number(record?.pieces || 0));
  const validStatuses = ["Pendiente", "Pospuesto", "Asignado", "En camino", "Retorno", "Entregado", "Devuelto", "Cancelado"];
  const status = String(record?.status || "Pendiente").trim();
  
  return {
    id: fallbackId || String(record?.id || "").trim() || makeId("trn"),
    areaId: String(record?.areaId || "").trim(),
    destination: String(record?.destination || "").trim(),
    boxes: Number.isFinite(boxes) ? boxes : 0,
    pieces: Number.isFinite(pieces) ? pieces : 0,
    notes: String(record?.notes || "").trim(),
    evidence: normalizeTransportEvidence(record?.evidence),
    status: validStatuses.includes(status) ? status : "Pendiente",
    assignedTo: String(record?.assignedTo || "").trim() || null,
    assignedToName: String(record?.assignedToName || "").trim() || null,
    assignedByName: String(record?.assignedByName || "").trim() || null,
    assignedAt: String(record?.assignedAt || "").trim() || null,
    deliveredAt: String(record?.deliveredAt || "").trim() || null,
    returnReason: String(record?.returnReason || "").trim() || null,
    canceledReason: String(record?.canceledReason || "").trim() || null,
    postponedUntil: String(record?.postponedUntil || "").trim() || null,
    postponedReminderMinutes: Number.isFinite(Number(record?.postponedReminderMinutes)) ? Math.max(0, Number(record?.postponedReminderMinutes)) : 60,
    postponedRemindAt: String(record?.postponedRemindAt || "").trim() || null,
    postponedAt: String(record?.postponedAt || "").trim() || null,
    postponedById: String(record?.postponedById || "").trim() || null,
    postponedByName: String(record?.postponedByName || "").trim() || null,
    deliveryEvidence: normalizeTransportEvidence(record?.deliveryEvidence),
    shipmentCode: String(record?.shipmentCode || "").trim() || null,
    dateKey: String(record?.dateKey || "").trim(),
    createdById: String(record?.createdById || "").trim(),
    createdByName: String(record?.createdByName || "").trim(),
    createdAt: String(record?.createdAt || "").trim() || new Date().toISOString(),
    updatedAt: String(record?.updatedAt || "").trim() || new Date().toISOString(),
    archivedAt: String(record?.archivedAt || "").trim() || "",
  };
}

function resolveTransportShipmentPrefix(areaId = "") {
  const normalizedAreaId = String(areaId || "").trim();
  if (normalizedAreaId === "pedidos") return "PD";
  if (normalizedAreaId === "foraneas" || normalizedAreaId === "locales") return "RT";
  if (normalizedAreaId === "inventarioTraslados") return "IT";
  return "RT";
}

function resolveNextShipmentCode(records = [], prefix = "RT") {
  const normalizedPrefix = String(prefix || "RT").trim().toUpperCase();
  const pattern = new RegExp(`^${normalizedPrefix}(\\d{7})$`);
  const highest = (Array.isArray(records) ? records : []).reduce((maxValue, record) => {
    const rawCode = String(record?.shipmentCode || "").trim().toUpperCase();
    const match = rawCode.match(pattern);
    if (!match) return maxValue;
    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed)) return maxValue;
    return Math.max(maxValue, parsed);
  }, 0);
  return `${normalizedPrefix}${String(highest + 1).padStart(7, "0")}`;
}

function normalizeTransportState(rawTransport = EMPTY_OBJECT) {
  const todayKey = getOperationalDateKey(new Date());
  const activeDateKey = String(rawTransport?.activeDateKey || "").trim() || todayKey;
  const activeRecords = Array.isArray(rawTransport?.activeRecords)
    ? rawTransport.activeRecords.map((record) => normalizeTransportRecord(record, record?.id || null))
    : [];
  const historyRecords = Array.isArray(rawTransport?.historyRecords)
    ? rawTransport.historyRecords.map((record) => normalizeTransportRecord(record, record?.id || null))
    : [];
  const customerAddresses = Array.isArray(rawTransport?.customerAddresses)
    ? rawTransport.customerAddresses.map((address) => normalizeTransportAddress(address)).filter(Boolean)
    : [];
  const transportExpenses = Array.isArray(rawTransport?.transportExpenses)
    ? rawTransport.transportExpenses.map((expense) => normalizeTransportExpense(expense)).filter(Boolean)
    : [];
  const transportUnits = Array.isArray(rawTransport?.transportUnits)
    ? rawTransport.transportUnits.map((unit) => normalizeTransportUnit(unit)).filter(Boolean)
    : [];
  const transportUnitServiceLogs = Array.isArray(rawTransport?.transportUnitServiceLogs)
    ? rawTransport.transportUnitServiceLogs.map((log) => normalizeTransportUnitServiceLog(log)).filter(Boolean)
    : [];
  return {
    ...rawTransport,
    config: getTransportAreaConfig(),
    activeDateKey,
    activeRecords,
    historyRecords,
    customerAddresses,
    transportExpenses,
    transportUnits,
    transportUnitServiceLogs,
  };
}

function applyAutomatedTransportDailyCut(state) {
  const currentTransport = normalizeTransportState(state?.transport);
  const todayKey = getOperationalDateKey(new Date());
  if (currentTransport.activeDateKey === todayKey) {
    return { state, changed: false };
  }

  const nowIso = new Date().toISOString();
  const postponedCarryForward = currentTransport.activeRecords.filter(
    (record) => String(record?.status || "").trim() === "Pospuesto"
  );
  const recordsToArchive = currentTransport.activeRecords.filter(
    (record) => String(record?.status || "").trim() !== "Pospuesto"
  );

  const movedRecords = recordsToArchive.map((record) => ({
    ...record,
    dateKey: String(record?.dateKey || currentTransport.activeDateKey || todayKey).trim() || todayKey,
    archivedAt: nowIso,
    updatedAt: nowIso,
  }));

  return {
    changed: true,
    state: {
      ...state,
      transport: {
        ...currentTransport,
        activeDateKey: todayKey,
        activeRecords: postponedCarryForward,
        historyRecords: [...movedRecords, ...currentTransport.historyRecords].slice(0, 5000),
      },
    },
  };
}

function normalizeState(state, previousState = null) {
  const fallbackUsers = buildSampleState().users;
  const users = Array.isArray(state.users) && state.users.length ? state.users : fallbackUsers;
  const permissions = normalizePermissions(state.permissions);
  const fallbackCatalog = buildSampleState().catalog;
  const rawControlBoards = Array.isArray(state.controlBoards) ? state.controlBoards : [];
  const misplacedBoards = (Array.isArray(state.boardWeekHistory) ? state.boardWeekHistory : [])
    .map((snapshot) => normalizeMisplacedHistoryBoardEntry(snapshot))
    .filter(Boolean);
  const mergedControlBoards = rawControlBoards.concat(
    misplacedBoards.filter((candidate) => !rawControlBoards.some((board) => board?.id === candidate.id)),
  );

  return {
    ...state,
    system: {
      masterBootstrapEnabled: state.system?.masterBootstrapEnabled ?? !users.some((user) => normalizeRole(user.role) === ROLE_LEAD),
      masterUsername: "Maestro",
      ...(state.system ?? EMPTY_OBJECT),
      operational: normalizeSystemOperationalSettings(state.system?.operational),
    },
    users: users.map((user) => {
      const role = normalizeRole(user.role);
      const previousUser = previousState?.users?.find((item) => item.id === user.id) || null;
      const loginIdentifier = String((user.email ?? user.username ?? previousUser?.email) || "").trim();
      const incomingPassword = String(user.password || "").trim();
      const storedPasswordHash = String(user.passwordHash || "").trim();
      const mustChangePassword = typeof user.mustChangePassword === "boolean"
        ? user.mustChangePassword
        : Boolean(previousUser?.mustChangePassword);
      const passwordHash = resolveUserPasswordHash(incomingPassword, storedPasswordHash, previousUser, role);
      const sessionVersion = resolveUserSessionVersion(previousUser, user, role, passwordHash, mustChangePassword);
      return {
        ...user,
        email: loginIdentifier,
        role,
        passwordHash,
        password: undefined,
        mustChangePassword,
        temporaryPasswordIssuedAt: user.temporaryPasswordIssuedAt || previousUser?.temporaryPasswordIssuedAt || null,
        sessionVersion,
        managerId: user.managerId ?? null,
        createdById: user.createdById ?? user.managerId ?? null,
      };
    }),
    inventoryItems: Array.isArray(state.inventoryItems) ? state.inventoryItems.map((item) => normalizeInventoryItemRecord(item, item?.id)) : getDefaultInventoryItems(),
    inventoryColumns: withSystemInventoryColumns(state.inventoryColumns),
    inventoryMovements: Array.isArray(state.inventoryMovements) ? state.inventoryMovements.map((movement) => normalizeInventoryMovementRecord(movement, null, movement?.id)) : [],
    inventoryDestinations: Array.isArray(state.inventoryDestinations)
      ? state.inventoryDestinations.map((destination) => normalizeInventoryDestination(destination)).filter(Boolean)
      : [],
    catalog: Array.isArray(state.catalog) && state.catalog.length
      ? state.catalog.map((item) => sanitizeCatalogItemDraft(item, item?.id))
      : fallbackCatalog.map((item) => sanitizeCatalogItemDraft(item, item.id)),
    controlRows: Array.isArray(state.controlRows) ? state.controlRows : [],
    permissions,
    auditLog: Array.isArray(state.auditLog) ? state.auditLog : [],
    boardTemplates: Array.isArray(state.boardTemplates)
      ? state.boardTemplates
        .filter((template) => isAllowedPersistedBoardTemplateEntry(template))
        .map((template) => ({
          ...template,
          category: template.category || "Personalizada",
          visibilityType: template.visibilityType || "department",
          sharedDepartments: Array.isArray(template.sharedDepartments) ? template.sharedDepartments : [],
          sharedUserIds: Array.isArray(template.sharedUserIds) ? template.sharedUserIds : [],
        }))
      : [],
    boardWeeklyCycle: normalizeBoardWeeklyCycle(state.boardWeeklyCycle),
    boardWeekHistory: Array.isArray(state.boardWeekHistory)
      ? state.boardWeekHistory.map((snapshot) => normalizeBoardHistorySnapshot(snapshot, permissions, users))
      : [],
    controlBoards: mergedControlBoards.map((board) => {
          const ownerId = board.ownerId ?? board.createdById ?? users[0]?.id ?? null;
          const visibility = resolveBoardVisibilitySnapshot(board, ownerId);
          const normalizedBoard = {
            ...board,
            createdById: board.createdById ?? users[0]?.id ?? null,
            ownerId,
            visibilityType: visibility.visibilityType,
            sharedDepartments: visibility.sharedDepartments,
            accessUserIds: visibility.accessUserIds,
            settings: withDefaultBoardSettings(board.settings),
            fields: normalizeBoardFields(board),
            rows: Array.isArray(board.rows) ? board.rows : [],
          };
          return {
            ...normalizedBoard,
            permissions: normalizeBoardPermissions(board.permissions, permissions, normalizedBoard),
          };
        }),
    bibliotecaFiles: Array.isArray(state.bibliotecaFiles) ? state.bibliotecaFiles : [],
    bibliotecaNotifications: Array.isArray(state.bibliotecaNotifications) ? state.bibliotecaNotifications : [],
    customRoles: Array.isArray(state.customRoles) ? state.customRoles : [],
    processAuditTemplates: Array.isArray(state.processAuditTemplates)
      ? state.processAuditTemplates.map((template) => normalizeProcessAuditTemplate(template, template?.id || null))
      : [],
    processAudits: Array.isArray(state.processAudits)
      ? state.processAudits.map((audit) => normalizeProcessAuditRecord(audit, audit?.id || null))
      : [],
    transport: normalizeTransportState(state.transport),
    documentacion: normalizeDocumentacionState(state.documentacion),
    incidencias: Array.isArray(state.incidencias) ? state.incidencias : [],
    incidenciaNotifications: Array.isArray(state.incidenciaNotifications) ? state.incidenciaNotifications : [],
  };
}

function resolveTransportArea(stateTransport, areaId) {
  const normalizedAreaId = String(areaId || "").trim();
  return (stateTransport?.config || []).find((entry) => entry.id === normalizedAreaId) || null;
}

function getTransportActionIdsByArea(areaId = "") {
  const normalizedAreaId = String(areaId || "").trim();
  if (normalizedAreaId === "foraneas" || normalizedAreaId === "locales") {
    return { viewActionId: "viewTransportRetail", manageActionId: "manageTransportRetail" };
  }
  if (normalizedAreaId === "pedidos") {
    return { viewActionId: "viewTransportPedidos", manageActionId: "manageTransportPedidos" };
  }
  if (normalizedAreaId === "inventarioTraslados") {
    return { viewActionId: "viewTransportInventario", manageActionId: "manageTransportInventario" };
  }
  return { viewActionId: "", manageActionId: "" };
}

function sanitizeTransportRecordDraft(payload = EMPTY_OBJECT, stateTransport = EMPTY_OBJECT) {
  const areaId = String(payload?.areaId || "").trim();
  const area = resolveTransportArea(stateTransport, areaId);
  if (!area) return { ok: false, reason: "invalid_area" };

  const destination = String(payload?.destination || "").trim();
  const builtInDestinationSet = new Set(
    area.destinations
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const customDestinationSet = new Set(
    (Array.isArray(stateTransport?.customerAddresses) ? stateTransport.customerAddresses : [])
      .filter((entry) => String(entry?.areaId || "").trim() === areaId)
      .map((entry) => String(entry?.destination || entry?.routeLabel || entry?.customerName || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const normalizedDestination = destination.toLowerCase();
  if (!destination || (!builtInDestinationSet.has(normalizedDestination) && !customDestinationSet.has(normalizedDestination))) {
    return { ok: false, reason: "invalid_destination" };
  }

  const boxes = Math.max(0, Number(payload?.boxes || 0));
  const pieces = Math.max(0, Number(payload?.pieces || 0));
  if ((!Number.isFinite(boxes) || boxes < 0) || (!Number.isFinite(pieces) || pieces < 0) || (boxes === 0 && pieces === 0)) {
    return { ok: false, reason: "invalid_payload" };
  }

  const evidence = normalizeTransportEvidence(payload?.evidence);
  if (!evidence) {
    return { ok: false, reason: "evidence_required" };
  }

  return {
    ok: true,
    draft: {
      areaId,
      destination,
      boxes,
      pieces,
      notes: String(payload?.notes || "").trim(),
      evidence,
    },
  };
}

export function createWarehouseTransportRecord(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const baseState = getRawWarehouseState();
  const actionIds = getTransportActionIdsByArea(payload?.areaId);
  if (!actionIds.manageActionId || !canUserDoWarehouseAction(currentUser, actionIds.manageActionId, baseState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const dailyCutResult = applyAutomatedTransportDailyCut(baseState);
  const currentState = dailyCutResult.changed ? dailyCutResult.state : baseState;
  const transport = normalizeTransportState(currentState.transport);

  const sanitized = sanitizeTransportRecordDraft(payload, transport);
  if (!sanitized.ok) return sanitized;

  const nowIso = new Date().toISOString();
  const transportShipmentPrefix = resolveTransportShipmentPrefix(sanitized.draft.areaId);
  const nextShipmentCode = resolveNextShipmentCode([
    ...(Array.isArray(transport.activeRecords) ? transport.activeRecords : []),
    ...(Array.isArray(transport.historyRecords) ? transport.historyRecords : []),
  ], transportShipmentPrefix);
  const record = {
    id: makeId("trn"),
    ...sanitized.draft,
    shipmentCode: nextShipmentCode,
    status: "Pendiente",
    assignedTo: null,
    assignedToName: null,
    assignedByName: null,
    assignedAt: null,
    deliveredAt: null,
    postponedUntil: null,
    postponedReminderMinutes: 60,
    postponedRemindAt: null,
    postponedAt: null,
    postponedById: null,
    postponedByName: null,
    dateKey: transport.activeDateKey,
    createdById: currentUser.id,
    createdByName: currentUser.name,
    createdAt: nowIso,
    updatedAt: nowIso,
    archivedAt: "",
  };

  const nextState = {
    ...currentState,
    transport: {
      ...transport,
      activeRecords: [record, ...(transport.activeRecords || [])],
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), recordId: record.id };
}

export function updateWarehouseTransportRecord(auth, recordId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const baseState = getRawWarehouseState();
  const dailyCutResult = applyAutomatedTransportDailyCut(baseState);
  const currentState = dailyCutResult.changed ? dailyCutResult.state : baseState;
  const transport = normalizeTransportState(currentState.transport);
  const targetId = String(recordId || "").trim();
  if (!targetId) return { ok: false, reason: "record_not_found" };

  const activeIndex = (transport.activeRecords || []).findIndex((entry) => entry.id === targetId);
  const historyIndex = activeIndex === -1
    ? (transport.historyRecords || []).findIndex((entry) => entry.id === targetId)
    : -1;

  if (activeIndex === -1 && historyIndex === -1) {
    return { ok: false, reason: "record_not_found" };
  }

  const sourceRecord = activeIndex >= 0
    ? transport.activeRecords[activeIndex]
    : transport.historyRecords[historyIndex];

  const sourceActionIds = getTransportActionIdsByArea(sourceRecord?.areaId);
  if (!sourceActionIds.manageActionId || !canUserDoWarehouseAction(currentUser, sourceActionIds.manageActionId, baseState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const mergedDraft = {
    areaId: payload.areaId ?? sourceRecord.areaId,
    destination: payload.destination ?? sourceRecord.destination,
    boxes: payload.boxes ?? sourceRecord.boxes,
    pieces: payload.pieces ?? sourceRecord.pieces,
    notes: payload.notes ?? sourceRecord.notes,
    evidence: payload.evidence ?? sourceRecord.evidence,
  };

  const sanitized = sanitizeTransportRecordDraft(mergedDraft, transport);
  if (!sanitized.ok) return sanitized;

  const targetActionIds = getTransportActionIdsByArea(sanitized.draft.areaId);
  if (!targetActionIds.manageActionId || !canUserDoWarehouseAction(currentUser, targetActionIds.manageActionId, baseState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const nowIso = new Date().toISOString();
  const nextRecord = {
    ...sourceRecord,
    ...sanitized.draft,
    updatedAt: nowIso,
  };

  const nextState = {
    ...currentState,
    transport: {
      ...transport,
      activeRecords: activeIndex >= 0
        ? transport.activeRecords.map((entry, index) => (index === activeIndex ? nextRecord : entry))
        : transport.activeRecords,
      historyRecords: historyIndex >= 0
        ? transport.historyRecords.map((entry, index) => (index === historyIndex ? nextRecord : entry))
        : transport.historyRecords,
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), recordId: targetId };
}

export function updateWarehouseTransportLogistics(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageTransportLogistics", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const transport = normalizeTransportState(currentState.transport);
  const nextTransport = {
    ...transport,
    customerAddresses: Array.isArray(payload?.customerAddresses)
      ? payload.customerAddresses.map((address) => normalizeTransportAddress(address)).filter(Boolean)
      : transport.customerAddresses,
    transportExpenses: Array.isArray(payload?.transportExpenses)
      ? payload.transportExpenses.map((expense) => normalizeTransportExpense(expense)).filter(Boolean)
      : transport.transportExpenses,
    transportUnits: Array.isArray(payload?.transportUnits)
      ? payload.transportUnits.map((unit) => normalizeTransportUnit(unit)).filter(Boolean)
      : transport.transportUnits,
    transportUnitServiceLogs: Array.isArray(payload?.transportUnitServiceLogs)
      ? payload.transportUnitServiceLogs.map((log) => normalizeTransportUnitServiceLog(log)).filter(Boolean)
      : transport.transportUnitServiceLogs,
  };

  const nextState = {
    ...currentState,
    transport: nextTransport,
  };

  return { ok: true, state: replaceWarehouseState(nextState) };
}

export function deleteWarehouseTransportRecord(auth, recordId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const baseState = getRawWarehouseState();
  if (normalizeRole(currentUser?.role) !== ROLE_LEAD) return { ok: false, reason: "forbidden" };

  const dailyCutResult = applyAutomatedTransportDailyCut(baseState);
  const currentState = dailyCutResult.changed ? dailyCutResult.state : baseState;
  const transport = normalizeTransportState(currentState.transport);
  const targetId = String(recordId || "").trim();
  if (!targetId) return { ok: false, reason: "record_not_found" };

  const activeIndex = (transport.activeRecords || []).findIndex((entry) => entry.id === targetId);
  const historyIndex = activeIndex === -1
    ? (transport.historyRecords || []).findIndex((entry) => entry.id === targetId)
    : -1;

  if (activeIndex === -1 && historyIndex === -1) {
    return { ok: false, reason: "record_not_found" };
  }

  const sourceRecord = activeIndex >= 0
    ? transport.activeRecords[activeIndex]
    : transport.historyRecords[historyIndex];
  const sourceActionIds = getTransportActionIdsByArea(sourceRecord?.areaId);
  const canDelete = canUserDoWarehouseAction(currentUser, "deleteTransportRecord", baseState.permissions)
    || (sourceActionIds.manageActionId && canUserDoWarehouseAction(currentUser, sourceActionIds.manageActionId, baseState.permissions));
  if (!canDelete) return { ok: false, reason: "forbidden" };

  const nextState = {
    ...currentState,
    transport: {
      ...transport,
      activeRecords: activeIndex >= 0
        ? transport.activeRecords.filter((entry) => entry.id !== targetId)
        : transport.activeRecords,
      historyRecords: historyIndex >= 0
        ? transport.historyRecords.filter((entry) => entry.id !== targetId)
        : transport.historyRecords,
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), recordId: targetId, record: sourceRecord };
}

export function assignTransportRoute(auth, recordId, driverId = "") {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const baseState = getRawWarehouseState();
  const dailyCutResult = applyAutomatedTransportDailyCut(baseState);
  const currentState = dailyCutResult.changed ? dailyCutResult.state : baseState;
  const transport = normalizeTransportState(currentState.transport);
  const targetId = String(recordId || "").trim();
  const targetDriverId = String(driverId || "").trim();

  if (!targetId) return { ok: false, reason: "record_not_found" };
  if (!targetDriverId) return { ok: false, reason: "invalid_driver" };

  const activeIndex = (transport.activeRecords || []).findIndex((entry) => entry.id === targetId);
  const historyIndex = activeIndex === -1
    ? (transport.historyRecords || []).findIndex((entry) => entry.id === targetId)
    : -1;
  if (activeIndex === -1 && historyIndex === -1) return { ok: false, reason: "record_not_found" };

  const sourceRecord = activeIndex >= 0
    ? transport.activeRecords[activeIndex]
    : transport.historyRecords[historyIndex];
  const sourceActionIds = getTransportActionIdsByArea(sourceRecord?.areaId);
  if (!sourceActionIds.manageActionId || !canUserDoWarehouseAction(currentUser, sourceActionIds.manageActionId, baseState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  // Verificar que el driver existe y está activo
  const driver = findWarehouseUserById(targetDriverId);
  if (!driver?.isActive) return { ok: false, reason: "invalid_driver" };

  const nowIso = new Date().toISOString();
  const nextRecord = {
    ...sourceRecord,
    status: "Asignado",
    assignedTo: driver.id,
    assignedToName: driver.name,
    assignedByName: currentUser.name,
    assignedAt: nowIso,
    updatedAt: nowIso,
  };

  const nextState = {
    ...currentState,
    transport: {
      ...transport,
      activeRecords: activeIndex >= 0
        ? transport.activeRecords.map((entry, index) => (index === activeIndex ? nextRecord : entry))
        : [nextRecord, ...transport.activeRecords],
      historyRecords: historyIndex >= 0
        ? transport.historyRecords.filter((entry) => entry.id !== targetId)
        : transport.historyRecords,
    },
  };

  replaceWarehouseState(nextState);

  return { ok: true, recordId: targetId, record: nextRecord, driver };
}

export function updateTransportRecordStatus(auth, recordId, newStatus = "", deliveryEvidence = null) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const baseState = getRawWarehouseState();
  const dailyCutResult = applyAutomatedTransportDailyCut(baseState);
  const currentState = dailyCutResult.changed ? dailyCutResult.state : baseState;
  const transport = normalizeTransportState(currentState.transport);
  const targetId = String(recordId || "").trim();
  const statusValue = String(newStatus || "").trim();
  const reasonValue = String(deliveryEvidence?.reason || "").trim();
  const validStatuses = ["Pendiente", "Pospuesto", "Asignado", "En camino", "Retorno", "Entregado", "Devuelto", "Cancelado"];
  const terminalStatuses = new Set(["Entregado", "Devuelto", "Cancelado"]);

  if (!targetId) return { ok: false, reason: "record_not_found" };
  if (!validStatuses.includes(statusValue)) return { ok: false, reason: "invalid_status" };
  if (statusValue === "Retorno" && !reasonValue) return { ok: false, reason: "reason_required" };

  const activeIndex = (transport.activeRecords || []).findIndex((entry) => entry.id === targetId);
  if (activeIndex === -1) return { ok: false, reason: "record_not_found" };

  const sourceRecord = transport.activeRecords[activeIndex];

  // Solo el driver asignado puede cambiar status (o manager del área)
  const sourceActionIds = getTransportActionIdsByArea(sourceRecord?.areaId);
  const isDriver = sourceRecord.assignedTo === currentUser.id;
  const isManager = sourceActionIds.manageActionId && canUserDoWarehouseAction(currentUser, sourceActionIds.manageActionId, baseState.permissions);

  if (!isDriver && !isManager) {
    return { ok: false, reason: "forbidden" };
  }

  const nowIso = new Date().toISOString();
  const nextRecord = {
    ...sourceRecord,
    status: statusValue,
    updatedAt: nowIso,
  };

  if (statusValue === "Asignado" && !nextRecord.assignedTo) {
    nextRecord.assignedTo = currentUser.id;
    nextRecord.assignedToName = currentUser.name;
    nextRecord.assignedAt = nextRecord.assignedAt || nowIso;
  }

  if (statusValue === "Entregado") {
    nextRecord.deliveredAt = nowIso;
    if (deliveryEvidence) {
      nextRecord.deliveryEvidence = normalizeTransportEvidence(deliveryEvidence);
    }
  }

  if (statusValue === "Retorno") {
    nextRecord.returnReason = reasonValue;
  }

  if (statusValue === "Cancelado") {
    nextRecord.canceledReason = reasonValue || "Cancelado desde Mis rutas";
  }

  if (statusValue !== "Pospuesto") {
    nextRecord.postponedUntil = null;
    nextRecord.postponedRemindAt = null;
  }

  const nextActiveRecords = transport.activeRecords.filter((_, index) => index !== activeIndex);
  const nextHistoryRecords = terminalStatuses.has(statusValue)
    ? [
      {
        ...nextRecord,
        archivedAt: nowIso,
      },
      ...(transport.historyRecords || []),
    ]
    : (transport.historyRecords || []);

  const nextState = {
    ...currentState,
    transport: {
      ...transport,
      activeRecords: terminalStatuses.has(statusValue)
        ? nextActiveRecords
        : transport.activeRecords.map((entry, index) => (index === activeIndex ? nextRecord : entry)),
      historyRecords: nextHistoryRecords,
    },
  };

  replaceWarehouseState(nextState);

  return { ok: true, recordId: targetId, record: nextRecord };
}

export function getTransportRecordsByDriver(auth, driverId = "") {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const targetDriverId = String(driverId || "").trim();
  if (!targetDriverId) return { ok: false, reason: "invalid_driver" };

  const state = getRawWarehouseState();
  const transport = normalizeTransportState(state.transport);

  // Filtrar solo registros asignados al driver
  const terminalStatuses = new Set(["Entregado", "Devuelto", "Cancelado"]);
  const assignedRecords = (transport.activeRecords || []).filter(
    (record) => record.assignedTo === targetDriverId && !terminalStatuses.has(String(record.status || ""))
  );

  return {
    ok: true,
    records: assignedRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  };
}

export function getPendingTransportRecords(auth) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const state = getRawWarehouseState();
  const transport = normalizeTransportState(state.transport);

  // Filtrar solo registros Pendiente (sin asignar)
  const pendingRecords = (transport.activeRecords || []).filter((record) => record.status === "Pendiente");

  return {
    ok: true,
    records: pendingRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  };
}

// ─── Documentación ───────────────────────────────────────────────────────────

function normalizeDocumentacionEvidence(raw) {
  if (!raw || typeof raw !== "object") return null;
  const url = String(raw?.url || "").trim();
  if (!url) return null;
  return {
    url,
    thumbnailUrl: String(raw?.thumbnailUrl || url).trim(),
    name: String(raw?.name || "").trim(),
    type: String(raw?.type || "image").trim(),
  };
}

function normalizeDocumentacionRecord(record = EMPTY_OBJECT, fallbackId = null) {
  const validStatuses = ["Pendiente", "Asignado", "En camino", "Retorno", "Entregado", "Devuelto", "Cancelado"];
  const status = String(record?.status || "Pendiente").trim();
  return {
    id: fallbackId || String(record?.id || "").trim() || makeId("doc"),
    ubicacion: String(record?.ubicacion || "").trim(),
    area: String(record?.area || "").trim(),
    dirigidoA: String(record?.dirigidoA || "").trim(),
    notas: String(record?.notas || "").trim(),
    document: normalizeDocumentacionEvidence(record?.document),
    evidence: normalizeDocumentacionEvidence(record?.evidence),
    status: validStatuses.includes(status) ? status : "Pendiente",
    assignedTo: String(record?.assignedTo || "").trim() || null,
    assignedToName: String(record?.assignedToName || "").trim() || null,
    assignedByName: String(record?.assignedByName || "").trim() || null,
    assignedAt: String(record?.assignedAt || "").trim() || null,
    deliveredAt: String(record?.deliveredAt || "").trim() || null,
    returnReason: String(record?.returnReason || "").trim() || null,
    canceledReason: String(record?.canceledReason || "").trim() || null,
    shipmentCode: String(record?.shipmentCode || "").trim() || null,
    dateKey: String(record?.dateKey || "").trim(),
    createdById: String(record?.createdById || "").trim(),
    createdByName: String(record?.createdByName || "").trim(),
    createdAt: String(record?.createdAt || "").trim() || new Date().toISOString(),
    updatedAt: String(record?.updatedAt || "").trim() || new Date().toISOString(),
  };
}

function normalizeDocumentacionState(rawDoc = EMPTY_OBJECT) {
  const records = Array.isArray(rawDoc?.records)
    ? rawDoc.records.map((r) => normalizeDocumentacionRecord(r, r?.id || null))
    : [];
  const customAreas = Array.isArray(rawDoc?.customAreas)
    ? rawDoc.customAreas.map((a) => String(a || "").trim()).filter(Boolean)
    : [];
  return { records, customAreas };
}

export function getDocumentacionState() {
  const state = getRawWarehouseState();
  return normalizeDocumentacionState(state?.documentacion);
}

export function createDocumentacionRecord(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const ubicacion = String(payload?.ubicacion || "").trim();
  if (!["SONATA", "CEDIS"].includes(ubicacion)) return { ok: false, reason: "invalid_ubicacion" };

  const area = String(payload?.area || "").trim();
  if (!area) return { ok: false, reason: "area_required" };

  const dirigidoA = String(payload?.dirigidoA || "").trim();
  if (!dirigidoA) return { ok: false, reason: "dirigidoA_required" };

  const evidence = normalizeDocumentacionEvidence(payload?.evidence);
  if (!evidence) return { ok: false, reason: "evidence_required" };

  const currentState = getRawWarehouseState();
  const docState = normalizeDocumentacionState(currentState.documentacion);
  const nowIso = new Date().toISOString();
  const todayKey = getOperationalDateKey(new Date());
  const nextShipmentCode = resolveNextShipmentCode(docState.records || [], "DT");

  const record = {
    id: makeId("doc"),
    ubicacion,
    area,
    dirigidoA,
    notas: String(payload?.notas || "").trim(),
    document: null,
    evidence,
    shipmentCode: nextShipmentCode,
    status: "Pendiente",
    assignedTo: null,
    assignedToName: null,
    assignedByName: null,
    assignedAt: null,
    deliveredAt: null,
    dateKey: todayKey,
    createdById: currentUser.id,
    createdByName: currentUser.name,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const nextState = {
    ...currentState,
    documentacion: {
      ...docState,
      records: [record, ...docState.records],
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), recordId: record.id };
}

export function updateDocumentacionRecord(auth, recordId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const targetId = String(recordId || "").trim();
  if (!targetId) return { ok: false, reason: "record_not_found" };

  const currentState = getRawWarehouseState();
  const docState = normalizeDocumentacionState(currentState.documentacion);
  const index = docState.records.findIndex((r) => r.id === targetId);
  if (index === -1) return { ok: false, reason: "record_not_found" };

  const sourceRecord = docState.records[index];
  const ubicacion = String(payload?.ubicacion ?? sourceRecord.ubicacion).trim();
  if (!["SONATA", "CEDIS"].includes(ubicacion)) return { ok: false, reason: "invalid_ubicacion" };

  const area = String(payload?.area ?? sourceRecord.area).trim();
  if (!area) return { ok: false, reason: "area_required" };

  const dirigidoA = String(payload?.dirigidoA ?? sourceRecord.dirigidoA).trim();
  if (!dirigidoA) return { ok: false, reason: "dirigidoA_required" };

  const evidence = normalizeDocumentacionEvidence(payload?.evidence ?? sourceRecord.evidence);
  if (!evidence) return { ok: false, reason: "evidence_required" };

  const nowIso = new Date().toISOString();
  const nextRecord = {
    ...sourceRecord,
    ubicacion,
    area,
    dirigidoA,
    notas: String(payload?.notas ?? sourceRecord.notas).trim(),
    document: null,
    evidence,
    status: sourceRecord.status || "Pendiente",
    assignedTo: sourceRecord.assignedTo || null,
    assignedToName: sourceRecord.assignedToName || null,
    assignedByName: sourceRecord.assignedByName || null,
    assignedAt: sourceRecord.assignedAt || null,
    deliveredAt: sourceRecord.deliveredAt || null,
    updatedAt: nowIso,
  };

  const nextState = {
    ...currentState,
    documentacion: {
      ...docState,
      records: docState.records.map((r, i) => (i === index ? nextRecord : r)),
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), recordId: targetId };
}

export function assignDocumentacionRoute(auth, recordId, driverId = "") {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const targetId = String(recordId || "").trim();
  const targetDriverId = String(driverId || "").trim();
  if (!targetId) return { ok: false, reason: "record_not_found" };
  if (!targetDriverId) return { ok: false, reason: "invalid_driver" };

  const currentState = getRawWarehouseState();
  const docState = normalizeDocumentacionState(currentState.documentacion);
  const index = docState.records.findIndex((entry) => entry.id === targetId);
  if (index === -1) return { ok: false, reason: "record_not_found" };

  const driver = findWarehouseUserById(targetDriverId);
  if (!driver?.isActive) return { ok: false, reason: "invalid_driver" };

  const sourceRecord = docState.records[index];
  const nowIso = new Date().toISOString();
  const nextRecord = {
    ...sourceRecord,
    status: "Asignado",
    assignedTo: driver.id,
    assignedToName: driver.name,
    assignedByName: currentUser.name,
    assignedAt: nowIso,
    updatedAt: nowIso,
  };

  const nextState = {
    ...currentState,
    documentacion: {
      ...docState,
      records: docState.records.map((entry, entryIndex) => (entryIndex === index ? nextRecord : entry)),
    },
  };

  replaceWarehouseState(nextState);
  return { ok: true, recordId: targetId, record: nextRecord, driver };
}

export function updateDocumentacionRecordStatus(auth, recordId, newStatus = "", statusMeta = null) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const targetId = String(recordId || "").trim();
  const statusValue = String(newStatus || "").trim();
  const validStatuses = ["Pendiente", "Asignado", "En camino", "Retorno", "Entregado", "Devuelto", "Cancelado"];
  const reasonValue = String(statusMeta?.reason || "").trim();

  if (!targetId) return { ok: false, reason: "record_not_found" };
  if (!validStatuses.includes(statusValue)) return { ok: false, reason: "invalid_status" };
  if (statusValue === "Retorno" && !reasonValue) return { ok: false, reason: "reason_required" };

  const currentState = getRawWarehouseState();
  const docState = normalizeDocumentacionState(currentState.documentacion);
  const index = docState.records.findIndex((entry) => entry.id === targetId);
  if (index === -1) return { ok: false, reason: "record_not_found" };

  const sourceRecord = docState.records[index];
  const isDriver = sourceRecord.assignedTo === currentUser.id;
  const isCreator = sourceRecord.createdById === currentUser.id;
  if (!isDriver && !isCreator) {
    return { ok: false, reason: "forbidden" };
  }

  const nowIso = new Date().toISOString();
  const nextRecord = {
    ...sourceRecord,
    status: statusValue,
    updatedAt: nowIso,
  };

  if (statusValue === "Asignado" && !nextRecord.assignedTo) {
    nextRecord.assignedTo = currentUser.id;
    nextRecord.assignedToName = currentUser.name;
    nextRecord.assignedAt = nextRecord.assignedAt || nowIso;
  }

  if (statusValue === "Entregado") {
    nextRecord.deliveredAt = nowIso;
  }

  if (statusValue === "Retorno") {
    nextRecord.returnReason = reasonValue;
  }

  if (statusValue === "Cancelado") {
    nextRecord.canceledReason = reasonValue || "Cancelado desde Mis rutas";
  }

  const nextState = {
    ...currentState,
    documentacion: {
      ...docState,
      records: docState.records.map((entry, entryIndex) => (entryIndex === index ? nextRecord : entry)),
    },
  };

  replaceWarehouseState(nextState);
  return { ok: true, recordId: targetId, record: nextRecord };
}

export function addDocumentacionArea(auth, areaName) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const name = String(areaName || "").trim();
  if (!name) return { ok: false, reason: "name_required" };

  const currentState = getRawWarehouseState();
  const docState = normalizeDocumentacionState(currentState.documentacion);

  if (docState.customAreas.some((a) => a.toLowerCase() === name.toLowerCase())) {
    return { ok: false, reason: "already_exists" };
  }

  const nextState = {
    ...currentState,
    documentacion: {
      ...docState,
      customAreas: [...docState.customAreas, name],
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState) };
}

export function deleteDocumentacionArea(auth, areaName) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const name = String(areaName || "").trim();
  const currentState = getRawWarehouseState();
  const docState = normalizeDocumentacionState(currentState.documentacion);

  const nextState = {
    ...currentState,
    documentacion: {
      ...docState,
      customAreas: docState.customAreas.filter((a) => a.toLowerCase() !== name.toLowerCase()),
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState) };
}

// ─── Incidencias ─────────────────────────────────────────────────────────────
export function getIncidencias() {
  return getRawWarehouseState().incidencias || [];
}

export function createIncidencia(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "createIncidencia", currentState.permissions)) return { ok: false, reason: "forbidden" };

  if (!String(payload.title || "").trim()) return { ok: false, reason: "invalid_payload" };

  const payloadEvidencias = Array.isArray(payload.evidencias)
    ? payload.evidencias
        .map((evidencia, index) => {
          const url = String(evidencia?.url || "").trim();
          if (!url) return null;
          const thumbnailUrl = String(evidencia?.thumbnailUrl || url).trim();
          const name = String(evidencia?.name || `evidencia-${index + 1}`).trim();
          const type = String(evidencia?.type || "image").trim();
          return {
            id: crypto.randomUUID(),
            url,
            thumbnailUrl,
            name,
            type,
            uploadedById: currentUser.id,
            uploadedByName: currentUser.name,
            uploadedAt: new Date().toISOString(),
          };
        })
        .filter(Boolean)
    : [];

  const item = {
    id: crypto.randomUUID(),
    title: String(payload.title || "").trim(),
    description: String(payload.description || "").trim(),
    category: String(payload.category || "Otro").trim(),
    area: String(payload.area || "").trim(),
    priority: ["baja", "media", "alta", "critica"].includes(payload.priority) ? payload.priority : "media",
    status: "abierta",
    reportedById: currentUser.id,
    reportedByName: currentUser.name,
    assignedToId: String(payload.assignedToId || "").trim(),
    assignedToName: String(payload.assignedToName || "").trim(),
    estimatedCost: typeof payload.estimatedCost === "number" && payload.estimatedCost >= 0 ? payload.estimatedCost : null,
    actualCost: null,
    provider: String(payload.provider || "").trim(),
    invoiceNumber: String(payload.invoiceNumber || "").trim(),
    paymentStatus: "pendiente",
    resolution: "",
    evidencias: payloadEvidencias,
    cotizaciones: [],
    reportedAt: new Date().toISOString(),
    resolvedAt: null,
    updatedAt: new Date().toISOString(),
  };

  let nextState = { ...currentState, incidencias: [...(currentState.incidencias || []), item] };

  // Notificación al usuario asignado
  if (item.assignedToId) {
    const notif = {
      id: makeId("innotif"),
      incidenciaId: item.id,
      incidenciaTitle: item.title,
      priority: item.priority,
      assignedToId: item.assignedToId,
      assignedToName: item.assignedToName,
      assignedById: currentUser.id,
      assignedByName: currentUser.name,
      createdAt: new Date().toISOString(),
    };
    const prevNotifs = nextState.incidenciaNotifications || [];
    nextState = { ...nextState, incidenciaNotifications: [...prevNotifs, notif].slice(-200) };

    const assignedUser = (nextState.users || []).find((user) => String(user?.id || "") === item.assignedToId);
    const assignedEmail = String(assignedUser?.email || assignedUser?.username || "").trim();
    if (assignedEmail && assignedEmail.includes("@")) {
      sendIncidenciaAssignedEmail({
        to: assignedEmail,
        incidenciaTitle: item.title,
        incidenciaPriority: item.priority,
        assignedByName: currentUser.name,
        assignedToName: item.assignedToName || assignedUser?.name || assignedUser?.username || "usuario",
      }).catch((err) => {
        console.warn("[Email] No se pudo enviar correo de incidencia asignada:", err?.message || err);
      });
    }
  }

  return { ok: true, state: replaceWarehouseState(nextState), itemId: item.id };
}

export function updateIncidencia(auth, itemId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editIncidencia", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existing = (currentState.incidencias || []).find((i) => i.id === itemId);
  if (!existing) return { ok: false, reason: "item_not_found" };

  const resolvedAt = payload.status === "resuelta" || payload.status === "cerrada"
    ? (existing.resolvedAt || new Date().toISOString())
    : payload.status === "abierta" || payload.status === "en_proceso" ? null : existing.resolvedAt;

  const updated = {
    ...existing,
    title: String(payload.title ?? existing.title).trim(),
    description: String(payload.description ?? existing.description).trim(),
    category: String(payload.category ?? existing.category).trim(),
    area: String(payload.area ?? existing.area).trim(),
    priority: ["baja", "media", "alta", "critica"].includes(payload.priority) ? payload.priority : existing.priority,
    status: ["abierta", "en_proceso", "resuelta", "cerrada"].includes(payload.status) ? payload.status : existing.status,
    assignedToId: payload.assignedToId !== undefined ? String(payload.assignedToId || "").trim() : existing.assignedToId,
    assignedToName: payload.assignedToName !== undefined ? String(payload.assignedToName || "").trim() : existing.assignedToName,
    estimatedCost: typeof payload.estimatedCost === "number" ? payload.estimatedCost : existing.estimatedCost,
    actualCost: typeof payload.actualCost === "number" ? payload.actualCost : existing.actualCost,
    provider: payload.provider !== undefined ? String(payload.provider || "").trim() : existing.provider,
    invoiceNumber: payload.invoiceNumber !== undefined ? String(payload.invoiceNumber || "").trim() : existing.invoiceNumber,
    paymentStatus: ["pendiente", "pagado", "cancelado"].includes(payload.paymentStatus) ? payload.paymentStatus : existing.paymentStatus,
    resolution: payload.resolution !== undefined ? String(payload.resolution || "").trim() : existing.resolution,
    resolvedAt,
    updatedAt: new Date().toISOString(),
  };

  const newAssignedId = updated.assignedToId;
  const oldAssignedId = existing.assignedToId;
  let finalState = { ...currentState, incidencias: (currentState.incidencias || []).map((i) => i.id === itemId ? updated : i) };

  // Notificación si se asignó por primera vez o cambió el asignado
  if (newAssignedId && newAssignedId !== oldAssignedId) {
    const notif = {
      id: makeId("innotif"),
      incidenciaId: updated.id,
      incidenciaTitle: updated.title,
      priority: updated.priority,
      assignedToId: updated.assignedToId,
      assignedToName: updated.assignedToName,
      assignedById: currentUser.id,
      assignedByName: currentUser.name,
      createdAt: new Date().toISOString(),
    };
    const prevNotifs = finalState.incidenciaNotifications || [];
    finalState = { ...finalState, incidenciaNotifications: [...prevNotifs, notif].slice(-200) };

    const assignedUser = (finalState.users || []).find((user) => String(user?.id || "") === updated.assignedToId);
    const assignedEmail = String(assignedUser?.email || assignedUser?.username || "").trim();
    if (assignedEmail && assignedEmail.includes("@")) {
      sendIncidenciaAssignedEmail({
        to: assignedEmail,
        incidenciaTitle: updated.title,
        incidenciaPriority: updated.priority,
        assignedByName: currentUser.name,
        assignedToName: updated.assignedToName || assignedUser?.name || assignedUser?.username || "usuario",
      }).catch((err) => {
        console.warn("[Email] No se pudo enviar correo de incidencia asignada:", err?.message || err);
      });
    }
  }

  return { ok: true, state: replaceWarehouseState(finalState), itemId };
}

export function addEvidenciaToIncidencia(auth, itemId, evidencia) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editIncidencia", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existing = (currentState.incidencias || []).find((i) => i.id === itemId);
  if (!existing) return { ok: false, reason: "item_not_found" };

  const newEvidencia = {
    id: crypto.randomUUID(),
    url: String(evidencia.url || "").trim(),
    thumbnailUrl: String(evidencia.thumbnailUrl || evidencia.url || "").trim(),
    name: String(evidencia.name || "archivo").trim(),
    type: String(evidencia.type || "image").trim(),
    uploadedById: currentUser.id,
    uploadedByName: currentUser.name,
    uploadedAt: new Date().toISOString(),
  };

  if (!newEvidencia.url) return { ok: false, reason: "invalid_payload" };

  const updated = { ...existing, evidencias: [...(existing.evidencias || []), newEvidencia], updatedAt: new Date().toISOString() };
  const nextState = { ...currentState, incidencias: (currentState.incidencias || []).map((i) => i.id === itemId ? updated : i) };
  return { ok: true, state: replaceWarehouseState(nextState), itemId };
}

export function removeEvidenciaFromIncidencia(auth, itemId, evidenciaId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editIncidencia", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existing = (currentState.incidencias || []).find((i) => i.id === itemId);
  if (!existing) return { ok: false, reason: "item_not_found" };

  const updated = { ...existing, evidencias: (existing.evidencias || []).filter((e) => e.id !== evidenciaId), updatedAt: new Date().toISOString() };
  const nextState = { ...currentState, incidencias: (currentState.incidencias || []).map((i) => i.id === itemId ? updated : i) };
  return { ok: true, state: replaceWarehouseState(nextState), itemId };
}

export function addCotizacionToIncidencia(auth, itemId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editIncidencia", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existing = (currentState.incidencias || []).find((i) => i.id === itemId);
  if (!existing) return { ok: false, reason: "item_not_found" };
  if (!String(payload.proveedor || "").trim()) return { ok: false, reason: "invalid_payload" };

  const cotizacion = {
    id: crypto.randomUUID(),
    proveedor: String(payload.proveedor || "").trim(),
    descripcion: String(payload.descripcion || "").trim(),
    monto: typeof payload.monto === "number" && payload.monto >= 0 ? payload.monto : 0,
    tiempoEntrega: String(payload.tiempoEntrega || "").trim(),
    distanciaKm: typeof payload.distanciaKm === "number" && payload.distanciaKm >= 0 ? payload.distanciaKm : 0,
    consumoLitros100km: typeof payload.consumoLitros100km === "number" && payload.consumoLitros100km > 0 ? payload.consumoLitros100km : 10,
    precioCombustible: typeof payload.precioCombustible === "number" && payload.precioCombustible > 0 ? payload.precioCombustible : 0,
    archivoUrl: String(payload.archivoUrl || "").trim(),
    archivoNombre: String(payload.archivoNombre || "").trim(),
    notas: String(payload.notas || "").trim(),
    seleccionada: false,
    creadaAt: new Date().toISOString(),
  };

  const updated = { ...existing, cotizaciones: [...(existing.cotizaciones || []), cotizacion], updatedAt: new Date().toISOString() };
  const nextState = { ...currentState, incidencias: (currentState.incidencias || []).map((i) => i.id === itemId ? updated : i) };
  return { ok: true, state: replaceWarehouseState(nextState), itemId };
}

export function updateCotizacion(auth, itemId, cotizacionId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editIncidencia", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existing = (currentState.incidencias || []).find((i) => i.id === itemId);
  if (!existing) return { ok: false, reason: "item_not_found" };
  const existingCot = (existing.cotizaciones || []).find((c) => c.id === cotizacionId);
  if (!existingCot) return { ok: false, reason: "cotizacion_not_found" };

  const updatedCot = {
    ...existingCot,
    proveedor: payload.proveedor !== undefined ? String(payload.proveedor || "").trim() : existingCot.proveedor,
    descripcion: payload.descripcion !== undefined ? String(payload.descripcion || "").trim() : existingCot.descripcion,
    monto: typeof payload.monto === "number" ? payload.monto : existingCot.monto,
    tiempoEntrega: payload.tiempoEntrega !== undefined ? String(payload.tiempoEntrega || "").trim() : existingCot.tiempoEntrega,
    distanciaKm: typeof payload.distanciaKm === "number" ? payload.distanciaKm : existingCot.distanciaKm,
    consumoLitros100km: typeof payload.consumoLitros100km === "number" ? payload.consumoLitros100km : existingCot.consumoLitros100km,
    precioCombustible: typeof payload.precioCombustible === "number" ? payload.precioCombustible : existingCot.precioCombustible,
    archivoUrl: payload.archivoUrl !== undefined ? String(payload.archivoUrl || "").trim() : existingCot.archivoUrl,
    archivoNombre: payload.archivoNombre !== undefined ? String(payload.archivoNombre || "").trim() : existingCot.archivoNombre,
    notas: payload.notas !== undefined ? String(payload.notas || "").trim() : existingCot.notas,
    seleccionada: typeof payload.seleccionada === "boolean" ? payload.seleccionada : existingCot.seleccionada,
  };

  // Si se marca como seleccionada, desmarcar las demás
  const nextCotizaciones = (existing.cotizaciones || []).map((c) => {
    if (c.id === cotizacionId) return updatedCot;
    if (payload.seleccionada === true) return { ...c, seleccionada: false };
    return c;
  });

  const updated = { ...existing, cotizaciones: nextCotizaciones, updatedAt: new Date().toISOString() };
  const nextState = { ...currentState, incidencias: (currentState.incidencias || []).map((i) => i.id === itemId ? updated : i) };
  return { ok: true, state: replaceWarehouseState(nextState), itemId };
}

export function deleteCotizacion(auth, itemId, cotizacionId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editIncidencia", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existing = (currentState.incidencias || []).find((i) => i.id === itemId);
  if (!existing) return { ok: false, reason: "item_not_found" };

  const updated = { ...existing, cotizaciones: (existing.cotizaciones || []).filter((c) => c.id !== cotizacionId), updatedAt: new Date().toISOString() };
  const nextState = { ...currentState, incidencias: (currentState.incidencias || []).map((i) => i.id === itemId ? updated : i) };
  return { ok: true, state: replaceWarehouseState(nextState), itemId };
}

export function deleteIncidencia(auth, itemId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "deleteIncidencia", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existing = (currentState.incidencias || []).find((i) => i.id === itemId);
  if (!existing) return { ok: false, reason: "item_not_found" };

  const nextState = { ...currentState, incidencias: (currentState.incidencias || []).filter((i) => i.id !== itemId) };
  return { ok: true, state: replaceWarehouseState(nextState), itemId };
}

function buildSampleState() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const previousWeekStart = addDays(weekStart, -7);
  const oldWeekStart = addDays(weekStart, -14);

  return {
    revision: 1,
    system: {
      masterBootstrapEnabled: true,
      masterUsername: "Maestro",
      operational: normalizeSystemOperationalSettings(null),
    },
    currentUserId: null,
    users: [],
    weeks: [
      { id: "week-active", name: getWeekName(weekStart), startDate: weekStart.toISOString(), endDate: endOfWeek(weekStart).toISOString(), isActive: true },
      { id: "week-prev", name: getWeekName(previousWeekStart), startDate: previousWeekStart.toISOString(), endDate: endOfWeek(previousWeekStart).toISOString(), isActive: false },
      { id: "week-old", name: getWeekName(oldWeekStart), startDate: oldWeekStart.toISOString(), endDate: endOfWeek(oldWeekStart).toISOString(), isActive: false },
    ],
    catalog: [
      { id: "cat-piso", name: "Piso producción", timeLimitMinutes: 50, isMandatory: true, isDeleted: false, frequency: "daily", category: "Limpieza", area: "Limpieza" },
      { id: "cat-banos", name: "Lavado de baños", timeLimitMinutes: 40, isMandatory: true, isDeleted: false, frequency: "daily", category: "Limpieza", area: "Limpieza" },
      { id: "cat-inspeccion", name: "Inspección nave", timeLimitMinutes: 75, isMandatory: true, isDeleted: false, frequency: "threeTimesWeek", category: "Seguridad", area: "Seguridad" },
      { id: "cat-oficinas", name: "Limpieza oficinas", timeLimitMinutes: 50, isMandatory: true, isDeleted: false, frequency: "weekdays", category: "Limpieza", area: "Limpieza" },
      { id: "cat-comedor", name: "Comedor", timeLimitMinutes: 50, isMandatory: true, isDeleted: false, frequency: "daily", category: "Servicios", area: "Limpieza" },
      { id: "cat-vidrios", name: "Limpieza vidrios", timeLimitMinutes: 50, isMandatory: false, isDeleted: false, frequency: "twiceWeek", category: "Limpieza", area: "Limpieza" },
      { id: "cat-rampas", name: "Revisión de rampas", timeLimitMinutes: 35, isMandatory: false, isDeleted: false, frequency: "weekly", category: "Seguridad", area: "Seguridad" },
      { id: "cat-limpieza-general", name: "Checklist Limpieza General", timeLimitMinutes: 60, isMandatory: true, isDeleted: false, frequency: "daily", category: "Limpieza", area: "Limpieza" },
    ],
    inventoryItems: getDefaultInventoryItems(),
    inventoryColumns: withSystemInventoryColumns([]),
    inventoryMovements: [],
    activities: [],
    pauseLogs: [],
    controlRows: [],
    boardTemplates: [],
    boardWeeklyCycle: normalizeBoardWeeklyCycle(null, now),
    boardWeekHistory: [],
    permissions: buildDefaultPermissions(),
    auditLog: [],
    controlBoards: [],
    processAuditTemplates: [],
    processAudits: [],
    transport: normalizeTransportState(null),
    updatedAt: new Date().toISOString(),
  };
}

function getDefaultProcessAuditTemplates() {
  const defaults = [
    {
      area: "Inventario",
      process: "Revisión",
      questions: [
        { type: "yesno", text: "¿El proceso depende del conocimiento de una sola persona para ejecutarse correctamente?", required: true },
        { type: "yesno", text: "¿Se detectan variaciones de ejecución entre turnos para la misma revisión?", required: true },
        { type: "text", text: "¿Qué falla ocurre más y en qué punto exacto del flujo se origina?", required: false, placeholder: "Describe causa probable, impacto y propuesta inicial" },
      ],
    },
    {
      area: "Inventario",
      process: "Acomodo",
      questions: [
        { type: "yesno", text: "¿Se respeta el criterio de ubicación estándar o depende del criterio personal?", required: true },
        { type: "yesno", text: "¿Existen errores repetitivos de ubicación que obligan retrabajo?", required: true },
        { type: "text", text: "¿Qué parte del acomodo genera más errores y por qué?", required: false, placeholder: "Describe patrón, causa raíz y riesgo operativo" },
      ],
    },
    {
      area: "Inventario",
      process: "Recepción",
      questions: [
        { type: "yesno", text: "¿Se valida documento, condición física y lote antes de liberar la recepción?", required: true },
        { type: "yesno", text: "¿Hay cuellos de botella recurrentes que retrasan la recepción?", required: true },
        { type: "text", text: "¿Qué provoca recapturas o ajustes posteriores en recepción?", required: false, placeholder: "Describe en qué etapa se rompe el control" },
      ],
    },
    {
      area: "Inventario",
      process: "Devoluciones",
      questions: [
        { type: "yesno", text: "¿El criterio de aceptación/rechazo de devoluciones está estandarizado?", required: true },
        { type: "yesno", text: "¿Se identifica causa raíz de la devolución o solo se corrige el síntoma?", required: true },
        { type: "text", text: "Patrón de devoluciones", required: false, placeholder: "Indica recurrencias, causa y mejora preventiva" },
      ],
    },
    {
      area: "Inventario",
      process: "Reingresos",
      questions: [
        { type: "yesno", text: "¿Se valida trazabilidad y condición del producto antes del reingreso?", required: true },
        { type: "yesno", text: "¿Se rechazan reingresos sin evidencia suficiente?", required: true },
        { type: "text", text: "Riesgo en reingresos", required: false, placeholder: "Describe riesgos, controles faltantes y decisión recomendada" },
      ],
    },
    {
      area: "Inventario",
      process: "Traspasos",
      questions: [
        { type: "yesno", text: "¿Existe control robusto para asegurar coincidencia entre origen y destino?", required: true },
        { type: "yesno", text: "¿Hay diferencias recurrentes de inventario por fallas en traspaso?", required: true },
        { type: "text", text: "Fuga de control en traspasos", required: false, placeholder: "¿Dónde se pierde información o producto y por qué?" },
      ],
    },
    {
      area: "Limpieza",
      process: "General",
      questions: [
        { type: "yesno", text: "¿El estándar de limpieza se interpreta igual en todos los turnos?", required: true },
        { type: "yesno", text: "¿Se omiten tareas críticas cuando aumenta la carga operativa?", required: true },
        { type: "text", text: "Brecha de limpieza", required: false, placeholder: "Describe zona crítica, causa y acción de contención" },
      ],
    },
    {
      area: "Limpieza",
      process: "Limpieza de naves",
      questions: [
        { type: "yesno", text: "¿La ruta de limpieza reduce recontaminación entre zonas?", required: true },
        { type: "yesno", text: "¿Existen puntos ciegos que reinciden con hallazgos?", required: true },
        { type: "text", text: "Hallazgo crítico en nave", required: false, placeholder: "Describe zona reincidente y causa raíz" },
      ],
    },
    {
      area: "Limpieza",
      process: "Oficinas y baños",
      questions: [
        { type: "yesno", text: "¿El cumplimiento se valida con evidencia y no por percepción?", required: true },
        { type: "yesno", text: "¿Se anticipa reposición de insumos para evitar quiebres?", required: true },
        { type: "text", text: "Desviación de sanitización", required: false, placeholder: "Indica causa, impacto y propuesta" },
      ],
    },
    {
      area: "Pedidos",
      process: "Picking",
      questions: [
        { type: "yesno", text: "¿El error de picking se detecta antes del embarque en todos los casos?", required: true },
        { type: "yesno", text: "¿El proceso depende de operadores expertos para cumplir sin fallas?", required: true },
        { type: "text", text: "Punto de falla en picking", required: false, placeholder: "Indica etapa, causa raíz y costo de error" },
      ],
    },
    {
      area: "Pedidos",
      process: "Clientes",
      questions: [
        { type: "yesno", text: "¿La priorización de pedidos responde a criterios claros y medibles?", required: true },
        { type: "yesno", text: "¿Se documentan desviaciones de tiempo con causa y responsable?", required: true },
        { type: "text", text: "Riesgo en atención a clientes", required: false, placeholder: "Describe reclamo recurrente y cómo prevenirlo" },
      ],
    },
    {
      area: "Pedidos",
      process: "Paqueterías",
      questions: [
        { type: "yesno", text: "¿Se valida guía, bulto y contenido antes de cerrar embarque?", required: true },
        { type: "yesno", text: "¿Las incidencias de entrega se analizan con causa raíz?", required: true },
        { type: "text", text: "Hallazgo de paquetería", required: false, placeholder: "Describe desviación, impacto y acción correctiva" },
      ],
    },
    {
      area: "Inventario",
      process: "Almacén",
      questions: [
        { type: "yesno", text: "¿Existe control visual y digital para ubicar producto sin depender de memoria del operador?", required: true },
        { type: "yesno", text: "¿Se registran movimientos internos en tiempo real sin pendientes al cierre del turno?", required: true },
        { type: "text", text: "Principal fuga de control en almacén", required: false, placeholder: "Describe dónde se pierde trazabilidad y cómo corregirlo" },
      ],
    },
    {
      area: "Calidad",
      process: "Inspección",
      questions: [
        { type: "yesno", text: "¿El criterio de aceptación/rechazo se aplica igual por todos los inspectores?", required: true },
        { type: "yesno", text: "¿Se documenta evidencia objetiva de cada no conformidad detectada?", required: true },
        { type: "text", text: "Riesgo de calidad recurrente", required: false, placeholder: "Describe defecto, frecuencia y punto de origen" },
      ],
    },
    {
      area: "Calidad",
      process: "Liberación",
      questions: [
        { type: "yesno", text: "¿Ningún producto se libera sin checklist completo y firma responsable?", required: true },
        { type: "yesno", text: "¿Se bloquea automáticamente producto con desviación crítica?", required: true },
        { type: "text", text: "Brecha en liberación", required: false, placeholder: "Describe riesgo liberado, causa y contención" },
      ],
    },
    {
      area: "Regulatorio",
      process: "Documentación",
      questions: [
        { type: "yesno", text: "¿Los documentos críticos vigentes están controlados y accesibles en punto de uso?", required: true },
        { type: "yesno", text: "¿Se evita uso de formatos obsoletos en la operación diaria?", required: true },
        { type: "text", text: "Riesgo documental", required: false, placeholder: "Indica documento crítico, brecha y plan de corrección" },
      ],
    },
    {
      area: "Regulatorio",
      process: "Trazabilidad",
      questions: [
        { type: "yesno", text: "¿Se puede rastrear lote desde recepción hasta salida sin huecos de información?", required: true },
        { type: "yesno", text: "¿Los cambios de estatus de lote quedan registrados con usuario y hora?", required: true },
        { type: "text", text: "Pérdida de trazabilidad", required: false, placeholder: "Describe en qué etapa se rompe el rastro" },
      ],
    },
    {
      area: "Transporte",
      process: "Carga",
      questions: [
        { type: "yesno", text: "¿La unidad se valida contra pedido, ruta y condiciones antes de cargar?", required: true },
        { type: "yesno", text: "¿Existe doble verificación de estiba para evitar daño y devoluciones?", required: true },
        { type: "text", text: "Riesgo en carga", required: false, placeholder: "Describe error típico, impacto y acción preventiva" },
      ],
    },
    {
      area: "Transporte",
      process: "Entrega",
      questions: [
        { type: "yesno", text: "¿Se confirma evidencia de entrega completa y sin discrepancias?", required: true },
        { type: "yesno", text: "¿Las incidencias de última milla se documentan con causa raíz?", required: true },
        { type: "text", text: "Incidencia de entrega", required: false, placeholder: "Detalla desvío, cliente afectado y corrección" },
      ],
    },
    {
      area: "Retail",
      process: "Surtido",
      questions: [
        { type: "yesno", text: "¿El surtido en piso respeta prioridad comercial y rotación real?", required: true },
        { type: "yesno", text: "¿Se detectan quiebres de anaquel antes de afectar venta?", required: true },
        { type: "text", text: "Brecha en surtido retail", required: false, placeholder: "Describe SKU crítico, causa y plan inmediato" },
      ],
    },
    {
      area: "Retail",
      process: "Merma",
      questions: [
        { type: "yesno", text: "¿La merma se clasifica por causa real y no como categoría genérica?", required: true },
        { type: "yesno", text: "¿Se ejecutan acciones preventivas sobre las 3 causas principales?", required: true },
        { type: "text", text: "Patrón de merma", required: false, placeholder: "Indica causa predominante y control faltante" },
      ],
    },
    {
      area: "ESTO",
      process: "Operación diaria",
      questions: [
        { type: "yesno", text: "¿Las actividades críticas del área se cierran en tiempo y con evidencia?", required: true },
        { type: "yesno", text: "¿Existen desvíos repetitivos sin dueño claro de corrección?", required: true },
        { type: "text", text: "Hallazgo operativo ESTO", required: false, placeholder: "Describe desvío, responsable y fecha compromiso" },
      ],
    },
  ];

  return defaults.map((item) => ({
    id: makeId("pat"),
    area: String(item.area || "").trim(),
    process: String(item.process || "").trim(),
    isActive: true,
    questions: (item.questions || []).map((question) => ({
      id: makeId("patq"),
      type: question.type === "text" ? "text" : "yesno",
      text: String(question.text || "").trim(),
      required: Boolean(question.required),
      placeholder: String(question.placeholder || "").trim(),
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(backupDirectory)) {
    fs.mkdirSync(backupDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify(buildSampleState(), null, 2), "utf8");
  }
}

function getStateBackupTimestamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function getStateBackupFilePaths() {
  if (!fs.existsSync(backupDirectory)) {
    return [];
  }

  return fs.readdirSync(backupDirectory)
    .filter((fileName) => fileName.startsWith("warehouse-state-") && fileName.endsWith(".json"))
    .map((fileName) => path.join(backupDirectory, fileName));
}

function pruneStateBackups() {
  const backupPaths = getStateBackupFilePaths();

  const excessCount = backupPaths.length - MAX_WAREHOUSE_STATE_BACKUPS;
  if (excessCount <= 0) {
    return;
  }

  backupPaths.slice(0, excessCount).forEach((backupPath) => {
    try {
      fs.rmSync(backupPath, { force: true });
    } catch {
      // Ignore backup pruning issues; preserving the main store is more important.
    }
  });
}

function writeStoreFile(filePath, state) {
  const tempFilePath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tempFilePath, JSON.stringify(state, null, 2), "utf8");
    fs.rmSync(filePath, { force: true });
    fs.renameSync(tempFilePath, filePath);
  } catch (err) {
    console.error(`[COPMEC] Error escribiendo el store en ${filePath}:`, err && err.message ? err.message : err);
    // Re-throw to ensure callers see the persistence error
    throw err;
  }
}

function snapshotCurrentStore() {
  if (!fs.existsSync(dataFilePath)) {
    return;
  }

  try {
    fs.copyFileSync(dataFilePath, latestBackupFilePath);
    const timestampedBackupPath = path.join(backupDirectory, `warehouse-state-${getStateBackupTimestamp()}.json`);
    fs.copyFileSync(dataFilePath, timestampedBackupPath);
    pruneStateBackups();
  } catch {
    // Backup failures should not block the main state write.
  }
}

function tryReadStoreFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return normalizeState(JSON.parse(raw));
}

function restoreStoreFromBackup(filePath) {
  const recoveredState = tryReadStoreFromFile(filePath);
  writeStoreFile(dataFilePath, recoveredState);
  return recoveredState;
}

function readStore() {
  ensureStore();

  try {
    return tryReadStoreFromFile(dataFilePath);
  } catch (primaryError) {
    const candidatePaths = Array.from(new Set([latestBackupFilePath, ...getStateBackupFilePaths().reverse()]))
      .filter((filePath) => fs.existsSync(filePath));

    for (const candidatePath of candidatePaths) {
      try {
        const recoveredState = restoreStoreFromBackup(candidatePath);
        console.warn(`[COPMEC] warehouse-state.json was recovered from backup: ${path.basename(candidatePath)}`);
        return recoveredState;
      } catch {
        // Try the next backup candidate.
      }
    }

    throw primaryError;
  }
}

function writeStore(state) {
  ensureStore();
  snapshotCurrentStore();
  writeStoreFile(dataFilePath, state);
}

export function sanitizeUserRecord(user) {
  if (!user) return null;
  return {
    ...user,
    password: undefined,
    passwordHash: undefined,
  };
}

function sanitizeState(state) {
  return {
    ...state,
    users: (state.users || []).map((user) => sanitizeUserRecord(user)),
  };
}

export function getWarehouseState() {
  return sanitizeState(getRawWarehouseState());
}

export function getRawWarehouseState() {
  const currentState = readStore();
  const { state: boardState, changed: boardChanged } = applyAutomatedBoardWeeklyCut(currentState);
  const { state: dailyRowsState, changed: dailyRowsChanged } = applyAutomatedBoardDailyRows(boardState);
  const { state: transportState, changed: transportChanged } = applyAutomatedTransportDailyCut(dailyRowsState);
  if (!boardChanged && !dailyRowsChanged && !transportChanged) return currentState;

  const persistedState = normalizeState({
    ...transportState,
    revision: Number(currentState.revision || 0) + 1,
    updatedAt: new Date().toISOString(),
  }, currentState);
  writeStore(persistedState);
  warehouseEvents.emit("state", sanitizeState(persistedState));
  return persistedState;
}

export function replaceWarehouseState(nextState) {
  const current = getRawWarehouseState();
  const mergedState = normalizeState({
    ...nextState,
    revision: Number(current.revision || 0) + 1,
    updatedAt: new Date().toISOString(),
  }, current);

  writeStore(mergedState);
  const sanitizedState = sanitizeState(mergedState);
  warehouseEvents.emit("state", sanitizedState);
  return sanitizedState;
}

export function restoreWarehouseStateForDemo(auth, snapshot = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  if (normalizeRole(currentUser.role) !== ROLE_LEAD || currentUser.createdById !== BOOTSTRAP_MASTER_ID) {
    return { ok: false, reason: "forbidden" };
  }

  const currentState = getRawWarehouseState();
  const restoredState = replaceWarehouseState({
    ...snapshot,
    revision: currentState.revision,
  });
  return { ok: true, state: restoredState };
}

export function createWarehouseWeekFromCatalog() {
  const current = getRawWarehouseState();
  const now = new Date();
  const weekId = makeId("week");
  const week = {
    id: weekId,
    name: getWeekName(now),
    startDate: startOfWeek(now).toISOString(),
    endDate: endOfWeek(now).toISOString(),
    isActive: true,
  };
  const activeUsers = current.users.filter((user) => user.isActive);
  let assigneeIndex = 0;
  const newActivities = current.catalog
    .filter((item) => !item.isDeleted)
    .flatMap((item) => {
      const responsibleId = activeUsers[assigneeIndex % Math.max(activeUsers.length, 1)]?.id || null;
      assigneeIndex += 1;
      return buildActivitiesForCatalogItem(weekId, item, startOfWeek(now), responsibleId);
    });

  return replaceWarehouseState({
    ...current,
    weeks: current.weeks.map((item) => ({ ...item, isActive: false })).concat(week),
    activities: current.activities.concat(newActivities),
  });
}

export function updateWarehouseSystemOperationalSettings(auth, patch = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) {
    return { ok: false, reason: "auth_required" };
  }

  const current = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageSystemSettings", current.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const currentOperational = normalizeSystemOperationalSettings(current.system?.operational);
  const patchNormalized = patch && typeof patch === "object" ? patch : EMPTY_OBJECT;
  const merged = { ...currentOperational, ...patchNormalized };
  const nextOperational = normalizeSystemOperationalSettings(merged);

  const nextState = {
    ...current,
    system: {
      ...(current.system ?? EMPTY_OBJECT),
      operational: nextOperational,
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), operational: nextOperational };
}

export function deleteWarehouseWeek(auth, weekId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const current = getRawWarehouseState();
  const targetWeek = (current.weeks || []).find((item) => item.id === weekId);
  if (!targetWeek) return { ok: false, reason: "week_not_found" };
  if (!canUserDoWarehouseAction(currentUser, "deleteWeek", current.permissions)) return { ok: false, reason: "forbidden" };

  const removedActivityIds = new Set((current.activities || [])
    .filter((activity) => activity.weekId === weekId)
    .map((activity) => activity.id));
  const nextWeeks = (current.weeks || []).filter((item) => item.id !== weekId);

  const hasActiveWeek = nextWeeks.some((item) => item.isActive);
  const normalizedWeeks = hasActiveWeek
    ? nextWeeks
    : nextWeeks.length > 0
      ? nextWeeks.map((item, index) => ({ ...item, isActive: index === 0 }))
      : [];

  const nextState = replaceWarehouseState({
    ...current,
    weeks: normalizedWeeks,
    activities: (current.activities || []).filter((activity) => activity.weekId !== weekId),
    pauseLogs: (current.pauseLogs || []).filter((log) => !removedActivityIds.has(log.weekActivityId)),
  });

  return { ok: true, weekId, weekName: targetWeek.name, state: nextState };
}

export function resetWarehouseDashboardData(auth) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  if (normalizeRole(currentUser.role) !== ROLE_LEAD) return { ok: false, reason: "forbidden" };

  const current = getRawWarehouseState();
  const nextState = replaceWarehouseState({
    ...current,
    weeks: [],
    activities: [],
    pauseLogs: [],
    boardWeekHistory: [],
    controlBoards: (current.controlBoards || []).map((board) => ({
      ...board,
      rows: [],
    })),
  });

  return { ok: true, state: nextState };
}

export function subscribeWarehouseState(listener) {
  warehouseEvents.on("state", listener);
  return () => warehouseEvents.off("state", listener);
}

export function findWarehouseUserById(userId) {
  return getRawWarehouseState().users.find((user) => user.id === userId) || null;
}

export function canManageWarehouseBoard(user, board) {
  if (!user || !board) return false;
  const normalizedRole = normalizeRole(user.role);
  if (normalizedRole === ROLE_LEAD) return true;
  if (!doesBoardMatchWarehouseUserArea(board, user)) return false;
  if (board.createdById === user.id || board.ownerId === user.id) return true;
  if (board.visibilityType === "users" && (board.accessUserIds || []).includes(user.id)) return true;
  if (board.visibilityType === "all") return true;
  if (board.visibilityType === "department") {
    const userArea = normalizeAreaOption(user.department || user.area || "");
    return Boolean(userArea) && (board.sharedDepartments || []).includes(userArea);
  }
  return false;
}

export function canEditWarehouseBoard(user, board) {
  if (!user || !board) return false;
  const normalizedRole = normalizeRole(user.role);
  if (normalizedRole === ROLE_LEAD) return true;
  return board.createdById === user.id;
}

export function canAccessWarehouseTemplate(user, template) {
  if (!user || !template) return false;
  const normalizedRole = normalizeRole(user.role);
  if (!template.isCustom) return true;
  if (normalizedRole === ROLE_LEAD) return true;
  if (template.createdById === user.id) return true;
  if (template.visibilityType === "all") return true;
  if (template.visibilityType === "department" && (template.sharedDepartments || []).includes(user.department || "")) return true;
  if (template.visibilityType === "users" && (template.sharedUserIds || []).includes(user.id)) return true;
  return false;
}

export function canManageWarehouseTemplate(user, template) {
  if (!user || !template) return false;
  const normalizedRole = normalizeRole(user.role);
  if (normalizedRole === ROLE_LEAD) return true;
  return template.createdById === user.id;
}

export function canUserDoWarehouseAction(user, actionId, permissions = null) {
  if (!user || !actionId) return false;
  const normalizedRole = normalizeRole(user.role);
  if (normalizedRole === ROLE_LEAD) return true;

  const resolvedPermissions = permissions || getRawWarehouseState().permissions;
  const normalizedPermissions = normalizePermissions(resolvedPermissions);
  const userOverride = normalizedPermissions.userOverrides?.[user.id]?.actions?.[actionId];
  if (typeof userOverride === "boolean") return userOverride;
  return userMatchesPermissionEntry(user, normalizedPermissions.actions?.[actionId]);
}

export function canUserAccessWarehousePage(user, pageId, permissions = null) {
  if (!user || !pageId) return false;
  const normalizedRole = normalizeRole(user.role);
  if (normalizedRole === ROLE_LEAD) return true;

  const resolvedPermissions = permissions || getRawWarehouseState().permissions;
  const normalizedPermissions = normalizePermissions(resolvedPermissions);
  const userOverride = normalizedPermissions.userOverrides?.[user.id]?.pages?.[pageId];
  if (typeof userOverride === "boolean") return userOverride;
  return userMatchesPermissionEntry(user, normalizedPermissions.pages?.[pageId]);
}

export function canUserDoBoardAction(user, boardId, actionId) {
  if (!user || !boardId || !actionId) return false;
  const currentState = getRawWarehouseState();
  const board = (currentState.controlBoards || []).find((item) => item.id === boardId);
  if (!board) return false;
  if (!canManageWarehouseBoard(user, board)) return false;
  return canUserDoWarehouseAction(user, actionId, currentState.permissions);
}

function canManageUserRole(actorRole, targetRole) {
  const normalizedActorRole = normalizeRole(actorRole);
  const normalizedTargetRole = normalizeRole(targetRole);
  if (normalizedActorRole === ROLE_LEAD) return true;
  if (normalizedActorRole === ROLE_SR) return [ROLE_SR, ROLE_SSR, ROLE_JR].includes(normalizedTargetRole);
  if (normalizedActorRole === ROLE_SSR) return [ROLE_SSR, ROLE_JR].includes(normalizedTargetRole);
  return false;
}

function canBypassSelfProfileEditLimit(user) {
  const normalizedRole = normalizeRole(user?.role);
  return normalizedRole === ROLE_LEAD || normalizedRole === ROLE_SR;
}

function sanitizeWarehouseUserDraft(payload = {}, fallbackManagerId = null) {
  const role = normalizeRole(payload.role);
  const area = String(payload.area ?? payload.department ?? "").trim();
  const photo = String(payload.photo || "").trim();
  const photoThumbnailUrl = String(payload.photoThumbnailUrl || payload.photoThumbnail || "").trim();
  return {
    id: payload.id || makeId("usr"),
    name: String(payload.name || "").trim(),
    email: String((payload.username ?? payload.email) || "").trim(),
    role,
    area,
    department: area,
    jobTitle: String(payload.jobTitle || "").trim(),
    isActive: Boolean(payload.isActive),
    managerId: payload.managerId ?? fallbackManagerId,
    createdById: payload.createdById ?? fallbackManagerId,
    selfIdentityEditCount: Math.max(0, Number(payload.selfIdentityEditCount ?? 0) || 0),
    mustChangePassword: Boolean(payload.mustChangePassword),
    temporaryPasswordIssuedAt: payload.temporaryPasswordIssuedAt || null,
    photo,
    photoThumbnailUrl,
    ...(String(payload.password || "").trim() ? { password: String(payload.password || "").trim() } : {}),
  };
}

function buildEffectivePermissionSelection(user, permissionsModel) {
  return {
    pages: Object.fromEntries(Object.keys(PAGE_PERMISSIONS).map((pageId) => [pageId, canUserAccessWarehousePage(user, pageId, permissionsModel)])),
    actions: Object.fromEntries(Object.keys(ACTION_PERMISSIONS).map((actionId) => [actionId, canUserDoWarehouseAction(user, actionId, permissionsModel)])),
  };
}

function buildUserOverridesForDraft(user, requestedOverrides, permissionsModel, delegationSelection = null) {
  if (!supportsManagedPermissionOverrides(user.role)) {
    return null;
  }

  const baseSelection = buildEffectivePermissionSelection(user, permissionsModel);
  const preservedSelection = delegationSelection || { pages: {}, actions: {} };
  const nextOverride = {
    pages: Object.fromEntries(Object.keys(PAGE_PERMISSIONS)
      .map((pageId) => {
        const requestedValue = requestedOverrides?.pages?.[pageId];
        const fallbackValue = typeof preservedSelection.pages?.[pageId] === "boolean"
          ? preservedSelection.pages[pageId]
          : false;
        const nextValue = typeof requestedValue === "boolean" ? requestedValue : fallbackValue;
        return [pageId, nextValue];
      })
      .filter(([pageId, value]) => value !== baseSelection.pages[pageId])),
    actions: Object.fromEntries(Object.keys(ACTION_PERMISSIONS)
      .map((actionId) => {
        const requestedValue = requestedOverrides?.actions?.[actionId];
        const fallbackValue = typeof preservedSelection.actions?.[actionId] === "boolean"
          ? preservedSelection.actions[actionId]
          : false;
        const nextValue = typeof requestedValue === "boolean" ? requestedValue : fallbackValue;
        return [actionId, nextValue];
      })
      .filter(([actionId, value]) => value !== baseSelection.actions[actionId])),
  };

  return Object.keys(nextOverride.pages).length > 0 || Object.keys(nextOverride.actions).length > 0 ? nextOverride : null;
}

export function createWarehouseUser(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "createUsers", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const temporaryPassword = String(payload.password || "").trim();
  if (!isTemporaryPassword(temporaryPassword)) {
    return { ok: false, reason: "weak_temporary_password" };
  }

  const nextUser = sanitizeWarehouseUserDraft({
    ...payload,
    password: temporaryPassword,
    mustChangePassword: true,
    temporaryPasswordIssuedAt: new Date().toISOString(),
    selfIdentityEditCount: 0,
  }, currentUser.id);
  if (!nextUser.name || !nextUser.email || !nextUser.area || !nextUser.jobTitle) {
    return { ok: false, reason: "invalid_payload" };
  }
  if (!canManageUserRole(currentUser.role, nextUser.role)) {
    return { ok: false, reason: "forbidden" };
  }
  if ((currentState.users || []).some((user) => normalizeKey(user.email) === normalizeKey(nextUser.email))) {
    return { ok: false, reason: "duplicate_email" };
  }

  const currentOverrides = currentState.permissions?.userOverrides || {};
  const basePermissions = normalizePermissions({
    ...currentState.permissions,
    userOverrides: currentOverrides,
  });
  const actorSelection = buildEffectivePermissionSelection(currentUser, basePermissions);
  const allowedSelection = {
    pages: Object.fromEntries(Object.keys(PAGE_PERMISSIONS).map((pageId) => [pageId, actorSelection.pages[pageId] ? payload.permissionOverrides?.pages?.[pageId] : false])),
    actions: Object.fromEntries(Object.keys(ACTION_PERMISSIONS).map((actionId) => [actionId, actorSelection.actions[actionId] ? payload.permissionOverrides?.actions?.[actionId] : false])),
  };
  const directOverride = canUserDoWarehouseAction(currentUser, "createUsers", currentState.permissions)
    ? buildUserOverridesForDraft(nextUser, allowedSelection, basePermissions)
    : null;

  const nextState = {
    ...currentState,
    users: (currentState.users || []).concat(nextUser),
    permissions: {
      ...currentState.permissions,
      userOverrides: directOverride ? { ...currentOverrides, [nextUser.id]: directOverride } : currentOverrides,
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), userId: nextUser.id, userName: nextUser.name };
}

export function updateWarehouseUser(auth, userId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editUsers", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existingUser = (currentState.users || []).find((user) => user.id === userId);
  if (!existingUser) return { ok: false, reason: "user_not_found" };

  const nextUser = sanitizeWarehouseUserDraft({ ...existingUser, ...payload, id: userId }, existingUser.managerId || currentUser.id);
  if (!nextUser.name || !nextUser.email || !nextUser.area || !nextUser.jobTitle) {
    return { ok: false, reason: "invalid_payload" };
  }
  if (!canManageUserRole(currentUser.role, existingUser.role) || !canManageUserRole(currentUser.role, nextUser.role)) {
    return { ok: false, reason: "forbidden" };
  }
  if ((currentState.users || []).some((user) => user.id !== userId && normalizeKey(user.email) === normalizeKey(nextUser.email))) {
    return { ok: false, reason: "duplicate_email" };
  }

  const currentOverrides = currentState.permissions?.userOverrides || {};
  const remainingOverrides = Object.fromEntries(Object.entries(currentOverrides).filter(([overrideUserId]) => overrideUserId !== userId));
  const basePermissions = normalizePermissions({
    ...currentState.permissions,
    userOverrides: remainingOverrides,
  });
  const actorSelection = buildEffectivePermissionSelection(currentUser, normalizePermissions({
    ...currentState.permissions,
    userOverrides: currentOverrides,
  }));
  const currentTargetSelection = buildEffectivePermissionSelection(existingUser, normalizePermissions({
    ...currentState.permissions,
    userOverrides: currentOverrides,
  }));
  const allowedSelection = {
    pages: Object.fromEntries(Object.keys(PAGE_PERMISSIONS).map((pageId) => [pageId, actorSelection.pages[pageId] ? payload.permissionOverrides?.pages?.[pageId] : currentTargetSelection.pages[pageId]])),
    actions: Object.fromEntries(Object.keys(ACTION_PERMISSIONS).map((actionId) => [actionId, actorSelection.actions[actionId] ? payload.permissionOverrides?.actions?.[actionId] : currentTargetSelection.actions[actionId]])),
  };
  const directOverride = canUserDoWarehouseAction(currentUser, "editUsers", currentState.permissions)
    ? buildUserOverridesForDraft(nextUser, allowedSelection, basePermissions, currentTargetSelection)
    : null;

  const nextState = {
    ...currentState,
    users: (currentState.users || []).map((user) => (user.id === userId ? nextUser : user)),
    permissions: {
      ...currentState.permissions,
      userOverrides: directOverride ? { ...remainingOverrides, [userId]: directOverride } : remainingOverrides,
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), userId: nextUser.id, userName: nextUser.name };
}

export function deleteWarehouseUser(auth, userId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "deleteUsers", currentState.permissions)) return { ok: false, reason: "forbidden" };
  if (currentUser.id === userId) return { ok: false, reason: "forbidden" };

  const targetUser = (currentState.users || []).find((user) => user.id === userId);
  if (!targetUser) return { ok: false, reason: "user_not_found" };
  if (!canManageUserRole(currentUser.role, targetUser.role)) return { ok: false, reason: "forbidden" };

  const remainingUsers = (currentState.users || []).filter((user) => user.id !== userId);
  const nextState = {
    ...currentState,
    users: remainingUsers,
    activities: (currentState.activities || []).map((activity) => (activity.responsibleId === userId ? { ...activity, responsibleId: null } : activity)),
    permissions: {
      ...currentState.permissions,
      userOverrides: Object.fromEntries(Object.entries(currentState.permissions?.userOverrides || {}).filter(([overrideUserId]) => overrideUserId !== userId)),
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), userId: targetUser.id, userName: targetUser.name };
}

export function transferWarehouseLead(auth, targetUserId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  if (normalizeRole(currentUser.role) !== ROLE_LEAD) return { ok: false, reason: "forbidden" };

  const currentState = getRawWarehouseState();
  const targetUser = (currentState.users || []).find((user) => user.id === targetUserId);
  if (!targetUser) return { ok: false, reason: "user_not_found" };
  if (targetUser.id === currentUser.id) return { ok: false, reason: "forbidden" };

  const nextState = {
    ...currentState,
    users: (currentState.users || []).map((user) => {
      if (user.id === targetUserId) return { ...user, role: ROLE_LEAD };
      if (user.id === currentUser.id) return { ...user, role: ROLE_SR };
      return user;
    }),
  };

  return { ok: true, state: replaceWarehouseState(nextState), targetUserId, targetUserName: targetUser.name };
}

export function toggleWarehouseUserActive(auth, userId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editUsers", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const targetUser = (currentState.users || []).find((user) => user.id === userId);
  if (!targetUser) return { ok: false, reason: "user_not_found" };
  if (currentUser.id === userId || !canManageUserRole(currentUser.role, targetUser.role)) return { ok: false, reason: "forbidden" };

  const nextState = {
    ...currentState,
    users: (currentState.users || []).map((user) => (user.id === userId ? { ...user, isActive: !user.isActive } : user)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), userId: targetUser.id, isActive: !targetUser.isActive };
}

export function updateWarehouseSelfProfile(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const trimmedPatch = {
    name: String(payload.name || "").trim(),
    email: String((payload.username ?? payload.email) || "").trim(),
    area: String(payload.area || "").trim(),
    department: String(payload.area || "").trim(),
    jobTitle: String(payload.jobTitle || "").trim(),
    telefono: String(payload.telefono || "").trim(),
    telefono_visible: Boolean(payload.telefono_visible),
    birthday: String(payload.birthday || "").trim(),
    photo: String(payload.photo || "").trim(),
    photoThumbnailUrl: String(payload.photoThumbnailUrl || payload.photoThumbnail || "").trim(),
  };
  if (!trimmedPatch.name || !trimmedPatch.email || !trimmedPatch.area || !trimmedPatch.jobTitle) {
    return { ok: false, reason: "invalid_payload" };
  }
  if ((getRawWarehouseState().users || []).some((user) => user.id !== currentUser.id && normalizeKey(user.email) === normalizeKey(trimmedPatch.email))) {
    return { ok: false, reason: "duplicate_email" };
  }
  const profileFieldsChanged = [
    trimmedPatch.name !== String(currentUser.name || "").trim(),
    trimmedPatch.email !== String(currentUser.email || "").trim(),
    trimmedPatch.area !== String(currentUser.area || currentUser.department || "").trim(),
    trimmedPatch.jobTitle !== String(currentUser.jobTitle || "").trim(),
    trimmedPatch.telefono !== String(currentUser.telefono || "").trim(),
    trimmedPatch.telefono_visible !== Boolean(currentUser.telefono_visible),
    trimmedPatch.birthday !== String(currentUser.birthday || "").trim(),
  ].some(Boolean);

  if (profileFieldsChanged && !canBypassSelfProfileEditLimit(currentUser) && Number(currentUser.selfIdentityEditCount ?? 0) >= 1) {
    return { ok: false, reason: "self_edit_limit_reached" };
  }

  const nextState = {
    ...getRawWarehouseState(),
    users: getRawWarehouseState().users.map((user) => (user.id === currentUser.id
      ? {
          ...user,
          ...trimmedPatch,
          selfIdentityEditCount: profileFieldsChanged && !canBypassSelfProfileEditLimit(currentUser)
            ? Number(user.selfIdentityEditCount ?? 0) + 1
            : Number(user.selfIdentityEditCount ?? 0),
        }
      : user)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), userId: currentUser.id };
}

export function updateUserUiPreferences(auth, uiPreferences = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const theme = String(uiPreferences.theme || "").trim() || undefined;
  const font = String(uiPreferences.font || "").trim() || undefined;
  const fontSize = String(uiPreferences.fontSize || "").trim() || undefined;

  const nextUiPreferences = {};
  if (theme) nextUiPreferences.theme = theme;
  if (font) nextUiPreferences.font = font;
  if (fontSize) nextUiPreferences.fontSize = fontSize;

  const currentState = getRawWarehouseState();
  const nextState = {
    ...currentState,
    users: (currentState.users || []).map((user) => (user.id === currentUser.id
      ? {
          ...user,
          uiPreferences: {
            ...(user.uiPreferences || {}),
            ...nextUiPreferences,
          },
        }
      : user)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), userId: currentUser.id };
}

export function changeWarehouseSelfPassword(auth, nextPassword) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const password = String(nextPassword || "").trim();
  if (!isStrongPassword(password)) {
    return { ok: false, reason: "weak_password" };
  }

  const currentState = getRawWarehouseState();
  const nextState = {
    ...currentState,
    users: (currentState.users || []).map((user) => (user.id === currentUser.id
      ? {
          ...user,
          password,
          mustChangePassword: false,
          temporaryPasswordIssuedAt: null,
        }
      : user)),
  };
  const state = replaceWarehouseState(nextState);
  const updatedUser = (state.users || []).find((user) => user.id === currentUser.id) || null;
  return { ok: true, state, user: updatedUser };
}

export function resetWarehouseUserPassword(auth, userId, nextPassword) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "resetPasswords", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const targetUser = (currentState.users || []).find((user) => user.id === userId);
  if (!targetUser) return { ok: false, reason: "user_not_found" };
  if (!canManageUserRole(currentUser.role, targetUser.role)) return { ok: false, reason: "forbidden" };

  const password = String(nextPassword || "").trim();
  if (!isTemporaryPassword(password)) {
    return { ok: false, reason: "weak_temporary_password" };
  }

  const nextState = {
    ...currentState,
    users: (currentState.users || []).map((user) => (user.id === userId
      ? {
          ...user,
          password,
          mustChangePassword: true,
          temporaryPasswordIssuedAt: new Date().toISOString(),
        }
      : user)),
  };
  return { ok: true, state: replaceWarehouseState(nextState), userId: targetUser.id, userName: targetUser.name };
}

function getBoardFieldDefaultValue(field, currentUserId) {
  if (field?.defaultValue !== undefined && field?.defaultValue !== null && String(field.defaultValue).trim() !== "") {
    if (["number", "currency", "percentage", "rating", "progress", "counter"].includes(field.type)) {
      const parsed = Number(field.defaultValue);
      return Number.isFinite(parsed) && parsed !== 0 ? parsed : "";
    }
    if (field.type === "boolean") return String(field.defaultValue).toLowerCase() === "si" ? "Si" : field.defaultValue;
    return field.defaultValue;
  }

  if (field?.type === "status") return "Pendiente";
  if (field?.type === "user") return "";
  if (field?.type === "boolean") return "No";
  if (field?.type === "date") return new Date().toISOString().slice(0, 10);
  if (field?.type === "rating") return "";
  if (field?.type === "progress") return "";
  if (field?.type === "counter") return "";
  if (field?.type === "tags") return "";
  return "";
}

function resolvePauseControlWorkHoursForArea(pauseControl, areaKey = "") {
  const normalizedArea = normalizeAreaOption(splitAreaAndSubArea(areaKey).area || areaKey);
  const alwaysOpen = normalizeWorkHoursWithMinutes(EMPTY_OBJECT);
  if (!normalizedArea) {
    return alwaysOpen;
  }
  const areaConfig = pauseControl?.areaPauseControls?.[normalizedArea];
  if (areaConfig?.enabled && areaConfig?.workHours) {
    return normalizeWorkHoursWithMinutes(areaConfig.workHours || EMPTY_OBJECT);
  }
  return alwaysOpen;
}

function getEffectiveOperationalNowMs(nowIso, pauseControl, areaKey = "") {
  let effectiveNow = new Date(nowIso).getTime();
  if (!Number.isFinite(effectiveNow)) {
    effectiveNow = Date.now();
  }

  return effectiveNow;
}

function calcWorkSeconds(fromMs, toMs, startHour, endHour, startMinute = 0, endMinute = 0) {
  if (toMs <= fromMs) return 0;
  if (startHour >= endHour && startHour !== endHour) {
    return Math.max(0, Math.floor((toMs - fromMs) / 1000));
  }
  const msPerHour = 3600000;
  const msPerMinute = 60000;
  let total = 0;
  const fromDate = new Date(fromMs);
  const startOfDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  let dayStart = startOfDay.getTime();
  while (dayStart < toMs) {
    const windowOpen = dayStart + (startHour * msPerHour) + (startMinute * msPerMinute);
    const windowClose = dayStart + (endHour * msPerHour) + (endMinute * msPerMinute);
    const overlapStart = Math.max(fromMs, windowOpen);
    const overlapEnd = Math.min(toMs, windowClose);
    if (overlapEnd > overlapStart) {
      total += Math.floor((overlapEnd - overlapStart) / 1000);
    }
    dayStart += 86400000;
  }
  return total;
}

function parseOperationalTimestamp(value, referenceIso) {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value || "").trim();
  if (!raw) return null;

  const parsed = new Date(raw).getTime();
  if (Number.isFinite(parsed)) return parsed;

  const clockMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!clockMatch) return null;

  const hours = Number(clockMatch[1]);
  const minutes = Number(clockMatch[2]);
  const seconds = Number(clockMatch[3] || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;

  const referenceMs = new Date(referenceIso || Date.now()).getTime();
  const base = Number.isFinite(referenceMs) ? new Date(referenceMs) : new Date();
  base.setHours(hours, minutes, seconds, 0);
  return base.getTime();
}

function getOperationalElapsedSeconds(startIso, nowIso, pauseControl, cleaningSite = null) {
  if (!startIso) return 0;
  const startMs = parseOperationalTimestamp(startIso, nowIso);
  if (!Number.isFinite(startMs)) return 0;
  const effectiveNow = getEffectiveOperationalNowMs(nowIso, pauseControl, cleaningSite);

  const workHours = resolvePauseControlWorkHoursForArea(pauseControl, cleaningSite);
  const startHour = Math.min(23, Math.max(0, Math.round(Number(workHours.startHour ?? 0))));
  const startMinute = Math.min(59, Math.max(0, Math.round(Number(workHours.startMinute ?? 0))));
  const endHour = Math.min(24, Math.max(0, Math.round(Number(workHours.endHour ?? 24))));
  const endMinute = Math.min(59, Math.max(0, Math.round(Number(workHours.endMinute ?? 0))));
  return Math.max(0, calcWorkSeconds(startMs, effectiveNow, startHour, endHour, startMinute, endMinute));
}

function updateElapsedForFinish(row, nowIso, pauseControl, cleaningSite = null) {
  const accumulated = Number(row?.accumulatedSeconds || 0);
  const baselineTimestamp = row?.lastResumedAt || row?.startTime;
  if (!baselineTimestamp) return Math.max(0, accumulated);
  // Use cleaningSite from row if not explicitly provided
  const site = cleaningSite || row?.cleaningSite;
  return Math.max(0, accumulated + getOperationalElapsedSeconds(baselineTimestamp, nowIso, pauseControl, site));
}

function getPauseLogAuthorizedSeconds(entry) {
  return Math.max(0, Number(entry?.pauseAuthorizedSeconds || 0));
}

function getPauseLogCountedSeconds(entry) {
  const rawCountedSeconds = Number(entry?.countedPauseDurationSeconds);
  if (Number.isFinite(rawCountedSeconds)) {
    return Math.max(0, rawCountedSeconds);
  }
  const fullPauseSeconds = Math.max(0, Number(entry?.pauseDurationSeconds || 0));
  return Math.max(0, fullPauseSeconds - getPauseLogAuthorizedSeconds(entry));
}

function findBoardAndRow(currentState, boardId, rowId = null) {
  const boardIndex = (currentState.controlBoards || []).findIndex((board) => board.id === boardId);
  if (boardIndex === -1) return { boardIndex: -1, rowIndex: -1, board: null, row: null };
  const board = currentState.controlBoards[boardIndex];
  const rowIndex = rowId ? (board.rows || []).findIndex((row) => row.id === rowId) : -1;
  const row = rowIndex >= 0 ? board.rows[rowIndex] : null;
  return { boardIndex, rowIndex, board, row };
}

function cloneBoardFieldBundle(fields) {
  const idMap = new Map();
  const clonedFields = (fields || []).map((field) => {
    const id = makeId("fld");
    idMap.set(field.id, id);
    idMap.set(field.templateKey || field.label, id);
    return {
      ...field,
      id,
      colorRules: field.colorRules || [],
    };
  });

  return {
    idMap,
    fields: clonedFields.map((field) => ({
      ...field,
      sourceFieldId: idMap.get(field.sourceFieldId) || field.sourceFieldId,
      formulaLeftFieldId: idMap.get(field.formulaLeftFieldId) || field.formulaLeftFieldId,
      formulaRightFieldId: idMap.get(field.formulaRightFieldId) || field.formulaRightFieldId,
    })),
  };
}

function remapBoardColumnOrder(columnOrder, idMap) {
  if (!Array.isArray(columnOrder)) return [];
  return columnOrder.map((token) => {
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) return "";
    if (normalizedToken.startsWith("aux:")) return normalizedToken;
    return idMap.get(normalizedToken) || normalizedToken;
  }).filter(Boolean);
}

function sanitizeBoardDraft(draft, currentUserId) {
  const ownerId = String(draft?.ownerId || currentUserId || "").trim() || currentUserId;
  const visibilityType = normalizeBoardVisibilityType(draft?.visibilityType);
  return {
    name: String(draft?.name || "").trim(),
    description: String(draft?.description || "").trim(),
    ownerId,
    visibilityType,
    sharedDepartments: visibilityType === "department" ? normalizeBoardSharedDepartments(draft?.sharedDepartments) : [],
    accessUserIds: visibilityType === "users" ? normalizeBoardAccessUserIds(draft?.accessUserIds, ownerId) : [],
    settings: withDefaultBoardSettings(draft?.settings),
    fields: Array.isArray(draft?.columns) ? draft.columns.map((field) => ({ ...field, colorRules: field.colorRules || [] })) : [],
  };
}

function findBoardActivityListField(fields = []) {
  return (fields || []).find((field) => field?.type === "select" && field?.optionSource === "catalogByCategory") || null;
}

function getCatalogWeekdayOffset(referenceDate = new Date()) {
  const jsDay = referenceDate.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatLocalDateKey(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCatalogItemOperationalWeekdays(item, cleaningSite = "") {
  const normalizedCleaningSite = String(cleaningSite || "").trim().toUpperCase();
  const scheduledDays = normalizeCatalogScheduledDays(item?.scheduledDays, item?.frequency);
  const cleaningSites = normalizeCatalogCleaningSites(item?.cleaningSites);
  const scheduledDaysBySite = normalizeCatalogScheduledDaysBySite(item?.scheduledDaysBySite, scheduledDays);

  if (normalizedCleaningSite) {
    if (cleaningSites.length && !cleaningSites.includes(normalizedCleaningSite)) {
      return [];
    }
    if (cleaningSites.includes(normalizedCleaningSite)) {
      return scheduledDaysBySite[normalizedCleaningSite] || scheduledDays;
    }
    return scheduledDays;
  }

  if (!cleaningSites.length) {
    return scheduledDays;
  }

  return [...new Set(cleaningSites.flatMap((site) => scheduledDaysBySite[site] || scheduledDays))].sort((a, b) => a - b);
}

function getBoardActivityListValuesForOperationalDay(field, catalog = [], weekdayOffset = null, cleaningSite = "") {
  const selectedCategory = String(field?.optionCatalogCategory || "").trim();
  const normalizedWeekdayOffset = normalizeCatalogWeekdayOffset(weekdayOffset);
  const seen = new Set();
  return (catalog || [])
    .filter((item) => !item?.isDeleted)
    .filter((item) => !selectedCategory || String(item.category || "General").trim() === selectedCategory)
    .filter((item) => {
      if (normalizedWeekdayOffset === null) return true;
      const activeDays = getCatalogItemOperationalWeekdays(item, cleaningSite);
      return activeDays.includes(normalizedWeekdayOffset);
    })
    .map((item) => String(item.name || "").trim())
    .filter((name) => {
      const normalizedName = normalizeKey(name);
      if (!normalizedName || seen.has(normalizedName)) return false;
      seen.add(normalizedName);
      return true;
    });
}

function getBoardActivityListValues(field, catalog = []) {
  const selectedCategory = String(field?.optionCatalogCategory || "").trim();
  const seen = new Set();
  return (catalog || [])
    .filter((item) => !item?.isDeleted)
    .filter((item) => !selectedCategory || String(item.category || "General").trim() === selectedCategory)
    .map((item) => String(item.name || "").trim())
    .filter((name) => {
      const normalizedName = normalizeKey(name);
      if (!normalizedName || seen.has(normalizedName)) return false;
      seen.add(normalizedName);
      return true;
    });
}

function findMatchingPreviousBoardField(nextField, previousFields = []) {
  if (!nextField) return null;
  const normalizedPreviousFields = previousFields || [];
  const exactMatch = normalizedPreviousFields.find((field) => field.id === nextField.id);
  if (exactMatch) return exactMatch;

  if (nextField.templateKey) {
    const templateMatch = normalizedPreviousFields.find((field) => field.templateKey && field.templateKey === nextField.templateKey);
    if (templateMatch) return templateMatch;
  }

  return normalizedPreviousFields.find((field) => (
      normalizeKey(field.label) === normalizeKey(nextField.label)
      && String(field.type || "") === String(nextField.type || "")
      && normalizeKey(field.groupName || "General") === normalizeKey(nextField.groupName || "General")
    ))
    || null;
}

function remapBoardRowValues(row, previousFields, nextFields, fallbackResponsibleId) {
  const rowValues = row?.values ?? EMPTY_OBJECT;
  return (nextFields || []).reduce((accumulator, nextField) => {
    if (hasOwn(rowValues, nextField.id)) {
      accumulator[nextField.id] = rowValues[nextField.id];
      return accumulator;
    }

    const matchedPreviousField = findMatchingPreviousBoardField(nextField, previousFields);
    if (matchedPreviousField && hasOwn(rowValues, matchedPreviousField.id)) {
      accumulator[nextField.id] = rowValues[matchedPreviousField.id];
      return accumulator;
    }

    accumulator[nextField.id] = getBoardFieldDefaultValue(nextField, row?.responsibleId || fallbackResponsibleId);
    return accumulator;
  }, {});
}

function createBoardRowRecord(fields, responsibleId, partial = {}) {
  const responsibleIds = normalizeBoardResponsibleIds(partial?.responsibleIds, partial?.responsibleId || responsibleId);
  const effectiveResponsibleId = responsibleIds[0] || "";
  const rawTotalOverride = Number(partial?.totalElapsedSecondsOverride);
  const totalElapsedSecondsOverride = Number.isFinite(rawTotalOverride) && rawTotalOverride >= 0
    ? Math.max(0, rawTotalOverride)
    : null;
  const normalizedStatus = String(partial?.status || "Pendiente");
  const createdAtIso = partial?.createdAt || new Date().toISOString();
  let normalizedStartTime = partial?.startTime ?? null;
  let normalizedLastResumedAt = partial?.lastResumedAt ?? null;

  if (normalizedStatus === "En curso") {
    const baselineIso = normalizedStartTime || normalizedLastResumedAt || createdAtIso;
    normalizedStartTime = normalizedStartTime || baselineIso;
    normalizedLastResumedAt = normalizedLastResumedAt || baselineIso;
  }

  const baseValues = (fields || []).reduce((accumulator, field) => {
    accumulator[field.id] = getBoardFieldDefaultValue(field, effectiveResponsibleId);
    return accumulator;
  }, {});

  const nextRow = {
    id: partial?.id || makeId("row"),
    values: {
      ...baseValues,
      ...(partial?.values ?? EMPTY_OBJECT),
    },
    responsibleId: effectiveResponsibleId,
    responsibleIds,
    status: normalizedStatus,
    startTime: normalizedStartTime,
    endTime: partial?.endTime ?? null,
    accumulatedSeconds: Number(partial?.accumulatedSeconds || 0),
    totalElapsedSecondsOverride,
    lastResumedAt: normalizedLastResumedAt,
    pauseUsageByDay: partial?.pauseUsageByDay && typeof partial.pauseUsageByDay === "object" ? partial.pauseUsageByDay : {},
    pauseLogs: Array.isArray(partial?.pauseLogs)
      ? partial.pauseLogs.map((entry) => ({
          id: entry?.id || makeId("pause"),
          reason: String(entry?.reason || "").trim(),
          pausedAt: entry?.pausedAt || null,
          resumedAt: entry?.resumedAt || null,
          pauseDurationSeconds: Math.max(0, Number(entry?.pauseDurationSeconds || 0)),
          pauseAuthorizedSeconds: getPauseLogAuthorizedSeconds(entry),
          countedPauseDurationSeconds: getPauseLogCountedSeconds(entry),
        }))
      : [],
    createdAt: createdAtIso,
  };

  if (hasOwn(partial, "lastPauseReason")) {
    nextRow.lastPauseReason = partial.lastPauseReason || "";
  }

  return nextRow;
}

function syncBoardRowPauseLogsWithCounters(row, nowIso, pauseControl) {
  if (!row || !row.startTime) return row?.pauseLogs || [];
  const blockedReasonKey = "ajuste manual de contadores";
  const existingLogs = Array.isArray(row.pauseLogs) ? row.pauseLogs : [];
  return existingLogs
    .map((entry) => ({ ...entry }))
    .filter((entry) => normalizeKey(entry?.reason || "") !== blockedReasonKey);
}

function buildBoardRowsFromActivityList(fields, catalog, responsibleId, previousFields = [], previousRows = []) {
  const nextFields = Array.isArray(fields) ? fields : [];
  const normalizedPreviousFields = Array.isArray(previousFields) ? previousFields : [];
  const normalizedPreviousRows = Array.isArray(previousRows) ? previousRows : [];
  const activityListField = findBoardActivityListField(nextFields);

  if (!activityListField) {
    return normalizedPreviousRows.map((row) => createBoardRowRecord(nextFields, row?.responsibleId || "", {
      ...row,
      values: remapBoardRowValues(row, normalizedPreviousFields, nextFields, row?.responsibleId || ""),
    }));
  }

  const activityNames = getBoardActivityListValues(activityListField, catalog);
  const previousActivityField = findBoardActivityListField(normalizedPreviousFields) || findMatchingPreviousBoardField(activityListField, normalizedPreviousFields);
  const usedRowIds = new Set();

  const seededRows = activityNames.map((activityName) => {
    const matchingRow = normalizedPreviousRows.find((row) => {
      if (!row || usedRowIds.has(row.id)) return false;
      const rowValues = row.values ?? EMPTY_OBJECT;
      const previousValue = previousActivityField?.id && hasOwn(rowValues, previousActivityField.id)
        ? rowValues[previousActivityField.id]
        : rowValues[activityListField.id];
      return normalizeKey(previousValue) === normalizeKey(activityName);
    });

    const rowResponsibleId = matchingRow?.responsibleId || "";
    const nextValues = matchingRow
      ? remapBoardRowValues(matchingRow, normalizedPreviousFields, nextFields, rowResponsibleId)
      : (nextFields || []).reduce((accumulator, field) => {
        accumulator[field.id] = getBoardFieldDefaultValue(field, rowResponsibleId);
        return accumulator;
      }, {});

    nextValues[activityListField.id] = activityName;
    if (matchingRow) usedRowIds.add(matchingRow.id);

    const nextPartial = matchingRow
      ? { ...matchingRow, values: nextValues }
      : { values: nextValues };
    return createBoardRowRecord(nextFields, rowResponsibleId, nextPartial);
  });

  const remainingRows = normalizedPreviousRows
    .filter((row) => row && !usedRowIds.has(row.id))
    .map((row) => createBoardRowRecord(nextFields, row.responsibleId || "", {
      ...row,
      values: remapBoardRowValues(row, normalizedPreviousFields, nextFields, row.responsibleId || ""),
    }));

  return seededRows.concat(remainingRows);
}

function sanitizeTemplateDraft(draft, currentUser) {
  const visibilityType = ["all", "department", "users"].includes(draft?.visibilityType) ? draft.visibilityType : "department";
  return {
    name: String(draft?.name || "").trim(),
    description: String(draft?.description || "").trim(),
    category: String(draft?.category || "").trim() || "Personalizada",
    visibilityType,
    sharedDepartments: Array.from(new Set((Array.isArray(draft?.sharedDepartments) ? draft.sharedDepartments : []).map((entry) => String(entry || "").trim()).filter(Boolean))),
    sharedUserIds: Array.from(new Set((Array.isArray(draft?.sharedUserIds) ? draft.sharedUserIds : []).map((entry) => String(entry || "").trim()).filter(Boolean))),
    settings: withDefaultBoardSettings(draft?.settings),
    columns: Array.isArray(draft?.columns)
      ? draft.columns.map((column) => ({
          ...column,
          templateKey: column.templateKey || column.id || column.label,
          options: Array.isArray(column.options) ? [...column.options] : [],
          colorRules: Array.isArray(column.colorRules) ? column.colorRules.map((rule) => ({ ...rule })) : [],
        }))
      : [],
    creatorDepartment: currentUser?.department || "",
  };
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

const ALLOWED_SYSTEM_BOARD_TEMPLATE_IDS = new Set([
  "actividades-limpieza",
  "revision-tarimas",
  "devoluciones-reacondicionado",
]);

const ALLOWED_SYSTEM_BOARD_TEMPLATE_NAMES = new Set([
  normalizeKey("Actividades de limpieza"),
  normalizeKey("Control de actividades de limpieza"),
  normalizeKey("Revisión de tarimas"),
  normalizeKey("Devoluciones / Reacondicionado por tarima"),
  normalizeKey("Devoluciones y reacondicionado"),
]);

function isAllowedPersistedBoardTemplateEntry(entry) {
  if (entry?.isCustom) return true;
  const rawId = normalizeKey(entry?.id || entry?.settings?.systemBoardTemplateId || "");
  if (rawId && ALLOWED_SYSTEM_BOARD_TEMPLATE_IDS.has(rawId)) return true;
  const normalizedName = normalizeKey(entry?.name || "");
  return Boolean(normalizedName) && ALLOWED_SYSTEM_BOARD_TEMPLATE_NAMES.has(normalizedName);
}

const OFFICIAL_SYSTEM_BOARD_TEMPLATES = [
  { id: "revision-tarimas", name: "Revisión de tarimas", aliases: [] },
  {
    id: "actividades-limpieza",
    name: "Actividades de limpieza",
    aliases: ["activiades de limpieza", "control de actividades de limpieza"],
  },
  {
    id: "devoluciones-reacondicionado",
    name: "Devoluciones / Reacondicionado por tarima",
    aliases: ["devoluciones y reacondicionado", "reacondicionado por tarima"],
  },
];

function resolveOfficialSystemBoardTemplate(entry) {
  if (!entry) return null;
  const systemTemplateId = String(entry?.settings?.systemBoardTemplateId || "").trim();
  if (systemTemplateId) {
    const byId = OFFICIAL_SYSTEM_BOARD_TEMPLATES.find((template) => template.id === systemTemplateId);
    if (byId) return byId;
  }

  const normalizedName = normalizeKey(entry?.name || "");
  return OFFICIAL_SYSTEM_BOARD_TEMPLATES.find((template) => {
    if (normalizeKey(template.name) === normalizedName) return true;
    return (template.aliases || []).some((alias) => normalizeKey(alias) === normalizedName);
  }) || null;
}

function isProtectedSystemBoard(entry) {
  return Boolean(resolveOfficialSystemBoardTemplate(entry));
}

function normalizeAreaOption(area) {
  return String(area || "")
    .trim()
    .toUpperCase()
    .replaceAll("\\", "/")
    .replaceAll(" - ", " / ")
    .replaceAll(" > ", " / ")
    .replace(/\s*\/\s*/g, " / ");
}

function splitAreaAndSubArea(areaValue) {
  const normalizedValue = normalizeAreaOption(areaValue);
  if (!normalizedValue) return { area: "", subArea: "" };
  const parts = normalizedValue.split("/").map((entry) => String(entry || "").trim()).filter(Boolean);
  return {
    area: parts[0] || "",
    subArea: parts.length > 1 ? parts.slice(1).join(" / ") : "",
  };
}

function buildAreaWithSubArea(area, subArea = "") {
  const normalizedArea = normalizeAreaOption(area);
  const normalizedSubArea = normalizeAreaOption(subArea);
  if (!normalizedArea) return "";
  return normalizedSubArea ? `${normalizedArea} / ${normalizedSubArea}` : normalizedArea;
}

function normalizeBoardVisibilityType(value) {
  const normalizedValue = String(value || "").trim();
  return ["all", "department", "users"].includes(normalizedValue) ? normalizedValue : "users";
}

function normalizeBoardSharedDepartments(entries = []) {
  return Array.from(new Set((Array.isArray(entries) ? entries : [])
    .map((entry) => normalizeAreaOption(entry))
    .filter(Boolean)));
}

function normalizeBoardAccessUserIds(entries = [], ownerId = "") {
  return Array.from(new Set((Array.isArray(entries) ? entries : [])
    .map((entry) => String(entry || "").trim())
    .filter((entry) => entry && entry !== ownerId)));
}

function normalizeBoardResponsibleIds(entries = [], fallbackResponsibleId = "") {
  const normalized = Array.from(new Set((Array.isArray(entries) ? entries : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)));
  if (normalized.length) return normalized;
  const fallbackId = String(fallbackResponsibleId || "").trim();
  return fallbackId ? [fallbackId] : [];
}

function resolveBoardVisibilitySnapshot(board, ownerId = "") {
  const visibilityType = normalizeBoardVisibilityType(board?.visibilityType);
  return {
    visibilityType,
    sharedDepartments: visibilityType === "department" ? normalizeBoardSharedDepartments(board?.sharedDepartments) : [],
    accessUserIds: visibilityType === "users" ? normalizeBoardAccessUserIds(board?.accessUserIds, ownerId) : [],
  };
}

function doesBoardMatchWarehouseUserArea(board, user) {
  if (!board || !user) return false;
  const ownerArea = normalizeBoardOwnerArea(board?.settings?.ownerArea || board?.ownerArea || "");
  if (!ownerArea) return true;
  const userArea = normalizeBoardOwnerArea(user?.department || user?.area || "");
  return Boolean(userArea) && userArea === ownerArea;
}

function buildAreaCatalogEntries(users = [], catalog = []) {
  return Array.from(new Set((catalog || []).concat((users || []).map((user) => normalizeAreaOption(user.area || user.department || ""))).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function sanitizeInventoryItemDraft(item, existingId = null) {
  return normalizeInventoryItemRecord(item, existingId);
}

function hasInsufficientInventoryStock(nextStockUnits, currentDomain = "", allocatedUnits = 0) {
  return nextStockUnits < 0;
}

function applyInventoryStockDelta(nextStockUnits, quantity, currentDomain, allocatedUnits, delta) {
  const updatedStockUnits = nextStockUnits + (delta * quantity);
  if (hasInsufficientInventoryStock(updatedStockUnits, currentDomain, allocatedUnits)) {
    return { ok: false, reason: "insufficient_stock" };
  }

  return { ok: true, nextStockUnits: updatedStockUnits };
}

function resolveOrderTransferMovementState({ currentItem, payload, currentTransferTargets, quantity, nextStockUnits, unitLabel, movementCreatedAt }) {
  const warehouse = String(payload?.warehouse || "").trim();
  const storageLocation = String(payload?.storageLocation || "").trim();
  if (!warehouse && !storageLocation) {
    return { ok: false, reason: "invalid_transfer_target" };
  }

  const destinationKey = buildInventoryTransferTargetKey(warehouse, storageLocation);
  const targetIndex = currentTransferTargets.findIndex((target) => target.destinationKey === destinationKey);
  const existingTarget = targetIndex >= 0 ? currentTransferTargets[targetIndex] : null;
  const previousBalanceUnits = Math.max(0, Number(existingTarget?.availableUnits || 0));
  const hasRemainingUnits = hasInventoryBalanceInput(payload?.remainingUnits);

  if (existingTarget && !hasRemainingUnits) {
    return { ok: false, reason: "remaining_units_required" };
  }

  let remainingUnits = null;
  if (hasRemainingUnits) {
    remainingUnits = Math.max(0, Number(payload?.remainingUnits || 0));
    if (Number.isNaN(remainingUnits)) {
      return { ok: false, reason: "invalid_payload" };
    }
  }

  if (nextStockUnits < quantity) {
    return { ok: false, reason: "insufficient_stock" };
  }

  const reconciledBalanceUnits = hasRemainingUnits ? remainingUnits : previousBalanceUnits;
  const destinationBalanceUnits = reconciledBalanceUnits + quantity;
  const nextTarget = normalizeInventoryTransferTargetRecord({
    ...existingTarget,
    destinationKey,
    warehouse,
    storageLocation,
    recipientName: String(payload?.recipientName || existingTarget?.recipientName || "").trim(),
    unitLabel,
    availableUnits: destinationBalanceUnits,
    updatedAt: movementCreatedAt,
  }, unitLabel);
  const nextTransferTargets = targetIndex >= 0
    ? currentTransferTargets.map((target, index) => (index === targetIndex ? nextTarget : target))
    : [nextTarget, ...currentTransferTargets];

  return {
    ok: true,
    nextStockUnits: nextStockUnits - quantity,
    nextStorageLocation: String(currentItem.storageLocation || "").trim(),
    nextTransferTargets,
    remainingUnits,
    destinationBalanceUnits,
    destinationKey,
  };
}

function resolveWarehouseInventoryMovementState({ currentItem, payload, movementType, quantity, unitLabel, movementCreatedAt }) {
  const currentDomain = normalizeInventoryDomain(currentItem.domain);
  const currentTransferTargets = normalizeInventoryTransferTargets(currentItem.transferTargets, currentItem.unitLabel || "pzas");
  const allocatedUnits = sumInventoryTransferTargetUnits(currentTransferTargets);
  const nextStockUnits = Number(currentItem.stockUnits || 0);
  const nextStorageLocation = String(payload?.storageLocation || currentItem.storageLocation || "").trim();
  const destinationKey = String(payload?.destinationKey || "").trim();

  if (movementType === "restock") {
    return {
      ok: true,
      nextStockUnits: nextStockUnits + quantity,
      nextStorageLocation,
      nextTransferTargets: currentTransferTargets,
      remainingUnits: null,
      destinationBalanceUnits: null,
      destinationKey,
    };
  }

  if (movementType === "transfer" && currentDomain === "orders") {
    return resolveOrderTransferMovementState({
      currentItem,
      payload,
      currentTransferTargets,
      quantity,
      nextStockUnits,
      unitLabel,
      movementCreatedAt,
    });
  }

  const stockResult = applyInventoryStockDelta(nextStockUnits, quantity, currentDomain, allocatedUnits, -1);
  if (!stockResult.ok) {
    return stockResult;
  }

  return {
    ok: true,
    nextStockUnits: stockResult.nextStockUnits,
    nextStorageLocation,
    nextTransferTargets: currentTransferTargets,
    remainingUnits: null,
    destinationBalanceUnits: null,
    destinationKey,
  };
}

export function createWarehouseInventoryItem(auth, payload) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, getInventoryManageActionId(payload?.domain), currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const item = sanitizeInventoryItemDraft(payload);
  if (!item.code || !item.name || Number.isNaN(item.piecesPerBox) || Number.isNaN(item.boxesPerPallet)) {
    return { ok: false, reason: "invalid_payload" };
  }

  const duplicate = (currentState.inventoryItems || []).find((entry) => normalizeKey(entry.code) === normalizeKey(item.code));
  if (duplicate) {
    return { ok: false, reason: "duplicate_code" };
  }

  const nextState = {
    ...currentState,
    inventoryItems: [...(currentState.inventoryItems || []), item],
  };

  return { ok: true, state: replaceWarehouseState(nextState), itemId: item.id, itemCode: item.code };
}

export function updateWarehouseInventoryItem(auth, itemId, payload) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const currentItem = (currentState.inventoryItems || []).find((entry) => entry.id === itemId);
  if (!currentItem) return { ok: false, reason: "item_not_found" };

  const nextDomain = normalizeInventoryDomain(payload?.domain || currentItem.domain);
  const allowed = [getInventoryManageActionId(currentItem.domain), getInventoryManageActionId(nextDomain)]
    .every((actionId) => canUserDoWarehouseAction(currentUser, actionId, currentState.permissions));
  if (!allowed) {
    return { ok: false, reason: "forbidden" };
  }

  const draftItem = sanitizeInventoryItemDraft(payload, itemId);

  // Merge lot history so prior entries are never lost on a simple PATCH.
  const incomingLotesCaducidades = String(draftItem.customFields?.lotesCaducidades || "").trim();
  const incomingLot = String(draftItem.customFields?.lote || "").trim();
  const incomingExpiry = String(draftItem.customFields?.caducidad || "").trim();
  const incomingEtiqueta = String(draftItem.customFields?.etiqueta || "").trim();
  const existingLotHistory = parseWarehouseInventoryLotHistory(currentItem?.customFields?.lotesCaducidades);
  const incomingLotHistory = parseWarehouseInventoryLotHistory(incomingLotesCaducidades);
  const legacyLotEntry = getWarehouseLegacyLotHistoryEntry(currentItem);
  const directLotEntry = incomingLot && incomingExpiry
    ? [{ lot: incomingLot, expiry: incomingExpiry, etiqueta: incomingEtiqueta, updatedAt: new Date().toISOString() }]
    : [];
  const mergedLotHistory = mergeWarehouseInventoryLotHistoryEntries(
    directLotEntry,
    incomingLotHistory,
    existingLotHistory,
    legacyLotEntry ? [legacyLotEntry] : [],
  ).slice(0, 300);

  if (mergedLotHistory.length) {
    draftItem.customFields = {
      ...draftItem.customFields,
      lotesCaducidades: JSON.stringify(mergedLotHistory),
    };
  }

  const item = mergeInventoryItemTransferTargets(currentItem, draftItem);
  if (!item.code || !item.name || Number.isNaN(item.piecesPerBox) || Number.isNaN(item.boxesPerPallet)) {
    return { ok: false, reason: "invalid_payload" };
  }

  const duplicate = (currentState.inventoryItems || []).find((entry) => entry.id !== itemId && normalizeKey(entry.code) === normalizeKey(item.code));
  if (duplicate) {
    return { ok: false, reason: "duplicate_code" };
  }

  const nextState = {
    ...currentState,
    inventoryItems: (currentState.inventoryItems || []).map((entry) => (entry.id === itemId ? item : entry)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), itemId: item.id, itemCode: item.code };
}

export function updateWarehouseInventoryLotHistory(auth, itemId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const currentItem = (currentState.inventoryItems || []).find((entry) => entry.id === itemId);
  if (!currentItem) return { ok: false, reason: "item_not_found" };

  const canManageInventory = canUserDoWarehouseAction(
    currentUser,
    getInventoryManageActionId(currentItem.domain),
    currentState.permissions,
  );
  const canOperateBoard = canUserDoWarehouseAction(currentUser, "createBoardRow", currentState.permissions)
    || canUserDoWarehouseAction(currentUser, "boardWorkflow", currentState.permissions);
  if (!canManageInventory && !canOperateBoard) {
    return { ok: false, reason: "forbidden" };
  }

  const incomingCustomFields = payload?.customFields && typeof payload.customFields === "object"
    ? payload.customFields
    : {};
  const lot = String(incomingCustomFields.lote ?? payload?.lote ?? "").trim();
  const expiry = String(incomingCustomFields.caducidad ?? payload?.caducidad ?? "").trim();
  const etiqueta = String(incomingCustomFields.etiqueta ?? payload?.etiqueta ?? "").trim();
  const lotesCaducidades = String(incomingCustomFields.lotesCaducidades ?? payload?.lotesCaducidades ?? "").trim();

  const existingHistory = parseWarehouseInventoryLotHistory(currentItem?.customFields?.lotesCaducidades);
  const incomingHistory = parseWarehouseInventoryLotHistory(lotesCaducidades);
  const legacyEntry = getWarehouseLegacyLotHistoryEntry(currentItem);
  const directEntry = lot && expiry
    ? [{ lot, expiry, etiqueta, updatedAt: new Date().toISOString() }]
    : [];
  const nextHistory = mergeWarehouseInventoryLotHistoryEntries(
    directEntry,
    incomingHistory,
    existingHistory,
    legacyEntry ? [legacyEntry] : [],
  ).slice(0, 300);

  const latestEntry = nextHistory[0] || null;
  const nextLot = lot || latestEntry?.lot || "";
  const nextExpiry = expiry || latestEntry?.expiry || "";
  const nextEtiqueta = etiqueta || latestEntry?.etiqueta || latestEntry?.label || "";

  const nextCustomFields = {
    ...(currentItem.customFields || {}),
    ...(nextLot ? { lote: nextLot } : {}),
    ...(nextExpiry ? { caducidad: nextExpiry } : {}),
    ...(nextEtiqueta ? { etiqueta: nextEtiqueta } : {}),
    ...(nextHistory.length ? { lotesCaducidades: JSON.stringify(nextHistory) } : {}),
  };

  const nextItem = normalizeInventoryItemRecord({
    ...currentItem,
    customFields: nextCustomFields,
  }, currentItem.id);

  const nextState = {
    ...currentState,
    inventoryItems: (currentState.inventoryItems || []).map((entry) => (entry.id === itemId ? nextItem : entry)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), itemId: nextItem.id, itemCode: nextItem.code };
}

export function createWarehouseInventoryDestination(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageOrderInventory", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const destination = normalizeInventoryDestination(payload);
  if (!destination) return { ok: false, reason: "invalid_payload" };

  const duplicate = (currentState.inventoryDestinations || []).some((entry) => entry?.destinationKey === destination.destinationKey);
  if (duplicate) return { ok: false, reason: "duplicate_destination" };

  const nextState = {
    ...currentState,
    inventoryDestinations: [...(currentState.inventoryDestinations || []), destination],
  };

  return { ok: true, state: replaceWarehouseState(nextState), destinationId: destination.id };
}

export function updateWarehouseInventoryDestination(auth, destinationId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageOrderInventory", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const targetId = String(destinationId || "").trim();
  if (!targetId) return { ok: false, reason: "destination_not_found" };

  const currentDestination = (currentState.inventoryDestinations || []).find((entry) => entry.id === targetId);
  if (!currentDestination) return { ok: false, reason: "destination_not_found" };

  const nextDestination = normalizeInventoryDestination({ ...currentDestination, ...payload }, targetId);
  if (!nextDestination) return { ok: false, reason: "invalid_payload" };

  const duplicate = (currentState.inventoryDestinations || []).some((entry) =>
    entry.id !== targetId && entry.destinationKey === nextDestination.destinationKey,
  );
  if (duplicate) return { ok: false, reason: "duplicate_destination" };

  const nextInventoryItems = (currentState.inventoryItems || []).map((item) => {
    if (normalizeInventoryDomain(item.domain) !== "orders") return item;
    const nextTargets = (item.transferTargets || []).map((target) => {
      if (target.destinationKey !== currentDestination.destinationKey) return target;
      return {
        ...target,
        warehouse: nextDestination.warehouse,
        storageLocation: nextDestination.storageLocation,
        recipientName: nextDestination.recipientName,
        destinationKey: nextDestination.destinationKey,
      };
    });
    return {
      ...item,
      transferTargets: normalizeInventoryTransferTargets(nextTargets, item.unitLabel || "pzas"),
    };
  });

  const nextState = {
    ...currentState,
    inventoryDestinations: (currentState.inventoryDestinations || []).map((entry) => (entry.id === targetId ? nextDestination : entry)),
    inventoryItems: nextInventoryItems,
  };

  return { ok: true, state: replaceWarehouseState(nextState), destinationId: targetId };
}

export function deleteWarehouseInventoryDestination(auth, destinationId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageOrderInventory", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const targetId = String(destinationId || "").trim();
  if (!targetId) return { ok: false, reason: "destination_not_found" };

  const currentDestination = (currentState.inventoryDestinations || []).find((entry) => entry.id === targetId);
  if (!currentDestination) return { ok: false, reason: "destination_not_found" };

  const nextInventoryItems = (currentState.inventoryItems || []).map((item) => {
    if (normalizeInventoryDomain(item.domain) !== "orders") return item;
    return {
      ...item,
      transferTargets: normalizeInventoryTransferTargets(
        (item.transferTargets || []).filter((target) => target.destinationKey !== currentDestination.destinationKey),
        item.unitLabel || "pzas",
      ),
    };
  });

  const nextState = {
    ...currentState,
    inventoryDestinations: (currentState.inventoryDestinations || []).filter((entry) => entry.id !== targetId),
    inventoryItems: nextInventoryItems,
  };

  return { ok: true, state: replaceWarehouseState(nextState), destinationId: targetId };
}

function parseWarehouseInventoryLotHistory(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue !== "string") return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildWarehouseInventoryLotHistoryKey(entry) {
  const lot = String(entry?.lot || "").trim();
  const expiry = String(entry?.expiry || "").trim();
  const etiqueta = String(entry?.etiqueta || entry?.label || "").trim();
  return `${normalizeKey(lot)}::${expiry}::${normalizeKey(etiqueta)}`;
}

function mergeWarehouseInventoryLotHistoryEntries(...sources) {
  const merged = [];
  const seen = new Set();

  sources.forEach((source) => {
    (Array.isArray(source) ? source : []).forEach((entry) => {
      const lot = String(entry?.lot || "").trim();
      const expiry = String(entry?.expiry || "").trim();
      if (!lot || !expiry) return;
      const etiqueta = String(entry?.etiqueta || entry?.label || "").trim();
      const key = buildWarehouseInventoryLotHistoryKey({ lot, expiry, etiqueta });
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({
        lot,
        expiry,
        etiqueta,
        updatedAt: String(entry?.updatedAt || "").trim(),
      });
    });
  });

  return merged;
}

function getWarehouseLegacyLotHistoryEntry(item) {
  const lot = String(item?.customFields?.lote || "").trim();
  const expiry = String(item?.customFields?.caducidad || "").trim();
  if (!lot || !expiry) return null;
  return {
    lot,
    expiry,
    etiqueta: String(item?.customFields?.etiqueta || "").trim(),
    updatedAt: "",
  };
}

function syncBoardRowInventoryTraceability(state, board, row, valuesPatch = {}) {
  const safePatch = valuesPatch && typeof valuesPatch === "object" ? valuesPatch : EMPTY_OBJECT;
  if (!Object.keys(safePatch).length) return state;

  const editableTraceabilityFields = (board?.fields || []).filter((field) => (
    field?.type === "inventoryProperty"
    && ["lot", "expiry", "label"].includes(String(field?.inventoryProperty || "").trim())
  ));
  if (!editableTraceabilityFields.length) return state;

  const touchedFields = editableTraceabilityFields.filter((field) => hasOwn(safePatch, field.id));
  if (!touchedFields.length) return state;

  const rowValues = row?.values && typeof row.values === "object" ? row.values : EMPTY_OBJECT;
  const sourceFieldId = String(
    touchedFields.find((field) => field?.sourceFieldId)?.sourceFieldId
      || editableTraceabilityFields.find((field) => field?.sourceFieldId)?.sourceFieldId
      || "",
  ).trim();
  if (!sourceFieldId) return state;

  const inventoryItemId = String(rowValues[sourceFieldId] || "").trim();
  if (!inventoryItemId) return state;

  const currentItem = (state?.inventoryItems || []).find((item) => item.id === inventoryItemId);
  if (!currentItem) return state;

  const lotField = editableTraceabilityFields.find((field) => field.inventoryProperty === "lot") || null;
  const expiryField = editableTraceabilityFields.find((field) => field.inventoryProperty === "expiry") || null;
  const labelField = editableTraceabilityFields.find((field) => field.inventoryProperty === "label") || null;
  const nextLot = String(lotField ? rowValues[lotField.id] || "" : "").trim();
  const nextExpiry = String(expiryField ? rowValues[expiryField.id] || "" : "").trim();
  const nextEtiqueta = String(labelField ? rowValues[labelField.id] || "" : "").trim();

  if (!nextLot && !nextExpiry && !nextEtiqueta) return state;

  const existingHistory = parseWarehouseInventoryLotHistory(currentItem?.customFields?.lotesCaducidades);
  const legacyEntry = getWarehouseLegacyLotHistoryEntry(currentItem);
  const nextHistory = nextLot && nextExpiry
    ? mergeWarehouseInventoryLotHistoryEntries(
        [{ lot: nextLot, expiry: nextExpiry, etiqueta: nextEtiqueta, updatedAt: new Date().toISOString() }],
        existingHistory,
        legacyEntry ? [legacyEntry] : [],
      ).slice(0, 300)
    : mergeWarehouseInventoryLotHistoryEntries(existingHistory, legacyEntry ? [legacyEntry] : []).slice(0, 300);

  const nextCustomFields = {
    ...(currentItem.customFields || {}),
    ...(nextLot ? { lote: nextLot } : {}),
    ...(nextExpiry ? { caducidad: nextExpiry } : {}),
    ...(nextEtiqueta ? { etiqueta: nextEtiqueta } : {}),
    ...(nextHistory.length ? { lotesCaducidades: JSON.stringify(nextHistory) } : {}),
  };

  const nextItem = normalizeInventoryItemRecord({
    ...currentItem,
    customFields: nextCustomFields,
  }, currentItem.id);

  return {
    ...state,
    inventoryItems: (state.inventoryItems || []).map((item) => (item.id === currentItem.id ? nextItem : item)),
  };
}

export function deleteWarehouseInventoryItem(auth, itemId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const currentItem = (currentState.inventoryItems || []).find((entry) => entry.id === itemId);
  if (!currentItem) return { ok: false, reason: "item_not_found" };
  if (!canUserDoWarehouseAction(currentUser, getInventoryDeleteActionId(currentItem.domain), currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const nextState = {
    ...currentState,
    inventoryItems: (currentState.inventoryItems || []).filter((entry) => entry.id !== itemId),
    inventoryMovements: (currentState.inventoryMovements || []).filter((entry) => entry.itemId !== itemId),
  };

  return { ok: true, state: replaceWarehouseState(nextState), itemId: currentItem.id, itemCode: currentItem.code };
}

export function importWarehouseInventoryItems(auth, items) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!Array.isArray(items) || !items.length) {
    return { ok: false, reason: "invalid_payload" };
  }

  const importActionIds = Array.from(new Set(items.map((item) => getInventoryImportActionId(item?.domain))));
  if (!importActionIds.every((actionId) => canUserDoWarehouseAction(currentUser, actionId, currentState.permissions))) {
    return { ok: false, reason: "forbidden" };
  }

  // Create a map keyed by both domain and code to prevent mixing items of different domains
  const mergedByDomainAndCode = new Map(
    (currentState.inventoryItems || []).map((item) => [
      `${normalizeInventoryDomain(item.domain)}::${normalizeKey(item.code)}`,
      item,
    ])
  );
  
  let createdCount = 0;
  let updatedCount = 0;

  for (const rawItem of items) {
    const sanitized = sanitizeInventoryItemDraft(rawItem);
    if (!sanitized.code || !sanitized.name || Number.isNaN(sanitized.piecesPerBox) || Number.isNaN(sanitized.boxesPerPallet)) {
      return { ok: false, reason: "invalid_payload" };
    }

    const domain = normalizeInventoryDomain(sanitized.domain);
    const key = `${domain}::${normalizeKey(sanitized.code)}`;
    const currentItem = mergedByDomainAndCode.get(key);
    
    if (currentItem) {
      updatedCount += 1;
      mergedByDomainAndCode.set(key, normalizeInventoryItemRecord(mergeInventoryItemTransferTargets(currentItem, { ...currentItem, ...sanitized, domain }), currentItem.id));
    } else {
      createdCount += 1;
      mergedByDomainAndCode.set(key, normalizeInventoryItemRecord({ ...sanitized, domain }, makeId("inv")));
    }
  }

  const nextState = {
    ...currentState,
    inventoryItems: Array.from(mergedByDomainAndCode.values()),
  };

  return {
    ok: true,
    state: replaceWarehouseState(nextState),
    createdCount,
    updatedCount,
  };
}

export function createWarehouseInventoryMovement(auth, payload) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const itemId = String(payload?.itemId || "").trim();
  const quantity = Math.max(0, Number(payload?.quantity || 0));
  if (!itemId || !quantity || Number.isNaN(quantity)) {
    return { ok: false, reason: "invalid_payload" };
  }

  const currentItem = (currentState.inventoryItems || []).find((entry) => entry.id === itemId);
  if (!currentItem) return { ok: false, reason: "item_not_found" };
  if (!canUserDoWarehouseAction(currentUser, getInventoryManageActionId(currentItem.domain), currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const movementType = normalizeInventoryMovementType(payload?.movementType);
  const movementCreatedAt = new Date().toISOString();
  const unitLabel = String(payload?.unitLabel || currentItem.unitLabel || "pzas").trim() || "pzas";
  const movementState = resolveWarehouseInventoryMovementState({
    currentItem,
    payload,
    movementType,
    quantity,
    unitLabel,
    movementCreatedAt,
  });
  if (!movementState.ok) {
    return movementState;
  }

  const nextItem = normalizeInventoryItemRecord({
    ...currentItem,
    stockUnits: movementState.nextStockUnits,
    storageLocation: movementState.nextStorageLocation,
    transferTargets: movementState.nextTransferTargets,
  }, currentItem.id);
  const movement = normalizeInventoryMovementRecord({
    ...payload,
    itemId: currentItem.id,
    itemCode: currentItem.code,
    itemName: currentItem.name,
    domain: currentItem.domain,
    unitLabel,
    remainingUnits: movementState.remainingUnits,
    destinationBalanceUnits: movementState.destinationBalanceUnits,
    destinationKey: movementState.destinationKey,
    performedById: currentUser.id,
    createdAt: movementCreatedAt,
  }, currentItem);

  const nextState = {
    ...currentState,
    inventoryItems: (currentState.inventoryItems || []).map((entry) => (entry.id === itemId ? nextItem : entry)),
    inventoryMovements: [movement, ...(currentState.inventoryMovements || [])],
  };

  return {
    ok: true,
    state: replaceWarehouseState(nextState),
    movementId: movement.id,
    itemId: currentItem.id,
    itemCode: currentItem.code,
  };
}

export function addWarehouseArea(auth, areaName, parentArea = "") {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editUsers", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const normalizedParentArea = String(parentArea || "").trim();
  const nextArea = normalizedParentArea
    ? buildAreaWithSubArea(normalizedParentArea, areaName)
    : normalizeAreaOption(areaName);
  if (!nextArea) return { ok: false, reason: "invalid_payload" };
  const nextCatalog = buildAreaCatalogEntries(currentState.users, (currentState.areaCatalog || []).concat(nextArea));
  if ((currentState.areaCatalog || []).includes(nextArea)) {
    return { ok: false, reason: "duplicate_area" };
  }

  const nextState = {
    ...currentState,
    areaCatalog: nextCatalog,
  };

  return { ok: true, state: replaceWarehouseState(nextState), area: nextArea };
}

export function removeWarehouseArea(auth, areaName) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editUsers", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const normalizedTarget = normalizeAreaOption(areaName);
  if (!normalizedTarget) return { ok: false, reason: "invalid_payload" };

  const { area: rootArea, subArea } = splitAreaAndSubArea(normalizedTarget);
  const deletingRootArea = !subArea;
  const currentCatalog = Array.isArray(currentState.areaCatalog) ? currentState.areaCatalog : [];

  const nextCatalog = currentCatalog.filter((entry) => {
    const normalizedEntry = normalizeAreaOption(entry);
    if (!normalizedEntry) return false;
    if (deletingRootArea) {
      return normalizedEntry !== rootArea && !normalizedEntry.startsWith(`${rootArea} / `);
    }
    return normalizedEntry !== normalizedTarget;
  });

  if (nextCatalog.length === currentCatalog.length) {
    return { ok: false, reason: "area_not_found" };
  }

  const nextUsers = (currentState.users || []).map((user) => {
    const userArea = normalizeAreaOption(user.area || user.department || "");
    if (!userArea) return user;

    if (deletingRootArea) {
      if (userArea === rootArea || userArea.startsWith(`${rootArea} / `)) {
        return { ...user, area: "", department: "" };
      }
      return user;
    }

    if (userArea === normalizedTarget) {
      return { ...user, area: rootArea, department: rootArea };
    }
    return user;
  });

  const nextState = {
    ...currentState,
    users: nextUsers,
    areaCatalog: nextCatalog,
  };

  return { ok: true, state: replaceWarehouseState(nextState), removedArea: normalizedTarget };
}

export function duplicateWarehouseInventoryItem(auth, itemId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const sourceItem = (currentState.inventoryItems || []).find((entry) => entry.id === itemId);
  if (!sourceItem) return { ok: false, reason: "item_not_found" };
  if (!canUserDoWarehouseAction(currentUser, getInventoryManageActionId(sourceItem.domain), currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const existingCodes = new Set((currentState.inventoryItems || []).map((entry) => normalizeKey(entry.code)));
  const baseCode = String(sourceItem.code || "").trim() || "ITEM";
  let copyCode = `${baseCode}-COPY`;
  let copyCounter = 2;
  while (existingCodes.has(normalizeKey(copyCode))) {
    copyCode = `${baseCode}-COPY-${copyCounter}`;
    copyCounter += 1;
  }

  const duplicateItem = sanitizeInventoryItemDraft({
    ...sourceItem,
    id: makeId("inv"),
    code: copyCode,
  });

  const sourceIndex = (currentState.inventoryItems || []).findIndex((entry) => entry.id === sourceItem.id);
  const nextInventoryItems = [...(currentState.inventoryItems || [])];
  nextInventoryItems.splice(sourceIndex + 1, 0, duplicateItem);

  const nextState = {
    ...currentState,
    inventoryItems: nextInventoryItems,
  };

  return {
    ok: true,
    state: replaceWarehouseState(nextState),
    itemId: duplicateItem.id,
    itemCode: duplicateItem.code,
    sourceItemId: sourceItem.id,
  };
}

export function createWarehouseInventoryColumn(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageInventory", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const domain = normalizeInventoryDomain(payload?.domain);
  const label = String(payload?.label || "").trim();
  if (!label) return { ok: false, reason: "invalid_payload" };

  const nextKeyBase = normalizeKey(payload?.key || label).replace(/[^a-z0-9]/g, "");
  const keySeed = nextKeyBase || "campo";
  const existingKeys = new Set((currentState.inventoryColumns || [])
    .filter((entry) => normalizeInventoryDomain(entry.domain) === domain)
    .map((entry) => String(entry.key || "").trim().toLowerCase()));

  let key = keySeed;
  let index = 2;
  while (existingKeys.has(key)) {
    key = `${keySeed}${index}`;
    index += 1;
  }

  const column = {
    id: makeId("invcol"),
    domain,
    label,
    key,
    createdAt: new Date().toISOString(),
    isSystem: false,
  };

  const nextState = {
    ...currentState,
    inventoryColumns: withSystemInventoryColumns([...(currentState.inventoryColumns || []), column]),
  };

  return { ok: true, state: replaceWarehouseState(nextState), column };
}

export function deleteWarehouseInventoryColumn(auth, columnId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageInventory", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const currentColumns = currentState.inventoryColumns || [];
  const target = currentColumns.find((entry) => entry.id === columnId);
  if (!target) return { ok: false, reason: "column_not_found" };
  if (target.isSystem) return { ok: false, reason: "system_column" };

  const nextColumns = currentColumns.filter((entry) => entry.id !== columnId);
  const nextItems = (currentState.inventoryItems || []).map((item) => {
    const nextCustomFields = { ...(item.customFields || {}) };
    delete nextCustomFields[target.key];
    return normalizeInventoryItemRecord({
      ...item,
      customFields: nextCustomFields,
    }, item.id);
  });

  const nextState = {
    ...currentState,
    inventoryColumns: nextColumns,
    inventoryItems: nextItems,
  };

  return { ok: true, state: replaceWarehouseState(nextState), columnId };
}

function normalizeProcessAuditQuestionType(typeValue) {
  const normalized = String(typeValue || "").trim().toLowerCase();
  return PROCESS_AUDIT_QUESTION_TYPES.includes(normalized) ? normalized : "yesno";
}

function normalizeProcessAuditImpactLevel(impactValue) {
  const normalized = String(impactValue || "").trim().toLowerCase();
  return PROCESS_AUDIT_IMPACT_LEVELS.includes(normalized) ? normalized : "medium";
}

function normalizeProcessAuditLifecycleStatus(statusValue) {
  const normalized = String(statusValue || "").trim().toLowerCase();
  return PROCESS_AUDIT_LIFECYCLE_STATUSES.includes(normalized) ? normalized : "pending";
}

function normalizeProcessAuditProposalType(typeValue) {
  const normalized = String(typeValue || "").trim().toLowerCase();
  return PROCESS_AUDIT_PROPOSAL_TYPES.includes(normalized) ? normalized : "improvement";
}

function normalizeProcessAuditEffortLevel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROCESS_AUDIT_EFFORT_LEVELS.includes(normalized) ? normalized : "medium";
}

function normalizeProcessAuditQuestionAnswer(questionType, rawAnswer, question = {}) {
  if (questionType === "yesno") {
    return rawAnswer === true ? true : rawAnswer === false ? false : null;
  }
  if (questionType === "number" || questionType === "scale") {
    if (rawAnswer === null || rawAnswer === undefined || rawAnswer === "") return null;
    const asNumber = Number(rawAnswer);
    if (!Number.isFinite(asNumber)) return null;
    if (questionType === "scale") {
      const minValue = Number.isFinite(Number(question?.minValue)) ? Number(question.minValue) : 1;
      const maxValue = Number.isFinite(Number(question?.maxValue)) ? Number(question.maxValue) : 5;
      return Math.min(maxValue, Math.max(minValue, asNumber));
    }
    return asNumber;
  }
  if (questionType === "multi") {
    if (!Array.isArray(rawAnswer)) return [];
    return rawAnswer.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  return String(rawAnswer ?? "");
}

function resolveProcessAuditQuestionHasProblem(question = {}) {
  if (question.issueDetected === true) return true;
  if (question.issueDetected === false) return false;
  if (question.type === "yesno" && question.answer === false) return true;
  return false;
}

function resolveProcessAuditQuestionScoreColor(question = {}) {
  const hasProblem = resolveProcessAuditQuestionHasProblem(question);
  if (!hasProblem) return "green";
  const impact = normalizeProcessAuditImpactLevel(question.impactLevel);
  return impact === "high" ? "red" : "yellow";
}

function buildProcessAuditScoring(questions = []) {
  const source = Array.isArray(questions) ? questions : [];
  const activeQuestions = source.filter((question) => question?.isActive !== false);

  const questionScores = activeQuestions.map((question) => {
    const color = resolveProcessAuditQuestionScoreColor(question);
    const hasProblem = resolveProcessAuditQuestionHasProblem(question);
    return {
      questionId: question.id,
      category: question.category || "General",
      impactLevel: normalizeProcessAuditImpactLevel(question.impactLevel),
      hasProblem,
      color,
    };
  });

  const categoryMap = new Map();
  questionScores.forEach((entry) => {
    if (!categoryMap.has(entry.category)) {
      categoryMap.set(entry.category, { total: 0, red: 0, yellow: 0, green: 0 });
    }
    const bucket = categoryMap.get(entry.category);
    bucket.total += 1;
    if (entry.color === "red") bucket.red += 1;
    else if (entry.color === "yellow") bucket.yellow += 1;
    else bucket.green += 1;
  });

  const categoryScores = Array.from(categoryMap.entries()).map(([category, summary]) => {
    const color = summary.red > 0 ? "red" : summary.yellow > 0 ? "yellow" : "green";
    return {
      category,
      ...summary,
      color,
      scorePercent: summary.total > 0 ? Math.round((summary.green / summary.total) * 100) : 0,
    };
  });

  const globalSummary = categoryScores.reduce((acc, entry) => ({
    total: acc.total + entry.total,
    red: acc.red + entry.red,
    yellow: acc.yellow + entry.yellow,
    green: acc.green + entry.green,
  }), { total: 0, red: 0, yellow: 0, green: 0 });

  const globalColor = globalSummary.red > 0 ? "red" : globalSummary.yellow > 0 ? "yellow" : "green";

  return {
    questionScores,
    categoryScores,
    global: {
      ...globalSummary,
      color: globalColor,
      scorePercent: globalSummary.total > 0 ? Math.round((globalSummary.green / globalSummary.total) * 100) : 0,
    },
  };
}

function buildProcessAuditDetectedProblems(questions = []) {
  return (Array.isArray(questions) ? questions : [])
    .filter((question) => question?.isActive !== false)
    .filter((question) => resolveProcessAuditQuestionHasProblem(question))
    .map((question) => ({
      id: question.problemId || makeId("paproblem"),
      questionId: question.id,
      category: question.category || "General",
      impactLevel: normalizeProcessAuditImpactLevel(question.impactLevel),
      problem: String(question.text || "Problema detectado").trim(),
      observations: String(question.observations || "").trim(),
      createdAt: new Date().toISOString(),
      status: "open",
    }));
}

function normalizeProcessAuditProposal(proposal = {}, fallbackId = null) {
  return {
    id: fallbackId || String(proposal?.id || makeId("papr")).trim(),
    problemId: String(proposal?.problemId || "").trim(),
    problem: String(proposal?.problem || "").trim(),
    rootCause: String(proposal?.rootCause || "").trim(),
    proposal: String(proposal?.proposal || "").trim(),
    type: normalizeProcessAuditProposalType(proposal?.type),
    expectedImpact: String(proposal?.expectedImpact || "").trim(),
    effort: normalizeProcessAuditEffortLevel(proposal?.effort),
    status: normalizeProcessAuditLifecycleStatus(proposal?.status),
    responsible: String(proposal?.responsible || proposal?.ownerName || "").trim(),
    ownerId: String(proposal?.ownerId || "").trim(),
    ownerName: String(proposal?.ownerName || proposal?.responsible || "").trim(),
    evidences: Array.isArray(proposal?.evidences) ? proposal.evidences : [],
    createdAt: proposal?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeProcessAuditFollowUpRecord(entry = {}, fallbackId = null) {
  const vs = String(entry?.verificationStatus || "").toLowerCase();
  return {
    id: fallbackId || String(entry?.id || makeId("pafu")).trim(),
    status: normalizeProcessAuditLifecycleStatus(entry?.status),
    verificationStatus: ["ok", "partial", "issue"].includes(vs) ? vs : "ok",
    verifiedBy: String(entry?.verifiedBy || "").trim(),
    note: String(entry?.note || "").trim(),
    evidences: Array.isArray(entry?.evidences) ? entry.evidences : [],
    dueDate: entry?.dueDate ? String(entry.dueDate) : "",
    createdAt: entry?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeProcessAuditImplementationPlan(plan = {}) {
  return {
    processDefinition: String(plan?.processDefinition || "").trim(),
    responsibles: Array.isArray(plan?.responsibles) ? plan.responsibles.map((entry) => String(entry || "").trim()).filter(Boolean) : [],
    instructions: String(plan?.instructions || "").trim(),
    estimatedTime: String(plan?.estimatedTime || "").trim(),
    deadline: plan?.deadline ? String(plan.deadline) : "",
    closureNotes: String(plan?.closureNotes || "").trim(),
    closureEvidences: Array.isArray(plan?.closureEvidences) ? plan.closureEvidences : [],
  };
}

function normalizeProcessAuditQuestion(question = {}, fallbackId = null) {
  const questionType = normalizeProcessAuditQuestionType(question?.type);
  const options = Array.isArray(question?.options)
    ? question.options.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const minValue = Number.isFinite(Number(question?.minValue)) ? Number(question.minValue) : 1;
  const maxValue = Number.isFinite(Number(question?.maxValue)) ? Number(question.maxValue) : (questionType === "scale" ? 5 : 10);

  return {
    id: fallbackId || String(question?.id || makeId("paqq")).trim(),
    type: questionType,
    text: String(question?.text || "").trim(),
    required: Boolean(question?.required),
    placeholder: String(question?.placeholder || "").trim(),
    category: String(question?.category || "General").trim() || "General",
    isActive: question?.isActive !== false,
    conditionalQuestionId: String(question?.conditionalQuestionId || "").trim(),
    conditionalAnswer: question?.conditionalAnswer === true
      ? true
      : question?.conditionalAnswer === false
        ? false
        : String(question?.conditionalAnswer || "").trim(),
    allowNote: Boolean(question?.allowNote),
    options,
    minValue,
    maxValue,
    answer: normalizeProcessAuditQuestionAnswer(questionType, question?.answer, { minValue, maxValue }),
    issueDetected: question?.issueDetected === true ? true : question?.issueDetected === false ? false : null,
    impactLevel: normalizeProcessAuditImpactLevel(question?.impactLevel),
    observations: String(question?.observations || "").trim(),
    evidenceRequired: Boolean(question?.evidenceRequired),
    evidenceIds: Array.isArray(question?.evidenceIds) ? question.evidenceIds.map((entry) => String(entry || "").trim()).filter(Boolean) : [],
  };
}

function normalizeProcessAuditRecord(audit = {}, fallbackId = null) {
  const normalizedQuestions = (Array.isArray(audit?.questions) ? audit.questions : [])
    .map((question) => normalizeProcessAuditQuestion(question, question?.id || null))
    .filter((question) => question.text);
  const scoring = buildProcessAuditScoring(normalizedQuestions);
  const detectedProblems = Array.isArray(audit?.detectedProblems) && audit.detectedProblems.length
    ? audit.detectedProblems
    : buildProcessAuditDetectedProblems(normalizedQuestions);

  return {
    id: fallbackId || String(audit?.id || makeId("auditp")).trim(),
    area: normalizeAreaOption(audit?.area || ""),
    subArea: normalizeAreaOption(audit?.subArea || ""),
    process: String(audit?.process || "").trim(),
    templateId: String(audit?.templateId || "").trim() || null,
    status: String(audit?.status || "").trim().toLowerCase() === "closed" ? "closed" : "open",
    lifecycleStatus: normalizeProcessAuditLifecycleStatus(audit?.lifecycleStatus || (audit?.status === "closed" ? "closed" : "pending")),
    startedAt: audit?.startedAt || new Date().toISOString(),
    closedAt: audit?.closedAt || null,
    reAuditAt: audit?.reAuditAt ? String(audit.reAuditAt) : "",
    auditorId: String(audit?.auditorId || "").trim(),
    auditorName: String(audit?.auditorName || "").trim(),
    questions: normalizedQuestions,
    evidences: Array.isArray(audit?.evidences) ? audit.evidences : [],
    notes: String(audit?.notes || "").trim(),
    executiveSummary: String(audit?.executiveSummary || "").trim(),
    detectedProblems,
    proposals: (Array.isArray(audit?.proposals) ? audit.proposals : [])
      .map((proposal) => normalizeProcessAuditProposal(proposal, proposal?.id || null)),
    followUp: (Array.isArray(audit?.followUp) ? audit.followUp : [])
      .map((entry) => normalizeProcessAuditFollowUpRecord(entry, entry?.id || null)),
    implementationPlan: normalizeProcessAuditImplementationPlan(audit?.implementationPlan || EMPTY_OBJECT),
    boardLinks: Array.isArray(audit?.boardLinks) ? audit.boardLinks.map((entry) => String(entry || "").trim()).filter(Boolean) : [],
    subResponses: Array.isArray(audit?.subResponses) ? audit.subResponses.map((sr) => ({
      id: String(sr?.id || "").trim(),
      personName: String(sr?.personName || "").trim(),
      personRole: String(sr?.personRole || "").trim(),
      notes: String(sr?.notes || "").trim(),
      answers: (sr?.answers && typeof sr.answers === "object" && !Array.isArray(sr.answers)) ? sr.answers : {},
      createdAt: sr?.createdAt || new Date().toISOString(),
    })) : [],
    scoring,
    updatedAt: audit?.updatedAt || new Date().toISOString(),
  };
}

function normalizeProcessAuditTemplate(template = {}, fallbackId = null) {
  const normalizedArea = normalizeAreaOption(template?.area || "");
  const normalizedSubArea = normalizeAreaOption(template?.subArea || "");
  return {
    id: fallbackId || String(template?.id || makeId("pat")).trim(),
    area: normalizedArea,
    subArea: normalizedSubArea,
    process: String(template?.process || "").trim(),
    isActive: template?.isActive !== false,
    questions: (Array.isArray(template?.questions) ? template.questions : [])
      .map((question) => normalizeProcessAuditQuestion(question, question?.id || null))
      .filter((question) => question.text),
    createdAt: template?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertProcessAuditTemplate(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageProcessAuditTemplates", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const normalizedTemplate = normalizeProcessAuditTemplate(payload, payload?.id || null);
  if (!normalizedTemplate.area || !normalizedTemplate.process || !normalizedTemplate.questions.length) {
    return { ok: false, reason: "invalid_payload" };
  }

  const currentTemplates = currentState.processAuditTemplates || [];
  const existingIndex = currentTemplates.findIndex((entry) => entry.id === normalizedTemplate.id);
  const nextTemplates = existingIndex >= 0
    ? currentTemplates.map((entry, index) => (index === existingIndex ? { ...entry, ...normalizedTemplate, updatedAt: new Date().toISOString() } : entry))
    : [normalizedTemplate, ...currentTemplates];

  const nextState = {
    ...currentState,
    processAuditTemplates: nextTemplates,
  };

  return { ok: true, state: replaceWarehouseState(nextState), templateId: normalizedTemplate.id };
}

export function deleteProcessAuditTemplate(auth, templateId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageProcessAuditTemplates", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const currentTemplates = currentState.processAuditTemplates || [];
  if (!currentTemplates.some((entry) => entry.id === templateId)) {
    return { ok: false, reason: "template_not_found" };
  }

  const nextState = {
    ...currentState,
    processAuditTemplates: currentTemplates.filter((entry) => entry.id !== templateId),
  };

  return { ok: true, state: replaceWarehouseState(nextState), templateId };
}

export function createProcessAudit(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageProcessAudits", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const area = normalizeAreaOption(payload?.area || "");
  const subArea = normalizeAreaOption(payload?.subArea || "");
  const process = String(payload?.process || "").trim();
  if (!area || !process) return { ok: false, reason: "invalid_payload" };

  const template = payload?.templateId
    ? (currentState.processAuditTemplates || []).find((entry) => entry.id === payload.templateId)
    : null;
  const sourceQuestions = Array.isArray(payload?.questions) && payload.questions.length
    ? payload.questions
    : (template?.questions || []);

  const questions = sourceQuestions
    .map((question) => normalizeProcessAuditQuestion(question, question?.id || makeId("paq")))
    .filter((question) => question.text)
    .map((question) => ({
      ...question,
      answer: question.type === "yesno" ? null : question.type === "multi" ? [] : "",
      issueDetected: null,
      impactLevel: "medium",
      observations: "",
    }));

  if (!questions.length) return { ok: false, reason: "invalid_payload" };

  const startedAt = new Date().toISOString();
  const initialScoring = buildProcessAuditScoring(questions);
  const audit = {
    id: makeId("auditp"),
    area,
    subArea,
    process,
    templateId: template?.id || null,
    status: "open",
    lifecycleStatus: normalizeProcessAuditLifecycleStatus(payload?.lifecycleStatus),
    startedAt,
    closedAt: null,
    reAuditAt: payload?.reAuditAt ? String(payload.reAuditAt) : "",
    auditorId: currentUser.id,
    auditorName: currentUser.name,
    questions,
    evidences: [],
    notes: String(payload?.notes || "").trim(),
    executiveSummary: String(payload?.executiveSummary || "").trim(),
    detectedProblems: buildProcessAuditDetectedProblems(questions),
    proposals: (Array.isArray(payload?.proposals) ? payload.proposals : []).map((proposal) => normalizeProcessAuditProposal(proposal, proposal?.id || null)),
    followUp: (Array.isArray(payload?.followUp) ? payload.followUp : []).map((entry) => normalizeProcessAuditFollowUpRecord(entry, entry?.id || null)),
    implementationPlan: normalizeProcessAuditImplementationPlan(payload?.implementationPlan || EMPTY_OBJECT),
    boardLinks: Array.isArray(payload?.boardLinks) ? payload.boardLinks.map((entry) => String(entry || "").trim()).filter(Boolean) : [],
    subResponses: Array.isArray(payload?.subResponses) ? payload.subResponses.map((sr) => ({
      id: String(sr?.id || "").trim() || makeId("sr"),
      personName: String(sr?.personName || "").trim(),
      personRole: String(sr?.personRole || "").trim(),
      notes: String(sr?.notes || "").trim(),
      answers: (sr?.answers && typeof sr.answers === "object" && !Array.isArray(sr.answers)) ? sr.answers : {},
      createdAt: sr?.createdAt || startedAt,
    })).filter((sr) => sr.personName) : [],
    scoring: initialScoring,
    updatedAt: startedAt,
  };

  const nextState = {
    ...currentState,
    processAudits: [audit, ...(currentState.processAudits || [])],
  };

  return { ok: true, state: replaceWarehouseState(nextState), auditId: audit.id };
}

export function updateProcessAudit(auth, auditId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const existingAudit = (currentState.processAudits || []).find((entry) => entry.id === auditId);
  if (!existingAudit) return { ok: false, reason: "audit_not_found" };
  if (!canUserDoWarehouseAction(currentUser, "manageProcessAudits", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const nextQuestions = Array.isArray(payload?.questions)
    ? payload.questions.map((question) => {
      const previousQuestion = (existingAudit.questions || []).find((entry) => entry.id === question.id) || {};
      const normalizedQuestion = normalizeProcessAuditQuestion({ ...previousQuestion, ...question }, question.id || previousQuestion.id || null);
      return normalizedQuestion;
    })
    : existingAudit.questions;

  const resolvedStatus = payload?.status === undefined
    ? (existingAudit.status === "closed" ? "closed" : "open")
    : (payload.status === "closed" ? "closed" : "open");
  const shouldClose = resolvedStatus === "closed";
  const lifecycleStatus = payload?.lifecycleStatus !== undefined
    ? normalizeProcessAuditLifecycleStatus(payload.lifecycleStatus)
    : normalizeProcessAuditLifecycleStatus(existingAudit.lifecycleStatus || (shouldClose ? "closed" : "pending"));
  const scoring = buildProcessAuditScoring(nextQuestions);
  const detectedProblems = Array.isArray(payload?.detectedProblems)
    ? payload.detectedProblems
    : buildProcessAuditDetectedProblems(nextQuestions);
  const nextAudit = {
    ...existingAudit,
    area: payload?.area !== undefined ? normalizeAreaOption(payload.area || "") : existingAudit.area,
    subArea: payload?.subArea !== undefined ? normalizeAreaOption(payload.subArea || "") : (existingAudit.subArea || ""),
    process: payload?.process !== undefined ? String(payload.process || "").trim() : existingAudit.process,
    notes: payload?.notes !== undefined ? String(payload.notes || "").trim() : existingAudit.notes,
    executiveSummary: payload?.executiveSummary !== undefined ? String(payload.executiveSummary || "").trim() : String(existingAudit.executiveSummary || ""),
    status: resolvedStatus,
    lifecycleStatus,
    closedAt: shouldClose ? (existingAudit.closedAt || new Date().toISOString()) : null,
    reAuditAt: payload?.reAuditAt !== undefined ? String(payload.reAuditAt || "") : String(existingAudit.reAuditAt || ""),
    questions: nextQuestions,
    detectedProblems,
    proposals: payload?.proposals !== undefined
      ? (Array.isArray(payload.proposals) ? payload.proposals : []).map((proposal) => normalizeProcessAuditProposal(proposal, proposal?.id || null))
      : (Array.isArray(existingAudit.proposals) ? existingAudit.proposals : []),
    followUp: payload?.followUp !== undefined
      ? (Array.isArray(payload.followUp) ? payload.followUp : []).map((entry) => normalizeProcessAuditFollowUpRecord(entry, entry?.id || null))
      : (Array.isArray(existingAudit.followUp) ? existingAudit.followUp : []),
    implementationPlan: payload?.implementationPlan !== undefined
      ? normalizeProcessAuditImplementationPlan(payload.implementationPlan || EMPTY_OBJECT)
      : normalizeProcessAuditImplementationPlan(existingAudit.implementationPlan || EMPTY_OBJECT),
    boardLinks: payload?.boardLinks !== undefined
      ? (Array.isArray(payload.boardLinks) ? payload.boardLinks.map((entry) => String(entry || "").trim()).filter(Boolean) : [])
      : (Array.isArray(existingAudit.boardLinks) ? existingAudit.boardLinks : []),
    subResponses: payload?.subResponses !== undefined
      ? (Array.isArray(payload.subResponses) ? payload.subResponses.map((sr) => ({
          id: String(sr?.id || "").trim(),
          personName: String(sr?.personName || "").trim(),
          personRole: String(sr?.personRole || "").trim(),
          notes: String(sr?.notes || "").trim(),
          answers: (sr?.answers && typeof sr.answers === "object" && !Array.isArray(sr.answers)) ? sr.answers : {},
          createdAt: sr?.createdAt || new Date().toISOString(),
        })) : [])
      : (Array.isArray(existingAudit.subResponses) ? existingAudit.subResponses : []),
    scoring,
    updatedAt: new Date().toISOString(),
  };

  const nextState = {
    ...currentState,
    processAudits: (currentState.processAudits || []).map((entry) => (entry.id === auditId ? nextAudit : entry)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), auditId };
}

export function deleteProcessAudit(auth, auditId, leadPassword) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const existingAudit = (currentState.processAudits || []).find((entry) => entry.id === auditId);
  if (!existingAudit) return { ok: false, reason: "audit_not_found" };
  if (!canUserDoWarehouseAction(currentUser, "manageProcessAudits", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const normalizedPassword = String(leadPassword || "").trim();
  if (!normalizedPassword) return { ok: false, reason: "lead_password_required" };

  const approvingLead = (currentState.users || []).find((user) => (
    user?.isActive
    && user.role === ROLE_LEAD
    && verifyPassword(normalizedPassword, user.passwordHash || user.password || "")
  ));
  if (!approvingLead) return { ok: false, reason: "invalid_lead_password" };

  const nextState = {
    ...currentState,
    processAudits: (currentState.processAudits || []).filter((entry) => entry.id !== auditId),
  };

  return {
    ok: true,
    state: replaceWarehouseState(nextState),
    auditId,
    approvedByLeadId: approvingLead.id,
  };
}

export function resetProcessAuditStats(auth) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  if (currentUser.role !== ROLE_LEAD) return { ok: false, reason: "forbidden" };

  const currentState = getRawWarehouseState();
  const nextState = {
    ...currentState,
    processAudits: [],
  };

  return { ok: true, state: replaceWarehouseState(nextState) };
}

export function addProcessAuditEvidence(auth, auditId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageProcessAudits", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const audit = (currentState.processAudits || []).find((entry) => entry.id === auditId);
  if (!audit) return { ok: false, reason: "audit_not_found" };

  const url = String(payload?.url || payload?.fileUrl || "").trim();
  if (!url) return { ok: false, reason: "invalid_payload" };
  const thumbnailUrl = String(payload?.thumbnailUrl || payload?.fileThumbUrl || url).trim();

  if (INTERNAL_STORAGE_ONLY && (!isInternalStorageUrl(url) || !isInternalStorageUrl(thumbnailUrl))) {
    return { ok: false, reason: "invalid_payload" };
  }

  const evidence = {
    id: makeId("audev"),
    url,
    thumbnailUrl,
    name: String(payload?.name || payload?.originalName || "Evidencia").trim(),
    mimeType: String(payload?.mimeType || payload?.fileMimeType || "").trim(),
    createdAt: new Date().toISOString(),
    uploadedById: currentUser.id,
    uploadedByName: currentUser.name,
  };

  const nextState = {
    ...currentState,
    processAudits: (currentState.processAudits || []).map((entry) => (
      entry.id === auditId
        ? { ...entry, evidences: [evidence, ...(entry.evidences || [])], updatedAt: new Date().toISOString() }
        : entry
    )),
  };

  return { ok: true, state: replaceWarehouseState(nextState), auditId, evidenceId: evidence.id };
}

export function removeProcessAuditEvidence(auth, auditId, evidenceId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageProcessAudits", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const audit = (currentState.processAudits || []).find((entry) => entry.id === auditId);
  if (!audit) return { ok: false, reason: "audit_not_found" };

  const nextEvidences = (audit.evidences || []).filter((entry) => entry.id !== evidenceId);
  if (nextEvidences.length === (audit.evidences || []).length) return { ok: false, reason: "evidence_not_found" };

  const nextState = {
    ...currentState,
    processAudits: (currentState.processAudits || []).map((entry) => (
      entry.id === auditId
        ? { ...entry, evidences: nextEvidences, updatedAt: new Date().toISOString() }
        : entry
    )),
  };

  return { ok: true, state: replaceWarehouseState(nextState), auditId, evidenceId };
}

function sanitizeCatalogItemDraft(payload = {}, existingId = null) {
  const frequency = normalizeCatalogFrequency(payload.frequency);
  const scheduledDays = normalizeCatalogScheduledDays(payload.scheduledDays, frequency);
  const rawChecklistConfig = payload?.operationalChecklistConfig;
  const normalizedChecklistConfig = rawChecklistConfig && typeof rawChecklistConfig === "object"
    ? {
        enabled: rawChecklistConfig.enabled !== false,
        template: rawChecklistConfig.template && typeof rawChecklistConfig.template === "object"
          ? JSON.parse(JSON.stringify(rawChecklistConfig.template))
          : null,
        linkedAt: String(rawChecklistConfig.linkedAt || "").trim(),
        linkedById: String(rawChecklistConfig.linkedById || "").trim(),
        linkedByName: String(rawChecklistConfig.linkedByName || "").trim(),
        linkedActivityNames: Array.isArray(rawChecklistConfig.linkedActivityNames)
          ? rawChecklistConfig.linkedActivityNames.map((item) => String(item || "").trim()).filter(Boolean)
          : [],
      }
    : null;
  return {
    id: existingId || payload.id || makeId("cat"),
    name: String(payload.name || "").trim(),
    timeLimitMinutes: Number(payload.timeLimitMinutes || 0),
    isMandatory: Boolean(payload.isMandatory),
    frequency,
    scheduledDays,
    scheduledDaysBySite: normalizeCatalogScheduledDaysBySite(payload.scheduledDaysBySite, scheduledDays),
    cleaningSites: normalizeCatalogCleaningSites(payload.cleaningSites),
    category: normalizeCatalogCategory(payload.category),
    area: normalizeCatalogArea(payload.area, payload.category),
    operationalChecklistConfig: normalizedChecklistConfig,
    isDeleted: Boolean(payload.isDeleted),
  };
}

function normalizeCatalogArea(value, fallback = "General") {
  const normalizedValue = String(value || fallback || "General").trim();
  return normalizedValue || "General";
}

function normalizeCatalogCategory(value) {
  const normalizedValue = String(value || "General").trim();
  return normalizedValue || "General";
}

function normalizeCatalogWeekdayOffset(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.trunc(numeric);
  return rounded >= 0 && rounded <= 6 ? rounded : null;
}

function normalizeCatalogFrequency(value) {
  const normalizedValue = String(value || "").trim();
  return ["daily", "every2days", "every3days", "weekdays", "twiceWeek", "threeTimesWeek", "fourTimesWeek", "fiveTimesWeek", "sixTimesWeek", "weekly"].includes(normalizedValue)
    ? normalizedValue
    : "weekly";
}

function normalizeCatalogScheduledDays(value, fallbackFrequency = "weekly") {
  const fromArray = Array.isArray(value)
    ? value.map((entry) => normalizeCatalogWeekdayOffset(entry)).filter((entry) => entry !== null)
    : [];
  const unique = [...new Set(fromArray)].sort((a, b) => a - b);
  if (unique.length) return unique;
  return [...getCatalogFrequencyDayOffsets(fallbackFrequency)];
}

function normalizeCatalogCleaningSites(value) {
  const validSites = new Set(BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE_OPTIONS.map((entry) => String(entry || "").trim().toUpperCase()));
  const fromArray = Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim().toUpperCase()).filter((entry) => validSites.has(entry))
    : [];
  return [...new Set(fromArray)];
}

function normalizeCatalogScheduledDaysBySite(value, fallbackDays = []) {
  const validSites = new Set(BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE_OPTIONS.map((entry) => String(entry || "").trim().toUpperCase()));
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalizedFallbackDays = normalizeCatalogScheduledDays(fallbackDays, "weekly");
  const entries = Object.entries(value)
    .map(([rawSite, rawDays]) => {
      const site = String(rawSite || "").trim().toUpperCase();
      if (!validSites.has(site)) return null;
      const directDays = Array.isArray(rawDays)
        ? rawDays.map((entry) => normalizeCatalogWeekdayOffset(entry)).filter((entry) => entry !== null)
        : [];
      const uniqueDays = [...new Set(directDays)].sort((a, b) => a - b);
      return [site, uniqueDays.length ? uniqueDays : normalizedFallbackDays];
    })
    .filter(Boolean);
  return Object.fromEntries(entries);
}

function getCatalogFrequencyDayOffsets(value) {
  const normalizedValue = normalizeCatalogFrequency(value);
  return {
    daily: [0, 1, 2, 3, 4, 5, 6],
    every2days: [0, 2, 4, 6],
    every3days: [0, 3, 6],
    weekdays: [0, 1, 2, 3, 4],
    twiceWeek: [0, 3],
    threeTimesWeek: [0, 2, 4],
    fourTimesWeek: [0, 1, 3, 5],
    fiveTimesWeek: [0, 1, 2, 3, 4],
    sixTimesWeek: [0, 1, 2, 3, 4, 5],
    weekly: [0],
  }[normalizedValue] || [0];
}

function buildActivitiesForCatalogItem(weekId, item, weekStart, responsibleId) {
  const fallbackDays = getCatalogFrequencyDayOffsets(item?.frequency);
  const scheduledDays = normalizeCatalogScheduledDays(item?.scheduledDays, item?.frequency);
  const cleaningSites = normalizeCatalogCleaningSites(item?.cleaningSites);
  const scheduledDaysBySite = normalizeCatalogScheduledDaysBySite(item?.scheduledDaysBySite, scheduledDays);
  const mergedDays = cleaningSites.length
    ? [...new Set(cleaningSites.flatMap((site) => scheduledDaysBySite[site] || scheduledDays))].sort((a, b) => a - b)
    : scheduledDays;
  const effectiveDays = mergedDays.length ? mergedDays : fallbackDays;
  return effectiveDays.map((dayOffset) => ({
    id: makeId("act"),
    weekId,
    catalogActivityId: item.id,
    responsibleId,
    status: "Pendiente",
    activityDate: isoAt(addDays(weekStart, dayOffset), 8, 0),
    startTime: null,
    endTime: null,
    accumulatedSeconds: 0,
    lastResumedAt: null,
    customName: item.name,
  }));
}

export function createWarehouseCatalogItem(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "createCatalog", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const item = sanitizeCatalogItemDraft(payload);
  if (!item.name || item.timeLimitMinutes <= 0) return { ok: false, reason: "invalid_payload" };

  const nextState = {
    ...currentState,
    catalog: (currentState.catalog || []).concat(item),
  };

  return { ok: true, state: replaceWarehouseState(nextState), itemId: item.id, itemName: item.name };
}

export function updateWarehouseCatalogItem(auth, itemId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "editCatalog", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existingItem = (currentState.catalog || []).find((item) => item.id === itemId);
  if (!existingItem) return { ok: false, reason: "item_not_found" };

  const item = sanitizeCatalogItemDraft({ ...existingItem, ...payload }, itemId);
  if (!item.name || item.timeLimitMinutes <= 0) return { ok: false, reason: "invalid_payload" };

  const nextState = {
    ...currentState,
    catalog: (currentState.catalog || []).map((entry) => (entry.id === itemId ? item : entry)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), itemId: item.id, itemName: item.name };
}

export function deleteWarehouseCatalogItem(auth, itemId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };
  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "deleteCatalog", currentState.permissions)) return { ok: false, reason: "forbidden" };

  const existingItem = (currentState.catalog || []).find((item) => item.id === itemId);
  if (!existingItem) return { ok: false, reason: "item_not_found" };

  const nextState = {
    ...currentState,
    catalog: (currentState.catalog || []).map((entry) => (entry.id === itemId ? { ...entry, isDeleted: true } : entry)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), itemId: existingItem.id, itemName: existingItem.name };
}

export function createWarehouseTemplate(auth, draft) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "saveTemplate", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const normalizedDraft = sanitizeTemplateDraft(draft, currentUser);
  if (!normalizedDraft.name || !normalizedDraft.columns.length) {
    return { ok: false, reason: "invalid_payload" };
  }

  let sharedDepartments = normalizedDraft.sharedDepartments;
  if (normalizedDraft.visibilityType === "department") {
    if (normalizedDraft.sharedDepartments.length) {
      sharedDepartments = normalizedDraft.sharedDepartments;
    } else if (normalizedDraft.creatorDepartment) {
      sharedDepartments = [normalizedDraft.creatorDepartment];
    } else {
      sharedDepartments = [];
    }
  }

  let sharedUserIds = normalizedDraft.sharedUserIds;
  if (normalizedDraft.visibilityType === "users" && !normalizedDraft.sharedUserIds.length) {
    sharedUserIds = [currentUser.id];
  }

  const template = {
    id: makeId("tpl"),
    name: normalizedDraft.name,
    description: normalizedDraft.description || `Plantilla reutilizable para ${normalizedDraft.name}.`,
    category: normalizedDraft.category,
    visibilityType: normalizedDraft.visibilityType,
    sharedDepartments,
    sharedUserIds,
    settings: normalizedDraft.settings,
    columns: normalizedDraft.columns,
    isCustom: true,
    createdAt: new Date().toISOString(),
    createdById: currentUser.id,
  };

  const nextState = {
    ...currentState,
    boardTemplates: [...(currentState.boardTemplates || []), template],
  };

  return { ok: true, state: replaceWarehouseState(nextState), templateId: template.id, templateName: template.name };
}

export function updateWarehouseTemplate(auth, templateId, draft) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const template = (currentState.boardTemplates || []).find((item) => item.id === templateId);
  if (!template) return { ok: false, reason: "template_not_found" };
  if (!template.isCustom) return { ok: false, reason: "forbidden" };
  if (!canUserDoWarehouseAction(currentUser, "editTemplate", currentState.permissions) || !canManageWarehouseTemplate(currentUser, template)) {
    return { ok: false, reason: "forbidden" };
  }

  const normalizedDraft = sanitizeTemplateDraft({ ...template, ...draft }, currentUser);
  if (!normalizedDraft.name) {
    return { ok: false, reason: "invalid_payload" };
  }

  const nextTemplate = {
    ...template,
    name: normalizedDraft.name,
    description: normalizedDraft.description,
    category: normalizedDraft.category,
    visibilityType: normalizedDraft.visibilityType,
    sharedDepartments: normalizedDraft.sharedDepartments,
    sharedUserIds: normalizedDraft.sharedUserIds,
  };

  const nextState = {
    ...currentState,
    boardTemplates: (currentState.boardTemplates || []).map((item) => (item.id === templateId ? nextTemplate : item)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), templateId: nextTemplate.id, templateName: nextTemplate.name };
}

export function deleteWarehouseTemplate(auth, templateId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const template = (currentState.boardTemplates || []).find((item) => item.id === templateId);
  if (!template) return { ok: false, reason: "template_not_found" };
  if (isProtectedSystemBoard(template)) return { ok: false, reason: "system_template" };
  if (!template.isCustom) return { ok: false, reason: "forbidden" };
  if (!canManageWarehouseTemplate(currentUser, template)) {
    return { ok: false, reason: "forbidden" };
  }

  const nextState = {
    ...currentState,
    boardTemplates: (currentState.boardTemplates || []).filter((item) => item.id !== templateId),
  };

  return { ok: true, state: replaceWarehouseState(nextState), templateId: template.id, templateName: template.name };
}

export function updateWarehousePermissionsModel(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "managePermissions", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const nextPermissions = normalizePermissions(payload.permissions || currentState.permissions);
  const boardPermissionsMap = new Map(
    Array.isArray(payload.boardPermissions)
      ? payload.boardPermissions.map((entry) => [entry.boardId, entry.permissions || entry])
      : [],
  );

  const nextState = {
    ...currentState,
    permissions: nextPermissions,
    controlBoards: (currentState.controlBoards || []).map((board) => ({
      ...board,
      permissions: normalizeBoardPermissions(boardPermissionsMap.get(board.id) || board.permissions, nextPermissions, board),
    })),
  };

  return { ok: true, state: replaceWarehouseState(nextState) };
}

export function updateWarehousePermissionOverride(auth, userId, draft = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "managePermissions", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const targetUser = (currentState.users || []).find((user) => user.id === userId);
  if (!targetUser) return { ok: false, reason: "user_not_found" };
  if (!supportsManagedPermissionOverrides(targetUser.role)) {
    return { ok: false, reason: "invalid_target" };
  }

  const baseOverride = currentState.permissions?.userOverrides?.[userId] || { pages: {}, actions: {} };
  const nextOverride = {
    pages: {
      ...baseOverride.pages,
      ...(draft.pages ?? EMPTY_OBJECT),
    },
    actions: {
      ...baseOverride.actions,
      ...(draft.actions ?? EMPTY_OBJECT),
    },
  };

  const cleanedOverride = {
    pages: Object.fromEntries(Object.entries(nextOverride.pages).filter(([, value]) => typeof value === "boolean")),
    actions: Object.fromEntries(Object.entries(nextOverride.actions).filter(([, value]) => typeof value === "boolean")),
  };
  const hasOverride = Object.keys(cleanedOverride.pages).length > 0 || Object.keys(cleanedOverride.actions).length > 0;

  const nextOverrides = { ...(currentState.permissions?.userOverrides ?? EMPTY_OBJECT) };
  if (hasOverride) {
    nextOverrides[userId] = cleanedOverride;
  } else {
    delete nextOverrides[userId];
  }

  const nextState = {
    ...currentState,
    permissions: {
      ...currentState.permissions,
      userOverrides: nextOverrides,
    },
  };

  return { ok: true, state: replaceWarehouseState(nextState), userId };
}

export function updateWarehouseBoardAssignment(auth, boardId, assignment = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "managePermissions", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const { boardIndex, board } = findBoardAndRow(currentState, boardId);
  if (!board) return { ok: false, reason: "board_not_found" };

  const nextOwnerId = String(assignment.ownerId || board.ownerId || "").trim() || board.ownerId;
  const visibilityType = normalizeBoardVisibilityType(assignment.visibilityType ?? board.visibilityType);
  const nextSharedDepartments = visibilityType === "department"
    ? normalizeBoardSharedDepartments(assignment.sharedDepartments ?? board.sharedDepartments)
    : [];
  const nextAccessUserIds = visibilityType === "users"
    ? normalizeBoardAccessUserIds(assignment.accessUserIds ?? board.accessUserIds, nextOwnerId)
    : [];
  const boardShape = {
    ...board,
    ownerId: nextOwnerId,
    visibilityType,
    sharedDepartments: nextSharedDepartments,
    accessUserIds: nextAccessUserIds,
  };
  const nextBoard = {
    ...boardShape,
    permissions: normalizeBoardPermissions(board.permissions, currentState.permissions, boardShape),
  };

  const nextState = {
    ...currentState,
    controlBoards: (currentState.controlBoards || []).map((item, index) => (index === boardIndex ? nextBoard : item)),
  };

  return { ok: true, state: replaceWarehouseState(nextState), boardId: nextBoard.id, boardName: nextBoard.name };
}

export function createWarehouseBoard(auth, draft) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "createBoard", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const normalizedDraft = sanitizeBoardDraft(draft, currentUser.id);
  if (!normalizedDraft.name || !normalizedDraft.fields.length) {
    return { ok: false, reason: "invalid_payload" };
  }

  const systemTemplate = resolveOfficialSystemBoardTemplate(normalizedDraft);
  const nextBoardSettings = withDefaultBoardSettings({
    ...normalizedDraft.settings,
    ...(systemTemplate ? { systemBoardTemplateId: systemTemplate.id, systemBoardLocked: true } : {}),
  });

  const board = {
    id: makeId("board"),
    name: normalizedDraft.name,
    description: normalizedDraft.description,
    createdById: currentUser.id,
    ownerId: normalizedDraft.ownerId,
    visibilityType: normalizedDraft.visibilityType,
    sharedDepartments: normalizedDraft.sharedDepartments,
    accessUserIds: normalizedDraft.accessUserIds,
    settings: nextBoardSettings,
    fields: normalizedDraft.fields,
    rows: buildBoardRowsFromActivityList(normalizedDraft.fields, currentState.catalog, "", [], []),
  };

  // Auto-save as template (no permission check — creation implies permission)
  const autoTemplate = {
    id: makeId("tpl"),
    name: board.name,
    description: board.description || `Plantilla generada automáticamente para ${board.name}.`,
    category: "Personalizada",
    visibilityType: board.visibilityType || "users",
    sharedDepartments: [...(board.sharedDepartments || [])],
    sharedUserIds: [...(board.accessUserIds || [])],
    settings: board.settings,
    columns: (board.fields || []).map((field) => ({
      ...field,
      templateKey: field.id,
      options: Array.isArray(field.options) ? [...field.options] : [],
      colorRules: Array.isArray(field.colorRules) ? field.colorRules.map((rule) => ({ ...rule })) : [],
    })),
    isCustom: true,
    createdAt: new Date().toISOString(),
    createdById: currentUser.id,
  };

  const nextState = {
    ...currentState,
    controlBoards: [{
      ...board,
      permissions: buildBoardPermissions(currentState.permissions, board),
    }, ...(currentState.controlBoards || [])],
    boardTemplates: [...(currentState.boardTemplates || []), autoTemplate],
  };

  return { ok: true, state: replaceWarehouseState(nextState), boardId: board.id, boardName: board.name };
}

export function updateWarehouseBoard(auth, boardId, draft) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const { boardIndex, board } = findBoardAndRow(currentState, boardId);
  if (!board) return { ok: false, reason: "board_not_found" };
  if (!canEditWarehouseBoard(currentUser, board) || !canUserDoWarehouseAction(currentUser, "editBoard", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const normalizedDraft = sanitizeBoardDraft(draft, board.ownerId || currentUser.id);
  if (!normalizedDraft.name || !normalizedDraft.fields.length) {
    return { ok: false, reason: "invalid_payload" };
  }

  const systemTemplate = resolveOfficialSystemBoardTemplate({
    ...board,
    ...normalizedDraft,
    settings: {
      ...board.settings,
      ...normalizedDraft.settings,
    },
  });
  const nextBoardSettings = withDefaultBoardSettings({
    ...normalizedDraft.settings,
    ...(!systemTemplate && board?.settings?.systemBoardTemplateId ? {
      systemBoardTemplateId: board.settings.systemBoardTemplateId,
      systemBoardLocked: Boolean(board.settings.systemBoardLocked),
    } : {}),
    ...(systemTemplate ? { systemBoardTemplateId: systemTemplate.id, systemBoardLocked: true } : {}),
  });

  const updatedBoard = {
    ...board,
    name: normalizedDraft.name,
    description: normalizedDraft.description,
    ownerId: normalizedDraft.ownerId,
    visibilityType: normalizedDraft.visibilityType,
    sharedDepartments: normalizedDraft.sharedDepartments,
    accessUserIds: normalizedDraft.accessUserIds,
    settings: nextBoardSettings,
    fields: normalizedDraft.fields,
    rows: buildBoardRowsFromActivityList(
      normalizedDraft.fields,
      currentState.catalog,
      "",
      board.fields || [],
      board.rows || [],
    ),
  };

  const nextState = {
    ...currentState,
    controlBoards: currentState.controlBoards.map((item, index) => (
      index === boardIndex
        ? {
            ...updatedBoard,
            permissions: normalizeBoardPermissions(board.permissions, currentState.permissions, updatedBoard),
          }
        : item
    )),
  };

  return { ok: true, state: replaceWarehouseState(nextState), boardId: updatedBoard.id, boardName: updatedBoard.name };
}

export function updateWarehouseBoardOperationalContext(auth, boardId, patch = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const { boardIndex, board } = findBoardAndRow(currentState, boardId);
  if (!board) return { ok: false, reason: "board_not_found" };

  const canUpdateContextValue = canManageWarehouseBoard(currentUser, board)
    && (canUserDoWarehouseAction(currentUser, "boardWorkflow", currentState.permissions)
      || canUserDoWarehouseAction(currentUser, "editBoard", currentState.permissions));
  const requestedStructureChange = hasOwn(patch, "operationalContextType")
    || hasOwn(patch, "operationalContextLabel")
    || hasOwn(patch, "operationalContextOptions");

  if (requestedStructureChange) {
    if (!canEditWarehouseBoard(currentUser, board) || !canUserDoWarehouseAction(currentUser, "editBoard", currentState.permissions)) {
      return { ok: false, reason: "forbidden" };
    }
  } else if (!hasOwn(patch, "operationalContextValue") || !canUpdateContextValue) {
    return { ok: false, reason: "forbidden" };
  }

  const nextSettings = withDefaultBoardSettings({
    ...board.settings,
    ...(hasOwn(patch, "operationalContextType") ? { operationalContextType: patch.operationalContextType } : EMPTY_OBJECT),
    ...(hasOwn(patch, "operationalContextLabel") ? { operationalContextLabel: patch.operationalContextLabel } : EMPTY_OBJECT),
    ...(hasOwn(patch, "operationalContextOptions") ? { operationalContextOptions: patch.operationalContextOptions } : EMPTY_OBJECT),
    ...(hasOwn(patch, "operationalContextValue") ? { operationalContextValue: patch.operationalContextValue } : EMPTY_OBJECT),
  });
  const nextBoard = {
    ...board,
    settings: nextSettings,
  };
  const nextState = {
    ...currentState,
    controlBoards: currentState.controlBoards.map((item, index) => (index === boardIndex ? nextBoard : item)),
  };

  return {
    ok: true,
    state: replaceWarehouseState(nextState),
    boardId: nextBoard.id,
    boardName: nextBoard.name,
    operationalContextValue: nextSettings.operationalContextValue,
  };
}

export function deleteWarehouseBoard(auth, boardId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const { board } = findBoardAndRow(currentState, boardId);
  if (!board) return { ok: false, reason: "board_not_found" };
  // Los tableros siempre se pueden eliminar; solo las plantillas del sistema están protegidas.
  if (!canEditWarehouseBoard(currentUser, board) || !canUserDoWarehouseAction(currentUser, "deleteBoard", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const nextState = {
    ...currentState,
    controlBoards: (currentState.controlBoards || []).filter((item) => item.id !== boardId),
  };

  return { ok: true, state: replaceWarehouseState(nextState), boardId: board.id, boardName: board.name };
}

export function duplicateWarehouseBoard(auth, boardId, includeRows = false) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  const { board } = findBoardAndRow(currentState, boardId);
  if (!board) return { ok: false, reason: "board_not_found" };
  if (!canManageWarehouseBoard(currentUser, board)) {
    return { ok: false, reason: "forbidden" };
  }
  if (includeRows) {
    if (!canUserDoWarehouseAction(currentUser, "duplicateBoardWithRows", currentState.permissions)) {
      return { ok: false, reason: "forbidden" };
    }
  } else if (!canUserDoWarehouseAction(currentUser, "duplicateBoard", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const { fields, idMap } = cloneBoardFieldBundle(board.fields || []);
  const duplicatedBoardId = makeId("board");
  const duplicatedBoard = {
    ...board,
    id: duplicatedBoardId,
    name: `${board.name} copia`,
    description: board.description || `Copia de ${board.name}.`,
    createdById: currentUser.id,
    ownerId: board.ownerId || currentUser.id,
    visibilityType: board.visibilityType || "users",
    sharedDepartments: [...(board.sharedDepartments || [])],
    settings: withDefaultBoardSettings({
      ...board.settings,
      columnOrder: remapBoardColumnOrder(board.settings?.columnOrder, idMap),
    }),
    weeklyCycle: board.weeklyCycle ? { ...board.weeklyCycle } : undefined,
    fields,
    rows: includeRows
      ? (board.rows || []).map((row) => ({
          ...row,
          id: makeId("row"),
          values: Object.entries(row.values || {}).reduce((accumulator, [fieldId, value]) => {
            accumulator[idMap.get(fieldId) || fieldId] = value;
            return accumulator;
          }, {}),
        }))
      : [],
  };

  const nextState = {
    ...currentState,
    controlBoards: [{
      ...duplicatedBoard,
      permissions: normalizeBoardPermissions(board.permissions, currentState.permissions, duplicatedBoard),
    }, ...(currentState.controlBoards || [])],
  };

  return { ok: true, state: replaceWarehouseState(nextState), boardId: duplicatedBoard.id, boardName: duplicatedBoard.name };
}

export function canEditWarehouseBoardRow(user, board, row, permissions, actionId = "createBoardRow") {
  if (!user || !board || !row) return false;
  if (!canManageWarehouseBoard(user, board)) return false;
  // Lead always has full edit access, including finished rows.
  if (normalizeRole(user.role) === ROLE_LEAD) return true;
  if (row.status === "Terminado") return false;
  if (!canUserDoWarehouseAction(user, actionId, permissions)) return false;
  return true;
}

export function canOperateWarehouseBoardRow(user, board, row, permissions) {
  return canEditWarehouseBoardRow(user, board, row, permissions, "boardWorkflow");
}

export function createWarehouseBoardRow(auth, boardId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) {
    return { ok: false, reason: "auth_required" };
  }

  const currentState = getRawWarehouseState();
  const { boardIndex, board } = findBoardAndRow(currentState, boardId);
  if (!board) {
    return { ok: false, reason: "board_not_found" };
  }
  if (!canManageWarehouseBoard(currentUser, board) || !canUserDoWarehouseAction(currentUser, "createBoardRow", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const row = createBoardRowRecord(board.fields || [], "");
  const activityListField = findBoardActivityListField(board.fields || []);
  if (activityListField) {
    const existingValues = new Set((board.rows || []).map((currentRow) => normalizeKey(currentRow?.values?.[activityListField.id])));
    const nextActivityName = getBoardActivityListValues(activityListField, currentState.catalog).find((activityName) => !existingValues.has(normalizeKey(activityName)));
    if (nextActivityName) {
      row.values[activityListField.id] = nextActivityName;
    }
  }

  const nextState = {
    ...currentState,
    controlBoards: currentState.controlBoards.map((item, index) => (
      index === boardIndex ? { ...item, rows: [...(item.rows || []), row] } : item
    )),
  };
  return { ok: true, state: replaceWarehouseState(nextState), row };
}

export function patchWarehouseBoardRow(auth, boardId, rowId, patch = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) {
    return { ok: false, reason: "auth_required" };
  }

  const currentState = getRawWarehouseState();
  const operationalSettings = normalizeSystemOperationalSettings(currentState.system?.operational);
  const pauseControl = operationalSettings.pauseControl;
  const { boardIndex, rowIndex, board, row } = findBoardAndRow(currentState, boardId, rowId);
  if (!board || !row) {
    return { ok: false, reason: "row_not_found" };
  }

  const patchKeys = Object.keys(patch || {});
  const isIdempotentStatusPatch = patchKeys.length === 1
    && hasOwn(patch, "status")
    && String(patch.status || "").trim() === String(row.status || "").trim();
  if (isIdempotentStatusPatch) {
    return { ok: true, state: currentState, row };
  }

  const isWorkflowPatch = hasOwn(patch, "status") || hasOwn(patch, "lastPauseReason");
  const allowed = isWorkflowPatch
    ? canOperateWarehouseBoardRow(currentUser, board, row, currentState.permissions)
    : canEditWarehouseBoardRow(currentUser, board, row, currentState.permissions);
  if (!allowed) {
    return { ok: false, reason: "forbidden" };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  // Use local clock time for time-only fields (start/end watch values) while keeping ISO instant for timestamps.
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const nowTime = `${hours}:${minutes}:${seconds}`;
  const resolvePauseRule = (reason) => {
    const normalizedReason = normalizeKey(reason);
    const configuredReasons = Array.isArray(currentState.system?.operational?.pauseControl?.reasons)
      ? currentState.system.operational.pauseControl.reasons
      : [];
    if (!normalizedReason || configuredReasons.length === 0) return null;
    return configuredReasons.find((entry) => {
      if (!entry || !entry.enabled) return false;
      const byId = normalizeKey(entry.id) === normalizedReason;
      const byLabel = normalizeKey(entry.label) === normalizedReason;
      const byContains = normalizeKey(entry.label).includes(normalizedReason) || normalizedReason.includes(normalizeKey(entry.label));
      return byId || byLabel || byContains;
    }) || null;
  };
  const normalizedValuesPatch = {
    ...(patch.values ?? EMPTY_OBJECT),
  };
  const shouldApplyCleaningConsumption = patch.status === "En curso" && !row.startTime;
  const nextRow = {
    ...row,
    values: {
      ...(row.values ?? EMPTY_OBJECT),
      ...normalizedValuesPatch,
    },
  };
  const formatLocalDateKey = (dateIso) => {
    const localDate = new Date(dateIso);
    if (!Number.isFinite(localDate.getTime())) return "";
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const buildPauseUsageCounterKey = (reasonId, dateKey) => {
    const normalizedReasonId = String(reasonId || "").trim().toLowerCase();
    const normalizedDateKey = String(dateKey || "").trim();
    if (!normalizedReasonId || !normalizedDateKey) return "";
    return `${normalizedDateKey}::${normalizedReasonId}`;
  };
  const computePausedOverflowSeconds = (sourceRow) => {
    if (!sourceRow || String(sourceRow.status || "") !== "Pausado") return 0;
    if (!sourceRow.pauseStartedAt) return 0;
    const authorizedSeconds = Math.max(0, Number(sourceRow.pauseAuthorizedSeconds || 0));
    const pausedElapsedSeconds = getOperationalElapsedSeconds(
      sourceRow.pauseStartedAt,
      nowIso,
      pauseControl,
      sourceRow.cleaningSite,
    );
    if (!authorizedSeconds) return Math.max(0, pausedElapsedSeconds);
    return Math.max(0, pausedElapsedSeconds - authorizedSeconds);
  };
  const closeOpenPauseLog = (sourceLogs, sourceRow, resumeIso, fallbackReason = "") => {
    const resumeTime = new Date(resumeIso).getTime();
    if (!Number.isFinite(resumeTime)) return sourceLogs;
    const openIndexes = (Array.isArray(sourceLogs) ? sourceLogs : [])
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry && !entry.resumedAt && entry.pausedAt)
      .map(({ index }) => index);
    const latestOpenIndex = openIndexes.length ? openIndexes[openIndexes.length - 1] : -1;
    if (latestOpenIndex === -1) return sourceLogs;
    return sourceLogs.map((entry, index) => {
      if (index !== latestOpenIndex || !entry || !entry.pausedAt) return entry;
      const pausedTime = new Date(entry.pausedAt).getTime();
      if (!Number.isFinite(pausedTime)) return entry;
      const fullPauseSeconds = Math.max(0, getOperationalElapsedSeconds(entry.pausedAt, resumeIso, pauseControl, sourceRow?.cleaningSite));
      const pauseAuthorizedSeconds = Math.max(0, Number(entry?.pauseAuthorizedSeconds ?? sourceRow?.pauseAuthorizedSeconds ?? 0));
      return {
        ...entry,
        reason: String(entry.reason || fallbackReason || "").trim(),
        resumedAt: resumeIso,
        pauseDurationSeconds: fullPauseSeconds,
        pauseAuthorizedSeconds,
        countedPauseDurationSeconds: Math.max(0, fullPauseSeconds - pauseAuthorizedSeconds),
      };
    });
  };
  const rowPauseLogs = Array.isArray(row?.pauseLogs) ? row.pauseLogs : [];
  nextRow.pauseLogs = rowPauseLogs.map((entry) => ({ ...entry }));

  if (hasOwn(patch, "responsibleIds")) {
    const responsibleIds = normalizeBoardResponsibleIds(patch.responsibleIds, "");
    nextRow.responsibleIds = responsibleIds;
    nextRow.responsibleId = responsibleIds[0] || "";
  } else if (hasOwn(patch, "responsibleId")) {
    const responsibleIds = normalizeBoardResponsibleIds([], patch.responsibleId || "");
    nextRow.responsibleIds = responsibleIds;
    nextRow.responsibleId = responsibleIds[0] || "";
  }

  if (hasOwn(patch, "status")) {
    if (patch.status === "En curso") {
      (board.fields || []).forEach((field) => {
        if (field.type !== "time") return;
        const normalizedLabel = normalizeKey(field.label || "");
        const currentValue = String(nextRow.values?.[field.id] || "").trim();
        if ((normalizedLabel.includes("inicio") || normalizedLabel.includes("start")) && !currentValue) {
          nextRow.values[field.id] = nowTime;
        }
      });
      nextRow.status = patch.status;
      nextRow.startTime = nextRow.startTime || nowIso;
      nextRow.endTime = row.status === "Terminado" ? null : nextRow.endTime;
      // Preserve accumulatedSeconds on resume: do NOT add paused overflow here.
      // Paused overflow (penalties) may be accounted elsewhere, but resuming must continue from stored accumulated value.
      nextRow.accumulatedSeconds = Math.max(0, Number(row.accumulatedSeconds || 0));
      nextRow.lastResumedAt = nowIso;
      nextRow.pauseStartedAt = null;
      nextRow.pauseAffectsTimer = false;
      nextRow.pauseAuthorizedSeconds = 0;
      nextRow.pauseLogs = closeOpenPauseLog(nextRow.pauseLogs, row, nowIso, row.lastPauseReason);
    } else if (patch.status === "Pausado") {
      const pauseReason = String(patch.lastPauseReason || row.lastPauseReason || "").trim();
      if (normalizeKey(pauseReason) === "ajuste manual de contadores") {
        return { ok: false, reason: "pause_reason_blocked" };
      }
      const pauseRule = resolvePauseRule(pauseReason);
      const pauseAuthorizedMinutes = Number(pauseRule?.authorizedMinutes || 0);
      const pauseDailyUsageLimit = Number(pauseRule?.dailyUsageLimit || 0);
      const pauseUsageByDay = row?.pauseUsageByDay && typeof row.pauseUsageByDay === "object" ? row.pauseUsageByDay : {};
      const pauseDateKey = formatLocalDateKey(nowIso);
      const pauseUsageCounterKey = buildPauseUsageCounterKey(pauseRule?.id, pauseDateKey);
      const pauseUsageCount = pauseUsageCounterKey ? Number(pauseUsageByDay[pauseUsageCounterKey] || 0) : 0;
      if (pauseDailyUsageLimit > 0 && pauseUsageCounterKey && pauseUsageCount >= pauseDailyUsageLimit) {
        return { ok: false, reason: "pause_daily_limit_reached", limit: pauseDailyUsageLimit, used: pauseUsageCount };
      }
      nextRow.status = patch.status;
      nextRow.accumulatedSeconds = updateElapsedForFinish(row, nowIso, pauseControl);
      nextRow.lastResumedAt = null;
      nextRow.pauseStartedAt = nowIso;
      nextRow.pauseAffectsTimer = Boolean(pauseRule?.affectsTimer);
      nextRow.pauseAuthorizedSeconds = Number.isFinite(pauseAuthorizedMinutes)
        ? Math.max(0, Math.round(pauseAuthorizedMinutes * 60))
        : 0;
      nextRow.pauseUsageByDay = pauseUsageCounterKey
        ? {
            ...pauseUsageByDay,
            [pauseUsageCounterKey]: pauseUsageCount + 1,
          }
        : pauseUsageByDay;
      nextRow.pauseLogs = nextRow.pauseLogs.concat({
        id: makeId("pause"),
        reason: pauseReason,
        pausedAt: nowIso,
        resumedAt: null,
        pauseDurationSeconds: 0,
        pauseAuthorizedSeconds: nextRow.pauseAuthorizedSeconds,
        countedPauseDurationSeconds: 0,
      });
    } else if (patch.status === "Terminado") {
      (board.fields || []).forEach((field) => {
        if (field.type !== "time") return;
        const normalizedLabel = normalizeKey(field.label || "");
        if (normalizedLabel.includes("fin") || normalizedLabel.includes("final") || normalizedLabel.includes("end")) {
          nextRow.values[field.id] = nowTime;
        }
      });
      nextRow.status = patch.status;
      nextRow.endTime = nowIso;
      const pausedOverflowSeconds = computePausedOverflowSeconds(row);
      nextRow.accumulatedSeconds = String(row.status || "") === "Pausado"
        ? Math.max(0, Number(row.accumulatedSeconds || 0) + pausedOverflowSeconds)
        : Math.max(0, updateElapsedForFinish(row, nowIso, pauseControl));
      nextRow.lastResumedAt = null;
      nextRow.pauseStartedAt = null;
      nextRow.pauseAffectsTimer = false;
      nextRow.pauseAuthorizedSeconds = 0;
      nextRow.pauseLogs = closeOpenPauseLog(nextRow.pauseLogs, row, nowIso, row.lastPauseReason);
    } else {
      nextRow.status = patch.status;
    }
  }

  if (hasOwn(patch, "lastPauseReason")) {
    nextRow.lastPauseReason = patch.lastPauseReason || "";
    if (String(nextRow.status || "") === "Pausado" && Array.isArray(nextRow.pauseLogs) && nextRow.pauseLogs.length) {
      const latestIndex = nextRow.pauseLogs.length - 1;
      const latest = nextRow.pauseLogs[latestIndex];
      if (latest && !latest.resumedAt) {
        nextRow.pauseLogs = nextRow.pauseLogs.map((entry, index) => (
          index === latestIndex ? { ...entry, reason: String(patch.lastPauseReason || "").trim() } : entry
        ));
      }
    }
  }

  if (hasOwn(patch, "operationalInspectionRecord")) {
    nextRow.operationalInspectionRecord = patch.operationalInspectionRecord && typeof patch.operationalInspectionRecord === "object"
      ? JSON.parse(JSON.stringify(patch.operationalInspectionRecord))
      : null;
  }

  // Lead-only direct overrides for time fields (startTime, endTime, accumulatedSeconds) and persisted pause logs.
  if (normalizeRole(currentUser.role) === ROLE_LEAD) {
    const hasTimeOverride = hasOwn(patch, "startTime") || hasOwn(patch, "endTime") || hasOwn(patch, "accumulatedSeconds") || hasOwn(patch, "totalElapsedSecondsOverride");
    const hasPauseLogOverride = hasOwn(patch, "pauseLogs");
    if (hasOwn(patch, "startTime") && patch.startTime) {
      nextRow.startTime = patch.startTime;
    }
    if (hasOwn(patch, "endTime") && patch.endTime) {
      nextRow.endTime = patch.endTime;
    }
    if (hasOwn(patch, "accumulatedSeconds")) {
      nextRow.accumulatedSeconds = Math.max(0, Number(patch.accumulatedSeconds || 0));
      if (String(nextRow.status || "") === "En curso") {
        nextRow.lastResumedAt = nowIso;
      }
      if (String(nextRow.status || "") === "Pausado") {
        nextRow.pauseStartedAt = nowIso;
      }
    }
    if (hasOwn(patch, "totalElapsedSecondsOverride")) {
      const totalOverride = Number(patch.totalElapsedSecondsOverride);
      nextRow.totalElapsedSecondsOverride = Number.isFinite(totalOverride) && totalOverride >= 0
        ? Math.max(0, totalOverride)
        : null;
    }
    if (hasPauseLogOverride) {
      nextRow.pauseLogs = Array.isArray(patch.pauseLogs)
        ? patch.pauseLogs.map((entry) => ({
            id: entry?.id || makeId("pause"),
            reason: String(entry?.reason || "").trim(),
            pausedAt: entry?.pausedAt || null,
            resumedAt: entry?.resumedAt || null,
            pauseDurationSeconds: Math.max(0, Number(entry?.pauseDurationSeconds || 0)),
            pauseAuthorizedSeconds: getPauseLogAuthorizedSeconds(entry),
            countedPauseDurationSeconds: getPauseLogCountedSeconds(entry),
          }))
        : [];
      if (!hasOwn(patch, "totalElapsedSecondsOverride")) {
        const totalPauseSeconds = nextRow.pauseLogs.reduce((sum, entry) => sum + getPauseLogCountedSeconds(entry), 0);
        nextRow.totalElapsedSecondsOverride = Math.max(0, Number(nextRow.accumulatedSeconds || 0)) + totalPauseSeconds;
      }
    }
    if (Boolean(patch.clearPauseLogs)) {
      nextRow.pauseLogs = [];
      nextRow.lastPauseReason = "";
      nextRow.totalElapsedSecondsOverride = Math.max(0, Number(nextRow.accumulatedSeconds || 0));
    } else if (hasTimeOverride && !hasPauseLogOverride && String(nextRow.status || "") !== "Pausado") {
      nextRow.pauseLogs = syncBoardRowPauseLogsWithCounters(nextRow, nowIso, pauseControl);
    }
  }

  const nextStateBase = {
    ...currentState,
    controlBoards: currentState.controlBoards.map((item, currentBoardIndex) => {
      if (currentBoardIndex !== boardIndex) return item;
      return {
        ...item,
        rows: (item.rows || []).map((currentRow, currentRowIndex) => (currentRowIndex === rowIndex ? nextRow : currentRow)),
      };
    }),
  };

  const traceabilitySyncedState = syncBoardRowInventoryTraceability(nextStateBase, board, nextRow, normalizedValuesPatch);

  const nextState = shouldApplyCleaningConsumption
    ? applyBoardRowCleaningInventoryConsumption(traceabilitySyncedState, nextRow, board, currentUser, nowIso)
    : traceabilitySyncedState;

  return { ok: true, state: replaceWarehouseState(nextState), row: nextRow };
}

export function bulkImportWarehouseBoardRows(auth, boardId, rowsPayload) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) {
    return { ok: false, reason: "auth_required" };
  }

  const currentState = getRawWarehouseState();
  const { boardIndex, board } = findBoardAndRow(currentState, boardId);
  if (!board) {
    return { ok: false, reason: "board_not_found" };
  }
  if (!canManageWarehouseBoard(currentUser, board) || !canUserDoWarehouseAction(currentUser, "createBoardRow", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const safeRows = Array.isArray(rowsPayload) ? rowsPayload.slice(0, 500) : [];
  const newRows = safeRows.map((item) => {
    const row = createBoardRowRecord(board.fields || [], "");
    if (item && typeof item === "object" && item.values && typeof item.values === "object") {
      row.values = { ...row.values, ...item.values };
    }
    return row;
  });

  const nextState = {
    ...currentState,
    controlBoards: currentState.controlBoards.map((item, index) => (
      index === boardIndex ? { ...item, rows: [...(item.rows || []), ...newRows] } : item
    )),
  };
  return { ok: true, state: replaceWarehouseState(nextState), count: newRows.length };
}

export function deleteWarehouseBoardRow(auth, boardId, rowId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) {
    return { ok: false, reason: "auth_required" };
  }

  const currentState = getRawWarehouseState();
  const { boardIndex, board, row } = findBoardAndRow(currentState, boardId, rowId);
  if (!board) {
    return { ok: false, reason: "board_not_found" };
  }

  if (!row) {
    // Idempotent delete: if row was already removed, sync current state instead of failing.
    return { ok: true, state: replaceWarehouseState(currentState) };
  }
  const isLeadUser = normalizeRole(currentUser.role) === ROLE_LEAD;
  if ((!isLeadUser && row.status === "Terminado") || !canEditWarehouseBoardRow(currentUser, board, row, currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const nextState = {
    ...currentState,
    controlBoards: currentState.controlBoards.map((item, index) => (
      index === boardIndex ? { ...item, rows: (item.rows || []).filter((entry) => entry.id !== rowId) } : item
    )),
  };
  return { ok: true, state: replaceWarehouseState(nextState) };
}

function isStateSectionChanged(currentState, nextState, key) {
  const currentValue = JSON.stringify(currentState[key] ?? null);
  const nextValue = JSON.stringify((nextState?.[key] ?? currentState[key]) ?? null);
  return currentValue !== nextValue;
}

function validateMutatedUserPasswords(nextUsers, currentUsers) {
  for (const nextUser of nextUsers) {
    const incomingPassword = String(nextUser?.password || "").trim();
    if (incomingPassword && !isStrongPassword(incomingPassword)) {
      return { ok: false, reason: "weak_password", userId: nextUser.id || null };
    }

    const currentPasswordHash = currentUsers.find((item) => item.id === nextUser.id)?.passwordHash;
    if (nextUser?.passwordHash && nextUser.passwordHash !== currentPasswordHash) {
      return { ok: false, reason: "password_hash_injection", userId: nextUser.id || null };
    }
  }

  return null;
}

function validateSensitiveStateMutations(currentUser, currentState, nextState, normalizedRole) {
  const sensitiveSectionRules = [
    { key: "permissions", actionId: "managePermissions", legacyBlocked: true },
    { key: "catalog", actionId: "manageCatalog", legacyBlocked: true },
    { key: "inventoryItems", actionId: "manageInventory", alternateActionIds: ["importInventory"], legacyBlocked: true },
    { key: "inventoryMovements", actionId: "manageInventory", legacyBlocked: true },
    { key: "boardTemplates", actionId: "saveTemplate", alternateActionIds: ["editTemplate", "deleteTemplate"], legacyBlocked: true },
    { key: "weeks", actionId: "manageWeeks", alternateActionIds: ["createWeek"] },
  ];

  for (const rule of sensitiveSectionRules) {
    if (!isStateSectionChanged(currentState, nextState, rule.key)) {
      continue;
    }

    if (rule.legacyBlocked) {
      return { ok: false, reason: "legacy_section_blocked", section: rule.key };
    }

    const allowed = [rule.actionId].concat(rule.alternateActionIds || []).some((actionId) => canUserDoWarehouseAction(currentUser, actionId, currentState.permissions));
    if (!allowed) {
      return { ok: false, reason: "restricted_section_changed", section: rule.key };
    }
  }

  if (isStateSectionChanged(currentState, nextState, "system") && normalizedRole !== ROLE_LEAD) {
    return { ok: false, reason: "restricted_section_changed", section: "system" };
  }

  if (isStateSectionChanged(currentState, nextState, "areaCatalog")) {
    return { ok: false, reason: "legacy_section_blocked", section: "areaCatalog" };
  }

  return null;
}

function validateUserMutations(currentUser, currentState, nextUsers, nextUserMap) {
  if (nextUsers.length !== currentState.users.length) {
    const actionId = nextUsers.length < currentState.users.length ? "deleteUsers" : "manageUsers";
    if (!canUserDoWarehouseAction(currentUser, actionId, currentState.permissions)) {
      return { ok: false, reason: "user_list_changed" };
    }
  }

  for (const currentRecord of currentState.users) {
    const validationError = validateExistingUserMutation(currentUser, currentState, currentRecord, nextUserMap.get(currentRecord.id));
    if (validationError) {
      return validationError;
    }
  }

  for (const nextRecord of nextUsers) {
    const existsInCurrentState = currentState.users.some((item) => item.id === nextRecord.id);
    if (!existsInCurrentState && !canUserDoWarehouseAction(currentUser, "createUsers", currentState.permissions)) {
      return { ok: false, reason: "user_list_changed" };
    }
  }

  return null;
}

function getUserProfileSnapshot(user) {
  return JSON.stringify({
    name: user.name,
    email: user.email,
    area: user.area,
    department: user.department,
    jobTitle: user.jobTitle,
  });
}

function getUserAdminSnapshot(user) {
  return JSON.stringify({
    role: user.role,
    isActive: user.isActive,
    managerId: user.managerId,
    createdById: user.createdById,
  });
}

function validateExistingUserMutation(currentUser, currentState, currentRecord, nextRecord) {
  if (!nextRecord) {
    if (!canUserDoWarehouseAction(currentUser, "deleteUsers", currentState.permissions)) {
      return { ok: false, reason: "user_list_changed" };
    }
    return null;
  }

  const profileChanged = getUserProfileSnapshot(currentRecord) !== getUserProfileSnapshot(nextRecord);
  if (profileChanged && currentRecord.id !== currentUser.id && !canUserDoWarehouseAction(currentUser, "editUsers", currentState.permissions)) {
    return { ok: false, reason: "restricted_section_changed", section: "users" };
  }

  const adminFieldsChanged = getUserAdminSnapshot(currentRecord) !== getUserAdminSnapshot(nextRecord);
  if (adminFieldsChanged && !canUserDoWarehouseAction(currentUser, "editUsers", currentState.permissions)) {
    return { ok: false, reason: "restricted_section_changed", section: "users" };
  }

  const passwordChanged = String(nextRecord.password || "").trim() || nextRecord.passwordHash !== currentRecord.passwordHash;
  if (passwordChanged && currentRecord.id !== currentUser.id && !canUserDoWarehouseAction(currentUser, "resetPasswords", currentState.permissions)) {
    return { ok: false, reason: "restricted_section_changed", section: "users" };
  }

  return null;
}

function validateBoardListMutationByRole(normalizedRole, currentUser, currentState, nextState, nextUsers, nextBoards) {
  if (normalizedRole === ROLE_JR) {
    const restrictedKeys = ["users", "permissions", "weeks", "catalog", "inventoryItems", "inventoryMovements", "boardTemplates", "activities", "pauseLogs", "controlRows", "areaCatalog", "system"];
    for (const key of restrictedKeys) {
      if (isStateSectionChanged(currentState, nextState, key)) {
        return { ok: false, reason: "restricted_section_changed", section: key };
      }
    }

    if (nextUsers.length !== currentState.users.length) {
      return { ok: false, reason: "user_list_changed" };
    }

    if (nextBoards.length !== currentState.controlBoards.length) {
      return { ok: false, reason: "board_list_changed" };
    }

    return null;
  }

  if (nextBoards.length !== currentState.controlBoards.length
    && !canUserDoWarehouseAction(currentUser, "createBoard", currentState.permissions)
    && !canUserDoWarehouseAction(currentUser, "deleteBoard", currentState.permissions)) {
    return { ok: false, reason: "board_list_changed" };
  }

  return null;
}

function getBoardStructureSnapshot(board) {
  return JSON.stringify({
    name: board.name,
    description: board.description,
    createdById: board.createdById,
    ownerId: board.ownerId,
    visibilityType: board.visibilityType,
    sharedDepartments: board.sharedDepartments || [],
    accessUserIds: board.accessUserIds || [],
    settings: board.settings ?? EMPTY_OBJECT,
    fields: board.fields || [],
    permissions: board.permissions ?? EMPTY_OBJECT,
  });
}

function validateBoardMutations(currentUser, currentState, nextBoards, nextBoardMap) {
  for (const currentBoard of currentState.controlBoards) {
    const validationError = validateExistingBoardMutation(currentUser, currentState, currentBoard, nextBoardMap.get(currentBoard.id));
    if (validationError) {
      return validationError;
    }
  }

  const addedBoardError = validateAddedBoards(currentUser, currentState, nextBoards);
  if (addedBoardError) {
    return addedBoardError;
  }

  return null;
}

function validateAddedBoards(currentUser, currentState, nextBoards) {
  for (const nextBoard of nextBoards) {
    const existsInCurrentState = currentState.controlBoards.some((item) => item.id === nextBoard.id);
    if (!existsInCurrentState && !canUserDoWarehouseAction(currentUser, "createBoard", currentState.permissions)) {
      return { ok: false, reason: "board_list_changed" };
    }
  }

  return null;
}

function validateExistingBoardMutation(currentUser, currentState, currentBoard, nextBoard) {
  if (!nextBoard) {
    if (!canUserDoWarehouseAction(currentUser, "deleteBoard", currentState.permissions)) {
      return { ok: false, reason: "board_missing", boardId: currentBoard.id };
    }
    return null;
  }

  const canManage = canManageWarehouseBoard(currentUser, currentBoard);
  const currentStructure = getBoardStructureSnapshot(currentBoard);
  const nextStructure = getBoardStructureSnapshot(nextBoard);
  if (currentStructure !== nextStructure) {
    if (!canManage || !canUserDoWarehouseAction(currentUser, "editBoard", currentState.permissions)) {
      return { ok: false, reason: "board_structure_changed", boardId: currentBoard.id };
    }
  }

  const currentRows = JSON.stringify(currentBoard.rows || []);
  const nextRows = JSON.stringify(nextBoard.rows || []);
  if (currentRows === nextRows) {
    return null;
  }

  if (!canManage) {
    return { ok: false, reason: "board_rows_changed_without_access", boardId: currentBoard.id };
  }

  const canChangeRows = canUserDoWarehouseAction(currentUser, "boardWorkflow", currentState.permissions)
    || canUserDoWarehouseAction(currentUser, "createBoardRow", currentState.permissions);
  if (!canChangeRows) {
    return { ok: false, reason: "board_rows_changed_without_access", boardId: currentBoard.id };
  }

  return null;
}

export function validateWarehouseStateMutation(auth, nextState) {
  if (!auth) {
    return { ok: false, reason: "auth_required" };
  }

  if (auth.type === "master") {
    return { ok: true };
  }

  const currentUser = findWarehouseUserById(auth.userId);
  if (!currentUser?.isActive) {
    return { ok: false, reason: "user_not_active" };
  }

  const currentState = getRawWarehouseState();
  if (Number(nextState?.revision) !== Number(currentState.revision)) {
    return { ok: false, reason: "stale_revision", expectedRevision: currentState.revision };
  }
  const nextUsers = Array.isArray(nextState?.users) ? nextState.users : currentState.users;
  const nextBoards = Array.isArray(nextState?.controlBoards) ? nextState.controlBoards : currentState.controlBoards;
  const nextUserMap = new Map(nextUsers.map((user) => [user.id, user]));
  const nextBoardMap = new Map(nextBoards.map((board) => [board.id, board]));
  const normalizedRole = normalizeRole(currentUser.role);
  const validators = [
    () => validateMutatedUserPasswords(nextUsers, currentState.users),
    () => validateSensitiveStateMutations(currentUser, currentState, nextState, normalizedRole),
    () => validateUserMutations(currentUser, currentState, nextUsers, nextUserMap),
    () => validateBoardListMutationByRole(normalizedRole, currentUser, currentState, nextState, nextUsers, nextBoards),
    () => validateBoardMutations(currentUser, currentState, nextBoards, nextBoardMap),
  ];

  for (const validator of validators) {
    const error = validator();
    if (error) {
      return error;
    }
  }

  return { ok: true };
}

// A permanent dummy hash used to run verifyPassword even when no user is found,
// preventing timing-based username enumeration attacks.
const TIMING_DUMMY_HASH = hashPassword("COPMEC_TIMING_GUARD_DO_NOT_USE");

export function authenticateWarehouseUser(login, password) {
  const normalizedLogin = String(login || "").trim().toLowerCase();
  const user = getRawWarehouseState().users.find((item) => {
    const username = String((item.username ?? item.email) || "").trim().toLowerCase();
    return username === normalizedLogin;
  });

  // Always run verifyPassword to prevent timing oracle (username enumeration).
  const hashToCheck = user?.passwordHash || TIMING_DUMMY_HASH;
  const passwordOk = verifyPassword(password, hashToCheck);

  if (!user?.isActive || !passwordOk) return null;
  return user;
}

export function getLoginDirectory() {
  const current = getRawWarehouseState();
  const showPublicHints = publicLoginDirectoryEnabled;
  return {
    system: {
      masterBootstrapEnabled: Boolean(current.system?.masterBootstrapEnabled),
      masterUsername: showPublicHints ? current.system?.masterUsername || "Maestro" : null,
      showBootstrapMasterHint: showPublicHints && Boolean(current.system?.masterBootstrapEnabled),
    },
    demoUsers: showPublicHints
      ? current.users
        .filter((user) => user.isActive)
        .map((user) => ({ id: user.id, login: user.email, email: user.email, role: user.role, name: user.name }))
      : [],
  };
}

export function hasLeadUser() {
  return getRawWarehouseState().users.some((user) => normalizeRole(user.role) === ROLE_LEAD);
}

export function bootstrapFirstLeadUser(payload) {
  const currentState = getRawWarehouseState();

  if (!currentState.system?.masterBootstrapEnabled) {
    return { ok: false, reason: "bootstrap_not_enabled" };
  }
  if (hasLeadUser()) {
    return { ok: false, reason: "lead_already_exists" };
  }

  const name = String(payload.name || "").trim();
  const email = String((payload.email || payload.username) || "").trim();
  const area = String((payload.area || payload.department) || "").trim();
  const jobTitle = String(payload.jobTitle || "").trim();
  const password = String(payload.password || "").trim();

  if (!name || !email || !area || !jobTitle || !password) {
    return { ok: false, reason: "invalid_payload" };
  }
  if (!isStrongPassword(password)) {
    return { ok: false, reason: "weak_password" };
  }

  const leadId = makeId("usr-lead");
  const leadUser = {
    id: leadId,
    name,
    email,
    area,
    department: area,
    jobTitle,
    password,
    role: ROLE_LEAD,
    isActive: true,
    mustChangePassword: false,
    managerId: null,
    createdById: BOOTSTRAP_MASTER_ID,
    selfIdentityEditCount: 0,
    temporaryPasswordIssuedAt: null,
  };

  const nextState = {
    ...currentState,
    system: {
      ...currentState.system,
      masterBootstrapEnabled: false,
      firstLeadCreatedAt: new Date().toISOString(),
    },
    currentUserId: leadId,
    users: [leadUser],
  };

  const savedState = replaceWarehouseState(nextState);
  const savedUser = savedState.users.find((u) => u.id === leadId) || null;
  return { ok: true, state: savedState, user: savedUser, userId: leadId };
}

function getInventoryManageActionId(domain) {
  if (normalizeInventoryDomain(domain) === "cleaning") return "manageCleaningInventory";
  if (normalizeInventoryDomain(domain) === "orders") return "manageOrderInventory";
  return "manageInventory";
}

function getInventoryDeleteActionId(domain) {
  if (normalizeInventoryDomain(domain) === "cleaning") return "deleteCleaningInventory";
  if (normalizeInventoryDomain(domain) === "orders") return "deleteOrderInventory";
  return "deleteInventory";
}

function getInventoryImportActionId(domain) {
  if (normalizeInventoryDomain(domain) === "cleaning") return "importCleaningInventory";
  if (normalizeInventoryDomain(domain) === "orders") return "importOrderInventory";
  return "importInventory";
}

// ─── Biblioteca ────────────────────────────────────────────────────────────────

export function getBibliotecaFiles() {
  return getRawWarehouseState().bibliotecaFiles || [];
}

export function addBibliotecaFile(payload) {
  const currentState = getRawWarehouseState();
  const nextFileUrl = payload.fileUrl || null;
  const nextThumbUrl = payload.fileThumbUrl || null;

  if (INTERNAL_STORAGE_ONLY) {
    if (nextFileUrl && !isInternalStorageUrl(nextFileUrl)) {
      throw new Error("URL de archivo externa no permitida por política de almacenamiento interno.");
    }
    if (nextThumbUrl && !isInternalStorageUrl(nextThumbUrl)) {
      throw new Error("URL de miniatura externa no permitida por política de almacenamiento interno.");
    }
  }

  const file = {
    id: makeId("bib"),
    area: payload.area || "General",
    description: payload.description || "",
    originalName: payload.originalName || "archivo",
    fileName: payload.fileName || null,
    fileUrl: nextFileUrl,
    fileThumbUrl: nextThumbUrl,
    filePublicId: payload.filePublicId || null,
    fileMimeType: payload.fileMimeType || "application/octet-stream",
    bytes: payload.bytes || 0,
    priority: payload.priority || "baja",
    uploadedById: payload.uploadedById,
    uploadedByName: payload.uploadedByName || "Sistema",
    uploadedAt: new Date().toISOString(),
  };
  const nextState = {
    ...currentState,
    bibliotecaFiles: [...(currentState.bibliotecaFiles || []), file],
  };
  replaceWarehouseState(nextState);
  return file;
}

export function updateBibliotecaFileCover(fileId, coverData) {
  const currentState = getRawWarehouseState();
  const files = currentState.bibliotecaFiles || [];
  const idx = files.findIndex((f) => f.id === fileId);
  if (idx === -1) return { ok: false, message: "Archivo no encontrado." };
  const updated = { ...files[idx], ...coverData };
  const nextFiles = [...files.slice(0, idx), updated, ...files.slice(idx + 1)];
  replaceWarehouseState({ ...currentState, bibliotecaFiles: nextFiles });
  return { ok: true, file: updated };
}

export function updateBibliotecaFileName(fileId, originalName) {
  const nextOriginalName = String(originalName || "").replaceAll(/\s+/g, " ").trim();
  if (!nextOriginalName) return { ok: false, reason: "invalid_name", message: "Nombre de archivo inválido." };
  if (nextOriginalName.length > 220) return { ok: false, reason: "name_too_long", message: "El nombre no puede exceder 220 caracteres." };

  const currentState = getRawWarehouseState();
  const files = currentState.bibliotecaFiles || [];
  const idx = files.findIndex((f) => f.id === fileId);
  if (idx === -1) return { ok: false, reason: "file_not_found", message: "Archivo no encontrado." };

  const updated = { ...files[idx], originalName: nextOriginalName };
  const nextFiles = [...files.slice(0, idx), updated, ...files.slice(idx + 1)];
  replaceWarehouseState({ ...currentState, bibliotecaFiles: nextFiles });
  return { ok: true, file: updated };
}

export function deleteBibliotecaFile(fileId) {
  const currentState = getRawWarehouseState();
  const existing = (currentState.bibliotecaFiles || []).find((f) => f.id === fileId);
  if (!existing) return { ok: false, message: "Archivo no encontrado." };
  const nextState = {
    ...currentState,
    bibliotecaFiles: (currentState.bibliotecaFiles || []).filter((f) => f.id !== fileId),
  };
  replaceWarehouseState(nextState);
  return { ok: true };
}

export function addBibliotecaNotification(payload) {
  const currentState = getRawWarehouseState();
  const notif = {
    id: makeId("bibn"),
    fileId: payload.fileId,
    originalName: payload.originalName,
    area: payload.area || "General",
    priority: payload.priority || "baja",
    authorName: payload.authorName || "Sistema",
    createdAt: new Date().toISOString(),
  };
  // Mantener las últimas 100 notificaciones de biblioteca
  const next = [...(currentState.bibliotecaNotifications || []), notif].slice(-100);
  replaceWarehouseState({ ...currentState, bibliotecaNotifications: next });
  return notif;
}

export function getBibliotecaNotifications() {
  return getRawWarehouseState().bibliotecaNotifications || [];
}

// ─── Notificaciones de incidencias ──────────────────────────────────────────
export function getIncidenciaNotifications() {
  return getRawWarehouseState().incidenciaNotifications || [];
}

// ─── Roles personalizados ───────────────────────────────────────────────────

export function getCustomRoles() {
  return getRawWarehouseState().customRoles || [];
}

export function createCustomRole(name) {
  const currentState = getRawWarehouseState();
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("El nombre del rol no puede estar vacío.");
  if ((currentState.customRoles || []).some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error("Ya existe un rol con ese nombre.");
  }
  const newRole = { id: `custom_${Date.now()}`, name: trimmed, createdAt: new Date().toISOString() };
  replaceWarehouseState({ ...currentState, customRoles: [...(currentState.customRoles || []), newRole] });
  return newRole;
}

export function updateCustomRole(roleId, name) {
  const currentState = getRawWarehouseState();
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("El nombre del rol no puede estar vacío.");
  const roles = (currentState.customRoles || []);
  if (roles.some((r) => r.id !== roleId && r.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error("Ya existe un rol con ese nombre.");
  }
  const updated = roles.map((r) => r.id === roleId ? { ...r, name: trimmed } : r);
  replaceWarehouseState({ ...currentState, customRoles: updated });
  return updated.find((r) => r.id === roleId);
}

export function deleteCustomRole(roleId) {
  const currentState = getRawWarehouseState();
  const roles = (currentState.customRoles || []).filter((r) => r.id !== roleId);
  replaceWarehouseState({ ...currentState, customRoles: roles });
}

export function postponeTransportRecord(auth, recordId, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const targetId = String(recordId || "").trim();
  if (!targetId) return { ok: false, reason: "record_not_found" };

  const postponeAtRaw = String(payload?.postponedUntil || payload?.postponeAt || "").trim();
  const postponeAtDate = postponeAtRaw ? new Date(postponeAtRaw) : null;
  if (!postponeAtDate || Number.isNaN(postponeAtDate.getTime())) {
    return { ok: false, reason: "invalid_postponed_until" };
  }
  if (postponeAtDate.getTime() <= Date.now()) {
    return { ok: false, reason: "postponed_until_in_past" };
  }

  const remindMinutesRaw = Number(payload?.remindBeforeMinutes ?? 60);
  if (!Number.isFinite(remindMinutesRaw)) return { ok: false, reason: "invalid_reminder" };
  const remindBeforeMinutes = Math.max(0, Math.min(10080, Math.floor(remindMinutesRaw)));

  const baseState = getRawWarehouseState();
  const dailyCutResult = applyAutomatedTransportDailyCut(baseState);
  const currentState = dailyCutResult.changed ? dailyCutResult.state : baseState;
  const transport = normalizeTransportState(currentState.transport);

  const activeIndex = (transport.activeRecords || []).findIndex((entry) => entry.id === targetId);
  if (activeIndex === -1) return { ok: false, reason: "record_not_found" };

  const sourceRecord = transport.activeRecords[activeIndex];
  const sourceActionIds = getTransportActionIdsByArea(sourceRecord?.areaId);
  if (!sourceActionIds.manageActionId || !canUserDoWarehouseAction(currentUser, sourceActionIds.manageActionId, baseState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const nowIso = new Date().toISOString();
  const postponedUntilIso = postponeAtDate.toISOString();
  const remindAtIso = new Date(postponeAtDate.getTime() - (remindBeforeMinutes * 60 * 1000)).toISOString();
  const nextRecord = {
    ...sourceRecord,
    status: "Pospuesto",
    assignedTo: null,
    assignedToName: null,
    assignedByName: null,
    assignedAt: null,
    postponedUntil: postponedUntilIso,
    postponedReminderMinutes: remindBeforeMinutes,
    postponedRemindAt: remindAtIso,
    postponedAt: nowIso,
    postponedById: currentUser.id,
    postponedByName: currentUser.name,
    updatedAt: nowIso,
  };

  const nextState = {
    ...currentState,
    transport: {
      ...transport,
      activeRecords: transport.activeRecords.map((entry, index) => (index === activeIndex ? nextRecord : entry)),
    },
  };

  replaceWarehouseState(nextState);
  return { ok: true, recordId: targetId, record: nextRecord };
}

export function reactivatePostponedTransportRecord(auth, recordId) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const targetId = String(recordId || "").trim();
  if (!targetId) return { ok: false, reason: "record_not_found" };

  const baseState = getRawWarehouseState();
  const dailyCutResult = applyAutomatedTransportDailyCut(baseState);
  const currentState = dailyCutResult.changed ? dailyCutResult.state : baseState;
  const transport = normalizeTransportState(currentState.transport);

  const activeIndex = (transport.activeRecords || []).findIndex((entry) => entry.id === targetId);
  if (activeIndex === -1) return { ok: false, reason: "record_not_found" };

  const sourceRecord = transport.activeRecords[activeIndex];
  const sourceActionIds = getTransportActionIdsByArea(sourceRecord?.areaId);
  if (!sourceActionIds.manageActionId || !canUserDoWarehouseAction(currentUser, sourceActionIds.manageActionId, baseState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const nowIso = new Date().toISOString();
  const nextRecord = {
    ...sourceRecord,
    status: "Pendiente",
    postponedUntil: null,
    postponedRemindAt: null,
    updatedAt: nowIso,
  };

  const nextState = {
    ...currentState,
    transport: {
      ...transport,
      activeRecords: transport.activeRecords.map((entry, index) => (index === activeIndex ? nextRecord : entry)),
    },
  };

  replaceWarehouseState(nextState);
  return { ok: true, recordId: targetId, record: nextRecord };
}

function normalizeOperationalTemplate(template = {}, fallbackId = null) {
  return {
    id: String(template?.id || fallbackId || makeId("oit")).trim(),
    name: String(template?.name || "Checklist").trim(),
    version: Number(template?.version || 1) || 1,
    siteOptions: Array.isArray(template?.siteOptions) ? template.siteOptions : [],
    sections: Array.isArray(template?.sections) ? template.sections : [],
    createdAt: template?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertOperationalInspectionTemplate(auth, payload = {}) {
  const currentUser = findWarehouseUserById(auth?.userId);
  if (!currentUser?.isActive) return { ok: false, reason: "auth_required" };

  const currentState = getRawWarehouseState();
  if (!canUserDoWarehouseAction(currentUser, "manageProcessAuditTemplates", currentState.permissions)) {
    return { ok: false, reason: "forbidden" };
  }

  const normalized = normalizeOperationalTemplate(payload, payload?.id || null);
  if (!normalized.name || !Array.isArray(normalized.sections) || !normalized.sections.length) {
    return { ok: false, reason: "invalid_payload" };
  }

  const currentTemplates = Array.isArray(currentState.operationalInspectionTemplates) ? currentState.operationalInspectionTemplates : [];
  const existingIndex = currentTemplates.findIndex((entry) => entry.id === normalized.id);
  const nextTemplates = existingIndex >= 0
    ? currentTemplates.map((entry, index) => (index === existingIndex ? { ...entry, ...normalized, updatedAt: new Date().toISOString() } : entry))
    : [normalized, ...currentTemplates];

  const nextState = {
    ...currentState,
    operationalInspectionTemplates: nextTemplates,
  };

  return { ok: true, state: replaceWarehouseState(nextState), templateId: normalized.id };
}