// Formes historiques de 學, tracées à la main dans une boîte 1000×1000 (y vers le bas).
// Chaque trait appartient à une composante : hand (𦥑 deux mains), yao (爻), roof (冖), child (子).
// Le nombre de traits par composante est gardé constant autant que possible pour permettre
// les métamorphoses d'une écriture à l'autre.

(function () {
  const mirror = (pts) => pts.map(([x, y]) => [1000 - x, y]);
  const handPair = (strokes, extra = {}) => [
    ...strokes.map((pts) => ({ c: 'hand', pts, ...extra })),
    ...strokes.map((pts) => ({ c: 'hand', pts: mirror(pts), ...extra })),
  ];

  // ── 甲骨文 jiaguwen (Shang) : 爻 entre deux mains, sur un toit ; tracé fin au couteau
  const oracle = {
    style: 'carve',
    strokes: [
      { c: 'yao', pts: [[418, 92], [586, 262]], sharp: true },
      { c: 'yao', pts: [[584, 96], [414, 258]], sharp: true },
      { c: 'yao', pts: [[420, 280], [590, 446]], sharp: true },
      { c: 'yao', pts: [[586, 284], [416, 442]], sharp: true },
      { c: 'roof', pts: [[208, 872], [214, 640], [500, 520], [786, 640], [792, 872]], sharp: true },
      ...handPair([
        [[352, 478], [306, 392], [292, 292], [318, 198]],
        [[318, 198], [298, 112]],
        [[318, 198], [352, 118]],
        [[318, 198], [384, 170]],
      ]),
    ],
  };

  // ── 金文 jinwen (Zhou occidentaux) : l'enfant 子 apparaît sous le toit ; traits épais, fondus
  const bronze = {
    style: 'cast',
    strokes: [
      { c: 'yao', pts: [[424, 92], [578, 238]], sharp: true },
      { c: 'yao', pts: [[578, 92], [424, 238]], sharp: true },
      { c: 'yao', pts: [[424, 258], [578, 404]], sharp: true },
      { c: 'yao', pts: [[578, 258], [424, 404]], sharp: true },
      { c: 'roof', pts: [[168, 712], [178, 556], [300, 510], [500, 498], [700, 510], [822, 556], [832, 712]] },
      { c: 'child', pts: [[500, 578], [540, 594], [546, 636], [500, 656], [454, 636], [460, 594], [500, 578]], w: 1.1, closed: true, fill: 1 },
      { c: 'child', pts: [[364, 632], [412, 698], [500, 716], [588, 698], [636, 632]] },
      { c: 'child', pts: [[500, 668], [502, 780], [492, 880], [462, 938]] },
      ...handPair([
        [[356, 452], [292, 386], [278, 276], [308, 172]],
        [[308, 172], [296, 96]],
        [[308, 172], [348, 104]],
        [[308, 172], [384, 158]],
      ]),
    ],
  };

  // ── 小篆 petit sceau (Qin) : courbes régulières, épaisseur constante, symétrie
  const seal = {
    style: 'seal',
    strokes: [
      { c: 'yao', pts: [[432, 108], [568, 236]], sharp: true },
      { c: 'yao', pts: [[568, 108], [432, 236]], sharp: true },
      { c: 'yao', pts: [[432, 262], [568, 390]], sharp: true },
      { c: 'yao', pts: [[568, 262], [432, 390]], sharp: true },
      { c: 'roof', pts: [[176, 716], [176, 600], [200, 560], [300, 552], [500, 552], [700, 552], [800, 560], [824, 600], [824, 716]] },
      { c: 'child', pts: [[500, 712], [446, 690], [440, 634], [500, 606], [560, 634], [554, 690], [500, 712]], closed: true },
      { c: 'child', pts: [[360, 700], [414, 764], [500, 780], [586, 764], [640, 700]] },
      { c: 'child', pts: [[500, 712], [500, 820], [496, 900], [470, 950]] },
      ...handPair([
        [[378, 452], [326, 430], [300, 320], [304, 170], [352, 104]],
        [[306, 190], [384, 190]],
        [[302, 290], [384, 290]],
        [[310, 392], [384, 392]],
      ]),
    ],
  };

  // ── 隸書 lishu (Han) : aplati, angles, un seul « queue d'hirondelle » 燕尾
  const clerical = {
    style: 'clerical',
    strokes: [
      { c: 'yao', pts: [[446, 170], [556, 262]], sharp: true },
      { c: 'yao', pts: [[556, 170], [446, 262]], sharp: true },
      { c: 'yao', pts: [[446, 284], [556, 376]], sharp: true },
      { c: 'yao', pts: [[556, 284], [446, 376]], sharp: true },
      { c: 'roof', pts: [[168, 528], [170, 462], [190, 452], [500, 452], [810, 452], [830, 462], [832, 528]], sharp: true, h: true },
      { c: 'child', pts: [[392, 540], [612, 540], [540, 604]], sharp: true, h: true },
      { c: 'child', pts: [[140, 704], [320, 692], [500, 698], [690, 694], [800, 682], [880, 652]], flare: true },
      { c: 'child', pts: [[534, 600], [524, 640], [524, 810], [478, 846]], sharp: true },
      ...handPair([
        [[352, 130], [344, 260], [336, 402]],
        [[348, 168], [414, 166]],
        [[342, 268], [408, 266]],
        [[336, 396], [414, 392]],
      ], { sharp: true, h: true }),
    ],
  };

  // ── 草書 caoshu : tout le haut devient trois marques, le reste file d'un geste
  const cursive = {
    style: 'brush',
    strokes: [
      { c: 'yao', pts: [[478, 118], [494, 180], [512, 262]] },
      { c: 'roof', pts: [[196, 436], [214, 372], [360, 358], [560, 346], [780, 332], [744, 446]] },
      { c: 'child', pts: [[376, 490], [520, 476], [630, 468], [540, 540], [496, 578]] },
      { c: 'child', pts: [[210, 664], [420, 650], [620, 638], [812, 624]] },
      { c: 'child', pts: [[498, 572], [512, 700], [506, 812], [424, 858]] },
      { c: 'roof', pts: [[744, 446], [600, 470], [420, 486], [380, 490]], w: 0.22 },
      { c: 'yao', pts: [[342, 272], [400, 190], [470, 124]], w: 0.2 },
      { c: 'hand', pts: [[296, 158], [318, 212], [342, 272]] },
      { c: 'hand', pts: [[706, 146], [676, 212], [640, 272]] },
    ],
  };

  window.GLYPHS = { oracle, bronze, seal, clerical, cursive };

  // Régions de découpe (boîte 1000) pour colorer les composantes des glyphes de police.
  window.FONT_REGIONS = {
    kai_xue_trad: {
      yao: [[385, 40], [598, 40], [604, 418], [360, 446], [378, 384], [396, 372], [396, 300], [380, 290], [386, 262], [398, 254], [398, 190], [385, 40]],
      hand: [[0, 0], [1000, 0], [1000, 392], [200, 420], [0, 395]],
      child: [[200, 505], [740, 480], [740, 640], [1000, 640], [1000, 1000], [0, 1000], [0, 640], [200, 640]],
      roof: [[0, 0], [1000, 0], [1000, 1000], [0, 1000]],
    },
    kai_xue_simp: {
      yao: [[400, 20], [580, 20], [580, 262], [400, 262]],
      hand: [[215, 0], [1000, 0], [1000, 236], [600, 256], [380, 268], [236, 275], [236, 215], [215, 215]],
      child: [[236, 370], [740, 360], [740, 560], [1000, 560], [1000, 1000], [0, 1000], [0, 560], [236, 560]],
      roof: [[0, 0], [1000, 0], [1000, 1000], [0, 1000]],
    },
  };
  // cursive (police Liu Jian Mao Cao) : le haut ⺍ et le toit se fondent en un seul geste
  window.FONT_REGIONS.cao_xue_simp = {
    yao: [[400, 30], [820, 30], [820, 205], [400, 205]],
    hand: [[200, 140], [385, 140], [385, 330], [200, 330]],
    child: [[0, 350], [1000, 350], [1000, 1000], [0, 1000]],
    roof: [[0, 0], [1000, 0], [1000, 1000], [0, 1000]],
  };
  // ordre de priorité : la première région qui contient le point gagne
  window.FONT_REGION_ORDER = ['yao', 'hand', 'child', 'roof'];
})();
