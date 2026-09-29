"""Horodatage approximatif mot à mot de la voix off → out/captions.json (pour les sous-titres
animés de la version Remotion). Les mots sont répartis sur les passages parlés de chaque clip
(silences détectés) au prorata de leur longueur."""
import json, re, wave
import numpy as np

TEXTS = [
    "Un seul caractère. Trois mille ans d'histoire. Voici comment la Chine a écrit… apprendre.",
    "Vers 1250 avant notre ère, à Anyang, capitale des Shang. Les devins gravent l'os et l'écaille de tortue. Là, naît le signe. Au centre, deux croix : yao. Des baguettes à compter. Dessous, le toit d'un bâtiment. Et de chaque côté… deux mains.",
    "Puis viennent les Zhou. Sur le bronze des vases rituels, un nouveau venu se glisse sous le toit : l'enfant. Tout est dit. Des mains transmettent, sous un toit, à un enfant. Un vase raconte même qu'un roi fit enseigner le tir à l'arc aux jeunes de la cour… dans la salle d'étude.",
    "221 avant notre ère. Le premier empereur unifie la Chine. Son ministre, Li Si, unifie l'écriture. Le petit sceau aligne tout, en parfaite symétrie.",
    "Vers l'an 100, le lettré Xu Shen, dans le Shuowen jiezi, l'explique ainsi : apprendre, c'est s'éveiller. Le toit, c'est l'obscurité qui couvre encore l'esprit.",
    "Sous les Han, les scribes accélèrent. Le pinceau aplatit les courbes. Les deux mains se figent en un bloc qui ressemble à un mortier. Leur sens s'efface.",
    "L'écriture régulière fixe enfin la forme. Xué. Seize traits.",
    "Seize traits, c'est long. Dans la cursive, la main pressée réduit le haut à trois petits traits. Cette abréviation court déjà dans les livres populaires des Song et des Yuan. Au XXe siècle, le Japon, puis la Chine, l'adoptent officiellement. Huit traits.",
    "Les mains se sont effacées. Les baguettes sont devenues trois traits. Mais l'enfant est toujours là, sous le toit. Depuis trois mille ans, apprendre, c'est recevoir ce que d'autres mains transmettent.",
    "Et vous, quel caractère voulez-vous voir renaître ? Dites-le en commentaire.",
]
# poids « durée parlée » de certains mots écrits en chiffres
SPOKEN = {'1250': 'douze cent cinquante', '221': 'deux cent vingt et un', '100': 'cent', 'XXe': 'vingtième'}

TL = json.loads(open('src/timeline.js').read().split('=', 1)[1].strip().rstrip(';'))
words_out = []
for i, text in enumerate(TEXTS, 1):
    w = wave.open(f'assets/voice_fast/s{i:02d}.wav'); sr = w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    hop = int(sr * 0.02)
    db = np.array([20 * np.log10(np.sqrt(np.mean(a[j:j + hop] ** 2)) + 1e-9) for j in range(0, len(a) - hop, hop)])
    voiced = db > -38
    # passages parlés (on comble les micro-silences < 0,15 s)
    segs, s = [], None
    for k, v in enumerate(voiced):
        if v and s is None: s = k
        if not v and s is not None:
            segs.append([s, k]); s = None
    if s is not None: segs.append([s, len(voiced)])
    merged = []
    for sg in segs:
        if merged and (sg[0] - merged[-1][1]) * 0.02 < 0.15: merged[-1][1] = sg[1]
        else: merged.append(sg)
    segs = [(x * 0.02, y * 0.02) for x, y in merged]
    tot = sum(b - a_ for a_, b in segs)
    words = []
    for wd in text.split():  # la ponctuation isolée (« : », « ? ») rejoint le mot précédent
        if words and not re.search(r'\w', wd): words[-1] += '\u00a0' + wd
        else: words.append(wd)
    weights = [len(SPOKEN.get(re.sub(r'[^\w]', '', wd), wd)) + 1 for wd in words]
    W = sum(weights)
    def at(frac):  # fraction du temps parlé → temps dans le clip
        target = frac * tot
        for a_, b in segs:
            if target <= b - a_: return a_ + target
            target -= b - a_
        return segs[-1][1]
    # 1) découpe en groupes de mots aux ponctuations, 2) fin de groupe calée sur le silence le plus
    # proche, 3) mots répartis dans chaque groupe au prorata de leur longueur
    groups, cur = [], []
    for wd, wt in zip(words, weights):
        cur.append((wd, wt))
        if re.search(r'[.,:;…?!]$', wd): groups.append(cur); cur = []
    if cur: groups.append(cur)
    ends = [b for _, b in segs]
    starts_ = [a_ for a_, _ in segs]
    acc, t_prev = 0, segs[0][0]
    start = TL['voice'][i - 1]['start']
    for gi, g in enumerate(groups):
        acc += sum(wt for _, wt in g)
        t_end = at(acc / W)
        if gi == len(groups) - 1: t_end = segs[-1][1]
        else:
            cand = [e for e in ends[:-1] if e > t_prev + 0.2]
            if cand: t_end = min(cand, key=lambda e: abs(e - t_end))
        gw = sum(wt for _, wt in g); x = 0
        for wd, wt in g:
            w0 = t_prev + (t_end - t_prev) * x / gw; x += wt
            w1 = t_prev + (t_end - t_prev) * x / gw
            words_out.append({'text': wd, 'start': round(start + w0, 3), 'end': round(start + w1, 3), 'clip': i})
        # le groupe suivant commence à la reprise de la parole
        nxt = [s0 for s0 in starts_ if s0 >= t_end - 0.01]
        t_prev = nxt[0] if nxt else t_end
json.dump(words_out, open('out/captions.json', 'w'), ensure_ascii=False)
print(len(words_out), 'mots')
