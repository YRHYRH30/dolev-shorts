// Synthesizes the 90s soundtrack (music bed + whooshes + hits) into out/music.wav.
// Kept under the voice level so narration can be recorded on top.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100, DUR = 90, N = SR * DUR, BPM = 110, BEAT = 60 / BPM;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan) ; R[i] += v * (1 + pan); } };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// sections where the bed is muted / thinned
const FREEZE = [51.2, 52.4];            // the "first chat line" freeze
const muted = t => (t >= FREEZE[0] && t < FREEZE[1]) || t >= 87;
const intensity = t => (t < 10 ? 0.7 : t < 59 ? 1 : t < 74 ? 1.1 : 0.9);

function kick(t0, g = 1) { const s = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.35; i++) { const t = i / SR; add(s + i, Math.sin(2 * Math.PI * (50 * t + 90 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 9) * 0.9 * g); } }
function snare(t0, g = 1) { const s = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.22; i++) { const t = i / SR; add(s + i, (rnd() * 0.6 + Math.sin(2 * Math.PI * 190 * t) * 0.4) * Math.exp(-t * 18) * 0.45 * g, rnd() * 0.2); } }
function hat(t0, g = 1, open = false) { const s = Math.floor(t0 * SR); let prev = 0; for (let i = 0; i < SR * (open ? 0.18 : 0.05); i++) { const t = i / SR, n = rnd(); const hp = n - prev; prev = n; add(s + i, hp * Math.exp(-t * (open ? 20 : 70)) * 0.13 * g, 0.3); } }
function pluck(t0, m, len, g = 0.18, pan = 0) { const s = Math.floor(t0 * SR), f = mtof(m); for (let i = 0; i < SR * len; i++) { const t = i / SR; const ph = f * t; const v = (2 * (ph % 1) - 1) * 0.5 + Math.sin(2 * Math.PI * ph) * 0.5; add(s + i, v * Math.exp(-t * 7) * g * Math.min(1, t * 400), pan); } }
function bass(t0, m, len, g = 0.32) { const s = Math.floor(t0 * SR), f = mtof(m); for (let i = 0; i < SR * len; i++) { const t = i / SR; const v = Math.tanh(Math.sin(2 * Math.PI * f * t) * 2.2); add(s + i, v * g * Math.min(1, t * 200) * Math.min(1, (len - t) * 60)); } }
function pad(t0, notes, len, g = 0.05) { const s = Math.floor(t0 * SR); for (let i = 0; i < SR * len; i++) { const t = i / SR; const env = Math.min(1, t / 0.4) * Math.min(1, (len - t) / 0.4); let v = 0; for (const m of notes) { const f = mtof(m); v += Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t); } add(s + i, v * env * g, Math.sin(t) * 0.3); } }
function whoosh(tc, len = 0.9, g = 0.35) { const s = Math.floor((tc - len * 0.7) * SR); let lp = 0; for (let i = 0; i < SR * len; i++) { const p = i / (SR * len); const a = 0.02 + 0.5 * Math.sin(Math.PI * p) ** 2; lp += a * (rnd() - lp); add(s + i, lp * Math.sin(Math.PI * p) ** 2 * g * 2, Math.cos(p * Math.PI) * 0.6); } }
function hit(t0, g = 0.6) { kick(t0, 1.3 * g); const s = Math.floor(t0 * SR); for (let i = 0; i < SR * 1.2; i++) { const t = i / SR; add(s + i, (rnd() * 0.3 + Math.sin(2 * Math.PI * 55 * t) * 0.7) * Math.exp(-t * 3.5) * g * 0.6); } }
function blip(t0, m, g = 0.15) { const s = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.12; i++) { const t = i / SR; add(s + i, Math.sign(Math.sin(2 * Math.PI * mtof(m) * t)) * Math.exp(-t * 25) * g); } }

// progression (A minor-ish, bright): Am F C G
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const ROOTS = [45, 41, 48, 43];
const bars = Math.ceil(DUR / (BEAT * 4));
for (let b = 0; b < bars; b++) {
  const tb = b * BEAT * 4, ch = b % 4;
  if (!muted(tb) && tb < 87) pad(tb, CHORDS[ch].map(n => n + 12), BEAT * 4, 0.03 * intensity(tb));
  for (let s = 0; s < 16; s++) {
    const t = tb + s * BEAT / 4; if (t >= 87 || muted(t)) continue;
    const g = intensity(t);
    const intro = t < 1.2;
    if (!intro && s % 4 === 0) kick(t, 0.9 * g);
    if (!intro && (s === 4 || s === 12)) snare(t, g);
    if (!intro && s % 2 === 0) hat(t, g, s % 8 === 6);
    if (t > 10 && (s === 0 || s === 3 || s === 8 || s === 11 || s === 14)) bass(t, ROOTS[ch], BEAT * 0.6, 0.28 * g);
    const arp = [0, 1, 2, 1, 2, 0, 1, 2];
    if (t > 21 && s % 2 === 0) pluck(t, CHORDS[ch][arp[(s / 2) % 8]] + 12 + (s % 8 === 6 ? 12 : 0), 0.3, 0.12 * g, s % 4 ? 0.4 : -0.4);
  }
}
// scene-change whooshes & accents
for (const b of [10, 21, 34, 45, 59, 74]) whoosh(b);
hit(4.6);                           // "בחוץ." stamp
for (let d = 0; d < 5; d++) blip(7.1 + d * 0.55, 84 - d * 2); // countdown
whoosh(11.5, 1.6, 0.3);             // rewind
hit(34.6, 0.4); hit(41, 0.5);       // sold / YC stamp
for (let i = 0; i < 4; i++) blip(49.8 + i * 0.3, 88, 0.08);  // typing
blip(52.4, 93, 0.2);                // send
for (let d = 0; d < 5; d++) blip(65.4 + d * 0.9, 76 + d * 3, 0.14); // days 1..5
hit(72.0, 0.6);                     // chair lands
hit(85.2, 0.6);                     // cover headline
hit(87.0, 0.9);                     // hard cut to logo
pad(87, [57, 64, 69, 72], 3, 0.06);

// master: soft limiter + fade out, write 16-bit stereo WAV
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / SR, fade = Math.min(1, (DUR - t) / 1.5, t / 0.05);
  const g = 0.7 / Math.max(0.5, peak) * fade;
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * g * 1.2) * 32000), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * g * 1.2) * 32000), 46 + i * 4);
}
fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
fs.writeFileSync(path.join(dir, 'out/music.wav'), buf);
console.log('wrote out/music.wav');
