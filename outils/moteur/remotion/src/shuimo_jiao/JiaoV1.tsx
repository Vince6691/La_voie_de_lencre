// 教 (jiào), version tout shuimo — episodes/jiao/PROPOSITION.md.
// Question : pourquoi « enseigner » cache-t-il 孝 (la piété filiale)… et un bâton ? Voyage Shang (os d'exercice) →
// Confucius (Lu, carte et itinéraire) → le bâton du 學記 → Xu Shen → le faux 孝 des copistes Han → académies Song
// (carte) → aujourd'hui (synthèse) → passerelle 文. Ligne de temps lue dans les repères (outils/video_shuimo,
// episodes/jiao/voix/reperes.json, « _ligne »), jamais recalculée ici.
// En attente : clips Seedance A (atelier) et B (baguette) — emplacements marqués à l'écran ; le clip de la carapace est en place.
// Technique alignée sur XueV2 / YuV1 : caméra de Hermite, légendes en pastille, cartouches de periodes.ts, cartes peintes,
// rouleau 3D complet Han → Song, grain fixe, raccords en fondu, musique de fin et écran de fin sur papier.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose, Mood } from '../shuimo/layout';
import { INK, PIGMENT } from '../shuimo_xue/InkStage';
import { Era, TimeScrollConfig, TimeScrollStage, arrivePose, cursorPose, morphK, tagIn } from '../rouleau/TimeScroll';
import { Rouleau3DConfig, Rouleau3DStage, r3Seconds, r3TagIn } from '../rouleau3d/Rouleau3D';
import { cartouche, periode } from '../periodes';
import { GrainVignette, Shake } from '../commun/Effets';
import { capitale, carte, chargerCartes, creditCarte, fondCarte, lieu, routePinceau } from '../cartes/CartePeinte';
import { MorphEncre } from '../morph/MorphEncre';
import { VideoReveal } from '../video_encre/VideoReveal';
import { CloudReveal } from '../video_encre/CloudReveal';
import { loadLegacy, W } from '../legacy';
import rep from '../data/episodes/jiao.json';

type Clip = 'b01' | 'b02' | 'b03' | 'b04' | 'b05' | 'b06' | 'b07' | 'b08' | 'b09' | 'b10';
type Rep = Record<Clip, { duration: number; cues: Record<string, number> }> & {
  _ligne: { clips: Record<Clip, { debut: number; duree: number; pause?: { coupe: number; duree: number } }>; rouleaux: { debut: number; duree: number }[]; fin: number; total: number; bruitages?: [string, number, number][];
    musique_fin?: { fichier: string; debut: number; fin_voix: number; fin: number; volume_voix: number; volume: number; montee: number; fondu: number; depart: number } };
};
const R = rep as unknown as Rep;
const L = R._ligne;
const A = (k: Clip) => L.clips[k].debut;
// temps absolu d'un repère (+ la pause si le repère est après la coupe)
const at = (k: Clip, n: string) => {
  const c = L.clips[k], v = R[k].cues[n];
  if (v === undefined) throw new Error(`repère manquant ${k}.${n}`);
  return c.debut + v + (c.pause && v > c.pause.coupe ? c.pause.duree : 0);
};
export const JIAO_SECONDS = Math.ceil(L.total * 10) / 10;
const CLIP_B = at('b05', 'frapper') + 0.75; // le clip B suit la question « frapper ? » (bruitage « baguette » = son du clip, episode.json)
const END = L.fin;

// époques du 教 : sceaux de la frise des rouleaux 2D, tirés de periodes.ts (même table que les cartouches et le rouleau 3D)
const ERAS: Era[] = ([['shang', '−1200'], ['zhou', '−1046'], ['lu', '−520'], ['han', '100'], ['song', '1179'], ['aujourdhui', '2026']] as [string, string][]).map(([id, date]) => ({ zh: periode(id).sceau, date }));
const [R1, R2, R3] = L.rouleaux.map((r) => r.debut); // 2D 5 s, 2D 3,5 s, 3D complet (Han → Song, le plus grand saut)
// vers des rouleaux : des citations qui parlent d'enseigner (vérifiées : Lunyu VII, XV ; Liji, Xueji ; Mengzi, Jinxin I)
const TR1: TimeScrollConfig = { at: R1, duration: L.rouleaux[0].duree, eras: ERAS, from: 0, to: 2, years: [-1200, -520],
  inscriptions: [{ cols: ['誨人不倦'], sig: '論語 述而', seal: '教' }, { cols: ['三人行', '必有我師焉'], sig: '論語 述而', seal: '道' }] };
const TR2: TimeScrollConfig = { at: R2, duration: L.rouleaux[1].duree, eras: ERAS, from: 2, to: 3, years: [-480, 100],
  inscriptions: [{ cols: ['有教無類'], sig: '論語 衛靈公', seal: '教' }, { cols: ['教學相長'], sig: '禮記 學記', seal: '道' }], collection: ['雲水', '長樂'] };
const R3A: Rouleau3DConfig = {
  at: R3, de: 'han', vers: 'song', annees: [100, 1179], variant: 'complet', stone: 'miel',
  fromLand: { seed: 3, mood: 'jour' }, toLand: { seed: 22, mood: 'brume' }, midSeeds: [17, 21],
  inscriptions: [
    { x: 1500, y: 200, size: 74, font: 'ShuimoKai', cols: ['教學相長也'], sig: '禮記學記', seal: '雲水', ink: 0.88 },
    { x: 5500, y: 170, size: 78, font: 'ShuimoKai', cols: ['得天下英才', '而教育之'], sig: '孟子盡心', seal: '長樂', ink: 0.92 },
  ],
};
const R3END = R3 + r3Seconds(R3A);
// coups de sceau et révélations qui font trembler le cadre (4 px, 0,3 s)
const IMPACTS = [at('b02', 'dessin'), at('b03', 'signe'), at('b04', 'regle'), at('b05', 'frapper'), at('b07', 'reponse'), at('b08', 'grotte'), at('b09', 'naissance')];
const MF = L.musique_fin;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const inkCss = rgb(INK);
// pigments constants : 爻 gomme-gutte, 子 azurite, main au bâton 攴 vermillon ; le 孝 « fantôme » en ocre pâle
const P: Record<string, number[]> = { yao: PIGMENT.yao, child: PIGMENT.child, hand: PIGMENT.hand, stick: [120, 72, 38], old: [176, 138, 92], body: INK, heart: PIGMENT.hand };
const OCRE = [176, 138, 92], GREY = [168, 160, 150];
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
      chargerCartes([CARTE]),
      new Promise<void>((res) => { const im = new Image(); im.onload = () => { BONE_IMG.im = im; res(); }; im.onerror = () => res(); im.src = staticFile('episodes/jiao/images/os_exercice.png'); }),
      ...[...GANZHI].map((_, i) => new Promise<void>((res) => { const im = new Image(); im.onload = () => { GZ_IMG[i] = im; res(); }; im.onerror = () => res(); im.src = staticFile(`episodes/jiao/images/ganzhi_${i}.png`); })),
    ]).then((fs) => { fs.slice(0, 5).forEach((f) => document.fonts.add(f as FontFace)); return loadLegacy({ three: false, captions: false }); }).then(() => { setReady(true); continueRender(h); });
  }, [h]);
  return ready;
};

// canvas plein cadre redessiné à chaque image par draw(ctx, t, E), à la définition du rendu (--scale = devicePixelRatio, 1,33 en 1440p)
// avec une marge de 15 % pour les zooms de caméra ; les flous d'ombre ne suivent pas la transformation : multipliés d'autant (modèle XueV2)
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
    ctx.setTransform(DRAW_K, 0, 0, DRAW_K, 0, 0);
    ctx.clearRect(0, 0, 1920, 1080);
    draw(ctx, t, E);
  });
  return <canvas ref={ref} width={Math.round(1920 * DRAW_K)} height={Math.round(1080 * DRAW_K)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
};

const Fade: React.FC<{ len: number; faint: number; children: React.ReactNode }> = ({ len, faint, children }) => {
  const f = useT();
  const o = interpolate(f, [0, 1.4, len - 1.4, len], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o * faint }}>{children}</AbsoluteFill>;
};
const Landscape: React.FC<{ seed: number; from: number; to: number; move?: 'pan' | 'push' | 'still' | 'rise'; mood?: Mood; faint?: number; front?: boolean }> = ({ seed, from, to, move = 'pan', mood = 'jour', faint = 1, front = true }) => {
  const { fps } = useVideoConfig();
  const shot = compose(seed, { move, mood, duration: to - from, front });
  return (
    <Sequence from={Math.round(from * fps)} durationInFrames={Math.round((to - from) * fps)}>
      <Fade len={to - from} faint={faint}><ShuimoBackground shot={shot} duration={to - from} /></Fade>
    </Sequence>
  );
};
const Paper: React.FC = () => <AbsoluteFill style={{ background: `#f3eee4 url(${staticFile('shuimo/paper.jpg')}) center/cover` }} />;

// clips plein cadre : entrée par les nuages, ou à travers le caractère 教 quand il est à l'écran juste avant ; sortie par les
// coups de pinceau. PRETS : un clip pas encore livré (Seedance A et B, episodes/jiao/A_FOURNIR.md) laisse un emplacement marqué.
// carapace : clip Veo (8 s, 720p, 24 i/s) ; recadrage 1,12 pour chasser le filigrane hors cadre
const CLIPS = { carapace: 'episodes/jiao/clips/02_carapace.mp4', atelier: 'episodes/jiao/clips/03_atelier.mp4', baguette: 'episodes/jiao/clips/05_baguette.mp4' };
const PRETS: Record<keyof typeof CLIPS, boolean> = { carapace: true, atelier: false, baguette: true };
const CLIP_TITRES = { carapace: ['', ''], atelier: ['Clip A · l\'atelier de gravure', 'Seedance, 12 s : le maître grave, l\'élève recopie'], baguette: ['Clip B · la baguette', 'Seedance, 10 s : le maître tapote la table d\'un élève endormi'] };
const CLIP_SECONDS = { carapace: 8, atelier: 12, baguette: 10.08 };
const CLIP_ZOOM = { carapace: 1.12, atelier: 1, baguette: 1 };
const Placeholder: React.FC<{ title: string; sub: string; a: number }> = ({ title, sub, a }) => (
  <AbsoluteFill style={{ opacity: a, alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 1200, height: 560, border: `4px dashed ${rgb(P.hand, 0.6)}`, borderRadius: 18, background: 'rgba(246,241,231,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 700, fontSize: 60, color: inkCss }}>{title}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: '#5e5044' }}>{sub}</div>
    </div>
  </AbsoluteFill>
);
const ClipShot: React.FC<{ src: keyof typeof CLIPS; from: number; len: number; entry: 'nuages' | 'glyphe'; inDur?: number; debut?: number; vitesse?: number }> = ({ src, from, len, entry, inDur = 3.2, debut = 0, vitesse }) => {
  const { fps } = useVideoConfig();
  const t = useT();
  if (!PRETS[src]) {
    return (
      <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(len * fps)}>
        <Placeholder title={CLIP_TITRES[src][0]} sub={CLIP_TITRES[src][1]} a={win(t, from, from + len, 0.5)} />
      </Sequence>
    );
  }
  const rate = vitesse ?? (debut ? 1 : Math.min(0.9, (0.93 * CLIP_SECONDS[src]) / len)); // ralenti si le plan est plus long que le clip (7 % de marge : pas d'image noire en fin de clip)
  const crop = (el: React.ReactNode) => (CLIP_ZOOM[src] === 1 ? <>{el}</> : <AbsoluteFill style={{ transformOrigin: '10% 20%', transform: `scale(${CLIP_ZOOM[src]})` }}>{el}</AbsoluteFill>);
  if (entry === 'glyphe') {
    return crop(
      <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(len * fps)}>
        <VideoReveal src={CLIPS[src]} mode="glyphe" glyph="教" outMode="pinceau" inDur={inDur} outDur={1.8} startFrom={debut} playbackRate={rate} zoom={1} />
      </Sequence>
    );
  }
  const cl = inDur + 0.4;
  return crop(
    <>
      <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(cl * fps)}>
        <CloudReveal src={CLIPS[src]} inDur={inDur} exit={false} startFrom={debut} playbackRate={rate} />
      </Sequence>
      <Sequence from={Math.round((from + cl) * fps)} durationInFrames={Math.round((len - cl) * fps)}>
        <VideoReveal src={CLIPS[src]} mode="pinceau" inDur={0.001} outDur={1.8} startFrom={debut + cl * rate} playbackRate={rate} zoom={1} />
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

// ── cartouches, étiquettes, textes (tailles lisibles sur téléphone ; modèle XueV2 / YuV1)
const CARTE = 'chine_centre_nord'; // carte peinte de la bibliothèque (skill carte-peinte) : Qufu, l'itinéraire de Confucius, le mont Lu
const EraTag: React.FC<{ zh: string; name: string; dates: string; a: number; fond?: boolean }> = ({ zh, name, dates, a, fond }) => (
  <div style={{ position: 'absolute', left: fond ? 90 : 110, top: fond ? 76 : 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a, ...(fond ? { background: 'rgba(246,241,231,0.84)', borderRadius: 16, padding: '14px 28px 14px 20px' } : {}) }}>
    <div style={{ width: 92, height: 92, background: rgb(P.hand, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 36, fontWeight: 500, color: '#5e5044' }}>{dates}</div>
    </div>
  </div>
);
const Label: React.FC<{ x: number; y: number; zh: string; text: string; color: number[]; a: number; align?: 'left' | 'right' }> = ({ x, y, zh, text, color, a, align = 'left' }) => (
  <div style={{ position: 'absolute', top: y - 50, ...(align === 'left' ? { left: x } : { right: 1920 - x }), opacity: a, display: 'flex', alignItems: 'baseline', gap: 14, flexDirection: align === 'left' ? 'row' : 'row-reverse', background: 'rgba(246,241,231,0.78)', borderRadius: 16, padding: '2px 22px' }}>
    <span style={{ fontFamily: 'ShuimoKai', fontSize: 100, color: rgb(color) }}>{zh}</span>
    <span style={{ fontFamily: 'ShuimoLatin, ShuimoLegende', fontSize: 66, fontWeight: 600, color: '#3b322b', textShadow: '0 0 10px rgba(246,241,231,0.95)' }}>{text}</span>
  </div>
);
// légende en pastille de papier, jamais dans les 8 % du bas (haut du texte ≤ 975 − 1,7 × taille)
const Caption: React.FC<{ text: React.ReactNode; a: number; y?: number; size?: number; left?: number; width?: number }> = ({ text, a, y = 900, size = 44, left = 0, width = 1920 }) => (
  <div style={{ position: 'absolute', left, width, top: Math.min(y, 975 - 1.7 * Math.max(size, 44)), textAlign: 'center', opacity: a }}>
    <span style={{ display: 'inline-block', padding: '4px 22px', borderRadius: 14, background: 'rgba(246,241,231,0.8)', fontFamily: 'ShuimoLatin, ShuimoLegende', fontSize: Math.max(size, 44), color: '#4b4038', textShadow: '0 0 10px rgba(246,241,231,0.9)' }}>{text}</span>
  </div>
);
// couleur d'une composante : encre → pigment selon lit[c] (0–1), grisée selon dim
const compColor = (lit: Record<string, number>, dim = 0, hi = '') => (c: string) => {
  let col = mixc(INK, P[c] ?? INK, lit[c] ?? 0);
  if (dim > 0 && hi && c !== hi) col = mixc(col, GREY, dim);
  return rgb(col);
};

// ── caméra : une seule trajectoire continue (spline de Hermite monotone à travers les clés [t, x, y, zoom, durée]),
// dolly lent permanent, « punch » en respirations douces ; neutre pendant les rouleaux (calm) ; le monde (fonds, glyphes,
// étiquettes) est dans la caméra, légendes et cartouches restent fixes, hors caméra
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
const Cam: React.FC<{ keys: K[]; punch?: number[]; calm?: [number, number][]; children: React.ReactNode }> = ({ keys, punch = [], calm = [], children }) => {
  const t = useT();
  const ts: number[] = [], xs: number[] = [], ys: number[] = [], zs: number[] = [];
  keys.forEach(([kt, x, y, z, d = 1.2], k) => {
    const a = k === 0 ? kt : Math.max(kt + Math.max(d, 1.6), ts[ts.length - 1] + 0.4);
    ts.push(a); xs.push(x); ys.push(y); zs.push(z);
  });
  let cx = hermite(ts, xs, t), cy = hermite(ts, ys, t), sc = hermite(ts, zs, t);
  sc *= 1 + 0.018 * (0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 16));
  cx += 4 * Math.sin((t * 2 * Math.PI) / 19); cy += 6 * Math.sin((t * 2 * Math.PI) / 23); // dérive surtout verticale
  for (const p of punch) { const u = seg(t, p - 0.2, p + 1.2); sc *= 1 + 0.022 * Math.sin(Math.PI * u) ** 2; }
  const amp = 1 - Math.max(0, ...calm.map(([a, b]) => win(t, a, b, 0.6)));
  sc = 1 + (sc - 1) * amp;
  cx = Math.min(1920 - 960 / sc, Math.max(960 / sc, cx)); cy = Math.min(1080 - 540 / sc, Math.max(540 / sc, cy));
  return <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${960 - cx * sc}px, ${540 - cy * sc}px) scale(${sc})` }}>{children}</AbsoluteFill>;
};

// ════════════════ 1–2. Accroche (教 tracé, le faux 孝, le bâton), puis le tout premier dessin, gravé sur l'os
const Opening: React.FC = () => {
  const t = useT();
  const A1 = A('b01'), xiao = at('b01', 'xiao'), baton = at('b01', 'baton'), ment = at('b01', 'mentait');
  const dessin = at('b02', 'dessin'), os = at('b02', 'os');
  return (
    <AbsoluteFill>
      <Cam keys={[[0, 960, 540, 1], [xiao, 830, 520, 1.25, 1.0], [baton, 1110, 520, 1.25, 0.9], [ment - 0.4, 960, 540, 1, 1.2], [dessin - 0.2, 960, 520, 1.15, 1.4], [os + 0.4, 960, 540, 1.02, 2.0]]}
        punch={[ment, dessin + 0.5]}>
      <Paper />
      <Landscape seed={14} from={os - 0.2} to={A('b03') + 14} move="push" mood="aube" />
      <Draw draw={(ctx, tt, E) => {
        const toOld = seg(tt, dessin - 0.3, dessin + 0.9); // 教 moderne → premier dessin (os)
        const sz = 600, y = 520;
        const out = 1 - seg(tt, os - 0.1, os + 0.5); // le signe ancien s'efface, la carapace entre à travers 教
        if (out <= 0) return;
        if (toOld < 1) {
          const left = seg(tt, xiao + 0.6, xiao + 1.3), hand = seg(tt, baton - 0.2, baton + 0.5);
          const shake = seg(tt, ment - 0.1, ment + 0.2) * (1 - seg(tt, ment + 1.0, ment + 1.6));
          // « des assemblages de petits dessins » : les trois parties s'écartent, chacune dans son pigment
          const asm = at('b02', 'assemblages'), sep = seg(tt, asm, asm + 0.9) * (1 - seg(tt, dessin - 0.6, dessin));
          const OFF: Record<string, number[]> = { yao: [-110, -80], child: [-110, 90], hand: [130, 0] };
          for (const part of ['yao', 'child', 'hand']) {
            const [ox, oy] = OFF[part];
            ctx.save(); ctx.globalAlpha = 1 - toOld; ctx.translate(ox * sep, oy * sep);
            E.drawStrokes(ctx, 'jiao_kai', {
              x: 960, y: 520, size: 600, progress: 11 * seg(tt, A1 - 0.3, A1 + 2.0), brush: false,
              alpha: (c: string) => (c === part ? 1 : 0),
              color: (c: string) => rgb(mixc(c === 'hand' ? mixc(INK, P.hand, hand) : mixc(INK, OCRE, left), P[c], sep)),
              glow: 22 * Math.max(hand, left) * (1 - seg(tt, ment + 1, ment + 2)), glowColor: rgb(hand > left ? P.hand : OCRE, 0.5),
            });
            ctx.restore();
          }
          if (shake > 0) {
            ctx.save(); ctx.globalAlpha = (1 - toOld) * 0.45 * shake; ctx.translate(shake * 6 * Math.sin(tt * 55), 0);
            E.drawStrokes(ctx, 'jiao_kai', { x: 960, y: 520, size: 600, brush: false, color: () => rgb(OCRE), alpha: (c: string) => (c === 'hand' ? 0 : 1) });
            ctx.restore();
          }
        }
        if (toOld > 0) E.drawRealGlyph(ctx, 'jiao_jiaguwen', { x: 960, y, size: sz, opacity: toOld * out, color: () => inkCss });
      }} />
      </Cam>
      <Caption text="教 · jiào · enseigner" a={win(t, A1 + 0.7, xiao + 0.5, 0.4)} y={860} size={44} />
      <Caption text="孝 · xiào · la piété filiale ?" a={win(t, xiao + 0.8, baton - 0.3)} y={860} size={44} />
    </AbsoluteFill>
  );
};

// ════════════════ 3. Shang : l'atelier (clip A), l'os d'exercice, le signe → rouleau 1 (Shang → Lu)
// signes de l'os d'exercice : vrais jiaguwen (小學堂, CC0 ; outils/video_shuimo/glyphes_alpha.py), teintés dans le canvas
const GZ_IMG: HTMLImageElement[] = [];
const GZ_TINT: Record<string, HTMLCanvasElement> = {};
const BONE_IMG: { im: HTMLImageElement | null } = { im: null }; // omoplate de bœuf (episodes/jiao/images/os_exercice.png, fond transparent) ; repli : estampage sombre
const gz = (ctx: CanvasRenderingContext2D, i: number, x: number, y: number, h: number, a: number, col = '#efe6d6') => {
  const im = GZ_IMG[i];
  if (!im || a <= 0) return;
  let c = GZ_TINT[`${i}${col}`];
  if (!c) {
    c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d')!; g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    GZ_TINT[`${i}${col}`] = c;
  }
  const k = Math.min(h / c.height, (h * 1.15) / c.width);
  ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(c, x - (c.width * k) / 2, y - (c.height * k) / 2, c.width * k, c.height * k); ctx.restore();
};
// cerf 白描 animé : le dessin achevé est rendu une fois en image, puis découpé en trois calques (tête et encolure, queue, corps) qui bougent
// autour de leur pivot (coordonnées du dessin : portraits.cerf, 941 × 722) ; le corps respire au pas
const DEER_H = 560;
const DEER: { W: number; base?: HTMLCanvasElement; head?: HTMLCanvasElement; tail?: HTMLCanvasElement } = { W: 0 };
const DEER_HEAD: number[][] = [[585, 40], [920, 40], [920, 335], [690, 345], [585, 305]], DEER_HEAD_PIVOT = [640, 325];
const DEER_TAIL: number[][] = [[140, 320], [240, 320], [240, 445], [140, 445]], DEER_TAIL_PIVOT = [238, 385];
const buildDeer = (E: any) => {
  if (DEER.base) return;
  const k = DEER_H / 722, W = Math.ceil((((window as any).PORTRAITS?.cerf?.w as number) ?? 941) * k); // largeur du dessin lue dans portraits.cerf (portrait.py)
  const spr = document.createElement('canvas'); spr.width = W; spr.height = DEER_H;
  E.drawPortrait(spr.getContext('2d')!, { key: 'cerf', x: W / 2, y: DEER_H / 2, height: DEER_H, progress: 1, color: '#2a231d' });
  const path = (pts: number[][]) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x * k, y * k) : p.moveTo(x * k, y * k))); p.closePath(); return p; };
  const layer = (keep: boolean, ...polys: number[][][]) => {
    const c = document.createElement('canvas'); c.width = W; c.height = DEER_H;
    const g = c.getContext('2d')!; g.drawImage(spr, 0, 0);
    g.globalCompositeOperation = keep ? 'destination-in' : 'destination-out';
    if (keep) { const m = new Path2D(); polys.forEach((p) => m.addPath(path(p))); g.fill(m); } else polys.forEach((p) => g.fill(path(p)));
    return c;
  };
  DEER.W = W; DEER.head = layer(true, DEER_HEAD); DEER.tail = layer(true, DEER_TAIL); DEER.base = layer(false, DEER_HEAD, DEER_TAIL);
};
const drawDeer = (ctx: CanvasRenderingContext2D, cx: number, cy: number, tt: number, a: number) => {
  if (!DEER.base) return;
  const k = DEER_H / 722, x0 = cx - DEER.W / 2, y0 = cy - DEER_H / 2 + 3 * Math.sin((tt * 2 * Math.PI) / 1.3);
  const nod = ((-2.4 * (0.5 + 0.5 * Math.sin((tt * 2 * Math.PI) / 5.2)) + 0.6 * Math.sin((tt * 2 * Math.PI) / 1.7)) * Math.PI) / 180; // la tête s'abaisse, se relève
  const flick = ((4 * Math.sin((tt * 2 * Math.PI) / 2.1) * Math.max(0, Math.sin((tt * 2 * Math.PI) / 6.3))) * Math.PI) / 180; // la queue frétille par à-coups
  ctx.save(); ctx.globalAlpha = a;
  ctx.drawImage(DEER.base, x0, y0);
  const part = (img: HTMLCanvasElement, pv: number[], ang: number) => { ctx.save(); ctx.translate(pv[0] * k, pv[1] * k); ctx.rotate(ang); ctx.translate(-pv[0] * k, -pv[1] * k); ctx.drawImage(img, 0, 0); ctx.restore(); };
  ctx.save(); ctx.translate(x0, y0); part(DEER.head!, DEER_HEAD_PIVOT, nod); part(DEER.tail!, DEER_TAIL_PIVOT, flick); ctx.restore();
  ctx.restore();
};
const GANZHI = '甲子乙丑丙寅丁卯戊辰己巳';
const ShangLu: React.FC = () => {
  const t = useT();
  const A3 = A('b03'), mait = at('b03', 'maitre'), elev = at('b03', 'eleve'), sig = at('b03', 'signe'), yao = at('b03', 'yao'), enf = at('b03', 'enfant'), bat = at('b03', 'baton');
  return (
    <AbsoluteFill>
      <Cam keys={[[A3, 960, 540, 1.02], [at('b03', 'ateliers') + 0.2, 960, 520, 1.08, 2.4], [mait, 940, 530, 1.06, 1.6], [elev - 3.0, 990, 545, 1.08, 2.6], [sig - 0.3, 960, 540, 1.02, 1.0], [yao, 960, 430, 1.12, 0.8], [at('b03', 'xue'), 820, 480, 1.08, 0.8], [enf, 960, 620, 1.12, 0.8], [bat - 0.5, 960, 540, 1, 0.6]]}
        punch={[sig + 0.2]} calm={[[bat - 0.5, R1 + TR1.duration! + 0.4]]}>
      <TimeScrollStage cfg={TR1} under={<Landscape seed={14} from={A3 - 2} to={A3 + 14} move="pan" mood="aube" />}
        fromLandscape={{ seed: 5, since: mait - 1 }} toLandscape={{ seed: 9, until: A('b05') + 1 }}>
        <Draw draw={(ctx, tt, E) => {
          // os d'exercice : estampage ; le maître grave la liste des jours dès « ateliers royaux » (un signe toutes les 0,8 s), l'élève la
          // recopie en tremblant ; signes en jiaguwen réels
          const ate = at('b03', 'ateliers');
          const bone = win(tt, ate - 0.4, sig + 0.6, 0.8);
          if (bone > 0) {
            ctx.save(); ctx.globalAlpha = bone;
            const bi = BONE_IMG.im, n = GANZHI.length;
            // support : omoplate de bœuf (image) ou, à défaut, estampage sombre ; colonnes du maître (gauche) et de l'élève (droite)
            const H = 900, W = bi ? (H * bi.naturalWidth) / bi.naturalHeight : 480, cx = bi ? 1090 : 960, cy = 545;
            const xm = bi ? cx - W / 2 + 0.36 * W : 880, xe = bi ? cx - W / 2 + 0.66 * W : 1040, y0 = bi ? cy - H / 2 + 0.1 * H : 205, st = bi ? 0.062 * H : 62, gh = bi ? 0.056 * H : 54;
            const enc = bi ? '#3a2a1d' : '#efe6d6';
            if (bi) {
              ctx.save(); ctx.shadowColor = 'rgba(40,28,18,0.35)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 12;
              ctx.drawImage(bi, cx - W / 2, cy - H / 2, W, H); ctx.restore();
            } else { ctx.fillStyle = 'rgba(40,34,30,0.86)'; E.roundRect(ctx, 720, 150, 480, 790, 160); ctx.fill(); }
            // qui écrit quoi : le maître (colonne nette), l'élève (copie tremblée)
            E.text(ctx, 'le maître', xm, bi ? y0 - 62 : 112, { font: 'Cormorant', size: 44, weight: 700, color: '#3b322b', alpha: seg(tt, mait - 0.6, mait), glow: 10, glowColor: 'rgba(246,241,231,1)' });
            E.text(ctx, "l'élève", xe, bi ? y0 - 62 : 112, { font: 'Cormorant', size: 44, weight: 700, color: rgb(P.hand), alpha: seg(tt, elev - 3.0, elev - 2.4), glow: 10, glowColor: 'rgba(246,241,231,1)' });
            for (let i = 0; i < n; i++) {
              const gm = seg(tt, ate + 0.6 + i * 0.8, ate + 1.0 + i * 0.8);
              if (bi) gz(ctx, i, xm + 1.5, y0 + i * st + 1.5, gh, gm * 0.55, '#f6ecd2');
              gz(ctx, i, xm, y0 + i * st, gh, gm, enc);
              const s = seg(tt, elev - 3.0 + i * 0.14, elev - 2.8 + i * 0.14), j = (k: number) => Math.sin(i * 12.9898 + k) * 7;
              ctx.save(); ctx.translate(xe + j(1), y0 + i * st + j(2)); ctx.rotate(j(3) / 60);
              if (bi) gz(ctx, i, 1.5, 1.5, gh - 4 + j(4), s * 0.45, '#f6ecd2');
              gz(ctx, i, 0, 0, gh - 4 + j(4), s * 0.85, enc);
              ctx.restore();
            }
            ctx.restore();
          }
          // le signe 教 (os) : révélé en blanc, puis à l'encre ; 爻, 子, 攴 prennent leurs pigments sur leurs mots ;
          // pendant le rouleau il devient le curseur de la frise et se change en signe de bronze
          const reveal = seg(tt, sig, sig + 1.2);
          if (reveal > 0 && tt < R1 + TR1.duration! + 0.1) {
            const main = at('b03', 'main'), doigts = at('b03', 'doigts');
            const lit = { yao: seg(tt, yao, yao + 0.7), child: seg(tt, enf, enf + 0.7), stick: seg(tt, bat, bat + 0.6), hand: seg(tt, main, main + 0.6) };
            // zoom sur le bâton et la main (à droite du signe), puis retour avant le rouleau
            const zm = seg(tt, bat - 0.4, bat + 0.8) * (1 - seg(tt, R1 - 1.2, R1 - 0.2));
            const pulse = win(tt, doigts, doigts + 1.4, 0.3);
            const dry = seg(tt, sig + 0.8, sig + 1.8);
            const mk = morphK(TR1, tt);
            const p = cursorPose(TR1, tt), q = arrivePose(TR1, tt);
            const col = (c: string) => rgb(mixc(mixc([240, 233, 219], INK, dry), P[c], lit[c as keyof typeof lit] ?? 0));
            const zs = 1 + 0.55 * zm, zx = p.x - 0.11 * 600 * zs * zm, zy = p.y - 0.05 * 600 * zs * zm;
            if (mk < 1) E.drawRealGlyph(ctx, 'jiao_jiaguwen', { x: zx, y: zy, size: 600 * p.s * zs, reveal: () => reveal, opacity: 1 - mk, color: col,
              alpha: (c: string) => (c === 'hand' || c === 'stick' ? 1 : 1 - 0.55 * zm), glow: 30 * pulse, glowColor: rgb(P.hand, 0.7) });
            if (mk > 0) E.drawRealGlyph(ctx, 'jiao_jinwen', { x: q.x, y: q.y, size: 600 * q.s, opacity: mk * (1 - seg(tt, R1 + TR1.duration! - 0.3, R1 + TR1.duration! + 0.1)), color: (c: string) => rgb(P[c]) });
          }
        }} />
      </TimeScrollStage>
      <Draw draw={(ctx, tt, E) => {
        const x = at('b03', 'xue'), a = win(tt, x - 0.3, at('b03', 'enfant') - 0.2, 0.5);
        if (a <= 0) return;
        E.drawRealGlyph(ctx, 'jinwen', { x: 380, y: 500, size: 340, opacity: a, color: (c: string) => rgb(c === 'yao' ? P.yao : mixc(INK, GREY, 0.5)), glow: 24 * a, glowColor: rgb(P.yao, 0.6) });
      }} />
      <div style={{ position: 'absolute', left: 380 - 220, width: 440, top: 700, textAlign: 'center', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 52, fontWeight: 600, color: '#3b322b', opacity: win(t, at('b03', 'xue') + 0.2, at('b03', 'enfant') - 0.2, 0.4) }}>學 · apprendre</div>
      <Label x={1240} y={330} zh="爻" text="baguettes" color={P.yao} a={win(t, yao + 0.3, bat - 0.4, 0.6)} />
      <Label x={1240} y={720} zh="子" text="l'enfant" color={P.child} a={win(t, enf + 0.3, bat - 0.4, 0.6)} />
      </Cam>
      <Caption text="os d'exercice recomposé" a={win(t, at('b03', 'ateliers') + 0.3, sig - 0.4, 0.5)} y={900} size={44} left={0} width={780} />
      <EraTag {...cartouche('shang', 'Anyang · XIIIe–XIe s. av. J.-C.')} a={win(t, A3 + 0.3, R1 + 0.4, 0.8)} />
      <EraTag {...cartouche('lu', 'Printemps et Automnes · v. 500 av. J.-C.')} a={tagIn(TR1, t)} />
      <Label x={1260} y={300} zh="卜" text="le bâton" color={P.stick} a={win(t, at('b03', 'baton') + 0.3, R1 - 0.3, 0.6)} />
      <Label x={1260} y={760} zh="又" text="la main" color={P.hand} a={win(t, at('b03', 'main') + 0.3, R1 - 0.3, 0.6)} />
    </AbsoluteFill>
  );
};

// ════════════════ 4. Confucius : dessin 白描 peint trait à trait, 有教無類, carte de Lu et itinéraire
// villes (lon, lat) : Qufu (Lu) et étapes simplifiées du voyage (Shiji, Kongzi shijia)
const QUFU = [117.0, 35.6];
const ROUTE: [string, number[]][] = [['Qufu', QUFU], ['Wei', [115.0, 35.7]], ['Cao', [115.55, 35.07]], ['Song', [115.65, 34.42]], ['Zheng', [113.72, 34.4]], ['Chen', [114.88, 33.73]], ['Cai', [114.3, 33.25]], ['Wei', [115.0, 35.7]], ['Qufu', QUFU]];
const Confucius: React.FC = () => {
  const t = useT();
  const A4 = A('b04'), conf = at('b04', 'confucius'), abr = at('b04', 'abricotier'), regle = at('b04', 'regle'), disc = at('b04', 'disciples'), routes = at('b04', 'routes');
  const mapFrom = disc - 0.3, mapTo = A('b05') - 0.45;
  return (
    <AbsoluteFill>
      <Cam keys={[[A4, 960, 540, 1.02], [conf - 0.8, 960, 540, 1.02, 0.6], [conf + 0.4, 720, 540, 1.16, 3.0], [abr, 700, 460, 1.26, 2.4], [regle - 1.9, 1300, 520, 1.2, 1.4], [mapFrom - 0.9, 960, 540, 1.02, 0.8]]}
        punch={[regle - 0.6]}>
      {/* fond continu (jamais d'écran vide entre le rouleau, la carte et le dessin) */}
      <Paper />
      <Landscape seed={9} from={A4 - 1.5} to={A('b05') + 0.5} move="pan" mood="aube" faint={0.7} />
      {/* dessin 白描 de Confucius sous l'abricotier (episodes/jiao/images/confucius_baimiao_1.jpg), peint trait à trait en 3 s */}
      {win(t, conf - 0.8, mapFrom + 0.6, 0.7) > 0 && <AbsoluteFill style={{ opacity: win(t, conf - 0.8, mapFrom + 0.6, 0.7) }}>
        <Paper />
        <Landscape seed={9} from={A4 - 1} to={mapFrom + 1} move="still" mood="aube" faint={0.35} />
        <Draw draw={(ctx, tt, E) => {
          E.drawPortrait(ctx, { key: 'confucius', x: 700, y: 560, height: 780, progress: seg(tt, conf - 0.6, conf + 2.6), color: '#2a231d' });
          // 有教無類 vertical, 教 en pigments
          const a = seg(tt, regle - 1.6, regle - 0.6);
          if (a <= 0) return;
          const chars = ['有', '教', '無', '類'];
          chars.forEach((ch, i) => {
            const y = 270 + i * 165, ai = a * seg(tt, regle - 1.6 + i * 0.25, regle - 1.0 + i * 0.25);
            if (ch === '教') {
              ctx.save(); ctx.globalAlpha = ai;
              E.drawStrokes(ctx, 'jiao_kai', { x: 1480, y, size: 160, brush: false, color: (c: string) => rgb(P[c]) });
              ctx.restore();
            } else E.text(ctx, ch, 1480, y, { font: 'Kai', size: 140, color: inkCss, alpha: ai });
          });
        }} />
      </AbsoluteFill>}
      </Cam>
      <Caption text="portrait imaginé" a={win(t, conf + 0.4, regle - 0.3, 0.5)} y={900} size={44} />
      <MapPanel from={A4 + 1.3} to={conf - 0.3} draw={(ctx, u, E, tt) => {
        const v = carte(CARTE).vue, q = E.proj(v, QUFU), lu = at('b04', 'lu'), ro = at('b04', 'royaumes');
        const z = (1 + 0.55 * ease(seg(tt, lu - 0.5, lu + 1.8))) * (1 + 0.06 * u);
        const Pz = (p: number[]) => { const o = E.proj(v, p); return [q[0] + (o[0] - q[0]) * z, q[1] + (o[1] - q[1]) * z]; };
        ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(z, z); ctx.translate(-q[0], -q[1]);
        fondCarte(ctx, E, CARTE);
        E.mapLayer(ctx, v, v, 120, 'jiao_lu_reg', (c: CanvasRenderingContext2D, w: any) => E.region(c, w, 'zhou_states', 'rgba(52,132,98,0.14)', 1), seg(tt, ro - 0.6, ro + 0.4));
        ctx.restore();
        // les royaumes rivaux nommés à « royaumes rivaux », puis Lu seul à « Lu »
        const rivaux: [string, string, number[], 'g' | 'd'][] = [['齊', 'Qi', [118.35, 36.87], 'd'], ['宋', 'Song', [115.65, 34.43], 'g'], ['楚', 'Chu', [112.2, 30.35], 'g']];
        rivaux.forEach(([zh, fr, p, cote], i) => lieu(ctx, E, Pz(p), zh, fr, seg(tt, ro + 0.2 + i * 0.35, ro + 0.7 + i * 0.35) * (1 - 0.7 * seg(tt, lu, lu + 0.6)), { cote, taille: 22, seed: i, fond: true }));
        lieu(ctx, E, Pz(QUFU), '魯', 'Lu · Qufu', seg(tt, lu, lu + 0.4), { cote: 'd', seed: 5, fond: true });
        creditCarte(ctx, E, CARTE);
      }} />
      <MapPanel from={mapFrom} to={mapTo} draw={(ctx, u, E, tt) => {
        const v = carte(CARTE).vue, c0 = E.proj(v, [115.3, 34.5]), z = (1 + 1.5 * ease(seg(tt, mapFrom, mapFrom + 2.2))) * (1 + 0.05 * u);
        const Pz = (p: number[]) => { const o = E.proj(v, p); return [c0[0] + (o[0] - c0[0]) * z, c0[1] + (o[1] - c0[1]) * z]; };
        ctx.save(); ctx.translate(c0[0], c0[1]); ctx.scale(z, z); ctx.translate(-c0[0], -c0[1]);
        fondCarte(ctx, E, CARTE);
        E.mapLayer(ctx, v, v, 120, 'jiao_route_reg', (c: CanvasRenderingContext2D, w: any) => E.region(c, w, 'zhou_states', 'rgba(52,132,98,0.1)', 1), seg(tt, mapFrom + 0.2, mapFrom + 1.2));
        ctx.restore();
        // itinéraire au pinceau, d'étape en étape (Shiji, Kongzi shijia), puis retour à Lu ; chaque étape prend son cachet à l'arrivée
        const kk = seg(tt, routes - 0.2, mapTo - 1.0) * (ROUTE.length - 1);
        for (let i = 0; i < ROUTE.length - 1; i++) routePinceau(ctx, Pz(ROUTE[i][1]), Pz(ROUTE[i + 1][1]), Math.max(0, Math.min(1, kk - i)), 1, { marge0: 24, marge1: 34, courbe: i % 2 ? 0.2 : -0.2, seed: i + 1 });
        const ETAPES: [number, string, string, 'g' | 'd'][] = [[0, '曲阜', 'Qufu · Lu', 'd'], [1, '衛', 'Wei', 'g'], [2, '曹', 'Cao', 'd'], [3, '宋', 'Song', 'g'], [4, '鄭', 'Zheng', 'g'], [5, '陳', 'Chen', 'd'], [6, '蔡', 'Cai', 'g']];
        ETAPES.forEach(([i, zh, fr, cote]) => lieu(ctx, E, Pz(ROUTE[i][1]), zh, fr, i === 0 ? seg(tt, mapFrom + 0.5, mapFrom + 0.9) : seg(kk, i - 0.9, i - 0.5), { cote, taille: 22, seed: i, fond: true }));
        creditCarte(ctx, E, CARTE);
      }} />
      <EraTag {...cartouche('lu', 'Printemps et Automnes · v. 500 av. J.-C.')} a={1 - seg(t, mapTo - 0.4, mapTo)} fond />
    </AbsoluteFill>
  );
};

// ════════════════ 5. Le bâton du 學記 (clip B, entrée à travers 教) → rouleau 2 (Lu → Han)
const Baton: React.FC = () => {
  const t = useT();
  const A5 = A('b05'), bag = at('b05', 'baguettes'), fr = at('b05', 'frapper');
  const CB = CLIP_B; // début du clip B (dialogue en chinois : 醒來，當讀書矣 à 1,3–2,7 s ; 先生，弟子知過矣 à 4,9–6,7 s du clip)
  return (
    <AbsoluteFill>
      <Cam keys={[[A5 - 0.4, 960, 540, 1.02], [A5 - 0.3, 960, 520, 1.14, 1.0], [fr - 1.3, 960, 540, 1.02, 0.1], [fr - 1.0, 1110, 520, 1.22, 1.0], [R2 - 1.1, 960, 540, 1, 0.8]]}
        punch={[fr]} calm={[[R2 - 0.3, R2 + TR2.duration! + 0.4]]}>
      <TimeScrollStage cfg={TR2} defaultCursor fromLandscape={{ seed: 9, since: A5 - 1 }} toLandscape={{ seed: 3, until: A('b07') + 1, mood: 'brume' }}>
        <Draw draw={(ctx, tt, E) => {
          // 教 au centre avant le clip (le clip entre par ses traits), puis de nouveau à « frapper » : la main pulse
          const a = win(tt, A5 - 0.4, CB + 0.6, 0.4);
          // la citation du Mémoire sur l'étude, calligraphiée à « deux baguettes » : deux colonnes, qui s'effacent à « frapper »
          const qa = seg(tt, bag - 0.2, bag + 0.6) * (1 - seg(tt, fr + 0.2, fr + 0.7));
          if (qa > 0) {
            [['夏楚二物', 1560, bag - 0.2], ['收其威也', 1420, bag + 3.2]].forEach(([s, x, t0]) => {
              [...(s as string)].forEach((ch, i) => E.text(ctx, ch, x as number, 300 + i * 130, { font: 'Kai', size: 110, color: inkCss, alpha: qa * seg(tt, (t0 as number) + i * 0.35, (t0 as number) + 0.5 + i * 0.35) }));
            });
          }
          if (a <= 0) return;
          const pulse = seg(tt, fr, fr + 0.25) * (1 - seg(tt, fr + 0.35, fr + 1.0));
          ctx.save(); ctx.globalAlpha = Math.min(1, a);
          E.drawStrokes(ctx, 'jiao_kai', { x: 960, y: 520, size: 560, brush: false, color: (c: string) => (c === 'hand' ? rgb(P.hand) : inkCss), glow: 40 * pulse, glowColor: rgb(P.hand, 0.8) });
          ctx.restore();
        }} />
      </TimeScrollStage>
      </Cam>
      <Caption text="夏楚二物 · les deux baguettes : le catalpa (夏) et les épines (楚)" a={win(t, bag + 0.1, bag + 3.5, 0.35)} y={900} size={44} />
      <Caption text="收其威也 · pour tenir les élèves en respect" a={win(t, bag + 3.7, fr + 0.3, 0.35)} y={900} size={44} />
      <ClipShot src="baguette" from={CB} len={CLIP_SECONDS.baguette} entry="glyphe" inDur={1.4} vitesse={1} />
      <Caption text="« Réveille-toi, il faut étudier. »" a={win(t, CB + 1.2, CB + 3.2, 0.25)} y={900} size={46} />
      <Caption text="« Maître, ton disciple reconnaît sa faute. »" a={win(t, CB + 4.7, CB + 7.1, 0.25)} y={900} size={46} />
      <EraTag {...cartouche('han', 'v. 100 · Xu Shen 許慎')} a={tagIn(TR2, t) * (1 - seg(t, A('b07'), A('b07') + 0.4))} />
    </AbsoluteFill>
  );
};

// ════════════════ 6. Xu Shen : portrait (repris du 學), définitions du Shuowen, la gauche = baguettes + enfant
const XuShen: React.FC = () => {
  const t = useT();
  const { fps } = useVideoConfig();
  const A6 = A('b06'), let_ = at('b06', 'lettre'), tape = at('b06', 'tape'), ex = at('b06', 'exemple'), g = at('b06', 'gauche'), bag = at('b06', 'baguettes');
  const out = A('b07');
  return (
    <AbsoluteFill>
      <Cam keys={[[A6 - 0.4, 960, 540, 1.02], [let_, 820, 560, 1.06, 3.0], [tape - 1.2, 1060, 560, 1.06, 2.0], [g, 1100, 540, 1.1, 1.6], [out - 1.4, 960, 540, 1.02, 1.2]]}>
      <Paper />
      <Landscape seed={3} from={A6 - 1} to={out + 1} move="still" mood="brume" faint={0.5} />
      {/* Xu Shen : lavis shuimo, puis la couleur gagne par le cœur du personnage et se délave vers les manches et le pinceau */}
      <Sequence from={Math.round((let_ - 1.0) * fps)} durationInFrames={Math.round((out - let_ + 1.0) * fps)}>
        <AbsoluteFill style={{ mixBlendMode: 'multiply', transformOrigin: '25% 100%', transform: 'scale(0.82)', opacity: seg(t, let_ - 0.3, let_ + 0.3) * (1 - seg(t, out - 0.8, out)) }}>
          {/* masque doux : le fond crème de l'image ne dessine pas de rectangle sur le paysage */}
          <AbsoluteFill style={{ WebkitMaskImage: 'radial-gradient(ellipse 42% 58% at 35% 52%, #000 62%, transparent 100%)', maskImage: 'radial-gradient(ellipse 42% 58% at 35% 52%, #000 62%, transparent 100%)' }}>
            <MorphEncre name="xushen" dir="fade" focus={[0.33, 0.45]} end={1} push={0} />
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>
      <Draw draw={(ctx, tt, E) => {
        const a = seg(tt, tape - 1.2, tape - 0.2) * (1 - seg(tt, out - 0.8, out));
        if (a > 0) {
          const soft = seg(tt, tape, tape + 1.2); // « petite tape » : le vermillon s'adoucit
          const lit = { yao: seg(tt, bag - 0.1, bag + 0.6), child: seg(tt, bag + 0.4, bag + 1.0), hand: 1 };
          E.drawRealGlyph(ctx, 'jiao_xiaozhuan', { x: 1340, y: 440, size: 470, opacity: a,
            color: (c: string) => rgb(c === 'hand' ? mixc(P.hand, [226, 150, 130], soft) : mixc(INK, P[c], lit[c as 'yao' | 'child'])),
            alpha: (c: string) => (c === 'hand' ? 1 - 0.45 * seg(tt, g, g + 0.6) : 1),
            glow: 18 * win(tt, bag, out, 0.5), glowColor: rgb(P.child, 0.4) });
        }
      }} />
      <div style={{ position: 'absolute', left: 1100, top: 740, width: 600, textAlign: 'center', background: 'rgba(246,241,231,0.82)', borderRadius: 14, padding: '10px 16px', opacity: win(t, tape - 0.4, ex - 0.2) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 56, color: inkCss }}>攴，小擊也</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, color: '#5b4f44', fontStyle: 'italic' }}>le bâton : « une petite tape »</div>
      </div>
      <div style={{ position: 'absolute', left: 1080, top: 740, width: 700, textAlign: 'center', background: 'rgba(246,241,231,0.82)', borderRadius: 14, padding: '10px 16px', opacity: win(t, ex - 0.1, g - 0.2) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 56, color: inkCss }}>教，上所施下所效也</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 38, color: '#5b4f44', fontStyle: 'italic' }}>ce que fait celui d'en haut, celui d'en bas l'imite</div>
      </div>
      <div style={{ position: 'absolute', left: 1100, top: 740, width: 600, textAlign: 'center', background: 'rgba(246,241,231,0.82)', borderRadius: 14, padding: '10px 16px', opacity: win(t, g + 0.2, out - 0.2) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 56, color: inkCss }}>从攴，从<span style={{ color: rgb(P.yao) }}>爻</span><span style={{ color: rgb(P.child) }}>子</span></div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 38, color: '#5b4f44', fontStyle: 'italic' }}>Shuowen jiezi 說文解字 · v. 100</div>
      </div>
      </Cam>
      <Caption text="portrait imaginé" a={win(t, let_ + 1.2, tape - 0.4)} y={895} size={44} left={1100} width={780} />
      <EraTag {...cartouche('han', 'v. 100 · Xu Shen 許慎')} a={1 - seg(t, out - 0.6, out)} />
    </AbsoluteFill>
  );
};

// ════════════════ 7. Le retournement : le copiste tasse baguettes et enfant → le faux 孝 → rouleau 3 (Han → Song)
const Retournement: React.FC = () => {
  const t = useT();
  const A7 = A('b07'), geste = at('b07', 'geste'), tas = at('b07', 'tasse'), gl = at('b07', 'glisse'), rep_ = at('b07', 'reponse'), jam = at('b07', 'jamais');
  return (
    <AbsoluteFill>
      <Cam keys={[[A7 - 0.3, 960, 540, 1.02], [tas - 0.2, 960, 520, 1.15, 1.2], [gl, 860, 520, 1.3, 1.2], [rep_ - 0.4, 960, 540, 1.02, 0.8], [at('b07', 'vieillard') - 0.2, 1180, 520, 1.18, 1.0], [at('b07', 'ressemblance') - 0.4, 960, 540, 1.02, 0.6]]}
        punch={[jam, at('b07', 'ressemblance')]} calm={[[R3 - 0.4, R3END]]}>
      <Landscape seed={3} from={A7 - 1} to={R3 + 0.6} move="still" mood="jour" />
        <Draw draw={(ctx, tt, E) => {
          const out = 1 - seg(tt, R3 - 0.8, R3 + 0.2);
          if (out <= 0) return;
          // petit sceau → écriture des clercs : baguettes et enfant se tassent (fondu net entre formes)
          const lis = seg(tt, tas - 0.2, tas + 1.0);
          const gold = seg(tt, gl, gl + 1.2) * (1 - seg(tt, rep_ - 0.3, rep_ + 0.4)); // la gauche glisse vers 孝 (ocre)
          const back = seg(tt, jam, jam + 1.0); // « le 孝 n'a jamais été là » : pigments d'origine
          const leftCol = (c: string) => rgb(c === 'hand' ? P.hand : mixc(mixc(P[c], OCRE, gold), P[c], back));
          if (lis < 1) E.drawRealGlyph(ctx, 'jiao_xiaozhuan', { x: 960, y: 520, size: 560, opacity: out * (1 - lis) * seg(tt, A7 - 0.4, A7 + 0.6), color: (c: string) => rgb(P[c]) });
          if (lis > 0) E.drawRealGlyph(ctx, 'jiao_lishu', { x: 960, y: 520, size: 560, opacity: out * lis * (1 - 0.85 * gold) * (1 - seg(tt, at('b07', 'vrai') - 0.8, at('b07', 'vrai'))), color: leftCol });
          // le 孝 « déjà connu » se superpose en ocre à gauche, puis se dissout
          const ghost = seg(tt, gl + 0.4, gl + 1.4) * (1 - seg(tt, rep_ - 0.2, rep_ + 0.8));
          if (ghost > 0) {
            ctx.save(); ctx.globalAlpha = out * ghost;
            E.drawStrokes(ctx, 'xiao_kai', { x: 860, y: 520, size: 420, brush: false, color: () => rgb(OCRE), glow: 20, glowColor: rgb(OCRE, 0.5) });
            ctx.restore();
          }
          // réponse : le signe ancien revient (baguettes, enfant, bâton, main), puis le vrai 孝 en face, puis ≠
          const vrai = at('b07', 'vrai'), vieil = at('b07', 'vieillard'), ress = at('b07', 'ressemblance');
          const anc = seg(tt, jam - 0.2, jam + 0.8);
          const side = seg(tt, vrai - 0.6, vrai + 0.4); // le lishu s'efface, l'ancien glisse à gauche
          if (anc > 0) E.drawRealGlyph(ctx, 'jiao_jiaguwen', { x: 1500 - 920 * side, y: 520, size: 380 + 60 * side, opacity: out * anc, color: (c: string) => rgb(P[c]) });
          const xv = seg(tt, vrai - 0.2, vrai + 0.8);
          if (xv > 0) {
            const old = seg(tt, vieil - 0.1, vieil + 0.6), kid = seg(tt, vieil + 1.6, vieil + 2.3);
            ctx.save(); ctx.globalAlpha = out * xv;
            E.drawStrokes(ctx, 'xiao_kai', { x: 1180, y: 500, size: 440, progress: 7 * seg(tt, vrai, vrai + 1.4), brush: false,
              color: (c: string) => rgb(c === 'old' ? mixc(INK, OCRE, old) : mixc(INK, P.child, kid)) });
            ctx.restore();
          }
          const ne = seg(tt, ress - 0.2, ress + 0.5);
          if (ne > 0) E.text(ctx, '≠', 880, 500, { font: 'Cormorant', size: 220, weight: 700, color: rgb(P.hand), alpha: out * ne });
        }} />
      <Label x={1420} y={360} zh="老" text="un vieillard" color={OCRE} a={win(t, at('b07', 'vieillard') + 0.3, R3 - 0.3, 0.5)} />
      <Label x={1420} y={660} zh="子" text="qui le porte" color={P.child} a={win(t, at('b07', 'vieillard') + 1.8, R3 - 0.3, 0.5)} />
      <div style={{ position: 'absolute', left: 1180 - 300, width: 600, top: 800, textAlign: 'center', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 46, fontWeight: 600, color: '#3b322b', opacity: win(t, at('b07', 'vrai') + 0.8, R3 - 0.3, 0.5) }}>孝 · la piété filiale</div>
      <div style={{ position: 'absolute', left: 580 - 300, width: 600, top: 800, textAlign: 'center', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 46, fontWeight: 600, color: '#3b322b', opacity: win(t, at('b07', 'vrai') + 0.8, R3 - 0.3, 0.5) }}>教 · enseigner (os)</div>
      </Cam>
    </AbsoluteFill>
  );
};

// ════════════════ 8. Song : carte des académies, la Grotte du Cerf blanc, les principes sans punitions
const ACADEMIES: [string, string, number[], number][] = [
  ['白鹿洞', 'Grotte du Cerf blanc · mont Lu', [115.97, 29.53], 1], ['岳麓', 'Yuelu · Changsha', [112.93, 28.18], -1],
  ['嵩陽', 'Songyang · Dengfeng', [113.03, 34.47], -1], ['應天府', 'Yingtianfu · Shangqiu', [115.65, 34.43], 1],
];
const Song: React.FC = () => {
  const t = useT();
  const A8 = A('b08'), acad = at('b08', 'academies'), zx = at('b08', 'zhuxi'), gr = at('b08', 'grotte'), prin = at('b08', 'principes'), refus = at('b08', 'refus'),
    pun = at('b08', 'punitions'), comp = at('b08', 'compris'), bat = at('b08', 'baton');
  const out = A('b09');
  const COLS = ['白鹿洞书院揭示', '博学之审问之', '慎思之明辨之', '笃行之']; // tablette de Zhu Xi (principes d'étude, d'après le Zhongyong)
  return (
    <AbsoluteFill>
      <Cam keys={[[A8 - 0.3, 960, 540, 1.02], [gr + 0.3, 760, 560, 1.12, 1.6], [prin - 0.6, 1290, 520, 1.22, 1.8], [refus + 1.2, 1010, 540, 1.06, 1.6], [comp - 0.6, 720, 540, 1.14, 1.4], [bat - 0.2, 960, 540, 1.05, 1.4], [out - 0.9, 960, 540, 1.02, 0.7]]}
        punch={[gr, prin, bat]}>
      <Paper />
      <Landscape seed={22} from={R3END - 1} to={out + 0.8} move="rise" mood="brume" />
      <Draw draw={(ctx, tt, E) => {
        // cascade : fils d'eau d'encre qui coulent du haut du rocher, brume au pied ; présentes dès l'arrivée à la grotte
        const a = win(tt, gr - 0.6, out - 0.2, 0.9);
        if (a <= 0) return;
        ctx.save();
        for (let i = 0; i < 7; i++) { // nappes de brume au pied de la cascade, qui dérivent
          const cx = 1010 + 210 * Math.sin(tt * 0.22 + i * 1.3), cy = 650 + 26 * Math.sin(tt * 0.31 + i), r = 190 + 40 * (i % 3);
          const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
          g.addColorStop(0, `rgba(244,240,232,${0.5 * a})`); g.addColorStop(1, 'rgba(244,240,232,0)');
          ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        }
        ctx.restore();
        // le cerf blanc (白鹿) : dessin 白描 tracé trait à trait, qui avance lentement
        const dp = seg(tt, gr + 0.3, gr + 3.6), da = win(tt, gr, comp + 0.4, 0.8) * (1 - seg(tt, comp - 0.4, comp + 0.4));
        if (da > 0) {
          const dx = 560 + 70 * seg(tt, gr, comp);
          if (dp < 1) E.drawPortrait(ctx, { key: 'cerf', x: dx, y: 640, height: DEER_H, progress: dp, color: '#2a231d', alpha: da });
          else { buildDeer(E); drawDeer(ctx, dx, 640, tt, da); }
        }
        // le bâton en marge : présent, mais pâle
        const pa = win(tt, comp - 0.2, out - 0.2, 0.7);
        if (pa > 0) {
          const pale = seg(tt, comp + 0.6, bat + 1.0);
          ctx.save(); ctx.globalAlpha = pa * (1 - 0.6 * pale);
          E.drawStrokes(ctx, 'jiao_kai', { x: 640, y: 540, size: 420, brush: false, color: (c: string) => (c === 'hand' ? rgb(mixc(P.hand, [214, 170, 160], pale)) : inkCss), alpha: (c: string) => (c === 'hand' ? 1 : 0.25 + 0.75 * pale) });
          ctx.restore();
        }
      }} />
      {/* tablette des principes, au-dessus de la porte (白鹿洞書院揭示) : laque noire, caractères d'or tracés colonne par colonne */}
      <div style={{ position: 'absolute', left: 1360, top: 150, width: 330, height: 760, background: 'linear-gradient(180deg,#221b16,#17120f)', borderRadius: 8, border: '6px solid rgba(143,111,58,0.85)', boxShadow: '0 14px 30px rgba(40,26,16,0.28)', display: 'flex', flexDirection: 'row-reverse', justifyContent: 'center', gap: 22, padding: 26, opacity: win(t, prin - 0.5, out - 0.2, 0.7) }}>
        {COLS.map((l, i) => {
          const p = seg(t, prin + i * 0.95, prin + i * 0.95 + 1.5);
          return <div key={i} style={{ writingMode: 'vertical-rl', fontFamily: 'ShuimoPinceau', fontSize: i ? 54 : 60, color: i ? '#e6c878' : '#f0cf7a', letterSpacing: 6, clipPath: `inset(0 0 ${100 * (1 - p)}% 0)` }}>{l}</div>;
        })}
      </div>
      {/* le règlement de punitions refusé : une colonne vide, au contour pointillé, qui s'éteint */}
      <div style={{ position: 'absolute', left: 1200, top: 150, width: 100, height: 760, border: `4px dashed ${rgb(P.hand, 0.5)}`, borderRadius: 8, opacity: win(t, pun, comp + 0.6, 0.6) * 0.9 }} />
      </Cam>
      <MapPanel from={acad - 0.6} to={gr + 0.8} draw={(ctx, u, E, tt) => {
        // carte peinte : vue large sur les académies, puis poussée vers le mont Lu (白鹿洞)
        const v = carte(CARTE).vue, e = ease(seg(tt, zx, gr)), cA = E.proj(v, [114.2, 31.2]), cL = E.proj(v, [115.97, 29.53]);
        const C = [cA[0] + (cL[0] - cA[0]) * e, cA[1] + (cL[1] - cA[1]) * e], z = (1.55 + 0.85 * e) * (1 + 0.04 * u);
        const Pz = (p: number[]) => { const o = E.proj(v, p); return [960 + (o[0] - C[0]) * z, 540 + (o[1] - C[1]) * z]; };
        ctx.save(); ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-C[0], -C[1]);
        fondCarte(ctx, E, CARTE);
        ctx.restore();
        ACADEMIES.forEach(([zh, fr, p, side], i) => {
          const a = seg(tt, acad + 0.3 + i * 0.5, acad + 0.7 + i * 0.5) * (i === 0 ? 1 : 1 - seg(tt, zx, zx + 1));
          lieu(ctx, E, Pz(p), zh, fr, a, { cote: side === 1 ? 'd' : 'g', taille: i === 0 ? 30 : 22, seed: i, fond: true });
        });
        creditCarte(ctx, E, CARTE);
      }} />
      <EraTag {...cartouche('song', '1179 · Zhu Xi 朱熹')} a={r3TagIn(R3A, t) * (1 - seg(t, out - 0.6, out))} fond />
    </AbsoluteFill>
  );
};

// ════════════════ 9–10. Aujourd'hui : 11 traits, bandeau des écritures, 教室 / 教育 ; chute ; passerelle 文
const FORMS: [string, string, string][] = [['real:jiao_jiaguwen', '甲骨文', 'Shang'], ['real:jiao_jinwen', '金文', 'Zhou'], ['real:jiao_zhanguo', '楚簡', 'Chu'], ['real:jiao_xiaozhuan', '小篆', 'Qin'], ['real:jiao_lishu', '隸書', 'Han'], ['kai:jiao_kai', '楷書', "aujourd'hui"]];
const drawBand = (ctx: CanvasRenderingContext2D, E: any, tt: number, a: number) => {
  const y = 380, x0 = 480, dx = 228, sz = 220;
  const yao = at('b09', 'yao'), enf = at('b09', 'enfant'), main = at('b09', 'main'), han = at('b09', 'han'), pas = at('b09', 'pasde'), nait = at('b09', 'naissance');
  // phase : composante citée (elle clignote dans les six formes, le reste grisé) ; puis les Han ; puis tout en couleur
  const hi = tt >= pas ? '' : tt >= han ? 'han' : tt >= main ? 'hand' : tt >= enf ? 'child' : tt >= yao ? 'yao' : '';
  const t0 = hi === 'yao' ? yao : hi === 'child' ? enf : hi === 'hand' ? main : hi === 'han' ? han : pas;
  const k = hi ? seg(tt, t0 - 0.05, t0 + 0.3) : 1 - seg(tt, pas - 0.1, pas + 0.5);
  const blink = hi && hi !== 'han' ? 0.5 + 0.5 * Math.cos(Math.min(3, (tt - t0) / 0.32) * Math.PI * 2) : 0; // trois clignements
  const isHi = (c: string) => c === hi || (hi === 'hand' && c === 'stick');
  const color = (i: number) => (c: string) => {
    if (hi === 'han') return rgb(i === 4 && c !== 'hand' ? OCRE : mixc(P[c], GREY, k));
    return rgb(!hi || isHi(c) ? P[c] : mixc(P[c], GREY, k));
  };
  const alpha = (i: number) => (c: string) => (hi === 'han' ? (i === 4 ? 1 : 1 - 0.6 * k) : !hi || isHi(c) ? 1 : 1 - 0.55 * k);
  FORMS.forEach(([key, zh, fr], i) => {
    const appear = seg(tt, at('b09', 'formes') - 0.6 + i * 0.12, at('b09', 'formes') - 0.2 + i * 0.12) * a;
    if (appear <= 0) return;
    const x = x0 + i * dx, big = 1, s2 = sz * big;
    const glow = hi && hi !== 'han' ? 26 * blink * k : 0, gc = hi === 'hand' ? P.hand : P[hi] ?? INK;
    ctx.save(); ctx.globalAlpha = appear;
    if (key.startsWith('real:')) E.drawRealGlyph(ctx, key.slice(5), { x, y, size: s2, color: color(i), alpha: alpha(i), glow, glowColor: rgb(gc, 0.8) });
    else E.drawStrokes(ctx, key.slice(4), { x, y, size: s2 * 0.9, brush: false, color: color(i), alpha: alpha(i), glow, glowColor: rgb(gc, 0.8) });
    E.text(ctx, zh, x, y + 168, { font: 'Kai', size: 60, color: inkCss, alpha: appear });
    E.text(ctx, fr, x, y + 228, { font: 'Cormorant', size: 44, weight: 700, color: '#5b4f44', alpha: appear });
    ctx.restore();
  });
  // Han : un 孝 barré au-dessus du 隸書
  const hx = win(tt, han + 0.6, pas + 0.8, 0.4) * a;
  if (hx > 0) {
    const x = x0 + 4 * dx;
    E.text(ctx, '孝', x, y - 200, { font: 'Kai', size: 110, color: rgb(OCRE), alpha: hx });
    ctx.save(); ctx.globalAlpha = hx * seg(tt, at('b09', 'xiao') + 0.6, at('b09', 'xiao') + 1.2); ctx.strokeStyle = rgb(P.hand); ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 70, y - 250); ctx.lineTo(x + 70, y - 150); ctx.stroke(); ctx.restore();
  }
  // rubans : où vit chaque composante, à travers les six formes
  const rows: [string, string][] = [['yao', 'baguettes'], ['child', 'enfant'], ['hand', 'main au bâton']];
  const grow = seg(tt, yao - 0.6, yao + 0.6);
  rows.forEach(([c, lab], j) => {
    const yy = 790 + j * 76, xa = x0 - 60, xb = x0 + 5 * dx + 60;
    const on = !hi || hi === c || hi === 'han';
    const col = on ? P[c] : mixc(P[c], GREY, k);
    const al = a * grow * (on ? 1 : 1 - 0.5 * k) * (hi === c ? 0.75 + 0.25 * blink : 1);
    ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = rgb(col); ctx.lineWidth = hi === c ? 22 : 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xa + (xb - xa) * grow, yy); ctx.stroke(); ctx.restore();
    E.text(ctx, lab, xa - 24, yy, { font: 'Cormorant', size: 56, weight: 700, align: 'right', color: rgb(col), alpha: al });
  });
};

const Today: React.FC = () => {
  const t = useT();
  const A9 = A('b09'), tr = at('b09', 'traits'), yao = at('b09', 'yao'), nait = at('b09', 'naissance'), cl = at('b09', 'classe'), mt = at('b09', 'education');
  const A10 = A('b10'), max = at('b10', 'maxime'), wen = at('b10', 'wen'), ori = at('b10', 'origine'), hom = at('b10', 'homme');
  return (
    <AbsoluteFill>
      <Cam keys={[[A9 - 0.3, 960, 540, 1.02], [A10 - 0.5, 960, 540, 1.02, 1.0], [max, 960, 540, 1.08, 4.0], [wen - 0.4, 960, 540, 1.02, 0.6], [hom, 960, 470, 1.2, 1.6]]}
        punch={[]}>
      <Paper />
      <Landscape seed={30} from={A9 - 1.5} to={END + 0.5} move="pan" mood="aube" faint={0.6} front={false} />
      <Draw draw={(ctx, tt, E) => {
        const syn = win(tt, at('b09', 'formes') - 0.8, nait + 0.6, 0.6);
        if (syn > 0) drawBand(ctx, E, tt, syn);
        // 教 en 11 traits (compteur), puis après la synthèse ; fiche à la chute
        const main = (1 - syn) * (1 - seg(tt, wen - 0.4, wen + 0.4));
        if (main > 0) {
          const fiche = seg(tt, A10 - 0.4, A10 + 0.6);
          ctx.save(); ctx.globalAlpha = main;
          E.drawStrokes(ctx, 'jiao_kai', { x: 960 - 260 * fiche, y: 500, size: 560 - 80 * fiche, progress: 11 * seg(tt, A9 + 0.2, tr + 1.6), brush: false,
            color: (c: string) => (tt > nait ? rgb(mixc(INK, P[c], win(tt, nait, cl, 0.5))) : inkCss) });
          ctx.restore();
        }
        // passerelle : 文, un homme de face, le motif de la poitrine en vermillon
        const w = seg(tt, wen + 0.2, wen + 1.4);
        if (w > 0) {
          const heart = seg(tt, hom + 0.4, hom + 1.2);
          E.drawRealGlyph(ctx, 'wen_jinwen', { x: 960, y: 500, size: 560, opacity: w, color: (c: string) => (c === 'heart' ? rgb(mixc(INK, P.heart, heart)) : inkCss), glow: 30 * heart, glowColor: rgb(P.hand, 0.6) });
        }
      }} />
      </Cam>
      <div style={{ position: 'absolute', width: '100%', top: 840, display: 'flex', justifyContent: 'center', gap: 160, fontFamily: 'ShuimoKai', fontSize: 72, color: inkCss }}>
        <span style={{ opacity: win(t, cl - 0.2, A10 - 0.3) }}>教室<div style={{ fontFamily: 'ShuimoLatin', fontSize: 38, textAlign: 'center' }}>la salle de classe</div></span>
        <span style={{ opacity: win(t, mt - 0.4, A10 - 0.3) }}>教育<div style={{ fontFamily: 'ShuimoLatin', fontSize: 38, textAlign: 'center' }}>l'éducation</div></span>
      </div>
      {/* fiche : sceau, pinyin, nombre de traits */}
      <div style={{ position: 'absolute', left: 1080, top: 300, opacity: win(t, A10 + 0.2, wen - 0.3, 0.6) }}>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 96, fontWeight: 600, color: inkCss }}>jiào</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 48, color: '#5b4f44' }}>enseigner</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 44, color: rgb(P.hand), marginTop: 18 }}>11 traits</div>
        <div style={{ marginTop: 26, width: 96, height: 96, background: rgb(P.hand, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0' }}>教</div>
      </div>
      <Caption text="Enseigner, c'est frapper doucement à la porte d'un esprit." a={win(t, max - 0.1, wen - 0.3, 0.6)} y={900} size={50} />
      <Caption text="文 · wén · la culture, l'écriture" a={win(t, wen + 1.0, ori, 0.5)} y={880} size={50} />
    </AbsoluteFill>
  );
};

// écran de fin (≈ 10 s) sur papier, en shuimo : la marque et le prochain caractère dans le tiers gauche ; les deux tiers
// droits restent libres pour les éléments de fin YouTube ; jamais de fond noir
const EndCard: React.FC = () => {
  const t = useT(), a = seg(t, END, END + 0.8);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Paper />
      <Landscape seed={30} from={END - 1} to={JIAO_SECONDS + 1} move="still" mood="aube" faint={0.35} front={false} />
      <div style={{ position: 'absolute', left: 120, top: 150, width: 520, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ width: 100, height: 150, background: rgb(P.hand, 0.95), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 40, letterSpacing: 4, color: '#f6eee0', writingMode: 'vertical-rl', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>墨之道</div>
          <div>
            <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss, lineHeight: 1.15 }}>LA VOIE<br />DE L'ENCRE</div>
            <div style={{ marginTop: 8, fontFamily: 'ShuimoLatin', fontSize: 38, fontStyle: 'italic', color: '#5e5044' }}>Mò zhī dào</div>
          </div>
        </div>
        <div style={{ marginTop: 70, fontFamily: 'ShuimoLatin', fontSize: 46, color: '#5e5044', opacity: seg(t, END + 0.8, END + 1.6) }}>Prochain caractère</div>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 260, lineHeight: 1, color: inkCss, opacity: seg(t, END + 1.2, END + 2.2) }}>文</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 60, fontWeight: 600, color: '#3b322b', opacity: seg(t, END + 1.6, END + 2.6) }}>wén · la culture, l'écriture</div>
      </div>
    </AbsoluteFill>
  );
};

const Win: React.FC<{ from: number; to: number; fade?: number; children: React.ReactNode }> = ({ from, to, fade = 0, children }) => {
  const t = useT();
  if (t < from - fade || t >= to) return null;
  return fade > 0 ? <AbsoluteFill style={{ opacity: ease(seg(t, from - fade, from)) }}>{children}</AbsoluteFill> : <>{children}</>;
};

// bruitages discrets (ElevenLabs text-to-sound, episodes/jiao/audio/sfx_*.wav) : liste dans episode.json « bruitages »,
// résolue en temps absolus par reperes.py (_ligne.bruitages) — la même liste sert au mixage de bande_son.py
const SFX = (L.bruitages ?? []) as [string, number, number][];

export const JiaoV1: React.FC = () => {
  const ready = useSetup();
  const { fps } = useVideoConfig();
  const clips: Clip[] = ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b08', 'b09', 'b10'];
  const voice = (k: Clip) => {
    const c = L.clips[k], src = staticFile(`episodes/jiao/voix/${k}.wav`);
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
      {ready && <Shake impacts={IMPACTS}>
        <Win from={0} to={A('b03') - 0.01}><Opening /></Win>
        <Win from={A('b03') - 0.01} to={A('b04') + 0.1}><ShangLu /></Win>
        <Win fade={0.4} from={A('b04') + 0.1} to={A('b05') - 0.4}><Confucius /></Win>
        <Win fade={0.6} from={A('b05') - 0.4} to={A('b06') + 0.1}><Baton /></Win>
        <Win fade={0.4} from={A('b06') + 0.1} to={A('b07') - 0.3}><XuShen /></Win>
        <Win fade={0.8} from={A('b07') - 0.3} to={R3 + 0.3}><Retournement /></Win>
        <Win from={R3END - 0.5} to={A('b09') - 0.3}><Song /></Win>
        <Win fade={0.8} from={A('b09') - 0.3} to={END + 0.9}><Today /></Win>
        <Win from={END} to={JIAO_SECONDS + 1}><EndCard /></Win>
        {/* clip de la carapace : plein cadre, entrée à travers 教, sortie au pinceau, au-dessus des scènes */}
        <ClipShot src="carapace" from={at('b02', 'os') + 0.1} len={at('b03', 'ateliers') + 0.5 - at('b02', 'os') - 0.1} entry="glyphe" inDur={1.6} debut={1.0} />
      </Shake>}
      {ready && <Win from={R3 - 1.5} to={R3END + 3.5}><Rouleau3DStage cfg={R3A} /></Win>}
      {ready && <GrainVignette />}
      {SFX.map(([n, tt, v], i) => (
        <Sequence key={`sfx${i}`} from={Math.round(tt * fps)}><Audio src={staticFile(`episodes/jiao/audio/sfx_${n}.wav`)} volume={v} /></Sequence>
      ))}
      {clips.map(voice)}
      <Audio src={staticFile('episodes/jiao/audio/musique.wav')} volume={(f) => 0.55 * (MF ? Math.max(0, Math.min(1, 1 - (f / fps - MF.debut) / 2)) : 1)} />
      {/* musique de fin (bamboo grove) : discrète sous la dernière phrase, pleine sur l'écran de fin, puis fondu */}
      {MF && <Sequence from={Math.round(MF.debut * fps)}><Audio src={staticFile(`musique/${MF.fichier}`)} startFrom={Math.round(MF.depart * fps)}
        volume={(f) => { const s = f / fps, fv = MF.fin_voix - MF.debut, lg = MF.fin - MF.debut;
          const v = s < fv ? MF.volume_voix * Math.min(1, s / MF.montee) : MF.volume_voix + (MF.volume - MF.volume_voix) * Math.min(1, (s - fv) / MF.montee);
          return v * Math.max(0, Math.min(1, (lg - s) / MF.fondu)); }} /></Sequence>}
    </AbsoluteFill>
  );
};
