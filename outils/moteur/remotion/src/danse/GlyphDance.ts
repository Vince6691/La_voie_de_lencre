// Un glyphe réel qui s'anime : le caractère est rendu une fois dans une image, puis déformé par une grille de
// triangles (warp affine) pilotée par un petit squelette d'os. Au repos (tous les angles à 0) l'image est
// exactement le glyphe d'origine, ce qui permet de passer sans saut du glyphe qui bouge au glyphe fixe.
type Pt = [number, number];
export type Bone = { name: string; parent?: string; pivot: Pt; tip: Pt };
export type Rig = { box: number; bones: Bone[] };
export type Motion = Record<string, number> & { dx?: number; dy?: number };

const N = 30; // grille N×N
type Prep = { img: HTMLCanvasElement; V: Pt[]; W: number[][]; cells: [number, number][] };
const cache: Record<string, Prep> = {};

const distSeg = (p: Pt, a: Pt, b: Pt) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
};

// prépare l'image du glyphe (fournie par draw, dans une boîte box×box) et les poids de chaque sommet
const prepare = (id: string, rig: Rig, draw: (c: CanvasRenderingContext2D) => void): Prep => {
  if (cache[id]) return cache[id];
  const img = document.createElement('canvas'); img.width = img.height = rig.box;
  const c = img.getContext('2d')!; draw(c);
  const data = c.getImageData(0, 0, rig.box, rig.box).data;
  const V: Pt[] = [], W: number[][] = [], cs = rig.box / N;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const p: Pt = [i * cs, j * cs]; V.push(p);
    // poids : l'os le plus proche domine, avec un fondu doux sur ~18 px vers les voisins
    const d = rig.bones.map((b) => distSeg(p, b.pivot, b.tip));
    const m = Math.min(...d), e = d.map((v) => Math.exp(-(v - m) / 9)), s = e.reduce((a, b) => a + b, 0);
    W.push(e.map((v) => v / s));
  }
  // cellules qui contiennent de l'encre (avec une marge d'une cellule)
  const ink = (i: number, j: number) => {
    for (let y = Math.floor(j * cs); y < Math.min(rig.box, (j + 1) * cs); y += 2) for (let x = Math.floor(i * cs); x < Math.min(rig.box, (i + 1) * cs); x += 2) if (data[(y * rig.box + x) * 4 + 3] > 8) return true;
    return false;
  };
  const has = new Set<number>();
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (ink(i, j)) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const ii = i + a, jj = j + b; if (ii >= 0 && jj >= 0 && ii < N && jj < N) has.add(jj * N + ii); }
  const cells = [...has].map((k) => [k % N, Math.floor(k / N)] as [number, number]);
  return (cache[id] = { img, V, W, cells });
};

// transformations du monde de chaque os (rotation autour du pivot, composée avec celle du parent)
type Aff = [number, number, number, number, number, number]; // a b c d e f : x' = a x + c y + e
const mul = (A: Aff, B: Aff): Aff => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const rotAbout = (p: Pt, a: number): Aff => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, p[0] - c * p[0] + s * p[1], p[1] - s * p[0] - c * p[1]]; };
const app = (A: Aff, p: Pt): Pt => [A[0] * p[0] + A[2] * p[1] + A[4], A[1] * p[0] + A[3] * p[1] + A[5]];

export const drawGlyphDance = (ctx: CanvasRenderingContext2D, id: string, rig: Rig, draw: (c: CanvasRenderingContext2D) => void,
  o: { x: number; y: number; size: number; motion: Motion; alpha?: number }) => {
  const P = prepare(id, rig, draw);
  const T: Record<string, Aff> = {};
  const root: Aff = [1, 0, 0, 1, o.motion.dx ?? 0, o.motion.dy ?? 0];
  for (const b of rig.bones) T[b.name] = mul(b.parent ? T[b.parent] : root, rotAbout(b.pivot, o.motion[b.name] ?? 0));
  const k = o.size / rig.box, x0 = o.x - o.size / 2, y0 = o.y - o.size / 2;
  const D: Pt[] = P.V.map((v, i) => {
    let x = 0, y = 0;
    rig.bones.forEach((b, bi) => { const w = P.W[i][bi]; if (w < 1e-3) return; const q = app(T[b.name], v); x += w * q[0]; y += w * q[1]; });
    return [x0 + x * k, y0 + y * k];
  });
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  const tri = (s0: Pt, s1: Pt, s2: Pt, d0: Pt, d1: Pt, d2: Pt) => {
    // léger agrandissement du triangle d'arrivée pour éviter les fentes entre triangles
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, g = (p: Pt): Pt => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.9, p[1] + dy / l * 0.9]; };
    const e0 = g(d0), e1 = g(d1), e2 = g(d2);
    const den = s0[0] * (s1[1] - s2[1]) + s1[0] * (s2[1] - s0[1]) + s2[0] * (s0[1] - s1[1]);
    if (Math.abs(den) < 1e-6) return;
    const a = (d0[0] * (s1[1] - s2[1]) + d1[0] * (s2[1] - s0[1]) + d2[0] * (s0[1] - s1[1])) / den;
    const b = (d0[1] * (s1[1] - s2[1]) + d1[1] * (s2[1] - s0[1]) + d2[1] * (s0[1] - s1[1])) / den;
    const c = (d0[0] * (s2[0] - s1[0]) + d1[0] * (s0[0] - s2[0]) + d2[0] * (s1[0] - s0[0])) / den;
    const d = (d0[1] * (s2[0] - s1[0]) + d1[1] * (s0[0] - s2[0]) + d2[1] * (s1[0] - s0[0])) / den;
    const e = (d0[0] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[0] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[0] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
    const f = (d0[1] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[1] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[1] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
    ctx.save(); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, d, e, f); ctx.drawImage(P.img, 0, 0); ctx.restore();
  };
  const id0 = (i: number, j: number) => j * (N + 1) + i;
  for (const [i, j] of P.cells) {
    const a = id0(i, j), b = id0(i + 1, j), c = id0(i + 1, j + 1), d = id0(i, j + 1);
    tri(P.V[a], P.V[b], P.V[c], D[a], D[b], D[c]);
    tri(P.V[a], P.V[c], P.V[d], D[a], D[c], D[d]);
  }
  ctx.restore();
};
