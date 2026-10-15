// 美 (měi), version tout shuimo — episodes/mei/PROPOSITION.md (v6).
// Faux départ : l'accroche affirme, sûre d'elle, la thèse du mouton (Xu Shen, dynastie Han ; la stèle 羊大則美 de la
// dynastie Song) → « Euh… vraiment ? » → la stèle se fend et éclate → « Remontons à l'origine… » → rouleau à rebours
// (Song → Shang) → la dynastie Shang (os : un homme paré, quatre branches ; le vrai mouton de l'os ; clip du danseur)
// → la dynastie Zhou (bronze, la coiffe se courbe) → rouleau 2 → les Royaumes combattants (carte de Chu, Guodian ;
// portrait-calligramme de Laozi) → Qin puis Han (petit sceau : la coiffe devient 羊 ; retour sur Xu Shen) → le
// dictionnaire (美 au rayon des moutons) → les 9 traits → scène récapitulative (l'homme, la coiffe ; accident du petit
// sceau) → maxime et passerelle 老. Ligne de temps lue dans les repères (episodes/mei/voix/reperes.json, « _ligne »).
// Pigments : l'homme 大 en azurite, la coiffe en malachite, le mouton (la lecture de Xu Shen) en gomme-gutte.
// En attente : clip Seedance B (Laozi et le scribe), bruitages propres (marbre, ciseau).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose, Mood } from '../shuimo/layout';
import { rng } from '../shuimo/common';
import { INK, PIGMENT } from '../shuimo_xue/InkStage';
import { Era, TimeScrollConfig, TimeScrollStage, arrivePose, tagIn } from '../rouleau/TimeScroll';
import { dancerPose, drawDancer, drawDiviner, drawScreen } from '../piying/Piying';
import { VideoReveal } from '../video_encre/VideoReveal';
import { loadLegacy, W } from '../legacy';
import rep from '../data/episodes/mei.json';

type Clip = 'b01' | 'b02' | 'b03' | 'b04' | 'b05' | 'b06' | 'b07' | 'b10' | 'b11' | 'b08' | 'b09';
type Rep = Record<Clip, { duration: number; cues: Record<string, number> }> & {
  _ligne: { clips: Record<Clip, { debut: number; duree: number; pause?: { coupe: number; duree: number } }>; rouleaux: { debut: number; duree: number }[]; fin: number; total: number; bruitages?: [string, number, number][] };
};
const R = rep as unknown as Rep;
const L = R._ligne;
const A = (k: Clip) => L.clips[k].debut;
const B = (k: Clip) => L.clips[k].debut + L.clips[k].duree; // fin de la voix du bloc
const at = (k: Clip, n: string) => {
  const c = L.clips[k], v = R[k].cues[n];
  if (v === undefined) throw new Error(`repère manquant ${k}.${n}`);
  return c.debut + v + (c.pause && v > c.pause.coupe ? c.pause.duree : 0);
};
export const MEI_SECONDS = Math.ceil(L.total * 10) / 10;
const END = L.fin;

// époques du 美 (sceaux de la frise des rouleaux)
const ERAS: Era[] = [
  { zh: '商', date: '−1200' }, { zh: '周', date: '−1046' }, { zh: '戰', date: '−300' }, { zh: '秦', date: '−221' },
  { zh: '漢', date: '100' }, { zh: '宋', date: '986' },
];
const [R1, R2] = L.rouleaux.map((r) => r.debut);
// rouleau 1 à rebours : de la stèle des Song jusqu'aux os des Shang ; rouleau 2 : Zhou → Royaumes combattants
const TR1: TimeScrollConfig = { at: R1, duration: L.rouleaux[0].duree, eras: ERAS, from: 5, to: 0, years: [986, -1200] };
const TR2: TimeScrollConfig = { at: R2, duration: L.rouleaux[1].duree, eras: ERAS, from: 1, to: 2, years: [-1046, -300] };
const R1E = R1 + TR1.duration!, R2E = R2 + TR2.duration!;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const inkCss = rgb(INK);
// pigments constants : l'homme 大 en azurite, la coiffe en malachite, le mouton (la lecture) en gomme-gutte
const AZ = PIGMENT.child, VER = PIGMENT.hand, MAL = PIGMENT.roof, GOM = PIGMENT.yao;
const OCRE = [176, 112, 52];
const P: Record<string, number[]> = { homme: AZ, coiffe: MAL, mouton: GOM };
const GREY = [168, 160, 150], PAPERWHITE = [240, 233, 219];
const useT = () => useCurrentFrame() / useVideoConfig().fps;

// ── polices, moteur Canvas, image de Laozi
const LAOZI = 'episodes/mei/images/laozi_reference.jpg';
const laoziImg: { img: HTMLImageElement | null } = { img: null };
const useSetup = () => {
  const [h] = useState(() => delayRender('polices + moteur + images'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const img = new Image();
    const imgP = new Promise<void>((res) => { img.onload = () => { laoziImg.img = img; res(); }; img.onerror = () => res(); img.src = staticFile(LAOZI); });
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
      imgP,
    ]).then(([f1, f2]) => { [f1, f2].forEach((f) => document.fonts.add(f as FontFace)); return loadLegacy({ three: false, captions: false }); }).then(() => { setReady(true); continueRender(h); });
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

// clip 3D plein cadre : entrée à travers le caractère (美 à l'écran juste avant), sortie par les coups de pinceau
const CLIPS = { danseur: 'episodes/mei/clips/03_danseur.mp4' };
const CLIP_SRC_SECONDS = 8;
const ClipShot: React.FC<{ src: keyof typeof CLIPS; from: number; len: number; glyph?: string; inDur?: number }> = ({ src, from, len, glyph = '美', inDur = 2.8 }) => {
  const { fps } = useVideoConfig();
  const rate = Math.min(0.9, (0.95 * CLIP_SRC_SECONDS) / len);
  return (
    <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(len * fps)}>
      <VideoReveal src={CLIPS[src]} mode="glyphe" glyph={glyph} outMode="pinceau" inDur={inDur} outDur={2.2} playbackRate={rate} zoom={1} />
    </Sequence>
  );
};

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

// ── cartouches, étiquettes, textes (tailles lisibles sur téléphone)
const EraTag: React.FC<{ zh: string; name: string; dates: string; a: number }> = ({ zh, name, dates, a }) => (
  <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a }}>
    <div style={{ width: 92, height: 92, background: rgb(VER, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 30, color: '#6b5d50' }}>{dates}</div>
    </div>
  </div>
);
const Label: React.FC<{ x: number; y: number; zh: string; text: string; color: number[]; a: number; align?: 'left' | 'right' }> = ({ x, y, zh, text, color, a, align = 'left' }) => (
  <div style={{ position: 'absolute', top: y - 50, ...(align === 'left' ? { left: x } : { right: 1920 - x }), opacity: a, display: 'flex', alignItems: 'baseline', gap: 14, flexDirection: align === 'left' ? 'row' : 'row-reverse' }}>
    <span style={{ fontFamily: 'ShuimoKai', fontSize: 100, color: rgb(color) }}>{zh}</span>
    <span style={{ fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 66, fontWeight: 600, color: '#3b322b', textShadow: '0 0 10px rgba(246,241,231,0.95)' }}>{text}</span>
  </div>
);
// légende sur un voile de papier (lisible même sur un estampage sombre)
const Caption: React.FC<{ text: string; a: number; y?: number; size?: number }> = ({ text, a, y = 990, size = 38 }) => (
  <div style={{ position: 'absolute', width: '100%', top: y, textAlign: 'center', opacity: a }}>
    <span style={{ display: 'inline-block', padding: '4px 22px', borderRadius: 14, background: 'rgba(246,241,231,0.78)', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: size, color: '#4b4038', textShadow: '0 0 10px rgba(246,241,231,0.9)' }}>{text}</span>
  </div>
);
// glyphe réel : l'homme et la coiffe, chacun mêlé à son pigment selon man / coif
const meiCol = (man: number, coif: number, coifCol = MAL, dim = 0) => (c: string) => rgb(mixc(c === 'coiffe' ? mixc(INK, coifCol, coif) : c === 'mouton' ? mixc(INK, GOM, coif) : mixc(INK, AZ, man), GREY, dim));

// ── caméra : poussées et panoramiques lents (clés [t, cx, cy, échelle, durée]), respiration permanente, punch
type K = [number, number, number, number, number?];
const Cam: React.FC<{ keys: K[]; punch?: number[]; calm?: [number, number][]; children: React.ReactNode }> = ({ keys, punch = [], calm = [], children }) => {
  const t = useT();
  let [, cx, cy, s] = keys[0];
  for (const [kt, x, y, z, d = 1.2] of keys.slice(1)) {
    if (t <= kt) break;
    const u = ease((t - kt) / d);
    cx += (x - cx) * u; cy += (y - cy) * u; s += (z - s) * u;
  }
  s *= 1 + 0.014 * (0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 11));
  cx += 10 * Math.sin((t * 2 * Math.PI) / 14); cy += 6 * Math.sin((t * 2 * Math.PI) / 17);
  for (const p of punch) s *= 1 + 0.035 * seg(t, p, p + 0.12) * (1 - seg(t, p + 0.15, p + 0.65));
  const amp = 1 - Math.max(0, ...calm.map(([a, b]) => win(t, a, b, 0.6)));
  s = 1 + (s - 1) * amp;
  cx = Math.min(1920 - 960 / s, Math.max(960 / s, cx)); cy = Math.min(1080 - 540 / s, Math.max(540 / s, cy));
  return <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${960 - cx * s}px, ${540 - cy * s}px) scale(${s})` }}>{children}</AbsoluteFill>;
};

// plastron de tortue à l'encre (contour, plaques), chauffé en un point, puis fendu en forme de 卜
// vase tripode (ding) en bronze, en lavis vert-de-gris
const ding = (ctx: CanvasRenderingContext2D, x: number, y: number, a: number) => {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  ctx.fillStyle = 'rgba(92,120,104,0.55)'; ctx.strokeStyle = 'rgba(40,52,46,0.9)'; ctx.lineWidth = 6;
  for (const lx of [-170, 0, 170]) { ctx.beginPath(); ctx.moveTo(lx - 18, 160); ctx.lineTo(lx - 10, 330); ctx.lineTo(lx + 10, 330); ctx.lineTo(lx + 18, 160); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-300, -170); ctx.lineTo(300, -170); ctx.bezierCurveTo(300, 120, 200, 220, 0, 220); ctx.bezierCurveTo(-200, 220, -300, 120, -300, -170); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 180, -170); ctx.lineTo(sx * 180, -270); ctx.lineTo(sx * 250, -270); ctx.lineTo(sx * 250, -170); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(40,52,46,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-290, -120); ctx.lineTo(290, -120); ctx.stroke();
  ctx.restore();
};
// stèle de marbre (dynastie Song), 羊大則美 gravé en creux, caractère par caractère (carve : 0 → 4)
const stele = (ctx: CanvasRenderingContext2D, E: any, x: number, y: number, a: number, carve: number, seal: number) => {
  if (a <= 0) return;
  const w = 300, h = 760, top = y - h / 2;
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#b9b6ad'); g.addColorStop(0.45, '#dad7cf'); g.addColorStop(1, '#a9a69d');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - w / 2, y + h / 2); ctx.lineTo(x - w / 2, top + 110); ctx.quadraticCurveTo(x - w / 2, top, x, top); ctx.quadraticCurveTo(x + w / 2, top, x + w / 2, top + 110); ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,56,50,0.55)'; ctx.lineWidth = 3; ctx.stroke();
  // veines du marbre
  const r = rng(7);
  ctx.strokeStyle = 'rgba(120,116,108,0.25)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) { ctx.beginPath(); let px = x - w / 2 + r() * w, py = top + 60 + r() * h; ctx.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (r() - 0.5) * 70; py += 30 + r() * 40; ctx.lineTo(px, py); } ctx.stroke(); }
  // socle
  ctx.fillStyle = '#9d998f'; ctx.fillRect(x - w / 2 - 30, y + h / 2 - 6, w + 60, 46);
  ctx.restore();
  '羊大則美'.split('').forEach((c, i) => {
    const k = clamp(carve - i);
    if (k <= 0) return;
    const cy = top + 170 + i * 150;
    E.text(ctx, c, x + 2, cy + 3, { font: 'ShuimoKai', size: 128, color: 'rgba(255,255,255,0.55)', alpha: a * k });
    E.text(ctx, c, x, cy, { font: 'ShuimoKai', size: 128, color: i === 0 ? rgb(mixc([58, 54, 48], GOM, 0.55)) : 'rgb(58,54,48)', alpha: a * k });
  });
  if (seal > 0) {
    ctx.save(); ctx.globalAlpha = a * seal; ctx.translate(x + 92, y + h / 2 - 90); ctx.rotate(-0.05);
    ctx.fillStyle = rgb(VER, 0.9); ctx.fillRect(-34, -34, 68, 68); ctx.restore();
    E.text(ctx, '宋', x + 92, y + h / 2 - 90, { font: 'ShuimoKai', size: 50, color: '#f6eee0', alpha: a * seal });
  }
};

// ════════════════ 1. Accroche affirmative → « Euh… vraiment ? » → la stèle se fend et éclate
const STELE = { x: 1380, y: 520 };
const MEI = { x: 640, y: 470, size: 520 };
const FREEZE = at('b01', 'gros') + 1.0; // tout se fige sur « …un gros mouton. »
const CRACK = B('b02') + 0.25, SHATTER = CRACK + 1.0, BARE = SHATTER + 1.4;
// la scène de l'accroche, dessinée au temps tt (figé après FREEZE) — sert aussi aux éclats de la cassure
const drawOpening = (ctx: CanvasRenderingContext2D, E: any, tt: number, part: 'tout' | 'reste' | 'stele' = 'tout') => {
  const A1 = A('b01'), mt = at('b01', 'mouton'), dico = at('b01', 'dico'), haut = at('b01', 'haut'), grand = at('b01', 'grand'), song = at('b01', 'song'), marbre = at('b01', 'marbre'), maxime = at('b01', 'maxime'), ent = at('b01', 'entendu'), gros = at('b01', 'gros');
  // 美 tracé ; le haut (羊) en gomme-gutte sur « le caractère du mouton », le bas (大) en azurite sur « grand »
  const coif = seg(tt, mt + 0.6, mt + 1.2), man = seg(tt, grand, grand + 0.5);
  const toLeft = seg(tt, song - 0.6, song + 0.6); // le 美 se range à gauche quand la stèle arrive
  const mx = MEI.x - 0 * toLeft, my = MEI.y, ms = MEI.size * (1 - 0.18 * toLeft);
  if (part !== 'stele') E.drawStrokes(ctx, 'mei_regulier', { x: mx, y: my, size: ms, progress: 9 * seg(tt, A1 - 0.1, A1 + 2.4), brush: false,
    color: (c: string) => rgb(c === 'coiffe' ? mixc(INK, GOM, coif) : mixc(INK, AZ, man)), glow: 22 * coif * win(tt, mt + 0.6, dico, 0.4), glowColor: rgb(GOM, 0.6) });
  // la stèle de la dynastie Song : 羊大則美 gravé, le sceau posé avec assurance
  const st = seg(tt, song + 0.2, song + 1.2);
  if (part !== 'reste') stele(ctx, E, STELE.x, STELE.y, st, 4 * seg(tt, marbre + 0.3, maxime - 0.2), seg(tt, maxime + 0.1, maxime + 0.4));
  void ent;
};
// la silhouette de la stèle (sans le socle) : les fissures et les éclats y restent enfermés
const STW = 300, STH = 760, STTOP = STELE.y - STH / 2;
const stelePath = (c: CanvasRenderingContext2D) => {
  const x = STELE.x, w = STW, top = STTOP;
  c.beginPath(); c.moveTo(x - w / 2, STELE.y + STH / 2); c.lineTo(x - w / 2, top + 110); c.quadraticCurveTo(x - w / 2, top, x, top);
  c.quadraticCurveTo(x + w / 2, top, x + w / 2, top + 110); c.lineTo(x + w / 2, STELE.y + STH / 2); c.closePath();
};
// fissures : elles partent du 羊 gravé et courent dans le marbre, avec quelques ramifications
const CRACKS = (() => {
  const r = rng(91), out: number[][][] = [];
  const x0 = STELE.x, y0 = STTOP + 170;
  const grow = (x: number, y: number, a: number, n: number, depth: number) => {
    const pts = [[x, y]];
    for (let j = 0; j < n; j++) {
      a += (r() - 0.5) * 0.9; const d = 22 + r() * 30; x += Math.cos(a) * d; y += Math.sin(a) * d;
      x = Math.max(STELE.x - STW / 2 - 4, Math.min(STELE.x + STW / 2 + 4, x)); pts.push([x, y]);
      if (depth < 2 && r() < 0.18) grow(x, y, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), Math.floor(n / 2), depth + 1);
    }
    out.push(pts);
  };
  for (let b = 0; b < 6; b++) grow(x0, y0, (b / 6) * Math.PI * 2 + r() * 0.4 + (b % 2 ? 0.3 : 0), 18 + Math.floor(r() * 10), 0);
  return out;
})();
// éclats : grille déformée sur la stèle seulement, chaque morceau tombe avec sa vitesse et sa rotation
const SHARDS = (() => {
  const r = rng(5), nx = 4, ny = 9, P: number[][][] = [];
  const x0 = STELE.x - STW / 2 - 10, w = STW + 20, y0 = STTOP - 10, h = STH + 70;
  for (let j = 0; j <= ny; j++) { const row: number[][] = []; for (let i = 0; i <= nx; i++) row.push([x0 + (i / nx) * w + (i % nx ? (r() - 0.5) * 40 : 0), y0 + (j / ny) * h + (j % ny ? (r() - 0.5) * 50 : 0)]); P.push(row); }
  const out: { poly: number[][]; cx: number; cy: number; vx: number; vr: number; delay: number }[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const poly = [P[j][i], P[j][i + 1], P[j + 1][i + 1], P[j + 1][i]];
    const cx = poly.reduce((s, p) => s + p[0], 0) / 4, cy = poly.reduce((s, p) => s + p[1], 0) / 4;
    const d = Math.hypot(cx - STELE.x, cy - (STTOP + 170)) / 700;
    out.push({ poly, cx, cy, vx: (cx - STELE.x) * 1.6 + (r() - 0.5) * 60, vr: (r() - 0.5) * 2.2, delay: 0.18 * d + 0.06 * r() });
  }
  return out;
})();
let frozenCanvas: HTMLCanvasElement | null = null;
const Opening: React.FC = () => {
  const t = useT();
  const A1 = A('b01'), mt = at('b01', 'mouton'), dico = at('b01', 'dico'), haut = at('b01', 'haut'), grand = at('b01', 'grand'), song = at('b01', 'song'), maxime = at('b01', 'maxime'), ent = at('b01', 'entendu'), gros = at('b01', 'gros');
  const tf = Math.min(t, FREEZE);
  const shat = t >= SHATTER;
  return (
    <AbsoluteFill>
      <Paper />
      {/* paysages (estompés avant le figé, pour que la stèle et le mouton éclatent sur le papier nu) */}
      <Landscape seed={18} from={A1 - 0.5} to={song + 0.4} move="push" mood="aube" faint={0.45} />
      <Landscape seed={22} from={song - 0.6} to={FREEZE} move="still" mood="brume" faint={0.5} />
      <Cam keys={[[0, 960, 540, 1], [mt - 0.2, 760, 470, 1.12, 1.2], [dico - 0.4, 960, 540, 1.0, 1.2], [song + 0.4, 1200, 520, 1.06, 1.6], [ent - 0.2, 960, 540, 1.0, 1.4], [gros - 0.2, 1100, 520, 1.1, 1.2]]}
        punch={[mt + 0.6, at('b01', 'bon'), maxime + 0.1]}>
        <Draw draw={(ctx, tt, E) => {
          const tq = Math.min(tt, FREEZE);
          if (tt < CRACK) { drawOpening(ctx, E, tq); return; }
          if (!frozenCanvas) { frozenCanvas = document.createElement('canvas'); frozenCanvas.width = 1920; frozenCanvas.height = 1080; }
          const fc = frozenCanvas.getContext('2d')!; fc.clearRect(0, 0, 1920, 1080); drawOpening(fc, E, FREEZE, 'stele');
          // les fissures courent dans le marbre (fines, sombres, liseré clair), sans jamais en sortir
          const cr = seg(tt, CRACK, CRACK + 0.7);
          fc.save(); stelePath(fc); fc.clip();
          CRACKS.forEach((pts, k) => {
            const n = Math.max(1, Math.floor(clamp(cr * 1.25 - k * 0.04) * (pts.length - 1)) + 1);
            fc.beginPath(); pts.slice(0, n).forEach((p, i) => (i ? fc.lineTo(p[0], p[1]) : fc.moveTo(p[0], p[1])));
            fc.strokeStyle = 'rgba(250,246,238,0.75)'; fc.lineWidth = 5; fc.stroke();
            fc.strokeStyle = 'rgba(34,30,26,0.92)'; fc.lineWidth = 2.2; fc.stroke();
          });
          fc.restore();
          // le reste (美 et le mouton) reste figé, puis s'efface quand la stèle tombe
          const rest = 1 - seg(tt, SHATTER, SHATTER + 0.9);
          if (rest > 0) { ctx.save(); ctx.globalAlpha = rest; drawOpening(ctx, E, FREEZE, 'reste'); ctx.restore(); }
          if (tt < SHATTER) { const sh = (tt > CRACK && tt < CRACK + 0.25) ? 3 * Math.sin(tt * 90) : 0; ctx.drawImage(frozenCanvas, sh, 0); return; }
          // les éclats de marbre tombent
          const u = tt - SHATTER;
          SHARDS.forEach((s) => {
            const k = Math.max(0, u - s.delay);
            if (k > 1.6) return;
            const dy = 1100 * k * k, dx = s.vx * k, rot = s.vr * k;
            ctx.save(); ctx.globalAlpha = 1 - seg(k, 0.9, 1.5);
            ctx.translate(s.cx + dx, s.cy + dy); ctx.rotate(rot); ctx.translate(-s.cx, -s.cy);
            ctx.beginPath(); s.poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
            ctx.drawImage(frozenCanvas!, 0, 0);
            ctx.restore();
          });
        }} />
      </Cam>
      {!shat && <>
        <Caption text="美 · měi · beau" a={win(tf, A1 + 1.6, mt - 0.2, 0.4)} y={880} size={56} />
        <Label x={980} y={300} zh="羊" text="le mouton" color={GOM} a={win(tf, mt + 0.6, dico - 0.3, 0.4)} />
        <Caption text="Xu Shen 許慎 · Shuowen jiezi, le premier grand dictionnaire (vers 100)" a={win(tf, dico, haut - 0.2, 0.5)} y={960} size={42} />
        <Caption text="« 美，甘也。从羊从大 » — savoureux : un mouton 羊 en haut, « grand » 大 en bas" a={win(tf, haut - 0.2, song - 0.3, 0.5)} y={960} size={42} />
        <Label x={980} y={720} zh="大" text="grand" color={AZ} a={win(tf, grand, song - 0.6, 0.4)} />
        <Caption text="Xu Xuan 徐鉉 (dynastie Song, 986) : 羊大則美" a={win(tf, at('b01', 'marbre') - 0.2, maxime + 0.2, 0.5)} y={960} size={44} />
        <Caption text="« Quand le mouton est grand, il est beau. »" a={win(tf, maxime + 0.2, ent - 0.1, 0.4)} y={960} size={50} />
        <EraTag zh="漢" name="DYNASTIE HAN" dates="vers l'an 100" a={win(tf, dico - 0.2, song - 0.2, 0.6)} />
        <EraTag zh="宋" name="DYNASTIE SONG" dates="Xe–XIIIe siècle" a={win(tf, song, FREEZE + 0.2, 0.6)} />
      </>}
    </AbsoluteFill>
  );
};

// ════════════════ 1 bis. Derrière le papier nu, une lampe s'allume : ombre chinoise (皮影) du danseur de la pluie
// il danse sur « Remontons à l'origine… », se fige de face, bras et jambes écartés, coiffé de quatre plumes : le signe de l'os
const SH0 = SHATTER + 0.5, SHFRZ = A('b03') + 1.4;
const ShadowDancer: React.FC = () => {
  const { fps } = useVideoConfig();
  const len = SHFRZ + 0.6 - SH0;
  return (
    <Sequence from={Math.round(SH0 * fps)} durationInFrames={Math.round(len * fps)}>
      <Draw draw={(ctx, u) => {
        const tt = SH0 + u, q = arrivePose(TR1, SHFRZ);
        drawScreen(ctx, 0.92 * seg(tt, SH0, SH0 + 0.7) * (1 - seg(tt, SHFRZ, SHFRZ + 0.55)), tt, q.x, q.y);
        const d = dancerPose(tt - SH0, SHFRZ - SH0);
        drawDancer(ctx, { x: q.x, y: q.y, size: 640 * q.s, pose: d.pose, sway: d.sway, t: tt, alpha: seg(tt, SH0 + 0.2, SH0 + 0.8) * (1 - seg(tt, SHFRZ - 0.15, SHFRZ + 0.3)) });
      }} />
    </Sequence>
  );
};

// ════════════════ 2. « Remontons à l'origine… » → rouleau à rebours (Song → Shang) → la dynastie Shang
const Shang: React.FC = () => {
  const t = useT();
  const A3 = A('b03'), A4 = A('b04'), fis = at('b04', 'fissures'), corps = at('b04', 'corps'), pluie = at('b04', 'pluie'), os = at('b04', 'os'), hom = at('b04', 'homme'), dw = at('b04', 'dawen'), coif = at('b04', 'coiffe'), br = at('b04', 'branches'), mt = at('b04', 'mouton'), mus = at('b04', 'museau'), rien = at('b04', 'rien'), pare = at('b04', 'pare'), plumes = at('b04', 'plumes'), terre = at('b04', 'terre'), jam = at('b04', 'jamais');
  const clipIn = pare - 0.4, clipOut = terre - 0.2;
  return (
    <AbsoluteFill>
      <Cam keys={[[A3 - 0.3, 960, 540, 1.0], [R1 - 0.4, 960, 540, 1, 0.4], [os + 0.4, 960, 520, 1.06, 1.4], [coif - 0.3, 960, 330, 1.3, 1.0], [mt - 0.4, 1060, 520, 1.04, 1.0], [rien, 960, 520, 1.06, 1.0], [terre, 960, 560, 1.02, 1.0]]}
        punch={[fis + 0.2, os + 1.2, corps, coif + 0.3, rien + 0.2]} calm={[[R1 - 0.4, R1E + 0.3]]}>
        <TimeScrollStage cfg={TR1} under={<Paper />}
          fromLandscape={{ seed: 22, since: A3 - 0.6, mood: 'brume' }} toLandscape={{ seed: 14, until: A('b05') + 0.5, mood: 'aube' }}>
          <Draw draw={(ctx, tt, E) => {
            // avant et pendant le rouleau : le 美 d'aujourd'hui, petit, gris, qui se défait trait par trait
            // avant et pendant le rouleau : l'ombre du danseur se fige et devient le signe de l'os, qui remonte le temps
            if (tt < R1E) {
              const q = arrivePose(TR1, tt);
              const born = seg(tt, SHFRZ - 0.35, SHFRZ + 0.35);
              if (born > 0) E.drawRealGlyph(ctx, 'mei_jiaguwen', { x: q.x, y: q.y, size: 640 * q.s, opacity: born * (1 - seg(tt, R1E - 0.3, R1E)), color: () => inkCss });
              return;
            }
            // l'os : plastron tamponné, le signe révélé en blanc puis à l'encre ; l'homme (azurite), la coiffe (malachite)
            // la divination : un plastron d'os à l'encre, chauffé (point rouge), qui se fend (fissures en 卜)
            // la divination en ombre chinoise : le devin grave la question, chauffe la tige au brasero, l'os se fend
            const shell = win(tt, A4 - 0.4, os + 0.5, 0.6);
            if (shell > 0) {
              drawScreen(ctx, shell, tt, 1040, 470);
              const grave = at('b04', 'grave');
              drawDiviner(ctx, 740, 900, 1.2, { alpha: shell, t: tt, carve: seg(tt, grave - 0.1, grave + 1.6), dip: seg(tt, fis - 2.4, fis - 1.9) * (1 - seg(tt, fis - 1.3, fis - 0.9)),
                heat: seg(tt, fis - 1.1, fis - 0.2), crack: seg(tt, fis - 0.1, fis + 0.7), read: seg(tt, fis + 0.9, fis + 1.8) });
            }
            const rv = seg(tt, os + 0.2, os + 1.4), dry = seg(tt, hom - 0.6, hom + 0.4);
            const man = seg(tt, hom, hom + 0.5), cf = seg(tt, coif, coif + 0.5);
            const base = (_c: string) => mixc(mixc(PAPERWHITE, INK, 0.45), INK, dry);
            const col = (c: string) => rgb(c === 'coiffe' ? mixc(base(c), MAL, cf) : mixc(base(c), AZ, man));
            const mainA = (1 - seg(tt, clipIn - 0.2, clipIn + 0.4)) + seg(tt, clipOut, clipOut + 0.8);
            const two = tt > br + 0.6 && tt < br + 2.2; // « parfois deux »
            if (mainA > 0) E.drawRealGlyph(ctx, two ? 'mei_jiaguwen2' : 'mei_jiaguwen', { x: 960, y: 540, size: 660, reveal: () => rv, opacity: Math.min(1, mainA), color: col, glow: 26 * cf * win(tt, coif, mt, 0.5), glowColor: rgb(MAL, 0.6) });
            // « le même que dans 文 » : le 文 de l'os, en petit, à gauche
            const wa = win(tt, dw - 0.2, coif - 0.2, 0.4);
            if (wa > 0) E.drawRealGlyph(ctx, 'wen_jiaguwen', { x: 470, y: 560, size: 300, opacity: wa, color: () => rgb(mixc(INK, AZ, 0.6)) });
            // le vrai mouton de l'os : museau en pointe, cornes qui retombent (gomme-gutte), puis il pâlit
            const ya = win(tt, mt - 0.2, rien + 0.6, 0.5);
            if (ya > 0) {
              E.drawRealGlyph(ctx, 'mei_yang_jiaguwen', { x: 1480, y: 540, size: 420, opacity: ya, color: () => rgb(mixc(INK, GOM, seg(tt, mus - 0.2, mus + 0.4))), glow: 18 * win(tt, mus, rien, 0.3), glowColor: rgb(GOM, 0.5) });
              if (tt > rien) { // « ici, rien de tel » : un trait rouge barre la comparaison
                const k = seg(tt, rien, rien + 0.5);
                ctx.save(); ctx.globalAlpha = ya; ctx.strokeStyle = rgb(VER, 0.9); ctx.lineWidth = 10; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(1290, 760); ctx.lineTo(1290 + 380 * k, 760 - 440 * k); ctx.stroke(); ctx.restore();
              }
            }
            // 1899 : l'os s'enfonce sous la terre (lavis brun qui monte)
            const ter = seg(tt, terre - 0.2, terre + 2.2);
            if (ter > 0) {
              const g = ctx.createLinearGradient(0, 1080 - 900 * ter, 0, 1080);
              g.addColorStop(0, 'rgba(120,96,70,0)'); g.addColorStop(0.2, 'rgba(120,96,70,0.55)'); g.addColorStop(1, 'rgba(90,70,52,0.8)');
              ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
            }
          }} />
        </TimeScrollStage>
      </Cam>
      <ClipShot src="danseur" from={clipIn} len={clipOut - clipIn} />
      <Caption text="Remontons à l'origine…" a={win(t, A3 - 0.2, R1 + 0.3, 0.4)} y={960} size={52} />
      <Label x={1300} y={760} zh="大" text="un homme, de face" color={AZ} a={win(t, hom + 0.3, dw - 0.2, 0.4)} />
      <Caption text="la divination : on grave la question, on chauffe l'os, on lit les fissures" a={win(t, A4 + 1.6, os - 0.2, 0.5)} y={960} size={42} />
      <Caption text="le même homme de face que dans 文 (épisode précédent)" a={win(t, dw, corps - 0.1, 0.4)} y={960} size={42} />
      <Caption text="une tête · deux bras ouverts · deux jambes écartées" a={win(t, corps, coif - 0.3, 0.4)} y={960} size={46} />
      <Label x={1330} y={300} zh="" text="une haute coiffe" color={MAL} a={win(t, coif + 0.2, mt - 0.4, 0.4)} />
      <Caption text={t < br + 0.6 ? 'quatre branches, dressées vers le ciel' : 'parfois deux (甲686)'} a={win(t, br, mt - 0.4, 0.4)} y={960} size={46} />
      <Caption text="羊 sur l'os : un museau en pointe, deux cornes qui retombent" a={win(t, mus - 0.2, rien + 0.4, 0.4)} y={960} size={44} />
      <Caption text="un homme paré — un danseur, sans doute, coiffé de plumes" a={win(t, rien + 0.6, clipIn + 0.6, 0.4)} y={960} size={44} />
      <Caption text="les inscriptions Shang mentionnent des danses pour appeler la pluie" a={win(t, pluie - 0.1, terre - 0.3, 0.4)} y={990} size={40} />
      <Caption text="les os de divination ne sont redécouverts qu'en 1899" a={win(t, terre + 0.2, jam + 0.2, 0.5)} y={960} size={44} />
      <Caption text="Xu Shen n'en a jamais vu un seul" a={win(t, jam - 0.2, A('b05') - 0.2, 0.4)} y={960} size={48} />
      <EraTag zh="商" name="DYNASTIE SHANG" dates="Anyang · v. 1200 av. J.-C." a={tagIn(TR1, t) * (1 - seg(t, A('b05') - 0.6, A('b05')))} />
    </AbsoluteFill>
  );
};

// ════════════════ 3. La dynastie Zhou : le bronze, la coiffe se resserre et se courbe → rouleau 2
const Zhou: React.FC = () => {
  const t = useT();
  const A5 = A('b05'), ins = at('b05', 'inscr'), bz = at('b05', 'bronze'), ep = at('b05', 'epaissit'), cf = at('b05', 'coiffe'), co = at('b05', 'cornes');
  return (
    <AbsoluteFill>
      <Cam keys={[[A5 - 0.3, 960, 540, 1.02], [ep, 960, 560, 1.06, 1.0], [cf - 0.2, 960, 380, 1.25, 1.0], [R2 - 0.5, 960, 540, 1, 0.5]]} punch={[bz + 0.6, co + 0.2]} calm={[[R2 - 0.5, R2E + 0.3]]}>
        <TimeScrollStage cfg={TR2} defaultCursor under={<Landscape seed={9} from={A5 - 1} to={A5 + 14} move="pan" mood="jour" faint={0.6} />}
          fromLandscape={{ seed: 9, since: co - 1 }} toLandscape={{ seed: 26, until: A('b06') + 1.5, mood: 'brume' }}>
          <Draw draw={(ctx, tt, E) => {
            const a = win(tt, A5 - 0.2, R2 + 0.3, 0.5);
            if (a <= 0) return;
            const side = seg(tt, cf + 1.6, cf + 2.4) * (1 - seg(tt, co - 0.3, co));
            const c1 = seg(tt, cf, cf + 0.5), horn = seg(tt, co - 0.1, co + 0.6);
            // le vase de bronze ; l'inscription y est coulée, puis elle sort du vase et grandit
            const out = ease(seg(tt, ep - 0.2, ep + 1.0));
            ding(ctx, 960, 560, a * seg(tt, bz - 0.5, bz + 0.4) * (1 - out));
            const gy = 520 + 40 * (1 - out), gs = 300 + 380 * out;
            E.drawRealGlyph(ctx, 'mei_jinwen', { x: 960 + 240 * side, y: gy, size: gs, reveal: () => seg(tt, ins - 0.2, ins + 1.0), opacity: a * seg(tt, ins - 0.3, ins + 0.3), color: (c: string) => rgb(c === 'coiffe' ? mixc(mixc(INK, MAL, c1), GOM, 0.55 * horn) : mixc(INK, AZ, seg(tt, ep, ep + 0.5))), glow: 24 * c1, glowColor: rgb(horn > 0.5 ? GOM : MAL, 0.6) });
            if (side > 0) E.drawRealGlyph(ctx, 'mei_jiaguwen', { x: 960 - 500 * side, y: 540, size: 440, opacity: a * side, color: meiCol(1, 1) });
          }} />
        </TimeScrollStage>
      </Cam>
      <Caption text="un vase rituel en bronze (ding) : l'inscription est coulée avec le métal" a={win(t, bz, ep - 0.2, 0.5)} y={980} size={42} />
      <Caption text="bronze Zhou (美爵) : le trait s'épaissit, devient plus régulier" a={win(t, ep, cf - 0.2, 0.5)} y={980} size={44} />
      <Caption text="os (Shang) → bronze (Zhou) : la coiffe se resserre, ses branches se courbent" a={win(t, cf + 1.6, co - 0.3, 0.4)} y={980} size={42} />
      <Caption text="…et l'on commence à y voir des cornes" a={win(t, co - 0.2, R2 + 0.2, 0.4)} y={980} size={48} />
      <EraTag zh="周" name="DYNASTIE ZHOU" dates="XIe siècle av. J.-C." a={seg(t, A5 - 0.6, A5 + 0.2) * (1 - seg(t, R2, R2 + 0.4))} />
      <EraTag zh="戰" name="ROYAUMES COMBATTANTS" dates="Ve–IIIe siècle av. J.-C." a={tagIn(TR2, t) * (1 - seg(t, R2E + 2.5, R2E + 3.2))} />
    </AbsoluteFill>
  );
};

// ════════════════ 4. Les Royaumes combattants : carte de Chu, Guodian ; le portrait-calligramme de Laozi
const GUODIAN = [112.2, 31.05], YING = [112.2, 30.4];
// le royaume de Chu (vers 300 av. J.-C.), contour simplifié : moyen Yangzi, de la Han au lac Dongting
const CHU = [[108.6, 32.6], [111.2, 33.6], [114.6, 33.6], [117.2, 33.0], [119.4, 31.6], [118.6, 29.4], [115.6, 28.0], [112.4, 27.0], [109.6, 27.6], [108.0, 29.8]];
// le vers tel qu'il est écrit à Guodian (Laozi A) : 天下皆智(知)美之為美也，惡已 — formes de Chu (glyphes/vers/SOURCE.md)
const VERSE = '天下皆知美之為美也惡已'.split('');
const NS = VERSE.length;
const HEART = [1920 * 0.52, 1080 * 0.4];
let washCanvas: HTMLCanvasElement | null = null, maskCanvas: HTMLCanvasElement | null = null;
// le portrait de Laozi qui s'étend en taches de lavis depuis un point (bord irrégulier, posé en multiplication)
const laoziWash = (ctx: CanvasRenderingContext2D, wash: number, R = 780) => {
  const img = laoziImg.img;
  if (!img || wash <= 0) return;
  if (!washCanvas) { washCanvas = document.createElement('canvas'); washCanvas.width = 1920; washCanvas.height = 1080; }
  if (!maskCanvas) { maskCanvas = document.createElement('canvas'); maskCanvas.width = 1920; maskCanvas.height = 1080; }
  const mc = maskCanvas.getContext('2d')!;
  mc.clearRect(0, 0, 1920, 1080);
  const R0 = R * ease(wash), r = rng(12);
  for (let k = 0; k < 26; k++) {
    const a = r() * 6.283, d = r() * R0 * 0.55, rr = Math.max(1, R0 * (0.35 + 0.5 * r()));
    const x = HEART[0] + Math.cos(a) * d, y = HEART[1] + Math.sin(a) * d;
    const g = mc.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    mc.fillStyle = g; mc.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
  }
  const wc = washCanvas.getContext('2d')!;
  wc.globalCompositeOperation = 'source-over'; wc.clearRect(0, 0, 1920, 1080); wc.drawImage(img, 0, 0, 1920, 1080);
  wc.globalCompositeOperation = 'destination-in'; wc.drawImage(maskCanvas, 0, 0);
  wc.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(washCanvas, 0, 0); ctx.restore();
};
// position d'un caractère du vers : deux colonnes, lues de haut en bas et de droite à gauche
const versePos = (i: number) => (i < 6 ? [1060, 175 + i * 142] : [860, 175 + (i - 6) * 142]);
// cible dans la silhouette de Laozi (les caractères s'y fondent)
const FIGPTS = (() => { const r = rng(44); return Array.from({ length: NS }, (_, i) => [900 + (r() - 0.5) * 160, 180 + (i / (NS - 1)) * 760]); })();
const Chu: React.FC = () => {
  const t = useT();
  const A6 = A('b06'), roy = at('b06', 'royaumes'), ret = at('b06', 'retrouve'), gd = at('b06', 'guodian'), lz = at('b06', 'laozi'), vers = at('b06', 'vers'), beau = at('b06', 'beau'), laid0 = at('b06', 'laideur'), aut = at('b06', 'autrement'), dec = at('b06', 'decide'), laid = at('b06', 'laid'), mai = at('b06', 'maitre');
  const pz = L.clips.b06.pause!, p0 = A6 + pz.coupe, p1 = p0 + pz.duree;
  const mapTo = vers - 0.2;
  return (
    <AbsoluteFill>
      <Cam keys={[[A6 - 0.3, 960, 540, 1.02], [vers, 960, 540, 1.04, 0.8], [p0 + 0.2, 960, 540, 1.0, 1.0], [p1 - 0.6, 980, 470, 1.08, 2.0], [aut + 0.4, 960, 540, 1.0, 1.2]]} punch={[beau + 0.4, laid0 + 0.2, p1 - 0.2, dec, laid]}>
        <Paper />
        <Landscape seed={26} from={A6 - 1.5} to={A('b07') + 0.5} move="still" mood="brume" faint={0.4} />
        <Draw draw={(ctx, tt, E) => {
          if (tt < vers - 0.6) return;
          // 1. le vers s'écrit à l'écran, caractère par caractère, dans l'écriture de Chu ; 美 en malachite, 惡 en ocre
          const step = (laid0 - vers) / NS;
          const melt = seg(tt, p0 + 0.2, p1 - 0.8); // 2. pendant la pause : les caractères se fondent dans la silhouette
          for (let i = 0; i < NS; i++) {
            const t0 = vers + 0.2 + i * step;
            const a = seg(tt, t0, t0 + 0.35) * (1 - seg(tt, p1 - 1.4, p1 - 0.4));
            if (a <= 0) continue;
            const [x0, y0] = versePos(i), [x1, y1] = FIGPTS[i];
            const k = ease(clamp((melt - i * 0.04) / 0.6));
            const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k, sz = (VERSE[i] === '美' ? 215 : 150) * (1 - 0.55 * k);
            const isMei = VERSE[i] === '美', isE = VERSE[i] === '惡';
            const hl = isMei ? win(tt, beau - 0.1, p0 + 0.4, 0.3) : isE ? win(tt, laid0 - 0.1, p0 + 0.4, 0.3) : 0;
            const col = isMei ? mixc(INK, MAL, 0.4 + 0.6 * hl) : isE ? mixc(INK, OCRE, 0.4 + 0.6 * hl) : INK;
            E.drawRealGlyph(ctx, `mei_vers_${String(i).padStart(2, '0')}`, { x, y, size: sz, reveal: () => seg(tt, t0, t0 + Math.max(0.3, step)), opacity: a, color: () => rgb(col), glow: 20 * hl, glowColor: rgb(isMei ? MAL : OCRE, 0.6) });
          }
          // 3. le portrait naît de l'encre des caractères
          laoziWash(ctx, seg(tt, p0 + 0.9, p1 + 0.4));
          // 4. « beau » à gauche, « laid » à droite, pendant l'explication
          const sides = win(tt, aut - 0.2, A('b07') - 0.2, 0.5);
          if (sides > 0) {
            const pb = win(tt, dec, laid - 0.1, 0.25), pl = seg(tt, laid, laid + 0.3);
            const fade = 1 - 0.5 * seg(tt, mai + 0.6, mai + 1.6);
            E.text(ctx, '美', 380, 470, { font: 'ShuimoKai', size: 200 * (1 + 0.08 * pb), color: rgb(MAL), alpha: sides * fade, glow: 24 * pb, glowColor: rgb(MAL, 0.6) });
            E.text(ctx, 'beau', 380, 640, { font: 'Cormorant', size: 64, weight: 700, color: rgb(MAL), alpha: sides * fade });
            E.text(ctx, '惡', 1540, 470, { font: 'ShuimoKai', size: 200 * (1 + 0.08 * pl), color: rgb(OCRE), alpha: sides * seg(tt, aut + 0.2, aut + 0.8), glow: 24 * pl, glowColor: rgb(OCRE, 0.6) });
            E.text(ctx, 'laid', 1540, 640, { font: 'Cormorant', size: 64, weight: 700, color: rgb(OCRE), alpha: sides * seg(tt, aut + 0.2, aut + 0.8) });
          }
        }} />
      </Cam>
      <MapPanel from={A6 - 0.4} to={mapTo} draw={(ctx, u, E, tt) => {
        const z = ease(seg(tt, ret - 0.4, gd + 1.6)), v = { lon: 113.5 - 1.2 * z, lat: 32.6 - 1.4 * z, k: 58 + 70 * z };
        const vb = { lon: 113.5, lat: 32.6, k: 55 };
        E.mapLayer(ctx, v, vb, 140, 'mei_chu', (c: CanvasRenderingContext2D, w: any) => E.drawMap(c, 0, w, { paper: true, rivers: 1, deco: false }));
        // le royaume de Chu, au sud, en lavis vert
        const ra = seg(tt, roy - 0.3, roy + 0.8);
        if (ra > 0) {
          ctx.save(); ctx.globalAlpha = ra; ctx.beginPath();
          CHU.forEach((p, i) => { const q = E.proj(v, p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath();
          ctx.fillStyle = rgb(MAL, 0.2); ctx.fill(); ctx.setLineDash([12, 9]); ctx.lineWidth = 4; ctx.strokeStyle = rgb(MAL, 0.75); ctx.stroke(); ctx.restore();
          const c = E.proj(v, [114.2, 30.0]);
          E.text(ctx, '楚', c[0], c[1], { font: 'ShuimoKai', size: 110, color: rgb(MAL), alpha: ra * 0.85 });
        }
        E.mapDeco(ctx, { paper: true });
        E.marker(ctx, tt, v, GUODIAN, 'Guodian 郭店', 'tombe fouillée en 1993', seg(tt, gd - 0.2, gd + 0.5), '#c0392b', 1);
        void YING;
      }} />
      <Caption text="les Royaumes combattants (Ve–IIIe siècle av. J.-C.)" a={win(t, roy - 0.2, ret - 0.1, 0.4)} y={980} size={42} />
      <Caption text="Guodian 郭店 (1993) : les plus anciens écrits de Laozi 老子 (≈ 300 av. J.-C.)" a={win(t, lz - 0.2, mapTo, 0.4)} y={990} size={38} />
      <Caption text="« Quand tout le monde sait ce qui est beau… voilà la laideur. »" a={win(t, beau - 0.2, p0 + 0.6, 0.4)} y={990} size={46} />
      <Caption text="天下皆智(知)美之為美也，惡已 · écriture de Chu, Guodian" a={win(t, p0 + 0.4, p1 - 0.2, 0.5)} y={990} size={42} />
      <Caption text="Laozi 老子 · portrait imaginé" a={win(t, p1 - 0.2, aut + 0.6, 0.5)} y={990} size={40} />
      <Caption text="décider du beau, c'est décider aussi du laid" a={win(t, dec - 0.2, mai - 0.2, 0.4)} y={990} size={46} />
      <Caption text="le vieux maître se méfiait de la beauté" a={win(t, mai, A('b07') - 0.2, 0.4)} y={990} size={46} />
    </AbsoluteFill>
  );
};

// ════════════════ 5. Qin puis Han : le petit sceau (la coiffe devient 羊) ; retour sur Xu Shen
const QinHan: React.FC = () => {
  const t = useT();
  const A7 = A('b07'), emp = at('b07', 'empereur'), sc = at('b07', 'sceau'), ord = at('b07', 'ordre'), sym = at('b07', 'symetrique'), co = at('b07', 'cornes'), mt = at('b07', 'mouton'), xs = at('b07', 'xushen'), yeux = at('b07', 'yeux'), sav = at('b07', 'savoureux'), err = at('b07', 'erreur'), ecr = at('b07', 'ecriture');
  return (
    <AbsoluteFill>
      <Cam keys={[[A7 - 0.3, 960, 540, 1.02], [sym - 0.3, 960, 360, 1.25, 1.0], [mt - 0.4, 1060, 520, 1.04, 1.0], [xs, 960, 540, 1.02, 1.0], [yeux, 900, 520, 1.1, 1.2], [ecr, 960, 540, 1.04, 1.0]]} punch={[sc + 0.6, mt + 1.3, sav + 0.2]}>
        <Paper />
        <Landscape seed={3} from={A7 - 1.5} to={B('b07') + 1} move="still" mood="brume" faint={0.45} />
        <Draw draw={(ctx, tt, E) => {
          // le petit sceau tracé, la coiffe (malachite) qui passe à la gomme-gutte quand elle touche le 羊 du sceau
          const s1 = seg(tt, sc - 0.4, sc + 1.4) * (1 - seg(tt, xs - 0.4, xs + 0.2));
          const meet = seg(tt, mt + 1.0, mt + 2.0);
          if (s1 > 0) E.drawRealGlyph(ctx, 'mei_xiaozhuan', { x: 760, y: 520, size: 640, reveal: () => seg(tt, sc - 0.4, sc + 1.4), opacity: s1, color: (c: string) => rgb(c === 'coiffe' ? mixc(mixc(INK, MAL, seg(tt, sym - 0.2, sym + 0.4)), GOM, meet) : mixc(INK, AZ, 0.6)), glow: 22 * win(tt, sym, xs, 0.4), glowColor: rgb(meet > 0.5 ? GOM : MAL, 0.6) });
          // le mouton du petit sceau, posé à côté, puis il glisse sur la coiffe
          const ya = seg(tt, mt - 0.2, mt + 0.4) * (1 - seg(tt, mt + 2.2, mt + 2.8)) * (1 - seg(tt, xs - 0.4, xs + 0.2));
          if (ya > 0) {
            const slide = ease(seg(tt, mt + 0.8, mt + 2.0));
            const [cx, cy] = E.realCenter('mei_xiaozhuan', 'coiffe', { x: 760, y: 520, size: 640 });
            const x = 1330 + (cx - 1330) * slide, y = 420 + (cy - 420) * slide;
            E.drawRealGlyph(ctx, 'mei_yang_xiaozhuan', { x, y, size: 380 - 90 * slide, opacity: ya * (1 - 0.6 * slide), color: () => rgb(GOM), glow: 18, glowColor: rgb(GOM, 0.5) });
          }
          // Xu Shen : sa citation en colonne ; derrière lui, l'os qu'il n'a jamais vu (en transparence)
          const xa = win(tt, xs - 0.2, err + 0.4, 0.6);
          if (xa > 0) {
            E.drawRealGlyph(ctx, 'mei_jiaguwen', { x: 1450, y: 520, size: 560, opacity: xa * 0.22 * seg(tt, yeux + 1.0, yeux + 2.0), color: () => rgb(MAL) });
            E.drawRealGlyph(ctx, 'mei_xiaozhuan', { x: 760, y: 520, size: 560, opacity: xa, color: meiCol(0.6, 1, GOM) });
            '美甘也从羊从大'.split('').forEach((c, i) => E.text(ctx, c, 1180, 190 + i * 104, { font: 'ShuimoKai', size: 86, color: c === '羊' ? rgb(GOM) : inkCss, alpha: xa * seg(tt, yeux - 0.2 + i * 0.12, yeux + 0.2 + i * 0.12) }));
          }
          // soie de Mawangdui puis stèle des clercs : le mouton reste
          const mw = win(tt, err - 0.1, ecr + 0.3, 0.4), ls = seg(tt, ecr + 0.1, ecr + 0.6) * (1 - seg(tt, B('b07') + 0.2, B('b07') + 0.6));
          if (mw > 0) E.drawRealGlyph(ctx, 'mei_mawangdui', { x: 960, y: 520, size: 600, opacity: mw, color: meiCol(0.6, 1, GOM) });
          if (ls > 0) E.drawRealGlyph(ctx, 'mei_lishu', { x: 960, y: 520, size: 600, opacity: ls, color: meiCol(0.6, 1, GOM) });
        }} />
      </Cam>
      <Caption text="221 av. J.-C. · le Premier Empereur impose le petit sceau 小篆" a={win(t, emp, ord - 0.1, 0.4)} y={960} size={44} />
      <Caption text="pour unifier l'empire, chaque caractère est redessiné, bien symétrique" a={win(t, ord - 0.2, at('b07', 'cornes') - 0.2, 0.4)} y={960} size={42} />
      <Caption text="la coiffe : deux cornes, trois traits…" a={win(t, at('b07', 'cornes') - 0.2, mt - 0.2, 0.4)} y={960} size={46} />
      <Label x={1170} y={250} zh="羊" text="le mouton (petit sceau)" color={GOM} a={win(t, mt - 0.1, mt + 2.3, 0.4)} />
      <Caption text="…exactement le même caractère que le mouton" a={win(t, mt + 0.2, xs - 0.3, 0.4)} y={960} size={48} />
      <Caption text="Xu Shen 許慎, vers 100 : le Shuowen jiezi" a={win(t, xs + 0.2, at('b07', 'neufmille') - 0.2, 0.4)} y={990} size={44} />
      <Caption text="9 353 caractères expliqués un par un, découpés en morceaux" a={win(t, at('b07', 'neufmille') - 0.1, yeux - 0.1, 0.4)} y={990} size={44} />
      <Caption text="« 美，甘也。从羊从大 » — savoureux : un mouton sur un homme" a={win(t, yeux, sav - 0.2, 0.4)} y={990} size={42} />
      <Caption text="« savoureux » — une erreur presque inévitable" a={win(t, sav, err + 1.4, 0.4)} y={990} size={48} />
      <Caption text="Laozi sur soie (Mawangdui, 168 av. J.-C.) puis stèle des clercs (曹全碑) : le mouton reste" a={win(t, err + 1.4, B('b07') + 0.4, 0.4)} y={990} size={38} />
      <EraTag zh="秦" name="DYNASTIE QIN" dates="221 av. J.-C. · le petit sceau" a={seg(t, A7 - 0.5, A7) * (1 - seg(t, xs - 0.5, xs))} />
      <EraTag zh="漢" name="DYNASTIE HAN" dates="vers l'an 100 · Xu Shen" a={seg(t, xs - 0.3, xs + 0.3) * (1 - seg(t, B('b07') - 0.2, B('b07') + 0.3))} />
    </AbsoluteFill>
  );
};

// ════════════════ 6. Le dictionnaire : 美 au rayon des moutons
const KEYS = ['一', '丨', '丶', '人', '口', '土', '大', '女', '子', '心', '手', '木', '水', '火', '羊', '羽'];
const ENTRIES: [string, string, string][] = [['羊', 'yáng', 'mouton'], ['美', 'měi', 'beau'], ['羔', 'gāo', 'agneau'], ['群', 'qún', 'troupeau']];
const Dico: React.FC = () => {
  const t = useT();
  const A10 = A('b10'), cle = at('b10', 'cle'), dico = at('b10', 'dico'), ray = at('b10', 'rayon'), agn = at('b10', 'agneau'), trp = at('b10', 'troupeau');
  return (
    <AbsoluteFill>
      <Cam keys={[[A10 - 0.3, 960, 540, 1.02], [cle, 700, 600, 1.12, 1.2], [dico + 0.6, 1180, 540, 1.1, 1.4], [trp + 0.4, 1200, 560, 1.14, 1.0]]} punch={[ray + 0.1]}>
        <Paper />
        <Draw draw={(ctx, tt, E) => {
          const a = seg(tt, A10 - 0.3, A10 + 0.6);
          // livre ouvert : page de gauche (index des clés), page de droite (羊部)
          ctx.save(); ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(60,46,34,0.18)'; E.roundRect(ctx, 330, 150, 1260, 820, 18); ctx.fill();
          ctx.fillStyle = '#f8f3e8'; E.roundRect(ctx, 340, 140, 610, 820, 12); ctx.fill(); E.roundRect(ctx, 970, 140, 610, 820, 12); ctx.fill();
          ctx.strokeStyle = 'rgba(80,64,50,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(960, 150); ctx.lineTo(960, 960); ctx.stroke();
          ctx.restore();
          E.text(ctx, '部首檢字表', 645, 200, { font: 'ShuimoKai', size: 44, color: '#5b4f44', alpha: a });
          // index des clés : le doigt d'encre descend jusqu'à 羊 sur « la clé du mouton »
          const k = Math.min(KEYS.length - 2, Math.floor(ease(seg(tt, cle - 1.6, cle + 0.3)) * (KEYS.length - 2)));
          KEYS.forEach((c, i) => {
            const x = 440 + (i % 4) * 140, y = 300 + Math.floor(i / 4) * 150;
            const hi = c === '羊' ? seg(tt, cle + 0.2, cle + 0.6) : 0;
            if (hi > 0) { ctx.save(); ctx.globalAlpha = a * hi; ctx.fillStyle = rgb(GOM, 0.35); ctx.beginPath(); ctx.arc(x, y, 58, 0, 7); ctx.fill(); ctx.restore(); }
            E.text(ctx, c, x, y, { font: 'ShuimoKai', size: 84, color: hi > 0.5 ? rgb(mixc(INK, GOM, 0.8)) : inkCss, alpha: a });
          });
          const di = KEYS.indexOf('羊'), cur = Math.min(k, di), px = 440 + (cur % 4) * 140, py = 300 + Math.floor(cur / 4) * 150;
          const dot = win(tt, cle - 1.6, dico, 0.3);
          if (dot > 0) { ctx.save(); ctx.globalAlpha = dot; ctx.fillStyle = inkCss; ctx.beginPath(); ctx.arc(px - 62, py + 30, 12, 0, 7); ctx.fill(); ctx.restore(); }
          // page de droite : 羊部
          const pg = seg(tt, dico - 0.3, dico + 0.6);
          if (pg <= 0) return;
          E.text(ctx, '羊部', 1275, 210, { font: 'ShuimoKai', size: 64, color: rgb(mixc(INK, GOM, 0.7)), alpha: pg });
          ENTRIES.forEach(([c, py2, fr], i) => {
            const y = 350 + i * 150;
            const hi = c === '美' ? seg(tt, ray, ray + 0.4) : c === '羔' ? win(tt, agn - 0.1, trp + 1.2, 0.3) : c === '群' ? seg(tt, trp - 0.1, trp + 0.3) : 0;
            if (hi > 0) { ctx.save(); ctx.globalAlpha = pg * hi; ctx.fillStyle = rgb(c === '美' ? GOM : MAL, 0.22); E.roundRect(ctx, 1010, y - 62, 530, 124, 14); ctx.fill(); ctx.restore(); }
            E.text(ctx, c, 1090, y, { font: 'ShuimoKai', size: 100, color: c === '美' ? rgb(mixc(INK, GOM, seg(tt, ray, ray + 0.4))) : inkCss, alpha: pg });
            E.text(ctx, py2, 1200, y - 20, { font: 'Cormorant', size: 44, weight: 700, align: 'left', color: '#5b4f44', alpha: pg });
            E.text(ctx, fr, 1200, y + 26, { font: 'Cormorant', size: 44, align: 'left', color: '#5b4f44', alpha: pg });
          });
        }} />
      </Cam>
      <Caption text="l'erreur dure encore : 美 est rangé sous la clé du mouton 羊" a={win(t, cle - 0.2, dico + 0.4, 0.4)} y={1000} size={44} />
      <Caption text="« beau », au rayon des moutons — à côté de l'agneau et du troupeau" a={win(t, ray - 0.2, A('b11') - 0.4, 0.4)} y={1000} size={44} />
    </AbsoluteFill>
  );
};

// ════════════════ 7. Les 9 traits de 美 (rendez-vous de la mini-série des adjectifs)
const Traits: React.FC = () => {
  const t = useT();
  const A11 = A('b11'), nf = at('b11', 'neuf'), co = at('b11', 'cornes'), cs = at('b11', 'couches'), db = at('b11', 'debout'), bas = at('b11', 'bas'), cc = at('b11', 'couche'), jb = at('b11', 'jambes');
  // progression : 1–2 cornes, 3–4 deux traits couchés, 5 le trait debout, 6 le troisième trait couché, 7 le trait du bas, 8–9 les jambes
  const prog = (tt: number) => 2 * seg(tt, co - 0.2, co + 0.9) + 2 * seg(tt, cs - 0.1, cs + 0.9) + 2 * seg(tt, db - 0.1, db + 1.0) + seg(tt, cc - 0.2, cc + 0.7) + 2 * seg(tt, jb - 0.4, jb + 0.9);
  const O = { x: 960, y: 520, size: 760 };
  return (
    <AbsoluteFill>
      <Cam keys={[[A11 - 0.3, 960, 540, 1.02], [co - 0.3, 960, 380, 1.12, 1.2], [bas - 0.3, 960, 640, 1.1, 1.2], [B('b11'), 960, 540, 1.02, 0.8]]}>
        <Paper />
        <Draw draw={(ctx, tt, E) => {
          const a = seg(tt, A11 - 0.3, A11 + 0.4);
          // grille d'écriture (米字格) en vermillon pâle
          ctx.save(); ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = rgb(VER); ctx.lineWidth = 3; ctx.strokeRect(O.x - 400, O.y - 400, 800, 800);
          ctx.setLineDash([12, 12]); ctx.beginPath(); ctx.moveTo(O.x - 400, O.y); ctx.lineTo(O.x + 400, O.y); ctx.moveTo(O.x, O.y - 400); ctx.lineTo(O.x, O.y + 400);
          ctx.moveTo(O.x - 400, O.y - 400); ctx.lineTo(O.x + 400, O.y + 400); ctx.moveTo(O.x + 400, O.y - 400); ctx.lineTo(O.x - 400, O.y + 400); ctx.stroke(); ctx.restore();
          const p = prog(tt);
          ctx.save(); ctx.globalAlpha = a;
          E.drawStrokes(ctx, 'mei_regulier', { ...O, progress: p, brush: true, tip: true, color: (c: string) => rgb(mixc(INK, c === 'coiffe' ? GOM : AZ, seg(tt, nf, nf + 0.6) * 0.75)) });
          ctx.restore();
          // numéro de chaque trait, en vermillon, près de son départ
          const D = (W() as any).STROKES?.mei_regulier;
          if (D) D.medians.forEach((m: number[][], i: number) => {
            const k = seg(p, i + 0.05, i + 0.4);
            if (k <= 0) return;
            const x = O.x - O.size / 2 + (m[0][0] * O.size) / 1024, y = O.y - O.size / 2 + ((900 - m[0][1]) * O.size) / 1024;
            E.text(ctx, String(i + 1), x - 34, y - 30, { font: 'Cormorant', size: 46, weight: 700, color: rgb(VER), alpha: a * k });
          });
        }} />
      </Cam>
      <div style={{ position: 'absolute', right: 150, top: 380, fontFamily: 'ShuimoLatin', fontWeight: 700, fontSize: 130, color: rgb(VER), opacity: win(t, co - 0.3, B('b11') + 0.6, 0.4) }}>{Math.max(0, Math.min(9, Math.round(prog(t))))}<span style={{ fontSize: 60 }}> / 9</span></div>
      <Caption text="美 · měi · 9 traits" a={win(t, A11 + 0.6, co - 0.3, 0.4)} y={990} size={52} />
      <Caption text="en haut, six traits : deux petites cornes, trois traits couchés, un trait debout" a={win(t, at('b11', 'haut'), bas - 0.2, 0.4)} y={990} size={40} />
      <Caption text="en bas, trois : un trait couché… puis les deux jambes" a={win(t, bas, B('b11') + 0.6, 0.4)} y={990} size={44} />
    </AbsoluteFill>
  );
};

// ════════════════ 8–9. Scène récapitulative (bandeau de toutes les formes), maxime, passerelle 老
const FORMS: [string, string, string][] = [['real:mei_jiaguwen', '甲骨文', 'Shang · os'], ['real:mei_jinwen', '金文', 'Zhou · bronze'], ['real:mei_xiaozhuan', '小篆', 'Qin · sceau'], ['real:mei_mawangdui', '帛書', 'Han · soie'], ['real:mei_lishu', '隸書', 'Han · clercs'], ['kai:mei_regulier', '楷書', "aujourd'hui"]];
const SCEAU = 2;
const drawBand = (ctx: CanvasRenderingContext2D, E: any, tt: number, a: number) => {
  const y = 380, x0 = 410, dx = 220, sz = 210;
  const fo = at('b08', 'formes'), ho = at('b08', 'homme'), co = at('b08', 'coiffe'), pl = at('b08', 'plumes'), bz = at('b08', 'bronze'), sc = at('b08', 'sceau'), rs = at('b08', 'reste'), nait = at('b08', 'naissance');
  // phase : la composante citée clignote trois fois dans toutes les formes, le reste au gris ; l'accident du petit sceau ; puis tout en couleur
  const hi = tt >= nait ? '' : tt >= sc ? 'sceau' : tt >= co ? 'coiffe' : tt >= ho ? 'homme' : '';
  const t0 = hi === 'homme' ? ho : hi === 'coiffe' ? co : hi === 'sceau' ? sc : nait;
  const k = hi ? seg(tt, t0 - 0.05, t0 + 0.3) : 1 - seg(tt, nait - 0.1, nait + 0.5);
  const blink = hi ? 0.5 + 0.5 * Math.cos(Math.min(3, (tt - t0) / 0.32) * Math.PI * 2) : 0;
  const focus = hi === 'sceau' ? seg(tt, sc - 0.1, sc + 0.6) : 0; // l'accident : seule la forme du petit sceau reste nette et grossit
  FORMS.forEach(([key, zh, fr], i) => {
    const appear = seg(tt, fo - 0.6 + i * 0.12, fo - 0.2 + i * 0.12) * a;
    if (appear <= 0) return;
    const isSc = i === SCEAU;
    const grow = isSc ? focus : 0;
    const x = x0 + i * dx + (isSc ? (960 - (x0 + i * dx)) * 0 : 0), yy = y - 30 * grow, s = sz * (1 + 0.6 * grow);
    const hiC = hi === 'sceau' ? 'coiffe' : hi;
    // dans les formes « avant » (os, bronze), la coiffe brille sur « des plumes sur l'os, des branches courbes sur le bronze »
    const cue = i === 0 ? win(tt, pl - 0.1, bz - 0.1, 0.2) : i === 1 ? win(tt, bz - 0.1, sc - 0.1, 0.2) : 0;
    const dimAll = hi === 'sceau' && !isSc ? 0.7 * focus : 0;
    const color = (c: string) => {
      let col = P[c] ?? INK;
      if (isSc && hi === 'sceau' && c === 'coiffe') col = mixc(P.coiffe, OCRE, focus);
      if (hiC && c !== hiC) col = mixc(col, GREY, k);
      return rgb(mixc(col, GREY, dimAll));
    };
    const alpha = (c: string) => (!hiC || c === hiC ? 1 : 1 - 0.55 * k) * (1 - 0.6 * dimAll);
    const glow = (hiC ? 26 * blink * k : 0) + 26 * cue, gc = P[hiC || 'coiffe'] ?? INK;
    ctx.save(); ctx.globalAlpha = appear;
    if (key.startsWith('real:')) E.drawRealGlyph(ctx, key.slice(5), { x, y: yy, size: s, color, alpha, glow: hi === 'sceau' ? (isSc ? 20 : 0) : glow, glowColor: rgb(isSc && hi === 'sceau' ? OCRE : gc, 0.8) });
    else E.drawStrokes(ctx, key.slice(4), { x, y: yy, size: s * 0.9, brush: false, color, alpha, glow, glowColor: rgb(gc, 0.8) });
    E.text(ctx, zh, x, y + 160, { font: 'Kai', size: 56, color: inkCss, alpha: appear * (1 - 0.6 * dimAll) });
    E.text(ctx, fr, x, y + 218, { font: 'Cormorant', size: 38, weight: 700, color: '#5b4f44', alpha: appear * (1 - 0.6 * dimAll) });
    ctx.restore();
    // l'accident : 羊 au-dessus de la forme du petit sceau, barré sur « …et le mouton reste »
    if (isSc && hi === 'sceau') {
      E.text(ctx, '羊', x, yy - 230, { font: 'ShuimoKai', size: 120, color: rgb(GOM), alpha: focus, glow: 14, glowColor: rgb(GOM, 0.5) });
      const bar = seg(tt, rs - 0.1, rs + 0.4);
      if (bar > 0) { ctx.save(); ctx.strokeStyle = rgb(VER, 0.9); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 75, yy - 170); ctx.lineTo(x - 75 + 150 * bar, yy - 170 - 120 * bar); ctx.stroke(); ctx.restore(); }
    }
  });
  // rubans : l'homme dans toutes les formes, la coiffe dans toutes les formes (devenue 羊 à partir du petit sceau)
  const rows: [string, string][] = [['homme', "l'homme 大"], ['coiffe', 'la coiffe']];
  const grow = seg(tt, ho - 0.6, ho + 0.6);
  rows.forEach(([c, lab], j) => {
    const yy = 790 + j * 80, xa = x0 - 60, xb = x0 + 5 * dx + 60;
    const isHi = hi === c || (hi === 'sceau' && c === 'coiffe');
    const on = !hi || isHi;
    const col = on ? P[c] : mixc(P[c], GREY, k);
    const al = a * grow * (on ? 1 : 1 - 0.5 * k) * (isHi ? 0.75 + 0.25 * blink : 1);
    ctx.save(); ctx.globalAlpha = al; ctx.lineWidth = isHi ? 22 : 16; ctx.lineCap = 'round';
    if (c === 'coiffe') {
      // la coiffe : malachite sur l'os et le bronze, gomme-gutte (le mouton lu) à partir du petit sceau
      const xm = x0 + 1.5 * dx;
      ctx.strokeStyle = rgb(col); ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xa + (Math.min(xm, xa + (xb - xa) * grow) - xa), yy); ctx.stroke();
      if (xa + (xb - xa) * grow > xm) { ctx.strokeStyle = rgb(on ? GOM : mixc(GOM, GREY, k)); ctx.beginPath(); ctx.moveTo(xm, yy); ctx.lineTo(xa + (xb - xa) * grow, yy); ctx.stroke(); }
    } else { ctx.strokeStyle = rgb(col); ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xa + (xb - xa) * grow, yy); ctx.stroke(); }
    ctx.restore();
    E.text(ctx, lab, xa - 24, yy, { font: 'Cormorant', size: 52, weight: 700, align: 'right', color: rgb(col), alpha: al });
  });
};

const Finale: React.FC = () => {
  const t = useT();
  const A8 = A('b08'), fo = at('b08', 'formes'), nait = at('b08', 'naissance'), ml = at('b08', 'meili'), wm = at('b08', 'wanmei');
  const A9 = A('b09'), mx = at('b09', 'maxime'), dn = at('b09', 'danseur'), par = at('b09', 'parure'), tb = at('b09', 'tombent'), bl = at('b09', 'blancs');
  return (
    <AbsoluteFill>
      <Cam keys={[[A8 - 0.3, 960, 540, 1.02], [A8 + 0.2, 960, 500, 1.1, 1.6], [fo - 0.9, 960, 540, 1.02, 0.9], [at('b08', 'sceau'), 900, 420, 1.12, 1.0], [nait, 960, 540, 1.02, 1.0], [A9 + 0.3, 960, 540, 1.0, 1.0], [dn, 1100, 470, 1.12, 1.4], [bl - 0.6, 1100, 500, 1.06, 1.0]]}
        punch={[at('b08', 'homme'), at('b08', 'coiffe'), at('b08', 'sceau'), nait, tb + 0.6]}>
        <Paper />
        <Landscape seed={30} from={A8 - 1.5} to={END + 0.5} move="pan" mood="aube" faint={0.5} />
        <Draw draw={(ctx, tt, E) => {
          const syn = win(tt, fo - 0.8, ml - 0.4, 0.6);
          if (syn > 0) drawBand(ctx, E, tt, syn);
          // avant et après le bandeau : 美 en couleur
          const main = (1 - seg(tt, fo - 1.2, fo - 0.6)) * seg(tt, A8 - 0.4, A8 + 0.4) + win(tt, ml - 0.5, A9 + 0.3, 0.5);
          if (main > 0) {
            ctx.save(); ctx.globalAlpha = Math.min(1, main);
            E.drawStrokes(ctx, 'mei_regulier', { x: 960, y: 440, size: 520, brush: false, color: (c: string) => rgb(P[c] ?? INK) });
            ctx.restore();
          }
          // chute : le danseur de l'os ; ses plumes tombent comme des feuilles, les mèches qui restent blanchissent → 老
          const da = seg(tt, dn - 0.4, dn + 0.4);
          if (da > 0) {
            const fall = seg(tt, tb - 0.2, tb + 2.2), lao = seg(tt, tb + 1.2, bl + 0.2);
            const O = { x: 1100, y: 520, size: 640 };
            E.drawRealGlyph(ctx, 'mei_jiaguwen', { ...O, opacity: da * (1 - lao), color: meiCol(1, 1), alpha: (c: string) => (c === 'coiffe' ? 1 - fall : 1) });
            if (fall > 0 && fall < 1) {
              ctx.save(); ctx.translate(40 * Math.sin(fall * 5), 380 * fall * fall); ctx.rotate(0.25 * fall);
              E.drawRealGlyph(ctx, 'mei_jiaguwen', { ...O, opacity: da * (1 - fall), color: () => rgb(mixc(MAL, GREY, fall)), alpha: (c: string) => (c === 'coiffe' ? 1 : 0) });
              ctx.restore();
            }
            if (lao > 0) E.drawRealGlyph(ctx, 'mei_lao_jiaguwen', { ...O, opacity: lao, color: () => rgb(mixc(INK, [120, 112, 104], 0.4)), glow: 16 * lao, glowColor: 'rgba(255,255,255,0.8)' });
          }
        }} />
      </Cam>
      <Caption text="Reprenons : dans toutes ses formes, deux dessins" a={win(t, fo, at('b08', 'homme') - 0.1, 0.4)} y={1010} size={40} />
      <Caption text="l'accident : au petit sceau, la coiffe prend la forme du mouton… et le mouton reste" a={win(t, at('b08', 'sceau') + 0.2, nait - 0.2, 0.4)} y={1010} size={38} />
      <Caption text="měi · le beau" a={win(t, nait + 0.4, ml - 0.3, 0.4)} y={960} size={56} />
      <div style={{ position: 'absolute', width: '100%', top: 760, display: 'flex', justifyContent: 'center', gap: 200, fontFamily: 'ShuimoKai', fontSize: 84, color: inkCss }}>
        <span style={{ opacity: win(t, ml - 0.4, A9 - 0.3) }}>美丽<div style={{ fontFamily: 'ShuimoLatin', fontSize: 42, textAlign: 'center' }}>la beauté</div></span>
        <span style={{ opacity: win(t, wm - 0.4, A9 - 0.3) }}>完美<div style={{ fontFamily: 'ShuimoLatin', fontSize: 42, textAlign: 'center' }}>la perfection</div></span>
      </div>
      {/* fiche : 美, pinyin, nombre de traits */}
      <div style={{ position: 'absolute', left: 230, top: 280, opacity: win(t, A9 - 0.2, dn + 3.0, 0.6) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 280, color: inkCss, lineHeight: 1 }}>美</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 96, fontWeight: 600, color: inkCss }}>měi</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: rgb(VER) }}>9 traits</div>
      </div>
      <Caption text="Le mouton, c'est le scribe qui l'a vu. Le danseur, lui, ne portait que des plumes." a={win(t, mx, par - 0.2, 0.5)} y={920} size={46} />
      <Caption text="mais la parure ne dure pas…" a={win(t, par, tb + 1.0, 0.4)} y={920} size={50} />
      <Caption text="老 · lǎo · vieux — un homme aux longs cheveux, appuyé sur un bâton" a={win(t, tb + 1.4, END + 0.2, 0.4)} y={920} size={44} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => (
  <AbsoluteFill style={{ background: '#1d1915', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
    <div style={{ width: 120, height: 120, background: rgb(VER, 0.95), borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 52, color: '#f6eee0', writingMode: 'vertical-rl' }}>墨道</div>
    <div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, letterSpacing: 8, color: '#efe6d6' }}>LA VOIE DE L'ENCRE</div>
    <div style={{ fontFamily: 'ShuimoLatin', fontSize: 34, color: '#b9ab98' }}>prochain caractère : 老 · vieux</div>
  </AbsoluteFill>
);

const Win: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const t = useT();
  return t >= from && t < to ? <>{children}</> : null;
};

// bruitages (episodes/mei/audio/sfx_*.wav) : liste « bruitages » d'episode.json, résolue par reperes.py
const SFX = (L.bruitages ?? []) as [string, number, number][];

export const MeiV1: React.FC = () => {
  const ready = useSetup();
  const { fps } = useVideoConfig();
  const clips: Clip[] = ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b10', 'b11', 'b08', 'b09'];
  const voice = (k: Clip) => {
    const c = L.clips[k];
    if (!c.pause) return <Sequence key={k} from={Math.round(c.debut * fps)}><Audio src={staticFile(`episodes/mei/voix/${k}.wav`)} /></Sequence>;
    // voix coupée par la pause (calligramme muet) : deux morceaux
    return (
      <React.Fragment key={k}>
        <Sequence from={Math.round(c.debut * fps)} durationInFrames={Math.round(c.pause.coupe * fps)}><Audio src={staticFile(`episodes/mei/voix/${k}.wav`)} /></Sequence>
        <Sequence from={Math.round((c.debut + c.pause.coupe + c.pause.duree) * fps)}><Audio src={staticFile(`episodes/mei/voix/${k}.wav`)} startFrom={Math.round(c.pause.coupe * fps)} /></Sequence>
      </React.Fragment>
    );
  };
  return (
    <AbsoluteFill style={{ background: '#f3eee4' }}>
      {ready && <>
        <Win from={0} to={A('b03') - 0.25}><Opening /></Win>
        <Win from={A('b03') - 0.25} to={A('b05') - 0.3}><Shang /></Win>
        <Win from={A('b05') - 0.3} to={R2E + 0.05}><Zhou /></Win>
        <Win from={R2E + 0.05} to={A('b07') - 0.3}><Chu /></Win>
        <Win from={A('b07') - 0.3} to={A('b10') - 0.3}><QinHan /></Win>
        <Win from={A('b10') - 0.3} to={A('b11') - 0.3}><Dico /></Win>
        <Win from={A('b11') - 0.3} to={A('b08') - 0.3}><Traits /></Win>
        <Win from={A('b08') - 0.3} to={END}><Finale /></Win>
        <Win from={END} to={MEI_SECONDS + 1}><EndCard /></Win>
        <ShadowDancer />
      </>}
      {SFX.map(([n, tt, v], i) => (
        <Sequence key={`sfx${i}`} from={Math.round(tt * fps)}><Audio src={staticFile(`episodes/mei/audio/sfx_${n}.wav`)} volume={v} /></Sequence>
      ))}
      {clips.map(voice)}
      <Audio src={staticFile('episodes/mei/audio/musique.wav')} volume={0.55} />
    </AbsoluteFill>
  );
};
