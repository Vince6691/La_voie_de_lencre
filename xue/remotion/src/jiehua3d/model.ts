// Salle de trois travées sur deux, toit en demi-croupe (歇山) sur terrasse, modélisée en volume pour être rendue
// en traits d'encre (界畫) : chaque pièce de la charpente est une suite de traits, posés dans l'ordre du chantier —
// terrasse, trame des colonnes, colonnes, linteaux, consoles 斗拱, poutres et pannes, chevrons — puis le bâtiment
// se referme (murs, portes, balustrade, toit). Deux styles :
// - 'song' (Yingzao fashi, 1103) : grandes consoles espacées, toit doux, terrasse de pierre, enduit blanc ;
// - 'qing' (Gongcheng zuofa, 1734, manière des palais) : consoles menues et serrées, double linteau, consoles
//   d'angle 雀替, toit raide aux tuiles vernissées jaunes, grands épis 正吻 et bêtes 走獸 sur les arêtiers,
//   pignon rouge, socle 須彌座 de marbre blanc à balustrade à dalles, rampe 御路, treillis en losanges 菱花.
// Repère : x vers la droite, y vers le haut, z vers le spectateur (façade principale en z > 0), 1 unité ≈ 1 m.
export type V3 = [number, number, number];
export type Style = 'song' | 'qing';
// pts : polyligne fixe, ou fonction de l'azimut de la caméra (silhouette des colonnes)
export type LineDef = { pts: V3[] | ((az: number) => V3[]); w: 0 | 1 | 2; axis?: boolean };
// flat : 'plan' (tracé à plat sur le papier à sa place, puis monte à sa hauteur), sinon élévation couchée sur le
// papier ; base : terrasse, déjà en place avant l'assemblage (dessin à plat puis soulèvement, voir JiehuaPli)
export type GroupDef = { mode: 'ruler' | 'free' | 'cascade'; t0: number; t1: number; lines: LineDef[]; flat?: 'plan'; base?: boolean };
// pièce de l'assemblage : ses traits et ses volumes arrivent ensemble ; roof : la couverture (surface du toit)
// path : 'side' (arrive de côté, juste au-dessus de sa place, puis descend), 'fall' (tombe à la verticale),
// 'slide' (glisse à sa hauteur) ; w : part de temps que la pièce occupe dans l'assemblage
export type Part = { lines: LineDef[]; solids: Solid[]; c: V3; roof?: boolean; path: 'side' | 'fall' | 'slide'; w: number };
// pièces pleines : masquent les traits cachés une fois le bâtiment refermé, puis reçoivent la couleur
export type Paint = 'stone' | 'marble' | 'column' | 'door' | 'plaster' | 'wall' | 'green' | 'blue' | 'red' | 'roof' | 'ridge';
export type Solid =
  | { kind: 'box'; c: V3; s: V3; paint: Paint }
  | { kind: 'cyl'; c: V3; r: number; h: number; paint: Paint }
  | { kind: 'quad'; p: V3[]; paint: Paint }
  // polygone plan quelconque, dans un plan x = cte ou z = cte (épis de faîtage, pignons, 雀替)
  | { kind: 'poly'; p: V3[]; plane: 'x' | 'z'; paint: Paint };
export type Cam = { az: number; el: number; zoom: number; target: V3 };
export type Model = {
  groups: GroupDef[]; solids: Solid[]; parts: Part[]; roofY: (x: number, z: number) => number;
  X_E: number; Z_E: number; RIDGE_Y: number; CLOSE_T0: number; ROOF_T0: number; ROOF_T1: number; DRAW_END: number;
  close: Cam[]; wide: Cam;
};

type Box = { c: V3; s: V3; paint: Paint };
type Cfg = {
  plat: { x: number; z: number; h: number }; plinthH: number; colY1: number; colR: number;
  lintels: { y: number; h: number; t: number; paint: Paint; over?: number }[]; // anneau de linteaux (centre y)
  yDG: number; dg: number; arm: number; front: number[]; side: number[];        // consoles : base, échelle, positions
  prof: [number, number][]; yGable: number; upturn: number; ridgeH: number;
  truss: { beamY: number; beamH: number; postY: number; postH: number; upY: number; upH: number; rpY: number; rpH: number; midP: number; ridgeP: number; colP: number; braces: boolean };
  qing: boolean; close: Cam[]; wide: Cam;
};
const CFG: Record<Style, Cfg> = {
  song: {
    plat: { x: 12, z: 9, h: 1.4 }, plinthH: 0.25, colY1: 6.1, colR: 0.35,
    lintels: [{ y: 5.85, h: 0.5, t: 0.3, paint: 'green' }, { y: 6.22, h: 0.25, t: 0.6, paint: 'red', over: 0.6 }],
    yDG: 6.35, dg: 1, arm: 1, front: [-8, -5.5, -3, 0, 3, 5.5, 8], side: [-5, -2.5, 0, 2.5, 5],
    prof: [[0, 8.6], [1.5, 9.05], [3.4, 9.6], [5.9, 10.8], [8.4, 12.3]], yGable: 10.3, upturn: 0.9, ridgeH: 0.5,
    truss: { beamY: 8.6, beamH: 0.7, postY: 9.55, postH: 1.2, upY: 10.35, upH: 0.45, rpY: 11.3, rpH: 1.5, midP: 10.58, ridgeP: 12.1, colP: 9.35, braces: true },
    qing: false,
    close: [
      { az: 0.8, el: 0.22, zoom: 140, target: [9.0, 2.4, 6.8] },     // pied de la colonne d'angle
      { az: 0.72, el: 0.24, zoom: 175, target: [8.3, 5.2, 5.6] },    // on monte le long de la colonne
      { az: 0.66, el: 0.26, zoom: 250, target: [8.3, 7.4, 5.5] },    // la console d'angle se monte
    ],
    wide: { az: 0.56, el: 0.5, zoom: 46, target: [0, 6.0, 0] },
  },
  qing: {
    plat: { x: 12.5, z: 9.5, h: 1.8 }, plinthH: 0.15, colY1: 7.55, colR: 0.36,
    // 小額枋, 由額墊板, 大額枋, 平板枋
    lintels: [
      { y: 6.55, h: 0.4, t: 0.3, paint: 'green' }, { y: 6.85, h: 0.2, t: 0.14, paint: 'red' },
      { y: 7.25, h: 0.6, t: 0.36, paint: 'blue' }, { y: 7.65, h: 0.2, t: 0.55, paint: 'green', over: 0.5 },
    ],
    yDG: 7.75, dg: 0.4, arm: 0.85,
    front: [-8, -6.75, -5.5, -4.25, -3, -1.8, -0.6, 0.6, 1.8, 3, 4.25, 5.5, 6.75, 8],
    side: [-5, -3.75, -2.5, -1.25, 0, 1.25, 2.5, 3.75, 5],
    prof: [[0, 8.2], [2.64, 8.9], [3.4, 9.25], [5.9, 10.95], [8.4, 13.25]], yGable: 10.4, upturn: 0.5, ridgeH: 0.9,
    truss: { beamY: 8.7, beamH: 0.7, postY: 9.675, postH: 1.25, upY: 10.5, upH: 0.5, rpY: 11.85, rpH: 2.2, midP: 10.75, ridgeP: 13.05, colP: 9.05, braces: false },
    qing: true,
    close: [
      { az: 0.8, el: 0.22, zoom: 130, target: [9.6, 2.8, 7.3] },
      { az: 0.72, el: 0.24, zoom: 165, target: [8.4, 6.0, 5.6] },
      { az: 0.66, el: 0.26, zoom: 330, target: [8.2, 8.2, 5.3] },
    ],
    wide: { az: 0.56, el: 0.5, zoom: 42, target: [0, 7.0, 0] },
  },
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
const closed = (p: V3[], w: 0 | 1 | 2 = 1): LineDef => ({ pts: [...p, p[0]], w });
const smooth = (p: [number, number][], n = 3) => {
  let q = p;
  for (let k = 0; k < n; k++) q = [q[0], ...q.slice(0, -1).flatMap((a, i) => { const b = q[i + 1]; return [[0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]] as [number, number][]; }), q[q.length - 1]];
  return q;
};
// boîte orientée le long d'un mur : a = position le long du mur, o = saillie vers l'extérieur
type Frame = { x: number; z: number; t: [number, number]; n: [number, number] };
const local = (f: Frame, a: number, o: number, y: number): V3 => [f.x + f.t[0] * a + f.n[0] * o, y, f.z + f.t[1] * a + f.n[1] * o];
const lbox = (f: Frame, a: number, o: number, y: number, la: number, lo: number, h: number): { c: V3; s: V3 } => {
  const c = local(f, a, o, y);
  const sx = Math.abs(f.t[0]) * la + Math.abs(f.n[0]) * lo, sz = Math.abs(f.t[1]) * la + Math.abs(f.n[1]) * lo;
  return { c, s: [sx, h, sz] };
};
// droites d'une famille (direction d) qui hachurent un rectangle du plan z, au pas st
const hatch = (x0: number, x1: number, y0: number, y1: number, z: number, ang: number, st: number): LineDef[] => {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const cs = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => x * nx + y * ny);
  const out: LineDef[] = [];
  for (let c = Math.min(...cs) + st / 2; c < Math.max(...cs); c += st) {
    // point de la droite le plus proche de l'origine, puis découpe par le rectangle (Liang–Barsky)
    const px = nx * c, py = ny * c;
    let ta = -1e9, tb = 1e9;
    for (const [p, q] of [[-dx, px - x0], [dx, x1 - px], [-dy, py - y0], [dy, y1 - py]] as [number, number][]) {
      if (Math.abs(p) < 1e-9) { if (q < 0) { ta = 1; tb = 0; } continue; }
      const r = q / p;
      if (p < 0) ta = Math.max(ta, r); else tb = Math.min(tb, r);
    }
    if (tb - ta > 0.02) out.push(seg([px + dx * ta, py + dy * ta, z], [px + dx * tb, py + dy * tb, z], 0));
  }
  return out;
};

export function buildModel(style: Style): Model {
  const C = CFG[style], Q = C.qing, PLAT = C.plat;
  const XS = [-8, -3, 3, 8], ZS = [-5, 0, 5];
  const COL_Y0 = PLAT.h + C.plinthH, COL_Y1 = C.colY1, COL_R = C.colR, Y_DG = C.yDG;
  const DOOR_TOP = C.lintels[0].y - C.lintels[0].h / 2;   // dessous du linteau bas
  // ---- toit : profil par distance au bord de l'avant-toit (舉折 / 舉架 : pente qui se raidit vers le faîte) ----
  const Z_E = 8.4, X_E = 11.4, PROF = C.prof;
  const P = (e: number) => {
    const c = Math.min(8.4, Math.max(0, e));
    for (let i = 1; i < PROF.length; i++) if (c <= PROF[i][0]) { const [a, ya] = PROF[i - 1], [b, yb] = PROF[i]; return ya + ((c - a) / (b - a)) * (yb - ya); }
    return PROF[PROF.length - 1][1];
  };
  let E_G = 0; while (P(E_G) < C.yGable && E_G < 8.4) E_G += 0.005;   // distance au bord où commence le pignon
  const X_G = X_E - E_G, RIDGE_Y = PROF[PROF.length - 1][1], Y_GABLE = C.yGable;
  // hauteur du toit en (x, z) : versants avant/arrière, croupes sous le pignon, angles relevés (起翹)
  const roofY = (x: number, z: number) => {
    const ez = Z_E - Math.abs(z), ex = X_E - Math.abs(x);
    const y = Math.abs(x) <= X_G ? P(ez) : Math.min(P(ez), P(ex));
    return y + C.upturn * Math.exp(-(Math.max(0, ex) + Math.max(0, ez)) / 1.6);
  };

  // ---- terrasse (dalle, ou socle 須彌座 à moulures), escalier, rampe 御路 ----
  const bands: { h: number; inset: number }[] = Q
    ? [{ h: 0.15, inset: -0.15 }, { h: 0.3, inset: 0 }, { h: 0.15, inset: 0.15 }, { h: 0.7, inset: 0.3 }, { h: 0.15, inset: 0.15 }, { h: 0.35, inset: 0 }]
    : [{ h: PLAT.h, inset: 0 }];
  let yb = 0;
  const platBoxes: Box[] = bands.map(({ h, inset }) => { const b: Box = { c: [0, yb + h / 2, 0], s: [2 * (PLAT.x - inset), h, 2 * (PLAT.z - inset)], paint: Q ? 'marble' : 'stone' }; yb += h; return b; });
  const nSteps = Math.round(PLAT.h / 0.28), stepH = PLAT.h / nSteps;
  const steps: Box[] = range(0, nSteps - 1, 1).map((k) => {
    const d = 0.48 * (nSteps - k), h = stepH * (k + 1);
    return { c: [0, h / 2, PLAT.z + d / 2], s: [7, h, d], paint: Q ? 'marble' : 'stone' };
  });
  const rampEnd = PLAT.z + 0.48 * nSteps;
  const ramp: V3[] = [[-1.1, PLAT.h + 0.04, PLAT.z], [1.1, PLAT.h + 0.04, PLAT.z], [1.1, 0.06, rampEnd], [-1.1, 0.06, rampEnd]];
  const rampIn = (u: number, v: number): V3 => {   // point de la rampe : u en travers (−1..1), v le long (0..1)
    return [u * 0.85, lerp(PLAT.h + 0.05, 0.07, v), lerp(PLAT.z, rampEnd, v)];
  };

  // ---- consoles 斗拱 ----
  const s = C.dg, ak = C.arm;
  const dougongSet = (f: Frame) => {
    const y = Y_DG, out: Box[] = [];
    const add = (b: { c: V3; s: V3 }, paint: Paint) => out.push({ ...b, paint });
    add(lbox(f, 0, 0, y + 0.2 * s, 0.75 * s, 0.75 * s, 0.4 * s), 'green');                    // 櫨斗 / 坐斗
    add(lbox(f, 0, 0, y + 0.55 * s, 2.0 * s * ak, 0.3 * s, 0.3 * s), 'blue');                  // 泥道栱 / 正心瓜栱
    add(lbox(f, 0, 0.2 * s, y + 0.55 * s, 0.3 * s, 1.6 * s, 0.3 * s), 'blue');                 // 華栱 / 翹
    [-0.85, 0.85].forEach((a) => add(lbox(f, a * s * ak, 0, y + 0.85 * s, 0.38 * s, 0.38 * s, 0.3 * s), 'green'));
    add(lbox(f, 0, 1.0 * s, y + 0.85 * s, 0.38 * s, 0.38 * s, 0.3 * s), 'green');
    add(lbox(f, 0, 0, y + 1.15 * s, 3.0 * s * ak, 0.3 * s, 0.3 * s), 'blue');                  // 慢栱 / 萬栱
    add(lbox(f, 0, 0.65 * s, y + 1.15 * s, 0.3 * s, 2.5 * s, 0.3 * s), 'blue');                // 華栱 / 昂
    [-1.3, 1.3].forEach((a) => add(lbox(f, a * s * ak, 0, y + 1.45 * s, 0.38 * s, 0.38 * s, 0.3 * s), 'green'));
    add(lbox(f, 0, 1.9 * s, y + 1.45 * s, 0.38 * s, 0.38 * s, 0.3 * s), 'green');
    add(lbox(f, 0, 1.9 * s, y + 1.75 * s, 2.0 * s * ak, 0.3 * s, 0.3 * s), 'blue');            // 令栱 / 廂栱
    [-0.85, 0.85].forEach((a) => add(lbox(f, a * s * ak, 1.9 * s, y + 2.05 * s, 0.38 * s, 0.38 * s, 0.3 * s), 'green'));
    return out;
  };
  const frames: Frame[] = [];
  [5, -5].forEach((z) => C.front.forEach((x) => frames.push({ x, z, t: [1, 0], n: [0, Math.sign(z)] })));
  [8, -8].forEach((x) => C.side.forEach((z) => frames.push({ x, z, t: [0, 1], n: [Math.sign(x), 0] })));
  // en partant de l'angle avant droit, où la caméra commence en plan rapproché
  const fromFocus = (x: number, z: number) => Math.hypot(x - 8, z - 5);
  frames.sort((a, b) => fromFocus(a.x, a.z) - fromFocus(b.x, b.z));
  const DOUGONG = frames.flatMap(dougongSet);
  // la console d'angle (deux faces) est montée seule, en plan rapproché ; les autres suivent pendant la sortie
  const CORNER_SET = frames.filter((f) => fromFocus(f.x, f.z) === 0).flatMap(dougongSet);
  const OTHER_SETS = frames.filter((f) => fromFocus(f.x, f.z) > 0).flatMap(dougongSet);

  // ---- charpente : linteaux, sablières, poutres, pannes ----
  const ring = (y: number, h: number, t: number, paint: Paint, over = 0, o = 0): Box[] => [
    { c: [0, y, 5 + o], s: [16 + over, h, t], paint }, { c: [0, y, -5 - o], s: [16 + over, h, t], paint },
    { c: [8 + o, y, 0], s: [t, h, 10 + over], paint }, { c: [-8 - o, y, 0], s: [t, h, 10 + over], paint },
  ];
  const beams: Box[] = C.lintels.flatMap((l) => ring(l.y, l.h, l.t, l.paint, l.over ?? 0));
  const Y_ZT = Y_DG + 1.75 * s, O_E = 1.9 * s;   // 柱頭枋 ; saillie de la panne de rive
  // la panne de rive s'arrête à l'angle de son anneau quand le toit est bas aux angles (Qing), sinon elle le perce
const upper: Box[] = [...ring(Y_ZT, 0.3, 0.3, 'green', 0.6), ...ring(Y_DG + 2.4 * s, 0.35, 0.35, 'green', Q ? 2 * O_E + 0.35 : 4.2, O_E)];
  // fermes : grande poutre, poinçons, entrait, poinçon de faîte (+ contrefiches 叉手 chez les Song)
  const T = C.truss, trussX = [-(X_G - 0.4), -3, 3, X_G - 0.4];   // fermes de pignon un peu en retrait du pignon
  const truss: Box[] = trussX.flatMap((x) => [
    { c: [x, T.beamY, 0], s: [0.45, T.beamH, 10.6], paint: 'green' },
    { c: [x, T.postY, 2.5], s: [0.35, T.postH, 0.35], paint: 'green' },
    { c: [x, T.postY, -2.5], s: [0.35, T.postH, 0.35], paint: 'green' },
    { c: [x, T.upY, 0], s: [0.4, T.upH, 5.8], paint: 'green' },
    { c: [x, T.rpY, 0], s: [0.3, T.rpH, 0.3], paint: 'green' },
  ] as Box[]);
  const braces: LineDef[] = T.braces ? trussX.flatMap((x) => [-1, 1].map((k) => seg([x, T.upY + 0.2, k * 2.6], [x, T.rpY + T.rpH / 2 - 0.1, k * 0.2], 2))) : [];
  const purlins: Box[] = [
    // pannes intermédiaires arrêtées au pignon (au-delà, elles perceraient les croupes)
    { c: [0, T.midP, 2.5], s: [2 * X_G - 0.3, 0.3, 0.3], paint: 'green' }, { c: [0, T.midP, -2.5], s: [2 * X_G - 0.3, 0.3, 0.3], paint: 'green' },
    ...ring(T.colP, 0.3, 0.3, 'green', Q ? 0.3 : 1),
  ];
  // arêtiers 角梁 : de l'angle de l'avant-toit au pied du pignon
  const hipAt = (sx: number, sz: number, e: number, dy: number): V3 => [sx * (X_E - e), roofY(sx * (X_E - e), sz * (Z_E - e)) + dy, sz * (Z_E - e)];
  const hipPts = (sx: number, sz: number, dy: number): V3[] => range(0, E_G, E_G / 16).map((e) => hipAt(sx, sz, e, dy));
  const corners: [number, number][] = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
  // chevrons 椽 (sous la couverture) ou rangs de tuiles (dessus), du bord de l'avant-toit vers le faîte
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
  const ZF = 5.03, HD = DOOR_TOP - COL_Y0, fy = (f: number) => COL_Y0 + HD * f;
  const rectL = (x0: number, x1: number, y0: number, y1: number, z: number, w: 0 | 1 | 2 = 1): LineDef => ({ pts: [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z]], w });
  // claire-voie : grille carrée (Song) ou losanges à trois directions 三交六椀菱花 (Qing)
  const lattice = (x0: number, x1: number, y0: number, y1: number, z: number): LineDef[] => [
    rectL(x0, x1, y0, y1, z),
    ...(Q
      ? [...hatch(x0, x1, y0, y1, z, Math.PI / 3, 0.24), ...hatch(x0, x1, y0, y1, z, -Math.PI / 3, 0.24), ...hatch(x0, x1, y0, y1, z, Math.PI / 2, 0.24)]
      : [...range(x0 + 0.28, x1 - 0.14, 0.28).map((x) => seg([x, y0, z], [x, y1, z], 0)), ...range(y0 + 0.28, y1 - 0.14, 0.28).map((y) => seg([x0, y, z], [x1, y, z], 0))]),
  ];
  const facade: LineDef[] = [
    // portes : quatre vantaux, panneau à claire-voie en haut, panneaux pleins en bas
    ...range(0, 3, 1).flatMap((k) => {
      const x0 = -2.65 + k * 1.325, x1 = x0 + 1.325;
      return [rectL(x0 + 0.05, x1 - 0.05, COL_Y0, DOOR_TOP, ZF), ...lattice(x0 + 0.2, x1 - 0.2, fy(0.47), fy(0.94), ZF), rectL(x0 + 0.2, x1 - 0.2, fy(0.33), fy(0.42), ZF, 0), rectL(x0 + 0.2, x1 - 0.2, fy(0.05), fy(0.28), ZF, 0)];
    }),
    ...[-1, 1].flatMap((k) => {
      const x0 = Math.min(k * 3.35, k * 7.65), x1 = Math.max(k * 3.35, k * 7.65), xm = (x0 + x1) / 2;
      return [rectL(x0, x1, COL_Y0, fy(0.27), ZF), ...lattice(x0 + 0.1, xm - 0.05, fy(0.29), fy(0.85), ZF), ...lattice(xm + 0.05, x1 - 0.1, fy(0.29), fy(0.85), ZF), rectL(x0, x1, fy(0.86), DOOR_TOP, ZF, 0)];
    }),
  ];
  const WALL: Paint = Q ? 'wall' : 'plaster';
  const quad = (p: V3[], paint: Paint): Solid => ({ kind: 'quad', p, paint });
  const walls: Solid[] = [
    quad([[-2.65, COL_Y0, 5], [2.65, COL_Y0, 5], [2.65, DOOR_TOP, 5], [-2.65, DOOR_TOP, 5]], 'door'),
    ...[-1, 1].flatMap((k): Solid[] => {
      const x0 = Math.min(k * 3.35, k * 7.65), x1 = Math.max(k * 3.35, k * 7.65);
      return [quad([[x0, COL_Y0, 5], [x1, COL_Y0, 5], [x1, fy(0.27), 5], [x0, fy(0.27), 5]], WALL), quad([[x0, fy(0.27), 5], [x1, fy(0.27), 5], [x1, DOOR_TOP, 5], [x0, DOOR_TOP, 5]], 'door')];
    }),
    quad([[-8, COL_Y0, -5], [8, COL_Y0, -5], [8, DOOR_TOP, -5], [-8, DOOR_TOP, -5]], WALL),
    ...[-8, 8].map((x) => quad([[x, COL_Y0, -5], [x, COL_Y0, 5], [x, DOOR_TOP, 5], [x, DOOR_TOP, -5]], WALL)),
    // 栱眼壁 / 栱墊板 : remplissage entre les consoles
    ...[-5, 5].map((z) => quad([[-8, Y_DG, z], [8, Y_DG, z], [8, Y_ZT, z], [-8, Y_ZT, z]], Q ? 'red' : 'plaster')),
    ...[-8, 8].map((x) => quad([[x, Y_DG, -5], [x, Y_DG, 5], [x, Y_ZT, 5], [x, Y_ZT, -5]], Q ? 'red' : 'plaster')),
  ];
  const sideWallLines: LineDef[] = [
    seg([8, COL_Y0, 5], [8, COL_Y0, -5]), seg([8, fy(0.27), 5], [8, fy(0.27), -5], 0), seg([-8, fy(0.27), 5], [-8, fy(0.27), -5], 0),
    seg([-8, fy(0.27), -5], [8, fy(0.27), -5], 0),
  ];
  // 雀替 (Qing) : consoles chantournées sous le linteau, de part et d'autre des colonnes de façade
  const queti: { p: V3[] }[] = Q ? [-8, -3, 3, 8].flatMap((xc) => [-1, 1].filter((d) => Math.abs(xc + d) < 8).map((d) => {
    const pr = smooth([[0, 0], [0.95, 0], [0.9, -0.12], [0.7, -0.22], [0.55, -0.4], [0.35, -0.55], [0.15, -0.75], [0, -0.8]], 2);
    return { p: pr.map(([u, v]) => [xc + d * (COL_R + u), DOOR_TOP + v, 5.04] as V3) };
  })) : [];

  // ---- balustrade : rampes et poteaux (Song), dalles de marbre entre poteaux à chapiteau (Qing) ----
  const BX = PLAT.x - 0.35, BZ = PLAT.z - 0.35, BY = PLAT.h;
  const runs: [V3, V3][] = [[[-3.5, 0, BZ], [-BX, 0, BZ]], [[-BX, 0, BZ], [-BX, 0, -BZ]], [[-BX, 0, -BZ], [BX, 0, -BZ]], [[BX, 0, -BZ], [BX, 0, BZ]], [[BX, 0, BZ], [3.5, 0, BZ]]];
  const posts: V3[] = [], slabs: Box[] = [];
  runs.forEach(([a, b]) => {
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(1, Math.round(L / 1.55));
    range(0, n, 1).forEach((k) => { const u = k / n; posts.push([a[0] + (b[0] - a[0]) * u, 0, a[2] + (b[2] - a[2]) * u]); });
    if (Q) range(0, n - 1, 1).forEach((k) => {
      const u = (k + 0.5) / n, x = a[0] + (b[0] - a[0]) * u, z = a[2] + (b[2] - a[2]) * u, len = L / n - 0.28, alongX = Math.abs(b[0] - a[0]) > 1e-6;
      slabs.push({ c: [x, BY + 0.47, z], s: alongX ? [len, 0.84, 0.14] : [0.14, 0.84, len], paint: 'marble' });
    });
  });
  const postBoxes: Box[] = posts.flatMap(([x, , z]) => Q
    ? [{ c: [x, BY + 0.6, z], s: [0.26, 1.2, 0.26], paint: 'marble' }, { c: [x, BY + 1.33, z], s: [0.22, 0.26, 0.22], paint: 'marble' }] as Box[]
    : [{ c: [x, BY + 0.6, z], s: [0.2, 1.2, 0.2], paint: 'stone' }] as Box[]);
  const balustrade: LineDef[] = Q
    ? [...slabs.flatMap((b) => [...boxEdges(b.c, b.s, 0), seg([b.c[0] - b.s[0] / 2, BY + 0.62, b.c[2] - b.s[2] / 2], [b.c[0] + b.s[0] / 2, BY + 0.62, b.c[2] + b.s[2] / 2], 0)]), ...postBoxes.flatMap((b) => boxEdges(b.c, b.s, 0))]
    : [...[0.25, 0.62, 0.95].flatMap((h) => runs.map(([a, b]) => seg([a[0], BY + h, a[2]], [b[0], BY + h, b[2]], h === 0.95 ? 1 : 0))), ...postBoxes.flatMap((b) => boxEdges(b.c, b.s, 0))];

  // ---- couverture ----
  const eaveLoop = (dy: number): V3[] => {
    const pts: V3[] = [];
    const edge = (x0: number, z0: number, x1: number, z1: number) => range(0, 1, 1 / 40).forEach((u) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; pts.push([x, roofY(x, z) + dy, z]); });
    edge(-X_E, Z_E, X_E, Z_E); edge(X_E, Z_E, X_E, -Z_E); edge(X_E, -Z_E, -X_E, -Z_E); edge(-X_E, -Z_E, -X_E, Z_E);
    return pts;
  };
  const gableRidge = (sx: number, sz: number): V3[] => range(E_G, 8.4, 0.25).map((ez) => [sx * X_G, P(ez) + 0.18, sz * (Z_E - ez)]);
  const RT = RIDGE_Y + C.ridgeH;
  // épi de faîtage : 鴟吻 Song (queue enroulée vers l'intérieur) ou 正吻 Qing (gueule qui avale le faîte, queue
  // retroussée vers l'extérieur, poignée d'épée 劍把) — dx > 0 vers l'extérieur
  const wenShape: [number, number][] = Q
    ? [[0.35, 0], [0.5, 0.35], [0.28, 0.55], [0.55, 0.85], [0.3, 1.05], [0.38, 1.6], [0.62, 2.0], [0.78, 2.35], [0.52, 2.58], [0.26, 2.32], [0.36, 2.1], [0.12, 1.98], [-0.18, 2.02], [-0.42, 1.8], [-0.52, 1.3], [-0.62, 0.8], [-0.78, 0.4], [-0.82, 0]]
    : [[0, 0], [0.1, 0.7], [-0.1, 1.3], [-0.6, 1.55], [-1.0, 1.35], [-0.9, 1.0], [-0.55, 1.05], [-0.5, 0.7], [-0.75, 0.35], [-0.8, 0]];
  const wenK = Q ? 1.0 : 1.1;
  const wen = (sx: number): V3[] => smooth(wenShape).map(([dx, dy]) => [sx * (X_G + 0.2) + sx * dx * wenK, RT + dy * wenK, 0]);
  const sword = (sx: number): LineDef => closed([[sx * (X_G - 0.05), RT + 2.0, 0], [sx * (X_G + 0.12), RT + 2.0, 0], [sx * (X_G + 0.12), RT + 2.55, 0], [sx * (X_G - 0.05), RT + 2.55, 0]], 1);
  const ridgeBox = { c: [0, RIDGE_Y + C.ridgeH / 2, 0] as V3, s: [2 * X_G + 0.4, C.ridgeH, 0.5] as V3 };
  // 走獸 (Qing) : le 仙人 au bout de l'arêtier, puis une file de petites bêtes, et le 戧獸 plus grand
  const beasts: Box[] = Q ? corners.flatMap(([sx, sz]) => [
    ...range(0, 5, 1).map((k) => { const sz0 = k === 0 ? 0.26 : 0.2, c = hipAt(sx, sz, 0.35 + 0.42 * k, 0.22 + sz0 / 2); return { c, s: [sz0, sz0 * 1.4, sz0], paint: 'roof' } as Box; }),
    { c: hipAt(sx, sz, 3.0, 0.5), s: [0.4, 0.6, 0.4], paint: 'roof' } as Box,
  ]) : [];
  // pignon rouge 山花 (Qing), entre les deux 博縫
  const gablePoly = (sx: number): V3[] => [...range(E_G, 8.4, 0.25).map((ez) => [sx * (X_G + 0.04), P(ez), -(Z_E - ez)] as V3), ...range(E_G, 8.4, 0.25).reverse().map((ez) => [sx * (X_G + 0.04), P(ez), Z_E - ez] as V3)];

  // ---- colonnes : silhouette selon la caméra (deux droites tangentes, comme au pinceau) ----
  const COLS: [number, number][] = XS.flatMap((x) => ZS.map((z) => [x, z] as [number, number])).filter(([x, z]) => !(Math.abs(x) === 3 && z === 0));
  COLS.sort((a, b) => fromFocus(...a) - fromFocus(...b));
  const colLines = (x: number, z: number): LineDef[] => [-1, 1].map((k) => ({
    w: 2,
    pts: (az: number) => { const px = Math.cos(az) * COL_R * k, pz = -Math.sin(az) * COL_R * k; return [[x + px, COL_Y0, z + pz], [x + px, COL_Y1, z + pz]]; },
  }));
  const plinth = (x: number, z: number): Box => ({ c: [x, PLAT.h + C.plinthH / 2, z], s: [1.1, C.plinthH, 1.1], paint: Q ? 'marble' : 'stone' });

  // ---- calendrier du tracé (secondes) ----
  const ax = (l: LineDef): LineDef => ({ ...l, axis: true });
  const top = (x0: number, z0: number, x1: number, z1: number) => seg([x0, PLAT.h, z0], [x1, PLAT.h, z1], 2);
  const LB = C.lintels[0], LT = C.lintels[C.lintels.length - 1];
  const groups: GroupDef[] = [
    // terrasse : la règle trace l'arase, puis les moulures, l'escalier et la rampe
    { mode: 'ruler', t0: 0.3, t1: 1.0, flat: 'plan', base: true, lines: [top(-PLAT.x, PLAT.z, PLAT.x, PLAT.z), top(PLAT.x, PLAT.z, PLAT.x, -PLAT.z), top(PLAT.x, -PLAT.z, -PLAT.x, -PLAT.z), top(-PLAT.x, -PLAT.z, -PLAT.x, PLAT.z)] },
    { mode: 'cascade', t0: 0.8, t1: 1.3, base: true, lines: [
      ...platBoxes.slice().reverse().flatMap((b) => boxEdges(b.c, b.s, 2).slice(0, 8)), ...steps.flatMap((b) => boxEdges(b.c, b.s, 1)),
      ...(Q ? [closed(ramp, 1), closed([rampIn(-1, 0.08), rampIn(1, 0.08), rampIn(1, 0.92), rampIn(-1, 0.92)], 0), ...range(0.2, 0.8, 0.15).map((v) => ({ pts: range(-1, 1, 0.1).map((u) => { const p = rampIn(u * 0.8, v + 0.03 * Math.sin(u * 7)); return p; }), w: 0 as const }))] : []),
    ] },
    // trame des colonnes, au cordeau vermillon
    { mode: 'cascade', t0: 1.0, t1: 1.4, flat: 'plan', base: true, lines: [...XS.map((x) => ax(seg([x, PLAT.h + 0.01, -7], [x, PLAT.h + 0.01, 7]))), ...ZS.map((z) => ax(seg([-10, PLAT.h + 0.01, z], [10, PLAT.h + 0.01, z])))] },
    // bases et colonnes
    { mode: 'cascade', t0: 1.3, t1: 2.0, lines: COLS.flatMap(([x, z]) => { const b = plinth(x, z); return [...boxEdges(b.c, b.s, 1), ...colLines(x, z)]; }) },
    // linteau et sablière de façade à la règle, puis le reste du cadre (et les 雀替)
    { mode: 'ruler', t0: 1.95, t1: 2.35, lines: [seg([-8, LB.y - LB.h / 2, 5 + LB.t / 2], [8, LB.y - LB.h / 2, 5 + LB.t / 2], 2), seg([8, LT.y + LT.h / 2, 5 + LT.t / 2], [-8, LT.y + LT.h / 2, 5 + LT.t / 2], 2)] },
    { mode: 'cascade', t0: 2.15, t1: 2.55, lines: [...beams.flatMap((b) => boxEdges(b.c, b.s, 1)), ...queti.map((q) => closed(q.p, 1))] },
    // consoles : celle de l'angle en plan rapproché, puis toutes les autres
    { mode: 'cascade', t0: 2.45, t1: 3.6, lines: CORNER_SET.flatMap((b) => boxEdges(b.c, b.s, 1)) },
    { mode: 'cascade', t0: 3.5, t1: 4.3, lines: OTHER_SETS.flatMap((b) => boxEdges(b.c, b.s, 0)) },
    { mode: 'cascade', t0: 4.05, t1: 4.4, lines: upper.flatMap((b) => boxEdges(b.c, b.s, 1)) },
    // fermes et pannes ; la panne faîtière à la règle
    { mode: 'cascade', t0: 4.2, t1: 4.7, lines: [...truss.flatMap((b) => boxEdges(b.c, b.s, 1)), ...braces, ...purlins.flatMap((b) => boxEdges(b.c, b.s, 1))] },
    { mode: 'ruler', t0: 4.6, t1: 4.85, lines: [seg([-X_G - 0.6, T.ridgeP + 0.15, 0.15], [X_G + 0.6, T.ridgeP + 0.15, 0.15], 2)] },
    // arêtiers et chevrons
    { mode: 'cascade', t0: 4.8, t1: 5.25, lines: [...corners.map(([sx, sz]) => ({ pts: hipPts(sx, sz, -0.3), w: 2 as const })), ...slopeLines(0.62, -0.32, 0)] },
    // le bâtiment se referme : façade, murs, balustrade
    { mode: 'cascade', t0: 5.2, t1: 5.7, lines: [...facade, ...sideWallLines] },
    { mode: 'cascade', t0: 5.3, t1: 5.8, lines: balustrade },
    // avant-toit à main levée, couverture de tuiles, arêtiers (et leurs bêtes), faîtage, épis
    { mode: 'free', t0: 5.5, t1: 5.9, lines: [{ pts: eaveLoop(0), w: 2 }, { pts: eaveLoop(-0.32), w: 1 }] },
    { mode: 'cascade', t0: 5.6, t1: 6.2, lines: slopeLines(Q ? 0.36 : 0.42, 0.04, 0) },
    { mode: 'cascade', t0: 6.0, t1: 6.35, lines: [
      ...corners.map(([sx, sz]) => ({ pts: hipPts(sx, sz, 0.15).slice().reverse(), w: 2 as const })), ...corners.map(([sx, sz]) => ({ pts: gableRidge(sx, sz), w: 2 as const })),
      ...[-1, 1].map((sx) => seg([sx * X_G, Y_GABLE + 0.05, -(Z_E - E_G)], [sx * X_G, Y_GABLE + 0.05, Z_E - E_G], 1)),
      ...beasts.flatMap((b) => boxEdges(b.c, b.s, 0)),
    ] },
    { mode: 'ruler', t0: 6.25, t1: 6.45, lines: [seg([-X_G - 0.2, RT, 0.25], [X_G + 0.2, RT, 0.25], 2)] },
    { mode: 'cascade', t0: 6.3, t1: 6.5, lines: boxEdges(ridgeBox.c, ridgeBox.s, 1) },
    { mode: 'free', t0: 6.4, t1: 6.6, lines: [{ pts: wen(-1), w: 2 }, { pts: wen(1), w: 2 }, ...(Q ? [sword(-1), sword(1)] : [])] },
  ];

  // ---- pièces pleines (occultation puis couleur) ----
  const solids: Solid[] = [
    ...[...platBoxes, ...steps].map((b): Solid => ({ kind: 'box', ...b })),
    ...(Q ? [quad(ramp, 'marble')] : []),
    ...COLS.map(([x, z]): Solid => ({ kind: 'cyl', c: [x, (COL_Y0 + COL_Y1) / 2, z], r: COL_R, h: COL_Y1 - COL_Y0, paint: 'column' })),
    ...[...COLS.map(([x, z]) => plinth(x, z)), ...beams, ...upper, ...DOUGONG, ...(Q ? [...slabs, ...postBoxes, ...beasts] : [])].map((b): Solid => ({ kind: 'box', ...b })),
    ...walls,
    ...queti.map((q): Solid => ({ kind: 'poly', p: q.p, plane: 'z', paint: 'blue' })),
    { kind: 'box', ...ridgeBox, paint: Q ? 'roof' : 'ridge' },
    ...[-1, 1].map((sx): Solid => ({ kind: 'poly', p: wen(sx), plane: 'z', paint: Q ? 'roof' : 'ridge' })),
    ...(Q ? [-1, 1].map((sx): Solid => ({ kind: 'poly', p: gablePoly(sx), plane: 'x', paint: 'wall' })) : []),
  ];
  // ---- pièces de l'assemblage, dans l'ordre du chantier (la terrasse est déjà en place) ----
  const bx = (b: Box, w: 0 | 1 | 2 = 1) => ({ lines: boxEdges(b.c, b.s, w), solids: [{ kind: 'box', ...b } as Solid] });
  const merge = (items: { lines: LineDef[]; solids: Solid[] }[], c: V3, path: Part['path'], w: number, roof = false): Part => ({ lines: items.flatMap((i) => i.lines), solids: items.flatMap((i) => i.solids), c, roof, path, w });
  const parts: Part[] = [
    ...COLS.map(([x, z]) => merge([bx(plinth(x, z)), { lines: colLines(x, z), solids: [{ kind: 'cyl', c: [x, (COL_Y0 + COL_Y1) / 2, z], r: COL_R, h: COL_Y1 - COL_Y0, paint: 'column' }] }], [x, (COL_Y0 + COL_Y1) / 2, z], 'side', 0.12)),
    ...C.lintels.map((l) => merge(ring(l.y, l.h, l.t, l.paint, l.over ?? 0).map((b) => bx(b)), [0, l.y, 0], 'side', 0.3)),
    ...frames.map((f) => merge(dougongSet(f).map((b) => bx(b, 0)), [f.x, Y_DG + s, f.z], 'side', 0.07)),
    merge(upper.map((b) => bx(b)), [0, Y_ZT, 0], 'side', 0.3),
    ...trussX.map((x) => merge([...truss.filter((b) => b.c[0] === x).map((b) => bx(b)), { lines: braces.filter((l) => (l.pts as V3[])[0][0] === x), solids: [] }], [x, T.upY, 0], 'fall', 0.18)),
    merge(purlins.map((b) => bx(b)), [0, T.midP, 0], 'fall', 0.25),
    merge([{ lines: [...corners.map(([sx, sz]) => ({ pts: hipPts(sx, sz, -0.3), w: 2 as const })), ...slopeLines(0.62, -0.32, 0)], solids: [] }], [0, T.midP, 0], 'fall', 0.3),
    merge([{ lines: facade, solids: walls.filter((w) => w.kind === 'quad' && w.p[0][2] === 5 && w.p[0][1] < Y_DG) }, { lines: queti.map((q) => closed(q.p, 1)), solids: queti.map((q): Solid => ({ kind: 'poly', p: q.p, plane: 'z', paint: 'blue' })) }], [0, 4, 5], 'slide', 0.35),
    merge([{ lines: sideWallLines, solids: walls.filter((w) => !(w.kind === 'quad' && w.p[0][2] === 5 && w.p[0][1] < Y_DG)) }], [0, 4, -2], 'slide', 0.3),
    merge([{ lines: balustrade, solids: Q ? [...slabs, ...postBoxes].map((b): Solid => ({ kind: 'box', ...b })) : [] }], [0, PLAT.h + 0.6, 0], 'fall', 0.35),
    merge([{ lines: [{ pts: eaveLoop(0), w: 2 }, { pts: eaveLoop(-0.32), w: 1 }, ...slopeLines(Q ? 0.36 : 0.42, 0.04, 0), ...corners.map(([sx, sz]) => ({ pts: hipPts(sx, sz, 0.15).slice().reverse(), w: 2 as const })), ...corners.map(([sx, sz]) => ({ pts: gableRidge(sx, sz), w: 2 as const })), ...[-1, 1].map((sx) => seg([sx * X_G, Y_GABLE + 0.05, -(Z_E - E_G)], [sx * X_G, Y_GABLE + 0.05, Z_E - E_G], 1)), ...beasts.flatMap((b) => boxEdges(b.c, b.s, 0))], solids: [...beasts.map((b): Solid => ({ kind: 'box', ...b })), ...(Q ? [-1, 1].map((sx): Solid => ({ kind: 'poly', p: gablePoly(sx), plane: 'x', paint: 'wall' })) : [])] }], [0, 10, 0], 'fall', 0.5, true),
    merge([bx({ ...ridgeBox, paint: Q ? 'roof' : 'ridge' }), { lines: [{ pts: wen(-1), w: 2 }, { pts: wen(1), w: 2 }, ...(Q ? [sword(-1), sword(1)] : [])], solids: [-1, 1].map((sx): Solid => ({ kind: 'poly', p: wen(sx), plane: 'z', paint: Q ? 'roof' : 'ridge' })) }], [0, RIDGE_Y, 0], 'fall', 0.3),
  ];
  return { groups, solids, parts, roofY, X_E, Z_E, RIDGE_Y, CLOSE_T0: 5.2, ROOF_T0: 5.55, ROOF_T1: 6.2, DRAW_END: 6.6, close: C.close, wide: C.wide };
}
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
