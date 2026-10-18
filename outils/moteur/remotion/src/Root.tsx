import React from 'react';
import { Composition } from 'remotion';
import { VIDEO_REVEAL_DEMO3_SECONDS, VideoRevealDemo3, VIDEO_REVEAL_DEMO2_SECONDS, VIDEO_REVEAL_DEMO_SECONDS, VideoRevealDemo, VideoRevealDemo2 } from './video_encre/VideoRevealDemo';
import { XUE_V2_SECONDS, XueV2 } from './shuimo_v2/XueV2';
import { JIAO_SECONDS, JiaoV1 } from './shuimo_jiao/JiaoV1';
import { TIYING_SECONDS, TiyingReveal } from './shuimo_wen/TiyingReveal';
import { WEN_SECONDS, WenV1 } from './shuimo_wen/WenV1';
import { MEI_SECONDS, MeiV1 } from './shuimo_mei/MeiV1';
import { YU_SECONDS, YuV1 } from './shuimo_yu/YuV1';
import { INTRO_SECONDS, YuIntroEncre, YuIntroLaque, YuIntroOmbres } from './shuimo_yu/IntroTests';
import { CARTES_GUIDES, CartesGuides } from './cartes/CartesGuides';
import { EssaiPekin3D, PEKIN3D_SECONDS } from './cartes/Pekin3D';
import { EssaiPekinPlat, PEKINPLAT_SECONDS } from './cartes/PekinPlat';
import { EssaiTravelling, TRAVELLING_SECONDS } from './cartes/TravellingSommets';
import { EssaiTravellingSoie, SOIE_SECONDS } from './cartes/TravellingSoie';
import { EssaiTravellingFleur, FLEUR_SECONDS } from './cartes/TravellingFleur';
import { AGES_SECONDS, EssaiCarteAges } from './cartes/CarteAges';
import { VIDEO_ENCRE_DEMO_SECONDS, VideoEncreDemo } from './video_encre/VideoEncreDemo';
import { Xue, XueProps } from './Xue';
import timeline from './data/timeline.json';
import { SHUIMO_DEMO_SECONDS, ShuimoDemo, ShuimoDemoProps } from './shuimo/ShuimoDemo';
import { MorphEncre, MorphProps } from './morph/MorphEncre';
import { SHUIMO_XUE_SECONDS, ShuimoXue } from './shuimo_xue/ShuimoXue';
import { ROULEAU_DEMO_SECONDS, RouleauDemo } from './rouleau/RouleauDemo';
import { ROULEAU3D_COURT_DEMO_SECONDS, ROULEAU3D_DEMO_SECONDS, Rouleau3DCourtDemo, Rouleau3DDemo } from './rouleau3d/Rouleau3DDemo';
import { MOSAIQUE_DEMO_SECONDS, MosaiqueDemo } from './mosaique/MosaiqueDemo';

export const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="Xue"
    component={Xue}
    durationInFrames={Math.ceil(timeline.total * FPS)}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ three: true, captions: false, inkTransitions: true } satisfies XueProps}
  />
  {/* fond shuimo (banque d'éléments assets/shuimo) : démo de 30 s, quatre plans ; nuages du ciel ; brouillard et coups de pinceau en option */}
  <Composition id="ShuimoDemo" component={ShuimoDemo} durationInFrames={Math.round(SHUIMO_DEMO_SECONDS * FPS)} fps={FPS} width={1920} height={1080}
    defaultProps={{ clouds: true, mist: false, strokes: false } satisfies ShuimoDemoProps} />
  {/* fondus encre ↔ 3D (assets/morph, tools/build_morph.py) : essais en 720p, 8 s */}
  <Composition id="MorphPaysage" component={MorphEncre} durationInFrames={8 * FPS} fps={FPS} width={1280} height={720}
    defaultProps={{ name: 'paysage', dir: 'to3d', focus: [0.64, 0.36], end: 0.62 } satisfies MorphProps} />
  <Composition id="MorphVieilHomme" component={MorphEncre} durationInFrames={8 * FPS} fps={FPS} width={1280} height={720}
    defaultProps={{ name: 'vieil_homme', dir: 'toInk', focus: [0.67, 0.52], end: 0.27 } satisfies MorphProps} />
  <Composition id="MorphVieilHommeDelave" component={MorphEncre} durationInFrames={8 * FPS} fps={FPS} width={1280} height={720}
    defaultProps={{ name: 'vieil_homme', dir: 'fade', focus: [0.67, 0.45], end: 1 } satisfies MorphProps} />
  {/* essai « tout shuimo » : scènes Shang et Zhou du 學 sur papier, voix existante */}
  <Composition id="ShuimoXue" component={ShuimoXue} durationInFrames={Math.round(SHUIMO_XUE_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  {/* rouleau du temps seul (src/rouleau) : 周 → 秦, curseur par défaut */}
  <Composition id="VideoEncreDemo" component={VideoEncreDemo} durationInFrames={VIDEO_ENCRE_DEMO_SECONDS * FPS} fps={FPS} width={1920} height={1080} />
 <Composition id="JiaoV1" component={JiaoV1} durationInFrames={Math.round(JIAO_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="MeiV1" component={MeiV1} durationInFrames={Math.round(MEI_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="YuV1" component={YuV1} durationInFrames={Math.round(YU_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="YuIntroEncre" component={YuIntroEncre} durationInFrames={Math.round(INTRO_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="YuIntroOmbres" component={YuIntroOmbres} durationInFrames={Math.round(INTRO_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="EssaiPekin3D" component={EssaiPekin3D} durationInFrames={Math.round(PEKIN3D_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="EssaiPekinPlat" component={EssaiPekinPlat} durationInFrames={Math.round(PEKINPLAT_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="EssaiTravelling" component={EssaiTravelling} durationInFrames={Math.round(TRAVELLING_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="EssaiTravellingSoie" component={EssaiTravellingSoie} durationInFrames={Math.round(SOIE_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="EssaiTravellingFleur" component={EssaiTravellingFleur} durationInFrames={Math.round(FLEUR_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="EssaiCarteAges" component={EssaiCarteAges} durationInFrames={Math.round(AGES_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="CartesGuides" component={CartesGuides} durationInFrames={CARTES_GUIDES} fps={FPS} width={1920} height={1080} />
  <Composition id="YuIntroLaque" component={YuIntroLaque} durationInFrames={Math.round(INTRO_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="WenV1" component={WenV1} durationInFrames={Math.round(WEN_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="WenTiying" component={TiyingReveal} durationInFrames={Math.round(TIYING_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="XueV2" component={XueV2} durationInFrames={Math.round(XUE_V2_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="VideoRevealDemo" component={VideoRevealDemo} durationInFrames={VIDEO_REVEAL_DEMO_SECONDS * FPS} fps={FPS} width={1920} height={1080} />
  <Composition id="VideoRevealDemo2" component={VideoRevealDemo2} durationInFrames={VIDEO_REVEAL_DEMO2_SECONDS * FPS} fps={FPS} width={1920} height={1080} />
  <Composition id="VideoRevealDemo3" component={VideoRevealDemo3} durationInFrames={VIDEO_REVEAL_DEMO3_SECONDS * FPS} fps={FPS} width={1920} height={1080} />
  <Composition id="RouleauDemo" component={RouleauDemo} durationInFrames={ROULEAU_DEMO_SECONDS * FPS} fps={FPS} width={1920} height={1080} />
  <Composition id="Rouleau3DDemo" component={Rouleau3DDemo} durationInFrames={Math.round(ROULEAU3D_DEMO_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="Rouleau3DCourtDemo" component={Rouleau3DCourtDemo} durationInFrames={Math.round(ROULEAU3D_COURT_DEMO_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  <Composition id="MosaiqueDemo" component={MosaiqueDemo} durationInFrames={Math.round(MOSAIQUE_DEMO_SECONDS * FPS)} fps={FPS} width={1920} height={1080} />
  </>
);
