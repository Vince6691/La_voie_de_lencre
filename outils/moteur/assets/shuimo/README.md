# Banque shuimo — fond animé « papier de riz et paysage à l'encre »

- `planches/` : planches Nano Banana d'origine (`NN_famille_x.jpg`), prompts dans `PROMPTS.md`.
- `elements/` : éléments détourés (PNG transparents, encre et vermillon conservés) + `index.json`,
  générés par `python3 tools/build_shuimo.py [--sheet]` (planche de contrôle : `out/preview/shuimo_elements.png`).
- `paper.jpg` : papier xuan généré par le même script.

Familles : `lointain` (bandes de montagnes pâles), `massif` (plan moyen : groupes de sommets reliés, planches 08 ; remplacent les pics isolés de l'ancienne planche 02), `premier` (rochers, pins, bambous, branches —
`edges` indique le bord par lequel l'élément entre dans le cadre), `vie` (cascade, barque, pavillon, pont, sentier,
oiseaux), `ciel` (soleils, lunes, nuage), `brume` (nappes et lavis).

## Dans Remotion (`remotion/src/shuimo/`)

- `layout.ts` : `compose(graine, { move, mood, duration, clouds?, mist?, strokes? })` compose un plan — ciel, chaîne
  lointaine, massifs sur les côtés, détail de vie, oiseaux ou barque, premiers plans en coin. Même graine → même plan.
  Par défaut : nuages du ciel (`clouds`), sans brouillard entre les plans (`mist: true` le remet) ni coups de
  pinceau (`strokes: true`).
- `ShuimoBackground.tsx` : rendu en parallaxe (profondeur 0 lointain → 1 tout près). Mouvements : `pan`, `push`,
  `rise`, `focus` (mise au point qui glisse), `still`. Ambiances : `jour`, `aube`, `nuit`, `brume`. Halo de
  papier au centre pour le contenu.
- `InkEvents.tsx` : coups de pinceau lisses ou lavis le long des bords (skill `coup-de-pinceau`).
- `ShuimoDemo.tsx` : composition `ShuimoDemo` (30 s, quatre plans enchaînés par un voile de papier ; props
  `clouds`, `mist` et `strokes`). Skill associé : `fond-shuimo`.

```sh
cd remotion && npm run studio          # composition « ShuimoDemo »
npx remotion render ShuimoDemo out/shuimo_demo.mp4
```

Ajouter des planches : les déposer dans `planches/` (même nommage), relancer `tools/build_shuimo.py`, puis
`node sync.mjs`. Les planches actuelles font 896 × 1200 : une génération en plus haute définition rendra les
premiers plans plus nets.
