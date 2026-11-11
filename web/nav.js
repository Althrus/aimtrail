/*! Header bersama semua halaman panel: merek, menu, dan pemilih mode tampilan */
(function () {
  const items = [['/panel.html', 'Ekor mouse'], ['/keys-panel.html', 'Keyboard & mouse'], ['/metrics-panel.html', 'Metrik'],
    ['/pad-panel.html', 'Controller'], ['/dir-panel.html', 'Arah gerak'], ['/tema.html', 'Tema'], ['/manual.html', 'Panduan']];
  const el = document.getElementById('nav'); if (!el) return;
  const here = location.pathname.split('/').pop() || 'panel.html';
  el.innerHTML = items.map(([h, t]) => `<a href="${h}"${h.endsWith('/' + here) ? ' class="cur"' : ''}>${t.replace('&', '&amp;')}</a>`).join('');
  const hd = el.closest('header'), h1 = hd && hd.querySelector('h1');
  if (h1) h1.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="abg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color:var(--accent2)"/><stop offset="1" style="stop-color:var(--accent)"/></linearGradient></defs>' +
    '<rect x=".5" y=".5" width="31" height="31" rx="9" style="fill:var(--panel);stroke:var(--line2)"/><path d="M6 25C10 23 12 18 16 16" fill="none" stroke="url(#abg)" stroke-width="3" stroke-linecap="round" opacity=".55"/>' +
    '<circle cx="19" cy="14" r="6.5" fill="none" stroke="url(#abg)" stroke-width="2"/><circle cx="19" cy="14" r="2" style="fill:var(--accent)"/></svg><span>AimTrail</span>';
  if (!hd || !window.AimUI) return;
  const ic = { auto: '<circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11" /><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor"/>',
    light: '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
    dark: '<path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"/>' };
  const names = { auto: 'Otomatis (ikut sistem)', light: 'Terang', dark: 'Gelap' };
  const box = document.createElement('div'); box.className = 'tmode'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Mode tampilan');
  box.innerHTML = Object.keys(ic).map(m => `<button type="button" data-m="${m}" title="${names[m]}" aria-label="${names[m]}"><svg viewBox="0 0 16 16">${ic[m]}</svg></button>`).join('');
  const sync = () => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === AimUI.get())));
  box.onclick = e => { const b = e.target.closest('button'); if (b) { AimUI.set(b.dataset.m); sync(); } };
  document.addEventListener('aimui', sync); sync(); hd.appendChild(box);
})();
