# 教 (JiaoV1) — notes artistiques

Référence technique : `YuV1` (語) et `XueV2` (學). Passe du 2026-10-24, étape 3 (images fixes de la composition corrigée ; pas de rendu vidéo complet, pas d'écoute).

## Écarts relevés sur la v4 (aperçu du 23/10) et corrections appliquées (techniques, sans validation : consigne permanente)
1. **Rouleaux** : trois rouleaux 2D → 2D (商→魯), 2D (魯→漢) et **rouleau 3D complet Han → Song** (le plus grand saut, 1 000 ans) ; vers qui parlent d'enseigner sur les trois : 論語 述而 (誨人不倦, 三人行…), 論語 衛靈公 (有教無類), 禮記 學記 (教學相長), 孟子 盡心 (得天下英才而教育之). Frise des 2D tirée de `periodes.ts`.
2. **Cartouches** : `cartouche(id, précision)` partout ; période `lu` (魯, ROYAUME DE LU) ajoutée à `periodes.ts` avec `compteur: false` (n'apparaît pas dans le compteur des rouleaux 3D des autres épisodes).
3. **Cartes** : cartes peintes de la bibliothèque (`chine_centre_nord`, aucune génération) : Lu et royaumes rivaux, itinéraire de Confucius au pinceau (7 étapes, noms en fangsong), académies des Song et poussée vers le mont Lu. Plus de `E.drawMap`.
4. **Légendes** en pastille de papier ≥ 44 px, hors des 8 % du bas ; polices `ShuimoPinceau`, `ShuimoLegende`, `ShuimoCaps` chargées ; canvas `Draw` en pleine définition (`DRAW_K`).
5. **Caméra** de Hermite, **raccords** `Win fade`, **grain fixe + vignettage + tremblement** (`GrainVignette`, `Shake`), qui manquaient.
6. **Clips** : plus aucun clip d'exemple ; carapace (Veo, 8 s) intégrée au bloc 2 (entrée à travers 教, sortie au pinceau, recadrage 1,12 contre le filigrane) ; clips A (atelier) et B (baguette) en emplacements marqués jusqu'à leur livraison.
7. **Grotte du Cerf blanc** (bloc 8) : cascade et brume animées, cerf 白描 tracé trait à trait (`portraits.cerf`), tablette laquée dont les quatre colonnes se calligraphient entre « ses principes » et « refuse », colonne pointillée « règlement refusé ».
8. **Fin** : `queue` 10 s, écran de fin sur papier (marque et 文 dans le tiers gauche), musique de fin bamboo grove, glissando « retour au départ » sur « retrouver » (b02).

## Restant
- Clip B Seedance (A_FOURNIR.md).
- Xu Shen en 3D (`images/xushen_3d.jpg`, `assets/morph/xushen_3d.jpg`) : il manque la version encre (`xushen_encre.jpg`) pour le délavé (skill `encre-3d`) ; le portrait 白描 reste en attendant.
- Écoute de la bande son (`apercus/bande_son.mp3`) : glissandos des rouleaux (n° 3, 1 et 2), flashback, musique de fin.
- Rendu brouillon 360p (rouleau 3D : `--timeout=200000 --concurrency=2`), note artistique complète.

## Retours du 2026-10-24 (v5) appliqués
- Glissando « retour au départ » (b02) supprimé ; sous-titres réduits à 4 (« portrait imaginé » ×2, la maxime, 文) ; cascade supprimée (la brume reste) ; pas de zoom ni de punch dans la rétrospective (b09).
- Bloc Shang raccourci : plus de clip A, l'os d'exercice apparaît dès « ateliers royaux », signes en jiaguwen réels (小學堂, `outils/video_shuimo/glyphes_alpha.py`).
- Tablette de Zhu Xi en Ma Shan Zheng (`ShuimoPinceau`, qui n'a pas les formes traditionnelles : caractères simplifiés sur la tablette).
- Reste : `xushen_encre.jpg` (non reçue), clip B (prompts dans A_FOURNIR.md).

## Retours suivants (2026-10-24, v6)
- Xu Shen : image 3D → lavis (`MorphEncre`, mode `fade`, paire `xushen` 1376×768 dans `assets/morph/`, champ `xushen_couleur.png` par `tools/build_morph.py`), posée en multiplication sur le paysage, masque doux ; textes du Shuowen sur pastille de papier à droite de l'image.
- Rétrospective et écran de fin : paysage sans premier plan (option `front: false` de `compose`), le rocher ne se décale plus par saccades.
- Intro : sous-titres « 教 · jiào · enseigner » puis « 孝 · xiào · la piété filiale ? » rétablis (style du 學).
- Os d'exercice : le code charge `images/os_exercice.png` (omoplate, fond transparent) s'il existe, sinon l'estampage sombre ; colonnes à ±0,11 de la largeur, 12 signes sur 72 % de la hauteur (réglages `xm`, `xe`, `y0`, `st` dans `ShangLu`).

## Os d'exercice (2026-10-24, v7)
- Omoplate de bœuf générée (Nano Banana), détourée par `outils/video_shuimo/detourer_fond_uni.py` → `images/os_exercice.png` ; colonnes du maître et de l'élève à 36 % et 66 % de la largeur, 12 signes sur 74 % de la hauteur ; signes jiaguwen bruns avec un reflet clair (creusés dans l'os).
- Bruitage de gravure : `audio/sfx_src/fabriquer_jiao.py` → `sfx_grave_{a,b,c,d}.wav` (pointe de bronze qui racle l'os, 0,34 s), un par signe gravé (12, volume 0,3), puis 12 plus discrets sous la copie de l'élève (0,17) ; remplace les anciens `gravure`.
- À corriger : 教育 (jiàoyù, b09) mal prononcé par la voix (IPA `/tɕjâʊ.ŷ/`) → nouvelle prise de b09 à valider.

## Clip B et b09 (2026-10-24, v8)
- b09 : prise 1 retenue (`voix/prises/b09_v5_take1.mp3`, « jiàoyù » en pinyin), transcrite par Scribe → `voix/mots/b09.json` ; repères et ligne de temps recalculés.
- Clip B livré : `clips/05_baguette.mp4` (10,08 s, 24 i/s, audio natif). Dialogue transcrit (Scribe) : 醒来，当读书矣 (1,3–2,7 s) puis 啊，先生，弟子知过也 (3,1 ; 4,9–6,7 s). La voix off ne parle pas pendant le clip : il suit la question « frapper ? » (b05 + 11 s de silence, `apres`), entrée à travers 教, sortie au pinceau ; son du clip = bruitage `baguette` (`audio/sfx_baguette.wav`), musique coupée pendant le clip (`coupures`). Sous-titres français : « Réveille-toi, il faut étudier. » / « Maître, ton disciple reconnaît sa faute. ».
- Avant le clip : la citation 夏楚二物，收其威也 (Mémoire sur l'étude) se calligraphie à « deux baguettes ».
- Durée totale : 300,4 s (5 min 00) écran de fin de 10 s compris.

## Note artistique — 2026-10-24, étape 3 (images fixes : 25 images sur 300 s, composition corrigée) + plan, voix et son lus ; pas de rendu vidéo, pas d'écoute
| Domaine | Note | En bref |
|---|---|---|
| Technique | 7,5 | ligne de temps, caméra de Hermite, rouleau 3D, cartes peintes, grain fixe, fondus, fin sur papier : conformes ; reste non vérifié (rendu, clignotements, mixage) ; clip B en 720p 24 i/s agrandi ; cerf à traits fragmentés, taches grises sur la table de Xu Shen |
| Artistique | 7,5 | tableaux forts (os gravé, rouleau 3D, Xu Shen 3D → encre, carte peinte, Confucius 白描) ; la grotte reste pauvre (cerf, tablette et peu de mouvement), le retournement des Han est un fond papier plat |
| Historique | 7 | sources et citations vérifiées ; os d'exercice recomposé (12 signes jiaguwen pris sur des pièces différentes) présenté comme « l'os » ; tablette en caractères simplifiés (choix de police) ; dialogue en classique mais prononcé en mandarin moderne ; 殷契粹編 1468 non confirmé |
| Design | 7 | textes ≥ 44 px, rien dans les 8 % du bas, fin propre ; dates du cartouche peu lisibles sur les cartes ; « 白鹿洞 » posé sur le fleuve ; « qui le porte » sur une branche de pin |
| Storytelling | 7,5 | accroche forte (faux ami), retournement net, humour du clip B ; bloc Song (31 s) sans relance, 11 s de calligraphie avant le clip |

### Corrections proposées (pour atteindre 8 partout)
1. [Design · léger] pastille de papier sous le cartouche d'époque quand il est sur une carte ; décaler l'étiquette 白鹿洞 hors du fleuve ; « qui le porte » hors de la branche → Design 7 → 8
2. [Artistique · moyen] grotte animée (brume visible qui dérive, feuilles, oiseaux, cerf qui avance) et coups de pinceau dans le retournement des Han → Artistique 7,5 → 8
3. [Historique · léger] légende discrète « os d'exercice recomposé » ; SOURCES.md : os et signes ; confirmer ou retirer 殷契粹編 1468 → Historique 7 → 7,5 (8 avec la référence confirmée)
4. [Technique · léger] nettoyer les traits du cerf (épaissir / fusionner les zones), régler le « cœur » de Xu Shen contre les taches grises ; brouillon 360p et écoute avant le rendu → Technique 7,5 → 8
5. [Storytelling · lourd : nouvelle voix b08] une relance en milieu de bloc Song, ou couper 8 s → Storytelling 7,5 → 8

### Corrections validées et appliquées (2026-10-24)
- Design : pastille de papier sous le cartouche d'époque (cartes de Lu et des Song), sous les noms de lieux (option `fond` de `lieu`) et sous les étiquettes (爻 baguettes, 老 un vieillard, 子 qui le porte…).
- Historique : légende « os d'exercice recomposé » pendant la gravure ; SOURCES.md inchangé (référence 殷契粹編 1468 toujours à confirmer).
- Demandes ajoutées : sous-titres d'explication de la citation du Mémoire sur l'étude (夏楚二物 puis 收其威也, à l'apparition de chaque colonne) ; après les rouleaux 2D, 1,4 s de silence avant la voix (au lieu de 0,3) pour que le cartouche d'arrivée se stabilise avant de s'effacer. Durée : 302,6 s.
- Non appliqués (non choisis) : grotte animée et retournement des Han (Artistique), nettoyage du cerf et de Xu Shen (Technique), relance du bloc Song (Storytelling). Notes inchangées sur ces domaines.

### Retours du 2026-10-24 (v9)
- Cerf animé : le dessin achevé est rendu une fois en image, découpé en trois calques (tête et encolure, queue, corps) qui bougent autour de leur pivot (tête qui s'abaisse et se relève toutes les 5 s, queue qui frétille par à-coups, corps qui respire au pas) ; vectorisation reprise (`portraits.cerf.seuil` 215) : traits continus. Zones et pivots : `DEER_HEAD`, `DEER_TAIL` dans `JiaoV1.tsx` (coordonnées du dessin 941 × 722).
- Clip maître/élève : le 教 ne réapparaît plus entre le clip et le rouleau.
- Fin des rouleaux 2D : silence de 2,2 s avant la voix (au lieu de 1,4 s) et changement de scène retardé de 0,35 s : le cartouche d'arrivée reste lisible environ 2 s. Durée totale 304,2 s.

### Correction (v10) : la voix ne bouge pas
- Les silences après les rouleaux 2D reviennent à 0,3 s (voix à son minutage d'origine, durée totale 300,4 s).
- Ce qui disparaissait trop vite : la scène suivante se fondait par-dessus la fin du rouleau, et le cartouche d'arrivée s'éteignait puis se rallumait. Maintenant : le cartouche reste le même d'une scène à l'autre, le fondu de la scène suivante ne commence qu'à la fin du rouleau, et la carte (Lu) arrive 1,3 s après le début de la voix, le portrait de Xu Shen à « lettré » : le cartouche et le paysage restent lisibles ≈ 1,6 s après le rouleau Shang → Lu et ≈ 1,2 s après le rouleau Lu → Han.

## Note artistique — 2026-10-24, étape 4 (brouillon 360p complet : 300,5 s, 9 012 images, rendu carte graphique en 3 morceaux ; pas d'écoute)
Brouillon : `outils/moteur/out/preview/jiaov1_brouillon.mp4` (−18,5 LUFS, crête −1,2 dBFS). Rendu : `--gl=angle` en 3 morceaux parallèles (≈ 5 min en tout) ; les deux clips vidéo (carapace, clip B) ont dû être réencodés sans images B (le moteur ne trouvait pas certaines images) — originaux dans `clips/originaux/`.
| Domaine | Avant | Après | En bref |
|---|---|---|---|
| Technique | 7,5 | 8 | rendu complet sans erreur, raccords et fondus propres, rouleau 3D et cartes stables, grain fixe, son du clip B calé ; reste : clip B en 720p 24 i/s agrandi, taches grises sur la table de Xu Shen, mouvement du cerf discret, raccords audio des 3 morceaux à écouter |
| Artistique | 7,5 | 8 | os gravé, rouleau 3D, Xu Shen 3D → encre, Confucius, clip B (personnages cohérents, humour) ; cerf animé ; reste : le retournement des Han est un fond papier plat, la grotte est encore calme |
| Historique | 7 | 7,5 | légende « os recomposé », dialogue en chinois classique, citations sourcées ; reste : tablette en caractères simplifiés, prononciation moderne, 殷契粹編 1468 non confirmé, pas de précision sur le fleuve Jaune |
| Design | 7 | 8 | pastilles sous cartouches, noms de lieux et étiquettes ; cartouche tenu 1,2 à 1,6 s en fin de rouleau ; sous-titres français lisibles ; reste : noms de lieux denses sur la carte de l'itinéraire |
| Storytelling | 7,5 | 7,5 | accroche et chute solides, clip B qui répond à « frapper ? » avec humour ; reste : bloc Song de 31 s sans relance (nouvelle voix b08) |
Exit à l'encre des clips : l'écran se couvre d'encre sombre pendant ≈ 0,8 s avant de se dissoudre (comportement validé de `VideoReveal`, pas un défaut).

## Rendu final 1440p (2026-10-24) — `rendu/jiao_1440p.mp4`
- 9 012 / 9 012 images, 2560×1440, `yuv420p (tv, bt709)`, 9,05 Mb/s, 30 i/s ; son AAC stéréo 48 kHz, −14,0 LUFS (LRA 3,5 LU) ; 350 Mo, à ne pas commiter. Rendu carte graphique (`--gl angle`) : 19 min de rendu + 11 min d'encodage.
- Premier rendu : plans figés de 2,5 s, 3,3 s et 1,9 s sur les cartes (83, 99 et 102 s) → poussée lente continue ajoutée aux trois cartes, rendu refait : il ne reste que l'écran de fin figé (293,1 s, 6,4 s, voulu) et deux noirs de 0,3 s (sorties à l'encre des clips, voulus).
- Écran de fin : sceau 墨之道 et « Mò zhī dào » (nom de la chaîne corrigé aussi sur les écrans de fin des autres épisodes et dans les skills).
- Sous-titres : `rendu/jiao_fr.srt` (81 répliques, ≤ 2 lignes) ; `sous_titres.py` retire désormais les balises d'émotion et applique `sous_titres_remplacements` d'`episode.json` (IPA → pinyin, noms chinois → Anyang, Shang, Zhou, Xu Shen, Han, Song, Zhu Xi…, 教室 / 教育). Les dialogues du clip B sont sous-titrés dans l'image, pas dans le .srt.
- Notes inchangées depuis le brouillon : Technique 8 · Artistique 8 · Historique 7,5 · Design 8 · Storytelling 7,5 (corrections restantes plus haut).
- Non fait : écoute de la bande son (voix, raccords des morceaux de brouillon n'existent plus dans le rendu final, glissandos, gravures, clip B), description YouTube et chapitres (skill `description-youtube`), miniature.
