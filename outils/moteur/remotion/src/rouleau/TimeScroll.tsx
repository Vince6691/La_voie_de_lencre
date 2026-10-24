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
import { periodesEntre } from '../periodes';

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
  // inscriptions calligraphiées sur la peinture : [0] sur le paysage quitté, [1] sur celui qui arrive (colonnes lues de
  // droite à gauche ; idéalement des vers qui contiennent le caractère étudié, citation vérifiée) ; sceaux de collection
  inscriptions?: { cols: string[]; sig?: string; seal?: string }[];
  collection?: string[];
  son?: 1 | 2 | 3; // 流水拂 du rouleau (assets/rouleau/rouleau_liushui_N.wav) ; par défaut sonRouleau(at)
};
// un des trois 流水拂 retenus pour chaque rouleau, varié d'un rouleau à l'autre ; bande_son.py fait le même calcul
export const sonRouleau = (at: number) => (Math.floor(at) % 3) + 1;

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
// (98 % du trajet) ; 0,72–0,80 ralenti d'approche ; 0,80 impact ; 0,86–1 le sceau s'envole, retour au plan normal.
export const IMPACT = 0.8;
// vitesse continue (vitesse de croisière d'origine) : l'accélération amène le curseur à 98 % du trajet en gardant
// la vitesse du ralenti (SLOW), qui décroît ensuite linéairement jusqu'à l'impact — avant : arrêt complet à 0,72 puis
// redémarrage brusque (ralenti saccadé)
const NEAR = 0.98, SLOW = (2 * (1 - NEAR)) / (IMPACT - 0.72);
export function travelM(u: number) {
  if (u <= 0.12) return 0;
  if (u < 0.72) {
    // vitesse (en e) : P·(2e)⁴ qui monte, puis ve + (P − ve)·(2 − 2e)⁴ qui redescend vers ve = vitesse du ralenti
    const e = (u - 0.12) / 0.6, ve = SLOW * 0.6, P = 5 * (NEAR - 0.4 * ve);
    return e < 0.5 ? (P * (2 * e) ** 5) / 10 : P / 10 + ve * (e - 0.5) + ((P - ve) * (1 - (2 - 2 * e) ** 5)) / 10;
  }
  if (u < IMPACT) { const v = (u - 0.72) / (IMPACT - 0.72); return NEAR + (1 - NEAR) * (2 * v - v * v); } // vitesse SLOW → 0, linéaire
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
  const punch = 0.03 * smooth(IMPACT - 0.004, IMPACT + 0.016, u) * (u > IMPACT + 0.016 ? Math.exp(-(u - IMPACT - 0.016) / 0.04) : 1); // montée en 3 images
  return (1 - 0.2 * back) * (1 + punch);
}

// ── sceau vermillon (plein ou esquissé, scintillement)
// sceau : même dessin que le rouleau 3D (Rouleau3D.tsx, drawSealSquare) — contour à peine irrégulier (±1,25 % du côté sur
// 40 points), 70 petits manques d'encre ; un sceau à venir n'est qu'esquissé (contour et caractère pâles)
const sealGeom = (zh: string) => {
  const r = rng(zh.charCodeAt(0)), pts: string[] = [];
  for (let i = 0; i < 40; i++) {
    const k = i / 40, side = Math.floor(k * 4), f = (k * 4) % 1, j = (r() - 0.5) * 2.5;
    const q = [[-1 + 2 * f, -1], [1, -1 + 2 * f], [1 - 2 * f, 1], [-1, 1 - 2 * f]][side];
    pts.push(`${(50 + q[0] * 50 + j).toFixed(2)},${(50 + q[1] * 50 + j).toFixed(2)}`);
  }
  const holes = Array.from({ length: 70 }, () => [100 * r(), 100 * r(), 0.5 + r() * 1.2, 0.25 + 0.5 * r()]);
  return { d: `M${pts.join('L')}Z`, holes };
};
export const Seal: React.FC<{ zh: string; x: number; y: number; size: number; fill: number; glow?: number; a?: number }> = ({ zh, x, y, size, fill, glow = 0, a = 1 }) => {
  const { d, holes } = sealGeom(zh), id = `sceau_${zh.charCodeAt(0)}`;
  return (
    <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: a,
      filter: glow > 0 ? `drop-shadow(0 0 ${20 * glow}px rgba(235,120,60,${0.7 * glow}))` : undefined }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
        <defs><mask id={id}><rect x="-5" y="-5" width="110" height="110" fill="#fff" />{holes.map(([hx, hy, hr, ha], i) => <circle key={i} cx={hx} cy={hy} r={hr} fill="#000" opacity={ha} />)}</mask></defs>
        <path d={d} fill={rgb(VERMILION, 0.94 * fill)} stroke={rgb(VERMILION, 0.55 + 0.4 * fill)} strokeWidth={4.5 * (1 - 0.6 * fill)} strokeLinejoin="round" mask={fill > 0.05 ? `url(#${id})` : undefined} />
        <text x="50" y="53" textAnchor="middle" dominantBaseline="central" fontFamily="ShuimoKai" fontSize="68" fill={fill > 0.5 ? '#f6eee0' : rgb(VERMILION, 0.85)} mask={fill > 0.5 ? `url(#${id})` : undefined}>{zh}</text>
      </svg>
    </div>
  );
};

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
  const u = tsU(c, useT()), roll = scrollOf(c) * travelM(u) * 0.35, show = u > 0 && u < 1, back = clamp((1 - camera(u)) / 0.2);
  const roller = (x: number) => (
    <div style={{ position: 'absolute', left: x, top: -70, width: 72, height: 1220 }}>
      <div style={{ position: 'absolute', left: 22, top: 0, width: 28, height: 1220, borderRadius: 14, background: 'linear-gradient(90deg,#3a2614,#8a5e34 45%,#3a2614)' }} />
      <div style={{ position: 'absolute', left: 0, top: 40, width: 72, height: 1140, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        background: 'repeating-linear-gradient(90deg, rgba(120,100,70,0.10) 0 3px, rgba(0,0,0,0) 3px 11px), linear-gradient(90deg,#b9ad93,#f1e9d8 45%,#a89b80)',
        backgroundPositionX: `${roll % 11}px, 0` }} />
      {[0, 1188].map((y) => <div key={y} style={{ position: 'absolute', left: 16, top: y, width: 40, height: 32, borderRadius: 8, background: 'linear-gradient(90deg,#8d6a2a,#e8c882 50%,#7a5a22)' }} />)}
    </div>
  );
  return (
    <>
      {show && <div style={{ position: 'absolute', left: -6, top: -52, width: 1932, height: 1184, background: '#c9b186', boxShadow: `${-14 + 28 * travelM(u)}px ${30 + 26 * back}px ${80 + 40 * back}px rgba(0,0,0,0.65), 0 6px 14px rgba(0,0,0,0.4)`,
        backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0 36px, rgba(176,134,52,0.85) 36px 39px, rgba(0,0,0,0) 39px 1145px, rgba(176,134,52,0.85) 1145px 1148px, rgba(0,0,0,0) 1148px), repeating-linear-gradient(45deg, rgba(120,92,50,0.12) 0 2px, rgba(0,0,0,0) 2px 7px), repeating-linear-gradient(-45deg, rgba(255,240,205,0.10) 0 2px, rgba(0,0,0,0) 2px 7px)' }} />}
      <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', width: 1920, height: 1080, objectFit: 'cover' }} />
      {show && roller(-78)}
      {show && roller(1926)}
      {show && (() => {
        // règle des années sur la bordure de soie du bas : graduations, années des époques, repère doré qui avance
        const [y0, y1] = c.years, k = travelM(u), X0 = 200, X1 = 1720;
        const xs = (y: number) => X0 + ((y - y0) / (y1 - y0)) * (X1 - X0);
        return (
          <svg width={1920} height={60} style={{ position: 'absolute', left: 0, top: 1084, overflow: 'visible' }}>
            <line x1={X0} y1={14} x2={X1} y2={14} stroke="rgba(110,80,35,0.7)" strokeWidth={1.5} />
            {Array.from({ length: 41 }, (_, i) => <line key={i} x1={X0 + (i * (X1 - X0)) / 40} y1={14} x2={X0 + (i * (X1 - X0)) / 40} y2={i % 5 ? 20 : 26} stroke="rgba(110,80,35,0.7)" strokeWidth={1.2} />)}
            {erasOf(c).filter((e) => { const v = Number(e.date.replace('−', '-')); return v >= Math.min(y0, y1) && v <= Math.max(y0, y1); }).map((e) => (
              <text key={e.zh} x={xs(Number(e.date.replace('−', '-')))} y={44} textAnchor="middle" fontFamily="ShuimoKai" fontSize={22} fill="rgba(110,60,25,0.85)">{e.zh}</text>
            ))}
            <polygon points={`${X0 + k * (X1 - X0) - 7},2 ${X0 + k * (X1 - X0) + 7},2 ${X0 + k * (X1 - X0)},13`} fill="#c99a4b" />
          </svg>
        );
      })()}
    </>
  );
};

const Inscriptions: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const u = tsU(c, useT());
  if (!c.inscriptions?.length || u <= 0 || u >= 1) return null;
  const S = scrollOf(c) * travelM(u), a = smooth(0.02, 0.1, u) * (1 - smooth(0.9, 0.99, u));
  const coll = c.collection ?? ['長樂', '雲水', '墨道'];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {c.inscriptions.slice(0, 2).map((ins, i) => {
        const x = (i === 0 ? 1840 : 1840 + scrollOf(c)) - S; // bord droit des colonnes, à l'écart du compteur
        if (x < -300 || x > 2300) return null;
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: x - 200, top: 120, width: 200, height: 380, display: 'flex', flexDirection: 'row-reverse', gap: 10 }}>
              {ins.cols.map((col, j) => <div key={j} style={{ writingMode: 'vertical-rl', fontFamily: 'ShuimoKai', fontSize: 32, letterSpacing: 4, color: 'rgba(29,25,21,0.55)' }}>{col}</div>)}
              {ins.sig && <div style={{ writingMode: 'vertical-rl', fontFamily: 'ShuimoKai', fontSize: 18, letterSpacing: 3, color: 'rgba(29,25,21,0.45)', marginTop: 80 }}>{ins.sig}</div>}
            </div>
            {ins.seal && <Seal zh={ins.seal} x={x - 44 * ins.cols.length - 46} y={420} size={26} fill={1} a={0.75} />}
            {coll[i] && <div style={{ position: 'absolute', left: x - 1500, top: 930, width: 40, height: 40, background: rgb(VERMILION, 0.7), borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', fontFamily: 'ShuimoKai', fontSize: 16, color: '#f6eee0', transform: 'rotate(1.5deg)' }}>{coll[i]}</div>}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
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
  const flash = smooth(IMPACT - 0.004, IMPACT + 0.016, u) * (u > IMPACT + 0.016 ? Math.exp(-(((u - IMPACT - 0.016) / 0.035) ** 2)) : 1);
  const x0 = sealX(c, 0) - 100, x1 = sealX(c, eras.length - 1) + 100;
  const cur = cursorPose(c, t);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 48% 22% at 50% 57%, rgba(250,247,240,0.85), rgba(250,247,240,0))', opacity: line * out }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: out }}>
        <path d={`M${x0},${g.y} L${x0 + (x1 - x0) * line},${g.y + 1}`} stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" opacity={0.8} />
        {defaultCursor && u > 0.1 && u < 0.86 && <circle cx={cur.x} cy={g.y - 52} r={11} fill={INK} opacity={smooth(0.1, 0.16, u)} />}
      </svg>
      {eras.map((e, i) => {
        const pop = smooth(0.02 + i * 0.013, 0.06 + i * 0.013, u);
        if (pop <= 0) return null;
        // à rebours (to < from) : les sceaux « déjà passés » sont ceux d'après le départ
        const past = c.to < c.from ? i >= c.from : i <= c.from;
        const isTo = i === c.to, done = past || (isTo && u >= IMPACT);
        const fillK = past ? 1 : isTo ? smooth(IMPACT, IMPACT + 0.03, u) : 0;
        const size = 86 * (0.6 + 0.4 * pop) * (isTo ? 1 + 0.28 * flash : 1);
        const a = pop * out * (isTo && u > 0.86 ? 0 : 1) * (done || isTo ? 1 : 0.55);
        return (
          <React.Fragment key={e.zh + i}>
            <Seal zh={e.zh} x={sealX(c, i)} y={g.y} size={size} fill={fillK} glow={isTo ? flash : 0} a={a} />
            <div style={{ position: 'absolute', left: sealX(c, i) - 60, width: 120, top: g.y + 60, textAlign: 'center', fontFamily: 'ShuimoLatin', fontSize: 36, fontWeight: 600, color: '#4b4038', opacity: pop * out * (done || isTo ? 1 : 0.6) }}>{e.date}</div>
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
  return Array.from({ length: 54 }, (_, i) => {
    const near = R() < 0.28; // premier plan : plus grands, flous ; fond : petits, nets, pâles
    return { x0: R() * 2200, y0: 40 + R() * 1000, par: near ? 1.5 + R() * 0.6 : 0.5 + R() * 0.8, near, dust: R() < 0.3, size: near ? 1.5 + R() * 0.8 : 0.6 + R() * 0.6, ph: R() * 6.28, spin: 0.6 + R() * 1.6, tint: R(), i };
  });
})();
const PETAL = 'M0,-1 C0.62,-0.86 0.82,-0.08 0.12,0.9 Q0,1.04 -0.12,0.9 C-0.82,-0.08 -0.62,-0.86 0,-1Z';
const Wind: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const t = useT(), u = tsU(c, t);
  if (u <= 0.06 || u >= 0.86) return null;
  const pres = smooth(0.08, 0.2, u) * (1 - smooth(0.74, 0.84, u)), sp = speedAt(c, t), D = scrollOf(c) * travelM(u), tt = t - c.at;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="petale" cx="50%" cy="35%" r="70%"><stop offset="0%" stopColor="#fff6f4" /><stop offset="55%" stopColor="#f6cfd4" /><stop offset="100%" stopColor="#e29aa8" /></radialGradient>
        <radialGradient id="petale2" cx="50%" cy="35%" r="70%"><stop offset="0%" stopColor="#fffaf2" /><stop offset="60%" stopColor="#f3dfe2" /><stop offset="100%" stopColor="#d9aab3" /></radialGradient>
        <filter id="flou"><feGaussianBlur stdDeviation="1.6" /></filter>
        <radialGradient id="poussiere"><stop offset="0%" stopColor="rgba(255,236,190,0.95)" /><stop offset="100%" stopColor="rgba(255,236,190,0)" /></radialGradient>
      </defs>
      {WIND.map((p) => {
        const x = ((((p.x0 - D * 1.6 * p.par - tt * 40 * p.par) % 2200) + 2200) % 2200) - 140;
        const y = p.y0 + 22 * Math.sin(tt * 1.3 * p.spin + p.ph) + 70 * u * p.par; // ondulation + lente chute
        if (p.dust) {
          const r = 2.2 * p.size, a = pres * (0.35 + 0.35 * Math.sin(tt * 5 + p.ph) ** 2);
          return <circle key={p.i} cx={x} cy={y} r={r * 2.4} fill="url(#poussiere)" opacity={a} />;
        }
        // le pétale tourne sur lui-même (rotation) et se retourne (aplatissement), s'étire un peu dans la vitesse
        const rot = (p.ph * 57 + tt * 90 * p.spin) % 360, flip = 0.25 + 0.75 * Math.abs(Math.cos(tt * 2.4 * p.spin + p.ph));
        const stretch = 1 + Math.min(1.2, (sp * p.par) / 1400), k = 9 * p.size;
        return (
          <g key={p.i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${stretch.toFixed(2)} 1) rotate(${rot.toFixed(1)}) scale(${(k * flip).toFixed(2)} ${k.toFixed(2)})`}
            opacity={pres * (p.near ? 0.7 : 0.85)} filter={p.near ? 'url(#flou)' : undefined}>
            <path d={PETAL} fill={p.tint < 0.6 ? 'url(#petale)' : 'url(#petale2)'} />
            <path d="M0,-0.7 Q0.05,0 0,0.8" stroke="rgba(200,120,135,0.45)" strokeWidth={0.06} fill="none" />
          </g>
        );
      })}
    </svg>
  );
};
const fmtYear = (y: number) => (y < 0 ? [`${-y}`, 'av. J.-C.'] : [`${y}`, '']);
const GOLD_DARK = 'linear-gradient(180deg, #e0b457 0%, #b8862f 45%, #7d5619 100%)';
const YearCounter: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const t = useT(), u = tsU(c, t);
  if (u <= 0 || u >= 1) return null;
  const a = smooth(0.06, 0.15, u) * (1 - smooth(0.73, 0.78, u));
  const year = Math.round(lerp(c.years[0], c.years[1], travelM(u)));
  const per = periodesEntre(c.years[0], c.years[1]);
  let pi = 0; per.forEach((p, i) => { if (year >= p.debut) pi = i; });
  const P = per[pi], next = per[pi + 1];
  const pa = P ? Math.min(pi === 0 ? 1 : clamp((year - P.debut) / 25), next ? clamp((next.debut - year) / 25) : 1) : 0;
  const blur = Math.min(4, (3.5 * speedAt(c, t)) / MAXSPEED);
  const [, suffix] = fmtYear(year);
  return (
    <div style={{ position: 'absolute', width: '100%', top: 250, textAlign: 'center', opacity: a, filter: 'drop-shadow(0 2px 8px rgba(250,247,240,0.95))' }}>
      <div style={{ height: 56, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 18, opacity: pa }}>
        {P && <span style={{ fontFamily: 'ShuimoKai', fontSize: 46, color: rgb(VERMILION) }}>{P.zh}</span>}
        {P && <span style={{ fontFamily: 'ShuimoCaps, ShuimoLatin', fontWeight: 600, fontSize: 30, letterSpacing: '0.3em', color: '#4b4038' }}>{P.nom}</span>}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 18, filter: `blur(${blur.toFixed(2)}px)` }}>
        <span style={{ display: 'inline-flex' }}>{(() => {
          const v = Math.abs(lerp(c.years[0], c.years[1], travelM(u))), nd = String(Math.floor(v)).length, glint = smooth(0.62, 0.74, u);
          return Array.from({ length: nd }, (_, i) => {
            const j = nd - 1 - i, idx = Math.floor(v / 10 ** j) % 10, lower = j === 0 ? 0 : (v % 10 ** j) / 10 ** j;
            const off = idx + (j === 0 ? v - Math.floor(v) : smooth(1 - 10 ** -j, 1, lower));
            const gx = glint * 170 - 35 - i * 30;
            const bg = glint > 0 && glint < 1 ? `linear-gradient(105deg, rgba(255,246,220,0) ${gx - 14}%, rgba(255,246,220,0.95) ${gx}%, rgba(255,246,220,0) ${gx + 14}%), ${GOLD_DARK}` : GOLD_DARK;
            return (
              <span key={i} style={{ width: 74, height: 118, overflow: 'hidden', display: 'inline-block', maskImage: 'linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%)' }}>
                <span style={{ display: 'block', transform: `translateY(${-off * 118}px)` }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((dd, q) => <span key={q} style={{ display: 'block', height: 118, fontFamily: 'ShuimoCaps, ShuimoLatin', fontWeight: 700, fontSize: 112, lineHeight: '118px', textAlign: 'center', backgroundImage: bg, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{dd}</span>)}
                </span>
              </span>
            );
          });
        })()}</span>
        {suffix && <span style={{ fontFamily: 'ShuimoCaps, ShuimoLatin', fontWeight: 500, fontSize: 40, color: '#7d5619' }}>{suffix}</span>}
      </div>
    </div>
  );
};
const FlyingSeal: React.FC<{ c: TimeScrollConfig }> = ({ c }) => {
  const u = tsU(c, useT());
  if (u <= 0.86 || u >= 0.985) return null;
  const z = camera(0.86), g = geom(c), tag = tagOf(c), k = ease((u - 0.86) / 0.12);
  const sx = 960 + (sealX(c, c.to) - 960) * z, sy = 540 + (g.y - 540) * z;
  return <Seal zh={erasOf(c)[c.to].zh} x={lerp(sx, tag.x, k)} y={lerp(sy, tag.y, k)} size={lerp(86 * z * 1.15, tag.size, k)} fill={1} glow={0.5 * (1 - k)} />;
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
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 62% at 50% 48%, rgba(150,96,48,0.55) 0%, rgba(90,56,30,0.25) 55%, rgba(0,0,0,0) 100%), repeating-linear-gradient(1.2deg, #2a1e15 0 4px, #33251a 4px 9px, #241911 9px 17px, #2f2218 17px 22px)' }}>
      <AbsoluteFill style={{ background: 'linear-gradient(100deg, rgba(255,226,180,0) 38%, rgba(255,226,180,0.12) 50%, rgba(255,226,180,0) 62%)', backgroundSize: '220% 100%', backgroundPositionX: `${100 - 100 * travelM(tsU(cfg, useT()))}%`, opacity: clamp((1 - z) / 0.2) }} />
      <AbsoluteFill style={{ transformOrigin: '960px 600px', transform: `perspective(2600px) rotateX(${(7 * clamp((1 - z) / 0.2)).toFixed(2)}deg) scale(${z})` }}>
        <ScrollObject c={cfg} />
        {under}
        <TravelLandscape c={cfg} land={fromLandscape} from={fromLandscape.since} to={end + 0.2} role="from" />
        <TravelLandscape c={cfg} land={toLandscape} from={cfg.at} to={toLandscape.until} role="to" />
        <SkyCycles c={cfg} />
        <Inscriptions c={cfg} />
        {children}
        <Timeline c={cfg} defaultCursor={defaultCursor} />
      </AbsoluteFill>
      <Vignette c={cfg} />
      <Wind c={cfg} />
      <YearCounter c={cfg} />
      <FlyingSeal c={cfg} />
      {sound && (
        <>
          {/* souffle, glissando de guzheng, silence, impact ; ding léger (cloche du rouleau 3D) quand le sceau s'envole (sons calés sur 5 s) */}
          <Sequence from={Math.round(cfg.at * fps)}><Audio src={staticFile(`rouleau/rouleau_liushui_${cfg.son ?? sonRouleau(cfg.at)}.wav`)} volume={0.6} playbackRate={5 / dur(cfg)} /></Sequence>
          <Sequence from={Math.round((cfg.at + 0.9 * dur(cfg)) * fps)}><Audio src={staticFile('rouleau/ding.wav')} volume={0.3} /></Sequence>
        </>
      )}
    </AbsoluteFill>
  );
};
