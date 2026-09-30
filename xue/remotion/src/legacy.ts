// Charge le moteur de dessin Canvas du projet principal (scripts globaux) et les polices,
// une seule fois par onglet de rendu.
import { staticFile } from 'remotion';

type Flags = { three: boolean; captions: boolean };
export const W = () => window as unknown as Record<string, any>;

let loading: Promise<void> | null = null;

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`script introuvable : ${src}`));
    document.head.appendChild(s);
  });

const FONTS: [string, string, string][] = [
  ['Kai', 'fonts/LXGWWenKaiTC-Bold.ttf', '400'],
  ['Song', 'fonts/NotoSerifTC-Bold.otf', '400 700'],
  ['Cinzel', 'fonts/Cinzel.ttf', '400 900'],
  ['Cormorant', 'fonts/Cormorant.ttf', '300 700'],
];

export const loadLegacy = (flags: Flags) => {
  // l'objet FLAGS est partagé avec scenes.js : on le met à jour à chaque rendu
  W().FLAGS = Object.assign(W().FLAGS || {}, flags);
  if (!loading) {
    loading = (async () => {
      await Promise.all(
        FONTS.map(async ([family, file, weight]) => {
          const f = new FontFace(family, `url(${staticFile(file)})`, { weight });
          await f.load();
          document.fonts.add(f);
        }),
      );
      for (const f of ['vendor/gsap.min.js', 'vendor/MorphSVGPlugin.min.js', 'vendor/CustomEase.min.js', 'vendor/brush.js', 'timeline.js', 'warp.js', 'geodata.js', 'fontglyphs.js', 'strokes.js', 'realglyphs.js', 'shuowen.js', 'glyphs.js', 'engine.js', 'lavis.js', 'scenes.js']) {
        await loadScript(staticFile(`legacy/${f}`));
      }
    })();
  }
  return loading;
};

// temps global d'une ancre de scène (k = n° de clip de voix, old = temps dans la 1re prise)
export const anchor = (k: number, old: number): number => W().ANCHOR(k, old);
export const sceneTime = (k: number, t: number): number => W().VTIME(k, t);
