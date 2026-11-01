// Fond shuimo animé : papier xuan, paysage composé (layout.ts) en parallaxe selon la profondeur de chaque
// élément, brume qui dérive et respire, ambiance (aube, nuit, brume), halo de papier derrière le contenu,
// événements d'encre sur les bords. Le temps est celui de la séquence (0 au début du plan).
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { H, Shot, W } from './layout';
import { InkEvents } from './InkEvents';
import { Oiseaux } from './Oiseaux';
import { Feuilles } from './Vent';
import { Grues } from './Grue';
import { Poeme } from './Poeme';
import { ventCumul } from './common';

const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));

// caméra : décalage et zoom appliqués à chaque plan en fonction de sa profondeur (0 lointain → 1 tout près)
function camera(shot: Shot, u: number) {
  const e = ease(u);
  const base = 1 + 0.025 * e; // tout plan respire un peu
  switch (shot.move) {
    case 'pan': return (d: number) => ({ tx: -shot.dir * (e - 0.5) * 260 * (0.12 + d), ty: 0, s: base, blur: 0 });
    case 'push': return (d: number) => ({ tx: 0, ty: 0, s: base + 0.13 * e * (0.25 + d * 1.1), blur: 0 });
    case 'rise': return (d: number) => ({ tx: 0, ty: (0.5 - e) * 220 * (0.12 + d), s: base, blur: 0 });
    case 'focus': return (d: number) => ({ tx: -shot.dir * (e - 0.5) * 80 * d, ty: 0, s: base, blur: d > 0.7 ? 7 * e : d < 0.5 ? 3.5 * (1 - e) : 0 });
    default: return () => ({ tx: 0, ty: 0, s: 1 + 0.035 * e, blur: 0 });
  }
}

const MOOD: Record<Shot['mood'], React.CSSProperties | null> = {
  jour: null,
  aube: { background: 'linear-gradient(180deg, rgba(240,190,150,0.42) 0%, rgba(245,215,185,0.18) 45%, rgba(0,0,0,0) 75%)', mixBlendMode: 'multiply' },
  nuit: { background: 'linear-gradient(180deg, rgba(95,110,145,0.62) 0%, rgba(140,150,175,0.45) 100%)', mixBlendMode: 'multiply' },
  brume: { background: 'linear-gradient(180deg, rgba(250,248,243,0.15) 0%, rgba(250,248,243,0.5) 55%, rgba(250,248,243,0.25) 100%)' },
};

// scroll (px) : défilement latéral du rouleau (transition entre époques) — chaque plan glisse d'autant plus vite
// qu'il est proche (parallaxe) ; scrollSpeed (px/s) : flou de vitesse sur les plans rapides
export const ShuimoBackground: React.FC<{ shot: Shot; duration: number; halo?: boolean; scroll?: number; scrollSpeed?: number }> = ({ shot, duration, halo = true, scroll = 0, scrollSpeed = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cam = camera(shot, t / duration);
  const paper = cam(0);
  // vent du plan (option vent de compose) : nuages poussés, feuilles emportées
  const ventSeed = shot.seed ?? 0;
  const souffle = shot.vent ? ventCumul(t, ventSeed, W / 2, shot.dir) : 0;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#f8f5ee' }}>
      {scroll === 0
        ? <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', width: W, height: H, objectFit: 'cover', transform: `scale(${paper.s * 1.02})` }} />
        : <AbsoluteFill style={{ backgroundImage: `url(${staticFile('shuimo/paper.jpg')})`, backgroundSize: `${W * 1.25}px ${H}px`, backgroundRepeat: 'repeat-x', backgroundPositionX: -scroll * 0.6 }} />}
      {shot.pieces.map((p, i) => {
        const c = cam(p.depth);
        // les volées dessinées se glissent à leur profondeur, entre les éléments de la banque
        const birds = (shot.volees ?? []).filter((v) => v.depth <= p.depth && (i === 0 || v.depth > shot.pieces[i - 1].depth));
        const cranes = (shot.grues ?? []).filter((v) => v.depth <= p.depth && (i === 0 || v.depth > shot.pieces[i - 1].depth));
        const poem = shot.poeme && shot.poeme.depth <= p.depth && (i === 0 || shot.poeme.depth > shot.pieces[i - 1].depth) ? shot.poeme : null;
        const h = p.h * c.s, w = (h * p.el.w) / p.el.h;
        const spd = 0.35 + 0.9 * p.depth;
        const push = p.breathe ? shot.dir * 40 * souffle : 0; // nuages (et brume) poussés par le vent
        const x = W / 2 + (p.x + (p.drift ?? 0) * t + push - W / 2) * c.s + c.tx - scroll * spd;
        const blur = c.blur + Math.min(7, (Math.abs(scrollSpeed) * spd) / 450);
        const y = H / 2 + (p.y - H / 2) * c.s + c.ty;
        const op = p.opacity * (p.breathe ? 0.82 + 0.18 * Math.sin(t * 0.45 + i * 1.7) : 1);
        return (
          <React.Fragment key={i}>
          {birds.length > 0 && <Volees shot={shot} volees={birds} t={t} cam={cam} scroll={scroll} />}
          {poem && <PoemeFond shot={shot} t={t} cam={cam} scroll={scroll} />}
          {cranes.length > 0 && <Grues grues={cranes} t={t} ventSeed={ventSeed} ventDir={shot.dir} place={(d) => { const c = cam(d); return { ...c, tx: c.tx - scroll * (0.35 + 0.9 * d) }; }} />}
          <Img
            src={staticFile(`shuimo/elements/${p.el.file}`)}
            style={{
              position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: op,
              transform: p.flip ? 'scaleX(-1)' : undefined, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
            }}
          />
          </React.Fragment>
        );
      })}
      {/* volées plus proches que tous les éléments */}
      <Volees shot={shot} volees={(shot.volees ?? []).filter((v) => !shot.pieces.length || v.depth > shot.pieces[shot.pieces.length - 1].depth)} t={t} cam={cam} scroll={scroll} />
      {shot.vent && <Feuilles t={t} ventSeed={ventSeed} ventDir={shot.dir} duration={duration} ink={shot.mood === 'nuit' ? '#0d0f14' : '#1b1814'} />}
      {MOOD[shot.mood] && <AbsoluteFill style={MOOD[shot.mood]!} />}
      <InkEvents events={shot.ink} t={t} night={shot.mood === 'nuit'} />
      {/* halo de papier derrière le contenu : le paysage se retire du centre sans y être découpé */}
      {halo && <AbsoluteFill style={{ background: 'radial-gradient(ellipse 34% 40% at 50% 50%, rgba(250,247,240,0.72) 0%, rgba(250,247,240,0.4) 55%, rgba(250,247,240,0) 100%)' }} />}
    </AbsoluteFill>
  );
};

// volées d'oiseaux dessinés, emportées par la caméra comme un élément de leur profondeur
const Volees: React.FC<{ shot: Shot; volees: NonNullable<Shot['volees']>; t: number; cam: ReturnType<typeof camera>; scroll: number }> = ({ shot, volees, t, cam, scroll }) => {
  if (!volees.length) return null;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {volees.map((v, i) => {
        const c = cam(v.depth), spd = 0.35 + 0.9 * v.depth;
        const tx = W / 2 - (W / 2) * c.s + c.tx - scroll * spd, ty = H / 2 - (H / 2) * c.s + c.ty;
        return (
          <g key={i} transform={`translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${c.s.toFixed(4)})`} style={c.blur > 0.05 ? { filter: `blur(${c.blur.toFixed(2)}px)` } : undefined}>
            <Oiseaux v={v} t={t} ventSeed={shot.seed ?? 0} ventDir={shot.dir} ink={shot.mood === 'nuit' ? '#0d0f14' : '#1b1814'} />
          </g>
        );
      })}
    </svg>
  );
};

// poème du plan (option poeme de compose), emporté par la caméra comme un élément de sa profondeur
const PoemeFond: React.FC<{ shot: Shot; t: number; cam: ReturnType<typeof camera>; scroll: number }> = ({ shot, cam, scroll }) => {
  const q = shot.poeme!;
  const c = cam(q.depth), spd = 0.35 + 0.9 * q.depth;
  const tx = W / 2 - (W / 2) * c.s + c.tx - scroll * spd, ty = H / 2 - (H / 2) * c.s + c.ty;
  return (
    <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${c.s.toFixed(4)})`, filter: c.blur > 0.05 ? `blur(${c.blur.toFixed(2)}px)` : undefined }}>
      <Poeme vers={q.vers} source={q.source} x={q.x} top={q.top} taille={q.taille} force={q.force} debut={q.debut} duree={q.duree} shot={shot} nuit={shot.mood === 'nuit'} />
    </AbsoluteFill>
  );
};
