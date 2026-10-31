// Transition « le sable vole vers l'est » (série 墨之道, bloc 3 du 師) : la fresque égyptienne se défait de l'ouest vers
// l'est en grains d'ocre que le vent emporte vers la droite ; sous elle, la peinture chinoise est déjà là. Front irrégulier
// (bruit), grains colorés par la fresque elle-même, qui montent, tourbillonnent, pâlissent ; voile de poussière chaude
// le long du front. u ∈ [0, 1] : avancement ; t : temps (s) pour la turbulence.
import { rng } from '../shuimo/common';

const CELL = 12, NX = Math.ceil(1920 / CELL), NY = Math.ceil(1080 / CELL);
const clamp = (v: number) => Math.min(1, Math.max(0, v));
type Prep = { cols: Uint8ClampedArray; jit: Float32Array; key: string };
let prep: Prep | null = null;
const preparer = (A: CanvasImageSource & { width: number; height: number }, key: string) => {
  if (prep && prep.key === key) return prep;
  const cv = document.createElement('canvas'); cv.width = NX; cv.height = NY;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  const cov = Math.max(1920 / A.width, 1080 / A.height), w = (A.width * cov) / CELL, h = (A.height * cov) / CELL;
  g.drawImage(A, (NX - w) / 2, (NY - h) / 2, w, h);
  const cols = g.getImageData(0, 0, NX, NY).data, r = rng(29), jit = new Float32Array(NX * NY);
  // front irrégulier : bruit de basse fréquence + grain
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) jit[y * NX + x] = 0.07 * Math.sin(y * 0.11 + 1.3) + 0.05 * Math.sin(y * 0.37 + x * 0.05) + 0.015 * r();
  return (prep = { cols, jit, key });
};
// canevas de travail (fresque masquée) et masque du front, créés une fois
const off = typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 }) : (null as unknown as HTMLCanvasElement);
const octx = off?.getContext('2d') as CanvasRenderingContext2D;
const masque = typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: NX, height: NY }) : (null as unknown as HTMLCanvasElement);
const mctx = masque?.getContext('2d') as CanvasRenderingContext2D;
// dessine l'image « en couverture » du cadre 1920 × 1080
export const couvrir = (ctx: CanvasRenderingContext2D, im: CanvasImageSource & { width: number; height: number }, zoom = 1, dx = 0) => {
  const cov = Math.max(1920 / im.width, 1080 / im.height) * zoom, w = im.width * cov, h = im.height * cov;
  ctx.drawImage(im, 960 - w / 2 + dx, 540 - h / 2, w, h);
};
export const sableEst = (ctx: CanvasRenderingContext2D, A: CanvasImageSource & { width: number; height: number }, B: (CanvasImageSource & { width: number; height: number }) | null, u: number, t: number, key: string, zoomA = 1, zoomB = 1) => {
  if (u <= 0) { couvrir(ctx, A, zoomA); return; }
  if (B) couvrir(ctx, B, zoomB); // B absent : ce qui est dessous (une vidéo, par exemple) apparaît à travers
  if (u >= 1) return;
  const P = preparer(A, key);
  // ce qui reste de A : cellules dont le front n'est pas encore passé (le front va de l'ouest à l'est, et un peu de bas en haut)
  // masque basse définition (une valeur par cellule), agrandi avec lissage : le front reste irrégulier mais sans marches
  const F = u * 1.5 - 0.25;
  const md = mctx.createImageData(NX, NY);
  for (let i = 0; i < NX * NY; i++) {
    const x = i % NX, y = Math.floor(i / NX), k = clamp((F - x / NX - P.jit[i] - (1 - y / NY) * 0.06) / 0.18);
    md.data[i * 4 + 3] = Math.round(255 * (1 - k));
  }
  mctx.putImageData(md, 0, 0);
  octx.globalCompositeOperation = 'source-over'; octx.clearRect(0, 0, 1920, 1080);
  couvrir(octx, A, zoomA);
  octx.globalCompositeOperation = 'destination-in'; octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
  octx.drawImage(masque, 0, 0, NX * CELL, NY * CELL);
  ctx.drawImage(off, 0, 0);
  // grains emportés vers l'est (et ceux déjà partis, qui continuent leur vol)
  const r = rng(61);
  for (let y = 0; y < NY; y += 1) for (let x = 0; x < NX; x += 1) {
    const i = y * NX + x, kk = (F - x / NX - P.jit[i] - (1 - y / NY) * 0.06) / 0.18;
    const a1 = r(), a2 = r(), a3 = r();
    if (kk <= 0 || kk > 6 || (i & 1)) continue;
    const fly = kk * 0.16, X = x * CELL + fly * (700 + 600 * a1) + 40 * Math.sin(t * 3 + a2 * 9) * fly, Y = y * CELL - fly * (120 + 260 * a2) + 22 * Math.sin(t * 2.3 + a3 * 7 + x * 0.1) * fly;
    const al = clamp(1 - kk / 6) * 0.9;
    if (al <= 0 || X > 1960) continue;
    const c = i * 4, s = 1.4 + 2.4 * a3;
    ctx.fillStyle = `rgba(${P.cols[c]},${P.cols[c + 1]},${P.cols[c + 2]},${al.toFixed(3)})`;
    ctx.fillRect(X, Y, s, s);
  }
  // voile de poussière chaude le long du front
  const fx = clamp(F) * 1920;
  const g = ctx.createLinearGradient(fx - 260, 0, fx + 160, 0);
  g.addColorStop(0, 'rgba(214,170,110,0)'); g.addColorStop(0.6, 'rgba(214,170,110,0.18)'); g.addColorStop(1, 'rgba(214,170,110,0)');
  ctx.fillStyle = g; ctx.fillRect(fx - 260, 0, 420, 1080);
};
