"""Check native textures/fonts survived the release build byte-for-byte, with licenses."""
from pathlib import Path
import argparse,hashlib,json,struct
parser=argparse.ArgumentParser();parser.add_argument('kind',choices=['flow','catalog']);parser.add_argument('build',type=Path);parser.add_argument('output',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
index={}
for p in args.build.rglob('*'):
    if p.is_file():index.setdefault(sha(p),[]).append(str(p.relative_to(args.build)))
files=sorted((root/'assets/game/art/ui04').glob('*.png'))
files+=sorted((root/f'assets/ui-{args.kind}').rglob('*.ttf'))
rows=[]
for p in files:
    raw=p.read_bytes();h=sha(p);row={'source':str(p.relative_to(root)),'bytes':len(raw),'sha256':h,'buildPaths':index.get(h,[])}
    assert row['buildPaths'],'Missing or changed native asset: '+str(p)
    if p.suffix=='.png':
        assert raw[:8]==b'\x89PNG\r\n\x1a\n'
        width,height,depth,color=struct.unpack('>IIBB',raw[16:26]);row.update(width=width,height=height,bitDepth=depth,colorType=color,rgba8BaseBytes=width*height*4)
        assert color==6 and depth==8,'Unexpected alpha texture'
    rows.append(row)
assert len([r for r in rows if r['source'].endswith('.png')])==12
licenses=[]
for source,target in [('OFL.txt','OFL.txt'),('NOTICE.txt','FONT-NOTICE.txt')]:
    original=root/f'assets/ui-{args.kind}'/source;copied=args.build/target
    assert copied.is_file() and sha(original)==sha(copied)
    licenses.append({'source':str(original.relative_to(root)),'build':target,'sha256':sha(copied)})
result={'passed':True,'kind':args.kind,'assets':rows,'licenses':licenses,'textureRGBA8BaseBytes':sum(r.get('rgba8BaseBytes',0) for r in rows),'note':'12 source textures plus scene font, exact native hashes; RGBA estimate excludes mipmaps/atlases/labels/engine/GPU overhead and is not measured device memory'}
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':True,'assets':len(rows),'textureRGBA8BaseBytes':result['textureRGBA8BaseBytes']}))
