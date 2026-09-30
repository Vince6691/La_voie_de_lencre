// Scènes de la vidéo « 学 : 3000 ans d'histoire ».
// Le temps global t (s) est piloté par le rendu image par image. Les ancres temporelles de chaque
// scène sont exprimées en secondes depuis le début du clip de voix off correspondant (vt).
(function () {
  const { W, H, clamp, lerp, seg, smooth, easeOut, easeIn, easeInOut, backOut, pulse, COMP } = E;
  const TL = window.TIMELINE; // {voice:[{start,dur}], total}
  const FLAGS = window.FLAGS || {}; // {three: objets 3D rendus ailleurs, captions: sous-titres incrustés}
  const V = (k) => TL.voice[k - 1].start;
  // Les ancres de chaque scène sont écrites sur la première prise de voix ; WARP les recale
  // sur la prise actuelle (interpolation linéaire par morceaux entre débuts de phrases).
  const pw = (pairs, x, a, b) => {
    for (let i = 0; i < pairs.length - 1; i++) {
      const [p0, p1] = [pairs[i], pairs[i + 1]];
      if (x <= p1[a] || i === pairs.length - 2) return p0[b] + (x - p0[a]) * (p1[b] - p0[b]) / (p1[a] - p0[a] || 1);
    }
    return x;
  };
  const T = (k, old) => V(k) + pw(window.WARP[k], old, 0, 1); // ancre → temps global
  const VT = (k, t) => pw(window.WARP[k], t - V(k), 1, 0);   // temps global → temps d'ancre
  const D = (k) => TL.voice[k - 1].dur;
  const P = {};
  for (const k in GLYPHS) P[k] = E.prepare(GLYPHS[k]);

  const FUSION = '#f58a3b'; // ⺍ = abréviation cursive de 𦥑 + 爻
  const BONE_INK = '#4a3320';
  const compCol = (c) => COMP[c].col;
  const fusionCol = (c) => (c === 'hand' || c === 'yao' ? FUSION : COMP[c].col);
  const strokeCol = (c) => (c === 'fusion' ? FUSION : COMP[c].col);

  // ─────────────────────────── outils de scène
  function camera(ctx, s, x = W / 2, y = H / 2, rot = 0) {
    ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(rot); ctx.translate(-x, -y);
  }
  function shake(ctx, t, hits, amp = 14) {
    let dx = 0, dy = 0;
    for (const h of hits) {
      const u = t - h; if (u < 0 || u > 0.45) continue;
      const k = Math.exp(-u * 9) * amp;
      dx += Math.sin(u * 91) * k; dy += Math.cos(u * 77) * k;
    }
    ctx.translate(dx, dy);
  }
  function flash(ctx, t, times, col = '255,245,225', dur = 0.25, max = 0.85) {
    let a = 0; for (const f of times) { const u = t - f; if (u >= 0 && u < dur) a = Math.max(a, (1 - u / dur) * max); }
    if (a > 0) { ctx.fillStyle = `rgba(${col},${a})`; ctx.fillRect(0, 0, W, H); }
  }
  function dateSlam(ctx, t, t0, big, small, o = {}) {
    const u = seg(t, t0, t0 + 0.35);
    if (u <= 0) return;
    const out = o.out ? 1 - seg(t, o.out, o.out + 0.4) : 1;
    if (out <= 0) return;
    const s = lerp(2.4, 1, easeOut(u));
    ctx.save();
    ctx.globalAlpha = u * out;
    ctx.translate(o.x ?? W / 2, o.y ?? H / 2); ctx.scale(s, s);
    // o.ink : encre sombre sur le parchemin des cartes
    E.text(ctx, big, 0, 0, { font: 'Cinzel', weight: 900, size: o.size || 170, color: o.ink ? '#2a170a' : o.color || '#f6e7c6', glow: o.ink ? 26 : 40, glowColor: o.ink ? 'rgba(250,236,206,0.95)' : 'rgba(255,120,40,0.55)', spacing: 6 });
    if (small) E.text(ctx, small, 0, (o.size || 170) * 0.62, { font: 'Cinzel', weight: 700, size: 40, color: o.ink ? '#7a2416' : '#f4b73f', spacing: 10, glow: o.ink ? 18 : 0, glowColor: 'rgba(250,236,206,0.95)' });
    ctx.restore();
  }
  function caption(ctx, str, a, y = H - 110, o = {}) {
    if (a <= 0) return;
    if (FLAGS.captions) y = Math.min(y, H - 200); // laisse la place aux sous-titres
    ctx.save(); ctx.globalAlpha = easeOut(clamp(a));
    ctx.font = `600 ${o.size || 40}px Cormorant`;
    const w = ctx.measureText(str).width + 80;
    ctx.fillStyle = 'rgba(8,5,3,0.62)';
    E.roundRect(ctx, W / 2 - w / 2, y - 38, w, 76, 38); ctx.fill();
    ctx.restore();
    E.text(ctx, str, W / 2, y + 2, { size: o.size || 40, weight: 600, color: o.color || '#f3e6cb', alpha: easeOut(clamp(a)) });
  }
  const fadeIO = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));

  // plaque d'os / carapace de tortue
  function plastron(ctx, t, x, y, s, crackU, heat) {
    const half = [[0, -300], [110, -292], [190, -250], [226, -160], [244, -70], [292, -6], [258, 62], [242, 160], [204, 250], [124, 298], [44, 312], [0, 292]];
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    half.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    [...half].reverse().forEach((p) => ctx.lineTo(-p[0], p[1]));
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 60;
    const g = ctx.createRadialGradient(-60, -80, 30, 0, 0, 360);
    g.addColorStop(0, '#efe2c2'); g.addColorStop(0.6, '#d3bd8f'); g.addColorStop(1, '#a88a5a');
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); ctx.clip();
    // grain de l'os
    const r = E.rand(21);
    ctx.globalAlpha = 0.18; ctx.strokeStyle = '#7a6040';
    for (let i = 0; i < 120; i++) { ctx.beginPath(); const px = (r() - 0.5) * 560, py = (r() - 0.5) * 600; ctx.moveTo(px, py); ctx.lineTo(px + (r() - 0.5) * 50, py + (r() - 0.5) * 12); ctx.stroke(); }
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#8a6c45'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, 310); ctx.stroke();
    [-180, -70, 62, 190].forEach((yy, i) => { ctx.beginPath(); ctx.moveTo(-300, yy + (i % 2 ? 10 : -6)); ctx.quadraticCurveTo(0, yy + 22, 300, yy - 4); ctx.stroke(); });
    // creusets et craquelures 卜
    ctx.globalAlpha = 1;
    const pits = [[-150, -210], [150, -210], [-170, -110], [170, -110], [-175, 10], [175, 10], [-160, 120], [160, 120], [-110, 220], [110, 220]];
    pits.forEach(([px, py], i) => {
      ctx.fillStyle = 'rgba(70,45,20,0.75)';
      ctx.beginPath(); ctx.ellipse(px, py, 13, 22, 0, 0, 7); ctx.fill();
      const cu = clamp(crackU * 1.6 - i * 0.06);
      if (cu > 0) {
        const side = px < 0 ? 1 : -1;
        ctx.strokeStyle = `rgba(40,20,5,${0.9})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(px, py - 22); ctx.lineTo(px, py - 22 + 44 * cu); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + side * 42 * cu, py - 4 - 14 * cu); ctx.stroke();
        if (heat > 0) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const hg = ctx.createRadialGradient(px, py, 0, px, py, 70);
          hg.addColorStop(0, `rgba(255,140,40,${0.7 * heat * (1 - cu * 0.5)})`); hg.addColorStop(1, 'rgba(255,80,0,0)');
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(px, py, 70, 0, 7); ctx.fill(); ctx.restore();
        }
      }
    });
    ctx.restore();
    ctx.restore();
  }

  // vase ding en bronze
  function ding(ctx, x, y, s, a) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = a;
    const pat = ctx.createLinearGradient(-280, -200, 280, 300);
    pat.addColorStop(0, '#5f8573'); pat.addColorStop(0.5, '#3c5a4c'); pat.addColorStop(1, '#233a31');
    ctx.fillStyle = pat; ctx.strokeStyle = '#1b2a24'; ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 50;
    // pieds
    [[-170, 0], [170, 0], [0, 40]].forEach(([lx, ly]) => {
      ctx.beginPath(); ctx.moveTo(lx - 28, 60 + ly * 0.3); ctx.lineTo(lx - 22, 330); ctx.lineTo(lx + 22, 330); ctx.lineTo(lx + 28, 60 + ly * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    // anses
    [-1, 1].forEach((sd) => {
      ctx.beginPath(); ctx.moveTo(sd * 150, -150); ctx.lineTo(sd * 150, -250); ctx.lineTo(sd * 215, -250); ctx.lineTo(sd * 215, -150);
      ctx.lineTo(sd * 195, -150); ctx.lineTo(sd * 195, -228); ctx.lineTo(sd * 170, -228); ctx.lineTo(sd * 170, -150); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    // panse
    ctx.beginPath(); ctx.moveTo(-285, -150); ctx.lineTo(285, -150); ctx.lineTo(270, -120);
    ctx.bezierCurveTo(270, 120, 150, 190, 0, 190); ctx.bezierCurveTo(-150, 190, -270, 120, -270, -120); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    // frise taotie stylisée
    ctx.strokeStyle = 'rgba(20,35,28,0.9)'; ctx.lineWidth = 5;
    for (let i = -4; i <= 4; i++) { const px = i * 56; ctx.beginPath(); ctx.moveTo(px - 20, -95); ctx.lineTo(px - 20, -60); ctx.lineTo(px + 20, -60); ctx.lineTo(px + 20, -85); ctx.lineTo(px - 5, -85); ctx.lineTo(px - 5, -72); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-262, -40); ctx.lineTo(262, -40); ctx.stroke();
    // patine
    const r = E.rand(5);
    for (let i = 0; i < 260; i++) {
      const px = (r() - 0.5) * 520, py = -140 + r() * 320;
      ctx.fillStyle = r() < 0.7 ? 'rgba(140,190,160,0.25)' : 'rgba(190,150,80,0.25)';
      ctx.beginPath(); ctx.arc(px, py, 2 + r() * 7, 0, 7); ctx.fill();
    }
    // reflet
    const hl = ctx.createLinearGradient(-200, 0, -80, 0);
    hl.addColorStop(0, 'rgba(255,230,180,0)'); hl.addColorStop(0.5, 'rgba(255,230,180,0.18)'); hl.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = hl; ctx.fillRect(-200, -150, 120, 320);
    ctx.restore();
  }

  function archer(ctx, x, gy, s, draw, col) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-40, -120); ctx.lineTo(-28, -210); ctx.lineTo(28, -210); ctx.lineTo(44, -120); ctx.lineTo(40, 0); ctx.closePath(); ctx.fill(); // robe
    ctx.beginPath(); ctx.arc(0, -236, 24, 0, 7); ctx.fill(); // tête
    ctx.beginPath(); ctx.arc(-4, -266, 11, 0, 7); ctx.fill(); // chignon
    ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, -196); ctx.lineTo(110, -200); ctx.stroke(); // bras tendu
    const pull = 40 + 30 * draw;
    ctx.beginPath(); ctx.moveTo(10, -196); ctx.lineTo(110 - pull, -206); ctx.stroke(); // bras qui tire
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(110, -300); ctx.quadraticCurveTo(160, -200, 110, -100); ctx.stroke(); // arc
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(110, -300); ctx.lineTo(110 - pull, -204); ctx.lineTo(110, -100); ctx.stroke(); // corde
    ctx.restore();
  }

  function pavilion(ctx, x, gy, s, col) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s); ctx.fillStyle = col;
    ctx.fillRect(-300, -50, 600, 50); // terrasse de terre battue
    ctx.fillRect(-60, -25, 120, 25);
    for (const px of [-240, -90, 90, 240]) ctx.fillRect(px - 10, -250, 20, 200);
    ctx.fillRect(-260, -262, 520, 16);
    ctx.beginPath(); ctx.moveTo(-340, -250); ctx.lineTo(-170, -380); ctx.lineTo(170, -380); ctx.lineTo(340, -250); ctx.closePath(); ctx.fill();
    ctx.fillRect(-190, -392, 380, 14);
    ctx.restore();
  }

  // cible de tissu 侯 tendue sur un cadre
  function target(ctx, x, gy, s, col, hitGlow) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.fillRect(-110, -330, 12, 330); ctx.fillRect(98, -330, 12, 330);
    ctx.fillStyle = '#c9b48a'; ctx.fillRect(-98, -300, 196, 200);
    ctx.fillStyle = '#8c2f24'; ctx.fillRect(-40, -240, 80, 80);
    if (hitGlow > 0) { ctx.fillStyle = `rgba(255,220,150,${hitGlow})`; ctx.fillRect(-40, -240, 80, 80); }
    ctx.restore();
  }

  // bandeau d'évolution (scène finale)
  const FORMS = [
    { k: 'real:jiaguwen', zh: '甲骨文', fr: 'Shang' },
    { k: 'real:jinwen', zh: '金文', fr: 'Zhou' },
    { k: 'real:xiaozhuan', zh: '小篆', fr: 'Qin' },
    { k: 'real:lishu', zh: '隸書', fr: 'Han' },
    { k: 'font:kai_xue_trad', zh: '楷書', fr: 'Tang' },
    { k: 'font:cao_xue_simp', zh: '草書', fr: 'cursive' },
    { k: 'font:kai_xue_simp', zh: '学', fr: 'XXe s.' },
  ];
  function drawForm(ctx, key, x, y, size, color, alpha, extra = {}) {
    if (key.startsWith('real:')) {
      E.drawRealGlyph(ctx, key.slice(5), { x, y, size, color, alpha, ...extra });
    } else if (key.startsWith('font:')) {
      E.drawFontGlyph(ctx, key.slice(5), { x, y, size, color, alpha, ...extra });
    } else {
      E.drawGlyph(ctx, P[key], { x, y, size, color, alpha, ...extra });
    }
  }

  // ─────────────────────────── SCÈNES
  const S = [];

  // 1. Accroche : « Ce caractère cache deux mains… que plus personne ne voit. »
  // Ancres (temps de la réplique 1) : mains 0–1,56 s ; disparition 2,54 s ; « Trois mille ans » 4,62 s ;
  // « dans un seul mot » 6,04 s ; « apprendre » 7,48 s.
  const HOOK = { hands: 0.9, gone: 2.54, years: 4.62, one: 6.04, learn: 7.48 };
  S.push({
    k: 1,
    draw(ctx, t) {
      const vt = VT(1, t);
      const A = HOOK;
      E.background(ctx, t, '#1a120c', '#050302');
      E.motes(ctx, t, '255,190,110', 0.6);
      ctx.save();
      shake(ctx, vt, [A.learn], 18);
      // a) 學 surgit de l'encre ; les deux mains s'allument, puis se dissipent en cendres → 学
      const aA = 1 - seg(vt, A.years - 0.35, A.years);
      if (aA > 0) {
        ctx.save(); ctx.globalAlpha = aA;
        E.inkBlot(ctx, W / 2, H / 2, 440, seg(vt, -0.45, 0.25), 4, 'rgba(0,0,0,0.85)');
        const push = easeInOut(seg(vt, 0.2, A.gone + 0.4));
        const back = easeInOut(seg(vt, A.gone + 0.6, A.years - 0.2));
        camera(ctx, lerp(1.0, 1.28, push) - 0.28 * back, W / 2, lerp(H / 2, H / 2 - 170, push * (1 - back)));
        const handHi = easeOut(seg(vt, A.hands - 0.5, A.hands + 0.4));
        const vanish = easeInOut(seg(vt, A.gone, A.gone + 1.1));
        const swap = seg(vt, A.gone + 0.7, A.gone + 1.4);
        const gx = W / 2, gy = H / 2, gs = 720;
        E.drawFontGlyph(ctx, 'kai_xue_trad', {
          x: gx, y: gy, size: gs,
          color: (c) => (c === 'hand' ? E.mix('#f3e5c6', COMP.hand.col, handHi) : '#f3e5c6'),
          alpha: (c) => (c === 'hand' ? 1 - vanish : 1),
          opacity: 1 - swap, reveal: () => easeOut(seg(vt, -0.25, 0.6)),
          glow: 30 + 40 * handHi * (1 - vanish), glowColor: E.rgba(COMP.hand.col, 0.35 + 0.5 * handHi * (1 - vanish)),
        });
        if (swap > 0) E.drawFontGlyph(ctx, 'kai_xue_simp', { x: gx, y: gy, size: gs, color: (c) => (c === 'hand' || c === 'yao' ? FUSION : '#f3e5c6'), opacity: swap, glow: 40, glowColor: 'rgba(255,150,60,0.6)' });
        // cendres rouges qui s'envolent des deux mains
        if (vanish > 0 && vanish < 1) {
          const r = E.rand(77);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 90; i++) {
            const side = i % 2 ? 1 : -1;
            const bx = gx + side * (130 + r() * 110) * gs / 720, by = gy - (40 + r() * 220) * gs / 720;
            const life = clamp(vanish * 1.4 - r() * 0.4);
            if (life <= 0) continue;
            const px = bx + side * life * (40 + r() * 120), py = by - life * (120 + r() * 260);
            ctx.fillStyle = `rgba(255,${110 + Math.round(r() * 80)},60,${(1 - life) * 0.9})`;
            ctx.beginPath(); ctx.arc(px, py, 2 + r() * 5, 0, 7); ctx.fill();
          }
          ctx.restore();
        }
        ctx.restore();
        const lab = seg(vt, A.hands - 0.3, A.hands + 0.2) * (1 - seg(vt, A.gone, A.gone + 0.5));
        E.text(ctx, '𦥑  deux mains', W / 2, 1000, { font: 'Kai', size: 46, color: COMP.hand.col, alpha: lab, glow: 16, glowColor: COMP.hand.col });
      }
      // b) trois mille ans : les formes défilent (un peu plus posé qu'avant)
      const flashes = [];
      const years = ['v. 1250 av. J.-C.', 'v. 1000 av. J.-C.', '221 av. J.-C.', 'Han', 'Tang', 'cursive', 'aujourd\'hui'];
      const step = (A.one + 0.35 - A.years) / 7;
      if (vt >= A.years && vt < A.one + 0.35) {
        const i = Math.min(6, Math.floor((vt - A.years) / step));
        const f = FORMS[i];
        const lu = (vt - A.years - i * step) / step;
        ctx.save();
        ctx.globalAlpha = Math.min(1, lu * 6, (1 - lu) * 6 + 0.35);
        camera(ctx, lerp(1.08, 1.0, lu));
        drawForm(ctx, f.k, W / 2, H / 2 - 30, 620, i === 5 || i === 6 ? fusionCol : compCol, () => 1, { glow: 30 });
        E.text(ctx, f.zh, W / 2 - 440, H / 2 + 330, { font: 'Kai', size: 60, color: '#f4e7c8', align: 'left' });
        E.text(ctx, years[i], W / 2 + 440, H / 2 + 330, { font: 'Cinzel', size: 44, weight: 700, color: '#f4b73f', align: 'right' });
        ctx.restore();
      }
      for (let i = 0; i < 7; i++) flashes.push(T(1, A.years) + i * step);
      // c) titre, puis « APPRENDRE »
      const aC = seg(vt, A.one + 0.35, A.one + 0.6) * (1 - seg(vt, A.learn - 0.1, A.learn + 0.05));
      if (aC > 0) {
        ctx.save(); ctx.globalAlpha = aC;
        E.drawFontGlyph(ctx, 'kai_xue_simp', { x: 620, y: 520, size: 560, color: fusionCol, glow: 30, glowColor: 'rgba(255,140,60,0.5)' });
        E.text(ctx, 'XUÉ', 1270, 400, { font: 'Cinzel', weight: 900, size: 150, color: '#f6e7c6', spacing: 20, glow: 30, glowColor: 'rgba(255,120,40,0.5)' });
        E.text(ctx, '3 000 ANS', 1270, 560, { font: 'Cinzel', weight: 700, size: 76, color: '#f4b73f', spacing: 12 });
        E.text(ctx, "D'HISTOIRE", 1270, 650, { font: 'Cinzel', weight: 700, size: 76, color: '#f4b73f', spacing: 12 });
        ctx.restore();
      }
      const aD = seg(vt, A.learn, A.learn + 0.15);
      if (aD > 0) {
        E.drawFontGlyph(ctx, 'kai_xue_simp', { x: W / 2, y: H / 2 - 60, size: 520, color: () => 'rgba(180,40,30,1)', opacity: 0.35 * aD });
        dateSlam(ctx, t, T(1, A.learn), 'APPRENDRE', null, { size: 190 });
      }
      ctx.restore();
      flash(ctx, t, flashes, '255,240,220', 0.15, 0.35);
      flash(ctx, t, [T(1, A.one + 0.35), T(1, A.learn)]);
      E.finish(ctx, t);
    },
  });

  // 2. Os oraculaires — Shang
  S.push({
    k: 2,
    draw(ctx, t) {
      const vt = VT(2, t);
      // a) carte
      if (vt < 5.1) {
        const z = easeInOut(seg(vt, -0.3, 4.6));
        const v = { lon: lerp(108, 114, z), lat: lerp(33, 35.2, z), k: lerp(36, 95, z) };
        E.drawMap(ctx, t, v, { rivers: seg(vt, -0.3, 1.8), riverLabels: seg(vt, 2.2, 2.7) * (1 - seg(vt, 4.2, 4.6)) });
        E.region(ctx, v, 'shang', 'rgba(200,60,40,0.22)', seg(vt, 3.1, 3.8));
        E.marker(ctx, t, v, E.CITIES.anyang, 'Anyang', 'dernière capitale des Shang', seg(vt, 2.25, 2.6));
        dateSlam(ctx, t, T(2, 0.0), 'v. 1250', 'AVANT NOTRE ÈRE', { y: 200, size: 120, out: T(2, 2.1), ink: true });
        E.finish(ctx, t, { vignette: 0.8 });
        ctx.fillStyle = `rgba(0,0,0,${seg(vt, 4.7, 5.1)})`; ctx.fillRect(0, 0, W, H);
        return;
      }
      // b) plastron + divination, puis c) gravure du signe
      E.background(ctx, t, '#2a1a0e', '#070403');
      E.motes(ctx, t, '255,150,60', 0.9 * (1 - seg(vt, 9, 10)));
      const zoom = easeInOut(seg(vt, 8.0, 9.8));
      ctx.save();
      camera(ctx, lerp(1, 2.6, zoom), lerp(W / 2, W / 2, zoom), lerp(H / 2, H / 2 - 20, zoom));
      if (!(FLAGS.three && vt < 9.4)) plastron(ctx, t, W / 2, H / 2 + 20, 1.35 * lerp(0.92, 1, easeOut(seg(vt, 5.0, 5.8))), seg(vt, 5.6, 7.6), seg(vt, 5.2, 6.0) * (1 - seg(vt, 7.4, 8.4)));
      ctx.restore();
      E.eraTag(ctx, t, '甲骨文', 'jiaguwen', 'os oraculaires · Shang', seg(vt, 5.1, 5.6));
      caption(ctx, 'Les devins interrogent les ancêtres : le feu fait craquer l\'os', fadeIO(vt, 5.3, 8.4), FLAGS.three ? 150 : H - 110); // au-dessus de la carapace 3D

      if (vt > 9.4) {
        // panneau d'os en gros plan
        const a = seg(vt, 9.4, 9.9);
        const gx = 760, gy = 560, gs = 820;
        const hi = {
          yao: Math.max(pulse(vt, 11.2, 1.2), pulse(vt, 12.6, 1.4)),
          roof: pulse(vt, 16.4, 1.2),
          hand: pulse(vt, 19.4, 1.2),
        };
        const known = { yao: seg(vt, 11.3, 11.8), roof: seg(vt, 16.3, 16.8), hand: seg(vt, 19.4, 19.9) };
        const rg = { x: gx, y: gy, size: gs };
        const hiAll = Math.max(hi.yao, hi.roof, hi.hand);
        E.drawRealGlyph(ctx, 'jiaguwen', {
          ...rg, opacity: a, carve: true,
          // signe déjà incisé sur l'os (version 3D) ; sinon révélé composante par composante
          reveal: (c) => (FLAGS.three ? 1 : easeInOut(c === 'yao' ? seg(vt, 10.0, 11.6) : c === 'roof' ? seg(vt, 15.6, 16.7) : seg(vt, 17.9, 19.5))),
          color: (c) => E.mix(E.mix(BONE_INK, COMP[c].col, known[c]), '#ffffff', 0.3 * (hi[c] || 0)),
          glow: 10 + 20 * hiAll, glowColor: 'rgba(255,190,110,0.45)',
        });
        const yc = E.realCenter('jiaguwen', 'yao', rg);
        E.callout(ctx, yc[0] + 40, yc[1], 1300, 250, '爻 yáo', COMP.yao.col, seg(vt, 12.6, 13.0), seg(vt, 13.8, 14.1) > 0 ? 'baguettes croisées' : null);
        const rc = E.realCenter('jiaguwen', 'roof', rg);
        E.callout(ctx, rc[0] + 150, rc[1] + 60, 1300, 760, '冖 toit', COMP.roof.col, seg(vt, 16.5, 16.9), 'un bâtiment');
        const hc = E.realCenter('jiaguwen', 'hand', rg);
        E.callout(ctx, hc[0] - 150, hc[1] - 40, 200, 520, '𦥑', COMP.hand.col, seg(vt, 19.5, 19.9), 'deux mains');
        E.text(ctx, 'Jiaguwen de 學 — d\'après zdic.net', gx, gy + gs / 2 + 40, { size: 24, weight: 500, color: '#cdbb98', alpha: a * 0.8 });
        E.text(ctx, '(certaines inscriptions omettent les mains)', 1340, 1000, { size: 28, weight: 500, color: '#cdbb98', alpha: seg(vt, 19.8, 20.3) });
      }
      E.finish(ctx, t);
    },
  });

  // 3. Bronzes — Zhou occidentaux
  S.push({
    k: 3,
    draw(ctx, t) {
      const vt = VT(3, t);
      if (vt < 2.9) {
        const v = { lon: 111.5, lat: 35, k: 88 };
        E.drawMap(ctx, t, v, { rivers: 1 });
        E.region(ctx, v, 'shang', 'rgba(239,90,60,0.22)', 1 - seg(vt, 0.6, 1.6));
        E.region(ctx, v, 'zhou', 'rgba(63,193,176,0.35)', seg(vt, -0.3, 0.3));
        E.marker(ctx, t, v, E.CITIES.hao, 'Hao', 'capitale des Zhou', seg(vt, 0.0, 0.4), '#3fc1b0', -1);
        // flèche de conquête
        const u = easeInOut(seg(vt, 0.4, 1.6));
        if (u > 0) {
          const a = E.proj(v, [109.3, 34.6]), b = E.proj(v, [114.0, 35.9]);
          ctx.save(); ctx.strokeStyle = '#3fc1b0'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.shadowColor = '#3fc1b0'; ctx.shadowBlur = 20;
          const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 120;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]);
          const steps = 30;
          for (let i = 1; i <= steps * u; i++) { const s = i / steps; ctx.lineTo((1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * mx + s * s * b[0], (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * my + s * s * b[1]); }
          ctx.stroke(); ctx.restore();
        }
        dateSlam(ctx, t, T(3, 0.3), 'v. 1046', 'LES ZHOU RENVERSENT LES SHANG', { y: 200, size: 120, ink: true });
        E.finish(ctx, t, { vignette: 0.8 });
        ctx.fillStyle = `rgba(0,0,0,${seg(vt, 2.6, 2.9)})`; ctx.fillRect(0, 0, W, H);
        return;
      }
      if (vt < 14.3) {
        E.background(ctx, t, '#11221d', '#030605');
        E.motes(ctx, t, '150,230,200', 0.5);
        // vase ding + estampage
        const aV = seg(vt, 2.9, 3.5) * (1 - seg(vt, 5.2, 5.7));
        if (aV > 0) {
          ctx.save(); ctx.translate(0, 120 * (1 - easeOut(seg(vt, 2.9, 3.8))));
          if (!FLAGS.three) ding(ctx, 620, 560, 1.15, aV);
          ctx.restore();
          if (!FLAGS.three) {
            // version 2D : estampage de l'inscription à côté du vase
            ctx.save(); ctx.globalAlpha = aV;
            ctx.fillStyle = '#0b0b0b'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 40;
            ctx.fillRect(1120, 230, 520, 620); ctx.restore();
            E.drawGlyph(ctx, P.bronze, { x: 1380, y: 540, size: 520, color: () => '#e9e2d0', alpha: () => aV, progress: seg(vt, 3.6, 5.0) });
            E.text(ctx, 'estampage d\'inscription', 1380, 900, { size: 30, weight: 600, color: '#bfb49c', alpha: aV });
          }
        }
        // version 3D : le vase occupe le plan, puis la caméra plonge vers l'inscription du fond
        if (FLAGS.three) caption(ctx, 'Les inscriptions sont coulées dans le bronze, à l\'intérieur du vase', fadeIO(vt, 3.4, 5.3), 190);
        E.eraTag(ctx, t, '金文', 'jinwen', 'bronzes · Zhou occidentaux', seg(vt, 3.0, 3.5));
        // métamorphose oracle → bronze puis arrivée de l'enfant
        const aG = seg(vt, 5.3, 5.8);
        if (aG > 0) {
          const m = easeInOut(seg(vt, 5.4, 7.0)); // métamorphose lente : on voit ce qui bouge
          const hi = { hand: pulse(vt, 10.5, 1.2), roof: pulse(vt, 11.9, 1.0), child: Math.max(pulse(vt, 7.7, 1.4), pulse(vt, 13.0, 1.0)) };
          const gx = 800, gy = 530, gs = 800;
          const rg = { x: gx, y: gy, size: gs };
          ctx.save(); ctx.globalAlpha = aG;
          if (m < 1) E.drawRealGlyph(ctx, 'jiaguwen', { ...rg, opacity: 1 - m, color: (c) => COMP[c].col, glow: 16 });
          E.drawRealGlyph(ctx, 'jinwen', {
            ...rg, opacity: m,
            reveal: (c) => (c === 'child' ? easeOut(seg(vt, 7.0, 8.4)) : 1),
            color: (c) => E.mix(COMP[c].col, '#ffffff', 0.35 * (hi[c] || 0)),
            glow: 16 + 24 * Math.max(hi.hand, hi.roof, hi.child), glowColor: 'rgba(255,220,170,0.5)',
          });
          ctx.restore();
          E.legend(ctx, aG, { hand: 1, yao: 1, roof: 1, child: seg(vt, 7.7, 8.1) }, hi);
          const cc = E.realCenter('jinwen', 'child', rg);
          E.callout(ctx, cc[0] - 60, cc[1] + 20, 300, 820, '子 l\'enfant', COMP.child.col, seg(vt, 7.7, 8.1) * (1 - seg(vt, 9.0, 9.4)), 'un nouveau venu');
          // phrase-clé
          const words = [['DES MAINS', 10.5, COMP.hand.col], ['SOUS UN TOIT', 11.9, COMP.roof.col], ['À UN ENFANT', 13.0, COMP.child.col]];
          words.forEach(([w, a0, col], i) => {
            const u = seg(vt, a0, a0 + 0.3);
            if (u > 0) E.text(ctx, w, 470 + i * 480, 1000, { font: 'Cinzel', weight: 900, size: 56, color: col, alpha: u * (1 - seg(vt, 14.0, 14.3)), glow: 20, glowColor: col, spacing: 4 });
          });
        }
        E.finish(ctx, t);
        flash(ctx, t, [T(3, 7.7)]);
        ctx.fillStyle = `rgba(0,0,0,${seg(vt, 14.0, 14.3)})`; ctx.fillRect(0, 0, W, H);
        return;
      }
      // tir à l'arc au 學宮, en lavis à l'encre
      LAVIS.archery(ctx, t, vt, 14.3);
      const aT = seg(vt, 20.2, 20.6);
      E.text(ctx, '學宮', W / 2 - 40, 170, { font: 'Kai', size: 120, color: '#1c160f', alpha: aT });
      E.text(ctx, 'la « salle d\'étude »', W / 2 - 40, 270, { size: 44, weight: 700, color: '#5a3a1c', alpha: seg(vt, 20.4, 20.8) });
      LAVIS.seal(ctx, W / 2 + 150, 190, seg(vt, 20.5, 20.8));
      caption(ctx, 'Inscription du vase Jing gui 靜簋 : on y apprend le tir à l\'arc', fadeIO(vt, 14.6, 30), H - 70, { size: 36 });
      E.finish(ctx, t, { vignette: 0.35 });
    },
  });

  // 4. Qin : unification et petit sceau
  S.push({
    k: 4,
    draw(ctx, t) {
      const vt = VT(4, t);
      if (vt < 5.0) {
        const v = { lon: 112.5, lat: 32.5, k: 44 };
        const mapA = seg(vt, 2.2, 2.7);
        E.background(ctx, t, '#2a0b08', '#050101');
        if (mapA > 0) {
          ctx.save(); ctx.globalAlpha = mapA;
          E.drawMap(ctx, t, v, { rivers: 1 });
          E.region(ctx, v, 'qin', 'rgba(190,40,30,0.5)', 1, easeInOut(seg(vt, 2.8, 4.7)), E.CITIES.xianyang);
          E.marker(ctx, t, v, E.CITIES.xianyang, 'Xianyang', 'capitale des Qin', seg(vt, 2.6, 3.0), '#ef5a3c', -1);
          const q = E.proj(v, [115, 33]);
          E.text(ctx, '秦', q[0], q[1], { font: 'Kai', size: 180, color: '#ffffff', alpha: seg(vt, 3.4, 4.0) * 0.85, glow: 30, glowColor: '#000' });
          ctx.restore();
          caption(ctx, 'Qin Shi Huang, premier empereur', fadeIO(vt, 3.0, 5.0));
        }
        ctx.save(); shake(ctx, vt, [0.05, 1.2], 22);
        dateSlam(ctx, t, T(4, 0.0), '221', 'AVANT NOTRE ÈRE', { size: 260, out: T(4, 2.2), color: '#ffffff' });
        ctx.restore();
        flash(ctx, t, [V(4)], '255,80,40', 0.35, 0.6);
        E.finish(ctx, t);
        return;
      }
      E.background(ctx, t, '#2a0d0a', '#060202');
      E.motes(ctx, t, '255,120,80', 0.5);
      if (vt < 9.2) {
        // variantes régionales qui convergent vers une forme unique
        const u = easeInOut(seg(vt, 6.2, 8.4));
        const a0 = seg(vt, 5.0, 5.2);
        // « Jusque-là, chaque royaume écrivait à sa façon »
        E.text(ctx, 'avant Qin : chaque royaume écrit à sa façon', W / 2, 150, { size: 52, weight: 700, color: '#f3e5c6', alpha: seg(vt, 5.05, 5.2) * (1 - seg(vt, 5.5, 5.6)) });
        const ivory = () => '#e9dcc3';
        // avant Qin : chaque royaume écrit à sa façon
        [['real:zhanguo', 480, '戰國文字', 'Royaumes combattants'], ['real:jinwen', 1440, '金文', 'bronzes Zhou']].forEach(([k, px, zh, fr]) => {
          const x = lerp(px, W / 2, u), sz = lerp(440, 620, u), al = a0 * (1 - smooth(seg(vt, 7.6, 8.5)));
          drawForm(ctx, k, x, 560, sz, ivory, () => 1, { opacity: al * 0.9, glow: 10 });
          E.text(ctx, zh, x, 850, { font: 'Kai', size: 44, color: '#f4e7c8', alpha: al * (1 - u) });
          E.text(ctx, fr, x, 905, { size: 30, weight: 600, color: '#d9c7a0', alpha: al * (1 - u) });
        });
        const sa = seg(vt, 7.8, 8.6);
        if (sa > 0) E.drawRealGlyph(ctx, 'xiaozhuan', { x: W / 2, y: 560, size: 620, color: ivory, opacity: sa, glow: 24 });
        E.text(ctx, '書同文', W / 2, 150, { font: 'Kai', size: 120, color: '#ffe8c2', alpha: seg(vt, 5.6, 6.0), glow: 30, glowColor: 'rgba(255,90,40,0.7)' });
        E.text(ctx, '« une même écriture pour tous » — le ministre Li Si 李斯', W / 2, 960, { size: 44, weight: 700, color: '#f3e5c6', alpha: seg(vt, 6.2, 6.6) });
        flash(ctx, t, [T(4, 8.6)], '255,230,200', 0.3, 0.7);
        E.finish(ctx, t);
        return;
      }
      // petit sceau + axe de symétrie
      E.eraTag(ctx, t, '小篆', 'petit sceau', 'Qin · 221 av. J.-C.', seg(vt, 9.2, 9.6));
      const gx = 800, gy = 560, gs = 800;
      const ax = seg(vt, 9.6, 10.6);
      ctx.save(); ctx.strokeStyle = 'rgba(255,220,170,0.7)'; ctx.lineWidth = 3; ctx.setLineDash([16, 12]);
      ctx.beginPath(); ctx.moveTo(gx, gy - 440); ctx.lineTo(gx, gy - 440 + 880 * easeOut(ax)); ctx.stroke(); ctx.restore();
      const mirrorPulse = pulse(vt, 10.8, 1.2);
      E.drawRealGlyph(ctx, 'xiaozhuan', {
        x: gx, y: gy, size: gs, color: (c) => E.mix(COMP[c].col, '#ffffff', 0.3 * mirrorPulse),
        glow: 18 + 30 * mirrorPulse, glowColor: 'rgba(255,210,160,0.55)',
      });
      E.text(ctx, 'SYMÉTRIE', gx, gy + 470, { font: 'Cinzel', weight: 700, size: 40, color: '#ffe0b0', spacing: 16, alpha: seg(vt, 10.6, 11.0) });
      E.legend(ctx, 1, { hand: 1, yao: 1, roof: 1, child: 1 });
      E.finish(ctx, t);
    },
  });

  // 5. Xu Shen et le Shuowen jiezi
  S.push({
    k: 5,
    draw(ctx, t) {
      const vt = VT(5, t);
      E.background(ctx, t, '#221a10', '#050302');
      E.motes(ctx, t, '255,200,130', 0.4);
      // lattes de bambou (lecture de droite à gauche)
      const cols = ['斆', '覺悟也', '从教', '从冂', '冂尚矇也', '臼聲', '學', '篆文斆省'];
      const x0 = 1680, dx = 118, top = 150;
      cols.forEach((c, i) => {
        const a = seg(vt, -0.2 + i * 0.12, 0.3 + i * 0.12);
        if (a <= 0) return;
        const x = x0 - i * dx;
        ctx.save(); ctx.globalAlpha = a;
        ctx.translate(0, -30 * (1 - easeOut(a)));
        const g = ctx.createLinearGradient(x - 45, 0, x + 45, 0);
        g.addColorStop(0, '#8d6a3a'); g.addColorStop(0.5, '#d9b879'); g.addColorStop(1, '#8a6534');
        ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 20;
        ctx.fillRect(x - 46, top, 92, 780);
        ctx.shadowBlur = 0;
        const hl1 = c === '覺悟也' ? seg(vt, 5.7, 6.0) : 0;
        const hl2 = c === '冂尚矇也' || c === '从冂' ? seg(vt, 7.5, 7.9) : 0;
        [...c].forEach((ch, j) => {
          const col = hl1 > 0 && j < 2 ? E.mix('#1d130a', '#b3261e', hl1) : hl2 > 0 && (ch === '冂' || j < 4 && c === '冂尚矇也') ? E.mix('#1d130a', '#136d63', hl2) : '#1d130a';
          E.text(ctx, ch, x, top + 70 + j * 92, { font: 'Kai', size: 78, color: col });
        });
        ctx.restore();
      });
      // cordelettes
      ctx.save(); ctx.globalAlpha = seg(vt, 0.6, 1.0); ctx.strokeStyle = '#3b2512'; ctx.lineWidth = 4;
      [top + 110, top + 680].forEach((y) => { ctx.beginPath(); ctx.moveTo(x0 + 60, y); ctx.lineTo(x0 - 7 * dx - 60, y); ctx.stroke(); });
      ctx.restore();
      // glyphe sigillaire, toit dans l'ombre
      const veil = seg(vt, 7.6, 8.6);
      E.drawRealGlyph(ctx, 'xiaozhuan', {
        x: 470, y: 560, size: 560,
        color: (c) => (c === 'roof' ? E.mix(COMP.roof.col, '#ffffff', 0.4 * pulse(vt, 7.6, 1.2)) : E.mix(COMP[c].col, '#555555', 0.7 * veil * (c === 'child' ? 1 : 0.3))),
        glow: 20, glowColor: 'rgba(255,210,160,0.45)',
      });
      if (veil > 0) {
        ctx.save(); ctx.globalAlpha = 0.55 * veil;
        const vg = ctx.createLinearGradient(0, 620, 0, 900);
        vg.addColorStop(0, 'rgba(5,3,2,0.95)'); vg.addColorStop(1, 'rgba(5,3,2,0.2)');
        ctx.fillStyle = vg; ctx.fillRect(250, 620, 440, 290); ctx.restore();
      }
      E.text(ctx, '許慎  Xu Shen', 470, 150, { font: 'Kai', size: 56, color: '#f4e7c8', alpha: seg(vt, 0.3, 0.8) });
      E.text(ctx, '說文解字  ·  Shuowen jiezi  ·  v. 100', 470, 225, { size: 38, weight: 700, color: '#f4b73f', alpha: seg(vt, 2.3, 2.7) });
      // « le premier dictionnaire qui explique la forme de chaque caractère » (passage étiré par la voix)
      caption(ctx, 'premier dictionnaire à expliquer la forme des caractères · 9 353 entrées · 540 clés', fadeIO(vt, 4.3, 5.05, 0.06, 0.06), H - 90);
      caption(ctx, '覺悟 : « s\'éveiller, prendre conscience »', fadeIO(vt, 5.7, 7.5, 0.3, 0.3), H - 90);
      caption(ctx, '冂 尚矇也 : « le toit, c\'est ce qui couvre encore — l\'obscurité »', fadeIO(vt, 7.6, 20, 0.3, 0.3), H - 90);
      E.finish(ctx, t);
    },
  });

  // 6. Écriture des clercs (Han)
  S.push({
    k: 6,
    draw(ctx, t) {
      const vt = VT(6, t);
      E.background(ctx, t, '#161a26', '#030306');
      E.motes(ctx, t, '180,200,255', 0.4);
      E.eraTag(ctx, t, '隸書', 'lishu', 'écriture des clercs · Han', seg(vt, 0.1, 0.6));
      // vitesse : traits de pinceau en arrière-plan
      ctx.save(); ctx.globalAlpha = 0.12 * (1 - seg(vt, 3, 4));
      for (let i = 0; i < 14; i++) { const y = 200 + i * 60, x = ((vt * 1400 + i * 377) % 2600) - 400; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 300 + (i % 3) * 120, 4); }
      ctx.restore();
      const m = easeInOut(seg(vt, 2.6, 4.8)); // s'achève pendant la pause qui suit « …les courbes »
      const gx = 800, gy = 540, gs = 820;
      if (m < 1) E.drawRealGlyph(ctx, 'xiaozhuan', { x: gx, y: gy, size: gs, color: (c) => COMP[c].col, opacity: 1 - m, glow: 16 });
      const handHi = pulse(vt, 5.1, 3.0);
      const fade = seg(vt, 8.7, 9.6);
      // forme réelle : stèle de Cao Quan 曹全碑 (Han orientaux, 185), 小學堂 — Academia Sinica
      E.drawRealGlyph(ctx, 'lishu', {
        x: gx, y: gy, size: gs, opacity: m,
        color: (c) => (c === 'hand' ? E.mix(E.mix(COMP.hand.col, '#ffffff', 0.35 * handHi), '#6b6560', fade) : COMP[c].col),
        glow: 16 + 22 * handHi * (1 - fade), glowColor: E.rgba(COMP.hand.col, 0.3 + 0.5 * handHi * (1 - fade)),
      });
      E.text(ctx, 'stèle de Cao Quan 曹全碑 · 185', gx, gy + gs / 2 + 30, { size: 26, weight: 600, color: '#b9b2c8', alpha: m * 0.85 });
      E.legend(ctx, 1 - seg(vt, 5.0, 5.4), { hand: 1, yao: 1, roof: 1, child: 1 });
      // 蠶頭燕尾 : l'extrémité droite de la grande horizontale de 子
      const fx = gx - gs / 2 + 318 * gs / 400, fy = gy - gs / 2 + 248 * gs / 400;
      E.callout(ctx, fx, fy, 1360, 950, '燕尾', '#f4b73f', seg(vt, 4.3, 4.7) * (1 - seg(vt, 5.2, 5.5)), 'la « queue d\'hirondelle »');
      // 臼 : un mortier ?
      const aM = seg(vt, 6.0, 6.4);
      if (aM > 0) {
        ctx.save(); ctx.globalAlpha = aM;
        ctx.fillStyle = 'rgba(10,8,6,0.75)'; E.roundRect(ctx, 1380, 250, 440, 560, 16); ctx.fill();
        ctx.restore();
        E.text(ctx, '臼', 1600, 400, { font: 'Kai', size: 200, color: E.mix(COMP.hand.col, '#8a847c', fade), alpha: aM });
        E.text(ctx, 'jiù : « mortier »', 1600, 545, { size: 46, weight: 700, color: '#f3e5c6', alpha: aM });
        // pictogramme de mortier et pilon
        ctx.save(); ctx.globalAlpha = aM; ctx.translate(0, 50); ctx.fillStyle = '#b08d57';
        ctx.beginPath(); ctx.moveTo(1520, 640); ctx.lineTo(1680, 640); ctx.lineTo(1650, 740); ctx.lineTo(1550, 740); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7c5c33'; ctx.save(); ctx.translate(1640, 610); ctx.rotate(0.5); ctx.fillRect(-10, -70, 20, 110); ctx.restore();
        ctx.restore();
        const aX = seg(vt, 8.8, 9.2);
        if (aX > 0) {
          ctx.save(); ctx.globalAlpha = aX; ctx.strokeStyle = '#ef5a3c'; ctx.lineWidth = 10; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(1440, 300); ctx.lineTo(1760, 760); ctx.moveTo(1760, 300); ctx.lineTo(1440, 760); ctx.stroke(); ctx.restore();
          E.text(ctx, 'à l\'origine : deux mains 𦥑', 1600, 880, { size: 38, weight: 700, color: '#ffd9c8', alpha: aX, glow: 10 });
        }
      }
      E.finish(ctx, t);
    },
  });

  // 7. Kaishu
  S.push({
    k: 7,
    draw(ctx, t) {
      const vt = VT(7, t);
      E.background(ctx, t, '#1d1710', '#040302');
      E.motes(ctx, t, '255,210,150', 0.4);
      E.eraTag(ctx, t, '楷書', 'kaishu', 'écriture régulière · canon des Tang', seg(vt, 0.0, 0.5));
      const gx = 800, gy = 560, gs = 820;
      // les 16 traits dans l'ordre d'écriture réel, le compteur suit le pinceau
      const prog = 16 * seg(vt, 0.05, 3.65);
      E.drawStrokes(ctx, 'xue_trad', { x: gx, y: gy, size: gs, progress: prog, color: strokeCol, glow: 22, glowColor: 'rgba(255,170,90,0.45)', tip: true });
      E.text(ctx, 'xué', 1560, 380, { font: 'Cormorant', weight: 700, size: 150, color: '#f6e7c6', alpha: seg(vt, 2.6, 2.9), glow: 30, glowColor: 'rgba(255,140,60,0.6)' });
      const n = Math.min(16, Math.ceil(prog - 0.02));
      const u = seg(vt, 3.6, 3.9);
      E.text(ctx, String(n), 1560, 640, { font: 'Cinzel', weight: 900, size: 220, color: '#f4b73f', alpha: seg(vt, 0.2, 0.6) });
      E.text(ctx, 'TRAITS', 1560, 790, { font: 'Cinzel', weight: 700, size: 56, color: '#f3e5c6', spacing: 14, alpha: u });
      E.finish(ctx, t);
    },
  });

  // 8. Cursive, imprimés populaires, réformes du XXe siècle
  S.push({
    k: 8,
    draw(ctx, t) {
      const vt = VT(8, t);
      const gx = 800, gy = 560, gs = 820;
      if (vt < 5.8) {
        E.background(ctx, t, '#1d1710', '#040302');
        E.motes(ctx, t, '255,210,150', 0.4);
        const aK = 1 - seg(vt, 1.6, 2.1);
        if (aK > 0) {
          ctx.save(); shake(ctx, vt, [0.0, 0.7], 10);
          E.drawFontGlyph(ctx, 'kai_xue_trad', { x: gx, y: gy, size: gs, color: compCol, opacity: aK });
          E.text(ctx, '16', 1560, 560, { font: 'Cinzel', weight: 900, size: 240 * (1 + 0.12 * pulse(vt, 0, 0.5) + 0.12 * pulse(vt, 0.7, 0.5)), color: '#ef5a3c', alpha: aK, glow: 30, glowColor: '#ef5a3c' });
          E.text(ctx, 'TRAITS', 1560, 720, { font: 'Cinzel', weight: 700, size: 56, color: '#f3e5c6', spacing: 14, alpha: aK });
          ctx.restore();
        }
        const aC = seg(vt, 2.0, 2.3);
        if (aC > 0) {
          E.eraTag(ctx, t, '草書', 'caoshu', 'écriture cursive', aC);
          // papier
          ctx.save(); ctx.globalAlpha = aC; ctx.fillStyle = '#e9dcc0'; ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50;
          ctx.fillRect(gx - 430, gy - 430, 860, 860); ctx.restore();
          const top = easeInOut(seg(vt, 4.2, 5.0)); // moment clé : le haut devient ⺍ (pause dans la voix)
          const order = { hand: [2.3, 2.8], yao: [2.6, 3.2], roof: [3.0, 3.5], child: [3.3, 4.2] };
          E.drawFontGlyph(ctx, 'cao_xue_simp', {
            x: gx, y: gy, size: gs * 0.92, reveal: (c) => easeInOut(seg(vt, order[c][0], order[c][1])),
            color: (c) => (c === 'hand' || c === 'yao' ? E.mix('#15100a', FUSION, top) : '#15100a'),
          });
          E.callout(ctx, gx + 60, gy - 300, 1400, 260, 'le haut s\'abrège', FUSION, top, 'mains + baguettes → quelques traits');
        }
        E.finish(ctx, t);
        return;
      }
      if (vt < 10.7) {
        // page imprimée xylographique
        E.background(ctx, t, '#241a10', '#050302');
        const a = seg(vt, 5.8, 6.2);
        ctx.save(); ctx.globalAlpha = a;
        camera(ctx, lerp(1.0, 1.12, seg(vt, 5.8, 10.7)), 900, 520);
        ctx.fillStyle = '#e4d3ae'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 60;
        ctx.fillRect(360, 90, 1200, 900); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 6; ctx.strokeRect(400, 130, 1120, 820);
        ctx.lineWidth = 2;
        const r = E.rand(31);
        for (let c = 0; c < 12; c++) {
          const x = 1480 - c * 90;
          ctx.beginPath(); ctx.moveTo(x - 45, 130); ctx.lineTo(x - 45, 950); ctx.stroke();
          for (let j = 0; j < 11; j++) {
            if (c === 4 && j === 5) continue;
            ctx.strokeStyle = `rgba(35,20,8,${0.55 + r() * 0.35})`; ctx.lineWidth = 5; ctx.lineCap = 'square';
            const cy = 160 + j * 72 + 26, n = 4 + Math.floor(r() * 5);
            for (let q = 0; q < n; q++) {
              const hz = r() < 0.55, px = x - 24 + r() * 48, py = cy - 24 + r() * 48, l = 14 + r() * 30;
              ctx.beginPath(); ctx.moveTo(clamp(px, x - 26, x + 26), clamp(py, cy - 26, cy + 26));
              ctx.lineTo(clamp(hz ? px + l : px + (r() - 0.5) * 12, x - 26, x + 26), clamp(hz ? py + (r() - 0.5) * 6 : py + l, cy - 26, cy + 26)); ctx.stroke();
            }
          }
        }
        ctx.restore();
        const hx = 1480 - 4 * 90, hy = 160 + 5 * 72 + 26;
        const hl = seg(vt, 6.6, 7.0);
        E.text(ctx, '学', hx, hy, { font: 'Song', weight: 700, size: 64, color: E.mix('#2a1a0c', '#b3261e', hl), alpha: a });
        if (hl > 0) {
          ctx.save(); ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 5; ctx.globalAlpha = hl;
          ctx.beginPath(); ctx.arc(hx, hy, 60 + 20 * (1 - hl), 0, 7); ctx.stroke(); ctx.restore();
          E.drawFontGlyph(ctx, 'kai_xue_simp', { x: 1745, y: 520, size: 250, color: fusionCol, opacity: hl, glow: 20 });
        }
        caption(ctx, 'Livres populaires imprimés · Song (960–1279) et Yuan (1271–1368)', fadeIO(vt, 6.4, 10.7), H - 60, { size: 36 });
        E.finish(ctx, t);
        return;
      }
      if (vt < 15.3) {
        const v = { lon: 126, lat: 36, k: lerp(40, 46, seg(vt, 10.7, 15.3)) };
        E.drawMap(ctx, t, v, { rivers: 1 });
        E.marker(ctx, t, v, E.CITIES.tokyo, 'Japon · 1949', '当用漢字字体表', seg(vt, 11.4, 11.8), '#f4b73f', -1);
        E.marker(ctx, t, v, E.CITIES.beijing, 'Chine · 1956', '汉字简化方案', seg(vt, 12.7, 13.1), '#ef5a3c', -1);
        const q1 = E.proj(v, E.CITIES.tokyo), q2 = E.proj(v, E.CITIES.beijing);
        E.drawFontGlyph(ctx, 'kai_xue_simp', { x: q1[0] + 40, y: q1[1] + 170, size: 200, color: fusionCol, opacity: seg(vt, 11.6, 12.0), glow: 20 });
        E.drawFontGlyph(ctx, 'kai_xue_simp', { x: q2[0] + 60, y: q2[1] + 190, size: 200, color: fusionCol, opacity: seg(vt, 12.9, 13.3), glow: 20 });
        dateSlam(ctx, t, T(8, 10.8), 'XXe SIÈCLE', null, { y: 150, size: 90, ink: true });
        E.finish(ctx, t, { vignette: 0.8 });
        return;
      }
      E.background(ctx, t, '#1d1710', '#040302');
      E.motes(ctx, t, '255,210,150', 0.5);
      E.drawStrokes(ctx, 'xue_simp', { x: gx, y: gy, size: gs, progress: 8 * seg(vt, 15.2, 16.0), color: strokeCol, glow: 26, glowColor: 'rgba(255,150,70,0.5)', tip: true });
      ctx.save(); shake(ctx, vt, [15.72], 12);
      E.text(ctx, '8', 1560, 560, { font: 'Cinzel', weight: 900, size: 260, color: '#f4b73f', alpha: seg(vt, 15.6, 15.8), glow: 30, glowColor: '#f4b73f' });
      E.text(ctx, 'TRAITS', 1560, 730, { font: 'Cinzel', weight: 700, size: 56, color: '#f3e5c6', spacing: 14, alpha: seg(vt, 15.7, 15.9) });
      ctx.restore();
      E.finish(ctx, t);
    },
  });

  // 9. Conclusion : le bandeau des 3000 ans
  S.push({
    k: 9,
    draw(ctx, t) {
      const vt = VT(9, t);
      E.background(ctx, t, '#1b130c', '#030201');
      E.motes(ctx, t, '255,200,130', 0.7);
      const stripA = 1 - seg(vt, 8.6, 9.3);
      if (stripA > 0) {
        const y = 470, x0 = 190, dx = 257, sz = 230;
        const handGone = seg(vt, 0.0, 0.8);
        const topHi = pulse(vt, 2.1, 1.8);
        const cr = Math.max(pulse(vt, 5.1, 2.8));
        FORMS.forEach((f, i) => {
          const a = seg(vt, -0.35 + i * 0.07, -0.1 + i * 0.07) * stripA;
          const x = x0 + i * dx;
          const late = i >= 5;
          const col = (c) => {
            let base = late ? fusionCol(c) : COMP[c].col;
            if (c === 'hand' && !late) base = E.mix(base, '#ffffff', 0.4 * pulse(vt, 0.1, 1.1));
            if ((c === 'hand' || c === 'yao') && late) base = E.mix(base, '#ffffff', 0.4 * topHi);
            if ((c === 'child' || c === 'roof') && i >= 1) base = E.mix(base, '#ffffff', 0.35 * cr);
            return base;
          };
          const alpha = (c) => {
            if (cr > 0.05 && c !== 'child' && c !== 'roof') return 1 - 0.7 * cr;
            if (topHi > 0.05 && !(c === 'hand' || c === 'yao')) return 1 - 0.6 * topHi;
            return 1;
          };
          ctx.save(); ctx.globalAlpha = a;
          drawForm(ctx, f.k, x, y, sz, col, alpha, { glow: 14 });
          E.text(ctx, f.zh, x, y + 170, { font: 'Kai', size: 44, color: '#f4e7c8' });
          E.text(ctx, f.fr, x, y + 222, { size: 30, weight: 700, color: '#d9c7a0' });
          ctx.restore();
        });
        // rubans de composantes sous le bandeau
        const rows = [['hand', 0, 4, COMP.hand.col, 'mains'], ['yao', 0, 4, COMP.yao.col, 'baguettes'], ['roof', 0, 6, COMP.roof.col, 'toit'], ['child', 1, 6, COMP.child.col, 'enfant']];
        rows.forEach(([c, a0, a1, col, lab], j) => {
          const yy = 790 + j * 46;
          const grow = easeOut(seg(vt, -0.2, 0.9));
          const xa = x0 + a0 * dx - 60, xb = x0 + a1 * dx + 60;
          ctx.save(); ctx.globalAlpha = stripA * grow;
          ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(lerp(xa, xb, grow), yy); ctx.stroke();
          if (c === 'hand' || c === 'yao') {
            // fusion en ⺍
            ctx.strokeStyle = FUSION; ctx.beginPath(); ctx.moveTo(xb, yy); ctx.quadraticCurveTo(xb + 90, yy, x0 + 5 * dx - 40, 813); ctx.lineTo(x0 + 6 * dx + 60, 813); ctx.stroke();
          }
          ctx.restore();
          E.text(ctx, lab, xa - 20, yy, { size: 28, weight: 700, align: 'right', color: col, alpha: stripA * grow });
        });
        E.text(ctx, '⺍', x0 + 5.5 * dx, 760, { font: 'Kai', size: 50, color: FUSION, alpha: stripA * seg(vt, 2.0, 2.4) });
        E.text(ctx, 'LES MAINS SE SONT EFFACÉES', W / 2, 140, { font: 'Cinzel', weight: 700, size: 48, color: COMP.hand.col, spacing: 6, alpha: fadeIO(vt, 0.0, 2.0, 0.3, 0.3) });
        E.text(ctx, '𦥑 + 爻  →  ⺍', W / 2, 140, { font: 'Kai', size: 70, color: FUSION, alpha: fadeIO(vt, 2.1, 4.9, 0.3, 0.3) });
        E.text(ctx, "L'ENFANT, TOUJOURS SOUS LE TOIT", W / 2, 140, { font: 'Cinzel', weight: 700, size: 48, color: COMP.child.col, spacing: 6, alpha: fadeIO(vt, 5.1, 8.6, 0.3, 0.3) });
      }
      // image finale
      const aF = seg(vt, 8.9, 9.6);
      if (aF > 0) {
        E.inkBlot(ctx, W / 2, 470, 360, seg(vt, 8.9, 9.5), 12, 'rgba(0,0,0,0.6)');
        ctx.save(); camera(ctx, lerp(0.9, 1.04, seg(vt, 8.9, 14.5)), W / 2, 470);
        E.drawFontGlyph(ctx, 'kai_xue_simp', { x: W / 2, y: 470, size: 640, color: fusionCol, opacity: aF, glow: 50, glowColor: 'rgba(255,140,60,0.6)' });
        ctx.restore();
        const line = ['apprendre,', "c'est", 'recevoir', 'ce', 'que', "d'autres", 'mains', 'transmettent'];
        const starts = [10.0, 10.5, 10.8, 11.3, 11.45, 11.6, 12.2, 12.6];
        ctx.save(); ctx.font = '600 58px Cormorant';
        const widths = line.map((w) => ctx.measureText(w + ' ').width);
        ctx.restore();
        let x = W / 2 - widths.reduce((a, b) => a + b, 0) / 2;
        line.forEach((w, i) => {
          const u = seg(vt, starts[i], starts[i] + 0.35);
          E.text(ctx, w, x, 930 - 12 * (1 - easeOut(u)), { size: 58, weight: 600, align: 'left', color: w === 'mains' ? COMP.hand.col : '#f6e9cf', alpha: u, glow: 12 });
          x += widths[i];
        });
      }
      E.finish(ctx, t);
    },
  });

  // 10. Carte de fin
  S.push({
    k: 10,
    draw(ctx, t) {
      const vt = VT(10, t);
      E.background(ctx, t, '#1b130c', '#030201');
      E.motes(ctx, t, '255,200,130', 0.8);
      E.drawFontGlyph(ctx, 'kai_xue_simp', { x: 480, y: 500, size: 520, color: fusionCol, glow: 40, glowColor: 'rgba(255,140,60,0.5)' });
      E.text(ctx, 'Et vous ?', 1300, 330, { font: 'Cinzel', weight: 700, size: 80, color: '#f6e7c6', alpha: seg(vt, 0.0, 0.3) });
      E.text(ctx, 'Quel caractère voulez-vous', 1300, 450, { size: 56, weight: 600, color: '#f3e5c6', alpha: seg(vt, 0.3, 0.6) });
      E.text(ctx, 'voir renaître ?', 1300, 520, { size: 56, weight: 600, color: '#f3e5c6', alpha: seg(vt, 0.3, 0.6) });
      const b = seg(vt, 2.3, 2.6);
      if (b > 0) {
        ctx.save(); ctx.globalAlpha = b; ctx.translate(1300, 660); ctx.scale(backOut(b), backOut(b));
        ctx.fillStyle = '#b3261e'; E.roundRect(ctx, -250, -46, 500, 92, 46); ctx.fill();
        ctx.restore();
        E.text(ctx, 'DITES-LE EN COMMENTAIRE', 1300, 662, { font: 'Cinzel', weight: 700, size: 30, color: '#fff', alpha: b, spacing: 3 });
      }
      E.text(ctx, "LA VOIE DE L'ENCRE", 1300, 860, { font: 'Cinzel', weight: 900, size: 54, color: '#f4b73f', spacing: 10, alpha: seg(vt, 0.8, 1.2) });
      // sceau rouge 墨道
      const s = seg(vt, 1.2, 1.4);
      if (s > 0) {
        ctx.save(); ctx.translate(1300, 960); ctx.scale(lerp(1.6, 1, easeOut(s)), lerp(1.6, 1, easeOut(s))); ctx.globalAlpha = s;
        ctx.fillStyle = '#b3261e'; ctx.fillRect(-70, -45, 140, 90); ctx.restore();
        E.text(ctx, '墨道', 1300, 962, { font: 'Kai', size: 58, color: '#f7e9d0', alpha: s });
      }
      E.finish(ctx, t);
      ctx.fillStyle = `rgba(0,0,0,${seg(t, TL.total - 1.0, TL.total)})`; ctx.fillRect(0, 0, W, H);
    },
  });

  // ─────────────────────────── orchestration
  const bounds = S.map((s, i) => [i === 0 ? 0 : V(s.k) - 0.35, i === S.length - 1 ? TL.total : V(S[i + 1].k) - 0.35]);
  window.SCENE_BOUNDS = bounds;

  // repères sonores (percussions, souffles) pour la bande-son
  window.CUES = [
    ['boom', 0.1], ['low', T(1, 0.6)], ['riser', T(1, HOOK.gone - 0.6)], ['whoosh', T(1, HOOK.gone)],
    ...Array.from({ length: 7 }, (_, i) => ['tick', T(1, HOOK.years) + i * (HOOK.one + 0.35 - HOOK.years) / 7]), ['hit', T(1, HOOK.one + 0.35)], ['boom', T(1, HOOK.learn)],
    ['whoosh', V(2) - 0.35], ['hit', V(2)], ['whoosh', T(2, 4.8)], ['crack', T(2, 5.6)], ['crack', T(2, 6.3)], ['crack', T(2, 7.0)], ['whoosh', T(2, 8.0)],
    ['chime', T(2, 12.6)], ['chime', T(2, 16.5)], ['chime', T(2, 19.5)],
    ['whoosh', V(3) - 0.35], ['hit', T(3, 0.3)], ['whoosh', T(3, 2.8)], ['metal', T(3, 3.0)], ['whoosh', T(3, 5.5)], ['boom', T(3, 7.7)],
    ['chime', T(3, 10.5)], ['chime', T(3, 11.9)], ['chime', T(3, 13.0)], ['whoosh', T(3, 14.0)],
    ...LAVIS.releases(14.3, 22.4).map((v) => ['arrow', T(3, v)]),
    ['boom', V(4)], ['hit', T(4, 1.2)], ['riser', T(4, 4.0)], ['whoosh', T(4, 5.4)], ['boom', T(4, 8.6)], ['chime', T(4, 10.8)],
    ['whoosh', V(5) - 0.35], ['chime', T(5, 5.7)], ['low', T(5, 7.6)],
    ['whoosh', V(6) - 0.35], ['whoosh', T(6, 2.6)], ['hit', T(6, 6.0)], ['hit', T(6, 8.8)],
    ['whoosh', V(7) - 0.35], ['hit', T(7, 3.66)],
    ['hit', T(8, 0.0)], ['hit', T(8, 0.7)], ['whoosh', T(8, 2.2)], ['whoosh', T(8, 5.8)], ['chime', T(8, 6.6)], ['whoosh', T(8, 10.7)], ['hit', T(8, 11.4)], ['hit', T(8, 12.7)], ['whoosh', T(8, 15.3)], ['boom', T(8, 15.72)],
    ['whoosh', V(9) - 0.35], ['chime', T(9, 2.1)], ['chime', T(9, 5.1)], ['riser', T(9, 7.4)], ['boom', T(9, 8.9)],
    ['whoosh', V(10) - 0.35], ['hit', T(10, 1.2)], ['chime', T(10, 2.3)],
  ];

  // accès pour la version Remotion
  window.ANCHOR = T;
  window.VTIME = VT;
  window.PROPS = { plastron, ding };

  window.renderFrame = function (t) {
    const ctx = window.CTX;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    let i = bounds.findIndex(([a, b]) => t >= a && t < b);
    if (i < 0) i = S.length - 1;
    const [a] = bounds[i];
    ctx.save();
    // coup de zoom à l'entrée de chaque scène
    const u = seg(t, a, a + 0.5);
    if (i > 0 && u < 1) camera(ctx, lerp(1.06, 1, easeOut(u)));
    S[i].draw(ctx, t);
    ctx.restore();
    if (i > 0) {
      const f = 1 - seg(t, a, a + 0.4);
      if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
    }
    const fin = seg(t, 0, 0.4);
    if (fin < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fin})`; ctx.fillRect(0, 0, W, H); }
  };
})();
