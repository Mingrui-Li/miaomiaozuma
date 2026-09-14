import fs from 'node:fs';import crypto from 'node:crypto';
const id=()=>crypto.randomUUID();
const compress=s=>{const h=s.replaceAll('-',''),chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out=h.slice(0,5);for(let i=5;i<32;i+=3){const n=parseInt(h.slice(i,i+3),16);out+=chars[n>>6]+chars[n&63];}return out;};
const files={};
const put=(p,v)=>{if(fs.existsSync(p))throw Error('Refusing overwrite '+p);files[p]=JSON.stringify(v,null,2)+'\n';};
const meta=(uuid,importer,ver,files=[])=>({ver,importer,imported:true,uuid,files,subMetas:{},userData:{}});
const sceneId=id(),scriptId=id(),fontId=id();
const scene=JSON.parse(fs.readFileSync('assets/ui-preview/ui-preview.scene'));scene[0]._name=scene[1]._name='ui-flow';scene[1]._id=sceneId;scene[8].__type__=compress(scriptId);scene[8]._id='MMUIFlowView';scene[8].uiFont.__uuid__=fontId;
put('assets/ui-flow/ui-flow.scene',scene);put('assets/ui-flow/ui-flow.scene.meta',meta(sceneId,'scene','1.1.50',['.json']));
for(const name of ['FlowBase','FlowView','FlowModel']){const p=`assets/ui-flow/${name}.ts.meta`;if(!fs.existsSync(p))put(p,meta(name==='FlowView'?scriptId:id(),'typescript','4.0.24'));else if(name==='FlowView')throw Error('FlowView meta already imported; reconcile UUID before scaffolding');}
put('assets/ui-flow/mmhw_ui_flow.ttf.meta',meta(fontId,'ttf-font','1.0.1',['.json','mmhw_ui_flow.ttf']));
put('design/ui/ui06/scene.json',{scene:sceneId,script:scriptId,font:fontId,fixtureOnly:true});
console.log('*** Begin Patch\n'+Object.entries(files).map(([p,t])=>'*** Add File: '+p+'\n'+t.trimEnd().split('\n').map(l=>'+'+l).join('\n')).join('\n')+'\n*** End Patch');
