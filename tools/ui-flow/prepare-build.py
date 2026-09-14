"""Create a fresh isolated Creator project; leave the user's open project untouched."""
from pathlib import Path
import json, shutil, sys
root=Path(__file__).resolve().parents[2]
dest=Path(sys.argv[1]).resolve()
if dest.exists():raise SystemExit('Use a new build directory; existing evidence is preserved')
dest.mkdir(parents=True)
for rel in ['assets/game/art/ui04','assets/game/scripts/ui','assets/game/prefabs/ui','assets/game/fonts','assets/ui-flow']:
    shutil.copytree(root/rel,dest/rel)
    meta=root/(rel+'.meta')
    if meta.exists():shutil.copy2(meta,dest/(rel+'.meta'))
for name in ['Fixtures.ts','Layout.ts']:
    for suffix in ['', '.meta']:
        rel='assets/ui-greybox/'+name+suffix;(dest/rel).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/rel,dest/rel)
package=json.loads((root/'package.json').read_text());package['uuid']='65cb8bfc-9f28-41ca-b821-d75793855006';package['name']='mmhw-ui06-preview';(dest/'package.json').write_text(json.dumps(package))
shutil.copy2(root/'tsconfig.json',dest/'tsconfig.json')
scene=json.loads((root/'design/ui/ui06/scene.json').read_text())['scene']
config={'platform':'web-mobile','debug':True,'startScene':scene,'scenes':[{'url':'db://assets/ui-flow/ui-flow.scene','uuid':scene}],'buildPath':str(dest/'build'),'outputName':'ui06'}
(dest/'build-config.json').write_text(json.dumps(config))
print(dest)
