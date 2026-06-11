import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const soundsDir = path.join(__dirname, "../frontend/public/sounds");

const SAMPLE_RATE = 44100;

function clamp(sample) {
  return Math.max(-1, Math.min(1, sample));
}

function envAttackDecay(t, attack = 0.01, decay = 0.2, sustain = 0, release = 0.15, duration = 0.5) {
  if (t < attack) return t / attack;
  if (t < attack + decay) {
    const p = (t - attack) / decay;
    return 1 - p * (1 - sustain);
  }
  if (t < duration - release) return sustain;
  if (t < duration) return sustain * ((duration - t) / release);
  return 0;
}

function writeWav(filename, duration, mixer) {
  const samples = Math.max(1, Math.ceil(duration * SAMPLE_RATE));
  const audioData = Buffer.alloc(samples * 2);

  for (let i = 0; i < samples; i++) {
    const t = i / SAMPLE_RATE;
    const sample = clamp(mixer(t, duration));
    audioData.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  const dataSize = audioData.length;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  fs.writeFileSync(filename, Buffer.concat([header, audioData]));
}

function tone(freq, t, offset = 0, type = "sine") {
  const x = 2 * Math.PI * freq * (t - offset);
  if (type === "sine") return Math.sin(x);
  if (type === "triangle") return (2 / Math.PI) * Math.asin(Math.sin(x));
  if (type === "square") return Math.sin(x) >= 0 ? 1 : -1;
  return Math.sin(x);
}

function bell(freq, t, start, vol = 0.35, len = 0.55) {
  if (t < start || t > start + len) return 0;
  const local = t - start;
  const e = Math.exp(-local * 7);
  return (
    tone(freq, local, 0) * 0.55
    + tone(freq * 2, local, 0) * 0.25
    + tone(freq * 3, local, 0) * 0.12
  ) * e * vol;
}

const SOUND_DEFS = {
  "notification-alert.wav": {
    duration: 0.72,
    mix(t, duration) {
      return bell(880, t, 0, 0.42) + bell(988, t, 0.22, 0.34);
    },
  },
  "chat-ping.wav": {
    duration: 0.22,
    mix(t) {
      const e = envAttackDecay(t, 0.002, 0.05, 0.2, 0.12, 0.22);
      return tone(1520, t) * e * 0.45 + tone(2280, t) * e * 0.12;
    },
  },
  "chat-digital.wav": {
    duration: 0.28,
    mix(t) {
      let s = 0;
      [[680, 0], [1020, 0.1]].forEach(([freq, start]) => {
        if (t < start || t > start + 0.09) return;
        const local = t - start;
        s += tone(freq, local, 0, "square") * Math.exp(-local * 28) * 0.14;
      });
      return s;
    },
  },
  "notification-call.wav": {
    duration: 1.1,
    mix(t) {
      const cycle = t % 0.45;
      const ring = cycle < 0.28 ? tone(740, cycle) * 0.28 + tone(880, cycle) * 0.18 : 0;
      const fade = t > 0.95 ? (1.1 - t) / 0.15 : 1;
      return ring * fade;
    },
  },
  "sound-burbuja.wav": {
    duration: 0.38,
    mix(t) {
      const e = envAttackDecay(t, 0.01, 0.32, 0, 0.05, 0.38);
      const freq = 780 * Math.exp(-t * 5.5) + 280;
      return tone(freq, t) * e * 0.4;
    },
  },
  "sound-marimba.wav": {
    duration: 0.52,
    mix(t) {
      return bell(523, t, 0, 0.38, 0.42) + bell(784, t, 0.18, 0.34, 0.38);
    },
  },
  "sound-cristal.wav": {
    duration: 0.42,
    mix(t) {
      return (
        bell(1320, t, 0, 0.22, 0.28)
        + bell(1760, t, 0.06, 0.18, 0.24)
        + bell(2200, t, 0.12, 0.14, 0.2)
      );
    },
  },
  "sound-pulso.wav": {
    duration: 0.48,
    mix(t) {
      const pulse = (start) => {
        if (t < start || t > start + 0.16) return 0;
        const local = t - start;
        return tone(185, local, 0) * Math.exp(-local * 14) * 0.5;
      };
      return pulse(0) + pulse(0.2);
    },
  },
  "sound-chime.wav": {
    duration: 0.58,
    mix(t) {
      return (
        bell(784, t, 0, 0.28, 0.35)
        + bell(988, t, 0.1, 0.24, 0.32)
        + bell(1175, t, 0.2, 0.2, 0.3)
      );
    },
  },
  "sound-pop.wav": {
    duration: 0.14,
    mix(t) {
      const click = Math.exp(-t * 80) * 0.35;
      const thump = tone(180, t) * Math.exp(-t * 22) * 0.25;
      return click + thump;
    },
  },
  "sound-nudge.wav": {
    duration: 0.36,
    mix(t) {
      const hit = (start, freq) => {
        if (t < start || t > start + 0.12) return 0;
        const local = t - start;
        return tone(freq, local) * Math.exp(-local * 18) * 0.38;
      };
      return hit(0, 920) + hit(0.16, 1040);
    },
  },
  "sound-soft.wav": {
    duration: 0.45,
    mix(t) {
      const e = envAttackDecay(t, 0.02, 0.15, 0.35, 0.2, 0.45);
      return (tone(620, t) * 0.3 + tone(930, t) * 0.1) * e;
    },
  },
  "sound-urgent.wav": {
    duration: 0.55,
    mix(t) {
      const beep = (start) => {
        if (t < start || t > start + 0.1) return 0;
        const local = t - start;
        return tone(1040, local) * Math.exp(-local * 12) * 0.42;
      };
      return beep(0) + beep(0.16) + beep(0.32);
    },
  },
  "sound-wave.wav": {
    duration: 0.32,
    mix(t) {
      const e = envAttackDecay(t, 0.005, 0.2, 0, 0.1, 0.32);
      const sweep = 400 + t * 2200;
      return tone(sweep, t) * e * 0.28 + tone(sweep * 0.5, t) * e * 0.12;
    },
  },
  "sound-tap.wav": {
    duration: 0.1,
    mix(t) {
      return tone(1200, t) * Math.exp(-t * 55) * 0.35 + tone(600, t) * Math.exp(-t * 40) * 0.15;
    },
  },
  "sound-zen.wav": {
    duration: 0.65,
    mix(t) {
      const e = envAttackDecay(t, 0.03, 0.2, 0.25, 0.35, 0.65);
      return (tone(432, t) * 0.32 + tone(648, t) * 0.12 + tone(864, t) * 0.06) * e;
    },
  },
  "sound-bright.wav": {
    duration: 0.34,
    mix(t) {
      const note = (freq, start) => {
        if (t < start || t > start + 0.1) return 0;
        const local = t - start;
        return tone(freq, local) * Math.exp(-local * 16) * 0.32;
      };
      return note(880, 0) + note(1108, 0.08) + note(1318, 0.16);
    },
  },
  "sound-alert-soft.wav": {
    duration: 0.5,
    mix(t) {
      return bell(740, t, 0, 0.3, 0.4) + bell(880, t, 0.2, 0.26, 0.35);
    },
  },
};

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

for (const [name, def] of Object.entries(SOUND_DEFS)) {
  const filePath = path.join(soundsDir, name);
  writeWav(filePath, def.duration, def.mix);
  console.log(`OK ${name} (${def.duration}s)`);
}

console.log(`Generated ${Object.keys(SOUND_DEFS).length} sounds in ${soundsDir}`);
