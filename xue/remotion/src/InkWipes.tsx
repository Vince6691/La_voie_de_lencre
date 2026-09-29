// Transition « tache d'encre » : une tache noire aux bords organiques envahit l'écran à la fin
// d'une scène, puis s'ouvre en son centre sur la scène suivante.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise2D } from '@remotion/noise';
import { W } from './legacy';

const IN = 0.42;
const OUT = 0.6;
const R = 1250;

const blob = (cx: number, cy: number, r: number, seed: string, t: number) => {
  const n = 120;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.22 * noise2D(seed, Math.cos(a) * 1.6 + t, Math.sin(a) * 1.6) + 0.07 * noise2D(seed + 'f', Math.cos(a) * 6, Math.sin(a) * 6);
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r * k).toFixed(1)},${(cy + Math.sin(a) * r * k).toFixed(1)}`;
  }
  return d + 'Z';
};

export const InkWipes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const bounds: [number, number][] = W().SCENE_BOUNDS;
  const b = bounds.map(([a]) => a).filter((a) => a > 0).find((a) => t > a - IN && t < a + OUT);
  if (b === undefined) return null;
  const seed = `ink${b.toFixed(2)}`;
  const cx = width / 2 + noise2D(seed, 1, 1) * 300;
  const cy = height / 2 + noise2D(seed, 2, 2) * 150;
  if (t <= b) {
    const u = interpolate(t, [b - IN, b], [0, 1], { easing: Easing.in(Easing.cubic) });
    return (
      <AbsoluteFill>
        <svg width={width} height={height}>
          <path d={blob(cx, cy, R * u, seed, u)} fill="#050302" />
        </svg>
      </AbsoluteFill>
    );
  }
  const u = interpolate(t, [b, b + OUT], [0, 1], { easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill>
      <svg width={width} height={height}>
        <path d={`M-10,-10H${width + 10}V${height + 10}H-10Z ${blob(cx, cy, R * 1.3 * u, seed + 'o', u)}`} fill="#050302" fillRule="evenodd" />
      </svg>
    </AbsoluteFill>
  );
};
