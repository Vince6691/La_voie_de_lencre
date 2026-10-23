---
name: note-artistique
description: « La note artistique » de la chaîne 墨道 (La voie de l'encre) — contrôle qualité à la fin de chaque grande étape d'une vidéo (plan, voix, rendu image, rendu vidéo) par cinq experts simulés, très exigeants, qui notent sur 10 la Technique (niveau des animations, respect du style choisi : shuimo, fond noir…), l'Artistique (direction artistique, beauté, univers), l'Historique (exactitude historique, paléographique et des sources), le Design (composition, typographie, lisibilité téléphone, habillage YouTube) et le Storytelling (accroche, tension, rythme, rétention). Les corrections proposées pour atteindre 8/10 partout ne sont jamais appliquées sans validation. Utiliser quand l'utilisateur demande « la note artistique », une note, un audit, une critique ou un contrôle qualité d'un plan, d'une voix, d'images fixes ou d'un rendu, et proposer de la lancer d'office à la fin de chaque grande étape d'un épisode (video-shuimo, video-fond-noir).
---

# La note artistique (série 墨道)

Cinq experts regardent l'étape qui vient de se terminer, la notent, et proposent le strict nécessaire pour atteindre
**8/10 dans chaque domaine**. **Aucune correction sans validation de l'utilisateur** : on note, on propose, on
attend. C'est ce qui évite une boucle d'itérations coûteuse (rendus, crédits ElevenLabs).

Toujours en français. **Exigence maximale** (demande expresse de l'utilisateur : il veut de la grande qualité) : chaque
expert juge comme pour les meilleures chaînes YouTube de vulgarisation et d'animation (niveau Kurzgesagt, Primer,
Nerdwriter, documentaires Arte), pas « bien pour une chaîne indépendante ». **8 = du niveau d'une grande chaîne**, 9 =
remarquable, 10 = presque jamais. Partir de 6 et ne monter que sur preuves. Chaque défaut vu est signalé, même petit ;
ne jamais arrondir vers le haut, ne jamais excuser un défaut par le coût de sa correction (le coût sert à classer les
corrections, pas à adoucir la note). Une note sévère doit toujours venir avec une correction concrète.

## Référence technique : YuV1
La version la plus à jour, qui fait référence pour la **technique, les polices et le style**, est `語` :
`outils/moteur/remotion/src/shuimo_yu/YuV1.tsx` (ligne de temps lue dans `_ligne`, caméra `Cam` à spline de Hermite,
légendes en pastille de papier, polices `ShuimoKai` / `ShuimoLatin` / `ShuimoPinceau` / `ShuimoLegende`, cartouches `cartouche()`,
rouleau 3D, fondus `Win fade`, écran de fin, bruitages). Tout épisode se compare à elle ; un écart par rapport à YuV1 est un
constat, et un écart aux contraintes ci-dessous est une correction **obligatoire**.

## Contraintes techniques (liste de contrôle, vérifiée à chaque passe)
Chaque point manquant est une correction, **sans limite de nombre** (la limite de cinq ne vaut que pour les choix créatifs).
1. **Ligne de temps** : lue dans `reperes.json` (`_ligne`), jamais recalculée ni codée en dur ; aucun temps en secondes
   ajouté à un repère sans raison (tout visuel est calé sur `at(bloc, repère)`).
2. **Polices** : celles de YuV1 (`ShuimoKai`, `ShuimoLatin`, `ShuimoPinceau`, `ShuimoLegende`), chargées avec repli ; aucune police système.
3. **Légendes** : pastille de papier (fond `rgba(246,241,231,0.8)`), ≥ 44 px, jamais dans les 8 % du bas (haut du texte ≤ 975 − 1,7 × taille) ;
   étiquettes ≥ 66 px, rubans ≥ 56 px, dates des cartouches ≥ 36 px ; jamais deux textes qui se touchent.
4. **Cartouches** : toujours `cartouche(id, précision?)` de `src/periodes.ts` (même nom que le rouleau).
5. **Rouleaux** : 2–3 par vidéo, variés ; **un rouleau 3D complet** sur le plus grand saut (au plus un court), `{"rouleau3d": …}` dans `episode.json`.
6. **Caméra** : `Cam` dans chaque scène (clés calées sur les repères, punch sur les révélations) ; un changement visuel toutes les 6–8 s ;
   jamais plus de 2 s de papier vide.
7. **Raccords** : `Win fade` entre scènes (pas de coupe sèche hors rouleaux) ; paysages continus d'une scène à l'autre.
8. **Clips** : plein cadre, entrée par les nuages ou à travers le caractère, sortie au pinceau ; **aucun clip d'exemple ni mention « clip d'exemple »
   dans le rendu final** (sinon un emplacement marqué à l'écran, comme YuV1).
9. **Son** : voix, musique (`musique.py`), **bruitages** listés dans `bruitages` d'`episode.json` (pinceau, sceau, gong ≤ 3, leitmotiv) ; un bruitage ne couvre jamais la voix.
10. **Fin** : écran de fin sur papier ≈ 10 s (`"queue": 10`), marque et prochain caractère dans le tiers gauche, fondu depuis le dernier plan, jamais de fond noir.
11. **Schéma de dossier** : `PROPOSITION.md`, `VOIX.md`, `SOURCES.md`, `NOTES.md`, `episode.json`, `voix/`, `clips/`, `images/`, `audio/`, `apercus/`.
12. **Cartes** : cartes peintes de la bibliothèque (`carte-peinte`) quand la vue existe ; sinon `E.mapLayer` (fond mis en cache), **jamais `E.drawMap` à chaque image** ; texte du cachet contenu dans son cartouche.
13. **Propreté du code** : `npx tsc --noEmit` sans erreur ; images fixes aux moments-clés rendues et regardées avant tout rendu long.

## Quand la lancer
| Étape | Ce qu'on regarde | Matière à lire |
|---|---|---|
| **1. Plan** | proposition, découpage en tableaux, script v1 | `PROPOSITION.md`, `VOIX.md`, `SOURCES.md`, `episode.json` |
| **2. Voix** | texte final et prises choisies | `VOIX.md`, transcription Scribe (`voix/mots/*.json`), durées, `apercus/comparaison_prises*.mp3` |
| **3. Rendu image** | images fixes des moments-clés | planche d'images fixes (`images_fixes.mjs`), au moins 1 image par tableau et par moment fort |
| **4. Rendu vidéo** | brouillon 360p ou final 720p | la vidéo (images extraites toutes les 2–3 s + moments-clés), `bande_son.mp3`, `reperes.json` |

À la fin de chacune de ces étapes, **proposer** la note en une ligne (« Je lance la note artistique ? »). La lancer
d'office seulement si l'utilisateur l'a demandé pour tout l'épisode.

On ne note **que ce que l'étape permet de juger** : au plan, l'expert Technique juge la faisabilité et l'ambition des
animations prévues, pas leur rendu ; à la voix, le Design juge la place prévue pour les légendes et les noms chinois à
l'écran ; etc. Le dire dans le commentaire.

## Les cinq experts

### 1. Technique — l'animateur en chef
Niveau des animations et **respect du style défini au départ** (shuimo : skill `video-shuimo` ; fond noir :
`video-fond-noir` ; autre style : celui fixé à l'étape 0).
- **Style** : papier xuan, encre, pigments minéraux (azurite, malachite, gomme-gutte, vermillon) ; glyphes **réels**
  (estampages, os, bronzes), jamais une police à la place d'une forme ancienne ; paysages shuimo cohérents ; aucun
  élément « clipart », aucun dégradé numérique ou ombre portée hors charte.
- **Mouvement** : courbes d'accélération (rien de linéaire), pinceau avec attaque, plein et sortie (`coup-de-pinceau`),
  caméra qui respire sans à-coups, transitions de la boîte à outils (`rouleau-du-temps`, `rouleau-3d`, `encre-3d`,
  `mosaique-de-mots`, nuages, métamorphose) **dosées** (un seul rouleau 3D complet par vidéo, voir `rouleau-3d`).
- **Propreté** : aucun clignotement, saut d'image, superposition fantôme, texte coupé, glyphe absent (police
  sous-ensemble), décalage voix ↔ image supérieur à 0,15 s par rapport au repère Scribe.
- Repères : 8 = fluide, dans le style, sans défaut visible au téléphone ; 9 = un moment « signature » qu'on retient ;
  ≤ 6 = un défaut qui sort du film (clignotement, glyphe faux, rupture de style).

### 2. Artistique — directeur artistique
Le beau, l'émotion et l'univers.
- **Cohérence d'univers** : le voyage (une époque = un lieu, un support, une lumière, une ambiance sonore), pigments
  porteurs de sens (homme, coiffe, mouton…) gardés d'un bout à l'autre, sceaux et cartouches au bon endroit.
- **Émotion visuelle** : au moins un plan « tableau » par époque, des images qu'on voudrait mettre en fond d'écran, une
  image qui pourrait servir de miniature ; variété des valeurs de plan et des lumières (pas dix plans identiques).
- **Son et musique** : bruitages justes et non « cheap », musique qui accompagne sans couvrir, silences voulus.
- **Goût** : rien de tape-à-l'œil ou de daté, effets au service du sens ; l'élégance avant l'effet.
- Repères : 8 = un film qu'on a envie de regarder pour sa beauté seule ; ≤ 6 = des plans plats, interchangeables, ou un
  effet qui casse l'univers.

### 3. Historique — historien de l'écriture et paléographe
La chaîne vit de sa crédibilité : le moindre faux la fait perdre.
- **Formes** : anciennes réelles et bien attribuées (époque, support, lieu, pièce si possible) ; jamais une forme
  reconstruite présentée comme attestée.
- **Dates et noms** : conformes à `outils/moteur/remotion/src/periodes.ts` (cartouches et rouleau disent la même chose) ;
  noms propres et titres d'œuvres justes (graphie, pinyin, traduction).
- **Citations** : caractères exacts, auteur, œuvre, chapitre ; vérifiées à la source.
- **Étymologies** : présentées avec leur degré de certitude (thèse classique, consensus actuel, débat, hypothèse) ; pas
  de raccourci qui transforme une hypothèse en fait ; nuance quand les spécialistes divergent.
- **Sources** : chaque fait de la voix et de l'écran consigné dans `SOURCES.md`.
- Repères : 8 = rien de faux ni de trompeur, nuances présentes ; ≤ 6 = une erreur factuelle ou une forme inventée
  (correction **obligatoire**, quelle que soit la note des autres domaines).

### 4. Design — designer graphique et habillage YouTube
- **Lisibilité téléphone** : légendes ≥ 40 px en 1080p, contraste sur voile de papier, jamais plus de deux textes à
  l'écran, temps de lecture suffisant (≈ 0,3 s par mot + 0,5 s) ; caractère étudié toujours identifiable.
- **Composition** : règle des tiers, une seule zone d'intérêt à la fois, marges (cartouche en haut à gauche, sceau en
  bas à droite), rien sous la barre de progression YouTube (bas 8 %) ni sous les boutons (droite 10 %) pendant les
  moments-clés ; pas de collision entre étiquettes, médaillons, glyphes.
- **Typographie** : polices de la charte (ShuimoKai, ShuimoLatin/Cormorant, Cinzel pour les capitales dorées), pinyin
  avec tons, hiérarchie claire (caractère › pinyin › traduction).
- **YouTube** : les 5 premières secondes lisibles sans le son ; plan possible pour la miniature (gros caractère, fort
  contraste, une seule idée) ; écran de fin propre (20 s utilisables pour les éléments de fin si prévus) ; chapitres
  qui tombent sur des changements de tableau.
- Repères : 8 = tout se lit au téléphone du premier coup, sans collision ; ≤ 6 = un texte illisible ou masqué.

### 5. Storytelling — scénariste et spécialiste de la rétention
Règles de voix de la chaîne : skill `voix-off-modo` (ne pas les répéter, s'y référer).
- **Accroche (0–30 s)** : une affirmation ou un mystère, une promesse claire, pas d'introduction de chaîne avant ;
  faux départ ou question qui donne envie de rester.
- **Tension** : une énigme posée tôt et résolue tard, des relances toutes les 30–45 s (révélation, retournement, « mais »),
  des personnages (Xu Shen, le danseur…) plutôt que des notions.
- **Rythme** : alternance accélérations / respirations, silences voulus avant les révélations, transitions qui portent
  le sens (un saut d'époque = un rouleau), longueur adaptée (chaque tableau mérite sa durée).
- **Chute** : la boucle se referme sur l'image du début, un mot courant du quotidien, une touche d'humour ou d'émotion,
  l'annonce du prochain caractère.
- Repères : 8 = on ne décroche pas, la révélation surprend ; ≤ 6 = un tunnel d'explication de plus de 40 s sans relance.

## Déroulé (une passe par étape)
1. **Lire / regarder** la matière de l'étape (tableau ci-dessus). Pour une vidéo : extraire des images (toutes les 2–3 s
   et aux repères-clés), écouter la bande son par passages ; ne pas relancer de rendu pour noter.
2. **Noter** chaque domaine sur 10 (demi-points permis), avec 2–4 constats précis et minutés (« 1:42, le médaillon
   recouvre l'étiquette 羊 »), positifs compris.
3. **Proposer des corrections** seulement pour les domaines sous 8 (et toute erreur factuelle) : pour chacune, ce qui
   change, le gain attendu (+0,5 / +1), le **coût** (léger : code ; moyen : nouveau rendu de scène ; lourd : nouvelle
   voix ElevenLabs, nouveau rendu complet) et la note visée. Classer par rentabilité. **Toutes** les corrections nécessaires pour respecter la liste « Contraintes techniques » sont proposées (pas de plafond) ; au plus 5 pour les choix purement créatifs.
   Les domaines déjà à 8 ou plus : au plus une suggestion facultative, signalée comme telle.
4. **Corriger d'office** (consigne permanente de l'utilisateur) tout écart aux contraintes techniques et toute erreur factuelle ; puis **demander la validation**
   (AskUserQuestion, multiSelect : une option par correction, recommandée en premier) pour les choix créatifs et les corrections lourdes
   (nouvelle voix, clips Seedance, bruitages générés, rendu complet).
5. **Appliquer** uniquement ce qui est validé, puis re-noter **sans nouvelle passe complète** : seulement les domaines
   touchés, à partir des images fixes ou extraits concernés. Si un domaine reste sous 8, proposer une seule fois de plus ;
   ensuite, l'utilisateur tranche (on n'insiste pas).
6. Consigner la passe dans `episodes/<pinyin>/NOTES.md` (date, étape, notes, corrections retenues ou refusées), pour
   ne pas reproposer ce qui a été refusé et suivre les progrès d'un épisode à l'autre.

## Format de restitution
```
## Note artistique — Étape 4 · rendu vidéo (brouillon 360p)

| Domaine | Note | En bref |
|---|---|---|
| Technique | 8,5 | rouleaux 3D propres, pinceau vivant ; 1 clignotement à 3:12 |
| Artistique | 7,5 | rouleaux superbes ; Royaumes combattants plats, trois plans identiques |
| Historique | 7 | formes justes ; date du Shuowen à préciser à 0:14 |
| Design | 7 | médaillon et étiquette se touchent à 0:11 ; légende 美食 trop petite |
| Storytelling | 8 | accroche forte ; creux de 45 s dans les Royaumes combattants |

### Technique — 8,5
- ✅ … ⚠️ …
(un bloc par domaine)

### Corrections proposées (pour atteindre 8 partout)
1. [Design · léger] décaler le médaillon de 90 px vers la droite → Design 7 → 7,5
2. [Historique · léger] …
3. [Storytelling · lourd : nouvelle voix b06] …
```
Puis la question de validation. Rester bref : le tableau et les corrections suffisent, pas de dissertation.

## Garde-fous
- Les cinq experts sont indépendants : ne pas monter une note pour compenser une autre.
- Ne jamais proposer une correction qui contredit un choix déjà validé par l'utilisateur (le noter dans le constat si
  on le trouve discutable, sans le corriger), ni une règle des skills de la chaîne.
- Les corrections lourdes (nouvelles voix, rendu complet) sont regroupées et signalées : l'utilisateur doit voir le
  coût avant de dire oui. Les corrections techniques légères (code, durées, légendes, cartouches) sont appliquées sans attendre.
- Une erreur factuelle reste à corriger même si toutes les notes sont à 8 ou plus.
