// Emits an apply_patch patch; never overwrites the catalog or existing assets.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { makePath, parameterize, resample } from '../track-review/geometry.mjs';
const raw=fs.readFileSync('design/track-review/catalog.source.json');
const source=JSON.parse(raw),sha=crypto.createHash('sha256').update(raw).digest('hex');
const ids=[1,20,21,22,24,87,100];
const fixtures=ids.map(id=>{
  const l=source.levels.find(l=>l.id===id);
  return {id,name:l.name,...Object.fromEntries(['catRadius','trackWidth','spacing'].map(k=>[k,l.geometryProfile[k]])),
    points:resample(parameterize(makePath(l.geometry)),2).map(p=>({x:+p.x.toFixed(6),y:+p.y.toFixed(6)}))};
});
const scene=JSON.parse(fs.readFileSync('assets/game/scenes/main.scene'));
scene[0]._name=scene[1]._name='ui-greybox';
scene[1]._id='a03a9bbb-20f6-4b6b-9d18-c0c359f76001';
scene[8].__type__='b03a9u7IPZLa50YwMNZ92AC';
scene[8]._id='UIGreyboxComponent';
const meta=(uuid,importer,ver,files=[])=>JSON.stringify({ver,importer,imported:true,uuid,files,subMetas:{},userData:{}},null,2)+'\n';
const files={
 'assets/ui-greybox/Fixtures.ts':`// GENERATED representative snapshots only; source SHA-256 ${sha}\nimport type { Fixture } from './Layout';\nexport const SOURCE_SHA = '${sha}';\nexport const FIXTURES: Fixture[] = ${JSON.stringify(fixtures)};\n`,
 'assets/ui-greybox/ui-greybox.scene':JSON.stringify(scene,null,2)+'\n',
 'assets/ui-greybox/ui-greybox.scene.meta':meta(scene[1]._id,'scene','1.1.50',['.json']),
 'assets/ui-greybox/Greybox.ts.meta':meta('b03a9bbb-20f6-4b6b-9d18-c0c359f76002','typescript','4.0.24'),
 'assets/ui-greybox/Layout.ts.meta':meta('b03a9bbb-20f6-4b6b-9d18-c0c359f76003','typescript','4.0.24'),
 'assets/ui-greybox/Fixtures.ts.meta':meta('b03a9bbb-20f6-4b6b-9d18-c0c359f76004','typescript','4.0.24'),
 'assets/ui-greybox.meta':meta('b03a9bbb-20f6-4b6b-9d18-c0c359f76005','directory','1.2.0')
};
for(const path of Object.keys(files)) if(fs.existsSync(path)) throw Error(`Refusing to overwrite ${path}`);
console.log('*** Begin Patch\n'+Object.entries(files).map(([path,text])=>'*** Add File: '+path+'\n'+text.trimEnd().split('\n').map(l=>'+'+l).join('\n')).join('\n')+'\n*** End Patch');
