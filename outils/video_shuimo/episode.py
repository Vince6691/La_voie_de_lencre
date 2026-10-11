"""Lecture de la configuration d'un épisode (episode.json) et calcul de la ligne de temps.

episode.json (chemins relatifs au fichier) :
  voix         dossier des clips de voix : bNN.mp3 (ElevenLabs), bNN.wav (préparés), mots/bNN.json (Scribe)
  reperes      fichier écrit par reperes.py (lu par la composition Remotion)
  musique      fichier .wav écrit par musique.py
  debut        temps du premier clip (s)
  sequence     liste ordonnée : {"clip": "b01", "apres": 0.9}
                                {"clip": "b07", "pause": {"repere": "reponse", "decalage": -0.12, "duree": 1.7}, "apres": 0.8}
                                {"rouleau": 5, "apres": 0.3}
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


def ligne_de_temps(cfg, durees, reperes=None):
    """Temps absolus : début de chaque clip, rouleaux, pauses, fin. durees = {clip: secondes} ;
    reperes = {clip: {nom: t}} (nécessaire pour les pauses calées sur un repère)."""
    t = cfg['debut']
    clips, rouleaux, pauses = {}, [], []
    for el in cfg['sequence']:
        if 'clip' in el:
            c = el['clip']
            p = el.get('pause')
            clips[c] = {'debut': round(t, 3), 'duree': durees[c]}
            t += durees[c]
            if p:
                coupe = reperes[c][p['repere']] + p.get('decalage', 0)
                clips[c]['pause'] = {'coupe': round(coupe, 3), 'duree': p['duree']}
                pauses.append([round(clips[c]['debut'] + coupe, 3), p['duree']])
                t += p['duree']
        else:
            rouleaux.append({'debut': round(t, 3), 'duree': el['rouleau']})
            t += el['rouleau']
        t += el.get('apres', 0)
    fin = round(t, 3)
    return {'clips': clips, 'rouleaux': rouleaux, 'pauses': pauses, 'fin': fin, 'total': round(fin + cfg.get('queue', 0), 3)}
