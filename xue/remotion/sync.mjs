// Copie dans public/ et src/data/ tout ce que la composition Remotion réutilise du projet principal :
// moteur de dessin (src/*.js), polices, voix off, fond sonore, sous-titres horodatés.
import fs from 'node:fs';
import path from 'node:path';

const X = path.resolve(import.meta.dirname, '..');
const here = import.meta.dirname;
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };

for (const f of ['timeline.js', 'warp.js', 'geodata.js', 'fontglyphs.js', 'strokes.js', 'glyphs.js', 'engine.js', 'scenes.js']) cp(`${X}/src/${f}`, `${here}/public/legacy/${f}`);
for (const f of fs.readdirSync(`${X}/assets/fonts`)) cp(`${X}/assets/fonts/${f}`, `${here}/public/fonts/${f}`);
for (const f of fs.readdirSync(`${X}/assets/voice_fast`)) if (f.endsWith('.wav')) cp(`${X}/assets/voice_fast/${f}`, `${here}/public/voice/${f}`);
cp(`${X}/out/bed.wav`, `${here}/public/audio/bed.wav`);
cp(`${X}/out/captions.json`, `${here}/src/data/captions.json`);
cp(`${X}/out/audio_gain.json`, `${here}/src/data/audio_gain.json`);
const tl = fs.readFileSync(`${X}/src/timeline.js`, 'utf8').split('=').slice(1).join('=').trim().replace(/;$/, '');
fs.writeFileSync(`${here}/src/data/timeline.json`, tl);
console.log('synchronisé');
