---
name: video-shuimo
description: Chef d'orchestre d'une vidéo longue 墨道 « tout shuimo » à partir d'un seul caractère chinois — papier xuan et paysages à l'encre, estampages et glyphes réels en pigments minéraux, voyage d'époque en époque avec rouleaux du temps variés, cartes sur papier, portrait peint, clips 3D (Seedance) révélés par les nuages ou à travers le caractère et refermés au pinceau, bandeau comparatif des écritures à la synthèse — voix off v2 (voix-off-modo), voix ElevenLabs synchronisée mot à mot, montage Remotion, aperçus téléphone, avec questions et propositions à chaque étape. Utiliser quand l'utilisateur donne un caractère et veut la vidéo « en shuimo », « sur papier », « comme la version shuimo du 學 », ou lance un nouvel épisode dans ce style ; pour le style fond noir, utiliser video-fond-noir.
---

# Vidéo 墨道 « tout shuimo » — de l'input (un caractère) à la vidéo

**Input : un caractère.** Modèle validé par l'utilisateur : le 學 en shuimo, composition `XueV2`
(`xue/remotion/src/shuimo_v2/XueV2.tsx`), proposition, textes et configuration dans `xue/shuimo_v2/`
(PROPOSITION.md, VOIX.md, episode.json), aperçu `xue/out/preview/xue_shuimo_v2d_720.mp4`.

**Outils communs : `outils/video_shuimo/`** (README) — `voix_prep.py`, `reperes.py`, `musique.py`, pilotés par
l'`episode.json` de l'épisode (modèle : `modele_episode.json`).

**Chaque épisode suit TOUJOURS le même schéma** — le créer avec
`python3 outils/video_shuimo/nouvel_episode.py <pinyin> <caractère>` (jamais à la main), puis respecter :
```
episodes/<pinyin>/
  PROPOSITION.md · VOIX.md · SOURCES.md · episode.json
  voix/ (bNN.mp3 retenu, bNN.wav, segments.json, reperes.json)
  voix/mots/ (bNN.json, minutage Scribe)   voix/prises/ (toutes les prises)
  clips/ (NN_scene.mp4, clips Seedance renommés)   images/ (Nano Banana)   audio/ (musique.wav)   apercus/
```
Composition Remotion : `xue/remotion/src/shuimo_<pinyin>/` (copier `XueV2`, lire la ligne de temps `_ligne` du
fichier de repères au lieu de recalculer les temps), chemins de l'épisode ajoutés à `sync.mjs`. Les fichiers
déposés par l'utilisateur (clips, images) sont renommés et rangés dans ce schéma dès leur arrivée. (Le 學, épisode
pilote, est resté dans `xue/` ; ne pas le prendre comme modèle de rangement.)

Skills appelées : `voix-off-modo` (mouture v2), `fond-shuimo`, `rouleau-du-temps`, `coup-de-pinceau`, `encre-3d`,
`fiche-caractere`, `anthropic-skills:seedance-prompt-generator` / `nano-banana-prompt-generator` pour les clips.

## Principes
- **Proposer, puis faire valider** à chaque étape (2–4 options, recommandation en premier) ; ne pas demander ce
  que ce document fixe déjà.
- **Le voyage** est l'identité de la chaîne : chaque étape = une époque, un lieu, un support. Pas de protagoniste
  unique (refusé par l'utilisateur).
- **Téléphone** : aperçus 720p compressés et images fixes ; jamais de rendu 1080p complet sans demande. Un rendu
  720p de 4 min prend ≈ 50 min : n'en lancer qu'après vérification par images fixes.

## Étape 0 — Questions de cadrage (OBLIGATOIRE, avant toute rédaction)
Ne jamais écrire la proposition sans avoir posé ces questions (outil `AskUserQuestion`, 2–4 options chacune,
recommandation en premier, éclairée par une recherche étymologique rapide) — même si la demande semble complète :
1. **Angle / question d'ouverture** : 3–4 angles possibles pour ce caractère (mystère de forme, faux-ami, objet,
   personnage, lien avec l'épisode précédent).
2. **Époques et étapes du voyage** : lesquelles garder (multi-choix), et les grands sauts pour les rouleaux.
3. **Cartes** : quel(s) lieu(x) et ce qu'elles montrent (capitale, royaumes, itinéraire, diffusion).
4. **Dessin 白描 / portrait** : sujet (personnage historique, scène de maître et d'élève…), un seul ou plusieurs.
5. **Clips 3D (Seedance)** : combien (0–3) et quelles scènes.
6. **Durée et passerelle** : durée cible, caractère suivant annoncé à la fin, rappel des épisodes précédents.
Reprendre dans les questions ce que l'utilisateur a déjà fixé (« au moins une carte » → demander laquelle, pas si).
Consigner les réponses en tête de `PROPOSITION.md` (section « Cadrage »).

## Étape 1 — Recherche et proposition
Recherche étymologique (Shuowen, 小學堂, zdic ; fait / hypothèse / légende). Puis **PROPOSITION.md** : question
d'ouverture, réponse, maxime, voyage en 7–9 blocs avec `> plan :` sous chaque bloc, rouleaux entre les grands sauts,
durée cible 4–5 min, titres, points à vérifier. **Attendre la validation du texte** (l'utilisateur coupe souvent :
appliquer, recalculer la durée).

## Étape 2 — Voix (ElevenLabs)
- Voix **« Chinese narration »** (`KpnSJfGwFIPSRbO89Nsr`), modèle `eleven_v4`, un clip par bloc, un flow par vidéo.
- **Noms chinois écrits en caractères** dans le texte envoyé (la voix bascule en mandarin). Pièges vérifiés :
  - caractères **simplifiés partagés avec le japonais** (学, 学校, 学生, 大学…) → lus en japonais : écrire en
    **traditionnel** (學, 學校, 學生, 大學) même si l'écran montre le simplifié ;
  - un nom isolé d'un caractère (周) peut sortir mal : tournure de l'ancienne vidéo « viennent les 周 » ;
    générer **2 prises** pour les blocs à noms sensibles et faire choisir à l'oreille (je ne peux pas écouter).
- Nombres en lettres ; « … » pour une respiration. Textes dans `VOIX.md`.
- `python3 outils/video_shuimo/voix_prep.py <episode>/episode.json` : silences rognés, −18 LUFS → `voix/bNN.wav`.

## Étape 3 — Synchronisation mot à mot (indispensable)
Ne jamais estimer la position des mots : transcrire chaque prise avec **Scribe** (`creative_transcribe_audio`,
`connect_from` = le nœud de la prise ; gratuit) ; pour une prise non active d'un nœud à plusieurs variations,
l'épingler d'abord (`creative_add_flow_asset_node`). Télécharger `words_download_url` → `voix/mots/bNN.json`, puis
`reperes.py` : expressions-clés (`reperes_cles` de l'episode.json) → début exact du premier mot, et ligne de temps
absolue (`sequence` : clips, silences, rouleaux, pause avant la révélation). Toute l'animation se cale sur
`at(bloc, repère)` ; ne jamais coder les temps en dur.

## Étape 4 — Montage (composants validés)
| Élément | Règle validée |
|---|---|
| **Accroche** | papier nu, le caractère tracé trait par trait (Make Me a Hanzi, `drawStrokes`, **sans texture de pinceau** : `brush: false`), la composante-clé s'allume en pigment puis s'efface ; fondu net entre formes (pas de superposition) |
| **Paysages** | `fond-shuimo` (`compose(seed…)`), un seed et une ambiance par époque ; respiration après chaque plan dense |
| **Estampages + glyphes réels** | `InkStage` (paramétrable `T`, `travel`) : plastron / bronze tamponnés, signe révélé en blanc puis à l'encre, composantes en **pigments constants** (爻 gomme-gutte, 冖 malachite, mains vermillon, 子 azurite) |
| **Rouleaux du temps** | 2–3 par vidéo, **variés** (5 s classique avec le caractère en curseur, 3,5 s rapide, 6 s long) ; voix muette pendant le voyage ; cartouche d'époque posé par le sceau |
| **Cartes** | moteur Canvas `E.drawMap(…, { paper: true })` : mer = papier, régions historiques, marqueurs (Anyang, Hao, Xianyang, Japon 1949 / Chine 1956) ; dans `MapPanel` au début du bloc concerné |
| **Portrait** | `E.drawPortrait` à l'encre, tracé en 3 s, mention « portrait imaginé » |
| **Mise en valeur d'une composante** | l'allumer en pigment + halo, le reste pâlit — **jamais de voile noir** (incompris) |
| **Clips 3D (Seedance 8–15 s)** | plein cadre, jamais de fenêtre partielle. **Entrée** : à travers le caractère (`VideoReveal mode="glyphe"`) **si un caractère est à l'écran juste avant**, sinon mer de nuages (`CloudReveal`, nuages aquarelle de la banque). **Sortie** : coups de pinceau (`outMode="pinceau"`) dans tous les cas. Ralentir le clip si le plan est plus long (`rate = min(0.9, durée_clip / durée_plan)`) |
| **Synthèse** | bandeau des écritures (甲骨文 → 學 → 学) + rubans de composantes ; il arrive **après** le tracé final et chaque composante citée par la voix reste en couleur, le reste grisé, exactement sur son mot |
| **Fin** | maxime, passerelle vers le caractère suivant (esquissé), coupe nette sur un écran de fin ; pas de queue musicale |
| **Textes** | lisibles sur téléphone : étiquettes ≥ 66 px (caractère ≥ 100 px), légendes ≥ 38 px, rubans ≥ 56 px |
| **Musique** | `musique.py` : bourdon + guzheng, creux sous les rouleaux et la pause avant la révélation, coupure nette |

Révélations disponibles mais non retenues (sur demande) : lavis + taches, goutte d'encre, rouleau suspendu
(`VideoReveal`), brume (`VideoEncre`, jugée bizarre).

## Étape 5 — Vérifier, puis rendre
- Images fixes aux instants clés (`npx remotion still … --scale=0.25`, planche contact) ; demi-résolution pour juger
  la taille des textes.
- Rendu 720p : `--scale=0.6666666666666666 --crf=30`, puis loudnorm −14 LUFS → `xue/out/preview/`. Navigateur :
  `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`.
- Retours de l'utilisateur → corriger → images fixes → nouveau rendu. Commit et push à chaque étape.

## Pièges techniques rencontrés
- Moteur Canvas (`loadLegacy`) : ne rendre les composants qu'une fois chargé (`ready`), dessiner en
  `useLayoutEffect` ; `drawStrokes` respecte l'opacité de l'appelant (`ctx.globalAlpha`).
- Vidéo dans un canvas (`onVideoFrame`) : retenir la capture jusqu'au premier dessin (`delayRender`), sinon images
  vides aléatoires.
- `src/data/` est ignoré par git : les données générées vivent dans le dossier de l'épisode et `sync.mjs` les copie.
- Ne jamais `pkill -f` un motif présent dans sa propre commande (tue le shell) : `TaskStop` ou `ps | grep "[m]otif"`.
