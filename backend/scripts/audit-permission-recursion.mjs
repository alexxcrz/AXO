/**
 * Verifica que la resolución de permisos no provoque recursión infinita
 * (Maximum call stack size exceeded) con usuarios managed, unmanaged y overrides legacy.
 */
import { canUserDoWarehouseAction, canUserAccessWarehousePage, getRawWarehouseState } from "../src/services/warehouse.store.js";

function collectPermissionIds(permissions) {
  const actionIds = new Set(Object.keys(permissions?.actions || {}));
  const pageIds = new Set(Object.keys(permissions?.pages || {}));

  for (const block of Object.values(permissions?.userOverrides || {})) {
    Object.keys(block?.actions || {}).forEach((id) => actionIds.add(id));
    Object.keys(block?.pages || {}).forEach((id) => pageIds.add(id));
  }

  return {
    actionIds: [...actionIds],
    pageIds: [...pageIds],
  };
}

function buildDenyAllManagedPermissions(permissions, userId, actionIds, pageIds) {
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

function buildSparseManagedPermissions(permissions, userId) {
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

function auditUser(user, permissions, label) {
  const { actionIds, pageIds } = collectPermissionIds(permissions);
  for (const actionId of actionIds) {
    canUserDoWarehouseAction(user, actionId, permissions);
  }
  for (const pageId of pageIds) {
    canUserAccessWarehousePage(user, pageId, permissions);
  }
  console.log(`OK ${label}: ${actionIds.length} acciones, ${pageIds.length} páginas`);
}

let failed = false;

try {
  const state = getRawWarehouseState();
  const permissions = state.permissions || {};
  const { actionIds, pageIds } = collectPermissionIds(permissions);

  const syntheticManaged = {
    id: "audit-managed-deny-all",
    role: "JR",
    isActive: true,
    department: "Mantenimiento",
  };
  auditUser(
    syntheticManaged,
    buildDenyAllManagedPermissions(permissions, syntheticManaged.id, actionIds, pageIds),
    "managed deny-all",
  );

  const syntheticSparse = {
    id: "audit-managed-sparse",
    role: "JR",
    isActive: true,
    department: "Mantenimiento",
  };
  auditUser(
    syntheticSparse,
    buildSparseManagedPermissions(permissions, syntheticSparse.id),
    "managed sparse grants",
  );

  for (const user of state.users || []) {
    if (!user?.id) continue;
    auditUser(user, permissions, `usuario ${user.username || user.id}`);
  }

  console.log("Auditoría de permisos completada sin errores de recursión.");
} catch (error) {
  failed = true;
  console.error("FALLÓ auditoría de permisos:", error?.stack || error?.message || error);
}

process.exit(failed ? 1 : 0);
