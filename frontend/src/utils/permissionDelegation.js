import { ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR, USER_ROLES } from "./constantes.js";

const DELEGATABLE_ROLES = [ROLE_SR, ROLE_SSR, ROLE_JR];

export function normalizePermissionDelegation(value) {
  const source = value && typeof value === "object" ? value : {};
  const byRole = source.byRole && typeof source.byRole === "object" ? source.byRole : {};
  const normalizedByRole = {};
  DELEGATABLE_ROLES.forEach((role) => {
    const entry = byRole[role] && typeof byRole[role] === "object" ? byRole[role] : {};
    normalizedByRole[role] = {
      enabled: Boolean(entry.enabled),
      canGrantManagePermissions: Boolean(entry.canGrantManagePermissions),
    };
  });
  return { byRole: normalizedByRole };
}

export function mergePermissionDelegationIntoOperational(operational) {
  const base = operational && typeof operational === "object" ? operational : {};
  return {
    ...base,
    permissionDelegation: normalizePermissionDelegation(base.permissionDelegation),
  };
}

export function canRoleDelegatePermissions(role, delegation, hasManagePermissions) {
  if (hasManagePermissions || role === ROLE_LEAD) return true;
  const entry = delegation?.byRole?.[role];
  return Boolean(entry?.enabled);
}

export function canRoleGrantManagePermissionsMeta(role, delegation, hasManagePermissions) {
  if (hasManagePermissions || role === ROLE_LEAD) return true;
  const entry = delegation?.byRole?.[role];
  return Boolean(entry?.enabled && entry?.canGrantManagePermissions);
}

export function buildDefaultDelegationByRole() {
  return DELEGATABLE_ROLES.reduce((acc, role) => {
    acc[role] = { enabled: false, canGrantManagePermissions: false };
    return acc;
  }, {});
}

export { DELEGATABLE_ROLES, USER_ROLES };
