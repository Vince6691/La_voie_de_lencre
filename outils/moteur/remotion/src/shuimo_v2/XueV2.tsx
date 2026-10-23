// 學 / 学, version tout shuimo, voix off v2 (≈ 4 min) — episodes/xue/PROPOSITION.md.
// Question : où sont passées les deux mains ? Voyage Shang → Zhou → Qin → Han → aujourd'hui, trois rouleaux du temps
// différents (5 s classique, 3,5 s rapide, 6 s long), clips vidéo intégrés au papier (VideoEncre ; ici les clips
// d'exemple, réutilisés à chaque emplacement, en attendant les clips Seedance), glyphes réels et tracé des traits
// du moteur Canvas (legacy), pigments minéraux constants par composante.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose, Mood } from '../shuimo/layout';
import { INK, InkStage, InkTiming, PIGMENT } from '../shuimo_xue/InkStage';
import { TimeScrollConfig, TimeScrollStage, tagIn } from '../rouleau/TimeScroll';
import { Rouleau3DConfig, Rouleau3DStage, r3Seconds, r3TagIn } from '../rouleau3d/Rouleau3D';
import { cartouche } from '../periodes';
import { GrainVignette, Shake } from '../commun/Effets';
import { capitale, carte, chargerCartes, creditCarte, fondCarte } from '../cartes/CartePeinte';
import { VideoReveal } from '../video_encre/VideoReveal';
import { CloudReveal } from '../video_encre/CloudReveal';
import { loadLegacy, W } from '../legacy';
import rep from '../data/episodes/xue.json';

type Clip = 'b01' | 'b02' | 'b03' | 'b04' | 'b05' | 'b06' | 'b07' | 'b08' | 'b09';
type Rep = Record<Clip, { duration: number; cues: Record<string, number> }> & {
  _ligne: { clips: Record<Clip, { debut: number; duree: number; pause?: { coupe: number; duree: number } }>; rouleaux: { debut: number; duree: number }[]; fin: number; total: number; bruitages?: [string, number, number][] };
};
const R = rep as unknown as Rep;
const L = R._ligne;
const A = (k: Clip) => L.clips[k].debut;
const at = (k: Clip, n: string) => {
  const c = L.clips[k], v = R[k].cues[n];
  if (v === undefined) throw new Error(`repère manquant ${k}.${n}`);
  return c.debut + v + (c.pause && v > c.pause.coupe ? c.pause.duree : 0);
};
const A1 = A('b01'), A2 = A('b02'), A3 = A('b03'), A4 = A('b04'), A5 = A('b05'), A6 = A('b06'), A7 = A('b07'), A8 = A('b08'), A9 = A('b09');
const R1 = L.rouleaux[0].debut, R2 = L.rouleaux[1].debut, R3 = L.rouleaux[2].debut; // 2D 5 s, 2D 3,5 s, 3D complet
const END = L.fin;
export const XUE_V2_SECONDS = Math.ceil(L.total * 10) / 10; // écran de fin de 10 s inclus

const TR1: TimeScrollConfig = { at: R1, duration: L.rouleaux[0].duree, from: 0, to: 1, years: [-1250, -1046] };
const TR2: TimeScrollConfig = { at: R2, duration: L.rouleaux[1].duree, from: 1, to: 2, years: [-1046, -221] };
// rouleau 3D complet sur le plus grand saut (Tang, écriture régulière → aujourd'hui : la régulière est déjà dite) ; vers de l'inscription : le caractère étudié
const R3A: Rouleau3DConfig = {
  at: R3, de: 'tang', vers: 'aujourdhui', annees: [618, 1956], variant: 'complet', stone: 'miel',
  fromLand: { seed: 3, mood: 'jour' }, toLand: { seed: 30, mood: 'aube' }, midSeeds: [17, 21],
  inscriptions: [
    { x: 1500, y: 200, size: 74, font: 'ShuimoKai', cols: ['學而時習之', '不亦說乎'], sig: '論語學而', seal: '長樂', ink: 0.88 },
    { x: 5500, y: 170, size: 80, font: 'ShuimoKai', cols: ['學不可以已', '青取之於藍'], sig: '荀子勸學', seal: '雲水', ink: 0.92 },
  ],
};

// Shang / Zhou : minutage de la scène d'encre (estampages, signe, pigments) calé sur la voix
const SIGNE = at('b03', 'signe'); // « C'est là que notre signe apparaît »
const TT: InkTiming = {
  plastronIn: [SIGNE - 2.2, SIGNE - 1.0], crack1: [SIGNE - 1.5, SIGNE - 0.7], crack2: [SIGNE - 0.9, SIGNE - 0.1], jiaguIn: [SIGNE - 0.2, SIGNE + 1.0],
  plastronOut: [SIGNE + 1.0, SIGNE + 2.0], yao: at('b03', 'yao'), roof: at('b03', 'toit'), hand: at('b03', 'mains'),
  travel: [R1, R1 + 5],
  bronzeIn: [at('b04', 'bronze') - 0.2, at('b04', 'bronze') + 1.4], bronzeOut: [at('b04', 'enfant') - 3.0, at('b04', 'enfant') - 1.8],
  jinwenColor: [at('b04', 'enfant') - 1.8, at('b04', 'enfant') - 0.8], child: at('b04', 'enfant'),
};

// coups de sceau et révélations qui font trembler le cadre (4 px, 0,3 s)
const IMPACTS = [at('b03', 'signe'), at('b04', 'enfant'), at('b07', 'reponse'), at('b08', 'nait')];
const SFX = (L.bruitages ?? []) as [string, number, number][];
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const inkCss = rgb(INK);
const VERM = PIGMENT.hand, GRAY = [128, 120, 112], FUSION = [214, 120, 52];
const useT = () => useCurrentFrame() / useVideoConfig().fps;

// ── polices et moteur Canvas
const useSetup = () => {
  const [h] = useState(() => delayRender('polices + moteur'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
      new FontFace('ShuimoCaps', `url(${staticFile('fonts/Cinzel.ttf')})`, { weight: '400 900' }).load(),
      new FontFace('ShuimoPinceau', `url(${staticFile('fonts/MaShanZheng-Regular.ttf')})`).load(),
      new FontFace('ShuimoLegende', `url(${staticFile('fonts/ZhuqueFangsong-Regular.ttf')})`).load().catch(() => new FontFace('ShuimoLegende', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load()),
      chargerCartes(['chine_centre_nord']),
    ]).then((fs) => { fs.slice(0, 5).forEach((f) => document.fonts.add(f as FontFace)); return loadLegacy({ three: false, captions: false }); }).then(() => { setReady(true); continueRender(h); });
  }, [h]);
  return ready;
};

// canvas plein cadre redessiné à chaque image par draw(ctx, t, E)
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

// paysage shuimo en fondu sur [from, to]
const Landscape: React.FC<{ seed: number; from: number; to: number; move?: 'pan' | 'push' | 'still' | 'rise'; mood?: Mood; faint?: number }> = ({ seed, from, to, move = 'pan', mood = 'jour', faint = 1 }) => {
  const { fps } = useVideoConfig();
  const shot = compose(seed, { move, mood, duration: to - from });
  return (
    <Sequence from={Math.round(from * fps)} durationInFrames={Math.round((to - from) * fps)}>
      <Fade len={to - from} faint={faint}><ShuimoBackground shot={shot} duration={to - from} /></Fade>
    </Sequence>
  );
};
const Fade: React.FC<{ len: number; faint: number; children: React.ReactNode }> = ({ len, faint, children }) => {
  const f = useT();
  const o = interpolate(f, [0, 1.4, len - 1.4, len], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o * faint }}>{children}</AbsoluteFill>;
};
const Paper: React.FC = () => <AbsoluteFill style={{ background: `#f3eee4 url(${staticFile('shuimo/paper.jpg')}) center/cover` }} />;

// clip vidéo plein cadre (exemples réutilisés en attendant les clips Seedance) : entrée par les nuages, ou à travers
// le caractère quand un caractère est à l'écran juste avant ; sortie par les coups de pinceau dans tous les cas
// clips Seedance dédiés (episodes/xue/A_FOURNIR.md) : PRETS passe à true à l'arrivée du fichier ; d'ici là, un emplacement marqué
const CLIPS = { devins: 'episodes/xue/clips/01_devins.mp4', arc: 'episodes/xue/clips/02_tir_arc.mp4' };
const PRETS: Record<keyof typeof CLIPS, boolean> = { devins: true, arc: false };
const CLIP_TITRES = { devins: ['Clip 1 · les devins', 'Seedance, 12 s : la tige brûlante, l\'écaille qui craque'], arc: ['Clip 2 · le tir à l\'arc au 學宮', 'Seedance, 8 s : le roi guide la main de l\'élève'] };
const CLIP_SECONDS = { devins: 8, arc: 8 }; // durée des clips Seedance
const CLIP_ZOOM = { devins: 1.12, arc: 1 }; // recadrage (filigrane du générateur hors cadre)
const Clip: React.FC<{ src: keyof typeof CLIPS; from: number; len: number; entry: 'nuages' | 'glyphe'; inDur?: number }> = ({ src, from, len, entry, inDur = 3.2 }) => {
  const { fps } = useVideoConfig();
  if (!PRETS[src]) {
    return (
      <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(len * fps)}>
        <Placeholder title={CLIP_TITRES[src][0]} sub={CLIP_TITRES[src][1]} a={win(useT(), from, from + len, 0.5)} />
      </Sequence>
    );
  }
  const rate = Math.min(0.9, CLIP_SECONDS[src] / len); // ralenti si le plan est plus long que le clip
  const crop = (el: React.ReactNode) => (CLIP_ZOOM[src] === 1 ? <>{el}</> : <AbsoluteFill style={{ transformOrigin: '10% 20%', transform: `scale(${CLIP_ZOOM[src]})` }}>{el}</AbsoluteFill>);
  if (entry === 'glyphe') {
    return crop(
      <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(len * fps)}>
        <VideoReveal src={CLIPS[src]} mode="glyphe" outMode="pinceau" inDur={inDur} outDur={2.4} playbackRate={rate} zoom={1} />
      </Sequence>
    );
  }
  const cl = inDur + 0.4; // nuages qui se referment puis s'écartent, puis la vidéo seule jusqu'aux coups de pinceau
  return crop(
    <>
      <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(cl * fps)}>
        <CloudReveal src={CLIPS[src]} inDur={inDur} exit={false} playbackRate={rate} />
      </Sequence>
      <Sequence from={Math.round((from + cl) * fps)} durationInFrames={Math.round((len - cl) * fps)}>
        <VideoReveal src={CLIPS[src]} mode="pinceau" inDur={0.001} outDur={2.4} startFrom={cl * rate} playbackRate={rate} zoom={1} />
      </Sequence>
    </>
  );
};

// emplacement d'un clip à fournir : papier, cadre en pointillé, intitulé ; remplacé au montage
const Placeholder: React.FC<{ title: string; sub: string; a: number }> = ({ title, sub, a }) => (
  <AbsoluteFill style={{ opacity: a, alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 1200, height: 560, border: `4px dashed ${rgb(VERM, 0.6)}`, borderRadius: 18, background: 'rgba(246,241,231,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 700, fontSize: 60, color: inkCss }}>{title}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: '#5e5044' }}>{sub}</div>
    </div>
  </AbsoluteFill>
);

// carte (moteur Canvas, variante papier) en fondu sur [from, to] ; draw(ctx, u, E, t) avec u = avancement 0–1
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
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };

const PEINTE = {
  anyang: { id: 'chine_centre_nord', ville: 'anyang', sceau: '商', nom: 'Anyang', sous: '安陽 · capitale des Shang', region: 'shang', lavis: 'rgba(192,57,43,0.07)' },
  hao: { id: 'chine_centre_nord', ville: 'hao', sceau: '周', nom: 'Hao', sous: '鎬京 · capitale des Zhou', region: 'zhou', lavis: 'rgba(52,132,98,0.09)' },
  xianyang: { id: 'chine_centre_nord', ville: 'xianyang', sceau: '秦', nom: 'Xianyang', sous: '咸陽 · capitale des Qin', region: 'qin', lavis: 'rgba(192,57,43,0.09)' },
};
const peinte = (ctx: CanvasRenderingContext2D, u: number, E: any, tt: number, k: keyof typeof PEINTE, t0: number) => {
  const p = PEINTE[k], v = carte(p.id).vue, q = E.proj(v, E.CITIES[p.ville]);
  const z = 1 + 0.07 * ease(u);
  ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(z, z); ctx.translate(-q[0], -q[1]);
  fondCarte(ctx, E, p.id);
  const ra = seg(u, 0.25, 0.6);
  if (ra > 0) E.mapLayer(ctx, v, v, 120, `xue_${k}_reg`, (c: CanvasRenderingContext2D, w: any) => E.region(c, w, p.region, p.lavis, 1), ra);
  capitale(ctx, E, q, p.sceau, p.nom, p.sous, tt, t0, null);
  ctx.restore();
  creditCarte(ctx, E, p.id);
};

// ── cartouches, étiquettes, textes
const EraTag: React.FC<{ zh: string; name: string; dates: string; a: number }> = ({ zh, name, dates, a }) => (
  <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a }}>
    <div style={{ width: 92, height: 92, background: rgb(VERM, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 36, fontWeight: 500, color: '#5e5044' }}>{dates}</div>
    </div>
  </div>
);
const Label: React.FC<{ x: number; y: number; zh: string; text: string; color: number[]; a: number; align?: 'left' | 'right' }> = ({ x, y, zh, text, color, a, align = 'left' }) => (
  <div style={{ position: 'absolute', top: y - 50, ...(align === 'left' ? { left: x } : { right: 1920 - x }), opacity: a, display: 'flex', alignItems: 'baseline', gap: 14, flexDirection: align === 'left' ? 'row' : 'row-reverse' }}>
    <span style={{ fontFamily: 'ShuimoKai', fontSize: 100, color: rgb(color) }}>{zh}</span>
    <span style={{ fontFamily: 'ShuimoLatin, ShuimoLegende', fontSize: 66, fontWeight: 600, color: '#3b322b', textShadow: '0 0 10px rgba(246,241,231,0.95)' }}>{text}</span>
  </div>
);
const Caption: React.FC<{ text: React.ReactNode; a: number; y?: number; size?: number; left?: number; width?: number }> = ({ text, a, y = 900, size = 44, left = 0, width = 1920 }) => (
  <div style={{ position: 'absolute', left, width, top: Math.min(y, 975 - 1.7 * Math.max(size, 44)), textAlign: 'center', opacity: a }}>
    <span style={{ display: 'inline-block', padding: '4px 22px', borderRadius: 14, background: 'rgba(246,241,231,0.8)', fontFamily: 'ShuimoLatin, ShuimoLegende', fontSize: Math.max(size, 44), color: '#4b4038', textShadow: '0 0 10px rgba(246,241,231,0.9)' }}>{text}</span>
  </div>
);
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));

// ── caméra : une seule trajectoire continue (spline de Hermite monotone à travers les clés [t, x, y, zoom, durée]),
// dolly lent permanent, « punch » en respirations douces ; le monde est dans la caméra, légendes et cartouches hors caméra
type K = [number, number, number, number, number?];
const hermite = (ts: number[], vs: number[], t: number) => {
  const n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];
  let i = 0; while (t > ts[i + 1]) i++;
  const sl = (a: number) => (vs[a + 1] - vs[a]) / (ts[a + 1] - ts[a]);
  const tan = (k: number) => {
    if (k === 0 || k === n - 1) return 0;
    const a = sl(k - 1), b = sl(k);
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  };
  const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * tan(i) + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * tan(i + 1);
};
const Cam: React.FC<{ keys: K[]; punch?: number[]; children: React.ReactNode }> = ({ keys, punch = [], children }) => {
  const t = useT();
  const ts: number[] = [], xs: number[] = [], ys: number[] = [], zs: number[] = [];
  keys.forEach(([kt, x, y, z, d = 1.2], k) => {
    const a = k === 0 ? kt : Math.max(kt + Math.max(d, 1.6), ts[ts.length - 1] + 0.4);
    ts.push(a); xs.push(x); ys.push(y); zs.push(z);
  });
  let cx = hermite(ts, xs, t), cy = hermite(ts, ys, t), sc = hermite(ts, zs, t);
  sc *= 1 + 0.018 * (0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 16));
  cx += 12 * Math.sin((t * 2 * Math.PI) / 19); cy += 7 * Math.sin((t * 2 * Math.PI) / 23);
  for (const p of punch) { const u = seg(t, p - 0.2, p + 1.2); sc *= 1 + 0.022 * Math.sin(Math.PI * u) ** 2; }
  cx = Math.min(1920 - 960 / sc, Math.max(960 / sc, cx)); cy = Math.min(1080 - 540 / sc, Math.max(540 / sc, cy));
  return <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${960 - cx * sc}px, ${540 - cy * sc}px) scale(${sc})` }}>{children}</AbsoluteFill>;
};

// ════════════════ 1–2. Accroche et enjeu (papier, 學 tracé, les mains s'allument puis s'effacent)
const Opening: React.FC = () => {
  const t = useT();
  const mains = at('b01', 'mains'), retro = at('b02', 'retrouver');
  return (
    <AbsoluteFill>
      <Paper />
      <Cam keys={[[0, 960, 540, 1], [mains - 0.3, 960, 500, 1.12, 1.2], [mains + 4.2, 960, 540, 1, 1.4], [retro, 960, 540, 1.08, 2.0]]} punch={[mains]}>
      <Landscape seed={14} from={retro - 0.6} to={R1 + 2} move="push" mood="aube" />
      <Draw draw={(ctx, tt, E) => {
        const shrink = seg(tt, retro + 0.4, retro + 2.4); // le signe se rétracte en point d'encre
        const size = 560 * (1 - 0.94 * shrink), y = 520 - 40 * shrink;
        const a = 1 - seg(tt, retro + 2.0, retro + 2.6);
        if (a <= 0) return;
        const handGone = seg(tt, mains + 2.6, mains + 4.2); // « plus personne ne les voit »
        const lit = seg(tt, mains, mains + 0.6);
        const simp = seg(tt, at('b02', 'huit') - 0.1, at('b02', 'huit') + 0.5) * (1 - seg(tt, at('b02', 'seize'), at('b02', 'seize') + 0.6));
        const k = Math.max(simp, seg(tt, mains + 3.2, mains + 4.2) * (1 - seg(tt, at('b02', 'seize'), at('b02', 'seize') + 0.6))); // part de 学 : de « plus personne ne les voit » à « seize »
        // 學 : 16 traits en 2,2 s, puis les mains vermillon qui pâlissent jusqu'à disparaître
        if (k < 1) {
          ctx.save(); ctx.globalAlpha = a * (1 - k);
          E.drawStrokes(ctx, 'xue_trad', {
            x: 960, y, size, progress: 16 * seg(tt, A1 - 0.3, A1 + 1.9), brush: false,
            color: (c: string) => (c === 'hand' ? rgb(INK.map((v, i) => Math.round(v + (VERM[i] - v) * lit))) : inkCss),
            alpha: (c: string) => (c === 'hand' ? 1 - 0.9 * handGone * (1 - seg(tt, A2 + 2.6, A2 + 3.2)) : 1),
            glow: lit * (1 - handGone) * 30, glowColor: rgb(VERM, 0.6),
          });
          ctx.restore();
        }
        // 学 (8 traits) en fondu croisé
        if (k > 0) {
          ctx.save(); ctx.globalAlpha = a * k;
          E.drawStrokes(ctx, 'xue_simp', { x: 960, y, size, brush: false, color: () => inkCss });
          ctx.restore();
        }
      }} />
      </Cam>
      {/* compteurs de traits */}
      <Caption text="8 traits" a={win(t, at('b02', 'huit') - 0.1, at('b02', 'seize'))} y={860} size={44} />
      <Caption text="16 traits" a={win(t, at('b02', 'seize'), retro)} y={860} size={44} />
      <Caption text="學 · xué · apprendre" a={win(t, A1 + 1.4, at('b01', 'mains') - 0.2)} y={860} size={44} />
    </AbsoluteFill>
  );
};

// ════════════════ 3–4. Shang → (rouleau 1) → Zhou
const ShangZhou: React.FC = () => {
  const t = useT();
  const vase = at('b04', 'vase');
  const glyphA = 1 - seg(t, vase - 0.6, vase + 0.6);
  const manque = at('b03', 'manque');
  return (
    <AbsoluteFill>
      <TimeScrollStage cfg={TR1} under={<Landscape seed={14} from={A3 - 2} to={SIGNE - 1.5} move="pan" mood="aube" />}
        fromLandscape={{ seed: 5, since: SIGNE - 4 }} toLandscape={{ seed: 9, until: R2 + 1 }}>
        <AbsoluteFill style={{ opacity: glyphA }}><InkStage T={TT} travel={TR1} /></AbsoluteFill>
        {/* « il manque quelqu'un » : un vide lumineux sous le toit */}
        <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 66%, rgba(255,250,236,0.95) 0, rgba(255,250,236,0) 9%)', opacity: win(t, manque, R1 - 0.2, 0.8) }} />
      </TimeScrollStage>
      {/* cartes : Anyang, capitale des Shang ; Hao, capitale des Zhou */}
      <MapPanel from={A3 - 0.3} to={at('b03', 'devins') + 0.2} draw={(ctx, u, E, tt) => peinte(ctx, u, E, tt, 'anyang', A3 + 0.6)} />
      <MapPanel from={A4 - 0.5} to={at('b04', 'bronze') + 0.1} draw={(ctx, u, E, tt) => peinte(ctx, u, E, tt, 'hao', A4 + 0.3)} />
      {/* les devins (clip), puis le tir à l'arc au 學宮 (clip) */}
      <Clip src="devins" from={at('b03', 'devins') - 0.4} len={TT.plastronIn[0] - at('b03', 'devins') + 1.8} entry="nuages" />
      <Clip src="arc" from={vase - 0.3} len={R2 - vase + 0.6} entry="glyphe" />
      <EraTag {...cartouche('shang', 'Anyang · v. 1250 av. J.-C.')} a={win(t, A3 + 0.3, R1 + 0.4, 0.8) * (1 - win(t, at('b03', 'devins') - 0.2, TT.plastronIn[0] + 1.6, 0.5))} />
      <EraTag {...cartouche('zhou', 'XIe siècle av. J.-C.')} a={tagIn(TR1, t) * (1 - seg(t, R2, R2 + 0.4))} />
      <Label x={1220} y={420} zh="爻" text="baguettes" color={PIGMENT.yao} a={win(t, TT.yao + 0.3, R1, 0.6)} />
      <Label x={1220} y={720} zh="宀" text="le toit" color={PIGMENT.roof} a={win(t, TT.roof + 0.3, R1, 0.6)} />
      <Label x={700} y={420} zh="𦥑" text="deux mains" color={PIGMENT.hand} a={win(t, TT.hand + 0.3, R1, 0.6)} align="right" />
      <Label x={1240} y={840} zh="子" text="l'enfant" color={PIGMENT.child} a={win(t, TT.child + 0.4, vase - 0.4, 0.6)} />
      <Caption text="estampage d'un plastron de tortue · fissures de divination 卜" a={win(t, TT.plastronIn[0] + 0.6, TT.plastronOut[1])} />
      <Caption text="inscription coulée dans le bronze · vase rituel, Zhou de l'Ouest" a={win(t, TT.bronzeIn[1], TT.bronzeOut[1])} />
      <Caption text="le tir à l'arc enseigné dans la salle d'étude 學宮 · Jing gui 靜簋" a={win(t, vase + 1.5, R2 - 0.6)} />
    </AbsoluteFill>
  );
};

// ════════════════ 5. (rouleau 2) Qin : variantes des royaumes balayées, petit sceau symétrique
const Qin: React.FC = () => {
  const t = useT();
  const roy = at('b05', 'royaumes'), min = at('b05', 'ministre'), sym = at('b05', 'symetrie'), mains = at('b05', 'mains');
  return (
    <AbsoluteFill>
      <TimeScrollStage cfg={TR2} defaultCursor fromLandscape={{ seed: 9, since: R2 - 3 }} toLandscape={{ seed: 21, until: A6 + 1.5 }}>
        <Draw draw={(ctx, tt, E) => {
          // variantes régionales (forme des Royaumes combattants) posées en désordre, puis balayées
          const sweep = seg(tt, min - 0.2, min + 0.9);
          const vIn = seg(tt, roy, roy + 1.2) * (1 - sweep);
          if (vIn > 0) {
            const spots = [[520, 380, -12, 230], [1420, 360, 9, 210], [760, 740, 6, 190], [1220, 760, -7, 240], [960, 470, 2, 260], [330, 760, 14, 170]];
            spots.forEach(([x, y, r, s], i) => {
              const a = vIn * seg(tt, roy + i * 0.25, roy + i * 0.25 + 0.5);
              ctx.save(); ctx.translate(x, y); ctx.rotate((r * Math.PI) / 180); ctx.scale(i % 2 ? -1 : 1, 1); ctx.translate(-x, -y);
              E.drawRealGlyph(ctx, 'zhanguo', { x, y, size: s, opacity: a * 0.85, color: () => inkCss });
              ctx.restore();
            });
          }
          // coup de pinceau qui balaie
          if (sweep > 0 && sweep < 1) {
            ctx.save(); ctx.globalAlpha = 0.85 * Math.sin(Math.PI * sweep);
            ctx.fillStyle = 'rgba(243,238,228,1)'; ctx.beginPath();
            const x = -300 + 2500 * sweep; ctx.ellipse(x, 560, 320, 520, 0.2, 0, 7); ctx.fill(); ctx.restore();
          }
          // petit sceau : tracé du haut vers le bas, axe de symétrie
          const zIn = seg(tt, min + 0.6, min + 2.4);
          if (zIn > 0) {
            const axis = win(tt, sym, sym + 3.2, 0.6);
            ctx.save(); ctx.strokeStyle = rgb(VERM, 0.6 * axis); ctx.setLineDash([10, 14]); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(960, 230); ctx.lineTo(960, 890); ctx.stroke(); ctx.restore();
            const glow = win(tt, mains, A6 - 0.2, 0.5);
            E.drawRealGlyph(ctx, 'xiaozhuan', { x: 960, y: 560, size: 600, reveal: () => zIn, color: (c: string) => (c === 'hand' && glow > 0 ? rgb(VERM) : inkCss), glow: 24 * glow, glowColor: rgb(VERM, 0.5) });
          }
        }} />
      </TimeScrollStage>
      <MapPanel from={A5 - 0.3} to={at('b05', 'royaumes') + 0.3} draw={(ctx, u, E, tt) => peinte(ctx, u, E, tt, 'xianyang', A5 + 0.5)} />
      <EraTag {...cartouche('qin', '221 av. J.-C. · le petit sceau')} a={tagIn(TR2, t) * (1 - seg(t, A6 - 0.6, A6))} />
      <Caption text="Li Si 李斯 · le petit sceau 小篆" a={win(t, min + 1.0, sym + 2)} />
    </AbsoluteFill>
  );
};

// ════════════════ 6. Xu Shen : portrait peint trait à trait, définition du Shuowen
const XuShen: React.FC = () => {
  const t = useT();
  const lettre = at('b06', 'lettre'), livre = at('b06', 'livre'), def = at('b06', 'definition'), toit = at('b06', 'toit');
  return (
    <AbsoluteFill>
      <Paper />
      <Cam keys={[[A6, 960, 540, 1.02], [lettre - 0.4, 760, 560, 1.06, 2.5], [livre - 0.2, 1000, 540, 1.04, 1.6], [toit - 0.3, 1200, 440, 1.06, 1.2]]} punch={[toit]}>
      <Landscape seed={3} from={A6 - 1} to={A7 + 1} move="still" mood="brume" faint={0.55} />
      <Draw draw={(ctx, tt, E) => {
        E.drawPortrait(ctx, { x: 560, y: 590, height: 640, progress: seg(tt, lettre - 0.6, lettre + 2.4), color: '#2a231d', alpha: 1 - seg(tt, A7 - 0.8, A7) });
        const g = seg(tt, A6 + 0.4, A6 + 1.6) * (1 - seg(tt, A7 - 0.8, A7));
        if (g > 0) {
          // « Et le toit ? C'est l'obscurité qui couvre encore l'esprit » : le toit s'allume en malachite
          const roofLit = win(tt, toit - 0.1, A7 - 0.4, 0.5);
          E.drawRealGlyph(ctx, 'xiaozhuan', { x: 1300, y: 360, size: 400, opacity: g, color: (c: string) => (c === 'roof' && roofLit > 0 ? rgb(PIGMENT.roof) : inkCss), alpha: (c: string) => (c === 'roof' ? 1 : 1 - 0.55 * roofLit), glow: 22 * roofLit, glowColor: rgb(PIGMENT.roof, 0.5) });
        }
      }} />
      </Cam>
      <EraTag {...cartouche('han', 'v. 100 · Xu Shen 許慎')} a={seg(t, A6 + 0.2, A6 + 1.2) * (1 - seg(t, R3, R3 + 0.4))} />
      <Caption text="portrait imaginé" a={win(t, lettre + 1.2, A7 - 0.5)} y={920} size={44} left={160} width={800} />
      <div style={{ position: 'absolute', left: 1020, top: 590, width: 760, background: 'rgba(246,241,231,0.78)', borderRadius: 14, padding: '6px 0', textAlign: 'center', opacity: win(t, livre, A7 - 0.3) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 56, color: inkCss }}>說文解字</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: '#5b4f44' }}>Shuowen jiezi · plus de 9 000 caractères</div>
      </div>
      <div style={{ position: 'absolute', left: 1020, top: 725, width: 760, background: 'rgba(246,241,231,0.78)', borderRadius: 14, padding: '6px 0', textAlign: 'center', opacity: win(t, def, A7 - 0.3) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 52, color: inkCss }}>斆，覺悟也 · 冂，尚矇也</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: '#5b4f44', fontStyle: 'italic' }}>apprendre, c'est s'éveiller · le toit, l'obscurité</div>
      </div>
    </AbsoluteFill>
  );
};

// ════════════════ 7. Le retournement : les scribes, les mains figées, 16 traits, le haut resserré
const Retournement: React.FC = () => {
  const t = useT();
  const apl = at('b07', 'aplatit'), fig = at('b07', 'figent'), reg = at('b07', 'reguliere'), cop = at('b07', 'copies'), rep = at('b07', 'reponse');
  return (
    <AbsoluteFill>
      <Paper />
      <Cam keys={[[A7, 960, 540, 1.02], [fig - 0.2, 960, 520, 1.14, 1.2], [reg - 0.2, 960, 540, 1.02, 1.0], [cop + 0.8, 960, 500, 1.15, 1.4], [rep - 0.3, 960, 540, 1.02, 1.0]]} punch={[reg, rep]}>
      <Landscape seed={3} from={A7 - 1} to={R3 + 2} move="pan" mood="jour" faint={0.4} />
      <Draw draw={(ctx, tt, E) => {
        // « les scribes écrivent vite » : le petit sceau de Xu Shen, puis des copies de plus en plus vite et de plus en plus plates
        const sc = seg(tt, A7 - 0.3, A7 + 0.6) * (1 - seg(tt, apl + 0.3, apl + 1.2));
        if (sc > 0) E.drawRealGlyph(ctx, 'xiaozhuan', { x: 960, y: 500, size: 560, opacity: sc, color: () => inkCss });
        const run = seg(tt, A7 + 1.0, A7 + 1.8) * (1 - seg(tt, apl + 0.2, apl + 1.0));
        if (run > 0) {
          const sp = 260 + 520 * seg(tt, A7 + 1.0, apl), x0 = 2300 - sp * (tt - (A7 + 1.0)) * 0.9;
          for (let i = 0; i < 9; i++) {
            const x = x0 + i * 330, f = seg(x, 1900, 1500) * seg(x, -100, 250);
            if (f <= 0) continue;
            E.drawRealGlyph(ctx, i < 3 ? 'xiaozhuan' : i < 6 ? 'lishu' : 'lishu', { x, y: 905, size: 130, opacity: 0.55 * run * f, color: () => inkCss });
          }
        }
        // écriture des clercs : les mains vermillon pâlissent et se figent en bloc gris
        const li = seg(tt, apl + 0.6, apl + 1.6) * (1 - seg(tt, reg - 0.6, reg));
        if (li > 0) {
          const k = seg(tt, fig, fig + 2.2);
          const col = (c: string) => (c === 'hand' ? rgb(VERM.map((v, i) => Math.round(v + (GRAY[i] - v) * k))) : inkCss);
          E.drawRealGlyph(ctx, 'lishu', { x: 960, y: 540, size: 600, opacity: li, color: col });
        }
        // écriture régulière : 16 traits
        const ka = seg(tt, reg - 0.2, reg + 0.4) * (1 - seg(tt, cop + 1.0, cop + 2.4));
        if (ka > 0) {
          ctx.save(); ctx.globalAlpha = ka;
          E.drawStrokes(ctx, 'xue_trad', { x: 960, y: 540, size: 600, progress: 16 * seg(tt, reg, reg + 3.6), brush: false, color: (c: string) => (c === 'hand' ? rgb(GRAY) : inkCss) });
          ctx.restore();
        }
        // au fil des copies : le haut se resserre en trois petits traits (fondu, pas de cursive)
        const si = seg(tt, cop + 1.0, cop + 2.6);
        if (si > 0) {
          ctx.save(); ctx.globalAlpha = si;
          E.drawStrokes(ctx, 'xue_simp', { x: 960, y: 540, size: 600, brush: false, color: (c: string) => (c === 'fusion' ? rgb(FUSION) : inkCss) });
          ctx.restore();
        }
      }} />
      </Cam>
      <Caption text="dans les bureaux de l'empire · on copie, vite" a={win(t, A7 + 0.5, apl - 0.2, 0.5)} y={730} size={44} />
      <EraTag {...cartouche('tang', "楷書 · l'écriture régulière")} a={win(t, reg + 0.2, R3 - 0.3, 0.5)} />
      <Caption text="écriture des clercs 隸書 · les mains figées en « mortier » 臼" a={win(t, fig, reg - 0.4)} />
      <Caption text="écriture régulière 楷書 · 16 traits" a={win(t, reg + 0.4, cop + 0.8)} />
      <Caption text="« les mains n'ont pas été effacées par un décret »" a={win(t, rep, R3 - 0.2)} size={44} y={920} />
    </AbsoluteFill>
  );
};

// ════════════════ 8–9. (rouleau 3) aujourd'hui : 8 traits, synthèse, l'école ; chute et passerelle
// bandeau des écritures : 甲骨文 → 學 → 学, rubans de composantes, la composante citée reste en couleur, le reste grisé
const FORMS: [string, string, string][] = [['real:jiaguwen', '甲骨文', 'Shang'], ['real:jinwen', '金文', 'Zhou'], ['real:xiaozhuan', '小篆', 'Qin'], ['real:lishu', '隸書', 'Han'], ['font:kai_xue_trad', '楷書', 'Tang'], ['font:kai_xue_simp', '学', 'XXe s.']];
const CUE_OF: Record<string, string> = { yao: 'baguettes', roof: 'toit', hand: 'mains', child: 'enfant' };
const drawBand = (ctx: CanvasRenderingContext2D, E: any, tt: number, a: number) => {
  const y = 380, x0 = 320, dx = 250, sz = 220;
  // composante en vedette : la dernière citée (jusqu'à « Ainsi naît »)
  const order = ['yao', 'roof', 'hand', 'child'];
  let hi = '', k = 0;
  for (const c of order) { const s0 = at('b08', CUE_OF[c]); if (tt >= s0 - 0.05) { hi = c; k = seg(tt, s0 - 0.05, s0 + 0.3); } }
  if (tt > at('b08', 'nait') - 0.3) k *= 1 - seg(tt, at('b08', 'nait') - 0.3, at('b08', 'nait') + 0.2);
  const GREY = [168, 160, 150];
  const mixc = (c1: number[], c2: number[], u: number) => c1.map((v, i) => Math.round(v + (c2[i] - v) * u));
  FORMS.forEach(([key, zh, fr], i) => {
    const t0 = at('b08', 'baguettes') - 0.7;
    const appear = seg(tt, t0 + i * 0.08, t0 + 0.4 + i * 0.08) * a;
    if (appear <= 0) return;
    const late = i === 5;
    const base = (c: string) => (late && (c === 'hand' || c === 'yao') ? FUSION : PIGMENT[c] ?? INK);
    const color = (c: string) => {
      const on = late && (hi === 'hand' || hi === 'yao') ? c === 'hand' || c === 'yao' : c === hi;
      return rgb(on || !hi ? base(c) : mixc(base(c), GREY, k));
    };
    const alpha = (c: string) => (!hi || c === hi || (late && (hi === 'hand' || hi === 'yao') && (c === 'hand' || c === 'yao')) ? 1 : 1 - 0.55 * k);
    const x = x0 + i * dx;
    ctx.save(); ctx.globalAlpha = appear;
    if (key.startsWith('real:')) E.drawRealGlyph(ctx, key.slice(5), { x, y, size: sz, color, alpha });
    else E.drawFontGlyph(ctx, key.slice(5), { x, y, size: sz, color, alpha });
    E.text(ctx, zh, x, y + 172, { font: 'Kai', size: 64, color: inkCss, alpha: appear });
    E.text(ctx, fr, x, y + 236, { font: 'Cormorant', size: 48, weight: 700, color: '#5b4f44', alpha: appear });
    ctx.restore();
  });
  // rubans : où vit chaque composante ; mains et baguettes se fondent en ⺍
  const rows: [string, number, number, string][] = [['hand', 0, 4, 'mains'], ['yao', 0, 4, 'baguettes'], ['roof', 0, 5, 'toit'], ['child', 1, 5, 'enfant']];
  const grow = seg(tt, at('b08', 'baguettes') - 0.5, at('b08', 'baguettes') + 0.4);
  rows.forEach(([c, a0, a1, lab], j) => {
    const yy = 760 + j * 72, xa = x0 + a0 * dx - 60, xb = x0 + a1 * dx + 60;
    const col = !hi || hi === c ? PIGMENT[c] : mixc(PIGMENT[c], GREY, k);
    const al = a * grow * (!hi || hi === c ? 1 : 1 - 0.5 * k);
    ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = rgb(col); ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xa + (xb - xa) * grow, yy); ctx.stroke();
    if (c === 'hand' || c === 'yao') {
      ctx.strokeStyle = rgb(FUSION); ctx.beginPath(); ctx.moveTo(xb, yy); ctx.quadraticCurveTo(xb + 90, yy, x0 + 5 * dx - 40, 796); ctx.lineTo(x0 + 5 * dx + 60, 796); ctx.stroke();
    }
    ctx.restore();
    E.text(ctx, lab, xa - 24, yy, { font: 'Cormorant', size: 56, weight: 700, align: 'right', color: rgb(col), alpha: al });
  });
  E.text(ctx, '⺍', x0 + 4.6 * dx, 735, { font: 'Kai', size: 50, color: rgb(FUSION), alpha: a * grow });
};

const Today: React.FC = () => {
  const t = useT();
  const huit = at('b08', 'huit'), pin = at('b08', 'pinceau'), nait = at('b08', 'nait'), ecole = at('b08', 'ecole'), mots = at('b08', 'mots'), rec = at('b08', 'reconnaitre');
  const autre = at('b09', 'autre'), baton = at('b09', 'baton');
  return (
    <AbsoluteFill>
      <>
        <Landscape seed={30} from={R3 + r3Seconds(R3A) - 0.3} to={XUE_V2_SECONDS + 1} move="push" mood="aube" />
        <Draw draw={(ctx, tt, E) => {
          const out = 1 - seg(tt, autre - 0.3, autre + 0.6);
          if (out <= 0 || tt < huit - 0.3) return;
          // synthèse : bandeau des six écritures (repris de la version fond noir, adapté au papier) ; à chaque
          // composante citée, elle reste en pigment dans toutes les formes et le reste du signe se grise
          const syn = win(tt, at('b08', 'baguettes') - 0.7, nait + 0.5, 0.6); // après le tracé complet de 学
          if (syn > 0) drawBand(ctx, E, tt, syn);
          const childGlow = win(tt, rec + 2.2, autre, 0.5) + 0.6 * win(tt, nait, nait + 2, 0.4);
          const x = 960, s = 560;
          ctx.save(); ctx.globalAlpha = out * (1 - syn);
          E.drawStrokes(ctx, 'xue_simp', {
            x, y: 520, size: s, progress: 8 * seg(tt, huit - 0.2, huit + 2.2), brush: false,
            color: (c: string) => (c === 'child' ? rgb(childGlow > 0 ? PIGMENT.child : INK) : c === 'roof' && win(tt, rec + 1.1, rec + 2.4, 0.3) > 0 ? rgb(PIGMENT.roof) : c === 'fusion' && win(tt, rec, rec + 1.3, 0.3) > 0 ? rgb(FUSION) : inkCss),
            glow: 26 * Math.min(1, childGlow), glowColor: rgb(PIGMENT.child, 0.6),
          });
          ctx.restore();
        }} />
        {/* passerelle : 教, la main tient un bâton */}
        <div style={{ position: 'absolute', width: '100%', top: 260, textAlign: 'center', fontFamily: 'ShuimoKai', fontSize: 480, lineHeight: 1, color: inkCss, opacity: seg(t, autre + 0.2, autre + 1.4), textShadow: `0 0 ${40 * seg(t, baton, baton + 0.6)}px ${rgb(VERM, 0.8)}` }}>教</div>
      </>
      <MapPanel from={A8 - 0.3} to={at('b08', 'huit') + 0.2} draw={(ctx, u, E, tt) => {
        const v = { lon: 126, lat: 36, k: 40 + 6 * u }, vb = { lon: 126, lat: 36, k: 40 };
        E.mapLayer(ctx, v, vb, 60, 'xue_japon_chine', (c: CanvasRenderingContext2D, w: any) => E.drawMap(c, 0, w, { paper: true, rivers: 1, deco: false }));
        E.mapDeco(ctx, { paper: true });
        E.marker(ctx, tt, v, E.CITIES.tokyo, 'Japon · 1949', '当用漢字字体表', seg(u, 0.15, 0.25), '#c4882a', -1);
        E.marker(ctx, tt, v, E.CITIES.beijing, 'Chine · 1956', '汉字简化方案', seg(u, 0.45, 0.55), '#c0392b', -1);
      }} />
      <EraTag {...cartouche('aujourdhui', 'Japon 1949 · Chine 1956 · 8 traits')} a={r3TagIn(R3A, t) * (1 - seg(t, A9, A9 + 0.6))} />
      <Caption text="xué · apprendre" a={win(t, nait, ecole)} y={720} size={44} />
      <div style={{ position: 'absolute', width: '100%', top: 790, display: 'flex', justifyContent: 'center', gap: 120, fontFamily: 'ShuimoKai', fontSize: 80, color: inkCss }}>
        <span style={{ opacity: win(t, mots + 0.2, rec + 0.3) }}>学生<div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, textAlign: 'center' }}>l'élève</div></span>
        <span style={{ opacity: win(t, ecole + 0.2, rec + 0.3) }}>学校<div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, textAlign: 'center' }}>l'école</div></span>
        <span style={{ opacity: win(t, mots + 1.4, rec + 0.3) }}>大学<div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, textAlign: 'center' }}>l'université</div></span>
      </div>
      <Caption text="Les mains se sont effacées du signe. Pas du geste." a={win(t, A9 + 0.3, autre - 0.2, 0.7)} y={900} size={44} />
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
      <Landscape seed={30} from={END - 1} to={XUE_V2_SECONDS + 1} move="still" mood="aube" faint={0.35} />
      <div style={{ position: 'absolute', left: 120, top: 150, width: 520, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ width: 104, height: 104, background: rgb(VERM, 0.95), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 46, color: '#f6eee0', writingMode: 'vertical-rl', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>墨道</div>
          <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss, lineHeight: 1.15 }}>LA VOIE<br />DE L'ENCRE</div>
        </div>
        <div style={{ marginTop: 70, fontFamily: 'ShuimoLatin', fontSize: 46, color: '#5e5044', opacity: seg(t, END + 0.8, END + 1.6) }}>Prochain caractère</div>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 260, lineHeight: 1, color: inkCss, opacity: seg(t, END + 1.2, END + 2.2) }}>教</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 60, fontWeight: 600, color: '#3b322b', opacity: seg(t, END + 1.6, END + 2.6) }}>jiào · enseigner</div>
      </div>
    </AbsoluteFill>
  );
};

const Win: React.FC<{ from: number; to: number; fade?: number; children: React.ReactNode }> = ({ from, to, fade = 0, children }) => {
  const t = useT();
  if (t < from - fade || t >= to) return null;
  return fade > 0 ? <AbsoluteFill style={{ opacity: ease(seg(t, from - fade, from)) }}>{children}</AbsoluteFill> : <>{children}</>;
};

export const XueV2: React.FC = () => {
  const ready = useSetup();
  const { fps } = useVideoConfig();
  const clips: Clip[] = ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b08', 'b09'];
  const voice = (k: Clip) => {
    const c = L.clips[k];
    if (!c.pause) return <Sequence key={k} from={Math.round(c.debut * fps)}><Audio src={staticFile(`episodes/xue/voix/${k}.wav`)} /></Sequence>;
    return (
      <React.Fragment key={k}>
        <Sequence from={Math.round(c.debut * fps)} durationInFrames={Math.round(c.pause.coupe * fps)}><Audio src={staticFile(`episodes/xue/voix/${k}.wav`)} /></Sequence>
        <Sequence from={Math.round((c.debut + c.pause.coupe + c.pause.duree) * fps)}><Audio src={staticFile(`episodes/xue/voix/${k}.wav`)} startFrom={Math.round(c.pause.coupe * fps)} /></Sequence>
      </React.Fragment>
    );
  };
  return (
    <AbsoluteFill style={{ background: '#f3eee4' }}>
      {ready && <Shake impacts={IMPACTS}>
      <Win from={0} to={A3 - 0.01}><Opening /></Win>
      <Win from={A3 - 0.01} to={R2}><ShangZhou /></Win>
      <Win from={R2} to={A6 - 0.4}><Qin /></Win>
      <Win fade={0.8} from={A6 - 0.4} to={A7 - 0.3}><XuShen /></Win>
      <Win fade={0.8} from={A7 - 0.3} to={R3 + 0.3}><Retournement /></Win>
      <Win from={R3 + r3Seconds(R3A) - 0.5} to={END}><Today /></Win>
      <Win from={END} to={XUE_V2_SECONDS + 1}><EndCard /></Win>
      </Shake>}
      {ready && <Win from={R3 - 1.5} to={R3 + r3Seconds(R3A) + 3.5}><Rouleau3DStage cfg={R3A} /></Win>}
      {ready && <GrainVignette />}
      {SFX.map(([n, tt, v], i) => (
        <Sequence key={`sfx${i}`} from={Math.round(tt * fps)}><Audio src={staticFile(`episodes/xue/audio/sfx_${n}.wav`)} volume={v} /></Sequence>
      ))}
      {clips.map(voice)}
      <Audio src={staticFile('episodes/xue/audio/musique.wav')} volume={0.55} />
    </AbsoluteFill>
  );
};
