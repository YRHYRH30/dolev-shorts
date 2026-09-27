// Soundtrack for the 22s invitation: soft page-turn, a short light chime on the emblem,
// then festive music that builds and eases back for the event details. Writes out/music.wav.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100, DUR = 22, N = SR * DUR, BEAT = 60 / 120;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// overall level: builds from 6s, eases at 15–19 for the details, fades at the end
const level = t => t < 6 ? 0 : t < 11 ? 0.5 + (t - 6) * 0.08 : t < 15 ? 0.95 : t < 16 ? 0.95 - (t - 15) * 0.3 : t < 20.5 ? 0.65 : Math.max(0, 0.65 * (22 - t) / 1.5);

function pageTurn(t0, len, g) { const s = Math.floor(t0 * SR); let lp = 0; for (let i = 0; i < SR * len; i++) { const p = i / (SR * len); lp += 0.08 * (rnd() - lp); const flutter = 0.6 + 0.4 * Math.sin(p * 60 + Math.sin(p * 13) * 4); add(s + i, lp * Math.sin(Math.PI * p) ** 2 * flutter * g * 3, lerpPan(p)); } }
const lerpPan = p => -0.5 + p;
function chime(t0, notes, g) { const s = Math.floor(t0 * SR); notes.forEach((m, k) => { const d = Math.floor(k * 0.07 * SR); for (let i = 0; i < SR * 2.5; i++) { const t = i / SR, f = mtof(m); add(s + d + i, (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6)) * Math.exp(-t * 2.2) * g * Math.min(1, t * 300), k % 2 ? 0.3 : -0.3); } }); }
function pad(t0, notes, len, g) { const s = Math.floor(t0 * SR); for (let i = 0; i < SR * len; i++) { const t = i / SR, tt = t0 + t; const env = Math.min(1, t / 0.5) * Math.min(1, (len - t) / 0.5); let v = 0; for (const m of notes) { const f = mtof(m); v += Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 1.004 * t); } add(s + i, v * env * g * (0.35 + level(tt))); } }
function pluck(t0, m, g, pan) { const s = Math.floor(t0 * SR), f = mtof(m); for (let i = 0; i < SR * 0.5; i++) { const t = i / SR; add(s + i, (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-t * 6) * g * Math.min(1, t * 500), pan); } }
function bass(t0, m, len, g) { const s = Math.floor(t0 * SR), f = mtof(m); for (let i = 0; i < SR * len; i++) { const t = i / SR; add(s + i, Math.tanh(Math.sin(2 * Math.PI * f * t) * 1.6) * g * Math.min(1, t * 200) * Math.min(1, (len - t) * 40)); } }
function drum(t0, g) { const s = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.3; i++) { const t = i / SR; add(s + i, Math.sin(2 * Math.PI * (60 * t + 60 * (1 - Math.exp(-t * 25)) / 25)) * Math.exp(-t * 10) * g); } }
function tamb(t0, g) { const s = Math.floor(t0 * SR); let prev = 0; for (let i = 0; i < SR * 0.09; i++) { const t = i / SR, n = rnd(); add(s + i, (n - prev) * Math.exp(-t * 45) * g, 0.35); prev = n; } }
function shimmer(t0, len, g) { const s = Math.floor(t0 * SR); for (let i = 0; i < SR * len; i++) { const t = i / SR; let v = 0; for (const m of [86, 90, 93, 98]) v += Math.sin(2 * Math.PI * mtof(m) * t + m); add(s + i, v * Math.sin(Math.PI * t / len) ** 2 * g); } }

// 0–3: warm air as the light passes the marble
pad(0, [62, 69, 74], 6.2, 0.012);
shimmer(0.3, 3.0, 0.012);
// 3s: soft page opening
pageTurn(2.8, 1.3, 0.35);
// 4.6s: short light chime as the emblem lands
chime(4.55, [86, 90, 93, 98], 0.05);

// festive bed, D major: D G A D / Bm G A D
const CH = [[62, 66, 69], [55, 59, 62], [57, 61, 64], [62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64], [62, 66, 69]];
const ROOT = [38, 43, 45, 38, 47, 43, 45, 38];
for (let b = 0; b * BEAT * 2 < DUR; b++) {
  const tb = 6 + b * BEAT * 2; if (tb >= 21.5) break;
  const ch = b % 8, g = level(tb);
  pad(tb, CH[ch].map(n => n + 12), BEAT * 2 + 0.3, 0.012);
  for (let s = 0; s < 8; s++) {
    const t = tb + s * BEAT / 4, lv = level(t); if (lv <= 0 || t > 21.2) continue;
    const busy = t > 8 && !(t > 15.5 && t < 19);
    if (s % 4 === 0) drum(t, 0.35 * lv);
    if (t > 7 && s % 2 === 1) tamb(t, 0.12 * lv);
    if (t > 7 && (s === 0 || s === 3 || s === 6)) bass(t, ROOT[ch], BEAT * 0.35, 0.16 * lv);
    if (busy && s % 2 === 0) pluck(t, CH[ch][(s / 2) % 3] + 24, 0.07 * lv, s % 4 ? 0.4 : -0.4);
    if (!busy && t > 15.5 && s === 0) pluck(t, CH[ch][0] + 24, 0.06 * lv, 0);
  }
}
// title beats
chime(7.0, [74, 78], 0.03); chime(8.0, [78, 81], 0.035);
shimmer(8.9, 1.2, 0.01);
// final warm chord
pad(20.2, [50, 62, 66, 69, 74], 1.8, 0.018);

let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.8 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, i / (SR * 0.3), (N - i) / (SR * 0.4));
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * norm) * fade * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * norm) * fade * 32767), 46 + i * 4);
}
fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
fs.writeFileSync(path.join(dir, 'out/music.wav'), buf);
console.log('wrote out/music.wav');
