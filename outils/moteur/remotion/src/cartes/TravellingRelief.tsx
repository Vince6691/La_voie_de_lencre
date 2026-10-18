// Essai : travelling sur la carte peinte qui se soulève en relief doux (skill carte-peinte). La carte, plate vue de
// dessus, se soulève pendant la bascule (relief artistique : assets/cartes/reliefs/<id>.png, tools/build_relief.py) ;
// la caméra file à basse altitude de Chang'an à Pékin par-dessus le Taihang, entre des nappes de brume.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { carte } from './CartePeinte';
import { BJ, CA, CARTE, COUL, CamRig, ease, lerp, seg } from './Pekin3D';

export const TRAVELLING_SECONDS = 8;
const HMAX = 0.3; // hauteur du point le plus haut (6000 m), carte de 16 × 9 : relief doux
const T = { bascule: 1.0, leve: [1.2, 3.0], chang: 3.2, pekin: 7.4 };
type Data = { geo: THREE.BufferGeometry; tex: THREE.Texture; paper: THREE.Texture; brume: THREE.Texture };

// maillage 16 × 9 aux pixels de la carte des hauteurs ; z = hauteur (on anime l'échelle z pour le soulèvement)
const terrain = (img: HTMLImageElement) => {
  const w = img.width, h = img.height, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!; c.drawImage(img, 0, 0);
  const px = c.getImageData(0, 0, w, h).data;
  const g = new THREE.PlaneGeometry(16, 9, w - 1, h - 1), pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, (px[i * 4] / 255) * HMAX);
  g.computeVertexNormals();
  return g;
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

// nappes de brume le long du trajet (position, taille, hauteur)
const BRUMES: [number, number, number, number][] = [[1.6, 3.0, 1.6, 0.18], [-0.9, 0.6, 1.4, 0.22], [-0.2, 1.1, 1.8, 0.3], [0.4, 1.9, 1.5, 0.26], [0.9, 2.2, 2.0, 0.34], [-1.6, 1.6, 1.6, 0.28], [1.4, 1.2, 1.4, 0.2], [0.2, 3.3, 2.2, 0.32]];

const Scene: React.FC<{ t: number; d: Data }> = ({ t, d }) => {
  const rise = ease(seg(t, T.leve[0], T.leve[1]));
  const kb = ease(seg(t, T.bascule, T.chang)), kt = ease(seg(t, T.chang, T.pekin));
  const dir = Math.atan2(BJ[1] - CA[1], BJ[0] - CA[0]);
  // cible : centre de la carte → Chang'an → Pékin ; caméra derrière la cible, dans l'axe du trajet
  const lx = kt > 0 ? lerp(CA[0], BJ[0], kt) : lerp(0, CA[0], kb), ly = kt > 0 ? lerp(CA[1], BJ[1], kt) : lerp(0, CA[1], kb);
  const look = new THREE.Vector3(lx, ly, 0.06 * kb);
  const dist = lerp(17, 3.3, Math.pow(kb, 0.6)) + 0.15 * Math.sin(kt * Math.PI);
  const elev = lerp(Math.PI / 2 - 0.02, 0.42, kb) + 0.04 * Math.sin(kt * Math.PI);
  const az = lerp(-Math.PI / 2, dir - Math.PI, kb);
  const cam = new THREE.Vector3(look.x + dist * Math.cos(elev) * Math.cos(az), look.y + dist * Math.cos(elev) * Math.sin(az), look.z + dist * Math.sin(elev));
  const fogA = lerp(30, dist + 0.8, kb), fogB = lerp(60, dist + 9, kb);
  return (
    <>
      <color attach="background" args={[COUL.sol]} />
      <fog attach="fog" args={[COUL.sol, fogA, fogB]} />
      <ambientLight intensity={0.95} />
      {/* lumière rasante du nord-ouest : ombre les versants sud-est */}
      <directionalLight position={[-5, 4, 3]} intensity={0.5} />
      <mesh position={[0, 0, -0.01]}><planeGeometry args={[80, 80]} /><meshBasicMaterial map={d.paper} color="#efe6d2" /></mesh>
      <mesh geometry={d.geo} scale={[1, 1, Math.max(0.001, rise)]}><meshLambertMaterial map={d.tex} /></mesh>
      {BRUMES.map(([x, y, s, z], i) => {
        const a = 0.4 * seg(t, T.leve[0] + 0.6, T.chang + 0.4);
        return a > 0 ? (
          <mesh key={i} position={[x + 0.05 * t, y, z * rise]}>
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
  const [h] = useState(() => delayRender('relief'));
  const [d, setD] = useState<Data | null>(null);
  const brume = useMemo(() => tacheBrume(), []);
  useEffect(() => {
    const c = carte(CARTE) as any, L = new THREE.TextureLoader();
    const img = new Image();
    const reliefP = new Promise<HTMLImageElement>((res) => { img.onload = () => res(img); img.src = staticFile(`cartes/${c.relief}`); });
    Promise.all([reliefP, L.loadAsync(staticFile(`cartes/${c.peinte}`)), L.loadAsync(staticFile('shuimo/paper.jpg'))]).then(([im, tex, paper]) => {
      tex.colorSpace = paper.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      paper.wrapS = paper.wrapT = THREE.RepeatWrapping; paper.repeat.set(8, 8);
      setD({ geo: terrain(im), tex, paper, brume }); continueRender(h);
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
