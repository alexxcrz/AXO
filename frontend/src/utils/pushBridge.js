import { SOUND_PREF_KEY } from "./notificationSounds.js";

const CHAT_AUDIO_KEY = "copmec_chat_audio_settings";

/** Rutas de tonos propios (misma carpeta public/sounds) � evita sonido del sistema cuando el SO lo permite */
export const APP_NOTIFICATION_SOUNDS = {
  burbuja: "/sounds/notification-alert.wav",
  campana: "/sounds/notification-alert.wav",
  ping: "/sounds/chat-ping.wav",
  marimba: "/sounds/notification-alert.wav",
  digital: "/sounds/chat-digital.wav",
  cristal: "/sounds/notification-alert.wav",
  pulso: "/sounds/notification-alert.wav",
  chime: "/sounds/notification-alert.wav",
  call: "/sounds/notification-call.wav",
};

export function readChatAudioSettings() {
  try {
    const raw = localStorage.getItem(CHAT_AUDIO_KEY);
    if (!raw) {
      return {
        msgSound: localStorage.getItem(SOUND_PREF_KEY) || "campana",
        callSound: "campana",
        msgVolume: 1,
        callVolume: 1,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      msgSound: parsed.msgSound || localStorage.getItem(SOUND_PREF_KEY) || "campana",
      callSound: parsed.callSound || "campana",
      msgVolume: Number(parsed.msgVolume) > 0 ? Number(parsed.msgVolume) : 1,
      callVolume: Number(parsed.callVolume) > 0 ? Number(parsed.callVolume) : 1,
    };
  } catch {
    return {
      msgSound: localStorage.getItem(SOUND_PREF_KEY) || "campana",
      callSound: "campana",
      msgVolume: 1,
      callVolume: 1,
    };
  }
}

export function resolveAppSoundUrl(soundId, kind = "message") {
  if (kind === "call") return APP_NOTIFICATION_SOUNDS.call;
  return APP_NOTIFICATION_SOUNDS[soundId] || APP_NOTIFICATION_SOUNDS.campana;
}

export async function syncNotificationPrefsToServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const settings = readChatAudioSettings();
    const target = reg.active || navigator.serviceWorker.controller;
    target?.postMessage?.({
      type: "SET_NOTIFICATION_PREFS",
      msgSound: settings.msgSound,
      callSound: settings.callSound,
      msgSoundUrl: resolveAppSoundUrl(settings.msgSound, "message"),
      callSoundUrl: resolveAppSoundUrl(settings.callSound, "call"),
    });
  } catch {
    /* opcional */
  }
}

export function installServiceWorkerMessageBridge(handlers = {}) {
  if (!("serviceWorker" in navigator)) return () => {};

  const onMessage = (event) => {
    const msg = event?.data || {};
    if (msg.type === "NOTIFICATION_CLICK" && handlers.onNotificationClick) {
      handlers.onNotificationClick(msg.data || {});
      return;
    }
    if (msg.type === "PUSH_REPLY" && handlers.onPushReply) {
      handlers.onPushReply(msg.data || {});
      return;
    }
    if (msg.type === "REJECT_CALL" && handlers.onRejectCall) {
      handlers.onRejectCall(msg.data || {});
    }
  };

  navigator.serviceWorker.addEventListener("message", onMessage);
  return () => navigator.serviceWorker.removeEventListener("message", onMessage);
}

export function dispatchAxoOpenChat(detail) {
  window.dispatchEvent(new CustomEvent("axo-open-chat", { detail }));
}
