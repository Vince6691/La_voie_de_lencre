// Hall impérial paramétrique en 3D : toutes les pièces sont reconstruites à chaque image à partir des
// paramètres de l'époque (params.ts), regroupées par matière en quelques maillages fusionnés, rendues en
// toon (quelques paliers de lumière, comme des lavis) avec un contour d'encre (coque inversée).
import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { DUR, HallParams, Light, T0, T_INTRO, hxOf } from './params';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(k)).getHexString();

export const BAYS_X = 7, BAYS_Z = 4, HW = BAYS_X / 2, HD = BAYS_Z / 2;

// tronc de pyramide (斗 : bloc dont le pied est plus étroit que la tête ; bouts de bras 卷殺) : base à y = 0, dimensions du haut et du bas
export const taperGeo = (wTop: number, wBot: number, dTop: number, dBot: number, h: number): THREE.BufferGeometry => {
  const g = new THREE.BoxGeometry(1, 1, 1), pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const top = pos.getY(i) > 0;
    pos.setXYZ(i, pos.getX(i) * (top ? wTop : wBot), (pos.getY(i) + 0.5) * h, pos.getZ(i) * (top ? dTop : dBot));
  }
  g.computeVertexNormals();
  return g;
};

// ── constructeur de formes fusionnées par matière
type Part = THREE.BufferGeometry;
class Pile {
  parts: Part[] = [];
  box(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
    if (w <= 1e-4 || h <= 1e-4 || d <= 1e-4) return;
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y + h / 2, z); // y = bas de la pièce
    this.parts.push(g);
  }
  cyl(rTop: number, rBot: number, h: number, x: number, y: number, z: number, seg = 14) {
    if (h <= 1e-4) return;
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1);
    g.translate(x, y + h / 2, z);
    this.parts.push(g);
  }
  // tube entre deux points (arêtiers, faîtage)
  tube(a: [number, number, number], b: [number, number, number], r: number, seg = 8) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
    if (L < 1e-4) return;
    const g = new THREE.CylinderGeometry(r, r, L, seg, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    this.parts.push(g);
  }
  add(g: Part) { this.parts.push(g); }
  build(): Part | null {
    if (!this.parts.length) return null;
    const g = mergeGeometries(this.parts.map((p) => (p.index ? p.toNonIndexed() : p)), false);
    this.parts.forEach((p) => p.dispose());
    return g;
  }
}

// ── toit : surface réglée (croupe), pente concave, angles relevés ; `slopeW` = largeur de la pente depuis l'avant-toit
function roofHeight(x: number, z: number, hw: number, hd: number, H: number, q: number, lift: number, slopeW: number) {
  const ex = hw - Math.abs(x), ez = hd - Math.abs(z), d = Math.max(0, Math.min(ex, ez)), r = Math.min(1, d / slopeW);
  // pente concave (舉折) : plate au bas, qui se raidit vers le faîte
  const base = H * Math.pow(r, q);
  // avant-toit « en sourire » : il se relève doucement vers les angles, puis d'un coup au bout (起翹)
  const smile = Math.pow(ez < ex ? Math.abs(x) / hw : Math.abs(z) / hd, 2.6);
  const tip = Math.max(Math.pow(Math.abs(x) / hw, 8), Math.pow(Math.abs(z) / hd, 8));
  // les extrémités du faîtage se redressent un peu aussi
  const rise = 0.35 * lift * Math.pow(Math.abs(x) / hw, 3) * r;
  return base + lift * (0.45 * smile + tip) * Math.pow(1 - r, 2.2) + rise;
}
function roofGeom(hw: number, hd: number, H: number, q: number, lift: number, slopeW: number, y: number, drop = 0) {
  const nx = 124, nz = 76, pos: number[] = [], idx: number[] = [], uv: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = -hw + (2 * hw * i) / nx, z = -hd + (2 * hd * j) / nz;
    pos.push(x, y + roofHeight(x, z, hw, hd, H, q, lift, slopeW) - drop, z);
    // côtes de tuiles : elles descendent la pente, sur chaque pan (long pan ou croupe)
    const dx = hw - Math.abs(x), dz = hd - Math.abs(z), d = Math.min(dx, dz);
    uv.push((dz < dx ? x : z) / 0.2, d / 0.2);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const n = g.toNonIndexed();
  n.computeVertexNormals();
  g.dispose();
  return n;
}

// ── matériaux : même langage que le pavillon 界畫 (jiehua3d) — le solide est un lavis de pigment posé en multiplication
// sur le papier (granulation, ombre douce, ombre chaude sous l'avant-toit), cerné de traits d'encre fins (LineSegments2)
const PAPER = new THREE.Color(0.965, 0.948, 0.91);
const VERT = `varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; gl_Position = projectionMatrix * viewMatrix * w; }`;
// uKind : 0 aplat, 1 彩畫 des pièces longues (bouts 箍頭 contrastés, losange clair 枋心, filets d'or), 2 anneaux dorés
// des piliers, 3 rangs de tuiles en relief
const FRAG = `uniform vec3 uTint; uniform vec3 uTint2; uniform vec3 uPaper; uniform vec3 uGold; uniform float uKind; uniform float uDeco; uniform float uGoldAmt;
uniform float uEaveY; uniform float uAO; uniform vec2 uRing; uniform vec2 uDoor; uniform sampler2D uMap; uniform float uMapOn; uniform float uTime; uniform float uShine; uniform vec3 uSun; uniform vec3 uSunTint; uniform float uAmb;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ return 0.5 * vn(p) + 0.25 * vn(p * 2.03) + 0.125 * vn(p * 4.01) + 0.0625 * vn(p * 8.0); }
void main(){
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float lam = max(dot(n, normalize(uSun)), 0.0), shade = uAmb + (1.0 - uAmb) * lam;
  float gran = 0.9 + 0.2 * fbm(vW * 3.1);
  vec3 col = uPaper * uTint * gran * shade * mix(vec3(0.9, 0.93, 1.0), uSunTint, lam); // faces au soleil chaudes, à l'ombre plus froides
  bool side = abs(n.y) < 0.5;
  if (uKind > 2.5 && uKind < 3.5) {
    float rib = 0.5 + 0.5 * cos(6.2832 * vUv.x / 2.0);
    col *= (0.92 + 0.08 * rib) * (0.97 + 0.03 * cos(6.2832 * vUv.y / 6.0));
  } else if (uKind > 0.5 && uKind < 1.5 && side) {
    float u = abs(n.z) > 0.5 ? fract(vW.x + 0.5) : fract(vW.z);
    vec3 dec = col;
    if (u < 0.1 || u > 0.9) dec = uPaper * uTint2 * gran * shade;
    if (abs(u - 0.5) < 0.2) dec = mix(dec, uPaper * gran, 0.45);
    // 旋子 : rosette à anneaux concentriques au centre de chaque travée
    vec2 q = vec2(u - 0.5, (vUv.y - 0.5) * 0.1); float rq = length(q);
    if (rq < 0.052) { vec3 rc = rq < 0.018 ? uGold : (rq < 0.032 ? vec3(0.2, 0.42, 0.7) : (rq < 0.042 ? vec3(0.28, 0.62, 0.5) : vec3(0.8, 0.3, 0.2))); dec = mix(dec, uPaper * rc * shade, 0.92); }
    float gl = min(min(abs(u - 0.1), abs(u - 0.9)), abs(abs(u - 0.5) - 0.2));
    dec = mix(dec, uPaper * uGold * shade, (1.0 - smoothstep(0.005, 0.014, gl)) * uGoldAmt);
    col = mix(col, dec, uDeco);
  } else if (uKind > 3.5 && uKind < 4.5) {
    // 隔扇 : quatre vantaux par travée, panneau plein en bas, treillis de losanges (papier derrière) au-dessus
    float yy = (vW.y - uDoor.x) / uDoor.y, along = abs(n.z) > 0.5 ? vW.x : vW.z, leaf = fract(along / 0.25);
    vec3 wood = col;
    if (yy > 0.3) {
      float a = fract((along + vW.y) * 5.0), b = fract((along - vW.y) * 5.0), ln = min(min(a, 1.0 - a), min(b, 1.0 - b));
      col = mix(uPaper * vec3(0.93, 0.85, 0.64) * gran * shade, wood, 1.0 - smoothstep(0.07, 0.13, ln));
    } else {
      col *= mix(1.0, 0.8, step(0.14, leaf) * step(leaf, 0.86) * step(0.07, yy) * step(yy, 0.27));
    }
    col = mix(col, wood * 0.72, 1.0 - smoothstep(0.03, 0.06, min(leaf, 1.0 - leaf)));
  } else if (uKind > 5.5) {
    // plaque 匾額 : caractères dorés sur la face avant
    vec4 c = texture2D(uMap, vUv);
    col = mix(col, uPaper * vec3(0.95, 0.76, 0.32) * shade, c.a * step(0.9, n.z) * uMapOn);
  } else if (uKind > 4.5) {
    // or : dégradé selon l'orientation, éclats qui courent sur la feuille d'or
    float sp = pow(max(0.0, sin(dot(vW, vec3(13.1, 7.7, 9.3)) * 1.7 + uTime * 2.4)), 24.0);
    float sp2 = pow(max(0.0, sin(dot(vW, vec3(5.3, 11.7, 8.9)) * 2.3 - uTime * 3.1)), 30.0);
    col = col * (0.9 + 0.28 * (n.y * 0.5 + 0.5)) + uPaper * vec3(1.0, 0.9, 0.62) * (sp + 0.8 * sp2) * uShine;
  } else if (uKind > 1.5 && uKind < 2.5) {
    float r = min(abs(vW.y - uRing.x), abs(vW.y - uRing.y));
    col = mix(col, uPaper * uGold * shade, (1.0 - smoothstep(0.02, 0.04, r)) * uGoldAmt);
  }
  col *= 0.965 + 0.07 * h(vec3(floor(gl_FragCoord.xy * 0.5), 3.0)); // grain du papier
  float ao = (side && (uKind < 2.5 || (uKind > 3.5 && uKind < 4.5))) ? smoothstep(uEaveY - 1.1, uEaveY, vW.y) * uAO : 0.0;
  col *= mix(vec3(1.0), vec3(0.78, 0.68, 0.6), ao);
  gl_FragColor = vec4(col, 1.0);
}`;

export type Wash = { tint: string; tint2?: string; kind?: 0 | 1 | 2 | 3 | 4 | 5 | 6; map?: THREE.Texture | null; door?: [number, number]; deco?: number; gold?: number; ao?: number; eaveY?: number; ring?: [number, number] };
const INK = '#1a1613';
// temps et éclat de l'or, posés par Hall avant le rendu de ses matériaux
const HALL_TIME = { t: 0, shine: 0.4, sun: [-0.35, 0.85, 0.45] as [number, number, number], tint: [1, 0.95, 0.9] as [number, number, number], amb: 0.8 };
// un maillage en lavis + ses arêtes vives en traits d'encre (w : épaisseur en pixels, 0 : pas de trait)
const Inked: React.FC<{ geo: Part | null; wash: Wash; w?: number; lineColor?: string; angle?: number; extra?: number[] }> = ({ geo, wash: W, w = 1.4, lineColor = INK, angle = 28, extra }) => {
  const { size, viewport } = useThree();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
    uniforms: { uTint: { value: new THREE.Color() }, uTint2: { value: new THREE.Color() }, uPaper: { value: PAPER }, uGold: { value: new THREE.Color(0.87, 0.67, 0.27) },
      uKind: { value: 0 }, uDeco: { value: 0 }, uGoldAmt: { value: 0 }, uEaveY: { value: 99 }, uAO: { value: 0.22 }, uRing: { value: new THREE.Vector2(-99, -99) }, uDoor: { value: new THREE.Vector2(0, 1) }, uMap: { value: new THREE.Texture() }, uMapOn: { value: 0 }, uTime: { value: 0 }, uShine: { value: 0.4 }, uSun: { value: new THREE.Vector3(-0.35, 0.85, 0.45) }, uSunTint: { value: new THREE.Vector3(1, 0.95, 0.9) }, uAmb: { value: 0.8 } },
  }), []);
  const lm = useMemo(() => new LineMaterial({ color: new THREE.Color(lineColor).getHex(), linewidth: w, transparent: true, opacity: 0.92, depthWrite: false }), [lineColor, w]);
  const u = mat.uniforms;
  u.uTint.value.set(W.tint); u.uTint2.value.set(W.tint2 ?? W.tint); u.uKind.value = W.kind ?? 0; u.uDeco.value = W.deco ?? 0; u.uGoldAmt.value = W.gold ?? 0;
  u.uAO.value = W.ao ?? 0.22; u.uEaveY.value = W.eaveY ?? 99; u.uRing.value.set(...(W.ring ?? [-99, -99])); u.uDoor.value.set(...(W.door ?? [0, 1])); u.uMap.value = W.map ?? u.uMap.value; u.uMapOn.value = W.map ? 1 : 0; u.uTime.value = HALL_TIME.t; u.uShine.value = HALL_TIME.shine; u.uSun.value.set(...HALL_TIME.sun); u.uSunTint.value.set(...HALL_TIME.tint); u.uAmb.value = HALL_TIME.amb;
  lm.linewidth = Math.max(1, w * viewport.dpr); lm.resolution.set(size.width * viewport.dpr, size.height * viewport.dpr);
  const lg = useMemo(() => {
    if (!geo || w <= 0) return null;
    const e = new THREE.EdgesGeometry(geo, angle), g = new LineSegmentsGeometry();
    g.setPositions([...Array.from(e.getAttribute('position').array as Float32Array), ...(extra ?? [])]);
    e.dispose();
    return g;
  }, [geo, w, angle, extra]);
  const lines = useMemo(() => { if (!lg) return null; const o = new LineSegments2(lg, lm); o.frustumCulled = false; o.renderOrder = 2; return o; }, [lg, lm]);
  useEffect(() => () => geo?.dispose(), [geo]);
  useEffect(() => () => lg?.dispose(), [lg]);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => () => lm.dispose(), [lm]);
  if (!geo) return null;
  return (
    <>
      <mesh geometry={geo} material={mat} />
      {lines && <primitive object={lines} />}
    </>
  );
};

// lavis d'encre sous le socle (ancre le bâtiment dans le papier)
const wash = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!, rg = g.createRadialGradient(128, 128, 10, 128, 128, 126);
    rg.addColorStop(0, 'rgba(30,26,22,0.42)'); rg.addColorStop(0.55, 'rgba(30,26,22,0.16)'); rg.addColorStop(1, 'rgba(30,26,22,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();

// caractères de la plaque (dorés, transparents) ; non mis en cache tant que la police n'est pas chargée
const plaqueTex = new Map<string, THREE.CanvasTexture>();
const plaqueTexture = (text: string): THREE.CanvasTexture | null => {
  if (!text || typeof document === 'undefined' || !document.fonts.check('64px ShuimoKai')) return null;
  const hit = plaqueTex.get(text); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = 285; c.height = 90;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.font = '62px ShuimoKai'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...text].forEach((ch, i, a) => g.fillText(ch, (c.width * (i + 0.5)) / a.length, c.height * 0.54));
  const t = new THREE.CanvasTexture(c);
  plaqueTex.set(text, t);
  return t;
};

// ── 鴟吻 : grand épi de faîtage, profil extrudé (queue qui s'enroule vers l'intérieur) ; dir = -1 : côté gauche
const chiwen = (h: number, dir: 1 | -1, x: number, y: number) => {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(0.2, 0);
  sh.bezierCurveTo(0.27, 0.2, 0.27, 0.46, 0.13, 0.58);
  sh.bezierCurveTo(0.03, 0.66, -0.09, 0.55, -0.02, 0.46);
  sh.bezierCurveTo(0.05, 0.4, 0.07, 0.34, 0.03, 0.28);
  sh.bezierCurveTo(0, 0.18, -0.05, 0.08, 0, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.11, bevelEnabled: false, curveSegments: 10 });
  g.translate(-0.1, 0, -0.055);
  g.scale(dir * h, h, 1);
  g.translate(x, y, 0);
  return g;
};

const sm = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
const easeIO = (u: number) => sm(0, 1, u);
const CS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
// ordre « en cercle » autour du bâtiment (0 à 1) : les pièces d'une même famille arrivent et partent l'une après l'autre
// le tour commence au coin avant droit (celui que vise la caméra) et file d'abord le long du pignon droit, la façade vient en dernier
const ang = (x: number, z: number) => ((((0.5191 - Math.atan2(z, x)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);

// ── toit : surface, dessous (chevrons), arêtiers et faîtage en boudins, 瓦當, bêtes, 鴟吻, clochettes ──
type RoofSpec = { hw: number; hd: number; H: number; q: number; lift: number; sw: number; y: number; beasts: number; gold: number; mk: number; chi: number };
type RoofParts = { surf: Part; under: Part | null; ridges: Part | null; ends: Part | null; beasts: Part | null; gold: Part | null; lines: number[] };
const buildRoof = (r: RoofSpec): RoofParts => {
  const ridges = new Pile(), ends = new Pile(), beasts = new Pile(), gold = new Pile(), under = new Pile();
  const surf = roofGeom(r.hw, r.hd, r.H, r.q, r.lift, r.sw, r.y, 0);
  under.add(roofGeom(r.hw, r.hd, r.H, r.q, r.lift, r.sw, r.y, 0.1));
  const hy = (x: number, z: number) => r.y + roofHeight(x, z, r.hw, r.hd, r.H, r.q, r.lift, r.sw);
  const rr = 0.04 + 0.02 * r.mk, lines: number[] = [];
  const hipPt = (sx: number, sz: number, f: number): [number, number, number] => { const x = sx * (r.hw - f * r.sw), z = sz * (r.hd - f * r.sw); return [x, hy(x, z), z]; };
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    let prev = hipPt(sx, sz, 0);
    for (let i = 1; i <= 28; i++) { const q = hipPt(sx, sz, i / 28); ridges.tube(prev, q, rr); lines.push(...prev, ...q); prev = q; }
  }));
  const full = r.hd - r.sw < 0.06, rx = r.hw - r.sw; // faîtage : seulement tant que le toit est un toit à croupes complet
  if (full && rx > 0.01) {
    for (let i = 0; i < 12; i++) { const a = -rx + (2 * rx * i) / 12, b = -rx + (2 * rx * (i + 1)) / 12; ridges.tube([a, hy(a, 0) + 0.01, 0], [b, hy(b, 0) + 0.01, 0], rr * 1.3); }
    lines.push(-rx, hy(rx, 0) + 0.012, 0, rx, hy(rx, 0) + 0.012, 0);
  }
  const edge = (fx: (t: number) => [number, number], len: number) => {
    const N = Math.round(len / 0.17);
    for (let i = 0; i <= N; i++) { const [x, z] = fx(i / N), hh = 0.045 + 0.02 * r.mk; ends.box(0.07, hh, 0.07, x, hy(x, z) - 0.02 - hh * 0.5, z); }
  };
  edge((t) => [-r.hw + 2 * r.hw * t, r.hd], 2 * r.hw); edge((t) => [-r.hw + 2 * r.hw * t, -r.hd], 2 * r.hw);
  edge((t) => [r.hw, -r.hd + 2 * r.hd * t], 2 * r.hd); edge((t) => [-r.hw, -r.hd + 2 * r.hd * t], 2 * r.hd);
  if (full && r.chi > 0.02) { // 鴟吻 aux extrémités du faîtage
    const kEnd = (0.45 + 0.55 * clamp(r.beasts / 3)) * r.chi;
    [-1, 1].forEach((sg) => beasts.add(chiwen(0.9 * kEnd * (0.8 + 0.4 * r.mk), sg as 1 | -1, sg * rx, hy(rx, 0) - 0.03)));
  }
  for (let i = 0; i < 6; i++) { // 仙人 + 走獸 : ils montent un à un sur chaque arêtier
    const wgt = clamp(r.beasts + 1 - i); if (wgt <= 0.02 || r.beasts < 0.02) continue;
    const f = 0.07 + 0.105 * i, dy = (1 - wgt) * 0.8;
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
      const [x, y, z] = hipPt(sx, sz, f), bs = (i === 0 ? 0.075 : 0.065) * wgt, yy = y + dy;
      beasts.box(bs * 1.2, bs * 0.45, bs * 1.2, x, yy + rr * 0.6, z);
      beasts.cyl(bs * 0.1, bs * 0.45, bs * 1.8, x, yy + rr * 0.6 + bs * 0.45, z, 8);
      beasts.box(bs * 0.5, bs * 0.4, bs * 0.9, x + sx * bs * 0.15, yy + rr * 0.6 + bs * 1.5, z + sz * bs * 0.15);
    }));
  }
  if (r.gold > 0.02) [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    const [x, y, z] = hipPt(sx, sz, 0), gk = r.gold;
    gold.cyl(0.011 * gk, 0.011 * gk, 0.14 * gk, x, y - 0.14 * gk, z, 6);
    gold.cyl(0.0, 0.05 * gk, 0.08 * gk, x, y - 0.22 * gk, z, 8);
  }));
  return { surf, under: under.build(), ridges: ridges.build(), ends: ends.build(), beasts: beasts.build(), gold: gold.build(), lines };
};

// ── l'état du hall à un instant : proportions lentes `p`, époques de départ `A` et d'arrivée `B`, transformation en cours
// (`i` de 0 à 2, avancement `k`), avancement continu `prog` (0 à 3), construction du Tang `intro` (0 à 1) ──
export type HallState = { p: HallParams; A: HallParams; B: HallParams; i: number; k: number; prog: number; intro: number; t: number; shine: number; light: Light };

export const Hall: React.FC<{ s: HallState }> = ({ s }) => {
  const { p, A, B, i: ti, k, prog, intro, t } = s;
  HALL_TIME.t = t; HALL_TIME.shine = s.shine; HALL_TIME.sun = s.light.sun; HALL_TIME.tint = s.light.tint; HALL_TIME.amb = s.light.amb;
  const built = useMemo(() => {
    const stone = new Pile(), marble = new Pile(), cols = new Pile(), brA = new Pile(), brB = new Pile(), walls = new Pile(), doors = new Pile();
    const band = new Pile(), gold = new Pile(), plaque = new Pile(), storey = new Pile(), storeyBand = new Pile();
    const nTier = clamp(p.tiers, 1, 3), mk = clamp(p.marble), hx = hxOf(prog), I = intro, building = I < 1;
    const k3 = clamp(prog - 2); // avancement de Ming → Qing (étage)

    // ── socle : il pousse du sol à l'ouverture ; terrasses empilées, 須彌座 quand le marbre arrive ; balustres qui tombent en cercle
    const gp = building ? sm(0, 0.28, I) : 1;
    const tw = [1, clamp(nTier - 1), clamp(nTier - 2)], base = (p.platH * gp) / nTier;
    const beyond = [tw[1] + tw[2], tw[2], 0], platTop = p.platH * gp;
    const balustrade = (ex: number, ez: number, yB: number, kk: number) => {
      if (kk < 0.04 || gp < 0.95) return;
      const bh = 0.2, n = (len: number) => Math.max(2, Math.round(len / 0.55));
      const wOf = (px: number, pz: number) => sm(0, 1, clamp(kk * 1.8 - ang(px, pz) * 0.8));
      const along = (len: number, fix: number, isX: boolean) => {
        const N = n(len);
        for (let i = 0; i <= N; i++) {
          const t = -len / 2 + (len * i) / N, big = i === 0 || i === N;
          const px0 = isX ? t : fix, pz0 = isX ? fix : t, w = big ? 0.1 : 0.06, wp = wOf(px0, pz0), dy = (1 - wp) * 0.5, od = (1 - wp) * 1.6 * Math.sign(fix), px = px0 + (isX ? 0 : od), pz = pz0 + (isX ? od : 0);
          if (wp > 0.02) {
            marble.box(w, bh, w, px, yB + dy, pz);
            marble.box(w * 1.5, 0.035, w * 1.5, px, yB + bh + dy, pz);
            if (!big && i % 3 === 1 && fix !== 0) {
              const out = Math.sign(fix) * 0.12;
              marble.box(isX ? 0.05 : 0.2, 0.05, isX ? 0.2 : 0.05, px + (isX ? 0 : out), yB - 0.07 + dy, pz + (isX ? out : 0));
            }
          }
          if (i < N) {
            const mid = t + len / (2 * N), sl = len / N - 0.08, mx0 = isX ? mid : fix, mz0 = isX ? fix : mid, wm = wOf(mx0, mz0), dm = (1 - wm) * 0.5, om = (1 - wm) * 1.6 * Math.sign(fix), mx = mx0 + (isX ? 0 : om), mz = mz0 + (isX ? om : 0);
            if (wm > 0.02) {
              marble.box(isX ? sl : 0.035, bh * 0.62, isX ? 0.035 : sl, mx, yB + 0.03 + dm, mz);
              marble.box(isX ? sl : 0.05, 0.025, isX ? 0.05 : sl, mx, yB + bh * 0.9 + dm, mz);
            }
          }
        }
      };
      along(2 * ex, ez, true); along(2 * ex, -ez, true); along(2 * ez, ex, false); along(2 * ez, -ex, false);
    };
    let y = 0;
    for (let i = 0; i < 3; i++) {
      const h = base * tw[i]; if (h < 1e-3) continue;
      const m = 0.55 + 0.5 * beyond[i], mat = mk > 0.5 ? marble : stone;
      if (mk > 0.5) {
        mat.box(hx * 2 + 2 * m + 0.1, h * 0.28, HD * 2 + 2 * m + 0.1, 0, y, 0);
        mat.box(hx * 2 + 2 * m - 0.02, h * 0.44, HD * 2 + 2 * m - 0.02, 0, y + h * 0.28, 0);
        mat.box(hx * 2 + 2 * m + 0.08, h * 0.28, HD * 2 + 2 * m + 0.08, 0, y + h * 0.72, 0);
        balustrade(hx + m - 0.07, HD + m - 0.07, y + h, mk * tw[i]);
      } else {
        mat.box(hx * 2 + 2 * m + 0.06, h * 0.3, HD * 2 + 2 * m + 0.06, 0, y, 0);
        mat.box(hx * 2 + 2 * m, h * 0.7, HD * 2 + 2 * m, 0, y + h * 0.3, 0);
      }
      for (let st = 0; st < 3; st++) mat.box(1.3, (h * (3 - st)) / 3, 0.2, 0, y, HD + m + 0.1 + 0.2 * st);
      if (mk > 0.5) { mat.box(0.5, h * 0.94, 0.62, 0, y, HD + m + 0.31); [-1, 1].forEach((sg) => mat.box(0.06, h * 0.85, 0.62, sg * 0.68, y, HD + m + 0.31)); }
      y += h;
    }

    // ── piliers : à l'ouverture ils tombent du ciel en cercle ; de Song à Ming chacun est remplacé à son tour (l'ancien monte
    // et disparaît, le nouveau plus épais descend), les uns après les autres tout autour ; les pignons portent les colonnes d'angle
    const y0 = platTop, y1 = y0 + p.colH, sockH = 0.06 + 0.04 * mk;
    const colX = [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5, ...(prog >= 2 ? [-4.5, 4.5] : [])];
    [-hx, hx].forEach((x) => { if (!colX.some((c) => Math.abs(c - x) < 1e-3)) colX.push(x); });
    colX.sort((u, v) => u - v);
    const ring: [number, number][] = [];
    colX.forEach((x) => { ring.push([x, -HD]); ring.push([x, HD]); });
    [-1, 0, 1].forEach((z) => { ring.push([-hx, z]); ring.push([hx, z]); });
    ring.forEach(([x, z]) => {
      const a = ang(x, z);
      let yOff = 0, R = p.colR, hideAll = false, rad = 0;
      if (building) { const ph = clamp(((I - 0.12) / 0.5) * 1.5 - a * 0.5); if (ph <= 0) hideAll = true; yOff = ph < 0.8 ? 3.0 * (1 - Math.pow(ph / 0.8, 2)) : 0.12 * Math.sin((Math.PI * (ph - 0.8)) / 0.2); }
      if (ti === 0 && k > 0 && k < 1) {
        const ph = clamp(k * 1.7 - a * 0.7);
        // l'ancienne colonne s'en va vers l'extérieur en s'effaçant, la nouvelle (plus épaisse) arrive de l'extérieur
        if (ph < 0.5) { const u = easeIO(ph / 0.5); rad = u * 1.7; R = lerp(A.colR, A.colR * 0.25, u); }
        else { const x = clamp((ph - 0.5) / 0.5), u = 1 + 2 * Math.pow(x - 1, 3) + Math.pow(x - 1, 2); rad = (1 - u) * 1.7; R = lerp(B.colR * 0.25, B.colR, clamp(u)); }
      }
      if (hideAll) return;
      const ox = Math.abs(x) >= hx - 1e-3 ? Math.sign(x) : 0, oz = Math.abs(z) >= HD - 1e-3 ? Math.sign(z) : 0, on = Math.hypot(ox, oz) || 1;
      stone.cyl(p.colR * 1.32, p.colR * 1.45, sockH, x, y0, z, 18);
      cols.cyl(R * (1 - 6 * p.entasis), R, p.colH - sockH, x + (ox / on) * rad, y0 + sockH + yOff, z + (oz / on) * rad, 18);
    });
    // murs, pignons, façade percée de trois travées de portes ; ils montent du socle à l'ouverture
    const gw = building ? sm(0.4, 0.62, I) : 1, hW = p.colH * gw;
    walls.box(hx * 2, hW, 0.12, 0, y0, -HD); walls.box(0.12, hW, HD * 2, -hx, y0, 0); walls.box(0.12, hW, HD * 2, hx, y0, 0);
    [-1, 1].forEach((sg) => walls.box(hx - 1.5, hW, 0.12, (sg * (hx + 1.5)) / 2, y0, HD));
    for (let i = -1; i <= 1; i++) doors.box(0.97, hW * 0.9, 0.1, i, y0 + 0.02, HD + 0.02);
    // 匾額 : plaque qui descend du ciel au-dessus de la porte centrale quand la peinture arrive
    const wp = sm(0.12, 0.4, p.paint), pw = 0.95, ph2 = 0.3, py = y1 - 0.4 - 0.08 * mk, pz = (1 - wp) * 3.0;
    if (wp > 0.02 && gw > 0.95) {
      plaque.box(pw, ph2, 0.05, 0, py, HD + 0.12 + pz);
      gold.box(pw + 0.06, 0.035, 0.07, 0, py + ph2 - 0.03, HD + 0.12 + pz); gold.box(pw + 0.06, 0.035, 0.07, 0, py, HD + 0.12 + pz);
      [-1, 1].forEach((sg) => gold.box(0.035, ph2, 0.07, sg * (pw / 2 + 0.015), py, HD + 0.12 + pz));
    }

    // ── poutres (大額枋 + 小額枋), 雀替 qui arrivent de l'extérieur l'un après l'autre
    const dropL = building ? (1 - sm(0.5, 0.68, I)) * 2 : 0;
    const lintel = (len: number, x: number, z: number, along: 'x' | 'z', yy: number, h: number) =>
      (along === 'x' ? band.box(len, h, 0.13, x, yy + dropL, z) : band.box(0.13, h, len, x, yy + dropL, z));
    const dbl = clamp((p.paint - 0.12) / 0.43);
    if (!building || I > 0.5) [[hx * 2, 0, -HD, 'x'], [hx * 2, 0, HD, 'x'], [HD * 2, -hx, 0, 'z'], [HD * 2, hx, 0, 'z']].forEach(([len, x, z, al]) => {
      lintel(len as number, x as number, z as number, al as 'x' | 'z', y1, 0.1);
      if (dbl > 0.02) lintel(len as number, x as number, z as number, al as 'x' | 'z', y1 - 0.13 * dbl, 0.09 * dbl);
    });
    ring.forEach(([x, z], j) => {
      const front = Math.abs(z) === HD, kk = clamp(dbl * 1.7 - 0.7 * (j / ring.length));
      if (kk < 0.05 || building) return;
      const out = (1 - sm(0, 1, kk)) * 1.7;
      [-1, 1].forEach((sg) => {
        const L = 0.34, yy = y1 - 0.26;
        if (front) brA.box(L, 0.14, 0.045, x + sg * (L / 2 + p.colR * 0.7), yy, z + Math.sign(z) * (0.06 + out));
        else brA.box(0.045, 0.14, L, x + Math.sign(x) * (0.06 + out), yy, z + sg * (L / 2 + p.colR * 0.7));
      });
    });

    // ── consoles 斗拱 : à l'ouverture elles s'assemblent depuis leur vue éclatée ; de Tang à Song chaque jeu s'ouvre (bras vers
    // l'extérieur, blocs qui montent) puis se referme en plus petit, tour à tour autour du bâtiment, et les jeux intercalaires tombent
    const sH = p.brH, yb = y1 + 0.1, ang2 = clamp(1.5 - p.brSets * 0.35);
    const exOf = (x: number, z: number): { ex: number; drop: number } | null => {
      const a = ang(x, z);
      let ex = 0, drop = 0;
      if (building) { const ph = clamp(((I - 0.5) / 0.3) * 1.5 - a * 0.5); if (ph <= 0) return null; ex += 1 - easeIO(ph); drop += (1 - easeIO(ph)) * 1.0; }
      if (ti === 1 && k > 0 && k < 1) ex += Math.sin(Math.PI * clamp(k * 1.7 - a * 0.7));
      return { ex, drop };
    };
    const set = (x: number, z: number, along: 'x' | 'z', out: 1 | -1, kScale: number, dropExtra = 0) => {
      const w = sH * kScale; if (w < 0.01) return;
      const e = exOf(x, z); if (!e) return;
      const yaw = along === 'x' ? (out > 0 ? 0 : Math.PI) : (out > 0 ? Math.PI / 2 : -Math.PI / 2);
      const arrive = dropExtra + e.drop; // les pièces qui arrivent viennent de l'extérieur, un peu plus haut
      // `place` : démontage (les bras sortent vers l'extérieur, les blocs s'écartent et sortent en descendant), arrivée, orientation
      const place = (pile: Pile, g: THREE.BufferGeometry, dx: number, dy: number, dz: number) => {
        const isArm = pile === brA;
        g.translate(dx * (isArm ? 1 : 1 + e.ex * 0.9), dy - (isArm ? 0 : e.ex * w * 0.5) + arrive * 0.25, dz + (isArm ? e.ex * w * 1.4 : e.ex * w * 0.8) + arrive * 1.2);
        g.rotateY(yaw); g.translate(x, yb, z);
        pile.parts.push(g);
      };
      const put = (pile: Pile, sx: number, sy: number, sz: number, dx: number, dy: number, dz: number, rx = 0) => {
        const g = new THREE.BoxGeometry(sx, sy, sz);
        if (rx) g.rotateX(rx);
        place(pile, g, dx, dy + sy / 2, dz);
      };
      // 斗 : tronc de pyramide
      const dou = (wt: number, wb: number, h: number, dx: number, dy: number, dz: number) => place(brB, taperGeo(wt, wb, wt, wb, h), dx, dy, dz);
      // bras 栱 : corps + deux bouts amincis (卷殺) ; alongX : le bras court dans le plan du mur, sinon vers l'extérieur
      const gong = (len: number, sy: number, sd: number, dx: number, dy: number, dz: number, alongX: boolean) => {
        const cap = 0.1 * w, body = Math.max(0.01, len - 2 * cap);
        if (alongX) {
          put(brA, body, sy, sd, dx, dy, dz);
          [-1, 1].forEach((sg) => { const g = taperGeo(sy * 0.5, sy, sd * 0.9, sd, cap); g.rotateZ(-sg * Math.PI / 2); place(brA, g, dx + sg * body / 2, dy + sy / 2, dz); });
        } else {
          put(brA, sd, sy, body, dx, dy, dz);
          [-1, 1].forEach((sg) => { const g = taperGeo(sd * 0.9, sd, sy * 0.5, sy, cap); g.rotateX(sg * Math.PI / 2); place(brA, g, dx, dy + sy / 2, dz + sg * body / 2); });
        }
      };
      dou(0.62 * w, 0.5 * w, 0.26 * w, 0, 0, 0);
      gong(1.0 * w, 0.2 * w, 0.4 * w, 0, 0.26 * w, 0, true);
      gong(1.55 * w, 0.2 * w, 0.4 * w, 0, 0.26 * w, 0.58 * w, false);
      dou(0.3 * w, 0.22 * w, 0.16 * w, -0.4 * w, 0.46 * w, 0); dou(0.3 * w, 0.22 * w, 0.16 * w, 0.4 * w, 0.46 * w, 0); dou(0.3 * w, 0.22 * w, 0.16 * w, 0, 0.46 * w, 1.2 * w);
      gong(1.4 * w, 0.2 * w, 0.42 * w, 0, 0.62 * w, 0, true);
      put(brA, 0.34 * w, 0.18 * w, 0.9 * w, 0, 0.62 * w, 0.62 * w);
      dou(0.28 * w, 0.2 * w, 0.16 * w, -0.55 * w, 0.8 * w, 0); dou(0.28 * w, 0.2 * w, 0.16 * w, 0.55 * w, 0.8 * w, 0);
      if (ang2 > 0.05) put(brA, 0.18 * w * ang2, 0.2 * w, 1.7 * w * ang2, 0, 0.1 * w, 0.78 * w * ang2, 0.5);
    };
    if (!building || I > 0.45) {
      ring.forEach(([x, z]) => {
        const front = Math.abs(z) === HD;
        set(x, z, front ? 'x' : 'z', front ? (z > 0 ? 1 : -1) : x > 0 ? 1 : -1, 1);
      });
      const c = p.brSets;
      for (let i = 0; i < 6; i++) {
        const wgt = clamp(c - i), r = (i + 0.5) / c; if (wgt <= 0 || r >= 1) continue;
        const kk = Math.pow(wgt, 0.6) * 0.9, drop = (1 - wgt) * 1.4;
        CS.forEach((cc) => {
          const pw = clamp(hx - (Math.abs(cc) + 0.5) + 1); if (pw <= 0.02) return;
          const x = cc - 0.5 + r; set(x, HD, 'x', 1, kk * pw, drop); set(x, -HD, 'x', -1, kk * pw, drop);
        });
        for (let b = 0; b < BAYS_Z; b++) { const z = -HD + b + r; set(hx, z, 'z', 1, kk, drop); set(-hx, z, 'z', -1, kk, drop); }
      }
    }

    // ── toits : un seul jusqu'aux Ming ; aux Qing le toit Ming s'aplatit en jupe pendant qu'un étage complet, avec son toit,
    // tombe du ciel dessus. Pas de soulèvement du toit : seule la pièce héros bouge.
    const yEave = yb + sH + 0.04;
    const rim = (len: number, x: number, z: number, along: 'x' | 'z') => {
      if (along === 'x') { band.box(len, 0.07, 0.12, x, yEave - 0.07 + dropL, z); gold.box(len, 0.02 * p.gold, 0.14, x, yEave + dropL, z); }
      else { band.box(0.12, 0.07, len, x, yEave - 0.07 + dropL, z); gold.box(0.14, 0.02 * p.gold, len, x, yEave + dropL, z); }
    };
    if (!building || I > 0.5) { rim(hx * 2 + 0.2, 0, -HD - 0.12, 'x'); rim(hx * 2 + 0.2, 0, HD + 0.12, 'x'); rim(HD * 2 + 0.2, -hx - 0.12, 0, 'z'); rim(HD * 2 + 0.2, hx + 0.12, 0, 'z'); }
    // 飛椽 : têtes de chevrons qui saillent sous la rive de l'avant-toit
    if (!building || I > 0.5) {
      const rafter = (x: number, z: number, along: 'x' | 'z') => (along === 'x' ? brA.box(0.04, 0.05, 0.3, x, yEave - 0.17 + dropL, z) : brA.box(0.3, 0.05, 0.04, x, yEave - 0.17 + dropL, z));
      for (let xx = -hx; xx <= hx + 1e-6; xx += 0.14) { rafter(xx, HD + 0.28, 'x'); rafter(xx, -HD - 0.28, 'x'); }
      for (let zz = -HD; zz <= HD + 1e-6; zz += 0.14) { rafter(hx + 0.28, zz, 'z'); rafter(-hx - 0.28, zz, 'z'); }
    }
    let spec1: RoofSpec;
    if (prog <= 2) spec1 = { hw: hx + p.over, hd: HD + p.over, H: p.ridgeH, q: p.curve, lift: p.lift, sw: HD + p.over, y: yEave, beasts: p.beasts, gold: p.gold, mk, chi: 1 };
    else {
      const f = sm(0.05, 0.5, k3), over1 = lerp(A.over, B.over * 0.7 + 0.35, f), hwL = hx + over1, hdL = HD + over1;
      spec1 = { hw: hwL, hd: hdL, H: lerp(A.ridgeH, 0.5, f), q: lerp(A.curve, 1.5, f), lift: lerp(A.lift, B.lift * 0.8, f), sw: lerp(HD + A.over, Math.max(0.15, B.over * 0.7 + 0.25), f),
        y: yEave - 0.02 * f, beasts: A.beasts * (1 - clamp(f * 2)), gold: A.gold * (1 - f) + 0.2, mk, chi: 1 - clamp(f * 2) };
    }
    const roof1 = buildRoof(spec1);
    let roof2: RoofParts | null = null, off2 = 0;
    if (prog > 2) {
      const hwU = hx + B.over, hdU = HD + B.over, storeyH = 1.0;
      roof2 = buildRoof({ hw: hwU, hd: hdU, H: B.ridgeH, q: B.curve, lift: B.lift, sw: hdU, y: yEave + storeyH, beasts: B.beasts * sm(0.78, 1, k3), gold: B.gold, mk: 1, chi: 1 });
      storey.box(hx * 2 + 0.1, storeyH - 0.45, HD * 2 + 0.1, 0, yEave + 0.45, 0);
      storeyBand.box(hx * 2 + 0.16, 0.06, HD * 2 + 0.16, 0, yEave + storeyH - 0.12, 0);
      const u = clamp((k3 - 0.3) / 0.45);
      off2 = 9 * (1 - u * u) + 0.15 * Math.sin(Math.PI * clamp((k3 - 0.75) / 0.1)) * (k3 < 1 ? 1 : 0);
    }
    // poussières d'encre : un anneau qui s'étale et s'efface à chaque pose (colonnes de l'ouverture et de Ming, toit Tang, étage)
    const puffs: { x: number; y: number; z: number; age: number; size: number }[] = [];
    const addPuff = (x: number, yy: number, z: number, age: number, size: number) => { if (age > 0 && age < 1) puffs.push({ x, y: yy, z, age, size }); };
    if (building || t < T_INTRO + 0.5) ring.forEach(([x, z]) => addPuff(x, y0 + 0.03, z, (I - (0.12 + ((1 + ang(x, z) * 0.5) / 1.5) * 0.5)) / 0.14, 0.5));
    if (ti === 0) ring.forEach(([x, z]) => addPuff(x, y0 + 0.03, z, (k - (1 + ang(x, z) * 0.7) / 1.7) / 0.12, 0.45));
    addPuff(0, y0 + 0.03, 0, (t - T_INTRO) / 0.4, 1.6 * (hx + p.over));
    addPuff(0, yEave + 0.05, 0, (t - (T0 + DUR * 2 + 0.75 * DUR)) / 0.45, 1.5 * (hx + p.over));
    // à l'ouverture, le toit Tang descend du ciel en dernier, avec un petit rebond
    const off1 = building ? 5 * (1 - easeIO(clamp((I - 0.72) / 0.28))) : 0;

    const sunH = Math.hypot(s.light.sun[0], s.light.sun[2]) || 1, sv = [-s.light.sun[0] / sunH, -s.light.sun[2] / sunH];
    const hallTop = (y0 + p.colH + 0.4 + sH + p.ridgeH + (prog > 2 ? 1 : 0)), Lh = Math.min(5.5, (hallTop * sunH) / Math.max(s.light.sun[1], 0.22));
    const cast = { x: (sv[0] * Lh) / 2, z: (sv[1] * Lh) / 2, rot: Math.atan2(-sv[1], sv[0]),
      w: Lh + 2 * (hx + p.over) * Math.abs(sv[0]) + 2 * (HD + p.over) * Math.abs(sv[1]), d: 2 * (hx + p.over) * Math.abs(sv[1]) + 2 * (HD + p.over) * Math.abs(sv[0]) };
    return { puffs, cast, shadow: { w: 2 * spec1.hw + 0.3, d: 2 * spec1.hd + 0.3, y: y0 + 0.012 }, roof1, roof2, off1, off2, stone: stone.build(), marble: marble.build(), cols: cols.build(), brA: brA.build(), brB: brB.build(), walls: walls.build(), doors: doors.build(),
      band: band.build(), gold: gold.build(), plaque: plaque.build(), storey: storey.build(), storeyBand: storeyBand.build(),
      eaveY: yEave, ring: [y0 + 0.14, y1 - 0.2] as [number, number], door: [y0 + 0.02, hW * 0.9] as [number, number] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(p), prog.toFixed(4), intro.toFixed(4), t.toFixed(3), s.light.sun[0].toFixed(3)]);

  const e = built.eaveY, g = p.gold;
  const armTint = mix(p.col, p.band, p.paint * 0.85), blockTint = mix(mix(p.col, '#6e4a2e', 0.2), '#3f8f78', p.paint * 0.7);
  const ridgeTint = mix(p.tile, '#d9a73a', g * 0.55), endTint = mix(p.tile, mix('#8a6a52', '#d9a73a', g), 0.55);
  const R = built.roof1, R2 = built.roof2;
  return (
    <group>
      <EaveShadow w={built.shadow.w} d={built.shadow.d} y={built.shadow.y} a={0.3 * (1 - clamp(built.off1 / 3))} />
      <EaveShadow w={built.cast.w} d={built.cast.d} y={0.016} a={0.3 * (1 - 0.55 * s.light.sun[1]) * (1 - clamp(built.off1 / 3))} x={built.cast.x} z={built.cast.z} rot={built.cast.rot} />
      {built.puffs.map((q, n) => <Puff key={n} {...q} />)}
      <Inked geo={built.stone} wash={{ tint: '#d6ccb8', ao: 0 }} w={2.0} />
      <Inked geo={built.marble} wash={{ tint: '#f2efe8', ao: 0 }} w={1.1} />
      <Inked geo={built.cols} wash={{ tint: p.col, kind: 2, gold: g, ring: built.ring, eaveY: e }} w={1.5} />
      <Inked geo={built.walls} wash={{ tint: p.wall, eaveY: e }} w={1.4} />
      <Inked geo={built.doors} wash={{ tint: mix(p.col, '#6b3a28', 0.5), kind: 4, door: built.door, eaveY: e }} w={1.1} />
      <Inked geo={built.plaque} wash={{ tint: mix('#5a3a2a', '#2c4a7c', p.paint), ao: 0, kind: 6, map: plaqueTexture(prog >= 2.5 ? '太和殿' : prog >= 1.5 ? '祾恩殿' : '') }} w={1.0} />
      <Inked geo={built.brA} wash={{ tint: armTint, eaveY: e, ao: 0.3 }} w={0.9} />
      <Inked geo={built.brB} wash={{ tint: blockTint, eaveY: e, ao: 0.3 }} w={0.9} />
      <Inked geo={built.band} wash={{ tint: mix(p.col, p.band, p.paint), tint2: p.col, kind: 1, deco: p.paint, gold: g, eaveY: e }} w={1.0} />
      <Inked geo={built.gold} wash={{ tint: '#deab45', kind: 5, ao: 0 }} w={0.8} />
      <group position={[0, built.off1, 0]}>
        <Inked geo={R.under} wash={{ tint: '#8a6a52', ao: 0 }} w={1.4} angle={85} />
        <Inked geo={R.surf} wash={{ tint: p.tile, kind: 3 }} w={2.0} angle={85} extra={R.lines} />
        <Inked geo={R.ridges} wash={{ tint: ridgeTint, ao: 0 }} w={0.9} angle={60} />
        <Inked geo={R.ends} wash={{ tint: endTint, ao: 0 }} w={0.7} />
        <Inked geo={R.beasts} wash={{ tint: ridgeTint, ao: 0 }} w={0.9} angle={40} />
        <Inked geo={R.gold} wash={{ tint: '#deab45', kind: 5, ao: 0 }} w={0.7} />
      </group>
      {R2 && (
        <group position={[0, built.off2, 0]}>
          <Inked geo={built.storey} wash={{ tint: B.wall, eaveY: 99 }} w={1.4} />
          <Inked geo={built.storeyBand} wash={{ tint: B.band, ao: 0 }} w={1.0} />
          <Inked geo={R2.under} wash={{ tint: '#8a6a52', ao: 0 }} w={1.4} angle={85} />
          <Inked geo={R2.surf} wash={{ tint: B.tile, kind: 3 }} w={2.0} angle={85} extra={R2.lines} />
          <Inked geo={R2.ridges} wash={{ tint: mix(B.tile, '#d9a73a', 0.55), ao: 0 }} w={0.9} angle={60} />
          <Inked geo={R2.ends} wash={{ tint: mix(B.tile, mix('#8a6a52', '#d9a73a', 1), 0.55), ao: 0 }} w={0.7} />
          <Inked geo={R2.beasts} wash={{ tint: mix(B.tile, '#d9a73a', 0.55), ao: 0 }} w={0.9} angle={40} />
          <Inked geo={R2.gold} wash={{ tint: '#deab45', kind: 5, ao: 0 }} w={0.7} />
        </group>
      )}
    </group>
  );
};

// ombre douce que le toit jette sur le socle (rectangle aux bords fondus, de la taille du toit)
let shadowTex: THREE.CanvasTexture | null = null;
const shadowTexture = () => {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.filter = 'blur(10px)'; g.fillStyle = 'rgba(30,24,20,1)'; g.fillRect(22, 22, 84, 84);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
};
const EaveShadow: React.FC<{ w: number; d: number; y: number; a: number; x?: number; z?: number; rot?: number }> = ({ w, d, y, a, x = 0, z = 0, rot = 0 }) => (
  <mesh rotation={[-Math.PI / 2, 0, rot]} position={[x, y, z]} renderOrder={1}>
    <planeGeometry args={[w, d]} />
    <meshBasicMaterial map={shadowTexture()} transparent opacity={a} depthWrite={false} />
  </mesh>
);
// anneau de poussière d'encre : s'étale et s'efface (age de 0 à 1)
let ringTex: THREE.CanvasTexture | null = null;
const ringTexture = () => {
  if (ringTex) return ringTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!, rg = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  rg.addColorStop(0, 'rgba(40,34,30,0)'); rg.addColorStop(0.55, 'rgba(40,34,30,0.05)'); rg.addColorStop(0.78, 'rgba(40,34,30,0.55)'); rg.addColorStop(1, 'rgba(40,34,30,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  ringTex = new THREE.CanvasTexture(c);
  return ringTex;
};
const Puff: React.FC<{ x: number; y: number; z: number; age: number; size: number }> = ({ x, y, z, age, size }) => {
  const sz = size * (0.45 + age * 1.3);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]} renderOrder={3}>
      <planeGeometry args={[sz, sz]} />
      <meshBasicMaterial map={ringTexture()} transparent opacity={Math.pow(1 - age, 1.6) * 0.6} depthWrite={false} />
    </mesh>
  );
};

// socle d'encre sous le bâtiment
export const InkShadow: React.FC<{ size: number }> = ({ size }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
    <planeGeometry args={[size, size * 0.7]} />
    <meshBasicMaterial map={wash()} transparent depthWrite={false} />
  </mesh>
);

// caméra : projection parallèle (comme les dessins à la règle 界畫) ; `zoom` en pixels par unité ; `target` = point visé (monde)
export const OrbitCamera: React.FC<{ angle: number; elev: number; target: [number, number, number]; zoom: number }> = ({ angle, elev, target, zoom }) => {
  const { camera } = useThree();
  const cam = camera as THREE.OrthographicCamera, D = 80, [tx, ty, tz] = target;
  cam.position.set(tx + Math.sin(angle) * D * Math.cos(elev), ty + Math.sin(elev) * D, tz + Math.cos(angle) * D * Math.cos(elev));
  cam.up.set(0, 1, 0); cam.zoom = zoom; cam.near = 1; cam.far = 300;
  cam.lookAt(tx, ty, tz); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  return null;
};
