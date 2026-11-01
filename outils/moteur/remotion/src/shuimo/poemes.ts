// Banque de vers pour le fond shuimo (option poeme de compose, Poeme.tsx) : un distique par entrée, en caractères
// simplifiés (la police Ma Shan Zheng n'a que ceux-là), choisi pour aller avec un paysage de montagnes, d'eau, de
// nuages et d'oiseaux. nuit : vers de lune et de soir, réservés aux plans de nuit (et eux seuls y vont).
// Textes vérifiés sur les éditions courantes ; tous les caractères sont dans Ma Shan Zheng et dans le fangsong.
export type PoemeBanque = { vers: string[]; source: string; nuit?: boolean };

export const POEMES: PoemeBanque[] = [
  { vers: ['众鸟高飞尽', '孤云独去闲'], source: '李白《独坐敬亭山》' },
  { vers: ['空山不见人', '但闻人语响'], source: '王维《鹿柴》' },
  { vers: ['千山鸟飞绝', '万径人踪灭'], source: '柳宗元《江雪》' },
  { vers: ['孤舟蓑笠翁', '独钓寒江雪'], source: '柳宗元《江雪》' },
  { vers: ['白日依山尽', '黄河入海流'], source: '王之涣《登鹳雀楼》' },
  { vers: ['行到水穷处', '坐看云起时'], source: '王维《终南别业》' },
  { vers: ['只在此山中', '云深不知处'], source: '贾岛《寻隐者不遇》' },
  { vers: ['两个黄鹂鸣翠柳', '一行白鹭上青天'], source: '杜甫《绝句四首·其三》' },
  { vers: ['明月松间照', '清泉石上流'], source: '王维《山居秋暝》', nuit: true },
  { vers: ['野旷天低树', '江清月近人'], source: '孟浩然《宿建德江》', nuit: true },
  { vers: ['月出惊山鸟', '时鸣春涧中'], source: '王维《鸟鸣涧》', nuit: true },
];
