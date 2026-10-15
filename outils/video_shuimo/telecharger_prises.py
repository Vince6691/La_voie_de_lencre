"""Télécharge les prises ElevenLabs décrites dans un résultat de creative_get_flow_run_status sauvegardé (JSON)
python3 telecharger_prises.py resultat.json dossier gen_id=nom.mp3 …"""
import json, sys, urllib.request
d = json.load(open(sys.argv[1])); out = sys.argv[2]
names = dict(a.split('=') for a in sys.argv[3:])
for g in d.get('generations', []):
    if g['id'] in names and g.get('content_url'):
        urllib.request.urlretrieve(g['content_url'], f"{out}/{names[g['id']]}"); print(names[g['id']], g.get('duration_secs'))
