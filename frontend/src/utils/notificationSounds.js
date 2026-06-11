import { playAppSoundById } from "./appSoundPlayer.js";
import {
  NOTIFICATION_SOUNDS,
  SOUND_PREF_KEY,
  getSoundPref,
  setSoundPref,
} from "./notificationSoundCatalog.js";

export {
  NOTIFICATION_SOUNDS,
  SOUND_PREF_KEY,
  getSoundPref,
  setSoundPref,
} from "./notificationSoundCatalog.js";

let audioGestureUnlocked = false;
let audioUnlockListenersBound = false;

function detachAudioUnlockListeners() {
  if (!audioUnlockListenersBound) return;
  document.removeEventListener("click", handleAudioUnlockGesture);
  document.removeEventListener("pointerdown", handleAudioUnlockGesture);
  document.removeEventListener("keydown", handleAudioUnlockGesture);
  document.removeEventListener("touchstart", handleAudioUnlockGesture);
  audioUnlockListenersBound = false;
}

function handleAudioUnlockGesture() {
  audioGestureUnlocked = true;
  detachAudioUnlockListeners();
}

export function ensureAudioGestureUnlock() {
  if (audioGestureUnlocked) return true;
  if (typeof document === "undefined") return false;
  if (!audioUnlockListenersBound) {
    document.addEventListener("click", handleAudioUnlockGesture, { once: true });
    document.addEventListener("pointerdown", handleAudioUnlockGesture, { once: true });
    document.addEventListener("keydown", handleAudioUnlockGesture, { once: true });
    document.addEventListener("touchstart", handleAudioUnlockGesture, { once: true });
    audioUnlockListenersBound = true;
  }
  return audioGestureUnlocked;
}

function getCtx() {
  try {
    return new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return null;
  }
}

const clampVolume = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 1;
  return Math.min(1, Math.max(0, n));
};

const RING_PLAYERS = {
  ringIncoming(ctx, volume = 1) {
    const vol = clampVolume(volume);
    const t = ctx.currentTime;
    [[920, 0], [920, 0.18], [740, 0.62], [740, 0.8]].forEach(([freq, start]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      const noteStart = t + start;
      osc.frequency.setValueAtTime(freq, noteStart);
      gain.gain.setValueAtTime(0.26 * vol, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.24);
      osc.start(noteStart);
      osc.stop(noteStart + 0.25);
    });
  },
  ringOutgoing(ctx, volume = 1) {
    const vol = clampVolume(volume);
    const t = ctx.currentTime;
    [[480, 0], [440, 0], [480, 0.6], [440, 0.6]].forEach(([freq, start]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const noteStart = t + start;
      osc.frequency.setValueAtTime(freq, noteStart);
      gain.gain.setValueAtTime(0.2 * vol, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.42);
      osc.start(noteStart);
      osc.stop(noteStart + 0.43);
    });
  },
};

export function playNotificationSound(id, options = {}) {
  if (!ensureAudioGestureUnlock()) return false;
  const soundId = id || getSoundPref();
  if (soundId === "ringIncoming" || soundId === "ringOutgoing") {
    const player = RING_PLAYERS[soundId];
    const ctx = getCtx();
    if (!player || !ctx) return false;
    if (ctx.state === "suspended") {
      ctx.resume().then(() => player(ctx, options.volume ?? 1));
    } else {
      player(ctx, options.volume ?? 1);
    }
    return true;
  }

  const kind = options.kind || "message";
  const volume = options.volume ?? 1;
  playAppSoundById(soundId, { kind, volume });
  return true;
}
