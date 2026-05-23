// ── Pantallas de Autenticación ───────────────────────────────────────────────
// LoginScreen: pantalla de inicio de sesión con visual decorativa.
// BootstrapLeadSetup: configuración inicial del player principal (Lead).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { CopmecBrand } from "./ComponentesDashboard";
import "./LoginScreen.css";

const DEFAULT_AREA_OPTIONS = ["ESTO", "TRANSPORTE", "REGULATORIO", "CALIDAD", "INVENTARIO", "PEDIDOS", "RETAIL"];

export { DEFAULT_AREA_OPTIONS };

export function LoginScreen({ loginForm, onChange, onSubmit, error, demoUsers }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-shell login-pro">
      <div className="login-aurora login-aurora-one" />
      <div className="login-aurora login-aurora-two" />
      <section className="login-panel">
        <article className="login-hero-panel">
          <div className="login-brand-block">
            <CopmecBrand headingTag="h1" tone="light" subtitle="Sistema de Gestión Operativa." showKicker={false} />
          </div>

          <div className="login-visual-scene" aria-hidden="true">
            <div className="login-scene-grid" />
            <div className="login-scene-scanline" />
            <div className="login-scene-data-flow">
              <span className="login-scene-data-line line-a" />
              <span className="login-scene-data-line line-b" />
              <span className="login-scene-data-line line-c" />
            </div>
            <div className="login-scene-status-board">
              <span className="login-scene-status-chip live">Modulos</span>
              <span className="login-scene-status-chip">Flujos</span>
              <span className="login-scene-status-chip alert">Control</span>
            </div>
            <span className="login-scene-particle particle-a" />
            <span className="login-scene-particle particle-b" />
            <span className="login-scene-particle particle-c" />
            <div className="login-scene-ring login-scene-ring-one" />
            <div className="login-scene-ring login-scene-ring-two" />
            <div className="login-scene-card login-scene-card-main">
              <div className="login-scene-card-head">
                <span className="login-scene-dot" />
                <span className="login-scene-dot" />
                <span className="login-scene-dot accent" />
              </div>
              <div className="login-scene-bars">
                <span className="login-scene-bar bar-a" />
                <span className="login-scene-bar bar-b" />
                <span className="login-scene-bar bar-c" />
              </div>
              <div className="login-scene-track">
                <span className="login-scene-track-fill" />
              </div>
            </div>
            <div className="login-scene-card login-scene-card-side">
              <div className="login-scene-stack">
                <span className="login-scene-box" />
                <span className="login-scene-box" />
                <span className="login-scene-box" />
              </div>
            </div>
            <div className="login-scene-card login-scene-card-pie">
              <div className="login-scene-pie-chart">
                <span className="login-scene-pie-core" />
              </div>
              <div className="login-scene-pie-legend">
                <span><i className="login-scene-legend-tone tone-green" /> Operacion</span>
                <span><i className="login-scene-legend-tone tone-gold" /> Seguimiento</span>
                <span><i className="login-scene-legend-tone tone-blue" /> Analitica</span>
              </div>
            </div>
            <div className="login-scene-card login-scene-card-bottom">
              <div className="login-scene-timeline">
                <span className="login-scene-node active" />
                <span className="login-scene-node" />
                <span className="login-scene-node" />
                <span className="login-scene-node success" />
              </div>
            </div>
          </div>
        </article>

        <article className="login-form-panel">
          <div className="login-form-panel-head">
            <h2>Ingresar a AXO</h2>
            <p>Acceso seguro</p>
          </div>

          <form className="login-form" onSubmit={onSubmit}>
            <label className="app-modal-field login-field">
              <span>Player de acceso</span>
              <input
                value={loginForm.login}
                onChange={(event) => onChange("login", event.target.value)}
                placeholder="Player"
                autoComplete="username"
              />
            </label>
            <label className="app-modal-field login-field">
              <span>Contraseña</span>
              <div className="login-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(event) => onChange("password", event.target.value)}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            {error ? <p className="validation-text">{error}</p> : null}
            <button type="submit" className="primary-button login-submit-button">
              Continuar
            </button>
          </form>

          {demoUsers.length ? (
            <div className="login-demo-users">
              <h3>Accesos disponibles</h3>
              <div className="login-demo-list">
                {demoUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="chip login-demo-chip"
                    onClick={() => onChange("login", user.login || user.email)}
                  >
                    {user.role} · {user.login || user.email}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}

export function BootstrapLeadSetup({ setupForm, onChange, onSubmit, error, areaOptions, onAddArea }) {
  const [showSetupPassword, setShowSetupPassword] = useState(false);

  return (
    <main className="login-shell login-pro setup-flow">
      <div className="login-aurora login-aurora-one" />
      <div className="login-aurora login-aurora-two" />
      <section className="login-panel">
        <article className="login-hero-panel setup-hero-panel">
          <div className="login-brand-block">
            <span className="login-badge">Configuración inicial</span>
            <h1>Crear primer Lead</h1>
          </div>

          <div className="login-visual-scene setup-scene" aria-hidden="true">
            <div className="login-scene-grid" />
            <div className="login-scene-scanline" />
            <div className="login-scene-ring login-scene-ring-one" />
            <div className="login-scene-card login-scene-card-main setup-card-main">
              <div className="login-scene-lock-core" />
              <div className="login-scene-lock-shackle" />
            </div>
            <div className="login-scene-card login-scene-card-side setup-card-side">
              <div className="login-scene-status-pill" />
              <div className="login-scene-status-pill short" />
            </div>
          </div>
        </article>

        <article className="login-form-panel">
          <div className="login-form-panel-head">
            <h2>Configuración inicial del player principal</h2>
            <p>Primer acceso del sistema</p>
          </div>

          <form className="login-form" onSubmit={onSubmit}>
            <label className="app-modal-field login-field">
              <span>Nombre del player principal</span>
              <input value={setupForm.name} onChange={(event) => onChange("name", event.target.value)} placeholder="Nombre completo" />
            </label>
            <label className="app-modal-field login-field">
              <span>Player de acceso del player principal (opcional)</span>
              <input value={setupForm.username} onChange={(event) => onChange("username", event.target.value)} placeholder="Ej: alejandro.cruz" />
            </label>
            <label className="app-modal-field login-field">
              <span>Área</span>
              <div className="area-selector-row">
                <select value={setupForm.area} onChange={(event) => onChange("area", event.target.value)}>
                  <option value="">Seleccionar área...</option>
                  {areaOptions.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
                <button type="button" className="icon-button area-add-button" onClick={onAddArea} aria-label="Agregar nueva área">
                  <Plus size={16} />
                </button>
              </div>
            </label>
            <label className="app-modal-field login-field">
              <span>Cargo</span>
              <input value={setupForm.jobTitle} onChange={(event) => onChange("jobTitle", event.target.value)} placeholder="Ej: Encargado de Mejora Continua" />
            </label>
            <label className="app-modal-field login-field">
              <span>Contraseña inicial</span>
              <div className="login-password-field">
                <input
                  type={showSetupPassword ? "text" : "password"}
                  value={setupForm.password}
                  onChange={(event) => onChange("password", event.target.value)}
                  placeholder="Contraseña segura"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showSetupPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowSetupPassword((current) => !current)}
                >
                  {showSetupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            {error ? <p className="validation-text">{error}</p> : null}
            <button type="submit" className="primary-button login-submit-button">
              Crear player principal y cerrar acceso maestro
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
