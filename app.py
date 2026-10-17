#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AimTrail — aplikasi dengan ikon di system tray (Windows).

  python app.py                 # mode tray (jendela konsol tidak diperlukan pada versi .exe)
  python app.py --minimized     # tanpa membuka panel (dipakai saat jalan otomatis)
  python app.py --no-tray       # mode konsol (juga dipakai otomatis di non-Windows)
Opsi lain: --port, --lan, --rate, --simulate, --data-dir
"""
import argparse
import json
import os
import re
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

import server as S
import updater

APP = "AimTrail"
FROZEN = getattr(sys, "frozen", False)
IS_WIN = sys.platform == "win32"
DEFAULTS = {"port": 8765, "lan": False, "rate": 250,
            "update_repo": updater.DEFAULT_REPO, "auto_check": True, "auto_download": False}
RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"


# ------------------------------------------------------------------ lokasi & pencatatan
def default_data_dir():
    if FROZEN:
        base = os.environ.get("APPDATA") or str(Path.home())
        return Path(base) / APP
    return S.BASE  # mode pengembangan: pengaturan tetap di folder proyek


def setup_logging(data):
    """Versi .exe tanpa konsol: arahkan print/error ke aimtrail.log."""
    if not (FROZEN or sys.stdout is None):
        return
    data.mkdir(parents=True, exist_ok=True)
    log = data / "aimtrail.log"
    try:
        if log.exists() and log.stat().st_size > 1_000_000:
            log.unlink()
        f = open(log, "a", buffering=1, encoding="utf-8")
        sys.stdout = sys.stderr = f
        print(f"\n--- {time.strftime('%Y-%m-%d %H:%M:%S')}  {APP} {S.VERSION} ---")
    except OSError:
        pass


def load_settings(data):
    try:
        cfg = json.loads((data / "settings.json").read_text(encoding="utf-8"))
        s = {**DEFAULTS, **{k: cfg[k] for k in DEFAULTS if k in cfg}}
        if not (isinstance(s["update_repo"], str) and re.fullmatch(r"[\w.-]+/[\w.-]+", s["update_repo"])):
            s["update_repo"] = DEFAULTS["update_repo"]
        return s
    except (OSError, ValueError):
        return dict(DEFAULTS)


def save_settings(data, s):
    try:
        (data / "settings.json").write_text(json.dumps(s, indent=2), encoding="utf-8")
    except OSError as e:
        print("Gagal menyimpan settings.json:", e)


# ------------------------------------------------------------------------- Windows util
def message_box(text, title=APP, error=False):
    if IS_WIN:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, text, title, 0x10 if error else 0x40)
    else:
        print(f"[{title}] {text}")


def wait_pid(pid, timeout=20):
    """Tunggu proses lama selesai (dipakai setelah pembaruan, sebelum mutex satu-instance dicek)."""
    if not IS_WIN:
        time.sleep(1)
        return
    import ctypes
    k32 = ctypes.windll.kernel32
    k32.OpenProcess.restype = ctypes.c_void_p
    h = k32.OpenProcess(0x00100000, False, int(pid))   # SYNCHRONIZE
    if h:
        k32.WaitForSingleObject(ctypes.c_void_p(h), int(timeout * 1000))
        k32.CloseHandle(ctypes.c_void_p(h))


_mutex = None


def already_running():
    """True jika AimTrail lain sudah berjalan (mutex bernama)."""
    global _mutex
    if not IS_WIN:
        return False
    import ctypes
    k32 = ctypes.windll.kernel32
    k32.CreateMutexW.restype = ctypes.c_void_p
    _mutex = k32.CreateMutexW(None, False, "Local\\AimTrail.Singleton")
    return k32.GetLastError() == 183  # ERROR_ALREADY_EXISTS


def autostart_command():
    if FROZEN:
        return f'"{sys.executable}" --minimized'
    pyw = Path(sys.executable).with_name("pythonw.exe")
    exe = pyw if pyw.exists() else Path(sys.executable)
    return f'"{exe}" "{Path(__file__).resolve()}" --minimized'


def autostart_enabled():
    if not IS_WIN:
        return False
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY) as k:
            winreg.QueryValueEx(k, APP)
            return True
    except OSError:
        return False


def set_autostart(on):
    import winreg
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_SET_VALUE) as k:
        if on:
            winreg.SetValueEx(k, APP, 0, winreg.REG_SZ, autostart_command())
        else:
            try:
                winreg.DeleteValue(k, APP)
            except FileNotFoundError:
                pass


def copy_text(text):
    if IS_WIN:
        subprocess.run(["clip"], input=text.encode("ascii", "ignore"), creationflags=0x08000000, check=False)


# ----------------------------------------------------------------------------- tray app
class TrayApp:
    def __init__(self, args, data):
        self.args, self.data = args, data
        self.first_run = not (data / "settings.json").exists()
        self.s = load_settings(data)
        if args.port:
            self.s["port"] = args.port
        if args.lan:
            self.s["lan"] = True
        if args.rate:
            self.s["rate"] = args.rate
        self.srv = None
        self.src = "simulate"
        self.icon = None
        self.error = None
        self._upd_lock = threading.Lock()

    # --- server
    @property
    def host(self):
        return "0.0.0.0" if self.s["lan"] else "127.0.0.1"

    def url(self, page, lan=False):
        return f"http://{S.lan_ip() if lan else 'localhost'}:{self.s['port']}/{page}"

    def start_server(self):
        srv = S.Server(self.host, self.s["port"], self.s["rate"], self.src)
        if srv.start():
            self.srv = srv
            return True
        print("Gagal memulai server:", srv.error)
        self.error = srv.error
        return False

    def restart_server(self):
        if self.srv:
            self.srv.stop()
        ok = self.start_server()
        self.refresh()
        return ok

    # --- tray
    def tooltip(self):
        mode = "Raw Input" if self.src == "rawinput" else "simulasi"
        return f"{APP} — port {self.s['port']} · {mode}"

    def refresh(self):
        if self.icon:
            self.icon.title = self.tooltip()
            self.icon.update_menu()

    def notify(self, text):
        try:
            self.icon.notify(text, APP)
        except Exception:  # noqa
            pass

    def menu(self):
        import pystray
        M, I = pystray.Menu, pystray.MenuItem
        return M(
            I("Buka panel ekor mouse", self.open_trail, default=True),
            I("Buka panel keyboard + mouse", self.open_keys),
            I("Buka panduan (manual)", self.open_manual),
            M.SEPARATOR,
            I("Ekor mouse selalu aktif (tanpa klik)", self.toggle_always, checked=lambda i: self.always_on()),
            M.SEPARATOR,
            I("Salin URL overlay ekor mouse", self.copy_trail),
            I("Salin URL overlay keyboard + mouse", self.copy_keys),
            I("File OBS anti-putus", M(
                I("Salin lokasi file: ekor mouse", self.copy_file_trail),
                I("Salin lokasi file: keyboard + mouse", self.copy_file_keys),
                I("Buka folder file OBS", self.open_obs_folder),
            )),
            M.SEPARATOR,
            I("Jalan otomatis saat Windows menyala", self.toggle_autostart, checked=lambda i: autostart_enabled()),
            I("Izinkan akses dari PC lain (LAN)", self.toggle_lan, checked=lambda i: self.s["lan"]),
            I(self.update_title, self.update_menu()),
            I("Buka folder pengaturan", self.open_folder),
            I("Tentang", self.about),
            M.SEPARATOR,
            I("Keluar", self.quit),
        )

    # --- aksi menu (signature pystray: icon, item)
    def open_trail(self, icon=None, item=None):
        webbrowser.open(self.url("panel.html"))

    def open_keys(self, icon=None, item=None):
        webbrowser.open(self.url("keys-panel.html"))

    # --- pembaruan otomatis (GitHub Releases)
    def update_menu(self):
        import pystray
        M, I = pystray.Menu, pystray.MenuItem
        has = lambda i: bool(updater.STATE["available"])  # noqa
        return M(
            I("Periksa pembaruan sekarang", self.check_now),
            I(lambda i: f"Pasang v{(updater.STATE['available'] or {}).get('version', '')} sekarang (restart singkat)",
              self.install_update, visible=has),
            I("Lihat catatan rilis", self.open_release, visible=has),
            M.SEPARATOR,
            I("Periksa otomatis (tiap 6 jam)", self.toggle_auto_check, checked=lambda i: self.s["auto_check"]),
            I("Unduh otomatis di latar", self.toggle_auto_download, checked=lambda i: self.s["auto_download"]),
        )

    def update_title(self, item=None):
        a = updater.STATE["available"]
        return f"Pembaruan (v{a['version']} tersedia)" if a else "Pembaruan"

    def on_update_found(self, info, manual=False):
        self.notify(f"Pembaruan AimTrail v{info['version']} tersedia. Buka menu tray > Pembaruan.")
        self.refresh()
        if self.s["auto_download"] and FROZEN and not manual and updater.can_write(Path(sys.executable).parent):
            threading.Thread(target=self._stage_worker, args=(info,), daemon=True).start()

    def _stage_worker(self, info):
        try:
            updater.stage(info, Path(sys.executable).parent)
            self.notify(f"Pembaruan v{info['version']} sudah diunduh dan siap dipasang (menu tray > Pembaruan).")
        except Exception as e:  # noqa
            print("Unduhan pembaruan gagal:", repr(e))
        self.refresh()

    def check_now(self, icon=None, item=None):
        threading.Thread(target=self._check_worker, daemon=True).start()

    def _check_worker(self):
        info = updater.check_for_update(self.s["update_repo"], S.VERSION)
        if info:
            self.on_update_found(info, manual=True)
        else:
            self.notify(updater.STATE["error"] or f"AimTrail sudah versi terbaru (v{S.VERSION}).")
        self.refresh()

    def open_release(self, icon=None, item=None):
        a = updater.STATE["available"]
        webbrowser.open((a and a.get("page")) or f"https://github.com/{self.s['update_repo']}/releases/latest")

    def install_update(self, icon=None, item=None):
        threading.Thread(target=self._install_worker, daemon=True).start()

    def _install_worker(self, exe=None, relaunch=None):
        """Unduh (bila belum) -> verifikasi -> ganti exe -> jalankan ulang. Mengembalikan True bila berhasil."""
        exe, relaunch = Path(exe or sys.executable), relaunch or updater.relaunch
        if not self._upd_lock.acquire(blocking=False):
            return False
        try:
            info = updater.STATE["available"]
            if not info:
                self.notify("Tidak ada pembaruan yang tersedia.")
                return False
            if not FROZEN and exe == Path(sys.executable):
                self.open_release()
                self.notify("Berjalan dari sumber Python: unduh rilis terbaru secara manual.")
                return False
            if not updater.can_write(exe.parent):
                self.notify("Folder program tidak bisa ditulis: membuka halaman rilis untuk unduh manual.")
                self.open_release()
                return False
            try:
                staged = updater.STATE["staged"]
                if not (updater.STATE["ready"] and staged and Path(staged).exists()):
                    self.notify(f"Mengunduh pembaruan v{info['version']}...")
                    staged = updater.stage(info, exe.parent)
                updater.apply(staged, exe)
            except Exception as e:  # noqa
                print("Pembaruan gagal:", repr(e))
                self.notify(f"Pembaruan gagal: {e}")
                return False
            self.notify("Pembaruan terpasang. AimTrail dimulai ulang...")
            relaunch(exe)
            self.quit()
            return True
        finally:
            self._upd_lock.release()

    def toggle_auto_check(self, icon=None, item=None):
        self.s["auto_check"] = not self.s["auto_check"]
        save_settings(self.data, self.s)
        self.refresh()

    def toggle_auto_download(self, icon=None, item=None):
        self.s["auto_download"] = not self.s["auto_download"]
        save_settings(self.data, self.s)
        self.refresh()

    # --- file pemuat untuk OBS ("Local file"): tidak perlu membuat ulang source saat urutan start berbeda
    def _obs_file(self, idx):
        S.write_loaders(self.s["port"])
        return str(S.obs_dir() / S.LOADERS[idx][0])

    def copy_file_trail(self, icon=None, item=None):
        p = self._obs_file(0)
        copy_text(p)
        self.notify(f"Lokasi file disalin. Di OBS centang Local file lalu tempel: {p}")

    def copy_file_keys(self, icon=None, item=None):
        p = self._obs_file(1)
        copy_text(p)
        self.notify(f"Lokasi file disalin. Di OBS centang Local file lalu tempel: {p}")

    def open_obs_folder(self, icon=None, item=None):
        self._obs_file(0)
        if IS_WIN:
            os.startfile(str(S.obs_dir()))  # noqa

    def always_on(self):
        return bool(self.srv and self.srv.get_config().get("alwaysOn"))

    def toggle_always(self, icon=None, item=None):
        if not self.srv:
            return
        try:
            on = not self.always_on()
            self.srv.update_config({"alwaysOn": on})
            self.notify("Ekor mouse selalu aktif: " + ("NYALA" if on else "mati"))
        except Exception as e:  # noqa
            print("Gagal mengubah mode selalu aktif:", repr(e))
        self.refresh()

    def open_manual(self, icon=None, item=None):
        webbrowser.open(self.url("manual.html"))

    def copy_trail(self, icon=None, item=None):
        u = self.url("overlay.html")
        copy_text(u)
        self.notify(f"URL disalin: {u}")

    def copy_keys(self, icon=None, item=None):
        u = self.url("keys.html")
        copy_text(u)
        self.notify(f"URL disalin: {u}")

    def toggle_autostart(self, icon=None, item=None):
        try:
            set_autostart(not autostart_enabled())
        except OSError as e:
            message_box(f"Gagal mengubah pengaturan jalan otomatis:\n{e}", error=True)
        self.refresh()

    def toggle_lan(self, icon=None, item=None):
        self.s["lan"] = not self.s["lan"]
        if not self.restart_server():
            self.s["lan"] = not self.s["lan"]   # batalkan
            self.restart_server()
            message_box("Gagal mengubah mode akses jaringan.", error=True)
            return
        save_settings(self.data, self.s)
        if self.s["lan"]:
            self.notify(f"Akses PC lain aktif: {self.url('overlay.html', lan=True)}  (izinkan di firewall bila perlu)")
        else:
            self.notify("Akses PC lain dimatikan (hanya PC ini).")

    def open_folder(self, icon=None, item=None):
        self.data.mkdir(parents=True, exist_ok=True)
        if IS_WIN:
            os.startfile(str(self.data))  # noqa

    def about(self, icon=None, item=None):
        text = (f"{APP} {S.VERSION}\n\nEkor gerakan mouse + tampilan tombol keyboard & mouse untuk live stream.\n\n"
                f"Overlay ekor mouse:\n{self.url('overlay.html')}\n\nOverlay keyboard + mouse:\n{self.url('keys.html')}\n\n"
                f"Folder pengaturan:\n{self.data}\n\nPembaruan dari: github.com/{self.s['update_repo']}\n\n{S.CREDIT}")
        threading.Thread(target=message_box, args=(text, f"Tentang {APP}"), daemon=True).start()

    def quit(self, icon=None, item=None):
        if self.icon:
            self.icon.stop()

    # --- siklus hidup
    def run(self):
        S.configure(self.data)
        self.src = S.start_input(self.args.simulate)
        if not self.start_server():
            message_box(f"Server gagal dijalankan di port {self.s['port']}.\n\n{self.error}\n\n"
                        "Kemungkinan port dipakai aplikasi lain. Ubah \"port\" di settings.json "
                        "(menu tray → Buka folder pengaturan) lalu jalankan ulang.", error=True)
            return 1
        import pystray
        from PIL import Image
        try:   # ikon sudah dirender (icon.png): jauh lebih ringan daripada menggambar ulang saat start
            img = Image.open(Path(getattr(sys, "_MEIPASS", S.BASE)) / "icon.png").convert("RGBA").resize((64, 64), Image.LANCZOS)
        except Exception:  # noqa
            from icon import make_icon
            img = make_icon(64)
        self.icon = pystray.Icon(APP, img, self.tooltip(), self.menu())
        updater.HOOKS.update(install=self.install_update, check=self.check_now)   # dipakai tombol "Pasang" di panel web
        self.icon.run(self._setup)
        updater.HOOKS.clear()
        self.srv.stop()
        return 0

    def _setup(self, icon):
        icon.visible = True
        if FROZEN:
            updater.cleanup_old(sys.executable)      # sisa file dari pembaruan sebelumnya
        updater.start_background(lambda: self.s, S.VERSION, self.on_update_found)
        if self.first_run:
            save_settings(self.data, self.s)
            self.notify("Berjalan di system tray. Klik dua kali ikon untuk membuka panel.")
        if not self.args.minimized:
            self.open_trail()


def main(argv=None):
    ap = argparse.ArgumentParser(description="AimTrail — aplikasi tray")
    ap.add_argument("--minimized", "--no-browser", dest="minimized", action="store_true", help="jangan buka panel saat mulai")
    ap.add_argument("--no-tray", action="store_true", help="mode konsol tanpa ikon tray")
    ap.add_argument("--simulate", action="store_true", help="mode demo tanpa mouse asli")
    ap.add_argument("--port", type=int)
    ap.add_argument("--rate", type=int)
    ap.add_argument("--lan", action="store_true", help="izinkan akses dari PC lain")
    ap.add_argument("--wait-pid", type=int, help=argparse.SUPPRESS)   # internal: dipakai setelah pembaruan
    ap.add_argument("--data-dir", help="folder pengaturan (default: %%APPDATA%%\\AimTrail pada versi .exe)")
    args = ap.parse_args(argv)

    data = Path(args.data_dir) if args.data_dir else default_data_dir()
    setup_logging(data)

    if args.wait_pid:
        wait_pid(args.wait_pid)
    use_tray = IS_WIN and not args.no_tray
    if use_tray and already_running():
        port = load_settings(data)["port"]
        if not args.minimized:
            webbrowser.open(f"http://localhost:{port}/panel.html")
        return 0

    if not use_tray:
        S.configure(data)
        s = load_settings(data)
        return S.run_console("0.0.0.0" if (args.lan or s["lan"]) else "127.0.0.1", args.port or s["port"],
                             args.rate or s["rate"], args.simulate, not args.minimized)
    try:
        return TrayApp(args, data).run()
    except Exception as e:  # noqa
        print("Kesalahan fatal:", repr(e))
        message_box(f"{APP} berhenti karena kesalahan:\n{e!r}\n\nLihat aimtrail.log di folder pengaturan.", error=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
