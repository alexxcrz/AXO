import { Eye, EyeOff } from "lucide-react";
import { Modal } from "../Modal";
import {
  EmployeeProfileModal,
  ForcedPasswordChangeModal,
} from "../PerfilEmpleado";
import { TEMPORARY_PASSWORD_MIN_LENGTH } from "../../utils/constantes.js";

/** Modales extra�dos de App.jsx � AppUserModals */

/** Modales extraidos de App.jsx � AppUserModals */
export function AppUserModals(props) {
  const {
  actionDelegable,
  actionEnabled,
  actionItem,
  actionPermissions,
  Activa,
  Activar,
  activateDemoMode,
  activeAssignableUsers,
  Activo,
  alignItems,
  applyImportedSheet,
  Array,
  Boolean,
  borderRadius,
  Cada,
  canGrantManagedPermission,
  canResetOtherPasswords,
  Cargo,
  closeUserModal,
  columnCount,
  confirmPassword,
  Contrase,
  createUsers,
  Cuando,
  deactivateDemoMode,
  deleteUser,
  deleteUserId,
  Demo,
  Desactivar,
  editUsers,
  El,
  enabledTabCount,
  Esta,
  Estado,
  Este,
  excelSheetSelector,
  expandedPermissionTabs,
  fileName,
  filter,
  find,
  flexDirection,
  flexShrink,
  fontSize,
  fontWeight,
  forEach,
  getAreaRoot,
  handleAddAreaOption,
  handleLogout,
  Inactivo,
  isActive,
  isDemoMode,
  isForcedPasswordChange,
  isOpen,
  isRootLead,
  isTabExpanded,
  itemPermissions,
  jobTitle,
  justifyContent,
  La,
  Lead,
  managerId,
  map,
  mapeo,
  menuPermissionSections,
  Modo,
  navEnabled,
  navVisibilityActionId,
  navVisibilityKind,
  nestedActions,
  Nombre,
  openDeleteAreaModal,
  openResetUserPassword,
  Para,
  Permisos,
  permissionOverrides,
  permissionPageId,
  Pesta,
  Player,
  Plus,
  profileModalOpen,
  Referencia,
  resetPasswords,
  resetUserPasswordModal,
  Restablecer,
  Rol,
  ROLE_LEAD,
  ROLE_SSR,
  rootAreaOptions,
  RotateCcw,
  rowCount,
  Se,
  sectionPanelId,
  Selecciona,
  Seleccionar,
  Senior,
  Set,
  setDeleteUserId,
  setExcelSheetSelector,
  setPasswordForm,
  setProfileModalOpen,
  setResetUserPasswordModal,
  setShowResetUserPassword,
  setShowUserModalPassword,
  setTransferLeadTargetId,
  setUiFont,
  setUiFontSize,
  setUiTheme,
  setUserModal,
  shouldShowUserPermissionNote,
  showResetUserPassword,
  showUserModalPassword,
  Sin,
  Solo,
  Sub,
  subArea,
  submitPasswordReset,
  submitting,
  submitUserModal,
  submitUserPasswordReset,
  supportedFormulaCount,
  supportsManagedPermissionOverrides,
  tabPanelId,
  targetUser,
  TEMPORARY_PASSWORD_MIN_LENGTH,
  textAlign,
  toggleUserModalPermission,
  toggleUserModalPermissionSection,
  toggleUserModalPermissionTab,
  transferLead,
  transferLeadTargetId,
  Tu,
  UI_FONT_OPTIONS,
  UI_FONT_SIZE_OPTIONS,
  UI_THEME_OPTIONS,
  uiFont,
  uiFontSize,
  uiTheme,
  Un,
  updateCurrentUserIdentity,
  updateUserModalRole,
  userAreaOptions,
  userId,
  userModal,
  userModalMessage,
  userModalRoleOptions,
  username,
  userName,
  users,
  Ver,
  } = props;

  return (
    <>
return (
    <>
    <Modal open={userModal.open} className="user-management-modal" title={userModal.mode === "create" ? "Crear nuevo player" : "Editar player"} confirmLabel={userModal.mode === "create" ? "Guardar player" : "Guardar cambios"} cancelLabel="Cancelar" onClose={closeUserModal} onConfirm={submitUserModal} confirmDisabled={userModal.submitting}>
      <div className="modal-form-grid">
        {userModalMessage.text ? (
          <p className={`validation-text ${userModalMessage.tone === "success" ? "success" : ""}`.trim()} style={{ margin: 0 }}>
            {userModalMessage.text}
          </p>
        ) : null}
        <div className="user-modal-grid">
          <label className="app-modal-field">
            <span>Nombre completo</span>
            <input value={userModal.name} onChange={(event) => setUserModal((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="app-modal-field">
            <span>Player de acceso</span>
            <input value={userModal.username} onChange={(event) => setUserModal((current) => ({ ...current, username: event.target.value }))} placeholder="Ej: alejandro.cruz" />
          </label>
          <label className="app-modal-field">
            <span>├ürea</span>
            <div className="area-selector-row">
              <select value={userModal.area} onChange={(event) => setUserModal((current) => ({ ...current, area: event.target.value }))}>
                <option value="">Seleccionar ├írea...</option>
                {(currentUser?.role === ROLE_LEAD ? rootAreaOptions : Array.from(new Set(userAreaOptions.map((a) => getAreaRoot(a) || a))).filter(Boolean)).map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
              {currentUser?.role === ROLE_LEAD ? <button type="button" className="icon-button area-add-button" onClick={() => handleAddAreaOption()} aria-label="Agregar nueva ├írea"><Plus size={16} /></button> : null}
              {currentUser?.role === ROLE_LEAD && userModal.area ? (
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() => openDeleteAreaModal(userModal.area, `├írea ${userModal.area}`)}
                  aria-label="Eliminar ├írea seleccionada"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          </label>
          <label className="app-modal-field">
            <span>Cargo</span>
            <input value={userModal.jobTitle} onChange={(event) => setUserModal((current) => ({ ...current, jobTitle: event.target.value }))} placeholder="Ej: Encargado de Mejora Continua" />
          </label>
          <label className="app-modal-field">
            <span>Rol interno</span>
            <select value={userModal.role} onChange={(event) => updateUserModalRole(event.target.value)}>
              {userModalRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label className="app-modal-field">
            <span>Referencia</span>
            <select value={userModal.managerId} onChange={(event) => setUserModal((current) => ({ ...current, managerId: event.target.value }))}>
              <option value="">Seleccionar...</option>
              {activeAssignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          {userModal.mode === "create" ? (
            <label className="app-modal-field">
              <span>Contrase├▒a temporal</span>
              <div className="password-visibility-field">
                <input
                  type={showUserModalPassword ? "text" : "password"}
                  value={userModal.password}
                  onChange={(event) => setUserModal((current) => ({ ...current, password: event.target.value }))}
                  placeholder="M├¡nimo 4 caracteres"
                />
                <button
                  type="button"
                  className="password-visibility-toggle"
                  aria-label={showUserModalPassword ? "Ocultar contrase├▒a" : "Mostrar contrase├▒a"}
                  onClick={() => setShowUserModalPassword((current) => !current)}
                >
                  {showUserModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          ) : null}
          <fieldset className="app-modal-field user-status-switch-field">
            <legend>Estado inicial</legend>
            <div className="user-status-switch-row">
              <button
                type="button"
                className={`switch-button ${userModal.isActive === "true" ? "on" : ""}`}
                onClick={() => setUserModal((current) => ({ ...current, isActive: current.isActive === "true" ? "false" : "true" }))}
                aria-pressed={userModal.isActive === "true"}
                aria-label="Cambiar estado inicial del player"
              >
                <span className="switch-thumb" />
              </button>
              <strong>{userModal.isActive === "true" ? "Activo" : "Inactivo"}</strong>
            </div>
          </fieldset>
        </div>

        {(userModal.mode === "create" ? actionPermissions.createUsers : actionPermissions.editUsers) && supportsManagedPermissionOverrides(userModal.role) ? (
          <section className="user-modal-permissions">
            <div className="builder-section-head">
              <div>
                <h4>Permisos del men├║ lateral</h4>
                <p>Un ├║nico mapeo 1:1 con el men├║ lateral: secci├│n y pesta├▒as por cada ├írea o grupo.</p>
              </div>
              <span className="chip primary">{menuPermissionSections.length} secciones</span>
            </div>

            <div className="permissions-accordion-list user-modal-permission-list">
              {menuPermissionSections.map((section) => {
                const sectionPanelId = `area-${section.id}`;
                const isOpen = userModal.permissionPageId === sectionPanelId;
                const navEnabled = section.navVisibilityKind === "pages"
                  ? Boolean(userModal.permissionOverrides.pages?.[section.navVisibilityActionId])
                  : Boolean(userModal.permissionOverrides.actions?.[section.navVisibilityActionId]);
                const enabledTabCount = section.itemPermissions.filter((tab) => {
                  return tab.kind === "pages"
                    ? Boolean(userModal.permissionOverrides.pages?.[tab.id])
                    : Boolean(userModal.permissionOverrides.actions?.[tab.id]);
                }).length;
                return (
                  <article key={section.id} className={`permission-accordion-card ${isOpen ? "open" : ""}`}>
                    <button type="button" className="permission-accordion-toggle" onClick={() => toggleUserModalPermissionSection(sectionPanelId)}>
                      <div>
                        <strong>{section.label}</strong>
                        <span>{`${navEnabled ? "Acceso lateral activo" : "Acceso lateral bloqueado"} ┬À ${enabledTabCount}/${section.itemPermissions.length} pesta├▒as/items activos`}</span>
                      </div>
                      <span className="chip">{isOpen ? "Abierto" : "Abrir"}</span>
                    </button>

                    {isOpen ? (
                      <div className="permission-accordion-body user-modal-permission-body">
                        <div className="permission-switch-row permission-switch-row-primary permission-switch-row-toned" style={{ "--permission-accent": "#355f88", "--permission-soft": "rgba(15, 118, 110, 0.1)" }}>
                          <div>
                            <strong>Ver secci├│n lateral</strong>
                            <span>{canGrantManagedPermission(section.navVisibilityKind, section.navVisibilityActionId) ? `Permite mostrar ${section.label} en la barra lateral.` : "No puedes delegar esta secci├│n lateral porque t├║ no la tienes activa."}</span>
                          </div>
                          <button
                            type="button"
                            disabled={!canGrantManagedPermission(section.navVisibilityKind, section.navVisibilityActionId)}
                            className={`switch-button ${navEnabled ? "on" : ""}`}
                            onClick={() => toggleUserModalPermission(section.navVisibilityKind, section.navVisibilityActionId)}
                            aria-pressed={navEnabled}
                          >
                            <span className="switch-thumb" />
                          </button>
                        </div>

                        <div className="permission-group-stack">
                          <section className="permission-group-block">
                            <div className="permission-group-head" style={{ "--permission-group-accent": "#334155" }}>
                              <strong>Pesta├▒as del ├írea</strong>
                              <span>{section.itemPermissions.length} permiso(s)</span>
                            </div>
                            <div className="permission-switch-list permission-tab-grid">
                              {section.itemPermissions.map((tab) => {
                                const tabPanelId = `${section.id}::${tab.id}`;
                                const isTabExpanded = expandedPermissionTabs.includes(tabPanelId);
                                const enabled = tab.kind === "pages"
                                  ? Boolean(userModal.permissionOverrides.pages?.[tab.id])
                                  : Boolean(userModal.permissionOverrides.actions?.[tab.id]);
                                const delegable = canGrantManagedPermission(tab.kind, tab.id);
                                const nestedActions = tab.actionPermissions || [];
                                return (
                                  <div key={tab.id} className="permission-switch-row permission-switch-row-toned permission-tab-card" style={{ "--permission-accent": "#475569", "--permission-soft": "rgba(71, 85, 105, 0.1)" }}>
                                    <div className="permission-tab-header">
                                      <div className="permission-tab-copy">
                                        <strong>{tab.label}</strong>
                                        <span>{delegable ? "Habilita la pesta├▒a y sus acciones operativas dentro de esta ├írea." : "No delegable"}</span>
                                      </div>
                                      <div className="permission-tab-actions">
                                        {nestedActions.length ? (
                                          <button
                                            type="button"
                                            className={`permission-tab-collapse-toggle ${isTabExpanded ? "open" : ""}`}
                                            onClick={() => toggleUserModalPermissionTab(tabPanelId)}
                                            aria-expanded={isTabExpanded}
                                          >
                                            {isTabExpanded ? "Ocultar acciones" : `Ver acciones (${nestedActions.length})`}
                                          </button>
                                        ) : null}
                                        <button
                                          type="button"
                                          disabled={!delegable}
                                          className={`switch-button ${enabled ? "on" : ""}`}
                                          onClick={() => toggleUserModalPermission(tab.kind, tab.id)}
                                          aria-pressed={enabled}
                                        >
                                          <span className="switch-thumb" />
                                        </button>
                                      </div>
                                    </div>
                                    {(tab.subTabs || []).length && isTabExpanded ? (
                                      <div className="permission-subtab-registry" style={{ marginTop: "0.5rem", paddingLeft: "0.5rem", borderLeft: "2px solid rgba(71,85,105,0.2)" }}>
                                        {(tab.subTabs || []).map((sub) => (
                                          <div key={sub.id} style={{ marginBottom: "0.45rem" }}>
                                            <strong style={{ fontSize: "0.78rem" }}>{sub.label}</strong>
                                            <span className="subtle-line" style={{ display: "block", fontSize: "0.7rem" }}>
                                              Subpestaña · {(sub.actionPermissions || []).length} acción(es) vinculada(s)
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                    {nestedActions.length && isTabExpanded ? (
                                      <div className="permission-subaction-list">
                                        {nestedActions.map((actionItem) => {
                                          const actionEnabled = Boolean(userModal.permissionOverrides.actions?.[actionItem.id]);
                                          const actionDelegable = canGrantManagedPermission("actions", actionItem.id);
                                          return (
                                            <div key={actionItem.id} className="permission-switch-row permission-subaction-row" style={{ "--permission-accent": "#64748b", "--permission-soft": "rgba(100, 116, 139, 0.08)" }}>
                                              <div className="permission-subaction-copy">
                                                <strong>{actionItem.label}</strong>
                                                <span>{actionDelegable ? "Permiso puntual dentro de esta pesta├▒a." : "No delegable"}</span>
                                              </div>
                                              <button
                                                type="button"
                                                disabled={!actionDelegable}
                                                className={`switch-button ${actionEnabled ? "on" : ""}`}
                                                onClick={() => toggleUserModalPermission("actions", actionItem.id)}
                                                aria-pressed={actionEnabled}
                                              >
                                                <span className="switch-thumb" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {userModal.mode === "edit" && canResetOtherPasswords && userModal.id && userModal.id !== currentUser?.id ? (
          <div className="user-modal-inline-actions">
            <button
              type="button"
              className="user-row-button"
              onClick={() => {
                const targetUser = state.users.find((user) => user.id === userModal.id);
                if (targetUser) openResetUserPassword(targetUser);
              }}
              disabled={!actionPermissions.resetPasswords}
            >
              <RotateCcw size={15} /> Restablecer clave
            </button>
          </div>
        ) : null}

        {isRootLead && userModal.mode === "edit" && userModal.id === currentUser?.id ? (
          <section className="user-modal-demo-section">
            <div className="builder-section-head">
              <div>
                <h4>Modo Demo del sistema</h4>
                <p>Activa el modo demo para hacer demostraciones o pruebas. Cuando lo desactives, todos los cambios realizados durante la demo se revertir├ín autom├íticamente.</p>
              </div>
              {isDemoMode ? <span className="chip" style={{ background: "#fef3c7", color: "#92400e" }}>Activo</span> : <span className="chip">Inactivo</span>}
            </div>
            <div className="user-modal-demo-actions">
              {isDemoMode ? (
                <button type="button" className="user-row-button danger" onClick={deactivateDemoMode}>
                  <RotateCcw size={15} /> Desactivar y revertir cambios
                </button>
              ) : (
                <button type="button" className="user-row-button" onClick={activateDemoMode}>
                  ÔÜÖ Activar Modo Demo
                </button>
              )}
            </div>
          </section>
        ) : null}

        {shouldShowUserPermissionNote && (
          <article className="user-permission-note">
            <strong>{userModal.role === ROLE_SSR ? "Semi-Senior con alcance operativo" : "Acceso operativo por tablero"}</strong>
            <p>{userModal.role === ROLE_SSR ? "Semi-Senior solo puede crear perfiles Junior y trabajar con los tableros que tenga asignados." : "Junior solo accede a Mis tableros y ver├í ├║nicamente los tableros que tenga asignados."}</p>
          </article>
        )}
      </div>
    </Modal>

    {profileModalOpen ? <EmployeeProfileModal currentUser={currentUser} passwordForm={passwordForm} onPasswordChange={setPasswordForm} onSubmit={submitPasswordReset} onUpdateIdentity={updateCurrentUserIdentity} currentTheme={uiTheme} themeOptions={UI_THEME_OPTIONS} onThemeChange={setUiTheme} currentFont={uiFont} fontOptions={UI_FONT_OPTIONS} onFontChange={setUiFont} currentFontSize={uiFontSize} fontSizeOptions={UI_FONT_SIZE_OPTIONS} onFontSizeChange={setUiFontSize} onClose={() => { setProfileModalOpen(false); setPasswordForm({ password: "", confirmPassword: "", message: "" }); }} onLogout={() => { setProfileModalOpen(false); setPasswordForm({ password: "", confirmPassword: "", message: "" }); handleLogout(); }} /> : null}
    <Modal
      open={excelSheetSelector.open}
      title={`Hojas en "${excelSheetSelector.fileName}"`}
      confirmLabel="Importar hoja seleccionada"
      cancelLabel="Cancelar"
      onClose={() => setExcelSheetSelector({ open: false, sheets: [], fileName: "" })}
      onConfirm={() => {
        const checked = excelSheetSelector.sheets.filter((s) => s._selected);
        if (!checked.length) return;
        setExcelSheetSelector({ open: false, sheets: [], fileName: "" });
        checked.forEach((sheet) => applyImportedSheet(sheet));
      }}
    >
      <div className="modal-form-grid">
        <p className="modal-footnote">
          Este archivo tiene <strong>{excelSheetSelector.sheets.length} hojas</strong>. Selecciona las que quieres importar. Cada hoja seleccionada reemplazar├í los componentes actuales del tablero (la ├║ltima seleccionada quedar├í activa). Para crear tableros separados, importa una hoja a la vez.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {excelSheetSelector.sheets.map((sheet, idx) => (
            <button
              key={sheet.name}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                border: `2px solid ${sheet._selected ? "#314d69" : "#e5e7eb"}`,
                background: sheet._selected ? "#f2f6fb" : "#ffffff",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s",
              }}
              onClick={() => setExcelSheetSelector((current) => ({
                ...current,
                sheets: current.sheets.map((s, i) => i === idx ? { ...s, _selected: !s._selected } : s),
              }))}
            >
              <span style={{
                width: "20px", height: "20px", borderRadius: "4px", flexShrink: 0,
                border: `2px solid ${sheet._selected ? "#314d69" : "#d1d5db"}`,
                background: sheet._selected ? "#314d69" : "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {sheet._selected ? <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: 700 }}>Ô£ô</span> : null}
              </span>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>{sheet.name}</strong>
                <p style={{ margin: 0, fontSize: "0.77rem", color: "#6b7280" }}>
                  {sheet.columnCount} columnas ┬À {sheet.rowCount} filas de datos
                  {(sheet.supportedFormulaCount || 0) > 0 ? ` ┬À ${sheet.supportedFormulaCount} f├│rmula(s) detectada(s)` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>

    {isForcedPasswordChange ? <ForcedPasswordChangeModal passwordForm={passwordForm} onPasswordChange={setPasswordForm} onSubmit={submitPasswordReset} /> : null}

    <Modal
      open={resetUserPasswordModal.open}
      title="Restablecer contrase├▒a"
      confirmLabel="Guardar contrase├▒a temporal"
      cancelLabel="Cancelar"
      onClose={() => {
        setShowResetUserPassword(false);
        setResetUserPasswordModal({ open: false, userId: null, userName: "", password: "", message: "", submitting: false });
      }}
      onConfirm={submitUserPasswordReset}
      confirmDisabled={resetUserPasswordModal.submitting}
    >
      <div className="modal-form-grid">
        <p className="modal-footnote">La sesi├│n activa de {resetUserPasswordModal.userName || "este player"} se cerrar├í y en su siguiente acceso deber├í capturar una contrase├▒a nueva.</p>
        <label className="app-modal-field">
          <span>Contrase├▒a temporal</span>
          <div className="password-visibility-field">
            <input
              type={showResetUserPassword ? "text" : "password"}
              value={resetUserPasswordModal.password}
              onChange={(event) => setResetUserPasswordModal((current) => ({ ...current, password: event.target.value, message: "" }))}
            />
            <button
              type="button"
              className="password-visibility-toggle"
              aria-label={showResetUserPassword ? "Ocultar contrase├▒a" : "Mostrar contrase├▒a"}
              onClick={() => setShowResetUserPassword((current) => !current)}
            >
              {showResetUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {resetUserPasswordModal.message ? <p className="validation-text">{resetUserPasswordModal.message}</p> : null}
        <p className="modal-footnote">Solo Lead y Senior pueden restablecer la contrase├▒a de otros players. La contrase├▒a temporal puede tener desde {TEMPORARY_PASSWORD_MIN_LENGTH} caracteres.</p>
      </div>
    </Modal>
    <Modal open={Boolean(deleteUserId)} title="Eliminar player" confirmLabel="Eliminar player" cancelLabel="Cancelar" onClose={() => setDeleteUserId(null)} onConfirm={() => deleteUser(deleteUserId)}>
      <p>Esta acci├│n no se puede deshacer.</p>
      <p>Se perder├í el acceso y los registros del player quedar├ín sin responsabilidad asignada.</p>
    </Modal>

    <Modal open={Boolean(transferLeadTargetId)} title="Transferir rol de Lead" confirmLabel="Transferir Lead" cancelLabel="Cancelar" onClose={() => setTransferLeadTargetId(null)} onConfirm={() => transferLead(transferLeadTargetId)}>
      <p>El player <strong>{state.users?.find((u) => u.id === transferLeadTargetId)?.name || ""}</strong> pasar├í a ser Lead.</p>
      <p>Tu cuenta quedar├í como Senior. Esta acci├│n no se puede deshacer desde aqu├¡.</p>
    </Modal>
    </>

    </>
  );
}
