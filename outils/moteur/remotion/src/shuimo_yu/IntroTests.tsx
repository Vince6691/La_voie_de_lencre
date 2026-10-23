// 語 — deux essais d'ouverture en 3D (5 premières secondes), calés sur la voix du bloc 1 :
//   YuIntroEncre : « parler » à l'encre se soulève du papier, éclate en gouttelettes qui se reforment en 语 puis 言
//   YuIntroLaque : PARLER incrusté d'or dans une plaque de laque ; la plaque se fend en deux, 語 et 言 en sortent
// Contours des glyphes : intro3d_glyphs.json (Cormorant pour le latin, Ma Shan Zheng au pinceau pour 语 et 言 —
// forme simplifiée d'aujourd'hui, celle de la fin de la vidéo —, unités de police).
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import G from './intro3d_glyphs.json';
import R from '../data/episodes/yu.json';
import { useThree } from '@react-three/fiber';

export const INTRO_SECONDS = 6.6;
const b01 = (R as any)._ligne.clips.b01.debut as number;
const cue = (k: string) => b01 + (R as any).b01.cues[k];
const T = { dire: cue('dire'), deux: cue('deux'), yu: cue('yu1'), yan: cue('yan1'), pr: cue('precepte') };

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const out3 = (u: number) => 1 - Math.pow(1 - u, 3);
const rng = (s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

// formes three.js d'un texte du JSON ; centre horizontal à 0, taille = hauteur d'em en unités monde
type Txt = { upm: number; width: number; glyphs: { ch: string; d: string; x: number; adv: number }[] };
const shapesOf = (t: Txt, em: number, only?: number) => {
  const loader = new SVGLoader(), k = em / t.upm, res: { shapes: THREE.Shape[]; cx: number; ch: string }[] = [];
  t.glyphs.forEach((g, i) => {
    if (only !== undefined && i !== only) return;
    const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${g.d}"/></svg>`);
    const shapes: THREE.Shape[] = [];
    data.paths.forEach((p) => SVGLoader.createShapes(p).forEach((s) => shapes.push(s)));
    res.push({ shapes, cx: (g.x - (only !== undefined ? g.x + g.adv / 2 : t.width / 2)) * k, ch: g.ch });
  });
  return { res, k };
};
const geoOf = (shapes: THREE.Shape[], k: number, dx: number, depth: number, bevel = 0.012, dy = 0) => {
  // extrusion en unités de police (épaisseur 1), puis mise à l'échelle : biseau exprimé en unités monde
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: true, bevelThickness: bevel / Math.max(depth, 1e-3), bevelSize: (bevel * 0.6) / k, bevelSegments: 2, curveSegments: 6 });
  geo.scale(k, k, depth); geo.translate(dx, dy, 0);
  return geo;
};
// points répartis à l'intérieur des formes (triangles tirés selon leur aire)
const samplePts = (shapes: THREE.Shape[], k: number, dx: number, n: number, seed: number) => {
  const tri: number[][] = [], areas: number[] = [], r = rng(seed);
  shapes.forEach((s) => {
    const g = new THREE.ShapeGeometry(s, 4), pos = g.attributes.position, idx = g.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const a = [pos.getX(idx.getX(i)), pos.getY(idx.getX(i))], b = [pos.getX(idx.getX(i + 1)), pos.getY(idx.getX(i + 1))], c = [pos.getX(idx.getX(i + 2)), pos.getY(idx.getX(i + 2))];
      tri.push([...a, ...b, ...c]); areas.push(Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2);
    }
  });
  const tot = areas.reduce((x, y) => x + y, 0), out: THREE.Vector3[] = [];
  for (let j = 0; j < n; j++) {
    let u = r() * tot, i = 0; while (u > areas[i] && i < areas.length - 1) { u -= areas[i]; i++; }
    let p = r(), q = r(); if (p + q > 1) { p = 1 - p; q = 1 - q; }
    const t = tri[i];
    out.push(new THREE.Vector3((t[0] + p * (t[2] - t[0]) + q * (t[4] - t[0])) * k + dx, (t[1] + p * (t[3] - t[1]) + q * (t[5] - t[1])) * k, 0));
  }
  return out;
};
// papier xuan (texture procédurale)
const paperTex = () => {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d')!;
  x.fillStyle = '#f2ece0'; x.fillRect(0, 0, 1024, 1024); const r = rng(7);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${150 + 40 * r()},${140 + 30 * r()},${120 + 30 * r()},${0.04 * r()})`; x.fillRect(r() * 1024, r() * 1024, 1 + 30 * r(), 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
};
const useT = () => { const f = useCurrentFrame(), { fps } = useVideoConfig(); return f / fps; };
const Voice: React.FC = () => <Sequence from={Math.round(b01 * 30)}><Audio src={staticFile('episodes/yu/voix/b01.wav')} /></Sequence>;

// ═══════════════════ Option 3 : l'encre se lève
const N = 1600;
const EncreScene: React.FC<{ t: number }> = ({ t }) => {
  const d = useMemo(() => {
    const p = shapesOf(G.parler as Txt, 1.35), kai = shapesOf(G.kai as Txt, 1.25);
    const letters = p.res.map((g) => ({ geo: geoOf(g.shapes, p.k, g.cx, 0.16), g }));
    // points de départ (les lettres) et d'arrivée (語 à gauche, 言 à droite)
    const src = p.res.flatMap((g, i) => samplePts(g.shapes, p.k, g.cx, Math.round(N / 6), 11 + i)).slice(0, N);
    while (src.length < N) src.push(src[src.length % 50].clone());
    const yuS = shapesOf(G.kai as Txt, 1.25, 0).res[0], yanS = shapesOf(G.kai as Txt, 1.25, 1).res[0];
    const cx = (c: number) => c - 500 * kai.k, cy = -380 * kai.k + 0.3;
    const tgtYu = samplePts(yuS.shapes, kai.k, cx(-0.78), N / 2, 21).map((v) => v.setY(v.y + cy)), tgtYan = samplePts(yanS.shapes, kai.k, cx(0.78), N / 2, 22).map((v) => v.setY(v.y + cy));
    // chaque gouttelette va vers 語 ou 言 selon son côté de départ
    const order = src.map((v, i) => [v.x, i]).sort((a, b) => a[0] - b[0]).map((a) => a[1]);
    const tgt: THREE.Vector3[] = new Array(N), side = new Array(N);
    order.forEach((i, j) => { const left = j < N / 2; tgt[i] = left ? tgtYu[j] : tgtYan[j - N / 2]; side[i] = left ? 0 : 1; });
    const r = rng(5), vel = src.map(() => new THREE.Vector3((r() - 0.5) * 1.1, (r() - 0.5) * 0.7, 0.35 + 0.9 * r()));
    const yuGeo = geoOf(yuS.shapes, kai.k, cx(-0.78), 0.07, 0.01, cy), yanGeo = geoOf(yanS.shapes, kai.k, cx(0.78), 0.07, 0.01, cy);
    const st = document.createElement('canvas'); st.width = st.height = 256; const sx = st.getContext('2d')!; const gr = sx.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(20,16,12,0.5)'); gr.addColorStop(0.55, 'rgba(30,24,18,0.22)'); gr.addColorStop(1, 'rgba(30,24,18,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 256, 256);
    const stain = new THREE.CanvasTexture(st);
    return { letters, src, tgt, side, vel, yuGeo, yanGeo, paper: paperTex(), stain };
  }, []);
  const ink = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#0d0b0a', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, metalness: 0.1 }), []);
  const inst = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), ink, N); m.castShadow = true; return m; }, [ink]);
  // temps clés
  const rise = ease(seg(t, T.dire + 0.2, T.deux - 0.1)), burst = T.deux + 0.15, yuAt = T.yu + 0.25, yanAt = T.yan + 0.25;
  const lettersOn = t < burst;
  if (!lettersOn) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const u = t - burst, arrive = d.side[i] ? yanAt : yuAt, t0 = arrive - 1.1;
      const lift = 0.5 * rise + 0.08;
      // éclatement balistique, puis attraction douce vers la cible (tourbillon)
      const fly = new THREE.Vector3().copy(d.src[i]).addScaledVector(d.vel[i], Math.min(u, 0.9) * 0.9).setZ(lift + d.vel[i].z * Math.min(u, 0.9) * 0.8 - 0.5 * Math.min(u, 0.9) ** 2);
      const k = ease(seg(t, t0, arrive));
      const sw = (1 - k) * 0.25, ang = u * 3 + i;
      p.copy(fly).lerp(d.tgt[i].clone().setZ(0.25), k).add(new THREE.Vector3(Math.cos(ang) * sw, Math.sin(ang) * sw, 0));
      const done = seg(t, arrive, arrive + 0.35), r0 = 0.017 * (0.6 + 0.8 * ((i * 7919) % 100) / 100) * (1 - done);
      s.setScalar(Math.max(r0, 1e-4)); m.compose(p, q, s); inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
  }
  const cam = ease(seg(t, 0, INTRO_SECONDS));
  return (
    <>
      <color attach="background" args={['#efe8da']} />
      <fog attach="fog" args={['#efe8da', 6, 13]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[-2.5, -3, 6]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={3} shadow-camera-bottom={-3} />
      <pointLight position={[0, 2.2, 1.0]} intensity={9} distance={6} color="#f0c070" />
      <mesh receiveShadow position={[0, 0, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial map={d.paper} roughness={0.95} /></mesh>
      {/* la goutte qui tombe, puis la tache d'où naît « parler » */}
      {t < 0.42 && <mesh position={[0, 0.1, 3 - 3 * seg(t, 0, 0.4) ** 2]} scale={[0.06, 0.06, 0.1]}><sphereGeometry args={[1, 16, 12]} /><primitive object={ink} attach="material" /></mesh>}
      <mesh position={[0, 0.25, 0.002]} scale={[2.2 * out3(seg(t, 0.38, 1.0)), 0.9 * out3(seg(t, 0.38, 1.0)), 1]}>
        <planeGeometry args={[2, 2]} /><meshBasicMaterial map={d.stain} transparent opacity={1 - seg(t, 1.0, T.deux)} depthWrite={false} />
      </mesh>
      {lettersOn && d.letters.map(({ geo, g }, i) => {
        const w = ease(seg(t, T.dire - 0.25 + i * 0.05, T.dire + 0.3 + i * 0.05));
        return <mesh key={i} geometry={geo} castShadow position={[0, 0.25, 0.4 * rise + 0.12 * rise * Math.sin(t * 3 + i)]} rotation={[0.35 * rise, 0, 0.04 * rise * Math.sin(i * 1.7)]} scale={[1, 1, Math.max(0.02, rise)]} visible={w > 0.01}>
          <primitive object={ink} attach="material" />
        </mesh>;
      })}
      {!lettersOn && <primitive object={inst} />}
      {[{ geo: d.yuGeo, at: yuAt }, { geo: d.yanGeo, at: yanAt }].map(({ geo, at }, i) => {
        const k = seg(t, at - 0.1, at + 0.4);
        return k > 0 ? <mesh key={i} geometry={geo} castShadow position={[0, 0, 0.05 + 0.25 * (1 - out3(k))]} scale={[1, 1, Math.max(0.02, out3(k))]}><primitive object={ink} attach="material" /></mesh> : null;
      })}
      <CamRig x={0.25 * Math.sin(cam * 2.2)} y={-4.6 + 2.4 * ease(seg(t, T.deux, T.yan + 0.6))} z={3.4 + 1.2 * ease(seg(t, T.deux, T.yan + 0.6))} />
    </>
  );
};
const CamRig: React.FC<{ x: number; y: number; z: number }> = ({ x, y, z }) => {
  // caméra posée à chaque image (déterministe), axe z vers le haut : on regarde le papier en plongée
  const { camera } = useThree();
  camera.up.set(0, 0, 1); camera.position.set(x, y, z); camera.lookAt(0, 0.25, 0.25); camera.updateProjectionMatrix();
  return null;
};
export const YuIntroEncre: React.FC = () => {
  const t = useT(), { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#efe8da' }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true }} camera={{ fov: 34, position: [0, -4.6, 3.4], near: 0.05, far: 60 }}><EncreScene t={t} /></ThreeCanvas>
      <Voice />
    </AbsoluteFill>
  );
};

// ═══════════════════ Option 2 : la plaque de laque qui se fend
const LaqueScene: React.FC<{ t: number }> = ({ t }) => {
  const d = useMemo(() => {
    // plaque en deux moitiés, fente en zigzag au milieu
    const W = 4.6, H = 1.7, r = rng(3), zz: number[][] = [];
    for (let i = 0; i <= 10; i++) zz.push([(r() - 0.5) * 0.16 + (i % 2 ? 0.05 : -0.05), -H / 2 + (H * i) / 10]);
    const half = (sgn: number) => {
      const s = new THREE.Shape(); s.moveTo(sgn * W / 2, -H / 2); s.lineTo(sgn * W / 2, H / 2);
      [...zz].reverse().forEach(([x, y]) => s.lineTo(x, y));
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
      return g;
    };
    const p = shapesOf(G.PARLER as Txt, 0.62);
    const letters = p.res.map((g) => ({ geo: geoOf(g.shapes, p.k, g.cx, 0.03, 0.004, -0.2), cx: g.cx }));
    const yuS = shapesOf(G.kai as Txt, 1.15, 0).res[0], yanS = shapesOf(G.kai as Txt, 1.15, 1).res[0];
    const kk = 1.15 / 1000, cy = -380 * kk;
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...zz].reverse().map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'catmullrom', 0.1), 120, 0.012, 6, false);
    return { L: half(-1), Rt: half(1), letters, zz, tube, yuGeo: geoOf(yuS.shapes, kk, -500 * kk, 0.06, 0.01, cy), yanGeo: geoOf(yanS.shapes, kk, -500 * kk, 0.06, 0.01, cy) };
  }, []);
  const lacq = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#170a08', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }), []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4a64a', metalness: 1, roughness: 0.28, emissive: '#5a3a0c', emissiveIntensity: 0.6 }), []);
  const crack = seg(t, T.deux - 0.15, T.deux + 0.25), open = ease(seg(t, T.deux + 0.2, T.yu - 0.4));
  const sweep = -3 + 6 * ease(seg(t, 0, 2.2)); // reflet qui balaie l'or
  const rise = (at: number) => out3(seg(t, at - 0.35, at + 0.55));
  const ry = rise(T.yu + 0.1), ra = rise(T.yan + 0.1);
  const halfPos = (sgn: number): [number, number, number] => [sgn * 0.55 * open, 0, 0.0];
  const halfRot = (sgn: number): [number, number, number] => [0, -sgn * 0.22 * open, sgn * 0.05 * open];
  const cam = ease(seg(t, 0, INTRO_SECONDS));
  return (
    <>
      <color attach="background" args={['#1d1714']} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#ffe6c0', '#2a1d16', 0.6]} />
      <spotLight position={[sweep, -2.5, 4]} angle={0.6} penumbra={0.8} intensity={140} castShadow color="#fff2dc" />
      <pointLight position={[0, 0.2, 0.8]} intensity={18 * crack * (1 - 0.4 * open)} distance={4} color="#ffc060" />
      <mesh receiveShadow position={[0, 0, -0.01]}><planeGeometry args={[16, 10]} /><meshStandardMaterial color="#2a1d16" roughness={0.6} /></mesh>
      {[-1, 1].map((sgn) => (
        <group key={sgn} position={halfPos(sgn)} rotation={halfRot(sgn)}>
          <mesh geometry={sgn < 0 ? d.L : d.Rt} castShadow receiveShadow><primitive object={lacq} attach="material" /></mesh>
          {d.letters.filter((l) => (sgn < 0 ? l.cx < 0 : l.cx >= 0)).map((l, i) => (
            <mesh key={i} geometry={l.geo} position={[0, 0, 0.165]}><primitive object={gold} attach="material" /></mesh>
          ))}
        </group>
      ))}
      {/* la fente : une lumière d'or qui court le long du zigzag */}
      {crack > 0 && open < 0.98 && (d.tube.setDrawRange(0, Math.round(d.tube.index!.count * crack / 3) * 3), true) && <mesh geometry={d.tube} position={[0, 0, 0.19]} scale={[1 + 6 * open, 1, 1]}><meshBasicMaterial color="#ffd88a" transparent opacity={1 - open} /></mesh>}
      {ry > 0 && <mesh geometry={d.yuGeo} castShadow position={[-1.2, 0.1, 0.25 + 0.55 * ry]} rotation={[1.2 * ry, 0, 0]} scale={[ry, ry, ry]}><primitive object={gold} attach="material" /></mesh>}
      {ra > 0 && <mesh geometry={d.yanGeo} castShadow position={[1.2, 0.1, 0.25 + 0.55 * ra]} rotation={[1.2 * ra, 0, 0]} scale={[ra, ra, ra]}><primitive object={gold} attach="material" /></mesh>}
      <CamRig x={-0.3 + 0.6 * cam} y={-4.2 + 0.6 * cam} z={3.3 - 0.4 * cam} />
    </>
  );
};
export const YuIntroLaque: React.FC = () => {
  const t = useT(), { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#1d1714' }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true }} camera={{ fov: 34, position: [0, -4.2, 3.3], near: 0.05, far: 60 }}><LaqueScene t={t} /></ThreeCanvas>
      <Voice />
    </AbsoluteFill>
  );
};

// ═══════════════════ Option 4 : deux ombres qui se parlent (image ombres_conseillers.jpg)
// La lampe s'allume dans le noir ; « parler » apparaît en ombre portée sur le mur, se scinde sur « deux mots » ;
// chaque ombre « prononce » son caractère, projeté sur le mur au-dessus d'elle (語 à gauche, 言 à droite).
const OMB = { yu: [0.33, 0.23], yan: [0.68, 0.23], flame: [0.5, 0.735] }; // positions dans l'image (fractions)
export const YuIntroOmbres: React.FC = () => {
  const t = useT();
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => { Promise.all([new FontFace('ShuimoPinceau', `url(${staticFile('fonts/MaShanZheng-Regular.ttf')})`).load(), new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700', style: 'italic' }).load()]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); }); }, [h]);
  const light = ease(seg(t, 0.05, 0.75));
  const flick = 1 + 0.035 * Math.sin(t * 23) * Math.sin(t * 7.3) + 0.02 * Math.sin(t * 41);
  const push = 1.0 + 0.07 * ease(seg(t, 0, INTRO_SECONDS));
  const sh = (x: number) => x; // l'ombre suit la flamme : léger balancement
  const sway = 3 * Math.sin(t * 5.1) * Math.sin(t * 1.7);
  const word = seg(t, T.dire - 0.15, T.dire + 0.45) * (1 - seg(t, T.deux + 0.5, T.deux + 1.1));
  const split = ease(seg(t, T.deux - 0.05, T.deux + 0.9));
  const glyph = (at: number) => ease(seg(t, at - 0.2, at + 0.5));
  const shadowText: React.CSSProperties = { position: 'absolute', color: 'rgba(38,28,20,0.62)', filter: 'blur(5px)', whiteSpace: 'nowrap', transform: 'translate(-50%, -50%)' };
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: '50% 62%' }}>
        <img src={staticFile('episodes/yu/images/ombres_conseillers.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `brightness(${(0.08 + 0.92 * light) * flick})` }} />
        {/* halo chaud de la flamme */}
        <div style={{ position: 'absolute', left: `${OMB.flame[0] * 100}%`, top: `${OMB.flame[1] * 100}%`, width: 520, height: 520, transform: 'translate(-50%, -60%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,190,110,0.35), rgba(255,190,110,0) 70%)', opacity: light * flick, mixBlendMode: 'screen' }} />
        {/* « parler » en ombre portée, puis scindé en deux vers chaque silhouette */}
        {word > 0 && ['par', 'ler'].map((s, i) => (
          <div key={s} style={{ ...shadowText, left: `${(50 + (i ? 1 : -1) * (4.3 + 13 * split)) * 1}%`, top: `${17 - 2 * split}%`, fontFamily: 'ShuimoLatin', fontStyle: 'italic', fontWeight: 600, fontSize: 150, opacity: word * light, marginLeft: sway, textAlign: i ? 'left' : 'right' }}>{s}</div>
        ))}
        {[['语', OMB.yu, T.yu], ['言', OMB.yan, T.yan]].map(([c, p, at]) => {
          const k = glyph(at as number);
          return k > 0 ? <div key={c as string} style={{ ...shadowText, left: `${(p as number[])[0] * 100}%`, top: `${((p as number[])[1] + 0.04 * (1 - k)) * 100}%`, fontFamily: 'ShuimoPinceau', fontSize: 230 + 40 * k, opacity: k * light * 0.95, marginLeft: sh(sway * 1.4) }}>{c as string}</div> : null;
        })}
      </AbsoluteFill>
      <Voice />
    </AbsoluteFill>
  );
};
