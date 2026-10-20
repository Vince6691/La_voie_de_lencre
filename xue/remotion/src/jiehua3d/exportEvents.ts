// Exporte la chronologie de JiehuaCanevas pour le mixage de la bande son (tools/build_jiehua_audio.py) :
// npx esbuild src/jiehua3d/exportEvents.ts --bundle --platform=node --log-level=error --external:react --external:remotion
//   --external:@remotion/three --external:@react-three/fiber --external:three | node
import fs from 'node:fs';
import { canevasEvents } from './JiehuaCanevas';

const out = new URL('../../../assets/jiehua/events.json', `file://${process.cwd()}/src/jiehua3d/`);
fs.writeFileSync(out, JSON.stringify(canevasEvents('song')));
console.log('events.json');
