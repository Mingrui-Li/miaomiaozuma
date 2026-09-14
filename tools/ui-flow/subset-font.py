"""Build the licensed, renamed UI-06 font from the preserved upstream file."""
from pathlib import Path
import base64, hashlib, json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

root=Path(__file__).resolve().parents[2]
source=root/'art/source/ui05/NotoSansSC-VF.ttf'
license_path=root/'art/source/ui05/OFL.txt'
if not license_path.exists():
    response=json.loads(Path('/private/tmp/mmhw-font-license.json').read_text())
    license_path.write_bytes(base64.b64decode(response['content']))
assert 'SIL OPEN FONT LICENSE Version 1.1' in license_path.read_text()
font=TTFont(source)
version=font['name'].getDebugName(5)
font=instantiateVariableFont(font,{'wght':500},inplace=True)
corpus=''.join(p.read_text() for folder in ['assets/ui-flow','assets/ui-preview','assets/game/scripts/ui','assets/game/prefabs/ui'] for p in (root/folder).rglob('*') if p.suffix in ['.ts','.prefab'])
corpus+=''.join(chr(i) for i in range(32,127))+'Ⅱ…×：'
chars=set(corpus)-set('\n\r\t')
cmap=font.getBestCmap()
missing=sorted(c for c in chars if ord(c) not in cmap)
assert not missing,missing
options=subset.Options();options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.recalc_timestamp=False
subsetter=subset.Subsetter(options=options);subsetter.populate(text=''.join(sorted(chars)));subsetter.subset(font)
for record in font['name'].names:
    names={1:'MMHW UI Flow',2:'Regular',3:'MMHWUIFlow-UI06',4:'MMHW UI Flow',6:'MMHWUIFlow-Regular',16:'MMHW UI Flow',17:'Regular'}
    if record.nameID in names:record.string=names[record.nameID].encode(record.getEncoding())
dest=root/'assets/ui-flow/mmhw_ui_flow.ttf';dest.parent.mkdir(parents=True,exist_ok=True);font.save(dest)
loaded=TTFont(dest);assert all(ord(c) in loaded.getBestCmap() for c in chars)
(dest.parent/'OFL.txt').write_bytes(license_path.read_bytes())
report={'source':'https://github.com/notofonts/noto-cjk/blob/main/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf','license':'SIL OFL 1.1','version':version,'weight':500,'family':'MMHW UI Flow','sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'subsetSHA256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'characters':''.join(sorted(chars)),'missing':[],'scope':'UI-06 corpus only; regenerate coverage for later UI text'}
(root/'design/ui/ui06/font.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='characters'},ensure_ascii=False))
