# -*- mode: python ; coding: utf-8 -*-
# Build:  pyinstaller --noconfirm aimtrail.spec      ->  dist/AimTrail.exe  (satu file, tanpa konsol)
a = Analysis(
    ['app.py'],
    pathex=['.'],
    datas=[('web', 'web'), ('icon.png', '.')],
    hiddenimports=['pystray._win32'],
    excludes=['tkinter', 'unittest', 'pydoc', 'PIL.ImageTk', 'PIL._tkinter_finder',
              'pystray._xorg', 'pystray._appindicator', 'pystray._gtk', 'pystray._darwin'],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz, a.scripts, a.binaries, a.datas, [],
    name='AimTrail',
    debug=False, strip=False, upx=False,
    console=False,                 # tanpa jendela konsol
    icon='icon.ico',
    version='version_info.txt',
)
