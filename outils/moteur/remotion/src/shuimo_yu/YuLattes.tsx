// 語 : le livre de lattes du bloc 6 (le chapitre 言 du Shuowen, texte vérifié sur le 小學堂 le 31/10 : glyphes/shuowen/shuowen_yanbu.json ;
// sans ponctuation ni notes de formes anciennes ; 諾, 訴 retirés faute de glyphe dans la police sigillaire, 譜 absent du Shuowen)
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { LattesBambou3D, LattesTexte } from '../lattes/LattesBambou3D';

export const YU_LATTES: LattesTexte = {
  entrees: [
    '言直言曰言論難曰語从口䇂聲', '語論也从言吾聲', '詩志也从言寺聲', '謀慮難曰謀从言某聲', '議語也从言義聲', '論議也从言侖聲', '訊問也从言卂聲', '謂報也从言胃聲',
    '許聽也从言午聲', '誠信也从言成聲', '謹慎也从言堇聲', '請謁也从言青聲', '試用也从言式聲', '謙敬也从言兼聲', '訓說教也从言川聲',
    '記疏也从言己聲', '讀誦書也从言賣聲', '誦諷也从言甬聲', '訪汎謀曰訪从言方聲', '諷誦也从言風聲', '謝辤去也从言䠶聲', '訟爭也从言公聲',
    '設施陳也从言从殳', '誓約束也从言折聲', '詳審議也从言羊聲', '證告也从言登聲', '譽言不冉也从言與聲', '譯傳譯四夷之言者从言睪聲', '譬諭也从言辟聲',
  ],
  citee: [1, 8], // 直言曰言論難曰語
};
export const BAMBOU3D_SECONDS = 10;
export const Bambou3DDemo: React.FC = () => (
  <AbsoluteFill style={{ background: `#f3eee4 url(${staticFile('shuimo/paper.jpg')}) center/cover` }}>
    <LattesBambou3D texte={YU_LATTES} hlAt={8} ecrit={3.6} />
  </AbsoluteFill>
);
