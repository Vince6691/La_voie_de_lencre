# 語 — éléments à fournir

Déposez les fichiers tels quels, sous n'importe quel nom : je les renomme et les range dans `images/` ou `clips/`.

## 1. Glyphes anciens — FAIT
語, 言, 吾, 五 (小學堂, CC0) → `glyphes/*_xiaoxue/`, planche `glyphes/planche_xiaoxue.png`. Rien à fournir.

## 2. Conseillers en papier découpé (bloc 5) — FAIT (`images/conseiller_a.png`, `conseiller_b.png`, détourés)
Fond **blanc uni** (détourage par `outils/video_shuimo/detourer.py`), 1:1, ≥ 1024 px. Deux poses, une par image.
Aucun texte.

**Commun (à coller dans chaque prompt) :**
> Traditional Chinese red paper-cut (jianzhi) silhouette, a single sheet of vermilion red paper cut with scissors and
> knife, crisp cut edges, fine openwork details (sleeve folds, belt, hat ribbons) cut out as negative space, flat,
> no shading, no gradient, isolated on a pure white background, full figure, side view, no text, no seal, no frame.

**Pose A — l'orateur :**
> A slender court strategist in a long cross-collar robe with very wide sleeves and a tall narrow cap tied under the
> chin, standing in profile facing right, one arm stretched forward with an open palm, mouth open mid-argument,
> the other hand holding a bundle of bamboo slips against his chest.

**Pose B — le contradicteur :**
> A stout older court strategist in a long cross-collar robe with wide sleeves and a soft rounded cap, standing in
> profile facing left, index finger raised in objection, leaning slightly back, a sly half-smile.

## 3. Image classique (bloc 6) — FAIT : banquet silencieux en estampage (`images/banquet_estampage.jpg`)
Nano Banana, 16:9, ≥ 1376 × 768. Tiers droit vide (食不語 y sera calligraphié au montage). Aucun texte dans l'image.

**Scène (par défaut) :**
> A banquet in a timber hall: four guests in cross-collar robes kneel on reed mats behind low lacquered tables
> set with bronze and lacquer bowls, ladles and cups; a servant pours from a bronze wine vessel; the guests eat in
> calm silence, eyes lowered, no one speaking. All figures in the left two thirds of the frame; the right third is
> empty background. No text, no calligraphy, no seal, no signature, no frame, no border.

**Style — estampage de pierre gravée Han (recommandé) :**
> An ink rubbing taken from a carved stone relief: figures and furniture as flat pale grey-white raised silhouettes
> on a dense black ink ground, details incised as fine lines, stone grain and uneven ink density, composition in a
> single horizontal register with a carved border line at top and bottom.

## 5. Médaillon de Yang Xiong en baimiao 白描 (bloc 7) — FAIT (`images/yangxiong_baimiao.jpg`, tracé `yangxiong_trace.png`)
Rien que du trait noir sur blanc pur : je l'anime trait par trait (`trace_baimiao.py`) dans un médaillon, avec la
mention « portrait imaginé ».
```
Baimiao fine-line ink drawing, pure outline only: even, unbroken black ink lines in the "gossamer thread" manner, no wash, no shading, no color, no gradients. Pure white paper background, nothing else on the page.
Half-length portrait of a thin, middle-aged scholar in three-quarter view facing left, centered, occupying the middle third of a 16:9 frame with wide empty space left and right.
Long narrow face, short pointed beard and thin moustache, attentive eyes slightly narrowed as if listening closely, head tilted a little forward.
Small black scholar's cap with a stiff front panel rising at an angle, tied under the chin with thin ribbons; plain cross-collar robe closed right over left, wide sleeves with soft rhythmic folds.
He holds a small square of silk on a thin wooden board in one hand and a slender brush in the other, the brush tip raised, about to write.
No ground line, no landscape, no seal, no text, no calligraphy.
Clean, high-contrast line art suitable for vectorizing.
```

## 4. Clips 3D Seedance (16:9, sans texte ni sous-titres)
Image de départ Nano Banana conseillée (style Pixar, mêmes réglages que les clips du 學, du 教 et du 美).

### Clip A — le carillon de bronze (bloc 4, 10 s)
Entrée par la mer de nuages, sortie au pinceau au montage. Le son du clip n'est pas gardé (cloche synthétisée).

```
[Style global]: 3D cinematic cartoon, Pixar-quality rendering, warm amber torchlight in a dim timber hall, bronze
greens and lacquer reds. Maintain consistent 3D cartoon style across all cuts, no photorealistic drift.
Duration: 10s, 16:9.

[00:00-00:05] Shot 1: The Strike (The Setup)
A tall wooden rack carved with coiled dragons holds a row of eight oval bronze bells of decreasing size, hanging
mouth down, their surfaces covered with rows of raised bosses and green patina. A musician in a plain dark
cross-collar robe swings a long wooden beam suspended by ropes and strikes the largest bell.
Camera: medium shot, slow dolly-in toward the bell, eye level, normal lens.

[00:05-00:10] Shot 2: The Hall Answers (The Payoff)
Reverse angle: a young nobleman in a black silk robe with red borders and a tall black cap sits on a reed mat at
the far end of the hall; around him seated guests lift their heads at the same moment, eyes widening, a faint
smile spreading on the nobleman's face as the sound fills the room. Dust motes tremble in the torchlight.
Camera: wide shot, locked, then slow push-in on the nobleman's face for the last 2 seconds.
Audio: one deep bronze bell tone with a long ringing decay, soft murmur of the guests.
Director's note: the bell "speaks" and the hall "answers" — hold the shared reaction 1.5s.

Constraints: no text overlays, no readable characters, no extra main characters, no deformed hands, no snap zooms.
```

### Clip B — Yang Xiong et les soldats (bloc 7, 12 s)
Entrée à travers le caractère 語, sortie au pinceau au montage.

```
[Style global]: 3D cinematic cartoon, Pixar-quality rendering, cool early morning light in a rammed-earth
courtyard, dusty ochres and soft blues. Maintain consistent 3D cartoon style across all cuts, no photorealistic
drift. Duration: 12s, 16:9.

[00:00-00:06] Shot 1: The Soldiers (The Setup)
A courtyard inside the walls of a great capital: grey-tiled roofs, a rammed-earth wall, a row of tired young
soldiers in red-brown knee-length tunics, leg wrappings and straw sandals, halberds leaning against the wall.
They come from all corners of the empire: different faces, different builds, one with a fur-lined collar, one
with a sun-darkened face and a straw hat on his back. They sit on the ground, chatting and laughing.
Camera: wide shot, slow lateral dolly along the row, eye level.

[00:06-00:12] Shot 2: The Scholar Listens (The Payoff)
A thin middle-aged scholar with a short beard, in a plain dark blue cross-collar robe and a small black cap,
crouches in front of one soldier, holding a square of pale silk on a small wooden board and a thin brush. The
soldier says a word, gesturing; the scholar repeats it silently with his lips, delighted, and writes it down
quickly. Behind him, two other soldiers lean in, curious, ready to give their own word.
Camera: medium shot, slow push-in on the scholar's delighted face, normal lens.
Audio: courtyard ambience, several voices speaking in different accents (unintelligible), the soft scratch of
a brush.
Director's note: curiosity and warmth — he collects words like treasures. The silk stays blank or blurry.

Constraints: no text overlays, no readable characters, no extra main characters, no deformed hands, no snap zooms.
```

## 6. Accroche : diptyque jour / nuit et pinceau (bloc 1) — FAIT (`precepte_jour.jpg`, `precepte_nuit.jpg`, `pinceau_main.png`, `pinceau_pointe_macro.png`, détourés)
Le pinceau écrit 食不語 sur le panneau du jour et 寢不言 sur celui de la nuit, dans le **tiers droit laissé vide** de
chaque panneau. Format carré (1:1), ≥ 1536 px. Aucun texte, aucun sceau dans les images.

**Panneau du jour → `images/precepte_jour.png`**
```
Chinese ink-wash painting (shuimo) on aged cream xuan paper, soft grey ink tones with a few touches of pale ochre and vermilion, delicate brushwork, misty edges that fade into the bare paper.
Daytime meal under the open eaves of a simple timber pavilion: two scholars in cross-collar robes kneel face to face on reed mats at a low lacquered table set with small bowls, a lidded bronze vessel and chopsticks; they eat in calm silence, eyes lowered, lips closed; a servant kneels a little behind, pouring from a ewer. Pine branch and a sliver of distant mountains in the background.
All figures in the left two thirds of the square; the right third is empty pale paper with only faint mist (calligraphy will be added there).
Square composition, no text, no calligraphy, no seal, no signature, no border.
```

**Panneau de la nuit → `images/precepte_nuit.png`**
```
Chinese ink-wash painting (shuimo) on aged cream xuan paper, night scene in deep indigo and grey ink washes, a full moon left as bare glowing paper, soft misty edges fading into the paper.
A quiet bedchamber at night seen through a round moon window: a low wooden bed with a folded quilt and a hard pillow, a sleeper lying on his side, eyes closed, mouth shut; a half-rolled bamboo blind, the shadow of a plum branch across the floor, a small oil lamp just extinguished with a thin curl of smoke.
All elements in the left two thirds of the square; the right third is empty dark-washed paper, smooth and calm (calligraphy will be added there).
Square composition, no text, no calligraphy, no seal, no signature, no border.
```

**La main et le pinceau → `images/pinceau_main.png`** (je le détoure)
```
Cinematic 3D render, Pixar-quality, warm soft studio light.
A scholar's right hand holding a traditional Chinese calligraphy brush perfectly vertical, seen from the side: slender fingers in the classic upright grip, a wide sleeve of dark indigo silk falling from the wrist; bamboo brush shaft, white goat-hair tip fully loaded with black ink, the very tip pointing straight down, a tiny drop of ink about to fall.
The brush tip is at the bottom center of the frame; the hand and sleeve fill the upper half.
Isolated on a pure plain white background, no shadow on the background, no table, no paper, no text.
Vertical 2:3 composition.
```


## 7. Anyang vue du ciel (ouverture du bloc 3) — FAIT (`images/anyang_ciel.jpg`)
Plan « tableau » des Shang (le plastron est exclu : déjà montré dans d'autres épisodes). La caméra plonge vers la grande
salle, puis l'estampage de 言 s'y pose. Nano Banana, **16:9**, ≥ 1920 × 1080. Même univers que le diptyque de
l'accroche. **La grande salle un peu à droite du centre, vers les 3/5 de la hauteur** (cible de la plongée ; je recale si besoin).
Coin haut gauche calme (cartouche). Aucun texte.
```
Chinese ink-wash painting (shuimo) on aged cream xuan paper, soft grey ink washes with touches of pale ochre, a small vermilion sun rising in the mist, delicate brushwork, misty edges fading into the bare paper. High bird's-eye view at dawn.
A great walled settlement on the south bank of a wide river that curves around it: long timber halls with steep thatched roofs standing on raised rammed-earth platforms, arranged around open courtyards in rows facing south; the largest hall, with a broad stone-free earthen terrace and a wide flight of earthen steps, sits slightly right of center, about three fifths down the frame. Around the halls: clusters of small round thatched huts half sunk in the ground, a few workshops with thin smoke rising, narrow earth paths, millet fields in pale ochre strips. No tiled roofs, no pagodas, no walls of brick, no stone bridges.
Far in the background to the left, the faint blue-grey ridges of distant mountains; morning mist lying on the river and between the halls.
Top-left corner kept calm and pale (only mist). 16:9 composition, no people visible at this distance, no text, no calligraphy, no seal, no signature, no border.
```

## 8. Ouverture (0–5 s) : pistes 1 et 4, en essai
Pistes 2 (plaque de laque qui se fend) et 3 (« parler » à l'encre qui se lève en 3D) : faites en code, rien à fournir
(`YuIntroLaque`, `YuIntroEncre`).

### Piste 1 — encre dans l'eau (Seedance, 5 s, 16:9) → `clips/ouverture_encre.mp4`
Je révèle 語 et 言 dans les deux nuages au montage (masques) ; le son du clip n'est pas gardé.
```
[Style]: photoreal macro cinematography, high-speed slow motion, ultra clean, warm off-white backlight like aged rice paper, pure black ink only, no other color.
Duration: 5s, 16:9.

[00:00-00:01] A single drop of black ink falls from the top of the frame into perfectly clear, still water in a glass tank; we only see the water and the warm off-white glowing background, no tank edges.
[00:01-00:03] On impact the ink blooms in slow motion into silky curling plumes and fine threads, expanding toward the camera.
[00:03-00:05] The ink cloud divides into two separate billowing masses that drift slowly apart, one to the left third, one to the right third, each gently spiraling on itself; the center of the frame clears to bright water.
Camera: locked-off, macro lens, very slow push-in, shallow depth of field.
Constraints: no text, no characters, no hands, no bubbles, no foam, no splashes outside the water, no color tint.
```

### Piste 4 — deux ombres qui se parlent (Nano Banana, 16:9) — FAIT (`images/ombres_conseillers.jpg`, essai `YuIntroOmbres`)
J'anime la flamme et les ombres, et j'écris 語 et 言 en ombre portée sur le mur, au-dessus de chaque silhouette.
```
Cinematic still, 16:9. Two traditional Chinese red paper-cut (jianzhi) silhouettes of scholars in long cross-collar robes, seen in strict profile, facing each other with mouths slightly open as if in conversation, each standing on a small wooden stand on a dark lacquered table. A single small oil lamp with a warm flame sits on the table between them and slightly in front, casting their large, soft-edged shadows onto a pale lime-plastered wall behind them; the shadows are tall and lean toward each other. Above each shadow, a large calm empty area of wall. Warm amber light, deep shadows at the edges of the frame, fine texture of the plaster and of the cut paper.
No text, no calligraphy, no seal, no signature, no frame.
```

## 9. Carte premium (cartes des blocs 7 et 8) — FAIT, rangées dans la bibliothèque partagée `outils/moteur/assets/cartes/` (`chine_centre_sud`, `chine_centre_nord` ; skill `carte-peinte`)
Une carte **peinte**, posée sous les marqueurs, régions et routes (projetés au même cadrage). Pour que la géographie
reste exacte, **joindre l'image-guide** à Nano Banana (mode édition / image de référence), une génération par carte :
`outils/moteur/assets/cartes/guides/chine_centre_nord.jpg` puis `.../chine_centre_sud.jpg`. 16:9, ≥ 1920 × 1080.
```
Repaint this map exactly, keeping every coastline, island, lake and river at the same position and the same shape, and the same framing (it is a geographic guide; do not move, add or remove land or water).
Style: an antique Chinese map painted on aged silk, in the manner of a Song dynasty scroll: the land in warm pale ochre and cream silk with fine fibres and soft creases; the sea as broad blue-grey ink washes with delicate stylised wave lines (fine parallel brush curves) near the coasts; mountain ranges painted as small rows of grey-green ink peaks in the traditional "blue-green landscape" manner with light azurite and malachite touches, following the darker relief areas of the guide; rivers as thin flowing lines of indigo ink, slightly darker where they are wide; lakes as small blue washes. Light vignette, gentle stains of age at the edges, a few faded old collector's seals in the extreme corners only.
No text, no labels, no characters, no modern borders, no grid, no compass, no frame. Keep the centre of the land calm and readable (labels will be added on top).
```

## 10. Pékin sur la carte (transition Han → Qing) — essai « images plates », à fournir
Quatre éléments peints, posés debout sur la carte en perspective : la muraille sort de terre, les tours et la salle
tombent du ciel. Nano Banana, une image par élément, **fond magenta uni** (je le détoure ; aucune couleur de ce type dans
l'architecture). À déposer dans `images/` sous les noms indiqués. Même bloc de style pour les quatre :
```
Style: Qing court "ruled-line" architectural painting (jiehua), as in the Kangxi Southern Inspection Tour scroll: precise fine ink outlines drawn with a ruler, flat mineral colours on aged silk (grey-blue brick, vermilion columns, malachite and azurite under the eaves, glazed roof tiles), soft ink wash shading, slight silk texture inside the building only. Seen from slightly above (about 20 degrees), in a gentle three-quarter view from the south-east, the whole building inside the frame with a generous margin.
Background: perfectly flat, uniform pure magenta (#FF00FF), no gradient, no ground, no cast shadow on the background, no landscape, no clouds, no mist. Crisp clean silhouette edges.
No text, no inscriptions, no plaques with characters, no people, no animals, no seals, no frame.
```
1. `pekin_muraille.png` (16:9) — un pan de rempart, à répéter bout à bout :
```
A straight section of the Beijing inner city wall seen almost from the front: a massive battered wall of grey brick about twelve metres high, regular horizontal brick courses, a crenellated parapet with evenly spaced merlons along the top, one rectangular bastion (mazhan) projecting slightly in the middle, no gate. The section runs from the left edge to the right edge of the frame so it can be tiled horizontally. [style]
```
2. `pekin_zhengyangmen.png` (1:1) — la porte du Midi de la ville intérieure (正陽門, tour de porte) :
```
The gate tower of Zhengyangmen, the main southern gate of the Beijing inner city: a massive grey brick gate platform with a single tall arched passage, crenellated parapet, and on top a two-storey timber gate tower with vermilion columns and lattice windows, a double-eaved hip-and-gable roof (xieshan) covered with grey tiles and green glazed ridges, upturned eave corners, small ridge beasts. Show a short piece of the city wall continuing on both sides of the platform. [style]
```
3. `pekin_jiaolou.png` (1:1) — tour d'angle de la ville intérieure :
```
The south-east corner watchtower of the Beijing inner city wall: a huge L-shaped brick tower rising above the corner of the crenellated grey wall, its two faces pierced by many rows of small square arrow windows, crowned by a double-eaved hip-and-gable roof of grey tiles with green glazed ridges and upturned corners. Show the two wall sections meeting at the corner. [style]
```
4. `pekin_taihedian.png` (16:9) — salle de l'Harmonie suprême (太和殿), Cité interdite, reconstruite en 1695–1697 :
```
The Hall of Supreme Harmony of the Forbidden City: a long eleven-bay hall with vermilion walls, columns and lattice doors, a double-eaved hip roof (wudian) covered with bright imperial yellow glazed tiles, ridge beasts at the corners and large dragon-head finials at the ends of the main ridge, colourful blue-green painted brackets under the eaves; standing on a three-tier white marble terrace with carved balustrades and a wide central staircase with a carved ramp. [style]
```

## 11. Carte de détail de Pékin (arrivée du travelling Han → Qing) — à fournir
Même procédé que §9 : joindre l'image-guide `outils/moteur/assets/cartes/guides/pekin_detail.jpg` à Nano Banana
(mode édition), 16:9, ≥ 1920 × 1080, et le **même prompt que §9** (soie, manière Song). La carte rejoint la
bibliothèque (`peintes/pekin_detail.jpg`) : trois fois plus grande que `chine_centre_nord`, elle prend le relais en
fondu à l'arrivée pour que l'image reste nette quand on s'approche de Pékin. Ajouter à la fin du prompt :
```
This is a close-up of the Beijing plain: paint the mountain ranges larger and more detailed (west and north of the centre), the Bohai gulf on the right with finer wave lines; keep the plain at the centre calm and empty (a seal will be stamped there).
```
