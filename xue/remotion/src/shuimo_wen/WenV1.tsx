// 文 (wén), version tout shuimo — episodes/wen/PROPOSITION.md (v4).
// Question : comment un tatouage est-il devenu le mot « culture » ? Voyage : la dynastie Shang (os, la marque sur la
// poitrine) → rouleau 1 → la dynastie Zhou (Taibo, carte et clip ; le bronze, la marque devient un cœur) → les
// Royaumes combattants (Livre des mutations ; bambou, le cœur sort du corps) → rouleau 2 → la dynastie Qin (petit
// sceau, torse vide) et les scribes (4 traits) → la dynastie Han (fresque de Tiying révélée, effondrement) → 紋 et
// les soldats tatoués de la dynastie Song (clip) → rouleau 3 → scène récapitulative (tête, bras, jambes, marque dans
// toutes les formes) → maxime et passerelle 美. Ligne de temps lue dans les repères (episodes/wen/voix/reperes.json,
// « _ligne »), jamais recalculée ici. Pigments : l'homme en azurite, la marque en vermillon, le fil de 紋 en malachite.
// En attente : clips Seedance A (Taibo) et B (soldats) — clips d'exemple en place.
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

type Clip = 'b01' | 'b02' | 'b03' | 'b04' | 'b05' | 'b06' | 'b07' | 'b08';
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
export const WEN_SECONDS = Math.ceil(L.total * 10) / 10;
const END = L.fin;

// époques du 文 (sceaux de la frise des rouleaux)
const ERAS: Era[] = [
  { zh: '商', date: '−1200' }, { zh: '周', date: '−1046' }, { zh: '戰', date: '−300' }, { zh: '秦', date: '−221' },
  { zh: '漢', date: '−167' }, { zh: '宋', date: '1050' }, { zh: '今', date: '2026' },
];
const [R1, R2, R3] = L.rouleaux.map((r) => r.debut);
const TR1: TimeScrollConfig = { at: R1, duration: L.rouleaux[0].duree, eras: ERAS, from: 0, to: 1, years: [-1200, -1046] };
const TR2: TimeScrollConfig = { at: R2, duration: L.rouleaux[1].duree, eras: ERAS, from: 2, to: 3, years: [-300, -221] };
const TR3: TimeScrollConfig = { at: R3, duration: L.rouleaux[2].duree, eras: ERAS, from: 5, to: 6, years: [1053, 2026] };
const R1E = R1 + TR1.duration!, R2E = R2 + TR2.duration!, R3E = R3 + TR3.duration!;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const inkCss = rgb(INK);
// pigments constants : l'homme (tête, bras, jambes) en azurite, la marque en vermillon, la soie de 紋 en malachite,
// la coiffe de 美 en gomme-gutte
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

// clips 3D plein cadre (clips d'exemple en attendant les clips Seedance A et B) : entrée par les nuages, ou à travers
// le caractère quand il est à l'écran juste avant ; sortie par les coups de pinceau
const CLIPS = { taibo: 'exemples_videos/exemple_plan_fixe.mp4', soldats: 'exemples_videos/exemple_transformation.mp4' };
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

// ════════════════ 2. La dynastie Shang : l'os, la marque (croix, V, nœud), les morts → rouleau 1 (Shang → Zhou)
const Shang: React.FC = () => {
  const t = useT();
  const A2 = A('b02'), os = at('b02', 'os'), bras = at('b02', 'bras'), mq = at('b02', 'marque'), cx = at('b02', 'croix'), shi = at('b02', 'shirakawa'), morts = at('b02', 'morts'), rois = at('b02', 'rois'), exc = at('b02', 'excuse');
  return (
    <AbsoluteFill>
      <Cam keys={[[A2, 960, 540, 1.02], [os + 0.6, 960, 520, 1.06, 1.6], [mq - 0.2, 960, 450, 1.25, 1.0], [shi - 0.4, 960, 540, 1.02, 1.0], [exc - 0.6, 960, 520, 1.08, 1.0], [R1 - 0.6, 960, 540, 1, 0.6]]}
        punch={[os + 1.2, mq + 0.2]} calm={[[R1 - 0.6, R1E + 0.4]]}>
        <TimeScrollStage cfg={TR1} under={<Landscape seed={14} from={A2 - 1.5} to={A2 + 16} move="push" mood="aube" />}
          fromLandscape={{ seed: 5, since: shi - 1 }} toLandscape={{ seed: 9, until: A('b03') + 2 }}>
          <Draw draw={(ctx, tt, E) => {
            const plate = win(tt, os - 0.4, R1 + 0.2, 0.7);
            stamp(ctx, E, plate * (1 - seg(tt, shi, shi + 1.2)), 960, 520, 520, 760, 170);
            // lavis sombre : « on la peignait sur la poitrine des morts »
            const dark = win(tt, morts - 0.4, rois + 0.6, 0.6);
            if (dark > 0) { ctx.save(); ctx.globalAlpha = 0.35 * dark; ctx.fillStyle = '#1d1915'; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }
            const reveal = seg(tt, os + 0.3, os + 1.5);
            if (reveal <= 0 || tt > R1E + 0.1) return;
            const dry = seg(tt, shi - 0.4, shi + 0.8); // le signe passe du blanc (estampage) à l'encre
            const mark = seg(tt, mq, mq + 0.6);
            const man = win(tt, bras, mq, 0.4);
            const col = (c: string) => rgb(c === 'marque' ? mixc(mixc(PAPERWHITE, INK, dry), VER, mark) : mixc(mixc(PAPERWHITE, INK, dry), AZ, man));
            // croix, V, nœud : la marque change de forme (fondu net), puis revient au V
            const k = tt < cx ? 1 : tt < cx + 0.8 ? 0 : tt < cx + 1.7 ? 1 : tt < cx + 2.8 ? 2 : 1;
            const key = ['wen_shang_croix', 'wen_jiaguwen', 'wen_shang_noeud'][k];
            const mk = morphK(TR1, tt), p = cursorPose(TR1, tt), q = arrivePose(TR1, tt);
            if (mk < 1) E.drawRealGlyph(ctx, key, { x: p.x, y: p.y, size: 640 * p.s, reveal: () => reveal, opacity: 1 - mk, color: col, glow: 22 * mark * (1 - seg(tt, shi, shi + 1)), glowColor: rgb(VER, 0.6) });
            if (mk > 0) E.drawRealGlyph(ctx, 'wen_zhou', { x: q.x, y: q.y, size: 640 * q.s, opacity: mk * (1 - seg(tt, R1E - 0.3, R1E + 0.1)), color: manCol(0, 1) });
          }} />
        </TimeScrollStage>
      </Cam>
      <Label x={1290} y={300} zh="大" text="bras ouverts" color={AZ} a={win(t, bras + 0.2, mq - 0.2, 0.4)} />
      <Label x={1290} y={480} zh="×" text="une marque" color={VER} a={win(t, mq + 0.2, shi - 0.3, 0.4)} />
      <Caption text={['une croix', 'un V', 'un nœud, parfois un cœur'][t < cx + 0.8 ? 0 : t < cx + 1.7 ? 1 : 2]} a={win(t, cx, cx + 3.0, 0.3)} y={900} size={50} />
      <Caption text="hypothèse de Shirakawa Shizuka 白川静 : une marque peinte sur les morts" a={win(t, shi + 0.2, rois - 0.2, 0.5)} y={960} size={40} />
      <Caption text="文武丁 · un roi Shang défunt, honoré du nom de 文" a={win(t, rois + 0.2, exc - 0.3, 0.5)} y={960} size={42} />
      <EraTag zh="商" name="DYNASTIE SHANG" dates="Anyang · v. 1200 av. J.-C." a={win(t, A2 + 0.3, R1 + 0.4, 0.8)} />
      <EraTag zh="周" name="DYNASTIE ZHOU" dates="XIe siècle av. J.-C." a={tagIn(TR1, t) * (1 - seg(t, R1E + 1.5, R1E + 2.2))} />
    </AbsoluteFill>
  );
};

// ════════════════ 3. La dynastie Zhou : la fuite de Taibo (carte + clip A), le roi Wen, le bronze (le cœur)
const ZHOUYUAN = [107.8, 34.45], WU = [120.3, 31.55];
const FUITE = [[107.8, 34.45], [109.8, 33.4], [112.5, 32.2], [115.6, 31.4], [118.2, 31.6], [120.3, 31.55]];
const Zhou: React.FC = () => {
  const t = useT();
  const A3 = A('b03'), duc = at('b03', 'duc'), fuite = at('b03', 'fuite'), tat = at('b03', 'tatouer'), roi = at('b03', 'roi'), br = at('b03', 'bronze'), coeur = at('b03', 'coeur'), grand = at('b03', 'grand');
  const mapTo = tat - 0.3;
  return (
    <AbsoluteFill>
      <Cam keys={[[A3 - 0.3, 960, 540, 1.02], [roi - 0.2, 960, 520, 1.1, 1.0], [br + 0.6, 960, 520, 1.06, 1.2], [coeur - 0.2, 960, 470, 1.25, 1.0], [grand - 0.3, 960, 540, 1.02, 1.0]]} punch={[roi + 1.5, coeur + 0.3]}>
        <Paper />
        <Landscape seed={9} from={A3 - 1.5} to={A('b04') + 0.6} move="pan" mood="jour" faint={0.6} />
        <Draw draw={(ctx, tt, E) => {
          // 文王 calligraphié sur « le roi 文 »
          const wa = win(tt, roi - 0.2, br + 0.2, 0.5);
          if (wa > 0) {
            E.text(ctx, '文', 960, 470, { font: 'Kai', size: 330, color: rgb(mixc(INK, VER, seg(tt, roi + 1.6, roi + 2.2))), alpha: wa, glow: 20 * seg(tt, roi + 1.6, roi + 2.2), glowColor: rgb(VER, 0.5) });
            E.text(ctx, '王', 960, 790, { font: 'Kai', size: 200, color: inkCss, alpha: wa });
          }
          // le bronze : le corps s'épaissit, la marque devient un cœur ; puis os et bronze côte à côte
          const bz = win(tt, br - 0.2, A('b04') + 0.3, 0.6);
          if (bz <= 0) return;
          const side = seg(tt, grand - 0.2, grand + 0.8);
          stamp(ctx, E, bz, 960 + 260 * side, 520, 560, 760, 60, true);
          const mark = seg(tt, coeur, coeur + 0.6);
          E.drawRealGlyph(ctx, 'wen_zhou', { x: 960 + 260 * side, y: 520, size: 660, opacity: bz * seg(tt, br + 0.2, br + 1.2), color: (c: string) => rgb(c === 'marque' ? mixc([214, 200, 170], VER, mark) : [214, 200, 170]), glow: 30 * mark, glowColor: rgb(VER, 0.6) });
          if (side > 0) E.drawRealGlyph(ctx, 'wen_jiaguwen', { x: 960 - 520 * side, y: 520, size: 440, opacity: bz * side, color: manCol(0, 1) });
        }} />
      </Cam>
      <MapPanel from={A3 - 0.4} to={mapTo} draw={(ctx, u, E, tt) => {
        const z = ease(seg(tt, duc, fuite + 1.5)), v = { lon: 113.8 + 0.4 * z, lat: 33.0 - 0.2 * z, k: 62 + 18 * z };
        const vb = { lon: 113.8, lat: 33.0, k: 60 };
        E.mapLayer(ctx, v, vb, 90, 'wen_taibo', (c: CanvasRenderingContext2D, w: any) => E.drawMap(c, 0, w, { paper: true, rivers: 1, deco: false }));
        E.mapDeco(ctx, { paper: true });
        E.marker(ctx, tt, v, ZHOUYUAN, 'Zhou', 'vallée de la Wei', seg(tt, A3 + 0.6, A3 + 1.2), '#c0392b', -1);
        // la fuite vers le sud-est, tracée au pinceau (pointillé), jusqu'au bas Yangzi (futur royaume de Wu)
        const k = seg(tt, fuite - 0.2, mapTo - 0.6) * (FUITE.length - 1);
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
      <ClipShot src="taibo" from={tat - 0.6} len={roi - tat + 0.2} entry="nuages" inDur={2.6} />
      <Caption text="Taibo 太伯, l'aîné, s'enfuit vers le sud (Shiji, 吳太伯世家)" a={win(t, at('b03', 'probleme') + 0.2, mapTo - 0.2, 0.5)} y={980} size={40} />
      <Caption text="文王 · le roi Wen, neveu de Taibo" a={win(t, roi + 0.4, br - 0.2, 0.5)} y={980} size={48} />
      <Caption text="bronze Zhou (師害簋) : un vrai cœur sur la poitrine" a={win(t, coeur + 0.3, grand - 0.2, 0.5)} y={980} size={44} />
      <Caption text="os (Shang) → bronze (Zhou) : la marque grandit" a={win(t, grand + 0.4, A('b04') - 0.2, 0.5)} y={980} size={46} />
      <EraTag zh="周" name="DYNASTIE ZHOU" dates="XIe siècle av. J.-C." a={seg(t, A3 - 0.6, A3 + 0.2) * (1 - seg(t, A('b04') - 0.6, A('b04')))} />
    </AbsoluteFill>
  );
};

// ════════════════ 4. Les Royaumes combattants : le Livre des mutations, le bambou (le cœur sort du corps) → rouleau 2
const Bambou: React.FC = () => {
  const t = useT();
  const A4 = A('b04'), mut = at('b04', 'mutations'), ciel = at('b04', 'ciel'), hom = at('b04', 'hommes'), eto = at('b04', 'etoiles'), rites = at('b04', 'rites'), peau = at('b04', 'peau'), bam = at('b04', 'bambou'), disp = at('b04', 'disparait'), sort = at('b04', 'sort');
  return (
    <AbsoluteFill>
      <Cam keys={[[A4 - 0.3, 960, 540, 1.02], [ciel - 0.3, 960, 420, 1.12, 1.6], [rites, 960, 560, 1.05, 1.2], [bam - 0.2, 960, 520, 1.15, 1.0], [sort, 1060, 470, 1.3, 1.2], [R2 - 0.6, 960, 540, 1, 0.6]]}
        punch={[sort + 1.6]} calm={[[R2 - 0.6, R2E + 0.4]]}>
        <TimeScrollStage cfg={TR2} defaultCursor under={<Landscape seed={11} from={A4 - 1.2} to={A4 + 26} move="still" mood="nuit" />}
          fromLandscape={{ seed: 11, since: peau, mood: 'nuit' }} toLandscape={{ seed: 3, until: A('b05') + 2, mood: 'brume' }}>
          <Draw draw={(ctx, tt, E) => {
            // les 文 du ciel : des étoiles qui se relient en motifs
            const sky = win(tt, ciel - 0.4, peau, 0.6);
            if (sky > 0) {
              const ST = [[520, 220], [610, 160], [700, 250], [820, 190], [1080, 170], [1180, 240], [1290, 160], [1400, 230], [760, 330], [1150, 330]];
              const link = seg(tt, eto - 0.2, eto + 1.6);
              ctx.save(); ctx.globalAlpha = sky;
              ctx.strokeStyle = 'rgba(240,233,219,0.7)'; ctx.lineWidth = 2.5;
              ctx.beginPath(); ST.slice(0, 4).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.globalAlpha = sky * link; ctx.stroke();
              ctx.beginPath(); ST.slice(4, 8).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
              ctx.globalAlpha = sky;
              for (const [x, y] of ST) { ctx.fillStyle = 'rgba(250,244,230,0.95)'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
              ctx.restore();
            }
            // la latte de bambou : le signe Chu, la marque sort du corps et se pose à côté ; puis sans marque
            const latte = win(tt, bam - 0.3, R2 + 0.2, 0.6);
            if (latte <= 0) return;
            ctx.save(); ctx.globalAlpha = latte;
            const g = ctx.createLinearGradient(700, 0, 1220, 0); g.addColorStop(0, '#c9a868'); g.addColorStop(0.5, '#dcc084'); g.addColorStop(1, '#bf9c5c');
            ctx.fillStyle = g; E.roundRect(ctx, 700, 90, 520, 900, 22); ctx.fill();
            ctx.restore();
            const o = { x: 960, y: 540, size: 520 };
            const nu = seg(tt, disp - 0.2, disp + 0.4) * (1 - seg(tt, sort - 0.3, sort + 0.1));
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
            const pre = seg(tt, bam + 0.2, bam + 0.8) * (1 - seg(tt, disp - 0.4, disp));
            if (pre > 0) E.drawRealGlyph(ctx, 'wen_zhou', { ...o, opacity: latte * pre, color: manCol(0, 1) });
          }} />
        </TimeScrollStage>
      </Cam>
      {/* citation sur deux lattes, traduite */}
      <div style={{ position: 'absolute', left: 1460, top: 140, display: 'flex', gap: 22, opacity: win(t, mut + 0.4, peau - 0.2, 0.6) }}>
        {['觀乎人文以化成天下', '觀乎天文以察時變'].map((l, i) => (
          <div key={i} style={{ writingMode: 'vertical-rl', background: 'linear-gradient(90deg,#c9a868,#dcc084,#bf9c5c)', borderRadius: 10, padding: '18px 10px', fontFamily: 'ShuimoKai', fontSize: 52, color: '#2a231d', letterSpacing: 4 }}>{l}</div>
        ))}
      </div>
      <Caption text="Livre des mutations 周易 (commentaire 彖傳) · Royaumes combattants" a={win(t, mut + 0.2, ciel - 0.2, 0.5)} y={980} size={38} />
      <Caption text="« Observez les 文 du ciel pour suivre les saisons… »" a={win(t, ciel - 0.4, hom - 0.3, 0.4)} y={980} size={44} />
      <Caption text="« …observez les 文 des hommes pour transformer le monde »" a={win(t, hom - 0.3, eto - 0.2, 0.4)} y={980} size={44} />
      <Caption text="les 文 des hommes : les rites, les textes, les manières" a={win(t, rites - 0.2, peau + 1.4, 0.4)} y={980} size={44} />
      <Caption text="lattes de bambou de Chu : souvent, plus de marque…" a={win(t, disp + 0.2, sort - 0.2, 0.4)} y={980} size={44} />
      <Caption text="…parfois, le cœur 心 se pose à côté du corps (上博·孔子詩論)" a={win(t, sort + 0.6, R2 - 0.2, 0.4)} y={980} size={42} />
      <EraTag zh="戰" name="ROYAUMES COMBATTANTS" dates="Ve–IIIe siècle av. J.-C." a={seg(t, A4 - 0.3, A4 + 0.4) * (1 - seg(t, R2, R2 + 0.4))} />
      <EraTag zh="秦" name="DYNASTIE QIN" dates="221 av. J.-C." a={tagIn(TR2, t) * (1 - seg(t, at('b05', 'scribes'), at('b05', 'scribes') + 0.5))} />
    </AbsoluteFill>
  );
};

// ════════════════ 5. La dynastie Qin (petit sceau, torse vide), les scribes (4 traits), puis la fresque de Tiying
const QinHan: React.FC = () => {
  const t = useT();
  const A5 = A('b05'), sc = at('b05', 'sceau'), vide = at('b05', 'vide'), scr = at('b05', 'scribes'), q4 = at('b05', 'quatre'), ne = at('b05', 'ne'), han = at('b05', 'han');
  return (
    <AbsoluteFill>
      <Cam keys={[[A5 - 0.3, 960, 540, 1.02], [vide - 0.3, 960, 430, 1.25, 1.0], [scr, 960, 540, 1.04, 1.0], [ne, 960, 520, 1.1, 1.2]]} punch={[vide + 0.3, q4 + 0.2, ne]}>
        <Paper />
        <Landscape seed={3} from={A5 - 1.5} to={han + 1} move="still" mood="brume" faint={0.5} />
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
          if (qn > 0) E.drawRealGlyph(ctx, 'wen_qin', { ...o, opacity: qn, color: manCol(seg(tt, scr + 2.4, scr + 3.2), 0) });
          const ls = win(tt, q4, ne + 0.1, 0.3);
          if (ls > 0) E.drawRealGlyph(ctx, 'wen_lishu', { ...o, opacity: ls, color: manCol(1, 0) });
          const kai = seg(tt, ne - 0.1, ne + 1.6) * (1 - seg(tt, han - 0.5, han));
          if (kai > 0) {
            ctx.save(); ctx.globalAlpha = Math.min(1, kai * 3) * (1 - seg(tt, han - 0.5, han));
            E.drawStrokes(ctx, 'wen_regulier', { ...o, size: 560, progress: 4 * kai, brush: false, color: () => inkCss });
            ctx.restore();
          }
        }} />
      </Cam>
      <Caption text="petit sceau 小篆 (Shuowen) : le corps s'allonge, le torse est vide" a={win(t, sc + 0.6, scr - 0.2, 0.5)} y={960} size={42} />
      <Caption text="lattes des scribes Qin (睡虎地) → écriture des clercs Han (熹平石經)" a={win(t, scr + 0.4, q4 - 0.1, 0.5)} y={960} size={40} />
      <div style={{ position: 'absolute', right: 180, top: 380, fontFamily: 'ShuimoLatin', fontWeight: 700, fontSize: 120, color: rgb(VER), opacity: win(t, q4 - 0.2, ne, 0.3) }}>{Math.max(1, Math.min(4, 1 + Math.floor((t - q4) / 0.25)))}</div>
      <Caption text="4 traits : le 文 d'aujourd'hui" a={win(t, q4 + 0.2, han - 0.3, 0.4)} y={960} size={48} />
      <EraTag zh="秦" name="DYNASTIE QIN" dates="221 av. J.-C. · le petit sceau" a={seg(t, A5 - 0.5, A5) * (1 - seg(t, scr, scr + 0.5))} />
      <EraTag zh="漢" name="DYNASTIE HAN" dates="167 av. J.-C. · l'empereur Wen" a={seg(t, scr + 0.5, scr + 1.1) * (1 - seg(t, han + 1, han + 1.6))} />
    </AbsoluteFill>
  );
};
// fresque de Tiying (image Nano Banana révélée depuis la lettre, colonnes en écriture des clercs, effondrement)
const T_IN = at('b05', 'han') - 0.4;
const T_OUT = at('b05', 'wen') + 2.6; // = l'effondrement (bruitage de la liste, même repère)
const Tiying: React.FC = () => {
  const { fps } = useVideoConfig();
  const len = A('b06') - 0.3 - T_IN;
  return (
    <Sequence from={Math.round(T_IN * fps)} durationInFrames={Math.round(len * fps)}>
      <FadeIn d={0.7}><TiyingReveal son={false} times={{ tiying: at('b05', 'tiying') + 0.9 - T_IN, empereur: at('b05', 'abolit') - 1.6 - T_IN, wen: at('b05', 'wen') + 1.6 - T_IN, out: T_OUT - T_IN }} /></FadeIn>
    </Sequence>
  );
};

// ════════════════ 6. 紋 (le fil de soie), les soldats tatoués de la dynastie Song (clip B), Di Qing → rouleau 3
const Song: React.FC = () => {
  const t = useT();
  const A6 = A('b06'), soie = at('b06', 'soie'), mot = at('b06', 'motif'), song = at('b06', 'song'), des = at('b06', 'deserteurs'), dq = at('b06', 'diqing'), rem = at('b06', 'remede'), garde = at('b06', 'garde');
  return (
    <AbsoluteFill>
      <Cam keys={[[A6 - 0.3, 960, 540, 1.02], [soie - 0.2, 900, 520, 1.12, 1.2], [song - 0.3, 960, 540, 1.02, 1.0], [R3 - 0.6, 960, 540, 1, 0.6]]} punch={[mot]} calm={[[R3 - 0.6, R3E + 0.4]]}>
        <TimeScrollStage cfg={TR3} defaultCursor under={<Landscape seed={22} from={A6 - 1} to={A6 + 20} move="rise" mood="brume" faint={0.7} />}
          fromLandscape={{ seed: 22, since: dq, mood: 'brume' }} toLandscape={{ seed: 30, until: A('b07') + 2, mood: 'aube' }}>
          <Draw draw={(ctx, tt, E) => {
            // 紋 : le 文 (azurite) reçoit un fil de soie (malachite), tracé trait par trait
            const a = win(tt, A6 - 0.3, des + 0.3, 0.5);
            if (a > 0) {
              const pr = 10 * seg(tt, soie - 0.6, soie + 1.6);
              ctx.save(); ctx.globalAlpha = a;
              E.drawStrokes(ctx, 'wen_fil', { x: 960, y: 520, size: 600, progress: pr, brush: false, color: (c: string) => rgb(P[c] ?? INK) });
              ctx.restore();
            }
            // après le clip : 狄青 et les caractères gardés
            const dqa = win(tt, garde + 0.6, R3 + 0.2, 0.5);
            if (dqa > 0) {
              E.text(ctx, '狄青', 960, 470, { font: 'Kai', size: 240, color: inkCss, alpha: dqa });
              E.text(ctx, '« Je les garde. »', 960, 690, { font: 'Cormorant', size: 70, weight: 700, color: rgb(VER), alpha: dqa });
            }
          }} />
        </TimeScrollStage>
      </Cam>
      <ClipShot src="soldats" from={des - 0.4} len={garde + 0.6 - (des - 0.4)} entry="glyphe" glyph="紋" inDur={2.8} />
      <Caption text="紋 · wén · le motif, le tatouage : 文 + le fil de soie 糸" a={win(t, mot - 0.2, song, 0.5)} y={900} size={46} />
      <Caption text="soldats Song : le nom de leur armée tatoué au visage" a={win(t, des + 3.2, dq - 0.2, 0.5)} y={990} size={40} />
      <Caption text="Di Qing 狄青 (1008–1057), soldat devenu chef des armées (Song shi)" a={win(t, dq + 0.2, rem + 1.2, 0.5)} y={990} size={40} />
      <EraTag zh="宋" name="DYNASTIE SONG" dates="XIe siècle" a={seg(t, song - 0.2, song + 0.5) * (1 - seg(t, R3, R3 + 0.4))} />
    </AbsoluteFill>
  );
};

// ════════════════ 7–8. Scène récapitulative (bandeau de toutes les formes), 中文 / 文化, maxime, passerelle 美
const FORMS: [string, string, string][] = [['real:wen_jiaguwen', '甲骨文', 'Shang · os'], ['real:wen_zhou', '金文', 'Zhou · bronze'], ['real:wen_chu', '楚簡', 'Chu · bambou'], ['real:wen_xiaozhuan', '小篆', 'Qin · sceau'], ['real:wen_lishu', '隸書', 'Han · clercs'], ['kai:wen_regulier', '楷書', "aujourd'hui"]];
const HAS_MARK = [true, true, true, false, false, false];
const drawBand = (ctx: CanvasRenderingContext2D, E: any, tt: number, a: number) => {
  const y = 380, x0 = 410, dx = 220, sz = 210;
  const fo = at('b07', 'formes'), te = at('b07', 'tete'), br = at('b07', 'bras'), ja = at('b07', 'jambes'), mq = at('b07', 'marque'), rien = at('b07', 'rien'), nait = at('b07', 'naissance');
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
  const A7 = A('b07'), tr = at('b07', 'traits'), fo = at('b07', 'formes'), nait = at('b07', 'naissance'), chi = at('b07', 'chinois'), bun = at('b07', 'bunka');
  const A8 = A('b08'), peau = at('b08', 'peau'), autre = at('b08', 'autre'), tete = at('b08', 'tete'), plumes = at('b08', 'plumes'), mouton = at('b08', 'mouton');
  return (
    <AbsoluteFill>
      <Cam keys={[[A7 - 0.3, 960, 540, 1.02], [A7 + 0.2, 960, 500, 1.12, 2.0], [fo - 0.9, 960, 540, 1.02, 0.9], [nait + 0.4, 960, 500, 1.1, 1.2], [A8 - 0.5, 960, 540, 1.02, 1.0], [tete, 1050, 420, 1.2, 1.2], [mouton - 0.2, 1050, 420, 1.28, 0.6]]}
        punch={[at('b07', 'tete'), at('b07', 'bras'), at('b07', 'jambes'), at('b07', 'marque'), nait, mouton + 0.3]}>
        <Paper />
        <Landscape seed={30} from={A7 - 1.5} to={END + 0.5} move="pan" mood="aube" faint={0.6} />
        <Draw draw={(ctx, tt, E) => {
          const syn = win(tt, fo - 0.8, nait + 0.8, 0.6);
          if (syn > 0) drawBand(ctx, E, tt, syn);
          // 文 en 4 traits (avant et après le bandeau), puis la fiche
          const main = (1 - syn) * (1 - seg(tt, A8 + 0.6, A8 + 1.2));
          if (main > 0) {
            ctx.save(); ctx.globalAlpha = main;
            E.drawStrokes(ctx, 'wen_regulier', { x: 960, y: 480, size: 520, progress: 4 * seg(tt, A7 + 0.2, tr + 1.4), brush: false, color: (c: string) => (tt > nait ? rgb(mixc(INK, P[c], win(tt, nait, chi, 0.5))) : inkCss) });
            ctx.restore();
          }
          // passerelle : 美, un homme coiffé (gomme-gutte)… puis, selon le Shuowen, un mouton 羊 sur un homme 大
          const m = seg(tt, autre - 0.3, autre + 0.9);
          if (m > 0) {
            const coif = seg(tt, tete - 0.1, tete + 0.6), mt = seg(tt, mouton - 0.1, mouton + 0.5);
            ctx.save(); ctx.globalAlpha = m;
            E.drawStrokes(ctx, 'wen_mei', { x: 1050, y: 520, size: 560, progress: 9 * seg(tt, autre - 0.3, autre + 1.6), brush: false,
              color: (c: string) => rgb(c === 'coiffe' ? mixc(INK, GOM, coif) : mixc(INK, AZ, seg(tt, autre + 0.6, autre + 1.4))), glow: 26 * coif * (1 - mt), glowColor: rgb(GOM, 0.6) });
            ctx.restore();
            if (mt > 0) E.text(ctx, '羊', 1050, 330, { font: 'Kai', size: 260, color: rgb(GOM), alpha: mt, glow: 20, glowColor: rgb(GOM, 0.5) });
          }
        }} />
      </Cam>
      <Caption text="4 traits · identique en Chine et au Japon" a={win(t, tr, fo - 0.9, 0.4)} y={880} size={46} />
      <Caption text="un seul dessin, dans toutes les formes : un homme de face" a={win(t, fo, at('b07', 'tete') - 0.1, 0.4)} y={1010} size={40} />
      <Caption text="wén · le motif, l'écriture, la culture" a={win(t, nait + 0.6, chi - 0.2, 0.4)} y={880} size={52} />
      <div style={{ position: 'absolute', width: '100%', top: 820, display: 'flex', justifyContent: 'center', gap: 180, fontFamily: 'ShuimoKai', fontSize: 80, color: inkCss }}>
        <span style={{ opacity: win(t, chi - 0.6, A8 - 0.3) }}>中文<div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, textAlign: 'center' }}>le chinois</div></span>
        <span style={{ opacity: win(t, bun - 1.6, A8 - 0.3) }}>文化<div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, textAlign: 'center' }}>la culture</div></span>
      </div>
      <Caption text="文化 : « transformer par les 文 » (Livre des mutations), repris au Japon au XIXe siècle" a={win(t, bun + 0.2, A8 - 0.3, 0.4)} y={1000} size={34} />
      {/* fiche : sceau, pinyin, nombre de traits */}
      <div style={{ position: 'absolute', left: 300, top: 300, opacity: win(t, A8 - 0.2, autre - 0.2, 0.6) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 300, color: inkCss, lineHeight: 1 }}>文</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 96, fontWeight: 600, color: inkCss }}>wén</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: rgb(VER) }}>4 traits</div>
      </div>
      <Caption text="Avant d'écrire sur l'os, le bronze et le papier, les hommes se sont écrits sur la peau." a={win(t, A8 + 0.1, autre - 0.3, 0.6)} y={900} size={46} />
      <Caption text="美 · měi · la beauté : un homme paré… sur la tête" a={win(t, tete + 0.2, plumes + 1.0, 0.4)} y={900} size={48} />
      <Caption text="Shuowen : 美，从羊从大 — un mouton sur un homme. « Bon à manger. »" a={win(t, mouton + 0.2, END + 0.1, 0.4)} y={900} size={44} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => (
  <AbsoluteFill style={{ background: '#1d1915', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
    <div style={{ width: 120, height: 120, background: rgb(VER, 0.95), borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 52, color: '#f6eee0', writingMode: 'vertical-rl' }}>墨道</div>
    <div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, letterSpacing: 8, color: '#efe6d6' }}>LA VOIE DE L'ENCRE</div>
    <div style={{ fontFamily: 'ShuimoLatin', fontSize: 34, color: '#b9ab98' }}>prochain caractère : 美 · la beauté</div>
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
  const clips: Clip[] = ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b08'];
  const voice = (k: Clip) => <Sequence key={k} from={Math.round(L.clips[k].debut * fps)}><Audio src={staticFile(`episodes/wen/voix/${k}.wav`)} /></Sequence>;
  return (
    <AbsoluteFill style={{ background: '#f3eee4' }}>
      {ready && <>
        <Win from={0} to={A('b02') - 0.01}><Opening /></Win>
        <Win from={A('b02') - 0.01} to={R1E + 0.05}><Shang /></Win>
        <Win from={R1E + 0.05} to={A('b04') - 0.5}><Zhou /></Win>
        <Win from={A('b04') - 0.5} to={R2E + 0.05}><Bambou /></Win>
        <Win from={R2E + 0.05} to={T_IN + 1.2}><QinHan /></Win>
        <Tiying />
        <Win from={A('b06') - 0.3} to={R3E + 0.05}><Song /></Win>
        <Win from={R3E + 0.05} to={END}><Today /></Win>
        <Win from={END} to={WEN_SECONDS + 1}><EndCard /></Win>
      </>}
      {SFX.map(([n, tt, v], i) => (
        <Sequence key={`sfx${i}`} from={Math.round(tt * fps)}><Audio src={staticFile(`episodes/wen/audio/sfx_${n}.wav`)} volume={v} /></Sequence>
      ))}
      {clips.map(voice)}
      <Audio src={staticFile('episodes/wen/audio/musique.wav')} volume={0.55} />
    </AbsoluteFill>
  );
};
