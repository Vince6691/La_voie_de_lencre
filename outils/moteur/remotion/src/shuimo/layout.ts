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
import type { Volee } from './Oiseaux';
import type { Grue } from './Grue';
import { POEMES } from './poemes';
// poème posé dans le fond du plan (Poeme.tsx) : x centre de la 1re colonne, profondeur entre lointain et massifs
export type PoemeFond = { vers: string[]; source: string; x: number; top: number; taille: number; force: number; debut: number; duree: number; depth: number };
// seed : graine du plan (elle donne aussi son vent, voir vent() dans common.ts) ; volees : oiseaux dessinés
export type Shot = { pieces: Piece[]; ink: InkEvent[]; move: Move; mood: Mood; dir: 1 | -1; seed?: number; volees?: Volee[]; grues?: Grue[]; poeme?: PoemeFond; vent?: boolean };

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
// les plans et au premier plan, désactivées par défaut), strokes (coups de pinceau du skill coup-de-pinceau, désactivés),
// vent : rend le vent visible (nuages qui passent, feuilles emportées, Vent.tsx)
// poeme : un distique de la banque poemes.ts dans le fond du plan (true : tiré par la graine ; un nombre : cette entrée)
// grues : nombre de petites grues du Japon qui traversent le ciel (marionnettes peintes, Grue.tsx ; 0 par défaut)
// oiseaux : 'image' (volée détourée qui glisse, par défaut) ou 'vol' (oiseaux dessinés qui battent des ailes, Oiseaux.tsx)
export type ComposeOptions = { move: Move; mood: Mood; duration: number; dir?: 1 | -1; clouds?: boolean; mist?: boolean; strokes?: boolean; oiseaux?: 'image' | 'vol'; grues?: number; poeme?: boolean | number; vent?: boolean; front?: boolean /* premiers plans en coin, activés par défaut */ };
export function compose(seed: number, o: ComposeOptions): Shot {
  const R = rng(seed);
  const r = (a: number, b: number) => a + (b - a) * R();
  const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
  // jamais deux fois le même élément dans un plan (sauf si la famille est épuisée)
  const used = new Set<string>();
  const pickNew = (a: El[]) => { const free = a.filter((e) => !used.has(e.file)); const e = pick(free.length ? free : a); used.add(e.file); return e; };
  const of = (k: string) => EL.filter((e) => role(e) === k);
  const pieces: Piece[] = [];
  const volees: Volee[] = [];
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
  // nuages qui passent, portés par le vent (option vent) : 3 bandes à des hauteurs et vitesses différentes, dont
  // certaines entrent par le bord d'où vient le vent ; tirées à part pour ne rien changer au reste du plan
  if (o.vent) {
    const C = rng(seed * 131 + 7), c = (a: number, b: number) => a + (b - a) * C();
    for (let k = 0; k < 3; k++) {
      const el = of('cloud')[Math.floor(C() * of('cloud').length)];
      const x = k === 0 ? c(300, W - 300) : dir > 0 ? c(-500, 400) : c(W - 400, W + 500);
      add(el, { x, y: c(110, 330), h: c(75, 145), depth: c(0.05, 0.1), opacity: c(0.4, 0.62), drift: dir * c(10, 24), breathe: true, flip: C() < 0.5 });
    }
  }
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
  // (les tirages restent dans le même ordre dans les deux modes : le reste du plan ne change pas)
  if (o.mood !== 'nuit' && R() < 0.55) {
    const el = pick(of('birds'));
    const x = dir > 0 ? r(150, 500) : r(1400, 1750), y = r(200, 340), h = r(100, 150), drift = dir * r(28, 45);
    // la volée peut aussi voler contre le vent : départ du côté opposé (tirage à part)
    const vd: 1 | -1 = rng(seed * 53 + 1)() < 0.5 ? dir : (-dir as 1 | -1), vx = vd === dir ? x : W - x;
    if (o.oiseaux === 'vol') volees.push({ seed: seed * 7919 + 13, x: vx, y, dir: vd, speed: Math.abs(drift) * 1.6, n: 3 + Math.floor((h - 100) / 10), size: h / 4.5, depth: 0.3, opacity: 0.85 });
    else add(el, { x, y, h, depth: 0.3, opacity: 0.85, drift, flip: dir < 0 });
  }
  // petites grues (tirées à part pour ne rien changer au reste du plan) : elles traversent lentement le ciel, l'une
  // déjà dans le cadre, les autres entrant par le bord d'où elles viennent ; plus bas que la bande des petites volées
  const grues: Grue[] = [];
  if (o.grues) {
    const C = rng(seed * 977 + 3), c = (a: number, b: number) => a + (b - a) * C();
    for (let k = 0; k < o.grues; k++) {
      // chaque grue a son sens ; une sur deux environ monte doucement, les autres volent à l'horizontale
      const gd: 1 | -1 = C() < 0.5 ? 1 : -1;
      let x = k === 0 ? (gd > 0 ? c(250, 700) : c(W - 700, W - 250)) : gd > 0 ? c(-400, -120) : c(W + 120, W + 400);
      // une grue qui vole dans le sens d'une volée part loin devant elle (ou derrière, si devant sort du cadre) : elles
      // ne traversent pas le ciel ensemble
      const fl = volees.find((v) => v.dir === gd && Math.abs(v.x - x) < 650);
      if (fl) { const ecart = c(700, 950), devant = fl.x + gd * ecart; x = devant > 150 && devant < W - 150 ? devant : fl.x - gd * ecart; }
      const rise = C() < 0.5 ? 0 : c(4, 10);
      grues.push({ seed: seed * 31 + k, x, y: c(340, 440), dir: gd, speed: c(32, 48), rise, size: c(80, 120), depth: 0.32, opacity: 0.95 });
    }
  }
  // premiers plans dans un ou deux coins
  const sides: ('l' | 'r')[] = R() < 0.4 ? ['l', 'r'] : [R() < 0.5 ? 'l' : 'r'];
  sides.forEach((s) => {
    if (o.front === false) return;
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
  // poème dans le fond (tirage à part) : côté opposé au soleil ou à la lune, haut du ciel, derrière les massifs ;
  // il apparaît peu après le début du plan et s'est effacé avant la fin
  let poeme: PoemeFond | undefined;
  if (o.poeme !== undefined && o.poeme !== false) {
    const P = rng(seed * 613 + 9), p = (a: number, b: number) => a + (b - a) * P();
    const banque = POEMES.filter((q) => !!q.nuit === (o.mood === 'nuit'));
    const q = typeof o.poeme === 'number' ? POEMES[o.poeme % POEMES.length] : banque[Math.floor(P() * banque.length)];
    const astre = pieces.find((pc) => pc.depth === 0.03);
    const droite = astre ? astre.x < W / 2 : P() < 0.5;
    const long = Math.max(...q.vers.map((v) => [...v].length)) > 5;
    const taille = long ? p(36, 42) : p(42, 52), debut = p(0.6, 1.8);
    poeme = {
      vers: q.vers, source: q.source, taille, debut, duree: Math.max(2, o.duration - debut - 2.6 - p(0.3, 1)),
      x: droite ? p(1480, 1750) : p(330, 560), top: p(70, 180), force: p(0.2, 0.28), depth: 0.2,
    };
  }
  pieces.sort((a, b) => a.depth - b.depth);
  return { pieces, ink, move: o.move, mood: o.mood, dir, seed, volees, grues, poeme, vent: o.vent };
}
