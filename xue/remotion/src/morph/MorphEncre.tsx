// Fondu encre ↔ 3D : deux versions alignées d'une même image (3D et lavis à l'encre) et un champ de
// propagation (tools/build_morph.py). Un seuil avance sur le champ : derrière lui la couleur, juste devant une
// zone de 3D délavée en gris (la couleur arrive après la forme), au bord un liseré d'encre humide, au-delà le
// lavis posé sur le papier xuan. Sens to3d : la couleur naît au point focal ; sens toInk : l'encre gagne depuis
// les bords et s'arrête autour du sujet, qui reste en 3D au milieu d'un décor shuimo.
import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type MorphProps = { name: string; dir: 'to3d' | 'toInk'; focus: [number, number]; end: number };

const smooth = (a: number, b: number, v: number) => { const u = Math.min(1, Math.max(0, (v - a) / (b - a))); return u * u * (3 - 2 * u); };
const easeInOut = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };

type Data = { w: number; h: number; ink: Uint8ClampedArray; washed: Uint8ClampedArray; col: Uint8ClampedArray; field: Uint8ClampedArray };

const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
const pixels = (img: HTMLImageElement, w: number, h: number) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; x.drawImage(img, 0, 0, w, h);
  return x.getImageData(0, 0, w, h).data;
};

function useMorphData(name: string) {
  const [data, setData] = useState<Data | null>(null);
  const [handle] = useState(() => delayRender(`images ${name}`));
  useEffect(() => {
    Promise.all([`morph/${name}_3d.jpg`, `morph/${name}_encre.jpg`, `morph/${name}_champ.png`, 'shuimo/paper.jpg'].map((f) => load(staticFile(f)))).then(([d3, enc, ch, paper]) => {
      const w = d3.naturalWidth, h = d3.naturalHeight;
      const col = pixels(d3, w, h), e = pixels(enc, w, h), p = pixels(paper, w, h), field = pixels(ch, w, h);
      const ink = new Uint8ClampedArray(w * h * 4), washed = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h * 4; i += 4) {
        // lavis posé sur le papier (multiplication) ; 3D délavée : gris chaud éclairci
        for (let k = 0; k < 3; k++) ink[i + k] = (e[i + k] * p[i + k]) / 255;
        const g = 0.3 * col[i] + 0.59 * col[i + 1] + 0.11 * col[i + 2];
        const v = 70 + 0.72 * g;
        washed[i] = v * 1.0 * (p[i] / 255); washed[i + 1] = v * 0.985 * (p[i + 1] / 255); washed[i + 2] = v * 0.96 * (p[i + 2] / 255);
        ink[i + 3] = washed[i + 3] = 255;
      }
      setData({ w, h, ink, washed, col, field });
      continueRender(handle);
    });
  }, [name, handle]);
  return data;
}

export const MorphEncre: React.FC<MorphProps> = ({ name, dir, focus, end }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const data = useMorphData(name);
  const ref = useRef<HTMLCanvasElement>(null);
  // seuil : to3d 0 → end (la couleur s'ouvre), toInk 1,15 → end (l'encre se referme autour du sujet)
  const u = easeInOut((t - 1.0) / 4.8);
  const r = dir === 'to3d' ? -0.12 + (end + 0.12) * u : 1.15 + (end - 1.15) * u;
  useEffect(() => {
    if (!data || !ref.current) return;
    const { w, h, ink, washed, col, field } = data;
    const ctx = ref.current.getContext('2d')!;
    const out = ctx.createImageData(w, h), o = out.data;
    const rG = r + 0.07; // la zone grise précède la couleur
    for (let i = 0; i < w * h * 4; i += 4) {
      const f = field[i] / 255;
      const c = 1 - smooth(r - 0.035, r + 0.035, f);
      const g = 1 - smooth(rG - 0.04, rG + 0.04, f);
      const e = (f - rG) / 0.016, rim = 0.32 * Math.exp(-e * e) * (dir === 'to3d' ? 1 : 1);
      for (let k = 0; k < 3; k++) {
        let v = ink[i + k] * (1 - g) + washed[i + k] * g;
        v = v * (1 - c) + col[i + k] * c;
        o[i + k] = v * (1 - rim * 0.75); // liseré : l'encre s'accumule au bord humide
      }
      o[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }, [data, r, dir]);
  const s = 1 + 0.07 * easeInOut(t / 8);
  return (
    <AbsoluteFill style={{ background: '#f8f5ee', overflow: 'hidden' }}>
      <canvas ref={ref} width={data?.w ?? 1} height={data?.h ?? 1}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%` }} />
    </AbsoluteFill>
  );
};
