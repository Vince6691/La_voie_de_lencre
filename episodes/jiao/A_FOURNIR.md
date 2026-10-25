# 教 — éléments à fournir

Déposer les fichiers tels quels (n'importe quel nom) : je les renomme et les range (`images/`, `clips/`, `glyphes/`).

## 1. Glyphes anciens — FAIT (je les ai récupérés)
19 formes de 教 et 26 de 文 téléchargées depuis 小學堂 (CC0) → `glyphes/` (voir `glyphes/SOURCE.md`). Rien à fournir.

## 2. Dessin 白描 de Confucius (indispensable) — même style que `outils/moteur/assets/portrait/xushen_a.jpg`
Image 16:9, ≥ 1376 × 768, traits noirs purs sur fond blanc, aucun gris : je la vectorise et la peins trait par
trait (`build_portrait.py`). Prompt Nano Banana :

> Traditional Chinese baimiao line drawing, fine even black ink outlines only, no shading, no hatching, no color, no gray
> wash, pure white background, 16:9 landscape. An elderly teacher in his late sixties, broad forehead, long thin beard and
> drooping moustache, hair gathered in a simple topknot tied with a cloth band, wearing a plain wide-sleeved robe with a
> cross-collar closing to the right, a long sash knotted at the waist, seated cross-legged on a woven reed mat on a low
> square earthen platform. Behind him a gnarled apricot tree in blossom leans in from the left, its branches arching over
> his head, a few petals falling. One hand raised at chest height in a gentle explaining gesture, palm open, the other
> hand resting on his knee. His face is calm and attentive, turned slightly toward his listeners. In front of him, lower in
> the frame, four young disciples kneel on mats in three-quarter back and profile views, of different ages and builds: one
> holds an open bundle of bamboo slips tied with two cords, one listens with hands joined inside his sleeves, one leans
> forward, one writes with a brush on a slip. A small low wooden table with an ink stone and a rolled bundle of slips.
> Composition: all figures and the tree inside the left two thirds of the image, the right third completely empty white
> paper. Clean closed contour lines, long continuous strokes for robe folds, petals drawn as small open outlines, mat
> weave suggested with a few lines only. No text, no calligraphy, no seal, no signature, no frame, no border.

Cadrage : le tiers droit reste vide (有教無類 s'y calligraphie dans le montage). Livrer 2–3 variantes ; je choisis celle qui se vectorise le mieux (traits fermés, peu de hachures).

## 3. Clips 3D Seedance (8–15 s, 16:9, sans texte ni sous-titres)
Image de départ Nano Banana conseillée (style Pixar, mêmes réglages que les clips du 學).

**Clip A — atelier de gravure (bloc 3, ≈ 12 s)**
> Stylized 3D animated film, warm soft lighting. Inside a rammed-earth workshop lit by a low doorway, an older
> scribe with a shaved temple and a short braided topknot, wearing a plain wrapped tunic of undyed hemp, carves a
> neat column of signs into a flat polished ox shoulder blade with a bronze point. Beside him, a boy of twelve
> copies the same signs on another bone, his tool trembling, tongue between his teeth. The master leans over, taps
> the boy's bone twice with the end of a thin wooden stick, then guides his wrist. Slow push-in from medium shot to
> close-up on the two bones side by side: one line clean, one line wobbly. Dust in the light beam. No text.

**Clip B — la baguette (bloc 5, ≈ 10 s)**
> Stylized 3D animated film, soft morning light. A small study hall with plank floor and paper-screened windows;
> six boys in plain cross-collared robes kneel at low tables before rolls of bamboo slips. One boy dozes, chin
> dropping. The teacher, a calm middle-aged man in a dark wide-sleeved robe, walks behind him holding a slender
> wooden rod, and lightly taps the edge of the boy's table with it — tok. The boy jolts upright, eyes wide, then
> smiles sheepishly; the teacher's face softens. Camera at the boys' eye level, gentle dolly. No violence, no text.


## 4. Optionnel
- Une photo / estampage de l'os d'exercice (殷契粹編 1468) si tu la trouves : je le redessine en estampage fidèle ;
  sinon je le recompose (lignes nettes du maître / lignes tremblées de l'élève).

## Ce que je fais sans rien fournir
Cartes (royaumes des Printemps et Automnes + itinéraire de Confucius ; académies 書院 des Song), paysages shuimo, rouleaux du temps,
tracé 教 et 孝 (Make Me a Hanzi), lattes du Shuowen, portrait de Xu Shen (réutilisé), voix ElevenLabs, musique,
montage et aperçus 720p.

## 5. Xu Shen en 3D → shuimo (skill `encre-3d`, mode « délavé ») — il manque la version encre
Image 3D reçue et rangée : `images/xushen_3d.jpg` (copie dans `outils/moteur/assets/morph/xushen_3d.jpg`). À générer avec Nano Banana
(mode édition, l'image 3D jointe), à déposer sous n'importe quel nom :

> Same character, same pose, same framing, same proportions, redrawn as modern Chinese ink-wash art (shuimo): black and grey ink only,
> graded washes, soft wet edges bleeding into white paper, confident brush outlines, no colour except a few vermilion accents. Plain
> pure white background, nothing else in the image.

Le portrait 白描 de Xu Shen reste en place dans le bloc 6 tant que la version encre n'est pas là.

## 6. Mise à jour du 2026-10-24 (retours sur la v5)
- **Clip A (atelier de gravure) : abandonné.** Le bloc 3 va directement à l'os d'exercice : le maître grave dès « ateliers royaux » (signes jiaguwen réels), l'élève recopie ; la carapace (`clips/02_carapace.mp4`) couvre le raccord.
- **Xu Shen encre** : l'image `xushen_encre.jpg` annoncée n'est pas dans `images/` (seul `xushen_3d.jpg` y est) : la redéposer.

### Clip B — la baguette (bloc 5, ≈ 10 s) — image de départ (Nano Banana, 16:9, mêmes réglages que le Xu Shen 3D)
> Stylized 3D animated film still, Pixar-like, soft warm morning light through paper-screened windows, same character style and palette as an
> Eastern Han scholar scene (indigo and slate-blue robes with lighter cuff bands, muted dark-red silk belts, black lacquer low tables with a thin
> red edge, loose-weave rush mats). A small study hall with a plank floor. Six boys of different ages, hair in topknots, kneel in two rows at
> low lacquer tables, each with an unrolled strip of bamboo slips and a brush. In the front row, one boy has fallen asleep: his chin has dropped
> to his chest, his brush has slipped from his fingers. Behind him stands the teacher, a calm middle-aged man with a short beard in a dark
> wide-sleeved cross-collared robe, holding a slender wooden rod low in his right hand, not raised, its tip about to touch the edge of the
> sleeper's table. The other boys look up with curiosity. Camera at the boys' eye level, slightly low, three-quarter view of the teacher.
> Warm paper-colored light, a few dust motes in the light beam. No text, no calligraphy on the walls, no violence, nothing raised in anger.

### Clip B — Seedance (image de départ jointe ; 10 s ; 16:9 ; sans texte ni sous-titres)
> Stylized 3D animated film, soft morning light, gentle camera. Starting from the attached image: the teacher takes one calm step forward
> and lightly taps the edge of the sleeping boy's table with the tip of the wooden rod — a single soft "tok" — without ever touching the boy.
> The boy jolts upright, eyes wide, picks up his fallen brush, then smiles sheepishly; the other boys exchange amused glances and quietly
> straighten their backs. The teacher's face softens into a faint, kind smile and he lowers the rod. Slow dolly-in at the boys' eye level,
> ending on a medium close-up of the teacher and the boy. Dust drifting in the light beam. Natural, slightly slow movement, no sudden gestures,
> no violence, no text.

### Clip B — version avec dialogue en chinois (remplace les deux prompts ci-dessus)
Image de départ (Nano Banana) : voir le premier prompt de la section 6, inchangé. Seedance, 10 s, 16:9, **avec audio** (dialogue + « tok » + ambiance), sans musique, sans sous-titres :

> Stylized 3D animated film, soft warm morning light, gentle camera, Eastern Han period. Starting from the attached image. The teacher steps forward and lightly taps the edge of the sleeping boy's table with the tip of the wooden rod: one soft wooden "tok". He never touches the boy. In a calm, low, kind voice the teacher says in Mandarin Chinese: "醒醒，该读书了。" (xǐngxǐng, gāi dúshū le). The boy jolts upright, wide-eyed, grabs his fallen brush and whispers, flustered: "先生！弟子知错了。" (xiānsheng! dìzǐ zhī cuò le). The other boys exchange amused glances and straighten their backs. The teacher's face softens into a faint smile and he lowers the rod, saying gently: "学而不思则罔。" (xué ér bù sī zé wǎng). Slow dolly-in at the boys' eye level, ending on a medium close-up of the teacher and the boy. Dust motes in the light beam. Sound: the single wooden tap, the three spoken lines in clear Mandarin, faint birdsong, soft rustle of robes, no music. No subtitles, no on-screen text, no violence.

Dialogue (pour la production) : 醒醒，该读书了。 / 先生！弟子知错了。 / 学而不思则罔。 (Lunyu 2.15 : « apprendre sans réfléchir, c'est se perdre »). Trois répliques courtes, la dernière sur le sourire final ; si Seedance ne tient pas les trois en 10 s, garder la première et la troisième.

---
## 7. Clip B — pipeline par fiches personnages (remplace les sections 6 à « version avec dialogue »)
Ordre : (1) 5 fiches personnages (Nano Banana, une génération par personnage, à valider) → (2) scène de référence (Nano Banana, les 5 fiches
jointes en références) → (3) Seedance (scène de référence = première image, fiches en références). Style commun à toutes les images :
« stylized 3D animated feature-film look, Pixar-like, soft warm studio lighting, fine woven fabric texture, same style as the Xu Shen 3D
reference (images/xushen_3d.jpg) ». Époque : Han orientaux (vers 100) ; vêtements à col croisé fermé à droite (右衽), ceintures de soie plates.

### Personnages (descriptions fixes, à recopier telles quelles)
**LE MAÎTRE (先生)** — homme d'environ 45 ans, grand et mince (1,72 m), maintien droit et doux. Visage ovale, front large, joues légèrement creuses,
sourcils droits et fournis, yeux bruns foncés légèrement enfoncés avec de fines pattes d'oie, nez droit, peau mate. Barbe noire courte et soignée
(menton et lèvre supérieure, 3 cm), moustache fine. Cheveux noirs relevés en chignon haut, traversé horizontalement d'une épingle de bois simple (笄),
recouvert d'un bandeau-bonnet de tissu noir plat (幘) noué derrière, deux courts pans. Longue robe (袍) bleu indigo foncé (#1f2a44), col croisé fermé à droite,
liséré noir étroit au col, aux poignets et à l'ourlet, col blanc du vêtement de dessous visible, larges manches finissant en poignets d'environ 25 cm ;
ceinture plate en soie rouge sombre (#6b2e2e) nouée simplement à la hanche gauche, deux courts pans ; chaussettes blanches, souliers de tissu noirs à bout légèrement relevé.
Accessoire : une fine baguette de catalpa (夏), 70 cm, 1,5 cm de diamètre, bois clair brun-jaune, lisse, bouts arrondis, tenue basse dans la main droite, pointe vers le bas.

**LE DORMEUR, 小明 « Ming » (élève A)** — garçon de 10 ans, petit, joufflu, visage rond, petit nez retroussé, grandes paupières, joues roses, une petite tache d'encre sur la joue droite.
Cheveux noirs en deux petites touffes (總角) attachées par des cordons rouges. Robe courte (aux mollets) ocre jaune (#c8923a), col croisé fermé à droite, ceinture de tissu brun,
pieds nus dans des sandales de paille. Posture dans la scène : à genoux, menton sur la poitrine, endormi, pinceau échappé de la main.

**LE VOISIN INQUIET (élève B)** — garçon de 12 ans, mince, visage allongé, grands yeux attentifs et sourcils fins levés, oreilles légèrement décollées, peau claire.
Cheveux noirs en un chignon unique noué d'un ruban de tissu bleu. Robe gris-bleu pâle (#8da3b8), col croisé fermé à droite, ceinture bleu foncé, chaussettes blanches et sandales de tissu.
Posture : à genoux, pinceau tenu droit, il regarde l'endormi avec inquiétude.

**LE VOISIN RIEUR (élève C)** — garçon de 9 ans, rond, visage large, joues pleines, une dent de devant manquante, petits yeux plissés, taches de rousseur sur le nez, cheveux châtains en deux touffes (總角)
liées de cordons bleus. Robe brun-rouge garance (#8a4a3a), col croisé fermé à droite, ceinture beige, sandales de paille. Posture : à genoux, cache un sourire derrière sa manche.

**LE GRAND SÉRIEUX (élève D)** — garçon de 14 ans, grand pour son âge, mâchoire carrée, sourcils épais et droits, expression concentrée, peau mate.
Cheveux noirs en chignon unique serré par un bandeau de tissu noir. Robe de chanvre écru (#e6dcc4), col croisé fermé à droite, ceinture de chanvre brune, souliers de tissu noirs.
Posture : à genoux, dos droit, écrit sur ses lamelles, relève la tête.

### 1) Fiche personnage — gabarit (une image 16:9 par personnage ; remplacer [PERSONNAGE] par le bloc ci-dessus)
> Character model sheet on a plain flat light-grey background (#d8d8d8), 16:9, stylized 3D animated feature-film character, Pixar-like, soft even warm studio lighting, fine woven fabric texture, no text, no labels, no props other than those described. Layout from left to right: three full-body views of the SAME character, standing relaxed, arms slightly away from the body, feet visible, same scale and same ground line — (1) front view, (2) left profile view, (3) back view — and on the far right a large head-and-shoulders close-up, facing the camera, with every facial detail clearly visible. The face, hairstyle, hair accessories, clothing, colors and proportions must be strictly identical in all four views. Soft contact shadow only. CHARACTER: [PERSONNAGE, en anglais : âge, taille, visage, cheveux, vêtements avec couleurs, accessoire]

### 2) Scène de référence (Nano Banana ; joindre les 5 fiches ; 16:9 ; sert de première image)
> Stylized 3D animated feature-film still, Pixar-like, soft warm morning light from paper-screened windows on the right, dust motes in the light beam. Use the five attached character sheets as strict references: the TEACHER, boy MING (ochre robe, twin tufts with red cords), boy B (pale grey-blue robe, single topknot with blue ribbon), boy C (madder-brown robe, twin tufts with blue cords, missing front tooth), boy D (undyed hemp robe, black headband); keep every face, hairstyle and garment identical to the sheets. Setting: a small Eastern Han study hall, warm plank floor, bare plaster back wall with one dark wooden pillar and beam, no writing anywhere. Five low black lacquer tables with a thin red edge on loose-weave rush mats, each with an unrolled strip of bamboo slips, an inkstone and a brush rest: front row three tables — boy B on the left, MING in the center, boy C on the right; back row — boy D behind and between B and MING. MING has fallen asleep kneeling, chin on his chest, his brush slipping from his fingers. The TEACHER stands behind MING, slightly to the right, in three-quarter view turned toward MING, the catalpa rod held low in his right hand, its tip about ten centimeters from the edge of MING's table. Boy B looks at MING with worried wide eyes, boy C hides a grin behind his sleeve, boy D looks up from his writing. Camera at the boys' eye level, slightly low, three-quarter view from the front left. Warm paper-colored palette. No text, no violence, nothing raised in anger.

### 3) Seedance (10 s, 16:9, avec audio ; première image = scène de référence ; références = les 5 fiches : @image1 maître, @image2 Ming, @image3 B, @image4 C, @image5 D ; @image6 = scène)
> Stylized 3D animated film, soft warm morning light, gentle camera, Eastern Han period. Start exactly from @image6; keep every character identical to the references: the teacher @image1, the sleeping boy Ming @image2, boy B @image3, boy C @image4, boy D @image5. 0–2 s: the teacher takes one calm step forward. 2–3 s: he lightly taps the edge of Ming's table with the tip of the wooden rod — one soft wooden "tok" — never touching the boy. In a calm, low, kind voice the teacher says in Mandarin Chinese: "醒醒，该读书了。" (xǐngxǐng, gāi dúshū le). 3–6 s: Ming jolts upright, wide-eyed, catches his brush and whispers, flustered, in a child's voice: "先生！弟子知错了。" (xiānsheng! dìzǐ zhī cuò le). Boy B lets out a relieved breath; boy C stifles a giggle behind his sleeve; boy D straightens his back. 6–9 s: the teacher's face softens into a faint smile and he lowers the rod, saying gently: "学而不思则罔。" (xué ér bù sī zé wǎng). Slow dolly-in at the boys' eye level, ending on a medium close-up of the teacher and Ming. Dust motes in the light beam. Sound: the single wooden tap, the three lines in clear Mandarin, faint birdsong, soft rustle of robes, no music. No subtitles, no on-screen text, no violence.

### Blocs [PERSONNAGE] en anglais (à coller dans le gabarit de la fiche)
**Maître** : A man about 45 years old, tall and slim (1.72 m), upright and gentle bearing. Oval face, broad forehead, slightly hollow cheeks, straight thick eyebrows, deep-set dark brown eyes with fine crow's feet, straight nose, light tan skin. Short neat black beard (chin and upper lip, 3 cm) and a thin moustache. Black hair pulled up into a high topknot pierced horizontally by a plain wooden hairpin, covered by a flat black cloth headband-cap tied behind with two short tails (Han dynasty "ze"). Long dark indigo robe (#1f2a44), cross-collar closing to the wearer's right, narrow black trim on collar, cuffs and hem, white inner collar visible, wide sleeves ending in 25 cm cuffs; flat muted dark-red silk belt (#6b2e2e) tied with a simple knot at the left hip, two short ends; white socks, black cloth shoes with slightly upturned toes. He holds a slender catalpa-wood rod, 70 cm long, 1.5 cm thick, smooth pale yellow-brown, rounded ends, in his right hand, pointing down.
**Ming (A)** : A 10-year-old boy, small and chubby, round face, small snub nose, big eyelids, rosy cheeks, a small ink smudge on the right cheek. Black hair in two small tufts (Han "zongjiao") tied with red cords. Short ochre-yellow robe (#c8923a) down to the calves, cross-collar closing to the wearer's right, brown cloth belt, bare feet in straw sandals.
**B** : A 12-year-old boy, slim, long face, large attentive eyes and thin raised eyebrows, slightly protruding ears, fair skin. Black hair in a single topknot tied with a blue cloth ribbon. Pale grey-blue robe (#8da3b8), cross-collar closing to the wearer's right, dark blue belt, white socks and cloth sandals.
**C** : A 9-year-old boy, round, wide face, full cheeks, one missing front tooth, small squinting eyes, freckles across the nose, chestnut-brown hair in two tufts tied with blue cords. Madder red-brown robe (#8a4a3a), cross-collar closing to the wearer's right, beige belt, straw sandals.
**D** : A 14-year-old boy, tall for his age, square jaw, thick straight eyebrows, concentrated expression, light tan skin. Black hair in a single tight topknot wrapped with a black cloth band. Undyed hemp robe (#e6dcc4), cross-collar closing to the wearer's right, brown hemp belt, black cloth shoes.

### Version simplifiée (2 personnages + 2 figurants de dos) — à utiliser de préférence
Références : fiche du maître (@image1), fiche de Ming (@image2), scène (@image3).

Scène de référence (Nano Banana, joindre les 2 fiches) :
> Stylized 3D animated feature-film still, Pixar-like, soft warm morning light from paper-screened windows on the right, dust motes in the light beam. Use the two attached character sheets as strict references: the TEACHER and the boy MING; keep their faces, hairstyles and garments identical. A small Eastern Han study hall, warm plank floor, bare plaster back wall with one dark wooden pillar, no writing anywhere. Low black lacquer tables with a thin red edge on loose-weave rush mats, each with an unrolled strip of bamboo slips and a brush rest. MING kneels at the central table in the foreground, fast asleep, chin on his chest, his brush slipping from his fingers. The TEACHER stands behind him, slightly to the right, in three-quarter view turned toward MING, the catalpa rod held low in his right hand, its tip about ten centimeters from the edge of MING's table. Two other boys in plain robes kneel at tables in the soft-focus background, seen from behind, faces not visible. Camera at the boys' eye level, slightly low, three-quarter view from the front left. Warm paper-colored palette. No text, no violence.

Seedance (10 s, avec audio) :
> Stylized 3D animated film, soft warm morning light, gentle camera, Eastern Han period. Start exactly from @image3; keep the teacher (@image1) and the boy Ming (@image2) identical to their references. The teacher takes one calm step forward and lightly taps the edge of Ming's table with the tip of his rod — one soft wooden "tok" — without touching him. He says in a calm, kind voice, in Mandarin Chinese: "醒醒，该读书了。" Ming jolts upright, wide-eyed, catches his brush and whispers, flustered: "先生！弟子知错了。" The teacher smiles faintly and lowers the rod. The two boys in the background stay quietly in place. Slow dolly-in at eye level, ending on a medium close-up of the teacher and Ming. Sound: the wooden tap, the two spoken lines, faint birdsong, soft rustle of robes, no music. No subtitles, no on-screen text, no violence.

### Version finale du prompt Seedance (skill seedance-prompt-generator : format B, sans label d'époque, dialogue classique)
Références : @Image1 fiche du maître, @Image2 fiche de Ming, @Image3 scène de référence (première image). 10 s, 16:9, caméra mobile, audio natif.

[Style global]: 3D cinematic cartoon, Pixar-quality rendering, soft warm natural light through paper-screened lattice windows, muted warm tones, subtle depth of field. Duration: 10s. Maintain consistent 3D cartoon style across all shots, no photorealistic drift. Start exactly from @Image3; the teacher must match @Image1 and the boy Ming must match @Image2 (same faces, hairstyles, garments, colors) throughout.
Setting: timber study room with a warm plank floor, a bare plaster back wall, a dark wooden pillar, low black lacquered tables with a thin red edge on loose-weave rush mats, each with an unrolled strip of bamboo slips. The teacher: tall slim man with a short black beard, flat black cloth cap over a topknot, dark indigo wide-sleeved cross-collar robe, dark-red silk belt, a slender pale wooden rod in his right hand. Ming: small chubby boy of ten, two hair tufts tied with red cords, short ochre robe. Two other boys in plain robes kneel in the soft-focus background, seen from behind, faces never visible.

[00:00-00:03] Shot 1: The tap (The Setup)
Eye-level three-quarter view from the front left. The teacher takes one calm step forward; Ming sleeps kneeling, chin on his chest, brush slipping from his fingers. At 00:02 the teacher lightly taps the edge of Ming's table with the tip of the rod: one soft wooden "tok", never touching the boy.
Dialogue Cue: the teacher says in a calm, low, kind voice, in Mandarin Chinese: "醒來，當讀書矣。" (xǐng lái, dāng dú shū yǐ).
Director's note: the rod stays low and gentle, no raised arm, no anger.

[00:03-00:07] Shot 2: The jolt (The Reveal)
Slow dolly-in begins. Ming jolts upright, wide-eyed, catches his brush as it slips, bows his head a little.
Dialogue Cue: Ming whispers, flustered, in a child's voice, in Mandarin Chinese: "先生，弟子知過矣。" (xiānsheng, dìzǐ zhī guò yǐ).
Director's note: the two background boys stay quietly in place, no reaction shots.

[00:07-00:10] Shot 3: The smile (The Resolution)
The dolly-in ends on a medium close-up of the teacher and Ming. The teacher's face softens into a faint smile and he lowers the rod; Ming lowers his eyes, relieved and a little sheepish. Dust motes drift in the light beam.

Audio: one soft wooden tap, the two spoken lines in clear Mandarin, faint birdsong, soft rustle of robes, no music.
Constraints: no subtitles or text overlays, no extra characters beyond the teacher, Ming and the two background boys, no whip pans or snap zooms, no deformed hands, no violence.

Corrections de vocabulaire pour les images (labels d'époque retirés) : dans la scène de référence, « small Eastern Han study hall » → « small timber study room, plank floor, paper-screened lattice windows » ; dans la fiche du maître, « (Han dynasty "ze") » supprimé ; dans la fiche de Ming, « (Han "zongjiao") » supprimé ; « Eastern Han period » supprimé partout.
