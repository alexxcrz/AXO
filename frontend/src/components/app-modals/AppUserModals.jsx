/* eslint-disable no-unused-vars -- props desde App.jsx */
import { Eye, EyeOff } from "lucide-react";
import { Modal } from "../Modal";
import {
  EmployeeProfileModal,
  ForcedPasswordChangeModal,
} from "../PerfilEmpleado";
import { TEMPORARY_PASSWORD_MIN_LENGTH } from "../../utils/constantes.js";

/** Modales extra�dos de App.jsx � AppUserModals */
export function AppUserModals(props) {
  const {
    profileModalOpen,
    setProfileModalOpen,
    currentUser,
    passwordForm,
    setPasswordForm,
    submitPasswordReset,
    updateCurrentUserIdentity,
    uiTheme,
    UI_THEME_OPTIONS,
    setUiTheme,
    uiFont,
    UI_FONT_OPTIONS,
    setUiFont,
    uiFontSize,
    UI_FONT_SIZE_OPTIONS,
    setUiFontSize,
    handleLogout,
    excelSheetSelector,
    setExcelSheetSelector,
    applyImportedSheet,
    isForcedPasswordChange,
    resetUserPasswordModal,
    setResetUserPasswordModal,
    showResetUserPassword,
    setShowResetUserPassword,
    submitUserPasswordReset,
    deleteUserId,
    setDeleteUserId,
    deleteUser,
    transferLeadTargetId,
    setTransferLeadTargetId,
    transferLead,
    state,
  } = props;

  return (
    <>
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
          Este archivo tiene <strong>{excelSheetSelector.sheets.length} hojas</strong>. Selecciona las que quieres importar. Cada hoja seleccionada reemplazará los componentes actuales del tablero (la última seleccionada quedará activa). Para crear tableros separados, importa una hoja a la vez.
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
                  {sheet.columnCount} columnas · {sheet.rowCount} filas de datos
                  {(sheet.supportedFormulaCount || 0) > 0 ? ` · ${sheet.supportedFormulaCount} fórmula(s) detectada(s)` : ""}
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
      title="Restablecer contraseña"
      confirmLabel="Guardar contraseña temporal"
      cancelLabel="Cancelar"
      onClose={() => {
        setShowResetUserPassword(false);
        setResetUserPasswordModal({ open: false, userId: null, userName: "", password: "", message: "", submitting: false });
      }}
      onConfirm={submitUserPasswordReset}
      confirmDisabled={resetUserPasswordModal.submitting}
    >
      <div className="modal-form-grid">
        <p className="modal-footnote">La sesión activa de {resetUserPasswordModal.userName || "este player"} se cerrará y en su siguiente acceso deberá capturar una contraseña nueva.</p>
        <label className="app-modal-field">
          <span>Contraseña temporal</span>
          <div className="password-visibility-field">
            <input
              type={showResetUserPassword ? "text" : "password"}
              value={resetUserPasswordModal.password}
              onChange={(event) => setResetUserPasswordModal((current) => ({ ...current, password: event.target.value, message: "" }))}
            />
            <button
              type="button"
              className="password-visibility-toggle"
              aria-label={showResetUserPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowResetUserPassword((current) => !current)}
            >
              {showResetUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {resetUserPasswordModal.message ? <p className="validation-text">{resetUserPasswordModal.message}</p> : null}
        <p className="modal-footnote">Solo Lead y Senior pueden restablecer la contraseña de otros players. La contraseña temporal puede tener desde {TEMPORARY_PASSWORD_MIN_LENGTH} caracteres.</p>
      </div>
    </Modal>
    <Modal open={Boolean(deleteUserId)} title="Eliminar player" confirmLabel="Eliminar player" cancelLabel="Cancelar" onClose={() => setDeleteUserId(null)} onConfirm={() => deleteUser(deleteUserId)}>
      <p>Esta acción no se puede deshacer.</p>
      <p>Se perderá el acceso y los registros del player quedarán sin responsabilidad asignada.</p>
    </Modal>

    <Modal open={Boolean(transferLeadTargetId)} title="Transferir rol de Lead" confirmLabel="Transferir Lead" cancelLabel="Cancelar" onClose={() => setTransferLeadTargetId(null)} onConfirm={() => transferLead(transferLeadTargetId)}>
      <p>El player <strong>{state.users?.find((u) => u.id === transferLeadTargetId)?.name || ""}</strong> pasará a ser Lead.</p>
      <p>Tu cuenta quedará como Senior. Esta acción no se puede deshacer desde aquí.</p>
    </Modal>
    </>
  );
}
