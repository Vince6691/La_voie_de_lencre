import { Config } from '@remotion/cli/config';

// Three.js a besoin de WebGL : rendu logiciel (swangle) pour fonctionner aussi sans GPU.
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
