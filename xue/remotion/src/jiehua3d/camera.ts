// Caméras réutilisables des séquences 3D à l'encre (界畫) : caméra en perspective définie par azimut, élévation,
// point visé et « zoom » (pixels par unité au point visé, indépendant du FOV), et trois façons de la mouvoir :
// - orbit : un seul plan tournant (départ tout près, arrivée large), recul et montée découplés du tour ;
// - montage : plans successifs à rampes de vitesse, coupes franches quand un plan ne reprend pas la fin du précédent ;
// - timeWarp / kicks : ralenti local (le temps de l'animation se fige autour d'un instant) et secousses de zoom ou
//   tremblement sur des temps forts, synchrones des impacts de la bande son.
// Toutes ces fonctions sont pures : la même caméra sert à la scène 3D, au fond (parallaxe) et à l'export des
// événements pour le son.
import * as THREE from 'three';
import type { Cam, V3 } from './model';

export const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const io = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(u));
export const io3 = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
export const io5 = (u: number) => (u < 0.5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2);
export const out3 = (u: number) => 1 - (1 - u) ** 3;

// interpolation de deux caméras : azimut et élévation linéaires, zoom géométrique (sinon le recul « traîne »)
export const camMix = (A: Cam, B: Cam, e: number): Cam => ({
  az: lerp(A.az, B.az, e), el: lerp(A.el, B.el, e), zoom: Math.exp(lerp(Math.log(A.zoom), Math.log(B.zoom), e)),
  target: [0, 1, 2].map((k) => lerp(A.target[k], B.target[k], e)) as V3,
});

// place une caméra perspective : la distance découle du zoom voulu au point visé
export const applyCamPersp = (cam: THREE.PerspectiveCamera, c: Cam, o: { fov?: number; w?: number; h?: number; far?: number } = {}) => {
  const fov = o.fov ?? 34, w = o.w ?? 1920, h = o.h ?? 1080;
  const D = h / (c.zoom * 2 * Math.tan(((fov / 2) * Math.PI) / 180));
  cam.fov = fov; cam.aspect = w / h; cam.near = 1; cam.far = o.far ?? 600;
  cam.position.set(c.target[0] + D * Math.sin(c.az) * Math.cos(c.el), c.target[1] + D * Math.sin(c.el), c.target[2] + D * Math.cos(c.az) * Math.cos(c.el));
  cam.up.set(0, 1, 0); cam.lookAt(...c.target); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
};

// plan tournant de start à end sur `seconds` : le tour ne s'arrête jamais (part linéaire `steady`), le recul se fait
// sur la fraction `backBy` de la durée, l'élévation sur toute la durée. Pour un tour complet : end.az = start.az + 2π.
export const orbit = (start: Cam, end: Cam, seconds: number, o: { steady?: number; backBy?: number } = {}) => {
  const steady = o.steady ?? 0.15, backBy = o.backBy ?? 0.75;
  return (t: number): Cam => {
    const u = clamp01(t / seconds);
    const turn = io(u) * (1 - steady) + u * steady, back = io(Math.min(1, u / backBy)), rise = io(u);
    return {
      az: lerp(start.az, end.az, turn), el: lerp(start.el, end.el, rise),
      zoom: Math.exp(lerp(Math.log(start.zoom), Math.log(end.zoom), back)),
      target: [0, 1, 2].map((k) => lerp(start.target[k], end.target[k], back)) as V3,
    };
  };
};

// montage en plans : chaque plan va de a à b avec sa courbe e (io3 / io5 pour une rampe marquée, out3 pour un départ
// vif) ; une coupe là où un plan ne reprend pas l'objet caméra qui termine le précédent
export type Shot = { t0: number; t1: number; a: Cam; b: Cam; e: (u: number) => number };
export const montage = (shots: Shot[]) => ({
  camAt: (t: number): Cam => {
    const sh = shots.find((x) => t < x.t1) ?? shots[shots.length - 1];
    return camMix(sh.a, sh.b, sh.e(clamp01((t - sh.t0) / (sh.t1 - sh.t0))));
  },
  cuts: shots.slice(1).filter((sh, i) => sh.a !== shots[i].b).map((sh) => sh.t0),
});

// ralenti : table temps réel ↔ temps de l'animation ; slow = [{ at, depth, width }] fige l'animation autour de `at`
// (depth 0,6 → l'animation avance à 40 % de sa vitesse). Sans ralenti, les deux temps sont égaux.
export const timeWarp = (seconds: number, slow: { at: number; depth: number; width: number }[] = []) => {
  const dt = 0.001, real: number[] = [], anim: number[] = [];
  let r = 0;
  for (let a = 0; a <= seconds + 1e-9; a += dt) {
    real.push(r); anim.push(a);
    r += dt / (1 - slow.reduce((s, x) => s + x.depth * Math.exp(-(((a - x.at) / x.width) ** 2)), 0));
  }
  const animOf = (t: number) => {
    let lo = 0, hi = real.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (real[mid] <= t) lo = mid; else hi = mid; }
    return t >= real[real.length - 1] ? anim[anim.length - 1] + (t - real[real.length - 1]) : anim[lo] + ((t - real[lo]) / (real[hi] - real[lo] || 1)) * (anim[hi] - anim[lo]);
  };
  const realOf = (a: number) => real[Math.min(real.length - 1, Math.max(0, Math.round(a / dt)))];
  return { animOf, realOf, realSeconds: real[real.length - 1] };
};

// secousses : poussée de zoom (+3 %) sur chaque temps fort, choc plus fort (+7 %) et tremblement sur `big`
export const kicks = (c: Cam, t: number, hits: number[], big?: number): Cam => {
  const kick = (h: number, tau: number) => (t >= h ? Math.min(1, (t - h) / 0.03) * Math.exp(-(t - h) / tau) : 0);
  const z = hits.reduce((a, h) => a + 0.03 * kick(h, 0.12), 0) + (big === undefined ? 0 : 0.07 * kick(big, 0.18));
  const A = big === undefined ? 0 : 0.16 * kick(big, 0.25);
  return { ...c, zoom: c.zoom * (1 + z), target: [c.target[0] + A * Math.sin(t * 53), c.target[1] + A * Math.sin(t * 41 + 1), c.target[2]] };
};

// vitesse de la caméra (par seconde) entre deux instants, nulle sur une coupe : pilote le vent de la bande son
export const camSpeed = (camAt: (t: number) => Cam, ta: number, tb: number, cuts: number[] = []) => {
  if (cuts.some((c) => ta < c && tb >= c)) return 0;
  const a = camAt(ta), b = camAt(tb);
  return (Math.abs(b.az - a.az) + Math.abs(b.el - a.el) + 0.5 * Math.abs(Math.log(b.zoom / a.zoom)) + Math.hypot(b.target[0] - a.target[0], b.target[1] - a.target[1], b.target[2] - a.target[2]) / 25) / (tb - ta);
};
