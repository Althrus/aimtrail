Skrip uji (dipakai di sandbox Claude; path /tmp/rt dan /home/claude/aimtrail tertanam).
Butuh: pip install aiohttp pystray pillow reportlab pypdf ; npm i @sparticuz/chromium puppeteer-core jsdom (di /tmp/rt)
  t25.js  mesin gerak overlay Arah (node t25.js)
  t24.py  skrip pembantu pembaruan + alur install (python3 t24.py)
  t26.py  uji overlay Arah di browser sungguhan (menjalankan t26.js)
  smoke.js  uji asap semua halaman (butuh server: python3 server.py --simulate --no-browser --port 8901 --data-dir /tmp/smokedata)
