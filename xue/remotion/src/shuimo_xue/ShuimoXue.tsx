// Essai « tout shuimo » (≈ 43 s) : scènes Shang et Zhou du 學 sur papier xuan, avec la voix existante.
// Paysage à l'encre (fond-shuimo) → estampage du plastron, fissures, signe révélé → l'estampage sèche, le signe
// reste à l'encre, ses composantes prennent les pigments minéraux → rouleau du temps (le paysage défile, le ciel
// enchaîne jours et nuits, les années défilent, le signe voyage au centre) → estampage de bronze, l'enfant apparaît.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { IMPACT, INK, InkStage, PIGMENT, SEALS, T, TL, seg, sealX, travelM, travelU } from './InkStage';
import { rng } from '../shuimo/common';
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
// ── rouleau du temps (T.travel) : le paysage de l'époque quittée glisse vers la gauche en parallaxe, celui de la
// nouvelle époque arrive par la droite ; lent, rapide, lent. Le paysage s'affirme pendant la traversée.
const SCROLL = 1900;
const ease = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const DUR = T.travel[1] - T.travel[0];
// vitesse du défilement (px/s), pour le flou, le vent et le vignettage
const scrollSpeed = (t: number) => (SCROLL * (travelM(travelU(t + 1 / 30)) - travelM(travelU(t)))) * 30;
const MAXSPEED = 3000;
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
  const m = travelM(u), S = SCROLL * m, speed = (SCROLL * (travelM(travelU(t + dt)) - m)) / dt;
  const strong = seg(u, 0, 0.25) * (1 - seg(u, 0.75, 1)); // le paysage s'affirme pendant la traversée
  const faint = 0.45 + 0.4 * strong;
  const ends = interpolate(t, [from, from + 1.2, to - 1.2, to], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const op = role === 'from' ? Math.min(ends, 1 - seg(m, 0.45, 0.85)) : Math.min(ends > 0 ? 1 : 0, seg(m, 0.15, 0.55)) * (t > to - 1.2 ? ends : 1);
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
  const a = seg(u, 0.05, 0.2) * (1 - seg(u, 0.74, 0.8));
  const p = travelM(u) * 2, frac = p % 1, day = frac < 0.5, s = (frac % 0.5) * 2;
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

// ── frise des époques au centre : un trait d'encre se trace, les sceaux se posent ; le petit 學 (dessiné par
// InkStage) glisse de 商 à 周 ; à l'arrivée « tac », le sceau 周 se remplit et scintille, puis s'envole vers le haut à
// gauche où il devient le cartouche de l'époque ; la frise s'efface. Le compteur d'années est au-dessus.
const TAG = { x: 110 + 46, y: 90 + 46, size: 92 }; // centre et taille du sceau du cartouche (EraTag)
const Seal: React.FC<{ zh: string; x: number; y: number; size: number; fill: number; glow?: number; a?: number }> = ({ zh, x, y, size, fill, glow = 0, a = 1 }) => (
  <div style={{
    position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: a, borderRadius: size * 0.11,
    background: rgb(PIGMENT.hand, 0.92 * fill), border: `${Math.max(2, size * 0.045)}px solid ${rgb(PIGMENT.hand, 0.55 + 0.4 * fill)}`, boxSizing: 'border-box',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: size * 0.68, lineHeight: 1,
    color: fill > 0.5 ? '#f6eee0' : rgb(PIGMENT.hand, 0.85), boxShadow: glow > 0 ? `0 0 ${36 * glow}px ${10 * glow}px rgba(235,120,60,${0.55 * glow})` : 'none',
  }}>{zh}</div>
);
const Timeline: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const u = travelU(t);
  if (u <= 0 || u >= 1.02) return null;
  const out = 1 - seg(u, 0.87, 0.95);
  const line = seg(u, 0, 0.12);
  const click = IMPACT, flash = Math.exp(-(((u - click) / 0.03) ** 2)) * (u > click - 0.005 ? 1 : 0);
  const x0 = sealX(0) - 100, x1 = sealX(SEALS.length - 1) + 100;
  return (
    <AbsoluteFill>
      {/* papier sous la frise, pour la lisibilité sur le paysage */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 48% 22% at 50% 57%, rgba(250,247,240,0.85), rgba(250,247,240,0))', opacity: line * out }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: out }}>
        <path d={`M${x0},${TL.y} L${x0 + (x1 - x0) * line},${TL.y + 1}`} stroke={inkCss} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.75} />
      </svg>
      {SEALS.map((sl, i) => {
        const pop = seg(u, 0.02 + i * 0.013, 0.06 + i * 0.013);
        if (pop <= 0) return null;
        const isZhou = i === 1, done = i === 0 || (isZhou && u >= click);
        const fillK = i === 0 ? 1 : isZhou ? seg(u, click, click + 0.03) : 0;
        const size = 64 * (0.6 + 0.4 * pop) * (isZhou ? 1 + 0.28 * flash : 1);
        const a = pop * out * (isZhou && u > 0.86 ? 0 : 1) * (done || isZhou ? 1 : 0.55);
        return (
          <React.Fragment key={sl.zh}>
            <Seal zh={sl.zh} x={sealX(i)} y={TL.y} size={size} fill={fillK} glow={isZhou ? flash : 0} a={a} />
            <div style={{ position: 'absolute', left: sealX(i) - 60, width: 120, top: TL.y + 46, textAlign: 'center', fontFamily: 'ShuimoLatin', fontSize: 24, color: '#6b5d50', opacity: pop * out * (done || isZhou ? 0.9 : 0.5) }}>{sl.date}</div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// compteur d'années au-dessus de la frise (écran) : 1250 → 1046 av. J.-C., chiffres flous dans la vitesse
const YearCounter: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const u = travelU(t);
  if (u <= 0 || u >= 1) return null;
  const a = seg(u, 0.06, 0.15) * (1 - seg(u, 0.73, 0.78));
  const year = Math.round(1250 - (1250 - 1046) * travelM(u));
  const blur = Math.min(4, (3.5 * scrollSpeed(t)) / MAXSPEED);
  return (
    <div style={{ position: 'absolute', width: '100%', top: 300, textAlign: 'center', opacity: a }}>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 88, letterSpacing: 4, color: rgb(PIGMENT.hand), filter: `blur(${blur.toFixed(2)}px)`, textShadow: '0 0 18px rgba(250,247,240,0.9)' }}>
        {year} <span style={{ fontSize: 44, fontWeight: 500 }}>av. J.-C.</span>
      </div>
    </div>
  );
};

// ── caméra : recule pour montrer le rouleau entier (bâtons, montage de soie, table), puis, en un seul mouvement
// continu, revient au plan normal pendant l'approche et l'envol du sceau ; à l'impact, une brève secousse (3 %)
function camera(u: number) {
  const id = { z: 1, fx: 960, fy: 540 };
  if (u <= 0 || u >= 1) return id;
  const back = u < 0.12 ? ease(u / 0.12) : 1 - ease((u - 0.72) / 0.28);
  const punch = u > IMPACT ? 0.03 * Math.exp(-(u - IMPACT) / 0.025) : 0;
  return { z: (1 - 0.2 * back) * (1 + punch), fx: 960, fy: 540 };
}
const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const c = camera(travelU(t));
  return (
    <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${960 - c.fx * c.z}px, ${540 - c.fy * c.z}px) scale(${c.z})` }}>
      {children}
    </AbsoluteFill>
  );
};

// le rouleau comme objet : papier ombré sur une table de bois sombre, bandes de soie du montage en haut et en bas,
// deux rouleaux aux extrémités (le papier s'enroule à gauche, se déroule à droite) — visibles quand la caméra recule
const ScrollObject: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const u = travelU(t), roll = SCROLL * travelM(u) * 0.35;
  const show = u > 0 && u < 1;
  const roller = (x: number) => (
    <div style={{ position: 'absolute', left: x, top: -70, width: 72, height: 1220 }}>
      <div style={{ position: 'absolute', left: 22, top: 0, width: 28, height: 1220, borderRadius: 14, background: 'linear-gradient(90deg,#3a2614,#8a5e34 45%,#3a2614)' }} />
      <div style={{ position: 'absolute', left: 0, top: 40, width: 72, height: 1140, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        background: `repeating-linear-gradient(90deg, rgba(120,100,70,0.10) 0 3px, rgba(0,0,0,0) 3px 11px), linear-gradient(90deg,#b9ad93,#f1e9d8 45%,#a89b80)`,
        backgroundPositionX: `${roll % 11}px, 0` }} />
      {[0, 1188].map((y) => <div key={y} style={{ position: 'absolute', left: 16, top: y, width: 40, height: 32, borderRadius: 8, background: 'linear-gradient(90deg,#9fae9b,#e3ebdd 50%,#8c9b88)' }} />)}
    </div>
  );
  return (
    <>
      {show && <div style={{ position: 'absolute', left: -6, top: -52, width: 1932, height: 1184, background: '#d6cbb2', boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
        backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0 40px, rgba(90,70,40,0.35) 40px 42px, rgba(0,0,0,0) 42px 1142px, rgba(90,70,40,0.35) 1142px 1144px, rgba(0,0,0,0) 1144px)' }} />}
      <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', width: 1920, height: 1080, objectFit: 'cover' }} />
      {show && roller(-78)}
      {show && roller(1926)}
    </>
  );
};

// vent du temps : pétales de prunier et poussières d'encre filent à l'inverse du mouvement, s'étirent avec la vitesse
const WIND = (() => {
  const R = rng(77);
  return Array.from({ length: 70 }, (_, i) => ({ x0: R() * 2120, y0: 60 + R() * 960, par: 0.6 + R() * 1.2, petal: R() < 0.38, size: 0.6 + R() * 0.7, ph: R() * 6.28, i }));
})();
const Wind: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const u = travelU(t);
  if (u <= 0.08 || u >= 0.84) return null;
  const pres = seg(u, 0.1, 0.22) * (1 - seg(u, 0.74, 0.82)), sp = scrollSpeed(t), D = SCROLL * travelM(u);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {WIND.map((p) => {
        const x = ((((p.x0 - D * 1.7 * p.par - (t - T.travel[0]) * 30 * p.par) % 2120) + 2120) % 2120) - 100;
        const y = p.y0 + 16 * Math.sin(t * 1.4 + p.ph) + (p.petal ? 40 * u * p.par : 0);
        const stretch = 1 + Math.min(7, (sp * p.par) / 520);
        const rx = (p.petal ? 7 : 2) * p.size * stretch, ry = (p.petal ? 4 : 1.6) * p.size;
        return <ellipse key={p.i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${p.petal ? 8 * Math.sin(t * 3 + p.ph) : 0} ${x} ${y})`}
          fill={p.petal ? 'rgb(238,200,204)' : 'rgb(40,34,30)'} opacity={pres * (p.petal ? 0.85 : 0.45)} />;
      })}
    </svg>
  );
};
// vignettage : resserre le regard pendant la vitesse
const Vignette: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const u = travelU(t);
  if (u <= 0 || u >= 1) return null;
  const k = Math.min(1, scrollSpeed(t) / MAXSPEED) * 0.75 + 0.25 * seg(u, 0.05, 0.15) * (1 - seg(u, 0.84, 0.95));
  return <AbsoluteFill style={{ background: 'radial-gradient(ellipse 62% 58% at 50% 52%, rgba(20,14,10,0) 55%, rgba(20,14,10,0.55) 100%)', opacity: k }} />;
};
// le sceau 周 s'envole de la frise vers le cartouche (écran) : il part de sa place à l'écran au moment de l'envol
const FlyingSeal: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const u = travelU(t);
  if (u <= 0.86 || u >= 0.985) return null;
  const c = camera(0.86), sx = 960 + (sealX(1) - c.fx) * c.z, sy = 540 + (TL.y - c.fy) * c.z;
  const k = ease((u - 0.86) / 0.12);
  return <Seal zh="周" x={lerp(sx, TAG.x, k)} y={lerp(sy, TAG.y, k)} size={lerp(64 * c.z * 1.15, TAG.size, k)} fill={1} glow={0.5 * (1 - k)} />;
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
  const zhou = seg(t, T.travel[0] + 0.975 * DUR, T.travel[1] + 0.05); // le sceau volant s'y pose
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
    <AbsoluteFill style={{ background: 'repeating-linear-gradient(92deg, #2b2119 0 6px, #30251c 6px 13px, #271e17 13px 21px)' }}>
      <Camera>
        <ScrollObject />
        {/* Anyang à l'aube, puis un paysage retenu derrière l'estampage ; le rouleau du temps mène aux Zhou */}
        <Landscape seed={14} from={0} to={7.4} move="pan" mood="aube" />
        <TravelLandscape seed={5} from={5.8} to={T.travel[1] + 0.2} mood="jour" role="from" />
        <TravelLandscape seed={9} from={T.travel[0]} to={SHUIMO_XUE_SECONDS + 1.3} mood="jour" role="to" />
        <SkyCycles />
        <InkStage />
        <Timeline />
      </Camera>
      <Vignette />
      <Wind />
      <YearCounter />
      <FlyingSeal />
      <Overlays />
      <Audio src={staticFile('voice/s02.wav')} volume={gain.voice_gain} />
      {/* rouleau du temps : souffle, glissando de guzheng, silence, impact ; gong quand le sceau se pose */}
      <Sequence from={Math.round(T.travel[0] * fps)}><Audio src={staticFile('shuimo_xue/rouleau.wav')} volume={0.6} /></Sequence>
      <Sequence from={Math.round((T.travel[0] + 0.97 * DUR) * fps)}><Audio src={staticFile('shuimo_xue/gong.wav')} volume={0.22} /></Sequence>
      <Sequence from={Math.round(S03_AT * fps)}>
        <Audio src={staticFile('voice/s03.wav')} endAt={Math.round(S03_END * fps)}
          volume={(f) => gain.voice_gain * interpolate(f / fps, [S03_END - 0.4, S03_END], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      </Sequence>
    </AbsoluteFill>
  );
};
