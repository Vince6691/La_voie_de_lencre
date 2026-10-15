// Ombres chinoises dessinées au Canvas : écran de papier éclairé par une lampe, silhouettes noires aux bords doux
// (seules quelques découpes laissent passer la lumière : barbes des plumes, franges, signes et fissures de l'os).
// Deux ombres : le danseur de face (coiffe de plumes) et le devin de profil, à genoux devant le brasero.
type Pt = [number, number];
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const sm = (u: number) => { const v = clamp(u); return v * v * (3 - 2 * v); };
const seg = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lp = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

export const EDGE = 'rgb(14,10,8)';
const BLACK = 'rgb(14,10,8)';
export const DYE = { red: 'rgba(158,44,26,0.82)', ochre: 'rgba(196,132,46,0.8)', green: 'rgba(44,104,70,0.8)', blue: 'rgba(40,74,120,0.78)', bone: 'rgba(222,196,140,0.85)', dark: 'rgba(70,34,20,0.9)' };

// ── l'écran : papier chaud, lampe derrière (légère vacillation), bords plus sombres
export const drawScreen = (ctx: CanvasRenderingContext2D, a: number, t: number, cx = 960, cy = 520, warm = 1) => {
  if (a <= 0) return;
  const fl = 1 + 0.05 * Math.sin(t * 13.1) + 0.03 * Math.sin(t * 29.7 + 1.3);
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgb(238,222,192)'; ctx.fillRect(0, 0, 1920, 1080);
  const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, 900);
  g.addColorStop(0, `rgba(255,214,150,${0.75 * warm * fl})`); g.addColorStop(0.45, `rgba(250,196,120,${0.35 * warm * fl})`); g.addColorStop(1, 'rgba(120,70,36,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  // trame du papier tendu
  ctx.strokeStyle = 'rgba(120,80,40,0.05)'; ctx.lineWidth = 1;
  for (let x = 0; x < 1920; x += 7) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1080); ctx.stroke(); }
  ctx.restore();
};

// ── calque de la marionnette (dessiné à part, puis posé avec une ombre douce : le cuir colle presque à l'écran)
let layer: HTMLCanvasElement | null = null;
const getLayer = () => {
  if (!layer) { layer = document.createElement('canvas'); layer.width = 1920; layer.height = 1080; }
  const c = layer.getContext('2d')!; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none'; c.clearRect(0, 0, 1920, 1080);
  return c;
};
const flush = (ctx: CanvasRenderingContext2D, a: number, blur = 1.4) => {
  if (!layer || a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.3; ctx.filter = 'blur(9px)'; ctx.drawImage(layer, 0, 0); // pénombre
  ctx.globalAlpha = a * 0.96; ctx.filter = `blur(${blur}px)`; ctx.drawImage(layer, 0, 0);
  ctx.restore();
};

// pièce en cuir : remplissage teinté + bord sombre
const piece = (c: CanvasRenderingContext2D, path: () => void, dye: string, lw = 3.5) => {
  c.beginPath(); path(); c.closePath(); c.fillStyle = BLACK; c.fill(); void dye; c.lineJoin = 'round'; c.strokeStyle = EDGE; c.lineWidth = lw; c.stroke();
};
// segment de membre effilé (a → b), bouts arrondis
const limb = (c: CanvasRenderingContext2D, a: Pt, b: Pt, w1: number, w2: number, dye: string) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, ang = Math.atan2(dy, dx);
  piece(c, () => {
    c.moveTo(a[0] + nx * w1, a[1] + ny * w1); c.lineTo(b[0] + nx * w2, b[1] + ny * w2);
    c.arc(b[0], b[1], w2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    c.lineTo(a[0] - nx * w1, a[1] - ny * w1);
    c.arc(a[0], a[1], w1, ang - Math.PI / 2, ang + Math.PI / 2, true);
  }, dye);
};
// ajours : petits motifs découpés (la lumière passe)
const cut = (c: CanvasRenderingContext2D, draw: () => void) => {
  c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,0.9)'; c.strokeStyle = 'rgba(0,0,0,0.9)'; draw(); c.restore();
};
const lozenges = (_c: CanvasRenderingContext2D, _a: Pt, _b: Pt, _n: number, _r: number) => {};
const lozengesCut = (c: CanvasRenderingContext2D, a: Pt, b: Pt, n: number, r: number) => cut(c, () => {
  for (let i = 1; i < n; i++) { const p = lp(a, b, i / n); c.beginPath(); c.moveTo(p[0], p[1] - r); c.lineTo(p[0] + r * 0.6, p[1]); c.lineTo(p[0], p[1] + r); c.lineTo(p[0] - r * 0.6, p[1]); c.closePath(); c.fill(); }
});
const rivet = (_c: CanvasRenderingContext2D, _p: Pt, _r = 4) => {};
// tige de manipulation : fine, sombre, un peu floue (elle est loin de l'écran)
const rods = (_ctx: CanvasRenderingContext2D, _from: Pt[], _a: number) => {};
const rodsDrawn = (ctx: CanvasRenderingContext2D, from: Pt[], a: number) => {
  ctx.save(); ctx.globalAlpha = a * 0.55; ctx.filter = 'blur(2px)'; ctx.strokeStyle = 'rgb(40,24,14)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  from.forEach(([x, y], i) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (i - 1) * 90, 1110); ctx.stroke(); });
  ctx.restore();
};
// plume : longue lame effilée le long d'une courbe, barbes ajourées
const plume = (c: CanvasRenderingContext2D, p0: Pt, p1: Pt, p2: Pt, w: number, dye: string) => {
  const N = 16, L: Pt[] = [], R: Pt[] = [];
  const at = (u: number): Pt => [(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p1[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p1[1] + u * u * p2[1]];
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = at(u), q = at(Math.min(1, u + 0.01)), o = at(Math.max(0, u - 0.01));
    const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, ww = w * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.15)));
    L.push([p[0] - dy / l * ww, p[1] + dx / l * ww]); R.push([p[0] + dy / l * ww, p[1] - dx / l * ww]);
  }
  piece(c, () => { L.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); }, dye, 3);
  cut(c, () => { c.lineWidth = 2.2; for (let i = 3; i < N - 1; i += 2) { const a = L[i], b = R[i + 1], m = lp(a, b, 0.5); c.beginPath(); c.moveTo(lerp(a[0], m[0], 0.2), lerp(a[1], m[1], 0.2)); c.lineTo(lerp(b[0], m[0], 0.25), lerp(b[1], m[1], 0.25)); c.stroke(); } });
  c.beginPath(); c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); c.strokeStyle = EDGE; c.lineWidth = 2; c.stroke();
};

// ════════════════ le danseur, de face (coordonnées dans la boîte 660 du glyphe 美 de l'os : la pose figée le recouvre)
type Pose = Record<'H' | 'S' | 'Hd' | 'eL' | 'hL' | 'eR' | 'hR' | 'kL' | 'fL' | 'kR' | 'fR', Pt>;
export const DANCER_FREEZE: Pose = {
  H: [348, 368], S: [342, 258], Hd: [338, 172], eL: [312, 302], hL: [284, 352], eR: [388, 292], hR: [432, 325],
  kL: [328, 492], fL: [310, 628], kR: [402, 505], fR: [452, 650],
};
const POSE_UP: Pose = { // les deux bras levés : on appelle la pluie
  H: [348, 372], S: [343, 264], Hd: [339, 178], eL: [292, 222], hL: [266, 146], eR: [394, 218], hR: [424, 142],
  kL: [326, 496], fL: [306, 630], kR: [398, 506], fR: [446, 650],
};
const POSE_A: Pose = { // bras gauche levé, genou gauche haut, on frappe du pied droit
  H: [352, 392], S: [346, 284], Hd: [342, 198], eL: [288, 238], hL: [252, 160], eR: [402, 318], hR: [452, 296],
  kL: [298, 452], fL: [300, 566], kR: [404, 522], fR: [432, 652],
};
const mirror = (p: Pose): Pose => Object.fromEntries(Object.entries(p).map(([k, v]) => {
  const sw: Record<string, string> = { eL: 'eR', eR: 'eL', hL: 'hR', hR: 'hL', kL: 'kR', kR: 'kL', fL: 'fR', fR: 'fL' };
  const src = (p as any)[sw[k] ?? k] as Pt; void v; return [k, [696 - src[0], src[1]]];
})) as Pose;
const POSE_B = mirror(POSE_A);
const mixPose = (a: Pose, b: Pose, k: number): Pose => Object.fromEntries(Object.keys(a).map((n) => [n, lp((a as any)[n], (b as any)[n], k)])) as Pose;

// pose au temps u (s) d'une danse de durée D qui finit figée ; beat = durée d'un pas
export const dancerPose = (u: number, D: number, beat = 0.62) => {
  const seq = [POSE_UP, POSE_A, POSE_B, POSE_A, POSE_UP, POSE_B, POSE_A, POSE_B];
  const freezeAt = D - 0.75, i = Math.max(0, Math.floor(u / beat)), f = sm((u - i * beat) / (beat * 0.7));
  let p = mixPose(seq[i % seq.length], seq[(i + 1) % seq.length], f);
  const bob = Math.abs(Math.sin((u / beat) * Math.PI)) * 10;
  p = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [v[0], v[1] + (k[0] === 'f' ? 0 : bob * (k === 'kL' || k === 'kR' ? 0.5 : 1))]])) as Pose;
  const fz = seg(u, freezeAt, D - 0.12);
  return { pose: mixPose(p, DANCER_FREEZE, fz), freeze: fz, sway: Math.sin((u / beat) * Math.PI * 2) * (1 - fz) };
};

export const drawDancer = (ctx: CanvasRenderingContext2D, o: { x: number; y: number; size: number; pose: Pose; sway: number; alpha: number; t: number }) => {
  if (o.alpha <= 0) return;
  const k = o.size / 660, M = (p: Pt): Pt => [o.x + (p[0] - 330) * k, o.y + (p[1] - 330) * k];
  const P = Object.fromEntries(Object.entries(o.pose).map(([n, v]) => [n, M(v)])) as Pose;
  const c = getLayer(), w = (v: number) => v * k;
  c.lineCap = 'round';
  // jambes (derrière la jupe), pieds tournés vers l'extérieur
  for (const [kn, ft, sgn] of [[P.kL, P.fL, -1], [P.kR, P.fR, 1]] as [Pt, Pt, number][]) {
    limb(c, P.H, kn, w(17), w(13), DYE.dark); limb(c, kn, ft, w(13), w(9), DYE.dark);
    piece(c, () => { c.moveTo(ft[0], ft[1] - w(6)); c.lineTo(ft[0] + sgn * w(34), ft[1] + w(2)); c.lineTo(ft[0] - sgn * w(6), ft[1] + w(8)); }, DYE.dark, 2.5);
    rivet(c, kn, w(3.5));
  }
  // bras
  const shL: Pt = [P.S[0] - w(24), P.S[1] + w(4)], shR: Pt = [P.S[0] + w(24), P.S[1] + w(4)];
  for (const [sh, el, ha] of [[shL, P.eL, P.hL], [shR, P.eR, P.hR]] as [Pt, Pt, Pt][]) {
    limb(c, sh, el, w(12), w(10), DYE.ochre); limb(c, el, ha, w(10), w(7), DYE.ochre);
    // main ouverte, doigts en éventail
    const ang = Math.atan2(ha[1] - el[1], ha[0] - el[0]);
    for (let f = -2; f <= 2; f++) { const a = ang + f * 0.28; c.beginPath(); c.moveTo(ha[0], ha[1]); c.lineTo(ha[0] + Math.cos(a) * w(22), ha[1] + Math.sin(a) * w(22)); c.strokeStyle = EDGE; c.lineWidth = w(4); c.stroke(); }
    rivet(c, el, w(3.5)); rivet(c, sh, w(3.5));
  }
  // buste, ceinture, jupe à franges
  const wa = lp(P.S, P.H, 0.72);
  piece(c, () => { c.moveTo(P.S[0] - w(30), P.S[1]); c.lineTo(P.S[0] + w(30), P.S[1]); c.lineTo(wa[0] + w(20), wa[1]); c.lineTo(wa[0] - w(20), wa[1]); }, DYE.ochre);
  lozenges(c, [P.S[0], P.S[1] + w(8)], wa, 4, w(7));
  const hem = (P.H[1] - wa[1]) + w(62);
  piece(c, () => { c.moveTo(wa[0] - w(24), wa[1]); c.lineTo(wa[0] + w(24), wa[1]); c.lineTo(wa[0] + w(58), wa[1] + hem); c.lineTo(wa[0] - w(58), wa[1] + hem); }, DYE.red);
  cut(c, () => { c.lineWidth = w(3); for (let i = -4; i <= 4; i++) { const x = wa[0] + i * w(11); c.beginPath(); c.moveTo(x + i * w(1.5), wa[1] + hem * 0.35); c.lineTo(x + i * w(3.5), wa[1] + hem - w(4)); c.stroke(); } });
  piece(c, () => { c.rect(wa[0] - w(27), wa[1] - w(6), w(54), w(12)); }, DYE.green, 2.5);
  // cou et tête
  limb(c, P.S, P.Hd, w(9), w(8), DYE.ochre);
  piece(c, () => { c.ellipse(P.Hd[0], P.Hd[1], w(30), w(38), 0, 0, Math.PI * 2); }, DYE.ochre);

  // coiffe : bandeau, puis deux paires de plumes (en haut et sur les côtés) qui ondulent avec un temps de retard
  piece(c, () => { c.rect(P.Hd[0] - w(32), P.Hd[1] - w(36), w(64), w(12)); }, DYE.red, 2.5);
  const top: Pt = [P.Hd[0] + w(2), P.Hd[1] - w(72)];
  limb(c, [P.Hd[0], P.Hd[1] - w(34)], top, w(5), w(5), DYE.dark);
  const sw = o.sway, wob = 0.15 * Math.sin(o.t * 7.3);
  const R = (base: Pt, p: Pt, a: number): Pt => { const dx = p[0] - base[0], dy = p[1] - base[1], cs = Math.cos(a), sn = Math.sin(a); return [base[0] + dx * cs - dy * sn, base[1] + dx * sn + dy * cs]; };
  const feather = (base: Pt, mid: Pt, tip: Pt, a: number) => plume(c, base, R(base, M(mid), a * 0.6), R(base, M(tip), a), w(13), DYE.green);
  feather(top, [232, 18], [198, 120], -0.28 * sw + wob * (1 - Math.abs(sw)) * 0.3);
  feather(top, [400, 34], [472, 112], -0.28 * sw - wob * 0.1);
  feather([P.Hd[0] - w(24), P.Hd[1] + w(10)], [246, 150], [244, 270], 0.22 * sw);
  feather([P.Hd[0] + w(24), P.Hd[1] + w(8)], [402, 150], [452, 224], 0.22 * sw);
  rods(ctx, [P.hL, P.S, P.hR], o.alpha);
  flush(ctx, o.alpha);
};

// ════════════════ le devin, de profil, à genoux (vers la droite), plastron de tortue en main, brasero devant lui
export type DivinerState = { carve: number; heat: number; dip: number; crack: number; read: number; t: number; alpha: number };
const CRK: Pt[][] = [[[0, 0], [4, -40], [1, -66], [6, -92]], [[0, 0], [26, -12], [44, -14], [62, -26]], [[4, -40], [-16, -54], [-28, -52]]];
export const drawDiviner = (ctx: CanvasRenderingContext2D, x0: number, y0: number, s: number, st: DivinerState) => {
  if (st.alpha <= 0) return;
  const M = (x: number, y: number): Pt => [x0 + x * s, y0 + y * s];
  const c = getLayer(), w = (v: number) => v * s;
  c.lineCap = 'round';
  // brasero (trépied) et ses flammes, à droite
  const bx = 330;
  for (const lx of [-46, 0, 46]) limb(c, M(bx + lx * 0.6, -58), M(bx + lx, 0), w(6), w(5), DYE.dark);
  piece(c, () => { const a = M(bx - 74, -112), b = M(bx + 74, -112), m = M(bx, -40); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.quadraticCurveTo(M(bx + 60, -50)[0], M(bx + 60, -50)[1], m[0], m[1]); c.quadraticCurveTo(M(bx - 60, -50)[0], M(bx - 60, -50)[1], a[0], a[1]); }, DYE.dark);
  lozenges(c, M(bx - 60, -94), M(bx + 60, -94), 6, w(6));
  // pose : le plastron monte vers le visage pour la lecture ; la main avant va au feu puis au plastron
  const lift = sm(st.read);
  const plC = M(250, -360 - 70 * lift), plS = 1;
  const hand1 = M(190, -340 - 70 * lift);
  const restH: Pt = M(120, -230), knifeH: Pt = M(186 + 10 * Math.sin(st.t * 22), -350 + 12 * Math.cos(st.t * 17)), fireH: Pt = M(282, -190), hollowH: Pt = M(196, -330);
  let hand2 = lp(restH, knifeH, st.carve > 0 && st.carve < 1 ? 1 : 0);
  hand2 = lp(hand2, fireH, st.dip); hand2 = lp(hand2, hollowH, st.heat > 0 ? sm(st.heat * 3) : 0); hand2 = lp(hand2, restH, lift);
  // robe (cache les jambes repliées), ceinture, motifs de nuages ajourés
  piece(c, () => {
    const p = [M(-40, -405), M(-92, -250), M(-128, -40), M(-140, 0), M(150, 0), M(168, -46), M(70, -128), M(42, -262), M(46, -380), M(18, -414)];
    c.moveTo(p[0][0], p[0][1]); c.quadraticCurveTo(p[1][0], p[1][1], p[2][0], p[2][1]); c.lineTo(p[3][0], p[3][1]); c.lineTo(p[4][0], p[4][1]);
    c.quadraticCurveTo(p[5][0], p[5][1], p[6][0], p[6][1]); c.quadraticCurveTo(p[7][0], p[7][1], p[8][0], p[8][1]); c.lineTo(p[9][0], p[9][1]);
  }, DYE.red);
  piece(c, () => { const a = M(-74, -250), b = M(46, -250); c.moveTo(a[0], a[1] - w(8)); c.lineTo(b[0], b[1] - w(8)); c.lineTo(b[0] + w(4), b[1] + w(8)); c.lineTo(a[0] - w(4), a[1] + w(8)); }, DYE.ochre, 2.5);

  // bras arrière (tient le plastron)
  limb(c, M(-6, -392), M(80, -300), w(13), w(11), DYE.red); limb(c, M(80, -300), hand1, w(11), w(8), DYE.ochre); rivet(c, M(80, -300), w(4));
  // le plastron : os pâle, écailles gravées, signes incisés, point chauffé, fissures où passe la lumière
  const pw = w(96) * plS, ph = w(124) * plS;
  piece(c, () => { c.ellipse(plC[0], plC[1], pw, ph, 0, 0, 7); }, DYE.bone, 3);
  cut(c, () => {
    c.lineWidth = w(1.6); c.globalAlpha = 0.5;
    c.beginPath(); c.moveTo(plC[0], plC[1] - ph * 0.92); c.lineTo(plC[0], plC[1] + ph * 0.92);
    for (const yy of [-0.5, -0.05, 0.4]) { c.moveTo(plC[0] - pw * 0.88, plC[1] + ph * (yy + 0.06)); c.quadraticCurveTo(plC[0], plC[1] + ph * (yy - 0.06), plC[0] + pw * 0.88, plC[1] + ph * (yy + 0.06)); }
    c.stroke();
  });
  // signes incisés puis fissures : la lumière passe à travers l'os
  c.save(); c.globalCompositeOperation = 'destination-out'; c.strokeStyle = '#000'; c.lineCap = 'round'; c.lineWidth = w(3.2);
  const n = Math.floor(clamp(st.carve) * 10);
  for (let i = 0; i < n; i++) { const col = i % 2, row = Math.floor(i / 2); const px = plC[0] + (col ? -pw * 0.5 : -pw * 0.22), py = plC[1] - ph * 0.6 + row * w(24); c.beginPath(); c.moveTo(px - w(8), py); c.lineTo(px + w(8), py); c.moveTo(px, py - w(9)); c.lineTo(px, py + w(9)); c.stroke(); }
  if (st.crack > 0) {
    c.lineWidth = w(4.6);
    const o: Pt = [plC[0] + pw * 0.3, plC[1] + ph * 0.15];
    CRK.forEach((pl, j) => { const kk = clamp(st.crack * 1.4 - j * 0.2); if (kk <= 0) return; c.beginPath(); pl.forEach((p, i) => { const q = lp(pl[0], p, kk); const X = o[0] + q[0] * s * 1.3, Y = o[1] + q[1] * s * 1.3; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke(); });
  }
  c.restore();
  // tête de profil : front droit, nez, barbe en franges, haut bonnet
  const hd = (x: number, y: number) => { const r = 0.08 * lift, dx = x - 10, dy = y + 410; return M(10 + dx * Math.cos(r) - dy * Math.sin(r), -410 + dx * Math.sin(r) + dy * Math.cos(r)); };
  limb(c, M(4, -404), hd(14, -446), w(11), w(10), DYE.ochre);
  piece(c, () => {
    const p = [hd(-30, -470), hd(-24, -522), hd(34, -522), hd(40, -500), hd(60, -476), hd(46, -468), hd(48, -456), hd(38, -446), hd(14, -438)];
    p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
  }, DYE.ochre);
  for (let i = 0; i < 6; i++) { const a = hd(18 + i * 5, -446), b = hd(26 + i * 6, -392 + i * 3); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = EDGE; c.lineWidth = w(3); c.stroke(); }
  piece(c, () => { const p = [hd(-34, -516), hd(-30, -560), hd(-6, -606), hd(22, -598), hd(30, -520)]; p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); }, DYE.dark);
  lozenges(c, hd(-14, -590), hd(8, -530), 3, w(6));
  // bras avant (outil : couteau puis tige chauffée)
  const el2: Pt = lp(M(10, -390), hand2, 0.5); el2[1] += w(40);
  limb(c, M(10, -392), el2, w(13), w(11), DYE.red); limb(c, el2, hand2, w(11), w(8), DYE.ochre); rivet(c, el2, w(4));
  const tool = st.carve > 0 && st.carve < 1 && st.dip === 0 ? 30 : 110, ta = st.dip > 0 || st.heat > 0 ? -0.15 : -0.6;
  const tip: Pt = [hand2[0] + Math.cos(ta) * w(tool), hand2[1] + Math.sin(ta) * w(tool)];
  limb(c, hand2, tip, w(4), w(3), DYE.dark);
  rods(ctx, [hand1, M(4, -404), hand2], st.alpha);
  flush(ctx, st.alpha);
  // la lumière : flammes (vives, en lumière ajoutée), bout de la tige rougi, fissures qui flamboient
  ctx.save(); ctx.globalAlpha = st.alpha; ctx.globalCompositeOperation = 'screen';
  for (let f = 0; f < 4; f++) {
    const fx = bx - 40 + f * 26, hgt = 70 + 30 * Math.sin(st.t * (9 + f * 2.3) + f * 1.7) + 12 * Math.sin(st.t * 23 + f);
    const b = M(fx, -110), tp = M(fx + 10 * Math.sin(st.t * 6 + f), -110 - hgt);
    const g = ctx.createLinearGradient(b[0], b[1], tp[0], tp[1]); g.addColorStop(0, 'rgba(255,170,60,0.95)'); g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b[0] - w(16), b[1]); ctx.quadraticCurveTo(b[0] - w(14), (b[1] + tp[1]) / 2, tp[0], tp[1]); ctx.quadraticCurveTo(b[0] + w(14), (b[1] + tp[1]) / 2, b[0] + w(16), b[1]); ctx.fill();
  }
  const glowAt = (p: Pt, r: number, a: number) => { const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); g.addColorStop(0, `rgba(255,150,60,${a})`); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill(); };
  const hot = Math.max(st.dip > 0.6 ? 1 : 0, st.heat > 0 ? 1 - 0.4 * st.crack : 0);
  if (hot > 0) glowAt(tip, w(30), 0.9 * hot);
  if (st.heat > 0) glowAt([plC[0] + pw * 0.3, plC[1] + ph * 0.15], w(60), 0.55 * st.heat * (1 - 0.5 * lift));
  if (st.crack > 0) glowAt([plC[0] + pw * 0.3, plC[1] - ph * 0.1], w(90), 0.5 * (1 - seg(st.crack, 0.6, 1)) + 0.15);
  ctx.restore();
};
