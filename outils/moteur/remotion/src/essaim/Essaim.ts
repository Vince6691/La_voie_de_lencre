// Essaim (série 墨之道, animation signature du 師) : des centaines de minuscules soldats à l'encre, vus d'en haut en légère
// plongée, qui passent d'une formation à l'autre (camp en trois carrés, ronde autour de la butte, classe assise face au
// maître, silhouette d'un caractère). Chaque soldat a une place dans chaque formation ; il y va avec un retard qui dépend
// de sa distance au point de départ de la vague, d'où le mouvement « qui se propage ». Positions déterministes (graine),
// sprites dessinés une seule fois (4 poses) : rien n'est recalculé d'une image à l'autre sauf les positions.
import { rng } from '../shuimo/common';
import { peindre, sorteParDefaut } from './Essaim3D';

export type Pt = [number, number];
export type Pose = 'debout' | 'marche' | 'assis' | 'dos';
export const POSES: Pose[] = ['debout', 'marche', 'assis', 'dos'];

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (u: number) => { const v = clamp(u); return v * v * (3 - 2 * v); };

// ── sprites : petit 人 au pinceau (tête, buste, jambes), lance pour les soldats debout ; dessinés à 4× puis réduits
const SP = 4, SW = 26, SH = 34;
const sprites: Partial<Record<string, HTMLCanvasElement>> = {};
const stroke = (g: CanvasRenderingContext2D, pts: Pt[], w: number) => {
  g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
};
export const sprite = (pose: Pose, color: string) => {
  const k = `${pose}|${color}`;
  if (sprites[k]) return sprites[k]!;
  const c = document.createElement('canvas'); c.width = SW * SP; c.height = SH * SP;
  const g = c.getContext('2d')!;
  g.scale(SP, SP); g.translate(SW / 2, SH * 0.62);
  g.strokeStyle = color; g.fillStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
  if (pose === 'assis') {
    g.beginPath(); g.arc(0, -6.5, 2.6, 0, 7); g.fill();
    stroke(g, [[0, -3.6], [0.3, 2.2]], 2.6);
    stroke(g, [[-4.8, 4.2], [0, 2.6], [4.8, 4.2]], 2.2); // genoux
    stroke(g, [[-7, 7.5], [7, 6.8]], 0.9); // lance posée au sol
  } else {
    const walk = pose === 'marche';
    g.beginPath(); g.arc(0, -11, 2.7, 0, 7); g.fill();
    stroke(g, [[0, -8], [walk ? 0.8 : 0, 1.5]], 2.8);
    stroke(g, [[walk ? 0.8 : 0, 1.5], [walk ? -3.8 : -2.6, 9]], 2.1);
    stroke(g, [[walk ? 0.8 : 0, 1.5], [walk ? 3.6 : 2.6, 9]], 2.1);
    if (pose !== 'dos') stroke(g, [[walk ? 6.2 : 4.6, -19], [walk ? 3.4 : 4.6, 7]], 1.0); // lance
    else stroke(g, [[-4.2, -5.5], [4.2, -5.5]], 1.6); // de dos : les épaules
  }
  sprites[k] = c;
  return c;
};

// ── formations : n positions (écran 1920 × 1080), déterministes
// ry : espacement des rangs (× pas) ; au-dessous de 1,3 les silhouettes se touchent et le carré se lit comme des hachures
export const carres = (n: number, centres: Pt[], cols: number, pas: number, ry = 1.4): Pt[] => {
  const per = Math.ceil(n / centres.length), rows = Math.ceil(per / cols), r = rng(11);
  return Array.from({ length: n }, (_, i) => {
    const b = Math.floor(i / per), j = i % per, cx = j % cols, cy = Math.floor(j / cols), [x0, y0] = centres[b];
    return [x0 + (cx - (cols - 1) / 2) * pas + (r() - 0.5) * 1.6, y0 + (cy - (rows - 1) / 2) * pas * ry + (r() - 0.5) * 1.6];
  });
};
// anneau (ellipse vue en plongée), sur plusieurs rangs
export const anneau = (n: number, c: Pt, rx: number, ry: number, rangs = 3, pas = 12): Pt[] => {
  const per = Math.ceil(n / rangs), r = rng(23);
  return Array.from({ length: n }, (_, i) => {
    const k = Math.floor(i / per), a = ((i % per) / per) * Math.PI * 2 + k * 0.07;
    return [c[0] + Math.cos(a) * (rx + k * pas) + (r() - 0.5) * 2, c[1] + Math.sin(a) * (ry + k * pas * 0.5) + (r() - 0.5) * 2];
  });
};
// rangées d'élèves assis face au maître (en haut), qui s'élargissent vers le bas (perspective)
export const classe = (n: number, maitre: Pt, rangs: number, pas = 13): Pt[] => {
  const per = Math.ceil(n / rangs), r = rng(31);
  return Array.from({ length: n }, (_, i) => {
    const k = Math.floor(i / per), j = i % per, w = 1 + k * 0.035;
    return [maitre[0] + (j - (per - 1) / 2) * pas * w + (r() - 0.5) * 1.4, maitre[1] + 120 + k * pas * 1.25 * w + (r() - 0.5) * 1.4];
  });
};
// petit tas autour d'un point (les soldats « sortent » du signe)
export const source = (n: number, c: Pt, rad: number): Pt[] => {
  const r = rng(5);
  return Array.from({ length: n }, () => { const a = r() * 7, d = rad * Math.sqrt(r()); return [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; });
};
// silhouette : n points pris dans l'encre d'un dessin (fonction qui dessine dans un canevas size × size, centré en c)
export const silhouette = (n: number, c: Pt, size: number, dessin: (g: CanvasRenderingContext2D, s: number) => void, cle: string): Pt[] => {
  const k = `sil|${cle}|${n}|${size}`;
  if (cache[k]) return cache[k];
  const S = 400, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  dessin(g, S);
  const d = g.getImageData(0, 0, S, S).data, ink: Pt[] = [];
  for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (d[(y * S + x) * 4 + 3] > 120) ink.push([x, y]);
  const r = rng(47), out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = ink.length ? ink[Math.floor(((i + r()) / n) * ink.length) % ink.length] : [S / 2, S / 2];
    out.push([c[0] - size / 2 + ((p[0] + r() * 2) / S) * size, c[1] - size / 2 + ((p[1] + r() * 2) / S) * size]);
  }
  cache[k] = out;
  return out;
};
const cache: Record<string, Pt[]> = {};
export const memo = (k: string, f: () => Pt[]) => (cache[k] ??= f());

// ── dessin : chaque soldat va de A à B ; u = avancement global [0, 1] ; retard selon la distance à l'origine de la vague
export type Vague = { origine: Pt; etalement?: number }; // etalement : part du temps prise par le décalage (0,6 par défaut)
export const dessinerEssaim = (ctx: CanvasRenderingContext2D, A: Pt[], B: Pt[], u: number,
  o: { vague?: Vague; pose: (i: number, k: number) => Pose; couleur?: string; alpha?: number; echelle?: number; seed?: number; ondule?: number; t?: number }) => {
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  const col = o.couleur ?? 'rgb(38,33,30)', sc = o.echelle ?? 1, sp = o.vague?.etalement ?? 0.6;
  let dmax = 1;
  const org = o.vague?.origine;
  if (org) for (const p of A) dmax = Math.max(dmax, Math.hypot(p[0] - org[0], p[1] - org[1]));
  const r = rng(o.seed ?? 3);
  ctx.save(); ctx.globalAlpha *= a;
  const w = SW * sc, h = SH * sc;
  for (let i = 0; i < A.length; i++) {
    const p = A[i], q = B[i] ?? p;
    const del = org ? (Math.hypot(p[0] - org[0], p[1] - org[1]) / dmax) * sp : r() * sp * 0.4;
    const k = smooth((u - del) / (1 - sp));
    const bob = o.ondule && k > 0 && k < 1 ? Math.sin((o.t ?? 0) * 9 + i) * o.ondule : 0;
    const x = p[0] + (q[0] - p[0]) * k, y = p[1] + (q[1] - p[1]) * k + bob;
    // soldat peint au pinceau (Essaim3D) ; le personnage peint fait 44 unités, l'ancien gabarit 30
    const im = peindre(sorteParDefaut(i), o.pose(i, k), col, 0, Math.floor((o.t ?? 0) * 3.2 + i * 0.37) % 2), z = (0.7 * h) / SH;
    ctx.drawImage(im, x - 20 * z, y - 56 * z + h * 0.38, 40 * z, 64 * z);
  }
  ctx.restore();
};

// ── la butte (𠂤 vue d'en haut) : deux bosses de terre au lavis ocre, bords flous
export const butte = (ctx: CanvasRenderingContext2D, c: Pt, r: number, a: number, couleur: number[]) => {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.filter = `blur(${Math.round(r * 0.08)}px)`;
  for (const [dx, dy, s] of [[-0.28, 0.05, 0.72], [0.3, -0.06, 0.64], [0, 0.18, 0.9]] as [number, number, number][]) {
    const x = c[0] + dx * r, y = c[1] + dy * r * 0.5, R = r * s;
    const g = ctx.createRadialGradient(x, y - R * 0.2, 0, x, y, R);
    g.addColorStop(0, `rgba(${couleur[0]},${couleur[1]},${couleur[2]},0.34)`);
    g.addColorStop(0.7, `rgba(${couleur[0]},${couleur[1]},${couleur[2]},0.14)`);
    g.addColorStop(1, `rgba(${couleur[0]},${couleur[1]},${couleur[2]},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.5, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
};

// empreintes de pas le long d'un anneau (la ronde des sentinelles), tracées jusqu'à la fraction p
export const empreintes = (ctx: CanvasRenderingContext2D, c: Pt, rx: number, ry: number, p: number, a: number, couleur: string) => {
  if (a <= 0 || p <= 0) return;
  const n = 90, m = Math.floor(n * p);
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = couleur;
  for (let i = 0; i < m; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2, side = i % 2 ? 1 : -1;
    const x = c[0] + Math.cos(t) * (rx + side * 7), y = c[1] + Math.sin(t) * (ry + side * 4);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t + Math.PI); ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 6.5, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.restore();
};
