// Essai : Pékin en 3D sur la carte peinte (bibliothèque cartes). La caméra part de la carte vue de dessus, bascule en
// angle rasant et file vers Pékin ; les murailles en 凸 (ville intérieure, ville extérieure de 1553) sortent de terre,
// la porte Zhengyang puis une salle de la Cité interdite tombent du ciel. Rendu « encre » : aplats (toon), contour
// d'encre (coque inversée), papier en surimpression. Axe z vers le haut, 1 unité = 120 px de la carte 1920 × 1080.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { carte } from './CartePeinte';

export const PEKIN3D_SECONDS = 8;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const out3 = (u: number) => 1 - Math.pow(1 - u, 3);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// lieu de la carte → unités de la scène
export const CARTE = 'chine_centre_nord';
export const P = (lon: number, lat: number): [number, number] => {
  const v = carte(CARTE).vue;
  return [((lon - v.lon) * v.k) / 120, ((lat - v.lat) * v.k * 1.18) / 120];
};
export const BJ = P(116.4, 39.9), CA = P(108.9, 34.3);

// temps de l'essai
const T = { bascule: 1.0, arrivee: 3.8, murs: 3.5, porte: 4.7, coins: 5.1, salle: 5.7 };

export const COUL = { encre: '#2b2119', mur: '#7f776a', murHaut: '#9c9383', colonne: '#a4473a', tuileGris: '#56645c', tuileJaune: '#d4a23e', terrasse: '#ebe3cf', sol: '#e9dfc9' };
export const ECH = 0.6; // échelle de la ville sur la carte (déjà très exagérée)

// ─── géométries
// toit à quatre pentes (庑殿) incurvé, coins relevés ; w × d à l'égout, faîtage (w - d), hauteur h ; tMax < 1 : auvent
const toit = (w: number, d: number, h: number, lift = 0.25, tMax = 1) => {
  const N = 8, M = 10, pos: number[] = [], idx: number[] = [];
  const hw = w / 2, hd = d / 2, rx = Math.max(0, hw - hd);
  const faces = [
    [[-hw, -hd], [hw, -hd], [-rx, 0], [rx, 0]], [[hw, hd], [-hw, hd], [rx, 0], [-rx, 0]],
    [[hw, -hd], [hw, hd], [rx, 0], [rx, 0]], [[-hw, hd], [-hw, -hd], [-rx, 0], [-rx, 0]],
  ];
  faces.forEach(([E0, E1, R0, R1]) => {
    const base = pos.length / 3;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * tMax;
      for (let j = 0; j <= M; j++) {
        const s = j / M;
        const ax = lerp(E0[0], R0[0], t), ay = lerp(E0[1], R0[1], t), bx = lerp(E1[0], R1[0], t), by = lerp(E1[1], R1[1], t);
        const z = h * Math.pow(t, 1.7) + lift * h * Math.pow(1 - t, 3) * Math.pow(Math.abs(2 * s - 1), 4);
        pos.push(lerp(ax, bx, s), lerp(ay, by, s), z);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = base + i * (M + 1) + j, b = a + 1, c = a + M + 1, e = c + 1;
      idx.push(a, b, e, a, e, c);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};

// matériaux toon (3 tons) + coque d'encre
const useMats = () => useMemo(() => {
  const grad = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const toon = (c: string) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, side: THREE.DoubleSide });
  const coque = new THREE.MeshBasicMaterial({ color: COUL.encre, side: THREE.BackSide });
  return { mur: toon(COUL.mur), murHaut: toon(COUL.murHaut), colonne: toon(COUL.colonne), gris: toon(COUL.tuileGris), jaune: toon(COUL.tuileJaune), terrasse: toon(COUL.terrasse), coque };
}, []);

// une pièce : maillage + coque d'encre (légèrement gonflée)
const Piece: React.FC<{ geo: THREE.BufferGeometry; mat: THREE.Material; coque: THREE.Material; p?: [number, number, number]; s?: number }> = ({ geo, mat, coque, p = [0, 0, 0], s = 1.04 }) => (
  <group position={p}>
    <mesh geometry={geo} material={mat} castShadow receiveShadow />
    <mesh geometry={geo} material={coque} scale={[s, s, s]} />
  </group>
);
const boite = (w: number, d: number, h: number) => new THREE.BoxGeometry(w, d, h).translate(0, 0, h / 2);

// bâtiment à deux étages et double toit (tour de porte, salle) ; origine au sol, au centre
const Batiment: React.FC<{ w: number; d: number; h: number; toitMat: THREE.Material; m: ReturnType<typeof useMats>; socle?: number; socleMat?: THREE.Material }> = ({ w, d, h, toitMat, m, socle = 0, socleMat }) => {
  const g = useMemo(() => ({
    socle: socle > 0 ? boite(w * 1.35, d * 1.5, socle) : null,
    corps: boite(w, d, h),
    auvent: toit(w * 1.32, d * 1.45, h * 0.55, 0.35, 0.55),
    corps2: boite(w * 0.82, d * 0.75, h * 0.6),
    toit: toit(w * 1.15, d * 1.2, h * 0.75, 0.3),
  }), [w, d, h, socle]);
  const z0 = socle;
  return (
    <group>
      {g.socle && <Piece geo={g.socle} mat={socleMat || m.terrasse} coque={m.coque} s={1.01} />}
      <Piece geo={g.corps} mat={m.colonne} coque={m.coque} p={[0, 0, z0]} s={1.02} />
      <Piece geo={g.auvent} mat={toitMat} coque={m.coque} p={[0, 0, z0 + h * 0.92]} s={1.02} />
      <Piece geo={g.corps2} mat={m.colonne} coque={m.coque} p={[0, 0, z0 + h * 1.05]} s={1.02} />
      <Piece geo={g.toit} mat={toitMat} coque={m.coque} p={[0, 0, z0 + h * 1.6]} s={1.02} />
    </group>
  );
};

// chute : tombe en accélérant, s'écrase légèrement, se redresse ; anneau d'encre au sol
export const chute = (t: number, at: number) => {
  const f = seg(t, at - 0.55, at), z = 5 * (1 - f * f);
  const k = seg(t, at, at + 0.35), sq = Math.sin(k * Math.PI) * (1 - k) * 0.35;
  return { z: f < 1 ? z : 0, sx: 1 + sq * 0.5, sz: 1 - sq, vis: t > at - 0.55, onde: seg(t, at, at + 0.9) };
};
export const Onde: React.FC<{ k: number; r: number; p: [number, number] }> = ({ k, r, p }) => k > 0 && k < 1 ? (
  <mesh position={[p[0], p[1], 0.004]} scale={[r * (0.4 + 1.6 * out3(k)), r * (0.4 + 1.6 * out3(k)), 1]}>
    <ringGeometry args={[0.9, 1, 64]} /><meshBasicMaterial color={COUL.encre} transparent opacity={0.28 * (1 - k)} depthWrite={false} />
  </mesh>
) : null;

// remparts : segments le long du 凸, qui montent de terre en vague ; créneaux instanciés
const Remparts: React.FC<{ t: number; m: ReturnType<typeof useMats> }> = ({ t, m }) => {
  const d = useMemo(() => {
    const iw = 1.2, ih = 0.97, ow = 1.45, oh = 0.56, H = 0.075, E = 0.045;
    // ville intérieure (nord) puis ville extérieure (sud), contours en coordonnées locales (centre ville intérieure)
    const inner = [[-iw / 2, ih / 2], [iw / 2, ih / 2], [iw / 2, -ih / 2], [-iw / 2, -ih / 2], [-iw / 2, ih / 2]];
    const outer = [[-iw / 2, -ih / 2], [-ow / 2, -ih / 2], [-ow / 2, -ih / 2 - oh], [ow / 2, -ih / 2 - oh], [ow / 2, -ih / 2], [iw / 2, -ih / 2]];
    const blocs: { x: number; y: number; a: number; l: number; u: number }[] = [];
    let total = 0;
    [inner, outer].forEach((poly) => {
      for (let i = 0; i < poly.length - 1; i++) {
        const [x0, y0] = poly[i], [x1, y1] = poly[i + 1], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 0.08));
        for (let j = 0; j < n; j++) { const f = (j + 0.5) / n; blocs.push({ x: lerp(x0, x1, f), y: lerp(y0, y1, f), a: Math.atan2(y1 - y0, x1 - x0), l: L / n + 0.004, u: total + f * L }); }
        total += L;
      }
    });
    blocs.forEach((b) => (b.u /= total));
    const geo = new THREE.BoxGeometry(1, E, H).translate(0, 0, H / 2);
    const cren = new THREE.BoxGeometry(0.018, 0.012, 0.016).translate(0, 0, 0.008);
    const inst = new THREE.InstancedMesh(geo, m.mur, blocs.length), coque = new THREE.InstancedMesh(geo, m.coque, blocs.length);
    const nc = blocs.length * 4, ic = new THREE.InstancedMesh(cren, m.murHaut, nc);
    inst.castShadow = inst.receiveShadow = true; ic.castShadow = true;
    // traits d'encre : arêtes hautes des remparts (extérieure et intérieure)
    const traits = [inner, outer].flatMap((poly) => [-1, 1].map((sg) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < poly.length; i++) {
        const [x, y] = poly[i], [xa, ya] = poly[Math.max(0, i - 1)], [xb, yb] = poly[Math.min(poly.length - 1, i + 1)];
        const dx = xb - xa, dy = yb - ya, L = Math.hypot(dx, dy) || 1;
        pts.push(new THREE.Vector3(x - (dy / L) * sg * E / 2, y + (dx / L) * sg * E / 2, H + 0.001));
      }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: COUL.encre, transparent: true, opacity: 0.75 }));
    }));
    return { blocs, inst, coque, ic, H, E, inner, ih, iw, traits };
  }, [m]);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  d.blocs.forEach((b, i) => {
    // la vague part du coin nord-ouest et fait le tour ; chaque bloc monte en 0,45 s
    const k = out3(seg(t, T.murs + b.u * 0.9, T.murs + b.u * 0.9 + 0.45));
    q.setFromAxisAngle(Z, b.a);
    p.set(b.x, b.y, -d.H * (1 - k) - 0.002); s.set(b.l, 1, 1); M.compose(p, q, s); d.inst.setMatrixAt(i, M);
    s.set(b.l + 0.012, 1.25, 1.12); p.z -= 0.004; M.compose(p, q, s); d.coque.setMatrixAt(i, M);
    for (let c = 0; c < 4; c++) {
      const off = (c - 1.5) * (b.l / 4), ox = Math.cos(b.a) * off, oy = Math.sin(b.a) * off;
      const nx = -Math.sin(b.a) * (d.E / 2 - 0.006), ny = Math.cos(b.a) * (d.E / 2 - 0.006);
      p.set(b.x + ox + nx, b.y + oy + ny, d.H * k - d.H * (1 - k) * 0.2); s.set(1, 1, k > 0.98 ? 1 : 0.0001); M.compose(p, q, s); d.ic.setMatrixAt(i * 4 + c, M);
    }
  });
  d.inst.instanceMatrix.needsUpdate = d.coque.instanceMatrix.needsUpdate = d.ic.instanceMatrix.needsUpdate = true;
  // poussière : anneau qui suit la vague
  return (
    <group>
      <primitive object={d.inst} /><primitive object={d.ic} />
      {d.traits.map((l, i) => { const k = seg(t, T.murs + 0.9, T.murs + 1.4); l.visible = k > 0; (l.material as THREE.LineBasicMaterial).opacity = 0.75 * k; return <primitive key={i} object={l} />; })}
      <Onde k={seg(t, T.murs + 0.2, T.murs + 1.6)} r={0.8} p={[0, -0.2]} />
    </group>
  );
};

const Scene: React.FC<{ t: number; tex: THREE.Texture; paper: THREE.Texture }> = ({ t, tex, paper }) => {
  const m = useMats();
  // caméra : de la carte vue de dessus (au-dessus de Chang'an) à l'angle rasant sur Pékin, puis lente orbite
  const kb = ease(seg(t, T.bascule, T.arrivee)), orb = ease(seg(t, T.arrivee, PEKIN3D_SECONDS)) * 0.35;
  const look = new THREE.Vector3(lerp(0, BJ[0], kb), lerp(0, BJ[1] - 0.12, kb), lerp(0, 0.04, kb));
  const dist = lerp(17, 2.1, Math.pow(kb, 0.6)), elev = lerp(Math.PI / 2 - 0.02, 0.5, kb), az = -Math.PI / 2 + lerp(0, 0.25, kb) + orb;
  const cam = new THREE.Vector3(look.x + dist * Math.cos(elev) * Math.cos(az), look.y + dist * Math.cos(elev) * Math.sin(az), dist * Math.sin(elev));
  const gate = chute(t, T.porte), hall = chute(t, T.salle);
  const coins = [[-0.6, 0.485], [0.6, 0.485], [-0.6, -0.485], [0.6, -0.485]];
  return (
    <>
      <color attach="background" args={[COUL.sol]} />
      <fog attach="fog" args={[COUL.sol, dist + 3, dist + 14]} />
      <hemisphereLight args={['#fff6e6', '#b8a888', 1.1]} />
      <directionalLight position={[-3, -4, 6]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-bias={-0.0004} />
      <mesh position={[0, 0, -0.01]}><planeGeometry args={[60, 60]} /><meshBasicMaterial map={paper} color="#efe6d2" /></mesh>
      <mesh receiveShadow><planeGeometry args={[16, 9]} /><meshLambertMaterial map={tex} /></mesh>
      <group position={[BJ[0], BJ[1], 0]} scale={[ECH, ECH, ECH]}>
        <Remparts t={t} m={m} />
        {/* porte Zhengyang (正陽門), au milieu du rempart sud de la ville intérieure */}
        {gate.vis && <group position={[0, -0.485, gate.z]} scale={[gate.sx, gate.sx, gate.sz]}><Batiment w={0.16} d={0.07} h={0.07} toitMat={m.gris} m={m} socle={0.08} socleMat={m.mur} /></group>}
        <Onde k={gate.onde} r={0.25} p={[0, -0.485]} />
        {/* tours d'angle */}
        {coins.map(([x, y], i) => { const c = chute(t, T.coins + i * 0.12); return c.vis ? <group key={i} position={[x, y, c.z]} scale={[c.sx, c.sx, c.sz]}><Batiment w={0.09} d={0.09} h={0.05} toitMat={m.gris} m={m} socle={0.08} socleMat={m.mur} /></group> : null; })}
        {/* Cité interdite : salle de l'Harmonie suprême (太和殿) sur sa terrasse, toits jaunes */}
        {hall.vis && <group position={[0, 0.06, hall.z]} scale={[hall.sx, hall.sx, hall.sz]}><Batiment w={0.24} d={0.11} h={0.07} toitMat={m.jaune} m={m} socle={0.04} /></group>}
        <Onde k={hall.onde} r={0.35} p={[0, 0.06]} />
      </group>
      <CamRig pos={cam} look={look} />
    </>
  );
};
export const CamRig: React.FC<{ pos: THREE.Vector3; look: THREE.Vector3 }> = ({ pos, look }) => {
  const { camera } = useThree();
  camera.up.set(0, 0, 1); camera.position.copy(pos); camera.lookAt(look); camera.updateProjectionMatrix();
  return null;
};

export const EssaiPekin3D: React.FC = () => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig(), t = f / fps;
  const [h] = useState(() => delayRender('textures'));
  const [tx, setTx] = useState<{ tex: THREE.Texture; paper: THREE.Texture } | null>(null);
  useEffect(() => {
    const L = new THREE.TextureLoader();
    Promise.all([staticFile(`cartes/${carte(CARTE).peinte}`), staticFile('shuimo/paper.jpg')].map((u) => L.loadAsync(u))).then(([tex, paper]) => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; paper.colorSpace = THREE.SRGBColorSpace;
      paper.wrapS = paper.wrapT = THREE.RepeatWrapping; paper.repeat.set(6, 6);
      setTx({ tex, paper }); continueRender(h);
    });
  }, [h]);
  return (
    <AbsoluteFill style={{ background: COUL.sol }}>
      {tx && <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true }} camera={{ fov: 30, position: [0, -5, 9], near: 0.02, far: 80 }}><Scene t={t} tex={tx.tex} paper={tx.paper} /></ThreeCanvas>}
      {/* papier en surimpression et vignettage : le relief reste « peint » */}
      <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.22 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(60,40,20,0.35) 100%)' }} />
    </AbsoluteFill>
  );
};
