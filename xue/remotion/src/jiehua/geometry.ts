// Élévation de face d'une salle Song à trois travées, toit en demi-croupe (歇山), sur terrasse à balustrade — dessin
// à la règle (界畫). Tout est en polylignes, dans un repère centré sur l'axe : x vers la droite, y = 0 au sol,
// négatif vers le haut. Chaque groupe est tracé dans l'ordre du dessin réel : axes, terrasse, colonnes, charpente,
// consoles 斗拱, avant-toit, toit, tuiles. Les aplats de couleur (lavis) sont décrits à part, dans le même repère.
export type Pt = [number, number];
// mode : 'ruler' (droite tracée le long de la règle), 'free' (courbe à main levée, pinceau sans règle),
// 'cascade' (détails répétés, tracés en vague rapide) ; tone : 'ink' ou 'axis' (trait de construction vermillon pâle)
export type Line = { pts: Pt[]; w: number; tone?: 'ink' | 'axis' };
export type Group = { mode: 'ruler' | 'free' | 'cascade'; lines: Line[]; dur?: number; gap?: number };

const L = (x0: number, y0: number, x1: number, y1: number, w = 2.4): Line => ({ pts: [[x0, y0], [x1, y1]], w });
const H = (x0: number, x1: number, y: number, w = 2.4) => L(x0, y, x1, y, w);
const V = (x: number, y0: number, y1: number, w = 2.4) => L(x, y0, x, y1, w);
const rect = (x0: number, y0: number, x1: number, y1: number, w = 1.6): Line => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], w });
const sym = (xs: number[]) => xs.flatMap((x) => (x === 0 ? [0] : [-x, x])).sort((a, b) => a - b);
const range = (a: number, b: number, step: number) => { const r: number[] = []; for (let x = a; x <= b + 1e-6; x += step) r.push(x); return r; };

// ---- cotes (modules de la salle) ----
const TER = 560, TER_Y = -100;              // terrasse 台基
const STEP = 120;                           // demi-largeur de l'escalier
const RAIL_TOP = -150, RAIL_MID = -128, RAIL_BOT = -106;
const COLS = [-480, -170, 170, 480], CW = 18; // colonnes (demi-largeur)
const COL_TOP = -445;
const LAN = [-440, -414];                   // 闌額 (linteau)
const PUPAI = [-458, -445];                 // 普拍枋
const SETS = [-480, -325, -170, 0, 170, 325, 480]; // consoles : sur colonnes et entre colonnes (補間鋪作)
const ZHUTOU = [-556, -542];                // 柱頭枋
const LIAOYAN = [-572, -556];               // 撩檐枋
const RAFT = [-588, -572];                  // têtes de chevrons
const EAVE_FLAT = 500;
const RIDGE = [-846, -820], RIDGE_X = 390;
const GABLE_FOOT: Pt = [452, -722];         // pied du pignon (vu de chant), départ de l'arêtier
const TIP: Pt = [712, -658];                // pointe relevée de l'angle du toit

// avant-toit : bord inférieur et bord supérieur (relevés aux angles, 起翹)
export const eaveLow = (x: number) => (Math.abs(x) <= EAVE_FLAT ? -588 : -588 - 52 * ((Math.abs(x) - EAVE_FLAT) / 200) ** 2);
export const eaveUp = (x: number) => (Math.abs(x) <= EAVE_FLAT ? -606 : -606 - 50 * ((Math.abs(x) - EAVE_FLAT) / 212) ** 2);
const curve = (f: (x: number) => number, x0: number, x1: number, n = 40): Pt[] => range(0, 1, 1 / n).map((u) => { const x = x0 + (x1 - x0) * u; return [x, f(x)]; });
// arêtier (戧脊) : du pied du pignon à la pointe, concave puis relevé
const hipPt = (u: number): Pt => {
  const [ax, ay] = GABLE_FOOT, [bx, by] = TIP, cx = 600, cy = -662;
  return [(1 - u) ** 2 * ax + 2 * (1 - u) * u * cx + u * u * bx, (1 - u) ** 2 * ay + 2 * (1 - u) * u * cy + u * u * by];
};
const hip = (s: 1 | -1): Pt[] => range(0, 1, 1 / 30).map((u) => { const [x, y] = hipPt(u); return [s * x, y]; });
// limite haute du versant à l'abscisse x (faîtage, pignon, arêtier)
export const roofTop = (x: number) => {
  const a = Math.abs(x);
  if (a <= RIDGE_X) return RIDGE[1];
  if (a <= GABLE_FOOT[0]) return RIDGE[1] + ((a - RIDGE_X) / (GABLE_FOOT[0] - RIDGE_X)) * (GABLE_FOOT[1] - RIDGE[1]);
  for (let u = 0; u <= 1; u += 0.002) { const [hx, hy] = hipPt(u); if (hx >= a) return hy; }
  return TIP[1];
};
// épi de faîtage (鴟吻) : queue enroulée vers l'intérieur
const chiwen = (s: 1 | -1): Pt[] => {
  const p: Pt[] = [[RIDGE_X + 6, RIDGE[1]], [RIDGE_X + 10, -880], [RIDGE_X - 4, -912], [RIDGE_X - 30, -926], [RIDGE_X - 50, -916], [RIDGE_X - 44, -898], [RIDGE_X - 26, -902], [RIDGE_X - 24, -880], [RIDGE_X - 36, -862], [RIDGE_X - 38, RIDGE[0]]];
  // lissage (Chaikin) pour une courbe souple
  let q = p;
  for (let k = 0; k < 3; k++) q = [q[0], ...q.slice(0, -1).flatMap((a, i) => { const b = q[i + 1]; return [[0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]] as Pt[]; }), q[q.length - 1]];
  return q.map(([x, y]) => [s * x, y]);
};

// console 斗拱 vue de face, centrée en xc, posée sur le 普拍枋
const dougong = (xc: number): Line[] => {
  const y0 = PUPAI[0];
  const dou = (x: number, yb: number, w: number, h: number): Line => ({ pts: [[x - w * 0.36, yb], [x - w * 0.5, yb - h * 0.45], [x - w * 0.5, yb - h], [x + w * 0.5, yb - h], [x + w * 0.5, yb - h * 0.45], [x + w * 0.36, yb], [x - w * 0.36, yb]], w: 1.5 });
  // bras (栱) aux extrémités arrondies par le bas (卷殺)
  const arm = (yb: number, half: number, h: number): Line => ({ pts: [[xc - half + 8, yb], [xc - half + 2, yb - 4], [xc - half, yb - h], [xc + half, yb - h], [xc + half - 2, yb - 4], [xc + half - 8, yb], [xc - half + 8, yb]], w: 1.5 });
  return [
    dou(xc, y0, 46, 22),
    arm(y0 - 22, 48, 13),
    ...[-34, 0, 34].map((d) => dou(xc + d, y0 - 35, 22, 11)),
    arm(y0 - 46, 70, 13),
    ...[-60, 0, 60].map((d) => dou(xc + d, y0 - 59, 22, 11)),
    // nez de l'ajet (昂) sous le bras inférieur, au centre
    { pts: [[xc - 6, y0 - 22], [xc, y0 - 6], [xc + 6, y0 - 22]], w: 1.3 },
  ];
};

// panneau à claire-voie (格心) : cadre + grille
const lattice = (x0: number, y0: number, x1: number, y1: number, step = 11): Line[] => [
  rect(x0, y0, x1, y1, 1.4),
  ...range(x0 + step, x1 - 3, step).map((x) => V(x, y0, y1, 0.9)),
  ...range(y0 + step, y1 - 3, step).map((y) => H(x0, x1, y, 0.9)),
];

const axis = (l: Line): Line => ({ ...l, tone: 'axis', w: 1.6 });

export const GROUPS: Group[] = [
  // 1. axes de construction et ligne de sol
  { mode: 'ruler', lines: [axis(H(-780, 780, 0)), axis(V(0, 30, -950))] },
  // 2. terrasse : arase, sol, retours
  { mode: 'ruler', lines: [H(-TER, TER, 0, 3), H(-TER, TER, TER_Y, 3), V(-TER, TER_Y, 0, 3), V(TER, TER_Y, 0, 3)] },
  // 3. escalier, parements, balustrade
  {
    mode: 'cascade', dur: 0.65, lines: [
      H(-TER, TER, -88, 1.8), ...sym([STEP, STEP + 22]).map((x) => V(x, TER_Y, 0, 1.8)),
      ...range(TER_Y + 16.6, -8, 16.6).map((y) => H(-STEP, STEP, y, 1.4)),
      ...sym([420, 280]).map((x) => V(x, -88, 0, 1.2)),
      ...[[-552, -142], [142, 552]].flatMap(([a, b]) => [H(a, b, RAIL_TOP, 1.6), H(a, b, RAIL_MID, 1.4), H(a, b, RAIL_BOT, 1.6)]),
      ...sym([146, 227, 308, 389, 470, 548]).flatMap((x) => [rect(x - 5, RAIL_TOP - 14, x + 5, TER_Y, 1.3)]),
      ...sym([186, 267, 348, 429, 510]).map((x) => ({ pts: [[x - 9, RAIL_MID], [x - 4, RAIL_TOP], [x + 4, RAIL_TOP], [x + 9, RAIL_MID]] as Pt[], w: 1.1 })),
    ],
  },
  // 4. colonnes : deux bords par colonne, de gauche à droite
  { mode: 'ruler', lines: COLS.flatMap((x) => [V(x - CW, COL_TOP, RAIL_TOP, 2.6), V(x + CW, COL_TOP, RAIL_TOP, 2.6)]) },
  // 5. linteau 闌額 et sablière 普拍枋
  { mode: 'ruler', lines: [H(-498, 498, LAN[1], 2.2), H(-498, 498, LAN[0], 2.2), H(-512, 512, PUPAI[1], 2.2), H(-512, 512, PUPAI[0], 2.2)] },
  // 6. portes de la travée centrale et fenêtres des travées latérales
  {
    mode: 'cascade', dur: 0.85, lines: [
      H(-152, 152, -384, 1.6), ...lattice(-148, -410, 148, -388, 14),
      ...[-152, -76, 0, 76].flatMap((x0) => [rect(x0 + 3, -380, x0 + 73, TER_Y, 1.4), ...lattice(x0 + 9, -372, x0 + 67, -236), rect(x0 + 9, -226, x0 + 67, -204, 1.1), rect(x0 + 9, -194, x0 + 67, -112, 1.1)]),
      ...[-1, 1].flatMap((s) => {
        const a = s * 188, b = s * 462, x0 = Math.min(a, b), x1 = Math.max(a, b);
        return [H(x0, x1, -246, 1.6), H(x0, x1, -396, 1.6), ...lattice(x0 + 8, -388, (x0 + x1) / 2 - 3, -254), ...lattice((x0 + x1) / 2 + 3, -388, x1 - 8, -254)];
      }),
    ],
  },
  // 7. consoles 斗拱, de gauche à droite
  { mode: 'cascade', dur: 0.85, lines: SETS.flatMap(dougong) },
  // 8. poutres au-dessus des consoles
  { mode: 'ruler', lines: [H(-540, 540, ZHUTOU[0], 2.2), H(-560, 560, LIAOYAN[1], 2.2), H(-560, 560, LIAOYAN[0], 2.2)] },
  // 9. têtes de chevrons
  { mode: 'cascade', dur: 0.35, lines: range(-544, 544, 20).map((x) => rect(x - 5, RAFT[1], x + 5, RAFT[0] + 2, 1.1)) },
  // 10. avant-toit (à main levée : la courbe du toit ne se tire pas à la règle)
  {
    mode: 'free', gap: 0.12, lines: [
      { pts: curve(eaveLow, -700, 700, 70), w: 2.6 },
      { pts: [[-700, eaveLow(-700)], [-TIP[0], TIP[1]], ...curve(eaveUp, -TIP[0], TIP[0], 70), [TIP[0], TIP[1]], [700, eaveLow(700)]], w: 2.6 },
      { pts: hip(-1).slice().reverse(), w: 2.6 },
      { pts: hip(1).slice().reverse(), w: 2.6 },
    ],
  },
  // 11. pignons vus de chant et faîtage
  { mode: 'ruler', lines: [L(-GABLE_FOOT[0], GABLE_FOOT[1], -RIDGE_X, RIDGE[1], 2.6), L(GABLE_FOOT[0], GABLE_FOOT[1], RIDGE_X, RIDGE[1], 2.6), H(-RIDGE_X, RIDGE_X, RIDGE[1], 2.8), H(-RIDGE_X, RIDGE_X, RIDGE[0], 2.8)] },
  { mode: 'free', gap: 0.1, lines: [{ pts: chiwen(-1), w: 2.4 }, { pts: chiwen(1), w: 2.4 }] },
  // 12. rangs de tuiles, du centre vers les angles, et leurs abouts
  {
    mode: 'cascade', dur: 0.75, lines: [
      ...range(10, 690, 19).flatMap((a) => [-a, a]).filter((x) => roofTop(x) < eaveUp(x) - 10).map((x) => V(x, eaveUp(x) - 2, roofTop(x) + 3, 1.1)),
      ...range(-680, 680, 19).filter((x) => Math.abs(x) < 690).map((x) => ({ pts: range(0, 1, 1 / 8).map((u) => [x + 6 * Math.cos(Math.PI * u), eaveUp(x) + 5 - 6 * Math.sin(Math.PI * u)] as Pt), w: 1.0 })),
    ],
  },
];

// ---- aplats de couleur (lavis) : polygones, couleur, opacité, ordre ----
export type Wash = { polys: Pt[][]; color: string; op: number; seeds: Pt[] };
const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// le contour du toit : bord supérieur de l'avant-toit, arêtier droit (pointe → pied), pignon, faîtage, pignon, arêtier gauche
const roofOutline: Pt[] = [
  ...curve(eaveUp, -TIP[0], TIP[0], 70),
  ...hip(1).slice().reverse(),
  [RIDGE_X, RIDGE[1]], [-RIDGE_X, RIDGE[1]],
  [-GABLE_FOOT[0], GABLE_FOOT[1]],
  ...hip(-1),
];
const eaveBand: Pt[] = [...curve(eaveUp, -TIP[0], TIP[0], 70), ...curve(eaveLow, 700, -700, 70)];

// silhouette de la salle : papier posé sous les lavis pour que le paysage ne transparaisse pas
export const SILHOUETTE: Pt[][] = [roofOutline, eaveBand, box(-560, -588, 560, 0)];

export const WASHES: Wash[] = [
  // pierre de la terrasse et de l'escalier
  { polys: [box(-TER, TER_Y, TER, 0)], color: '#b9ab92', op: 0.5, seeds: [[-380, -50], [300, -40], [0, -60]] },
  // colonnes, balustrade, portes : vermillon 朱
  { polys: COLS.map((x) => box(x - CW, COL_TOP, x + CW, RAIL_TOP)), color: '#b23a26', op: 0.86, seeds: COLS.map((x) => [x, -300] as Pt) },
  { polys: [box(-152, -380, 152, TER_Y), box(-462, -396, -188, -246), box(188, -396, 462, -246)], color: '#a84a32', op: 0.55, seeds: [[0, -250], [-325, -320], [325, -320]] },
  { polys: [box(-552, RAIL_TOP - 14, -142, RAIL_BOT), box(142, RAIL_TOP - 14, 552, RAIL_BOT)], color: '#b23a26', op: 0.42, seeds: [[-350, -130], [350, -130]] },
  // linteau, consoles, poutres : bleu-vert 青綠
  { polys: [box(-498, LAN[0], 498, LAN[1]), box(-560, LIAOYAN[0], 560, ZHUTOU[0])], color: '#3f7f73', op: 0.7, seeds: [[-300, -430], [260, -430], [0, -560]] },
  // consoles : chaque pièce peinte, bleu 石青 et vert 石綠 en alternance
  { polys: SETS.flatMap((x, i) => dougong(x).filter((_, k) => k % 2 === i % 2).map((l) => l.pts)), color: '#35648c', op: 0.72, seeds: SETS.map((x) => [x, -500] as Pt) },
  { polys: SETS.flatMap((x, i) => dougong(x).filter((_, k) => k % 2 !== i % 2).map((l) => l.pts)), color: '#3d8a6e', op: 0.7, seeds: SETS.map((x) => [x, -500] as Pt) },
  { polys: [box(-512, PUPAI[0], 512, PUPAI[1])], color: '#b23a26', op: 0.6, seeds: [[0, -452]] },
  // ombre portée sous l'avant-toit
  { polys: [box(-512, -572, 512, -458)], color: '#2a2622', op: 0.14, seeds: [[0, -540]] },
  // toit de tuiles grises, faîtage plus sombre
  { polys: [roofOutline], color: '#55595a', op: 0.62, seeds: [[0, -720], [-420, -680], [420, -680]] },
  { polys: [eaveBand], color: '#3b3d3e', op: 0.5, seeds: [[0, -600], [-600, -630], [600, -630]] },
  { polys: [box(-RIDGE_X, RIDGE[0], RIDGE_X, RIDGE[1]), chiwen(-1), chiwen(1)], color: '#26292b', op: 0.75, seeds: [[0, -834], [-380, -880], [380, -880]] },
];
