// Grues du Japon en vol (deuxième type d'oiseau du fond, à côté des petites volées d'Oiseaux.tsx) : marionnette
// articulée faite des pièces peintes de la planche 09_grue (tools/build_grue.py) — un corps, une aile coupée au
// poignet en deux segments. Chaque aile est placée en 3D (élévation, flèche vers l'arrière, la main suit le bras avec
// un temps de retard et se replie à la remontée) puis projetée sur l'écran par une vue de trois quarts légèrement
// en contre-plongée, qui sépare l'aile proche de l'aile lointaine. Battements lents et amples, sans arrêt (pas de vol plané),
// traversée lente en ligne droite, horizontale ou en montée, dans un sens ou dans l'autre. Dessin au canvas, fonction du temps : chaque image se calcule seule.
import React from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { H, W, rng } from './common';

export type Grue = {
  seed: number; x: number; y: number; dir: 1 | -1; speed: number; // départ, sens, vitesse (px/s)
  rise: number;                                                    // montée (px/s) : 0, vol horizontal
  size: number; depth: number; opacity: number;                    // longueur du corps à l'écran (px)
};

// mesures des pièces (assets/shuimo/elements/grue.json), en pixels de l'image
const CORPS = { w: 617, h: 220, epaule: [277, 31] };
const AILE = { w: 534, h: 260, racine: 55, poignet: 224 }; // racine : bord d'attaque à la racine ; poignet : coupe

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const frac = (v: number) => v - Math.floor(v);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
// battement : 1 aile levée, −1 abaissée ; la descente (45 % du cycle) est plus rapide que la remontée
const flap = (phi: number) => { const p = frac(phi); return p < 0.45 ? Math.cos((Math.PI * p) / 0.45) : -Math.cos((Math.PI * (p - 0.45)) / 0.55); };
// repli de la main pendant la remontée (0 à 1)
const fold = (phi: number) => { const p = frac(phi); return p < 0.45 ? 0 : Math.sin((Math.PI * (p - 0.45)) / 0.55); };

// vue : x vers l'avant de l'oiseau, y vers le haut, z vers le spectateur ; lacet et contre-plongée de la caméra
const YAW = 0.35, TILT = 0.25;
type V3 = [number, number, number];
const proj = ([x, y, z]: V3): [number, number] => {
  const X = x * Math.cos(YAW) - z * Math.sin(YAW), Zp = x * Math.sin(YAW) + z * Math.cos(YAW);
  return [X, -(y * Math.cos(TILT) - Zp * Math.sin(TILT))];
};
// axe de l'aile (racine → pointe) et corde (bord d'attaque → bord de fuite) pour une élévation e et une flèche b ;
// side +1 : aile proche, −1 : aile lointaine
const axes = (e: number, b: number, side: number) => {
  const d: V3 = [-Math.sin(b), Math.sin(e) * Math.cos(b), side * Math.cos(e) * Math.cos(b)];
  const c: V3 = [-Math.cos(b), -Math.sin(b) * Math.sin(e), -side * Math.sin(b) * Math.cos(e)];
  return { d: proj(d), c: proj(c) };
};

type Plan = { freq: number; phase: number; q: number[] };
function plan(g: Grue): Plan {
  const R = rng(g.seed);
  const r = (a: number, b: number) => a + (b - a) * R();
  return { freq: r(1.0, 1.25), phase: R(), q: Array.from({ length: 4 }, () => r(0, Math.PI * 2)) };
}

const images = new Map<string, Promise<HTMLImageElement>>();
const charge = (src: string) => {
  if (!images.has(src)) images.set(src, new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = src; }));
  return images.get(src)!;
};

// dessine une grue : ctx est déjà dans le repère de l'image du corps (épaule au point CORPS.epaule)
function drawGrue(ctx: CanvasRenderingContext2D, corps: HTMLImageElement, aile: HTMLImageElement, phi: number, g: number) {
  const v = flap(phi), vl = flap(phi - 0.1), f = fold(phi) * (1 - g);
  // élévations et flèches du bras et de la main ; en vol plané, ailes un peu relevées (dièdre)
  const eIn = mix(0.12 + 0.72 * v, 0.32, g), eOut = mix(0.05 + 0.95 * vl, 0.2, g);
  const bIn = mix(0.25 + 0.1 * f, 0.22, g), bOut = mix(0.45 + 0.6 * f, 0.42, g);
  const spanOut = 1 - 0.3 * f; // la main se replie à la remontée
  const wing = (side: number) => {
    const [sx, sy] = CORPS.epaule;
    const o = proj([0, 0, side * 14]); // l'épaule lointaine est derrière le corps
    const J = [sx + o[0], sy + o[1]];
    const A = axes(eIn, bIn, side), B = axes(eOut, bOut, side);
    const seg = (u0: number, u1: number, P: number[], ax: { d: number[]; c: number[] }, span: number) => {
      const du = [ax.d[0] * span, ax.d[1] * span], dv = ax.c;
      ctx.save();
      ctx.transform(du[0], du[1], dv[0], dv[1], P[0] - u0 * du[0] - AILE.racine * dv[0], P[1] - u0 * du[1] - AILE.racine * dv[1]);
      ctx.drawImage(aile, u0, 0, u1 - u0, AILE.h, u0, 0, u1 - u0, AILE.h);
      ctx.restore();
    };
    const P = [J[0] + A.d[0] * AILE.poignet, J[1] + A.d[1] * AILE.poignet]; // poignet
    seg(AILE.poignet - 8, AILE.w, P, B, spanOut); // la main, qui recouvre un peu la coupe…
    seg(0, AILE.poignet, J, A, 1);                // …sous le bras
  };
  ctx.save(); ctx.filter = 'brightness(0.8)'; ctx.globalAlpha *= 0.92; wing(-1); ctx.restore(); // aile lointaine
  const bob = -10 * flap(phi - 0.3) * (1 - g); // le corps monte quand les ailes descendent
  ctx.drawImage(corps, 0, bob);
  wing(1);
}

// toutes les grues d'un plan, sur un canvas plein cadre ; place(g) donne la caméra de leur profondeur
export const Grues: React.FC<{
  grues: Grue[]; t: number; ventSeed: number; ventDir: 1 | -1;
  place: (depth: number) => { s: number; tx: number; ty: number; blur: number };
}> = ({ grues, t, ventSeed, ventDir, place }) => {
  const [img, setImg] = React.useState<{ corps: HTMLImageElement; aile: HTMLImageElement } | null>(null);
  React.useEffect(() => {
    const h = delayRender('grue');
    Promise.all([charge(staticFile('shuimo/elements/grue_corps.png')), charge(staticFile('shuimo/elements/grue_aile.png'))])
      .then(([corps, aile]) => { setImg({ corps, aile }); continueRender(h); }, (e) => cancelRender(e));
  }, []);
  const plans = React.useMemo(() => grues.map(plan), [grues]);
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv || !img) return;
    const k = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * k)) { cv.width = Math.round(W * k); cv.height = Math.round(H * k); }
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingQuality = 'high';
    grues.forEach((gr, i) => {
      const p = plans[i];
      // trajectoire en ligne droite, horizontale ou qui monte doucement (pas d'ondulation ni d'à-coups du vent)
      const X = gr.x + gr.dir * gr.speed * t, Y = gr.y - gr.rise * t;
      const g = 0; // la grue bat des ailes sans arrêt (pas de vol plané : jugé plus beau)
      const phi = p.phase + p.freq * t;
      const pitch = -Math.atan2(gr.rise, gr.speed); // le corps suit la pente de la montée
      const c = place(gr.depth);
      const sx = W / 2 + (X - W / 2) * c.s + c.tx, sy = H / 2 + (Y - H / 2) * c.s + c.ty;
      const sc = (gr.size / CORPS.w) * c.s;
      ctx.save();
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalAlpha = gr.opacity;
      ctx.filter = c.blur > 0.05 ? `blur(${c.blur.toFixed(2)}px)` : 'none';
      ctx.translate(sx, sy);
      ctx.scale(gr.dir * sc, sc);
      ctx.rotate(pitch);
      ctx.translate(-CORPS.epaule[0], -CORPS.epaule[1]);
      drawGrue(ctx, img.corps, img.aile, phi, g);
      ctx.restore();
    });
  });
  return <canvas ref={ref} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />;
};
