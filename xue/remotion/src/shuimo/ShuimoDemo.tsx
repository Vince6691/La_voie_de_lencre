// Démo du fond shuimo : quatre plans de 8,4 s (graine, mouvement et ambiance différents), enchaînés par une
// brume qui passe, avec un caractère posé au centre pour juger de la lisibilité.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from './ShuimoBackground';
import { Mood, Move, compose } from './layout';

const D = 8.4, T = 1.2; // durée d'un plan, recouvrement des fondus
const SHOTS: { seed: number; move: Move; mood: Mood; ch: string; py: string }[] = [
  { seed: 11, move: 'pan', mood: 'jour', ch: '山', py: 'shān' },
  { seed: 23, move: 'push', mood: 'aube', ch: '水', py: 'shuǐ' },
  { seed: 37, move: 'rise', mood: 'brume', ch: '學', py: 'xué' },
  { seed: 51, move: 'focus', mood: 'nuit', ch: '道', py: 'dào' },
];
export const SHUIMO_DEMO_SECONDS = SHOTS.length * D - (SHOTS.length - 1) * T;

const useFonts = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
};

// caractère qui « boit » dans le papier : flou d'encre mouillée qui se resserre
const Character: React.FC<{ ch: string; py: string; night: boolean }> = ({ ch, py, night }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const a = interpolate(t, [1.0, 2.2, D - 1.0, D - 0.3], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const blur = interpolate(t, [1.0, 2.4], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pa = interpolate(t, [2.0, 2.8, D - 1.0, D - 0.3], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'ShuimoKai', fontSize: 330, lineHeight: 1, color: '#15120f', opacity: a, filter: `blur(${blur.toFixed(2)}px)`, transform: `scale(${1.06 - 0.06 * a})`, textShadow: '0 0 28px rgba(20,16,12,0.18)' }}>
        {ch}
      </div>
      <div style={{ fontFamily: 'ShuimoLatin, ShuimoKai, serif', fontSize: 50, letterSpacing: 6, color: night ? '#2c2a30' : '#5a4c40', opacity: pa, marginTop: 24 }}>{py}</div>
    </AbsoluteFill>
  );
};

// voile de brume pendant les raccords : de grandes nappes passent devant, le plan suivant apparaît derrière
const MistVeil: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const u = frame / fps / T;
  const k = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'rgba(250,247,240,1)', opacity: 0.55 * k }} />
      {['brume_b3.png', 'brume_c3.png', 'brume_a2.png'].map((f, i) => (
        <Img key={f} src={staticFile(`shuimo/elements/${f}`)} style={{
          position: 'absolute', width: width * 1.3, left: -width * 0.15 + (i % 2 ? 1 : -1) * (u - 0.5) * 500, top: 120 + i * 260,
          opacity: 0.9 * k, filter: 'blur(6px)',
        }} />
      ))}
    </AbsoluteFill>
  );
};

export const ShuimoDemo: React.FC = () => {
  useFonts();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      {SHOTS.map((s, i) => {
        const from = Math.round(i * (D - T) * fps);
        const shot = compose(s.seed, { move: s.move, mood: s.mood, duration: D });
        return (
          <Sequence key={i} from={from} durationInFrames={Math.round(D * fps)}>
            <FadeIn skip={i === 0}>
              <ShuimoBackground shot={shot} duration={D} />
              <Character ch={s.ch} py={s.py} night={s.mood === 'nuit'} />
            </FadeIn>
          </Sequence>
        );
      })}
      {SHOTS.slice(1).map((_, i) => (
        <Sequence key={`v${i}`} from={Math.round((i + 1) * (D - T) * fps)} durationInFrames={Math.round(T * fps)}>
          <MistVeil />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const FadeIn: React.FC<{ skip: boolean; children: React.ReactNode }> = ({ skip, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = skip ? interpolate(frame / fps, [0, T], [0, 1], { extrapolateRight: 'clamp' }) : 1;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
