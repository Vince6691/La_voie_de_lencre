// Sortie « bas-relief qui se détache et tombe » : la fresque (image fixe cadrée comme la fin du plan) se fend le long
// des éclats d'enduit (tools/build_fragments.py → <nom>_eclats.json), tremble, puis les éclats se décollent un à un —
// des bords vers le centre, le sujet en dernier — avec une ombre portée, et tombent en tournant ; de petits éclats
// suivent. Derrière : le papier xuan (la scène suivante).
import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

type Frag = { poly: number[][]; c: number[]; area: number };
type Data = { img: HTMLImageElement; paper: HTMLImageElement; frags: (Frag & { start: number; vx: number; om: number; col: string; seed: number })[] };

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
const rnd = (s: number) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });

// fissures 0 → FISSURE ; tremblement ; chutes étalées de CHUTE0 à CHUTE0 + ETALE (bords d'abord), sujet au point `coeur`
const FISSURE = 0.9, CHUTE0 = 0.85, ETALE = 1.5, G = 2600;

export const Effondrement: React.FC<{ src: string; eclats: string; coeur?: [number, number] }> = ({ src, eclats, coeur = [0.3, 0.5] }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const ref = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<Data | null>(null);
  const [h] = useState(() => delayRender('effondrement'));
  useEffect(() => {
    Promise.all([load(staticFile(src)), load(staticFile('shuimo/paper.jpg')), fetch(staticFile(eclats)).then((r) => r.json())]).then(([img, paper, j]) => {
      // couleur moyenne de chaque éclat (pour les petits débris)
      const c = document.createElement('canvas'); c.width = 64; c.height = 36;
      const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(img, 0, 0, 64, 36);
      const px = x.getImageData(0, 0, 64, 36).data;
      const fr = (j.fragments as Frag[]).map((f, i) => {
        const d = Math.hypot((f.c[0] - coeur[0]) * 1.78, f.c[1] - coeur[1]);
        return { f, i, k: d + 0.25 * rnd(i) };
      });
      const kmax = Math.max(...fr.map((a) => a.k));
      const frags = fr.map(({ f, i, k }) => {
        const p = (Math.min(35, Math.floor(f.c[1] * 36)) * 64 + Math.min(63, Math.floor(f.c[0] * 64))) * 4;
        return { ...f, start: CHUTE0 + ETALE * (1 - k / kmax), vx: (rnd(i + 7) - 0.5) * 260, om: (rnd(i + 13) - 0.5) * 3.2,
          col: `rgb(${px[p]},${px[p + 1]},${px[p + 2]})`, seed: i };
      });
      setData({ img, paper, frags });
      continueRender(h);
    });
  }, [src, eclats, coeur, h]);

  useEffect(() => {
    const cv = ref.current; if (!data || !cv) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(data.paper, 0, 0, W, H);
    // tremblement bref juste avant les premières chutes
    const sh = smooth(0.55, 0.75, t) * (1 - smooth(1.0, 1.25, t));
    const jx = sh * 4 * Math.sin(t * 97), jy = sh * 3 * Math.cos(t * 83);
    const path = (f: Frag) => { ctx.beginPath(); f.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H))); ctx.closePath(); };
    // d'abord les éclats encore en place, puis ceux qui tombent (au-dessus)
    const order = [...data.frags].sort((a, b) => (t - a.start) - (t - b.start));
    for (const f of order) {
      const u = t - f.start;
      const cx = f.c[0] * W, cy = f.c[1] * H;
      const lift = smooth(-0.18, 0, u); // décollement : l'éclat avance vers nous
      let dx = jx, dy = jy, rot = 0, sc = 1 + 0.035 * lift;
      if (u > 0) { dy += 0.5 * G * u * u; dx += f.vx * u; rot = f.om * u; sc += 0.06 * u; }
      if (cy + dy - 0.4 * H > H) continue; // sorti du cadre
      ctx.save();
      ctx.translate(cx + dx, cy + dy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      // ombre portée de l'éclat décollé
      if (lift > 0) {
        ctx.save(); ctx.shadowColor = `rgba(20,14,8,${0.45 * lift})`; ctx.shadowBlur = 22 * lift; ctx.shadowOffsetX = 6 * lift; ctx.shadowOffsetY = 16 * lift;
        path(f); ctx.fillStyle = f.col; ctx.fill(); ctx.restore();
      }
      path(f); ctx.save(); ctx.clip(); ctx.drawImage(data.img, 0, 0, W, H);
      // tranche de l'éclat : bord clair (épaisseur d'enduit) qui apparaît en se décollant
      ctx.restore();
      ctx.lineJoin = 'round';
      const cr = smooth(0, FISSURE, t - 0.35 * rnd(f.seed + 3)) ; // fissures qui s'ouvrent
      if (cr > 0) {
        path(f); ctx.strokeStyle = `rgba(28,20,14,${0.8 * cr})`; ctx.lineWidth = 1.2 + 2.2 * cr; ctx.stroke();
      }
      if (lift > 0) { path(f); ctx.strokeStyle = `rgba(236,226,208,${0.9 * lift})`; ctx.lineWidth = 3.5; ctx.stroke(); }
      ctx.restore();
      // petits débris qui suivent l'éclat
      if (u > 0 && u < 1.2) for (let k = 0; k < 4; k++) {
        const r = rnd(f.seed * 10 + k), r2 = rnd(f.seed * 10 + k + 5);
        const bx = cx + jx + (r - 0.5) * 120 + f.vx * u * 1.3, by = cy + 0.5 * G * 1.25 * u * u + (r2 - 0.5) * 80;
        const s = 4 + 7 * r;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(u * 9 * (r2 - 0.5));
        ctx.fillStyle = f.col; ctx.beginPath(); ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s * 0.8, -s * 0.3); ctx.lineTo(s * 0.2, s); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }, [data, t, W, H]);
  return <AbsoluteFill><canvas ref={ref} width={W} height={H} style={{ width: '100%', height: '100%' }} /></AbsoluteFill>;
};
