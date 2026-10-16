// Rouleau du temps en 3D (série 墨道) : le paysage plein cadre s'avère être une peinture sur un rouleau posé sur une
// table laquée. La caméra, d'abord à la verticale (le plan 2D exact), s'élève, bascule en vue rasante (≈ 18°) et suit
// le rouleau qui défile entre ses deux bâtons ; les époques passent (sceaux, années sur la bordure de soie), pétales
// de prunier et poussières dans la lumière chaude ; ralenti, un sceau de jade descend et frappe (« tac ») le sceau de
// l'époque d'arrivée ; la caméra remonte puis plonge à la verticale sur le paysage d'arrivée, qui redevient le plan 2D ;
// le sceau s'envole vers le cartouche d'époque.
//
// Utilisation :
//   const C: Rouleau3DConfig = { at: 105.2, eras, from: 1, to: 2, years: [-1046, -300], fromLand: { seed: 9, mood: 'jour' }, toLand: { seed: 26, mood: 'brume' } };
//   <Rouleau3DStage cfg={C} />   (plein cadre, de at − 0,3 à at + durée ; à l'appelant les plans 2D avant et après)
//   r3TagIn(C, t) : opacité du cartouche d'arrivée (le sceau volant s'y pose en (156, 136), 92 px).
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { compose, Mood, Shot } from '../shuimo/layout';
import { rng } from '../shuimo/common';
import { Era, travelM } from '../rouleau/TimeScroll';

export type Rouleau3DConfig = {
  at: number; duration?: number; // 5 s par défaut (le son est calé dessus)
  eras: Era[]; from: number; to: number; years: [number, number];
  fromLand: { seed: number; mood: Mood }; toLand: { seed: number; mood: Mood };
  midSeeds?: number[]; // paysages traversés (2), puis 2 marges
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

const dur = (c: Rouleau3DConfig) => c.duration ?? 5;
// temps de référence (déroulé de 5 s) : on étire tout si la durée change
const tRef = (c: Rouleau3DConfig, t: number) => ((t - c.at) * 5) / dur(c);
const IMPACT = 4.0; // = 0,8 de la durée, comme le son du rouleau 2D (impact à 0,8)
const centerAt = (s: number) => lerp(C0, C1, travelM(s / 5)); // P au centre du rouleau (x = 0)
const yearFmt = (y: number) => (y < 0 ? `−${Math.abs(Math.round(y))}` : `${Math.round(y)}`);
export const r3TagIn = (c: Rouleau3DConfig, t: number) => sm(seg(tRef(c, t), 5.05, 5.45));

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
const drawSealSquare = (g: CanvasRenderingContext2D, x: number, y: number, s: number, zh: string, a: number, ghost = false) => {
  g.save(); g.translate(x, y); g.globalAlpha = a;
  if (ghost) {
    g.strokeStyle = VER; g.lineWidth = s * 0.03; g.setLineDash([s * 0.06, s * 0.05]); g.strokeRect(-s / 2, -s / 2, s, s); g.setLineDash([]);
    g.fillStyle = 'rgba(192,57,43,0.35)'; g.font = `${s * 0.7}px ShuimoKai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(zh, 0, s * 0.03);
  } else {
    const R0 = rng(zh.charCodeAt(0));
    g.fillStyle = VER; g.beginPath();
    for (let i = 0; i < 40; i++) { const k = i / 40, side = Math.floor(k * 4), f = (k * 4) % 1, j = (R0() - 0.5) * s * 0.025;
      const p = [[-1 + 2 * f, -1], [1, -1 + 2 * f], [1 - 2 * f, 1], [-1, 1 - 2 * f]][side]; g.lineTo((p[0] * s) / 2 + j, (p[1] * s) / 2 + j); }
    g.closePath(); g.fill();
    g.fillStyle = '#f6eee0'; g.font = `${s * 0.7}px ShuimoKai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(zh, 0, s * 0.03);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 70; i++) { g.globalAlpha = 0.25 + 0.5 * R0(); g.beginPath(); g.arc((R0() - 0.5) * s, (R0() - 0.5) * s, 0.5 + R0() * s * 0.012, 0, 7); g.fill(); }
  }
  g.restore();
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
  // bordures de soie (haut et bas), filets d'encre
  const silk = (y: number, h: number) => { g.fillStyle = 'rgba(214,201,170,0.92)'; g.fillRect(0, y, PW, h); g.fillStyle = 'rgba(120,95,60,0.08)'; for (let x = 0; x < PW; x += 6) g.fillRect(x, y, 2, h); };
  silk(0, TOP); silk(TOP + 1080, PH - TOP - 1080);
  g.fillStyle = 'rgba(90,70,45,0.55)'; g.fillRect(0, TOP - 3, PW, 3); g.fillRect(0, TOP + 1080, PW, 3);
  // frise du temps sur la soie : graduations tous les 50 ans, années tous les 100
  const [y0, y1] = c.years, xOf = (y: number) => SEAL0 + ((y - y0) / (y1 - y0)) * (SEAL1 - SEAL0);
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
  c.eras.forEach((e, i) => {
    if (i === c.to) { drawSealSquare(g, SEAL1, SEAL.y, SEAL.size, e.zh, 1, true); return; }
    if (i === c.from) drawSealSquare(g, SEAL0, SEAL.y, SEAL.size, e.zh, 0.95);
  });
  g.font = '600 40px ShuimoLatin'; g.fillStyle = 'rgba(29,25,21,0.85)';
  g.fillText(c.eras[c.from].date, SEAL0, by + 80 > PH ? by + 26 : TOP + 1080 + 92);
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
const woodCanvas = () => {
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024; const g = cv.getContext('2d')!;
  g.fillStyle = '#3a1712'; g.fillRect(0, 0, 2048, 1024);
  const R0 = rng(31);
  for (let i = 0; i < 260; i++) { // veines du bois sous la laque
    const y = R0() * 1024, a = 0.03 + R0() * 0.08, amp = 4 + R0() * 18, f = 0.002 + R0() * 0.006, ph = R0() * 6;
    g.strokeStyle = R0() < 0.5 ? `rgba(20,6,4,${a * 2})` : `rgba(120,50,30,${a})`; g.lineWidth = 1 + R0() * 3; g.beginPath();
    for (let x = 0; x <= 2048; x += 16) g.lineTo(x, y + amp * Math.sin(x * f + ph) + 0.5 * amp * Math.sin(x * f * 2.7 + ph));
    g.stroke();
  }
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

// ── caméra : verticale → s'élève → rasante (suit) → remonte → plonge à la verticale sur l'arrivée ──
const H0 = 3.375 / (2 * Math.tan((17.5 * Math.PI) / 180)); // hauteur qui cadre exactement un plan (1080 P)
const T = V3(STOP_X, 0, ZS - 0.5); // un peu au-delà du sceau : plus de peinture dans le champ
const P0 = V3(0, H0, ZC), L0 = V3(0, 0, ZC);
const P1 = V3(0.5, 8.2, ZC + 1.6), L1 = V3(0.6, 0, ZC);
const P2 = T.clone().add(V3(-4.4, 1.75, 2.2)), P3 = T.clone().add(V3(-3.8, 1.5, 1.9));
const XEND = (SEAL1 - SEAL.dx - C1) / UNIT; // centre du plan d'arrivée à la fin
const P4 = V3(XEND, H0, ZC), L4 = V3(XEND, 0, ZC);
function camAt(s: number) {
  let p: THREE.Vector3, l: THREE.Vector3;
  if (s < 0.75) { const k = eio(s / 0.75); p = vl(P0, P1, k); l = vl(L0, L1, k); }
  else if (s < 2.1) { const k = eio((s - 0.75) / 1.35); p = vl(P1, P2, k); p.y += 0.6 * Math.sin(Math.PI * k); l = vl(L1, T, k); }
  else if (s < 4.15) { const k = sm((s - 2.1) / 2.05); p = vl(P2, P3, k); l = T.clone(); }
  else { const k = eio((s - 4.15) / 0.75); p = vl(P3, P4, k); p.y += 2.2 * Math.sin(Math.PI * k); l = vl(T, L4, k); }
  // impact : secousse brève
  const d = s - IMPACT;
  if (d > 0 && d < 0.35) { const a = 0.045 * (1 - d / 0.35); p.x += a * Math.sin(d * 90); p.y += a * Math.sin(d * 117 + 1); }
  return { p, l };
}

type Assets = { scroll: THREE.CanvasTexture; seal: THREE.CanvasTexture; roll: THREE.CanvasTexture; wood: THREE.CanvasTexture; petal: THREE.CanvasTexture };
const NP = 120, ND = 240;
const Scene: React.FC<{ s: number; A: Assets }> = ({ s, A }) => {
  const { camera, gl } = useThree();
  const petals = useRef<THREE.InstancedMesh>(null), dust = useRef<THREE.Points>(null);
  const seeds = useMemo(() => { const r = rng(11); return Array.from({ length: Math.max(NP, ND) }, () => [r(), r(), r(), r(), r(), r()]); }, []);
  const dustPos = useMemo(() => new Float32Array(ND * 3), []);
  useMemo(() => { A.scroll.anisotropy = gl.capabilities.getMaxAnisotropy(); A.wood.anisotropy = A.scroll.anisotropy; A.wood.wrapS = A.wood.wrapT = THREE.RepeatWrapping; A.wood.repeat.set(3, 3); }, [A, gl]);

  const c = centerAt(s), travel = (c - C0) / UNIT;
  A.scroll.repeat.set((VIS * UNIT) / PW, 1); A.scroll.offset.set((c - (VIS * UNIT) / 2) / PW, 0);
  const sealX = (SEAL1 - c) / UNIT;
  const { p, l } = camAt(s);
  const dir = l.clone().sub(p).normalize(), top = sm((-dir.y - 0.82) / 0.17);
  camera.up.copy(V3(0, 1 - top, -top).normalize()); camera.position.copy(p); camera.lookAt(l);

  // sceau de jade : descend (accéléré), frappe, remonte
  const down = seg(s, IMPACT - 0.45, IMPACT), up = seg(s, IMPACT + 0.08, IMPACT + 0.5);
  const sy = 0.28 + 0.004 + 3.6 * (1 - down * down) + 3.6 * up * up;
  const stamped = s >= IMPACT, ink = stamped ? 1 - 0.2 * Math.exp(-(s - IMPACT) * 8) : 0;
  const glow = stamped ? Math.exp(-(s - IMPACT) * 3) : 0;
  const sealFade = 1 - seg(s, 4.95, 5.15);

  // pétales : soufflés dans le sens du défilement, rafale quand le rouleau file
  const wind = -travel * 0.55 - 0.35 * s, M = new THREE.Matrix4(), Qt = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3();
  const pa = seg(s, 0.35, 1.2) * (1 - seg(s, 4.3, 4.8));
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
      <color attach="background" args={['#1b120d']} />
      <fog attach="fog" args={['#1b120d', 9, 21]} />
      <ambientLight intensity={1.75} color="#ffffff" />
      <directionalLight position={[-7, 6.5, 5]} intensity={2.1} color="#fff0dc" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-near={1} shadow-camera-far={30} />
      <directionalLight position={[6, 3, -6]} intensity={0.2} color="#e8d8c0" />
      {/* table laquée */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <planeGeometry args={[60, 34]} />
        <meshStandardMaterial map={A.wood} roughness={0.5} metalness={0.05} />
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
      {/* le sceau de jade */}
      {s > IMPACT - 0.5 && s < IMPACT + 0.55 && (
        <group position={[sealX, sy, ZS]}>
          <mesh castShadow><boxGeometry args={[0.48, 0.56, 0.48]} /><meshStandardMaterial color="#4f7d63" roughness={0.16} metalness={0.05} /></mesh>
          <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.36, 0.05, 0.36]} /><meshStandardMaterial color="#4f7d63" roughness={0.16} /></mesh>
          <mesh position={[0, 0.44, 0]} castShadow><torusGeometry args={[0.11, 0.045, 12, 32]} /><meshStandardMaterial color="#5a8a6e" roughness={0.16} /></mesh>
          <mesh position={[0, -0.282, 0]}><boxGeometry args={[0.46, 0.006, 0.46]} /><meshStandardMaterial color="#b8322a" roughness={0.6} /></mesh>
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

// ── la scène complète : 3D, compteur d'années, sceau volant, son ──
export const Rouleau3DStage: React.FC<{ cfg: Rouleau3DConfig }> = ({ cfg }) => {
  const { fps, width, height } = useVideoConfig();
  const t = useCurrentFrame() / fps, s = tRef(cfg, t);
  const [A, setA] = useState<Assets | null>(null);
  const [h] = useState(() => delayRender('rouleau 3D'));
  useEffect(() => {
    const files = [...new Set(shotsOf(cfg).flatMap((sh) => sh.pieces.map((p) => p.el.file)))];
    const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
    Promise.all([
      document.fonts.ready,
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load().then((f) => document.fonts.add(f)),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load().then((f) => document.fonts.add(f)),
    ]).then(() => Promise.all([load(staticFile('shuimo/paper.jpg')), ...files.map((f) => load(staticFile(`shuimo/elements/${f}`)))]))
      .then(([paper, ...ims]) => {
        const img: Record<string, HTMLImageElement> = {}; files.forEach((f, i) => (img[f] = ims[i]));
        setA({ scroll: tex(paintScroll(cfg, img, paper)), seal: tex(sealCanvas(cfg.eras[cfg.to].zh)), roll: tex(rollCanvas(paper)), wood: tex(woodCanvas()), petal: tex(petalCanvas()) });
        continueRender(h);
      });
  }, [cfg, h]);
  if (!A || s < -0.4 || s > 5.6) return null;
  const year = lerp(cfg.years[0], cfg.years[1], travelM(s / 5));
  const ya = seg(s, 0.8, 1.3) * (1 - seg(s, 4.2, 4.5));
  // sceau volant : de sa place dans le plan d'arrivée (vue verticale) au cartouche
  const fk = eio(seg(s, 5.0, 5.45)), fx = lerp(960 + SEAL.dx, 156, fk), fy = lerp(SEAL.y - TOP, 136, fk), fsz = lerp(SEAL.size, 92, fk);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: seg(s, -0.35, -0.05) * (1 - seg(s, 4.8, 5.05)) }}>
        <ThreeCanvas width={width} height={height} shadows flat gl={{ antialias: true }} camera={{ fov: 35, position: [0, H0, ZC], near: 0.05, far: 100 }}>
          <Scene s={Math.max(0, Math.min(5, s))} A={A} />
        </ThreeCanvas>
      </AbsoluteFill>
      {/* compteur d'années, écrit au pinceau */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 930, textAlign: 'center', opacity: ya, fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 72, letterSpacing: 4, color: 'rgb(36,28,22)', textShadow: '0 0 16px rgba(246,241,231,0.95), 0 0 6px rgba(246,241,231,0.9)' }}>
        {yearFmt(year)}<span style={{ fontSize: 36, marginLeft: 14, opacity: 0.8 }}>{year < 0 ? 'av. J.-C.' : ''}</span>
      </div>
      {s > 4.95 && s < 5.5 && (
        <div style={{ position: 'absolute', left: fx - fsz / 2, top: fy - fsz / 2, width: fsz, height: fsz, background: 'rgba(192,57,43,0.95)', borderRadius: 10 * fk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: fsz * 0.7, color: '#f6eee0', opacity: 1 - seg(s, 5.4, 5.5), boxShadow: `0 ${10 * Math.sin(Math.PI * fk)}px ${30 * Math.sin(Math.PI * fk)}px rgba(60,20,10,0.35)` }}>
          {cfg.eras[cfg.to].zh}
        </div>
      )}
      <Sequence from={Math.round(cfg.at * fps)} layout="none"><Audio src={staticFile('rouleau/rouleau.wav')} volume={0.6} playbackRate={5 / dur(cfg)} /></Sequence>
      <Sequence from={Math.round((cfg.at + 0.97 * dur(cfg)) * fps)} layout="none"><Audio src={staticFile('rouleau/gong.wav')} volume={0.22} /></Sequence>
    </AbsoluteFill>
  );
};
