// Trait d'encre au pinceau pour les traits 3D (界畫) : chaque segment est un ruban tourné vers l'écran, dont la
// largeur (en pixels), la charge d'encre et la fraîcheur varient le long du trait — attaque chargée, plein, sortie
// plus fine et plus sèche (le grain du papier apparaît), encre fraîche plus noire et un peu plus large qui sèche en
// quelques dixièmes de seconde. Mode crayon (pencil) : mine de graphite grise, grain du papier marqué, pression qui
// faiblit aux extrémités, léger tremblé de la main et dépassement aux angles (voir pushPencil).
// La profondeur sert au test des traits cachés (projection parallèle ou perspective).
import * as THREE from 'three';

const VERT = `attribute vec3 aStart; attribute vec3 aEnd; attribute vec2 aW; attribute vec2 aK; attribute vec2 aF;
uniform vec2 uRes;
varying float vK; varying float vF; varying vec2 vScr; varying float vD; varying float vW;
void main(){
  vec4 c0 = projectionMatrix * viewMatrix * vec4(aStart, 1.0), c1 = projectionMatrix * viewMatrix * vec4(aEnd, 1.0);
  vec2 h = uRes * 0.5, s0 = c0.xy / c0.w * h, s1 = c1.xy / c1.w * h, d = s1 - s0;
  float L = length(d);
  vec2 dir = L > 1e-4 ? d / L : vec2(1.0, 0.0), n = vec2(-dir.y, dir.x);
  float t = position.x, w = mix(aW.x, aW.y, t), hw = w * 0.5 + 0.9;      // 0,9 px de plus pour l'antialiasing
  vec2 s = mix(s0, s1, t) + n * position.y * hw + dir * (t * 2.0 - 1.0) * w * 0.35;
  vec4 c = mix(c0, c1, t);
  gl_Position = vec4(s / h * c.w, c.z, c.w);
  vK = mix(aK.x, aK.y, t); vF = mix(aF.x, aF.y, t); vScr = s; vD = position.y * hw; vW = w;
}`;
const FRAG = `uniform vec3 uColor; uniform float uOp; uniform float uPencil;
varying float vK; varying float vF; varying vec2 vScr; varying float vD; varying float vW;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main(){
  float cover = clamp(vW * 0.5 + 0.5 - abs(vD), 0.0, 1.0);                // bord net mais lissé
  float grain = 0.65 * vn(vScr * 0.45) + 0.35 * vn(vScr * 1.3);
  float dry = smoothstep(0.75, 0.35, vK);                                 // sortie du trait : pinceau qui sèche
  float a = cover * mix(1.0, smoothstep(0.28, 0.62, grain), dry * 0.75);
  float ink = (0.7 + 0.3 * vK) * (1.0 + 0.2 * vF);
  vec3 col = uColor * (1.0 - 0.35 * vF);
  if (uPencil > 0.5) {
    // mine sur papier : la poudre de graphite ne se dépose que sur les reliefs des fibres
    float g = 0.5 * vn(vScr * 0.9) + 0.5 * vn(vScr * 2.4);
    a = cover * smoothstep(0.2, 0.8, g * 0.8 + 0.4 * vK);
    ink = 0.35 + 0.65 * vK; col = uColor;
  }
  gl_FragColor = vec4(col, clamp(uOp * a * ink, 0.0, 1.0));
}`;

// un segment : départ, arrivée, largeurs (px), charges d'encre (0..1), fraîcheurs (0..1)
export const SEG = 12;
export class InkLines {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  private geo: THREE.InstancedBufferGeometry;
  constructor(color: string, hidden = false, pencil = false) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: 1 }, uPencil: { value: pencil ? 1 : 0 }, uRes: { value: new THREE.Vector2(1920, 1080) } },
    });
    if (hidden) this.mat.depthFunc = THREE.GreaterDepth;
    this.geo = this.mkGeo(new Float32Array(SEG));
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = hidden ? 3 : 2;
  }
  private mkGeo(data: Float32Array) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const ib = new THREE.InstancedInterleavedBuffer(data, SEG, 1);
    g.setAttribute('aStart', new THREE.InterleavedBufferAttribute(ib, 3, 0));
    g.setAttribute('aEnd', new THREE.InterleavedBufferAttribute(ib, 3, 3));
    g.setAttribute('aW', new THREE.InterleavedBufferAttribute(ib, 2, 6));
    g.setAttribute('aK', new THREE.InterleavedBufferAttribute(ib, 2, 8));
    g.setAttribute('aF', new THREE.InterleavedBufferAttribute(ib, 2, 10));
    g.instanceCount = data.length / SEG;
    return g;
  }
  // géométrie neuve à chaque image : le nombre d'instances change (three.js le garde sinon en cache)
  set(data: number[], op: number, res: THREE.Vector2) {
    this.mesh.visible = data.length > 0 && op > 0.005;
    if (!this.mesh.visible) return;
    this.geo.dispose();
    this.geo = this.mkGeo(new Float32Array(data));
    this.mesh.geometry = this.geo;
    this.mat.uniforms.uOp.value = op;
    this.mat.uniforms.uRes.value.copy(res);
  }
}

// profil d'un coup de pinceau le long du trait (s de 0 à 1) : largeur relative et charge d'encre
export const strokeW = (s: number) => (s < 0.06 ? 0.9 + (0.3 * s) / 0.06 : 1.2 - 0.55 * Math.pow((s - 0.06) / 0.94, 1.4));
export const strokeK = (s: number) => 1 - 0.55 * Math.pow(s, 1.3);

type P3 = [number, number, number];
// ajoute une polyligne (déjà tronquée à la partie tracée) : s0..s1 = fraction de la longueur totale qu'elle couvre,
// wpx = largeur de base en pixels, fresh(s) = fraîcheur de l'encre au point s
export function pushStroke(out: number[], p: P3[], wpx: number, totalLen: number, fresh: (s: number) => number, off: P3 = [0, 0, 0], plain = false) {
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const sa = totalLen > 0 ? acc / totalLen : 0, sb = totalLen > 0 ? (acc + d) / totalLen : 1;
    acc += d;
    const fa = fresh(sa), fb = fresh(sb);
    const wa = plain ? 1 : strokeW(sa), wb = plain ? 1 : strokeW(sb), ka = plain ? 1 : strokeK(sa), kb = plain ? 1 : strokeK(sb);
    out.push(a[0] + off[0], a[1] + off[1], a[2] + off[2], b[0] + off[0], b[1] + off[1], b[2] + off[2],
      wpx * wa * (1 + 0.25 * fa), wpx * wb * (1 + 0.25 * fb), ka, kb, fa, fb);
  }
}

// trait de crayon : la polyligne est redécoupée (pas de 0,6), la main tremble un peu (bruit lissé en 3D, propre à
// chaque trait), le trait dépasse légèrement aux deux bouts comme sur un dessin de construction, la pression monte
// puis retombe ; u : part tracée (0..1)
export function pushPencil(out: number[], p: P3[], wpx: number, u: number, o: { over?: number; jit?: number; seed?: number; k?: number } = {}) {
  const over = o.over ?? 0.25, jit = o.jit ?? 0.035, seed = o.seed ?? 0, kk = o.k ?? 1;
  if (p.length < 2 || u <= 0) return;
  // dépassement aux bouts
  const ext = (a: P3, b: P3): P3 => { const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1; return [a[0] + ((a[0] - b[0]) / d) * over, a[1] + ((a[1] - b[1]) / d) * over, a[2] + ((a[2] - b[2]) / d) * over]; };
  const full: P3[] = [ext(p[0], p[1]), ...p.slice(1, -1), ext(p[p.length - 1], p[p.length - 2])];
  // redécoupage
  const pts: P3[] = [full[0]];
  for (let i = 1; i < full.length; i++) {
    const a = full[i - 1], b = full[i], d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(d / 0.6));
    for (let k = 1; k <= n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]);
  }
  const L = pts.slice(1).reduce((s, b, i) => s + Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1], b[2] - pts[i][2]), 0);
  const wob = (s: number, k: number) => jit * (Math.sin(s * 9.1 + seed * 1.7 + k * 2.3) * 0.6 + Math.sin(s * 23.7 + seed * 3.1 + k * 5.9) * 0.4);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const sa = L > 0 ? acc / L : 0, sb = L > 0 ? (acc + d) / L : 1;
    acc += d;
    if (sa >= u) break;
    const sbb = Math.min(sb, u), f = sb > sa ? (sbb - sa) / (sb - sa) : 1;
    const bb: P3 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    const j = (s: number, P: P3): P3 => [P[0] + wob(s * L, 0), P[1] + wob(s * L, 1), P[2] + wob(s * L, 2)];
    const pr = (s: number) => kk * (0.45 + 0.55 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, s))), 0.6));
    const A = j(sa, a), B = j(sbb, bb);
    out.push(A[0], A[1], A[2], B[0], B[1], B[2], wpx, wpx, pr(sa), pr(sbb), 0, 0);
  }
}
