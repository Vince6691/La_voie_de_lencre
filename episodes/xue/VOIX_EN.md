# 🇬🇧 ENGLISH — voix off anglaise du 學 (adaptation de `VOIX.md`, qui reste la version 🇫🇷 française)

Voix ElevenLabs : **Oliver** (clear, British, steady), modèle multilingue (multilingual v2 : il lit les noms chinois en
caractères ; sinon les écrire en pinyin). Nombres en lettres. Un clip par bloc → `voix_en/b01..b09.mp3` (dossier anglais,
à côté de `voix/` qui reste le français). Adaptation selon la skill `voiceover-en-translator` (phrases courtes, fragments,
pas de jargon) ; chaque bloc garde les mêmes moments que le français pour que le montage se recale sur les repères.

b01: 學. To learn, in Chinese… Look closely: this character hides two hands. Today, no one sees them anymore. Where did they go?
b02: In modern Chinese, it takes eight strokes. It once took sixteen. Between the two: three thousand years, an emperor, a dictionary… and two hands fading away. To find them, we must go back to the first person who drew it.
b03: Around twelve hundred and fifty BC, in 安阳, capital of the 商. The diviners press a red-hot bronze rod to a turtle shell. It cracks. In the crack, they read the answer of the ancestors… then they carve it. This is where our sign appears. At its center, crossed sticks: 爻. Below, a roof. And on either side… two hands, reaching for the sticks. Hands that count, show, handle. And yet, under this roof, someone is missing.
b04: Two centuries later come the 周. Their inscriptions are no longer carved in bone, but cast in bronze, deep inside great ritual vessels. And under the roof, a newcomer slips in: a child. This time, the sign says it all. Hands passing on, under a roof, to a child. On one vessel, a king has archery taught to young nobles… in the hall of study.
b05: Two hundred and twenty-one BC. The First Emperor unifies China. Until then, the same word wore a different face in every kingdom. His minister, 李斯, imposes one script: the small seal. The curves grow long. Everything aligns, in perfect symmetry. The two hands are still there. For now.
b06: Around the year one hundred, under the 汉, a scholar takes on an immense task. To explain the shape of every character. His name is 许慎. His book, the 说文解字, analyses over nine thousand. There our sign gets its definition: to learn is to awaken. And the roof? The darkness that still covers the mind.
b07: Meanwhile, in the offices of the empire, the scribes write fast. Very fast. The brush flattens curves, cuts loops. The two hands freeze into a square block, like a mortar. Their meaning fades. The regular script finally fixes the form: sixteen strokes. Sixteen strokes is a lot. Copy after copy, the hurried hand shrinks the whole top to three little strokes… The hands were not erased by decree. They were erased by other hands: those of hurried scribes.
b08: In the twentieth century, Japan, then China, officially adopt this short form. Eight strokes. So the brush starts again: sticks to count, a roof to shelter, two hands to show, a child to receive. And so 學 is born: to learn. Today it stands at the gate of every school, 學校. It opens 學生, the student, and closes 大學, the university. To recognize it: three little strokes, a roof… and beneath, always, the child.
b09: The hands have faded from the sign. Not from the gesture. For three thousand years, to learn has meant to receive what other hands pass on. These sticks and this child appear again in another character. But this time… the hand holds a rod.

## Repères (pour `episode_en.json`, `reperes_cles`) — mêmes noms qu'en français, expressions anglaises

Chaque expression est le début du passage, dans l'ordre du bloc (même logique que `reperes.py`).

| bloc | repère | 🇫🇷 français | 🇬🇧 anglais |
|---|---|---|---|
| b01 | mains | deux mains | two hands |
| b01 | ou | Où sont | Where did |
| b02 | huit | huit traits | eight strokes |
| b02 | seize | Il en fallait | It once |
| b02 | retrouver | Pour les retrouver | To find them |
| b03 | devins | Les devins | The diviners |
| b03 | signe | C'est là | This is where |
| b03 | yao | Au centre | At its center |
| b03 | toit | Dessous | Below |
| b03 | mains | Et de chaque | And on either |
| b03 | manque | Pourtant | And yet |
| b04 | bronze | Leurs inscriptions | Their inscriptions |
| b04 | enfant | Et sous le toit | And under the roof |
| b04 | dit | Cette fois | This time |
| b04 | vase | Sur l'un | On one |
| b05 | royaumes | Jusque-là | Until then |
| b05 | ministre | Son ministre | His minister |
| b05 | symetrie | Les courbes | The curves |
| b05 | mains | Les deux mains | The two hands |
| b06 | lettre | Il s'appelle | His name |
| b06 | livre | Son livre | His book |
| b06 | definition | Notre signe | There our sign |
| b06 | toit | Et le toit | And the roof |
| b07 | aplatit | Le pinceau aplatit | The brush flattens |
| b07 | figent | Les deux mains se figent | The two hands freeze |
| b07 | reguliere | L'écriture régulière | The regular script |
| b07 | copies | Au fil des copies | Copy after copy |
| b07 | reponse | Les mains n'ont pas | The hands were not |
| b07 | decret | décret | decree |
| b07 | autres | d'autres mains | other hands |
| b07 | presses | scribes pressés | hurried scribes |
| b08 | huit | Huit traits | Eight strokes |
| b08 | pinceau | Alors le pinceau | So the brush |
| b08 | baguettes | des baguettes | sticks to |
| b08 | toit | un toit pour | a roof to |
| b08 | mains | deux mains pour | two hands to |
| b08 | enfant | un enfant pour | a child to |
| b08 | nait | Ainsi naît | And so |
| b08 | ecole | On le lit | Today it |
| b08 | mots | Il ouvre | It opens |
| b08 | universite | l'université | the university |
| b08 | reconnaitre | Pour le reconnaître | To recognize |
| b09 | geste | Pas du geste | Not from the gesture |
| b09 | depuis | Depuis trois | For three |
| b09 | autre | Ces baguettes | These sticks |
| b09 | baton | Mais cette fois | But this time |

## Notes d'adaptation
- b01 « Regardez bien » → « Look closely » ; la question finale garde sa brièveté (« Where did they go? »).
- b02 « on l'écrit en huit traits. Il en fallait seize » → « it takes eight strokes. It once took sixteen » (parallèle plus serré).
- b03 dates : « BC » (lu « B C » par la voix) ; « L'écaille craque » → « It cracks » (fragment).
- b04 « Cette fois, tout est dit » → « This time, the sign says it all » (« everything is said » sonne traduit).
- b07 « Mais au même moment » → « Meanwhile » ; « qui ressemble à un mortier » → « like a mortar » (coupe d'une proposition) ; le jeu « mains / mains pressées »
  passe par « hurried hand » puis « hurried scribes ». La pause de 1,7 s reste avant « The hands were not ».
- b08 le caractère est dit une seule fois au moment de la révélation (« And so 學 is born: to learn. »), comme en français.
- b09 maxime : « The hands have faded from the sign. Not from the gesture. » ; « apprendre, c'est recevoir… » →
  « to learn has meant to receive what other hands pass on » (présent parfait : la durée de trois mille ans).
- Nombre de mots : ≈ 500 (français ≈ 515), aucune phrase au-delà de 20 mots, soit un peu plus court, comme prévu par la skill.
