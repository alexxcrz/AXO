/**
 * Implementacion completa de Ollama — SOLO DESARROLLO LOCAL.
 * Copia este archivo a ollama.local.service.js (ese archivo esta en .gitignore).
 * https://ollama.com
 */

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getOllamaConfig() {
  const explicitBase = String(process.env.OLLAMA_BASE_URL || "").trim();
  const enabledFlag = String(process.env.OLLAMA_ENABLED || "true").trim().toLowerCase();
  const enabled = !["0", "false", "no", "off"].includes(enabledFlag);
  const baseUrl = (explicitBase || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = String(process.env.OLLAMA_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const timeoutMs = parseInteger(process.env.OLLAMA_TIMEOUT_MS, 120000);

  return { baseUrl, model, enabled, timeoutMs };
}

export function isOllamaConfigured() {
  const { enabled } = getOllamaConfig();
  return enabled;
}

export function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function getOllamaStatus() {
  const config = getOllamaConfig();
  if (!config.enabled) {
    return {
      configured: false,
      reachable: false,
      model: config.model,
      baseUrl: config.baseUrl,
      message: "Ollama desactivado (OLLAMA_ENABLED=false).",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        configured: true,
        reachable: false,
        model: config.model,
        baseUrl: config.baseUrl,
        message: `Ollama respondio HTTP ${response.status}.`,
      };
    }

    const payload = await response.json();
    const models = Array.isArray(payload?.models)
      ? payload.models.map((item) => String(item?.name || "").trim()).filter(Boolean)
      : [];
    const hasModel = models.some((name) => name === config.model || name.startsWith(`${config.model}:`));

    return {
      configured: true,
      reachable: true,
      model: config.model,
      baseUrl: config.baseUrl,
      modelsAvailable: models.slice(0, 12),
      modelReady: hasModel,
      message: hasModel
        ? "Ollama conectado y modelo listo."
        : `Ollama conectado. Ejecuta: ollama pull ${config.model}`,
    };
  } catch (error) {
    const aborted = error?.name === "AbortError";
    return {
      configured: true,
      reachable: false,
      model: config.model,
      baseUrl: config.baseUrl,
      message: aborted
        ? "Ollama no respondio a tiempo. Verifica que este corriendo."
        : "Ollama no esta accesible. Instala desde ollama.com y ejecuta ollama serve.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function ollamaChat({
  messages,
  format = null,
  temperature = 0.3,
  model = null,
} = {}) {
  const config = getOllamaConfig();
  if (!config.enabled) {
    throw new Error("Ollama desactivado.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const body = {
      model: model || config.model,
      stream: false,
      messages: Array.isArray(messages) ? messages : [],
      options: { temperature },
    };
    if (format) body.format = format;

    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ollama HTTP ${response.status}: ${errorText.slice(0, 220)}`);
    }

    const payload = await response.json();
    return String(payload?.message?.content || "").trim();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Ollama tardo demasiado en responder. Prueba un modelo mas ligero (llama3.2).");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ollamaChatJson({ system, user, temperature = 0.2, model = null }) {
  const content = await ollamaChat({
    model,
    temperature,
    format: "json",
    messages: [
      { role: "system", content: String(system || "") },
      { role: "user", content: String(user || "") },
    ],
  });
  const parsed = extractJsonObject(content);
  if (!parsed) throw new Error("Ollama no devolvio JSON valido.");
  return parsed;
}

export async function ensureOllamaModel(modelName = null) {
  const config = getOllamaConfig();
  const model = modelName || config.model;
  const status = await getOllamaStatus();
  if (!status.reachable) return status;

  if (status.modelReady) return status;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600000);

  try {
    await fetch(`${config.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model, stream: false }),
      signal: controller.signal,
    });
    return getOllamaStatus();
  } finally {
    clearTimeout(timeout);
  }
}
