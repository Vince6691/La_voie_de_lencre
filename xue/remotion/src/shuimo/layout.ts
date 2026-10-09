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

export function compose(seed: number, o: { move: Move; mood: Mood; duration: number; dir?: 1 | -1 }): Shot {
  const R = rng(seed);
  const r = (a: number, b: number) => a + (b - a) * R();
  const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
  const of = (k: string) => EL.filter((e) => role(e) === k);
  const pieces: Piece[] = [];
  const add = (el: El, p: Omit<Piece, 'el' | 'flip'> & { flip?: boolean }) => pieces.push({ el, flip: p.flip ?? R() < 0.5, ...p });
  const dir = o.dir ?? (R() < 0.5 ? 1 : -1);
  const side = () => (R() < 0.5 ? r(220, 560) : r(1360, 1700)); // hors de la zone centrale du contenu

  // ciel
  if (o.mood === 'nuit' || R() < 0.7) {
    const k = o.mood === 'nuit' ? 'moon' : o.mood === 'aube' ? pick(['sun', 'sunmist']) : pick(['sun', 'sun', 'sunmist', 'moon']);
    add(pick(of(k)), { x: side(), y: r(170, 300), h: k === 'sunmist' ? r(150, 210) : r(140, 210), depth: 0.03, opacity: k === 'moon' ? 0.8 : 0.92, flip: false });
  }
  if (R() < 0.5) add(pick(of('cloud')), { x: r(300, 1600), y: r(150, 260), h: r(60, 100), depth: 0.08, opacity: 0.55, drift: r(-8, 8), breathe: true });
  // montagnes lointaines : une chaîne continue de bandes qui se chevauchent
  const baseFar = r(470, 540);
  for (let x = r(-350, -100); x < W + 300;) {
    const el = pick(of('lointain')), w = r(820, 1250), h = (w * el.h) / el.w;
    add(el, { x: x + w / 2, y: baseFar - h / 2 + r(-25, 25), h, depth: 0.12, opacity: r(0.6, 0.85) });
    x += w * r(0.5, 0.78);
  }
  // brume entre les plans
  for (let i = 0; i < 2; i++) {
    const el = pick(of('brume')), w = r(1100, 1700);
    add(el, { x: r(200, 1700), y: r(520, 600), h: (w * el.h) / el.w, depth: 0.22, opacity: r(0.3, 0.5), drift: r(-14, 14), breathe: true });
  }
  // pics du plan moyen, plutôt sur les côtés
  const peaks = [r(60, 460), r(1460, 1860), ...(R() < 0.5 ? [r(560, 760)] : []), ...(R() < 0.4 ? [r(1160, 1360)] : [])];
  const peakAt: { x: number; base: number; h: number }[] = [];
  peaks.forEach((x) => {
    const el = pick(of('pic')), h = r(300, 500), base = r(730, 810);
    add(el, { x, y: base - h / 2, h, depth: 0.38, opacity: r(0.78, 0.95) });
    peakAt.push({ x, base, h });
  });
  // détail de vie (cascade, pavillon, pont, sentier) au pied d'un pic
  if (R() < 0.5) {
    const p = pick(peakAt.slice(0, 2));
    add(pick(of('scene')), { x: p.x + r(-120, 120), y: p.base - r(60, 140), h: r(150, 230), depth: 0.4, opacity: 0.85 });
  }
  // brume basse
  const el2 = pick(of('brume')), w2 = r(1400, 2100);
  add(el2, { x: r(500, 1400), y: r(800, 880), h: (w2 * el2.h) / el2.w, depth: 0.55, opacity: r(0.35, 0.55), drift: r(-18, 18), breathe: true });
  if (R() < 0.35) add(pick(of('boat')), { x: r(500, 1400), y: r(830, 870), h: r(55, 85), depth: 0.5, opacity: 0.9, drift: dir * r(10, 18) });
  // oiseaux qui traversent
  if (o.mood !== 'nuit' && R() < 0.55) add(pick(of('birds')), { x: dir > 0 ? r(150, 500) : r(1400, 1750), y: r(200, 340), h: r(100, 150), depth: 0.3, opacity: 0.85, drift: dir * r(28, 45), flip: dir < 0 });
  // premiers plans dans un ou deux coins
  const sides: ('l' | 'r')[] = R() < 0.4 ? ['l', 'r'] : [R() < 0.5 ? 'l' : 'r'];
  sides.forEach((s) => {
    const el = pick(of('premier'));
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
  const ink: InkEvent[] = edgeStrokes(Math.floor(R() * 1e6), Array.from({ length: n }, (_, i) => 1 + ((o.duration - 3.5) * (i + r(0.1, 0.8))) / n));
  pieces.sort((a, b) => a.depth - b.depth);
  return { pieces, ink, move: o.move, mood: o.mood, dir };
}
