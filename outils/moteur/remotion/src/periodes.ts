// Périodes de la série 墨道 : une seule table pour tout ce qui nomme une époque à l'écran — cartouche d'époque sur
// le papier (sceau + nom + dates), sceaux et compteur du rouleau du temps (2D et 3D). Le rouleau et le cartouche
// disent ainsi toujours la même chose.
//
// Volontairement simple : les époques des changements d'écriture (os → bronze → écritures régionales → petit sceau
// → écriture des clercs → régulière) et les grandes dynasties suivantes, sans subdivisions (pas de Han occidentaux /
// orientaux, etc.). Années : négatif = av. J.-C.
//
//   cartouche('zhou') → { zh: '周', name: 'DYNASTIE ZHOU', dates: '1046 – 256 av. J.-C.' }
//   cartouche('han', 'vers l\'an 100 · Xu Shen') → la précision remplace la ligne des dates
//   periodesEntre(-1046, -221) → [周, 戰, 秦] (compteur d'années du rouleau)
export type Periode = { id: string; zh: string; sceau: string; nom: string; debut: number; fin: number | null; ecriture?: string };

export const PERIODES: Periode[] = [
  { id: 'shang', zh: '商', sceau: '商', nom: 'DYNASTIE SHANG', debut: -1600, fin: -1046, ecriture: 'os oraculaires 甲骨文 (Anyang, v. 1250 av. J.-C.)' },
  { id: 'zhou', zh: '周', sceau: '周', nom: 'DYNASTIE ZHOU', debut: -1046, fin: -256, ecriture: 'bronzes 金文' },
  { id: 'royaumes', zh: '戰國', sceau: '戰', nom: 'ROYAUMES COMBATTANTS', debut: -475, fin: -221, ecriture: 'écritures régionales (Chu : bambou, soie)' },
  { id: 'qin', zh: '秦', sceau: '秦', nom: 'DYNASTIE QIN', debut: -221, fin: -206, ecriture: 'petit sceau 小篆, écriture unifiée' },
  { id: 'han', zh: '漢', sceau: '漢', nom: 'DYNASTIE HAN', debut: -206, fin: 220, ecriture: 'écriture des clercs 隸書' },
  { id: 'tang', zh: '唐', sceau: '唐', nom: 'DYNASTIE TANG', debut: 618, fin: 907, ecriture: 'écriture régulière 楷書 classique' },
  { id: 'song', zh: '宋', sceau: '宋', nom: 'DYNASTIE SONG', debut: 960, fin: 1279, ecriture: 'imprimerie, caractères d\'imprimerie' },
  { id: 'yuan', zh: '元', sceau: '元', nom: 'DYNASTIE YUAN', debut: 1271, fin: 1368 },
  { id: 'ming', zh: '明', sceau: '明', nom: 'DYNASTIE MING', debut: 1368, fin: 1644 },
  { id: 'qing', zh: '清', sceau: '清', nom: 'DYNASTIE QING', debut: 1644, fin: 1912 },
  { id: 'aujourdhui', zh: '今', sceau: '今', nom: 'AUJOURD\'HUI', debut: 1956, fin: null, ecriture: 'caractères simplifiés (1956)' },
];

export const periode = (id: string): Periode => {
  const p = PERIODES.find((q) => q.id === id);
  if (!p) throw new Error(`période inconnue : ${id} (voir src/periodes.ts)`);
  return p;
};
const an = (y: number) => `${Math.abs(y)}`;
// « 1046 – 256 av. J.-C. », « 206 av. J.-C. – 220 apr. J.-C. », « 618 – 907 », « depuis 1956 »
export const datesTexte = (p: Periode) => {
  if (p.fin === null) return `depuis ${p.debut}`;
  if (p.debut < 0 && p.fin <= 0) return `${an(p.debut)} – ${an(p.fin)} av. J.-C.`;
  if (p.debut < 0) return `${an(p.debut)} av. J.-C. – ${p.fin} apr. J.-C.`;
  return `${p.debut} – ${p.fin}`;
};
// cartouche d'époque : même sceau et même nom que le rouleau ; `precision` remplace la ligne des dates
export const cartouche = (id: string, precision?: string) => { const p = periode(id); return { zh: p.sceau, name: p.nom, dates: precision ?? datesTexte(p) }; };
// périodes traversées entre deux années, dans l'ordre (compteur d'années du rouleau) : celle de départ `de`, puis
// celles qui commencent avant l'arrivée
export const periodesEntre = (y0: number, y1: number, de?: string) => {
  const D = de ? periode(de) : [...PERIODES].reverse().find((p) => p.debut <= y0) ?? PERIODES[0];
  return [D, ...PERIODES.filter((p) => p.id !== D.id && p.debut > D.debut && p.debut > y0 && p.debut <= y1)];
};
