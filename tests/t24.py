import faulthandler; faulthandler.dump_traceback_later(100, exit=True)
import os, sys, tempfile, time, types, subprocess, re
os.environ["PYSTRAY_BACKEND"] = "dummy"
sys.path.insert(0, "/home/claude/aimtrail")
import pystray
for n in ("_update_title","_update_menu","_update_icon","_show","_hide","notify"): setattr(pystray.Icon, n, lambda self,*a,**k: None)
import updater as U, app as A, server as S
from pathlib import Path
def ok(n, c, x=""): print(("  OK   " if c else "  GAGAL"), n, x)
d = Path(tempfile.mkdtemp()); p = U.write_helper(d); t = p.read_bytes().decode("ascii")
ok("skrip: ASCII murni + CRLF", "\r\n" in t and t.count("\n") == t.count("\r\n"))
ok("skrip: modulo %% dan jalur log satu backslash", "set /a K=T %% 2" in t and 'set "LOG=%AT_DATA%\\update.log"' in t)
labels = set(re.findall(r"^:(\w+)", t, re.M)); gotos = set(re.findall(r"goto (\w+)", t))
ok("skrip: semua goto punya label", all(g in labels for g in gotos), str(sorted(gotos - labels)))
ok("skrip: tanpa blok berkurung", not re.search(r"^\s*(if|else).*\(", t, re.M))
ok("skrip: urutan tunggu -> pindah -> flag -> nyalakan -> cek", t.index(":waitold") < t.index(":mv1") < t.index(":swapped") < t.index(":launch") < t.index(":chk"))
ok("skrip: hapus diri sendiri", t.rstrip().endswith('(goto) 2>nul & del "%~f0"'))
env = U.helper_env(r"C:\Users\Budi Ñandú\AppData\Roaming\AimTrail", r"D:\Program (x86)\AimTrail.exe", r"D:\Program (x86)\AimTrail.exe.new", 4242,
                   {"PATH": "p", "_PYI_APPLICATION_HOME_DIR": "x", "_MEIPASS2": "y"})
ok("env: jalur lewat variabel, _PYI_* dibuang, RESET=1", "Ñandú" in env["AT_DATA"] and env["AT_PID"] == "4242" and not any(k.startswith("_PYI") or k == "_MEIPASS2" for k in env) and env["PYINSTALLER_RESET_ENVIRONMENT"] == "1")
calls = []
class P: pid = 777
def fake_popen(cmd, **kw):
    calls.append((cmd, kw["creationflags"]))
    if len(calls) == 1: raise OSError(5, "Access is denied")
    return P()
real = subprocess.Popen; subprocess.Popen = fake_popen; U.IS_WIN = True
pr = U.spawn_helper(d, d / "AimTrail.exe", d / "AimTrail.exe.new"); subprocess.Popen = real; U.IS_WIN = False
ok("spawn: coba BREAKAWAY dulu lalu tanpa; cmd.exe /d /c update.cmd", len(calls) == 2 and calls[0][1] & 0x01000000 and not calls[1][1] & 0x01000000 and calls[1][0][:3] == ["cmd.exe", "/d", "/c"])
DATA = Path(tempfile.mkdtemp()); S.configure(DATA)
args = types.SimpleNamespace(port=8891, lan=False, rate=250, simulate=True, minimized=True, no_tray=False, data_dir=str(DATA), wait_pid=None, updated=False)
tray = A.TrayApp(args, DATA); notes = []; tray.notify = lambda m: notes.append(m); quits = []; tray.quit = lambda *a, **k: quits.append(1)
def prep():
    inst = Path(tempfile.mkdtemp()); f = inst / "AimTrail.exe"; f.write_bytes(b"EXE-LAMA"); st = inst / "AimTrail.exe.new"; st.write_bytes(b"MZ" + os.urandom(1500000))
    U.STATE.update(available={"version": "9.9.9", "tag": "v9.9.9", "page": "x", "notes": ""}, ready=True, staged=str(st), downloading=False); return f, st
f, st = prep(); got = []
res = tray._install_worker(exe=f, helper=lambda e, s: got.append((Path(e), Path(s))))
ok("install: diserahkan ke skrip pembantu lalu menutup diri; file tidak diganti di proses ini", res is True and quits == [1] and got == [(f, st)] and f.read_bytes() == b"EXE-LAMA")
ok("install: pengguna diberi tahu", any("menutup dan menyala lagi" in n for n in notes))
f, st = prep(); quits.clear(); c2 = []
class Alive:  poll = lambda s: None
U.relaunch_failed = lambda p, wait=3.0: p.poll() is not None
def boom(e, s): raise OSError("cmd gagal")
res = tray._install_worker(exe=f, helper=boom, relaunch=lambda p: (c2.append(p), Alive())[1])
ok("helper gagal -> cara langsung tetap jalan", res is True and f.read_bytes()[:2] == b"MZ" and c2 == [f] and quits == [1])
dd = Path(tempfile.mkdtemp()); a1 = types.SimpleNamespace(minimized=False)
ok("flag: tanpa flag normal", A.consume_update_flag(dd, a1) is False and a1.minimized is False)
(dd / "just_updated.flag").write_text("ok"); a2 = types.SimpleNamespace(minimized=False)
ok("flag: ada flag -> minimized, flag dihapus, updated", A.consume_update_flag(dd, a2) is True and a2.minimized and not (dd / "just_updated.flag").exists())
w = Path(tempfile.mkdtemp()); ex = w / "AimTrail.exe"; ex.write_bytes(b"x"); old = Path(str(ex) + ".old"); old.write_bytes(b"o"); new = Path(str(ex) + ".new"); new.write_bytes(b"n")
U.cleanup_old(ex); ok("cleanup: .old baru dipertahankan, .new dihapus", old.exists() and not new.exists())
os.utime(old, (time.time() - 5 * 86400,) * 2); U.cleanup_old(ex); ok("cleanup: .old > 3 hari dihapus", not old.exists())
import inspect; ok("tray: instance baru menulis alive.flag dan memberi notifikasi", "alive.flag" in inspect.getsource(A.TrayApp._setup) and "diperbarui ke v" in inspect.getsource(A.TrayApp._setup))
