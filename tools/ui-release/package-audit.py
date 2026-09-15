"""Measure actual files; never equate gzip transfer estimates to platform package accounting."""
from pathlib import Path
import argparse,gzip,hashlib,json

def measure(folder):
    result={'path':str(folder),'bytes':0,'gzipEstimateBytes':0,'files':[],'categories':{}}
    for p in sorted(folder.rglob('*')):
        if not p.is_file():continue
        if p.is_symlink():raise ValueError('Unexpected symlink: '+str(p))
        raw=p.read_bytes();relative=str(p.relative_to(folder));size=len(raw)
        category='engine' if relative.startswith('cocos-js/') else 'game-assets' if relative.startswith('assets/') else 'bootstrap'
        result['bytes']+=size;result['gzipEstimateBytes']+=len(gzip.compress(raw,mtime=0))
        result['categories'][category]=result['categories'].get(category,0)+size
        result['files'].append({'path':relative,'bytes':size,'sha256':hashlib.sha256(raw).hexdigest()})
    result['fileCount']=len(result['files'])
    result['largest']=sorted(result['files'],key=lambda x:x['bytes'],reverse=True)[:8]
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('baseline',type=Path);parser.add_argument('candidate',type=Path);parser.add_argument('output',type=Path);args=parser.parse_args()
    old,new=measure(args.baseline),measure(args.candidate)
    assert old['fileCount'] and new['fileCount']
    settings=json.loads((args.candidate/'src/settings.json').read_text())
    forbidden=[x['path'] for x in new['files'] if any(k in x['path'].lower() for k in ['bullet','spine','physx','box2d','dragonbone'])]
    result={'baseline':old,'candidate':new,'savedBytes':old['bytes']-new['bytes'],'reductionPercent':round(100*(1-new['bytes']/old['bytes']),2),
      'engineDebug':settings['engine']['debug'],'unexpectedPhysicsOrSkeletonFiles':forbidden,
      'platformPackagePass':None,'note':'web-mobile physical bytes; gzip is transfer estimate only, not Douyin IDE package measurement'}
    assert result['engineDebug'] is False and not forbidden,result
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ['savedBytes','reductionPercent','engineDebug','unexpectedPhysicsOrSkeletonFiles']}))
