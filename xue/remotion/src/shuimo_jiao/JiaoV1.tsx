// 教 (jiào), version tout shuimo — episodes/jiao/PROPOSITION.md.
// Question : pourquoi « enseigner » cache-t-il 孝 (la piété filiale)… et un bâton ? Voyage Shang (os d'exercice) →
// Confucius (Lu, carte et itinéraire) → le bâton du 學記 → Xu Shen → le faux 孝 des copistes Han → académies Song
// (carte) → aujourd'hui (synthèse) → passerelle 文. Ligne de temps lue dans les repères (outils/video_shuimo,
// episodes/jiao/voix/reperes.json, « _ligne »), jamais recalculée ici.
// En attente : clips Seedance A et B (clips d'exemple en place).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose, Mood } from '../shuimo/layout';
import { INK, PIGMENT } from '../shuimo_xue/InkStage';
import { Era, TimeScrollConfig, TimeScrollStage, arrivePose, cursorPose, morphK, tagIn } from '../rouleau/TimeScroll';
import { VideoReveal } from '../video_encre/VideoReveal';
import { CloudReveal } from '../video_encre/CloudReveal';
import { loadLegacy, W } from '../legacy';
import rep from '../data/episodes/jiao.json';

type Clip = 'b01' | 'b02' | 'b03' | 'b04' | 'b05' | 'b06' | 'b07' | 'b08' | 'b09' | 'b10';
type Rep = Record<Clip, { duration: number; cues: Record<string, number> }> & {
  _ligne: { clips: Record<Clip, { debut: number; duree: number; pause?: { coupe: number; duree: number } }>; rouleaux: { debut: number; duree: number }[]; fin: number; total: number };
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
const END = L.fin;

// époques du 教 (sceaux de la frise des rouleaux)
const ERAS: Era[] = [
  { zh: '商', date: '−1200' }, { zh: '周', date: '−1046' }, { zh: '魯', date: '−520' }, { zh: '漢', date: '100' }, { zh: '宋', date: '1179' }, { zh: '今', date: '2026' },
];
const [R1, R2, R3] = L.rouleaux.map((r) => r.debut);
const TR1: TimeScrollConfig = { at: R1, duration: L.rouleaux[0].duree, eras: ERAS, from: 0, to: 2, years: [-1200, -520] };
const TR2: TimeScrollConfig = { at: R2, duration: L.rouleaux[1].duree, eras: ERAS, from: 2, to: 3, years: [-480, 100] };
const TR3: TimeScrollConfig = { at: R3, duration: L.rouleaux[2].duree, eras: ERAS, from: 3, to: 4, years: [100, 1179] };

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const inkCss = rgb(INK);
// pigments constants : 爻 gomme-gutte, 子 azurite, main au bâton 攴 vermillon ; le 孝 « fantôme » en ocre pâle
const P: Record<string, number[]> = { yao: PIGMENT.yao, child: PIGMENT.child, hand: PIGMENT.hand, old: [176, 138, 92], body: INK, heart: PIGMENT.hand };
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
const Paper: React.FC = () => <AbsoluteFill style={{ background: `#f3eee4 url(${staticFile('shuimo/paper.jpg')}) center/cover` }} />;

// clips 3D plein cadre (clips d'exemple en attendant les clips Seedance A et B) : entrée par les nuages, ou à travers
// le caractère 教 quand il est à l'écran juste avant ; sortie par les coups de pinceau
const CLIPS = { atelier: 'exemples_videos/exemple_plan_fixe.mp4', baguette: 'exemples_videos/exemple_transformation.mp4' };
const CLIP_SRC_SECONDS = 7.8;
const ClipShot: React.FC<{ src: keyof typeof CLIPS; from: number; len: number; entry: 'nuages' | 'glyphe'; inDur?: number }> = ({ src, from, len, entry, inDur = 3.2 }) => {
  const { fps } = useVideoConfig();
  const rate = Math.min(0.9, CLIP_SRC_SECONDS / len);
  if (entry === 'glyphe') {
    return (
      <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(len * fps)}>
        <VideoReveal src={CLIPS[src]} mode="glyphe" glyph="教" outMode="pinceau" inDur={inDur} outDur={2.4} playbackRate={rate} zoom={1} />
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
    <div style={{ width: 92, height: 92, background: rgb(P.hand, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>{zh}</div>
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
// couleur d'une composante : encre → pigment selon lit[c] (0–1), grisée selon dim
const compColor = (lit: Record<string, number>, dim = 0, hi = '') => (c: string) => {
  let col = mixc(INK, P[c] ?? INK, lit[c] ?? 0);
  if (dim > 0 && hi && c !== hi) col = mixc(col, GREY, dim);
  return rgb(col);
};

// ════════════════ 1–2. Accroche (教 tracé, le faux 孝, le bâton) et rappel du 學
const Opening: React.FC = () => {
  const t = useT();
  const A1 = A('b01'), xiao = at('b01', 'xiao'), baton = at('b01', 'baton'), ment = at('b01', 'mentait');
  const xue = at('b02', 'xue'), armee = at('b02', 'armee'), classe = at('b02', 'classe');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={14} from={classe - 0.4} to={A('b03') + 14} move="push" mood="aube" />
      <Draw draw={(ctx, tt, E) => {
        // 教 en 11 traits ; la gauche s'allume en ocre (« on croit lire 孝 »), la main au bâton en vermillon
        const a = 1 - seg(tt, xue - 0.6, xue);
        if (a > 0) {
          const left = seg(tt, xiao + 0.6, xiao + 1.3), hand = seg(tt, baton - 0.2, baton + 0.5);
          const shake = seg(tt, ment - 0.1, ment + 0.2) * (1 - seg(tt, ment + 1.0, ment + 1.6));
          const dx = shake * 6 * Math.sin(tt * 55);
          ctx.save(); ctx.globalAlpha = a;
          E.drawStrokes(ctx, 'jiao_kai', {
            x: 960, y: 520, size: 600, progress: 11 * seg(tt, A1 - 0.3, A1 + 2.0), brush: false,
            color: (c: string) => (c === 'hand' ? rgb(mixc(INK, P.hand, hand)) : rgb(mixc(INK, OCRE, left))),
            glow: 22 * Math.max(hand, left) * (1 - seg(tt, ment + 1, ment + 2)), glowColor: rgb(hand > left ? P.hand : OCRE, 0.5),
          });
          ctx.restore();
          // tremblement du faux 孝 : un double décalé de la gauche
          if (shake > 0) {
            ctx.save(); ctx.globalAlpha = a * 0.45 * shake; ctx.translate(dx, 0);
            E.drawStrokes(ctx, 'jiao_kai', { x: 960, y: 520, size: 600, brush: false, color: () => rgb(OCRE), alpha: (c: string) => (c === 'hand' ? 0 : 1) });
            ctx.restore();
          }
        }
        // rappel du 學 : 學 (bronze) à gauche, mains vermillon ; 教 (os) à droite ; les deux mains s'éteignent,
        // la main au bâton s'allume
        const r = win(tt, xue - 0.3, classe + 0.6, 0.6);
        if (r > 0) {
          const off = seg(tt, armee - 2.6, armee - 1.6), arm = seg(tt, armee - 0.2, armee + 0.5);
          const shrink = seg(tt, classe + 0.2, classe + 1.6);
          E.drawRealGlyph(ctx, 'jinwen', { x: 600, y: 500, size: 460 * (1 - 0.6 * shrink), opacity: r,
            color: (c: string) => rgb(c === 'hand' ? mixc(P.hand, GREY, off) : c === 'child' ? P.child : c === 'yao' ? P.yao : INK),
            alpha: (c: string) => (c === 'hand' ? 1 - 0.6 * off : 1) });
          E.drawRealGlyph(ctx, 'jiao_jiaguwen', { x: 1320, y: 500, size: 460 * (1 - 0.6 * shrink), opacity: r,
            color: (c: string) => rgb(c === 'hand' ? mixc(INK, P.hand, arm) : c === 'child' ? P.child : P.yao),
            glow: 26 * arm * (1 - shrink), glowColor: rgb(P.hand, 0.6) });
        }
      }} />
      <Caption text="教 · jiào · enseigner" a={win(t, A1 + 1.4, xiao - 0.2)} y={880} size={48} />
      <Caption text="孝 · xiào · la piété filiale ?" a={win(t, xiao + 0.8, baton - 0.3)} y={880} size={48} />
      <Caption text="攵 · une main qui tient un bâton" a={win(t, baton + 0.2, ment)} y={880} size={48} />
      <Caption text="學 · apprendre" a={win(t, xue + 0.2, classe, 0.4)} y={820} size={48} />
      <div style={{ position: 'absolute', left: 1320 - 200, width: 400, top: 820, textAlign: 'center', fontFamily: 'ShuimoLatin', fontSize: 48, color: '#5b4f44', opacity: win(t, xue + 0.6, classe, 0.4) }}>教 · enseigner</div>
    </AbsoluteFill>
  );
};

// ════════════════ 3. Shang : l'atelier (clip A), l'os d'exercice, le signe → rouleau 1 (Shang → Lu)
const GANZHI = '甲子乙丑丙寅丁卯戊辰己巳';
const ShangLu: React.FC = () => {
  const t = useT();
  const A3 = A('b03'), mait = at('b03', 'maitre'), elev = at('b03', 'eleve'), sig = at('b03', 'signe'), yao = at('b03', 'yao'), enf = at('b03', 'enfant'), bat = at('b03', 'baton');
  return (
    <AbsoluteFill>
      <TimeScrollStage cfg={TR1} under={<Landscape seed={14} from={A3 - 2} to={A3 + 14} move="pan" mood="aube" />}
        fromLandscape={{ seed: 5, since: mait - 1 }} toLandscape={{ seed: 9, until: A('b05') + 1 }}>
        <Draw draw={(ctx, tt, E) => {
          // os d'exercice : estampage, une colonne nette (le maître), une colonne tremblée (l'élève)
          const bone = win(tt, mait - 0.6, sig + 0.6, 0.8);
          if (bone > 0) {
            ctx.save(); ctx.globalAlpha = bone;
            ctx.fillStyle = 'rgba(40,34,30,0.86)'; E.roundRect(ctx, 720, 140, 480, 820, 160); ctx.fill();
            const n = GANZHI.length;
            for (let i = 0; i < n; i++) {
              const m = seg(tt, mait + 0.3 + i * 0.12, mait + 0.5 + i * 0.12);
              E.text(ctx, GANZHI[i], 880, 205 + i * 62, { font: 'Kai', size: 54, color: '#efe6d6', alpha: m });
              const s = seg(tt, elev - 3.0 + i * 0.14, elev - 2.8 + i * 0.14), j = (k: number) => Math.sin(i * 12.9898 + k) * 7;
              ctx.save(); ctx.translate(1040 + j(1), 205 + i * 62 + j(2)); ctx.rotate(j(3) / 60);
              E.text(ctx, GANZHI[i], 0, 0, { font: 'Kai', size: 50 + j(4), color: '#efe6d6', alpha: s * 0.85 });
              ctx.restore();
            }
            ctx.restore();
          }
          // le signe 教 (os) : révélé en blanc, puis à l'encre ; 爻, 子, 攴 prennent leurs pigments sur leurs mots ;
          // pendant le rouleau il devient le curseur de la frise et se change en signe de bronze
          const reveal = seg(tt, sig, sig + 1.2);
          if (reveal > 0 && tt < R1 + TR1.duration! + 0.1) {
            const lit = { yao: seg(tt, yao, yao + 0.7), child: seg(tt, enf, enf + 0.7), hand: seg(tt, bat, bat + 0.7) };
            const dry = seg(tt, sig + 0.8, sig + 1.8);
            const mk = morphK(TR1, tt);
            const p = cursorPose(TR1, tt), q = arrivePose(TR1, tt);
            const col = (c: string) => rgb(mixc(mixc([240, 233, 219], INK, dry), P[c], lit[c as keyof typeof lit] ?? 0));
            if (mk < 1) E.drawRealGlyph(ctx, 'jiao_jiaguwen', { x: p.x, y: p.y, size: 600 * p.s, reveal: () => reveal, opacity: 1 - mk, color: col });
            if (mk > 0) E.drawRealGlyph(ctx, 'jiao_jinwen', { x: q.x, y: q.y, size: 600 * q.s, opacity: mk * (1 - seg(tt, R1 + TR1.duration! - 0.3, R1 + TR1.duration! + 0.1)), color: (c: string) => rgb(P[c]) });
          }
        }} />
      </TimeScrollStage>
      <ClipShot src="atelier" from={at('b03', 'ateliers') - 0.6} len={mait - at('b03', 'ateliers') + 0.4} entry="nuages" />
      <EraTag zh="商" name="SHANG" dates="Anyang · XIIIe–XIe s. av. J.-C." a={win(t, A3 + 0.3, R1 + 0.4, 0.8)} />
      <EraTag zh="魯" name="LU" dates="Printemps et Automnes · v. 500 av. J.-C." a={tagIn(TR1, t) * (1 - seg(t, R2, R2 + 0.4))} />
      <Caption text="os d'exercice : la colonne du maître, la copie de l'élève" a={win(t, mait + 1.2, sig)} />
      <Label x={1240} y={330} zh="爻" text="baguettes" color={P.yao} a={win(t, yao + 0.3, R1, 0.6)} />
      <Label x={1240} y={720} zh="子" text="l'enfant" color={P.child} a={win(t, enf + 0.3, R1, 0.6)} />
      <Label x={680} y={520} zh="攴" text="main au bâton" color={P.hand} a={win(t, bat + 0.3, R1, 0.6)} align="right" />
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
      {/* dessin 白描 de Confucius sous l'abricotier (episodes/jiao/images/confucius_baimiao_1.jpg), peint trait à trait en 3 s */}
      <AbsoluteFill style={{ opacity: win(t, conf - 0.8, mapFrom + 0.6, 0.7) }}>
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
      </AbsoluteFill>
      <Caption text="portrait imaginé" a={win(t, conf + 0.4, mapFrom, 0.5)} y={1036} size={26} />
      <Caption text="有教無類 · « enseigner à tous, sans distinction » (Entretiens, XV, 39)" a={win(t, regle + 0.2, mapFrom, 0.5)} y={980} />
      <MapPanel from={mapFrom} to={mapTo} draw={(ctx, u, E, tt) => {
        const z = ease(seg(tt, mapFrom, mapFrom + 2)), v = { lon: 116.5 - 1.2 * z, lat: 35.2 - 0.6 * z, k: 150 + 110 * z };
        E.drawMap(ctx, tt, v, { paper: true, rivers: 1 });
        E.region(ctx, v, 'zhou_states', 'rgba(52,132,98,0.12)', seg(tt, mapFrom + 0.2, mapFrom + 1.2));
        E.marker(ctx, tt, v, QUFU, 'Qufu', 'royaume de Lu', seg(tt, mapFrom + 0.5, mapFrom + 0.9), '#c0392b', 1);
        // itinéraire tracé au pinceau (pointillé) de royaume en royaume, puis retour à Lu
        const k = seg(tt, routes - 0.2, mapTo - 1.0) * (ROUTE.length - 1);
        if (k > 0) {
          ctx.save(); ctx.strokeStyle = rgb(P.hand, 0.85); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([16, 14]);
          ctx.beginPath();
          for (let i = 0; i <= Math.min(Math.floor(k), ROUTE.length - 1); i++) { const q = E.proj(v, ROUTE[i][1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
          const i0 = Math.floor(k), f = k - i0;
          if (i0 < ROUTE.length - 1 && f > 0) {
            const a0 = ROUTE[i0][1], a1 = ROUTE[i0 + 1][1];
            const q = E.proj(v, [a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f]); ctx.lineTo(q[0], q[1]);
          }
          ctx.stroke(); ctx.restore();
          ROUTE.slice(1, -1).forEach(([n, p], i) => {
            if (k < i + 1) return;
            const q = E.proj(v, p);
            ctx.save(); ctx.fillStyle = rgb(INK); ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, 7); ctx.fill(); ctx.restore();
            if (n !== 'Wei' || i === 0) E.text(ctx, n, q[0] + (i % 2 ? -18 : 18), q[1] - 30, { size: 42, weight: 700, align: i % 2 ? 'right' : 'left', color: '#3b322b', glow: 10, glowColor: 'rgba(246,241,231,1)' });
          });
        }
      }} />
      <Caption text="quatorze ans sur les routes (v. 497–484 av. J.-C.)" a={win(t, routes + 0.6, mapTo - 0.2, 0.5)} y={980} size={40} />
      <EraTag zh="魯" name="LU" dates="Printemps et Automnes · v. 500 av. J.-C." a={seg(t, A4 - 0.2, A4 + 0.4) * (1 - seg(t, mapTo - 0.4, mapTo))} />
    </AbsoluteFill>
  );
};

// ════════════════ 5. Le bâton du 學記 (clip B, entrée à travers 教) → rouleau 2 (Lu → Han)
const Baton: React.FC = () => {
  const t = useT();
  const A5 = A('b05'), bag = at('b05', 'baguettes'), fr = at('b05', 'frapper');
  return (
    <AbsoluteFill>
      <TimeScrollStage cfg={TR2} defaultCursor fromLandscape={{ seed: 9, since: A5 - 1 }} toLandscape={{ seed: 3, until: A('b07') + 1, mood: 'brume' }}>
        <Draw draw={(ctx, tt, E) => {
          // 教 au centre avant le clip (le clip entre par ses traits), puis de nouveau à « frapper » : la main pulse
          const a = win(tt, A5 - 0.4, A5 + 1.4, 0.4) + win(tt, fr - 1.2, R2 + 0.4, 0.4);
          if (a <= 0) return;
          const pulse = seg(tt, fr, fr + 0.25) * (1 - seg(tt, fr + 0.35, fr + 1.0));
          ctx.save(); ctx.globalAlpha = Math.min(1, a);
          E.drawStrokes(ctx, 'jiao_kai', { x: 960, y: 520, size: 560, brush: false, color: (c: string) => (c === 'hand' ? rgb(P.hand) : inkCss), glow: 40 * pulse, glowColor: rgb(P.hand, 0.8) });
          ctx.restore();
        }} />
      </TimeScrollStage>
      <ClipShot src="baguette" from={A5 + 0.6} len={fr - A5 - 1.4} entry="glyphe" inDur={2.6} />
      <Caption text="夏楚二物，收其威也 · Mémoire sur l'étude 學記" a={win(t, bag - 0.2, fr - 1.2, 0.5)} y={960} size={40} />
      <EraTag zh="漢" name="HAN" dates="v. 100 · Xu Shen 许慎" a={tagIn(TR2, t) * (1 - seg(t, A('b07'), A('b07') + 0.4))} />
    </AbsoluteFill>
  );
};

// ════════════════ 6. Xu Shen : portrait (repris du 學), définitions du Shuowen, la gauche = baguettes + enfant
const XuShen: React.FC = () => {
  const t = useT();
  const A6 = A('b06'), let_ = at('b06', 'lettre'), tape = at('b06', 'tape'), ex = at('b06', 'exemple'), g = at('b06', 'gauche'), bag = at('b06', 'baguettes');
  const out = A('b07');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={3} from={A6 - 1} to={out + 1} move="still" mood="brume" faint={0.5} />
      <Draw draw={(ctx, tt, E) => {
        E.drawPortrait(ctx, { x: 520, y: 590, height: 640, progress: seg(tt, let_ - 0.2, let_ + 2.8), color: '#2a231d', alpha: 1 - seg(tt, out - 0.8, out) });
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
      <Caption text="portrait imaginé" a={win(t, let_ + 1.2, out - 0.5)} y={960} size={24} />
      <EraTag zh="漢" name="HAN" dates="v. 100 · Xu Shen 许慎" a={1 - seg(t, out - 0.6, out)} />
      <div style={{ position: 'absolute', left: 1060, top: 730, width: 560, textAlign: 'center', opacity: win(t, tape - 0.4, ex - 0.2) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 56, color: inkCss }}>攴，小擊也</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, color: '#5b4f44', fontStyle: 'italic' }}>le bâton : « une petite tape »</div>
      </div>
      <div style={{ position: 'absolute', left: 1000, top: 730, width: 680, textAlign: 'center', opacity: win(t, ex - 0.1, g - 0.2) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 56, color: inkCss }}>教，上所施下所效也</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 38, color: '#5b4f44', fontStyle: 'italic' }}>ce que fait celui d'en haut, celui d'en bas l'imite</div>
      </div>
      <div style={{ position: 'absolute', left: 1060, top: 730, width: 560, textAlign: 'center', opacity: win(t, g + 0.2, out - 0.2) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 56, color: inkCss }}>从攴，从<span style={{ color: rgb(P.yao) }}>爻</span><span style={{ color: rgb(P.child) }}>子</span></div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 38, color: '#5b4f44', fontStyle: 'italic' }}>Shuowen jiezi 說文解字 · v. 100</div>
      </div>
    </AbsoluteFill>
  );
};

// ════════════════ 7. Le retournement : le copiste tasse baguettes et enfant → le faux 孝 → rouleau 3 (Han → Song)
const Retournement: React.FC = () => {
  const t = useT();
  const A7 = A('b07'), geste = at('b07', 'geste'), tas = at('b07', 'tasse'), gl = at('b07', 'glisse'), rep_ = at('b07', 'reponse'), jam = at('b07', 'jamais');
  return (
    <AbsoluteFill>
      <TimeScrollStage cfg={TR3} defaultCursor fromLandscape={{ seed: 3, since: A7 - 1 }} toLandscape={{ seed: 22, until: A('b09') + 1, mood: 'brume' }}>
        <Draw draw={(ctx, tt, E) => {
          const out = 1 - seg(tt, R3 - 0.8, R3 + 0.2);
          if (out <= 0) return;
          // petit sceau → écriture des clercs : baguettes et enfant se tassent (fondu net entre formes)
          const lis = seg(tt, tas - 0.2, tas + 1.0);
          const gold = seg(tt, gl, gl + 1.2) * (1 - seg(tt, rep_ - 0.3, rep_ + 0.4)); // la gauche glisse vers 孝 (ocre)
          const back = seg(tt, jam, jam + 1.0); // « le 孝 n'a jamais été là » : pigments d'origine
          const leftCol = (c: string) => rgb(c === 'hand' ? P.hand : mixc(mixc(P[c], OCRE, gold), P[c], back));
          if (lis < 1) E.drawRealGlyph(ctx, 'jiao_xiaozhuan', { x: 960, y: 520, size: 560, opacity: out * (1 - lis) * seg(tt, A7 - 0.4, A7 + 0.6), color: (c: string) => rgb(P[c]) });
          if (lis > 0) E.drawRealGlyph(ctx, 'jiao_lishu', { x: 960, y: 520, size: 560, opacity: out * lis * (1 - 0.85 * gold), color: leftCol });
          // le 孝 « déjà connu » se superpose en ocre à gauche, puis se dissout
          const ghost = seg(tt, gl + 0.4, gl + 1.4) * (1 - seg(tt, rep_ - 0.2, rep_ + 0.8));
          if (ghost > 0) {
            ctx.save(); ctx.globalAlpha = out * ghost;
            E.drawStrokes(ctx, 'xiao_kai', { x: 860, y: 520, size: 420, brush: false, color: () => rgb(OCRE), glow: 20, glowColor: rgb(OCRE, 0.5) });
            ctx.restore();
          }
          // réponse : le signe ancien revient, baguettes et enfant dans leurs pigments
          const anc = seg(tt, jam - 0.2, jam + 0.8);
          if (anc > 0) E.drawRealGlyph(ctx, 'jiao_jiaguwen', { x: 1500, y: 520, size: 380, opacity: out * anc, color: (c: string) => rgb(P[c]), glow: 20 * anc, glowColor: rgb(P.child, 0.4) });
        }} />
      </TimeScrollStage>
      <Caption text="écriture des clercs 隸書 · stèle de Kong Zhou 孔宙碑 (164)" a={win(t, tas + 0.6, gl, 0.5)} />
      <Caption text="孝 ? — la gauche glisse vers un signe connu" a={win(t, gl + 0.6, rep_ - 0.2, 0.5)} size={42} />
      <Caption text="sur les os et les bronzes : baguettes 爻 + enfant 子" a={win(t, jam + 0.4, R3 - 0.3, 0.5)} size={42} />
      <Caption text="Han · le pinceau des copistes" a={win(t, A7 + 0.2, geste + 2, 0.5)} y={980} size={34} />
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
  const A8 = A('b08'), acad = at('b08', 'academies'), zx = at('b08', 'zhuxi'), gr = at('b08', 'grotte'), refus = at('b08', 'refus'), bat = at('b08', 'baton');
  const out = A('b09');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={22} from={A8 - 1} to={out + 0.8} move="rise" mood="brume" />
      <MapPanel from={acad - 0.6} to={gr + 0.8} draw={(ctx, u, E, tt) => {
        const z = ease(seg(tt, zx, gr)), v = { lon: 114.2 + 1.7 * z, lat: 31.5 - 1.9 * z, k: 70 + 160 * z };
        E.drawMap(ctx, tt, v, { paper: true, rivers: 1 });
        ACADEMIES.forEach(([zh, fr, p, side], i) => {
          const a = seg(tt, acad + 0.3 + i * 0.5, acad + 0.7 + i * 0.5) * (i === 0 ? 1 : 1 - seg(tt, zx, zx + 1));
          E.marker(ctx, tt, v, p, zh, fr, a, i === 0 ? '#c0392b' : '#348462', side);
        });
      }} />
      {/* tablette des principes, au-dessus de la porte (白鹿洞書院揭示) */}
      <div style={{ position: 'absolute', left: 1330, top: 170, width: 300, height: 740, background: 'rgba(58,40,26,0.9)', borderRadius: 8, border: '6px solid rgba(160,120,60,0.8)', display: 'flex', flexDirection: 'row-reverse', justifyContent: 'center', gap: 18, padding: 24, opacity: win(t, gr + 0.6, out - 0.2, 0.6) }}>
        {['白鹿洞書院揭示', '博學之審問之', '慎思之明辨之', '篤行之'].map((l, i) => (
          <div key={i} style={{ writingMode: 'vertical-rl', fontFamily: 'ShuimoKai', fontSize: i ? 46 : 52, color: i ? '#efe6d6' : '#f2c46a', letterSpacing: 6 }}>{l}</div>
        ))}
      </div>
      <Draw draw={(ctx, tt, E) => {
        // le bâton en marge : présent, mais pâle
        const a = win(tt, refus - 0.2, out - 0.2, 0.6);
        if (a <= 0) return;
        const pale = seg(tt, refus + 1.5, bat + 1.0);
        ctx.save(); ctx.globalAlpha = a * (1 - 0.6 * pale);
        E.drawStrokes(ctx, 'jiao_kai', { x: 700, y: 540, size: 420, brush: false, color: (c: string) => (c === 'hand' ? rgb(mixc(P.hand, [214, 170, 160], pale)) : inkCss), alpha: (c: string) => (c === 'hand' ? 1 : 0.25 + 0.75 * pale) });
        ctx.restore();
      }} />
      <EraTag zh="宋" name="SONG" dates="1179 · Zhu Xi 朱熹" a={seg(t, A8 - 0.3, A8 + 0.4) * (1 - seg(t, out - 0.6, out))} />
      <Caption text="« apprendre largement, questionner, réfléchir, discerner, agir » — pas de règlement de punitions" a={win(t, refus + 0.4, bat - 0.2, 0.5)} size={36} y={960} />
    </AbsoluteFill>
  );
};

// ════════════════ 9–10. Aujourd'hui : 11 traits, bandeau des écritures, 教室 / 教师 ; chute ; passerelle 文
const FORMS: [string, string, string][] = [['real:jiao_jiaguwen', '甲骨文', 'Shang'], ['real:jiao_jinwen', '金文', 'Zhou'], ['real:jiao_zhanguo', '楚簡', 'Chu'], ['real:jiao_xiaozhuan', '小篆', 'Qin'], ['real:jiao_lishu', '隸書', 'Han'], ['kai:jiao_kai', '楷書', "aujourd'hui"]];
const drawBand = (ctx: CanvasRenderingContext2D, E: any, tt: number, a: number) => {
  const y = 380, x0 = 480, dx = 228, sz = 220;
  const cues: [string, number][] = [['yao', at('b09', 'yao')], ['child', at('b09', 'enfant')], ['hand', at('b09', 'main')]];
  let hi = '', k = 0;
  for (const [c, s0] of cues) if (tt >= s0 - 0.05) { hi = c; k = seg(tt, s0 - 0.05, s0 + 0.3); }
  const nait = at('b09', 'naissance');
  if (tt > nait - 0.3) k *= 1 - seg(tt, nait - 0.3, nait + 0.2);
  const color = (c: string) => rgb(!hi || c === hi ? P[c] : mixc(P[c], GREY, k));
  const alpha = (c: string) => (!hi || c === hi ? 1 : 1 - 0.55 * k);
  FORMS.forEach(([key, zh, fr], i) => {
    const t0 = at('b09', 'yao') - 1.0;
    const appear = seg(tt, t0 + i * 0.08, t0 + 0.4 + i * 0.08) * a;
    if (appear <= 0) return;
    const x = x0 + i * dx;
    ctx.save(); ctx.globalAlpha = appear;
    if (key.startsWith('real:')) E.drawRealGlyph(ctx, key.slice(5), { x, y, size: sz, color, alpha });
    else E.drawStrokes(ctx, key.slice(4), { x, y, size: sz * 0.9, brush: false, color, alpha });
    E.text(ctx, zh, x, y + 168, { font: 'Kai', size: 60, color: inkCss, alpha: appear });
    E.text(ctx, fr, x, y + 228, { font: 'Cormorant', size: 44, weight: 700, color: '#5b4f44', alpha: appear });
    ctx.restore();
  });
  const rows: [string, number, number, string][] = [['yao', 0, 5, 'baguettes'], ['child', 0, 5, 'enfant'], ['hand', 0, 5, 'main au bâton']];
  const grow = seg(tt, at('b09', 'yao') - 0.6, at('b09', 'yao') + 0.3);
  rows.forEach(([c, a0, a1, lab], j) => {
    const yy = 790 + j * 76, xa = x0 + a0 * dx - 60, xb = x0 + a1 * dx + 60;
    const col = !hi || hi === c ? P[c] : mixc(P[c], GREY, k);
    const al = a * grow * (!hi || hi === c ? 1 : 1 - 0.5 * k);
    ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = rgb(col); ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xa + (xb - xa) * grow, yy); ctx.stroke(); ctx.restore();
    E.text(ctx, lab, xa - 24, yy, { font: 'Cormorant', size: 56, weight: 700, align: 'right', color: rgb(col), alpha: al });
  });
};

const Today: React.FC = () => {
  const t = useT();
  const A9 = A('b09'), tr = at('b09', 'traits'), yao = at('b09', 'yao'), nait = at('b09', 'naissance'), cl = at('b09', 'classe'), mt = at('b09', 'maitre');
  const A10 = A('b10'), max = at('b10', 'maxime'), wen = at('b10', 'wen'), ori = at('b10', 'origine'), hom = at('b10', 'homme');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={30} from={A9 - 1.5} to={END + 0.5} move="pan" mood="aube" faint={0.6} />
      <Draw draw={(ctx, tt, E) => {
        const syn = win(tt, yao - 1.0, nait + 0.6, 0.6);
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
      <Caption text="11 traits · identique en Chine et au Japon" a={win(t, tr, yao - 1.1, 0.4)} y={880} size={46} />
      <Caption text="jiào · enseigner" a={win(t, nait + 0.6, cl - 0.2, 0.4)} y={880} size={52} />
      <div style={{ position: 'absolute', width: '100%', top: 840, display: 'flex', justifyContent: 'center', gap: 160, fontFamily: 'ShuimoKai', fontSize: 72, color: inkCss }}>
        <span style={{ opacity: win(t, cl - 0.2, A10 - 0.3) }}>教室<div style={{ fontFamily: 'ShuimoLatin', fontSize: 38, textAlign: 'center' }}>la salle de classe</div></span>
        <span style={{ opacity: win(t, mt - 0.4, A10 - 0.3) }}>教师<div style={{ fontFamily: 'ShuimoLatin', fontSize: 38, textAlign: 'center' }}>le maître</div></span>
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
      <Caption text="à l'origine : un homme au torse orné (bronze, Zhou)" a={win(t, ori + 0.2, END + 0.1, 0.5)} y={880} size={46} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => (
  <AbsoluteFill style={{ background: '#1d1915', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
    <div style={{ width: 120, height: 120, background: rgb(P.hand, 0.95), borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 52, color: '#f6eee0', writingMode: 'vertical-rl' }}>墨道</div>
    <div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, letterSpacing: 8, color: '#efe6d6' }}>LA VOIE DE L'ENCRE</div>
    <div style={{ fontFamily: 'ShuimoLatin', fontSize: 34, color: '#b9ab98' }}>prochain caractère : 文 · l'écriture</div>
  </AbsoluteFill>
);

const Win: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const t = useT();
  return t >= from && t < to ? <>{children}</> : null;
};

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
      {ready && <>
        <Win from={0} to={A('b03') - 0.01}><Opening /></Win>
        <Win from={A('b03') - 0.01} to={A('b04') - 0.5}><ShangLu /></Win>
        <Win from={A('b04') - 0.5} to={A('b05') - 0.4}><Confucius /></Win>
        <Win from={A('b05') - 0.4} to={A('b06') - 0.4}><Baton /></Win>
        <Win from={A('b06') - 0.4} to={A('b07') - 0.3}><XuShen /></Win>
        <Win from={A('b07') - 0.3} to={R3 + TR3.duration!}><Retournement /></Win>
        <Win from={R3 + TR3.duration!} to={A('b09') - 0.3}><Song /></Win>
        <Win from={A('b09') - 0.3} to={END}><Today /></Win>
        <Win from={END} to={JIAO_SECONDS + 1}><EndCard /></Win>
      </>}
      {clips.map(voice)}
      <Audio src={staticFile('episodes/jiao/audio/musique.wav')} volume={0.55} />
    </AbsoluteFill>
  );
};
