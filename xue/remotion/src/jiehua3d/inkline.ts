// Trait d'encre au pinceau pour les traits 3D (界畫) : chaque segment est un ruban tourné vers l'écran, dont la
// largeur (en pixels), la charge d'encre et la fraîcheur varient le long du trait — attaque chargée, plein, sortie
// plus fine et plus sèche (le grain du papier apparaît), encre fraîche plus noire et un peu plus large qui sèche en
// quelques dixièmes de seconde. Projection parallèle : la profondeur sert au test des traits cachés.
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
const FRAG = `uniform vec3 uColor; uniform float uOp;
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
  gl_FragColor = vec4(uColor * (1.0 - 0.35 * vF), clamp(uOp * a * ink, 0.0, 1.0));
}`;

// un segment : départ, arrivée, largeurs (px), charges d'encre (0..1), fraîcheurs (0..1)
export const SEG = 12;
export class InkLines {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  private geo: THREE.InstancedBufferGeometry;
  constructor(color: string, hidden = false) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: 1 }, uRes: { value: new THREE.Vector2(1920, 1080) } },
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
