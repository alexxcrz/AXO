/**
 * Puente Ollama: produccion usa stubs; desarrollo local carga ollama.local.service.js (gitignored).
 * Plantilla local: ollama.local.service.example.js
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_MODULE_PATH = join(__dirname, "ollama.local.service.js");

const hasLocalOllama = existsSync(LOCAL_MODULE_PATH);

let localModulePromise = null;

function loadLocalModule() {
  if (!hasLocalOllama) return Promise.resolve(null);
  if (!localModulePromise) {
    localModulePromise = import("./ollama.local.service.js");
  }
  return localModulePromise;
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

export function getOllamaConfig() {
  if (!hasLocalOllama) {
    return { baseUrl: "", model: "llama3.2", enabled: false, timeoutMs: 120000 };
  }
  const enabledFlag = String(process.env.OLLAMA_ENABLED || "true").trim().toLowerCase();
  const enabled = !["0", "false", "no", "off"].includes(enabledFlag);
  const baseUrl = String(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = String(process.env.OLLAMA_MODEL || "llama3.2").trim() || "llama3.2";
  return { baseUrl, model, enabled, timeoutMs: 120000 };
}

export function isOllamaConfigured() {
  if (!hasLocalOllama) return false;
  const { enabled } = getOllamaConfig();
  return enabled;
}

const PRODUCTION_STATUS = {
  configured: false,
  reachable: false,
  modelReady: false,
  model: "llama3.2",
  baseUrl: "",
  message: "IA local solo disponible en desarrollo. En produccion se usan plantillas inteligentes.",
};

export async function getOllamaStatus() {
  const local = await loadLocalModule();
  if (local?.getOllamaStatus) return local.getOllamaStatus();
  return PRODUCTION_STATUS;
}

export async function ollamaChat(options = {}) {
  const local = await loadLocalModule();
  if (local?.ollamaChat) return local.ollamaChat(options);
  throw new Error("Ollama no disponible en este entorno.");
}

export async function ollamaChatJson(options = {}) {
  const local = await loadLocalModule();
  if (local?.ollamaChatJson) return local.ollamaChatJson(options);
  throw new Error("Ollama no disponible en este entorno.");
}

export async function ensureOllamaModel(modelName = null) {
  const local = await loadLocalModule();
  if (local?.ensureOllamaModel) return local.ensureOllamaModel(modelName);
  return PRODUCTION_STATUS;
}
