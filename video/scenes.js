// יהודי AI — פרק 1: סם אלטמן — "הכיסא שהתפנה — וחזר"
// Deterministic motion-graphics renderer: renderFrame(t) draws time t (seconds) on a 1080x1920 canvas.

const W = 1080, H = 1920, DURATION = 90;
const C = {
  blue: '#1F4BFF', yellow: '#FFD23F', coral: '#FF6B5B', teal: '#1FC8B4',
  ink: '#111111', cream: '#FFF4E0', orange: '#FF8A2B', skin: '#F4C7A1',
  hair: '#3B2A22', navy: '#0B1D6B', green: '#3BB273',
};
const HEAD = '"Secular One", "Rubik", sans-serif';
const BODY = '"Rubik", sans-serif';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// ---------- math / easing ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = p => 1 - Math.pow(1 - p, 3);
const eIn = p => p * p * p;
const eInOut = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const eBack = p => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const eElastic = p => (p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
function rand(seed) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const TAU = Math.PI * 2;

// ---------- textures ----------
function makeHalftone(color, step = 18, r = 3.4) {
  const c = document.createElement('canvas'); c.width = c.height = step;
  const g = c.getContext('2d'); g.fillStyle = color;
  g.beginPath(); g.arc(step / 2, step / 2, r, 0, TAU); g.fill();
  return ctx.createPattern(c, 'repeat');
}
let HT_INK, HT_WHITE, HT_BLUE, GRAIN;
function initTextures() {
  HT_INK = makeHalftone('rgba(17,17,17,0.9)', 16, 3.2);
  HT_WHITE = makeHalftone('rgba(255,255,255,0.9)', 22, 4);
  HT_BLUE = makeHalftone('rgba(31,75,255,0.9)', 20, 4);
  const g = document.createElement('canvas'); g.width = g.height = 512;
  const gc = g.getContext('2d'); const id = gc.createImageData(512, 512);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 22;
  }
  gc.putImageData(id, 0, 0); GRAIN = g;
}

// ---------- drawing helpers ----------
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fs(fill, lw = 8, stroke = C.ink) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
function circle(x, y, r, fill, lw = 8) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fs(fill, lw); }
function withT(x, y, rot, s, fn) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s); fn(); ctx.restore(); }
function bg(color) { ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); }
function halftoneRect(pat, alpha, x = 0, y = 0, w = W, h = H) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = pat; ctx.fillRect(x, y, w, h); ctx.restore(); }
function text(str, x, y, size, color, opts = {}) {
  ctx.save();
  ctx.font = `${opts.weight || ''} ${size}px ${opts.font || HEAD}`;
  ctx.direction = opts.dir || 'rtl'; ctx.textAlign = opts.align || 'center'; ctx.textBaseline = 'middle';
  if (opts.stroke) { ctx.lineWidth = opts.stroke; ctx.strokeStyle = opts.strokeColor || C.ink; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  if (opts.shadow) { ctx.fillStyle = opts.shadow; ctx.fillText(str, x + 8, y + 8); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
  ctx.restore();
}
function wrap(str, maxW, size, font, weight = '') {
  ctx.font = `${weight} ${size}px ${font}`;
  const words = str.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur); return lines;
}
function burst(x, y, rOut, rIn, n, fill, rot = 0, lw = 8) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? rIn : rOut, a = rot + (i / (n * 2)) * TAU;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath(); fs(fill, lw);
}
function sunburst(x, y, n, color, rot, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU, da = TAU / n / 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 3000, y + Math.sin(a) * 3000);
    ctx.lineTo(x + Math.cos(a + da) * 3000, y + Math.sin(a + da) * 3000); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// Magazine sticker label: colored tilted block with text
function sticker(str, x, y, size, fill, color, rot = 0, s = 1, pad = 30) {
  if (s <= 0.001) return;
  withT(x, y, rot, s, () => {
    ctx.font = `${size}px ${HEAD}`; ctx.direction = 'rtl';
    const w = ctx.measureText(str).width + pad * 2, h = size * 1.35;
    rr(-w / 2 + 12, -h / 2 + 12, w, h, 14); fs(C.ink, 0);
    rr(-w / 2, -h / 2, w, h, 14); fs(fill, 7);
    text(str, 0, 4, size, color);
  });
}
function speedLines(x, y, n, len, color, t, seed = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = rand(i + seed) * TAU, r0 = 250 + rand(i * 3 + seed) * 300 + ((t * 900 + i * 97) % 500);
    ctx.lineWidth = 6 + rand(i * 7) * 8;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * (r0 + len), y + Math.sin(a) * (r0 + len)); ctx.stroke();
  }
  ctx.restore();
}

// ---------- characters & props ----------
// Collage-style cartoon of Sam. face: -1..1 (profile turn), arms: 'none' | 'conduct' | 'wave'
function drawSam(x, y, s, o = {}) {
  const face = o.face ?? 0, beat = o.beat ?? 0;
  withT(x, y, o.rot || 0, s, () => {
    // misregistered print shadow
    ctx.save(); ctx.translate(14, 12); ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.ellipse(0, 0, 118, 138, 0, 0, TAU); ctx.fillStyle = C.coral; ctx.fill();
    ctx.restore();
    // body
    if (!o.noBody) {
      ctx.beginPath(); ctx.moveTo(-190, 420); ctx.quadraticCurveTo(-200, 200, -60, 175);
      ctx.lineTo(60, 175); ctx.quadraticCurveTo(200, 200, 190, 420); ctx.closePath(); fs(C.blue);
      ctx.save(); ctx.clip(); halftoneRect(HT_INK, 0.25, 40, 150, 200, 300); ctx.restore();
      // collar (coral)
      ctx.beginPath(); ctx.moveTo(-60, 175); ctx.lineTo(0, 250); ctx.lineTo(60, 175); ctx.closePath(); fs(C.coral, 7);
      // neck
      rr(-38, 110, 76, 80, 20); fs(C.skin, 7);
      if (o.arms === 'conduct') {
        const a1 = -1.9 + Math.sin(beat * TAU) * 0.45, a2 = -1.25 - Math.cos(beat * TAU) * 0.35;
        for (const [sx, a, baton] of [[-150, a1 - 0.4, true], [150, -Math.PI - a2 + 0.4, false]]) {
          ctx.save(); ctx.translate(sx, 250); ctx.rotate(a);
          rr(0, -32, 230, 64, 30); fs(C.blue, 8);
          circle(245, 0, 38, C.skin, 7);
          if (baton) { ctx.beginPath(); ctx.moveTo(260, 0); ctx.lineTo(420, -10); ctx.lineWidth = 10; ctx.strokeStyle = C.ink; ctx.stroke(); circle(420, -10, 8, C.yellow, 5); }
          ctx.restore();
        }
      }
    }
    // ears
    ctx.beginPath(); ctx.ellipse(-112 + face * 30, 10, 24, 36, 0, 0, TAU); fs(C.skin, 7);
    if (face > -0.6) { ctx.beginPath(); ctx.ellipse(112 + face * 30, 10, 24, 36, 0, 0, TAU); fs(C.skin, 7); }
    // head
    ctx.beginPath(); ctx.ellipse(0, 0, 115, 135, 0, 0, TAU); fs(C.skin, 8);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 115, 135, 0, 0, TAU); ctx.clip();
    halftoneRect(HT_INK, 0.18, 40 - face * 40, -140, 200, 300); ctx.restore();
    // hair: short, slightly messy
    ctx.beginPath(); ctx.moveTo(-118, -10);
    ctx.bezierCurveTo(-135, -120, -60, -175, 10, -165);
    ctx.bezierCurveTo(90, -175, 140, -110, 118, -10);
    ctx.bezierCurveTo(110, -60, 80, -85, 40, -80);
    ctx.bezierCurveTo(10, -105, -40, -70, -70, -95);
    ctx.bezierCurveTo(-90, -70, -105, -50, -118, -10); ctx.closePath(); fs(C.hair, 8);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-70 + i * 45, -150 + (i % 2) * 8, 22, Math.PI, TAU); fs(C.hair, 0); }
    // face features
    const fx = face * 45;
    ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
    for (const ex of [-42, 42]) {
      const blink = o.blink ? 0.15 : 1;
      ctx.beginPath(); ctx.ellipse(ex + fx, 5, 17, 20 * blink, 0, 0, TAU); fs('#fff', 6);
      circle(ex + fx + face * 6, 8, 8 * blink, C.ink, 0);
      ctx.beginPath(); ctx.moveTo(ex + fx - 22, -32); ctx.lineTo(ex + fx + 20, -36 - (o.brow || 0)); ctx.lineWidth = 9; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(fx + 4, 25); ctx.quadraticCurveTo(fx + 18 + face * 10, 55, fx - 2, 60); ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath();
    if (o.mouth === 'o') { ctx.ellipse(fx, 92, 16, 20, 0, 0, TAU); fs(C.ink, 0); }
    else { ctx.moveTo(fx - 36, 85); ctx.quadraticCurveTo(fx, 112 - (o.frown ? 40 : 0), fx + 36, 85); ctx.lineWidth = 8; ctx.stroke(); }
    // cheek blush
    ctx.globalAlpha = 0.45; circle(-70 + fx, 55, 18, C.coral, 0); circle(70 + fx, 55, 18, C.coral, 0); ctx.globalAlpha = 1;
  });
}

// Office chair; spin: angle radians around vertical axis (fake 3D via scaleX)
function drawChair(x, y, s, spin = 0, o = {}) {
  withT(x, y, o.rot || 0, s, () => {
    const sx = Math.cos(spin), back = sx < 0;
    // base
    ctx.save(); ctx.scale(Math.max(0.35, Math.abs(Math.cos(spin * 0.5))), 1);
    for (let i = 0; i < 5; i++) {
      const a = spin + (i / 5) * TAU, bx = Math.cos(a) * 170, by = 330 + Math.sin(a) * 30;
      ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(bx, by); ctx.lineWidth = 22; ctx.strokeStyle = C.ink; ctx.stroke();
      if (o.wheels !== false) circle(bx, by + 20, 22, C.ink, 0);
    }
    ctx.restore();
    rr(-18, 130, 36, 180, 10); fs('#555', 7);
    ctx.save(); ctx.scale(Math.abs(sx) < 0.05 ? 0.05 : sx, 1);
    // backrest
    rr(-150, -330, 300, 360, 90); fs(back ? C.navy : C.blue, 10);
    if (!back) { ctx.save(); rr(-150, -330, 300, 360, 90); ctx.clip(); halftoneRect(HT_WHITE, 0.25, -150, -330, 150, 360); ctx.restore(); rr(-95, -270, 190, 230, 60); fs(null, 6, 'rgba(255,255,255,0.5)'); }
    // armrests
    rr(-205, 20, 60, 120, 20); fs(C.orange, 8); rr(145, 20, 60, 120, 20); fs(C.orange, 8);
    ctx.restore();
    // seat
    ctx.beginPath(); ctx.ellipse(0, 110, 210, 60, 0, 0, TAU); fs(C.orange, 10);
    ctx.beginPath(); ctx.ellipse(0, 95, 170, 30, 0, 0, TAU); fs('rgba(255,255,255,0.25)', 0);
  });
}

function drawClock(x, y, r, hourA, minA, fill = C.cream) {
  circle(x + 10, y + 10, r, C.ink, 0); circle(x, y, r, fill, 10);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU; ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
    ctx.lineWidth = i % 3 ? 5 : 10; ctx.strokeStyle = C.ink; ctx.stroke();
  }
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(hourA) * r * 0.5, y + Math.sin(hourA) * r * 0.5); ctx.lineWidth = 16; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(minA) * r * 0.75, y + Math.sin(minA) * r * 0.75); ctx.lineWidth = 10; ctx.strokeStyle = C.coral; ctx.stroke();
  circle(x, y, 14, C.ink, 0);
}

function drawPin(x, y, s, fill = C.coral, label) {
  withT(x, y, 0, s, () => {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-30, -60, -80, -90, -80, -150);
    ctx.arc(0, -150, 80, Math.PI, 0); ctx.bezierCurveTo(80, -90, 30, -60, 0, 0); ctx.closePath(); fs(fill, 9);
    circle(0, -150, 32, C.cream, 7);
    if (label) sticker(label, 0, -300, 64, C.yellow, C.ink, -0.05, 1);
  });
}

// Simplified contiguous-US silhouette (normalized 0..1)
const US = [[0.02, 0.18], [0.1, 0.08], [0.3, 0.1], [0.5, 0.12], [0.62, 0.1], [0.66, 0.2], [0.72, 0.16], [0.8, 0.12], [0.9, 0.04],
  [0.97, 0.1], [0.92, 0.25], [0.86, 0.36], [0.82, 0.5], [0.8, 0.62], [0.86, 0.82], [0.82, 0.9], [0.75, 0.72], [0.66, 0.72],
  [0.56, 0.78], [0.5, 0.95], [0.42, 0.8], [0.36, 0.72], [0.24, 0.72], [0.12, 0.6], [0.05, 0.48], [0.0, 0.3]];

// Paper plane
function drawPlane(x, y, s, rot) {
  withT(x, y, rot, s, () => {
    ctx.beginPath(); ctx.moveTo(160, 0); ctx.lineTo(-140, -90); ctx.lineTo(-60, 0); ctx.lineTo(-140, 90); ctx.closePath(); fs(C.cream, 8);
    ctx.beginPath(); ctx.moveTo(160, 0); ctx.lineTo(-60, 0); ctx.lineTo(-100, 40); ctx.closePath(); fs('#E8D9BC', 7);
  });
}

function drawPerson(x, y, s, body, bob = 0) {
  withT(x, y + bob, 0, s, () => {
    ctx.beginPath(); ctx.moveTo(-50, 90); ctx.quadraticCurveTo(-50, 20, 0, 20); ctx.quadraticCurveTo(50, 20, 50, 90); ctx.closePath(); fs(body, 6);
    circle(0, -15, 34, C.skin, 6);
    circle(-11, -18, 4, C.ink, 0); circle(11, -18, 4, C.ink, 0);
    ctx.beginPath(); ctx.arc(0, -8, 12, 0.2, Math.PI - 0.2); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke();
  });
}

function chatBubble(x, y, w, h, fill, s = 1, rot = 0, tail = 'right') {
  withT(x, y, rot, s, () => {
    rr(-w / 2 + 10, -h / 2 + 10, w, h, h * 0.35); fs(C.ink, 0);
    ctx.beginPath(); ctx.moveTo(-w / 2 + h * 0.35, -h / 2);
    ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, h * 0.35); ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, h * 0.35);
    if (tail === 'right') { ctx.lineTo(w / 2 - h * 0.3, h / 2); ctx.lineTo(w / 2 - h * 0.05, h / 2 + h * 0.35); ctx.lineTo(w / 2 - h * 0.6, h / 2); }
    ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, h * 0.35); ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, h * 0.35); ctx.closePath(); fs(fill, 8);
  });
}

// Icons for startup tree
function icon(kind, x, y, s, t) {
  withT(x, y, Math.sin(t * 3 + x) * 0.08, s, () => {
    circle(6, 6, 70, C.ink, 0);
    const fills = { bulb: C.yellow, rocket: C.coral, cloud: C.teal, chart: C.cream, team: C.blue, arrow: C.orange };
    circle(0, 0, 70, fills[kind], 7);
    ctx.lineWidth = 6; ctx.strokeStyle = C.ink;
    if (kind === 'bulb') { circle(0, -8, 30, '#fff', 6); rr(-14, 22, 28, 20, 4); fs(C.ink, 0); }
    if (kind === 'rocket') { ctx.beginPath(); ctx.moveTo(0, -45); ctx.quadraticCurveTo(25, -10, 18, 30); ctx.lineTo(-18, 30); ctx.quadraticCurveTo(-25, -10, 0, -45); fs('#fff', 6); circle(0, -8, 9, C.blue, 4); ctx.beginPath(); ctx.moveTo(-10, 32); ctx.lineTo(0, 52); ctx.lineTo(10, 32); fs(C.orange, 4); }
    if (kind === 'cloud') { for (const [cx, cy, r] of [[-20, 5, 20], [0, -10, 25], [22, 5, 20]]) circle(cx, cy, r, '#fff', 0); rr(-40, 5, 80, 22, 11); fs('#fff', 0); }
    if (kind === 'chart') { for (let i = 0; i < 3; i++) { rr(-35 + i * 25, 25 - (i + 1) * 18, 18, (i + 1) * 18, 3); fs(C.coral, 4); } }
    if (kind === 'team') { circle(-18, -8, 14, C.skin, 4); circle(18, -8, 14, C.skin, 4); rr(-38, 10, 36, 25, 10); fs(C.yellow, 4); rr(2, 10, 36, 25, 10); fs(C.coral, 4); }
    if (kind === 'arrow') { ctx.beginPath(); ctx.moveTo(-30, 30); ctx.lineTo(25, -25); ctx.stroke(); ctx.beginPath(); ctx.moveTo(30, -30); ctx.lineTo(0, -30); ctx.lineTo(30, 0); ctx.closePath(); fs(C.ink, 5); }
  });
}

// ---------- captions (narration text) ----------
const CAPTIONS = [
  [0.3, 3.4, 'בנובמבר 2023, סם אלטמן איבד את התפקיד שלו כמנכ״ל OpenAI.'],
  [3.4, 5.6, 'חמישה ימים אחר כך, הוא חזר.'],
  [5.6, 10, 'איך מגיעים לפסגת עולם הבינה המלאכותית — ואיך אפשר להיזרק ממנה כמעט בן־לילה?'],
  [10, 12.8, 'כדי להבין את הנפילה והחזרה, צריך לחזור להתחלה.'],
  [12.8, 15.6, 'סם נולד בשיקגו וגדל בסנט לואיס.'],
  [15.6, 18.2, 'עוד כשהיה צעיר, מחשבים משכו אותו —'],
  [18.2, 21, 'לא רק כמסכים להסתכל בהם, אלא כמקומות שאפשר לבנות בהם דברים.'],
  [21, 24.5, 'הוא מגיע לסטנפורד, אבל לא נשאר במסלול הרגיל.'],
  [24.5, 29.5, 'במקום להמשיך בתואר, הוא יוצא לבנות חברה: Loopt — אפליקציה שחיברה בין אנשים למיקום שלהם.'],
  [29.5, 34, 'זו הייתה התחלה אמיתית בעולם היזמות, אבל היא לא הפכה לדבר שכולם משתמשים בו.'],
  [34, 37, 'Loopt נמכרה ב־2012. אבל סם לא יצא מעולם הסטארט־אפים.'],
  [37, 41, 'הוא עבר לצד השני של השולחן: ב־Y Combinator הוא עבד עם יזמים,'],
  [41, 45, 'עזר לחברות צעירות לצמוח, ולמד לזהות מה יכול להפוך מרעיון קטן לחברה גדולה.'],
  [45, 47.8, 'ב־2015 הוא היה בין מייסדי OpenAI.'],
  [47.8, 52.5, 'שנים אחר כך, ChatGPT יצא לעולם — ופתאום מיליוני אנשים יכלו לנהל שיחה עם בינה מלאכותית.'],
  [52.5, 55.2, 'הכישרון של אלטמן לא היה רק לחשוב על טכנולוגיה.'],
  [55.2, 59, 'הוא ידע לחבר בין חוקרים, מוצר, כסף וסיפור שאנשים רוצים להיות חלק ממנו.'],
  [59, 63, 'ואז, בנובמבר 2023, מועצת OpenAI הודיעה שאלטמן עוזב את תפקיד המנכ״ל.'],
  [63, 66.5, 'העולם צפה בדרמה מתפתחת סביב החברה וההנהגה שלה.'],
  [66.5, 70.2, 'חמישה ימים אחר כך, אלטמן חזר לתפקיד.'],
  [70.2, 74, 'הכיסא שחיכה ריק בפתיחה — שוב שלו.'],
  [74, 77.5, 'הסיפור של סם אלטמן הוא לא מסלול ישר אל הפסגה.'],
  [77.5, 82.2, 'הוא סיפור על בנייה, על שינוי תפקידים, ועל הכוח להישאר במרכז כשהטכנולוגיה, החברה והציפיות ממנה משתנות במהירות.'],
  [82.2, 87, 'אבל כשהבינה המלאכותית נוגעת בחיים של כולנו, השאלה היא כבר לא רק מי יושב בכיסא — אלא מי קובע לאן הוא נוסע.'],
];
function drawCaption(t) {
  const cap = CAPTIONS.find(c => t >= c[0] && t < c[1]); if (!cap) return;
  const [a, b, str] = cap; const pIn = eBack(prog(t, a, a + 0.3)), pOut = prog(t, b - 0.15, b);
  const size = 50, lines = wrap(str, 900, size, BODY, 600);
  ctx.font = `600 ${size}px ${BODY}`;
  const lh = size * 1.3, h = lines.length * lh + 44, y0 = 1690 - h / 2;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 70;
  ctx.save(); ctx.globalAlpha = 1 - pOut; ctx.translate(540, 1690); ctx.scale(0.85 + 0.15 * pIn, 0.85 + 0.15 * pIn); ctx.translate(-540, -1690);
  rr(540 - w / 2 + 10, y0 + 10, w, h, 22); fs(C.ink, 0);
  rr(540 - w / 2, y0, w, h, 22); fs(C.cream, 6);
  lines.forEach((l, i) => text(l, 540, y0 + 22 + lh * (i + 0.5) + 3, size, C.ink, { font: BODY, weight: 600 }));
  ctx.restore();
}

// ---------- scene transitions: diagonal color-band wipe centered at time tc ----------
function wipe(t, tc, colors = [C.yellow, C.coral, C.blue, C.teal]) {
  const d = 0.45, p = prog(t, tc - d, tc + d); if (p <= 0 || p >= 1) return;
  ctx.save(); ctx.translate(540, 960); ctx.rotate(-0.35);
  colors.forEach((col, i) => {
    const lag = i * 0.07, q = clamp((p - lag) / (1 - 0.21));
    const x0 = lerp(-2200, 2200, eInOut(clamp(q * 1.0)));
    ctx.fillStyle = col; ctx.fillRect(x0 - 1400 + i * 120, -2000, 1400 - i * 240 + 600, 4000);
  });
  ctx.restore();
}

// ================= SCENES =================
function scene1(t) { // 0–10 הכיסא הריק
  bg(C.cream);
  sunburst(540, 900, 24, C.blue, t * 0.15, 0.12);
  halftoneRect(HT_BLUE, 0.08);
  // masthead
  const pm = eBack(prog(t, 0.1, 0.6));
  withT(540, 190, 0, pm, () => {
    rr(-470, -80, 940, 160, 10); fs(C.blue, 0);
    text('יהודי AI', 150, 4, 120, C.cream, { stroke: 0 });
    text('פרק 1', -330, -22, 44, C.yellow, { font: BODY, weight: 700 });
    text('סם אלטמן', -330, 32, 44, C.cream, { font: BODY, weight: 700 });
  });
  // chair spin: 1.4 → 4.4 (decelerating, stops front-facing)
  const ps = prog(t, 1.4, 4.4); const spin = eOut(ps) * TAU * 4;
  const shake = t > 4.4 && t < 4.7 ? Math.sin(t * 90) * 6 : 0;
  const chairS = 1.35 * eBack(prog(t, 0, 0.7));
  if (ps > 0 && ps < 0.9) speedLines(540, 880, 26, 120, 'rgba(17,17,17,0.35)', t);
  drawChair(540 + shake, 900, chairS, spin);
  // Sam sits, then is flung out
  const fling = eIn(prog(t, 1.9, 2.7));
  if (fling < 1) {
    const sx = 540 - fling * 1100, sy = 700 - Math.sin(fling * Math.PI) * 350;
    drawSam(sx, sy, 0.95 * eBack(prog(t, 0.2, 0.9)), { rot: -fling * 4, mouth: fling > 0 ? 'o' : null, noBody: false, brow: fling * 14 });
  }
  // "בחוץ." cover stamp
  const pst = prog(t, 4.6, 5.0);
  if (pst > 0) {
    const s = lerp(3, 1, eOut(pst)), a = clamp(pst * 3);
    ctx.save(); ctx.globalAlpha = a;
    withT(540, 560, -0.08, s, () => {
      rr(-330, -140, 660, 280, 16); fs(C.ink, 0);
      rr(-340, -150, 660, 280, 16); fs(C.yellow, 10);
      text('בחוץ.', 0, -5, 230, C.ink);
    });
    ctx.restore();
    if (pst < 1) burst(540, 560, 520, 380, 16, 'rgba(255,107,91,0.4)', t, 0);
  }
  // dateline
  if (t > 5.2) sticker('נובמבר 2023', 280, 1300, 54, C.coral, C.cream, 0.06, eBack(prog(t, 5.2, 5.6)));
  // countdown clock
  const pc = prog(t, 6.6, 7.1);
  if (pc > 0) {
    const cx = 830, cy = 1270, s = eBack(pc);
    withT(cx, cy, 0, s, () => {
      drawClock(0, 0, 150, -t * 6, -t * 40, C.cream);
    });
    const day = 5 - Math.floor(clamp((t - 7.1) / 0.55, 0, 4.99));
    sticker(`${day} ימים`, cx, cy + 210, 60, C.blue, C.cream, -0.04, s);
  }
}

function scene2(t) { // 10–21 חוזרים להתחלה
  const lt = t - 10;
  // Beat A: "חזור" → rewind button
  if (lt < 1.9) {
    bg(C.coral); sunburst(540, 900, 18, C.orange, -lt * 0.6, 0.5); halftoneRect(HT_INK, 0.07);
    const pm = prog(lt, 0.8, 1.2);
    if (pm < 1) withT(540, 900, 0, eBack(prog(lt, 0, 0.35)) * (1 - pm), () => text('חזור', 0, 0, 300, C.cream, { stroke: 14, shadow: C.ink }));
    const pb = eBack(prog(lt, 0.9, 1.3)); const press = lt > 1.45 && lt < 1.6 ? 0.88 : 1;
    if (pb > 0) withT(540, 900, 0, pb * press, () => {
      circle(14, 14, 220, C.ink, 0); circle(0, 0, 220, C.yellow, 12);
      for (const ox of [-70, 50]) { ctx.beginPath(); ctx.moveTo(ox + 60, -85); ctx.lineTo(ox - 60, 0); ctx.lineTo(ox + 60, 85); ctx.closePath(); fs(C.ink, 0); }
    });
    return;
  }
  // VHS rewind tunnel through stages
  const zoom = s0 => s0;
  if (lt < 3.9) { // clock tunnel spinning backward
    const p = prog(lt, 1.9, 3.9);
    bg(C.blue); halftoneRect(HT_WHITE, 0.08);
    for (let i = 5; i >= 0; i--) {
      const z = Math.pow(1.9, i - p * 3) * 180;
      if (z < 20 || z > 3000) continue;
      drawClock(540, 900, z, -lt * 14 - i, -lt * 60 - i * 2, i % 2 ? C.cream : C.yellow);
    }
    text('◀◀ REW', 540, 330, 70, C.cream, { dir: 'ltr', font: BODY, weight: 800 });
  } else if (lt < 6.4) { // US map
    bg(C.cream); halftoneRect(HT_BLUE, 0.06);
    const p = eBack(prog(lt, 3.9, 4.4));
    const mx = 90, my = 560, mw = 900, mh = 560;
    withT(540, 840, 0, lerp(1.6, 1, p), () => {
      ctx.translate(-540, -840);
      ctx.beginPath(); US.forEach(([u, v], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, mx + u * mw + 10, my + v * mh + 10)); ctx.closePath(); fs(C.ink, 0);
      ctx.beginPath(); US.forEach(([u, v], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, mx + u * mw, my + v * mh)); ctx.closePath(); fs(C.teal, 9);
      ctx.save(); ctx.clip(); halftoneRect(HT_WHITE, 0.3); ctx.restore();
    });
    const chi = [mx + 0.66 * mw, my + 0.3 * mh], stl = [mx + 0.6 * mw, my + 0.47 * mh];
    const p1 = prog(lt, 4.4, 4.8);
    if (p1 > 0) { drawPin(chi[0], chi[1] - (1 - eOut(p1)) * 400, 0.45, C.coral); sticker('שיקגו', chi[0] + 150, chi[1] - 130, 54, C.yellow, C.ink, -0.06, eBack(p1)); }
    const p2 = prog(lt, 5.0, 5.7);
    if (p2 > 0) {
      ctx.save(); ctx.setLineDash([18, 16]); ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.beginPath();
      for (let i = 0; i <= 30 * p2; i++) { const q = i / 30; ctx.lineTo(lerp(chi[0], stl[0], q) - Math.sin(q * Math.PI) * 120, lerp(chi[1], stl[1], q)); }
      ctx.stroke(); ctx.restore();
      const p3 = prog(lt, 5.6, 6.0);
      if (p3 > 0) { drawPin(stl[0], stl[1] - (1 - eOut(p3)) * 300, 0.45, C.blue); sticker('סנט לואיס', stl[0] - 170, stl[1] + 120, 54, C.coral, C.cream, 0.05, eBack(p3)); }
    }
    text('ארצות הברית', 540, 420, 80, C.blue, { stroke: 0 });
  } else if (lt < 8.2) { // yearbook
    bg(C.yellow); halftoneRect(HT_INK, 0.06);
    const p = eBack(prog(lt, 6.4, 6.9));
    withT(540, 900, -0.04, p, () => {
      rr(-440, -330, 880, 660, 20); fs(C.coral, 10);
      rr(-420, -310, 410, 620, 10); fs(C.cream, 6); rr(10, -310, 410, 620, 10); fs(C.cream, 6);
      text('ספר מחזור', -215, -250, 56, C.blue);
      for (let i = 0; i < 9; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        const x = (col - 1) * 125 + (i < 3 || true ? 215 : 0), y = -200 + row * 180;
        const px = x - (col === 0 && false ? 0 : 0);
        rr(px - 50, y, 100, 120, 8); fs(['#9DD9F3', '#FFD9C9', '#CFF2E8'][i % 3], 5);
        circle(px, y + 50, 28, C.skin, 4); ctx.beginPath(); ctx.arc(px, y + 40, 29, Math.PI, TAU); fs([C.hair, '#8B5A2B', C.ink][i % 3], 0);
      }
      for (let i = 0; i < 6; i++) { rr(-390, -170 + i * 70, 340 - (i % 2) * 90, 18, 9); fs('rgba(17,17,17,0.15)', 0); }
      // highlight doodle
      const pd = prog(lt, 7.1, 7.7);
      ctx.beginPath(); ctx.ellipse(215, 190, 90, 110, 0, -1.4, -1.4 + TAU * 1.1 * pd); ctx.lineWidth = 10; ctx.strokeStyle = C.coral; ctx.stroke();
    });
  } else { // computer turns on, pixels burst out
    bg(C.navy); halftoneRect(HT_BLUE, 0.3);
    const p = eBack(prog(lt, 8.2, 8.6));
    withT(540, 950, 0, p, () => {
      rr(-360, -300, 720, 560, 40); fs('#E9E1CF', 10);
      rr(-300, -250, 600, 440, 20); fs(C.ink, 8);
      rr(-120, 280, 240, 50, 10); fs('#CFC6B2', 8); rr(-260, 330, 520, 70, 20); fs('#E9E1CF', 8);
      const on = prog(lt, 8.7, 9.1);
      if (on > 0) {
        ctx.save(); rr(-290, -240, 580, 420, 16); ctx.clip();
        ctx.fillStyle = C.teal; const hh = on < 0.5 ? 6 : lerp(6, 420, eOut((on - 0.5) * 2));
        ctx.fillRect(-290 * Math.min(1, on * 2), -30 - hh / 2, 580 * Math.min(1, on * 2), hh);
        if (on >= 1) { text('>_', -200, -170, 70, C.ink, { dir: 'ltr', font: BODY, weight: 800 }); }
        ctx.restore();
      }
    });
    const pb = prog(lt, 9.2, 11);
    if (pb > 0) {
      const cols = [C.yellow, C.coral, C.teal, C.cream, C.orange];
      for (let i = 0; i < 46; i++) {
        const a = rand(i) * TAU, d = eOut(pb) * (350 + rand(i + 9) * 900), x = 540 + Math.cos(a) * d, y = 880 + Math.sin(a) * d * 1.2;
        const s = (0.4 + rand(i + 3)) * eBack(clamp(pb * 3)); const kind = i % 4;
        withT(x, y, pb * 5 * (rand(i + 5) - 0.5), s, () => {
          if (kind === 0) { rr(-70, -50, 140, 100, 8); fs(cols[i % 5], 6); rr(-70, -50, 140, 22, 6); fs(C.blue, 6); }
          else if (kind === 1) { rr(-22, -22, 44, 44, 2); fs(cols[i % 5], 5); }
          else if (kind === 2) { circle(0, 0, 32, cols[i % 5], 6); }
          else { ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(38, 30); ctx.lineTo(-38, 30); ctx.closePath(); fs(cols[i % 5], 6); }
        });
      }
    }
  }
  // tape progress bar (rewind) during tunnel+map+book
  if (lt >= 1.9) {
    const p = 1 - prog(lt, 1.9, 8.2);
    rr(140, 260, 800, 22, 11); fs('rgba(17,17,17,0.25)', 0); rr(140, 260, 800 * p + 1, 22, 11); fs(C.coral, 0);
  }
}

function scene3(t) { // 21–34 לעזוב את המסלול
  const lt = t - 21;
  bg(C.teal); halftoneRect(HT_WHITE, 0.12);
  const fold = eInOut(prog(lt, 10, 11));            // map folds away
  const pOpen = eOut(prog(lt, 0, 1.0));
  const mx = 90, my = 330, mw = 900, mh = 1120;
  if (fold < 1) {
    ctx.save(); ctx.translate(540, 890); ctx.scale(lerp(0.2, 1, pOpen) * (1 - fold), pOpen * (1 - fold * 0.6)); ctx.rotate(fold * 0.6); ctx.translate(-540, -890);
    rr(mx + 14, my + 14, mw, mh, 10); fs(C.ink, 0); rr(mx, my, mw, mh, 10); fs(C.cream, 10);
    ctx.save(); rr(mx, my, mw, mh, 10); ctx.clip();
    for (let i = 1; i < 6; i++) { ctx.fillStyle = 'rgba(255,210,63,0.7)'; ctx.fillRect(mx + i * 150 - 18, my, 36, mh); ctx.fillRect(mx, my + i * 190 - 18, mw, 36); }
    for (let i = 0; i < 14; i++) { const x = mx + 40 + rand(i) * 800, y = my + 40 + rand(i + 40) * 1000; circle(x, y, 26 + rand(i + 2) * 20, C.green, 5); }
    for (let i = 0; i < 8; i++) { const x = mx + 60 + rand(i + 70) * 720, y = my + 60 + rand(i + 90) * 950; rr(x, y, 90, 60, 6); fs(C.coral, 5); }
    for (let i = 1; i < 3; i++) { ctx.fillStyle = 'rgba(17,17,17,0.12)'; ctx.fillRect(mx + (mw / 3) * i - 3, my, 6, mh); }
    ctx.restore();
    sticker('סטנפורד', 540, my + 60, 64, C.blue, C.cream, -0.04, eBack(prog(lt, 0.6, 1.0)));
    // path: straight up, then veers off and curls into a pin
    const pp = prog(lt, 1.2, 4.2);
    if (pp > 0) {
      const pts = [];
      for (let i = 0; i <= 100; i++) {
        const q = i / 100; let x, y;
        if (q < 0.45) { x = 540; y = lerp(1420, 1000, q / 0.45); }
        else { const r = (q - 0.45) / 0.55; x = 540 + Math.sin(r * Math.PI * 1.1) * 260 - r * 60; y = 1000 - r * 420 + Math.sin(r * 5) * 30; }
        pts.push([x, y]);
      }
      const n = Math.floor(pp * 100);
      ctx.save(); ctx.setLineDash([26, 18]); ctx.lineWidth = 14; ctx.strokeStyle = C.ink; ctx.beginPath();
      pts.slice(0, n + 1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
      // "the usual track" ghost continuing straight out of frame
      ctx.save(); ctx.globalAlpha = 0.35 * clamp(pp * 3); ctx.setLineDash([10, 14]); ctx.lineWidth = 8; ctx.strokeStyle = C.ink;
      ctx.beginPath(); ctx.moveTo(540, 1000); ctx.lineTo(540, 300); ctx.stroke(); ctx.restore();
      if (pp > 0.5) text('המסלול הרגיל', 700, 520, 40, 'rgba(17,17,17,0.5)', { font: BODY, weight: 700 });
      const end = pts[100], pin = eBack(prog(lt, 4.1, 4.6));
      if (pin > 0) drawPin(end[0], end[1], 0.9 * pin, C.coral, 'Loopt');
      // friends popping
      for (let i = 0; i < 8; i++) {
        const pf = eBack(prog(lt, 5 + i * 0.3, 5.4 + i * 0.3)); if (pf <= 0) continue;
        const a = (i / 8) * TAU + 0.3, r = 280 + (i % 2) * 70, fx = end[0] + Math.cos(a) * r * 0.9, fy = end[1] - 130 + Math.sin(a) * r * 0.8;
        ctx.save(); ctx.globalAlpha = 0.6; ctx.setLineDash([8, 10]); ctx.lineWidth = 5; ctx.strokeStyle = C.blue;
        ctx.beginPath(); ctx.moveTo(end[0], end[1] - 130); ctx.lineTo(fx, fy); ctx.stroke(); ctx.restore();
        const ring = ((lt - 5 - i * 0.3) * 1.2) % 1;
        ctx.save(); ctx.globalAlpha = 1 - ring; circle(fx, fy, 40 + ring * 50, null, 5); ctx.restore();
        drawPerson(fx, fy, 0.75 * pf, [C.blue, C.yellow, C.orange, C.teal][i % 4]);
      }
    }
    ctx.restore();
  }
  const pc = prog(lt, 8.3, 8.7);
  if (pc > 0 && fold < 0.5) sticker('Loopt נוסדה ב־2005.', 540, 1470, 60, C.ink, C.yellow, 0.03, eBack(pc));
  // paper plane flies off
  const pl = prog(lt, 10.6, 13);
  if (pl > 0) {
    const x = lerp(540, -300, eIn(pl)), y = lerp(900, 250, eIn(pl)) + Math.sin(pl * 8) * 40;
    ctx.save(); ctx.setLineDash([16, 16]); ctx.lineWidth = 7; ctx.strokeStyle = C.cream; ctx.beginPath(); ctx.moveTo(540, 900);
    ctx.quadraticCurveTo((540 + x) / 2 + 100, (900 + y) / 2 + 150, x + 140, y + 40); ctx.stroke(); ctx.restore();
    drawPlane(x, y, 1.2 * eBack(clamp(pl * 4)), -2.6 + Math.sin(pl * 8) * 0.1);
  }
}

function scene4(t) { // 34–45 ללמוד לבנות בונים
  const lt = t - 34;
  bg(C.yellow); sunburst(540, 1450, 20, C.orange, lt * 0.1, 0.25); halftoneRect(HT_INK, 0.05);
  // ground
  ctx.beginPath(); ctx.moveTo(0, 1440); ctx.quadraticCurveTo(540, 1380, 1080, 1440); ctx.lineTo(1080, 1920); ctx.lineTo(0, 1920); ctx.closePath(); fs('#8B5A2B', 0);
  const zoomOut = eInOut(prog(lt, 5, 6));
  // pin falls → sold sticker → becomes seed
  const pf = prog(lt, 0, 0.6), seedP = prog(lt, 1.2, 1.7);
  if (seedP < 1) drawPin(540, lerp(-200, 1420, eOut(pf)), 0.9 * (1 - seedP), C.coral);
  if (lt > 0.5 && lt < 3.2) {
    const s = eBack(prog(lt, 0.5, 0.8)) * (1 - prog(lt, 2.9, 3.2));
    withT(790, 700, 0.18, s, () => { burst(0, 0, 190, 150, 18, C.coral, lt, 8); text('נמכרה!', 0, -25, 70, C.cream); text('2012', 0, 45, 60, C.ink, { font: BODY, weight: 800 }); });
  }
  if (seedP > 0) { withT(540, 1425, 0.3, eBack(seedP), () => { ctx.beginPath(); ctx.ellipse(0, 0, 36, 24, 0, 0, TAU); fs('#6B3E1E', 7); }); }
  // tree grows
  const g = prog(lt, 1.7, 4.8);
  const nodes = [[540, 1060, 'rocket'], [330, 920, 'bulb'], [760, 880, 'team'], [250, 640, 'cloud'], [540, 560, 'chart'], [820, 620, 'arrow']];
  const treeS = lerp(1, 0.62, zoomOut), treeY = lerp(0, -320, zoomOut);
  if (g > 0) {
    ctx.save(); ctx.translate(540, 1425 + treeY); ctx.scale(treeS, treeS); ctx.translate(-540, -1425);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.green;
    const trunkH = eOut(clamp(g * 2)) * 820;
    ctx.lineWidth = 36; ctx.beginPath(); ctx.moveTo(540, 1425); ctx.lineTo(540, 1425 - trunkH); ctx.stroke();
    nodes.forEach(([x, y, k], i) => {
      const pb = prog(g, 0.2 + i * 0.1, 0.5 + i * 0.1); if (pb <= 0) return;
      const sy = Math.max(y + 150, 1425 - trunkH + 50);
      ctx.lineWidth = 22; ctx.strokeStyle = C.green; ctx.beginPath(); ctx.moveTo(540, sy);
      ctx.quadraticCurveTo(lerp(540, x, 0.2), lerp(sy, y, 0.8), lerp(540, x, eOut(pb)), lerp(sy, y, eOut(pb))); ctx.stroke();
      icon(k, x, y, eBack(prog(g, 0.4 + i * 0.1, 0.6 + i * 0.1)), lt);
    });
    ctx.restore();
  }
  // Sam the conductor + entrepreneur orchestra
  const pc = prog(lt, 5.2, 5.9);
  if (pc > 0) {
    const beat = (lt * 110 / 60) % 1;
    for (let i = 0; i < 6; i++) {
      const pp = eBack(prog(lt, 5.8 + i * 0.12, 6.2 + i * 0.12)); if (pp <= 0) continue;
      const x = 120 + i * 168, y = 1330 - (i === 0 || i === 5 ? 0 : 60) + (i === 2 || i === 3 ? 80 : 0);
      if (i === 2 || i === 3) continue;
      const bob = -Math.abs(Math.sin((beat + i * 0.25) * Math.PI)) * 22;
      drawPerson(x, y, 1.0 * pp, [C.blue, C.coral, C.teal, C.orange, C.blue, C.coral][i], bob);
      rr(x - 50 * pp, y + 70 * pp + bob, 100 * pp, 14 * pp, 4); fs(C.ink, 0);
    }
    drawSam(540, 1210, 0.62 * eBack(pc), { arms: 'conduct', beat, face: Math.sin(lt * 2) * 0.3 });
    // music notes
    for (let i = 0; i < 6; i++) {
      const q = ((lt - 5.5) * 0.5 + i / 6) % 1; if (lt < 5.8) break;
      const x = 540 + Math.sin(i * 2.1 + q * 4) * 380, y = 1250 - q * 700;
      ctx.save(); ctx.globalAlpha = 1 - q; text(i % 2 ? '♪' : '♫', x, y, 90, C.ink, { dir: 'ltr', font: 'DejaVu Sans' }); ctx.restore();
    }
  }
  const ps = prog(lt, 7, 7.3);
  if (ps > 0) {
    const s = lerp(2.5, 1, eOut(ps));
    withT(540, 330, -0.06, s, () => {
      ctx.globalAlpha = clamp(ps * 3);
      burst(0, 0, 440, 400, 40, C.teal, 0, 8);
      text('נשיא Y Combinator', 0, -38, 76, C.ink);
      text('2014–2019', 0, 50, 70, C.cream, { dir: 'ltr', font: BODY, weight: 800, stroke: 10 });
    });
  }
}

function scene5(t) { // 45–59 רעיון שנפתח לעולם
  const lt = t - 45;
  bg(C.navy); halftoneRect(HT_BLUE, 0.35);
  const cols = [C.yellow, C.coral, C.teal, C.cream, C.orange];
  // network nodes
  const N = 22, net = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU * 2.2, r = 120 + (i / N) * 330;
    net.push([540 + Math.cos(a) * r, 880 + Math.sin(a) * r * 1.1]);
  }
  const conv = eInOut(prog(lt, 0, 1.6)), collapse = eIn(prog(lt, 3.3, 4.2));
  if (collapse < 1) {
    const pts = net.map(([x, y], i) => {
      const sx = rand(i) * W, sy = 1400 + rand(i + 5) * 400;
      return [lerp(lerp(sx, x, conv), 540, collapse), lerp(lerp(sy, y, conv), 880, collapse)];
    });
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,244,224,0.55)';
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d < 260 && conv > 0.6) { ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[j]); ctx.stroke(); }
    }
    const lab = prog(lt, 1.8, 2.6);
    pts.forEach(([x, y], i) => {
      circle(x, y, 26 * (1 - collapse * 0.7), cols[i % 5], 6);
      const pl = eBack(prog(lab, i / N * 0.6, i / N * 0.6 + 0.4));
      if (pl > 0 && i % 3 === 0) withT(x, y - 10, 0, pl * (1 - collapse), () => { // flask
        ctx.beginPath(); ctx.moveTo(-14, -50); ctx.lineTo(-14, -20); ctx.lineTo(-40, 30); ctx.lineTo(40, 30); ctx.lineTo(14, -20); ctx.lineTo(14, -50); ctx.closePath(); fs(C.cream, 6);
        ctx.beginPath(); ctx.moveTo(-30, 12); ctx.lineTo(30, 12); ctx.lineTo(40, 30); ctx.lineTo(-40, 30); ctx.closePath(); fs(C.teal, 0);
        circle(6 + Math.sin(lt * 6 + i) * 5, -60 - ((lt * 40 + i * 13) % 50), 7, C.cream, 3);
      });
    });
    sticker('OpenAI · 2015', 540, 360, 70, C.coral, C.cream, -0.04, eBack(prog(lt, 0.6, 1.0)) * (1 - collapse));
    if (lab > 0.3) text('מעבדת AI', 540, 1400, 64, C.teal, { stroke: 0 });
  }
  // giant chat bubble
  const pb = prog(lt, 4.0, 4.6);
  const multiply = prog(lt, 7.8, 10.3);
  if (pb > 0 && lt < 10.6) {
    const flyUp = eIn(prog(lt, 7.6, 8.1));
    chatBubble(540, 880 - flyUp * 1300, 820, 300, C.cream, eBack(pb));
    const word = 'שלום'; const typed = Math.floor(clamp((lt - 4.8) / 0.3, 0, 4));
    if (pb >= 1) {
      text(word.slice(0, typed), 540 + (typed ? 0 : 0), 870 - flyUp * 1300, 150, C.ink);
      if (typed < 4 || (lt < 7.6 && Math.floor(lt * 3) % 2)) {
        ctx.font = `150px ${HEAD}`; ctx.direction = 'rtl'; const w = ctx.measureText(word.slice(0, typed)).width;
        ctx.fillStyle = C.blue; ctx.fillRect(540 - w / 2 - 22, 800 - flyUp * 1300, 12, 140);
      }
    }
    // send button
    const sp = lt > 7.35 && lt < 7.6 ? 0.85 : 1;
    if (pb >= 1 && flyUp < 1) withT(540, 1180 + flyUp * 400, 0, sp * eBack(prog(lt, 5.2, 5.5)), () => {
      circle(8, 8, 80, C.ink, 0); circle(0, 0, 80, C.coral, 8);
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(35, 10); ctx.lineTo(12, 10); ctx.lineTo(12, 40); ctx.lineTo(-12, 40); ctx.lineTo(-12, 10); ctx.lineTo(-35, 10); ctx.closePath(); fs(C.cream, 5);
    });
    // freeze frame marker on the first line
    if (lt > 6.2 && lt < 7.4) { ctx.save(); ctx.globalAlpha = 0.9; rr(40, 40, 1000, 1840, 30); ctx.lineWidth = 10; ctx.strokeStyle = C.cream; ctx.setLineDash([40, 30]); ctx.stroke(); ctx.restore(); text('❚❚', 540, 470, 70, C.cream, { dir: 'ltr', font: 'DejaVu Sans' }); }
  }
  // multiplying "שלום" bubbles
  if (multiply > 0) {
    const count = Math.floor(Math.pow(2, multiply * 7.2));
    const fade = prog(lt, 10.6, 11.3);
    for (let i = 0; i < Math.min(count, 150); i++) {
      const x = 80 + rand(i * 3.1) * 920, y = 200 + rand(i * 7.7) * 1450;
      const born = i / Math.max(1, count); const s = (0.35 + rand(i + 1) * 0.45) * eBack(clamp((multiply - born * multiply) * 8));
      if (s <= 0) continue;
      ctx.save(); ctx.globalAlpha = 1 - fade * 0.75;
      chatBubble(x, y, 330, 130, cols[i % 5], s, (rand(i + 2) - 0.5) * 0.5, 'right');
      withT(x, y, (rand(i + 2) - 0.5) * 0.5, s, () => text('שלום', 0, 0, 72, C.ink));
      ctx.restore();
    }
  }
  // the connector: researchers · product · money · story
  const pk = prog(lt, 10.4, 11);
  if (pk > 0) {
    const labels = [['חוקרים', C.teal], ['מוצר', C.yellow], ['כסף', C.coral], ['סיפור', C.cream]];
    const pos = [[260, 520], [820, 560], [250, 1250], [820, 1220]];
    labels.forEach(([l, c], i) => {
      const p = eBack(prog(lt, 10.4 + i * 0.3, 10.8 + i * 0.3)); if (p <= 0) return;
      ctx.lineWidth = 10; ctx.strokeStyle = C.cream; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(540, 890);
      ctx.lineTo(lerp(540, pos[i][0], eOut(p)), lerp(890, pos[i][1], eOut(p))); ctx.stroke();
      sticker(l, pos[i][0], pos[i][1], 70, c, C.ink, (i % 2 ? 0.06 : -0.06), p);
    });
    drawSam(540, 860, 0.6 * eBack(pk), { face: Math.sin(lt * 1.5) * 0.4, noBody: false });
  }
}

function scene6(t) { // 59–74 חמישה ימים
  const lt = t - 59;
  if (lt < 1.8) { // crack & peel
    bg(C.navy); halftoneRect(HT_BLUE, 0.35);
    const peel = eIn(prog(lt, 1.0, 1.8));
    ctx.save(); ctx.translate(540, 880 + peel * 1400); ctx.rotate(peel * 0.9); ctx.translate(-540, -880);
    chatBubble(540, 880, 820, 300, C.cream, 1);
    text('שלום', 540, 870, 150, C.ink);
    const pc = prog(lt, 0.1, 0.8);
    ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.lineJoin = 'miter';
    for (let k = 0; k < 5; k++) {
      ctx.beginPath(); let x = 560, y = 880; ctx.moveTo(x, y);
      const a0 = (k / 5) * TAU + 0.4;
      for (let s = 0; s < 8 * pc; s++) { x += Math.cos(a0 + (rand(k * 10 + s) - 0.5) * 1.2) * 55; y += Math.sin(a0 + (rand(k * 10 + s) - 0.5) * 1.2) * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  bg(C.cream); halftoneRect(HT_INK, 0.05);
  const collapse = eIn(prog(lt, 12.2, 12.8));
  if (collapse < 1) {
    ctx.save(); ctx.translate(540, 900); ctx.scale(1 - collapse, 1 - collapse); ctx.translate(-540, -900);
    const slam = (a, b) => eBack(prog(lt, a, b));
    const panel = (x, y, w, h, fill, p, rot, draw) => {
      if (p <= 0) return;
      withT(x + w / 2, y + h / 2, rot * (1 - p), lerp(1.6, 1, clamp(p)), () => {
        ctx.globalAlpha = clamp(p * 2);
        rr(-w / 2 + 12, -h / 2 + 12, w, h, 12); fs(C.ink, 0); rr(-w / 2, -h / 2, w, h, 12); fs(fill, 9);
        ctx.save(); rr(-w / 2, -h / 2, w, h, 12); ctx.clip(); draw(w, h); ctx.restore();
      });
    };
    // A: empty chair
    panel(60, 250, 520, 560, C.blue, slam(1.8, 2.3), -0.2, () => { halftoneRect(HT_WHITE, 0.15, -300, -300, 600, 600); drawChair(0, 20, 0.62, Math.sin(lt * 2) * 0.3); });
    // B: calendar
    panel(620, 250, 400, 560, C.yellow, slam(2.3, 2.8), 0.2, (w, h) => {
      rr(-150, -200, 300, 380, 16); fs(C.cream, 8); rr(-150, -200, 300, 90, 16); fs(C.coral, 8);
      text('נובמבר', 0, -155, 54, C.cream); text('2023', 0, -10, 90, C.ink, { dir: 'ltr', font: BODY, weight: 800 });
      for (let i = 0; i < 5; i++) { const x = -110 + i * 55; circle(x, 110, 20, lt > 6.4 + i * 0.9 ? C.blue : 'rgba(17,17,17,0.12)', 4); }
    });
    // C: revolving door
    panel(60, 850, 960, 420, C.coral, slam(2.8, 3.3), -0.15, (w, h) => {
      rr(-230, -190, 460, 380, 10); fs('#FFE3D6', 8);
      const spin = lt < 10.8 ? Math.sin(lt * 1.2) * 0.2 : (lt - 10.8) * 5;
      for (let i = 0; i < 4; i++) {
        const a = spin + i * Math.PI / 2, x = Math.sin(a) * 200, depth = Math.cos(a);
        ctx.globalAlpha = 0.5 + 0.5 * (depth > 0 ? 1 : 0.4);
        rr(Math.min(0, x) - 4, -180, Math.abs(x) + 8, 360, 4); fs('rgba(31,200,180,0.55)', 6);
      }
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(0, -180); ctx.lineTo(0, 180); ctx.lineWidth = 10; ctx.strokeStyle = C.ink; ctx.stroke();
      const back = prog(lt, 11, 12);
      if (back > 0) drawSam(lerp(380, 0, eOut(back)), -40, 0.55, { face: lerp(-0.8, 0, back), noBody: true });
      text('OpenAI', -360, -130, 60, C.cream, { dir: 'ltr', font: BODY, weight: 800, stroke: 10 });
    });
    // D: day counter
    panel(60, 1310, 960, 200, C.ink, slam(3.3, 3.8), 0.1, () => {
      for (let i = 0; i < 5; i++) {
        const on = prog(lt, 6.4 + i * 0.9, 6.7 + i * 0.9);
        const x = 380 - i * 190, s = on > 0 ? eBack(on) : 0.6;
        withT(x, 0, 0, s, () => text(String(i + 1), 0, 8, 150, on > 0 ? [C.yellow, C.teal, C.coral, C.cream, C.blue][i] : 'rgba(255,255,255,0.18)', { dir: 'ltr', font: BODY, weight: 900 }));
      }
    });
    // ticker
    if (lt > 3.8) {
      rr(-10, 1540, 1100, 70, 0); fs(C.yellow, 6);
      const str = 'OpenAI · מועצה · הנהגה · דרמה · ';
      ctx.save(); ctx.beginPath(); ctx.rect(0, 1540, W, 70); ctx.clip();
      for (let k = 0; k < 4; k++) text(str, ((lt * 260) % 900) + k * 900 - 900, 1578, 44, C.ink, { font: BODY, weight: 800 });
      ctx.restore();
    }
    ctx.restore();
  }
  // chair lands, Sam in it, floor keeps moving
  const land = prog(lt, 12.6, 13.2);
  if (land > 0) {
    // moving floor stripes
    ctx.save(); ctx.beginPath(); ctx.rect(0, 1280, W, 640); ctx.clip();
    bg(C.blue); ctx.fillStyle = C.yellow;
    ctx.beginPath(); ctx.rect(0, 1280, W, 640); ctx.fillStyle = C.blue; ctx.fill();
    for (let i = -2; i < 12; i++) {
      const off = ((lt * 320) % 200);
      ctx.beginPath(); const x = i * 200 - off;
      ctx.moveTo(x, 1280); ctx.lineTo(x + 100, 1280); ctx.lineTo(x - 60, 1920); ctx.lineTo(x - 160, 1920); ctx.closePath(); fs(C.teal, 0);
    }
    ctx.restore();
    ctx.lineWidth = 10; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(0, 1280); ctx.lineTo(W, 1280); ctx.stroke();
    const y = lerp(-400, 900, eOut(land)); const squash = land >= 1 ? 1 + Math.sin((lt - 13.2) * 20) * Math.exp(-(lt - 13.2) * 5) * 0.06 : 1;
    ctx.save(); ctx.translate(540, 1270); ctx.scale(1 / squash, squash); ctx.translate(-540, -1270);
    drawChair(540, y, 1.05, 0);
    drawSam(540, y - 180, 0.75, { face: 0 });
    ctx.restore();
    if (land >= 1) sticker('שוב שלו.', 540, 330, 110, C.coral, C.cream, -0.06, eBack(prog(lt, 13.4, 13.8)));
  }
}

// question-mark track (normalized path points)
function qPath(q) { // q: 0..1 along ?
  // hook part (0..0.72) as arc, then stem down (0.72..0.92), dot handled separately
  if (q < 0.7) {
    const a = lerp(Math.PI * 1.05, Math.PI * 2.55, q / 0.7);
    return [540 + Math.cos(a) * 300, 640 + Math.sin(a) * 260];
  }
  const s = (q - 0.7) / 0.3; const sx = 540 + Math.cos(Math.PI * 2.55) * 300, sy = 640 + Math.sin(Math.PI * 2.55) * 260;
  return [lerp(sx, 540, s), lerp(sy, 1160, s)];
}
function scene7(t) { // 74–90 לא סוף הסיפור
  const lt = t - 74;
  if (lt >= 13) { // hard cut — series logo
    bg(C.ink);
    const p = eBack(prog(lt, 13, 13.4));
    sunburst(540, 900, 20, C.blue, lt * 0.2, 0.5);
    withT(540, 880, -0.03, p, () => {
      rr(-420, -180, 840, 360, 30); fs(C.coral, 0);
      rr(-440, -200, 840, 360, 30); fs(C.blue, 12, C.cream);
      text('יהודי AI', -20, -20, 190, C.cream, { stroke: 0, shadow: C.ink });
    });
    sticker('פרק 1 · סם אלטמן', 540, 1200, 64, C.yellow, C.ink, 0.03, eBack(prog(lt, 13.4, 13.8)));
    return;
  }
  bg(C.teal); halftoneRect(HT_WHITE, 0.12);
  const cover = prog(lt, 10.2, 10.6);
  // track along "?"
  const drawn = eOut(prog(lt, 0, 1.6));
  ctx.lineCap = 'round';
  for (const [lw, col] of [[110, C.ink], [90, C.cream]]) {
    ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath();
    for (let i = 0; i <= 120 * drawn; i++) { const [x, y] = qPath(i / 120); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  }
  // decorations along the track: chips, chat bubbles, headlines
  for (let i = 0; i < 12; i++) {
    const q = (i + 0.5) / 12; if (q > drawn) continue; const [x, y] = qPath(q);
    const k = i % 3, s = eBack(prog(lt, 0.3 + i * 0.1, 0.6 + i * 0.1));
    const nx = x + (i % 2 ? 1 : -1) * 0;
    withT(nx, y, (rand(i) - 0.5) * 0.6, s * 0.55, () => {
      if (k === 0) { rr(-40, -40, 80, 80, 6); fs(C.ink, 0); for (let j = -1; j <= 1; j++) { ctx.fillStyle = C.yellow; ctx.fillRect(j * 22 - 5, -58, 10, 18); ctx.fillRect(j * 22 - 5, 40, 10, 18); } rr(-22, -22, 44, 44, 4); fs(C.blue, 0); }
      if (k === 1) { chatBubble(0, 0, 150, 80, C.coral, 1); }
      if (k === 2) { rr(-90, -40, 180, 80, 4); fs('#fff', 5); rr(-70, -22, 140, 14, 7); fs(C.ink, 0); rr(-70, 6, 100, 10, 5); fs('rgba(17,17,17,0.3)', 0); }
    });
  }
  // dot of the "?"
  const pd = eBack(prog(lt, 1.4, 1.8)); if (pd > 0) { circle(540, 1330, 80 * pd, C.coral, 10); }
  // chair-car driving
  const pdrive = eInOut(prog(lt, 1.6, 9.6));
  if (pdrive > 0 && cover < 1) {
    const q = pdrive; const [x, y] = qPath(q); const [x2, y2] = qPath(Math.min(1, q + 0.01));
    const ang = Math.atan2(y2 - y, x2 - x);
    withT(x, y - 30, 0, 0.42, () => {
      ctx.save(); ctx.rotate(Math.sin(lt * 12) * 0.03);
      rr(-230, 100, 460, 110, 40); fs(C.coral, 9); // car body
      for (const wx of [-150, 150]) { const wa = lt * 12; circle(wx, 220, 60, C.ink, 0); circle(wx, 220, 26, C.yellow, 0); ctx.beginPath(); ctx.moveTo(wx, 220); ctx.lineTo(wx + Math.cos(wa) * 26, 220 + Math.sin(wa) * 26); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke(); }
      drawChair(0, -140, 0.75, 0, { wheels: false });
      drawSam(0, -280, 0.55, { face: Math.cos(ang) > 0 ? -0.5 : 0.5 });
      ctx.restore();
    });
  }
  // Sam turns to camera + cover headline
  if (cover > 0) {
    ctx.save(); ctx.globalAlpha = clamp(cover * 2); bg(C.yellow); sunburst(540, 1100, 24, C.coral, lt * 0.2, 0.35); halftoneRect(HT_INK, 0.06); ctx.restore();
    const turn = eInOut(prog(lt, 10.4, 11.2));
    drawSam(540, 1100, 1.35 * eBack(cover), { face: lerp(-0.9, 0, turn), blink: lt > 12.3 && lt < 12.42 });
    const ph = prog(lt, 11.2, 11.5);
    if (ph > 0) {
      withT(540, 440, -0.05, lerp(2.4, 1, eOut(ph)), () => {
        ctx.globalAlpha = clamp(ph * 3);
        rr(-470, -170, 940, 340, 20); fs(C.ink, 0);
        rr(-485, -185, 940, 340, 20); fs(C.blue, 10);
        text('מי מוביל', -15, -70, 130, C.cream);
        text('את ה־AI?', -15, 65, 130, C.yellow);
      });
    }
    withT(540, 200, 0, eBack(cover), () => { text('יהודי AI', 0, 0, 70, C.ink, { stroke: 0 }); });
  }
}

// ---------- global overlays ----------
function overlays(t) {
  // film grain / print texture (boils at 12fps for a hand-made feel)
  const f = Math.floor(t * 12);
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(GRAIN, -(f * 97 % 512), -(f * 53 % 512), W + 1024, H + 1024);
  ctx.restore();
  // "illustration" disclaimer tag
  if (t < 87) { text('איור להמחשה', 1030, 1880, 26, 'rgba(17,17,17,0.55)', { font: BODY, weight: 600, align: 'right' }); }
  // border frame
  ctx.lineWidth = 16; ctx.strokeStyle = C.ink; ctx.strokeRect(0, 0, W, H);
}

const SCENES = [[0, 10, scene1], [10, 21, scene2], [21, 34, scene3], [34, 45, scene4], [45, 59, scene5], [59, 74, scene6], [74, 90.1, scene7]];
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.setLineDash([]);
  const sc = SCENES.find(s => t >= s[0] && t < s[1]) || SCENES[SCENES.length - 1];
  ctx.save(); sc[2](t); ctx.restore();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  for (const b of [10, 21, 34, 45, 59, 74]) wipe(t, b);
  drawCaption(t);
  overlays(t);
}

window.DURATION = DURATION;
window.renderFrame = renderFrame;
window.ready = document.fonts.load(`100px "Secular One"`).then(() => document.fonts.load(`600 50px "Rubik"`))
  .then(() => document.fonts.load(`800 50px "Rubik"`)).then(() => { initTextures(); renderFrame(0); return true; });
