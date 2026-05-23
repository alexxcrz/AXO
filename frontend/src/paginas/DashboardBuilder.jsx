import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Save, RotateCcw, ArrowUp, ArrowDown } from "lucide-react";

const STORAGE_KEY = "copmec-dashboard-config";

const COMPONENT_DEFINITIONS = {
  executive: {
    label: "Resumen ejecutivo",
    description: "KPIs clave para ver el estado actual del área.",
    defaultSettings: {},
  },
  players: {
    label: "Análisis por player",
    description: "Comparativa de datos por persona.",
    defaultSettings: { chartType: "bar", metric: "averageMinutes" },
    settings: [
      {
        key: "chartType",
        label: "Tipo de gráfico",
        options: [
          { value: "bar", label: "Barras" },
          { value: "line", label: "Línea" },
        ],
      },
      {
        key: "metric",
        label: "Métrica",
        options: [
          { value: "averageMinutes", label: "Minutos promedio" },
          { value: "totalRecords", label: "Registros totales" },
        ],
      },
    ],
  },
  alerts: {
    label: "Alertas y pausas",
    description: "Visor de eventos fuera de rango y pausas importantes.",
    defaultSettings: { view: "table" },
    settings: [
      {
        key: "view",
        label: "Vista inicial",
        options: [
          { value: "table", label: "Tabla" },
          { value: "paused", label: "Pausas" },
        ],
      },
    ],
  },
  merma: {
    label: "Merma",
    description: "Análisis de piezas faltantes y pérdida real.",
    defaultSettings: { chartType: "bar" },
    settings: [
      {
        key: "chartType",
        label: "Tipo de gráfico",
        options: [
          { value: "bar", label: "Barras" },
          { value: "line", label: "Línea" },
        ],
      },
    ],
  },
  trends: {
    label: "Tendencias",
    description: "Evolución y comparación por área.",
    defaultSettings: { chartType: "line" },
    settings: [
      {
        key: "chartType",
        label: "Tipo de gráfico",
        options: [
          { value: "line", label: "Línea" },
          { value: "bar", label: "Barras" },
        ],
      },
    ],
  },
  inventory: {
    label: "Inventario",
    description: "Datos literales de tableros y tarimas.",
    defaultSettings: { chartType: "bar", metric: "totalMinutes", view: "all" },
    settings: [
      {
        key: "chartType",
        label: "Tipo de gráfico",
        options: [
          { value: "bar", label: "Barras" },
          { value: "line", label: "Línea" },
        ],
      },
      {
        key: "metric",
        label: "Métrica",
        options: [
          { value: "totalMinutes", label: "Total tiempo" },
          { value: "averageMinutes", label: "Promedio tiempo" },
          { value: "count", label: "Registros" },
          { value: "minMinutes", label: "Tiempo mínimo" },
          { value: "maxMinutes", label: "Tiempo máximo" },
        ],
      },
      {
        key: "view",
        label: "Vista de datos",
        options: [
          { value: "all", label: "Todo" },
          { value: "board", label: "Por tablero" },
        ],
      },
    ],
  },
  causes: {
    label: "Incidencias",
    description: "Problemas, causas y Pareto.",
    defaultSettings: { chartType: "bar" },
    settings: [
      {
        key: "chartType",
        label: "Tipo de gráfico",
        options: [
          { value: "bar", label: "Barras" },
          { value: "line", label: "Línea" },
        ],
      },
    ],
  },
};

const DEFAULT_CONFIG = {
  title: "Mi Dashboard Personalizado",
  area: "all",
  components: [
    {
      id: "executive-1",
      type: "executive",
      name: COMPONENT_DEFINITIONS.executive.label,
      enabled: true,
      order: 1,
      settings: COMPONENT_DEFINITIONS.executive.defaultSettings,
    },
    {
      id: "players-2",
      type: "players",
      name: COMPONENT_DEFINITIONS.players.label,
      enabled: true,
      order: 2,
      settings: COMPONENT_DEFINITIONS.players.defaultSettings,
    },
    {
      id: "alerts-3",
      type: "alerts",
      name: COMPONENT_DEFINITIONS.alerts.label,
      enabled: true,
      order: 3,
      settings: COMPONENT_DEFINITIONS.alerts.defaultSettings,
    },
    {
      id: "merma-4",
      type: "merma",
      name: COMPONENT_DEFINITIONS.merma.label,
      enabled: true,
      order: 4,
      settings: COMPONENT_DEFINITIONS.merma.defaultSettings,
    },
    {
      id: "trends-5",
      type: "trends",
      name: COMPONENT_DEFINITIONS.trends.label,
      enabled: true,
      order: 5,
      settings: COMPONENT_DEFINITIONS.trends.defaultSettings,
    },
  ],
};

const AVAILABLE_COMPONENTS = Object.entries(COMPONENT_DEFINITIONS).map(([id, def]) => ({
  id,
  label: def.label,
  description: def.description,
}));

export default function DashboardBuilder() {
  const [dashboardConfig, setDashboardConfig] = useState(() => {
    function normalizeDashboardConfig(config) {
      if (!config || typeof config !== "object") return DEFAULT_CONFIG;
      const components = Array.isArray(config.components)
        ? config.components.map((component) => {
          if (component.type === "executive" && component.settings?.kpiGroup) {
            const { kpiGroup: _kpiGroup, ...normalizedSettings } = component.settings;
            return { ...component, settings: normalizedSettings };
          }
          return component;
        })
        : DEFAULT_CONFIG.components;
      return { ...DEFAULT_CONFIG, ...config, components };
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeDashboardConfig(JSON.parse(saved)) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [editMode, setEditMode] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const enabledComponents = useMemo(
    () => dashboardConfig.components
      .filter((c) => c.enabled)
      .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [dashboardConfig.components]
  );

  const addComponent = useCallback((componentId) => {
    if (dashboardConfig.components.some((component) => component.type === componentId)) {
      setStatusMessage("El componente ya está agregado.");
      return;
    }

    const componentDef = COMPONENT_DEFINITIONS[componentId];
    if (!componentDef) return;

    const nextOrder = Math.max(...dashboardConfig.components.map((c) => c.order || 0), 0) + 1;
    const newComponent = {
      id: `${componentId}-${Date.now()}`,
      type: componentId,
      name: componentDef.label,
      enabled: true,
      order: nextOrder,
      settings: { ...componentDef.defaultSettings },
    };

    setDashboardConfig((prev) => ({
      ...prev,
      components: [...prev.components, newComponent],
    }));
    setStatusMessage(`Se agregó "${componentDef.label}" al dashboard.`);
  }, [dashboardConfig.components]);

  const removeComponent = useCallback((componentId) => {
    setDashboardConfig((prev) => ({
      ...prev,
      components: prev.components.filter((component) => component.id !== componentId),
    }));
    setStatusMessage("Componente eliminado.");
  }, []);

  const toggleComponent = useCallback((componentId) => {
    setDashboardConfig((prev) => ({
      ...prev,
      components: prev.components.map((component) =>
        component.id === componentId ? { ...component, enabled: !component.enabled } : component
      ),
    }));
  }, []);

  const updateComponentName = useCallback((componentId, newName) => {
    setDashboardConfig((prev) => ({
      ...prev,
      components: prev.components.map((component) =>
        component.id === componentId ? { ...component, name: newName } : component
      ),
    }));
  }, []);

  const updateComponentSetting = useCallback((componentId, key, value) => {
    setDashboardConfig((prev) => ({
      ...prev,
      components: prev.components.map((component) =>
        component.id === componentId
          ? { ...component, settings: { ...component.settings, [key]: value } }
          : component
      ),
    }));
  }, []);

  const moveComponent = useCallback((componentId, direction) => {
    setDashboardConfig((prev) => {
      const components = [...prev.components];
      const index = components.findIndex((component) => component.id === componentId);
      if (index === -1) return prev;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= components.length) return prev;

      [components[index], components[targetIndex]] = [components[targetIndex], components[index]];
      return {
        ...prev,
        components: components.map((component, idx) => ({ ...component, order: idx + 1 })),
      };
    });
  }, []);

  const saveDashboard = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardConfig));
    setEditMode(false);
    setStatusMessage("Dashboard guardado correctamente.");
  }, [dashboardConfig]);

  const resetDashboard = useCallback(() => {
    setDashboardConfig(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
    setStatusMessage("La configuración se ha restablecido.");
  }, []);

  return (
    <div style={{ display: "grid", gap: "1.5rem", padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{
        background: "linear-gradient(135deg, #f0f9ff 0%, #f3f4f6 100%)",
        padding: "1.5rem",
        borderRadius: "1rem",
        border: "1px solid #e5e7eb",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <h1 style={{ color: "#1f2937", margin: "0 0 0.5rem 0", fontSize: "1.75rem" }}>
              Creador de Dashboard Personalizado
            </h1>
            <p style={{ color: "#475569", margin: 0 }}>
              Selecciona y organiza las secciones reales que quieres en tu dashboard.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {editMode && (
              <button
                type="button"
                onClick={saveDashboard}
                style={{
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  padding: "0.6rem 1.2rem",
                  borderRadius: "0.6rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <Save size={16} /> Guardar
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditMode((current) => !current)}
              style={{
                background: editMode ? "#f3f4f6" : "#3b82f6",
                color: editMode ? "#1f2937" : "white",
                border: "none",
                padding: "0.6rem 1.2rem",
                borderRadius: "0.6rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <RotateCcw size={16} /> {editMode ? "Cancelar" : "Editar"}
            </button>
          </div>
        </div>
      </div>

      {statusMessage ? (
        <div style={{
          background: "#d1fae5",
          color: "#065f46",
          padding: "1rem",
          borderRadius: "1rem",
          border: "1px solid #a7f3d0",
        }}>
          {statusMessage}
        </div>
      ) : null}

      {editMode ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.5rem" }}>
          <div style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid #e5e7eb",
          }}>
            <h2 style={{ color: "#1f2937", marginTop: 0 }}>Secciones del dashboard</h2>
            {dashboardConfig.components.length === 0 ? (
              <p style={{ color: "#9ca3af" }}>No hay secciones. Agrega una desde la columna derecha.</p>
            ) : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {dashboardConfig.components.map((component, index) => {
                  const def = COMPONENT_DEFINITIONS[component.type] || {};
                  return (
                    <div
                      key={component.id}
                      style={{
                        background: component.enabled ? "#f0fdf4" : "#fef2f2",
                        border: `1px solid ${component.enabled ? "#dcfce7" : "#fee2e2"}`,
                        padding: "1rem",
                        borderRadius: "0.75rem",
                        display: "grid",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                        <div style={{ minWidth: 0 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.65rem" }}>
                            <input
                              type="checkbox"
                              checked={component.enabled}
                              onChange={() => toggleComponent(component.id)}
                              style={{ cursor: "pointer" }}
                            />
                            <span style={{ fontWeight: 600, color: "#1f2937" }}>{component.name}</span>
                          </label>
                          {editingComponent === component.id ? (
                            <input
                              type="text"
                              value={component.name}
                              onChange={(e) => updateComponentName(component.id, e.target.value)}
                              onBlur={() => setEditingComponent(null)}
                              autoFocus
                              style={{
                                width: "100%",
                                padding: "0.65rem",
                                borderRadius: "0.55rem",
                                border: "1px solid #cbd5e1",
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingComponent(component.id)}
                              style={{
                                width: "100%",
                                padding: "0.65rem",
                                borderRadius: "0.55rem",
                                border: "1px solid #d1d5db",
                                background: "#f8fafc",
                                color: "#334155",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              Renombrar este componente
                            </button>
                          )}
                        </div>
                        <div style={{ display: "grid", gap: "0.4rem", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveComponent(component.id, -1)}
                            style={{
                              background: index === 0 ? "#e2e8f0" : "#2563eb",
                              color: index === 0 ? "#94a3b8" : "white",
                              border: "none",
                              padding: "0.55rem",
                              borderRadius: "0.55rem",
                              cursor: index === 0 ? "not-allowed" : "pointer",
                            }}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={index === dashboardConfig.components.length - 1}
                            onClick={() => moveComponent(component.id, 1)}
                            style={{
                              background: index === dashboardConfig.components.length - 1 ? "#e2e8f0" : "#2563eb",
                              color: index === dashboardConfig.components.length - 1 ? "#94a3b8" : "white",
                              border: "none",
                              padding: "0.55rem",
                              borderRadius: "0.55rem",
                              cursor: index === dashboardConfig.components.length - 1 ? "not-allowed" : "pointer",
                            }}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeComponent(component.id)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "0.55rem",
                              borderRadius: "0.55rem",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ color: "#475569", fontSize: "0.92rem" }}>
                        <div><strong>Tipo:</strong> {def.label || component.type}</div>
                        <div>{def.description}</div>
                      </div>

                      {def.settings ? (
                        <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
                          {def.settings.map((setting) => (
                            <label key={setting.key} style={{ display: "grid", gap: "0.35rem", color: "#334155", fontSize: "0.92rem" }}>
                              <span>{setting.label}</span>
                              <select
                                value={component.settings?.[setting.key] ?? ""}
                                onChange={(event) => updateComponentSetting(component.id, setting.key, event.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.65rem",
                                  borderRadius: "0.55rem",
                                  border: "1px solid #cbd5e1",
                                  background: "white",
                                }}
                              >
                                {setting.options.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid #e5e7eb",
            height: "fit-content",
          }}>
            <h3 style={{ color: "#1f2937", marginTop: 0 }}>Agregar secciones</h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {AVAILABLE_COMPONENTS.map((comp) => {
                const added = dashboardConfig.components.some((item) => item.type === comp.id);
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => addComponent(comp.id)}
                    disabled={added}
                    style={{
                      background: added ? "#e2e8f0" : "#2563eb",
                      color: added ? "#64748b" : "white",
                      border: "none",
                      padding: "0.75rem 0.9rem",
                      borderRadius: "0.7rem",
                      cursor: added ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.95rem",
                      justifyContent: "center",
                    }}
                  >
                    <Plus size={16} /> {comp.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={resetDashboard}
              style={{
                marginTop: "1.25rem",
                background: "#6b7280",
                color: "white",
                border: "none",
                padding: "0.75rem 0.9rem",
                borderRadius: "0.7rem",
                cursor: "pointer",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}
            >
              <RotateCcw size={16} /> Restablecer configuración
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          background: "#f9fafb",
          padding: "1.5rem",
          borderRadius: "1rem",
          minHeight: "300px",
        }}>
          <p style={{ color: "#475569", textAlign: "center" }}>
            Dashboard con {enabledComponents.length} secciones visibles.
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
          }}>
            {enabledComponents.map((comp) => {
              const def = COMPONENT_DEFINITIONS[comp.type] || {};
              return (
                <div
                  key={comp.id}
                  style={{
                    background: "white",
                    padding: "1.5rem",
                    borderRadius: "1rem",
                    border: "1px solid #e5e7eb",
                    minHeight: "200px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <h4 style={{ color: "#1f2937", margin: "0 0 0.5rem 0" }}>{comp.name}</h4>
                  <p style={{ color: "#6b7280", margin: 0, fontSize: "0.95rem" }}>{def.description || comp.type}</p>
                  {comp.settings ? (
                    <div style={{ color: "#475569", fontSize: "0.9rem", marginTop: "0.85rem" }}>
                      {Object.entries(comp.settings).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key.replace(/([A-Z])/g, " $1")}:</strong> {value}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
