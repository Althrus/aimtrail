/*! AimPad — overlay controller (gamepad XInput): tombol, trigger analog, stik dengan jejak */
(function (root) {
'use strict';

const B = { UP: 0x1, DOWN: 0x2, LEFT: 0x4, RIGHT: 0x8, START: 0x10, BACK: 0x20, LS: 0x40, RS: 0x80,
  LB: 0x100, RB: 0x200, A: 0x1000, B: 0x2000, X: 0x4000, Y: 0x8000 };
const LABELS = {
  xbox: { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT' },
  playstation: { A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2' },
  nintendo: { A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR' }
};
const FACE_COLOR = { A: '#4ade80', B: '#f87171', X: '#60a5fa', Y: '#fbbf24' };

const DEFAULTS = {
  slot: -1, labels: 'xbox', faceColors: 'xbox', deadzone: 0.12, showTriggers: true, stickTrail: true,
  scale: 1, posX: 50, posY: 90, hideDisconnected: false, autoHide: false, autoHideSec: 5,
  wm: true, wmPos: 'br', wmOpacity: 0.65, wmScale: 1, wmMargin: 18
};
const SCHEMA = [
  { g: 'Controller', items: [
    { k: 'slot', l: 'Controller yang ditampilkan', t: 'select', o: { '-1': 'Otomatis (yang pertama terhubung)', 0: 'Controller 1', 1: 'Controller 2', 2: 'Controller 3', 3: 'Controller 4' } },
    { k: 'labels', l: 'Label tombol', t: 'select', o: { xbox: 'Xbox (A B X Y)', playstation: 'PlayStation (✕ ○ □ △)', nintendo: 'Nintendo (A B X Y)' } },
    { k: 'faceColors', l: 'Warna tombol A B X Y', t: 'select', o: { xbox: 'Warna Xbox (hijau, merah, biru, kuning)', theme: 'Ikuti warna tema' } },
    { k: 'deadzone', l: 'Zona mati stik', t: 'range', min: 0, max: 0.4, step: 0.01, p: 1 },
    { k: 'showTriggers', l: 'Tampilkan trigger (LT / RT) analog', t: 'check' },
    { k: 'stickTrail', l: 'Jejak gerakan stik', t: 'check' }] },
  { g: 'Tampilan', items: [
    { k: 'scale', l: 'Skala', t: 'range', min: 0.3, max: 3, step: 0.05, u: '×' },
    { k: 'posX', l: 'Posisi horizontal', t: 'range', min: 0, max: 100, step: 1, u: '%' },
    { k: 'posY', l: 'Posisi vertikal', t: 'range', min: 0, max: 100, step: 1, u: '%' },
    { k: 'hideDisconnected', l: 'Sembunyikan jika controller tidak terhubung', t: 'check' }] },
  { g: 'Perilaku', items: [
    { k: 'autoHide', l: 'Sembunyikan saat tidak dipakai', t: 'check' },
    { k: 'autoHideSec', l: 'Sembunyi setelah', t: 'range', min: 1, max: 30, step: 1, u: ' dtk' }] },
  { g: 'Watermark', items: [
    { k: 'wm', l: 'Tampilkan watermark kecil (Created by Andromache)', t: 'check' },
    { k: 'wmPos', l: 'Posisi', t: 'select', o: { br: 'Kanan bawah', bl: 'Kiri bawah', tr: 'Kanan atas', tl: 'Kiri atas' } },
    { k: 'wmOpacity', l: 'Opasitas', t: 'range', min: 0.1, max: 1, step: 0.05, p: 1 },
    { k: 'wmScale', l: 'Ukuran', t: 'range', min: 0.5, max: 3, step: 0.1, u: '×' },
    { k: 'wmMargin', l: 'Jarak dari tepi', t: 'range', min: 0, max: 80, step: 2, u: ' px' }] }
];

const CSS = `
.pd-root{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;font-family:var(--t-font,system-ui)}
.pd-wrap{position:absolute;left:0;top:0;visibility:hidden}
.pd-board{transform-origin:0 0;transition:opacity .25s}
.pd-board.off{opacity:.3}
.pd-svg{display:block;overflow:visible}
.pd-body{fill:var(--t-panel);stroke:var(--t-border);stroke-width:3}
.pd-part .s{fill:var(--t-panel);stroke:var(--t-border);stroke-width:2.5;transition:fill .07s,stroke .07s}
.pd-part text{fill:var(--t-muted);font:700 15px var(--t-font);text-anchor:middle;dominant-baseline:central;pointer-events:none;transition:fill .07s}
.pd-part.on .s{fill:var(--c,var(--t-accent));stroke:var(--t-text);filter:drop-shadow(0 0 6px var(--t-glow))}
.pd-part.on text{fill:var(--t-on)}
.pd-base{fill:rgba(0,0,0,.28);stroke:var(--t-border);stroke-width:2.5}
.pd-head{fill:var(--t-border);stroke:var(--t-muted);stroke-width:2.5}
.pd-head.on{fill:var(--t-accent);stroke:var(--t-text)}
.pd-trail{fill:none;stroke:var(--t-accent);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:.55}
.pd-tr{fill:rgba(0,0,0,.25);stroke:var(--t-border);stroke-width:2.5}
.pd-tf{fill:var(--t-accent)}
.pd-lab{fill:var(--t-muted);font:700 12px var(--t-font);text-anchor:middle}
`;
let cssDone = false;
const ensureCss = () => { if (cssDone) return; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); cssDone = true; };
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

function svgMarkup(c, L) {
  const face = (k, x, y) => `<g class="pd-part" data-b="${B[k]}" ${c.faceColors === 'xbox' ? `style="--c:${FACE_COLOR[k]}"` : ''}><circle class="s" cx="${x}" cy="${y}" r="17"/><text x="${x}" y="${y + 1}">${L[k]}</text></g>`;
  const arm = (k, x, y, w, h) => `<g class="pd-part" data-b="${B[k]}"><rect class="s" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/></g>`;
  return `<svg class="pd-svg" viewBox="0 0 520 330" width="520" height="330" xmlns="${NS}">
  ${c.showTriggers ? `<rect class="pd-tr" x="108" y="2" width="84" height="30" rx="10"/><rect class="pd-tf" data-t="lt" x="108" y="32" width="84" height="0" rx="10"/>
  <rect class="pd-tr" x="328" y="2" width="84" height="30" rx="10"/><rect class="pd-tf" data-t="rt" x="328" y="32" width="84" height="0" rx="10"/>` : ''}
  <g class="pd-part" data-b="${B.LB}"><rect class="s" x="96" y="38" width="112" height="22" rx="9"/><text x="152" y="49">${L.LB}</text></g>
  <g class="pd-part" data-b="${B.RB}"><rect class="s" x="312" y="38" width="112" height="22" rx="9"/><text x="368" y="49">${L.RB}</text></g>
  <path class="pd-body" d="M130 70 C160 55 360 55 390 70 C450 78 495 160 505 250 C510 300 470 320 440 305 C405 285 395 235 350 232 L170 232 C125 235 115 285 80 305 C50 320 10 300 15 250 C25 160 70 78 130 70 Z"/>
  <g data-stick="l" data-cx="150" data-cy="125"><g class="pd-part" data-b="${B.LS}"><circle class="s pd-base" cx="150" cy="125" r="38"/></g><polyline class="pd-trail" points=""/><circle class="pd-head" cx="150" cy="125" r="23"/></g>
  <g data-stick="r" data-cx="330" data-cy="205"><g class="pd-part" data-b="${B.RS}"><circle class="s pd-base" cx="330" cy="205" r="38"/></g><polyline class="pd-trail" points=""/><circle class="pd-head" cx="330" cy="205" r="23"/></g>
  ${arm('UP', 195, 168, 20, 26)}${arm('DOWN', 195, 216, 20, 26)}${arm('LEFT', 169, 194, 26, 22)}${arm('RIGHT', 215, 194, 26, 22)}
  ${face('Y', 385, 92)}${face('X', 352, 125)}${face('B', 418, 125)}${face('A', 385, 158)}
  <g class="pd-part" data-b="${B.BACK}"><circle class="s" cx="232" cy="122" r="9"/></g>
  <g class="pd-part" data-b="${B.START}"><circle class="s" cx="288" cy="122" r="9"/></g>
</svg>`;
}

class PadView {
  constructor(host, opts) {
    ensureCss();
    this.host = host; this.opts = opts || {};
    this.cfg = Object.assign({}, DEFAULTS); this.theme = null;
    this.pads = {}; this.lastAct = performance.now(); this._visible = null; this._started = !(opts && opts.wait); this._dirty = false; this.trail = { l: [], r: [] };
    this.rootEl = mk('div', 'pd-root'); host.appendChild(this.rootEl);
    this._onResize = () => this.place(); window.addEventListener('resize', this._onResize);
    this.build();
  }

  setTheme(t) { this.theme = t; this.build(); }
  /** Overlay (Browser Source): tampil dengan animasi masuk setelah pengaturan & tema pertama diterima. */
  start() {
    if (this._started) return;
    this._started = true;
    if (this.anim) { this.anim.show(this.theme, !!this.opts.editable); this._visible = this.anim.visible; }
  }

  setConfig(c) { this.cfg = Object.assign({}, DEFAULTS, c || {}); this.cfg.slot = +this.cfg.slot; this.build(); }
  setPads(map) { this.pads = {}; for (const k in (map || {})) this.pads[+k] = map[k]; this.touch(); this.schedule(); }

  feed(list) {
    for (const e of list) {
      if (e.t === 'p') { const o = this.pads[e.i]; if (!o || o.b !== e.b || o.lt !== e.lt || o.rt !== e.rt) this.touch(); this.pads[e.i] = { b: e.b, lt: e.lt, rt: e.rt, lx: e.lx, ly: e.ly, rx: e.rx, ry: e.ry }; }
      else if (e.t === 'pc') { if (!e.on) delete this.pads[e.i]; this.touch(); }
    }
    this.schedule();
  }
  touch() {
    this.lastAct = performance.now();
    if (this.anim && this._started && !this.opts.editable && this.anim.visible === false && !(this.cfg.hideDisconnected && !this.cur())) { this.anim.show(this.theme); this._visible = true; }
  }
  cur() {
    const c = this.cfg;
    if (c.slot >= 0) return this.pads[c.slot] || null;
    const k = Object.keys(this.pads).map(Number).sort((a, b) => a - b)[0];
    return k == null ? null : this.pads[k];
  }

  build() {
    const c = this.cfg, L = LABELS[c.labels] || LABELS.xbox;
    this.rootEl.innerHTML = '';
    const board = this.board = mk('div', 'pd-board');
    if (root.AimTheme) root.AimTheme.applyVars(board, this.theme);
    board.innerHTML = svgMarkup(c, L);
    this.parts = [...board.querySelectorAll('.pd-part')].map(e => ({ e, m: +e.dataset.b }));
    this.heads = { l: board.querySelector('[data-stick=l] .pd-head'), r: board.querySelector('[data-stick=r] .pd-head') };
    this.trails = { l: board.querySelector('[data-stick=l] .pd-trail'), r: board.querySelector('[data-stick=r] .pd-trail') };
    this.tf = { lt: board.querySelector('[data-t=lt]'), rt: board.querySelector('[data-t=rt]') };
    const wrap = this.wrap = mk('div', 'pd-wrap'); wrap.appendChild(board); this.rootEl.appendChild(wrap);
    this.anim = root.AimAnim ? root.AimAnim.make(wrap) : null;
    clearInterval(this._tm);
    this._tm = c.autoHide && !this.opts.editable ? setInterval(() => this.tick(), 250) : 0;
    this.place(); this.render();
    if (this.anim && !this._started) wrap.style.visibility = 'hidden';
    else if (this.anim) {
      const first = this._visible === null;
      if (this._visible === false) this.anim.hide(this.theme, true); else this.anim.show(this.theme, !first || this.opts.editable);
      this._visible = this.anim.visible;
    }
  }

  place() {
    if (!this.board) return;
    const c = this.cfg, bw = 520, bh = 330;
    const vw = this.host.clientWidth || window.innerWidth, vh = this.host.clientHeight || window.innerHeight;
    this.board.style.transform = `scale(${c.scale})`;
    const w = this.wrap.style;
    w.width = bw * c.scale + 'px'; w.height = bh * c.scale + 'px';
    w.left = ((vw - bw * c.scale) * c.posX / 100) + 'px'; w.top = ((vh - bh * c.scale) * c.posY / 100) + 'px';
  }

  tick() {
    if (!this.anim || !this._started || this.opts.editable) return;
    const c = this.cfg, gone = c.hideDisconnected && !this.cur();
    const idle = gone || (c.autoHide && performance.now() - this.lastAct > c.autoHideSec * 1000);
    if (idle) this.anim.hide(this.theme); else this.anim.show(this.theme);
    this._visible = this.anim.visible;
  }

  schedule() {
    if (this._dirty) return;
    this._dirty = true;
    (root.requestAnimationFrame || (f => setTimeout(f, 16)))(() => { this._dirty = false; this.render(); });
    if (this.cfg.hideDisconnected) this.tick();
  }

  _stick(k, x, y) {   // XInput: y positif = atas
    const dz = this.cfg.deadzone;
    let nx = x / 32768, ny = -y / 32768; const mag = Math.hypot(nx, ny);
    if (mag < dz) { nx = ny = 0; } else { const s = Math.min(1, (mag - dz) / (1 - dz)) / mag; nx *= s; ny *= s; }
    const R = 15, el = this.heads[k], g = el.parentNode;
    const cx = +g.dataset.cx + nx * R, cy = +g.dataset.cy + ny * R;
    el.setAttribute('cx', cx.toFixed(1)); el.setAttribute('cy', cy.toFixed(1));
    el.classList.toggle('on', nx !== 0 || ny !== 0);
    const t = this.trail[k]; t.push([cx, cy]); if (t.length > 14) t.shift();
    this.trails[k].setAttribute('points', this.cfg.stickTrail && (nx || ny) ? t.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') : '');
  }

  render() {
    const st = this.cur(), b = st ? st.b : 0;
    for (const p of this.parts) p.e.classList.toggle('on', (b & p.m) !== 0);
    this._stick('l', st ? st.lx : 0, st ? st.ly : 0); this._stick('r', st ? st.rx : 0, st ? st.ry : 0);
    for (const k of ['lt', 'rt']) {
      const el = this.tf[k]; if (!el) continue;
      const v = st ? st[k] / 255 : 0, h = 30 * v;
      el.setAttribute('y', (32 - h).toFixed(1)); el.setAttribute('height', h.toFixed(1));
    }
    this.board.classList.toggle('off', !st);
  }
}

const api = { PadView, DEFAULTS, SCHEMA, BTN: B, LABELS };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.AimPad = api;
})(typeof window !== 'undefined' ? window : globalThis);
