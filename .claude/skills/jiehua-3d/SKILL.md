---
name: jiehua-3d
description: Bâtiment ou objet chinois en 3D rendu comme un dessin (界畫, série 墨道) dans Remotion + three.js — tracé au crayon directement en perspective (lignes de fuite, tremblé de la main, traits qui dépassent, seulement ce qui se voit), épure qui pâlit, pièces déjà colorées qui arrivent de l'extérieur sans se croiser et s'emboîtent, peinture finale des décors et filets d'or, inscription verticale et sceau, sur le fond shuimo ; caméra tournante 360° ou montage en plans ; bande son synchronisée sur la chronologie exacte (crayon, vent de caméra, impacts au contact). Utiliser quand l'utilisateur demande un bâtiment d'époque qui se dessine / se construit, un pavillon, une salle, un temple, des consoles 斗拱, une vue éclatée ou un assemblage de pièces, un objet 3D « qui reste un dessin », un trait d'encre ou de crayon sur un modèle 3D, une caméra qui tourne autour d'un objet, ou « refaire le 界畫 / le canevas / la pagode ».
---

# 界畫 en 3D : dessin en perspective, assemblage, peinture (Remotion + three.js)

Validé par l'utilisateur après de nombreuses itérations. Version de référence : **`JiehuaCanevas`** (10 s, style
Song). Elle se déroule ainsi :
- un seul plan tournant à 360°, qui part tout près en contre-plongée sur l'angle et finit en trois quarts plongeant ;
- le canevas se trace au crayon en perspective ;
- il pâlit en épure ;
- les pièces peintes arrivent et se fixent ;
- les décors et l'or sont peints ;
- l'inscription 營造法式殿堂圖 s'écrit, puis le sceau 界畫 se pose.

## Où est quoi (`xue/remotion/src/jiehua3d/`)
| Fichier | Contenu réutilisable |
|---|---|
| `model.ts` | `buildModel('song' \| 'qing')` : salle 3×2 travées, toit 歇山. Le modèle se décrit en **groupes de traits** (ordre du chantier, `sketch: 'none' \| 'main'` pour le crayon), **volumes** (`box`, `cyl`, `quad`, `poly` avec `paint`) et **pièces d'assemblage** (`path: side \| fall \| slide`, `w`, `deco`, `gold`). Repère : y en haut, z vers le spectateur, 1 unité ≈ 1 m. Les paramètres d'un style sont dans `CFG` (terrasse, linteaux, consoles, profil du toit, ferme). |
| `inkline.ts` | **`InkLines`** : rubans de traits tournés vers l'écran, avec largeur en px, charge d'encre et fraîcheur. Deux modes : pinceau (`pushStroke`, attaque, plein, sortie sèche) et **crayon** (`pushPencil` : tremblé, dépassement aux bouts, pression, grain du papier). L'option `hidden` dessine les traits cachés (`GreaterDepth`). Indépendant du modèle : sert pour **n'importe quelle géométrie 3D**. |
| `camera.ts` | `applyCamPersp` (le zoom est en px par unité au point visé), `orbit(start, end, s)`, `montage(shots)` avec ses coupes, `timeWarp` (ralenti local), `kicks` (secousses sur les temps forts), `camSpeed` (pour le son). |
| `Jiehua3D.tsx` | Utilitaires : `clamp`, `ease`, `lerp`, `ptsOf`, `partial`, `timeLines`. Contient aussi `PALETTE` (pigments Song et Qing), `mkMat` (shader papier, lavis depuis une graine, décors `uDeco` : 彩畫, anneaux d'or, relief des tuiles), `solidGeo` et `roofGeo`. |
| `JiehuaFeuille.tsx` | Assemblage : `buildParts(m, pal, {land0, land1, gold0, gold1})` → pièces avec maillages, trajet, instant d'arrivée et filets d'or ; `pathOff` (trajet qui dépasse puis se recale) ; `meshesOf`. |
| `JiehuaCanevas.tsx` | La séquence de référence : calendrier en constantes en tête, `prep()` (traits du crayon et lignes de fuite), `Scene`, `canevasEvents()` (chronologie pour le son). |
| `exportEvents.ts` | Écrit `xue/assets/jiehua/events.json`. |
| Autres essais | `Jiehua3D` (traits à l'encre en projection parallèle, puis lavis ; existe aussi en Qing), `JiehuaPli` (dessin à plat qui se soulève du papier), `JiehuaFeuille` (feuille de face, puis le maître prolonge les fuyantes), `../jiehua/JiehuaDemo` (version 2D à la règle). |

Son : `xue/tools/build_jiehua_audio.py` ; les bruitages ElevenLabs sont dans `xue/assets/jiehua/src/` (voir le
`README.md` du dossier). Les caméras déjà essayées et leurs réglages sont dans `references/cameras.md`.

## Ce que l'utilisateur veut (et ne veut pas)
- **Un vrai dessin en perspective**, comme un dessin traditionnel : lignes de construction vers les points de fuite
  d'abord, puis le canevas au crayon, avec une main naturelle. Pas d'élévation plate qui « se lève ».
- **Seulement ce qui se voit de l'extérieur** : pas de charpente intérieure. Les traits cachés sont masqués par des
  volumes qui n'écrivent que la profondeur.
- **Aucun outil à l'écran** : la règle et le pinceau visibles ont été rejetés.
- **L'épure devient très peu visible**, surtout le toit (`GHOST` 0,13 et `GHOST_HIGH` 0,045 au-dessus de `HIGH_Y`).
- **Les pièces arrivent de l'extérieur du cadre, déjà colorées simplement, sans se croiser**, du bas vers le haut, et
  se fixent sur l'épure. Les **décors et l'or ne viennent qu'à la peinture finale**.
- Caméra : il veut un mouvement **épique**. Le montage en plans à coupes franches lui a moins plu (« pas fan ») que
  **le plan tournant unique de 360°** sur 10 s. Pour ce plan : pas de ralenti et pas de brume finale (vue d'en haut,
  elle couvrirait la façade).
- **Le son doit être calé à l'image près** sur les mouvements et le tracé (voir la partie Son).

## Réutiliser
- **Autre bâtiment, même famille** : ajouter un style dans `CFG` et `PALETTE` (Style = 'song' | 'qing' | …), ou
  ajuster les paramètres. Chaque nouvelle pièce doit avoir un groupe de traits (avec `sketch`), des volumes peints et
  une `Part` à son rang dans l'ordre du chantier.
- **Autre objet** (pagode, porte, char, bronze 鼎, caractère en volume…) : écrire un constructeur qui renvoie la
  même forme que `Model` (`groups`, `solids`, `parts`, plus les repères utilisés par les lignes de fuite dans
  `prep()`). `Scene` et le son suivent sans autre changement. Pour un objet sans toit, retirer `roofGeo` de
  l'occulteur et le cas `roof`.
- **Seulement le trait crayon ou encre sur une géométrie** : `InkLines` + `pushPencil`/`pushStroke` + un occulteur
  (fusion des volumes réduits de 0,04, `colorWrite: false`, `polygonOffset` 6/12, `renderOrder` 0).
- **Changer de caméra** : remplacer `camAt` par `orbit(...)` ou `montage(SHOTS).camAt`, et mettre `CUTS` à jour
  pour le son. Le fond shuimo suit avec `scroll={(c.az - az0) * 90}`.
- **Changer la durée** : décaler les constantes du calendrier (`GUIDE`, `SK`, `FADE`, `LAND`, `PAINT`, `GOLD`,
  `INSCR`, `T_SEAL`) et `JIEHUA_CANEVAS_SECONDS`, puis refaire le son.

## Son (toujours refaire après une modification de l'animation)
Depuis `xue/remotion/` :
```bash
npx esbuild src/jiehua3d/exportEvents.ts --bundle --platform=node --log-level=error --external:react --external:remotion \
  --external:@remotion/three --external:@react-three/fiber --external:three > out/exportEvents.cjs && node out/exportEvents.cjs
python3 ../tools/build_jiehua_audio.py && node sync.mjs        # → assets/jiehua/bande.wav → public/jiehua/
```
Le bundle doit rester dans `remotion/out/`, sinon `react` est introuvable.

La bande son est mixée d'après `events.json` :
- **crayon** : son modulé par la longueur de trait tracée à chaque image ;
- **vent** : synthétisé selon la vitesse de caméra, avec 3 grands souffles sur les pics, un souffle et un taiko à
  chaque coupe ;
- **impacts** : l'attaque de chaque bruitage est **calée sur l'instant de contact** (`contactsOf`), pas sur
  l'arrivée nominale, car les pièces dépassent puis se recalent (sinon ~0,23 s de retard) ;
- **musique de synthèse** : bourdon, guzheng, taiko sur les grosses pièces, flûte xiao, glissando sur l'or, guqin
  sur le sceau ; plus le pinceau, des touches sur les caractères, le sceau et le gong.

La musique ElevenLabs a échoué faute de crédits : son nœud existe dans le flow « 墨道 — 界畫 canevas : son »
(`ZDPGtYzMSrXGEyZgdckm`).

## Rendu
Navigateur : `HS=$(readlink -f /opt/pw-browsers/chromium_headless_shell)` (le chemin versionné change d'un
conteneur à l'autre). Avant le premier rendu dans un conteneur neuf : `npm ci` puis `node sync.mjs`.
```bash
timeout 280 npx remotion still JiehuaCanevas out/j3/s.png --frame=150 --scale=0.5 --browser-executable=$HS --log=error
npx remotion render JiehuaCanevas out/j3/x_720p.mp4 --scale=0.6666666666666666 --crf=23 --concurrency=4 \
  --timeout=120000 --audio-codec=aac --audio-bitrate=192k --browser-executable=$HS --log=error
```
- Vérifier d'abord par images fixes, pas plus de 2 à la fois.
- Envoyer un aperçu 720p ; **ne rendre en 1080p que sur demande**.
- Le facteur d'échelle s'écrit exactement 0,6666666666666666 (sinon la hauteur fait 720,036).
- `--concurrency` ne doit pas dépasser le nombre de cœurs.

## Pièges déjà rencontrés
- **Le trait clignote ou des traits manquent** : three.js garde en cache le nombre d'instances. Il faut créer une
  **géométrie neuve à chaque image**, comme le fait `InkLines.set`.
- **Traits en pointillés** le long des faces : il faut réduire l'occulteur (boîtes −0,04, cylindres r−0,02, toit
  −0,03) et utiliser un `polygonOffset`.
- **Pièces blanches pendant le vol** : le lavis dépend de la distance à la place finale. Mettre `uReveal = 3`
  pendant le vol.
- **Pièces qui traversent le toit** : vérifier les longueurs des pannes et des fermes dans `model.ts`.
- **Décors absents** : `uDeco` doit être affecté à chaque image, sur la terrasse comme sur les pièces. Une
  affectation s'était retrouvée dans un commentaire.
- Les groupes « free » ont une durée minimale : écart `min(0.06, T*0.3/(n-1))`.
- En GLSL, `half` est réservé.
- Dans un filtre SVG, `feComposite arithmetic` noircit les couleurs : utiliser `operator="in"`.
- Ne jamais lancer `pkill -f "remotion render…"` depuis un shell dont la ligne de commande contient le motif : le
  shell se tue lui-même.
