import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import logoIA from "../assets/AXOIA.png";
import { API_BASE_URL } from "../utils/constantes.js";

// ─── Renderizador de markdown simple ─────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  return text
    // Negrita
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Cursiva
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Tablas (detectar líneas con | )
    .split("\n")
    .map((line) => {
      if (line.startsWith("| ") || line.startsWith("|---")) return line; // se procesa abajo
      return line;
    })
    .join("\n");
}

function parseMarkdownToJSX(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let tableBuffer = [];
  let key = 0;

  function flushTable() {
    if (tableBuffer.length < 2) {
      tableBuffer.forEach((l) => elements.push(<p key={key++} className="copmec-ai-p">{l}</p>));
      tableBuffer = [];
      return;
    }
    const headers = tableBuffer[0].split("|").filter((c) => c.trim()).map((c) => c.trim());
    const rows = tableBuffer.slice(2).map((r) => r.split("|").filter((c) => c.trim()).map((c) => c.trim()));

    elements.push(
      <div key={key++} className="copmec-ai-table-wrap">
        <table className="copmec-ai-table">
          <thead>
            <tr>{headers.map((h, i) => <th key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(h) }} />)}</tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => <td key={ci} dangerouslySetInnerHTML={{ __html: renderMarkdown(cell) }} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Tabla
    if (line.startsWith("|")) {
      tableBuffer.push(line);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    if (!line.trim()) {
      elements.push(<div key={key++} className="copmec-ai-spacer" />);
    } else if (line.startsWith("- ") || line.startsWith("  - ")) {
      const indent = line.startsWith("  - ");
      const content = line.replace(/^(\s*- )/, "");
      elements.push(
        <div key={key++} className={`copmec-ai-li ${indent ? "copmec-ai-li-indent" : ""}`}>
          <span className="copmec-ai-bullet">•</span>
          <span dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        </div>
      );
    } else {
      elements.push(
        <p key={key++} className="copmec-ai-p" dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }} />
      );
    }
  }

  if (tableBuffer.length > 0) flushTable();

  return elements;
}

// ─── Sugerencias rápidas ──────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  "Resumen del sistema",
  "Qué módulos tiene AXO",
  "Stock bajo",
  "Tableros pausados",
  "Incidencias abiertas",
  "Catálogo de actividades",
  "Predicciones",
  "Genera reporte en PDF",
  "Genera reporte en XLSX",
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CopmecAIWidget({ canUseAI, isOpen, onClose, sidebarCollapsed, onStateChanged }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [engineStatus, setEngineStatus] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const engineSubtitle = useMemo(() => {
    if (!engineStatus) return "Cerebro Operativo";
    if (engineStatus.reachable && engineStatus.modelReady) {
      return "Asistente inteligente activo";
    }
    if (engineStatus.reachable) {
      return "Motor IA pendiente de configurar";
    }
    return "Modo consulta (datos del sistema)";
  }, [engineStatus]);

  // Scroll automático al fondo
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Foco al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      let cancelled = false;
      (async () => {
        try {
          const statusRes = await fetch(`${API_BASE_URL}/copmec-ai/engine-status`, {
            method: "GET",
            credentials: "include",
          });
          const statusData = await statusRes.json();
          if (!cancelled && statusRes.ok && statusData.ok) {
            setEngineStatus(statusData.engine || null);
          }
        } catch {
          if (!cancelled) setEngineStatus(null);
        }

        try {
          const res = await fetch(`${API_BASE_URL}/copmec-ai/history?limit=80`, {
            method: "GET",
            credentials: "include",
          });
          const data = await res.json();
          if (!cancelled && res.ok && data.ok && Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
            setHasGreeted(true);
            return;
          }
        } catch {
          // Si no hay historial o falla red, continúa con saludo inicial.
        }
        if (!cancelled && !hasGreeted) {
          sendMessage("hola");
          setHasGreeted(true);
        }
      })();
      return () => { cancelled = true; };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sendMessage = useCallback(async (text) => {
    const msg = String(text || input).trim();
    if (!msg || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/copmec-ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        if (data.stateUpdated) {
          onStateChanged?.();
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: data.response,
            engine: data.engine || "rules",
            reportToken: data.reportToken || null,
            availableFormats: Array.isArray(data.availableFormats) ? data.availableFormats : [],
            dashboardFixed: data.dashboardFixed || false,
            actionExecuted: data.actionExecuted || false,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "ai", content: "No pude procesar tu solicitud. Intenta de nuevo." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "ai", content: "Error de conexión. Verifica que el servidor esté disponible." }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isLoading, onStateChanged]);

  function downloadReport(token, format) {
    window.open(`${API_BASE_URL}/copmec-ai/report/${token}/${format}`, "_blank", "noopener");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === "Escape") onClose?.();
  }

  async function clearChat() {
    try {
      await fetch(`${API_BASE_URL}/copmec-ai/history`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      // Ignorar errores para no bloquear UI.
    }
    setMessages([]);
    setHasGreeted(false);
  }

  if (!canUseAI || !isOpen) return null;

  return (
    <div className={`copmec-ai-panel${sidebarCollapsed ? " copmec-ai-panel--sidebar-collapsed" : ""}`} role="dialog" aria-label="AXO AI — Cerebro Operativo">
          {/* Header */}
          <div className="copmec-ai-header">
            <div className="copmec-ai-header-info">
              <img src={logoIA} alt="AXO AI" className="copmec-ai-header-logo" />
              <div>
                <div className="copmec-ai-header-title">AXO AI</div>
                <div className={`copmec-ai-header-subtitle${engineStatus?.reachable && engineStatus?.modelReady ? " is-ai-ready" : ""}`}>
                  {engineSubtitle}
                </div>
              </div>
            </div>
            <div className="copmec-ai-header-actions">
              <button type="button" className="copmec-ai-icon-btn" onClick={clearChat} title="Limpiar conversación">
                ↺
              </button>
              <button type="button" className="copmec-ai-icon-btn" onClick={() => onClose?.()} title="Cerrar">
                ✕
              </button>
            </div>
          </div>

          {engineStatus && !(engineStatus.reachable && engineStatus.modelReady) ? (
            <p className="copmec-ai-setup-banner" role="status">
              AXO puede consultar datos del sistema. Para respuestas mas naturales y acciones avanzadas, activa el motor de IA local en el servidor.
            </p>
          ) : null}

          {/* Mensajes */}
          <div className="copmec-ai-messages">
            {messages.length === 0 && (
              <div className="copmec-ai-empty">
                <img src={logoIA} alt="AXO AI" className="copmec-ai-empty-logo" />
                <p>Soy el <strong>Cerebro Operativo de AXO</strong>.</p>
                <p>Analizo AXIS ORDO en tiempo real y puedo ejecutar acciones operativas cuando me lo pidas.</p>
                {engineStatus?.reachable && engineStatus?.modelReady ? (
                  <p className="copmec-ai-engine-note">Puedes pedirme iniciar, pausar o cerrar actividades en lenguaje natural.</p>
                ) : (
                  <p className="copmec-ai-engine-note">Ejemplo: &quot;inicia la actividad de piso de produccion&quot;</p>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`copmec-ai-message copmec-ai-message--${msg.role}`}>
                {msg.role === "ai" && (
                  <img src={logoIA} alt="AI" className="copmec-ai-msg-avatar" />
                )}
                <div className="copmec-ai-bubble">
                  {msg.role === "ai"
                    ? (
                      <div className="copmec-ai-content">
                        {parseMarkdownToJSX(msg.content)}
                        {msg.actionExecuted && (
                          <div className="copmec-ai-action-badge">
                            ✓ Accion aplicada en el sistema
                          </div>
                        )}
                        {msg.dashboardFixed && (
                          <div className="copmec-ai-fix-badge">
                            🔧 Correcciones aplicadas al sistema
                          </div>
                        )}
                        {msg.reportToken && (
                          <div className="copmec-ai-report-btns">
                            <span className="copmec-ai-report-label">📥 Descargar reporte:</span>
                            {(Array.isArray(msg.availableFormats) && msg.availableFormats.length > 0
                              ? msg.availableFormats
                              : ["pdf"]
                            ).map((fmt) => (
                              <button
                                key={`${msg.reportToken}-${fmt}`}
                                type="button"
                                className={`copmec-ai-download-btn copmec-ai-download-btn--${fmt}`}
                                onClick={() => downloadReport(msg.reportToken, fmt)}
                              >
                                {fmt.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                    : <span className="copmec-ai-user-text">{msg.content}</span>
                  }
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="copmec-ai-message copmec-ai-message--ai">
                <img src={logoIA} alt="AI" className="copmec-ai-msg-avatar" />
                <div className="copmec-ai-bubble copmec-ai-bubble--loading">
                  <span className="copmec-ai-dot" /><span className="copmec-ai-dot" /><span className="copmec-ai-dot" />
                  <span className="copmec-ai-thinking-label">
                    {engineStatus?.modelReady ? "AXO esta pensando..." : "Consultando datos..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Sugerencias rápidas (solo cuando hay pocos mensajes) */}
          {messages.length <= 2 && !isLoading && (
            <div className="copmec-ai-suggestions">
              {QUICK_SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="copmec-ai-suggestion-chip" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="copmec-ai-input-row">
            <textarea
              ref={inputRef}
              className="copmec-ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta operativa..."
              rows={1}
              maxLength={1000}
              disabled={isLoading}
            />
            <button
              type="button"
              className="copmec-ai-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              aria-label="Enviar"
            >
              ↑
            </button>
          </div>
        </div>
  );
}
