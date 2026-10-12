# 文 (wén) — proposition tout shuimo, voix off v2 (≈ 5 min 10) — v4

## Cadrage (réponses de l'utilisateur)
- **Angle** : comment un tatouage est-il devenu le mot « culture » ?
- **Étapes** : dynastie Shang (os) · Taibo et la dynastie Zhou (bronze) · Royaumes combattants (bambou, Livre des
  mutations) · dynastie Qin puis Han (sceau, scribes, Tiying et l'empereur Wen) · dynastie Song (soldats tatoués, Di Qing) ·
  aujourd'hui (文化). Pas de Confucius ni de Xu Shen (déjà dans le 學 et le 教) : à la place, Tiying et l'empereur Wen.
- **Ton** : clins d'œil (chutes sèches, petits gags visuels), dosage à valider sur la voix off.
- **Forme** : à chaque époque, le support et la forme du signe, et ce qui change ; rétrospective des formes à la
  synthèse : scène récapitulative par composante, comme le 學 et le 教 ; « la dynastie … ».
- **Clips 3D** : 2 (A Taibo chez le tatoueur ; B les soldats tatoués et Di Qing) — prompts dans `A_FOURNIR.md`.
- **Carte** : la fuite de Taibo. **Image classique** (au lieu du 白描) : Tiying et l'empereur Wen, Nano Banana, révélée ; style choisi après essais (fresque de tombe Han, gongbi sur soie, estampage de pierre Han).
- **Durée** : ≤ 5 min. **Passerelle** : 美.
- **Histoire validée (v3)** ; v4 = mêmes blocs, outils de la skill et formes réelles du 小學堂.

**Question du début :** comment un tatouage est-il devenu le mot pour dire « culture » ?
**Réponse :** à mesure que le sens quittait la peau (le motif du ciel, puis celui des hommes), la marque quittait le
signe : elle grandit sur le bronze, sort du corps sur le bambou, disparaît au sceau. Chassée, elle s'installe dans 紋.
**Maxime :** avant d'écrire sur l'os, le bronze et le papier, les hommes se sont écrits sur la peau.

**Fil visuel :** la marque sur la poitrine, en **vermillon** — c'est elle que l'œil suit d'époque en époque.
Pigments constants : l'homme en azurite (tête, bras, jambes) · la marque en vermillon · le fil de soie de 紋 en malachite.
`⏸` = pause (1–2 s) ; `⏸⏸` = silence long (un seul) ; `[ROULEAU]` = voix muette.

## Formes retenues (小學堂, `glyphes/wen_xiaoxue/`, détail dans `glyphes/SOURCE.md`)
| Époque | Support | Forme | Fichier | Ce qui change |
|---|---|---|---|---|
| Dynastie Shang | os | homme de face, V sur la poitrine | `00` (甲3940) ; variantes `01` (croix), `02` (sans marque) | — |
| Dynastie Zhou | bronze | corps en losange, **grand cœur** | `14` (師害簋) ; `08` (文方鼎) petite marque | la marque grandit |
| Royaumes combattants | bambou (Chu) | le cœur **sort du corps**, posé dessous ; ou plus de marque | `21` (上博·孔子詩論) ; `20` (包山) | la marque quitte la poitrine |
| Dynastie Qin | petit sceau | corps symétrique, jambes croisées, torse vide | `22` (說文) | plus de marque |
| Scribes Qin → dynastie Han | écriture des scribes | tête, bras, deux obliques croisées | `23` (睡虎地) → `25` (熹平石經) | 4 traits |
| Aujourd'hui | régulière | 文, 4 traits | `glyphes/traits/wen.json` (Make Me a Hanzi) | — |

---

## 1. Accroche — 0:00
文. Aujourd'hui, ce caractère veut dire écriture… culture. ⏸ Pourtant, regardez-le bien : c'est un homme, debout, de
face. Et il y a trois mille ans, il portait sur la poitrine… un tatouage. Comment un tatouage est-il devenu le mot
pour dire la culture ?
> plan : papier nu ; 文 tracé trait par trait (`traits/wen.json`, `drawStrokes`, `brush: false`) + bruitage pinceau ;
> à « un homme », fondu net vers la forme Shang `00` ; à « un tatouage », le V s'allume en vermillon (punch caméra
> +3,5 %) ; à « la culture », retour au 文 moderne. Caméra : poussée lente sur la poitrine.

## 2. La dynastie Shang — l'os — 0:15
Vers 1200 avant notre ère, à Anyang, capitale de la dynastie Shang. Sur les os de divination, le signe est déjà là :
deux bras ouverts, deux jambes écartées… et au milieu du torse, une marque. Une croix, un V, parfois un cœur. ⏸
Selon le savant japonais Shirakawa Shizuka, on la peignait sur la poitrine des morts. La dynastie Shang l'emploie
d'ailleurs pour honorer ses rois défunts. ⏸ Le tatouage est un honneur. Il va devenir… une excellente excuse.
> plan : paysage `fond-shuimo` (seed Shang, aube, brume) ; `InkStage` : plastron tamponné (bruitage sceau), fissures,
> signe `00` révélé en blanc puis à l'encre (bruitage gravure) ; caméra en poussée sur le torse ; sur « une croix,
> un V, parfois un cœur », les formes `01`, `00`, `03` se succèdent (fondu net), la marque en vermillon. Mention
> « hypothèse » sous Shirakawa ; lavis sombre sur « poitrine des morts ».

`[ROULEAU 1 — Shang → Zhou, 5 s, classique : la forme 00 en curseur, son V vermillon brille au passage des sceaux]`

## 3. La dynastie Zhou — le bronze — 0:55
Plus à l'ouest, dans le clan qui fondera la dynastie Zhou, le vieux duc veut laisser le pouvoir à son plus jeune fils.
Problème : l'aîné, Taibo, est l'héritier. ⏸ Alors Taibo s'enfuit vers le sud… et se fait tatouer. Un prince tatoué ne
peut pas régner. Carrière terminée, mission accomplie. ⏸ Son neveu, lui, régnera. On l'appellera le roi Wen. Le
roi 文.
Quand la dynastie Zhou s'installe, le signe est coulé dans le bronze. Le corps s'épaissit, et la marque devient un
vrai cœur, bien dessiné. Le tatouage n'a jamais été aussi grand.
> plan : **carte** (`MapPanel`, `E.mapLayer` + `E.mapDeco`, `paper: true`) : pays des Zhou (vallée de la Wei), flèche
> de la fuite de Taibo vers le bas Yangzi (futur Wu), panoramique caméra le long de la flèche ; **clip Seedance A
> « Taibo »** (entrée `CloudReveal`, la carte n'étant pas un caractère ; sortie au pinceau). Puis estampage de bronze
> (`InkStage`) : forme `14`, le grand cœur s'allume en vermillon avec halo ; un instant, `00` et `14` côte à côte
> (« la marque grandit ») ; 文王 calligraphié (étiquette ≥ 66 px).

## 4. Les Royaumes combattants — le bambou — 1:45
Quelques siècles plus tard, la Chine se déchire en Royaumes combattants. Un commentaire du Livre des mutations écrit
alors : « Observez les 文 du ciel pour suivre les saisons. Observez les 文 des hommes pour transformer le monde. » ⏸
Les 文 du ciel : les étoiles, les nuages. Les 文 des hommes : les rites, les textes, les manières. Le motif quitte la
peau. ⏸ Et sur les lattes de bambou, le signe suit le mouvement : souvent, la marque disparaît. Parfois, le cœur sort
du corps… et se pose juste en dessous.
> plan : nuit en lavis (`fond-shuimo`, ambiance nuit, lune), les étoiles se relient en motifs ; citation
> 觀乎天文…觀乎人文，以化成天下 en lattes de bambou, traduite (légende ≥ 38 px) ; gros plan caméra sur une latte :
> forme `21`, le cœur vermillon glisse hors du torse et se pose dessous ; puis forme `20` (sans marque).

`[ROULEAU 2 — Royaumes combattants → Qin, 3,5 s, rapide, sens inverse, impact sec]`

## 5. La dynastie Qin, puis Han — le sceau et le pinceau — 2:30
221 avant notre ère : la dynastie Qin impose une seule écriture, le petit sceau. Le corps s'allonge, parfaitement
symétrique, les jambes se croisent… et le torse est vide. ⏸ Mais les scribes, eux, écrivent vite : la tête devient
un point, les bras un trait, les jambes deux obliques qui se croisent. Quatre traits. Le 文 d'aujourd'hui est né. ⏸
Sous la dynastie Han, une jeune fille de quinze ans, Tiying, écrit à l'empereur : son père va être mutilé, elle
demande à devenir esclave à sa place. L'empereur, ému, abolit les châtiments du corps… et avec eux, le tatouage du
visage. ⏸ Son nom ? L'empereur Wen. L'empereur 文.
> plan : paysage d'hiver ; forme `22` tracée autour d'un axe (le torse vide, aucun vermillon) ; `23` puis `25` en fondu
> net, compteur de traits jusqu'à 4. Puis **image « Tiying » retenue : fresque de tombe corrigée**
> (`images/tiying_fresque_2.jpg`), révélée par `MorphEncre` (sens `to3d`, paire `tiying`, champ centré sur la lettre) :
> lavis sur le papier, la couleur naît de la lettre de bambou et gagne toute la fresque ; caméra en poussée sur la
> lettre puis glissement vers le visage de l'empereur ; 緹縈 puis 漢文帝 calligraphiés dans le vide de droite ; sur
> « L'empereur 文 », le 文 passe au vermillon (punch) ; sortie au pinceau. Essai validable :
> composition `WenTiying` (`xue/remotion/src/shuimo_wen/TiyingReveal.tsx`), aperçu `apercus/tiying_revelation_720.mp4`.

## 6. Le retournement — 3:15
Chassé du signe, le tatouage s'installe ailleurs : plus tard, on lui ajoute un fil de soie. 紋 : le motif, le
tatouage. ⏸ Mais sous la dynastie Song, il revient… et cette fois, c'est de l'écriture. Pour reconnaître les déserteurs, on tatoue les
soldats au visage, à l'aiguille et à l'encre : le nom de leur armée, en caractères. ⏸ L'un d'eux, Di Qing, devient
chef des armées. L'empereur lui offre un remède pour effacer les caractères. Il refuse : « Je les garde. » ⏸⏸
> plan : la marque vermillon revient, glisse à côté du signe (`coup-de-pinceau`), un fil malachite s'enroule : 紋
> (tracé Make Me a Hanzi). **Clip Seedance B « Soldats »** (12 s), entrée à travers 紋 (`VideoReveal mode="glyphe"`,
> il est à l'écran juste avant) ; au montage, les vrais caractères du nom d'unité posés à l'encre sur la joue, sur
> « en caractères », et gardés sur le visage du général ; sortie au pinceau ; gong (1/3) sur « Je les garde » ;
> silence long.

`[ROULEAU 3 — Song → aujourd'hui, 6 s ; arrivée sur un paysage contemporain]`

## 7. Aujourd'hui et scène récapitulative — 3:45
Aujourd'hui, 文 s'écrit en quatre traits, en Chine comme au Japon. Reprenons. Dans toutes ses formes, il garde un seul
dessin : un homme, debout, de face. La tête, en haut. Les bras, grands ouverts. Les jambes, qui se croisent. ⏸ Et sur
la poitrine, la marque : un V sur l'os, un cœur sur le bronze… puis plus rien. ⏸
Ainsi naît wén : le motif, l'écriture, la culture. On le lit dans 中文, le chinois, et dans 文化, la culture : un mot
que les Japonais ont tiré du Livre des mutations, au dix-neuvième siècle.
> plan : **scène récapitulative obligatoire** (`drawBand` de `JiaoV1`, même construction que le 學 et le 教) :
> bandeau **horizontal** de toutes les formes réelles `00` (os) → `14` (bronze) → `21` (bambou) → `22` (petit sceau)
> → `25` (clercs) → 文 (régulière), étiquette écriture + époque sous chaque forme, et un **ruban par composante**
> sous le bandeau : l'homme en azurite (sous-parties tête, bras, jambes), la marque en vermillon.
> **Clignotement** sur le mot de chaque composante (repères Scribe `formes`, `tete`, `bras`, `jambes`, `marque`) :
> elle clignote trois fois **dans toutes les formes à la fois**, dans son pigment, le reste du bandeau au gris, son
> ruban s'épaissit. Sur « la marque » : V, cœur et cœur sorti clignotent en vermillon dans `00`, `14`, `21` ; sur
> « plus rien », un halo pointillé vide s'allume sur la poitrine de `22`, `25` et 文.
> **Fin** : toutes les couleurs reviennent ensemble sur « Ainsi naît » (repère `naissance`) ; puis 中文 et 文化
> calligraphiés.

## 8. Chute et passerelle — 4:10
Avant d'écrire sur l'os, le bronze et le papier, les hommes se sont écrits sur la peau. ⏸
Un autre homme, debout, de face, s'est paré lui aussi… mais sur la tête. Des plumes ? Ou, selon le plus vieux
dictionnaire chinois, un gros mouton. Bon à manger.
> plan : `fiche-caractere` 文 (sceau, pinyin, 4 traits) ; 美 ancien esquissé (forme 小學堂 à récupérer avec
> `xiaoxue.py 美`), la coiffe en gomme-gutte, puis un mouton dodu se dessine à sa place ; coupé net → écran de fin.

---

## Chiffres
≈ 622 mots → ≈ 5 min à 125 mots/min + 14,5 s de rouleaux → **≈ 5 min 10** (léger dépassement, comme le 教).

## Outils, étape par étape
1. **Glyphes (fait)** : `xiaoxue.py 文` → `glyphes/wen_xiaoxue/` (26 formes, planche `glyphes/planche_xiaoxue.png`) ;
   traits `glyphes/traits/wen.json`. Reste : 紋 et 美 (`xiaoxue.py` + `npm pack hanzi-writer-data@2.0.1`), puis la
   section `glyphes` d'`episode.json` (polygones `marque` / `homme` par forme) → `donnees_glyphes.py` → `glyphes/donnees.js`.
2. **Voix** (`VOIX.md`) : 文 isolé de l'accroche en IPA `/wə̌n/` (faire écouter) ; 文, 紋, 宋 partagés avec le japonais
   → 2 prises ; balises discrètes (`[curious]` question d'ouverture, `[warmly]` maxime) ; `voix_prep.py`.
3. **Repères** : Scribe → `voix/mots/` → `reperes.py` ; repères-clés dans l'ordre de la voix (`tatouage`, `croix`,
   `coeur`, `taibo`, `roi`, `bambou`, `vide`, `quatre`, `soie`, `caracteres`, `tiying`, `wen`, `garde`,
   `formes`, `tete`, `bras`, `jambes`, `marque`, `naissance`, `bunka`, `mouton`).
4. **Musique et bruitages** : `musique.py` ; sfx pinceau, sceau, gravure, gong ≤ 3 (sources du 教), aiguille
   (nouveau) ; liste `bruitages` d'`episode.json` ; écoute sans vidéo avec `bande_son.py`.
5. **Composition** `xue/remotion/src/shuimo_wen/WenV1.tsx` copiée de `JiaoV1` (caméra `Cam`, cartes en cache,
   `drawBand`), chemins ajoutés à `sync.mjs`.
6. **Aperçus** : `apercu.sh WenV1 scene …` puis `brouillon`, `final` 720p ; `rendu_morceaux.sh` si > 2 h.

## Titres possibles
1. Il s'est fait tatouer pour ne pas devenir roi
2. Comment un tatouage est devenu le mot « culture »
3. Ce caractère chinois était un homme tatoué

## À vérifier avant enregistrement (détail dans SOURCES.md)
- Marque funéraire = hypothèse de Shirakawa ; rois Shang nommés 文 (文武丁 / 文丁).
- Taibo : Shiji, 吳太伯世家 ; roi Wen = neveu de Taibo.
- 彖傳 du 賁 : 觀乎天文…以化成天下 (« un commentaire », Royaumes combattants).
- Forme Chu `21` : variante avec 心 dessous (lue 文 par 小學堂) — garder « parfois » dans la voix.
- Tiying 緹縈 et l'abolition des châtiments corporels (dont 黥, le tatouage du visage) par l'empereur Wen des Han, 167 av. J.-C. : Shiji, 孝文本紀 et 扁鵲倉公列傳.
- 紋 absent du Shuowen.
- Soldats Song et Di Qing (nom d'unité à trouver) ; 文化 via le japonais (Meiji).
- 美 : Shuowen 甘也，从羊从大.
