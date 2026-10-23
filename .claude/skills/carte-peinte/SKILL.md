---
name: carte-peinte
description: Cartes « premium » peintes (série 墨道) réutilisables d'un épisode à l'autre — bibliothèque outils/moteur/assets/cartes (catalogue cartes.json avec vraie légende, cadrage, emprise, crédit, épisodes qui l'utilisent), image-guide au cadrage exact rendue par Remotion, prompt Nano Banana par type de carte, vérification de l'alignement, puis habillage dans Remotion (cachets de lieux en vermillon, noms en fangsong, transcription, traits de pinceau effilés, capitale en petit sceau qui pulse, lavis de région, crédit). Type 1 : « soie_song » (carte antique peinte sur soie, manière Song). Utiliser quand l'utilisateur veut une carte plus belle / premium / peinte, réutiliser une carte d'un autre épisode, ajouter une carte à la bibliothèque, ou dépose une carte peinte à intégrer.
---

# Carte peinte (bibliothèque partagée)

Validée sur le 語 (bloc 7 : parlers de Yang Xiong vers Chang'an ; bloc 8 : dialectes d'aujourd'hui) : « Très belles
cartes ». Principe : **l'image ne porte aucun texte** ; elle est repeinte par Nano Banana sur un guide géographique
rendu par notre moteur au cadrage exact d'une vue `{ lon, lat, k }`, donc tout ce qu'on pose dessus avec
`E.proj(vue, [lon, lat])` tombe juste. Une même carte sert à tous les épisodes qui ont besoin de ce cadrage.

## Où est quoi
- Bibliothèque : `outils/moteur/assets/cartes/`
  - `cartes.json` — **catalogue** : `types` (nom, description, prompt Nano Banana par type) et `cartes` (une entrée par
    carte : `id`, `type`, `titre`, `legende`, `vue`, `emprise` en degrés, `peinte`, `guide`, `taille`, `contenu`,
    `credit` affiché à l'écran, `sources`, `episodes` qui l'utilisent et pour quoi).
  - `README.md` — le même catalogue, lisible (vignettes, légendes) ; le tenir à jour avec `cartes.json`.
  - `peintes/<id>.jpg` (16:9, ≥ 1920 × 1080) et `guides/<id>.jpg`.
- Copie : `node sync.mjs` → `public/cartes/{peintes,guides}/`, catalogue → `src/data/cartes.json`.
- Code : `outils/moteur/remotion/src/cartes/CartePeinte.ts` — `carte(id)`, `chargerCartes(ids)`, `fondCarte`,
  `creditCarte`, `lieu`, `routePinceau`, `capitale`. Guides : composition `CartesGuides` (image n = carte n du catalogue).
- Vérification : `python3 outils/moteur/tools/verifier_carte.py <id> [sortie.jpg]` (contours du guide en rouge sur la
  carte peinte ; défaut `outils/moteur/out/verif_<id>.jpg`).
- Modèle d'usage : `YangXiong` et `Today` dans `src/shuimo_yu/YuV1.tsx`.

## Cartes disponibles (voir le catalogue pour le détail)
| id | type | vue | pour |
|---|---|---|---|
| `chine_centre_nord` | soie_song | 112.5, 34.2, k 52 | fleuve Jaune, plaine centrale, Shang → Han, Chang'an, Anyang, Linzi |
| `chine_centre_sud` | soie_song | 112.0, 30.0, k 40 | Chine des fleuves jusqu'à Hainan et Taïwan, dialectes, Pékin → Canton |

**Avant d'en commander une nouvelle, chercher dans le catalogue une vue qui couvre déjà les lieux** (champ `emprise`) :
une carte existante + une poussée de caméra vaut mieux qu'une nouvelle génération.

## Ajouter une carte
1. **Vue** : choisir `{ lon, lat, k }` (k = px par degré de longitude ; latitude × 1,18). Emprise :
   `lon ± 960/k`, `lat ± 540/(1,18 k)`. Garder les lieux importants hors des 120 px du bord et du coin haut gauche
   (cartouche d'époque) et du bas (sous-titres, y > 900).
2. **Catalogue** : ajouter l'entrée dans `cartes.json` (id en `region_position`, sans épisode dans le nom : la carte
   est géographique, sans frontière ni époque), avec `legende` (ce que montre la carte, de quoi à quoi, pour quels
   sujets), `emprise`, `contenu`, `credit`, `sources`. `node sync.mjs`.
3. **Guide** : `npx remotion still src/index.ts CartesGuides <...>/assets/cartes/guides/<id>.jpg --frame=<n>`
   (n = rang dans le catalogue).
4. **Prompt** : donner à l'utilisateur le `prompt` du type (Nano Banana, mode édition, guide joint), une génération par
   carte. L'utilisateur dépose l'image ; la renommer `peintes/<id>.jpg` (`git mv`) dès son arrivée.
5. **Vérifier** avec `verifier_carte.py` : côtes et fleuves doivent coller (un décalage de quelques px est normal ; une
   île ou un fleuve déplacé → régénérer). Le fleuve Jaune est au cours actuel (vers le Bohai) ; le dire si l'épisode
   parle d'une époque où il passait ailleurs.
6. Mettre à jour `README.md` de la bibliothèque et le tableau ci-dessus.

## Habillage dans Remotion
```tsx
import { capitale, carte, chargerCartes, creditCarte, fondCarte, lieu, routePinceau } from '../cartes/CartePeinte';
// au chargement (avec les polices et images, sous delayRender) :
chargerCartes(['chine_centre_nord']);
// dans le dessin du panneau de carte (t = temps courant) :
const v = carte('chine_centre_nord').vue, c = E.proj(v, CHANGAN);
const z = 1 + 0.07 * ease(seg(t, t0, t1));                    // lente poussée vers le sujet
ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(z, z); ctx.translate(-c[0], -c[1]);
fondCarte(ctx, E, 'chine_centre_nord');                        // image peinte (repli : carte vectorielle)
// régions : E.mapLayer(..., E.region(...), alpha) en lavis très doux (vermillon 0,07)
LIEUX.forEach(([zh, fr, p], i) => {
  const q = E.proj(v, p);
  routePinceau(ctx, q, c, ease(seg(t, tr + i * 0.15, tr + 1.1 + i * 0.15)), a, { seed: i });
  lieu(ctx, E, q, zh, fr, a, { cote: 'd' });                   // 'g' pour mettre le nom à gauche du cachet
});
capitale(ctx, E, c, '長安', "Chang'an", '長安 · capitale des Han', t, t0 + 0.5, [tr + 0.8, tr + 2.2]);
ctx.restore();
creditCarte(ctx, E, 'chine_centre_nord');                      // hors zoom, sinon rogné
```
- Polices requises dans la composition : `ShuimoLegende` (Zhuque Fangsong, **noms et légendes en chinois**),
  `Cormorant` (transcriptions, noms latins), `Zhuan` (petit sceau du cachet de la capitale).
- Ordre de dessin : fond → régions → routes → cachets et noms → capitale (son cartouche papier masque les routes
  qui arrivent) → `restore` → crédit.
- Routes : épaisses au départ, effilées à l'arrivée, marges libres autour des cachets (`marge0`, `marge1`) ;
  `courbe` 0,18 par défaut (négatif pour courber de l'autre côté si deux routes se croisent).

## Règles
- **Aucun texte dans l'image peinte** ; tout le texte est posé par Remotion (traduisible, corrigeable).
- **Noms chinois en fangsong** (`ShuimoLegende`), jamais en kai sur les cartes ; caractères de l'époque (traditionnels
  pour l'histoire, simplifiés pour la Chine d'aujourd'hui).
- Cachets en vermillon (`PIGMENT.hand`) ; le petit sceau est juste pour un cachet Han (繆篆) ; un nom de lieu
  ordinaire reste en fangsong.
- Toujours le **crédit** du catalogue en bas à droite (« carte peinte d'après Natural Earth »).
- Vérifier les collisions sur une image fixe en pleine résolution au moment le plus chargé (toutes les routes
  arrivées) : nom sur une route, nom sous un sous-titre, nom dans le cartouche d'époque.
- Ne pas dessiner `E.drawMap` à chaque image (lent) : le repli passe par `E.mapLayer`.

## Types de carte
- **Type 1 — `soie_song`** : carte antique sur soie, manière Song (prompt dans `cartes.json`). Pour toute époque
  impériale ou antique.
- Types suivants à définir avec l'utilisateur (ex. carte gravée sur pierre type 禹跡圖, carte d'estampage, carte
  moderne au lavis) : ajouter le type et son prompt dans `cartes.json`, puis une section ici.
