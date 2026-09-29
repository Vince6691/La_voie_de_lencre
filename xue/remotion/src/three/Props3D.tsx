// Objets en 3D (Three.js) : la carapace de divination (Shang) et le vase ding en bronze (Zhou).
// Ils remplacent les dessins 2D correspondants, aux mêmes instants du récit.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { anchor, sceneTime } from '../legacy';
import { Plastron3D } from './Plastron3D';
import { Ding3D } from './Ding3D';

export const Props3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  // carapace : de « Les devins gravent… » jusqu'au gros plan sur le signe
  const p0 = anchor(2, 4.75), p1 = anchor(2, 9.85);
  // vase : de « Sur le bronze des vases rituels » jusqu'à la métamorphose du signe
  const d0 = anchor(3, 2.85), d1 = anchor(3, 5.75);

  let content: React.ReactNode = null;
  let opacity = 1;
  if (t >= p0 && t < p1) {
    const vt = sceneTime(2, t);
    opacity = interpolate(vt, [5.1, 5.45, 9.3, 9.85], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    content = <Plastron3D t={t} vt={vt} />;
  } else if (t >= d0 && t < d1) {
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
