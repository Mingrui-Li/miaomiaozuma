// Emit additions as apply_patch text. Never overwrite existing assets/metas.
import fs from 'node:fs';
import crypto from 'node:crypto';
const files={};
const uuid=()=>crypto.randomUUID();
const ref=id=>({__id__:id});
const compact=s=>{const h=s.replaceAll('-',''),chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out=h.slice(0,5);for(let i=5;i<32;i+=3){const n=parseInt(h.slice(i,i+3),16);out+=chars[n>>6]+chars[n&63];}return out;};
const meta=(id,importer,ver,files=[])=>({ver,importer,imported:true,uuid:id,files,subMetas:{},userData:{}});
const put=(p,v)=>files[p]=typeof v==='string'?v:JSON.stringify(v,null,2)+'\n';
const ids={};
for(const name of ['CommonButton','PanelView','HudView'])ids[name]=JSON.parse(fs.readFileSync(`assets/game/scripts/ui/${name}.ts.meta`)).uuid;
function prefab(name,build){
 const id=uuid(),a=[{__type__:'cc.Prefab',_name:name,_objFlags:0,_native:'',data:ref(1),optimizationPolicy:0,persistent:false}];
 const add=v=>{a.push(v);return a.length-1;};
 const component=(n,type,props={})=>{const i=add({__type__:type,_name:'',_objFlags:0,node:ref(n),_enabled:true,...props});a[n]._components.push(ref(i));return i;};
 const node=(name,parent,x=0,y=0,w=750,h=1334)=>{
  const n=add({__type__:'cc.Node',_name:name,_objFlags:0,_parent:parent?ref(parent):null,_children:[],_active:true,_components:[],_prefab:null,_lpos:{__type__:'cc.Vec3',x,y,z:0},_lrot:{__type__:'cc.Quat',x:0,y:0,z:0,w:1},_lscale:{__type__:'cc.Vec3',x:1,y:1,z:1},_layer:33554432});
  if(parent)a[parent]._children.push(ref(n));
  component(n,'cc.UITransform',{_contentSize:{__type__:'cc.Size',width:w,height:h},_anchorPoint:{__type__:'cc.Vec2',x:.5,y:.5}});
  a[n]._prefab=ref(add({__type__:'cc.PrefabInfo',root:ref(1),asset:ref(0),fileId:uuid()}));return n;
 };
 const label=(name,parent,x,y,w,h,s,size=32)=>component(node(name,parent,x,y,w,h),'cc.Label',{_string:s,_fontSize:size,_lineHeight:size+8,_horizontalAlign:1,_verticalAlign:1,_overflow:2,_enableWrapText:false,_isSystemFontUsed:true,_fontFamily:'sans-serif',_color:{__type__:'cc.Color',r:74,g:51,b:43,a:255}});
 const sprite=(name,parent,w,h)=>component(node(name,parent,0,0,w,h),'cc.Sprite',{_type:1,_sizeMode:0,_color:{__type__:'cc.Color',r:255,g:255,b:255,a:255}});
 build({node,component,label,sprite,ref});
 put(`assets/game/prefabs/ui/${name}.prefab`,a);put(`assets/game/prefabs/ui/${name}.prefab.meta`,meta(id,'prefab','1.1.27',['.json']));ids[name]=id;
}
prefab('CommonButtonView',({node,component,label,sprite,ref})=>{const r=node('CommonButton',null,0,0,480,88);const bg=sprite('Background',r,480,88),caption=label('Caption',r,0,0,456,88,'开始回窝');component(r,compact(ids.CommonButton),{background:ref(bg),caption:ref(caption)});});
prefab('DialogPanel',({node,component,label,sprite,ref})=>{const r=node('DialogPanel',null,0,0,606,800);const s=sprite('Surface',r,606,800),t=label('Title',r,0,316,540,64,'歇一会儿喵',40),m=label('Message',r,0,250,540,46,'猫猫等你一起回窝',26);component(r,compact(ids.PanelView),{surface:ref(s),title:ref(t),message:ref(m)});});
prefab('GameHud',({node,component,label,ref})=>{const r=node('GameHud',null);const l=label('Level',r,-139,583,184,40,'第 1 关'),g=label('Goal',r,81,583,252,40,'目标：全部回窝',28),p=component(node('Progress',r,-231,533,400,16),'cc.Graphics');label('Purr',r,207,533,64,32,'呼噜',24);component(r,compact(ids.HudView),{level:ref(l),goal:ref(g),progress:ref(p)});});
prefab('HomeView',({node,label})=>{const r=node('HomeView',null);label('Title',r,0,407,650,96,'喵喵回窝',64);label('Subtitle',r,0,318,620,44,'贴贴小猫，慢慢回家',28);});
const scene=JSON.parse(fs.readFileSync('assets/ui-greybox/ui-greybox.scene'));
const sceneId=uuid(),scriptId=uuid();scene[0]._name=scene[1]._name='ui-preview';scene[1]._id=sceneId;scene[8].__type__=compact(scriptId);scene[8]._id='MMUIPreview';
for(const [prop,key] of [['buttonPrefab','CommonButtonView'],['panelPrefab','DialogPanel'],['hudPrefab','GameHud'],['homePrefab','HomeView']])scene[8][prop]={__uuid__:ids[key],__expectedType__:'cc.Prefab'};
put('assets/ui-preview/ui-preview.scene',scene);put('assets/ui-preview/ui-preview.scene.meta',meta(sceneId,'scene','1.1.50',['.json']));put('assets/ui-preview/Preview.ts.meta',meta(scriptId,'typescript','4.0.24'));
put('design/ui/ui05/components.json',{scene:sceneId,script:scriptId,prefabs:ids,source:'UI-04 unchanged PNG textures, runtime Sliced SpriteFrames',font:'system fallback until candidate font download is verified'});
for(const p of Object.keys(files))if(fs.existsSync(p))throw Error('Refusing overwrite '+p);
console.log('*** Begin Patch\n'+Object.entries(files).map(([p,t])=>'*** Add File: '+p+'\n'+t.trimEnd().split('\n').map(l=>'+'+l).join('\n')).join('\n')+'\n*** End Patch');
