import { getNotificationSoundFile, NOTIFICATION_SOUNDS } from "./notificationSoundCatalog.js";

export const APP_NOTIFICATION_SOUNDS = Object.fromEntries(
  NOTIFICATION_SOUNDS.map((entry) => [entry.id, entry.file]),
);

APP_NOTIFICATION_SOUNDS.call = "/sounds/notification-call.wav";

const audioCache = new Map();

function clampVolume(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

export function resolveAppSoundUrl(soundId, kind = "message") {
  if (kind === "call") return APP_NOTIFICATION_SOUNDS.call;
  return getNotificationSoundFile(soundId);
}

export function toAbsoluteSoundUrl(url) {
  if (!url) return "";
  if (typeof window !== "undefined" && url.startsWith("/")) {
    return new URL(url, window.location.origin).href;
  }
  return String(url);
}

export function playAppSoundUrl(url, volume = 1) {
  if (!url || typeof window === "undefined") return Promise.resolve(false);
  const absoluteUrl = toAbsoluteSoundUrl(url);
  const vol = clampVolume(volume);

  try {
    let audio = audioCache.get(absoluteUrl);
    if (!audio) {
      audio = new Audio(absoluteUrl);
      audio.preload = "auto";
      audioCache.set(absoluteUrl, audio);
    }
    audio.volume = vol;
    audio.currentTime = 0;
    return audio.play().then(() => true).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

export function playAppSoundById(soundId, options = {}) {
  const kind = options.kind || "message";
  const url = resolveAppSoundUrl(soundId, kind);
  return playAppSoundUrl(url, options.volume ?? 1);
}
