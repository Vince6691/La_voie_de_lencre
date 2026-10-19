// Salle de trois travées sur deux, toit en demi-croupe (歇山) sur terrasse à balustrade, modélisée en volume
// (modules du Yingzao fashi, simplifiés) pour être rendue en traits d'encre (界畫) : chaque pièce de la charpente
// est une suite de traits, posés dans l'ordre du chantier — terrasse, trame des colonnes, colonnes, linteaux,
// consoles 斗拱, poutres et pannes, chevrons — puis le bâtiment se referme (murs, portes, balustrade, toit).
// Repère : x vers la droite, y vers le haut, z vers le spectateur (façade principale en z > 0), 1 unité ≈ 1 m.
export type V3 = [number, number, number];
// pts : polyligne fixe, ou fonction de l'azimut de la caméra (silhouette des colonnes)
export type LineDef = { pts: V3[] | ((az: number) => V3[]); w: 0 | 1 | 2; axis?: boolean };
export type GroupDef = { mode: 'ruler' | 'free' | 'cascade'; t0: number; t1: number; lines: LineDef[] };
// pièces pleines : masquent les traits cachés une fois le bâtiment refermé, puis reçoivent la couleur
export type Paint = 'stone' | 'column' | 'door' | 'plaster' | 'green' | 'blue' | 'red' | 'roof' | 'ridge';
export type Solid =
  | { kind: 'box'; c: V3; s: V3; paint: Paint }
  | { kind: 'cyl'; c: V3; r: number; h: number; paint: Paint }
  | { kind: 'quad'; p: V3[]; paint: Paint };

// ---- cotes ----
export const PLAT = { x: 12, z: 9, h: 1.4 };
const XS = [-8, -3, 3, 8], ZS = [-5, 0, 5];
const COL_R = 0.35, COL_Y0 = 1.65, COL_Y1 = 6.1;
const Y_DG = 6.35; // base des consoles (dessus du 普拍枋)
// toit : profil par distance au bord de l'avant-toit (舉折 : pente qui se raidit vers le faîte)
export const Z_E = 8.4, X_E = 11.4, Y_GABLE = 10.3;
const PROF: [number, number][] = [[0, 8.6], [1.5, 9.05], [3.4, 9.6], [5.9, 10.8], [8.4, 12.3]];
export const P = (e: number) => {
  const c = Math.min(8.4, Math.max(0, e));
  for (let i = 1; i < PROF.length; i++) if (c <= PROF[i][0]) { const [a, ya] = PROF[i - 1], [b, yb] = PROF[i]; return ya + ((c - a) / (b - a)) * (yb - ya); }
  return PROF[PROF.length - 1][1];
};
const E_G = 3.4 + (2.5 * (Y_GABLE - 9.6)) / 1.2;   // distance au bord où commence le pignon
export const X_G = X_E - E_G;                       // plan du pignon (vu de chant sur les côtés)
export const RIDGE_Y = 12.3;
// hauteur du toit en (x, z) : versants avant/arrière, croupes latérales sous le pignon, angles relevés (起翹)
export const roofY = (x: number, z: number) => {
  const ez = Z_E - Math.abs(z), ex = X_E - Math.abs(x);
  const y = Math.abs(x) <= X_G ? P(ez) : Math.min(P(ez), P(ex));
  return y + 0.9 * Math.exp(-(Math.max(0, ex) + Math.max(0, ez)) / 1.6);
};

// ---- aides ----
const range = (a: number, b: number, s: number) => { const r: number[] = []; for (let x = a; x <= b + 1e-6; x += s) r.push(x); return r; };
const seg = (a: V3, b: V3, w: 0 | 1 | 2 = 1): LineDef => ({ pts: [a, b], w });
const boxEdges = (c: V3, s: V3, w: 0 | 1 | 2 = 1): LineDef[] => {
  const [cx, cy, cz] = c, [hx, hy, hz] = [s[0] / 2, s[1] / 2, s[2] / 2];
  const P8 = (i: number): V3 => [cx + (i & 1 ? hx : -hx), cy + (i & 2 ? hy : -hy), cz + (i & 4 ? hz : -hz)];
  // arêtes : d'abord la base, puis les montants, puis le dessus (ordre d'un dessinateur)
  return [[0, 1], [1, 5], [5, 4], [4, 0], [0, 2], [1, 3], [5, 7], [4, 6], [2, 3], [3, 7], [7, 6], [6, 2]].map(([a, b]) => seg(P8(a), P8(b), w));
};
// boîte orientée le long d'un mur : a = position le long du mur, o = saillie vers l'extérieur
type Frame = { x: number; z: number; t: [number, number]; n: [number, number] };
const local = (f: Frame, a: number, o: number, y: number): V3 => [f.x + f.t[0] * a + f.n[0] * o, y, f.z + f.t[1] * a + f.n[1] * o];
const lbox = (f: Frame, a: number, o: number, y: number, la: number, lo: number, h: number): { c: V3; s: V3 } => {
  const c = local(f, a, o, y);
  const sx = Math.abs(f.t[0]) * la + Math.abs(f.n[0]) * lo, sz = Math.abs(f.t[1]) * la + Math.abs(f.n[1]) * lo;
  return { c, s: [sx, h, sz] };
};

// ---- terrasse, escalier ----
const platform = { c: [0, PLAT.h / 2, 0] as V3, s: [PLAT.x * 2, PLAT.h, PLAT.z * 2] as V3 };
const steps = range(0, 4, 1).map((k) => {
  const d = 0.48 * (5 - k), h = 0.28 * (k + 1);
  return { c: [0, h / 2, PLAT.z + d / 2] as V3, s: [7, h, d] as V3 };
});

// ---- consoles 斗拱 ----
const dougongSet = (f: Frame) => {
  const y = Y_DG, out: { c: V3; s: V3; paint: Paint }[] = [];
  const add = (b: { c: V3; s: V3 }, paint: Paint) => out.push({ ...b, paint });
  add(lbox(f, 0, 0, y + 0.2, 0.75, 0.75, 0.4), 'green');                 // 櫨斗
  add(lbox(f, 0, 0, y + 0.55, 2.0, 0.3, 0.3), 'blue');                   // 泥道栱
  add(lbox(f, 0, 0.2, y + 0.55, 0.3, 1.6, 0.3), 'blue');                 // 華栱 (1er ressaut)
  [-0.85, 0.85].forEach((a) => add(lbox(f, a, 0, y + 0.85, 0.38, 0.38, 0.3), 'green'));
  add(lbox(f, 0, 1.0, y + 0.85, 0.38, 0.38, 0.3), 'green');
  add(lbox(f, 0, 0, y + 1.15, 3.0, 0.3, 0.3), 'blue');                   // 慢栱
  add(lbox(f, 0, 0.65, y + 1.15, 0.3, 2.5, 0.3), 'blue');                // 華栱 (2e ressaut)
  [-1.3, 1.3].forEach((a) => add(lbox(f, a, 0, y + 1.45, 0.38, 0.38, 0.3), 'green'));
  add(lbox(f, 0, 1.9, y + 1.45, 0.38, 0.38, 0.3), 'green');
  add(lbox(f, 0, 1.9, y + 1.75, 2.0, 0.3, 0.3), 'blue');                 // 令栱
  [-0.85, 0.85].forEach((a) => add(lbox(f, a, 1.9, y + 2.05, 0.38, 0.38, 0.3), 'green'));
  return out;
};
const frames: Frame[] = [];
[5, -5].forEach((z) => [-8, -5.5, -3, 0, 3, 5.5, 8].forEach((x) => frames.push({ x, z, t: [1, 0], n: [0, Math.sign(z)] })));
[8, -8].forEach((x) => [-5, -2.5, 0, 2.5, 5].forEach((z) => frames.push({ x, z, t: [0, 1], n: [Math.sign(x), 0] })));
// en partant de l'angle avant droit, où la caméra commence en plan rapproché
const FOCUS: [number, number] = [8, 5];
const fromFocus = (x: number, z: number) => Math.hypot(x - FOCUS[0], z - FOCUS[1]);
frames.sort((a, b) => fromFocus(a.x, a.z) - fromFocus(b.x, b.z));
const DOUGONG = frames.flatMap(dougongSet);
// la console d'angle (deux faces) est montée seule, en plan rapproché ; les autres suivent pendant la sortie
const CORNER_SET = frames.filter((f) => fromFocus(f.x, f.z) === 0).flatMap(dougongSet);
const OTHER_SETS = frames.filter((f) => fromFocus(f.x, f.z) > 0).flatMap(dougongSet);

// ---- charpente : linteaux, sablières, poutres, pannes ----
const beams: { c: V3; s: V3; paint: Paint }[] = [
  { c: [0, 5.85, 5], s: [16, 0.5, 0.3], paint: 'green' }, { c: [0, 5.85, -5], s: [16, 0.5, 0.3], paint: 'green' },
  { c: [8, 5.85, 0], s: [0.3, 0.5, 10], paint: 'green' }, { c: [-8, 5.85, 0], s: [0.3, 0.5, 10], paint: 'green' },
  { c: [0, 6.22, 5], s: [16.6, 0.25, 0.6], paint: 'red' }, { c: [0, 6.22, -5], s: [16.6, 0.25, 0.6], paint: 'red' },
  { c: [8, 6.22, 0], s: [0.6, 0.25, 10.6], paint: 'red' }, { c: [-8, 6.22, 0], s: [0.6, 0.25, 10.6], paint: 'red' },
];
const Y_ZT = Y_DG + 1.75; // 柱頭枋 et pannes du plan des colonnes
const upper: { c: V3; s: V3; paint: Paint }[] = [
  // 柱頭枋 sur le plan des murs
  { c: [0, Y_ZT, 5], s: [16.6, 0.3, 0.3], paint: 'green' }, { c: [0, Y_ZT, -5], s: [16.6, 0.3, 0.3], paint: 'green' },
  { c: [8, Y_ZT, 0], s: [0.3, 0.3, 10.6], paint: 'green' }, { c: [-8, Y_ZT, 0], s: [0.3, 0.3, 10.6], paint: 'green' },
  // 撩檐枋 : panne de rive portée par le bout des consoles
  { c: [0, Y_DG + 2.4, 6.9], s: [20.2, 0.35, 0.35], paint: 'green' }, { c: [0, Y_DG + 2.4, -6.9], s: [20.2, 0.35, 0.35], paint: 'green' },
  { c: [9.9, Y_DG + 2.4, 0], s: [0.35, 0.35, 14.2], paint: 'green' }, { c: [-9.9, Y_DG + 2.4, 0], s: [0.35, 0.35, 14.2], paint: 'green' },
];
// fermes : grande poutre 四椽栿, poinçons, entrait 平梁, poinçon de faîte, contrefiches 叉手
const trussX = [-X_G, -3, 3, X_G];
const truss = trussX.flatMap((x) => [
  { c: [x, 8.6, 0] as V3, s: [0.45, 0.7, 10.6] as V3, paint: 'green' as Paint },
  { c: [x, 9.55, 2.5] as V3, s: [0.35, 1.2, 0.35] as V3, paint: 'green' as Paint },
  { c: [x, 9.55, -2.5] as V3, s: [0.35, 1.2, 0.35] as V3, paint: 'green' as Paint },
  { c: [x, 10.35, 0] as V3, s: [0.4, 0.45, 5.8] as V3, paint: 'green' as Paint },
  { c: [x, 11.3, 0] as V3, s: [0.3, 1.5, 0.3] as V3, paint: 'green' as Paint },
]);
const braces: LineDef[] = trussX.flatMap((x) => [-1, 1].map((s) => seg([x, 10.55, s * 2.6], [x, 11.95, s * 0.2], 2)));
const purlins: { c: V3; s: V3; paint: Paint }[] = [
  { c: [0, 12.1, 0], s: [2 * X_G + 1.2, 0.3, 0.3], paint: 'green' },
  { c: [0, 10.72, 2.5], s: [2 * X_G + 1.2, 0.3, 0.3], paint: 'green' }, { c: [0, 10.72, -2.5], s: [2 * X_G + 1.2, 0.3, 0.3], paint: 'green' },
  { c: [0, 9.35, 5], s: [17, 0.3, 0.3], paint: 'green' }, { c: [0, 9.35, -5], s: [17, 0.3, 0.3], paint: 'green' },
  { c: [8, 9.35, 0], s: [0.3, 0.3, 10.3], paint: 'green' }, { c: [-8, 9.35, 0], s: [0.3, 0.3, 10.3], paint: 'green' },
];
// arêtiers 角梁 : de l'angle de l'avant-toit au pied du pignon
const hipPts = (sx: number, sz: number, dy: number): V3[] => range(0, E_G, E_G / 16).map((e) => [sx * (X_E - e), roofY(sx * (X_E - e), sz * (Z_E - e)) + dy, sz * (Z_E - e)]);
const corners: [number, number][] = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
// chevrons 椽 : sous la couverture, du bord de l'avant-toit vers le faîte (ou jusqu'à l'arêtier)
const slopeLines = (step: number, dy: number, w: 0 | 1 | 2): LineDef[] => {
  const out: LineDef[] = [];
  [1, -1].forEach((sz) => range(-X_E + step / 2, X_E, step).forEach((x) => {
    const pts: V3[] = [];
    for (let ez = 0; ez <= 8.4 + 1e-6; ez += 0.3) {
      if (Math.abs(x) > X_G && ez > X_E - Math.abs(x)) break;
      const z = sz * (Z_E - ez);
      pts.push([x, roofY(x, z) + dy, z]);
    }
    if (pts.length > 1) out.push({ pts, w });
  }));
  [1, -1].forEach((sx) => range(-Z_E + step / 2, Z_E, step).forEach((z) => {
    const pts: V3[] = [];
    for (let ex = 0; ex <= E_G + 1e-6; ex += 0.3) {
      if (ex > Z_E - Math.abs(z)) break;
      const x = sx * (X_E - ex);
      pts.push([x, roofY(x, z) + dy, z]);
    }
    if (pts.length > 1) out.push({ pts, w });
  }));
  return out;
};

// ---- murs, portes, fenêtres (façade avant à claire-voie, murs pleins ailleurs) ----
const ZF = 5.03;
const lattice = (x0: number, x1: number, y0: number, y1: number, z: number, st = 0.28): LineDef[] => [
  ...[[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].map(([a, b, c, d]) => seg([a, b, z], [c, d, z], 1)),
  ...range(x0 + st, x1 - st / 2, st).map((x) => seg([x, y0, z], [x, y1, z], 0)),
  ...range(y0 + st, y1 - st / 2, st).map((y) => seg([x0, y, z], [x1, y, z], 0)),
];
const rectL = (x0: number, x1: number, y0: number, y1: number, z: number, w: 0 | 1 | 2 = 1): LineDef => ({ pts: [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z]], w });
const facade: LineDef[] = [
  // portes : quatre vantaux, panneau à claire-voie en haut, panneaux pleins en bas
  ...range(0, 3, 1).flatMap((k) => {
    const x0 = -2.65 + k * 1.325, x1 = x0 + 1.325;
    return [rectL(x0 + 0.05, x1 - 0.05, COL_Y0, 5.6, ZF), ...lattice(x0 + 0.2, x1 - 0.2, 3.5, 5.35, ZF), rectL(x0 + 0.2, x1 - 0.2, 2.95, 3.3, ZF, 0), rectL(x0 + 0.2, x1 - 0.2, 1.85, 2.75, ZF, 0)];
  }),
  ...[-1, 1].flatMap((s) => {
    const a = s * 3.35, b = s * 7.65, x0 = Math.min(a, b), x1 = Math.max(a, b), xm = (x0 + x1) / 2;
    return [rectL(x0, x1, COL_Y0, 2.7, ZF), ...lattice(x0 + 0.1, xm - 0.05, 2.8, 5.0, ZF), ...lattice(xm + 0.05, x1 - 0.1, 2.8, 5.0, ZF), rectL(x0, x1, 5.05, 5.6, ZF, 0)];
  }),
];
const walls: Solid[] = [
  { kind: 'quad', p: [[-2.65, COL_Y0, 5], [2.65, COL_Y0, 5], [2.65, 5.6, 5], [-2.65, 5.6, 5]], paint: 'door' },
  ...[-1, 1].flatMap((s): Solid[] => {
    const x0 = Math.min(s * 3.35, s * 7.65), x1 = Math.max(s * 3.35, s * 7.65);
    return [
      { kind: 'quad', p: [[x0, COL_Y0, 5], [x1, COL_Y0, 5], [x1, 2.7, 5], [x0, 2.7, 5]], paint: 'plaster' },
      { kind: 'quad', p: [[x0, 2.7, 5], [x1, 2.7, 5], [x1, 5.6, 5], [x0, 5.6, 5]], paint: 'door' },
    ];
  }),
  { kind: 'quad', p: [[-8, COL_Y0, -5], [8, COL_Y0, -5], [8, 5.6, -5], [-8, 5.6, -5]], paint: 'plaster' },
  ...[-8, 8].map((x): Solid => ({ kind: 'quad', p: [[x, COL_Y0, -5], [x, COL_Y0, 5], [x, 5.6, 5], [x, 5.6, -5]], paint: 'plaster' })),
  // 栱眼壁 : remplissage enduit entre les consoles
  ...[-5, 5].map((z): Solid => ({ kind: 'quad', p: [[-8, Y_DG, z], [8, Y_DG, z], [8, Y_ZT, z], [-8, Y_ZT, z]], paint: 'plaster' })),
  ...[-8, 8].map((x): Solid => ({ kind: 'quad', p: [[x, Y_DG, -5], [x, Y_DG, 5], [x, Y_ZT, 5], [x, Y_ZT, -5]], paint: 'plaster' })),
];
const sideWallLines: LineDef[] = [
  seg([8, COL_Y0, 5], [8, COL_Y0, -5]), seg([8, 2.7, 5], [8, 2.7, -5], 0), seg([-8, 2.7, 5], [-8, 2.7, -5], 0),
  seg([-8, 2.7, -5], [8, 2.7, -5], 0),
];

// ---- balustrade ----
const BX = PLAT.x - 0.35, BZ = PLAT.z - 0.35, BY = PLAT.h;
const railRuns: [V3, V3][] = [[[-3.5, 0, BZ], [-BX, 0, BZ]], [[-BX, 0, BZ], [-BX, 0, -BZ]], [[-BX, 0, -BZ], [BX, 0, -BZ]], [[BX, 0, -BZ], [BX, 0, BZ]], [[BX, 0, BZ], [3.5, 0, BZ]]];
const balustrade: LineDef[] = [
  ...[0.25, 0.62, 0.95].flatMap((h) => railRuns.map(([a, b]) => seg([a[0], BY + h, a[2]], [b[0], BY + h, b[2]], h === 0.95 ? 1 : 0))),
  ...railRuns.flatMap(([a, b]) => {
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(1, Math.round(L / 1.55));
    return range(0, n, 1).flatMap((k) => { const u = k / n, x = a[0] + (b[0] - a[0]) * u, z = a[2] + (b[2] - a[2]) * u; return boxEdges([x, BY + 0.6, z], [0.2, 1.2, 0.2], 0); });
  }),
];

// ---- couverture ----
const eaveLoop = (dy: number): V3[] => {
  const pts: V3[] = [];
  const edge = (x0: number, z0: number, x1: number, z1: number) => range(0, 1, 1 / 40).forEach((u) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; pts.push([x, roofY(x, z) + dy, z]); });
  edge(-X_E, Z_E, X_E, Z_E); edge(X_E, Z_E, X_E, -Z_E); edge(X_E, -Z_E, -X_E, -Z_E); edge(-X_E, -Z_E, -X_E, Z_E);
  return pts;
};
const gableRidge = (sx: number, sz: number): V3[] => range(E_G, 8.4, 0.25).map((ez) => [sx * X_G, P(ez) + 0.18, sz * (Z_E - ez)]);
const chiwen = (sx: number): V3[] => {
  const p: [number, number][] = [[0, 0], [0.1, 0.7], [-0.1, 1.3], [-0.6, 1.55], [-1.0, 1.35], [-0.9, 1.0], [-0.55, 1.05], [-0.5, 0.7], [-0.75, 0.35], [-0.8, 0]];
  let q = p;
  for (let k = 0; k < 3; k++) q = [q[0], ...q.slice(0, -1).flatMap((a, i) => { const b = q[i + 1]; return [[0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]] as [number, number][]; }), q[q.length - 1]];
  return q.map(([dx, dy]) => [sx * (X_G + 0.2) + sx * dx * 1.1, RIDGE_Y + 0.5 + dy * 1.1, 0]);
};
const ridgeBox = { c: [0, RIDGE_Y + 0.25, 0] as V3, s: [2 * X_G + 0.4, 0.5, 0.5] as V3 };

// ---- colonnes : silhouette selon la caméra (deux droites tangentes, comme au pinceau) ----
const COLS: [number, number][] = XS.flatMap((x) => ZS.map((z) => [x, z] as [number, number])).filter(([x, z]) => !(Math.abs(x) === 3 && z === 0));
COLS.sort((a, b) => fromFocus(...a) - fromFocus(...b));
const colLines = (x: number, z: number): LineDef[] => [-1, 1].map((s) => ({
  w: 2,
  pts: (az: number) => { const px = Math.cos(az) * COL_R * s, pz = -Math.sin(az) * COL_R * s; return [[x + px, COL_Y0, z + pz], [x + px, COL_Y1, z + pz]]; },
}));

// ---- calendrier du tracé (secondes) ----
const ax = (l: LineDef): LineDef => ({ ...l, axis: true });
const pl = platform;
const top = (x0: number, z0: number, x1: number, z1: number) => seg([x0, PLAT.h, z0], [x1, PLAT.h, z1], 2);
export const GROUPS: GroupDef[] = [
  // terrasse : la règle trace l'arase, puis les arêtes et l'escalier
  { mode: 'ruler', t0: 0.3, t1: 1.0, lines: [top(-PLAT.x, PLAT.z, PLAT.x, PLAT.z), top(PLAT.x, PLAT.z, PLAT.x, -PLAT.z), top(PLAT.x, -PLAT.z, -PLAT.x, -PLAT.z), top(-PLAT.x, -PLAT.z, -PLAT.x, PLAT.z)] },
  { mode: 'cascade', t0: 0.8, t1: 1.3, lines: [...boxEdges(pl.c, pl.s, 2).slice(0, 8), ...steps.flatMap((s) => boxEdges(s.c, s.s, 1))] },
  // trame des colonnes, au cordeau vermillon
  { mode: 'cascade', t0: 1.0, t1: 1.4, lines: [...XS.map((x) => ax(seg([x, PLAT.h + 0.01, -7], [x, PLAT.h + 0.01, 7]))), ...ZS.map((z) => ax(seg([-10, PLAT.h + 0.01, z], [10, PLAT.h + 0.01, z])))] },
  // bases et colonnes
  { mode: 'cascade', t0: 1.3, t1: 2.0, lines: COLS.flatMap(([x, z]) => [...boxEdges([x, PLAT.h + 0.125, z], [1.1, 0.25, 1.1], 1), ...colLines(x, z)]) },
  // linteau et sablière de façade à la règle, puis le reste du cadre
  { mode: 'ruler', t0: 1.95, t1: 2.35, lines: [seg([-8, 5.6, 5.15], [8, 5.6, 5.15], 2), seg([8, 6.35, 5.3], [-8, 6.35, 5.3], 2)] },
  { mode: 'cascade', t0: 2.15, t1: 2.55, lines: beams.flatMap((b) => boxEdges(b.c, b.s, 1)) },
  // consoles, de l'avant vers l'arrière
  { mode: 'cascade', t0: 2.45, t1: 3.6, lines: CORNER_SET.flatMap((b) => boxEdges(b.c, b.s, 1)) },
  { mode: 'cascade', t0: 3.5, t1: 4.3, lines: OTHER_SETS.flatMap((b) => boxEdges(b.c, b.s, 0)) },
  { mode: 'cascade', t0: 4.05, t1: 4.4, lines: upper.flatMap((b) => boxEdges(b.c, b.s, 1)) },
  // fermes et pannes ; la panne faîtière à la règle
  { mode: 'cascade', t0: 4.2, t1: 4.7, lines: [...truss.flatMap((b) => boxEdges(b.c, b.s, 1)), ...braces, ...purlins.slice(1).flatMap((b) => boxEdges(b.c, b.s, 1))] },
  { mode: 'ruler', t0: 4.6, t1: 4.85, lines: [seg([-X_G - 0.6, 12.25, 0.15], [X_G + 0.6, 12.25, 0.15], 2)] },
  // arêtiers et chevrons
  { mode: 'cascade', t0: 4.8, t1: 5.25, lines: [...corners.map(([sx, sz]) => ({ pts: hipPts(sx, sz, -0.3), w: 2 as const })), ...slopeLines(0.62, -0.32, 0)] },
  // le bâtiment se referme : façade, murs, balustrade
  { mode: 'cascade', t0: 5.2, t1: 5.7, lines: [...facade, ...sideWallLines] },
  { mode: 'cascade', t0: 5.3, t1: 5.8, lines: balustrade },
  // avant-toit à main levée, couverture de tuiles, arêtiers, faîtage
  { mode: 'free', t0: 5.5, t1: 5.9, lines: [{ pts: eaveLoop(0), w: 2 }, { pts: eaveLoop(-0.32), w: 1 }] },
  { mode: 'cascade', t0: 5.6, t1: 6.2, lines: slopeLines(0.42, 0.04, 0) },
  { mode: 'cascade', t0: 6.0, t1: 6.3, lines: [...corners.map(([sx, sz]) => ({ pts: hipPts(sx, sz, 0.15).slice().reverse(), w: 2 as const })), ...corners.map(([sx, sz]) => ({ pts: gableRidge(sx, sz), w: 2 as const })), ...[-1, 1].map((sx) => seg([sx * X_G, Y_GABLE + 0.05, -(Z_E - E_G)], [sx * X_G, Y_GABLE + 0.05, Z_E - E_G], 1))] },
  { mode: 'ruler', t0: 6.25, t1: 6.45, lines: [seg([-X_G - 0.2, RIDGE_Y + 0.5, 0.25], [X_G + 0.2, RIDGE_Y + 0.5, 0.25], 2)] },
  { mode: 'cascade', t0: 6.3, t1: 6.5, lines: boxEdges(ridgeBox.c, ridgeBox.s, 1) },
  { mode: 'free', t0: 6.4, t1: 6.6, lines: [{ pts: chiwen(-1), w: 2 }, { pts: chiwen(1), w: 2 }] },
];
export const CLOSE_T0 = 5.2, ROOF_T0 = 5.55, ROOF_T1 = 6.2, DRAW_END = 6.6;

// ---- pièces pleines (occultation puis couleur) ----
export const SOLIDS: Solid[] = [
  { kind: 'box', ...platform, paint: 'stone' }, ...steps.map((s): Solid => ({ kind: 'box', ...s, paint: 'stone' })),
  ...COLS.map(([x, z]): Solid => ({ kind: 'cyl', c: [x, (COL_Y0 + COL_Y1) / 2, z], r: COL_R, h: COL_Y1 - COL_Y0, paint: 'column' })),
  ...COLS.map(([x, z]): Solid => ({ kind: 'box', c: [x, PLAT.h + 0.125, z], s: [1.1, 0.25, 1.1], paint: 'stone' })),
  ...[...beams, ...upper, ...DOUGONG].map((b): Solid => ({ kind: 'box', ...b })),
  ...walls,
  { kind: 'box', ...ridgeBox, paint: 'ridge' },
];
