/** Espejo de frontend/src/retail/retailModuleConfig.js (permisos). */

export const RETAIL_TAB_SCOPE_IDS = {
  dashboard: "scopeRetailDashboard",
  "ordenes-compra": "scopeRetailOrdenesCompra",
  surtido: "scopeRetailSurtido",
  cerrado: "scopeRetailCerrado",
  huellas: "scopeRetailHuellas",
  clientes: "scopeRetailClientes",
  inventario: "scopeRetailInventario",
  prearmado: "scopeRetailPrearmado",
  incidencias: "scopeRetailIncidencias",
  reportes: "scopeRetailReportes",
};

export const RETAIL_SECTION_ACTIONS = {
  dashboard: ["viewRetailReports", "exportRetailReports", "exportDashboardData", "manageDashboardState"],
  "ordenes-compra": ["viewRetailPurchaseOrders", "manageRetailPurchaseOrders", "cancelRetailPurchaseOrders"],
  surtido: ["viewRetailPicking", "manageRetailPicking"],
  cerrado: ["viewRetailClosing", "manageRetailClosing", "approveRetailClosing", "printRetailLabels", "reprintRetailLabels"],
  huellas: ["viewRetailFootprints", "manageRetailFootprints", "importRetailFootprints"],
  clientes: ["viewRetailClients", "manageRetailClients"],
  inventario: ["viewRetailCatalog", "manageRetailCatalog", "importRetailCatalog"],
  prearmado: ["viewRetailPreassembly", "manageRetailPreassembly"],
  incidencias: ["viewRetailIncidents", "manageRetailIncidents"],
  reportes: ["viewRetailReports", "exportRetailReports"],
};

export const RETAIL_SCOPED_ACTION_CONFIG = Object.entries(RETAIL_TAB_SCOPE_IDS).map(([tabId, scopeId]) => ({
  scopeId,
  baseActionIds: RETAIL_SECTION_ACTIONS[tabId] || [],
}));

export const RETAIL_BASE_ACTION_IDS = [...new Set(Object.values(RETAIL_SECTION_ACTIONS).flat())];

export const RETAIL_TAB_SCOPE_ACTION_ENTRIES = Object.entries(RETAIL_TAB_SCOPE_IDS).map(([tabId, scopeId]) => ({
  tabId,
  scopeId,
  baseActionIds: RETAIL_SECTION_ACTIONS[tabId] || [],
}));
