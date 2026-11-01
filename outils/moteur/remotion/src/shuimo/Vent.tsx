// Ce qui rend le vent visible (vent() dans common.ts) : des feuilles de bambou emportées par les rafales (les nuages
// qui passent sont dans layout.ts). Tout est fonction du temps du plan.
// (Une courbure des roseaux et bambous du premier plan a été essayée puis écartée : « pas beau ».)
import React from 'react';
import { H, W, rng, vent, ventCumul } from './common';

// feuilles de bambou arrachées par les rafales : elles entrent par le bord d'où vient le vent, filent tant qu'il
// souffle, ralentissent et tombent en tournoyant quand il retombe
type Feuille = { t0: number; y0: number; k: number; len: number; spin: number; q: number; op: number };
function feuilles(seed: number, dir: 1 | -1, duration: number): Feuille[] {
  const R = rng(seed * 31 + 5);
  const r = (a: number, b: number) => a + (b - a) * R();
  const out: Feuille[] = [];
  for (let t = -4; t < duration; t += 0.35) {
    // départ tiré seulement quand le vent forcit (au bord du vent)
    const v = vent(t, seed, dir > 0 ? 0 : W, dir);
    const p = Math.max(0, (v - 0.55) / 0.5);
    if (R() < p * 0.85) out.push({ t0: t, y0: r(140, 1000), k: r(0.75, 1.3), len: r(18, 30), spin: r(-1, 1), q: r(0, 6.3), op: r(0.55, 0.85) });
  }
  return out;
}
const leafPath = (len: number) => {
  const wd = len * 0.2;
  return `M${-len / 2},0 Q${-len * 0.1},${-wd} ${len / 2},0 Q${-len * 0.1},${wd * 0.7} ${-len / 2},0Z`;
};
export const Feuilles: React.FC<{ t: number; ventSeed: number; ventDir: 1 | -1; duration: number; ink?: string }> = ({ t, ventSeed, ventDir, duration, ink = '#1b1814' }) => {
  const list = React.useMemo(() => feuilles(ventSeed, ventDir, duration), [ventSeed, ventDir, duration]);
  const ct = ventCumul(t, ventSeed, W / 2, ventDir);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      {list.map((l, i) => {
        const a = t - l.t0;
        if (a <= 0 || a > 14) return null;
        const run = 260 * l.k * (ct - ventCumul(l.t0, ventSeed, W / 2, ventDir)); // poussée accumulée depuis le départ
        const x = (ventDir > 0 ? -40 : W + 40) + ventDir * run;
        if (x < -80 || x > W + 80) return null;
        const v = vent(t, ventSeed, x, ventDir);
        const y = l.y0 + 22 * a - 30 * Math.max(0, v - 0.5) * Math.min(1, a) + 16 * Math.sin(1.6 * a + l.q);
        const rot = l.q * 57 + l.spin * 140 * a + 25 * Math.sin(2.2 * a + l.q);
        // la feuille se retourne en tournoyant : sa largeur apparente bat
        const sy = 0.35 + 0.65 * Math.abs(Math.cos(1.8 * a + l.q));
        return (
          <path key={i} d={leafPath(l.len)} fill={ink} opacity={l.op * Math.min(1, a / 0.3)}
            transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(1,${sy.toFixed(3)})`} />
        );
      })}
    </svg>
  );
};
