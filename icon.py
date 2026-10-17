# -*- coding: utf-8 -*-
"""Ikon AimTrail: ekor biru bercahaya dengan titik & cincin (sesuai tema overlay).
Dipakai untuk ikon tray (runtime) dan membuat icon.ico untuk .exe:  python icon.py"""
import math

from PIL import Image, ImageDraw, ImageFilter


def _bezier(p, t):
    u = 1 - t
    return (u**3 * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t**3 * p[3][0],
            u**3 * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t**3 * p[3][1])


def make_icon(size=256):
    S = 1024
    bg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22), fill=(11, 18, 32, 255))
    for i in range(1, 6):                       # grid halus seperti contoh SVG
        c = int(S * i / 6)
        d.line((c, 0, c, S), fill=(27, 42, 64, 255), width=3)
        d.line((0, c, S, c), fill=(27, 42, 64, 255), width=3)

    pts = [(0.15 * S, 0.76 * S), (0.34 * S, 0.22 * S), (0.52 * S, 0.92 * S), (0.78 * S, 0.30 * S)]
    n = 260
    core, glow = Image.new("RGBA", (S, S), (0, 0, 0, 0)), Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dc, dg = ImageDraw.Draw(core), ImageDraw.Draw(glow)
    for i in range(n + 1):
        t = i / n
        x, y = _bezier(pts, t)
        a = int(255 * (0.06 + 0.94 * t ** 1.4))   # makin baru makin terang
        r = S * (0.010 + 0.032 * t)
        dc.ellipse((x - r, y - r, x + r, y + r), fill=(56, 189, 248, a))
        g = S * (0.03 + 0.07 * t)
        dg.ellipse((x - g, y - g, x + g, y + g), fill=(14, 165, 233, int(a * 0.55)))
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.035))

    hx, hy = pts[3]
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ring)
    rr = S * 0.105
    dr.ellipse((hx - rr, hy - rr, hx + rr, hy + rr), outline=(56, 189, 248, 190), width=int(S * 0.014))
    r2 = S * 0.052
    dr.ellipse((hx - r2, hy - r2, hx + r2, hy + r2), fill=(224, 242, 254, 255))
    halo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse((hx - rr * 1.6, hy - rr * 1.6, hx + rr * 1.6, hy + rr * 1.6), fill=(56, 189, 248, 90))
    halo = halo.filter(ImageFilter.GaussianBlur(S * 0.05))

    out = Image.alpha_composite(bg, glow)
    out = Image.alpha_composite(out, halo)
    out = Image.alpha_composite(out, core)
    out = Image.alpha_composite(out, ring)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22), fill=255)
    out.putalpha(Image.composite(out.getchannel("A"), Image.new("L", (S, S), 0), mask))
    return out.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    img = make_icon(256)
    img.save("icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    img.save("icon.png")
    print("icon.ico & icon.png dibuat")
