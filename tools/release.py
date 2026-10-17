#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Naikkan versi di semua file, buat ulang manual, lalu cetak perintah untuk merilis.

Pakai:  python tools/release.py 1.4.1
Setelah itu jalankan perintah git yang dicetak. GitHub Actions membangun AimTrail.exe otomatis."""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def sub(path, pattern, repl):
    p = ROOT / path
    text = p.read_text(encoding="utf-8")
    new, n = re.subn(pattern, repl, text)
    if n == 0:
        print(f"  ! pola tidak ditemukan di {path}: {pattern}")
    p.write_text(new, encoding="utf-8")


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        print("Pemakaian: python tools/release.py MAJOR.MINOR.PATCH   (contoh: 1.4.1)")
        return 1
    v = sys.argv[1]
    a, b, c = v.split(".")
    sub("server.py", r'VERSION = "[^"]+"', f'VERSION = "{v}"')
    sub("tools/build_manual.py", r'VERSION = "[^"]+"', f'VERSION = "{v}"')
    sub("version_info.txt", r"filevers=\(\d+, \d+, \d+, \d+\)", f"filevers=({a}, {b}, {c}, 0)")
    sub("version_info.txt", r"prodvers=\(\d+, \d+, \d+, \d+\)", f"prodvers=({a}, {b}, {c}, 0)")
    sub("version_info.txt", r"'FileVersion', '[^']+'", f"'FileVersion', '{v}.0'")
    sub("version_info.txt", r"'ProductVersion', '[^']+'", f"'ProductVersion', '{v}.0'")
    sub("installer.iss", r'#define AppVersion "[^"]+"', f'#define AppVersion "{v}"')
    sub("README.md", r"(@andromache\.4k\)) · v\d+\.\d+\.\d+", rf"\1 · v{v}")
    sub("README.md", r"AimTrail-Setup-\d+\.\d+\.\d+\.exe", f"AimTrail-Setup-{v}.exe")
    try:
        subprocess.run([sys.executable, str(ROOT / "tools" / "build_manual.py")], check=True)
    except Exception as e:  # noqa
        print("  ! manual tidak dibuat ulang (pip install reportlab):", e)
    print(f"\nVersi diubah ke {v}. Lanjutkan dengan:\n")
    print("  git add -A")
    print(f'  git commit -m "Rilis v{v}"')
    print(f"  git tag v{v}")
    print("  git push && git push --tags")
    print("\nTunggu GitHub Actions (tab Actions) selesai; AimTrail.exe muncul di Releases dan semua pengguna diberi tahu.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
