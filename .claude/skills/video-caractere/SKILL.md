---
name: video-caractere
description: Chef d'orchestre de la création complète d'une vidéo longue 墨道 à partir d'un seul caractère chinois — recherche étymologique, angle et question, voix off (skill voix-off-modo, mouture v2), choix libre et motivé des éléments visuels (fond noir, fond shuimo, rouleau du temps, encre ↔ 3D, coups de pinceau, fiche, cartes, objets 3D, portrait), storyboard, voix ElevenLabs, montage Remotion, aperçus téléphone, rendu final et paquet YouTube — avec des questions et propositions à l'utilisateur à chaque étape clé. Utiliser quand l'utilisateur donne un caractère et demande « fais la vidéo de 福 », « nouvelle vidéo sur 茶 », « on attaque 家 », « crée l'épisode », ou veut lancer / planifier / storyboarder une vidéo complète de la série.
---

# Vidéo 墨道 complète — de l'input (un caractère) à la vidéo publiée

**Input : un caractère** (ex. 家). Tout le reste se décide avec l'utilisateur, par étapes. Modèle complet existant :
`xue/` (學, README, SCRIPT.md, tools/, remotion/). Skills appelées : `voix-off-modo`, `fiche-caractere`,
`fond-shuimo`, `rouleau-du-temps`, `encre-3d`, `coup-de-pinceau`, `motion-design`.

## Principes
- **Proposer, pas imposer** : à chaque point de décision, 2 à 4 options concrètes avec une recommandation en premier
  (AskUserQuestion), puis avancer. Ne pas poser de question dont la réponse se déduit (sources, conventions déjà
  validées ci-dessous).
- **Liberté visuelle motivée** : chaque élément est choisi pour ce caractère et cette scène, jamais par habitude.
  Une vidéo = **un ou deux effets signature**, pas tout le catalogue. Varier d'une vidéo à l'autre.
- **Le voyage** est l'identité de la chaîne : époques, lieux, supports (os, bronze, bambou, pierre, papier).
- L'utilisateur regarde sur **téléphone** : aperçus en images fixes et extraits 720p compressés ; jamais de rendu
  1080p complet sans demande explicite.
- Commits réguliers sur la branche de travail ; un dossier par caractère (ex. `jia/`, sur le modèle de `xue/`).

## Étape 1 — Recherche (sans question, puis synthèse)
- Décomposition : composantes, sens, formes 甲骨文 / 金文 / 小篆 / 隸書 / 楷書 (/ 草書, simplifiée s'il y a lieu),
  nombre de traits, pinyin avec ton. Sources : Shuowen jiezi (entrée exacte), 小學堂 (Academia Sinica), zdic,
  Make Me a Hanzi (ordre des traits). Distinguer **fait attesté / hypothèse / légende**.
- Matière à voyage : époques où le signe change, personnages, objets, lieux, citations classiques, usages actuels
  (où on le voit aujourd'hui, mots courants), anecdotes surprenantes.
- Vérifier sur la chaîne (vidIQ `vidiq_channel_videos`) qu'il n'a pas déjà été traité ; repérer la passerelle vers
  une vidéo existante.
- **Livrer une fiche de recherche courte** (10–15 lignes) avec les « points à vérifier avant publication ».

## Étape 2 — Angle ⟶ questions
Proposer, puis faire choisir :
1. **L'angle / la question du début** — 3 propositions (mystère sur une composante surprenante, énigme d'usage,
   figure d'autorité, enjeu humain). Ex. 家 : « Pourquoi un cochon sous le toit ? » / « Le mot qu'on écrit sur
   toutes les familles… » / Confucius et la famille.
2. **La durée** : 3 min (350–400 mots) ou 4–5 min (480–620 mots) selon la richesse du voyage.
3. **Le parcours** : les 3 à 5 étapes du voyage (époque, lieu, support, ce qui change dans le signe).
4. **La direction visuelle** (voir catalogue) : fond noir, tout shuimo, ou alternance — avec la raison.
5. **La maxime finale** visée (2 propositions).

## Étape 3 — Voix off ⟶ validation
Skill `voix-off-modo`, **mouture v2** : caractère à l'écran + question en 10 s, relance à chaque saut d'époque,
retournement aux deux tiers, 2 phrases concrètes pour 1 poétique, « Alors le pinceau unit… » + pinyin, le caractère
aujourd'hui, maxime, passerelle. Livrer le script par blocs avec `> plan :` et la durée estimée.
Proposer 1–2 variantes d'accroche. Écrire `SCRIPT.md` (sources en bas). **Attendre la validation du texte.**

## Étape 4 — Storyboard et choix des éléments ⟶ validation
Tableau plan par plan : temps, texte, fond, élément visuel, transition, son. Pour chaque bloc, choisir dans le
catalogue ce qui sert le propos et **le justifier en quelques mots**. Proposer 1 ou 2 « moments signature ».
Images fixes de contrôle des plans clés avant d'animer.

### Catalogue (aucun n'est obligatoire)
| Élément | Quand c'est le bon choix | Quand l'éviter |
|---|---|---|
| **Fond noir** (moteur Canvas `xue/src`, halos, couleurs par composante) | analyse technique des traits, métamorphoses d'une écriture à l'autre, archéologie (os, bronze) | caractère poétique / nature où le noir est froid |
| **Fond shuimo** (`fond-shuimo`) — seeds, mouvements pan/push/rise/focus/still, ambiances jour/aube/nuit/brume | nature, voyage, philosophie (山 道 茶) ; respirations entre blocs denses | plans d'analyse fine du glyphe |
| **Tout shuimo** (modèle `src/shuimo_xue/` : estampages, pigments minéraux) | vidéo contemplative, caractère lié au paysage ou au rite | caractère très « technique » ou politique |
| **Rouleau du temps** (`rouleau-du-temps`) | 1 à 3 grands sauts d'époque (≥ 500 ans), retournement ; varier sens, durée, intensité à chaque fois | sauts courts, ou plus de 3 fois par vidéo |
| **Encre ↔ 3D** (`encre-3d`) — révélation, invasion, délavé | personnage ou scène humaine qui « entre » dans l'histoire ; accroche visuelle | décor sans sujet |
| **Coups de pinceau** (`coup-de-pinceau`) | ponctuer une phrase forte, cadrer un plan, synthèse « Alors le pinceau unit… » | en fond permanent |
| **Fiche caractère / tracé dans l'ordre** (`fiche-caractere`, Make Me a Hanzi) | synthèse, nombre de traits, fin | début (spoile la question) |
| **Cartes** (`tools/build_geo.py`, Natural Earth, historical-basemaps) | lieu précis, unification, frontières (国 城) | quand le lieu n'apporte rien |
| **Objets 3D** (Three.js : plastron, ding) | support d'écriture au cœur du propos | décoration |
| **Portrait peint trait à trait** (`tools/build_portrait.py`, ~3 s de tracé) | figure historique nommée ; préciser « portrait imaginé » | personnage anonyme |
| **Métamorphoses par composante** (couleur constante par composante) | toujours utile pour suivre une composante à travers les âges | — |

Règles : un plan d'analyse dense est suivi d'une respiration visuelle ; changer de registre visuel à chaque saut
d'époque ; le caractère (ou sa composante en cours) reste lisible à l'écran presque tout le temps (téléphone).

## Étape 5 — Voix ⟶ choix
- ElevenLabs (outils `creative_list_voices`, `creative_generate_speech`) ; voix de référence actuelle : « Chinese
  narration », `eleven_v4`, noms chinois écrits en caractères dans le texte envoyé (la voix bascule en mandarin) ;
  un clip par bloc. Proposer 2 prises / voix sur l'accroche avant de générer tout le texte.
- Préparation : `tools/prepare_voice.sh` (silences, −18 LUFS) → `tools/build_warp.py` (pauses ⏸, recalage) →
  `tools/build_timeline.py`. Pause de la durée d'un rouleau du temps dans la voix à chaque voyage.

## Étape 6 — Animation et aperçus
- Remotion (`xue/remotion` comme modèle : `sync.mjs` pour les assets, compositions dans `Root.tsx`).
  Navigateur : `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`.
- Contrôle : images fixes (`npx remotion still`) aux instants clés, puis extraits 720p
  (`--scale=0.6666666666666666`, CRF élevé) envoyés avec SendUserFile (chemins absolus).
- Bande-son : musique et bruitages procéduraux (`tools/audio.py`, `tools/build_sfx.py`), voix en ducking.
- Après chaque aperçu, **demander un retour précis** (rythme, lisibilité, un élément en trop ?) et proposer 1–2
  améliorations.

## Étape 7 — Rendu final (sur demande)
Rendu 1080p (`render.sh`), loudnorm −14 LUFS (TP −1,5) → `rendu/`, sous-titres `.srt` (`tools/subtitles.py`),
aperçu 720p compressé pour le téléphone, commit.

## Étape 8 — Paquet YouTube (propositions)
- 3 à 5 titres (question ou curiosité, figure d'autorité si possible) — `vidiq_score_title` ; la première phrase de
  la voix doit tenir la promesse du titre.
- 2 concepts de miniature (caractère + élément surprenant, peu de texte).
- Description avec sources, chapitres (une étape du voyage = un chapitre), tags, écran de fin vers la vidéo
  passerelle.

## Points de décision (récapitulatif)
1. Angle + question · durée · parcours · direction visuelle · maxime (étape 2)
2. Validation du texte (étape 3)
3. Storyboard + moments signature (étape 4)
4. Voix (étape 5)
5. Retours sur aperçus (étape 6)
6. Lancement du rendu final (étape 7)
7. Titre / miniature (étape 8)
