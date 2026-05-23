/**
 * Registro central de permisos: secci�n ? �rea ? subpesta�a ? acci�n.
 * Fuente �nica para el modal de usuario y la matriz en Players.
 */
import {
  PAGE_DASHBOARD,
  PAGE_DASHBOARD_BUILDER,
  PAGE_CUSTOM_BOARDS,
  PAGE_BOARD,
  PAGE_HISTORY,
  PAGE_PROCESS_AUDITS,
  PAGE_INVENTORY,
  PAGE_TRANSPORT,
  PAGE_BIBLIOTECA,
  PAGE_INCIDENCIAS,
  PAGE_SYSTEM_SETTINGS,
  PAGE_USERS,
  ACTION_DEFINITIONS,
  getScopedAreaActionPermissionId,
} from "../utils/constantes";
import {
  APP_AREA_SECTIONS,
  NAV_AREA_ACTION_BY_SECTION,
  NAV_UTILITY_ACTION_BY_GROUP,
  AREA_TAB_PERMISSION_ACTIONS,
  TRANSPORT_SECTION_ACTIONS,
  AREA_TAB_BASE_ACTIONS,
} from "./areaNavigationConfig";

/** Subpesta�as internas de Auditor�a de procesos (UI, no pageId). */
export const PROCESS_AUDIT_SUB_TABS = [
  { id: "audit-tab-captura", label: "Captura / Checklist", actionIds: ["viewProcessAudits", "manageProcessAudits"] },
  { id: "audit-tab-propuestas", label: "Propuestas / Problemas", actionIds: ["viewProcessAudits", "manageProcessAudits"] },
  { id: "audit-tab-autorizar", label: "Autorizar / Rechazar", actionIds: ["manageProcessAudits"] },
  { id: "audit-tab-seguimiento", label: "Seguimiento / Implementaci�n", actionIds: ["viewProcessAudits", "manageProcessAudits"] },
  { id: "audit-tab-historial", label: "Historial de auditor�as", actionIds: ["viewProcessAudits"] },
];

/** Acciones de la p�gina Players (administraci�n de equipo). */
export const PLAYERS_ADMIN_ACTIONS = [
  { id: "createUsers", label: "Crear players" },
  { id: "editUsers", label: "Editar players" },
  { id: "deleteUsers", label: "Eliminar players" },
  { id: "resetPasswords", label: "Restablecer contrase\u00f1as" },
  { id: "managePermissions", label: "Gestionar permisos y roles" },
];

const UTILITY_PAGE_EXCLUDE = new Set([
  PAGE_DASHBOARD,
  PAGE_CUSTOM_BOARDS,
  PAGE_BOARD,
  PAGE_HISTORY,
  PAGE_TRANSPORT,
]);

function buildScopedActionPermissions(scopeActionId, baseActionIds, actionLabelById) {
  return baseActionIds
    .map((actionId) => ({
      id: getScopedAreaActionPermissionId(scopeActionId, actionId),
      label: actionLabelById.get(actionId) || actionId,
      kind: "actions",
      baseActionId: actionId,
    }))
    .filter((item) => item.id && item.label);
}

function buildAreaItemPermissions(section) {
  if (section.id === "transporte") {
    return [
      { tabKey: "registros-envios", label: "Registros de env�os", scopeKey: "registros-envios", actionsKey: "registros-envios" },
      { tabKey: "control-transporte", label: "Control transporte", scopeKey: "control-transporte", actionsKey: "control-transporte" },
      { tabKey: "incidencias-transporte", label: "Incidencias transporte", scopeKey: "incidencias-transporte", actionsKey: "incidencias-transporte" },
      { tabKey: "consolidados", label: "Consolidados", scopeKey: "consolidados", actionsKey: "consolidados" },
      { tabKey: "dashboard-transporte", label: "Dashboard transporte", scopeKey: "dashboard-transporte", actionsKey: "dashboard-transporte" },
      { tabKey: "direcciones-gastos", label: "Direcciones y gastos", scopeKey: "direcciones-gastos", actionsKey: "direcciones-gastos" },
    ].map(({ tabKey, label, scopeKey, actionsKey }) => ({
      tabKey,
      label,
      scopeActionId: AREA_TAB_PERMISSION_ACTIONS.transporte[scopeKey],
      baseActionIds: TRANSPORT_SECTION_ACTIONS[actionsKey] || [],
    }));
  }
  if (section.id === "mantenimiento") {
    return [
      { tabKey: "incidencias", label: "Incidencias", scopeActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.incidencias, baseActionIds: ["createIncidencia", "editIncidencia", "deleteIncidencia"] },
      { tabKey: "dashboard", label: "Dashboard", scopeActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.dashboard, baseActionIds: AREA_TAB_BASE_ACTIONS.dashboard },
      { tabKey: "board", label: "Creador de tableros", scopeActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.board, baseActionIds: AREA_TAB_BASE_ACTIONS.board },
      { tabKey: "customBoards", label: "Mis tableros", scopeActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.customBoards, baseActionIds: AREA_TAB_BASE_ACTIONS.customBoards },
      { tabKey: "history", label: "Historial", scopeActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.history, baseActionIds: AREA_TAB_BASE_ACTIONS.history },
    ];
  }
  const areaTabs = AREA_TAB_PERMISSION_ACTIONS[section.id];
  if (!areaTabs) return [];
  return [
    { tabKey: "dashboard", label: "Dashboard", scopeActionId: areaTabs.dashboard, baseActionIds: AREA_TAB_BASE_ACTIONS.dashboard },
    { tabKey: "board", label: "Creador de tableros", scopeActionId: areaTabs.board, baseActionIds: AREA_TAB_BASE_ACTIONS.board },
    { tabKey: "customBoards", label: "Mis tableros", scopeActionId: areaTabs.customBoards, baseActionIds: AREA_TAB_BASE_ACTIONS.customBoards },
    { tabKey: "history", label: "Historial", scopeActionId: areaTabs.history, baseActionIds: AREA_TAB_BASE_ACTIONS.history },
  ].filter((item) => item.scopeActionId);
}

/**
 * �rbol de men� lateral para asignaci�n de permisos (modal de usuario).
 */
export function buildMenuPermissionSections({ permissionPages = [] }) {
  const actionLabelById = new Map(ACTION_DEFINITIONS.map((item) => [item.id, item.label]));

  const mainDashboardSection = {
    id: "main-dashboard",
    label: "DASHBOARD PRINCIPAL",
    navVisibilityActionId: PAGE_DASHBOARD,
    navVisibilityKind: "pages",
    itemPermissions: [
      {
        id: PAGE_DASHBOARD,
        label: "Dashboard principal (todas las �reas)",
        kind: "pages",
        actionPermissions: [
          { id: "exportDashboardData", label: actionLabelById.get("exportDashboardData") || "Exportar dashboard", kind: "actions" },
          { id: "manageDashboardState", label: actionLabelById.get("manageDashboardState") || "Administrar dashboard", kind: "actions" },
        ],
      },
    ],
  };

  const areaSections = APP_AREA_SECTIONS.map((section) => {
    const navVisibilityActionId = NAV_AREA_ACTION_BY_SECTION[section.id] || "";
    const tabDefs = buildAreaItemPermissions(section);
    const itemPermissions = tabDefs
      .map((tab) => ({
        id: tab.scopeActionId,
        tabKey: tab.tabKey,
        label: tab.label,
        kind: "actions",
        actionPermissions: buildScopedActionPermissions(tab.scopeActionId, tab.baseActionIds, actionLabelById),
      }))
      .filter((item) => item.id);

    return {
      id: section.id,
      label: section.label,
      scopes: section.scopes,
      navVisibilityActionId,
      navVisibilityKind: "actions",
      itemPermissions,
    };
  }).filter((section) => section.itemPermissions.length > 0);

  const utilitySections = Object.entries(NAV_UTILITY_ACTION_BY_GROUP).map(([groupLabel, actionId]) => {
    const pageItemPermissions = permissionPages
      .filter((item) => item.group === groupLabel)
      .filter((item) => !UTILITY_PAGE_EXCLUDE.has(item.id))
      .map((item) => {
        if (item.id === PAGE_PROCESS_AUDITS) {
          return {
            id: item.id,
            label: item.label,
            kind: "pages",
            subTabs: PROCESS_AUDIT_SUB_TABS.map((sub) => ({
              id: sub.id,
              label: sub.label,
              kind: "subtab",
              actionPermissions: sub.actionIds.map((aid) => ({
                id: aid,
                label: actionLabelById.get(aid) || aid,
                kind: "actions",
              })),
            })),
            actionPermissions: [
              { id: "viewProcessAudits", label: actionLabelById.get("viewProcessAudits") || "Ver auditor�as", kind: "actions" },
              { id: "manageProcessAudits", label: actionLabelById.get("manageProcessAudits") || "Gestionar auditor�as", kind: "actions" },
              { id: "manageProcessAuditTemplates", label: actionLabelById.get("manageProcessAuditTemplates") || "Plantillas", kind: "actions" },
            ],
          };
        }
        return { id: item.id, label: item.label, kind: "pages" };
      });

    const inventoryTabPermissions = groupLabel === "Producci�n" ? [
      {
        id: "viewBaseInventory",
        label: actionLabelById.get("viewBaseInventory") || "Pesta�a Productos",
        kind: "actions",
        tabKey: "inventario-productos",
        actionPermissions: [
          { id: "manageInventory", label: actionLabelById.get("manageInventory") || "Gestionar", kind: "actions" },
          { id: "deleteInventory", label: actionLabelById.get("deleteInventory") || "Eliminar", kind: "actions" },
          { id: "importInventory", label: actionLabelById.get("importInventory") || "Importar", kind: "actions" },
        ],
      },
      {
        id: "viewCleaningInventory",
        label: actionLabelById.get("viewCleaningInventory") || "Pesta�a Insumos limpieza",
        kind: "actions",
        tabKey: "inventario-limpieza",
        actionPermissions: [
          { id: "manageCleaningInventory", label: actionLabelById.get("manageCleaningInventory") || "Gestionar", kind: "actions" },
          { id: "deleteCleaningInventory", label: actionLabelById.get("deleteCleaningInventory") || "Eliminar", kind: "actions" },
          { id: "importCleaningInventory", label: actionLabelById.get("importCleaningInventory") || "Importar", kind: "actions" },
        ],
      },
      {
        id: "viewOrderInventory",
        label: actionLabelById.get("viewOrderInventory") || "Pesta�a Insumos pedidos",
        kind: "actions",
        tabKey: "inventario-pedidos",
        actionPermissions: [
          { id: "manageOrderInventory", label: actionLabelById.get("manageOrderInventory") || "Gestionar", kind: "actions" },
          { id: "deleteOrderInventory", label: actionLabelById.get("deleteOrderInventory") || "Eliminar", kind: "actions" },
          { id: "importOrderInventory", label: actionLabelById.get("importOrderInventory") || "Importar", kind: "actions" },
        ],
      },
    ] : [];

    const itemPermissions = [...pageItemPermissions, ...inventoryTabPermissions];

    return {
      id: `utility-${groupLabel.toLowerCase().replace(/\s+/g, "-")}`,
      label: groupLabel.toUpperCase(),
      navVisibilityActionId: actionId,
      navVisibilityKind: "actions",
      itemPermissions,
    };
  }).filter((section) => section.itemPermissions.length > 0);

  const playersAdminSection = {
    id: "players-admin",
    label: "PLAYERS (ESTA P\u00c1GINA)",
    navVisibilityActionId: PAGE_USERS,
    navVisibilityKind: "pages",
    itemPermissions: PLAYERS_ADMIN_ACTIONS.map((item) => ({
      id: item.id,
      label: item.label,
      kind: "actions",
    })),
  };

  return [mainDashboardSection, ...areaSections, ...utilitySections, playersAdminSection];
}

/** Lista plana para matriz / b�squeda en Players. */
export function flattenPermissionRegistry(menuPermissionSections = []) {
  const rows = [];
  menuPermissionSections.forEach((section) => {
    rows.push({
      level: "section",
      sectionId: section.id,
      sectionLabel: section.label,
      navKind: section.navVisibilityKind,
      navId: section.navVisibilityActionId,
      label: `Secci�n lateral: ${section.label}`,
      permissionId: section.navVisibilityActionId,
      kind: section.navVisibilityKind,
    });

    (section.itemPermissions || []).forEach((item) => {
      rows.push({
        level: "tab",
        sectionId: section.id,
        sectionLabel: section.label,
        tabKey: item.tabKey || item.id,
        label: item.label,
        permissionId: item.id,
        kind: item.kind,
        parentNavId: section.navVisibilityActionId,
      });

      (item.subTabs || []).forEach((sub) => {
        rows.push({
          level: "subtab",
          sectionId: section.id,
          sectionLabel: section.label,
          tabKey: item.tabKey || item.id,
          subTabKey: sub.id,
          label: `${item.label} ? ${sub.label}`,
          permissionId: sub.id,
          kind: "subtab",
        });
        (sub.actionPermissions || []).forEach((action) => {
          rows.push({
            level: "action",
            sectionId: section.id,
            sectionLabel: section.label,
            tabKey: item.id,
            subTabKey: sub.id,
            label: action.label,
            permissionId: action.id,
            kind: "actions",
          });
        });
      });

      (item.actionPermissions || []).forEach((action) => {
        rows.push({
          level: "action",
          sectionId: section.id,
          sectionLabel: section.label,
          tabKey: item.tabKey || item.id,
          label: action.label,
          permissionId: action.id,
          kind: "actions",
          scoped: Boolean(action.id?.includes("__")),
        });
      });
    });
  });
  return rows;
}

export function getPermissionRegistryStats(menuPermissionSections = []) {
  const flat = flattenPermissionRegistry(menuPermissionSections);
  return {
    sections: menuPermissionSections.length,
    tabs: flat.filter((r) => r.level === "tab").length,
    subtabs: flat.filter((r) => r.level === "subtab").length,
    actions: flat.filter((r) => r.level === "action").length,
    totalRows: flat.length,
  };
}
