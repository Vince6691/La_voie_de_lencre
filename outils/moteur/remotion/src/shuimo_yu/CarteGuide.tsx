// 語 — images-guides des deux cartes (pour la carte premium peinte) : côtes et fleuves seuls, exactement au cadrage des
// cartes de la vidéo. Image 0 : les parlers Han (YangXiong) ; image 1 : les dialectes d'aujourd'hui (Today).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import { loadLegacy, W } from '../legacy';

const VUES = [{ lon: 112.5, lat: 34.2, k: 52 }, { lon: 112.0, lat: 30.0, k: 40 }];
export const YuCarteGuide: React.FC = () => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender('moteur'));
  const [ready, setReady] = useState(false);
  useEffect(() => { loadLegacy({ three: false, captions: false }).then(() => { setReady(true); continueRender(h); }); }, [h]);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const ctx = ref.current.getContext('2d')!, E = W().E, v = VUES[Math.min(f, 1)];
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1920, 1080);
    E.drawMap(ctx, 0, v, { paper: false, rivers: 1, deco: false });
  });
  return <AbsoluteFill style={{ background: '#fff' }}><canvas ref={ref} width={1920} height={1080} style={{ width: '100%', height: '100%' }} /></AbsoluteFill>;
};
