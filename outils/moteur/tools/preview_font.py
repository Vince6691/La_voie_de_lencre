import json,re,sys
from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
data=json.loads(open('src/fontglyphs.js').read().split('=',1)[1].rstrip(';\n'))
# rasterise via svg path -> use cairosvg-free approach: draw polygons by flattening
def flatten(d):
    toks=re.findall(r'[MLQCZ]|-?\d+\.?\d*',d); pts=[];polys=[];i=0;cur=None
    while i<len(toks):
        t=toks[i];i+=1
        if t=='M': cur=(float(toks[i]),float(toks[i+1]));i+=2;pts=[cur]
        elif t=='L': cur=(float(toks[i]),float(toks[i+1]));i+=2;pts.append(cur)
        elif t=='Q':
            c=(float(toks[i]),float(toks[i+1]));e=(float(toks[i+2]),float(toks[i+3]));i+=4
            for k in range(1,9):
                u=k/8;pts.append(((1-u)**2*cur[0]+2*(1-u)*u*c[0]+u*u*e[0],(1-u)**2*cur[1]+2*(1-u)*u*c[1]+u*u*e[1]))
            cur=e
        elif t=='C':
            a=(float(toks[i]),float(toks[i+1]));b=(float(toks[i+2]),float(toks[i+3]));e=(float(toks[i+4]),float(toks[i+5]));i+=6
            for k in range(1,11):
                u=k/10;pts.append(tuple((1-u)**3*p0+3*(1-u)**2*u*p1+3*(1-u)*u*u*p2+u**3*p3 for p0,p1,p2,p3 in zip(cur,a,b,e)))
            cur=e
        elif t=='Z': polys.append(pts);pts=[]
    return polys
for k,v in data.items():
    im=Image.new('L',(1000,1000),255);dr=ImageDraw.Draw(im)
    # even-odd via xor compositing
    import numpy as np
    acc=np.zeros((1000,1000),bool)
    for c in v:
        for p in flatten(c['d']):
            m=Image.new('1',(1000,1000),0);ImageDraw.Draw(m).polygon(p,fill=1);acc^=np.array(m)
    im=Image.fromarray(np.where(acc,0,255).astype('uint8')).convert('RGB');dr=ImageDraw.Draw(im)
    for g in range(0,1000,50): dr.line([(g,0),(g,1000)],fill=(255,180,180) if g%100 else (255,0,0));dr.line([(0,g),(1000,g)],fill=(180,180,255) if g%100 else (0,0,255))
    im.save(f'/tmp/claude-0/-home-user-La-voie-de-lencre/2777d897-a610-5b2e-9519-2f93c717e5f0/scratchpad/{k}.png')
