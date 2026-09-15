// Deterministic derived JSON asset. Never writes the canonical catalog or old fixtures.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {makePath,parameterize,resample} from '../track-review/geometry.mjs';
const raw=fs.readFileSync('design/track-review/catalog.source.json');
const source=JSON.parse(raw);
const data={sourceSHA:crypto.createHash('sha256').update(raw).digest('hex'),sampleStep:2,fixtureOnly:true,
 levels:source.levels.map(l=>({id:l.id,name:l.name,chapter:l.chapter,
 ...Object.fromEntries(['catRadius','trackWidth','spacing'].map(k=>[k,l.geometryProfile[k]])),
 points:resample(parameterize(makePath(l.geometry)),2).map(p=>({x:+p.x.toFixed(6),y:+p.y.toFixed(6)}))}))};
const path='assets/ui-catalog/CatalogData.json';
const text=JSON.stringify(data)+'\n';
if(fs.existsSync(path)&&fs.readFileSync(path,'utf8')!==text)throw Error('Derived data differs; inspect before replacing');
fs.mkdirSync('assets/ui-catalog',{recursive:true});fs.writeFileSync(path,text);
console.log(JSON.stringify({path,levels:data.levels.length,bytes:Buffer.byteLength(text),sourceSHA:data.sourceSHA}));
