"""Sous-titres SRT (français) calés sur la voix off : chaque sous-titre se termine sur un silence
détecté dans la prise (assets/voice_fast, pauses comprises)."""
import json, sys
sys.path.insert(0, 'tools')
from silences import silences

TL = json.loads(open('src/timeline.js').read().split('=', 1)[1].strip().rstrip(';'))
# (texte, indice du silence qui le termine — None : fin du clip), par clip
L = {
    1: [("Ce caractère cache deux mains… que plus personne ne voit.", 1), ("Trois mille ans d'histoire, dans un seul mot : apprendre.", None)],
    2: [("Vers 1250 avant notre ère, à Anyang, capitale des Shang.", 2), ("Les devins gravent l'os et l'écaille de tortue.", 3),
        ("Là, naît le signe.", 5), ("Au centre, des baguettes croisées : yáo. On s'en sert pour compter.", 9),
        ("Dessous, le toit d'un bâtiment. Et de chaque côté… deux mains.", None)],
    3: [("Puis viennent les Zhou.", 0), ("Sur leurs grands vases rituels en bronze, des inscriptions sont coulées dans le métal, à l'intérieur même du vase.", 3),
        ("Et sous le toit, un nouveau venu se glisse : l'enfant.", 6), ("Tout est dit. Des mains transmettent, sous un toit, à un enfant.", 10),
        ("Un vase raconte même qu'un roi fit enseigner le tir à l'arc aux jeunes de la cour… dans la salle d'étude.", None)],
    4: [("221 avant notre ère. Le premier empereur unifie la Chine.", 1), ("Jusque-là, chaque royaume écrivait à sa façon.", 3),
        ("Son ministre, Li Si, unifie l'écriture.", 6), ("Le petit sceau aligne tout, en parfaite symétrie.", None)],
    5: [("Vers l'an 100, le lettré Xu Shen compose le Shuowen jiezi :", 3), ("le premier dictionnaire qui explique la forme de chaque caractère.", 4),
        ("Notre signe y est défini ainsi : apprendre, c'est s'éveiller.", 7), ("Le toit, c'est l'obscurité qui couvre encore l'esprit.", None)],
    6: [("Dans le même temps, sous les Han, les scribes accélèrent. Le pinceau aplatit les courbes.", 2),
        ("Les deux mains se figent en un bloc qui ressemble à un mortier. Leur sens s'efface.", None)],
    7: [("L'écriture régulière fixe enfin la forme. Xué. Seize traits.", None)],
    8: [("Seize traits, c'est long. Dans la cursive, la main pressée réduit le haut à trois petits traits.", 1),
        ("Cette abréviation court déjà dans les livres populaires des Song et des Yuan.", 2),
        ("Au XXe siècle, le Japon, puis la Chine, l'adoptent officiellement.", 5), ("Huit traits.", None)],
    9: [("Les mains se sont effacées. Les baguettes sont devenues trois traits.", 1), ("Mais l'enfant est toujours là, sous le toit.", 3),
        ("Depuis trois mille ans, apprendre, c'est recevoir ce que d'autres mains transmettent.", None)],
    10: [("Et vous, quel caractère voulez-vous voir renaître ? Dites-le en commentaire.", None)],
}


def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


out = []
for k, cues in L.items():
    sil, dur = silences(f'assets/voice_fast/s{k:02d}.wav')
    lead = sil[0][1] if sil and sil[0][0] == 0 else 0  # silence de tête ajouté au montage
    sil = [s for s in sil if s[0] > 0]
    v0 = TL['voice'][k - 1]['start']
    a = lead
    for txt, i in cues:
        b = dur + 0.2 if i is None else sil[i][0] + 0.3
        out.append(f'{len(out) + 1}\n{ts(v0 + a)} --> {ts(v0 + b)}\n{txt}\n')
        if i is not None: a = sil[i][1]
open('rendu/xue_evolution.fr.srt', 'w').write('\n'.join(out))
print(len(out), 'sous-titres')
