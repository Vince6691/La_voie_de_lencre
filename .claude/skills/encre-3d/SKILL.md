---
name: encre-3d
description: Fondu entre une image 3D (style Pixar) et sa version peinte à l'encre shuimo (série 墨道), dans Remotion — révélation de la couleur depuis un point focal, encre qui gagne depuis les bords et s'arrête autour du sujet, ou « délavé » où le personnage garde sa couleur au cœur et la perd irrégulièrement vers ses extrémités (bouts des manches, pieds, objets tenus), comme une photo passée qui se fond dans le lavis. Utiliser quand l'utilisateur veut passer de la 3D au shuimo (ou l'inverse), faire se fondre un personnage dans un décor à l'encre, un morphing ou une transition encre/3D, ou « refaire l'effet du vieil homme / du pavillon ».
---

# Fondu encre ↔ 3D (Remotion)

Validé par l'utilisateur sur deux essais : pavillon dans une mer de nuages (révélation) et vieil homme qui écrit
水 à l'eau (encre qui gagne, puis délavé — l'effet qu'il préfère pour un personnage).

## Entrées
- **Une paire d'images alignées** : `<nom>_3d.jpg` et `<nom>_encre.jpg` dans `xue/assets/morph/`, même cadrage, mêmes
  proportions (vérifier la superposition : `Image.merge('RGB', (a, b, b))` sur les deux en gris ; un décalage visible
  donne un dédoublement pendant le fondu → demander une version mieux alignée).
- Version encre à générer avec Nano Banana, image 3D en référence :
  ```
  Same character, same pose, same framing, same proportions, redrawn as modern Chinese ink-wash art (shuimo): black and grey ink only, graded washes, soft wet edges bleeding into white paper, confident brush outlines, no colour except a few vermilion accents. Plain pure white background, nothing else in the image.
  ```
- Ranger et renommer les fichiers déposés par l'utilisateur (`assets/morph/<nom>_3d.jpg`, `<nom>_encre.jpg`).

## Les trois modes (`MorphEncre`, prop `dir`)
| `dir` | Effet | Préparation (`xue/tools/build_morph.py`) |
|---|---|---|
| `to3d` | lavis sur papier → la couleur naît au point focal et se répand comme de l'eau ; ce qui est loin reste à l'encre | entrée dans `PAIRS` : `focus` (fraction largeur, hauteur), `tall` (étirement vertical, ~2 pour un personnage debout) → `<nom>_champ.png` |
| `toInk` | 3D → l'encre gagne depuis les bords et s'arrête autour du sujet | même champ |
| `fade` | délavé : couleur pleine au cœur du personnage, qui s'éteint irrégulièrement vers ses extrémités (encre → photo passée → couleur), décor en shuimo | entrée dans `SUBJECTS` : `box` (cadre du personnage en pixels), `cut` (zones à retirer : ombre, sol), `core` (x, y, rx, ry du cœur : torse/visage) → `<nom>_couleur.png` |

Frontière (to3d / toInk) : couleur derrière le seuil, juste devant une 3D délavée en gris, au bord un liseré d'encre
humide, au-delà le lavis sur papier xuan. Le délavé n'a pas de frontière.

## Étapes
1. Ajouter la paire dans `PAIRS` et/ou `SUBJECTS`, puis `python3 tools/build_morph.py` (depuis `xue/`).
2. Pour `fade`, contrôler la silhouette (elle est tirée de la version encre : traits sombres, fermés et remplis, dans
   `box`) en superposant le masque à l'image 3D ; ajuster `box` / `cut`. Elle peut englober l'espace entre les jambes
   ou un objet posé : le dire à l'utilisateur.
3. Déclarer une composition dans `remotion/src/Root.tsx` (1280 × 720, 8 s pour les essais) :
   `<Composition id="Morph…" component={MorphEncre} … defaultProps={{ name, dir, focus, end }} />` —
   `end` : seuil final (to3d ~0,6 : part de l'image en couleur ; toInk ~0,27 : resserrement autour du sujet ; fade : 1).
4. `node sync.mjs` dans `remotion/`, images fixes de contrôle (`npx remotion still … --frame=N`), puis rendu.

## Réglages
- Vitesse : la propagation dure ~4,8 s à partir de 1 s (`(t - 1.0) / 4.8` dans `MorphEncre.tsx`), puis tenue.
- Irrégularité du bord : poids du bruit `fractal` (champ 0,045 ; délavé 0,16) ; taches plus fines → ajouter une
  petite échelle dans `fractal`.
- Délavé : `core` (où reste la couleur), `edge` (épaisseur du délavé au contour, `din / 45`), minimum de couleur aux
  extrémités (`1 - 0.8 * …` : baisser 0,8 pour garder plus de teinte).
- Photo passée : `washed` dans `MorphEncre.tsx` (28 % de couleur, éclaircie, multipliée par le papier).

## Règles
- Ne pas réintroduire de brouillard ni de gouttes d'encre (rejetés ailleurs par l'utilisateur) ; un léger travelling
  avant (7 %) accompagne le fondu.
- Images de 1376 × 768 : suffisant en 720p ; demander une version 2K pour un rendu 1080p net.
- L'utilisateur regarde sur téléphone : envoyer des extraits 720p compressés et une image fixe de l'état final ;
  pas de rendu 1080p sans demande.
