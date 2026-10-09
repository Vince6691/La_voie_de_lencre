import React from 'react';
import { Composition } from 'remotion';
import { Xue, XueProps } from './Xue';
import timeline from './data/timeline.json';
import { SHUIMO_DEMO_SECONDS, ShuimoDemo, ShuimoDemoProps } from './shuimo/ShuimoDemo';

export const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="Xue"
    component={Xue}
    durationInFrames={Math.ceil(timeline.total * FPS)}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ three: true, captions: false, inkTransitions: true } satisfies XueProps}
  />
  {/* fond shuimo (banque d'éléments assets/shuimo) : démo de 30 s, quatre plans ; nuages du ciel ; brouillard et coups de pinceau en option */}
  <Composition id="ShuimoDemo" component={ShuimoDemo} durationInFrames={Math.round(SHUIMO_DEMO_SECONDS * FPS)} fps={FPS} width={1920} height={1080}
    defaultProps={{ clouds: true, mist: false, strokes: false } satisfies ShuimoDemoProps} />
  </>
);
