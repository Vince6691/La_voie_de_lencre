// Rouleau du temps en 3D (série 墨道) : le paysage plein cadre s'avère être une peinture sur un rouleau posé sur une
// table laquée. La caméra, d'abord à la verticale (le plan 2D exact), s'élève, bascule en vue rasante (≈ 18°) et suit
// le rouleau qui défile entre ses deux bâtons ; les époques passent (sceaux, années sur la bordure de soie), pétales
// de prunier et poussières dans la lumière chaude ; ralenti, un sceau de jade descend et frappe (« tac ») le sceau de
// l'époque d'arrivée ; la caméra remonte puis plonge à la verticale sur le paysage d'arrivée, qui redevient le plan 2D ;
// le sceau s'envole vers le cartouche d'époque.
//
// Utilisation (skill rouleau-3d) :
//   const C: Rouleau3DConfig = { at: 105.2, de: 'zhou', vers: 'royaumes', fromLand: { seed: 9, mood: 'jour' }, toLand: { seed: 26, mood: 'brume' } };
//   <Rouleau3DStage cfg={C} />   (plein cadre, de at − 0,3 à at + r3Seconds(C) ; à l'appelant les plans 2D avant et après)
//   r3TagIn(C, t) : opacité du cartouche d'arrivée (le sceau volant s'y pose en (156, 136), 92 px) ;
//   cartouches : cartouche(C.de) / cartouche(C.vers) (src/periodes.ts) — mêmes sceaux et mêmes noms que le rouleau.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { compose, Mood, Shot } from '../shuimo/layout';
import { rng } from '../shuimo/common';
import { travelM } from '../rouleau/TimeScroll';
import { periode, periodesEntre } from '../periodes';

export type Rouleau3DConfig = {
  at: number; duration?: number; // 5,8 s par défaut (le son est calé dessus)
  de: string; vers: string; // périodes de départ et d'arrivée (identifiants de src/periodes.ts : 'shang', 'zhou', 'royaumes', 'qin', 'han'…)
  annees?: [number, number]; // années du compteur (par défaut : début de chaque période)
  fromLand: { seed: number; mood: Mood }; toLand: { seed: number; mood: Mood };
  midSeeds?: number[]; // paysages traversés (2), puis 2 marges
  inscriptions?: Inscr[]; // poèmes inscrits sur le rouleau (par défaut : INSCRIPTIONS) — idéalement des vers qui contiennent le caractère étudié
  collection?: Collect[]; // sceaux de collection (par défaut : COLLECT)
  variant?: 'complet' | 'court'; // complet 5,3 s (verticale → rasante → plongée) ; court 3,6 s (rasante d'emblée, sortie en fondu)
  stone?: 'miel' | 'rouge'; // pierre du sceau : Shoushan miel, ou pierre « sang de poulet » (鸡血石) rouge
};

// ── géométrie de la peinture, en « pixels de plan » P (un plan 2D = 1920 × 1080 P) ──
const SH = 1920, TOP = 50, PH = 1280, Q = 0.7; // bordure haute, hauteur du rouleau (peinture + bordure de soie)
const NSHOT = 6, PW = NSHOT * SH; // marge, départ, 2 traversées, arrivée, marge
const UNIT = 320; // P par unité 3D (le rouleau fait 4 unités de haut)
const VIS = 10; // longueur visible du rouleau entre les bâtons (unités)
const SEAL = { dx: 600, y: 930, size: 150 }; // sceau d'époque : à droite et en bas de chaque plan
const C0 = SH + SH / 2; // centre du plan de départ
const SEAL0 = C0 + SEAL.dx, SEAL1 = 4 * SH + SH / 2 + SEAL.dx;
const STOP_X = 1.6; // le sceau d'arrivée s'arrête en x = 1,6 (le point que vise la caméra rasante)
const C1 = SEAL1 - STOP_X * UNIT;
const ZC = -2 + (4 * (TOP + 540)) / PH; // centre du paysage (z)
const ZS = -2 + (4 * SEAL.y) / PH; // ligne des sceaux (z)
const R = 0.3; // rayon des parties enroulées

const VER = 'rgb(192,57,43)', INK = 'rgb(29,25,21)';
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const sm = (u: number) => { const v = clamp(u); return v * v * (3 - 2 * v); };
const eio = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vl = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);

const yearsOf = (c: Rouleau3DConfig): [number, number] => c.annees ?? [periode(c.de).debut, periode(c.vers).debut];
const yearFmt = (y: number) => (y < 0 ? `−${Math.abs(Math.round(y))}` : `${Math.round(y)}`);
// déroulés : V(c) donne les temps de chaque variante (en temps de référence s, 0 = début du rouleau)
type Timing = {
  len: number; toRef: (u: number) => number; lenRef: number; impact: number; travel: (s: number) => number;
  cam: (s: number) => { p: THREE.Vector3; l: THREE.Vector3 };
  canvasIn: [number, number]; canvasOut: [number, number]; year: [number, number, number, number]; petals: [number, number, number, number];
  seal: { show: number; appear: number; fly: [number, number]; fade: [number, number] }; tag: [number, number]; sound: string; stampOff: number;
};
const dur = (c: Rouleau3DConfig) => c.duration ?? V(c).len;
const tRef = (c: Rouleau3DConfig, t: number) => { const v = V(c); return v.toRef(((t - c.at) * v.len) / dur(c)); };
export const r3Seconds = (c: Rouleau3DConfig) => dur(c);
export const r3TagIn = (c: Rouleau3DConfig, t: number) => { const v = V(c); return sm(seg(tRef(c, t), v.tag[0], v.tag[1])); };

// ── la peinture du rouleau (une seule fois) ──
const shotsOf = (c: Rouleau3DConfig): Shot[] => {
  const mid = c.midSeeds ?? [14, 33];
  const seeds: [number, Mood][] = [[5, c.fromLand.mood], [c.fromLand.seed, c.fromLand.mood], [mid[0], 'jour'], [mid[1], 'aube'], [c.toLand.seed, c.toLand.mood], [40, c.toLand.mood]];
  return seeds.map(([s, mood]) => compose(s, { move: 'pan', mood, duration: 10 }));
};
const MOODFILL: Partial<Record<Mood, (g: CanvasRenderingContext2D, w: number, h: number) => void>> = {
  aube: (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(240,190,150,0.42)'); gr.addColorStop(0.45, 'rgba(245,215,185,0.18)'); gr.addColorStop(0.75, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'multiply'; g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; },
  brume: (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(250,248,243,0.15)'); gr.addColorStop(0.55, 'rgba(250,248,243,0.5)'); gr.addColorStop(1, 'rgba(250,248,243,0.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
  nuit: (g, w, h) => { g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(120,130,160,0.55)'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; },
};
// texte d'un sceau d'époque : un caractère au centre, deux caractères l'un sous l'autre (春秋, 三國…)
const sealText = (g: CanvasRenderingContext2D, zh: string, s: number) => {
  g.textAlign = 'center'; g.textBaseline = 'middle'; const ch = [...zh];
  if (ch.length === 1) { g.font = `${s * 0.7}px ShuimoKai`; g.fillText(zh, 0, s * 0.03); return; }
  g.font = `${s * 0.42}px ShuimoKai`; ch.slice(0, 2).forEach((c, i) => g.fillText(c, 0, (i - 0.5) * s * 0.44 + s * 0.02));
};
const drawSealSquare = (g: CanvasRenderingContext2D, x: number, y: number, s: number, zh: string, a: number, ghost = false) => {
  g.save(); g.translate(x, y); g.globalAlpha = a;
  if (ghost) {
    g.strokeStyle = VER; g.lineWidth = s * 0.03; g.setLineDash([s * 0.06, s * 0.05]); g.strokeRect(-s * 0.45, -s * 0.45, s * 0.9, s * 0.9); g.setLineDash([]);
    g.fillStyle = 'rgba(192,57,43,0.35)'; sealText(g, zh, s);
  } else {
    const R0 = rng(zh.charCodeAt(0));
    g.fillStyle = VER; g.beginPath();
    for (let i = 0; i < 40; i++) { const k = i / 40, side = Math.floor(k * 4), f = (k * 4) % 1, j = (R0() - 0.5) * s * 0.025;
      const p = [[-1 + 2 * f, -1], [1, -1 + 2 * f], [1 - 2 * f, 1], [-1, 1 - 2 * f]][side]; g.lineTo((p[0] * s) / 2 + j, (p[1] * s) / 2 + j); }
    g.closePath(); g.fill();
    g.fillStyle = '#f6eee0'; sealText(g, zh, s);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 70; i++) { g.globalAlpha = 0.25 + 0.5 * R0(); g.beginPath(); g.arc((R0() - 0.5) * s, (R0() - 0.5) * s, 0.5 + R0() * s * 0.012, 0, 7); g.fill(); }
  }
  g.restore();
};
// ── inscriptions (題跋) : poèmes en colonnes de droite à gauche, signature plus petite, sceaux de nom et de collection.
// Placés hors des plans de départ et d'arrivée (qui doivent rester identiques aux plans 2D). Encre réaliste : densité
// variable d'un caractère à l'autre, légère bavure dans les fibres, manques du pinceau sec.
export type Inscr = { x: number; y: number; size: number; font: string; cols: string[]; sig?: string; seal?: string; ink?: number };
export type Collect = { x: number; y: number; size: number; text: string; white: boolean };
export const INSCRIPTIONS: Inscr[] = [
  { x: 1600, y: 190, size: 70, font: 'ShuimoKai', cols: ['嫋嫋兮秋風', '洞庭波兮', '木葉下'], sig: '錄楚辭湘夫人 丙申秋日', seal: '遊心', ink: 0.85 },
  { x: 5560, y: 170, size: 78, font: 'ShuimoKai', cols: ['蒹葭蒼蒼', '白露為霜', '所謂伊人', '在水一方'], sig: '錄詩經蒹葭於墨道山房', seal: '墨道', ink: 0.92 },
  { x: 6500, y: 160, size: 90, font: 'ShuimoCao', cols: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'], sig: '柳宗元江雪', seal: '雲水', ink: 0.95 },
  { x: 10950, y: 200, size: 72, font: 'ShuimoKai', cols: ['行到水窮處', '坐看雲起時'], sig: '王維句', seal: '長樂', ink: 0.88 },
];
// sceaux de collection, épars près des bords des feuilles (comme sur les rouleaux anciens)
// (les sceaux utilisent fonts/ChongxiSeal-sceaux.otf, sous-ensemble de ChongxiSeal : ajouter les caractères avec pyftsubset)
export const COLLECT: Collect[] = [
  { x: 3990, y: 1040, size: 92, text: '墨道珍藏', white: true }, { x: 5700, y: 980, size: 62, text: '清賞', white: false },
  { x: 7560, y: 210, size: 70, text: '神品', white: true }, { x: 260, y: 1010, size: 80, text: '寶', white: false },
];
const sealStamp = (g: CanvasRenderingContext2D, x: number, y: number, size: number, text: string, white: boolean, seed: number) => {
  const R0 = rng(seed), n = text.length, cols = n > 2 ? 2 : 1, rows = Math.ceil(n / cols), w = cols === 1 && n === 2 ? size * 0.62 : size;
  const t = document.createElement('canvas'); t.width = Math.ceil(w) + 8; t.height = Math.ceil(size) + 8; const q = t.getContext('2d')!;
  q.translate(4, 4);
  q.fillStyle = 'rgb(178,40,32)';
  if (white) q.fillRect(0, 0, w, size); else { q.lineWidth = size * 0.06; q.strokeStyle = q.fillStyle; q.strokeRect(size * 0.03, size * 0.03, w - size * 0.06, size - size * 0.06); }
  q.globalCompositeOperation = white ? 'destination-out' : 'source-over';
  q.textAlign = 'center'; q.textBaseline = 'middle'; const fs = (size / rows) * 0.92; q.font = `${fs}px ShuimoSceau`;
  [...text].forEach((ch, i) => { const col = Math.floor(i / rows), row = i % rows; q.fillText(ch, w - (col + 0.5) * (w / cols), (row + 0.5) * (size / rows)); });
  q.globalCompositeOperation = 'destination-out'; // usure, encre de sceau inégale
  for (let i = 0; i < 90; i++) { q.globalAlpha = 0.2 + 0.6 * R0(); q.beginPath(); q.arc(R0() * w, R0() * size, 0.6 + R0() * size * 0.02, 0, 7); q.fill(); }
  g.save(); g.globalAlpha = 0.86; g.translate(x, y); g.rotate((R0() - 0.5) * 0.04); g.drawImage(t, -t.width / 2, -t.height / 2); g.restore();
};
const inscribe = (g: CanvasRenderingContext2D, it: Inscr, seed: number) => {
  const R0 = rng(seed), lh = it.size * 1.08, cw = it.size * 1.25, sigSize = it.size * 0.58;
  const W = Math.ceil((it.cols.length + 1.2) * cw + 40), H = Math.ceil(Math.max(...it.cols.map((c) => c.length)) * lh + 260);
  const t = document.createElement('canvas'); t.width = W; t.height = H; const q = t.getContext('2d')!;
  q.textAlign = 'center'; q.textBaseline = 'top';
  const ink = it.ink ?? 0.85;
  it.cols.forEach((col, ci) => {
    const cx = W - 20 - (ci + 0.5) * cw + (R0() - 0.5) * 4;
    [...col].forEach((ch, k) => {
      // le pinceau se recharge en tête de colonne : encre plus dense, puis s'éclaircit
      const a = ink * (1 - 0.22 * (k / Math.max(1, col.length - 1))) * (0.9 + 0.1 * R0());
      q.save(); q.translate(cx + (R0() - 0.5) * 3, 10 + k * lh + (R0() - 0.5) * 3); q.rotate((R0() - 0.5) * 0.03);
      q.globalAlpha = a; q.fillStyle = 'rgb(24,19,15)'; q.font = `${it.size * (0.94 + 0.1 * R0())}px ${it.font}`; q.fillText(ch, 0, 0); q.restore();
    });
  });
  let sealY = 0;
  const sx = W - 20 - (it.cols.length + 0.45) * cw;
  if (it.sig) {
    const y0 = 10 + lh * 0.6;
    [...it.sig].forEach((ch, k) => { if (ch === ' ') return; q.globalAlpha = ink * 0.85; q.fillStyle = 'rgb(24,19,15)'; q.font = `${sigSize}px ${it.font}`; q.fillText(ch, sx, y0 + k * sigSize * 1.05); });
    sealY = y0 + it.sig.length * sigSize * 1.05 + sigSize * 0.4;
  }
  // pinceau sec : petits manques dans les traits
  q.globalCompositeOperation = 'destination-out'; q.globalAlpha = 1;
  for (let i = 0; i < W * H / 260; i++) { q.fillStyle = `rgba(0,0,0,${0.15 + 0.5 * R0()})`; q.fillRect(R0() * W, R0() * H, 1 + R0() * 2.5, 0.8 + R0() * 1.5); }
  // bavure dans les fibres (copie floue, légère) puis le trait net, posés en « multiplier » sur le papier
  g.save(); g.globalCompositeOperation = 'multiply';
  g.filter = 'blur(1.6px)'; g.globalAlpha = 0.35; g.drawImage(t, it.x - W, it.y);
  g.filter = 'none'; g.globalAlpha = 0.95; g.drawImage(t, it.x - W, it.y); g.restore();
  if (it.seal) sealStamp(g, it.x - W + sx, it.y + sealY + it.size * 0.55, it.size * 1.05, it.seal, seed % 2 === 0, seed + 7);
};
const paintScroll = (c: Rouleau3DConfig, img: Record<string, HTMLImageElement>, paper: HTMLImageElement) => {
  const cv = document.createElement('canvas'); cv.width = Math.round(PW * Q); cv.height = Math.round(PH * Q);
  const g = cv.getContext('2d')!; g.scale(Q, Q);
  // papier xuan
  for (let k = 0; k < NSHOT; k++) g.drawImage(paper, k * SH, 0, SH, PH);
  // chaque plan sur sa toile (avec 400 P de débord), fondu sur les bords : un seul paysage continu
  const F = 400, shots = shotsOf(c);
  shots.forEach((shot, k) => {
    const tc = document.createElement('canvas'); tc.width = SH + 2 * F; tc.height = 1080;
    const t = tc.getContext('2d')!;
    for (const p of shot.pieces) {
      if (k !== 1 && k !== 4 && p.depth <= 0.03) continue; // un seul soleil : au départ et à l'arrivée
      const im = img[p.el.file]; if (!im) continue;
      const w = (p.h * p.el.w) / p.el.h;
      t.save(); t.globalAlpha = p.opacity; t.translate(F + p.x, p.y); if (p.flip) t.scale(-1, 1);
      t.drawImage(im, -w / 2, -p.h / 2, w, p.h); t.restore();
    }
    MOODFILL[shot.mood]?.(t, tc.width, tc.height);
    t.globalCompositeOperation = 'destination-in';
    const gr = t.createLinearGradient(0, 0, tc.width, 0);
    const a0 = k === 0 ? 0 : (F - 400) / tc.width, a1 = k === 0 ? 0 : (F + 100) / tc.width;
    gr.addColorStop(0, k === 0 ? '#000' : 'rgba(0,0,0,0)'); gr.addColorStop(a0, k === 0 ? '#000' : 'rgba(0,0,0,0)'); gr.addColorStop(a1, '#000');
    gr.addColorStop((F + SH - 100) / tc.width, '#000'); gr.addColorStop(k === NSHOT - 1 ? 1 : (F + SH + 400) / tc.width, k === NSHOT - 1 ? '#000' : 'rgba(0,0,0,0)');
    t.fillStyle = gr; t.fillRect(0, 0, tc.width, tc.height);
    g.drawImage(tc, k * SH - F, TOP);
  });
  (c.inscriptions ?? INSCRIPTIONS).forEach((it, i) => inscribe(g, it, 40 + i));
  (c.collection ?? COLLECT).forEach((s2, i) => sealStamp(g, s2.x, s2.y, s2.size, s2.text, s2.white, 90 + i));
  // bordures de soie (haut et bas), filets d'encre
  const silk = (y: number, h: number) => { g.fillStyle = 'rgba(214,201,170,0.92)'; g.fillRect(0, y, PW, h); g.fillStyle = 'rgba(120,95,60,0.08)'; for (let x = 0; x < PW; x += 6) g.fillRect(x, y, 2, h); };
  silk(0, TOP); silk(TOP + 1080, PH - TOP - 1080);
  g.fillStyle = 'rgba(90,70,45,0.55)'; g.fillRect(0, TOP - 3, PW, 3); g.fillRect(0, TOP + 1080, PW, 3);
  // frise du temps sur la soie : graduations tous les 50 ans, années tous les 100
  const [y0, y1] = yearsOf(c), xOf = (y: number) => SEAL0 + ((y - y0) / (y1 - y0)) * (SEAL1 - SEAL0);
  const by = TOP + 1080 + 40;
  g.strokeStyle = 'rgba(29,25,21,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, by); g.lineTo(PW, by); g.stroke();
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'top';
  const stepY = 50, first = Math.ceil((y0 - 600) / stepY) * stepY;
  for (let y = first; y <= y1 + 600; y += stepY) {
    const x = xOf(y), big = y % 100 === 0;
    g.fillRect(x - 1.5, by - (big ? 18 : 10), 3, big ? 36 : 20);
    if (big) { g.font = '600 46px ShuimoLatin'; g.fillText(yearFmt(y), x, by + 26); }
  }
  // sceaux d'époque : départ (déjà apposé), arrivée en attente (pointillés), les autres apposés au passage
  drawSealSquare(g, SEAL0, SEAL.y, SEAL.size, periode(c.de).sceau, 0.95);
  drawSealSquare(g, SEAL1, SEAL.y, SEAL.size, periode(c.vers).sceau, 1, true);
  g.font = '600 40px ShuimoLatin'; g.fillStyle = 'rgba(29,25,21,0.85)';
  g.fillText(yearFmt(y0), SEAL0, by + 80 > PH ? by + 26 : TOP + 1080 + 92);
  return cv;
};
const sealCanvas = (zh: string) => { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d')!; drawSealSquare(g, 256, 256, 470, zh, 1); return cv; };
const rollCanvas = (paper: HTMLImageElement) => {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const g = cv.getContext('2d')!;
  g.drawImage(paper, 0, 0, 1024, 512); g.fillStyle = 'rgba(214,201,170,0.5)'; g.fillRect(0, 0, 1024, 512);
  const R0 = rng(77);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(60,48,36,${0.05 + R0() * 0.12})`; g.fillRect(R0() * 1024, 0, 2 + R0() * 10, 512); } // tranches des tours enroulés
  g.fillStyle = 'rgba(90,70,45,0.6)'; g.fillRect(0, 0, 1024, 14); g.fillRect(0, 498, 1024, 14);
  return cv;
};
// plateau en bois de zitan (planches, fil serré, pores) sous un vernis : couleur et relief
const woodCanvas = (bump = false) => {
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 2048; const g = cv.getContext('2d')!;
  const R0 = rng(31);
  g.fillStyle = bump ? '#808080' : '#2a120e'; g.fillRect(0, 0, 2048, 2048);
  for (let pl = 0; pl < 4; pl++) { // quatre planches, teinte un peu différente
    const y0 = pl * 512;
    if (!bump) { g.fillStyle = `rgba(${60 + R0() * 25},${24 + R0() * 10},${16 + R0() * 6},0.35)`; g.fillRect(0, y0, 2048, 512); }
    for (let i = 0; i < 420; i++) {
      const y = y0 + R0() * 512, a = 0.04 + R0() * 0.12, amp = 3 + R0() * 14, f = 0.0015 + R0() * 0.004, ph = R0() * 6;
      g.strokeStyle = bump ? `rgba(0,0,0,${a * 1.5})` : R0() < 0.6 ? `rgba(12,4,3,${a * 1.8})` : `rgba(130,62,38,${a})`;
      g.lineWidth = 0.6 + R0() * 2.2; g.beginPath();
      for (let x = 0; x <= 2048; x += 12) g.lineTo(x, y + amp * Math.sin(x * f + ph) + 0.4 * amp * Math.sin(x * f * 3.1 + ph * 2));
      g.stroke();
    }
    for (let i = 0; i < 900; i++) { // pores
      g.fillStyle = bump ? 'rgba(0,0,0,0.5)' : 'rgba(8,2,2,0.45)';
      g.fillRect(R0() * 2048, y0 + R0() * 512, 4 + R0() * 14, 1 + R0() * 1.2);
    }
    g.fillStyle = bump ? 'rgba(0,0,0,0.9)' : 'rgba(5,1,1,0.85)'; g.fillRect(0, y0, 2048, 3); // joint
  }
  return cv;
};
const feltCanvas = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d')!;
  g.fillStyle = '#25262b'; g.fillRect(0, 0, 512, 512);
  const R0 = rng(5);
  for (let i = 0; i < 9000; i++) { const x = R0() * 512, y = R0() * 512, a = R0() * 6.3, l = 2 + R0() * 6;
    g.strokeStyle = R0() < 0.5 ? 'rgba(70,72,82,0.35)' : 'rgba(10,10,14,0.4)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * Math.cos(a), y + l * Math.sin(a)); g.stroke(); }
  return cv;
};
// pierre de Shoushan couleur miel (tianhuang) : veines, nuages, fines « peaux de radis »
const stoneCanvas = (red = false) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d')!;
  const R0 = rng(red ? 21 : 8);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  if (red) { gr.addColorStop(0, '#a3221b'); gr.addColorStop(0.5, '#8c1712'); gr.addColorStop(1, '#6e100d'); } // pierre « sang de poulet »
  else { gr.addColorStop(0, '#e3ad5e'); gr.addColorStop(0.5, '#cf8f3e'); gr.addColorStop(1, '#b8742c'); }
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) { const x = R0() * 512, y = R0() * 512, r = 20 + R0() * 80, rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, red ? (R0() < 0.55 ? 'rgba(225,60,45,0.28)' : R0() < 0.5 ? 'rgba(60,8,6,0.3)' : 'rgba(205,190,175,0.22)') : R0() < 0.5 ? 'rgba(255,220,150,0.18)' : 'rgba(150,80,25,0.16)');
    rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 14; i++) { g.strokeStyle = red ? `rgba(40,4,4,${0.2 + R0() * 0.35})` : `rgba(120,55,15,${0.15 + R0() * 0.3})`; g.lineWidth = 0.6 + R0() * 1.6; g.beginPath();
    let x = R0() * 512, y = R0() * 512; g.moveTo(x, y);
    for (let k = 0; k < 30; k++) { x += (R0() - 0.3) * 22; y += (R0() - 0.5) * 22; g.lineTo(x, y); } g.stroke(); }
  return cv;
};
const petalCanvas = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(32, 40, 2, 32, 34, 30); gr.addColorStop(0, '#e9a3b3'); gr.addColorStop(0.5, '#f6d4dc'); gr.addColorStop(1, '#fff6f4');
  g.fillStyle = gr; g.beginPath(); g.moveTo(32, 62);
  g.bezierCurveTo(4, 44, 2, 12, 22, 4); g.quadraticCurveTo(32, 12, 42, 4); g.bezierCurveTo(62, 12, 60, 44, 32, 62); g.fill();
  return cv;
};
const tex = (cv: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };

// ── caméra : une seule trajectoire lisse (Catmull-Rom) parcourue à vitesse continue (interpolation monotone du
// temps), sans arrêt aux étapes : verticale → s'élève → rasante, de trois quarts (≈ 20°) → glisse → remonte → plonge
const H0 = 3.375 / (2 * Math.tan((17.5 * Math.PI) / 180)); // hauteur qui cadre exactement un plan (1080 P)
const T = V3(STOP_X, 0, ZS - 0.45); // un peu au-delà du sceau : plus de peinture dans le champ
const XEND = (SEAL1 - SEAL.dx - C1) / UNIT; // centre du plan d'arrivée à la fin
const P3 = T.clone().add(V3(-1.55, 1.3, 3.1)), P4 = V3(XEND, H0, ZC);

type Key = { t: number; p: THREE.Vector3; l: THREE.Vector3 };
// trajectoire lisse (Catmull-Rom) parcourue à vitesse continue : cubique monotone (Fritsch–Carlson), vitesse nulle aux bouts
const path = (KEYS: Key[]) => {
  const PC = new THREE.CatmullRomCurve3(KEYS.map((k) => k.p), false, 'centripetal');
  const LC = new THREE.CatmullRomCurve3(KEYS.map((k) => k.l), false, 'centripetal');
  const x = KEYS.map((k) => k.t), y = KEYS.map((_, i) => i / (KEYS.length - 1)), n = x.length;
  const d = x.slice(0, -1).map((_, i) => (y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  const m = x.map((_, i) => (i === 0 || i === n - 1 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])));
  const tmap = (t: number) => {
    if (t <= x[0]) return 0; if (t >= x[n - 1]) return 1;
    let i = 0; while (t > x[i + 1]) i++;
    const h = x[i + 1] - x[i], u = (t - x[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * y[i + 1] + (u3 - u2) * h * m[i + 1];
  };
  return (s: number) => { const k = tmap(s); return { p: PC.getPoint(k), l: LC.getPoint(k) }; };
};
// complet : verticale (le plan 2D exact) → s'élève → rasante → glisse → impact, tenue → remonte → plonge à la verticale
// (le premier mouvement est resserré : 0,5 s gagnées sur les 1,7 premières secondes, sans à-coup)
const GAIN = 0.5;
const COMPLET: Timing = {
  len: 5.8 - GAIN, lenRef: 5.8, toRef: (u) => (u <= 0 ? u : u + GAIN * sm(u / (1.7 - GAIN))), impact: 4.0, travel: (s) => travelM(s / 5),
  cam: path([
    { t: 0, p: V3(0, H0, ZC), l: V3(0, 0, ZC) },
    { t: 1.0, p: V3(0.1, 6.6, ZC + 2.2), l: V3(0.5, 0, ZC - 0.15) },
    { t: 2.2, p: T.clone().add(V3(-2.1, 1.55, 3.6)), l: T.clone() },
    { t: 3.95, p: P3, l: T.clone().add(V3(0.2, 0, 0)) },
    { t: 4.8, p: P3.clone().lerp(T, 0.12), l: T.clone().add(V3(0.25, 0, 0.1)) }, // tenue sur le sceau
    { t: 5.3, p: P3.clone().lerp(P4, 0.5).add(V3(0, 1.3, 0)), l: T.clone().lerp(V3(XEND, 0, ZC), 0.6) },
    { t: 5.8, p: P4, l: V3(XEND, 0, ZC) },
  ]),
  canvasIn: [-0.35, -0.05], canvasOut: [5.78, 5.98], year: [0.7, 1.3, 4.85, 5.25], petals: [0.35, 1.2, 5.0, 5.5],
  seal: { show: 5.78, appear: 5.78, fly: [5.98, 6.45], fade: [6.42, 6.52] }, tag: [6.05, 6.45], sound: 'rouleau/rouleau3d.wav', stampOff: 4.8,
};
// court : rasante d'emblée (fondu depuis le plan 2D), défilement, impact à 2,3 s, tenue, la caméra s'élève un peu et le plan
// d'arrivée revient en fondu ; le sceau 2D prend le relais et s'envole vers le cartouche
const COURT: Timing = {
  len: 3.6, lenRef: 3.6, toRef: (u) => u, impact: 2.3, travel: (s) => travelM(s / 2.875),
  cam: path([
    { t: 0, p: T.clone().add(V3(-2.7, 1.7, 3.9)), l: T.clone().add(V3(-0.5, 0, 0)) },
    { t: 2.2, p: P3, l: T.clone().add(V3(0.2, 0, 0)) },
    { t: 2.9, p: P3.clone().lerp(T, 0.14), l: T.clone().add(V3(0.25, 0, 0.1)) },
    { t: 3.6, p: P3.clone().lerp(T, 0.2).add(V3(0, 0.9, 0)), l: T.clone().add(V3(0.3, 0, 0.1)) },
  ]),
  canvasIn: [-0.3, 0], canvasOut: [2.95, 3.3], year: [0.05, 0.4, 2.7, 3.0], petals: [0, 0.4, 2.8, 3.2],
  seal: { show: 2.95, appear: 3.15, fly: [3.15, 3.55], fade: [3.5, 3.6] }, tag: [3.2, 3.55], sound: 'rouleau/rouleau3d_court.wav', stampOff: 3.1,
};
const V = (c: Rouleau3DConfig) => (c.variant === 'court' ? COURT : COMPLET);
// pose de la caméra à l'instant s (trajectoire + légère avancée à l'impact, aucune vibration) ; partagée par la scène 3D
// et par le calcul de la place du sceau à l'écran (relais par le sceau 2D)
const poseAt = (v: Timing, s: number) => {
  const { p, l } = v.cam(s);
  const di = s - v.impact, push = di < 0 ? 0 : 0.07 * Math.min(1, di / 0.05) * Math.exp(-Math.max(0, di - 0.05) * 4.5);
  p.lerp(l, push);
  const dir = l.clone().sub(p).normalize(), top = sm((-dir.y - 0.82) / 0.17);
  return { p, l, up: V3(0, 1 - top, -top).normalize(), top };
};
const sealOnScreen = (v: Timing, s: number) => {
  const cam = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 100), { p, l, up } = poseAt(v, s);
  cam.up.copy(up); cam.position.copy(p); cam.lookAt(l); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const x = (SEAL1 - lerp(C0, C1, v.travel(s))) / UNIT, h = SEAL.size / UNIT / 2;
  const pr = (q: THREE.Vector3) => { const r = q.project(cam); return [(r.x + 1) * 960, (1 - r.y) * 540]; };
  const c = pr(V3(x, 0, ZS)), a = pr(V3(x - h, 0, ZS)), b = pr(V3(x + h, 0, ZS)), u = pr(V3(x, 0, ZS - h)), d = pr(V3(x, 0, ZS + h));
  const size = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { x: c[0], y: c[1], size, angle: Math.atan2(b[1] - a[1], b[0] - a[0]), squash: Math.hypot(d[0] - u[0], d[1] - u[1]) / size };
};

type Assets = { scroll: THREE.CanvasTexture; seal: THREE.CanvasTexture; roll: THREE.CanvasTexture; wood: THREE.CanvasTexture; woodBump: THREE.CanvasTexture; felt: THREE.CanvasTexture; stone: THREE.CanvasTexture; petal: THREE.CanvasTexture };
const NP = 120, ND = 240;
const Scene: React.FC<{ s: number; A: Assets; v: Timing; red: boolean }> = ({ s, A, v, red }) => {
  const { camera, gl } = useThree();
  const petals = useRef<THREE.InstancedMesh>(null), dust = useRef<THREE.Points>(null);
  const seeds = useMemo(() => { const r = rng(11); return Array.from({ length: Math.max(NP, ND) }, () => [r(), r(), r(), r(), r(), r()]); }, []);
  const dustPos = useMemo(() => new Float32Array(ND * 3), []);
  const G = useMemo(() => {
    const an = gl.capabilities.getMaxAnisotropy();
    A.scroll.anisotropy = an;
    for (const t of [A.wood, A.woodBump]) { t.anisotropy = an; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.5, 2.5); }
    A.woodBump.colorSpace = THREE.NoColorSpace;
    A.felt.wrapS = A.felt.wrapT = THREE.RepeatWrapping; A.felt.repeat.set(6, 2.5);
    // pommeau sculpté du sceau (profil tourné) et cordon de soie
    const knob = new THREE.LatheGeometry([[0.2, 0], [0.205, 0.015], [0.17, 0.035], [0.12, 0.06], [0.11, 0.08], [0.14, 0.12], [0.155, 0.17], [0.14, 0.22], [0.1, 0.26], [0.05, 0.285], [0.015, 0.295], [0, 0.297]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
    const cord = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-0.02, 0.43, 0), V3(0.12, 0.47, 0.05), V3(0.25, 0.36, 0.12), V3(0.28, 0.18, 0.15), V3(0.29, 0.02, 0.16)]), 40, 0.014, 8);
    const box = new RoundedBoxGeometry(0.46, 0.56, 0.46, 4, 0.035);
    return { knob, cord, box };
  }, [A, gl]);

  const IMPACT = v.impact;
  const c = lerp(C0, C1, v.travel(s)), travel = (c - C0) / UNIT;
  A.scroll.repeat.set((VIS * UNIT) / PW, 1); A.scroll.offset.set((c - (VIS * UNIT) / 2) / PW, 0);
  const sealX = (SEAL1 - c) / UNIT;
  const { p, l, up: camUp, top } = poseAt(v, s), di = s - IMPACT;
  camera.up.copy(camUp); camera.position.copy(p); camera.lookAt(l);

  // sceau de jade : descend (accéléré), frappe, remonte
  const down = seg(s, IMPACT - 0.5, IMPACT), up = seg(s, IMPACT + 0.3, IMPACT + 0.75);
  // appui : la pierre s'écrase d'un rien à l'impact puis reprend sa forme
  const squash = di >= 0 && di < 0.12 ? 0.035 * Math.sin((Math.PI * di) / 0.12) : 0;
  const sy = 0.28 + 0.006 - squash * 0.28 + 2.8 * Math.pow(1 - down, 3) + 4.5 * up * up;
  const sRot = 0.5 * Math.pow(1 - down, 3) - 0.3 * up * up, sTilt = 0.12 * Math.pow(1 - down, 2) + 0.08 * up;
  const sway = 0.35 * Math.pow(1 - down, 1.5) * Math.sin(s * 9) + (s > IMPACT ? 0.25 * Math.exp(-(s - IMPACT) * 5) * Math.sin((s - IMPACT) * 14) : 0);
  const stamped = s >= IMPACT, ink = stamped ? 1 - 0.2 * Math.exp(-(s - IMPACT) * 8) : 0;
  const glow = stamped ? Math.exp(-(s - IMPACT) * 3) : 0;
  const sealFade = 1; // relayé par le sceau 2D (même place) dès que la caméra est arrivée

  // pétales : soufflés dans le sens du défilement, rafale quand le rouleau file
  const wind = -travel * 0.55 - 0.35 * s, M = new THREE.Matrix4(), Qt = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3();
  const pa = seg(s, v.petals[0], v.petals[1]) * (1 - seg(s, v.petals[2], v.petals[3]));
  const place = (m: THREE.InstancedMesh | null) => {
    if (!m) return;
    for (let i = 0; i < NP; i++) {
      const [a, b, cc, d, e, f] = seeds[i];
      const span = 18, x = ((((a * span + wind * (0.7 + 0.6 * d)) % span) + span) % span) - 7;
      const y = 0.06 + ((((b * 2.6 - 0.18 * s) % 2.6) + 2.6) % 2.6) + 0.1 * Math.sin(1.3 * s + e * 6);
      const z = -3 + cc * 6.5 + 0.25 * Math.sin(0.9 * s + f * 6);
      E.set(s * (1.5 + d) + e * 6, s * (2.1 + e) + f * 6, s * (0.9 + f)); Qt.setFromEuler(E);
      const k = pa * (0.75 + 0.5 * f); S.set(k, k, k);
      M.compose(V3(x, y, z), Qt, S); m.setMatrixAt(i, M);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  place(petals.current);
  useLayoutEffect(() => place(petals.current));
  {
    for (let i = 0; i < ND; i++) {
      const [a, b, cc, d] = seeds[i];
      dustPos[i * 3] = ((((a * 16 + wind * 0.25 * (0.5 + d)) % 16) + 16) % 16) - 6;
      dustPos[i * 3 + 1] = 0.1 + b * 2.4 + 0.05 * Math.sin(s * 0.8 + d * 9);
      dustPos[i * 3 + 2] = -2.6 + cc * 6;
    }
    if (dust.current) dust.current.geometry.attributes.position.needsUpdate = true;
  }
  const rot = -travel / R;
  return (
    <>
      <color attach="background" args={['#120b08']} />
      <fog attach="fog" args={['#120b08', 8, 19]} />
      {/* lumière : plate à la verticale (le plan 2D exact), puis lumière de studio en vue rasante : un pinceau chaud
          sur le rouleau, la table qui s'enfonce dans l'ombre */}
      <ambientLight intensity={lerp(0.5, 1.75, top)} color="#ffffff" />
      <hemisphereLight args={['#fff1dc', '#2a1408', lerp(0.35, 0, top)]} />
      <directionalLight position={[-7, 6.5, 5]} intensity={lerp(1.15, 2.1, top)} color="#ffe9cf" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-radius={6} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-near={1} shadow-camera-far={30} />
      <spotLight position={[-1.5, 9, 3.5]} angle={0.62} penumbra={0.95} decay={0} intensity={lerp(2.4, 0, top)} color="#ffdcae" />
      <directionalLight position={[6, 2.5, -7]} intensity={lerp(0.9, 0.15, top)} color="#d9c2a0" />
      {/* plateau en zitan verni */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} receiveShadow>
        <planeGeometry args={[60, 34]} />
        <meshPhysicalMaterial map={A.wood} bumpMap={A.woodBump} bumpScale={0.6} roughness={0.55} clearcoat={1} clearcoatRoughness={0.14} />
      </mesh>
      {/* feutre de calligraphe sous le rouleau */}
      <mesh position={[0, -0.002, 0]} receiveShadow>
        <boxGeometry args={[VIS + 1.8, 0.004, 4.9]} />
        <meshStandardMaterial map={A.felt} roughness={1} />
      </mesh>
      {/* le rouleau déroulé */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <planeGeometry args={[VIS, 4]} />
        <meshStandardMaterial map={A.scroll} roughness={0.92} />
      </mesh>
      {/* parties enroulées et bâtons */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * (VIS / 2), R, 0]} rotation={[0, 0, rot]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[R, R, 4.02, 48]} />
            <meshStandardMaterial map={A.roll} roughness={0.85} />
          </mesh>
          {[-1, 1].map((e) => (
            <mesh key={e} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, e * 2.17]} castShadow>
              <cylinderGeometry args={[0.11, 0.13, 0.32, 24]} />
              <meshStandardMaterial color="#2c4a3c" roughness={0.25} metalness={0.1} />
            </mesh>
          ))}
        </group>
      ))}
      {/* le sceau apposé */}
      {stamped && sealX > -VIS / 2 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[sealX, 0.007, ZS]} scale={1 + 0.06 * (1 - ink)}>
          <planeGeometry args={[SEAL.size / UNIT, SEAL.size / UNIT]} />
          <meshStandardMaterial map={A.seal} transparent opacity={ink * sealFade} roughness={0.7} emissive="#ff5a3a" emissiveIntensity={0.9 * glow} emissiveMap={A.seal} />
        </mesh>
      )}
      {/* le sceau : pierre de Shoushan couleur miel, pommeau tourné, cordon et gland de soie rouge */}
      {s > IMPACT - 0.55 && s < v.stampOff && (
        <group position={[sealX, sy, ZS]} rotation={[sTilt, sRot, 0.6 * sTilt]} scale={[1 + squash * 0.5, 1 - squash, 1 + squash * 0.5]}>
          <mesh geometry={G.box} castShadow><meshPhysicalMaterial map={A.stone} roughness={0.3} clearcoat={1} clearcoatRoughness={0.06} emissive={red ? "#5a0606" : "#6a3208"} emissiveIntensity={red ? 0.18 : 0.12} /></mesh>
          <mesh geometry={G.knob} position={[0, 0.28, 0]} castShadow><meshPhysicalMaterial map={A.stone} roughness={0.3} clearcoat={1} clearcoatRoughness={0.06} emissive={red ? "#5a0606" : "#6a3208"} emissiveIntensity={red ? 0.18 : 0.12} /></mesh>
          <mesh position={[0, -0.279, 0]}><boxGeometry args={[0.43, 0.004, 0.43]} /><meshStandardMaterial color="#a8241c" roughness={0.75} /></mesh>
          <group position={[0, 0.43, 0]} rotation={[0, 0, sway]}>
            <group position={[0, -0.43, 0]}>
              <mesh geometry={G.cord} castShadow><meshPhysicalMaterial color="#9a1714" roughness={0.55} sheen={1} sheenColor="#ff7a6a" /></mesh>
              <mesh position={[0.29, 0.02, 0.16]}><sphereGeometry args={[0.034, 16, 12]} /><meshPhysicalMaterial color="#8c1310" roughness={0.5} sheen={1} sheenColor="#ff7a6a" /></mesh>
              <mesh position={[0.29, -0.1, 0.16]} castShadow><cylinderGeometry args={[0.022, 0.05, 0.22, 20, 1, true]} /><meshPhysicalMaterial color="#9a1714" roughness={0.6} sheen={1} sheenColor="#ff8a7a" side={THREE.DoubleSide} /></mesh>
            </group>
          </group>
        </group>
      )}
      <instancedMesh ref={petals} args={[undefined, undefined, NP]} frustumCulled={false}>
        <planeGeometry args={[0.1, 0.075]} />
        <meshStandardMaterial map={A.petal} transparent alphaTest={0.25} side={THREE.DoubleSide} roughness={0.7} />
      </instancedMesh>
      <points ref={dust} frustumCulled={false}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[dustPos, 3]} /></bufferGeometry>
        <pointsMaterial size={0.02} color="#ffe2b0" transparent opacity={0.5 * pa} depthWrite={false} />
      </points>
    </>
  );
};

// ── compteur d'années : capitales romaines (Cinzel) dorées, chiffres à chasse fixe, filets et losanges d'or,
// période traversée au-dessus (caractères + nom), petite frise de progression ; voile sombre pour la lisibilité ──
const GOLD = 'linear-gradient(180deg, #fff4d6 0%, #f0d595 38%, #c99a4b 72%, #a8772f 100%)';
const goldText: React.CSSProperties = { backgroundImage: GOLD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' };
const Rule: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: flip ? 'row-reverse' : 'row' }}>
    <div style={{ width: 150, height: 1.5, background: `linear-gradient(${flip ? 270 : 90}deg, rgba(232,200,130,0) 0%, rgba(232,200,130,0.95) 100%)` }} />
    <div style={{ width: 9, height: 9, transform: 'rotate(45deg)', background: '#e8c882', boxShadow: '0 0 8px rgba(240,200,120,0.7)' }} />
  </div>
);
const YearPlate: React.FC<{ cfg: Rouleau3DConfig; year: number; a: number }> = ({ cfg, year, a }) => {
  if (a <= 0) return null;
  const [y0, y1] = yearsOf(cfg), k = clamp((year - y0) / (y1 - y0));
  // périodes traversées, avec les mêmes noms que les cartouches (src/periodes.ts)
  const per = periodesEntre(y0, y1, cfg.de).map((p) => ({ from: p.debut, zh: p.zh, name: p.nom }));
  let pi = 0; per.forEach((p, i) => { if (year >= p.from) pi = i; });
  const P = per[pi], next = per[pi + 1];
  // fondu du nom de période autour de chaque changement (le premier est affiché d'emblée)
  const pa = P ? Math.min(pi === 0 ? 1 : clamp((year - P.from) / 25), next ? clamp((next.from - year) / 25) : 1) : 0;
  const digits = yearFmt(year).split('');
  return (
    <AbsoluteFill style={{ opacity: a, pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(14,8,5,0) 58%, rgba(14,8,5,0.42) 78%, rgba(14,8,5,0.7) 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 772, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ height: 46, display: 'flex', alignItems: 'baseline', gap: 18, opacity: pa }}>
          {P && <span style={{ fontFamily: 'ShuimoKai', fontSize: 40, ...goldText }}>{P.zh}</span>}
          {P && <span style={{ fontFamily: 'ShuimoCaps', fontWeight: 500, fontSize: 24, letterSpacing: '0.32em', color: 'rgba(246,236,214,0.92)' }}>{P.name}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 4 }}>
          <Rule />
          <div style={{ display: 'flex', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.55))' }}>
            {digits.map((d, i) => (
              <span key={i} style={{ fontFamily: 'ShuimoCaps', fontWeight: 700, fontSize: 118, lineHeight: 1, width: d === '−' ? 62 : 82, textAlign: 'center', ...goldText }}>{d}</span>
            ))}
          </div>
          <Rule flip />
        </div>
        <div style={{ fontFamily: 'ShuimoCaps', fontWeight: 500, fontSize: 22, letterSpacing: '0.42em', color: 'rgba(246,236,214,0.85)', marginTop: 8 }}>{year < 0 ? 'AV. J.-C.' : 'APR. J.-C.'}</div>
        {/* frise de progression : départ, périodes, arrivée */}
        <div style={{ position: 'relative', width: 560, height: 14, marginTop: 14 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 6, height: 1, background: 'rgba(232,200,130,0.45)' }} />
          <div style={{ position: 'absolute', left: 0, width: `${k * 100}%`, top: 5.5, height: 2, background: 'linear-gradient(90deg, rgba(232,200,130,0.3), #f0d595)' }} />
          {per.map((p, i) => { const x = clamp((p.from - y0) / (y1 - y0)); return <div key={i} style={{ position: 'absolute', left: `${x * 100}%`, top: 2, width: 1.5, height: 10, background: 'rgba(232,200,130,0.8)' }} />; })}
          <div style={{ position: 'absolute', left: `calc(${k * 100}% - 5px)`, top: 1.5, width: 11, height: 11, borderRadius: 6, background: '#fff1cc', boxShadow: '0 0 10px 3px rgba(245,205,120,0.8)' }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── la scène complète : 3D, compteur d'années, sceau volant, son ──
export const Rouleau3DStage: React.FC<{ cfg: Rouleau3DConfig }> = ({ cfg }) => {
  const { fps, width, height } = useVideoConfig();
  const t = useCurrentFrame() / fps, s = tRef(cfg, t), v = V(cfg);
  const [A, setA] = useState<Assets | null>(null);
  const [h] = useState(() => delayRender('rouleau 3D'));
  useEffect(() => {
    const files = [...new Set(shotsOf(cfg).flatMap((sh) => sh.pieces.map((p) => p.el.file)))];
    const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
    Promise.all([
      document.fonts.ready,
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load().then((f) => document.fonts.add(f)),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load().then((f) => document.fonts.add(f)),
      new FontFace('ShuimoCaps', `url(${staticFile('fonts/Cinzel.ttf')})`, { weight: '400 900' }).load().then((f) => document.fonts.add(f)),
      new FontFace('ShuimoCao', `url(${staticFile('fonts/LiuJianMaoCao-Regular.ttf')})`).load().then((f) => document.fonts.add(f)),
      new FontFace('ShuimoSceau', `url(${staticFile('fonts/ChongxiSeal-sceaux.otf')})`).load().then((f) => document.fonts.add(f)),
    ]).then(() => Promise.all([load(staticFile('shuimo/paper.jpg')), ...files.map((f) => load(staticFile(`shuimo/elements/${f}`)))]))
      .then(([paper, ...ims]) => {
        const img: Record<string, HTMLImageElement> = {}; files.forEach((f, i) => (img[f] = ims[i]));
        setA({ scroll: tex(paintScroll(cfg, img, paper)), seal: tex(sealCanvas(periode(cfg.vers).sceau)), roll: tex(rollCanvas(paper)), wood: tex(woodCanvas()), woodBump: tex(woodCanvas(true)), felt: tex(feltCanvas()), stone: tex(stoneCanvas(cfg.stone === 'rouge')), petal: tex(petalCanvas()) });
        continueRender(h);
      });
  }, [cfg, h]);
  const sealUrl = useMemo(() => (A ? (A.seal.image as HTMLCanvasElement).toDataURL() : ''), [A]);
  // le son reste monté du début à la fin de la cloche, même quand l'image du rouleau a disparu
  const sound = <Sequence from={Math.round(cfg.at * fps)} durationInFrames={Math.round((v.len + 2.5) * fps)} layout="none"><Audio src={staticFile(v.sound)} volume={0.8} playbackRate={v.len / dur(cfg)} /></Sequence>;
  if (!A || s < -0.4 || s > v.seal.fade[1] + 0.1) return sound;
  const year = lerp(yearsOf(cfg)[0], yearsOf(cfg)[1], v.travel(s));
  const ya = sm(seg(s, v.year[0], v.year[1])) * (1 - sm(seg(s, v.year[2], v.year[3])));
  // sceau volant : de sa place dans le plan d'arrivée (vue verticale) au cartouche
  const fk = eio(seg(s, v.seal.fly[0], v.seal.fly[1])), s0 = sealOnScreen(v, Math.min(s, v.seal.fly[0]));
  const fx = lerp(s0.x, 156, fk), fy = lerp(s0.y, 136, fk), fsz = lerp(s0.size, 92, fk), fa = lerp(s0.angle, 0, fk), fq = lerp(s0.squash, 1, fk);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: seg(s, v.canvasIn[0], v.canvasIn[1]) * (1 - seg(s, v.canvasOut[0], v.canvasOut[1])) }}>
        <ThreeCanvas width={width} height={height} shadows flat gl={{ antialias: true }} camera={{ fov: 35, position: [0, H0, ZC], near: 0.05, far: 100 }}>
          <Scene s={Math.max(0, Math.min(v.lenRef, s))} A={A} v={v} red={cfg.stone === 'rouge'} />
        </ThreeCanvas>
      </AbsoluteFill>
      <YearPlate cfg={cfg} year={year} a={ya} />
      {s >= v.seal.show && s < v.seal.fade[1] + 0.03 && (
        <img src={sealUrl} style={{ position: 'absolute', left: fx - fsz / 2, top: fy - fsz / 2, width: fsz, height: fsz, transform: `rotate(${fa}rad) scaleY(${fq})`, opacity: seg(s, v.seal.show - 0.001, v.seal.appear) * (1 - seg(s, v.seal.fade[0], v.seal.fade[1])), filter: `drop-shadow(0 ${10 * Math.sin(Math.PI * fk)}px ${16 * Math.sin(Math.PI * fk)}px rgba(60,20,10,0.35))` }} />
      )}
      {sound}
    </AbsoluteFill>
  );
};
