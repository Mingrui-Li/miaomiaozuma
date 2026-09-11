"""UI-04 deterministic source/export/import pipeline. Local edits authorized by D016.
Run after matte.m produces art/source/ui04/cat_<breed>_alpha.png.
Existing exports must match; never replace a different asset or meta.
"""
from pathlib import Path
import hashlib, io, json, math, uuid
from PIL import Image, ImageDraw
import cairosvg

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art/source/ui04'
EXPORT = ROOT / 'art/exports/ui04'
IMPORT = ROOT / 'assets/game/art/ui04'
QA = ROOT / 'art/qa/ui04'

def write(path, data):
    data = data.encode() if isinstance(data, str) else data
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != data:
            raise RuntimeError(f'refuse overwrite: {path}')
    else:
        path.write_bytes(data)

def png(image):
    data=io.BytesIO(); image.save(data, format='PNG', optimize=True); return data.getvalue()

def meta(name):
    key=str(uuid.uuid5(uuid.NAMESPACE_URL, 'mmhw/ui04/'+name))
    return key, {'ver':'1.0.27','importer':'image','imported':True,'uuid':key,'files':['.json','.png'],
        'subMetas':{'6c48a':{'importer':'texture','uuid':key+'@6c48a','displayName':name,'id':'6c48a',
          'name':'texture','userData':{'wrapModeS':'clamp-to-edge','wrapModeT':'clamp-to-edge',
          'minfilter':'linear','magfilter':'linear','mipfilter':'none','anisotropy':0,'isUuid':True,
          'imageUuidOrDatabaseUri':key,'visible':False},'ver':'1.0.22','imported':True,'files':['.json'],'subMetas':{}}},
        'userData':{'type':'texture','fixAlphaTransparencyArtifacts':False,'hasAlpha':True,'redirect':key+'@6c48a'}}

records=[]
def deliver(name, image, source, inset=0, **extra):
    data=png(image); write(EXPORT/(name+'.png'),data); write(IMPORT/(name+'.png'),data)
    key,metadata=meta(name); write(IMPORT/(name+'.png.meta'),json.dumps(metadata,indent=2)+'\n')
    alpha=image.getchannel('A')
    assert alpha.getextrema()==(0,255), (name,'missing real transparency')
    records.append(dict(id=name,source=source,export=f'art/exports/ui04/{name}.png',
       imported=f'assets/game/art/ui04/{name}.png',textureUUID=key+'@6c48a',size=list(image.size),
       bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),alphaBounds=alpha.getbbox(),
       anchor=[0.5,0.5],insets=[inset]*4,**extra))

# Geometric controls are authored as vectors, independent from generated cat art.
for name,color,rim in [('btn_primary','#FFC078','#D99C5A'),('btn_primary_pressed','#E8A456','#CE8D49'),
                       ('btn_secondary','#F2E6D5','#D9C9B2'),('btn_secondary_pressed','#E4D5BF','#CBBB9F'),
                       ('btn_disabled','#E8DFD4','#D6CDC2'),('panel_popup','#FFFBF4','#E5D4BE')]:
    panel=name=='panel_popup'; w,h=(128,128) if panel else (96,64); radius=28 if panel else 20
    # Uniform center fill keeps nine-slice seams invisible at arbitrary lengths.
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}"><rect x="2" y="4" width="{w-4}" height="{h-6}" rx="{radius}" fill="{rim}"/><rect x="2" y="2" width="{w-4}" height="{h-8}" rx="{radius}" fill="{color}"/></svg>'
    path=SOURCE/(name+'.svg'); write(path,svg+'\n')
    deliver(name,Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGBA'),str(path.relative_to(ROOT)),36 if panel else 30)
svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect x="16" y="12" width="12" height="40" rx="5" fill="#4A332B"/><rect x="36" y="12" width="12" height="40" rx="5" fill="#4A332B"/></svg>'
write(SOURCE/'icon_pause.svg',svg+'\n')
deliver('icon_pause',Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGBA'),'art/source/ui04/icon_pause.svg')

for breed in ['orange','ragdoll','blue','calico','black']:
    path=SOURCE/f'cat_{breed}_refined.png'
    if not path.exists(): path=SOURCE/f'cat_{breed}_alpha.png'
    if not path.exists(): continue
    im=Image.open(path).convert('RGBA'); alpha=im.getchannel('A')
    # Reject disconnected low-confidence background; do not retain tiny alpha haze.
    alpha=alpha.point(lambda a:0 if a<8 else a)
    im.putalpha(alpha); im=im.crop(alpha.getbbox())
    # Fit every visible alpha pixel INSIDE the unchanged circular gameplay footprint.
    # A square bounding box alone allows ears to protrude beyond the collision circle.
    a=im.getchannel('A'); cx,cy=(im.width-1)/2,(im.height-1)/2
    radius=max(math.hypot(x-cx,y-cy) for y in range(im.height) for x in range(im.width) if a.getpixel((x,y)))
    scale=122/radius
    scaled=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(256,256)); canvas.alpha_composite(scaled,((256-scaled.width)//2,(256-scaled.height)//2))
    deliver('cat_'+breed,canvas,str(path.relative_to(ROOT)),footprintRadius=128,visibleRadiusTarget=122,displayDiameters=[64,56],stressDiameter=48)

write(ROOT/'design/ui/ui04/assets.json',json.dumps({'batch':'UI-04','model':'not returned by built-in tool',
   'font':'system fallback, not embedded or approved','assets':records},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'exported':len(records),'pngBytes':sum(r['bytes'] for r in records)}))
