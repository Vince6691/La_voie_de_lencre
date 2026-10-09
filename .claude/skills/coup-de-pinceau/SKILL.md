---
name: coup-de-pinceau
description: Ajoute des coups de pinceau animés (série 墨道) dans une vidéo Remotion — traits d'encre lisses qui se tracent avec le profil d'un vrai pinceau (attaque oblique, plein, longue sortie effilée), ou larges lavis gris, posés le long des bords du cadre, puis qui sèchent et pâlissent. Utiliser quand l'utilisateur demande des coups de pinceau, traits d'encre, « le tracé des traits » du fond shuimo, une animation d'encre qui accompagne un plan, un caractère ou la voix off, ou veut « remettre les coups de pinceau de la démo shuimo ».
---

# Coups de pinceau (encre lisse, Remotion)

Code : `xue/remotion/src/shuimo/InkEvents.tsx` (rendu SVG) et `common.ts` (cadre 1920 × 1080, aléa, type
`InkEvent`). Validé par l'utilisateur dans la démo `ShuimoDemo` : il préfère ces traits aux gouttes d'encre.

## Ce que fait un coup de pinceau
- **Trait** (`stroke`) : une seule courbe douce (pas de zigzag). Attaque oblique et franche, plein atteint vite,
  puis effilement long jusqu'à une pointe fine. Encre plus dense à l'attaque, plus claire vers la sortie.
  Vitesse d'un geste : départ posé, accélération, sortie rapide (≈ 0,8 s).
- **Lavis** (`wash`) : bande gris clair, large, bords fondus (≈ 1,5 s).
- Ensuite l'encre **sèche** : l'opacité baisse sur ~4 s sans jamais disparaître (trait 0,8 → 0,4).
- Bord à peine organique (léger déplacement), **jamais de texture « griffure »** : l'utilisateur veut un trait lisse.

## Utilisation
```tsx
import { InkEvents, edgeStrokes } from './shuimo/InkEvents';

// instants (en secondes, temps local de la séquence) où un coup de pinceau part
const strokes = edgeStrokes(42, [1.2, 4.5, 7.8]);              // graine → placement reproductible
// options : edgeStrokes(seed, times, { edges: ['l', 'r', 'b', 't'], wash: 0.3 })

const t = useCurrentFrame() / useVideoConfig().fps;
<InkEvents events={strokes} t={t} night={false} />            // au-dessus du fond, sous le contenu
```
- `edgeStrokes` place chaque trait le long d'un bord (gauche, droite, bas ; `t` = haut, exclu par défaut pour
  laisser le ciel libre), orienté le long du bord et retourné vers l'intérieur s'il sortait du cadre.
- Pour un placement précis, écrire les `InkEvent` à la main : `{ type, t, x, y, angle, size, seed }` — départ
  `(x, y)`, direction `angle` en radians, `size` ≈ 1 (longueur ~460 px, épaisseur ~46 px ; lavis 680 × 90).
- `night` : encre bleu-noir pour les ambiances nocturnes.

## Règles
- Garder le **centre libre** pour le contenu (caractère, texte) : traits sur les bords seulement, 2 ou 3 par plan
  de 8 s environ, pas plus. Les espacer d'au moins 2 s.
- **Caler sur la voix** quand il y en a une : faire partir un trait au début d'une pause de la narration
  (pauses de `xue/tools/gaps.json` ou silences détectés par `xue/tools/silences.py`), pas pendant une phrase clé.
- Ne pas réintroduire les gouttes d'encre (rejetées par l'utilisateur) ni de texture de pinceau sèche.
- Vérifier avec des images fixes (`npx remotion still <Composition> out/x.png --frame=N --scale=0.5`) avant tout
  rendu ; l'utilisateur regarde souvent sur téléphone : lui envoyer un extrait 720p compressé, pas le 1080p.
