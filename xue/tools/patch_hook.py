"""Remplace la scène 1 (accroche) de src/scenes.js par la nouvelle version « les mains disparues »."""
p = 'src/scenes.js'
s = open(p).read()
a = s.index('  // 1. Accroche')
b = s.index('  // 2. Os oraculaires')
NEW = r"""  // 1. Accroche : « Ce caractère cache deux mains… que plus personne ne voit. »
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

"""
s = s[:a] + NEW + s[b:]
# repères sonores de l'accroche
old_cues = s[s.index("    ['boom', 0.1], ['riser', T(1, 1.2)]"):s.index("    ['whoosh', V(2) - 0.35]")]
s = s.replace(old_cues, """    ['boom', 0.1], ['low', T(1, 0.6)], ['riser', T(1, HOOK.gone - 0.6)], ['whoosh', T(1, HOOK.gone)],
    ...Array.from({ length: 7 }, (_, i) => ['tick', T(1, HOOK.years) + i * (HOOK.one + 0.35 - HOOK.years) / 7]), ['hit', T(1, HOOK.one + 0.35)], ['boom', T(1, HOOK.learn)],
""")
open(p, 'w').write(s)
print('ok')
