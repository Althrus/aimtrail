/*! AimTrail — mesin render ekor mouse (dipakai overlay.html & panel.html) */
(function (root) {
'use strict';

const TRIGGERS = { left: 1, right: 2, middle: 4, x1: 8, x2: 16 };

/* ------------------------------------------------------------------ pengaturan */
const DEFAULTS = {
  // pemicu
  useTheme: false,   // ikuti tema bersama (warna dari halaman Tema)
  alwaysOn: false,   // ekor selalu aktif mengikuti gerakan mouse, tanpa tombol pemicu
  trigger: 'left', triggerMode: 'hold',
  // gerakan
  sensitivity: 1, invertX: false, invertY: false,
  boundary: 'follow', followMargin: 0.28, followSmooth: 140,
  originOnPress: 'center', originX: 0.5, originY: 0.5,
  // ekor
  life: 1000, releaseLife: 700, fadeCurve: 1,
  headWidth: 6, tailWidth: 1.5, uiScale: 1, opacity: 1,
  smoothing: true, minDist: 1.5, maxPoints: 3000, segments: 48,
  colorMode: 'gradient', colorHead: '#38bdf8', colorTail: '#0ea5e9',
  rainbowSpeed: 3, rainbowSpread: 120, speedRef: 3,
  // glow
  glow: true, glowMatch: false, glowColor: '#0ea5e9', glowWidth: 22, glowOpacity: 0.22, glowBlur: 6,
  // kepala
  showHead: true, headColor: '#e0f2fe', headSize: 6, headFade: 250,
  showRing: true, ringColor: '#38bdf8', ringSize: 14, ringWidth: 1.5, ringOpacity: 0.7, ringPulse: true,
  ripple: true, rippleSize: 60, rippleLife: 450,
  idleDot: false, idleOpacity: 0.5,
  // performa
  quality: 'balanced', timeSmooth: true,
  // watermark
  wm: true, wmPos: 'br', wmOpacity: 0.65, wmScale: 1, wmMargin: 18,
  // latar (hanya bila diperlukan; default transparan)
  bg: 'none', bgColor: '#0b1220', bgOpacity: 1, gridSize: 60, gridColor: '#263243',
  // garis tepi overlay
  border: false, borderColor: '#38bdf8', borderWidth: 4, borderOpacity: 1, borderStyle: 'solid',
  borderRadius: 0, borderInset: 0, borderGlow: 0
};

const QUALITY = { high: { gs: 1, blur: 1, seg: 48 }, balanced: { gs: 0.5, blur: 0.5, seg: 32 }, low: { gs: 0.35, blur: 0, seg: 20 } };

const BEHAVIOR = new Set(['useTheme', 'alwaysOn', 'trigger', 'triggerMode', 'sensitivity', 'invertX', 'invertY', 'boundary',
  'followMargin', 'followSmooth', 'originOnPress', 'originX', 'originY',
  'bg', 'bgColor', 'bgOpacity', 'gridSize', 'gridColor',
  'border', 'borderColor', 'borderWidth', 'borderOpacity', 'borderStyle', 'borderRadius', 'borderInset', 'borderGlow',
  'wm', 'wmPos', 'wmOpacity', 'wmScale', 'wmMargin']);

const PRESETS = {
  'Neon Biru': {},
  'Api': { colorHead: '#fde047', colorTail: '#ef4444', glowColor: '#f97316', headColor: '#fff7ed',
    ringColor: '#fb923c', life: 800, headWidth: 7, tailWidth: 2 },
  'Laser Merah': { colorMode: 'solid', colorHead: '#ff2d55', glowColor: '#ff2d55', headColor: '#ffffff',
    ringColor: '#ff2d55', life: 550, releaseLife: 350, headWidth: 3, tailWidth: 3, glowWidth: 14,
    fadeCurve: 1.4, showRing: false, ripple: false },
  'Matrix': { colorHead: '#bbf7d0', colorTail: '#16a34a', glowColor: '#22c55e', headColor: '#f0fdf4',
    ringColor: '#4ade80', life: 1400, headWidth: 4, tailWidth: 1, glowOpacity: 0.3 },
  'Pelangi': { colorMode: 'rainbow', glowMatch: true, headColor: '#ffffff', ringColor: '#ffffff',
    life: 1200, headWidth: 7, tailWidth: 3 },
  'Heatmap Kecepatan': { colorMode: 'speed', colorTail: '#38bdf8', colorHead: '#ff3b30', glowMatch: true,
    headColor: '#ffffff', ringColor: '#ffffff', life: 900, headWidth: 6, tailWidth: 3 },
  'Ungu Plasma': { colorHead: '#f0abfc', colorTail: '#7c3aed', glowColor: '#a855f7', headColor: '#faf5ff',
    ringColor: '#c084fc', glowWidth: 30, glowBlur: 10, life: 1100 },
  'Putih Minimal': { colorMode: 'solid', colorHead: '#ffffff', glow: false, showRing: false, ripple: false,
    headSize: 3.5, headColor: '#ffffff', headWidth: 3, tailWidth: 1, life: 700, releaseLife: 400 }
};

const SCHEMA = [
  { g: 'Pemicu', items: [
    { k: 'alwaysOn', l: 'Selalu aktif: ekor mengikuti gerakan mouse tanpa perlu menekan tombol', t: 'check' },
    { k: 'trigger', l: 'Tombol pemicu', t: 'select', o: { left: 'Klik kiri', right: 'Klik kanan',
      middle: 'Klik tengah (scroll)', x1: 'Mouse 4 (samping belakang)', x2: 'Mouse 5 (samping depan)' } },
    { k: 'triggerMode', l: 'Mode', t: 'select', o: { hold: 'Tahan (aktif selama ditekan)',
      toggle: 'Toggle (tekan sekali = on/off)' } }
  ] },
  { g: 'Gerakan', items: [
    { k: 'sensitivity', l: 'Sensitivitas (px per hitungan mouse)', t: 'range', min: 0.1, max: 5, step: 0.05, u: '×' },
    { k: 'invertX', l: 'Balik sumbu X', t: 'check' },
    { k: 'invertY', l: 'Balik sumbu Y', t: 'check' },
    { k: 'boundary', l: 'Saat mencapai tepi layar', t: 'select', o: { lock: 'Titik terkunci di tengah (ekor yang bergerak)', follow: 'Kamera ikut bergeser',
      clamp: 'Tertahan di tepi', free: 'Bebas (boleh keluar layar)' } },
    { k: 'followMargin', l: 'Jarak tepi sebelum kamera bergeser', t: 'range', min: 0.05, max: 0.45, step: 0.01, p: 1 },
    { k: 'followSmooth', l: 'Kehalusan kamera', t: 'range', min: 0, max: 600, step: 10, u: ' ms' },
    { k: 'originOnPress', l: 'Titik awal tiap tekan', t: 'select', o: { center: 'Selalu dari titik pusat',
      keep: 'Lanjut dari posisi terakhir' } },
    { k: 'originX', l: 'Posisi titik pusat X', t: 'range', min: 0, max: 1, step: 0.01, p: 1 },
    { k: 'originY', l: 'Posisi titik pusat Y', t: 'range', min: 0, max: 1, step: 0.01, p: 1 }
  ] },
  { g: 'Ekor', items: [
    { k: 'life', l: 'Lama ekor bertahan', t: 'range', min: 100, max: 4000, step: 50, u: ' ms' },
    { k: 'releaseLife', l: 'Waktu hilang setelah klik dilepas (0 = ikut lama ekor)', t: 'range', min: 0, max: 3000, step: 50, u: ' ms' },
    { k: 'fadeCurve', l: 'Kurva memudar', t: 'range', min: 0.3, max: 3, step: 0.05, u: '' },
    { k: 'headWidth', l: 'Tebal ekor (ujung baru)', t: 'range', min: 1, max: 30, step: 0.5, u: ' px' },
    { k: 'tailWidth', l: 'Tebal ekor (ujung lama)', t: 'range', min: 0, max: 30, step: 0.5, u: ' px' },
    { k: 'uiScale', l: 'Skala semua ukuran', t: 'range', min: 0.5, max: 4, step: 0.05, u: '×' },
    { k: 'opacity', l: 'Opasitas keseluruhan', t: 'range', min: 0.1, max: 1, step: 0.01, p: 1 },
    { k: 'smoothing', l: 'Haluskan lengkungan', t: 'check' },
    { k: 'minDist', l: 'Jarak minimum antar titik', t: 'range', min: 0.5, max: 10, step: 0.5, u: ' px' },
    { k: 'maxPoints', l: 'Batas titik per tembakan', t: 'range', min: 200, max: 6000, step: 100, u: '' }
  ] },
  { g: 'Warna', items: [
    { k: 'useTheme', l: 'Ikuti tema bersama (abaikan warna di bawah)', t: 'check' },
    { k: 'colorMode', l: 'Mode warna', t: 'select', o: { gradient: 'Gradasi (baru → lama)', solid: 'Satu warna',
      rainbow: 'Pelangi berputar', speed: 'Berdasarkan kecepatan (lambat → cepat)' } },
    { k: 'colorHead', l: 'Warna ujung baru / cepat', t: 'color' },
    { k: 'colorTail', l: 'Warna ujung lama / lambat', t: 'color' },
    { k: 'rainbowSpeed', l: 'Kecepatan putar pelangi', t: 'range', min: 0, max: 10, step: 0.5, u: '' },
    { k: 'rainbowSpread', l: 'Sebaran pelangi sepanjang ekor', t: 'range', min: 0, max: 360, step: 10, u: '°' },
    { k: 'speedRef', l: 'Kecepatan dianggap "cepat"', t: 'range', min: 0.2, max: 10, step: 0.1, u: ' px/ms' }
  ] },
  { g: 'Glow', items: [
    { k: 'glow', l: 'Aktifkan glow', t: 'check' },
    { k: 'glowMatch', l: 'Glow mengikuti warna ekor', t: 'check' },
    { k: 'glowColor', l: 'Warna glow', t: 'color' },
    { k: 'glowWidth', l: 'Lebar glow', t: 'range', min: 0, max: 80, step: 1, u: ' px' },
    { k: 'glowOpacity', l: 'Kekuatan glow', t: 'range', min: 0, max: 1, step: 0.01, p: 1 },
    { k: 'glowBlur', l: 'Blur glow', t: 'range', min: 0, max: 40, step: 1, u: ' px' }
  ] },
  { g: 'Titik kepala', items: [
    { k: 'showHead', l: 'Tampilkan titik kepala', t: 'check' },
    { k: 'headColor', l: 'Warna titik', t: 'color' },
    { k: 'headSize', l: 'Ukuran titik', t: 'range', min: 1, max: 30, step: 0.5, u: ' px' },
    { k: 'headFade', l: 'Lama hilang setelah dilepas', t: 'range', min: 0, max: 1500, step: 25, u: ' ms' },
    { k: 'showRing', l: 'Tampilkan cincin', t: 'check' },
    { k: 'ringColor', l: 'Warna cincin', t: 'color' },
    { k: 'ringSize', l: 'Ukuran cincin', t: 'range', min: 4, max: 60, step: 0.5, u: ' px' },
    { k: 'ringWidth', l: 'Tebal cincin', t: 'range', min: 0.5, max: 8, step: 0.25, u: ' px' },
    { k: 'ringOpacity', l: 'Opasitas cincin', t: 'range', min: 0, max: 1, step: 0.01, p: 1 },
    { k: 'ringPulse', l: 'Cincin berdenyut', t: 'check' },
    { k: 'idleDot', l: 'Titik tetap tampil saat klik tidak ditekan', t: 'check' },
    { k: 'idleOpacity', l: 'Opasitas titik saat diam', t: 'range', min: 0.05, max: 1, step: 0.01, p: 1 },
    { k: 'ripple', l: 'Gelombang saat klik ditekan', t: 'check' },
    { k: 'rippleSize', l: 'Ukuran gelombang', t: 'range', min: 10, max: 200, step: 5, u: ' px' },
    { k: 'rippleLife', l: 'Durasi gelombang', t: 'range', min: 100, max: 1500, step: 50, u: ' ms' }
  ] },
  { g: 'Performa & kehalusan', items: [
    { k: 'quality', l: 'Kualitas render (turunkan jika overlay terasa berat)', t: 'select', o: {
      high: 'Tinggi (glow paling halus)', balanced: 'Seimbang (lebih ringan)', low: 'Ringan (paling cepat)' } },
    { k: 'timeSmooth', l: 'Ratakan jeda pengiriman data (lebih mulus)', t: 'check' }
  ] },
  { g: 'Latar (opsional)', items: [
    { k: 'bg', l: 'Latar belakang overlay', t: 'select', o: { none: 'Transparan (disarankan untuk OBS)',
      grid: 'Grid', solid: 'Warna solid' } },
    { k: 'bgColor', l: 'Warna latar', t: 'color' },
    { k: 'bgOpacity', l: 'Opasitas latar', t: 'range', min: 0, max: 1, step: 0.01, p: 1 },
    { k: 'gridSize', l: 'Ukuran kotak grid', t: 'range', min: 10, max: 200, step: 5, u: ' px' },
    { k: 'gridColor', l: 'Warna garis grid', t: 'color' },
    { k: 'border', l: 'Tampilkan garis tepi overlay', t: 'check' },
    { k: 'borderColor', l: 'Warna garis tepi', t: 'color' },
    { k: 'borderWidth', l: 'Tebal garis tepi', t: 'range', min: 1, max: 40, step: 1, u: ' px' },
    { k: 'borderOpacity', l: 'Opasitas garis tepi', t: 'range', min: 0.05, max: 1, step: 0.01, p: 1 },
    { k: 'borderStyle', l: 'Gaya garis tepi', t: 'select', o: { solid: 'Solid', dashed: 'Putus-putus', dotted: 'Titik-titik', double: 'Ganda' } },
    { k: 'borderRadius', l: 'Sudut membulat', t: 'range', min: 0, max: 300, step: 2, u: ' px' },
    { k: 'borderInset', l: 'Jarak dari tepi layar', t: 'range', min: 0, max: 300, step: 2, u: ' px' },
    { k: 'borderGlow', l: 'Glow garis tepi', t: 'range', min: 0, max: 60, step: 1, u: ' px' }
  ] },
  { g: 'Watermark', items: [
    { k: 'wm', l: 'Tampilkan watermark kecil (Created by Andromache)', t: 'check' },
    { k: 'wmPos', l: 'Posisi', t: 'select', o: { br: 'Kanan bawah', bl: 'Kiri bawah', tr: 'Kanan atas', tl: 'Kiri atas' } },
    { k: 'wmOpacity', l: 'Opasitas', t: 'range', min: 0.1, max: 1, step: 0.05, p: 1 },
    { k: 'wmScale', l: 'Ukuran', t: 'range', min: 0.5, max: 3, step: 0.1, u: '×' },
    { k: 'wmMargin', l: 'Jarak dari tepi', t: 'range', min: 0, max: 80, step: 2, u: ' px' }
  ] }
];

/* -------------------------------------------------------------------- utilitas */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hexCache = new Map();
function hex2rgb(h) {
  let c = hexCache.get(h);
  if (!c) {
    let s = String(h || '#fff').replace('#', '');
    if (s.length === 3) s = s.split('').map(x => x + x).join('');
    const n = parseInt(s, 16) || 0;
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache.set(h, c);
  }
  return c;
}
function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
}
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1).toFixed(3)})`;
function hsl2rgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** Bangun jalur untuk potongan [a..b] dari polyline P (piece i = ujung di P[i], i = 1..n-1). */
function pathChunk(ctx, P, a, b, smooth) {
  const n = P.length;
  if (!smooth) {
    ctx.moveTo(P[a - 1].x, P[a - 1].y);
    for (let i = a; i <= b; i++) ctx.lineTo(P[i].x, P[i].y);
    return;
  }
  if (a === 1) ctx.moveTo(P[0].x, P[0].y);
  else ctx.moveTo((P[a - 1].x + P[a].x) / 2, (P[a - 1].y + P[a].y) / 2);
  for (let i = a; i <= b; i++) {
    if (i <= n - 2) ctx.quadraticCurveTo(P[i].x, P[i].y, (P[i].x + P[i + 1].x) / 2, (P[i].y + P[i + 1].y) / 2);
    else ctx.lineTo(P[n - 1].x, P[n - 1].y);
  }
}

function strokeChunks(ctx, P, ch, smooth, widthFn, alphaMul, colorOverride) {
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (let i = 0; i < ch.length; i++) {
    const k = ch[i];
    ctx.beginPath();
    pathChunk(ctx, P, k.a, k.b, smooth);
    ctx.lineWidth = widthFn(k);
    ctx.strokeStyle = rgba(colorOverride || k.col, k.al * alphaMul);
    ctx.stroke();
  }
}

/* --------------------------------------------------------------------- renderer */
class AimTrail {
  constructor(main, glow) {
    this.c = main; this.g = glow || null;
    this.ctx = main.getContext('2d');
    this.gctx = glow ? glow.getContext('2d') : null;
    this.cfg = Object.assign({}, DEFAULTS);
    this.W = main.width; this.H = main.height; this.dpr = 1;
    this.strokes = []; this.ripples = []; this.cur = null;
    this.mask = 0; this.lastDown = false; this.toggled = false;
    this.hx = 0; this.hy = 0; this.cam = { x: 0, y: 0 }; this.vel = 0;
    this.init = false; this.last = 0; this.idle = false;
    this.always = false; this.lastMove = 0; this.theme = null; this.rawCfg = null;
    this.q = QUALITY.high; this.fps = 0; this._fc = 0; this._ft = 0;
  }

  setTheme(t) { this.theme = t; if (this.rawCfg) this.setConfig(this.rawCfg); }

  setConfig(c) {
    this.rawCfg = c;
    const old = this.cfg;
    const n = Object.assign({}, DEFAULTS, c);
    if (n.useTheme && this.theme && root.AimTheme) Object.assign(n, root.AimTheme.trailOverrides(this.theme));
    n.followMargin = clamp(n.followMargin, 0.02, 0.49);
    n.life = Math.max(50, n.life);
    this.cfg = n;
    const q = QUALITY[n.quality] || QUALITY.high, resized = q !== this.q;
    this.q = q;
    if (resized && this.W) this.resize(this.W, this.H, this.dpr);
    const now0 = performance.now();
    if (this.cur && !this.always && !n.alwaysOn && (old.trigger !== n.trigger || old.triggerMode !== n.triggerMode)) this._end(now0);
    this.toggled = this.toggled && !!this.cur;
    this._syncAlways(now0);
    for (const cv of [this.c, this.g]) if (cv && cv.style) cv.style.opacity = n.opacity;
    if (this.g && this.g.style) {
      this.g.style.filter = n.glowBlur * q.blur > 0 ? `blur(${n.glowBlur * n.uiScale * q.blur}px)` : 'none';
      this.g.style.display = n.glow ? '' : 'none';
    }
    this.idle = false;
  }

  resize(w, h, dpr) {
    this.W = w; this.H = h; this.dpr = dpr || 1;
    if (this.c) { this.c.width = Math.round(w * this.dpr); this.c.height = Math.round(h * this.dpr); }
    if (this.g) { const gs = this.q.gs; this.g.width = Math.max(1, Math.round(w * this.dpr * gs)); this.g.height = Math.max(1, Math.round(h * this.dpr * gs)); }
    this.idle = false;
  }

  clear() {
    this.strokes.length = 0; this.ripples.length = 0; this.cur = null; this.toggled = false; this.idle = false;
    this._syncAlways(performance.now());
  }

  /* Mode selalu aktif: satu goresan terus berjalan mengikuti gerakan mouse. Mati -> kembali ke tombol pemicu. */
  _syncAlways(now) {
    const on = !!this.cfg.alwaysOn;
    if (on && !this.always) { this.always = true; this._end(now); this.toggled = false; this._begin(now, true); }
    else if (!on && this.always) {
      this.always = false; this._end(now); this.lastDown = false; this.toggled = false;
      this.buttons(this.mask, now);   // jika tombol pemicu sedang ditahan, lanjut normal
    } else if (on && !this.cur) this._begin(now, true);
  }

  /* --- input --- */
  buttons(mask, now) {
    now = now || performance.now();
    this.mask = mask;
    if (this.always) return;   // mode selalu aktif: tombol diabaikan
    const down = (mask & TRIGGERS[this.cfg.trigger]) !== 0;
    if (this.cfg.triggerMode === 'toggle') {
      if (down && !this.lastDown) { this.toggled = !this.toggled; this.toggled ? this._begin(now) : this._end(now); }
    } else if (down && !this.cur) this._begin(now);
    else if (!down && this.cur) this._end(now);
    this.lastDown = down;
  }

  _begin(now, quiet) {
    const c = this.cfg;
    this.lastMove = now;
    if (this.cur) this._end(now);
    if (!this.init || c.originOnPress === 'center') {
      this.hx = this.cam.x + this.W * c.originX;
      this.hy = this.cam.y + this.H * c.originY;
      this.init = true;
    }
    const s = { pts: [{ x: this.hx, y: this.hy, t: now, v: 0 }], endT: 0, hx: this.hx, hy: this.hy };
    this.cur = s; this.strokes.push(s); this.vel = 0;
    if (c.ripple && !quiet) this.ripples.push({ x: this.hx, y: this.hy, t: now });
    this.idle = false;
  }

  _end(now) {
    if (this.cur) { this.cur.endT = now || performance.now(); this.cur = null; }
  }

  move(dx, dy, d, now) {
    const s = this.cur;
    if (!s) return;
    now = now || performance.now();
    this.lastMove = now;
    const c = this.cfg;
    dx *= c.sensitivity * (c.invertX ? -1 : 1);
    dy *= c.sensitivity * (c.invertY ? -1 : 1);
    let nx = this.hx + dx, ny = this.hy + dy;
    if (c.boundary === 'clamp') {
      nx = clamp(nx, this.cam.x, this.cam.x + this.W);
      ny = clamp(ny, this.cam.y, this.cam.y + this.H);
    }
    if (d > 0) this.vel += (Math.hypot(dx, dy) / Math.max(d, 1) - this.vel) * 0.35;
    this.hx = s.hx = nx; this.hy = s.hy = ny;
    if (c.boundary === 'lock') { this.cam.x = nx - this.W * c.originX; this.cam.y = ny - this.H * c.originY; }
    const last = s.pts[s.pts.length - 1];
    if (Math.hypot(nx - last.x, ny - last.y) >= c.minDist) {
      s.pts.push({ x: nx, y: ny, t: now, v: this.vel });
      if (s.pts.length > c.maxPoints) s.pts.shift();
    }
    this.idle = false;
  }

  /* --- frame --- */
  frame(now) {
    const dt = this.last ? Math.min(now - this.last, 100) : 16;
    this.last = now;
    this._fc++;
    if (!this._ft) this._ft = now;
    else if (now - this._ft >= 1000) { this.fps = Math.round(this._fc * 1000 / (now - this._ft)); this._fc = 0; this._ft = now; }
    if (this.idle) return;
    this._camera(dt);
    this._cull(now);
    this._draw(now);
    const c = this.cfg;
    if (!this.cur) { if (!this.strokes.length && !this.ripples.length && !c.idleDot) this.idle = true; }
    else if (this._still(now) && this.cur.pts.length <= 1 && this.strokes.length <= 1 && !this.ripples.length) this.idle = true;
  }

  _still(now) { return this.always && now - this.lastMove > this.cfg.life + 60; }   // mouse diam: berhenti menggambar

  _camera(dt) {
    const c = this.cfg;
    if (c.boundary === 'lock' && this.cur) { this.cam.x = this.hx - this.W * c.originX; this.cam.y = this.hy - this.H * c.originY; return; }
    if (c.boundary !== 'follow' || !this.cur) return;
    const mx = this.W * c.followMargin, my = this.H * c.followMargin;
    const sx = this.hx - this.cam.x, sy = this.hy - this.cam.y;
    let tx = this.cam.x, ty = this.cam.y;
    if (sx < mx) tx = this.hx - mx; else if (sx > this.W - mx) tx = this.hx - (this.W - mx);
    if (sy < my) ty = this.hy - my; else if (sy > this.H - my) ty = this.hy - (this.H - my);
    const k = c.followSmooth > 0 ? 1 - Math.exp(-dt / c.followSmooth) : 1;
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
  }

  _cull(now) {
    const c = this.cfg;
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const s = this.strokes[i], p = s.pts;
      let k = 0;
      while (k < p.length - 1 && now - p[k].t >= c.life) k++;
      if (k) p.splice(0, k);
      const lastAge = now - p[p.length - 1].t;
      if (s.endT && ((c.releaseLife > 0 && now - s.endT >= c.releaseLife) || lastAge >= c.life)) this.strokes.splice(i, 1);
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) if (now - this.ripples[i].t >= c.rippleLife) this.ripples.splice(i, 1);
  }

  _draw(now) {
    const { ctx, gctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.c.width, this.c.height);
    if (gctx) { gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.clearRect(0, 0, this.g.width, this.g.height); }
    const tx = -this.cam.x * dpr, ty = -this.cam.y * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, tx, ty);
    if (gctx) { const gs = this.q.gs; gctx.setTransform(dpr * gs, 0, 0, dpr * gs, tx * gs, ty * gs); }
    for (const s of this.strokes) this._trail(s, now);
    this._heads(now);
  }

  _color(c, f, v, now) {
    switch (c.colorMode) {
      case 'solid': return hex2rgb(c.colorHead);
      case 'rainbow': return hsl2rgb(now * 0.06 * c.rainbowSpeed - f * c.rainbowSpread, 1, 0.6);
      case 'speed': return mix(c.colorTail, c.colorHead, clamp(v / c.speedRef, 0, 1));
      default: return mix(c.colorHead, c.colorTail, f);
    }
  }

  _trail(s, now) {   // titik kepala "hidup" ditambahkan sementara (tanpa menyalin array tiap frame)
    const P = s.pts, live = !s.endT;
    if (live) P.push({ x: s.hx, y: s.hy, t: now, v: this.vel });
    try { this._trailDraw(s, now, P); } finally { if (live) P.pop(); }
  }

  _trailDraw(s, now, P) {
    const c = this.cfg, ui = c.uiScale;
    const n = P.length;
    if (n < 2) return;
    const rel = s.endT && c.releaseLife > 0 ? Math.max(0, 1 - (now - s.endT) / c.releaseLife) : 1;
    if (rel <= 0) return;
    const pieces = n - 1, K = Math.min(c.segments, this.q.seg, pieces), ch = [];
    for (let k = 0; k < K; k++) {
      const a = 1 + Math.floor(k * pieces / K), b = Math.floor((k + 1) * pieces / K);
      if (b < a) continue;
      const m = (a + b) >> 1, f = clamp((now - P[m].t) / c.life, 0, 1);
      const al = Math.pow(1 - f, c.fadeCurve) * rel;
      if (al < 0.004) continue;
      ch.push({ a, b, al, f, w: (c.tailWidth + (c.headWidth - c.tailWidth) * (1 - f)) * ui,
        col: this._color(c, f, P[m].v, now) });
    }
    if (!ch.length) return;
    const gc = this.gctx || this.ctx;
    if (c.glow && c.glowWidth > 0) {
      const match = c.glowMatch || c.colorMode === 'rainbow' || c.colorMode === 'speed';
      strokeChunks(gc, P, ch, c.smoothing, k => k.w + c.glowWidth * ui * (0.3 + 0.7 * (1 - k.f)),
        c.glowOpacity, match ? null : hex2rgb(c.glowColor));
    }
    strokeChunks(this.ctx, P, ch, c.smoothing, k => Math.max(k.w, 0.1), 1, null);
    if (!s.endT) {   // ujung bulat di kepala
      const k = ch[ch.length - 1], e = P[n - 1];
      this.ctx.fillStyle = rgba(k.col, k.al);
      this.ctx.beginPath(); this.ctx.arc(e.x, e.y, Math.max(k.w, 0.1) / 2, 0, 6.2832); this.ctx.fill();
    }
  }

  _heads(now) {
    const c = this.cfg, ui = c.uiScale, ctx = this.ctx, gc = this.gctx || this.ctx;
    for (const r of this.ripples) {
      const t = (now - r.t) / c.rippleLife, e = 1 - Math.pow(1 - t, 3);
      ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(c.rippleSize * ui * e, 0.5), 0, 6.2832);
      ctx.lineWidth = Math.max(c.ringWidth * ui * (1 - t * 0.6), 0.3);
      ctx.strokeStyle = rgba(hex2rgb(c.ringColor), 0.85 * (1 - t));
      ctx.stroke();
    }
    if (c.idleDot && !this.cur) {   // titik diam di titik pusat
      const x = this.cam.x + this.W * c.originX, y = this.cam.y + this.H * c.originY, a = c.idleOpacity;
      if (c.showRing) {
        ctx.beginPath(); ctx.arc(x, y, c.ringSize * ui, 0, 6.2832); ctx.lineWidth = c.ringWidth * ui;
        ctx.strokeStyle = rgba(hex2rgb(c.ringColor), c.ringOpacity * a); ctx.stroke();
      }
      if (c.showHead) {
        ctx.beginPath(); ctx.arc(x, y, c.headSize * ui, 0, 6.2832);
        ctx.fillStyle = rgba(hex2rgb(c.headColor), a); ctx.fill();
      }
    }
    for (const s of this.strokes) {
      const ha = s.endT ? 1 - (now - s.endT) / Math.max(c.headFade, 1) : 1;
      if (ha <= 0) continue;
      if (c.glow && c.showHead && c.glowWidth > 0) {
        gc.beginPath(); gc.arc(s.hx, s.hy, c.headSize * ui * 2.2, 0, 6.2832);
        gc.fillStyle = rgba(hex2rgb(c.glowColor), Math.min(1, c.glowOpacity * 1.6) * ha); gc.fill();
      }
      if (c.showRing) {
        const pr = c.ringPulse && !this._still(now) ? 1 + 0.12 * Math.sin(now / 170) : 1;
        ctx.beginPath(); ctx.arc(s.hx, s.hy, c.ringSize * ui * pr, 0, 6.2832);
        ctx.lineWidth = c.ringWidth * ui;
        ctx.strokeStyle = rgba(hex2rgb(c.ringColor), c.ringOpacity * ha); ctx.stroke();
      }
      if (c.showHead) {
        ctx.beginPath(); ctx.arc(s.hx, s.hy, c.headSize * ui, 0, 6.2832);
        ctx.fillStyle = rgba(hex2rgb(c.headColor), ha); ctx.fill();
      }
    }
  }
}

/* ---------------------------------------------------------------- bantuan jaringan/halaman */
function applyBackground(el, c) {
  const s = el.style;
  if (c.bg === 'grid') {
    s.backgroundColor = rgba(hex2rgb(c.bgColor), c.bgOpacity);
    s.backgroundImage = `linear-gradient(${c.gridColor} 1px,transparent 1px),linear-gradient(90deg,${c.gridColor} 1px,transparent 1px)`;
    s.backgroundSize = `${c.gridSize}px ${c.gridSize}px`;
  } else if (c.bg === 'solid') {
    s.backgroundColor = rgba(hex2rgb(c.bgColor), c.bgOpacity); s.backgroundImage = 'none';
  } else { s.backgroundColor = 'transparent'; s.backgroundImage = 'none'; }
}

/** Garis tepi di elemen pembungkus (div kosong, tidak menghalangi klik, tidak mengubah ukuran kanvas). */
function applyBorder(el, c) {
  const s = el.style;
  if (!c.border) { s.display = 'none'; return; }
  const col = rgba(hex2rgb(c.borderColor), c.borderOpacity);
  s.display = 'block'; s.position = 'absolute'; s.pointerEvents = 'none'; s.boxSizing = 'border-box';
  s.left = s.top = s.right = s.bottom = c.borderInset + 'px';
  s.border = `${c.borderWidth}px ${c.borderStyle} ${col}`;
  s.borderRadius = c.borderRadius + 'px';
  s.boxShadow = c.borderGlow > 0 ? `0 0 ${c.borderGlow}px ${col}, inset 0 0 ${c.borderGlow}px ${col}` : 'none';
}

function wsUrl() {
  const h = new URLSearchParams(location.search).get('ws');
  if (h) return 'ws://' + h + '/ws';
  return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
}

function connect(o) {
  let ws, delay = 400;
  const base = o.url || wsUrl();
  const q = [o.sub && 'sub=' + o.sub, o.role && 'role=' + o.role].filter(Boolean).join('&');
  const url = q ? base + (base.indexOf('?') < 0 ? '?' : '&') + q : base;
  const api = { send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } };
  (function open() {
    ws = new WebSocket(url);
    ws.onopen = () => { delay = 400; o.onStatus && o.onStatus(true); };
    ws.onclose = () => { o.onStatus && o.onStatus(false); setTimeout(open, delay); delay = Math.min(delay * 1.6, 5000); };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* abaikan */ } };
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (_) { return; }
      if (m && m.t === 'hello' && m.build) {   // file diperbarui di server -> muat ulang halaman lama
        if (root.__aimBuild && root.__aimBuild !== m.build) { location.reload(); return; }
        root.__aimBuild = m.build;
      }
      o.onMessage(m);
    };
  })();
  return api;
}

/** Jika halaman ini dimuat di dalam pemuat OBS (iframe), kirim "detak" tiap 2 dtk agar pemuat tahu halaman hidup. */
function startHeartbeat(win, every) {
  win = win || window;
  if (!win.parent || win.parent === win) return null;
  const beat = () => { try { win.parent.postMessage({ aimtrail: 'hb' }, '*'); } catch (e) { /* abaikan */ } };
  beat();
  return setInterval(beat, every || 2000);
}

function handleEvents(r, list, now) {
  // Data sering tiba bergerombol; sebarkan cap waktunya sesuai selisih asli agar ekor tidak patah-patah.
  let t = now;
  if (r.cfg.timeSmooth !== false) {
    let total = 0;
    for (const e of list) if (e.t === 'm') total += e.d || 0;
    t = now - Math.min(total, 60);
  }
  for (const e of list) {
    if (e.t === 'm') {
      if (r.cfg.timeSmooth !== false) t += e.d || 0; else t = now;
      r.move(e.dx, e.dy, e.d, t);
    } else if (e.t === 'b') r.buttons(e.b, t);
  }
}

const api = { startHeartbeat, AimTrail, QUALITY, DEFAULTS, BEHAVIOR, PRESETS, SCHEMA, TRIGGERS, applyBackground, applyBorder, connect, handleEvents, wsUrl };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.AimTrail = api;
})(typeof window !== 'undefined' ? window : globalThis);
