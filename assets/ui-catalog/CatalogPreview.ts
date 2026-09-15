import {_decorator,Color,Graphics} from 'cc';
import {MMUICatalogBase} from './CatalogBase';
import {HudView} from '../game/scripts/ui/HudView';
import {Point,facility,TOOL_TOP} from '../ui-greybox/Layout';
import {at,cumulative,direction,sampleChain,occupiedBounds,launcherGap} from './ReviewLayout';
const {ccclass}=_decorator;

/** Visual review only. No time progression, random spawn, matching, rewards or platform calls. */
@ccclass('MMUICatalogPreview')
export class MMUICatalogPreview extends MMUICatalogBase {
  private phase=0;
  private obstacles=0;
  private lengths:number[][]=[];
  protected override onLoad():void {
    super.onLoad();this.lengths=this.fixtures.map(cumulative);
    if(typeof location!=='undefined'){
      const n=Number(new URLSearchParams(location.search).get('level'));
      if(Number.isInteger(n)&&n>=1&&n<=100)this.index=n-1;
    }
  }
  private change(delta:number):void {this.index=(this.index+delta+100)%100;this.cancelTouch();this.panel='';this.selected='';this.shots=0;this.swaps=0;}
  private arrow(g:Graphics,p:Point,u:Point,size=10):void {
    g.strokeColor=new Color('#785E50');g.lineWidth=3;
    g.moveTo(p.x-u.x*size-u.y*size*.65,-(p.y-u.y*size+u.x*size*.65));g.lineTo(p.x,-p.y);
    g.lineTo(p.x-u.x*size+u.y*size*.65,-(p.y-u.y*size-u.x*size*.65));g.stroke();
  }
  private obstacle(p:Point,r:number,boxed:boolean,name:string):void {
    const n=this.nodeAt(this.stage,name,p.x,p.y,r*2,r*2),g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();
    g.fillColor=new Color(boxed?'#D7A970':'#AAA8A2');g.strokeColor=new Color('#594B40');g.lineWidth=2;
    if(boxed){g.roundRect(-r*.66,-r*.66,r*1.32,r*1.32,4);g.fill();g.stroke();g.moveTo(-r*.66,0);g.lineTo(r*.66,0);g.moveTo(0,-r*.66);g.lineTo(0,r*.66);g.stroke();
      g.fillColor=new Color('#594B40');for(let i=0;i<(this.obstacles===1?2:1);i++){g.circle((i-.5)*r*.4,-r*.4,r*.09);g.fill();}
      if(this.obstacles===2){g.moveTo(-r*.4,r*.6);g.lineTo(-r*.1,r*.25);g.lineTo(-r*.3,0);g.stroke();}
    }else{g.circle(0,0,r*.9);g.fill();g.stroke();g.fillColor=new Color('#D7D5D0');for(const [x,y] of [[-.4,.3],[.35,.4],[.2,-.4]]){g.circle(x*r,y*r,r*.18);g.fill();}
      this.text(this.stage,name+'Hidden','?',p.x,p.y,r*1.5,r*1.5,26,'#4A332B');}
  }
  protected override track():void {
    const f=this.fixtures[this.index],s=this.lengths[this.index],line=this.lines[this.index];
    const n=this.nodeAt(this.stage,'Track',0,0,0,0),g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();
    g.strokeColor=new Color('#DBCDBA');g.lineWidth=f.trackWidth;g.lineCap=Graphics.LineCap.ROUND;g.lineJoin=Graphics.LineJoin.ROUND;
    g.moveTo(line[0].x,-line[0].y);for(const p of line.slice(1))g.lineTo(p.x,-p.y);g.stroke();
    // Direction cues use +s on the same source-derived polyline, including both ends.
    for(let d=60;d<s[s.length-1]-20;d+=220){const p=at(f,s,d),q=at(f,s,d+4),len=Math.hypot(q.x-p.x,q.y-p.y);this.arrow(g,p,{x:(q.x-p.x)/len,y:(q.y-p.y)/len});}
    for(const end of [false,true]){
      const poly=facility(f.points,end),anchor=end?f.points[f.points.length-1]:f.points[0],u=direction(f,end);
      g.fillColor=new Color(end?'#F4B8A7':'#A9D8C0');g.moveTo(poly[0].x,-poly[0].y);for(const p of poly.slice(1))g.lineTo(p.x,-p.y);g.close();g.fill();
      // Exactly one mouth centered at P(0)/P(L), perpendicular to the tangent.
      g.strokeColor=new Color('#594B40');g.lineWidth=7;g.moveTo(anchor.x-u.y*22,-(anchor.y+u.x*22));g.lineTo(anchor.x+u.y*22,-(anchor.y-u.x*22));g.stroke();
      const p=poly.reduce((a,b)=>({x:a.x+b.x/4,y:a.y+b.y/4}),{x:0,y:0});
      this.text(this.stage,end?'LairLabel':'SourceLabel',end?'老巢':'入口',p.x,p.y,72,28,18);
    }
    sampleChain(f,s,this.phase).forEach((p,i)=>{
      const boxed=i%12===4,hidden=i%12===8;
      if(this.obstacles>0&&this.obstacles<3&&(boxed||hidden))this.obstacle(p,f.catRadius,boxed,'Obstacle'+i);
      else this.cat(p,f.catRadius,i,'Chain'+i);
    });
    this.circle(this.stage,'Launcher',{x:375,y:675},52,'#A9D8C0');this.cat({x:375,y:675},f.catRadius,this.swaps%5,'CurrentCat');
    const next=this.previews[this.index];this.circle(this.stage,'NextFrame',next,f.catRadius+4,'#FFFBF4');this.cat(next,f.catRadius,(this.swaps+1)%5,'NextCat');
    if(next.docked)this.text(this.stage,'NextCaption','下一只',668,156,100,24,20);
    if(this.aim){g.strokeColor=new Color('#4A332B');g.lineWidth=3;g.moveTo(375,-675);g.lineTo(this.aim.x,-this.aim.y);g.stroke();}
    if(this.bounds){const b=occupiedBounds(f);this.outline(this.stage,{x:b.left,y:b.top,width:b.right-b.left,height:b.bottom-b.top});}
  }
  protected override renderContent():void {
    this.track();const f=this.fixtures[this.index];
    this.nodeAt(this.stage,'GameHud',375,667,750,1334,this.hudPrefab).getComponent(HudView)!.updateView(f.id,[.2,.57,.9][this.phase]);
    this.button(this.stage,'pause','Ⅱ',{x:32,y:64,width:88,height:88},()=>this.show('pause'));
    if(f.id>5)['逗猫棒','猫薄荷','彩虹猫'].forEach((label,i)=>this.button(this.stage,'tool'+i,this.selected===label?'取消选择':label,{x:92+i*195,y:TOOL_TOP,width:176,height:88},()=>{this.selected=this.selected===label?'':label;},this.selected===label));
    const phase=['开段','中段','末段'][this.phase],obs=['五猫','纸箱2 / 灰扑扑','纸箱1 / 灰扑扑','打开 / 揭示'][this.obstacles];
    this.notice=`${phase} · ${obs} · 静态压力样本`;
  }
  protected override dialog():void {
    this.box(this.stage,'Scrim',{x:0,y:0,width:750,height:1334},'#4A332B99',0);
    this.box(this.stage,'PausePanel',{x:90,y:430,width:570,height:470},'#FFFBF4',32);
    this.text(this.stage,'Title','歇一会儿喵',375,535,500,70,40);
    this.text(this.stage,'Copy','百关布局预览 · 未接入正式玩法',375,630,510,60,25);
    this.button(this.stage,'continue','继续回窝',{x:135,y:745,width:480,height:88},()=>this.show(''),true);
  }
  protected override toolbarControls():[string,string,()=>void][]{return[
    ['prev','上一关',()=>this.change(-1)],['next','下一关',()=>this.change(1)],
    ['phase',['开段','中段','末段'][this.phase],()=>{this.phase=(this.phase+1)%3;}],
    ['obstacles',['五猫','障碍2','障碍1','揭示'][this.obstacles],()=>{this.obstacles=(this.obstacles+1)%4;}],
    ['safe','安全区',()=>{this.notched=!this.notched;}],['bounds','边界',()=>{this.bounds=!this.bounds;}]
  ];}
  protected override render():void {
    super.render();const f=this.fixtures[this.index],s=this.lengths[this.index];
    if(typeof window!=='undefined')Object.assign((window as unknown as Record<string,object>).__UI_CATALOG__,{
      phase:this.phase,obstacles:this.obstacles,catDiameter:f.catRadius*2,trackWidth:f.trackWidth,spacing:f.spacing,
      source:f.points[0],lair:f.points[f.points.length-1],sourceDirection:direction(f,false),lairDirection:direction(f,true),
      occupied:occupiedBounds(f),launcherGap:launcherGap(f),chain:sampleChain(f,s,this.phase),renderPoints:this.lines[this.index].length,
      length:s[s.length-1],totalLevels:this.fixtures.length});
  }
}
