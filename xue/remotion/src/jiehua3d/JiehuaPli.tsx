// 界畫 « du dessin au chantier » (style Song par défaut), 12 s :
// 1. le dessin se trace à plat sur le papier — l'élévation de face (couchée, faîte vers le haut de l'image) au-dessus
//    du plan de la terrasse et de la trame des colonnes — caméra à la verticale ;
// 2. les traits se soulèvent du papier : l'élévation pivote autour de l'arête arrière de la terrasse comme une page
//    qu'on redresse, puis se déplie en profondeur (les traits confondus dans le dessin se séparent) ; le plan monte
//    à sa hauteur ; la caméra bascule en vue plongeante de trois quarts ; l'ossature pâlit en épure ;
// 3. les pièces arrivent une à une dans l'ordre du chantier — elles se dessinent en vue éclatée, au-dessus de leur
//    place, puis glissent et s'emboîtent sur l'épure (colonnes, linteaux, consoles, poutres, chevrons, murs,
//    balustrade, couverture, faîtage) ;
// 4. le bâtiment fini se colore par lavis.
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { Cam, Model, Paint, Solid, Style, V3, buildModel } from './model';
import {
  LineObj, PALETTE, Pigment, Timed, WIDTHS, applyCam, clamp, ease, easeOut, lerp, mix, mkLine, mkMat, partial, ptsOf,
  roofGeo, solidGeo, timeLines, useFonts,
} from './Jiehua3D';

export const JIEHUA_PLI_SECONDS = 12;
export type JiehuaPliProps = { style: Style };
const W = 1920, H = 1080;
// calendrier (secondes)
const DRAW0 = 0.2, DRAW1 = 2.95;              // dessin à plat
const LIFT0 = 3.0, LIFT_DUR = 1.5;            // soulèvement (décalé de bas en haut sur 0,7 s)
const ASM0 = 5.5, ASM1 = 9.0;                 // arrivée des pièces (instant où chacune s'emboîte)
const COLOR_T0 = 9.2, WASH_DUR = 1.2, T_SEAL = 11.0;
const HINGE = -9.2;                           // charnière : arête arrière de la terrasse

// ---- caméra : verticale sur la feuille, bascule pendant le soulèvement, lente orbite pendant l'assemblage ----
const TOP: Cam = { az: 0, el: 1.553, zoom: 33, target: [0, 0, -14.5] };   // l'élévation au centre, le haut du plan dessous
const TOP2: Cam = { ...TOP, zoom: 35 };
const VIEW: Cam = { az: 0.56, el: 0.5, zoom: 46, target: [0, 6.0, 0] };
const VIEW2: Cam = { az: 0.48, el: 0.46, zoom: 48, target: [0, 6.2, 0] };
const camAt = (t: number): Cam => {
  if (t < LIFT0) return mix(TOP, TOP2, ease(t / LIFT0));
  if (t < ASM0) return mix(TOP2, VIEW, ease((t - LIFT0) / (ASM0 - LIFT0)));
  return mix(VIEW, VIEW2, ease((t - ASM0) / (COLOR_T0 - ASM0)));
};

// ---- position d'un point : à plat sur le papier, puis soulevé (θ : la page se redresse ; d : elle se déplie) ----
const lifted = (p: V3, plan: boolean, theta: number, d: number, u: number): V3 => {
  const [x, y, z] = p;
  if (plan) return [x, lerp(0.02, y, ease(u)), z];
  return [x, 0.02 + y * Math.sin(theta), HINGE - y * Math.cos(theta) + d * (z - HINGE)];
};

// ---- pièces : traits et volumes, position éclatée, instant d'emboîtement ----
type PartRt = { lines: Timed[]; meshes: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; paint: Paint }[]; off: V3; land: number };
const backOut = (u: number) => { const c = 1.2, v = clamp(u) - 1; return 1 + (c + 1) * v * v * v + c * v * v; };

function buildParts(m: Model, pal: Record<Paint, Pigment>): PartRt[] {
  const n = m.parts.length;
  return m.parts.map((p, i) => {
    const land = lerp(ASM0, ASM1, n > 1 ? i / (n - 1) : 0);
    const by = new Map<Paint, THREE.BufferGeometry[]>();
    const add = (paint: Paint, g: THREE.BufferGeometry) => { const a = by.get(paint) ?? []; a.push(g); by.set(paint, a); };
    p.solids.forEach((s: Solid) => add(s.paint, solidGeo(s)));
    if (p.roof) add('roof', roofGeo(m));
    const meshes = [...by.entries()].map(([paint, gs]) => {
      const g = mergeGeometries(gs.map((x) => { if (x.getAttribute('uv')) x.deleteAttribute('uv'); return x; }));
      g.computeBoundingBox();
      const b = g.boundingBox!, sd = pal[paint].seed;
      let R = 1;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) R = Math.max(R, Math.hypot(x - sd[0], y - sd[1], z - sd[2]));
      const mat = mkMat(pal[paint], R);
      return { mesh: new THREE.Mesh(g, mat), mat, paint };
    });
    // vue éclatée : au-dessus et en dehors de sa place (la couverture descend de haut)
    const off: V3 = p.roof ? [0, 7, 0] : [p.c[0] * 0.3, 3.2 + p.c[1] * 0.25, p.c[2] * 0.3];
    const lines: Timed[] = p.lines.map((l, k) => { const t0 = land - 0.95 + (0.25 * k) / Math.max(1, p.lines.length - 1); return { ...l, t0, t1: t0 + 0.12, mode: 'cascade' as const }; });
    return { lines, meshes, off, land };
  });
}

// modèle, traits du dessin (calendrier ramené à la phase de dessin à plat), une fois par style
const PREP = new Map<Style, { m: Model; draw: (Timed & { plan: boolean; base: boolean; yn: number })[] }>();
const prep = (style: Style) => {
  if (!PREP.has(style)) {
    const m = buildModel(style);
    const k = (DRAW1 - DRAW0) / (m.DRAW_END - 0.3), tm = (t: number) => DRAW0 + (t - 0.3) * k;
    const draw = m.groups.flatMap((g) => timeLines([g]).map((l) => {
      const pts = ptsOf(l, 0), yn = clamp(pts.reduce((a, q) => a + q[1], 0) / pts.length / 13);
      return { ...l, t0: tm(l.t0), t1: tm(l.t1), plan: g.flat === 'plan', base: !!g.base, yn };
    }));
    PREP.set(style, { m, draw });
  }
  return PREP.get(style)!;
};

const Scene: React.FC<{ t: number; style: Style }> = ({ t, style }) => {
  const { camera, size, viewport } = useThree();
  const { m, draw } = prep(style);
  const pal = PALETTE[style];
  const c = camAt(t);
  applyCam(camera as THREE.OrthographicCamera, c);
  const parts = useMemo(() => buildParts(m, pal), [m, pal]);
  // terrasse (déjà en place) : dalle, moulures, escalier, rampe
  const base = useMemo(() => {
    const sol = m.solids.filter((s) => (s.kind === 'box' && s.c[1] + s.s[1] / 2 <= 1.85 && s.s[0] > 2) || (s.kind === 'quad' && s.paint === 'marble'));
    const by = new Map<Paint, THREE.BufferGeometry[]>();
    sol.forEach((s) => { const a = by.get(s.paint) ?? []; a.push(solidGeo(s)); by.set(s.paint, a); });
    return [...by.entries()].map(([paint, gs]) => {
      const g = mergeGeometries(gs.map((x) => { if (x.getAttribute('uv')) x.deleteAttribute('uv'); return x; }));
      const mat = mkMat(pal[paint], 26);
      return { mesh: new THREE.Mesh(g, mat), mat, paint };
    });
  }, [m, pal]);
  const L = useMemo(() => ({
    dark: WIDTHS.map((w) => mkLine('#1a1613', w, false)),
    ghost: WIDTHS.map((w) => mkLine('#1a1613', w, false)),
    hid: WIDTHS.map((w) => mkLine('#1a1613', w, true)),
    axis: mkLine('#b8432f', 1.3, false),
  }), []);

  const reveal = (paint: Paint) => easeOut((t - COLOR_T0 - pal[paint].at) / WASH_DUR);
  base.forEach((b) => {
    const f = clamp((t - (LIFT0 + 1.2)) / 0.5);
    b.mesh.visible = f > 0; b.mat.uniforms.uFill.value = f; b.mat.uniforms.uReveal.value = reveal(b.paint);
  });

  // dessin, puis épure soulevée
  const dark: number[][] = [[], [], []], ghost: number[][] = [[], [], []], ax: number[] = [];
  for (const l of draw) {
    const u = clamp((t - l.t0) / (l.t1 - l.t0));
    if (u <= 0) continue;
    const lu = clamp((t - (LIFT0 + 0.7 * l.yn)) / LIFT_DUR);
    const theta = (Math.PI / 2) * ease(lu / 0.6), d = ease((lu - 0.45) / 0.55);
    const p = partial(ptsOf(l, c.az), u).map((q) => lifted(q, l.plan, theta, d, lu));
    const dst = l.axis ? ax : l.base ? dark[l.w] : ghost[l.w];
    for (let i = 1; i < p.length; i++) dst.push(...p[i - 1], ...p[i]);
  }
  // pièces : tracées en vue éclatée, puis elles glissent et s'emboîtent
  const pl: number[][] = [[], [], []];
  parts.forEach((pr) => {
    const k = backOut((t - (pr.land - 0.6)) / 0.6), off: V3 = [pr.off[0] * (1 - k), pr.off[1] * (1 - k), pr.off[2] * (1 - k)];
    const fill = clamp((t - (pr.land - 0.75)) / 0.3);
    pr.meshes.forEach((me) => {
      me.mesh.visible = fill > 0; me.mesh.position.set(...off);
      me.mat.uniforms.uFill.value = fill; me.mat.uniforms.uReveal.value = reveal(me.paint);
      // le lavis suit les volumes déplacés : la graine reste fixe dans le monde, le volume est déjà en place
    });
    for (const l of pr.lines) {
      const u = clamp((t - l.t0) / (l.t1 - l.t0));
      if (u <= 0) continue;
      const p = partial(ptsOf(l, c.az), u);
      for (let i = 1; i < p.length; i++) pl[l.w].push(p[i - 1][0] + off[0], p[i - 1][1] + off[1], p[i - 1][2] + off[2], p[i][0] + off[0], p[i][1] + off[1], p[i][2] + off[2]);
    }
  });

  const ghostOp = t < LIFT0 + 1.4 ? 0.92 : t < ASM0 ? lerp(0.92, 0.25, ease((t - LIFT0 - 1.4) / (ASM0 - LIFT0 - 1.4))) : 0.25 * (1 - ease((t - ASM1 + 0.4) / 0.8));
  const hidOp = t < ASM0 - 0.6 ? 0 : 0.3 * (1 - ease((t - ASM1 + 0.2) / 0.8));
  const dpr = viewport.dpr;
  const setL = (o: LineObj, arr: number[], op: number, w: number) => {
    o.obj.visible = arr.length > 0 && op > 0.005;
    // géométrie neuve à chaque image (sinon three.js garde le nombre de traits de la première image)
    if (o.obj.visible) { o.geo.dispose(); o.geo = new LineSegmentsGeometry(); o.geo.setPositions(arr); o.obj.geometry = o.geo; }
    o.mat.opacity = op;
    o.mat.linewidth = Math.max(1, w * dpr);
    o.mat.resolution.set(size.width * dpr, size.height * dpr);
  };
  WIDTHS.forEach((w, i) => {
    setL(L.dark[i], [...dark[i], ...pl[i]], 0.92, w);
    setL(L.ghost[i], ghost[i], ghostOp, w);
    setL(L.hid[i], pl[i], hidOp, w);
  });
  setL(L.axis, ax, 0.55 - 0.4 * clamp((t - ASM0) / 2), 1.3);

  return (
    <>
      {base.map((b, i) => <primitive key={`b${i}`} object={b.mesh} />)}
      {parts.flatMap((pr, i) => pr.meshes.map((me, j) => <primitive key={`p${i}_${j}`} object={me.mesh} />))}
      {[...L.dark, ...L.ghost, ...L.hid, L.axis].map((o, i) => <primitive key={`l${i}`} object={o.obj} />)}
    </>
  );
};

export const JiehuaPli: React.FC<JiehuaPliProps> = ({ style }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shot = useMemo(() => {
    const s = compose(29, { move: 'push', mood: 'jour', duration: JIEHUA_PLI_SECONDS });
    return { ...s, pieces: s.pieces.filter((p) => p.el.family !== 'premier' && (p.el.family !== 'vie' || /vie_[ab][26]\.png/.test(p.el.file))) };
  }, []);
  const sealU = clamp((t - T_SEAL) / 0.35);
  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <ShuimoBackground shot={shot} duration={JIEHUA_PLI_SECONDS} halo={false} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 54% at 50% 54%, rgba(250,247,240,0.86) 0%, rgba(250,247,240,0.6) 60%, rgba(250,247,240,0) 100%)' }} />
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="inkpli" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: 'url(#inkpli)' }}>
        <ThreeCanvas width={W} height={H} orthographic flat linear gl={{ alpha: true, antialias: true }} camera={{ position: [0, 80, 1], zoom: 27 }}>
          <Scene t={t} style={style} />
        </ThreeCanvas>
      </AbsoluteFill>
      {sealU > 0 && (
        <div style={{
          position: 'absolute', left: 1610, top: 880, width: 84, height: 84, background: '#b0281c', borderRadius: 6,
          color: '#f6eadc', fontFamily: 'Jiehua3dSeal', fontSize: 33, lineHeight: '37px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          writingMode: 'vertical-rl', opacity: 0.9 * sealU, transform: `scale(${1.25 - 0.25 * easeOut(sealU)})`, mixBlendMode: 'multiply',
        }}>界畫</div>
      )}
    </AbsoluteFill>
  );
};
