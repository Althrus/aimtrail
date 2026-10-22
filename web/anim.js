/*! AimAnim — animasi masuk/keluar yang halus (Web Animations API), dipakai semua overlay berbasis DOM */
(function (root) {
'use strict';
const START = { none: 'none', fade: 'none', 'slide-up': 'translateY(28px)', 'slide-down': 'translateY(-28px)',
  'slide-left': 'translateX(-44px)', 'slide-right': 'translateX(44px)', scale: 'scale(.92)', zoom: 'scale(.6)' };
const EASES = { smooth: 'cubic-bezier(.22,.61,.36,1)', spring: 'cubic-bezier(.34,1.56,.64,1)', inout: 'cubic-bezier(.65,0,.35,1)', linear: 'linear' };

function opts(t) {
  t = t || {};
  return { inn: t.animIn || 'slide-up', out: t.animOut || 'fade', ms: t.animMs == null ? 320 : t.animMs, ease: EASES[t.ease] || EASES.smooth };
}

/** Kendali tampil/sembunyi untuk satu elemen (pembungkus; jangan elemen yang sudah punya transform sendiri). */
function make(el) {
  let vis = null, anim = null;
  const run = (frames, o, done) => {
    if (anim) anim.cancel();
    anim = null;
    if (!el.animate || o.ms <= 0) { done && done(); return; }
    anim = el.animate(frames, { duration: o.ms, easing: o.ease, fill: 'forwards' });
    if (done) anim.onfinish = done;
  };
  return {
    get visible() { return vis; },
    show(theme, instant) {
      const o = opts(theme);
      if (vis === true && !instant) return;
      vis = true; el.style.visibility = 'visible';
      if (instant || o.inn === 'none') { if (anim) anim.cancel(); anim = null; el.style.opacity = 1; return; }
      el.style.opacity = '';
      run([{ opacity: 0, transform: START[o.inn] || 'none' }, { opacity: 1, transform: 'none' }], o);
    },
    hide(theme, instant) {
      const o = opts(theme);
      if (vis === false && !instant) return;
      vis = false;
      const fin = () => { if (vis === false) { el.style.visibility = 'hidden'; el.style.opacity = 0; } };
      if (instant || o.out === 'none') { if (anim) anim.cancel(); anim = null; fin(); return; }
      run([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: START[o.out] || 'none' }], o, fin);
    }
  };
}
root.AimAnim = { make, START, EASES, opts };
if (typeof module !== 'undefined' && module.exports) module.exports = root.AimAnim;
})(typeof window !== 'undefined' ? window : globalThis);
