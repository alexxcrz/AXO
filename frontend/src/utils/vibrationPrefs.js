export const VIBRATION_INTENSITY_OPTIONS = [
  { id: "soft", label: "Suave", scale: 0.55 },
  { id: "medium", label: "Media", scale: 1 },
  { id: "strong", label: "Fuerte", scale: 1.35 },
  { id: "max", label: "Maxima", scale: 1.75 },
];

export const VIBRATION_RHYTHM_OPTIONS = [
  { id: "simple", label: "Simple", pattern: [180, 90, 180] },
  { id: "doble", label: "Doble", pattern: [140, 70, 140, 70, 140] },
  { id: "triple", label: "Triple", pattern: [110, 55, 110, 55, 110, 55, 110] },
  { id: "pulso", label: "Pulso", pattern: [90, 45, 90, 45, 90, 45, 90, 45, 90] },
  { id: "urgent", label: "Urgente", pattern: [260, 90, 260, 90, 260, 90, 260] },
  { id: "largo", label: "Largo", pattern: [380, 160, 380] },
  { id: "suave", label: "Ligero", pattern: [70, 110, 70] },
  { id: "llamada", label: "Llamada", pattern: [480, 180, 480, 180, 480] },
];

export const VIBRATION_PREF_KEYS = {
  msgEnabled: "copmec_vibration_msg_enabled",
  msgIntensity: "copmec_vibration_msg_intensity",
  msgRhythm: "copmec_vibration_msg_rhythm",
  callEnabled: "copmec_vibration_call_enabled",
  callIntensity: "copmec_vibration_call_intensity",
  callRhythm: "copmec_vibration_call_rhythm",
};

const DEFAULTS = {
  msgEnabled: true,
  msgIntensity: "medium",
  msgRhythm: "doble",
  callEnabled: true,
  callIntensity: "strong",
  callRhythm: "llamada",
};

function readBool(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === "0" || raw === "false") return false;
  if (raw === "1" || raw === "true") return true;
  return fallback;
}

export function readVibrationPrefs() {
  return {
    msgEnabled: readBool(VIBRATION_PREF_KEYS.msgEnabled, DEFAULTS.msgEnabled),
    msgIntensity: localStorage.getItem(VIBRATION_PREF_KEYS.msgIntensity) || DEFAULTS.msgIntensity,
    msgRhythm: localStorage.getItem(VIBRATION_PREF_KEYS.msgRhythm) || DEFAULTS.msgRhythm,
    callEnabled: readBool(VIBRATION_PREF_KEYS.callEnabled, DEFAULTS.callEnabled),
    callIntensity: localStorage.getItem(VIBRATION_PREF_KEYS.callIntensity) || DEFAULTS.callIntensity,
    callRhythm: localStorage.getItem(VIBRATION_PREF_KEYS.callRhythm) || DEFAULTS.callRhythm,
  };
}

export function writeVibrationPref(key, value) {
  if (!VIBRATION_PREF_KEYS[key]) return;
  localStorage.setItem(VIBRATION_PREF_KEYS[key], typeof value === "boolean" ? (value ? "1" : "0") : String(value));
}

export function getRhythmPattern(rhythmId) {
  const found = VIBRATION_RHYTHM_OPTIONS.find((entry) => entry.id === rhythmId);
  return found?.pattern || VIBRATION_RHYTHM_OPTIONS[0].pattern;
}

export function getIntensityScale(intensityId) {
  const found = VIBRATION_INTENSITY_OPTIONS.find((entry) => entry.id === intensityId);
  return found?.scale || 1;
}

export function buildVibrationPattern(rhythmId, intensityId) {
  const base = getRhythmPattern(rhythmId);
  const scale = getIntensityScale(intensityId);
  return base.map((ms, index) => {
    if (index % 2 !== 0) return Math.max(30, Math.round(ms));
    return Math.max(40, Math.min(900, Math.round(ms * scale)));
  });
}

export function triggerAppVibration(kind = "message", overrides = {}) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return false;
  const prefs = readVibrationPrefs();
  const enabled = kind === "call" ? prefs.callEnabled : prefs.msgEnabled;
  if (overrides.enabled === false || (!enabled && overrides.enabled !== true)) return false;

  const rhythmId = overrides.rhythm || (kind === "call" ? prefs.callRhythm : prefs.msgRhythm);
  const intensityId = overrides.intensity || (kind === "call" ? prefs.callIntensity : prefs.msgIntensity);
  const pattern = buildVibrationPattern(rhythmId, intensityId);

  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
}
