---
name: fond-shuimo
description: Crée le fond animé « shuimo moderne » de la série 墨道 dans une vidéo Remotion — papier xuan clair, paysage à l'encre composé à partir d'une banque d'éléments (montagnes lointaines, pics, premiers plans en coin, barque, pavillon, oiseaux, soleil vermillon ou lune), parallaxe selon la profondeur, mouvements de caméra et ambiances, avec un halo de papier au centre pour le contenu. Utiliser quand l'utilisateur demande un fond shuimo, papier de riz, paysage à l'encre, lavis, « le fond de la démo », un arrière-plan chinois animé pour un plan ou une vidéo, ou de nouveaux éléments pour la banque.
---

# Fond shuimo (Remotion)

Validé par l'utilisateur : « léger, propre ». Version par défaut **sans brume ni nuages** et **sans coups de
pinceau** (ceux-ci relèvent du skill `coup-de-pinceau`, à ajouter seulement si on le demande).

## Où est quoi
- Banque : `xue/assets/shuimo/` — `planches/` (planches Nano Banana d'origine), `PROMPTS.md` (prompts et bloc de
  style moderne), `elements/` (95 éléments détourés + `index.json`), `paper.jpg`. Doc : `assets/shuimo/README.md`.
- Détourage : `python3 xue/tools/build_shuimo.py [--sheet]` (depuis `xue/`), puis `node sync.mjs` dans `remotion/`.
- Code : `xue/remotion/src/shuimo/` — `layout.ts` (`compose`), `ShuimoBackground.tsx` (rendu), `ShuimoDemo.tsx`
  (composition `ShuimoDemo`, props `clouds`, `strokes`).

## Utilisation
```tsx
import { compose } from './shuimo/layout';
import { ShuimoBackground } from './shuimo/ShuimoBackground';

const shot = compose(37, { move: 'rise', mood: 'jour', duration: 8 });   // graine → plan reproductible
<Sequence from={…} durationInFrames={8 * fps}>
  <ShuimoBackground shot={shot} duration={8} />      {/* halo={false} pour retirer le voile central */}
  {/* contenu par-dessus : caractère, texte… */}
</Sequence>
```
- **Une graine différente par plan** : c'est ce qui évite la répétition (ciel, chaîne lointaine, 2 à 4 pics sur
  les côtés, détail de vie, premiers plans dans un ou deux coins, oiseaux ou barque).
- **Mouvements** : `pan` (travelling latéral, `dir` ±1), `push` (avancée), `rise` (montée), `focus` (mise au point
  qui passe du lointain au premier plan), `still` (plan qui respire, pour un contenu à lire). Varier d'un plan à
  l'autre.
- **Ambiances** : `jour`, `aube` (ciel chaud), `nuit` (bleu-gris, lune), `brume` (voile clair, sans nappes).
- **Options** (désactivées par défaut, à n'activer que sur demande) : `clouds: true` remet les nappes de brume,
  le nuage du ciel et le soleil voilé ; `strokes: true` ajoute les coups de pinceau.
- **Raccord entre plans** : fondu de 1,2 s à travers un voile de papier (voir `MistVeil` dans `ShuimoDemo.tsx`).

## Règles
- Le centre reste au contenu : pics et premiers plans sur les côtés, halo de papier derrière le caractère.
- Style des éléments : encre moderne minimaliste, un seul accent vermillon (soleil). Pour enrichir la banque,
  reprendre le bloc de style de `PROMPTS.md`, une planche d'éléments séparés sur fond blanc pur, nommée
  `NN_famille_x.jpg`, puis relancer le détourage. Signaler que les planches actuelles (896 × 1200) rendent les
  premiers plans un peu mous : une génération en haute définition les rend nets.
- Vérifier par images fixes (`npx remotion still ShuimoDemo out/x.png --frame=N --scale=0.5`) ; l'utilisateur
  regarde sur téléphone : envoyer des extraits 720p compressés, et ne lancer un rendu 1080p complet qu'à sa demande.
