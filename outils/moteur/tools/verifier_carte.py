"""Vérifie qu'une carte peinte (skill carte-peinte) tombe sur son image-guide : superpose en rouge les contours du guide
(côtes, lacs, fleuves, bords des reliefs) sur la carte peinte ramenée à 1920 × 1080. Écrit <sortie> (défaut : out/verif_<id>.jpg).

    python3 tools/verifier_carte.py chine_centre_nord [sortie.jpg]
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageFilter

ICI = Path(__file__).resolve().parent.parent
CARTES = ICI / 'assets' / 'cartes'


def verifier(ident, sortie=None):
    cat = json.loads((CARTES / 'cartes.json').read_text())
    c = next((c for c in cat['cartes'] if c['id'] == ident), None)
    if c is None:
        sys.exit(f"carte inconnue : {ident}")
    peinte = Image.open(CARTES / c['peinte']).convert('RGB')
    w, h = peinte.size
    if abs(w / h - 16 / 9) > 0.02:
        print(f"attention : format {w}×{h} (pas 16:9), la carte sera déformée")
    peinte = peinte.resize((1920, 1080), Image.LANCZOS)
    guide = Image.open(CARTES / c['guide']).convert('L').resize((1920, 1080), Image.LANCZOS)
    masque = guide.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.FIND_EDGES).point(lambda v: 230 if v > 28 else 0)
    rouge = Image.new('RGB', (1920, 1080), (220, 30, 30))
    peinte.paste(rouge, (0, 0), masque)
    sortie = Path(sortie or ICI / 'out' / f'verif_{ident}.jpg')
    sortie.parent.mkdir(parents=True, exist_ok=True)
    peinte.save(sortie, quality=88)
    print(sortie)


if __name__ == '__main__':
    verifier(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
