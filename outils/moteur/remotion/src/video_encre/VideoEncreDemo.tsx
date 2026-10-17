// Démo de l'effet VideoEncre sur les deux clips d'exemple : brume → délavé, puis centre → brume.
import React from 'react';
import { AbsoluteFill, Img, Sequence, staticFile } from 'remotion';
import { VideoEncre } from './VideoEncre';

export const VIDEO_ENCRE_DEMO_SECONDS = 18;
const FPS = 30;

export const VideoEncreDemo: React.FC = () => (
  <AbsoluteFill style={{ background: '#f3eee4' }}>
    <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    <Sequence from={0} durationInFrames={9 * FPS}>
      <VideoEncre src="exemples_videos/exemple_plan_fixe.mp4" focus={[0.62, 0.78]} inMode="brume" outMode="delave" inDur={3} outDur={2.4} playbackRate={0.9} />
    </Sequence>
    <Sequence from={9 * FPS} durationInFrames={9 * FPS}>
      <VideoEncre src="exemples_videos/exemple_transformation.mp4" focus={[0.5, 0.45]} inMode="centre" outMode="brume" inDur={3.2} outDur={2.2} playbackRate={0.9} />
    </Sequence>
  </AbsoluteFill>
);
