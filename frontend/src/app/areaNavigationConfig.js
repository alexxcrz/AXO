const APP_AREA_SECTIONS = [
  { id: "esto", label: "ESTO", scopes: ["ESTO"] },
  { id: "transporte", label: "TRANSPORTE", scopes: ["TRANSPORTE"] },
  { id: "limpieza", label: "LIMPIEZA", scopes: ["LIMPIEZA"] },
  { id: "regulatorio", label: "REGULATORIO", scopes: ["REGULATORIO"] },
  { id: "calidad", label: "CALIDAD", scopes: ["CALIDAD"] },
  { id: "inventario", label: "INVENTARIO", scopes: ["INVENTARIO"] },
  { id: "recepcion-pedidos", label: "RECEPCION DE PEDIDOS", scopes: ["RECEPCION DE PEDIDOS"] },
  { id: "operaciones", label: "OPERACIONES", scopes: ["OPERACIONES"] },
  { id: "mantenimiento", label: "MANTENIMIENTO", scopes: ["MANTENIMIENTO"] },
  { id: "mejora-continua", label: "MEJORA CONTINUA", scopes: ["MEJORA CONTINUA"] },
  { id: "mayoreo-comercio", label: "MAYOREO / ECOMMERCE / PEDIDOS DETAL", scopes: ["MAYOREO-TELEMARKETING", "ECOMMERCE", "PEDIDOS DETAL"] },
  { id: "retail", label: "RETAIL", scopes: ["RETAIL"] },
  { id: "fullfilment", label: "FULLFILMENT", scopes: ["FULLFILMENT"] },
];

const NAV_AREA_ACTION_BY_SECTION = {
  "esto": "accessNavEsto",
  "transporte": "accessNavTransporte",
  "limpieza": "accessNavLimpieza",
  "regulatorio": "accessNavRegulatorio",
  "calidad": "accessNavCalidad",
  "inventario": "accessNavInventario",
  "recepcion-pedidos": "accessNavRecepcion",
  "operaciones": "accessNavOperaciones",
  "mantenimiento": "accessNavMantenimiento",
  "mayoreo-comercio": "accessNavMayoreo",
  "retail": "accessNavRetail",
  "fullfilment": "accessNavFullfilment",
  "mejora-continua": "accessNavMejoraContinua",
};

const NAV_UTILITY_ACTION_BY_GROUP = {
  "Mejora continua": "accessNavMejoraContinua",
  "Producción": "accessNavProduccion",
  "Recursos": "accessNavRecursos",
  "Admin": "accessNavEquipo",
};

const AREA_TAB_PERMISSION_ACTIONS = {
  "esto": {
    dashboard: "scopeEstoDashboard",
    board: "scopeEstoBoardBuilder",
    customBoards: "scopeEstoMyBoards",
    history: "scopeEstoHistory",
  },
  "limpieza": {
    dashboard: "scopeLimpiezaDashboard",
    board: "scopeLimpiezaBoardBuilder",
    customBoards: "scopeLimpiezaMyBoards",
    history: "scopeLimpiezaHistory",
  },
  "regulatorio": {
    dashboard: "scopeRegulatorioDashboard",
    board: "scopeRegulatorioBoardBuilder",
    customBoards: "scopeRegulatorioMyBoards",
    history: "scopeRegulatorioHistory",
  },
  "calidad": {
    dashboard: "scopeCalidadDashboard",
    board: "scopeCalidadBoardBuilder",
    customBoards: "scopeCalidadMyBoards",
    history: "scopeCalidadHistory",
  },
  "inventario": {
    dashboard: "scopeInventarioDashboard",
    board: "scopeInventarioBoardBuilder",
    customBoards: "scopeInventarioMyBoards",
    history: "scopeInventarioHistory",
  },
  "recepcion-pedidos": {
    dashboard: "scopeRecepcionDashboard",
    board: "scopeRecepcionBoardBuilder",
    customBoards: "scopeRecepcionMyBoards",
    history: "scopeRecepcionHistory",
  },
  "operaciones": {
    dashboard: "scopeOperacionesDashboard",
    board: "scopeOperacionesBoardBuilder",
    customBoards: "scopeOperacionesMyBoards",
    history: "scopeOperacionesHistory",
  },
  "mantenimiento": {
    incidencias: "scopeMantenimientoIncidencias",
    dashboard: "scopeMantenimientoDashboard",
    board: "scopeMantenimientoBoardBuilder",
    customBoards: "scopeMantenimientoMyBoards",
    history: "scopeMantenimientoHistory",
  },
  "mayoreo-comercio": {
    dashboard: "scopeMayoreoDashboard",
    board: "scopeMayoreoBoardBuilder",
    customBoards: "scopeMayoreoMyBoards",
    history: "scopeMayoreoHistory",
  },
  "retail": {
    dashboard: "scopeRetailDashboard",
    board: "scopeRetailBoardBuilder",
    customBoards: "scopeRetailMyBoards",
    history: "scopeRetailHistory",
  },
  "fullfilment": {
    dashboard: "scopeFullfilmentDashboard",
    board: "scopeFullfilmentBoardBuilder",
    customBoards: "scopeFullfilmentMyBoards",
    history: "scopeFullfilmentHistory",
  },
  "transporte": {
    "registros-envios": "scopeTransporteRegistrosEnvios",
    "control-transporte": "scopeTransporteControl",
    "incidencias-transporte": "scopeTransporteIncidencias",
    "consolidados": "scopeTransporteConsolidados",
    "dashboard-transporte": "scopeTransporteDashboard",
    "direcciones-gastos": "scopeTransporteLogistica",
  },
};

const TRANSPORT_SECTION_ACTIONS = {
  "registros-envios": [
    "viewTransportRetail",
    "manageTransportRetail",
    "viewTransportPedidos",
    "manageTransportPedidos",
    "viewTransportInventario",
    "manageTransportInventario",
  ],
  "control-transporte": [
    "viewTransportDocumentacion",
    "manageTransportDocumentacion",
    "viewTransportAssignments",
    "manageTransportAssignments",
    "viewTransportPostponed",
    "manageTransportPostponed",
    "viewTransportMyRoutes",
  ],
  "incidencias-transporte": [],
  "consolidados": ["viewTransportConsolidated"],
  "dashboard-transporte": [],
  "direcciones-gastos": ["viewTransportLogistics", "manageTransportLogistics"],
};

const AREA_TAB_BASE_ACTIONS = {
  dashboard: ["exportDashboardData", "manageDashboardState"],
  board: ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"],
  customBoards: ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"],
  history: ["editHistoryRecords"],
};

export function normalizeAreaSectionId(areaValue) {
  const normalized = String(areaValue || "").trim().toLowerCase();
  if (!normalized) return "";
  return `area-${normalized.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

export function findAreaSectionByLabel(areaValue, sections = []) {
  const normalized = String(areaValue || "").trim().toLowerCase();
  if (!normalized) return null;
  return sections.find((section) => {
    const label = String(section.label || "").trim().toLowerCase();
    return label === normalized || section.id === normalized || section.id === normalizeAreaSectionId(normalized);
  }) || null;
}

export {
  APP_AREA_SECTIONS,
  NAV_AREA_ACTION_BY_SECTION,
  NAV_UTILITY_ACTION_BY_GROUP,
  AREA_TAB_PERMISSION_ACTIONS,
  TRANSPORT_SECTION_ACTIONS,
  AREA_TAB_BASE_ACTIONS,
};
