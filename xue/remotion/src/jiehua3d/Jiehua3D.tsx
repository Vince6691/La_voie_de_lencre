// 界畫 en volume : la salle modélisée dans model.ts est rendue uniquement en traits d'encre, en projection
// parallèle (comme les dessins à la règle), sur le fond shuimo. Les traits se tracent seuls, sans outil à
// l'écran ; on voit d'abord toute l'ossature, à travers ; puis le bâtiment se referme (murs, toit), les traits cachés
// pâlissent et s'effacent ; enfin les couleurs minérales gagnent le dessin par lavis. La caméra part en
// plan rapproché sur l'angle, sort en recul jusqu'à la vue d'ensemble et s'arrête pour la couleur.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { CLOSE_T0, DRAW_END, GROUPS, LineDef, Paint, ROOF_T0, ROOF_T1, RIDGE_Y, SOLIDS, V3, X_E, Z_E, roofY } from './model';

export const JIEHUA3D_SECONDS = 10;
const W = 1920, H = 1080;
const COLOR_T0 = DRAW_END - 0.1, WASH_DUR = 1.3, T_SEAL = 9.0;

const clamp = (u: number) => Math.min(1, Math.max(0, u));
const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u));
const easeOut = (u: number) => 1 - (1 - clamp(u)) ** 3;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ---- caméra : orbite lente et recul pendant la construction, immobile pour la couleur ----
type Cam = { az: number; el: number; zoom: number; target: V3 };
// plan rapproché sur l'angle avant droit (on suit la colonne d'angle qui monte, puis les consoles), puis
// la caméra sort : recul et montée jusqu'à la vue plongeante d'ensemble, où elle s'arrête pour la couleur
const CLOSE = [
  { az: 0.8, el: 0.22, zoom: 140, target: [9.0, 2.4, 6.8] as V3 },     // pied de la colonne d'angle
  { az: 0.72, el: 0.24, zoom: 175, target: [8.3, 5.2, 5.6] as V3 },    // on monte le long de la colonne
  { az: 0.66, el: 0.26, zoom: 250, target: [8.3, 7.4, 5.5] as V3 },    // la console d'angle se monte
];
const WIDE: Cam = { az: 0.56, el: 0.5, zoom: 46, target: [0, 6.0, 0] };
const T_OUT = 3.5;
const mix = (A: Cam, B: Cam, e: number): Cam => ({
  az: lerp(A.az, B.az, e), el: lerp(A.el, B.el, e), zoom: Math.exp(lerp(Math.log(A.zoom), Math.log(B.zoom), e)),
  target: [0, 1, 2].map((k) => lerp(A.target[k], B.target[k], e)) as V3,
});
const camAt = (t: number): Cam => {
  if (t < T_OUT) {
    const s = ease(t / T_OUT) * 2, i = Math.min(1, Math.floor(s));
    return mix(CLOSE[i], CLOSE[i + 1], s - i);
  }
  // sortie : départ lent, élan, arrivée amortie
  const u = clamp((t - T_OUT) / (DRAW_END - 0.1 - T_OUT));
  return mix(CLOSE[2], WIDE, u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
};
const camPos = (c: Cam): V3 => { const D = 80; return [c.target[0] + D * Math.sin(c.az) * Math.cos(c.el), c.target[1] + D * Math.sin(c.el), c.target[2] + D * Math.cos(c.az) * Math.cos(c.el)]; };
const applyCam = (cam: THREE.OrthographicCamera, c: Cam) => {
  cam.position.set(...camPos(c)); cam.up.set(0, 1, 0); cam.zoom = c.zoom; cam.near = 1; cam.far = 300;
  cam.lookAt(...c.target); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
};

// ---- calendrier des traits ----
type Timed = LineDef & { t0: number; t1: number; mode: 'ruler' | 'free' | 'cascade' };
const len3 = (p: V3[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1], q[2] - p[i][2]), 0);
const ptsOf = (l: LineDef, az: number) => (typeof l.pts === 'function' ? l.pts(az) : l.pts);
const LINES: Timed[] = GROUPS.flatMap((g) => {
  const n = g.lines.length, T = g.t1 - g.t0;
  if (g.mode === 'cascade') {
    const d = Math.min(0.28, T * 0.4);
    return g.lines.map((l, i) => { const t0 = g.t0 + ((T - d) * i) / Math.max(1, n - 1); return { ...l, t0, t1: t0 + d, mode: g.mode }; });
  }
  const gap = Math.min(0.06, (T * 0.3) / Math.max(1, n - 1)), lens = g.lines.map((l) => len3(ptsOf(l, 0))), tot = lens.reduce((a, b) => a + b, 0);
  let t = g.t0;
  return g.lines.map((l, i) => { const d = ((T - gap * (n - 1)) * lens[i]) / tot, r = { ...l, t0: t, t1: t + d, mode: g.mode }; t += d + gap; return r; });
});

// partie tracée d'une polyligne (fraction u de sa longueur)
const partial = (p: V3[], u: number): V3[] => {
  if (u >= 1) return p;
  let s = u * len3(p);
  const out: V3[] = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (s <= d) { const k = d ? s / d : 0; out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]); return out; }
    out.push(b); s -= d;
  }
  return out;
};

// ---- matériaux des pièces pleines : papier, puis lavis qui se répand depuis une graine ----
const PAINT: Record<Paint, { tint: [number, number, number]; k: number; at: number; seed: V3 }> = {
  stone: { tint: [0.84, 0.8, 0.72], k: 1, at: 0, seed: [-6, 1.4, 9] },
  column: { tint: [0.76, 0.27, 0.17], k: 1, at: 0.15, seed: [-3, 4, 5] },
  door: { tint: [0.82, 0.47, 0.37], k: 1, at: 0.28, seed: [0, 3.5, 5] },
  plaster: { tint: [0.97, 0.95, 0.9], k: 1, at: 0.3, seed: [5, 3, 5] },
  red: { tint: [0.74, 0.3, 0.2], k: 1, at: 0.42, seed: [0, 6.2, 5] },
  green: { tint: [0.4, 0.64, 0.55], k: 1, at: 0.5, seed: [-4, 6, 5] },
  blue: { tint: [0.33, 0.47, 0.68], k: 1, at: 0.6, seed: [3, 7.5, 6] },
  roof: { tint: [0.6, 0.63, 0.65], k: 1, at: 0.75, seed: [0, 10, 6] },
  ridge: { tint: [0.27, 0.29, 0.31], k: 1, at: 1.0, seed: [0, 12.5, 0] },
};
const PAPER = new THREE.Color(0.965, 0.948, 0.91);
const VERT = `varying vec3 vW; varying vec3 vN;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = `uniform vec3 uTint; uniform vec3 uPaper; uniform vec3 uSeed; uniform float uR; uniform float uReveal; uniform float uFill; uniform float uClipY;
varying vec3 vW; varying vec3 vN;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ return 0.5 * vn(p) + 0.25 * vn(p * 2.03) + 0.125 * vn(p * 4.01) + 0.0625 * vn(p * 8.0); }
void main(){
  if (vW.y > uClipY) discard;
  float d = distance(vW, uSeed) / uR;
  float front = uReveal * 1.5 - d - 0.2 + (fbm(vW * 0.45) - 0.47) * 0.35;
  float a = smoothstep(0.0, 0.05, front);
  float edge = smoothstep(0.0, 0.02, front) * (1.0 - smoothstep(0.02, 0.1, front));   // bord du lavis plus chargé
  float shade = 0.82 + 0.18 * max(dot(normalize(vN), normalize(vec3(-0.35, 0.85, 0.45))), 0.0);
  float gran = 0.9 + 0.2 * fbm(vW * 3.1);
  vec3 tint = uTint * gran * shade * (1.0 - 0.12 * edge);
  gl_FragColor = vec4(uPaper * mix(vec3(1.0), tint, a), uFill);
}`;
const mkMat = (p: Paint, R: number) => new THREE.ShaderMaterial({
  vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: true, side: THREE.DoubleSide,
  polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
  uniforms: { uTint: { value: new THREE.Color(...PAINT[p].tint) }, uPaper: { value: PAPER }, uSeed: { value: new THREE.Vector3(...PAINT[p].seed) }, uR: { value: R }, uReveal: { value: 0 }, uFill: { value: 0 }, uClipY: { value: 1e4 } },
});

function solidGeo(s: (typeof SOLIDS)[number]): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  if (s.kind === 'box') { g = new THREE.BoxGeometry(...s.s); g.translate(...s.c); }
  else if (s.kind === 'cyl') { g = new THREE.CylinderGeometry(s.r, s.r, s.h, 24); g.translate(...s.c); }
  else {
    g = new THREE.BufferGeometry();
    const [a, b, c, d] = s.p;
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
    g.computeVertexNormals();
  }
  return g.index ? g.toNonIndexed() : g;
}
function roofGeo(): THREE.BufferGeometry {
  const nx = 152, nz = 112, pos: number[] = [];
  const P = (i: number, j: number): V3 => { const x = -X_E + (2 * X_E * i) / nx, z = -Z_E + (2 * Z_E * j) / nz; return [x, roofY(x, z), z]; };
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

type Mesh = { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; paint: Paint; appear: number; roof?: boolean };
function buildMeshes(): Mesh[] {
  const by = new Map<Paint, THREE.BufferGeometry[]>();
  SOLIDS.forEach((s) => { const a = by.get(s.paint) ?? []; a.push(solidGeo(s)); by.set(s.paint, a); });
  const out: Mesh[] = [];
  const radius = (g: THREE.BufferGeometry, seed: V3) => {
    g.computeBoundingBox(); const b = g.boundingBox!;
    let r = 1;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) r = Math.max(r, Math.hypot(x - seed[0], y - seed[1], z - seed[2]));
    return r;
  };
  by.forEach((gs, paint) => {
    const g = mergeGeometries(gs.map((x) => { x.deleteAttribute('uv'); return x; }));
    const mat = mkMat(paint, radius(g, PAINT[paint].seed));
    out.push({ mesh: new THREE.Mesh(g, mat), mat, paint, appear: paint === 'stone' ? 1.0 : CLOSE_T0 });
  });
  const rg = roofGeo(), rm = mkMat('roof', radius(rg, PAINT.roof.seed));
  out.push({ mesh: new THREE.Mesh(rg, rm), mat: rm, paint: 'roof', appear: ROOF_T0, roof: true });
  return out;
}

// ---- traits : trois épaisseurs, plus le cordeau vermillon ; passe visible et passe « cachée » ----
const WIDTHS = [1.1, 1.6, 2.4];
type LineObj = { obj: LineSegments2; geo: LineSegmentsGeometry; mat: LineMaterial };
const mkLine = (color: string, w: number, hidden: boolean): LineObj => {
  const geo = new LineSegmentsGeometry();
  const mat = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: w, transparent: true, depthWrite: false });
  if (hidden) mat.depthFunc = THREE.GreaterDepth;
  const obj = new LineSegments2(geo, mat);
  obj.frustumCulled = false;
  obj.renderOrder = hidden ? 3 : 2;
  return { obj, geo, mat };
};

const Scene: React.FC<{ t: number }> = ({ t }) => {
  const { camera, size, viewport } = useThree();
  const c = camAt(t);
  applyCam(camera as THREE.OrthographicCamera, c);
  const meshes = useMemo(buildMeshes, []);
  const lines = useMemo(() => ({
    vis: WIDTHS.map((w) => mkLine('#1a1613', w, false)),
    hid: WIDTHS.map((w) => mkLine('#1a1613', w, true)),
    axis: mkLine('#b8432f', 1.3, false),
  }), []);

  // pièces pleines
  meshes.forEach((m) => {
    const fill = clamp((t - m.appear) / 0.45);
    m.mesh.visible = fill > 0;
    m.mat.uniforms.uFill.value = fill;
    m.mat.uniforms.uClipY.value = m.roof ? lerp(8.3, RIDGE_Y + 0.8, ease((t - ROOF_T0) / (ROOF_T1 - ROOF_T0))) : 1e4;
    m.mat.uniforms.uReveal.value = easeOut((t - COLOR_T0 - PAINT[m.paint].at) / WASH_DUR);
  });
  // traits tracés jusqu'ici
  const buf: number[][] = [[], [], []], ax: number[] = [];
  for (const l of LINES) {
    const u = clamp((t - l.t0) / (l.t1 - l.t0));
    if (u <= 0) continue;
    const p = partial(ptsOf(l, c.az), u), dst = l.axis ? ax : buf[l.w];
    for (let i = 1; i < p.length; i++) dst.push(...p[i - 1], ...p[i]);
  }
  const ghost = t < CLOSE_T0 ? 0 : 0.85 * (1 - ease((t - CLOSE_T0) / (DRAW_END + 0.3 - CLOSE_T0)));
  const dpr = viewport.dpr;
  const setL = (o: LineObj, arr: number[], op: number, w: number) => {
    o.obj.visible = arr.length > 0 && op > 0.005;
    // géométrie neuve à chaque image : three.js garde en cache le nombre d'instances d'une géométrie déjà
    // dessinée, et n'afficherait qu'une partie des traits quand leur nombre grandit (clignotement)
    if (o.obj.visible) { o.geo.dispose(); o.geo = new LineSegmentsGeometry(); o.geo.setPositions(arr); o.obj.geometry = o.geo; }
    o.mat.opacity = op;
    o.mat.linewidth = Math.max(1, w * dpr);
    o.mat.resolution.set(size.width * dpr, size.height * dpr);
  };
  WIDTHS.forEach((w, i) => { setL(lines.vis[i], buf[i], 0.92, w); setL(lines.hid[i], buf[i], ghost, w); });
  setL(lines.axis, ax, 0.55 - 0.4 * clamp((t - CLOSE_T0) / 1.5), 1.3);

  return (
    <>
      {meshes.map((m, i) => <primitive key={`m${i}`} object={m.mesh} />)}
      {[...lines.vis, ...lines.hid, lines.axis].map((o, i) => <primitive key={`l${i}`} object={o.obj} />)}
    </>
  );
};

const useFonts = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    new FontFace('Jiehua3dSeal', `url(${staticFile('fonts/NotoSerifTC-Bold.otf')})`).load().then((f) => { document.fonts.add(f); continueRender(h); });
  }, [h]);
};

export const Jiehua3D: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shot = useMemo(() => {
    const s = compose(29, { move: 'push', mood: 'jour', duration: JIEHUA3D_SECONDS });
    return { ...s, pieces: s.pieces.filter((p) => p.el.family !== 'premier' && (p.el.family !== 'vie' || /vie_[ab][26]\.png/.test(p.el.file))) };
  }, []);
  const sealU = clamp((t - T_SEAL) / 0.35);

  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <ShuimoBackground shot={shot} duration={JIEHUA3D_SECONDS} halo={false} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 54% at 50% 54%, rgba(250,247,240,0.86) 0%, rgba(250,247,240,0.6) 60%, rgba(250,247,240,0) 100%)' }} />
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="ink3d" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: 'url(#ink3d)' }}>
        <ThreeCanvas width={W} height={H} orthographic flat linear gl={{ alpha: true, antialias: true }} camera={{ position: [40, 30, 40], zoom: 50 }}>
          <Scene t={t} />
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
