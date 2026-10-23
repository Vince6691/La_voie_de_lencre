// Images-guides des cartes peintes (skill carte-peinte) : côtes, lacs et fleuves seuls, au cadrage exact de chaque vue du
// catalogue (assets/cartes/cartes.json). Image n = carte n du catalogue ; à joindre à Nano Banana avec le prompt du type.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import { loadLegacy, W } from '../legacy';
import catalogue from '../data/cartes.json';

export const CARTES_GUIDES = catalogue.cartes.length;
export const CartesGuides: React.FC = () => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender('moteur'));
  const [ready, setReady] = useState(false);
  useEffect(() => { loadLegacy({ three: false, captions: false }).then(() => { setReady(true); continueRender(h); }); }, [h]);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const ctx = ref.current.getContext('2d')!, E = W().E, v = catalogue.cartes[Math.min(f, CARTES_GUIDES - 1)].vue;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1920, 1080);
    E.drawMap(ctx, 0, v, { paper: false, rivers: 1, deco: false });
  });
  return <AbsoluteFill style={{ background: '#fff' }}><canvas ref={ref} width={1920} height={1080} style={{ width: '100%', height: '100%' }} /></AbsoluteFill>;
};
