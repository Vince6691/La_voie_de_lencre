// Essai : Pékin en images plates sur la carte peinte. Même bascule que l'essai 3D (Pekin3D) ; les murailles sont des
// panneaux peints (tuile de rempart, Nano Banana) dressés le long du 凸 qui sortent de terre côté par côté, la porte
// Zhengyang est un panneau tourné vers la caméra qui tombe du ciel. Images détourées par tools/detourer_magenta.py.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { carte } from './CartePeinte';
import { BJ, CARTE, COUL, CamRig, ECH, Onde, chute, ease, lerp, out3, seg } from './Pekin3D';

export const PEKINPLAT_SECONDS = 8;
const T = { bascule: 1.0, arrivee: 3.8, murs: 3.4, porte: 5.0 };
const IMGS = { tuile: 'episodes/yu/images/pekin_muraille_tuile.png', porte: 'episodes/yu/images/pekin_zhengyangmen.png' };
type Tex = { carte: THREE.Texture; paper: THREE.Texture; tuile: THREE.Texture; porte: THREE.Texture };

// 凸 : ville intérieure (nord) et ville extérieure (sud), en unités locales (avant ECH) ; un côté = un panneau
const IW = 1.2, IH = 0.97, OW = 1.45, OH = 0.56, HM = 0.13;
const COTES: [number, number, number, number][] = [
  // ville intérieure : nord, est, ouest ; le côté sud est partagé avec la ville extérieure
  [-IW / 2, IH / 2, IW / 2, IH / 2], [IW / 2, IH / 2, IW / 2, -IH / 2], [-IW / 2, -IH / 2, -IW / 2, IH / 2],
  [-IW / 2, -IH / 2, IW / 2, -IH / 2],
  // ville extérieure : ouest, sud, est, retours vers la ville intérieure
  [-OW / 2, -IH / 2 - OH, -OW / 2, -IH / 2], [-OW / 2, -IH / 2 - OH, OW / 2, -IH / 2 - OH], [OW / 2, -IH / 2 - OH, OW / 2, -IH / 2],
  [-OW / 2, -IH / 2, -IW / 2, -IH / 2], [IW / 2, -IH / 2, OW / 2, -IH / 2],
];

const Panneau: React.FC<{ c: [number, number, number, number]; tuile: THREE.Texture; k: number }> = ({ c, tuile, k }) => {
  const [x0, y0, x1, y1] = c, L = Math.hypot(x1 - x0, y1 - y0);
  const tex = useMemo(() => {
    const tw = (HM * tuile.image.width) / tuile.image.height, t = tuile.clone();
    t.wrapS = THREE.RepeatWrapping; t.repeat.set(L / tw, 1); t.needsUpdate = true;
    return t;
  }, [tuile, L]);
  if (k <= 0) return null;
  return (
    <group position={[(x0 + x1) / 2, (y0 + y1) / 2, -HM * (1 - k)]} rotation={[0, 0, Math.atan2(y1 - y0, x1 - x0)]}>
      <mesh position={[0, 0, HM / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <planeGeometry args={[L, HM]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const Scene: React.FC<{ t: number; x: Tex }> = ({ t, x }) => {
  const kb = ease(seg(t, T.bascule, T.arrivee)), orb = ease(seg(t, T.arrivee, PEKINPLAT_SECONDS)) * 0.12;
  const look = new THREE.Vector3(lerp(0, BJ[0], kb), lerp(0, BJ[1] - 0.12, kb), lerp(0, 0.05, kb));
  const dist = lerp(17, 1.6, Math.pow(kb, 0.6)), elev = lerp(Math.PI / 2 - 0.02, 0.42, kb), az = -Math.PI / 2 + lerp(0, 0.12, kb) + orb;
  const cam = new THREE.Vector3(look.x + dist * Math.cos(elev) * Math.cos(az), look.y + dist * Math.cos(elev) * Math.sin(az), dist * Math.sin(elev));
  const g = chute(t, T.porte), pa = x.porte.image.width / x.porte.image.height, PW = 0.62;
  return (
    <>
      <color attach="background" args={[COUL.sol]} />
      <fog attach="fog" args={[COUL.sol, dist + 3, dist + 14]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[-3, -4, 6]} intensity={1.0} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-bias={-0.0004} />
      <mesh position={[0, 0, -0.01]}><planeGeometry args={[60, 60]} /><meshBasicMaterial map={x.paper} color="#efe6d2" /></mesh>
      <mesh receiveShadow><planeGeometry args={[16, 9]} /><meshLambertMaterial map={x.carte} /></mesh>
      <group position={[BJ[0], BJ[1], 0]} scale={[ECH, ECH, ECH]}>
        {/* les côtés montent l'un après l'autre en faisant le tour (nord → est → ouest → sud), 0,5 s chacun */}
        {COTES.map((c, i) => <Panneau key={i} c={c} tuile={x.tuile} k={out3(seg(t, T.murs + i * 0.13, T.murs + i * 0.13 + 0.5))} />)}
        <Onde k={seg(t, T.murs + 0.1, T.murs + 1.6)} r={0.85} p={[0, -0.25]} />
        {/* porte Zhengyang : panneau tourné vers la caméra, devant le rempart sud de la ville intérieure */}
        {g.vis && (
          <group position={[0, -IH / 2 - 0.03, g.z / ECH]} rotation={[0, 0, az + Math.PI / 2]} scale={[g.sx, 1, g.sz]}>
            <mesh position={[0, 0, (PW / pa) / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <planeGeometry args={[PW, PW / pa]} />
              <meshBasicMaterial map={x.porte} transparent alphaTest={0.4} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
        <Onde k={g.onde} r={0.3} p={[0, -IH / 2 - 0.03]} />
      </group>
      <CamRig pos={cam} look={look} />
    </>
  );
};

export const EssaiPekinPlat: React.FC = () => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig(), t = f / fps;
  const [h] = useState(() => delayRender('textures'));
  const [x, setX] = useState<Tex | null>(null);
  useEffect(() => {
    const L = new THREE.TextureLoader();
    Promise.all([`cartes/${carte(CARTE).peinte}`, 'shuimo/paper.jpg', IMGS.tuile, IMGS.porte].map((u) => L.loadAsync(staticFile(u)))).then(([c, paper, tuile, porte]) => {
      [c, paper, tuile, porte].forEach((tx) => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; });
      paper.wrapS = paper.wrapT = THREE.RepeatWrapping; paper.repeat.set(6, 6);
      setX({ carte: c, paper, tuile, porte }); continueRender(h);
    });
  }, [h]);
  return (
    <AbsoluteFill style={{ background: COUL.sol }}>
      {x && <ThreeCanvas width={width} height={height} shadows flat gl={{ antialias: true }} camera={{ fov: 30, position: [0, -5, 9], near: 0.02, far: 80 }}><Scene t={t} x={x} /></ThreeCanvas>}
      <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.18 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(60,40,20,0.35) 100%)' }} />
    </AbsoluteFill>
  );
};
