"""Compare fixed-state Cocos screenshots to the prior verified local UI baselines."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[2];rows=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
groups=[('flow','output/playwright/ui06')]+[(f'catalog/{w}',f'output/playwright/ui07/build/{w}') for w in [360,390,430]]
for group,baseline in groups:
    files=sorted((root/'output/playwright/ui08'/group).glob('*.png'))
    assert len(files)==(26 if group=='flow' else 102)
    for p in files:
        old=root/baseline/p.name;assert old.is_file()
        a,b=sha(old),sha(p)
        rows.append({'baseline':str(old.relative_to(root)),'candidate':str(p.relative_to(root)),'baselineSHA':a,'candidateSHA':b,'identical':a==b})
result={'passed':all(r['identical'] for r in rows),'count':len(rows),'method':'exact PNG SHA-256 equality with prior local UI-06/07 screenshots; no image resizing or rebaselining','rows':rows}
(root/'design/ui/ui08/visual-comparison.json').write_text(json.dumps(result,indent=2)+'\n')
assert result['passed'],'Visual difference: inspect before accepting'
print('Exact baseline match:',len(rows),'screenshots')
