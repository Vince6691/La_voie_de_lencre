// Essai : travelling sur la carte peinte, plate, où un petit sommet 3D pousse sur chaque montagne dessinée (skill
// carte-peinte ; positions : assets/cartes/sommets/<id>.json, tools/build_sommets.py). La carte vue de dessus bascule,
// les sommets sortent du papier en vague, puis la caméra file à basse altitude de Chang'an à Pékin, entre des nappes
// de brume. Sommets : cônes irréguliers, couleurs bleu-vert des montagnes peintes.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { carte } from './CartePeinte';
import { BJ, CA, CARTE, COUL, CamRig, ease, lerp, out3, seg } from './Pekin3D';

export const TRAVELLING_SECONDS = 8;
const T = { bascule: 1.0, pousse: [1.3, 3.2], chang: 3.2, pekin: 7.4 };
type Data = { tex: THREE.Texture; paper: THREE.Texture; brume: THREE.Texture; sommets: number[][] };

// sommet : cône à profil creusé (comme les pics peints), sommet décalé, flancs bosselés ; couleurs par sommet (base ocre-gris → malachite → azurite)
const formeSommet = (seed: number) => {
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  // profil de révolution (rayon, hauteur), flanc creusé ; tourné autour de l'axe vertical
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) { const z = i / 10; prof.push(new THREE.Vector2(Math.max(0.001, Math.pow(1 - z, 1.25)), z)); }
  const g = new THREE.LatheGeometry(prof, 16).rotateX(Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute, col: number[] = [];
  const base = new THREE.Color('#b9ad8f'), mid = new THREE.Color('#7fa08a'), haut = new THREE.Color('#6d8a9a'), c = new THREE.Color();
  const dx = (r() - 0.5) * 0.35, dy = (r() - 0.5) * 0.35, ph = r() * 6.28;
  for (let i = 0; i < p.count; i++) {
    // après rotateX, la hauteur du profil est sur z ; bosses douces selon l'angle, sommet un peu décalé
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ang = Math.atan2(y, x);
    const k = 1 + 0.09 * Math.sin(3 * ang + ph) + 0.05 * Math.sin(5 * ang + 2 * ph);
    p.setXYZ(i, x * k + dx * z, y * k + dy * z, z);
    if (z < 0.4) c.copy(base).lerp(mid, z / 0.4); else c.copy(mid).lerp(haut, (z - 0.4) / 0.6);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};

const Sommets: React.FC<{ t: number; pts: number[][] }> = ({ t, pts }) => {
  const d = useMemo(() => {
    const formes = [11, 23, 37].map(formeSommet);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    // répartition des sommets entre les trois formes ; taille d'après la densité de peinture
    const grp = formes.map((geo, f) => {
      const mine = pts.filter((_, i) => i % 3 === f);
      const inst = new THREE.InstancedMesh(geo, mat, mine.length);
      return { inst, mine };
    });
    return { grp };
  }, [pts]);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  d.grp.forEach(({ inst, mine }) => {
    mine.forEach(([x, y, sz], i) => {
      const X = (x - 960) / 120, Y = (540 - y) / 120;
      // vague de pousse d'ouest en est (dans le sens du trajet), un peu de hasard
      const at = lerp(T.pousse[0], T.pousse[1] - 0.6, (X + 8) / 16) + ((i * 7919) % 100) / 400;
      const k = out3(seg(t, at, at + 0.6)), rr = 0.06 * (0.75 + 0.6 * sz), hh = rr * (1.35 + 0.5 * sz) * Math.max(0.001, k);
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), i * 1.3);
      p.set(X, Y, 0); s.set(rr, rr, hh); M.compose(p, q, s); inst.setMatrixAt(i, M);
    });
    inst.instanceMatrix.needsUpdate = true;
  });
  return <>{d.grp.map(({ inst }, i) => <primitive key={i} object={inst} />)}</>;
};

// tache de brume (dégradé radial), pour les nappes
const tacheBrume = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d')!, gr = c.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, 'rgba(246,240,228,0.9)'); gr.addColorStop(0.5, 'rgba(246,240,228,0.45)'); gr.addColorStop(1, 'rgba(246,240,228,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const BRUMES: [number, number, number, number][] = [[1.6, 3.0, 1.6, 0.16], [-0.9, 0.6, 1.4, 0.2], [-0.2, 1.1, 1.8, 0.24], [0.4, 1.9, 1.5, 0.2], [0.9, 2.2, 2.0, 0.26], [-1.6, 1.6, 1.6, 0.22], [1.4, 1.2, 1.4, 0.18], [0.2, 3.3, 2.2, 0.24]];

const Scene: React.FC<{ t: number; d: Data }> = ({ t, d }) => {
  const kb = ease(seg(t, T.bascule, T.chang)), kt = ease(seg(t, T.chang, T.pekin));
  const dir = Math.atan2(BJ[1] - CA[1], BJ[0] - CA[0]);
  // cible : centre de la carte → Chang'an → Pékin ; caméra derrière la cible, dans l'axe du trajet
  const lx = kt > 0 ? lerp(CA[0], BJ[0], kt) : lerp(0, CA[0], kb), ly = kt > 0 ? lerp(CA[1], BJ[1], kt) : lerp(0, CA[1], kb);
  const look = new THREE.Vector3(lx, ly, 0.04 * kb);
  const dist = lerp(17, 3.0, Math.pow(kb, 0.6)) + 0.15 * Math.sin(kt * Math.PI);
  const elev = lerp(Math.PI / 2 - 0.02, 0.4, kb) + 0.04 * Math.sin(kt * Math.PI);
  const az = lerp(-Math.PI / 2, dir - Math.PI, kb);
  const cam = new THREE.Vector3(look.x + dist * Math.cos(elev) * Math.cos(az), look.y + dist * Math.cos(elev) * Math.sin(az), look.z + dist * Math.sin(elev));
  const fogA = lerp(30, dist + 0.8, kb), fogB = lerp(60, dist + 9, kb);
  return (
    <>
      <color attach="background" args={[COUL.sol]} />
      <fog attach="fog" args={[COUL.sol, fogA, fogB]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[-4, -3, 5]} intensity={0.9} />
      <mesh position={[0, 0, -0.01]}><planeGeometry args={[80, 80]} /><meshBasicMaterial map={d.paper} color="#efe6d2" /></mesh>
      <mesh><planeGeometry args={[16, 9]} /><meshBasicMaterial map={d.tex} /></mesh>
      <Sommets t={t} pts={d.sommets} />
      {BRUMES.map(([x, y, s, z], i) => {
        const a = 0.38 * seg(t, T.pousse[0] + 0.6, T.chang + 0.4);
        return a > 0 ? (
          <mesh key={i} position={[x + 0.05 * t, y, z]}>
            <planeGeometry args={[s, s * 0.55]} /><meshBasicMaterial map={d.brume} transparent opacity={a} depthWrite={false} />
          </mesh>
        ) : null;
      })}
      <CamRig pos={cam} look={look} />
    </>
  );
};

export const EssaiTravelling: React.FC = () => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig(), t = f / fps;
  const [h] = useState(() => delayRender('carte et sommets'));
  const [d, setD] = useState<Data | null>(null);
  const brume = useMemo(() => tacheBrume(), []);
  useEffect(() => {
    const c = carte(CARTE) as any, L = new THREE.TextureLoader();
    Promise.all([fetch(staticFile(`cartes/${c.sommets}`)).then((r) => r.json()), L.loadAsync(staticFile(`cartes/${c.peinte}`)), L.loadAsync(staticFile('shuimo/paper.jpg'))]).then(([sommets, tex, paper]) => {
      tex.colorSpace = paper.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      paper.wrapS = paper.wrapT = THREE.RepeatWrapping; paper.repeat.set(8, 8);
      setD({ sommets, tex, paper, brume }); continueRender(h);
    });
  }, [h, brume]);
  return (
    <AbsoluteFill style={{ background: COUL.sol }}>
      {d && <ThreeCanvas width={width} height={height} flat gl={{ antialias: true }} camera={{ fov: 32, position: [0, -5, 9], near: 0.02, far: 120 }}><Scene t={t} d={d} /></ThreeCanvas>}
      <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.16 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(60,40,20,0.32) 100%)' }} />
    </AbsoluteFill>
  );
};
