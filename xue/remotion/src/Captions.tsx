// Sous-titres animés mot à mot, calés sur la voix off (horodatage estimé par tools/captions.py).
import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import words from './data/captions.json';
import timeline from './data/timeline.json';
import { anchor } from './legacy';

type Word = { text: string; start: number; end: number; clip: number };

// groupes de 1 à 5 mots, coupés à la ponctuation
const chunk = (ws: Word[]) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  ws.forEach((w, i) => {
    cur.push(w);
    const next = ws[i + 1];
    if (/[.,:;…?!]$/.test(w.text) || cur.length >= 5 || !next || next.clip !== w.clip) {
      out.push(cur);
      cur = [];
    }
  });
  return out;
};

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const chunks = useMemo(() => chunk(words as Word[]), []);
  // pas de sous-titres quand le texte est déjà écrit à l'écran
  const mutes: [number, number][] = [
    [anchor(3, 10.3), anchor(3, 14.3)],
    [anchor(9, 9.6), timeline.total],
  ];
  if (mutes.some(([a, b]) => t >= a && t < b)) return null;
  const i = chunks.findIndex((c, k) => {
    const next = chunks[k + 1];
    const end = Math.min(c[c.length - 1].end + 0.35, next ? next[0].start : Infinity);
    return t >= c[0].start - 0.05 && t < end;
  });
  if (i < 0) return null;
  const c = chunks[i];
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 56 }}>
      <div
        style={{
          fontFamily: 'Cormorant, Kai, serif',
          fontWeight: 700,
          fontSize: 54,
          lineHeight: 1.1,
          padding: '10px 34px 14px',
          borderRadius: 40,
          background: 'rgba(8,5,3,0.55)',
          display: 'flex',
          gap: 16,
        }}
      >
        {c.map((w, k) => {
          const f0 = Math.round(w.start * fps);
          const s = spring({ frame: frame - f0, fps, config: { damping: 14, stiffness: 180 } });
          const active = t >= w.start && t < w.end + 0.08;
          const shown = frame >= f0 - 2;
          return (
            <span
              key={k}
              style={{
                display: 'inline-block',
                color: active ? '#f4b73f' : '#f6ead2',
                opacity: shown ? interpolate(s, [0, 1], [0.25, 1]) : 0.25,
                transform: `translateY(${shown ? (1 - s) * 14 : 14}px) scale(${active ? 1 + 0.08 * s : 1})`,
                textShadow: '0 3px 14px rgba(0,0,0,0.95)',
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
