# Fiche caractère

Le layout « caractère sur papier xuan clair » de la vidéo 学, réutilisable pour **n'importe quel caractère** :
le caractère tracé à l'encre noire dans l'ordre de ses traits, l'étiquette d'époque (encre et vermillon),
le pinyin, le nombre de traits en vermillon et un sceau rouge.

```sh
cd fiche-caractere
python3 make.py 福                  # → sorties/福.png (fiche complète, 1920 × 1080)
python3 make.py 福 --video          # → + sorties/福.mp4 (tracé animé trait par trait)
```

| Option | Par défaut | Rôle |
|---|---|---|
| `--pinyin` | calculé (pypinyin) | pinyin affiché (utile pour les caractères à plusieurs lectures) |
| `--label` | `楷書` | étiquette d'époque en chinois (`--label ""` pour la retirer) |
| `--title` | `kaishu` | nom de l'écriture, en capitales vermillon |
| `--subtitle` | `écriture régulière · canon des Tang` | ligne sous le titre |
| `--seal` | le caractère | caractère du sceau (`--seal ""` pour le retirer) |
| `--unit` / `--unit1` | `TRAITS` / `TRAIT` | libellé du compteur (ex. `STROKES` / `STROKE` en anglais) |
| `--per-stroke` | `0.28` | secondes par trait dans la vidéo |
| `--hold` | `2.0` | pause finale sur la fiche complète |

Exemple pour une forme simplifiée :
`python3 make.py 学 --label 简体字 --title simplifié --subtitle "Chine · 1956" --video`

**Prérequis** : Python 3 avec `playwright` et `imageio-ffmpeg`, Node/npm. Au premier lancement, le script installe
les données de tracé (`hanzi-writer-data`, environ 30 Mo, dans `node_modules/`) et `pypinyin` si besoin.

**Sources et licences**
- Tracés et ordre des traits : *Make Me a Hanzi*, via hanzi-writer-data, licence Arphic Public License.
  Couvre environ 9 500 caractères, simplifiés et traditionnels.
- Polices : `../xue/assets/fonts` (LXGW WenKai TC, Noto Serif TC, Cinzel, Cormorant), licence OFL.

Le rendu (`fiche.html`) est une page autonome : `window.FICHE = {…}`, puis `window.draw(t)` dessine l'image
à l'instant `t`.
