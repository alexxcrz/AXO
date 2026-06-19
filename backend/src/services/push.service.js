// push.service.js — Web Push / VAPID notification sender
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSocketsByNickname } from '../config/socket.js';
import { getWarehouseState } from './warehouse.store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = process.env.RENDER ? '/var/data' : path.resolve(__dirname, '../../data');
const subsFile = path.join(dataDirectory, 'push-subscriptions.json');
const vapidKeysFile = path.join(dataDirectory, 'vapid-keys.json');

let webpush = null;
let vapidPublicKey = null;
let pushReady = false;
let vapidSource = 'none';

function loadPersistedVapidKeys() {
  try {
    if (!fs.existsSync(vapidKeysFile)) return null;
    const parsed = JSON.parse(fs.readFileSync(vapidKeysFile, 'utf8'));
    if (!parsed?.publicKey || !parsed?.privateKey) return null;
    return { publicKey: parsed.publicKey, privateKey: parsed.privateKey };
  } catch {
    return null;
  }
}

function savePersistedVapidKeys(keys) {
  try {
    if (!fs.existsSync(dataDirectory)) fs.mkdirSync(dataDirectory, { recursive: true });
    fs.writeFileSync(vapidKeysFile, JSON.stringify(keys, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Push] No se pudieron guardar claves VAPID persistentes:', err.message);
  }
}

// Lazy-initialize web-push so the server starts even if web-push is not yet installed
async function initWebPush() {
  try {
    const mod = await import('web-push');
    webpush = mod.default ?? mod;

    const envPublicKey  = process.env.VAPID_PUBLIC_KEY;
    const envPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const subject       = process.env.VAPID_EMAIL || 'mailto:admin@copmec.local';

    let keys = null;
    if (envPublicKey && envPrivateKey) {
      keys = { publicKey: envPublicKey, privateKey: envPrivateKey };
      vapidSource = 'env';
    } else {
      const persisted = loadPersistedVapidKeys();
      if (persisted) {
        keys = persisted;
        vapidSource = 'file';
      } else {
        keys = webpush.generateVAPIDKeys();
        savePersistedVapidKeys(keys);
        vapidSource = 'generated';
        console.log('[Push] ⚠️  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no configuradas.');
        console.log('[Push]    Se generaron y guardaron claves persistentes locales.');
        console.log('[Push]    Recomendado: configurar estas líneas en .env y Render:');
        console.log(`           VAPID_PUBLIC_KEY=${keys.publicKey}`);
        console.log(`           VAPID_PRIVATE_KEY=${keys.privateKey}`);
      }
    }

    webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
    vapidPublicKey = keys.publicKey;
    pushReady = true;
    console.log(`[Push] ✓ Web Push listo (source=${vapidSource})`);
  } catch (err) {
    console.warn('[Push] web-push no disponible — notificaciones push desactivadas:', err.message);
  }
}

initWebPush().catch(() => {});

// ── Subscription storage (JSON file) ──────────────────────────────────────────
function loadSubs() {
  try {
    if (fs.existsSync(subsFile)) return JSON.parse(fs.readFileSync(subsFile, 'utf8'));
  } catch (_) {}
  return {};
}

function saveSubs(subs) {
  try {
    if (!fs.existsSync(dataDirectory)) fs.mkdirSync(dataDirectory, { recursive: true });
    fs.writeFileSync(subsFile, JSON.stringify(subs, null, 2), 'utf8');
  } catch (_) {}
}

function normNick(nick) {
  return String(nick || '').trim().toLowerCase();
}

function buildUserAliases(userLike) {
  const aliases = [
    userLike?.id,
    userLike?.name,
    userLike?.nickname,
    userLike?.email,
    userLike?.login,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const email = String(userLike?.email || userLike?.login || '').trim();
  if (email.includes('@')) {
    const localPart = email.split('@')[0]?.trim();
    if (localPart) aliases.push(localPart);
  }
  return Array.from(new Set(aliases));
}

function resolveTargetAliases(targetNickname) {
  const raw = String(targetNickname || '').trim();
  if (!raw) return [];

  const targetKey = normNick(raw);
  const userMatch = (getWarehouseState().users || []).find((user) => {
    const aliases = buildUserAliases(user);
    return aliases.some((alias) => normNick(alias) === targetKey);
  });

  return Array.from(new Set([raw, ...buildUserAliases(userMatch)]));
}

function collectSubscriptionsForNickname(nickname) {
  const aliases = resolveTargetAliases(nickname);
  const seenEndpoints = new Set();
  const merged = [];
  aliases.forEach((alias) => {
    (getSubscriptionsForNick(alias) || []).forEach((sub) => {
      if (!sub?.endpoint || seenEndpoints.has(sub.endpoint)) return;
      seenEndpoints.add(sub.endpoint);
      merged.push(sub);
    });
  });
  return merged;
}

export function storeSubscription(nickname, subscription) {
  const nick = String(nickname || '').trim();
  if (!nick || !subscription?.endpoint) return;
  const subs = loadSubs();
  if (!subs[nick]) subs[nick] = [];
  if (!subs[nick].some((s) => s.endpoint === subscription.endpoint)) {
    subs[nick].push(subscription);
  }
  subs[nick] = subs[nick].slice(-5);
  saveSubs(subs);
}

/** Registra la suscripción bajo todos los alias del usuario (nombre, email, etc.) */
export function storeSubscriptionForUser(userLike, subscription) {
  let aliases = buildUserAliases(userLike);
  if (!aliases.length && userLike?.name) aliases = [String(userLike.name)];
  aliases.forEach((alias) => storeSubscription(alias, subscription));
}

export function removeSubscriptionByEndpoint(endpoint) {
  const subs = loadSubs();
  let changed = false;
  Object.keys(subs).forEach((nick) => {
    const before = subs[nick].length;
    subs[nick] = subs[nick].filter((s) => s.endpoint !== endpoint);
    if (subs[nick].length !== before) changed = true;
  });
  if (changed) saveSubs(subs);
}

export function getSubscriptionsForNick(nickname) {
  return loadSubs()[normNick(nickname)] || [];
}

// ── Send push ──────────────────────────────────────────────────────────────────
export async function sendPushToNick(nickname, payload, options = {}) {
  if (!pushReady || !webpush) return;

  const { skipIfOnline = false } = options;
  if (skipIfOnline && getSocketsByNickname(nickname).length > 0) {
    return;
  }

  const subscriptions = collectSubscriptionsForNickname(nickname);
  if (!subscriptions.length) return;

  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payloadStr);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          removeSubscriptionByEndpoint(sub.endpoint);
          return;
        }
        const pushErr = err?.statusCode || err?.code || err?.message || "push_failed";
        console.warn(`[Push] Error enviando push a ${normNick(nickname)}: ${pushErr}`);
      }
    }),
  );
}

export function getVapidPublicKey() { return vapidPublicKey; }
export function isPushReady()       { return pushReady; }
export function getPushStatusSnapshot() {
  return {
    ready: pushReady,
    hasPublicKey: Boolean(vapidPublicKey),
    vapidSource,
  };
}
