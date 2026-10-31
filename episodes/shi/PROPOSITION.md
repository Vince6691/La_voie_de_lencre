# 師 / 师 (shī) — proposition tout shuimo, voix off v2 (≈ 5 min 30) — v3

## Cadrage (réponses de l'utilisateur)
- **Angle** : une armée cachée dans 老师.
- **Étapes** : la dynastie Shang (les trois 師) · la dynastie Zhou (les quatorze armées, 京師) · **帀, le pied qui fait
  le tour** · le 師氏 · Jin (師曠, le maître aveugle) · la dynastie Tang (韓愈 et le 師說) · 1956 (師 devient 师, dans la
  synthèse).
- **Animation signature** : « l'armée devient classe » (essaim de minuscules soldats à l'encre).
- **Carte** : une seule — les quatorze armées des Zhou (西六師 / 成周八師).
- **白描** : 師曠 au qin.
- **Clips 3D** : 1 — la ronde de nuit autour du camp (illustre 帀).
- **Durée** : ≈ 5 min. **Passerelle** : rappel du **文** (épisode précédent) au début ; fin sur **父**
  (« 一日為師，終身為父 »).
- **v2 (retours du 31/10)** : rappel du 文 au lieu du 教 ; la date repositionnée par rapport à l'Égypte, sans parler
  des os ; le lion supprimé, son temps donné à 帀 (nouveau bloc 5) ; le clip du tir à l'arc (déjà utilisé dans le 學)
  remplacé par la ronde de nuit.

---

**Question du début :** comment le mot « professeur » peut-il cacher deux mille cinq cents soldats ?
**Réponse :** 師 est d'abord l'armée qui campe — une butte au centre, le cercle des pas des sentinelles autour ;
l'officier 師氏, qui garde la porte du palais, instruit aussi les princes — le chef de troupe devient précepteur, puis
maître de tout art.
**Maxime :** le maître rassemble toujours des hommes autour de lui ; il ne les mène plus à la guerre, mais à comprendre.

Couleurs constantes (pigments) : 𠂤 la butte → **ocre rouge** (赭石) · 帀 le pied qui fait le tour → **malachite** · le
maître (la figure unique face aux élèves, dans l'animation signature) → **vermillon**.
`⏸` = pause (1–2 s) ; `⏸⏸` = silence long (un seul, avant la révélation) ; `[ROULEAU]` = voix muette.

---

## Animation signature — « l'armée devient classe »
Un essaim de **≈ 2 500 minuscules soldats à l'encre** (petits 人 de deux traits, 4 poses pré-dessinées au pinceau :
debout lance haute, en marche, de dos, assis), vus du dessus en légère plongée (perspective CSS sur le canvas), qui
revient dans toute la vidéo et porte le récit :
1. **Le camp** (bloc 3) : la première forme 𠂤 s'ouvre ; les soldats s'en déversent comme de l'encre qui coule et se
   rangent en **trois carrés, droite / centre / gauche**, autour d'une butte peinte au lavis ocre. Tambour grave.
2. **La ronde** (bloc 5) : une file de sentinelles se détache et marche en **anneau** autour du camp ; leurs pas
   laissent des empreintes malachite qui, vues de haut, **dessinent 帀**.
3. **Le pivot — l'armée s'assied** (bloc 6, après le silence long) : les lances s'abaissent l'une après l'autre
   (vague), les soldats se retournent vers une **seule figure vermillon** et s'asseyent en rangées d'élèves ; la
   caméra recule, la classe entière se **condense dans la silhouette de 師** (échantillonnage comme `mosaique-de-mots`),
   qui devient le caractère de bronze à l'encre. Punch +3,5 %, tambour très doux, gong.
4. **Écho** (bloc 10) : une rangée d'élèves miniature sous le 師 final.

Technique : moteur Canvas, positions déterministes (seed), une trajectoire par soldat interpolée entre formations
(`camp → ronde → classe → silhouette`), retard par soldat selon sa distance au centre (vague), atlas de sprites
dessiné une fois — jamais de redessin vectoriel par image. Composant réutilisable `src/essaim/Essaim.tsx`
(formations décrites en JSON) : resservira pour 軍, 眾, 族…

---

## 1. Accroche — 0:00
师. Le maître, le professeur. En Chine, on appelle son enseignant lǎoshī. ⏸ Pourtant, il y a trois mille ans, ce
caractère ne désignait pas un homme debout devant une classe… mais deux mille cinq cents hommes, debout devant
l'ennemi. ⏸ [curious] Comment une armée est-elle devenue un maître ?
> plan : papier nu ; 师 tracé trait par trait (`brush: false`), puis 老师 ; fondu net vers 師 traditionnel ; à
> « deux mille cinq cents », la moitié gauche 𠂤 s'allume en ocre et une poussière de minuscules soldats
> grouille un instant dans ses traits ; à « un maître », retour au 师.

## 2. L'enjeu et le rappel du 文 — 0:18
Un caractère chinois, c'est un assemblage de petits dessins. Dans l'épisode précédent, 文, l'homme tatoué, est devenu
la culture : l'art de changer les hommes par l'écriture plutôt que par les armes. ⏸ Notre caractère, lui, a fait ce
chemin tout seul. Il est parti des armes.
> plan : 文 ancien en pigments (l'homme azurite, la marque vermillon) ; à « plutôt que par les armes », une lance
> au trait se pose à côté de lui puis s'efface ; 文 glisse et cède la place à 師 ; « parti des armes » : 師 se
> rétracte en point d'encre ; paysage shuimo de la dynastie Shang (aube, brume, plaine) qui se peint autour.

## 3. La dynastie Shang : les trois 師 — 0:35
Il y a trois mille deux cents ans… en Égypte, Ramsès II fait tailler ses colosses dans la falaise d'Abou Simbel. ⏸
Au même moment, en Chine, apparaît la plus ancienne forme connue de notre caractère. ⏸ Elle ne tient qu'en un seul dessin,
à deux bosses. Une butte de terre, peut-être, là où la troupe dresse son camp. ⏸ Et dans les plus anciens textes
chinois, on lit : « Le roi forme trois 師 : à droite, au centre, à gauche. » Le 師, c'est l'armée qui campe.
> plan : **frise des civilisations** au trait sur le papier : une bande horizontale où l'Égypte (silhouette des
> colosses d'Abou Simbel en lavis ocre pâle) et la Chine sont alignées sur la même date — une ligne verticale
> vermillon relie les deux ; **deux étiquettes au plus** : « Ramsès II » puis, à sa place, « vers 1250 av. J.-C. »
> (le cartouche de la dynastie Shang dit le reste) ; la caméra glisse de l'Égypte vers la
> Chine ; 𠂤 se trace en grand (forme réelle, encre), en ocre ; caméra poussée sur les deux bosses ;
> **signature 1 — le camp** : les soldats se déversent du signe et se rangent en trois carrés autour de la butte au
> mot « droite, centre, gauche » (un carré par mot), tambour.

`[ROULEAU 1 — dynastie Shang → dynastie Zhou, 2D, 4 s : 𠂤 en curseur, il gagne son 帀 en passant le sceau 周]`

## 4. La dynastie Zhou : les quatorze armées — 1:25
La dynastie Zhou renverse les Shang. Sa puissance tient en quatorze armées : six à l'ouest, autour de la capitale,
et huit à l'est, dans la nouvelle ville de Luoyi. ⏸ La capitale elle-même prend un nom : 京師, la grande ville où
campe l'armée. ⏸ Mais sur les bronzes, notre signe a changé : à côté de la butte, un second dessin est apparu.
> plan : **carte 1** (papier ; chercher d'abord dans `assets/cartes`) : Zongzhou et Luoyi, 6 puis 8 petits sceaux
> de camps qui s'allument sur « six » et « huit » ; 京師 en ruban ; bronze tamponné, 師 de bronze révélé en blanc
> puis à l'encre, la butte en ocre, 帀 encore gris sur « un second dessin ».

## 5. 帀 : le pied qui fait le tour — 1:55
Dans ce second dessin, la tradition voit un pied. ⏸ En Chine ancienne, un pied posé sur une ligne veut dire « partir », « aller ».
Retournez-le, tête en bas : le pied revient sur ses pas. Il fait le tour. ⏸ Car deux mille cinq cents hommes ne dorment pas sans
garde. Chaque nuit, des sentinelles font la ronde autour du camp. ⏸ La butte au centre, le cercle des pas tout
autour : voilà le 師. ⏸ Ce pied qui tourne existe toujours : écrit 匝, il veut dire « un tour ».
> plan (**un seul texte à la fois**, au centre) : 之 ancien (pied sur une ligne) en malachite, seul à l'écran : il
> **avance** de gauche à droite en laissant des empreintes, étiquette « partir » ; sur « Retournez-le », l'étiquette
> s'efface, le signe bascule tête en bas (0,6 s ; la forme Shang de 帀 est un 之 renversé) et devient 帀, étiquette « faire le tour » ; **clip Seedance** (ronde de
> nuit), entrée à travers le caractère 帀 (`VideoReveal mode="glyphe"`), sortie au pinceau, aucun texte pendant le
> clip ; **signature 2 — la ronde** : les empreintes malachite des sentinelles bouclent l'anneau autour de la butte
> ocre et dessinent 帀, sans étiquette ; **seulement ensuite**, 匝 seul en grand, 帀 en malachite dedans, ruban
> « un tour ».

## 6. Le 師氏 : l'armée s'assied — 2:45
Or, à la porte du palais veille un officier, le 師氏. Et qui mieux que celui qui garde la porte du roi pour veiller
sur ce qu'il a de plus précieux : ses fils ? ⏸ Alors, chaque jour, il les instruit : la vertu, et la manière de se
conduire. ⏸ Le chef de troupe est devenu précepteur. ⏸⏸
Et l'armée… s'est assise.
> plan : porte de palais Zhou en lavis (fond-shuimo) ; à gauche, une file de gardes au trait ; le 師氏 au centre,
> son contour **vermillon** ; sur « ses fils ? », la caméra glisse vers la droite : trois jeunes princes assis,
> lattes de bambou ouvertes, derrière la porte qu'il garde — sur « précepteur »,
> il se tourne des gardes vers les princes ; silence long ; **signature 3 — la classe** sur « s'est assise » : les
> lances tombent en vague, les soldats se tournent vers la figure vermillon et s'asseyent, recul, la classe se
> condense en 師. Gong.

## 7. Jin : le maître aveugle — 3:25
[curious] Mais si le maître ne commande plus… de quoi est-il maître ? ⏸ Peu à peu, 師 désigne celui qui maîtrise un
art. Au royaume de Jin vit le plus célèbre musicien de l'Antiquité, 師曠,
le maître Kuang. Il est aveugle. ⏸ On raconte qu'un soir, quand il joua du qin devant le duc, seize paires de grues
noires descendirent danser dans la cour. ⏸ « Maître », chez lui, n'est plus un grade : c'est un nom.
> plan : **dessin 白描** de 師曠 au qin, yeux clos, peint trait à trait en 3 s (« portrait imaginé ») ; les cordes
> vibrent en fines ondes d'encre ; sur « grues », des grues au lavis traversent le cadre et dansent (légende : « selon
> le Han Feizi »).

`[ROULEAU 2 — Jin → dynastie Tang, rouleau 3D complet, 5,3 s, sceau miel ; arrivée sur Chang'an au crépuscule]`

## 8. La dynastie Tang : le Discours sur le maître — 4:00
Et faut-il être vieux pour être maître ? ⏸ Sous la dynastie Tang, chez les lettrés, avoir un maître est devenu presque honteux : apprendre auprès d'un autre,
c'est s'abaisser. Le lettré 韓愈 leur répond par un texte bref, le Discours sur le maître. ⏸ [warmly] « Le maître,
écrit-il, est celui qui transmet la Voie, enseigne le métier et dissipe les doutes. » Et qu'importe son âge ou son
rang : là où est la Voie, là est le maître.
> plan : **tableau** — arrivée du rouleau 3D sur Chang'an au crépuscule (fond-shuimo, toits et pagode de l'Oie
> sauvage en lavis), la caméra entre par une fenêtre : 韓愈 écrivant à la lampe (image Nano Banana passée à
> l'encre avec `encre-3d`, mode délavé : le lettré garde sa couleur, la pièce se fond dans le lavis) ; puis, sur le
> papier de son rouleau, 師者所以傳道受業解惑也 calligraphié en écriture courante, colonne par colonne ;
> sur chacun des trois verbes, 傳道 / 受業 / 解惑 s'allument l'un après l'autre (or) ; sur « âge ou rang », un
> jeune garçon et un vieillard au trait, de même taille, de part et d'autre de 師.

## 9. Synthèse — 4:30
Reprenons. Dans toutes ses formes, 師 garde deux dessins. La butte, où campe l'armée. Et le pied qui en fait le tour.
⏸ En 1956, l'écriture rapide du pinceau tasse la butte en deux traits : 师. ⏸ Ainsi naît shī, le maître. On le lit
dans 老師, le professeur… et dans 師傅, le maître artisan. Ou le chauffeur de taxi.
> plan : **scène récapitulative** (`drawBand`) : 𠂤 (dynastie Shang) → 師 bronze → petit sceau → clercs → régulière 師
> → cursive → 师 ; rubans ocre (butte) et malachite (帀) ; chaque composante clignote trois fois dans toutes les formes
> sur son mot ; **accident** : sur « 1956 », la forme cursive grossit, la butte se tasse en deux traits (ocre), 师 au
> dessus ; « Ainsi naît » : toutes les couleurs reviennent ; 老師 / 師傅 sur enseignes, un taxi au trait passe.

## 10. Chute et passerelle — 5:00
De l'armée qui campe à la salle de classe, le 師 n'a jamais cessé de rassembler des hommes autour de lui.
Seulement, il ne les mène plus à la guerre. Il les mène à comprendre. ⏸ Un proverbe le dit : maître un jour, père pour
la vie. Et le père, 父… à l'origine, c'est une main qui tient quelque chose. Un bâton ? Une hache de pierre ? Nous
le découvrirons bientôt.
> plan : **écho de la signature** : une rangée d'élèves au trait sous le 師 ; fiche caractère 师 (sceau, pinyin,
> 6 traits) ; 一日為師，終身為父 en colonne ; 父 ancien esquissé (main + hache en vermillon) ; fondu → **écran de fin
> sur papier ≈ 10 s** (marque 墨之道 tiers gauche, « Prochain caractère : 父 »), musique de fin bamboo grove.

---

## Chiffres
≈ 665 mots à 125 mots/min (≈ 5 min 20) + 9,3 s de rouleaux + pauses → **≈ 5 min 30**, écran de fin compris
(v3 : phrase de 許慎 et « Ses hommes gardent l'entrée » coupées ; « pourquoi » du 師氏 et deux questions de relance
ajoutés). Si trop long à l'écoute : « avoir un maître est devenu presque honteux… s'abaisser » (−6 s).
Repères de temps : « trois mille deux cents ans… Ramsès II », « La dynastie Zhou renverse », « Bien plus tard »,
« Au royaume de Jin », « Sous la dynastie Tang », « En 1956 ».

## Sons
- **Leitmotiv** : tambour de guerre grave au camp (signature 1), pas sourds et crépitement de torches sous la ronde
  (signature 2), qui reviennent **une seule fois, très doux (0,25)**, juste avant que l'armée s'asseye, puis gong.
- Vent du désert, très bref, sous Abou Simbel.
- Qin : quelques notes pincées sous 師曠 (synthétisées dans `sfx_src/fabriquer_shi.py`), cri de grue lointain.
- Pinceau sur les tracés, sceau sur les révélations, feuilletage sur le 師說.

## Titres possibles
1. Pourquoi « professeur » cache une armée en chinois
2. 2 500 soldats dans un seul caractère chinois
3. 师 : comment une armée est devenue un maître

## Éléments visuels — récapitulatif
| Élément | Où | Statut |
|---|---|---|
| **Essaim « l'armée devient classe »** | blocs 1, 3, 5, 6, 10 | **nouveau composant** `src/essaim/Essaim.tsx` |
| **Frise des civilisations (Égypte / Chine)** | bloc 3 | nouveau, au trait et lavis ; réutilisable (repère de date de chaque épisode) |
| Pied 之 → 帀 qui pivote | bloc 5 | glyphes réels (`xiaoxue.py`) |
| Carte — les 14 armées Zhou | bloc 4 | carte peinte existante `chine_centre_nord` (soie_song), cachets Zongzhou / Luoyi |
| Dessin 白描 de 師曠 au qin | bloc 7 | **image à fournir** (prompt dans `A_FOURNIR.md`) |
| Clip — la ronde de nuit autour du camp | bloc 5 | **à fournir** (Seedance) |
| Image — 韓愈 écrivant à la lampe | bloc 8 | **à fournir** (Nano Banana), passée à l'encre (`encre-3d`) |
| Porte du palais, gardes et princes au trait | bloc 6 | lavis + baimiao |
| Glyphes : 𠂤, 師 bronze, petit sceau, clercs, cursive, 师 ; 之, 帀, 匝 ; 父 ancien | blocs 3–10 | `xiaoxue.py` |
| Rouleaux | 1 (2D), 2 (3D complet) | `rouleau-du-temps`, `rouleau-3d` ; rouleau 2 de `zhou` à `tang` ; ajouter `jin` (ROYAUME DE JIN, `compteur: false`) à `periodes.ts` pour le cartouche du bloc 7 |

## À vérifier avant enregistrement
- **Synchronisme** : Ramsès II (vers −1279 / −1213) et les premières inscriptions Shang (règne de Wu Ding, vers
  −1250 / −1190) : « au même moment » tient ; Abou Simbel est bâti pendant le règne.
- **Phrase des trois 師** : 「丁酉貞：王作三師，右中左」 (合集 33006) — numéro et lecture ; dite « dans les plus
  anciens textes chinois » (pas de mention des os).
- **𠂤** : « petite butte » (Shuowen 𠂤，小𨸏也) est la lecture la plus répandue ; d'autres lectures existent →
  « peut-être » dans la voix, à garder.
- **帀 = 之 retourné** : 說文「帀，周也。从反㞢而帀也」 ; c'est la lecture de Xu Shen, discutée par certains
  paléographes (帀 comme élément phonétique) — envisager « selon la lecture traditionnelle » en légende discrète.
- **匝** : forme tardive de 帀 (« un tour »).
- **西六師 / 成周八師** : inscriptions de bronze (盠方彝, 禹鼎…).
- **師氏** : 周禮·地官 (« 以三德教國子… 使其屬帥四夷之隸…守王之門外 ») — texte compilé tardivement : légende
  discrète « selon les Rites des Zhou ».
- **師曠** et les grues : 韓非子·十過 (légende) — seize paires (二八) de grues noires.
- **師說** : vers 802 ; « 無貴無賤，無長無少，道之所存，師之所存也 ».
- **师 en 1956** : vérifier qu'il figure dans le Plan de simplification de 1956 et son origine cursive.
- **父** : main + hache de pierre (lecture courante ; autre lecture : main + bâton).
