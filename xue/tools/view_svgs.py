"""Planche de contrôle des glyphes SVG (assets/glyphs) : chaque tracé numéroté sur fond neutre."""
import re, sys, glob, os
from playwright.sync_api import sync_playwright
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
files = sorted(glob.glob('assets/glyphs/*.svg'))
cells = []
for f in files:
    s = open(f).read()
    cells.append(f'<div class=c><div class=t>{os.path.basename(f)}</div><div class=g>{s}</div></div>')
html = '<html><body style="margin:0;background:#bbb;font:16px sans-serif"><style>.c{display:inline-block;margin:6px;background:#888}.g svg{width:460px;height:460px;display:block}.t{padding:4px}</style>' + ''.join(cells) + '</body></html>'
open('out/glyphs.html', 'w').write(html)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME); pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.goto('file://' + os.path.abspath('out/glyphs.html')); pg.screenshot(path='out/glyphs.png', full_page=True); b.close()
