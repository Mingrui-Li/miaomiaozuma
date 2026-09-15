"""Build existing UI with a small engine configuration in a fresh, isolated project."""
from pathlib import Path
import argparse, hashlib, json, subprocess, sys

parser=argparse.ArgumentParser()
parser.add_argument('kind',choices=['flow','catalog'])
parser.add_argument('destination',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
dest=args.destination.resolve()
subprocess.run([sys.executable,str(root/f'tools/ui-{args.kind}/prepare-build.py'),str(dest)],check=True)
keep=['base','gfx-webgl','gfx-webgl2','2d','ui','mask','graphics','tween','custom-pipeline']
engine=json.loads((root/'settings/v2/packages/engine.json').read_text())
config=engine['modules']['configs']['defaultConfig']
config['name']='UI release review only'
for name,entry in config['cache'].items():
    entry['_value']=name in keep or name=='render-pipeline'
    if name=='render-pipeline':entry['_option']='custom-pipeline'
config['includeModules']=sorted(keep)
settings=dest/'settings/v2/packages';settings.mkdir(parents=True,exist_ok=True)
(settings/'engine.json').write_text(json.dumps(engine,indent=2)+'\n')
build=json.loads((dest/'build-config.json').read_text())
build.update(debug=False,outputName='ui08-'+args.kind)
(dest/'build-config.json').write_text(json.dumps(build,indent=2)+'\n')
manifest={'kind':args.kind,'releaseMode':True,'engineVersion':'3.8.8','includeModules':keep,
 'scope':'UI fixtures only, not a production gameplay or Douyin release',
 'sourceSHA':hashlib.sha256((root/'design/track-review/catalog.source.json').read_bytes()).hexdigest(),
 'inputs':{str(p.relative_to(dest)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (dest/'assets').rglob('*') if p.is_file()}}
(dest/'input-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared release review:',dest)
