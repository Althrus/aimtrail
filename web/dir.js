/*! AimDir — arah & kecepatan gerak mouse: panah chevron, kompas melingkar, atau bar keseimbangan */
(function (root) {
'use strict';

const DEFAULTS = {
  style: 'chevron', axes: 'both', showCenter: true, showSpeed: false,
  dpi: 800, maxSpeedCm: 60, attack: 60, decay: 320, deadzone: 0.02, gamma: 0.65, invertX: false, invertY: false,
  scale: 1, posX: 50, posY: 50, autoHide: false, autoHideSec: 3,
  colorMode: 'theme', cMain: '#38bdf8', cGlow: '#38bdf8', cRing: '#2a4a66', cTrack: '#0f1b2d', cDot: '#38bdf8', cText: '#e0f2fe',
  glowOn: true, glowSize: 7, thick: 10, dim: 0.14, speedColor: false, cFast: '#ff2d55',
  wm: true, wmPos: 'br', wmOpacity: 0.65, wmScale: 1, wmMargin: 18
};

/* ------------------------------------------------------------------ gerak (murni, bisa diuji) */
class DirMotion {
  constructor(c) { this.setConfig(c || {}); this.reset(); }
  setConfig(c) { this.c = Object.assign({}, DEFAULTS, c); }
  reset() { this.vx = 0; this.vy = 0; this.ax = 0; this.ay = 0; this.cmx = 0; this.cmy = 0; }
  feed(dx, dy) { this.ax += dx; this.ay += dy; }

  /** Maju `dt` ms: ubah hitungan mouse yang terkumpul menjadi kecepatan (cm/dtk) lalu haluskan (cepat naik, lambat turun). */
  step(dt) {
    const c = this.c, s = Math.max(dt, 1) / 1000, k = 2.54 / c.dpi;
    const rx = this.ax * k / s * (c.invertX ? -1 : 1), ry = this.ay * k / s * (c.invertY ? -1 : 1);
    this.ax = this.ay = 0; this.cmx = rx; this.cmy = ry;
    this.vx = this._sm(this.vx, rx / c.maxSpeedCm, dt);
    this.vy = this._sm(this.vy, ry / c.maxSpeedCm, dt);
    return this;
  }
  _sm(v, raw, dt) {
    const tau = Math.abs(raw) > Math.abs(v) ? this.c.attack : this.c.decay;
    return v + (raw - v) * (1 - Math.exp(-dt / Math.max(1, tau)));
  }

  /** Nilai siap tampil: x,y,mag di -1..1 / 0..1 setelah zona mati dan kurva gamma; speed dalam cm/dtk (sudah halus). */
  shape() {
    const c = this.c, dz = c.deadzone;
    const g = v => { const a = Math.min(1, Math.abs(v)); return a < dz ? 0 : Math.pow((a - dz) / (1 - dz), c.gamma) * Math.sign(v); };
    const x = g(this.vx), y = c.axes === 'x' ? 0 : g(this.vy);
    return { x, y, mag: Math.min(1, Math.hypot(x, y)), speed: Math.hypot(this.vx, c.axes === 'x' ? 0 : this.vy) * c.maxSpeedCm };
  }
  get active() { return Math.abs(this.vx) > 0.004 || Math.abs(this.vy) > 0.004 || this.ax !== 0 || this.ay !== 0; }
}

/* ------------------------------------------------------------------------- skema panel */
const SCHEMA = [
  { g: 'Gaya', items: [
    { k: 'style', l: 'Tampilan', t: 'select', o: { chevron: 'Panah chevron (menyala bertingkat)', compass: 'Kompas melingkar', bar: 'Bar keseimbangan' } },
    { k: 'axes', l: 'Sumbu', t: 'select', o: { both: 'Kiri-kanan dan atas-bawah', x: 'Hanya kiri-kanan' } },
    { k: 'showCenter', l: 'Titik pusat bergerak', t: 'check' },
    { k: 'showSpeed', l: 'Tampilkan angka kecepatan (cm/dtk)', t: 'check' }] },
  { g: 'Warna', items: [
    { k: 'colorMode', l: 'Sumber warna', t: 'select', o: { theme: 'Ikuti tema bersama (halaman Tema)', custom: 'Warna sendiri untuk overlay ini' } },
    { k: 'cMain', l: 'Warna utama (panah, busur, jarum, isi bar)', t: 'color' },
    { k: 'cDot', l: 'Warna titik pusat', t: 'color' },
    { k: 'cRing', l: 'Warna lingkaran / garis tepi', t: 'color' },
    { k: 'cTrack', l: 'Warna latar bar', t: 'color' },
    { k: 'cText', l: 'Warna angka kecepatan', t: 'color' },
    { k: 'glowOn', l: 'Efek glow', t: 'check' },
    { k: 'cGlow', l: 'Warna glow', t: 'color' },
    { k: 'glowSize', l: 'Besar glow', t: 'range', min: 0, max: 30, step: 1, u: ' px' },
    { k: 'thick', l: 'Ketebalan garis panah dan busur', t: 'range', min: 4, max: 20, step: 1, u: ' px' },
    { k: 'dim', l: 'Terang bagian yang mati (0 = hilang)', t: 'range', min: 0, max: 0.6, step: 0.02, p: 1 },
    { k: 'speedColor', l: 'Warna berubah saat gerakan makin cepat', t: 'check' },
    { k: 'cFast', l: 'Warna saat gerakan paling cepat', t: 'color' }] },
  { g: 'Respons', items: [
    { k: 'dpi', l: 'DPI mouse', t: 'range', min: 100, max: 3200, step: 50, u: '' },
    { k: 'maxSpeedCm', l: 'Kecepatan penuh (semua panah menyala)', t: 'range', min: 10, max: 200, step: 5, u: ' cm/dtk' },
    { k: 'attack', l: 'Kecepatan menyala', t: 'range', min: 5, max: 250, step: 5, u: ' ms' },
    { k: 'decay', l: 'Kecepatan meredup setelah berhenti', t: 'range', min: 40, max: 1500, step: 20, u: ' ms' },
    { k: 'deadzone', l: 'Zona mati (abaikan getaran kecil)', t: 'range', min: 0, max: 0.2, step: 0.005, p: 1 },
    { k: 'gamma', l: 'Kepekaan gerak pelan (kecil = lebih peka)', t: 'range', min: 0.3, max: 1.5, step: 0.05, u: '' },
    { k: 'invertX', l: 'Balik kiri-kanan', t: 'check' },
    { k: 'invertY', l: 'Balik atas-bawah', t: 'check' }] },
  { g: 'Tampilan', items: [
    { k: 'scale', l: 'Skala', t: 'range', min: 0.3, max: 3, step: 0.05, u: '×' },
    { k: 'posX', l: 'Posisi horizontal', t: 'range', min: 0, max: 100, step: 1, u: '%' },
    { k: 'posY', l: 'Posisi vertikal', t: 'range', min: 0, max: 100, step: 1, u: '%' }] },
  { g: 'Perilaku', items: [
    { k: 'autoHide', l: 'Sembunyikan saat mouse diam', t: 'check' },
    { k: 'autoHideSec', l: 'Sembunyi setelah', t: 'range', min: 1, max: 30, step: 1, u: ' dtk' }] },
  { g: 'Watermark', items: [
    { k: 'wm', l: 'Tampilkan watermark kecil (Created by Andromache)', t: 'check' },
    { k: 'wmPos', l: 'Posisi', t: 'select', o: { br: 'Kanan bawah', bl: 'Kiri bawah', tr: 'Kanan atas', tl: 'Kiri atas' } },
    { k: 'wmOpacity', l: 'Opasitas', t: 'range', min: 0.1, max: 1, step: 0.05, p: 1 },
    { k: 'wmScale', l: 'Ukuran', t: 'range', min: 0.5, max: 3, step: 0.1, u: '×' },
    { k: 'wmMargin', l: 'Jarak dari tepi', t: 'range', min: 0, max: 80, step: 2, u: ' px' }] }
];

/* ------------------------------------------------------------------------------ tampilan */
const CSS = `
.dr-root{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;font-family:var(--t-font,system-ui)}
.dr-wrap{position:absolute;left:0;top:0;visibility:hidden}
.dr-board{transform-origin:0 0}
.dr-svg{display:block;overflow:visible}
.dr-ch{fill:none;stroke:var(--t-accent);stroke-width:calc(var(--dr-thick,10)*1px);stroke-linecap:round;stroke-linejoin:round}
.dr-arm.on{filter:drop-shadow(0 0 var(--dr-gs,7px) var(--t-glow))}
.dr-ring{fill:none;stroke:var(--dr-ring,var(--t-border));stroke-width:3}
.dr-dot{fill:var(--dr-dot,var(--t-accent))}
.dr-tick{stroke:var(--t-accent);stroke-width:calc(var(--dr-thick,10)*.6px);stroke-linecap:round}
.dr-needle{fill:var(--t-accent)}
.dr-track{fill:var(--dr-track,var(--t-panel));stroke:var(--dr-ring,var(--t-border));stroke-width:2.5}
.dr-fill{fill:var(--t-accent)}
.dr-tip{fill:var(--t-accent)}
.dr-mid{stroke:var(--t-muted);stroke-width:2;opacity:.6}
.dr-val{fill:var(--dr-text,var(--t-text));font:700 22px var(--t-font);text-shadow:0 0 var(--dr-gs,8px) var(--t-glow)}
.dr-glow{filter:drop-shadow(0 0 var(--dr-gs,8px) var(--t-glow))}
`;
let cssDone = false;
const ensureCss = () => { if (cssDone) return; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); cssDone = true; };
const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hexRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const n = m ? parseInt(m[1], 16) : 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mixHex = (a, b, k) => { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const f2 = v => (Math.round(v * 100) / 100).toString();

function chevronSvg(c) {
  const both = c.axes !== 'x';
  const dirs = both ? [['R', 0], ['D', 90], ['L', 180], ['U', 270]] : [['R', 0], ['L', 180]];
  const arms = dirs.map(([d, a]) => `<g transform="rotate(${a} 200 200)"><g class="dr-arm" data-d="${d}">` +
    [0, 1, 2].map(i => `<path class="dr-ch" d="M ${252 + i * 38} 168 L ${282 + i * 38} 200 L ${252 + i * 38} 232"/>`).join('') + '</g></g>').join('');
  const vb = both ? '0 0 400 400' : '0 130 400 140', h = both ? 400 : 140;
  return { w: 400, h, html: `<svg class="dr-svg" viewBox="${vb}" width="400" height="${h}" xmlns="http://www.w3.org/2000/svg">${arms}` +
    (c.showCenter ? '<circle class="dr-ring" cx="200" cy="200" r="34"/><circle class="dr-dot" cx="200" cy="200" r="9"/>' : '') +
    (c.showSpeed ? `<text class="dr-val" x="200" y="${both ? 392 : 262}" text-anchor="middle"></text>` : '') + '</svg>' };
}
function compassSvg(c) {
  const ticks = Array.from({ length: 48 }, (_, i) => `<line class="dr-tick" x1="200" y1="96" x2="200" y2="76" transform="rotate(${i * 7.5} 200 200)"/>`).join('');
  return { w: 400, h: 400, html: `<svg class="dr-svg" viewBox="0 0 400 400" width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <circle class="dr-ring" cx="200" cy="200" r="132"/>${ticks}
    <g class="dr-needle-g"><path class="dr-needle" d="M 200 118 L 218 168 L 200 156 L 182 168 Z"/></g>
    ${c.showCenter ? '<circle class="dr-ring" cx="200" cy="200" r="30"/><circle class="dr-dot" cx="200" cy="200" r="9"/>' : ''}
    ${c.showSpeed ? '<text class="dr-val" x="200" y="392" text-anchor="middle"></text>' : ''}</svg>` };
}
function barSvg(c) {
  const both = c.axes !== 'x', W = both ? 660 : 540, h = 150;
  const hb = `<rect class="dr-track" x="30" y="52" width="480" height="30" rx="15"/><line class="dr-mid" x1="270" y1="46" x2="270" y2="88"/>
    <rect class="dr-fill" data-b="h" x="270" y="56" width="0" height="22" rx="11"/>
    <path class="dr-tip" data-t="L" d="M 4 67 L 22 53 L 22 81 Z"/><path class="dr-tip" data-t="R" d="M 536 67 L 518 53 L 518 81 Z"/>`;
  const vb = both ? `<rect class="dr-track" x="580" y="8" width="30" height="134" rx="15"/><line class="dr-mid" x1="574" y1="75" x2="616" y2="75"/>
    <rect class="dr-fill" data-b="v" x="584" y="75" width="22" height="0" rx="11"/>
    <path class="dr-tip" data-t="U" d="M 595 -10 L 581 8 L 609 8 Z" transform="translate(0 2)"/><path class="dr-tip" data-t="D" d="M 595 160 L 581 142 L 609 142 Z" transform="translate(0 -2)"/>` : '';
  return { w: W, h, html: `<svg class="dr-svg" viewBox="0 -10 ${W} ${h + 10}" width="${W}" height="${h + 10}" xmlns="http://www.w3.org/2000/svg">${hb}${vb}
    ${c.showSpeed ? `<text class="dr-val" x="270" y="120" text-anchor="middle"></text>` : ''}</svg>` };
}

class DirView {
  constructor(host, opts) {
    ensureCss();
    this.host = host; this.opts = opts || {};
    this.cfg = Object.assign({}, DEFAULTS); this.theme = null; this.m = new DirMotion(this.cfg);
    this.rootEl = mk('div', 'dr-root'); host.appendChild(this.rootEl);
    this._visible = null; this._started = !(opts && opts.wait); this.raf = 0; this.last = 0; this.lastAct = performance.now(); this.dim = { w: 400, h: 400 };
    this._onResize = () => this.place(); window.addEventListener('resize', this._onResize);
    this.build();
  }

  setTheme(t) { this.theme = t; this.build(); }
  setConfig(c) { this.cfg = Object.assign({}, DEFAULTS, c || {}); this.m.setConfig(this.cfg); this.build(); }
  start() {
    if (this._started) return;
    this._started = true;
    if (this.anim) { this.anim.show(this.theme, !!this.opts.editable); this._visible = this.anim.visible; }
  }

  build() {
    const c = this.cfg, kind = c.style === 'compass' ? compassSvg(c) : c.style === 'bar' ? barSvg(c) : chevronSvg(c);
    this.rootEl.innerHTML = ''; this.dim = { w: kind.w, h: kind.h };
    const board = this.board = mk('div', 'dr-board');
    if (root.AimTheme) root.AimTheme.applyVars(board, this.theme);
    this.applyColors(board);
    board.innerHTML = kind.html;
    this.q = {
      arms: [...board.querySelectorAll('.dr-arm')].map(e => ({ e, d: e.dataset.d, ch: [...e.querySelectorAll('.dr-ch')], lv: -1 })),
      dot: board.querySelector('.dr-dot'), ticks: [...board.querySelectorAll('.dr-tick')], needle: board.querySelector('.dr-needle-g'),
      fillH: board.querySelector('[data-b=h]'), fillV: board.querySelector('[data-b=v]'), tips: [...board.querySelectorAll('[data-t]')],
      val: board.querySelector('.dr-val')
    };
    const wrap = this.wrap = mk('div', 'dr-wrap'); wrap.appendChild(board); this.rootEl.appendChild(wrap);
    this.anim = root.AimAnim ? root.AimAnim.make(wrap) : null;
    clearInterval(this._tm);
    this._tm = c.autoHide && !this.opts.editable ? setInterval(() => this.tickHide(), 250) : 0;
    this.place(); this.draw(performance.now());
    if (this.anim && !this._started) wrap.style.visibility = 'hidden';
    else if (this.anim) {
      const first = this._visible === null;
      if (this._visible === false) this.anim.hide(this.theme, true); else this.anim.show(this.theme, !first || this.opts.editable);
      this._visible = this.anim.visible;
    }
  }

  /** Warna sendiri (colorMode 'custom') menimpa variabel tema pada papan ini saja; glow, ketebalan, dan redup selalu dari pengaturan. */
  applyColors(board) {
    const c = this.cfg, st = board.style, th = this.theme || {}, custom = c.colorMode === 'custom';
    this._main = custom ? c.cMain : (th.accent || DEFAULTS.cMain); this._glow = custom ? c.cGlow : (th.glow || this._main);
    if (custom) {
      st.setProperty('--t-accent', c.cMain); st.setProperty('--t-glow', c.cGlow);
      st.setProperty('--dr-dot', c.cDot); st.setProperty('--dr-ring', c.cRing); st.setProperty('--dr-track', c.cTrack); st.setProperty('--dr-text', c.cText);
    }
    st.setProperty('--dr-gs', (c.glowOn ? c.glowSize : 0) + 'px'); st.setProperty('--dr-thick', String(c.thick));
    this._mixed = -1;
  }
  /** Saat 'warna berubah saat cepat' aktif: campur warna utama dan glow dengan warna cepat sesuai besar gerak. */
  tint(mag) {
    const c = this.cfg, st = this.board && this.board.style;
    if (!st || !c.speedColor) return;
    const k = Math.round(mag * 40) / 40; if (k === this._mixed) return; this._mixed = k;
    st.setProperty('--t-accent', mixHex(this._main, c.cFast, k)); st.setProperty('--t-glow', mixHex(this._glow, c.cFast, k));
  }

  place() {
    if (!this.board) return;
    const c = this.cfg, bw = this.dim.w, bh = this.dim.h + (c.style === 'bar' ? 10 : 0);
    const vw = this.host.clientWidth || window.innerWidth, vh = this.host.clientHeight || window.innerHeight;
    this.board.style.transform = `scale(${c.scale})`;
    const w = this.wrap.style;
    w.width = bw * c.scale + 'px'; w.height = bh * c.scale + 'px';
    w.left = ((vw - bw * c.scale) * c.posX / 100) + 'px'; w.top = ((vh - bh * c.scale) * c.posY / 100) + 'px';
  }

  /* --- data masuk --- */
  feed(list) {
    let any = false;
    for (const e of list) if (e.t === 'm') { this.m.feed(e.dx, e.dy); any = true; }
    if (any) { this.lastAct = performance.now(); this._wake(); this.kick(); }
  }
  move(dx, dy) { this.m.feed(dx, dy); this.lastAct = performance.now(); this._wake(); this.kick(); }
  _wake() { if (this.anim && this._started && !this.opts.editable && this.anim.visible === false) { this.anim.show(this.theme); this._visible = true; } }
  tickHide() {
    if (!this.anim || !this._started || this.opts.editable) return;
    const idle = performance.now() - this.lastAct > this.cfg.autoHideSec * 1000 && !this.m.active;
    if (idle) this.anim.hide(this.theme); else this.anim.show(this.theme);
    this._visible = this.anim.visible;
  }

  /* --- gambar: hanya berjalan selama ada gerakan atau sedang meredup --- */
  kick() { if (!this.raf) this.raf = (root.requestAnimationFrame || (f => setTimeout(() => f(performance.now()), 16)))(t => this._tick(t)); }
  _tick(now) {
    this.raf = 0;
    const dt = this.last ? Math.min(now - this.last, 50) : 16; this.last = now;
    this.m.step(dt); this.draw(now);
    if (this.m.active) this.kick(); else this.last = 0;
  }

  draw(now) {
    const s = this.m.shape(), q = this.q, st = this.cfg.style;
    this.tint(s.mag);
    if (st === 'compass') this._compass(s); else if (st === 'bar') this._bar(s); else this._chevron(s, now);
    if (q.dot) { const k = st === 'compass' ? 20 : 22; q.dot.setAttribute('cx', f2(200 + s.x * k)); q.dot.setAttribute('cy', f2(200 + s.y * k)); }
    if (q.val) { const t = s.speed.toFixed(1) + ' cm/s'; if (q.val.textContent !== t) q.val.textContent = t; }
  }

  _chevron(s, now) {
    const d = this.cfg.dim;
    for (const a of this.q.arms) {
      const lv = a.d === 'R' ? Math.max(0, s.x) : a.d === 'L' ? Math.max(0, -s.x) : a.d === 'D' ? Math.max(0, s.y) : Math.max(0, -s.y);
      a.e.setAttribute('transform', `translate(${f2(lv * 18)} 0)`);
      a.e.classList.toggle('on', lv > 0.05);
      a.ch.forEach((p, i) => {
        const shimmer = lv > 0.1 ? 0.88 + 0.12 * Math.sin(now / 110 - i * 1.3) : 1;
        p.style.opacity = f2((d + (1 - d) * clamp(lv * 3 - i, 0, 1)) * shimmer);
      });
    }
  }
  _compass(s) {
    const q = this.q, nx = s.mag > 0 ? s.x / s.mag : 0, ny = s.mag > 0 ? s.y / s.mag : 0;
    q.ticks.forEach((t, i) => {
      const th = i * 7.5 * Math.PI / 180, dot = Math.sin(th) * nx - Math.cos(th) * ny, b = s.mag * Math.pow(Math.max(0, dot), 3);
      t.style.opacity = f2(this.cfg.dim + (1 - this.cfg.dim) * b); t.setAttribute('y2', f2(76 - 22 * b));
    });
    if (q.needle) {
      const deg = Math.atan2(nx, -ny) * 180 / Math.PI, sc = 0.35 + 0.65 * s.mag;
      q.needle.setAttribute('transform', `rotate(${f2(deg)} 200 200) translate(200 200) scale(1 ${f2(sc)}) translate(-200 -200)`);
      q.needle.style.opacity = s.mag > 0.02 ? f2(0.3 + 0.7 * s.mag) : 0;
    }
  }
  _bar(s) {
    const q = this.q;
    if (q.fillH) { const w = Math.abs(s.x) * 238; q.fillH.setAttribute('width', f2(w)); q.fillH.setAttribute('x', f2(s.x >= 0 ? 270 : 270 - w)); }
    if (q.fillV) { const h = Math.abs(s.y) * 63; q.fillV.setAttribute('height', f2(h)); q.fillV.setAttribute('y', f2(s.y >= 0 ? 75 : 75 - h)); }
    for (const t of q.tips) {
      const v = t.dataset.t === 'R' ? s.x : t.dataset.t === 'L' ? -s.x : t.dataset.t === 'D' ? s.y : -s.y;
      t.style.opacity = f2(this.cfg.dim + (1 - this.cfg.dim) * clamp(v * 1.4, 0, 1)); t.classList.toggle('dr-glow', v > 0.35);
    }
  }
}

const api = { DirMotion, DirView, DEFAULTS, SCHEMA };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.AimDir = api;
})(typeof window !== 'undefined' ? window : globalThis);
