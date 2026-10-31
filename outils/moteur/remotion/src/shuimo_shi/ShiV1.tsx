// 師 (shī), version tout shuimo — episodes/shi/PROPOSITION.md (v3), textes episodes/shi/VOIX.md (v3).
// « Une armée dans 老师 » : 师 → 師, la moitié gauche grouille de soldats → rappel du 語 → frise du temps (Ramsès II / les
// Shang), la butte 𠂤, le camp en trois carrés (essaim, signature 1) → rouleau 2D Shang → Zhou → carte des quatorze armées,
// le bronze et son second dessin → 帀 : le pied qui part, renversé, la ronde (clip à fournir), l'anneau de pas (signature 2),
// 匝 → le 師氏 à la porte du palais ; silence ; l'armée s'assied et se condense en 師 (signature 3) → Jin : 師曠 (白描 à
// fournir), les grues → rouleau 3D complet → Tang : le Discours sur le maître → scène récapitulative (butte, pied, 1956) →
// chute : 一日為師，終身為父, passerelle 父 → écran de fin.
// Ligne de temps lue dans les repères (episodes/shi/voix/reperes.json, « _ligne »).
// Pigments constants : la butte 𠂤 en ocre rouge (赭石), le pied qui fait le tour 帀 en malachite, le maître en vermillon.
// En attente (emplacements marqués à l'écran) : clip Seedance (ronde de nuit), 白描 de 師曠, image de Han Yu.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose, Mood } from '../shuimo/layout';
import { rng } from '../shuimo/common';
import { GrainVignette, Shake } from '../commun/Effets';
import { INK, PIGMENT } from '../shuimo_xue/InkStage';
import { Era, TimeScrollConfig, TimeScrollStage, arrivePose, cursorPose, morphK, tagIn } from '../rouleau/TimeScroll';
import { Rouleau3DConfig, Rouleau3DStage, r3Seconds, r3TagIn } from '../rouleau3d/Rouleau3D';
import { cartouche, periode } from '../periodes';
import { loadLegacy, W } from '../legacy';
import { capitale, carte, chargerCartes, creditCarte, fondCarte, lieu } from '../cartes/CartePeinte';
import { Pt, anneau, butte, carres, classe, dessinerEssaim, empreintes, memo, silhouette, source, sprite } from '../essaim/Essaim';
import rep from '../data/episodes/shi.json';

type Clip = 'b01' | 'b02' | 'b03' | 'b04' | 'b05' | 'b06' | 'b07' | 'b08' | 'b09' | 'b10';
type Rep = Record<Clip, { duration: number; cues: Record<string, number> }> & {
  _ligne: { clips: Record<Clip, { debut: number; duree: number; pause?: { coupe: number; duree: number } }>; rouleaux: { debut: number; duree: number }[]; fin: number; total: number; bruitages?: [string, number, number][];
    musique_fin?: { fichier: string; debut: number; fin_voix: number; fin: number; volume_voix: number; volume: number; montee: number; fondu: number; depart: number } };
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
export const SHI_SECONDS = Math.ceil(L.total * 10) / 10;
const END = L.fin;
const MF = L.musique_fin;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const inkCss = rgb(INK);
// pigments constants : la butte en ocre rouge, le pied qui fait le tour en malachite, le maître en vermillon ; ceux du 語 (rappel)
const VER = PIGMENT.hand, MAL = PIGMENT.roof, AZ = PIGMENT.child;
const OCRE = [168, 92, 48], GOLD = [184, 140, 58], GREY = [168, 160, 150], PAPER = [240, 233, 219];
const P: Record<string, number[]> = { butte: OCRE, tour: MAL, cadre: INK, main: VER, hache: [112, 70, 40], parole: VER, bouche: AZ, cinq: MAL, trait: VER, langue: VER };
const pig = (k: number | ((c: string) => number)) => (c: string) => rgb(mixc(INK, P[c] ?? INK, typeof k === 'number' ? k : k(c)));
const useT = () => useCurrentFrame() / useVideoConfig().fps;

// ── images de l'épisode (facultatives : emplacement marqué tant qu'elles manquent)
const IMGSRC = { shikuang: 'episodes/shi/images/shikuang_baimiao.png', hanyu: 'episodes/shi/images/hanyu_lampe.jpg' };
const IMG: Partial<Record<keyof typeof IMGSRC, HTMLImageElement>> = {};
const useSetup = () => {
  const [h] = useState(() => delayRender('polices + moteur'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
      new FontFace('ShuimoPinceau', `url(${staticFile('fonts/MaShanZheng-Regular.ttf')})`).load(),
      new FontFace('ShuimoLegende', `url(${staticFile('fonts/ZhuqueFangsong-Regular.ttf')})`).load().catch(() => new FontFace('ShuimoLegende', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load()),
      chargerCartes(['chine_centre_nord']),
      ...Object.entries(IMGSRC).map(([k, src]) => new Promise<void>((res) => { const im = new Image(); im.onload = () => { IMG[k as keyof typeof IMGSRC] = im; res(); }; im.onerror = () => res(); im.src = staticFile(src); })),
    ]).then((fs) => { fs.slice(0, 4).forEach((f) => document.fonts.add(f as FontFace)); return loadLegacy({ three: false, captions: false }); }).then(() => { setReady(true); continueRender(h); });
  }, [h]);
  return ready;
};

// canvas de dessin en pleine définition (1440p net) : 1920 × 1080 × DRAW_K, flous d'ombre multipliés d'autant (modèle : XueV2)
const DRAW_K = Math.min(2, Math.max(1, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1) * 1.15);
const echelleOmbres = (ctx: CanvasRenderingContext2D, k: number) => {
  const Pr = CanvasRenderingContext2D.prototype;
  for (const n of ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY'] as const) {
    const d = Object.getOwnPropertyDescriptor(Pr, n)!;
    Object.defineProperty(ctx, n, { get() { return d.get!.call(this) / k; }, set(v: number) { d.set!.call(this, v * k); } });
  }
};
const Draw: React.FC<{ draw: (ctx: CanvasRenderingContext2D, t: number, E: any) => void }> = ({ draw }) => {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const E = W().E;
    if (!E || !ref.current) return;
    const ctx = ref.current.getContext('2d')!;
    if (!(ctx as any).__k) { echelleOmbres(ctx, DRAW_K); (ctx as any).__k = true; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ref.current.width, ref.current.height);
    ctx.setTransform(DRAW_K, 0, 0, DRAW_K, 0, 0);
    draw(ctx, t, E);
  });
  return <canvas ref={ref} width={Math.round(1920 * DRAW_K)} height={Math.round(1080 * DRAW_K)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
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

// ── cartouches, étiquettes, légendes (tailles lisibles sur téléphone ; rien dans les 8 % du bas)
const EraTag: React.FC<{ zh: string; name: string; dates: string; a: number }> = ({ zh, name, dates, a }) => (
  <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a }}>
    <div style={{ width: 92, height: 92, background: rgb(VER, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, lineHeight: 1, color: '#f6eee0', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 36, fontWeight: 500, color: '#5e5044' }}>{dates}</div>
    </div>
  </div>
);
const Label: React.FC<{ x: number; y: number; zh: string; text: string; color: number[]; a: number; align?: 'left' | 'right' | 'center' }> = ({ x, y, zh, text, color, a, align = 'left' }) => (
  <div style={{ position: 'absolute', top: y - 50, ...(align === 'center' ? { left: x - 500, width: 1000, justifyContent: 'center' } : align === 'left' ? { left: x } : { right: 1920 - x }), opacity: a, display: 'flex', alignItems: 'baseline', gap: 14, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
    <span style={{ fontFamily: 'ShuimoKai', fontSize: 100, color: rgb(color) }}>{zh}</span>
    <span style={{ fontFamily: 'ShuimoLatin, ShuimoLegende', fontSize: 66, fontWeight: 600, color: '#3b322b', textShadow: '0 0 10px rgba(246,241,231,0.95)' }}>{text}</span>
  </div>
);
const Caption: React.FC<{ text: React.ReactNode; a: number; y?: number; size?: number }> = ({ text, a, y = 900, size = 44 }) => (
  <div style={{ position: 'absolute', left: 0, width: 1920, top: Math.min(y, 975 - 1.7 * Math.max(size, 44)), textAlign: 'center', opacity: a }}>
    <span style={{ display: 'inline-block', padding: '4px 22px', borderRadius: 14, background: 'rgba(246,241,231,0.8)', fontFamily: 'ShuimoLatin, ShuimoLegende', fontSize: Math.max(size, 44), color: '#4b4038', textShadow: '0 0 10px rgba(246,241,231,0.9)' }}>{text}</span>
  </div>
);
const Placeholder: React.FC<{ title: string; sub: string; a: number }> = ({ title, sub, a }) => (
  <AbsoluteFill style={{ opacity: a, alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 1200, height: 560, border: `4px dashed ${rgb(VER, 0.6)}`, borderRadius: 18, background: 'rgba(246,241,231,0.78)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 700, fontSize: 60, color: inkCss }}>{title}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: '#5e5044' }}>{sub}</div>
    </div>
  </AbsoluteFill>
);

// ── caméra (modèle YuV1) : spline de Hermite monotone à travers les clés [t, x, y, zoom, d], respiration, punch doux
type K = [number, number, number, number, number?];
const hermite = (ts: number[], vs: number[], t: number) => {
  const n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];
  let i = 0; while (t > ts[i + 1]) i++;
  const sl = (a: number) => (vs[a + 1] - vs[a]) / (ts[a + 1] - ts[a]);
  const tan = (k: number) => { if (k === 0 || k === n - 1) return 0; const a = sl(k - 1), b = sl(k); return a * b <= 0 ? 0 : (2 * a * b) / (a + b); };
  const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * tan(i) + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * tan(i + 1);
};
const Cam: React.FC<{ keys: K[]; punch?: number[]; calm?: [number, number][]; children: React.ReactNode }> = ({ keys, punch = [], calm = [], children }) => {
  const t = useT();
  const ts: number[] = [], xs: number[] = [], ys: number[] = [], zs: number[] = [];
  keys.forEach(([kt, x, y, z, d = 1.2], k) => {
    const a = k === 0 ? kt : Math.max(kt + Math.max(d, 1.6), ts[ts.length - 1] + 0.4);
    ts.push(a); xs.push(x); ys.push(y); zs.push(z);
  });
  let cx = hermite(ts, xs, t), cy = hermite(ts, ys, t), s = hermite(ts, zs, t);
  s *= 1 + 0.018 * (0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 16));
  cx += 12 * Math.sin((t * 2 * Math.PI) / 19); cy += 7 * Math.sin((t * 2 * Math.PI) / 23);
  for (const p of punch) { const u = seg(t, p - 0.2, p + 1.2); s *= 1 + 0.035 * Math.sin(Math.PI * u) ** 2; }
  const amp = 1 - Math.max(0, ...calm.map(([a, b]) => win(t, a, b, 0.6)));
  s = 1 + (s - 1) * amp;
  cx = Math.min(1920 - 960 / s, Math.max(960 / s, cx)); cy = Math.min(1080 - 540 / s, Math.max(540 / s, cy));
  return <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${960 - cx * s}px, ${540 - cy * s}px) scale(${s})` }}>{children}</AbsoluteFill>;
};

// ── estampage (rectangle d'encre sombre, grain de pierre) ; le signe y apparaît en blanc
const rubbing = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number, seed = 5) => {
  if (a <= 0) return;
  const r = rng(seed);
  ctx.save(); ctx.globalAlpha = a;
  ctx.beginPath();
  const n = 60;
  for (let i = 0; i <= n; i++) ctx.lineTo(x - w / 2 + (w * i) / n, y - h / 2 + (r() - 0.5) * 10);
  for (let i = 0; i <= n; i++) ctx.lineTo(x + w / 2 + (r() - 0.5) * 10, y - h / 2 + (h * i) / n);
  for (let i = 0; i <= n; i++) ctx.lineTo(x + w / 2 - (w * i) / n, y + h / 2 + (r() - 0.5) * 10);
  for (let i = 0; i <= n; i++) ctx.lineTo(x - w / 2 + (r() - 0.5) * 10, y + h / 2 - (h * i) / n);
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 40, x, y, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(38,34,31,0.9)'); g.addColorStop(1, 'rgba(22,20,18,0.96)');
  ctx.fillStyle = g; ctx.fill(); ctx.clip();
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(200,192,180,${0.03 + 0.06 * r()})`; ctx.fillRect(x - w / 2 + r() * w, y - h / 2 + r() * h, 1 + 3 * r(), 1 + 3 * r()); }
  ctx.restore();
};
// sceau d'époque qui frappe (bas droite)
const drawSeal = (ctx: CanvasRenderingContext2D, E: any, x: number, y: number, size: number, zh: string, u: number) => {
  const drop = seg(u, 0, 0.14), life = 1 - seg(u, 2.6, 3.4);
  if (u < 0 || life <= 0) return;
  const sc = 1 + 0.6 * (1 - drop), a = drop * life;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.04); ctx.scale(sc, sc); ctx.globalAlpha = a;
  if (drop < 1) { ctx.shadowColor = 'rgba(40,20,10,0.35)'; ctx.shadowBlur = 30 * (1 - drop); ctx.shadowOffsetY = 18 * (1 - drop); }
  const r = rng(zh.charCodeAt(0)), h = size / 2;
  ctx.beginPath(); ctx.rect(-h, -h, size, size); ctx.fillStyle = rgb(VER, 0.92); ctx.fill();
  ctx.shadowColor = 'transparent';
  E.text(ctx, zh, 0, size * 0.04, { font: 'ShuimoKai', size: size * 0.72, color: '#f6eee0' });
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * size * 0.95, (r() - 0.5) * size * 0.95, 1 + r() * 3.5, 0, 7); ctx.fillStyle = `rgba(0,0,0,${0.4 + 0.5 * r()})`; ctx.fill(); }
  ctx.restore();
};
const SEALS = () => [
  { t: at('b03', 'campe') + 0.2, zh: '商' },
  { t: at('b04', 'bronzes') + 1.4, zh: '周' },
  { t: at('b07', 'jin') + 0.5, zh: '晉' },
  { t: at('b08', 'tang') + 0.4, zh: '唐' },
];
const SealStamps: React.FC = () => <Draw draw={(ctx, tt, E) => { for (const s of SEALS()) drawSeal(ctx, E, 1810, 860, 128, s.zh, tt - s.t); }} />;
// vol d'oiseaux (ou de grues) d'encre
const birds = (ctx: CanvasRenderingContext2D, tt: number, t0: number, t1: number, y0: number, dir = 1, n = 5, seed = 3, size = 1) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const u = (tt - t0 - 0.22 * i) / (t1 - t0), o = r(), p = r();
    if (u < 0 || u > 1) continue;
    const x = dir > 0 ? -90 + 2100 * u : 2010 - 2100 * u, y = y0 + 38 * Math.sin(u * 5 + i) - 130 * u + (o - 0.5) * 150;
    const s = (20 + 14 * p) * size, wing = 0.5 + 0.5 * Math.sin(tt * 5 + i * 1.9), lift = s * (0.15 + 0.65 * wing);
    ctx.save(); ctx.globalAlpha = 0.8 * seg(u, 0, 0.08) * (1 - seg(u, 0.92, 1)); ctx.strokeStyle = inkCss; ctx.lineWidth = 3.5 * size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - s, y - lift); ctx.quadraticCurveTo(x - s * 0.45, y - lift - 5, x, y); ctx.quadraticCurveTo(x + s * 0.45, y - lift - 5, x + s, y - lift); ctx.stroke(); ctx.restore();
  }
};

// ── l'essaim : soldats de l'épisode (positions mémorisées)
const N_CAMP = 750;
const CAMP_C: Pt[] = [[1400, 620], [960, 770], [520, 620]]; // à droite, au centre, à gauche (dans l'ordre de la voix)
const MOUND: Pt = [960, 600];
const campPts = () => memo('camp', () => carres(N_CAMP, CAMP_C, 25, 16));
const butteSil = (E: any) => memo('butte', () => silhouette(260, [960, 520], 520, (g, s) => E.drawStrokes(g, 'shi_kai', { x: s / 2, y: s / 2, size: s, brush: false, color: () => '#000', alpha: (c: string) => (c === 'butte' ? 1 : 0) }), 'butte'));
const poseMarche = (_: number, k: number) => (k < 1 && k > 0 ? 'marche' : 'debout') as 'marche' | 'debout';

// ════════════════ 1. Accroche : 师 se trace, 老师 ; 師 traditionnel, la butte grouille de soldats ; « Comment une armée… »
const Opening: React.FC = () => {
  const t = useT();
  const la = at('b01', 'laoshi'), sh = at('b01', 'shi'), po = at('b01', 'pourtant'), dm = at('b01', 'deux_mille'), en = at('b01', 'ennemi'), qu = at('b01', 'question');
  const out = seg(t, B('b01') + 0.3, A('b02') - 0.1);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Paper />
      <Cam keys={[[0, 960, 540, 1.04], [la - 0.2, 960, 540, 1.0, 1.0], [po - 0.2, 960, 530, 1.02, 1.0], [dm - 0.2, 860, 520, 1.12, 1.0], [qu - 0.3, 960, 540, 1.0, 1.0]]} punch={[la + 0.2, dm + 0.2, qu + 0.4]}>
        <Draw draw={(ctx, tt, E) => {
          // 师 tracé trait par trait (sans texture de pinceau), puis 老 à sa gauche
          const s1 = 1 - seg(tt, po - 0.2, po + 0.15);
          const back = seg(tt, qu - 0.1, qu + 0.25);
          const slide = ease(seg(tt, la - 0.3, la + 0.5)) * (1 - ease(seg(tt, sh - 0.2, sh + 0.6)));
          if (s1 > 0) E.drawStrokes(ctx, 'shi_simp', { x: 960 + 230 * slide, y: 500, size: 560, brush: false, progress: 6 * seg(tt, 0.5, la - 0.3), color: () => inkCss, alpha: () => s1 });
          const lao = win(tt, la - 0.2, sh + 0.3, 0.35);
          if (lao > 0) E.text(ctx, '老', 960 - 330, 500, { font: 'ShuimoKai', size: 470, color: inkCss, alpha: lao });
          // 師 : fondu net ; à « deux mille cinq cents », la butte en ocre et de minuscules soldats grouillent dans ses traits
          const s2 = seg(tt, po - 0.1, po + 0.25) * (1 - seg(tt, qu - 0.1, qu + 0.2));
          if (s2 > 0) {
            const k = seg(tt, dm - 0.1, dm + 0.6) * (1 - seg(tt, qu - 0.6, qu));
            ctx.save(); ctx.globalAlpha = s2;
            E.drawStrokes(ctx, 'shi_kai', { x: 960, y: 520, size: 520, brush: false, color: (c: string) => rgb(mixc(INK, c === 'butte' ? OCRE : INK, k)), alpha: (c: string) => (c === 'butte' ? 1 - 0.45 * k : 1), glow: 18 * k, glowColor: rgb(OCRE, 0.5) });
            ctx.restore();
            const sw = win(tt, dm + 0.1, qu - 0.2, 0.5) * s2;
            if (sw > 0) { const S = butteSil(E); dessinerEssaim(ctx, S, S, 1, { pose: (i) => (i % 3 ? 'marche' : 'debout'), echelle: 0.62, alpha: sw, ondule: 2.2, t: tt }); }
          }
          if (back > 0) E.drawStrokes(ctx, 'shi_simp', { x: 960, y: 500, size: 560, brush: false, color: () => inkCss, alpha: () => back * (1 - seg(tt, B('b01') + 0.2, A('b02'))) });
        }} />
      </Cam>
      <Caption text="lǎoshī · le professeur" a={win(t, la + 0.2, sh + 0.2, 0.4)} y={880} size={58} />
      <Caption text="shī · le maître" a={win(t, sh + 0.2, po, 0.4)} y={880} size={58} />
      <Caption text="2 500 hommes" a={win(t, dm + 0.3, en + 1.0, 0.4)} y={880} size={58} />
    </AbsoluteFill>
  );
};

// ════════════════ 2. Rappel du 語 : deux bouches face à face → le maître → « né dans un camp militaire »
const Rappel: React.FC = () => {
  const t = useT();
  const A2 = A('b02'), de = at('b02', 'dessins'), yu = at('b02', 'yu'), bo = at('b02', 'bouches'), ma = at('b02', 'maitre'), cl = at('b02', 'classe'), ca = at('b02', 'camp');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={14} from={ca - 0.6} to={A('b03') + 3} move="push" mood="aube" faint={0.55} />
      <Cam keys={[[A2 - 0.3, 960, 540, 1.0], [yu - 0.3, 960, 520, 1.04, 1.0], [bo - 0.2, 900, 560, 1.1, 1.0], [ma - 0.3, 1100, 520, 1.04, 1.0], [ca - 0.2, 960, 540, 1.0, 1.0]]} punch={[de + 0.3, bo + 0.3, ma + 0.3]}>
        <Draw draw={(ctx, tt, E) => {
          // un caractère = un assemblage de petits dessins : les deux moitiés de 師 prennent leurs pigments
          const d0 = win(tt, A2 - 0.3, yu - 0.1, 0.4), dk = seg(tt, de + 0.3, de + 1.0);
          if (d0 > 0) E.drawStrokes(ctx, 'shi_kai', { x: 960, y: 500, size: 520, brush: false, color: pig(dk), alpha: () => d0 });
          // 語 de bronze, ses pigments (la parole, les bouches, le cinq) ; les bouches s'allument
          const ya = win(tt, yu - 0.2, ma + 0.6, 0.4), sl = ease(seg(tt, ma - 0.3, ma + 0.6));
          if (ya > 0) E.drawRealGlyph(ctx, 'yu_jinwen', { x: 960 - 380 * sl, y: 520, size: 560, opacity: ya * (1 - 0.6 * sl), color: pig(1), glow: 22 * win(tt, bo, ma, 0.3), glowColor: rgb(AZ, 0.6) });
          // le maître : 師 (bronze) à droite ; sur « camp militaire », il se rétracte en point d'encre
          const ra = seg(tt, ma - 0.1, ma + 0.5), sh = 1 - ease(seg(tt, ca + 0.2, ca + 1.4));
          if (ra > 0 && sh > 0.02) E.drawRealGlyph(ctx, 'shi_jinwen', { x: 960 + 340 * sl * sh, y: 520, size: 560 * sh, opacity: ra, color: pig(seg(tt, cl, cl + 0.6)) });
        }} />
      </Cam>
      <Label x={960} y={150} zh="語" text="deux bouches face à face" color={AZ} a={win(t, bo - 0.1, ma, 0.4)} align="center" />
    </AbsoluteFill>
  );
};

// ════════════════ 3. La dynastie Shang : frise du temps (Ramsès II), la butte, le camp en trois carrés (signature 1)
const YEAR = (y: number) => 200 + ((y + 3000) / 5026) * 1520;
const Frise = (ctx: CanvasRenderingContext2D, E: any, tt: number, a: number) => {
  if (a <= 0) return;
  const ra = at('b03', 'ramses'), ch = at('b03', 'chine'), fo = at('b03', 'forme'), y0 = 560;
  ctx.save(); ctx.globalAlpha = a;
  const grow = ease(seg(tt, A('b03') - 0.4, A('b03') + 1.2));
  ctx.strokeStyle = rgb(INK, 0.75); ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(YEAR(-3000), y0); ctx.lineTo(YEAR(-3000) + (YEAR(2026) - YEAR(-3000)) * grow, y0); ctx.stroke();
  for (const [y, s] of [[-3000, '−3000'], [-2000, '−2000'], [-1000, '−1000'], [0, '0'], [1000, '1000'], [2026, '2026']] as [number, string][]) {
    const k = seg(tt, A('b03') - 0.2 + (y + 3000) / 5026, A('b03') + 0.3 + (y + 3000) / 5026);
    ctx.globalAlpha = a * k; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(YEAR(y), y0 - 12); ctx.lineTo(YEAR(y), y0 + 12); ctx.stroke();
    E.text(ctx, s, YEAR(y), y0 + 50, { font: 'Cormorant', size: 36, weight: 600, color: '#6b5d50', alpha: a * k * 0.85 });
  }
  // l'Égypte des pharaons au-dessus (lavis ocre pâle), la Chine des caractères au-dessous (encre), qui commence vers −1250
  const eg = seg(tt, at('b03', 'egypte') - 0.2, at('b03', 'egypte') + 0.6), cn = seg(tt, ch - 0.2, ch + 0.8);
  ctx.globalAlpha = a * eg; ctx.fillStyle = rgb([196, 160, 104], 0.45); ctx.fillRect(YEAR(-3100), y0 - 120, YEAR(-30) - YEAR(-3100), 70);
  ctx.globalAlpha = a * cn; ctx.fillStyle = rgb(INK, 0.32); ctx.fillRect(YEAR(-1250), y0 + 90, (YEAR(2026) - YEAR(-1250)) * ease(seg(tt, ch, ch + 1.6)), 70);
  // le même instant : un trait vermillon relie les deux
  const ln = seg(tt, ra - 0.1, ra + 0.6);
  ctx.globalAlpha = a * ln; ctx.strokeStyle = rgb(VER, 0.95); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(YEAR(-1250), y0 - 150); ctx.lineTo(YEAR(-1250), y0 - 150 + 420 * ease(seg(tt, ch - 0.4, ch + 0.4)) + 30 * ln); ctx.stroke();
  // étiquettes : deux au plus (Ramsès II puis la date ; la Chine)
  E.text(ctx, 'Ramsès II', YEAR(-1250), y0 - 190, { font: 'Cormorant', size: 66, weight: 700, color: '#3b322b', alpha: a * win(tt, ra, fo + 0.2, 0.4) });
  E.text(ctx, 'vers 1250 av. J.-C.', YEAR(-1250), y0 - 190, { font: 'Cormorant', size: 66, weight: 700, color: rgb(VER), alpha: a * seg(tt, fo, fo + 0.5) });
  E.text(ctx, 'les premiers caractères', YEAR(-1250) + 330, y0 + 210, { font: 'Cormorant', size: 66, weight: 700, color: '#3b322b', alpha: a * seg(tt, ch + 0.3, ch + 0.9) });
  ctx.restore();
};
const Shang: React.FC = () => {
  const t = useT();
  const A3 = A('b03'), ch = at('b03', 'chine'), fo = at('b03', 'forme'), bs = at('b03', 'bosses'), bu = at('b03', 'butte'), cp = at('b03', 'camp');
  const tx = at('b03', 'textes'), ro = at('b03', 'roi'), dr = at('b03', 'droite'), ce = at('b03', 'centre'), ga = at('b03', 'gauche'), sc = at('b03', 'scribe'), sg = at('b03', 'signe'), cm = at('b03', 'campe');
  const R1 = L.rouleaux[0].debut;
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={14} from={fo - 1} to={R1 + 1} move="pan" mood="aube" faint={0.45} />
      <Cam keys={[[A3 - 0.3, 960, 540, 1.0], [at('b03', 'ramses') - 0.2, YEAR(-1250), 520, 1.12, 1.4], [ch - 0.2, YEAR(-1250) + 150, 560, 1.06, 1.2], [fo, 960, 520, 1.0, 1.0],
        [bs - 0.2, 960, 470, 1.12, 1.0], [tx - 0.3, 960, 560, 1.0, 1.2], [dr - 0.2, 1200, 600, 1.08, 0.9], [ga - 0.2, 760, 600, 1.08, 0.9], [sc - 0.2, 960, 540, 1.0, 1.0], [cm - 0.2, 960, 500, 1.06, 1.0]]}
        punch={[at('b03', 'ramses') + 0.4, bs + 0.3, dr + 0.3, ce + 0.3, ga + 0.3, cm + 0.3]} calm={[[R1 - 0.6, R1 + 1]]}>
        <Draw draw={(ctx, tt, E) => {
          Frise(ctx, E, tt, 1 - seg(tt, fo - 0.2, fo + 0.6));
          // la plus ancienne forme : estampage, signe révélé en blanc, puis à l'encre ; les deux bosses en ocre
          const ga0 = seg(tt, fo - 0.2, fo + 0.6) * (1 - seg(tt, R1 - 0.5, R1));
          const ink = seg(tt, bs - 0.2, bs + 0.6), oc = seg(tt, bu - 0.1, bu + 0.5);
          const up = ease(seg(tt, ro - 0.4, ro + 0.6)) * (1 - ease(seg(tt, sc - 0.2, sc + 0.8)));
          const G = { x: 960, y: 520 - 300 * up, size: 600 - 360 * up };
          if (ga0 > 0) {
            rubbing(ctx, 960, 520, 520, 720, ga0 * (1 - ink) * (1 - up), 11);
            E.drawRealGlyph(ctx, 'shi_jiaguwen', { ...G, reveal: () => seg(tt, fo, fo + 1.0), opacity: ga0, color: () => rgb(mixc(mixc(PAPER, INK, ink), OCRE, oc)), glow: 22 * win(tt, bu, cp + 0.6, 0.3), glowColor: rgb(OCRE, 0.6) });
          }
          // le camp : la butte au lavis, les soldats sortent du signe et se rangent en trois carrés (droite, centre, gauche)
          const camp = win(tt, ro - 0.4, R1 - 0.2, 0.6);
          if (camp > 0) {
            const dim = 1 - 0.55 * seg(tt, sc - 0.2, sc + 0.6);
            butte(ctx, MOUND, 190, camp * dim, OCRE);
            const C = campPts(), per = Math.ceil(N_CAMP / 3);
            [dr, ce, ga].forEach((cue, b) => {
              const Ab = memo(`src${b}`, () => source(per, [960, 300], 60)), Bb = C.slice(b * per, (b + 1) * per);
              const u = seg(tt, cue - 0.35, cue + 1.7);
              if (u <= 0) return;
              dessinerEssaim(ctx, Ab, Bb, u, { echelle: 0.62, pose: poseMarche, vague: { origine: [960, 300] }, alpha: camp * dim * seg(tt, cue - 0.35, cue), seed: b + 1 });
            });
          }
        }} />
      </Cam>
      <Caption text={<>« Le roi forme trois <span style={{ fontFamily: 'ShuimoKai', color: rgb(OCRE) }}>師</span> : à droite, au centre, à gauche »</>} a={win(t, ro - 0.2, sc, 0.4)} y={40} size={48} />
      <Caption text="師 · l'armée qui campe" a={win(t, cm - 0.1, R1 - 0.3, 0.4)} y={880} size={58} />
      <EraTag {...cartouche('shang', 'vers 1250 av. J.-C.')} a={seg(t, ch, ch + 0.8) * (1 - seg(t, R1 - 0.3, R1))} />
    </AbsoluteFill>
  );
};

// rouleau du temps 2D (Shang → Zhou) : 𠂤 en curseur, il gagne son 帀 en passant le sceau 周
const ERAS: Era[] = (['shang', 'zhou', 'jin', 'tang', 'aujourdhui'] as string[]).map((id, i) => ({ zh: periode(id).sceau, date: ['−1250', '−1046', '−550', '802', '1956'][i] }));
const R1 = L.rouleaux[0].debut;
const TR1: TimeScrollConfig = { at: R1, duration: L.rouleaux[0].duree, eras: ERAS, from: 0, to: 1, years: [-1250, -1046],
  inscriptions: [{ cols: ['三人行', '必有我師焉'], sig: '論語 述而', seal: '師' }, { cols: ['溫故而知新', '可以為師矣'], sig: '論語 為政', seal: '道' }] };
const Rouleau1: React.FC = () => (
  <TimeScrollStage cfg={TR1} fromLandscape={{ seed: 14, since: R1 - 1, mood: 'aube' }} toLandscape={{ seed: 9, until: R1 + TR1.duration! + 1.5 }}>
    <Draw draw={(ctx, tt, E) => {
      const mk = morphK(TR1, tt), p = cursorPose(TR1, tt), q = arrivePose(TR1, tt);
      if (mk < 1) E.drawRealGlyph(ctx, 'shi_jiaguwen', { x: p.x, y: p.y, size: 600 * p.s, opacity: 1 - mk, color: pig(1) });
      if (mk > 0) E.drawRealGlyph(ctx, 'shi_jinwen', { x: q.x, y: q.y, size: 600 * q.s, opacity: mk * (1 - seg(tt, R1 + TR1.duration! - 0.2, R1 + TR1.duration! + 0.2)), color: pig(1) });
    }} />
  </TimeScrollStage>
);

// ════════════════ 4. La dynastie Zhou : les quatorze armées (carte), la capitale 京師, le bronze et son second dessin
const ZONGZHOU = [108.85, 34.23], LUOYI = [112.45, 34.62];
const ring = (q: number[], n: number, r: number): number[][] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * 0.7]; });
const camp = (ctx: CanvasRenderingContext2D, q: number[], a: number) => {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(q[0], q[1]); ctx.rotate(-0.05);
  ctx.fillStyle = rgb(VER, 0.9); ctx.fillRect(-11, -11, 22, 22);
  ctx.strokeStyle = 'rgba(246,238,222,0.9)'; ctx.lineWidth = 2; ctx.strokeRect(-6, -6, 12, 12);
  ctx.restore();
};
const Zhou: React.FC = () => {
  const t = useT();
  const A4 = A('b04'), zh = at('b04', 'zhou'), si = at('b04', 'six'), hu = at('b04', 'huit'), lu = at('b04', 'luoyi'), cap = at('b04', 'capitale'), br = at('b04', 'bronzes'), se = at('b04', 'second');
  const T0 = R1 + TR1.duration!;
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={9} from={br - 1} to={A('b05') + 1} move="push" mood="jour" faint={0.5} />
      <Cam keys={[[T0, 960, 540, 1.0], [si - 0.3, 900, 520, 1.06, 1.2], [hu - 0.2, 1040, 520, 1.06, 1.2], [cap - 0.2, 960, 540, 1.0, 1.0], [br, 960, 540, 1.0, 1.0], [se - 0.2, 1080, 520, 1.1, 1.0]]} punch={[si + 0.3, hu + 0.3, br + 1.2, se + 0.3]}>
        <Draw draw={(ctx, tt, E) => {
          const ma = win(tt, T0 - 0.3, br + 0.4, 0.6);
          if (ma > 0) {
            ctx.save(); ctx.globalAlpha = ma;
            const v = carte('chine_centre_nord').vue;
            fondCarte(ctx, E, 'chine_centre_nord');
            const zz = E.proj(v, ZONGZHOU), lo = E.proj(v, LUOYI);
            capitale(ctx, E, zz, '宗周', 'Zongzhou', 'capitale des Zhou', tt, zh + 0.6, [si, si + 1.2]);
            ring(zz, 6, 120).forEach((q, i) => camp(ctx, q, seg(tt, si + i * 0.12, si + 0.3 + i * 0.12)));
            lieu(ctx, E, lo, '洛邑', 'Luoyi', seg(tt, hu - 0.3, hu + 0.3), { cote: 'd', arrivee: seg(tt, hu - 0.3, hu), seed: 4 });
            ring(lo, 8, 110).forEach((q, i) => camp(ctx, q, seg(tt, hu + 0.2 + i * 0.1, hu + 0.5 + i * 0.1)));
            creditCarte(ctx, E, 'chine_centre_nord');
            ctx.restore();
          }
          // le bronze : estampage, 師 révélé en blanc puis à l'encre ; la butte en ocre ; le second dessin reste gris, puis s'éclaire
          const b = seg(tt, br - 0.2, br + 0.6) * (1 - seg(tt, B('b04') + 0.3, B('b04') + 1.0));
          if (b > 0) {
            const ink = seg(tt, br + 1.2, br + 2.0);
            rubbing(ctx, 960, 520, 760, 720, b * (1 - ink), 23);
            E.drawRealGlyph(ctx, 'shi_jinwen', { x: 960, y: 520, size: 640, reveal: () => seg(tt, br, br + 1.0), opacity: b,
              color: (c: string) => (c === 'butte' ? rgb(mixc(mixc(PAPER, INK, ink), OCRE, ink)) : rgb(mixc(mixc(PAPER, INK, ink), GREY, seg(tt, se - 0.1, se + 0.4)))),
              glow: 26 * win(tt, se, B('b04') + 0.4, 0.3), glowColor: 'rgba(246,241,231,0.95)' });
          }
        }} />
      </Cam>
      <Label x={960} y={150} zh="京師" text="la grande ville où campe l'armée" color={VER} a={win(t, cap - 0.1, br - 0.2, 0.4)} align="center" />
      <Caption text="six armées à l'ouest, huit à l'est (inscriptions de bronze)" a={win(t, hu + 0.6, cap - 0.1, 0.4)} y={880} size={46} />
      <EraTag {...cartouche('zhou', 'Zhou de l’Ouest · XIe–VIIIe s. av. J.-C.')} a={tagIn(TR1, t) * (1 - seg(t, B('b04') + 0.2, B('b04') + 0.8))} />
    </AbsoluteFill>
  );
};

// ════════════════ 5. 帀 : le pied qui part, renversé ; la ronde (clip à fournir) ; l'anneau de pas (signature 2) ; 匝
const Za: React.FC = () => {
  const t = useT();
  const A5 = A('b05'), pi = at('b05', 'pied'), li = at('b05', 'ligne'), pa = at('b05', 'partir'), rt = at('b05', 'retourne'), te = at('b05', 'tete'), rv = at('b05', 'revient'), to = at('b05', 'tour');
  const nu = at('b05', 'nuit'), bu = at('b05', 'butte'), ce = at('b05', 'cercle'), vo = at('b05', 'voila'), ex = at('b05', 'existe'), za = at('b05', 'za'), ut = at('b05', 'untour');
  const clipA = win(t, nu - 0.2, bu + 0.1, 0.6);
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={9} from={bu - 1} to={ex + 1} move="still" mood="nuit" faint={0.6} />
      <Cam keys={[[A5 - 0.3, 960, 540, 1.0], [li - 0.2, 760, 540, 1.06, 1.0], [rt - 0.2, 1160, 540, 1.1, 0.8], [rv - 0.2, 960, 540, 1.04, 1.0], [bu - 0.3, 960, 560, 1.0, 1.0], [ce - 0.2, 960, 600, 1.08, 1.4], [ex - 0.3, 960, 520, 1.0, 1.0]]}
        punch={[pi + 0.3, te + 0.2, to + 0.3, vo + 0.3, za + 0.2]}>
        <Draw draw={(ctx, tt, E) => {
          // le bronze rappelle d'où l'on vient : le second dessin s'allume en malachite
          const bz = win(tt, A5 - 0.4, li + 0.2, 0.5);
          if (bz > 0) E.drawRealGlyph(ctx, 'shi_jinwen', { x: 960, y: 520, size: 640, opacity: bz, color: (c: string) => (c === 'tour' ? rgb(mixc(INK, MAL, seg(tt, pi, pi + 0.5))) : rgb(OCRE, 0.35)), glow: 24 * seg(tt, pi, pi + 0.5), glowColor: rgb(MAL, 0.5) });
          // 之 : un pied sur une ligne, qui avance et laisse des empreintes ; retourné (tête en bas), il devient 帀 et revient
          const fa = win(tt, li - 0.2, nu - 0.1, 0.5);
          if (fa > 0) {
            const go = ease(seg(tt, pa - 0.2, rt - 0.2)), flip = ease(seg(tt, rt, rt + 0.6)), back = ease(seg(tt, rv - 0.1, to + 0.4)), loop = seg(tt, to, nu - 0.3);
            const x = 700 + 520 * go - 520 * back, y = 540 + 90 * Math.sin(loop * Math.PI * 2) * (loop > 0 && loop < 1 ? 1 : 0);
            // empreintes derrière le pied
            const steps = Math.floor(8 * go);
            for (let i = 0; i < steps; i++) { ctx.save(); ctx.globalAlpha = fa * 0.5; ctx.fillStyle = rgb(MAL); ctx.beginPath(); ctx.ellipse(700 + i * 65, 700 + (i % 2 ? 14 : -14), 9, 16, Math.PI / 2, 0, 7); ctx.fill(); ctx.restore(); }
            ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 - 2 * flip);
            if (flip < 0.5) E.drawRealGlyph(ctx, 'shi_zhi_jiaguwen', { x: 0, y: 0, size: 420, opacity: fa, color: () => rgb(MAL) });
            ctx.restore();
            if (flip >= 0.5) E.drawRealGlyph(ctx, 'shi_za_jiaguwen', { x, y, size: 420, opacity: fa * seg(flip, 0.5, 0.8), color: () => rgb(MAL), glow: 20 * win(tt, te, rv, 0.3), glowColor: rgb(MAL, 0.5) });
          }
          // signature 2 : la ronde ; la butte au centre, le camp, une file de sentinelles qui tourne ; leurs pas dessinent l'anneau
          const rn = win(tt, bu - 0.6, ex + 0.2, 0.6);
          if (rn > 0) {
            butte(ctx, MOUND, 190, rn, OCRE);
            dessinerEssaim(ctx, campPts(), campPts(), 1, { pose: () => 'debout', alpha: rn * 0.55, echelle: 0.62 });
            empreintes(ctx, MOUND, 700, 330, seg(tt, bu, vo), rn, rgb(MAL, 0.85));
            const sent = Array.from({ length: 48 }, (_, i): Pt => { const a = (i / 48) * Math.PI * 2 + (tt - bu) * 0.22; return [MOUND[0] + Math.cos(a) * 700, MOUND[1] + Math.sin(a) * 330]; });
            dessinerEssaim(ctx, sent, sent, 1, { pose: () => 'marche', alpha: rn, echelle: 1.15 });
            const vz = win(tt, vo - 0.1, ex + 0.1, 0.4);
            if (vz > 0) E.drawRealGlyph(ctx, 'shi_jinwen', { x: 960, y: 560, size: 520, opacity: vz, color: pig(1), glow: 20, glowColor: 'rgba(246,241,231,0.95)' });
          }
          // 匝 : le même pied, toujours vivant, « un tour »
          const zz = seg(tt, ex - 0.2, ex + 0.4) * (1 - seg(tt, B('b05') + 0.3, B('b05') + 0.9));
          if (zz > 0) E.drawStrokes(ctx, 'shi_za2_kai', { x: 960, y: 480, size: 520, brush: false, progress: 5 * seg(tt, ex, za - 0.1), color: pig(seg(tt, za, za + 0.5)), alpha: () => zz });
        }} />
      </Cam>
      <Placeholder title="Clip Seedance : la ronde de nuit" sub="sentinelles et torches autour du camp — à fournir" a={clipA} />
      <Label x={960} y={160} zh="之" text="partir" color={MAL} a={win(t, pa - 0.1, rt, 0.3)} align="center" />
      <Label x={960} y={160} zh="帀" text="faire le tour" color={MAL} a={win(t, te, nu - 0.3, 0.3)} align="center" />
      <Caption text="lecture traditionnelle (Xu Shen) : 帀, c'est 之 renversé" a={win(t, te + 0.4, nu - 0.3, 0.4)} y={880} size={44} />
      <Label x={960} y={880} zh="匝" text="zā · un tour" color={MAL} a={win(t, za, B('b05') + 0.6, 0.4)} align="center" />
    </AbsoluteFill>
  );
};

// ════════════════ 6. Le 師氏 à la porte du palais ; silence ; l'armée s'assied et se condense en 師 (signature 3)
const N_SHI = 600;
const Shishi: React.FC = () => {
  const t = useT();
  const A6 = A('b06'), po = at('b06', 'porte'), of = at('b06', 'officier'), fi = at('b06', 'fils'), pr = at('b06', 'precepteur'), am = at('b06', 'armee'), as = at('b06', 'assise');
  const MAS0: Pt = [960, 560], MAS1: Pt = [960, 300];
  const sit0 = as + 0.1, sit1 = sit0 + 2.2, con0 = sit1 + 0.3, con1 = con0 + 1.6;
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={22} from={A6 - 1} to={con1 + 1} move="pan" mood="jour" faint={0.45} />
      <Cam keys={[[A6 - 0.3, 640, 560, 1.12], [of - 0.2, 900, 560, 1.12, 1.2], [fi - 0.3, 1320, 560, 1.12, 1.2], [pr - 0.3, 960, 540, 1.04, 1.0], [am - 0.4, 960, 560, 1.0, 1.6], [sit1, 960, 540, 0.96, 1.0]]}
        punch={[pr + 0.3, as + 0.3, con1]} calm={[[am - 2.2, am]]}>
        <Draw draw={(ctx, tt, E) => {
          const G = memo('garde', () => carres(N_SHI, [[330, 580], [640, 580]], 20, 15));
          const C = memo('classe', () => classe(N_SHI, MAS1, 18, 13));
          const S = memo('silshi', () => silhouette(N_SHI, [960, 520], 700, (g, s) => E.drawRealGlyph(g, 'shi_jinwen', { x: s / 2, y: s / 2, size: s, color: () => '#000' }), 'shi'));
          const sitK = seg(tt, sit0, sit1), conK = seg(tt, con0, con1), fade = 1 - seg(tt, con1 - 0.2, con1 + 0.6);
          // la porte du palais : deux piliers et un linteau au lavis
          const door = 1 - seg(tt, as - 0.3, as + 0.6);
          if (door > 0) {
            ctx.save(); ctx.globalAlpha = door * 0.8; ctx.fillStyle = rgb(INK, 0.55);
            ctx.fillRect(800, 300, 26, 420); ctx.fillRect(1094, 300, 26, 420); ctx.fillRect(760, 280, 400, 30); ctx.restore();
          }
          // les gardes (le camp), puis la classe, puis la silhouette du caractère
          if (conK <= 0) dessinerEssaim(ctx, G, C, sitK, { pose: (_, k) => (k >= 1 ? 'assis' : k > 0 ? 'marche' : 'debout'), vague: { origine: MAS1, etalement: 0.7 }, alpha: 1, echelle: 0.62 + 0.38 * sitK });
          else dessinerEssaim(ctx, C, S, conK, { pose: (_, k) => (k > 0.5 ? 'debout' : 'assis'), vague: { origine: [960, 520], etalement: 0.5 }, alpha: fade, echelle: 1 - 0.35 * conK });
          // le 師氏 (vermillon), et les trois fils du roi (azurite) derrière la porte
          const mp: Pt = [MAS0[0] + (MAS1[0] - MAS0[0]) * ease(sitK), MAS0[1] + (MAS1[1] - MAS0[1]) * ease(sitK)];
          const ma = seg(tt, of - 0.3, of + 0.3) * (1 - seg(tt, con0, con0 + 0.6));
          if (ma > 0) { ctx.save(); ctx.globalAlpha = ma; const im = sprite(seg(tt, pr - 0.2, pr + 0.3) > 0.5 ? 'dos' : 'debout', rgb(VER)); ctx.drawImage(im, mp[0] - 40, mp[1] - 66, 80, 104); ctx.restore(); }
          const pa = seg(tt, fi - 0.3, fi + 0.3) * door;
          if (pa > 0) for (let i = 0; i < 3; i++) { ctx.save(); ctx.globalAlpha = pa; ctx.drawImage(sprite('assis', rgb(AZ)), 1340 + i * 90 - 35, 560 - 56, 70, 91); ctx.restore(); }
          // le caractère prend la place des hommes
          const ga = seg(tt, con1 - 0.6, con1 + 0.3);
          if (ga > 0) E.drawRealGlyph(ctx, 'shi_jinwen', { x: 960, y: 520, size: 700, opacity: ga * (1 - seg(tt, B('b06') + 2.2, B('b06') + 2.9)), color: pig(1), glow: 24 * win(tt, con1 - 0.3, con1 + 1.4, 0.3), glowColor: 'rgba(246,241,231,0.95)' });
        }} />
      </Cam>
      <Caption text="師氏 · le maître de la garde, précepteur des princes (selon les Rites des Zhou)" a={win(t, of + 0.2, am - 1.0, 0.4)} y={880} size={44} />
    </AbsoluteFill>
  );
};

// ════════════════ 7. Jin : le maître aveugle 師曠, les grues
const Jin: React.FC = () => {
  const t = useT();
  const A7 = A('b07'), qu = at('b07', 'question'), ar = at('b07', 'art'), ji = at('b07', 'jin'), so = at('b07', 'soir'), gr = at('b07', 'grues'), no = at('b07', 'nom');
  const R3 = L.rouleaux[1].debut;
  const im = IMG.shikuang;
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={21} from={A7 - 1} to={R3 + 1} move="pan" mood="brume" faint={0.5} />
      <Cam keys={[[A7 - 0.3, 960, 540, 1.0], [ar - 0.2, 960, 520, 1.04, 1.0], [ji - 0.2, 960, 540, 1.0, 1.0], [so - 0.2, 960, 520, 1.06, 2.0], [gr - 0.2, 960, 480, 1.0, 1.2]]} punch={[qu + 0.4, ji + 0.4, gr + 0.4]} calm={[[R3 - 0.6, R3 + 1]]}>
        <Draw draw={(ctx, tt, E) => {
          const q = win(tt, A7 - 0.3, ji + 0.3, 0.5);
          if (q > 0) E.drawRealGlyph(ctx, 'shi_jinwen', { x: 960, y: 500, size: 560 - 180 * seg(tt, ar, ar + 0.8), opacity: q, color: pig(1) });
          if (im) { const a = win(tt, ji - 0.2, R3 - 0.2, 0.6), h = 760, w = (h * im.width) / im.height; ctx.save(); ctx.globalAlpha = a; ctx.drawImage(im, 960 - w / 2, 520 - h / 2, w, h); ctx.restore(); }
          birds(ctx, tt, gr, gr + 6.5, 380, 1, 6, 7, 2.2);
          birds(ctx, tt, gr + 1.4, gr + 7.5, 520, -1, 5, 9, 2.0);
        }} />
      </Cam>
      {!im && <Placeholder title="白描 : 師曠 au qin" sub="le maître de musique aveugle — dessin à fournir" a={win(t, ji - 0.2, R3 - 0.2, 0.6)} />}
      <Label x={960} y={160} zh="師曠" text="le maître Kuang" color={VER} a={win(t, ji + 0.6, so + 0.4, 0.4)} align="center" />
      <Caption text="seize paires de grues noires · selon le Han Feizi" a={win(t, gr + 0.2, no + 0.2, 0.4)} y={880} size={44} />
      <EraTag {...cartouche('jin', 'VIe s. av. J.-C.')} a={win(t, ji - 0.2, R3 - 0.3, 0.5)} />
    </AbsoluteFill>
  );
};

// rouleau 3D complet (le plus grand saut : Jin → Tang)
const R3 = L.rouleaux[1].debut;
const R3A: Rouleau3DConfig = {
  at: R3, de: 'zhou', vers: 'tang', annees: [-550, 802], variant: 'complet', stone: 'miel',
  fromLand: { seed: 21, mood: 'brume' }, toLand: { seed: 5, mood: 'aube' }, midSeeds: [17, 9],
  inscriptions: [
    { x: 1500, y: 200, size: 74, font: 'ShuimoKai', cols: ['三人行', '必有我師焉'], sig: '論語述而', seal: '雲水', ink: 0.88 },
    { x: 5500, y: 170, size: 80, font: 'ShuimoKai', cols: ['溫故而知新', '可以為師矣'], sig: '論語為政', seal: '長樂', ink: 0.92 },
  ],
};
const R3END = R3 + r3Seconds(R3A);

// ════════════════ 8. La dynastie Tang : le Discours sur le maître (Han Yu)
const SHISHUO = ['師者所以', '傳道受業', '解惑也'];
const Tang: React.FC = () => {
  const t = useT();
  const A8 = A('b08'), qu = at('b08', 'question'), ta = at('b08', 'tang'), di = at('b08', 'discours'), ci = at('b08', 'citation'), tr = at('b08', 'transmet'), me = at('b08', 'metier'), dt = at('b08', 'doutes'), ag = at('b08', 'age'), vo = at('b08', 'voie');
  const im = IMG.hanyu;
  // colonnes de droite à gauche ; caractère n°k écrit à son tour entre ci − 0,6 et dt
  const pos = (col: number, row: number) => ({ x: 1380 - col * 190, y: 260 + row * 160 });
  const hiAt: Record<string, number> = { 傳: tr, 道: tr, 受: me, 業: me, 解: dt, 惑: dt };
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={5} from={R3END - 1} to={A('b09') + 0.5} move="push" mood="aube" faint={0.5} />
      <Cam keys={[[R3END, 960, 540, 1.0], [ta - 0.2, 960, 520, 1.04, 1.4], [ci - 0.4, 1200, 520, 1.04, 1.2], [tr - 0.2, 1190, 480, 1.1, 1.0], [dt - 0.2, 1000, 560, 1.08, 1.0], [ag - 0.3, 960, 540, 1.0, 1.0]]} punch={[qu + 0.3, ci + 0.2, tr + 0.3, me + 0.3, dt + 0.3, vo + 0.3]} calm={[[R3END - 1, R3END + 0.5]]}>
        <Draw draw={(ctx, tt, E) => {
          if (im) { const a = win(tt, ta - 0.3, ci + 0.2, 0.6), cov = Math.max(1920 / im.width, 1080 / im.height); ctx.save(); ctx.globalAlpha = a; ctx.drawImage(im, 960 - (im.width * cov) / 2, 540 - (im.height * cov) / 2, im.width * cov, im.height * cov); ctx.restore(); }
          const all = SHISHUO.flatMap((c, i) => [...c].map((ch, j) => ({ ch, col: i, row: j })));
          const tex = seg(tt, ci - 0.8, ci) * (1 - seg(tt, B('b08') + 0.2, B('b08') + 0.8));
          all.forEach(({ ch, col, row }, k) => {
            const w0 = ci - 0.6 + (k / all.length) * (dt - ci + 0.2), a = seg(tt, w0, w0 + 0.35) * tex;
            if (a <= 0) return;
            const h = hiAt[ch], hk = h ? win(tt, h - 0.1, ag, 0.3) : 0, p = pos(col, row);
            E.text(ctx, ch, p.x, p.y, { font: 'ShuimoPinceau', size: 140, color: rgb(mixc(INK, GOLD, hk)), alpha: a, glow: 22 * hk, glowColor: rgb(GOLD, 0.6) });
          });
        }} />
      </Cam>
      {!im && <Placeholder title="Image : Han Yu à la lampe" sub="Chang'an au crépuscule — à fournir (Nano Banana + encre-3d)" a={win(t, ta - 0.3, ci + 0.2, 0.6)} />}
      <div style={{ position: 'absolute', left: 140, top: 300, width: 620, display: 'flex', flexDirection: 'column', gap: 26, opacity: seg(t, tr - 0.1, tr + 0.4) * (1 - seg(t, B('b08') + 0.2, B('b08') + 0.8)) }}>
        {([['傳道', 'transmettre la Voie', tr], ['受業', 'enseigner le métier', me], ['解惑', 'dissiper les doutes', dt]] as [string, string, number][]).map(([zh, fr, a0]) => (
          <div key={zh} style={{ opacity: seg(t, a0 - 0.1, a0 + 0.4), display: 'flex', alignItems: 'baseline', gap: 18 }}>
            <span style={{ fontFamily: 'ShuimoKai', fontSize: 72, color: rgb(GOLD) }}>{zh}</span>
            <span style={{ fontFamily: 'ShuimoLatin', fontSize: 50, fontWeight: 600, color: '#3b322b' }}>{fr}</span>
          </div>
        ))}
      </div>
      <Caption text="韓愈 · Discours sur le maître (師說), vers 802" a={win(t, di - 0.1, ci - 0.2, 0.4)} y={880} size={46} />
      <Caption text="無貴無賤，無長無少 · ni rang ni âge" a={win(t, ag, vo, 0.4)} y={880} size={48} />
      <Caption text="道之所存，師之所存也 · là où est la Voie, là est le maître" a={win(t, vo, B('b08') + 0.6, 0.4)} y={880} size={48} />
      <EraTag {...cartouche('tang', 'vers 802 · Han Yu')} a={r3TagIn(R3A, t) * (1 - seg(t, B('b08'), B('b08') + 0.5))} />
    </AbsoluteFill>
  );
};

// ════════════════ 9. Scène récapitulative : toutes les formes, la butte puis le pied clignotent ; l'accident de 1956
const FORMS: [string, string, string][] = [
  ['real:shi_jiaguwen', '甲骨文', 'Shang'], ['real:shi_jinwen', '金文', 'Zhou'], ['real:shi_xiaozhuan', '小篆', 'Qin'], ['real:shi_qin', '秦簡', 'Qin'],
  ['real:shi_lishu', '隸書', 'Han'], ['kai:shi_kai', '楷書', 'Tang'], ['kai:shi_simp', '简体', '1956'],
];
const drawBand = (ctx: CanvasRenderingContext2D, E: any, tt: number, a: number) => {
  const y = 330, x0 = 300, dx = 220, sz = 180;
  const de = at('b09', 'deux'), bu = at('b09', 'butte'), pi = at('b09', 'pied'), da = at('b09', 'date'), na = at('b09', 'naissance');
  const hi = tt >= na ? [] : tt >= da ? ['butte'] : tt >= pi ? ['tour'] : tt >= bu ? ['butte'] : [];
  const t0 = tt >= da ? da : tt >= pi ? pi : bu;
  const k = hi.length ? seg(tt, t0 - 0.05, t0 + 0.3) : 0;
  const blink = hi.length ? 0.5 + 0.5 * Math.cos(Math.min(3, (tt - t0) / 0.32) * Math.PI * 2) : 0;
  const allc = seg(tt, na - 0.1, na + 0.5), acc = win(tt, da - 0.1, na, 0.4);
  FORMS.forEach(([key, zh, fr], i) => {
    const appear = seg(tt, de - 0.6 + i * 0.12, de - 0.2 + i * 0.12) * a;
    if (appear <= 0) return;
    const isAcc = i === FORMS.length - 1, sc = isAcc ? 1 + 0.7 * acc : 1, grey = isAcc ? 0 : acc;
    const x = x0 + i * dx - (isAcc ? 120 * acc : 0), yy = y + (isAcc ? 60 * acc : 0);
    const color = (c: string) => {
      let col = mixc(INK, P[c] ?? INK, hi.length ? (hi.includes(c) ? 1 : 0) : allc);
      if (hi.length && !hi.includes(c)) col = mixc(col, GREY, k);
      return rgb(mixc(col, GREY, grey));
    };
    const alpha = (c: string) => (!hi.length || hi.includes(c) ? 1 : 1 - 0.55 * k) * (1 - 0.5 * grey);
    const glow = hi.length ? 24 * blink * k : 0, gc = P[hi[0] ?? 'butte'];
    ctx.save(); ctx.globalAlpha = appear;
    if (key.startsWith('real:')) E.drawRealGlyph(ctx, key.slice(5), { x, y: yy, size: sz * sc, color, alpha, glow, glowColor: rgb(gc, 0.8) });
    else E.drawStrokes(ctx, key.slice(4), { x, y: yy, size: sz * 0.9 * sc, brush: false, color, alpha, glow, glowColor: rgb(gc, 0.8) });
    E.text(ctx, zh, x0 + i * dx, y + 150, { font: 'ShuimoKai', size: 54, color: inkCss, alpha: appear * (1 - acc * (isAcc ? 1 : 0)) });
    E.text(ctx, fr, x0 + i * dx, y + 206, { font: 'Cormorant', size: 44, weight: 700, color: '#5b4f44', alpha: appear * (1 - acc * (isAcc ? 1 : 0)) });
    ctx.restore();
  });
  const rows: [string, string][] = [['butte', 'la butte 𠂤'], ['tour', 'le pied qui fait le tour 帀']];
  const grow = seg(tt, de + 0.4, de + 1.6);
  rows.forEach(([c, lab], j) => {
    const yy = 640 + j * 70, xa = x0 - 60, xb = x0 + 6 * dx + 60;
    const isHi = hi.includes(c), on = !hi.length || isHi;
    const col = on ? P[c] : mixc(P[c], GREY, k);
    const al = a * grow * (on ? 1 : 1 - 0.5 * k) * (isHi ? 0.75 + 0.25 * blink : 1);
    ctx.save(); ctx.globalAlpha = al; ctx.lineWidth = isHi ? 22 : 14; ctx.lineCap = 'round'; ctx.strokeStyle = rgb(col);
    ctx.beginPath(); ctx.moveTo(xa + 560, yy); ctx.lineTo(xa + 560 + (xb - xa - 560) * grow, yy); ctx.stroke(); ctx.restore();
    E.text(ctx, lab, xa + 520, yy, { font: 'Cormorant', size: 46, weight: 700, align: 'right', color: rgb(col), alpha: al });
  });
};
const Recap: React.FC = () => {
  const t = useT();
  const A9 = A('b09'), de = at('b09', 'deux'), da = at('b09', 'date'), na = at('b09', 'naissance'), lo = at('b09', 'laoshi'), sf = at('b09', 'shifu'), tx = at('b09', 'taxi');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={30} from={A9 - 1.5} to={END + 0.5} move="pan" mood="aube" faint={0.4} />
      <Cam keys={[[A9 - 0.3, 960, 540, 1.02], [de - 0.4, 960, 520, 1.0, 1.0], [da - 0.2, 1500, 420, 1.12, 1.0], [na - 0.2, 960, 520, 1.0, 1.0], [lo - 0.4, 960, 540, 1.0, 1.0]]} punch={[at('b09', 'butte'), at('b09', 'pied'), da + 0.4, na]}>
        <Draw draw={(ctx, tt, E) => {
          const syn = win(tt, A9 - 0.4, lo + 0.3, 0.6);
          if (syn > 0) drawBand(ctx, E, tt, syn);
        }} />
      </Cam>
      <Caption text="l'écriture rapide (草書) tasse la butte en deux traits" a={win(t, da + 0.3, na - 0.1, 0.4)} y={900} size={44} />
      <div style={{ position: 'absolute', width: '100%', top: 360, display: 'flex', justifyContent: 'center', gap: 220, opacity: seg(t, lo - 0.1, lo + 0.4) * (1 - seg(t, B('b09') + 0.3, B('b09') + 0.9)) }}>
        {([['老師', 'lǎoshī · le professeur', lo], ['師傅', 'shīfu · le maître artisan', sf]] as [string, string, number][]).map(([zh, fr, a0]) => (
          <div key={zh} style={{ textAlign: 'center', opacity: seg(t, a0 - 0.1, a0 + 0.4) }}>
            <div style={{ fontFamily: 'ShuimoLegende', fontSize: 150, color: inkCss, lineHeight: 1.1 }}>{zh}</div>
            <div style={{ fontFamily: 'ShuimoLatin', fontSize: 50, fontWeight: 600, color: '#4b4038' }}>{fr}</div>
          </div>
        ))}
      </div>
      <Caption text="« 師傅 ! » … et le taxi s'arrête" a={win(t, tx, B('b09') + 0.6, 0.4)} y={880} size={52} />
    </AbsoluteFill>
  );
};

// ════════════════ 10. Chute (l'armée assise devient une classe) et passerelle 父
const Chute: React.FC = () => {
  const t = useT();
  const A10 = A('b10'), ra = at('b10', 'rassembler'), gu = at('b10', 'guerre'), co = at('b10', 'comprendre'), pv = at('b10', 'proverbe'), ch = at('b10', 'chinois'), fu = at('b10', 'fu'), mn = at('b10', 'main'), bt = at('b10', 'baton'), hc = at('b10', 'hache');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={30} from={A10 - 1} to={END + 0.6} move="still" mood="aube" faint={0.4} />
      <Cam keys={[[A10 - 0.3, 960, 540, 1.0], [co - 0.2, 960, 600, 1.06, 1.4], [pv - 0.3, 1200, 520, 1.04, 1.0], [fu - 0.3, 760, 520, 1.06, 1.0]]} punch={[ra + 0.3, co + 0.3, ch + 0.4, mn + 0.3, hc + 0.3]}>
        <Draw draw={(ctx, tt, E) => {
          const sa = win(tt, A10 - 0.3, fu - 0.2, 0.6);
          if (sa > 0) {
            E.drawStrokes(ctx, 'shi_simp', { x: 960, y: 400, size: 460, brush: false, color: () => inkCss, alpha: () => sa });
            // écho de la signature : une rangée d'élèves assis face au maître
            const row = memo('rang', () => classe(60, [960, 640], 2, 30));
            dessinerEssaim(ctx, row, row, 1, { pose: () => 'assis', alpha: sa * seg(tt, ra - 0.2, ra + 0.6), echelle: 1.4 });
            ctx.save(); ctx.globalAlpha = sa * seg(tt, ra - 0.2, ra + 0.6); ctx.drawImage(sprite('dos', rgb(VER)), 960 - 36, 640 - 58, 72, 94); ctx.restore();
          }
          const fa = seg(tt, fu - 0.2, fu + 0.6);
          if (fa > 0) E.drawRealGlyph(ctx, 'shi_fu_jinwen', { x: 760, y: 500, size: 560, opacity: fa,
            color: (c: string) => rgb(mixc(INK, P[c], c === 'main' ? seg(tt, mn, mn + 0.5) : seg(tt, bt, bt + 0.5))), glow: 22 * Math.max(win(tt, bt, hc + 0.8, 0.3), win(tt, hc, END, 0.3)), glowColor: rgb(VER, 0.5) });
        }} />
      </Cam>
      <div style={{ position: 'absolute', right: 160, top: 150, writingMode: 'vertical-rl', fontFamily: 'ShuimoLegende', fontSize: 92, letterSpacing: 10, color: inkCss, opacity: win(t, ch - 0.2, END + 0.6, 0.5) }}>
        一日為<span style={{ color: rgb(VER) }}>師</span>，終身為<span style={{ color: rgb(VER) }}>父</span>
      </div>
      <Caption text="maître un jour, père pour la vie" a={win(t, ch + 1.2, fu, 0.4)} y={880} size={52} />
      <Caption text="父 · fù · le père — un bâton ? une hache de pierre ?" a={win(t, bt - 0.1, END + 0.6, 0.4)} y={880} size={50} />
      <Caption text="De l'armée qui campe à la salle de classe" a={win(t, A10, gu, 0.4)} y={880} size={50} />
    </AbsoluteFill>
  );
};

// écran de fin (≈ 10 s) sur papier : la marque et le prochain caractère dans le tiers gauche
const EndCard: React.FC = () => {
  const t = useT(), a = seg(t, END, END + 0.8);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Paper />
      <Landscape seed={30} from={END - 1} to={SHI_SECONDS + 1} move="still" mood="aube" faint={0.35} />
      <div style={{ position: 'absolute', left: 120, top: 150, width: 520, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ width: 100, height: 150, background: rgb(VER, 0.95), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 40, letterSpacing: 4, color: '#f6eee0', writingMode: 'vertical-rl', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>墨之道</div>
          <div>
            <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss, lineHeight: 1.15 }}>LA VOIE<br />DE L'ENCRE</div>
            <div style={{ marginTop: 8, fontFamily: 'ShuimoLatin', fontSize: 38, fontStyle: 'italic', color: '#5e5044' }}>Mò zhī dào</div>
          </div>
        </div>
        <div style={{ marginTop: 70, fontFamily: 'ShuimoLatin', fontSize: 46, color: '#5e5044', opacity: seg(t, END + 0.8, END + 1.6) }}>Prochain caractère</div>
        <div style={{ fontFamily: 'ShuimoPinceau', fontSize: 260, lineHeight: 1, color: inkCss, opacity: seg(t, END + 1.2, END + 2.2) }}>父</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 60, fontWeight: 600, color: '#3b322b', opacity: seg(t, END + 1.6, END + 2.6) }}>fù · le père</div>
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

export const ShiV1: React.FC = () => {
  const ready = useSetup();
  const { fps } = useVideoConfig();
  const clips: Clip[] = ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b08', 'b09', 'b10'];
  const voice = (k: Clip) => {
    const c = L.clips[k];
    if (!c.pause) return <Sequence key={k} from={Math.round(c.debut * fps)}><Audio src={staticFile(`episodes/shi/voix/${k}.wav`)} /></Sequence>;
    return (
      <React.Fragment key={k}>
        <Sequence from={Math.round(c.debut * fps)} durationInFrames={Math.round(c.pause.coupe * fps)}><Audio src={staticFile(`episodes/shi/voix/${k}.wav`)} /></Sequence>
        <Sequence from={Math.round((c.debut + c.pause.coupe + c.pause.duree) * fps)}><Audio src={staticFile(`episodes/shi/voix/${k}.wav`)} startFrom={Math.round(c.pause.coupe * fps)} /></Sequence>
      </React.Fragment>
    );
  };
  const T1 = R1 + TR1.duration!;
  return (
    <AbsoluteFill style={{ background: '#f3eee4' }}>
      {ready && <Shake impacts={SEALS().map((x) => x.t)}>
        <Win from={0} to={A('b02') - 0.1}><Opening /></Win>
        <Win fade={0.8} from={A('b02') - 0.1} to={A('b03') - 0.3}><Rappel /></Win>
        <Win fade={0.8} from={A('b03') - 0.3} to={R1 + 0.4}><Shang /></Win>
        <Win from={R1 - 0.2} to={T1 + 0.2}><Rouleau1 /></Win>
        <Win fade={0.3} from={T1} to={A('b05') - 0.3}><Zhou /></Win>
        <Win fade={0.8} from={A('b05') - 0.3} to={A('b06') - 0.3}><Za /></Win>
        <Win fade={0.8} from={A('b06') - 0.3} to={A('b07') - 0.3}><Shishi /></Win>
        <Win fade={0.8} from={A('b07') - 0.3} to={R3 + 0.6}><Jin /></Win>
        <Win from={R3END - 0.8} to={A('b09') - 0.3}><Tang /></Win>
        <Win fade={0.8} from={A('b09') - 0.3} to={A('b10') - 0.3}><Recap /></Win>
        <Win fade={0.8} from={A('b10') - 0.3} to={END + 0.8}><Chute /></Win>
        <Win from={END} to={SHI_SECONDS + 1}><EndCard /></Win>
        <SealStamps />
      </Shake>}
      {ready && <Win from={R3 - 1.5} to={R3END + 3.5}><Rouleau3DStage cfg={R3A} /></Win>}
      {ready && <GrainVignette />}
      {SFX.map(([n, tt, v], i) => (
        <Sequence key={`sfx${i}`} from={Math.round(tt * fps)}><Audio src={staticFile(`episodes/shi/audio/sfx_${n}.wav`)} volume={v} /></Sequence>
      ))}
      {clips.map(voice)}
      <Audio src={staticFile('episodes/shi/audio/musique.wav')} volume={(f) => 0.55 * (MF ? Math.max(0, Math.min(1, 1 - (f / fps - MF.debut) / 2)) : 1)} />
      {MF && <Sequence from={Math.round(MF.debut * fps)}><Audio src={staticFile(`musique/${MF.fichier}`)} startFrom={Math.round(MF.depart * fps)}
        volume={(f) => { const s = f / fps, fv = MF.fin_voix - MF.debut, lg = MF.fin - MF.debut;
          const v = s < fv ? MF.volume_voix * Math.min(1, s / MF.montee) : MF.volume_voix + (MF.volume - MF.volume_voix) * Math.min(1, (s - fv) / MF.montee);
          return v * Math.max(0, Math.min(1, (lg - s) / MF.fondu)); }} /></Sequence>}
    </AbsoluteFill>
  );
};
