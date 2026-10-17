# 學 / 学 (xué) — apprendre

Premier épisode de la série 墨道, en deux versions. Le moteur et les outils communs restent dans `xue/`
(moteur Canvas `xue/src/`, outils `xue/tools/`, compositions Remotion `xue/remotion/`).

## Version tout shuimo (composition `XueV2`, ≈ 4 min)
Même organisation que les autres épisodes (`outils/video_shuimo`) :
- `PROPOSITION.md`, `VOIX.md` : déroulé et textes de la voix off v2
- `episode.json` : séquence des blocs, rouleaux, musique
- `voix/` : blocs b01…b09 (mp3, wav), `reperes.json` (repères et ligne de temps), `mots/`, `prises/`, `segments.json`
- `audio/musique.wav` : fond musical

## Version fond noir (compositions `Xue` et rendu Canvas)
- `fond_noir/SCRIPT.md` : texte de la voix off
- `fond_noir/rendu/` : `xue_evolution.mp4` (+ `.fr.srt`), `xue_remotion.mp4`
- `fond_noir/voice*/` : prises de voix successives (`voice_fast` = prise courante, silences rognés et pauses insérées,
  utilisée par `xue/tools/*.py` et copiée par `xue/remotion/sync.mjs`)

Détails techniques de la version fond noir : `xue/README.md`.
