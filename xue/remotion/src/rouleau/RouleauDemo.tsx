// Démo du rouleau du temps hors du 學 : 周 → 秦, curseur par défaut (point d'encre), cartouche d'époque minimal.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { TimeScrollConfig, TimeScrollStage, tagIn } from './TimeScroll';

export const ROULEAU_DEMO_SECONDS = 8;
const CFG: TimeScrollConfig = { at: 1.2, from: 1, to: 2, years: [-1046, -221] };

export const RouleauDemo: React.FC = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
  const t = useCurrentFrame() / useVideoConfig().fps;
  const a = tagIn(CFG, t);
  return (
    <AbsoluteFill>
      <TimeScrollStage cfg={CFG} fromLandscape={{ seed: 9, since: 0 }} toLandscape={{ seed: 21, until: ROULEAU_DEMO_SECONDS + 1.3 }} defaultCursor />
      {/* cartouche : le sceau du rouleau s'y pose (centre 156, 136 ; 92 px) */}
      <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a }}>
        <div style={{ width: 92, height: 92, background: 'rgba(192,57,43,0.92)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0' }}>秦</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: 'rgb(29,25,21)' }}>QIN</div>
      </div>
    </AbsoluteFill>
  );
};
