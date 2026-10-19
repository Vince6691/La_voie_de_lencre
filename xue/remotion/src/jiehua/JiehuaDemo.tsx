// Essai « dessin à la règle » (界畫) sur fond shuimo : une salle Song se trace trait par trait — la règle glisse
// et le pinceau suit son bord (droites), main levée pour les courbes du toit, détails répétés en vague rapide —
// puis les couleurs minérales gagnent le dessin par lavis qui se répandent (vermillon, bleu-vert, gris des tuiles).
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { GROUPS, Line, Pt, SILHOUETTE, WASHES } from './geometry';

const T_DRAW = 0.5;                 // début du tracé
const WASH_DUR = 1.2, WASH_STAGGER = 0.16;
// repère du dessin → écran : sol à y = 990, échelle 0.9
const OX = 960, OY = 990, SC = 0.9;

const clamp = (u: number) => Math.min(1, Math.max(0, u));
const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u));
const easeOut = (u: number) => 1 - (1 - clamp(u)) ** 3;

// ---- calendrier : chaque trait reçoit [t0, t1] ----
type Timed = Line & { t0: number; t1: number; mode: 'ruler' | 'free' | 'cascade'; len: number; g: number };
const lenOf = (p: Pt[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
function schedule(): Timed[] {
  const out: Timed[] = [];
  let t = T_DRAW;
  GROUPS.forEach((g, gi) => {
    if (g.mode === 'cascade') {
      const n = g.lines.length, D = g.dur ?? 1, d = Math.min(0.3, D * 0.35);
      g.lines.forEach((l, i) => { const t0 = t + ((D - d) * i) / Math.max(1, n - 1); out.push({ ...l, t0, t1: t0 + d, mode: g.mode, len: lenOf(l.pts), g: gi }); });
      t += D + 0.05;
    } else {
      g.lines.forEach((l0) => {
        const len = lenOf(l0.pts);
        // le dessinateur repart du bout où il se trouve (aller-retour le long de la règle)
        const last = out[out.length - 1]?.pts.slice(-1)[0];
        const near = (p: Pt) => (last ? Math.hypot(p[0] - last[0], p[1] - last[1]) : 0);
        const l = last && near(l0.pts[l0.pts.length - 1]) < near(l0.pts[0]) ? { ...l0, pts: l0.pts.slice().reverse() } : l0;
        // déplacement de la règle (ou levée du pinceau) : d'autant plus long que la pose change
        const prev = out[out.length - 1];
        if (prev) {
          const e = prev.pts[prev.pts.length - 1], s = l.pts[0];
          const turn = prev.mode === 'ruler' && g.mode === 'ruler' ? Math.abs(poseOf(prev).a - poseOf({ ...l, len } as Timed).a) : 0;
          t += prev.g === gi || prev.mode !== 'cascade' ? Math.min(0.25, 0.035 + Math.hypot(s[0] - e[0], s[1] - e[1]) / 10000 + turn * 0.001) : 0.12;
        }
        const d = 0.05 + len / (g.mode === 'ruler' ? 9000 : 6000);
        out.push({ ...l, t0: t, t1: t + d, mode: g.mode, len, g: gi });
        t += d;
      });
      t += 0.04;
    }
  });
  return out;
}

const at = (p: Pt[], len: number, u: number): Pt => {
  let s = clamp(u) * len;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= d || i === p.length - 1) { const k = d ? Math.min(1, s / d) : 0; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
    s -= d;
  }
  return p[p.length - 1];
};
const dOf = (p: Pt[]) => 'M' + p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');

// pose de la règle pour une droite : alignée sur le trait, posée au-dessus (horizontales) ou à droite (verticales)
type Pose = { x: number; y: number; a: number };
const RULER_W = 30;
function poseOf(l: Timed): Pose {
  const [a, b] = [l.pts[0], l.pts[l.pts.length - 1]];
  let ux = (b[0] - a[0]) / l.len, uy = (b[1] - a[1]) / l.len;
  if (ux < -1e-6 || (Math.abs(ux) < 1e-6 && uy < 0)) { ux = -ux; uy = -uy; }
  let nx = -uy, ny = ux;
  if (ny > 1e-6 || (Math.abs(ny) < 1e-6 && nx < 0)) { nx = -nx; ny = -ny; }
  const off = RULER_W / 2 + 3;
  return { x: (a[0] + b[0]) / 2 + nx * off, y: (a[1] + b[1]) / 2 + ny * off, a: (Math.atan2(uy, ux) * 180) / Math.PI };
}

export const LINES = schedule();
const T_COLOR = Math.max(...LINES.map((l) => l.t1)) - 0.15;        // les lavis partent dès la fin du tracé
const T_SEAL = T_COLOR + (WASHES.length - 1) * WASH_STAGGER + WASH_DUR + 0.1;
export const JIEHUA_SECONDS = Math.ceil(T_SEAL + 1.4);

// ---- outils : règle et pinceau ----
function tools(lines: Timed[], t: number) {
  // pinceau : sur le trait en cours, ou en vol entre deux traits d'un même passage (règle ou main levée)
  const tl = lines.filter((l) => l.mode !== 'cascade');
  let brush: { p: Pt; lift: number } | null = null;
  let ruler: Pose | null = null;
  for (let i = 0; i < tl.length; i++) {
    const l = tl[i];
    if (t >= l.t0 && t <= l.t1) { brush = { p: at(l.pts, l.len, (t - l.t0) / (l.t1 - l.t0)), lift: 0 }; if (l.mode === 'ruler') ruler = poseOf(l); break; }
    const nx = tl[i + 1];
    if (nx && t > l.t1 && t < nx.t0 && nx.t0 - l.t1 < 0.5) {
      const u = ease((t - l.t1) / (nx.t0 - l.t1)), e = l.pts[l.pts.length - 1], s = nx.pts[0];
      brush = { p: [e[0] + (s[0] - e[0]) * u, e[1] + (s[1] - e[1]) * u], lift: Math.sin(Math.PI * u) };
      if (l.mode === 'ruler' && nx.mode === 'ruler') {
        const A = poseOf(l), B = poseOf(nx);
        ruler = { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u, a: A.a + (B.a - A.a) * u };
      } else if (nx.mode === 'ruler') ruler = poseOf(nx);
      else if (l.mode === 'ruler') ruler = poseOf(l);
      break;
    }
  }
  // fondu d'entrée/sortie des outils autour de chaque passage
  const near = (mode: (l: Timed) => boolean) => {
    let v = 0;
    for (const l of tl) if (mode(l)) v = Math.max(v, clamp(1 - Math.max(l.t0 - t, t - l.t1, 0) / 0.22));
    return v;
  };
  const rOp = near((l) => l.mode === 'ruler'), bOp = near(() => true);
  if (!ruler) {
    // règle immobile près du passage le plus proche (elle apparaît / disparaît sur place)
    let best: Timed | null = null, bd = 1e9;
    for (const l of tl) if (l.mode === 'ruler') { const d = Math.max(l.t0 - t, t - l.t1, 0); if (d < bd) { bd = d; best = l; } }
    if (best) ruler = poseOf(best);
  }
  if (!brush) {
    let best: Timed | null = null, bd = 1e9;
    for (const l of tl) { const d = Math.max(l.t0 - t, t - l.t1, 0); if (d < bd) { bd = d; best = l; } }
    if (best) brush = { p: t < best.t0 ? best.pts[0] : best.pts[best.pts.length - 1], lift: 1 };
  }
  return { ruler, rOp, brush, bOp };
}

const Ruler: React.FC<{ pose: Pose; op: number }> = ({ pose, op }) => (
  <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.a})`} opacity={op}>
    <rect x={-760 + 10} y={-RULER_W / 2 + 12} width={1520} height={RULER_W} rx={4} fill="#000" opacity={0.18} filter="url(#soft)" />
    <rect x={-760} y={-RULER_W / 2} width={1520} height={RULER_W} rx={4} fill="url(#wood)" />
    <rect x={-760} y={-RULER_W / 2} width={1520} height={5} rx={2} fill="#fff" opacity={0.18} />
    {/* rainure du bord, où glisse le pinceau */}
    <rect x={-760} y={RULER_W / 2 - 4} width={1520} height={4} fill="#2a170c" opacity={0.55} />
  </g>
);

// pinceau légèrement incliné, pointe sur le papier ; lift ∈ [0, 1] : levé entre deux traits
const Brush: React.FC<{ p: Pt; lift: number; op: number }> = ({ p, lift, op }) => {
  const up = 16 * lift;
  return (
    <g opacity={op}>
      <g transform={`translate(${p[0] + 18 + 22 * lift} ${p[1] + 10 + 10 * lift}) rotate(24)`} opacity={0.22}>
        <path d="M0 0 C 6 -14, 9 -30, 8 -46 L 9 -340 L -9 -340 L -8 -46 C -9 -30, -6 -14, 0 0 Z" fill="#000" filter="url(#soft)" />
      </g>
      <g transform={`translate(${p[0]} ${p[1] - up}) rotate(24)`}>
        <path d="M-9 -60 L -9 -340 Q 0 -348 9 -340 L 9 -60 Z" fill="url(#bamboo)" />
        {[-140, -250].map((y) => <rect key={y} x={-9.5} y={y} width={19} height={3} fill="#5c4424" opacity={0.6} />)}
        <path d="M-10 -46 L -10 -62 L 10 -62 L 10 -46 Z" fill="#3a2a1a" />
        <path d="M0 0 C 7 -12, 10 -28, 9 -46 L -9 -46 C -10 -28, -7 -12, 0 0 Z" fill="#141210" />
        <path d="M-3 -40 C -2 -24, -1 -12, 0 -2" stroke="#fff" strokeOpacity={0.12} strokeWidth={2} fill="none" />
      </g>
    </g>
  );
};

// lavis : chaque aplat se répand depuis quelques graines, bord irrégulier et adouci
const bbox = (ps: Pt[][]) => { const a = ps.flat(); return [Math.min(...a.map((p) => p[0])), Math.min(...a.map((p) => p[1])), Math.max(...a.map((p) => p[0])), Math.max(...a.map((p) => p[1]))]; };

const useFonts = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    new FontFace('JiehuaSeal', `url(${staticFile('fonts/NotoSerifTC-Bold.otf')})`).load().then((f) => { document.fonts.add(f); continueRender(h); });
  }, [h]);
};

export const JiehuaDemo: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const lines = LINES;
  const shot = useMemo(() => {
    const s = compose(29, { move: 'push', mood: 'jour', duration: JIEHUA_SECONDS });
    // pas de second édifice dans le paysage, et rien au premier plan devant la salle
    return { ...s, pieces: s.pieces.filter((p) => p.el.family !== 'premier' && (p.el.family !== 'vie' || /vie_[ab][26]\.png/.test(p.el.file))) };
  }, []);
  const { ruler, rOp, brush, bOp } = tools(lines, t);
  const zoom = 1 + 0.03 * ease(t / JIEHUA_SECONDS);
  const axisOp = 0.55 - 0.35 * clamp((t - T_COLOR) / 2);
  const sealU = clamp((t - T_SEAL) / 0.35);

  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <ShuimoBackground shot={shot} duration={JIEHUA_SECONDS} halo={false} />
      {/* voile de papier derrière la salle : le paysage se retire sans être découpé */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 44% 52% at 50% 56%, rgba(250,247,240,0.86) 0%, rgba(250,247,240,0.6) 60%, rgba(250,247,240,0) 100%)' }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feGaussianBlur in="d" stdDeviation={0.35} />
          </filter>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={6} /></filter>
          {/* couleur posée au pinceau : bord qui boit un peu, densité irrégulière (granulation) */}
          <filter id="wc" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={7} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves={3} seed={11} result="m" />
            <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.55 1.18" result="ma" />
            <feComposite in="d" in2="ma" operator="in" />
          </filter>
          {[0, 1, 2].map((k) => (
            <filter key={k} id={`front${k}`} x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={3} seed={20 + k} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={60} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feGaussianBlur in="d" stdDeviation={7} />
            </filter>
          ))}
          <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5a33" /><stop offset="0.5" stopColor="#6e4425" /><stop offset="1" stopColor="#4a2c16" />
          </linearGradient>
          <linearGradient id="bamboo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8f7448" /><stop offset="0.45" stopColor="#c9ac74" /><stop offset="1" stopColor="#7a6038" />
          </linearGradient>
          {WASHES.map((w, i) => {
            const t0 = T_COLOR + i * WASH_STAGGER, u = easeOut((t - t0) / WASH_DUR);
            const [x0, y0, x1, y1] = bbox(w.polys);
            return (
              <mask key={i} id={`wm${i}`} maskUnits="userSpaceOnUse" x={-2000} y={-2000} width={4000} height={4000}>
                <g filter={`url(#front${i % 3})`}>
                  {u > 0 && w.seeds.map(([sx, sy], k) => {
                    const R = Math.max(...[[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => Math.hypot(x - sx, y - sy))) * 1.15 + 60;
                    const uk = easeOut((t - t0 - k * 0.12) / WASH_DUR);
                    return <circle key={k} cx={sx} cy={sy} r={R * uk} fill="#fff" />;
                  })}
                </g>
              </mask>
            );
          })}
        </defs>
        <g transform={`translate(${OX} ${OY - 420}) scale(${zoom}) translate(0 420) scale(${SC})`}>
          {/* papier sous la salle, qui monte avec les premiers lavis */}
          <g opacity={0.8 * ease((t - T_COLOR) / 1.5)} filter="url(#soft)">
            {SILHOUETTE.map((p, k) => <path key={k} d={dOf(p) + 'Z'} fill="#f7f2e8" />)}
          </g>
          {/* lavis, sous les traits */}
          <g style={{ mixBlendMode: 'multiply' }}>
            {WASHES.map((w, i) => (
              <g key={i} mask={`url(#wm${i})`} opacity={w.op}>
                <g filter="url(#wc)">
                  {w.polys.map((p, k) => <path key={k} d={dOf(p) + 'Z'} fill={w.color} />)}
                </g>
                {w.polys.map((p, k) => <path key={`e${k}`} d={dOf(p) + 'Z'} fill="none" stroke={w.color} strokeWidth={3} opacity={0.45} />)}
              </g>
            ))}
          </g>
          {/* traits */}
          <g filter="url(#ink)" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {lines.map((l, i) => {
              const u = clamp((t - l.t0) / (l.t1 - l.t0));
              if (u <= 0) return null;
              const axis = l.tone === 'axis';
              return (
                <path key={i} d={dOf(l.pts)} pathLength={1} strokeDasharray={`${u} 2`}
                  stroke={axis ? '#b8432f' : '#1a1613'} strokeOpacity={axis ? axisOp : 0.9} strokeWidth={l.w} />
              );
            })}
          </g>
          {ruler && rOp > 0.01 && <Ruler pose={ruler} op={rOp * 0.92} />}
          {brush && bOp > 0.01 && <Brush p={brush.p} lift={brush.lift} op={bOp} />}
        </g>
      </svg>
      {/* sceau 界畫 posé à la fin */}
      {sealU > 0 && (
        <div style={{
          position: 'absolute', left: 1540, top: 840, width: 92, height: 92, background: '#b0281c', borderRadius: 6,
          color: '#f6eadc', fontFamily: 'JiehuaSeal', fontSize: 36, lineHeight: '40px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
          writingMode: 'vertical-rl', opacity: 0.9 * sealU, transform: `scale(${1.25 - 0.25 * easeOut(sealU)})`, mixBlendMode: 'multiply',
        }}>界畫</div>
      )}
    </AbsoluteFill>
  );
};
