// Offline constrained candidate exploration, never runtime random levels.
// Selected coordinates are frozen for owner review; art cannot change them.
throw new Error('旧形态新奇度候选流程已废止。使用 build-challenge-candidates.mjs 编排压力候选，不能恢复旧百关。');
import fs from 'node:fs';
import { makePath, parameterize, at, resample, distance, radius, segmentDistance } from './geometry.mjs';
import { symmetricDifference } from './similarity.mjs';
const first=JSON.parse(fs.readFileSync('design/track-review/levels.json','utf8'));
let seed=20260907;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(rand()*a.length)];
const between=(a,b)=>a+(b-a)*rand();
function geometryCheck(p){
  const pts=resample(p,12), ds=p.length/(pts.length-1);
  if(p.length<1100||p.length>3600||pts.some(q=>q.x<56||q.x>694||q.y<218||q.y>1132||distance(q,first.launcher)<112))return false;
  if(distance(pts[0],pts.at(-1))<125)return false;
  const q=new Set(pts.map(q=>Math.floor((Math.atan2(q.y-675,q.x-375)+Math.PI)*2/Math.PI)));
  if(q.size<4)return false;
  const angles=new Set(pts.map(q=>Math.floor(((Math.atan2(q.y-675,q.x-375)*180/Math.PI+360)%360)/2)));
  if(angles.size*2<224)return false;
  for(let i=1;i<pts.length-1;i++)if(radius(pts[i-1],pts[i],pts[i+1])<99)return false;
  for(let i=0;i<pts.length-1;i++)for(let j=i+2;j<pts.length-1;j++){
    if((j-i-1)*ds<240)continue;
    if(segmentDistance(pts[i],pts[i+1],pts[j],pts[j+1])<116)return false;
  }
  return true;
}
const extra=[
  {family:'上开口圆弧',geometry:{kind:'spiral',start:-2.6,turns:.84,rx0:290,ry0:385,rx1:290,ry1:385,wave:0,lobes:1}},
  {family:'偏心长尾回廊',geometry:{kind:'rounded',radius:105,points:[[95,275],[650,275],[650,1080],[100,1080],[100,505],[460,505]]}},
  {family:'下层发卡回廊',geometry:{kind:'rounded',radius:105,points:[[95,275],[650,275],[650,830],[100,830],[100,1070],[650,1070]]}},
  {family:'三角长尾',geometry:{kind:'rounded',radius:140,points:[[90,270],[650,600],[550,1090],[95,930],[95,400],[450,280]]}},
  {family:'偏心菱弧',geometry:{kind:'rounded',radius:160,points:[[200,260],[650,600],[550,1090],[95,760],[150,380]]}},
  {family:'侧向大回折',geometry:{kind:'rounded',radius:110,points:[[100,1080],[100,265],[650,265],[650,1070],[425,1070],[425,865]]}},
  {family:'双翼偏心回折',geometry:{kind:'rounded',radius:103,points:[[95,275],[645,275],[645,1080],[425,1080],[425,850],[95,850],[95,495],[375,495]]}},
  {family:'弧顶阶梯',geometry:{kind:'rounded',radius:103,points:[[105,270],[645,270],[645,1080],[100,1080],[100,850],[230,850],[230,485],[420,485]]}}
];
const bases=[...first.levels.map(l=>({family:l.family,geometry:l.geometry})),...extra];
function gridWalk(){
  const xs=[65,272,479,686],ys=[250,462,674,886,1098];
  let cell=[Math.floor(rand()*4),Math.floor(rand()*5)];
  const blocked=([x,y])=>y===2&&(x===1||x===2);
  if(blocked(cell))cell=[0,2];
  const walked=[cell],seen=new Set([cell.join(',')]);
  const goal=Math.floor(between(8,18));
  for(let n=1;n<goal;n++){
    const choices=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[cell[0]+dx,cell[1]+dy]).filter(c=>c[0]>=0&&c[0]<4&&c[1]>=0&&c[1]<5&&!blocked(c)&&!seen.has(c.join(',')));
    if(!choices.length)break;
    cell=pick(choices);seen.add(cell.join(','));walked.push(cell);
  }
  const points=walked.filter((p,i)=>i===0||i===walked.length-1||(walked[i+1][0]-p[0])*(p[1]-walked[i-1][1])!==(walked[i+1][1]-p[1])*(p[0]-walked[i-1][0])).map(([x,y])=>[xs[x],ys[y]]);
  return {family:points.length>=8?'多折台阶巡回':points.length>=6?'双回折廊道':'长边转向弯',geometry:{kind:'rounded',radius:between(99,103),points}};
}
const pool=[];
const attempts=Number(process.argv.find(a=>a.startsWith('--attempts='))?.split('=')[1]??16000);
for(let i=0;i<attempts;i++){
  const base=rand()<.72?gridWalk():pick(bases);
  const raw=JSON.parse(JSON.stringify(base.geometry));
  if(raw.kind==='spiral'){
    raw.turns=between(.76,1.55);raw.start=between(-Math.PI,Math.PI);
    raw.rx0=between(240,328);raw.ry0=between(335,435);raw.rx1=between(135,230);raw.ry1=between(175,290);
    if(rand()<.4){[raw.rx0,raw.rx1]=[raw.rx1,raw.rx0];[raw.ry0,raw.ry1]=[raw.ry1,raw.ry0];}
    raw.wave=between(0,.10);raw.lobes=pick([1,2,3]);
  }else if(raw.kind==='sine'){
    raw.amplitude=between(170,255);raw.top=between(222,310);raw.bottom=between(1040,1120);raw.cycles=between(.65,1.1);raw.phase=between(-2.5,-.3);
  }else{
    if(base.family.includes('台阶巡回')||base.family==='双回折廊道'||base.family==='长边转向弯'){
      raw.points=raw.points.map(([x,y])=>[x,y]);
    }else{
      raw.radius=between(100,195);
      raw.points=raw.points.map(([x,y])=>[x+between(-28,28),y+between(-55,55)]);
    }
  }
  const geometry={kind:'warped',base:raw,from:between(0,.14),to:between(.84,1),sx:between(.9,1.1),sy:between(.9,1.1),dx:between(-25,25),dy:between(-40,40),bendX:between(-60,60),bendY:between(-65,65),skewX:between(-55,55),skewY:between(-50,50)};
  if(rand()<.65&&raw.kind==='rounded'&&raw.radius<104){Object.assign(geometry,{from:0,to:1,sx:1,sy:1,dx:0,dy:0,bendX:0,bendY:0,skewX:0,skewY:0});}
  try{
    const path=parameterize(makePath(geometry));
    if(geometryCheck(path))pool.push({family:base.family,path,geometry});
  }catch{}
  if(i%2000===0)console.log(`candidate search ${i}/${attempts}; geometrically valid ${pool.length}`);
}
console.log(`pool ${pool.length}`);
const selected=first.levels.map(l=>({family:l.family,path:parameterize(makePath(l.geometry)),geometry:l.geometry,id:l.id}));
for(const candidate of pool)candidate.nearest=Math.min(...selected.map(s=>symmetricDifference(candidate.path,s.path)));
while(selected.length<100&&pool.length){
  pool.sort((a,b)=>b.nearest-a.nearest);
  const candidate=pool.shift();
  selected.push({...candidate,id:selected.length+1});
  for(const c of pool)c.nearest=Math.min(c.nearest,symmetricDifference(c.path,candidate.path));
  if(selected.length%10===0)console.log(`selected ${selected.length}, nearest ${candidate.nearest.toFixed(1)}px`);
}
fs.mkdirSync('design/track-review/generated',{recursive:true});
fs.writeFileSync('design/track-review/generated/catalog-candidates.json',JSON.stringify({status:'UNREVIEWED_GEOMETRY_CANDIDATES',attempts,poolCount:pool.length+selected.length-10,selected:selected.map(({path,nearest,...s})=>({...s,nearestAtSelection:nearest??null}))},null,2)+'\n');
console.log('Draft candidate pool saved. Not an approval or a release artifact.');
