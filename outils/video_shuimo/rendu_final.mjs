#!/usr/bin/env node
// Rendu final YouTube d'un épisode 墨道 (skill rendu-youtube) : 1440p par défaut, morceaux en parallèle, rouleaux 3D
// rendus à part avec un long délai, reprise automatique d'un morceau en échec, son à −14 LUFS, assemblage sans
// réencodage, couleurs bt709 plage TV, rapport de contrôle et planches d'images pour la note artistique.
//
//   node outils/video_shuimo/rendu_final.mjs <Composition> <pinyin> [options]
//     --hauteur 1440|1080   définition (défaut 1440)        --crf 16         qualité x264 finale (défaut 16)
//     --gl angle|swangle    rendu graphique : carte graphique (défaut, 4 à 12 fois plus rapide sur le 學) ou logiciel (sûr) ;
//                           un morceau en échec est repris en swangle
//     --plan                affiche le découpage, ne rend rien
//     --essai               rend 2 s (début + rouleau 3D s'il y en a) et vérifie le format, sans assembler
//     --assembler           saute le rendu : réutilise les morceaux déjà faits (après une reprise à la main)
// Sortie : episodes/<pinyin>/rendu/<pinyin>_<hauteur>p.mp4, rapport.txt et planches/ dans outils/moteur/out/final_<pinyin>/.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '../..');
const REM = path.join(RACINE, 'outils/moteur/remotion');
const [C, P, ...opts] = process.argv.slice(2);
if (!C || !P) { console.error('usage : node rendu_final.mjs <Composition> <pinyin> [--hauteur 1440] [--crf 16] [--plan] [--essai] [--assembler]'); process.exit(1); }
const opt = (n, d) => { const i = opts.indexOf(`--${n}`); return i < 0 ? d : opts[i + 1]; };
const has = (n) => opts.includes(`--${n}`);
const H = Number(opt('hauteur', 1440)), CRF = Number(opt('crf', 16)), GL = opt('gl', 'angle'), FPS = 30;
const OUT = path.join(RACINE, `outils/moteur/out/final_${P}`), MORC = path.join(OUT, 'morceaux'), BUNDLE = path.join(OUT, 'bundle');
const EP = path.join(RACINE, 'episodes', P);
fs.mkdirSync(MORC, { recursive: true });
const journal = (m) => { const l = `[${new Date().toLocaleTimeString('fr-FR')}] ${m}`; console.log(l); fs.appendFileSync(path.join(OUT, 'journal.txt'), l + '\n'); };

// python (imageio_ffmpeg, bande_son.py) : « python3 » est parfois un raccourci du Windows Store qui ne marche pas
const PY = ['python3', 'python'].find((p) => spawnSync(p, ['-c', 'import imageio_ffmpeg'], { encoding: 'utf8' }).status === 0);
if (!PY) { console.error('python avec imageio_ffmpeg introuvable (pip install imageio-ffmpeg)'); process.exit(1); }
const FF = spawnSync(PY, ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).stdout.trim();
const ff = (args) => spawnSync(FF, args, { encoding: 'utf8', maxBuffer: 1 << 28 });
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const images = (f) => { const m = [...ff(['-i', f, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-']).stderr.matchAll(/frame=\s*(\d+)/g)]; return m.length ? Number(m[m.length - 1][1]) : 0; };
const fluxVideo = (f) => (ff(['-i', f]).stderr.split('\n').find((l) => l.includes('Video:')) ?? '').trim();

// ── 1. bundle et durée
if (!has('assembler')) {
  journal(`sync + bundle (${C}, ${H}p, crf ${CRF})`);
  spawnSync('node', ['sync.mjs'], { cwd: REM, stdio: 'ignore' });
  fs.rmSync(BUNDLE, { recursive: true, force: true });
  const b = spawnSync(npx, ['remotion', 'bundle', 'src/index.ts', `--out-dir=${BUNDLE}`], { cwd: REM, encoding: 'utf8', shell: true });
  if (b.status !== 0) { console.error(b.stdout, b.stderr); process.exit(1); }
}
const rep = JSON.parse(fs.readFileSync(path.join(EP, 'voix/reperes.json'), 'utf8'))._ligne;
const compos = spawnSync(npx, ['remotion', 'compositions', BUNDLE], { cwd: REM, encoding: 'utf8', shell: true }).stdout ?? '';
const ligne = compos.split('\n').find((l) => new RegExp(`^\\s*${C}\\s`).test(l.replace(/\x1b\[[0-9;]*m/g, '')));
const N = ligne ? Number(ligne.replace(/\x1b\[[0-9;]*m/g, '').trim().split(/\s+/)[3]) : Math.round((Math.ceil(rep.total * 10) / 10) * FPS);
journal(`${N} images (${(N / FPS).toFixed(1)} s)`);

// ── 2. découpage : rouleaux 3D à part (WebGL logiciel, lent à monter), le reste en parts égales
const CORES = Math.max(2, os.cpus().length - 3); // 3 cœurs gardés libres : la machine reste utilisable et ne plante pas
const r3 = rep.rouleaux.filter((r) => String(r.modele ?? '').startsWith('3d'))
  .map((r) => [Math.max(0, Math.floor((r.debut - 1.5) * FPS)), Math.min(N - 1, Math.ceil((r.debut + r.duree + 3.5) * FPS))]);
const libres = []; let a0 = 0;
for (const [a, b] of r3) { if (a > a0) libres.push([a0, a - 1]); a0 = b + 1; }
if (a0 <= N - 1) libres.push([a0, N - 1]);
const PARTS = Math.max(1, Math.floor((CORES - (r3.length ? 6 : 0)) / 4));
const tot = libres.reduce((s, [a, b]) => s + b - a + 1, 0);
const morceaux = [];
// chaque intervalle reçoit des parts au prorata de sa longueur (pas de petit morceau résiduel)
for (const [a, b] of libres) for (let k = Math.max(1, Math.round(((b - a + 1) / tot) * PARTS)), cible = Math.ceil((b - a + 1) / k), x = a; x <= b; x += cible) morceaux.push({ a: x, b: Math.min(b, x + cible - 1), fils: Math.max(2, Math.floor((CORES - (r3.length ? 6 : 0)) / PARTS)), delai: 300000 });
for (const [a, b] of r3) morceaux.push({ a, b, fils: 6, delai: 900000, r3: true });
morceaux.sort((m, n) => m.a - n.a);
const nom = (m) => path.join(MORC, `m_${String(m.a).padStart(6, '0')}.mp4`);
journal(`découpage : ${morceaux.map((m) => `${m.a}-${m.b}${m.r3 ? ' (3D)' : ''} ×${m.fils}`).join(' | ')}`);
if (has('plan')) process.exit(0);

const rendre = (m, fichier = nom(m), plage = `${m.a}-${m.b}`) => new Promise((ok) => {
  const gl = m.gl ?? GL;
  const log = fs.openSync(fichier.replace(/\.mp4$/, '.log'), 'w');
  const p = spawn(npx, ['remotion', 'render', BUNDLE, C, fichier, `--frames=${plage}`, `--scale=${H / 1080}`, '--crf=10', '--x264-preset=veryfast', `--gl=${gl}`,
    '--image-format=png', '--color-space=bt709', '--pixel-format=yuv420p', `--concurrency=${m.fils}`, `--timeout=${m.delai}`, '--muted'], { cwd: REM, stdio: ['ignore', log, log], shell: true });
  p.on('close', (code) => ok(code === 0));
});

// ── essai : 2 s au début (+ 1 s au début du rouleau 3D), chronométré, format vérifié, rien d'assemblé
if (has('essai')) {
  const chrono = async (m, f, plage, nb) => { const t = Date.now(); const ok = await rendre(m, f, plage); const d = (Date.now() - t) / 1000; journal(`essai ${path.basename(f)} (gl ${m.gl ?? GL}) : ${ok ? 'ok' : 'ÉCHEC'} · ${images(f)} images en ${d.toFixed(0)} s (${(d / nb).toFixed(2)} s/image) · ${fluxVideo(f)}`); };
  await chrono({ fils: 8, delai: 900000 }, path.join(OUT, `essai_${GL}.mp4`), `600-${600 + 2 * FPS - 1}`, 2 * FPS);
  if (r3.length) await chrono({ fils: 6, delai: 900000 }, path.join(OUT, `essai_3d_${GL}.mp4`), `${r3[0][0] + 45}-${r3[0][0] + 74}`, FPS);
  process.exit(0);
}

// ── 3. rendu en parallèle, puis une reprise des morceaux en échec (moins de fils, délai doublé)
if (!has('assembler')) {
  journal(`rendu de ${morceaux.length} morceaux en parallèle (${CORES} cœurs)`);
  const t0 = Date.now();
  await Promise.all(morceaux.map(async (m, i) => { await new Promise((r) => setTimeout(r, 4000 * i)); m.ok = await rendre(m); }));
  for (const m of morceaux.filter((m) => !m.ok || images(nom(m)) !== m.b - m.a + 1)) {
    journal(`reprise du morceau ${m.a}-${m.b}`);
    m.fils = Math.max(2, Math.floor(m.fils / 2)); m.delai *= 2; m.gl = 'swangle'; m.ok = await rendre(m); // rendu logiciel : plus lent mais sûr
  }
  journal(`rendu terminé en ${Math.round((Date.now() - t0) / 60000)} min`);
}
const manquants = morceaux.filter((m) => !fs.existsSync(nom(m)) || images(nom(m)) !== m.b - m.a + 1);
if (manquants.length) { journal(`ÉCHEC : morceaux incomplets ${manquants.map((m) => `${m.a}-${m.b}`).join(', ')} (voir les .log)`); process.exit(1); }

// ── 4. son : voix + bruitages + musique (bande_son.py), ramené à −14 LUFS, pic ≤ −1 dBTP
const son = path.join(OUT, 'son.wav'), sonYT = path.join(OUT, 'son_yt.wav');
spawnSync(PY, [path.join(ICI, 'bande_son.py'), path.join(EP, 'episode.json'), son], { stdio: 'inherit' });
const I = Number((ff(['-i', son, '-af', 'ebur128', '-f', 'null', '-']).stderr.match(/I:\s+(-?[\d.]+) LUFS/g) ?? ['I: -14']).pop().match(/-?[\d.]+/)[0]);
ff(['-y', '-loglevel', 'error', '-i', son, '-af', `volume=${(-14 - I).toFixed(2)}dB,alimiter=limit=0.89:level=false`, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', sonYT]);
journal(`son : ${I} LUFS → gain ${(-14 - I).toFixed(2)} dB`);

// ── 5. assemblage : les morceaux sont quasi sans perte (crf 10, veryfast) ; un seul encodage final (crf choisi, slow),
//    qui convertit aussi en plage TV si les morceaux sont en pleine plage
fs.mkdirSync(path.join(EP, 'rendu'), { recursive: true });
const final = path.join(EP, 'rendu', `${P}_${H}p.mp4`), liste = path.join(OUT, 'liste.txt');
fs.writeFileSync(liste, morceaux.map((m) => `file '${nom(m).replace(/\\/g, '/')}'`).join('\n'));
const pleine = /yuvj|\(pc/.test(fluxVideo(nom(morceaux[0])));
const video = ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-vf', pleine ? 'scale=in_range=full:out_range=tv,format=yuv420p' : 'format=yuv420p'];
journal(`encodage final (crf ${CRF}, slow)${pleine ? ' avec conversion pleine plage → plage TV' : ''}`);
const asm = ff(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', liste, '-i', sonYT, '-map', '0:v', '-map', '1:a', ...video,
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-af', 'apad', '-frames:v', String(N), '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-shortest', final]);
if (asm.status !== 0) { journal(`ÉCHEC de l'assemblage : ${asm.stderr.slice(-400)}`); process.exit(1); }

// ── 6. contrôle : images, format, noirs, plans figés, silences, niveau ; planches toutes les 3 s pour la note
const an = ff(['-i', final, '-vf', 'blackdetect=d=0.3:pix_th=0.12,freezedetect=n=-55dB:d=1.5', '-af', 'silencedetect=n=-45dB:d=2,ebur128=peak=true', '-f', 'null', '-']).stderr;
const evts = an.split('\n').filter((l) => /black_start|freeze_start|freeze_duration|silence_start|silence_duration/.test(l)).map((l) => l.replace(/\[.*?\]\s*/, '').trim());
const niveau = an.slice(an.lastIndexOf('Integrated loudness')).split(/\s+/).join(' ').slice(0, 160);
const rapport = [`fichier : ${final}`, `images : ${images(final)} / ${N}`, `vidéo : ${fluxVideo(final)}`, `son : ${niveau}`, 'événements :', ...evts].join('\n');
fs.writeFileSync(path.join(OUT, 'rapport.txt'), rapport + '\n');
const PL = path.join(OUT, 'planches'); fs.rmSync(PL, { recursive: true, force: true }); fs.mkdirSync(PL);
ff(['-y', '-loglevel', 'error', '-i', final, '-vf', 'fps=1/3,scale=384:216,tile=5x3', path.join(PL, 'planche_%02d.png')]);
journal(`terminé :\n${rapport}`);
