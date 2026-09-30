// Copie dans public/ et src/data/ tout ce que la composition Remotion réutilise du projet principal :
// moteur de dessin (src/*.js), polices, voix off, fond sonore, sous-titres horodatés.
import fs from 'node:fs';
import path from 'node:path';

const X = path.resolve(import.meta.dirname, '..');
const here = import.meta.dirname;
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };

for (const f of ['vendor/gsap.min.js', 'vendor/MorphSVGPlugin.min.js', 'vendor/CustomEase.min.js', 'vendor/brush.js', 'timeline.js', 'warp.js', 'geodata.js', 'fontglyphs.js', 'strokes.js', 'realglyphs.js', 'shuowen.js', 'glyphs.js', 'engine.js', 'lavis.js', 'scenes.js']) cp(`${X}/src/${f}`, `${here}/public/legacy/${f}`);
for (const f of fs.readdirSync(`${X}/assets/fonts`)) cp(`${X}/assets/fonts/${f}`, `${here}/public/fonts/${f}`);
for (const f of fs.readdirSync(`${X}/assets/voice_fast`)) if (f.endsWith('.wav')) cp(`${X}/assets/voice_fast/${f}`, `${here}/public/voice/${f}`);
// fond sonore (versionné, écrit par tools/audio.py) ; données générées (out/) ou leur copie versionnée
const pick = (gen, kept) => (fs.existsSync(gen) ? gen : kept);
cp(`${X}/assets/audio/bed.mp3`, `${here}/public/audio/bed.mp3`);
cp(pick(`${X}/out/captions.json`, `${X}/assets/data/captions.json`), `${here}/src/data/captions.json`);
cp(pick(`${X}/out/audio_gain.json`, `${X}/assets/data/audio_gain.json`), `${here}/src/data/audio_gain.json`);
const tl = fs.readFileSync(`${X}/src/timeline.js`, 'utf8').split('=').slice(1).join('=').trim().replace(/;$/, '');
fs.writeFileSync(`${here}/src/data/timeline.json`, tl);
// extrait vidéo de la divination (le seul fichier du dossier)
const vids = fs.readdirSync(`${X}/assets/video`).filter((f) => f.endsWith('.mp4'));
if (vids.length) cp(`${X}/assets/video/${vids[0]}`, `${here}/public/video/divination.mp4`);
console.log('synchronisé');
