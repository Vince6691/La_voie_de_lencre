// Volée d'oiseaux dessinés au pinceau (remplace l'image fixe d'une volée qui glissait) : chaque oiseau bat des
// ailes (descente rapide, remontée lente, pointe de l'aile en retard sur le coude), alterne battements et vol plané,
// suit l'oiseau de tête avec un écart qui flotte, et réagit au vent du paysage (common.ts) : une rafale le soulève,
// l'incline et le fait planer. Tout est fonction du temps : n'importe quelle image se calcule seule.
import React from 'react';
import { rng, vent, ventCumul } from './common';

export type Volee = {
  seed: number; x: number; y: number; dir: 1 | -1; speed: number; // départ de l'oiseau de tête, vitesse (px/s)
  n: number; size: number; depth: number; opacity: number;        // nombre d'oiseaux, demi-envergure (px)
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
const frac = (v: number) => v - Math.floor(v);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

// hauteur de l'aile sur un battement (1 : levée, −0,7 : abaissée) ; la descente (42 % du cycle) est plus rapide
const flap = (phi: number) => {
  const p = frac(phi);
  return p < 0.42 ? 0.15 + 0.85 * Math.cos((Math.PI * p) / 0.42) : 0.15 - 0.85 * Math.cos((Math.PI * (p - 0.42)) / 0.58);
};

type Bird = {
  dx: number; dy: number; size: number; freq: number; phase: number; op: number;
  glides: [number, number][]; q: number[];
};

function flock(v: Volee): Bird[] {
  const R = rng(v.seed);
  const r = (a: number, b: number) => a + (b - a) * R();
  return Array.from({ length: v.n }, (_, i) => {
    const freq = r(2.0, 2.7);
    // calendrier : 3 à 6 battements, puis 0,7 à 1,8 s de vol plané, et ainsi de suite
    const glides: [number, number][] = [];
    for (let t = r(-1.5, 1.2); t < 120;) {
      t += r(3, 6) / freq;
      const g = r(0.7, 1.8);
      glides.push([t, t + g]);
      t += g;
    }
    return {
      // l'oiseau de tête devant, les autres en grappe lâche derrière lui
      dx: i === 0 ? 0 : -r(30, 70) * Math.pow(i, 0.85) + r(-25, 25), dy: i === 0 ? 0 : r(-60, 60),
      size: v.size * (i === 0 ? 1.08 : r(0.72, 1.05)), freq, phase: R(), op: r(0.8, 1),
      glides, q: Array.from({ length: 6 }, () => r(0, Math.PI * 2)),
    };
  });
}

// contour d'un trait effilé le long d'une courbe quadratique a → b (contrôle c), épaisseur w(u)
function taper(a: number[], c: number[], b: number[], w: (u: number) => number) {
  const N = 12, Lp: number[][] = [], Rp: number[][] = [];
  const at = (u: number) => [0, 1].map((j) => (1 - u) * (1 - u) * a[j] + 2 * (1 - u) * u * c[j] + u * u * b[j]);
  for (let i = 0; i <= N; i++) {
    const u = i / N, [x, y] = at(u), [x2, y2] = at(Math.min(1, u + 0.01)), [x0, y0] = at(Math.max(0, u - 0.01));
    const nx = -(y2 - y0), ny = x2 - x0, nl = Math.hypot(nx, ny) || 1, h = w(u) / 2;
    Lp.push([x + (nx / nl) * h, y + (ny / nl) * h]);
    Rp.push([x - (nx / nl) * h, y - (ny / nl) * h]);
  }
  return smoothClosed([...Lp, ...Rp.reverse()]);
}
function smoothClosed(p: number[][]) {
  let d = `M${((p[0][0] + p[1][0]) / 2).toFixed(2)},${((p[0][1] + p[1][1]) / 2).toFixed(2)}`;
  for (let i = 1; i <= p.length; i++) {
    const a = p[i % p.length], b = p[(i + 1) % p.length];
    d += `Q${a[0].toFixed(2)},${a[1].toFixed(2)} ${((a[0] + b[0]) / 2).toFixed(2)},${((a[1] + b[1]) / 2).toFixed(2)}`;
  }
  return d + 'Z';
}

// un oiseau vu de trois quarts avant, tête vers +x : les deux ailes s'ouvrent de part et d'autre du corps (le « V »
// des oiseaux du shuimo), l'aile proche vers l'arrière, l'aile lointaine vers l'avant, un peu plus courte et plus pâle.
// ve, vt : hauteur du coude et de la pointe (1 levée, −0,7 abaissée) ; L : longueur d'une aile
function birdPaths(L: number, ve: number, vt: number) {
  const wing = (k: number, side: number) => {
    const s = [side * 0.08 * L, -0.05 * L];
    const ae = ve * 1.05, at = vt * 1.0; // angle au-dessus de l'horizontale (radians)
    const e = [s[0] + side * 0.5 * L * k * Math.cos(ae), s[1] - 0.5 * L * k * Math.sin(ae)];
    const t = [e[0] + side * 0.55 * L * k * Math.cos(at), e[1] - 0.55 * L * k * Math.sin(at)];
    // contrôle au-delà du coude : l'aile se courbe au coude au lieu d'être une ligne droite
    const c = [2 * e[0] - (s[0] + t[0]) / 2, 2 * e[1] - (s[1] + t[1]) / 2];
    return taper(s, c, t, (u) => 0.2 * L * k * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * Math.sqrt(u))), 0.8));
  };
  const body = smoothClosed([
    [0.32 * L, -0.04 * L], [0.14 * L, -0.11 * L], [-0.15 * L, -0.08 * L], [-0.4 * L, -0.02 * L], [-0.52 * L, -0.07 * L],
    [-0.45 * L, 0.03 * L], [-0.52 * L, 0.1 * L], [-0.32 * L, 0.07 * L], [0.0 * L, 0.09 * L], [0.2 * L, 0.05 * L],
  ]);
  return { far: wing(0.8, 1), near: wing(1, -1), body };
}

// à poser dans un <svg> plein cadre ; t : temps du plan (s), ventSeed/ventDir : le vent du plan
export const Oiseaux: React.FC<{ v: Volee; t: number; ventSeed: number; ventDir: 1 | -1; ink?: string }> = ({ v, t, ventSeed, ventDir, ink = '#1b1814' }) => {
  const birds = React.useMemo(() => flock(v), [v]);
  // trajectoire de l'oiseau de tête : vitesse propre, poussée du vent, ondulation lente, portance dans les rafales
  const lead = (tt: number) => {
    const x0 = v.x + v.dir * v.speed * tt;
    const w = vent(tt, ventSeed, x0, ventDir);
    return {
      x: x0 + ventDir * 14 * ventCumul(tt, ventSeed, x0, ventDir),
      y: v.y + 18 * Math.sin(0.3 * tt + v.seed) + 8 * Math.sin(0.85 * tt + v.seed * 0.7) - 22 * Math.max(0, w - 0.35),
      w,
    };
  };
  const now = lead(t), next = lead(t + 0.05);
  return (
    <g opacity={v.opacity}>
      {birds.map((b, i) => {
        const gl = b.glides.reduce((m, [a, z]) => Math.max(m, smooth(a, a + 0.3, t) * (1 - smooth(z - 0.3, z, t))), 0);
        const g = Math.max(gl, smooth(0.7, 1.05, now.w)); // en pleine rafale, l'oiseau se laisse porter
        const phi = b.phase + b.freq * t;
        const ve = mix(flap(phi), 0.42, g), vt = mix(flap(phi - 0.1), -0.06, g);
        const L = b.size;
        const wob = (k: number, tt: number) => Math.sin(tt * [0.45, 1.1, 0.38][k] + b.q[k]);
        const fx = (tt: number) => v.dir * (b.dx + 12 * wob(2, tt));
        const fy = (tt: number) => b.dy + 10 * wob(0, tt) + 5 * wob(1, tt);
        const x = now.x + fx(t);
        const y = now.y + fy(t) + 0.07 * L * flap(phi - 0.2) * (1 - g); // le corps monte quand les ailes descendent
        // inclinaison : suit la pente de la trajectoire, plus un roulis dans les rafales
        const vy = (next.y + fy(t + 0.05) - now.y - fy(t)) / 0.05, vx = Math.abs((next.x + fx(t + 0.05) - now.x - fx(t)) / 0.05) || 1;
        const rot = Math.max(-0.45, Math.min(0.45, Math.atan2(vy, vx))) + 0.16 * Math.max(0, now.w - 0.3) * Math.sin(3.1 * t + b.q[3]);
        const p = birdPaths(L, ve, vt);
        return (
          <g key={i} transform={`translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${v.dir},1) rotate(${((rot * 180) / Math.PI).toFixed(2)})`} opacity={b.op}>
            <path d={p.far} fill={ink} opacity={0.6} />
            <path d={p.body} fill={ink} />
            <path d={p.near} fill={ink} opacity={0.92} />
          </g>
        );
      })}
    </g>
  );
};
