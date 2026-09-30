"""Fiche caractère : n'importe quel caractère chinois tracé à l'encre noire, dans l'ordre de ses traits,
sur papier xuan clair (étiquette d'époque, pinyin, compteur de traits vermillon, sceau).

Exemples :
  python3 make.py 福                                   → sorties/福.png
  python3 make.py 學 --video                           → sorties/學.png + sorties/學.mp4 (tracé animé)
  python3 make.py 学 --label 简体字 --title "simplifié" --subtitle "Chine · 1956" --video
  python3 make.py 永 --pinyin yǒng --unit STROKES --unit1 STROKE     (version anglaise)

Tracés : Make Me a Hanzi (paquet npm hanzi-writer-data, licence Arphic Public License), installé
automatiquement dans node_modules/ au premier usage. Pinyin : pypinyin (installé si absent).
Polices : ../xue/assets/fonts (LXGW WenKai TC, Noto Serif TC, Cinzel, Cormorant)."""
import argparse, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', 'xue', 'assets', 'fonts')
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'


def strokes(ch):
    base = os.path.join(HERE, 'node_modules', 'hanzi-writer-data')
    if not os.path.isdir(base):
        print('installation de hanzi-writer-data (données de tracé)…')
        subprocess.run(['npm', 'install', '--silent', '--no-save', '--prefix', HERE, 'hanzi-writer-data@2'], check=True)
    p = os.path.join(base, f'{ch}.json')
    if not os.path.exists(p):
        sys.exit(f'« {ch} » absent de Make Me a Hanzi (environ 9 500 caractères couverts).')
    return json.load(open(p, encoding='utf-8'))


def pinyin_of(ch):
    try:
        from pypinyin import pinyin
    except ImportError:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'pypinyin'], check=True)
        from pypinyin import pinyin
    return pinyin(ch)[0][0]


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('char', help='le caractère (un seul)')
    a.add_argument('--pinyin', help='pinyin affiché (par défaut : pypinyin)')
    a.add_argument('--label', default='楷書', help="étiquette d'époque en chinois (vide : pas d'étiquette)")
    a.add_argument('--title', default='kaishu', help="nom de l'écriture (affiché en capitales)")
    a.add_argument('--subtitle', default='écriture régulière · canon des Tang')
    a.add_argument('--seal', help='caractère du sceau (par défaut : le caractère ; vide : pas de sceau)')
    a.add_argument('--unit', default='TRAITS'); a.add_argument('--unit1', default='TRAIT')
    a.add_argument('--video', action='store_true', help='produit aussi le tracé animé (MP4)')
    a.add_argument('--per-stroke', type=float, default=0.28, help='secondes par trait dans la vidéo')
    a.add_argument('--hold', type=float, default=2.0, help='secondes de pause sur la fiche complète')
    a.add_argument('--fps', type=int, default=30)
    a.add_argument('--out', default=os.path.join(HERE, 'sorties'))
    o = a.parse_args()
    ch = o.char.strip()
    if len(ch) != 1: sys.exit('un seul caractère à la fois')
    data = strokes(ch)
    n = len(data['strokes'])
    draw = max(2.5, n * o.per_stroke)
    fiche = {'data': data, 'pinyin': o.pinyin or pinyin_of(ch), 'label': o.label, 'title': o.title,
             'subtitle': o.subtitle, 'seal': ch if o.seal is None else o.seal, 'unit': o.unit, 'unit1': o.unit1, 'draw': draw}
    os.makedirs(o.out, exist_ok=True)

    from playwright.sync_api import sync_playwright
    fonts = [('Kai', 'LXGWWenKaiTC-Bold.ttf', '400'), ('Song', 'NotoSerifTC-Bold.otf', '400 700'),
             ('Cinzel', 'Cinzel.ttf', '400 900'), ('Cormorant', 'Cormorant.ttf', '300 700')]
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None)
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        pg.goto('file://' + os.path.join(HERE, 'fiche.html'))
        pg.evaluate("""async (fonts) => {
            for (const [fam, url, w] of fonts) { const f = new FontFace(fam, `url(${url})`, { weight: w }); await f.load(); document.fonts.add(f); }
        }""", [[f, 'file://' + os.path.abspath(os.path.join(FONTS, u)), w] for f, u, w in fonts])
        pg.evaluate('(f) => { window.FICHE = f; }', fiche)
        canvas = pg.locator('#c')
        pg.evaluate(f'window.draw({draw + 3})')
        png = os.path.join(o.out, f'{ch}.png')
        canvas.screenshot(path=png)
        print('image :', png)
        if o.video:
            import imageio_ffmpeg
            total = draw + 0.8 + o.hold
            mp4 = os.path.join(o.out, f'{ch}.mp4')
            with tempfile.TemporaryDirectory() as tmp:
                for i in range(int(total * o.fps)):
                    pg.evaluate(f'window.draw({i / o.fps})')
                    canvas.screenshot(path=os.path.join(tmp, f'{i:05d}.png'))
                subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-framerate', str(o.fps),
                                '-i', os.path.join(tmp, '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', mp4], check=True)
            print('vidéo :', mp4, f'({total:.1f} s, {n} traits)')
        b.close()


if __name__ == '__main__':
    main()
