# AimTrail — mouse trail, keyboard/mouse, metrics and controller overlays for live streaming

> **Created by Andromache** · TikTok [@andromache.4k](https://www.tiktok.com/@andromache.4k) · v1.5.0
>
> 🇮🇩 Bahasa Indonesia: [README.md](README.md) · Quick guide: [English PDF](web/AimTrail-Guide.pdf) · [Indonesian PDF](web/Panduan-AimTrail.pdf)

AimTrail turns your raw mouse, keyboard and gamepad input into clean, customizable **OBS overlays** (any streaming software with a
*Browser Source*: OBS, Streamlabs, XSplit, vMix, Meld Studio...). It reads input at the OS level, so it keeps working inside FPS games that lock
and hide the cursor.

| Mouse trail (dot locked in the center) | Keyboard + mouse |
|---|---|
| ![Mouse trail](docs/demo-trail.gif) | ![Keyboard and mouse](docs/demo-keys.gif) |

| Live metrics | Controller |
|---|---|
| ![Metrics](docs/demo-metrics.gif) | ![Controller](docs/demo-pad.gif) |

| One theme for every overlay | Smooth enter / exit animations |
|---|---|
| ![Theme](docs/demo-theme.gif) | ![Animations](docs/demo-animasi.gif) |

## Features

- **Mouse trail** with a smooth fading tail while you hold a button (or **always on**, with an on/off switch), optional *dot locked in the center*,
  glow, head dot, ripple, gradient / rainbow / speed-based colors, border and background
- **Keyboard + mouse display**: 21 FPS keys by default (1 2 3 4, Q W E R, A S D F G, SHIFT Z C V, TAB, CTRL, ALT, SPACE) plus a mouse
  (left, right, middle, scroll, thumb buttons). Drag keys to rearrange, add any key, 4 looks (neon, flat, 3D keycap, glass)
- **Live metrics**: mouse speed, clicks per second, click hold time, aim stability
- **Controller overlay** (Xbox / XInput): buttons, analog triggers, sticks with a motion trail, Xbox / PlayStation / Nintendo labels
- **One shared theme** (colors, font, shape) and **enter / exit animations** for all overlays
- **Windows tray app** (`AimTrail.exe`), **automatic updates** from GitHub Releases, **OBS anti-disconnect** local files
- Light on CPU (≈0% when idle), 60+ FPS rendering, ~60 settings in a web panel with live preview and presets
- Privacy: only the keys in *your* layout are forwarded; nothing is logged

## Quick start (Windows 10/11)

1. Download **AimTrail.exe** from the [Releases](https://github.com/Althrus/aimtrail/releases/latest) page and run it (SmartScreen may warn because the
   file is not code-signed: *More info → Run anyway*). A tray icon appears and the control panel opens.
2. In OBS add a **Browser Source** for each overlay you want. **Recommended: tick *Local file*** and pick the file shown in the panel's
   *Anti-putus* (anti-disconnect) card. The source then stays connected even if OBS starts before AimTrail or AimTrail restarts, so you never need to
   re-create it. Alternative: use the URL (see below). Set Width/Height to your canvas (e.g. 1920×1080) and FPS to 60.
3. Tweak everything in the panel; changes appear in OBS instantly.

| Overlay | Browser Source URL | Settings panel |
|---|---|---|
| Mouse trail | `http://localhost:8765/overlay.html` | `/panel.html` |
| Keyboard + mouse | `http://localhost:8765/keys.html` | `/keys-panel.html` |
| Live metrics | `http://localhost:8765/metrics.html` | `/metrics-panel.html` |
| Controller | `http://localhost:8765/pad.html` | `/pad-panel.html` |
| Shared theme & animations | — | `/tema.html` |

> The panel UI is currently in Indonesian. Key labels: **Selalu aktif** = Always on · **Titik terkunci di tengah** = Dot locked in the center ·
> **Anti-putus** = Anti-disconnect · **Metrik** = Metrics · **Tema** = Theme · **Pembaruan** = Updates · **Kualitas render** = Render quality.

## How it works

```
Mouse / keyboard ──Raw Input──┐
Gamepad ─────────XInput───────┴▶ AimTrail (tray app, local server) ──WebSocket──▶ overlays (OBS Browser Sources)
                                                    ▲                                  ▲
                                                    └──────── control panels ──────────┘  (settings saved in %APPDATA%\AimTrail)
```

A Browser Source cannot read input outside its own page, especially in games that lock the cursor, so a small local server reads **Raw Input**
(the same relative mouse data games use) and **XInput**, and streams it to the overlays. Overlay pages are loaded from the app itself.

## The overlays

### Mouse trail
Hold the trigger button (left click by default; right, middle, Mouse 4/5, hold or toggle) and move: a trail follows your movement and fades.
**Always-on mode** removes the trigger: the trail follows the mouse at all times, with a switch in the panel, in the tray menu and at
`http://localhost:8765/api/always?on=toggle` (handy for a Stream Deck). It pairs well with **dot locked in the center**, where the dot stays put and
the trail streams away from it. Sensitivity, boundary behavior (camera follow / clamp / free), trail length, fade curve, thickness, colors, glow and
quality are all adjustable, plus 8 presets.

### Keyboard + mouse
Pressed keys light up and fade out. Drag keys in the preview to move them (with snapping), click a key to edit its label and size, add any key
(A–Z, 0–9, F1–F12, arrows...), pick layout presets (full FPS, minimal WASD, mouse only) and style presets, optionally auto-hide when idle.

### Live metrics
| Card | Meaning |
|---|---|
| **Speed** | Mouse movement per second in cm/s (set your DPI) or raw counts/s, with a 5-second mini graph and recent peak |
| **CPS** | Clicks per second over a rolling window (0.5–3 s), with peak and total |
| **Hold** | How long the button is held: current, last, average of the last 10 |
| **Stability** | Straightness of mouse movement while shooting: net distance ÷ path length over the last second (40 ms bins). 100% is smooth, lower is more back-and-forth shake. A rough indicator, not an official score |

Layout (row / column / grid), bars, which button counts, stability mode (only while holding the button, or always) and a **session reset** are in the panel.

### Controller
Reads Xbox / XInput controllers (up to four) and shows buttons, analog triggers (filled by pressure), both sticks with a short trail, D-pad and
menu buttons. Choose Xbox / PlayStation / Nintendo labels, stick dead zone, and Xbox colors or theme colors for A/B/X/Y. PlayStation / Switch Pro
controllers work through Steam Input or DS4Windows. AimTrail only **reads** the controller.

### Shared theme and animations
The **Theme** page edits one theme for everything: accent and second color, text, card background, border, glow, font, corner radius, and
**enter / exit animations** (slide up/down/sideways, scale, zoom, fade; duration; smooth or springy motion). Metrics and Controller always use the
theme; Mouse trail and Keyboard + mouse follow it when *Ikuti tema bersama* is ticked. Overlays animate in when first shown and when activity resumes
after auto-hide. 8 theme presets, JSON export / import.

## Tray menu

Open panels, copy overlay URLs / local-file paths, **always-on toggle**, run at Windows startup, allow access from other PCs (LAN), updates, open the
settings folder, about, exit. Double-click the icon to open the mouse trail panel. Only one AimTrail instance runs at a time.

## Two PCs (game on PC A, OBS on PC B)

Enable **Allow access from other PCs (LAN)** in the tray menu on PC A, then use `http://IP-OF-PC-A:8765/overlay.html` (etc.) in OBS on PC B and allow port
8765 in the firewall. Anyone on the network could change your settings, so only do this on networks you trust.

## Automatic updates

AimTrail checks **GitHub Releases** at startup and every 6 hours. If a newer version exists you get a notification, an **Updates** item in the tray and a
banner in the panels. **Install** downloads the file, verifies its **SHA-256**, replaces `AimTrail.exe` (the old one is kept as `AimTrail.exe.old`) and
restarts. Only HTTPS to GitHub hosts is allowed; downloads without a matching checksum are rejected; read-only install folders just open the release page.

### Publishing a release (for maintainers)
1. One time: create a **public** repository `aimtrail`, then *Settings → Actions → General → Workflow permissions → Read and write*. Push the project.
   (Using another repo name? Change `DEFAULT_REPO` in `updater.py`.)
2. Each release: `python tools/release.py 1.4.4` bumps the version everywhere and prints the git commands (`git commit`, `git tag v1.4.4`, `git push --tags`).
   GitHub Actions builds `AimTrail.exe` + checksum and publishes them; users are notified automatically. The workflow refuses a release whose tag
   differs from the version in the code.

## Performance

Idle CPU is ≈0% (the sender sleeps until input arrives); the default send rate is 250 Hz and process priority is not raised, so games are unaffected.
Overlays stop drawing when nothing moves. In OBS, tick *Use custom frame rate* = 60 on each Browser Source and enable browser-source hardware
acceleration (Settings → Advanced). If an overlay feels heavy, set *Render quality* to *Light* in the panel. Add `?debug=1` to an overlay URL to see its FPS.

## Privacy and anti-cheat

Only the keys that appear in your keyboard layout are forwarded to the overlay; every other keystroke is dropped on the server and nothing is stored or
logged. AimTrail only **reads** input through the standard Windows Raw Input and XInput APIs: no hooks, no injection into games, no memory access.
Every anti-cheat is different, so for competitive games check the official rules.

## Troubleshooting

| Problem | Fix |
|---|---|
| Panel says *mode simulasi* (simulation) | Raw Input failed or you are not on Windows. Check `aimtrail.log` (tray → open settings folder) |
| Nothing reacts while gaming | If the game runs as Administrator, run AimTrail as Administrator too |
| OBS started before AimTrail and the source is blank | Use the **Local file** mode (see Quick start). For URL sources: right-click → Refresh |
| Settings do not change in OBS | Right-click the source → Properties → *Refresh cache of current page* |
| Trail shows without clicking | *Always on* is enabled; turn it off in the panel or tray |
| AimTrail disappeared from the tray after an update | The new version is installed: start `AimTrail.exe` again (fixed to restart automatically from v1.4.3) |
| Port 8765 is taken | Change `"port"` in `settings.json`, restart, and update the OBS URL |
| SmartScreen / antivirus warning | The `.exe` is not code-signed and reads global input. Allow it; do not disable your antivirus |

## Build from source

```
git clone https://github.com/Althrus/aimtrail && cd aimtrail
python -m venv .venv && .venv\Scripts\activate        # Windows
pip install -r requirements.txt
python app.py                                          # tray app   (add --no-tray for console mode, --simulate for demo data)
build.bat                                              # builds dist\AimTrail.exe (PyInstaller)
```

Project layout: `app.py` (tray app), `server.py` (input + web + WebSocket), `updater.py` (updates), `web/` (overlays and panels: `overlay`, `keys`, `metrics`,
`pad`, `tema`, shared `theme.js` / `anim.js` / `wm.js`), `tools/` (release and manual generators), `docs/` (demo GIFs).

### WebSocket protocol (`/ws`), for building your own overlay
- Connect to `/ws?sub=trail|keys|metrics|pad|cfg&role=overlay` (no `sub` = everything).
- Server → client: `hello` (all settings, current state), settings updates (`config`, `kconfig`, `mconfig`, `pconfig`, `tconfig`), `peers`, and event arrays:
  `{"t":"m","dx","dy","d"}` raw mouse motion · `{"t":"b","b":mask}` mouse buttons (1 left, 2 right, 4 middle, 8 Mouse 4, 16 Mouse 5) ·
  `{"t":"k","k":vk,"d":1|0}` key (Windows VK, only layout keys) · `{"t":"w","v":±1}` scroll · `{"t":"p","i":slot,"b","lt","rt","lx","ly","rx","ry"}` controller state ·
  `{"t":"pc","i":slot,"on":1|0}` controller connect/disconnect.
- Client → server: `{"t":"config"|"kconfig"|"mconfig"|"pconfig"|"tconfig","config":{...}}`. HTTP: `GET /api/status`, `GET /api/always?on=1|0|toggle`.

## License and credits

Created by **Andromache** · TikTok [@andromache.4k](https://www.tiktok.com/@andromache.4k). Overlays show a small watermark by default (adjustable in each panel).
