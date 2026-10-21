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
import { HallParams } from './params';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(k)).getHexString();

export const BAYS_X = 7, BAYS_Z = 4, HW = BAYS_X / 2, HD = BAYS_Z / 2;

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
  const d = Math.max(0, Math.min(hw - Math.abs(x), hd - Math.abs(z))), r = Math.min(1, d / slopeW);
  const w = Math.max(Math.pow(Math.abs(x) / hw, 8), Math.pow(Math.abs(z) / hd, 8));
  return H * Math.pow(r, q) + lift * w * Math.pow(1 - r, 3);
}
function roofGeom(hw: number, hd: number, H: number, q: number, lift: number, slopeW: number, y: number, drop = 0) {
  const nx = 88, nz = 52, pos: number[] = [], idx: number[] = [], uv: number[] = [];
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
uniform float uEaveY; uniform float uAO; uniform vec2 uRing;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ return 0.5 * vn(p) + 0.25 * vn(p * 2.03) + 0.125 * vn(p * 4.01) + 0.0625 * vn(p * 8.0); }
void main(){
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float shade = 0.80 + 0.20 * max(dot(n, normalize(vec3(-0.35, 0.85, 0.45))), 0.0);
  float gran = 0.9 + 0.2 * fbm(vW * 3.1);
  vec3 col = uPaper * uTint * gran * shade;
  bool side = abs(n.y) < 0.5;
  if (uKind > 2.5) {
    float rib = 0.5 + 0.5 * cos(6.2832 * vUv.x / 2.0);
    col *= (0.92 + 0.08 * rib) * (0.97 + 0.03 * cos(6.2832 * vUv.y / 6.0));
  } else if (uKind > 0.5 && uKind < 1.5 && side) {
    float along = abs(n.z) > 0.5 ? vW.x : vW.z, u = fract(along / 1.0);
    vec3 dec = col;
    if (u < 0.1 || u > 0.9) dec = uPaper * uTint2 * gran * shade;
    if (abs(u - 0.5) < 0.2) dec = mix(dec, uPaper * gran, 0.45);
    float gl = min(min(abs(u - 0.1), abs(u - 0.9)), abs(abs(u - 0.5) - 0.2));
    dec = mix(dec, uPaper * uGold * shade, (1.0 - smoothstep(0.005, 0.014, gl)) * uGoldAmt);
    col = mix(col, dec, uDeco);
  } else if (uKind > 1.5 && uKind < 2.5) {
    float r = min(abs(vW.y - uRing.x), abs(vW.y - uRing.y));
    col = mix(col, uPaper * uGold * shade, (1.0 - smoothstep(0.02, 0.04, r)) * uGoldAmt);
  }
  float ao = (side && uKind < 2.5) ? smoothstep(uEaveY - 1.1, uEaveY, vW.y) * uAO : 0.0;
  col *= mix(vec3(1.0), vec3(0.78, 0.68, 0.6), ao);
  gl_FragColor = vec4(col, 1.0);
}`;

export type Wash = { tint: string; tint2?: string; kind?: 0 | 1 | 2 | 3; deco?: number; gold?: number; ao?: number; eaveY?: number; ring?: [number, number] };
const INK = '#1a1613';
// un maillage en lavis + ses arêtes vives en traits d'encre (w : épaisseur en pixels, 0 : pas de trait)
const Inked: React.FC<{ geo: Part | null; wash: Wash; w?: number; lineColor?: string; angle?: number; extra?: number[] }> = ({ geo, wash: W, w = 1.4, lineColor = INK, angle = 28, extra }) => {
  const { size, viewport } = useThree();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
    uniforms: { uTint: { value: new THREE.Color() }, uTint2: { value: new THREE.Color() }, uPaper: { value: PAPER }, uGold: { value: new THREE.Color(0.87, 0.67, 0.27) },
      uKind: { value: 0 }, uDeco: { value: 0 }, uGoldAmt: { value: 0 }, uEaveY: { value: 99 }, uAO: { value: 0.22 }, uRing: { value: new THREE.Vector2(-99, -99) } },
  }), []);
  const lm = useMemo(() => new LineMaterial({ color: new THREE.Color(lineColor).getHex(), linewidth: w, transparent: true, opacity: 0.92, depthWrite: false }), [lineColor, w]);
  const u = mat.uniforms;
  u.uTint.value.set(W.tint); u.uTint2.value.set(W.tint2 ?? W.tint); u.uKind.value = W.kind ?? 0; u.uDeco.value = W.deco ?? 0; u.uGoldAmt.value = W.gold ?? 0;
  u.uAO.value = W.ao ?? 0.22; u.uEaveY.value = W.eaveY ?? 99; u.uRing.value.set(...(W.ring ?? [-99, -99]));
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

// ── le hall
export const Hall: React.FC<{ p: HallParams }> = ({ p }) => {
  const built = useMemo(() => {
    const stone = new Pile(), marble = new Pile(), cols = new Pile(), br = new Pile(), walls = new Pile(), doors = new Pile();
    const band = new Pile(), gold = new Pile(), under = new Pile(), beasts = new Pile();
    const nTier = clamp(p.tiers, 1, 3);

    // socle : terrasses empilées, la plus haute porte le hall ; escalier central ; balustrade de marbre
    const tw = [1, clamp(nTier - 1), clamp(nTier - 2)], base = p.platH / nTier;
    let y = 0; const tops: number[] = [];
    const beyond = [tw[1] + tw[2], tw[2], 0];
    for (let i = 0; i < 3; i++) {
      const h = base * tw[i]; if (h < 1e-3) { tops.push(y); continue; }
      const m = 0.55 + 0.5 * beyond[i], mat = p.marble > 0.5 ? marble : stone;
      mat.box(HW * 2 + 2 * m, h, HD * 2 + 2 * m, 0, y, 0);
      // escalier central devant la terrasse : trois marches
      for (let s = 0; s < 3; s++) mat.box(1.2, (h * (3 - s)) / 3, 0.2, 0, y, HD + m + 0.1 + 0.2 * s);
      y += h; tops.push(y);
    }
    const topM = 0.55 + 0.5 * beyond[Math.min(2, Math.max(0, Math.ceil(nTier) - 1))];
    const platTop = p.platH;
    if (p.marble > 0.6) { // balustrade : lisse + balustres
      const k = clamp((p.marble - 0.6) / 0.4), bh = 0.2 * k, ex = HW + topM - 0.06, ez = HD + topM - 0.06;
      marble.box(2 * ex, 0.03 * k, 0.05, 0, platTop + bh, ez); marble.box(2 * ex, 0.03 * k, 0.05, 0, platTop + bh, -ez);
      marble.box(0.05, 0.03 * k, 2 * ez, ex, platTop + bh, 0); marble.box(0.05, 0.03 * k, 2 * ez, -ex, platTop + bh, 0);
      for (let i = 0; i <= 12; i++) { const x = -ex + (2 * ex * i) / 12; marble.box(0.06, bh, 0.06, x, platTop, ez); marble.box(0.06, bh, 0.06, x, platTop, -ez); }
      for (let j = 1; j < 8; j++) { const z = -ez + (2 * ez * j) / 8; marble.box(0.06, bh, 0.06, ex, platTop, z); marble.box(0.06, bh, 0.06, -ex, platTop, z); }
    }

    // piliers, murs, portes
    const y0 = platTop, y1 = y0 + p.colH, rTop = p.colR * (1 - 6 * p.entasis);
    const xs = Array.from({ length: BAYS_X + 1 }, (_, i) => -HW + i), zs = Array.from({ length: BAYS_Z + 1 }, (_, j) => -HD + j);
    const ring: [number, number][] = [];
    xs.forEach((x) => { ring.push([x, -HD]); ring.push([x, HD]); });
    zs.slice(1, -1).forEach((z) => { ring.push([-HW, z]); ring.push([HW, z]); });
    ring.forEach(([x, z]) => cols.cyl(rTop, p.colR, p.colH, x, y0, z));
    walls.box(HW * 2, p.colH, 0.12, 0, y0, -HD); walls.box(0.12, p.colH, HD * 2, -HW, y0, 0); walls.box(0.12, p.colH, HD * 2, HW, y0, 0);
    walls.box(1.0, p.colH, 0.12, -HW + 0.5, y0, HD); walls.box(1.0, p.colH, 0.12, HW - 0.5, y0, HD);
    walls.box(2.0, p.colH, 0.12, -HW + 2, y0, HD); walls.box(2.0, p.colH, 0.12, HW - 2, y0, HD);
    for (let i = 2; i <= 4; i++) { // trois travées de portes : vantaux et traverses claires
      const cx = -HW + i + 0.5;
      doors.box(0.94, p.colH * 0.9, 0.1, cx, y0 + 0.02, HD + 0.02);
      band.box(0.98, 0.05, 0.12, cx, y0 + p.colH * 0.62, HD + 0.03);
    }

    // poutre sur piliers et frise : bois nu à l'ouest, peintes ensuite
    const lintel = (len: number, x: number, z: number, along: 'x' | 'z') =>
      (along === 'x' ? band.box(len, 0.1, 0.13, x, y1, z) : band.box(0.13, 0.1, len, x, y1, z));
    lintel(HW * 2, 0, -HD, 'x'); lintel(HW * 2, 0, HD, 'x'); lintel(HD * 2, -HW, 0, 'z'); lintel(HD * 2, HW, 0, 'z');

    // consoles : jeux sur chaque pilier + jeux intercalaires qui se divisent quand leur nombre augmente
    const s = p.brH, yb = y1 + 0.1;
    const set = (x: number, z: number, along: 'x' | 'z', out: 1 | -1, k: number) => {
      const w = s * k; if (w < 0.01) return;
      const X = (a: number, b: number, c: number) => (along === 'x' ? [a, b, c] : [c, b, a]);
      const put = (dx: number, dy: number, dz: number, sx: number, sy: number, sz: number) => {
        const [bx, by, bz] = X(sx, sy, sz); const [ox, , oz] = X(dx, 0, dz * out);
        br.box(bx, by, bz, x + ox, yb + dy, z + oz);
      };
      put(0, 0, 0, 0.55 * w, 0.28 * w, 0.55 * w);
      put(0, 0.28 * w, 0, 1.0 * w, 0.22 * w, 0.42 * w);
      put(0, 0.28 * w, 0.55 * w, 0.4 * w, 0.22 * w, 1.5 * w);
      put(0, 0.5 * w, 0, 0.5 * w, 0.2 * w, 0.5 * w);
      put(0, 0.7 * w, 0, 1.4 * w, 0.22 * w, 0.46 * w);
    };
    ring.forEach(([x, z]) => {
      const front = Math.abs(z) === HD;
      set(x, z, front ? 'x' : 'z', front ? (z > 0 ? 1 : -1) : x > 0 ? 1 : -1, 1);
    });
    const c = p.brSets;
    for (let i = 0; i < 6; i++) {
      const wgt = clamp(c - i), r = (i + 0.5) / c; if (wgt <= 0 || r >= 1) continue;
      const k = Math.pow(wgt, 0.6) * 0.9;
      for (let b = 0; b < BAYS_X; b++) { const x = -HW + b + r; set(x, HD, 'x', 1, k); set(x, -HD, 'x', -1, k); }
      for (let b = 0; b < BAYS_Z; b++) { const z = -HD + b + r; set(HW, z, 'z', 1, k); set(-HW, z, 'z', -1, k); }
    }

    // toit(s)
    const yEave = yb + s + 0.04, t2 = clamp(p.tier2), U = 1.0 * t2;
    // poutre de rive peinte (frise sous l'avant-toit) et dorure
    const rim = (len: number, x: number, z: number, along: 'x' | 'z') => {
      if (along === 'x') { band.box(len, 0.07, 0.12, x, yEave - 0.07, z); gold.box(len, 0.02 * p.gold, 0.14, x, yEave - 0.0, z); }
      else { band.box(0.12, 0.07, len, x, yEave - 0.07, z); gold.box(0.14, 0.02 * p.gold, len, x, yEave - 0.0, z); }
    };
    rim(HW * 2 + 0.2, 0, -HD - 0.12, 'x'); rim(HW * 2 + 0.2, 0, HD + 0.12, 'x'); rim(HD * 2 + 0.2, -HW - 0.12, 0, 'z'); rim(HD * 2 + 0.2, HW + 0.12, 0, 'z');

    const upY = yEave + U;
    const hwU = HW + p.over, hdU = HD + p.over;
    const upper = roofGeom(hwU, hdU, p.ridgeH, p.curve, p.lift, hdU, upY, 0);
    under.add(roofGeom(hwU, hdU, p.ridgeH, p.curve, p.lift, hdU, upY, 0.1));
    let skirt: Part | null = null;
    if (t2 > 0.02) { // étage supérieur et jupe du premier toit
      const m = lerp(0.2, p.over + 0.55, t2), hwL = HW + m, hdL = HD + m, sk = 0.42 * t2;
      skirt = roofGeom(hwL, hdL, sk, 1.2, p.lift * 0.5, Math.max(0.15, m - 0.1), yEave - 0.02, 0);
      under.add(roofGeom(hwL, hdL, sk, 1.2, p.lift * 0.5, Math.max(0.15, m - 0.1), yEave - 0.02, 0.09));
      walls.box(HW * 2 + 0.1, Math.max(0, U - 0.42 * t2 * 0.9), HD * 2 + 0.1, 0, yEave + 0.42 * t2 * 0.9, 0);
      band.box(HW * 2 + 0.16, 0.06, HD * 2 + 0.16, 0, yEave + U - 0.12, 0);
    }

    // bêtes de faîte (croupes) et becs de faîtage
    const hipY = (x: number, z: number) => upY + roofHeight(x, z, hwU, hdU, p.ridgeH, p.curve, p.lift, hdU);
    for (let i = 0; i < 5; i++) {
      const wgt = clamp(p.beasts - i); if (wgt <= 0) continue;
      const f = 0.1 + 0.12 * i, bs = 0.13 * wgt;
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
        const x = sx * (hwU - f * hdU), z = sz * hdU * (1 - f);
        beasts.box(bs, bs * 1.5, bs, x, hipY(x, z) - 0.01, z);
      }));
    }
    const kEnd = 0.3 + 0.7 * clamp(p.beasts / 3);
    [-1, 1].forEach((sx) => {
      const x = sx * (hwU - hdU); beasts.box(0.2 * kEnd, 0.5 * kEnd, 0.2 * kEnd, x, hipY(x, 0) - 0.02, 0);
    });
    // la dorure se pose sur les bêtes et les angles des avant-toits
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
      const x = sx * hwU, z = sz * hdU; gold.box(0.1 * p.gold, 0.1 * p.gold, 0.1 * p.gold, x, hipY(x, z) - 0.04, z);
    }));

    // arêtiers et faîtage : tracés à la main sur la surface (les arêtes du maillage seraient pointillées)
    const roofLines: number[] = [];
    const seg = (a: [number, number, number], b: [number, number, number]) => roofLines.push(...a, ...b);
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
      let prev: [number, number, number] | null = null;
      for (let i = 0; i <= 28; i++) {
        const f = i / 28, x = sx * (hwU - f * hdU), z = sz * hdU * (1 - f), q: [number, number, number] = [x, hipY(x, z) + 0.012, z];
        if (prev) seg(prev, q);
        prev = q;
      }
    }));
    seg([-(hwU - hdU), hipY(hwU - hdU, 0) + 0.012, 0], [hwU - hdU, hipY(hwU - hdU, 0) + 0.012, 0]);

    return { roofLines, stone: stone.build(), marble: marble.build(), cols: cols.build(), br: br.build(), walls: walls.build(), doors: doors.build(),
      band: band.build(), gold: gold.build(), under: under.build(), beasts: beasts.build(), upper, skirt, eaveY: yEave, ring: [y0 + 0.14, y1 - 0.2] as [number, number] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(p)]);

  const e = built.eaveY, g = p.gold;
  const brTint = mix(p.col, p.band, p.paint * 0.7);
  return (
    <group>
      <Inked geo={built.stone} wash={{ tint: '#d6ccb8', ao: 0 }} w={2.2} />
      <Inked geo={built.marble} wash={{ tint: '#f2efe8', ao: 0 }} w={1.3} />
      <Inked geo={built.cols} wash={{ tint: p.col, kind: 2, gold: g, ring: built.ring, eaveY: e }} w={1.5} />
      <Inked geo={built.walls} wash={{ tint: p.wall, eaveY: e }} w={1.4} />
      <Inked geo={built.doors} wash={{ tint: mix(p.col, '#6b3a28', 0.55), eaveY: e }} w={1.1} />
      <Inked geo={built.br} wash={{ tint: brTint, eaveY: e, ao: 0.3 }} w={1.0} />
      <Inked geo={built.band} wash={{ tint: mix(p.col, p.band, p.paint), tint2: p.col, kind: 1, deco: p.paint, gold: g, eaveY: e }} w={1.0} />
      <Inked geo={built.gold} wash={{ tint: '#deab45', ao: 0 }} w={0.9} />
      <Inked geo={built.under} wash={{ tint: '#8a6a52', ao: 0 }} w={1.6} angle={85} />
      <Inked geo={built.skirt} wash={{ tint: p.tile, kind: 3 }} w={2.2} angle={85} />
      <Inked geo={built.upper} wash={{ tint: p.tile, kind: 3 }} w={2.2} angle={85} extra={built.roofLines} />
      <Inked geo={built.beasts} wash={{ tint: mix(p.tile, '#d9a73a', g * 0.5), ao: 0 }} w={1.2} />
    </group>
  );
};

// socle d'encre sous le bâtiment
export const InkShadow: React.FC<{ size: number }> = ({ size }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
    <planeGeometry args={[size, size * 0.7]} />
    <meshBasicMaterial map={wash()} transparent depthWrite={false} />
  </mesh>
);

// caméra : projection parallèle (comme les dessins à la règle 界畫), tour complet autour du hall ; `zoom` en pixels par unité
export const OrbitCamera: React.FC<{ angle: number; elev: number; target: number; zoom: number }> = ({ angle, elev, target, zoom }) => {
  const { camera } = useThree();
  const cam = camera as THREE.OrthographicCamera, D = 80;
  cam.position.set(Math.sin(angle) * D * Math.cos(elev), target + Math.sin(elev) * D, Math.cos(angle) * D * Math.cos(elev));
  cam.up.set(0, 1, 0); cam.zoom = zoom; cam.near = 1; cam.far = 300;
  cam.lookAt(0, target, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  return null;
};
