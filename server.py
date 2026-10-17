#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AimTrail server
- Membaca gerakan mouse MENTAH (Windows Raw Input), jadi tetap terbaca di game FPS
  yang mengunci/menyembunyikan kursor, dan di jendela mana pun (INPUTSINK).
- Mengirim delta mouse + status tombol lewat WebSocket ke overlay (browser source).
- Menyajikan overlay (/overlay.html) dan panel kontrol (/panel.html).
"""
import argparse
import asyncio
import json
import math
import os
import random
import socket
import struct
import sys
import threading
import time
import webbrowser
from urllib.parse import urlparse
from collections import deque
from pathlib import Path

from aiohttp import web, WSMsgType

import updater

VERSION = "1.4.3"
CREDIT = "Created by Andromache | TikTok @andromache.4k"
BASE = Path(__file__).resolve().parent
# file web: di dalam paket PyInstaller (_MEIPASS) bila dibekukan, selain itu di samping server.py
WEB = Path(getattr(sys, "_MEIPASS", BASE)) / "web"
DATA = BASE            # lokasi config.json / keys.json (diubah lewat configure())
CONFIG = DATA / "config.json"
KCONFIG = DATA / "keys.json"
IS_WIN = sys.platform == "win32"


def configure(data_dir=None):
    """Tentukan folder penyimpanan pengaturan (mis. %APPDATA%\\AimTrail untuk versi .exe)."""
    global DATA, CONFIG, KCONFIG
    if data_dir:
        DATA = Path(data_dir)
        DATA.mkdir(parents=True, exist_ok=True)
    CONFIG, KCONFIG = DATA / "config.json", DATA / "keys.json"

# Hanya tombol yang ditampilkan di overlay yang diteruskan (bukan keylogger). Default = 21 tombol FPS.
DEFAULT_WATCH = {0x31, 0x32, 0x33, 0x34, 0x51, 0x57, 0x41, 0x53, 0x44, 0x45, 0x43, 0x5A,
                 0x10, 0x09, 0x52, 0x46, 0x56, 0x47, 0x11, 0x12, 0x20}
SUBS = {"keys": {"k", "b", "w"}, "trail": {"m", "b"}}  # jenis event yang dikirim per halaman


# --------------------------------------------------------------------------- hub
class Hub:
    """Penampung input dari thread Raw Input -> dikuras oleh loop asyncio."""

    def __init__(self):
        self.lock = threading.Lock()
        self.dx = 0
        self.dy = 0
        self.mask = 0  # bit: 1=kiri 2=kanan 4=tengah 8=mouse4 16=mouse5
        self.events = deque()
        self.last = time.perf_counter()
        self.keys = set()               # tombol keyboard yang sedang ditekan (VK)
        self.watch = set(DEFAULT_WATCH)  # VK yang boleh diteruskan
        self._idle = False
        self._wake = None

    # --- mode hemat: loop pengirim tidur saat tak ada input, dibangunkan oleh input pertama
    def set_wake(self, cb):
        self._wake = cb

    def _poke(self):  # lock sudah dipegang
        if self._idle:
            self._idle = False
            cb = self._wake
            if cb:
                cb()

    def try_idle(self):
        with self.lock:
            if self.dx or self.dy or self.events:
                return False
            self._idle = True
            return True

    def move(self, dx, dy):
        with self.lock:
            self.dx += dx
            self.dy += dy
            self._poke()

    def _flush_move(self, now):  # lock sudah dipegang
        if self.dx or self.dy:
            d = round(min((now - self.last) * 1000.0, 50.0), 2)
            self.events.append({"t": "m", "dx": self.dx, "dy": self.dy, "d": d})
            self.dx = self.dy = 0
        self.last = now

    def set_mask(self, mask):
        with self.lock:
            if mask == self.mask:
                return
            self._flush_move(time.perf_counter())  # gerakan sebelum klik tetap sebelum klik
            self.mask = mask
            self.events.append({"t": "b", "b": mask})
            self._poke()

    def key(self, vk, down):
        with self.lock:
            if vk not in self.watch:
                return
            if down:
                if vk in self.keys:
                    return
                self.keys.add(vk)
            else:
                if vk not in self.keys:
                    return
                self.keys.discard(vk)
            self.events.append({"t": "k", "k": vk, "d": 1 if down else 0})
            self._poke()

    def wheel(self, v):
        with self.lock:
            self.events.append({"t": "w", "v": v})
            self._poke()

    def set_watch(self, vks):
        with self.lock:
            self.watch = set(vks)
            self.keys &= self.watch

    def drain(self):
        with self.lock:
            self._flush_move(time.perf_counter())
            out = list(self.events)
            self.events.clear()
        return out


HUB = Hub()  # satu hub untuk seluruh proses: tetap hidup saat server web di-restart


# --------------------------------------------------------------- Windows Raw Input
BTN = {
    0x0001: (1, True), 0x0002: (1, False),
    0x0004: (2, True), 0x0008: (2, False),
    0x0010: (4, True), 0x0020: (4, False),
    0x0040: (8, True), 0x0080: (8, False),
    0x0100: (16, True), 0x0200: (16, False),
}


class RawMouse(threading.Thread):
    def __init__(self, hub):
        super().__init__(daemon=True, name="rawinput")
        self.hub = hub
        self.ready = threading.Event()
        self.error = None

    def run(self):
        try:
            self._run()
        except Exception as e:  # noqa
            self.error = e
            self.ready.set()

    def _run(self):
        import ctypes
        from ctypes import wintypes as wt

        user32 = ctypes.WinDLL("user32", use_last_error=True)
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        LRESULT = ctypes.c_ssize_t
        WNDPROC = ctypes.WINFUNCTYPE(LRESULT, wt.HWND, wt.UINT, wt.WPARAM, wt.LPARAM)

        class WNDCLASSW(ctypes.Structure):
            _fields_ = [
                ("style", wt.UINT), ("lpfnWndProc", WNDPROC),
                ("cbClsExtra", ctypes.c_int), ("cbWndExtra", ctypes.c_int),
                ("hInstance", wt.HINSTANCE), ("hIcon", wt.HANDLE),
                ("hCursor", wt.HANDLE), ("hbrBackground", wt.HANDLE),
                ("lpszMenuName", wt.LPCWSTR), ("lpszClassName", wt.LPCWSTR),
            ]

        class RAWINPUTDEVICE(ctypes.Structure):
            _fields_ = [("usUsagePage", ctypes.c_ushort), ("usUsage", ctypes.c_ushort),
                        ("dwFlags", wt.DWORD), ("hwndTarget", wt.HWND)]

        class RAWINPUTHEADER(ctypes.Structure):
            _fields_ = [("dwType", wt.DWORD), ("dwSize", wt.DWORD),
                        ("hDevice", wt.HANDLE), ("wParam", wt.WPARAM)]

        user32.DefWindowProcW.argtypes = [wt.HWND, wt.UINT, wt.WPARAM, wt.LPARAM]
        user32.DefWindowProcW.restype = LRESULT
        user32.RegisterClassW.argtypes = [ctypes.POINTER(WNDCLASSW)]
        user32.RegisterClassW.restype = wt.ATOM
        user32.CreateWindowExW.argtypes = [wt.DWORD, wt.LPCWSTR, wt.LPCWSTR, wt.DWORD,
                                           ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
                                           wt.HWND, wt.HANDLE, wt.HINSTANCE, wt.LPVOID]
        user32.CreateWindowExW.restype = wt.HWND
        user32.GetMessageW.argtypes = [ctypes.POINTER(wt.MSG), wt.HWND, wt.UINT, wt.UINT]
        user32.GetMessageW.restype = ctypes.c_int
        user32.TranslateMessage.argtypes = [ctypes.POINTER(wt.MSG)]
        user32.DispatchMessageW.argtypes = [ctypes.POINTER(wt.MSG)]
        user32.DispatchMessageW.restype = LRESULT
        user32.RegisterRawInputDevices.argtypes = [ctypes.POINTER(RAWINPUTDEVICE), wt.UINT, wt.UINT]
        user32.RegisterRawInputDevices.restype = wt.BOOL
        user32.GetRawInputData.argtypes = [wt.LPARAM, wt.UINT, ctypes.c_void_p,
                                           ctypes.POINTER(wt.UINT), wt.UINT]
        user32.GetRawInputData.restype = wt.UINT
        kernel32.GetModuleHandleW.argtypes = [wt.LPCWSTR]
        kernel32.GetModuleHandleW.restype = wt.HINSTANCE

        WM_INPUT, RID_INPUT, RIM_TYPEMOUSE, RIDEV_INPUTSINK = 0x00FF, 0x10000003, 0, 0x00000100
        RIM_TYPEKEYBOARD = 1
        phys = set()  # tombol fisik yang sedang ditekan: (vk, makecode, e0) -> bedakan Shift/Ctrl/Alt kiri-kanan
        HDR = ctypes.sizeof(RAWINPUTHEADER)
        MOUSE = struct.Struct("<HxxHHIii")  # usFlags, usButtonFlags, usButtonData, ulRawButtons, lLastX, lLastY
        KBD = struct.Struct("<HHHH")        # MakeCode, Flags, Reserved, VKey
        buf = ctypes.create_string_buffer(256)
        hub = self.hub

        def wndproc(hwnd, msg, wparam, lparam):
            if msg == WM_INPUT:
                size = wt.UINT(len(buf))
                if user32.GetRawInputData(lparam, RID_INPUT, buf, ctypes.byref(size), HDR) != 0xFFFFFFFF:
                    typ = struct.unpack_from("<I", buf, 0)[0]
                    if typ == RIM_TYPEMOUSE:
                        mflags, bf, bdata, _raw, lx, ly = MOUSE.unpack_from(buf, HDR)
                        if not (mflags & 0x01) and (lx or ly):  # relatif saja
                            hub.move(lx, ly)
                        if bf:
                            mask = hub.mask
                            for flag, (bit, down) in BTN.items():
                                if bf & flag:
                                    mask = (mask | bit) if down else (mask & ~bit)
                            hub.set_mask(mask)
                            if bf & 0x0400:  # roda scroll
                                delta = bdata - 65536 if bdata > 32767 else bdata
                                if delta:
                                    hub.wheel(1 if delta > 0 else -1)
                    elif typ == RIM_TYPEKEYBOARD:
                        make, kflags, _res, vk = KBD.unpack_from(buf, HDR)
                        if 0 < vk < 255:
                            pk = (vk, make, kflags & 2)
                            if kflags & 1:
                                phys.discard(pk)
                            else:
                                phys.add(pk)
                            hub.key(vk, any(q[0] == vk for q in phys))
            return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

        self._proc = WNDPROC(wndproc)  # jaga referensi supaya tidak di-GC
        hinst = kernel32.GetModuleHandleW(None)
        wc = WNDCLASSW()
        wc.lpfnWndProc = self._proc
        wc.hInstance = hinst
        wc.lpszClassName = "AimTrailRawInput"
        if not user32.RegisterClassW(ctypes.byref(wc)):
            raise ctypes.WinError(ctypes.get_last_error())
        hwnd = user32.CreateWindowExW(0, wc.lpszClassName, "AimTrail", 0, 0, 0, 0, 0,
                                      None, None, hinst, None)
        if not hwnd:
            raise ctypes.WinError(ctypes.get_last_error())
        devs = (RAWINPUTDEVICE * 2)(RAWINPUTDEVICE(0x01, 0x02, RIDEV_INPUTSINK, hwnd),   # mouse
                                    RAWINPUTDEVICE(0x01, 0x06, RIDEV_INPUTSINK, hwnd))   # keyboard
        if not user32.RegisterRawInputDevices(devs, 2, ctypes.sizeof(RAWINPUTDEVICE)):
            raise ctypes.WinError(ctypes.get_last_error())
        self.ready.set()

        msg = wt.MSG()
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))


# ----------------------------------------------------------------------- simulasi
async def simulate(hub):
    """Mode demo (tanpa mouse asli): menekan klik kiri & menggerakkan mouse secara acak."""
    while True:
        await asyncio.sleep(random.uniform(1.2, 2.2))
        hub.set_mask(1)
        dur, seed, t0 = random.uniform(1.2, 2.6), random.random() * 10, time.perf_counter()
        while True:
            el = time.perf_counter() - t0
            if el > dur:
                break
            vx = 14 * math.cos(el * 3.1 + seed) + 5 * math.sin(el * 9)
            vy = 10 * math.sin(el * 2.3 + seed) - 2
            hub.move(round(vx * 0.15), round(vy * 0.15))
            await asyncio.sleep(0.004)
        hub.set_mask(0)


async def simulate_keys(hub):
    """Demo keyboard/scroll tanpa keyboard asli."""
    while True:
        await asyncio.sleep(random.uniform(0.15, 0.5))
        pool = list(hub.watch)
        if not pool:
            continue
        vk = random.choice(pool)
        hub.key(vk, True)
        await asyncio.sleep(random.uniform(0.08, 0.5))
        hub.key(vk, False)
        if random.random() < 0.3:
            hub.wheel(random.choice((-1, 1)))


# ------------------------------------------------------------------------- server
def _load(path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _save(path, cfg):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def watch_from(kcfg):
    w = kcfg.get("watch") if isinstance(kcfg, dict) else None
    if isinstance(w, list):
        return {v for v in w[:300] if isinstance(v, int) and not isinstance(v, bool) and 0 < v < 255}
    return set(DEFAULT_WATCH)


def build_id():
    """Berubah jika file web diperbarui -> halaman lama (mis. di OBS) memuat ulang dirinya sendiri."""
    try:
        return str(int(max(p.stat().st_mtime for p in WEB.iterdir() if p.is_file())))
    except (OSError, ValueError):
        return "0"


async def _send(app, ws, text):
    try:
        await ws.send_str(text)
    except Exception:  # noqa
        app["clients"].pop(ws, None)


async def broadcast(app, text, skip=None):
    targets = [w for w in list(app["clients"]) if w is not skip and not w.closed]
    if targets:
        await asyncio.gather(*(_send(app, w, text) for w in targets))


def peers(app):
    """Jumlah overlay (Browser Source) yang terhubung, per jenis. Dipakai agar watermark tidak ganda."""
    n = {"trail": 0, "keys": 0}
    for sub, role in app["clients"].values():
        if role == "overlay" and sub in n:
            n[sub] += 1
    return n


async def announce_peers(app):
    await broadcast(app, json.dumps({"t": "peers", **peers(app)}))


async def send_events(app, events):
    groups = {}
    for ws, (sub, _role) in list(app["clients"].items()):
        if not ws.closed:
            groups.setdefault(sub, []).append(ws)
    for sub, wss in groups.items():
        allowed = SUBS.get(sub)
        evs = events if allowed is None else [e for e in events if e["t"] in allowed]
        if evs:
            text = json.dumps(evs, separators=(",", ":"))
            await asyncio.gather(*(_send(app, w, text) for w in wss))


async def ws_handler(request):
    app = request.app
    hub = app["hub"]
    ws = web.WebSocketResponse(heartbeat=20, max_msg_size=64 * 1024)
    await ws.prepare(request)
    app["clients"][ws] = (request.query.get("sub", "all"), request.query.get("role", ""))
    with hub.lock:
        keys, mask = sorted(hub.keys), hub.mask
    await ws.send_str(json.dumps({"t": "hello", "config": app["config"], "kconfig": app["kconfig"],
                                  "src": app["src"], "build": build_id(), "keys": keys, "mask": mask,
                                  "peers": peers(app)}))
    await announce_peers(app)
    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue
            try:
                data = json.loads(msg.data)
            except ValueError:
                continue
            if not isinstance(data, dict) or not isinstance(data.get("config"), dict):
                continue
            kind, cfg = data.get("t"), data["config"]
            try:
                if kind == "config":
                    app["config"] = cfg
                    _save(CONFIG, cfg)
                    await broadcast(app, json.dumps({"t": "config", "config": cfg}), skip=ws)
                elif kind == "kconfig":
                    app["kconfig"] = cfg
                    hub.set_watch(watch_from(cfg))
                    _save(KCONFIG, cfg)
                    await broadcast(app, json.dumps({"t": "kconfig", "config": cfg}), skip=ws)
            except OSError as e:
                print("Gagal menyimpan pengaturan:", e)
    finally:
        app["clients"].pop(ws, None)
        await announce_peers(app)
    return ws


@web.middleware
async def no_cache(request, handler):
    resp = await handler(request)
    resp.headers["Cache-Control"] = "no-store"
    return resp


async def flusher(app):
    """Kirim event ke klien. Tidak ada klien / tidak ada input -> tidur (CPU ~0)."""
    hub, interval = app["hub"], 1.0 / app["rate"]
    wake = asyncio.Event()
    loop = asyncio.get_running_loop()

    def poke():
        try:
            loop.call_soon_threadsafe(wake.set)
        except RuntimeError:  # loop sudah ditutup
            pass

    hub.set_wake(poke)
    quiet = 0
    while True:
        if not app["clients"]:
            hub.drain()                     # tak ada yang mendengarkan
            await asyncio.sleep(0.25)
            continue
        events = hub.drain()
        if events:
            quiet = 0
            await send_events(app, events)
            await asyncio.sleep(interval)
            continue
        quiet += 1
        if quiet < 25:                      # ~100 ms hening dulu sebelum tidur
            await asyncio.sleep(interval)
        elif hub.try_idle():
            wake.clear()
            try:
                await asyncio.wait_for(wake.wait(), 2.0)   # bangun karena input (atau cek berkala)
            except asyncio.TimeoutError:
                pass


async def background(app):
    tasks = [asyncio.create_task(flusher(app))]
    if app["src"] == "simulate":
        tasks.append(asyncio.create_task(simulate(app["hub"])))
        tasks.append(asyncio.create_task(simulate_keys(app["hub"])))
    yield
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


# ---- File pemuat untuk OBS ("Local file"): selalu bisa dibuka OBS, lalu memuat overlay dari server dan
# mencoba lagi otomatis. Jadi urutan menyalakan OBS / AimTrail tidak lagi berpengaruh.
LOADER_HTML = r"""<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>AimTrail - {{TITLE}}</title>
<style>html,body{margin:0;height:100%;overflow:hidden;background:transparent}
iframe{position:absolute;left:0;top:0;width:100%;height:100%;border:0;background:transparent;display:none}</style></head>
<body><iframe id="f" allowtransparency="true"></iframe>
<script src="endpoint.js"></script>
<script>
/* Pemuat AimTrail: di OBS pakai Browser Source dengan "Local file" yang menunjuk ke file ini.
   Overlay dimuat dari AimTrail dan dicoba lagi otomatis bila AimTrail belum/sedang tidak berjalan. */
(function () {
  var T = window.AIMTRAIL_TIMING || { check: 1500, stale: 7000, retry: 5000 };
  var cfg = window.AIMTRAIL || { host: 'localhost', port: 8765 };
  var url = 'http://' + cfg.host + ':' + cfg.port + '/{{PAGE}}';
  var f = document.getElementById('f'), lastBeat = 0, lastLoad = 0;
  function load() { lastLoad = Date.now(); f.src = url + '?_=' + lastLoad; }
  window.addEventListener('message', function (e) {
    if (e.source === f.contentWindow && e.data && e.data.aimtrail === 'hb') { lastBeat = Date.now(); f.style.display = 'block'; }
  });
  setInterval(function () {
    var now = Date.now();
    if (now - lastBeat > T.stale) { f.style.display = 'none'; if (now - lastLoad > T.retry) load(); }
  }, T.check);
  load();
})();
</script></body></html>
"""
LOADERS = [("AimTrail-Ekor-Mouse.html", "overlay.html", "Ekor Mouse"),
           ("AimTrail-Keyboard-Mouse.html", "keys.html", "Keyboard dan Mouse")]


def obs_dir():
    return DATA / "obs"


def write_loaders(port=8765, host="localhost"):
    """Tulis file pemuat + endpoint.js (port aktif) ke <folder pengaturan>/obs. Dipanggil tiap server mulai."""
    d = obs_dir()
    try:
        d.mkdir(parents=True, exist_ok=True)
        (d / "endpoint.js").write_text("window.AIMTRAIL = " + json.dumps({"host": host, "port": port}) + ";\n", encoding="utf-8")
        for name, page, title in LOADERS:
            html = LOADER_HTML.replace("{{PAGE}}", page).replace("{{TITLE}}", title)
            p = d / name
            if not p.exists() or p.read_text(encoding="utf-8") != html:
                p.write_text(html, encoding="utf-8")
    except OSError as e:
        print("Gagal menulis file pemuat OBS:", e)
    return d


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "IP-PC-INI"


_RAW = None


def start_input(simulate=False):
    """Mulai pembacaan input (sekali per proses). Mengembalikan 'rawinput' atau 'simulate'."""
    global _RAW
    if simulate:
        return "simulate"
    if not IS_WIN:
        print("! Raw Input hanya tersedia di Windows -> memakai mode simulasi (demo).")
        return "simulate"
    if _RAW is None:
        try:
            import ctypes
            ctypes.windll.winmm.timeBeginPeriod(1)  # timer 1 ms agar pengiriman halus
        except Exception:  # noqa
            pass
        raw = RawMouse(HUB)
        raw.start()
        raw.ready.wait(3)
        if raw.error:
            print("! Gagal memulai Raw Input:", raw.error, "-> memakai mode simulasi.")
            return "simulate"
        _RAW = raw
    return "rawinput"


async def patch_config(app, patch):
    cfg = dict(app["config"])
    cfg.update(patch)
    app["config"] = cfg
    try:
        _save(CONFIG, cfg)
    except OSError as e:
        print("Gagal menyimpan pengaturan:", e)
    await broadcast(app, json.dumps({"t": "config", "config": cfg}))
    return cfg


async def api_always(request):
    """/api/always?on=1|0|toggle -> nyalakan/matikan ekor mouse selalu aktif (mis. untuk Stream Deck)."""
    app = request.app
    cur = bool(app["config"].get("alwaysOn"))
    q = request.query.get("on", "toggle").lower()
    new = (not cur) if q == "toggle" else q in ("1", "true", "on", "yes")
    if new != cur:
        await patch_config(app, {"alwaysOn": new})
    return web.json_response({"alwaysOn": new})


async def status(request):
    app = request.app
    return web.json_response({"app": "AimTrail", "version": VERSION, "src": app["src"],
                              "clients": len(app["clients"]), "rate": app["rate"], "build": build_id(),
                              "update": updater.public_state(),
                              "obs": {"dir": str(obs_dir()), "trail": str(obs_dir() / LOADERS[0][0]),
                                      "keys": str(obs_dir() / LOADERS[1][0])}})


def same_origin(request):
    o = request.headers.get("Origin")
    return not o or urlparse(o).netloc == request.host


async def api_update_install(request):
    """Dipanggil tombol "Pasang" di panel. Hanya dari halaman AimTrail sendiri (cek Origin)."""
    if not same_origin(request):
        return web.json_response({"error": "origin tidak diizinkan"}, status=403)
    hook = updater.HOOKS.get("install")
    if not hook:
        return web.json_response({"error": "pemasangan otomatis hanya tersedia di aplikasi tray"}, status=501)
    threading.Thread(target=hook, daemon=True).start()
    return web.json_response({"ok": True}, status=202)


def make_app(src, rate):
    app = web.Application(middlewares=[no_cache])
    app["hub"], app["src"], app["rate"] = HUB, src, max(30, min(rate, 1000))
    app["config"], app["kconfig"], app["clients"] = _load(CONFIG), _load(KCONFIG), {}
    HUB.set_watch(watch_from(app["kconfig"]))
    app.cleanup_ctx.append(background)
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/api/status", status)
    app.router.add_get("/api/always", api_always)
    app.router.add_post("/api/update/install", api_update_install)

    async def index(_):
        raise web.HTTPFound("/panel.html")

    app.router.add_get("/", index)
    app.router.add_static("/", WEB, show_index=False)
    return app


class Server:
    """Server web + WebSocket di thread sendiri (bisa dihentikan & dijalankan ulang oleh aplikasi tray)."""

    def __init__(self, host="127.0.0.1", port=8765, rate=250, src="simulate"):
        self.host, self.port, self.rate, self.src = host, port, rate, src
        self.loop = self.thread = self._runner = self.app = None
        self.ready = threading.Event()
        self.error = None

    def start(self):
        self.thread = threading.Thread(target=self._run, daemon=True, name="aimtrail-server")
        self.thread.start()
        self.ready.wait(10)
        return self.error is None and self.ready.is_set()

    def _run(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_until_complete(self._serve())
        except Exception as e:  # noqa  (mis. port sudah dipakai)
            self.error = e
            self.ready.set()
            self.loop.close()
            return
        self.ready.set()
        try:
            self.loop.run_forever()
        finally:
            try:
                self.loop.run_until_complete(self._runner.cleanup())
            except Exception:  # noqa
                pass
            self.loop.close()

    async def _serve(self):
        write_loaders(self.port)
        self.app = make_app(self.src, self.rate)
        self._runner = web.AppRunner(self.app, access_log=None)
        await self._runner.setup()
        await web.TCPSite(self._runner, self.host, self.port).start()

    # --- dipakai aplikasi tray (thread lain): baca / ubah pengaturan ekor mouse dan siarkan ke semua overlay
    def get_config(self):
        return dict(self.app["config"]) if self.app else {}

    def update_config(self, patch, timeout=3):
        fut = asyncio.run_coroutine_threadsafe(patch_config(self.app, patch), self.loop)
        return fut.result(timeout)

    def stop(self):
        if self.loop and self.loop.is_running():
            self.loop.call_soon_threadsafe(self.loop.stop)
        if self.thread:
            self.thread.join(5)


def banner(host, port, src):
    local = f"http://localhost:{port}"
    print("=" * 62)
    print(f" AimTrail {VERSION} berjalan   (sumber input:", "Raw Input" if src == "rawinput" else "SIMULASI", ")")
    print(f"  Panel kontrol : {local}/panel.html")
    print(f"  URL overlay   : {local}/overlay.html   <- ekor mouse (OBS)")
    print(f"  Keyboard+mouse: {local}/keys.html   (panel: {local}/keys-panel.html)")
    if host in ("0.0.0.0", "::"):
        print(f"  Dari PC lain  : http://{lan_ip()}:{port}/overlay.html")
    print(f"  {CREDIT}")
    print("  Tekan Ctrl+C untuk berhenti.")
    print("=" * 62)


def run_console(host, port, rate, simulate, open_browser):
    src = start_input(simulate)
    srv = Server(host, port, rate, src)
    if not srv.start():
        print(f"! Gagal menjalankan server di port {port}: {srv.error}")
        return 1
    banner(host, port, src)
    if open_browser:
        threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{port}/panel.html")).start()
    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    srv.stop()
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="AimTrail - overlay jejak mouse untuk OBS (mode konsol)")
    ap.add_argument("--host", default="127.0.0.1", help="0.0.0.0 agar bisa diakses PC lain (PC stream)")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--rate", type=int, default=250, help="frekuensi kirim data (Hz), default 250")
    ap.add_argument("--simulate", action="store_true", help="mode demo tanpa mouse asli")
    ap.add_argument("--no-browser", action="store_true", help="jangan buka panel otomatis")
    ap.add_argument("--data-dir", help="folder penyimpanan config.json & keys.json")
    args = ap.parse_args(argv)
    configure(args.data_dir)
    return run_console(args.host, args.port, args.rate, args.simulate, not args.no_browser)


if __name__ == "__main__":
    sys.exit(main())
