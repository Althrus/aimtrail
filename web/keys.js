/*! AimKeys — tampilan tombol keyboard & mouse (dipakai keys.html & keys-panel.html) */
(function (root) {
'use strict';

/* ------------------------------------------------------------ daftar tombol (id -> kode VK Windows) */
const KEYDEFS = {};
const def = (id, vk, label) => { KEYDEFS[id] = { vk, label: label || id }; };
for (let c = 65; c <= 90; c++) def(String.fromCharCode(c), c);
for (let d = 0; d <= 9; d++) def(String(d), 48 + d);
for (let f = 1; f <= 12; f++) def('F' + f, 111 + f);
def('TAB', 9); def('SHIFT', 16); def('CTRL', 17); def('ALT', 18); def('SPACE', 32);
def('CAPS', 20); def('ESC', 27); def('ENTER', 13); def('WIN', 91); def('BKSP', 8, '⌫'); def('TILDE', 192, '`');
def('UP', 38, '↑'); def('DOWN', 40, '↓'); def('LEFT', 37, '←'); def('RIGHT', 39, '→');

const WIDE = { TAB: 1.5, SHIFT: 2.25, CTRL: 1.5, ALT: 1.5, SPACE: 4.25, CAPS: 1.75, ENTER: 2, BKSP: 2, ESC: 1.25, WIN: 1.25 };
const defaultW = id => WIDE[id] || 1;

const FONTS = {
  ui: '"Bahnschrift","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif',
  mono: '"Cascadia Mono",Consolas,ui-monospace,monospace',
  rounded: '"Arial Rounded MT Bold","Nunito","Segoe UI",system-ui,sans-serif',
  impact: 'Impact,"Haettenschweiler","Arial Narrow Bold",sans-serif',
  serif: 'Georgia,"Times New Roman",serif'
};

const K = (id, x, y, w, h) => ({ id, x, y, w: w || defaultW(id), h: h || 1 });
const FPS_KEYS = () => [
  K('1', 1, 0), K('2', 2, 0), K('3', 3, 0), K('4', 4, 0),
  K('TAB', 0, 1), K('Q', 1.5, 1), K('W', 2.5, 1), K('E', 3.5, 1), K('R', 4.5, 1),
  K('A', 1.75, 2), K('S', 2.75, 2), K('D', 3.75, 2), K('F', 4.75, 2), K('G', 5.75, 2),
  K('SHIFT', 0, 3), K('Z', 2.25, 3), K('C', 3.25, 3), K('V', 4.25, 3),
  K('CTRL', 0, 4), K('ALT', 1.5, 4), K('SPACE', 3, 4)
];
const LAYOUTS = {
  'FPS lengkap (21 tombol + mouse)': { keys: FPS_KEYS(), mouseShow: true, mouseX: 8.6, mouseY: 0 },
  'WASD minimal + mouse': {
    keys: [K('W', 1, 0), K('A', 0, 1), K('S', 1, 1), K('D', 2, 1), K('SHIFT', 0, 2, 1.5), K('CTRL', 1.5, 2, 1.5), K('SPACE', 0, 3, 3)],
    mouseShow: true, mouseX: 4.1, mouseY: 0 },
  'Hanya mouse': { keys: [], mouseShow: true, mouseX: 0.5, mouseY: 0 },
  'Hanya keyboard FPS': { keys: FPS_KEYS(), mouseShow: false, mouseX: 8.6, mouseY: 0 }
};

const DEFAULTS = {
  look: 'neon', anim: 'press', pressMs: 60, releaseMs: 180,
  unit: 56, gap: 6, radius: 10, borderWidth: 2,
  fontFamily: 'ui', fontScale: 0.3, fontWeight: 600, uppercase: true, showLabels: true,
  idleBg: '#0f1b2e', idleOpacity: 0.78, idleBorder: '#263243', idleText: '#8aa0b8',
  pressBg: '#38bdf8', pressBorder: '#e0f2fe', pressText: '#04202e',
  glow: '#38bdf8', glowSize: 16,
  scale: 1, posX: 50, posY: 92,
  panel: false, panelColor: '#0a1220', panelOpacity: 0.6, panelRadius: 18, panelPad: 16,
  panelBorderWidth: 0, panelBorderColor: '#263243',
  autoHide: false, autoHideSec: 3,
  wm: true, wmPos: 'br', wmOpacity: 0.65, wmScale: 1, wmMargin: 18,
  mouseShow: true, mouseScale: 1, mouseLabels: true, mouseX: 8.6, mouseY: 0,
  keys: FPS_KEYS()
};

// kunci yang TIDAK ikut berubah saat memilih preset gaya
const LAYOUT_KEYS = new Set(['wm', 'wmPos', 'wmOpacity', 'wmScale', 'wmMargin', 'keys', 'mouseShow', 'mouseScale', 'mouseX', 'mouseY', 'scale', 'posX', 'posY',
  'unit', 'gap', 'autoHide', 'autoHideSec', 'panel', 'panelColor', 'panelOpacity', 'panelRadius', 'panelPad',
  'panelBorderWidth', 'panelBorderColor']);

const PRESETS = {
  'Neon Biru': {},
  'Minimal Gelap': { look: 'flat', glowSize: 0, idleBg: '#111111', idleOpacity: 0.6, idleBorder: '#3a3a3a', idleText: '#9a9a9a',
    pressBg: '#ffffff', pressBorder: '#ffffff', pressText: '#111111', radius: 6, borderWidth: 1 },
  'Keycap 3D': { look: 'keycap', anim: 'none', glowSize: 0, idleBg: '#2a2f3a', idleOpacity: 1, idleBorder: '#12151c', idleText: '#cbd5e1',
    pressBg: '#f97316', pressBorder: '#7c2d12', pressText: '#ffffff', radius: 8, borderWidth: 2, pressMs: 40 },
  'Kaca': { look: 'glass', glowSize: 10, idleBg: '#ffffff', idleOpacity: 0.12, idleBorder: '#ffffff', idleText: '#f1f5f9',
    pressBg: '#e0f2fe', pressBorder: '#ffffff', pressText: '#0b1220', glow: '#ffffff', radius: 14, borderWidth: 1 },
  'Merah Gaming': { look: 'neon', fontFamily: 'impact', fontWeight: 400, idleBg: '#1a0b10', idleOpacity: 0.85, idleBorder: '#5b1a2a',
    idleText: '#c98a98', pressBg: '#ff2d55', pressBorder: '#ffd1da', pressText: '#ffffff', glow: '#ff2d55', glowSize: 20, radius: 6 },
  'Matrix': { look: 'neon', fontFamily: 'mono', idleBg: '#04130a', idleOpacity: 0.85, idleBorder: '#14532d', idleText: '#4ade80',
    pressBg: '#22c55e', pressBorder: '#bbf7d0', pressText: '#022c14', glow: '#22c55e', radius: 4 },
  'Pastel': { look: 'flat', fontFamily: 'rounded', glowSize: 0, idleBg: '#fdf2f8', idleOpacity: 0.92, idleBorder: '#fbcfe8', idleText: '#9d174d',
    pressBg: '#f472b6', pressBorder: '#be185d', pressText: '#ffffff', radius: 16, borderWidth: 2 }
};

const SCHEMA = [
  { g: 'Gaya tombol', items: [
    { k: 'look', l: 'Tampilan', t: 'select', o: { neon: 'Neon', flat: 'Flat', keycap: 'Keycap 3D', glass: 'Kaca' } },
    { k: 'anim', l: 'Animasi saat ditekan', t: 'select', o: { press: 'Mengecil', pop: 'Membesar', none: 'Tanpa animasi' } },
    { k: 'pressMs', l: 'Kecepatan menyala', t: 'range', min: 0, max: 300, step: 5, u: ' ms' },
    { k: 'releaseMs', l: 'Kecepatan memudar saat dilepas', t: 'range', min: 0, max: 800, step: 10, u: ' ms' },
    { k: 'radius', l: 'Sudut membulat', t: 'range', min: 0, max: 40, step: 1, u: ' px' },
    { k: 'borderWidth', l: 'Tebal garis tepi tombol', t: 'range', min: 0, max: 8, step: 0.5, u: ' px' }
  ] },
  { g: 'Teks', items: [
    { k: 'showLabels', l: 'Tampilkan teks tombol', t: 'check' },
    { k: 'fontFamily', l: 'Jenis huruf', t: 'select', o: { ui: 'Bahnschrift (gaming)', mono: 'Monospace', rounded: 'Membulat', impact: 'Impact (tebal)', serif: 'Serif' } },
    { k: 'fontScale', l: 'Ukuran huruf', t: 'range', min: 0.15, max: 0.6, step: 0.01, p: 1 },
    { k: 'fontWeight', l: 'Ketebalan huruf', t: 'range', min: 300, max: 900, step: 100, u: '' },
    { k: 'uppercase', l: 'Huruf kapital', t: 'check' }
  ] },
  { g: 'Warna', items: [
    { k: 'idleBg', l: 'Latar tombol (diam)', t: 'color' },
    { k: 'idleOpacity', l: 'Opasitas latar tombol', t: 'range', min: 0, max: 1, step: 0.01, p: 1 },
    { k: 'idleBorder', l: 'Garis tepi (diam)', t: 'color' },
    { k: 'idleText', l: 'Teks (diam)', t: 'color' },
    { k: 'pressBg', l: 'Latar saat ditekan', t: 'color' },
    { k: 'pressBorder', l: 'Garis tepi saat ditekan', t: 'color' },
    { k: 'pressText', l: 'Teks saat ditekan', t: 'color' },
    { k: 'glow', l: 'Warna glow', t: 'color' },
    { k: 'glowSize', l: 'Besar glow saat ditekan', t: 'range', min: 0, max: 60, step: 1, u: ' px' }
  ] },
  { g: 'Ukuran & posisi', items: [
    { k: 'unit', l: 'Ukuran 1 tombol', t: 'range', min: 24, max: 120, step: 1, u: ' px' },
    { k: 'gap', l: 'Jarak antar tombol', t: 'range', min: 0, max: 20, step: 1, u: ' px' },
    { k: 'scale', l: 'Skala seluruh papan', t: 'range', min: 0.3, max: 3, step: 0.05, u: '×' },
    { k: 'posX', l: 'Posisi horizontal (0 kiri – 100 kanan)', t: 'range', min: 0, max: 100, step: 1, u: '%' },
    { k: 'posY', l: 'Posisi vertikal (0 atas – 100 bawah)', t: 'range', min: 0, max: 100, step: 1, u: '%' }
  ] },
  { g: 'Latar papan (opsional)', items: [
    { k: 'panel', l: 'Tampilkan latar di belakang papan', t: 'check' },
    { k: 'panelColor', l: 'Warna latar', t: 'color' },
    { k: 'panelOpacity', l: 'Opasitas latar', t: 'range', min: 0, max: 1, step: 0.01, p: 1 },
    { k: 'panelRadius', l: 'Sudut membulat', t: 'range', min: 0, max: 60, step: 1, u: ' px' },
    { k: 'panelPad', l: 'Jarak dalam', t: 'range', min: 0, max: 60, step: 1, u: ' px' },
    { k: 'panelBorderWidth', l: 'Tebal garis tepi', t: 'range', min: 0, max: 12, step: 0.5, u: ' px' },
    { k: 'panelBorderColor', l: 'Warna garis tepi', t: 'color' }
  ] },
  { g: 'Mouse', items: [
    { k: 'mouseShow', l: 'Tampilkan mouse', t: 'check' },
    { k: 'mouseScale', l: 'Ukuran mouse', t: 'range', min: 0.4, max: 2.5, step: 0.05, u: '×' },
    { k: 'mouseLabels', l: 'Teks pada tombol mouse', t: 'check' }
  ] },
  { g: 'Perilaku', items: [
    { k: 'autoHide', l: 'Sembunyikan otomatis saat tidak dipakai', t: 'check' },
    { k: 'autoHideSec', l: 'Sembunyi setelah', t: 'range', min: 1, max: 30, step: 1, u: ' dtk' }
  ] },
  { g: 'Watermark', items: [
    { k: 'wm', l: 'Tampilkan watermark kecil (Created by Andromache)', t: 'check' },
    { k: 'wmPos', l: 'Posisi', t: 'select', o: { br: 'Kanan bawah', bl: 'Kiri bawah', tr: 'Kanan atas', tl: 'Kiri atas' } },
    { k: 'wmOpacity', l: 'Opasitas', t: 'range', min: 0.1, max: 1, step: 0.05, p: 1 },
    { k: 'wmScale', l: 'Ukuran', t: 'range', min: 0.5, max: 3, step: 0.1, u: '×' },
    { k: 'wmMargin', l: 'Jarak dari tepi', t: 'range', min: 0, max: 80, step: 2, u: ' px' }
  ] }
];

/* -------------------------------------------------------------------------------- util */
const hexCache = {};
function rgb(h) {
  let c = hexCache[h];
  if (!c) {
    let s = String(h || '#fff').replace('#', '');
    if (s.length === 3) s = s.split('').map(x => x + x).join('');
    const n = parseInt(s, 16) || 0;
    c = hexCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return c;
}
const rgba = (h, a) => { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const watchList = cfg => [...new Set((cfg.keys || []).map(k => KEYDEFS[k.id] && KEYDEFS[k.id].vk).filter(Boolean))];

const CSS = `
.kv-root{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden}
.kv-board{position:absolute;transform-origin:0 0;box-sizing:border-box;transition:opacity .35s}
.kv-hide{opacity:0}
.kv-board *{box-sizing:border-box}
.kv-i{background:var(--ibg);border:var(--bw) solid var(--ib);color:var(--it);
  transition-property:background-color,border-color,color,box-shadow,transform;transition-duration:var(--rel);transition-timing-function:ease-out}
.kv-i.kv-on{background:var(--pbg);border-color:var(--pb);color:var(--pt);box-shadow:0 0 var(--gs) var(--glow);transition-duration:var(--prs)}
.kv-k{position:absolute;display:flex;align-items:center;justify-content:center;white-space:nowrap;border-radius:var(--r);
  font-family:var(--ff);font-weight:var(--fw);font-size:var(--fs);text-transform:var(--tt);letter-spacing:.03em;user-select:none}
.kv-k.kv-long{font-size:calc(var(--fs)*.78)}
.kv-m{position:absolute;transform-origin:0 0}
.kv-mbody,.kv-mb,.kv-ms,.kv-mw{position:absolute;font-family:var(--ff);font-weight:var(--fw);user-select:none}
.kv-mb,.kv-ms{display:flex;align-items:flex-end;justify-content:center;padding-bottom:.18em;line-height:1}
.kv-ms{align-items:center;padding:0}
.kv-mw{display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:.12em 0;line-height:1}
.kv-mw span{opacity:.55;transition:opacity var(--rel),color var(--rel)}
.kv-mw.kv-up .kv-u,.kv-mw.kv-dn .kv-d{opacity:1;color:var(--pbg);transition-duration:var(--prs)}
.kv-anim-press .kv-i.kv-on{transform:scale(.93)}
.kv-anim-pop .kv-i.kv-on{transform:scale(1.1)}
.kv-look-neon .kv-i{box-shadow:inset 0 0 9px var(--glowsoft)}
.kv-look-neon .kv-i.kv-on{box-shadow:0 0 var(--gs) var(--glow),inset 0 0 10px rgba(255,255,255,.35)}
.kv-look-keycap .kv-k.kv-i,.kv-look-keycap .kv-mb,.kv-look-keycap .kv-ms{box-shadow:0 5px 0 var(--ib),0 7px 8px rgba(0,0,0,.35)}
.kv-look-keycap .kv-i.kv-on{transform:translateY(4px);box-shadow:0 1px 0 var(--pb)}
.kv-look-keycap .kv-mbody{box-shadow:none}
.kv-look-glass .kv-i{background-image:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.02))}
.kv-look-glass .kv-i.kv-on{background-image:linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,0))}
.kv-mbody.kv-on{background:var(--ibg)!important;border-color:var(--ib)!important;box-shadow:none!important;transform:none!important}
.kv-edit .kv-k,.kv-edit .kv-m{cursor:move;touch-action:none}
.kv-edit .kv-sel{outline:2px dashed #38bdf8;outline-offset:3px}
`;
let cssDone = false;
function ensureCss() {
  if (cssDone) return;
  const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); cssDone = true;
}

/* ------------------------------------------------------------------------------ tampilan */
class KeysView {
  constructor(host, opts) {
    ensureCss();
    this.host = host; this.opts = opts || {};
    this.cfg = JSON.parse(JSON.stringify(DEFAULTS));
    this.down = new Set(); this.mask = 0; this.sel = null; this.frozen = null;
    this.rootEl = el('div', 'kv-root' + (this.opts.editable ? ' kv-edit' : ''));
    host.appendChild(this.rootEl);
    this.lastAct = performance.now();
    this._onResize = () => this.place();
    window.addEventListener('resize', this._onResize);
    this.build();
  }

  setConfig(c) {
    const n = Object.assign({}, DEFAULTS, c || {});
    n.keys = (Array.isArray(n.keys) ? n.keys : DEFAULTS.keys).filter(k => KEYDEFS[k.id]).map(k => Object.assign({}, k));
    this.cfg = n;
    this.build();
  }

  /* --- membangun DOM --- */
  build() {
    const c = this.cfg, u = c.unit;
    this.rootEl.innerHTML = '';
    const b = this.board = el('div', `kv-board kv-look-${c.look} kv-anim-${c.anim}`);
    const st = b.style;
    st.setProperty('--ibg', rgba(c.idleBg, c.idleOpacity)); st.setProperty('--ib', rgba(c.idleBorder, 1));
    st.setProperty('--it', c.idleText); st.setProperty('--pbg', c.pressBg); st.setProperty('--pb', c.pressBorder);
    st.setProperty('--pt', c.pressText); st.setProperty('--glow', c.glow); st.setProperty('--glowsoft', rgba(c.glow, 0.28));
    st.setProperty('--gs', c.glowSize + 'px'); st.setProperty('--r', c.radius + 'px'); st.setProperty('--bw', c.borderWidth + 'px');
    st.setProperty('--ff', FONTS[c.fontFamily] || FONTS.ui); st.setProperty('--fw', c.fontWeight);
    st.setProperty('--fs', (c.fontScale * u) + 'px'); st.setProperty('--tt', c.uppercase ? 'uppercase' : 'none');
    st.setProperty('--prs', c.pressMs + 'ms'); st.setProperty('--rel', c.releaseMs + 'ms');
    this.pad = c.panel ? c.panelPad : 0;
    if (c.panel) {
      st.background = rgba(c.panelColor, c.panelOpacity); st.borderRadius = c.panelRadius + 'px';
      if (c.panelBorderWidth > 0) st.border = `${c.panelBorderWidth}px solid ${c.panelBorderColor}`;
    }
    this.inner = el('div'); this.inner.style.cssText = `position:absolute;left:${this.pad}px;top:${this.pad}px`;
    b.appendChild(this.inner);

    this.keyEls = [];
    for (const k of c.keys) {
      const d = el('div', 'kv-k kv-i'); d.dataset.id = k.id;
      const label = k.label != null && k.label !== '' ? k.label : KEYDEFS[k.id].label;
      if (c.showLabels) { d.textContent = label; if (String(label).length > 3) d.classList.add('kv-long'); }
      d.style.cssText += `left:${k.x * u}px;top:${k.y * u}px;width:${k.w * u - c.gap}px;height:${k.h * u - c.gap}px`;
      this.inner.appendChild(d); this.keyEls.push({ el: d, vk: KEYDEFS[k.id].vk, id: k.id }); this._bind(d, k.id);
    }
    this.mouseEls = [];
    if (c.mouseShow) this._mouse();
    this.rootEl.appendChild(b);
    clearInterval(this._tm);   // timer sembunyi-otomatis hanya berjalan bila fitur dipakai
    this._tm = c.autoHide && !this.opts.editable ? setInterval(() => this._tick(), 200) : 0;
    this.place(); this.refresh();
    if (this.sel) this.select(this.sel, true);
  }

  _mouse() {
    const c = this.cfg, u = c.unit, W = 2.6 * u, H = 4.2 * u, R = 1.3 * u, bw = c.borderWidth;
    const m = el('div', 'kv-m'); m.dataset.id = 'mouse';
    m.style.cssText = `left:${c.mouseX * u}px;top:${c.mouseY * u}px;width:${W}px;height:${H}px;transform:scale(${c.mouseScale});font-size:${0.3 * u}px`;
    const part = (cls, bit, css, html) => {
      const d = el('div', cls + ' kv-i'); d.style.cssText = css; if (html) d.innerHTML = html;
      d.dataset.b = bit; m.appendChild(d); this.mouseEls.push(d); return d;
    };
    const body = el('div', 'kv-mbody kv-i');
    body.style.cssText = `left:0;top:0;width:${W}px;height:${H}px;border-radius:${R}px ${R}px ${R * 0.8}px ${R * 0.8}px`;
    m.appendChild(body);
    const L = c.mouseLabels;
    part('kv-mb', 1, `left:0;top:0;width:${W / 2}px;height:${1.8 * u}px;border-radius:${R}px 0 0 0`, L ? 'L' : '');
    part('kv-mb', 2, `left:${W / 2}px;top:0;width:${W / 2}px;height:${1.8 * u}px;border-radius:0 ${R}px 0 0`, L ? 'R' : '');
    const wh = part('kv-mw', 4, `left:${(W - 0.5 * u) / 2}px;top:${0.45 * u}px;width:${0.5 * u}px;height:${1.0 * u}px;border-radius:${0.25 * u}px;font-size:${0.2 * u}px;z-index:2`,
      '<span class="kv-u">▲</span><span class="kv-d">▼</span>');
    this.wheelEl = wh;
    part('kv-ms', 16, `left:${-0.32 * u}px;top:${1.7 * u}px;width:${0.5 * u}px;height:${0.8 * u}px;border-radius:${0.2 * u}px;font-size:${0.22 * u}px`, L ? 'F' : '');
    part('kv-ms', 8, `left:${-0.32 * u}px;top:${2.65 * u}px;width:${0.5 * u}px;height:${0.8 * u}px;border-radius:${0.2 * u}px;font-size:${0.22 * u}px`, L ? 'B' : '');
    this.inner.appendChild(m); this.mouseRoot = m; this._bind(m, 'mouse');
  }

  /* --- ukuran & posisi papan --- */
  _extentPx() {
    const c = this.cfg, u = c.unit;
    let w = 0, h = 0;
    for (const k of c.keys) { w = Math.max(w, (k.x + k.w) * u - c.gap); h = Math.max(h, (k.y + k.h) * u - c.gap); }
    if (c.mouseShow) { w = Math.max(w, (c.mouseX + 2.6 * c.mouseScale) * u); h = Math.max(h, (c.mouseY + 4.2 * c.mouseScale) * u); }
    return { w: Math.max(w, u), h: Math.max(h, u) };
  }

  place() {
    if (!this.board) return;
    const c = this.cfg, ex = this.frozen || this._extentPx();
    const bw = ex.w + this.pad * 2, bh = ex.h + this.pad * 2;
    const vw = this.host.clientWidth || window.innerWidth, vh = this.host.clientHeight || window.innerHeight;
    const s = this.board.style;
    s.width = bw + 'px'; s.height = bh + 'px';
    s.left = ((vw - bw * c.scale) * c.posX / 100) + 'px';
    s.top = ((vh - bh * c.scale) * c.posY / 100) + 'px';
    s.transform = `scale(${c.scale})`;
  }

  /* --- status input --- */
  key(vk, down) {
    if (down) this.down.add(vk); else this.down.delete(vk);
    this.touch(); this.refresh();
  }
  buttons(mask) { this.mask = mask; this.touch(); this.refresh(); }
  wheel(v) {
    this.touch();
    const w = this.wheelEl; if (!w) return;
    w.classList.remove('kv-up', 'kv-dn'); void w.offsetWidth;
    w.classList.add(v > 0 ? 'kv-up' : 'kv-dn');
    clearTimeout(this._wt); this._wt = setTimeout(() => w.classList.remove('kv-up', 'kv-dn'), 150);
  }
  touch() { this.lastAct = performance.now(); }
  clearInput() { this.down.clear(); this.mask = 0; this.refresh(); }
  refresh() {
    for (const k of this.keyEls) k.el.classList.toggle('kv-on', this.down.has(k.vk));
    for (const d of this.mouseEls) d.classList.toggle('kv-on', (this.mask & +d.dataset.b) !== 0);
  }
  _tick() {
    if (!this.board || this.opts.editable) return;
    const idle = this.cfg.autoHide && !this.down.size && !this.mask && performance.now() - this.lastAct > this.cfg.autoHideSec * 1000;
    this.board.classList.toggle('kv-hide', !!idle);
  }

  /* --- mode edit (panel): pilih & geser --- */
  select(id, silent) {
    this.sel = id;
    for (const k of this.keyEls) k.el.classList.toggle('kv-sel', k.id === id);
    if (this.mouseRoot) this.mouseRoot.classList.toggle('kv-sel', id === 'mouse');
    if (!silent && this.opts.onSelect) this.opts.onSelect(id);
  }
  _bind(node, id) {
    if (!this.opts.editable) return;
    node.addEventListener('pointerdown', e => {
      e.preventDefault(); node.setPointerCapture(e.pointerId); this.select(id);
      const c = this.cfg, item = id === 'mouse' ? null : c.keys.find(k => k.id === id);
      const x0 = item ? item.x : c.mouseX, y0 = item ? item.y : c.mouseY, sx = e.clientX, sy = e.clientY;
      const f = (this.opts.scale ? this.opts.scale() : 1) * c.scale * c.unit;
      this.frozen = this._extentPx();
      const mv = ev => {
        const snap = this.opts.snap ? this.opts.snap() : 0;
        let nx = x0 + (ev.clientX - sx) / f, ny = y0 + (ev.clientY - sy) / f;
        if (snap) { nx = Math.round(nx / snap) * snap; ny = Math.round(ny / snap) * snap; }
        nx = Math.max(id === 'mouse' ? 0.35 : 0, +nx.toFixed(3)); ny = Math.max(0, +ny.toFixed(3));
        if (item) { item.x = nx; item.y = ny; } else { c.mouseX = nx; c.mouseY = ny; }
        node.style.left = nx * c.unit + 'px'; node.style.top = ny * c.unit + 'px';
        if (this.opts.onDrag) this.opts.onDrag(id);
      };
      const up = () => {
        node.removeEventListener('pointermove', mv); node.removeEventListener('pointerup', up);
        this.frozen = null; this.place();
        if (this.opts.onChange) this.opts.onChange();
      };
      node.addEventListener('pointermove', mv); node.addEventListener('pointerup', up);
    });
  }
}

/* ------------------------------------------------------- pembuat kontrol dari SCHEMA (panel) */
const fmt = (it, v) => it.p ? Math.round(v * 100) + '%' : (+v).toString() + (it.u || '');
function buildControls(container, schema, get, set) {
  container.innerHTML = schema.map((grp, gi) => `
    <details ${gi < 2 ? 'open' : ''}><summary>${grp.g}</summary><div class="rows">
    ${grp.items.map(it => {
      const id = 'f_' + it.k;
      if (it.t === 'range') return `<div class="row"><div class="lab"><label for="${id}">${it.l}</label><output id="o_${it.k}"></output></div>
        <input type="range" id="${id}" min="${it.min}" max="${it.max}" step="${it.step}"></div>`;
      if (it.t === 'select') return `<div class="row"><div class="lab"><label for="${id}">${it.l}</label></div>
        <select id="${id}">${Object.entries(it.o).map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></div>`;
      return `<div class="row inline"><label class="lab" for="${id}">${it.l}</label><input type="${it.t === 'color' ? 'color' : 'checkbox'}" id="${id}"></div>`;
    }).join('')}</div></details>`).join('');
  const $ = id => document.getElementById(id);
  for (const grp of schema) for (const it of grp.items) {
    const e = $('f_' + it.k);
    e.addEventListener(it.t === 'range' || it.t === 'color' ? 'input' : 'change', () => {
      const v = it.t === 'check' ? e.checked : it.t === 'range' ? parseFloat(e.value) : e.value;
      if (it.t === 'range') $('o_' + it.k).textContent = fmt(it, v);
      set(it.k, v);
    });
  }
  return { sync() {
    const cfg = get();
    for (const grp of schema) for (const it of grp.items) {
      const e = $('f_' + it.k), v = cfg[it.k];
      if (it.t === 'check') e.checked = !!v; else e.value = v;
      if (it.t === 'range') $('o_' + it.k).textContent = fmt(it, v);
    }
  } };
}

const api = { KEYDEFS, FONTS, DEFAULTS, LAYOUT_KEYS, PRESETS, LAYOUTS, SCHEMA, KeysView, buildControls, defaultW, watchList };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.AimKeys = api;
})(typeof window !== 'undefined' ? window : globalThis);
