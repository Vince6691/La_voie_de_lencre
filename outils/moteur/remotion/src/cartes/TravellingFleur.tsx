// Essai : transition Han → Qing « à fleur de carte » (skill carte-peinte). Vue de dessus sur la carte de Yang Xiong
// (cachet 長安), forte descente jusqu'au ras de la soie, puis travelling au ras de la carte de Chang'an à Pékin par
// Luoyang, Kaifeng et la plaine du Hebei ; des découpes peintes se dressent (montagnes sur les reliefs, monuments quand
// le compteur atteint leur époque), la caméra traverse des nuages ; à l'arrivée elle remonte et le sceau de pierre
// frappe 京師. Découpes : assets/cartes/decoupes (planches Nano Banana détourées par tools/detourer_magenta.py).
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { carte } from './CartePeinte';
import { CompteurAnnees, SceauPierre } from '../rouleau3d/Rouleau3D';
import { CamRig, ease, lerp, out3, seg } from './Pekin3D';
import { empreinte, soie, trame } from './TravellingSoie';

export const FLEUR_SECONDS = 12;
const CARTE = 'chine_centre_nord';
const VUE = carte(CARTE).vue;
const P = (lon: number, lat: number): [number, number] => [((lon - VUE.lon) * VUE.k) / 120, ((lat - VUE.lat) * VUE.k * 1.18) / 120];
const VER = '#c0392b', SOL = '#e9dfc9';

// trajet : (temps, lieu, année du compteur) — la caméra passe à chaque étape à l'instant donné
const ETAPES: [number, [number, number], number][] = [
  [3.0, P(108.2, 33.9), 600], // au sud-ouest de Chang'an, fin de la descente
  [4.0, P(110.6, 34.5), 820],
  [5.0, P(112.6, 34.55), 960], // Luoyang
  [6.0, P(114.0, 34.65), 1080], // Kaifeng
  [7.1, P(114.6, 36.5), 1190], // Handan
  [8.2, P(115.5, 38.6), 1450], // Baoding
  [9.2, P(116.1, 39.3), 1728], // devant Pékin
];
const T = { descente: [1.0, 3.0], remonte: [9.2, 10.0], sceau: [10.1, 10.6], leve: [10.95, 11.6], compteur0: 1.4 };
const CA = P(108.9, 34.3), BJ = P(116.4, 39.9);
const courbe = new THREE.CatmullRomCurve3(ETAPES.map(([, p]) => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal');
// position le long du trajet (0..1) à l'instant t, et année du compteur
const uDe = (t: number) => {
  if (t <= ETAPES[0][0]) return 0;
  for (let i = 0; i < ETAPES.length - 1; i++) {
    const [t0] = ETAPES[i], [t1] = ETAPES[i + 1];
    if (t <= t1) return (i + (t - t0) / (t1 - t0)) / (ETAPES.length - 1);
  }
  return 1;
};
const annee = (t: number) => {
  if (t <= T.compteur0) return 1;
  if (t <= ETAPES[0][0]) return Math.round(lerp(1, ETAPES[0][2], ease(seg(t, T.compteur0, ETAPES[0][0])) ** 0.8));
  for (let i = 0; i < ETAPES.length - 1; i++) {
    const [t0, , y0] = ETAPES[i], [t1, , y1] = ETAPES[i + 1];
    if (t <= t1) return Math.round(lerp(y0, y1, (t - t0) / (t1 - t0)));
  }
  return 1728;
};
// instant où le compteur atteint une année (pour lever les monuments)
const quand = (y: number) => { for (let t = 0; t < FLEUR_SECONDS; t += 0.02) if (annee(t) >= y) return t; return FLEUR_SECONDS; };

// découpes : nom de fichier, position, hauteur (unités), instant de levée
type Decoupe = { f: string; p: [number, number]; h: number; at: number; nuage?: boolean; z?: number };
// point à côté du trajet : à la fraction u, décalé de d unités (d > 0 : à gauche dans le sens de la marche)
const cote = (u: number, d: number): [number, number] => { const q = courbe.getPointAt(u), tg = courbe.getTangentAt(u); return [q.x - tg.y * d, q.y + tg.x * d]; };
const MONUMENTS: Decoupe[] = [
  { f: 'pagode_oie', p: cote(0.09, 0.55), h: 0.55, at: quand(652) }, // Grande Pagode de l'oie sauvage, Chang'an, 652
  { f: 'pagode_fer', p: cote(0.47, -0.5), h: 0.6, at: quand(1049) }, // Pagode de fer, Kaifeng, 1049
  { f: 'pont_lugou', p: P(116.0, 39.62), h: 0.18, at: quand(1192) }, // pont Lugou, 1192
  { f: 'muraille_badaling', p: P(116.0, 40.3), h: 0.42, at: quand(1505) }, // Grande Muraille de Badaling, 1505
];

const Decoupes: React.FC<{ t: number; list: Decoupe[]; tex: Record<string, THREE.Texture>; az: number }> = ({ t, list, tex, az }) => (
  <>
    {list.map((d, i) => {
      const tx = tex[d.f];
      if (!tx || t < d.at) return null;
      const k = d.nuage ? 1 : Math.min(1, out3(seg(t, d.at, d.at + 0.55)) * (1 + 0.12 * Math.sin(Math.PI * seg(t, d.at + 0.3, d.at + 0.8))));
      const w = (d.h * tx.image.width) / tx.image.height;
      const a = d.nuage ? seg(t, d.at, d.at + 0.8) : 1;
      return (
        // panneau tourné vers la caméra (autour de la verticale), qui se déplie depuis le sol
        <group key={i} position={[d.p[0], d.p[1], d.z ?? 0]} rotation={[0, 0, az + Math.PI / 2]}>
          <mesh position={[0, 0, (d.h * k) / 2]} rotation={[Math.PI / 2, 0, 0]} scale={[1, Math.max(0.001, k), 1]}>
            <planeGeometry args={[w, d.h]} />
            <meshBasicMaterial map={tx} transparent alphaTest={d.nuage ? 0.02 : 0.45} opacity={a} depthWrite={!d.nuage} side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    })}
  </>
);

type Data = { map: THREE.Texture; paper: THREE.Texture; tex: Record<string, THREE.Texture>; sommets: number[][] };

const Scene: React.FC<{ t: number; d: Data }> = ({ t, d }) => {
  const tr = useMemo(() => trame(), []);
  const mats = useMemo(() => ({ carte: soie(d.map, tr, [40, 22.5]), changan: new THREE.MeshBasicMaterial({ map: empreinte('長安'), transparent: true, depthWrite: false }), jingshi: new THREE.MeshBasicMaterial({ map: empreinte('京師'), transparent: true, depthWrite: false }) }), [d, tr]);
  // montagnes : sur les montagnes peintes proches du trajet, jamais sur le passage ; nuages le long du trajet
  const decor = useMemo(() => {
    const pts = courbe.getSpacedPoints(200), r = (s: number) => { s = Math.sin(s * 91.7) * 43758.5; return s - Math.floor(s); };
    const dist = (x: number, y: number) => Math.min(...pts.map((q) => Math.hypot(q.x - x, q.y - y)));
    const monts: Decoupe[] = [];
    d.sommets.forEach(([x, y], i) => {
      const X = (x - 960) / 120, Y = (540 - y) / 120, dd = dist(X, Y);
      if (dd < 0.5 || dd > 2.2 || r(i) > 0.55) return;
      const u = pts.reduce((b, q, j) => (Math.hypot(q.x - X, q.y - Y) < Math.hypot(pts[b].x - X, pts[b].y - Y) ? j : b), 0) / 200;
      monts.push({ f: `montagnes_${String(1 + (i % 12)).padStart(2, '0')}`, p: [X, Y], h: 0.22 + 0.32 * r(i + 7), at: lerp(T.descente[0] + 0.6, 8.6, u) - 0.9 });
    });
    // « fausses » montagnes de part et d'autre du trajet, pour qu'il y ait toujours du relief à côté (côté est
    // limité vers la fin : la côte du Bohai est proche)
    for (let k = 0, uu = 0.03; uu < 0.95; uu += 0.032, k++) {
      [1, -1].forEach((sg) => {
        if (r(k * 2 + (sg > 0 ? 0 : 1) + 300) > 0.62) return;
        const dmax = sg < 0 && uu > 0.6 ? 0.8 : 1.4, dd = 0.55 + (dmax - 0.55) * r(k + 500 + sg);
        monts.push({ f: `montagnes_${String(1 + ((k * 5 + (sg > 0 ? 3 : 0)) % 12)).padStart(2, '0')}`, p: cote(uu, sg * dd), h: 0.16 + 0.3 * r(k + 900 + sg), at: lerp(T.descente[0] + 0.6, 8.6, uu) - 0.9 });
      });
    }
    const nuages: Decoupe[] = [0.12, 0.3, 0.47, 0.62, 0.8, 0.93].map((u, i) => {
      const q = courbe.getPointAt(u), tg = courbe.getTangentAt(u), s = i % 2 ? 1 : -1;
      return { f: `nuages_${String(1 + i).padStart(2, '0')}`, p: [q.x - tg.y * 0.3 * s, q.y + tg.x * 0.3 * s], h: 0.22 + 0.1 * (i % 3), at: 1.6, nuage: true, z: 0.32 + 0.1 * (i % 3) };
    });
    return { monts, nuages };
  }, [d.sommets]);
  // caméra : vue de dessus → forte descente au ras de la soie (au sud-ouest de Chang'an) → travelling le long du
  // trajet, regard porté en avant → remontée au-dessus de Pékin pour la frappe
  const kd = ease(seg(t, T.descente[0], T.descente[1])), kr = ease(seg(t, T.remonte[0], T.remonte[1]));
  const u = uDe(t), q = courbe.getPointAt(Math.min(1, u)), ahead = courbe.getPointAt(Math.min(1, u + 0.12));
  const alt = 0.2 + 0.03 * Math.sin(t * 1.7);
  const fly = new THREE.Vector3(q.x, q.y, alt), flyLook = new THREE.Vector3(ahead.x, ahead.y, 0.12);
  const top = new THREE.Vector3(0, -0.001, 16.5), topLook = new THREE.Vector3(0, 0, 0);
  const above = new THREE.Vector3(BJ[0] - 0.35, BJ[1] - 2.0, 2.1), aboveLook = new THREE.Vector3(BJ[0], BJ[1], 0);
  const cam = top.clone().lerp(fly, kd).lerp(above, kr);
  const look = topLook.clone().lerp(flyLook, Math.pow(kd, 0.7)).lerp(aboveLook, kr);
  const fd = cam.distanceTo(look);
  mats.carte.uniforms.uFog.value.set(lerp(40, 2.2, kd * (1 - kr)) + fd * 0.2, lerp(60, 7.5, kd * (1 - kr)) + fd * 0.2);
  mats.changan.opacity = 1 - seg(t, T.descente[0] + 0.4, T.descente[1]);
  const az = Math.atan2(cam.y - look.y, cam.x - look.x);
  const dz = 1 - out3(seg(t, T.sceau[0], T.sceau[1])), lv = ease(seg(t, T.leve[0], T.leve[1]));
  const frappe = t >= T.sceau[1], onde = seg(t, T.sceau[1], T.sceau[1] + 1.2), pz = frappe ? 0.02 + 2.5 * lv : 0.02 + 3 * dz * dz;
  return (
    <>
      <color attach="background" args={[SOL]} />
      <fog attach="fog" args={[SOL, lerp(40, 2.2, kd * (1 - kr)) + fd * 0.2, lerp(60, 7.5, kd * (1 - kr)) + fd * 0.2]} />
      <ambientLight intensity={0.9} /><directionalLight position={[-2, -3, 6]} intensity={1.6} /><pointLight position={[BJ[0] - 1, BJ[1] - 1.5, 2.5]} intensity={6} distance={6} color="#fff2dc" />
      <mesh position={[0, 0, -0.05]}><planeGeometry args={[80, 80]} /><meshBasicMaterial map={d.paper} color="#e6dcc6" /></mesh>
      <mesh material={mats.carte}><planeGeometry args={[16, 9, 320, 180]} /></mesh>
      <mesh material={mats.changan} position={[CA[0], CA[1], 0.03]} scale={[0.42, 0.42, 1]}><planeGeometry /></mesh>
      <Decoupes t={t} list={decor.monts} tex={d.tex} az={az} />
      <Decoupes t={t} list={MONUMENTS} tex={d.tex} az={az} />
      <Decoupes t={t} list={decor.nuages} tex={d.tex} az={az} />
      {frappe && <mesh material={mats.jingshi} position={[BJ[0], BJ[1], 0.035]} scale={[0.5 * (1 + 0.12 * (1 - out3(onde))), 0.5 * (1 + 0.12 * (1 - out3(onde))), 1]}><planeGeometry /></mesh>}
      {onde > 0 && onde < 1 && (
        <mesh position={[BJ[0], BJ[1], 0.03]} scale={[0.35 + 0.8 * out3(onde), 0.35 + 0.8 * out3(onde), 1]}>
          <ringGeometry args={[0.9, 1, 64]} /><meshBasicMaterial color={VER} transparent opacity={0.45 * (1 - onde)} depthWrite={false} />
        </mesh>
      )}
      {t > T.sceau[0] && lv < 1 && (
        <group position={[BJ[0], BJ[1], pz + 0.28 * 1.1]} rotation={[Math.PI / 2, 0.5, 0]} scale={1.1}>
          <SceauPierre squash={0.12 * Math.sin(Math.PI * seg(t, T.sceau[1], T.sceau[1] + 0.25))} sway={0.25 * Math.sin(t * 5) * (1 - seg(t, T.sceau[1], T.sceau[1] + 0.8))} />
        </group>
      )}
      <CamRig pos={cam} look={look} />
    </>
  );
};

const FICHIERS = [...Array.from({ length: 12 }, (_, i) => `montagnes_${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 6 }, (_, i) => `nuages_${String(i + 1).padStart(2, '0')}`), 'pagode_oie', 'pagode_fer', 'pont_lugou', 'muraille_badaling'];

export const EssaiTravellingFleur: React.FC = () => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig(), t = f / fps;
  const [h] = useState(() => delayRender('carte, découpes, polices'));
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    const L = new THREE.TextureLoader(), load = (u: string) => L.loadAsync(staticFile(u)).catch(() => null);
    const fonts = [new FontFace('Zhuan', `url(${staticFile('fonts/ChongxiSeal.otf')})`), new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`), new FontFace('ShuimoCaps', `url(${staticFile('fonts/Cinzel.ttf')})`, { weight: '400 900' })];
    const c = carte(CARTE) as any;
    Promise.all([Promise.all(fonts.map((ff) => ff.load().then((x) => document.fonts.add(x)))), load(`cartes/${c.peinte}`), load('shuimo/paper.jpg'), Promise.all(FICHIERS.map((n) => load(`cartes/decoupes/${n}.png`))), fetch(staticFile(`cartes/${c.sommets}`)).then((r) => r.json())]).then(([, map, paper, decs, sommets]) => {
      [map, paper].forEach((x) => { if (x) { x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; } });
      paper!.wrapS = paper!.wrapT = THREE.RepeatWrapping; paper!.repeat.set(8, 8);
      const tex: Record<string, THREE.Texture> = {};
      (decs as (THREE.Texture | null)[]).forEach((x, i) => { if (x) { x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; tex[FICHIERS[i]] = x; } });
      setD({ map: map!, paper: paper!, tex, sommets }); continueRender(h);
    });
  }, [h]);
  const ca = seg(t, T.compteur0 - 0.3, T.compteur0 + 0.3) * (1 - seg(t, T.leve[0] + 0.4, T.leve[1] + 0.4));
  // profondeur de champ : bas de l'image (sol tout proche) flouté pendant le vol au ras de la carte
  const flou = seg(t, T.descente[1] - 0.6, T.descente[1]) * (1 - seg(t, T.remonte[0], T.remonte[1]));
  return (
    <AbsoluteFill style={{ background: SOL }}>
      {d && <ThreeCanvas width={width} height={height} flat gl={{ antialias: true }} camera={{ fov: 40, position: [0, 0, 16], near: 0.01, far: 120 }}><Scene t={t} d={d} /></ThreeCanvas>}
      <AbsoluteFill style={{ backdropFilter: `blur(${6 * flou}px)`, WebkitMaskImage: 'linear-gradient(180deg, transparent 62%, black 92%)', maskImage: 'linear-gradient(180deg, transparent 62%, black 92%)' }} />
      <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.12 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(60,40,20,0.3) 100%)' }} />
      <CompteurAnnees de="han" annees={[1, 1728]} year={annee(t)} a={ca} />
    </AbsoluteFill>
  );
};
