// Révélation « mer de nuages » : des nuages peints à l'aquarelle (banque shuimo, famille brume) arrivent des deux
// côtés en couches (parallaxe), couvrent le décor, puis s'écartent sur la scène 3D plein cadre ; sortie : ils reviennent,
// cachent la scène et s'écartent à nouveau sur le décor shuimo. Pas de traitement par pixel : la vidéo est posée telle
// quelle sous les nuages.
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const R = (s: number) => { let a = s >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const FILES = ['brume_a2', 'brume_a3', 'brume_a5', 'brume_a6', 'brume_b1', 'brume_b3', 'brume_b4', 'brume_c1', 'brume_c3', 'brume_c6', 'brume_b6', 'brume_a7'];
// nuages : position couvrante (centre), côté d'où ils viennent, profondeur (vitesse, taille), retournement
const CLOUDS = (() => {
  const r = R(31), out: { f: string; x: number; y: number; w: number; side: number; depth: number; flip: boolean; delay: number }[] = [];
  const rows = [-60, 150, 360, 570, 780, 990];
  rows.forEach((y, ri) => [0, 1, 2, 3].forEach((c) => {
    const side = c < 2 ? -1 : 1;
    out.push({ f: FILES[(ri * 4 + c) % FILES.length], x: 240 + c * 480 + (r() - 0.5) * 160, y: y + (r() - 0.5) * 80, w: 1050 + r() * 450, side, depth: 0.6 + r() * 0.8, flip: r() < 0.5, delay: r() * 0.18 });
  }));
  return out.sort((a, b) => a.depth - b.depth);
})();

export const CloudReveal: React.FC<{ src: string; inDur?: number; outDur?: number; exit?: boolean; startFrom?: number; playbackRate?: number }> = ({ src, inDur = 3.6, outDur = 3.2, exit = true, startFrom = 0, playbackRate = 1 }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const t = useCurrentFrame() / fps, total = durationInFrames / fps, oAt = exit ? total - outDur : Infinity; // exit = false : entrée seule (la sortie est confiée à un autre effet)
  const inPh = t < oAt, u = inPh ? clamp(t / inDur) : clamp((t - oAt) / outDur);
  // couverture c : 0 → 1 (les nuages se referment) puis 1 → 0 (ils s'écartent)
  const close = (k: number) => ease(clamp((u - k) / 0.42)), open = (k: number) => ease(clamp((u - 0.52 - k * 0.5) / (0.48 - k * 0.5))); // tous ouverts à u = 1
  const showVid = inPh ? u >= 0.47 : u < 0.47;
  const core = Math.min(close(0.1), 1 - open(0.05)); // voile de papier au cœur, pour qu'aucun trou ne laisse voir le changement
  return (
    <AbsoluteFill>
      {showVid && <OffthreadVideo src={staticFile(src)} muted startFrom={Math.round(startFrom * fps)} playbackRate={playbackRate} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(246,241,231,1) 40%, rgba(246,241,231,0.85) 75%, rgba(246,241,231,0) 100%)', opacity: core }} />
      {CLOUDS.map((c, i) => {
        const k = close(c.delay) * (1 - open(c.delay));
        const off = c.side * (1300 + 500 * c.depth);
        const x = c.x + off * (1 - k) + c.side * 40 * Math.sin(t * 0.3 + i) * c.depth;
        const y = c.y - 60 * (1 - k) * (i % 2 ? 1 : -1) * c.depth;
        return (
          <Img key={i} src={staticFile(`shuimo/elements/${c.f}.png`)}
            style={{ position: 'absolute', left: x - c.w / 2, top: y - c.w * 0.25, width: c.w, transform: `scaleX(${c.flip ? -1 : 1})`, opacity: Math.min(1, k * 1.6) * 0.95, filter: 'brightness(1.2) contrast(0.85)' }} />
        );
      })}
    </AbsoluteFill>
  );
};
