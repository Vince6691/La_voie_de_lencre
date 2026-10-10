// Révélations plein cadre d'un clip vidéo (Seedance, Veo…) sur le papier shuimo — sans fenêtre partielle.
//  « glyphe »  : le caractère apparaît à l'encre, la vidéo se loge dans ses traits, puis la caméra plonge dans le trait
//                le plus épais jusqu'au plein écran ; sortie : l'inverse (on ressort du trait, le signe pâlit).
//  « lavis »   : toute l'image arrive en lavis (encre tamponnée), puis la couleur se répand en plusieurs taches
//                d'aquarelle qui s'étalent et se rejoignent ; sortie : la couleur se retire dans les taches, l'encre pâlit.
//  « pinceau » : trois larges coups de pinceau (gauche → droite, droite → gauche, gauche → droite) peignent la vidéo,
//                bords effilochés, blanc volant en bout de trait ; sortie : trois coups d'encre recouvrent l'image puis
//                l'encre pâlit jusqu'au papier.
//  « goutte »  : une goutte d'encre tombe au centre et se diffuse comme dans l'eau (volutes, liseré d'encre, halo de
//                fumée) en ouvrant l'image ; sortie : l'image passe à l'encre et coule vers le bas en traînées.
//  « rouleau » : un rouleau suspendu (montage de soie, bâton, rouleau de bois) se déroule de haut en bas avec la scène
//                peinte, puis la caméra entre dans la peinture jusqu'au plein écran ; sortie : l'inverse.
//  « brouillard » : une brume épaisse monte et cache le décor shuimo, puis se déchire en nappes et se dissipe sur la
//                scène 3D plein cadre ; sortie : la brume revient, cache la scène, puis se dissipe sur le shuimo.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AbsoluteFill, OffthreadVideo, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type RevealMode = 'glyphe' | 'lavis' | 'pinceau' | 'goutte' | 'rouleau' | 'brouillard';
export type VideoRevealProps = {
  src: string; mode: RevealMode; glyph?: string; inDur?: number; outDur?: number; outAt?: number;
  startFrom?: number; playbackRate?: number; zoom?: number;
};

const PW = 1280, PH = 720;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = (u: number) => { const v = clamp(u); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const INK = [29, 25, 21];

const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
const pixels = (img: CanvasImageSource, w: number, h: number) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(img, 0, 0, w, h);
  return x.getImageData(0, 0, w, h).data;
};

type Res = { paper: Uint8ClampedArray; n1: Float32Array; n2: Float32Array; blot: Float32Array; fog1: Float32Array; fog2: Float32Array; anchor: [number, number] };

// point du glyphe le plus « profond » (centre du trait le plus épais, près du centre) : distance de chanfrein
function deepestPoint(glyph: string, F: number): [number, number] {
  const S = 220, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.font = `${S * 0.9}px RevealKai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText(glyph, S / 2, S / 2);
  const a = g.getImageData(0, 0, S, S).data, D = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) D[i] = a[i * 4 + 3] > 127 ? 1e9 : 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x; if (!D[i]) continue; D[i] = Math.min(D[i], (x ? D[i - 1] : 0) + 1, (y ? D[i - S] : 0) + 1); }
  for (let y = S - 1; y >= 0; y--) for (let x = S - 1; x >= 0; x--) { const i = y * S + x; if (!D[i]) continue; D[i] = Math.min(D[i], (x < S - 1 ? D[i + 1] : 0) + 1, (y < S - 1 ? D[i + S] : 0) + 1); }
  let best = -1, bx = S / 2, by = S / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const sc = D[y * S + x] - 0.04 * Math.hypot(x - S / 2, y - S / 2);
    if (sc > best) { best = sc; bx = x; by = y; }
  }
  const k = F / (S * 0.9);
  return [(bx - S / 2) * k, (by - S / 2) * k];
}

const GF = 600;
const FW = PW + 800; // nappes de brume plus larges que l'écran : elles glissent sans raccord // taille du glyphe à l'écran de traitement (720 px de haut)

function useRes(glyph: string) {
  const [r, setR] = useState<Res | null>(null);
  const [h] = useState(() => delayRender('révélation vidéo'));
  useEffect(() => {
    Promise.all([
      new FontFace('RevealKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`).load().then((f) => document.fonts.add(f)),
      load(staticFile('shuimo_xue/noise.png')), load(staticFile('shuimo/paper.jpg')),
    ]).then(([, noise, paper]) => {
      const nz = pixels(noise as HTMLImageElement, PW, PH), pp = pixels(paper as HTMLImageElement, PW, PH);
      const N = PW * PH, n1 = new Float32Array(N), n2 = new Float32Array(N), blot = new Float32Array(N);
      // taches d'aquarelle : six centres répartis, rayons variés
      const B = [[0.3, 0.38, 0.32], [0.62, 0.3, 0.3], [0.48, 0.68, 0.34], [0.82, 0.62, 0.26], [0.14, 0.75, 0.24], [0.9, 0.18, 0.2]];
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        const i = y * PW + x;
        n1[i] = nz[i * 4] / 255; n2[i] = nz[((PH - 1 - y) * PW + (PW - 1 - x)) * 4] / 255;
        let m = 0;
        const lf = nz[(Math.floor(y / 5) * PW + Math.floor(x / 5)) * 4] / 255; // bruit large : bords de tache irréguliers
        B.forEach(([bx, by, br], j) => {
          const dd = (Math.hypot((x / PW - bx) * 1.78, y / PH - by) / br) * (1 + 0.55 * (lf - 0.5) + 0.25 * (n1[i] - 0.5));
          m = Math.max(m, (1 - dd) * (1 - 0.07 * j));
        });
        blot[i] = m;
      }
      // nappes de brume : bruit réduit puis agrandi avec lissage (pas de pavés), deux échelles
      const smoothNoise = (div: number, flip: boolean) => {
        const sm = document.createElement('canvas'); sm.width = Math.round(FW / div); sm.height = Math.round(PH / div);
        const g = sm.getContext('2d')!; if (flip) { g.translate(sm.width, sm.height); g.scale(-1, -1); }
        g.drawImage(noise as HTMLImageElement, 0, 0, sm.width, sm.height);
        const big = document.createElement('canvas'); big.width = FW; big.height = PH;
        const b = big.getContext('2d', { willReadFrequently: true })!; b.imageSmoothingQuality = 'high'; b.filter = `blur(${div * 0.5}px)`;
        b.drawImage(sm, 0, 0, FW, PH);
        const px = b.getImageData(0, 0, FW, PH).data, f = new Float32Array(FW * PH);
        for (let i = 0; i < FW * PH; i++) f[i] = px[i * 4] / 255;
        return f;
      };
      setR({ paper: pp, n1, n2, blot, fog1: smoothNoise(14, false), fog2: smoothNoise(9, true), anchor: deepestPoint(glyph, GF) });
      continueRender(h);
    });
  }, [glyph, h]);
  return r;
}

export const VideoReveal: React.FC<VideoRevealProps> = ({ src, mode, glyph = '學', inDur = 3, outDur = 2.4, outAt, startFrom = 0, playbackRate = 1, zoom = 1.04 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps, total = durationInFrames / fps, oAt = outAt ?? total - outDur;
  const res = useRes(glyph);
  const out = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(t); tRef.current = t;
  const bufs = useRef<{ work: HTMLCanvasElement; mask: HTMLCanvasElement; L: Float32Array; Lb: Float32Array; tmp: Float32Array } | null>(null);

  const paint = useCallback((img: CanvasImageSource) => {
    if (!res || !out.current) return;
    if (!bufs.current) {
      const mk = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; return c; };
      bufs.current = { work: mk(), mask: mk(), L: new Float32Array(PW * PH), Lb: new Float32Array(PW * PH), tmp: new Float32Array(PW * PH) };
    }
    const { work, mask } = bufs.current;
    const tt = tRef.current, ui = clamp(tt / inDur), uo = clamp((tt - oAt) / outDur);
    const o = out.current.getContext('2d')!;
    const wx = work.getContext('2d', { willReadFrequently: true })!;
    wx.globalCompositeOperation = 'source-over'; wx.drawImage(img, 0, 0, PW, PH);

    // ── à travers le caractère : compositing de canevas, pas de traitement par pixel
    if (mode === 'glyphe') {
      const z = tt < oAt ? ease((ui - 0.42) / 0.58) : 1 - ease(uo / 0.55);
      const inV = tt < oAt ? ease((ui - 0.16) / 0.26) : 1 - ease((uo - 0.55) / 0.2);
      const gA = tt < oAt ? ease(ui / 0.18) : 1 - ease((uo - 0.78) / 0.22);
      o.clearRect(0, 0, PW, PH);
      if (z >= 0.985) { o.drawImage(work, 0, 0); return; }
      const s = Math.exp(Math.log(34) * ease(z)), e = ease(z), [ax, ay] = res.anchor;
      const place = (g: CanvasRenderingContext2D) => {
        g.setTransform(s, 0, 0, s, PW / 2 + ax * (1 - e) - ax * s, PH / 2 + ay * (1 - e) - ay * s);
        g.font = `${GF}px RevealKai`; g.textAlign = 'center'; g.textBaseline = 'middle';
      };
      const m = mask.getContext('2d')!;
      m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, PW, PH); place(m); m.fillStyle = '#000'; m.fillText(glyph, 0, 0); m.setTransform(1, 0, 0, 1, 0, 0);
      // signe à l'encre
      if (gA * (1 - inV) > 0) { o.save(); o.globalAlpha = gA * (1 - inV); place(o); o.fillStyle = `rgb(${INK.join(',')})`; o.fillText(glyph, 0, 0); o.restore(); }
      // vidéo dans les traits
      if (inV > 0) {
        wx.globalCompositeOperation = 'destination-in'; wx.drawImage(mask, 0, 0); wx.globalCompositeOperation = 'source-over';
        o.save(); o.globalAlpha = inV * gA; o.drawImage(work, 0, 0); o.restore();
      }
      return;
    }

    // ── rouleau suspendu : compositing de canevas
    if (mode === 'rouleau') {
      const unroll = tt < oAt ? ease(ui / 0.45) : 1 - ease((uo - 0.55) / 0.45);
      const zoom = tt < oAt ? ease((ui - 0.5) / 0.5) : 1 - ease(uo / 0.5);
      o.clearRect(0, 0, PW, PH);
      const wP = 0.28 * PW, hP = 0.66 * PH, x0 = (PW - wP) / 2, y0 = 0.2 * PH;
      const cw = PH * (wP / hP), cx0 = (PW - cw) / 2; // recadrage portrait de la vidéo
      const L = (a: number, b: number) => a + (b - a) * zoom;
      const R = { x: L(x0, 0), y: L(y0, 0), w: L(wP, PW), h: L(hP, PH) };
      const S = { x: L(cx0, 0), y: 0, w: L(cw, PW), h: PH };
      const k = R.w / wP; // échelle du montage
      const vis = unroll; // part déroulée (de haut en bas)
      // montage de soie, bâton du haut, cordon
      const m = { side: 30 * k, top: 70 * k, bot: 46 * k };
      o.save();
      o.shadowColor = 'rgba(40,30,20,0.35)'; o.shadowBlur = 30 * k; o.shadowOffsetY = 10 * k;
      o.fillStyle = '#e8dcc2';
      o.fillRect(R.x - m.side, R.y - m.top, R.w + 2 * m.side, m.top + R.h * vis + m.bot * Math.min(1, vis * 4));
      o.restore();
      o.fillStyle = '#c7b28a'; o.fillRect(R.x - 8 * k, R.y - 8 * k, R.w + 16 * k, R.h * vis + 16 * k * Math.min(1, vis * 4)); // liseré de brocart
      o.fillStyle = '#efe6d2'; o.fillRect(R.x - 4 * k, R.y - 4 * k, R.w + 8 * k, R.h * vis + 8 * k * Math.min(1, vis * 4));
      // la peinture : partie déroulée de la vidéo
      if (vis > 0) o.drawImage(work, S.x, S.y, S.w, S.h * vis, R.x, R.y, R.w, R.h * vis);
      // bâton du haut et cordon
      o.fillStyle = '#5a3d26'; o.fillRect(R.x - m.side - 10 * k, R.y - m.top - 6 * k, R.w + 2 * m.side + 20 * k, 12 * k);
      o.strokeStyle = '#7a5a3a'; o.lineWidth = 3 * k; o.beginPath();
      o.moveTo(R.x - m.side, R.y - m.top - 6 * k); o.lineTo(R.x + R.w / 2, R.y - m.top - 70 * k); o.lineTo(R.x + R.w + m.side, R.y - m.top - 6 * k); o.stroke();
      // rouleau de bois du bas (avec ses pommeaux), qui descend en se déroulant
      const ry = R.y + R.h * vis + m.bot * Math.min(1, vis * 4);
      const g = o.createLinearGradient(0, ry - 12 * k, 0, ry + 12 * k);
      g.addColorStop(0, '#3e2817'); g.addColorStop(0.5, '#8a6440'); g.addColorStop(1, '#2e1d10');
      o.fillStyle = g; o.fillRect(R.x - m.side - 6 * k, ry - 11 * k, R.w + 2 * m.side + 12 * k, 22 * k);
      o.fillStyle = '#c9a46a';
      [R.x - m.side - 18 * k, R.x + R.w + m.side + 6 * k].forEach((bx) => o.fillRect(bx, ry - 14 * k, 12 * k, 28 * k));
      // à la fin de la plongée, la peinture seule
      if (zoom > 0.97) o.drawImage(work, 0, 0);
      return;
    }

    const v = wx.getImageData(0, 0, PW, PH), d = v.data;
    const { paper, n1, n2, blot } = res;
    const { L, Lb, tmp } = bufs.current;
    // lavis (traits d'encre sur les contours + ton léger), comme VideoEncre
    for (let i = 0, p = 0; i < PW * PH; i++, p += 4) L[i] = (0.3 * d[p] + 0.59 * d[p + 1] + 0.11 * d[p + 2]) / 255;
    for (let y = 0; y < PH; y++) { let acc = 0; const r0 = y * PW;
      for (let x = -2; x < PW + 2; x++) { acc += L[r0 + Math.min(PW - 1, Math.max(0, x + 2))]; if (x >= 3) acc -= L[r0 + Math.min(PW - 1, Math.max(0, x - 3))]; if (x >= 0 && x < PW) tmp[r0 + x] = acc / 5; } }
    for (let x = 0; x < PW; x++) { let acc = 0;
      for (let y = -2; y < PH + 2; y++) { acc += tmp[Math.min(PH - 1, Math.max(0, y + 2)) * PW + x]; if (y >= 3) acc -= tmp[Math.min(PH - 1, Math.max(0, y - 3)) * PW + x]; if (y >= 0 && y < PH) Lb[y * PW + x] = acc / 5; } }
    const inkOf = (i: number) => {
      const x = i % PW; let gr = 0;
      if (x > 0 && x < PW - 1 && i > PW && i < PW * (PH - 1)) {
        const gx = Lb[i - PW + 1] + 2 * Lb[i + 1] + Lb[i + PW + 1] - Lb[i - PW - 1] - 2 * Lb[i - 1] - Lb[i + PW - 1];
        const gy = Lb[i + PW - 1] + 2 * Lb[i + PW] + Lb[i + PW + 1] - Lb[i - PW - 1] - 2 * Lb[i - PW] - Lb[i - PW + 1];
        gr = Math.hypot(gx, gy);
      }
      return clamp((0.34 * Math.pow(clamp((0.9 - L[i]) / 0.9), 1.3) + smooth(0.1, 0.45, gr) * 0.8) * (0.8 + 0.35 * n1[i]));
    };

    if (mode === 'brouillard') {
      // couvrir (brume qui s'épaissit) puis découvrir (brume qui se déchire) ; la vidéo n'existe que sous la brume pleine
      const inPh = tt < oAt, u = inPh ? ui : uo;
      const cover = smooth(0, 0.42, u), clear = clamp((u - 0.48) / 0.52); // progressions linéaires : la brume se déchire lentement
      const showVid = inPh ? u >= 0.42 : u < 0.5;
      const d1 = tt * 60, d2 = tt * 35; // dérive des nappes (px)
      for (let i = 0, p = 0; i < PW * PH; i++, p += 4) {
        const xi = i % PW, yi = (i - xi) / PW;
        const a1 = res.fog1[yi * FW + xi + Math.min(799, Math.floor(d1))];
        const a2 = res.fog2[yi * FW + xi + Math.max(0, 799 - Math.floor(d2))];
        const fogN = 0.55 * a1 + 0.35 * a2 + 0.1 * (yi / PH); // nappes, un peu plus denses en bas
        // densité : montée (le seuil descend), puis déchirure (le seuil remonte)
        const tu = 0.98 - 0.85 * cover, up = smooth(tu - 0.13, tu + 0.13, fogN);
        const td = 0.12 + 0.88 * Math.pow(clear, 0.8), down = smooth(td - 0.12, td + 0.12, fogN); // la brume reste là où elle est dense
        const f = u < 0.45 ? up : clear > 0 ? down : 1;
        const V = showVid ? 1 : 0;
        const a = Math.max(V, f);
        if (a <= 0.001) { d[p + 3] = 0; continue; }
        for (let k = 0; k < 3; k++) { const fg = 246 - 5 * k - 8 * a2; d[p + k] = (d[p + k] * V * (1 - f) + fg * f) / Math.max(1e-3, V * (1 - f) + f); }
        d[p + 3] = a * 255;
      }
      o.putImageData(v, 0, 0);
      return;
    }

    if (mode === 'goutte') {
      if (tt < oAt) {
        // goutte qui tombe (0–16 %), puis diffusion en volutes depuis le centre
        const R = 1.3 * ease((ui - 0.15) / 0.85), drift = tt * 7;
        for (let i = 0, p = 0; i < PW * PH; i++, p += 4) {
          const xi = i % PW, yi = (i - xi) / PW;
          const dn = Math.hypot((xi / PW - 0.5) * 1.78, yi / PH - 0.5) / 1.02;
          const lf = n2[Math.floor(yi / 5) * PW + Math.floor((xi / 5 + drift) % PW)], fine = n1[i];
          const f = dn + (0.34 * (lf - 0.5) + 0.12 * (fine - 0.5)) * (0.35 + 0.65 * Math.min(1, R * 2));
          const V = R <= 0 ? 0 : ui >= 1 ? 1 : smooth(R, R - 0.035, f);
          const e = (f - R + 0.012) / 0.022, fringe = R > 0 && ui < 1 ? Math.exp(-e * e) : 0; // liseré d'encre
          const hz = R > 0 && ui < 1 ? 0.4 * smooth(R + 0.14, R, f) * (1 - V) * smooth(0.35, 0.7, lf) : 0; // fumée
          const a = Math.max(V, hz, 0.85 * fringe);
          if (a <= 0.001) { d[p + 3] = 0; continue; }
          for (let k = 0; k < 3; k++) {
            const vid = d[p + k] * V + paper[p + k] * (1 - V);
            const smoke = paper[p + k] * 0.55 + INK[k] * 0.45;
            const c = (vid * V + smoke * hz * (1 - V)) / Math.max(1e-3, V + hz * (1 - V));
            d[p + k] = c * (1 - 0.85 * fringe) + INK[k] * 0.85 * fringe;
          }
          d[p + 3] = a * 255;
        }
        o.putImageData(v, 0, 0);
        if (ui < 0.17) { // la goutte
          const u = ui / 0.16, gy = -20 + (PH / 2 + 20) * u * u;
          o.fillStyle = `rgb(${INK.join(',')})`; o.beginPath(); o.ellipse(PW / 2, gy, 9, 13, 0, 0, 7); o.fill();
        }
        return;
      }
      // sortie : passage à l'encre, puis l'image coule vers le bas en traînées de vitesses différentes
      const src = new Uint8ClampedArray(d), inkMix = ease(uo / 0.35), run = Math.pow(ease((uo - 0.2) / 0.8), 1.4);
      for (let i = 0, p = 0; i < PW * PH; i++, p += 4) {
        const xi = i % PW, yi = (i - xi) / PW;
        const sp = 0.55 + 1.1 * n1[Math.floor(xi / 6) + 50 * PW]; // vitesse de la traînée (par colonne)
        const off = run * PH * 1.25 * sp, sy = Math.round(yi - off);
        if (sy < 0) { d[p + 3] = 0; continue; }
        const j = sy * PW + xi, q = j * 4, ink = inkOf(j);
        for (let k = 0; k < 3; k++) { const inkV = paper[q + k] * (1 - ink) + INK[k] * ink; d[p + k] = src[q + k] * (1 - inkMix) + inkV * inkMix; }
        d[p + 3] = 255 * smooth(0, 60 + 120 * sp, yi - off) * (1 - smooth(0.85, 1, uo));
      }
      o.putImageData(v, 0, 0);
      return;
    }

    if (mode === 'lavis') {
      // entrée : encre tamponnée (0–35 %), puis taches de couleur ; sortie : la couleur rentre dans les taches, l'encre pâlit
      const pThr = tt < oAt ? 1.05 - 1.35 * ease(ui / 0.35) : -0.3 + 1.35 * ease((uo - 0.5) / 0.5);
      const cThr = tt < oAt ? 0.9 - 1.5 * smooth(0.28, 1, ui) : -0.6 + 1.5 * smooth(0, 0.65, uo);
      for (let i = 0, p = 0; i < PW * PH; i++, p += 4) {
        const P = smooth(pThr - 0.05, pThr + 0.05, n1[i]);
        if (P <= 0.001) { d[p + 3] = 0; continue; }
        const C = smooth(cThr - 0.045, cThr + 0.045, blot[i]);
        const e = (blot[i] - cThr - 0.02) / 0.02, rim = 1 - 0.32 * Math.exp(-e * e); // pigment accumulé au bord de la tache
        const ink = inkOf(i);
        for (let k = 0; k < 3; k++) {
          const inkV = paper[p + k] * (1 - ink) + INK[k] * ink;
          d[p + k] = (inkV * (1 - C) + d[p + k] * C) * rim;
        }
        d[p + 3] = P * 255;
      }
    } else {
      // pinceau : trois bandes, sens alternés ; tête effilochée, poils (bruit étiré à l'horizontale)
      const bands = [[0.2, 0, 0.42, 1], [0.52, 0.22, 0.66, -1], [0.82, 0.44, 0.9, 1]]; // [centre y, début, fin, sens]
      const head = (u: number, a: number, b: number) => -0.15 + 1.35 * ease((u - a) / (b - a));
      const cover = (x: number, y: number, u: number, order: number[]) => {
        let m = 0;
        const yp = Math.round(y);
        order.forEach((bi, k) => {
          const [cy, , , dir] = bands[bi];
          const a = k * 0.22, b = a + 0.42, pr = (u - a) / (b - a), h = head(u, a, b);
          if (h <= -0.15) return;
          const xx = dir > 0 ? x : 1 - x;
          const sr = n1[((yp * 5 + bi * 97) % PH) * PW + Math.floor(xx * 16) + 300]; // poils : rayures horizontales fines
          const half = 0.2 + 0.03 * Math.sin(xx * 7 + bi * 2) + 0.05 * (sr - 0.5);
          const vy = smooth(half, half - 0.012, Math.abs(y / PH - cy));
          const hx = h + 0.06 * (sr - 0.5);
          const body = smooth(hx, hx - 0.025, xx);
          const dryZone = smooth(hx - 0.28, hx - 0.02, xx); // blanc volant près de la tête du pinceau
          const gap = (0.22 + 0.42 * dryZone) * (1 - smooth(0.85, 1.35, pr));
          m = Math.max(m, vy * body * smooth(gap - 0.04, gap + 0.04, sr));
        });
        return m;
      };
      const inPh = tt < oAt;
      const fade = inPh ? 0 : 1.25 * ease((uo - 0.42) / 0.55);
      for (let i = 0, p = 0; i < PW * PH; i++, p += 4) {
        const x = (i % PW) / PW, y = (i - (i % PW)) / PW;
        if (inPh) {
          const m = ui >= 1 ? 1 : cover(x, y, ui, [0, 1, 2]);
          if (m <= 0.001) { d[p + 3] = 0; continue; }
          d[p + 3] = m * 255;
        } else {
          const ink = cover(x, y, clamp(uo / 0.45), [2, 1, 0]); // les coups d'encre recouvrent
          const keep = smooth(fade - 0.15, fade + 0.15, 0.1 + 0.8 * n1[Math.floor(y / 4) * PW + Math.floor(i % PW / 4)]); // l'encre pâlit jusqu'au papier, par taches
          const pale = 0.8 * fade; // l'encre pâlit vers le gris du papier en se retirant
          for (let k = 0; k < 3; k++) { const ik = INK[k] + (paper[p + k] - INK[k]) * pale; d[p + k] = d[p + k] * (1 - ink) + ik * ink; }
          d[p + 3] = keep * 255;
        }
      }
    }
    o.putImageData(v, 0, 0);
  }, [res, inDur, oAt, outDur, mode, glyph]);

  const sc = 1 + (zoom - 1) * (t / total);
  return (
    <AbsoluteFill>
      {res && <OffthreadVideo src={staticFile(src)} muted startFrom={Math.round(startFrom * fps)} playbackRate={playbackRate} onVideoFrame={paint} style={{ opacity: 0, position: 'absolute', width: 2, height: 2 }} />}
      <canvas ref={out} width={PW} height={PH} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `scale(${sc})` }} />
    </AbsoluteFill>
  );
};
