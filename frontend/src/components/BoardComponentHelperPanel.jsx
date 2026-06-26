import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Wand2, Plus } from "lucide-react";
import { resolveBestComponentPlan, requestBoardComponentPlan } from "../utils/boardComponentHelper.js";
import { requestJson } from "../utils/utilidades.jsx";
import { BOARD_FIELD_TYPES } from "../utils/constantes.js";

const SOURCE_LABELS = {
  ollama: "IA local",
  "local-scenario": "Plantilla inteligente",
  presets: "Presets guardados",
  local: "Analisis local",
};

export function BoardComponentHelperPanel({
  savedPresets = [],
  onApply,
  onAddManualComponent,
  disabled = false,
}) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [engineStatus, setEngineStatus] = useState(null);

  const typeLabelByValue = useMemo(
    () => Object.fromEntries(BOARD_FIELD_TYPES.map((type) => [type.value, type.label])),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await requestJson("/warehouse/board-component-helper/engine-status");
        if (!cancelled) setEngineStatus(response?.engine || response?.data?.engine || null);
      } catch {
        if (!cancelled) setEngineStatus(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const engineNote = useMemo(() => {
    if (!engineStatus) return "Conectando con motor IA...";
    if (engineStatus.reachable && engineStatus.modelReady) {
      return "Motor de IA local activo.";
    }
    if (engineStatus.reachable) {
      return "Motor IA conectado; falta descargar el modelo configurado.";
    }
    return "Motor IA local no disponible; se usaran plantillas inteligentes.";
  }, [engineStatus]);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const apiPlan = await requestBoardComponentPlan(trimmed, { savedPresets, requestJson });
      const plan = resolveBestComponentPlan(trimmed, apiPlan, { savedPresets });
      if (plan?.specs?.length) {
        setResult(plan);
        if (apiPlan?.engine) setEngineStatus(apiPlan.engine);
      } else {
        setError(plan?.summary || "No se detectaron componentes. Intenta ser mas especifico o usa Agregar componente.");
      }
    } catch (requestError) {
      const plan = resolveBestComponentPlan(trimmed, null, { savedPresets });
      if (plan?.specs?.length) {
        setResult(plan);
        setError("");
      } else {
        setError(requestError?.message || "No se pudo generar la propuesta. Revisa tu conexion e intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result?.specs?.length || !onApply) return;
    onApply(result);
    setPrompt("");
    setResult(null);
    setError("");
  }

  const sourceLabel = SOURCE_LABELS[result?.source] || (result?.aiUsed ? "IA" : null);

  return (
    <section className="board-helper-panel">
      <header className="board-helper-panel-head">
        <div className="board-helper-panel-icon" aria-hidden="true">
          <Wand2 size={18} />
        </div>
        <div>
          <h4>Asistente de componentes</h4>
          <p>
            Describe tu proceso completo. La IA interpreta la necesidad
            y propone campos reales del sistema.
          </p>
        </div>
      </header>

      <p className={`board-helper-ai-note${engineStatus?.reachable && engineStatus?.modelReady ? " is-ready" : ""}`}>
        {engineNote}
      </p>

      <label className="board-helper-field">
        <span>{"\u00bfQu\u00e9 necesitas en tu tablero?"}</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={5}
          placeholder={"Ej: control de cajas tomadas del almacen con descuento al escanear o buscar manualmente, confirmando cuantas cajas y piezas se descontaron"}
          disabled={disabled || loading}
        />
      </label>

      <div className="board-helper-actions">
        <button
          type="button"
          className="board-helper-generate-btn"
          onClick={handleGenerate}
          disabled={disabled || loading || !prompt.trim()}
        >
          {loading ? <Loader2 size={15} className="board-helper-spinner" /> : <Sparkles size={15} />}
          {loading ? "Interpretando..." : "Generar propuesta"}
        </button>
        {onAddManualComponent ? (
          <button
            type="button"
            className="board-helper-manual-btn"
            onClick={onAddManualComponent}
            disabled={disabled || loading}
          >
            <Plus size={15} /> Agregar componente
          </button>
        ) : null}
        {result?.specs?.length ? (
          <button type="button" className="primary-button board-helper-apply-btn" onClick={handleApply} disabled={disabled || loading}>
            <Plus size={15} /> Agregar {result.specs.length} a la ficha
          </button>
        ) : null}
      </div>

      {savedPresets.length ? (
        <p className="board-helper-presets-note">{savedPresets.length} componente(s) guardados en el sistema para reutilizar.</p>
      ) : null}

      {error ? <p className="board-helper-error" role="alert">{error}</p> : null}

      {result ? (
        <div className="board-helper-result">
          <div className="board-helper-result-head">
            <p className="board-helper-summary">{result.summary}</p>
            {sourceLabel ? <span className="board-helper-source-badge">{sourceLabel}</span> : null}
          </div>
          {result.hint ? <p className="board-helper-hint">{result.hint}</p> : null}
          {result.specs.length ? (
            <ul className="board-helper-spec-list">
              {result.specs.map((spec) => (
                <li key={`${spec.label}-${spec.type}`} className="board-helper-spec-item">
                  <strong>{spec.label}</strong>
                  <span>{typeLabelByValue[spec.type] || spec.type}</span>
                  <small>
                    {spec.groupName}
                    {spec.isNewPreset ? " - nuevo en sistema" : spec.fromPreset ? " - reutilizado" : ""}
                  </small>
                </li>
              ))}
            </ul>
          ) : null}
          {result.newPresets?.length ? (
            <p className="board-helper-new-presets">
              {result.newPresets.length} componente(s) nuevo(s) se {"guardar\u00e1n"} para futuros tableros.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
