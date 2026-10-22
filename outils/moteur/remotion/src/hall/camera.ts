// Caméra du panel d'évolution : une trajectoire à images clés, interpolée en continu (Hermite, tangentes par différences finies :
// pas d'arrêt aux images clés). Chaque image clé donne l'azimut, l'élévation, un facteur de zoom et un point visé (une « ancre » :
// le cadrage de base, le coin du bâtiment où se trouve une console, l'étage, le faîtage) ; les ancres suivent le bâtiment qui change.
// L'azimut croît sans cesse (un tour complet autour du hall, de trois quarts jusqu'à la façade), à vitesse variable : lent pendant
// les plans macro, plus vif entre les éléments héros.
export type Anchor = 'base' | 'brCorner' | 'storey' | 'ridge' | 'plaque';
export type CamKey = { t: number; az: number; el: number; zoom: number; a: Anchor; dx?: number }; // dx : décalage latéral du point visé (monde)

// azimut 0 = façade ; positif = on tourne vers la droite du hall
export const KEYS: CamKey[] = [
  { t: 0.0, az: -0.95, el: 0.04, zoom: 0.92, a: 'base' },     // ouverture : plan bas, le socle pousse
  { t: 1.1, az: -0.72, el: 0.08, zoom: 1.0, a: 'base' },
  { t: 2.0, az: -0.35, el: 0.11, zoom: 1.05, a: 'base' },     // le toit se pose
  { t: 2.9, az: 0.42, el: 0.07, zoom: 2.5, a: 'brCorner' },   // MACRO : la console d'angle s'ouvre
  { t: 3.8, az: 0.78, el: 0.09, zoom: 2.5, a: 'brCorner' },
  { t: 4.5, az: 1.25, el: 0.16, zoom: 1.1, a: 'base' },       // on recule : les consoles se referment
  { t: 5.0, az: 1.75, el: 0.32, zoom: 0.94, a: 'base' },      // ronde haute : les colonnes sont remplacées
  { t: 5.9, az: 2.7, el: 0.36, zoom: 0.9, a: 'base' },
  { t: 6.7, az: 3.75, el: 0.2, zoom: 0.98, a: 'base' },
  { t: 7.3, az: 4.35, el: 0.06, zoom: 0.9, a: 'base' },       // plan bas : l'étage tombe du ciel
  { t: 8.3, az: 5.25, el: 0.09, zoom: 0.94, a: 'base' },
  { t: 8.75, az: 5.62, el: 0.13, zoom: 0.97, a: 'base' },     // impact de l'étage
  { t: 9.3, az: 6.28, el: 0.17, zoom: 0.98, a: 'base', dx: -0.5 }, // façade, un peu à droite pour dégager le cartouche
  { t: 10.0, az: 6.28, el: 0.19, zoom: 1.03, a: 'base', dx: -0.7 }, // poussée lente
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
// point visé (monde) pour chaque ancre, à zoom `zoom` (le cadrage de base place le pied du hall à 660 px du haut de l'écran)
export function anchorPoint(a: Anchor, h: Hall3, zoom: number): [number, number, number] {
  const yb = h.platH + h.colH + 0.3, top = h.platH + h.colH + 0.4 + h.brH + h.ridgeH + h.tier2;
  switch (a) {
    case 'brCorner': return [h.hx - 0.2, yb + 0.1 - 150 / zoom, h.HD]; // la console apparaît au-dessus du compteur (vers 390 px)
    case 'storey': return [0, h.platH + h.colH + 0.4 + h.brH + 0.9, 0];
    case 'ridge': return [0, top - 0.35, 0];
    case 'plaque': return [0, yb - 0.3, h.HD];
    default: return [0, (660 - 540) / zoom, 0];
  }
}

export type CamPose = { az: number; el: number; zoom: number; target: [number, number, number] };
// pose à l'instant t ; zoomFit = zoom qui cadre le hall entier (selon sa taille du moment)
export function cameraAt(t: number, h: Hall3, zoomFit: number): CamPose {
  const az = channel(KEYS.map((k) => k.az), t), el = channel(KEYS.map((k) => k.el), t);
  const lz = channel(KEYS.map((k) => Math.log(k.zoom)), t), zoom = zoomFit * Math.exp(lz);
  // point visé : interpolation des ancres résolues, avec les mêmes poids que les canaux (on lit le canal d'un indicateur par ancre)
  const names: Anchor[] = ['base', 'brCorner', 'storey', 'ridge', 'plaque'];
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
