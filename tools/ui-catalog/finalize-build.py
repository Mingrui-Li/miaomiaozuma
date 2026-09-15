"""Finalize the isolated UI-07 web preview; keep engine diagnostics, hide stats HUD."""
import argparse
from pathlib import Path
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('build', type=Path)
args = parser.parse_args()
root = args.build.resolve()
repo = Path(__file__).resolve().parents[2]
app = root / 'application.js'
source = app.read_text()
if 'this.showFPS = true;' in source:
    source = source.replace('this.showFPS = true;', 'this.showFPS = false;', 1)
elif 'this.showFPS = false;' not in source:
    raise SystemExit('Unexpected application template; inspect before modifying')
app.write_text(source)
index = root / 'index.html'
html = index.read_text()
if '<link rel="icon" href="data:,">' not in html:
    html = html.replace('<head>', '<head>\n<link rel="icon" href="data:,">', 1)
index.write_text(html)
shutil.copy2(repo / 'assets/ui-catalog/OFL.txt', root / 'OFL.txt')
shutil.copy2(repo / 'assets/ui-catalog/NOTICE.txt', root / 'FONT-NOTICE.txt')
print('UI-07 preview finalized:', root)
