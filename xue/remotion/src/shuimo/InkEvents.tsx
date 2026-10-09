// Coups de pinceau du fond : un trait lisse qui longe un bord du cadre, avec le profil d'un vrai pinceau —
// attaque appuyée (起筆), corps qui s'affine, sortie effilée (出鋒) — ou un lavis gris plus large.
// L'encre est plus dense à l'attaque, s'éclaircit vers la sortie, puis sèche et pâlit sans disparaître.
import React from 'react';
import { H, InkEvent, W, rng } from './layout';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
// vitesse du pinceau : départ posé, accélération, sortie rapide
const brushEase = (u: number) => { const v = clamp(u); return v < 0.25 ? 2 * v * v : 1 - 0.875 * Math.pow(1 - (v - 0.25) / 0.75, 1.6) * 1; };

// épaisseur le long du trait (s de 0 à 1) ; side ±1 : l'attaque est oblique (un bord démarre avant l'autre),
// le plein arrive vite, puis le trait s'affine longuement jusqu'à une pointe fine
const pressure = (s: number, wash: boolean, side: number) => wash
  ? smooth(0, 0.2, s) * (1 - 0.85 * smooth(0.5, 1, s))
  : smooth(side > 0 ? 0 : 0.035, side > 0 ? 0.06 : 0.12, s) * (0.03 + 0.97 * Math.pow(1 - smooth(0.18, 1, s), 0.85));

function outline(e: InkEvent, p: number, len: number, width: number, wash: boolean) {
  const R = rng(e.seed);
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle);
  const P = (u: number, v: number) => [e.x + ca * u - sa * v, e.y + sa * u + ca * v];
  const bend = (R() < 0.5 ? -1 : 1) * (0.12 + R() * 0.2) * len; // une seule courbe douce, pas de zigzag
  const pts = [P(0, 0), P(len * 0.33, bend * 0.9), P(len * 0.66, bend * 0.75), P(len, bend * 0.15)];
  const at = (s: number) => {
    const m = 1 - s, k = [m * m * m, 3 * m * m * s, 3 * m * s * s, s * s * s];
    return [0, 1].map((j) => k.reduce((acc, kk, i) => acc + kk * pts[i][j], 0));
  };
  const N = 80, L: number[][] = [], Rt: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * p;
    const [x, y] = at(s), [x2, y2] = at(Math.min(1, s + 0.005));
    const nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1;
    // la pointe en cours de tracé reste arrondie (le pinceau est encore posé)
    const head = p < 1 ? smooth(0, 0.03, p - s) * 0.6 + 0.4 : 1;
    const k = i === N && p < 1 ? head : 1;
    const wl = width * pressure(s, wash, 1) * k, wr = width * pressure(s, wash, -1) * k;
    L.push([x + (nx / nl) * wl / 2, y + (ny / nl) * wl / 2]);
    Rt.push([x - (nx / nl) * wr / 2, y - (ny / nl) * wr / 2]);
  }
  const all = [...L, ...Rt.reverse()];
  // contour lissé : courbes quadratiques entre les milieux des points
  let d = `M${all[0][0].toFixed(1)},${all[0][1].toFixed(1)}`;
  for (let i = 1; i < all.length - 1; i++) {
    const mx = (all[i][0] + all[i + 1][0]) / 2, my = (all[i][1] + all[i + 1][1]) / 2;
    d += `Q${all[i][0].toFixed(1)},${all[i][1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  return { d: d + 'Z', from: pts[0], to: pts[3] };
}

export const InkEvents: React.FC<{ events: InkEvent[]; t: number; night?: boolean }> = ({ events, t, night }) => {
  const ink = night ? '#0d0f14' : '#1b1814';
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        {/* bord à peine organique : l'encre boit un peu le papier, le trait reste net */}
        <filter id="brush-edge" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={0.6} />
        </filter>
        <filter id="brush-wash" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves={2} seed={8} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={18} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={5} />
        </filter>
      </defs>
      {events.map((e, i) => {
        const a = t - e.t;
        if (a <= 0) return null;
        const wash = e.type === 'wash';
        const dur = wash ? 1.5 : 0.8;
        const p = brushEase(a / dur);
        const dry = clamp((a - dur - 0.6) / 4);
        const { d, from, to } = outline(e, Math.max(0.01, p), (wash ? 680 : 460) * e.size, (wash ? 90 : 46) * e.size, wash);
        const gid = `bg${e.seed}`;
        return (
          <g key={i} opacity={wash ? 0.2 - 0.06 * dry : 0.8 - 0.4 * dry}>
            <defs>
              <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}>
                <stop offset="0" stopColor={ink} stopOpacity={1} />
                <stop offset="0.6" stopColor={ink} stopOpacity={0.85} />
                <stop offset="1" stopColor={ink} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <path d={d} fill={`url(#${gid})`} filter={wash ? 'url(#brush-wash)' : 'url(#brush-edge)'} />
          </g>
        );
      })}
    </svg>
  );
};
