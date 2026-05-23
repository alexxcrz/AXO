// ── Perfil de Empleado ───────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Modal } from "./Modal";
import { SpanishDateInput } from "./SpanishDateInput";
import { uploadFileToCloudinary } from "../services/upload.service";
import { getThemePreview, groupThemesByKind, getFontFamilyStack, getFontOptionById, ensureUiWebFontLoaded } from "../app/uiPreferencesConfig.js";

// ── Constantes y utilidades ───────────────────────────────────────────────────

const PROFILE_SELF_EDIT_LIMIT = 1;

const ROLE_LEAD = "Lead";
const ROLE_SR   = "Senior (Sr)";
const ROLE_SSR  = "Semi-Senior (Ssr)";
const ROLE_JR   = "Junior (Jr)";

const ROLE_LEVEL = {
  [ROLE_JR]:  1,
  [ROLE_SSR]: 2,
  [ROLE_SR]:  3,
  [ROLE_LEAD]: 4,
};

const DEFAULT_JOB_TITLE_BY_ROLE = {
  [ROLE_LEAD]: "Líder de Operaciones",
  [ROLE_SR]:   "Senior de Operaciones",
  [ROLE_SSR]:  "Operador Semi-Senior",
  [ROLE_JR]:   "Operador Junior",
};

const ROLE_COLORS = {
  [ROLE_LEAD]: { bg: "#314d69", color: "#ffffff" },
  [ROLE_SR]:   { bg: "#4a6987", color: "#ffffff" },
  [ROLE_SSR]:  { bg: "#264c6e", color: "#ffffff" },
  [ROLE_JR]:   { bg: "#e8eef6", color: "#314d69" },
};

function normalizeKeyLocal(value) {
  return (value || "").normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function normalizeRole(role) {
  const key = normalizeKeyLocal(role);
  if (key.includes("lead") || key.includes("maestro")) return ROLE_LEAD;
  if (key.includes("semi") || key.includes("ssr"))     return ROLE_SSR;
  if (key.includes("senior") || key.includes("administrador")) return ROLE_SR;
  return ROLE_JR;
}

// eslint-disable-next-line react-refresh/only-export-components
export function getUserArea(user) {
  return String(user?.area || user?.department || "").trim();
}

// eslint-disable-next-line react-refresh/only-export-components
export function getUserJobTitle(user) {
  return String(user?.jobTitle || DEFAULT_JOB_TITLE_BY_ROLE[user?.role] || "").trim();
}

function canBypassSelfProfileEditLimit(user) {
  return (ROLE_LEVEL[normalizeRole(user?.role)] || 0) >= ROLE_LEVEL[ROLE_SR];
}

function getInitialsAvatar(name) {
  const parts = (name || "?").trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0][0] || "?").toUpperCase();
  return initials;
}

// ── Exports mantenidos por compatibilidad con App.jsx ─────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function createIdentityFormFromUser(currentUser) {
  return {
    name:             currentUser?.name     || "",
    email:            currentUser?.email    || "",
    area:             getUserArea(currentUser),
    jobTitle:         getUserJobTitle(currentUser),
    telefono:         currentUser?.telefono         || "",
    telefono_visible: currentUser?.telefono_visible ?? false,
    birthday:         currentUser?.birthday         || "",
    correoElectronico: currentUser?.correoElectronico || "",
    fechaIngreso:     currentUser?.fechaIngreso     || "",
    photo:            currentUser?.photo            || "",
    photoThumbnailUrl: currentUser?.photoThumbnailUrl || "",
  };
}

// Stubs mantenidos para no romper imports en App.jsx
export function EmployeeProfileSummarySection() { return null; }
export function EmployeeProfileDetailsSection()  { return null; }
export function EmployeeProfilePasswordSection() { return null; }
export function EmployeeProfileMessages()        { return null; }

// ── Componente interno: campo de información ──────────────────────────────────

function InfoField({ label, value, placeholder = "No definido", wide, children }) {
  return (
    <div className={`ep-field${wide ? " ep-field--wide" : ""}`}>
      <span className="ep-field__label">{label}</span>
      {children || <strong className="ep-field__value">{value || <span className="ep-field__empty">{placeholder}</span>}</strong>}
    </div>
  );
}

function ThemePickerCard({ theme, active, onSelect }) {
  const preview = getThemePreview(theme);
  const bannerStyle = preview.isGradient
    ? { background: preview.previewBackground }
    : { background: `linear-gradient(135deg, ${preview.shell} 0%, ${preview.primary} 55%, ${preview.accent} 100%)` };

  return (
    <button
      type="button"
      className={`ep-theme-card ep-theme-card--visual${active ? " ep-theme-card--active" : ""}${preview.isGradient ? " ep-theme-card--gradient" : ""}`}
      onClick={() => onSelect?.(theme.id)}
      aria-pressed={active}
    >
      <span className="ep-theme-card__banner" style={bannerStyle} aria-hidden="true">
        {preview.isGradient ? (
          <span className="ep-theme-card__badge">Degradado</span>
        ) : (
          <span className="ep-theme-card__bands">
            <span style={{ background: preview.shell }} title={preview.shell} />
            <span style={{ background: preview.primary }} title={preview.primary} />
            <span style={{ background: preview.accent }} title={preview.accent} />
          </span>
        )}
      </span>
      <span className="ep-theme-card__copy">
        <strong>{theme.label}</strong>
        <small>{preview.isGradient ? "Gradiente" : `${preview.shell} · ${preview.primary}`}</small>
      </span>
    </button>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

export function EmployeeProfileModal({
  currentUser,
  passwordForm,
  onPasswordChange,
  onSubmit,
  onClose,
  onLogout,
  onUpdateIdentity,
  currentTheme,
  themeOptions = [],
  onThemeChange,
  currentFont,
  fontOptions = [],
  onFontChange,
  currentFontSize,
  fontSizeOptions = [],
  onFontSizeChange,
}) {
  const THEME_FALLBACK = {
    "copmec-bosque": { primary: "#385878", shell: "#22384f" },
    "copmec-arenisca": { primary: "#6a5a3f", shell: "#3f3526" },
    "copmec-noche": { primary: "#2f3642", shell: "#1f242d" },
    "copmec-oceano": { primary: "#0f4c5c", shell: "#083742" },
    "copmec-cobre": { primary: "#8a4f2d", shell: "#5e341c" },
    "copmec-vino": { primary: "#7d2245", shell: "#551731" },
    "copmec-ceniza": { primary: "#3f4654", shell: "#2b303b" },
    "copmec-indigo": { primary: "#2f3f87", shell: "#202c5f" },
    "copmec-oliva": { primary: "#314658", shell: "#212f3c" },
    "copmec-coral": { primary: "#b44b46", shell: "#7f2f2b" },
    "copmec-menta": { primary: "#36546f", shell: "#263b4d" },
    "copmec-solar": { primary: "#b37a18", shell: "#7e5411" },
    "copmec-ciruela": { primary: "#6b2f6f", shell: "#48204b" },
    "copmec-petroleo": { primary: "#245964", shell: "#173b42" },
    "copmec-aurora": { primary: "#2c7a7b", shell: "#553c9a" },
    "copmec-atardecer": { primary: "#f97316", shell: "#be185d" },
    "copmec-laguna": { primary: "#0ea5e9", shell: "#405db0" },
    "copmec-flama": { primary: "#f59e0b", shell: "#ef4444" },
    "copmec-neon": { primary: "#5f8fbe", shell: "#0ea5e9" },
    "copmec-berry": { primary: "#e11d48", shell: "#7c3aed" },
  };
  const [isEditMode, setIsEditMode]   = useState(false);
  const [activeTab, setActiveTab]     = useState("perfil");
  const [personalTab, setPersonalTab] = useState("colores");
  const [hoveredFontId, setHoveredFontId] = useState(null);
  const [form, setForm]               = useState(() => createIdentityFormFromUser(currentUser));
  const [message, setMessage]         = useState("");
  const [pwOpen, setPwOpen]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const fileInputRef = useRef(null);

  const canBypass      = canBypassSelfProfileEditLimit(currentUser);
  const selfEditCount  = Number(currentUser?.selfIdentityEditCount ?? 0);
  const canEdit        = canBypass || selfEditCount < PROFILE_SELF_EDIT_LIMIT;
  const roleStyle      = ROLE_COLORS[normalizeRole(currentUser?.role)] || ROLE_COLORS[ROLE_JR];
  const avatarUrl      = String((form.photoThumbnailUrl || form.photo || currentUser?.photoThumbnailUrl || currentUser?.photo) || "").trim();
  const initials       = getInitialsAvatar(currentUser?.name);

  useEffect(() => {
    setForm(createIdentityFormFromUser(currentUser));
    setMessage("");
    setPhotoMessage("");
    setIsEditMode(false);
    setActiveTab("perfil");
    setPersonalTab("colores");
  }, [currentUser?.id]);

  function field(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage("");
    if (key === "photo" || key === "photoThumbnailUrl") {
      setPhotoMessage("");
    }
  }

  async function handlePhotoSelection(event) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setPhotoMessage("Solo puedes subir imagenes para la foto de perfil.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 6 * 1024 * 1024) {
      setPhotoMessage("La imagen debe ser menor a 6 MB.");
      event.target.value = "";
      return;
    }

    setUploadingPhoto(true);
    setPhotoMessage("Subiendo foto...");

    try {
      const uploaded = await uploadFileToCloudinary(selectedFile);
      const nextPhoto = String(uploaded?.url || "").trim();
      const nextThumb = String(uploaded?.thumbnailUrl || uploaded?.url || "").trim();
      if (!nextPhoto) {
        throw new Error("No se recibio URL de la imagen subida.");
      }
      field("photo", nextPhoto);
      field("photoThumbnailUrl", nextThumb || nextPhoto);
      setPhotoMessage("Foto cargada correctamente.");
    } catch (error) {
      setPhotoMessage(error?.message || "No fue posible subir la foto.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  }

  function startEdit() {
    if (!canEdit) {
      setMessage("La autoedición ya fue utilizada. Pide apoyo a un Senior o Lead.");
      return;
    }
    setForm(createIdentityFormFromUser(currentUser));
    setIsEditMode(true);
    setMessage("");
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim() || !form.area.trim() || !form.jobTitle.trim()) {
      setMessage("Nombre, acceso, área y cargo son obligatorios.");
      return;
    }
    const correo = form.correoElectronico.trim();
    if (correo && !correo.includes("@")) {
      setMessage("El correo electrónico debe incluir @ (ejemplo: nombre@empresa.com).");
      return;
    }
    setSaving(true);
    const result = await onUpdateIdentity({
      name:             form.name.trim(),
      username:         form.email.trim(),
      area:             form.area.trim(),
      jobTitle:         form.jobTitle.trim(),
      telefono:         form.telefono.trim(),
      telefono_visible: form.telefono_visible,
      birthday:         form.birthday.trim(),
      correoElectronico: correo,
      fechaIngreso:     form.fechaIngreso.trim(),
      photo:            form.photo,
      photoThumbnailUrl: form.photoThumbnailUrl,
    });
    setSaving(false);
    setMessage(result?.message || "");
    if (result?.ok) setIsEditMode(false);
  }

  const selectedThemeOption = themeOptions.find((theme) => theme.id === (currentTheme || "copmec-bosque"));
  const selectedThemePreview = selectedThemeOption || { id: "copmec-bosque", label: "Bosque COPMEC", ...THEME_FALLBACK["copmec-bosque"] };
  const selectedThemeColors = getThemePreview(selectedThemePreview);
  const selectedThemePrimary = selectedThemeColors.primary;
  const selectedThemeShell = selectedThemeColors.shell;
  const selectedThemeAccent = selectedThemeColors.accent;
  const selectedThemeHeaderBackground = selectedThemeColors.previewBackground
    || `linear-gradient(135deg, ${selectedThemeShell} 0%, ${selectedThemePrimary} 55%, ${selectedThemeAccent} 100%)`;
  const themesByKind = useMemo(() => groupThemesByKind(themeOptions), [themeOptions]);
  const normalizedThemeId = String(currentTheme || "copmec-bosque").trim() || "copmec-bosque";
  const normalizedFontId = String(currentFont || "bahnschrift").trim() || "bahnschrift";
  const previewFontId = hoveredFontId || normalizedFontId;
  const previewFontOption = getFontOptionById(previewFontId, fontOptions);
  const selectedFontFamily = getFontFamilyStack(normalizedFontId, fontOptions);
  const previewFontFamily = getFontFamilyStack(previewFontId, fontOptions);
  const isFontPreviewPending = Boolean(hoveredFontId && hoveredFontId !== normalizedFontId);
  const normalizedFontSizeId = String(currentFontSize || "normal").trim() || "normal";
  const selectedFontSizeOption = fontSizeOptions.find((size) => size.id === normalizedFontSizeId) || { id: "normal", label: "Normal", scale: 1 };
  const profileThemeVars = {
    "--ep-primary": selectedThemePrimary,
    "--ep-shell": selectedThemeShell,
    "--ep-primary-soft": `${selectedThemePrimary}22`,
    "--ep-primary-strong": `${selectedThemePrimary}3d`,
    "--ep-font-family": selectedFontFamily,
    "--ep-font-scale": String(selectedFontSizeOption.scale || 1),
  };

  return (
    <>
      <Modal
      open
      className="ep-modal"
      title=""
      confirmLabel="Cerrar"
      hideCancel
      onClose={onClose}
      footerActions={isEditMode
        ? [
            <button key="save"   type="button" className="ep-btn ep-btn--primary" onClick={save} disabled={saving || uploadingPhoto}>{saving ? "Guardando…" : uploadingPhoto ? "Espera carga" : "Guardar cambios"}</button>,
            <button key="cancel" type="button" className="ep-btn ep-btn--ghost"   onClick={() => { setIsEditMode(false); setMessage(""); }}>Cancelar</button>,
            <button key="out"    type="button" className="ep-btn ep-btn--danger"  onClick={onLogout}>Cerrar sesión</button>,
          ]
        : [
            <button key="edit"   type="button" className="ep-btn ep-btn--primary" onClick={startEdit}>Editar perfil</button>,
            <button key="out"    type="button" className="ep-btn ep-btn--danger"  onClick={onLogout}>Cerrar sesión</button>,
          ]
      }
    >
      <div className="ep-body ep-theme-scope" data-ui-theme={normalizedThemeId} data-ui-font={normalizedFontId} data-ui-font-size={normalizedFontSizeId} style={profileThemeVars}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div className="ep-hero ui-surface-dark">
          <div className="ep-hero__avatar">
            {avatarUrl ? <img src={avatarUrl} alt={`Avatar de ${currentUser.name}`} className="ep-hero__avatar-image" /> : initials}
          </div>
          <div className="ep-hero__info">
            <div className="ep-hero__name">{currentUser.name}</div>
            <div className="ep-hero__meta">
              <span className="ep-hero__nick">@{currentUser.email}</span>
              <span className="ep-role-chip" style={{ background: roleStyle.bg, color: roleStyle.color }}>
                {currentUser.role}
              </span>
              <span className={`ep-status-dot ${currentUser.isActive ? "ep-status-dot--active" : "ep-status-dot--inactive"}`} />
              <span className="ep-hero__status">{currentUser.isActive ? "Activo" : "Inactivo"}</span>
            </div>
            {isEditMode ? (
              <div className="ep-avatar-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="ep-hidden-file-input"
                  onChange={handlePhotoSelection}
                />
                <button type="button" className="ep-btn ep-btn--ghost" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
                  {uploadingPhoto ? "Subiendo..." : "Subir foto"}
                </button>
                {form.photo ? (
                  <button
                    type="button"
                    className="ep-btn ep-btn--ghost"
                    onClick={() => {
                      field("photo", "");
                      field("photoThumbnailUrl", "");
                      setPhotoMessage("Foto eliminada del perfil.");
                    }}
                    disabled={uploadingPhoto}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            ) : null}
            {!isEditMode && (
              <div className="ep-hero__job">{getUserJobTitle(currentUser) || "Sin cargo asignado"} · {getUserArea(currentUser) || "Sin área"}</div>
            )}
            {photoMessage ? <p className="ep-hero__photo-msg">{photoMessage}</p> : null}
          </div>
        </div>

        <div className="ep-tabs" role="tablist" aria-label="Secciones del perfil">
          <button
            type="button"
            className={`ep-tab-btn${activeTab === "perfil" ? " ep-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("perfil")}
            role="tab"
            aria-selected={activeTab === "perfil"}
          >
            Perfil
          </button>
          <button
            type="button"
            className={`ep-tab-btn${activeTab === "personalizacion" ? " ep-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("personalizacion")}
            role="tab"
            aria-selected={activeTab === "personalizacion"}
          >
            Personalización
          </button>
        </div>

        {activeTab === "perfil" ? (
          <>
        {/* ── IDENTIDAD ────────────────────────────────────────────────────── */}
        <div className="ep-section">
          <div className="ep-section__title">Identidad</div>
          <div className="ep-grid ep-grid--2">
            {isEditMode ? (
              <>
                <div className="ep-field">
                  <label className="ep-field__label">Nombre completo</label>
                  <input className="ep-input" value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="Nombre del player" />
                </div>
                <div className="ep-field">
                  <label className="ep-field__label">Player de acceso</label>
                  <input className="ep-input" value={form.email} onChange={(e) => field("email", e.target.value)} placeholder="Tu acceso" />
                </div>
              </>
            ) : (
              <>
                <InfoField label="Nombre completo" value={currentUser.name} />
                <InfoField label="Player de acceso" value={currentUser.email} />
              </>
            )}
          </div>
        </div>

        {/* ── ORGANIZACIÓN ─────────────────────────────────────────────────── */}
        <div className="ep-section">
          <div className="ep-section__title">Organización</div>
          <div className="ep-grid ep-grid--2">
            {isEditMode ? (
              <>
                <div className="ep-field">
                  <label className="ep-field__label">Cargo</label>
                  <input className="ep-input" value={form.jobTitle} onChange={(e) => field("jobTitle", e.target.value)} placeholder="Ej: Encargado de Mejora Continua" />
                </div>
                <div className="ep-field">
                  <label className="ep-field__label">Área</label>
                  <input className="ep-input" value={form.area} onChange={(e) => field("area", e.target.value)} placeholder="Ej: Mejora Continua" />
                </div>
                <InfoField label="Nivel interno" value={currentUser.role} />
              </>
            ) : (
              <>
                <InfoField label="Cargo" value={getUserJobTitle(currentUser)} />
                <InfoField label="Área" value={getUserArea(currentUser)} />
                <InfoField label="Nivel interno" value={currentUser.role} />
              </>
            )}
          </div>
        </div>

        {/* ── CONTACTO Y PERSONAL ──────────────────────────────────────────── */}
        <div className="ep-section">
          <div className="ep-section__title">Contacto y personal</div>
          <div className="ep-grid ep-grid--2">
            {isEditMode ? (
              <>
                <div className="ep-field">
                  <label className="ep-field__label">Teléfono</label>
                  <input className="ep-input" value={form.telefono} onChange={(e) => field("telefono", e.target.value)} placeholder="+52 664 123 4567" />
                </div>
                <div className="ep-field">
                  <label className="ep-field__label">Cumpleaños</label>
                  <SpanishDateInput
                    className="ep-input-date"
                    value={form.birthday}
                    onChange={(e) => field("birthday", e.target.value)}
                    placeholder="Seleccionar cumpleaños"
                  />
                </div>
                <div className="ep-field">
                  <label className="ep-field__label">Correo electrónico</label>
                  <input className="ep-input" type="email" value={form.correoElectronico} onChange={(e) => field("correoElectronico", e.target.value)} placeholder="nombre@empresa.com" />
                </div>
                <div className="ep-field">
                  <label className="ep-field__label">Fecha de ingreso</label>
                  <SpanishDateInput
                    className="ep-input-date"
                    value={form.fechaIngreso}
                    onChange={(e) => field("fechaIngreso", e.target.value)}
                    placeholder="Seleccionar fecha de ingreso"
                  />
                </div>
              </>
            ) : (
              <>
                <InfoField
                  label={`Teléfono${currentUser.telefono ? (currentUser.telefono_visible ? " · visible" : " · oculto") : ""}`}
                  value={currentUser.telefono}
                  placeholder="No definido"
                />
                <InfoField label="Cumpleaños" value={currentUser.birthday} placeholder="No definido" />
                <InfoField label="Correo electrónico" value={currentUser.correoElectronico} placeholder="No definido" />
                <InfoField label="Fecha de ingreso" value={currentUser.fechaIngreso} placeholder="No definido" />
              </>
            )}
          </div>
        </div>

        <div className="ep-section">
          <div className="ep-grid ep-grid--2 ep-grid--actions">
            {isEditMode ? (
              <div className="ep-field ep-field--switch">
                <span className="ep-field__label">Teléfono en chat</span>
                <label className="ep-switch" htmlFor="ep-tel-visible">
                  <input
                    id="ep-tel-visible"
                    type="checkbox"
                    className="ep-switch__input"
                    checked={form.telefono_visible}
                    onChange={(e) => field("telefono_visible", e.target.checked)}
                  />
                  <span className="ep-switch__track" aria-hidden="true">
                    <span className="ep-switch__thumb" />
                  </span>
                  <span className="ep-switch__text">
                    {form.telefono_visible ? "Visible en el perfil" : "Oculto en el perfil"}
                  </span>
                </label>
              </div>
            ) : (
              <InfoField
                label="Teléfono en chat"
                value={currentUser.telefono_visible ? "Visible en el perfil" : "Oculto en el perfil"}
              />
            )}
            <button type="button" className="ep-pw-toggle" onClick={() => setPwOpen((v) => !v)}>
              <span>Contraseña</span>
              <span className="ep-pw-toggle__arrow" style={{ transform: pwOpen ? "rotate(180deg)" : "none" }}>▾</span>
            </button>
          </div>
          {pwOpen && (
            <div className="ep-pw-body">
              <div className="ep-grid ep-grid--2">
                <div className="ep-field">
                  <label className="ep-field__label">Nueva contraseña</label>
                  <div className="password-visibility-field">
                    <input className="ep-input" type={showPassword ? "text" : "password"} value={passwordForm.password} onChange={(e) => onPasswordChange((c) => ({ ...c, password: e.target.value, message: "" }))} />
                    <button
                      type="button"
                      className="password-visibility-toggle"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="ep-field">
                  <label className="ep-field__label">Confirmar contraseña</label>
                  <div className="password-visibility-field">
                    <input className="ep-input" type={showConfirmPassword ? "text" : "password"} value={passwordForm.confirmPassword} onChange={(e) => onPasswordChange((c) => ({ ...c, confirmPassword: e.target.value, message: "" }))} />
                    <button
                      type="button"
                      className="password-visibility-toggle"
                      aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowConfirmPassword((current) => !current)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" className="ep-btn ep-btn--primary ep-pw-save" onClick={onSubmit}>Guardar contraseña</button>
              {passwordForm.message && <p className="ep-msg">{passwordForm.message}</p>}
            </div>
          )}
        </div>

          </>
        ) : null}

        {activeTab === "personalizacion" ? (
          <>
            <div className="ep-section">
              <div className="ep-section__title">Vista previa</div>
              <div className="ep-personal-preview" style={{ borderColor: `${selectedThemePrimary}33` }}>
                <div className="ep-personal-preview__header ui-surface-dark" style={{ background: selectedThemeHeaderBackground, color: "#ffffff" }}>
                  <span className="ep-personal-preview__header-label" style={{ color: "#ffffff" }}>
                    {personalTab === "fuentes" ? (isFontPreviewPending ? "Vista previa (al pasar el cursor)" : "Fuente actual") : "Tema actual"}
                  </span>
                </div>
                <div
                  className={`ep-personal-preview__body${personalTab === "fuentes" ? " ep-personal-preview__font-live" : ""}`}
                  style={personalTab === "fuentes" ? { "--ep-preview-font-family": previewFontFamily } : undefined}
                >
                  {personalTab === "fuentes" ? (
                    <>
                      <span className="ep-personal-preview__font-name">{previewFontOption.label}</span>
                      <div
                        className="ep-personal-preview__line"
                        data-font-preview
                        style={{
                          "--font-preview-stack": previewFontFamily,
                          fontFamily: previewFontFamily,
                          fontSize: `${1.05 * Number(selectedFontSizeOption.scale || 1)}rem`,
                        }}
                      >
                        ABC abc 123 — Texto de ejemplo antes de aplicar
                      </div>
                      {isFontPreviewPending ? (
                        <span className="ep-personal-preview__font-hint">Pasa el cursor sobre una fuente o haz clic para aplicarla.</span>
                      ) : null}
                    </>
                  ) : (
                    <div className="ep-personal-preview__line" style={{ fontSize: `${0.84 * Number(selectedFontSizeOption.scale || 1)}rem` }}>
                      Texto de ejemplo con el tema seleccionado
                    </div>
                  )}
                  <div className="ep-personal-preview__chips">
                    <span className="ep-personal-chip" style={{ background: selectedThemePrimary, color: "#ffffff" }}>Principal {selectedThemePrimary}</span>
                    <span className="ep-personal-chip" style={{ background: selectedThemeShell, color: "#ffffff" }}>Base {selectedThemeShell}</span>
                    {selectedThemeColors.isGradient ? (
                      <span className="ep-personal-chip ep-personal-chip--muted">Degradado</span>
                    ) : (
                      <span className="ep-personal-chip" style={{ background: selectedThemeAccent, color: "#ffffff" }}>Acento {selectedThemeAccent}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="ep-personal-subtabs" role="tablist" aria-label="Subsecciones de personalización">
              <button
                type="button"
                className={`ep-personal-subtab${personalTab === "colores" ? " ep-personal-subtab--active" : ""}`}
                onClick={() => setPersonalTab("colores")}
                role="tab"
                aria-selected={personalTab === "colores"}
              >
                Colores
              </button>
              <button
                type="button"
                className={`ep-personal-subtab${personalTab === "fuentes" ? " ep-personal-subtab--active" : ""}`}
                onClick={() => setPersonalTab("fuentes")}
                role="tab"
                aria-selected={personalTab === "fuentes"}
              >
                Fuentes
              </button>
            </div>

            {personalTab === "colores" ? (
              <>
                <div className="ep-section">
                  <div className="ep-section__title">Colores sólidos ({themesByKind.solid.length})</div>
                  <div className="ep-theme-grid ep-theme-grid--visual">
                    {themesByKind.solid.map((theme) => (
                      <ThemePickerCard
                        key={theme.id}
                        theme={theme}
                        active={(currentTheme || "copmec-bosque") === theme.id}
                        onSelect={onThemeChange}
                      />
                    ))}
                  </div>
                </div>
                <div className="ep-section">
                  <div className="ep-section__title">Degradados ({themesByKind.gradient.length})</div>
                  <div className="ep-theme-grid ep-theme-grid--visual">
                    {themesByKind.gradient.map((theme) => (
                      <ThemePickerCard
                        key={theme.id}
                        theme={theme}
                        active={(currentTheme || "copmec-bosque") === theme.id}
                        onSelect={onThemeChange}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {personalTab === "fuentes" ? (
              <div className="ep-section">
                <div className="ep-section__title">Tipografías ({fontOptions.length})</div>
                <div className="ep-section__title">Tamaño de texto ({fontSizeOptions.length})</div>
                <div className="ep-font-size-grid">
                  {fontSizeOptions.map((sizeOption) => {
                    const active = normalizedFontSizeId === sizeOption.id;
                    return (
                      <button
                        key={sizeOption.id}
                        type="button"
                        className={`ep-font-size-card${active ? " ep-font-size-card--active" : ""}`}
                        onClick={() => onFontSizeChange?.(sizeOption.id)}
                      >
                        <span className="ep-font-size-card__name">{sizeOption.label}</span>
                        <span className="ep-font-size-card__sample" style={{ fontSize: `${0.92 * Number(sizeOption.scale || 1)}rem` }}>
                          Aa 123
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="ep-font-picker-zone" onMouseLeave={() => setHoveredFontId(null)}>
                  <div className="ep-font-grid">
                    {fontOptions.map((font) => {
                      const previewFamily = getFontFamilyStack(font.id, fontOptions);
                      const active = normalizedFontId === font.id;
                      const isHovered = hoveredFontId === font.id;
                      const previewStyle = { "--font-preview-stack": previewFamily, fontFamily: previewFamily };
                      return (
                        <button
                          key={font.id}
                          type="button"
                          className={`ep-font-card${active ? " ep-font-card--active" : ""}${isHovered ? " ep-font-card--hover" : ""}`}
                          onMouseEnter={() => {
                            setHoveredFontId(font.id);
                            void ensureUiWebFontLoaded(font.id);
                          }}
                          onFocus={() => setHoveredFontId(font.id)}
                          onBlur={() => setHoveredFontId((current) => (current === font.id ? null : current))}
                          onClick={() => {
                            setHoveredFontId(null);
                            onFontChange?.(font.id);
                          }}
                        >
                          <span
                            className="ep-font-card__name ep-font-card__preview-text"
                            data-font-preview
                            style={previewStyle}
                          >
                            {font.label}
                          </span>
                          {font.webGoogle && font.webGoogle !== font.label ? (
                            <span className="ep-font-card__hint">Web: {font.webGoogle}</span>
                          ) : null}
                          <span
                            className="ep-font-card__sample ep-font-card__preview-text"
                            data-font-preview
                            style={previewStyle}
                          >
                            ABC abc 123
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {/* ── MENSAJES ─────────────────────────────────────────────────────── */}
        {message && (
          <p className={`ep-msg${message.toLowerCase().includes("actualizados") || message.toLowerCase().includes("ok") ? " ep-msg--ok" : ""}`}>
            {message}
          </p>
        )}

      </div>
      </Modal>
    </>
  );
}

export function ForcedPasswordChangeModal({ passwordForm, onPasswordChange, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Modal
      open
      title="Actualiza tu contraseña temporal"
      confirmLabel="Guardar mi nueva contraseña"
      hideCancel
      onClose={() => {}}
      onConfirm={onSubmit}
      className="ep-modal"
    >
      <div className="ep-body">
        <p className="ep-footnote">Tu contraseña fue restablecida. Para continuar debes crear una nueva que solo tú conozcas.</p>
        <div className="ep-grid ep-grid--1">
          <div className="ep-field ep-field--wide">
            <label className="ep-field__label">Nueva contraseña</label>
            <div className="password-visibility-field">
              <input className="ep-input" type={showPassword ? "text" : "password"} value={passwordForm.password} onChange={(e) => onPasswordChange((c) => ({ ...c, password: e.target.value, message: "" }))} />
              <button
                type="button"
                className="password-visibility-toggle"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="ep-field ep-field--wide">
            <label className="ep-field__label">Confirmar contraseña</label>
            <div className="password-visibility-field">
              <input className="ep-input" type={showConfirmPassword ? "text" : "password"} value={passwordForm.confirmPassword} onChange={(e) => onPasswordChange((c) => ({ ...c, confirmPassword: e.target.value, message: "" }))} />
              <button
                type="button"
                className="password-visibility-toggle"
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <p className="ep-footnote">Debe incluir mayúscula, minúscula, número, símbolo y al menos 10 caracteres.</p>
          {passwordForm.message && <p className="ep-msg">{passwordForm.message}</p>}
        </div>
      </div>
    </Modal>
  );
}
