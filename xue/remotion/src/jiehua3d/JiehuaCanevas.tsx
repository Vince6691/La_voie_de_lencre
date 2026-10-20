// 界畫 « le canevas au crayon » (style Song par défaut), 14,5 s :
// 1. le maître dessine directement en perspective : d'abord les lignes de construction qui filent vers les points
//    de fuite (arêtes de la terrasse, niveau des colonnes, de l'avant-toit, du faîte, verticales d'angle), puis le
//    canevas de la salle — terrasse, colonnes, linteaux, consoles, toit — au crayon : mine grise, léger tremblé,
//    traits qui dépassent aux angles, traits porteurs repassés deux fois ; seulement ce qui se voit de l'extérieur
//    (pas de charpente intérieure ; des volumes invisibles cachent ce qui est derrière les murs et sous le toit) ;
//    la caméra tourne à peine autour ;
// 2. le dessin pâlit en une épure à peine visible ; la terrasse passe à l'encre et prend sa matière ;
// 3. les pièces arrivent de l'extérieur du cadre, déjà peintes, du bas vers le haut et sans se croiser, et se fixent
//    sur l'épure ;
// 4. la peinture apporte les décors et les filets d'or ;
// 5. la base se fond dans la brume, la caméra recule dans le paysage ; le maître inscrit le titre et pose son sceau.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { Cam, LineDef, Model, Paint, Solid, Style, V3, buildModel } from './model';
import { PALETTE, clamp, ease, easeOut, lerp, mix, partial, ptsOf, roofGeo, solidGeo, timeLines } from './Jiehua3D';
import { InkLines, pushPencil, pushStroke } from './inkline';
import { buildParts, meshesOf, pathOff } from './JiehuaFeuille';

export const JIEHUA_CANEVAS_SECONDS = 16.5;   // temps réel ; l'animation dure ANIM_SECONDS, ralenti du toit compris
const ANIM_SECONDS = 16;
export type JiehuaCanevasProps = { style: Style };
const W = 1920, H = 1080, FOV = 34;
// calendrier (secondes)
const GUIDE0 = 0.3, GUIDE1 = 1.7;             // lignes de construction vers les points de fuite
const SK0 = 1.1, SK1 = 5.8;                   // canevas au crayon
const FADE0 = 5.8, FADE1 = 6.6;               // le dessin pâlit en épure ; la terrasse passe à l'encre
const LAND0 = 7.1, LAND1 = 10.0, FLIGHT = 0.8;  // pièces
const PAINT0 = 10.2, DECO_DUR = 1.2;          // décors
const GOLD0 = 10.6, GOLD1 = 11.8;             // filets d'or
const FAR0 = 12.0, FAR1 = 14.2;               // brume, recul dans le paysage
const INSCR0 = 13.0, T_SEAL = 14.6;           // inscription, sceau
const HIGH_Y = 8.9;                           // au-dessus : toit et charpente haute
const GHOST = 0.13, GHOST_HIGH = 0.045;       // opacité de l'épure
const PENCIL = [0.95, 1.25, 1.6];             // largeur des traits de crayon (px en 1080p)
const INK = [0.95, 1.6, 2.6];                 // largeur des coups de pinceau
const TITLE = '營造法式殿堂圖';

// ---- caméra en perspective ; zoom = pixels par unité au point visé ----
// Montage en plans (coupes franches), chaque plan avec sa rampe de vitesse (départ et arrêt marqués) :
//  1. au ras de la terrasse, les lignes de fuite filent ;  2. forte plongée, tout près, pendant que colonnes et
//  linteaux se tracent ;  3. contre-plongée sur la façade (consoles, murs), puis panoramique fouetté qui monte au
//  toit et découvre tout le canevas ;  4. l'épure en trois quarts ;  5–6. contre-plongées d'un côté puis de l'autre
//  pendant que les pièces arrivent ;  7. plan héroïque de face pour le toit (ralenti avant le contact, tremblement
//  au contact) ;  8. poussée sur les consoles et les linteaux pendant la peinture ;  9. grue arrière dans le paysage.
// Le temps de l'animation (t) se fige un peu autour du contact du toit (voir animOf) ; secousses de zoom sur les
// grosses pièces (camFx), synchrones des taiko de la bande son.
const io3 = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const io5 = (u: number) => (u < 0.5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2);
const out3 = (u: number) => 1 - (1 - u) ** 3;
type Shot = { t0: number; t1: number; a: Cam; b: Cam; e: (u: number) => number };
const C = (az: number, el: number, zoom: number, target: V3): Cam => ({ az, el, zoom, target });
const FAR = C(0.2, 0.38, 27, [-3.5, 7.5, 0]);
const S3B = C(0.02, 0.16, 62, [0, 6.8, 5]), S8B = C(0.02, 0.1, 35, [0, 7.8, 3]), S9B = C(-0.08, 0.16, 68, [0, 7.2, 5]);
const SHOTS: Shot[] = [
  { t0: 0, t1: 1.7, a: C(1.05, 0.09, 115, [10.2, 1.5, 8.6]), b: C(0.93, 0.13, 92, [8.5, 2.0, 7.4]), e: out3 },
  { t0: 1.7, t1: 3.1, a: C(0.5, 0.78, 52, [2, 2.6, 3]), b: C(0.78, 0.62, 56, [3.5, 4.2, 3]), e: io3 },
  { t0: 3.1, t1: 4.3, a: C(0.22, 0.1, 66, [3, 5.8, 5]), b: S3B, e: io3 },
  { t0: 4.3, t1: 5.8, a: S3B, b: C(0.55, 0.55, 39, [0, 7, 0]), e: io5 },
  { t0: 5.8, t1: 6.85, a: C(0.68, 0.4, 36, [0, 6, 0]), b: C(0.56, 0.42, 39, [0, 6, 0]), e: io3 },
  { t0: 6.85, t1: 8.2, a: C(1.0, 0.09, 46, [3, 5.2, 2]), b: C(0.78, 0.13, 50, [2, 6.4, 2]), e: io3 },
  { t0: 8.2, t1: 9.25, a: C(-0.8, 0.11, 46, [-2, 7, 1]), b: C(-0.58, 0.17, 44, [-1, 7.3, 0]), e: io3 },
  { t0: 9.25, t1: 10.3, a: C(0.12, 0.07, 37, [0, 7.6, 3]), b: S8B, e: out3 },
  { t0: 10.3, t1: 12.0, a: S8B, b: S9B, e: io5 },
  { t0: 12.0, t1: 14.2, a: S9B, b: FAR, e: io3 },
  { t0: 14.2, t1: 16.0, a: FAR, b: C(0.24, 0.38, 26, [-3.5, 7.5, 0]), e: (u) => u },
];
// coupes : début d'un plan qui ne reprend pas la fin du précédent
const CUTS = SHOTS.slice(1).filter((sh, i) => sh.a !== SHOTS[i].b).map((sh) => sh.t0);
const camAt = (t: number): Cam => {
  const sh = SHOTS.find((x) => t < x.t1) ?? SHOTS[SHOTS.length - 1];
  return mix(sh.a, sh.b, sh.e(clamp((t - sh.t0) / (sh.t1 - sh.t0))));
};
// pièces : instant où elles touchent leur place (le trajet dépasse puis se recale, voir pathOff)
const contactsOf = (m: Model) => {
  const tot = m.parts.reduce((a, p) => a + p.w, 0);
  let acc = 0;
  const out = m.parts.map((p) => {
    acc += p.w;
    const land = lerp(LAND0, LAND1, acc / tot), slide = p.path === 'slide';
    const from: V3 = p.path === 'fall' ? [0, 16, 0] : slide ? [26, 0, 26] : [26, 3.2, 26];
    let u = 0;
    for (; u <= 1; u += 0.002) { const o = pathOff(from, u, slide); if (slide ? Math.hypot(o[0], o[2]) < 0.06 : o[1] < 0.03) break; }
    const kind = p.roof ? 'roof' : p.deco === 'column' ? 'column' : p.gold && !p.deco ? 'dougong' : p.deco === 'beam' ? 'beam' : p.path === 'slide' ? 'wall' : p.solids.length ? 'frame' : 'rafter';
    return { t: land - FLIGHT + u * FLIGHT, kind };
  });
  out[out.length - 1].kind = 'ridge';
  return out;
};
// temps forts : grosses pièces (espacées d'au moins 0,22 s), comme les taiko de la bande son
const hitsOf = (lands: { t: number; kind: string }[]) => {
  const hits: number[] = []; let last = -9;
  for (const L of lands) if (['column', 'beam', 'frame', 'wall', 'ridge'].includes(L.kind) && L.t - last > 0.22) { hits.push(L.t); last = L.t; }
  return hits;
};
const FX = new Map<Style, { hits: number[]; roof: number; real: Float64Array; anim: Float64Array }>();
const fxOf = (style: Style) => {
  if (!FX.has(style)) {
    const lands = contactsOf(buildModel(style)), roof = lands.find((l) => l.kind === 'roof')!.t;
    // ralenti autour du toit : l'animation avance à 40 % de sa vitesse juste avant et pendant le contact
    const dt = 0.001, real: number[] = [], anim: number[] = [];
    let r = 0;
    for (let a = 0; a <= ANIM_SECONDS + 1e-9; a += dt) { real.push(r); anim.push(a); r += dt / (1 - 0.6 * Math.exp(-(((a - roof + 0.1) / 0.3) ** 2))); }
    FX.set(style, { hits: hitsOf(lands), roof, real: Float64Array.from(real), anim: Float64Array.from(anim) });
  }
  return FX.get(style)!;
};
// temps de l'animation à l'instant réel r (et l'inverse)
const animOf = (style: Style, r: number) => {
  const { real, anim } = fxOf(style);
  let lo = 0, hi = real.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (real[mid] <= r) lo = mid; else hi = mid; }
  return r >= real[real.length - 1] ? anim[anim.length - 1] + (r - real[real.length - 1]) : anim[lo] + ((r - real[lo]) / (real[hi] - real[lo] || 1)) * (anim[hi] - anim[lo]);
};
const realOf = (style: Style, a: number) => { const { real } = fxOf(style); return real[Math.min(real.length - 1, Math.max(0, Math.round(a / 0.001)))]; };
// secousses : petite poussée de zoom sur chaque temps fort, choc et tremblement au contact du toit
const camFx = (style: Style, t: number): Cam => {
  const c = camAt(t), { hits, roof } = fxOf(style);
  const kick = (h: number, tau: number) => (t >= h ? Math.min(1, (t - h) / 0.03) * Math.exp(-(t - h) / tau) : 0);
  const z = hits.reduce((a, h) => a + 0.03 * kick(h, 0.12), 0) + 0.07 * kick(roof, 0.18);
  const A = 0.16 * kick(roof, 0.25);
  return { ...c, zoom: c.zoom * (1 + z), target: [c.target[0] + A * Math.sin(t * 53), c.target[1] + A * Math.sin(t * 41 + 1), c.target[2]] };
};
const applyCamP = (cam: THREE.PerspectiveCamera, c: Cam) => {
  const D = H / (c.zoom * 2 * Math.tan(((FOV / 2) * Math.PI) / 180));
  cam.fov = FOV; cam.aspect = W / H; cam.near = 1; cam.far = 600;
  cam.position.set(c.target[0] + D * Math.sin(c.az) * Math.cos(c.el), c.target[1] + D * Math.sin(c.el), c.target[2] + D * Math.cos(c.az) * Math.cos(c.el));
  cam.up.set(0, 1, 0); cam.lookAt(...c.target); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
};

// ---- traits du canevas ----
type Sk = { l: LineDef; t0: number; t1: number; high: boolean; base: boolean; seed: number };
const len3 = (p: V3[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1], q[2] - p[i][2]), 0);

const PREP = new Map<Style, { m: Model; sketch: Sk[]; guides: Sk[]; baseInk: LineDef[] }>();
const prep = (style: Style) => {
  if (!PREP.has(style)) {
    const m = buildModel(style);
    const span = m.DRAW_END - 0.3, tm = (t: number) => SK0 + ((t - 0.3) / span) * (SK1 - SK0);
    let seed = 0;
    const sketch: Sk[] = m.groups.filter((g) => g.sketch !== 'none').flatMap((g) => {
      const lines = g.sketch === 'main' ? g.lines.filter((l) => l.w > 0) : g.lines;
      return timeLines([{ ...g, lines }]).map((l) => ({
        l, t0: tm(l.t0), t1: Math.max(tm(l.t1), tm(l.t0) + 0.06), base: !!g.base, seed: seed++,
        high: Math.min(...ptsOf(l, 0).map((q) => q[1])) > HIGH_Y,
      }));
    });
    // lignes de construction : arêtes prolongées vers les points de fuite et verticales d'angle
    const plat = m.solids.filter((s) => s.kind === 'box' && (s.paint === 'stone' || s.paint === 'marble') && s.s[0] > 10);
    const px = Math.max(...plat.map((s) => (s.kind === 'box' ? s.c[0] + s.s[0] / 2 : 0))), pz = Math.max(...plat.map((s) => (s.kind === 'box' ? s.c[2] + s.s[2] / 2 : 0)));
    const ph = Math.max(...plat.map((s) => (s.kind === 'box' ? s.c[1] + s.s[1] / 2 : 0)));
    const F = m.facade, eave = m.roofY(0, m.Z_E), R = 45;
    const g: V3[][] = [
      [[-R, ph, pz], [R, ph, pz]], [[px, ph, -R], [px, ph, R]], [[px, -3, pz], [px, 17, pz]],
      [[-R, m.col.y1, F.z], [R, m.col.y1, F.z]], [[F.x, m.col.y1, -R], [F.x, m.col.y1, R]], [[F.x, -2, F.z], [F.x, 16, F.z]],
      [[-R, eave, m.Z_E], [R, eave, m.Z_E]], [[m.X_E, eave, -R], [m.X_E, eave, R]],
      [[-R, m.RIDGE_Y, 0], [R, m.RIDGE_Y, 0]],
    ];
    const guides: Sk[] = g.map((pts, i) => { const t0 = lerp(GUIDE0, GUIDE1 - 0.3, i / (g.length - 1)); return { l: { pts, w: 0 }, t0, t1: t0 + 0.3, high: false, base: false, seed: 100 + i }; });
    const baseInk = m.groups.filter((gr) => gr.base && gr.flat !== 'plan').flatMap((gr) => gr.lines).concat(m.groups[0].lines);
    PREP.set(style, { m, sketch, guides, baseInk });
  }
  return PREP.get(style)!;
};

const Scene: React.FC<{ t: number; style: Style }> = ({ t, style }) => {
  const { camera, size, viewport } = useThree();
  const { m, sketch, guides, baseInk } = prep(style);
  const pal = PALETTE[style];
  const c = camFx(style, t);
  applyCamP(camera as THREE.PerspectiveCamera, c);
  const parts = useMemo(() => buildParts(m, pal, { land0: LAND0, land1: LAND1, gold0: GOLD0, gold1: GOLD1 }), [m, pal]);
  const base = useMemo(() => meshesOf(m, pal, m.solids.filter((s) => (s.kind === 'box' && s.c[1] + s.s[1] / 2 <= 1.85 && s.s[0] > 2) || (s.kind === 'quad' && s.paint === 'marble')), false), [m, pal]);
  // volumes invisibles du dessin : ils n'écrivent que la profondeur, le crayon ne trace que ce qui se voit
  const occ = useMemo(() => {
    // un rien plus petits que les pièces : une arête posée contre une face voisine est franchement vue ou cachée
    const shrink = (x: Solid): Solid => (x.kind === 'box' ? { ...x, s: x.s.map((v) => Math.max(0.01, v - 0.04)) as V3 } : x.kind === 'cyl' ? { ...x, r: x.r - 0.02, h: x.h - 0.04 } : x);
    const roof = roofGeo(m); roof.translate(0, -0.03, 0);
    const gs = [...m.solids.map((x) => solidGeo(shrink(x))), roof].map((g) => { if (g.getAttribute('uv')) g.deleteAttribute('uv'); if (g.getAttribute('normal')) g.deleteAttribute('normal'); return g; });
    const mesh = new THREE.Mesh(mergeGeometries(gs), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 6, polygonOffsetUnits: 12 }));
    mesh.renderOrder = 0;
    return mesh;
  }, [m]);
  occ.visible = t < FADE1;
  const L = useMemo(() => ({
    pencil: new InkLines('#45423e', false, true), pencilHi: new InkLines('#45423e', false, true), guide: new InkLines('#5a5650', false, true),
    dark: new InkLines('#1a1613'), hid: new InkLines('#1a1613', true), gold: new InkLines('#b98a2c'),
  }), []);
  L.gold.mesh.renderOrder = 4;
  const deco = (paint: Paint) => easeOut((t - PAINT0 - pal[paint].at) / DECO_DUR);
  const px = viewport.dpr;

  base.forEach((b) => {
    const f = clamp((t - FADE0 - 0.2) / 0.6);
    b.mesh.visible = f > 0; b.mat.uniforms.uFill.value = f; b.mat.uniforms.uReveal.value = 1; b.mat.uniforms.uDeco.value = deco(b.paint);
  });

  // canevas au crayon (traits porteurs repassés une seconde fois, plus léger), puis épure
  const pen: number[] = [], penHi: number[] = [], gd: number[] = [];
  for (const s of sketch) {
    const u = clamp((t - s.t0) / (s.t1 - s.t0));
    if (u <= 0) continue;
    const p = ptsOf(s.l, c.az), dst = s.high ? penHi : pen, w = PENCIL[s.l.w] * px;
    // les petites pièces (consoles, treillis) d'une main plus légère, sinon elles font masse
    pushPencil(dst, p, w, u, { seed: s.seed, k: s.l.w === 0 ? 0.5 : 1, over: s.l.w === 0 ? 0.08 : 0.25 });
    if (s.l.w > 0) pushPencil(dst, p, w * 0.8, clamp((t - s.t0 - 0.12) / (s.t1 - s.t0)), { seed: s.seed + 0.5, k: 0.45, over: 0.4 });
  }
  for (const s of guides) {
    const u = clamp((t - s.t0) / (s.t1 - s.t0));
    if (u > 0) pushPencil(gd, ptsOf(s.l, c.az), PENCIL[0] * px * 0.85, u, { seed: s.seed, over: 0, jit: 0.06 });
  }
  // la terrasse passe à l'encre au moment où le dessin pâlit
  const ink: number[] = [];
  baseInk.forEach((l, i) => {
    const t0 = FADE0 + 0.1 + (0.5 * i) / baseInk.length, u = clamp((t - t0) / 0.25);
    if (u > 0) { const p = ptsOf(l, c.az); pushStroke(ink, partial(p, u), INK[l.w] * px, len3(p), (s) => clamp(1 - (t - t0 - s * 0.25) / 0.45)); }
  });
  // pièces
  const pl: number[] = [], gl: number[] = [];
  parts.forEach((pr) => {
    const u = (t - (pr.land - FLIGHT)) / FLIGHT;
    if (u <= 0) { pr.meshes.forEach((me) => { me.mesh.visible = false; }); return; }
    const off = pathOff(pr.from, u, pr.slide);
    pr.meshes.forEach((me) => {
      me.mesh.visible = true; me.mesh.position.set(...off);
      me.mat.uniforms.uFill.value = 1; me.mat.uniforms.uReveal.value = 3;   // aplat entier, même loin de sa place me.mat.uniforms.uDeco.value = deco(me.paint);
    });
    for (const l of pr.lines) { const p = ptsOf(l, c.az); pushStroke(pl, p, INK[l.w] * px, len3(p), () => 0, off); }
    for (const g of pr.gold) {
      const gu = clamp((t - g.t0) / 0.3);
      if (gu > 0) pushStroke(gl, partial(ptsOf(g.l, c.az), gu), 1.15 * px, g.len, (s) => clamp(1 - (t - g.t0 - s * 0.3) / 0.45), [0, 0, 0], true);
    }
  });

  const fade = (g: number) => (t < FADE0 ? 0.85 : t < LAND1 ? lerp(0.85, g, ease((t - FADE0) / (FADE1 - FADE0))) : g * (1 - ease((t - LAND1) / 0.6)));
  const res = new THREE.Vector2(size.width * px, size.height * px);
  L.pencil.set(pen, fade(GHOST), res);
  L.pencilHi.set(penHi, fade(GHOST_HIGH), res);
  L.guide.set(gd, 0.38 * (1 - ease((t - FADE0) / 0.6)), res);
  L.dark.set([...ink, ...pl], 0.92, res);
  L.hid.set(pl, t < LAND0 - FLIGHT ? 0 : 0.3 * (1 - ease((t - LAND1) / 0.8)), res);
  L.gold.set(gl, 0.95, res);

  return (
    <>
      <primitive object={occ} />
      {base.map((b, i) => <primitive key={`b${i}`} object={b.mesh} />)}
      {parts.flatMap((pr, i) => pr.meshes.map((me, j) => <primitive key={`p${i}_${j}`} object={me.mesh} />))}
      {[L.guide, L.pencil, L.pencilHi, L.dark, L.hid, L.gold].map((o, i) => <primitive key={`l${i}`} object={o.mesh} />)}
    </>
  );
};

const useFonts = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    Promise.all([
      new FontFace('JiehuaKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('Jiehua3dSeal', `url(${staticFile('fonts/NotoSerifTC-Bold.otf')})`).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
};

// ---- son : la bande son (assets/jiehua/bande.wav) est mixée par tools/build_jiehua_audio.py d'après la chronologie
// exacte de l'animation, exportée par canevasEvents (src/jiehua3d/exportEvents.ts → assets/jiehua/events.json) :
// activité du crayon et vitesse de la caméra image par image, instant de contact de chaque pièce, peinture, or,
// inscription, sceau. Toute modification de l'animation se répercute en relançant les deux outils.
export type CanevasEvents = {
  fps: number; total: number; pencil: number[]; cam: number[]; cuts: number[];
  lands: { t: number; kind: string }[]; ink: number[]; paint: number; gold: [number, number]; far: [number, number]; chars: number[]; seal: number;
};
export const canevasEvents = (style: Style): CanevasEvents => {
  const { m, sketch, guides, baseInk } = prep(style), fps = 30, n = Math.round(JIEHUA_CANEVAS_SECONDS * fps);
  const R = (a: number) => realOf(style, a), A = (f: number) => animOf(style, f / fps);
  // crayon : longueur de trait tracée par seconde, image par image (temps réel)
  const pencil = Array.from({ length: n }, (_, f) => {
    const t = A(f);
    return [...sketch, ...guides].reduce((a, s) => a + (t >= s.t0 && t <= s.t1 ? (len3(ptsOf(s.l, 0)) / (s.t1 - s.t0)) * (s.l.w > 0 ? 1.5 : 1) * (s.l.w === 0 ? 0.5 : 1) : 0), 0);
  });
  // caméra : vitesse angulaire, de zoom et de visée (nulle sur une coupe)
  const cam = Array.from({ length: n }, (_, f) => {
    const ta = A(f), tb = A(f + 1);
    if (CUTS.some((c) => ta < c && tb >= c)) return 0;
    const a = camAt(ta), b = camAt(tb);
    return (Math.abs(b.az - a.az) + Math.abs(b.el - a.el) + 0.5 * Math.abs(Math.log(b.zoom / a.zoom)) + Math.hypot(b.target[0] - a.target[0], b.target[1] - a.target[1], b.target[2] - a.target[2]) / 25) * fps;
  });
  return {
    fps, total: JIEHUA_CANEVAS_SECONDS, pencil, cam, cuts: CUTS.map(R),
    lands: contactsOf(m).map((l) => ({ ...l, t: R(l.t) })),
    ink: baseInk.map((_, i) => R(FADE0 + 0.1 + (0.5 * i) / baseInk.length)),
    paint: R(PAINT0), gold: [R(GOLD0), R(GOLD1)], far: [R(FAR0), R(FAR1)],
    chars: [...TITLE].map((_, i) => R(INSCR0 + i * 0.18)), seal: R(T_SEAL + 0.1),
  };
};

export const JiehuaCanevas: React.FC<JiehuaCanevasProps> = ({ style }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = animOf(style, frame / fps);   // temps de l'animation (ralenti autour du toit)
  const shot = useMemo(() => {
    const s = compose(29, { move: 'still', mood: 'jour', duration: JIEHUA_CANEVAS_SECONDS });
    return { ...s, pieces: s.pieces.filter((p) => p.el.family !== 'premier' && (p.el.family !== 'vie' || /vie_[ab][26]\.png/.test(p.el.file))) };
  }, []);
  // même caméra que la scène : le paysage suit l'orbite, la brume se pose au pied de la salle
  const c = camFx(style, t);
  const pc = useMemo(() => new THREE.PerspectiveCamera(FOV, W / H, 1, 600), []);
  applyCamP(pc, c);
  const v = new THREE.Vector3();
  const proj = (p: V3) => { v.set(...p).project(pc); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H]; };
  const [bx, by] = proj([0, 1.4, 1]), [lx] = proj([-12, 0, 9]), [rx] = proj([12, 0, -9]);
  const mist = ease((t - FAR0 - 0.2) / 1.6);
  const titleX = 1590, titleY = 170, CH = 62;
  const sealU = clamp((t - T_SEAL) / 0.35);
  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <Audio src={staticFile('jiehua/bande.wav')} />
      <ShuimoBackground shot={shot} duration={JIEHUA_CANEVAS_SECONDS} halo={false} scroll={c.az * 650} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 54% at 50% 54%, rgba(250,247,240,0.86) 0%, rgba(250,247,240,0.6) 60%, rgba(250,247,240,0) 100%)', opacity: 1 - 0.6 * mist }} />
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="inkcanevas" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.2} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: 'url(#inkcanevas)' }}>
        <ThreeCanvas width={W} height={H} flat linear gl={{ alpha: true, antialias: true }} camera={{ fov: FOV, position: [30, 20, 30] }}>
          <Scene t={t} style={style} />
        </ThreeCanvas>
      </AbsoluteFill>
      {mist > 0 && (
        <AbsoluteFill style={{
          opacity: mist,
          background: `radial-gradient(ellipse ${(rx - lx) * 0.6}px ${(rx - lx) * 0.13}px at ${bx}px ${by + (rx - lx) * 0.1}px, rgba(248,245,238,0.97) 0%, rgba(248,245,238,0.85) 45%, rgba(248,245,238,0) 100%)`,
        }} />
      )}
      {[...TITLE].map((ch, i) => {
        const u = clamp((t - INSCR0 - i * 0.18) / 0.3);
        return u > 0 && (
          <div key={i} style={{
            position: 'absolute', left: titleX, top: titleY + i * CH, width: CH, textAlign: 'center', fontFamily: 'JiehuaKai', fontSize: 50, lineHeight: `${CH}px`,
            color: '#1f1a16', opacity: 0.9 * u, filter: `blur(${(1 - u) * 6}px)`, transform: `scale(${1.08 - 0.08 * u})`,
          }}>{ch}</div>
        );
      })}
      {sealU > 0 && (
        <div style={{
          position: 'absolute', left: titleX + 6, top: titleY + TITLE.length * CH + 18, width: 50, height: 50, background: '#b0281c', borderRadius: 4,
          color: '#f6eadc', fontFamily: 'Jiehua3dSeal', fontSize: 20, lineHeight: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          writingMode: 'vertical-rl', opacity: 0.92 * sealU, transform: `scale(${1.3 - 0.3 * easeOut(sealU)})`, mixBlendMode: 'multiply',
        }}>界畫</div>
      )}
    </AbsoluteFill>
  );
};
