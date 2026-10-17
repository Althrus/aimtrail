#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Membuat manual dari satu sumber isi:
     web/manual.html             (halaman panduan di dalam aplikasi)
     web/Panduan-AimTrail.pdf    (PDF untuk dibagikan)
Jalankan dari folder proyek:  python tools/build_manual.py      (butuh: pip install reportlab)"""
import re
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
VERSION = "1.4.2"
CREDIT = "Created by Andromache | TikTok @andromache.4k"
TIKTOK = "https://www.tiktok.com/@andromache.4k"
TITLE = "AimTrail - Panduan Singkat"
SUB = "Ekor gerakan mouse + tampilan tombol keyboard & mouse untuk live stream (OBS dan software lain)"

# ---- isi: ('h', judul) ('p', teks) ('ol'|'ul', [item]) ('table', [header], [[sel]]) ('tip', teks)
# markup: **tebal**  `kode`
CONTENT = [
    ("h", "1. Mulai dalam 3 langkah"),
    ("ol", [
        "Jalankan **AimTrail.exe**. Ikon muncul di system tray (dekat jam) dan panel terbuka di browser.",
        "Di OBS: **Sources > + > Browser**. Isi Width/Height sesuai kanvas OBS (mis. 1920 x 1080) dan FPS **60**. "
        "**Disarankan:** centang **Local file** lalu pilih file dari kartu *Anti-putus* di panel (atau tray > File OBS anti-putus). "
        "Dengan cara ini source tetap tersambung walau OBS dibuka sebelum AimTrail. Alternatif: tempel URL dari tabel di bawah.",
        "Atur tampilan di panel. Perubahan langsung terlihat di OBS, tanpa refresh.",
    ]),
    ("table", ["Overlay", "URL Browser Source", "Panel pengaturan"], [
        ["Ekor gerakan mouse", "{O}/overlay.html", "/panel.html"],
        ["Tombol keyboard + mouse", "{O}/keys.html", "/keys-panel.html"],
    ]),
    ("tip", "Tidak perlu mengetik URL: klik kanan ikon tray > **Salin URL overlay**. "
            "Pakai dua Browser Source terpisah agar bebas diatur posisi dan ukurannya."),

    ("h", "2. Ekor gerakan mouse"),
    ("ul", [
        "**Mode normal:** tahan klik kiri lalu gerakkan mouse, ekor muncul dan memudar. Lepas klik, ekor hilang. Tanpa klik, overlay diam.",
        "**Mode selalu aktif:** tekan tombol **Selalu aktif** di bawah preview (atau centang di grup *Pemicu*) agar ekor mengikuti gerakan mouse "
        "kapan saja tanpa menekan apa pun. Tekan lagi untuk mematikan. Paling nyaman dipadukan dengan *Titik terkunci di tengah*.",
        "Tombol cepat saat bermain: menu tray *Ekor mouse selalu aktif*, atau buka `{O}/api/always?on=toggle` (mis. dari Stream Deck).",
        "Pilih **Preset** (Neon Biru, Api, Laser Merah, Matrix, Pelangi, dll.), lalu sesuaikan warna, lama ekor, tebal, glow, dan titik kepala.",
        "**Titik terkunci di tengah:** Gerakan > *Saat mencapai tepi layar* > *Titik terkunci di tengah*. Titik diam, ekor yang bergerak.",
        "**Sensitivitas:** samakan dengan sensitivitas game agar panjang ekor sesuai gerakan nyata.",
        "Tombol pemicu bisa diganti (klik kanan, tengah, Mouse 4/5), dengan mode tahan atau toggle.",
        "Garis tepi overlay, latar grid, dan watermark ada di grup *Latar (opsional)* dan *Watermark*.",
    ]),

    ("h", "3. Tombol keyboard + mouse"),
    ("ul", [
        "Menampilkan tombol yang sedang ditekan: **1 2 3 4, Q W E R, A S D F G, SHIFT Z C V, TAB, CTRL, ALT, SPACE** "
        "ditambah mouse (klik kiri, kanan, tengah, scroll, thumb depan dan belakang).",
        "**Seret tombol** di preview untuk memindahkannya. **Klik tombol** untuk mengubah teks, ukuran, atau menghapusnya. "
        "Gunakan *Tambah tombol* untuk tombol lain (A-Z, 0-9, F1-F12, panah, dll.).",
        "Pilih **preset layout** (FPS lengkap, WASD minimal, hanya mouse) dan **preset gaya** (Neon, Flat, Keycap 3D, Kaca).",
        "Atur warna, glow, animasi tekan, ukuran, posisi papan, dan *sembunyikan otomatis* saat tidak dipakai.",
    ]),
    ("tip", "Privasi: server hanya meneruskan tombol yang ada di layout-mu. Ketikan lain (password, chat, dll.) "
            "tidak pernah dikirim ke overlay dan tidak disimpan."),

    ("h", "4. Menu ikon tray (klik kanan)"),
    ("ul", [
        "**Buka panel** ekor mouse / keyboard + mouse (klik dua kali ikon = panel ekor mouse), dan **Buka panduan**.",
        "**Ekor mouse selalu aktif (tanpa klik)** untuk menyalakan/mematikan mode selalu aktif, dan **Salin URL overlay** untuk langsung ditempel ke OBS.",
        "**Jalan otomatis saat Windows menyala**, **Akses dari PC lain (LAN)**, **Pembaruan**, **Buka folder pengaturan**, **Tentang**, **Keluar**.",
        "**Pembaruan:** AimTrail memeriksa versi baru otomatis. Jika ada, muncul notifikasi dan spanduk di panel. Klik **Pasang** (overlay terputus beberapa detik lalu menyala sendiri).",
    ]),

    ("h", "5. Dua PC (game di PC A, OBS di PC B)"),
    ("ol", [
        "Di PC A, aktifkan **Izinkan akses dari PC lain (LAN)** pada menu tray.",
        "Di OBS pada PC B, pakai URL `http://IP-PC-A:8765/overlay.html` (IP muncul di notifikasi tray).",
        "Izinkan port 8765 di firewall PC A. Gunakan hanya di jaringan yang kamu percaya.",
    ]),

    ("h", "6. Tips agar ringan dan mulus"),
    ("ul", [
        "Browser Source: centang **Use custom frame rate** dan isi **60** (default sebagian versi OBS hanya 30 FPS).",
        "OBS > Settings > Advanced: aktifkan **browser source hardware acceleration**, lalu restart OBS.",
        "Terasa berat? Panel > *Performa & kehalusan* > **Kualitas render = Ringan**, atau matikan Glow.",
        "Tambahkan `?debug=1` di akhir URL overlay untuk melihat FPS dan jumlah data per detik.",
        "Memakai kedua overlay? Watermark otomatis hanya tampil di satu overlay.",
    ]),

    ("h", "7. Pemecahan masalah"),
    ("table", ["Gejala", "Solusi"], [
        ["Panel tertulis \"mode simulasi\"", "Raw Input gagal atau bukan Windows. Lihat `aimtrail.log` (tray > Buka folder pengaturan)."],
        ["Tidak bereaksi saat main", "Jika game berjalan sebagai Administrator, jalankan AimTrail sebagai Administrator juga."],
        ["Pengaturan tidak berubah di OBS", "Klik kanan Browser Source > Properties > **Refresh cache of current page**."],
        ["Ekor muncul terus padahal tidak menekan apa pun", "Mode *Selalu aktif* sedang NYALA. Matikan lewat tombol di panel atau menu tray."],
        ["Pembaruan gagal atau tidak muncul", "Pastikan internet aktif. Menu tray > Pembaruan > Periksa pembaruan sekarang. Bila gagal, unduh manual di halaman Releases GitHub."],
        ["OBS dibuka sebelum AimTrail, source kosong / error", "Ganti source ke mode **Local file** (kartu *Anti-putus* di panel). Untuk source berupa URL: klik kanan source > Refresh, atau centang *Refresh browser when scene becomes active*."],
        ["Overlay kosong di OBS", "Buka URL di browser biasa; pastikan ikon AimTrail ada di tray."],
        ["Port 8765 dipakai aplikasi lain", "Ubah \"port\" di `settings.json`, jalankan ulang, lalu ubah URL di OBS."],
        ["SmartScreen / antivirus memberi peringatan", ".exe tidak bertanda tangan digital dan membaca input global. Kecualikan file AimTrail.exe; jangan mematikan antivirus."],
    ]),

    ("h", "8. Catatan"),
    ("ul", [
        "AimTrail hanya **membaca** input lewat Raw Input standar Windows (tanpa hook atau injeksi ke game). "
        "Kebijakan tiap anti-cheat berbeda; untuk game kompetitif, cek aturan resminya.",
        "Pengaturan tersimpan di `%APPDATA%\\AimTrail` (config.json, keys.json, settings.json).",
    ]),
]


# ---------------------------------------------------------------------------- HTML
def inline_html(t):
    t = escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"\*(.+?)\*", r"<em>\1</em>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    return re.sub(r"\{O\}", '<span class="o">http://localhost:8765</span>', t)


def build_html():
    out = []
    for blk in CONTENT:
        k = blk[0]
        if k == "h":
            out.append(f"<h2>{inline_html(blk[1])}</h2>")
        elif k == "p":
            out.append(f"<p>{inline_html(blk[1])}</p>")
        elif k in ("ol", "ul"):
            out.append(f"<{k}>" + "".join(f"<li>{inline_html(i)}</li>" for i in blk[1]) + f"</{k}>")
        elif k == "tip":
            out.append(f'<p class="tip">{inline_html(blk[1])}</p>')
        elif k == "table":
            head = "".join(f"<th>{inline_html(h)}</th>" for h in blk[1])
            rows = "".join("<tr>" + "".join(f"<td>{inline_html(c)}</td>" for c in r) + "</tr>" for r in blk[2])
            out.append(f'<div class="tw"><table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>')
    body = "\n".join(out)
    return f"""<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
<style>
  :root {{ --bg:#0a1220; --panel:#0f1b2e; --line:#263243; --text:#dbe7f5; --muted:#8aa0b8; --accent:#38bdf8;
          --font:"Bahnschrift","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif; --mono:"Cascadia Mono",Consolas,ui-monospace,monospace; }}
  * {{ box-sizing: border-box; }}
  html {{ color-scheme: dark; }}
  body {{ margin:0; background:var(--bg); color:var(--text); font:15px/1.6 var(--font); }}
  header {{ display:flex; align-items:center; gap:14px; padding:14px 24px; border-bottom:1px solid var(--line); }}
  header h1 {{ margin:0; font-size:20px; font-weight:600; }}
  nav {{ display:flex; gap:4px; margin-left:8px; }}
  nav a {{ color:var(--muted); text-decoration:none; padding:6px 12px; border-radius:6px; border:1px solid transparent; }}
  nav a:hover {{ color:var(--text); }}
  nav a.cur {{ color:var(--accent); border-color:var(--line); background:var(--panel); }}
  .dl {{ margin-left:auto; color:var(--accent); text-decoration:none; border:1px solid var(--line); padding:6px 12px; border-radius:6px; }}
  main {{ max-width: 860px; margin: 0 auto; padding: 28px 24px 8px; }}
  .hero {{ margin-bottom: 8px; }}
  .hero h2 {{ font-size: 30px; margin: 0 0 6px; border: 0; padding: 0; color: var(--text); }}
  .hero p {{ margin: 0; color: var(--muted); }}
  h2 {{ font-size: 19px; margin: 32px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--line); color: var(--accent); }}
  ol, ul {{ padding-left: 22px; margin: 8px 0; }} li {{ margin: 5px 0; }}
  code {{ font: 13px var(--mono); background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 1px 6px; }}
  .o {{ font-family: var(--mono); }}
  .tw {{ overflow-x: auto; margin: 12px 0; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
  th, td {{ text-align: left; padding: 8px 12px; border: 1px solid var(--line); vertical-align: top; }}
  th {{ background: var(--panel); color: var(--accent); font-weight: 600; }}
  .tip {{ background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 6px; padding: 10px 14px; margin: 12px 0; }}
  footer {{ text-align: center; color: var(--muted); font-size: 12px; padding: 28px 24px 32px; }}
  footer a {{ color: var(--accent); text-decoration: none; }} footer b {{ color: var(--text); }}
  @media print {{
    html {{ color-scheme: light; }}
    body {{ background:#fff; color:#111; font-size:12px; }}
    header nav, .dl {{ display:none; }} header {{ border-color:#ccc; }}
    h2 {{ color:#075985; border-color:#ccc; }} th {{ background:#f1f5f9; color:#075985; }} th, td {{ border-color:#ccc; }}
    code, .tip {{ background:#f8fafc; border-color:#ddd; }} footer {{ color:#555; }} footer a {{ color:#075985; }}
  }}
</style>
</head>
<body>
<header>
  <h1>AimTrail</h1>
  <nav><a href="/panel.html">Ekor mouse</a><a href="/keys-panel.html">Keyboard &amp; mouse</a><a class="cur" href="/manual.html">Panduan</a></nav>
  <a class="dl" href="/Panduan-AimTrail.pdf" download>Unduh PDF</a>
</header>
<main>
  <div class="hero"><h2>Panduan Singkat</h2><p>{escape(SUB)}. Versi {VERSION}.</p></div>
{body}
</main>
<footer>Created by <b>Andromache</b> · TikTok <a href="{TIKTOK}" target="_blank" rel="noopener">@andromache.4k</a> · v{VERSION}</footer>
<script>
  // URL pada tabel mengikuti alamat/port yang sedang dipakai
  document.querySelectorAll('.o').forEach(e => {{ e.textContent = location.origin; }});
</script>
</body>
</html>
"""


# ----------------------------------------------------------------------------- PDF
def build_pdf(path):
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (Image, KeepTogether, ListFlowable, ListItem, Paragraph, SimpleDocTemplate,
                                    Spacer, Table, TableStyle)

    NAVY, SKY, INK, MUTED, LINE = colors.HexColor("#0b1220"), colors.HexColor("#0ea5e9"), colors.HexColor("#14202f"), \
        colors.HexColor("#5b6b7f"), colors.HexColor("#cbd5e1")
    body = ParagraphStyle("body", fontName="Helvetica", fontSize=9.6, leading=13.6, textColor=INK, alignment=TA_LEFT)
    h2 = ParagraphStyle("h2", parent=body, fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=colors.HexColor("#075985"),
                        spaceBefore=11, spaceAfter=4, keepWithNext=1)
    cell = ParagraphStyle("cell", parent=body, fontSize=8.8, leading=11.6)
    cellh = ParagraphStyle("cellh", parent=cell, fontName="Helvetica-Bold", textColor=colors.white)
    tip = ParagraphStyle("tip", parent=body, fontSize=9.2, leading=12.8, leftIndent=8, rightIndent=4)

    def md(t):
        t = escape(t).replace("{O}", "http://localhost:8765")
        t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
        t = re.sub(r"\*(.+?)\*", r"<i>\1</i>", t)
        return re.sub(r"`(.+?)`", r'<font name="Courier" size="8.6">\1</font>', t)

    def flows_for(blk):
        k = blk[0]
        if k == "p":
            return [Paragraph(md(blk[1]), body)]
        if k in ("ol", "ul"):
            items = [ListItem(Paragraph(md(i), body), leftIndent=12) for i in blk[1]]
            return [ListFlowable(items, bulletType="1" if k == "ol" else "bullet", start="1" if k == "ol" else "\u2022",
                                 bulletFontName="Helvetica-Bold", bulletFontSize=9, bulletColor=SKY, leftIndent=14)]
        if k == "tip":
            t = Table([[Paragraph(md(blk[1]), tip)]], colWidths=[174 * mm])
            t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
                                   ("LINEBEFORE", (0, 0), (0, -1), 2.2, SKY), ("TOPPADDING", (0, 0), (-1, -1), 5),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
            return [Spacer(1, 4), t, Spacer(1, 3)]
        ncol = len(blk[1])
        widths = [174 * mm / ncol] * ncol if ncol == 3 else [62 * mm, 112 * mm]
        data = [[Paragraph(md(h), cellh) for h in blk[1]]] + [[Paragraph(md(c), cell) for c in r] for r in blk[2]]
        t = Table(data, colWidths=widths, repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                               ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 4),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                               ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])]))
        return [Spacer(1, 4), t, Spacer(1, 2)]

    story, pending = [], None   # judul digabung dengan blok pertamanya agar tidak sendirian di dasar halaman
    for blk in CONTENT:
        if blk[0] == "h":
            pending = Paragraph(md(blk[1]), h2)
            continue
        flows = flows_for(blk)
        if pending is not None:
            story.append(KeepTogether([pending] + flows))
            pending = None
        else:
            story.extend(flows)

    def first_page(c, d):
        W, H = A4
        c.saveState()
        c.setFillColor(NAVY); c.rect(0, H - 40 * mm, W, 40 * mm, stroke=0, fill=1)
        icon = ROOT / "icon.png"
        if icon.exists():
            c.drawImage(str(icon), 16 * mm, H - 32 * mm, 24 * mm, 24 * mm, mask="auto")
        c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 22); c.drawString(46 * mm, H - 19 * mm, "AimTrail - Panduan Singkat")
        c.setFillColor(colors.HexColor("#7dd3fc")); c.setFont("Helvetica", 9.4)
        c.drawString(46 * mm, H - 26 * mm, "Ekor gerakan mouse + tampilan tombol keyboard & mouse untuk live stream")
        c.setFillColor(colors.HexColor("#8aa0b8")); c.setFont("Helvetica", 8.5); c.drawString(46 * mm, H - 32 * mm, f"Versi {VERSION}")
        c.restoreState(); footer(c, d)

    def footer(c, d):
        W, H = A4
        c.saveState()
        c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(18 * mm, 16 * mm, W - 18 * mm, 16 * mm)
        c.setFont("Helvetica", 8); c.setFillColor(MUTED)
        c.drawString(18 * mm, 11.5 * mm, CREDIT)
        c.drawRightString(W - 18 * mm, 11.5 * mm, f"Halaman {d.page}")
        c.restoreState()

    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm,
                            bottomMargin=22 * mm, title=TITLE, author="Andromache", subject="Panduan penggunaan AimTrail",
                            creator=CREDIT)
    story.insert(0, Spacer(1, 26 * mm))   # ruang untuk header halaman pertama
    doc.build(story, onFirstPage=first_page, onLaterPages=footer)


if __name__ == "__main__":
    (ROOT / "web" / "manual.html").write_text(build_html(), encoding="utf-8")
    build_pdf(ROOT / "web" / "Panduan-AimTrail.pdf")
    print("manual.html & Panduan-AimTrail.pdf dibuat")
