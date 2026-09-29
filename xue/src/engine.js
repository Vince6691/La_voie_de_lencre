// Moteur de rendu : utilitaires, traits au pinceau, métamorphoses de glyphes, cartes, décors.
(function () {
  const W = 1920, H = 1080;
  const E = {};
  E.W = W; E.H = H;

  // ───────── maths
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = (u) => u * u * (3 - 2 * u);
  const easeOut = (u) => 1 - Math.pow(1 - u, 3);
  const easeIn = (u) => u * u * u;
  const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const backOut = (u) => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
  const pulse = (t, a, d = 0.6) => { const u = (t - a) / d; return u < 0 || u > 1 ? 0 : Math.sin(Math.PI * u); };
  Object.assign(E, { clamp, lerp, seg, smooth, easeOut, easeIn, easeInOut, backOut, pulse });

  E.rand = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ───────── couleurs des composantes
  E.COMP = {
    hand: { col: '#ef5a3c', zh: '𦥑', fr: 'deux mains' },
    yao: { col: '#f4b73f', zh: '爻', fr: 'baguettes à compter' },
    roof: { col: '#3fc1b0', zh: '冖', fr: 'toit, bâtiment' },
    child: { col: '#8cb8ff', zh: '子', fr: 'enfant' },
  };
  E.hex = (h) => {
    if (h.startsWith('rgb')) return h.match(/[\d.]+/g).slice(0, 3).map(Number);
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  };
  E.mix = (h1, h2, u) => {
    const a = E.hex(h1), b = E.hex(h2);
    return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], clamp(u)))).join(',')})`;
  };
  E.rgba = (h, a) => { const c = E.hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

  // ───────── géométrie des traits
  function catmull(pts, n) {
    if (pts.length === 2) {
      const out = [];
      for (let i = 0; i < n; i++) { const u = i / (n - 1); out.push([lerp(pts[0][0], pts[1][0], u), lerp(pts[0][1], pts[1][1], u)]); }
      return out;
    }
    // échantillonnage dense puis ré-échantillonnage à pas constant
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < 24; k++) {
        const t = k / 24, t2 = t * t, t3 = t2 * t;
        dense.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    dense.push(pts[pts.length - 1]);
    return resample(dense, n);
  }
  function polyline(pts, n) {
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 16; k++) { const u = k / 16; dense.push([lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)]); }
    dense.push(pts[pts.length - 1]);
    return resample(dense, n);
  }
  function resample(dense, n) {
    const L = [0];
    for (let i = 1; i < dense.length; i++) L.push(L[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const tot = L[L.length - 1] || 1, out = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
      const target = (tot * i) / (n - 1);
      while (j < L.length - 2 && L[j + 1] < target) j++;
      const u = (target - L[j]) / (L[j + 1] - L[j] || 1);
      out.push([lerp(dense[j][0], dense[j + 1][0], u), lerp(dense[j][1], dense[j + 1][1], u)]);
    }
    return out;
  }

  const N = 48;
  const STYLE = {
    carve: { w: 17, width: (u) => (u < 0.1 ? 0.35 + 0.65 * u / 0.1 : u > 0.9 ? 0.35 + 0.65 * (1 - u) / 0.1 : 1), caps: false },
    cast: { w: 44, width: (u) => 0.88 + 0.12 * Math.sin(Math.PI * u), caps: true },
    seal: { w: 30, width: () => 1, caps: true },
    clerical: { w: 32, width: () => 1, caps: false },
    brush: { w: 44, width: (u) => Math.pow(Math.sin(Math.PI * clamp(0.06 + u * 0.94)), 0.55) * (1 - 0.35 * u) + 0.08, caps: false },
  };

  // Prépare un glyphe : chaque trait devient N points + N largeurs.
  E.prepare = function (g) {
    const st = STYLE[g.style];
    return {
      style: g.style,
      strokes: g.strokes.map((s) => {
        const pts = s.sharp ? polyline(s.pts, N) : catmull(s.pts, N);
        const ws = pts.map((_, i) => {
          const u = i / (N - 1);
          let w = st.w * st.width(u) * (s.w || 1);
          if (g.style === 'clerical') {
            if (s.h) w *= 1 + 0.45 * Math.exp(-u * 14); // tête de ver à soie
            if (s.flare) w *= (0.85 + 1.4 * smooth(seg(u, 0.55, 0.88)) + 0.4 * Math.exp(-u * 12)) * (u > 0.88 ? 1 - smooth((u - 0.88) / 0.12) * 0.88 : 1);
            else w *= u > 0.92 ? 1 - (u - 0.92) / 0.08 * 0.35 : 1;
          }
          return w;
        });
        return { c: s.c, pts, ws, caps: st.caps, closed: !!s.closed, fill: s.fill || 0, a: 1 };
      }),
    };
  };

  // Interpolation entre deux glyphes préparés (u=0 → A, u=1 → B)
  E.morph = function (A, B, u) {
    if (u <= 0) return A; if (u >= 1) return B;
    const out = { style: A.style, strokes: [] };
    for (const c of ['roof', 'child', 'yao', 'hand']) {
      const a = A.strokes.filter((s) => s.c === c), b = B.strokes.filter((s) => s.c === c);
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n; i++) {
        const sa = a[i], sb = b[i];
        if (sa && sb) {
          out.strokes.push({
            c, caps: u < 0.5 ? sa.caps : sb.caps, closed: sa.closed && sb.closed, fill: lerp(sa.fill || 0, sb.fill || 0, u), a: 1,
            pts: sa.pts.map((p, k) => [lerp(p[0], sb.pts[k][0], u), lerp(p[1], sb.pts[k][1], u)]),
            ws: sa.ws.map((w, k) => lerp(w, sb.ws[k], u)),
          });
        } else if (sa) {
          // le trait disparaît en se rétractant vers le trait correspondant le plus proche
          const tgt = b[b.length - 1];
          out.strokes.push({ ...sa, a: 1 - smooth(u), pts: tgt ? sa.pts.map((p, k) => [lerp(p[0], tgt.pts[k][0], u), lerp(p[1], tgt.pts[k][1], u)]) : sa.pts });
        } else {
          const src = a[a.length - 1];
          out.strokes.push({ ...sb, a: smooth(u), pts: src ? sb.pts.map((p, k) => [lerp(src.pts[k][0], p[0], u), lerp(src.pts[k][1], p[1], u)]) : sb.pts });
        }
      }
    }
    return out;
  };

  // Trace un trait à largeur variable, jusqu'à la fraction p de sa longueur.
  function strokePath(ctx, s, p, scale) {
    const n = s.pts.length;
    const m = Math.max(2, Math.round(1 + p * (n - 1)));
    if (p <= 0) return false;
    const L = [], R = [];
    for (let i = 0; i < m; i++) {
      const a = s.closed && i === 0 ? s.pts[n - 2] : s.pts[Math.max(0, i - 1)];
      const b = s.closed && i === n - 1 ? s.pts[1] : s.pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const w = (s.ws[i] * scale) / 2;
      L.push([s.pts[i][0] + -dy * w, s.pts[i][1] + dx * w]);
      R.push([s.pts[i][0] - -dy * w, s.pts[i][1] - dx * w]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < m; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = m - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    if (s.caps) {
      const e = s.pts[m - 1];
      ctx.moveTo(s.pts[0][0] + (s.ws[0] * scale) / 2, s.pts[0][1]);
      ctx.arc(s.pts[0][0], s.pts[0][1], (s.ws[0] * scale) / 2, 0, Math.PI * 2);
      ctx.moveTo(e[0] + (s.ws[m - 1] * scale) / 2, e[1]);
      ctx.arc(e[0], e[1], (s.ws[m - 1] * scale) / 2, 0, Math.PI * 2);
    }
    return true;
  }

  // Dessine un glyphe préparé.
  // o : x, y (centre), size (px pour la boîte 1000), progress (0..1 ordre des traits), color(c)→css,
  //     alpha(c)→0..1, glow, carve (effet gravé), order (liste de composantes pour l'ordre de tracé), wscale
  E.drawGlyph = function (ctx, G, o) {
    const k = o.size / 1000;
    ctx.save();
    ctx.translate(o.x - o.size / 2, o.y - o.size / 2);
    ctx.scale(k, k);
    const order = o.order || ['yao', 'roof', 'child', 'hand'];
    const list = [...G.strokes].sort((a, b) => order.indexOf(a.c) - order.indexOf(b.c));
    const total = list.length;
    const prog = o.progress === undefined ? 1 : o.progress;
    const perComp = o.compProgress; // optionnel : {c: 0..1}
    list.forEach((s, i) => {
      let p;
      if (perComp) {
        const cs = list.filter((q) => q.c === s.c), j = cs.indexOf(s);
        p = clamp((perComp[s.c] ?? 1) * cs.length - j);
      } else p = clamp(prog * total - i);
      const a = s.a * (o.alpha ? o.alpha(s.c) : 1);
      if (p <= 0 || a <= 0.001) return;
      const col = o.color(s.c);
      const ws = o.wscale || 1;
      if (o.glow) {
        ctx.save(); ctx.shadowColor = o.glowColor ? o.glowColor(s.c) : col; ctx.shadowBlur = o.glow / k;
      }
      if (o.carve) {
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = 'rgba(255,245,220,0.8)';
        ctx.save(); ctx.translate(3, 4);
        if (strokePath(ctx, s, p, ws)) ctx.fill('nonzero');
        ctx.restore();
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      if (s.fill && p >= 1) { ctx.beginPath(); s.pts.forEach((q, j) => (j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.globalAlpha = a * s.fill; ctx.fill(); ctx.globalAlpha = a; }
      if (strokePath(ctx, s, p, ws)) ctx.fill('nonzero');
      if (o.glow) ctx.restore();
      // pointe de pinceau lumineuse pendant le tracé
      if (o.tip && p > 0 && p < 1) {
        const n = s.pts.length, e = s.pts[Math.max(0, Math.round(p * (n - 1)))];
        ctx.save(); ctx.globalAlpha = 0.9 * a;
        const g = ctx.createRadialGradient(e[0], e[1], 0, e[0], e[1], 70);
        g.addColorStop(0, 'rgba(255,240,200,0.95)'); g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e[0], e[1], 70, 0, 7); ctx.fill(); ctx.restore();
      }
    });
    ctx.restore();
  };

  // Centre (boîte 1000) d'une composante d'un glyphe préparé
  E.compCenter = function (G, c) {
    let x = 0, y = 0, n = 0;
    G.strokes.filter((s) => s.c === c).forEach((s) => s.pts.forEach((p) => { x += p[0]; y += p[1]; n++; }));
    return n ? [x / n, y / n] : [500, 500];
  };

  // ───────── glyphes issus des polices (kaishu 學 / 学) colorés par régions
  const fontCache = {};
  const off = document.createElement('canvas'); off.width = off.height = 1000;
  const octx = off.getContext('2d');
  E.drawFontGlyph = function (ctx, key, o) {
    if (!fontCache[key]) fontCache[key] = window.FONTGLYPHS[key].map((c) => new Path2D(c.d));
    const paths = fontCache[key];
    const regions = window.FONT_REGIONS[key];
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, 1000, 1000);
    const drawAll = () => { octx.beginPath(); paths.forEach((p) => octx.fill(p, 'nonzero')); };
    const order = [...window.FONT_REGION_ORDER].reverse();
    for (const c of order) {
      const a = o.alpha ? o.alpha(c) : 1;
      const rv = o.reveal ? o.reveal(c) : 1; // 0..1 balayage vertical
      octx.save();
      octx.beginPath();
      const r = regions && regions[c];
      if (r) { octx.moveTo(r[0][0], r[0][1]); r.forEach((p) => octx.lineTo(p[0], p[1])); octx.closePath(); }
      else octx.rect(0, 0, 1000, 1000);
      octx.clip();
      // on efface d'abord la zone pour que les priorités écrasent proprement
      octx.globalCompositeOperation = 'destination-out';
      paths.forEach((p) => octx.fill(p));
      octx.globalCompositeOperation = 'source-over';
      if (rv > 0 && a > 0) {
        octx.beginPath(); octx.rect(0, 0, 1000, 1000 * rv + 1); octx.clip();
        octx.globalAlpha = a;
        octx.fillStyle = o.color(c);
        paths.forEach((p) => octx.fill(p));
      }
      octx.restore();
    }
    ctx.save();
    if (o.glow) { ctx.shadowColor = o.glowColor || 'rgba(255,200,120,0.6)'; ctx.shadowBlur = o.glow; }
    ctx.globalAlpha = o.opacity ?? 1;
    ctx.drawImage(off, o.x - o.size / 2, o.y - o.size / 2, o.size, o.size);
    ctx.restore();
  };

  // ───────── texte
  E.text = function (ctx, str, x, y, o = {}) {
    ctx.save();
    ctx.font = `${o.weight || 400} ${o.size || 40}px ${o.font || 'Cormorant'}, Kai, Song`;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.spacing) ctx.letterSpacing = o.spacing + 'px';
    if (o.glow) { ctx.shadowColor = o.glowColor || 'rgba(0,0,0,0.9)'; ctx.shadowBlur = o.glow; }
    if (o.stroke) { ctx.lineWidth = o.stroke; ctx.strokeStyle = o.strokeColor || '#000'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || '#f1e6cf';
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  // Titre d'époque (bandeau en haut à gauche)
  E.eraTag = function (ctx, t, zh, name, dates, a) {
    if (a <= 0) return;
    const x = 90, y = 92, u = easeOut(a);
    ctx.save();
    ctx.globalAlpha = u;
    ctx.translate(-40 * (1 - u), 0);
    ctx.fillStyle = 'rgba(10,6,4,0.55)';
    roundRect(ctx, x - 30, y - 56, 620, 132, 10); ctx.fill();
    ctx.fillStyle = '#b8322a';
    ctx.fillRect(x - 30, y - 56, 8, 132);
    E.text(ctx, zh, x + 8, y - 4, { font: 'Kai', size: 64, align: 'left', color: '#f4e7c8' });
    E.text(ctx, name.toUpperCase(), x + 8 + zh.length * 66 + 22, y - 18, { font: 'Cinzel', weight: 700, size: 30, align: 'left', color: '#f4b73f', spacing: 3 });
    E.text(ctx, dates, x + 8 + zh.length * 66 + 22, y + 24, { font: 'Cormorant', weight: 600, size: 30, align: 'left', color: '#e8dcc2' });
    ctx.restore();
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  E.roundRect = roundRect;

  // Légende des composantes (à droite)
  E.legend = function (ctx, a, show, hi = {}) {
    if (a <= 0) return;
    const x = 1500, y0 = 330;
    ctx.save(); ctx.globalAlpha = a;
    let row = 0;
    for (const c of ['hand', 'yao', 'roof', 'child']) {
      const s = show[c] ?? 0; if (s <= 0) continue;
      const y = y0 + row * 118; row++;
      const h = hi[c] || 0;
      ctx.save(); ctx.globalAlpha = a * easeOut(s);
      ctx.translate(60 * (1 - easeOut(s)), 0);
      ctx.fillStyle = `rgba(10,6,4,${0.5 + 0.3 * h})`; roundRect(ctx, x - 20, y - 48, 380, 96, 12); ctx.fill();
      ctx.strokeStyle = E.rgba(E.COMP[c].col, 0.35 + 0.65 * h); ctx.lineWidth = 2 + 3 * h; ctx.stroke();
      E.text(ctx, E.COMP[c].zh, x + 40, y + 2, { font: 'Kai', size: 62, color: E.COMP[c].col, glow: 18 * h, glowColor: E.COMP[c].col });
      E.text(ctx, E.COMP[c].fr, x + 100, y + 2, { size: 34, weight: 600, align: 'left', color: '#f1e6cf' });
      ctx.restore();
    }
    ctx.restore();
  };

  // Étiquette reliée à un point
  E.callout = function (ctx, px, py, tx, ty, label, col, a, sub) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    const u = easeOut(a);
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lerp(px, tx, u), lerp(py, ty, u)); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.fill();
    const al = tx < px ? 'right' : 'left';
    const dx = al === 'left' ? 14 : -14;
    ctx.font = '700 44px Cormorant, Kai';
    let bw = ctx.measureText(label).width;
    if (sub) { ctx.font = '600 30px Cormorant, Kai'; bw = Math.max(bw, ctx.measureText(sub).width); }
    ctx.fillStyle = 'rgba(12,8,5,0.82)';
    roundRect(ctx, al === 'left' ? tx + dx - 18 : tx + dx - bw - 18, ty - (sub ? 56 : 34), bw + 36, sub ? 108 : 68, 12); ctx.fill();
    E.text(ctx, label, tx + dx, ty - (sub ? 18 : 0), { size: 44, weight: 700, align: al, color: col, glow: 12 });
    if (sub) E.text(ctx, sub, tx + dx, ty + 26, { size: 30, weight: 600, align: al, color: '#efe3c8', glow: 10 });
    ctx.restore();
  };

  // ───────── fond, grain, particules
  const grain = document.createElement('canvas'); grain.width = grain.height = 512;
  (function () {
    const g = grain.getContext('2d'), r = E.rand(7), img = g.createImageData(512, 512);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * 90; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    // fibres
    g.globalAlpha = 0.08; g.strokeStyle = '#fff';
    for (let i = 0; i < 400; i++) { g.beginPath(); const x = r() * 512, y = r() * 512, a = r() * 6.28, l = 10 + r() * 40; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  })();
  E.background = function (ctx, t, top, bottom) {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H / 2, 1200);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  E.finish = function (ctx, t, o = {}) {
    // grain animé
    ctx.save(); ctx.globalAlpha = o.grain ?? 0.07; ctx.globalCompositeOperation = 'overlay';
    const ox = Math.floor((t * 97) % 512), oy = Math.floor((t * 61) % 512);
    ctx.fillStyle = ctx.createPattern(grain, 'repeat');
    ctx.translate(-ox, -oy); ctx.fillRect(0, 0, W + 512, H + 512); ctx.restore();
    // vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1150);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${o.vignette ?? 0.75})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    // bandes cinéma
    if (o.bars) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, o.bars); ctx.fillRect(0, H - o.bars, W, o.bars); }
  };
  const motes = (() => { const r = E.rand(3); return Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * H, s: 1 + r() * 3.5, v: 12 + r() * 40, ph: r() * 6.28, a: 0.2 + r() * 0.6 })); })();
  E.motes = function (ctx, t, col = '255,190,110', amt = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const y = ((m.y - t * m.v) % (H + 40) + H + 40) % (H + 40) - 20;
      const x = m.x + Math.sin(t * 0.7 + m.ph) * 30;
      const a = m.a * amt * (0.6 + 0.4 * Math.sin(t * 2 + m.ph));
      const g = ctx.createRadialGradient(x, y, 0, x, y, m.s * 4);
      g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, m.s * 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  };

  // Éclaboussure d'encre (tache organique)
  E.inkBlot = function (ctx, x, y, r, u, seed, col = '#000') {
    if (u <= 0) return;
    const rnd = E.rand(seed);
    ctx.save(); ctx.fillStyle = col;
    ctx.beginPath();
    const n = 64, amp = Array.from({ length: 9 }, () => rnd());
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      let rr = 1; amp.forEach((v, k) => { rr += 0.08 * Math.sin(a * (k + 2) + v * 6.28) * (k < 3 ? 1.6 : 1); });
      const R = r * easeOut(u) * rr;
      const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.fill();
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 6.28, d = r * (1.05 + rnd() * 0.9) * easeOut(u), s = r * (0.015 + rnd() * 0.06);
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, 7); ctx.fill();
    }
    ctx.restore();
  };

  // ───────── cartes
  const GEO = {
    china: [[124.3, 40.0], [123.0, 39.6], [121.6, 38.9], [121.2, 38.8], [121.6, 39.4], [122.0, 40.2], [121.0, 40.8], [119.5, 39.9], [118.0, 39.2], [117.7, 38.9], [118.8, 37.5], [119.4, 37.1], [120.7, 37.8], [122.5, 37.4], [121.0, 36.5], [120.3, 36.0], [119.3, 35.1], [120.3, 34.3], [120.9, 32.6], [121.9, 31.7], [121.9, 30.9], [121.5, 30.2], [122.1, 29.9], [121.4, 28.2], [120.4, 27.0], [119.6, 25.9], [118.6, 24.6], [117.2, 23.6], [116.0, 22.9], [114.2, 22.3], [113.5, 22.2], [111.9, 21.6], [110.4, 21.2], [110.1, 20.3], [109.7, 21.5], [108.5, 21.6], [106.7, 20.8], [106.0, 19.9], [105.6, 18.9], [106.5, 17.6], [107.5, 16.4], [108.8, 15.4], [109.3, 13.5], [109.2, 11.6], [108.0, 10.8], [106.5, 9.7], [104.8, 8.6], [80, 8.6], [80, 50], [126.0, 50], [127.5, 47], [130.5, 44], [130.7, 42.3], [129.7, 40.8], [128.4, 38.6], [129.4, 37.6], [129.5, 36.5], [129.3, 35.3], [127.5, 34.7], [126.3, 34.6], [126.5, 36.4], [126.1, 37.7], [125.1, 38.5], [124.3, 40.0]],
    honshu: [[130.9, 34.0], [132.4, 34.3], [135.0, 34.6], [135.3, 33.7], [136.8, 34.3], [138.8, 34.6], [139.8, 35.0], [140.9, 35.7], [140.9, 36.9], [141.0, 38.3], [141.9, 39.3], [141.4, 41.4], [140.3, 41.0], [139.9, 40.0], [140.0, 39.0], [139.0, 37.9], [137.3, 36.8], [136.7, 36.9], [135.9, 35.7], [133.0, 35.5], [131.3, 34.4]],
    kyushu: [[130.0, 33.5], [131.0, 33.9], [131.9, 33.1], [131.4, 31.4], [130.6, 31.0], [130.2, 31.4], [129.8, 32.6]],
    shikoku: [[132.5, 33.2], [133.3, 34.2], [134.6, 34.2], [134.7, 33.8], [133.9, 33.3], [133.0, 32.8]],
    hokkaido: [[140.0, 41.5], [141.2, 41.8], [143.2, 42.0], [145.5, 43.3], [145.1, 44.2], [141.8, 45.4], [141.6, 44.0], [140.4, 43.2], [139.9, 42.2]],
    taiwan: [[120.1, 23.0], [120.7, 22.0], [121.0, 22.0], [121.9, 24.9], [121.5, 25.3], [120.3, 24.3]],
    hainan: [[108.6, 19.2], [109.6, 18.2], [110.5, 18.5], [111.0, 19.7], [110.2, 20.1], [108.7, 19.9]],
    yellow: [[96.0, 35.0], [98.5, 34.7], [100.5, 35.8], [102.5, 36.0], [103.8, 36.1], [105.2, 37.5], [106.2, 38.5], [106.9, 39.6], [107.5, 40.6], [109.8, 40.6], [111.2, 40.3], [111.3, 39.2], [110.6, 37.6], [110.4, 35.9], [110.3, 34.6], [111.9, 34.8], [113.6, 34.9], [114.7, 35.0], [116.0, 35.9], [117.0, 36.7], [118.2, 37.5], [119.1, 37.8]],
    yangtze: [[97.5, 33.5], [99.0, 31.0], [99.5, 28.0], [100.2, 26.8], [102.9, 26.4], [104.6, 28.8], [106.5, 29.6], [108.4, 30.8], [110.4, 31.0], [111.3, 30.7], [112.2, 30.3], [113.1, 29.4], [114.3, 30.6], [115.9, 29.7], [117.1, 30.5], [118.4, 31.3], [118.8, 32.0], [119.9, 32.2], [121.0, 31.8], [121.9, 31.4]],
    wei: [[104.5, 34.8], [106.2, 34.5], [107.2, 34.4], [108.9, 34.4], [110.3, 34.6]],
    qin: [[102.8, 36.6], [104.5, 38.2], [106.3, 39.9], [108.5, 41.2], [111.5, 41.3], [114.5, 41.8], [117.5, 41.5], [120.2, 41.2], [122.5, 40.8], [124.2, 40.0], [124.5, 37], [122, 33], [123, 28], [121, 24], [117, 21.5], [113.5, 21.5], [110, 20.8], [108, 21.8], [106.5, 22.8], [105.2, 24.5], [103.8, 25.8], [102.6, 27.5], [102.2, 30.0], [103.0, 32.2], [102.0, 34.2], [102.8, 36.6]],
    shang: [[112.0, 37.2], [114.5, 37.6], [117.0, 36.8], [117.6, 35.0], [117.0, 33.6], [114.5, 33.2], [112.2, 33.8], [111.4, 35.4]],
    zhou: [[105.8, 35.6], [108.5, 35.9], [110.4, 35.0], [110.2, 33.8], [107.5, 33.6], [105.6, 34.2]],
  };
  E.GEO = GEO;
  E.CITIES = {
    anyang: [114.35, 36.1], hao: [108.8, 34.2], xianyang: [108.7, 34.35], luoyang: [112.45, 34.62],
    beijing: [116.4, 39.9], tokyo: [139.7, 35.7],
  };
  // view : {lon, lat, k} centre et échelle (px/degré)
  E.proj = (v, p) => [W / 2 + (p[0] - v.lon) * v.k, H / 2 - (p[1] - v.lat) * v.k * 1.18];
  function geoPath(ctx, v, pts, close) {
    ctx.beginPath();
    pts.forEach((p, i) => { const q = E.proj(v, p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    if (close) ctx.closePath();
  }
  E.geoPath = geoPath;
  E.drawMap = function (ctx, t, v, o = {}) {
    // mer
    const sea = ctx.createLinearGradient(0, 0, W, H);
    sea.addColorStop(0, '#0d1b22'); sea.addColorStop(1, '#08121a');
    ctx.fillStyle = sea; ctx.fillRect(0, 0, W, H);
    // graticule
    ctx.save(); ctx.strokeStyle = 'rgba(200,170,110,0.07)'; ctx.lineWidth = 1;
    for (let lon = 70; lon <= 160; lon += 5) { geoPath(ctx, v, [[lon, 0], [lon, 60]]); ctx.stroke(); }
    for (let lat = 0; lat <= 60; lat += 5) { geoPath(ctx, v, [[60, lat], [170, lat]]); ctx.stroke(); }
    ctx.restore();
    // terres
    const land = ['china', 'honshu', 'kyushu', 'shikoku', 'hokkaido', 'taiwan', 'hainan'];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 30;
    const lg = ctx.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#3a2c1c'); lg.addColorStop(1, '#2a1f14');
    ctx.fillStyle = lg;
    land.forEach((k) => { geoPath(ctx, v, GEO[k], true); ctx.fill(); });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(232,190,110,0.55)'; ctx.lineWidth = 2;
    land.forEach((k) => { geoPath(ctx, v, GEO[k], true); ctx.stroke(); });
    ctx.restore();
    // relief suggéré (hachures à l'ouest)
    ctx.save(); ctx.globalAlpha = 0.12; ctx.strokeStyle = '#d8b27a'; ctx.lineWidth = 1.5;
    const r = E.rand(11);
    for (let i = 0; i < 160; i++) {
      const lon = 90 + r() * 14, lat = 26 + r() * 14, q = E.proj(v, [lon, lat]);
      ctx.beginPath(); ctx.moveTo(q[0] - 8, q[1] + 5); ctx.lineTo(q[0], q[1] - 5); ctx.lineTo(q[0] + 8, q[1] + 5); ctx.stroke();
    }
    ctx.restore();
    // fleuves (tracés progressifs)
    const rivers = [['yellow', o.rivers ?? 1], ['yangtze', o.rivers ?? 1], ['wei', o.rivers ?? 1]];
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    rivers.forEach(([k, u]) => {
      if (u <= 0) return;
      const pts = GEO[k], n = Math.max(2, Math.ceil(pts.length * u));
      ctx.strokeStyle = k === 'yellow' ? 'rgba(236,190,90,0.9)' : 'rgba(110,170,200,0.7)';
      ctx.lineWidth = k === 'wei' ? 2 : 3.5;
      geoPath(ctx, v, pts.slice(0, n)); ctx.stroke();
    });
    ctx.restore();
    if (o.riverLabels) {
      const a = o.riverLabels;
      const p1 = E.proj(v, [106.3, 40.9]), p2 = E.proj(v, [107.5, 31.4]);
      E.text(ctx, 'Fleuve Jaune', p1[0], p1[1] - 20, { size: 30, weight: 600, color: '#ecc070', alpha: a, glow: 8 });
      E.text(ctx, 'Yangzi', p2[0], p2[1] + 34, { size: 30, weight: 600, color: '#8ec3dc', alpha: a, glow: 8 });
    }
  };
  E.region = function (ctx, v, key, col, a, u = 1, center) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    // clip sur les terres
    geoPath(ctx, v, GEO.china, true); ctx.clip();
    if (u < 1 && center) {
      const c = E.proj(v, center); ctx.beginPath(); ctx.arc(c[0], c[1], 1800 * easeInOut(u), 0, 7); ctx.clip();
    }
    geoPath(ctx, v, GEO[key], true);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,230,190,0.6)'; ctx.setLineDash([10, 8]); ctx.stroke();
    ctx.restore();
  };
  E.marker = function (ctx, t, v, p, label, sub, a, col = '#ef5a3c', side = 1) {
    if (a <= 0) return;
    const q = E.proj(v, p);
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.8 + i / 3) % 1);
      ctx.strokeStyle = E.rgba(col, (1 - u) * 0.8); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(q[0], q[1], 10 + u * 60, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(q[0], q[1], 11 * backOut(clamp(a)), 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    const tx = q[0] + side * 34;
    E.text(ctx, label, tx, q[1] - 14, { size: 46, weight: 700, align: side > 0 ? 'left' : 'right', color: '#fff3dc', glow: 14 });
    if (sub) E.text(ctx, sub, tx, q[1] + 30, { size: 30, weight: 600, align: side > 0 ? 'left' : 'right', color: '#e7c98f', glow: 12 });
    ctx.restore();
  };

  window.E = E;
})();
