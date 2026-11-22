# Son de la séquence 界畫 « le canevas au crayon » (JiehuaCanevas)

Le mode d'emploi complet est dans la skill `jiehua-3d`.

- **`src/<nom>_1..4.mp3`** : bruitages ElevenLabs, en 4 variantes chacun. Ils viennent du flow « 墨道 — 界畫
  canevas : son », Sound Effects v2. Sons disponibles :
  - crayon (mine sur papier) ;
  - souffle (mouvements de caméra) ;
  - bois (pièces qui s'emboîtent) ;
  - clic (consoles) ;
  - toit (couverture qui se pose) ;
  - pinceau (peinture des décors) ;
  - or (filets d'or).
- **`events.json`** : la chronologie exacte de l'animation (activité du crayon et vitesse de caméra image par
  image, contacts des pièces, peinture, or, inscription, sceau). Elle est exportée par
  `remotion/src/jiehua3d/exportEvents.ts`.
- **`bande.wav`** : la bande son finale, mixée par `tools/build_jiehua_audio.py` d'après `events.json`.
  - Le script retient une variante par bruitage : l'attaque la plus franche pour les impacts, la présence la plus
    régulière pour les autres.
  - L'attaque de chaque impact est calée sur l'instant de contact.
  - La musique est synthétisée.
  - Le gong et le sceau viennent de l'épisode 教.
- `node sync.mjs` (dans `remotion/`) copie les `.wav` dans `public/jiehua/`.

Toute modification de l'animation demande de relancer l'export, puis le mixage.
