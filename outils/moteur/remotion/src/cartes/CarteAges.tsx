// Essai : « la carte traverse les âges » (transition Han → Qing, 7 s, vue de dessus ; skill carte-peinte). La même
// géographie (cadrage chine_centre_nord) passe par quatre cartes chinoises réelles pendant que le compteur du rouleau
// défile ; chaque passage reprend le geste de sa technique :
//   soie (Yang Xiong) → Mawangdui, Han : l'encre gagne la soie depuis Chang'an ;
//   → atlas imprimé Song (歷代地理指掌圖) : la feuille imprimée se soulève depuis le coin, verso en transparence ;
//   → carte peinte Ming (大明混一圖) : la couleur se répand depuis les fleuves ;
//   → atlas de Kangxi (Qing) : gravure au burin, puis le méridien de Pékin (中, méridien zéro de l'atlas) se grave en
//     vermillon, les autres méridiens et parallèles en partent, et 京師 s'incise à leur croisement.
// La caméra se recadre en douceur : Chang'an → Kaifeng → nord → Pékin.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { carte } from './CartePeinte';
import { CompteurAnnees } from '../rouleau3d/Rouleau3D';

export const AGES_SECONDS = 7.5;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const sm = (a: number, b: number, x: number) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const VUE = carte('chine_centre_nord').vue;
const PX = (lon: number, lat: number): [number, number] => [960 + (lon - VUE.lon) * VUE.k, 540 - (lat - VUE.lat) * VUE.k * 1.18];
const CA = PX(108.9, 34.3), KF = PX(114.3, 34.8), BJ = PX(116.4, 39.9);
const T = { encre: [0.25, 1.2], feuille: [1.45, 2.4], couleur: [2.85, 3.75], burin: [4.2, 5.0], meridien: [5.0, 5.6], grille: [5.3, 6.2], ville: [5.75, 6.7] };
const CARTES = { soie: 'chine_centre_nord', han: 'chine_centre_nord_mawangdui', song: 'chine_centre_nord_zhizhang', ming: 'chine_centre_nord_hunyi', qing: 'chine_centre_nord_kangxi' };

// caméra : (instant, centre en px de carte, zoom) ; interpolation douce (Hermite monotone simplifiée)
const CAM: [number, [number, number], number][] = [[0, [960, 540], 1.0], [1.4, [880, 528], 1.12], [2.9, [KF[0], 500], 1.42], [4.3, [1120, 360], 1.55], [5.8, [BJ[0], 262], 2.0], [7.5, [BJ[0], 252], 2.08]];
const camera = (t: number) => {
  let i = 0; while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const [t0, c0, z0] = CAM[i], [t1, c1, z1] = CAM[i + 1], k = ease(seg(t, t0, t1));
  return { cx: lerp(c0[0], c1[0], k), cy: lerp(c0[1], c1[1], k), z: lerp(z0, z1, k) };
};
// compteur : années clés (la période affichée suit la carte à l'écran)
const ANS: [number, number][] = [[0.3, 1], [1.35, 220], [1.9, 1000], [2.8, 1279], [3.4, 1420], [4.2, 1644], [5.0, 1700], [5.9, 1728]];
const annee = (t: number) => { if (t <= ANS[0][0]) return 1; for (let i = 0; i < ANS.length - 1; i++) if (t <= ANS[i + 1][0]) return Math.round(lerp(ANS[i][1], ANS[i + 1][1], ease(seg(t, ANS[i][0], ANS[i + 1][0])))); return 1728; };

// légendes des cartes (cartouche en bas à gauche)
const LEGENDES: [number, number, string, string][] = [
  [0.6, 1.45, '馬王堆地形圖', 'carte de Mawangdui · soie, 168 av. J.-C.'],
  [1.9, 2.85, '歷代地理指掌圖', 'premier atlas imprimé · Song, v. 1100'],
  [3.3, 4.2, '大明混一圖', 'carte peinte sur soie · Ming, 1389'],
  [4.7, 7.5, '皇輿全覽圖', 'atlas de Kangxi · gravé sur cuivre, 1718'],
];

// fleuves (lon, lat) : départ de la couleur pour la carte Ming
const FLEUVES: [number, number][][] = [
  [[96.5, 35], [100, 36], [103.8, 36.1], [105.5, 37.5], [106.4, 39.5], [108, 40.7], [110.5, 40.3], [111, 39], [110.5, 37], [110.4, 35.5], [111.5, 34.7], [113.6, 34.9], [115.5, 35.6], [117, 36.7], [118.8, 37.7]],
  [[104.5, 28.8], [106.5, 29.6], [108.5, 30.8], [111.3, 30.7], [112.5, 30], [114.3, 30.6], [116, 29.8], [117.5, 31], [119, 32.2], [121, 31.6]],
  [[104.7, 34.6], [107, 34.4], [109, 34.5], [110.3, 34.6]],
];

// bruit fractal (480 × 270), et distance aux fleuves en px de carte (grille au quart)
const MW = 480, MH = 270;
const bruit = () => {
  let s = 4242; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const out = new Float32Array(MW * MH);
  [[12, 0.5], [24, 0.28], [48, 0.14], [96, 0.08]].forEach(([n, a]) => {
    const g = Array.from({ length: (n + 1) * (n + 1) }, r), cw = MW / n, ch = MH / (n * MH / MW);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const fx = x / cw, fy = y / cw, ix = Math.floor(fx), iy = Math.min(n - 1, Math.floor(fy)), ux = fx - ix, uy = fy - iy;
      const v = (i: number, j: number) => g[Math.min(n, j) * (n + 1) + Math.min(n, i)];
      const sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
      out[y * MW + x] += a * lerp(lerp(v(ix, iy), v(ix + 1, iy), sx), lerp(v(ix, iy + 1), v(ix + 1, iy + 1), sx), sy);
    }
    void ch;
  });
  return out;
};
const distanceFleuves = () => {
  const pts: [number, number][] = [];
  FLEUVES.forEach((f) => { for (let i = 0; i < f.length - 1; i++) for (let k = 0; k < 12; k++) { const a = PX(...f[i]), b = PX(...f[i + 1]); pts.push([lerp(a[0], b[0], k / 12), lerp(a[1], b[1], k / 12)]); } });
  const d = new Float32Array(MW * MH);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { let m = 1e9; const X = x * 4, Y = y * 4; for (const p of pts) { const q = (p[0] - X) ** 2 + (p[1] - Y) ** 2; if (q < m) m = q; } d[y * MW + x] = Math.sqrt(m); }
  return d;
};

type Res = { img: Record<string, HTMLImageElement>; n: Float32Array; df: Float32Array; mask: HTMLCanvasElement; off: HTMLCanvasElement };

export const EssaiCarteAges: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps, ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender('cartes et polices'));
  const [R, setR] = useState<Res | null>(null);
  useEffect(() => {
    const charge = (id: string) => new Promise<[string, HTMLImageElement]>((res) => { const im = new Image(); im.onload = () => res([id, im]); im.src = staticFile(`cartes/${carte(id).peinte}`); });
    const fonts = [new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`), new FontFace('ShuimoCaps', `url(${staticFile('fonts/Cinzel.ttf')})`, { weight: '400 900' }), new FontFace('ShuimoLegende', `url(${staticFile('fonts/ZhuqueFangsong-Regular.ttf')})`), new FontFace('ShuimoLatin', `url(${staticFile('fonts/Cormorant.ttf')})`, { weight: '300 700' })];
    Promise.all([Promise.all(fonts.map((ff) => ff.load().then((x) => document.fonts.add(x)))), Promise.all([...new Set(Object.values(CARTES))].map(charge))]).then(([, ims]) => {
      const mk = (w: number, hh: number) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c; };
      setR({ img: Object.fromEntries(ims), n: bruit(), df: distanceFleuves(), mask: mk(MW, MH), off: mk(1920, 1080) });
      continueRender(h);
    });
  }, [h]);

  useLayoutEffect(() => {
    if (!R || !ref.current) return;
    const ctx = ref.current.getContext('2d')!, cam = camera(t);
    // carte dans le repère de la caméra
    const pose = (c: CanvasRenderingContext2D) => { c.setTransform(cam.z, 0, 0, cam.z, 960 - cam.cx * cam.z, 540 - cam.cy * cam.z); };
    const dessine = (c: CanvasRenderingContext2D, id: string, a = 1) => { c.save(); pose(c); c.globalAlpha = a; c.drawImage(R.img[carte(id).id] ?? R.img[id], 0, 0, 1920, 1080); c.restore(); };
    // écran → carte (px), pour les masques
    const versCarte = (sx: number, sy: number) => [cam.cx + (sx - 960) / cam.z, cam.cy + (sy - 540) / cam.z];
    // masque calculé à basse résolution puis agrandi (bords doux) : alpha(x, y) en px d'écran
    const masque = (fn: (sx: number, sy: number, i: number) => number) => {
      const m = R.mask.getContext('2d')!, d = m.createImageData(MW, MH);
      for (let y = 0, i = 0; y < MH; y++) for (let x = 0; x < MW; x++, i++) { d.data[i * 4 + 3] = 255 * clamp(fn(x * 4 + 2, y * 4 + 2, i)); }
      m.putImageData(d, 0, 0);
      return R.mask;
    };
    // nouvelle carte posée à travers un masque
    const aTravers = (id: string, fn: (sx: number, sy: number, i: number) => number, frange?: { col: string; fn: (sx: number, sy: number, i: number) => number }) => {
      const o = R.off.getContext('2d')!;
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, 1920, 1080);
      dessine(o, id);
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'destination-in'; o.imageSmoothingEnabled = true; o.drawImage(masque(fn), 0, 0, 1920, 1080);
      o.globalCompositeOperation = 'source-over';
      ctx.drawImage(R.off, 0, 0);
      if (frange) {
        o.clearRect(0, 0, 1920, 1080); o.fillStyle = frange.col; o.fillRect(0, 0, 1920, 1080);
        o.globalCompositeOperation = 'destination-in'; o.drawImage(masque(frange.fn), 0, 0, 1920, 1080); o.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(R.off, 0, 0); ctx.restore();
      }
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#e9dfc9'; ctx.fillRect(0, 0, 1920, 1080);

    // ── 1. soie → Mawangdui : l'encre gagne depuis Chang'an
    const k1 = ease(seg(t, T.encre[0], T.encre[1]));
    const sCA = [960 + (CA[0] - cam.cx) * cam.z, 540 + (CA[1] - cam.cy) * cam.z];
    const champ1 = (sx: number, sy: number, i: number) => 0.55 * Math.hypot(sx - sCA[0], (sy - sCA[1]) * 1.4) / 1500 + 0.45 * R.n[i];
    // ── 2. Mawangdui → atlas Song : la feuille se soulève depuis le coin bas droit
    const k2 = ease(seg(t, T.feuille[0], T.feuille[1]));
    // ── 3. Song → Ming : la couleur part des fleuves
    const k3 = ease(seg(t, T.couleur[0], T.couleur[1]));
    // ── 4. Ming → Kangxi : burin (hachures qui balaient l'écran puis se remplissent)
    const k4 = seg(t, T.burin[0], T.burin[1]);

    if (t < T.feuille[0]) {
      dessine(ctx, CARTES.soie);
      if (k1 > 0) aTravers(CARTES.han, (sx, sy, i) => sm(k1 * 1.1 - 0.04, k1 * 1.1, 1.1 - champ1(sx, sy, i) - 0.0), { col: '#5a3e28', fn: (sx, sy, i) => { const v = 1.1 - champ1(sx, sy, i), e = k1 * 1.1; return 0.45 * sm(e - 0.07, e - 0.035, v) * (1 - sm(e - 0.01, e + 0.01, v)) * (k1 < 1 ? 1 : 0); } });
    } else if (t < T.couleur[0]) {
      // feuille : le dessous (Song) d'abord, puis la feuille Han rabattue le long du pli
      dessine(ctx, CARTES.song);
      const n = [0.86, 0.51], C = [1920, 1080], L = lerp(C[0] * n[0] + C[1] * n[1] + 20, -350, k2);
      const sous = (p: number[]) => p[0] * n[0] + p[1] * n[1] < L;
      const rect = [[0, 0], [1920, 0], [1920, 1080], [0, 1080]];
      const coupe = (keep: (p: number[]) => boolean) => {
        const out: number[][] = [];
        rect.forEach((a, i) => { const b = rect[(i + 1) % 4], ka = keep(a), kb = keep(b); if (ka) out.push(a); if (ka !== kb) { const da = a[0] * n[0] + a[1] * n[1] - L, db = b[0] * n[0] + b[1] * n[1] - L, u = da / (da - db); out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]); } });
        return out;
      };
      const reste = coupe(sous), leve = coupe((p) => !sous(p)), refl = (p: number[]) => { const d = p[0] * n[0] + p[1] * n[1] - L; return [p[0] - 2 * d * n[0], p[1] - 2 * d * n[1]]; };
      const rabat = leve.map(refl);
      const chemin = (pts: number[][]) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
      if (reste.length > 2) { ctx.save(); chemin(reste); ctx.clip(); dessine(ctx, CARTES.han); ctx.restore(); }
      if (rabat.length > 2 && k2 < 1) {
        // ombre portée du rabat, puis verso : papier crème, encre du recto en transparence (image miroir), dégradé au pli
        ctx.save(); ctx.shadowColor = 'rgba(40,25,10,0.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetX = -14; ctx.shadowOffsetY = -10; chemin(rabat); ctx.fillStyle = '#e8dcc4'; ctx.fill(); ctx.restore();
        ctx.save(); chemin(rabat); ctx.clip();
        const a = 1 - 2 * n[0] * n[0], b = -2 * n[0] * n[1], d = 1 - 2 * n[1] * n[1], e = 2 * L * n[0], ff = 2 * L * n[1];
        ctx.setTransform(a, b, b, d, e, ff); ctx.globalAlpha = 0.16;
        const z = cam.z; ctx.transform(z, 0, 0, z, 960 - cam.cx * z, 540 - cam.cy * z); ctx.drawImage(R.img[CARTES.han], 0, 0, 1920, 1080);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
        const g = ctx.createLinearGradient(L * n[0], L * n[1], (L - 260) * n[0], (L - 260) * n[1]);
        g.addColorStop(0, 'rgba(255,250,238,0.55)'); g.addColorStop(0.25, 'rgba(255,250,238,0)'); g.addColorStop(1, 'rgba(90,60,30,0.18)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
        ctx.restore();
      }
    } else if (t < T.burin[0]) {
      dessine(ctx, CARTES.song);
      aTravers(CARTES.ming, (sx, sy, i) => { const [mx, my] = versCarte(sx, sy), j = Math.min(MH - 1, Math.max(0, Math.round(my / 4))) * MW + Math.min(MW - 1, Math.max(0, Math.round(mx / 4))); const v = 1 - (0.75 * Math.min(1, R.df[j] / 420) + 0.25 * R.n[i]); return sm(1 - k3 * 1.15, 1.06 - k3 * 1.15, v); },
        { col: '#3f7f73', fn: (sx, sy, i) => { const [mx, my] = versCarte(sx, sy), j = Math.min(MH - 1, Math.max(0, Math.round(my / 4))) * MW + Math.min(MW - 1, Math.max(0, Math.round(mx / 4))); const v = 1 - (0.75 * Math.min(1, R.df[j] / 420) + 0.25 * R.n[i]), e = 1 - k3 * 1.15; return 0.35 * sm(e - 0.05, e, v) * (1 - sm(e + 0.02, e + 0.07, v)) * (k3 < 1 ? 1 : 0); } });
    } else {
      dessine(ctx, CARTES.ming);
      // burin : un front qui balaie de gauche à droite ; derrière lui, hachures fines qui s'épaississent jusqu'au plein
      aTravers(CARTES.qing, (sx, sy, i) => { const front = k4 * 1.35 - sx / 1920 * 0.35 - 0.12 * R.n[i]; const plein = clamp(front * 2.2); const hach = ((sx + sy * 0.6) / 7) % 1; return front <= 0 ? 0 : sm(1 - plein - 0.05, 1 - plein + 0.05, hach) + plein * plein; });
    }

    // ── 5. graticule de l'atlas : méridien de Pékin (中) en vermillon, puis méridiens et parallèles, 1° d'écart
    const km = ease(seg(t, T.meridien[0], T.meridien[1])), kg = seg(t, T.grille[0], T.grille[1]);
    if (km > 0) {
      ctx.save(); pose(ctx); ctx.lineCap = 'round';
      const ligne = (a: [number, number], b: [number, number], k: number) => { if (k <= 0) return; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], k), lerp(a[1], b[1], k)); ctx.stroke(); };
      ctx.strokeStyle = 'rgba(38,28,20,0.55)'; ctx.lineWidth = 1.1 / cam.z * 1.6;
      for (let lon = 105; lon <= 128; lon++) { if (Math.abs(lon - 116.4) < 0.5) continue; const dl = Math.abs(lon - 116.4); ligne(PX(lon, 44), PX(lon, 25), ease(seg(kg, dl * 0.05, dl * 0.05 + 0.45))); }
      for (let lat = 26; lat <= 43; lat++) { const dl = Math.abs(lat - 39.9); const k = ease(seg(kg, 0.1 + dl * 0.05, 0.55 + dl * 0.05)); const m = PX(116.4, lat); ligne(m, PX(128, lat), k); ligne(m, PX(104, lat), k); }
      // méridien zéro : vermillon, gravé du haut vers le bas
      ctx.strokeStyle = 'rgba(178,44,30,0.9)'; ctx.lineWidth = 2.2 / cam.z * 1.6; ligne(PX(116.4, 44), PX(116.4, 25), km);
      // repères des méridiens, comme sur l'atlas : 中, 東一, 西一…
      const NUM = ['', '一', '二', '三', '四', '五', '六'];
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let dl = -6; dl <= 6; dl++) {
        const a = dl === 0 ? km : ease(seg(kg, Math.abs(dl) * 0.05 + 0.3, Math.abs(dl) * 0.05 + 0.6));
        if (a <= 0) continue;
        const p = PX(116.4 + dl, 41.85), txt = dl === 0 ? '中' : (dl > 0 ? '東' : '西') + NUM[Math.abs(dl)];
        ctx.globalAlpha = a; ctx.fillStyle = dl === 0 ? '#a8281c' : '#2a1f17'; ctx.font = `${(dl === 0 ? 30 : 20) / cam.z * 1.6}px ShuimoKai`;
        ctx.fillText(txt, p[0] + 4 / cam.z, p[1]);
      }
      ctx.restore();
    }
    // ── 6. 京師 : anneau gravé, plan de la ville (deux enceintes en 凸) tracé trait par trait, nom et légende
    const kv = seg(t, T.ville[0], T.ville[1]);
    if (kv > 0) {
      const S = [960 + (BJ[0] - cam.cx) * cam.z, 540 + (BJ[1] - cam.cy) * cam.z];
      ctx.save(); ctx.translate(S[0], S[1]); ctx.scale(1.5, 1.5); ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
      const kr = ease(seg(kv, 0, 0.45));
      ctx.strokeStyle = `rgba(178,44,30,${0.85 * (1 - 0.5 * kr)})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, 18 + 34 * kr, 0, Math.PI * 2 * kr); ctx.stroke();
      // 凸 : ville intérieure (carré) au nord, ville extérieure (plus large, plus basse) au sud
      const plan = [[-14, -18], [14, -18], [14, 2], [18, 2], [18, 16], [-18, 16], [-18, 2], [-14, 2], [-14, -18]];
      const kp = ease(seg(kv, 0.15, 0.7)), tot = plan.length - 1, n = kp * tot;
      ctx.strokeStyle = '#1f1610'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(plan[0][0], plan[0][1]);
      for (let i = 1; i <= Math.ceil(n) && i <= tot; i++) { const u = Math.min(1, n - (i - 1)); ctx.lineTo(lerp(plan[i - 1][0], plan[i][0], u), lerp(plan[i - 1][1], plan[i][1], u)); }
      ctx.stroke();
      if (kp >= 1) { ctx.strokeStyle = 'rgba(31,22,16,0.6)'; ctx.lineWidth = 1.2; ctx.strokeRect(-6, -10, 12, 9); }
      const kn = ease(seg(kv, 0.55, 1));
      ctx.globalAlpha = kn; ctx.fillStyle = '#1f1610'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '50px ShuimoKai'; ctx.fillText('京師', 34, -6);
      ctx.font = '600 24px ShuimoLatin'; ctx.fillStyle = '#3b2c20'; ctx.fillText('Pékin', 36, 30);
      ctx.restore();
    }
    // ── légendes des cartes (cartouche papier, bas gauche)
    LEGENDES.forEach(([a, b, zh, fr]) => {
      const al = sm(a, a + 0.3, t) * (1 - sm(b - 0.25, b, t));
      if (al <= 0) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = al;
      ctx.fillStyle = 'rgba(244,236,220,0.88)'; ctx.shadowColor = 'rgba(40,25,10,0.25)'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.roundRect(60, 880, 520, 100, 10); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#2a1f17'; ctx.font = '44px ShuimoLegende'; ctx.textBaseline = 'alphabetic'; ctx.fillText(zh, 86, 928);
      ctx.fillStyle = '#4b4038'; ctx.font = 'italic 600 26px ShuimoLatin'; ctx.fillText(fr, 86, 964);
      ctx.restore();
    });
    if (t > T.meridien[1] - 0.1) {
      const al = sm(T.ville[1] - 0.3, T.ville[1] + 0.2, t);
      ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = '#4b4038'; ctx.font = 'italic 600 26px ShuimoLatin'; ctx.fillText("méridien zéro de l'atlas : Pékin (中)", 86, 1012); ctx.restore();
    }
    // vignettage
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const v = ctx.createRadialGradient(960, 540, 600, 960, 540, 1150); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(50,32,16,0.32)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 1920, 1080);
  });
  const ca = sm(0.1, 0.5, t) * (1 - sm(6.6, 7.2, t));
  return (
    <AbsoluteFill style={{ background: '#e9dfc9' }}>
      <canvas ref={ref} width={1920} height={1080} style={{ width: '100%', height: '100%' }} />
      <CompteurAnnees de="han" annees={[1, 1728]} year={annee(t)} a={ca} />
    </AbsoluteFill>
  );
};
