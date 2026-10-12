// 文, bloc 5 — essai de la révélation de l'image classique « Tiying et l'empereur Wen » (fresque de tombe, Nano Banana).
// L'image arrive en lavis sur le papier, puis la couleur naît de la lettre de bambou que tend Tiying et gagne toute la
// fresque (MorphEncre, sens to3d, champ centré sur la lettre : tools/build_morph.py, paire « tiying ») ; la caméra
// pousse doucement sur la lettre puis glisse vers le visage de l'empereur ; 緹縈 puis 漢文帝 se calligraphient dans le
// vide de droite, le 文 de 漢文帝 s'allume en vermillon (punch) ; sortie : la fresque se fend et tombe en éclats d'enduit
// (Effondrement, sur l'image fixe cadrée comme la fin du mouvement de caméra : images/tiying_fin.jpg, tiying_eclats.json).
// Temps provisoires : dans le montage, ils viendront des repères de la voix (tiying, wen).
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { MorphEncre } from '../morph/MorphEncre';
import { Effondrement } from './Effondrement';

export const TIYING_SECONDS = 12.8;
const OUT = 9.4; // début de l'effondrement
const LETTRE: [number, number] = [0.268, 0.47];
const VISAGE: [number, number] = [0.173, 0.27];
const S_FIN = 1.1;
const VERMILLON = '#c23b2a', ENCRE = '#1d1915';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };

const useFonts = () => {
  const [h] = useState(() => delayRender('polices'));
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
};

// colonne verticale calligraphiée : chaque caractère se dévoile de haut en bas, comme tracé
const Colonne: React.FC<{ zh: string; t: number; at: number; x: number; y: number; size: number; rouge?: number; on?: number; bump?: number; legende: string }> = ({ zh, t, at, x, y, size, rouge = -1, on = 0, bump = 0, legende }) => (
  <div style={{ position: 'absolute', left: x - size / 2, top: y, width: size, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {[...zh].map((c, i) => {
      const u = clamp((t - at - i * 0.45) / 0.55);
      const r = i === rouge ? on : 0, b = i === rouge ? bump : 0;
      return (
        <div key={i} style={{ fontFamily: 'ShuimoKai', fontSize: size, lineHeight: 1.05, color: r > 0.5 ? VERMILLON : ENCRE,
          clipPath: `inset(0 0 ${(1 - u) * 100}% 0)`, transform: `scale(${1 + 0.12 * b})`,
          textShadow: '0 0 14px rgba(246,241,231,0.9)' }}>{c}</div>
      );
    })}
    <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 40, lineHeight: 1.1, color: '#4a3f36', marginTop: 10, width: 230, textAlign: 'center',
      opacity: clamp((t - at - zh.length * 0.45 - 0.2) / 0.5), textShadow: '0 0 10px rgba(246,241,231,0.95)' }}>{legende}</div>
  </div>
);

export const TiyingReveal: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // caméra : poussée sur la lettre, puis glissement vers le visage de l'empereur
  const s = 1 + (S_FIN - 1) * ease(t / 8.5);
  const g = ease((t - 2.5) / 5.5);
  const ox = LETTRE[0] + (VISAGE[0] - LETTRE[0]) * g, oy = LETTRE[1] + (VISAGE[1] - LETTRE[1]) * g;
  const wenOn = clamp((t - 7.3) / 0.25); // « L'empereur 文 » : vermillon + punch
  const bump = wenOn * clamp(1 - (t - 7.55) / 0.6);
  const textes = 1 - clamp((t - OUT + 0.4) / 0.6);
  return (
    <AbsoluteFill style={{ background: '#f3eee4' }}>
      {t < OUT + 0.05 && (
        <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: `${ox * 100}% ${oy * 100}%` }}>
          <MorphEncre name="tiying" base="episodes/wen/images" dir="to3d" focus={LETTRE} end={1.08} push={0} />
        </AbsoluteFill>
      )}
      <Sequence from={Math.round(OUT * fps)} durationInFrames={Math.round((TIYING_SECONDS - OUT) * fps)}>
        <Effondrement src="episodes/wen/images/tiying_fin.jpg" eclats="episodes/wen/images/tiying_eclats.json" coeur={[0.24, 0.45]} />
      </Sequence>
      <AbsoluteFill style={{ opacity: textes }}>
        <Colonne zh="緹縈" t={t} at={3.0} x={1840} y={150} size={110} legende="Tiying" />
        <Colonne zh="漢文帝" t={t} at={5.4} x={1700} y={150} size={110} rouge={1} on={wenOn} bump={bump} legende="l'empereur Wen" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
