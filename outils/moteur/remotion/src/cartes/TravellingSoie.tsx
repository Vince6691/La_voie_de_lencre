// Essai : transition Han → Qing sur la carte peinte traitée comme une soie (skill carte-peinte). Vue de dessus sur la
// carte de Yang Xiong (cachet 長安), légère bascule, glissement vers Pékin pendant que le compteur doré du rouleau
// défile de l'an 1 à 1728 ; à l'arrivée, un sceau de pierre descend et frappe 京師 ; onde d'encre.
// Soie : trame de fils liée à la carte (visible quand on s'approche), reflet qui glisse avec la caméra, ondulations
// douces de l'étoffe (shader). Zoom limité à ~×2,5 ; carte de détail pekin_detail en fondu à l'arrivée si présente.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { carte } from './CartePeinte';
import { CompteurAnnees, SceauPierre } from '../rouleau3d/Rouleau3D';
import { CamRig, ease, lerp, out3, seg } from './Pekin3D';

export const SOIE_SECONDS = 10;
const T = { bascule: 1.0, depart: 1.6, arrivee: 7.0, sceau: [7.3, 7.85], leve: [8.2, 8.9], compteur: [1.4, 7.4] };
const CARTE = 'chine_centre_nord', DETAIL = 'pekin_detail';
const VUE = carte(CARTE).vue;
// lieu → unités de scène (1 unité = 120 px de la carte 1920 × 1080 au cadrage de CARTE)
const P = (lon: number, lat: number): [number, number] => [((lon - VUE.lon) * VUE.k) / 120, ((lat - VUE.lat) * VUE.k * 1.18) / 120];
const CA = P(108.9, 34.3), BJ = P(116.4, 39.9);
const VER = '#c0392b';

// ─── trame de soie : fils de chaîne et de trame croisés, épaisseurs irrégulières ; R = relief, G = brillance
export const trame = () => {
  const N = 512, F = 48, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d')!, img = c.createImageData(N, N);
  let s = 12345; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const ep = Array.from({ length: F }, () => 0.75 + 0.5 * r()), ep2 = Array.from({ length: F }, () => 0.75 + 0.5 * r());
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = (x / N) * F, fy = (y / N) * F, ix = Math.floor(fx), iy = Math.floor(fy);
    const chaine = Math.pow(Math.sin(Math.PI * (fx - ix)), 0.6 * ep[ix]), tr = Math.pow(Math.sin(Math.PI * (fy - iy)), 0.6 * ep2[iy]);
    const dessus = (ix + iy) % 2 === 0, v = dessus ? chaine : tr, n = 0.9 + 0.2 * r();
    const o = (y * N + x) * 4;
    img.data[o] = Math.round(255 * v * n); img.data[o + 1] = Math.round(255 * (dessus ? 0.85 : 0.45) * v); img.data[o + 2] = 0; img.data[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
};

export const VERT = /* glsl */ `
  uniform float uOnde;
  varying vec2 vUv; varying vec3 vPos; varying vec3 vN;
  float h(vec2 p) { return uOnde * (sin(p.x * 0.55 + 1.3) * sin(p.y * 0.8 + 0.4) + 0.45 * sin(p.x * 1.7 + p.y * 1.1)); }
  void main() {
    vUv = uv;
    vec3 p = position; p.z += h(p.xy);
    float e = 0.01; vec3 n = normalize(vec3(-(h(p.xy + vec2(e, 0.)) - h(p.xy - vec2(e, 0.))) / (2. * e), -(h(p.xy + vec2(0., e)) - h(p.xy - vec2(0., e))) / (2. * e), 1.));
    vec4 w = modelMatrix * vec4(p, 1.); vPos = w.xyz; vN = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
export const FRAG = /* glsl */ `
  uniform sampler2D uMap; uniform sampler2D uTrame; uniform vec2 uRep; uniform float uA; uniform vec3 uL; uniform vec3 uFogC; uniform vec2 uFog;
  varying vec2 vUv; varying vec3 vPos; varying vec3 vN;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    vec4 tr = texture2D(uTrame, vUv * uRep);
    vec3 V = normalize(cameraPosition - vPos), L = normalize(uL), H = normalize(L + V);
    vec3 col = c.rgb * (0.9 + 0.16 * (tr.r - 0.5));          // relief des fils
    col *= 0.9 + 0.12 * max(dot(vN, L), 0.);                   // ondulations éclairées
    float spec = pow(max(dot(vN, H), 0.), 18.) * (0.25 + 0.9 * tr.g); // reflet de soie, plus vif sur les fils de chaîne
    col += spec * 0.16 * vec3(1., 0.96, 0.86);
    col = mix(col, uFogC, smoothstep(uFog.x, uFog.y, length(cameraPosition - vPos)));
    gl_FragColor = vec4(col, c.a * uA);
    #include <colorspace_fragment>
  }`;
export const soie = (map: THREE.Texture, tr: THREE.Texture, rep: [number, number], a = 1) => new THREE.ShaderMaterial({
  uniforms: { uMap: { value: map }, uTrame: { value: tr }, uRep: { value: new THREE.Vector2(...rep) }, uA: { value: a }, uL: { value: new THREE.Vector3(-0.4, 0.6, 0.7) }, uOnde: { value: 0.035 }, uFogC: { value: new THREE.Color('#e9dfc9').convertSRGBToLinear() }, uFog: { value: new THREE.Vector2(500, 600) } },
  vertexShader: VERT, fragmentShader: FRAG, transparent: a < 1,
});

// empreinte de sceau (texture) : carré vermillon, double filet, caractères en petit sceau en colonne
export const empreinte = (txt: string) => {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d')!;
  c.fillStyle = VER; c.fillRect(24, 24, S - 48, S - 48);
  c.strokeStyle = '#f6eee0'; c.lineWidth = 10; c.strokeRect(58, 58, S - 116, S - 116);
  c.fillStyle = '#f6eee0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${S * 0.36}px Zhuan`;
  [...txt].forEach((ch, i) => c.fillText(ch, S / 2, S * (0.32 + 0.38 * i)));
  // usure : petits manques
  c.globalCompositeOperation = 'destination-out';
  let s = 99; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < 70; i++) { c.beginPath(); c.arc(30 + r() * (S - 60), 30 + r() * (S - 60), 2 + r() * 7, 0, 7); c.fillStyle = `rgba(0,0,0,${0.3 + 0.6 * r()})`; c.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

type Data = { map: THREE.Texture; detail: THREE.Texture | null; paper: THREE.Texture };

const Scene: React.FC<{ t: number; d: Data }> = ({ t, d }) => {
  const tr = useMemo(() => trame(), []);
  const mats = useMemo(() => ({
    carte: soie(d.map, tr, [40, 22.5]),
    detail: d.detail ? soie(d.detail, tr, [40 / 3, 22.5 / 3], 0) : null,
    changan: new THREE.MeshBasicMaterial({ map: empreinte('長安'), transparent: true, depthWrite: false }),
    jingshi: new THREE.MeshBasicMaterial({ map: empreinte('京師'), transparent: true, depthWrite: false }),
      }), [d, tr]);
  // caméra : vue de dessus (toute la carte) → légère bascule → glissement Chang'an → Pékin, ralenti à l'arrivée
  const kb = ease(seg(t, T.bascule, T.depart + 1.2)), kt = ease(seg(t, T.depart, T.arrivee));
  const look = new THREE.Vector3(lerp(lerp(0, CA[0], kb), BJ[0], kt), lerp(lerp(0, CA[1], kb), BJ[1], kt), 0);
  const dist = lerp(16.5, 7.2, kb) - 0.4 * ease(seg(t, T.arrivee, SOIE_SECONDS)), elev = lerp(Math.PI / 2 - 0.001, 0.95, kb);
  const az = -Math.PI / 2 + 0.18 * kb - 0.08 * kt;
  const cam = new THREE.Vector3(look.x + dist * Math.cos(elev) * Math.cos(az), look.y + dist * Math.cos(elev) * Math.sin(az), dist * Math.sin(elev));
  // carte de détail : fondu à l'approche
  if (mats.detail) { mats.detail.uniforms.uA.value = ease(seg(t, T.arrivee - 1.6, T.arrivee - 0.2)); }
  mats.changan.opacity = 1 - seg(t, T.depart, T.depart + 1.4);
  // sceau de pierre : descend, frappe, remonte et s'efface ; empreinte qui reste
  const dz = 1 - out3(seg(t, T.sceau[0], T.sceau[1])), lv = ease(seg(t, T.leve[0], T.leve[1]));
  const frappe = t >= T.sceau[1], onde = seg(t, T.sceau[1], T.sceau[1] + 1.2);
  const pz = frappe ? 0.02 + 2.5 * lv : 0.02 + 3 * dz * dz;
  const DW = (1920 / DETAIL_K) * VUE.k / 120;
  return (
    <>
      <color attach="background" args={['#e9dfc9']} />
      <ambientLight intensity={0.9} /><directionalLight position={[-2, -3, 6]} intensity={1.6} /><pointLight position={[BJ[0] - 1, BJ[1] - 1.5, 2.5]} intensity={6} distance={6} color="#fff2dc" />
      <mesh position={[0, 0, -0.05]}><planeGeometry args={[80, 80]} /><meshBasicMaterial map={d.paper} color="#e6dcc6" /></mesh>
      <mesh material={mats.carte}><planeGeometry args={[16, 9, 160, 90]} /></mesh>
      {mats.detail && <mesh material={mats.detail} position={[DC[0], DC[1], 0.004]}><planeGeometry args={[DW, DW * 9 / 16, 60, 34]} /></mesh>}
      {/* empreinte 長安 au départ, qui pâlit quand on quitte Chang'an */}
      <mesh material={mats.changan} position={[CA[0], CA[1], 0.03]} scale={[0.42, 0.42, 1]}><planeGeometry /></mesh>
      {/* empreinte 京師 : apparaît à la frappe, gonfle à peine */}
      {frappe && <mesh material={mats.jingshi} position={[BJ[0], BJ[1], 0.035]} scale={[0.5 * (1 + 0.12 * (1 - out3(onde))), 0.5 * (1 + 0.12 * (1 - out3(onde))), 1]}><planeGeometry /></mesh>}
      {onde > 0 && onde < 1 && (
        <mesh position={[BJ[0], BJ[1], 0.03]} scale={[0.35 + 0.8 * out3(onde), 0.35 + 0.8 * out3(onde), 1]}>
          <ringGeometry args={[0.9, 1, 64]} /><meshBasicMaterial color={VER} transparent opacity={0.45 * (1 - onde)} depthWrite={false} />
        </mesh>
      )}
      {/* sceau de pierre (celui du rouleau 3D) : axe y du sceau → z de la carte ; léger écrasement à l'impact */}
      {t > T.sceau[0] && lv < 1 && (
        <group position={[BJ[0], BJ[1], pz + 0.28 * 1.1]} rotation={[Math.PI / 2, 0.5, 0]} scale={1.1}>
          <SceauPierre squash={0.12 * Math.sin(Math.PI * seg(t, T.sceau[1], T.sceau[1] + 0.25))} sway={0.25 * Math.sin(t * 5) * (1 - seg(t, T.sceau[1], T.sceau[1] + 0.8))} />
        </group>
      )}
      <CamRig pos={cam} look={look} />
    </>
  );
};
const DETAIL_K = carte(DETAIL).vue.k;
const DC = P(carte(DETAIL).vue.lon, carte(DETAIL).vue.lat);

export const EssaiTravellingSoie: React.FC = () => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig(), t = f / fps;
  const [h] = useState(() => delayRender('carte, polices'));
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    const L = new THREE.TextureLoader(), load = (u: string) => L.loadAsync(staticFile(u)).catch(() => null);
    const fonts = [
      new FontFace('Zhuan', `url(${staticFile('fonts/ChongxiSeal.otf')})`), new FontFace('ShuimoKai', `url(${staticFile('fonts/LXGWWenKaiTC-Bold.ttf')})`),
      new FontFace('ShuimoCaps', `url(${staticFile('fonts/Cinzel.ttf')})`, { weight: '400 900' }),
    ];
    Promise.all([...fonts.map((ff) => ff.load().then((x) => document.fonts.add(x))), load(`cartes/${carte(CARTE).peinte}`), load(`cartes/${carte(DETAIL).peinte}`), load('shuimo/paper.jpg')]).then((res) => {
      const [map, detail, paper] = res.slice(fonts.length) as (THREE.Texture | null)[];
      [map, detail, paper].forEach((x) => { if (x) { x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; } });
      paper!.wrapS = paper!.wrapT = THREE.RepeatWrapping; paper!.repeat.set(8, 8);
      setD({ map: map!, detail, paper: paper! }); continueRender(h);
    });
  }, [h]);
  // compteur : de l'an 1 à 1728, ralenti à l'arrivée
  const ky = seg(t, T.compteur[0], T.compteur[1]), year = Math.round(1 + 1727 * (1 - Math.pow(1 - ky, 2.2)));
  const ca = seg(t, T.compteur[0] - 0.3, T.compteur[0] + 0.3) * (1 - seg(t, T.leve[0] + 0.4, T.leve[1] + 0.4));
  return (
    <AbsoluteFill style={{ background: '#e9dfc9' }}>
      {d && <ThreeCanvas width={width} height={height} flat gl={{ antialias: true }} camera={{ fov: 32, position: [0, 0, 16], near: 0.02, far: 120 }}><Scene t={t} d={d} /></ThreeCanvas>}
      <Img src={staticFile('shuimo/paper.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.12 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(60,40,20,0.3) 100%)' }} />
      <CompteurAnnees de="han" annees={[1, 1728]} year={year} a={ca} />
    </AbsoluteFill>
  );
};
