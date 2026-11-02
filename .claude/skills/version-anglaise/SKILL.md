---
name: version-anglaise
description: Version anglaise complète d'un épisode 墨之道 pour la chaîne anglophone « Strokes and History » — adaptation orale de la voix off (VOIX_EN.md, repères anglais), voix ElevenLabs Bradford en eleven_v4, transcription Scribe et recalage automatique du montage, textes à l'écran traduits par l'option de langue de la composition (T(fr, en), cartouches et rouleaux en anglais), musique recalculée, rendu 1440p --langue en, sous-titres anglais avec pinyin, description YouTube anglaise. Le français n'est jamais modifié ni supprimé. Utiliser quand l'utilisateur demande la traduction anglaise, la version anglaise, « pour un public anglophone », la voix anglaise ou « fais comme pour le 學 en anglais ».
---

# Version anglaise d'un épisode (série 墨之道 → Strokes and History)

Validé sur le 學 (`episodes/xue`, novembre 2026). Toujours dialoguer en français. **Règle d'or : on ne supprime rien et
on ne renomme rien** ; tout ce qui est anglais est à côté du français, marqué 🇬🇧 et suffixé `_en` / `_EN`.

## Fichiers (même dossier d'épisode)
| | 🇫🇷 français (intact) | 🇬🇧 anglais |
|---|---|---|
| voix off | `VOIX.md` | `VOIX_EN.md` (texte + tableau des repères + notes) |
| textes à l'écran | composition | `TEXTES_ECRAN_EN.md` (table fr → en), puis `T(fr, en)` dans la composition |
| configuration | `episode.json` | `episode_en.json` (copie : `voix: voix_en`, `reperes: voix_en/reperes.json`, `musique: audio/musique_en.wav`, `reperes_cles` anglais, `sous_titres_remplacements`) |
| voix | `voix/` | `voix_en/` (`bNN.mp3`, `bNN.wav`, `mots/`, `prises/`, `reperes.json`) |
| vidéo | `rendu/<p>_1440p.mp4` | `rendu/<p>_en_1440p.mp4` |
| sous-titres | `rendu/<p>_fr.srt` | `rendu/<p>_en.srt` |
| description | `rendu/description_youtube.txt` | `rendu/description_youtube_en.txt` |
Ajouter une section « Langues » au `README.md` de l'épisode.

## Étape 1 — Texte anglais (à faire valider avant toute génération)
- Adapter avec la skill `voiceover-en-translator` (adaptation orale, pas mot à mot) : phrases ≤ 20 mots, fragments,
  pas de jargon ; la maxime finale garde sa gravité. Viser un peu **moins de mots** que le français.
- **Mêmes blocs** (b01…bNN) et **mêmes moments** que le français : chaque repère de `reperes_cles` doit avoir son
  équivalent anglais, **même nom**, dans l'ordre de la voix. Tableau des repères dans `VOIX_EN.md` (bloc, repère,
  expression française, expression anglaise) ; le vérifier par script (recherche séquentielle comme `reperes.py`).
- Noms chinois en caractères (comme en français, la voix les dit en mandarin) ; simplifiés partagés avec le japonais
  en traditionnel (學校, 學生, 大學). Dates : « twelve hundred and fifty BC ». Nombres en lettres.
- Puis `TEXTES_ECRAN_EN.md` : relever **tous** les textes affichés (cartouches et précisions, légendes, étiquettes,
  cartes, bandeau, fiche caractère, écran de fin) et leur traduction. Conventions : « SHANG DYNASTY », « c. 1250 BC »,
  « 206 BC – AD 220 », « 11th century BC », « 8 strokes ».

## Étape 2 — Voix (ElevenLabs)
- **Voix retenue : « Bradford - Expressive and Articulate » (`NNl6r8mD7vthiJatiJt1`), modèle `eleven_v4`,
  réglages par défaut, sans balise d'émotion** (validé sur le 學). Essais refusés : Oliver (« Clean, British and
  Steady ») en multilingual v2, v3 et v4, trop expressif en v4 même avec stabilité 0,85.
- Un flow par épisode (« <caractère> — voix off anglaise »), une prise par bloc (la voix est validée) ; 2 prises
  seulement pour un bloc à noms difficiles. Télécharger dans `voix_en/prises/bNN_bradford_v4.mp3`, copier la prise
  retenue en `voix_en/bNN.mp3`.
- `python outils/video_shuimo/voix_prep.py episodes/<p>/episode_en.json` (silences, −18 LUFS → `voix_en/bNN.wav`).
- Faire écouter un extrait dans le montage (étape 4) plutôt que les prises seules.

## Étape 3 — Synchronisation
- Scribe sur chaque prise retenue (`creative_transcribe_audio`, `connect_from` = le nœud de la prise ; une prise
  unique est active sur son nœud d'origine, sinon `creative_add_flow_asset_node`) → `voix_en/mots/bNN.json`
  (`{"words": […]}`).
- `python outils/video_shuimo/reperes.py episodes/<p>/episode_en.json` puis
  `python outils/video_shuimo/musique.py episodes/<p>/episode_en.json` (la musique suit la ligne de temps anglaise ;
  bruitages, rouleaux, pause et musique de fin se recalent seuls sur les repères).
- `node outils/moteur/remotion/sync.mjs` copie `voix_en/` et `voix_en/reperes.json` → `src/data/episodes/<p>_en.json`.

## Étape 4 — Composition anglaise
- Modèle : `shuimo_v2/XueV2.tsx`. Tout ce qui dépend de la ligne de temps est dans une fabrique
  `creerX(rep, LANG, VOIX, MUSIQUE)` ; `T(fr, en)` pour chaque texte ; `cartouche(id, précision, LANG)` ; `lang: LANG`
  dans les configurations des rouleaux 2D (`TimeScrollConfig`) et 3D (`Rouleau3DConfig`) — périodes et « BC / AD »
  viennent de `src/periodes.ts` (`nomPeriode`, `datesTexte`). Le français reste la valeur par défaut partout : les
  autres épisodes ne bougent pas (ne pas répercuter dans les épisodes que l'utilisateur met à jour lui-même).
- Exports : `export const { X, X_SECONDS } = creerX(rep, 'fr', 'voix', 'musique.wav')` et
  `export const { X: XEN, X_SECONDS: X_EN_SECONDS } = creerX(repEN, 'en', 'voix_en', 'musique_en.wav')` ;
  composition `<Id>EN` dans `Root.tsx`.
- Écran de fin : marque **« STROKES AND HISTORY »** (sceau 墨之道 et « Mò zhī dào » gardés), « Next character »,
  « jiào · to teach ».
- Vérifier : `npx tsc --noEmit`, puis la version française identique au rendu final (images fixes, PSNR ≥ 40 dB),
  puis une planche d'images fixes anglaises (repères clés : étiquettes, chaque cartouche, rouleaux, bandeau, fiche, fin)
  et un extrait 540p avec le son (`--concurrency=8`).

## Étape 5 — Rendu et paquet YouTube
- `node outils/video_shuimo/rendu_final.mjs <Id>EN <p> --langue en` (skill `rendu-youtube` : 1440p, contrôles, planches).
- Sous-titres : `python outils/video_shuimo/sous_titres.py episodes/<p>/episode_en.json` → `<p>_en.srt`. Dans
  `episode_en.json`, `sous_titres_remplacements` met le **pinyin devant chaque nom chinois** (« Anyang 安阳 »,
  « Shang 商 », « 學 (xué) », « xuéxiào 學校 ») ; règle du caractère seul en premier (`(?<!大)學(?![校生])`).
- Chapitres : `python outils/video_shuimo/chapitres.py episodes/<p>/episode_en.json` (temps anglais).
- Description : skill `description-youtube`, traduite ; première ligne « Learn Chinese characters faster and
  remember them for good, through the history of China. Character level HSK<n> » ; bloc « Language notes » ; **sans**
  la liste des chaînes francophones (demander à l'utilisateur s'il a des chaînes anglophones à citer).

## Pièges rencontrés
- Le rendu en parallèle à 19 fils a échoué une fois sur un clip vidéo (« No frame found at position… ») : le même
  passage rendu seul passe ; pour un extrait, `--concurrency=8` ; le rendu final refait seul un morceau en échec.
- Scribe transcrit les balises d'émotion v4 comme des mots : `sous_titres.py` les ignore, mais elles ne doivent jamais
  figurer dans les `reperes_cles`.
- La voix anglaise est plus longue que le français (≈ +17 s sur 4 min pour le 學) : rien à faire, la ligne de temps suit.
