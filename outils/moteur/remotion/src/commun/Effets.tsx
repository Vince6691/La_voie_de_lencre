// Effets de matière communs à toutes les vidéos 墨道 (extraits de YuV1, la référence technique) :
//   <Shake impacts={[t1, t2…]}>  tremblement vertical bref (4 px, 0,3 s) à chaque impact (coup de sceau, révélation)
//   <GrainVignette />            grain de papier fixe et fin (pleine définition, mode overlay) + vignettage chaud.
//                                Le grain ne bouge pas : un bruit qui change à chaque image scintille comme de la « neige »
//                                et se compresse mal (YouTube le transforme en bouillie)
// À poser en dernier (grain, au-dessus de tout) et autour du monde (secousse), hors du son et de la voix.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { rng } from '../shuimo/common';

export const shakeAt = (t: number, impacts: number[]) => {
  let dy = 0;
  for (const t0 of impacts) { const u = t - t0; if (u < 0 || u > 0.3) continue; dy += 4 * Math.sin((Math.PI * u) / 0.3) * (1 - u / 0.3); }
  return dy;
};

export const Shake: React.FC<{ impacts: number[]; children: React.ReactNode }> = ({ impacts, children }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  return <AbsoluteFill style={{ transform: `translate(0px, ${shakeAt(t, impacts).toFixed(2)}px)` }}>{children}</AbsoluteFill>;
};

let grainTile: HTMLCanvasElement | null = null;
export const GrainVignette: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (!grainTile) {
      const c = document.createElement('canvas'); c.width = 1920; c.height = 1080;
      const x = c.getContext('2d')!, im = x.createImageData(1920, 1080), r = rng(900);
      for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - 0.5) * 70; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      x.putImageData(im, 0, 0); grainTile = c;
    }
    ref.current.getContext('2d')!.drawImage(grainTile, 0, 0);
  }, []);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <canvas ref={ref} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'overlay', opacity: 0.1 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 48%, rgba(60,40,20,0) 55%, rgba(60,40,20,0.22) 100%)' }} />
    </AbsoluteFill>
  );
};
