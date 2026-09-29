"""Remplace les formes reconstituées par les glyphes réels (REALGLYPHS) dans src/scenes.js."""
p = 'src/scenes.js'
s = open(p).read()


def rep(old, new):
    global s
    assert old in s, old[:80]
    s = s.replace(old, new)


# bandeau / montage : formes réelles (+ cursive d'après la police Liu Jian Mao Cao)
rep("{ k: 'oracle', zh: '甲骨文', fr: 'Shang' }", "{ k: 'real:jiaguwen', zh: '甲骨文', fr: 'Shang' }")
rep("{ k: 'bronze', zh: '金文', fr: 'Zhou' }", "{ k: 'real:jinwen', zh: '金文', fr: 'Zhou' }")
rep("{ k: 'seal', zh: '小篆', fr: 'Qin' }", "{ k: 'real:xiaozhuan', zh: '小篆', fr: 'Qin' }")
rep("{ k: 'cursive', zh: '草書', fr: 'cursive' }", "{ k: 'font:cao_xue_simp', zh: '草書', fr: 'cursive' }")
rep("""    if (key.startsWith('font:')) {
      E.drawFontGlyph(ctx, key.slice(5), { x, y, size, color, alpha, ...extra });""",
    """    if (key.startsWith('real:')) {
      E.drawRealGlyph(ctx, key.slice(5), { x, y, size, color, alpha, ...extra });
    } else if (key.startsWith('font:')) {
      E.drawFontGlyph(ctx, key.slice(5), { x, y, size, color, alpha, ...extra });""")

# scène 2 : le vrai jiaguwen gravé sur l'os
rep("""        E.drawGlyph(ctx, P.oracle, {
          x: gx, y: gy, size: gs, alpha: () => a,
          compProgress: { yao: seg(vt, 10.0, 11.6), roof: seg(vt, 15.6, 16.7), hand: seg(vt, 17.9, 19.5), child: 0 },
          color: (c) => E.mix(BONE_INK, COMP[c].col, known[c]),
          glow: 24, glowColor: (c) => E.rgba(COMP[c].col, 0.3 + 0.7 * (hi[c] || 0)),
          carve: true, tip: true,
        });
        const yc = [gx - gs / 2 + 585 * gs / 1000, gy - gs / 2 + 180 * gs / 1000];
        E.callout(ctx, yc[0], yc[1], 1300, 250, '爻 yáo', COMP.yao.col, seg(vt, 12.6, 13.0), seg(vt, 13.8, 14.1) > 0 ? 'baguettes à compter' : null);
        const rc = [gx - gs / 2 + 788 * gs / 1000, gy - gs / 2 + 740 * gs / 1000];
        E.callout(ctx, rc[0], rc[1], 1300, 760, '冖 toit', COMP.roof.col, seg(vt, 16.5, 16.9), 'un bâtiment');
        const hc = [gx - gs / 2 + 300 * gs / 1000, gy - gs / 2 + 250 * gs / 1000];
        E.callout(ctx, hc[0], hc[1], 200, 520, '𦥑', COMP.hand.col, seg(vt, 19.5, 19.9), 'deux mains');""",
    """        const rg = { x: gx, y: gy, size: gs };
        const hiAll = Math.max(hi.yao, hi.roof, hi.hand);
        E.drawRealGlyph(ctx, 'jiaguwen', {
          ...rg, opacity: a, carve: true,
          reveal: (c) => easeInOut(c === 'yao' ? seg(vt, 10.0, 11.6) : c === 'roof' ? seg(vt, 15.6, 16.7) : seg(vt, 17.9, 19.5)),
          color: (c) => E.mix(E.mix(BONE_INK, COMP[c].col, known[c]), '#ffffff', 0.3 * (hi[c] || 0)),
          glow: 10 + 20 * hiAll, glowColor: 'rgba(255,190,110,0.45)',
        });
        const yc = E.realCenter('jiaguwen', 'yao', rg);
        E.callout(ctx, yc[0] + 40, yc[1], 1300, 250, '爻 yáo', COMP.yao.col, seg(vt, 12.6, 13.0), seg(vt, 13.8, 14.1) > 0 ? 'baguettes croisées' : null);
        const rc = E.realCenter('jiaguwen', 'roof', rg);
        E.callout(ctx, rc[0] + 150, rc[1] + 60, 1300, 760, '冖 toit', COMP.roof.col, seg(vt, 16.5, 16.9), 'un bâtiment');
        const hc = E.realCenter('jiaguwen', 'hand', rg);
        E.callout(ctx, hc[0] - 150, hc[1] - 40, 200, 520, '𦥑', COMP.hand.col, seg(vt, 19.5, 19.9), 'deux mains');
        E.text(ctx, 'Jiaguwen de 學 — d\\'après zdic.net', gx, gy + gs / 2 + 40, { size: 24, weight: 500, color: '#cdbb98', alpha: a * 0.8 });""")

# scène 3 : du jiaguwen au vrai jinwen, l'enfant apparaît sous le toit
rep("""          const m = easeInOut(seg(vt, 5.5, 6.9));
          const G = E.morph(P.oracle, P.bronze, m);
          const hi = { hand: pulse(vt, 10.5, 1.2), roof: pulse(vt, 11.9, 1.0), child: Math.max(pulse(vt, 7.7, 1.4), pulse(vt, 13.0, 1.0)) };
          const gx = 800, gy = 530, gs = 800;
          ctx.save(); ctx.globalAlpha = aG;
          E.drawGlyph(ctx, G, {
            x: gx, y: gy, size: gs,
            compProgress: { yao: 1, roof: 1, hand: 1, child: seg(vt, 6.9, 8.2) },
            color: (c) => E.mix(COMP[c].col, '#ffffff', 0.35 * (hi[c] || 0)),
            glow: 20, glowColor: (c) => E.rgba(COMP[c].col, 0.25 + 0.75 * (hi[c] || 0)), tip: true,
          });
          ctx.restore();
          E.legend(ctx, aG, { hand: 1, yao: 1, roof: 1, child: seg(vt, 7.7, 8.1) }, hi);
          const cc = E.compCenter(P.bronze, 'child');
          E.callout(ctx, gx - gs / 2 + cc[0] * gs / 1000 - 40, gy - gs / 2 + cc[1] * gs / 1000, 300, 820,""",
    """          const m = easeInOut(seg(vt, 5.5, 6.9));
          const hi = { hand: pulse(vt, 10.5, 1.2), roof: pulse(vt, 11.9, 1.0), child: Math.max(pulse(vt, 7.7, 1.4), pulse(vt, 13.0, 1.0)) };
          const gx = 800, gy = 530, gs = 800;
          const rg = { x: gx, y: gy, size: gs };
          ctx.save(); ctx.globalAlpha = aG;
          if (m < 1) E.drawRealGlyph(ctx, 'jiaguwen', { ...rg, opacity: 1 - m, color: (c) => COMP[c].col, glow: 16 });
          E.drawRealGlyph(ctx, 'jinwen', {
            ...rg, opacity: m,
            reveal: (c) => (c === 'child' ? easeOut(seg(vt, 6.9, 8.2)) : 1),
            color: (c) => E.mix(COMP[c].col, '#ffffff', 0.35 * (hi[c] || 0)),
            glow: 16 + 24 * Math.max(hi.hand, hi.roof, hi.child), glowColor: 'rgba(255,220,170,0.5)',
          });
          ctx.restore();
          E.legend(ctx, aG, { hand: 1, yao: 1, roof: 1, child: seg(vt, 7.7, 8.1) }, hi);
          const cc = E.realCenter('jinwen', 'child', rg);
          E.callout(ctx, cc[0] - 60, cc[1] + 20, 300, 820,""")

# scène 4 : variantes réelles (Royaumes combattants, bronze) qui convergent vers le petit sceau
rep("""        const u = easeInOut(seg(vt, 6.0, 8.6));
        const r = E.rand(9);
        const pos = [[330, 330], [1590, 330], [330, 800], [1590, 800], [960, 250]];
        pos.forEach(([px, py], i) => {
          const jit = { style: 'seal', strokes: P.bronze.strokes.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [x + (r() - 0.5) * 50 + Math.sin(y / 90 + i) * 30, y + (r() - 0.5) * 40]) })) };
          const G = E.morph(jit, P.seal, u);
          E.drawGlyph(ctx, G, { x: lerp(px, W / 2, u), y: lerp(py, 560, u), size: lerp(300, 620, u), color: () => E.mix('#9b8c75', '#f3e5c6', u), alpha: () => lerp(0.8, 1 / (1 + i * 0.8), u) * seg(vt, 5.4, 5.9) });
        });""",
    """        const u = easeInOut(seg(vt, 6.2, 8.4));
        const a0 = seg(vt, 5.4, 5.9);
        const ivory = () => '#e9dcc3';
        // avant Qin : chaque royaume écrit à sa façon
        [['real:zhanguo', 480, '戰國文字', 'Royaumes combattants'], ['real:jinwen', 1440, '金文', 'bronzes Zhou']].forEach(([k, px, zh, fr]) => {
          const x = lerp(px, W / 2, u), sz = lerp(440, 620, u), al = a0 * (1 - smooth(seg(vt, 7.6, 8.5)));
          drawForm(ctx, k, x, 560, sz, ivory, () => 1, { opacity: al * 0.9, glow: 10 });
          E.text(ctx, zh, x, 850, { font: 'Kai', size: 44, color: '#f4e7c8', alpha: al * (1 - u) });
          E.text(ctx, fr, x, 905, { size: 30, weight: 600, color: '#d9c7a0', alpha: al * (1 - u) });
        });
        const sa = seg(vt, 7.8, 8.6);
        if (sa > 0) E.drawRealGlyph(ctx, 'xiaozhuan', { x: W / 2, y: 560, size: 620, color: ivory, opacity: sa, glow: 24 });""")
rep("""      E.drawGlyph(ctx, P.seal, {
        x: gx, y: gy, size: gs, color: (c) => E.mix(COMP[c].col, '#ffffff', 0.3 * mirrorPulse),
        glow: 18 + 30 * mirrorPulse, glowColor: (c) => COMP[c].col,
      });""",
    """      E.drawRealGlyph(ctx, 'xiaozhuan', {
        x: gx, y: gy, size: gs, color: (c) => E.mix(COMP[c].col, '#ffffff', 0.3 * mirrorPulse),
        glow: 18 + 30 * mirrorPulse, glowColor: 'rgba(255,210,160,0.55)',
      });""")

# scène 5 : le vrai petit sceau, toit dans l'ombre
rep("""      E.drawGlyph(ctx, P.seal, {
        x: 470, y: 560, size: 560,
        color: (c) => (c === 'roof' ? E.mix(COMP.roof.col, '#ffffff', 0.4 * pulse(vt, 7.6, 1.2)) : E.mix(COMP[c].col, '#555', 0.7 * veil * (c === 'child' ? 1 : 0.3))),
        glow: 20, glowColor: (c) => COMP[c].col,
      });""",
    """      E.drawRealGlyph(ctx, 'xiaozhuan', {
        x: 470, y: 560, size: 560,
        color: (c) => (c === 'roof' ? E.mix(COMP.roof.col, '#ffffff', 0.4 * pulse(vt, 7.6, 1.2)) : E.mix(COMP[c].col, '#555555', 0.7 * veil * (c === 'child' ? 1 : 0.3))),
        glow: 20, glowColor: 'rgba(255,210,160,0.45)',
      });""")

# scène 6 : du petit sceau réel à l'écriture des clercs (tracé reconstitué, pas de source fournie)
rep("""      const m = easeInOut(seg(vt, 2.6, 4.3));
      const G = E.morph(P.seal, P.clerical, m);
      const gx = 800, gy = 540, gs = 820;""",
    """      const m = easeInOut(seg(vt, 2.6, 4.3));
      const G = P.clerical;
      const gx = 800, gy = 540, gs = 820;
      if (m < 1) E.drawRealGlyph(ctx, 'xiaozhuan', { x: gx, y: gy, size: gs, color: (c) => COMP[c].col, opacity: 1 - m, glow: 16 });""")
rep("""      E.drawGlyph(ctx, G, {
        x: gx, y: gy, size: gs,
        color: (c) => (c === 'hand' ? E.mix(E.mix(COMP.hand.col, '#ffffff', 0.35 * handHi), '#6b6560', fade) : COMP[c].col),""",
    """      E.drawGlyph(ctx, G, {
        x: gx, y: gy, size: gs, alpha: () => m,
        color: (c) => (c === 'hand' ? E.mix(E.mix(COMP.hand.col, '#ffffff', 0.35 * handHi), '#6b6560', fade) : COMP[c].col),""")

# scène 8 : la cursive d'après la police Liu Jian Mao Cao
rep("""          E.drawGlyph(ctx, P.cursive, {
            x: gx, y: gy, size: gs * 0.95, progress: easeInOut(seg(vt, 2.3, 4.2)), order: ['hand', 'yao', 'roof', 'child'],
            color: (c) => (c === 'hand' || c === 'yao' ? E.mix('#15100a', FUSION, top) : '#15100a'), tip: true,
          });
          E.callout(ctx, gx + 50, gy - 250, 1400, 260, '3 traits', FUSION, top, 'abrègent tout le haut 𦥯');""",
    """          const order = { hand: [2.3, 2.8], yao: [2.6, 3.2], roof: [3.0, 3.5], child: [3.3, 4.2] };
          E.drawFontGlyph(ctx, 'cao_xue_simp', {
            x: gx, y: gy, size: gs * 0.92, reveal: (c) => easeInOut(seg(vt, order[c][0], order[c][1])),
            color: (c) => (c === 'hand' || c === 'yao' ? E.mix('#15100a', FUSION, top) : '#15100a'),
          });
          E.callout(ctx, gx + 60, gy - 300, 1400, 260, 'le haut s\\'abrège', FUSION, top, 'mains + baguettes → quelques traits');""")

open(p, 'w').write(s)
print('ok')
