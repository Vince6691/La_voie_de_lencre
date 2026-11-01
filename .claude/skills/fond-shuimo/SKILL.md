---
name: fond-shuimo
description: Crée le fond animé « shuimo moderne » de la série 墨之道 dans une vidéo Remotion — papier xuan clair, paysage à l'encre composé à partir d'une banque d'éléments (montagnes lointaines, massifs, premiers plans en coin, barque, pavillon, soleil vermillon ou lune), parallaxe selon la profondeur, mouvements de caméra et ambiances, halo de papier au centre pour le contenu ; vie du paysage : vent (nuages qui passent, feuilles de bambou emportées par les rafales), petites volées d'oiseaux dessinées au pinceau, petites grues du Japon articulées, distique de poème classique qui flotte dans le fond. Utiliser quand l'utilisateur demande un fond shuimo, papier de riz, paysage à l'encre, lavis, « le fond de la démo », un arrière-plan chinois animé pour un plan ou une vidéo, des oiseaux, des grues, du vent, des vers de poème dans le fond, ou de nouveaux éléments pour la banque.
---

# Fond shuimo (Remotion)

Validé par l'utilisateur : « léger, propre ». Version de base : **bandes de nuages dans le ciel** (et soleil voilé),
**pas de brouillard** devant ou entre les montagnes (l'utilisateur n'en veut pas), **pas de coups de pinceau** (ils
relèvent du skill `coup-de-pinceau`, à ajouter seulement si on le demande).

Pour un **nouveau plan**, activer la vie du paysage validée (oiseaux dessinés, vent, grues, poème) : voir
« Utilisation ». Ces options sont désactivées par défaut dans `compose` pour ne pas changer les épisodes déjà
montés ; ne pas les ajouter aux épisodes existants sans que l'utilisateur le demande (il met lui-même ses vidéos à
jour).

## Où est quoi
- Banque : `outils/moteur/assets/shuimo/` — `planches/` (planches Nano Banana d'origine), `PROMPTS.md` (prompts et bloc de
  style moderne), `elements/` (éléments détourés + `index.json`), `paper.jpg`. Doc : `assets/shuimo/README.md`.
- Détourage : `python3 tools/build_shuimo.py [--sheet]` (depuis `outils/moteur/`), puis `node sync.mjs` dans `remotion/`.
  Grue (planche `09_grue_a.jpg`, sur fond vert) : `python tools/build_grue.py` → `elements/grue_corps.png`,
  `grue_aile.png`, `grue.json`, puis `node sync.mjs`.
- Code : `outils/moteur/remotion/src/shuimo/` —
  - `layout.ts` (`compose`) : la graine donne le paysage et tout ce qui y vit ;
  - `ShuimoBackground.tsx` (rendu, parallaxe, et pose de chaque chose vivante à sa profondeur) ;
  - `common.ts` : `vent()` et `ventCumul()`, le vent commun du plan ;
  - `Oiseaux.tsx` (volées dessinées), `Grue.tsx` (grues articulées), `Vent.tsx` (feuilles emportées),
    `Poeme.tsx` (poème qui flotte) et `poemes.ts` (banque de distiques) ;
  - `ShuimoDemo.tsx` : compositions `ShuimoDemo` (quatre plans, tout activé, un poème différent par plan) et
    `ShuimoOiseaux` (un plan de 12 s sans caractère, graine 540, pour juger oiseaux, grues, vent et poème).

## Utilisation
```tsx
import { compose } from './shuimo/layout';
import { ShuimoBackground } from './shuimo/ShuimoBackground';

// graine → plan reproductible ; pour un nouveau plan, avec la vie du paysage validée :
const shot = compose(37, { move: 'rise', mood: 'jour', duration: 8, oiseaux: 'vol', vent: true, grues: 1, poeme: true });
<Sequence from={…} durationInFrames={8 * fps}>
  <ShuimoBackground shot={shot} duration={8} />      {/* halo={false} pour retirer le voile central */}
  {/* contenu par-dessus : caractère, texte… */}
</Sequence>
```
- **Une graine différente par plan** : c'est ce qui évite la répétition (ciel, chaîne lointaine, 2 ou 3 massifs sur
  les côtés, détail de vie, premiers plans dans un ou deux coins, oiseaux ou barque, poème). Les tirages des
  oiseaux dessinés, des grues, des nuages qui passent et du poème sont faits à part : les activer ne change pas le
  reste du plan.
- **Mouvements** : `pan` (travelling latéral, `dir` ±1), `push` (avancée), `rise` (montée), `focus` (mise au point
  qui passe du lointain au premier plan), `still` (plan qui respire, pour un contenu à lire). Varier d'un plan à
  l'autre.
- **Ambiances** : `jour`, `aube` (ciel chaud), `nuit` (bleu-gris, lune), `brume` (voile clair, sans nappes).
- **Options de base** : `clouds` (bandes de nuages du ciel, soleil voilé ; activé par défaut) ; `mist: true` remet les
  nappes de brouillard (rejetées par l'utilisateur, seulement sur demande explicite) ; `strokes: true` ajoute les coups
  de pinceau ; `front: false` retire les premiers plans.
- **Vie du paysage** (validée, à activer pour les nouveaux plans) :
  - `oiseaux: 'vol'` — la volée est dessinée au pinceau (ailes en « V », battement à descente rapide et remontée
    lente, alternance battements / vol plané, grappe lâche derrière l'oiseau de tête, réaction aux rafales) au lieu
    de l'image fixe qui glisse (`'image'`, par défaut). Elle vole avec ou contre le vent (sens tiré au hasard).
  - `vent: true` — le vent du plan (brise et rafales espacées, `vent()` dans `common.ts`) devient visible : 3 bandes
    de nuages qui passent dans le ciel à des vitesses différentes et accélèrent dans les rafales, feuilles de
    bambou qui entrent par le bord d'où vient le vent pendant les rafales, filent puis retombent en tournoyant.
  - `grues: n` — n petites grues du Japon (corps de 80 à 120 px), marionnettes peintes : aile coupée au poignet,
    placée en 3D et vue de trois quarts en légère contre-plongée (aile proche et aile lointaine séparées), main en
    retard sur le bras et repliée à la remontée. Elles **battent des ailes sans arrêt** (pas de vol plané) et volent
    **en ligne droite**, horizontale ou en légère montée, dans un sens ou dans l'autre, plus bas que la bande des
    volées ; une grue qui va dans le sens d'une volée part loin devant (ou derrière) elle.
  - `poeme: true` — un distique de `poemes.ts` (un nombre : cette entrée ; vers de lune réservés aux plans `nuit`)
    flotte **dans le fond**, derrière les massifs (profondeur 0,2, emporté par la caméra), en haut du ciel du côté
    opposé au soleil ou à la lune : colonnes verticales de droite à gauche en **Ma Shan Zheng** (caractères
    **simplifiés**, la police n'a que ceux-là), source en petit fangsong à gauche (guillemets tournés pour la
    verticale), **sans sceau**, **sans voile de papier** derrière. Encre pâle (opacité 0,2 à 0,28) : il fait partie
    du paysage et n'attire pas l'œil. Il apparaît en fondu peu après le début du plan, **dérive lentement dans
    l'air** dans le sens du vent (sans avancer ni grossir), puis s'efface en fondu avant la fin du plan.
- Poème choisi à la main (texte propre à l'épisode) : `<Poeme vers={['…', '…']} source="…" debut={2} duree={6}
  shot={shot} />` par-dessus le fond (`x`, `top`, `taille`, `force`, `cote` pour le placer). Pour enrichir la banque :
  distiques de paysage dont tous les caractères sont dans Ma Shan Zheng et le fangsong (vérifier avec fontTools),
  texte et source vérifiés sur les éditions courantes.
- **Raccord entre plans** : fondu de 1,2 s à travers un voile de papier (voir `MistVeil` dans `ShuimoDemo.tsx`).

## Règles
- Plan moyen : **massifs** (planches `08_massifs_*`, groupes de sommets reliés). Les pics isolés de l'ancienne
  planche 02 ont été retirés (« pics étranges, dupliqués ») ; un élément n'apparaît qu'une fois par plan (`pickNew`).
  Un massif coupé par le bord de sa planche (`edges` l/r) est calé contre un bord du cadre, côté coupé hors champ
  (miroir si besoin) ; le détourage fond le côté coupé dans la brume (long fondu irrégulier).
- Le centre reste au contenu : massifs et premiers plans sur les côtés, halo de papier derrière le caractère, poème
  sur un côté du ciel.
- Style des éléments : encre moderne minimaliste, un seul accent vermillon (soleil, couronne des grues). Pour enrichir
  la banque, reprendre le bloc de style de `PROMPTS.md`, une planche d'éléments séparés sur fond blanc pur, nommée
  `NN_famille_x.jpg`, puis relancer le détourage ; un élément blanc (grue) se génère sur fond vert uni et se détoure à
  la couleur. Signaler que les planches actuelles (896 × 1200) rendent les premiers plans un peu mous : une génération
  en haute définition les rend nets.
- Essais écartés par l'utilisateur, à ne pas refaire : roseaux et bambous du premier plan qui plient au vent (« pas
  beau ») ; poème qui apparaît caractère par caractère, qui avance vers le spectateur, ou posé sur un voile de papier ;
  grues qui planent ou ondulent de haut en bas.
- Tout ce qui bouge est **fonction du temps du plan** (aucun état d'une image à l'autre) : n'importe quelle image se
  rend seule, dans le studio comme en rendu par morceaux.
- Vérifier par images fixes (`npx remotion still ShuimoDemo out/x.png --frame=N --scale=0.5`) ; pour un mouvement
  (battement d'ailes, dérive), une planche d'images en gros plan tirée d'un court rendu ; mesurer plutôt que juger à
  l'œil quand l'effet est faible (superposer deux instants en deux couleurs). Après une modification, recharger
  l'extrait dans le studio Remotion (`remotion-studio`, composition `ShuimoOiseaux` ou `ShuimoDemo`) pour que
  l'utilisateur le regarde ; l'utilisateur regarde sur téléphone : envoyer des extraits 720p compressés, et ne lancer
  un rendu 1080p complet qu'à sa demande.
