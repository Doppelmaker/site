#!/usr/bin/env python3
"""Build the site: wraps each fragment in pages/ with the shared header and footer.

    python3 build.py

Writes the top-level .html files that GitHub Pages serves. Edit pages/*.html, not the output.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent

PAGES = {
    # file: (title, description, nav key, extra head)
    "index.html": ("Doppelmaker: custom dress forms and wig heads from your iPhone",
                   "Scan a person with two iPhones and 3D print a dress form or wig head that measures like them.",
                   "home", '<script type="importmap">{"imports":{"three":"/js/three.module.min.js"}}</script>'),
    "how-it-works.html": ("How it works · Doppelmaker",
                          "How Doppelmaker turns camera, LiDAR and motion data into a printable body double, explained without the maths.",
                          "how", ""),
    "guide.html": ("A scan, start to finish · Doppelmaker",
                   "A walkthrough of a Doppelmaker session in Studio: what you see, what to do and what the messages mean.",
                   "guide", ""),
    "rig.html": ("The rig · Doppelmaker",
                 "The capture setup: two or three iPhones, a turntable and a few printed parts, and what makes a good scan.",
                 "rig", ""),
    "technical.html": ("How Doppelmaker measures: a technical paper · Doppelmaker",
                       "Every stage from photons to a closed, measured surface: calibration, timing, outlines, LiDAR, tracking and closing, with the numbers and the open questions.",
                       "technical", ""),
    "support.html": ("Support · Doppelmaker", "Help with Doppelmaker Scanner and Doppelmaker Studio.", "support", ""),
    "privacy.html": ("Privacy policy · Doppelmaker", "How Doppelmaker handles your data: it stays on your own devices.", "privacy", ""),
    "404.html": ("Not found · Doppelmaker", "Page not found.", "", ""),
}

NAV = [("how", "/how-it-works.html", "How it works"), ("rig", "/rig.html", "The rig"), ("guide", "/guide.html", "Guide"),
       ("technical", "/technical.html", "Technical"),
       ("support", "/support.html", "Support")]

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://doppelmaker.app/img/og.png">
<meta name="theme-color" content="#1f4d45">
<link rel="icon" href="/img/favicon-64.png" type="image/png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="preload" href="/fonts/young-serif-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/style.css">
{extra}
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="/"><img src="/img/favicon-64.png" alt="" width="32" height="32">Doppelmaker</a>
<nav aria-label="Main">{nav}</nav>
</div></header>
"""

FOOT = """<footer class="foot"><div class="wrap">
<span>&copy; 2026 Greg Link. Doppelmaker is an independent project.</span>
<a href="/support.html">Support</a>
<a href="/privacy.html">Privacy</a>
</div></footer>
</body>
</html>
"""


def build():
    for name, (title, desc, key, extra) in PAGES.items():
        nav = "".join(f'<a href="{h}"{" aria-current=\"page\"" if k == key else ""}>{t}</a>' for k, h, t in NAV)
        body = (ROOT / "pages" / name).read_text()
        (ROOT / name).write_text(HEAD.format(title=title, desc=desc, nav=nav, extra=extra) + body + FOOT)
        print("wrote", name)


if __name__ == "__main__":
    build()
