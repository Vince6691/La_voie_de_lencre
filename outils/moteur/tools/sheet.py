import sys, glob
from PIL import Image, ImageDraw
files = sorted(glob.glob('out/preview/*.png'))
cols = 2; w, h = 960, 540
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), 'white')
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h))
    ImageDraw.Draw(im).text((10, 10), f.split('/')[-1], fill='yellow')
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(sys.argv[1] if len(sys.argv) > 1 else 'out/sheet.jpg', quality=85)
