import { Router } from "express";
import { clearSessionCookie, isMasterCredentials, setSessionCookie } from "../config/auth.js";
import { requireRoles } from "../middleware/auth.middleware.js";
import { auditSecurityEvent, readSecurityEvents } from "../services/security-events.service.js";
import { BOOTSTRAP_MASTER_ID, authenticateWarehouseUser, bootstrapFirstLeadUser, changeWarehouseSelfPassword, deleteOwnWarehouseAccount, getLoginDirectory, hasLeadUser, resetWarehouseUserPassword, sanitizeUserRecord } from "../services/warehouse.store.js";
import { STRONG_PASSWORD_MIN_LENGTH, TEMPORARY_PASSWORD_MIN_LENGTH } from "../utils/passwords.js";

const ROLE_LEAD = "Lead";
const ROLE_SR = "Senior (Sr)";

// ── Account lockout ────────────────────────────────────────────────────────────
// Tracks failed attempts per key (login + IP). After MAX_ATTEMPTS failures within
// WINDOW_MS the account is locked for LOCKOUT_MS. Cleared on successful login.
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 10 * 60 * 1000;   // 10 min
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min lock

const failedAttempts = new Map(); // key → { count, firstAt, lockedUntil }

function getLockoutKey(login, req) {
  return `${String(login).toLowerCase()}::${req.ip || ""}`;
}

function checkLockout(login, req) {
  const key = getLockoutKey(login, req);
  const entry = failedAttempts.get(key);
  if (!entry) return null;

  const now = Date.now();
  // Clear stale window entries
  if (entry.lockedUntil && now > entry.lockedUntil) {
    failedAttempts.delete(key);
    return null;
  }
  if (!entry.lockedUntil && now - entry.firstAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(key);
    return null;
  }

  if (entry.lockedUntil && now <= entry.lockedUntil) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { locked: true, remainingSeconds };
  }
  return null;
}

function recordFailedAttempt(login, req) {
  const key = getLockoutKey(login, req);
  const now = Date.now();
  const entry = failedAttempts.get(key) || { count: 0, firstAt: now, lockedUntil: null };

  if (now - entry.firstAt > LOCKOUT_WINDOW_MS) {
    entry.count = 0;
    entry.firstAt = now;
    entry.lockedUntil = null;
  }

  entry.count += 1;
  if (entry.count >= LOCKOUT_MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
  failedAttempts.set(key, entry);
}

function clearFailedAttempts(login, req) {
  failedAttempts.delete(getLockoutKey(login, req));
}
// ──────────────────────────────────────────────────────────────────────────────

export const authRouter = Router();

authRouter.get("/login-options", (_req, res) => {
  res.json(getLoginDirectory());
});

// Hard limits to prevent hash-length DoS (scrypt is expensive on large inputs).
const MAX_LOGIN_LENGTH = 254;   // RFC 5321 max email length
const MAX_PASSWORD_LENGTH = 256;

authRouter.post("/login", (req, res) => {
  const login = String(req.body?.email || req.body?.login || "").trim();
  const password = String(req.body?.password || "");

  if (!login || !password) {
    auditSecurityEvent("login_failed", req, { reason: "missing_credentials", login: login.slice(0, 60) });
    res.status(400).json({ ok: false, message: "Credenciales incompletas." });
    return;
  }

  if (login.length > MAX_LOGIN_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    auditSecurityEvent("login_failed", req, { reason: "input_too_long", login: login.slice(0, 60) });
    res.status(400).json({ ok: false, message: "Credenciales inválidas." });
    return;
  }

  // Check lockout before doing any credential work
  const lockout = checkLockout(login, req);
  if (lockout) {
    const minutes = Math.ceil(lockout.remainingSeconds / 60);
    auditSecurityEvent("login_blocked_lockout", req, { login, remainingSeconds: lockout.remainingSeconds });
    res.status(429).json({ ok: false, message: `Cuenta bloqueada por demasiados intentos fallidos. Intenta en ${minutes} min.` });
    return;
  }

  const directory = getLoginDirectory();
  if (directory.system.masterBootstrapEnabled && isMasterCredentials(login, password)) {
    clearFailedAttempts(login, req);
    setSessionCookie(res, { type: "master", userId: BOOTSTRAP_MASTER_ID });
    auditSecurityEvent("login_success", req, { login, authType: "master" });
    res.json({ ok: true, userId: BOOTSTRAP_MASTER_ID, isBootstrapMaster: true });
    return;
  }

  const user = authenticateWarehouseUser(login, password);
  if (!user) {
    recordFailedAttempt(login, req);
    const remaining = LOCKOUT_MAX_ATTEMPTS - (failedAttempts.get(getLockoutKey(login, req))?.count || 0);
    const attemptsLeft = Math.max(0, remaining);
    auditSecurityEvent("login_failed", req, { reason: "invalid_credentials", login, attemptsLeft });
    const hint = attemptsLeft > 0 ? ` (${attemptsLeft} intentos restantes)` : "";
    res.status(401).json({ ok: false, message: `Credenciales inválidas.${hint}` });
    return;
  }

  clearFailedAttempts(login, req);
  setSessionCookie(res, { type: "user", userId: user.id, sessionVersion: user.sessionVersion || 1 });
  auditSecurityEvent("login_success", req, { login, authType: "user", userId: user.id, role: user.role });
  res.json({ ok: true, userId: user.id, user: sanitizeUserRecord(user), mustChangePassword: Boolean(user.mustChangePassword), isBootstrapMaster: false });
});

authRouter.get("/session", (req, res) => {
  if (!req.auth) {
    res.status(401).json({ ok: false, message: "Sin sesión activa." });
    return;
  }

  if (req.auth.type === "master") {
    res.json({ ok: true, userId: BOOTSTRAP_MASTER_ID, isBootstrapMaster: true, hasLeadUser: hasLeadUser() });
    return;
  }

  res.json({ ok: true, userId: req.auth.user.id, user: sanitizeUserRecord(req.auth.user), mustChangePassword: Boolean(req.auth.user.mustChangePassword), isBootstrapMaster: false });
});

authRouter.get("/security-events", requireRoles([ROLE_LEAD, ROLE_SR]), (req, res) => {
  const limit = Number(req.query.limit || 200);
  res.json({ ok: true, data: readSecurityEvents(limit) });
});

authRouter.patch("/password", (req, res) => {
  const result = changeWarehouseSelfPassword(req.auth, req.body?.password || "");
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : 400;
    res.status(status).json({ ok: false, message: result.reason === "weak_password" ? `La contraseña debe tener al menos ${STRONG_PASSWORD_MIN_LENGTH} caracteres e incluir mayúscula, minúscula, número y símbolo.` : "No fue posible actualizar la contraseña." });
    return;
  }

  setSessionCookie(res, { type: "user", userId: result.user.id, sessionVersion: result.user.sessionVersion || 1 });
  auditSecurityEvent("self_password_changed", req, { userId: result.user.id, role: result.user.role });
  res.json({ ok: true, data: { state: result.state, userId: result.user.id, mustChangePassword: Boolean(result.user.mustChangePassword) } });
});

authRouter.patch("/users/:userId/password", requireRoles([ROLE_LEAD, ROLE_SR]), (req, res) => {
  const result = resetWarehouseUserPassword(req.auth, req.params.userId, req.body?.password || "");
  if (!result.ok) {
    const status = result.reason === "auth_required" ? 401 : result.reason === "user_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    res.status(status).json({ ok: false, message: result.reason === "weak_temporary_password" ? `La contraseña temporal debe tener al menos ${TEMPORARY_PASSWORD_MIN_LENGTH} caracteres.` : "No fue posible restablecer la contraseña." });
    return;
  }

  auditSecurityEvent("user_password_reset", req, { targetUserId: result.userId, targetUserName: result.userName });
  res.json({ ok: true, data: { state: result.state, userId: result.userId, userName: result.userName, mustChangePassword: true } });
});

authRouter.delete("/account", (req, res) => {
  const result = deleteOwnWarehouseAccount(req.auth, req.body?.password || "");
  if (!result.ok) {
    const status = result.reason === "auth_required"
      ? 401
      : result.reason === "invalid_password"
        ? 400
        : 403;
    const message = result.reason === "invalid_password"
      ? "La contraseña no es correcta."
      : result.reason === "sole_lead"
        ? "No puedes eliminar tu cuenta si eres el unico Lead activo. Transfiere el liderazgo primero."
        : "No fue posible eliminar tu cuenta.";
    res.status(status).json({ ok: false, message });
    return;
  }

  auditSecurityEvent("self_account_deleted", req, { userId: result.userId, userName: result.userName });
  clearSessionCookie(res);
  res.json({ ok: true, data: { state: result.state, userId: result.userId } });
});

authRouter.post("/logout", (_req, res) => {
  auditSecurityEvent("logout", _req);
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.post("/bootstrap-lead", (req, res) => {
  if (req.auth?.type !== "master") {
    auditSecurityEvent("bootstrap_lead_unauthorized", req);
    res.status(401).json({ ok: false, message: "Acceso de maestro requerido para configuración inicial." });
    return;
  }

  const result = bootstrapFirstLeadUser(req.body || {});
  if (!result.ok) {
    const status = result.reason === "lead_already_exists" || result.reason === "bootstrap_not_enabled" ? 409 : 400;
    const message =
      result.reason === "weak_password"
        ? `La contraseña debe tener al menos ${STRONG_PASSWORD_MIN_LENGTH} caracteres e incluir mayúscula, minúscula, número y símbolo.`
        : result.reason === "invalid_payload"
          ? "Completa todos los campos requeridos: nombre, correo/usuario, área, cargo y contraseña."
          : result.reason === "lead_already_exists"
            ? "Ya existe un usuario Lead. La configuración inicial ya fue completada."
            : "El modo de configuración inicial no está activo.";
    res.status(status).json({ ok: false, message });
    return;
  }

  setSessionCookie(res, { type: "user", userId: result.userId, sessionVersion: result.user?.sessionVersion || 1 });
  auditSecurityEvent("bootstrap_lead_created", req, { userId: result.userId });
  res.status(201).json({ ok: true, userId: result.userId, user: sanitizeUserRecord(result.user), state: result.state });
});