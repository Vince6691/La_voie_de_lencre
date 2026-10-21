"""Rendu image par image de src/index.html avec Chromium (Playwright).

  python3 tools/render.py preview 1.0 5.2 ...   → PNG dans out/preview/
  python3 tools/render.py video [fps] [debut] [fin] → out/frames.mp4 (sans son)
"""
import base64, functools, http.server, os, subprocess, sys, threading, json
from playwright.sync_api import sync_playwright
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


def open_page(p):
    port = serve()
    b = p.chromium.launch(executable_path=CHROME, args=['--disable-gpu-vsync', '--force-color-profile=srgb', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])  # WebGL2 logiciel (pinceau p5.brush)
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/src/index.html')
    pg.evaluate('window.READY')
    return b, pg, errs


def grab(pg, t):
    data = pg.evaluate("(t) => { renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }", t)
    return base64.b64decode(data.split(',', 1)[1])


def main():
    mode = sys.argv[1]
    os.makedirs(f'{ROOT}/out/preview', exist_ok=True)
    with sync_playwright() as p:
        b, pg, errs = open_page(p)
        if mode == 'preview':
            for s in sys.argv[2:]:
                open(f'{ROOT}/out/preview/t{float(s):07.2f}.png', 'wb').write(grab(pg, float(s)))
        elif mode == 'cues':
            print(json.dumps(pg.evaluate('({cues: window.CUES, total: window.TIMELINE.total})')))
        else:
            fps = int(sys.argv[2]) if len(sys.argv) > 2 else 30
            total = pg.evaluate('window.TIMELINE.total')
            t0 = float(sys.argv[3]) if len(sys.argv) > 3 else 0
            t1 = float(sys.argv[4]) if len(sys.argv) > 4 else total
            out = sys.argv[5] if len(sys.argv) > 5 else f'{ROOT}/out/frames.mp4'
            enc = subprocess.Popen([FFMPEG, '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'png', '-i', '-',
                                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
            n = int(round((t1 - t0) * fps))
            for i in range(n):
                enc.stdin.write(grab(pg, t0 + i / fps))
                if i % 150 == 0:
                    print(f'{i}/{n}', flush=True)
            enc.stdin.close(); enc.wait()
        if errs:
            print('ERREURS JS:', *errs[:10], sep='\n', file=sys.stderr)
        b.close()


if __name__ == '__main__':
    main()
