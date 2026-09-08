import {resample,makeCats,visibleState} from './geometry.mjs';
export const profileFor=id=>id<=20?{catRadius:32,projectileRadius:30,spacing:66,trackWidth:88,minGap:112,minRadius:96,clearance:108}:{catRadius:28,projectileRadius:28,spacing:58,trackWidth:72,minGap:88,minRadius:84,clearance:108};

export function reviewLabel(id,geometry,metrics){
  const early=['庭院迎接','斜坡转角','花圃双弯','水滴庭心','折腰急送','底边回折','上下回弯','弧顶双湾','双峰长廊','右岸回折','坡顶折返','两端回钩','高低花台','上下双湾','右侧长廊','上下折返','庭心巡游','上下长廊','长边换向','方院回廊'];
  if(id<=20)return early[id-1];
  if(geometry.kind==='rounded')return '多层折返';
  const depth=metrics.threeLayerDegrees>0?'局部三层':'双层';
  return depth+(geometry.rx0>geometry.rx1?'内旋':'外展');
}

// Count intersections of an aimed ray with the TRACK CENTERLINE, not the number
// of adjacent cats along a tangent. This measures geometry, not live collision.
export function radialLayers(path,origin={x:375,y:675},minGap=88){
  const points=resample(path,7), bins=[];
  for(let degrees=0;degrees<360;degrees++){
    const angle=degrees*Math.PI/180,dx=Math.cos(angle),dy=Math.sin(angle),hits=[];
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],vx=b.x-a.x,vy=b.y-a.y;
      const den=dx*vy-dy*vx;
      if(Math.abs(den)<1e-8)continue;
      const x=a.x-origin.x,y=a.y-origin.y,t=(x*vy-y*vx)/den,u=(x*dy-y*dx)/den;
      if(t>=0&&u>=0&&u<1)hits.push(t);
    }
    hits.sort((a,b)=>a-b);
    const separated=[];for(const t of hits)if(!separated.length||t-separated.at(-1)>=minGap*.8)separated.push(t);
    bins.push(separated.length);
  }
  return {twoLayerDegrees:bins.filter(n=>n>=2).length,threeLayerDegrees:bins.filter(n=>n>=3).length,maxLayers:Math.max(...bins),bins};
}
export function pressure(path,profile){
  const radial=radialLayers(path,undefined,profile.minGap);
  const snapshots=[.45,.72,.94].map(headRatio=>{
    const cats=makeCats(path,headRatio,profile.spacing,profile.catRadius),v=visibleState({x:375,y:675},cats,profile.catRadius+profile.projectileRadius);
    return {headRatio,catCount:cats.length,hiddenCats:v.hidden.size,hiddenRatio:v.hidden.size/cats.length,headVisible:v.first.has(cats.at(-1).id)};
  });
  // A prioritization aid, explicitly NOT a player win-rate or calibrated difficulty.
  const score=100*(.45*radial.twoLayerDegrees/360+.25*Math.min(1,radial.threeLayerDegrees/90)+.3*snapshots.at(-1).hiddenRatio);
  return {...radial,snapshots,score:Number(score.toFixed(1))};
}
