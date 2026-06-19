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

export function repairLegacyManagedDenyAllOverrides(userOverrides = {}) {
  const next = { ...userOverrides };
  Object.entries(next).forEach(([userId, block]) => {
    if (!block || typeof block !== "object") return;
    const actionEntries = Object.entries(block.actions || {});
    const pageEntries = Object.entries(block.pages || {});
    const trueCount = actionEntries.filter(([, value]) => value === true).length
      + pageEntries.filter(([, value]) => value === true).length;
    const falseCount = actionEntries.filter(([, value]) => value === false).length
      + pageEntries.filter(([, value]) => value === false).length;
    if (trueCount === 0 && falseCount > 0) {
      next[userId] = {
        ...block,
        pages: {},
        actions: {},
      };
      return;
    }
    if (trueCount > 0 && falseCount > trueCount) {
      next[userId] = {
        ...block,
        pages: Object.fromEntries(pageEntries.filter(([, value]) => value === true)),
        actions: Object.fromEntries(actionEntries.filter(([, value]) => value === true)),
      };
    }
  });
  return next;
}

export function mergePermissionOverridesForPayload(permissionOverrides, delegationGrants, options = {}) {
  const sparse = options.sparse !== false;
  const base = normalizeUserPermissionOverride(permissionOverrides);
  const pickEntries = (map) => {
    const entries = Object.entries(map || {});
    if (!sparse) return Object.fromEntries(entries);
    return Object.fromEntries(entries.filter(([, value]) => value === true));
  };
  const delegation = normalizeDelegationGrants(delegationGrants);
  return {
    pages: pickEntries(base.pages),
    actions: pickEntries(base.actions),
    delegation,
  };
}

export function extractDelegationGrantsFromUserOverride(userOverride) {
  return normalizeDelegationGrants(userOverride?.delegation);
}
