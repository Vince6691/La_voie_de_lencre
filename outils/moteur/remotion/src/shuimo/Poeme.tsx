// Vers de poème qui apparaissent dans le fond shuimo : colonnes verticales lues de droite à gauche, en encre pâle ;
// le poème entier apparaît en fondu, dérive lentement dans l'air pendant qu'il est là, puis s'efface en fondu.
// Placé sur un côté du ciel, jamais au centre (réservé au contenu), à l'opposé du soleil ou de la lune quand on lui
// passe le plan. Avec l'option poeme de compose, ShuimoBackground le pose lui-même dans le fond, à sa profondeur
// (derrière les massifs), un poème de la banque poemes.ts par plan. Le temps est celui de la séquence.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { W, ventCumul } from './common';
import type { Shot } from './layout';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };

// Ma Shan Zheng (pinceau) pour les vers : elle n'a que les caractères simplifiés ; fangsong pour la source
const usePolices = () => {
  const [h] = useState(() => delayRender('polices du poème'));
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoPoeme', `url(${staticFile('fonts/MaShanZheng-Regular.ttf')})`).load(),
      new FontFace('ShuimoFangsong', `url(${staticFile('fonts/ZhuqueFangsong-Regular.ttf')})`).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
};

export type PoemeProps = {
  vers: string[];        // un vers par colonne, dans l'ordre de lecture (la première colonne est à droite)
  source?: string;       // ex. 李白《独坐敬亭山》, en petit à gauche de la dernière colonne (guillemets tournés d'un quart de tour pour l'écriture verticale)
  debut: number;         // début de l'apparition (s, temps de la séquence)
  duree: number;         // durée entre le début et le moment où le fondu de sortie commence
  cote?: 'g' | 'd';      // côté du cadre ; par défaut à l'opposé du soleil ou de la lune du plan, sinon à droite
  x?: number;            // centre de la première colonne (px), à la place du côté
  shot?: Shot;
  top?: number; taille?: number; // haut de la première ligne (px), corps des caractères (px)
  force?: number;        // opacité de l'encre une fois posée (encre pâle, qui fait partie du paysage : ≈ 0,26)
  nuit?: boolean;
};

export const Poeme: React.FC<PoemeProps> = ({ vers, source, debut, duree, cote, x, shot, top = 112, taille = 54, force = 0.26, nuit }) => {
  usePolices();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // côté : à l'opposé de l'astre (seuls le soleil et la lune sont posés à la profondeur 0,03)
  const astre = shot?.pieces.find((p) => p.depth === 0.03);
  const side = cote ?? (astre ? (astre.x < W / 2 ? 'd' : 'g') : 'd');
  const gap = taille * 1.32, pas = taille * 1.12;
  const n = vers.length;
  const x0 = x ?? (side === 'd' ? W - 150 - taille / 2 : 150 + taille / 2 + (n - 1 + (source ? 0.75 : 0)) * gap); // centre de la 1re colonne
  const ink = nuit ? '#101218' : '#2b2520';
  const FONDU = 2.6; // durée des fondus d'entrée et de sortie (s)
  const fin = debut + duree;
  if (t < debut || t > fin + FONDU) return null;

  // tout le poème ensemble : fondu d'entrée, tenue, fondu de sortie ; pendant toute sa vie il dérive lentement dans
  // l'air comme un nuage, dans le sens du vent du plan (porté par les rafales quand l'option vent est active), avec
  // une lente ondulation verticale
  const a = smooth(debut, debut + FONDU, t), out = smooth(fin, fin + FONDU, t);
  const dir = shot?.dir ?? -1, age = t - debut;
  const souffle = shot?.vent ? ventCumul(t, shot.seed ?? 0, W / 2, dir) - ventCumul(debut, shot.seed ?? 0, W / 2, dir) : 0;
  const dx = dir * (5 * age + 10 * souffle), dy = 7 * Math.sin(0.3 * age) - 1.5 * age;
  const op = force * a * (1 - out);
  const blur = 2.2 * (1 - a) + 1.8 * out;

  const last = Math.max(...vers.map((v) => [...v].length));
  const sz = Math.round(taille * 0.42);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* pas de voile de papier derrière : le poème flotte discrètement dans l'air */}
      <AbsoluteFill style={{
        opacity: op, transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined, color: ink,
      }}>
        {vers.map((v, k) => [...v].map((ch, r) => (
          <div key={`${k}-${r}`} style={{
            position: 'absolute', left: x0 - k * gap - taille / 2, top: top + r * pas, width: taille, height: taille,
            lineHeight: `${taille}px`, textAlign: 'center', fontFamily: 'ShuimoPoeme', fontSize: taille,
            textShadow: '0 0 3px rgba(43,37,32,0.3)', // l'encre a bu un peu dans les fibres
          }}>{ch}</div>
        )))}
        {source && (
          <div style={{
            position: 'absolute', left: x0 - (n - 1) * gap - gap * 0.75 - sz / 2, top: top + (last - [...source].length * 1.08 * sz / pas) * pas,
            width: sz, fontFamily: 'ShuimoFangsong', fontSize: sz, lineHeight: 1.08, textAlign: 'center',
          }}>{[...source].map((ch, i) => <div key={i} style={'《》〈〉（）'.includes(ch) ? { transform: 'rotate(90deg)' } : undefined}>{ch}</div>)}</div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
