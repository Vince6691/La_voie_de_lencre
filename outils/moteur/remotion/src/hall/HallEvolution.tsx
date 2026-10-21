// Panel d'évolution n°3 (série 墨道) : « L'édifice qui change » — un hall impérial typique tourne en 3D sur le fond shuimo
// pendant que ses pièces se démontent et se remontent : le Tang s'assemble, puis un élément héros par époque — les consoles
// (Song), les colonnes remplacées en cercle et le socle (Ming), un étage qui tombe du ciel (Qing) ; le reste et les couleurs
// évoluent discrètement.
// Le compteur d'années est celui du rouleau 3D (rouleau3d/YearPlate : chiffres Cinzel dorés, période nommée au-dessus,
// voile sombre en bas), continu de Tang à Qing ; les périodes traversées viennent de periodes.ts. 10 s, 16:9.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { Mood, compose } from '../shuimo/layout';
import { travelM } from '../rouleau/TimeScroll';
import { Rouleau3DConfig, YearPlate } from '../rouleau3d/Rouleau3D';
import { cartouche } from '../periodes';
import { Hall, HallState, InkShadow, OrbitCamera } from './Hall3D';
import { DUR, HALLS, STATIONS, T0, hallAt, hxOf, introOf, kOf, progress, smooth, stepOf } from './params';

export const HALL_SECONDS = 10;
const INK = 'rgb(29,25,21)';
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const IDS = ['tang', 'song', 'ming', 'qing'];

// configuration du compteur du rouleau 3D : de Tang (857) à Qing (1697) ; les périodes traversées (Song, Yuan, Ming…) s'en déduisent
const YEARS: Rouleau3DConfig = { at: 0, de: 'tang', vers: 'qing', annees: [STATIONS[0].year, STATIONS[3].year], fromLand: { seed: 41, mood: 'aube' }, toLand: { seed: 33, mood: 'aube' } };
// un paysage par époque : l'aube dorée des Tang, la brume des Song, le plein jour des Ming, l'aube des Qing
const LANDS: { seed: number; mood: Mood }[] = [{ seed: 41, mood: 'aube' }, { seed: 9, mood: 'brume' }, { seed: 21, mood: 'jour' }, { seed: 33, mood: 'aube' }];

const useFonts = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
      new FontFace('ShuimoCaps', `url(${staticFile('fonts/Cinzel.ttf')})`, { weight: '400 900' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
};

// cartouche d'époque (même gabarit que Rouleau3DDemo) : sceau, nom de la période, hall
const Tag: React.FC<{ zh: string; name: string; dates: string; a: number }> = ({ zh, name, dates, a }) => (
  <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a }}>
    <div style={{ width: 92, height: 92, background: 'rgba(192,57,43,0.92)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, lineHeight: 1, color: '#f6eee0' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: INK }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 30, color: '#6b5d50' }}>{dates}</div>
    </div>
  </div>
);

export const HallEvolution: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  // état du hall : la transformation en cours (i, k), l'avancement continu, la construction du Tang à l'ouverture
  const { i, k } = stepOf(t), prog = progress(t), intro = introOf(t);
  const p = hallAt(i, i + 1, k), hx = hxOf(prog);
  const state: HallState = { p, A: HALLS[i], B: HALLS[i + 1], i, k, prog, intro };
  // l'année du compteur suit le bâtiment, par à-coups adoucis : le hall est « Song » quand le compteur dit 1103
  const i0 = Math.min(2, Math.floor(prog)), year = lerp(STATIONS[i0].year, STATIONS[i0 + 1].year, smooth(0, 1, prog - i0));

  // paysages : celui de l'époque quittée glisse vers la gauche, le suivant arrive par la droite (accélération du rouleau)
  const scrollAt = (tt: number) => [0, 1, 2].reduce((a, j) => a + 1900 * travelM(kOf(tt, j)), 0);
  const S = scrollAt(t) + 0.001, speed = (scrollAt(t + 1 / fps) - scrollAt(t)) * fps;
  const Pland = S / 1900;
  const shots = useMemo(() => LANDS.map((l) => compose(l.seed, { move: 'still', mood: l.mood, duration: HALL_SECONDS })), []);

  // caméra 3D : un seul tour complet (de trois quarts jusqu'à la façade), projection parallèle (comme le pavillon 界畫) ;
  // elle se rapproche des consoles pendant leur démontage, recule pour la ronde des colonnes et pour l'étage qui tombe.
  const turn = smooth(0, 9.2, t), angle = lerp(-0.62, 2 * Math.PI, 0.35 * turn + 0.65 * (0.5 - 0.5 * Math.cos(Math.PI * turn)));
  const bump = [0, 1, 2].map((j) => Math.pow(Math.sin(Math.PI * kOf(t, j)), 2));
  const top = p.platH + p.colH + 0.4 + p.brH + p.ridgeH + p.tier2 * 1.0;
  const diag = Math.hypot(2 * (hx + p.over), 2 * (2 + p.over));
  const zoom = Math.min(1150 / diag, 600 / top) * (1 + 0.5 * bump[0] - 0.08 * bump[1] - 0.12 * bump[2]);
  const yBr = p.platH + p.colH + 0.3, tBase = (660 - 540) / zoom, tBr = yBr - 160 / zoom;
  const target = lerp(tBase, tBr, 0.85 * bump[0]) + 0.6 * bump[2];
  const appear = smooth(0, 0.6, t);

  // cartouche : celui de l'époque la plus proche, qui s'efface le temps de la transformation
  const n = Math.min(3, Math.round(prog)), dev = Math.abs(prog - n);
  const capA = (1 - smooth(0.12, 0.4, dev)) * smooth(1.2, 2.0, t);
  const tag = cartouche(IDS[n], `${STATIONS[n].name} · ${STATIONS[n].label}`);

  return (
    <AbsoluteFill style={{ background: '#f8f5ee' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="ink3d" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      {LANDS.map((_, e) => {
        const d = Pland - e;
        if (d < -1 || d > 1) return null;
        const op = d <= 0 ? smooth(0.15, 0.55, 1 + d) : 1 - smooth(0.45, 0.85, d);
        return (
          <AbsoluteFill key={e} style={{ opacity: op }}>
            <ShuimoBackground shot={shots[e]} duration={HALL_SECONDS} halo={false} scroll={S - 1900 * e} scrollSpeed={speed} />
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 50% at 50% 42%, rgba(250,247,240,0.8) 0%, rgba(250,247,240,0.5) 60%, rgba(250,247,240,0) 100%)' }} />
      <AbsoluteFill style={{ opacity: appear, filter: `url(#ink3d)` }}>
        <ThreeCanvas width={width} height={height} orthographic flat linear gl={{ alpha: true, antialias: true }} camera={{ position: [40, 30, 40], zoom: 100 }}>
          <OrbitCamera angle={angle} elev={0.17} target={target} zoom={zoom} />
          <InkShadow size={20 + 4 * (hx - 3.5)} />
          <Hall s={state} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Tag {...tag} a={capA} />
      {/* compteur du rouleau 3D : continu, doré, en bas du cadre */}
      <YearPlate cfg={YEARS} year={year} a={smooth(0.5, 1.3, t)} />
      {[0, 1, 2].map((j) => (
        <Sequence key={j} from={Math.round((T0 + DUR * (j + 0.85)) * fps)}><Audio src={staticFile('rouleau/gong.wav')} volume={0.22} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
