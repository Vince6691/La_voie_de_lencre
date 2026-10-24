---
name: rendu-youtube
description: Rendu final d'une vidéo 墨道 pour YouTube (Remotion) — 1440p par défaut (YouTube réencode mieux une vidéo envoyée en 1440p, même vue en 1080p ; idéal pour le papier xuan et les lavis), morceaux en parallèle en gardant 3 cœurs libres, rouleaux 3D rendus à part avec un long délai, reprise automatique d'un morceau en échec, son à −14 LUFS, couleurs bt709 en plage TV, assemblage sans second encodage, rapport de contrôle et planches d'images pour la note artistique. Utiliser quand l'utilisateur demande le rendu final, le rendu YouTube, un rendu 1080p ou 1440p, « la version à publier », ou veut savoir comment rendre une vidéo de bonne qualité ; pour un aperçu rapide (720p, 360p), voir l'étape 5 de video-shuimo.
---

# Rendu final YouTube (série 墨道)

Validé sur le 學 (`XueV2`). Outil : `outils/video_shuimo/rendu_final.mjs`. Toujours dialoguer en français.

## Avant de lancer (ne jamais sauter)
1. **Demander le feu vert** : le rendu 1440p d'une vidéo de 4 min prend ≈ 15–25 min sur 19 cœurs avec
   la carte graphique (`--gl angle`), ≈ 1 h 30 en rendu logiciel. Ne pas lancer si l'utilisateur dit d'attendre.
   **Ne jamais occuper tous les cœurs** : le script en garde toujours **3 libres** (`os.cpus().length − 3`) pour que la
   machine reste utilisable et ne plante pas ; ne pas contourner ce réglage, même pour aller plus vite.
2. **Le montage est figé** : aucune modification des sources pendant le rendu (le bundle est fait une fois au début,
   mais une reprise refait le bundle). Commit fait avant.
3. **Vérifier le 720p d'abord** : la vidéo complète a été regardée (planches toutes les 3 s) et la note artistique
   faite ; l'écoute de la bande son a été proposée à l'utilisateur (je ne peux pas écouter).
4. **Le Studio Remotion fermé ou intact** : il a déjà inséré tout seul `from={-248}` sur la racine d'une composition
   quand on navigue au clavier dans la frise. `git diff` sur le fichier de la composition avant de lancer.
5. **Essai** : `node outils/video_shuimo/rendu_final.mjs <Composition> <pinyin> --essai [--gl angle]` rend 2 s (et 1 s de
   rouleau 3D), **chronométré** (s/image), et affiche le format : il faut `yuv420p(tv, bt709…)`. Sur une nouvelle machine, le lancer en
   `--gl angle` (défaut) puis en `--gl swangle`, et comparer une image de chaque (elles doivent être identiques) ; garder
   `swangle` si `angle` échoue. `--plan` affiche seulement le découpage.

## Lancer
```bash
node outils/video_shuimo/rendu_final.mjs XueV2 xue            # 1440p, crf 16 (défaut)
node outils/video_shuimo/rendu_final.mjs XueV2 xue --hauteur 1080
```
En tâche de fond (`run_in_background`) : la notification arrive à la fin, ne pas sonder. Le journal est dans
`outils/moteur/out/final_<pinyin>/journal.txt`, un `.log` par morceau à côté de chaque `m_<début>.mp4`.

## Ce que fait le script (et pourquoi)
| Étape | Réglage | Pourquoi |
|---|---|---|
| Définition | `--scale = hauteur / 1080` (1440p par défaut) | YouTube donne un meilleur encodage (VP9/AV1) aux vidéos ≥ 1440p ; le papier et les lavis gris s'y dégradent moins (bandes, blocs) |
| Qualité | morceaux en `--crf=10 --x264-preset=veryfast` (quasi sans perte, rapides), puis **un seul** encodage final `crf 16, slow` ; `--jpeg-quality=95` | marge pour le réencodage de YouTube ; l'encodage lent ne freine plus le rendu des images |
| Rendu graphique | `--gl angle` (défaut : carte graphique), reprise en `swangle` | mesuré sur le 學 en 1440p : 0,64 → 0,17 s/image (×3,8) hors 3D, 7,4 → 0,62 s/image (×12) sur le rouleau 3D, images identiques (PSNR 50–54 dB). `remotion.config.ts` force `swangle` pour le Studio et les autres rendus ; l'option du script l'emporte |
| Couleurs | `--color-space=bt709 --pixel-format=yuv420p`, puis drapeaux bt709 / plage TV | sans cela Remotion sort du `yuvj420p` pleine plage (bt470bg) : YouTube bouche les noirs ou grise le papier ; si les morceaux sont quand même en pleine plage, l'assemblage les réencode en plage TV |
| Découpage | cœurs disponibles = total − 3 ; morceaux au prorata à 4 fils, **rouleaux 3D à part** (6 fils, délai 900 s, de 1,5 s avant à 3,5 s après) | le rouleau 3D (three.js en WebGL logiciel) met plusieurs minutes à monter : avec 6 rendus en parallèle et 200 s de délai, il a échoué à la première image (`delayRender` dépassé) |
| Reprise | un morceau en échec ou incomplet est refait seul, moitié moins de fils, délai doublé | évite de tout relancer |
| Son | `bande_son.py` (voix + bruitages + musique), mesure puis gain vers **−14 LUFS**, limiteur −1 dBTP, AAC 320 kbps 48 kHz | norme YouTube ; `loudnorm` en une passe donnait −15,4 |
| Assemblage | démultiplexeur concat + encodage final unique (et conversion en plage TV si besoin) | les morceaux sont coupés pile sur leurs bornes ; une seule perte, contrôlée |
| Contrôle | `rapport.txt` : images (doit égaler le total), format, `blackdetect`, `freezedetect`, `silencedetect`, `ebur128` ; `planches/` : une image toutes les 3 s | matière de la note artistique (étape 4, rendu vidéo) |

Sortie : `episodes/<pinyin>/rendu/<pinyin>_<hauteur>p.mp4` (ne pas commiter la vidéo).

## Après le rendu
- Lire `rapport.txt` : nombre d'images = total ; vidéo `yuv420p(tv, bt709)` ; son ≈ −14 LUFS, pic ≤ −1 dBTP.
  Une image noire courte à la sortie d'un clip au pinceau (encre pleine) est voulue ; un plan figé > 2 s hors écran
  de fin est un défaut (caméra manquante).
- Regarder **toutes** les planches (`Read`), proposer la note artistique (skill `note-artistique`).
- **Sous-titres FR** (fichier à envoyer sur YouTube, pas incrustés) : `python outils/video_shuimo/sous_titres.py
  episodes/<p>/episode.json` → `episodes/<p>/rendu/<p>_fr.srt`, d'après `voix/mots/*.json` recalés comme `reperes.py`
  (silence de tête, tempo, pause insérée dans un clip) ; ≤ 2 lignes d'environ 42 caractères, ≤ 6 s, coupure sur la ponctuation.
  À lancer avec le rendu final (le montage est figé), vérifier une réplique après chaque pause.
- Proposer le reste du paquet YouTube : chapitres sur les changements d'époque,
  titres (skill `voix-off-modo` / `youtube-title-creator`), miniature.

## Pièges rencontrés
- **Windows** : `python3` peut être le raccourci du Windows Store (le script cherche `python3` puis `python`) ;
  une commande ffmpeg avec 50+ bruitages dépasse la limite de ligne de commande → `bande_son.py` écrit son graphe
  dans un fichier (`-filter_complex_script`). Ne jamais `rm -rf <dossier>/*` (bloqué par la sécurité) : écrire dans
  un dossier neuf.
- **Clips générés (Veo, Seedance)** : vérifier le filigrane (recadrage `CLIP_ZOOM`) et les coupes internes du fichier
  (planche à 4 images/s du clip source avant de le monter) : une coupe brusque dans le fichier se voit comme une
  « coupure » de la vidéo.
- Une reprise partielle (quelques secondes) après correction : rendre la plage seule, puis assembler avec
  `trim=start_frame/end_frame` (réencodage) ; pour le rendu final, préférer refaire les morceaux entiers touchés et
  `--assembler`.
