// Livre de lattes de bambou en 3D (série 墨之道, outil réutilisable) : un rouleau de lattes liées par trois cordons se déroule en
// plan 3/4 dans un espace vide (papier, lointains en lavis, brume), la caméra passe au-dessus et se resserre. Sans `texte`, les lattes
// sont vides. Avec `texte` : un texte suivi écrit en colonnes qui laissent un blanc au passage des cordons (vedettes un peu plus
// grandes), en petit sceau (崇羲篆體) ; `citee` : rangs d'un passage de la latte centrale, surligné à partir de `ecrit` s (avec les
// autres lattes qui s'assombrissent), sa dernière vedette passe au vermillon à `hlAt`.
//
//   <Sequence from={t0 * fps} durationInFrames={…}><LattesBambou3D texte={{ entrees: [...], citee: [1, 8] }} ecrit={3.6} hlAt={s} /></Sequence>
// Exemple : épisode 語 (shuimo_yu/YuLattes.tsx, le chapitre 言 du Shuowen).
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { rng } from '../shuimo/common';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const eio = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ── géométrie du livre (unités du rouleau 3D)
const N = 56, SW = 0.16, SL = 3.0, TH = 0.035, GAP = 0.008, PITCH = SW + GAP, LTOT = N * PITCH, RC = 0.28;
const U_END = LTOT - 0.55; // longueur déroulée à la fin (un petit rouleau reste à droite)
const CORD_Z = [-1.15, 0, 1.15];

const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tx = (cv: HTMLCanvasElement, srgb = true) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const rgbS = (c: number[], k = 1, a = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;

// ── latte de bambou polie : miel pâle, fil long et fin, pores, deux nœuds, patine, bords creusés ; carte de relief assortie
const bambooCanvases = (seed: number) => {
  const W = 256, H = 1536, R = rng(seed), tone = R();
  const col = mk(W, H), g = col.getContext('2d')!, bu = mk(W, H), b = bu.getContext('2d')!;
  const base = [lerp(208, 238, tone), lerp(160, 202, tone), lerp(88, 130, tone)];
  const hz = g.createLinearGradient(0, 0, W, 0);
  hz.addColorStop(0, rgbS(base, 0.7)); hz.addColorStop(0.07, rgbS(base, 0.98)); hz.addColorStop(0.5, rgbS(base, 1.08)); hz.addColorStop(0.93, rgbS(base, 0.98)); hz.addColorStop(1, rgbS(base, 0.68));
  g.fillStyle = hz; g.fillRect(0, 0, W, H);
  b.fillStyle = '#808080'; b.fillRect(0, 0, W, H);
  // patine : bouts plus sombres (mains, fumée), taches douces
  const vg = g.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(110,70,26,0.22)'); vg.addColorStop(0.18, 'rgba(110,70,26,0)'); vg.addColorStop(0.82, 'rgba(110,70,26,0)'); vg.addColorStop(1, 'rgba(110,70,26,0.26)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { const x = R() * W, y = R() * H, r = 50 + R() * 120, gg = g.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, `rgba(120,76,30,${0.05 + R() * 0.07})`); gg.addColorStop(1, 'rgba(120,76,30,0)'); g.fillStyle = gg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  // fibres longues, légèrement sinueuses
  for (let i = 0; i < 1100; i++) {
    const x = R() * W, y0 = R() * H, len = 260 + R() * 1100, dark = R() < 0.58, a = 0.03 + R() * 0.15, w = 0.5 + R() * (dark ? 1.9 : 1.2), dx = (R() - 0.5) * 7;
    g.strokeStyle = dark ? `rgba(104,68,26,${a})` : `rgba(255,240,196,${a * 1.1})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + dx, y0 + len / 2, x + dx * 0.4, y0 + len); g.stroke();
    b.strokeStyle = dark ? `rgba(40,40,40,${a * 1.4})` : `rgba(215,215,215,${a * 1.2})`; b.lineWidth = w;
    b.beginPath(); b.moveTo(x, y0); b.quadraticCurveTo(x + dx, y0 + len / 2, x + dx * 0.4, y0 + len); b.stroke();
  }
  // pores : petits traits verticaux sombres
  for (let i = 0; i < 2600; i++) { const x = R() * W, y = R() * H, l = 3 + R() * 9; g.strokeStyle = `rgba(86,54,20,${0.08 + R() * 0.2})`; g.lineWidth = 0.7 + R() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5), y + l); g.stroke(); }
  // nœuds : anneau un peu surélevé, plus sombre, avec reflet dessous
  for (const ny of [H * (0.17 + 0.12 * R()), H * (0.6 + 0.16 * R())]) {
    const nh = 12 + R() * 8;
    const ng = g.createLinearGradient(0, ny - nh, 0, ny + nh * 1.8);
    ng.addColorStop(0, 'rgba(110,72,28,0)'); ng.addColorStop(0.3, 'rgba(110,72,28,0.5)'); ng.addColorStop(0.55, 'rgba(255,238,190,0.28)'); ng.addColorStop(1, 'rgba(110,72,28,0)');
    g.fillStyle = ng; g.fillRect(0, ny - nh, W, nh * 2.8);
    const nb = b.createLinearGradient(0, ny - nh, 0, ny + nh * 1.8);
    nb.addColorStop(0, 'rgba(128,128,128,0)'); nb.addColorStop(0.35, 'rgba(235,235,235,0.9)'); nb.addColorStop(0.7, 'rgba(60,60,60,0.7)'); nb.addColorStop(1, 'rgba(128,128,128,0)');
    b.fillStyle = nb; b.fillRect(0, ny - nh, W, nh * 2.8);
  }
  // rives creusées
  for (const [x0, x1] of [[0, 9], [W - 9, W]]) { const eg = g.createLinearGradient(x0, 0, x1, 0); eg.addColorStop(0, x0 === 0 ? 'rgba(60,36,12,0.55)' : 'rgba(60,36,12,0)'); eg.addColorStop(1, x0 === 0 ? 'rgba(60,36,12,0)' : 'rgba(60,36,12,0.55)'); g.fillStyle = eg; g.fillRect(x0, 0, x1 - x0, H); }
  return { col, bu };
};

// ── cordon de chanvre : brins torsadés en diagonale, poils
const cordCanvas = () => {
  const cv = mk(256, 64), g = cv.getContext('2d')!, R = rng(77);
  g.fillStyle = '#9b7c4e'; g.fillRect(0, 0, 256, 64);
  for (let x = -64; x < 256; x += 11) { g.strokeStyle = 'rgba(60,40,14,0.55)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 64); g.stroke(); g.strokeStyle = 'rgba(224,196,140,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 5, 0); g.lineTo(x + 45, 64); g.stroke(); }
  for (let i = 0; i < 700; i++) { const x = R() * 256, y = R() * 64; g.strokeStyle = R() < 0.5 ? 'rgba(70,48,20,0.3)' : 'rgba(230,206,150,0.3)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 8, y + (R() - 0.5) * 8); g.stroke(); }
  const sh = g.createLinearGradient(0, 0, 0, 64); sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.4)'); g.fillStyle = sh; g.fillRect(0, 0, 256, 64);
  return cv;
};

// ── table en zitan : planches de teintes voisines, fil long, pores, reflets de vernis ; relief assorti
const tableCanvases = () => {
  const S = 2048, R = rng(5), col = mk(S, S), g = col.getContext('2d')!, bu = mk(S, S), b = bu.getContext('2d')!;
  g.fillStyle = '#4a2415'; g.fillRect(0, 0, S, S); b.fillStyle = '#808080'; b.fillRect(0, 0, S, S);
  for (let pl = 0; pl < 5; pl++) {
    const y0 = pl * (S / 5), h = S / 5;
    g.fillStyle = `rgba(${86 + R() * 40},${38 + R() * 16},${22 + R() * 10},0.5)`; g.fillRect(0, y0, S, h);
    for (let i = 0; i < 520; i++) {
      const y = y0 + R() * h, a = 0.04 + R() * 0.16, amp = 3 + R() * 16, f = 0.001 + R() * 0.004, ph = R() * 6, dark = R() < 0.6;
      g.strokeStyle = dark ? `rgba(20,7,4,${a * 1.7})` : `rgba(170,92,56,${a})`; g.lineWidth = 0.6 + R() * 2.4; g.beginPath();
      b.strokeStyle = dark ? `rgba(30,30,30,${a * 1.5})` : `rgba(210,210,210,${a})`; b.lineWidth = g.lineWidth; b.beginPath();
      for (let x = 0; x <= S; x += 14) { const yy = y + amp * Math.sin(x * f + ph) + 0.4 * amp * Math.sin(x * f * 3.1 + ph * 2); g.lineTo(x, yy); b.lineTo(x, yy); }
      g.stroke(); b.stroke();
    }
    for (let i = 0; i < 1400; i++) { const x = R() * S, y = y0 + R() * h; g.fillStyle = `rgba(10,3,2,${0.12 + R() * 0.25})`; g.fillRect(x, y, 4 + R() * 12, 1.2); }
    g.fillStyle = 'rgba(8,3,2,0.7)'; g.fillRect(0, y0, S, 3); // joint entre planches
    b.fillStyle = 'rgba(20,20,20,0.9)'; b.fillRect(0, y0, S, 4);
  }
  return { col, bu };
};

// ── chemin de table : feutre indigo tissé, fil d'or sur le bord
const runnerCanvas = () => {
  const cv = mk(512, 512), g = cv.getContext('2d')!, R = rng(9);
  g.fillStyle = '#1d2740'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 512; i += 3) { g.fillStyle = 'rgba(120,140,190,0.06)'; g.fillRect(i, 0, 1, 512); g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, i, 512, 1); }
  for (let i = 0; i < 6000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(160,180,230,0.07)' : 'rgba(0,0,10,0.18)'; g.fillRect(R() * 512, R() * 512, 1.5, 1.5); }
  return cv;
};
const sprite = () => {
  const cv = mk(128, 128), g = cv.getContext('2d')!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.85, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return cv;
};
// fenêtre à croisillons de papier, lueur chaude, floue (fond de pièce)
const windowCanvas = () => {
  const cv = mk(1024, 512), g = cv.getContext('2d')!;
  g.fillStyle = '#05030' + '2'; g.fillRect(0, 0, 1024, 512);
  g.filter = 'blur(5px)';
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
    const x = 70 + i * 152, y = 50 + j * 140, gr = g.createLinearGradient(0, y, 0, y + 124);
    gr.addColorStop(0, '#ffd592'); gr.addColorStop(1, '#f0a85a'); g.fillStyle = gr; g.fillRect(x, y, 134, 124);
  }
  return cv;
};

// ── texte (facultatif) : un texte suivi écrit en colonnes sur les lattes. Le scribe laisse un blanc au passage des trois
// cordons (les caractères ne passent jamais dessous). Les vedettes (premier caractère de chaque entrée) sont un peu plus grandes.
// Une latte centrale (CI) peut porter un passage cité, surligné (rangs `citee`).
export type LattesTexte = { entrees: string[]; citee?: [number, number] };
const CI = 31; // latte centrale (au centre de l'image à la fin du déroulé)
const TW_PX = 128, TH_PX = 2400, CPITCH = 132, CBOX = 124; // canevas d'une latte écrite (3,0 unités = 2400 px), pas et hauteur d'un caractère
const ROWS = (() => {
  const k = TH_PX / SL, cords = CORD_Z.map((z) => (z + SL / 2) * k), r: number[] = [];
  let y = 26;
  while (y + CBOX < TH_PX - 16) {
    if (cords.some((c) => y + CBOX > c - 44 && y < c + 44)) { y += 6; continue; }
    r.push(y); y += CPITCH;
  }
  return r;
})();
const PER = ROWS.length; // caractères par latte
const makeText = (entrees: string[]) => {
  const stream = entrees.join(''), L = [...stream].length, chars = [...stream];
  const heads = new Set<number>(); let k = 0; for (const e of entrees) { heads.add(k); k += [...e].length; }
  const start = (i: number) => ((((CI - i) * PER) % L) + L) % L; // lecture de droite à gauche : la latte CI ouvre le texte
  return { text: (i: number) => Array.from({ length: PER }, (_, q) => chars[(start(i) + q) % L]).join(''), head: (i: number, q: number) => heads.has((start(i) + q) % L) };
};

// encre ancienne : traits un peu irréguliers, alpha variable, léger bavage ; caractère i de la latte
const inkSlip = (text: string, seed: number, head: (j: number) => boolean, ink: [number, number, number] = [54, 38, 24], aMin = 0.62) => {
  const cv = mk(TW_PX, TH_PX), g = cv.getContext('2d')!, R = rng(seed);
  g.textAlign = 'center'; g.textBaseline = 'top';
  [...text].forEach((ch, i) => {
    g.save();
    g.translate(TW_PX / 2 + (R() - 0.5) * 3, ROWS[i] + (R() - 0.5) * 3); g.rotate((R() - 0.5) * 0.04);
    g.font = head(i) ? '124px ShuimoSeal, serif' : '114px ShuimoSeal, serif';
    g.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${head(i) ? 0.95 : aMin + R() * (0.92 - aMin)})`;
    g.shadowColor = `rgba(${ink[0]},${ink[1]},${ink[2]},0.35)`; g.shadowBlur = 2.2;
    g.fillText(ch, 0, 0);
    g.restore();
  });
  return cv;
};

// texte : facultatif (sans texte, les lattes restent vides) ; ecrit : début de la surbrillance du passage cité ; hlAt : la dernière
// vedette citée passe au vermillon
type Props = { texte?: LattesTexte; hlAt?: number; ecrit?: number };

// position et inclinaison de la latte i quand `U` est déroulé : à plat sur la table, ou sur la spirale du rouleau
const place = (i: number, U: number) => {
  const s = (i + 0.5) * PITCH;
  if (s <= U) return { x: s, y: TH / 2, rz: 0 };
  const rem = LTOT - U, Rout = Math.sqrt(RC * RC + (TH * rem) / Math.PI), m = s - U;
  // spirale r(β) = Rout − TH β / 2π : abscisse curviligne m = Rout β − TH β² / 4π
  const a = TH / (4 * Math.PI), b = Rout; // a β² − b β + m = 0
  const beta = (b - Math.sqrt(Math.max(0, b * b - 4 * a * m))) / (2 * a);
  const r = Rout - (TH * beta) / (2 * Math.PI) - TH / 2;
  return { x: U + r * Math.sin(beta), y: Rout - r * Math.cos(beta), rz: beta };
};

const NB = 26, ND = 90;
// paysage en lavis et brume autour du livre (banque d'éléments du fond shuimo) : lointains et massifs debout au fond, nappes de
// brume qui passent devant et derrière, et brume rasante sur le papier (visible en vue de dessus, sur les bords)
const ELEMS = ['lointain_a1', 'lointain_a4', 'lointain_b3', 'lointain_b7', 'massif_a1', 'massif_b2', 'massif_c1', 'brume_a1', 'brume_a3', 'brume_b2', 'brume_c4', 'brume_c6'];
const IMGS: Record<string, HTMLImageElement> = {};
type Layer = { f: string; x: number; y: number; z: number; w: number; a: number; v?: number; flat?: boolean };
const LAYERS: Layer[] = [
  // lointains (très pâles, loin)
  { f: 'lointain_b7', x: -4, y: 0, z: -18, w: 16, a: 0.45 }, { f: 'lointain_a1', x: 9, y: 0, z: -19, w: 17, a: 0.4 }, { f: 'lointain_b3', x: 20, y: 0, z: -18, w: 15, a: 0.4 },
  { f: 'lointain_a4', x: 3, y: 0, z: -16, w: 12, a: 0.35 },
  // massifs (plus proches)
  { f: 'massif_a1', x: -3.5, y: -0.2, z: -10, w: 9, a: 0.62 }, { f: 'massif_c1', x: 6.5, y: -0.3, z: -11, w: 9.5, a: 0.55 }, { f: 'massif_b2', x: 15, y: -0.2, z: -10, w: 9, a: 0.6 },
  // nappes de brume debout, qui dérivent
  { f: 'brume_a1', x: -2, y: 0.6, z: -7, w: 10, a: 0.85, v: 0.18 }, { f: 'brume_b2', x: 8, y: 0.4, z: -6, w: 8, a: 0.8, v: -0.14 }, { f: 'brume_c4', x: 16, y: 0.8, z: -8.5, w: 9, a: 0.75, v: 0.12 },
  { f: 'brume_a3', x: 3, y: 0.2, z: -3.6, w: 6, a: 0.7, v: 0.22 },
  // brume rasante sur le papier, autour du livre
  { f: 'brume_a1', x: 2, y: 0.12, z: -2.6, w: 9, a: 0.55, v: 0.15, flat: true }, { f: 'brume_c6', x: 8.5, y: 0.14, z: 2.7, w: 7, a: 0.5, v: -0.12, flat: true },
  { f: 'brume_b2', x: 6, y: 0.1, z: -2.9, w: 8, a: 0.5, v: -0.1, flat: true }, { f: 'brume_c4', x: -0.5, y: 0.12, z: 2.6, w: 8, a: 0.5, v: 0.14, flat: true },
];
const Scene: React.FC<Props & { t: number }> = ({ t, texte, hlAt = 99, ecrit = 3.6 }) => {
  const { gl, scene, camera: cam } = useThree();
  const A = useMemo(() => {
    const table = tableCanvases(), tCol = tx(table.col), tBump = tx(table.bu, false);
    for (const x of [tCol, tBump]) { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(7, 4); }
    const runner = tx(runnerCanvas()); runner.wrapS = runner.wrapT = THREE.RepeatWrapping; runner.repeat.set(10, 4);
    const geo = new RoundedBoxGeometry(SW, TH, SL, 3, 0.008);
    const slipMats = Array.from({ length: 6 }, (_, k) => {
      const c = bambooCanvases(11 + k * 13);
      return new THREE.MeshPhysicalMaterial({ map: tx(c.col), bumpMap: tx(c.bu, false), bumpScale: 1.2, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.45, color: ['#ffffff', '#f7ecd6', '#fff3dc', '#efe0c0', '#fbf0da', '#f3e6c8'][k] });
    });
    const cordTex = tx(cordCanvas()); cordTex.wrapS = THREE.RepeatWrapping;
    const cord = new THREE.MeshStandardMaterial({ map: cordTex, bumpMap: cordTex, bumpScale: 1.4, roughness: 0.95 });
    // texte complet déjà écrit sur chaque latte (encre ancienne), sauf la latte citée qui est dessinée à chaque image (surbrillance)
    const T = texte ? makeText(texte.entrees) : null;
    const inkMats = !T ? [] : Array.from({ length: N }, (_, i) => new THREE.MeshBasicMaterial({ map: tx(inkSlip(T.text(i), 100 + i, (j) => T.head(i, j))), transparent: true, depthWrite: false, toneMapped: false }));
    const dyn = (blend?: THREE.Blending) => { const c = mk(TW_PX, TH_PX); const x = new THREE.CanvasTexture(c); x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; return { c, x, m: new THREE.MeshBasicMaterial({ map: x, transparent: true, depthWrite: false, toneMapped: false, blending: blend ?? THREE.NormalBlending }) }; };
    const cited = dyn(), glow = (() => { const c = mk(TW_PX * 3, TH_PX); const x = new THREE.CanvasTexture(c); x.colorSpace = THREE.SRGBColorSpace; return { c, x, m: new THREE.MeshBasicMaterial({ map: x, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }) }; })();
    const jit = (() => { const r = rng(61); return [...(T ? T.text(CI) : '')].map(() => ({ dx: (r() - 0.5) * 5, dy: (r() - 0.5) * 5, rot: (r() - 0.5) * 0.05, a: r() })); })();
    const baseCols = ['#ffffff', '#f7ecd6', '#fff3dc', '#efe0c0', '#fbf0da', '#f3e6c8'].map((c) => new THREE.Color(c));
    const citedMat = (() => { const c = bambooCanvases(97); return new THREE.MeshPhysicalMaterial({ map: tx(c.col), bumpMap: tx(c.bu, false), bumpScale: 1.2, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.4, emissive: new THREE.Color('#ffb04a'), emissiveIntensity: 0 }); })();
    const spr = tx(sprite()), win = tx(windowCanvas());
    // lueurs floues du fond (bokeh), poussières dans la lumière
    const R = rng(3);
    const bokeh = Array.from({ length: NB }, () => ({ x: -6 + R() * 18, y: 0.4 + R() * 4.2, z: -9 - R() * 6, s: 0.8 + R() * 2.2, a: 0.08 + R() * 0.2, c: ['#ffb866', '#ffd9a0', '#ff9a55', '#ffe3b8'][Math.floor(R() * 4)], ph: R() * 6 }));
    const dust = new Float32Array(ND * 3), dseed = Array.from({ length: ND }, () => [R(), R(), R(), R()]);
    const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    const pm = new THREE.PMREMGenerator(gl); const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const bg = Object.fromEntries(ELEMS.filter((f) => IMGS[f]).map((f) => { const x = new THREE.Texture(IMGS[f]); x.colorSpace = THREE.SRGBColorSpace; x.needsUpdate = true; return [f, { x, k: IMGS[f].height / IMGS[f].width }]; }));
    return { T, bg, tCol, tBump, runner, geo, slipMats, cord, inkMats, cited, glow, jit, baseCols, citedMat, spr, win, bokeh, dust, dseed, dgeo, env };
  }, [gl]);
  scene.environment = A.env; (scene as any).environmentIntensity = 0.55;
  gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.2;

  // poussières qui flottent doucement
  for (let i = 0; i < ND; i++) { const [a, b, c, d] = A.dseed[i]; A.dust[i * 3] = -2 + a * 14 + 0.25 * Math.sin(t * 0.4 + d * 9); A.dust[i * 3 + 1] = 0.15 + b * 3.4 + 0.12 * Math.sin(t * 0.6 + c * 7) - 0.03 * t; A.dust[i * 3 + 2] = -3.5 + c * 8; if (A.dust[i * 3 + 1] < 0.1) A.dust[i * 3 + 1] += 3.4; }
  A.dgeo.attributes.position.needsUpdate = true;

  // déroulé : 0,5 → 3,1 s ; caméra : 3/4 → au-dessus (0,2 → 3,5 s)
  const U = lerp(0.04, U_END, eio(seg(t, 0.5, 3.1)));
  const cu = eio(seg(t, 0.2, 3.5));
  // surbrillance du passage cité (直言曰言論難曰語, 8 caractères) : les autres lattes s'assombrissent, la latte 言 s'éclaire, une bande d'or
  // se déroule le long des caractères, qui passent à l'encre noire ; 語 vire au vermillon quand la voix se tait
  const CITED = texte?.citee ?? null;
  const lit = CITED ? eio(seg(t, ecrit - 0.2, ecrit + 0.9)) : 0, dim = 1 - 0.55 * lit;
  A.slipMats.forEach((m, k) => m.color.copy(A.baseCols[k]).multiplyScalar(dim));
  A.inkMats.forEach((m) => { m.opacity = dim; });
  A.citedMat.emissiveIntensity = 0.06 * lit; A.citedMat.color.setScalar(lerp(1, 1.04, lit));
  if (A.T) {
    const g = A.cited.c.getContext('2d')!, gg = A.glow.c.getContext('2d')!;
    g.clearRect(0, 0, TW_PX, TH_PX); gg.clearRect(0, 0, TW_PX * 3, TH_PX);
    g.textAlign = 'center'; g.textBaseline = 'top';
    const chs = [...A.T.text(CI)], vk = seg(t, hlAt, hlAt + 0.5), C0 = CITED ? CITED[0] : 99, C1 = CITED ? CITED[1] : -1;
    // surbrillance dorée qui descend le long du passage : chaque caractère s'allume à son tour (elle saute le blanc des cordons)
    const pc = (q: number) => (CITED && q >= C0 && q <= C1 ? eio(seg(t, ecrit + (q - C0) * 0.24, ecrit + (q - C0) * 0.24 + 0.45)) : 0);
    chs.forEach((ch, i) => {
      const j = A.jit[i], isC = i >= C0 && i <= C1, u = pc(i);
      const col = isC ? [lerp(54, 92, u), lerp(38, 56, u), lerp(24, 12, u)] : [54, 38, 24]; // l'encre du passage prend un ton de bronze
      const last = i === C1 ? vk : 0;
      g.save(); g.translate(TW_PX / 2 + j.dx * 0.6, ROWS[i] + j.dy * 0.6); g.rotate(j.rot * 0.8);
      g.font = A.T!.head(CI, i) ? '124px ShuimoSeal, serif' : '114px ShuimoSeal, serif';
      g.fillStyle = `rgba(${Math.round(lerp(col[0], 190, last))},${Math.round(lerp(col[1], 52, last))},${Math.round(lerp(col[2], 40, last))},${isC ? lerp(0.7 + 0.2 * j.a, 1, u) : 0.62 + 0.3 * j.a})`;
      g.shadowColor = isC ? `rgba(255,206,110,${0.95 * u})` : 'rgba(54,38,24,0.35)'; g.shadowBlur = isC ? 22 * u : 2.2;
      g.fillText(ch, 0, 0); g.restore();
    });
    // halo d'or (mélange additif) épousant la forme des caractères, avec un éclat plus vif sur le caractère qui s'allume
    const x0 = TW_PX; // la latte citée est au milieu du canevas (une latte de halo de chaque côté)
    gg.textAlign = 'center'; gg.textBaseline = 'top';
    for (let q = C0; q <= C1; q++) {
      const u = pc(q); if (u <= 0) continue;
      const flash = Math.sin(Math.PI * Math.min(1, u * 1.3)), j = A.jit[q];
      gg.save(); gg.translate(x0 + TW_PX / 2 + j.dx * 0.6, ROWS[q] + j.dy * 0.6); gg.rotate(j.rot * 0.8);
      gg.font = A.T!.head(CI, q) ? '124px ShuimoSeal, serif' : '114px ShuimoSeal, serif';
      gg.fillStyle = `rgba(255,196,96,${Math.min(1, 0.8 * u + 0.4 * flash)})`; gg.shadowColor = 'rgba(255,170,60,1)';
      gg.shadowBlur = 70 + 70 * flash; gg.fillText(chs[q], 0, 0); gg.fillText(chs[q], 0, 0); gg.shadowBlur = 26; gg.fillText(chs[q], 0, 0);
      gg.restore();
    }
    A.cited.x.needsUpdate = true; A.glow.x.needsUpdate = true;
  }

  // caméra : trois repères (3/4 sur le rouleau, accompagnement du déroulé, vue de dessus resserrée)
  const xc = 5.25;
  const p0 = new THREE.Vector3(1.7, 1.9, 4.1), l0 = new THREE.Vector3(0.25, 0.6, -0.4);
  const p1 = new THREE.Vector3(3.2, 3.2, 3.0), l1 = new THREE.Vector3(3.0, 0, 0);
  const p2 = new THREE.Vector3(xc, 5.3, 0.04), l2 = new THREE.Vector3(xc, 0, 0);
  const pos = cu < 0.5 ? p0.clone().lerp(p1, eio(cu * 2)) : p1.clone().lerp(p2, eio((cu - 0.5) * 2));
  const look = cu < 0.5 ? l0.clone().lerp(l1, eio(cu * 2)) : l1.clone().lerp(l2, eio((cu - 0.5) * 2));
  cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look);
  // à l'aplomb, « haut de l'écran » = côté lointain de la table (−z) : les lattes sont verticales à l'image
  if (cu > 0.97) { cam.up.set(0, 0, -1); cam.lookAt(look); }
  const camUp = lerp(0, 1, seg(cu, 0.55, 1));
  if (camUp > 0 && camUp < 1) { cam.up.set(0, 1 - camUp, -camUp).normalize(); cam.lookAt(look); }

  const bamb = A.slipMats[0];
  return (
    <>
      <ambientLight intensity={1.15} color="#fff6ea" />
      <hemisphereLight args={['#ffffff', '#efe4d2', 0.6]} />
      <directionalLight position={[-5, 8, 4]} intensity={1.7} color="#fff0dc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-radius={9}
        shadow-camera-left={-9} shadow-camera-right={14} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-near={1} shadow-camera-far={30} />
      {/* paysage en lavis et brume (parallaxe naturelle avec la caméra) */}
      {LAYERS.filter((l) => A.bg[l.f]).map((l, i) => {
        const b = A.bg[l.f], h = l.w * b.k, x = l.x + (l.v ?? 0) * t;
        return (
          <mesh key={i} position={l.flat ? [x, l.y, l.z] : [x, l.y + h / 2, l.z]} rotation={l.flat ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} renderOrder={-10 + i}>
            <planeGeometry args={[l.w, h]} />
            <meshBasicMaterial map={b.x} transparent opacity={l.a} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      {/* seule l'ombre douce du livre se pose sur le papier */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.002, 0]} receiveShadow>
        <planeGeometry args={[40, 24]} />
        <shadowMaterial opacity={0.2} color="#3a2a1c" />
      </mesh>
      {/* les lattes, leurs trois cordons ; nœud et brins au bout libre */}
      {Array.from({ length: N }, (_, i) => {
        const p = place(i, U);
        return (
          <group key={i} position={[p.x, p.y, 0]} rotation={[0, 0, p.rz]}>
            <mesh castShadow receiveShadow geometry={A.geo} material={i === CI ? A.citedMat : A.slipMats[(i * 5 + 2) % 6]} />
            {A.T && i !== CI && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TH / 2 + 0.0025, 0]} material={A.inkMats[i]}><planeGeometry args={[SW - 0.012, SL]} /></mesh>}
            {A.T && i === CI && (
              <>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TH / 2 + 0.003, 0]} material={A.glow.m}><planeGeometry args={[SW * 3, SL]} /></mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TH / 2 + 0.0035, 0]} material={A.cited.m}><planeGeometry args={[SW - 0.012, SL]} /></mesh>
              </>
            )}
            {CORD_Z.map((z) => (
              <mesh key={z} position={[0, 0, z]} material={A.cord} castShadow>
                <boxGeometry args={[SW + 0.014, TH + 0.024, 0.08]} />
              </mesh>
            ))}
            {i === 0 && CORD_Z.map((z) => (
              <group key={`k${z}`}>
                <mesh position={[-SW / 2 - 0.035, 0.012, z]} scale={[1.1, 0.8, 1]} material={A.cord} castShadow><sphereGeometry args={[0.07, 16, 12]} /></mesh>
                {[-1, 1].map((d) => (
                  <mesh key={d} position={[-SW / 2 - 0.3, -TH / 2 + 0.018, z + d * 0.05]} rotation={[0, d * 0.18, Math.PI / 2]} material={A.cord}><cylinderGeometry args={[0.014, 0.016, 0.45, 8]} /></mesh>
                ))}
              </group>
            ))}
          </group>
        );
      })}
    </>
  );
};

// finition « cinéma » : vignette, étalonnage chaud
const Finish: React.FC<{ t: number }> = ({ t }) => {
  void t;
  return (
    <>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 48%, rgba(0,0,0,0) 52%, rgba(8,3,1,0.62) 100%)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(255,190,110,0.10), rgba(60,30,90,0.10))', mixBlendMode: 'soft-light' }} />
    </>
  );
};

export const LattesBambou3D: React.FC<Props> = (props) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const [h] = useState(() => delayRender('polices du rouleau de lattes'));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    Promise.all([
      ...[['ShuimoSeal', 'fonts/ChongxiSeal.otf'], ['ShuimoKai', 'fonts/LXGWWenKaiTC-Bold.ttf']].map(([n, u]) => new FontFace(n, `url(${staticFile(u)})`).load().then((ff) => { document.fonts.add(ff); })),
      ...ELEMS.map((f) => new Promise<void>((res) => { if (IMGS[f]) return res(); const im = new Image(); im.onload = () => { IMGS[f] = im; res(); }; im.onerror = () => res(); im.src = staticFile(`shuimo/elements/${f}.png`); })),
    ])
      .then(() => { setOk(true); continueRender(h); });
  }, [h]);
  if (!ok) return null;
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }} camera={{ fov: 35, position: [1.7, 1.9, 4.1], near: 0.05, far: 100 }}>
        <Scene t={f / fps} {...props} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

// aperçu autonome (Remotion Studio : composition « LattesBambou3D ») : le livre de lattes vide, sur papier
export const LATTES_SECONDS = 10;
export const LattesBambou3DDemo: React.FC = () => (
  <AbsoluteFill style={{ background: `#f3eee4 url(${staticFile('shuimo/paper.jpg')}) center/cover` }}>
    <LattesBambou3D />
  </AbsoluteFill>
);
