// Plastron de tortue en 3D : vrai contour, épaisseur d'os visible sur la tranche, surface bombée,
// sillons des écailles, creusets (鑽 ronds + 鑿 ovales), craquelures des divinations passées.
// Le rituel : une tige de bronze chauffée au rouge touche un creuset, étincelles et fumée, la
// fissure 卜 court sur l'os en rougeoyant puis refroidit ; le signe 學 est ensuite incisé et rempli
// de cinabre, comme sur les os des Shang.
import React, { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { interpolate, Easing } from 'remotion';
import { W } from '../legacy';

const S = 1024;
const K = 150; // pixels de texture par unité 3D (1 unité = 100 unités du dessin d'origine)
const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const seg = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
const smooth = (x: number) => x * x * (3 - 2 * x);
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// demi-contour du plastron (unités du dessin, y vers le bas), symétrisé puis lissé
const HALF = [[0, -300], [110, -292], [190, -250], [226, -160], [244, -70], [292, -6], [258, 62], [242, 160], [204, 250], [124, 298], [44, 312], [0, 292]];
const outline = (() => {
  const pts = [...HALF.slice(0, -1), ...[...HALF].reverse().slice(0, -1).map(([x, y]) => [-x, y])];
  const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
  return c.getPoints(260).map((p) => [p.x, p.y]);
})();
const px = (u: number) => S / 2 + 1.5 * u; // unités du dessin → pixels de texture
const height = (X: number, Y: number) => 0.3 * Math.max(0, 1 - (X / 3.05) ** 2 - (Y / 3.25) ** 2) ** 0.75;
const THICK = 0.2;

// creusets : paires 鑽 (rond) + 鑿 (ovale), de part et d'autre de l'axe
const PITS: [number, number][] = [];
for (const [y, x] of [[-215, 120], [-150, 165], [-80, 185], [-10, 200], [60, 190], [130, 175], [200, 140], [255, 90]]) { PITS.push([x, y], [-x, y]); }
const ACTIVE = 3; // creuset (185, -80) chauffé à l'écran
const OLD_CRACKS = [0, 1, 5, 6, 9, 10, 13];
const GLYPH = { x: -15, y: 45, size: 175 }; // emplacement du signe, près de l'axe

// fissure en « 卜 » : trait le long du creuset puis branche vers l'axe
const crackPath = (i: number) => {
  const [x, y] = PITS[i];
  const side = x > 0 ? -1 : 1;
  const r = rng(101 + i * 7);
  const main: [number, number][] = [], branch: [number, number][] = [];
  for (let k = 0; k <= 8; k++) main.push([x + 14 + (r() - 0.5) * 6, y - 34 + k * 9.5]);
  for (let k = 0; k <= 9; k++) branch.push([x + 14 + side * k * 7.5, y - 6 - k * 2.2 + (r() - 0.5) * 7]);
  return { main, branch };
};
const strokePart = (g: CanvasRenderingContext2D, pts: [number, number][], u: number) => {
  if (u <= 0) return;
  const n = (pts.length - 1) * u;
  g.beginPath(); g.moveTo(px(pts[0][0]), px(pts[0][1]));
  for (let k = 1; k <= Math.ceil(n); k++) {
    const f = Math.min(1, n - (k - 1));
    const [a, b] = [pts[k - 1], pts[k]];
    g.lineTo(px(a[0] + (b[0] - a[0]) * f), px(a[1] + (b[1] - a[1]) * f));
  }
  g.stroke();
};
const drawCrack = (g: CanvasRenderingContext2D, i: number, u: number) => {
  const c = crackPath(i);
  strokePart(g, c.main, Math.min(1, u * 1.6));
  strokePart(g, c.branch, Math.max(0, u * 1.6 - 0.6));
};

const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
const outlinePath = () => {
  const p = new Path2D();
  outline.forEach(([x, y], i) => (i ? p.lineTo(px(x), px(y)) : p.moveTo(px(x), px(y))));
  p.closePath();
  return p;
};

// fond fixe : couleur et relief de l'os, sillons, creusets, anciennes fissures
const paintBase = () => {
  const col = canvas(), bump = canvas();
  const g = col.getContext('2d')!, b = bump.getContext('2d')!;
  const shape = outlinePath();
  const r = rng(11);
  g.save(); g.clip(shape);
  const base = g.createRadialGradient(px(-40), px(-60), 40, px(0), px(0), 520);
  base.addColorStop(0, '#f1e4c4'); base.addColorStop(0.55, '#dcc596'); base.addColorStop(0.85, '#bb9a63'); base.addColorStop(1, '#8f6d3e');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) { // taches et patine
    const x = r() * S, y = r() * S, rad = 20 + r() * 90;
    const t = g.createRadialGradient(x, y, 0, x, y, rad);
    t.addColorStop(0, `rgba(${r() < 0.5 ? '120,86,44' : '250,238,210'},${0.05 + r() * 0.1})`); t.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = t; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
  }
  g.globalAlpha = 0.16; g.strokeStyle = '#6f5332'; g.lineWidth = 1.2;
  for (let i = 0; i < 900; i++) { // fibres de l'os
    const x = r() * S, y = r() * S, l = 6 + r() * 26, a = (r() - 0.5) * 0.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.globalAlpha = 1;
  g.restore();
  // relief : gris moyen, creux plus sombres
  b.fillStyle = '#000'; b.fillRect(0, 0, S, S);
  b.save(); b.clip(shape); b.fillStyle = '#8a8a8a'; b.fillRect(0, 0, S, S);
  for (let i = 0; i < 3000; i++) { b.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},0.06)`; b.fillRect(r() * S, r() * S, 2 + r() * 4, 1 + r() * 2); }
  b.restore();
  // sillons des écailles : axe médian ondulé + sillons transversaux
  const sulci = (ctx: CanvasRenderingContext2D, color: string, w: number) => {
    ctx.save(); ctx.clip(shape); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px(0), px(-310));
    for (let y = -300; y <= 320; y += 20) ctx.lineTo(px(Math.sin(y * 0.05) * 3), px(y));
    ctx.stroke();
    for (const [y, bend] of [[-205, -14], [-95, 18], [25, 22], [150, 16], [245, -10]]) {
      ctx.beginPath(); ctx.moveTo(px(-320), px(y + bend)); ctx.quadraticCurveTo(px(0), px(y - bend), px(320), px(y + bend)); ctx.stroke();
    }
    ctx.restore();
  };
  sulci(g, 'rgba(98,70,38,0.75)', 3.2);
  sulci(b, '#3a3a3a', 5);
  // creusets
  PITS.forEach(([x, y], i) => {
    const s = x > 0 ? 1 : -1;
    // 鑿 : creux ovale, 鑽 : trou rond accolé côté axe
    g.fillStyle = 'rgba(88,56,26,0.9)';
    g.beginPath(); g.ellipse(px(x), px(y), 1.5 * 10, 1.5 * 22, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(62,38,16,0.95)';
    g.beginPath(); g.arc(px(x - s * 16), px(y + 2), 1.5 * 8, 0, 7); g.fill();
    g.strokeStyle = 'rgba(245,230,196,0.5)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(px(x) + 1.5, px(y) + 2, 1.5 * 10, 1.5 * 22, 0, 0.4, 2.6); g.stroke();
    b.fillStyle = '#1e1e1e';
    b.beginPath(); b.ellipse(px(x), px(y), 1.5 * 10, 1.5 * 22, 0, 0, 7); b.fill();
    b.beginPath(); b.arc(px(x - s * 16), px(y + 2), 1.5 * 8, 0, 7); b.fill();
    if (OLD_CRACKS.includes(i)) { // divinations passées : brûlures et fissures
      const sc = g.createRadialGradient(px(x), px(y), 0, px(x), px(y), 44);
      sc.addColorStop(0, 'rgba(40,22,8,0.55)'); sc.addColorStop(1, 'rgba(40,22,8,0)');
      g.fillStyle = sc; g.beginPath(); g.arc(px(x), px(y), 44, 0, 7); g.fill();
      g.strokeStyle = 'rgba(45,25,8,0.95)'; g.lineWidth = 2.6; drawCrack(g, i, 1);
      b.strokeStyle = '#101010'; b.lineWidth = 3.5; drawCrack(b, i, 1);
    }
  });
  return { col, bump };
};

export const Plastron3D: React.FC<{ t: number; vt: number }> = ({ t, vt }) => {
  const { camera } = useThree();
  const res = useMemo(() => {
    const base = paintBase();
    const col = canvas(), bump = canvas(), emit = canvas();
    const mk = (c: HTMLCanvasElement, srgb: boolean) => {
      const tx = new THREE.CanvasTexture(c);
      if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
      tx.anisotropy = 8;
      return tx;
    };
    const tCol = mk(col, true), tBump = mk(bump, false), tEmit = mk(emit, true);
    // dessus bombé : plan finement subdivisé, découpé par l'alpha de la texture
    const span = S / K;
    const top = new THREE.PlaneGeometry(span, span, 200, 200);
    const pos = top.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, height(pos.getX(i), pos.getY(i)));
    top.computeVertexNormals();
    const bottom = top.clone();
    bottom.translate(0, 0, -THICK);
    // tranche : ruban entre le dessus et le dessous, le long du contour
    const wall = new THREE.BufferGeometry();
    const v: number[] = [], idx: number[] = [];
    outline.forEach(([x, y]) => {
      const X = x / 100, Y = -y / 100, h = height(X, Y);
      v.push(X, Y, h, X, Y, h - THICK);
    });
    for (let i = 0; i < outline.length; i++) {
      const j = (i + 1) % outline.length;
      idx.push(2 * i, 2 * j, 2 * i + 1, 2 * j, 2 * j + 1, 2 * i + 1);
    }
    wall.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    wall.setIndex(idx);
    wall.computeVertexNormals();
    // étincelles et fumée
    const NS = 90;
    const sparks = new THREE.BufferGeometry();
    sparks.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NS * 3), 3));
    sparks.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(NS * 3), 3));
    const dot = document.createElement('canvas'); dot.width = dot.height = 64;
    const dg = dot.getContext('2d')!;
    const rg = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(255,255,255,0.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    dg.fillStyle = rg; dg.fillRect(0, 0, 64, 64);
    const tDot = new THREE.CanvasTexture(dot);
    const puff = document.createElement('canvas'); puff.width = puff.height = 128;
    const pg = puff.getContext('2d')!;
    const pr = rng(5);
    for (let i = 0; i < 14; i++) {
      const x = 40 + pr() * 48, y = 40 + pr() * 48, rad = 18 + pr() * 26;
      const gg = pg.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, 'rgba(200,190,175,0.22)'); gg.addColorStop(1, 'rgba(200,190,175,0)');
      pg.fillStyle = gg; pg.fillRect(0, 0, 128, 128);
    }
    const tPuff = new THREE.CanvasTexture(puff);
    return { base, col, bump, emit, tCol, tBump, tEmit, top, bottom, wall, sparks, NS, tDot, tPuff };
  }, []);

  // ── chronologie (temps d'ancre de la scène 2)
  const rodIn = smooth(seg(vt, 5.0, 5.6)), rodOut = smooth(seg(vt, 7.3, 7.9));
  const touch = seg(vt, 5.55, 5.7) * (1 - seg(vt, 7.25, 7.4));
  const heat = seg(vt, 5.5, 6.1) * (1 - seg(vt, 7.6, 8.8)); // l'os rougit puis refroidit
  const crack = smooth(seg(vt, 6.0, 7.3));
  const carve = seg(vt, 8.2, 9.5); // incision du signe, puis cinabre
  const cinnabar = seg(vt, 9.0, 9.5);

  const [ax, ay] = PITS[ACTIVE];
  const AX = ax / 100, AY = -ay / 100, AZ = height(AX, AY);

  useLayoutEffect(() => {
    const { base, col, bump, emit, tCol, tBump, tEmit } = res;
    const g = col.getContext('2d')!, b = bump.getContext('2d')!, e = emit.getContext('2d')!;
    g.clearRect(0, 0, S, S); g.drawImage(base.col, 0, 0);
    b.clearRect(0, 0, S, S); b.drawImage(base.bump, 0, 0);
    e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
    const cx = px(ax), cy = px(ay);
    // brûlure autour du creuset chauffé
    const sc = g.createRadialGradient(cx, cy, 0, cx, cy, 60);
    sc.addColorStop(0, `rgba(35,18,6,${0.7 * seg(vt, 5.6, 7.0)})`); sc.addColorStop(1, 'rgba(35,18,6,0)');
    g.fillStyle = sc; g.beginPath(); g.arc(cx, cy, 60, 0, 7); g.fill();
    if (crack > 0) {
      g.strokeStyle = 'rgba(40,20,6,0.95)'; g.lineWidth = 3; drawCrack(g, ACTIVE, crack);
      b.strokeStyle = '#0c0c0c'; b.lineWidth = 4; drawCrack(b, ACTIVE, crack);
      // lueur de la fissure : blanche au cœur, orange autour, s'éteint en refroidissant
      e.save(); e.lineCap = 'round';
      e.shadowColor = `rgba(255,110,20,${heat})`; e.shadowBlur = 24;
      e.strokeStyle = `rgba(255,130,40,${heat})`; e.lineWidth = 7; drawCrack(e, ACTIVE, crack);
      e.shadowBlur = 0; e.strokeStyle = `rgba(255,235,190,${heat})`; e.lineWidth = 2.5; drawCrack(e, ACTIVE, crack);
      e.restore();
    }
    const hg = e.createRadialGradient(cx, cy, 0, cx, cy, 70);
    hg.addColorStop(0, `rgba(255,120,30,${0.9 * heat})`); hg.addColorStop(1, 'rgba(255,60,0,0)');
    e.fillStyle = hg; e.beginPath(); e.arc(cx, cy, 70, 0, 7); e.fill();
    // le signe : incisé (creux sombre) puis rempli de cinabre
    if (carve > 0) {
      const E = W().E;
      const order: Record<string, number> = { yao: 0, roof: 1, hand: 2 };
      const o = { x: px(GLYPH.x), y: px(GLYPH.y), size: GLYPH.size * 1.5, reveal: (c: string) => smooth(seg(carve * 3 - (order[c] ?? 2), 0, 1)) };
      E.drawRealGlyph(g, 'jiaguwen', { ...o, x: o.x + 2, y: o.y + 2, color: () => 'rgba(250,236,205,0.6)' });
      E.drawRealGlyph(g, 'jiaguwen', { ...o, color: () => E.mix('#3b2410', '#b8321f', cinnabar) });
      E.drawRealGlyph(b, 'jiaguwen', { ...o, color: () => '#161616' });
    }
    tCol.needsUpdate = tBump.needsUpdate = tEmit.needsUpdate = true;
  }, [t, vt, res, crack, heat, carve, cinnabar, ax, ay]);

  // étincelles : jaillissent du creuset tant que la tige le touche
  {
    const p = res.sparks.attributes.position as THREE.BufferAttribute;
    const c = res.sparks.attributes.color as THREE.BufferAttribute;
    const r = rng(33);
    for (let i = 0; i < res.NS; i++) {
      const born = 5.6 + r() * 1.7, life = 0.5 + r() * 0.6;
      const a = (vt - born) / life;
      const vx = (r() - 0.5) * 2.4, vy = (r() - 0.3) * 2.2, vz = 1.2 + r() * 2.4;
      if (a < 0 || a > 1) { p.setXYZ(i, 0, 0, -50); c.setXYZ(i, 0, 0, 0); continue; }
      const s = a * life;
      p.setXYZ(i, AX + vx * s, AY + vy * s, AZ + vz * s - 2.6 * s * s);
      const k = 1 - a;
      c.setXYZ(i, k * 1.0, k * (0.55 + 0.4 * k), k * 0.2 * k);
    }
    p.needsUpdate = c.needsUpdate = true;
  }
  const smoke = Array.from({ length: 9 }, (_, i) => {
    const r = rng(71 + i * 13); r();
    const born = 5.7 + i * 0.28, life = 2.4;
    const a = (vt - born) / life;
    if (a < 0 || a > 1) return null;
    return { x: AX + (r() - 0.5) * 0.3 + a * 0.5, y: AY + a * 0.9, z: AZ + 0.2 + a * 2.2, s: 0.5 + a * 1.8, o: Math.sin(a * Math.PI) * 0.55 };
  }).filter(Boolean) as { x: number; y: number; z: number; s: number; o: number }[];

  // ── tige de bronze chauffée : arrive du haut à droite, touche le creuset, repart
  const rodDir = new THREE.Vector3(0.55, 0.35, 0.76).normalize();
  const off = (1 - rodIn) * 3.2 + rodOut * 3.2;
  const tip = new THREE.Vector3(AX, AY, AZ + 0.03).addScaledVector(rodDir, off);
  const rodLen = 4.2;
  const rodCenter = tip.clone().addScaledVector(rodDir, rodLen / 2);
  const rodQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), rodDir);
  const glowRod = 0.35 + 0.65 * (1 - seg(vt, 5.8, 7.6) * 0.5);

  // ── caméra : vue rasante qui montre l'épaisseur, rapprochement sur le creuset, puis sur le signe
  const e = Easing.inOut(Easing.cubic);
  const u1 = interpolate(vt, [5.2, 5.9], [0, 1], { ...cl, easing: e });
  const u2 = interpolate(vt, [7.6, 8.4], [0, 1], { ...cl, easing: e });
  const u3 = interpolate(vt, [8.4, 9.8], [0, 1], { ...cl, easing: e });
  const drift = (vt - 4.75) * 0.05;
  const P0 = new THREE.Vector3(-3.0 + drift * 5, -10.8, 6.6), L0 = new THREE.Vector3(0, 0, 0);
  const P1 = new THREE.Vector3(AX + 1.9, AY - 3.2, AZ + 3.4), L1 = new THREE.Vector3(AX - 0.2, AY, AZ);
  const GX = GLYPH.x / 100, GY = -GLYPH.y / 100, GZ = height(GX, GY);
  const P2 = new THREE.Vector3(GX + 0.8, GY - 3.0, GZ + 4.2), L2 = new THREE.Vector3(GX, GY, GZ);
  const P3 = new THREE.Vector3(GX, GY - 0.25, GZ + 3.1), L3 = new THREE.Vector3(GX, GY - 0.05, GZ);
  const P = P0.clone().lerp(P1, u1).lerp(P2, u2).lerp(P3, u3);
  const L = L0.clone().lerp(L1, u1).lerp(L2, u2).lerp(L3, u3);
  camera.position.copy(P);
  camera.up.set(0, 0, 1).lerp(new THREE.Vector3(0, 1, 0), u3).normalize();
  camera.lookAt(L);

  const flicker = 0.75 + 0.25 * Math.sin(t * 21) * Math.sin(t * 13 + 1) + 0.1 * Math.sin(t * 47);

  return (
    <>
      <fog attach="fog" args={['#0c0704', 9, 20]} />
      <ambientLight intensity={0.28} />
      <hemisphereLight args={['#ffe3b8', '#2a160a', 0.35]} />
      {/* brasero hors champ : lumière chaude et vacillante, rasante */}
      <pointLight position={[-4.5, -3.5, 1.6]} intensity={26 * flicker} distance={16} decay={1.6} color="#ff9a45" />
      <directionalLight position={[3, 5, 7]} intensity={1.3} color="#ffe6c4" />
      <directionalLight position={[2, 6, -3]} intensity={0.6} color="#8fa6ff" />
      <pointLight position={[AX, AY, AZ + 0.5]} intensity={9 * heat * flicker} distance={4} decay={1.5} color="#ff7a1c" />
      <group>
        <mesh geometry={res.top}>
          <meshStandardMaterial map={res.tCol} bumpMap={res.tBump} bumpScale={2.2} emissiveMap={res.tEmit} emissive="#ffffff" emissiveIntensity={1.6}
            roughness={0.62} metalness={0} transparent alphaTest={0.5} side={THREE.FrontSide} />
        </mesh>
        <mesh geometry={res.bottom}>
          <meshStandardMaterial map={res.tCol} color="#8a6e48" roughness={0.9} transparent alphaTest={0.5} side={THREE.BackSide} />
        </mesh>
        <mesh geometry={res.wall}>
          <meshStandardMaterial color="#c9ad7c" roughness={0.75} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* tige de bronze */}
      <group position={rodCenter} quaternion={rodQ} visible={rodIn > 0 && rodOut < 1}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.065, rodLen, 20]} />
          <meshStandardMaterial color="#7a5a30" metalness={0.85} roughness={0.35} />
        </mesh>
        <mesh position={[0, -rodLen / 2 + 0.35, 0]}>
          <cylinderGeometry args={[0.052, 0.035, 0.7, 20]} />
          <meshStandardMaterial color="#ff5a14" emissive="#ff4a0a" emissiveIntensity={2.5 * glowRod} />
        </mesh>
      </group>
      <sprite position={tip} scale={[0.9 * glowRod, 0.9 * glowRod, 1]} visible={rodIn > 0 && rodOut < 1}>
        <spriteMaterial map={res.tDot} color="#ff8a30" transparent opacity={0.8 * glowRod} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite position={[AX, AY, AZ + 0.1]} scale={[1.6 * touch, 1.6 * touch, 1]}>
        <spriteMaterial map={res.tDot} color="#ffb060" transparent opacity={0.7 * touch * flicker} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <points geometry={res.sparks}>
        <pointsMaterial size={0.13} map={res.tDot} vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      {smoke.map((s, i) => (
        <sprite key={i} position={[s.x, s.y, s.z]} scale={[s.s, s.s, 1]}>
          <spriteMaterial map={res.tPuff} transparent opacity={s.o} depthWrite={false} />
        </sprite>
      ))}
    </>
  );
};
