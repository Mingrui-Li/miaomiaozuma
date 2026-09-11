"""Read asset contracts and emit small-size/edge QA sheets, not an aesthetic approval."""
from pathlib import Path
import hashlib, json, math
from PIL import Image, ImageDraw, ImageOps
root=Path(__file__).resolve().parents[2]
manifest=json.loads((root/'design/ui/ui04/assets.json').read_text())
assets=manifest['assets']; assert len(assets)==12
sheet=Image.new('RGB',(960,760),'#FFF5E6');draw=ImageDraw.Draw(sheet)
stats=[]
for record in assets:
    export=root/record['export']; imported=root/record['imported']
    assert export.read_bytes()==imported.read_bytes()
    assert hashlib.sha256(export.read_bytes()).hexdigest()==record['sha256']
    im=Image.open(export); assert im.mode=='RGBA' and list(im.size)==record['size']
    a=im.getchannel('A');assert a.getextrema()==(0,255)
    assert all(a.getpixel((x,y))==0 for x in range(im.width) for y in [0,im.height-1])
    assert all(a.getpixel((x,y))==0 for x in [0,im.width-1] for y in range(im.height))
    if record['id'].startswith('cat_'):
        radius=max(math.hypot(x-127.5,y-127.5) for y in range(256) for x in range(256) if a.getpixel((x,y)))
        assert radius<=128, (record['id'],radius)
        stats.append({'id':record['id'],'maxVisibleRadius':radius,'alphaBounds':a.getbbox()})
        index=len(stats)-1;x=30+index*185
        draw.text((x,12),record['id'][4:],fill='#4A332B')
        large=im.resize((160,160),Image.Resampling.LANCZOS);sheet.paste(large,(x,35),large)
        for j,size in enumerate([64,56,48]):
            small=im.resize((size,size),Image.Resampling.LANCZOS);sheet.paste(small,(x,230+j*100),small)
            gray=ImageOps.grayscale(small).convert('RGBA');gray.putalpha(small.getchannel('A'));sheet.paste(gray,(x+80,230+j*100),gray)
        dark=Image.new('RGB',(165,180),'#243343');dark.paste(large,(2,10),large);sheet.paste(dark,(x,545))
    elif record['insets'][0]:
        inset=record['insets'][0]
        # Stretchable center columns/rows match; gradients must not introduce seams.
        assert im.crop((inset,0,inset+1,im.height)).tobytes()==im.crop((im.width-inset-1,0,im.width-inset,im.height)).tobytes()
        assert im.crop((0,inset,im.width,inset+1)).tobytes()==im.crop((0,im.height-inset-1,im.width,im.height-inset)).tobytes()
(root/'art/qa/ui04').mkdir(parents=True,exist_ok=True)
sheet.save(root/'art/qa/ui04/cats_sizes.png')
result={'passed':True,'pngCount':len(assets),'pngBytes':sum(x['bytes'] for x in assets),'cats':stats,
        'checks':['identical export/import/hash','RGBA and transparent borders','cat silhouette inside unchanged radius','nine-slice center continuity'],
        'notChecked':['owner aesthetic approval','animated recognition','real phone','full build package size']}
(root/'art/qa/ui04/checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result))
