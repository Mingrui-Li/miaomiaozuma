/** Greybox layout only. Coordinates are 750×1334, top-left, y down. */
export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }
export interface Fixture { id: number; name: string; catRadius: number; trackWidth: number; spacing: number; points: Point[] }
export const BASE = { width: 750, height: 1334 };
export const LAUNCHER = { x: 375, y: 675 };
export const HUD_BOTTOM = 168;
export const TOOL_TOP = 1188;
/** Enlarge touch only; keep art and source geometry unchanged. Units match rect. */
export function touchRect(rect: Rect, unitsPerCssPixel: number): Rect {
  const minimum=44*unitsPerCssPixel;
  const width=Math.max(rect.width,minimum),height=Math.max(rect.height,minimum);
  return {x:rect.x+(rect.width-width)/2,y:rect.y+(rect.height-height)/2,width,height};
}
export function contains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x-a.x)*dx + (p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(p.x-a.x-t*dx, p.y-a.y-t*dy);
}
/** Rendering tessellation only: preserves endpoints; source/collision points are untouched. */
export function renderPolyline(points: Point[], tolerance=0.25): Point[] {
  const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]];
  while(stack.length){
    const [a,b]=stack.pop()!;let maximum=tolerance,index=-1;
    for(let i=a+1;i<b;i++){const d=segmentDistance(points[i],points[a],points[b]);if(d>maximum){maximum=d;index=i;}}
    if(index>=0){keep.add(index);stack.push([a,index],[index,b]);}
  }
  // Creator web builds use loose spread transforms; concat(Set) is not iterable expansion.
  return Array.from(keep).sort((a,b)=>a-b).map(i=>points[i]);
}
export function facility(points: Point[], end: boolean): Point[] {
  const p = end ? points[points.length-1] : points[0];
  const q = end ? points[points.length-2] : points[1];
  const d = Math.hypot(p.x-q.x, p.y-q.y), ux=(p.x-q.x)/d, uy=(p.y-q.y)/d;
  return [{x:p.x-uy*40,y:p.y+ux*40},{x:p.x+uy*40,y:p.y-ux*40},
    {x:p.x+uy*40+ux*40,y:p.y-ux*40+uy*40},{x:p.x-uy*40+ux*40,y:p.y+ux*40+uy*40}];
}
function polygonDistance(p: Point, poly: Point[]): number {
  let inside = false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside ? 0 : Math.min(...poly.map((a,i)=>segmentDistance(p,a,poly[(i+1)%poly.length])));
}
export function nextClearance(f: Fixture, p: Point): number {
  const r=f.catRadius+4;
  let gap=Math.hypot(p.x-LAUNCHER.x,p.y-LAUNCHER.y)-52-r;
  for(let i=1;i<f.points.length;i++) gap=Math.min(gap,segmentDistance(p,f.points[i-1],f.points[i])-Math.max(f.trackWidth/2,f.catRadius)-r);
  return Math.min(gap,polygonDistance(p,facility(f.points,false))-r,polygonDistance(p,facility(f.points,true))-r);
}
export function chooseNext(f: Fixture): Point & { docked: boolean; gap: number } {
  let best={x:0,y:0,gap:-Infinity,docked:false};
  // Stable per-level candidates; never move this preview with the moving chain.
  for(const d of [92,96,100,104,108,112]) for(const a of [15,25,35,45,55,65,75,85]) {
    const p={x:375+Math.cos(a*Math.PI/180)*d,y:675+Math.sin(a*Math.PI/180)*d};
    const gap=nextClearance(f,p);
    if(gap>best.gap) best={...p,gap,docked:false};
  }
  if(best.gap>=8) return best;
  const p={x:668,y:108};
  return {...p,gap:nextClearance(f,p),docked:true};
}
export function envelope(f: Fixture): {top: number; bottom: number} {
  const pad=Math.max(f.trackWidth/2,f.catRadius);
  const ys=[...facility(f.points,false),...facility(f.points,true)].map(p=>p.y);
  return {top:Math.min(...f.points.map(p=>p.y-pad),...ys),bottom:Math.max(...f.points.map(p=>p.y+pad),...ys)};
}
/** CSS safe rect and capsule must use the same top-left CSS coordinate system. */
export function fitStage(viewport: Rect, safe: Rect, capsule?: Rect): Rect & {scale:number} {
  const left=Math.max(viewport.x,safe.x),right=Math.min(viewport.x+viewport.width,safe.x+safe.width);
  let top=Math.max(viewport.y,safe.y);
  const bottom=Math.min(viewport.y+viewport.height,safe.y+safe.height);
  if(capsule && capsule.x<right && capsule.x+capsule.width>left && capsule.y<bottom && capsule.y+capsule.height>top) top=Math.max(top,capsule.y+capsule.height+8);
  const scale=Math.max(0,Math.min((right-left)/BASE.width,(bottom-top)/BASE.height));
  return {x:left+(right-left-BASE.width*scale)/2,y:top+(bottom-top-BASE.height*scale)/2,width:BASE.width*scale,height:BASE.height*scale,scale};
}
export function unmap(p: Point, fitted: Rect & {scale:number}): Point {
  return {x:(p.x-fitted.x)/fitted.scale,y:(p.y-fitted.y)/fitted.scale};
}
export type GestureOwner = 'ui' | 'game' | 'blocked';
export class GestureGate {
  private active: { id:number; owner:GestureOwner; start:Point; dragged:boolean } | null=null;
  begin(id:number,p:Point,owner:GestureOwner): boolean {
    if(this.active) return false;
    this.active={id,owner,start:p,dragged:false}; return true;
  }
  move(id:number,p:Point): void { if(this.active?.id===id && Math.hypot(p.x-this.active.start.x,p.y-this.active.start.y)>16) this.active.dragged=true; }
  end(id:number,p:Point): 'none'|'ui'|'swap'|'aim' {
    if(!this.active || this.active.id!==id) return 'none';
    this.move(id,p); const a=this.active; this.active=null;
    if(a.owner==='blocked') return 'none';
    if(a.owner==='ui') return a.dragged ? 'none':'ui';
    const central=(q:Point)=>Math.hypot(q.x-375,q.y-675)<=48;
    if(!a.dragged && central(a.start) && central(p)) return 'swap';
    return central(p) ? 'none':'aim';
  }
  cancel(): void { this.active=null; }
}
