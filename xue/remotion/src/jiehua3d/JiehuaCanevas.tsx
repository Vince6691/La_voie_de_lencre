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
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
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

export const JIEHUA_CANEVAS_SECONDS = 16;
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
// Mouvement continu (spline de Catmull-Rom sur des clés, sans arrêt entre elles) :
// au ras de la terrasse, les lignes de fuite filent ; grand mouvement tournant et ascendant qui dévoile le canevas ;
// l'épure vue de trois quarts ; contre-plongée héroïque et travelling circulaire devant la façade pendant que les
// pièces arrivent ; poussée sur les consoles et les linteaux pendant la peinture des décors ; grande grue arrière
// qui pose la salle dans le paysage.
type Key = { t: number; c: Cam };
const KEYS: Key[] = [
  { t: 0, c: { az: 1.0, el: 0.14, zoom: 98, target: [10.5, 1.6, 8.6] } },
  { t: 1.7, c: { az: 0.9, el: 0.2, zoom: 72, target: [7.5, 2.8, 6] } },
  { t: 3.8, c: { az: 0.64, el: 0.33, zoom: 50, target: [2, 5, 2] } },
  { t: 5.8, c: { az: 0.44, el: 0.42, zoom: 42, target: [0, 6, 0] } },
  { t: 6.8, c: { az: 0.36, el: 0.38, zoom: 41, target: [0, 6.2, 0] } },
  { t: 8.5, c: { az: 0.06, el: 0.24, zoom: 40, target: [0, 6.6, 0] } },
  { t: 10.1, c: { az: -0.2, el: 0.22, zoom: 43, target: [0, 6.6, 0] } },
  { t: 12.0, c: { az: -0.08, el: 0.16, zoom: 66, target: [0, 7.2, 5] } },
  { t: 14.2, c: { az: 0.2, el: 0.38, zoom: 27, target: [-3.5, 7.5, 0] } },
  { t: 16, c: { az: 0.24, el: 0.38, zoom: 26, target: [-3.5, 7.5, 0] } },
];
const cr = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
const camAt = (t: number): Cam => {
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const k = (j: number) => KEYS[Math.max(0, Math.min(KEYS.length - 1, j))].c;
  const u = clamp((t - KEYS[i].t) / (KEYS[i + 1].t - KEYS[i].t));
  const f = (g: (c: Cam) => number) => cr(g(k(i - 1)), g(k(i)), g(k(i + 1)), g(k(i + 2)), u);
  return {
    az: f((c) => c.az), el: f((c) => c.el), zoom: Math.exp(f((c) => Math.log(c.zoom))),
    target: [f((c) => c.target[0]), f((c) => c.target[1]), f((c) => c.target[2])],
  };
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
  const c = camAt(t);
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

// ---- son : musique, crayon, souffles des grands mouvements, bois qui s'emboîte, toit, pinceau, or, gong, sceau ----
// (sons ElevenLabs dans public/jiehua/, voir assets/jiehua/README.md)
type Sfx = { at: number; src: string; vol: number; dur?: number };
const sfxList = (m: Model): Sfx[] => {
  // instants d'emboîtement : même répartition que buildParts (part de temps de chaque pièce)
  const tot = m.parts.reduce((a, p) => a + p.w, 0);
  let acc = 0, small = 0;
  const knocks = m.parts.flatMap((p): Sfx[] => {
    acc += p.w;
    const at = lerp(LAND0, LAND1, acc / tot);
    if (p.roof) return [{ at: at - 0.05, src: 'toit', vol: 0.75 }];
    // les consoles, nombreuses, n'ont qu'un clic sur trois
    if (p.gold && !p.deco) return small++ % 3 === 0 ? [{ at, src: 'clic', vol: 0.4 }] : [];
    return [{ at, src: 'bois', vol: p.path === 'slide' ? 0.35 : 0.55 }];
  });
  return [
    { at: 0.9, src: 'crayon', vol: 0.5, dur: 5.2 },
    { at: 1.2, src: 'souffle', vol: 0.45 }, { at: 6.4, src: 'souffle', vol: 0.4 }, { at: 11.6, src: 'souffle', vol: 0.5 },
    ...knocks,
    { at: PAINT0, src: 'pinceau', vol: 0.45 }, { at: GOLD0, src: 'or', vol: 0.35 },
    { at: FAR1 - 0.3, src: 'gong', vol: 0.3 }, { at: T_SEAL, src: 'sceau', vol: 0.6 },
  ];
};
const SfxTrack: React.FC<{ s: Sfx }> = ({ s }) => {
  const { fps } = useVideoConfig();
  const dur = s.dur ?? 3;
  return (
    <Sequence from={Math.round(s.at * fps)} durationInFrames={Math.round(dur * fps)}>
      <Audio src={staticFile(`jiehua/${s.src}.wav`)} volume={(f) => s.vol * interpolate(f, [0, 4, dur * fps - 10, dur * fps], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </Sequence>
  );
};

export const JiehuaCanevas: React.FC<JiehuaCanevasProps> = ({ style }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shot = useMemo(() => {
    const s = compose(29, { move: 'still', mood: 'jour', duration: JIEHUA_CANEVAS_SECONDS });
    return { ...s, pieces: s.pieces.filter((p) => p.el.family !== 'premier' && (p.el.family !== 'vie' || /vie_[ab][26]\.png/.test(p.el.file))) };
  }, []);
  // même caméra que la scène : le paysage suit l'orbite, la brume se pose au pied de la salle
  const c = camAt(t);
  const pc = useMemo(() => new THREE.PerspectiveCamera(FOV, W / H, 1, 600), []);
  applyCamP(pc, c);
  const v = new THREE.Vector3();
  const proj = (p: V3) => { v.set(...p).project(pc); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H]; };
  const [bx, by] = proj([0, 1.4, 1]), [lx] = proj([-12, 0, 9]), [rx] = proj([12, 0, -9]);
  const mist = ease((t - FAR0 - 0.2) / 1.6);
  const titleX = 1590, titleY = 170, CH = 62;
  const sealU = clamp((t - T_SEAL) / 0.35);
  const sfx = useMemo(() => sfxList(prep(style).m), [style]);
  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <Audio src={staticFile('jiehua/musique.wav')} volume={(f) => 0.55 * interpolate(f, [0, 10, (JIEHUA_CANEVAS_SECONDS - 0.8) * fps, JIEHUA_CANEVAS_SECONDS * fps], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      {sfx.map((s, i) => <SfxTrack key={i} s={s} />)}
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
