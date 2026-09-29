// Plastron de tortue bombé : la texture (os, sillons, creusets, craquelures 卜 et lueur du feu)
// est dessinée à chaque image par le moteur 2D puis plaquée sur un maillage en dôme.
import React, { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { interpolate, Easing } from 'remotion';
import { W } from '../legacy';

const S = 1024;
const clamp01 = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const seg = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

export const Plastron3D: React.FC<{ t: number; vt: number }> = ({ t, vt }) => {
  const { camera } = useThree();
  const { canvas, texture, geometry } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    // plan finement subdivisé, bombé comme une carapace (plus haut au centre)
    const geometry = new THREE.PlaneGeometry(6, 6, 160, 160);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / 2.6, y = pos.getY(i) / 2.9;
      const r2 = x * x + y * y;
      pos.setZ(i, 0.55 * Math.max(0, 1 - r2) ** 0.8 + 0.03 * Math.sin(x * 9) * Math.sin(y * 7));
    }
    geometry.computeVertexNormals();
    return { canvas, texture, geometry };
  }, []);

  const crack = seg(vt, 5.6, 7.6);
  const heat = seg(vt, 5.2, 6.0) * (1 - seg(vt, 7.4, 8.4));
  useLayoutEffect(() => {
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, S, S);
    W().PROPS.plastron(ctx, t, S / 2, S / 2, 1.5, crack, heat);
    texture.needsUpdate = true;
  }, [t, crack, heat, canvas, texture]);

  // caméra : plongée oblique, léger travelling, puis face-à-face rapproché sur « Là, naît le signe »
  const push = interpolate(vt, [8.0, 9.8], [0, 1], { ...clamp01, easing: Easing.inOut(Easing.cubic) });
  const tilt = interpolate(vt, [4.75, 8.0], [-0.62, -0.42], clamp01) * (1 - push);
  const spin = interpolate(vt, [4.75, 8.0], [-0.12, 0.08], clamp01) * (1 - push);
  camera.position.set(0.3 * (1 - push), -0.2 * push, interpolate(push, [0, 1], [13.2, 4.4]));
  camera.lookAt(0, -0.05 * push, 0);
  const flicker = heat * (1.6 + 0.6 * Math.sin(t * 23) + 0.4 * Math.sin(t * 37 + 1));

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 5, 7]} intensity={2.2} color="#ffe2b8" />
      <directionalLight position={[5, -2, 4]} intensity={0.5} color="#9fb7ff" />
      <pointLight position={[0, -1.2, 1.6]} intensity={flicker * 2.5} distance={8} color="#ff7a1c" />
      <mesh geometry={geometry} rotation={[tilt, spin, spin * 0.6]} position={[0, 0.5 * (1 - push) + 0.15 * push, 0]}>
        <meshStandardMaterial map={texture} bumpMap={texture} bumpScale={0.8} roughness={0.72} metalness={0} transparent alphaTest={0.5} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
};
