# Outils vidéo shuimo (série 墨道)

Outils communs à tous les épisodes « tout shuimo » (skill `video-shuimo`). Chaque épisode a son dossier
(ex. `xue/shuimo_v2/`, ou `episodes/<pinyin>/` pour les suivants) avec un `episode.json` (voir `modele_episode.json`
et la documentation en tête de `episode.py`).

| Outil | Rôle | Entrée → sortie |
|---|---|---|
| `voix_prep.py` | silences rognés, −18 LUFS, pauses détectées | `voix/bNN.mp3` → `voix/bNN.wav`, `voix/segments.json` |
| `reperes.py` | repères au mot près + ligne de temps absolue (clips, rouleaux, pauses, fin) | `voix/mots/bNN.json` (Scribe) → `reperes` |
| `musique.py` | bourdon + guzheng, creux sous les rouleaux et les pauses, coupure nette | `reperes` → `musique` |
| `episode.py` | lecture de `episode.json`, calcul de la ligne de temps | (module) |

## Enchaînement
```sh
cd outils/video_shuimo
python3 voix_prep.py ../../<episode>/episode.json     # après chaque nouvelle prise de voix
#   transcrire chaque prise avec ElevenLabs Scribe (creative_transcribe_audio, gratuit) et enregistrer
#   words_download_url dans <voix>/mots/bNN.json
python3 reperes.py   ../../<episode>/episode.json     # repères + ligne de temps (« _ligne »)
python3 musique.py   ../../<episode>/episode.json     # fond musical
```
Puis `node sync.mjs` dans `xue/remotion` (le projet Remotion commun) copie voix, repères et musique dans
`public/` et `src/data/` (ajouter les chemins de l'épisode à `sync.mjs`).

La composition lit `reperes` : `cues[bNN].cues[nom]` (temps dans le clip) et `_ligne` (`clips[bNN].debut`,
`rouleaux[i].debut`, `pauses`, `fin`, `total`) ; un repère absolu = `clips[bNN].debut + cue`
(+ durée de la pause si le repère est après la coupe).

Épisode de référence : 學 (`xue/shuimo_v2/episode.json`, composition `XueV2`).
