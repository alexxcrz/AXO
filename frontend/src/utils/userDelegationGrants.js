import { ROLE_LEAD } from "./constantes.js";

export function isPermissionMetaEditor(user, actionPermissions = {}) {
  return user?.role === ROLE_LEAD || Boolean(actionPermissions?.managePermissions);
}

export function intersectGrantableScope(effective, delegationGrants, isMetaEditor) {
  const eff = effective && typeof effective === "object" ? effective : { pages: {}, actions: {} };
  if (isMetaEditor) {
    return {
      pages: { ...(eff.pages || {}) },
      actions: { ...(eff.actions || {}) },
    };
  }
  const grants = normalizeDelegationGrants(delegationGrants);
  if (!grants.enabled) {
    return { pages: {}, actions: {} };
  }
  return {
    pages: Object.fromEntries(
      Object.entries(eff.pages || {}).filter(([key, allowed]) => allowed && Boolean(grants.pages[key])),
    ),
    actions: Object.fromEntries(
      Object.entries(eff.actions || {}).filter(([key, allowed]) => allowed && Boolean(grants.actions[key])),
    ),
  };
}

export function canGrantKeyInScope(scope, kind, key) {
  return Boolean(scope?.[kind]?.[key]);
}

export function normalizeDelegationGrants(value) {
  const source = value && typeof value === "object" ? value : {};
  const pages = source.pages && typeof source.pages === "object" ? source.pages : {};
  const actions = source.actions && typeof source.actions === "object" ? source.actions : {};
  return {
    enabled: Boolean(source.enabled),
    pages: { ...pages },
    actions: { ...actions },
  };
}

export function normalizeUserPermissionOverride(override) {
  const source = override && typeof override === "object" ? override : {};
  return {
    pages: source.pages && typeof source.pages === "object" ? { ...source.pages } : {},
    actions: source.actions && typeof source.actions === "object" ? { ...source.actions } : {},
    delegation: normalizeDelegationGrants(source.delegation),
  };
}

export function hasUserOverrideValues(override) {
  const normalized = normalizeUserPermissionOverride(override);
  const pageValues = Object.values(normalized.pages);
  const actionValues = Object.values(normalized.actions);
  const delegationPages = Object.values(normalized.delegation.pages);
  const delegationActions = Object.values(normalized.delegation.actions);
  return pageValues.concat(actionValues, delegationPages, delegationActions).some((v) => typeof v === "boolean")
    || normalized.delegation.enabled;
}

export function mergePermissionOverridesForPayload(permissionOverrides, delegationGrants) {
  const base = normalizeUserPermissionOverride(permissionOverrides);
  const delegation = normalizeDelegationGrants(delegationGrants);
  return {
    pages: base.pages,
    actions: base.actions,
    delegation,
  };
}

export function extractDelegationGrantsFromUserOverride(userOverride) {
  return normalizeDelegationGrants(userOverride?.delegation);
}
