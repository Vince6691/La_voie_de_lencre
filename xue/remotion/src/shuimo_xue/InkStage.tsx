// Scène d'encre de la version tout shuimo : estampages (plastron, bronze) tamponnés sur le papier, fissures de
// divination, glyphes réels de 學 révélés en blanc dans l'estampage puis rendus à l'encre quand l'estampage sèche,
// composantes colorées aux pigments minéraux. Dessin image par image dans un canvas (fondus pixel par pixel sur
// un bruit fractal : l'encre est tamponnée par taches, et sèche de même).
import React, { useEffect, useRef, useState } from 'react';
import { continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import glyphs from '../data/realglyphs.json';
import { TimeScrollConfig, arrivePose, cursorPose, morphK as tsMorph } from '../rouleau/TimeScroll';

const W = 1920, H = 1080;
export const INK = [29, 25, 21];
export const PIGMENT: Record<string, number[]> = {
  yao: [196, 136, 30], // 藤黃 gomme-gutte
  roof: [52, 132, 98], // 石綠 malachite
  hand: [192, 57, 43], // 朱砂 vermillon
  child: [40, 92, 146], // 石青 azurite
};
const PAPERWHITE = [240, 233, 219];

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
export const seg = (t: number, a: number, b: number) => smooth(a, b, t);
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const css = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

type G = { paths: { c: string; d: string }[] };
const GL = glyphs as unknown as Record<string, G>;

// minutage (secondes depuis le début de la composition)
export const T = {
  plastronIn: [5.6, 7.0], crack1: [7.3, 8.2], crack2: [8.0, 8.9], jiaguIn: [9.6, 11.0],
  plastronOut: [11.9, 13.2], yao: 13.3, roof: 17.96, hand: 20.2,
  // rouleau du temps : le signe Shang devient le curseur de la frise et se change en signe Zhou pendant le voyage
  travel: [22.4, 27.4],
  bronzeIn: [29.9, 31.7], bronzeOut: [37.0, 38.3], jinwenColor: [38.3, 39.3], child: 41.4,
};

// ── rouleau du temps (src/rouleau/TimeScroll.tsx) : Shang → Zhou ; le signe Shang est le curseur de la frise et se
// change en signe Zhou pendant la glissade (sans l'enfant, qui attend la voix), puis le signe Zhou grandit au centre
export const TRAVEL: TimeScrollConfig = { at: T.travel[0], duration: T.travel[1] - T.travel[0], from: 0, to: 1, years: [-1250, -1046] };
export const glyphPose = (name: 'jiaguwen' | 'jinwen', t: number) => (name === 'jiaguwen' ? cursorPose(TRAVEL, t) : arrivePose(TRAVEL, t));

const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });

// masque d'encre tamponnée : p 0 → rien, 1 → tout ; les pixels où le bruit est fort apparaissent d'abord
// (radial : part du centre (cx, cy) de la boîte)
function maskLayer(ctx: CanvasRenderingContext2D, noise: Uint8ClampedArray, box: number[], p: number, s = 0.08, radial = 0) {
  if (p >= 1) return;
  const [x0, y0, w, h] = box.map(Math.round);
  if (p <= 0) { ctx.clearRect(x0, y0, w, h); return; }
  const img = ctx.getImageData(x0, y0, w, h), d = img.data;
  const thr = 1 + s - p * (1 + 2 * s);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] === 0) continue;
    let n = noise[((y0 + y) * W + (x0 + x)) * 4] / 255;
    if (radial) { const r = Math.hypot(x / w - 0.5, y / h - 0.5) * 1.6; n = (1 - radial) * n + radial * (1 - r); }
    d[i + 3] *= smooth(thr - s, thr + s, n);
  }
  ctx.putImageData(img, x0, y0);
}

function glyphPaths(name: string) {
  return GL[name].paths.map((p) => ({ c: p.c, path: new Path2D(p.d) }));
}

export type InkTiming = typeof T;
// T et travel : minutage et rouleau du temps (par défaut ceux de l'essai ; la version v2 passe les siens)
export const InkStage: React.FC<{ T?: InkTiming; travel?: TimeScrollConfig }> = ({ T: TT = T, travel = TRAVEL }) => {
  const poseOf = (name: 'jiaguwen' | 'jinwen', t: number) => (name === 'jiaguwen' ? cursorPose(travel, t) : arrivePose(travel, t));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ref = useRef<HTMLCanvasElement>(null);
  const [res, setRes] = useState<{ plastron: HTMLImageElement; bronze: HTMLImageElement; noise: Uint8ClampedArray; layer: HTMLCanvasElement } | null>(null);
  const [handle] = useState(() => delayRender('estampages'));
  useEffect(() => {
    Promise.all(['plastron.png', 'bronze.png', 'noise.png'].map((f) => load(staticFile(`shuimo_xue/${f}`)))).then(([plastron, bronze, n]) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d')!; x.drawImage(n, 0, 0, W, H);
      const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
      setRes({ plastron, bronze, noise: x.getImageData(0, 0, W, H).data, layer });
      continueRender(handle);
    });
  }, [handle]);

  useEffect(() => {
    if (!res || !ref.current) return;
    const out = ref.current.getContext('2d')!;
    out.clearRect(0, 0, W, H);
    const L = res.layer.getContext('2d', { willReadFrequently: true })!;
    const cx = 960, cy = 560;
    const boxOf = (name: 'jiaguwen' | 'jinwen', side: number) => {
      const p = poseOf(name, t), d = side * p.s;
      return [Math.max(0, p.x - d / 2), Math.max(0, p.y - d / 2), Math.min(d, W), Math.min(d, H)];
    };

    // une couche : dessin → masque d'encre → posée sur la sortie
    const layer = (draw: (c: CanvasRenderingContext2D) => void, box: number[], p: number, s?: number, radial?: number) => {
      if (p <= 0) return;
      L.clearRect(0, 0, W, H); L.save(); draw(L); L.restore();
      maskLayer(L, res.noise, box, p, s, radial);
      out.drawImage(res.layer, 0, 0);
    };

    // glyphe : couleur par composante, posé dans une boîte carrée de côté size centrée en (x, y)
    const glyph = (c: CanvasRenderingContext2D, name: 'jiaguwen' | 'jinwen', size0: number, color: (comp: string) => number[], glow?: (comp: string) => number, alpha?: (comp: string) => number) => {
      const pose = poseOf(name, t), size = size0 * pose.s, k = size / 400;
      for (const g of glyphPaths(name)) {
        const a = alpha ? alpha(g.c) : 1;
        if (a <= 0) continue;
        c.save(); c.globalAlpha = a; c.translate(pose.x - size / 2, pose.y - size / 2); c.scale(k, k);
        const gl = glow ? glow(g.c) : 0;
        if (gl > 0) { c.shadowColor = `rgba(${PIGMENT[g.c].join(',')},${0.55 * gl})`; c.shadowBlur = 30 * gl; }
        c.fillStyle = css(color(g.c)); c.fill(g.path); c.restore();
      }
    };

    // ── Shang : estampage du plastron, fissures, signe révélé en blanc, puis l'estampage sèche
    const pw = 686, ph = 900, pbox = [cx - pw / 2, cy - ph / 2, pw, ph];
    const pIn = seg(t, TT.plastronIn[0], TT.plastronIn[1]) * (1 - seg(t, TT.plastronOut[0], TT.plastronOut[1]));
    layer((c) => {
      c.drawImage(res.plastron, pbox[0], pbox[1], pw, ph);
      // fissures 卜 : une fente verticale puis une branche, brûlées dans l'os (claires dans l'estampage)
      const cracks: [number[], number, number, number][] = [[TT.crack1, cx + 150, cy - 240, 1], [TT.crack2, cx - 165, cy + 200, -1]];
      cracks.forEach(([[a, b], x, y, dir]) => {
        const u = seg(t, a, b);
        if (u <= 0) return;
        c.strokeStyle = 'rgba(244,236,222,0.92)'; c.lineWidth = 3.2; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(x, y);
        const v = Math.min(1, u * 1.6), br = clamp(u * 1.6 - 0.6);
        c.lineTo(x + 4, y + 95 * v);
        c.stroke();
        if (br > 0) { c.beginPath(); c.moveTo(x + 2, y + 38); c.lineTo(x + 2 + dir * 58 * br, y + 38 + 18 * br); c.stroke(); }
      });
    }, pbox, pIn, t >= TT.plastronOut[0] ? 0.22 : 0.07); // l'encre sèche en fondu large, pas en taches
    // signe Shang : blanc dans l'estampage, puis encre sur le papier, puis composantes en pigments
    const jIn = seg(t, TT.jiaguIn[0], TT.jiaguIn[1]);
    const mk = tsMorph(travel, t);
    const dry = seg(t, TT.plastronOut[0] + 0.3, TT.plastronOut[1] + 0.3); // blanc → encre
    const lit: Record<string, number> = { yao: seg(t, TT.yao, TT.yao + 0.8), roof: seg(t, TT.roof, TT.roof + 0.8), hand: seg(t, TT.hand, TT.hand + 0.8) };
    if (mk < 1) layer((c) => glyph(c, 'jiaguwen', 560, (comp) => mix(mix(PAPERWHITE, INK, dry), PIGMENT[comp], lit[comp] ?? 0), undefined, () => 1 - mk),
      boxOf('jiaguwen', 600), jIn, 0.07, 0.5);

    // ── Zhou : feuille d'estampage de bronze, inscription révélée en blanc, puis à l'encre et en pigments
    const bw = 740, bh = 860, bbox = [cx - bw / 2, cy - bh / 2, bw, bh];
    const bIn = seg(t, TT.bronzeIn[0], TT.bronzeIn[1]) * (1 - seg(t, TT.bronzeOut[0], TT.bronzeOut[1]));
    layer((c) => c.drawImage(res.bronze, bbox[0], bbox[1], bw, bh), bbox, bIn, t >= TT.bronzeOut[0] ? 0.22 : 0.07);
    // signe Zhou : arrive en pigments (sans l'enfant), devient l'inscription blanche quand l'estampage est tamponné
    // autour de lui, puis l'estampage sèche : encre, pigments, et l'enfant apparaît
    const nIn = t >= TT.travel[0] ? 1 : 0;
    const whiten = seg(t, TT.bronzeIn[0] + 0.5, TT.bronzeIn[1] + 0.3);
    const dry2 = seg(t, TT.bronzeOut[0] + 0.3, TT.bronzeOut[1] + 0.3);
    const col2 = seg(t, TT.jinwenColor[0], TT.jinwenColor[1]), childLit = seg(t, TT.child, TT.child + 0.9);
    layer((c) => glyph(c, 'jinwen', 600,
      (comp) => mix(mix(mix(PIGMENT[comp], PAPERWHITE, whiten), INK, dry2), PIGMENT[comp], comp === 'child' ? childLit : col2),
      (comp) => (comp === 'child' ? childLit * (1 - 0.6 * seg(t, TT.child + 1.2, TT.child + 2.4)) : 0),
      (comp) => (comp === 'child' ? childLit : mk)),
      boxOf('jinwen', 640), nIn, 0.12, 0);
  }, [res, t]);

  return <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
};
