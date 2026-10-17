# -*- coding: utf-8 -*-
"""
Pembaruan otomatis AimTrail lewat GitHub Releases (hanya pustaka standar Python).

Alur:  cek rilis terbaru -> bandingkan versi -> unduh AimTrail.exe -> cocokkan SHA-256 ->
       ganti file yang sedang berjalan (di-rename dulu, Windows mengizinkannya) -> jalankan ulang.

Keamanan: hanya HTTPS ke host GitHub (termasuk setiap pengalihan), unduhan WAJIB cocok SHA-256
dari rilis, ukuran dibatasi, dan file lama disimpan sebagai AimTrail.exe.old (cadangan).
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

DEFAULT_REPO = "Althrus/aimtrail"
ASSET = "AimTrail.exe"
UA = "AimTrail-Updater"
IS_WIN = sys.platform == "win32"
MAX_SIZE = 300 * 1024 * 1024
MIN_SIZE = 1 * 1024 * 1024
ALLOWED_HOSTS = {"api.github.com", "github.com", "objects.githubusercontent.com",
                 "release-assets.githubusercontent.com", "github-releases.githubusercontent.com"}


def api_base():
    return os.environ.get("AIMTRAIL_API", "https://api.github.com")   # diubah hanya untuk pengujian


def _test_mode():
    return os.environ.get("AIMTRAIL_TEST") == "1"


STATE = {"checked": 0, "available": None, "error": None, "downloading": False, "ready": False, "staged": None, "progress": 0}
HOOKS = {}            # diisi aplikasi tray: "install", "check"
_lock = threading.Lock()


# ------------------------------------------------------------------------------ versi
def parse_version(s):
    m = re.match(r"\s*v?(\d+)\.(\d+)\.(\d+)", str(s or ""))
    return tuple(int(x) for x in m.groups()) if m else None


# --------------------------------------------------------------------------- jaringan
def _check_url(url):
    p = urlparse(url)
    host = (p.hostname or "").lower()
    if p.scheme == "https" and host in ALLOWED_HOSTS:
        return
    if _test_mode() and p.scheme in ("http", "https") and host in ("127.0.0.1", "localhost"):
        return
    raise urllib.error.URLError(f"alamat tidak diizinkan: {host or url}")


class _SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _check_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _open(url, timeout=10, accept="application/vnd.github+json"):
    _check_url(url)
    opener = urllib.request.build_opener(_SafeRedirect)
    return opener.open(urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept}), timeout=timeout)


def _friendly(e):
    if isinstance(e, urllib.error.HTTPError):
        if e.code == 404:
            return "Belum ada rilis di GitHub (atau repositori tidak publik)."
        if e.code in (403, 429):
            return "Batas permintaan GitHub tercapai. Coba lagi nanti."
        return f"GitHub menjawab kode {e.code}."
    if isinstance(e, urllib.error.URLError):
        return "Tidak bisa terhubung ke GitHub (periksa internet)."
    return str(e)


# ---------------------------------------------------------------------------- rilis
def parse_release(data):
    """Ambil info yang dibutuhkan dari JSON rilis GitHub; None jika bukan rilis yang valid."""
    if not isinstance(data, dict) or data.get("draft") or data.get("prerelease"):
        return None
    ver = parse_version(data.get("tag_name"))
    if not ver:
        return None
    assets = {a.get("name"): a for a in data.get("assets", []) if isinstance(a, dict)}
    exe = assets.get(ASSET) or {}
    digest = str(exe.get("digest") or "")
    sha_asset = assets.get(ASSET + ".sha256") or {}
    return {"version": ".".join(map(str, ver)), "tag": data.get("tag_name"), "notes": (data.get("body") or "")[:1500],
            "page": data.get("html_url"), "published": data.get("published_at"),
            "exe_url": exe.get("browser_download_url"), "size": exe.get("size"),
            "sha256": digest[7:].lower() if digest.startswith("sha256:") else None,
            "sha_url": sha_asset.get("browser_download_url")}


def check_for_update(repo, current):
    """Periksa rilis terbaru. Mengembalikan info bila lebih baru dari `current`, selain itu None (tidak pernah melempar error)."""
    try:
        with _open(f"{api_base()}/repos/{repo}/releases/latest") as r:
            data = json.loads(r.read(2_000_000).decode("utf-8", "replace"))
        info = parse_release(data)
        cur, new = parse_version(current), parse_version(info["version"]) if info else None
        found = info if info and info["exe_url"] and cur and new > cur else None
        with _lock:
            STATE.update(checked=time.time(), error=None, available=found)
            if not found:
                STATE.update(ready=False, staged=None)
        return found
    except Exception as e:  # noqa
        with _lock:
            STATE.update(checked=time.time(), error=_friendly(e))
        return None


def _expected_sha(info):
    if info.get("sha256"):
        return info["sha256"]
    if info.get("sha_url"):
        with _open(info["sha_url"], accept="text/plain") as r:
            m = re.search(r"\b[a-fA-F0-9]{64}\b", r.read(4096).decode("ascii", "ignore"))
        if m:
            return m.group(0).lower()
    return None


def stage(info, dest_dir, progress=None):
    """Unduh + verifikasi ke <dest_dir>/AimTrail.exe.new. Gagal verifikasi -> file dihapus dan error dilempar."""
    dest = Path(dest_dir) / (ASSET + ".new")
    with _lock:
        if STATE["downloading"]:
            raise RuntimeError("Unduhan sedang berjalan.")
        STATE.update(downloading=True, ready=False, staged=None, progress=0)
    try:
        want = _expected_sha(info)
        if not want:
            raise ValueError("Rilis tidak menyertakan checksum SHA-256; pembaruan otomatis dibatalkan.")
        h, total, head = hashlib.sha256(), 0, b""
        with _open(info["exe_url"], timeout=30, accept="application/octet-stream") as r, open(dest, "wb") as f:
            size = int(r.headers.get("Content-Length") or info.get("size") or 0)
            if size > MAX_SIZE:
                raise ValueError("Ukuran file tidak wajar.")
            while True:
                chunk = r.read(256 * 1024)
                if not chunk:
                    break
                if not head:
                    head = chunk[:2]
                total += len(chunk)
                if total > MAX_SIZE:
                    raise ValueError("Ukuran file tidak wajar.")
                h.update(chunk)
                f.write(chunk)
                if size:
                    with _lock:
                        STATE["progress"] = int(total * 100 / size)
                    if progress:
                        progress(total, size)
        if total < MIN_SIZE:
            raise ValueError("File unduhan terlalu kecil.")
        if h.hexdigest() != want:
            raise ValueError("Checksum tidak cocok; unduhan ditolak demi keamanan.")
        if IS_WIN and head != b"MZ":
            raise ValueError("File bukan program Windows yang valid.")
        with _lock:
            STATE.update(ready=True, staged=str(dest), progress=100)
        return dest
    except Exception:
        try:
            dest.unlink()
        except OSError:
            pass
        raise
    finally:
        with _lock:
            STATE["downloading"] = False


# ------------------------------------------------------------------------- pemasangan
def apply(staged, exe_path):
    """Ganti exe yang sedang berjalan: exe -> exe.old, staged -> exe. Gagal -> dikembalikan seperti semula."""
    exe, staged = Path(exe_path), Path(staged)
    old = exe.with_name(exe.name + ".old")
    try:
        old.unlink()
    except FileNotFoundError:
        pass
    except OSError:
        old = exe.with_name(exe.name + f".old{int(time.time())}")
    os.replace(exe, old)
    try:
        os.replace(staged, exe)
    except OSError:
        os.replace(old, exe)   # kembalikan
        raise
    return old


def relaunch_env(environ=None):
    """Lingkungan bersih untuk proses baru.

    .exe PyInstaller (onefile) mewariskan variabel _PYI_* / _MEIPASS2 yang menunjuk ke folder sementara milik proses lama.
    Jika ikut diwariskan, salinan baru memakai folder itu dan ikut rusak begitu proses lama keluar -> aplikasi 'hilang'
    setelah pembaruan. Karena itu variabel tersebut dibuang dan PYINSTALLER_RESET_ENVIRONMENT=1 diset (PyInstaller >= 6.9)
    supaya salinan baru dianggap proses mandiri."""
    env = {k: v for k, v in (environ if environ is not None else os.environ).items()
           if not k.startswith("_PYI") and k != "_MEIPASS2"}
    env["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
    return env


def relaunch(exe_path):
    """Jalankan salinan baru; ia menunggu proses ini selesai (--wait-pid) sebelum mulai."""
    exe = Path(exe_path)
    flags = (0x00000008 | 0x00000200) if IS_WIN else 0   # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
    print(f"Menyalakan ulang: {exe} (pid lama {os.getpid()})")
    return subprocess.Popen([str(exe), "--minimized", "--wait-pid", str(os.getpid())],
                            creationflags=flags, close_fds=True, env=relaunch_env(), cwd=str(exe.parent),
                            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def relaunch_failed(proc, wait=3.0):
    """True jika proses baru langsung mati (gagal menyala) dalam `wait` detik."""
    time.sleep(wait)
    return proc.poll() is not None


def cleanup_old(exe_path):
    exe = Path(exe_path)
    for p in list(exe.parent.glob(exe.name + ".old*")) + [exe.with_name(exe.name + ".new")]:
        try:
            p.unlink()
        except OSError:
            pass


def can_write(dir_path):
    return os.access(str(dir_path), os.W_OK)


# ----------------------------------------------------------------------- tampilan status
def public_state():
    with _lock:
        a = STATE["available"]
        return {"available": {"version": a["version"], "tag": a["tag"], "page": a["page"], "notes": a["notes"]} if a else None,
                "ready": STATE["ready"], "downloading": STATE["downloading"], "progress": STATE["progress"],
                "error": STATE["error"], "checked": STATE["checked"], "canInstall": "install" in HOOKS}


# ----------------------------------------------------------------------- pemeriksa latar
def start_background(get_settings, current, on_found, first_delay=20, interval=6 * 3600):
    """Thread daemon: periksa berkala. `on_found(info)` dipanggil sekali per versi baru."""
    seen = set()

    def loop():
        time.sleep(first_delay)
        while True:
            s = get_settings()
            if s.get("auto_check", True):
                info = check_for_update(s.get("update_repo") or DEFAULT_REPO, current)
                if info and info["version"] not in seen:
                    seen.add(info["version"])
                    try:
                        on_found(info)
                    except Exception as e:  # noqa
                        print("Kesalahan pada penanganan pembaruan:", repr(e))
            time.sleep(interval)

    t = threading.Thread(target=loop, daemon=True, name="aimtrail-updater")
    t.start()
    return t
