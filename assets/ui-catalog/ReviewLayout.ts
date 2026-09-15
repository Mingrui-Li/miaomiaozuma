import {Fixture,Point,segmentDistance,facility,LAUNCHER} from '../ui-greybox/Layout';
export interface ReviewFixture extends Fixture {chapter:number}
export function cumulative(f:Fixture):number[]{const s=[0];for(let i=1;i<f.points.length;i++)s.push(s[i-1]+Math.hypot(f.points[i].x-f.points[i-1].x,f.points[i].y-f.points[i-1].y));return s;}
export function at(f:Fixture,s:number[],d:number):Point {
  d=Math.max(0,Math.min(s[s.length-1],d));let lo=1,hi=s.length-1;
  while(lo<hi){const m=(lo+hi)>>1;if(s[m]<d)lo=m+1;else hi=m;}
  const a=f.points[lo-1],b=f.points[lo],t=(d-s[lo-1])/(s[lo]-s[lo-1]||1);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}
/** Three static occupancy samples, deliberately not a spawn plan or gameplay simulation. */
export function sampleChain(f:Fixture,s:number[],phase:number):Point[]{
  const length=s[s.length-1],count=Math.min(30,Math.floor((length-f.catRadius*2)/f.spacing));
  const span=(count-1)*f.spacing;
  const first=phase===0?f.catRadius:phase===1?Math.max(f.catRadius,(length-span)/2):length-f.catRadius-1-span;
  return Array.from({length:count},(_,i)=>at(f,s,first+i*f.spacing));
}
export function direction(f:Fixture,end:boolean):Point{
  const a=end?f.points[f.points.length-2]:f.points[0],b=end?f.points[f.points.length-1]:f.points[1],len=Math.hypot(b.x-a.x,b.y-a.y);return{x:(b.x-a.x)/len,y:(b.y-a.y)/len};
}
export function occupiedBounds(f:Fixture):{left:number;right:number;top:number;bottom:number}{
 const r=Math.max(f.catRadius,f.trackWidth/2),polys=[...facility(f.points,false),...facility(f.points,true)];
 return{left:Math.min(...f.points.map(p=>p.x-r),...polys.map(p=>p.x)),right:Math.max(...f.points.map(p=>p.x+r),...polys.map(p=>p.x)),top:Math.min(...f.points.map(p=>p.y-r),...polys.map(p=>p.y)),bottom:Math.max(...f.points.map(p=>p.y+r),...polys.map(p=>p.y))};
}
export function launcherGap(f:Fixture):number{return Math.min(...f.points.slice(1).map((p,i)=>segmentDistance(LAUNCHER,f.points[i],p)))-Math.max(f.catRadius,f.trackWidth/2)-52;}
