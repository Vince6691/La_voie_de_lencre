// 語 (yǔ), version tout shuimo — episodes/yu/PROPOSITION.md (v5), textes episodes/yu/VOIX.md.
// « Deux mots pour parler » : 食不語，寢不言 → les pièces (言 la parole, 吾 « moi ») → la dynastie Shang (言, 五 en
// cinq traits puis en croix, 吾) → rouleau 3D court → la cloche (le premier 語) → les Royaumes combattants (on se
// dispute ; sceaux de Jin) → coups de pinceau + sceau → la dynastie Han (直言曰言，論難曰語 ; cascade frappée) → Yang
// Xiong et les soldats (carte des parlers, clip B) → rouleau 3D complet → aujourd'hui (讠, mosaïque, carte des
// dialectes) → scène récapitulative (deux bouches face à face) → maxime et passerelle 師 → écran de fin.
// Ligne de temps lue dans les repères (episodes/yu/voix/reperes.json, « _ligne »).
// Pigments constants : la parole 言 en vermillon, le cinq 五 en malachite, la bouche de 吾 en azurite.
// En attente (emplacements marqués à l'écran) : clips Seedance A (carillon) et B (Yang Xiong), conseillers en papier
// découpé, image classique, médaillon de Yang Xiong.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose, Mood } from '../shuimo/layout';
import { rng } from '../shuimo/common';
import { INK, PIGMENT } from '../shuimo_xue/InkStage';
import { Rouleau3DConfig, Rouleau3DStage, r3Seconds, r3TagIn } from '../rouleau3d/Rouleau3D';
import { MosaicConfig, MosaicTransition, mosaicSeconds } from '../mosaique/MosaicTransition';
import { cartouche } from '../periodes';
import { loadLegacy, W } from '../legacy';
import { AGES_SECONDS, EssaiCarteAges } from '../cartes/CarteAges';
import { capitale, carte, chargerCartes, creditCarte, fondCarte, lieu, routePinceau } from '../cartes/CartePeinte';
import rep from '../data/episodes/yu.json';

type Clip = 'b01' | 'b02' | 'b03' | 'b04' | 'b05' | 'b06' | 'b07' | 'b08' | 'b09' | 'b10';
type Rep = Record<Clip, { duration: number; cues: Record<string, number> }> & {
  _ligne: { clips: Record<Clip, { debut: number; duree: number; pause?: { coupe: number; duree: number } }>; rouleaux: { debut: number; duree: number }[]; plages: Record<string, { debut: number; duree: number }>; fin: number; total: number; bruitages?: [string, number, number][] };
};
const R = rep as unknown as Rep;
const L = R._ligne;
const A = (k: Clip) => L.clips[k].debut;
const B = (k: Clip) => L.clips[k].debut + L.clips[k].duree + (L.clips[k].pause?.duree ?? 0); // fin de la voix du bloc
const at = (k: Clip, n: string) => {
  const c = L.clips[k], v = R[k].cues[n];
  if (v === undefined) throw new Error(`repère manquant ${k}.${n}`);
  return c.debut + v + (c.pause && v > c.pause.coupe ? c.pause.duree : 0);
};
export const YU_SECONDS = Math.ceil(L.total * 10) / 10;
const END = L.fin;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const inkCss = rgb(INK);
// pigments constants : la parole en vermillon, le cinq en malachite, la bouche de 吾 en azurite
const VER = PIGMENT.hand, MAL = PIGMENT.roof, AZ = PIGMENT.child;
const GOLD = [184, 140, 58]; // halo d'or de l'accroche (語 et 言 détachés, « interdits »)
const GREY = [168, 160, 150], OCRE = [176, 112, 52];
const P: Record<string, number[]> = { parole: VER, trait: VER, langue: VER, cinq: MAL, bouche: AZ };
// couleur d'une composante : k = 0 encre, 1 pigment
const pig = (k: number | ((c: string) => number)) => (c: string) => rgb(mixc(INK, P[c] ?? INK, typeof k === 'number' ? k : k(c)));
const useT = () => useCurrentFrame() / useVideoConfig().fps;

// ── images de l'épisode (facultatives : emplacement provisoire tant qu'elles manquent)
const IMGSRC = { jour: 'episodes/yu/images/precepte_jour.jpg', nuit: 'episodes/yu/images/precepte_nuit.jpg', pinceau: 'episodes/yu/images/pinceau_main.png', pointe: 'episodes/yu/images/pinceau_pointe_macro.png', banquet: 'episodes/yu/images/banquet_estampage.jpg', ca: 'episodes/yu/images/conseiller_a.png', cb: 'episodes/yu/images/conseiller_b.png', yx: 'episodes/yu/images/yangxiong_trace.png', anyang: 'episodes/yu/images/anyang_ciel.jpg', ombres: 'episodes/yu/images/ombres_conseillers.jpg' };
const IMG: Partial<Record<keyof typeof IMGSRC, HTMLImageElement>> = {};
// ── polices, moteur Canvas
const useSetup = () => {
  const [h] = useState(() => delayRender('polices + moteur'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
      // police des légendes (texte imprimé) ; absente → repli sur le kai
      new FontFace('ShuimoPinceau', `url(${staticFile('fonts/MaShanZheng-Regular.ttf')})`).load(),
      new FontFace('ShuimoLegende', `url(${staticFile('fonts/ZhuqueFangsong-Regular.ttf')})`).load().catch(() => new FontFace('ShuimoLegende', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load()),
      chargerCartes(['chine_centre_nord', 'chine_centre_sud']),
      ...Object.entries(IMGSRC).map(([k, src]) => new Promise<void>((res) => { const im = new Image(); im.onload = () => { IMG[k as keyof typeof IMGSRC] = im; res(); }; im.onerror = () => res(); im.src = staticFile(src); })),
    ]).then((fs) => { fs.slice(0, 4).forEach((f) => document.fonts.add(f as FontFace)); return loadLegacy({ three: false, captions: false }); }).then(() => { setReady(true); continueRender(h); });
  }, [h]);
  return ready;
};

const Draw: React.FC<{ draw: (ctx: CanvasRenderingContext2D, t: number, E: any) => void }> = ({ draw }) => {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const E = W().E;
    if (!E || !ref.current) return;
    const ctx = ref.current.getContext('2d')!;
    ctx.clearRect(0, 0, 1920, 1080);
    draw(ctx, t, E);
  });
  return <canvas ref={ref} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
};
const Fade: React.FC<{ len: number; faint: number; children: React.ReactNode }> = ({ len, faint, children }) => {
  const f = useT();
  const o = interpolate(f, [0, 1.4, len - 1.4, len], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o * faint }}>{children}</AbsoluteFill>;
};
const Landscape: React.FC<{ seed: number; from: number; to: number; move?: 'pan' | 'push' | 'still' | 'rise'; mood?: Mood; faint?: number }> = ({ seed, from, to, move = 'pan', mood = 'jour', faint = 1 }) => {
  const { fps } = useVideoConfig();
  const shot = compose(seed, { move, mood, duration: to - from });
  return (
    <Sequence from={Math.round(from * fps)} durationInFrames={Math.round((to - from) * fps)}>
      <Fade len={to - from} faint={faint}><ShuimoBackground shot={shot} duration={to - from} /></Fade>
    </Sequence>
  );
};
const Paper: React.FC = () => <AbsoluteFill style={{ background: `#f3eee4 url(${staticFile('shuimo/paper.jpg')}) center/cover` }} />;
const MapPanel: React.FC<{ from: number; to: number; draw: (ctx: CanvasRenderingContext2D, u: number, E: any, t: number) => void }> = ({ from, to, draw }) => {
  const t = useT();
  const a = win(t, from, to, 0.6);
  if (a <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Paper />
      <Draw draw={(ctx, tt, E) => draw(ctx, clamp((tt - from) / (to - from)), E, tt)} />
    </AbsoluteFill>
  );
};

// ── cartouches, étiquettes, textes (tailles lisibles sur téléphone ; rien dans les 8 % du bas)
const EraTag: React.FC<{ zh: string; name: string; dates: string; a: number }> = ({ zh, name, dates, a }) => (
  <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a }}>
    <div style={{ width: 92, height: 92, background: rgb(VER, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: [...zh].length > 1 ? 38 : 64, writingMode: [...zh].length > 1 ? 'vertical-rl' : undefined, lineHeight: 1, color: '#f6eee0', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 36, fontWeight: 500, color: '#5e5044' }}>{dates}</div>
    </div>
  </div>
);
const Label: React.FC<{ x: number; y: number; zh: string; text: string; color: number[]; a: number; align?: 'left' | 'right' | 'center' }> = ({ x, y, zh, text, color, a, align = 'left' }) => (
  <div style={{ position: 'absolute', top: y - 50, ...(align === 'center' ? { left: x - 400, width: 800, justifyContent: 'center' } : align === 'left' ? { left: x } : { right: 1920 - x }), opacity: a, display: 'flex', alignItems: 'baseline', gap: 14, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
    <span style={{ fontFamily: 'ShuimoKai', fontSize: 100, color: rgb(color) }}>{zh}</span>
    <span style={{ fontFamily: 'ShuimoLatin, ShuimoLegende', fontSize: 66, fontWeight: 600, color: '#3b322b', textShadow: '0 0 10px rgba(246,241,231,0.95)' }}>{text}</span>
  </div>
);
const Caption: React.FC<{ text: React.ReactNode; a: number; y?: number; size?: number; left?: number; width?: number }> = ({ text, a, y = 900, size = 44, left = 0, width = 1920 }) => (
  <div style={{ position: 'absolute', left, width, top: Math.min(y, 975 - 1.7 * Math.max(size, 44)), textAlign: 'center', opacity: a }}>
    <span style={{ display: 'inline-block', padding: '4px 22px', borderRadius: 14, background: 'rgba(246,241,231,0.8)', fontFamily: 'ShuimoLatin, ShuimoLegende', fontSize: Math.max(size, 44), color: '#4b4038', textShadow: '0 0 10px rgba(246,241,231,0.9)' }}>{text}</span>
  </div>
);
// emplacement d'un élément à fournir (clip Seedance, image) : papier, cadre en pointillé, intitulé ; remplacé au montage
const Placeholder: React.FC<{ title: string; sub: string; a: number }> = ({ title, sub, a }) => (
  <AbsoluteFill style={{ opacity: a, alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 1200, height: 560, border: `4px dashed ${rgb(VER, 0.6)}`, borderRadius: 18, background: 'rgba(246,241,231,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 700, fontSize: 60, color: inkCss }}>{title}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: '#5e5044' }}>{sub}</div>
    </div>
  </AbsoluteFill>
);

// ── caméra : poussées et panoramiques lents (clés [t, cx, cy, échelle, durée]), respiration permanente, punch
type K = [number, number, number, number, number?];
// caméra : une seule trajectoire continue (spline de Hermite monotone à travers les clés : vitesse continue, pas d'arrêt
// à chaque clé ni de dépassement), dolly lent permanent ; les « punch » sont des respirations douces (1,4 s), pas des à-coups.
// clé [t, x, y, zoom, d] : position atteinte à t + d (d = durée du mouvement vers cette clé, 1,2 s par défaut, au moins 1,6 s)
const hermite = (ts: number[], vs: number[], t: number) => {
  const n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];
  let i = 0; while (t > ts[i + 1]) i++;
  const sl = (a: number) => (vs[a + 1] - vs[a]) / (ts[a + 1] - ts[a]);
  const tan = (k: number) => {
    if (k === 0 || k === n - 1) return 0;
    const a = sl(k - 1), b = sl(k);
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b); // monotone : ralentit sans repartir en arrière
  };
  const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * tan(i) + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * tan(i + 1);
};
const Cam: React.FC<{ keys: K[]; punch?: number[]; calm?: [number, number][]; children: React.ReactNode }> = ({ keys, punch = [], calm = [], children }) => {
  const t = useT();
  const ts: number[] = [], xs: number[] = [], ys: number[] = [], zs: number[] = [];
  keys.forEach(([kt, x, y, z, d = 1.2], k) => {
    const at = k === 0 ? kt : Math.max(kt + Math.max(d, 1.6), ts[ts.length - 1] + 0.4);
    ts.push(at); xs.push(x); ys.push(y); zs.push(z);
  });
  let cx = hermite(ts, xs, t), cy = hermite(ts, ys, t), s = hermite(ts, zs, t);
  // dolly lent et dérive, très amples dans le temps : le plan vit sans jamais saccader
  s *= 1 + 0.018 * (0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 16));
  cx += 12 * Math.sin((t * 2 * Math.PI) / 19); cy += 7 * Math.sin((t * 2 * Math.PI) / 23);
  for (const p of punch) { const u = seg(t, p - 0.2, p + 1.2); s *= 1 + 0.022 * Math.sin(Math.PI * u) ** 2; }
  const amp = 1 - Math.max(0, ...calm.map(([a, b]) => win(t, a, b, 0.6)));
  s = 1 + (s - 1) * amp;
  cx = Math.min(1920 - 960 / s, Math.max(960 / s, cx)); cy = Math.min(1080 - 540 / s, Math.max(540 / s, cy));
  return <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${960 - cx * s}px, ${540 - cy * s}px) scale(${s})` }}>{children}</AbsoluteFill>;
};

// ── estampage : un rectangle d'encre sombre, grain de pierre, bords irréguliers ; le signe y apparaît en blanc
const rubbing = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number, seed = 5) => {
  if (a <= 0) return;
  const r = rng(seed);
  ctx.save(); ctx.globalAlpha = a;
  ctx.beginPath();
  const n = 60;
  for (let i = 0; i <= n; i++) { const u = i / n; ctx.lineTo(x - w / 2 + w * u, y - h / 2 + (r() - 0.5) * 10); }
  for (let i = 0; i <= n; i++) { const u = i / n; ctx.lineTo(x + w / 2 + (r() - 0.5) * 10, y - h / 2 + h * u); }
  for (let i = 0; i <= n; i++) { const u = i / n; ctx.lineTo(x + w / 2 - w * u, y + h / 2 + (r() - 0.5) * 10); }
  for (let i = 0; i <= n; i++) { const u = i / n; ctx.lineTo(x - w / 2 + (r() - 0.5) * 10, y + h / 2 - h * u); }
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 40, x, y, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(38,34,31,0.9)'); g.addColorStop(1, 'rgba(22,20,18,0.96)');
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(200,192,180,${0.03 + 0.06 * r()})`; ctx.fillRect(x - w / 2 + r() * w, y - h / 2 + r() * h, 1 + 3 * r(), 1 + 3 * r()); }
  ctx.restore();
};
// latte de bambou (verticale), légèrement bombée, nœuds ; le texte y est écrit à l'encre
const slip = (ctx: CanvasRenderingContext2D, x: number, top: number, h: number, a: number) => {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
  g.addColorStop(0, '#b99a62'); g.addColorStop(0.5, '#e2cc98'); g.addColorStop(1, '#a98a54');
  ctx.fillStyle = g; ctx.shadowColor = 'rgba(40,30,20,0.3)'; ctx.shadowBlur = 20; ctx.fillRect(x - 60, top, 120, h); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(110,84,44,0.35)'; ctx.lineWidth = 2;
  for (const k of [0.33, 0.68]) { ctx.beginPath(); ctx.moveTo(x - 60, top + h * k); ctx.lineTo(x + 60, top + h * k); ctx.stroke(); }
  ctx.restore();
};

// ── sceaux d'époque qui frappent (comme le cachet du peintre), grain du papier, vignettage
const drawSeal = (ctx: CanvasRenderingContext2D, E: any, x: number, y: number, size: number, zh: string, u: number) => {
  const drop = seg(u, 0, 0.14), life = 1 - seg(u, 2.6, 3.4);
  if (u < 0 || life <= 0) return;
  const sc = 1 + 0.6 * (1 - drop), a = drop * life;
  const bleed = seg(u, 0.12, 0.6);
  if (bleed > 0) {
    const g = ctx.createRadialGradient(x, y, size * 0.4, x, y, size * (0.75 + 0.25 * bleed));
    g.addColorStop(0, rgb(VER, 0.18 * life)); g.addColorStop(1, rgb(VER, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, size, 0, 7); ctx.fill();
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.04); ctx.scale(sc, sc); ctx.globalAlpha = a;
  if (drop < 1) { ctx.shadowColor = 'rgba(40,20,10,0.35)'; ctx.shadowBlur = 30 * (1 - drop); ctx.shadowOffsetY = 18 * (1 - drop); }
  const r = rng(zh.charCodeAt(0)), h = size / 2;
  ctx.beginPath();
  for (let i = 0; i < 28; i++) { const side = Math.floor(i / 7), f = (i % 7) / 7, j = (r() - 0.5) * size * 0.025;
    const Q = side === 0 ? [-h + f * 2 * h, -h + j] : side === 1 ? [h + j, -h + f * 2 * h] : side === 2 ? [h - f * 2 * h, h + j] : [-h + j, h - f * 2 * h];
    i ? ctx.lineTo(Q[0], Q[1]) : ctx.moveTo(Q[0], Q[1]); }
  ctx.closePath(); ctx.fillStyle = rgb(VER, 0.92); ctx.fill();
  ctx.shadowColor = 'transparent';
  E.text(ctx, zh, 0, size * 0.04, { font: 'ShuimoKai', size: size * 0.72, color: '#f6eee0' });
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * size * 0.95, (r() - 0.5) * size * 0.95, 1 + r() * 3.5, 0, 7); ctx.fillStyle = `rgba(0,0,0,${0.4 + 0.5 * r()})`; ctx.fill(); }
  ctx.restore();
};
const SEALS = () => [
  { t: at('b03', 'pourquoi') - 0.6, zh: '商' },
  { t: at('b04', 'rencontre') + 0.4, zh: '周' },
  { t: at('b05', 'empile') + 1.2, zh: '戰' },
];
const shakeAt = (t: number) => {
  let dy = 0;
  for (const s of SEALS()) { const u = t - s.t; if (u < 0 || u > 0.3) continue; dy += 4 * Math.sin(Math.PI * u / 0.3) * (1 - u / 0.3); }
  return dy;
};
const Shake: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT();
  return <AbsoluteFill style={{ transform: `translate(0px, ${shakeAt(t).toFixed(2)}px)` }}>{children}</AbsoluteFill>;
};
const SealStamps: React.FC = () => <Draw draw={(ctx, tt, E) => { for (const s of SEALS()) drawSeal(ctx, E, 1810, 860, 128, s.zh, tt - s.t); }} />;
let grainTiles: HTMLCanvasElement[] | null = null;
const GrainVignette: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (!grainTiles) grainTiles = [0, 1, 2, 3].map((k) => {
      const c = document.createElement('canvas'); c.width = 480; c.height = 270;
      const x = c.getContext('2d')!, im = x.createImageData(480, 270), r = rng(900 + k);
      for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - 0.5) * 90; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      x.putImageData(im, 0, 0); return c;
    });
    const ctx = ref.current.getContext('2d')!;
    ctx.drawImage(grainTiles[f % 4], 0, 0, 1920, 1080);
  });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <canvas ref={ref} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'overlay', opacity: 0.16 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 48%, rgba(60,40,20,0) 55%, rgba(60,40,20,0.22) 100%)' }} />
    </AbsoluteFill>
  );
};
// goutte d'encre qui tombe et s'épanouit en lavis (jamais plus de 2 s de papier vide entre deux tableaux)
const inkBloom = (ctx: CanvasRenderingContext2D, x: number, y: number, t0: number, t1: number, tt: number) => {
  // une goutte tombe, l'encre se dilue et gagne tout le cadre (cœur sombre qui pâlit, plusieurs lobes, bords flous) ;
  // à t1 le cadre est couvert d'un lavis gris uniforme (WASH), que la scène suivante reprend et dissipe
  if (tt < t0 || tt > t1) return;
  const fall = clamp((tt - t0) / 0.35);
  if (fall < 1) { const yy = y - 420 * (1 - fall * fall); ctx.fillStyle = rgb(INK, 0.9); ctx.beginPath(); ctx.ellipse(x, yy, 9, 9 + 16 * fall, 0, 0, 7); ctx.fill(); return; }
  const u = clamp((tt - t0 - 0.35) / (t1 - t0 - 0.35)), e = 1 - Math.pow(1 - u, 2.4), r = rng(17);
  ctx.save(); ctx.filter = 'blur(14px)';
  for (let k = 0; k < 7; k++) {
    const a = r() * 6.28, d = (k ? 0.18 + 0.2 * r() : 0) * 1500 * e, R = (40 + 1500 * e) * (k ? 0.55 + 0.35 * r() : 1);
    const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d * 0.7;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    const core = (k ? 0.07 : 0.42) * (1 - u) + WASH * (k ? 0.3 : 1);
    g.addColorStop(0, `rgba(40,36,32,${core})`); g.addColorStop(0.75, `rgba(52,48,44,${WASH * (k ? 0.5 : 1)})`); g.addColorStop(1, 'rgba(52,48,44,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  }
  ctx.restore();
};
const WASH = 0.13;

// un baimiao qui se trace (trace_baimiao.py : R = instant d'arrivée, A = encre), dessiné dans le rectangle (x, y, w, h)
let bmCache: { data: Uint8ClampedArray; cv: HTMLCanvasElement; last: number } | null = null;
const drawBaimiao = (ctx: CanvasRenderingContext2D, p: number, x: number, y: number, w: number, h: number) => {
  const im = IMG.yx;
  if (!im || p <= 0) return;
  if (!bmCache) { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const c = cv.getContext('2d', { willReadFrequently: true })!; c.drawImage(im, 0, 0); bmCache = { data: c.getImageData(0, 0, im.width, im.height).data.slice(), cv, last: -1 }; }
  const thr = p * 262;
  if (Math.abs(thr - bmCache.last) > 0.01) {
    const c = bmCache.cv.getContext('2d', { willReadFrequently: true })!, out = c.createImageData(im.width, im.height), o = out.data, d = bmCache.data;
    for (let i = 0; i < d.length; i += 4) { const a = d[i + 3]; if (!a) continue; const hd = Math.min(1, Math.max(0, (thr - d[i]) / 8)); if (hd <= 0) continue; o[i] = INK[0]; o[i + 1] = INK[1]; o[i + 2] = INK[2]; o[i + 3] = a * hd; }
    c.putImageData(out, 0, 0); bmCache.last = thr;
  }
  ctx.drawImage(bmCache.cv, x, y, w, h);
};

// ════════════════ 1. Accroche : « parler » se dédouble → deux gouttes d'encre donnent 語 et 言 → un diptyque peint se
// révèle (le jour : un repas ; la nuit : une chambre sous la lune) et un pinceau, plein cadre, y écrit le précepte
// 食不語 (jour) 寢不言 (nuit), la caméra collée à sa pointe → 語 puis 言 se détachent des panneaux → « On interdit
// l'un ici, l'autre là » : deux coups de pinceau vermillon les barrent → face à face, ils se répondent
const PRECEPT = '食不語寢不言'.split('');
// le précepte au pinceau (Ma Shan Zheng, forme simplifiée comme dans la voix : 食不语，寝不言)
const PRECEPT_PINCEAU = '食不语寝不言'.split('');
// caractère au pinceau écrit trait par trait : la police est révélée à travers un masque qui suit l'ordre réel des traits
// (médianes Make Me a Hanzi, traits épais) ; à la fin du créneau, le caractère est entier
const brushGlyph = (ctx: CanvasRenderingContext2D, ch: string, medians: number[][][] | null, O: { x: number; y: number; size: number }, pg: number, color: string, a: number, glow: number, glowColor: string) => {
  if (a <= 0 || pg <= 0) return;
  const S = Math.ceil(O.size * 1.25), c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.font = `${O.size}px ShuimoPinceau`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color;
  g.fillText(ch, S / 2, S / 2 + O.size * 0.04);
  if (medians && pg < medians.length) {
    const m = document.createElement('canvas'); m.width = m.height = S; const mc = m.getContext('2d')!;
    mc.strokeStyle = '#fff'; mc.lineCap = 'round'; mc.lineJoin = 'round'; mc.lineWidth = O.size * 0.17;
    const P = (q: number[]) => [S / 2 - O.size / 2 + (q[0] / 1024) * O.size, S / 2 - O.size / 2 + ((900 - q[1]) / 1024) * O.size];
    medians.forEach((med, k) => {
      const f = clamp(pg - k);
      if (f <= 0) return;
      // longueur parcourue de la médiane
      const L: number[] = [0]; for (let j = 1; j < med.length; j++) L.push(L[j - 1] + Math.hypot(med[j][0] - med[j - 1][0], med[j][1] - med[j - 1][1]));
      const lim = L[L.length - 1] * f;
      mc.beginPath(); const p0 = P(med[0]); mc.moveTo(p0[0], p0[1]);
      for (let j = 1; j < med.length; j++) {
        if (L[j] <= lim) { const p = P(med[j]); mc.lineTo(p[0], p[1]); continue; }
        const r = (lim - L[j - 1]) / (L[j] - L[j - 1]), pa = P(med[j - 1]), pb = P(med[j]);
        mc.lineTo(pa[0] + (pb[0] - pa[0]) * r, pa[1] + (pb[1] - pa[1]) * r); break;
      }
      mc.stroke();
    });
    g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0);
  }
  ctx.save(); ctx.globalAlpha *= a;
  if (glow > 0) { ctx.shadowColor = glowColor; ctx.shadowBlur = glow; }
  ctx.drawImage(c, O.x - S / 2, O.y - S / 2);
  ctx.restore();
};
const PKEYS = ['yu_p_shi', 'yu_p_bu', 'yu_kai', 'yu_p_qin', 'yu_p_bu', 'yu_yan_kai'];
// panneaux 16:9 côte à côte ; le précepte s'écrit dans la moitié droite, laissée vide, de chacun
const PANELS = [{ x: 70, y: 200, w: 880, h: 495 }, { x: 970, y: 200, w: 880, h: 495 }];
const PCHAR = (i: number) => ({ x: (i < 3 ? 70 : 970) + 0.74 * 880, y: 295 + (i % 3) * 152, size: 150 });
// pinceau : chaque caractère a son créneau, chaque trait 75 % de geste et 25 % de pinceau levé ; renvoie la progression
// (nombre de traits) et la position de la pointe, qui glisse d'un trait au suivant pendant la pause
const strokeTip = (E: any, key: string, O: { x: number; y: number; size: number }, pr: number) => {
  const D = (W() as any).STROKES?.[key];
  if (!D) return null;
  const n = D.medians.length, i = Math.min(n - 1, Math.floor(pr)), f = pr - Math.floor(pr);
  const P = (m: number[]) => [O.x - O.size / 2 + (m[0] * O.size) / 1024, O.y - O.size / 2 + ((900 - m[1]) * O.size) / 1024];
  const along = (m: number[][], u: number) => {
    const L = [0]; for (let j = 1; j < m.length; j++) L.push(L[j - 1] + Math.hypot(m[j][0] - m[j - 1][0], m[j][1] - m[j - 1][1]));
    const tg = L[L.length - 1] * u; for (let j = 1; j < m.length; j++) if (L[j] >= tg) { const v = (tg - L[j - 1]) / Math.max(1e-6, L[j] - L[j - 1]); return [m[j - 1][0] + (m[j][0] - m[j - 1][0]) * v, m[j - 1][1] + (m[j][1] - m[j - 1][1]) * v]; }
    return m[m.length - 1];
  };
  if (pr >= n) return { tip: P(D.medians[n - 1][D.medians[n - 1].length - 1]), lift: 1 };
  return { tip: P(along(D.medians[i], f)), lift: 0 };
};
const writeSlot = (tt: number, t0: number, t1: number, n: number) => {
  const sl = (t1 - t0) / n; let pr = 0, lift = 0, gap: [number, number] | null = null;
  for (let i = 0; i < n; i++) { const u = (tt - t0 - i * sl) / (0.75 * sl); if (u >= 1) { pr += 1; if (tt < t0 + (i + 1) * sl) { lift = 1; gap = [i, (tt - t0 - i * sl - 0.75 * sl) / (0.25 * sl)]; } } else if (u > 0) pr += u; }
  return { pr, lift, gap };
};
// créneaux d'écriture de chaque caractère, proportionnels à son nombre de traits (w0 → w1)
const charSlots = (w0: number, w1: number) => {
  const N = PKEYS.map((k) => (W() as any).STROKES?.[k]?.medians.length ?? 6), S = N.reduce((a, b) => a + b, 0) + 6 * 0.6;
  let c = w0; return N.map((n) => { const d = ((w1 - w0) * (n + 0.6)) / S, r: [number, number] = [c, c + d]; c += d; return r; });
};
// pointe du pinceau à l'instant tt pendant l'écriture du précepte (w0 → qEnd), et si elle est levée
const brushAt = (E: any, tt: number, w0: number, qEnd: number): { tip: number[]; lifted: number } | null => {
  const SL = charSlots(w0, qEnd);
  for (let i = 0; i < 6; i++) {
    const O = PCHAR(i), key = PKEYS[i], D = (W() as any).STROKES?.[key];
    if (!D) continue;
    const n = D.medians.length, slot = SL[i][1] - SL[i][0], t0 = SL[i][0], t1 = t0 + slot * 0.9;
    if (tt < t0 || tt >= t1 + slot * 0.1) continue;
    const { pr: pg, lift, gap } = writeSlot(tt, t0, t1, n);
    if (gap) { const a2 = strokeTip(E, key, O, gap[0] + 0.999)!, b2 = strokeTip(E, key, O, Math.min(n - 0.001, gap[0] + 1))!; const g2 = ease(gap[1]); return { tip: [a2.tip[0] + (b2.tip[0] - a2.tip[0]) * g2, a2.tip[1] + (b2.tip[1] - a2.tip[1]) * g2], lifted: 1 }; }
    // entre deux caractères : la pointe glisse vers le premier trait du suivant
    if (tt >= t1) { const a2 = strokeTip(E, key, O, n - 0.001)!, nx = i < 5 ? strokeTip(E, PKEYS[i + 1], PCHAR(i + 1), 0)! : a2; const g2 = ease((tt - t1) / (slot * 0.1)); return { tip: [a2.tip[0] + (nx.tip[0] - a2.tip[0]) * g2, a2.tip[1] + (nx.tip[1] - a2.tip[1]) * g2], lifted: 1 }; }
    const st = strokeTip(E, key, O, Math.min(pg, n - 0.001));
    return st ? { tip: st.tip, lifted: lift } : null;
  }
  return null;
};
// grossissement de la vue macro (on ne voit qu'un fragment de caractère)
// tache d'encre qui éclate à l'impact d'une goutte : cœur sombre, gouttelettes projetées, lavis qui boit le papier
const splash = (ctx: CanvasRenderingContext2D, x: number, y: number, t0: number, tt: number, r0 = 150, seed = 1) => {
  const u = tt - t0;
  if (u < -0.35 || u > 2.2) return;
  if (u < 0) { // la goutte tombe
    const f = 1 + u / 0.35, yy = y - 380 * (1 - f * f);
    ctx.fillStyle = rgb(INK, 0.9); ctx.beginPath(); ctx.ellipse(x, yy, 8, 8 + 14 * f, 0, 0, 7); ctx.fill(); return;
  }
  const k = 1 - Math.pow(1 - clamp(u / 0.5), 3), fade = 1 - seg(u, 0.9, 2.2), r = rng(seed);
  ctx.save(); ctx.globalAlpha = fade;
  ctx.filter = 'blur(10px)';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r0 * k * 1.2); g.addColorStop(0, 'rgba(30,26,22,0.55)'); g.addColorStop(0.6, 'rgba(40,36,32,0.25)'); g.addColorStop(1, 'rgba(40,36,32,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r0 * k * 1.2, 0, 7); ctx.fill();
  ctx.filter = 'none';
  for (let i = 0; i < 16; i++) { const a = r() * 7, d = r0 * (0.5 + 0.9 * r()) * k, s = 2 + 7 * r(); ctx.fillStyle = rgb(INK, 0.75); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, s * (1 - 0.4 * k), 0, 7); ctx.fill(); }
  ctx.restore();
};
// caractère au pinceau (police ShuimoPinceau) qui naît d'une tache d'encre : révélé depuis le centre, flou qui se résorbe
const brushChar = (ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, size: number, t0: number, tt: number, a: number) => {
  const u = seg(tt, t0, t0 + 0.7);
  if (u <= 0 || a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.beginPath(); ctx.arc(x, y, size * 0.85 * (1 - Math.pow(1 - u, 3)), 0, 7); ctx.clip();
  ctx.filter = `blur(${(6 * (1 - u)).toFixed(1)}px)`;
  ctx.font = `${size}px ShuimoPinceau`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = inkCss;
  ctx.fillText(ch, x, y + size * 0.04);
  ctx.restore();
};
// coup de pinceau vermillon en diagonale (attaque, plein, sortie effilée), tracé avec la progression p
const slash = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: number, a: number) => {
  if (p <= 0 || a <= 0) return;
  const x0 = x - s, y0 = y - s * 0.75, x1 = x + s, y1 = y + s * 0.75, n = 40, L = Math.round(n * p);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rgb(INK, 0.82); ctx.shadowColor = rgb(GOLD, 0.6); ctx.shadowBlur = 18;
  const pts: number[][] = [];
  for (let i = 0; i <= L; i++) { const f = i / n, w = 30 * Math.sin(Math.PI * Math.min(1, f * 1.15 + 0.08)) * (f < 0.1 ? 0.6 + 4 * f : 1); pts.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + 6 * Math.sin(f * 5), w]); }
  const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny);
  ctx.beginPath();
  pts.forEach(([px, py, w], i) => { const X = px + (nx / nl) * w, Y = py + (ny / nl) * w; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  [...pts].reverse().forEach(([px, py, w]) => ctx.lineTo(px - (nx / nl) * w, py - (ny / nl) * w));
  ctx.closePath(); ctx.fill();
  ctx.restore();
};
// ════════ ouverture « deux ombres » (images/ombres_conseillers.jpg) : dans le noir la lampe s'allume ; dolly lent vers le
// mur ; « parler » se projette en ombre et se scinde sur « deux mots » ; chaque ombre « prononce » son caractère (语, 言 au
// pinceau, forme d'aujourd'hui) qui se met au point comme une projection ; puis le mur s'efface sur le précepte
const OMBRES = true;
const OMB = { yu: [0.33, 0.265], yan: [0.68, 0.265], flame: [0.5, 0.735] };
const OmbresIntro: React.FC = () => {
  const t = useT();
  const di = at('b01', 'dire'), dx = at('b01', 'deux'), y1 = at('b01', 'yu1'), n1 = at('b01', 'yan1'), pr = at('b01', 'precepte');
  const out = ease(seg(t, pr + 0.3, pr + 1.2));
  if (out >= 1) return null;
  const light = ease(seg(t, 0.1, 0.9)), ign = Math.exp(-Math.max(0, t - 0.15) * 5) * seg(t, 0.1, 0.2);
  const flick = 1 + 0.035 * Math.sin(t * 23) * Math.sin(t * 7.3) + 0.02 * Math.sin(t * 41);
  const dolly = ease(seg(t, 0, pr + 1.0)), sc = 1 + 0.17 * dolly, tx = -30 * dolly, ty = -10 * dolly;
  const sway = 3 * Math.sin(t * 5.1) * Math.sin(t * 1.7);
  const word = seg(t, di - 0.15, di + 0.45) * (1 - seg(t, dx + 0.5, dx + 1.1)), split = ease(seg(t, dx - 0.05, dx + 0.9));
  const proj = (at0: number) => ease(seg(t, at0 - 0.25, at0 + 0.55));
  const shadowText: React.CSSProperties = { position: 'absolute', color: 'rgba(38,28,20,0.62)', whiteSpace: 'nowrap', transform: 'translate(-50%, -50%)' };
  const im = IMGSRC.ombres;
  return (
    <AbsoluteFill style={{ background: '#000', opacity: 1 - out, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${sc})`, transformOrigin: '50% 60%' }}>
        <img src={staticFile(im)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `brightness(${(0.06 + 0.94 * light) * flick + 0.25 * ign})` }} />
        <div style={{ position: 'absolute', left: `${OMB.flame[0] * 100}%`, top: `${OMB.flame[1] * 100}%`, width: 560, height: 560, transform: 'translate(-50%, -60%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,190,110,0.38), rgba(255,190,110,0) 70%)', opacity: (light + 1.5 * ign) * flick, mixBlendMode: 'screen' }} />
        <Draw draw={(ctx, tt) => {
          // poussières dans la lumière de la lampe
          const r = rng(4);
          for (let i = 0; i < 70; i++) {
            const x0 = 700 + 520 * r(), y0 = 380 + 480 * r(), sp0 = 0.2 + 0.5 * r(), ph = r() * 7;
            const x = x0 + 30 * Math.sin(tt * sp0 + ph), y = y0 - ((tt * 14 * sp0 + ph * 40) % 420) + 140;
            const d = Math.hypot(x - 960, y - 790) / 520;
            ctx.fillStyle = `rgba(255,220,170,${(0.5 * light * Math.max(0, 1 - d) * (0.4 + 0.6 * r())).toFixed(3)})`;
            ctx.beginPath(); ctx.arc(x, y, 1 + 1.8 * r(), 0, 7); ctx.fill();
          }
        }} />
        {word > 0 && ['par', 'ler'].map((s, i) => (
          <div key={s} style={{ ...shadowText, left: `${50 + (i ? 1 : -1) * (4.3 + 13 * split)}%`, top: `${17 - 2 * split}%`, fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 150, opacity: word * light, filter: 'blur(5px)', marginLeft: sway }}>{s}</div>
        ))}
        {([['语', 'yǔ', OMB.yu, y1], ['言', 'yán', OMB.yan, n1]] as [string, string, number[], number][]).map(([c, py, p, at0]) => {
          const k = proj(at0);
          if (k <= 0) return null;
          return (
            <React.Fragment key={c}>
              <div style={{ ...shadowText, left: `${p[0] * 100}%`, top: `${p[1] * 100}%`, fontFamily: 'ShuimoPinceau', fontSize: 270, opacity: k * light * 0.95, filter: `blur(${(5 + 12 * (1 - k)).toFixed(1)}px)`, transform: `translate(-50%, -50%) scale(${1.18 - 0.18 * k})`, marginLeft: sway * 1.4 }}>{c}</div>
              <div style={{ ...shadowText, left: `${(p[0] + (c === '语' ? -0.1 : 0.1)) * 100}%`, top: `${(p[1] + 0.03) * 100}%`, fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 64, opacity: seg(t, at0 + 0.3, at0 + 0.8) * light * 0.9, filter: 'blur(2.5px)' }}>{py}</div>
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
      {/* vignette */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)' }} />
    </AbsoluteFill>
  );
};
const Opening: React.FC = () => {
  const t = useT();
  const di = at('b01', 'dire'), dx = at('b01', 'deux'), y1 = at('b01', 'yu1'), n1 = at('b01', 'yan1'), pr = at('b01', 'precepte'), ci = at('b01', 'citation');
  const tb = at('b01', 'table'), y2 = at('b01', 'yu2'), lt = at('b01', 'lit'), n2 = at('b01', 'yan2'), it = at('b01', 'interdit'), au = at('b01', 'autre'), df = at('b01', 'difference'), p1 = at('b01', 'p1'), pa = at('b01', 'parler');
  const qEnd = tb - 0.45; // fin de la citation chinoise
  const wEnd = ci + 0.25; // fin de l'écriture au pinceau (le dézoom révèle la phrase pendant que la voix la lit)
  const out = seg(t, B('b01') + 0.2, A('b02') - 0.1);
  // les deux caractères : positions selon la phase (nés au centre ; sur le rouleau ; détachés ; face à face)
  const charPos = (i: 0 | 1, tt: number) => {
    const born = i === 0 ? { x: 640, y: 470 } : { x: 1280, y: 470 };
    const onScroll = PCHAR(i === 0 ? 2 : 5);
    const lifted = i === 0 ? { x: 470, y: 450 } : { x: 1370, y: 450 };
    const face = i === 0 ? { x: 700, y: 470 } : { x: 1220, y: 470 };
    const k1 = ease(seg(tt, (i === 0 ? tb : lt) - 0.1, (i === 0 ? tb : lt) + 0.7)), k2 = ease(seg(tt, df - 0.2, df + 0.8));
    const sz1 = 220;
    let x = onScroll.x + (lifted.x - onScroll.x) * k1, y = onScroll.y + (lifted.y - onScroll.y) * k1, s = sz1 + (340 - sz1) * k1;
    x += (face.x - x) * k2; y += (face.y - y) * k2; s += (380 - s) * k2;
    return { x, y, s, born };
  };
  return (
    <AbsoluteFill>
      <Paper />
      <Cam keys={[[0, 960, 540, 1.04], [dx, 960, 520, 1.0, 1.0], [pr - 0.1, 960, 470, 1.0, 1.0],
        [qEnd + 0.05, 960, 460, 1.0, 1.7], [tb + 0.1, 820, 450, 1.1, 1.0], [lt + 0.1, 1100, 450, 1.1, 1.0], [it - 0.3, 960, 500, 1.0, 1.0], [df - 0.2, 960, 500, 1.02, 1.2], [pa - 0.3, 960, 490, 1.08, 1.0]]}
        punch={[y1 + 0.05, n1 + 0.05, tb + 0.6, lt + 0.6, it + 0.25, au + 0.25, pa + 0.2]}>
        <Draw draw={(ctx, tt, E) => {
          // 0–2 : l'entrée « deux ombres » (OmbresIntro, par-dessus) remplace la goutte, « parler » et 语 / 言 nés de la tache
          if (!OMBRES) splash(ctx, 960, 470, 0.38, tt, 230, 9);
          const pw = OMBRES ? 0 : win(tt, di - 0.2, y1 + 0.2, 0.4), sp = ease(seg(tt, dx + 0.6, y1 - 0.2));
          if (pw > 0) {
            [-1, 1].forEach((sgn) => {
              const a = sgn < 0 ? pw : pw * seg(tt, dx + 0.6, dx + 0.9);
              E.text(ctx, 'parler', 960 + sgn * 320 * sp, 470, { font: 'Cormorant', size: 120, weight: 600, color: inkCss, alpha: a * (sgn > 0 ? 1 : 1) });
            });
          }
          // 2. une goutte d'encre tombe sur chaque « parler » : 语 et 言 en naissent, au pinceau (Ma Shan Zheng ; forme
          // simplifiée d'aujourd'hui, celle que la vidéo retrouve à la fin)
          if (!OMBRES) { splash(ctx, 640, 470, y1, tt, 170, 3); splash(ctx, 1280, 470, n1, tt, 170, 5); }
          const pair = OMBRES ? 0 : win(tt, y1 - 0.05, pr + 0.6, 0.3);
          if (pair > 0) { brushChar(ctx, '语', 640, 470, 400, y1, tt, pair); brushChar(ctx, '言', 1280, 470, 400, n1, tt, pair); }
          // 3. le diptyque se révèle (lavis depuis le centre) ; le précepte s'écrit trait par trait. Caméra en trois temps :
          // gros plan fixe sur le panneau du jour (食不語), travelling rapide vers la nuit (寢不言), puis recul sur la phrase
          const w0m = pr + 0.5, SL0 = charSlots(w0m, wEnd), tN = SL0[3][0];
          const zi = ease(seg(tt, w0m - 0.7, w0m)), zo = ease(seg(tt, wEnd, wEnd + 1.3)), tv = ease(seg(tt, tN - 0.3, tN + 0.25));
          const Z = 1 + 0.9 * zi * (1 - zo);
          const fx = 640 + (1400 - 640) * tv, fy = 447 + 8 * seg(tt, w0m, wEnd);
          const mc = [960 + (fx - 960) * zi * (1 - zo), 460 + (fy - 460) * zi * (1 - zo)];
          ctx.save(); ctx.translate(960, 540); ctx.scale(Z, Z); ctx.translate(-mc[0], -mc[1]);
          const da = seg(tt, pr - 0.1, pr + 0.9) * (1 - seg(tt, it - 0.3, it + 0.5)) * (1 - 0.55 * seg(tt, tb - 0.1, tb + 0.7));
          if (da > 0) {
            PANELS.forEach((pn, k) => {
              const rv = ease(seg(tt, pr + 0.1 * k, pr + 1.1 + 0.1 * k));
              ctx.save(); ctx.globalAlpha = da;
              ctx.beginPath(); ctx.ellipse(pn.x + pn.w / 2, pn.y + pn.h / 2, pn.w * 0.75 * rv, pn.h * 0.75 * rv, 0, 0, 7); ctx.clip();
              const im = k === 0 ? IMG.jour : IMG.nuit;
              if (im) { const s2 = Math.max(pn.w / im.width, pn.h / im.height); ctx.drawImage(im, pn.x + (pn.w - im.width * s2) / 2, pn.y + (pn.h - im.height * s2) / 2, im.width * s2, im.height * s2); }
              else { ctx.fillStyle = k === 0 ? 'rgba(214,204,186,0.6)' : 'rgba(70,78,100,0.45)'; ctx.fillRect(pn.x, pn.y, pn.w, pn.h); E.text(ctx, k === 0 ? 'panneau du jour (repas) — à fournir' : 'panneau de la nuit (chambre) — à fournir', pn.x + pn.w / 2 - 80, pn.y + pn.h / 2, { font: 'Cormorant', size: 34, weight: 700, color: '#4b4038' }); }
              ctx.restore();
              // liseré de montage (soie) autour du panneau
              ctx.save(); ctx.globalAlpha = da * rv; ctx.strokeStyle = 'rgba(70,58,44,0.55)'; ctx.lineWidth = 3; ctx.strokeRect(pn.x - 8, pn.y - 8, pn.w + 16, pn.h + 16); ctx.restore();
            });
            // le précepte, caractère par caractère (1 créneau chacun, de « Un vieux précepte » à la fin de la citation)
            const w0 = w0m, SL = charSlots(w0, wEnd);
            PRECEPT.forEach((c, i) => {
              if (i === 2 && tt > tb - 0.1 && tt < df + 1) return; // 語 détaché
              if (i === 5 && tt > lt - 0.1 && tt < df + 1) return; // 言 détaché
              const O = PCHAR(i), key = PKEYS[i], D = (W() as any).STROKES?.[key];
              if (!D) return;
              const n = D.medians.length, slot = SL[i][1] - SL[i][0], t0 = SL[i][0], t1 = t0 + slot * 0.9;
              const { pr: pg, lift, gap } = writeSlot(tt, t0, t1, n);
              if (pg <= 0) return;
              const tr = ci + (i * (qEnd - ci)) / 6, rd = win(tt, tr, tr + 0.45, 0.12); // la voix le lit
              brushGlyph(ctx, PRECEPT_PINCEAU[i], D.medians, O, pg, i < 3 ? inkCss : 'rgb(238,232,214)', da, 16 * rd, i < 3 ? 'rgba(255,240,200,0.9)' : 'rgba(200,210,255,0.8)');
            });
                        // la main et le pinceau (image détourée, pointe en bas au centre) ; levé entre deux traits
            if (tt > qEnd - 0.3) drawSeal(ctx, E, 1800, 650, 48, '論', tt - qEnd + 0.3);
          }
          ctx.restore();
          // 4. la nuit tombe sur « Au lit » (lavis indigo, lune pâle), se lève sur « On interdit »
          const night = seg(tt, lt - 0.2, lt + 0.8) * (1 - seg(tt, it - 0.2, it + 0.6));
          if (night > 0) {
            ctx.save(); ctx.globalAlpha = night;
            const g = ctx.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, 'rgba(36,44,70,0.34)'); g.addColorStop(1, 'rgba(36,44,70,0.14)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
            ctx.restore();
          }
          // 5. 語 et 言 détachés du rouleau, en vermillon ; barrés ; puis face à face, ils se répondent
          ([0, 1] as const).forEach((i) => {
            const t0 = i === 0 ? tb : lt;
            if (tt < t0 - 0.1 || tt > B('b01') + 0.8) return;
            const { x, y, s } = charPos(i, tt);
            const hit = i === 0 ? y2 : n2, talk = i === 0 ? p1 : pa;
            const pulse = 1 + 0.12 * win(tt, hit, hit + 0.5, 0.15) + 0.14 * win(tt, talk, talk + 0.6, 0.15);
            const glow = 30 * win(tt, t0 + 0.3, t0 + 1.6, 0.4) + 26 * win(tt, talk, talk + 0.8, 0.2);
            ctx.save(); ctx.globalAlpha = 1 - out;
            brushGlyph(ctx, i === 0 ? '语' : '言', null, { x, y, size: s * pulse }, 99, inkCss, 1, glow * 1.3, rgb(GOLD, 0.75));
            ctx.restore();
            // « On interdit l'un ici, l'autre là »
            const st = i === 0 ? it + 0.15 : au;
            slash(ctx, x, y, s * 0.55, seg(tt, st, st + 0.35), 1 - seg(tt, df - 0.2, df + 0.4));
          });
        }} />
      </Cam>
      <Caption text="Entretiens de Confucius 論語 · livre X" a={win(t, wEnd + 1.0, it - 0.2, 0.4)} y={110} size={44} />
      <Caption text="« À table, on ne converse pas. Au lit, on ne parle pas. »" a={win(t, ci + 0.3, it - 0.2, 0.5)} y={905} size={46} />
      {!OMBRES && <Label x={640} y={830} zh="" text="yǔ" color={VER} a={win(t, y1 + 0.5, pr + 0.4, 0.3)} align="center" />}
      {!OMBRES && <Label x={1280} y={830} zh="" text="yán" color={VER} a={win(t, n1 + 0.5, pr + 0.4, 0.3)} align="center" />}
      {OMBRES && <OmbresIntro />}
      <Label x={700} y={790} zh="" text="yǔ" color={VER} a={win(t, df + 0.6, B('b01') + 0.2, 0.3) * (1 - out)} align="center" />
      <Label x={1220} y={790} zh="" text="yán" color={VER} a={win(t, df + 0.6, B('b01') + 0.2, 0.3) * (1 - out)} align="center" />
    </AbsoluteFill>
  );
};

// ════════════════ 2. Les pièces : 言 la parole, 吾 « moi » ; que vient faire « moi » dans la parole ?
const Pieces: React.FC = () => {
  const t = useT();
  const A2 = A('b02'), ga = at('b02', 'gauche'), dr = at('b02', 'droite'), moi = at('b02', 'moi'), en = at('b02', 'enigme'), je = at('b02', 'jeune'), os = at('b02', 'os');
  return (
    <AbsoluteFill>
      <Paper />
      <Cam keys={[[A2 - 0.3, 960, 540, 1.02], [ga - 0.2, 760, 520, 1.1, 1.0], [dr - 0.2, 1160, 520, 1.1, 1.2], [en - 0.2, 1180, 500, 1.16, 1.0], [je, 960, 540, 1.0, 1.2]]} punch={[ga + 0.2, dr + 0.2, en + 0.4]}>
        <Draw draw={(ctx, tt, E) => {
          const a = seg(tt, A2 - 0.4, A2 + 0.3) * (1 - seg(tt, os + 0.4, os + 1.2));
          if (a > 0) {
            // 語 se sépare en deux : 言 glisse à gauche, 吾 à droite (fondu net vers les deux pièces)
            const sep = ease(seg(tt, ga - 0.4, ga + 0.6)) * (1 - ease(seg(tt, je - 0.2, je + 0.8)));
            const pv = seg(tt, ga, ga + 0.4), cw = seg(tt, dr, dr + 0.4);
            const dim = win(tt, en, je + 0.4, 0.4); // l'énigme : 吾 seul allumé, 言 pâlit
            // les pièces partent de leur place dans 語 (言 étroit à gauche, 吾 à droite), grandissent et s'écartent ;
            // 語 s'efface pendant qu'elles s'en détachent (plus de glyphe superposé)
            const xf = ease(clamp(sep / 0.25)), wa = 1 - xf;
            if (wa > 0) E.drawStrokes(ctx, 'yu_kai', { x: 960, y: 500, size: 560, brush: false, color: pig((c) => (c === 'parole' ? pv : cw)), alpha: () => a * wa });
            if (sep > 0) {
              const ps = 560 * (0.62 + 0.38 * sep);
              E.drawStrokes(ctx, 'yu_yan_kai', { x: 960 - 118 - 142 * sep, y: 500 + 4 * (1 - sep), size: ps * (0.78 + 0.22 * sep), brush: false, color: pig(pv), alpha: () => a * xf * (1 - 0.6 * dim) });
              E.drawStrokes(ctx, 'yu_wu_kai', { x: 960 + 86 + 174 * sep, y: 500, size: ps, brush: false, color: pig(cw), alpha: () => a * xf, glow: 26 * dim, glowColor: rgb(AZ, 0.6) });
            }
          }
          inkBloom(ctx, 960, 540, os + 0.3, A('b03') - 0.3, tt);
        }} />
      </Cam>
      <Label x={560} y={880} zh="言" text="la parole" color={VER} a={win(t, ga + 0.2, je, 0.4)} align="center" />
      <Label x={1360} y={880} zh="吾" text="« moi »" color={AZ} a={win(t, moi - 0.2, je, 0.4)} align="center" />
    </AbsoluteFill>
  );
};

// ════════════════ 3. La dynastie Shang : 言 (bouche, langue, son), 五 (cinq traits → croix), 吾
// Anyang vue du ciel : position de la grande salle dans l'image (fraction de la largeur, de la hauteur), cible de la plongée
const ANYANG_HALL = [0.72, 0.49];
const Shang: React.FC = () => {
  const t = useT();
  const A3 = A('b03'), dv = at('b03', 'devin'), sg = at('b03', 'signe'), bo = at('b03', 'bouche'), la = at('b03', 'langue'), so = at('b03', 'son'), ci = at('b03', 'cinq'), tr = at('b03', 'traits'), cr = at('b03', 'croix'), po = at('b03', 'pose'), pq = at('b03', 'pourquoi'), pn = at('b03', 'prononcait');
  const R1 = L.rouleaux[0].debut;
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={14} from={A3 - 1.5} to={R1 + 0.6} move="pan" mood="aube" faint={0.55} />
      <Cam keys={[[A3 - 0.3, 960, 560, 1.0], [dv, 960, 540, 1.0, 2.4], [sg - 0.3, 960, 540, 1.0, 1.0], [bo - 0.2, 720, 620, 1.12, 0.9], [la - 0.1, 720, 540, 1.12, 0.9], [so - 0.1, 720, 440, 1.12, 1.0], [ci - 0.3, 960, 540, 1.0, 1.0], [tr - 0.2, 1240, 540, 1.12, 1.0], [po - 0.3, 1240, 560, 1.06, 1.2], [pq - 0.2, 960, 540, 1.0, 1.0]]}
        punch={[sg + 0.3, bo + 0.2, cr + 0.3, po + 0.8]} calm={[[R1 - 0.6, R1 + 3.6]]}>
        <Draw draw={(ctx, tt, E) => {
          // plan « tableau » : Anyang vue du ciel (lavis), la caméra plonge vers la grande salle, l'estampage s'y pose
          const im = IMG.anyang, ia = 1 - seg(tt, dv + 0.1, dv + 0.9);
          if (im && ia > 0) {
            const k = ease(seg(tt, A3 - 1.1, dv + 0.9)), z = 1 + 1.3 * k;
            const cov = Math.max(1920 / im.width, 1080 / im.height), w = im.width * cov, h = im.height * cov;
            const fx = (ANYANG_HALL[0] - 0.5) * w * k, fy = (ANYANG_HALL[1] - 0.5) * h * k;
            // la grande salle finit là où se pose l'estampage (700, 520)
            ctx.save(); ctx.globalAlpha = ia; ctx.translate(960 - 260 * k, 540 - 20 * k); ctx.scale(z, z); ctx.translate(-fx, -fy);
            ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
          }
          // le lavis de la fin du bloc 2 se dissipe sur Anyang
          const wsh = WASH * (1 - seg(tt, A3 - 1.1, A3 + 0.6));
          if (wsh > 0) { ctx.fillStyle = `rgba(52,48,44,${wsh})`; ctx.fillRect(-200, -200, 2320, 1480); }
          // 言 de l'os : l'estampage se pose sur « le devin grave », le signe s'y révèle en blanc, puis passe à l'encre ; bouche, langue, son (vermillon) chacun sur son mot
          const ya = seg(tt, dv - 0.2, dv + 0.8) * (1 - seg(tt, R1 - 0.5, R1));
          const side = ease(seg(tt, ci - 0.2, ci + 0.8));
          const GY = { x: 700 - 280 * side, y: 520, size: 680 - 280 * side };
          const ink = seg(tt, sg + 0.6, sg + 1.4);
          if (ya > 0) {
            rubbing(ctx, 700, 520, 560, 760, ya * (1 - ink) * (1 - side), 11);
            const k = (c: string) => (c === 'bouche' ? seg(tt, bo, bo + 0.4) : c === 'langue' ? seg(tt, la, la + 0.4) : seg(tt, so, so + 0.4));
            const hi = (c: string) => (c === 'bouche' ? win(tt, bo, la + 0.3, 0.2) : c === 'langue' ? win(tt, la, so + 0.3, 0.2) : win(tt, so, ci, 0.3));
            E.drawRealGlyph(ctx, 'yu_yan_jiaguwen', { ...GY, reveal: () => seg(tt, dv + 0.5, sg + 0.6), opacity: ya,
              color: (c: string) => rgb(mixc(mixc([240, 233, 219], INK, ink), VER, k(c))), glow: 24 * Math.max(hi('bouche'), hi('langue'), hi('trait')), glowColor: rgb(VER, 0.6) });
          }
          // 五 : cinq traits couchés, puis deux traits et une croix (fondu net) ; puis la croix se pose sur une bouche → 吾
          const fa = seg(tt, ci, ci + 0.5) * (1 - seg(tt, R1 - 0.5, R1));
          if (fa > 0) {
            const five = 1 - seg(tt, cr - 0.1, cr + 0.3), cross = seg(tt, cr, cr + 0.4) * (1 - seg(tt, po + 0.6, po + 1.0)), wu = seg(tt, po + 0.6, po + 1.0);
            const G = { x: 1240, y: 520, size: 560 };
            if (five > 0) E.drawRealGlyph(ctx, 'yu_wu5_traits', { ...G, size: 520, reveal: () => seg(tt, tr - 0.2, tr + 1.6), opacity: fa * five, color: () => rgb(mixc(INK, MAL, seg(tt, tr, tr + 0.6))) });
            if (cross > 0) {
              const drop = ease(seg(tt, po, po + 0.8));
              E.drawRealGlyph(ctx, 'yu_wu5_croix', { x: G.x, y: G.y - 40 * drop, size: 520 - 230 * drop, opacity: fa * cross, color: () => rgb(MAL) });
              // la bouche, en azurite, attend sous la croix
              if (drop > 0) E.drawRealGlyph(ctx, 'yu_wu_jiaguwen', { ...G, opacity: fa * drop * (1 - wu), color: (c: string) => (c === 'bouche' ? rgb(AZ) : 'rgba(0,0,0,0)') });
            }
            if (wu > 0) E.drawRealGlyph(ctx, 'yu_wu_jiaguwen', { ...G, opacity: fa * wu, color: pig(1), glow: 22 * win(tt, po + 0.8, pq, 0.4), glowColor: rgb(AZ, 0.5) });
          }
        }} />
      </Cam>
      <Caption text="lecture la plus répandue · autre hypothèse : un instrument à vent" a={win(t, so - 0.1, ci - 0.2, 0.4)} y={860} size={44} left={1060} width={780} />
      <Label x={1240} y={180} zh="五" text="cinq" color={MAL} a={win(t, ci + 0.2, po, 0.4)} align="center" />
      <Label x={1240} y={180} zh="吾" text="« moi »" color={AZ} a={win(t, po + 0.9, pq + 0.2, 0.4)} align="center" />
      <Caption text="吾 = « moi » : sens attesté plus tard, sous les Zhou" a={win(t, po + 1.6, pq - 0.2, 0.4)} y={940} size={44} />
      <Caption text="chinois archaïque : 五 et 吾, tous deux « nga » (reconstruction Baxter-Sagart)" a={win(t, pq + 0.4, R1 - 0.3, 0.4)} y={940} size={44} />
      <Caption text="Anyang · vue imaginée" a={IMG.anyang ? win(t, A3 + 0.4, dv + 0.3, 0.4) : 0} y={955} size={44} />
      <EraTag {...cartouche('shang', 'Anyang · v. 1200 av. J.-C.')} a={seg(t, A3 + 0.2, A3 + 1.0) * (1 - win(t, dv - 0.3, sg + 1.8, 0.3)) * (1 - seg(t, R1 - 0.3, R1))} />
    </AbsoluteFill>
  );
};

// rouleau du temps en 3D (Shang → Zhou, version complète) ; Han → Qing : la carte traverse les âges (cartes/CarteAges)
const R1 = L.rouleaux[0].debut, R2 = (L.plages as any).carte_ages.debut;
const R3A: Rouleau3DConfig = {
  at: R1, de: 'shang', vers: 'zhou', annees: [-1200, -550], variant: 'complet', stone: 'rouge',
  fromLand: { seed: 14, mood: 'aube' }, toLand: { seed: 9, mood: 'jour' }, midSeeds: [17, 21],
  inscriptions: [
    { x: 1500, y: 200, size: 74, font: 'ShuimoKai', cols: ['食不語', '寢不言'], sig: '論語鄉黨', seal: '長樂', ink: 0.88 },
    { x: 5500, y: 170, size: 80, font: 'ShuimoKai', cols: ['言之無文', '行而不遠'], sig: '左傳', seal: '雲水', ink: 0.92 },
  ],
};

// ════════════════ 4. La cloche (fin des Printemps et Automnes) : le premier 語
const Cloche: React.FC = () => {
  const t = useT();
  const PL = L.plages.cloche, A4 = A('b04'), fr = at('b04', 'frappe'), rp = at('b04', 'repond'), fl = at('b04', 'flancs'), ga = at('b04', 'gauche'), de = at('b04', 'dessous'), co = at('b04', 'cote'), re = at('b04', 'rencontre');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={9} from={PL.debut - 0.5} to={B('b04') + 1} move="push" mood="jour" faint={0.5} />
      <Cam keys={[[PL.debut, 960, 540, 1.0], [fl - 0.2, 960, 540, 1.0, 0.6], [ga - 0.3, 860, 470, 1.1, 1.0], [de - 0.2, 760, 660, 1.14, 1.0], [co - 0.2, 1120, 520, 1.12, 1.0], [re - 0.3, 960, 540, 1.02, 1.0]]} punch={[fl + 0.8, re + 0.2]} calm={[[R1 - 0.5, fl]]}>
        <Draw draw={(ctx, tt, E) => {
          const a = seg(tt, fl - 0.4, fl + 0.4) * (1 - seg(tt, B('b04') + 0.3, B('b04') + 0.9));
          if (a <= 0) return;
          // estampage de l'inscription, le signe révélé en blanc, puis passé à l'encre et aux pigments
          const ink = seg(tt, fl + 1.6, fl + 2.6);
          rubbing(ctx, 960, 500, 780, 760, a * (1 - ink), 23);
          const pv = seg(tt, ga - 0.1, ga + 0.4), bw = seg(tt, de - 0.1, de + 0.4), cw = seg(tt, co - 0.1, co + 0.4);
          E.drawRealGlyph(ctx, 'yu_jinwen', { x: 960, y: 520, size: 700, reveal: () => seg(tt, fl, fl + 1.2), opacity: a,
            color: (c: string) => rgb(mixc(mixc([240, 233, 219], INK, ink), P[c], c === 'parole' ? pv : c === 'bouche' ? bw : cw)), glow: 26 * win(tt, re - 0.1, re + 1.2, 0.3), glowColor: 'rgba(246,241,231,0.9)' });
        }} />
      </Cam>
      <Placeholder title="Clip A · le carillon de bronze" sub="Seedance, 10 s (prompt : A_FOURNIR.md) — entrée par la mer de nuages" a={win(t, PL.debut + 0.2, fl - 0.1, 0.5)} />
      <Caption text="cloche 余贎乘兒鐘 · fin des Printemps et Automnes" a={win(t, fl + 0.4, ga - 0.3, 0.4)} y={940} size={44} />
      <Label x={240} y={300} zh="言" text="la parole" color={VER} a={win(t, ga, re + 0.6, 0.3)} align="center" />
      <Label x={240} y={760} zh="口" text="la bouche" color={AZ} a={win(t, de, re + 0.6, 0.3)} align="center" />
      <Label x={1600} y={520} zh="五" text="le cinq" color={MAL} a={win(t, co, re + 0.6, 0.3)} align="center" />
      <EraTag {...cartouche('zhou', 'fin des Printemps et Automnes')} a={r3TagIn(R3A, t) * (1 - win(t, fl - 0.4, fl + 2.6, 0.3)) * (1 - seg(t, B('b04'), B('b04') + 0.5))} />
    </AbsoluteFill>
  );
};

// ════════════════ 5. Les Royaumes combattants : on se dispute ; sur les sceaux, les deux bouches l'une sur l'autre
const STATES = ['秦', '楚', '齊', '燕', '韓', '趙', '魏'];
const Royaumes: React.FC = () => {
  const t = useT();
  const A5 = A('b05'), co = at('b05', 'conseillers'), ar = at('b05', 'argumente'), he = at('b05', 'hesite'), sc = at('b05', 'sceaux'), em = at('b05', 'empile');
  const PB = L.plages.pinceau;
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={26} from={A5 - 1} to={PB.debut + 0.8} move="pan" mood="brume" faint={0.6} />
      <Cam keys={[[A5 - 0.3, 960, 540, 1.0], [sc - 0.3, 760, 540, 1.06, 1.0], [em - 0.2, 830, 520, 1.2, 1.0]]} punch={[sc + 0.3, sc + 1.1, em + 0.3]}>
        <Draw draw={(ctx, tt, E) => {
          // « Sept États » : sept sceaux vermillon se posent l'un après l'autre en arc, puis s'effacent devant les conseillers
          const st = at('b05', 'sept'), so = 1 - seg(tt, co - 0.3, co + 0.2);
          if (so > 0) STATES.forEach((zh, i) => {
            const u = tt - (st + 0.12 * i), x = 360 + i * 200, y = 560 - 70 * Math.sin((Math.PI * i) / 6);
            if (u < 0) return;
            ctx.save(); ctx.globalAlpha = so; drawSeal(ctx, E, x, y, 132, zh, u); ctx.restore();
          });
          // deux empreintes de sceau (璽彙 2774, 3193) : carré vermillon, le signe en réserve (papier)
          [[760, 'yu_xi', sc], [1300, 'yu_xi2', sc + 0.8]].forEach(([x, key, t0]) => {
            const u = tt - (t0 as number), a = clamp(u / 0.08) * (1 - seg(tt, PB.debut, PB.debut + 0.6));
            if (a <= 0) return;
            const k = 1 + 0.25 * (1 - seg(u, 0, 0.14));
            ctx.save(); ctx.globalAlpha = a; ctx.translate(x as number, 520); ctx.scale(k, k);
            ctx.fillStyle = rgb(VER, 0.9); ctx.fillRect(-230, -230, 460, 460); ctx.restore();
            const hi = (c: string) => (key === 'yu_xi' ? win(tt, em, PB.debut, 0.3) * (c === 'cinq' ? 1 : 0) : 0);
            E.drawRealGlyph(ctx, key as string, { x: x as number, y: 520, size: 400 * k, opacity: a, color: (c: string) => (hi(c) > 0 ? rgb(mixc([246, 238, 222], P[c], 0.75 * hi(c))) : '#f6eee0'), glow: 20 * hi('cinq'), glowColor: 'rgba(255,248,235,0.9)' });
          });
        }} />
      </Cam>
      {/* deux conseillers en papier découpé, face à face : ils se renvoient la parole (un balancement chacun son tour) */}
      <Draw draw={(ctx, tt) => {
        const a = win(tt, co, sc + 0.3, 0.5);
        if (a <= 0 || !IMG.ca || !IMG.cb) return;
        const turn = Math.floor(Math.max(0, tt - ar) / 0.8) % 2, ph = ((Math.max(0, tt - ar)) % 0.8) / 0.8, act = seg(tt, ar - 0.2, ar + 0.2);
        ([[IMG.ca, 620, 1, 0], [IMG.cb, 1300, -1, 1]] as [HTMLImageElement, number, number, number][]).forEach(([im, x, dir, who], k) => {
          const enter = ease(seg(tt, co + 0.1 + 0.3 * k, co + 1.0 + 0.3 * k)), H = 620, W2 = (im.width / im.height) * H;
          const lean = act * (turn === who ? 0.07 * Math.sin(Math.PI * ph) : 0) * dir;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(x - dir * 260 * (1 - enter), 900); ctx.rotate(lean);
          ctx.shadowColor = 'rgba(80,20,10,0.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
          ctx.drawImage(im, -W2 / 2, -H, W2, H); ctx.restore();
        });
        // la parole qui passe de l'un à l'autre : trois points d'encre vermillon
        if (act > 0) { const f = ph, dir2 = turn === 0 ? 1 : -1; for (let i = 0; i < 3; i++) { const u = clamp(f * 1.3 - i * 0.15), x = 960 - dir2 * 200 + dir2 * 400 * u; ctx.save(); ctx.globalAlpha = a * act * Math.sin(Math.PI * u); ctx.fillStyle = rgb(VER, 0.9); ctx.beginPath(); ctx.arc(x, 420 - 60 * Math.sin(Math.PI * u), 10, 0, 7); ctx.fill(); ctx.restore(); } }
      }} />
      <Caption text="le cinq dédoublé · sceaux du royaume de Jin" a={win(t, em - 0.1, PB.debut, 0.4)} y={940} size={44} />
      <EraTag {...cartouche('royaumes', 'Ve–IIIe siècle av. J.-C.')} a={seg(t, A5 - 0.4, A5 + 0.4) * (1 - seg(t, PB.debut, PB.debut + 0.5))} />
      {void ar}{void he}
    </AbsoluteFill>
  );
};
// transition sans rouleau : de larges coups de pinceau gris balaient le paysage vers le papier nu
const BrushSweep: React.FC = () => {
  const PB = L.plages.pinceau, t = useT();
  const out = 1 - ease(seg(t, PB.debut + PB.duree - 0.1, PB.debut + PB.duree + 0.9));
  if (t < PB.debut || out <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: out }}><Draw draw={(ctx, tt) => {
      const u = (tt - PB.debut) / (PB.duree + 0.3);
      ctx.save();
      [[260, 0], [560, 0.12], [840, 0.24]].forEach(([y, d]) => {
        const k = ease(clamp((u - d) / 0.55));
        if (k <= 0) return;
        const x1 = -200 + 2400 * k;
        // un large coup de pinceau gris (lavis), bord d'attaque plus sombre, poils secs en traînée
        const r = rng(Math.round(y * 7));
        ctx.save();
        const g = ctx.createLinearGradient(x1 - 1100, 0, x1, 0); g.addColorStop(0, 'rgba(120,112,104,0.0)'); g.addColorStop(0.35, 'rgba(120,112,104,0.32)'); g.addColorStop(0.92, 'rgba(96,88,80,0.5)'); g.addColorStop(1, 'rgba(60,54,48,0.62)');
        ctx.fillStyle = g; ctx.filter = 'blur(3px)';
        ctx.beginPath(); ctx.moveTo(-200, y - 150); ctx.bezierCurveTo(x1 * 0.4, y - 175, x1 * 0.8, y - 160, x1, y - 130); ctx.quadraticCurveTo(x1 + 70, y, x1, y + 130); ctx.bezierCurveTo(x1 * 0.8, y + 165, x1 * 0.4, y + 170, -200, y + 150); ctx.closePath(); ctx.fill();
        ctx.filter = 'none'; ctx.strokeStyle = 'rgba(243,238,228,0.55)'; ctx.lineCap = 'round';
        for (let i = 0; i < 18; i++) { const yy = y - 130 + 260 * r(); ctx.lineWidth = 1.5 + 3 * r(); ctx.beginPath(); ctx.moveTo(x1 - 1000 * (0.3 + 0.7 * r()), yy); ctx.lineTo(x1 - 120 - 200 * r(), yy + (r() - 0.5) * 8); ctx.stroke(); }
        ctx.restore();
      });
      ctx.restore();
    }} /></AbsoluteFill>
  );
};

// ════════════════ 6. La dynastie Han : le dictionnaire tranche (直言曰言，論難曰語)
const QUOTE = '直言曰言論難曰語'.split('');
const Han: React.FC = () => {
  const t = useT();
  const A6 = A('b06'), di = at('b06', 'dico'), qu = at('b06', 'question'), rp = at('b06', 'reponse'), dc = at('b06', 'discuter'), tb = at('b06', 'table'), pl = at('b06', 'pleine'), li = at('b06', 'lit');
  const pz = L.clips.b06.pause!, p0 = A6 + pz.coupe, q0 = qu + 0.9, q1 = p0 - 0.1;
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={3} from={A6 - 0.5} to={B('b06') + 0.6} move="pan" mood="brume" faint={0.35} />
      <Cam keys={[[A6 - 0.3, 960, 540, 1.0], [q0 - 0.2, 760, 540, 1.06, 1.0], [rp - 0.3, 600, 520, 1.1, 1.0], [dc - 0.2, 1200, 520, 1.1, 1.2], [tb - 0.3, 960, 540, 1.0, 1.0]]} punch={[rp + 0.2, dc + 0.3, pl + 0.6]}>
        <Draw draw={(ctx, tt, E) => {
          // deux lattes du Shuowen ; la phrase s'écrit caractère par caractère pendant la citation
          const sa = seg(tt, A6 - 0.2, A6 + 0.8) * (1 - seg(tt, rp - 0.3, rp + 0.3));
          slip(ctx, 820, 110, 760, sa); slip(ctx, 960, 110, 760, sa);
          QUOTE.forEach((c, i) => {
            const t0 = q0 + (i * (q1 - q0)) / QUOTE.length, k = seg(tt, t0, t0 + 0.3);
            const x = i < 4 ? 960 : 820, y = 230 + (i % 4) * 190;
            const hl = c === '言' && i === 1 ? 0 : c === '語' ? seg(tt, p0, p0 + 0.6) : 0;
            E.text(ctx, c, x, y, { font: 'Zhuan', size: 124, color: rgb(mixc(INK, VER, hl)), alpha: sa * k });
          });
          // cascade frappée pendant le silence : bronze, sceau de Jin, petit sceau, un coup chacun
          const cas = 1 - seg(tt, rp + 0.4, rp + 0.9);
          ([['yu_jinwen', 0.0], ['yu_xi', 0.45], ['yu_xiaozhuan', 0.9]] as [string, number][]).forEach(([g, d], i) => {
            const u = tt - (p0 + 0.15 + d), a = clamp(u / 0.08) * cas;
            if (a <= 0) return;
            const k = 1 + 0.25 * (1 - seg(u, 0, 0.14)), y = 250 + i * 290;
            ctx.save(); ctx.globalAlpha = a; ctx.translate(1450, y); ctx.scale(k, k); ctx.strokeStyle = rgb(VER, 0.85); ctx.lineWidth = 5; ctx.strokeRect(-125, -125, 250, 250); ctx.restore();
            E.drawRealGlyph(ctx, g, { x: 1450, y, size: 220 * k, opacity: a, color: pig(1) });
          });
          // la réponse : 言, une bouche tournée vers le vide ; 語, deux bouches et la parole qui fait l'aller-retour
          const ra = seg(tt, rp - 0.2, rp + 0.4) * (1 - seg(tt, tb - 0.4, tb));
          if (ra > 0) {
            E.drawRealGlyph(ctx, 'yu_yan_jiaguwen', { x: 560, y: 470, size: 520, opacity: ra, color: () => rgb(VER) });
            // la parole part tout droit, dans le vide
            const sh = (tt - rp) % 1.6 / 1.6;
            ctx.save(); ctx.globalAlpha = ra * (1 - sh); ctx.strokeStyle = rgb(VER, 0.8); ctx.lineWidth = 6; ctx.setLineDash([16, 14]);
            ctx.beginPath(); ctx.moveTo(560, 220); ctx.lineTo(560, 220 - 160 * sh); ctx.stroke(); ctx.restore();
            const da = seg(tt, dc - 0.2, dc + 0.4);
            if (da > 0) {
              E.drawRealGlyph(ctx, 'yu_xiaozhuan', { x: 1320, y: 470, size: 520, opacity: ra * da, color: pig(1) });
              // la parole fait l'aller-retour entre les deux bouches : une traînée qui passe sous le signe, vermillon à
              // l'aller (言 → 吾), azurite au retour
              const ph = Math.max(0, tt - dc) / 1.3, dir = Math.floor(ph) % 2, xa = 1190, xb = 1450, yy = 740;
              for (let k = 0; k < 9; k++) {
                const fk = 0.5 - 0.5 * Math.cos(clamp((ph % 1) * 1.15 - k * 0.025) * Math.PI), f = dir ? 1 - fk : fk;
                ctx.save(); ctx.globalAlpha = ra * da * (1 - k / 9) * Math.sin(Math.PI * clamp((ph % 1) * 1.15)) ** 0.5; ctx.fillStyle = rgb(dir ? AZ : VER);
                ctx.beginPath(); ctx.arc(xa + (xb - xa) * f, yy + 60 * Math.sin(f * Math.PI), 15 * (1 - k / 11), 0, 7); ctx.fill(); ctx.restore();
              }
            }
          }
        }} />
      </Cam>
      <Caption text="Shuowen jiezi 說文解字 · Xu Shen, vers l'an 100" a={win(t, di, q0 + 0.6, 0.4)} y={955} size={44} />
      <Caption text="« Parler tout droit : 言. Discuter, répliquer : 語. »" a={win(t, p0 + 0.2, rp + 0.2, 0.4)} y={940} size={46} />
      <Label x={560} y={880} zh="言" text="yán" color={VER} a={win(t, rp, tb - 0.4, 0.4)} align="center" />
      <Label x={1320} y={880} zh="語" text="yǔ" color={VER} a={win(t, dc, tb - 0.4, 0.4)} align="center" />
      {/* le banquet silencieux : estampage (image recomposée), révélé sur « Voilà pourquoi on ne 語 pas à table » */}
      <Draw draw={(ctx, tt) => {
        const li = at('b06', 'lit');
        ([[IMG.banquet, win(tt, tb - 0.2, li + 0.2, 0.6), tb, 1010, 1320], [IMG.nuit, win(tt, li - 0.2, B('b06') + 0.4, 0.6), li - 0.2, 960, 1180]] as [HTMLImageElement | undefined, number, number, number, number][]).forEach(([im, a, t0, x0, W]) => {
          if (a <= 0 || !im) return;
          const k = ease(seg(tt, t0, t0 + 6)), z = 1 + 0.1 * k, w = W * z, h = (im.height / im.width) * w;
          ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = 'rgba(30,20,10,0.4)'; ctx.shadowBlur = 40; ctx.drawImage(im, x0 - 30 * k - w / 2, 520 - h / 2, w, h); ctx.restore();
        });
      }} />
      <Caption text="banquet · estampage d'un relief de pierre (image recomposée)" a={win(t, tb + 0.4, at('b06', 'lit'), 0.4)} y={940} size={44} />
      <Caption text="寢不言 · « au lit, on ne parle pas »" a={win(t, at('b06', 'lit') + 0.2, B('b06') + 0.3, 0.4)} y={940} size={46} />
      <EraTag {...cartouche('han', "vers l'an 100 · le dictionnaire")} a={seg(t, A6 - 0.5, A6 + 0.3) * (1 - seg(t, tb - 0.3, tb + 0.2))} />
      {void li}
    </AbsoluteFill>
  );
};

// ════════════════ 7. Yang Xiong et les soldats : carte des parlers, clip B, le livre 方言
const CHANGAN = [108.9, 34.3];
// régions des parlers citées dans le 方言 (repères approximatifs) : d'où viennent les soldats
const DIAL: [string, string, [number, number]][] = [['秦', 'Qin', [105.6, 36.4]], ['晉', 'Jin', [112.4, 37.6]], ['燕', 'Yan', [116.4, 39.9]], ['齊', 'Qi', [118.3, 36.4]], ['楚', 'Chu', [112.4, 30.4]], ['吳越', 'Wu-Yue', [120.2, 30.3]], ['蜀', 'Shu', [104.1, 30.7]]];
const BOOK = '輶軒使者絕代語釋別國方言'.split('');
const YangXiong: React.FC = () => {
  const t = useT();
  const A7 = A('b07'), vo = at('b07', 'voix'), so = at('b07', 'soldats'), cf = at('b07', 'confins'), pi = at('b07', 'pinceau'), an = at('b07', 'annees'), lv = at('b07', 'livre');
  const mapFrom = vo - 0.2, mapTo = pi - 0.1;
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={3} from={A7 - 0.5} to={R2 + 0.6} move="pan" mood="brume" faint={0.4} />
      <Cam keys={[[A7 - 0.3, 960, 540, 1.0], [lv - 0.2, 960, 520, 1.06, 1.2]]} punch={[lv + 0.4]} calm={[[R2 - 0.6, R2 + 5.6]]}>
        <Draw draw={(ctx, tt, E) => {
          // le livre : titre complet en colonne, 語 en vermillon ; 方言 grossit
          const ba = seg(tt, lv - 0.3, lv + 0.4) * (1 - seg(tt, R2 - 0.4, R2));
          if (ba <= 0) return;
          slip(ctx, 1120, 60, 800, ba);
          BOOK.forEach((c, i) => {
            const k = seg(tt, lv - 0.2 + i * 0.05, lv + 0.2 + i * 0.05);
            const big = c === '方' || c === '言' ? seg(tt, lv + 0.8, lv + 1.4) : 0;
            E.text(ctx, c, 1120, 108 + i * 64, { font: 'Zhuan', size: 58, color: c === '語' ? rgb(VER) : inkCss, alpha: ba * k });
            void big;
          });
          E.text(ctx, '方言', 620, 470, { font: 'ShuimoLegende', size: 260, color: inkCss, alpha: ba * seg(tt, lv + 0.6, lv + 1.2) });
        }} />
      </Cam>
      {/* médaillon au trait de Yang Xiong, qui se trace dès qu'il est nommé */}
      <Draw draw={(ctx, tt) => {
        const m = win(tt, A7 - 0.3, mapFrom + 0.3, 0.5);
        if (m <= 0) return;
        ctx.save(); ctx.globalAlpha = m;
        ctx.shadowColor = 'rgba(40,30,20,0.28)'; ctx.shadowBlur = 34; ctx.fillStyle = '#f6f0e4'; ctx.beginPath(); ctx.ellipse(1300, 470, 300, 360, 0, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = rgb(VER, 0.75); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(1300, 470, 284, 344, 0, 0, 7); ctx.stroke(); ctx.clip();
        drawBaimiao(ctx, clamp((tt - (A7 + 0.6)) / 2.6), 1300 - 0.78 * 760, 500 - 0.78 * 400, 1376 * 0.78, 768 * 0.78);
        ctx.restore();
      }} />
      <Label x={560} y={520} zh="揚雄" text="Yang Xiong" color={INK} a={win(t, A7 + 0.8, mapFrom + 0.2, 0.4)} align="center" />
      <Caption text="portrait imaginé" a={win(t, A7 + 1.2, mapFrom + 0.2, 0.4)} y={940} size={44} />
      <MapPanel from={mapFrom} to={mapTo} draw={(ctx, u, E, tt) => {
        const v = carte('chine_centre_nord').vue, vb = v;
        const ca = E.proj(v, CHANGAN);
        // carte peinte (bibliothèque assets/cartes) : lente poussée vers Chang'an
        const z = 1 + 0.07 * ease(seg(tt, mapFrom, mapTo));
        ctx.save(); ctx.translate(ca[0], ca[1]); ctx.scale(z, z); ctx.translate(-ca[0], -ca[1]);
        fondCarte(ctx, E, 'chine_centre_nord');
        // l'empire Han en lavis vermillon très doux
        const ra = seg(tt, mapFrom + 0.3, mapFrom + 1.4);
        if (ra > 0) E.mapLayer(ctx, v, vb, 120, 'yu_han_reg', (c: CanvasRenderingContext2D, w: any) => E.region(c, w, 'han', 'rgba(184,52,36,0.07)', 1), ra);
        // les parlers : cachet, nom, transcription ; puis un trait de pinceau vers Chang'an sur « venus des confins »
        DIAL.forEach(([zh, fr, p], i) => {
          const a = seg(tt, so - 0.4 + i * 0.12, so + 0.1 + i * 0.12);
          if (a <= 0) return;
          const q = E.proj(v, p);
          routePinceau(ctx, q, ca, ease(seg(tt, cf + i * 0.15, cf + 1.1 + i * 0.15)), a, { seed: i * 7 + 3 });
          lieu(ctx, E, q, zh, fr, a, { cote: zh === '蜀' || zh === '秦' ? 'g' : 'd', arrivee: seg(tt, so - 0.4 + i * 0.12, so - 0.2 + i * 0.12), seed: i });
        });
        capitale(ctx, E, ca, '長安', "Chang'an", '長安 · capitale des Han', tt, mapFrom + 0.5, [cf + 0.8, cf + 2.2]);
        ctx.restore();
        creditCarte(ctx, E, 'chine_centre_nord');
        void u;
      }} />
      <Caption text="selon une lettre qui lui est attribuée · d'autres parlers encore" a={win(t, so, mapTo, 0.4)} y={955} size={44} />
      <Placeholder title="Clip B · Yang Xiong et les soldats" sub="Seedance, 12 s (prompt : A_FOURNIR.md) — entrée à travers 語" a={win(t, pi - 0.1, lv - 0.2, 0.5)} />
      <Caption text={<>« Vingt-sept ans » · <i>Fangyan</i> 方言, vers l'an 1</>} a={win(t, an - 0.1, lv - 0.2, 0.4)} y={955} size={44} />
      <Caption text="« les mots des époques passées et les parlers des pays »" a={win(t, lv + 1.2, R2 - 0.3, 0.4)} y={955} size={44} />
      <EraTag {...cartouche('han', "vers l'an 1 · Yang Xiong")} a={seg(t, A7 - 0.4, A7 + 0.4) * (1 - seg(t, R2 - 0.3, R2))} />
      {void an}
    </AbsoluteFill>
  );
};

// ════════════════ 8. Aujourd'hui : 言 → 讠, la mosaïque des mots en 语, la carte des dialectes
const R2E = R2 + AGES_SECONDS;
const MOS0 = at('b08', 'partout') - 0.3;
const MOS: MosaicConfig = {
  glyph: '语',
  words: ['汉语', '英语', '法语', '成语', '语言', '国语', '论语', '口语', '母语', '外语', '日语', '德语', '语法', '语音', '俗语', '谚语', '词语', '手语', '话语', '物语', '标语', '语文', '短语', '双语', '韩语', '俄语', '粤语', '吴语', '闽语', '术语'],
  focus: [
    { word: '汉语', at: at('b08', 'hanyu') - MOS0, label: '汉语 · la langue chinoise' },
    { word: '英语', at: at('b08', 'anglais') - MOS0, label: "英语 · l'anglais" },
    { word: '法语', at: at('b08', 'francais') - MOS0, label: '法语 · le français' },
  ],
  zoomOut: at('b08', 'rien') - MOS0 + 0.4, hold: at('b08', 'rien') - MOS0 + 2.6, out: at('b08', 'ecriture') - MOS0 - 0.6,
  outro: 'condense', outroTo: { x: 385, y: 400, size: 110 }, title: '语 · yǔ', accent: VER,
};
const Today: React.FC = () => {
  const t = useT();
  const A8 = A('b08'), tr = at('b08', 'traits'), pa = at('b08', 'partout'), li = at('b08', 'lois'), ri = at('b08', 'rien'), ec = at('b08', 'ecriture'), ca = at('b08', 'canton');
  const mosEnd = MOS0 + mosaicSeconds(MOS);
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Paper />
      <Cam keys={[[R2E, 960, 540, 1.0], [tr - 0.3, 760, 520, 1.16, 1.2], [pa - 0.6, 960, 540, 1.0, 0.6]]} punch={[tr + 0.8]} calm={[[R2 - 0.6, R2E + 0.4]]}>
        <Draw draw={(ctx, tt, E) => {
          // 語 → 语 : 言 se resserre en deux traits (讠), en vermillon
          const a = seg(tt, R2E - 0.2, R2E + 0.6) * (1 - seg(tt, pa - 0.6, pa - 0.1));
          if (a <= 0) return;
          const s = seg(tt, tr - 0.1, tr + 0.5);
          E.drawStrokes(ctx, 'yu_kai', { x: 960, y: 500, size: 600, brush: false, color: pig((c) => (c === 'parole' ? 1 : 0.35)), alpha: () => a * (1 - s) });
          E.drawStrokes(ctx, 'yu_simp', { x: 960, y: 500, size: 600, brush: false, color: pig((c) => (c === 'parole' ? 1 : 0.35)), alpha: () => a * s, glow: 24 * win(tt, tr + 0.4, pa - 0.6, 0.4), glowColor: rgb(VER, 0.5) });
        }} />
      </Cam>
      <Sequence from={Math.round(MOS0 * fps)} durationInFrames={Math.round((mosEnd - MOS0) * fps)}><AbsoluteFill style={{ opacity: ease(seg(t, MOS0, MOS0 + 0.7)) }}><MosaicTransition cfg={MOS} /></AbsoluteFill></Sequence>
      <Caption text="1956 · 言 → 讠, emprunté à l'écriture cursive" a={win(t, tr - 0.2, pa - 0.6, 0.4)} y={940} size={46} />
      <Caption text="法 fǎ : la loi… et le « Fa » de France 法蘭西" a={win(t, li + 0.2, ri + 0.3, 0.4)} y={110} size={44} />
      <MapPanel from={mosEnd - 0.6} to={B('b08') + 0.6} draw={(ctx, u, E, tt) => {
        const v = carte('chine_centre_sud').vue;
        // carte peinte sur soie (bibliothèque assets/cartes : chine_centre_sud, repeinte sur l'image-guide au même cadrage) ; lente avancée
        // qui emporte aussi les lavis des dialectes, les noms et les repères
        const z = 1 + 0.06 * ease(seg(tt, mosEnd - 0.6, B('b08') + 0.6));
        ctx.save(); ctx.translate(960, 560); ctx.scale(z, z); ctx.translate(-960, -560);
        fondCarte(ctx, E, 'chine_centre_sud');
        // grandes familles de dialectes (zones simplifiées, lavis doux), Pékin et Canton
        const fam: [string, string, number[], [number, number], number][] = [['官話', 'mandarin', [120, 100, 80], [113, 36.5], 300], ['吳', 'wu', [52, 132, 98], [120.3, 30.6], 120], ['贛', 'gan', [176, 112, 52], [115.8, 27.9], 100], ['湘', 'xiang', [140, 90, 140], [111.8, 27.4], 100], ['客家', 'hakka', [90, 120, 160], [115.9, 24.6], 100], ['閩', 'min', [60, 110, 150], [118.4, 25.6], 120], ['粵', 'yue', [184, 52, 36], [110.4, 22.8], 130]];
        fam.forEach(([zh, fr, col, p, r], i) => {
          const a = seg(tt, mosEnd + i * 0.18, mosEnd + 0.5 + i * 0.18);
          if (a <= 0) return;
          const q = E.proj(v, p);
          ctx.save(); ctx.globalAlpha = a; ctx.filter = 'blur(14px)'; ctx.fillStyle = rgb(col, 0.22); ctx.beginPath(); ctx.ellipse(q[0], q[1], r * 1.2, r, 0, 0, 7); ctx.fill(); ctx.restore();
          E.text(ctx, zh, q[0], q[1] - 10, { font: 'ShuimoLegende', size: 66, color: rgb(col), alpha: a });
          E.text(ctx, fr, q[0], q[1] + 44, { font: 'Cormorant', size: 40, weight: 700, color: '#4b4038', alpha: a });
        });
        E.marker(ctx, tt, v, [116.4, 39.9], 'Pékin', '', seg(tt, ec, ec + 0.4), '#c0392b', 1);
        E.marker(ctx, tt, v, [113.3, 23.1], 'Canton', '', seg(tt, ca - 0.3, ca + 0.1), '#c0392b', -1);
        E.text(ctx, '汉语', 330, 400, { font: 'ShuimoLegende', size: 110, color: inkCss, alpha: seg(tt, mosEnd - 0.5, mosEnd) });
        ctx.restore();
        creditCarte(ctx, E, 'chine_centre_sud');
        void u;
      }} />
      <EraTag {...cartouche('aujourdhui', 'depuis 1956')} a={seg(t, R2E - 0.2, R2E + 0.6) * (1 - seg(t, pa - 0.6, pa - 0.1))} />
    </AbsoluteFill>
  );
};

// ════════════════ 9. Scène récapitulative : toutes les formes, chaque composante clignote sur son mot
const FORMS: [string[], string, string][] = [
  [['real:yu_yan_jiaguwen', 'real:yu_wu_jiaguwen'], '甲骨文', 'Shang'],
  [['real:yu_jinwen'], '金文', 'Zhou'],
  [['real:yu_xi'], '璽印', 'Royaumes'],
  [['real:yu_xiaozhuan'], '小篆', 'Qin'],
  [['real:yu_mawangdui'], '帛書', 'Han'],
  [['real:yu_lishu'], '隸書', 'Han'],
  [['kai:yu_kai'], '楷書', 'Tang'],
  [['kai:yu_simp'], '简体', '1956'],
];
// les sous-parties de 言 (bouche, langue, trait) suivent « la parole »
const comp = (c: string) => (c === 'trait' || c === 'langue' ? 'parole' : c);
const drawBand = (ctx: CanvasRenderingContext2D, E: any, tt: number, a: number) => {
  const y = 330, x0 = 260, dx = 200, sz = 180;
  const fo = at('b09', 'formes'), pa = at('b09', 'parole'), ci = at('b09', 'cinq'), bo = at('b09', 'bouche'), fa = at('b09', 'face'), na = at('b09', 'naissance');
  // phase : la composante citée clignote trois fois dans toutes les formes, le reste au gris ; « face à face » : la parole
  // et la bouche ensemble ; « Ainsi naît » : toutes les couleurs
  const hi = tt >= na ? [] : tt >= fa ? ['parole', 'bouche'] : tt >= bo ? ['bouche'] : tt >= ci ? ['cinq'] : tt >= pa ? ['parole'] : [];
  const t0 = tt >= fa ? fa : tt >= bo ? bo : tt >= ci ? ci : pa;
  const k = hi.length ? seg(tt, t0 - 0.05, t0 + 0.3) : 0;
  const blink = hi.length ? 0.5 + 0.5 * Math.cos(Math.min(3, (tt - t0) / 0.32) * Math.PI * 2) : 0;
  const allc = seg(tt, na - 0.1, na + 0.5);
  FORMS.forEach(([keys, zh, fr], i) => {
    const appear = seg(tt, fo - 0.6 + i * 0.12, fo - 0.2 + i * 0.12) * a;
    if (appear <= 0) return;
    const x = x0 + i * dx;
    const color = (c0: string) => {
      const c = comp(c0);
      let col = mixc(INK, P[c] ?? INK, hi.length ? (hi.includes(c) ? 1 : 0) : allc);
      if (hi.length && !hi.includes(c)) col = mixc(col, GREY, k);
      return rgb(col);
    };
    const alpha = (c0: string) => (!hi.length || hi.includes(comp(c0)) ? 1 : 1 - 0.55 * k);
    const glow = hi.length ? 24 * blink * k : 0, gc = P[hi[0] ?? 'parole'];
    ctx.save(); ctx.globalAlpha = appear;
    if (keys.length === 2) {
      // les pièces de l'os, côte à côte (avant que 語 existe)
      E.drawRealGlyph(ctx, keys[0].slice(5), { x: x - 46, y, size: sz * 0.78, color, alpha, glow, glowColor: rgb(gc, 0.8) });
      E.drawRealGlyph(ctx, keys[1].slice(5), { x: x + 46, y, size: sz * 0.78, color, alpha, glow, glowColor: rgb(gc, 0.8) });
      E.text(ctx, 'les pièces, avant 語', x, y - 130, { font: 'Cormorant', size: 38, weight: 700, color: rgb(VER), alpha: appear });
    } else if (keys[0].startsWith('real:')) E.drawRealGlyph(ctx, keys[0].slice(5), { x, y, size: sz, color, alpha, glow, glowColor: rgb(gc, 0.8) });
    else E.drawStrokes(ctx, keys[0].slice(4), { x, y, size: sz * 0.9, brush: false, color, alpha, glow, glowColor: rgb(gc, 0.8) });
    E.text(ctx, zh, x, y + 150, { font: 'ShuimoKai', size: 54, color: inkCss, alpha: appear });
    E.text(ctx, fr, x, y + 206, { font: 'Cormorant', size: 44, weight: 700, color: '#5b4f44', alpha: appear });
    ctx.restore();
  });
  // rubans : une couleur par composante, sous le bandeau ; celui de la composante citée s'épaissit
  const rows: [string, string][] = [['parole', 'la parole 言'], ['cinq', 'le cinq 五'], ['bouche', 'la bouche 口']];
  const grow = seg(tt, fo + 0.4, fo + 1.6);
  rows.forEach(([c, lab], j) => {
    const yy = 640 + j * 62, xa = x0 - 60, xb = x0 + 7 * dx + 60;
    const isHi = hi.includes(c), on = !hi.length || isHi;
    const col = on ? P[c] : mixc(P[c], GREY, k);
    const al = a * grow * (on ? 1 : 1 - 0.5 * k) * (isHi ? 0.75 + 0.25 * blink : 1);
    ctx.save(); ctx.globalAlpha = al; ctx.lineWidth = isHi ? 22 : 14; ctx.lineCap = 'round'; ctx.strokeStyle = rgb(col);
    ctx.beginPath(); ctx.moveTo(xa + 340, yy); ctx.lineTo(xa + 340 + (xb - xa - 340) * grow, yy); ctx.stroke(); ctx.restore();
    E.text(ctx, lab, xa + 300, yy, { font: 'Cormorant', size: 46, weight: 700, align: 'right', color: rgb(col), alpha: al });
  });
};
const Recap: React.FC = () => {
  const t = useT();
  const A9 = A('b09'), fo = at('b09', 'formes'), fa = at('b09', 'face'), na = at('b09', 'naissance'), mo = at('b09', 'mots'), ch = at('b09', 'chengyu');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={30} from={A9 - 1.5} to={END + 0.5} move="pan" mood="aube" faint={0.4} />
      <Cam keys={[[A9 - 0.3, 960, 540, 1.02], [fo - 0.4, 960, 520, 1.0, 1.0], [fa - 0.2, 960, 440, 1.06, 1.0], [mo - 0.4, 960, 540, 1.0, 1.0]]} punch={[at('b09', 'parole'), at('b09', 'cinq'), at('b09', 'bouche'), fa + 0.3, na]}>
        <Draw draw={(ctx, tt, E) => {
          const syn = win(tt, A9 - 0.4, mo + 0.3, 0.6);
          if (syn > 0) drawBand(ctx, E, tt, syn);
          const wa = seg(tt, mo - 0.5, mo + 0.2) * (1 - seg(tt, B('b09') + 0.3, B('b09') + 0.9));
          if (wa > 0) {
            E.drawStrokes(ctx, 'yu_kai', { x: 960, y: 380, size: 420, brush: false, color: pig(1), alpha: () => wa });
          }
        }} />
      </Cam>
      <Caption text="吾 donne le son : les « deux bouches » sont un moyen de s'en souvenir" a={win(t, fa + 0.3, na - 0.1, 0.4)} y={950} size={44} />
      <div style={{ position: 'absolute', width: '100%', top: 650, display: 'flex', justifyContent: 'center', gap: 220, opacity: seg(t, mo - 0.1, mo + 0.4) * (1 - seg(t, B('b09') + 0.3, B('b09') + 0.9)) }}>
        {[['語言', 'yǔyán · la langue', mo], ['成語', 'chéngyǔ · expression figée', ch]].map(([zh, fr, a0]) => (
          <div key={zh as string} style={{ textAlign: 'center', opacity: seg(t, (a0 as number) - 0.1, (a0 as number) + 0.4) }}>
            <div style={{ fontFamily: 'ShuimoLegende', fontSize: 130, color: inkCss, lineHeight: 1.1 }}>{zh}</div>
            <div style={{ fontFamily: 'ShuimoLatin', fontSize: 48, fontWeight: 600, color: '#4b4038' }}>{fr}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', width: '100%', top: 900, textAlign: 'center', opacity: win(t, ch + 1.2, B('b09') + 0.6, 0.5) }}>
        <span style={{ fontFamily: 'ShuimoLegende', fontSize: 64, color: inkCss }}>自<span style={{ color: rgb(VER) }}>言</span>自<span style={{ color: rgb(VER) }}>語</span></span>
        <span style={{ fontFamily: 'ShuimoLatin', fontSize: 46, fontWeight: 600, color: '#4b4038', marginLeft: 26 }}>zì yán zì yǔ · « parler tout seul »</span>
      </div>
    </AbsoluteFill>
  );
};

// ════════════════ 10. Chute (deux bouches face à face) et passerelle 師
const Chute: React.FC = () => {
  const t = useT();
  const A10 = A('b10'), cv = at('b10', 'converser'), ma = at('b10', 'maitre'), ar = at('b10', 'armee');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={30} from={A10 - 1} to={END + 0.6} move="still" mood="aube" faint={0.4} />
      <Cam keys={[[A10 - 0.3, 960, 540, 1.0], [cv - 0.2, 1100, 520, 1.06, 1.4], [ma - 0.2, 1300, 520, 1.1, 1.2]]} punch={[cv + 0.4, ma + 0.3, ar + 0.4]}>
        <Draw draw={(ctx, tt, E) => {
          // les deux bouches face à face : 言 de l'os à gauche, 吾 de l'os à droite ; la parole fait l'aller-retour
          const fa = seg(tt, A10 - 0.3, A10 + 0.6) * (1 - seg(tt, ma - 0.4, ma + 0.2));
          if (fa > 0) {
            E.drawRealGlyph(ctx, 'yu_yan_jiaguwen', { x: 820, y: 500, size: 460, opacity: fa, color: pig(1) });
            const rep2 = seg(tt, cv, cv + 0.5);
            E.drawRealGlyph(ctx, 'yu_wu_jiaguwen', { x: 1380, y: 500, size: 460, opacity: fa * (0.35 + 0.65 * rep2), color: pig(1), glow: 18 * win(tt, cv + 0.4, ma, 0.4), glowColor: rgb(AZ, 0.5) });
          }
          // 師 : le tertre 𠂤 de l'os, esquissé en vermillon, puis 師 calligraphié
          const sa = seg(tt, ma - 0.2, ma + 0.6);
          if (sa > 0) {
            E.drawRealGlyph(ctx, 'yu_shi_jiaguwen', { x: 1300, y: 500, size: 560, reveal: () => seg(tt, ma, ma + 1.4), opacity: sa, color: () => rgb(mixc(INK, VER, seg(tt, ar, ar + 0.6))) });
            E.drawStrokes(ctx, 'yu_shi_kai', { x: 1680, y: 500, size: 300, progress: 10 * seg(tt, ma + 0.6, ma + 2.4), brush: false, color: () => inkCss, alpha: () => sa * 0.85 });
          }
        }} />
      </Cam>
      <div style={{ position: 'absolute', left: 180, top: 260, opacity: win(t, A10 - 0.2, ma + 0.2, 0.6) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 240, color: inkCss, lineHeight: 1 }}>語</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 90, fontWeight: 600, color: inkCss }}>yǔ</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 54, fontWeight: 600, color: rgb(VER) }}>14 traits · 语 9 traits</div>
      </div>
      <Caption text="師 · shī · le maître" a={win(t, ma + 0.3, ar, 0.4)} y={880} size={58} />
      <Caption text="à l'origine : une troupe en campagne (二千五百人為師)" a={win(t, ar + 0.2, END + 0.2, 0.4)} y={955} size={44} />
    </AbsoluteFill>
  );
};

// écran de fin (≈ 10 s) sur papier : la marque et le prochain caractère dans le tiers gauche ; les deux tiers droits
// restent libres pour les éléments de fin YouTube
const EndCard: React.FC = () => {
  const t = useT(), a = seg(t, END, END + 0.8);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Paper />
      <Landscape seed={30} from={END - 1} to={YU_SECONDS + 1} move="still" mood="aube" faint={0.35} />
      <div style={{ position: 'absolute', left: 120, top: 150, width: 520, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ width: 104, height: 104, background: rgb(VER, 0.95), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 46, color: '#f6eee0', writingMode: 'vertical-rl', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>墨道</div>
          <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss, lineHeight: 1.15 }}>LA VOIE<br />DE L'ENCRE</div>
        </div>
        <div style={{ marginTop: 70, fontFamily: 'ShuimoLatin', fontSize: 46, color: '#5e5044', opacity: seg(t, END + 0.8, END + 1.6) }}>Prochain caractère</div>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 260, lineHeight: 1, color: inkCss, opacity: seg(t, END + 1.2, END + 2.2) }}>師</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 60, fontWeight: 600, color: '#3b322b', opacity: seg(t, END + 1.6, END + 2.6) }}>shī · le maître</div>
      </div>
    </AbsoluteFill>
  );
};

const Win: React.FC<{ from: number; to: number; fade?: number; children: React.ReactNode }> = ({ from, to, fade = 0, children }) => {
  const t = useT();
  if (t < from - fade || t >= to) return null;
  return fade > 0 ? <AbsoluteFill style={{ opacity: ease(seg(t, from - fade, from)) }}>{children}</AbsoluteFill> : <>{children}</>;
};
const SFX = (L.bruitages ?? []) as [string, number, number][];

export const YuV1: React.FC = () => {
  const ready = useSetup();
  const { fps } = useVideoConfig();
  const t = useT();
  const clips: Clip[] = ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b08', 'b09', 'b10'];
  const voice = (k: Clip) => {
    const c = L.clips[k];
    if (!c.pause) return <Sequence key={k} from={Math.round(c.debut * fps)}><Audio src={staticFile(`episodes/yu/voix/${k}.wav`)} /></Sequence>;
    return (
      <React.Fragment key={k}>
        <Sequence from={Math.round(c.debut * fps)} durationInFrames={Math.round(c.pause.coupe * fps)}><Audio src={staticFile(`episodes/yu/voix/${k}.wav`)} /></Sequence>
        <Sequence from={Math.round((c.debut + c.pause.coupe + c.pause.duree) * fps)}><Audio src={staticFile(`episodes/yu/voix/${k}.wav`)} startFrom={Math.round(c.pause.coupe * fps)} /></Sequence>
      </React.Fragment>
    );
  };
  const PB = L.plages.pinceau;
  return (
    <AbsoluteFill style={{ background: '#f3eee4' }}>
      {ready && <Shake>
        <Win from={0} to={A('b02') - 0.1}><Opening /></Win>
        <Win fade={0.8} from={A('b02') - 0.1} to={A('b03') - 0.3}><Pieces /></Win>
        <Win fade={0.8} from={A('b03') - 0.3} to={R1 + 0.6}><Shang /></Win>
        <Win from={R1 + 0.6} to={A('b05') - 0.3}><Cloche /></Win>
        <Win fade={0.8} from={A('b05') - 0.3} to={PB.debut + PB.duree}><Royaumes /></Win>
        <Win fade={0.8} from={PB.debut + PB.duree} to={A('b07') - 0.3}><Han /></Win>
        <Win fade={0.8} from={A('b07') - 0.3} to={R2 + 0.6}><YangXiong /></Win>
        <Win from={R2E - 0.8} to={A('b09') - 0.3}><Today /></Win>
        <Win fade={0.8} from={A('b09') - 0.3} to={A('b10') - 0.3}><Recap /></Win>
        <Win fade={0.8} from={A('b10') - 0.3} to={END + 0.8}><Chute /></Win>
        <Win from={END} to={YU_SECONDS + 1}><EndCard /></Win>
        <BrushSweep />
        <SealStamps />
      </Shake>}
      {ready && <Win from={R1 - 1.5} to={R1 + r3Seconds(R3A) + 3.5}><Rouleau3DStage cfg={R3A} /></Win>}
      {/* Han → Qing : la carte traverse les âges ; fondu d'entrée sur Yang Xiong, fondu de sortie sur 1956 */}
      {ready && <Win fade={0.5} from={R2 - 0.1} to={R2E + 0.7}>
        <AbsoluteFill style={{ opacity: 1 - seg(t, R2E - 0.1, R2E + 0.7) }}>
          <Sequence from={Math.round(R2 * fps)} durationInFrames={Math.round((AGES_SECONDS + 1) * fps)}><EssaiCarteAges /></Sequence>
        </AbsoluteFill>
      </Win>}
      {ready && <GrainVignette />}
      {SFX.map(([n, tt, v], i) => (
        <Sequence key={`sfx${i}`} from={Math.round(tt * fps)}><Audio src={staticFile(`episodes/yu/audio/sfx_${n}.wav`)} volume={v} /></Sequence>
      ))}
      {clips.map(voice)}
      <Audio src={staticFile('episodes/yu/audio/musique.wav')} volume={0.55} />
    </AbsoluteFill>
  );
};
