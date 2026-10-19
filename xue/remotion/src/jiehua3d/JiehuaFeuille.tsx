// 界畫 « de la feuille au volume » (style Song par défaut), 14 s :
// 1. une feuille de papier montée, vue de face ; l'élévation de la salle s'y trace trait par trait : tous les traits
//    du modèle vus de face, ramenés dans le plan de la feuille (les fuyantes, de longueur nulle, n'y paraissent pas) ;
// 2. la caméra glisse latéralement et plonge sur l'angle de la salle : on voit que c'est une feuille plate ;
// 3. de tout près, le maître prolonge les traits : élément après élément (terrasse, colonnes, linteaux, consoles…),
//    les fuyantes s'allongent depuis la feuille vers l'arrière et emportent chaque trait à sa profondeur réelle ;
//    la caméra accompagne le mouvement vers le fond ; la feuille s'efface ;
// 4. la caméra recule jusqu'à la vue d'ensemble ; les traits pâlissent en épure ;
// 5. les pièces arrivent de l'extérieur du cadre, déjà dessinées, voyagent et se fixent sur l'épure dans l'ordre
//    du chantier (les traits cachés pâlissent) ;
// 6. la couleur gagne le bâtiment par lavis.
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { Cam, LineDef, Model, Paint, Solid, Style, V3, buildModel } from './model';
import {
  LineObj, PALETTE, Pigment, Timed, WIDTHS, applyCam, clamp, ease, easeOut, lerp, mix, mkLine, mkMat, partial, ptsOf,
  roofGeo, solidGeo, timeLines, useFonts,
} from './Jiehua3D';

export const JIEHUA_FEUILLE_SECONDS = 14;
export type JiehuaFeuilleProps = { style: Style };
const W = 1920, H = 1080;
// calendrier (secondes)
const DRAW0 = 0.6, DRAW1 = 3.3;               // élévation tracée sur la feuille
const TURN0 = 3.4, TURN1 = 5.2;               // glissement latéral et plongée sur l'angle
const DEPTH0 = 5.2, DEPTH1 = 7.8;             // fuyantes prolongées, élément après élément (en plan rapproché)
const BACK0 = 7.8, BACK1 = 9.0;               // recul ; les traits pâlissent en épure
const LAND0 = 9.4, LAND1 = 11.6, FLIGHT = 1.0;  // pièces : instants d'emboîtement, durée du voyage
const COLOR_T0 = 11.8, WASH_DUR = 1.1, T_SEAL = 13.2;
const ZF = 11.5;                              // plan de la feuille : devant tout le bâtiment (marches comprises)
const SHEET_Z = ZF - 0.05;

// ---- caméra ----
const FRONT: Cam = { az: 0, el: 0, zoom: 52, target: [0, 7.2, 0] };
const FRONT2: Cam = { ...FRONT, zoom: 54 };
const NEAR_A: Cam = { az: 0.8, el: 0.26, zoom: 108, target: [6.8, 4.6, 7.5] };    // l'angle avant droit, contre la feuille
const NEAR_B: Cam = { az: 0.72, el: 0.3, zoom: 118, target: [5.8, 6.4, -0.5] };   // on accompagne les traits vers le fond
const WIDE: Cam = { az: 0.56, el: 0.5, zoom: 42, target: [0, 6.0, 0] };            // assez large pour voir les pièces arriver
const WIDE2: Cam = { az: 0.5, el: 0.47, zoom: 46, target: [0, 6.2, 0] };
const camAt = (t: number): Cam => {
  if (t < TURN0) return mix(FRONT, FRONT2, ease(t / TURN0));
  if (t < TURN1) return mix(FRONT2, NEAR_A, ease((t - TURN0) / (TURN1 - TURN0)));
  if (t < BACK0) return mix(NEAR_A, NEAR_B, ease((t - TURN1) / (BACK0 - TURN1)));
  if (t < BACK1) return mix(NEAR_B, WIDE, ease((t - BACK0) / (BACK1 - BACK0)));
  return mix(WIDE, WIDE2, ease((t - BACK1) / (COLOR_T0 - BACK1)));
};

// ---- feuille montée : papier fibreux sur un montage de soie ----
const SHEET_FRAG = `uniform vec3 uCol; uniform float uOp; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec2 p = vW.xy;
  float fib = 0.6 * vn(p * vec2(9.0, 1.3)) + 0.4 * vn(p * 3.0);   // fibres étirées du papier xuan
  gl_FragColor = vec4(uCol * (0.965 + 0.05 * fib), uOp);
}`;
const SHEET_VERT = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const sheetMat = (col: [number, number, number]) => new THREE.ShaderMaterial({
  vertexShader: SHEET_VERT, fragmentShader: SHEET_FRAG, transparent: true, depthWrite: false,
  uniforms: { uCol: { value: new THREE.Color(...col) }, uOp: { value: 1 } },
});

// ---- traits : élévation (tout ce qui se voit de face) et fuyantes (en profondeur) ----
type Line = Timed & { depth: boolean; base: boolean; e0: number; e1: number };   // e0, e1 : prolongement de l'élément
const lenXY = (p: V3[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
const len3 = (p: V3[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1], q[2] - p[i][2]), 0);
// fuyante : trait presque invisible de face ; on la trace de la façade vers l'arrière
const isDepth = (l: LineDef) => { const p = ptsOf(l, 0), L = len3(p); return L > 1e-6 && lenXY(p) < 0.35 * L; };
const frontFirst = (l: LineDef): LineDef => {
  if (typeof l.pts === 'function') return l;
  const p = l.pts;
  return p[0][2] < p[p.length - 1][2] ? { ...l, pts: p.slice().reverse() } : l;
};

const PREP = new Map<Style, { m: Model; lines: Line[] }>();
const prep = (style: Style) => {
  if (!PREP.has(style)) {
    const m = buildModel(style);
    const span = m.DRAW_END - 0.3, map = (a: number, b: number) => (t: number) => a + ((t - 0.3) / span) * (b - a);
    const toDraw = map(DRAW0, DRAW1), toDepth = map(DEPTH0, DEPTH1 - 0.6);
    const lines: Line[] = m.groups.flatMap((g) => {
      const elev = g.lines.filter((l) => !isDepth(l)), dep = g.lines.filter(isDepth).map(frontFirst);
      const e0 = toDepth(g.t0), e1 = Math.max(e0 + 0.6, toDepth(g.t1)), base = !!g.base;
      return [
        ...timeLines([{ ...g, lines: elev }]).map((l) => ({ ...l, t0: toDraw(l.t0), t1: toDraw(l.t1), depth: false, base, e0, e1 })),
        // les fuyantes sont « posées » d'un coup : c'est le prolongement qui les fait grandir
        ...dep.map((l) => ({ ...l, t0: e0 - 0.02, t1: e0, mode: 'cascade' as const, depth: true, base, e0, e1 })),
      ];
    });
    PREP.set(style, { m, lines });
  }
  return PREP.get(style)!;
};

// ---- pièces : volumes et traits, arrivée depuis l'extérieur du cadre ----
type MeshRt = { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; paint: Paint };
type PartRt = { meshes: MeshRt[]; lines: LineDef[]; from: V3; land: number };
const backOut = (u: number) => { const c = 1.1, v = clamp(u) - 1; return 1 + (c + 1) * v * v * v + c * v * v; };
const meshesOf = (m: Model, pal: Record<Paint, Pigment>, solids: Solid[], roof: boolean): MeshRt[] => {
  const by = new Map<Paint, THREE.BufferGeometry[]>();
  const add = (paint: Paint, g: THREE.BufferGeometry) => { const a = by.get(paint) ?? []; a.push(g); by.set(paint, a); };
  solids.forEach((s) => add(s.paint, solidGeo(s)));
  if (roof) add('roof', roofGeo(m));
  return [...by.entries()].map(([paint, gs]) => {
    const g = mergeGeometries(gs.map((x) => { if (x.getAttribute('uv')) x.deleteAttribute('uv'); return x; }));
    g.computeBoundingBox();
    const b = g.boundingBox!, sd = pal[paint].seed;
    let R = 1;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) R = Math.max(R, Math.hypot(x - sd[0], y - sd[1], z - sd[2]));
    const mat = mkMat(pal[paint], R);
    return { mesh: new THREE.Mesh(g, mat), mat, paint };
  });
};
function buildParts(m: Model, pal: Record<Paint, Pigment>): PartRt[] {
  const n = m.parts.length;
  return m.parts.map((p, i) => {
    // départ hors champ : à l'écart du bâtiment, dans la direction de la pièce, et en hauteur (le toit tombe du ciel)
    const r = Math.hypot(p.c[0], p.c[2]), dx = r > 0.5 ? p.c[0] / r : 0.6, dz = r > 0.5 ? p.c[2] / r : 0.8;
    const from: V3 = p.roof ? [0, 16, 0] : [dx * 24, 7 + p.c[1] * 0.4, dz * 24];
    return { meshes: meshesOf(m, pal, p.solids, !!p.roof), lines: p.lines, from, land: lerp(LAND0, LAND1, n > 1 ? i / (n - 1) : 0) };
  });
}

const Scene: React.FC<{ t: number; style: Style }> = ({ t, style }) => {
  const { camera, size, viewport } = useThree();
  const { m, lines } = prep(style);
  const pal = PALETTE[style];
  const c = camAt(t);
  applyCam(camera as THREE.OrthographicCamera, c);
  const parts = useMemo(() => buildParts(m, pal), [m, pal]);
  // terrasse : le plan sur lequel les pièces se fixent
  const base = useMemo(() => meshesOf(m, pal, m.solids.filter((s) => (s.kind === 'box' && s.c[1] + s.s[1] / 2 <= 1.85 && s.s[0] > 2) || (s.kind === 'quad' && s.paint === 'marble')), false), [m, pal]);
  const sheet = useMemo(() => {
    const mount = new THREE.Mesh(new THREE.PlaneGeometry(33.6, 19.4), sheetMat([0.78, 0.72, 0.6]));
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(31, 17.2), sheetMat([0.985, 0.972, 0.94]));
    mount.position.set(0, 7.1, SHEET_Z - 0.02); paper.position.set(0, 7.1, SHEET_Z);
    mount.renderOrder = -2; paper.renderOrder = -1;
    return { mount, paper };
  }, []);
  const L = useMemo(() => ({
    dark: WIDTHS.map((w) => mkLine('#1a1613', w, false)),
    ghost: WIDTHS.map((w) => mkLine('#1a1613', w, false)),
    hid: WIDTHS.map((w) => mkLine('#1a1613', w, true)),
    axis: mkLine('#b8432f', 1.3, false),
  }), []);
  const reveal = (paint: Paint) => easeOut((t - COLOR_T0 - pal[paint].at) / WASH_DUR);

  // la feuille s'efface pendant que les fuyantes se prolongent
  const sheetOp = 1 - ease((t - DEPTH0 - 0.4) / 1.4);
  [sheet.mount, sheet.paper].forEach((s) => { s.visible = sheetOp > 0.005; (s.material as THREE.ShaderMaterial).uniforms.uOp.value = sheetOp; });
  base.forEach((b) => {
    const f = clamp((t - BACK0) / 0.6);
    b.mesh.visible = f > 0; b.mat.uniforms.uFill.value = f; b.mat.uniforms.uReveal.value = reveal(b.paint);
  });

  // dessin et prolongement ; après le recul, tout ce qui n'est pas la terrasse pâlit en épure
  const dark: number[][] = [[], [], []], ghost: number[][] = [[], [], []], ax: number[] = [];
  for (const l of lines) {
    const u = clamp((t - l.t0) / (l.t1 - l.t0));
    if (u <= 0) continue;
    // prolongement : tout point resté devant la règle qui recule est ramené sur elle (plan de la feuille au départ)
    const back = ZF - 24 * ease((t - l.e0) / (l.e1 - l.e0));
    const p = partial(ptsOf(l, c.az), u).map(([x, y, z]) => [x, y, Math.max(z, back)] as V3);
    const dst = l.axis ? ax : l.base ? dark[l.w] : ghost[l.w];
    for (let i = 1; i < p.length; i++) dst.push(...p[i - 1], ...p[i]);
  }
  // pièces : elles voyagent depuis l'extérieur, déjà dessinées, puis se fixent sur l'épure
  const pl: number[][] = [[], [], []];
  parts.forEach((pr) => {
    const u = (t - (pr.land - FLIGHT)) / FLIGHT;
    if (u <= 0) { pr.meshes.forEach((me) => { me.mesh.visible = false; }); return; }
    const k = backOut(u), off: V3 = [pr.from[0] * (1 - k), pr.from[1] * (1 - k), pr.from[2] * (1 - k)];
    pr.meshes.forEach((me) => {
      me.mesh.visible = true; me.mesh.position.set(...off);
      me.mat.uniforms.uFill.value = 1; me.mat.uniforms.uReveal.value = reveal(me.paint);
    });
    for (const l of pr.lines) {
      const p = ptsOf(l, c.az);
      for (let i = 1; i < p.length; i++) pl[l.w].push(p[i - 1][0] + off[0], p[i - 1][1] + off[1], p[i - 1][2] + off[2], p[i][0] + off[0], p[i][1] + off[1], p[i][2] + off[2]);
    }
  });

  const ghostOp = t < BACK0 ? 0.92 : t < LAND1 ? lerp(0.92, 0.26, ease((t - BACK0) / (BACK1 - BACK0))) : 0.26 * (1 - ease((t - LAND1) / 0.6));
  const hidOp = t < LAND0 - FLIGHT ? 0 : 0.3 * (1 - ease((t - LAND1) / 0.8));
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
  setL(L.axis, ax, 0.55 - 0.4 * clamp((t - BACK0) / 1.5), 1.3);

  return (
    <>
      <primitive object={sheet.mount} />
      <primitive object={sheet.paper} />
      {base.map((b, i) => <primitive key={`b${i}`} object={b.mesh} />)}
      {parts.flatMap((pr, i) => pr.meshes.map((me, j) => <primitive key={`p${i}_${j}`} object={me.mesh} />))}
      {[...L.dark, ...L.ghost, ...L.hid, L.axis].map((o, i) => <primitive key={`l${i}`} object={o.obj} />)}
    </>
  );
};

export const JiehuaFeuille: React.FC<JiehuaFeuilleProps> = ({ style }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shot = useMemo(() => {
    const s = compose(29, { move: 'push', mood: 'jour', duration: JIEHUA_FEUILLE_SECONDS });
    return { ...s, pieces: s.pieces.filter((p) => p.el.family !== 'premier' && (p.el.family !== 'vie' || /vie_[ab][26]\.png/.test(p.el.file))) };
  }, []);
  const sealU = clamp((t - T_SEAL) / 0.35);
  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <ShuimoBackground shot={shot} duration={JIEHUA_FEUILLE_SECONDS} halo={false} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 54% at 50% 54%, rgba(250,247,240,0.86) 0%, rgba(250,247,240,0.6) 60%, rgba(250,247,240,0) 100%)' }} />
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="inkfeuille" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: 'url(#inkfeuille)' }}>
        <ThreeCanvas width={W} height={H} orthographic flat linear gl={{ alpha: true, antialias: true }} camera={{ position: [0, 7, 80], zoom: 52 }}>
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
