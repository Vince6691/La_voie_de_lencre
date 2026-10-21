// Mosaïque de mots (série 墨道) — transition réutilisable, tirée de l'accroche du 文 (episodes/wen, WenV1 « Mosaic »).
// Des milliers de mots modernes qui contiennent le caractère couvrent le papier xuan ; la caméra fait de très gros plans
// sur quelques mots repérés (cadre vermillon qui se trace, sous-titre), puis recule en légère rotation : une vague de
// couleur parcourt les mots placés dans la silhouette du caractère (tapotement) et, de loin, ils dessinent le
// caractère ; temps d'arrêt (reflet, lumière qui monte) ; sortie : les mots se condensent en un seul caractère à
// l'encre (posé où la scène suivante l'attend) ou s'effacent.
// Temps en secondes, LOCAUX (0 = début de la séquence qui contient le composant). Pas de moteur legacy : canvas seul ;
// la police ShuimoKai doit être chargée par la composition. Sons et tuile de fibres : outils/moteur/assets/mosaique (sync.mjs).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type MosaicFocus = {
  word: string; // mot de la mosaïque (doit contenir le caractère)
  at: number; // arrivée de la caméra sur ce mot (la voix le prononce)
  label?: string; // sous-titre pendant le gros plan, ex. « 中文 · le chinois »
  near?: [number, number]; // point de l'écran (caractère plein cadre) près duquel placer le mot ; sinon automatique
};
export type MosaicConfig = {
  glyph: string; // caractère que dessinent les mots
  words: string[]; // mots qui le contiennent (une vingtaine ou plus, variés)
  focus: MosaicFocus[]; // 1 à 4 gros plans, dans l'ordre
  zoomOut: number; // début du recul (et de la vague de couleur)
  hold: number; // le caractère complet tient l'écran (temps d'arrêt, reflet)
  out: number; // début de la sortie
  outro?: 'condense' | 'fade'; // condense (défaut) : un seul caractère à l'encre ; fade : fondu au papier
  outroTo?: { x: number; y: number; size: number }; // où se pose le caractère condensé (défaut : centre, 600 px)
  title?: string; // sous-titre avant le premier gros plan, ex. « 文 · wén »
  accent?: number[]; // couleur du caractère dans les mots (défaut vermillon)
  ink?: number[];
  glyphSize?: number; // taille de la silhouette (défaut 880 px)
  cell?: { w: number; h: number; fs: number }; // grille (défaut 50 × 28, texte 20 px)
  sound?: boolean; // ambiance d'atelier, tapotement au recul, sceau au temps d'arrêt (défaut true)
  paper?: boolean; // fond papier (défaut true)
};
export const mosaicSeconds = (c: MosaicConfig) => c.out + (c.outro === 'fade' ? 0.8 : 0.95);

const VER = [184, 52, 36], INK0 = [26, 22, 19];
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const hash = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

type Cell = { x: number; y: number; w: string; on: boolean; h: number };
type Grid = { cells: Cell[]; focus: number[] };
const GRIDS = new Map<string, Grid>();
// grille de mots ; « on » = la cellule tombe dans la silhouette du caractère (rendu de la police, seuil d'alpha)
const buildGrid = (c: MosaicConfig): Grid => {
  const key = JSON.stringify([c.glyph, c.words, c.focus.map((f) => [f.word, f.near]), c.glyphSize, c.cell]);
  const got = GRIDS.get(key);
  if (got) return got;
  const { w: cw, h: ch } = c.cell ?? { w: 50, h: 28 };
  const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1080;
  const g = cv.getContext('2d')!;
  g.font = `${c.glyphSize ?? 880}px ShuimoKai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
  g.fillText(c.glyph, 960, 540);
  const px = g.getImageData(0, 0, 1920, 1080).data;
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= 1920 || y >= 1080 ? 0 : px[(Math.round(y) * 1920 + Math.round(x)) * 4 + 3]);
  const cells: Cell[] = [];
  let i = 0;
  for (let y = ch / 2 - 14; y < 1080 + 14; y += ch) for (let x = cw / 2 - 10; x < 1920 + 10; x += cw) {
    const on = [[0, 0], [-22, 0], [22, 0], [0, -12], [0, 12], [-14, -10], [14, 10], [-14, 10], [14, -10]].some(([dx, dy]) => a(x + dx, y + dy) > 110);
    cells.push({ x, y, w: c.words[Math.floor(hash(i) * c.words.length)], on, h: hash(i + 999) }); i++;
  }
  const ons = cells.map((cc, j) => (cc.on ? j : -1)).filter((j) => j >= 0);
  const near = (tx: number, ty: number) => ons.reduce((bi, j) => (Math.hypot(cells[j].x - tx, cells[j].y - ty) < Math.hypot(cells[bi].x - tx, cells[bi].y - ty) ? j : bi), ons[0]);
  // sans « near » : mots répartis du haut vers le bas du caractère, loin des bords de cellule « on »
  const focus = c.focus.map((f, k) => (f.near ? near(...f.near) : ons[Math.floor(((k + 0.5) / c.focus.length) * ons.length)]));
  c.focus.forEach((f, k) => (cells[focus[k]].w = f.word));
  const grid = { cells, focus };
  GRIDS.set(key, grid);
  return grid;
};

const useImage = (src: string) => {
  const [h] = useState(() => delayRender('image ' + src));
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { const i = new Image(); i.onload = () => { setImg(i); continueRender(h); }; i.onerror = () => continueRender(h); i.src = staticFile(src); }, [h, src]);
  return img;
};
let BG: HTMLCanvasElement | null = null;
const bgLayer = () => { if (!BG) { BG = document.createElement('canvas'); BG.width = 1920; BG.height = 1080; } return BG; };
const MOTES = Array.from({ length: 46 }, (_, i) => ({ x: hash(i + 50), y: hash(i + 150), r: 1.5 + 4 * hash(i + 250), a: 0.25 + 0.4 * hash(i + 350), v: 0.4 + hash(i + 450) }));

type Key = [number, number, number, number];
export const MosaicTransition: React.FC<{ cfg: MosaicConfig }> = ({ cfg }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const ref = useRef<HTMLCanvasElement>(null);
  const fib = useImage('mosaique/xuan_fibres.png');
  const ACC = cfg.accent ?? VER, INK = cfg.ink ?? INK0, inkCss = rgb(INK);
  const FS = (cfg.cell ?? { fs: 20 }).fs, CW = (cfg.cell ?? { w: 50 }).w, CH = (cfg.cell ?? { h: 28 }).h, GS = cfg.glyphSize ?? 880;
  const fc = cfg.focus.map((f) => f.at);
  const nF = fc.length, Z0 = cfg.zoomOut, P1 = cfg.hold, OUT = cfg.out;
  const fade = cfg.outro === 'fade';
  const to = cfg.outroTo ?? { x: 960, y: 520, size: 600 };
  const C0 = OUT + 0.9;
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1920, 1080);
    const M = buildGrid(cfg), F = M.focus.map((k) => M.cells[k]);
    const bg = bgLayer(), bctx = bg.getContext('2d')!;
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, 1920, 1080);
    // caméra : très gros plan sur le caractère du premier mot, puis de mot en mot, grand recul en légère rotation,
    // lente poussée pendant le temps d'arrêt
    const gx = (c: Cell) => { const n = [...c.w].length, k = [...c.w].indexOf(cfg.glyph); return c.x + (k - (n - 1) / 2) * FS * 1.02; };
    const keys: Key[] = [[Math.min(0, fc[0] - 1.2), gx(F[0]) + 6, F[0].y + 2, 16], [fc[0] - 0.25, F[0].x + 8, F[0].y, 9], [fc[0] + 0.5, F[0].x, F[0].y, 8.2]];
    for (let k = 1; k < nF; k++) keys.push([fc[k] - 0.4, F[k - 1].x, F[k - 1].y, 8], [fc[k] - 0.05, F[k].x, F[k].y, 8.6]);
    keys.push([Z0, F[nF - 1].x, F[nF - 1].y, 8.2], [P1 + 0.1, 960, 540, 1], [OUT + 0.3, 960, 530, 1.06]);
    let cam = keys[0];
    for (let k = 1; k < keys.length; k++) {
      const [k0, k1] = [keys[k - 1], keys[k]];
      if (t >= k1[0]) { cam = k1; continue; }
      if (t > k0[0]) {
        const u = k === keys.length - 1 ? (t - k0[0]) / (k1[0] - k0[0]) : ease((t - k0[0]) / (k1[0] - k0[0]));
        cam = [t, k0[1] + (k1[1] - k0[1]) * u, k0[2] + (k1[2] - k0[2]) * u, Math.exp(Math.log(k0[3]) + (Math.log(k1[3]) - Math.log(k0[3])) * u)];
      }
      break;
    }
    const [, cx, cy, sc] = cam;
    const rot = -0.05 * Math.sin(Math.PI * seg(t, Z0, P1 + 0.1));
    ctx.save();
    for (const c2 of [ctx, bctx]) { c2.translate(960, 540); c2.rotate(rot); c2.translate(-960, -540); }
    const X = (x: number) => (x - cx) * sc + 960, Y = (y: number) => (y - cy) * sc + 540;
    const dof = clamp((sc - 1.6) / 4) * 5.5; // flou de profondeur en gros plan : seuls les mots repérés sont nets
    const cond = fade ? 0 : seg(t, OUT + 0.05, OUT + 0.6), shrink = ease(seg(t, OUT + 0.4, C0));
    const gone = fade ? seg(t, OUT, OUT + 0.8) : 0;
    const fs = FS * sc, kb = clamp((sc - 1) / 2);
    const W0 = Z0 + 0.05, W1 = P1 - 0.05; // vague de couleur pendant le recul
    const hold = seg(t, P1, P1 + 0.6), sweepX = 380 + 1160 * ease(seg(t, P1 + 0.15, P1 + 1.2));
    const last = F[nF - 1];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
    if (cond < 1) M.cells.forEach((c, i) => {
      const sx = X(c.x), sy = Y(c.y);
      if (sx < -fs * 3 || sx > 1920 + fs * 3 || sy < -fs * 2 || sy > 1080 + fs * 2) return;
      const isF = M.focus.indexOf(i);
      const tc = isF >= 0 ? fc[isF] - 0.05 : c.on ? W0 + (W1 - W0) * (0.75 * Math.hypot(c.x - last.x, c.y - last.y) / 1100 + 0.25 * c.h) : 1e9;
      const col = seg(t, tc, tc + 0.12);
      const pop = (1 + 0.35 * win(t, tc, tc + 0.3, 0.12)) * (1 - 0.6 * cond);
      const flash = win(t, tc, tc + 0.45, 0.1) + (c.on ? 0.8 * hold * Math.max(0, 1 - Math.abs(c.x - sweepX) / 90) : 0);
      const base = (0.16 + 0.34 * kb) * (1 - 0.55 * hold); // mots pâles du fond, qui s'effacent pendant l'arrêt
      if (col > 0 && kb < 1) { // lavis d'encre sous les mots du caractère : il se lit de loin
        ctx.save(); ctx.globalAlpha = (0.14 + 0.06 * hold) * (1 - kb) * col * (1 - cond) * (1 - gone); ctx.fillStyle = inkCss;
        ctx.fillRect(sx - CW * sc / 2, sy - CH * sc / 2, CW * sc + 0.5, CH * sc + 0.5); ctx.restore();
      }
      // cadre vermillon qui se trace autour du mot repéré
      const end = isF >= 0 ? (isF < nF - 1 ? fc[isF + 1] - 0.1 : Z0 + 0.65) : 0;
      const hi = isF >= 0 ? win(t, fc[isF] - 0.05, end, 0.2) : 0;
      if (hi > 0) {
        const n = [...c.w].length, bw = fs * (0.5 + n), bh = fs * 1.56, per = 2 * (bw + bh), tr = seg(t, fc[isF] - 0.05, fc[isF] + 0.35);
        ctx.save(); ctx.globalAlpha = hi; ctx.strokeStyle = rgb(ACC); ctx.lineWidth = 0.12 * fs; ctx.shadowColor = rgb(ACC, 0.6); ctx.shadowBlur = 0.4 * fs;
        ctx.setLineDash([per * tr, per]); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.roundRect(sx - bw / 2, sy - bh / 2, bw, bh, fs * 0.2); ctx.stroke(); ctx.restore();
      }
      const g2 = isF < 0 && dof > 0.3 ? bctx : ctx; // calque flou ou net
      g2.font = `${fs * pop}px ShuimoKai`;
      const al = (1 - cond) * (1 - gone) * (base + (1 - base) * col);
      const first = isF === 0 ? 1 : 0; // tout premier plan : le caractère du premier mot est déjà en couleur
      const chs = [...c.w];
      chs.forEach((chr, k) => {
        const isG = chr === cfg.glyph;
        const on = isG ? Math.max(col, first) : col;
        g2.globalAlpha = (first && isG ? (1 - cond) * (1 - gone) : al) * (on > 0 ? 0.93 : 1);
        const cc = mixc([170, 161, 150], isG ? ACC : INK, on);
        g2.fillStyle = rgb(cc);
        // encre bue par le papier : halo de la même couleur ; éclat de la vague
        if (on > 0) { g2.shadowColor = rgb(cc, 0.45 * on); g2.shadowBlur = Math.max(1, 0.07 * fs); }
        if (isG && flash > 0) { g2.shadowColor = rgb(ACC, 0.85); g2.shadowBlur = 14 * flash * Math.max(1, sc * 0.6); }
        g2.fillText(chr, sx + (k - (chs.length - 1) / 2) * fs * 1.02 * (1 - 0.6 * cond), sy);
        g2.shadowBlur = 0;
      });
    });
    if (cond > 0) {
      ctx.save(); ctx.globalAlpha = cond; ctx.fillStyle = inkCss; ctx.font = `${GS + (to.size - GS) * shrink}px ShuimoKai`;
      ctx.fillText(cfg.glyph, 960 + (to.x - 960) * shrink, 540 + (to.y - 540) * shrink); ctx.restore();
    }
    ctx.restore();
    if (dof > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.filter = `blur(${dof}px)`; ctx.drawImage(bg, 0, 0); ctx.restore(); }
    const fx = 1 - Math.max(cond, gone); // effets d'atelier (lumière, poussière, vignettage), éteints à la sortie
    // fibres du papier xuan, à l'échelle de la caméra (multiply : elles passent aussi sur l'encre)
    if (fib) {
      const pat = ctx.createPattern(fib, 'repeat')!;
      pat.setTransform(new DOMMatrix().translate(960, 540).rotate(rot * 180 / Math.PI).translate(-960, -540).translate(960 - cx * sc, 540 - cy * sc).scale(sc * 0.5));
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.85; ctx.fillStyle = pat; ctx.fillRect(0, 0, 1920, 1080); ctx.restore();
    }
    // lumière rasante chaude (haut gauche), ombre douce (bas droit) ; elle monte sur le caractère pendant l'arrêt
    ctx.save();
    const lgr = ctx.createLinearGradient(0, 0, 1920, 1080);
    lgr.addColorStop(0, `rgba(255,226,176,${0.22 * (0.4 + 0.6 * fx)})`); lgr.addColorStop(0.55, 'rgba(255,226,176,0)');
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = lgr; ctx.fillRect(0, 0, 1920, 1080);
    const hg = ctx.createRadialGradient(960, 500, 60, 960, 520, 620);
    hg.addColorStop(0, `rgba(255,214,150,${0.2 * hold * fx})`); hg.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, 1920, 1080);
    ctx.globalCompositeOperation = 'multiply';
    const sh = ctx.createLinearGradient(1920, 1080, 700, 300);
    sh.addColorStop(0, `rgba(150,120,90,${0.35 * (0.4 + 0.6 * fx)})`); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, 1920, 1080);
    ctx.restore();
    // poussière dans la lumière : premier plan, défile plus vite que la caméra
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    MOTES.forEach((m) => {
      const Wd = 2300, Hd = 1400;
      const x = (((m.x * Wd - (cx - 960) * 0.35 * Math.min(sc, 6) + t * 14 * m.v) % Wd) + Wd) % Wd - 190;
      const y = (((m.y * Hd - (cy - 540) * 0.35 * Math.min(sc, 6) - t * 9 * m.v) % Hd) + Hd) % Hd - 160;
      const light = 0.45 + 0.55 * clamp(1 - (x + y) / 2400), r = m.r * (1 + 0.4 * Math.min(1, sc / 8));
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      gg.addColorStop(0, `rgba(255,240,215,${m.a * light * fx})`); gg.addColorStop(1, 'rgba(255,240,215,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 7); ctx.fill();
    });
    ctx.restore();
    const g = ctx.createRadialGradient(960, 540, 420, 960, 540, 1150);
    g.addColorStop(0, 'rgba(70,50,30,0)'); g.addColorStop(1, `rgba(70,50,30,${0.2 * fx})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  });
  if (t > mosaicSeconds(cfg) + 0.05) return null;
  const labelEnd = (k: number) => (k < nF - 1 ? fc[k + 1] - 0.3 : Z0 + 0.75);
  const sound = cfg.sound !== false;
  return (
    <AbsoluteFill>
      {cfg.paper !== false && <AbsoluteFill style={{ background: `#f3eee4 url(${staticFile('shuimo/paper.jpg')}) center/cover` }} />}
      <canvas ref={ref} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {cfg.title && <Label text={cfg.title} a={win(t, 0.2, fc[0] - 0.2, 0.3)} size={64} />}
      {cfg.focus.map((f, k) => f.label && <Label key={k} text={f.label} a={win(t, f.at + 0.1, labelEnd(k), 0.3)} size={60} strong />)}
      {sound && <>
        <Audio src={staticFile('mosaique/ambiance.wav')} volume={(f) => 0.9 * Math.min(1, f / (0.6 * fps)) * (1 - seg(f / fps, OUT, OUT + 0.9))} />
        <Sequence from={Math.round((Z0 + 0.2) * fps)}><Audio src={staticFile('mosaique/tapotement.wav')} volume={0.7} /></Sequence>
        <Sequence from={Math.round((P1 + 0.08) * fps)}><Audio src={staticFile('mosaique/sceau.wav')} volume={0.45} /></Sequence>
      </>}
    </AbsoluteFill>
  );
};

const Label: React.FC<{ text: string; a: number; size: number; strong?: boolean }> = ({ text, a, size, strong }) => (
  <div style={{ position: 'absolute', width: '100%', top: 880, display: 'flex', justifyContent: 'center', opacity: a }}>
    <div style={{ background: `rgba(246,241,231,${strong ? 0.94 : 0.78})`, borderRadius: 14, padding: strong ? '10px 34px' : '2px 22px', boxShadow: '0 0 30px rgba(246,241,231,0.9)',
      fontFamily: 'ShuimoLatin, ShuimoKai', fontWeight: strong ? 600 : 400, fontSize: size, color: '#3b322b' }}>{text}</div>
  </div>
);
