// Images fixes d'une composition (un seul bundle, plusieurs instants) + planche contact.
// node images_fixes.mjs <Composition> <dossier_sortie> <échelle> t1 t2 t3 …   (temps en secondes)
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const ROOT = path.resolve(import.meta.dirname, '../../xue/remotion');
const req = createRequire(path.join(ROOT, 'package.json'));
const { bundle } = req('@remotion/bundler');
const { selectComposition, renderStill, openBrowser } = req('@remotion/renderer');
const [comp, out, scale, ...ts] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const HS = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browserExecutable = fs.existsSync(HS) ? HS : null;
const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts') });
const browser = await openBrowser('chrome', { browserExecutable });
const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser, browserExecutable });
for (const t of ts) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(parseFloat(t) * composition.fps));
  const f = path.join(out, `${comp}_${String(t).padStart(6, '0')}.jpg`);
  await renderStill({ composition, serveUrl, frame, output: f, scale: parseFloat(scale), imageFormat: 'jpeg', jpegQuality: 80, puppeteerInstance: browser, browserExecutable, timeoutInMilliseconds: 120000 });
  console.log(f);
}
await browser.close({ silent: true });
