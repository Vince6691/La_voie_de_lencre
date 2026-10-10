// Démo comparative des révélations plein cadre : 1 à travers le caractère, 2 lavis puis taches, 3 coup de pinceau.
import React from 'react';
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { RevealMode, VideoReveal } from './VideoReveal';
import { CloudReveal } from './CloudReveal';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';

// démo 6 : les nuages cachent le paysage shuimo, se dissipe sur la scène 3D, puis revient et rend le paysage
export const VIDEO_REVEAL_DEMO3_SECONDS = 13;
export const VideoRevealDemo3: React.FC = () => {
  const shot = compose(14, { move: 'pan', mood: 'aube', duration: 13 });
  return (
    <AbsoluteFill style={{ background: '#f3eee4' }}>
      <ShuimoBackground shot={shot} duration={13} />
      <Sequence from={45} durationInFrames={9 * 30}><CloudReveal src="exemples_videos/exemple_plan_fixe.mp4" inDur={3.6} outDur={3.2} playbackRate={0.8} /></Sequence>
    </AbsoluteFill>
  );
};

const SEG = 10, FPS = 30;
export const VIDEO_REVEAL_DEMO_SECONDS = 3 * SEG;
export const VIDEO_REVEAL_DEMO2_SECONDS = 2 * SEG;
const ITEMS2: [RevealMode, string, string][] = [
  ['goutte', 'exemples_videos/exemple_plan_fixe.mp4', '4 · goutte d\'encre dans l\'eau'],
  ['rouleau', 'exemples_videos/exemple_plan_fixe.mp4', '5 · rouleau suspendu'],
];
export const VideoRevealDemo2: React.FC = () => (
  <AbsoluteFill style={{ background: '#f3eee4' }}>
    <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    {ITEMS2.map(([mode, src, label], i) => (
      <Sequence key={mode} from={i * SEG * FPS} durationInFrames={SEG * FPS}>
        <Sequence from={6}><VideoReveal src={src} mode={mode} inDur={mode === 'rouleau' ? 4.2 : 3.4} outDur={mode === 'rouleau' ? 3.2 : 2.6} playbackRate={0.8} zoom={1} /></Sequence>
        <Title text={label} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
const ITEMS: [RevealMode, string, string][] = [
  ['glyphe', 'exemples_videos/exemple_plan_fixe.mp4', '1 · à travers le caractère'],
  ['lavis', 'exemples_videos/exemple_plan_fixe.mp4', '2 · lavis, puis taches de couleur'],
  ['pinceau', 'exemples_videos/exemple_transformation.mp4', '3 · coups de pinceau'],
];
const Title: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame() / useVideoConfig().fps;
  const a = Math.min(1, f / 0.4) * (1 - Math.min(1, Math.max(0, (f - 2.2) / 0.5)));
  return <div style={{ position: 'absolute', top: 40, width: '100%', textAlign: 'center', fontFamily: 'serif', fontSize: 44, color: '#3b322b', opacity: a, textShadow: '0 0 12px #f6f1e7' }}>{text}</div>;
};
export const VideoRevealDemo: React.FC = () => (
  <AbsoluteFill style={{ background: '#f3eee4' }}>
    <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    {ITEMS.map(([mode, src, label], i) => (
      <Sequence key={mode} from={i * SEG * FPS} durationInFrames={SEG * FPS}>
        <Sequence from={6}><VideoReveal src={src} mode={mode} inDur={3.4} outDur={2.6} playbackRate={0.8} /></Sequence>
        <Title text={label} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
