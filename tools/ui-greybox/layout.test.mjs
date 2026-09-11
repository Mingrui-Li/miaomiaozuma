import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { makePath } from '../track-review/geometry.mjs';
const out=fs.mkdtempSync('/tmp/mmhw-ui03g-tests-');
execFileSync('/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript/bin/tsc',[
  'assets/ui-greybox/Layout.ts','assets/ui-greybox/Fixtures.ts','--strict','--target','ES2020','--module','commonjs','--outDir',out
]);
const require=createRequire(import.meta.url);
const {FIXTURES,SOURCE_SHA}=require(out+'/Fixtures.js');
const {chooseNext,nextClearance,envelope,fitStage,unmap,contains,GestureGate,segmentDistance,renderPolyline,HUD_BOTTOM,TOOL_TOP,touchRect}=require(out+'/Layout.js');
const raw=fs.readFileSync('design/track-review/catalog.source.json'),source=JSON.parse(raw);
test('snapshot identifies the unchanged 100-level source',()=>{
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),SOURCE_SHA);
  assert.deepEqual(FIXTURES.map(f=>f.id),[1,20,21,22,24,87,100]);
});
for(const f of FIXTURES)test(`L${f.id}: source geometry, occupied envelope and fixed preview`,()=>{
  const original=source.levels.find(l=>l.id===f.id),p=makePath(original.geometry);
  assert.equal(f.catRadius,f.id<=20?32:28);assert.equal(f.trackWidth,original.geometryProfile.trackWidth);
  assert.ok(Math.hypot(f.points[0].x-p[0].x,f.points[0].y-p[0].y)<0.00001);
  assert.ok(Math.hypot(f.points.at(-1).x-p.at(-1).x,f.points.at(-1).y-p.at(-1).y)<0.00001);
  for(const point of p){let d=Infinity;for(let i=1;i<f.points.length;i++)d=Math.min(d,segmentDistance(point,f.points[i-1],f.points[i]));assert.ok(d<0.05,`deviation ${d}`);}
  const e=envelope(f);assert.ok(e.top-HUD_BOTTOM>=20-0.01);assert.ok(TOOL_TOP-e.bottom>=26-0.01);
  const preview=chooseNext(f);assert.ok(nextClearance(f,preview)>=8);assert.deepEqual(chooseNext(f),preview);
  if(f.id===87)assert.equal(preview.docked,true);
  const rendered=renderPolyline(f.points);assert.ok(rendered.length<500,'excessive Graphics tessellation');
  for(const point of f.points){let d=Infinity;for(let i=1;i<rendered.length;i++)d=Math.min(d,segmentDistance(point,rendered[i-1],rendered[i]));assert.ok(d<=0.250001);}
});
for(const [w,h,top,bottom] of [[375,667,0,0],[390,844,47,34],[430,932,59,34],[360,640,24,24],[768,1024,24,20]]){
  test(`safe viewport ${w}×${h}: whole-stage fit and invertible touch coordinates`,()=>{
    const safe={x:0,y:top,width:w,height:h-top-bottom},capsule={x:w-105,y:top+8,width:96,height:32};
    const fit=fitStage({x:0,y:0,width:w,height:h},safe,capsule);
    assert.ok(fit.scale>0);assert.ok(fit.y>=capsule.y+capsule.height+8);
    assert.ok(fit.x>=safe.x);assert.ok(fit.x+fit.width<=w+1e-6);assert.ok(fit.y+fit.height<=h-bottom+1e-6);
    for(const p of [{x:375,y:675},{x:76,y:108},{x:570,y:1232}]){
      const q=unmap({x:fit.x+p.x*fit.scale,y:fit.y+p.y*fit.scale},fit);assert.ok(Math.hypot(q.x-p.x,q.y-p.y)<1e-6);
    }
  });
}
test('UI owns a whole gesture; dragging from a UI control never shoots',()=>{
  const g=new GestureGate();g.begin(1,{x:76,y:108},'ui');g.move(1,{x:500,y:700});assert.equal(g.end(1,{x:500,y:700}),'none');
  g.begin(1,{x:76,y:108},'ui');assert.equal(g.end(1,{x:76,y:108}),'ui');
});
test('multitouch cannot replace the active finger; cancellation invalidates late release',()=>{
  const g=new GestureGate();assert.equal(g.begin(1,{x:500,y:700},'game'),true);assert.equal(g.begin(2,{x:375,y:675},'game'),false);
  assert.equal(g.end(2,{x:375,y:675}),'none');g.cancel();assert.equal(g.end(1,{x:500,y:700}),'none');
});
test('central tap swaps; drag-away-and-back cancels; modal never emits aim',()=>{
  const g=new GestureGate();g.begin(1,{x:375,y:675},'game');assert.equal(g.end(1,{x:375,y:675}),'swap');
  g.begin(1,{x:375,y:675},'game');g.move(1,{x:500,y:700});assert.equal(g.end(1,{x:375,y:675}),'none');
  g.begin(1,{x:500,y:700},'blocked');assert.equal(g.end(1,{x:550,y:750}),'none');
  g.begin(1,{x:500,y:700},'game');assert.equal(g.end(1,{x:550,y:750}),'aim');
});
test('empty / disjoint safe area fails closed',()=>{
  const f=fitStage({x:0,y:0,width:375,height:667},{x:500,y:0,width:10,height:20});assert.equal(f.scale,0);
  assert.equal(contains({x:32,y:64,width:88,height:88},{x:121,y:100}),false);
});
test('UI-R03: expanded short-screen controls clear all seven occupied envelopes',()=>{
  const w=750,h=640/360*w,css=360/w;
  const fit=fitStage({x:0,y:0,width:w,height:h-60-52},{x:0,y:72,width:w,height:h-72-60},{x:560,y:80,width:166,height:48});
  const units=1/(css*fit.scale);
  const pause=touchRect({x:32,y:64,width:88,height:88},units);
  const tool=touchRect({x:92,y:1188,width:176,height:88},units);
  assert.ok(pause.width/units>=44-1e-8);assert.ok(tool.height/units>=44-1e-8);
  assert.ok(contains(pause,{x:76,y:pause.y+1}),'new edge should accept a tap');
  for(const f of FIXTURES){const e=envelope(f);assert.ok(e.top-(pause.y+pause.height)>=8);assert.ok(tool.y-e.bottom>=8);}
  const buttons=[512,632,752,872,992].map(y=>touchRect({x:135,y,width:480,height:88},units));
  buttons.forEach((b,i)=>{assert.ok(b.y>=310 && b.y+b.height<=1110);if(i)assert.ok(buttons[i-1].y+buttons[i-1].height<b.y);});
});
