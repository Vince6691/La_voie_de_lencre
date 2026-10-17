"""Lecture de la configuration d'un épisode (episode.json) et calcul de la ligne de temps.

episode.json (chemins relatifs au fichier) :
  voix         dossier des clips de voix : bNN.mp3 (ElevenLabs), bNN.wav (préparés), mots/bNN.json (Scribe)
  reperes      fichier écrit par reperes.py (lu par la composition Remotion)
  musique      fichier .wav écrit par musique.py
  debut        temps du premier clip (s)
  sequence     liste ordonnée : {"clip": "b01", "apres": 0.9}
                                {"clip": "b07", "pause": {"repere": "reponse", "decalage": -0.12, "duree": 1.7}, "apres": 0.8}
                                {"rouleau": 5, "apres": 0.3}
                                {"rouleau3d": "complet", "apres": 0.3}   (ou "court" ; skill rouleau-3d)
                                {"clip": "b07", "pause": {"repere": "xushen", "decalage": -0.15, "rouleau3d": "court"}}
               « apres » = silence avant l'élément suivant ; « pause » = silence inséré dans le clip juste avant un repère
  queue        durée de l'écran de fin après le dernier clip (s)
  reperes_cles {clip: {nom: "expression de la voix"}} : le repère tombe au début du premier mot de l'expression
"""
import json, os


def charger(chemin):
    chemin = os.path.abspath(chemin)
    cfg = json.load(open(chemin, encoding='utf-8'))
    base = os.path.dirname(chemin)
    for k in ('voix', 'reperes', 'musique'):
        cfg[k] = os.path.normpath(os.path.join(base, cfg[k]))
    return cfg


ROULEAU3D = {'complet': 5.3, 'court': 3.6}  # durées des rouleaux 3D (Rouleau3D.tsx : r3Seconds)


def ligne_de_temps(cfg, durees, reperes=None):
    """Temps absolus : début de chaque clip, rouleaux, pauses, fin. durees = {clip: secondes} ;
    reperes = {clip: {nom: t}} (nécessaire pour les pauses calées sur un repère)."""
    t = cfg['debut']
    clips, rouleaux, pauses, plages = {}, [], [], {}
    for el in cfg['sequence']:
        if 'clip' in el:
            c = el['clip']
            p = el.get('pause')
            clips[c] = {'debut': round(t, 3), 'duree': durees[c]}
            t += durees[c]
            if p:
                coupe = reperes[c][p['repere']] + p.get('decalage', 0)
                d = ROULEAU3D[p['rouleau3d']] if p.get('rouleau3d') else p['duree']  # rouleau 3D : sa durée propre
                clips[c]['pause'] = {'coupe': round(coupe, 3), 'duree': d}
                pauses.append([round(clips[c]['debut'] + coupe, 3), d])
                if p.get('rouleau3d'):  # rouleau 3D joué pendant la pause (skill rouleau-3d)
                    rouleaux.append({'debut': round(clips[c]['debut'] + coupe, 3), 'duree': d, 'modele': f"3d-{p['rouleau3d']}"})
                elif p.get('rouleau'):  # rouleau du temps joué pendant la pause (mêmes sons et même creux musical)
                    rouleaux.append({'debut': round(clips[c]['debut'] + coupe, 3), 'duree': d})
                t += d
        elif 'plage' in el:  # plage sans voix réservée à un clip (son du clip éventuel : son, son_decalage, son_volume)
            plages[el['nom']] = {'debut': round(t, 3), 'duree': el['plage'], **{k: el[k] for k in ('son', 'son_decalage', 'son_volume', 'son_duree') if k in el}}
            t += el['plage']
        elif 'rouleau3d' in el:  # rouleau du temps en 3D (skill rouleau-3d) : « complet » 5,3 s ou « court » 3,6 s
            d = ROULEAU3D[el['rouleau3d']]
            rouleaux.append({'debut': round(t, 3), 'duree': d, 'modele': f"3d-{el['rouleau3d']}"})
            t += d
        else:
            rouleaux.append({'debut': round(t, 3), 'duree': el['rouleau']})
            t += el['rouleau']
        t += el.get('apres', 0)
    fin = round(t, 3)
    rouleaux.sort(key=lambda r: r['debut'])
    return {'clips': clips, 'rouleaux': rouleaux, 'pauses': pauses, 'plages': plages, 'fin': fin, 'total': round(fin + cfg.get('queue', 0), 3)}
