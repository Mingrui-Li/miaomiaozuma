"""Validate UI-08 design-stage evidence; game release is assessed in later development."""
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

def stage_result(errors):
    return {'uiStagePassed':not errors,'localUiBatchPassed':not errors,
      'status':'UI_STAGE_COMPLETE' if not errors else 'UI_STAGE_CHECK_FAILED',
      'gameReleaseAssessment':'DEFERRED_TO_CODE_DEVELOPMENT',
      'errors':errors,'laterDevelopmentWork':[
        'Bind the UI to canonical 100-level gameplay and implement the confirmed D024 rules.',
        'Integrate production save/reward transactions and Douyin ads, recording, sharing and lifecycle.',
        'Complete production art and Android device acceptance.',
        'Assess platform packages, startup, memory and frame rate with the finished game.'
      ],'note':'D025: later code-development tasks do not block UI-08 design-stage completion. Game release is not assessed here.'}

def verify(root):
    folder=root/'design/ui/ui08';errors=[]
    try:manifest=json.loads((folder/'evidence.json').read_text())
    except (OSError,ValueError) as e:return stage_result([str(e)])
    errors.extend(hash_errors(root,manifest.get('files',[])))
    indexed={f.get('path') for f in manifest.get('files',[])}
    visual='design/ui/ui08/visual-comparison.json'
    if visual not in indexed:errors.append('unhashed visual comparison')
    else:
        try:
            comparison=json.loads((root/visual).read_text())
            if comparison.get('passed') is not True or comparison.get('count')!=332 or len(comparison.get('rows',[]))!=332:errors.append('incomplete or failed visual baseline comparison')
            for row in comparison.get('rows',[]):
                errors.extend(hash_errors(root,[{'path':row['baseline'],'sha256':row['baselineSHA']},{'path':row['candidate'],'sha256':row['candidateSHA']}]))
                if row['baselineSHA']!=row['candidateSHA']:errors.append('visual mismatch: '+row['candidate'])
        except (OSError,ValueError,KeyError) as e:errors.append(str(e))
    browser=['flow-regression','flow-performance','flow-memory','catalog-regression-360','catalog-regression-390','catalog-regression-430','catalog-performance','catalog-memory']
    for name in browser:
        rel='design/ui/ui08/'+name+'.json'
        if rel not in indexed:errors.append('unhashed required report: '+rel);continue
        try:
            data=json.loads((root/rel).read_text())
            if data.get('passed') is not True or data.get('diagnostics')!=[]:errors.append('failed browser check: '+name)
            if name.startswith('catalog-regression') and (data.get('samples')!=300 or {(r.get('level'),r.get('phase')) for r in data.get('rows',[])}!={(level,phase) for level in range(1,101) for phase in range(3)}):errors.append('incomplete catalog coverage: '+name)
            if name=='flow-regression' and (len(data.get('chapters',[]))!=10 or len(data.get('sizes',[]))!=3):errors.append('incomplete flow coverage')
            if name.endswith('performance') and (len(data.get('launches',[]))!=3 or data.get('nodePlateau') is not True or len(data.get('nodeCycles',[]))!=40):errors.append('incomplete performance sample: '+name)
            if name.endswith('memory') and (data.get('nodesStable') is not True or [s.get('cycles') for s in data.get('samples',[])]!=[0,40,80,120]):errors.append('incomplete post-GC diagnostic: '+name)
        except (OSError,ValueError) as e:errors.append(str(e))
    for kind in ['flow','catalog']:
        rel=f'design/ui/ui08/{kind}-package.json'
        if rel not in indexed:errors.append('unhashed required package report: '+rel);continue
        try:
            data=json.loads((root/rel).read_text());candidate=data['candidate']
            errors.extend(hash_errors(root/Path(candidate['path']),candidate['files']))
            if data.get('engineDebug') is not False or data.get('unexpectedPhysicsOrSkeletonFiles')!=[] or data.get('savedBytes',0)<=0:errors.append('package optimization failed: '+kind)
            trace=f'design/ui/ui08/{kind}-assets.json'
            if trace not in indexed:errors.append('unhashed asset trace: '+trace)
            else:
                assets=json.loads((root/trace).read_text())
                if assets.get('passed') is not True or len(assets.get('assets',[]))!=13 or len(assets.get('licenses',[]))!=2:errors.append('incomplete asset/font trace: '+kind)
            inputs=f'design/ui/ui08/{kind}-inputs.json'
            if inputs not in indexed:errors.append('unhashed build input manifest: '+inputs);continue
            spec=json.loads((root/inputs).read_text())
            errors.extend(hash_errors(root,[{'path':p,'sha256':h} for p,h in spec['inputs'].items()]))
            source=root/'design/track-review/catalog.source.json'
            if hashlib.sha256(source.read_bytes()).hexdigest()!=spec['sourceSHA']:errors.append('canonical geometry changed')
        except (OSError,ValueError,KeyError) as e:errors.append(str(e))
    return stage_result(errors)

if __name__=='__main__':
    root=Path(__file__).resolve().parents[2];result=verify(root)
    (root/'design/ui/ui08/readiness.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    # The default checks UI-08; legacy --local-only remains equivalent.
    sys.exit(0 if result['uiStagePassed'] else 1)
