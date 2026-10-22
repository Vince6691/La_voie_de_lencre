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

// Chaque transformation a UN élément héros, qui se démonte et se remonte de façon évidente (fenêtres serrées) ; tout le reste
// évolue lentement et discrètement sur toute la durée, et les couleurs se fondent en continu avec le compteur d'années.
//   Tang → Song : les consoles (斗拱) ; Song → Ming : les colonnes et le socle ; Ming → Qing : le second étage.
type Win = Record<string, [number, number]>;
const SLOW: [number, number] = [0, 1];
const WINDOWS: Win[] = [
  { base: SLOW, col: SLOW, br: [0.1, 0.85], roof: SLOW, tier: SLOW, orn: [0.6, 1], deco: [0.3, 1] },
  { base: [0.05, 0.6], col: [0.05, 0.7], br: SLOW, roof: SLOW, tier: SLOW, orn: [0.5, 1], deco: [0.4, 1] },
  { base: [0.05, 0.5], col: SLOW, br: SLOW, roof: [0, 0.5], tier: [0.3, 0.8], orn: [0.78, 1], deco: [0.5, 1] },
];
const COLOR_WIN: [number, number] = [0.1, 0.95];
const COL_KEYS = ['tile', 'wall', 'col', 'band'] as const;
const GROUPS: Record<string, string> = {
  platH: 'base', tiers: 'base', marble: 'base',
  colH: 'col', colR: 'col', entasis: 'col',
  brH: 'br', brSets: 'br',
  ridgeH: 'roof', over: 'roof', curve: 'roof', lift: 'roof', tier2: 'tier', beasts: 'orn',
  paint: 'deco', gold: 'deco',
};

export function hallAt(a: number, b: number, k: number): HallParams {
  const A = HALLS[a], B = HALLS[b], o: any = {};
  (Object.keys(A) as (keyof HallParams)[]).forEach((key) => {
    if ((COL_KEYS as readonly string[]).includes(key)) { o[key] = mixHex(A[key] as string, B[key] as string, smooth(COLOR_WIN[0], COLOR_WIN[1], k)); return; }
    const [w0, w1] = WINDOWS[a][GROUPS[key]];
    o[key] = lerp(A[key] as number, B[key] as number, smooth(w0, w1, k));
  });
  return o as HallParams;
}

export const STATIONS = [
  { zh: '唐', en: 'TANG', year: 857, name: '佛光寺東大殿', label: 'Foguang' },
  { zh: '宋', en: 'SONG', year: 1103, name: '營造法式', label: 'Yingzao fashi' },
  { zh: '明', en: 'MING', year: 1415, name: '長陵祾恩殿', label: 'Changling' },
  { zh: '清', en: 'QING', year: 1697, name: '太和殿', label: 'Taihe' },
];

// calendrier : le Tang s'assemble (0 → 2 s), puis trois remplacements de 2,4 s sans temps mort, puis tenue de face
export const T_INTRO = 2.0, T0 = 2.0, DUR = 2.4;
export const kOf = (t: number, i: number) => clamp((t - (T0 + DUR * i)) / DUR);
export const introOf = (t: number) => clamp(t / T_INTRO);
// avancement continu : 0 à 3 (indice de l'époque, fraction comprise)
export const progress = (t: number) => [0, 1, 2].reduce((p, i) => p + kOf(t, i), 0);
// transformation en cours : indice (0 à 2) et avancement k
export const stepOf = (t: number): { i: number; k: number } => { const i = t < T0 + DUR ? 0 : t < T0 + 2 * DUR ? 1 : 2; return { i, k: kOf(t, i) }; };
// demi-largeur de façade : 7 travées → 9 (colonnes) → 11, les pignons glissent vers l'extérieur avec leurs colonnes d'angle
export const hxOf = (prog: number) => 3.5 + smooth(0.1, 0.6, clamp(prog - 1)) + smooth(0, 0.6, clamp(prog - 2));

// lumière du jour qui avance avec les époques : aube dorée (Tang), matin clair (Song), plein jour (Ming), crépuscule vermillon (Qing).
// sun = direction vers le soleil (monde, +z = façade, +x = droite) ; tint = couleur de la lumière directe ; amb = part de lumière ambiante
export type Light = { sun: [number, number, number]; tint: [number, number, number]; amb: number; sky: [number, number, number, number] };
export const LIGHTS: Light[] = [
  { sun: [-0.75, 0.38, 0.55], tint: [1.0, 0.84, 0.62], amb: 0.66, sky: [255, 196, 140, 0.38] },
  { sun: [-0.4, 0.75, 0.5], tint: [0.97, 0.99, 1.0], amb: 0.7, sky: [175, 200, 225, 0.22] },
  { sun: [0.25, 0.9, 0.4], tint: [1.0, 0.97, 0.9], amb: 0.72, sky: [255, 246, 225, 0.12] },
  { sun: [0.8, 0.3, 0.55], tint: [1.0, 0.74, 0.55], amb: 0.6, sky: [255, 140, 96, 0.42] },
];
export function lightAt(i: number, k: number): Light {
  const A = LIGHTS[i], B = LIGHTS[Math.min(3, i + 1)], e = smooth(0.1, 0.9, k);
  const mix3 = (a: number[], b: number[]) => a.map((v, j) => lerp(v, b[j], e));
  const sun = mix3(A.sun, B.sun), n = Math.hypot(sun[0], sun[1], sun[2]);
  return { sun: [sun[0] / n, sun[1] / n, sun[2] / n], tint: mix3(A.tint, B.tint) as [number, number, number], amb: lerp(A.amb, B.amb, e), sky: mix3(A.sky, B.sky) as [number, number, number, number] };
}
