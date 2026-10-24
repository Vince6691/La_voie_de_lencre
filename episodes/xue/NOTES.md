# 學 (XueV2) — notes artistiques

Référence technique : `YuV1` (語). Passe du 2026-10-23, étape 4 (construction du montage, relecture du code + 5 images fixes ; pas de rendu vidéo complet, pas d'écoute).

## Note après corrections techniques

| Domaine | Avant | Après | En bref |
|---|---|---|---|
| Technique | 5,5 | 7,5 | ligne de temps lue dans `_ligne`, caméra Hermite, Win fade, rouleau 3D complet, cartes en cache ; manquent bruitages, clips dédiés, grain/vignette |
| Artistique | 6,5 | 7 | rouleau 3D, cartes peintes, fin sur papier ; clips d'exemple qui ne montrent pas la scène, aucun bruitage |
| Historique | 7 | 7,5 | chronologie juste ; 斆 (tête de série) à expliciter, « tige de bronze » et datation des formes abrégées à nuancer ; SOURCES.md créé |
| Design | 5,5 | 7,5 | légendes en pastille ≥ 44 px hors des 8 % du bas, cartouches `periodes.ts`, fin au tiers gauche ; planche complète des images à vérifier |
| Storytelling | 8 | 8 | question tenue jusqu'à la chute, retournement des scribes, passerelle 教 ; bloc Xu Shen (≈ 23 s) un peu statique |

## Corrections appliquées (techniques, sans validation : consigne permanente)
1. Ligne de temps lue dans `_ligne` ; temps codés en dur de la scène Shang remplacés par des décalages au repère `signe`.
2. Rouleau 3 : rouleau 3D complet (Han → aujourd'hui, inscriptions 論語 學而 / 荀子 勸學), `episode.json` → `rouleau3d`, repères et musique recalculés (247,7 s).
3. Écran de fin sur papier de 10 s (`queue`), tiers gauche, fondu, prochain caractère 教 ; plus de fond noir.
4. Légendes : pastille de papier, ≥ 44 px, hors des 8 % du bas ; Xu Shen, mots courants et portrait passés à ≥ 44 px ; « (clip d'exemple) » retiré du texte à l'écran.
5. Cartouches via `cartouche()` ; polices `ShuimoPinceau` / `ShuimoLegende` chargées ; caméra `Cam` (Hermite) dans l'accroche, Xu Shen et le retournement.
6. Fondus entre scènes (`Win fade`) ; cartes Shang / Zhou / Qin en cartes peintes (`chine_centre_nord`), carte Japon / Chine en `mapLayer` (plus de `drawMap` à chaque image).
7. `SOURCES.md` créé ; skills `note-artistique` et `video-shuimo` mises à jour (YuV1 = référence, liste de contraintes techniques).

## Restant (lourd : validation nécessaire)
- Clips Seedance dédiés (devins, tir à l'arc au 學宮, scribes) : les clips d'exemple servent encore.
- Bruitages : faits (35 dans `episode.json`, sons du 美 réutilisés) ; écoute à faire.
- Voix : nuance 斆 → 學 dans b06 ; « tige de bronze » (b03) ; datation des formes abrégées (b07). Nouvelle voix ElevenLabs.
- Grain / vignettage / tremblement d'impact de YuV1 (non exportés : à extraire dans un composant commun).
- Planche d'images fixes complète, puis brouillon 360p (rouleau 3D : `--timeout=200000 --concurrency=2`).

## Mise à jour (même jour) : clips, effets, planche
- Clip des scribes supprimé ; clips devins et tir à l'arc : emplacements marqués à l'écran, prompts Seedance dans `A_FOURNIR.md` (passer `PRETS` à `true` dans `XueV2.tsx` à l'arrivée des fichiers `clips/01_devins.mp4`, `02_tir_arc.mp4`).
- Grain, vignettage et secousse d'impact : composant commun `src/commun/Effets.tsx` (YuV1 et XueV2 l'utilisent).
- Scène Xu Shen : glyphe remonté, blocs de texte séparés et sur pastille, légende « portrait imaginé » sous le portrait, caméra plus douce (les textes se superposaient).
- Bandeau de synthèse décalé à gauche (dernière forme et son étiquette cachées par le rocher).
- Incident : le Studio Remotion avait inséré `from={-248}` sur la racine de `XueV2` (décalage de 8,3 s de toute la vidéo) ; retiré. Ne pas utiliser les flèches du clavier dans le Studio sans vérifier que rien n'est modifié.

## Passe 2 — étape 4 (planche de 20 images fixes + code), notes
| Domaine | Note | En bref |
|---|---|---|
| Technique | 7,5 | aligné sur YuV1 ; mouvement, sons et rendu complet non vérifiés ; deux emplacements de clips |
| Artistique | 6,5 | cartes, rouleau 3D, bandeau très beaux ; deux cadres en pointillé dans le film, retournement sans image forte |
| Historique | 7 | citation corrigée (荀子 勸學 : 青取之於藍) ; restent 斆 → 學, « tige de bronze », date des formes abrégées |
| Design | 7,5 | lisible, sans collision ; ligne italique de Xu Shen sur le pin, ruban fusion sous le rocher |
| Storytelling | 7,5 | question tenue, retournement net ; les devins (accroche du bloc 3) et le tir à l'arc manquent encore |

## Clips (mise à jour)
- Devins : `clips/01_devins.mp4` (Veo, recadré à 112 %). Tir à l'arc : `clips/02a_tir_arc.mp4` (6,0 s, le roi guide l'élève, entrée à travers 學) puis `clips/02b_tir_arc.mp4` (5,9 s, fondu enchaîné de 0,4 s, sortie au pinceau), lus à vitesse normale ; 6 s de silence ajoutées après la voix du bloc 4 (`"apres": 6`) pour que la scène 2 se joue en entier avant le rouleau 2.
- Durée totale : 252,9 s.

## Passe 3 — étape 4, rendu 720p complet (apercus/xue_720.mp4, 4:12,9), 84 images (toutes les 3 s) + analyse ffmpeg
| Domaine | Note | En bref |
|---|---|---|
| Technique | 7,5 | rendu complet propre (7 590 images, aucune image noire hors 0,33 s d'encre à 41,2 s) ; pas de caméra Cam dans les scènes Shang/Zhou, Qin et aujourd'hui ; plan fixe de 7 s sur le bronze (79–86 s) ; éclair de papier vide de 0,8 s avant l'écran de fin ; −15,4 LUFS (cible −14) |
| Artistique | 7,5 | clips devins et tir à l'arc très beaux, rouleaux 2D et 3D premium, bandeau ; même paysage (seed 3) de Xu Shen à la Tang, beaucoup de plans « glyphe au centre sur paysage » |
| Historique | 7 | rouleau 3D depuis les Tang ; restent 斆 → 學, « tige de bronze », date des formes abrégées (voix) |
| Design | 7,5 | légendes lisibles, cartouches masqués sur les clips ; ruban fusion du bandeau sous le rocher |
| Storytelling | 8 | les deux scènes humaines sont là, question tenue jusqu'à 教 ; le bronze statique ralentit le bloc 4 |

## Passe 4 — rendu 720p complet après les corrections légères (apercus/xue_720.mp4, 4:07,7)
Corrections : caméra dans Shang/Zhou, Qin et aujourd'hui (plus de plan figé sur le bronze), fiche caractère de 学, voile sous le bandeau, raccord de fin sans papier vide, son à −14,4 LUFS (pic −2,1 dBTP), clip des devins sans la coupe interne du fichier Veo (plan 1 puis plan de la carapace en fondu), 学 qui ne revient plus par-dessus le bandeau.
| Domaine | Note | En bref |
|---|---|---|
| Technique | 8 | rendu propre, plus de plan figé hors écran de fin ; reste 0,33 s d'encre noire à la sortie des devins (41,6 s) |
| Artistique | 7,5 | même paysage de Xu Shen aux Tang, beaucoup de plans « glyphe au centre » |
| Historique | 7 | voix : 斆 → 學, « tige de bronze », date des formes abrégées |
| Design | 8 | fiche lisible, bandeau dégagé, légendes sur pastille |
| Storytelling | 8 | accroche, voyage et chute tiennent ; scènes humaines en place |

## Défaut relevé par l'utilisateur (à corriger)
- **Royaumes combattants (bloc 5, ≈ 1:42)** : les « variantes régionales » posées en désordre avant le petit sceau sont toutes la **même** forme 戰國 (`zhanguo`), seulement tournée ou en miroir. Le propos (« d'un royaume à l'autre, le même mot changeait de visage ») demande de **vraies formes différentes** par royaume : 楚系 (Chu, bambou et soie), 齊系 (Qi), 燕系 (Yan), 晉系 (Han, Zhao, Wei), 秦系 (Qin) — à chercher sur 小學堂 (`outils/video_shuimo/xiaoxue.py`, formes des Royaumes combattants classées par système), une étiquette de royaume sous chacune.

## Sons validés (même jour)
- Rouleaux : un des trois 流水拂 (guzheng-sound), varié d'un rouleau à l'autre, 2D et 3D ; souffle moyen.
- Fin : bamboo grove (Pixabay), 2 s avant la fin de la dernière phrase, discret, puis porte l'écran de fin.
- « Pour les retrouver… » : glissando du morceau flashback (5–8 s), 0,1 s après le début de la phrase, volume 0,5.

## Passe 5 — après les corrections sons / rouleaux / Royaumes combattants (code, images fixes, extraits sonores ; pas de nouveau rendu complet)
| Domaine | Note | En bref |
|---|---|---|
| Technique | 8 | sons des rouleaux unifiés (2D et 3D identiques, sans écho), musique de fin et flashback branchés partout (composition + bande son) ; mouvement non revu depuis le rendu de la passe 4 |
| Artistique | 8 | rouleau 2D au niveau du 3D, vrai son de guzheng, fin portée par bamboo grove ; reste le même paysage de Xu Shen aux Tang |
| Historique | 7,5 | Royaumes combattants en vraies formes (Chu, Zhongshan, Qin) ; restent 斆 → 學, « tige de bronze », date des formes abrégées (voix) |
| Design | 8 | 7 légendes utiles, poèmes discrets, fiche lisible |
| Storytelling | 8 | le flashback marque le retour au départ, la fin respire sur l'écran de fin |
