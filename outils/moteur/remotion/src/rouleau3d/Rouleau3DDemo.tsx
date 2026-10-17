// Démos du rouleau du temps en 3D : plan Zhou (2D) → rouleau 3D → plan des Royaumes combattants (2D).
// Rouleau3DDemo : version complète (5,3 s, sceau miel) ; Rouleau3DCourtDemo : version courte (3,6 s, sceau rouge).
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { Rouleau3DConfig, Rouleau3DStage, r3Seconds, r3TagIn } from './Rouleau3D';

const BASE: Rouleau3DConfig = {
  at: 1.2, from: 1, to: 2, years: [-1046, -300],
  eras: [{ zh: '商', date: '−1200' }, { zh: '周', date: '−1046' }, { zh: '戰', date: '−300' }, { zh: '秦', date: '−221' }],
  fromLand: { seed: 9, mood: 'jour' }, toLand: { seed: 26, mood: 'brume' },
  periods: [{ from: -1046, zh: '西周', name: 'ZHOU OCCIDENTAUX' }, { from: -770, zh: '春秋', name: 'PRINTEMPS ET AUTOMNES' }, { from: -475, zh: '戰國', name: 'ROYAUMES COMBATTANTS' }],
};
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const Tag: React.FC<{ zh: string; name: string; dates: string; a: number }> = ({ zh, name, dates, a }) => (
  <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a }}>
    <div style={{ width: 92, height: 92, background: 'rgba(192,57,43,0.92)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: 'rgb(29,25,21)' }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 30, color: '#6b5d50' }}>{dates}</div>
    </div>
  </div>
);

const CFG_COMPLET: Rouleau3DConfig = { ...BASE };
const CFG_COURT: Rouleau3DConfig = { ...BASE, variant: 'court', stone: 'rouge' };
export const ROULEAU3D_DEMO_SECONDS = BASE.at + r3Seconds(CFG_COMPLET) + 1.6;
export const ROULEAU3D_COURT_DEMO_SECONDS = BASE.at + r3Seconds(CFG_COURT) + 1.6;
export const Rouleau3DDemo: React.FC = () => <Demo CFG={CFG_COMPLET} />;
export const Rouleau3DCourtDemo: React.FC = () => <Demo CFG={CFG_COURT} />;
const Demo: React.FC<{ CFG: Rouleau3DConfig }> = ({ CFG }) => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const end = CFG.at + r3Seconds(CFG);
  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <Sequence durationInFrames={Math.round((CFG.at + 0.2) * fps)}>
        <ShuimoBackground shot={compose(9, { move: 'still', mood: 'jour', duration: 10 })} duration={10} halo={false} />
      </Sequence>
      <Sequence from={Math.round((CFG.variant === 'court' ? CFG.at + 2.9 : end - 0.3) * fps)}>
        <ShuimoBackground shot={compose(26, { move: 'still', mood: 'brume', duration: 10 })} duration={10} halo={false} />
      </Sequence>
      <Tag zh="周" name="DYNASTIE ZHOU" dates="XIe siècle av. J.-C." a={1 - clamp((t - CFG.at + 0.3) / 0.4)} />
      <Rouleau3DStage cfg={CFG} />
      <Tag zh="戰" name="ROYAUMES COMBATTANTS" dates="Ve–IIIe siècle av. J.-C." a={r3TagIn(CFG, t)} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 60%, rgba(40,25,15,0.28) 100%)' }} />
    </AbsoluteFill>
  );
};
