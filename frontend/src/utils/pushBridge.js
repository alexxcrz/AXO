import { playAppSoundUrl, resolveAppSoundUrl } from "./appSoundPlayer.js";
import { SOUND_PREF_KEY } from "./notificationSounds.js";
import { buildVibrationPattern, readVibrationPrefs } from "./vibrationPrefs.js";

export { APP_NOTIFICATION_SOUNDS, resolveAppSoundUrl } from "./appSoundPlayer.js";

const CHAT_AUDIO_KEY = "copmec_chat_audio_settings";

export function readChatAudioSettings() {
  try {
    const raw = localStorage.getItem(CHAT_AUDIO_KEY);
    const vibration = readVibrationPrefs();
    if (!raw) {
      return {
        msgSound: localStorage.getItem(SOUND_PREF_KEY) || "campana",
        callSound: "campana",
        msgVolume: 1,
        callVolume: 1,
        vibration,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      msgSound: parsed.msgSound || localStorage.getItem(SOUND_PREF_KEY) || "campana",
      callSound: parsed.callSound || "campana",
      msgVolume: Number(parsed.msgVolume) > 0 ? Number(parsed.msgVolume) : 1,
      callVolume: Number(parsed.callVolume) > 0 ? Number(parsed.callVolume) : 1,
      vibration,
    };
  } catch {
    return {
      msgSound: localStorage.getItem(SOUND_PREF_KEY) || "campana",
      callSound: "campana",
      msgVolume: 1,
      callVolume: 1,
      vibration: readVibrationPrefs(),
    };
  }
}

export async function syncNotificationPrefsToServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const settings = readChatAudioSettings();
    const vibration = settings.vibration || readVibrationPrefs();
    const target = reg.active || navigator.serviceWorker.controller;
    target?.postMessage?.({
      type: "SET_NOTIFICATION_PREFS",
      msgSound: settings.msgSound,
      callSound: settings.callSound,
      msgSoundUrl: resolveAppSoundUrl(settings.msgSound, "message"),
      callSoundUrl: resolveAppSoundUrl(settings.callSound, "call"),
      msgVibrationEnabled: vibration.msgEnabled,
      callVibrationEnabled: vibration.callEnabled,
      msgVibratePattern: buildVibrationPattern(vibration.msgRhythm, vibration.msgIntensity),
      callVibratePattern: buildVibrationPattern(vibration.callRhythm, vibration.callIntensity),
      transportVibratePattern: buildVibrationPattern("urgent", "strong"),
    });
  } catch {
    /* opcional */
  }
}

export function installServiceWorkerMessageBridge(handlers = {}) {
  if (!("serviceWorker" in navigator)) return () => {};

  const onMessage = (event) => {
    const msg = event?.data || {};
    if (msg.type === "PLAY_APP_SOUND") {
      const volume = Number(msg.volume) > 0 ? Number(msg.volume) : 1;
      playAppSoundUrl(msg.soundUrl, volume);
      return;
    }
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
