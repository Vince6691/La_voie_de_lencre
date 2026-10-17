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
import { Rouleau3DConfig, Rouleau3DStage, r3Seconds, r3TagIn } from '../rouleau3d/Rouleau3D';
import { cartouche } from '../periodes';
import { CloudReveal } from '../video_encre/CloudReveal';
import { Rig, drawGlyphDance } from '../danse/GlyphDance';
import { VideoReveal } from '../video_encre/VideoReveal';
import { loadLegacy, W } from '../legacy';
import rep from '../data/episodes/mei.json';

type Clip = 'b01' | 'b02' | 'b03' | 'b12' | 'b04' | 'b05' | 'b06' | 'b07' | 'b10' | 'b11' | 'b08' | 'b09';
type Rep = Record<Clip, { duration: number; cues: Record<string, number> }> & {
  _ligne: { clips: Record<Clip, { debut: number; duree: number; pause?: { coupe: number; duree: number } }>; rouleaux: { debut: number; duree: number }[]; plages: Record<string, { debut: number; duree: number; son?: string; son_decalage?: number; son_volume?: number }>; fin: number; total: number; bruitages?: [string, number, number][] };
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

// rouleaux du temps en 3D (skill rouleau-3d) : Zhou → Royaumes combattants (version complète), puis Qin → Han
// (version courte, sceau rouge) ; vers inscrits sur les rouleaux : des vers où figure 美
const R2 = L.rouleaux[0].debut;
const R3A: Rouleau3DConfig = {
  at: R2, de: 'zhou', vers: 'royaumes', annees: [-1046, -300], variant: 'complet', stone: 'miel',
  fromLand: { seed: 9, mood: 'jour' }, toLand: { seed: 26, mood: 'brume' },
  inscriptions: [
    { x: 1600, y: 190, size: 68, font: 'ShuimoKai', cols: ['惟草木之零落兮', '恐美人之遲暮'], sig: '屈原離騷', seal: '遊心', ink: 0.85 },
    { x: 5560, y: 170, size: 76, font: 'ShuimoKai', cols: ['自牧歸荑', '洵美且異', '匪女之為美', '美人之貽'], sig: '錄詩經靜女於墨道山房', seal: '墨道', ink: 0.92 },
    { x: 6500, y: 160, size: 90, font: 'ShuimoCao', cols: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'], sig: '柳宗元江雪', seal: '雲水', ink: 0.95 },
    { x: 10950, y: 200, size: 72, font: 'ShuimoKai', cols: ['行到水窮處', '坐看雲起時'], sig: '王維句', seal: '長樂', ink: 0.88 },
  ],
};
const R2E = R2 + r3Seconds(R3A);
const R3 = L.rouleaux[1].debut;
const R3B: Rouleau3DConfig = {
  at: R3, de: 'qin', vers: 'han', annees: [-221, 100], variant: 'court', stone: 'rouge',
  fromLand: { seed: 3, mood: 'brume' }, toLand: { seed: 3, mood: 'brume' }, midSeeds: [17, 21],
  inscriptions: [
    { x: 1500, y: 200, size: 74, font: 'ShuimoKai', cols: ['里仁為美'], sig: '論語里仁', seal: '長樂', ink: 0.88 },
    { x: 5500, y: 170, size: 90, font: 'ShuimoCao', cols: ['燕赵多佳人', '美者颜如玉'], sig: '古诗十九首', seal: '雲水', ink: 0.94 },
    { x: 6600, y: 180, size: 72, font: 'ShuimoKai', cols: ['行到水窮處', '坐看雲起時'], sig: '王維句', seal: '遊心', ink: 0.85 },
  ],
};

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
// profil d'un geste au pinceau : appui (le pinceau se pose), départ vif, le corps du trait ralentit, sortie douce
const brushEase = (p: number) => {
  if (p <= 0) return 0; if (p >= 1) return 1;
  if (p < 0.08) return 0.03 * (p / 0.08);
  const u = (p - 0.08) / 0.92, c = 1 - Math.pow(1 - u, 2.2); // départ rapide, ralentissement progressif
  return 0.03 + 0.97 * (c * (1 - 0.12 * Math.sin(Math.PI * u) * (1 - u)));
};
const useT = () => useCurrentFrame() / useVideoConfig().fps;

// ── polices, moteur Canvas, image de Laozi
const LAOZI = 'episodes/mei/images/laozi_reference.jpg';
const laoziImg: { img: HTMLImageElement | null } = { img: null };
// autres images : fin du clip (pose figée), silhouette détourée (detourer.py), tracé du baimiao (trace_baimiao.py)
const IMGSRC = { fin: 'episodes/mei/clips/03_danseur_v2_fin.jpg', sil: 'episodes/mei/clips/03_danseur_v2_silhouette.png', trace: 'episodes/mei/images/laozi_baimiao_trace.png', xushen: 'episodes/mei/images/xushen_baimiao_trace.png', papier: 'shuimo/paper.jpg' };
const IMG: Partial<Record<keyof typeof IMGSRC, HTMLImageElement>> = {};
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
      ...Object.entries(IMGSRC).map(([k, src]) => new Promise<void>((res) => { const im = new Image(); im.onload = () => { IMG[k as keyof typeof IMGSRC] = im; res(); }; im.onerror = () => res(); im.src = staticFile(src); })),
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
    // état remis à zéro à chaque image : en rendu continu, une transformation, un filtre ou une opacité laissés par
    // l'image précédente empêchaient l'effacement complet (dictionnaire figé sous 美国)
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, 1920, 1080);
    ctx.save(); draw(ctx, t, E); ctx.restore();
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
    <div style={{ width: 92, height: 92, background: rgb(VER, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: [...zh].length > 1 ? 38 : 64, writingMode: [...zh].length > 1 ? 'vertical-rl' : undefined, lineHeight: 1, color: '#f6eee0', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 36, fontWeight: 500, color: '#5e5044' }}>{dates}</div>
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
// (au-dessus des 8 % du bas, où passe la barre de progression YouTube ; 44 px au moins, lisible au téléphone)
// `x` : centre de la légende quand elle doit éviter un objet (par défaut, centrée sur l'écran)
const Caption: React.FC<{ text: string; a: number; y?: number; size?: number; x?: number }> = ({ text, a, y = 900, size = 44, x }) => (
  <div style={{ position: 'absolute', top: Math.min(y, 975 - 1.7 * Math.max(size, 44)), textAlign: 'center', opacity: a, whiteSpace: 'nowrap', ...(x === undefined ? { width: '100%' } : { left: x, transform: 'translateX(-50%)' }) }}>
    <span style={{ display: 'inline-block', padding: '4px 22px', borderRadius: 14, background: 'rgba(246,241,231,0.78)', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: Math.max(size, 44), color: '#4b4038', textShadow: '0 0 10px rgba(246,241,231,0.9)' }}>{text}</span>
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
// ding de bronze peint à l'encre : lavis de patine (vert-de-gris), bande de 雲雷紋 (spirales du tonnerre), contour au
// pinceau sec (trois passages décalés), pieds effilés, ombre de lavis au sol
const DING_SPOTS = (() => { let v = 7; const r = () => ((v = (v * 16807) % 2147483647) / 2147483647); return Array.from({ length: 70 }, () => [r() * 560 - 280, r() * 380 - 160, 3 + 9 * r(), r()]); })();
const dingBody = (ctx: CanvasRenderingContext2D) => { ctx.beginPath(); ctx.moveTo(-300, -170); ctx.lineTo(300, -170); ctx.bezierCurveTo(305, 110, 200, 225, 0, 225); ctx.bezierCurveTo(-200, 225, -305, 110, -300, -170); ctx.closePath(); };
const ding = (ctx: CanvasRenderingContext2D, x: number, y: number, a: number) => {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  // ombre de lavis au sol
  ctx.save(); ctx.filter = 'blur(18px)'; ctx.fillStyle = 'rgba(60,52,44,0.28)'; ctx.beginPath(); ctx.ellipse(0, 338, 300, 26, 0, 0, 7); ctx.fill(); ctx.restore();
  // pieds effilés (lavis puis contour)
  for (const lx of [-170, 0, 170]) {
    ctx.beginPath(); ctx.moveTo(lx - 26, 170); ctx.quadraticCurveTo(lx - 22, 260, lx - 8, 332); ctx.lineTo(lx + 8, 332); ctx.quadraticCurveTo(lx + 22, 260, lx + 26, 170); ctx.closePath();
    ctx.fillStyle = 'rgba(64,88,78,0.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(34,40,36,0.85)'; ctx.lineWidth = 4; ctx.stroke();
  }
  // anses : arcs épais au pinceau
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(sx * 170, -168); ctx.quadraticCurveTo(sx * 168, -285, sx * 215, -285); ctx.quadraticCurveTo(sx * 262, -285, sx * 258, -168);
    ctx.strokeStyle = 'rgba(40,50,44,0.9)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(92,124,108,0.6)'; ctx.lineWidth = 6; ctx.stroke();
  }
  // panse : lavis de patine, plus sombre sur les bords, taches de vert-de-gris
  ctx.save(); dingBody(ctx); ctx.clip();
  const g = ctx.createRadialGradient(-60, -20, 40, 0, 20, 360); g.addColorStop(0, 'rgba(118,146,128,0.42)'); g.addColorStop(0.7, 'rgba(70,98,86,0.58)'); g.addColorStop(1, 'rgba(44,62,56,0.75)');
  ctx.fillStyle = g; ctx.fillRect(-320, -180, 640, 420);
  DING_SPOTS.forEach(([sx, sy, r, k]) => { ctx.fillStyle = k > 0.5 ? 'rgba(150,186,160,0.22)' : 'rgba(40,56,50,0.18)'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); });
  // bande de spirales du tonnerre (雲雷紋), à l'encre, sous la lèvre
  ctx.strokeStyle = 'rgba(30,38,34,0.55)'; ctx.lineWidth = 3;
  for (let k = -5; k <= 5; k++) {
    const cx = k * 52, cy = -118, sp = k % 2 ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(cx - 20, cy + 18); ctx.lineTo(cx - 20, cy - 18); ctx.lineTo(cx + 20, cy - 18); ctx.lineTo(cx + 20, cy + 12 * sp); ctx.lineTo(cx - 8, cy + 12 * sp); ctx.lineTo(cx - 8, cy - 6 * sp); ctx.lineTo(cx + 8, cy - 6 * sp); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-300, -150); ctx.lineTo(300, -150); ctx.moveTo(-300, -84); ctx.bezierCurveTo(-100, -80, 100, -80, 300, -84); ctx.stroke();
  // reflet clair sur le flanc gauche
  const h = ctx.createLinearGradient(-280, 0, -120, 0); h.addColorStop(0, 'rgba(246,241,231,0)'); h.addColorStop(0.5, 'rgba(246,241,231,0.18)'); h.addColorStop(1, 'rgba(246,241,231,0)');
  ctx.fillStyle = h; ctx.fillRect(-300, -70, 200, 260);
  ctx.restore();
  // contour au pinceau sec : trois passages légèrement décalés, de plus en plus fins
  [[0, 0, 7, 0.85], [2.5, -1.5, 3.5, 0.5], [-2, 2, 2, 0.35]].forEach(([dx, dy, w, al]) => {
    ctx.save(); ctx.translate(dx, dy); dingBody(ctx); ctx.strokeStyle = `rgba(30,34,30,${al})`; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  });
  // lèvre épaisse
  ctx.beginPath(); ctx.moveTo(-312, -170); ctx.lineTo(312, -170); ctx.strokeStyle = 'rgba(30,34,30,0.9)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
};
// plastron de tortue à l'encre, chauffé (point rouge), qui se fend (fissures en 卜)
const plastron = (ctx: CanvasRenderingContext2D, x: number, y: number, a: number, heat: number, crack: number) => {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  ctx.fillStyle = 'rgba(214,196,160,0.35)'; ctx.strokeStyle = inkCss; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, -330); ctx.bezierCurveTo(190, -330, 230, -120, 215, 40); ctx.bezierCurveTo(205, 220, 120, 330, 0, 340); ctx.bezierCurveTo(-120, 330, -205, 220, -215, 40); ctx.bezierCurveTo(-230, -120, -190, -330, 0, -330); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = rgb(INK, 0.5);
  ctx.beginPath(); ctx.moveTo(0, -330); ctx.lineTo(0, 340); for (const yy of [-180, -40, 110, 240]) { ctx.moveTo(-200, yy + 20); ctx.quadraticCurveTo(0, yy - 20, 200, yy + 20); } ctx.stroke();
  if (heat > 0) { const g = ctx.createRadialGradient(70, -40, 0, 70, -40, 60); g.addColorStop(0, `rgba(220,70,30,${0.85 * heat})`); g.addColorStop(1, 'rgba(220,70,30,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(70, -40, 60, 0, 7); ctx.fill(); }
  if (crack > 0) {
    ctx.strokeStyle = inkCss; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(70, -40); ctx.lineTo(70 + 6 * crack, -40 - 150 * crack); ctx.lineTo(66, -40 - 210 * crack); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(70, -40); ctx.lineTo(70 + 70 * crack, -40 - 50 * crack); ctx.lineTo(70 + 120 * crack, -40 - 64 * crack); ctx.stroke();
  }
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
// la cassure : un réseau de fissures (cellules de Voronoï autour de germes serrés près du 羊 gravé) ; les mêmes
// lignes, brisées, servent de bords aux éclats — la stèle se détache exactement le long des fissures
type P2 = [number, number];
const IMPACT: P2 = [STELE.x, STTOP + 170];
const FRACT = (() => {
  const r = rng(91), x0 = STELE.x - STW / 2 - 12, x1 = STELE.x + STW / 2 + 12, y0 = STTOP - 12, y1 = STELE.y + STH / 2 + 48;
  const seeds: P2[] = [];
  for (let i = 0; i < 22; i++) {
    const rad = 40 + Math.pow(r(), 1.6) * 640, a = r() * Math.PI * 2;
    seeds.push([Math.max(x0 + 8, Math.min(x1 - 8, IMPACT[0] + Math.cos(a) * rad * 0.55)), Math.max(y0 + 8, Math.min(y1 - 8, IMPACT[1] + Math.sin(a) * rad + rad * 0.35))]);
  }
  // cellule i = rectangle découpé par les demi-plans « plus près de i que de j »
  const clipHalf = (poly: P2[], p: P2, q: P2) => {
    const m: P2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], n: P2 = [q[0] - p[0], q[1] - p[1]];
    const side = (v: P2) => (v[0] - m[0]) * n[0] + (v[1] - m[1]) * n[1];
    const out: P2[] = [];
    poly.forEach((v, i) => {
      const w = poly[(i + 1) % poly.length], sv = side(v), sw = side(w);
      if (sv <= 0) out.push(v);
      if ((sv < 0 && sw > 0) || (sv > 0 && sw < 0)) { const k = sv / (sv - sw); out.push([v[0] + (w[0] - v[0]) * k, v[1] + (w[1] - v[1]) * k]); }
    });
    return out;
  };
  const cells = seeds.map((p, i) => seeds.reduce((poly, q, j) => (i === j ? poly : clipHalf(poly, p, q)), [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as P2[]));
  // chaque bord intérieur devient une ligne brisée, la même pour les deux cellules voisines
  const key = (p: P2) => `${Math.round(p[0])},${Math.round(p[1])}`;
  const onBox = (p: P2, q: P2) => (Math.abs(p[0] - q[0]) < 1 && (Math.abs(p[0] - x0) < 1 || Math.abs(p[0] - x1) < 1)) || (Math.abs(p[1] - q[1]) < 1 && (Math.abs(p[1] - y0) < 1 || Math.abs(p[1] - y1) < 1));
  const jag: Record<string, P2[]> = {}, edges: P2[][] = [];
  const zig = (p: P2, q: P2): P2[] => {
    const k = [key(p), key(q)].sort().join('|');
    if (jag[k]) return key(p) < key(q) ? jag[k] : [...jag[k]].reverse();
    const [a, b] = key(p) < key(q) ? [p, q] : [q, p], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 18));
    const rr = rng(Math.abs(Math.round(a[0] * 7 + a[1] * 13 + b[0] * 3 + b[1])) + 1), pts: P2[] = [a];
    for (let i = 1; i < n; i++) { const t = i / n, o = (rr() - 0.5) * Math.min(14, L * 0.12); pts.push([a[0] + (b[0] - a[0]) * t - (b[1] - a[1]) / L * o, a[1] + (b[1] - a[1]) * t + (b[0] - a[0]) / L * o]); }
    pts.push(b); jag[k] = pts; if (!onBox(a, b)) edges.push(pts);
    return key(p) < key(q) ? pts : [...pts].reverse();
  };
  const shards = cells.filter((c) => c.length > 2).map((c) => {
    const poly: P2[] = [];
    c.forEach((v, i) => { const w = c[(i + 1) % c.length]; const z = onBox(v, w) ? [v, w] : zig(v, w); poly.push(...z.slice(0, -1)); });
    const cx = c.reduce((s, p) => s + p[0], 0) / c.length, cy = c.reduce((s, p) => s + p[1], 0) / c.length, d = Math.hypot(cx - IMPACT[0], cy - IMPACT[1]);
    return { poly, cx, cy, d, vx: (cx - IMPACT[0]) * 1.4 + (r() - 0.5) * 80, vy: -120 - 180 * Math.max(0, 1 - d / 300), vr: (r() - 0.5) * 2.4, delay: 0.25 * (d / 700) + 0.05 * r() };
  });
  return { edges, shards };
})();
let frozenCanvas: HTMLCanvasElement | null = null;
const Opening: React.FC = () => {
  const t = useT();
  const A1 = A('b01'), mt = at('b01', 'mouton'), dico = at('b01', 'dico'), haut = at('b01', 'haut'), grand = at('b01', 'grand'), song = at('b01', 'song'), maxime = at('b01', 'maxime'), ent = at('b01', 'entendu'), gros = at('b01', 'gros');
  const lt = at('b01', 'lettre');
  const tf = Math.min(t, FREEZE);
  const shat = t >= SHATTER;
  return (
    <AbsoluteFill>
      <Paper />
      {/* paysages (estompés avant le figé, pour que la stèle et le mouton éclatent sur le papier nu) */}
      <Landscape seed={18} from={A1 - 0.5} to={song + 0.4} move="push" mood="aube" faint={0.45} />
      <Landscape seed={22} from={song - 0.6} to={FREEZE} move="pan" mood="brume" faint={0.5} />
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
          // le front de la cassure avance depuis le 羊 : on trace chaque fissure depuis son bout le plus proche
          const R = 30 + 760 * ease(cr), dI = (p: P2) => Math.hypot(p[0] - IMPACT[0], p[1] - IMPACT[1]);
          FRACT.edges.forEach((e) => {
            const pts = dI(e[0]) <= dI(e[e.length - 1]) ? e : [...e].reverse();
            if (dI(pts[0]) > R) return;
            fc.beginPath(); fc.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) {
              const d0 = dI(pts[i - 1]), d1 = dI(pts[i]);
              if (d1 <= R) { fc.lineTo(pts[i][0], pts[i][1]); continue; }
              const k = clamp((R - d0) / Math.max(1, d1 - d0)); fc.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k); break;
            }
            fc.strokeStyle = 'rgba(250,246,238,0.75)'; fc.lineWidth = 4.5; fc.lineJoin = 'round'; fc.stroke();
            fc.strokeStyle = 'rgba(34,30,26,0.92)'; fc.lineWidth = 2; fc.stroke();
          });
          fc.restore();
          // le reste (美 et le mouton) reste figé, puis s'efface quand la stèle tombe
          const rest = 1 - seg(tt, SHATTER, SHATTER + 0.9);
          if (rest > 0) { ctx.save(); ctx.globalAlpha = rest; drawOpening(ctx, E, FREEZE, 'reste'); ctx.restore(); }
          if (tt < SHATTER) { const sh = (tt > CRACK && tt < CRACK + 0.25) ? 3 * Math.sin(tt * 90) : 0; ctx.drawImage(frozenCanvas, sh, 0); return; }
          // les éclats de marbre tombent
          const u = tt - SHATTER;
          FRACT.shards.forEach((s) => {
            const k = Math.max(0, u - s.delay);
            if (k > 1.6) return;
            const dx = s.vx * k, dy = s.vy * k + 1300 * k * k, rot = s.vr * k;
            ctx.save(); ctx.globalAlpha = 1 - seg(k, 0.9, 1.5);
            ctx.translate(s.cx + dx, s.cy + dy); ctx.rotate(rot); ctx.translate(-s.cx, -s.cy);
            ctx.beginPath(); s.poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
            ctx.drawImage(frozenCanvas!, 0, 0);
            ctx.restore();
          });
        }} />
      </Cam>
      {/* « un lettré obstiné, 许慎 » : son portrait au trait se trace en médaillon (on le retrouve à sa table en b07) */}
      <Draw draw={(ctx, tt) => {
        const m = win(tt, lt - 0.1, dico + 0.9, 0.4);
        if (m <= 0) return;
        ctx.save(); ctx.globalAlpha = m;
        ctx.shadowColor = 'rgba(40,30,20,0.28)'; ctx.shadowBlur = 34; ctx.fillStyle = '#f6f0e4'; ctx.fillRect(1380, 150, 470, 520); ctx.shadowBlur = 0;
        ctx.strokeStyle = rgb(VER, 0.75); ctx.lineWidth = 3; ctx.strokeRect(1395, 165, 440, 490);
        ctx.beginPath(); ctx.rect(1395, 165, 440, 490); ctx.clip();
        ctx.translate(1615 - 0.37 * 943, 410 - 0.37 * (BMY + 391 * BMS)); ctx.scale(0.37, 0.37);
        drawBaimiao(ctx, clamp((tt - lt) / 1.0), 1, 'xushen');
        ctx.restore();
      }} />
      {!shat && <>
        <Caption text="美 · měi · beau" a={win(tf, A1 + 1.6, mt - 0.2, 0.4)} y={880} size={56} />
        <Label x={980} y={300} zh="羊" text="le mouton" color={GOM} a={win(tf, mt + 0.6, dico - 0.3, 0.4)} />
        <Caption text="Xu Shen 許慎 · Shuowen jiezi, vers 100" a={win(tf, dico, haut - 0.2, 0.5)} y={960} size={42} />
        <Label x={980} y={720} zh="大" text="grand" color={AZ} a={win(tf, grand, song - 0.6, 0.4)} />
        <Caption text="Xu Xuan 徐鉉 · note à son édition du Shuowen, 986" a={win(tf, at('b01', 'marbre') - 0.2, maxime + 0.2, 0.5)} y={960} size={44} x={560} />
        <EraTag {...cartouche('han', "vers l'an 100")} a={win(tf, dico - 0.2, song - 0.2, 0.6)} />
        <EraTag {...cartouche('song', 'Xe–XIIIe siècle')} a={win(tf, song, FREEZE + 0.2, 0.6)} />
      </>}
    </AbsoluteFill>
  );
};

// ════════════════ finitions : sceaux d'époque qui frappent, tremblement de caméra, grain du papier, vignettage
// le sceau de l'époque frappe en bas à droite du tableau, comme le cachet du peintre : chute, impact, l'encre
// vermillon boit le papier (halo), la caméra tremble à peine ; il reste un moment puis pâlit
const SEALS = (() => {
  const g = () => GLYEND; // défini plus bas (constantes du clip) : évalué à la demande
  return () => [
    { t: g() + 0.2, zh: '商' },
    { t: at('b05', 'inscr') + 0.6, zh: '周' },
    { t: at('b07', 'sceau') + 0.9, zh: '秦' },
  ];
})();
const shakeAt = (t: number) => {
  let dx = 0, dy = 0;
  for (const s of SEALS()) { const u = t - s.t; if (u < 0 || u > 0.4) continue; if (u < 0.3) dy += 4 * Math.sin(Math.PI * u / 0.3) * (1 - u / 0.3); }
  return [dx, dy];
};
const Shake: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT(); const [dx, dy] = shakeAt(t);
  return <AbsoluteFill style={{ transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)` }}>{children}</AbsoluteFill>;
};
const drawSeal = (ctx: CanvasRenderingContext2D, E: any, x: number, y: number, size: number, zh: string, u: number) => {
  const drop = seg(u, 0, 0.14), life = 1 - seg(u, 2.6, 3.4);
  if (u < 0 || life <= 0) return;
  const sc = 1 + 0.6 * (1 - drop), a = drop * life;
  // halo d'encre qui boit le papier, à l'impact
  const bleed = seg(u, 0.12, 0.6);
  if (bleed > 0) {
    const g = ctx.createRadialGradient(x, y, size * 0.4, x, y, size * (0.75 + 0.25 * bleed));
    g.addColorStop(0, rgb(VER, 0.18 * life)); g.addColorStop(1, rgb(VER, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, size, 0, 7); ctx.fill();
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.04); ctx.scale(sc, sc); ctx.globalAlpha = a;
  if (drop < 1) { ctx.shadowColor = 'rgba(40,20,10,0.35)'; ctx.shadowBlur = 30 * (1 - drop); ctx.shadowOffsetY = 18 * (1 - drop); }
  // pierre gravée : carré aux bords usés
  const r = rng(zh.charCodeAt(0)), h = size / 2;
  ctx.beginPath();
  const pts = 28;
  for (let i = 0; i < pts; i++) { const side = Math.floor(i / 7), f = (i % 7) / 7, j = (r() - 0.5) * size * 0.025;
    const P = side === 0 ? [-h + f * 2 * h, -h + j] : side === 1 ? [h + j, -h + f * 2 * h] : side === 2 ? [h - f * 2 * h, h + j] : [-h + j, h - f * 2 * h];
    i ? ctx.lineTo(P[0], P[1]) : ctx.moveTo(P[0], P[1]); }
  ctx.closePath(); ctx.fillStyle = rgb(VER, 0.92); ctx.fill();
  ctx.shadowColor = 'transparent';
  E.text(ctx, zh, 0, size * 0.04, { font: 'ShuimoKai', size: size * 0.72, color: '#f6eee0' });
  // usure : petits manques dans l'encre du sceau
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * size * 0.95, (r() - 0.5) * size * 0.95, 1 + r() * 3.5, 0, 7); ctx.fillStyle = `rgba(0,0,0,${0.4 + 0.5 * r()})`; ctx.fill(); }
  ctx.restore();
};
const SealStamps: React.FC = () => (
  <Draw draw={(ctx, tt, E) => { for (const s of SEALS()) drawSeal(ctx, E, 1700, 900, 128, s.zh, tt - s.t); }} />
);
// grain du papier (4 tirages qui alternent) et vignettage doux : une texture constante d'un plan à l'autre
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
    ctx.imageSmoothingEnabled = true; ctx.drawImage(grainTiles[f % 4], 0, 0, 1920, 1080);
  });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <canvas ref={ref} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'overlay', opacity: 0.16 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 48%, rgba(60,40,20,0) 55%, rgba(60,40,20,0.22) 100%)' }} />
    </AbsoluteFill>
  );
};

// ════════════════ 1 bis. « Remontons à l'origine… » : les nuages passent et s'ouvrent sur la danse de la pluie (clip de
// 8 s) ; sur la pose figée, le décor s'efface, le danseur reste seul, devient une silhouette d'encre, puis le 美 de l'os
const PL = L.plages.danse;
const CLOUD_IN = 1.6, CLIP0 = PL.debut + (PL.son_decalage ?? 0.75), CLIPEND = CLIP0 + 7.92;
const T_BG = CLIPEND + 0.1, T_INK = CLIPEND + 0.45, T_MORPH = CLIPEND + 1.1, T_MOVE = CLIPEND + 2.1, GLYEND = CLIPEND + 2.9;
// le clip (1280×720) est posé plein cadre : silhouette, en coordonnées écran, de (552, 64) à (1383, 1042)
// glyphe aligné sur le danseur (plumes en haut, pieds en bas), puis ramené à sa place au centre
const G_DANCER = { x: 953, y: 553, size: 1008 }, G_REST = { x: 960, y: 540, size: 640 };
let mcA: HTMLCanvasElement | null = null, mcB: HTMLCanvasElement | null = null, dancerCol: HTMLCanvasElement | null = null;
const MW = 960, MH = 540; // fusion encre faite à mi-résolution
// fusion « encre visqueuse » : la silhouette et le glyphe se mélangent flous, puis on ne garde que le cœur de l'encre
const drawMorph = (ctx: CanvasRenderingContext2D, E: any, k: number, gx: { x: number; y: number; size: number }) => {
  if (!mcA) { mcA = document.createElement('canvas'); mcA.width = MW; mcA.height = MH; mcB = document.createElement('canvas'); mcB.width = MW; mcB.height = MH; }
  const a = mcA.getContext('2d', { willReadFrequently: true })!, b = mcB!.getContext('2d', { willReadFrequently: true })!;
  a.clearRect(0, 0, MW, MH); b.clearRect(0, 0, MW, MH);
  a.globalAlpha = 1 - k; if (IMG.sil) a.drawImage(IMG.sil, 0, 0, MW, MH);
  a.globalAlpha = k; a.save(); a.scale(MW / 1920, MH / 1080); E.drawRealGlyph(a, 'mei_jiaguwen', { ...gx, color: () => '#000' }); a.restore(); a.globalAlpha = 1;
  const blur = 9 * Math.sin(Math.PI * k);
  b.filter = `blur(${blur.toFixed(2)}px)`; b.drawImage(mcA, 0, 0); b.filter = 'none';
  const im = b.getImageData(0, 0, MW, MH), d = im.data;
  const th = 0.42 + 0.08 * Math.sin(Math.PI * k);
  for (let i = 3; i < d.length; i += 4) { const v = d[i] / 255, o = Math.min(1, Math.max(0, (v - th) / 0.08)); d[i - 3] = INK[0]; d[i - 2] = INK[1]; d[i - 1] = INK[2]; d[i] = o * 255; }
  b.putImageData(im, 0, 0);
  ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(mcB!, 0, 0, 1920, 1080); ctx.restore();
};
// fusion d'encre entre deux formes (couleurs gardées) : les deux dessins se mêlent flous, puis on ne garde que le
// cœur de l'encre (seuil sur l'opacité) — les traits coulent d'une écriture à l'autre au lieu d'un fondu
// après la cassure, sur « Remontons à l'origine… » : une goutte d'encre tombe sur le papier nu et s'épanouit en lavis
// (lobes irréguliers, cœur plus sombre, anneau d'eau), puis s'efface quand les nuages ouvrent sur la danse
const INK_LOBES = (() => { let v = 11; const r = () => ((v = (v * 16807) % 2147483647) / 2147483647); return Array.from({ length: 14 }, () => [r() * 7, 0.55 + 0.4 * r(), 0.25 + 0.35 * r()]); })();
const InkDrop: React.FC = () => {
  const t0 = SHATTER + 1.1, t1 = CLIP0 - 0.4;
  return (
    <Draw draw={(ctx, tt) => {
      if (tt < t0 || tt > t1 + 0.8) return;
      const fall = clamp((tt - t0) / 0.35), u = clamp((tt - t0 - 0.35) / (t1 - t0 - 0.35)), out = 1 - seg(tt, t1 - 0.4, t1 + 0.6);
      ctx.save(); ctx.globalAlpha = out;
      if (fall < 1) {
        // la goutte, qui s'allonge en tombant
        const y = 540 - 420 * (1 - fall * fall);
        ctx.fillStyle = rgb(INK, 0.9); ctx.beginPath(); ctx.ellipse(960, y, 9, 9 + 16 * fall, 0, 0, 7); ctx.fill();
      } else {
        // la tache : contour irrégulier qui avance par à-coups (fibres du papier), lavis plus clair au centre, liseré
        // plus sombre au bord (l'encre se dépose où l'eau s'arrête), grain du papier par-dessus
        const R = 26 + 400 * (1 - Math.pow(1 - u, 2.2));
        const shape = (k0 = 1) => {
          ctx.beginPath();
          for (let k = 0; k <= 120; k++) {
            const th = (k / 120) * Math.PI * 2;
            const n = 1 + 0.09 * Math.sin(3 * th + 0.7) + 0.05 * Math.sin(5 * th + 2.1 + 0.6 * u) + 0.025 * Math.sin(9 * th + 4.2);
            const x = 960 + Math.cos(th) * R * n * k0, y = 540 + Math.sin(th) * R * n * 0.84 * k0;
            if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.closePath();
        };
        // lavis : bord doux qui boit le papier, centre plus clair, cœur sombre décentré
        ctx.save(); ctx.filter = 'blur(9px)'; shape();
        const g = ctx.createRadialGradient(948, 532, 0, 960, 540, R * 1.05);
        g.addColorStop(0, 'rgba(24,20,18,0.7)'); g.addColorStop(0.15, 'rgba(36,32,28,0.4)'); g.addColorStop(0.7, 'rgba(48,44,40,0.26)'); g.addColorStop(1, 'rgba(34,30,28,0.42)');
        ctx.fillStyle = g; ctx.fill(); ctx.restore();
        // liseré : l'encre se dépose où l'eau s'arrête
        ctx.save(); ctx.filter = 'blur(4px)'; shape(0.985); ctx.strokeStyle = 'rgba(28,24,22,0.22)'; ctx.lineWidth = 9; ctx.stroke(); ctx.restore();
        // grain du papier dans la tache
        if (IMG.papier) { ctx.save(); shape(); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = out * 0.5; ctx.drawImage(IMG.papier, 0, 0, 1920, 1080); ctx.restore(); }
        // auréole d'eau claire qui précède l'encre
        ctx.save(); ctx.filter = 'blur(10px)'; ctx.strokeStyle = `rgba(110,100,90,${0.14 * (1 - u)})`; ctx.lineWidth = 18;
        ctx.beginPath(); ctx.ellipse(960, 540, R * 1.1, R * 0.93, 0, 0, 7); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }} />
  );
};
const DanseIntro: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Sequence from={Math.round(PL.debut * fps)} durationInFrames={Math.round((CLIPEND + 0.2 - PL.debut) * fps)}>
        <CloudReveal src="episodes/mei/clips/03_danseur_v2.mp4" inDur={CLOUD_IN} exit={false} videoAt={CLIP0 - PL.debut} volume={PL.son_volume ?? 0.7} />
      </Sequence>
      <Caption text="des danses pour la pluie sont attestées sur les os" a={win(useT(), at('b12', 'danse') - 0.2, CLIPEND - 0.2, 0.5)} y={990} size={40} />
      <Sequence from={Math.round((CLIPEND - 0.05) * fps)} durationInFrames={Math.round((GLYEND + 0.1 - CLIPEND) * fps)}>
        <Draw draw={(ctx, u, E) => {
          const tt = CLIPEND - 0.05 + u;
          if (!IMG.fin || !IMG.sil) return;
          // 1. le décor s'efface autour du danseur (pose figée = dernière image du clip)
          const bg = 1 - seg(tt, T_BG, T_BG + 0.6);
          if (bg > 0) { ctx.save(); ctx.globalAlpha = bg; ctx.drawImage(IMG.fin, 0, 0, 1920, 1080); ctx.restore(); }
          if (!dancerCol) {
            dancerCol = document.createElement('canvas'); dancerCol.width = 1920; dancerCol.height = 1080;
            const c = dancerCol.getContext('2d')!; c.drawImage(IMG.fin, 0, 0, 1920, 1080); c.globalCompositeOperation = 'destination-in'; c.drawImage(IMG.sil, 0, 0, 1920, 1080);
          }
          // 2. le danseur, seul sur le papier, passe à l'encre
          const ink = seg(tt, T_INK, T_INK + 0.6);
          if (tt < T_MORPH) {
            ctx.drawImage(dancerCol, 0, 0);
            if (ink > 0) { ctx.save(); ctx.globalAlpha = ink; ctx.filter = 'brightness(0.18) saturate(0.2)'; ctx.drawImage(dancerCol, 0, 0); ctx.restore(); }
            return;
          }
          // 3. la silhouette d'encre se fond en 美 de l'os, puis le signe reprend sa place
          const k = seg(tt, T_MORPH, T_MOVE - 0.1);
          if (k < 1) { drawMorph(ctx, E, k, G_DANCER); return; }
          const m = ease(clamp((tt - T_MOVE) / (GLYEND - T_MOVE)));
          E.drawRealGlyph(ctx, 'mei_jiaguwen', { x: G_DANCER.x + (G_REST.x - G_DANCER.x) * m, y: G_DANCER.y + (G_REST.y - G_DANCER.y) * m, size: G_DANCER.size + (G_REST.size - G_DANCER.size) * m, color: () => inkCss });
        }} />
      </Sequence>
    </>
  );
};

// squelette du glyphe mei_jiaguwen (boîte 660) : le signe peut danser (GlyphDance, déformation par os)
const MEI_RIG: Rig = { box: 660, bones: [
  { name: 'torse', pivot: [348, 370], tip: [340, 95] },
  { name: 'jambeG', pivot: [348, 375], tip: [310, 628] },
  { name: 'jambeD', pivot: [352, 375], tip: [452, 650] },
  { name: 'brasG', parent: 'torse', pivot: [338, 262], tip: [284, 352] },
  { name: 'brasD', parent: 'torse', pivot: [350, 268], tip: [432, 325] },
  { name: 'plumeHG', parent: 'torse', pivot: [338, 95], tip: [228, 25] },
  { name: 'plumeHD', parent: 'torse', pivot: [348, 88], tip: [440, 60] },
  { name: 'plumeBG', parent: 'torse', pivot: [332, 200], tip: [240, 200] },
  { name: 'plumeBD', parent: 'torse', pivot: [352, 192], tip: [430, 175] },
] };
// un pas de la danse de la pluie (un par seconde) ; amplitude nulle au début et à la fin (retour exact au glyphe)
const danse = (u: number, D: number) => {
  const ph = 2 * Math.PI * u / 1.0, s = Math.sin(ph);
  const env = seg(u, 0, 0.4) * (1 - seg(u, D - 0.6, D - 0.05));
  const up = (v: number) => Math.max(0, v);
  return {
    torse: 0.07 * s * env, dx: 12 * s * env, dy: -16 * Math.abs(s) * env,
    brasG: (0.3 + 0.8 * up(s)) * env, brasD: -(0.3 + 0.8 * up(-s)) * env,
    jambeG: 0.13 * up(s) * env, jambeD: -0.13 * up(-s) * env,
    plumeHG: 0.24 * Math.sin(ph - 0.9) * env, plumeHD: 0.24 * Math.sin(ph - 0.9) * env,
    plumeBG: 0.2 * Math.sin(ph - 1.4) * env, plumeBD: 0.2 * Math.sin(ph - 1.4) * env,
  };
};

// ════════════════ 2. La dynastie Shang (après la danse : le signe de l'os, la divination)
const Shang: React.FC = () => {
  const t = useT();
  const A3 = A('b03'), A4 = A('b04'), sig = at('b04', 'signe'), corps = at('b04', 'corps'), pluie = at('b04', 'pluie'), os = at('b04', 'os'), hom = at('b04', 'homme'), coif = at('b04', 'coiffe'), br = at('b04', 'branches'), mt = at('b04', 'mouton'), mus = at('b04', 'museau'), rien = at('b04', 'rien'), pare = at('b04', 'pare'), plumes = at('b04', 'plumes'), terre = at('b04', 'terre'), jam = at('b04', 'jamais');
  return (
    <AbsoluteFill>
      <Cam keys={[[A3 - 0.3, 960, 540, 1.0], [GLYEND, 960, 540, 1, 0.4], [os + 0.4, 960, 520, 1.06, 1.4], [hom - 0.2, 900, 560, 1.12, 1.6], [corps, 960, 650, 1.22, 1.4], [coif - 0.3, 960, 330, 1.3, 1.0], [mt - 0.4, 1060, 520, 1.04, 1.0], [rien, 960, 520, 1.06, 1.0], [pare, 1020, 500, 1.14, 1.6], [plumes, 960, 380, 1.24, 1.2], [terre, 960, 560, 1.02, 1.0]]}
        punch={[sig + 0.2, corps, coif + 0.3, rien + 0.2]} calm={[[PL.debut, GLYEND + 0.3]]}>
        <Paper />
        <Landscape seed={14} from={GLYEND - 0.6} to={A('b05') + 0.5} move="pan" mood="aube" faint={0.85} />
          <Draw draw={(ctx, tt, E) => {
            // le signe né de la danse reste au centre : on le décrit trait par trait (plus de plastron)
            if (tt < GLYEND) return;
            // « Pour savoir si la pluie viendrait… » : une averse d'encre, un lavis de nuages ; le signe glisse à gauche
            const rain = win(tt, A4 - 0.2, sig - 0.4, 0.8);
            if (rain > 0) {
              const g = ctx.createLinearGradient(0, 0, 0, 520);
              g.addColorStop(0, rgb(INK, 0.32 * rain)); g.addColorStop(1, rgb(INK, 0));
              ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 520);
              const r = rng(77);
              ctx.save(); ctx.lineCap = 'round';
              for (let i = 0; i < 140; i++) {
                const x0 = r() * 2100 - 90, sp = 900 + r() * 500, len = 30 + r() * 50, ph = r() * 1180;
                const y = ((ph + sp * (tt - A4)) % 1180) - 80, x = x0 - 0.18 * y;
                ctx.strokeStyle = rgb(INK, (0.12 + 0.18 * r()) * rain); ctx.lineWidth = 1.2 + r() * 1.6;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 0.18 * len, y + len); ctx.stroke();
              }
              ctx.restore();
            }
            // le signe : au centre, puis à gauche pendant la pluie et la comparaison, puis de retour au centre
            const side = seg(tt, A4 + 0.3, A4 + 1.6) * (1 - seg(tt, hom - 0.1, hom + 0.8));
            const GP = { x: G_REST.x + (640 - G_REST.x) * ease(side), y: G_REST.y, size: G_REST.size * (1 - 0.12 * ease(side)) };
            // « un signe qui ressemble à notre danseur » : la silhouette d'encre du danseur arrive à droite,
            // puis glisse sur le signe et s'y superpose (bras, jambes, plumes)
            const sa = win(tt, sig - 0.7, hom + 0.3, 0.4);
            if (sa > 0 && IMG.sil) {
              const over = ease(seg(tt, sig + 0.2, sig + 1.1));
              const tgt = { x: 1330 + (GP.x - 1330) * over, y: GP.y, size: GP.size * (0.95 + 0.05 * over) };
              const sc = tgt.size / G_DANCER.size;
              ctx.save(); ctx.globalAlpha = sa * (1 - 0.55 * over);
              ctx.drawImage(IMG.sil, tgt.x - G_DANCER.x * sc, tgt.y - G_DANCER.y * sc, 1920 * sc, 1080 * sc);
              ctx.restore();
            }
            const rv = 1, dry = 1;
            const man = seg(tt, hom, hom + 0.5), cf = seg(tt, coif, coif + 0.5);
            const base = (_c: string) => mixc(mixc(PAPERWHITE, INK, 0.45), INK, dry);
            const col = (c: string) => rgb(c === 'coiffe' ? mixc(base(c), MAL, cf) : mixc(base(c), AZ, man));
            const two = tt > br + 0.6 && tt < br + 2.2; // « parfois deux »
            // « un danseur coiffé de plumes » : le signe se remet à danser deux secondes
            const dz = tt - (pare - 0.2);
            if (dz > 0 && dz < 2.6) {
              drawGlyphDance(ctx, 'mei_jiaguwen_couleurs', MEI_RIG, (c) => E.drawRealGlyph(c, 'mei_jiaguwen', { x: 330, y: 330, size: 660, color: col }),
                { ...G_REST, size: G_REST.size * 660 / 660, motion: danse(dz, 2.6) });
              return;
            }
            const mainA = 1;
            if (mainA > 0) E.drawRealGlyph(ctx, two ? 'mei_jiaguwen2' : 'mei_jiaguwen', { ...GP, reveal: () => rv, opacity: Math.min(1, mainA), color: col, glow: 26 * cf * win(tt, coif, mt, 0.5), glowColor: rgb(MAL, 0.6) });
            // « le même que dans 文 » : le 文 de l'os, en petit, à gauche
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
            // 1899 : l'os s'enfonce sous la terre — trois couches de lavis d'encre brune au bord irrégulier, qui montent
            // l'une après l'autre (strates de terre peintes, pas un voile uni)
            const ter = seg(tt, terre - 0.2, terre + 2.2);
            if (ter > 0) {
              [[0, 0.22, 0.0], [1, 0.3, 0.25], [2, 0.38, 0.5]].forEach(([i, al, d]) => {
                const k = ease(clamp((ter - d) / (1 - d)));
                if (k <= 0) return;
                const top = 1080 - (520 - 140 * i) * k;
                ctx.save(); ctx.beginPath(); ctx.moveTo(0, 1080);
                for (let x = 0; x <= 1920; x += 24) ctx.lineTo(x, top + 22 * Math.sin(x / 140 + i * 2.1) + 11 * Math.sin(x / 53 + i * 5.3) + 6 * Math.sin(x / 17 + i));
                ctx.lineTo(1920, 1080); ctx.closePath();
                const g = ctx.createLinearGradient(0, top - 30, 0, 1080);
                g.addColorStop(0, `rgba(104,84,64,${al * 0.6})`); g.addColorStop(0.12, `rgba(96,78,60,${al})`); g.addColorStop(1, `rgba(70,56,44,${al + 0.15})`);
                ctx.fillStyle = g; ctx.filter = 'blur(3px)'; ctx.fill(); ctx.restore();
              });
            }
          }} />
      </Cam>
      {/* « un homme paré » : lecture majoritaire, pas une certitude */}
      <Caption text="lecture la plus répandue · d'autres y voient des cornes" a={win(t, pare - 0.1, terre - 0.3, 0.4)} size={44} />
      <EraTag {...cartouche('shang', 'Anyang · v. 1200 av. J.-C.')} a={seg(t, CLIP0 + 1.0, CLIP0 + 1.8) * (1 - seg(t, A('b05') - 0.6, A('b05')))} />
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
        <Paper />
        <Landscape seed={9} from={A5 - 1} to={R2 + 0.6} move="pan" mood="jour" faint={0.6} />
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
      </Cam>
      <EraTag {...cartouche('zhou', 'XIe siècle av. J.-C.')} a={seg(t, A5 - 0.6, A5 + 0.2) * (1 - seg(t, R2, R2 + 0.4))} />
      <EraTag {...cartouche('royaumes', 'Ve–IIIe siècle av. J.-C.')} a={r3TagIn(R3A, t) * (1 - seg(t, R2E + 2.5, R2E + 3.2))} />
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
// Laozi en baimiao 白描 : le dessin au trait se construit en 3 s, les traits poussent depuis les points où fondent les
// caractères du vers (instant d'arrivée de chaque pixel : trace_baimiao.py, canal R ; encre : alpha)
const BM = { w: 1376, h: 768 }, BMS = 1920 / BM.w, BMY = (1080 - BM.h * BMS) / 2;
const BM_SEEDS: [number, number][] = [[591, 43], [662, 77], [712, 123], [586, 158], [894, 239], [542, 329], [860, 379], [549, 443], [869, 501], [565, 509], [849, 647]];
// un baimiao qui se trace : IMG[key] = PNG de trace_baimiao.py (instant d'arrivée en R, encre en alpha), image 1376×768
const BMC: Record<string, { data: Uint8ClampedArray; cv: HTMLCanvasElement; last: number }> = {};
const drawBaimiao = (ctx: CanvasRenderingContext2D, p: number, alpha = 1, key: 'trace' | 'xushen' = 'trace') => {
  const im = IMG[key];
  if (!im || p <= 0 || alpha <= 0) return;
  if (!BMC[key]) {
    const cv = document.createElement('canvas'); cv.width = BM.w; cv.height = BM.h;
    const c = cv.getContext('2d', { willReadFrequently: true })!; c.drawImage(im, 0, 0);
    BMC[key] = { data: c.getImageData(0, 0, BM.w, BM.h).data.slice(), cv, last: -1 };
  }
  const B = BMC[key], thr = p * 262; // un peu au-delà de 250 : à p = 1 tout est tracé
  if (Math.abs(thr - B.last) > 0.01) {
    const c = B.cv.getContext('2d', { willReadFrequently: true })!, out = c.createImageData(BM.w, BM.h), o = out.data, d = B.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3]; if (!a) continue;
      const head = Math.min(1, Math.max(0, (thr - d[i]) / 8)); // la pointe du trait arrive en douceur
      if (head <= 0) continue;
      o[i] = INK[0]; o[i + 1] = INK[1]; o[i + 2] = INK[2]; o[i + 3] = a * head;
    }
    c.putImageData(out, 0, 0); B.last = thr;
  }
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(B.cv, 0, BMY, 1920, BM.h * BMS); ctx.restore();
};
// position d'un caractère du vers : deux colonnes, lues de haut en bas et de droite à gauche
const versePos = (i: number) => (i < 6 ? [1060, 175 + i * 142] : [860, 175 + (i - 6) * 142]);
// cible dans la silhouette de Laozi (les caractères s'y fondent)
const FIGPTS = BM_SEEDS.map(([x, y]) => [x * BMS, BMY + y * BMS]);
const Chu: React.FC = () => {
  const t = useT();
  const A6 = A('b06'), roy = at('b06', 'royaumes'), ret = at('b06', 'retrouve'), gd = at('b06', 'guodian'), lz = at('b06', 'laozi'), vers = at('b06', 'vers'), beau = at('b06', 'beau'), laid0 = at('b06', 'laideur'), aut = at('b06', 'autrement'), dec = at('b06', 'decide'), laid = at('b06', 'laid'), mai = at('b06', 'maitre');
  const pz = L.clips.b06.pause!, p0 = A6 + pz.coupe, p1 = p0 + pz.duree;
  const mapTo = vers - 0.2;
  return (
    <AbsoluteFill>
      <Cam keys={[[A6 - 0.3, 960, 540, 1.02], [vers, 960, 540, 1.04, 0.8], [p0 + 0.2, 960, 540, 1.0, 1.0], [p1 - 0.6, 980, 470, 1.08, 2.0], [aut + 0.4, 960, 540, 1.0, 1.2]]} punch={[beau + 0.4, laid0 + 0.2, p1 - 0.2, dec, laid]}>
        <Paper />
        <Landscape seed={26} from={A6 - 1.5} to={A('b07') + 0.5} move="pan" mood="brume" faint={0.4} />
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
          // 3. le portrait au trait se construit (3 s) depuis l'encre des caractères
          drawBaimiao(ctx, clamp((tt - (p0 + 0.9)) / 3.0));
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
      <Caption text="Guodian 郭店, 1993 · Laozi, vers 300 av. J.-C." a={win(t, lz - 0.2, mapTo, 0.4)} y={990} size={38} />
      <Caption text="Laozi 老子 · portrait imaginé" a={win(t, p1 - 0.2, aut + 0.6, 0.5)} y={990} size={40} />
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
        <Landscape seed={3} from={A7 - 1.5} to={B('b07') + 1} move="pan" mood="brume" faint={0.45} />
        <Draw draw={(ctx, tt, E) => {
          // le petit sceau tracé, la coiffe (malachite) qui passe à la gomme-gutte quand elle touche le 羊 du sceau
          const s1 = seg(tt, sc - 0.4, sc + 1.4) * (1 - seg(tt, R3 - 0.3, R3 + 0.1));
          const meet = seg(tt, mt + 1.0, mt + 2.0);
          if (s1 > 0) E.drawRealGlyph(ctx, 'mei_xiaozhuan', { x: 760, y: 520, size: 640, reveal: () => seg(tt, sc - 0.4, sc + 1.4), opacity: s1, color: (c: string) => rgb(c === 'coiffe' ? mixc(mixc(INK, MAL, seg(tt, sym - 0.2, sym + 0.4)), GOM, meet) : mixc(INK, AZ, 0.6)), glow: 22 * win(tt, sym, xs, 0.4), glowColor: rgb(meet > 0.5 ? GOM : MAL, 0.6) });
          // le mouton du petit sceau, posé à côté, puis il glisse sur la coiffe
          const ya = seg(tt, mt - 0.2, mt + 0.4) * (1 - seg(tt, mt + 2.2, mt + 2.8)) * (1 - seg(tt, R3 - 0.3, R3 + 0.1));
          if (ya > 0) {
            const slide = ease(seg(tt, mt + 0.8, mt + 2.0));
            const [cx, cy] = E.realCenter('mei_xiaozhuan', 'coiffe', { x: 760, y: 520, size: 640 });
            const x = 1330 + (cx - 1330) * slide, y = 420 + (cy - 420) * slide;
            E.drawRealGlyph(ctx, 'mei_yang_xiaozhuan', { x, y, size: 380 - 90 * slide, opacity: ya * (1 - 0.6 * slide), color: () => rgb(GOM), glow: 18, glowColor: rgb(GOM, 0.5) });
          }
          // « exactement le même caractère que le mouton » : os, bronze, petit sceau frappés en colonne, coup par coup
          const cas = 1 - seg(tt, R3 - 0.5, R3 - 0.1);
          [['mei_jiaguwen', 0.36], ['mei_jinwen', 1.12], ['mei_xiaozhuan', 2.0]].forEach(([g, d], i) => {
            const u = tt - (mt + (d as number)), a = clamp(u / 0.08) * cas;
            if (a <= 0) return;
            const k = 1 + 0.25 * (1 - seg(u, 0, 0.14)), y = 260 + i * 270;
            ctx.save(); ctx.globalAlpha = a; ctx.translate(1720, y); ctx.scale(k, k);
            ctx.strokeStyle = rgb(VER, 0.85); ctx.lineWidth = 5; ctx.strokeRect(-105, -105, 210, 210);
            ctx.restore();
            E.drawRealGlyph(ctx, g as string, { x: 1720, y, size: 190 * k, opacity: a, color: (c: string) => rgb(c === 'coiffe' ? mixc(MAL, GOM, i / 2) : INK) });
          });
          // Xu Shen à sa table (baimiao repris de la vidéo du 學), qui se trace en 2,5 s, puis s'efface devant l'analyse
          drawBaimiao(ctx, clamp((tt - (xs + 0.1)) / 2.5), 1 - seg(tt, yeux - 0.5, yeux + 0.1), 'xushen');
          // sa citation en colonne ; derrière, l'os qu'il n'a jamais vu (en transparence)
          const xa = win(tt, yeux - 0.3, err + 0.4, 0.6);
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
      <Caption text="221 av. J.-C. · le petit sceau 小篆" a={win(t, emp, ord - 0.1, 0.4)} y={960} size={44} />
      <Label x={1170} y={250} zh="羊" text="le mouton (petit sceau)" color={GOM} a={win(t, mt - 0.1, mt + 2.3, 0.4)} />
      <EraTag {...cartouche('qin', '221 av. J.-C. · le petit sceau')} a={seg(t, A7 - 0.5, A7) * (1 - seg(t, R3 - 0.3, R3 + 0.1))} />
      <EraTag {...cartouche('han', "vers l'an 100 · Xu Shen")} a={r3TagIn(R3B, t) * (1 - seg(t, B('b07') - 0.2, B('b07') + 0.3))} />
    </AbsoluteFill>
  );
};

// ════════════════ 6. Le dictionnaire : 美 au rayon des moutons
// feuilletage : de « dictionnaires chinois » jusqu'à « beau » ; en-têtes et caractères des pages qui défilent
const FLIP0 = at('b10', 'dico') + 0.5, FLIP1 = FLIP0 + 1.5;
const FLIPS = ['人部', '口部', '土部', '女部', '心部', '手部', '木部', '水部', '火部', '牛部', '犬部'];
const FLIPC = '你他們吃喝唱地城場好媽姐想情愛打拿找林樹森河海湖燈熱燒牛物特狗狼猫';
// dictionnaire ouvert : couverture de toile indigo, tranche de pages, papier xuan (texture), pages qui se creusent vers
// le dos (ombre de pli), filets vermillon des colonnes (朱絲欄), signet rouge
const drawBook = (ctx: CanvasRenderingContext2D, a: number) => {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.save(); ctx.filter = 'blur(22px)'; ctx.fillStyle = 'rgba(50,40,30,0.35)'; ctx.fillRect(330, 170, 1260, 820); ctx.restore();
  ctx.fillStyle = '#2f3c52'; ctx.beginPath(); ctx.moveTo(318, 132); ctx.lineTo(1602, 132); ctx.lineTo(1602, 978); ctx.lineTo(318, 978); ctx.closePath(); ctx.fill();
  // tranche : feuillets empilés
  for (let i = 0; i < 6; i++) { ctx.strokeStyle = `rgba(214,204,186,${0.9 - i * 0.1})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(336 - i * 2, 150 + i * 3); ctx.lineTo(336 - i * 2, 962 - i * 2); ctx.moveTo(1584 + i * 2, 150 + i * 3); ctx.lineTo(1584 + i * 2, 962 - i * 2); ctx.stroke(); }
  [[340, 620], [960, 620]].forEach(([x0, w], side) => {
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0, 146); ctx.quadraticCurveTo(x0 + w / 2, 136, x0 + w, 146); ctx.lineTo(x0 + w, 964); ctx.quadraticCurveTo(x0 + w / 2, 954, x0, 964); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#f6f0e3'; ctx.fillRect(x0, 130, w, 840);
    if (IMG.papier) { ctx.globalAlpha = a * 0.55; ctx.drawImage(IMG.papier, x0, 130, w, 840); ctx.globalAlpha = a; }
    // pli : la page se creuse vers le dos
    const gx = side ? ctx.createLinearGradient(x0, 0, x0 + 90, 0) : ctx.createLinearGradient(x0 + w, 0, x0 + w - 90, 0);
    gx.addColorStop(0, 'rgba(70,56,40,0.32)'); gx.addColorStop(1, 'rgba(70,56,40,0)'); ctx.fillStyle = gx; ctx.fillRect(x0, 130, w, 840);
    ctx.restore();
  });
  // filets des colonnes, page de droite
  ctx.strokeStyle = rgb(VER, 0.22); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.rect(1000, 260, 550, 660); for (let y = 410; y < 900; y += 150) { ctx.moveTo(1000, y - 75); ctx.lineTo(1550, y - 75); } ctx.stroke();
  // signet
  ctx.fillStyle = rgb(VER, 0.85); ctx.beginPath(); ctx.moveTo(1490, 132); ctx.lineTo(1512, 132); ctx.lineTo(1512, 1010); ctx.lineTo(1501, 996); ctx.lineTo(1490, 1010); ctx.closePath(); ctx.fill();
  ctx.restore();
};
const KEYS = ['一', '丨', '丶', '人', '口', '土', '大', '女', '子', '心', '手', '木', '水', '火', '羊', '羽'];
const ENTRIES: [string, string, string][] = [['羊', 'yáng', 'mouton'], ['美', 'měi', 'beau'], ['羔', 'gāo', 'agneau'], ['群', 'qún', 'troupeau']];
const Dico: React.FC = () => {
  const t = useT();
  const A10 = A('b10'), cle = at('b10', 'cle'), dico = at('b10', 'dico'), ray = at('b10', 'rayon'), agn = at('b10', 'agneau'), trp = at('b10', 'troupeau');
  const mg = at('b10', 'meiguo'), bp = at('b10', 'beaupays'), enf = at('b10', 'enfin'), ame = at('b10', 'amerique'), ms = at('b10', 'meishi'), pdu = at('b10', 'perdu');
  const book = 1 - seg(t, mg - 0.2, mg + 0.4);
  return (
    <AbsoluteFill>
      <Cam keys={[[A10 - 0.3, 960, 540, 1.02], [cle, 700, 600, 1.12, 1.2], [dico + 0.6, 1180, 540, 1.1, 1.4], [trp + 0.4, 1200, 560, 1.14, 1.0]]} punch={[ray + 0.1, FLIP1, mg + 0.85, ms + 0.6]}>
        <Paper />
        {/* démonté dès qu'il est invisible : un canvas seulement effacé n'était pas rafraîchi en rendu continu */}
        {book > 0 && <Draw draw={(ctx, tt, E) => {
          const a = seg(tt, A10 - 0.3, A10 + 0.6) * (1 - seg(tt, mg - 0.2, mg + 0.4));
          if (a <= 0) return;
          // livre ouvert : page de gauche (index des clés), page de droite (羊部)
          drawBook(ctx, a);
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
          // page de droite : on feuillette vite (une page toutes les 0,15 s), et l'on s'arrête net sur 羊部
          if (tt > FLIP0 && tt < FLIP1) {
            const u = (tt - FLIP0) / 0.15, n = Math.floor(u), f = u - n;
            E.text(ctx, FLIPS[n % FLIPS.length], 1275, 210, { font: 'ShuimoKai', size: 64, color: '#5b4f44', alpha: a });
            for (let i = 0; i < 4; i++) E.text(ctx, FLIPC[(n * 4 + i * 7) % FLIPC.length], 1090, 350 + i * 150, { font: 'ShuimoKai', size: 100, color: inkCss, alpha: a * 0.8 });
            // la page qui tourne : un pan de papier qui passe de droite à gauche, ombré
            const xr = 1580 - 620 * ease(f);
            ctx.save(); ctx.globalAlpha = a;
            const gr = ctx.createLinearGradient(xr - 90, 0, xr + 30, 0); gr.addColorStop(0, 'rgba(60,46,34,0)'); gr.addColorStop(0.75, 'rgba(60,46,34,0.22)'); gr.addColorStop(1, 'rgba(248,243,232,1)');
            ctx.fillStyle = gr; ctx.fillRect(Math.max(970, xr - 90), 140, Math.min(1580, xr + 30) - Math.max(970, xr - 90), 820);
            ctx.restore();
          }
          const pg = seg(tt, FLIP1 - 0.05, FLIP1 + 0.05);
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
        }} />}
      </Cam>
      {/* 美国 : « le beau pays »… qui n'a rien de beau, c'est le « mé » d'Amérique ; puis 美食, la bonne cuisine */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: (1 - book) * (1 - seg(t, B('b10') - 0.3, B('b10'))) }}>
        <div style={{ position: 'relative', height: 330, width: 900 }}>
          {[['美国', 'Měiguó', 'les États-Unis', mg + 0.85, ms - 0.2], ['美食', 'měishí', 'la bonne cuisine', ms + 0.6, B('b10')]].map(([zh, py, fr, a0, a1]) => (
            <div key={zh as string} style={{ position: 'absolute', inset: 0, textAlign: 'center', opacity: win(t, a0 as number, a1 as number, 0.35) }}>
              <div style={{ fontFamily: 'ShuimoKai', fontSize: 230, lineHeight: 1.1, color: inkCss }}>
                <span style={{ color: rgb(mixc(INK, GOM, 0.75)) }}>{(zh as string)[0]}</span>{(zh as string)[1]}
              </div>
              <div style={{ fontFamily: 'ShuimoLatin', fontSize: 58, fontWeight: 600, color: '#4b4038' }}>{py} · {fr}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 150, position: 'relative', width: 1400, fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 52, color: '#5b4f44', textAlign: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: win(t, bp, enf + 0.6, 0.35) }}>美 beau · 国 pays</div>
          <div style={{ position: 'absolute', inset: 0, opacity: win(t, ame - 0.9, ms - 0.2, 0.35) }}>A<b style={{ color: rgb(VER) }}>meri</b>can → <b style={{ color: rgb(VER) }}>美</b>利坚 Měilìjiān → <b style={{ color: rgb(VER) }}>美</b>国</div>
          <div style={{ position: 'absolute', inset: 0, opacity: win(t, pdu - 0.1, B('b10'), 0.35), color: rgb(mixc(INK, GOM, 0.8)), fontFamily: 'ShuimoKai', fontSize: 72 }}>羊</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ════════════════ 7. Les 9 traits de 美 (rendez-vous de la mini-série des adjectifs)
const Traits: React.FC = () => {
  const t = useT();
  const A11 = A('b11'), nf = at('b11', 'neuf'), co = at('b11', 'cornes'), cs = at('b11', 'couches'), db = at('b11', 'debout'), bas = at('b11', 'bas'), cc = at('b11', 'couche'), jb = at('b11', 'jambes');
  // progression : 1–2 cornes, 3–4 deux traits couchés, 5 le trait debout, 6 le troisième trait couché, 7 le trait du bas, 8–9 les jambes
  // chaque trait a son créneau : 75 % de geste, 25 % de pinceau levé (pause) avant le suivant
  const lin = (u: number) => Math.min(1, Math.max(0, u));
  const run = (tt: number, a: number, b: number, n: number) => { let s = 0; const sl = (b - a) / n; for (let i = 0; i < n; i++) s += lin((tt - a - i * sl) / (0.75 * sl)); return s; };
  const prog = (tt: number) => run(tt, co - 0.2, co + 1.0, 2) + run(tt, cs - 0.1, cs + 1.0, 2) + run(tt, db - 0.1, db + 1.1, 2) + run(tt, cc - 0.2, cc + 0.7, 1) + run(tt, jb - 0.4, jb + 1.0, 2);
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
          E.drawStrokes(ctx, 'mei_regulier', { ...O, progress: p, brush: true, tip: true, strokeEase: brushEase, color: (c: string) => rgb(mixc(INK, c === 'coiffe' ? GOM : AZ, seg(tt, nf, nf + 0.6) * 0.75)) });
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
    E.text(ctx, zh, x, y + 160, { font: 'Kai', size: 60, color: inkCss, alpha: appear * (1 - 0.6 * dimAll) });
    E.text(ctx, fr, x, y + 222, { font: 'Cormorant', size: 46, weight: 700, color: '#5b4f44', alpha: appear * (1 - 0.6 * dimAll) });
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
  const A8 = A('b08'), fo = at('b08', 'formes'), nait = at('b08', 'naissance'), ml = at('b08', 'shang'), par8 = at('b08', 'parer'), ciel = at('b08', 'ciel'), beau8 = at('b08', 'beau');
  const A9 = A('b09'), mx = at('b09', 'maxime'), dn = at('b09', 'danseur'), par = at('b09', 'parure'), tb = at('b09', 'tombent'), bl = at('b09', 'blancs');
  return (
    <AbsoluteFill>
      <Cam keys={[[A8 - 0.3, 960, 540, 1.02], [A8 + 0.2, 960, 500, 1.1, 1.6], [fo - 0.9, 960, 540, 1.02, 0.9], [at('b08', 'sceau'), 900, 420, 1.12, 1.0], [nait, 960, 540, 1.02, 1.0], [A9 + 0.3, 960, 540, 1.0, 1.0], [dn, 1100, 470, 1.12, 1.4], [bl - 0.6, 1100, 500, 1.06, 1.0]]}
        punch={[at('b08', 'homme'), at('b08', 'coiffe'), at('b08', 'sceau'), ciel, nait, tb + 0.6]}>
        <Paper />
        <Landscape seed={30} from={A8 - 1.5} to={END + 0.5} move="pan" mood="aube" faint={0.5} />
        <Draw draw={(ctx, tt, E) => {
          const syn = win(tt, fo - 0.8, ml - 0.4, 0.6);
          if (syn > 0) drawBand(ctx, E, tt, syn);
          // avant et après le bandeau : 美 en couleur
          const main = (1 - seg(tt, fo - 1.2, fo - 0.6)) * seg(tt, A8 - 0.4, A8 + 0.4) + win(tt, ml - 0.5, A('b10') - 0.1, 0.5);
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
            // « Le danseur, lui… » : sa silhouette d'encre revient une seconde sur le signe (écho de la danse de la pluie)
            const ds = win(tt, dn - 0.1, dn + 1.3, 0.35);
            if (ds > 0 && IMG.sil) {
              const sc = O.size / G_DANCER.size;
              ctx.save(); ctx.globalAlpha = 0.5 * ds; ctx.drawImage(IMG.sil, O.x - G_DANCER.x * sc, O.y - G_DANCER.y * sc, 1920 * sc, 1080 * sc); ctx.restore();
            }
            if (lao > 0) E.drawRealGlyph(ctx, 'mei_lao_jiaguwen', { ...O, opacity: lao, color: () => rgb(mixc(INK, [120, 112, 104], 0.4)), glow: 16 * lao, glowColor: 'rgba(255,255,255,0.8)' });
          }
        }} />
      </Cam>
      <div style={{ position: 'absolute', width: '100%', top: 760, display: 'flex', justifyContent: 'center', gap: 200, fontFamily: 'ShuimoKai', fontSize: 84, color: inkCss }}>
      </div>
      {/* se parer pour parler au ciel, puis le nom */}
      <Caption text="se parer · pour parler au ciel" a={win(t, par8 - 0.1, nait - 0.1, 0.4)} y={930} size={48} />
      <Caption text="美 · měi · le beau" a={win(t, beau8 - 0.2, A('b10') - 0.3, 0.4)} y={930} size={56} />
      {/* fiche : 美, pinyin, nombre de traits */}
      <div style={{ position: 'absolute', left: 230, top: 280, opacity: win(t, A9 - 0.2, dn + 3.0, 0.6) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 280, color: inkCss, lineHeight: 1 }}>美</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 96, fontWeight: 600, color: inkCss }}>měi</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: rgb(VER) }}>9 traits</div>
      </div>
      <Caption text="老 · lǎo · vieux" a={win(t, tb + 1.4, END + 0.2, 0.4)} y={880} size={60} />
    </AbsoluteFill>
  );
};

// écran de fin (≈ 10 s) sur papier : la marque et le prochain caractère dans le tiers gauche ; les deux tiers droits
// restent libres pour les éléments de fin YouTube (vidéo suggérée, abonnement)
const EndCard: React.FC = () => {
  const t = useT(), a = seg(t, END, END + 0.8);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Paper />
      <Landscape seed={30} from={END - 1} to={MEI_SECONDS + 1} move="still" mood="aube" faint={0.35} />
      <div style={{ position: 'absolute', left: 120, top: 150, width: 520, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ width: 104, height: 104, background: rgb(VER, 0.95), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 46, color: '#f6eee0', writingMode: 'vertical-rl', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>墨道</div>
          <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss, lineHeight: 1.15 }}>LA VOIE<br />DE L'ENCRE</div>
        </div>
        <div style={{ marginTop: 70, fontFamily: 'ShuimoLatin', fontSize: 46, color: '#5e5044', opacity: seg(t, END + 0.8, END + 1.6) }}>Prochain caractère</div>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 260, lineHeight: 1, color: inkCss, opacity: seg(t, END + 1.2, END + 2.2) }}>老</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 60, fontWeight: 600, color: '#3b322b', opacity: seg(t, END + 1.6, END + 2.6) }}>lǎo · vieux</div>
      </div>
    </AbsoluteFill>
  );
};

const Win: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const t = useT();
  return t >= from && t < to ? <>{children}</> : null;
};

// bruitages (episodes/mei/audio/sfx_*.wav) : liste « bruitages » d'episode.json, résolue par reperes.py
const SFX = (L.bruitages ?? []) as [string, number, number][];

export const MeiV1: React.FC = () => {
  const ready = useSetup();
  const { fps } = useVideoConfig();
  const clips: Clip[] = ['b01', 'b02', 'b03', 'b12', 'b04', 'b05', 'b06', 'b07', 'b10', 'b11', 'b08', 'b09'];
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
      {ready && <Shake>
        <Win from={0} to={A('b03') - 0.25}><Opening /></Win>
        <Win from={A('b03') - 0.25} to={A('b05') - 0.3}><Shang /></Win>
        <Win from={A('b05') - 0.3} to={R2 + 0.6}><Zhou /></Win>
        <Win from={R2 + 0.6} to={A('b07') - 0.3}><Chu /></Win>
        {/* fin : révélation → les traits → récapitulatif → « l'erreur dure encore » (dictionnaire, 美国, 美食) → chute */}
        <Win from={A('b07') - 0.3} to={A('b11') - 0.3}><QinHan /></Win>
        <Win from={A('b11') - 0.3} to={A('b08') - 0.3}><Traits /></Win>
        <Win from={A('b08') - 0.3} to={A('b10') - 0.3}><Finale /></Win>
        <Win from={A('b10') - 0.3} to={A('b09') - 0.3}><Dico /></Win>
        <Win from={A('b09') - 0.3} to={END + 0.8}><Finale /></Win>
        <Win from={END} to={MEI_SECONDS + 1}><EndCard /></Win>
        <InkDrop />
        <DanseIntro />
        <SealStamps />
      </Shake>}
      {/* montés seulement autour de leur passage (peinture du rouleau et polices au montage) */}
      {ready && <Win from={R2 - 1.5} to={R2 + r3Seconds(R3A) + 3.5}><Rouleau3DStage cfg={R3A} /></Win>}
      {ready && <Win from={R3 - 1.5} to={R3 + r3Seconds(R3B) + 3.5}><Rouleau3DStage cfg={R3B} /></Win>}
      {ready && <GrainVignette />}
      {SFX.map(([n, tt, v], i) => (
        <Sequence key={`sfx${i}`} from={Math.round(tt * fps)}><Audio src={staticFile(`episodes/mei/audio/sfx_${n}.wav`)} volume={v} /></Sequence>
      ))}
      {clips.map(voice)}
      <Audio src={staticFile('episodes/mei/audio/musique.wav')} volume={0.55} />
    </AbsoluteFill>
  );
};
