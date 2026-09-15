import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {makePath,parameterize,resample} from '../track-review/geometry.mjs';
const out=fs.mkdtempSync('/private/tmp/mmhw-ui07-tests-');
execFileSync('/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript/bin/tsc',['assets/ui-catalog/ReviewLayout.ts','--strict','--target','ES2020','--module','commonjs','--outDir',out]);
const require=createRequire(import.meta.url),L=require(out+'/ui-greybox/Layout.js'),R=require(out+'/ui-catalog/ReviewLayout.js');
const raw=fs.readFileSync('design/track-review/catalog.source.json'),source=JSON.parse(raw),data=JSON.parse(fs.readFileSync('assets/ui-catalog/CatalogData.json'));
const rows=[];
test('100 canonical levels, no old path source, exact source hash',()=>{
 assert.equal(data.sourceSHA,crypto.createHash('sha256').update(raw).digest('hex'));assert.deepEqual(data.levels.map(f=>f.id),Array.from({length:100},(_,i)=>i+1));
});
for(const f of data.levels)test(`L${String(f.id).padStart(3,'0')}: geometry / occupancy / preview / controls`,()=>{
 const original=source.levels[f.id-1],exact=resample(parameterize(makePath(original.geometry)),2);
 assert.equal(exact.length,f.points.length);exact.forEach((p,i)=>assert.ok(Math.hypot(p.x-f.points[i].x,p.y-f.points[i].y)<.000001));
 assert.equal(f.catRadius,f.id<=20?32:28);assert.equal(f.trackWidth,original.geometryProfile.trackWidth);assert.equal(f.spacing,original.geometryProfile.spacing);
 const b=R.occupiedBounds(f),next=L.chooseNext(f),line=L.renderPolyline(f.points),s=R.cumulative(f);
 assert.ok(b.left>=0&&b.right<=750);assert.ok(b.top-168>=20-.001);assert.ok(1188-b.bottom>=26-.001);
 assert.ok(next.gap>=8);assert.ok(R.launcherGap(f)>=8);assert.ok(line.length<500);
 let error=0;for(const p of f.points){let gap=Infinity;for(let i=1;i<line.length;i++)gap=Math.min(gap,L.segmentDistance(p,line[i-1],line[i]));error=Math.max(error,gap);}assert.ok(error<=.250001);
 for(const phase of [0,1,2]){const cats=R.sampleChain(f,s,phase);assert.ok(cats.length>=5);for(const p of cats)assert.ok(p.x-f.catRadius>=0&&p.x+f.catRadius<=750&&p.y-f.catRadius>=168&&p.y+f.catRadius<=1188);}
 for(const end of [false,true]){const d=R.direction(f,end);assert.ok(Math.abs(Math.hypot(d.x,d.y)-1)<1e-8);const poly=L.facility(f.points,end),p=end?f.points.at(-1):f.points[0];assert.ok(Math.hypot((poly[0].x+poly[1].x)/2-p.x,(poly[0].y+poly[1].y)/2-p.y)<1e-8);}
 const sizes=[];
 for(const [width,height] of [[360,640],[390,844],[430,932]]){
  const css=width/750,h=height/css,safe={x:0,y:72,width:750,height:h-132};
  const fit=L.fitStage({x:0,y:0,width:750,height:h-60-48/css},safe,{x:560,y:80,width:166,height:48});
  const pause=L.touchRect({x:32,y:64,width:88,height:88},1/(css*fit.scale));
  const tool=L.touchRect({x:92,y:1188,width:176,height:88},1/(css*fit.scale));
  assert.ok(pause.width*fit.scale*css>=44-1e-8);assert.ok(b.top-pause.y-pause.height>=8);assert.ok(tool.y-b.bottom>=8);
  sizes.push({width,height,catCssDiameter:f.catRadius*2*fit.scale*css,pauseGap:b.top-pause.y-pause.height,toolGap:tool.y-b.bottom});
 }
 rows.push({id:f.id,catDiameter:f.catRadius*2,trackWidth:f.trackWidth,source:f.points[0],lair:f.points.at(-1),sourceDirection:R.direction(f,false),lairDirection:R.direction(f,true),occupied:b,topGap:b.top-168,bottomGap:1188-b.bottom,launcherGap:R.launcherGap(f),next,renderPoints:line.length,renderError:error,sizes,status:'STATIC_LAYOUT_PASS'});
});
test('arc interpolation clamps endpoints; samples distinguish phases on a long path',()=>{
 const f=data.levels[99],s=R.cumulative(f);assert.deepEqual(R.at(f,s,-100),f.points[0]);assert.deepEqual(R.at(f,s,s.at(-1)+100),f.points.at(-1));
 assert.notDeepEqual(R.sampleChain(f,s,0),R.sampleChain(f,s,1));assert.notDeepEqual(R.sampleChain(f,s,1),R.sampleChain(f,s,2));
});
test('write per-level static report only after all 100 rows passed',()=>{
 assert.equal(rows.length,100);fs.mkdirSync('design/ui/ui07',{recursive:true});
 fs.writeFileSync('design/ui/ui07/layout-audit.json',JSON.stringify({date:'2026-09-14',sourceSHA:data.sourceSHA,method:'2px canonical samples, 0.25px render tolerance, full occupied tube and endpoint footprints',scope:'static layout only; obstacle glyphs fit cat bounds; no gameplay/phone/performance claim',rows},null,2)+'\n');
});
