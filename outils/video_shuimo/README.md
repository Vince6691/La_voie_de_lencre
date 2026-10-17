# Outils vidéo shuimo (série 墨道)

Outils communs à tous les épisodes « tout shuimo » (skill `video-shuimo`). Chaque épisode a son dossier
(`episodes/<pinyin>/`, ex. `episodes/xue/`) avec un `episode.json` (voir `modele_episode.json`
et la documentation en tête de `episode.py`).

| Outil | Rôle | Entrée → sortie |
|---|---|---|
| `voix_prep.py` | silences rognés, −18 LUFS, pauses détectées | `voix/bNN.mp3` → `voix/bNN.wav`, `voix/segments.json` |
| `reperes.py` | repères au mot près + ligne de temps absolue (clips, rouleaux, pauses, fin) | `voix/mots/bNN.json` (Scribe) → `reperes` |
| `musique.py` | bourdon + guzheng, creux sous les rouleaux et les pauses, coupure nette | `reperes` → `musique` |
| `xiaoxue.py` | formes historiques d'un caractère (小學堂, CC0) | caractère → `glyphes/<x>_xiaoxue/NN.png` + `index.json` |
| `donnees_glyphes.py` | glyphes réels découpés par composante + traits Make Me a Hanzi | section `glyphes` de `episode.json` → `glyphes/donnees.js` |
| `episode.py` | lecture de `episode.json`, calcul de la ligne de temps | (module) |

## Schéma d'un épisode (toujours le même)
Créé par `python3 nouvel_episode.py <pinyin> <caractère>` :
```
episodes/<pinyin>/
  PROPOSITION.md   question, réponse, maxime, blocs avec « > plan : », rouleaux, durée, titres
  VOIX.md          textes envoyés au synthétiseur (bNN: …)
  SOURCES.md       étymologie, sources, fait / hypothèse / légende, points à vérifier
  episode.json     voix, repères, musique, séquence, repères-clés (pour les outils)
  voix/            bNN.mp3 (prise retenue), bNN.wav, segments.json, reperes.json
  voix/mots/       bNN.json — minutage mot à mot ElevenLabs Scribe de la prise retenue
  voix/prises/     toutes les prises (bNN_take1.mp3, bNN_take2.mp3…), pour comparer
  clips/           clips Seedance renommés : NN_scene.mp4 (ex. 03_devins.mp4)
  images/          images Nano Banana (images de départ des clips, références)
  audio/           musique.wav
  apercus/         aperçus 720p (ignorés par git si trop lourds)
```
Composition Remotion : `outils/moteur/remotion/src/shuimo_<pinyin>/` (le projet Remotion commun), chemins ajoutés à `sync.mjs`.
Noms : dossier et composition en pinyin sans tons ; clips de voix `b01`… dans l'ordre des blocs.

## Enchaînement
```sh
cd outils/video_shuimo
python3 voix_prep.py ../../<episode>/episode.json     # après chaque nouvelle prise de voix
#   transcrire chaque prise avec ElevenLabs Scribe (creative_transcribe_audio, gratuit) et enregistrer
#   words_download_url dans <voix>/mots/bNN.json
python3 reperes.py   ../../<episode>/episode.json     # repères + ligne de temps (« _ligne »)
python3 musique.py   ../../<episode>/episode.json     # fond musical
```
Puis `node sync.mjs` dans `outils/moteur/remotion` (le projet Remotion commun) copie voix, repères et musique dans
`public/` et `src/data/` (ajouter les chemins de l'épisode à `sync.mjs`).

La composition lit `reperes` : `cues[bNN].cues[nom]` (temps dans le clip) et `_ligne` (`clips[bNN].debut`,
`rouleaux[i].debut`, `pauses`, `fin`, `total`) ; un repère absolu = `clips[bNN].debut + cue`
(+ durée de la pause si le repère est après la coupe).

Épisode de référence : 學 (`episodes/xue/episode.json`, composition `XueV2`).
