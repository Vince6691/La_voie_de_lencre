// Événements d'encre du fond : goutte qui tombe et s'étale dans le papier mouillé, trait de pinceau lisse
// qui traverse un bord, lavis gris plus large. L'encre ne disparaît pas : elle sèche et pâlit.
import React from 'react';
import { noise2D } from '@remotion/noise';
import { H, InkEvent, W, rng } from './layout';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

const blob = (cx: number, cy: number, r: number, seed: string, g: number) => {
  let d = '';
  for (let i = 0; i <= 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const k = 1 + 0.2 * noise2D(seed, Math.cos(a) * 1.3, Math.sin(a) * 1.3 + g * 0.4) + 0.07 * noise2D(seed + 'f', Math.cos(a) * 5, Math.sin(a) * 5);
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r * k).toFixed(1)},${(cy + Math.sin(a) * r * k).toFixed(1)}`;
  }
  return d + 'Z';
};

// trait effilé : contour d'une courbe de Bézier épaissie (plein au milieu, pointes fines), tracé jusqu'à p
const strokePath = (e: InkEvent, p: number, len: number, width: number) => {
  const R = rng(e.seed);
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle);
  const P = (u: number, v: number) => [e.x + ca * u - sa * v, e.y + sa * u + ca * v];
  const b1 = (R() - 0.5) * len * 0.5, b2 = (R() - 0.5) * len * 0.5;
  const pts = [P(0, 0), P(len * 0.33, b1), P(len * 0.66, b2), P(len, (R() - 0.5) * len * 0.2)];
  const at = (s: number) => {
    const m = 1 - s;
    const k = [m * m * m, 3 * m * m * s, 3 * m * s * s, s * s * s];
    return [0, 1].map((j) => k.reduce((acc, kk, i) => acc + kk * pts[i][j], 0));
  };
  const N = 48, L: number[][] = [], Rt: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * p;
    const [x, y] = at(s), [x2, y2] = at(Math.min(1, s + 0.01));
    const nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1;
    const w = width * (0.15 + 0.85 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05)), 0.6)) * (1 - 0.35 * s);
    L.push([x + (nx / nl) * w / 2, y + (ny / nl) * w / 2]);
    Rt.push([x - (nx / nl) * w / 2, y - (ny / nl) * w / 2]);
  }
  const all = [...L, ...Rt.reverse()];
  return all.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + 'Z';
};

export const InkEvents: React.FC<{ events: InkEvent[]; t: number; night?: boolean }> = ({ events, t, night }) => {
  const ink = night ? '#0d0f14' : '#1b1814';
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <filter id="ink-edge" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={7} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={1.2} />
        </filter>
        <filter id="ink-halo" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={2} seed={9} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={40} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={9} />
        </filter>
      </defs>
      {events.map((e, i) => {
        const a = t - e.t;
        if (a <= 0) return null;
        const dry = clamp((a - 1.2) / 3.5);
        if (e.type === 'drop') {
          // encre diluée : cœur dégradé, bord un peu plus sombre (l'encre s'accumule en séchant), large auréole
          const g = easeOut(a / 1.3), r = 85 * e.size * (0.15 + 0.85 * g);
          const R = rng(e.seed);
          const sats = [0, 1].map(() => ({ ang: R() * 6.28, d: r * (1.5 + R()), rr: 4 + R() * 8 }));
          const id = `drop${e.seed}`;
          const core = blob(e.x, e.y, r, `d${e.seed}`, g);
          return (
            <g key={i} opacity={0.8 - 0.45 * dry}>
              <defs>
                <radialGradient id={id} cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor={ink} stopOpacity={0.62} />
                  <stop offset="70%" stopColor={ink} stopOpacity={0.38} />
                  <stop offset="100%" stopColor={ink} stopOpacity={0.55} />
                </radialGradient>
              </defs>
              <path d={blob(e.x, e.y, r * 1.7, `h${e.seed}`, g)} fill={ink} opacity={0.16} filter="url(#ink-halo)" />
              <g filter="url(#ink-edge)">
                <path d={core} fill={`url(#${id})`} />
                <path d={core} fill="none" stroke={ink} strokeOpacity={0.35} strokeWidth={2.5} />
                {sats.map((s, j) => (
                  <circle key={j} cx={e.x + Math.cos(s.ang) * s.d} cy={e.y + Math.sin(s.ang) * s.d} r={s.rr * clamp((a - 0.2 - j * 0.1) / 0.5) * e.size} fill={ink} opacity={0.5} />
                ))}
              </g>
            </g>
          );
        }
        const wash = e.type === 'wash';
        const p = easeInOut(clamp(a / (wash ? 1.4 : 0.9)));
        const d = strokePath(e, p, (wash ? 520 : 420) * e.size, (wash ? 70 : 20) * e.size);
        return (
          <g key={i} opacity={(wash ? 0.3 : 0.72) - (wash ? 0.12 : 0.4) * dry}>
            {wash && <path d={d} fill={ink} opacity={0.6} filter="url(#ink-halo)" />}
            <path d={d} fill={ink} filter="url(#ink-edge)" />
          </g>
        );
      })}
    </svg>
  );
};
