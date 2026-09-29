"""Sous-titres SRT (français) calés sur la timeline de la voix off."""
import json
TL = json.loads(open('src/timeline.js').read().split('=', 1)[1].strip().rstrip(';'))
V = [v['start'] for v in TL['voice']]
D = [v['dur'] for v in TL['voice']]
L = [  # (clip, début, fin, texte) — temps relatifs au clip
    (1, 0.0, 4.4, "Ce caractère cache deux mains… que plus personne ne voit."),
    (1, 4.5, None, "Trois mille ans d'histoire, dans un seul mot : apprendre."),
    (2, 0.0, 4.4, "Vers 1250 avant notre ère, à Anyang, capitale des Shang."),
    (2, 4.9, 9.5, "Les devins gravent l'os et l'écaille de tortue. Là naît le signe."),
    (2, 10.0, 15.0, "Au centre, deux croix : yao. Des baguettes à compter."),
    (2, 15.5, None, "Dessous, le toit d'un bâtiment. Et de chaque côté… deux mains."),
    (3, 0.0, 2.9, "Puis viennent les Zhou."),
    (3, 2.85, 5.4, "Sur leurs grands vases rituels en bronze, des inscriptions sont coulées dans le métal, à l'intérieur même du vase."),
    (3, 5.5, 8.4, "Et sous le toit, un nouveau venu se glisse : l'enfant."),
    (3, 9.1, 14.0, "Tout est dit. Des mains transmettent, sous un toit, à un enfant."),
    (3, 14.6, None, "Un vase raconte même qu'un roi fit enseigner le tir à l'arc aux jeunes de la cour… dans la salle d'étude."),
    (4, 0.0, 4.8, "221 avant notre ère. Le premier empereur unifie la Chine."),
    (4, 5.4, 8.4, "Son ministre, Li Si, unifie l'écriture."),
    (4, 9.1, None, "Le petit sceau aligne tout, en parfaite symétrie."),
    (5, 0.0, 5.3, "Vers l'an 100, le lettré Xu Shen, dans le Shuowen jiezi, l'explique ainsi :"),
    (5, 5.5, None, "apprendre, c'est s'éveiller. Le toit, c'est l'obscurité qui couvre encore l'esprit."),
    (6, 0.0, 4.5, "Sous les Han, les scribes accélèrent. Le pinceau aplatit les courbes."),
    (6, 4.9, None, "Les deux mains se figent en un bloc qui ressemble à un mortier. Leur sens s'efface."),
    (7, 0.0, None, "L'écriture régulière fixe enfin la forme. Xué. Seize traits."),
    (8, 0.0, 5.6, "Seize traits, c'est long. Dans la cursive, la main pressée réduit le haut à trois petits traits."),
    (8, 5.8, 10.4, "Cette abréviation court déjà dans les livres populaires des Song et des Yuan."),
    (8, 11.0, None, "Au XXe siècle, le Japon, puis la Chine, l'adoptent officiellement. Huit traits."),
    (9, 0.0, 4.6, "Les mains se sont effacées. Les baguettes sont devenues trois traits."),
    (9, 5.0, 8.3, "Mais l'enfant est toujours là, sous le toit."),
    (9, 9.0, None, "Depuis trois mille ans, apprendre, c'est recevoir ce que d'autres mains transmettent."),
    (10, 0.0, None, "Et vous, quel caractère voulez-vous voir renaître ? Dites-le en commentaire."),
]
WARP = {int(k): v for k, v in json.load(open('tools/warp.json')).items()}
def warp(k, x):
    p = WARP[k]
    for i in range(len(p) - 1):
        if x <= p[i + 1][0] or i == len(p) - 2:
            return p[i][1] + (x - p[i][0]) * (p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0])
def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'
out = []
for i, (k, a, b, txt) in enumerate(L, 1):
    b = D[k - 1] + 0.2 if b is None else warp(k, b)
    out.append(f'{i}\n{ts(V[k - 1] + warp(k, a))} --> {ts(V[k - 1] + b)}\n{txt}\n')
open('rendu/xue_evolution.fr.srt', 'w').write('\n'.join(out))
print(len(out), 'sous-titres')
