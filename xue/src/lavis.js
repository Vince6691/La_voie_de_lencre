// Lavis à l'encre (水墨) : le tir à l'arc au 學宮, au bord du Grand Étang (大池), d'après
// l'inscription du vase Jing gui 靜簋 (« le roi ordonna à Jing de diriger le tir au 學宮… ils tirèrent
// à l'arc au Grand Étang »). Papier, montagnes lointaines dans la brume, pavillon sur terrasse de
// terre battue (toit à quatre pans, sans avant-toits relevés, plus tardifs), archers peints au
// pinceau et articulés, cible de tissu (侯) tendue entre deux poteaux.
(function () {
  const { W, H, clamp, lerp, seg, easeInOut, easeOut } = E;
  const INK = '20,17,13';
  const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ── pinceau : trait effilé le long d'une polyligne (largeur w0 → w1), bords légèrement irréguliers
  function brush(ctx, pts, w0, w1, alpha = 0.9, seed = 1) {
    if (pts.length < 2) return;
    const r = rng(seed * 97 + 13);
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
      const u = i / (pts.length - 1);
      const w = lerp(w0, w1, u) * (0.85 + 0.3 * r()) * Math.min(1, 0.35 + 2.2 * u, 0.35 + 2.2 * (1 - u)) / 2;
      L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    L.forEach((p) => ctx.lineTo(p[0], p[1]));
    R.reverse().forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fillStyle = `rgba(${INK},${alpha})`; ctx.fill();
  }
  // courbe de Bézier quadratique → points (pour le pinceau)
  const quad = (a, c, b, n = 14) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  });
  // lavis : aplat d'encre diluée au bord mouillé plus sombre
  function wash(ctx, path, alpha, edge = 0.25, blur = 1.2) {
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = `rgba(${INK},${alpha})`; ctx.fill(path);
    ctx.filter = 'none';
    ctx.strokeStyle = `rgba(${INK},${edge})`; ctx.lineWidth = 1.6; ctx.stroke(path);
    ctx.restore();
  }

  // ── couches fixes (calculées une fois)
  let L = null;
  function layers() {
    if (L) return L;
    L = {};
    // papier de riz
    const p = mk(W, H), g = p.getContext('2d');
    g.fillStyle = '#ede2c8'; g.fillRect(0, 0, W, H);
    let r = rng(5);
    for (let i = 0; i < 60; i++) {
      const x = r() * W, y = r() * H, rad = 80 + r() * 260;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${r() < 0.5 ? '160,130,85' : '255,250,235'},${0.05 + r() * 0.06})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
    }
    g.strokeStyle = 'rgba(120,95,60,0.08)'; g.lineWidth = 1;
    for (let i = 0; i < 1400; i++) { const x = r() * W, y = r() * H, a = r() * 6.3, l = 4 + r() * 18; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l, y + Math.sin(a + 1) * l * 0.5, x + Math.cos(a) * l * 1.6, y + Math.sin(a) * l); g.stroke(); }
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, 'rgba(90,65,35,0)'); vg.addColorStop(1, 'rgba(90,65,35,0.35)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    L.paper = p;
    // montagnes : trois plans, de plus en plus sombres, fondus dans la brume par le bas
    L.ridges = [
      { y: 470, amp: 170, a: 0.2, blur: 6, seed: 3, k: 0.15 },
      { y: 560, amp: 130, a: 0.34, blur: 3, seed: 8, k: 0.3 },
      { y: 650, amp: 70, a: 0.5, blur: 1.5, seed: 21, k: 0.45 },
    ].map((o) => {
      const c = mk(W + 500, H), q = c.getContext('2d');
      const rr = rng(o.seed);
      const ph = [rr() * 6, rr() * 6, rr() * 6, rr() * 6];
      const hgt = (x) => o.amp * (0.55 * Math.sin(x * 0.0021 + ph[0]) + 0.3 * Math.sin(x * 0.0057 + ph[1]) + 0.15 * Math.sin(x * 0.013 + ph[2]) + 0.06 * Math.sin(x * 0.041 + ph[3]));
      const path = new Path2D();
      path.moveTo(0, H);
      for (let x = 0; x <= W + 500; x += 8) path.lineTo(x, o.y - Math.max(0, hgt(x) + o.amp * 0.4));
      path.lineTo(W + 500, H); path.closePath();
      q.filter = `blur(${o.blur}px)`;
      q.fillStyle = `rgba(${INK},${o.a})`; q.fill(path);
      q.filter = 'none';
      // plis de la montagne : quelques coups de pinceau secs
      q.save(); q.clip(path);
      for (let i = 0; i < 14; i++) {
        const x = rr() * (W + 500), y0 = o.y - Math.max(0, hgt(x) + o.amp * 0.4);
        brush(q, quad([x, y0 + 6], [x - 8 + rr() * 16, y0 + 24], [x - 14 + rr() * 28, y0 + 40 + rr() * 30]), 4, 1, o.a * 0.45, i + o.seed);
      }
      q.restore();
      // brume : le pied de la montagne s'efface
      q.globalCompositeOperation = 'destination-out';
      const m = q.createLinearGradient(0, o.y - o.amp * 0.3, 0, o.y + 90);
      m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
      q.fillStyle = m; q.fillRect(0, o.y - o.amp, W + 500, H);
      return { c, k: o.k };
    });
    // pavillon du 學宮 sur sa terrasse de terre battue
    const pv = mk(760, 460), v = pv.getContext('2d');
    v.translate(380, 430);
    r = rng(44);
    const terrace = new Path2D(); terrace.moveTo(-330, 0); terrace.lineTo(-300, -62); terrace.lineTo(300, -62); terrace.lineTo(335, 0); terrace.closePath();
    wash(v, terrace, 0.3, 0.45);
    for (let i = 0; i < 6; i++) brush(v, [[-300 + i * 12, -60 + i * 10], [300 - i * 10, -60 + i * 10]], 2, 1, 0.25, i); // couches de terre battue
    brush(v, [[-60, 0], [-40, -62]], 5, 3, 0.6, 2); brush(v, [[60, 0], [40, -62]], 5, 3, 0.6, 3); // escalier
    for (let i = 1; i < 5; i++) brush(v, [[-60 + i * 4, -i * 13], [60 - i * 4, -i * 13]], 3, 2, 0.5, 9 + i);
    for (const x of [-230, -120, 0, 120, 230]) brush(v, [[x, -64], [x + 2, -250]], 12, 10, 0.85, x + 400); // colonnes
    brush(v, [[-260, -250], [260, -250]], 14, 12, 0.85, 7); // poutre
    const roof = new Path2D(); roof.moveTo(-330, -236); roof.quadraticCurveTo(-200, -300, -140, -372); roof.lineTo(140, -372); roof.quadraticCurveTo(200, -300, 330, -236); roof.quadraticCurveTo(0, -250, -330, -236); roof.closePath();
    wash(v, roof, 0.78, 0.5, 1);
    for (let i = 0; i < 26; i++) { const x = -300 + i * 24; brush(v, quad([x * 0.45, -368], [x * 0.75, -320], [x, -244]), 2, 1.5, 0.5, i + 50); } // tuiles
    brush(v, [[-150, -374], [150, -374]], 12, 10, 0.95, 70); // faîtage
    L.pavilion = pv;
    // roseaux du premier plan (deux touffes)
    L.reeds = [0, 1].map((side) => {
      const c = mk(520, 520), q = c.getContext('2d'); const rr = rng(90 + side);
      const blades = [];
      for (let i = 0; i < 26; i++) {
        const x0 = 60 + rr() * 380, h = 180 + rr() * 300, bend = (rr() - 0.4) * 160;
        blades.push({ x0, h, bend, w: 3 + rr() * 5, a: 0.55 + rr() * 0.4, s: i });
      }
      return { c, q, blades };
    });
    return L;
  }

  function reeds(ctx, R, x, y, t, flip) {
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    for (const b of R.blades) {
      const sw = Math.sin(t * 1.3 + b.s) * 10;
      brush(ctx, quad([b.x0 - 260, 0], [b.x0 - 260 + b.bend * 0.3, -b.h * 0.6], [b.x0 - 260 + b.bend + sw, -b.h]), b.w, 0.6, b.a, b.s + 1);
      if (b.s % 5 === 0) { // plumet
        const tx = b.x0 - 260 + b.bend + sw, ty = -b.h;
        brush(ctx, quad([tx, ty], [tx + 14, ty - 20], [tx + 30 + sw, ty - 50]), 9, 1, 0.35, b.s + 7);
      }
    }
    ctx.restore();
  }

  // ── personnages
  function figureBody(ctx, s, dark, seed) {
    const robe = new Path2D();
    robe.moveTo(-15, -150); robe.quadraticCurveTo(-22, -110, -20, -92); robe.quadraticCurveTo(-34, -40, -44, 0);
    robe.quadraticCurveTo(0, 8, 46, 0); robe.quadraticCurveTo(30, -40, 22, -92); robe.quadraticCurveTo(24, -120, 18, -150); robe.closePath();
    wash(ctx, robe, dark, 0.55);
    brush(ctx, [[-19, -96], [22, -96]], 5, 4, 0.9, seed); // ceinture
    brush(ctx, quad([-8, -148], [0, -120], [14, -96]), 3, 2, 0.6, seed + 1); // pan croisé de la robe
    ctx.fillStyle = `rgba(${INK},0.92)`;
    ctx.beginPath(); ctx.ellipse(4, -168, 12, 14, 0.1, 0, 7); ctx.fill(); // tête
    ctx.beginPath(); ctx.ellipse(0, -186, 6, 7, 0, 0, 7); ctx.fill(); // chignon
    brush(ctx, [[-6, -192], [8, -193]], 4, 4, 0.9, seed + 2); // petite coiffe
  }

  // archer tourné vers la droite ; draw 0..1 (bandé), after 0..1 (suite du lâcher)
  function archer(ctx, x, gy, s, draw, after, nocked, seed) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
    figureBody(ctx, s, 0.62, seed);
    const H1 = [80, -148];
    const back = Math.sin(Math.PI * Math.min(1, after * 1.4)) * (1 - after);
    const H2 = [lerp(56, 0, draw) - 26 * back, lerp(-150, -160, draw) + 6 * back];
    // bras de l'arc et manche
    brush(ctx, [[8, -146], [44, -148], H1], 15, 8, 0.9, seed + 3);
    const sleeve = new Path2D(); sleeve.moveTo(14, -146); sleeve.quadraticCurveTo(34, -120, 50, -124); sleeve.lineTo(52, -144); sleeve.closePath();
    wash(ctx, sleeve, 0.45, 0.3);
    // arc réflexe : les branches reculent vers l'archer quand il bande
    const f = draw;
    const T = [H1[0] - 4 - 20 * f, H1[1] - 80 + 5 * f], B = [H1[0] - 4 - 20 * f, H1[1] + 80 - 5 * f];
    brush(ctx, [...quad(T, [H1[0] + 22 - 8 * f, H1[1] - 44], H1, 10), ...quad(H1, [H1[0] + 22 - 8 * f, H1[1] + 44], B, 10).slice(1)], 3, 3, 0.95, seed + 4);
    brush(ctx, quad(T, [T[0] + 4, T[1] - 8], [T[0] + 13, T[1] - 10], 4), 3, 1, 0.9, seed + 5); // oreilles recourbées
    brush(ctx, quad(B, [B[0] + 4, B[1] + 8], [B[0] + 13, B[1] + 10], 4), 3, 1, 0.9, seed + 6);
    // corde
    ctx.strokeStyle = `rgba(${INK},0.75)`; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(T[0], T[1]);
    if (nocked) ctx.lineTo(H2[0], H2[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    // flèche encochée
    if (nocked) {
      brush(ctx, [H2, [H2[0] + 104, H2[1] + 2]], 2, 2, 0.95, seed + 7);
      brush(ctx, [[H2[0] + 2, H2[1]], [H2[0] + 16, H2[1] - 5]], 3, 1, 0.7, seed + 8);
    }
    // bras qui tire : coude haut
    const El = [H2[0] - 36 + 6 * f, lerp(-138, -156, f)];
    brush(ctx, [[-4, -146], El, H2], 16, 8, 0.9, seed + 9);
    const sl2 = new Path2D(); // manche qui pend sous le bras qui tire
    sl2.moveTo(El[0] + 4, El[1] + 2); sl2.quadraticCurveTo(El[0] + 2, El[1] + 30, El[0] + 22, El[1] + 36); sl2.lineTo(H2[0] - 8, H2[1] + 4); sl2.closePath();
    wash(ctx, sl2, 0.4, 0.3);
    ctx.restore();
  }

  // le maître Jing (靜), derrière les élèves, montre la cible
  function master(ctx, x, gy, s, t) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s * 1.08, s * 1.08);
    figureBody(ctx, s, 0.82, 301);
    const lift = 0.5 + 0.5 * Math.sin(t * 0.8);
    brush(ctx, [[8, -144], [44, -152 - 8 * lift], [74, -164 - 10 * lift]], 11, 6, 0.9, 302); // bras tendu
    const sl = new Path2D(); sl.moveTo(12, -142); sl.quadraticCurveTo(40, -110, 58, -130 - 8 * lift); sl.lineTo(56, -150 - 8 * lift); sl.closePath();
    wash(ctx, sl, 0.55, 0.3);
    brush(ctx, [[-6, -144], [-26, -118], [-10, -100]], 11, 8, 0.85, 303); // main dans le dos
    brush(ctx, [[-8, -194], [14, -194], [16, -206], [-6, -206]], 5, 5, 0.95, 304); // coiffe (冠)
    ctx.restore();
  }

  // cible de tissu (侯) entre deux poteaux, centre (鵠) plus sombre ; sway = frémissement à l'impact
  function target(ctx, x, gy, s, sway) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
    brush(ctx, [[-86, 0], [-84, -300]], 9, 7, 0.9, 401); brush(ctx, [[86, 0], [84, -300]], 9, 7, 0.9, 402);
    const k = sway;
    const cloth = new Path2D();
    cloth.moveTo(-80, -280); cloth.quadraticCurveTo(0, -284 + 6 * k, 80, -280);
    cloth.quadraticCurveTo(84 + 10 * k, -190, 80, -110); cloth.quadraticCurveTo(0, -104 + 8 * k, -80, -110);
    cloth.quadraticCurveTo(-84 + 10 * k, -190, -80, -280); cloth.closePath();
    wash(ctx, cloth, 0.14, 0.5);
    const c = new Path2D(); c.rect(-28 + 6 * k, -222, 56, 56);
    wash(ctx, c, 0.55, 0.4);
    brush(ctx, [[-84, -282], [84, -282]], 3, 3, 0.7, 403); brush(ctx, [[-84, -108], [84, -108]], 3, 3, 0.7, 404);
    ctx.restore();
  }

  // ── la scène
  const PERIOD = 4.8, FIRST = 15.4, STEP = 1.6; // un tir toutes les 1,6 s (ancres), chaque archer toutes les 4,8 s
  const ARCHERS = [{ x: 230, s: 1.38 }, { x: 540, s: 1.3 }, { x: 830, s: 1.22 }];
  const TGT = { x: 1660, gy: 915, s: 1.1 };
  window.LAVIS = {
    releases(v0, v1) { const out = []; for (let n = 0; FIRST + n * STEP <= v1; n++) if (FIRST + n * STEP >= v0) out.push(FIRST + n * STEP); return out; },
    archery(ctx, t, vt, v0) {
      const Ls = layers();
      const u = seg(vt, v0, v0 + 9);
      const pan = lerp(0, -140, easeInOut(u)); // travelling lent vers la droite
      const zoom = lerp(1.05, 1.0, easeOut(u));
      ctx.save();
      ctx.drawImage(Ls.paper, 0, 0);
      ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
      // ciel : quelques oiseaux
      const r = rng(7);
      for (let i = 0; i < 5; i++) {
        const bx = W + 100 - ((vt - v0) * (40 + r() * 30) + r() * 900) % (W + 400), by = 150 + r() * 160;
        const fl = Math.sin(t * 7 + i) * 6;
        brush(ctx, quad([bx - 16, by - 4 - fl], [bx - 6, by - 6], [bx, by]), 3, 1, 0.7, i + 1);
        brush(ctx, quad([bx, by], [bx + 6, by - 6], [bx + 16, by - 4 - fl]), 3, 1, 0.7, i + 2);
      }
      Ls.ridges.forEach((rg) => ctx.drawImage(rg.c, -120 + pan * rg.k, 0));
      // brume au ras de l'eau
      const mist = ctx.createLinearGradient(0, 560, 0, 720);
      mist.addColorStop(0, 'rgba(237,226,200,0)'); mist.addColorStop(0.6, 'rgba(237,226,200,0.85)'); mist.addColorStop(1, 'rgba(237,226,200,0.3)');
      ctx.fillStyle = mist; ctx.fillRect(0, 540, W, 200);
      // pavillon au loin, sur l'autre rive, et son reflet dans l'étang
      const px = 1180 + pan * 0.6, py = 700;
      ctx.drawImage(Ls.pavilion, px - 380 * 0.62, py - 430 * 0.62, 760 * 0.62, 460 * 0.62);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, py, W, 170); ctx.clip();
      ctx.globalAlpha = 0.16;
      for (let yy = 0; yy < 150; yy += 5) { // reflet ondulé, bande par bande
        const off = Math.sin(yy * 0.25 + t * 2) * (2 + yy * 0.05);
        const sy = 430 - yy / 0.62;
        if (sy < 0) break;
        ctx.drawImage(Ls.pavilion, 0, sy - 5 / 0.62, 760, 5 / 0.62, px - 380 * 0.62 + off, py + yy, 760 * 0.62, 5);
      }
      ctx.restore();
      // étang : lavis pâle et rides
      ctx.fillStyle = `rgba(${INK},0.06)`; ctx.fillRect(0, py, W, 170);
      for (let i = 0; i < 26; i++) {
        const rx = ((r() * W + (vt - v0) * 12 * (0.5 + r())) % (W + 200)) - 100, ry = py + 10 + r() * 150;
        brush(ctx, [[rx, ry], [rx + 40 + r() * 90, ry + (r() - 0.5) * 2]], 2, 1, 0.18 + r() * 0.15, i + 30);
      }
      // rive proche : lavis de terre, archers, maître, cible
      const bank = new Path2D();
      bank.moveTo(-20, 880); bank.quadraticCurveTo(600, 850, 1100, 872); bank.quadraticCurveTo(1600, 890, W + 20, 862);
      bank.lineTo(W + 20, H + 20); bank.lineTo(-20, H + 20); bank.closePath();
      ctx.save(); ctx.translate(pan * 1.0, 0);
      wash(ctx, bank, 0.14, 0.35, 3);
      for (let i = 0; i < 18; i++) { const bx = r() * (W + 200) - 100; brush(ctx, [[bx, 900 + r() * 150], [bx + 60 + r() * 140, 902 + r() * 150]], 4, 1, 0.12, i + 60); }
      const gy = 930;
      // flèches plantées et flèches en vol
      const rel = this.releases(-1e9, vt);
      let sway = 0;
      rel.forEach((r0, n) => {
        const a = ARCHERS[n % 3];
        const x0 = a.x + 110 * a.s, y0 = gy - 150 * a.s;
        const tx = TGT.x + ((n * 37) % 40) - 20, ty = TGT.gy - 194 * TGT.s + ((n * 53) % 36) - 18;
        const fl = (vt - r0) / 0.55;
        if (fl < 1) {
          const q = easeInOut(clamp(fl)) * 0.3 + clamp(fl) * 0.7;
          const ax = lerp(x0, tx, q), ay = lerp(y0, ty, q) - Math.sin(q * Math.PI) * 50;
          const ang = Math.atan2(ty - y0 - Math.cos(q * Math.PI) * 50 * Math.PI, tx - x0);
          ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang * 0.25);
          for (let k = 1; k <= 4; k++) brush(ctx, [[-60 - k * 55, 0], [-60 - (k - 1) * 55, 0]], 1.4, 1.4, 0.12 * (5 - k) / 4, k); // traînée
          brush(ctx, [[-100, 0], [0, 0]], 2.2, 2.2, 0.95, n + 3);
          brush(ctx, [[-100, 0], [-86, -6]], 3, 1, 0.7, n + 4); brush(ctx, [[-100, 0], [-86, 6]], 3, 1, 0.7, n + 5);
          ctx.restore();
        } else {
          const since = vt - r0 - 0.55;
          if (since < 1.2) sway = Math.max(sway, Math.exp(-since * 3.5) * Math.sin(since * 30));
        }
      });
      target(ctx, TGT.x, TGT.gy, TGT.s, sway);
      rel.forEach((r0, n) => {
        if (vt - r0 < 0.55) return;
        const tx = TGT.x + ((n * 37) % 40) - 20, ty = TGT.gy - 194 * TGT.s + ((n * 53) % 36) - 18;
        brush(ctx, [[tx - 46, ty + 2], [tx + 2, ty]], 2.2, 2, 0.9, n + 40);
        brush(ctx, [[tx - 46, ty + 2], [tx - 34, ty - 4]], 3, 1, 0.7, n + 41);
      });
      master(ctx, 400, gy - 46, 1.02, t);
      ARCHERS.forEach((a, i) => {
        const first = FIRST + STEP * i;
        const q = (((vt - first) % PERIOD) + PERIOD) % PERIOD; // q = 0 : lâcher
        let draw, after = 0, nocked = true;
        if (q < 0.9) { draw = 0; after = q / 0.9; nocked = false; }
        else if (q < 1.8) { draw = 0; nocked = q > 1.4; }
        else if (q < 3.4) draw = easeInOut((q - 1.8) / 1.6);
        else draw = 1 - 0.015 * Math.sin(t * 40); // tremblement du bras bandé
        archer(ctx, a.x, gy + 8 * i, a.s, draw, after, nocked, 11 + i * 20);
      });
      ctx.restore();
      reeds(ctx, Ls.reeds[0], 170 + pan * 1.3, H + 30, t, false);
      reeds(ctx, Ls.reeds[1], W - 120 + pan * 1.3, H + 40, t + 2, true);
      ctx.restore();
    },
    // sceau rouge (學宮) posé sur le lavis
    seal(ctx, x, y, a) {
      if (a <= 0) return;
      const s = lerp(1.35, 1, easeOut(a));
      ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.5); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.03);
      ctx.fillStyle = '#b3261e';
      ctx.beginPath(); ctx.roundRect(-58, -110, 116, 220, 10); ctx.fill();
      ctx.fillStyle = '#f3e6cc'; ctx.font = '400 84px Kai, Song'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('學', 0, -50); ctx.fillText('宮', 0, 50);
      ctx.restore();
    },
  };
})();
