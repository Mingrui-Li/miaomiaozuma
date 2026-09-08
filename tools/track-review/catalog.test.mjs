import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {makePath,parameterize,at,distance,makeCats,rayHits} from './geometry.mjs';
import {symmetricDifference} from './similarity.mjs';
import {profileFor,radialLayers} from './pressure.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../../design/track-review/catalog.source.json',import.meta.url),'utf8'));
const report=JSON.parse(fs.readFileSync(new URL('../../design/track-review/generated/catalog/audit.json',import.meta.url),'utf8'));
test('exactly 100 IDs, 10 chapters and no implicit owner approval',()=>{
  assert.equal(source.levels.length,100);assert.equal(report.ownerApproved,0);
  for(let i=0;i<100;i++){assert.equal(source.levels[i].id,i+1);assert.equal(source.levels[i].chapter,Math.floor(i/10)+1);assert.equal(source.levels[i].ownerApproval,'PENDING');}
});
test('shape comparison rejects translated, scaled, rotated, mirrored and reversed copies',()=>{
  const a=parameterize(makePath(source.levels[3].geometry));
  const b=parameterize(a.points.map(p=>({x:1300-p.y*.85,y:20+p.x*.85})).reverse());
  const c=parameterize(a.points.map(p=>({x:900-p.x,y:p.y+50})));
  assert(symmetricDifference(a,b)<.001);assert(symmetricDifference(a,c)<.001);
});
test('all 4950 catalog pairs meet the unchanged 48px review threshold',()=>{
  const p=source.levels.map(l=>parameterize(makePath(l.geometry)));
  let count=0;for(let i=0;i<100;i++)for(let j=i+1;j<100;j++){assert(symmetricDifference(p[i],p[j])>=48,`${i+1}/${j+1}`);count++;}assert.equal(count,4950);
});
test('compact profile starts at level 21 and has matching cat / lane sizes',()=>{
  assert.equal(profileFor(20).catRadius,32);assert.equal(profileFor(21).catRadius,28);
  assert.equal(profileFor(100).trackWidth,72);assert.equal(profileFor(100).minGap,88);assert.equal(profileFor(100).spacing,58);
});
test('a 2.2-turn nested path exposes real three-layer ray directions',()=>{
  const p=parameterize(makePath({kind:'spiral',start:-2.4,turns:2.2,rx0:326,ry0:432,rx1:112,ry1:145,wave:0,lobes:1}));
  const layers=radialLayers(p);assert.equal(layers.twoLayerDegrees,360);assert(layers.threeLayerDegrees>=40);assert.equal(layers.maxLayers,3);
});
for(const l of source.levels)test(`L${l.id}: source / lair / SVG / cat spacing agree with the frozen geometry`,()=>{
  const p=parameterize(makePath(l.geometry));
  const profile=profileFor(l.id);
  const hash=crypto.createHash('sha256').update(JSON.stringify({geometry:l.geometry,geometryProfile:profile})).digest('hex');
  assert.equal(l.sourceSha256,hash);assert(l.geometryPassed,l.errors.join(';'));
  assert(distance(at(p,0),l.source)<1e-6);assert(distance(at(p,p.length),l.lair)<1e-6);
  assert(p.length>0);assert(distance(l.source,l.lair)>profile.minGap);
  const svg=fs.readFileSync(new URL(`../../design/track-review/generated/catalog/levels/${String(l.id).padStart(3,'0')}.svg`,import.meta.url),'utf8');
  assert(svg.includes(hash.slice(0,16)));assert(svg.includes(`stroke-width="${profile.trackWidth}"`));
  assert.equal((svg.match(/>S<\/text>/g)||[]).length,1);assert.equal((svg.match(/>L<\/text>/g)||[]).length,1);
  for(const ratio of [.45,.72,.94]){
    const cats=makeCats(p,ratio,profile.spacing,profile.catRadius);for(let i=1;i<cats.length;i++){assert(Math.abs(cats[i].s-cats[i-1].s-profile.spacing)<1e-6);assert(distance(cats[i],cats[i-1])>=profile.catRadius*2);}
  }
});
test('chapter mean geometric pressure increases, with late multi-layer floors',()=>{
  let previous=-1;
  for(let c=0;c<10;c++){
    const mean=source.levels.slice(c*10,c*10+10).reduce((n,l)=>n+l.geometricPressure.score,0)/10;
    assert(mean>previous);previous=mean;
  }
  for(const l of source.levels.filter(l=>l.id>=21)){
    assert(l.geometricPressure.twoLayerDegrees>=(l.id<=40?75:l.id<=60?135:l.id<=80?185:235));
    assert(l.geometricPressure.threeLayerDegrees>=(l.id<=60?0:l.id<=80?12:30));
  }
});
test('all 100 evidence files match their source and replay the same-ray probe',()=>{
  let witnessed=0;
  for(const l of source.levels){
    const data=JSON.parse(fs.readFileSync(new URL(`../../design/track-review/generated/catalog/evidence/${String(l.id).padStart(3,'0')}.json`,import.meta.url),'utf8'));
    assert.equal(data.sourceSha256,l.sourceSha256);
    assert.equal(data.fixtures.length,3);
    const cats=data.fixtures.at(-1).cats,w=data.witness,p=profileFor(l.id);
    if(!w)continue;witnessed++;
    const angle=w.angleDegrees*Math.PI/180;
    assert.equal(rayHits(source.launcher,angle,cats,p.catRadius+p.projectileRadius)[0]?.cat.id,w.beforeHit);
    assert.equal(rayHits(source.launcher,angle,cats.filter(c=>!w.removed.includes(c.id)),p.catRadius+p.projectileRadius)[0]?.cat.id,w.afterHit);
    assert(w.removed.includes(w.beforeHit));assert(w.newlyVisible.includes(w.afterHit));
  }
  assert(witnessed>=80,'Multi-layer candidate set should contain many explicit geometric gap witnesses');
});
