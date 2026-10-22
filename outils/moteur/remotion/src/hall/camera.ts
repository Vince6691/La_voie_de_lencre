// Caméra du panel d'évolution : UNE seule montée macro sur le coin avant droit du hall, sans aller-retour. Elle part du pied de la
// structure Tang, tourne lentement vers la façade tout en montant : le bas (les colonnes remplacées, Song), puis le haut (les consoles
// et les rives du toit, Ming), enfin le sommet (l'étage des Qing qui tombe), avant un seul recul vers la façade complète.
// Trajectoire à images clés, interpolée en continu (Hermite, tangentes par différences finies : pas d'arrêt aux images clés).
// Chaque image clé donne l'azimut, l'élévation, un facteur de zoom et un point visé (une « ancre » qui suit le bâtiment qui change).
export type Anchor = 'base' | 'cornerLow' | 'brCorner' | 'eaveCorner' | 'storeyCorner';
export type CamKey = { t: number; az: number; el: number; zoom: number; a: Anchor; dx?: number }; // dx : décalage latéral du point visé (monde)

// azimut 0 = façade ; positif = on regarde plutôt le pignon droit
export const KEYS: CamKey[] = [
  { t: 0.0, az: 1.4, el: 0.05, zoom: 1.9, a: 'cornerLow' },    // Tang : le pied du coin, le socle pousse, les colonnes tombent
  { t: 1.2, az: 1.28, el: 0.06, zoom: 1.9, a: 'cornerLow' },
  { t: 2.4, az: 1.12, el: 0.07, zoom: 1.85, a: 'cornerLow' },   // Song, le BAS : les colonnes sont remplacées une à une
  { t: 3.6, az: 0.95, el: 0.08, zoom: 1.75, a: 'cornerLow' },
  { t: 4.7, az: 0.78, el: 0.09, zoom: 1.95, a: 'brCorner' },    // on monte : Ming, le HAUT — les consoles s'ouvrent et se referment
  { t: 5.8, az: 0.6, el: 0.1, zoom: 2.0, a: 'brCorner' },
  { t: 6.5, az: 0.46, el: 0.12, zoom: 1.75, a: 'eaveCorner' },  // la rive du toit : bêtes de faîte, tuiles vernissées
  { t: 7.3, az: 0.32, el: 0.14, zoom: 1.4, a: 'storeyCorner' }, // Qing, le SOMMET : l'étage tombe du ciel
  { t: 8.7, az: 0.16, el: 0.16, zoom: 1.2, a: 'storeyCorner' }, // impact
  { t: 9.5, az: 0.0, el: 0.18, zoom: 0.98, a: 'base', dx: -0.5 }, // un seul recul vers la façade, à droite pour dégager le cartouche
  { t: 10.0, az: 0.0, el: 0.19, zoom: 1.02, a: 'base', dx: -0.7 },
];

const hermite = (t0: number, t1: number, v0: number, v1: number, m0: number, m1: number, t: number) => {
  const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * h * m1;
};
// valeur d'un canal à t, par Hermite sur les images clés
export function channel(vals: number[], t: number): number {
  const n = KEYS.length;
  if (t <= KEYS[0].t) return vals[0];
  if (t >= KEYS[n - 1].t) return vals[n - 1];
  let i = 0; while (i < n - 2 && t > KEYS[i + 1].t) i++;
  const slope = (j: number) => (j <= 0 || j >= n - 1 ? 0 : (vals[j + 1] - vals[j - 1]) / (KEYS[j + 1].t - KEYS[j - 1].t));
  return hermite(KEYS[i].t, KEYS[i + 1].t, vals[i], vals[i + 1], slope(i), slope(i + 1), t);
}

export type Hall3 = { platH: number; colH: number; brH: number; ridgeH: number; tier2: number; hx: number; HD: number };
// point visé (monde) pour chaque ancre, à zoom `zoom` ; le décalage -k/zoom place le point vers 390 px du haut de l'écran, au-dessus du
// compteur. Le cadrage de base place le pied du hall à 660 px.
export function anchorPoint(a: Anchor, h: Hall3, zoom: number): [number, number, number] {
  const yb = h.platH + h.colH + 0.3, yEave = h.platH + h.colH + 0.14 + h.brH;
  switch (a) {
    case 'cornerLow': return [h.hx - 0.15, h.platH + 0.55 - 150 / zoom, h.HD];
    case 'brCorner': return [h.hx - 0.2, yb + 0.1 - 150 / zoom, h.HD];
    case 'eaveCorner': return [h.hx - 0.1, yEave + 0.15 - 150 / zoom, h.HD + 0.3];
    case 'storeyCorner': return [h.hx * 0.8, yEave + 1.0 - 120 / zoom, h.HD];
    default: return [0, (660 - 540) / zoom, 0];
  }
}

export type CamPose = { az: number; el: number; zoom: number; target: [number, number, number] };
// pose à l'instant t ; zoomFit = zoom qui cadre le hall entier (selon sa taille du moment)
export function cameraAt(t: number, h: Hall3, zoomFit: number): CamPose {
  const az = channel(KEYS.map((k) => k.az), t), el = channel(KEYS.map((k) => k.el), t);
  const lz = channel(KEYS.map((k) => Math.log(k.zoom)), t), zoom = zoomFit * Math.exp(lz);
  // point visé : interpolation des ancres résolues, avec les mêmes poids que les canaux (on lit le canal d'un indicateur par ancre)
  const names: Anchor[] = ['base', 'cornerLow', 'brCorner', 'eaveCorner', 'storeyCorner'];
  const w = names.map((nm) => Math.max(0, channel(KEYS.map((k) => (k.a === nm ? 1 : 0)), t)));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  const target: [number, number, number] = [0, 0, 0];
  names.forEach((nm, i) => {
    const wi = w[i] / sum; if (wi < 1e-4) return;
    const p = anchorPoint(nm, h, zoom);
    target[0] += wi * p[0]; target[1] += wi * p[1]; target[2] += wi * p[2];
  });
  target[0] += channel(KEYS.map((k) => k.dx ?? 0), t);
  return { az: az + 0.008 * Math.sin(t * 0.9), el, zoom, target };
}
