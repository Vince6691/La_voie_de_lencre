// Windows avec Smart App Control : le module natif de Rspack (rspack.win32-x64-msvc.node, non signé) est bloqué, et
// @remotion/bundler le charge dès son import alors que le projet bundle avec Webpack (Rspack désactivé par défaut).
// Rend ces deux require paresseux : Rspack n'est chargé que si on le demande (--rspack). Lancé par « postinstall ».
import fs from 'node:fs';
import path from 'node:path';

const f = path.join(import.meta.dirname, 'node_modules/@remotion/bundler/dist/rspack-config.js');
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, 'utf8');
if (s.includes('// patch_rspack')) process.exit(0);
const avant = s;
s = s.replace(
  'const core_1 = require("@rspack/core");',
  '// patch_rspack : chargement paresseux\nlet __rspackCore; const core_1 = new Proxy({}, { get: (_, k) => (__rspackCore ??= require("@rspack/core"))[k] });',
);
s = s.replace(
  'const plugin_react_refresh_1 = __importDefault(require("@rspack/plugin-react-refresh"));',
  'const plugin_react_refresh_1 = { get default() { return __importDefault(require("@rspack/plugin-react-refresh")).default; } };',
);
if (s === avant) { console.warn('patch_rspack : motif introuvable (version de @remotion/bundler changée ?)'); process.exit(0); }
fs.writeFileSync(f, s);
console.log('patch_rspack : Rspack chargé à la demande');
