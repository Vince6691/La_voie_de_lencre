// Transition « goutte d'encre » : à la fin d'une scène, une goutte tombe et s'épanouit dans le papier
// mouillé — cœur d'encre dense, halo de lavis plus clair, bords rendus fluides par une turbulence,
// quelques gouttes satellites — jusqu'à couvrir l'écran ; puis l'encre s'ouvre en son centre sur la
// scène suivante, en laissant un liseré de lavis qui s'efface.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise2D } from '@remotion/noise';
import { W } from './legacy';

const IN = 0.55;
const OUT = 0.7;
const R = 1300;
const INK = '#070504';

const blob = (cx: number, cy: number, r: number, seed: string, t: number) => {
  const n = 140;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.18 * noise2D(seed, Math.cos(a) * 1.4 + t * 0.6, Math.sin(a) * 1.4) + 0.06 * noise2D(seed + 'f', Math.cos(a) * 5, Math.sin(a) * 5 + t);
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r * k).toFixed(1)},${(cy + Math.sin(a) * r * k).toFixed(1)}`;
  }
  return d + 'Z';
};

// bords fluides : turbulence + déplacement, puis léger flou (encre qui boit le papier)
const Filters: React.FC<{ id: string; seed: number }> = ({ id, seed }) => (
  <defs>
    <filter id={`${id}-edge`} x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves={3} seed={seed} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={70} xChannelSelector="R" yChannelSelector="G" result="d" />
      <feGaussianBlur in="d" stdDeviation={2.2} />
    </filter>
    <filter id={`${id}-halo`} x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves={2} seed={seed + 7} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={110} xChannelSelector="R" yChannelSelector="G" result="d" />
      <feGaussianBlur in="d" stdDeviation={18} />
    </filter>
  </defs>
);

export const InkWipes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const bounds: [number, number][] = W().SCENE_BOUNDS;
  const b = bounds.map(([a]) => a).filter((a) => a > 0).find((a) => t > a - IN && t < a + OUT);
  if (b === undefined) return null;
  const seed = `ink${b.toFixed(2)}`;
  const sn = Math.round(Math.abs(noise2D(seed, 3, 3)) * 97) + 1;
  const id = `w${sn}`;
  const cx = width / 2 + noise2D(seed, 1, 1) * 320;
  const cy = height / 2 + noise2D(seed, 2, 2) * 160;
  // gouttes satellites autour du point d'impact
  const drops = [0, 1, 2, 3, 4].map((i) => {
    const a = noise2D(seed + 'a', i, 0) * Math.PI * 2, d = 260 + (noise2D(seed + 'd', i, 1) + 1) * 220;
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.7, r: 26 + (noise2D(seed + 'r', i, 2) + 1) * 34, lag: 0.15 + i * 0.07 };
  });

  if (t <= b) {
    const u = interpolate(t, [b - IN, b], [0, 1], { easing: Easing.in(Easing.cubic) });
    return (
      <AbsoluteFill>
        <svg width={width} height={height}>
          <Filters id={id} seed={sn} />
          {/* halo de lavis qui précède l'encre dense */}
          <path d={blob(cx, cy, R * 1.12 * u, seed + 'h', u)} fill={INK} opacity={0.35} filter={`url(#${id}-halo)`} />
          <g filter={`url(#${id}-edge)`}>
            <path d={blob(cx, cy, R * u, seed, u)} fill={INK} />
            {drops.map((p, i) => {
              const v = interpolate(u, [0, p.lag, 1], [0, 1, 1.6], { extrapolateRight: 'clamp' });
              return <circle key={i} cx={p.x} cy={p.y} r={p.r * v} fill={INK} />;
            })}
          </g>
        </svg>
      </AbsoluteFill>
    );
  }
  const u = interpolate(t, [b, b + OUT], [0, 1], { easing: Easing.out(Easing.cubic) });
  const hole = blob(cx, cy, R * 1.3 * u, seed + 'o', u);
  return (
    <AbsoluteFill>
      <svg width={width} height={height}>
        <Filters id={id} seed={sn} />
        {/* liseré de lavis autour de l'ouverture, qui s'efface */}
        <path d={`M-200,-200H${width + 200}V${height + 200}H-200Z ${blob(cx, cy, R * 1.3 * u * 0.94, seed + 'o', u)}`} fill={INK} fillRule="evenodd" opacity={0.3 * (1 - u)} filter={`url(#${id}-halo)`} />
        <path d={`M-200,-200H${width + 200}V${height + 200}H-200Z ${hole}`} fill={INK} fillRule="evenodd" filter={`url(#${id}-edge)`} />
      </svg>
    </AbsoluteFill>
  );
};
