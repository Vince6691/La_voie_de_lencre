// Partagé par la composition shuimo et les coups de pinceau : cadre, aléa reproductible, type d'événement.
export const W = 1920, H = 1080;

// générateur pseudo-aléatoire (mulberry32) : même graine, même suite
export const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// bruit lisse 1D : valeurs aléatoires (0 à 1) aux entiers, raccordées en douceur ; même graine, même courbe
const hash = (i: number, seed: number) => {
  let h = Math.imul(i ^ Math.imul(seed, 0x9e3779b1), 0x27d4eb2d);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
export const bruit = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
};

// vent du paysage, commun à tout ce qui bouge (oiseaux, nuages…) : brise qui ondule (≈ 0,3) et rafales espacées de
// quelques secondes (jusqu'à ≈ 1,2). La rafale traverse le cadre dans le sens du vent (dir) : un point situé en x
// la reçoit un peu plus tard.
export const vent = (t: number, seed: number, x = W / 2, dir: 1 | -1 = 1) => {
  const tt = t - (dir > 0 ? x : W - x) / 600;
  const brise = 0.3 + 0.1 * Math.sin(tt * 0.37 + seed) + 0.12 * (bruit(tt * 0.6, seed) - 0.5);
  const g = Math.max(0, bruit(tt * 0.24, seed + 1) - 0.58) / 0.42; // nul la plupart du temps
  return brise + 0.9 * g * g * (3 - 2 * g) * (0.8 + 0.2 * bruit(tt * 2.5, seed + 2));
};
// vent cumulé de 0 à t (poussée accumulée), pour les déplacements portés par le vent
export const ventCumul = (t: number, seed: number, x = W / 2, dir: 1 | -1 = 1) => {
  const n = Math.max(1, Math.ceil(Math.abs(t) * 10)), dt = t / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += vent((i + 0.5) * dt, seed, x, dir) * dt;
  return s;
};

// coup de pinceau : départ (x, y), direction angle (radians), size ≈ 1 (longueur et épaisseur), t : début en secondes
export type InkEvent = { type: 'stroke' | 'wash'; t: number; x: number; y: number; size: number; angle: number; seed: number };
