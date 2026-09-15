"""Freeze this batch's build inputs, reports, screenshots and protected-source comparison."""
from pathlib import Path
import argparse,datetime,hashlib,json,shutil
parser=argparse.ArgumentParser();parser.add_argument('flow',type=Path);parser.add_argument('catalog',type=Path);parser.add_argument('snapshot',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parents[2];out=root/'design/ui/ui08';out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for kind,project in [('flow',args.flow),('catalog',args.catalog)]:
    for source,name in [('input-manifest.json',kind+'-inputs.json'),('build-config.json',kind+'-build-config.json'),('settings/v2/packages/engine.json',kind+'-engine-config.json'),('cli.log',kind+'-build-log.txt')]:
        shutil.copy2(project/source,out/name)
    manifest=json.loads((project/'input-manifest.json').read_text())
    for name,h in manifest['inputs'].items():
        assert sha(root/name)==h and sha(project/name)==h,'Build/source drift: '+name
snapshot=json.loads(args.snapshot.read_text())
# The initial snapshot is a simple {relativePath: sha256} mapping.
changed=[p for p,h in snapshot.items() if not (root/p).is_file() or sha(root/p)!=h]
assert not changed,changed
(out/'protected-source.json').write_text(json.dumps({'passed':True,'checkedFiles':len(snapshot),'changed':changed,'sourceSHA':sha(root/'design/track-review/catalog.source.json'),'note':'All pre-existing assets/settings/profiles and canonical geometry from the UI-08 start snapshot; docs are intentionally edited.'},indent=2)+'\n')
paths=set()
for p in out.rglob('*'):
    if p.is_file() and p.suffix!='.log' and p.name not in ['evidence.json','readiness.json']:paths.add(p)
for folder in ['tools/ui-release','output/playwright/ui08']:
    for p in (root/folder).rglob('*'):
        if p.is_file() and '__pycache__' not in p.parts:paths.add(p)
for name in ['assets/game/configs/Levels.ts','assets/game/scripts/core/GameSession.ts','assets/game/scripts/app/GameRoot.ts','assets/game/scripts/services/SaveService.ts','assets/game/scripts/platform/DouyinPlatformAdapter.ts']:
    paths.add(root/name)
records=[{'path':str(p.relative_to(root)),'sha256':sha(p)} for p in sorted(paths)]
(out/'evidence.json').write_text(json.dumps({'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'UI-08 local release preparation; no full-game release approval','files':records},ensure_ascii=False,indent=2)+'\n')
print('Recorded',len(records),'evidence files; protected',len(snapshot),'original files')
