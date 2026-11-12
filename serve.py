"""只使用 Python 标准库启动已构建的本地教学网页。"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import webbrowser

root = Path(__file__).resolve().parent / "dist"
if not (root / "index.html").exists():
    raise SystemExit("Missing dist/index.html. Run npm install and npm run build first.")
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
for port in range(8765, 8776):
    try:
        server = ThreadingHTTPServer(("127.0.0.1", port), handler)
        break
    except OSError:
        if port == 8775:
            raise
url = f"http://127.0.0.1:{port}/"
print(f"Digestive Atlas Classroom\n{url}\nKeep this window open. Press Ctrl+C to stop.")
if "--no-open" not in sys.argv:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    server.server_close()
