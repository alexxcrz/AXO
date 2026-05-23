import { useEffect, useState } from "react";
import { ES_MX_DELEGATION as T } from "../locale/esMXPermissions.js";
import { DELEGATABLE_ROLES, normalizePermissionDelegation } from "../utils/permissionDelegation.js";
import { ROLE_LEAD } from "../utils/constantes.js";

export function DelegacionPermisosConfig({
  operationalSettings,
  canManage,
  onSave,
  pushAppToast,
}) {
  const [draft, setDraft] = useState(() => normalizePermissionDelegation(operationalSettings?.permissionDelegation));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(normalizePermissionDelegation(operationalSettings?.permissionDelegation));
  }, [operationalSettings?.permissionDelegation]);

  async function handleSave() {
    if (!canManage || saving) return;
    setSaving(true);
    try {
      await onSave({ permissionDelegation: draft });
      pushAppToast(T.saved, "success");
    } catch (error) {
      pushAppToast(error?.message || T.saveError, "danger");
    } finally {
      setSaving(false);
    }
  }

  function updateRole(role, patch) {
    setDraft((current) => ({
      ...current,
      byRole: {
        ...current.byRole,
        [role]: { ...current.byRole[role], ...patch },
      },
    }));
  }

  return (
    <article className="surface-card full-width perm-delegation-config">
      <div className="card-header-row">
        <div>
          <h3>{T.title}</h3>
          <p className="subtle-line">{T.intro}</p>
          <p className="subtle-line" style={{ marginTop: "0.35rem" }}>{T.noteLead}</p>
        </div>
      </div>

      <div className="perm-delegation-table-wrap">
        <table className="players-table-compact">
          <thead>
            <tr>
              <th>{T.roleColumn}</th>
              <th>{T.canDelegate}</th>
              <th>{T.canGrantMeta}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{ROLE_LEAD}</strong></td>
              <td colSpan={2} className="subtle-line">Siempre activo (no configurable)</td>
            </tr>
            {DELEGATABLE_ROLES.map((role) => (
              <tr key={role}>
                <td><strong>{role}</strong></td>
                <td>
                  <button
                    type="button"
                    className={`switch-button ${draft.byRole[role]?.enabled ? "on" : ""}`}
                    disabled={!canManage}
                    onClick={() => updateRole(role, { enabled: !draft.byRole[role]?.enabled })}
                    aria-pressed={Boolean(draft.byRole[role]?.enabled)}
                  >
                    <span className="switch-thumb" />
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className={`switch-button ${draft.byRole[role]?.canGrantManagePermissions ? "on" : ""}`}
                    disabled={!canManage || !draft.byRole[role]?.enabled}
                    onClick={() => updateRole(role, { canGrantManagePermissions: !draft.byRole[role]?.canGrantManagePermissions })}
                    aria-pressed={Boolean(draft.byRole[role]?.canGrantManagePermissions)}
                  >
                    <span className="switch-thumb" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button type="button" className="primary-button" disabled={!canManage || saving} onClick={handleSave}>
          {saving ? "Guardando\u2026" : T.save}
        </button>
      </div>
    </article>
  );
}
