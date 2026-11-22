# Idées d'animations 墨道 (banque à piocher)

Ces idées viennent d'une séance de recherche. Aucune n'est encore réalisée, sauf mention contraire.

Chaque entrée indique son but pédagogique et la technique en Remotion : SVG, masques, `strokeDashoffset`, morphing
de chemins, canvas, ou three.js quand c'est nécessaire. Quand une idée est réalisée, noter ici la composition ou la
skill qui la porte.

Déjà réalisés, pour mémoire : fond shuimo, rouleau du temps, coups de pinceau, fondu encre ↔ 3D, fiche caractère,
**界畫 3D** (skill `jiehua-3d` : bâtiment dessiné au crayon puis assemblé et peint, avec une caméra qui tourne).

## 1. Retenir un caractère (priorité)
Ces formats s'appuient sur ce qui fait vraiment retenir : le double codage image et sens, l'histoire
mnémotechnique, le découpage en morceaux connus, se tester soi-même et revoir au bon moment.

| # | Format | Idée | Technique |
|---|---|---|---|
| 1 | Pictogramme qui respire | objet → caractère → objet (½ s) → caractère : le va-et-vient grave le lien (山, 門) | morphing de chemins SVG |
| 2 | Fantôme dans le caractère | l'image du sens en filigrane derrière les traits (oiseau derrière 鳥) | image masquée par le glyphe, faible opacité |
| 3 | Le caractère joue son sens | 休 s'adosse à l'arbre, 森 pousse, 飛 bat des ailes, 雨 fait tomber ses points, 火 vacille | rotation et ondulation de certains traits |
| 4 | Briques colorées | chaque composante a une couleur et une icône fixes dans toute la série (氵 goutte bleue, 木 arbre vert, 口 bouche rouge) | table de couleurs partagée, masques par composante |
| 5 | Équation-histoire | 女 + 子 = 好 : les composantes glissent et s'emboîtent pendant qu'une phrase mnémotechnique s'écrit | ressorts, morphing, texte au pinceau |
| 6 | « 3 briques que tu connais » | annoncer les composantes connues avant un caractère complexe, puis assembler | icônes, assemblage en cascade |
| 7 | Écris avec moi | tracé lent avec l'ordre des traits numéroté, un point lumineux qui guide, « trace-le dans ta paume » | Make Me a Hanzi, `strokeDashoffset` |
| 8 | Rythme du tracé | une note par trait, le caractère devient une petite mélodie | événements de trait → sons |
| 9 | Pause devinette | caractère seul, minuteur au pinceau de 3 s, puis la réponse : essayer de deviner fait retenir | arc SVG qui se trace |
| 10 | Caractère à trou | une composante manque, 3 propositions, la bonne se loge avec un clic | glissement et rebond |
| 11 | Faux amis | 己 / 已 / 巳, 日 / 目, 末 / 未 : une loupe montre la différence | `clipPath` circulaire |
| 12 | Rappel de fin | les 3 à 5 caractères de l'épisode sans traduction, 1 s chacun, puis la réponse | séquence de cartes |
| 13 | Retour surprise | un caractère vu plus tôt réapparaît caché dans un nouveau et s'allume dans sa couleur | surlignage de composante |
| 14 | Mur des caractères appris | une planche qui grandit d'épisode en épisode ; le nouveau caractère vient s'y ranger | grille persistante (données JSON) |
| 15 | Sceau du caractère maîtrisé | un sceau vermillon valide le caractère, comme une récompense | impression d'un tampon |
| 16 | Dans le monde réel | une rue stylisée où le caractère s'allume sur les enseignes (出口, 入) | illustration 2D et surlignage |
| 17 | Mini-scène | saynète de 4 s en ombres à l'encre pour un caractère abstrait (愛, 德, 忠) | silhouettes animées |

**Routine proposée par épisode** :
1. devinette (9) ;
2. briques et histoire (4 + 5) ;
3. image (1 + 2) ;
4. geste (7) ;
5. retour surprise au milieu de l'épisode (13) ;
6. rappel de fin et sceau (12 + 15).

## 2. Structure et évolution des caractères
- **Le caractère qui se range** : les traits arrivent en désordre et se posent dans la grille 田字格 avec un rebond.
- **Code couleur sens / son** : vermillon pour la composante qui donne le sens, bleu pour celle qui donne le son,
  avec des étiquettes et des flèches tracées.
- **Loupe** sur un caractère complexe (鬱, 龘) : la composante isolée et sa forme ancienne apparaissent dans la loupe.
- **Grille des 214 clés** façon tableau de Mendeleïev : elle s'allume par vagues, puis une case se retourne.
- **Morphing d'époques** : os → bronze → sceau → clérical → kaishu, avec une frise et un compteur d'années.
- **Écran partagé** : 5 colonnes, une par époque, le même caractère tracé en même temps, chacune avec la texture de
  son support.
- **Arbre généalogique** : 人 → 休, 從, 眾, en branches à l'encre (Bézier).
- **Avant / après au pinceau** : un coup de pinceau balaye l'écran, forme ancienne d'un côté, forme moderne de
  l'autre.
- **Cinq styles sur une ligne** avec une jauge de « vitesse du pinceau » : plus on écrit vite, plus le caractère se
  simplifie.
- **Le caractère en coupe** (3D) : des strates d'écriture, la forme moderne au-dessus, l'os oraculaire au fond.
- **Éclaté technique** : les composantes flottent avec des pointillés de montage, puis se rassemblent en un clic.
- **Métamorphose matérielle** : le même caractère gravé dans l'os, fondu dans le bronze, peint sur bambou, sur soie,
  imprimé en caractères mobiles, puis en pixels.
- **Encre dans l'eau** : une goutte se diffuse et dessine les formes historiques du caractère.

## 3. Culture chinoise au service de l'explication
- **Architecture**
  - Pavillon-sommaire : les chapitres sont des pièces d'un bâtiment en coupe.
  - 斗拱 : les composantes s'empilent comme des consoles.
  - Cour 四合院 : pour expliquer l'encadrement 囗, 門, 匚.
  - Fenêtres ajourées et porte lune 月洞門 comme transitions.
- **Peinture**
  - Perspective flottante : glisser le long d'un rouleau pour un récit chronologique.
  - Les trois distances de Guo Xi : hauteur, profondeur, plat.
  - **Sceaux de collection qui s'accumulent**, comme frise de la transmission d'une œuvre.
  - Bambou, prune, orchidée et chrysanthème : le même geste en peinture et en calligraphie.
- **Calligraphie**
  - Les quatre trésors du lettré comme rituel d'ouverture de chapitre.
  - Cahier d'exercice corrigé à l'encre rouge par le maître.
  - Stèle et estampage pour montrer une source.
  - 永字八法, avec un ralenti sur le pinceau.
- **Guerre**
  - **Xiangqi des royaumes combattants** : la rivière est le Fleuve jaune, l'unification par Qin se joue comme une
    partie.
  - Armées faites de milliers de petits 兵.
  - Maxime de Sunzi avec un schéma tactique à côté.
  - Étendards à caractère pour identifier les camps.
- **Cartes**
  - Carte ancienne sur grille (禹跡圖) qui se dessine.
  - Muraille qui grandit dynastie par dynastie.
  - Routes de l'écriture vers la Corée, le Japon et le Vietnam.
  - Carte des découvertes : Anyang, Mawangdui, Dunhuang.
- **Objets et rites**
  - **L'objet qui devient caractère** (鼎, 戉, 車).
  - Marché du *Qingming shanghe tu* avec ses étiquettes (貝, 買, 賣).
  - Monnaies : cauri → bêche → couteau → pièce ronde à trou carré.
  - Rite raconté en vignettes (卜, 示, 祭).
- **Ciel et temps**
  - Roue des troncs et des branches.
  - Boussole 羅盤 en anneaux d'informations.
  - Cycle des cinq éléments.
  - Les 28 mansions lunaires.
- **Musique et lettres**
  - Tablature de guqin.
  - Couplets 對聯 qui se répondent caractère à caractère.
  - **Poème-paysage** : chaque caractère tracé devient un élément du paysage (静夜思).
  - Poème qui tombe en pétales.
  - Calligramme.
  - Courbe des tons 平仄.
  - 千字文.
  - Bibliothèque de lattes de bambou.

## 4. Formats courts (Shorts)
- Jeu des différences (10 s).
- Quiz « devine le pictogramme » avec morphing.
- Le caractère qui bouge.
- Compteur de traits animé.
- Générique : le sceau 墨道 qui se grave.
- Banque de transitions à l'encre.
- Cartouches d'information qui se tracent.
