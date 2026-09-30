// Objet en 3D (Three.js) : le vase ding en bronze (Zhou), qui remplace le dessin 2D au même instant
// du récit. (La carapace de divination est désormais un extrait vidéo : ../Divination.tsx.)
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { anchor, sceneTime } from '../legacy';
import { Ding3D } from './Ding3D';

export const Props3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  // vase : de « Sur le bronze des vases rituels » jusqu'à la métamorphose du signe
  const d0 = anchor(3, 2.85), d1 = anchor(3, 5.75);

  let content: React.ReactNode = null;
  let opacity = 1;
  if (t >= d0 && t < d1) {
    const vt = sceneTime(3, t);
    opacity = interpolate(vt, [2.85, 3.3, 5.45, 5.75], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    content = <Ding3D t={t} vt={vt} />;
  }
  if (!content) return null;
  return (
    <AbsoluteFill style={{ opacity }}>
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, position: [0, 0, 12] }}>
        {content}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
