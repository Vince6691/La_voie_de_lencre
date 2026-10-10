// 學 / 学, version tout shuimo, voix off v2 (≈ 4 min) — xue/shuimo_v2/PROPOSITION.md.
// Question : où sont passées les deux mains ? Voyage Shang → Zhou → Qin → Han → aujourd'hui, trois rouleaux du temps
// différents (5 s classique, 3,5 s rapide, 6 s long), clips vidéo intégrés au papier (VideoEncre ; ici les clips
// d'exemple, réutilisés à chaque emplacement, en attendant les clips Seedance), glyphes réels et tracé des traits
// du moteur Canvas (legacy), pigments minéraux constants par composante.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShuimoBackground } from '../shuimo/ShuimoBackground';
import { compose, Mood } from '../shuimo/layout';
import { INK, InkStage, InkTiming, PIGMENT } from '../shuimo_xue/InkStage';
import { TimeScrollConfig, TimeScrollStage, arrivePose, tagIn } from '../rouleau/TimeScroll';
import { VideoEncre } from '../video_encre/VideoEncre';
import { loadLegacy, W } from '../legacy';
import cuesData from '../data/cues_sx.json';

type Clip = 'b01' | 'b02' | 'b03' | 'b04' | 'b05' | 'b06' | 'b07' | 'b08' | 'b09';
const C = cuesData as unknown as Record<Clip, { duration: number; cues: Record<string, number> }>;
const d = (k: Clip) => C[k].duration;
const q = (k: Clip, n: string) => C[k].cues[n];

// ── minutage global (s)
const A1 = 0.6;
const A2 = A1 + d('b01') + 0.9;
const A3 = A2 + d('b02') + 1.0;
const R1 = A3 + d('b03') + 0.7; // rouleau 1 : 5 s
const A4 = R1 + 5 + 0.3;
const R2 = A4 + d('b04') + 0.8; // rouleau 2 : 3,5 s
const A5 = R2 + 3.5 + 0.3;
const A6 = A5 + d('b05') + 1.0;
const A7 = A6 + d('b06') + 1.0;
const B7CUT = q('b07', 'reponse') - 0.12; // silence long avant la réponse
const B7GAP = 1.7;
const R3 = A7 + d('b07') + B7GAP + 0.8; // rouleau 3 : 6 s
const A8 = R3 + 6 + 0.4;
const A9 = A8 + d('b08') + 1.0;
const END = A9 + d('b09') + 0.5;
export const XUE_V2_SECONDS = Math.ceil((END + 3.2) * 10) / 10;

const at = (k: Clip, n: string) => ({ b01: A1, b02: A2, b03: A3, b04: A4, b05: A5, b06: A6, b07: A7, b08: A8, b09: A9 }[k] + q(k, n) + (k === 'b07' && q(k, n) > B7CUT ? B7GAP : 0));

const TR1: TimeScrollConfig = { at: R1, duration: 5, from: 0, to: 1, years: [-1250, -1046] };
const TR2: TimeScrollConfig = { at: R2, duration: 3.5, from: 1, to: 2, years: [-1046, -221] };
const TR3: TimeScrollConfig = { at: R3, duration: 6, from: 3, to: 6, years: [100, 1956] };

// Shang / Zhou : minutage de la scène d'encre (estampages, signe, pigments) calé sur la voix
const TT: InkTiming = {
  plastronIn: [A3 + 14.3, A3 + 15.5], crack1: [A3 + 15.0, A3 + 15.8], crack2: [A3 + 15.6, A3 + 16.4], jiaguIn: [A3 + 16.3, A3 + 17.5],
  plastronOut: [A3 + 17.5, A3 + 18.5], yao: at('b03', 'yao'), roof: at('b03', 'toit'), hand: at('b03', 'mains'),
  travel: [R1, R1 + 5],
  bronzeIn: [at('b04', 'bronze') - 0.2, at('b04', 'bronze') + 1.4], bronzeOut: [at('b04', 'enfant') - 3.0, at('b04', 'enfant') - 1.8],
  jinwenColor: [at('b04', 'enfant') - 1.8, at('b04', 'enfant') - 0.8], child: at('b04', 'enfant'),
};

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
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); return loadLegacy({ three: false, captions: false }); }).then(() => { setReady(true); continueRender(h); });
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

// clip vidéo intégré au papier (exemples réutilisés en attendant les clips Seedance)
const CLIPS = { feu: 'exemples_videos/exemple_plan_fixe.mp4', astre: 'exemples_videos/exemple_transformation.mp4' };
const Clip: React.FC<{ src: keyof typeof CLIPS; from: number; len: number; inMode: 'brume' | 'centre'; outMode: 'delave' | 'brume'; focus: [number, number]; rate?: number; startFrom?: number }> = ({ src, from, len, inMode, outMode, focus, rate = 0.85, startFrom = 0 }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.round(from * fps)} durationInFrames={Math.round(len * fps)}>
      <VideoEncre src={CLIPS[src]} focus={focus} inMode={inMode} outMode={outMode} inDur={2.4} outDur={2.2} playbackRate={rate} startFrom={startFrom} />
    </Sequence>
  );
};

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

// ── cartouches, étiquettes, textes
const EraTag: React.FC<{ zh: string; name: string; dates: string; a: number }> = ({ zh, name, dates, a }) => (
  <div style={{ position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 26, opacity: a }}>
    <div style={{ width: 92, height: 92, background: rgb(VERM, 0.92), borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 64, color: '#f6eee0', boxShadow: 'inset 0 0 12px rgba(80,10,5,0.35)' }}>{zh}</div>
    <div>
      <div style={{ fontFamily: 'ShuimoLatin', fontWeight: 600, fontSize: 46, letterSpacing: 6, color: inkCss }}>{name}</div>
      <div style={{ fontFamily: 'ShuimoLatin', fontSize: 30, color: '#6b5d50' }}>{dates}</div>
    </div>
  </div>
);
const Label: React.FC<{ x: number; y: number; zh: string; text: string; color: number[]; a: number; align?: 'left' | 'right' }> = ({ x, y, zh, text, color, a, align = 'left' }) => (
  <div style={{ position: 'absolute', top: y - 30, ...(align === 'left' ? { left: x } : { right: 1920 - x }), opacity: a, display: 'flex', alignItems: 'baseline', gap: 14, flexDirection: align === 'left' ? 'row' : 'row-reverse' }}>
    <span style={{ fontFamily: 'ShuimoKai', fontSize: 52, color: rgb(color) }}>{zh}</span>
    <span style={{ fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: 34, color: '#4a3f36' }}>{text}</span>
  </div>
);
const Caption: React.FC<{ text: string; a: number; y?: number; size?: number }> = ({ text, a, y = 1000, size = 30 }) => (
  <div style={{ position: 'absolute', width: '100%', top: y, textAlign: 'center', fontFamily: 'ShuimoLatin, ShuimoKai', fontSize: size, color: '#5b4f44', opacity: a }}>{text}</div>
);
const win = (t: number, a: number, b: number, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));

// ════════════════ 1–2. Accroche et enjeu (papier, 學 tracé, les mains s'allument puis s'effacent)
const Opening: React.FC = () => {
  const t = useT();
  const mains = at('b01', 'mains'), retro = at('b02', 'retrouver');
  return (
    <AbsoluteFill>
      <Paper />
      <Landscape seed={14} from={retro - 0.6} to={R1 + 2} move="push" mood="aube" />
      <Draw draw={(ctx, tt, E) => {
        const shrink = seg(tt, retro + 0.4, retro + 2.4); // le signe se rétracte en point d'encre
        const size = 560 * (1 - 0.94 * shrink), y = 520 - 40 * shrink;
        const a = 1 - seg(tt, retro + 2.0, retro + 2.6);
        if (a <= 0) return;
        const handGone = seg(tt, mains + 2.6, mains + 4.2); // « plus personne ne les voit »
        const lit = seg(tt, mains, mains + 0.6);
        const simp = seg(tt, at('b02', 'huit') - 0.1, at('b02', 'huit') + 0.5) * (1 - seg(tt, at('b02', 'seize'), at('b02', 'seize') + 0.6));
        const k = Math.max(simp, seg(tt, mains + 3.2, mains + 4.2) * (1 - seg(tt, A2 - 0.2, A2 + 0.3))); // part de 学
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
      <TimeScrollStage cfg={TR1} under={<Landscape seed={14} from={A3 - 2} to={A3 + 15} move="pan" mood="aube" />}
        fromLandscape={{ seed: 5, since: A3 + 12.5 }} toLandscape={{ seed: 9, until: R2 + 1 }}>
        <AbsoluteFill style={{ opacity: glyphA }}><InkStage T={TT} travel={TR1} /></AbsoluteFill>
        {/* « il manque quelqu'un » : un vide lumineux sous le toit */}
        <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 66%, rgba(255,250,236,0.95) 0, rgba(255,250,236,0) 9%)', opacity: win(t, manque, R1 - 0.2, 0.8) }} />
      </TimeScrollStage>
      {/* cartes : Anyang, capitale des Shang ; Hao, capitale des Zhou */}
      <MapPanel from={A3 - 0.3} to={at('b03', 'devins') + 0.2} draw={(ctx, u, E, tt) => {
        const z = ease(u / 0.9), v = { lon: 108 + 6 * z, lat: 33 + 2.2 * z, k: 36 + 59 * z };
        E.drawMap(ctx, tt, v, { paper: true, rivers: seg(u, 0, 0.4), riverLabels: win(u, 0.35, 0.8, 0.1) });
        E.region(ctx, v, 'shang', 'rgba(192,57,43,0.22)', seg(u, 0.55, 0.75));
        E.marker(ctx, tt, v, E.CITIES.anyang, 'Anyang', 'dernière capitale des Shang', seg(u, 0.4, 0.5), '#c0392b');
      }} />
      <MapPanel from={A4 - 0.5} to={at('b04', 'bronze') + 0.1} draw={(ctx, u, E, tt) => {
        const v = { lon: 111.5, lat: 35, k: 88 };
        E.drawMap(ctx, tt, v, { paper: true, rivers: 1 });
        E.region(ctx, v, 'shang', 'rgba(192,57,43,0.22)', 1 - seg(u, 0.1, 0.4));
        E.region(ctx, v, 'zhou', 'rgba(52,132,98,0.35)', seg(u, 0.15, 0.4));
        E.marker(ctx, tt, v, E.CITIES.hao, 'Hao', 'capitale des Zhou', seg(u, 0.3, 0.45), '#348462', -1);
      }} />
      {/* les devins (clip), puis le tir à l'arc au 學宮 (clip) */}
      <Clip src="feu" from={at('b03', 'devins') - 0.4} len={TT.plastronIn[0] - at('b03', 'devins') + 1.8} inMode="brume" outMode="delave" focus={[0.62, 0.78]} />
      <Clip src="feu" from={vase - 0.3} len={R2 - vase + 0.6} inMode="centre" outMode="brume" focus={[0.55, 0.7]} startFrom={1} rate={0.9} />
      <EraTag zh="商" name="SHANG" dates="Anyang · v. 1250 av. J.-C." a={win(t, A3 + 0.3, R1 + 0.4, 0.8)} />
      <EraTag zh="周" name="ZHOU" dates="XIe siècle av. J.-C." a={tagIn(TR1, t) * (1 - seg(t, R2, R2 + 0.4))} />
      <Label x={1270} y={430} zh="爻" text="yáo · baguettes croisées" color={PIGMENT.yao} a={win(t, TT.yao + 0.3, R1, 0.6)} />
      <Label x={1270} y={700} zh="宀" text="le toit" color={PIGMENT.roof} a={win(t, TT.roof + 0.3, R1, 0.6)} />
      <Label x={650} y={430} zh="𦥑" text="deux mains" color={PIGMENT.hand} a={win(t, TT.hand + 0.3, R1, 0.6)} align="right" />
      <Label x={1290} y={820} zh="子" text="l'enfant" color={PIGMENT.child} a={win(t, TT.child + 0.4, vase - 0.4, 0.6)} />
      <Caption text="estampage d'un plastron de tortue · fissures de divination 卜" a={win(t, TT.plastronIn[0] + 0.6, TT.plastronOut[1])} />
      <Caption text="inscription coulée dans le bronze · vase rituel, Zhou de l'Ouest" a={win(t, TT.bronzeIn[1], TT.bronzeOut[1])} />
      <Caption text="le tir à l'arc enseigné dans la salle d'étude 學宮 · inscription du Jing gui 靜簋 (clip d'exemple)" a={win(t, vase + 1.5, R2 - 0.6)} />
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
 <MapPanel from={A5 - 0.3} to={at('b05', 'royaumes') + 0.3} draw={(ctx, u, E, tt) => {
        const v = { lon: 112.5, lat: 32.5, k: 44 };
        E.drawMap(ctx, tt, v, { paper: true, rivers: 1 });
        E.region(ctx, v, 'qin', 'rgba(192,57,43,0.45)', 1, ease(seg(u, 0.35, 0.9)), E.CITIES.xianyang);
        E.marker(ctx, tt, v, E.CITIES.xianyang, 'Xianyang', 'capitale des Qin', seg(u, 0.3, 0.4), '#c0392b', -1);
      }} />
      <EraTag zh="秦" name="QIN" dates="221 av. J.-C. · le petit sceau" a={tagIn(TR2, t) * (1 - seg(t, A6 - 0.6, A6))} />
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
      <Landscape seed={3} from={A6 - 1} to={A7 + 1} move="still" mood="brume" faint={0.55} />
      <Draw draw={(ctx, tt, E) => {
        E.drawPortrait(ctx, { x: 560, y: 590, height: 640, progress: seg(tt, lettre - 0.6, lettre + 2.4), color: '#2a231d', alpha: 1 - seg(tt, A7 - 0.8, A7) });
        const g = seg(tt, A6 + 0.4, A6 + 1.6) * (1 - seg(tt, A7 - 0.8, A7));
        if (g > 0) {
          E.drawRealGlyph(ctx, 'xiaozhuan', { x: 1300, y: 470, size: 470, opacity: g, color: () => inkCss });
          // le toit : l'obscurité qui couvre encore l'esprit
          const dark = win(tt, toit, A7 - 0.4, 0.8);
          if (dark > 0) {
            const gr = ctx.createRadialGradient(1300, 330, 20, 1300, 340, 300);
            gr.addColorStop(0, `rgba(29,25,21,${0.55 * dark})`); gr.addColorStop(1, 'rgba(29,25,21,0)');
            ctx.fillStyle = gr; ctx.fillRect(1000, 120, 600, 420);
          }
        }
      }} />
      <EraTag zh="漢" name="HAN" dates="v. 100 · Xu Shen 许慎" a={seg(t, A6 + 0.2, A6 + 1.2) * (1 - seg(t, R3, R3 + 0.4))} />
      <Caption text="portrait imaginé" a={win(t, lettre + 1.2, A7 - 0.5)} y={960} size={24} />
      <div style={{ position: 'absolute', left: 1080, top: 760, width: 440, textAlign: 'center', opacity: win(t, livre, A7 - 0.3) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 40, color: inkCss }}>說文解字</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 28, color: '#5b4f44' }}>Shuowen jiezi · plus de 9 000 caractères</div>
      </div>
      <div style={{ position: 'absolute', left: 1080, top: 880, width: 440, textAlign: 'center', opacity: win(t, def, A7 - 0.3) }}>
        <div style={{ fontFamily: 'ShuimoKai', fontSize: 36, color: inkCss }}>斆，覺悟也 · 冂，尚矇也</div>
        <div style={{ fontFamily: 'ShuimoLatin', fontSize: 26, color: '#5b4f44', fontStyle: 'italic' }}>apprendre, c'est s'éveiller · le toit, l'obscurité</div>
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
      <Landscape seed={3} from={A7 - 1} to={R3 + 2} move="pan" mood="jour" faint={0.4} />
      <Clip src="astre" from={A7 - 0.2} len={apl - A7 + 1.6} inMode="centre" outMode="delave" focus={[0.5, 0.45]} rate={1.1} />
      <Draw draw={(ctx, tt, E) => {
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
      <Caption text="écriture des clercs 隸書 · les mains figées en « mortier » 臼" a={win(t, fig, reg - 0.4)} />
      <Caption text="écriture régulière 楷書 · 16 traits" a={win(t, reg + 0.4, cop + 0.8)} />
      <Caption text="« les mains n'ont pas été effacées par un décret »" a={win(t, rep, R3 - 0.2)} size={36} y={950} />
    </AbsoluteFill>
  );
};

// ════════════════ 8–9. (rouleau 3) aujourd'hui : 8 traits, synthèse, l'école ; chute et passerelle
const Today: React.FC = () => {
  const t = useT();
  const huit = at('b08', 'huit'), pin = at('b08', 'pinceau'), nait = at('b08', 'nait'), ecole = at('b08', 'ecole'), mots = at('b08', 'mots'), rec = at('b08', 'reconnaitre');
  const autre = at('b09', 'autre'), baton = at('b09', 'baton');
  const parts: [string, string, number[], string][] = [['baguettes', '爻', PIGMENT.yao, 'compter'], ['toit', '宀', PIGMENT.roof, 'abriter'], ['mains', '𦥑', PIGMENT.hand, 'montrer'], ['enfant', '子', PIGMENT.child, 'recevoir']];
  return (
    <AbsoluteFill>
      <TimeScrollStage cfg={TR3} defaultCursor fromLandscape={{ seed: 3, since: R3 - 3 }} toLandscape={{ seed: 30, until: XUE_V2_SECONDS + 1, mood: 'aube' }}>
        <Draw draw={(ctx, tt, E) => {
          const out = 1 - seg(tt, autre - 0.3, autre + 0.6);
          if (out <= 0 || tt < huit - 0.3) return;
          // synthèse : le signe Zhou en pigments, à gauche, puis 学 au centre
          const syn = win(tt, pin, nait + 0.6, 0.6);
          if (syn > 0) {
            const lit = (c: string) => seg(tt, at('b08', ({ yao: 'baguettes', roof: 'toit', hand: 'mains', child: 'enfant' } as Record<string, string>)[c]), at('b08', ({ yao: 'baguettes', roof: 'toit', hand: 'mains', child: 'enfant' } as Record<string, string>)[c]) + 0.5);
            E.drawRealGlyph(ctx, 'jinwen', { x: 560, y: 520, size: 440, opacity: syn, color: (c: string) => rgb(PIGMENT[c] ?? INK), alpha: (c: string) => 0.25 + 0.75 * lit(c) });
          }
          const childGlow = win(tt, rec + 2.2, autre, 0.5) + 0.6 * win(tt, nait, nait + 2, 0.4);
          const x = 960 + 360 * syn, s = 560 - 120 * syn;
          ctx.save(); ctx.globalAlpha = out;
          E.drawStrokes(ctx, 'xue_simp', {
            x, y: 520, size: s, progress: 8 * seg(tt, huit - 0.2, huit + 2.2), brush: false,
            color: (c: string) => (c === 'child' ? rgb(childGlow > 0 ? PIGMENT.child : INK) : c === 'roof' && win(tt, rec + 1.1, rec + 2.4, 0.3) > 0 ? rgb(PIGMENT.roof) : c === 'fusion' && win(tt, rec, rec + 1.3, 0.3) > 0 ? rgb(FUSION) : inkCss),
            glow: 26 * Math.min(1, childGlow), glowColor: rgb(PIGMENT.child, 0.6),
          });
          ctx.restore();
        }} />
        {/* passerelle : 教, la main tient un bâton */}
        <div style={{ position: 'absolute', width: '100%', top: 260, textAlign: 'center', fontFamily: 'ShuimoKai', fontSize: 480, lineHeight: 1, color: inkCss, opacity: seg(t, autre + 0.2, autre + 1.4), textShadow: `0 0 ${40 * seg(t, baton, baton + 0.6)}px ${rgb(VERM, 0.8)}` }}>教</div>
      </TimeScrollStage>
      <MapPanel from={A8 - 0.3} to={at('b08', 'huit') + 0.2} draw={(ctx, u, E, tt) => {
        const v = { lon: 126, lat: 36, k: 40 + 6 * u };
        E.drawMap(ctx, tt, v, { paper: true, rivers: 1 });
        E.marker(ctx, tt, v, E.CITIES.tokyo, 'Japon · 1949', '当用漢字字体表', seg(u, 0.15, 0.25), '#c4882a', -1);
        E.marker(ctx, tt, v, E.CITIES.beijing, 'Chine · 1956', '汉字简化方案', seg(u, 0.45, 0.55), '#c0392b', -1);
      }} />
      <EraTag zh="今" name="AUJOURD'HUI" dates="Japon 1949 · Chine 1956 · 8 traits" a={tagIn(TR3, t) * (1 - seg(t, A9, A9 + 0.6))} />
      {parts.map(([k, zh, col, verb], i) => (
        <Label key={k} x={140} y={790 + i * 62} zh={zh} text={`pour ${verb}`} color={col} a={win(t, at('b08', k), nait + 0.6, 0.4)} />
      ))}
      <Caption text="xué · apprendre" a={win(t, nait, ecole)} y={900} size={44} />
      <div style={{ position: 'absolute', width: '100%', top: 860, display: 'flex', justifyContent: 'center', gap: 120, fontFamily: 'ShuimoKai', fontSize: 64, color: inkCss }}>
        <span style={{ opacity: win(t, mots + 0.2, rec + 0.3) }}>学生<div style={{ fontFamily: 'ShuimoLatin', fontSize: 26, textAlign: 'center' }}>l'élève</div></span>
        <span style={{ opacity: win(t, ecole + 0.2, rec + 0.3) }}>学校<div style={{ fontFamily: 'ShuimoLatin', fontSize: 26, textAlign: 'center' }}>l'école</div></span>
        <span style={{ opacity: win(t, mots + 1.4, rec + 0.3) }}>大学<div style={{ fontFamily: 'ShuimoLatin', fontSize: 26, textAlign: 'center' }}>l'université</div></span>
      </div>
      <Caption text="Les mains se sont effacées du signe. Pas du geste." a={win(t, A9 + 0.3, autre - 0.2, 0.7)} y={900} size={44} />
    </AbsoluteFill>
  );
};

// écran de fin : coupé net après « la main tient un bâton »
const EndCard: React.FC = () => (
  <AbsoluteFill style={{ background: '#1d1915', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
    <div style={{ width: 120, height: 120, background: rgb(VERM, 0.95), borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ShuimoKai', fontSize: 52, color: '#f6eee0', writingMode: 'vertical-rl' }}>墨道</div>
    <div style={{ fontFamily: 'ShuimoLatin', fontSize: 40, letterSpacing: 8, color: '#efe6d6' }}>LA VOIE DE L'ENCRE</div>
    <div style={{ fontFamily: 'ShuimoLatin', fontSize: 30, color: '#b9ab98' }}>prochain caractère : 教 · enseigner</div>
  </AbsoluteFill>
);

const Win: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const t = useT();
  return t >= from && t < to ? <>{children}</> : null;
};

export const XueV2: React.FC = () => {
  const ready = useSetup();
  const { fps } = useVideoConfig();
  const voice = (k: Clip, start: number, extra: Partial<React.ComponentProps<typeof Audio>> = {}) => (
    <Sequence key={k + start} from={Math.round(start * fps)}><Audio src={staticFile(`voice_sx/${k}.wav`)} {...extra} /></Sequence>
  );
  return (
    <AbsoluteFill style={{ background: '#f3eee4' }}>
      {ready && <>
      <Win from={0} to={A3 - 0.01}><Opening /></Win>
      <Win from={A3 - 0.01} to={R2}><ShangZhou /></Win>
      <Win from={R2} to={A6 - 0.4}><Qin /></Win>
      <Win from={A6 - 0.4} to={A7 - 0.3}><XuShen /></Win>
      <Win from={A7 - 0.3} to={R3}><Retournement /></Win>
      <Win from={R3} to={END}><Today /></Win>
      <Win from={END} to={XUE_V2_SECONDS + 1}><EndCard /></Win>
      </>}
      {voice('b01', A1)}{voice('b02', A2)}{voice('b03', A3)}{voice('b04', A4)}{voice('b05', A5)}{voice('b06', A6)}
      {voice('b07', A7, { endAt: Math.round(B7CUT * fps) })}
      {voice('b07', A7 + B7CUT + B7GAP, { startFrom: Math.round(B7CUT * fps) })}
      {voice('b08', A8)}{voice('b09', A9)}
      <Audio src={staticFile('audio/bed_sx.wav')} volume={0.55} />
    </AbsoluteFill>
  );
};
