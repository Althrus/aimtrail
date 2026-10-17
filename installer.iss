; Inno Setup (https://jrsoftware.org/isinfo.php) — jalankan setelah build.bat
#define AppName "AimTrail"
#define AppVersion "1.4.3"
#define AppPublisher "Andromache"

[Setup]
AppId={{8F3A6C52-5B0C-4C8E-9C1B-7A1E0A1B2C3D}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL=https://www.tiktok.com/@andromache.4k
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=dist
OutputBaseFilename=AimTrail-Setup-{#AppVersion}
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\AimTrail.exe
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible

[Tasks]
Name: "desktopicon"; Description: "Buat ikon di desktop"; Flags: unchecked
Name: "autostart"; Description: "Jalankan otomatis saat Windows menyala"; Flags: unchecked

[Files]
Source: "dist\AimTrail.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\AimTrail.exe"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\AimTrail.exe"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "AimTrail"; \
  ValueData: """{app}\AimTrail.exe"" --minimized"; Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "{app}\AimTrail.exe"; Description: "Jalankan {#AppName}"; Flags: nowait postinstall skipifsilent
