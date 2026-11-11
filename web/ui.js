/*! Mode tampilan panel: otomatis (ikut sistem) / terang / gelap — diingat di browser. Dimuat di <head> agar tidak berkedip. */
(function () {
  const KEY = 'aimtrail-ui', de = document.documentElement, mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  const get = () => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (_) { return 'auto'; } };
  const apply = m => { de.dataset.mode = m; de.dataset.theme = m === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : m; };
  apply(get());
  if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (get() === 'auto') apply('auto'); });
  window.addEventListener('storage', e => { if (e.key === KEY) { apply(get()); document.dispatchEvent(new Event('aimui')); } });
  window.AimUI = { get, set(m) { try { m === 'auto' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, m); } catch (_) {} apply(m); document.dispatchEvent(new Event('aimui')); } };
})();
