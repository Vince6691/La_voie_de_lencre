// Panel d'évolution n°3 (série 墨道) : « L'édifice qui change » — un hall impérial typique tourne en 3D sur le fond
// shuimo pendant que ses pièces se transforment (piliers, consoles qui se divisent, toit qui se relève, décor qui
// se peint) de la dynastie Tang aux Qing. 10 s, 16:9. Compteur d'années et frise de sceaux du rouleau du temps.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose } from '../shuimo/layout';
import { Seal } from '../rouleau/TimeScroll';
import { Hall, InkShadow, OrbitCamera } from './Hall3D';
import { STATIONS, hallAtProgress, progress, smooth } from './params';

export const HALL_SECONDS = 10;
const VERMILION = 'rgb(192,57,43)', INK = 'rgb(29,25,21)';
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const useFonts = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
};

// lumière de chaque époque, posée en lavis sur le paysage (aube dorée, brume bleue, crépuscule gris, soleil vermillon)
const TINTS = ['rgba(240,196,150,0.34)', 'rgba(150,178,196,0.30)', 'rgba(180,170,168,0.28)', 'rgba(238,176,130,0.26)'];
const tintAt = (p: number) => {
  const i = Math.min(2, Math.floor(p)), k = smooth(0.15, 0.85, p - i);
  const a = TINTS[i].match(/[\d.]+/g)!.map(Number), b = TINTS[i + 1].match(/[\d.]+/g)!.map(Number);
  return `rgba(${a.map((v, n) => Math.round(lerp(v, b[n], k))).slice(0, 3).join(',')},${lerp(a[3], b[3], k).toFixed(3)})`;
};

const yearAt = (p: number) => {
  const i = Math.min(2, Math.floor(p)), k = p - i;
  return Math.round(lerp(STATIONS[i].year, STATIONS[i + 1].year, k));
};

// silhouette du curseur : un petit hall au toit relevé
const HallIcon: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <svg width={80 * s} height={56 * s} viewBox="0 0 80 56" style={{ position: 'absolute', left: x - 40 * s, top: y - 28 * s }}>
    <path d="M2,22 Q22,20 30,8 L50,8 Q58,20 78,22 L70,26 L10,26 Z" fill={INK} />
    <rect x="14" y="26" width="52" height="4" fill={INK} />
    {[16, 30, 44, 58].map((cx) => <rect key={cx} x={cx} y="30" width="4" height="18" fill={INK} />)}
    <rect x="8" y="48" width="64" height="5" fill={INK} />
  </svg>
);

export const HallEvolution: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps, p = progress(t), hall = hallAtProgress(p);
  const dp = (progress(t + 1 / fps) - progress(t)) * fps; // vitesse d'avancement, pour flous et compteur

  // fond : le rouleau défile avec l'avancement (immobile pendant les paliers), même ciel teinté par l'époque
  const shot = React.useMemo(() => compose(41, { move: 'still', mood: 'jour', duration: HALL_SECONDS }), []);
  const scroll = 0.001 + 820 * p, scrollSpeed = 820 * dp;

  // caméra : un seul tour complet, de 3/4 jusqu'à la façade
  const turn = smooth(0, 9.0, t), angle = lerp(-0.62, 2 * Math.PI, 0.35 * turn + 0.65 * (0.5 - 0.5 * Math.cos(Math.PI * turn)));
  const height3 = hall.platH + hall.colH + 0.4 + hall.brH + hall.ridgeH + hall.tier2;
  const diag = Math.hypot(2 * (3.5 + hall.over), 2 * (2 + hall.over));
  const zoom = Math.min(1150 / diag, 560 / height3), target = 0.45 * height3 - 0.55;

  // entrée : le hall « boit » dans le papier ; sortie : rien (le dernier plan reste)
  const appear = smooth(0, 0.8, t);

  const n = Math.round(p), dev = Math.abs(p - n), capA = 1 - smooth(0.12, 0.4, dev);
  const st = STATIONS[Math.min(3, n)];
  const yr = yearAt(p), yrA = 0.35 + 0.65 * smooth(0, 0.6, t);
  const blur = Math.min(3.5, Math.abs(dp) * 2.2);

  // frise : quatre sceaux, le curseur glisse de l'un à l'autre
  const SX = (i: number) => 960 + (i - 1.5) * 200, SY = 968;
  const flash = (i: number) => Math.exp(-(((p - i) * 7) ** 2));

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
      <ShuimoBackground shot={shot} duration={HALL_SECONDS} halo={false} scroll={scroll} scrollSpeed={scrollSpeed} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 54% at 50% 54%, rgba(250,247,240,0.8) 0%, rgba(250,247,240,0.55) 60%, rgba(250,247,240,0) 100%)' }} />
      <AbsoluteFill style={{ background: tintAt(p), mixBlendMode: 'multiply' }} />
      <AbsoluteFill style={{ opacity: appear, filter: `blur(${(1 - appear) * 14}px) url(#ink3d)`, transform: `scale(${1.04 - 0.04 * appear})` }}>
        <ThreeCanvas width={width} height={height} orthographic flat linear gl={{ alpha: true, antialias: true }} camera={{ position: [40, 30, 40], zoom: 100 }}>
          <OrbitCamera angle={angle} elev={0.17} target={target} zoom={zoom} />
          <InkShadow size={20 + 4 * p} />
          <Hall p={hall} />
        </ThreeCanvas>
      </AbsoluteFill>

      {/* compteur d'années */}
      <div style={{ position: 'absolute', left: 560, width: 800, top: 20, height: 190, background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(250,247,240,0.85), rgba(250,247,240,0))', opacity: yrA }} />
      <div style={{ position: 'absolute', width: '100%', top: 54, textAlign: 'center', opacity: yrA }}>
        <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 96, letterSpacing: 5, color: VERMILION, filter: `blur(${blur.toFixed(2)}px)`, textShadow: '0 0 18px rgba(250,247,240,0.9)' }}>{yr}</div>
      </div>
      {/* cartouche d'époque */}
      <div style={{ position: 'absolute', left: 90, top: 70, display: 'flex', alignItems: 'center', gap: 24, opacity: capA * smooth(0.3, 1.1, t) }}>
        <div style={{ width: 92, height: 92, background: 'rgba(192,57,43,0.92)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0' }}>{st.zh}</div>
        <div>
          <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 44, letterSpacing: 6, color: INK }}>{st.en}</div>
          <div style={{ fontFamily: 'ShuimoKai', fontSize: 26, color: '#5a4c40', marginTop: 2 }}>{st.name}</div>
        </div>
      </div>
      {/* frise des sceaux et curseur */}
      <AbsoluteFill style={{ opacity: smooth(0.2, 0.9, t) }}>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${SX(0) - 110},${SY} L${SX(3) + 110},${SY}`} stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
        </svg>
        {STATIONS.map((s, i) => (
          <React.Fragment key={s.zh}>
            <Seal zh={s.zh} x={SX(i)} y={SY} size={64 * (1 + 0.28 * flash(i))} fill={smooth(i - 0.35, i, p)} glow={flash(i)} a={0.55 + 0.45 * smooth(i - 0.6, i, p)} />
            <div style={{ position: 'absolute', left: SX(i) - 60, width: 120, top: SY + 46, textAlign: 'center', fontFamily: 'ShuimoLatin', fontSize: 24, color: '#6b5d50' }}>{s.year}</div>
          </React.Fragment>
        ))}
        <HallIcon x={lerp(SX(0), SX(3), p / 3)} y={SY - 56} s={0.7} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 66% 62% at 50% 50%, rgba(20,14,10,0) 62%, rgba(20,14,10,0.35) 100%)', opacity: interpolate(Math.abs(dp), [0, 0.8], [0.3, 1], { extrapolateRight: 'clamp' }) }} />
    </AbsoluteFill>
  );
};
