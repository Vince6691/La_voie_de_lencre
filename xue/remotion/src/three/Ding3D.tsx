// Vase tripode ding en bronze patiné : panse tournée (LatheGeometry), trois pieds, deux anses,
// frise de masques taotie stylisée, inscription coulée au fond du vase (comme sur les vrais ding).
// Plan en trois temps : le vase monte en tournant, la caméra s'élève au-dessus du bord,
// puis plonge vers l'inscription.
import React, { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { interpolate, Easing } from 'remotion';
import { W } from '../legacy';

const clamp01 = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const patina = () => {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 1024;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#6e9480'); grad.addColorStop(0.5, '#4a6d5d'); grad.addColorStop(1, '#2d463b');
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // frise : motifs « leiwen » en creux sur la partie haute de la panse
  const y0 = 150, y1 = 330;
  g.fillStyle = 'rgba(20,38,30,0.9)'; g.fillRect(0, y0 - 14, 2048, 8); g.fillRect(0, y1 + 6, 2048, 8);
  g.strokeStyle = 'rgba(18,34,27,0.95)'; g.lineWidth = 9;
  for (let x = 0; x < 2048; x += 128) {
    g.beginPath();
    g.moveTo(x + 20, y0 + 20); g.lineTo(x + 108, y0 + 20); g.lineTo(x + 108, y1 - 20); g.lineTo(x + 20, y1 - 20); g.lineTo(x + 20, y0 + 60);
    g.lineTo(x + 70, y0 + 60); g.lineTo(x + 70, y1 - 60); g.lineTo(x + 45, y1 - 60); g.stroke();
  }
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = rnd() < 0.75 ? `rgba(150,205,175,${0.12 + rnd() * 0.2})` : `rgba(196,150,86,${0.1 + rnd() * 0.2})`;
    g.beginPath(); g.arc(rnd() * 2048, rnd() * 1024, 1 + rnd() * 7, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
};

// fond du vase avec le signe 學 (forme des bronzes) en creux
const inscription = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(512, 512, 50, 512, 512, 520);
  rg.addColorStop(0, '#557a68'); rg.addColorStop(1, '#2a4136');
  g.fillStyle = rg; g.fillRect(0, 0, 1024, 1024);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = rnd() < 0.8 ? `rgba(150,205,175,${0.1 + rnd() * 0.2})` : `rgba(196,150,86,${0.1 + rnd() * 0.15})`;
    g.beginPath(); g.arc(rnd() * 1024, rnd() * 1024, 1 + rnd() * 5, 0, 7); g.fill();
  }
  const E = W().E;
  const G = E.prepare(W().GLYPHS.bronze);
  // lèvre claire décalée puis creux sombre : effet de signe coulé en creux
  E.drawGlyph(g, G, { x: 518, y: 520, size: 700, color: () => 'rgba(190,225,200,0.35)' });
  E.drawGlyph(g, G, { x: 512, y: 512, size: 700, color: () => '#132019' });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const Ding3D: React.FC<{ t: number; vt: number }> = ({ vt }) => {
  const { camera } = useThree();
  const { body, mat, floor } = useMemo(() => {
    const prof = [
      [0.0, -0.95], [0.7, -0.9], [1.3, -0.65], [1.72, -0.15], [1.93, 0.45], [2.0, 0.95], [2.08, 1.12], [2.16, 1.24], [2.02, 1.26], [1.92, 1.12],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const body = new THREE.LatheGeometry(prof, 96);
    const map = patina();
    const mat = new THREE.MeshStandardMaterial({ map, metalness: 0.55, roughness: 0.5, side: THREE.DoubleSide, bumpMap: map, bumpScale: 1.2 });
    const insc = inscription();
    const floor = new THREE.MeshStandardMaterial({ map: insc, bumpMap: insc, bumpScale: 3, metalness: 0.45, roughness: 0.6 });
    return { body, mat, floor };
  }, []);

  // 1) montée et rotation, 2) la caméra s'élève au-dessus du bord, 3) plongée sur l'inscription
  const rise = interpolate(vt, [2.85, 3.7], [0, 1], { ...clamp01, easing: Easing.out(Easing.cubic) });
  const crane = interpolate(vt, [4.0, 5.0], [0, 1], { ...clamp01, easing: Easing.inOut(Easing.cubic) });
  const dive = interpolate(vt, [4.9, 5.7], [0, 1], { ...clamp01, easing: Easing.inOut(Easing.cubic) });
  const rotY = 0.5 + vt * 0.35;
  const camY = interpolate(crane, [0, 1], [0.6, 7.2]) - 2.6 * dive;
  const camZ = interpolate(crane, [0, 1], [11.5, 5.2]) - 3.0 * dive;
  camera.position.set(0, camY, camZ);
  camera.lookAt(0, interpolate(crane, [0, 1], [0, -0.5]), 0);
  const legs = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2 + Math.PI / 6);

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[-5, 8, 7]} intensity={2.6} color="#ffd9a0" />
      <directionalLight position={[5, 2, -6]} intensity={1.8} color="#7fe0c8" />
      <pointLight position={[0, 3 + 2 * crane, 1]} intensity={3 + 5 * crane} distance={10} color="#ffcf90" />
      <group position={[0, -0.4 - 1.4 * (1 - rise), 0]} rotation={[0.12 * (1 - crane), rotY, 0]}>
        <mesh geometry={body} material={mat} />
        <mesh material={floor} position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.2, 64]} />
        </mesh>
        {legs.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 1.12, -1.45, Math.sin(a) * 1.12]} material={mat}>
            <cylinderGeometry args={[0.2, 0.15, 1.9, 24]} />
          </mesh>
        ))}
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 1.6, 1.62, 0]}>
            <mesh position={[-0.24, 0, 0]} material={mat}><boxGeometry args={[0.12, 0.8, 0.3]} /></mesh>
            <mesh position={[0.24, 0, 0]} material={mat}><boxGeometry args={[0.12, 0.8, 0.3]} /></mesh>
            <mesh position={[0, 0.4, 0]} material={mat}><boxGeometry args={[0.6, 0.14, 0.3]} /></mesh>
          </group>
        ))}
      </group>
    </>
  );
};
