import fs from 'node:fs';
import {makePath,parameterize,resample,distance,radius,segmentDistance,makeCats,visibleState} from './geometry.mjs';
import {pressure,profileFor} from './pressure.mjs';
import {symmetricDifference} from './similarity.mjs';
const old=JSON.parse(fs.readFileSync('design/track-review/generated/rejected-low-pressure.catalog.json','utf8'));
const masters=JSON.parse(fs.readFileSync('design/track-review/challenge-masters.json','utf8')).masters;
let seed=202609071;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(rand()*a.length)],between=(a,b)=>a+(b-a)*rand();
function grid(){
  const xs=[62,230,520,688],ys=[228,396,564,786,954,1122];
  let cell=[Math.floor(rand()*4),Math.floor(rand()*6)],pts=[cell],seen=new Set([cell.join(',')]);
  const count=Math.floor(between(12,25));
  for(let n=1;n<count;n++){
    const choices=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[cell[0]+dx,cell[1]+dy]).filter(c=>c[0]>=0&&c[0]<4&&c[1]>=0&&c[1]<6&&!seen.has(c.join(',')));
    if(!choices.length)break;cell=pick(choices);seen.add(cell.join(','));pts.push(cell);
  }
  const points=pts.filter((p,i)=>i===0||i===pts.length-1||(pts[i+1][0]-p[0])*(p[1]-pts[i-1][1])!==(pts[i+1][1]-p[1])*(p[0]-pts[i-1][0])).map(([x,y])=>[xs[x],ys[y]]);
  return {name:'多层折返',geometry:{kind:'rounded',radius:84,points}};
}
function validate(path,p){
  const pts=resample(path,8),ds=path.length/(pts.length-1);
  if(path.length<1800||path.length>5700)return false;
  if(pts.some(q=>q.x<52||q.x>698||q.y<212||q.y>1138||distance(q,{x:375,y:675})<108))return false;
  if(distance(pts[0],pts.at(-1))<p.minGap+4)return false;
  if(new Set(pts.map(q=>Math.floor(((Math.atan2(q.y-675,q.x-375)*180/Math.PI+360)%360)/90))).size!==4)return false;
  for(let i=2;i<pts.length-2;i++)if(radius(pts[i-2],pts[i],pts[i+2])<p.minRadius-.2)return false;
  for(let i=0;i<pts.length-1;i++)for(let j=i+2;j<pts.length-1;j++){
    if((j-i-1)*ds<190)continue;
    if(segmentDistance(pts[i],pts[i+1],pts[j],pts[j+1])<p.minGap)return false;
  }
  return visibleState({x:375,y:675},makeCats(path,.995,p.spacing,p.catRadius),p.catRadius+p.projectileRadius).covered>=220;
}
const pool=[];
const attempts=Number(process.argv.find(a=>a.startsWith('--attempts='))?.split('=')[1]??10000);
for(let i=0;i<attempts;i++){
  const master=rand()<.75?grid():JSON.parse(JSON.stringify(pick(masters)));
  const g=master.geometry;
  if(g.kind==='spiral'||g.kind==='contour-spiral'){
    g.turns=between(1.35,2.3);g.start=between(-Math.PI,Math.PI);
    g.rx0=between(306,328);g.ry0=between(405,438);g.rx1=between(109,140);g.ry1=between(140,182);g.wave=between(0,.04);
    if(g.kind==='contour-spiral')g.exponent=between(2.2,2.75);
    if(rand()<.4){[g.rx0,g.rx1]=[g.rx1,g.rx0];[g.ry0,g.ry1]=[g.ry1,g.ry0];master.name+='外展';}
  }
  try{
    const path=parameterize(makePath(g));
    if(validate(path,profileFor(100))){
      const pr=pressure(path,profileFor(100));
      if(pr.twoLayerDegrees>=65)pool.push({geometry:g,name:master.name,path,pressure:pr});
    }
  }catch{}
  if(i%1000===0)console.log(`pressure search ${i}/${attempts}, valid ${pool.length}`);
}
// Include explicit masters so the selected set can mix rounded labyrinths and
// continuous nested curves instead of all being rectilinear grid walks.
for(const m of masters){try{const path=parameterize(makePath(m.geometry));if(validate(path,profileFor(100)))pool.push({geometry:m.geometry,name:m.name,path,pressure:pressure(path,profileFor(100))});}catch{}}
const familiar=old.levels.map(l=>{const path=parameterize(makePath(l.geometry));return {...l,path,pressure:pressure(path,profileFor(1))};});
const selected=[];
// Reserve readable openings. Remaining early levels are ranked by pressure, NOT length.
for(const oldId of [1,2,3,8,9])selected.push(familiar.find(l=>l.id===oldId));
const early=familiar.filter(l=>![1,2,3,8,9].includes(l.id)).sort((a,b)=>a.pressure.score-b.pressure.score);
for(let id=6;id<=20;id++){
  const target=12+(id-6)*1.5;
  const eligible=early.filter(l=>selected.every(s=>symmetricDifference(l.path,s.path)>=48));
  eligible.sort((a,b)=>Math.abs(a.pressure.score-target)-Math.abs(b.pressure.score-target));
  const next=eligible[0];if(!next)throw new Error('Early pressure candidates exhausted');selected.push(next);early.splice(early.indexOf(next),1);
}
// Accepted geometry is never overwritten here. This outputs a separate review proposal.
for(const c of pool)c.nearest=Math.min(...selected.map(s=>symmetricDifference(c.path,s.path)));
for(let id=21;id<=100;id++){
  const target=27+(id-21)/79*54;
  const minTwo=id<=40?75:id<=60?135:id<=80?185:235;
  const minThree=id<=60?0:id<=80?12:30;
  const eligible=pool.filter(c=>c.nearest>=48&&c.pressure.twoLayerDegrees>=minTwo&&c.pressure.threeLayerDegrees>=minThree);
  if(!eligible.length){console.log(`No qualifying candidate at L${id}; do not relax pressure or similarity checks.`);break;}
  // Vary representation families where a comparably suitable candidate exists.
  const lastKind=selected.at(-1).geometry.kind;
  const score=c=>Math.abs(c.pressure.score-target)+(c.geometry.kind===lastKind?2.5:0)-Math.min(2,c.nearest/100);
  eligible.sort((a,b)=>score(a)-score(b));
  const next=eligible[0];selected.push(next);pool.splice(pool.indexOf(next),1);
  for(const c of pool)c.nearest=Math.min(c.nearest,symmetricDifference(c.path,next.path));
  if(id%10===0)console.log(`selected L${id}, pressure ${next.pressure.score}, two ${next.pressure.twoLayerDegrees}°, three ${next.pressure.threeLayerDegrees}°`);
}
fs.mkdirSync('design/track-review/generated',{recursive:true});
fs.writeFileSync('design/track-review/challenge-candidates.json',JSON.stringify({status:'PRESSURE_REVIEW_NOT_APPROVED',count:selected.length,selected:selected.map((c,i)=>({id:i+1,name:c.name??c.family,family:c.name??c.family,geometry:c.geometry,geometryProfile:profileFor(i+1),pressure:c.pressure}))},null,2)+'\n');
console.log(`Saved ${selected.length}/100 pressure-qualified candidates; no art or production changes.`);
if(selected.length!==100)process.exitCode=1;
