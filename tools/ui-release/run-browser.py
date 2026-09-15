"""Run existing actual-canvas regressions via installed Playwright CLI; keep old evidence."""
from pathlib import Path
import argparse,json,os,subprocess
parser=argparse.ArgumentParser()
parser.add_argument('kind',choices=['flow','catalog'])
parser.add_argument('mode',choices=['regression','performance','memory'])
parser.add_argument('--width',type=int,default=390)
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
out=root/'design/ui/ui08';out.mkdir(parents=True,exist_ok=True)
label=f'{args.kind}-{args.mode}'+(f'-{args.width}' if args.kind=='catalog' and args.mode=='regression' else '')
result=out/(label+'.json')
if result.exists():raise SystemExit('Refusing to replace earlier evidence: '+str(result))
if args.mode in ['performance','memory']:
    code=(root/f'tools/ui-release/browser-{args.mode}.js').read_text().replace("kind='FLOW'",f"kind='{args.kind.upper()}'").replace('62320','62330' if args.kind=='catalog' else '62320')
else:
    code=(root/f'tools/ui-{args.kind}/browser-check.js').read_text()
    code=code.replace('output/playwright/ui06/','output/playwright/ui08/flow/')
    code=code.replace("width=390,height=844,output='output/playwright/ui07/editor'",f"width={args.width},height={ {360:640,390:844,430:932}[args.width]},output='output/playwright/ui08/catalog'")
    code=code.replace("await page.reload();","await page.goto('http://127.0.0.1:"+('62320' if args.kind=='flow' else '62330')+"/');")
    code=code.replace("await page.waitForFunction(()=>window.__UI_FLOW__?.page==='home');","await page.waitForFunction(()=>window.__UI_FLOW__?.page==='home',null,{timeout:120000});")
screen=root/'output/playwright/ui08'/args.kind
if args.kind=='catalog':screen=screen/str(args.width)
screen.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();env['PATH']='/Users/limingrui/.nvm/versions/node/v22.22.0/bin:'+env['PATH']
cli=str(Path.home()/'.codex/skills/playwright/scripts/playwright_cli.sh')
run=subprocess.run([cli,'-s=mmhw-ui08','run-code',code],cwd=root,env=env,text=True,capture_output=True)
raw=out/(label+'.txt');raw.write_text(run.stdout+run.stderr)
if run.returncode or '### Result\n' not in run.stdout:raise SystemExit('Browser check failed; inspect '+str(raw))
body=run.stdout.split('### Result\n',1)[1].split('\n### ',1)[0].strip()
try:data=json.loads(body)
except json.JSONDecodeError:raise SystemExit('Missing JSON result: '+str(raw))
if not data.get('passed'):raise SystemExit('Check did not pass: '+str(raw))
result.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'result':str(result),'passed':data['passed'],'samples':data.get('samples'),'diagnostics':data.get('diagnostics')},ensure_ascii=False))
