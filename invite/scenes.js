// הזמנה מונפשת — שמחת בית השואבה, מוסדות פתחי עולם
// Every element (marble, leaves, emblem, frames, text) is rebuilt as its own layer — no screenshot is used.
// renderFrame(t) draws time t (seconds) on a 1080x1920 canvas.

const W = 1080, H = 1920, DURATION = 22;
const C = {
  navy: '#0E4A6B', blue: '#3F49B8', blueLight: '#7C86DA', bar: '#3A45B0',
  gold: '#C9A04A', goldLight: '#F3D98A', goldDark: '#9A7430', frame: '#B9B48E',
  leaf: '#3F6B2F', leafDark: '#24421C', leafLight: '#7FA35A',
};
const HEAD = '"Secular One", "Rubik", sans-serif';
const BODY = '"Rubik", sans-serif';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = p => 1 - Math.pow(1 - p, 3);
const eInOut = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const eSoftBack = p => { const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
function rand(seed) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const TAU = Math.PI * 2;

// ---------- offscreen layers ----------
const MS = 1.6; // marble is rendered larger so the opening close-up stays sharp
let MARBLE, VEINS_GOLD, TMP, TXT, LEAFBUF;
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function drawVeins(g, w, h, gold) {
  const veins = [];
  for (let i = 0; i < 26; i++) {
    let x = rand(i * 3.1) * w, y = rand(i * 7.7) * h;
    const ang = -0.9 + rand(i * 1.3) * 0.9 + (i % 3 === 0 ? Math.PI : 0);
    const pts = [[x, y]];
    let a = ang;
    const len = 30 + Math.floor(rand(i * 5.5) * 50);
    for (let k = 0; k < len; k++) {
      a += (rand(i * 100 + k) - 0.5) * 0.7;
      x += Math.cos(a) * 28 * MS; y += Math.sin(a) * 28 * MS;
      pts.push([x, y]);
    }
    veins.push({ pts, wgt: 0.6 + rand(i * 9.2) * 2.6, warm: rand(i * 4.4) > 0.35 });
  }
  g.lineCap = g.lineJoin = 'round';
  for (const v of veins) {
    for (const pass of [0, 1]) {
      g.beginPath();
      v.pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (gold) {
        g.strokeStyle = pass ? 'rgba(255,226,150,0.95)' : 'rgba(255,200,90,0.35)';
        g.lineWidth = (pass ? v.wgt : v.wgt * 6) * MS;
      } else {
        g.strokeStyle = pass
          ? (v.warm ? 'rgba(176,140,78,0.55)' : 'rgba(150,140,125,0.35)')
          : (v.warm ? 'rgba(200,170,110,0.12)' : 'rgba(170,160,150,0.08)');
        g.lineWidth = (pass ? v.wgt : v.wgt * 7) * MS;
      }
      g.stroke();
    }
  }
}

function initLayers() {
  const mw = W * MS, mh = H * MS;
  MARBLE = mk(mw, mh);
  const g = MARBLE.getContext('2d');
  const base = g.createLinearGradient(0, 0, mw, mh);
  base.addColorStop(0, '#F7EEDC'); base.addColorStop(0.5, '#F3E8D2'); base.addColorStop(1, '#EFE2C8');
  g.fillStyle = base; g.fillRect(0, 0, mw, mh);
  // soft clouds
  for (let i = 0; i < 40; i++) {
    const x = rand(i * 2.3 + 50) * mw, y = rand(i * 6.1 + 50) * mh, r = (120 + rand(i) * 360) * MS;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    const c = i % 2 ? '255,252,245' : '226,208,176';
    rg.addColorStop(0, `rgba(${c},0.22)`); rg.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  drawVeins(g, mw, mh, false);
  VEINS_GOLD = mk(mw, mh);
  drawVeins(VEINS_GOLD.getContext('2d'), mw, mh, true);
  TMP = mk(W, H);
  TXT = mk(W, 420);
  LEAFBUF = mk(W, H);
}

// ---------- camera ----------
// Background zoom (screen space) and content camera (world space) are separate.
function marbleZoom(t) { return lerp(2.1, 1, eInOut(prog(t, 0, 3.4))); }
function contentCam(t) {
  // 15–19: glide down to the details card; 19–22: back to the full invitation
  const down = eInOut(prog(t, 15, 16.4));
  const up = eInOut(prog(t, 18.9, 20.2));
  const k = down * (1 - up);
  return { s: lerp(1, 1.08, k), fy: lerp(960, 1300, k) };
}

function drawMarble(t) {
  const z = marbleZoom(t);
  const drift = t * 3;
  const sw = (W / z) * MS, sh = (H / z) * MS;
  const sx = (W * MS - sw) * 0.62 + drift, sy = (H * MS - sh) * 0.35;
  ctx.drawImage(MARBLE, sx, sy, sw, sh, 0, 0, W, H);

  // golden light passing over the veins (0–3.4s), then a faint warm residue
  const p = prog(t, 0.2, 3.4);
  const tc = TMP.getContext('2d');
  tc.globalCompositeOperation = 'source-over';
  tc.clearRect(0, 0, W, H);
  tc.drawImage(VEINS_GOLD, sx, sy, sw, sh, 0, 0, W, H);
  tc.globalCompositeOperation = 'destination-in';
  const bx = lerp(-700, W + 700, eInOut(p));
  const band = tc.createLinearGradient(bx - 420, -200, bx + 420, H + 200);
  const a = p > 0 && p < 1 ? 1 : 0;
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.5, `rgba(0,0,0,${0.95 * a})`);
  band.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = band; tc.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; ctx.drawImage(TMP, 0, 0); ctx.restore();

  // warm light: stays for the whole piece
  const warm = ctx.createRadialGradient(W * 0.5, H * 0.32, 60, W * 0.5, H * 0.45, H * 0.8);
  warm.addColorStop(0, 'rgba(255,236,190,0.28)');
  warm.addColorStop(1, 'rgba(120,90,40,0.18)');
  ctx.fillStyle = warm; ctx.fillRect(0, 0, W, H);
}

// ---------- leaves ----------
function frond(ctx, len, seed, lean) {
  // a palm-like frond: arched stem with alternating leaflets, drawn from origin pointing along +x
  const n = 13;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, lean * len * 0.18, len, lean * len * 0.35);
  ctx.strokeStyle = C.leafDark; ctx.lineWidth = 5; ctx.stroke();
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const x = len * u, y = lean * len * (0.18 * 2 * u * (1 - u) + 0.35 * u * u);
    const size = len * 0.33 * Math.sin(Math.PI * (0.15 + u * 0.8)) * (0.85 + rand(seed + i) * 0.3);
    for (const side of [-1, 1]) {
      const ang = side * (0.95 - u * 0.35) + (rand(seed * 3 + i + side) - 0.5) * 0.2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      const gr = ctx.createLinearGradient(0, 0, size, 0);
      gr.addColorStop(0, C.leafDark); gr.addColorStop(0.5, C.leaf); gr.addColorStop(1, C.leafLight);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 0.5, -size * 0.13, size, 0);
      ctx.quadraticCurveTo(size * 0.5, size * 0.13, 0, 0);
      ctx.fillStyle = gr; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size * 0.92, 0);
      ctx.strokeStyle = 'rgba(20,40,15,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
  }
}
// x, y: anchor off-screen; ang: pointing direction; depth: 0 near (big, blurred) .. 1 far
const LEAVES = [
  { x: -60, y: -40, ang: 1.05, len: 430, lean: -1, depth: 0.55, from: [-1, -1], d: 0.3 },
  { x: -80, y: 140, ang: 0.55, len: 360, lean: 1, depth: 0.8, from: [-1, 0], d: 0.7 },
  { x: -40, y: 360, ang: 0.35, len: 220, lean: 1, depth: 1, from: [-1, 0], d: 1.1 },
  { x: W + 60, y: -60, ang: Math.PI - 1.0, len: 440, lean: 1, depth: 0.5, from: [1, -1], d: 0.45 },
  { x: W + 70, y: 200, ang: Math.PI - 0.5, len: 340, lean: -1, depth: 0.8, from: [1, 0], d: 0.9 },
  { x: W + 40, y: 470, ang: Math.PI - 0.3, len: 230, lean: -1, depth: 1, from: [1, 0], d: 1.3 },
  { x: -120, y: -150, ang: 0.8, len: 560, lean: 1, depth: 0, from: [-1, -1], d: 0.1 },
  { x: W + 130, y: -120, ang: Math.PI - 0.75, len: 540, lean: -1, depth: 0, from: [1, -1], d: 0.2 },
];
function drawLeaves(t, near) {
  for (let i = 0; i < LEAVES.length; i++) {
    const L = LEAVES[i];
    if ((L.depth === 0) !== near) continue;
    const p = eOut(prog(t, L.d, L.d + 2.2));
    if (p <= 0) continue;
    const off = (1 - p) * 380;
    // gentle, almost imperceptible sway that never stops
    const sway = Math.sin(t * 0.9 + i * 1.7) * 0.025 + Math.sin(t * 0.37 + i) * 0.015;
    const alpha = (near ? 0.8 : 0.55 + 0.35 * L.depth) * Math.min(1, p * 1.5);
    // depth-of-field: out-of-focus leaves are drawn at low resolution and scaled up
    // (much cheaper than a canvas blur filter, which made rendering crawl)
    const k = near ? 0.12 : L.depth < 1 ? 0.35 : 1;
    const g = k < 1 ? LEAFBUF.getContext('2d') : ctx;
    g.save();
    if (k < 1) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, LEAFBUF.width, LEAFBUF.height); g.scale(k, k); }
    g.translate(L.x + L.from[0] * off, L.y + L.from[1] * off);
    g.rotate(L.ang + sway + (1 - p) * 0.25 * L.from[0]);
    if (k === 1) g.globalAlpha = alpha;
    frond(g, L.len, i * 13 + 1, L.lean);
    g.restore();
    if (k < 1) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(LEAFBUF, 0, 0, Math.ceil(W * k), Math.ceil(H * k), 0, 0, W, H);
      ctx.restore();
    }
  }
}

// ---------- text helpers ----------
function font(size, f = BODY, weight = '') { return `${weight} ${size}px ${f}`; }
// Draws a line word by word (RTL). Each whole word fades and rises in; letters never move on their own.
function words(str, cx, y, size, color, t, t0, opts = {}) {
  const f = font(size, opts.font || BODY, opts.weight || '');
  ctx.save();
  ctx.font = f; ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const ws = str.split(' ');
  const sp = ctx.measureText(' ').width;
  const widths = ws.map(w => ctx.measureText(w).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  let x = cx + total / 2;
  const stag = opts.stagger ?? 0.09;
  ws.forEach((w, i) => {
    const p = eOut(prog(t, t0 + i * stag, t0 + i * stag + 0.55));
    if (p > 0) {
      ctx.globalAlpha = p;
      ctx.fillStyle = color;
      ctx.fillText(w, x, y + (1 - p) * 18);
    }
    x -= widths[i] + sp;
  });
  ctx.restore();
  return total;
}

// ---------- emblem ----------
const LOGO = { cx: 540, cy: 205 };
function drawGlobe(r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#6D78D8'); g.addColorStop(1, '#343EA8');
  ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  // stylised continents
  ctx.fillStyle = '#A8B0EC';
  ctx.beginPath();
  ctx.moveTo(-r * 0.05, -r * 0.75); ctx.bezierCurveTo(r * 0.4, -r * 0.85, r * 0.75, -r * 0.4, r * 0.55, -r * 0.05);
  ctx.bezierCurveTo(r * 0.4, r * 0.2, r * 0.15, 0, r * 0.05, -r * 0.2);
  ctx.bezierCurveTo(-r * 0.15, -r * 0.35, -r * 0.3, -r * 0.55, -r * 0.05, -r * 0.75); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.3); ctx.bezierCurveTo(-r * 0.55, -r * 0.5, -r * 0.35, -r * 0.2, -r * 0.45, 0);
  ctx.bezierCurveTo(-r * 0.6, r * 0.1, -r * 0.85, 0, -r * 0.75, -r * 0.3); ctx.fill();
  ctx.restore();
}
function drawPage(side, open, w, h) {
  // one gold page fanning from the spine; open 0..1
  const sw = w * open;
  ctx.save(); ctx.scale(side, 1);
  for (let k = 0; k < 3; k++) {
    const y = k * 9;
    const g = ctx.createLinearGradient(0, 0, sw, 0);
    g.addColorStop(0, k === 0 ? C.goldLight : '#E9C878'); g.addColorStop(1, k === 0 ? C.gold : C.goldDark);
    ctx.beginPath();
    ctx.moveTo(0, y + 6);
    ctx.quadraticCurveTo(sw * 0.45, y - h * 0.35 * open, sw, y - h * 0.05 * open);
    ctx.lineTo(sw, y + h * 0.25);
    ctx.quadraticCurveTo(sw * 0.45, y + h * 0.05, 0, y + h * 0.35);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
  }
  ctx.restore();
}
function drawEmblem(t) {
  const { cx, cy } = LOGO;
  const open = eSoftBack(prog(t, 3.0, 4.2));
  const appear = prog(t, 2.9, 3.2);
  if (appear <= 0) return;
  ctx.save(); ctx.translate(cx, cy);
  ctx.globalAlpha = appear;

  // globe rises from between the pages
  const gp = eOut(prog(t, 3.6, 4.8));
  const R = 118;
  ctx.save();
  ctx.beginPath(); ctx.rect(-400, -400, 800, 400 + 20); ctx.clip();
  ctx.translate(0, lerp(R + 20, -10, gp));
  ctx.globalAlpha = appear * gp;
  drawGlobe(R);
  ctx.restore();

  // light chime: a quick soft glow as the emblem lands
  const glow = Math.sin(Math.PI * prog(t, 4.3, 5.3));
  if (glow > 0) {
    const rg = ctx.createRadialGradient(0, -40, 0, 0, -40, 260);
    rg.addColorStop(0, `rgba(255,232,160,${0.5 * glow})`); rg.addColorStop(1, 'rgba(255,232,160,0)');
    ctx.fillStyle = rg; ctx.fillRect(-300, -300, 600, 520);
  }

  ctx.translate(0, 2);
  drawPage(-1, open, 150, 62);
  drawPage(1, open, 150, 62);
  // spine
  ctx.fillStyle = C.goldDark; ctx.fillRect(-3, 0, 6, 34 * open);

  // gold dots: only while the book opens
  const dp = prog(t, 3.3, 5.0);
  if (dp > 0 && dp < 1) {
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI * (0.1 + rand(i) * 0.8);
      const sp = 120 + rand(i + 9) * 230;
      const q = eOut(dp);
      const x = Math.cos(a) * sp * q, y = Math.sin(a) * sp * q + dp * dp * 60;
      const r = 1.5 + rand(i + 3) * 3;
      ctx.globalAlpha = appear * (1 - dp) * (0.6 + 0.4 * Math.sin(i + t * 20));
      ctx.fillStyle = i % 3 ? C.goldLight : '#FFF6D6';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();

  // institution name: appears sharply
  const np = prog(t, 4.5, 5.1);
  if (np > 0) {
    ctx.save();
    ctx.globalAlpha = eOut(np);
    ctx.filter = `blur(${(1 - eOut(np)) * 14}px)`;
    ctx.font = font(118, HEAD); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillStyle = C.blue;
    const s = lerp(1.06, 1, eOut(np));
    ctx.translate(cx, cy + 115); ctx.scale(s, s);
    ctx.fillText('פתחי עולם', 0, 0);
    ctx.font = font(28, BODY, '600'); ctx.fillStyle = C.gold;
    ctx.fillText('מוסדות', 0, -74);
    ctx.restore();
  }

  // blue bar stretches out, then reveals the rabbi's name
  const bp = eInOut(prog(t, 5.0, 5.6));
  if (bp > 0) {
    const bw = 580 * bp, by = cy + 205;
    ctx.save();
    ctx.fillStyle = C.bar; ctx.fillRect(cx - bw / 2, by - 25, bw, 50);
    ctx.beginPath(); ctx.rect(cx - bw / 2, by - 25, bw, 50); ctx.clip();
    const rp = prog(t, 5.3, 6.0);
    ctx.globalAlpha = eOut(rp);
    ctx.font = font(30, BODY, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('בראשות הרב אליהו מאיר פייבלזון שליט״א', cx + (1 - eOut(rp)) * 40, by + 2);
    ctx.restore();
  }
}

// ---------- frames ----------
function framePath(x, y, w, h, r) {
  // rectangle with concave (notched) corners, as in the printed design
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arc(x + w, y, r, Math.PI, Math.PI / 2, true);
  ctx.lineTo(x + w, y + h - r); ctx.arc(x + w, y + h, r, -Math.PI / 2, -Math.PI, true);
  ctx.lineTo(x + r, y + h); ctx.arc(x, y + h, r, 0, -Math.PI / 2, true);
  ctx.lineTo(x, y + r); ctx.arc(x, y, r, Math.PI / 2, 0, true);
}
function drawFrame(x, y, w, h, p, fillA) {
  if (p <= 0) return;
  const per = 2 * (w + h);
  ctx.save();
  if (fillA > 0) {
    framePath(x, y, w, h, 44);
    ctx.fillStyle = `rgba(255,251,242,${0.45 * fillA})`; ctx.fill();
  }
  framePath(x, y, w, h, 44);
  ctx.setLineDash([per * p, per]);
  ctx.strokeStyle = C.frame; ctx.lineWidth = 3; ctx.stroke();
  framePath(x + 12, y + 12, w - 24, h - 24, 34);
  ctx.setLineDash([per * clamp(p * 1.1 - 0.1), per]);
  ctx.strokeStyle = 'rgba(185,180,142,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

// ---------- title ----------
const TITLE = { top: 470, h: 850 };
function drawRipples(t) {
  const p = prog(t, 7.8, 9.2);
  if (p <= 0) return;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const ph = ((t - 7.8) * 0.18 + i / 5) % 1;
    const rx = 120 + ph * 420, ry = rx * 0.33;
    ctx.globalAlpha = p * 0.22 * Math.sin(Math.PI * ph);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(540, 660, rx, ry, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
function titleLine(str, y, size, t, t0, shineT) {
  const p = eSoftBack(prog(t, t0, t0 + 0.8));
  const a = eOut(prog(t, t0, t0 + 0.45));
  if (a <= 0) return;
  const tc = TXT.getContext('2d');
  tc.globalCompositeOperation = 'source-over';
  tc.clearRect(0, 0, TXT.width, TXT.height);
  tc.font = font(size, HEAD); tc.textAlign = 'center'; tc.textBaseline = 'middle'; tc.direction = 'rtl';
  tc.fillStyle = C.navy; tc.fillText(str, W / 2, 210);
  // one golden shine across the letters
  const sp = prog(t, shineT, shineT + 1.0);
  if (sp > 0 && sp < 1) {
    tc.globalCompositeOperation = 'source-atop';
    const x = lerp(W + 200, -200, eInOut(sp));
    const g = tc.createLinearGradient(x - 140, 0, x + 140, 420);
    g.addColorStop(0, 'rgba(243,217,138,0)'); g.addColorStop(0.5, 'rgba(243,217,138,0.95)'); g.addColorStop(1, 'rgba(243,217,138,0)');
    tc.fillStyle = g; tc.fillRect(0, 0, W, 420);
  }
  ctx.save();
  ctx.globalAlpha = a;
  const s = lerp(0.84, 1, p);            // moves toward the viewer
  ctx.translate(W / 2, y); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(14,74,107,0.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.drawImage(TXT, -W / 2, -210);
  ctx.restore();
}
function drawSwash(t) {
  const p = eInOut(prog(t, 10.9, 11.9));
  if (p <= 0) return;
  ctx.save();
  ctx.translate(540, 840);
  ctx.beginPath();
  ctx.moveTo(-150, 6);
  ctx.bezierCurveTo(-80, -30, -20, 30, 30, 0);
  ctx.bezierCurveTo(60, -18, 40, -30, 20, -14);
  ctx.bezierCurveTo(0, 4, 60, 22, 150, -4);
  ctx.setLineDash([520 * p, 600]);
  ctx.strokeStyle = C.navy; ctx.lineCap = 'round'; ctx.lineWidth = 9; ctx.stroke();
  ctx.restore();
}

// ---------- scene ----------
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawMarble(t);
  drawLeaves(t, false);

  const cam = contentCam(t);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(cam.s, cam.s); ctx.translate(-W / 2, -cam.fy);

  // top frame around the emblem, then the emblem
  drawFrame(150, 40, 780, 380, eInOut(prog(t, 2.6, 4.0)), prog(t, 3, 4));
  drawEmblem(t);

  // title card
  drawFrame(120, TITLE.top, 840, TITLE.h, eInOut(prog(t, 6.0, 7.4)), prog(t, 6.2, 7.2));
  drawRipples(t);
  titleLine('שמחת', 600, 152, t, 7.0, 8.9);
  titleLine('בית השואבה', 745, 152, t, 8.0, 9.2);
  drawSwash(t);

  const lines = [
    ['בית המדרש פתחי עולם', 11.4, ''],
    ['מזמין את הציבור', 11.9, ''],
    ['לשמחת ומאמר החג', 12.4, ''],
    ['עם מורינו הרב', 13.1, '700'],
    ['אליהו מאיר פייבלזון שליט״א', 13.6, '700'],
  ];
  lines.forEach(([s, t0, w], i) => words(s, 540, 945 + i * 72, i === 4 ? 60 : 54, C.navy, t, t0, { weight: w || '500' }));
  // final emphasis on the rabbi's name
  const hp = eInOut(prog(t, 14.3, 15.0));
  if (hp > 0) {
    ctx.save();
    const uw = 620 * hp;
    const g = ctx.createLinearGradient(540 - 310, 0, 540 + 310, 0);
    g.addColorStop(0, 'rgba(201,160,74,0)'); g.addColorStop(0.5, C.gold); g.addColorStop(1, 'rgba(201,160,74,0)');
    ctx.fillStyle = g; ctx.fillRect(540 + 310 - uw, 1270, uw, 4);
    ctx.restore();
  }

  // details card
  const D = 1370;
  drawFrame(120, D, 840, 520, eInOut(prog(t, 15.0, 16.2)), prog(t, 15.2, 16.0));
  words('ראשון  |  א׳ דחוה״מ', 540, D + 85, 50, C.navy, t, 15.7, { weight: '500' });
  {
    const p = eOut(prog(t, 16.2, 16.9));
    if (p > 0) {
      ctx.save();
      ctx.globalAlpha = p;
      ctx.font = font(112, BODY, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
      const s = lerp(1.1, 1, p);
      ctx.translate(540, D + 185); ctx.scale(s, s);
      ctx.fillStyle = C.navy; ctx.fillText('20:30–23:00', 0, 0);
      ctx.restore();
    }
  }
  words('בסוכת הרב ברוך סורוצקין שליט״א', 540, D + 285, 46, C.navy, t, 16.9, { weight: '500' });
  words('רח׳ מעלות קדושי טלז 1, טלזסטון', 540, D + 345, 46, C.navy, t, 17.3, { weight: '500' });
  {
    const p = eOut(prog(t, 17.7, 18.3));
    if (p > 0) { ctx.fillStyle = C.gold; ctx.globalAlpha = p; ctx.fillRect(540 - 160 * p, D + 395, 320 * p, 2); ctx.globalAlpha = 1; }
  }
  words('עם אמן הרגש והלב מוישל׳ה', 540, D + 440, 44, C.navy, t, 17.9, { weight: '700' });
  words('ובליווי הקלידן צביקי נוילנדר', 540, D + 490, 44, C.navy, t, 18.3, { weight: '700' });

  ctx.restore();
  drawLeaves(t, true);

  // gentle fade from white at the very beginning
  const f = 1 - prog(t, 0, 0.6);
  if (f > 0) { ctx.fillStyle = `rgba(255,248,235,${f})`; ctx.fillRect(0, 0, W, H); }
}

window.ready = document.fonts.load(`100px ${HEAD}`).then(() => document.fonts.load(`700 50px ${BODY}`))
  .then(() => document.fonts.load(`500 50px ${BODY}`)).then(() => { initLayers(); renderFrame(0); });
