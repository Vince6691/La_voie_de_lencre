# Prononciation des noms chinois — voix « Chinese narration » (ElevenLabs eleven_v4)

Lexique commun à tous les épisodes : ce qui a été **validé à l'oreille** par l'utilisateur, et ce qui a **raté**. À relire
avant d'écrire `VOIX.md` ; à compléter après chaque écoute de prises (une ligne par cas, avec l'épisode).

## Règles (dans l'ordre où les vérifier, nom par nom, avant d'envoyer un bloc)
1. **Forme** : simplifié **propre au chinois** (师, 韩愈, 晋, 语, 汉) ; un simplifié **partagé avec le japonais** (学, 文,
   教, 孝, 宋…) est lu en japonais → traditionnel, ou pinyin, ou « le caractère X » dans la phrase.
2. **Place** : le nom **au milieu d'une phrase qui continue**, entre deux mots français ou entre deux virgules
   (« Au royaume de 晋 vit le plus grand musicien de la cour, 师旷, le maître Kuàng. »). Jamais :
   - isolé par une ponctuation juste après lui (« Au royaume de 晋, le… ») ;
   - après un verbe de nomination suivi de deux-points (« On l'appelle 师旷 : ») ;
   - en tout début ou en toute fin de bloc ;
   - juste après un nombre (« trois 师 », « trois shī » : blanc, puis syllabe fausse).
3. **Mots composés rares** (京师) : faux en caractères **et** en pinyin (« Jīngshī ») → les laisser **à l'écran**,
   et les dire en français (« la capitale porte notre caractère dans son nom »).
4. **Pinyin avec tons** : bon pour une syllabe isolée dans une phrase (shī, zā, fù, wú, fǎ, Kuàng, Fāngyán) ; à éviter
   pour un mot que la voix connaît en caractères.
5. **Réutiliser mot pour mot** une tournure déjà validée quand on réécrit un bloc : on change le reste de la phrase,
   pas l'entourage immédiat du nom.
6. **Phrase-test** (avant de régénérer un long bloc pour un seul nom risqué) : une seule génération courte, 2 à 3
   variantes du passage séparées par « … », ≈ 50 crédits au lieu de ≈ 900 pour deux prises du bloc entier.

## Validé à l'oreille
| Forme dans le texte | Contexte exact | Épisode |
|---|---|---|
| 老师 | « …en entrant en classe : 老师. » | 師 |
| 语 | « …la fin de l'épisode sur 语… et il n'est pas né… » | 師 |
| 周, 商 | « La dynastie 周 renverse les 商. » | 師 |
| 洛邑 | « …dans la nouvelle ville de 洛邑. » | 師 |
| 师氏 | « …veille un officier, le 师氏. » | 師 |
| 晋, 师旷 | « Au royaume de 晋 vit le plus grand musicien de la cour, 师旷, le maître Kuàng. » | 師 |
| 唐, 韩愈 | « Sous la dynastie 唐, … Le lettré 韩愈 leur répond… » | 師 |
| 师傅 | « …et dans 师傅, le maître artisan. » | 師 |
| 一日为师，终身为父 | proverbe cité en caractères, puis traduit | 師 |
| le caractère 文 | « Dans l'épisode précédent, le caractère 文, l'homme tatoué… » | 師 |
| shī, zā, fù, Kuàng | pinyin dans une phrase | 師 |
| 语, 言 dans une phrase ; wú, fǎ, shī ; Fāngyán | voir `episodes/yu/VOIX.md` | 語 |
| 學, 學校 (traditionnel) | le simplifié 学 était lu en japonais | 學 |

## Raté (ne pas refaire)
| Forme | Contexte | Défaut | Épisode |
|---|---|---|---|
| wén | « Dans l'épisode précédent, wén, l'homme tatoué » (pinyin isolé) | mal prononcé | 師 |
| 师 / shī | « Le roi forme trois 师 » / « trois shī » | long blanc, syllabe fausse | 師 |
| 京师 / Jīngshī | « …prend un nom : 京师, … » | faux deux fois | 師 |
| 晋 | « Au royaume de 晋, le plus grand… » | mal prononcé | 師 |
| 师旷 | « On l'appelle 师旷 : le maître Kuàng » | mal prononcé | 師 |
| /y̌/, /jɛ̌n/ (IPA) | accroche du 語 | faux | 語 |
| 方言 | « Le livre s'appelle 方言 » | lu « fo yan » → Fāngyán | 語 |
| 许慎 | en fin de bloc | écorché | 美 |
| 教 isolé | tout début d'accroche | « xiu a » → /tɕjâʊ/ ou « Jiào » ; « /tɕjâʊ/. » + point = deux « jiao » | 教 |
