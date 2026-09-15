"""Validate UI-08 evidence integrity. UI fixture checks cannot grant game release approval."""
from pathlib import Path
import hashlib,json,sys

def hash_errors(root,records):
    errors=[];seen=set()
    if not records:return ['empty evidence manifest']
    for record in records:
        name=record.get('path','');p=(root/name).resolve()
        if not name or name in seen:errors.append('empty/duplicate path: '+name);continue
        seen.add(name)
        if not p.is_file():errors.append('missing: '+name)
        elif hashlib.sha256(p.read_bytes()).hexdigest()!=record.get('sha256'):errors.append('changed: '+name)
    return errors

def verify(root):
    folder=root/'design/ui/ui08';errors=[]
    try:manifest=json.loads((folder/'evidence.json').read_text())
    except (OSError,ValueError) as e:return {'localUiBatchPassed':False,'releaseReady':False,'errors':[str(e)]}
    errors.extend(hash_errors(root,manifest.get('files',[])))
    indexed={f.get('path') for f in manifest.get('files',[])}
    browser=['flow-regression','flow-performance','catalog-regression-360','catalog-regression-390','catalog-regression-430','catalog-performance']
    for name in browser:
        rel='design/ui/ui08/'+name+'.json'
        if rel not in indexed:errors.append('unhashed required report: '+rel);continue
        try:
            data=json.loads((root/rel).read_text())
            if data.get('passed') is not True or data.get('diagnostics')!=[]:errors.append('failed browser check: '+name)
            if name.startswith('catalog-regression') and data.get('samples')!=300:errors.append('incomplete catalog coverage: '+name)
            if name=='flow-regression' and (len(data.get('chapters',[]))!=10 or len(data.get('sizes',[]))!=3):errors.append('incomplete flow coverage')
            if name.endswith('performance') and (len(data.get('launches',[]))!=3 or data.get('nodePlateau') is not True or len(data.get('nodeCycles',[]))!=40):errors.append('incomplete performance sample: '+name)
        except (OSError,ValueError) as e:errors.append(str(e))
    for kind in ['flow','catalog']:
        rel=f'design/ui/ui08/{kind}-package.json'
        if rel not in indexed:errors.append('unhashed required package report: '+rel);continue
        try:
            data=json.loads((root/rel).read_text());candidate=data['candidate']
            errors.extend(hash_errors(Path(candidate['path']),candidate['files']))
            if data.get('engineDebug') is not False or data.get('unexpectedPhysicsOrSkeletonFiles')!=[] or data.get('savedBytes',0)<=0:errors.append('package optimization failed: '+kind)
            inputs=f'design/ui/ui08/{kind}-inputs.json'
            if inputs not in indexed:errors.append('unhashed build input manifest: '+inputs);continue
            spec=json.loads((root/inputs).read_text())
            errors.extend(hash_errors(root,[{'path':p,'sha256':h} for p,h in spec['inputs'].items()]))
            source=root/'design/track-review/catalog.source.json'
            if hashlib.sha256(source.read_bytes()).hexdigest()!=spec['sourceSHA']:errors.append('canonical geometry changed')
        except (OSError,ValueError,KeyError) as e:errors.append(str(e))
    return {'localUiBatchPassed':not errors,'releaseReady':False,'status':'UI_ONLY_NOT_RELEASE_READY',
      'errors':errors,'releaseBlockers':[
        'Production runtime uses old 24-level data and has not bound the UI scenes to the canonical 100-level gameplay.',
        'Core R01-R08, D024 rule implementation and dynamic gameplay acceptance are outstanding.',
        'Save transactions/reward idempotency and real Douyin ad/record/share/lifecycle integration lack acceptance evidence.',
        'Final facilities/obstacle animation/collection/cosmetics art and Android/Douyin device acceptance are outstanding.',
        'web-mobile byte counts and static desktop samples do not validate Douyin packages or dynamic device performance.'
      ],'note':'This gate verifies this local UI batch only; release approval requires new production-specific evidence and review.'}

if __name__=='__main__':
    root=Path(__file__).resolve().parents[2];result=verify(root)
    (root/'design/ui/ui08/readiness.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    # Full release is intentionally blocked; --local-only checks just evidence integrity.
    sys.exit(0 if '--local-only' in sys.argv and result['localUiBatchPassed'] else 1)
