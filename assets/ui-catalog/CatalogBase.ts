import { CommonButton, ButtonState } from '../game/scripts/ui/CommonButton';
import { HudView } from '../game/scripts/ui/HudView';
import { PanelView } from '../game/scripts/ui/PanelView';
import { _decorator, Color, Component, Font, JsonAsset, instantiate, Prefab, EventTouch, Game, game, Graphics, input, Input, Label, Node, ResolutionPolicy, screen, Sprite, SpriteFrame, sys, Texture2D, UITransform, Vec3, view } from 'cc';
import type { Fixture } from '../ui-greybox/Layout';
import { chooseNext, contains, envelope, facility, fitStage, GestureGate, HUD_BOTTOM, Point, Rect, renderPolyline, TOOL_TOP, touchRect, unmap } from '../ui-greybox/Layout';

const { ccclass, property } = _decorator;
const C={bg:'#FFF5E6',surface:'#FFFBF4',quiet:'#F2E6D5',ink:'#4A332B',muted:'#785E50',orange:'#FFC078',pressed:'#E8A456',mint:'#A9D8C0',danger:'#F4B8A7'};
type Hit={name:string;rect:Rect;visualRect:Rect;action:()=>void;space:'stage'|'screen';state?:ButtonState};
export type Panel=''|'pause'|'win'|'lose'|'ad'|'error'|'restart'|'exit'|'settings'|'entry'|'share'|'details'|'privacy'|'booster'|'purchase'|'saveError'|'loadError'|'test'|'reward'|'restore'|'shareResult';

/** Deliberately isolated UI harness: no GameSession, SaveService, inventory or real ads. */
@ccclass('MMUICatalogBase')
export class MMUICatalogBase extends Component {
  @property(JsonAsset) catalogData:JsonAsset|null=null;
  protected fixtures:Fixture[]=[];
  protected previews:ReturnType<typeof chooseNext>[]=[];
  protected lines:Point[][]=[];
  protected sourceSHA="";
  @property([Texture2D]) catTextures:Texture2D[]=[];
  /** primary, primary pressed, secondary, secondary pressed, disabled, panel, pause. */
  @property([Texture2D]) uiTextures:Texture2D[]=[];
  @property(Prefab) buttonPrefab:Prefab|null=null;
  @property(Prefab) panelPrefab:Prefab|null=null;
  @property(Prefab) hudPrefab:Prefab|null=null;
  @property(Prefab) homePrefab:Prefab|null=null;
  @property(Font) uiFont:Font|null=null;
  protected retained=new Set<Node>();
  protected stateSample=0;
  protected entryTitle='';
  protected sound=true;
  protected vibration=true;
  protected catFrames:SpriteFrame[]=[];
  protected uiFrames:SpriteFrame[]=[];
  protected root!:Node;
  protected stage!:Node;
  protected size={width:750,height:1334};
  protected fitted=fitStage({x:0,y:0,width:750,height:1334},{x:0,y:0,width:750,height:1334});
  protected index=0;
  protected panel:Panel='';
  protected home=false;
  protected notched=false;
  protected bounds=false;
  protected hits:Hit[]=[];
  protected gate=new GestureGate();
  protected pressed:Hit|null=null;
  protected pressedId:number|null=null;
  protected aim:Point|null=null;
  protected shots=0;
  protected swaps=0;
  protected resumes=0;
  protected selected='';
  protected notice='静态样本 · 不写入正式存档';
  protected redraw=true;
  protected cssScale=1;

  protected override onLoad():void {
    const data=this.catalogData!.json as {levels:Fixture[];sourceSHA:string};this.fixtures=data.levels;this.sourceSHA=data.sourceSHA;
    this.previews=this.fixtures.map(chooseNext);this.lines=this.fixtures.map(f=>renderPolyline(f.points));
    this.catFrames=this.catTextures.map(texture=>{const f=new SpriteFrame();f.texture=texture;return f;});
    this.uiFrames=this.uiTextures.map((texture,i)=>{const f=new SpriteFrame();f.texture=texture;const inset=i===5?36:i===6?0:30;f.insetLeft=f.insetRight=f.insetTop=f.insetBottom=inset;return f;});
    view.setDesignResolutionSize(750,1334,ResolutionPolicy.FIXED_WIDTH);
    this.root=new Node('UIPreviewRoot');this.root.layer=this.node.layer;this.root.addComponent(UITransform);this.node.addChild(this.root);
    input.on(Input.EventType.TOUCH_START,this.startTouch,this);
    input.on(Input.EventType.TOUCH_MOVE,this.moveTouch,this);
    input.on(Input.EventType.TOUCH_END,this.endTouch,this);
    input.on(Input.EventType.TOUCH_CANCEL,this.cancelled,this);
    game.on(Game.EVENT_HIDE,this.hide,this);
    view.on('canvas-resize',this.resize,this);
    this.scheduleOnce(()=>this.draw(),0);
  }
  protected override onDestroy():void {
    for(const frame of [...this.catFrames,...this.uiFrames])frame.destroy();
    input.off(Input.EventType.TOUCH_START,this.startTouch,this); input.off(Input.EventType.TOUCH_MOVE,this.moveTouch,this);
    input.off(Input.EventType.TOUCH_END,this.endTouch,this); input.off(Input.EventType.TOUCH_CANCEL,this.cancelled,this);
    game.off(Game.EVENT_HIDE,this.hide,this);view.off('canvas-resize',this.resize,this);
    if(typeof window!=='undefined') delete (window as unknown as Record<string,unknown>).__UI_CATALOG__;
  }
  protected resize():void {this.cancelTouch();this.scheduleOnce(()=>this.draw(),0);}
  protected override lateUpdate():void {if(this.redraw && this.root){this.redraw=false;this.render();}}
  protected hide():void {this.cancelTouch();if(!this.home && !this.panel)this.panel='pause';this.draw();}
  protected screenPoint(e:EventTouch):Point {
    const p=e.getUILocation(),local=this.root.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
    return {x:local.x+this.size.width/2,y:this.size.height/2-local.y};
  }
  protected hitAt(p:Point):Hit|undefined {return [...this.hits].reverse().find(h=>contains(h.rect,h.space==='stage'?unmap(p,this.fitted):p));}
  protected startTouch(e:EventTouch):void {
    const id=e.getID()??0,p=this.screenPoint(e),hit=this.hitAt(p),q=unmap(p,this.fitted);
    const owner=hit?'ui':this.panel||this.home||!contains({x:0,y:HUD_BOTTOM,width:750,height:TOOL_TOP-HUD_BOTTOM},q)?'blocked':'game';
    if(!this.gate.begin(id,q,owner))return;
    this.pressed=hit??null;this.pressedId=id;
    if(owner==='game')this.aim=q;
    this.draw();
  }
  protected moveTouch(e:EventTouch):void {
    const id=e.getID()??0;if(id!==this.pressedId)return;
    const q=unmap(this.screenPoint(e),this.fitted);this.gate.move(id,q);
    if(this.aim){this.aim=q;this.draw();}
  }
  protected endTouch(e:EventTouch):void {
    const id=e.getID()??0;if(id!==this.pressedId)return;
    const p=this.screenPoint(e),q=unmap(p,this.fitted),hit=this.pressed;
    const result=this.gate.end(id,q);this.pressed=null;this.pressedId=null;this.aim=null;
    if(result==='ui' && hit && contains(hit.rect,hit.space==='stage'?q:p))hit.action();
    if(result==='swap' && !this.panel){this.swaps++;this.notice='已交换当前 / 下一只（演示）';}
    if(result==='aim' && !this.panel && contains({x:0,y:HUD_BOTTOM,width:750,height:TOOL_TOP-HUD_BOTTOM},q)){
      if(this.selected){this.notice=this.selected+'目标已选择（演示，不扣库存）';this.selected='';}
      else {this.shots++;this.notice='收到发射意图（灰盒不执行碰撞/消除）';}
    }
    this.draw();
  }
  protected cancelTouch():void {this.gate.cancel();this.aim=null;this.pressed=null;this.pressedId=null;}
  protected cancelled():void {this.cancelTouch();this.draw();}
  protected show(panel:Panel):void {this.cancelTouch();this.selected='';this.panel=panel;}
  protected nodeAt(parent:Node,name:string,x:number,y:number,w:number,h:number,prefab?:Prefab|null):Node {
    let n=parent.getChildByName(name);
    if(!n){n=prefab?instantiate(prefab):new Node(name);n.name=name;n.layer=this.node.layer;if(!n.getComponent(UITransform))n.addComponent(UITransform);parent.addChild(n);this.retained.add(n);}
    if(prefab&&this.uiFont)for(const label of n.getComponentsInChildren(Label)){if(label.font!==this.uiFont){label.font=this.uiFont;label.useSystemFont=false;}}
    n.active=true;n.setSiblingIndex(parent.children.length-1);n.getComponent(UITransform)!.setContentSize(w,h);
    const size=parent===this.root?this.size:{width:750,height:1334};n.setPosition(x-size.width/2,size.height/2-y);return n;
  }
  protected box(parent:Node,name:string,r:Rect,color:string,radius=16):Node {
    const n=this.nodeAt(parent,name,r.x+r.width/2,r.y+r.height/2,r.width,r.height),g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();
    g.fillColor=new Color(color);g.roundRect(-r.width/2,-r.height/2,r.width,r.height,Math.min(radius,r.width/2,r.height/2));g.fill();return n;
  }
  protected text(parent:Node,name:string,s:string,x:number,y:number,w:number,h:number,size=28,color=C.ink):void {
    const n=this.nodeAt(parent,name,x,y,w,h),l=n.getComponent(Label)??n.addComponent(Label);if(this.uiFont){l.font=this.uiFont;l.useSystemFont=false;}l.string=s;l.fontSize=size;l.lineHeight=size+6;l.color=new Color(color);l.isBold=size>=32;
    // Bound text width ourselves; CJK ascent metrics can over-shrink short rows.
    const units=Array.from(s).reduce((sum,ch)=>sum+(/[\u0000-\u007f]/.test(ch)?0.58:1),0);
    l.fontSize=Math.min(size,Math.floor((w-8)/Math.max(1,units)));l.lineHeight=l.fontSize+4;
    l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.CLAMP;l.enableWrapText=false;
    n.getComponent(UITransform)!.setContentSize(w,h);
  }
  protected button(parent:Node,name:string,label:string,r:Rect,action:()=>void,primary=false,state:ButtonState='normal'):void {
    if(parent===this.stage){
      const n=this.nodeAt(parent,name,r.x+r.width/2,r.y+r.height/2,r.width,r.height,this.buttonPrefab);
      n.getComponent(CommonButton)!.configure(this.uiFrames,primary,label,r.width,r.height,state==='normal'&&this.pressed?.name===name?'pressed':state);
      if(name==='pause'){n.getComponent(CommonButton)!.caption!.string='';this.sprite(parent,'PauseIcon',{x:r.x+12,y:r.y+12,width:64,height:64},this.uiFrames[6]);}
    }else{
      this.box(parent,name,r,this.pressed?.name===name?C.pressed:C.quiet,16);
      this.text(parent,name+'Label',label,r.x+r.width/2,r.y+r.height/2,r.width-8,r.height,22);
    }
    const space=parent===this.root?'screen':'stage';const rect=space==='stage'?touchRect(r,1/(this.cssScale*this.fitted.scale)):r;
    this.hits.push({name,rect,visualRect:r,action:()=>{if(state==='normal')action();},space,state});
    if(this.bounds)this.outline(parent,rect);
  }
  protected outline(parent:Node,r:Rect):void {
    const n=this.nodeAt(parent,'Bounds'+r.x+'_'+r.y,r.x,r.y,0,0),g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();g.strokeColor=new Color('#DC6A6A');g.lineWidth=1;g.rect(0,-r.height,r.width,r.height);g.stroke();
  }
  protected circle(parent:Node,name:string,p:Point,r:number,color:string):void {
    const n=this.nodeAt(parent,name,p.x,p.y,r*2,r*2),g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();g.fillColor=new Color(color);g.circle(0,0,r);g.fill();
  }
  protected sprite(parent:Node,name:string,r:Rect,frame:SpriteFrame,sliced=false):void {
    const n=this.nodeAt(parent,name,r.x+r.width/2,r.y+r.height/2,r.width,r.height),sprite=n.getComponent(Sprite)??n.addComponent(Sprite);
    sprite.color=new Color('#FFFFFF');sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.type=sliced?Sprite.Type.SLICED:Sprite.Type.SIMPLE;sprite.spriteFrame=frame;
  }
  protected cat(p:Point,r:number,breed:number,name='Cat'+breed):void {
    const frame=this.catFrames[breed%5];
    if(frame){this.sprite(this.stage,name,{x:p.x-r,y:p.y-r,width:r*2,height:r*2},frame);if(this.bounds)this.outline(this.stage,{x:p.x-r,y:p.y-r,width:r*2,height:r*2});return;}
    const colors=['#EAA05E','#DDCBBE','#88A9BC','#F0D8B7','#565363'];
    this.circle(this.stage,name,p,r,colors[breed%5]);
    const labels=['橘','布','蓝','花','玄'];this.text(this.stage,name+'Breed',labels[breed%5],p.x,p.y,r*2,r*2,24,breed%5===4?'#FFFBF4':C.ink);
    if(this.bounds)this.outline(this.stage,{x:p.x-r,y:p.y-r,width:r*2,height:r*2});
  }
  protected track():void {
    const f=this.fixtures[this.index],n=this.nodeAt(this.stage,'Track',0,0,0,0),g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();
    g.strokeColor=new Color('#DBCDBA');g.lineWidth=f.trackWidth;g.lineCap=Graphics.LineCap.ROUND;g.lineJoin=Graphics.LineJoin.ROUND;
    const line=this.lines[this.index];g.moveTo(line[0].x,-line[0].y);for(const p of line.slice(1))g.lineTo(p.x,-p.y);g.stroke();
    for(const end of [false,true]){
      const polygon=facility(f.points,end);g.fillColor=new Color(end?C.danger:C.mint);g.moveTo(polygon[0].x,-polygon[0].y);
      for(const p of polygon.slice(1))g.lineTo(p.x,-p.y);g.close();g.fill();
      const p=polygon.reduce((s,p)=>({x:s.x+p.x/4,y:s.y+p.y/4}),{x:0,y:0});
      this.text(this.stage,end?'LairLabel':'SourceLabel',end?'老巢':'入口',p.x,p.y,80,32,20);
    }
    let distance=0,next=100,count=0;
    for(let i=1;i<f.points.length;i++){
      const a=f.points[i-1],b=f.points[i],len=Math.hypot(b.x-a.x,b.y-a.y);
      if(distance+len>=next && count<30){const t=(next-distance)/len;this.cat({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},f.catRadius,count++);next+=f.spacing;}
      distance+=len;
    }
    this.circle(this.stage,'Launcher',{x:375,y:675},52,C.mint);this.cat({x:375,y:675},f.catRadius,this.swaps%5,'CurrentCat');
    const preview=this.previews[this.index];this.circle(this.stage,'NextFrame',preview,f.catRadius+4,C.surface);this.cat(preview,f.catRadius,(this.swaps+1)%5,'NextCat');
    if(preview.docked)this.text(this.stage,'NextCaption','下一只',668,156,100,24,20);
    if(this.aim){g.strokeColor=new Color(C.ink);g.lineWidth=3;g.moveTo(375,-675);g.lineTo(this.aim.x,-this.aim.y);g.stroke();}
    if(this.bounds){const e=envelope(f);this.outline(this.stage,{x:0,y:e.top,width:750,height:e.bottom-e.top});this.outline(this.stage,{x:0,y:64,width:750,height:104});}
  }
  protected dialog():void {
    this.box(this.stage,'ModalScrim',{x:0,y:0,width:750,height:1334},'#4A332B99',0);
    const titles:Partial<Record<Exclude<Panel,''>,string>>={pause:'歇一会儿喵',win:'猫猫到家啦！',lose:'差一点到家',ad:'准备继续回窝',error:'暂时没有可用视频',restart:'重新开始这一关？',exit:'返回首页？',settings:'设置',entry:this.entryTitle,share:'分享回窝时刻'};
    const message=this.panel==='win'?'又送一群小猫回家啦':this.panel==='ad'?'视频准备中，也可以免费重开':this.panel==='error'?'稍后再试，或免费重新开始':'猫猫等你一起回窝';
    this.nodeAt(this.stage,'DialogPanel',375,710,606,800,this.panelPrefab).getComponent(PanelView)!.configure(this.uiFrames[5],titles[this.panel as Exclude<Panel,''>]??'',message,800);
    const b=(name:string,label:string,y:number,action:()=>void,primary=false)=>this.button(this.stage,name,label,{x:135,y,width:480,height:88},action,primary);
    const restart=()=>{this.panel='';this.shots=0;this.resumes=0;this.selected='';this.notice='重开布局演示，原型存档未改';};
    if(this.panel==='pause'){
      b('continue','继续回窝',530,()=>this.show(''),true);b('restart','重新开始',650,()=>this.show('restart'));
      b('settings','设置',770,()=>this.show('settings'));b('exit','返回首页',890,()=>this.show('exit'));
    }else if(this.panel==='win'){
      this.cat({x:375,y:550},64,0,'WinCat');
      b('next',this.index===6?'回到关卡':'下一关',650,()=>{this.index=(this.index+1)%this.fixtures.length;this.panel='';},true);
      b('share','分享回窝时刻',780,()=>this.show('share'));b('home','返回首页',910,()=>{this.home=true;this.panel='';});
    }else if(this.panel==='restart'||this.panel==='exit'){
      const exit=this.panel==='exit';b('confirm','确认',570,()=>{if(exit){this.home=true;this.panel='';}else restart();},true);b('cancel','取消',700,()=>this.show('pause'));
    }else if(this.panel==='settings'){
      b('sound',this.sound?'声音：开':'声音：关',530,()=>{this.sound=!this.sound;});
      b('vibration',this.vibration?'震动：开':'震动：关',650,()=>{this.vibration=!this.vibration;});
      b('back','返回',810,()=>this.show(this.home?'':'pause'));
    }else if(this.panel==='entry'||this.panel==='share'){
      this.text(this.stage,'EntryCopy',this.panel==='share'?'录屏分享将在平台接入后开放':'页面将在后续阶段接入',375,610,520,60,28);
      b('unavailable',this.panel==='share'?'暂无可分享视频':'暂未开放',730,()=>{},false);
      const last=this.hits[this.hits.length-1];last.state='disabled';last.action=()=>{};
      this.stage.getChildByName('unavailable')!.getComponent(CommonButton)!.setState('disabled');
      b('back','返回',890,()=>this.show(this.panel==='share'?'win':''));
    }else{
      if(this.panel==='ad'){
        this.button(this.stage,'adLoading','视频准备中…',{x:135,y:560,width:480,height:88},()=>{},true,'loading');
      }else{
        const free=this.fixtures[this.index].id<=5;
        b('revive',free?(this.resumes?'本局免费次数已用':'免费继续'):'看视频继续',560,()=>{
          if(free){if(!this.resumes){this.resumes++;this.show('');}else this.notice='本局免费次数已用；可免费重开或退出';}
          else this.show('ad');
        },true);
        if(free&&this.resumes){const hit=this.hits[this.hits.length-1];hit.state='disabled';hit.action=()=>{};this.stage.getChildByName('revive')!.getComponent(CommonButton)!.setState('disabled');}
      }
      b('freeRestart','免费重开',872,()=>{this.resumes=0;restart();});b('freeExit','返回首页',992,()=>{this.home=true;this.panel='';});
    }
  }
  protected draw():void {this.redraw=true;}
  protected render():void {
    if(!this.root)return;
    for(const child of Array.from(this.retained))child.active=false;this.hits=[];this.size=view.getVisibleSize();this.root.getComponent(UITransform)!.setContentSize(this.size.width,this.size.height);
    const w=this.size.width,h=this.size.height;
    this.cssScale=screen.windowSize.width/screen.devicePixelRatio/w;
    this.box(this.root,'Backdrop',{x:0,y:0,width:w,height:h},'#E8DFD4',0);
    const actual=sys.getSafeAreaRect(false);
    const safe={x:actual.x,y:h-actual.y-actual.height,width:actual.width,height:actual.height};
    if(this.notched){safe.y=Math.max(safe.y,72);safe.height=Math.max(1,Math.min(h-60,safe.y+safe.height)-safe.y);}
    const toolbarHeight=48/this.cssScale,toolbarY=safe.y+safe.height-toolbarHeight;
    const capsule=this.notched?{x:w-190,y:safe.y+8,width:166,height:48}:undefined;
    this.fitted=fitStage({x:0,y:0,width:w,height:toolbarY},safe,capsule);
    this.stage=this.nodeAt(this.root,'Stage',this.fitted.x+this.fitted.width/2,this.fitted.y+this.fitted.height/2,750,1334);this.stage.setScale(this.fitted.scale,this.fitted.scale,1);
    this.box(this.stage,'Background',{x:0,y:0,width:750,height:1334},C.bg,0);
    this.text(this.stage,'HarnessCaption','UI-07 · 百关视觉预览',375,26,700,32,22,C.muted);
    this.renderContent();
    this.text(this.stage,'Status',this.notice,375,1310,710,30,20,C.muted);
    if(this.panel){this.hits=[];this.dialog();}
    const controls=this.toolbarControls();
    controls.forEach(([name,label,action],i)=>this.button(this.root,'debug-'+name,label,{x:safe.x+i*safe.width/6+3,y:toolbarY+2/this.cssScale,width:safe.width/6-6,height:44/this.cssScale},action));
    if(capsule)this.box(this.root,'SimulatedCapsule',capsule,'#4A332B',24);
    if(this.bounds)this.outline(this.root,safe);
    const f=this.fixtures[this.index],e=envelope(f);
    // Read-only browser QA snapshot: controls remain real Cocos touch interactions.
    if(typeof window!=='undefined')(window as unknown as Record<string,unknown>).__UI_CATALOG__={
      engine:'Cocos Creator 3.8.8',fixtureOnly:true,sourceSHA:this.sourceSHA,level:f.id,panel:this.panel,home:this.home,notched:this.notched,bounds:this.bounds,
      viewport:{width:w,height:h},engineViewport:view.getViewportRect(),visibleOrigin:view.getVisibleOrigin(),canvasWorld:this.node.worldPosition.clone(),safe,toolbarHeight,fontLoaded:!!this.uiFont,fit:this.fitted,next:this.previews[this.index],topGap:e.top-HUD_BOTTOM,bottomGap:TOOL_TOP-e.bottom,
      shots:this.shots,swaps:this.swaps,resumes:this.resumes,selected:this.selected,notice:this.notice,
      retainedNodes:this.retained.size,prefabs:{button:!!this.buttonPrefab,panel:!!this.panelPrefab,hud:!!this.hudPrefab,home:!!this.homePrefab},stateSample:this.stateSample,sound:this.sound,vibration:this.vibration,assetBatch:{cats:this.catFrames.length,ui:this.uiFrames.length},cssScale:this.cssScale,controls:this.hits.map(({name,rect,visualRect,space,state})=>({name,rect,visualRect,space,state}))};
  }
  protected renderContent():void {
    if(this.home){
      this.nodeAt(this.stage,'HomeView',375,667,750,1334,this.homePrefab);
      this.circle(this.stage,'HomeNest',{x:375,y:610},164,C.mint);this.cat({x:375,y:585},128,0,'HomeCat');
      this.cat({x:180,y:722},64,1,'HomeRagdoll');this.cat({x:570,y:722},64,4,'HomeBlack');
      const state:ButtonState=this.stateSample===1?'disabled':this.stateSample===2?'loading':'normal';
      this.button(this.stage,'start',state==='loading'?'正在准备回窝…':'开始回窝',{x:135,y:890,width:480,height:96},()=>{this.home=false;this.resumes=0;},true,state);
      ['关卡','图鉴','外观'].forEach((label,i)=>this.button(this.stage,'entry'+i,label,{x:92+i*195,y:1050,width:176,height:88},()=>{this.entryTitle=label;this.show('entry');}));
      this.button(this.stage,'homeSettings','设置',{x:32,y:64,width:120,height:88},()=>this.show('settings'));
    }else{
      this.track();const f=this.fixtures[this.index];
      this.button(this.stage,'pause','Ⅱ',{x:32,y:64,width:88,height:88},()=>this.show('pause'));
      this.nodeAt(this.stage,'GameHud',375,667,750,1334,this.hudPrefab).getComponent(HudView)!.updateView(f.id,.57);
      ['逗猫棒','猫薄荷','彩虹猫'].forEach((name,i)=>this.button(this.stage,'tool'+i,this.selected===name?'取消选择':name,{x:92+i*195,y:TOOL_TOP,width:176,height:88},()=>{this.selected=this.selected===name?'':name;this.notice=this.selected?'点选目标，再点道具可取消（演示）':'已取消，不扣库存';},this.selected===name));
    }
  }
  protected toolbarControls():[string,string,()=>void][] {return [['home','首页',()=>{this.home=true;this.panel='';}]];}

}
