---
name: description-youtube
description: Rédige la description YouTube d'un épisode 墨道 (« La voie de l'encre ») sur le modèle de la chaîne — phrase d'accroche fixe avec le niveau HSK, récit du caractère en 3–4 paragraphes tiré de la voix off, chapitres minutés calés sur la ligne de temps du montage, liste fixe des chaînes amies, « Repères linguistiques » (caractère, pinyin, sens, composition, niveau HSK, 4–5 mots courants). Utiliser quand l'utilisateur demande la description YouTube, le texte sous la vidéo, les chapitres, les horodatages, ou « la description sur le modèle » pour un épisode.
---

# Description YouTube d'un épisode 墨道

Validé sur le 學 (`episodes/xue/rendu/description_youtube.txt`, 10/2026 : c'est l'exemple à suivre). Toujours en français.

## Matière (à lire avant d'écrire, rien d'inventé)
- La voix off minutée : `episodes/<p>/rendu/<p>_fr.srt` (sinon `python outils/video_shuimo/sous_titres.py episodes/<p>/episode.json`).
- Les repères de chapitres : `python outils/video_shuimo/chapitres.py episodes/<p>/episode.json` → début de chaque bloc de voix,
  de chaque rouleau du temps et de l'écran de fin, avec la phrase dite à cet instant.
- `PROPOSITION.md`, `SOURCES.md` de l'épisode : pour le niveau HSK, les formes, les mots courants.

## Modèle (structure figée, dans cet ordre)
```
Apprenez les caractères chinois plus rapidement et retenez-les indéfiniment avec une histoire de la Chine. Caractère niveau HSK<n>

<Accroche : 1–2 phrases, la question d'ouverture de la voix off, avec le caractère, son pinyin et son sens.>

<Paragraphe 1 : le mystère et le point de départ (première époque, ce que montre le signe le plus ancien).>

<Paragraphe 2 : les étapes du voyage (époques, personnages, ce qui change dans le signe).>

<Paragraphe 3 : la chute, reprise de la maxime finale de la voix off.>

0:00 Intro : <…>
m:ss <Époque ou étape> : <ce qui s'y passe>
…
m:ss <Dernier chapitre : la chute… et le prochain caractère>


Les meilleures chaînes francophones pour apprendre le chinois et les caractères

   / @easychinois  
   / @topchinois789  
   / @chinoistips  
   / @faguoren  

-----------------------------------------
Repères linguistiques
-----------------------------------------

<simplifié> / <traditionnel> (<pinyin>) — <sens, 2–3 mots>
<Type : pictogramme / idéogramme composé / idéophonogramme> : <composantes avec leur caractère entre parenthèses> — HSK <n>
<Si les formes diffèrent : forme simplifiée (N traits), forme traditionnelle (N traits)>

<mot> (<pinyin syllabe par syllabe>) : <Sens / Sens>.
… (4–5 mots courants, du plus fréquent au moins fréquent ; ceux cités dans la vidéo en priorité)
```
- La première ligne et le bloc des chaînes sont **recopiés à l'identique** (y compris `   / @…  ` avec les espaces) ; seul le niveau HSK change.
- Une seule ligne vide entre les paragraphes, deux avant le bloc des chaînes.

## Règles
- **Fidélité** : chaque fait du récit est dit dans la voix off (ou dans `SOURCES.md`) ; pas de date, de nom ni d'interprétation
  ajoutée. Reprendre les formules fortes de la voix off (la question d'ouverture, la maxime finale), le reste en prose courte.
- **Ton** : celui de la voix off (`voix-off-modo`) : phrases courtes, présent, concret ; pas de superlatifs creux
  (« incroyable », « fascinant »), pas d'emoji, pas de hashtag.
- **Noms** : pinyin sans tons dans le récit (Shang, Zhou, Li Si, Xu Shen, Shuowen jiezi) ; le caractère étudié en caractères
  chinois avec son pinyin à tons à la première occurrence.
- **Chapitres** (règles YouTube, sinon ils ne s'affichent pas) : le premier à `0:00`, au moins 3, chacun ≥ 10 s, temps en
  `m:ss` croissants, un par ligne. Un chapitre par époque ou étape du récit (8–10 pour 4 min) ; une époque introduite par un
  rouleau du temps commence **au début du rouleau** (pas à la première phrase) ; le dernier couvre la chute et la passerelle
  vers le caractère suivant. Titres : « <Époque> : <ce qui s'y passe> », 3–7 mots, sans spoiler la chute dans l'intro.
- **Repères linguistiques** : vérifier le niveau HSK (HSK 3.0 ou 2.0, rester cohérent d'un épisode à l'autre), le pinyin des mots
  (ton neutre noté sans ton : 学生 xué sheng), le nombre de traits des deux formes.

## Après
- Écrire le texte dans `episodes/<p>/rendu/description_youtube.txt` et le donner aussi dans la réponse (bloc de code, prêt à coller).
- Rappeler d'envoyer les sous-titres `<p>_fr.srt` avec la vidéo.
- Proposer ensuite les titres (skill `youtube-title-creator`) et la miniature si ce n'est pas fait.
