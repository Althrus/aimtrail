const chromium = require('@sparticuz/chromium').default || require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core'); const B = 'http://127.0.0.1:8901'; const wait = ms => new Promise(r => setTimeout(r, ms));
const PAGES = [['overlay.html', 900, 500], ['keys.html', 900, 500], ['metrics.html', 900, 300], ['pad.html', 700, 450], ['dir.html', 700, 500],
  ['panel.html', 1400, 900], ['keys-panel.html', 1400, 900], ['metrics-panel.html', 1400, 900], ['pad-panel.html', 1400, 900], ['dir-panel.html', 1400, 900],
  ['tema.html', 1400, 900], ['manual.html', 1000, 700], ['manual.en.html', 1000, 700]];
(async () => {
  const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox'], executablePath: await chromium.executablePath(), headless: 'shell' });
  let bad = 0;
  for (const [name, w, h] of PAGES) {
    const p = await browser.newPage(); await p.setViewport({ width: w, height: h }); const errs = [];
    p.on('pageerror', e => errs.push('JS: ' + e.message)); p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
    await p.goto(`${B}/${name}`, { waitUntil: 'load' }); await wait(1800);
    const info = await p.evaluate(() => ({ nav: document.querySelectorAll('#nav a, nav a').length, groups: document.querySelectorAll('#controls details').length, title: document.title.slice(0, 40) }));
    const good = errs.length === 0; if (!good) bad++;
    console.log((good ? '  OK   ' : '  GAGAL'), name.padEnd(20), `nav=${info.nav} kontrol=${info.groups}`, errs.slice(0, 2).join(' | '));
    await p.close();
  }
  console.log(bad === 0 ? 'SEMUA HALAMAN BERSIH' : bad + ' halaman bermasalah'); await browser.close();
})().catch(e => { console.error('ERR', e.message.slice(0, 300)); process.exit(1); });
