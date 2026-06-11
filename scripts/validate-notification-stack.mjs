import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "frontend/src/utils/notificationSoundCatalog.js");
const soundsDir = path.join(root, "frontend/public/sounds");
const distSoundsDir = path.join(root, "backend/frontend-dist/sounds");

const catalogSrc = fs.readFileSync(catalogPath, "utf8");
const files = [...catalogSrc.matchAll(/file:\s*"([^"]+)"/g)].map((m) => m[1]);
const uniqueFiles = [...new Set(files)];

const { NOTIFICATION_SOUNDS } = await import(`file:///${catalogPath.replace(/\\/g, "/")}`.replace("/notificationSoundCatalog.js", "/notificationSoundCatalog.js"));
const {
  buildVibrationPattern,
  readVibrationPrefs,
  VIBRATION_INTENSITY_OPTIONS,
  VIBRATION_RHYTHM_OPTIONS,
  triggerAppVibration,
} = await import(`file:///${path.join(root, "frontend/src/utils/vibrationPrefs.js").replace(/\\/g, "/")}`);

let errors = [];

for (const file of uniqueFiles) {
  const base = path.basename(file);
  const publicPath = path.join(soundsDir, base);
  const distPath = path.join(distSoundsDir, base);
  if (!fs.existsSync(publicPath)) errors.push(`Missing public sound: ${base}`);
  if (!fs.existsSync(distPath)) errors.push(`Missing dist sound: ${base}`);
}

for (const sound of NOTIFICATION_SOUNDS) {
  if (!sound.id || !sound.label || !sound.icon || !sound.file) {
    errors.push(`Invalid catalog entry: ${JSON.stringify(sound)}`);
  }
}

for (const intensity of VIBRATION_INTENSITY_OPTIONS) {
  const pattern = buildVibrationPattern("doble", intensity.id);
  if (!Array.isArray(pattern) || pattern.length < 3) {
    errors.push(`Invalid vibration pattern for intensity ${intensity.id}`);
  }
}

for (const rhythm of VIBRATION_RHYTHM_OPTIONS) {
  const pattern = buildVibrationPattern(rhythm.id, "medium");
  if (!Array.isArray(pattern) || pattern.length < 3) {
    errors.push(`Invalid vibration pattern for rhythm ${rhythm.id}`);
  }
}

globalThis.localStorage = {
  store: new Map(),
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
  setItem(key, value) { this.store.set(key, String(value)); },
};
const prefs = readVibrationPrefs();
for (const key of ["msgEnabled", "msgIntensity", "msgRhythm", "callEnabled", "callIntensity", "callRhythm"]) {
  if (prefs[key] === undefined) errors.push(`Missing vibration pref: ${key}`);
}

const swPublic = fs.readFileSync(path.join(root, "frontend/public/service-worker.js"), "utf8");
const swDist = fs.readFileSync(path.join(root, "backend/frontend-dist/service-worker.js"), "utf8");
for (const marker of ["silent: true", "broadcastAppSound", "msgVibratePattern", "PLAY_APP_SOUND"]) {
  if (!swPublic.includes(marker)) errors.push(`service-worker public missing: ${marker}`);
  if (!swDist.includes(marker)) errors.push(`service-worker dist missing: ${marker}`);
}

console.log(`Catalog sounds: ${NOTIFICATION_SOUNDS.length}`);
console.log(`Unique wav files: ${uniqueFiles.length}`);
console.log(`Vibration prefs sample: ${JSON.stringify(prefs)}`);
console.log(`Pattern doble/strong: ${JSON.stringify(buildVibrationPattern("doble", "strong"))}`);

if (errors.length) {
  console.error("VALIDATION FAILED:");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}

console.log("VALIDATION OK - notification stack checks passed");
