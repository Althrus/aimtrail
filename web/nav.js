/*! Navigasi bersama untuk semua halaman panel */
(function () {
  const items = [['/panel.html', 'Ekor mouse'], ['/keys-panel.html', 'Keyboard & mouse'], ['/metrics-panel.html', 'Metrik'],
    ['/pad-panel.html', 'Controller'], ['/tema.html', 'Tema'], ['/manual.html', 'Panduan']];
  const el = document.getElementById('nav'); if (!el) return;
  const here = location.pathname.split('/').pop() || 'panel.html';
  el.innerHTML = items.map(([h, t]) => `<a href="${h}"${h.endsWith('/' + here) ? ' class="cur"' : ''}>${t.replace('&', '&amp;')}</a>`).join('');
})();
