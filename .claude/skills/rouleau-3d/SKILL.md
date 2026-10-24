---
name: rouleau-3d
description: Rouleau du temps en 3D (série 墨道) dans une vidéo Remotion — le paysage plein cadre se révèle être une peinture sur un rouleau posé sur une table en zitan verni ; la caméra bascule en vue rasante, le rouleau défile entre ses bâtons (poèmes calligraphiés, sceaux de collection, frise des années sur la soie, pétales de prunier), le compteur d'années doré nomme les périodes traversées ; ralenti, un sceau de pierre descend et frappe le sceau de l'époque d'arrivée, tenue, puis retour au plan 2D et envol du sceau vers le cartouche d'époque. Deux versions : complète (5,3 s) et courte (3,6 s). Utiliser quand l'utilisateur demande le rouleau 3D, une transition d'époque « premium » ou « signature », un passage d'une dynastie à l'autre en 3D, ou veut un rouleau pour une nouvelle vidéo ; pour la frise 2D au-dessus des paysages, utiliser rouleau-du-temps.
---

# Rouleau du temps en 3D (Remotion, three.js)

Validé par l'utilisateur après plusieurs itérations (table et sceau « premium », caméra fluide, date lisible,
tenue sur le sceau après l'impact, glissando de guzheng discret, inscriptions réalistes).

## Où est quoi
- Composant : `outils/moteur/remotion/src/rouleau3d/Rouleau3D.tsx` — `Rouleau3DStage`, `Rouleau3DConfig`,
  `r3Seconds(cfg)`, `r3TagIn(cfg, t)`, `INSCRIPTIONS`, `COLLECT` (valeurs par défaut).
- Démos : compositions `Rouleau3DDemo` (complète, sceau miel) et `Rouleau3DCourtDemo` (courte, sceau rouge),
  `src/rouleau3d/Rouleau3DDemo.tsx` (plan Zhou 2D → rouleau → plan des Royaumes combattants 2D, cartouches).
- **Périodes** : `outils/moteur/remotion/src/periodes.ts` — table unique et volontairement courte (sceau, nom
  chinois, nom du cartouche, dates). Le rouleau en tire ses sceaux, sa frise et les noms du
  compteur ; les cartouches de la vidéo **doivent** en tirer les leurs (`cartouche(id, précision?)`), pour que le
  rouleau et le papier disent la même chose.
- Sons : `outils/moteur/assets/rouleau/rouleau3d_liushui_1..3.wav` (complète) et `rouleau3d_court_liushui_1..3.wav` (courte),
  mixés par `tools/build_sfx_3d.py` avec les 流水拂 de `assets/rouleau3d/liushui_1..3.wav` (souffle moyen 0,38).
  **Glissando de guzheng (validé, tous les épisodes)** : un des trois 流水拂 *liúshuǐ fú* (« l'eau qui coule » : petites vagues de
  5 cordes qui remontent l'instrument en se chevauchant), rendus avec le paquet npm `guzheng-sound` (MIT) :
  1 lent (7 vagues, 55 → 45 ms par corde, note vibrée) · 2 très lent (6 vagues, 75 → 62 ms, note vibrée) · 3 lent et chevauché
  (9 vagues, deux mains en alternance, sans note finale). Souffle moyen (0,38). Choix **varié d'un rouleau à l'autre** :
  `sonRouleau(at)` = (⌊at⌋ mod 3) + 1 (`TimeScroll.tsx`, même calcul dans `bande_son.py`), ou imposé par `son: 1 | 2 | 3` dans
  la configuration du rouleau. Ne plus utiliser les glissandos synthétisés (jugés « harpe ») ni ceux d'ElevenLabs (refusés).
- Anciens sons : `outils/moteur/assets/rouleau/rouleau3d.wav` (complète) et `rouleau3d_court.wav` (courte, cloche une quarte
  plus bas), mixés par `python3 tools/build_sfx_3d.py` (depuis `outils/moteur/`) à partir des bruitages ElevenLabs de
  `assets/rouleau3d/` (souffle, coup de pierre, cloche bianzhong) et d'un glissando de guzheng synthétisé.
- Polices : `ShuimoKai`, `ShuimoLatin`, `ShuimoCaps` (Cinzel, compteur doré), `ShuimoCao` (cursive 刘建毛草, chargée
  par le composant), `ShuimoSceau` = `fonts/ChongxiSeal-sceaux.otf` (**sous-ensemble** de la police sigillaire, 22 Mo
  sinon : un caractère de sceau absent du sous-ensemble ne s'affiche pas).

## Base adaptable : la configuration d'une vidéo
```tsx
import { Rouleau3DConfig, Rouleau3DStage, r3Seconds, r3TagIn } from '../rouleau3d/Rouleau3D';
import { cartouche } from '../periodes';
const R3: Rouleau3DConfig = {
  at: L.rouleaux[0].debut,                        // début (ligne de temps de l'épisode)
  de: 'zhou', vers: 'royaumes',                   // périodes (identifiants de periodes.ts)
  annees: [-1046, -300],                          // facultatif : années du compteur (défaut : début de chaque période)
  variant: 'complet',                             // 'complet' 5,3 s | 'court' 3,6 s
  stone: 'miel',                                  // pierre du sceau : 'miel' (Shoushan) | 'rouge' (sang de poulet)
  fromLand: { seed: 9, mood: 'jour' },            // paysage du plan qui précède (même graine que le plan 2D)
  toLand: { seed: 26, mood: 'brume' },            // paysage du plan qui suit
  midSeeds: [14, 33],                             // facultatif : paysages traversés
  inscriptions: [...],                            // facultatif : poèmes du rouleau (voir plus bas)
  collection: [...],                              // facultatif : sceaux de collection
};
<Sequence from={…} durationInFrames={…}><Landscape seed={9} … /></Sequence>          // plan 2D avant (jusqu'à at + 0,2)
<Rouleau3DStage cfg={R3} />                                                          // plein cadre
<Sequence from={(at + r3Seconds(R3) - 0.3) * fps}><Landscape seed={26} … /></Sequence> // plan 2D après (court : at + 2,9)
<EraTag {...cartouche(R3.de)} a={…} />                         // cartouche de départ, s'efface à at
<EraTag {...cartouche(R3.vers)} a={r3TagIn(R3, t) * …} />     // cartouche d'arrivée : le sceau volant s'y pose (156, 136)
```
- **Raccords** : en version complète, le rouleau commence et finit à la verticale exacte des paysages `fromLand` /
  `toLand` (mêmes graines que les plans 2D, sans halo) : le passage 2D ↔ 3D est invisible. En version courte, l'entrée
  est un fondu vers la vue rasante et la sortie un fondu vers le plan 2D.
- **Ligne de temps de l'épisode** : dans `episode.json`, `{"rouleau3d": "complet", "apres": 0.3}` (ou `"court"`) ;
  `episode.py` réserve 5,3 s ou 3,6 s sans voix, `musique.py` creuse la musique, `bande_son.py` pose le bon son.
- **Inscriptions** : 4 poèmes par défaut (詩經 蒹葭, 楚辭, 柳宗元 江雪 en cursive, 王維) avec signatures et sceaux de nom,
  plus 4 sceaux de collection. Pour une vidéo, préférer des vers **qui contiennent le caractère étudié** (vérifier la
  citation exacte) : `{ x, y, size, font: 'ShuimoKai' | 'ShuimoCao', cols: ['…', '…'], sig, seal, ink }` — colonnes
  lues de droite à gauche, `x` = bord droit en « pixels de plan » (le rouleau fait 6 plans de 1920 : ne rien poser dans
  les plans 2 (1920–3840) et 5 (7680–9600), qui doivent rester identiques aux plans 2D ; `y` ≈ 150–250, dans le ciel).
  La cursive (`ShuimoCao`) n'a que les caractères simplifiés. Nouveaux caractères de sceau :
  `pyftsubset ChongxiSeal.otf --text="…tous les caractères…" --output-file=ChongxiSeal-sceaux.otf` (dans `assets/fonts`).

## Périodes : règles
- La table ne garde que les époques des **changements d'écriture** et les grandes dynasties suivantes, sans
  subdivisions (choix de l'utilisateur) : 商 DYNASTIE SHANG, 周 DYNASTIE ZHOU, 戰 ROYAUMES COMBATTANTS, 秦 DYNASTIE QIN,
  漢 DYNASTIE HAN, 唐 DYNASTIE TANG, 宋 DYNASTIE SONG, 元 DYNASTIE YUAN, 明 DYNASTIE MING, 清 DYNASTIE QING, 今 AUJOURD'HUI.
  Pas de Han occidentaux / orientaux, de Zhou occidentaux, etc.
- Cartouches et rouleau : toujours `cartouche(id)` / `de` / `vers`, jamais un nom écrit à la main.
  `cartouche(id, 'précision')` garde le nom et le sceau mais remplace la ligne des dates (« Anyang · v. 1200 av. J.-C. »).
- Le compteur d'années nomme la période de départ, puis chaque période de la table qui commence avant l'arrivée.
- Une époque manque (ex. royaume de Lu, Printemps et Automnes pour un épisode précis) : l'ajouter à la table, avec
  l'accord de l'utilisateur, plutôt que d'écrire un cartouche à part.

## Règles d'usage (validées avec l'utilisateur)
- **Une fois par vidéo** en version complète, sur le plus grand saut ou le tournant du récit. Deux au plus : la
  seconde en version **courte**, à plus d'1 min 30 de la première, avec une autre pierre (rouge), une autre cloche,
  et si possible une autre lumière ou un autre angle ; jamais trois.
- Aucune voix pendant le rouleau ; la voix reprend sur le plan d'arrivée après l'envol du sceau.
- Les autres changements d'époque : rouleau 2D (skill `rouleau-du-temps`), nuages, ou métamorphose du caractère.

## Rendu et vérification
- three.js en WebGL logiciel : environ 3 à 6 min pour 8 s en 720p. Toujours `--timeout=200000` (polices et peinture du
  rouleau au premier rendu) ; `--concurrency=4` convient.
- Vérifier par images fixes (`outils/video_shuimo/images_fixes.mjs <Composition> <dossier> 0.5 t…`) : entrée, vitesse
  maximale (inscriptions lisibles), impact, tenue, relais du sceau 2D (il doit partir exactement de la place du sceau
  3D), cartouche. Puis extrait 720p pour le téléphone.
- Ne jamais modifier les sources pendant un rendu en plusieurs morceaux.
