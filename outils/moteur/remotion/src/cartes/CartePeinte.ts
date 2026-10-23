// Cartes peintes réutilisables (skill carte-peinte) : catalogue outils/moteur/assets/cartes/cartes.json, images copiées
// dans public/cartes/ par sync.mjs. Chaque carte est peinte au cadrage exact d'une vue { lon, lat, k } du moteur : tout ce
// qu'on pose dessus passe par E.proj(vue, [lon, lat]). Type 1 : « soie_song » (fond sans texte, manière Song).
import { staticFile } from 'remotion';
import catalogue from '../data/cartes.json';
import { rng } from '../shuimo/common';
import { INK, PIGMENT } from '../shuimo_xue/InkStage';

export type Vue = { lon: number; lat: number; k: number };
export type Carte = (typeof catalogue.cartes)[number];
export const CARTES: Record<string, Carte> = Object.fromEntries(catalogue.cartes.map((c) => [c.id, c]));
export const carte = (id: string): Carte => {
  const c = CARTES[id];
  if (!c) throw new Error(`carte inconnue : ${id} (voir assets/cartes/cartes.json)`);
  return c;
};

// chargement : à appeler avec les autres images de la composition (delayRender)
const IMGS: Record<string, HTMLImageElement> = {};
export const chargerCartes = (ids: string[]) => Promise.all(ids.map((id) => new Promise<void>((res) => {
  const im = new Image();
  im.onload = () => { IMGS[id] = im; res(); };
  im.onerror = () => res();
  im.src = staticFile(`cartes/${carte(id).peinte}`);
})));

const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const VERMILLON = PIGMENT.hand, ENCRE = INK, PAPIER = '#efe3c8', SOIE = 'rgba(246,238,224,0.9)', BRUN = '#4b4038';

// fond peint ; repli : la carte vectorielle du moteur au même cadrage. Renvoie false si l'image manque.
export const fondCarte = (ctx: CanvasRenderingContext2D, E: any, id: string) => {
  const c = carte(id), im = IMGS[id];
  if (im) { ctx.drawImage(im, 0, 0, 1920, 1080); return true; }
  E.mapLayer(ctx, c.vue, c.vue, 120, `carte_${id}`, (cc: CanvasRenderingContext2D, w: any) => E.drawMap(cc, 0, w, { paper: true, rivers: 1, deco: false }));
  E.mapDeco(ctx, { paper: true });
  return false;
};

// crédit en bas à droite, hors zoom (à dessiner après ctx.restore() de la poussée)
export const creditCarte = (ctx: CanvasRenderingContext2D, E: any, id: string, a = 1) => {
  if (!IMGS[id]) return;
  E.text(ctx, carte(id).credit, 1880, 1046, { font: 'Cormorant', size: 22, weight: 600, color: 'rgba(60,48,36,0.7)', align: 'right', alpha: a });
};

// lieu : petit cachet vermillon au point, nom en fangsong, transcription en Cormorant (à gauche ou à droite)
export const lieu = (ctx: CanvasRenderingContext2D, E: any, q: number[], zh: string, fr: string, a: number,
  o: { cote?: 'g' | 'd'; arrivee?: number; taille?: number; seed?: number } = {}) => {
  if (a <= 0) return;
  const d = o.arrivee ?? 1, sz = (o.taille ?? 26) * (1 + 0.5 * (1 - d));
  ctx.save(); ctx.globalAlpha = a; ctx.translate(q[0], q[1]); ctx.rotate(-0.05 + 0.02 * ((o.seed ?? 0) % 4));
  ctx.fillStyle = rgb(VERMILLON, 0.9); ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
  ctx.strokeStyle = SOIE; ctx.lineWidth = 2; ctx.strokeRect(-sz / 2 + 4, -sz / 2 + 4, sz - 8, sz - 8);
  ctx.restore();
  const g = o.cote === 'g', lx = q[0] + (g ? -24 : 24), al = g ? 'right' : 'left';
  E.text(ctx, zh, lx, q[1] - 8, { font: 'ShuimoLegende', size: 62, color: rgb(ENCRE), alpha: a, align: al });
  if (fr) E.text(ctx, fr, lx, q[1] + 40, { font: 'Cormorant', size: 36, weight: 700, color: BRUN, alpha: a, align: al });
};

// route : trait de pinceau effilé de p vers q (épais au départ), courbé ; k = avancement 0..1 ;
// marge0 / marge1 = px laissés libres autour du départ et de l'arrivée (cachets)
export const routePinceau = (ctx: CanvasRenderingContext2D, p: number[], q: number[], k: number, a: number,
  o: { courbe?: number; marge0?: number; marge1?: number; largeur?: number; seed?: number } = {}) => {
  if (k <= 0 || a <= 0) return;
  const cb = o.courbe ?? 0.18, mx = (p[0] + q[0]) / 2 + (p[1] - q[1]) * cb, my = (p[1] + q[1]) / 2 - (p[0] - q[0]) * cb;
  const pt = (f: number) => [(1 - f) * (1 - f) * p[0] + 2 * (1 - f) * f * mx + f * f * q[0], (1 - f) * (1 - f) * p[1] + 2 * (1 - f) * f * my + f * f * q[1]];
  const D = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1, f0 = (o.marge0 ?? 26) / D, f1 = 1 - (o.marge1 ?? 62) / D;
  const r = rng(o.seed ?? 3), N = 40, w0 = o.largeur ?? 7.5, L: number[][] = [], R: number[][] = [];
  for (let s = 0; s <= N; s++) {
    const f = f0 + (s / N) * k * (f1 - f0), P = pt(f), P2 = pt(f + 0.01);
    const dx = P2[0] - P[0], dy = P2[1] - P[1], d = Math.hypot(dx, dy) || 1;
    const w = (w0 - (w0 - 2) * (s / N)) * (0.85 + 0.3 * r());
    L.push([P[0] - (dy / d) * w, P[1] + (dx / d) * w]); R.push([P[0] + (dy / d) * w, P[1] - (dx / d) * w]);
  }
  ctx.save(); ctx.globalAlpha = a * 0.78; ctx.fillStyle = rgb(ENCRE, 0.82);
  ctx.beginPath(); L.forEach((P, j) => (j ? ctx.lineTo(P[0], P[1]) : ctx.moveTo(P[0], P[1]))); R.reverse().forEach((P) => ctx.lineTo(P[0], P[1]));
  ctx.closePath(); ctx.fill(); ctx.restore();
};

// capitale : grand cachet en petit sceau (2 caractères en colonne), onde à l'arrivée des routes, cartouche nom + légende
// t = temps courant ; t0 = apparition ; onde = [début, fin] de l'arrivée (ou null)
export const capitale = (ctx: CanvasRenderingContext2D, E: any, q: number[], sceau: string, nom: string, sous: string,
  t: number, t0: number, onde: [number, number] | null = null) => {
  const a = seg(t, t0, t0 + 0.5);
  if (a <= 0) return;
  const arr = onde ? seg(t, onde[0], onde[1]) : 0, pulse = arr > 0 && arr < 1 ? Math.sin(arr * Math.PI) : 0;
  if (onde) {
    ctx.save(); ctx.globalAlpha = a * (0.5 * (1 - arr) + 0.15); ctx.strokeStyle = rgb(VERMILLON, 0.8); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(q[0], q[1], 46 + 60 * arr, 0, 7); ctx.stroke(); ctx.restore();
  }
  const S = 74 * (1 + 0.5 * (1 - seg(t, t0, t0 + 0.2))) * (1 + 0.06 * pulse), ch = [...sceau];
  ctx.save(); ctx.globalAlpha = a; ctx.translate(q[0], q[1]); ctx.rotate(-0.04);
  ctx.shadowColor = 'rgba(40,20,10,0.3)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  ctx.fillStyle = rgb(VERMILLON, 0.94); ctx.fillRect(-S / 2, -S / 2, S, S); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = SOIE; ctx.lineWidth = 2.5; ctx.strokeRect(-S / 2 + 5, -S / 2 + 5, S - 10, S - 10);
  if (ch.length === 1) E.text(ctx, ch[0], 0, S * 0.02, { font: 'Zhuan', size: S * 0.7, color: '#f6eee0' });
  else { E.text(ctx, ch[0], 0, -S * 0.2, { font: 'Zhuan', size: S * 0.42, color: '#f6eee0' }); E.text(ctx, ch[1], 0, S * 0.22, { font: 'Zhuan', size: S * 0.42, color: '#f6eee0' }); }
  ctx.restore();
  ctx.save(); ctx.globalAlpha = a * 0.88; ctx.fillStyle = PAPIER; ctx.shadowColor = 'rgba(60,40,20,0.25)'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.roundRect(q[0] - 150, q[1] + 52, 300, 88, 10); ctx.fill(); ctx.restore();
  E.text(ctx, nom, q[0], q[1] + 82, { font: 'Cormorant', size: 44, weight: 700, color: rgb(ENCRE), alpha: a });
  E.text(ctx, sous, q[0], q[1] + 122, { font: 'ShuimoLegende', size: 30, color: BRUN, alpha: a });
};
