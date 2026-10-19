// 界畫 « de la feuille au volume » (style Song par défaut), 17 s :
// 1. une feuille de papier montée, vue de face ; l'élévation s'y trace au pinceau, trait par trait : seuls les
//    traits vus de face (ce que cachent la façade et le toit n'est pas dessiné), ramenés dans le plan de la feuille ;
// 2. la caméra glisse latéralement et plonge sur l'angle de la salle : on voit que c'est une feuille plate ;
// 3. de tout près, le maître prolonge les traits : élément après élément, les fuyantes s'allongent depuis la feuille
//    vers l'arrière et emportent chaque trait à sa profondeur ; les traits cachés de face apparaissent ; la feuille
//    s'efface ;
// 4. la caméra recule jusqu'à la vue d'ensemble ; les traits pâlissent en une épure à peine visible ;
// 5. les pièces arrivent de l'extérieur du cadre, déjà peintes en aplats simples, du bas vers le haut et sans se
//    croiser, et se fixent sur l'épure ;
// 6. la peinture apporte les décors : 彩畫 des linteaux, anneaux dorés des colonnes, relief des tuiles, ombre chaude
//    sous les avant-toits, puis les filets d'or des consoles et des linteaux se tracent ;
// 7. la base se fond dans une brume de lavis, la caméra recule et montre la salle dans le paysage (qui a suivi la
//    caméra tout du long) ; le maître inscrit le titre en colonne, puis pose son sceau.
// Les traits sont des coups de pinceau (inkline.ts) : attaque chargée, sortie plus fine et sèche, encre fraîche
// plus noire qui sèche.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { Cam, LineDef, Model, Paint, Part, Solid, Style, V3, buildModel } from './model';
import { PALETTE, Pigment, Timed, applyCam, clamp, ease, easeOut, lerp, mix, mkMat, partial, ptsOf, roofGeo, solidGeo, timeLines } from './Jiehua3D';
import { InkLines, pushStroke } from './inkline';

export const JIEHUA_FEUILLE_SECONDS = 17;
export type JiehuaFeuilleProps = { style: Style };
const W = 1920, H = 1080;
// calendrier (secondes)
const DRAW0 = 0.6, DRAW1 = 3.3;               // élévation tracée sur la feuille
const TURN0 = 3.4, TURN1 = 5.2;               // glissement latéral et plongée sur l'angle
const DEPTH0 = 5.2, DEPTH1 = 7.8;             // fuyantes prolongées, élément après élément (en plan rapproché)
const BACK0 = 7.8, BACK1 = 9.0;               // recul ; les traits pâlissent en épure
const LAND0 = 9.5, LAND1 = 11.8, FLIGHT = 0.8;  // pièces : instants d'emboîtement, durée du voyage
const PAINT0 = 12.0, DECO_DUR = 1.2;          // décors peints
const GOLD0 = 12.4, GOLD1 = 13.7;             // filets d'or
const FAR0 = 13.6, FAR1 = 15.6;               // brume, recul dans le paysage
const INSCR0 = 14.6, T_SEAL = 16.1;           // inscription, sceau
const ZF = 11.5;                              // plan de la feuille : devant tout le bâtiment (marches comprises)
const SHEET_Z = ZF - 0.05;
const HIGH_Y = 8.9;                           // au-dessus : toit et charpente haute
const GHOST = 0.11, GHOST_HIGH = 0.035;       // opacité de l'épure
const WIDTHS = [0.95, 1.6, 2.6];              // largeur de base des coups de pinceau (px en 1080p)
const TITLE = '營造法式殿堂圖';

// ---- caméra ----
const FRONT: Cam = { az: 0, el: 0, zoom: 52, target: [0, 7.2, 0] };
const FRONT2: Cam = { ...FRONT, zoom: 54 };
const NEAR_A: Cam = { az: 0.8, el: 0.26, zoom: 108, target: [6.8, 4.6, 7.5] };    // l'angle avant droit, contre la feuille
const NEAR_B: Cam = { az: 0.72, el: 0.3, zoom: 118, target: [5.8, 6.4, -0.5] };   // on accompagne les traits vers le fond
const WIDE: Cam = { az: 0.56, el: 0.5, zoom: 42, target: [0, 6.0, 0] };            // assez large pour voir les pièces arriver
const WIDE2: Cam = { az: 0.5, el: 0.47, zoom: 46, target: [0, 6.2, 0] };
const FAR: Cam = { az: 0.46, el: 0.4, zoom: 27, target: [-3.5, 7.5, 0] };        // la salle dans le paysage, place pour l'inscription
const camAt = (t: number): Cam => {
  if (t < TURN0) return mix(FRONT, FRONT2, ease(t / TURN0));
  if (t < TURN1) return mix(FRONT2, NEAR_A, ease((t - TURN0) / (TURN1 - TURN0)));
  if (t < BACK0) return mix(NEAR_A, NEAR_B, ease((t - TURN1) / (BACK0 - TURN1)));
  if (t < BACK1) return mix(NEAR_B, WIDE, ease((t - BACK0) / (BACK1 - BACK0)));
  if (t < FAR0) return mix(WIDE, WIDE2, ease((t - BACK1) / (FAR0 - BACK1)));
  return mix(WIDE2, FAR, ease((t - FAR0) / (FAR1 - FAR0)));
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

// ---- traits ----
// depth : fuyante ; front : vue de face (dessinée sur la feuille) ; base : terrasse ; high : toit et charpente haute
type Line = Timed & { depth: boolean; front: boolean; base: boolean; high: boolean; e0: number; e1: number; len: number };
const lenXY = (p: V3[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
const len3 = (p: V3[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1], q[2] - p[i][2]), 0);
const isDepth = (l: LineDef) => { const p = ptsOf(l, 0), L = len3(p); return L > 1e-6 && lenXY(p) < 0.35 * L; };
const frontFirst = (l: LineDef): LineDef => {
  if (typeof l.pts === 'function') return l;
  const p = l.pts;
  return p[0][2] < p[p.length - 1][2] ? { ...l, pts: p.slice().reverse() } : l;
};
// vu de face (regard vers −z) : un point est caché par la façade pleine, ou par le toit si le regard le traverse
const hiddenFront = (m: Model, [x, y, z]: V3) => {
  const f = m.facade;
  if (z < f.z - 0.12 && Math.abs(x) < f.x - 0.05 && y > f.y0 - 0.05 && y < f.y1 + 0.05) return true;
  if (Math.abs(x) > m.X_E || Math.abs(z) > m.Z_E) return false;
  const s0 = y - m.roofY(x, z);
  for (let zz = z + 0.25; zz <= m.Z_E; zz += 0.25) { const s1 = y - m.roofY(x, zz); if (s1 * s0 < 0 && Math.abs(s1) > 0.03) return true; }
  return false;
};
const seenFromFront = (m: Model, l: LineDef) => {
  const p = ptsOf(l, 0), L = len3(p);
  const at = (u: number): V3 => { const q = partial(p, u); return q[q.length - 1]; };
  return [0.1, 0.3, 0.5, 0.7, 0.9].filter((u) => !hiddenFront(m, L > 0 ? at(u) : p[0])).length >= 3;
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
      const high = (l: LineDef) => Math.min(...ptsOf(l, 0).map((q) => q[1])) > HIGH_Y;
      const seen = elev.filter((l) => seenFromFront(m, l)), unseen = elev.filter((l) => !seenFromFront(m, l));
      const len = (l: LineDef) => len3(ptsOf(l, 0));
      return [
        ...timeLines([{ ...g, lines: seen }]).map((l) => ({ ...l, t0: toDraw(l.t0), t1: toDraw(l.t1), depth: false, front: true, base, high: high(l), e0, e1, len: len(l) })),
        // ce que la façade et le toit cachent de face : tracé pendant le prolongement de l'élément
        ...unseen.map((l, i) => { const t0 = e0 + 0.1 + (0.4 * i) / Math.max(1, unseen.length); return { ...l, t0, t1: t0 + 0.25, mode: 'cascade' as const, depth: false, front: false, base, high: high(l), e0, e1, len: len(l) }; }),
        // les fuyantes sont « posées » d'un coup : c'est le prolongement qui les fait grandir
        ...dep.map((l) => ({ ...l, t0: e0 - 0.02, t1: e0, mode: 'cascade' as const, depth: true, front: false, base, high: high(l), e0, e1, len: len(l) })),
      ];
    });
    PREP.set(style, { m, lines });
  }
  return PREP.get(style)!;
};

// ---- pièces : volumes peints en aplats, traits, trajet ; décors et filets d'or à la peinture finale ----
type MeshRt = { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; paint: Paint };
type PartRt = { meshes: MeshRt[]; lines: LineDef[]; from: V3; land: number; slide: boolean; gold: { l: LineDef; t0: number; len: number }[] };
const backOut = (u: number) => { const c = 1.1, v = clamp(u) - 1; return 1 + (c + 1) * v * v * v + c * v * v; };
// trajet : d'abord l'horizontale jusqu'à l'aplomb de sa place, puis la verticale (ou la seule glissade horizontale)
const pathOff = (from: V3, u: number, slide: boolean): V3 => {
  const h = slide ? 1 - backOut(clamp(u)) : 1 - easeOut(clamp(u / 0.6)), v = 1 - backOut(clamp((u - 0.45) / 0.55));
  return [from[0] * h, from[1] * v, from[2] * h];
};
const SECOND: Partial<Record<Paint, Paint>> = { green: 'blue', blue: 'green', red: 'green' };   // couleur des bandes 箍頭
const meshesOf = (m: Model, pal: Record<Paint, Pigment>, solids: Solid[], roof: boolean, deco?: Part['deco']): MeshRt[] => {
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
    const u = mat.uniforms;
    if (roof && paint === 'roof') u.uKind.value = 3;
    else if (deco === 'beam') { u.uKind.value = 1; u.uTint2.value = new THREE.Color(...pal[SECOND[paint] ?? 'green'].tint); }
    else if (deco === 'column' && paint === 'column') { u.uKind.value = 2; u.uRing.value = new THREE.Vector2(m.col.y1 - 0.35, m.col.y0 + 0.3); }
    return { mesh: new THREE.Mesh(g, mat), mat, paint };
  });
};
function buildParts(m: Model, pal: Record<Paint, Pigment>): PartRt[] {
  // instants d'emboîtement : chaque pièce occupe sa part de temps (les consoles, nombreuses, s'enchaînent vite)
  const tot = m.parts.reduce((a, p) => a + p.w, 0);
  const golden = m.parts.filter((p) => p.gold).length;
  let acc = 0, gi = 0;
  return m.parts.map((p) => {
    acc += p.w;
    const r = Math.hypot(p.c[0], p.c[2]), dx = r > 0.5 ? p.c[0] / r : 0.6, dz = r > 0.5 ? p.c[2] / r : 0.8;
    // départ hors champ, du côté de la pièce : juste au-dessus de sa place, du ciel, ou à sa hauteur
    const from: V3 = p.path === 'fall' ? [0, 16, 0] : p.path === 'slide' ? [dx * 26, 0, dz * 26] : [dx * 26, 3.2, dz * 26];
    const g0 = p.gold ? lerp(GOLD0, GOLD1 - 0.35, gi++ / Math.max(1, golden - 1)) : 0;
    const gold = p.gold ? p.lines.map((l, k) => ({ l, t0: g0 + (0.2 * k) / Math.max(1, p.lines.length), len: len3(ptsOf(l, 0)) })) : [];
    return { meshes: meshesOf(m, pal, p.solids, !!p.roof, p.deco), lines: p.lines, from, land: lerp(LAND0, LAND1, acc / tot), slide: p.path === 'slide', gold };
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
    dark: new InkLines('#1a1613'), ghost: new InkLines('#1a1613'), ghostHi: new InkLines('#1a1613'),
    hid: new InkLines('#1a1613', true), axis: new InkLines('#b8432f'), gold: new InkLines('#b98a2c'),
  }), []);
  L.gold.mesh.renderOrder = 4;
  const deco = (paint: Paint) => easeOut((t - PAINT0 - pal[paint].at) / DECO_DUR);

  // la feuille s'efface pendant que les fuyantes se prolongent
  const sheetOp = 1 - ease((t - DEPTH0 - 0.4) / 1.4);
  [sheet.mount, sheet.paper].forEach((s) => { s.visible = sheetOp > 0.005; (s.material as THREE.ShaderMaterial).uniforms.uOp.value = sheetOp; });
  base.forEach((b) => {
    const f = clamp((t - BACK0) / 0.6);
    b.mesh.visible = f > 0; b.mat.uniforms.uFill.value = f; b.mat.uniforms.uReveal.value = 1; b.mat.uniforms.uDeco.value = deco(b.paint);
  });

  const px = viewport.dpr;
  const fresh = (t0: number, t1: number) => (s: number) => { const td = t0 + s * (t1 - t0); return t >= td ? clamp(1 - (t - td) / 0.45) : 0; };
  // dessin et prolongement ; après le recul, tout ce qui n'est pas la terrasse pâlit en épure
  const dark: number[] = [], ghost: number[] = [], ghostHi: number[] = [], ax: number[] = [];
  for (const l of lines) {
    const u = clamp((t - l.t0) / (l.t1 - l.t0));
    if (u <= 0) continue;
    // prolongement : tout point resté devant la règle qui recule est ramené sur elle (plan de la feuille au départ)
    const back = ZF - 24 * ease((t - l.e0) / (l.e1 - l.e0));
    const p = partial(ptsOf(l, c.az), u).map(([x, y, z]) => [x, y, Math.max(z, back)] as V3);
    const dst = l.axis ? ax : l.base ? dark : l.high ? ghostHi : ghost;
    const fr = l.depth ? (s: number) => clamp(1 - (t - l.e0 - s * (l.e1 - l.e0)) / 0.45) * (t >= l.e0 + s * (l.e1 - l.e0) ? 1 : 0) : fresh(l.t0, l.t1);
    pushStroke(dst, p, WIDTHS[l.w] * px * (l.axis ? 0.8 : 1), l.len, fr);
  }
  // pièces : elles voyagent depuis l'extérieur, déjà peintes, puis se fixent sur l'épure
  const pl: number[] = [], gl: number[] = [];
  parts.forEach((pr) => {
    const u = (t - (pr.land - FLIGHT)) / FLIGHT;
    if (u <= 0) { pr.meshes.forEach((me) => { me.mesh.visible = false; }); return; }
    const off = pathOff(pr.from, u, pr.slide);
    pr.meshes.forEach((me) => {
      me.mesh.visible = true; me.mesh.position.set(...off);
      me.mat.uniforms.uFill.value = 1; me.mat.uniforms.uReveal.value = 1; me.mat.uniforms.uDeco.value = deco(me.paint);
    });
    for (const l of pr.lines) { const p = ptsOf(l, c.az); pushStroke(pl, p, WIDTHS[l.w] * px, len3(p), () => 0, off); }
    // filets d'or, tracés après les aplats
    for (const g of pr.gold) {
      const gu = clamp((t - g.t0) / 0.3);
      if (gu > 0) pushStroke(gl, partial(ptsOf(g.l, c.az), gu), 1.15 * px, g.len, fresh(g.t0, g.t0 + 0.3), [0, 0, 0], true);
    }
  });

  const fade = (g: number) => (t < BACK0 ? 0.92 : t < LAND1 ? lerp(0.92, g, ease((t - BACK0) / (BACK1 - BACK0))) : g * (1 - ease((t - LAND1) / 0.6)));
  const hidOp = t < LAND0 - FLIGHT ? 0 : 0.3 * (1 - ease((t - LAND1) / 0.8));
  const res = new THREE.Vector2(size.width * px, size.height * px);
  L.dark.set([...dark, ...pl], 0.92, res);
  L.ghost.set(ghost, fade(GHOST), res);
  L.ghostHi.set(ghostHi, fade(GHOST_HIGH), res);
  L.hid.set(pl, hidOp, res);
  L.axis.set(ax, 0.55 - 0.4 * clamp((t - BACK0) / 1.5), res);
  L.gold.set(gl, 0.95, res);

  return (
    <>
      <primitive object={sheet.mount} />
      <primitive object={sheet.paper} />
      {base.map((b, i) => <primitive key={`b${i}`} object={b.mesh} />)}
      {parts.flatMap((pr, i) => pr.meshes.map((me, j) => <primitive key={`p${i}_${j}`} object={me.mesh} />))}
      {[L.dark, L.ghost, L.ghostHi, L.hid, L.axis, L.gold].map((o, i) => <primitive key={`l${i}`} object={o.mesh} />)}
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

export const JiehuaFeuille: React.FC<JiehuaFeuilleProps> = ({ style }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shot = useMemo(() => {
    const s = compose(29, { move: 'still', mood: 'jour', duration: JIEHUA_FEUILLE_SECONDS });
    return { ...s, pieces: s.pieces.filter((p) => p.el.family !== 'premier' && (p.el.family !== 'vie' || /vie_[ab][26]\.png/.test(p.el.file))) };
  }, []);
  // même caméra que la scène : le paysage suit l'orbite, la brume se pose au pied de la salle
  const c = camAt(t);
  const pc = useMemo(() => new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 1, 300), []);
  applyCam(pc, c);
  const v = new THREE.Vector3();
  const proj = (p: V3) => { v.set(...p).project(pc); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H]; };
  const [bx, by] = proj([0, 1.4, 1]), [lx] = proj([-12, 0, 9]), [rx] = proj([12, 0, -9]);
  const mist = ease((t - FAR0 - 0.2) / 1.6);
  const scroll = c.az * 650;
  const titleX = 1590, titleY = 170, CH = 62;
  const sealU = clamp((t - T_SEAL) / 0.35);
  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <ShuimoBackground shot={shot} duration={JIEHUA_FEUILLE_SECONDS} halo={false} scroll={scroll} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 54% at 50% 54%, rgba(250,247,240,0.86) 0%, rgba(250,247,240,0.6) 60%, rgba(250,247,240,0) 100%)', opacity: 1 - 0.6 * mist }} />
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="inkfeuille" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.4} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: 'url(#inkfeuille)' }}>
        <ThreeCanvas width={W} height={H} orthographic flat linear gl={{ alpha: true, antialias: true }} camera={{ position: [0, 7, 80], zoom: 52 }}>
          <Scene t={t} style={style} />
        </ThreeCanvas>
      </AbsoluteFill>
      {/* brume de lavis au pied de la salle : la terrasse se fond dans le paysage */}
      {mist > 0 && (
        <AbsoluteFill style={{
          opacity: mist,
          background: `radial-gradient(ellipse ${(rx - lx) * 0.6}px ${(rx - lx) * 0.13}px at ${bx}px ${by + (rx - lx) * 0.1}px, rgba(248,245,238,0.97) 0%, rgba(248,245,238,0.85) 45%, rgba(248,245,238,0) 100%)`,
        }} />
      )}
      {/* le maître inscrit le titre en colonne, puis pose son sceau */}
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
