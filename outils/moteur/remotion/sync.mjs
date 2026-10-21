// Copie dans public/ et src/data/ tout ce que la composition Remotion réutilise du projet principal :
// moteur de dessin (src/*.js), polices, voix off, fond sonore, sous-titres horodatés.
import fs from 'node:fs';
import path from 'node:path';

const X = path.resolve(import.meta.dirname, '..');
const here = import.meta.dirname;
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };

for (const f of ['vendor/gsap.min.js', 'vendor/MorphSVGPlugin.min.js', 'vendor/CustomEase.min.js', 'vendor/brush.js', 'timeline.js', 'warp.js', 'geodata.js', 'fontglyphs.js', 'strokes.js', 'realglyphs.js', 'shuowen.js', 'portrait.js', 'glyphs.js', 'engine.js', 'lavis.js', 'scenes.js']) cp(`${X}/src/${f}`, `${here}/public/legacy/${f}`);
for (const f of fs.readdirSync(`${X}/assets/fonts`)) cp(`${X}/assets/fonts/${f}`, `${here}/public/fonts/${f}`);
// voix de la version fond noir du 學 (episodes/xue/fond_noir/voice_fast)
const XF = path.resolve(X, '../..', 'episodes/xue/fond_noir');
for (const f of fs.readdirSync(`${XF}/voice_fast`)) if (f.endsWith('.wav')) cp(`${XF}/voice_fast/${f}`, `${here}/public/voice/${f}`);
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
// banque shuimo (tools/build_shuimo.py) : éléments détourés, papier, index
for (const f of fs.readdirSync(`${X}/assets/shuimo/elements`)) if (f.endsWith('.png')) cp(`${X}/assets/shuimo/elements/${f}`, `${here}/public/shuimo/elements/${f}`);
cp(`${X}/assets/shuimo/paper.jpg`, `${here}/public/shuimo/paper.jpg`);
cp(`${X}/assets/shuimo/elements/index.json`, `${here}/src/data/shuimo.json`);
// fondus encre ↔ 3D (tools/build_morph.py) : paires d'images et champs de propagation
for (const f of fs.readdirSync(`${X}/assets/morph`)) cp(`${X}/assets/morph/${f}`, `${here}/public/morph/${f}`);
// version tout shuimo (tools/build_estampages.py) : estampages, bruit des fondus ; glyphes réels en JSON
for (const f of fs.readdirSync(`${X}/assets/shuimo_xue`)) cp(`${X}/assets/shuimo_xue/${f}`, `${here}/public/shuimo_xue/${f}`);
fs.writeFileSync(`${here}/src/data/realglyphs.json`, fs.readFileSync(`${X}/src/realglyphs.js`, 'utf8').split('=').slice(1).join('=').trim().replace(/;$/, ''));
// rouleau du temps (tools/build_sfx.py) : sons
for (const f of fs.readdirSync(`${X}/assets/rouleau`)) cp(`${X}/assets/rouleau/${f}`, `${here}/public/rouleau/${f}`);
// mosaïque de mots (skill mosaique-de-mots) : sons et tuile de fibres du papier xuan
for (const f of fs.readdirSync(`${X}/assets/mosaique`)) cp(`${X}/assets/mosaique/${f}`, `${here}/public/mosaique/${f}`);
// clips vidéo d'exemple (Seedance / Veo) pour les tests d'intégration encre
for (const f of fs.readdirSync(`${X}/assets/exemples_videos`)) cp(`${X}/assets/exemples_videos/${f}`, `${here}/public/exemples_videos/${f}`);
// épisodes shuimo (episodes/<pinyin>/, outils/video_shuimo) : voix, musique, clips, images → public/episodes/<pinyin>/ ;
// repères → src/data/episodes/<pinyin>.json ; glyphes de tous les épisodes → public/legacy/episodes.js (chargé par legacy.ts)
const EP = path.resolve(X, '../..', 'episodes');
let extra = '';
if (fs.existsSync(EP)) for (const p of fs.readdirSync(EP)) {
  const e = `${EP}/${p}`;
  if (!fs.existsSync(`${e}/episode.json`)) continue;
  for (const [dir, ok] of [['voix', (f) => f.endsWith('.wav')], ['audio', (f) => f.endsWith('.wav')], ['clips', (f) => /\.(mp4|png|jpe?g)$/.test(f)], ['images', (f) => /\.(png|jpe?g|json)$/.test(f)]]) {
    if (fs.existsSync(`${e}/${dir}`)) for (const f of fs.readdirSync(`${e}/${dir}`)) if (ok(f)) cp(`${e}/${dir}/${f}`, `${here}/public/episodes/${p}/${dir}/${f}`);
  }
  if (fs.existsSync(`${e}/voix/reperes.json`)) cp(`${e}/voix/reperes.json`, `${here}/src/data/episodes/${p}.json`);
  // glyphes/donnees.js (donnees_glyphes.py) et glyphes/portrait_*.js (portrait.py)
  if (fs.existsSync(`${e}/glyphes`)) for (const f of fs.readdirSync(`${e}/glyphes`).sort()) if (f.endsWith('.js')) extra += fs.readFileSync(`${e}/glyphes/${f}`, 'utf8');
}
fs.mkdirSync(`${here}/public/legacy`, { recursive: true });
fs.writeFileSync(`${here}/public/legacy/episodes.js`, extra || '// aucun épisode\n');
console.log('synchronisé');
