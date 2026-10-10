// Essai « tout shuimo » (≈ 43 s) : scènes Shang et Zhou du 學 sur papier xuan, avec la voix existante.
// Paysage à l'encre (fond-shuimo) → estampage du plastron, fissures, signe révélé → l'estampage sèche, le signe
// reste à l'encre, ses composantes prennent les pigments minéraux → rouleau du temps (le paysage défile, le ciel
// enchaîne jours et nuits, les années défilent, le signe voyage au centre) → estampage de bronze, l'enfant apparaît.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { INK, InkStage, PIGMENT, T, seg } from './InkStage';
import gain from '../data/audio_gain.json';

export const SHUIMO_XUE_SECONDS = 43.0;
const S03_AT = 26.8, S03_END = 15.8; // la voix du clip 3 s'arrête après « l'enfant »

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
// ── rouleau du temps (T.travel) : le paysage de l'époque quittée glisse vers la gauche en parallaxe, celui de la
// nouvelle époque arrive par la droite ; lent, rapide, lent. Le paysage s'affirme pendant la traversée.
const SCROLL = 1900;
const easeTravel = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const travelU = (t: number) => (t - T.travel[0]) / (T.travel[1] - T.travel[0]);
const TravelLandscape: React.FC<{ seed: number; from: number; to: number; mood: 'jour' | 'aube'; role: 'from' | 'to' }> = ({ seed, from, to, mood, role }) => {
  const { fps } = useVideoConfig();
  const shot = compose(seed, { move: 'still', mood, duration: to - from });
  return (
    <Sequence from={Math.round(from * fps)} durationInFrames={Math.round((to - from) * fps)}>
      <TravelInner shot={shot} from={from} to={to} role={role} />
    </Sequence>
  );
};
const TravelInner: React.FC<{ shot: ReturnType<typeof compose>; from: number; to: number; role: 'from' | 'to' }> = ({ shot, from, to, role }) => {
  const { fps } = useVideoConfig();
  const t = from + useCurrentFrame() / fps;
  const u = travelU(t), dt = 1 / fps;
  const S = SCROLL * easeTravel(u), speed = (SCROLL * (easeTravel(travelU(t + dt)) - easeTravel(u))) / dt;
  const strong = seg(u, 0, 0.25) * (1 - seg(u, 0.75, 1)); // le paysage s'affirme pendant la traversée
  const faint = 0.45 + 0.4 * strong;
  const ends = interpolate(t, [from, from + 1.2, to - 1.2, to], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const op = role === 'from' ? Math.min(ends, 1 - seg(u, 0.5, 0.9)) : Math.min(ends > 0 ? 1 : 0, seg(u, 0.15, 0.55)) * (t > to - 1.2 ? ends : 1);
  return (
    <AbsoluteFill style={{ opacity: op * faint }}>
      <ShuimoBackground shot={shot} duration={to - from} scroll={role === 'from' ? S : S - SCROLL} scrollSpeed={speed} />
    </AbsoluteFill>
  );
};

// ciel du voyage : soleil et lune passent en arcs rapides, le jour et la nuit alternent (deux cycles)
const SkyCycles: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const u = travelU(t);
  if (u <= 0 || u >= 1) return null;
  const a = seg(u, 0.05, 0.2) * (1 - seg(u, 0.8, 0.95));
  const p = easeTravel(u) * 2, frac = p % 1, day = frac < 0.5, s = (frac % 0.5) * 2;
  const x = 1760 - 1600 * s, y = 380 - 250 * Math.sin(Math.PI * s);
  const night = day ? 0 : Math.sin(Math.PI * s);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(90,104,140,0.55), rgba(140,150,175,0.35))', mixBlendMode: 'multiply', opacity: 0.6 * night }} />
      <Img src={staticFile(`shuimo/elements/${day ? 'ciel_a1.png' : 'ciel_a3.png'}`)}
        style={{ position: 'absolute', left: x - 60, top: y - 60, width: 120, height: 120, opacity: Math.sin(Math.PI * s) ** 0.5 * (day ? 0.95 : 0.8) }} />
    </AbsoluteFill>
  );
};

// compteur d'années : 1250 → 1046 av. J.-C., vite au milieu, flou de vitesse ; 商 → 周 dessous
const YearCounter: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const u = travelU(t);
  if (u <= 0 || u >= 1) return null;
  const a = seg(u, 0.06, 0.18) * (1 - seg(u, 0.86, 0.98));
  const e = easeTravel(u), year = Math.round(1250 - (1250 - 1046) * e);
  const blur = Math.min(3.5, Math.abs(easeTravel(u + 0.01) - e) * 120);
  return (
    <div style={{ position: 'absolute', width: '100%', top: 120, textAlign: 'center', opacity: a }}>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 76, letterSpacing: 4, color: rgb(PIGMENT.hand), filter: `blur(${blur.toFixed(2)}px)` }}>
        {year} <span style={{ fontSize: 40, fontWeight: 500 }}>av. J.-C.</span>
      </div>
      <div style={{ fontFamily: 'ShuimoKai', fontSize: 40, color: inkCss, marginTop: 6, letterSpacing: 18 }}>
        <span style={{ opacity: 1 - 0.65 * e }}>商</span><span style={{ opacity: 0.45 }}> ··· </span><span style={{ opacity: 0.35 + 0.65 * e }}>周</span>
      </div>
    </div>
  );
};

const Fade: React.FC<{ len: number; faint: number; children: React.ReactNode }> = ({ len, faint, children }) => {
  const f = useCurrentFrame() / useVideoConfig().fps;
  const o = interpolate(f, [0, 1.2, len - 1.2, len], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o * faint }}>{children}</AbsoluteFill>;
};

// cartouche d'époque : sceau vermillon + nom + dates, en haut à gauche
const EraTag: React.FC<{ zh: string; name: string; dates: string; a: number; stamp?: boolean }> = ({ zh, name, dates, a, stamp }) => (
  <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a, transform: stamp ? `scale(${1.25 - 0.25 * a})` : `translateY(${(1 - a) * 10}px)`, transformOrigin: '46px 46px' }}>
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
  const zhou = seg(t, T.travel[1] - 0.3, T.travel[1] - 0.05); // tamponné à l'arrivée
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
      <div style={{ position: 'absolute', width: '100%', top: 1010, textAlign: 'center', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 28, color: '#6b5d50', opacity: cap(31.6, 36.1) }}>
        estampage d'inscription · vase 大盂鼎, Zhou de l'Ouest
      </div>
      <Label x={1290} y={820} zh="子" text="l'enfant" color={PIGMENT.child} a={seg(t, T.child + 0.4, T.child + 1.0)} />
      {/* sceau de collection posé sur la feuille de bronze */}
      <div style={{ position: 'absolute', left: 1352, top: 880, width: 64, height: 64, border: `4px solid ${rgb(PIGMENT.hand, 0.9)}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 26, lineHeight: 1, color: rgb(PIGMENT.hand, 0.9), opacity: seg(t, 32.8, 33.1) * (1 - seg(t, T.bronzeOut[0], T.bronzeOut[1])), transform: `scale(${1.15 - 0.15 * seg(t, 32.8, 33.1)})`, writingMode: 'vertical-rl' }}>墨道</div>
    </AbsoluteFill>
  );
};

export const ShuimoXue: React.FC = () => {
  useFonts();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', width: 1920, height: 1080, objectFit: 'cover' }} />
      {/* Anyang à l'aube, puis un paysage retenu derrière l'estampage ; les Zhou : un autre paysage */}
      <Landscape seed={14} from={0} to={7.4} move="pan" mood="aube" />
      <TravelLandscape seed={5} from={5.8} to={T.travel[1] + 0.2} mood="jour" role="from" />
      <TravelLandscape seed={9} from={T.travel[0]} to={SHUIMO_XUE_SECONDS + 1.3} mood="jour" role="to" />
      <SkyCycles />
      <InkStage />
      <YearCounter />
      <Overlays />
      <Audio src={staticFile('voice/s02.wav')} volume={gain.voice_gain} />
      {/* souffle du papier pendant le défilement, gong au tampon du sceau */}
      <Sequence from={Math.round(T.travel[0] * fps)}><Audio src={staticFile('shuimo_xue/rouleau.wav')} volume={0.5} /></Sequence>
      <Sequence from={Math.round((T.travel[1] - 0.3) * fps)}><Audio src={staticFile('shuimo_xue/gong.wav')} volume={0.32} /></Sequence>
      <Sequence from={Math.round(S03_AT * fps)}>
        <Audio src={staticFile('voice/s03.wav')} endAt={Math.round(S03_END * fps)}
          volume={(f) => gain.voice_gain * interpolate(f / fps, [S03_END - 0.4, S03_END], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      </Sequence>
    </AbsoluteFill>
  );
};
