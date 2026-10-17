---
name: note-artistique
description: « La note artistique » de la chaîne 墨道 (La voie de l'encre) — contrôle qualité à la fin de chaque grande étape d'une vidéo (plan, voix, rendu image, rendu vidéo) par quatre experts simulés qui notent sur 10 la Technique (niveau des animations, respect du style choisi : shuimo, fond noir…), l'Artistique (direction artistique et exactitude historique et paléographique), le Design (composition, typographie, lisibilité téléphone, habillage YouTube) et le Storytelling (accroche, tension, rythme, rétention). Les corrections proposées pour atteindre 8/10 partout ne sont jamais appliquées sans validation. Utiliser quand l'utilisateur demande « la note artistique », une note, un audit, une critique ou un contrôle qualité d'un plan, d'une voix, d'images fixes ou d'un rendu, et proposer de la lancer d'office à la fin de chaque grande étape d'un épisode (video-shuimo, video-fond-noir).
---

# La note artistique (série 墨道)

Quatre experts exigeants regardent l'étape qui vient de se terminer, la notent, et proposent le strict nécessaire pour
atteindre **8/10 dans chaque domaine**. **Aucune correction sans validation de l'utilisateur** : on note, on propose, on
attend. C'est ce qui évite une boucle d'itérations coûteuse (rendus, crédits ElevenLabs).

Toujours en français. Notes honnêtes : un 8 se mérite, et un 10 n'existe presque pas. Une note complaisante ne sert à
rien ; une note sévère sans correction concrète non plus.

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

## Les quatre experts

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

### 2. Artistique — directeur artistique et historien de l'écriture
Le beau **et** le vrai : la chaîne vit de sa crédibilité.
- **Exactitude** : formes anciennes réelles et bien attribuées (époque, support, lieu) ; dates et dynasties conformes à
  `outils/moteur/remotion/src/periodes.ts` (cartouches et rouleau disent la même chose) ; citations vérifiées
  (caractères exacts, auteur, œuvre) ; étymologies présentées avec leur degré de certitude (thèse classique, débat,
  hypothèse) ; chaque fait de la voix sourcé dans `SOURCES.md`.
- **Cohérence d'univers** : le voyage (une époque = un lieu, un support, une lumière), pigments porteurs de sens
  (homme, coiffe, mouton…) gardés d'un bout à l'autre, sceaux et cartouches au bon endroit.
- **Émotion visuelle** : au moins un plan « tableau » par époque, une image qui pourrait servir de miniature.
- Repères : 8 = rien de faux, univers tenu, quelques images marquantes ; ≤ 6 = une erreur factuelle ou une forme
  inventée (correction **obligatoire**, quelle que soit la note des autres domaines).

### 3. Design — designer graphique et habillage YouTube
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

### 4. Storytelling — scénariste et spécialiste de la rétention
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
   voix ElevenLabs, nouveau rendu complet) et la note visée. Au plus 5 corrections par passe, les plus rentables d'abord.
   Les domaines déjà à 8 ou plus : au plus une suggestion facultative, signalée comme telle.
4. **Demander la validation** (AskUserQuestion, multiSelect : une option par correction, recommandée en premier).
   Ne rien modifier avant la réponse.
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
| Artistique | 7,5 | formes justes ; date du Shuowen à préciser à 0:14 |
| Design | 7 | médaillon et étiquette se touchent à 0:11 ; légende 美食 trop petite |
| Storytelling | 8 | accroche forte ; creux de 45 s dans les Royaumes combattants |

### Technique — 8,5
- ✅ … ⚠️ …
(un bloc par domaine)

### Corrections proposées (pour atteindre 8 partout)
1. [Design · léger] décaler le médaillon de 90 px vers la droite → Design 7 → 7,5
2. [Artistique · léger] …
3. [Storytelling · lourd : nouvelle voix b06] …
```
Puis la question de validation. Rester bref : le tableau et les corrections suffisent, pas de dissertation.

## Garde-fous
- Les quatre experts sont indépendants : ne pas monter une note pour compenser une autre.
- Ne jamais proposer une correction qui contredit un choix déjà validé par l'utilisateur (le noter dans le constat si
  on le trouve discutable, sans le corriger), ni une règle des skills de la chaîne.
- Les corrections lourdes (nouvelles voix, rendu complet) sont regroupées et signalées : l'utilisateur doit voir le
  coût avant de dire oui.
- Une erreur factuelle reste à corriger même si toutes les notes sont à 8 ou plus.
