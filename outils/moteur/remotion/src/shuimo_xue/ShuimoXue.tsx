// Essai « tout shuimo » (≈ 43 s) : scènes Shang et Zhou du 學 sur papier xuan, avec la voix existante.
// Paysage à l'encre (fond-shuimo) → estampage du plastron, fissures, signe révélé → l'estampage sèche, le signe
// reste à l'encre, ses composantes prennent les pigments minéraux → rouleau du temps (le paysage défile, le ciel
// enchaîne jours et nuits, les années défilent, le signe voyage au centre) → estampage de bronze, l'enfant apparaît.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { INK, InkStage, PIGMENT, T, TRAVEL, seg } from './InkStage';
import { TimeScrollStage, tagIn } from '../rouleau/TimeScroll';
import gain from '../data/audio_gain.json';

export const SHUIMO_XUE_SECONDS = 43.5;
const S03_AT = 27.3, S03_END = 15.8; // la voix du clip 3 s'arrête après « l'enfant »

const useFonts = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
};

const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const inkCss = rgb(INK);

// fond : paysage pendant un intervalle, en fondu ; faint = paysage retenu derrière le contenu
const Landscape: React.FC<{ seed: number; from: number; to: number; move: 'pan' | 'push' | 'still' | 'rise'; mood: 'jour' | 'aube'; faint?: number }> = ({ seed, from, to, move, mood, faint = 1 }) => {
  const { fps } = useVideoConfig();
  const shot = compose(seed, { move, mood, duration: to - from });
  return (
    <Sequence from={Math.round(from * fps)} durationInFrames={Math.round((to - from) * fps)}>
      <Fade len={to - from} faint={faint}><ShuimoBackground shot={shot} duration={to - from} /></Fade>
    </Sequence>
  );
};
const Fade: React.FC<{ len: number; faint: number; children: React.ReactNode }> = ({ len, faint, children }) => {
  const f = useCurrentFrame() / useVideoConfig().fps;
  const o = interpolate(f, [0, 1.2, len - 1.2, len], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o * faint }}>{children}</AbsoluteFill>;
};

// cartouche d'époque : sceau vermillon + nom + dates, en haut à gauche
const EraTag: React.FC<{ zh: string; name: string; dates: string; a: number; stamp?: boolean }> = ({ zh, name, dates, a, stamp }) => (
  <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a, transform: stamp ? 'none' : `translateY(${(1 - a) * 10}px)`, transformOrigin: '46px 46px' }}>
    <div style={{ width: 92, height: 92, background: rgb(PIGMENT.hand, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 30, color: '#6b5d50' }}>{dates}</div>
    </div>
  </div>
);

const Label: React.FC<{ x: number; y: number; zh: string; text: string; color: number[]; a: number; align?: 'left' | 'right' }> = ({ x, y, zh, text, color, a, align = 'left' }) => (
  <div style={{ position: 'absolute', top: y - 30, ...(align === 'left' ? { left: x } : { right: 1920 - x }), opacity: a, display: 'flex', alignItems: 'baseline', gap: 14, flexDirection: align === 'left' ? 'row' : 'row-reverse' }}>
    <span style={{ fontFamily: 'ShuimoKai', fontSize: 52, color: rgb(color) }}>{zh}</span>
    <span style={{ fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 34, color: '#4a3f36' }}>{text}</span>
  </div>
);

const Overlays: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const shang = seg(t, 1.0, 1.8) * (1 - seg(t, 8.8, 9.6));
  const zhou = tagIn(TRAVEL, t); // le sceau volant du rouleau du temps s'y pose
  const out1 = 1 - seg(t, T.travel[0], T.travel[0] + 0.6);
  const cap = (a: number, b: number) => seg(t, a, a + 0.5) * (1 - seg(t, b, b + 0.5));
  return (
    <AbsoluteFill>
      <EraTag zh="商" name="SHANG" dates="Anyang · v. 1250 av. J.-C." a={shang} />
      <EraTag zh="周" name="ZHOU" dates="XIe siècle av. J.-C." a={zhou} stamp />
      {/* composantes du signe Shang */}
      <Label x={1270} y={430} zh="爻" text="yáo · baguettes à compter" color={PIGMENT.yao} a={seg(t, T.yao + 0.3, T.yao + 0.9) * out1} />
      <Label x={1270} y={700} zh="宀" text="le toit" color={PIGMENT.roof} a={seg(t, T.roof + 0.3, T.roof + 0.9) * out1} />
      <Label x={650} y={430} zh="𦥑" text="deux mains" color={PIGMENT.hand} a={seg(t, T.hand + 0.3, T.hand + 0.9) * out1} align="right" />
      {/* légendes d'estampage */}
      <div style={{ position: 'absolute', width: '100%', top: 1010, textAlign: 'center', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 28, color: '#6b5d50', opacity: cap(6.2, 11.6) }}>
        estampage d'un plastron de tortue · fissures de divination 卜
      </div>
      <div style={{ position: 'absolute', width: '100%', top: 1010, textAlign: 'center', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 28, color: '#6b5d50', opacity: cap(32.1, 36.6) }}>
        estampage d'inscription · vase 大盂鼎, Zhou de l'Ouest
      </div>
      <Label x={1290} y={820} zh="子" text="l'enfant" color={PIGMENT.child} a={seg(t, T.child + 0.4, T.child + 1.0)} />
      {/* sceau de collection posé sur la feuille de bronze */}
      <div style={{ position: 'absolute', left: 1352, top: 880, width: 64, height: 64, border: `4px solid ${rgb(PIGMENT.hand, 0.9)}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 26, lineHeight: 1, color: rgb(PIGMENT.hand, 0.9), opacity: seg(t, 33.3, 33.6) * (1 - seg(t, T.bronzeOut[0], T.bronzeOut[1])), transform: `scale(${1.15 - 0.15 * seg(t, 33.3, 33.6)})`, writingMode: 'vertical-rl' }}>墨道</div>
    </AbsoluteFill>
  );
};

export const ShuimoXue: React.FC = () => {
  useFonts();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {/* Anyang à l'aube, puis un paysage retenu derrière l'estampage ; le rouleau du temps mène aux Zhou */}
      <TimeScrollStage cfg={TRAVEL} under={<Landscape seed={14} from={0} to={7.4} move="pan" mood="aube" />}
        fromLandscape={{ seed: 5, since: 5.8 }} toLandscape={{ seed: 9, until: SHUIMO_XUE_SECONDS + 1.3 }}>
        <InkStage />
      </TimeScrollStage>
      <Overlays />
      <Audio src={staticFile('voice/s02.wav')} volume={gain.voice_gain} />
      <Sequence from={Math.round(S03_AT * fps)}>
        <Audio src={staticFile('voice/s03.wav')} endAt={Math.round(S03_END * fps)}
          volume={(f) => gain.voice_gain * interpolate(f / fps, [S03_END - 0.4, S03_END], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      </Sequence>
    </AbsoluteFill>
  );
};
