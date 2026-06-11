export const NOTIFICATION_SOUNDS = [
  { id: "campana", label: "Campana", icon: "campana", file: "/sounds/notification-alert.wav" },
  { id: "urgent", label: "Urgente", icon: "urgent", file: "/sounds/sound-urgent.wav" },
  { id: "ping", label: "Ping", icon: "ping", file: "/sounds/chat-ping.wav" },
  { id: "digital", label: "Digital", icon: "digital", file: "/sounds/chat-digital.wav" },
  { id: "pop", label: "Pop", icon: "pop", file: "/sounds/sound-pop.wav" },
  { id: "tap", label: "Toque", icon: "tap", file: "/sounds/sound-tap.wav" },
  { id: "nudge", label: "Nudge", icon: "nudge", file: "/sounds/sound-nudge.wav" },
  { id: "bright", label: "Brillo", icon: "bright", file: "/sounds/sound-bright.wav" },
  { id: "burbuja", label: "Burbuja", icon: "burbuja", file: "/sounds/sound-burbuja.wav" },
  { id: "marimba", label: "Marimba", icon: "marimba", file: "/sounds/sound-marimba.wav" },
  { id: "chime", label: "Chime", icon: "chime", file: "/sounds/sound-chime.wav" },
  { id: "cristal", label: "Cristal", icon: "cristal", file: "/sounds/sound-cristal.wav" },
  { id: "wave", label: "Onda", icon: "wave", file: "/sounds/sound-wave.wav" },
  { id: "pulso", label: "Pulso", icon: "pulso", file: "/sounds/sound-pulso.wav" },
  { id: "soft", label: "Suave", icon: "soft", file: "/sounds/sound-soft.wav" },
  { id: "alertSoft", label: "Camp. suave", icon: "alertSoft", file: "/sounds/sound-alert-soft.wav" },
  { id: "zen", label: "Zen", icon: "zen", file: "/sounds/sound-zen.wav" },
];

export const SOUND_PREF_KEY = "copmec_notification_sound";

export function getNotificationSoundFile(soundId) {
  const found = NOTIFICATION_SOUNDS.find((entry) => entry.id === soundId);
  return found?.file || "/sounds/notification-alert.wav";
}

export function getSoundPref() {
  const stored = localStorage.getItem(SOUND_PREF_KEY) || "campana";
  if (NOTIFICATION_SOUNDS.some((entry) => entry.id === stored)) return stored;
  return "campana";
}

export function setSoundPref(id) {
  localStorage.setItem(SOUND_PREF_KEY, id);
}
