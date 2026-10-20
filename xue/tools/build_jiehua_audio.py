"""Bande son de la séquence 界畫 « le canevas au crayon » (remotion/src/jiehua3d/JiehuaCanevas.tsx), mixée d'après la
chronologie exacte de l'animation (assets/jiehua/events.json, exportée par remotion/src/jiehua3d/exportEvents.ts) :
- crayon : le grattement de la mine suit, image par image, la longueur de trait en cours de tracé ;
- vent : un souffle continu suit la vitesse de la caméra (plus fort et plus clair quand elle file), un grand
  souffle ElevenLabs culmine sur chacun des trois mouvements les plus rapides, et un bref souffle (avec un coup de
  taiko léger) marque chaque coupe du montage ;
- impacts : chaque pièce sonne à l'instant où elle touche sa place (attaque du son calée sur le contact) — bois grave
  pour colonnes, linteaux, fermes, murs et faîtage, clics secs pour les consoles et les chevrons, grondement du toit ;
- musique de synthèse : bourdon et guzheng pendant le dessin, taiko qui frappent sur les pièces principales,
  cordes qui enflent jusqu'au toit, flûte xiao, glissando de guzheng sur l'or, accord tenu, guqin sur le sceau ;
- pinceau quand la terrasse passe à l'encre et à la peinture des décors, petite touche à chaque caractère de
  l'inscription, sceau, gong discret à la fin du recul.
Les bruitages ElevenLabs (assets/jiehua/src/<nom>_N.mp3) : une variante retenue par son.
Usage (depuis xue/) : node remotion/out/exportEvents.cjs (voir exportEvents.ts) puis python3 tools/build_jiehua_audio.py
→ assets/jiehua/bande.wav ; node sync.mjs dans remotion/."""
import glob, json, os, subprocess, wave
import numpy as np
from scipy.signal import butter, lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'jiehua')
SR = 48000
rng = np.random.default_rng(11)
EV = json.load(open(os.path.join(OUT, 'events.json')))
TOTAL = EV['total']; N = int(TOTAL * SR); t = np.arange(N) / SR


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def save(name, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, np.roll(x, 29)], 1)                     # léger élargissement stéréo
    with wave.open(os.path.join(OUT, name), 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def lp(x, fc):
    b, a = butter(2, fc / (SR / 2)); return lfilter(b, a, x)


def env_of(x, win=240):
    return np.convolve(np.abs(x), np.ones(win) / win, 'same')


# ---- bruitages : une variante par son (attaque la plus franche pour les impacts, présence régulière sinon) ----
def score(x, impact):
    e = env_of(x, 480)
    if impact:
        p = int(np.argmax(e)); tail = e[min(len(e) - 1, p + SR // 3):].mean() + 1e-6
        return e[p] / tail - p / SR * 4
    return (e > 0.15 * e.max()).mean() + 0.2 * np.sqrt((x ** 2).mean())


SFX = {'crayon': False, 'souffle': False, 'bois': True, 'clic': True, 'toit': True, 'pinceau': False, 'or': False}
S = {}
for name, impact in SFX.items():
    vs = sorted(glob.glob(os.path.join(OUT, 'src', f'{name}_*.mp3')))
    x = load(max(vs, key=lambda v: score(load(v), impact)))
    S[name] = x / (np.abs(x).max() + 1e-9)
for name in ['gong', 'sceau']:
    x = load(os.path.join(HERE, '..', '..', 'episodes', 'jiao', 'audio', f'sfx_{name}.wav'))
    S[name] = x / (np.abs(x).max() + 1e-9)


def onset(x, k=0.25):
    e = env_of(x, 96); return int(np.argmax(e > k * e.max()))


def peak(x):
    return int(np.argmax(env_of(x, 2400)))


mix = np.zeros(N)
def put(x, at, gain, align=0):
    """pose x pour que son échantillon `align` tombe à l'instant `at`"""
    i = int(at * SR) - align
    a, b = max(0, i), min(N, i + len(x))
    if b > a: mix[a:b] += gain * x[a - i:b - i]


def frames_to_samples(v):
    fps = EV['fps']; ft = np.arange(len(v)) / fps
    return np.interp(t, ft, v)


def smooth(v, sec):
    w = max(1, int(sec * SR)); k = np.exp(-np.arange(w) / (w / 3)); k /= k.sum()
    return lfilter(k, [1], v)


# ---- crayon : grattement modulé par le tracé ----
act = frames_to_samples(np.array(EV['pencil']))
act = np.clip(act / (np.percentile(EV['pencil'], 90) + 1e-9), 0, 1.3)
act = smooth(act, 0.06) ** 0.7
cr = S['crayon']; loop = np.tile(cr, int(np.ceil(N / len(cr))) + 1)[:N]
mix += 0.32 * loop * act

# ---- vent : souffle continu qui suit la caméra, et grands souffles sur les trois mouvements les plus rapides ----
sp = np.array(EV['cam']); sp_n = sp / (sp.max() + 1e-9)
v = smooth(frames_to_samples(sp_n), 0.15)
pink = lfilter([0.049922, -0.095993, 0.050613, -0.004409], [1, -2.494956, 2.017266, -0.522189], rng.standard_normal(N))
wind = np.zeros(N); hop = 4096
for i in range(0, N, hop):
    fc = 250 + 1600 * v[min(i + hop // 2, N - 1)]
    b, a = butter(2, [fc * 0.5 / (SR / 2), min(0.95, fc * 1.8 / (SR / 2))], 'band')
    seg = lfilter(b, a, pink[max(0, i - 8192):i + hop])[-min(hop, N - i):]
    wind[i:i + len(seg)] = seg
mix += 0.9 * wind / (np.abs(wind).max() + 1e-9) * v ** 1.4 * 0.35
fps = EV['fps']; peaks = []
for f in np.argsort(-sp):
    if all(abs(f - g) > 2.5 * fps for g in peaks): peaks.append(int(f))
    if len(peaks) == 3: break
for f in peaks:
    put(S['souffle'], f / fps, 0.35, peak(S['souffle']))
# coupes du montage : un bref souffle d'air centré sur chaque coupe (et un coup de taiko, plus bas)
sw = S['souffle']; pk = peak(sw); h = int(0.22 * SR)
swish = sw[max(0, pk - h):pk + h] * np.hanning(len(sw[max(0, pk - h):pk + h]))
for c in EV['cuts']:
    put(swish, c, 0.22, h)

# ---- impacts sur le contact de chaque pièce ----
def pitched(x, r):   # léger changement de hauteur (rééchantillonnage) pour varier les coups
    n = int(len(x) / r); return np.interp(np.arange(n) * r, np.arange(len(x)), x)


small = 0
for k, L in enumerate(EV['lands']):
    kind, at = L['kind'], L['t']
    if kind == 'roof':
        put(S['toit'], at, 0.85, onset(S['toit']))
    elif kind in ('dougong', 'rafter'):
        small += 1
        if small % 2 == 0: continue                       # les consoles, très serrées : un clic sur deux
        x = pitched(S['clic'], rng.uniform(0.94, 1.08)); put(x, at, 0.28, onset(x))
    else:
        g = {'column': 0.42, 'beam': 0.55, 'frame': 0.5, 'wall': 0.32, 'ridge': 0.6}[kind]
        x = pitched(S['bois'], rng.uniform(0.92, 1.05) * (0.9 if kind in ('beam', 'ridge') else 1.0))
        if kind == 'wall': x = lp(x, 1800)
        put(x, at, g, onset(x))

# ---- pinceau, or, inscription, sceau, gong ----
pin = S['pinceau']
put(pin, EV['ink'][0], 0.18, onset(pin))                   # la terrasse passe à l'encre
put(pin, EV['paint'], 0.32, onset(pin))                    # décors
put(S['or'], EV['gold'][0], 0.28, onset(S['or']))
tap = pin[onset(pin):onset(pin) + int(0.28 * SR)] * np.hanning(int(0.28 * SR))
for c in EV['chars']: put(tap, c, 0.14)                    # une touche par caractère
put(S['sceau'], EV['seal'], 0.55, onset(S['sceau']))
put(S['gong'], EV['far'][1] - 0.15, 0.22, onset(S['gong']))

# ---- musique ----
f2 = lambda m: 440 * 2 ** ((m - 69) / 12)
music = np.zeros(N)
def mput(x, at, gain):
    i = int(at * SR); j = min(N, i + len(x))
    if 0 <= i < N: music[i:j] += gain * x[:j - i]


def pluck(freq, dur=3.0, decay=1.3, bright=0.996):
    n = int(dur * SR); P = max(2, int(SR / freq)); buf = rng.uniform(-1, 1, P); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % P]; buf[i % P] = bright * 0.5 * (buf[i % P] + buf[(i + 1) % P])
    return out * np.exp(-np.arange(n) / SR / decay)


lands = EV['lands']; t_roof = next(L['t'] for L in lands if L['kind'] == 'roof'); t_first = lands[0]['t']
drone = sum(g * np.sin(2 * np.pi * f2(m) * t + 0.3 * np.sin(2 * np.pi * 0.07 * t + m)) for m, g in [(38, 0.5), (45, 0.32), (50, 0.2)])
music += 0.14 * drone * (0.6 + 0.4 * np.clip((t - t_first) / 3, 0, 1)) * np.clip(t / 1.5, 0, 1)
# guzheng : une note au départ des grandes étapes du dessin (lignes de fuite, colonnes, consoles, toit)
act_f = np.nonzero(np.array(EV['pencil']) > 0)[0] / EV['fps']   # fenêtre du dessin
for k, m in enumerate([69, 74, 71, 76, 78, 81]):
    mput(pluck(f2(m)), act_f[0] + k * (act_f[-1] - act_f[0]) / 6, 0.1)
def pad(notes):
    s = np.zeros(N)
    for m in notes:
        for h in range(1, 7):
            s += np.sin(2 * np.pi * f2(m) * h * t * (1 + 0.0015 * np.sin(2 * np.pi * 5.2 * t + h)) + h) / h ** 1.3
    return lp(s, 1800)
rise = np.clip((t - (t_first - 0.6)) / (t_roof - t_first + 0.6), 0, 1) ** 1.5 * np.clip((t_roof + 0.35 - t) / 0.3, 0, 1)
music += 0.035 * pad([38, 45, 50, 54]) * rise
hold = np.clip((t - t_roof) / 0.06, 0, 1) * np.clip((TOTAL - t) / 1.6, 0, 1) * (0.75 + 0.25 * np.exp(-np.clip(t - t_roof, 0, None) / 1.5))
music += 0.04 * pad([38, 45, 50, 57, 62]) * hold
def taiko(low=55):
    n = int(1.2 * SR); u = np.arange(n) / SR
    body = np.sin(2 * np.pi * (low * u + 40 * (1 - np.exp(-u * 18)) / 18)) * np.exp(-u * 5.5)
    return body + lp(rng.standard_normal(n), 900) * np.exp(-u * 30) * 0.35
# taiko sur les pièces principales (premier et dernier groupe de colonnes, linteaux, fermes, murs), triple coup au toit
hits, last = [], -9
for L in lands:
    if L['kind'] in ('column', 'beam', 'frame', 'wall', 'ridge') and L['t'] - last > 0.22:
        hits.append(L['t']); last = L['t']
for k, h in enumerate(hits):
    mput(taiko(), h, 0.18 + 0.32 * k / max(1, len(hits) - 1))
for c in EV['cuts']:
    if all(abs(c - h) > 0.15 for h in hits): mput(taiko(62), c, 0.16)
for k, d in enumerate([-0.25, 0, 0.25]):
    mput(taiko(48), t_roof + d, 0.7 if k == 1 else 0.45)
def flute(m, dur):
    n = int(dur * SR); u = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f2(m) * (1 + 0.006 * np.sin(2 * np.pi * 5.0 * u) * np.clip(u / 0.4, 0, 1))) / SR
    tone = np.sin(ph) + 0.18 * np.sin(2 * ph) + lp(rng.standard_normal(n), 2500) * 0.08
    return tone * np.clip(u / 0.12, 0, 1) * np.clip((dur - u) / 0.35, 0, 1)
phrase = [(69, 0.9), (74, 0.6), (76, 0.5), (78, 0.5), (81, 1.4)]
pt = t_first
for m, d in phrase:
    mput(flute(m, d), pt, 0.07); pt += (t_roof - t_first) / len(phrase)
for at, m, d in [(EV['gold'][0] + 0.4, 78, 0.8), (EV['far'][0] - 0.2, 74, 2.2)]:
    mput(flute(m, d), at, 0.07)
scale = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86]
for k, m in enumerate(scale):
    mput(pluck(f2(m), 2.2, 1.0), EV['gold'][0] + 0.055 * k, 0.07)
mput(pluck(f2(43), 3.5, 2.0, 0.998), EV['seal'], 0.22)
music *= np.clip((TOTAL - t) / 0.6, 0, 1)
music = music / np.abs(music).max() * 0.42

bande = mix + music
bande = bande / np.abs(bande).max() * 0.89
save('bande.wav', bande)
print('bande.wav', TOTAL, 's ; souffles à', [round(f / fps, 2) for f in sorted(peaks)], '; toit à', round(t_roof, 2), 's')
