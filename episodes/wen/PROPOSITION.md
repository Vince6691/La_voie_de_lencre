# 文 (wén) — proposition tout shuimo, voix off v2 (≈ 4 min 55) — v4

## Cadrage (réponses de l'utilisateur)
- **Angle** : comment un tatouage est-il devenu le mot « culture » ?
- **Étapes** : dynastie Shang (os) · Taibo et la dynastie Zhou (bronze) · Royaumes combattants (bambou, Livre des
  mutations) · dynastie Qin puis Han (sceau, scribes, Xu Shen) · dynastie Song (soldats tatoués, Di Qing) ·
  aujourd'hui (文化). Pas de Confucius (déjà dans le 教).
- **Ton** : clins d'œil (chutes sèches, petits gags visuels), dosage à valider sur la voix off.
- **Forme** : à chaque époque, le support et la forme du signe, et ce qui change ; rétrospective des formes à la
  synthèse ; « la dynastie … ».
- **Clips 3D** : 2 (A Taibo chez le tatoueur ; B les soldats tatoués et Di Qing) — prompts dans `A_FOURNIR.md`.
- **Cartes / 白描** : non demandés → proposés ici : carte de la fuite de Taibo ; portrait de Xu Shen réutilisé.
- **Durée** : ≤ 5 min. **Passerelle** : 美.
- **Histoire validée (v3)** ; v4 = mêmes blocs, outils de la skill et formes réelles du 小學堂.

**Question du début :** comment un tatouage est-il devenu le mot pour dire « culture » ?
**Réponse :** à mesure que le sens quittait la peau (le motif du ciel, puis celui des hommes), la marque quittait le
signe : elle grandit sur le bronze, sort du corps sur le bambou, disparaît au sceau. Chassée, elle s'installe dans 紋.
**Maxime :** avant d'écrire sur l'os, le bronze et le papier, les hommes se sont écrits sur la peau.

**Fil visuel :** la marque sur la poitrine, en **vermillon** — c'est elle que l'œil suit d'époque en époque.
Pigments constants : l'homme à l'encre · la marque en vermillon · le fil de soie de 紋 en malachite.
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
symétrique, les jambes se croisent… et le torse est vide. ⏸ Mais les scribes, eux, écrivent vite. Sur leurs lattes,
puis sous la dynastie Han, la tête devient un point, les bras un trait, les jambes deux obliques qui se croisent.
Quatre traits. Le 文 d'aujourd'hui est né. ⏸
Vers l'an 100, Xu Shen l'explique dans son dictionnaire : « des traits qui se croisent ». Il n'a jamais vu d'os
gravé. Personne ne lui a parlé du tatouage.
> plan : paysage d'hiver ; forme `22` tracée autour d'un axe (le torse vide, aucun vermillon) ; `23` puis `25` en fondu
> net, compteur de traits jusqu'à 4 ; **portrait de Xu Shen réutilisé** (`xue/assets/portrait/xushen_a.jpg`,
> `E.drawPortrait`, 3 s, « portrait imaginé ») ; latte 文，錯畫也 traduite. Gag : un point d'interrogation d'encre
> au-dessus de sa tête.

## 6. Le retournement — 3:15
Chassé du signe, le tatouage s'installe ailleurs : plus tard, on lui ajoute un fil de soie. 紋 : le motif, le
tatouage. ⏸ Et sous la dynastie Song, il redevient… de l'écriture. Pour reconnaître les déserteurs, on tatoue les
soldats au visage, à l'aiguille et à l'encre : le nom de leur armée, en caractères. ⏸ L'un d'eux, Di Qing, devient
chef des armées. L'empereur lui offre un remède pour effacer les caractères. Il refuse : « Je les garde. » ⏸⏸
> plan : la marque vermillon revient, glisse à côté du signe (`coup-de-pinceau`), un fil malachite s'enroule : 紋
> (tracé Make Me a Hanzi). **Clip Seedance B « Soldats »** (12 s), entrée à travers 紋 (`VideoReveal mode="glyphe"`,
> il est à l'écran juste avant) ; au montage, les vrais caractères du nom d'unité posés à l'encre sur la joue, sur
> « en caractères », et gardés sur le visage du général ; sortie au pinceau ; gong (1/3) sur « Je les garde » ;
> silence long.

`[ROULEAU 3 — Song → aujourd'hui, 6 s ; arrivée sur un paysage contemporain]`

## 7. Rétrospective et aujourd'hui — 3:45
Alors le pinceau reprend tout depuis le début. Sur l'os, un homme marqué sur la poitrine. Sur le bronze, un grand
cœur. Sur le bambou, le cœur sort du corps. Avec la dynastie Qin, plus rien ; avec la dynastie Han, quatre traits. ⏸
Ainsi naît wén : le motif, l'écriture, la culture. Au dix-neuvième siècle, les Japonais reprennent la vieille phrase
du Livre des mutations pour traduire « culture » : 文化. La Chine le leur emprunte aussitôt. ⏸
> plan : **scène récapitulative** (`drawBand` de `JiaoV1`) : bandeau horizontal `00` → `14` → `21` → `22` → `25` →
> 文, étiquettes écriture + époque sous chaque forme, deux rubans (homme encre, marque vermillon). Sur chaque mot
> d'époque (repères Scribe `os`, `bronze`, `bambou2`, `qin`, `han`), la forme concernée grossit et la marque clignote
> trois fois en vermillon dans **toutes** les formes où elle existe, le reste au gris ; sur « plus rien », la case du
> sceau reste nette, torse vide. Sur « Ainsi naît », toutes les couleurs reviennent ; 文化 calligraphié.

## 8. Chute et passerelle — 4:10
Avant d'écrire sur l'os, le bronze et le papier, les hommes se sont écrits sur la peau. ⏸
Un autre homme, debout, de face, s'est paré lui aussi… mais sur la tête. Des plumes ? Ou, selon Xu Shen, un gros
mouton. Bon à manger.
> plan : `fiche-caractere` 文 (sceau, pinyin, 4 traits) ; 美 ancien esquissé (forme 小學堂 à récupérer avec
> `xiaoxue.py 美`), la coiffe en gomme-gutte, puis un mouton dodu se dessine à sa place ; coupé net → écran de fin.

---

## Chiffres
≈ 585 mots → ≈ 4 min 40 à 125 mots/min + 14,5 s de rouleaux → **≈ 4 min 55**.

## Outils, étape par étape
1. **Glyphes (fait)** : `xiaoxue.py 文` → `glyphes/wen_xiaoxue/` (26 formes, planche `glyphes/planche_xiaoxue.png`) ;
   traits `glyphes/traits/wen.json`. Reste : 紋 et 美 (`xiaoxue.py` + `npm pack hanzi-writer-data@2.0.1`), puis la
   section `glyphes` d'`episode.json` (polygones `marque` / `homme` par forme) → `donnees_glyphes.py` → `glyphes/donnees.js`.
2. **Voix** (`VOIX.md`) : 文 isolé de l'accroche en IPA `/wə̌n/` (faire écouter) ; 文, 紋, 宋 partagés avec le japonais
   → 2 prises ; balises discrètes (`[curious]` question d'ouverture, `[warmly]` maxime) ; `voix_prep.py`.
3. **Repères** : Scribe → `voix/mots/` → `reperes.py` ; repères-clés dans l'ordre de la voix (`tatouage`, `croix`,
   `coeur`, `taibo`, `roi`, `bambou`, `vide`, `quatre`, `soie`, `caracteres`, `garde`, `os`, `bronze`, `bambou2`,
   `qin`, `han`, `naissance`, `bunka`, `mouton`).
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
- Shuowen : 文，錯畫也。象交文 (confirmé par 小學堂) ; 紋 absent du Shuowen.
- Soldats Song et Di Qing (nom d'unité à trouver) ; 文化 via le japonais (Meiji).
- 美 : Shuowen 甘也，从羊从大.
