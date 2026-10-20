# Son de la séquence 界畫 « le canevas au crayon » (JiehuaCanevas)

- `src/<nom>_1..4.mp3` : bruitages ElevenLabs (flow « 墨道 — 界畫 canevas : son », Sound Effects v2), 4 variantes :
  crayon (mine sur papier), souffle (mouvements de caméra), bois (pièces qui s'emboîtent), clic (consoles), toit
  (couverture qui se pose), pinceau (peinture des décors), or (filets d'or).
- `tools/build_jiehua_audio.py` retient une variante par son (attaque la plus franche pour les impacts, présence la
  plus régulière sinon), la normalise et la fond → `<nom>.wav` ; gong et sceau viennent de l'épisode 教 ;
  la musique (`musique.wav`, 16 s) est synthétisée et calée sur l'image (la génération ElevenLabs Music a échoué,
  crédits insuffisants).
- `node sync.mjs` (remotion/) copie les `.wav` dans `public/jiehua/`.
