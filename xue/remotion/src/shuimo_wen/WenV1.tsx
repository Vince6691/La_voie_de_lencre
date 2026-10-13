// 文 (wén), version tout shuimo — episodes/wen/PROPOSITION.md (v6 : quatre sens, quatre époques).
// Question : comment un tatouage est-il devenu le mot « culture » ? Fil : 1 · la marque (la dynastie Shang, l'os, le
// roi défunt 文丁) → rouleau 1 → 2 · l'ornement (la dynastie Zhou : Taibo, carte et clip ; le bronze, la marque devient
// un cœur ; le roi 文 « l'orné » face au roi 武 « le guerrier ») → 3 · l'écriture (le bambou ; Chu, le cœur sort du
// corps) → rouleau 2 (pause dans la voix) → la dynastie Qin (petit sceau, torse vide) et les scribes (4 traits) →
// 4 · la culture (la dynastie Han : fresque de Tiying révélée, effondrement ; 文化 = transformer par le 文 plutôt que
// par les armes) → rouleau 3 → scène récapitulative (tête, bras, jambes, marque dans toutes les formes ; les quatre
// sens) → maxime et passerelle 美 (seul l'homme s'allume, le sens n'est pas dévoilé). Cartouches des quatre sens en
// haut à droite. Ligne de temps lue dans les repères (episodes/wen/voix/reperes.json, « _ligne »), jamais recalculée
// ici. Pigments : l'homme en azurite, la marque en vermillon, 化 en malachite.
// En attente : clip Seedance A (Taibo) — clip d'exemple en place.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose, Mood } from '../shuimo/layout';
import { INK, PIGMENT } from '../shuimo_xue/InkStage';
import { Era, TimeScrollConfig, TimeScrollStage, arrivePose, cursorPose, morphK, tagIn } from '../rouleau/TimeScroll';
import { VideoReveal } from '../video_encre/VideoReveal';
import { CloudReveal } from '../video_encre/CloudReveal';
import { loadLegacy, W } from '../legacy';
import { TiyingReveal } from './TiyingReveal';
import rep from '../data/episodes/wen.json';

type Clip = 'b01' | 'b02' | 'b03' | 'b04' | 'b05' | 'b06' | 'b07';
type Rep = Record<Clip, { duration: number; cues: Record<string, number> }> & {
  _ligne: { clips: Record<Clip, { debut: number; duree: number; pause?: { coupe: number; duree: number } }>; rouleaux: { debut: number; duree: number }[]; fin: number; total: number; bruitages?: [string, number, number][] };
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
// début d'une pause dans la voix d'un bloc (rouleau 2 dans b04, effondrement de la fresque dans b05)
const pauseAt = (k: Clip) => L.clips[k].debut + L.clips[k].pause!.coupe;
export const WEN_SECONDS = Math.ceil(L.total * 10) / 10;
const END = L.fin;

// époques du 文 (sceaux de la frise des rouleaux)
const ERAS: Era[] = [
  { zh: '商', date: '−1200' }, { zh: '周', date: '−1046' }, { zh: '楚', date: '−300' }, { zh: '秦', date: '−221' },
  { zh: '漢', date: '−167' }, { zh: '今', date: '2026' },
];
const [R1, R3] = L.rouleaux.map((r) => r.debut);
const P4 = pauseAt('b04'), P4D = L.clips.b04.pause!.duree;
const TR1: TimeScrollConfig = { at: R1, duration: L.rouleaux[0].duree, eras: ERAS, from: 0, to: 1, years: [-1200, -1046] };
const TR2: TimeScrollConfig = { at: P4, duration: P4D, eras: ERAS, from: 2, to: 3, years: [-300, -221] };
const TR3: TimeScrollConfig = { at: R3, duration: L.rouleaux[1].duree, eras: ERAS, from: 4, to: 5, years: [-20, 2026] };
const R1E = R1 + TR1.duration!, P4E = P4 + P4D, R3E = R3 + TR3.duration!;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const inkCss = rgb(INK);
// pigments constants : l'homme (tête, bras, jambes) en azurite, la marque en vermillon, la soie de 紋 en malachite,
// le haut de 美 laissé à l'encre (on ne dévoile pas encore ce qu'il porte)
const AZ = PIGMENT.child, VER = PIGMENT.hand, MAL = PIGMENT.roof, GOM = PIGMENT.yao;
const P: Record<string, number[]> = { tete: AZ, bras: AZ, jambes: AZ, homme: AZ, marque: VER, soie: MAL, coiffe: GOM };
const GREY = [168, 160, 150], PAPERWHITE = [240, 233, 219];
const useT = () => useCurrentFrame() / useVideoConfig().fps;

// ── polices et moteur Canvas
const useSetup = () => {
  const [h] = useState(() => delayRender('polices + moteur'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load(),
      new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); return loadLegacy({ three: false, captions: false }); }).then(() => { setReady(true); continueRender(h); });
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
const FadeIn: React.FC<{ d: number; children: React.ReactNode }> = ({ d, children }) => <AbsoluteFill style={{ opacity: seg(useT(), 0, d) }}>{children}</AbsoluteFill>;
const Paper: React.FC = () => <AbsoluteFill style={{ background: `#f3eee4 url(${staticFile('shuimo/paper.jpg')}) center/cover` }} />;

// clip 3D plein cadre (clip d'exemple en attendant le clip Seedance A) : entrée par les nuages, ou à travers
// le caractère quand il est à l'écran juste avant ; sortie par les coups de pinceau
const CLIPS = { taibo: 'exemples_videos/exemple_plan_fixe.mp4' };
const CLIP_SRC_SECONDS = 7.8;
const ClipShot: React.FC<{ src: keyof typeof CLIPS; from: number; len: number; entry: 'nuages' | 'glyphe'; glyph?: string; inDur?: number }> = ({ src, from, len, entry, glyph = '文', inDur = 3.2 }) => {
  const { fps } = useVideoConfig();
  const rate = Math.min(0.9, (0.85 * CLIP_SRC_SECONDS) / len);
  if (entry === 'glyphe') {
    return (
      <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(len * fps)}>
        <VideoReveal src={CLIPS[src]} mode="glyphe" glyph={glyph} outMode="pinceau" inDur={inDur} outDur={2.4} playbackRate={rate} zoom={1} />
      </Sequence>
    );
  }
  const cl = inDur + 0.4;
  return (
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
const Caption: React.FC<{ text: string; a: number; y?: number; size?: number }> = ({ text, a, y = 990, size = 38 }) => (
  <div style={{ position: 'absolute', width: '100%', top: y, textAlign: 'center', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: size, color: '#5b4f44', opacity: a, textShadow: '0 0 10px rgba(246,241,231,0.9)' }}>{text}</div>
);
// glyphe réel : l'homme à l'encre (ou en azurite selon man), la marque en vermillon selon mark
const manCol = (man: number, mark: number, dim = 0) => (c: string) => rgb(mixc(c === 'marque' ? mixc(INK, VER, mark) : mixc(INK, AZ, man), GREY, dim));

// ── caméra : poussées et panoramiques lents (clés [t, cx, cy, échelle, durée du mouvement]), respiration
// permanente, petit « punch » (+3,5 %) sur les révélations ; neutre pendant les rouleaux (calm).
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

// estampage (os ou bronze) : plaque sombre tamponnée sur le papier
const stamp = (ctx: CanvasRenderingContext2D, E: any, a: number, x: number, y: number, w: number, h: number, r: number, bronze = false) => {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = bronze ? 'rgba(44,52,46,0.88)' : 'rgba(40,34,30,0.86)';
  E.roundRect(ctx, x - w / 2, y - h / 2, w, h, r); ctx.fill();
  ctx.restore();
};


// ── cartouches des quatre sens (en haut à droite) : chaque sens s'allume quand la voix le nomme, puis tous pulsent
// l'un après l'autre dans la récapitulation ; masqués pendant les rouleaux et la fresque
const SENS = ['la marque', "l'ornement", "l'écriture", 'la culture'];
const T_IN = A('b05') - 0.4; // fresque de Tiying
const T_OUT = pauseAt('b05') + 0.3; // effondrement (bruitage de la liste, même temps)
const T_CULT = at('b05', 'simple') - 0.5; // scène 文化, sur le papier
const Senses: React.FC = () => {
  const t = useT();
  const on = [at('b02', 'sens'), at('b03', 'sens'), at('b04', 'sens'), at('b05', 'sens')];
  const recap = [at('b06', 'sens'), at('b06', 'orn'), at('b06', 'ecr'), at('b06', 'cul')];
  const vis = seg(t, on[0] - 0.3, on[0] + 0.3) * (1 - win(t, R1 - 0.3, R1E + 0.3, 0.4)) * (1 - win(t, P4 - 0.3, P4E + 0.3, 0.4))
    * (1 - win(t, T_IN, T_CULT + 0.4, 0.5)) * (1 - win(t, R3 - 0.3, R3E + 0.3, 0.4)) * (1 - seg(t, A('b07') - 0.6, A('b07')));
  if (vis <= 0) return null;
  return (
    <div style={{ position: 'absolute', right: 56, top: 44, display: 'flex', gap: 14, opacity: vis }}>
      {SENS.map((s, i) => {
        const lit = seg(t, on[i], on[i] + 0.4);
        const p = Math.max(win(t, on[i], on[i] + 1.1, 0.25), win(t, recap[i], recap[i] + 0.9, 0.2));
        return (
          <div key={i} style={{ transform: `scale(${1 + 0.16 * p})`, transformOrigin: '50% 0', padding: '8px 18px', borderRadius: 12,
            border: `3px ${lit > 0.5 ? 'solid' : 'dashed'} ${rgb(VER, 0.35 + 0.6 * lit)}`, background: `rgba(246,241,231,${0.55 + 0.4 * lit})`,
            boxShadow: p > 0 ? `0 0 ${24 * p}px ${rgb(VER, 0.6)}` : 'none', fontFamily: 'ShuimoLatin', fontWeight: 700, fontSize: 34, whiteSpace: 'nowrap', color: inkCss }}>
            <span style={{ color: rgb(VER) }}>{i + 1}</span>
            <span style={{ opacity: lit, marginLeft: 10 * lit, display: 'inline-block', maxWidth: 260 * lit, overflow: 'hidden', verticalAlign: 'bottom' }}>· {s}</span>
          </div>
        );
      })}
    </div>
  );
};

// ════════════════ 1. Accroche : 文 tracé, l'homme de face, le tatouage sur la poitrine
const Opening: React.FC = () => {
  const t = useT();
  const A1 = A('b01'), hom = at('b01', 'homme'), tat = at('b01', 'tatouage'), com = at('b01', 'comment');
  return (
    <AbsoluteFill>
      <Cam keys={[[0, 960, 540, 1], [hom, 960, 520, 1.1, 1.4], [tat - 0.3, 960, 470, 1.35, 1.2], [com + 0.4, 960, 540, 1.02, 1.6]]} punch={[tat + 0.4]}>
        <Paper />
        <Draw draw={(ctx, tt, E) => {
          const toOld = seg(tt, hom - 0.2, hom + 0.5);
          const mark = seg(tt, tat + 0.3, tat + 1.0) * (1 - 0.6 * seg(tt, com + 1.5, B('b01')));
          if (toOld < 1) {
            ctx.save(); ctx.globalAlpha = 1 - toOld;
            E.drawStrokes(ctx, 'wen_regulier', { x: 960, y: 520, size: 600, progress: 4 * seg(tt, A1 - 0.2, A1 + 1.8), brush: false, color: () => inkCss });
            ctx.restore();
          }
          if (toOld > 0) E.drawRealGlyph(ctx, 'wen_jiaguwen', { x: 960, y: 520, size: 640, opacity: toOld, color: manCol(0, mark), glow: 26 * mark, glowColor: rgb(VER, 0.6) });
        }} />
      </Cam>
      <Caption text="文 · wén · l'écriture, la culture" a={win(t, A1 + 1.6, hom - 0.3)} y={880} size={52} />
      <Caption text="un homme, debout, de face (os de divination)" a={win(t, hom + 0.4, tat - 0.2, 0.4)} y={900} size={46} />
      <Caption text="et sur la poitrine… une marque" a={win(t, tat + 0.4, B('b01') + 0.4, 0.4)} y={900} size={48} />
    </AbsoluteFill>
  );
};

// ════════════════ 2. La dynastie Shang : l'os, la marque (croix, V, nœud), le roi défunt 文丁 → 1er sens → rouleau 1
const Shang: React.FC = () => {
  const t = useT();
  const A2 = A('b02'), os = at('b02', 'os'), bras = at('b02', 'bras'), mq = at('b02', 'marque'), cx = at('b02', 'croix'), pun = at('b02', 'punition'), rois = at('b02', 'rois'), sens = at('b02', 'sens');
  return (
    <AbsoluteFill>
      <Cam keys={[[A2, 960, 540, 1.02], [os + 0.6, 960, 520, 1.06, 1.6], [mq - 0.2, 960, 450, 1.25, 1.0], [pun - 0.4, 960, 540, 1.02, 1.0], [sens - 0.4, 960, 500, 1.1, 1.0], [R1 - 0.6, 960, 540, 1, 0.6]]}
        punch={[os + 1.2, mq + 0.2, sens + 0.3]} calm={[[R1 - 0.6, R1E + 0.4]]}>
        <TimeScrollStage cfg={TR1} under={<Landscape seed={14} from={A2 - 1.5} to={pun + 1} move="push" mood="aube" />}
          fromLandscape={{ seed: 5, since: pun - 1 }} toLandscape={{ seed: 9, until: A('b03') + 2 }}>
          <Draw draw={(ctx, tt, E) => {
            const plate = win(tt, os - 0.4, R1 + 0.2, 0.7);
            stamp(ctx, E, plate * (1 - seg(tt, pun, pun + 1.2)), 960, 520, 520, 760, 170);
            const reveal = seg(tt, os + 0.3, os + 1.5);
            if (reveal <= 0 || tt > R1E + 0.1) return;
            const dry = seg(tt, pun - 0.4, pun + 0.8); // le signe passe du blanc (estampage) à l'encre
            const mark = seg(tt, mq, mq + 0.6);
            const man = win(tt, bras, mq, 0.4);
            const col = (c: string) => rgb(c === 'marque' ? mixc(mixc(PAPERWHITE, INK, dry), VER, mark) : mixc(mixc(PAPERWHITE, INK, dry), AZ, man));
            // croix, V, nœud : la marque change de forme (fondu net), puis revient au V
            const k = tt < cx ? 1 : tt < cx + 0.8 ? 0 : tt < cx + 1.7 ? 1 : tt < cx + 2.8 ? 2 : 1;
            const key = ['wen_shang_croix', 'wen_jiaguwen', 'wen_shang_noeud'][k];
            const mk = morphK(TR1, tt), p = cursorPose(TR1, tt), q = arrivePose(TR1, tt);
            const g = 22 * mark * (1 - seg(tt, pun, pun + 1)) + 30 * win(tt, sens, R1 - 0.3, 0.4);
            if (mk < 1) E.drawRealGlyph(ctx, key, { x: p.x, y: p.y, size: 640 * p.s, reveal: () => reveal, opacity: 1 - mk, color: col, glow: g, glowColor: rgb(VER, 0.6) });
            if (mk > 0) E.drawRealGlyph(ctx, 'wen_zhou', { x: q.x, y: q.y, size: 640 * q.s, opacity: mk * (1 - seg(tt, R1E - 0.3, R1E + 0.1)), color: manCol(0, 1) });
          }} />
        </TimeScrollStage>
      </Cam>
      <Label x={1290} y={300} zh="大" text="bras ouverts" color={AZ} a={win(t, bras + 0.2, mq - 0.2, 0.4)} />
      <Label x={1290} y={480} zh="×" text="une marque" color={VER} a={win(t, mq + 0.2, cx - 0.1, 0.4)} />
      <Caption text={['une croix', 'un V', 'un nœud, parfois un cœur'][t < cx + 0.8 ? 0 : t < cx + 1.7 ? 1 : 2]} a={win(t, cx, cx + 3.0, 0.3)} y={900} size={50} />
      <Caption text="pas une punition : un honneur" a={win(t, pun + 0.2, rois - 0.2, 0.5)} y={960} size={46} />
      <Caption text="文丁 · Wen Ding, roi défunt de la dynastie Shang, honoré du nom de 文" a={win(t, rois + 0.2, sens - 0.3, 0.5)} y={960} size={42} />
      <Caption text="premier sens : la marque sur la peau" a={win(t, sens + 0.2, R1 - 0.2, 0.5)} y={960} size={50} />
      <EraTag zh="商" name="DYNASTIE SHANG" dates="v. 1200 av. J.-C." a={win(t, A2 + 0.3, R1 + 0.4, 0.8)} />
      <EraTag zh="周" name="DYNASTIE ZHOU" dates="XIe siècle av. J.-C." a={tagIn(TR1, t) * (1 - seg(t, R1E + 1.5, R1E + 2.2))} />
    </AbsoluteFill>
  );
};

// ════════════════ 3. La dynastie Zhou : la fuite de Taibo (carte + clip A), le bronze (le cœur, l'ornement) → 2e sens ;
// le roi 文 « l'orné » et son fils le roi 武 « le guerrier »
const ZHOUYUAN = [107.8, 34.45], WU = [120.3, 31.55];
const FUITE = [[107.8, 34.45], [109.8, 33.4], [112.5, 32.2], [115.6, 31.4], [118.2, 31.6], [120.3, 31.55]];
const Zhou: React.FC = () => {
  const t = useT();
  const A3 = A('b03'), taibo = at('b03', 'taibo'), reg = at('b03', 'regner'), br = at('b03', 'bronze'), coeur = at('b03', 'coeur'), orne = at('b03', 'orne'), sens = at('b03', 'sens'),
    roi = at('b03', 'roi'), fils = at('b03', 'fils'), duo = at('b03', 'duo'), raff = at('b03', 'raff'), force = at('b03', 'force');
  const mapTo = reg - 0.3;
  return (
    <AbsoluteFill>
      <Cam keys={[[A3 - 0.3, 960, 540, 1.02], [br + 0.6, 960, 520, 1.06, 1.2], [coeur - 0.2, 960, 470, 1.25, 1.0], [orne - 0.3, 960, 540, 1.02, 1.0], [roi - 0.2, 960, 520, 1.1, 1.0], [fils - 0.2, 960, 540, 1.0, 1.0]]}
        punch={[coeur + 0.3, roi + 1.2, duo]}>
        <Paper />
        <Landscape seed={9} from={A3 - 1.5} to={A('b04') + 0.6} move="pan" mood="jour" faint={0.6} />
        <Draw draw={(ctx, tt, E) => {
          // le bronze : le corps s'épaissit, la marque devient un cœur ; puis os et bronze côte à côte (l'ornement)
          const bz = win(tt, br - 0.2, roi - 0.1, 0.6);
          if (bz > 0) {
            const side = seg(tt, orne - 0.2, orne + 0.8);
            stamp(ctx, E, bz, 960 + 260 * side, 520, 560, 760, 60, true);
            const mark = seg(tt, coeur, coeur + 0.6);
            E.drawRealGlyph(ctx, 'wen_zhou', { x: 960 + 260 * side, y: 520, size: 660, opacity: bz * seg(tt, br + 0.2, br + 1.2), color: (c: string) => rgb(c === 'marque' ? mixc([214, 200, 170], VER, mark) : [214, 200, 170]), glow: 30 * mark + 20 * win(tt, sens, roi, 0.4), glowColor: rgb(VER, 0.6) });
            if (side > 0) E.drawRealGlyph(ctx, 'wen_jiaguwen', { x: 960 - 520 * side, y: 520, size: 440, opacity: bz * side, color: manCol(0, 1) });
          }
          // 文王 « l'orné » (vermillon), puis 武王 « le guerrier » à côté ; enfin : le raffinement… et la force
          const wa = win(tt, roi - 0.2, A('b04') + 0.2, 0.5);
          if (wa <= 0) return;
          const split = ease(seg(tt, fils - 0.2, fils + 0.8)), wu = seg(tt, fils + 0.2, fils + 1.0);
          const rouge = seg(tt, roi + 1.0, roi + 1.6), wang = 1 - seg(tt, duo - 0.3, duo + 0.2);
          const xw = 960 - 330 * split, xu = 960 + 330;
          E.text(ctx, '文', xw, 470, { font: 'Kai', size: 330, color: rgb(mixc(INK, VER, rouge)), alpha: wa, glow: 20 * rouge, glowColor: rgb(VER, 0.5) });
          E.text(ctx, '王', xw, 790, { font: 'Kai', size: 200, color: inkCss, alpha: wa * wang });
          if (wu > 0) {
            E.text(ctx, '武', xu, 470, { font: 'Kai', size: 330, color: inkCss, alpha: wa * wu });
            E.text(ctx, '王', xu, 790, { font: 'Kai', size: 200, color: inkCss, alpha: wa * wu * wang });
          }
          E.text(ctx, 'le raffinement', xw, 760, { font: 'Cormorant', size: 76, weight: 700, color: rgb(VER), alpha: wa * seg(tt, raff - 0.2, raff + 0.3) });
          E.text(ctx, 'la force', xu, 760, { font: 'Cormorant', size: 76, weight: 700, color: inkCss, alpha: wa * seg(tt, force - 0.2, force + 0.3) });
        }} />
      </Cam>
      <MapPanel from={A3 - 0.4} to={mapTo} draw={(ctx, u, E, tt) => {
        const z = ease(seg(tt, A3, taibo + 1.5)), v = { lon: 113.8 + 0.4 * z, lat: 33.0 - 0.2 * z, k: 62 + 18 * z };
        const vb = { lon: 113.8, lat: 33.0, k: 60 };
        E.mapLayer(ctx, v, vb, 90, 'wen_taibo', (c: CanvasRenderingContext2D, w: any) => E.drawMap(c, 0, w, { paper: true, rivers: 1, deco: false }));
        E.mapDeco(ctx, { paper: true });
        E.marker(ctx, tt, v, ZHOUYUAN, 'Zhou', 'vallée de la Wei', seg(tt, A3 + 0.2, A3 + 0.8), '#c0392b', -1);
        // la fuite vers le sud-est, tracée au pinceau (pointillé), jusqu'au bas Yangzi (futur royaume de Wu)
        const k = seg(tt, taibo - 0.2, mapTo - 0.6) * (FUITE.length - 1);
        if (k > 0) {
          ctx.save(); ctx.strokeStyle = rgb(VER, 0.85); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.setLineDash([18, 14]);
          ctx.beginPath();
          for (let i = 0; i <= Math.min(Math.floor(k), FUITE.length - 1); i++) { const q = E.proj(v, FUITE[i]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
          const i0 = Math.floor(k), f = k - i0;
          if (i0 < FUITE.length - 1 && f > 0) {
            const a0 = FUITE[i0], a1 = FUITE[i0 + 1];
            const q = E.proj(v, [a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f]); ctx.lineTo(q[0], q[1]);
          }
          ctx.stroke(); ctx.restore();
        }
        E.marker(ctx, tt, v, WU, 'Taibo', 'bas Yangzi (futur Wu)', seg(tt, mapTo - 1.0, mapTo - 0.6), '#348462', 1);
      }} />
      <ClipShot src="taibo" from={reg - 0.8} len={br - 0.3 - (reg - 0.8)} entry="nuages" inDur={2.4} />
      <Caption text="Taibo 太伯, l'aîné, s'enfuit vers le sud et se fait tatouer (Shiji, 吳太伯世家)" a={win(t, taibo + 0.2, mapTo - 0.1, 0.5)} y={980} size={38} />
      <Caption text="bronze Zhou (師害簋) : un vrai cœur sur la poitrine" a={win(t, coeur + 0.3, orne - 0.2, 0.5)} y={980} size={44} />
      <Caption text="os (Shang) → bronze (Zhou) : la marque devient un ornement" a={win(t, orne + 0.4, sens - 0.2, 0.5)} y={980} size={44} />
      <Caption text="deuxième sens : l'ornement, le raffinement" a={win(t, sens + 0.2, roi - 0.3, 0.5)} y={980} size={50} />
      <Caption text="文王 · le roi Wen, « l'orné »" a={win(t, roi + 0.4, fils - 0.2, 0.5)} y={980} size={48} />
      <Caption text="武王 · le roi Wu, son fils, renverse la dynastie Shang (v. 1046 av. J.-C.)" a={win(t, fils + 1.0, duo - 0.3, 0.5)} y={980} size={42} />
      <EraTag zh="周" name="DYNASTIE ZHOU" dates="XIe siècle av. J.-C." a={seg(t, A3 - 0.6, A3 + 0.2) * (1 - seg(t, A('b04') - 0.6, A('b04')))} />
    </AbsoluteFill>
  );
};

// ════════════════ 4. L'écriture : la latte de bambou (traits qui se croisent) → 3e sens ; la marque quitte la
// poitrine, à Chu le cœur sort du corps → rouleau 2 (pendant la pause de la voix)
const Bambou: React.FC = () => {
  const t = useT();
  const A4 = A('b04'), mot = at('b04', 'motifs'), ecr = at('b04', 'ecriture'), bam = at('b04', 'bambou'), sens = at('b04', 'sens'), quitte = at('b04', 'quitte'), chuT = at('b04', 'chu'), sort = at('b04', 'sort');
  return (
    <AbsoluteFill>
      <Cam keys={[[A4 - 0.3, 960, 540, 1.02], [bam - 0.2, 960, 520, 1.15, 1.0], [sens, 960, 540, 1.05, 1.0], [sort, 1060, 470, 1.3, 1.2], [P4 - 0.6, 960, 540, 1, 0.6]]}
        punch={[bam + 0.3, sort + 1.6]} calm={[[P4 - 0.6, P4E + 0.4]]}>
        <TimeScrollStage cfg={TR2} under={<Landscape seed={11} from={A4 - 1.2} to={chuT + 1} move="still" mood="jour" faint={0.7} />}
          fromLandscape={{ seed: 11, since: chuT, mood: 'jour' }} toLandscape={{ seed: 3, until: P4E + 2, mood: 'brume' }}>
          <Draw draw={(ctx, tt, E) => {
            const latte = win(tt, mot - 0.3, P4 + 0.2, 0.6);
            if (latte <= 0) return;
            ctx.save(); ctx.globalAlpha = latte;
            const g = ctx.createLinearGradient(700, 0, 1220, 0); g.addColorStop(0, '#c9a868'); g.addColorStop(0.5, '#dcc084'); g.addColorStop(1, '#bf9c5c');
            ctx.fillStyle = g; E.roundRect(ctx, 700, 90, 520, 900, 22); ctx.fill();
            ctx.restore();
            const o = { x: 960, y: 540, size: 520 };
            // le 文 du bronze tracé sur la latte ; les traits qui se croisent (bras, jambes) s'allument en azurite ;
            // puis la marque quitte la poitrine
            const pre = seg(tt, mot + 0.2, mot + 1.2) * (1 - seg(tt, quitte + 1.0, quitte + 1.5));
            const cr = win(tt, bam, sens + 1.2, 0.4), gone = seg(tt, quitte + 0.1, quitte + 0.9);
            if (pre > 0) E.drawRealGlyph(ctx, 'wen_zhou', { ...o, opacity: latte * pre, reveal: () => seg(tt, mot + 0.2, mot + 1.6),
              color: (c: string) => rgb(c === 'marque' ? VER : c === 'bras' || c === 'jambes' ? mixc(INK, AZ, cr) : INK), alpha: (c: string) => (c === 'marque' ? 1 - gone : 1),
              glow: 22 * cr, glowColor: rgb(AZ, 0.6) });
            const nu = seg(tt, quitte + 1.0, quitte + 1.5) * (1 - seg(tt, sort - 0.3, sort + 0.1));
            if (nu > 0) E.drawRealGlyph(ctx, 'wen_chu_nu', { ...o, opacity: latte * nu, color: () => inkCss });
            const chu = seg(tt, sort - 0.1, sort + 0.5);
            if (chu > 0) {
              const slide = ease(seg(tt, sort + 0.6, sort + 2.2));
              const [mx, my] = E.realCenter('wen_chu', 'marque', o), [bx, by] = E.realCenter('wen_chu', 'bras', o);
              E.drawRealGlyph(ctx, 'wen_chu', { ...o, opacity: latte * chu, color: () => inkCss, alpha: (c: string) => (c === 'marque' ? 0 : 1) });
              ctx.save(); ctx.translate((bx - mx) * (1 - slide), (by - my) * (1 - slide));
              E.drawRealGlyph(ctx, 'wen_chu', { ...o, opacity: latte * chu, color: () => rgb(VER), alpha: (c: string) => (c === 'marque' ? 1 : 0), glow: 24, glowColor: rgb(VER, 0.6) });
              ctx.restore();
            }
          }} />
        </TimeScrollStage>
      </Cam>
      <Caption text="les motifs que l'homme trace le plus : l'écriture" a={win(t, ecr - 0.2, bam - 0.2, 0.4)} y={1000} size={44} />
      <Caption text="des traits qui se croisent : eux aussi, des 文" a={win(t, bam + 0.3, sens - 0.1, 0.4)} y={1000} size={46} />
      <Caption text="troisième sens : l'écriture" a={win(t, sens + 0.2, quitte - 0.2, 0.4)} y={1000} size={50} />
      <Caption text="la marque quitte la poitrine" a={win(t, quitte + 0.3, chuT - 0.1, 0.4)} y={1000} size={46} />
      <Caption text="royaume de Chu : le cœur 心 sort du corps et se pose à côté (上博·孔子詩論)" a={win(t, sort + 0.4, P4 - 0.2, 0.4)} y={1000} size={40} />
      <EraTag zh="楚" name="ROYAUME DE CHU" dates="Royaumes combattants · IVe s. av. J.-C." a={win(t, chuT - 0.3, P4 + 0.4, 0.5)} />
      <EraTag zh="秦" name="DYNASTIE QIN" dates="221 av. J.-C. · le petit sceau" a={tagIn(TR2, t) * (1 - seg(t, P4E + 1.5, P4E + 2.2))} />
    </AbsoluteFill>
  );
};

// ════════════════ 5. La dynastie Qin (petit sceau, torse vide), les scribes (4 traits)
const Qin: React.FC = () => {
  const t = useT();
  const A5 = A('b05'), sc = at('b04', 'sceau'), vide = at('b04', 'vide'), scr = at('b04', 'scribes'), q4 = at('b04', 'quatre'), ne = at('b04', 'ne');
  return (
    <AbsoluteFill>
      <Cam keys={[[P4E, 960, 540, 1.02], [vide - 0.3, 960, 430, 1.25, 1.0], [scr, 960, 540, 1.04, 1.0], [ne, 960, 520, 1.1, 1.2]]} punch={[vide + 0.3, q4 + 0.2, ne]}>
        <Paper />
        <Landscape seed={3} from={P4E - 0.5} to={A5 + 1} move="still" mood="brume" faint={0.5} />
        <Draw draw={(ctx, tt, E) => {
          const o = { x: 960, y: 520, size: 620 };
          const s1 = seg(tt, sc - 0.4, sc + 1.4) * (1 - seg(tt, scr, scr + 0.5));
          if (s1 > 0) E.drawRealGlyph(ctx, 'wen_xiaozhuan', { ...o, reveal: () => seg(tt, sc - 0.4, sc + 1.4), opacity: 1 - seg(tt, scr, scr + 0.5), color: () => inkCss });
          // torse vide : un cercle pointillé vermillon, vide
          const hv = win(tt, vide + 0.1, scr, 0.4);
          if (hv > 0) {
            ctx.save(); ctx.globalAlpha = hv; ctx.strokeStyle = rgb(VER, 0.85); ctx.lineWidth = 6; ctx.setLineDash([14, 12]);
            ctx.beginPath(); ctx.arc(960, 430, 70, 0, 7); ctx.stroke(); ctx.restore();
          }
          // scribes Qin puis clercs Han (fondu net), compteur de traits ; puis le 文 d'aujourd'hui
          const qn = win(tt, scr + 0.2, q4 + 0.2, 0.4);
          if (qn > 0) E.drawRealGlyph(ctx, 'wen_qin', { ...o, opacity: qn, color: manCol(seg(tt, scr + 1.6, scr + 2.4), 0) });
          const ls = win(tt, q4, ne + 0.1, 0.3);
          if (ls > 0) E.drawRealGlyph(ctx, 'wen_lishu', { ...o, opacity: ls, color: manCol(1, 0) });
          const kai = seg(tt, ne - 0.1, ne + 1.2) * (1 - seg(tt, A5 - 0.6, A5));
          if (kai > 0) {
            ctx.save(); ctx.globalAlpha = Math.min(1, kai * 3);
            E.drawStrokes(ctx, 'wen_regulier', { ...o, size: 560, progress: 4 * kai, brush: false, color: () => inkCss });
            ctx.restore();
          }
        }} />
      </Cam>
      <Caption text="petit sceau 小篆 : un corps symétrique, les jambes croisées, le torse vide" a={win(t, sc + 0.6, scr - 0.2, 0.5)} y={960} size={42} />
      <Caption text="lattes des scribes Qin (睡虎地) → écriture des clercs Han (熹平石經)" a={win(t, scr + 0.4, q4 - 0.1, 0.5)} y={960} size={40} />
      <div style={{ position: 'absolute', right: 180, top: 380, fontFamily: 'ShuimoLatin', fontWeight: 700, fontSize: 120, color: rgb(VER), opacity: win(t, q4 - 0.2, ne, 0.3) }}>{Math.max(1, Math.min(4, 1 + Math.floor((t - q4) / 0.25)))}</div>
      <Caption text="4 traits : le 文 d'aujourd'hui" a={win(t, q4 + 0.2, A5 - 0.3, 0.4)} y={960} size={48} />
    </AbsoluteFill>
  );
};
// fresque de Tiying (image Nano Banana révélée depuis la lettre, colonnes en écriture des clercs, effondrement pendant
// la pause de la voix)
const Tiying: React.FC = () => {
  const { fps } = useVideoConfig();
  const len = T_CULT + 0.6 - T_IN;
  return (
    <Sequence from={Math.round(T_IN * fps)} durationInFrames={Math.round(len * fps)}>
      <FadeIn d={0.7}><TiyingReveal son={false} times={{ tiying: at('b05', 'tiying') + 0.9 - T_IN, empereur: at('b05', 'abolit') - 1.6 - T_IN, wen: at('b05', 'wen') + 0.4 - T_IN, out: T_OUT - T_IN }} /></FadeIn>
    </Sequence>
  );
};

// ════════════════ 6. 文化 : une lettre plutôt que la force ; 化 = transformer → 4e sens → rouleau 3 (Han → aujourd'hui)
const Culture: React.FC = () => {
  const t = useT();
  const simple = at('b05', 'simple'), mot = at('b05', 'mot'), tr = at('b05', 'transformer'), hom = at('b05', 'hommes'), armes = at('b05', 'armes'), sens = at('b05', 'sens');
  return (
    <AbsoluteFill style={{ opacity: seg(t, T_CULT, T_CULT + 0.6) }}>
      <Cam keys={[[T_CULT, 960, 540, 1.02], [mot - 0.2, 960, 500, 1.1, 1.0], [tr - 0.1, 1120, 480, 1.22, 1.0], [hom, 960, 540, 1.04, 1.0], [R3 - 0.6, 960, 540, 1, 0.6]]}
        punch={[mot + 0.3, tr + 0.2, sens + 0.2]} calm={[[R3 - 0.6, R3E + 0.4]]}>
        <TimeScrollStage cfg={TR3} under={<><Paper /><Landscape seed={22} from={T_CULT - 0.5} to={sens + 1} move="rise" mood="aube" faint={0.6} /></>}
          fromLandscape={{ seed: 22, since: sens - 1, mood: 'aube' }} toLandscape={{ seed: 30, until: A('b06') + 2, mood: 'aube' }}>
          <Draw draw={(ctx, tt, E) => {
            // une lettre (文, vermillon) plutôt que la force (武, gris)
            const lw = win(tt, simple - 0.4, mot + 0.1, 0.5);
            if (lw > 0) {
              E.text(ctx, '文', 640, 470, { font: 'Kai', size: 300, color: rgb(VER), alpha: lw, glow: 18, glowColor: rgb(VER, 0.5) });
              E.text(ctx, '武', 1280, 470, { font: 'Kai', size: 300, color: rgb(GREY), alpha: lw * 0.85 });
              E.text(ctx, 'une lettre', 640, 740, { font: 'Cormorant', size: 70, weight: 700, color: rgb(VER), alpha: lw });
              E.text(ctx, 'la force', 1280, 740, { font: 'Cormorant', size: 70, weight: 700, color: '#6b5d50', alpha: lw });
            }
            // 文化 : 文 (vermillon) + 化 « transformer » (malachite)
            const wh = win(tt, mot - 0.3, R3 + 0.2, 0.5);
            if (wh > 0) {
              const hua = seg(tt, tr - 0.1, tr + 0.5);
              E.text(ctx, '文', 800, 470, { font: 'Kai', size: 320, color: rgb(VER), alpha: wh });
              E.text(ctx, '化', 1120, 470, { font: 'Kai', size: 320, color: rgb(mixc(INK, MAL, hua)), alpha: wh, glow: 26 * hua * (1 - seg(tt, hom, hom + 1)), glowColor: rgb(MAL, 0.6) });
              E.text(ctx, "l'écriture · les rites · les manières", 960, 760, { font: 'Cormorant', size: 62, weight: 700, color: inkCss, alpha: wh * seg(tt, hom + 0.6, hom + 1.4) });
              const ar = win(tt, armes - 0.2, sens + 0.4, 0.4);
              if (ar > 0) {
                E.text(ctx, '武', 1560, 470, { font: 'Kai', size: 170, color: rgb(GREY), alpha: wh * ar * 0.9 });
                ctx.save(); ctx.globalAlpha = wh * ar; ctx.strokeStyle = rgb(VER, 0.9); ctx.lineWidth = 9; ctx.lineCap = 'round';
                const k = seg(tt, armes + 0.4, armes + 0.9);
                ctx.beginPath(); ctx.moveTo(1480, 390); ctx.lineTo(1480 + 160 * k, 390 + 160 * k); ctx.stroke(); ctx.restore();
              }
            }
          }} />
        </TimeScrollStage>
      </Cam>
      <Caption text="une simple lettre… plutôt que la force" a={win(t, simple + 0.2, mot - 0.3, 0.5)} y={920} size={46} />
      <Caption text="文化 · wénhuà : un mot de la dynastie Han (劉向, 說苑, Ier s. av. J.-C.)" a={win(t, mot + 0.3, tr - 0.2, 0.5)} y={920} size={42} />
      <Caption text="化 · huà · transformer" a={win(t, tr, hom + 0.4, 0.4)} y={920} size={54} />
      <Caption text="…plutôt que par les armes" a={win(t, armes, sens - 0.1, 0.4)} y={920} size={48} />
      <Caption text="quatrième sens : la culture" a={win(t, sens + 0.2, R3 - 0.2, 0.4)} y={920} size={54} />
      <EraTag zh="漢" name="DYNASTIE HAN" dates="Ier s. av. J.-C." a={win(t, T_CULT, R3 + 0.4, 0.5)} />
      <EraTag zh="今" name="AUJOURD'HUI" dates="2026" a={tagIn(TR3, t) * (1 - seg(t, R3E + 1.5, R3E + 2.2))} />
    </AbsoluteFill>
  );
};

// ════════════════ 7. Scène récapitulative (bandeau de toutes les formes), les quatre sens, 中文 / 文化, maxime, passerelle 美
const FORMS: [string, string, string][] = [['real:wen_jiaguwen', '甲骨文', 'Shang · os'], ['real:wen_zhou', '金文', 'Zhou · bronze'], ['real:wen_chu', '楚簡', 'Chu · bambou'], ['real:wen_xiaozhuan', '小篆', 'Qin · sceau'], ['real:wen_lishu', '隸書', 'Han · clercs'], ['kai:wen_regulier', '楷書', "aujourd'hui"]];
const HAS_MARK = [true, true, true, false, false, false];
const drawBand = (ctx: CanvasRenderingContext2D, E: any, tt: number, a: number) => {
  const y = 380, x0 = 410, dx = 220, sz = 210;
  const fo = at('b06', 'formes'), te = at('b06', 'tete'), br = at('b06', 'bras'), ja = at('b06', 'jambes'), mq = at('b06', 'marque'), rien = at('b06', 'rien'), nait = at('b06', 'naissance');
  // phase : la composante citée clignote trois fois dans toutes les formes, le reste au gris ; puis tout en couleur
  const hi = tt >= nait ? '' : tt >= mq ? 'marque' : tt >= ja ? 'jambes' : tt >= br ? 'bras' : tt >= te ? 'tete' : '';
  const t0 = hi === 'tete' ? te : hi === 'bras' ? br : hi === 'jambes' ? ja : hi === 'marque' ? mq : nait;
  const k = hi ? seg(tt, t0 - 0.05, t0 + 0.3) : 1 - seg(tt, nait - 0.1, nait + 0.5);
  const blink = hi ? 0.5 + 0.5 * Math.cos(Math.min(3, (tt - t0) / 0.32) * Math.PI * 2) : 0;
  const color = (c: string) => rgb(!hi || c === hi ? P[c] ?? INK : mixc(P[c] ?? INK, GREY, k));
  const alpha = (c: string) => (!hi || c === hi ? 1 : 1 - 0.55 * k);
  FORMS.forEach(([key, zh, fr], i) => {
    const appear = seg(tt, fo - 0.6 + i * 0.12, fo - 0.2 + i * 0.12) * a;
    if (appear <= 0) return;
    const x = x0 + i * dx;
    const glow = hi ? 26 * blink * k : 0, gc = P[hi] ?? INK;
    ctx.save(); ctx.globalAlpha = appear;
    if (key.startsWith('real:')) E.drawRealGlyph(ctx, key.slice(5), { x, y, size: sz, color, alpha, glow: hi === 'marque' && !HAS_MARK[i] ? 0 : glow, glowColor: rgb(gc, 0.8) });
    else E.drawStrokes(ctx, key.slice(4), { x, y, size: sz * 0.9, brush: false, color, alpha, glow, glowColor: rgb(gc, 0.8) });
    E.text(ctx, zh, x, y + 160, { font: 'Kai', size: 56, color: inkCss, alpha: appear });
    E.text(ctx, fr, x, y + 218, { font: 'Cormorant', size: 38, weight: 700, color: '#5b4f44', alpha: appear });
    ctx.restore();
    // « puis plus rien » : un halo pointillé vide sur la poitrine des formes sans marque
    const empty = win(tt, rien - 0.1, nait, 0.3) * appear;
    if (empty > 0 && !HAS_MARK[i]) {
      ctx.save(); ctx.globalAlpha = empty; ctx.strokeStyle = rgb(VER, 0.9); ctx.lineWidth = 5; ctx.setLineDash([10, 9]);
      ctx.beginPath(); ctx.arc(x, y - 18, 34, 0, 7); ctx.stroke(); ctx.restore();
    }
  });
  // rubans : où vit chaque composante, à travers les six formes (l'homme partout, la marque sur les trois premières)
  const rows: [string, string, number][] = [['homme', 'l\'homme', 5], ['marque', 'la marque', 2]];
  const grow = seg(tt, te - 0.6, te + 0.6);
  rows.forEach(([c, lab, last], j) => {
    const yy = 790 + j * 80, xa = x0 - 60, xb = x0 + last * dx + 60;
    const isHi = hi === c || (c === 'homme' && ['tete', 'bras', 'jambes'].includes(hi));
    const on = !hi || isHi;
    const col = on ? P[c] : mixc(P[c], GREY, k);
    const al = a * grow * (on ? 1 : 1 - 0.5 * k) * (isHi ? 0.75 + 0.25 * blink : 1);
    ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = rgb(col); ctx.lineWidth = isHi ? 22 : 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xa + (xb - xa) * grow, yy); ctx.stroke(); ctx.restore();
    E.text(ctx, lab, xa - 24, yy, { font: 'Cormorant', size: 52, weight: 700, align: 'right', color: rgb(col), alpha: al });
  });
};

const Today: React.FC = () => {
  const t = useT();
  const A6 = A('b06'), fo = at('b06', 'formes'), nait = at('b06', 'naissance'), chi = at('b06', 'chinois'), cul = at('b06', 'culture');
  const A7 = A('b07'), autre = at('b07', 'autre'), homme = at('b07', 'homme');
  return (
    <AbsoluteFill>
      <Cam keys={[[A6 - 0.3, 960, 540, 1.02], [A6 + 0.2, 960, 500, 1.12, 2.0], [fo - 0.9, 960, 540, 1.02, 0.9], [nait + 0.4, 960, 500, 1.1, 1.2], [A7 - 0.5, 960, 540, 1.02, 1.0], [autre, 1050, 480, 1.12, 1.2], [homme - 0.2, 1050, 600, 1.25, 0.8]]}
        punch={[at('b06', 'tete'), at('b06', 'bras'), at('b06', 'jambes'), at('b06', 'marque'), nait, homme + 0.3]}>
        <Paper />
        <Landscape seed={30} from={A6 - 1.5} to={END + 0.5} move="pan" mood="aube" faint={0.6} />
        <Draw draw={(ctx, tt, E) => {
          const syn = win(tt, fo - 0.8, nait + 0.8, 0.6);
          if (syn > 0) drawBand(ctx, E, tt, syn);
          // 文 en 4 traits (avant et après le bandeau)
          const main = (1 - syn) * (1 - seg(tt, A7 + 0.6, A7 + 1.2));
          if (main > 0) {
            ctx.save(); ctx.globalAlpha = main;
            E.drawStrokes(ctx, 'wen_regulier', { x: 960, y: 480, size: 520, progress: 4 * seg(tt, A6 + 0.2, fo - 1.0), brush: false, color: (c: string) => (tt > nait ? rgb(mixc(INK, P[c], win(tt, nait, chi, 0.5))) : inkCss) });
            ctx.restore();
          }
          // passerelle : 美 se trace à l'encre ; seul l'homme (en bas) s'allume en azurite, le haut reste dans l'ombre
          const m = seg(tt, autre - 0.3, autre + 0.9);
          if (m > 0) {
            const h = seg(tt, homme - 0.1, homme + 0.6);
            ctx.save(); ctx.globalAlpha = m;
            E.drawStrokes(ctx, 'wen_mei', { x: 1050, y: 520, size: 560, progress: 9 * seg(tt, autre - 0.3, autre + 2.0), brush: false,
              color: (c: string) => rgb(c === 'homme' ? mixc(INK, AZ, h) : mixc(INK, GREY, 0.55 * h)), glow: 26 * h, glowColor: rgb(AZ, 0.6) });
            ctx.restore();
          }
        }} />
      </Cam>
      <Caption text="un seul dessin, dans toutes les formes : un homme de face" a={win(t, fo, at('b06', 'tete') - 0.1, 0.4)} y={1010} size={40} />
      <Caption text="wén · la marque, l'ornement, l'écriture, la culture" a={win(t, nait + 0.6, chi - 0.2, 0.4)} y={880} size={50} />
      <div style={{ position: 'absolute', width: '100%', top: 820, display: 'flex', justifyContent: 'center', gap: 180, fontFamily: 'ShuimoKai', fontSize: 80, color: inkCss }}>
        <span style={{ opacity: win(t, chi - 0.6, A7 - 0.3) }}>中文<div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, textAlign: 'center' }}>le chinois</div></span>
        <span style={{ opacity: win(t, cul - 0.6, A7 - 0.3) }}>文化<div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, textAlign: 'center' }}>la culture</div></span>
      </div>
      {/* fiche : pinyin, nombre de traits */}
      <div style={{ position: 'absolute', left: 300, top: 300, opacity: win(t, A7 - 0.2, autre - 0.2, 0.6) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 300, color: inkCss, lineHeight: 1 }}>文</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 96, fontWeight: 600, color: inkCss }}>wén</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: rgb(VER) }}>4 traits</div>
      </div>
      <Caption text="Avant d'écrire sur l'os, le bronze et le papier, les hommes se sont écrits sur la peau." a={win(t, A7 + 0.1, autre - 0.3, 0.6)} y={900} size={46} />
      <Caption text="lui aussi : un homme, debout, de face" a={win(t, homme + 0.3, END + 0.1, 0.4)} y={920} size={48} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => (
  <AbsoluteFill style={{ background: '#1d1915', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
    <div style={{ width: 120, height: 120, background: rgb(VER, 0.95), borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 52, color: '#f6eee0', writingMode: 'vertical-rl' }}>墨道</div>
    <div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, letterSpacing: 8, color: '#efe6d6' }}>LA VOIE DE L'ENCRE</div>
    <div style={{ fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 34, color: '#b9ab98' }}>prochain caractère : 美</div>
  </AbsoluteFill>
);

const Win: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const t = useT();
  return t >= from && t < to ? <>{children}</> : null;
};

// bruitages discrets (ElevenLabs text-to-sound, episodes/wen/audio/sfx_*.wav) : liste dans episode.json « bruitages »,
// résolue en temps absolus par reperes.py (_ligne.bruitages) — la même liste sert au mixage de bande_son.py
const SFX = (L.bruitages ?? []) as [string, number, number][];

export const WenV1: React.FC = () => {
  const ready = useSetup();
  const { fps } = useVideoConfig();
  const t = useT();
  const clips: Clip[] = ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07'];
  // voix : un clip avec une pause est joué en deux morceaux (avant / après la coupe)
  const voice = (k: Clip) => {
    const c = L.clips[k], src = staticFile(`episodes/wen/voix/${k}.wav`);
    if (!c.pause) return <Sequence key={k} from={Math.round(c.debut * fps)}><Audio src={src} /></Sequence>;
    return (
      <React.Fragment key={k}>
        <Sequence from={Math.round(c.debut * fps)}><Audio src={src} endAt={Math.round(c.pause.coupe * fps)} /></Sequence>
        <Sequence from={Math.round((c.debut + c.pause.coupe + c.pause.duree) * fps)}><Audio src={src} startFrom={Math.round(c.pause.coupe * fps)} /></Sequence>
      </React.Fragment>
    );
  };
  return (
    <AbsoluteFill style={{ background: '#f3eee4' }}>
      {ready && <>
        <Win from={0} to={A('b02') - 0.01}><Opening /></Win>
        <Win from={A('b02') - 0.01} to={R1E + 0.05}><Shang /></Win>
        <Win from={R1E + 0.05} to={A('b04') - 0.5}><Zhou /></Win>
        <Win from={A('b04') - 0.5} to={P4E + 0.05}><Bambou /></Win>
        <Win from={P4E + 0.05} to={T_IN + 1.2}><Qin /></Win>
        <Tiying />
        <EraTag zh="漢" name="DYNASTIE HAN" dates="167 av. J.-C. · l'empereur Wen" a={seg(t, T_IN + 0.4, T_IN + 1.0) * (1 - seg(t, A('b05') + 3.5, A('b05') + 4.1))} />
        <Win from={T_CULT} to={R3E + 0.05}><Culture /></Win>
        <Win from={R3E + 0.05} to={END}><Today /></Win>
        <Win from={END} to={WEN_SECONDS + 1}><EndCard /></Win>
        <Senses />
      </>}
      {SFX.map(([n, tt, v], i) => (
        <Sequence key={`sfx${i}`} from={Math.round(tt * fps)}><Audio src={staticFile(`episodes/wen/audio/sfx_${n}.wav`)} volume={v} /></Sequence>
      ))}
      {clips.map(voice)}
      <Audio src={staticFile('episodes/wen/audio/musique.wav')} volume={0.55} />
    </AbsoluteFill>
  );
};
