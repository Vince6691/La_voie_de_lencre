import React from 'react';
import { Composition } from 'remotion';
import { Xue, XueProps } from './Xue';
import timeline from './data/timeline.json';

export const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Xue"
    component={Xue}
    durationInFrames={Math.ceil(timeline.total * FPS)}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ three: true, captions: false, inkTransitions: true } satisfies XueProps}
  />
);
