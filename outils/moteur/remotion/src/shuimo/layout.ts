// Composition d'un plan shuimo à partir de la banque d'éléments (tools/build_shuimo.py → src/data/shuimo.json).
// Une graine → un paysage : ciel, montagnes lointaines, brume, pics, détail de vie, premiers plans en coin,
// et le calendrier des événements d'encre. Même graine, même plan ; deux graines, deux plans différents.
import index from '../data/shuimo.json';

export type El = { file: string; family: string; w: number; h: number; edges: string };
export type Piece = {
  el: El; x: number; y: number; h: number; flip: boolean; depth: number; opacity: number;
  drift?: number; breathe?: boolean;
};
export type { InkEvent } from './common';
import type { InkEvent } from './common';
export type Move = 'pan' | 'push' | 'rise' | 'focus' | 'still';
export type Mood = 'jour' | 'aube' | 'nuit' | 'brume';
export type Shot = { pieces: Piece[]; ink: InkEvent[]; move: Move; mood: Mood; dir: 1 | -1 };

const EL = index as El[];
// rôle des éléments dont la planche mélange plusieurs sortes d'objets
const ROLE: Record<string, string> = {
  'vie_a6.png': 'birds', 'vie_b6.png': 'birds', 'vie_a2.png': 'boat', 'vie_b3.png': 'boat',
  'ciel_a1.png': 'sun', 'ciel_b1.png': 'sun', 'ciel_a2.png': 'sunmist', 'ciel_b3.png': 'sunmist',
  'ciel_a3.png': 'moon', 'ciel_b2.png': 'moon', 'ciel_a4.png': 'moon', 'ciel_b4.png': 'moon',
  'ciel_a5.png': 'cloud', 'ciel_b5.png': 'cloud',
};
const role = (e: El) => ROLE[e.file] ?? (e.family === 'vie' ? 'scene' : e.family);

export { rng, W, H } from './common';
import { rng, W, H } from './common';
import { edgeStrokes } from './InkEvents';

// options : clouds (bandes de nuages du ciel et soleil voilé, activés par défaut), mist (nappes de brouillard entre
// les plans et au premier plan, désactivées par défaut), strokes (coups de pinceau du skill coup-de-pinceau, désactivés)
export type ComposeOptions = { move: Move; mood: Mood; duration: number; dir?: 1 | -1; clouds?: boolean; mist?: boolean; strokes?: boolean };
export function compose(seed: number, o: ComposeOptions): Shot {
  const R = rng(seed);
  const r = (a: number, b: number) => a + (b - a) * R();
  const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
  // jamais deux fois le même élément dans un plan (sauf si la famille est épuisée)
  const used = new Set<string>();
  const pickNew = (a: El[]) => { const free = a.filter((e) => !used.has(e.file)); const e = pick(free.length ? free : a); used.add(e.file); return e; };
  const of = (k: string) => EL.filter((e) => role(e) === k);
  const pieces: Piece[] = [];
  const add = (el: El, p: Omit<Piece, 'el' | 'flip'> & { flip?: boolean }) => pieces.push({ el, flip: p.flip ?? R() < 0.5, ...p });
  const dir = o.dir ?? (R() < 0.5 ? 1 : -1);
  const side = () => (R() < 0.5 ? r(220, 560) : r(1360, 1700)); // hors de la zone centrale du contenu

  // ciel
  if (o.mood === 'nuit' || R() < 0.7) {
    const clouds = o.clouds ?? true;
    const sunmist = clouds ? ['sunmist'] : []; // soleil voilé d'une bande de nuage
    const k = o.mood === 'nuit' ? 'moon' : o.mood === 'aube' ? pick(['sun', ...sunmist]) : pick(['sun', 'sun', ...sunmist, 'moon']);
    add(pick(of(k)), { x: side(), y: r(170, 300), h: k === 'sunmist' ? r(150, 210) : r(140, 210), depth: 0.03, opacity: k === 'moon' ? 0.8 : 0.92, flip: false });
  }
  if ((o.clouds ?? true) && R() < 0.5) add(pick(of('cloud')), { x: r(300, 1600), y: r(150, 260), h: r(60, 100), depth: 0.08, opacity: 0.55, drift: r(-8, 8), breathe: true });
  // montagnes lointaines : une chaîne continue de bandes qui se chevauchent
  const baseFar = r(470, 540);
  for (let x = r(-350, -100); x < W + 300;) {
    const el = pickNew(of('lointain').filter((e) => !e.edges.includes('l') && !e.edges.includes('r'))), w = r(820, 1250), h = (w * el.h) / el.w;
    add(el, { x: x + w / 2, y: baseFar - h / 2 + r(-25, 25), h, depth: 0.12, opacity: r(0.6, 0.85) });
    x += w * r(0.5, 0.78);
  }
  // brume entre les plans
  for (let i = 0; i < (o.mist ? 2 : 0); i++) {
    const el = pick(of('brume')), w = r(1100, 1700);
    add(el, { x: r(200, 1700), y: r(520, 600), h: (w * el.h) / el.w, depth: 0.22, opacity: r(0.3, 0.5), drift: r(-14, 14), breathe: true });
  }
  // pics du plan moyen, plutôt sur les côtés
  const peakAt: { x: number; base: number; h: number }[] = [];
  const massifs = of('massif');
  if (massifs.length) {
    // massifs (planches 08) : un massif coupé par le bord de sa planche est calé contre un bord du cadre, côté coupé
    // hors champ (retourné en miroir si besoin) ; un massif entier se place librement
    const over = 150; // marge hors cadre : travelling et zoom ne découvrent pas la coupure
    (['l', 'r'] as const).forEach((side) => {
      if (R() < 0.12) return; // parfois un seul massif, plus d'air
      const free = massifs.filter((e) => !used.has(e.file));
      if (!free.length) return;
      const el = pick(free); used.add(el.file);
      const w = r(780, 1050), h = (w * el.h) / el.w, base = r(745, 800);
      const cut = el.edges.includes('l') || el.edges.includes('r');
      const x = cut ? (side === 'l' ? w / 2 - over : W - w / 2 + over) : side === 'l' ? r(200, 480) : r(1440, 1720);
      // le côté coupé doit tomber hors champ : à gauche il faut 'l', à droite 'r' (sinon miroir)
      const flip = el.edges === 'lr' ? R() < 0.5 : cut ? !el.edges.includes(side) : R() < 0.5;
      add(el, { x, y: base - h / 2, h, depth: 0.38, opacity: r(0.78, 0.95), flip });
      peakAt.push({ x: side === 'l' ? 320 : 1600, base, h });
    });
  } else {
    // ancienne banque : pics isolés
    [r(60, 460), r(1460, 1860)].forEach((x) => {
      const el = pickNew(of('pic')), h = r(300, 500), base = r(730, 810);
      add(el, { x, y: base - h / 2, h, depth: 0.38, opacity: r(0.78, 0.95) });
      peakAt.push({ x, base, h });
    });
  }
  // détail de vie (cascade, pavillon, pont, sentier) au pied d'un pic
  if (R() < 0.5) {
    const p = pick(peakAt.length ? peakAt : [{ x: 400, base: 770, h: 300 }]);
    add(pick(of('scene')), { x: p.x + r(-120, 120), y: p.base - r(60, 140), h: r(150, 230), depth: 0.4, opacity: 0.85 });
  }
  // brume basse
  const el2 = pick(of('brume')), w2 = r(1400, 2100);
  if (o.mist) add(el2, { x: r(500, 1400), y: r(800, 880), h: (w2 * el2.h) / el2.w, depth: 0.55, opacity: r(0.35, 0.55), drift: r(-18, 18), breathe: true });
  if (R() < 0.35) add(pick(of('boat')), { x: r(500, 1400), y: r(830, 870), h: r(55, 85), depth: 0.5, opacity: 0.9, drift: dir * r(10, 18) });
  // oiseaux qui traversent
  if (o.mood !== 'nuit' && R() < 0.55) add(pick(of('birds')), { x: dir > 0 ? r(150, 500) : r(1400, 1750), y: r(200, 340), h: r(100, 150), depth: 0.3, opacity: 0.85, drift: dir * r(28, 45), flip: dir < 0 });
  // premiers plans dans un ou deux coins
  const sides: ('l' | 'r')[] = R() < 0.4 ? ['l', 'r'] : [R() < 0.5 ? 'l' : 'r'];
  sides.forEach((s) => {
    const el = pickNew(of('premier'));
    const top = el.edges.includes('t');
    const h = top ? r(440, 580) : r(470, 680), w = (h * el.w) / el.h;
    const natural = el.edges.includes('l') ? 'l' : el.edges.includes('r') ? 'r' : null;
    const flip = natural ? natural !== s : R() < 0.5;
    const x = s === 'l' ? w / 2 - r(30, 140) : W - w / 2 + r(30, 140);
    const y = top ? h / 2 - r(10, 60) : H - h / 2 + r(30, 110);
    add(el, { x, y, h, depth: 0.85, opacity: 1, flip });
  });

  // coups de pinceau : 2 ou 3, répartis dans le plan, le long des bords (InkEvents.tsx)
  const n = 2 + (R() < 0.5 ? 1 : 0);
  const ink: InkEvent[] = !o.strokes ? [] : edgeStrokes(Math.floor(R() * 1e6), Array.from({ length: n }, (_, i) => 1 + ((o.duration - 3.5) * (i + r(0.1, 0.8))) / n));
  pieces.sort((a, b) => a.depth - b.depth);
  return { pieces, ink, move: o.move, mood: o.mood, dir };
}
