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
import { DUR, HALLS, STATIONS, T0, T_INTRO, hallAt, hxOf, introOf, kOf, progress, smooth, stepOf } from './params';

export const HALL_SECONDS = 10;
const INK = 'rgb(29,25,21)';
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const IDS = ['tang', 'song', 'ming', 'qing'];
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
const easeIO = (u: number) => smooth(0, 1, u);

// sceau d'époque : il est frappé sur le compteur (« tac »), tenu un instant, puis s'envole vers le cartouche où il se pose
const ARR = [{ n: 0, stamp: 1.15, fly0: 1.3, fly1: 1.9 }].concat([1, 2, 3].map((n) => {
  const te = T0 + DUR * n; // arrivée de l'époque
  return { n, stamp: te - 0.55, fly0: te - 0.4, fly1: te + 0.15 };
}));
// impacts qui font vibrer la caméra : toit Tang à l'ouverture, étage des Qing
const IMPACTS = [{ t: T_INTRO, amp: 0.6 }, { t: T0 + DUR * 2 + 0.75 * DUR, amp: 1.0 }];
const EraSeal: React.FC<{ a: (typeof ARR)[0]; t: number }> = ({ a, t }) => {
  if (t < a.stamp || t > a.fly1 + 0.02) return null;
  const st = clamp((t - a.stamp) / 0.18), fl = easeIO((t - a.fly0) / (a.fly1 - a.fly0));
  const x = lerp(1540, 156, fl), y = lerp(880, 136, fl) - 120 * Math.sin(Math.PI * fl);
  const size = lerp(104, 92, fl) * (1.6 - 0.6 * easeOut(st)), squash = fl > 0 ? 1 : lerp(0.82, 1, easeOut(st));
  return (
    <div style={{
      position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size * 0.11, background: 'rgba(192,57,43,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: size * 0.68, lineHeight: 1, color: '#f6eee0',
      opacity: easeOut(st) * (1 - smooth(0.92, 1, fl)), transform: `rotate(${-0.06 * (1 - fl)}rad) scaleY(${squash})`,
      filter: `drop-shadow(0 ${10 * Math.sin(Math.PI * fl) + 4}px ${12 + 8 * Math.sin(Math.PI * fl)}px rgba(60,20,10,0.35))`,
    }}>{STATIONS[a.n].zh}</div>
  );
};

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
  const shine = 0.3 + 0.8 * smooth(8.8, 9.4, t);
  const state: HallState = { p, A: HALLS[i], B: HALLS[i + 1], i, k, prog, intro, t, shine };
  // l'année du compteur suit le bâtiment, par à-coups adoucis : le hall est « Song » quand le compteur dit 1103
  const yearAt = (tt: number) => { const pg = progress(tt), j = Math.min(2, Math.floor(pg)); return lerp(STATIONS[j].year, STATIONS[j + 1].year, smooth(0, 1, pg - j)); };
  const year = yearAt(t), rollSpeed = Math.abs(yearAt(t + 1 / fps) - yearAt(t - 1 / fps)) * (fps / 2);

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
  // impacts : un coup de zoom et un tremblement qui s'éteignent vite ; plan final : poussée lente vers le faîtage
  const hits = IMPACTS.filter((h) => t >= h.t), dt = (h: { t: number }) => t - h.t;
  const punch = hits.reduce((a, h) => a + h.amp * Math.exp(-9 * dt(h)), 0), shake = hits.reduce((a, h) => a + h.amp * Math.exp(-14 * dt(h)) * Math.sin(dt(h) * 55), 0);
  const fp = smooth(9.1, 10, t);
  const zoom = Math.min(1150 / diag, 600 / top) * (1 + 0.5 * bump[0] - 0.08 * bump[1] - 0.12 * bump[2]) * (1 + 0.022 * punch) * (1 + 0.035 * fp);
  const yBr = p.platH + p.colH + 0.3, tBase = (660 - 540) / zoom, tBr = yBr - 160 / zoom;
  const target = lerp(tBase, tBr, 0.85 * bump[0]) + 0.6 * bump[2] + 0.06 * shake + 0.3 * fp;
  const elev = lerp(0.11, 0.2, smooth(0, 9.4, t)); // grue douce : on part bas, on monte lentement
  const appear = smooth(0, 0.6, t);

  // cartouches : celui d'une époque apparaît quand son sceau s'y pose, et s'efface quand le sceau suivant est frappé
  const tagA = (n: number) => smooth(ARR[n].fly1 - 0.05, ARR[n].fly1 + 0.2, t) * (ARR[n + 1] ? 1 - smooth(ARR[n + 1].stamp - 0.25, ARR[n + 1].stamp + 0.05, t) : 1);
  // reflet doré sur le compteur à chaque frappe de sceau
  const glint = ARR.map((a) => (t >= a.stamp - 0.2 && t <= a.stamp + 0.6 ? (t - (a.stamp - 0.2)) / 0.8 : 0)).find((g) => g > 0) ?? 0;
  // ouverture en encre : tout est d'abord en lavis gris, la couleur s'ouvre depuis le hall
  const bloom = smooth(0.1, 2.3, t) * 105;

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
          <OrbitCamera angle={angle} elev={elev} target={target} zoom={zoom} />
          <InkShadow size={20 + 4 * (hx - 3.5)} />
          <Hall s={state} />
        </ThreeCanvas>
      </AbsoluteFill>
      {t < 2.7 && <AbsoluteFill style={{ mixBlendMode: 'saturation', background: `radial-gradient(circle at 50% 46%, rgba(128,128,128,0) ${bloom}%, rgba(128,128,128,1) ${bloom + 20}%)` }} />}
      {IDS.map((id, n) => { const a = tagA(n); return a > 0.001 ? <Tag key={id} {...cartouche(id, `${STATIONS[n].name} · ${STATIONS[n].label}`)} a={a} /> : null; })}
      {/* compteur du rouleau 3D : continu, doré, chiffres qui défilent, en bas du cadre */}
      <YearPlate cfg={YEARS} year={year} a={smooth(0.5, 1.3, t)} roll rollSpeed={rollSpeed} glint={glint} />
      {ARR.map((a) => <EraSeal key={a.n} a={a} t={t} />)}
      {/* signature de la chaîne : le sceau 墨道 se pose en bas à droite après l'arrivée aux Qing */}
      {t > 9.5 && (
        <div style={{
          position: 'absolute', left: 1640, top: 900, width: 84, height: 84, background: '#b0281c', borderRadius: 6, color: '#f6eadc', fontFamily: 'ShuimoKai', fontSize: 33, lineHeight: '37px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', opacity: 0.92 * clamp((t - 9.5) / 0.25), transform: `scale(${1.25 - 0.25 * easeOut((t - 9.5) / 0.25)})`, boxShadow: '0 0 0 2px rgba(246,234,220,0.25)',
        }}>墨道</div>
      )}
      {[0, 1, 2].map((j) => (
        <Sequence key={j} from={Math.round((T0 + DUR * (j + 0.85)) * fps)}><Audio src={staticFile('rouleau/gong.wav')} volume={0.22} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
