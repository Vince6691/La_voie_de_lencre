// Démo comparative des révélations plein cadre : 1 à travers le caractère, 2 lavis puis taches, 3 coup de pinceau.
import React from 'react';
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { RevealMode, VideoReveal } from './VideoReveal';

const SEG = 10, FPS = 30;
export const VIDEO_REVEAL_DEMO_SECONDS = 3 * SEG;
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
