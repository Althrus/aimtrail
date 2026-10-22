# -*- coding: utf-8 -*-
"""English guide content (same markup as build_manual.py: **bold**  *italic*  `code`  {O} = server address)."""
CONTENT_EN = [
    ("tip", "The panel interface is currently in Indonesian. This guide gives each setting name in English and, where helpful, the Indonesian label shown in the panel."),

    ("h", "1. Get started in 3 steps"),
    ("ol", [
        "Run **AimTrail.exe**. An icon appears in the system tray (near the clock) and the control panel opens in your browser.",
        "In OBS: **Sources > + > Browser**. Set Width/Height to your OBS canvas (e.g. 1920 x 1080) and FPS to **60**. "
        "**Recommended:** tick **Local file** and pick the file shown on the *Anti-putus* (anti-disconnect) card in the panel, or use tray > *File OBS anti-putus*. "
        "The source then stays connected even if OBS starts before AimTrail. Alternative: paste a URL from the table below.",
        "Adjust the look in the panel. Changes show up in OBS instantly, no refresh needed.",
    ]),
    ("table", ["Overlay", "Browser Source URL", "Settings panel"], [
        ["Mouse trail", "{O}/overlay.html", "/panel.html"],
        ["Keyboard + mouse", "{O}/keys.html", "/keys-panel.html"],
        ["Live metrics", "{O}/metrics.html", "/metrics-panel.html"],
        ["Controller (gamepad)", "{O}/pad.html", "/pad-panel.html"],
    ]),
    ("tip", "No typing needed: right-click the tray icon > *Salin URL overlay* (copy overlay URL). Add each overlay as its own Browser Source so you can position and size them freely."),

    ("h", "2. Mouse trail"),
    ("ul", [
        "**Normal mode:** hold left click and move the mouse; a trail appears and fades away. Release the button and it disappears. Without a click the overlay stays idle.",
        "**Always-on mode:** press **Selalu aktif** (always on) under the preview, or tick it in the *Pemicu* (trigger) group, so the trail follows the mouse at all times with no button needed. Press again to turn it off. It works best together with *Titik terkunci di tengah* (dot locked in the center).",
        "Quick toggle while playing: tray menu *Ekor mouse selalu aktif*, or open `{O}/api/always?on=toggle` (for example from a Stream Deck).",
        "Pick a **preset** (Neon Biru, Api, Laser Merah, Matrix, Pelangi, ...), then tune colors, trail length, thickness, glow and head dot.",
        "**Dot locked in the center:** Gerakan (movement) > *Saat mencapai tepi layar* (at screen edge) > *Titik terkunci di tengah*. The dot stays put and the trail streams away from it.",
        "**Sensitivity:** match it to your in-game sensitivity so the trail length reflects real movement.",
        "The trigger button can be changed (right, middle, Mouse 4/5), in hold or toggle mode.",
        "Overlay border, grid background and the watermark live in the *Latar (opsional)* and *Watermark* groups.",
    ]),

    ("h", "3. Keyboard + mouse"),
    ("ul", [
        "Shows the keys you press: **1 2 3 4, Q W E R, A S D F G, SHIFT Z C V, TAB, CTRL, ALT, SPACE** plus a mouse (left, right, middle, scroll, thumb forward and back).",
        "**Drag keys** in the preview to move them. **Click a key** to change its label, size, or remove it. Use *Tambah tombol* (add key) for any other key (A-Z, 0-9, F1-F12, arrows, ...).",
        "Choose a **layout preset** (full FPS, minimal WASD, mouse only) and a **style preset** (Neon, Flat, 3D keycap, Glass).",
        "Tune colors, glow, press animation, size, board position and *sembunyikan otomatis* (auto-hide when idle).",
    ]),
    ("tip", "Privacy: the server only forwards the keys that are in your layout. Everything else you type (passwords, chat, ...) is never sent to the overlay and never stored."),

    ("h", "4. Live metrics"),
    ("ul", [
        "Add `{O}/metrics.html` as a Browser Source and configure it in the **Metrik** panel. Four cards show: **mouse speed** (cm/s; enter your mouse DPI in the panel), **clicks per second (CPS)** with the recent peak, **click hold time** (current, last, average) and **aim stability**.",
        "**Stability** is how straight and smooth your mouse movement is while shooting: 100% means smooth, lower means more back-and-forth shake. It is a rough indicator, not an official score.",
        "Choose the layout (row / column / grid), bars and mini graph, which button is counted, and use **Reset sesi** to clear peaks and the click counter.",
    ]),

    ("h", "5. Controller overlay (gamepad)"),
    ("ul", [
        "Add `{O}/pad.html`. It shows buttons, **analog triggers** and **sticks with a motion trail** for Xbox / XInput-compatible controllers.",
        "PlayStation or Switch Pro controllers work through Steam Input or DS4Windows; pick the **PlayStation** label set so the symbols match.",
        "Choose which controller (1-4), the stick dead zone, scale and position. AimTrail only **reads** the controller.",
    ]),

    ("h", "6. Shared theme and animations"),
    ("ul", [
        "The **Tema** page controls colors, font, shape and **enter/exit animations** for every overlay at once, with a live preview of all of them together.",
        "The **Metrics** and **Controller** overlays always use the theme. For **Mouse trail** and **Keyboard + mouse**, tick *Ikuti tema bersama* (follow shared theme) on the Tema page or in their own settings.",
        "Animations: pick the enter style (slide up/down/sideways, zoom, fade), the exit style, duration and motion (smooth / springy). Overlays animate in when OBS shows them and whenever activity resumes after auto-hide.",
    ]),

    ("h", "7. Tray menu (right-click)"),
    ("ul", [
        "**Open panel** for each overlay (double-click the icon = mouse trail panel), **Panel lainnya** (metrics, controller, theme) and **Open guide**.",
        "**Ekor mouse selalu aktif** toggles always-on mode; **Salin URL overlay** copies an overlay URL straight into OBS.",
        "**File OBS anti-putus** copies the path of the local files that keep OBS sources connected.",
        "**Run at Windows startup**, **Allow access from other PCs (LAN)**, **Pembaruan** (updates), **Open settings folder**, **About**, **Exit** are also there.",
        "**Updates:** AimTrail checks for new versions automatically. If one exists you get a notification and a banner in the panel. Click **Pasang** (the overlay drops for a few seconds, then restarts by itself).",
    ]),

    ("h", "8. Two PCs (game on PC A, OBS on PC B)"),
    ("ol", [
        "On PC A, enable **Allow access from other PCs (LAN)** in the tray menu.",
        "In OBS on PC B, use `http://IP-OF-PC-A:8765/overlay.html` (the IP appears in the tray notification).",
        "Allow port 8765 in PC A's firewall. Use this only on a network you trust.",
    ]),

    ("h", "9. Tips for a light, smooth overlay"),
    ("ul", [
        "Browser Source: tick **Use custom frame rate** and enter **60** (some OBS versions default to only 30 FPS).",
        "OBS > Settings > Advanced: enable **browser source hardware acceleration**, then restart OBS.",
        "Feels heavy? Panel > *Performa & kehalusan* > **Kualitas render = Ringan** (render quality = light), or turn glow off.",
        "Add `?debug=1` to the end of an overlay URL to see FPS and data per second.",
        "Using several overlays? The watermark automatically shows on only one of them.",
    ]),

    ("h", "10. Troubleshooting"),
    ("table", ["Symptom", "Fix"], [
        ["Panel says \"mode simulasi\" (simulation mode)", "Raw Input failed or you are not on Windows. Check `aimtrail.log` (tray > open settings folder)."],
        ["Nothing reacts while gaming", "If the game runs as Administrator, run AimTrail as Administrator too."],
        ["Settings do not change in OBS", "Right-click the Browser Source > Properties > **Refresh cache of current page**."],
        ["Trail keeps showing without any click", "*Selalu aktif* (always on) is ON. Turn it off with the panel button or the tray menu."],
        ["Update failed or does not appear", "Make sure you are online. Tray > Pembaruan > check now. If it still fails, download manually from the GitHub Releases page."],
        ["OBS started before AimTrail, source is empty or shows an error", "Switch the source to **Local file** mode (the *Anti-putus* card in the panel). For URL sources: right-click > Refresh, or tick *Refresh browser when scene becomes active*."],
        ["AimTrail vanished from the tray after clicking Pasang", "The new version is installed: just open AimTrail.exe again. If it repeats, send the `aimtrail.log` file to the author."],
        ["Overlay is blank in OBS", "Open the URL in a normal browser; make sure the AimTrail icon is in the tray."],
        ["Port 8765 is used by another app", "Change \"port\" in `settings.json`, restart, then update the URL in OBS."],
        ["SmartScreen / antivirus warning", "The .exe is not code-signed and reads global input. Allow AimTrail.exe; do not turn antivirus off."],
    ]),

    ("h", "11. Notes"),
    ("ul", [
        "AimTrail only **reads** input through the standard Windows Raw Input and XInput APIs (no hooks, no injection into games). Every anti-cheat is different; for competitive games, check the official rules.",
        "Settings are stored in `%APPDATA%\\AimTrail` (config.json, keys.json, metrics.json, pad.json, theme.json, settings.json).",
    ]),
]
