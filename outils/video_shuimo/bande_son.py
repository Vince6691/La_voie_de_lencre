"""Bande son seule d'un épisode (voix calées sur la ligne de temps + bruitages + musique) → <épisode>/apercus/bande_son.mp3
python3 bande_son.py ../../episodes/<pinyin>/episode.json [sortie.wav] — en quelques secondes : pour juger la voix sans
rendu vidéo, et comme piste son du rendu par morceaux (rendu_morceaux.sh). Bruitages : _ligne.bruitages (reperes.py)."""
import json, math, os, subprocess, sys
import imageio_ffmpeg
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from episode import charger

cfg = charger(sys.argv[1]); base = os.path.dirname(os.path.abspath(sys.argv[1]))
L = json.load(open(cfg['reperes'], encoding='utf-8'))['_ligne']
ff = imageio_ffmpeg.get_ffmpeg_exe()
ins, parts = [], []
for k, c in L['clips'].items():
    src = os.path.join(cfg['voix'], f'{k}.wav')
    p = c.get('pause')
    segs = [(0, None, c['debut'])] if not p else [(0, p['coupe'], c['debut']), (p['coupe'], None, c['debut'] + p['coupe'] + p['duree'])]
    for a, b, t in segs:
        i = len(ins) // 2; ins += ['-i', src]
        trim = f'atrim=start={a}' + (f':end={b}' if b else '') + ',asetpts=PTS-STARTPTS'
        parts.append(f'[{i}:a]{trim},adelay={int(t * 1000)}:all=1[v{i}]')
for n, t, vol in L.get('bruitages', []):
    i = len(ins) // 2; ins += ['-i', os.path.join(base, 'audio', f'sfx_{n}.wav')]
    parts.append(f'[{i}:a]volume={vol},adelay={int(t * 1000)}:all=1[v{i}]')
for pl in L.get('plages', {}).values():
    if 'son' not in pl: continue
    i = len(ins) // 2; ins += ['-i', os.path.join(base, pl['son'])]
    parts.append(f'[{i}:a]volume={pl.get("son_volume", 1)},adelay={int((pl["debut"] + pl.get("son_decalage", 0)) * 1000)}:all=1[v{i}]')
# son des rouleaux (TimeScrollStage : souffle, glissando, impact, calé sur 5 s ; gong quand le sceau se pose)
RS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'moteur', 'remotion', 'public', 'rouleau')
son = lambda r: int(r.get('son') or math.floor(r['debut']) % 3 + 1)  # 流水拂 du rouleau, comme sonRouleau (TimeScroll.tsx)
for r in L['rouleaux']:
    if r.get('modele', '').startswith('3d'):  # rouleau 3D : son complet (souffle, guzheng, coup du sceau, cloche) calé sur sa durée
        i = len(ins) // 2; ins += ['-i', os.path.join(RS, f"{'rouleau3d_court' if r['modele'] == '3d-court' else 'rouleau3d'}_liushui_{son(r)}.wav")]
        parts.append(f'[{i}:a]volume=0.8,adelay={int(r["debut"] * 1000)}:all=1[v{i}]')
        continue
    i = len(ins) // 2; ins += ['-i', os.path.join(RS, f'rouleau_liushui_{son(r)}.wav')]
    parts.append(f'[{i}:a]atempo={5 / r["duree"]:.4f},volume=0.6,adelay={int(r["debut"] * 1000)}:all=1[v{i}]')
    i = len(ins) // 2; ins += ['-i', os.path.join(RS, 'ding.wav')]
    parts.append(f'[{i}:a]volume=0.3,adelay={int((r["debut"] + 0.9 * r["duree"]) * 1000)}:all=1[v{i}]')
mf = L.get('musique_fin')
if mf:
    i = len(ins) // 2; ins += ['-i', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'moteur', 'assets', 'musique', mf['fichier'])]
    d0, fv, vv, vf, mo = mf['debut'], mf['fin_voix'] - mf['debut'], mf['volume_voix'], mf['volume'], mf['montee']
    env = f"if(lt(t,{fv}),{vv}*min(1,t/{mo}),{vv}+({vf}-{vv})*min(1,(t-{fv})/{mo}))"
    lg = mf['fin'] - d0
    parts.append(f"[{i}:a]atrim=start={mf['depart']},asetpts=PTS-STARTPTS,atrim=end={lg},volume='{env}':eval=frame,afade=t=out:st={lg - mf['fondu']}:d={mf['fondu']},adelay={int(d0 * 1000)}:all=1[v{i}]")
m = len(ins) // 2; ins += ['-i', cfg['musique']]
labels = ''.join(f'[v{j}]' for j in range(m))
vm = f"0.55*if(lt(t,{mf['debut']}),1,max(0,1-(t-{mf['debut']})/2))" if mf else '0.55'  # la musique principale s'efface sous celle de fin
# chaque entrée passe en stéréo avant le mélange : sinon amix suit la voix (mono) et aplatit la musique et les bruitages stéréo
st = ''.join(f';[v{j}]aformat=channel_layouts=stereo[s{j}]' for j in range(m))
labels = ''.join(f'[s{j}]' for j in range(m))
graph = ';'.join(parts) + st + f";[{m}:a]volume='{vm}':eval=frame,aformat=channel_layouts=stereo[m];{labels}[m]amix=inputs={m + 1}:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5,aresample=48000[o]"
out = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(base, 'apercus', 'bande_son.mp3')
os.makedirs(os.path.dirname(out), exist_ok=True)
fmt = ['-c:a', 'pcm_s16le'] if out.endswith('.wav') else ['-b:a', '160k']
# graphe écrit dans un fichier : avec beaucoup de bruitages la ligne de commande dépasse la limite de Windows (≈ 32 000 caractères)
import tempfile
script = tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8'); script.write(graph + f';[o]atrim=end={L["total"]}[f]'); script.close()
try:
    subprocess.run([ff, '-y', '-loglevel', 'error', *ins, '-filter_complex_script', script.name, '-map', '[f]', *fmt, out], check=True)
finally:
    os.unlink(script.name)
print(out)
