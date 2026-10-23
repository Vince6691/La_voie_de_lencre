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
