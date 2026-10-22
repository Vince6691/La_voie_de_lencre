// Chronologie sonore du panel d'évolution : l'instant exact où chaque pièce se pose, où chaque sceau est frappé, où la caméra file.
// Calculée avec les mêmes formules que l'animation (Hall3D, HallEvolution) puis exportée en JSON (exportHallEvents.mjs) pour mixer
// la bande son (tools/build_hall_audio.py) : l'image et le son restent calés.
import { DUR, T0, T_INTRO } from './params';

export type EvKind = 'bois' | 'clic' | 'toit' | 'impact' | 'cloche' | 'gong' | 'or' | 'souffle' | 'tac' | 'note' | 'pinceau';
export type Ev = { t: number; k: EvKind; v: number; f?: number; n?: number };

const ang = (x: number, z: number) => ((((0.5191 - Math.atan2(z, x)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
const HD = 2;
// piliers du hall à 7 travées (Tang, Song) : rangées de façade et de fond, et trois piliers par pignon
const RING: [number, number][] = (() => {
  const r: [number, number][] = [];
  [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].forEach((x) => { r.push([x, -HD]); r.push([x, HD]); });
  [-1, 0, 1].forEach((z) => { r.push([-3.5, z]); r.push([3.5, z]); });
  return r;
})();

// sceaux d'époque (mêmes instants que ARR dans HallEvolution) : frappe, envol
export const SEALS = [{ n: 0, stamp: 1.15, fly0: 1.3 }].concat([1, 2, 3].map((n) => { const te = T0 + DUR * n; return { n, stamp: te - 0.55, fly0: te - 0.4 }; }));
// notes de la mélodie : une par époque (pentatonique : ré, mi, sol, la), puis l'accord final
export const NOTES = [293.66, 329.63, 392.0, 440.0];

export function hallEvents(): { total: number; events: Ev[] } {
  const ev: Ev[] = [];
  const at = (t: number, k: EvKind, v: number, extra: Partial<Ev> = {}) => ev.push({ t: +t.toFixed(3), k, v, ...extra });

  // ── ouverture : le socle pousse, les colonnes tombent en cercle, les consoles se remontent, le toit descend
  at(0.12, 'bois', 0.5, { f: 0.7 });
  RING.forEach(([x, z]) => at(((0.12 + ((1 + ang(x, z) * 0.5) / 1.5) * 0.5)) * T_INTRO, 'bois', 0.5));
  RING.forEach(([x, z]) => at((0.5 + ((1 + ang(x, z) * 0.5) / 1.5) * 0.3) * T_INTRO, 'clic', 0.3));
  at(T_INTRO, 'toit', 0.9); at(T_INTRO, 'impact', 0.7);
  at(0.15, 'souffle', 0.5);

  // ── Tang → Song : chaque colonne est remplacée, tour à tour ; le socle s'affine
  const t1 = T0, t2 = T0 + DUR, t3 = T0 + DUR * 2;
  at(t1 + 0.1, 'souffle', 0.5);
  at(t1 + DUR * 0.3, 'impact', 0.35);
  RING.forEach(([x, z]) => at(t1 + DUR * ((1 + ang(x, z) * 0.7) / 1.7), 'bois', 0.55));
  at(t1 + DUR * 0.55, 'pinceau', 0.3);

  // ── Song → Ming : le marbre monte, les balustres arrivent, chaque jeu de consoles s'ouvre puis se referme, les bêtes de faîte montent
  at(t2 + 0.1, 'souffle', 0.55);
  at(t2 + DUR * 0.25, 'impact', 0.45);
  [0.15, 0.22, 0.3, 0.38, 0.46, 0.5].forEach((k) => at(t2 + DUR * k, 'clic', 0.32));
  RING.forEach(([x, z]) => { const a = ang(x, z); at(t2 + DUR * ((0.5 + a * 0.7) / 1.7), 'clic', 0.38); at(t2 + DUR * ((1 + a * 0.7) / 1.7), 'clic', 0.22); });
  [0.6, 0.68, 0.76].forEach((k) => at(t2 + DUR * k, 'clic', 0.3));

  // ── Ming → Qing : le toit s'aplatit, l'étage tombe, les bêtes de faîte montent
  at(t3 + 0.1, 'souffle', 0.6);
  at(t3 + DUR * 0.25, 'toit', 0.5);
  const tLand = t3 + DUR * 0.75;
  at(tLand, 'impact', 1.0); at(tLand, 'toit', 0.9); at(tLand + 0.02, 'bois', 0.8, { f: 0.8 });
  for (let i = 0; i < 5; i++) at(t3 + DUR * (0.78 + 0.04 * i), 'clic', 0.34);

  // ── sceaux : frappe (« tac » + reflet d'or), envol
  SEALS.forEach((s) => {
    at(s.stamp, 'tac', 0.7); at(s.stamp + 0.05, 'or', 0.4);
    at(s.fly0, 'souffle', 0.3);
    at(s.stamp, 'note', 0.55, { f: NOTES[s.n], n: s.n });
  });

  // ── fin : reflet de l'or, signature 墨道 ; accord final (pas de cloche ni de gong aux changements d'époque)
  at(9.0, 'or', 0.5); at(9.5, 'tac', 0.7);
  at(9.3, 'note', 0.6, { f: 587.33, n: 4 });
  return { total: 10, events: ev.sort((a, b) => a.t - b.t) };
}
