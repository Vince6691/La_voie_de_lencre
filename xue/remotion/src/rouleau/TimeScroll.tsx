// Rouleau du temps (série 墨道) : transition « premium » d'une époque à l'autre, sur fond shuimo.
// La caméra recule et montre le rouleau (table de bois, montage de soie, deux bâtons qui tournent) ; le paysage de
// l'époque quittée défile en parallaxe (accélération franche, flou de vitesse), celui de la nouvelle arrive ; le ciel
// enchaîne jours et nuits ; une frise de sceaux se trace au centre, un curseur (fourni par l'appelant, ou un point
// d'encre) glisse du sceau de départ au sceau d'arrivée sous un compteur d'années ; ralenti, silence, impact (« tac »
// grave), le sceau d'arrivée se remplit et scintille puis s'envole vers le cartouche d'époque en haut à gauche, la
// caméra revient d'un seul mouvement au plan normal. Vent du temps (pétales, poussières d'encre), vignettage, son.
//
// Utilisation (voir skill rouleau-du-temps) :
//   const CFG: TimeScrollConfig = { at: 22.4, from: 0, to: 1, years: [-1250, -1046] };
//   <TimeScrollStage cfg={CFG} fromLandscape={{ seed: 5, since: 5.8 }} toLandscape={{ seed: 9, until: 44 }}>
//     {contenu dans le monde du rouleau : canvas, caractère…}
//   </TimeScrollStage>
//   cursorPose(CFG, t) / arrivePose(CFG, t) : où dessiner l'objet qui voyage ; tagIn(CFG, t) : opacité du cartouche.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose, Mood } from '../shuimo/layout';
import { rng } from '../shuimo/common';

export type Era = { zh: string; date: string };
// époques du 學 (dates de référence) ; remplacer par celles de la vidéo
export const ERAS_XUE: Era[] = [
  { zh: '商', date: '−1250' }, { zh: '周', date: '−1046' }, { zh: '秦', date: '−221' }, { zh: '漢', date: '−206' },
  { zh: '唐', date: '618' }, { zh: '宋', date: '960' }, { zh: '今', date: '1956' },
];
export type TimeScrollConfig = {
  at: number; // début de la transition (s, temps de la composition)
  duration?: number; // 5 s par défaut (le son est calé dessus et suit si on change)
  eras?: Era[]; from: number; to: number; // indices des sceaux de départ et d'arrivée
  years: [number, number]; // années de départ et d'arrivée (négatif = av. J.-C.)
  scroll?: number; // distance de défilement du paysage (px), 1900 par défaut
  tag?: { x: number; y: number; size: number }; // centre et taille du sceau du cartouche d'époque
  cursorScale?: number; // taille de l'objet curseur relativement à sa taille au centre (0,26)
};

const VERMILION = [192, 57, 43], INK = 'rgb(29,25,21)';
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const dur = (c: TimeScrollConfig) => c.duration ?? 5;
const erasOf = (c: TimeScrollConfig) => c.eras ?? ERAS_XUE;
const scrollOf = (c: TimeScrollConfig) => c.scroll ?? 1900;
const tagOf = (c: TimeScrollConfig) => c.tag ?? { x: 156, y: 136, size: 92 };
export const tsU = (c: TimeScrollConfig, t: number) => (t - c.at) / dur(c);

// déroulé (u de 0 à 1) : 0–0,12 la caméra recule, la frise se trace ; 0,12–0,72 accélération franche puis freinage
// (96 % du trajet) ; 0,72–0,80 ralenti d'approche ; 0,80 impact ; 0,86–1 le sceau s'envole, retour au plan normal.
export const IMPACT = 0.8;
export function travelM(u: number) {
  if (u <= 0.12) return 0;
  if (u < 0.72) { const e = (u - 0.12) / 0.6; return 0.96 * (e < 0.5 ? 16 * e ** 5 : 1 - (-2 * e + 2) ** 5 / 2); }
  if (u < IMPACT) return 0.96 + 0.04 * (1 - (1 - (u - 0.72) / (IMPACT - 0.72)) ** 3);
  return 1;
}

// frise : sceaux régulièrement espacés et centrés (la même place pour chaque époque, les vraies dates en dessous)
export function geom(c: TimeScrollConfig) {
  const n = erasOf(c).length, dx = Math.min(200, 1400 / Math.max(1, n - 1));
  return { y: 640, dx, x0: 960 - ((n - 1) * dx) / 2, cursorY: 522 };
}
export const sealX = (c: TimeScrollConfig, i: number) => geom(c).x0 + i * geom(c).dx;

// objet qui voyage : part du centre (960, 560) à sa taille normale, rétrécit sur le sceau de départ, glisse jusqu'au
// sceau d'arrivée ; arrivePose : l'objet de la nouvelle époque grandit ensuite du sceau d'arrivée vers le centre
export function cursorPose(c: TimeScrollConfig, t: number) {
  const u = tsU(c, t), g = geom(c), small = c.cursorScale ?? 0.26;
  const k = ease(u / 0.12), m = travelM(u);
  return { x: lerp(lerp(960, sealX(c, c.from), k), sealX(c, c.to), m), y: lerp(560, g.cursorY, k), s: lerp(1, small, k) };
}
export function arrivePose(c: TimeScrollConfig, t: number) {
  const u = tsU(c, t), g = geom(c), small = c.cursorScale ?? 0.26;
  if (u < 0.86) return cursorPose(c, t);
  const k = ease((u - 0.86) / 0.14);
  return { x: lerp(sealX(c, c.to), 960, k), y: lerp(g.cursorY, 560, k), s: lerp(small, 1, k) };
}
// opacité du cartouche d'époque (le sceau volant s'y pose) ; à l'appelant de dessiner son cartouche à `tag`
export const tagIn = (c: TimeScrollConfig, t: number) => smooth(c.at + 0.975 * dur(c), c.at + dur(c) + 0.05, t);
// part de la nouvelle forme pendant la glissade (pour une métamorphose de l'objet curseur)
export const morphK = (c: TimeScrollConfig, t: number) => smooth(0.3, 0.85, travelM(tsU(c, t)));

const speedAt = (c: TimeScrollConfig, t: number) => scrollOf(c) * (travelM(tsU(c, t + 1 / 30)) - travelM(tsU(c, t))) * 30;
const MAXSPEED = 3000;
const useT = () => useCurrentFrame() / useVideoConfig().fps;

function camera(u: number) {
  if (u <= 0 || u >= 1) return 1;
  const back = u < 0.12 ? ease(u / 0.12) : 1 - ease((u - 0.72) / 0.28);
  const punch = u > IMPACT ? 0.03 * Math.exp(-(u - IMPACT) / 0.025) : 0;
  return (1 - 0.2 * back) * (1 + punch);
}

// ── sceau vermillon (plein ou esquissé, scintillement)
export const Seal: React.FC<{ zh: string; x: number; y: number; size: number; fill: number; glow?: number; a?: number }> = ({ zh, x, y, size, fill, glow = 0, a = 1 }) => (
  <div style={{
    position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: a, borderRadius: size * 0.11,
    background: rgb(VERMILION, 0.92 * fill), border: `${Math.max(2, size * 0.045)}px solid ${rgb(VERMILION, 0.55 + 0.4 * fill)}`, boxSizing: 'border-box',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: size * 0.68, lineHeight: 1,
    color: fill > 0.5 ? '#f6eee0' : rgb(VERMILION, 0.85), boxShadow: glow > 0 ? `0 0 ${36 * glow}px ${10 * glow}px rgba(235,120,60,${0.55 * glow})` : 'none',
  }}>{zh}</div>
);

// paysages des deux époques : celui qu'on quitte (depuis `since`) glisse vers la gauche, l'autre (jusqu'à `until`)
// arrive par la droite ; ils se relaient pendant la traversée
type Land = { seed: number; mood?: Mood; faint?: number };
const TravelLandscape: React.FC<{ c: TimeScrollConfig; land: Land; from: number; to: number; role: 'from' | 'to' }> = ({ c, land, from, to, role }) => {
  const { fps } = useVideoConfig();
  const shot = compose(land.seed, { move: 'still', mood: land.mood ?? 'jour', duration: to - from });
  return (
    <Sequence from={Math.round(from * fps)} durationInFrames={Math.round((to - from) * fps)}>
      <TravelInner c={c} shot={shot} from={from} to={to} role={role} faint={land.faint ?? 0.45} />
    </Sequence>
  );
};
const TravelInner: React.FC<{ c: TimeScrollConfig; shot: ReturnType<typeof compose>; from: number; to: number; role: 'from' | 'to'; faint: number }> = ({ c, shot, from, to, role, faint }) => {
  const { fps } = useVideoConfig();
  const t = from + useCurrentFrame() / fps, u = tsU(c, t), m = travelM(u), S = scrollOf(c) * m;
  const strong = smooth(0, 0.25, u) * (1 - smooth(0.75, 1, u));
  const ends = interpolate(t, [from, from + 1.2, to - 1.2, to], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const op = role === 'from' ? Math.min(ends, 1 - smooth(0.45, 0.85, m)) : Math.min(ends > 0 ? 1 : 0, smooth(0.15, 0.55, m)) * (t > to - 1.2 ? ends : 1);
  return (
    <AbsoluteFill style={{ opacity: op * (faint + (0.85 - faint) * strong) }}>
      <ShuimoBackground shot={shot} duration={to - from} scroll={role === 'from' ? S : S - scrollOf(c)} scrollSpeed={speedAt(c, t)} />
    </AbsoluteFill>
  );
};

// le rouleau comme objet : montage de soie, papier, deux bâtons (visibles quand la caméra recule)
const ScrollObject: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const u = tsU(c, useT()), roll = scrollOf(c) * travelM(u) * 0.35, show = u > 0 && u < 1;
  const roller = (x: number) => (
    <div style={{ position: 'absolute', left: x, top: -70, width: 72, height: 1220 }}>
      <div style={{ position: 'absolute', left: 22, top: 0, width: 28, height: 1220, borderRadius: 14, background: 'linear-gradient(90deg,#3a2614,#8a5e34 45%,#3a2614)' }} />
      <div style={{ position: 'absolute', left: 0, top: 40, width: 72, height: 1140, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        background: 'repeating-linear-gradient(90deg, rgba(120,100,70,0.10) 0 3px, rgba(0,0,0,0) 3px 11px), linear-gradient(90deg,#b9ad93,#f1e9d8 45%,#a89b80)',
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

// ciel du voyage : soleil et lune en arcs rapides, jours et nuits (deux cycles)
const SkyCycles: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const u = tsU(c, useT());
  if (u <= 0 || u >= 1) return null;
  const a = smooth(0.05, 0.2, u) * (1 - smooth(0.74, 0.8, u));
  const p = travelM(u) * 2, frac = p % 1, day = frac < 0.5, s = (frac % 0.5) * 2;
  const x = 1760 - 1600 * s, y = 380 - 250 * Math.sin(Math.PI * s), night = day ? 0 : Math.sin(Math.PI * s);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(90,104,140,0.55), rgba(140,150,175,0.35))', mixBlendMode: 'multiply', opacity: 0.6 * night }} />
      <Img src={staticFile(`shuimo/elements/${day ? 'ciel_a1.png' : 'ciel_a3.png'}`)}
        style={{ position: 'absolute', left: x - 60, top: y - 60, width: 120, height: 120, opacity: Math.sin(Math.PI * s) ** 0.5 * (day ? 0.95 : 0.8) }} />
    </AbsoluteFill>
  );
};

// frise des sceaux (dans le monde du rouleau) ; curseur par défaut : un point d'encre, si l'appelant n'en dessine pas
const Timeline: React.FC<{ c: TimeScrollConfig; defaultCursor: boolean }> = ({ c, defaultCursor }) => {
  const t = useT(), u = tsU(c, t);
  if (u <= 0 || u >= 1.02) return null;
  const g = geom(c), eras = erasOf(c);
  const out = 1 - smooth(0.87, 0.95, u), line = smooth(0, 0.12, u);
  const flash = Math.exp(-(((u - IMPACT) / 0.03) ** 2)) * (u > IMPACT - 0.005 ? 1 : 0);
  const x0 = sealX(c, 0) - 100, x1 = sealX(c, eras.length - 1) + 100;
  const cur = cursorPose(c, t);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 48% 22% at 50% 57%, rgba(250,247,240,0.85), rgba(250,247,240,0))', opacity: line * out }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: out }}>
        <path d={`M${x0},${g.y} L${x0 + (x1 - x0) * line},${g.y + 1}`} stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.75} />
        {defaultCursor && u > 0.1 && u < 0.86 && <circle cx={cur.x} cy={g.y - 52} r={11} fill={INK} opacity={smooth(0.1, 0.16, u)} />}
      </svg>
      {eras.map((e, i) => {
        const pop = smooth(0.02 + i * 0.013, 0.06 + i * 0.013, u);
        if (pop <= 0) return null;
        const isTo = i === c.to, done = i <= c.from || (isTo && u >= IMPACT);
        const fillK = i <= c.from ? 1 : isTo ? smooth(IMPACT, IMPACT + 0.03, u) : 0;
        const size = 64 * (0.6 + 0.4 * pop) * (isTo ? 1 + 0.28 * flash : 1);
        const a = pop * out * (isTo && u > 0.86 ? 0 : 1) * (done || isTo ? 1 : 0.55);
        return (
          <React.Fragment key={e.zh + i}>
            <Seal zh={e.zh} x={sealX(c, i)} y={g.y} size={size} fill={fillK} glow={isTo ? flash : 0} a={a} />
            <div style={{ position: 'absolute', left: sealX(c, i) - 60, width: 120, top: g.y + 46, textAlign: 'center', fontFamily: 'ShuimoLatin', fontSize: 24, color: '#6b5d50', opacity: pop * out * (done || isTo ? 0.9 : 0.5) }}>{e.date}</div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ── couches d'écran : vignettage, vent du temps, compteur d'années, sceau qui s'envole
const Vignette: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const t = useT(), u = tsU(c, t);
  if (u <= 0 || u >= 1) return null;
  const k = Math.min(1, speedAt(c, t) / MAXSPEED) * 0.75 + 0.25 * smooth(0.05, 0.15, u) * (1 - smooth(0.84, 0.95, u));
  return <AbsoluteFill style={{ background: 'radial-gradient(ellipse 62% 58% at 50% 52%, rgba(20,14,10,0) 55%, rgba(20,14,10,0.55) 100%)', opacity: k }} />;
};
const WIND = (() => {
  const R = rng(77);
  return Array.from({ length: 70 }, (_, i) => ({ x0: R() * 2120, y0: 60 + R() * 960, par: 0.6 + R() * 1.2, petal: R() < 0.38, size: 0.6 + R() * 0.7, ph: R() * 6.28, i }));
})();
const Wind: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const t = useT(), u = tsU(c, t);
  if (u <= 0.08 || u >= 0.84) return null;
  const pres = smooth(0.1, 0.22, u) * (1 - smooth(0.74, 0.82, u)), sp = speedAt(c, t), D = scrollOf(c) * travelM(u);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {WIND.map((p) => {
        const x = ((((p.x0 - D * 1.7 * p.par - (t - c.at) * 30 * p.par) % 2120) + 2120) % 2120) - 100;
        const y = p.y0 + 16 * Math.sin(t * 1.4 + p.ph) + (p.petal ? 40 * u * p.par : 0);
        const rx = (p.petal ? 7 : 2) * p.size * (1 + Math.min(7, (sp * p.par) / 520)), ry = (p.petal ? 4 : 1.6) * p.size;
        return <ellipse key={p.i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${p.petal ? 8 * Math.sin(t * 3 + p.ph) : 0} ${x} ${y})`}
          fill={p.petal ? 'rgb(238,200,204)' : 'rgb(40,34,30)'} opacity={pres * (p.petal ? 0.85 : 0.45)} />;
      })}
    </svg>
  );
};
const fmtYear = (y: number) => (y < 0 ? [`${-y}`, 'av. J.-C.'] : [`${y}`, '']);
const YearCounter: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const t = useT(), u = tsU(c, t);
  if (u <= 0 || u >= 1) return null;
  const a = smooth(0.06, 0.15, u) * (1 - smooth(0.73, 0.78, u));
  const [n, suffix] = fmtYear(Math.round(lerp(c.years[0], c.years[1], travelM(u))));
  const blur = Math.min(4, (3.5 * speedAt(c, t)) / MAXSPEED);
  return (
    <div style={{ position: 'absolute', width: '100%', top: 300, textAlign: 'center', opacity: a }}>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 88, letterSpacing: 4, color: rgb(VERMILION), filter: `blur(${blur.toFixed(2)}px)`, textShadow: '0 0 18px rgba(250,247,240,0.9)' }}>
        {n} {suffix && <span style={{ fontSize: 44, fontWeight: 500 }}>{suffix}</span>}
      </div>
    </div>
  );
};
const FlyingSeal: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const u = tsU(c, useT());
  if (u <= 0.86 || u >= 0.985) return null;
  const z = camera(0.86), g = geom(c), tag = tagOf(c), k = ease((u - 0.86) / 0.12);
  const sx = 960 + (sealX(c, c.to) - 960) * z, sy = 540 + (g.y - 540) * z;
  return <Seal zh={erasOf(c)[c.to].zh} x={lerp(sx, tag.x, k)} y={lerp(sy, tag.y, k)} size={lerp(64 * z * 1.15, tag.size, k)} fill={1} glow={0.5 * (1 - k)} />;
};

// ── scène complète : table, caméra et monde du rouleau (paysages, ciel, enfants, frise), couches d'écran, son.
// under : couches du monde sous les paysages du voyage (autre paysage, décor) ; children : au-dessus (contenu).
export const TimeScrollStage: React.FC<{
  cfg: TimeScrollConfig; fromLandscape: Land & { since: number }; toLandscape: Land & { until: number };
  under?: React.ReactNode; children?: React.ReactNode; defaultCursor?: boolean; sound?: boolean;
}> = ({ cfg, fromLandscape, toLandscape, under, children, defaultCursor = false, sound = true }) => {
  const { fps } = useVideoConfig();
  const z = camera(tsU(cfg, useT())), end = cfg.at + dur(cfg);
  return (
    <AbsoluteFill style={{ background: 'repeating-linear-gradient(92deg, #2b2119 0 6px, #30251c 6px 13px, #271e17 13px 21px)' }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${960 - 960 * z}px, ${540 - 540 * z}px) scale(${z})` }}>
        <ScrollObject c={cfg} />
        {under}
        <TravelLandscape c={cfg} land={fromLandscape} from={fromLandscape.since} to={end + 0.2} role="from" />
        <TravelLandscape c={cfg} land={toLandscape} from={cfg.at} to={toLandscape.until} role="to" />
        <SkyCycles c={cfg} />
        {children}
        <Timeline c={cfg} defaultCursor={defaultCursor} />
      </AbsoluteFill>
      <Vignette c={cfg} />
      <Wind c={cfg} />
      <YearCounter c={cfg} />
      <FlyingSeal c={cfg} />
      {sound && (
        <>
          {/* souffle, glissando de guzheng, silence, impact ; gong quand le sceau se pose (sons calés sur 5 s) */}
          <Sequence from={Math.round(cfg.at * fps)}><Audio src={staticFile('rouleau/rouleau.wav')} volume={0.6} playbackRate={5 / dur(cfg)} /></Sequence>
          <Sequence from={Math.round((cfg.at + 0.97 * dur(cfg)) * fps)}><Audio src={staticFile('rouleau/gong.wav')} volume={0.22} /></Sequence>
        </>
      )}
    </AbsoluteFill>
  );
};
