import {
  PAGE_DASHBOARD,
  PAGE_TRANSPORT,
  ROLE_LEAD,
  AREA_TAB_SCOPED_ACTION_CONFIG,
  getScopedAreaActionPermissionId,
} from "./constantes.js";
import {
  AREA_TAB_PERMISSION_ACTIONS,
  TRANSPORT_DOCUMENTACION_LEGACY_SCOPED_ACTIONS,
} from "../app/areaNavigationConfig.js";

const SCOPED_ALIASES_BY_BASE_ACTION = AREA_TAB_SCOPED_ACTION_CONFIG.reduce((map, { scopeId, baseActionIds }) => {
  (baseActionIds || []).forEach((baseActionId) => {
    const scopedActionId = getScopedAreaActionPermissionId(scopeId, baseActionId);
    if (!map.has(baseActionId)) map.set(baseActionId, []);
    map.get(baseActionId).push(scopedActionId);
  });
  return map;
}, new Map());

const SCOPED_CHILDREN_BY_SCOPE = Object.fromEntries(
  AREA_TAB_SCOPED_ACTION_CONFIG.map(({ scopeId, baseActionIds }) => [
    scopeId,
    (baseActionIds || []).map((baseActionId) => getScopedAreaActionPermissionId(scopeId, baseActionId)),
  ]),
);

const AREA_DASHBOARD_SCOPE_IDS = AREA_TAB_SCOPED_ACTION_CONFIG
  .map(({ scopeId }) => scopeId)
  .filter((scopeId) => /Dashboard$/i.test(scopeId));

const SCOPE_TAB_ACTION_IDS = new Set(AREA_TAB_SCOPED_ACTION_CONFIG.map(({ scopeId }) => scopeId));

function userMatchesPermissionEntry(user, entry) {
  if (!user || !entry) return false;
  const normalizedRole = String(user.role || "").trim();
  if (Array.isArray(entry.roles) && entry.roles.includes(normalizedRole)) return true;
  if (Array.isArray(entry.userIds) && entry.userIds.includes(user.id)) return true;
  const department = String(user.department || user.area || "").trim();
  if (department && Array.isArray(entry.departments) && entry.departments.includes(department)) return true;
  return false;
}

function readPermissionEntryOverride(user, kind, permissionId, permissions) {
  return permissions?.userOverrides?.[user?.id]?.[kind]?.[permissionId];
}

function readEffectivePermissionEntry(user, kind, permissionId, permissions) {
  const override = readPermissionEntryOverride(user, kind, permissionId, permissions);
  if (typeof override === "boolean") return override;
  const entry = kind === "pages"
    ? permissions?.pages?.[permissionId]
    : permissions?.actions?.[permissionId];
  return userMatchesPermissionEntry(user, entry);
}

function hasScopedAliasGrant(user, baseActionId, permissions) {
  const scopedAliases = SCOPED_ALIASES_BY_BASE_ACTION.get(baseActionId) || [];
  if (scopedAliases.some((scopedActionId) => readEffectivePermissionEntry(user, "actions", scopedActionId, permissions))) {
    return true;
  }
  const legacyScopedActionId = TRANSPORT_DOCUMENTACION_LEGACY_SCOPED_ACTIONS[baseActionId];
  if (legacyScopedActionId && readEffectivePermissionEntry(user, "actions", legacyScopedActionId, permissions)) {
    return true;
  }
  return false;
}

function hasScopeTabGrant(user, scopeActionId, permissions) {
  if (readEffectivePermissionEntry(user, "actions", scopeActionId, permissions)) return true;
  const scopedChildren = SCOPED_CHILDREN_BY_SCOPE[scopeActionId] || [];
  return scopedChildren.some((scopedActionId) => readEffectivePermissionEntry(user, "actions", scopedActionId, permissions));
}

export function userHasAnyAreaDashboardScope(user, permissions) {
  if (!user) return false;
  if (normalizeRoleIsLead(user)) return true;
  return AREA_DASHBOARD_SCOPE_IDS.some((scopeId) => hasScopeTabGrant(user, scopeId, permissions));
}

export function userHasAnyTransportAreaScope(user, permissions) {
  if (!user) return false;
  if (normalizeRoleIsLead(user)) return true;
  const transportScopes = Object.values(AREA_TAB_PERMISSION_ACTIONS.transporte || {});
  return transportScopes.some((scopeId) => hasScopeTabGrant(user, scopeId, permissions));
}

export function canAccessAreaDashboardPage(user, areaSectionId, permissions) {
  if (!user || !areaSectionId || areaSectionId === "all") return false;
  if (normalizeRoleIsLead(user)) return true;
  if (areaSectionId === "transporte") {
    return hasScopeTabGrant(user, "scopeTransporteDashboard", permissions);
  }
  const scopeId = AREA_TAB_PERMISSION_ACTIONS[areaSectionId]?.dashboard || "";
  return scopeId ? hasScopeTabGrant(user, scopeId, permissions) : false;
}

/** Dashboard corporativo (todas las áreas). No incluye dashboards scoped por área. */
export function canAccessGlobalDashboardPage(user, permissions) {
  if (!user) return false;
  if (normalizeRoleIsLead(user)) return true;
  const override = readPermissionEntryOverride(user, "pages", PAGE_DASHBOARD, permissions);
  if (typeof override === "boolean") return override;
  return userMatchesPermissionEntry(user, permissions?.pages?.[PAGE_DASHBOARD]);
}

function normalizeRoleIsLead(user) {
  return String(user?.role || "").trim() === ROLE_LEAD;
}

export function resolveCanDoAction(user, actionId, permissions) {
  if (!user || !actionId) return false;
  if (normalizeRoleIsLead(user)) return true;

  const directOverride = readPermissionEntryOverride(user, "actions", actionId, permissions);
  if (typeof directOverride === "boolean") return directOverride;

  if (SCOPE_TAB_ACTION_IDS.has(actionId)) {
    return hasScopeTabGrant(user, actionId, permissions);
  }

  if (readEffectivePermissionEntry(user, "actions", actionId, permissions)) return true;
  return hasScopedAliasGrant(user, actionId, permissions);
}

export function canAccessAreaNavItem(user, item, permissions) {
  if (!user || !item) return false;
  if (normalizeRoleIsLead(user)) return true;

  const requiredActionId = String(item.requiredActionId || "").trim();
  const pageId = item.pageId;

  if (pageId === PAGE_DASHBOARD && requiredActionId && AREA_DASHBOARD_SCOPE_IDS.includes(requiredActionId)) {
    return resolveCanDoAction(user, requiredActionId, permissions);
  }

  if (pageId === PAGE_TRANSPORT && requiredActionId) {
    return resolveCanDoAction(user, requiredActionId, permissions);
  }

  if (item.requiredKind === "pages" && requiredActionId) {
    return resolveCanAccessPage(user, requiredActionId, permissions);
  }

  if (!resolveCanAccessPage(user, pageId, permissions)) return false;
  if (!requiredActionId) return true;
  return resolveCanDoAction(user, requiredActionId, permissions);
}

export function resolveCanAccessPage(user, pageId, permissions) {
  if (!user || !pageId) return false;
  if (normalizeRoleIsLead(user)) return true;

  if (pageId === PAGE_TRANSPORT && userHasAnyTransportAreaScope(user, permissions)) {
    return true;
  }

  const override = readPermissionEntryOverride(user, "pages", pageId, permissions);
  if (typeof override === "boolean") return override;

  return userMatchesPermissionEntry(user, permissions?.pages?.[pageId]);
}

