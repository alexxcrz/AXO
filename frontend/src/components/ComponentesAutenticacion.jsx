// ── Pantallas de Autenticación ───────────────────────────────────────────────
import { useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { CopmecBrand } from "./ComponentesDashboard";
import "./LoginScreen.css";

const DEFAULT_AREA_OPTIONS = ["ESTO", "TRANSPORTE", "REGULATORIO", "CALIDAD", "INVENTARIO", "PEDIDOS", "RETAIL"];

export { DEFAULT_AREA_OPTIONS };

export function LoginScreen({ loginForm, onChange, onSubmit, error, demoUsers }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="axo-login-v2">
      <div className="axo-login-v2-mesh" aria-hidden="true" />
      <span className="axo-login-v2-orb axo-login-v2-orb-a" aria-hidden="true" />
      <span className="axo-login-v2-orb axo-login-v2-orb-b" aria-hidden="true" />

      <section className="axo-login-v2-card">
        <header className="axo-login-v2-brand">
          <CopmecBrand headingTag="h1" tone="dark" subtitle="" showKicker={false} />
          <h2>Bienvenido a AXO</h2>
          <p>Ingresa con tu player de acceso para continuar.</p>
        </header>

        <form className="axo-login-v2-form" onSubmit={onSubmit}>
          <label className="axo-login-v2-field">
            <span>Player de acceso</span>
            <input
              value={loginForm.login}
              onChange={(event) => onChange("login", event.target.value)}
              placeholder="usuario o correo"
              autoComplete="username"
            />
          </label>

          <label className="axo-login-v2-field">
            <span>Contraseña</span>
            <div className="axo-login-v2-password">
              <input
                type={showPassword ? "text" : "password"}
                value={loginForm.password}
                onChange={(event) => onChange("password", event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error ? <p className="validation-text">{error}</p> : null}

          <button type="submit" className="axo-login-v2-submit">
            Entrar al sistema
          </button>
        </form>

        {demoUsers.length ? (
          <div className="axo-login-v2-demo">
            <h3>Accesos de demostración</h3>
            <div className="axo-login-v2-demo-list">
              {demoUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="axo-login-v2-demo-chip"
                  onClick={() => onChange("login", user.login || user.email)}
                >
                  {user.role} · {user.login || user.email}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export function BootstrapLeadSetup({ setupForm, onChange, onSubmit, error, areaOptions, onAddArea }) {
  const [showSetupPassword, setShowSetupPassword] = useState(false);

  return (
    <main className="axo-login-v2">
      <div className="axo-login-v2-mesh" aria-hidden="true" />
      <span className="axo-login-v2-orb axo-login-v2-orb-a" aria-hidden="true" />

      <section className="axo-login-v2-card setup-wide">
        <header className="axo-login-v2-brand">
          <span className="chip primary" style={{ marginBottom: "0.5rem" }}>Configuración inicial</span>
          <h2>Primer player Lead</h2>
          <p>Define el administrador principal del almacén.</p>
        </header>

        <form className="axo-login-v2-form" onSubmit={onSubmit}>
          <div className="axo-login-v2-setup-grid">
            <label className="axo-login-v2-field full">
              <span>Nombre completo</span>
              <input value={setupForm.name} onChange={(event) => onChange("name", event.target.value)} placeholder="Nombre del Lead" />
            </label>
            <label className="axo-login-v2-field">
              <span>Player de acceso</span>
              <input value={setupForm.username} onChange={(event) => onChange("username", event.target.value)} placeholder="opcional" />
            </label>
            <label className="axo-login-v2-field">
              <span>Cargo</span>
              <input value={setupForm.jobTitle} onChange={(event) => onChange("jobTitle", event.target.value)} placeholder="Encargado…" />
            </label>
            <label className="axo-login-v2-field full">
              <span>Área</span>
              <div className="area-selector-row">
                <select value={setupForm.area} onChange={(event) => onChange("area", event.target.value)}>
                  <option value="">Seleccionar área…</option>
                  {areaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
                </select>
                <button type="button" className="icon-button area-add-button" onClick={onAddArea} aria-label="Agregar área">
                  <Plus size={16} />
                </button>
              </div>
            </label>
            <label className="axo-login-v2-field full">
              <span>Contraseña inicial</span>
              <div className="axo-login-v2-password">
                <input
                  type={showSetupPassword ? "text" : "password"}
                  value={setupForm.password}
                  onChange={(event) => onChange("password", event.target.value)}
                  placeholder="Contraseña segura"
                />
                <button
                  type="button"
                  aria-label={showSetupPassword ? "Ocultar" : "Mostrar"}
                  onClick={() => setShowSetupPassword((c) => !c)}
                >
                  {showSetupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>

          {error ? <p className="validation-text">{error}</p> : null}

          <button type="submit" className="axo-login-v2-submit">
            Crear Lead y cerrar acceso maestro
          </button>
        </form>
      </section>
    </main>
  );
}
