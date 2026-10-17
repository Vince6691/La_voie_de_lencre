// Partagé par la composition shuimo et les coups de pinceau : cadre, aléa reproductible, type d'événement.
export const W = 1920, H = 1080;

// générateur pseudo-aléatoire (mulberry32) : même graine, même suite
export const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// coup de pinceau : départ (x, y), direction angle (radians), size ≈ 1 (longueur et épaisseur), t : début en secondes
export type InkEvent = { type: 'stroke' | 'wash'; t: number; x: number; y: number; size: number; angle: number; seed: number };
