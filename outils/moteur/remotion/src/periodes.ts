// Périodes de l'histoire chinoise (série 墨道) : une seule table pour tout ce qui nomme une époque à l'écran —
// cartouche d'époque sur le papier (sceau + nom + dates), sceaux et compteur du rouleau du temps (2D et 3D).
// Ainsi le rouleau et le cartouche disent toujours la même chose : même nom, même sceau, mêmes dates.
//
// Dates : années, négatif = av. J.-C. (convention des tableaux chronologiques chinois : 夏商周断代工程 pour les
// trois dynasties antiques). Niveau « fin » = la séquence principale, sans chevauchement (c'est elle que le rouleau
// parcourt) ; « groupe » = dynastie entière (周, 漢, 晉, 宋) pour un cartouche plus général ; « parallèle » = régimes
// contemporains d'une période de la séquence (遼, 金, 西夏, 十六國), jamais parcourus par le rouleau.
//
//   cartouche('zhou_occ') → { zh: '周', name: 'ZHOU OCCIDENTAUX', dates: '1046 – 771 av. J.-C.' }
//   cartouche('han_or', 'vers l\'an 100 · Xu Shen') → dates remplacées par la précision donnée
//   periodesEntre(-1046, -300) → [西周, 春秋, 戰國] (pour le compteur d'années du rouleau)
export type Periode = {
  id: string; zh: string; sceau: string; nom: string; debut: number; fin: number | null;
  niveau: 'fin' | 'groupe' | 'parallele'; parent?: string; note?: string;
};

export const PERIODES: Periode[] = [
  { id: 'xia', zh: '夏', sceau: '夏', nom: 'DYNASTIE XIA', debut: -2070, fin: -1600, niveau: 'fin', note: 'dynastie traditionnelle, non attestée par l\'écriture' },
  { id: 'shang', zh: '商', sceau: '商', nom: 'DYNASTIE SHANG', debut: -1600, fin: -1046, niveau: 'fin', note: 'écriture attestée à Anyang (殷墟) à partir de 1250 av. J.-C. environ' },
  { id: 'zhou', zh: '周', sceau: '周', nom: 'DYNASTIE ZHOU', debut: -1046, fin: -256, niveau: 'groupe' },
  { id: 'zhou_occ', zh: '西周', sceau: '周', nom: 'ZHOU OCCIDENTAUX', debut: -1046, fin: -771, niveau: 'fin', parent: 'zhou' },
  { id: 'zhou_or', zh: '東周', sceau: '周', nom: 'ZHOU ORIENTAUX', debut: -770, fin: -256, niveau: 'groupe', parent: 'zhou' },
  { id: 'printemps', zh: '春秋', sceau: '春秋', nom: 'PRINTEMPS ET AUTOMNES', debut: -770, fin: -476, niveau: 'fin', parent: 'zhou_or' },
  { id: 'royaumes', zh: '戰國', sceau: '戰', nom: 'ROYAUMES COMBATTANTS', debut: -475, fin: -221, niveau: 'fin', parent: 'zhou_or' },
  { id: 'qin', zh: '秦', sceau: '秦', nom: 'DYNASTIE QIN', debut: -221, fin: -206, niveau: 'fin' },
  { id: 'han', zh: '漢', sceau: '漢', nom: 'DYNASTIE HAN', debut: -202, fin: 220, niveau: 'groupe' },
  { id: 'han_occ', zh: '西漢', sceau: '漢', nom: 'HAN OCCIDENTAUX', debut: -202, fin: 8, niveau: 'fin', parent: 'han' },
  { id: 'xin', zh: '新', sceau: '新', nom: 'DYNASTIE XIN', debut: 9, fin: 23, niveau: 'fin', note: 'interrègne de Wang Mang' },
  { id: 'han_or', zh: '東漢', sceau: '漢', nom: 'HAN ORIENTAUX', debut: 25, fin: 220, niveau: 'fin', parent: 'han' },
  { id: 'trois_royaumes', zh: '三國', sceau: '三國', nom: 'TROIS ROYAUMES', debut: 220, fin: 280, niveau: 'fin' },
  { id: 'jin', zh: '晉', sceau: '晉', nom: 'DYNASTIE JIN', debut: 266, fin: 420, niveau: 'groupe' },
  { id: 'jin_occ', zh: '西晉', sceau: '晉', nom: 'JIN OCCIDENTAUX', debut: 266, fin: 316, niveau: 'fin', parent: 'jin' },
  { id: 'jin_or', zh: '東晉', sceau: '晉', nom: 'JIN ORIENTAUX', debut: 317, fin: 420, niveau: 'fin', parent: 'jin' },
  { id: 'seize_royaumes', zh: '十六國', sceau: '十六國', nom: 'SEIZE ROYAUMES', debut: 304, fin: 439, niveau: 'parallele', note: 'au nord, pendant les Jin orientaux' },
  { id: 'nord_sud', zh: '南北朝', sceau: '南北', nom: 'DYNASTIES DU NORD ET DU SUD', debut: 420, fin: 589, niveau: 'fin' },
  { id: 'sui', zh: '隋', sceau: '隋', nom: 'DYNASTIE SUI', debut: 581, fin: 618, niveau: 'fin' },
  { id: 'tang', zh: '唐', sceau: '唐', nom: 'DYNASTIE TANG', debut: 618, fin: 907, niveau: 'fin' },
  { id: 'cinq_dynasties', zh: '五代十國', sceau: '五代', nom: 'CINQ DYNASTIES ET DIX ROYAUMES', debut: 907, fin: 979, niveau: 'fin' },
  { id: 'liao', zh: '遼', sceau: '遼', nom: 'DYNASTIE LIAO', debut: 916, fin: 1125, niveau: 'parallele', note: 'empire khitan, au nord des Song' },
  { id: 'song', zh: '宋', sceau: '宋', nom: 'DYNASTIE SONG', debut: 960, fin: 1279, niveau: 'groupe' },
  { id: 'song_nord', zh: '北宋', sceau: '宋', nom: 'SONG DU NORD', debut: 960, fin: 1127, niveau: 'fin', parent: 'song' },
  { id: 'xixia', zh: '西夏', sceau: '西夏', nom: 'XIA OCCIDENTAUX', debut: 1038, fin: 1227, niveau: 'parallele', note: 'royaume tangoute, au nord-ouest' },
  { id: 'jin_jurchen', zh: '金', sceau: '金', nom: 'DYNASTIE JIN (JURCHEN)', debut: 1115, fin: 1234, niveau: 'parallele', note: 'au nord, pendant les Song du Sud' },
  { id: 'song_sud', zh: '南宋', sceau: '宋', nom: 'SONG DU SUD', debut: 1127, fin: 1279, niveau: 'fin', parent: 'song' },
  { id: 'yuan', zh: '元', sceau: '元', nom: 'DYNASTIE YUAN', debut: 1271, fin: 1368, niveau: 'fin' },
  { id: 'ming', zh: '明', sceau: '明', nom: 'DYNASTIE MING', debut: 1368, fin: 1644, niveau: 'fin' },
  { id: 'qing', zh: '清', sceau: '清', nom: 'DYNASTIE QING', debut: 1644, fin: 1912, niveau: 'fin' },
  { id: 'republique', zh: '中華民國', sceau: '民國', nom: 'RÉPUBLIQUE DE CHINE', debut: 1912, fin: 1949, niveau: 'fin' },
  { id: 'rpc', zh: '中華人民共和國', sceau: '今', nom: 'RÉPUBLIQUE POPULAIRE DE CHINE', debut: 1949, fin: null, niveau: 'fin' },
  { id: 'aujourdhui', zh: '今', sceau: '今', nom: 'AUJOURD\'HUI', debut: 2026, fin: null, niveau: 'groupe', note: 'pour « le caractère aujourd\'hui »' },
];

export const periode = (id: string): Periode => {
  const p = PERIODES.find((q) => q.id === id);
  if (!p) throw new Error(`période inconnue : ${id} (voir src/periodes.ts)`);
  return p;
};
const an = (y: number) => `${Math.abs(y)}`;
// « 1046 – 771 av. J.-C. », « 202 av. J.-C. – 8 apr. J.-C. », « 618 – 907 », « depuis 1949 »
export const datesTexte = (p: Periode) => {
  if (p.fin === null) return p.id === 'aujourdhui' ? `${p.debut}` : `depuis ${p.debut}`;
  if (p.debut < 0 && p.fin <= 0) return `${an(p.debut)} – ${an(p.fin)} av. J.-C.`;
  if (p.debut < 0) return `${an(p.debut)} av. J.-C. – ${p.fin} apr. J.-C.`;
  return `${p.debut} – ${p.fin}`;
};
// cartouche d'époque : même sceau et même nom que le rouleau ; `precision` remplace la ligne des dates
export const cartouche = (id: string, precision?: string) => { const p = periode(id); return { zh: p.sceau, name: p.nom, dates: precision ?? datesTexte(p) }; };
// périodes de la séquence principale traversées entre deux années (compteur d'années du rouleau) ; si `de` est un
// groupe (周, 漢…), il remplace ses sous-périodes déjà commencées en y0, pour que le compteur parte du nom du cartouche
export const periodesEntre = (y0: number, y1: number, de?: string) => {
  const [a, b] = y0 < y1 ? [y0, y1] : [y1, y0];
  let L = PERIODES.filter((p) => p.niveau === 'fin' && p.debut <= b && (p.fin ?? 9999) >= a);
  if (de) {
    const D = periode(de);
    if (D.niveau !== 'fin') {
      const inside = (p: Periode): boolean => p.parent === D.id || (!!p.parent && inside(periode(p.parent)));
      L = [D, ...L.filter((p) => !(inside(p) && p.debut <= y0))];
    }
  }
  return L.sort((p, q) => p.debut - q.debut);
};
