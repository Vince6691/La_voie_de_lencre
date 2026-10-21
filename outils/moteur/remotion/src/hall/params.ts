// Hall impérial typique (大殿) : quatre états, de la dynastie Tang aux Qing, et leur interpolation.
// Unités : une travée = 1. Le hall fait 7 travées de façade sur 4 de profondeur, à toutes les époques,
// pour que seules les proportions changent (lisibilité) ; les valeurs sont des ordres de grandeur tirés de la
// planche de Liang Sicheng (Foguang 857, Yingzao fashi 1103, Changling 1415, Taihe 1697), à affiner.
export type HallParams = {
  platH: number; tiers: number; marble: number; // socle : hauteur totale, nombre de terrasses (1→3), part de marbre
  colH: number; colR: number; entasis: number; // pilier : hauteur, rayon, renflement
  brH: number; brSets: number; // consoles : hauteur d'un jeu, nombre de jeux par travée (1→6)
  ridgeH: number; over: number; curve: number; lift: number; // toit : faîte, débord, courbure, relevé des angles
  tier2: number; // second toit (Qing) : 0 absent → 1 présent
  beasts: number; // bêtes de faîte (0→5)
  paint: number; gold: number; // décor peint (poutres, frise) et dorures
  tile: string; wall: string; col: string; band: string; // couleurs
};

const C = (s: string) => s;
export const HALLS: HallParams[] = [
  // Tang 857 : pilier haut et fin, consoles énormes, toit bas et très débordant, chaux blanche sur bois ocre
  { platH: 0.25, tiers: 1, marble: 0, colH: 1.15, colR: 0.085, entasis: 0.012, brH: 0.5, brSets: 1, ridgeH: 0.85, over: 1.35, curve: 1.3, lift: 0.1,
    tier2: 0, beasts: 0, paint: 0.1, gold: 0, tile: C('#a9aeb0'), wall: C('#f7f2e6'), col: C('#b8603c'), band: C('#6aa58a') },
  // Song 1103 : modules standard, toit plus courbe, premiers décors peints
  { platH: 0.32, tiers: 1, marble: 0.2, colH: 1.1, colR: 0.095, entasis: 0.008, brH: 0.36, brSets: 2, ridgeH: 1.05, over: 1.05, curve: 1.65, lift: 0.2,
    tier2: 0, beasts: 1, paint: 0.55, gold: 0, tile: C('#b3babd'), wall: C('#f7f2e6'), col: C('#c24529'), band: C('#66a38c') },
  // Ming 1415 : socle de marbre, consoles petites et serrées, tuiles jaunes, murs rouges
  { platH: 0.75, tiers: 2, marble: 1, colH: 1.3, colR: 0.12, entasis: 0.003, brH: 0.2, brSets: 4, ridgeH: 1.35, over: 0.85, curve: 1.95, lift: 0.3,
    tier2: 0, beasts: 3, paint: 0.85, gold: 0.4, tile: C('#e0b862'), wall: C('#c9523c'), col: C('#c03a28'), band: C('#3c6fa6') },
  // Qing 1697 : terrasse à trois niveaux, double toit, consoles décoratives, dorures
  { platH: 1.5, tiers: 3, marble: 1, colH: 1.45, colR: 0.14, entasis: 0, brH: 0.13, brSets: 6, ridgeH: 1.7, over: 0.75, curve: 2.2, lift: 0.42,
    tier2: 1, beasts: 5, paint: 1, gold: 1, tile: C('#f1c560'), wall: C('#c9523c'), col: C('#bc3626'), band: C('#29519e') },
];

const clamp = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, k: number) => '#' + hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], k)).toString(16).padStart(2, '0')).join('');

// Les familles de pièces ne bougent pas toutes en même temps (k = avancement de la transformation, 0 à 1) : pendant que le
// toit est en l'air ([0,18 ; 0,70]) on voit le corps du bâtiment se transformer dessous ; le décor se pose à l'atterrissage.
const WINDOW: Record<string, [number, number]> = {
  base: [0.08, 0.42], col: [0.1, 0.46], br: [0.2, 0.56], roof: [0.2, 0.62], deco: [0.46, 0.88],
};
const COL_KEYS = ['tile', 'wall', 'col', 'band'] as const;
const GROUPS: Record<string, string> = {
  platH: 'base', tiers: 'base', marble: 'base',
  colH: 'col', colR: 'col', entasis: 'col', wall: 'col', col: 'col',
  brH: 'br', brSets: 'br',
  ridgeH: 'roof', over: 'roof', curve: 'roof', lift: 'roof', tier2: 'roof', tile: 'roof', beasts: 'roof',
  paint: 'deco', gold: 'deco', band: 'deco',
};

export function hallAt(a: number, b: number, k: number): HallParams {
  const A = HALLS[a], B = HALLS[b], o: any = {};
  (Object.keys(A) as (keyof HallParams)[]).forEach((key) => {
    const [w0, w1] = WINDOW[GROUPS[key]], e = smooth(w0, w1, k);
    o[key] = (COL_KEYS as readonly string[]).includes(key) ? mixHex(A[key] as string, B[key] as string, e) : lerp(A[key] as number, B[key] as number, e);
  });
  return o as HallParams;
}

export const STATIONS = [
  { zh: '唐', en: 'TANG', year: 857, name: '佛光寺東大殿', label: 'Foguang' },
  { zh: '宋', en: 'SONG', year: 1103, name: '營造法式', label: 'Yingzao fashi' },
  { zh: '明', en: 'MING', year: 1415, name: '長陵祾恩殿', label: 'Changling' },
  { zh: '清', en: 'QING', year: 1697, name: '太和殿', label: 'Taihe' },
];

// calendrier : trois rouleaux du temps (rouleau/TimeScroll) enchaînés ; la transformation du hall se déroule entre
// u = 0,08 et 0,80 (l'impact du rouleau), linéairement : chaque pièce a sa propre fenêtre dans k
export const T0 = 0.95, DUR = 2.85;
export const uOf = (t: number, i: number) => (t - (T0 + DUR * i)) / DUR;
export const kOf = (t: number, i: number) => clamp((uOf(t, i) - 0.08) / 0.72);
// avancement continu : 0 à 3 (indice de l'époque, fraction comprise)
export const progress = (t: number) => [0, 1, 2].reduce((p, i) => p + kOf(t, i), 0);
export function hallAtProgress(p: number): HallParams {
  const i = Math.min(2, Math.floor(p)), k = p - i;
  return hallAt(i, i + 1, k);
}
// demi-largeur de façade : 7 travées → 9 → 11, les murs de pignon glissent vers l'extérieur et portent leurs colonnes d'angle
export const hxOf = (prog: number) => 3.5 + smooth(0.12, 0.5, clamp(prog - 1)) + smooth(0.12, 0.5, clamp(prog - 2));
// hauteur du toit : il se soulève à chaque transformation, reste en l'air pendant que le corps change, puis retombe avec
// un petit rebond ; à l'ouverture il descend du ciel
export const ROOF_UP = 3.0;
export function roofOff(t: number, prog: number) {
  let off = ROOF_UP * (1 - smooth(0.15, 0.95, t));
  [0, 1, 2].forEach((i) => {
    const k = clamp(prog - i);
    off += ROOF_UP * (smooth(0, 0.18, k) - smooth(0.7, 0.92, k)) + 0.12 * Math.sin(Math.PI * clamp((k - 0.92) / 0.08)) * (k < 1 ? 1 : 0);
  });
  return off;
}
