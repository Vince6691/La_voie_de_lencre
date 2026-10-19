// 界畫 « de la feuille au volume » (style Song par défaut), 12 s :
// 1. une feuille de papier montée, vue de face ; l'élévation de la salle s'y trace trait par trait : tous les traits
//    du modèle vus de face, ramenés dans le plan de la feuille (les fuyantes, de longueur nulle, n'y paraissent pas) ;
// 2. la caméra glisse latéralement et monte : on voit que c'est une feuille plate, posée dans l'espace ;
// 3. le maître prolonge les traits : élément après élément (terrasse, colonnes, linteaux, consoles…), les fuyantes
//    s'allongent depuis la feuille vers l'arrière et emportent chaque trait jusqu'à sa profondeur réelle ; la feuille
//    s'efface et l'élévation devient la vue en volume ;
// 4. les volumes s'ajoutent bloc par bloc dans l'ordre du chantier (les traits cachés pâlissent) ;
// 5. la couleur gagne le bâtiment par lavis.
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

export const JIEHUA_FEUILLE_SECONDS = 12;
export type JiehuaFeuilleProps = { style: Style };
const W = 1920, H = 1080;
// calendrier (secondes)
const DRAW0 = 0.6, DRAW1 = 3.3;               // élévation tracée sur la feuille
const TURN0 = 3.4, TURN1 = 5.3;               // glissement latéral de la caméra
const DEPTH0 = 5.2, DEPTH1 = 7.4;             // fuyantes prolongées, élément après élément
const BLOCK0 = 7.4, BLOCK1 = 9.4;             // volumes ajoutés
const COLOR_T0 = 9.5, WASH_DUR = 1.1, T_SEAL = 11.1;
const ZF = 11.5;                              // plan de la feuille : devant tout le bâtiment (marches comprises)
const SHEET_Z = ZF - 0.05;

// ---- caméra : de face sur la feuille, glissement latéral et montée, puis lente orbite ----
const FRONT: Cam = { az: 0, el: 0, zoom: 52, target: [0, 7.2, 0] };
const FRONT2: Cam = { ...FRONT, zoom: 54 };
const VIEW: Cam = { az: 0.56, el: 0.5, zoom: 46, target: [0, 6.0, 0] };
const VIEW2: Cam = { az: 0.48, el: 0.46, zoom: 48, target: [0, 6.2, 0] };
const camAt = (t: number): Cam => {
  if (t < TURN0) return mix(FRONT, FRONT2, ease(t / TURN0));
  if (t < TURN1) return mix(FRONT2, VIEW, ease((t - TURN0) / (TURN1 - TURN0)));
  return mix(VIEW, VIEW2, ease((t - TURN1) / (COLOR_T0 - TURN1)));
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
type Line = Timed & { depth: boolean; e0: number; e1: number };   // e0, e1 : prolongement de l'élément
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
    const toDraw = map(DRAW0, DRAW1), toDepth = map(DEPTH0, DEPTH1 - 0.5);
    const lines: Line[] = m.groups.flatMap((g) => {
      const elev = g.lines.filter((l) => !isDepth(l)), dep = g.lines.filter(isDepth).map(frontFirst);
      const e0 = toDepth(g.t0), e1 = Math.max(e0 + 0.6, toDepth(g.t1));
      return [
        ...timeLines([{ ...g, lines: elev }]).map((l) => ({ ...l, t0: toDraw(l.t0), t1: toDraw(l.t1), depth: false, e0, e1 })),
        // les fuyantes sont « posées » d'un coup : c'est le prolongement qui les fait grandir
        ...dep.map((l) => ({ ...l, t0: e0 - 0.02, t1: e0, mode: 'cascade' as const, depth: true, e0, e1 })),
      ];
    });
    PREP.set(style, { m, lines });
  }
  return PREP.get(style)!;
};

type Block = { meshes: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; paint: Paint }[]; at: number };
function buildBlocks(m: Model, pal: Record<Paint, Pigment>): Block[] {
  const mk = (solids: Solid[], roof: boolean) => {
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
  // la terrasse d'abord, puis les pièces dans l'ordre du chantier
  const base = m.solids.filter((s) => (s.kind === 'box' && s.c[1] + s.s[1] / 2 <= 1.85 && s.s[0] > 2) || (s.kind === 'quad' && s.paint === 'marble'));
  const items = [{ solids: base, roof: false }, ...m.parts.map((p) => ({ solids: p.solids, roof: !!p.roof }))];
  return items.map((it, i) => ({ meshes: mk(it.solids, it.roof), at: lerp(BLOCK0, BLOCK1 - 0.35, i / (items.length - 1)) }));
}

const Scene: React.FC<{ t: number; style: Style }> = ({ t, style }) => {
  const { camera, size, viewport } = useThree();
  const { m, lines } = prep(style);
  const pal = PALETTE[style];
  const c = camAt(t);
  applyCam(camera as THREE.OrthographicCamera, c);
  const blocks = useMemo(() => buildBlocks(m, pal), [m, pal]);
  const sheet = useMemo(() => {
    const mount = new THREE.Mesh(new THREE.PlaneGeometry(33.6, 19.4), sheetMat([0.78, 0.72, 0.6]));
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(31, 17.2), sheetMat([0.985, 0.972, 0.94]));
    mount.position.set(0, 7.1, SHEET_Z - 0.02); paper.position.set(0, 7.1, SHEET_Z);
    mount.renderOrder = -2; paper.renderOrder = -1;
    return { mount, paper };
  }, []);
  const L = useMemo(() => ({
    vis: WIDTHS.map((w) => mkLine('#1a1613', w, false)),
    hid: WIDTHS.map((w) => mkLine('#1a1613', w, true)),
    axis: mkLine('#b8432f', 1.3, false),
  }), []);

  // la feuille s'efface pendant que les fuyantes se prolongent
  const sheetOp = 1 - ease((t - DEPTH0 - 0.3) / 1.4);
  [sheet.mount, sheet.paper].forEach((s) => { s.visible = sheetOp > 0.005; (s.material as THREE.ShaderMaterial).uniforms.uOp.value = sheetOp; });
  // volumes : chaque bloc se pose d'une petite hauteur et prend sa matière de papier
  blocks.forEach((b) => {
    const u = clamp((t - b.at) / 0.4), fill = ease(u), drop = 0.9 * (1 - easeOut(u));
    b.meshes.forEach((me) => {
      me.mesh.visible = fill > 0; me.mesh.position.set(0, drop, 0);
      me.mat.uniforms.uFill.value = fill;
      me.mat.uniforms.uReveal.value = easeOut((t - COLOR_T0 - pal[me.paint].at) / WASH_DUR);
    });
  });
  // traits
  const buf: number[][] = [[], [], []], ax: number[] = [];
  for (const l of lines) {
    const u = clamp((t - l.t0) / (l.t1 - l.t0));
    if (u <= 0) continue;
    // prolongement : tout point resté devant la règle qui recule est ramené sur elle (plan de la feuille au départ)
    const back = ZF - 24 * ease((t - l.e0) / (l.e1 - l.e0));
    const p = partial(ptsOf(l, c.az), u).map(([x, y, z]) => [x, y, Math.max(z, back)] as V3), dst = l.axis ? ax : buf[l.w];
    for (let i = 1; i < p.length; i++) dst.push(...p[i - 1], ...p[i]);
  }
  const hidOp = t < BLOCK0 ? 0 : 0.3 * (1 - ease((t - BLOCK1 + 0.4) / 0.9));
  const dpr = viewport.dpr;
  const setL = (o: LineObj, arr: number[], op: number, w: number) => {
    o.obj.visible = arr.length > 0 && op > 0.005;
    // géométrie neuve à chaque image (sinon three.js garde le nombre de traits de la première image)
    if (o.obj.visible) { o.geo.dispose(); o.geo = new LineSegmentsGeometry(); o.geo.setPositions(arr); o.obj.geometry = o.geo; }
    o.mat.opacity = op;
    o.mat.linewidth = Math.max(1, w * dpr);
    o.mat.resolution.set(size.width * dpr, size.height * dpr);
  };
  WIDTHS.forEach((w, i) => { setL(L.vis[i], buf[i], 0.92, w); setL(L.hid[i], buf[i], hidOp, w); });
  setL(L.axis, ax, 0.55 - 0.4 * clamp((t - BLOCK0) / 1.5), 1.3);

  return (
    <>
      <primitive object={sheet.mount} />
      <primitive object={sheet.paper} />
      {blocks.flatMap((b, i) => b.meshes.map((me, j) => <primitive key={`b${i}_${j}`} object={me.mesh} />))}
      {[...L.vis, ...L.hid, L.axis].map((o, i) => <primitive key={`l${i}`} object={o.obj} />)}
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
