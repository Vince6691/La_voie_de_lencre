---
name: rouleau-du-temps
description: Transition « premium » d'une époque à l'autre (série 墨道) dans une vidéo Remotion — la caméra recule et montre le rouleau peint (table de bois, montage de soie, bâtons qui tournent), le paysage shuimo défile en parallaxe avec une accélération franche, jours et nuits passent, une frise de sceaux d'époques se trace au centre et un curseur (le caractère étudié, ou un point d'encre) glisse d'un sceau à l'autre sous un compteur d'années ; ralenti, silence, impact, le sceau d'arrivée scintille et s'envole vers le cartouche d'époque. Utiliser quand l'utilisateur demande une transition entre époques, entre dynasties, « le rouleau du temps », « la frise des sceaux », un passage Shang → Zhou, Zhou → Qin, etc., ou une animation qui montre qu'on se déplace dans le temps.
---

# Rouleau du temps (Remotion)

Validé par l'utilisateur (« très bien fait ») après plusieurs itérations : frise des sceaux au centre, caractère
en curseur, rythme spectaculaire, **un seul mouvement de caméra à la fin** (pas de plongée puis retour).

## Où est quoi
- Composant : `xue/remotion/src/rouleau/TimeScroll.tsx` — `TimeScrollStage`, `TimeScrollConfig`, `ERAS_XUE`,
  `cursorPose`, `arrivePose`, `morphK`, `tagIn`, `travelM`, `IMPACT`, `Seal`.
- Démo autonome : composition `RouleauDemo` (`src/rouleau/RouleauDemo.tsx`, 周 → 秦, curseur point d'encre).
- Exemple complet : `src/shuimo_xue/` (essai tout shuimo du 學, Shang → Zhou, le 學 en curseur dessiné par le canvas
  `InkStage` avec `glyphPose` = `cursorPose` / `arrivePose`).
- Sons : `xue/assets/rouleau/` (`rouleau.wav` 5 s : souffle, glissando de guzheng, silence, impact ; `gong.wav`),
  générés par `python3 tools/build_sfx.py` (depuis `xue/`), copiés par `node sync.mjs`.
- Dépend du fond shuimo (skill `fond-shuimo`) : paysages `compose(seed…)`, papier, éléments du ciel.

## Utilisation
```tsx
const CFG: TimeScrollConfig = { at: 22.4, from: 0, to: 1, years: [-1250, -1046] }; // eras par défaut : ERAS_XUE
<TimeScrollStage cfg={CFG}
  under={/* couches du monde sous les paysages, ex. un autre paysage plus tôt */}
  fromLandscape={{ seed: 5, since: 5.8 }}           // paysage de l'époque quittée, depuis `since`
  toLandscape={{ seed: 9, until: 44 }}               // paysage de la nouvelle époque, jusqu'à `until`
  defaultCursor={false}>                             // true : point d'encre si l'appelant ne dessine pas de curseur
  {/* contenu dans le monde du rouleau (suit la caméra) : canvas, caractère… */}
</TimeScrollStage>
{/* couches d'écran de l'appelant : cartouche d'époque à tagIn(CFG, t), légendes… */}
```
- **Le caractère en curseur** : le dessiner à `cursorPose(CFG, t)` (x, y, échelle `s`) ; la forme d'arrivée à
  `arrivePose(CFG, t)` (elle grandit vers le centre après l'envol du sceau) ; fondu de l'une à l'autre avec
  `morphK(CFG, t)` (métamorphose pendant la glissade). Un élément qui n'arrive qu'avec la voix (ex. l'enfant 子)
  reste caché jusqu'à sa phrase.
- **Cartouche d'époque** : le sceau volant se pose au centre (156, 136), 92 px (`cfg.tag` pour changer) ; afficher
  le cartouche avec l'opacité `tagIn(CFG, t)`, sans translation (sinon saut).
- **Époques** : `eras` (sceau + date affichée), `from` / `to` (indices, non adjacents possibles), `years` (signés,
  négatif = av. J.-C.). Échelle régulière (même place pour chaque époque), les vraies dates sous les sceaux.
- **Durée** : 5 s par défaut (`duration`, 3 à 5 s pour bien comprendre) ; le son suit (`playbackRate`).

## Règles
- Prévoir dans la voix une pause de la durée de la transition (la voix ne parle pas pendant le voyage) ; décaler la
  suite de la scène d'autant.
- Polices requises dans la composition : `ShuimoKai` (LXGW WenKai TC) et `ShuimoLatin` (Cormorant).
- Plusieurs transitions dans une vidéo : un `TimeScrollStage` par passage (chacun dans sa séquence) ; varier
  légèrement (sens, intensité, durée) pour éviter l'effet « même animation à chaque fois ». La frise n'apparaît que
  pendant la transition (l'utilisateur trouve une frise permanente « trop exposé historique »).
- Vérifier par images fixes aux instants clés (u = 0,3 ; 0,81 impact ; 0,92 envol), puis extrait 720p compressé
  pour le téléphone ; pas de rendu 1080p complet sans demande.
