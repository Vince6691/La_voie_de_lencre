# 学 — 3 000 ans d'histoire d'un caractère

Animation vidéo (≈ 2 min 06, 1920×1080, 30 i/s) générée **entièrement par du code** :
l'évolution du caractère 學 / 学 (*xué*, « apprendre ») depuis les os oraculaires jusqu'à la
forme simplifiée, composante par composante.

- **Vidéo finale** : `rendu/xue_evolution.mp4`
- **Sous-titres** : `rendu/xue_evolution.fr.srt` (à téléverser sur YouTube)
- **Texte de la voix off** : `SCRIPT.md`

## Principe pédagogique

Chaque composante garde **la même couleur** d'une écriture à l'autre :

| Couleur | Composante | Sens |
|---|---|---|
| rouge | 𦥑 | deux mains |
| or | 爻 *yáo* | baguettes à compter (croisements) |
| jade | 冖 | toit, bâtiment |
| bleu | 子 | enfant (apparaît avec les bronzes Zhou) |
| orange | ⺍ | abréviation cursive de tout le haut (𦥑 + 爻) |

Les formes archaïques (甲骨文, 金文, 小篆, 隸書, 草書) sont tracées à la main dans
`src/glyphs.js`, avec le même nombre de traits par composante pour permettre les
métamorphoses animées d'une écriture à l'autre. Les formes 楷書 學 et 学 viennent de la
police LXGW WenKai TC (contours extraits par `tools/extract_glyphs.py`).

## Déroulé

| Temps | Scène |
|---|---|
| 0:00 | Accroche : 学, flash des 7 formes, « APPRENDRE » |
| 0:07 | Shang, Anyang (v. 1250 av. J.-C.) : carte, plastron de tortue, gravure de 爻 + toit + mains |
| 0:28 | Zhou : carte, vase ding et estampage, arrivée de 子 ; le tir à l'arc au 學宮 (inscription du *Jing gui*) |
| 0:49 | Qin, 221 av. J.-C. : unification, 書同文, petit sceau et sa symétrie |
| 1:02 | Xu Shen, *Shuowen jiezi* (v. 100) : 斆，覺悟也 … 冂，尚矇也 |
| 1:13 | Han, écriture des clercs : aplatissement, 燕尾, les mains deviennent « 臼 » |
| 1:23 | Kaishu : 學, 16 traits |
| 1:28 | Cursive → ⺍, imprimés Song–Yuan, Japon 1949 / Chine 1956, 学 en 8 traits |
| 1:45 | Conclusion : bandeau des 7 formes, rubans de composantes |
| 1:59 | Carte de fin (appel au commentaire, 墨道) |

## Reconstruire

```sh
pip install playwright pillow numpy scipy imageio-ffmpeg fonttools
./tools/prepare_voice.sh                 # silences rognés
python3 tools/build_timeline.py          # timeline depuis assets/voice_fast/*.wav
python3 tools/render.py preview 12.5 40  # images de contrôle dans out/preview/
./tools/render_all.sh                    # vidéo complète → out/xue_evolution.mp4
```

`src/index.html?play` rejoue l'animation en temps réel dans un navigateur (servir le dossier
`xue/` en HTTP).

- Voix off : ElevenLabs, voix « German Epic Trailer Voice – Helmut », modèle `eleven_v4`
  avec balises d'interprétation (`[deep voice]`, `[dramatically]`…) et noms chinois en API
  (`assets/voice_v4/*.mp3`), silences rognés (`assets/voice_fast/`). `src/warp.js` recale les
  ancres de l'animation sur cette prise. (`assets/voice/` : première prise, « Helmut German »,
  `eleven_multilingual_v2`, conservée pour comparaison.)
- Musique et bruitages : synthèse procédurale (`tools/audio.py`) — bourdon, cordes,
  guzheng pentatonique, taiko, souffles, craquements d'os, gong de bronze.
- Polices : LXGW WenKai TC, Noto Serif TC, Cinzel, Cormorant Garamond (licence OFL).

## Points historiques à vérifier avant publication

Les formes archaïques sont des **reconstitutions stylisées** fidèles à la structure attestée,
pas des fac-similés d'une inscription précise. Pour un calque exact, fournir les PNG (zdic)
et remplacer les tracés dans `src/glyphs.js`. Points à contrôler :

- Les dates « Japon 1949 » (当用漢字字体表) et « Chine 1956 » (汉字简化方案) pour 学.
- La mention des imprimés populaires Song–Yuan (cf. 《宋元以來俗字譜》, 1930).
- Le rattachement du 學宮 et de l'enseignement du tir à l'arc à l'inscription du *Jing gui* 靜簋.
