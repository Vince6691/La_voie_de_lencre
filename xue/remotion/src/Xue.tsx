import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadLegacy, W } from './legacy';
import { Props3D } from './three/Props3D';
import { InkWipes } from './InkWipes';
import { Captions } from './Captions';
import timeline from './data/timeline.json';
import gain from './data/audio_gain.json';

export type XueProps = {
  /** carapace et vase en 3D (Three.js) au lieu des dessins 2D */
  three: boolean;
  /** sous-titres animés mot à mot */
  captions: boolean;
  /** transitions « tache d'encre » entre les scènes */
  inkTransitions: boolean;
};

// Couche de base : le moteur Canvas 2D du projet principal, piloté par le temps Remotion.
const LegacyCanvas: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    W().CTX = ref.current!.getContext('2d');
    W().renderFrame(frame / fps);
  }, [frame, fps]);
  return <canvas ref={ref} width={1920} height={1080} style={{ position: 'absolute', width: '100%', height: '100%' }} />;
};

export const Xue: React.FC<XueProps> = ({ three, captions, inkTransitions }) => {
  const { fps } = useVideoConfig();
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('moteur de dessin et polices'));
  useEffect(() => {
    loadLegacy({ three, captions }).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle, three, captions]);

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {ready && <LegacyCanvas />}
      {ready && three && <Props3D />}
      {ready && inkTransitions && <InkWipes />}
      {ready && captions && <Captions />}
      <Audio src={staticFile('audio/bed.mp3')} />
      {timeline.voice.map((v, i) => (
        <Sequence key={i} from={Math.round(v.start * fps)} name={`voix ${i + 1}`}>
          <Audio src={staticFile(`voice/s${String(i + 1).padStart(2, '0')}.wav`)} volume={gain.voice_gain} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
