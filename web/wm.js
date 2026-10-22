/*! AimTrail watermark — Created by Andromache | TikTok @andromache.4k */
(function (root) {
'use strict';
const CSS = `.aim-wm{position:absolute;display:none;align-items:center;gap:.55em;white-space:nowrap;pointer-events:none;user-select:none;
font-family:"Bahnschrift","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;font-weight:600;letter-spacing:.02em;color:#fff;line-height:1;
text-shadow:0 1px 3px rgba(0,0,0,.65),0 0 10px rgba(0,0,0,.35);z-index:50}
.aim-wm i{width:.5em;height:.5em;border-radius:50%;background:#38bdf8;box-shadow:0 0 .8em #38bdf8}
.aim-wm b{font-weight:700}.aim-wm .s{opacity:.5}`;
let cssDone = false;

/** Pasang watermark ke elemen `host` (harus position:absolute/fixed/relative). */
function mount(host) {
  if (!cssDone) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); cssDone = true; }
  const el = document.createElement('div');
  el.className = 'aim-wm';
  el.innerHTML = '<i></i><span>Created by <b>Andromache</b></span><span class="s">|</span><span>TikTok @andromache.4k</span>';
  host.appendChild(el);
  return {
    el, hidden: false, cfg: null,
    apply(cfg) {
      if (cfg) this.cfg = cfg;
      const c = this.cfg; if (!c) return;
      const on = c.wm !== false && !this.hidden, s = el.style;
      s.display = on ? 'flex' : 'none';
      if (!on) return;
      const m = (c.wmMargin == null ? 18 : c.wmMargin) + 'px', pos = c.wmPos || 'br';
      s.fontSize = (14 * (c.wmScale || 1)) + 'px';
      s.opacity = c.wmOpacity == null ? 0.65 : c.wmOpacity;
      s.left = s.right = s.top = s.bottom = 'auto';
      s[pos[0] === 't' ? 'top' : 'bottom'] = m;
      s[pos[1] === 'l' ? 'left' : 'right'] = m;
    },
    setHidden(h) { this.hidden = !!h; this.apply(); }
  };
}
/** Hanya satu overlay yang menampilkan watermark: yang berprioritas tertinggi di antara yang terhubung. */
const ORDER = ['trail', 'keys', 'metrics', 'pad'], CFGKEY = { trail: 'config', keys: 'kconfig', metrics: 'mconfig', pad: 'pconfig' };
function shouldHide(me, peers, cfgs) {
  for (const k of ORDER) {
    if (k === me) break;
    if (((peers || {})[k] | 0) > 0 && ((cfgs || {})[CFGKEY[k]] || {}).wm !== false) return true;
  }
  return false;
}
root.AimWM = { mount, shouldHide };
})(window);
