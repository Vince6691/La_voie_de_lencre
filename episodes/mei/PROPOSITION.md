# 美 (měi) — proposition tout shuimo, voix off v2 (≈ 5 min) — v2

## Cadrage (réponses de l'utilisateur)
- **Angle** : mouton ou parure ? Pourquoi la beauté porte-t-elle un mouton sur la tête ? (reprend la passerelle du 文).
- **Étapes** : dynastie Shang (os) et les Qiang · Royaumes combattants (bambou, Laozi de Guodian) · dynastie Han
  (soie de Mawangdui, Xu Shen), dynastie Song, aujourd'hui. Pas d'étape Zhou : le bronze n'apparaît qu'en indice muet.
- **Carte** : le royaume de Chu et la tombe de Guodian.
- **Portrait** : Laozi — format libre, à innover.
- **Clips 3D** : 2 (A le danseur paré ; B Laozi et le scribe sur bambou).
- **Durée** : autour de 5 min. **Passerelle** : autre que 善 / 義 / 鮮 — proposition : 舞, à valider.
- **Carte blanche** pour innover sur l'intro, le format du portrait, ou toute autre idée.
- **v2** (doute de l'utilisateur sur le mouton) : l'histoire est retournée. La parure est la vraie réponse ; le
  mouton est une **fausse piste** née d'une forme d'écriture, comme le faux 孝 du 教.

## Les nouveautés proposées
1. **Intro « ombre derrière le papier »** : le papier éclairé par derrière comme une lanterne ; une ombre danse, coiffée
   de longues plumes ; elle se fige… et devient le signe de l'os. Puis le 美 moderne se trace par-dessus.
2. **L'enquête aux deux sceaux** : deux suspects posés dès l'accroche dans les coins hauts — **飾 « parure »**
   (malachite) et **甘 « savoureux »** (gomme-gutte). À chaque époque, l'indice tombe en goutte d'encre sous l'un
   d'eux. Verdict au bloc 6 : 甘 se fend et tombe, 飾 se pose sur le caractère.
3. **Portrait-calligramme de Laozi** : les caractères du vers 天下皆知美之為美 tombent sur des lattes de bambou, qui
   s'assemblent en la silhouette du vieux maître ; un lavis remplit la forme ; « portrait imaginé ».
4. **La naissance de l'erreur, en direct** : au petit sceau, la coiffe redessinée bien symétrique glisse sur le 羊 du
   petit sceau et s'y superpose presque — le spectateur *voit* pourquoi Xu Shen s'est trompé.
5. **Xu Shen n'a jamais vu un os** : les os de divination ne sont redécouverts qu'en 1899. Le dernier rouleau
   s'arrête en 1899, pas aujourd'hui : c'est l'os qui rend le verdict.
6. **Gag de fin** : 美國 (le « beau pays ») contre 米国 au Japon (le « pays du riz »).

**Question du début :** pourquoi, depuis deux mille ans, dit-on que la beauté chinoise est un gros mouton ?
**Réponse :** parce qu'un lettré des Han, qui n'avait jamais vu les formes les plus anciennes, a lu un mouton dans une
coiffe. Sur l'os, 美 est un homme debout paré de plumes : la beauté était une parure. Le mouton, c'est l'écriture qui
l'a fabriqué.
**Maxime :** le mouton, c'est le scribe qui l'a vu ; le danseur, lui, ne portait que des plumes.

**Fil visuel :** la coiffe, en **malachite** (la parure) — elle ne passe en **gomme-gutte** (le mouton) qu'à partir du
petit sceau, quand l'erreur naît. Pigments constants : l'homme 大 en azurite · la coiffe en malachite · le mouton de
l'erreur en gomme-gutte (puis ocre barré au récapitulatif).
`⏸` = pause (1–2 s) ; `⏸⏸` = silence long (un seul) ; `[ROULEAU]` = voix muette.

## Formes retenues (小學堂, `glyphes/mei_xiaoxue/`, planche `glyphes/planche_xiaoxue.png`)
| Époque | Support | Forme | Fichier | Ce qui change |
|---|---|---|---|---|
| Dynastie Shang | os | homme de face, **coiffe à quatre branches** | `00` (後2.14.9) ; `01` ; `02` (deux branches) | — |
| Dynastie Zhou (indice muet) | bronze | la coiffe se resserre, branches courbes | `03` (美爵) | — |
| Royaumes combattants | bambou de Chu | « beau » écrit **媺**, sans mouton | à trouver (voir SOURCES) | — |
| Qin | petit sceau | coiffe symétrique **= 羊** | `05` (說文) | **naissance de l'erreur** |
| Dynastie Han | soie (Mawangdui) | 羊 sur 大, pinceau | `08` (老子乙前) | — |
| Han, clercs | stèle | grand trait final | `11` (曹全碑) | — |
| Aujourd'hui | régulière | 美, 9 traits | `glyphes/traits/mei.json` (Make Me a Hanzi, à extraire) | — |
Comparaisons : 羊 oraculaire et petit sceau (`xiaoxue.py 羊`) ; 𡵂 oraculaire (ancêtre de 微) si disponible.

---

## 1. Accroche — 0:00
[curious] Une ombre danse derrière le papier. Sur sa tête, de longues plumes. ⏸ Elle s'arrête… et devient un signe.
Trois mille ans plus tard, ce signe s'écrit ainsi : 美. Beau. ⏸ Et depuis deux mille ans, on vous explique que sa tête
est un mouton. Un gros mouton… bon à manger. ⏸ Alors, la beauté : une parure, ou un repas ? Menons l'enquête.
> plan : papier éclairé par derrière (lumière chaude au centre, bords sombres) ; silhouette dansante en ombre (clip A
> passé en ombre — luminance seuillée et floutée derrière le papier — ou silhouette animée au pinceau) ; sur « devient
> un signe », elle se fige, l'ombre se resserre en forme Shang `00` à l'encre (bruitage gravure) ; fondu net vers 美
> moderne tracé trait par trait (`drawStrokes`, `brush: false`) ; sur « un mouton », 羊 s'allume en gomme-gutte
> (punch +3,5 %) ; un mouton dodu se dessine un instant à sa place (rappel de la fin du 文) ; sur « une parure, ou un
> repas », les sceaux 飾 (malachite) et 甘 (gomme-gutte) se posent dans les coins hauts (bruitage sceau ×2).

## 2. La dynastie Shang — l'os — 0:25
Vers 1200 avant notre ère, à Anyang, capitale de la dynastie Shang. Sur les os de divination, le signe est un homme,
debout, de face : 大, le même que dans 文. ⏸ Sur sa tête, une coiffe : quatre longues branches, dressées vers le ciel.
⏸ Or, sur ces mêmes os, le mouton a sa tête à lui : un museau en pointe, deux cornes qui retombent. Ici, rien de tel.
C'est un homme paré. Un danseur, peut-être, coiffé de plumes. ⏸ Premier indice : sur l'os, la beauté se porte.
> plan : paysage `fond-shuimo` (seed Shang, aube, brume) ; `InkStage` : plastron tamponné, fissures, forme `00`
> révélée en blanc puis à l'encre ; 大 en azurite, la coiffe en malachite (halo) ; caméra en poussée sur la coiffe ;
> sur « le mouton a sa tête », 羊 oraculaire (`羊/00`) estampé à côté, museau et cornes en gomme-gutte — comparaison
> côte à côte, puis 羊 pâlit ; **clip Seedance A « danseur »** entrée à travers `00` (`VideoReveal
> mode="glyphe"`), sortie au pinceau ; sur « la beauté se porte », goutte d'encre sous 飾 (indice 1).

`[ROULEAU 1 — Shang → Royaumes combattants, 6 s, long : 00 en curseur, passe brièvement en 03 au sceau des Zhou]`

## 3. Les Royaumes combattants — le bambou — 1:25
Huit siècles plus tard, la Chine se déchire en Royaumes combattants. Au sud, le royaume de Chu. ⏸ En 1993, à Guodian,
on ouvre la tombe d'un maître de Chu : sur des lattes de bambou, le plus ancien Laozi connu. Et ce vers : « Quand tout
le monde sait ce qui est beau… voilà la laideur. » ⏸ Regardez comment le scribe écrit « beau » : pas l'ombre d'un
mouton. ⏸ Deuxième indice : à Chu, personne n'y pense.
> plan : **carte** (`MapPanel`, `E.mapLayer` + `E.mapDeco`, `paper: true`) : les Royaumes combattants, Chu au sud en
> région animée, marqueur Guodian (près de Jingmen) ; poussée caméra sur Guodian. **Portrait-calligramme de Laozi**
> (≈ 8 s) : le vers tombe en lattes, les lattes s'assemblent en silhouette, lavis, « portrait imaginé ». **Clip Seedance
> B « Laozi et le scribe »** entrée à travers le caractère de la latte (`mode="glyphe"`), sortie au pinceau. Gros plan
> latte : 媺, emplacement du mouton vide (halo pointillé) ; goutte sous 飾 (indice 2).

## 4. Qin et Han — l'erreur — 2:10
221 avant notre ère : la dynastie Qin impose une seule écriture, le petit sceau. Les scribes y mettent de l'ordre :
la coiffe devient bien symétrique… deux cornes, trois traits. ⏸ Exactement comme le mouton. ⏸ Vers l'an cent, sous la
dynastie Han, Xu Shen écrit le premier grand dictionnaire. Il voit un mouton sur un homme. Il conclut : « Savoureux.
Car le mouton est la bête qu'on sert à table. » ⏸ Mais Xu Shen n'a jamais vu un os de divination. Personne, à son
époque, n'en avait jamais vu.
> plan : paysage d'hiver ; **naissance de l'erreur** : forme `05` tracée, sa coiffe glisse sur le 羊 du petit sceau
> et s'y superpose presque (coiffe malachite → gomme-gutte au contact, punch) ; soie de Mawangdui en fond pour la forme
> `08` ; citation 美，甘也。从羊从大 en colonne (légende ≥ 38 px) ; portrait discret de Xu Shen au pinceau (silhouette) ;
> goutte sous 甘 (indice 3, « faux » : la goutte est grise) ; sur « jamais vu », l'os de `00` passe derrière lui en
> transparence.

`[ROULEAU 2 — Han → Song, 3,5 s, rapide, impact sec]`

## 5. La dynastie Song — l'erreur à table — 2:55
Sous la dynastie Song, un autre lettré résume : « Mouton grand, donc beau. » L'erreur devient un proverbe. ⏸ Il faut
dire qu'à la cour, le mouton est la viande des empereurs. Et les étudiants ont un dicton : « Sais ton Su Dongpo par
cœur, tu mangeras du mouton. Sinon… de la soupe aux légumes. »
> plan : paysage de neige, pavillon (seed Song) ; 羊大則美 calligraphié ; banquet en lavis ; 蘇文熟，喫羊肉 /
> 蘇文生，喫菜羹 en deux colonnes, la seconde pâlit (gag) ; goutte sous 甘 (indice 4, gris).

`[ROULEAU 3 — Song → 1899, 5 s, classique : 美 en curseur ; arrivée sur Pékin, fin des Qing]`

## 6. Le verdict — 3:25
1899. À Pékin, des os gravés sortent enfin de terre — on les vendait comme « os de dragon », pour la médecine. ⏸ Et
sur ces os, le vieux signe réapparaît : un homme… et ses plumes. ⏸ Verdict : la beauté était une parure. Le mouton,
c'est l'écriture qui l'a fabriqué. ⏸ Mais la langue a gardé un peu des deux : 美麗, beau à voir… et 美食, bon à
manger. ⏸ Quant à l'Amérique, 美國, c'est seulement pour le son. Au Japon, on l'écrit avec le riz.
> plan : os « de dragon » dans une boutique d'apothicaire en lavis ; forme `00` révélée de nouveau (bruitage gravure) ;
> verdict : 甘 se fend et tombe (bruitage sceau cassé), 飾 glisse et se pose sur 美 (gong 1/3) ; 美麗 / 美食
> calligraphiés ; gag 美國 / 米国 en deux petits sceaux.

## 7. Scène récapitulative — 4:05
Reprenons. Dans toutes ses formes, il garde deux dessins. L'homme, debout, de face. Et sur sa tête, la coiffe : des
plumes sur l'os, des branches courbes sur le bronze. ⏸ Au petit sceau, elle prend la forme d'un mouton… et le mouton
reste. ⏸ Ainsi naît měi : le beau, la parure.
> plan : **scène récapitulative obligatoire** (`drawBand` de `JiaoV1`) : bandeau horizontal `00` (os) → `03`
> (bronze) → `05` (petit sceau) → `08` (soie) → `11` (clercs) → 美 (régulière), étiquettes écriture + époque ;
> rubans : l'homme 大 en azurite, la coiffe en malachite. Clignotement sur les repères `formes`, `homme`, `coiffe`
> (trois fois dans toutes les formes). **Accident** sur « petit sceau » (repère `sceau`) : `05` grossit, sa coiffe en
> ocre, 羊 au-dessus, barré sur « le mouton reste » ; **Fin** : toutes les couleurs reviennent sur « Ainsi naît »
> (repère `naissance`).

## 8. Chute et passerelle — 4:30
Le mouton, c'est le scribe qui l'a vu. Le danseur, lui, ne portait que des plumes. ⏸
Et notre danseur n'a pas fini : il tient encore ses plumes dans les mains. Ce caractère-là… danse.
> plan : `fiche-caractere` 美 (sceau, pinyin, 9 traits) ; passerelle : **舞** oraculaire (homme tenant des ornements
> dans les deux mains) esquissé, les ornements en malachite ; coupé net → écran de fin.

---

## Chiffres
≈ 600 mots → ≈ 4 min 50 à 125 mots/min + 14,5 s de rouleaux + portrait-calligramme → **≈ 5 min 10**.

## Passerelle (à valider)
- **舞 (recommandé)** : la danse ; sur l'os, un homme qui tient des ornements dans les deux mains — prolonge le danseur.
- Autres : 大 (l'homme de face lui-même), 羊 (le vrai mouton, pour régler ses comptes), 微 (le jumeau de 美 :
  l'homme aux plumes, qui a pris un autre chemin).

## Titres possibles
1. Non, la beauté chinoise n'est pas un mouton
2. L'erreur de 2 000 ans cachée dans ce caractère chinois
3. Ce caractère chinois cache un danseur

## À vérifier avant enregistrement (détail dans SOURCES.md)
- Lecture « homme paré de plumes » : majoritaire chez les modernes, mais pas unanime (cornes de mouton, de bœuf, bois
  de cerf ; 高華平 : coiffe en tête de mouton). Garder « peut-être » sur le danseur, et « un homme paré » comme fait.
- Comparaison sur l'os faite sur les formes 小學堂 : 羊 oraculaire = museau en V + cornes recourbées vers le bas ;
  美 `00`/`01` = quatre branches dressées. En revanche 羌 (homme de profil à deux cornes) ressemble trop à 美 `02` :
  comparaison 羌 retirée de la voix (les Qiang, choisis au cadrage, ne sont plus cités — à confirmer).
- Guodian (1993, tombe ≈ 300 av. J.-C.), Laozi A (latte 9 selon ctext) : graphie de « beau » (媺 ?) — **à vérifier**.
- Petit sceau `05` et 羊 du petit sceau : ressemblance à montrer, pas à affirmer au-delà.
- Xu Shen (vers 100) : 美，甘也。从羊从大。羊在六畜主給膳也。 Os redécouverts en 1899 (Wang Yirong et les « os de
  dragon » : récit traditionnel, à présenter sans nommer Wang Yirong ou avec « dit-on »).
- Xu Xuan (édition de 986) : 羊大則美. Lu You, 《老學庵筆記》 : 蘇文熟，喫羊肉；蘇文生，喫菜羹.
- 美 « savoureux » bien attesté dans les textes anciens (美味) : la langue a gardé les deux sens.
- 美國 (transcription d'« Amérique ») / 米国 au Japon (亜米利加).
