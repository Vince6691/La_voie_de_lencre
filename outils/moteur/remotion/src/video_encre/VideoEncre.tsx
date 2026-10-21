// Clip vidéo (Seedance, Veo…) intégré au papier shuimo : chaque image du clip est traitée dans un canvas.
// Entrée « brume » : la scène sort d'un brouillard de papier qui se dissipe, d'abord en lavis puis en couleur ;
// entrée « centre » : le lavis est tamponné, puis la couleur gagne depuis le point focal (liseré d'encre humide).
// Sortie « delave » : la couleur se retire irrégulièrement depuis les bords (photo passée), puis l'encre pâlit dans
// le papier ; sortie « brume » : le brouillard revient. Les bords du cadre restent toujours en lavis fondu dans le
// papier (pas de rectangle vidéo, filigranes de coin effacés).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AbsoluteFill, OffthreadVideo, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type VideoEncreProps = {
  src: string; // chemin dans public/
  focus?: [number, number]; // point focal (0–1)
  inMode?: 'brume' | 'centre';
  outMode?: 'delave' | 'brume';
  inDur?: number; // s
  outAt?: number; // s depuis le début de la séquence
  outDur?: number;
  startFrom?: number; // s dans le clip
  playbackRate?: number;
  zoom?: number; // zoom lent sur toute la durée (1 = aucun)
};

const PW = 1280, PH = 720; // résolution de traitement
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const INK = [29, 25, 21], FOG = [246, 241, 231];

type Fields = { paper: Uint8ClampedArray; n1: Float32Array; n2: Float32Array; fp: Float32Array; fc: Float32Array; fo: Float32Array; edge: Float32Array; inner: Float32Array };

const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
const pixels = (img: CanvasImageSource, w: number, h: number) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(img, 0, 0, w, h);
  return x.getImageData(0, 0, w, h).data;
};

function useFields(focus: [number, number]) {
  const [f, setF] = useState<Fields | null>(null);
  const [handle] = useState(() => delayRender('champs vidéo encre'));
  useEffect(() => {
    Promise.all(['shuimo_xue/noise.png', 'shuimo/paper.jpg'].map((s) => load(staticFile(s)))).then(([noise, paper]) => {
      const nz = pixels(noise, PW, PH), pp = pixels(paper, PW, PH);
      const N = PW * PH;
      const n1 = new Float32Array(N), n2 = new Float32Array(N), fp = new Float32Array(N), fc = new Float32Array(N), fo = new Float32Array(N), edge = new Float32Array(N), inner = new Float32Array(N);
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        const i = y * PW + x;
        n1[i] = nz[i * 4] / 255;
        n2[i] = nz[((PH - 1 - y) * PW + (PW - 1 - x)) * 4] / 255;
        const r = clamp(Math.hypot((x / PW - focus[0]) * 1.78, y / PH - focus[1]) / 1.1);
        fp[i] = 0.6 * (1 - r) + 0.4 * n1[i]; // présence : du centre vers les bords, en taches
        fc[i] = 0.72 * (1 - r) + 0.28 * n2[i]; // couleur : depuis le point focal
        fo[i] = 0.45 * (1 - r) + 0.55 * n2[i]; // sortie délavée : irrégulière, depuis les bords
        // forme de tache organique (ellipse bruitée) : pas de rectangle vidéo, coins (filigranes) effacés
        const cx = 0.5 + 0.4 * (focus[0] - 0.5), cy = 0.5 + 0.4 * (focus[1] - 0.5);
        const q = Math.hypot((x / PW - cx) / 0.52, (y / PH - cy) / 0.52);
        edge[i] = smooth(1.04, 0.8, q + 0.22 * (n1[i] - 0.5)); // présence : bord fondu dans le papier
        inner[i] = smooth(0.95, 0.62, q + 0.25 * (n2[i] - 0.5)); // couleur : s'arrête avant le bord (lavis autour)
      }
      setF({ paper: pp, n1, n2, fp, fc, fo, edge, inner });
      continueRender(handle);
    });
  }, [focus, handle]);
  return f;
}

export const VideoEncre: React.FC<VideoEncreProps> = ({ src, focus = [0.5, 0.5], inMode = 'brume', outMode = 'delave', inDur = 2.6, outAt, outDur = 2.2, startFrom = 0, playbackRate = 1, zoom = 1.06 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const total = durationInFrames / fps;
  const oAt = outAt ?? total - outDur;
  const fields = useFields(focus);
  const out = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(t);
  tRef.current = t;
  const work = useRef<HTMLCanvasElement | null>(null);
  const lum = useRef<Float32Array | null>(null);
  const blur = useRef<Float32Array | null>(null);
  const blur2 = useRef<Float32Array | null>(null);

  const paint = useCallback((img: CanvasImageSource) => {
    if (!fields || !out.current) return;
    if (!work.current) { work.current = document.createElement('canvas'); work.current.width = PW; work.current.height = PH; }
    const wx = work.current.getContext('2d', { willReadFrequently: true })!;
    wx.drawImage(img, 0, 0, PW, PH);
    const v = wx.getImageData(0, 0, PW, PH), d = v.data;
    const tt = tRef.current;
    const ui = clamp(tt / inDur), uo = clamp((tt - oAt) / outDur);
    const { paper, n1, fp, fc, fo, edge, inner } = fields;
    // seuils
    let pThr: number, pS: number, cThr: number, cS: number, fogA: number;
    if (inMode === 'brume') {
      pThr = 1.08 - 1.4 * ease(ui); pS = 0.16;
      cThr = 1.1 - 1.45 * ease((ui - 0.3) / 0.7); cS = 0.12;
      fogA = 1 - ease(ui * 1.05);
    } else {
      pThr = 1.05 - 1.35 * ease(ui / 0.35); pS = 0.05;
      cThr = 1.06 - 1.4 * ease((ui - 0.3) / 0.7); cS = 0.035;
      fogA = 0;
    }
    let oc = 0, op = 0; // sortie : retrait de la couleur, puis de l'encre
    if (uo > 0) {
      if (outMode === 'delave') { oc = ease(uo / 0.65); op = ease((uo - 0.45) / 0.55); }
      else { op = ease(uo); fogA = Math.max(fogA, ease(uo * 1.2)); oc = ease(uo / 0.7); }
    }
    const drift = Math.round(tt * 30);
    // luminance et contours (Sobel) : le lavis = traits d'encre sur les contours + ton léger sur les sombres
    const Lm = lum.current ?? (lum.current = new Float32Array(PW * PH));
    for (let i = 0, p = 0; i < PW * PH; i++, p += 4) Lm[i] = (0.3 * d[p] + 0.59 * d[p + 1] + 0.11 * d[p + 2]) / 255;
    // flou (boîte 5×5 séparable) avant les contours : pas de piqûres sur les étoiles, le grain, les étincelles
    const Lb = blur.current ?? (blur.current = new Float32Array(PW * PH));
    const tmp = blur2.current ?? (blur2.current = new Float32Array(PW * PH));
    for (let y = 0; y < PH; y++) { let acc = 0; const o = y * PW;
      for (let x = -2; x < PW + 2; x++) { acc += Lm[o + Math.min(PW - 1, Math.max(0, x + 2))]; if (x >= 3) acc -= Lm[o + Math.min(PW - 1, Math.max(0, x - 3))]; if (x >= 0 && x < PW) tmp[o + x] = acc / 5; } }
    for (let x = 0; x < PW; x++) { let acc = 0;
      for (let y = -2; y < PH + 2; y++) { acc += tmp[Math.min(PH - 1, Math.max(0, y + 2)) * PW + x]; if (y >= 3) acc -= tmp[Math.min(PH - 1, Math.max(0, y - 3)) * PW + x]; if (y >= 0 && y < PH) Lb[y * PW + x] = acc / 5; } }
    for (let i = 0, p = 0; i < PW * PH; i++, p += 4) {
      let P = smooth(pThr - pS, pThr + pS, fp[i]) * edge[i];
      let C = smooth(cThr - cS, cThr + cS, fc[i]) * inner[i];
      if (oc > 0) C *= smooth(oc * 1.25 - 0.25, oc * 1.25 - 0.05, fo[i]);
      if (op > 0) P *= outMode === 'delave' ? smooth(op * 1.2 - 0.2, op * 1.2, fo[i]) : smooth(op * 1.3 - 0.3, op * 1.3, fp[i]);
      const r = d[p], g = d[p + 1], b = d[p + 2];
      const L = Lm[i];
      const xi0 = i % PW;
      let gr = 0;
      if (xi0 > 0 && xi0 < PW - 1 && i > PW && i < PW * (PH - 1)) {
        const gx = Lb[i - PW + 1] + 2 * Lb[i + 1] + Lb[i + PW + 1] - Lb[i - PW - 1] - 2 * Lb[i - 1] - Lb[i + PW - 1];
        const gy = Lb[i + PW - 1] + 2 * Lb[i + PW] + Lb[i + PW + 1] - Lb[i - PW - 1] - 2 * Lb[i - PW] - Lb[i - PW + 1];
        gr = Math.hypot(gx, gy);
      }
      const tone = 0.34 * Math.pow(clamp((0.9 - L) / 0.9), 1.3);
      const ink = clamp((tone + smooth(0.06, 0.4, gr) * 0.8) * (0.8 + 0.35 * n1[i]));
      const lo = Math.min(1, C * 2), hi = Math.max(0, C * 2 - 1);
      const pr = paper[p] / 255, pg = paper[p + 1] / 255, pb = paper[p + 2] / 255;
      const gray = L * 255;
      // liseré humide à la frontière de la couleur (entrée centre)
      const e = inMode === 'centre' && ui < 1 ? (fc[i] - cThr) / 0.02 : 9;
      const rim = 1 - 0.28 * Math.exp(-e * e);
      const ch = [r, g, b].map((c, k) => {
        const pk = k === 0 ? pr : k === 1 ? pg : pb;
        const inkV = (paper[p + k] * (1 - ink) + INK[k] * ink);
        const washed = ((gray * 0.6 + c * 0.4) * 0.55 + 112) * pk; // photo passée : claire, peu saturée
        return ((inkV * (1 - lo) + washed * lo) * (1 - hi) + c * hi) * rim;
      });
      // brouillard qui dérive
      let f = 0;
      if (fogA > 0) {
        const xi = i % PW, yi = (i - xi) / PW;
        const nn = n1[yi * PW + ((xi + drift) % PW)];
        f = clamp(fogA * (0.55 + 0.9 * nn) - 0.15 * (1 - fogA));
        P = P * (1 - f * 0.6);
      }
      const a = P * (1 - f) + f;
      if (a <= 0.001) { d[p + 3] = 0; continue; }
      for (let k = 0; k < 3; k++) d[p + k] = (ch[k] * P * (1 - f) + FOG[k] * f) / a;
      d[p + 3] = a * 255;
    }
    out.current.getContext('2d')!.putImageData(v, 0, 0);
  }, [fields, inDur, oAt, outDur, inMode, outMode]);

  const s = 1 + (zoom - 1) * (t / total);
  return (
    <AbsoluteFill>
      {fields && (
        <OffthreadVideo src={staticFile(src)} muted startFrom={Math.round(startFrom * fps)} playbackRate={playbackRate}
          onVideoFrame={paint} style={{ opacity: 0, position: 'absolute', width: 2, height: 2 }} />
      )}
      <canvas ref={out} width={PW} height={PH}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `scale(${s})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%` }} />
    </AbsoluteFill>
  );
};
