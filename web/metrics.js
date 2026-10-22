/*! AimMetrics — widget metrik live: kecepatan mouse, klik per detik, durasi tahan, stabilitas bidikan */
(function (root) {
'use strict';

const TRIG = { left: 1, right: 2, middle: 4, x1: 8, x2: 16 };

const DEFAULTS = {
  showSpeed: true, showCps: true, showHold: true, showStability: true,
  speedUnit: 'cms', dpi: 800, speedMaxCm: 80, decimals: 1,
  trigger: 'left', cpsWindow: 1, cpsMax: 10, holdMax: 1500,
  stabilityMode: 'hold', stabilityWindow: 1,
  layout: 'row', cardWidth: 190, scale: 1, posX: 50, posY: 6, bars: true, spark: true,
  autoHide: false, autoHideSec: 4,
  wm: true, wmPos: 'br', wmOpacity: 0.65, wmScale: 1, wmMargin: 18,
  resetAt: 0
};

/* ------------------------------------------------------------------ mesin perhitungan */
class Metrics {
  constructor(cfg) { this.setConfig(cfg || {}); this.reset(0); }

  setConfig(c) { this.cfg = Object.assign({}, DEFAULTS, c); }

  reset(now) {
    this.ev = [];            // {t, dx, dy}
    this.clicks = [];        // waktu klik (tekan) 12 dtk terakhir
    this.total = 0; this.btn = false;
    this.holdStart = 0; this.holdEv = []; this.holds = []; this.holdLast = null; this.holdPeak = 0;
    this.stabLast = null; this.stabEma = null;
    this.speedEma = 0; this.hist = []; this.cpsHist = []; this.lastAct = now || 0;
  }

  move(dx, dy, now) {
    const e = { t: now, dx, dy };
    this.ev.push(e);
    if (this.btn) this.holdEv.push(e);
    this.lastAct = now;
    const cut = now - Math.max(4000, this.cfg.stabilityWindow * 1000 + 500);
    while (this.ev.length && this.ev[0].t < cut) this.ev.shift();
  }

  buttons(mask, now) {
    const down = (mask & TRIG[this.cfg.trigger]) !== 0;
    if (down === this.btn) return;
    this.btn = down; this.lastAct = now;
    if (down) {
      this.clicks.push(now); this.total++;
      this.holdStart = now; this.holdEv = [];
    } else {
      const dur = now - this.holdStart;
      this.holds.push(dur); if (this.holds.length > 20) this.holds.shift();
      this.holdLast = dur; this.holdPeak = Math.max(this.holdPeak, dur);
      this.stabLast = Metrics.stability(this.holdEv, 0);
    }
  }

  /** Kelurusan gerak (0-100): jarak bersih / panjang lintasan, dihitung per kotak waktu 40 ms.
   *  Gerakan halus/lurus -> mendekati 100; goyang bolak-balik -> turun. Diam (lintasan sangat pendek) -> 100. */
  static stability(evs, since) {
    if (!evs.length) return null;
    const BIN = 40, bins = new Map();
    for (const e of evs) {
      if (e.t < since) continue;
      const k = Math.floor(e.t / BIN), b = bins.get(k) || [0, 0];
      b[0] += e.dx; b[1] += e.dy; bins.set(k, b);
    }
    let L = 0, sx = 0, sy = 0;
    for (const b of bins.values()) { L += Math.hypot(b[0], b[1]); sx += b[0]; sy += b[1]; }
    if (L < 30) return 100;
    return Math.round(100 * Math.min(1, Math.hypot(sx, sy) / L));
  }

  _unit(counts) {   // hitungan/dtk -> satuan tampilan
    return this.cfg.speedUnit === 'cms' ? counts / this.cfg.dpi * 2.54 : counts;
  }

  snapshot(now) {
    const c = this.cfg;
    // kecepatan: jumlah gerakan 150 ms terakhir
    let sum = 0; const w = 150;
    for (let i = this.ev.length - 1; i >= 0 && this.ev[i].t > now - w; i--) sum += Math.hypot(this.ev[i].dx, this.ev[i].dy);
    const raw = this._unit(sum / (w / 1000));
    this.speedEma += (raw - this.speedEma) * 0.4;
    if (this.speedEma < 0.05) this.speedEma = raw === 0 ? 0 : this.speedEma;
    const last = this.hist[this.hist.length - 1];
    if (!last || now - last.t >= 100) { this.hist.push({ t: now, v: this.speedEma }); }
    while (this.hist.length && this.hist[0].t < now - 5000) this.hist.shift();
    const speedPeak = this.hist.reduce((m, h) => Math.max(m, h.v), 0);
    // klik per detik
    while (this.clicks.length && this.clicks[0] < now - 12000) this.clicks.shift();
    const win = c.cpsWindow * 1000, n = this.clicks.filter(t => t >= now - win).length, cps = n / c.cpsWindow;
    const lc = this.cpsHist[this.cpsHist.length - 1];
    if (!lc || now - lc.t >= 100) this.cpsHist.push({ t: now, v: cps });
    while (this.cpsHist.length && this.cpsHist[0].t < now - 10000) this.cpsHist.shift();
    const cpsPeak = this.cpsHist.reduce((m, h) => Math.max(m, h.v), 0);
    // durasi tahan
    const holdCur = this.btn ? now - this.holdStart : 0;
    const recent = this.holds.slice(-10), holdAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
    // stabilitas
    let stab = null;
    if (c.stabilityMode === 'always') stab = Metrics.stability(this.ev, now - c.stabilityWindow * 1000);
    else stab = this.btn ? Metrics.stability(this.holdEv, now - c.stabilityWindow * 1000) : this.stabLast;
    if (stab != null) { this.stabEma = this.stabEma == null ? stab : this.stabEma + (stab - this.stabEma) * 0.35; }
    return {
      speed: this.speedEma, speedPeak, speedUnit: c.speedUnit === 'cms' ? 'cm/s' : 'cnt/s',
      cps, cpsPeak, clicks: this.total,
      holdCur, holdLast: this.holdLast, holdAvg, holding: this.btn,
      stability: stab == null ? null : Math.round(this.stabEma), spark: this.hist,
      active: this.btn || now - this.lastAct < 800
    };
  }
}

/* ------------------------------------------------------------------------- skema panel */
const WM_SCHEMA = { g: 'Watermark', items: [
  { k: 'wm', l: 'Tampilkan watermark kecil (Created by Andromache)', t: 'check' },
  { k: 'wmPos', l: 'Posisi', t: 'select', o: { br: 'Kanan bawah', bl: 'Kiri bawah', tr: 'Kanan atas', tl: 'Kiri atas' } },
  { k: 'wmOpacity', l: 'Opasitas', t: 'range', min: 0.1, max: 1, step: 0.05, p: 1 },
  { k: 'wmScale', l: 'Ukuran', t: 'range', min: 0.5, max: 3, step: 0.1, u: '×' },
  { k: 'wmMargin', l: 'Jarak dari tepi', t: 'range', min: 0, max: 80, step: 2, u: ' px' }] };
const SCHEMA = [
  { g: 'Yang ditampilkan', items: [
    { k: 'showSpeed', l: 'Kecepatan mouse', t: 'check' },
    { k: 'showCps', l: 'Klik per detik (CPS)', t: 'check' },
    { k: 'showHold', l: 'Durasi tahan klik', t: 'check' },
    { k: 'showStability', l: 'Stabilitas bidikan', t: 'check' }] },
  { g: 'Pengukuran', items: [
    { k: 'trigger', l: 'Tombol yang dihitung', t: 'select', o: { left: 'Klik kiri', right: 'Klik kanan', middle: 'Klik tengah', x1: 'Mouse 4', x2: 'Mouse 5' } },
    { k: 'speedUnit', l: 'Satuan kecepatan', t: 'select', o: { cms: 'cm/dtk (butuh DPI)', counts: 'hitungan/dtk (mentah)' } },
    { k: 'dpi', l: 'DPI mouse', t: 'range', min: 100, max: 3200, step: 50, u: '' },
    { k: 'speedMaxCm', l: 'Kecepatan penuh pada bar', t: 'range', min: 10, max: 300, step: 5, u: ' cm/dtk' },
    { k: 'decimals', l: 'Angka desimal kecepatan', t: 'range', min: 0, max: 2, step: 1, u: '' },
    { k: 'cpsWindow', l: 'Jendela hitung CPS', t: 'range', min: 0.5, max: 3, step: 0.5, u: ' dtk' },
    { k: 'cpsMax', l: 'CPS penuh pada bar', t: 'range', min: 4, max: 20, step: 1, u: '' },
    { k: 'holdMax', l: 'Durasi tahan penuh pada bar', t: 'range', min: 300, max: 5000, step: 100, u: ' ms' },
    { k: 'stabilityMode', l: 'Stabilitas dihitung', t: 'select', o: { hold: 'Saat menahan klik (menembak)', always: 'Selalu (jendela bergulir)' } },
    { k: 'stabilityWindow', l: 'Jendela stabilitas', t: 'range', min: 0.5, max: 3, step: 0.5, u: ' dtk' }] },
  { g: 'Tampilan', items: [
    { k: 'layout', l: 'Susunan', t: 'select', o: { row: 'Satu baris', column: 'Satu kolom', grid: 'Kotak 2 × 2' } },
    { k: 'cardWidth', l: 'Lebar kartu', t: 'range', min: 110, max: 320, step: 5, u: ' px' },
    { k: 'scale', l: 'Skala', t: 'range', min: 0.4, max: 3, step: 0.05, u: '×' },
    { k: 'posX', l: 'Posisi horizontal', t: 'range', min: 0, max: 100, step: 1, u: '%' },
    { k: 'posY', l: 'Posisi vertikal', t: 'range', min: 0, max: 100, step: 1, u: '%' },
    { k: 'bars', l: 'Bar indikator', t: 'check' },
    { k: 'spark', l: 'Grafik mini kecepatan (5 dtk)', t: 'check' }] },
  { g: 'Perilaku', items: [
    { k: 'autoHide', l: 'Sembunyikan saat tidak ada aktivitas', t: 'check' },
    { k: 'autoHideSec', l: 'Sembunyi setelah', t: 'range', min: 1, max: 30, step: 1, u: ' dtk' }] },
  WM_SCHEMA
];

/* ------------------------------------------------------------------------------ tampilan */
const CSS = `
.m-root{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;font-family:var(--t-font,system-ui)}
.m-wrap{position:absolute;left:0;top:0;visibility:hidden}
.m-board{position:absolute;left:0;top:0;transform-origin:0 0;display:flex;gap:10px}
.m-board.col{flex-direction:column}.m-board.grid{display:grid;grid-template-columns:repeat(2,auto)}
.m-card{box-sizing:border-box;background:var(--t-panel);border:2px solid var(--t-border);border-radius:var(--t-radius);padding:10px 14px 12px;color:var(--t-text);
 box-shadow:0 0 calc(var(--t-gs)*.5) rgba(0,0,0,.25);position:relative;overflow:hidden}
.m-top{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--t-muted);letter-spacing:.02em;text-transform:uppercase;white-space:nowrap}
.m-val{display:flex;align-items:baseline;gap:6px;margin:2px 0 6px;line-height:1}
.m-val b{font-size:40px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--t-text);text-shadow:0 0 var(--t-gs) color-mix(in srgb,var(--t-glow) 55%,transparent)}
.m-val i{font-style:normal;font-size:14px;color:var(--t-muted)}
.m-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
.m-bar u{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--t-accent2),var(--t-accent));transition:width .12s linear;text-decoration:none}
.m-bar u.mid{background:#fbbf24}.m-bar u.low{background:#f87171}
.m-spark{display:block;width:100%;height:26px;margin-top:8px}
.m-sub{font-size:12px;color:var(--t-muted);margin-top:6px;white-space:nowrap}
.m-card.on{border-color:var(--t-accent);box-shadow:0 0 var(--t-gs) color-mix(in srgb,var(--t-glow) 45%,transparent)}
`;
let cssDone = false;
const ensureCss = () => { if (cssDone) return; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); cssDone = true; };
const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

class MetricsView {
  constructor(host, opts) {
    ensureCss();
    this.host = host; this.opts = opts || {};
    this.cfg = Object.assign({}, DEFAULTS); this.theme = null; this.m = new Metrics(this.cfg);
    this.rootEl = mk('div', 'm-root'); host.appendChild(this.rootEl);
    this.cards = {}; this.txt = new Map(); this._visible = null; this._lastReset = null; this._started = !(opts && opts.wait);
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

  setConfig(c) {
    const n = Object.assign({}, DEFAULTS, c || {});
    if (this._lastReset === null) this._lastReset = n.resetAt;
    else if (n.resetAt !== this._lastReset) { this._lastReset = n.resetAt; this.m.reset(performance.now()); }
    this.cfg = n; this.m.setConfig(n); this.build();
  }

  /* data masuk: cap waktu disebar sesuai selisih asli agar halus walau tiba bergerombol */
  feed(list, now) {
    let total = 0;
    for (const e of list) if (e.t === 'm') total += e.d || 0;
    let t = now - Math.min(total, 60);
    for (const e of list) {
      if (e.t === 'm') { t += e.d || 0; this.m.move(e.dx, e.dy, t); } else if (e.t === 'b') this.m.buttons(e.b, t);
    }
    if (list.length) this._wake();
  }
  _wake() { if (this.anim && this._started && !this.opts.editable && this.anim.visible === false) { this.anim.show(this.theme); this._visible = true; } }
  move(dx, dy, d, now) { this.m.move(dx, dy, now); this._wake(); }
  buttons(mask, now) { this.m.buttons(mask, now); this._wake(); }

  build() {
    const c = this.cfg;
    this.rootEl.innerHTML = ''; this.cards = {}; this.txt.clear();
    const board = this.board = mk('div', 'm-board' + (c.layout === 'column' ? ' col' : c.layout === 'grid' ? ' grid' : ''));
    if (root.AimTheme) root.AimTheme.applyVars(board, this.theme);
    const defs = [['speed', 'showSpeed', 'Kecepatan'], ['cps', 'showCps', 'CPS'], ['hold', 'showHold', 'Tahan klik'], ['stab', 'showStability', 'Stabilitas']];
    for (const [k, flag, label] of defs) {
      if (!c[flag]) continue;
      const card = mk('div', 'm-card');
      card.style.width = c.cardWidth + 'px';
      card.innerHTML = `<div class="m-top"><span>${label}</span><span class="s1"></span></div><div class="m-val"><b>--</b><i></i></div>` +
        (c.bars ? '<div class="m-bar"><u></u></div>' : '') + (k === 'speed' && c.spark ? '<canvas class="m-spark" width="240" height="52"></canvas>' : '') +
        '<div class="m-sub"></div>';
      board.appendChild(card);
      this.cards[k] = { card, b: card.querySelector('b'), i: card.querySelector('i'), s1: card.querySelector('.s1'), sub: card.querySelector('.m-sub'),
        bar: card.querySelector('.m-bar u'), cv: card.querySelector('canvas') };
    }
    const wrap = this.wrap = mk('div', 'm-wrap'); wrap.appendChild(board); this.rootEl.appendChild(wrap);
    this.anim = root.AimAnim ? root.AimAnim.make(wrap) : null;
    this.place();
    if (this.anim && !this._started) wrap.style.visibility = 'hidden';
    else if (this.anim) {
      const first = this._visible === null;
      if (this._visible === false) this.anim.hide(this.theme, true); else this.anim.show(this.theme, !first || this.opts.editable);
      this._visible = this.anim.visible;
    }
    this.tick(performance.now(), true);
  }

  place() {
    if (!this.board) return;
    const c = this.cfg, bw = this.board.offsetWidth || 0, bh = this.board.offsetHeight || 0;
    const vw = this.host.clientWidth || window.innerWidth, vh = this.host.clientHeight || window.innerHeight;
    this.board.style.transform = `scale(${c.scale})`;
    const w = this.wrap.style;
    w.width = bw * c.scale + 'px'; w.height = bh * c.scale + 'px';
    w.left = ((vw - bw * c.scale) * c.posX / 100) + 'px'; w.top = ((vh - bh * c.scale) * c.posY / 100) + 'px';
  }

  _set(k, part, text) {
    const key = k + part; if (this.txt.get(key) === text) return;
    this.txt.set(key, text); this.cards[k][part].textContent = text;
  }

  /** Perbarui tampilan (dipanggil ±10x/detik); hanya menyentuh DOM jika teks berubah. */
  tick(now, force) {
    const c = this.cfg, s = this.m.snapshot(now), C = this.cards;
    const f = (v, d) => (v == null ? '--' : v.toFixed(d));
    if (C.speed) {
      const maxU = c.speedUnit === 'cms' ? c.speedMaxCm : c.speedMaxCm * c.dpi / 2.54;
      this._set('speed', 'b', f(s.speed, c.decimals)); this._set('speed', 'i', s.speedUnit);
      this._set('speed', 's1', 'maks ' + f(s.speedPeak, 0)); this._set('speed', 'sub', '5 detik terakhir');
      if (C.speed.bar) C.speed.bar.style.width = Math.min(100, s.speed / maxU * 100) + '%';
      if (C.speed.cv) this._spark(C.speed.cv, s.spark, now, Math.max(maxU * 0.5, s.speedPeak, 1));
    }
    if (C.cps) {
      this._set('cps', 'b', f(s.cps, 1)); this._set('cps', 'i', 'klik/dtk');
      this._set('cps', 's1', 'maks ' + f(s.cpsPeak, 1)); this._set('cps', 'sub', 'total ' + s.clicks + ' klik');
      if (C.cps.bar) C.cps.bar.style.width = Math.min(100, s.cps / c.cpsMax * 100) + '%';
    }
    if (C.hold) {
      const v = s.holding ? s.holdCur : (s.holdLast == null ? null : s.holdLast);
      this._set('hold', 'b', v == null ? '--' : String(Math.round(v))); this._set('hold', 'i', 'ms');
      this._set('hold', 's1', s.holding ? 'menahan' : 'terakhir');
      this._set('hold', 'sub', s.holdAvg == null ? 'rata-rata --' : 'rata-rata ' + Math.round(s.holdAvg) + ' ms');
      if (C.hold.bar) C.hold.bar.style.width = Math.min(100, (v || 0) / c.holdMax * 100) + '%';
      C.hold.card.classList.toggle('on', !!s.holding);
    }
    if (C.stab) {
      const v = s.stability;
      this._set('stab', 'b', v == null ? '--' : String(v)); this._set('stab', 'i', '%');
      this._set('stab', 's1', v == null ? '' : v >= 80 ? 'stabil' : v >= 55 ? 'cukup' : 'goyang');
      this._set('stab', 'sub', c.stabilityMode === 'hold' ? (s.holding ? 'saat menembak' : 'tembakan terakhir') : 'gerak 1 dtk terakhir');
      if (C.stab.bar) { C.stab.bar.style.width = (v || 0) + '%'; C.stab.bar.className = v == null || v >= 80 ? '' : v >= 55 ? 'mid' : 'low'; }
    }
    if (this.anim && this._started && !this.opts.editable) {
      const idle = c.autoHide && !s.active && now - this.m.lastAct > c.autoHideSec * 1000;
      if (idle) this.anim.hide(this.theme); else this.anim.show(this.theme);
      this._visible = this.anim.visible;
    }
    if (force || this._sz !== this.board.offsetWidth + 'x' + this.board.offsetHeight) { this._sz = this.board.offsetWidth + 'x' + this.board.offsetHeight; this.place(); }
  }

  _spark(cv, hist, now, max) {
    const g = cv.getContext('2d'); if (!g) return;
    const W = cv.width, H = cv.height, t0 = now - 5000, acc = (root.AimTheme ? root.AimTheme.merge(this.theme).accent : '#38bdf8');
    g.clearRect(0, 0, W, H);
    if (hist.length < 2) return;
    g.beginPath();
    hist.forEach((h, i) => { const x = (h.t - t0) / 5000 * W, y = H - 2 - Math.min(1, h.v / max) * (H - 6); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = acc; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
    g.lineTo(W, H); g.lineTo((hist[0].t - t0) / 5000 * W, H); g.closePath(); g.globalAlpha = 0.18; g.fillStyle = acc; g.fill(); g.globalAlpha = 1;
  }
}

const api = { Metrics, MetricsView, DEFAULTS, SCHEMA, TRIG };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.AimMetrics = api;
})(typeof window !== 'undefined' ? window : globalThis);
