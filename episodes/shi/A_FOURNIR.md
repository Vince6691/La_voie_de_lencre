# 師 — éléments à fournir (emplacements marqués à l'écran dans ShiV1)

| Élément | Fichier attendu | Où | Format |
|---|---|---|---|
| **Fresque A — l'Égypte de Ramsès II** | `images/fresque_egypte.jpg` | bloc 3, « Il y a trois mille deux cents ans… Abou Simbel » | 16:9, 2K ou plus |
| **Fresque B — la Chine des Shang** | `images/fresque_shang.jpg` | bloc 3, « Au même moment, en Chine… » (le sable de A s'envole vers l'est et révèle B) | 16:9, même cadrage que A |
| Clip Seedance : la ronde de nuit (sentinelles, torches qui tournent autour du camp, vue haute) | `clips/01_ronde.mp4` | bloc 5, de « Chaque nuit » à « La butte au centre » (≈ 8 s) | 8–10 s, plein cadre |
| Dessin 白描 de 師曠 : le maître aveugle, assis, une bougie allumée entre lui et le vieux duc (VOIX v4) | `images/shikuang_baimiao.png` (fond transparent) | bloc 7 | 16:9 ou vertical |
| Han Yu écrivant à la lampe, Chang'an au crépuscule par la fenêtre | `images/hanyu_lampe.jpg` | bloc 8 (passé à l'encre, encre-3d) | 16:9 |

## Les deux fresques (Nano Banana)
**Contrainte commune — même composition**, pour que le sable passe d'une image à l'autre sans saut : 16:9 ; ligne
d'horizon (ou bande de sol) à 60 % de la hauteur ; le sujet principal dans le **tiers gauche** ; une file de personnages
qui avance **vers la droite** (vers l'est : le sable part dans ce sens) ; le **tiers droit plus calme** (c'est là
qu'apparaîtra le signe 𠂤) ; pas de lettres latines, pas de signature, pas de cadre extérieur. Les deux images doivent
être **riches et lumineuses** (elles s'affichent en plein écran pendant 4 s chacune) : on veut qu'on ait envie de les
mettre en pause.

### Fresque A — `fresque_egypte.jpg`
> A sumptuous ancient Egyptian wall painting from the reign of Ramesses II, New Kingdom Ramesside style, as freshly
> painted on smooth white-gesso plaster in a royal tomb: saturated mineral pigments — deep lapis-lazuli blue, bright
> Egyptian blue and turquoise, malachite green, warm red and yellow ochre, carnelian red, touches of gold leaf, crisp
> carbon-black outlines. Composition in horizontal registers separated by painted bands of alternating colour
> rectangles, with a khekher frieze along the top edge and a dark blue band scattered with five-pointed yellow stars as
> the sky.
> Left third: the cliff of Abu Simbel in Nubia with two colossal seated statues of the pharaoh wearing the double crown
> and the nemes headcloth, their faces being finished by tiny sculptors on wooden scaffolds and ladders, with copper
> chisels and wooden mallets; an overseer holds a measuring cord.
> Centre: Ramesses II himself, larger than everyone, in strict profile facing right, wearing the blue khepresh crown, a
> broad gold-and-turquoise collar and a pleated white linen kilt, holding a long staff, under a winged sun disc.
> Lower register: a procession walking to the right — workers carrying baskets of sandstone chips on shoulder poles,
> water bearers with red clay jars, a scribe with his palette, oxen pulling a sledge with a block of stone.
> Bottom band: the Nile as blue zig-zag water lines with lotus flowers, papyrus clumps and fish.
> Columns of finely painted coloured hieroglyphs (owls, reeds, eyes, ankh signs, water lines) framing the king, and a
> royal cartouche near his head, purely decorative.
> Right third: calmer — pale ochre ground with a few swallows and a field of small stars above.
> Horizon line at 60 % of the image height. Rich detail, warm raking light, very slight aged sheen and hairline cracks
> in the plaster but colours still vivid. 16:9, no Latin letters, no signature, no outer border.

### Fresque B — `fresque_shang.jpg`
> A luminous Chinese blue-green landscape painting (qinglü shanshui, 青綠山水) on aged silk, in the manner of the great
> court painters: mineral azurite blue and malachite green on the mountains, warm ochre on the earth, touches of
> vermilion and gold, fine ink outlines, soft ink washes and mist, generous empty silk.
> Subject: Anyang, capital of the Shang, on the Huan River at sunrise, around 1250 BC.
> Left third: a great rammed-earth terrace with a long hall of timber posts and a thick steep thatched roof (no tiles,
> no curved eaves, no pagoda); in front of it, a diviner in a knee-length cross-collar robe of red-brown silk kneels on a
> mat before a small bronze brazier, holding a polished ox shoulder blade and a glowing bronze rod; a thin blue thread
> of smoke rises; a scribe kneels beside him with a bronze knife, ready to engrave the cracks.
> Centre: two bronze ritual vessels (a large ding cauldron with taotie masks, green-gold patina) on the terrace steps.
> Lower band: a file of Shang soldiers walking to the right along the riverbank — leather helmets, bronze dagger-axes
> (ge) on long wooden shafts, small rectangular shields painted red and black, one narrow vermilion banner — followed by
> a two-horse war chariot with large spoked wheels.
> The Huan River crosses the bottom in pale azurite wash with reeds and two white egrets.
> Background: distant blue-green hills, a red rising sun half veiled by mist.
> Right third: calmer — mist and empty silk, a few flying geese.
> Horizon line at 60 % of the image height. 16:9, high detail, no Latin letters, no calligraphy, no seal, no signature,
> no outer border.

> Notes historiques : les hiéroglyphes de la fresque A sont **décoratifs** (l'IA ne sait pas écrire un vrai texte
> égyptien) — c'est une « vue d'artiste », légende à l'écran ; la fresque B est une **peinture d'aujourd'hui** dans un
> style ancien (il n'existe pas de peinture Shang connue) : pas de tuiles ni de toits relevés (anachroniques), les chars
> sont bien attestés à Anyang vers 1200 av. J.-C.

Prompts du clip et des deux autres images : à générer avec `seedance-prompt-generator` et `nano-banana-prompt-generator` (sur demande).
