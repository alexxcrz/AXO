/** Configuracion del modulo RETAIL (area lateral). */

export const RETAIL_PO_STATUS = {
  DRAFT: "draft",
  PENDING_PICK: "pending_pick",
  PICKING: "picking",
  PICKED_PARTIAL: "picked_partial",
  PICKED: "picked",
  CLOSING: "closing",
  CLOSED: "closed",
  CANCELLED: "cancelled",
};

export const RETAIL_PO_STATUS_LABELS = {
  [RETAIL_PO_STATUS.DRAFT]: "Borrador",
  [RETAIL_PO_STATUS.PENDING_PICK]: "Pendiente surtido",
  [RETAIL_PO_STATUS.PICKING]: "En surtido",
  [RETAIL_PO_STATUS.PICKED_PARTIAL]: "Surtido parcial",
  [RETAIL_PO_STATUS.PICKED]: "Surtida",
  [RETAIL_PO_STATUS.CLOSING]: "En cierre",
  [RETAIL_PO_STATUS.CLOSED]: "Cerrada",
  [RETAIL_PO_STATUS.CANCELLED]: "Cancelada",
};

export const RETAIL_TABS = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Dash" },
  { id: "ordenes-compra", label: "Ordenes de compra", shortLabel: "OC" },
  { id: "surtido", label: "Surtido", shortLabel: "Surtido" },
  { id: "cerrado", label: "Cerrado", shortLabel: "Cerrado" },
  { id: "huellas", label: "Huellas logisticas", shortLabel: "Huellas" },
  { id: "clientes", label: "Clientes", shortLabel: "Clientes" },
  { id: "inventario", label: "Inventario retail", shortLabel: "Inventario" },
  { id: "prearmado", label: "Prearmado de cajas", shortLabel: "Prearmado" },
  { id: "incidencias", label: "Incidencias", shortLabel: "Incid." },
  { id: "reportes", label: "Reportes", shortLabel: "Reportes" },
];

export const RETAIL_TAB_SCOPE_IDS = {
  dashboard: "scopeRetailDashboard",
  "ordenes-compra": "scopeRetailOrdenesCompra",
  "surtido": "scopeRetailSurtido",
  "cerrado": "scopeRetailCerrado",
  "huellas": "scopeRetailHuellas",
  "clientes": "scopeRetailClientes",
  "inventario": "scopeRetailInventario",
  "prearmado": "scopeRetailPrearmado",
  "incidencias": "scopeRetailIncidencias",
  "reportes": "scopeRetailReportes",
};

export const RETAIL_SECTION_ACTIONS = {
  dashboard: [
    "viewRetailReports",
    "exportRetailReports",
    "exportDashboardData",
    "manageDashboardState",
  ],
  "ordenes-compra": [
    "viewRetailPurchaseOrders",
    "manageRetailPurchaseOrders",
    "cancelRetailPurchaseOrders",
  ],
  surtido: [
    "viewRetailPicking",
    "manageRetailPicking",
  ],
  cerrado: [
    "viewRetailClosing",
    "manageRetailClosing",
    "approveRetailClosing",
    "printRetailLabels",
    "reprintRetailLabels",
  ],
  huellas: [
    "viewRetailFootprints",
    "manageRetailFootprints",
    "importRetailFootprints",
  ],
  clientes: [
    "viewRetailClients",
    "manageRetailClients",
  ],
  inventario: [
    "viewRetailCatalog",
    "manageRetailCatalog",
    "importRetailCatalog",
  ],
  prearmado: [
    "viewRetailPreassembly",
    "manageRetailPreassembly",
  ],
  incidencias: [
    "viewRetailIncidents",
    "manageRetailIncidents",
  ],
  reportes: [
    "viewRetailReports",
    "exportRetailReports",
  ],
};

const DEFAULT_RETAIL_ROLES = ["Lead", "Senior (Sr)", "Semi-Senior (Ssr)", "Junior (Jr)"];
const DEFAULT_RETAIL_MANAGE_ROLES = ["Lead", "Senior (Sr)", "Semi-Senior (Ssr)"];

export const RETAIL_BASE_ACTION_DEFINITIONS = [
  { id: "viewRetailPurchaseOrders", label: "Ver ordenes de compra retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "manageRetailPurchaseOrders", label: "Gestionar ordenes de compra retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "cancelRetailPurchaseOrders", label: "Cancelar ordenes de compra retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "viewRetailPicking", label: "Ver surtido retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "manageRetailPicking", label: "Registrar surtido retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "viewRetailClosing", label: "Ver cierre retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "manageRetailClosing", label: "Gestionar cierre retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "approveRetailClosing", label: "Aprobar cierre retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "printRetailLabels", label: "Imprimir etiquetas retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "reprintRetailLabels", label: "Reimprimir etiquetas retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "viewRetailFootprints", label: "Ver huellas logisticas retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "manageRetailFootprints", label: "Gestionar huellas logisticas retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "importRetailFootprints", label: "Importar huellas logisticas retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "viewRetailClients", label: "Ver clientes retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "manageRetailClients", label: "Gestionar clientes retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "viewRetailCatalog", label: "Ver inventario retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "manageRetailCatalog", label: "Gestionar inventario retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "importRetailCatalog", label: "Importar inventario retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "viewRetailPreassembly", label: "Ver prearmado retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "manageRetailPreassembly", label: "Gestionar prearmado retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "viewRetailIncidents", label: "Ver incidencias retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "manageRetailIncidents", label: "Gestionar incidencias retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "viewRetailReports", label: "Ver reportes retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_ROLES },
  { id: "exportRetailReports", label: "Exportar reportes retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "exportDashboardData", label: "Exportar datos del dashboard retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
  { id: "manageDashboardState", label: "Administrar dashboard retail", category: "Retail", defaultRoles: DEFAULT_RETAIL_MANAGE_ROLES },
];

export const RETAIL_TAB_SCOPE_DEFINITIONS = Object.entries(RETAIL_TAB_SCOPE_IDS).map(([tabId, scopeId]) => ({
  id: scopeId,
  label: `Operar ${RETAIL_TABS.find((t) => t.id === tabId)?.label || tabId} en area RETAIL`,
  category: "Navegacion por area",
  defaultRoles: DEFAULT_RETAIL_ROLES,
}));

export const RETAIL_SCOPED_ACTION_CONFIG = RETAIL_TABS.map((tab) => ({
  scopeId: RETAIL_TAB_SCOPE_IDS[tab.id],
  scopeLabel: `RETAIL / ${tab.label}`,
  baseActionIds: RETAIL_SECTION_ACTIONS[tab.id] || [],
}));
