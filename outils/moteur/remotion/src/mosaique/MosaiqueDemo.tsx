// Démo de la mosaïque de mots (skill mosaique-de-mots) : 学 dessiné par des mots courants qui le contiennent, trois
// gros plans, recul et vague de couleur, temps d'arrêt, puis condensation en un 学 à l'encre que la « scène suivante »
// reprend à la même place.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { MosaicConfig, MosaicTransition, mosaicSeconds } from './MosaicTransition';

const CFG: MosaicConfig = {
  glyph: '学',
  words: ['学生', '大学', '学习', '学校', '数学', '文学', '科学', '化学', '学者', '学问', '留学', '同学', '学院', '小学', '中学', '哲学',
    '学期', '学费', '自学', '医学', '学科', '美学', '学说', '放学', '上学', '学历', '学会'],
  title: '学 · xué',
  focus: [
    { word: '学生', at: 1.4, label: '学生 · l’élève' },
    { word: '大学', at: 3.2, label: '大学 · l’université' },
    { word: '数学', at: 5.0, label: '数学 · les mathématiques' },
  ],
  zoomOut: 5.8, hold: 7.2, out: 8.6,
  outroTo: { x: 960, y: 500, size: 520 },
};
const START = 0.6; // la mosaïque arrive après un plan de papier (la scène précédente)
const AFTER = 1.6; // la scène suivante reprend le 学 condensé
export const MOSAIQUE_DEMO_SECONDS = Math.ceil((START + mosaicSeconds(CFG) + AFTER) * 10) / 10;

export const MosaiqueDemo: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const [h] = useState(() => delayRender('polices'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); setReady(true); continueRender(h); });
  }, [h]);
  const end = START + mosaicSeconds(CFG);
  const o = CFG.outroTo!;
  return (
    <AbsoluteFill style={{ background: `#f3eee4 url(${staticFile('shuimo/paper.jpg')}) center/cover` }}>
      {ready && <>
        <Sequence from={Math.round(START * fps)} durationInFrames={Math.round(mosaicSeconds(CFG) * fps) + 1}>
          <AbsoluteFill style={{ opacity: Math.min(1, (t - START) / 0.4) }}><MosaicTransition cfg={CFG} /></AbsoluteFill>
        </Sequence>
        {t >= end - 0.05 && (
          <div style={{ position: 'absolute', left: o.x - o.size, top: o.y - o.size / 2, width: o.size * 2, height: o.size, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'ShuimoKai', fontSize: o.size, lineHeight: 1, color: 'rgb(26,22,19)' }}>学</div>
        )}
      </>}
    </AbsoluteFill>
  );
};
