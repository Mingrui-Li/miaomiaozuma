import { at } from './geometry.mjs';

// Procrustes fit with reversal/reflection; distances remain in the first path's pixels.
const cache=new WeakMap();
const centered = path => {
    if(cache.has(path))return cache.get(path);
    const pts = Array.from({ length: 81 }, (_, i) => at(path, path.length * i / 80));
    const cx = pts.reduce((s,p)=>s+p.x,0)/pts.length, cy = pts.reduce((s,p)=>s+p.y,0)/pts.length;
    const result=pts.map(p=>({x:p.x-cx,y:p.y-cy}));
    cache.set(path,result);return result;
  };
export function shapeDifference(pathA, pathB) {
  const a=centered(pathA), originalB=centered(pathB);
  let best=Infinity;
  for(const flip of [1,-1])for(const reverse of [false,true]){
    const b=(reverse?[...originalB].reverse():originalB).map(p=>({x:p.x*flip,y:p.y}));
    let real=0, imaginary=0, norm=0;
    for(let i=0;i<a.length;i++){real+=a[i].x*b[i].x+a[i].y*b[i].y;imaginary+=a[i].y*b[i].x-a[i].x*b[i].y;norm+=b[i].x**2+b[i].y**2;}
    const normA=a.reduce((s,p)=>s+p.x*p.x+p.y*p.y,0);
    best=Math.min(best,Math.sqrt(Math.max(0,normA-(real*real+imaginary*imaginary)/norm)/a.length));
  }
  return best;
}
export const symmetricDifference=(a,b)=>Math.min(shapeDifference(a,b),shapeDifference(b,a));
