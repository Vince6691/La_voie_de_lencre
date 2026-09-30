---
name: fiche-caractere
description: Génère la « fiche caractère » de la série 墨道 pour n'importe quel caractère chinois — le caractère tracé à l'encre noire dans l'ordre de ses traits sur papier xuan clair, avec étiquette d'époque, pinyin, nombre de traits en vermillon et sceau rouge — en image PNG et, si demandé, en vidéo MP4 du tracé. Utiliser dès que l'utilisateur demande une fiche, une carte, un plan « caractère sur fond blanc », le layout du 學, l'ordre des traits animé d'un caractère, ou dit « refais ce layout pour 福 / 茶 / 道 ».
---

# Fiche caractère (layout papier xuan)

Outil : `fiche-caractere/make.py` à la racine du dépôt (voir `fiche-caractere/README.md`).

## Étapes
1. Identifier le caractère (un seul par fiche ; pour plusieurs, lancer une fois par caractère).
2. Choisir les textes :
   - **pinyin** : laisser le calcul automatique, sauf caractère à plusieurs lectures (ex. 行, 樂, 長) : passer `--pinyin` avec la lecture voulue dans le contexte ;
   - **étiquette** : par défaut `楷書 / KAISHU / écriture régulière · canon des Tang`. Pour une forme simplifiée : `--label 简体字 --title simplifié --subtitle "Chine · 1956"` (ou la date pertinente). Pour une vidéo en anglais : `--subtitle` traduit et `--unit STROKES --unit1 STROKE` ;
   - **sceau** : le caractère lui-même par défaut.
3. Lancer depuis `fiche-caractere/` :
   ```sh
   python3 make.py 福                 # image seule
   python3 make.py 福 --video         # image + tracé animé
   ```
4. Vérifier l'image produite (`sorties/<caractère>.png`) en la regardant, puis l'envoyer à l'utilisateur. La vidéo pleine qualité peut dépasser la limite d'envoi : proposer une version allégée si besoin.

## Règles
- Ne pas modifier le layout (positions, couleurs, polices) sans demande explicite : c'est le modèle validé par l'utilisateur. Traits **lisses** en encre noire, sans texture de pinceau.
- Si le caractère n'est pas couvert par Make Me a Hanzi (environ 9 500 caractères), le dire et proposer un caractère voisin ou une variante ; ne pas inventer de tracé.
- Les fichiers de `sorties/` ne sont pas versionnés.
