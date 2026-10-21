---
name: mosaique-de-mots
description: Transition « mosaïque de mots » (série 墨道) dans une vidéo Remotion — des milliers de mots modernes qui contiennent le caractère étudié couvrent le papier xuan ; très gros plans sur quelques mots repérés (cadre vermillon qui se trace, sous-titre), recul en légère rotation pendant qu'une vague de couleur et un tapotement allument les mots placés dans la silhouette du caractère, qui apparaît de loin ; temps d'arrêt avec reflet ; puis les mots se condensent en un seul caractère à l'encre posé où la scène suivante l'attend (ou s'effacent). Effets d'atelier : fibres du papier à l'échelle de la caméra, flou de profondeur, lumière rasante, poussière, vignettage, ambiance sonore. Utiliser quand l'utilisateur demande la mosaïque, « l'effet des mots qui dessinent le caractère », une transition qui montre combien un caractère est répandu, une accroche ou un passage vers le présent (« aujourd'hui, on le trouve partout »), ou « refais la mosaïque du 文 ».
---

# Mosaïque de mots (Remotion)

Validée sur l'accroche du 文 (« premium », après plusieurs retours) : très gros plans d'abord, pour ne pas montrer
l'ensemble ; seuls les mots repérés sont en noir et vermillon ; au recul, tous les mots du caractère se colorent très
vite avec un tapotement ; **léger temps d'arrêt** une fois le caractère constitué, avant de passer à la suite.
Ce n'est pas réservé à l'intro : c'est une transition (vers le présent, vers la synthèse, d'un chapitre à l'autre).

## Où est quoi
- Composant : `outils/moteur/remotion/src/mosaique/MosaicTransition.tsx` — `MosaicTransition`, `MosaicConfig`, `mosaicSeconds`.
- Démo : composition `MosaiqueDemo` (`src/mosaique/MosaiqueDemo.tsx`, 学 : 学生 → 大学 → 数学, puis 学 à l'encre).
- Original (avec la cascade du temps qui suit) : `Mosaic` dans `src/shuimo_wen/WenV1.tsx` (calé sur les repères de la
  voix b01).
- Sons et tuile de fibres : `outils/moteur/assets/mosaique/` (`ambiance.wav` atelier, `tapotement.wav`, `sceau.wav`,
  `xuan_fibres.png`), copiés dans `public/mosaique/` par `node sync.mjs`. Fond : `shuimo/paper.jpg`.
- Canvas seul (pas de moteur legacy) ; la composition doit charger les polices `ShuimoKai` et `ShuimoLatin`
  (voir `MosaiqueDemo`).

## Utilisation
```tsx
const MOS: MosaicConfig = {
  glyph: '文',
  words: ['中文', '文化', '文字', '文学', '天文', '英文', '法文', /* une vingtaine ou plus */],
  title: '文 · wén',                                         // facultatif, avant le 1er gros plan
  focus: [                                                   // 1 à 4 gros plans, temps de la voix
    { word: '中文', at: 4.06, label: '中文 · le chinois', near: [860, 330] },
    { word: '文化', at: 6.62, label: '文化 · la culture', near: [1000, 560] },
    { word: '法文', at: 9.74, label: '法文 · le français', near: [1180, 760] },
  ],
  zoomOut: 10.5,          // recul + vague de couleur + tapotement (≈ 0,75 s après le dernier mot)
  hold: 11.7,             // caractère complet : arrêt, reflet, coup de sceau (prévoir ≈ 1,3 s de silence dans la voix)
  out: 13.1,              // sortie
  outro: 'condense',      // ou 'fade'
  outroTo: { x: 960, y: 520, size: 600 },                    // où la scène suivante reprend le caractère
};
<Sequence from={Math.round(T0 * fps)} durationInFrames={Math.round(mosaicSeconds(MOS) * fps) + 1}>
  <MosaicTransition cfg={MOS} />
</Sequence>
```
- **Temps locaux** (0 = début de la séquence) ; les calculer depuis les repères de la voix (`at(bloc, repère) - T0`),
  jamais en dur dans un épisode. Le premier gros plan arrive à `focus[0].at` : laisser ≈ 1 s avant (plan très serré
  sur le caractère du premier mot, déjà en couleur).
- **Mots** : courants, variés, tous avec le caractère ; les mots repérés sont posés dans le trait (`near` = point du
  caractère plein cadre, 1920 × 1080, centre 960 × 540 ; sans `near`, répartis du haut vers le bas). Ordre conseillé :
  trait du haut → jambe gauche → jambe droite (la caméra glisse dans le sens de lecture).
- **Police** : LXGW WenKai **TC** ; certains simplifiés sortent en forme traditionnelle ou de secours (术 → 朮) :
  vérifier sur une image fixe en gros plan et retirer les mots fautifs.
- **Sortie** : `condense` pour enchaîner sur une scène qui part du caractère (cascade du temps, fiche, tracé) en le
  posant à `outroTo` ; `fade` pour revenir au papier. `paper: false` pour poser la mosaïque sur un autre fond,
  `sound: false` si l'épisode gère ses bruitages (liste `bruitages` d'episode.json).
- Grille : `cell` (50 × 28, texte 20 px) et `glyphSize` (880) ; un caractère à beaucoup de traits demande une grille
  plus fine ou un `glyphSize` plus grand pour rester lisible de loin.

## Règles
- Prévoir dans la voix un **silence pendant l'arrêt** (pause de ≈ 1,3 s dans le bloc : `sequence` → `pause`) ; la voix
  reprend sur la sortie.
- Une seule mosaïque par vidéo (effet fort) ; en transition, la faire courte (2 gros plans, `hold` → `out` ≈ 1 s).
- Vérifier par images fixes : premier gros plan, chaque mot repéré, milieu du recul, arrêt, sortie ; puis extrait
  (`outils/video_shuimo/apercu.sh <Composition> scene <début> <fin>`) pour juger le rythme et le son.
