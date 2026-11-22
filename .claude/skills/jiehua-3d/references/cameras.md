# Caméras essayées pour le 界畫 3D

Les coordonnées sont celles de `model.ts` (salle Song, la terrasse fait ±12 × ±9, le faîte est vers y ≈ 12). Une
`Cam` s'écrit `{ az, el, zoom, target }` :
- `az` : 0 = face, azimut positif = vers la droite ;
- `el` : élévation, négative en contre-plongée ;
- `zoom` : pixels par unité au point visé en 1080p (environ 40 montre la salle entière, 150 un détail).

Les fonctions viennent de `src/jiehua3d/camera.ts`.

## 1. Plan tournant 360°, 10 s (version validée, commit c17e220)
```ts
const START: Cam = { az: 0.8, el: -0.08, zoom: 150, target: [8.3, 3.4, 5.6] };   // tout près, contre-plongée, angle avant droit
const END: Cam = { az: 0.8 + 2 * Math.PI, el: 0.6, zoom: 41, target: [0, 6.2, 0] };  // trois quarts plongeant
const camAt = orbit(START, END, 10);   // le tour ne s'arrête jamais ; recul sur les 3/4 ; montée sur toute la durée
const CUTS: number[] = [];
```
Calendrier associé, en secondes :
- 0,15–0,95 : lignes de fuite ;
- 0,5–3,6 : crayon ;
- 3,6–4,1 : le dessin pâlit en épure ;
- 4,6–6,7 : arrivée des pièces (vol de 0,6 s) ;
- 6,8 : décors ;
- 7,0–7,8 : or ;
- 8,1 : inscription ;
- 9,4 : sceau.

Le fond suit l'orbite avec `scroll={(c.az - 0.8) * 90}`. Pas de brume.

## 2. Montage en plans, 16,5 s (commit ceb2c4d) : jugé moins bon que le plan tournant
Il y a des coupes franches et chaque plan a sa rampe de vitesse. L'animation passe en ralenti autour du contact du
toit, avec un tremblement au moment du contact, et des secousses de zoom marquent les grosses pièces.
```ts
const C = (az: number, el: number, zoom: number, target: V3): Cam => ({ az, el, zoom, target });
const FAR = C(0.2, 0.38, 27, [-3.5, 7.5, 0]);
const S3B = C(0.02, 0.16, 62, [0, 6.8, 5]), S8B = C(0.02, 0.1, 35, [0, 7.8, 3]), S9B = C(-0.08, 0.16, 68, [0, 7.2, 5]);
const SHOTS: Shot[] = [
  { t0: 0, t1: 1.7, a: C(1.05, 0.09, 115, [10.2, 1.5, 8.6]), b: C(0.93, 0.13, 92, [8.5, 2.0, 7.4]), e: out3 },  // ras de la terrasse, les fuyantes filent
  { t0: 1.7, t1: 3.1, a: C(0.5, 0.78, 52, [2, 2.6, 3]), b: C(0.78, 0.62, 56, [3.5, 4.2, 3]), e: io3 },        // forte plongée, colonnes et linteaux
  { t0: 3.1, t1: 4.3, a: C(0.22, 0.1, 66, [3, 5.8, 5]), b: S3B, e: io3 },                                    // contre-plongée sur la façade
  { t0: 4.3, t1: 5.8, a: S3B, b: C(0.55, 0.55, 39, [0, 7, 0]), e: io5 },                                     // panoramique fouetté jusqu'au toit
  { t0: 5.8, t1: 6.85, a: C(0.68, 0.4, 36, [0, 6, 0]), b: C(0.56, 0.42, 39, [0, 6, 0]), e: io3 },            // l'épure en trois quarts
  { t0: 6.85, t1: 8.2, a: C(1.0, 0.09, 46, [3, 5.2, 2]), b: C(0.78, 0.13, 50, [2, 6.4, 2]), e: io3 },        // les pièces arrivent (côté droit)
  { t0: 8.2, t1: 9.25, a: C(-0.8, 0.11, 46, [-2, 7, 1]), b: C(-0.58, 0.17, 44, [-1, 7.3, 0]), e: io3 },      // … côté gauche
  { t0: 9.25, t1: 10.3, a: C(0.12, 0.07, 37, [0, 7.6, 3]), b: S8B, e: out3 },                                // plan héroïque pour le toit
  { t0: 10.3, t1: 12.0, a: S8B, b: S9B, e: io5 },                                                            // poussée sur les consoles (peinture)
  { t0: 12.0, t1: 14.2, a: S9B, b: FAR, e: io3 },                                                            // grue arrière dans le paysage
  { t0: 14.2, t1: 16.0, a: FAR, b: C(0.24, 0.38, 26, [-3.5, 7.5, 0]), e: (u) => u },
];
const { camAt, cuts: CUTS } = montage(SHOTS);
// ralenti au contact du toit : timeWarp(16, [{ at: roof - 0.1, depth: 0.6, width: 0.3 }])
```
Calendrier associé, en secondes :
- 0,3–1,7 : lignes de fuite ;
- 1,1–5,8 : crayon ;
- 5,8–6,6 : le dessin pâlit en épure ;
- 7,1–10 : arrivée des pièces (vol de 0,8 s) ;
- 10,2 : décors ;
- 10,6–11,8 : or ;
- 12–14,2 : brume et recul ;
- 13 : inscription ;
- 14,6 : sceau.

## 3. Essais plus anciens (`Jiehua3D`, `JiehuaFeuille`)
- **Projection parallèle** (caméra orthographique, `applyCam` dans `Jiehua3D.tsx`) : très « dessin à la règle »,
  mais moins vivante. Les plans rapprochés `close[]` et le plan large `wide` sont définis dans `CFG`.
- **Sortie en recul** : on part sur un détail (pied de colonne, console d'angle), puis on recule vers la vue
  d'ensemble pour que le spectateur voie d'abord une portion se faire.

## Conseils
- Interpoler le zoom de façon géométrique (`camMix` le fait), sinon le recul traîne à la fin.
- Garder le tour toujours en mouvement (`steady` ≈ 0,15) : un arrêt en plein tour paraît accidentel.
- Une contre-plongée sous la terrasse (el < −0,1 tout près) fait passer la caméra sous le sol. Viser un point plus
  haut ou remonter `el`.
