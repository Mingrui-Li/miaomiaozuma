import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makePath, parameterize, at, resample, distance, radius, rayHits, makeCats, visibleState, gapWitness, segmentDistance } from './geometry.mjs';
const origin={x:0,y:0};
test('empty track cannot collide with a projectile',()=>assert.deepEqual(rayHits(origin,0,[]),[]));
test('nearest hit is independent of cat array order',()=>{const hits=rayHits(origin,0,[{id:2,x:500,y:0},{id:1,x:150,y:0}]);assert.equal(hits[0].cat.id,1);assert.equal(hits[0].t,88);});
test('the projectile has a radius, not an infinitely thin center ray',()=>assert.equal(rayHits(origin,0,[{id:1,x:150,y:60}]).length,1));
test('outside swept circle does not collide',()=>assert.equal(rayHits(origin,0,[{id:1,x:150,y:62.01}]).length,0));
test('tangent contact is a collision',()=>assert.equal(rayHits(origin,0,[{id:1,x:150,y:62}])[0].t,150));
test('cats behind the launcher do not collide',()=>assert.equal(rayHits(origin,0,[{id:1,x:-150,y:0}]).length,0));
test('angles wrap through 360 degrees',()=>{const cat=[{id:1,x:150,y:0}];assert.equal(rayHits(origin,Math.PI*2,cat)[0].cat.id,1);});
test('removing an occluder reveals the far target',()=>{const cats=[{id:0,x:150,y:0},{id:1,x:400,y:0}];assert(visibleState(origin,cats).hidden.has(1));assert(visibleState(origin,cats.slice(1)).first.has(1));});
test('sampling clamps at both endpoints',()=>{const p=parameterize([{x:1,y:2},{x:101,y:2}]);assert.deepEqual(at(p,-3),{x:1,y:2});assert.deepEqual(at(p,500),{x:101,y:2});assert.deepEqual(at(p,50),{x:51,y:2});});
test('rounded path never silently shrinks an impossible corner',()=>assert.throws(()=>makePath({kind:'rounded',radius:100,points:[[0,0],[30,0],[30,30]]}),/圆角重叠/));
test('rounded right angle has exact endpoints and 100px curvature',()=>{const pts=makePath({kind:'rounded',radius:100,points:[[0,0],[300,0],[300,300]]});assert.deepEqual(pts[0],{x:0,y:0});assert.deepEqual(pts.at(-1),{x:300,y:300});const p=parameterize(pts);const mid=200+100*Math.PI/4;assert(Math.abs(radius(at(p,mid-12),at(p,mid),at(p,mid+12))-100)<.2);});
test('intersection detection handles crossing and collinear overlaps',()=>{assert.equal(segmentDistance({x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}),0);assert.equal(segmentDistance({x:0,y:0},{x:100,y:0},{x:50,y:0},{x:150,y:0}),0);});
const source=JSON.parse(fs.readFileSync(new URL('../../design/track-review/levels.json',import.meta.url),'utf8'));
const report=JSON.parse(fs.readFileSync(new URL('../../design/track-review/generated/audit.json',import.meta.url),'utf8'));
for(const level of source.levels){
  test(`L${level.id}: cat centers stay on the continuous path and preserve spacing`,()=>{
    const path=parameterize(makePath(level.geometry));
    for(const ratio of [.25,.45,.72,.94]){
      const cats=makeCats(path,ratio);
      for(let i=0;i<cats.length;i++){
        assert(distance(cats[i],at(path,cats[i].s))<1e-6);
        if(i){assert(Math.abs(cats[i].s-cats[i-1].s-66)<1e-6);assert(distance(cats[i],cats[i-1])>=64);}
      }
    }
    const pts=resample(path,4);assert(pts.every((p,i)=>!i||distance(p,pts[i-1])<=4.001));
  });
  test(`L${level.id}: recorded gap witness can be replayed`,()=>{
    const path=parameterize(makePath(level.geometry));
    const states=report.levels.find(l=>l.id===level.id).states;
    for(const state of states){
      if(!state.gapWitness)continue;
      const cats=makeCats(path,state.headRatio), before=visibleState(source.launcher,cats);
      const after=visibleState(source.launcher,cats.filter(c=>!state.gapWitness.removed.includes(c.id)));
      for(const id of state.gapWitness.newlyVisible){assert(before.hidden.has(id));assert(after.first.has(id));}
      const hits=rayHits(source.launcher,state.gapWitness.angleDegrees*Math.PI/180,cats.filter(c=>!state.gapWitness.removed.includes(c.id)));
      assert.equal(hits[0].cat.id,state.gapWitness.newlyVisible[0]);
    }
    if(level.focus==='gap')assert(states.some(s=>s.gapWitness));
  });
}
