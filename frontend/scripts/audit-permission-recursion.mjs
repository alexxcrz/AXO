/**
 * Verifica resolveCanDoAction sin importar constantes.js (requiere Vite en runtime).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolveCanDoAction, resolveCanAccessPage } from "../src/utils/permissionResolver.js";

const here = dirname(fileURLToPath(import.meta.url));
const statePath = join(here, "../../backend/data/warehouse-state.json");
const state = JSON.parse(readFileSync(statePath, "utf8"));
const permissions = state.permissions || {};

function collectPermissionIds() {
  const actionIds = new Set(Object.keys(permissions.actions || {}));
  const pageIds = new Set(Object.keys(permissions.pages || {}));
  for (const block of Object.values(permissions.userOverrides || {})) {
    Object.keys(block?.actions || {}).forEach((id) => actionIds.add(id));
    Object.keys(block?.pages || {}).forEach((id) => pageIds.add(id));
  }
  return { actionIds: [...actionIds], pageIds: [...pageIds] };
}

function buildDenyAllManagedPermissions(userId, actionIds, pageIds) {
  return {
    ...permissions,
    userOverrides: {
      ...(permissions.userOverrides || {}),
      [userId]: {
        actions: Object.fromEntries(actionIds.map((id) => [id, false])),
        pages: Object.fromEntries(pageIds.map((id) => [id, false])),
      },
    },
  };
}

function buildSparseManagedPermissions(userId) {
  return {
    ...permissions,
    userOverrides: {
      ...(permissions.userOverrides || {}),
      [userId]: {
        actions: {
          scopeMantenimientoMyBoards: true,
          "scopeMantenimientoMyBoards__boardWorkflow": true,
          accessNavMantenimiento: true,
        },
        pages: {
          customBoards: true,
        },
      },
    },
  };
}

const { actionIds, pageIds } = collectPermissionIds();
const managedUser = { id: "audit-managed", role: "JR", department: "Mantenimiento" };
const unmanagedUser = { id: "audit-unmanaged", role: "SSR", department: "Operaciones" };

for (const model of [
  buildDenyAllManagedPermissions(managedUser.id, actionIds, pageIds),
  buildSparseManagedPermissions(managedUser.id),
  permissions,
]) {
  for (const user of [managedUser, unmanagedUser]) {
    for (const actionId of actionIds) {
      resolveCanDoAction(user, actionId, model);
    }
    for (const pageId of pageIds) {
      resolveCanAccessPage(user, pageId, model);
    }
  }
}

console.log(`OK frontend: ${actionIds.length} acciones auditadas sin recursión.`);
