import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { UserPermissionsPanel } from "../components/UserPermissionsPanel.jsx";
import { ES_MX_PLAYER_EDITOR as T } from "../locale/esMXPlayerEditor.js";
import { supportsManagedPermissionOverrides } from "../utils/utilidades.jsx";
import "./PlayerEditorPage.css";

export default function PlayerEditorPage({ editor }) {
  if (!editor?.userModal?.open) return null;

  const {
    userModal,
    setUserModal,
    userModalMessage,
    showUserModalPassword,
    setShowUserModalPassword,
    userModalRoleOptions,
    updateUserModalRole,
    closeUserModal,
    submitUserModal,
    menuPermissionSections,
    expandedPermissionTabs,
    expandedDelegationTabs,
    canGrantManagedPermission,
    canGrantDelegationKey,
    canConfigureDelegationSection,
    canAssignPlayerPermissions,
    toggleUserModalPermission,
    toggleUserModalPermissionSection,
    toggleUserModalPermissionTab,
    toggleUserModalDelegation,
    toggleUserModalDelegationSection,
    toggleUserModalDelegationTab,
    toggleUserModalDelegationEnabled,
    editorIsMeta,
    shouldShowUserPermissionNote,
    rootAreaOptions,
    userAreaOptions,
    getAreaRoot,
    currentUser,
    ROLE_LEAD,
    ROLE_SSR,
    ROLE_JR,
    handleAddAreaOption,
    openDeleteAreaModal,
    activeAssignableUsers,
    Plus,
    Trash2,
    canResetOtherPasswords,
    openResetUserPassword,
    state,
    isRootLead,
    isDemoMode,
    deactivateDemoMode,
    activateDemoMode,
    actionPermissions,
  } = editor;

  const isCreate = userModal.mode === "create";
  const title = isCreate ? T.createTitle : T.editTitle;
  const confirmLabel = isCreate ? T.createConfirm : T.editConfirm;
  const showPermissions = (isCreate ? actionPermissions.createUsers : actionPermissions.editUsers)
    && supportsManagedPermissionOverrides(userModal.role)
    && (canAssignPlayerPermissions || canConfigureDelegationSection);

  return (
    <div className="players-editor-fullpage">
      <header className="players-editor-topbar">
        <div>
          <h2>{title}</h2>
          <p>{isCreate ? T.createSubtitle : T.editSubtitle(userModal.name)}</p>
        </div>
      </header>

      <div className="players-editor-body">
        <section className="players-editor-form-pane" aria-label={T.formAria}>
          {userModalMessage.text ? (
            <p className={`players-editor-feedback ${userModalMessage.tone === "success" ? "success" : "danger"}`}>
              {userModalMessage.text}
            </p>
          ) : null}

          <div className="players-editor-form-grid">
            <label className="app-modal-field">
              <span>{T.fullName}</span>
              <input value={userModal.name} onChange={(event) => setUserModal((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="app-modal-field">
              <span>{T.accessPlayer}</span>
              <input value={userModal.username} onChange={(event) => setUserModal((current) => ({ ...current, username: event.target.value }))} placeholder={T.accessPlaceholder} />
            </label>
            <label className="app-modal-field">
              <span>{T.jobTitle}</span>
              <input value={userModal.jobTitle} onChange={(event) => setUserModal((current) => ({ ...current, jobTitle: event.target.value }))} placeholder={T.jobTitlePlaceholder} />
            </label>
            <label className="app-modal-field">
              <span>{T.internalRole}</span>
              <select value={userModal.role} onChange={(event) => updateUserModalRole(event.target.value)}>
                {userModalRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>

            <label className="app-modal-field">
              <span>{T.area}</span>
              <div className="area-selector-row">
                <select value={userModal.area} onChange={(event) => setUserModal((current) => ({ ...current, area: event.target.value }))}>
                  <option value="">{T.selectArea}</option>
                  {(currentUser?.role === ROLE_LEAD ? rootAreaOptions : Array.from(new Set(userAreaOptions.map((a) => getAreaRoot(a) || a))).filter(Boolean)).map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                {currentUser?.role === ROLE_LEAD ? (
                  <button type="button" className="icon-button area-add-button" onClick={() => handleAddAreaOption()} aria-label={T.addAreaAria}>
                    <Plus size={16} />
                  </button>
                ) : null}
                {currentUser?.role === ROLE_LEAD && userModal.area ? (
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => openDeleteAreaModal(userModal.area, T.areaLabel(userModal.area))}
                    aria-label={T.deleteAreaAria}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            </label>
            <label className="app-modal-field">
              <span>{T.reference}</span>
              <select value={userModal.managerId} onChange={(event) => setUserModal((current) => ({ ...current, managerId: event.target.value }))}>
                <option value="">{T.select}</option>
                {activeAssignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <fieldset className="app-modal-field user-status-switch-field">
              <legend>{T.initialStatus}</legend>
              <div className="user-status-switch-row">
                <button
                  type="button"
                  className={`switch-button ${userModal.isActive === "true" ? "on" : ""}`}
                  onClick={() => setUserModal((current) => ({ ...current, isActive: current.isActive === "true" ? "false" : "true" }))}
                  aria-pressed={userModal.isActive === "true"}
                  aria-label={T.changeStatusAria}
                >
                  <span className="switch-thumb" />
                </button>
                <strong>{userModal.isActive === "true" ? T.active : T.inactive}</strong>
              </div>
            </fieldset>

            {isCreate ? (
              <label className="app-modal-field players-editor-field-password">
                <span>{T.tempPassword}</span>
                <div className="password-visibility-field">
                  <input
                    type={showUserModalPassword ? "text" : "password"}
                    value={userModal.password}
                    onChange={(event) => setUserModal((current) => ({ ...current, password: event.target.value }))}
                    placeholder={T.minPassword}
                  />
                  <button
                    type="button"
                    className="password-visibility-toggle"
                    aria-label={showUserModalPassword ? T.hidePassword : T.showPassword}
                    onClick={() => setShowUserModalPassword((current) => !current)}
                  >
                    {showUserModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            ) : null}
          </div>

          {!isCreate && canResetOtherPasswords && userModal.id && userModal.id !== currentUser?.id ? (
            <div className="players-editor-inline-actions">
              <button
                type="button"
                className="user-row-button"
                onClick={() => {
                  const targetUser = state.users.find((user) => user.id === userModal.id);
                  if (targetUser) openResetUserPassword(targetUser);
                }}
                disabled={!actionPermissions.resetPasswords}
              >
                <RotateCcw size={15} /> {T.resetPassword}
              </button>
            </div>
          ) : null}

          {isRootLead && !isCreate && userModal.id === currentUser?.id ? (
            <section className="user-modal-demo-section players-editor-demo">
              <div className="builder-section-head">
                <div>
                  <h4>{T.demoTitle}</h4>
                  <p>{T.demoDesc}</p>
                </div>
                {isDemoMode ? <span className="chip" style={{ background: "#fef3c7", color: "#92400e" }}>{T.active}</span> : <span className="chip">{T.inactive}</span>}
              </div>
              <div className="user-modal-demo-actions">
                {isDemoMode ? (
                  <button type="button" className="user-row-button danger" onClick={deactivateDemoMode}>
                    <RotateCcw size={15} /> {T.demoDeactivate}
                  </button>
                ) : (
                  <button type="button" className="user-row-button" onClick={activateDemoMode}>
                    {T.demoActivate}
                  </button>
                )}
              </div>
            </section>
          ) : null}
        </section>

        {showPermissions ? (
          <section className="players-editor-permissions-pane" aria-label={T.permissionsAria}>
            <UserPermissionsPanel
              menuPermissionSections={menuPermissionSections}
              userModal={userModal}
              expandedPermissionTabs={expandedPermissionTabs}
              expandedDelegationTabs={expandedDelegationTabs}
              canGrantManagedPermission={canGrantManagedPermission}
              canGrantDelegationKey={canGrantDelegationKey}
              showDelegationSection={canConfigureDelegationSection}
              toggleUserModalPermission={toggleUserModalPermission}
              toggleUserModalPermissionSection={toggleUserModalPermissionSection}
              toggleUserModalPermissionTab={toggleUserModalPermissionTab}
              toggleUserModalDelegation={toggleUserModalDelegation}
              toggleUserModalDelegationSection={toggleUserModalDelegationSection}
              toggleUserModalDelegationTab={toggleUserModalDelegationTab}
              toggleUserModalDelegationEnabled={toggleUserModalDelegationEnabled}
              editorIsMeta={editorIsMeta}
            />
            {shouldShowUserPermissionNote ? (
              <article className="user-permission-note">
                <strong>{userModal.role === ROLE_SSR ? T.noteSsrTitle : T.noteJrTitle}</strong>
                <p>{userModal.role === ROLE_SSR ? T.noteSsrBody : T.noteJrBody}</p>
              </article>
            ) : null}
          </section>
        ) : null}
      </div>

      <footer className="players-editor-footer">
        <button type="button" className="players-btn-secondary" onClick={closeUserModal} disabled={userModal.submitting}>
          {T.cancel}
        </button>
        <button type="button" className="primary-button" onClick={submitUserModal} disabled={userModal.submitting}>
          {userModal.submitting ? T.saving : confirmLabel}
        </button>
      </footer>
    </div>
  );
}
