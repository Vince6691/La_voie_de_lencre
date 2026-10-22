// Exporte la chronologie sonore du panel d'évolution (src/hall/events.ts) en JSON pour tools/build_hall_audio.py :
//   node exportHallEvents.mjs   (depuis outils/moteur/remotion/)  →  ../assets/hall/events.json
import { buildSync } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const here = import.meta.dirname, out = path.join(here, 'out', 'hall_events.cjs');
buildSync({ entryPoints: [path.join(here, 'src/hall/events.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'error' });
const { hallEvents } = createRequire(import.meta.url)(out);
const dest = path.join(here, '..', 'assets', 'hall', 'events.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
const data = hallEvents();
fs.writeFileSync(dest, JSON.stringify(data, null, 1));
console.log(`${data.events.length} événements → ${dest}`);
