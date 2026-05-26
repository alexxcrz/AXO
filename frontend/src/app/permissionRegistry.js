/**
 * Registro central de permisos: sección → área → subpestaña → acción.
 * Fuente única para el modal de usuario y la matriz en Players.
 */
import {
  PAGE_DASHBOARD,
  PAGE_CUSTOM_BOARDS,
  PERMISSION_ASSIGNMENT_EXCLUDED_IDS,
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
  PAGE_ACTION_GROUPS,
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

/** Pestañas internas de Auditoría de procesos (visibilidad por pestaña). */
export const PROCESS_AUDIT_SUB_TABS = [
  { id: "accessAuditTabCaptura", label: "Captura / Checklist", actionIds: ["viewProcessAudits", "manageProcessAudits"] },
  { id: "accessAuditTabPropuestas", label: "Propuestas / Problemas", actionIds: ["viewProcessAudits", "manageProcessAudits"] },
  { id: "accessAuditTabAutorizar", label: "Autorizar / Rechazar", actionIds: ["manageProcessAudits"] },
  { id: "accessAuditTabSeguimiento", label: "Seguimiento / Implementación", actionIds: ["viewProcessAudits", "manageProcessAudits"] },
  { id: "accessAuditTabHistorial", label: "Historial de auditorías", actionIds: ["viewProcessAudits"] },
];

/** Acciones de la página Players (administración de equipo). */
export const PLAYERS_ADMIN_ACTIONS = [
  { id: "createUsers", label: "Crear players" },
  { id: "editUsers", label: "Editar players" },
  { id: "deleteUsers", label: "Eliminar players" },
  { id: "resetPasswords", label: "Restablecer contraseñas" },
  { id: "managePermissions", label: "Gestionar permisos y roles" },
];

const UTILITY_PAGE_EXCLUDE = new Set([
  PAGE_DASHBOARD,
  PAGE_CUSTOM_BOARDS,
  PAGE_BOARD,
  PAGE_HISTORY,
  PAGE_TRANSPORT,
  PAGE_INCIDENCIAS,
  PAGE_USERS,
  PAGE_SYSTEM_SETTINGS,
]);

const ADMIN_PAGE_IDS = new Set([PAGE_SYSTEM_SETTINGS, PAGE_USERS, PAGE_HISTORY]);

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

function buildPageActionPermissions(pageId, actionLabelById) {
  const actionIds = PAGE_ACTION_GROUPS[pageId] || [];
  return actionIds.map((actionId) => ({
    id: actionId,
    label: actionLabelById.get(actionId) || actionId,
    kind: "actions",
  }));
}

function buildAreaItemPermissions(section) {
  if (section.id === "transporte") {
    return [
      { tabKey: "registros-envios", label: "Registros de envíos", scopeKey: "registros-envios", actionsKey: "registros-envios" },
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

function buildMejoraContinuaItemPermissions(permissionPages, actionLabelById) {
  const pages = permissionPages.filter((item) => item.group === "Mejora continua");
  const items = [];

  pages.forEach((item) => {
    if (item.id === PAGE_PROCESS_AUDITS) {
      PROCESS_AUDIT_SUB_TABS.forEach((sub) => {
        items.push({
          id: sub.id,
          tabKey: sub.id,
          label: sub.label,
          kind: "actions",
          actionPermissions: sub.actionIds.map((aid) => ({
            id: aid,
            label: actionLabelById.get(aid) || aid,
            kind: "actions",
          })),
        });
      });
      items.push({
        id: "manageProcessAuditTemplates",
        tabKey: "audit-plantillas",
        label: actionLabelById.get("manageProcessAuditTemplates") || "Plantillas de auditoría",
        kind: "actions",
      });
      return;
    }
    items.push({
      id: item.id,
      tabKey: item.id,
      label: item.label,
      kind: "pages",
      actionPermissions: buildPageActionPermissions(item.id, actionLabelById),
    });
  });

  return items;
}

function buildAdminItemPermissions(permissionPages, actionLabelById) {
  const pages = permissionPages.filter((item) => ADMIN_PAGE_IDS.has(item.id));
  return pages.map((item) => {
    if (item.id === PAGE_USERS) {
      return {
        id: PAGE_USERS,
        tabKey: PAGE_USERS,
        label: item.label,
        kind: "pages",
        actionPermissions: PLAYERS_ADMIN_ACTIONS.map((action) => ({
          id: action.id,
          label: actionLabelById.get(action.id) || action.label,
          kind: "actions",
        })),
      };
    }
    return {
      id: item.id,
      tabKey: item.id,
      label: item.label,
      kind: "pages",
      actionPermissions: buildPageActionPermissions(item.id, actionLabelById),
    };
  });
}

const INVENTORY_TAB_PERMISSIONS = [
  {
    id: "viewBaseInventory",
    tabKey: "inventario-productos",
    label: "Productos",
    kind: "actions",
    actionPermissions: [
      { id: "manageInventory", labelKey: "manageInventory", fallback: "Gestionar" },
      { id: "deleteInventory", labelKey: "deleteInventory", fallback: "Eliminar" },
      { id: "importInventory", labelKey: "importInventory", fallback: "Importar" },
    ],
  },
  {
    id: "viewCleaningInventory",
    tabKey: "inventario-limpieza",
    label: "Insumos de limpieza",
    kind: "actions",
    actionPermissions: [
      { id: "manageCleaningInventory", labelKey: "manageCleaningInventory", fallback: "Gestionar" },
      { id: "deleteCleaningInventory", labelKey: "deleteCleaningInventory", fallback: "Eliminar" },
      { id: "importCleaningInventory", labelKey: "importCleaningInventory", fallback: "Importar" },
    ],
  },
  {
    id: "viewOrderInventory",
    tabKey: "inventario-pedidos",
    label: "Insumos para pedidos",
    kind: "actions",
    actionPermissions: [
      { id: "manageOrderInventory", labelKey: "manageOrderInventory", fallback: "Gestionar" },
      { id: "deleteOrderInventory", labelKey: "deleteOrderInventory", fallback: "Eliminar" },
      { id: "importOrderInventory", labelKey: "importOrderInventory", fallback: "Importar" },
    ],
  },
  {
    id: "viewMaintenanceInventory",
    tabKey: "inventario-mantenimiento",
    label: "Insumos de mantenimiento",
    kind: "actions",
    actionPermissions: [
      { id: "manageMaintenanceInventory", labelKey: "manageMaintenanceInventory", fallback: "Gestionar" },
      { id: "deleteMaintenanceInventory", labelKey: "deleteMaintenanceInventory", fallback: "Eliminar" },
      { id: "importMaintenanceInventory", labelKey: "importMaintenanceInventory", fallback: "Importar" },
    ],
  },
];

function buildProduccionItemPermissions(permissionPages, actionLabelById) {
  const pageItemPermissions = permissionPages
    .filter((item) => item.group === "Producción")
    .filter((item) => !UTILITY_PAGE_EXCLUDE.has(item.id))
    .filter((item) => item.id !== PAGE_INVENTORY)
    .map((item) => ({
      id: item.id,
      tabKey: item.id,
      label: item.label,
      kind: "pages",
      actionPermissions: buildPageActionPermissions(item.id, actionLabelById),
    }));

  const inventoryTabPermissions = INVENTORY_TAB_PERMISSIONS.map((tab) => ({
    id: tab.id,
    tabKey: tab.tabKey,
    label: tab.label,
    kind: tab.kind,
    actionPermissions: tab.actionPermissions.map((action) => ({
      id: action.id,
      label: actionLabelById.get(action.labelKey) || action.fallback,
      kind: "actions",
    })),
  }));

  return [...pageItemPermissions, ...inventoryTabPermissions];
}

function buildRecursosItemPermissions(permissionPages, actionLabelById) {
  const biblioteca = permissionPages.find((item) => item.id === PAGE_BIBLIOTECA);
  if (!biblioteca) return [];
  return [{
    id: PAGE_BIBLIOTECA,
    tabKey: PAGE_BIBLIOTECA,
    label: biblioteca.label,
    kind: "pages",
    actionPermissions: buildPageActionPermissions(PAGE_BIBLIOTECA, actionLabelById),
  }];
}

/**
 * Árbol de menú lateral para asignación de permisos (modal de usuario).
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
        label: "Dashboard principal (todas las áreas)",
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
    let itemPermissions = [];

    if (groupLabel === "Mejora continua") {
      itemPermissions = buildMejoraContinuaItemPermissions(permissionPages, actionLabelById);
    } else if (groupLabel === "Producción") {
      itemPermissions = buildProduccionItemPermissions(permissionPages, actionLabelById);
    } else if (groupLabel === "Recursos") {
      itemPermissions = buildRecursosItemPermissions(permissionPages, actionLabelById);
    } else if (groupLabel === "Admin") {
      itemPermissions = buildAdminItemPermissions(permissionPages, actionLabelById);
    } else {
      itemPermissions = permissionPages
        .filter((item) => item.group === groupLabel)
        .filter((item) => !UTILITY_PAGE_EXCLUDE.has(item.id))
        .map((item) => ({
          id: item.id,
          tabKey: item.id,
          label: item.label,
          kind: "pages",
          actionPermissions: buildPageActionPermissions(item.id, actionLabelById),
        }));
    }

    return {
      id: `utility-${groupLabel.toLowerCase().replace(/\s+/g, "-")}`,
      label: groupLabel.toUpperCase(),
      navVisibilityActionId: actionId,
      navVisibilityKind: "actions",
      itemPermissions,
    };
  }).filter((section) => section.itemPermissions.length > 0);

  return [mainDashboardSection, ...areaSections, ...utilitySections];
}

function isAssignablePermissionId(kind, permissionId, canGrantFn) {
  if (!permissionId || PERMISSION_ASSIGNMENT_EXCLUDED_IDS.has(permissionId)) return false;
  return canGrantFn(kind, permissionId);
}

function filterActionPermissionList(actions, canGrantFn) {
  return (actions || []).filter((action) => isAssignablePermissionId("actions", action.id, canGrantFn));
}

function filterSubTabs(subTabs, canGrantFn) {
  return (subTabs || [])
    .map((sub) => ({
      ...sub,
      actionPermissions: filterActionPermissionList(sub.actionPermissions, canGrantFn),
    }))
    .filter((sub) => sub.actionPermissions.length > 0);
}

function filterTabPermission(tab, canGrantFn) {
  const actionPermissions = filterActionPermissionList(tab.actionPermissions, canGrantFn);
  const subTabs = filterSubTabs(tab.subTabs, canGrantFn);
  const tabDelegable = isAssignablePermissionId(tab.kind || "actions", tab.id, canGrantFn);
  if (!tabDelegable && !actionPermissions.length && !subTabs.length) return null;
  return { ...tab, actionPermissions, subTabs };
}

/**
 * Oculta permisos no delegables o reservados al Lead principal (no se muestran bloqueados).
 */
export function filterAssignableMenuPermissionSections(menuPermissionSections = [], canGrantFn = () => false) {
  return (menuPermissionSections || [])
    .map((section) => {
      const navDelegable = isAssignablePermissionId(
        section.navVisibilityKind || "actions",
        section.navVisibilityActionId,
        canGrantFn,
      );
      const itemPermissions = (section.itemPermissions || [])
        .map((tab) => filterTabPermission(tab, canGrantFn))
        .filter(Boolean);
      if (!navDelegable && !itemPermissions.length) return null;
      return { ...section, itemPermissions };
    })
    .filter(Boolean);
}

/** Lista plana para matriz / búsqueda en Players. */
export function flattenPermissionRegistry(menuPermissionSections = []) {
  const rows = [];
  menuPermissionSections.forEach((section) => {
    rows.push({
      level: "section",
      sectionId: section.id,
      sectionLabel: section.label,
      navKind: section.navVisibilityKind,
      navId: section.navVisibilityActionId,
      label: `Sección lateral: ${section.label}`,
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
          label: `${item.label} → ${sub.label}`,
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
