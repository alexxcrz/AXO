import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureBoardCardLayout } from "../shared/boardCardLayout.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

loadEnvFile(path.resolve(__dirname, "../backend/.env"));
loadEnvFile(path.resolve(__dirname, "../backend/.env.render"));

const RENDER_API_URL = String(process.env.RENDER_API_URL || process.env.BACKEND_URL || "https://copmec.onrender.com").replace(/\/$/, "");
const RENDER_LOGIN = String(process.env.RENDER_LOGIN || process.env.RENDER_EMAIL || "alexxcm").trim();
const RENDER_PASSWORD = String(process.env.RENDER_PASSWORD || "");
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "copmec_session";
const LOCAL_STATE_PATH = path.resolve(__dirname, "../backend/data/warehouse-state.json");
const BOARDS_ONLY = process.argv.includes("--boards-only");

function extractSessionCookie(setCookieHeader) {
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader].filter(Boolean);
  for (const header of headers) {
    const match = String(header).match(new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) return `${SESSION_COOKIE_NAME}=${match[1]}`;
  }
  return "";
}

async function loginToRender() {
  if (!RENDER_LOGIN || !RENDER_PASSWORD) {
    throw new Error(
      "Falta RENDER_PASSWORD. Agrgala en backend/.env (misma contrasea que en copmec.onrender.com). Usuario: alexxcm.",
    );
  }

  const response = await fetch(`${RENDER_API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: RENDER_LOGIN, password: RENDER_PASSWORD }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Login fall (${response.status}): ${payload?.message || "credenciales invlidas"}`);
  }

  const cookie = extractSessionCookie(response.headers.getSetCookie?.() || response.headers.get("set-cookie"));
  if (!cookie) {
    throw new Error("Login OK pero Render no devolvi cookie de sesin.");
  }

  return cookie;
}

async function fetchRenderWarehouseState(sessionCookie) {
  if (!RENDER_API_URL) {
    throw new Error("Define RENDER_API_URL (ej. https://copmec.onrender.com)");
  }

  const response = await fetch(`${RENDER_API_URL}/api/warehouse/state`, {
    headers: { Cookie: sessionCookie },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Render respondi ${response.status}: ${text.slice(0, 500)}`);
  }

  const payload = JSON.parse(text);
  return payload?.data?.state || payload?.state || payload;
}

function mergeBoardsIntoLocalState(localState, remoteState) {
  const remoteBoards = Array.isArray(remoteState?.controlBoards) ? remoteState.controlBoards : [];
  if (!remoteBoards.length) {
    throw new Error("Render no devolvi tableros (controlBoards vaco).");
  }

  const nextBoards = remoteBoards.map((board) => ensureBoardCardLayout(board));
  const localBoards = Array.isArray(localState?.controlBoards) ? localState.controlBoards : [];
  const mergedById = new Map(localBoards.map((board) => [board.id, board]));

  nextBoards.forEach((board) => {
    mergedById.set(board.id, board);
  });

  return {
    ...localState,
    controlBoards: [...mergedById.values()],
    boardTemplates: Array.isArray(remoteState?.boardTemplates) && remoteState.boardTemplates.length
      ? remoteState.boardTemplates
      : localState.boardTemplates,
    revision: Number(localState.revision || 0) + 1,
  };
}

async function main() {
  console.log(`Conectando a ${RENDER_API_URL || "(sin URL)"}...`);
  const sessionCookie = await loginToRender();
  console.log("Sesin obtenida. Descargando estado...");

  const remoteState = await fetchRenderWarehouseState(sessionCookie);
  const remoteBoards = remoteState?.controlBoards || [];
  console.log(`Render ? ${remoteBoards.length} tablero(s):`);
  remoteBoards.forEach((board) => console.log(`  - ${board.id}  ${board.name}`));

  if (!fs.existsSync(LOCAL_STATE_PATH)) {
    throw new Error(`No existe ${LOCAL_STATE_PATH}`);
  }

  const localState = JSON.parse(fs.readFileSync(LOCAL_STATE_PATH, "utf8"));
  const nextState = mergeBoardsIntoLocalState(localState, remoteState);

  const exportPath = BOARDS_ONLY
    ? path.resolve(__dirname, "../backend/data/render-boards-import.json")
    : LOCAL_STATE_PATH;

  fs.writeFileSync(
    exportPath,
    `${JSON.stringify(BOARDS_ONLY ? { controlBoards: nextState.controlBoards } : nextState, null, 2)}\n`,
    "utf8",
  );
  console.log(`Guardado en ${exportPath}`);
  console.log(`Dev local ? ${nextState.controlBoards.length} tablero(s) total`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
