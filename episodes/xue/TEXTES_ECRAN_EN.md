# 🇬🇧 ENGLISH — textes à l'écran du 學, français → anglais

Tous les textes affichés par la composition (`XueV2.tsx`) et par les composants communs. Le français reste la langue par
défaut ; l'anglais sera branché par une option de langue (`lang: 'en'`) sans rien changer aux autres épisodes. Les caractères
chinois ne changent pas. Conventions anglaises : « BC / AD » (pas BCE), dynasties en capitales comme en français.

## Cartouches et rouleaux (`src/periodes.ts`, `TimeScroll.tsx`, `Rouleau3D.tsx`) — communs à tous les épisodes
| 🇫🇷 français | 🇬🇧 anglais |
|---|---|
| DYNASTIE SHANG / ZHOU / QIN / HAN / TANG / SONG / YUAN / MING / QING | SHANG / ZHOU / QIN / HAN / TANG / SONG / YUAN / MING / QING DYNASTY |
| ROYAUMES COMBATTANTS | WARRING STATES |
| ROYAUME DE LU / DE JIN | STATE OF LU / OF JIN |
| AUJOURD'HUI | TODAY |
| 1046 – 256 av. J.-C. | 1046 – 256 BC |
| 206 av. J.-C. – 220 apr. J.-C. | 206 BC – AD 220 |
| depuis 1956 | since 1956 |
| av. J.-C. (compteur 2D) · AV. J.-C. / APR. J.-C. (compteur 3D) | BC · BC / AD |

## Précisions des cartouches (`XueV2.tsx`)
| scène | 🇫🇷 français | 🇬🇧 anglais |
|---|---|---|
| Shang | Anyang · v. 1250 av. J.-C. | Anyang · c. 1250 BC |
| Zhou | XIe siècle av. J.-C. | 11th century BC |
| Qin | 221 av. J.-C. · le petit sceau | 221 BC · the small seal |
| Han | v. 100 · Xu Shen 許慎 | c. AD 100 · Xu Shen 許慎 |
| Tang | 楷書 · l'écriture régulière | 楷書 · regular script |
| Aujourd'hui | Japon 1949 · Chine 1956 · 8 traits | Japan 1949 · China 1956 · 8 strokes |

## Légendes et étiquettes (`XueV2.tsx`)
| scène | 🇫🇷 français | 🇬🇧 anglais |
|---|---|---|
| Ouverture | 學 · xué · apprendre | 學 · xué · to learn |
| Shang | baguettes · le toit · deux mains · l'enfant | sticks · the roof · two hands · the child |
| Shang | estampage d'un plastron de tortue · fissures de divination 卜 | rubbing of a turtle plastron · divination cracks 卜 |
| Cartes | 安陽 · capitale des Shang / 鎬京 · capitale des Zhou / 咸陽 · capitale des Qin | 安陽 · Shang capital / 鎬京 · Zhou capital / 咸陽 · Qin capital |
| Royaumes | bambou · Guodian · bronze · bambou · Shuihudi | bamboo · Guodian · bronze · bamboo · Shuihudi |
| Qin | Li Si 李斯 · le petit sceau 小篆 | Li Si 李斯 · the small seal 小篆 |
| Han | portrait imaginé | imagined portrait |
| Han | Shuowen jiezi · plus de 9 000 caractères | Shuowen jiezi · over 9,000 characters |
| Han | apprendre, c'est s'éveiller · le toit, l'obscurité | to learn is to awaken · the roof, darkness |
| Clercs | écriture des clercs 隸書 · les mains devenues 臼, le « mortier » | clerical script 隸書 · the hands become 臼, the "mortar" |
| Scribes | édit impérial | imperial edict |
| Aujourd'hui | Japon · 1949 / Chine · 1956 | Japan · 1949 / China · 1956 |
| Bandeau | XXe s. · mains · baguettes · toit · enfant | 20th c. · hands · sticks · roof · child |
| Mots | l'élève · l'école · l'université | student · school · university |
| Fiche | 8 traits · 學 avant : 16 traits · apprendre | 8 strokes · 學 before: 16 strokes · to learn |
| Fiche | Les mains se sont effacées du signe. Pas du geste. | The hands have faded from the sign. Not from the gesture. |
| Fin | LA VOIE DE L'ENCRE · Mò zhī dào | STROKES AND HISTORY · Mò zhī dào |
| Fin | Prochain caractère · jiào · enseigner | Next character · jiào · to teach |

## Fichiers de la version anglaise (rien n'est renommé ni supprimé)
| | 🇫🇷 français (existant) | 🇬🇧 anglais |
|---|---|---|
| voix off | `VOIX.md` | `VOIX_EN.md` |
| textes à l'écran | dans `XueV2.tsx` | ce fichier, puis dictionnaire `lang: 'en'` |
| configuration | `episode.json` | `episode_en.json` (à créer : même séquence, repères anglais) |
| voix | `voix/` | `voix_en/` |
| vidéo | `rendu/xue_1440p.mp4` | `rendu/xue_en_1440p.mp4` |
| sous-titres | `rendu/xue_fr.srt` | `rendu/xue_en.srt` |
| description | `rendu/description_youtube.txt` | `rendu/description_youtube_en.txt` |
