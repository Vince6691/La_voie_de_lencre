// Essaim 3D « peinture vivante » (série 墨之道, signature du 師) : une armée Shang/Zhou peinte au pinceau, posée sur un sol
// en vraie perspective (caméra qui plonge, se redresse, tourne). Chaque soldat est un sprite peint (attaque, plein et
// sortie effilée, brosse sèche), de quatre sortes : lanciers au 戈 (hallebarde-poignard de bronze) et bouclier, archers,
// porte-étendards (bannière vermillon qui flotte, dessinée à chaque image), chars à deux chevaux. Ombre d'encre au sol,
// lavis que le papier boit sous chaque troupe, poussière dans la marche, brume et flou de profondeur, torches la nuit.
// Monde en mètres : X vers la droite, Z vers le fond, Y vers le haut. Tout est déterministe (graines).
import { rng } from '../shuimo/common';

export type V2 = [number, number]; // point au sol (X, Z), en mètres
export type Cam3 = { tx: number; tz: number; dist: number; pitch: number; yaw: number; fov: number }; // degrés
export type Pose3 = 'debout' | 'marche' | 'assis' | 'dos';
export type Sorte = 'lancier' | 'archer' | 'etendard' | 'maitre' | 'prince';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (u: number) => { const v = clamp(u); return v * v * (3 - 2 * v); };
const RAD = Math.PI / 180;

// ── caméra : clés [t, Cam3] interpolées en douceur (chaque paramètre suit une courbe en S entre deux clés)
export const camAt = (keys: [number, Cam3][], t: number): Cam3 => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) {
      const k = smooth((t - t0) / (t1 - t0));
      return { tx: a.tx + (b.tx - a.tx) * k, tz: a.tz + (b.tz - a.tz) * k, dist: a.dist + (b.dist - a.dist) * k, pitch: a.pitch + (b.pitch - a.pitch) * k, yaw: a.yaw + (b.yaw - a.yaw) * k, fov: a.fov + (b.fov - a.fov) * k };
    }
  }
  return keys[keys.length - 1][1];
};
type Basis = { C: number[]; f: number[]; r: number[]; u: number[]; F: number };
const basis = (c: Cam3): Basis => {
  const p = c.pitch * RAD, y = c.yaw * RAD;
  const f = [Math.cos(p) * Math.sin(y), -Math.sin(p), Math.cos(p) * Math.cos(y)];
  const r = [Math.cos(y), 0, -Math.sin(y)];
  const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
  const C = [c.tx - c.dist * f[0], -c.dist * f[1], c.tz - c.dist * f[2]];
  return { C, f, r, u, F: 960 / Math.tan((c.fov * RAD) / 2) };
};
// projection d'un point (X, Y, Z) : position écran, pixels par mètre, profondeur
export const proj = (b: Basis, X: number, Y: number, Z: number) => {
  const d = [X - b.C[0], Y - b.C[1], Z - b.C[2]];
  const depth = d[0] * b.f[0] + d[1] * b.f[1] + d[2] * b.f[2];
  if (depth < 1) return null;
  return { x: 960 + (b.F * (d[0] * b.r[0] + d[1] * b.r[1] + d[2] * b.r[2])) / depth, y: 540 - (b.F * (d[0] * b.u[0] + d[1] * b.u[1] + d[2] * b.u[2])) / depth, s: b.F / depth, depth };
};
export const camBasis = basis;

// ── pinceau : trait effilé (largeur w le long de la ligne : attaque, plein, sortie), brosse sèche en bout de trait
const trait = (g: CanvasRenderingContext2D, pts: number[][], w: (u: number) => number, sec = 0.25) => {
  const n = 24, P: number[][] = [];
  const seg = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = i / n, s = Math.min(seg - 1e-6, u * seg), k = Math.floor(s), f = s - k;
    const a = pts[k], b = pts[k + 1];
    P.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, u]);
  }
  const L: number[][] = [], R: number[][] = [];
  P.forEach((p, i) => {
    const q = P[Math.min(n, i + 1)], o = P[Math.max(0, i - 1)];
    let dx = q[0] - o[0], dy = q[1] - o[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const h = w(p[2]) / 2;
    L.push([p[0] - dy * h, p[1] + dx * h]); R.push([p[0] + dy * h, p[1] - dx * h]);
  });
  g.beginPath(); L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); R.reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fill();
  if (sec > 0) { // brosse sèche : quelques stries claires dans la sortie du trait
    g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = sec;
    const r = rng(Math.round(pts[0][0] * 13 + pts[0][1] * 7) + 3);
    for (let i = 0; i < 5; i++) { const p = P[Math.floor(n * (0.6 + 0.4 * r()))]; g.fillRect(p[0] - 0.6 + r(), p[1] - 0.3, 0.5, 0.6 + r()); }
    g.restore();
  }
};
const profil = (w0: number, w1: number, w2: number) => (u: number) => (u < 0.2 ? w0 + (w1 - w0) * (u / 0.2) : w1 + (w2 - w1) * ((u - 0.2) / 0.8));

// ── sprites peints : 40 × 64 unités (pieds en (20, 56)), 25 unités par mètre ; rendus à 4× ; variante floue pour le lointain
const UPM = 25, SW = 40, SH = 64, FX = 20, FY = 56, Q = 4;
const cache: Record<string, HTMLCanvasElement> = {};
const BRONZE = '#6e5634';
export const peindre = (sorte: Sorte, pose: Pose3, encre: string, flou: number, phase = 0) => {
  const k = `${sorte}|${pose}|${encre}|${flou}|${phase}`;
  if (cache[k]) return cache[k];
  const c = document.createElement('canvas'); c.width = SW * Q; c.height = SH * Q;
  const g = c.getContext('2d')!;
  if (flou) g.filter = `blur(${flou * Q}px)`;
  g.scale(Q, Q); g.translate(FX, FY);
  g.fillStyle = encre; g.strokeStyle = encre; g.lineCap = 'round'; g.lineJoin = 'round';
  const robe = sorte === 'maitre' ? '#a8321f' : sorte === 'prince' ? '#3d5f86' : encre;
  if (pose === 'assis') {
    // assis à genoux (跪坐), vu de dos : la tête, le dos rond, les jambes repliées sous la robe ; l'arme posée au sol
    g.beginPath(); g.ellipse(0, -27, 3.1, 3.5, 0, 0, 7); g.fill();
    g.fillStyle = robe; trait(g, [[0, -23], [0.6, -16], [0, -9]], profil(4, 7, 6));
    g.beginPath(); g.ellipse(0, -5, 8, 4.6, 0, 0, 7); g.globalAlpha = 0.82; g.fill(); g.globalAlpha = 1;
    g.fillStyle = encre;
    if (sorte === 'lancier' || sorte === 'archer') trait(g, [[-13, 1.5], [13, 0.5]], profil(0.6, 1.1, 0.4), 0);
  } else {
    const dos = pose === 'dos', walk = pose === 'marche', s = phase ? -1 : 1;
    // tête (casque de cuir en pointe), buste effilé, robe qui s'évase
    g.beginPath(); g.ellipse(0, -41, 3.2, 3.6, 0, 0, 7); g.fill();
    if (sorte !== 'maitre' && sorte !== 'prince') trait(g, [[0, -44], [0.3, -47.5]], profil(1.6, 1.2, 0.2), 0);
    g.fillStyle = robe;
    trait(g, [[0, -37], [0.4, -28], [0, -20]], profil(4.5, 6.5, 6));
    g.beginPath(); g.moveTo(-5.5, -22); g.lineTo(5.5, -22); g.lineTo(7.5, -9); g.quadraticCurveTo(0, -7.5, -7.5, -9); g.closePath(); g.globalAlpha = 0.86; g.fill(); g.globalAlpha = 1;
    g.fillStyle = encre;
    // jambes (deux temps de marche)
    if (walk) { trait(g, [[-1.2, -10], [-5.5 * s, 0]], profil(2.6, 2.3, 1.4), 0.15); trait(g, [[1.2, -10], [4.5 * s, -0.6]], profil(2.6, 2.3, 1.4), 0.15); }
    else { trait(g, [[-2.3, -10], [-2.8, 0]], profil(2.6, 2.3, 1.6), 0.15); trait(g, [[2.3, -10], [2.8, 0]], profil(2.6, 2.3, 1.6), 0.15); }
    if (dos) { trait(g, [[-6, -34], [-7.5, -24]], profil(2.2, 2, 1), 0); trait(g, [[6, -34], [7.5, -24]], profil(2.2, 2, 1), 0); }
    else if (sorte === 'lancier') {
      // le 戈 : hampe de bois, lame de bronze perpendiculaire près du sommet ; petit bouclier au bras gauche
      trait(g, [[0.5, -33], [5, -27], [7.5, -31]], profil(1.8, 1.8, 1.2), 0);
      trait(g, [[7.5, -55], [7.5, 3]], profil(0.9, 1.3, 0.7), 0.3);
      g.fillStyle = BRONZE; g.beginPath(); g.moveTo(7.5, -51); g.lineTo(15.5, -52.5); g.lineTo(15, -49.5); g.lineTo(7.5, -48); g.closePath(); g.fill(); g.fillStyle = encre;
      g.save(); g.globalAlpha = 0.75; g.fillRect(-9.5, -34, 5.5, 11); g.restore();
      g.lineWidth = 0.6; g.strokeRect(-9.5, -34, 5.5, 11);
    } else if (sorte === 'archer') {
      trait(g, [[0.5, -33], [4.5, -26]], profil(1.8, 1.6, 1), 0);
      g.lineWidth = 1.1; g.beginPath(); g.arc(-2, -30, 13, -1.1, 1.1); g.stroke();
      g.lineWidth = 0.35; g.beginPath(); g.moveTo(-2 + 13 * Math.cos(-1.1), -30 + 13 * Math.sin(-1.1)); g.lineTo(-2 + 13 * Math.cos(1.1), -30 + 13 * Math.sin(1.1)); g.stroke();
      trait(g, [[-5, -40], [3, -24]], profil(2.2, 2.2, 1.6), 0); // carquois
    } else if (sorte === 'etendard') {
      trait(g, [[0.5, -33], [5, -30]], profil(1.8, 1.6, 1), 0);
      trait(g, [[5.5, -62], [5.5, 3]], profil(0.9, 1.2, 0.8), 0.2); // la bannière est peinte à part (elle flotte)
    } else if (sorte === 'maitre') {
      trait(g, [[0.5, -33], [-4, -27]], profil(1.8, 1.6, 1), 0); trait(g, [[-0.5, -33], [5, -29]], profil(1.8, 1.6, 1), 0);
    }
  }
  cache[k] = c;
  return c;
};
// ombre d'encre au sol (ovale flou), dessinée une fois
let ombreCv: HTMLCanvasElement | null = null;
const ombre = () => {
  if (ombreCv) return ombreCv;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(64, 32, 2, 64, 32, 60);
  gr.addColorStop(0, 'rgba(40,34,30,0.55)'); gr.addColorStop(1, 'rgba(40,34,30,0)');
  g.fillStyle = gr; g.scale(1, 0.5); g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
  return (ombreCv = c);
};

// ── chars : caisse en vannerie, deux grandes roues, timon et deux chevaux (vue de trois quarts arrière), en sprite
export const peindreChar = (encre: string) => {
  const k = `char|${encre}`;
  if (cache[k]) return cache[k];
  const W = 120, H = 120, c = document.createElement('canvas'); c.width = W * Q; c.height = H * Q;
  const g = c.getContext('2d')!; g.scale(Q, Q); g.translate(60, 100);
  g.fillStyle = encre; g.strokeStyle = encre; g.lineCap = 'round';
  // chevaux (devant, donc plus haut à l'écran)
  for (const hx of [-9, 9]) {
    g.save(); g.globalAlpha = 0.9; g.beginPath(); g.ellipse(hx, -50, 6, 13, 0, 0, 7); g.fill(); g.restore();
    trait(g, [[hx, -60], [hx + (hx > 0 ? 2 : -2), -72]], profil(5, 4, 2.5), 0.2); // encolure et tête
    trait(g, [[hx - 4, -40], [hx - 4.5, -30]], profil(1.6, 1.4, 0.8), 0); trait(g, [[hx + 4, -40], [hx + 4.5, -30]], profil(1.6, 1.4, 0.8), 0);
  }
  trait(g, [[0, -14], [0, -46]], profil(1.4, 1.6, 1), 0); // timon
  g.lineWidth = 1.2; g.beginPath(); g.moveTo(-16, -44); g.lineTo(16, -44); g.stroke(); // joug
  // caisse et roues (vues de biais : ellipses étroites)
  g.save(); g.globalAlpha = 0.8; g.fillRect(-15, -22, 30, 16); g.restore();
  g.lineWidth = 0.6; for (let i = -12; i <= 12; i += 4) { g.beginPath(); g.moveTo(i, -22); g.lineTo(i, -6); g.stroke(); }
  for (const wx of [-22, 22]) {
    g.lineWidth = 1.6; g.beginPath(); g.ellipse(wx, -12, 3.2, 15, 0, 0, 7); g.stroke();
    g.lineWidth = 0.5; for (let a = 0; a < 9; a++) { const t = (a / 9) * Math.PI * 2; g.beginPath(); g.moveTo(wx, -12); g.lineTo(wx + 3.2 * Math.cos(t), -12 + 15 * Math.sin(t)); g.stroke(); }
  }
  // l'équipage : cocher, archer, lancier (trois têtes)
  for (const px of [-8, 0, 8]) { g.beginPath(); g.ellipse(px, -30, 3, 3.4, 0, 0, 7); g.fill(); trait(g, [[px, -27], [px, -20]], profil(4, 5, 4), 0); }
  cache[k] = c;
  return c;
};

// ── sol : lavis que le papier boit sous une troupe (polygone au sol projeté, flou), butte, empreintes, torches
export const lavisSol = (ctx: CanvasRenderingContext2D, b: Basis, coins: V2[], a: number, rgb = [52, 46, 40]) => {
  if (a <= 0) return;
  const P = coins.map(([X, Z]) => proj(b, X, 0, Z)).filter(Boolean) as { x: number; y: number; s: number }[];
  if (P.length < 3) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.filter = `blur(${Math.max(6, P[0].s * 1.6).toFixed(0)}px)`;
  ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.16)`;
  ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill();
  ctx.restore();
};
// la butte (𠂤) : un vrai relief de terre à deux bosses, peint comme une colline de shuimo — champ de hauteurs projeté en
// perspective et ombré selon la lumière (venue de la gauche et de l'arrière), contours et rides au pinceau (皴), points de
// mousse (苔點), ombre et lavis au sol, et l'étendard du commandant planté au sommet de la grande bosse
let bcv: HTMLCanvasElement | null = null;
const BOSSES = [[-0.42, 0.05, 0.62, 0.55], [0.4, -0.08, 0.5, 0.42]]; // [x, z, rayon, hauteur] en fractions de r
const hauteur = (r: number, x: number, z: number) => BOSSES.reduce((h, [bx, bz, br, bh]) => h + bh * r * Math.exp(-((x - bx * r) ** 2 + (z - bz * r) ** 2) / (br * r) ** 2), 0);
export const butte3D = (ctx: CanvasRenderingContext2D, b: Basis, c: V2, r: number, a: number, col: number[], t = 0) => {
  if (a <= 0) return;
  // ombre portée et lavis au sol
  lavisSol(ctx, b, Array.from({ length: 28 }, (_, i): V2 => [c[0] + 0.25 * r + Math.cos((i / 28) * 6.283) * r * 1.45, c[1] - 0.2 * r + Math.sin((i / 28) * 6.283) * r * 1.05]), a * 2.2, [60, 48, 38]);
  ctx.save(); ctx.globalAlpha *= a;
  // relief : facettes peintes d'un bloc dans un canevas à part (sans recouvrements ni damier), puis posées avec un léger
  // flou ; teintes de lavis (ocre pâle au soleil, terre brune à l'ombre), bord qui se fond dans le papier
  if (!bcv) { bcv = document.createElement('canvas'); bcv.width = 1920; bcv.height = 1080; }
  const g = bcv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1920, 1080);
  const N = 72, ext = r * 1.25, L = [-0.6, 0.75, 0.3], ll = Math.hypot(...L), cell = (2 * ext) / N;
  const clair = [236, 206, 160], sombre = [126, 88, 60];
  for (let j = N - 1; j >= 0; j--) {
    for (let i = 0; i < N; i++) {
      const x = -ext + i * cell, z = -ext + j * cell;
      const hs = [hauteur(r, x, z), hauteur(r, x + cell, z), hauteur(r, x + cell, z + cell), hauteur(r, x, z + cell)];
      const hm = Math.max(...hs);
      if (hm < 0.04 * r) continue;
      const nx = -(hs[1] - hs[0]) / cell, nz = -(hs[3] - hs[0]) / cell, nl = Math.hypot(nx, 1, nz);
      const lum = Math.max(0, (nx * L[0] + L[1] + nz * L[2]) / (nl * ll)), k = Math.min(1, Math.max(0, (lum - 0.35) / 0.6));
      const P = [proj(b, c[0] + x, hs[0], c[1] + z), proj(b, c[0] + x + cell, hs[1], c[1] + z), proj(b, c[0] + x + cell, hs[2], c[1] + z + cell), proj(b, c[0] + x, hs[3], c[1] + z + cell)];
      if (P.some((p) => !p)) continue;
      const m = (q: number) => Math.round(sombre[q] + (clair[q] - sombre[q]) * k) * 0.7 + col[q] * 0.3;
      const edge = Math.min(1, (hm - 0.04 * r) / (0.14 * r));
      g.globalAlpha = 0.25 + 0.7 * edge;
      g.fillStyle = `rgb(${m(0) | 0},${m(1) | 0},${m(2) | 0})`;
      g.beginPath(); P.forEach((p, n) => (n ? g.lineTo(p!.x, p!.y) : g.moveTo(p!.x, p!.y))); g.closePath(); g.fill();
    }
  }
  ctx.save(); ctx.setTransform(ctx.getTransform()); ctx.filter = 'blur(2.2px)'; ctx.drawImage(bcv, 0, 0, 1920, 1080); ctx.restore();
  // rides au pinceau (皴) : courbes de niveau brisées sur le flanc d'ombre, plus serrées vers le bas
  const rg = rng(19);
  ctx.strokeStyle = 'rgba(40,32,26,0.55)'; ctx.lineCap = 'round';
  for (const [bx, bz, br, bh] of BOSSES) {
    for (const lev of [0.18, 0.38, 0.6, 0.8]) {
      const rad = br * r * Math.sqrt(-Math.log(lev)), y = lev * bh * r;
      for (let s = 0; s < 3; s++) {
        const a0 = 0.6 + s * 0.9 + rg() * 0.4, a1 = a0 + 0.5 + rg() * 0.5;
        ctx.beginPath();
        for (let q = 0; q <= 12; q++) { const an = a0 + ((a1 - a0) * q) / 12, p = proj(b, c[0] + bx * r + Math.cos(an) * rad, y, c[1] + bz * r + Math.sin(an) * rad); if (p) (q ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); }
        const p0 = proj(b, c[0] + bx * r, y, c[1] + bz * r); ctx.lineWidth = Math.max(1, (p0?.s ?? 4) * 0.12 * (1 - lev * 0.5)); ctx.stroke();
      }
    }
  }
  // points de mousse sur les sommets
  for (let i = 0; i < 70; i++) {
    const [bx, bz, br] = BOSSES[i % 2], an = rg() * 6.283, d = br * r * 0.7 * Math.sqrt(rg());
    const x = bx * r + Math.cos(an) * d, z = bz * r + Math.sin(an) * d, p = proj(b, c[0] + x, hauteur(r, x, z), c[1] + z);
    if (!p) continue;
    ctx.fillStyle = `rgba(34,30,26,${(0.5 + 0.4 * rg()).toFixed(2)})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.11 * p.s, 0.07 * p.s, rg() * 3, 0, 7); ctx.fill();
  }
  // l'étendard du commandant au sommet de la grande bosse
  const [bx, bz, , bh] = BOSSES[0], base = proj(b, c[0] + bx * r, bh * r, c[1] + bz * r), top = proj(b, c[0] + bx * r, bh * r + 5, c[1] + bz * r);
  if (base && top) {
    ctx.strokeStyle = 'rgba(40,32,26,0.9)'; ctx.lineWidth = Math.max(1.2, base.s * 0.12); ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
    const w = base.s * 2.4, wv = Math.sin(t * 5);
    ctx.fillStyle = 'rgba(170,52,32,0.92)'; ctx.beginPath(); ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(top.x + w * 0.5, top.y - w * 0.12 * wv, top.x + w, top.y + w * 0.06 * wv); ctx.lineTo(top.x + w * 0.8, top.y + w * 0.3); ctx.lineTo(top.x + w, top.y + w * 0.55);
    ctx.quadraticCurveTo(top.x + w * 0.5, top.y + w * 0.62 - w * 0.12 * wv, top.x, top.y + w * 0.6); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
};
export const empreintes3D = (ctx: CanvasRenderingContext2D, b: Basis, c: V2, R: number, p: number, a: number, col: string) => {
  if (a <= 0 || p <= 0) return;
  const n = 140, m = Math.floor(n * p);
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col;
  for (let i = 0; i < m; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2, side = i % 2 ? 0.35 : -0.35;
    const q = proj(b, c[0] + Math.cos(t) * (R + side), 0, c[1] + Math.sin(t) * (R + side));
    if (!q) continue;
    ctx.beginPath(); ctx.ellipse(q.x, q.y, 0.12 * q.s, 0.22 * q.s * 0.55, t, 0, 7); ctx.fill();
  }
  ctx.restore();
};
export const torche = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, seed: number) => {
  const fl = 0.8 + 0.2 * Math.sin(t * 17 + seed) * Math.sin(t * 7.3 + seed * 2), R = 2.6 * s * fl;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, 'rgba(255,214,140,0.95)'); g.addColorStop(0.25, 'rgba(240,150,60,0.55)'); g.addColorStop(1, 'rgba(240,150,60,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); ctx.restore();
};

// ── l'armée : chaque soldat va de A à B (u = avancement global, vague depuis une origine), trié du fond vers l'avant
export type Opts3 = {
  pose: (i: number, k: number) => Pose3; sorte?: (i: number) => Sorte; alpha?: number; t: number;
  vague?: { origine: V2; etalement?: number }; masquerAvant?: boolean; encres?: string[]; torches?: boolean; brume?: number; poussiere?: boolean; hauteur?: number;
};
export const sorteParDefaut = (i: number): Sorte => (i % 41 === 7 ? 'etendard' : i % 5 === 2 ? 'archer' : 'lancier');
const ENCRES = ['rgb(34,30,27)', 'rgb(48,42,37)', 'rgb(62,55,48)'];
export const armee = (ctx: CanvasRenderingContext2D, b: Basis, A: V2[], B: V2[], u: number, o: Opts3) => {
  const a0 = o.alpha ?? 1;
  if (a0 <= 0) return;
  const sp = o.vague?.etalement ?? 0.6, org = o.vague?.origine, enc = o.encres ?? ENCRES, H = o.hauteur ?? 1.75;
  let dmax = 1;
  if (org) for (const p of A) dmax = Math.max(dmax, Math.hypot(p[0] - org[0], p[1] - org[1]));
  const r = rng(91);
  // positions, profondeurs
  const L: { x: number; y: number; s: number; d: number; i: number; k: number }[] = [];
  let dmin = 1e9, dfar = 0;
  for (let i = 0; i < A.length; i++) {
    const p = A[i], q = B[i] ?? p;
    const del = org ? (Math.hypot(p[0] - org[0], p[1] - org[1]) / dmax) * sp : r() * sp * 0.4;
    const k = smooth((u - del) / (1 - sp));
    if (o.masquerAvant && k <= 0) continue; // encore « dans » le signe
    const P = proj(b, p[0] + (q[0] - p[0]) * k, 0, p[1] + (q[1] - p[1]) * k);
    if (!P || P.x < -80 || P.x > 2000 || P.y < -120 || P.y > 1200) continue;
    L.push({ x: P.x, y: P.y, s: P.s, d: P.depth, i, k }); dmin = Math.min(dmin, P.depth); dfar = Math.max(dfar, P.depth);
  }
  L.sort((p, q) => q.d - p.d);
  const focus = (dmin + dfar) / 2, span = Math.max(1, dfar - dmin), brume = o.brume ?? 0.35;
  ctx.save(); ctx.globalAlpha *= a0;
  // ombres d'abord (lumière venue de la gauche et de l'arrière : ombres vers l'avant-droite)
  const om = ombre();
  for (const p of L) { const w = 1.6 * p.s * H * 0.6, h = w * 0.42; ctx.drawImage(om, p.x - w * 0.35, p.y - h * 0.3, w, h); }
  for (const p of L) {
    const fog = brume * clamp((p.d - dmin) / span), flou = Math.abs(p.d - focus) / span > 0.42 ? 1 : 0;
    const pose = o.pose(p.i, p.k), sorte = o.sorte ? o.sorte(p.i) : sorteParDefaut(p.i);
    const phase = pose === 'marche' ? Math.floor(o.t * 3.2 + p.i * 0.37) % 2 : 0;
    const im = peindre(sorte, pose, enc[p.i % enc.length], flou, phase);
    const sc = (p.s * H) / (44 / UPM) / UPM; // le personnage (44 unités) mesure H mètres
    const w = SW * sc, h = SH * sc;
    ctx.globalAlpha = a0 * (1 - fog);
    ctx.drawImage(im, p.x - FX * sc, p.y - FY * sc, w, h);
    if (sorte === 'etendard' && pose !== 'assis') { // bannière vermillon qui flotte
      const bx = p.x + 5.5 * sc, by = p.y - 61 * sc, wv = Math.sin(o.t * 6 + p.i);
      ctx.fillStyle = 'rgba(170,52,32,0.92)'; ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + 7 * sc, by - 1.5 * sc * wv, bx + 14 * sc, by + 1 * sc * wv); ctx.lineTo(bx + 11 * sc, by + 4 * sc); ctx.lineTo(bx + 14 * sc, by + 7.5 * sc + 1 * sc * wv);
      ctx.quadraticCurveTo(bx + 7 * sc, by + 9 * sc - 1.5 * sc * wv, bx, by + 9 * sc); ctx.closePath(); ctx.fill();
    }
    if (o.torches && p.i % 3 === 0 && pose !== 'assis') torche(ctx, p.x + 7 * sc, p.y - 50 * sc, p.s, o.t, p.i);
    if (o.poussiere && pose === 'marche' && p.i % 4 === 0) {
      const rr = rng(p.i * 7 + Math.floor(o.t * 6));
      ctx.fillStyle = 'rgba(150,128,100,0.18)';
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(p.x + (rr() - 0.5) * 14 * sc, p.y - rr() * 6 * sc, (1 + 2 * rr()) * sc, 0, 7); ctx.fill(); }
    }
  }
  ctx.restore();
};
// un personnage seul (le maître, les princes), même rendu que l'armée
export const figure = (ctx: CanvasRenderingContext2D, b: Basis, p: V2, sorte: Sorte, pose: Pose3, a: number, H = 1.9) => {
  const P = proj(b, p[0], 0, p[1]);
  if (!P || a <= 0) return;
  const sc = (P.s * H) / (44 / UPM) / UPM, om = ombre(), w = 1.6 * P.s * H * 0.6;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.drawImage(om, P.x - w * 0.35, P.y - w * 0.42 * 0.3, w, w * 0.42);
  ctx.drawImage(peindre(sorte, pose, ENCRES[0], 0), P.x - FX * sc, P.y - FY * sc, SW * sc, SH * sc);
  ctx.restore();
};
export const chars = (ctx: CanvasRenderingContext2D, b: Basis, pos: V2[], a: number) => {
  if (a <= 0) return;
  const L = pos.map((p) => proj(b, p[0], 0, p[1])).filter(Boolean).sort((p, q) => q!.depth - p!.depth);
  ctx.save(); ctx.globalAlpha *= a;
  for (const P of L) { const sc = (P!.s * 4.2) / (100 / 25) / 25 * 1.0, im = peindreChar(ENCRES[0]); ctx.drawImage(im, P!.x - 60 * sc, P!.y - 100 * sc, 120 * sc, 120 * sc); }
  ctx.restore();
};

// ── formations au sol (mètres)
export const carres3 = (n: number, centres: V2[], cols: number, pas: number): V2[] => {
  const per = Math.ceil(n / centres.length), rows = Math.ceil(per / cols), r = rng(13);
  return Array.from({ length: n }, (_, i) => {
    const bq = Math.floor(i / per), j = i % per, [x0, z0] = centres[bq];
    return [x0 + ((j % cols) - (cols - 1) / 2) * pas + (r() - 0.5) * 0.25, z0 + (Math.floor(j / cols) - (rows - 1) / 2) * pas + (r() - 0.5) * 0.25];
  });
};
export const cercle3 = (n: number, c: V2, R: number, rangs = 2, pas = 1.3, decal = 0): V2[] =>
  Array.from({ length: n }, (_, i) => { const per = Math.ceil(n / rangs), k = Math.floor(i / per), a = ((i % per) / per) * Math.PI * 2 + decal + k * 0.05; return [c[0] + Math.cos(a) * (R + k * pas), c[1] + Math.sin(a) * (R + k * pas)]; });
export const rangs3 = (n: number, devant: V2, parRang: number, pas = 1.4): V2[] =>
  Array.from({ length: n }, (_, i) => { const k = Math.floor(i / parRang), j = i % parRang; return [devant[0] + (j - (parRang - 1) / 2) * pas, devant[1] - 6 - k * pas * 1.15]; });
export const tas3 = (n: number, c: V2, R: number): V2[] => { const r = rng(7); return Array.from({ length: n }, () => { const a = r() * 7, d = R * Math.sqrt(r()); return [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; }); };
// silhouette d'un dessin (canevas 400 × 400) posée au sol : largeur en mètres, centrée en c, le haut du dessin vers le fond
const silCache: Record<string, V2[]> = {};
export const silhouette3 = (n: number, c: V2, largeur: number, dessin: (g: CanvasRenderingContext2D, s: number) => void, cle: string): V2[] => {
  const k = `${cle}|${n}|${largeur}`;
  if (silCache[k]) return silCache[k];
  const S = 400, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  dessin(g, S);
  const d = g.getImageData(0, 0, S, S).data, ink: number[][] = [];
  for (let y = 0; y < S; y += 3) for (let x = 0; x < S; x += 3) if (d[(y * S + x) * 4 + 3] > 120) ink.push([x, y]);
  const r = rng(53), out: V2[] = [];
  for (let i = 0; i < n; i++) { const p = ink.length ? ink[Math.floor(((i + r()) / n) * ink.length) % ink.length] : [S / 2, S / 2]; out.push([c[0] + ((p[0] + r() * 3) / S - 0.5) * largeur, c[1] - ((p[1] + r() * 3) / S - 0.5) * largeur]); }
  return (silCache[k] = out);
};
const memo3: Record<string, V2[]> = {};
export const garde3 = (k: string, f: () => V2[]) => (memo3[k] ??= f());
