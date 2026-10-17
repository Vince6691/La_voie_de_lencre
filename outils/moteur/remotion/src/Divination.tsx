// Divination : extrait d'une vidéo générée (Veo, assets/video/) pendant « Les devins gravent l'os et
// l'écaille de tortue ». On garde 1,0 → 3,6 s de la source (la carapace chauffe, les fissures
// s'allument), légèrement ralenties, et on coupe avant qu'elle éclate. Recadrage : ni la statue
// (anachronique, en haut à droite) ni le filigrane (en bas à droite) ne restent dans le champ.
// La couche est placée sous le canevas : le titre d'époque et la légende restent par-dessus.
import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { anchor } from './legacy';

const SRC_IN = 1.0, SRC_OUT = 3.6; // secondes gardées dans la source
export const DIVINATION = { in: 5.1, out: 8.45 }; // ancres de la scène 2 (voir scenes.js)

const Clip: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opacity = interpolate(t, [0, 0.35, dur - 0.35, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const push = interpolate(t, [0, dur], [1.28, 1.36]); // lent travelling avant
  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden', background: '#000' }}>
      <OffthreadVideo
        src={staticFile('video/divination.mp4')}
        muted
        trimBefore={Math.round(SRC_IN * fps)}
        playbackRate={(SRC_OUT - SRC_IN) / dur}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `scale(${push})`, transformOrigin: '43% 55%',
          filter: 'sepia(0.18) saturate(0.85) contrast(1.06) brightness(0.95)',
        }}
      />
      {/* vignette pour fondre l'image dans le reste de la vidéo */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)' }} />
    </AbsoluteFill>
  );
};

export const Divination: React.FC = () => {
  const { fps } = useVideoConfig();
  const t0 = anchor(2, DIVINATION.in), t1 = anchor(2, DIVINATION.out);
  const from = Math.round(t0 * fps), len = Math.round((t1 - t0) * fps);
  return (
    <Sequence from={from} durationInFrames={len} name="divination (vidéo)">
      <Clip dur={len / fps} />
    </Sequence>
  );
};
