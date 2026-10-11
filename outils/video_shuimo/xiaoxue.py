"""python3 xiaoxue.py <caractère> <dossier> : toutes les formes du 小學堂字形演變資料庫 (Academia Sinica, CC0) → PNG 668 px + index.json (police, pièce, texte du Shuowen)"""
import re, html, json, os, sys, subprocess, urllib.parse
zi, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
B = 'https://xiaoxue.iis.sinica.edu.tw'
cj = os.path.join(out, '.cj')
def curl(*a): return subprocess.run(['curl', '-sSL', '-m', '60', '-c', cj, '-b', cj, *a], capture_output=True).stdout
curl(B + '/yanbian/')
s = curl('-X', 'POST', B + '/yanbian/PageResult/PageResult', '--data-urlencode', 'EudcFontChar=' + zi,
         '--data', 'ZiOrder=&PageNo=&ImageSize=150&ddSize=13', '-H', 'X-Requested-With: XMLHttpRequest').decode()
s = s[s.find('共搜尋到'):]
cells = re.findall(r'<img src="([^"]+)"[^>]*>(.*?)<td', s, re.S)
forms = []
for i, (src, lab) in enumerate(cells):
    src = html.unescape(src).replace('size=150', 'size=500')
    q = urllib.parse.parse_qs(urllib.parse.urlparse(src).query)
    label = ' '.join(t.strip() for t in re.sub('<[^>]+>', '|', lab).split('|') if t.strip())
    f = f'{i:02d}.png'
    open(os.path.join(out, f), 'wb').write(curl(B + src))
    forms.append({'font': q['font'][0], 'label': label, 'file': f})
shuowen = re.search(r'《說文》：(.*?)</dd>', s, re.S)
json.dump({'char': zi, 'source': '小學堂字形演變資料庫, 中央研究院 (https://xiaoxue.iis.sinica.edu.tw/yanbian)',
           'license': 'CC0 1.0', 'shuowen': shuowen and html.unescape(shuowen.group(1)), 'forms': forms},
          open(os.path.join(out, 'index.json'), 'w'), ensure_ascii=False, indent=1)
os.remove(cj); print(len(forms), 'formes')
