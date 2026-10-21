// Panel d'évolution n°3 (série 墨道) : « L'édifice qui change » — un hall impérial typique tourne en 3D sur le fond shuimo
// pendant que ses pièces arrivent et partent : le toit se soulève et retombe, les pignons s'écartent avec leurs colonnes
// d'angle, les consoles se divisent, les balustres tombent un à un autour du socle, les décors arrivent de l'extérieur.
// Trois rouleaux du temps (rouleau/TimeScroll) s'enchaînent de Tang à Qing : caméra qui recule, paysages qui défilent,
// frise de sceaux, compteur d'années, impact, sceau qui s'envole vers le cartouche. 10 s, 16:9.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { Mood, compose } from '../shuimo/layout';
import {
  FlyingSeal, ScrollObject, SkyCycles, Timeline, TimeScrollConfig, Vignette, Wind, YearCounter, camera, cursorPose, geom, scrollOf, speedAt, tagIn, travelM, tsU,
} from '../rouleau/TimeScroll';
import { Hall, InkShadow, OrbitCamera } from './Hall3D';
import { DUR, STATIONS, T0, hallAtProgress, hxOf, progress, roofOff, smooth } from './params';

export const HALL_SECONDS = 10;
const INK = 'rgb(29,25,21)';
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const ERAS = STATIONS.map((s) => ({ zh: s.zh, date: String(s.year) }));
// la frise et le compteur sont sous le bâtiment ; le sceau d'arrivée s'envole vers le cartouche en haut à gauche
const CFGS: TimeScrollConfig[] = [0, 1, 2].map((i) => ({
  at: T0 + DUR * i, duration: DUR, eras: ERAS, from: i, to: i + 1, years: [STATIONS[i].year, STATIONS[i + 1].year], y: 760, counterY: 850,
}));
// un paysage par époque : l'aube dorée des Tang, la brume des Song, le plein jour des Ming, l'aube des Qing
const LANDS: { seed: number; mood: Mood }[] = [{ seed: 41, mood: 'aube' }, { seed: 9, mood: 'brume' }, { seed: 21, mood: 'jour' }, { seed: 33, mood: 'aube' }];

const useFonts = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
};

// silhouette du curseur de la frise : un petit hall au toit relevé (comme le point d'encre du rouleau)
const HallCursor: React.FC<{ c: TimeScrollConfig; t: number }> = ({ c, t }) => {
  const u = tsU(c, t);
  if (u <= 0.1 || u >= 0.86) return null;
  const g = geom(c), x = cursorPose(c, t).x, a = smooth(0.1, 0.16, u), s = 0.8;
  return (
    <svg width={80 * s} height={56 * s} viewBox="0 0 80 56" style={{ position: 'absolute', left: x - 40 * s, top: g.y - 62, opacity: a }}>
      <path d="M2,22 Q22,20 30,8 L50,8 Q58,20 78,22 L70,26 L10,26 Z" fill={INK} />
      <rect x="14" y="26" width="52" height="4" fill={INK} />
      {[16, 30, 44, 58].map((cx) => <rect key={cx} x={cx} y="30" width="4" height="18" fill={INK} />)}
      <rect x="8" y="48" width="64" height="5" fill={INK} />
    </svg>
  );
};

export const HallEvolution: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  // avancement du hall (pièces) et des rouleaux (paysages, frise)
  const prog = progress(t), hall = hallAtProgress(prog), hx = hxOf(prog), roofY = roofOff(t, prog);
  const ms = CFGS.map((c) => travelM(tsU(c, t)));
  const Pland = ms.reduce((a, b) => a + b, 0);
  const S = CFGS.reduce((a, c, i) => a + scrollOf(c) * ms[i], 0) + 0.001, speed = CFGS.reduce((a, c) => a + speedAt(c, t), 0);
  const strong = Math.max(...CFGS.map((c) => { const u = tsU(c, t); return smooth(0, 0.25, u) * (1 - smooth(0.75, 1, u)); }));
  const z = CFGS.reduce((a, c) => a * camera(tsU(c, t)), 1);
  const active = CFGS.find((c) => { const u = tsU(c, t); return u > 0 && u < 1; }) ?? CFGS[0];

  const shots = useMemo(() => LANDS.map((l) => compose(l.seed, { move: 'still', mood: l.mood, duration: HALL_SECONDS })), []);

  // caméra 3D : un seul tour complet, de trois quarts jusqu'à la façade ; projection parallèle (comme le pavillon 界畫)
  const turn = smooth(0, 9.2, t), angle = lerp(-0.62, 2 * Math.PI, 0.35 * turn + 0.65 * (0.5 - 0.5 * Math.cos(Math.PI * turn)));
  const height3 = hall.platH + hall.colH + 0.4 + hall.brH + hall.ridgeH + hall.tier2;
  const diag = Math.hypot(2 * (hx + hall.over), 2 * (2 + hall.over));
  const zoom = Math.min(1150 / diag, 520 / (height3 + 0.7 * roofY)), target = 0.45 * height3 - 0.9;
  const appear = smooth(0, 0.8, t);

  // cartouche d'époque : l'ancien s'efface quand le rouleau repart, le nouveau reçoit le sceau qui s'envole
  let n = 0;
  CFGS.forEach((c, i) => { if (t >= c.at + 0.975 * DUR) n = i + 1; });
  const hide = n < 3 ? smooth(CFGS[n].at, CFGS[n].at + 0.25, t) : 0;
  const capA = (n === 0 ? smooth(0.3, 1.1, t) : tagIn(CFGS[n - 1], t)) * (1 - hide);
  const st = STATIONS[n];

  return (
    <AbsoluteFill style={{ background: '#2b2119' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="ink3d" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      {/* monde du rouleau : table, paysages, hall, frise — la caméra recule pendant chaque transformation */}
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${960 - 960 * z}px, ${540 - 540 * z}px) scale(${z})` }}>
        <ScrollObject c={active} />
        {LANDS.map((_, e) => {
          const d = Pland - e;
          if (d < -1 || d > 1) return null;
          const op = (d <= 0 ? smooth(0.15, 0.55, 1 + d) : 1 - smooth(0.45, 0.85, d)) * (0.8 + 0.1 * strong);
          return (
            <AbsoluteFill key={e} style={{ opacity: op }}>
              <ShuimoBackground shot={shots[e]} duration={HALL_SECONDS} halo={false} scroll={S - 1900 * e} scrollSpeed={speed} />
            </AbsoluteFill>
          );
        })}
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 54% at 50% 46%, rgba(250,247,240,0.78) 0%, rgba(250,247,240,0.5) 60%, rgba(250,247,240,0) 100%)' }} />
        {CFGS.map((c, i) => <SkyCycles key={`s${i}`} c={c} />)}
        <AbsoluteFill style={{ opacity: appear, filter: `blur(${(1 - appear) * 14}px) url(#ink3d)` }}>
          <ThreeCanvas width={width} height={height} orthographic flat linear gl={{ alpha: true, antialias: true }} camera={{ position: [40, 30, 40], zoom: 100 }}>
            <OrbitCamera angle={angle} elev={0.17} target={target} zoom={zoom} />
            <InkShadow size={20 + 4 * (hx - 3.5)} />
            <Hall p={hall} prog={prog} roofY={roofY} />
          </ThreeCanvas>
        </AbsoluteFill>
        {CFGS.map((c, i) => <Timeline key={`t${i}`} c={c} defaultCursor={false} />)}
        {CFGS.map((c, i) => <HallCursor key={`h${i}`} c={c} t={t} />)}
      </AbsoluteFill>
      {CFGS.map((c, i) => <Vignette key={`v${i}`} c={c} />)}
      {CFGS.map((c, i) => <Wind key={`w${i}`} c={c} />)}
      {CFGS.map((c, i) => <YearCounter key={`y${i}`} c={c} />)}
      {CFGS.map((c, i) => <FlyingSeal key={`f${i}`} c={c} />)}
      {/* cartouche : le sceau du rouleau s'y pose (centre 156, 136 ; 92 px) */}
      <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: capA }}>
        <div style={{ width: 92, height: 92, background: 'rgba(192,57,43,0.92)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0' }}>{st.zh}</div>
        <div>
          <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: INK }}>{st.en}</div>
          <div style={{ fontFamily: 'ShuimoKai', fontSize: 26, color: '#5a4c40', marginTop: 2 }}>{st.name}</div>
        </div>
      </div>
      {/* sons du rouleau : souffle, glissando, silence, impact ; gong quand le sceau se pose */}
      {CFGS.map((c, i) => (
        <React.Fragment key={`a${i}`}>
          <Sequence from={Math.round(c.at * fps)}><Audio src={staticFile('rouleau/rouleau.wav')} volume={0.6} playbackRate={5 / DUR} /></Sequence>
          <Sequence from={Math.round((c.at + 0.97 * DUR) * fps)}><Audio src={staticFile('rouleau/gong.wav')} volume={0.22} /></Sequence>
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};
