import fs from 'node:fs';
let s=fs.readFileSync('assets/ui-greybox/Greybox.ts','utf8');
s=s.replace("Component, EventTouch",'Component, instantiate, Prefab, EventTouch').replace("from './Fixtures'","from '../ui-greybox/Fixtures'").replace("from './Layout'","from '../ui-greybox/Layout'");
s="import { CommonButton, ButtonState } from '../game/scripts/ui/CommonButton';\nimport { HudView } from '../game/scripts/ui/HudView';\nimport { PanelView } from '../game/scripts/ui/PanelView';\n"+s;
s=s.replaceAll('UIGreybox','MMUIPreview').replaceAll('__UI_GREYBOX__','__UI_PREVIEW__').replace('GreyboxRoot','UIPreviewRoot');
s=s.replace("|'settings';","|'settings'|'entry'|'share';");
s=s.replace('  private catFrames:',`  @property(Prefab) buttonPrefab:Prefab|null=null;
  @property(Prefab) panelPrefab:Prefab|null=null;
  @property(Prefab) hudPrefab:Prefab|null=null;
  @property(Prefab) homePrefab:Prefab|null=null;
  private retained=new Set<Node>();
  private stateSample=0;
  private entryTitle='';
  private sound=true;
  private vibration=true;
  private catFrames:`);
s=s.replace("space:'stage'|'screen'};","space:'stage'|'screen';state?:ButtonState};");
s=s.replace("private notice='灰盒 · 静态队列 / 系统字体 / 演示操作';","private notice='UI-05 组件预览 · 静态玩法 / 系统字体';");
const start=s.indexOf('  private nodeAt('),end=s.indexOf('  private box(',start);
s=s.slice(0,start)+`  private nodeAt(parent:Node,name:string,x:number,y:number,w:number,h:number,prefab?:Prefab|null):Node {
    let n=parent.getChildByName(name);
    if(!n){n=prefab?instantiate(prefab):new Node(name);n.name=name;n.layer=this.node.layer;if(!n.getComponent(UITransform))n.addComponent(UITransform);parent.addChild(n);this.retained.add(n);}
    n.active=true;n.setSiblingIndex(parent.children.length-1);n.getComponent(UITransform)!.setContentSize(w,h);
    const size=parent===this.root?this.size:{width:750,height:1334};n.setPosition(x-size.width/2,size.height/2-y);return n;
  }
`+s.slice(end);
s=s.replaceAll('g=n.addComponent(Graphics);','g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();');
s=s.replace('l=n.addComponent(Label);','l=n.getComponent(Label)??n.addComponent(Label);');
s=s.replace('sprite=n.addComponent(Sprite);','sprite=n.getComponent(Sprite)??n.addComponent(Sprite);');
const bs=s.indexOf('  private button('),be=s.indexOf('  private outline(',bs);
s=s.slice(0,bs)+`  private button(parent:Node,name:string,label:string,r:Rect,action:()=>void,primary=false,state:ButtonState='normal'):void {
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
`+s.slice(be);
s=s.replace("'Bounds',r.x","'Bounds'+r.x+'_'+r.y,r.x");
s=s.replace("private cat(p:Point,r:number,breed:number,name='Cat')","private cat(p:Point,r:number,breed:number,name='Cat'+breed)");
const ds=s.indexOf('    const panelRect='),de=s.indexOf('    const b=',ds);
s=s.slice(0,ds)+`    const titles:Record<Exclude<Panel,''>,string>={pause:'歇一会儿喵',win:'猫猫到家啦！',lose:'差一点到家',ad:'准备继续回窝',error:'暂时没有可用视频',restart:'重新开始这一关？',exit:'返回首页？',settings:'设置',entry:this.entryTitle,share:'分享回窝时刻'};
    const message=this.panel==='win'?'又送一群小猫回家啦':this.panel==='ad'?'视频准备中，也可以免费重开':this.panel==='error'?'稍后再试，或免费重新开始':'猫猫等你一起回窝';
    this.nodeAt(this.stage,'DialogPanel',375,710,606,800,this.panelPrefab).getComponent(PanelView)!.configure(this.uiFrames[5],titles[this.panel as Exclude<Panel,''>],message,800);
`+s.slice(de);
s=s.replace("b('next',this.index===6?'查看代表关':'下一代表关',550", "b('next',this.index===6?'回到关卡':'下一关',550");
s=s.replace("b('home','返回首页',680,()=>{this.home=true;this.panel='';});","b('share','分享回窝时刻',680,()=>this.show('share'));b('home','返回首页',810,()=>{this.home=true;this.panel='';});");
const ss=s.indexOf("    }else if(this.panel==='settings')"),se=s.indexOf('    }else{',ss+8);
s=s.slice(0,ss)+`    }else if(this.panel==='settings'){
      b('sound',this.sound?'声音：开':'声音：关',530,()=>{this.sound=!this.sound;});
      b('vibration',this.vibration?'震动：开':'震动：关',650,()=>{this.vibration=!this.vibration;});
      b('back','返回',810,()=>this.show(this.home?'':'pause'));
    }else if(this.panel==='entry'||this.panel==='share'){
      this.text(this.stage,'EntryCopy',this.panel==='share'?'录屏分享将在平台接入后开放':'页面将在后续阶段接入',375,610,520,60,28);
      b('unavailable',this.panel==='share'?'暂无可分享视频':'暂未开放',730,()=>{},false);
      const last=this.hits[this.hits.length-1];last.state='disabled';last.action=()=>{};
      this.stage.getChildByName('unavailable')!.getComponent(CommonButton)!.setState('disabled');
      b('back','返回',890,()=>this.show(this.panel==='share'?'win':''));
`+s.slice(se);
const as=s.indexOf("        b('adSuccess'"),ae=s.indexOf('      }else{',as);
s=s.slice(0,as)+`        this.button(this.stage,'adLoading','视频准备中…',{x:135,y:560,width:480,height:88},()=>{},true,'loading');
`+s.slice(ae);
s=s.replace("'免费次数已用 · 查看说明':'免费继续（演示一次）'","'本局免费次数已用':'免费继续'").replace("'看视频继续（演示）'","'看视频继续'");
s=s.replace("        },true);","        },true);\n        if(free&&this.resumes){const hit=this.hits[this.hits.length-1];hit.state='disabled';hit.action=()=>{};this.stage.getChildByName('revive')!.getComponent(CommonButton)!.setState('disabled');}");
s=s.replace('    for(const child of [...this.root.children])child.destroy();\n    this.root.removeAllChildren();','    for(const child of Array.from(this.retained))child.active=false;');
s=s.replace('UI-04 · 首批资源试样','UI-05 · 可复用组件预览');
const hs=s.indexOf("      this.text(this.stage,'HomeTitle'"),he=s.indexOf('    }else{',hs);
s=s.slice(0,hs)+`      this.nodeAt(this.stage,'HomeView',375,667,750,1334,this.homePrefab);
      this.circle(this.stage,'HomeNest',{x:375,y:610},164,C.mint);this.cat({x:375,y:585},128,0,'HomeCat');
      this.cat({x:180,y:722},64,1,'HomeRagdoll');this.cat({x:570,y:722},64,4,'HomeBlack');
      const state:ButtonState=this.stateSample===1?'disabled':this.stateSample===2?'loading':'normal';
      this.button(this.stage,'start',state==='loading'?'正在准备回窝…':'开始回窝',{x:135,y:890,width:480,height:96},()=>{this.home=false;this.resumes=0;},true,state);
      ['关卡','图鉴','外观'].forEach((label,i)=>this.button(this.stage,'entry'+i,label,{x:92+i*195,y:1050,width:176,height:88},()=>{this.entryTitle=label;this.show('entry');}));
      this.button(this.stage,'homeSettings','设置',{x:32,y:64,width:120,height:88},()=>this.show('settings'));
`+s.slice(he);
const hudstart=s.indexOf("      this.text(this.stage,'Level'"),hudend=s.indexOf("      ['逗猫棒'",hudstart);
s=s.slice(0,hudstart)+`      this.nodeAt(this.stage,'GameHud',375,667,750,1334,this.hudPrefab).getComponent(HudView)!.updateView(f.id,.57);
`+s.slice(hudend);
s=s.replace("['bounds','边界',()=>{this.bounds=!this.bounds;}]","['states','状态',()=>{this.stateSample=(this.stateSample+1)%3;this.home=true;this.panel='';}]");
const ctrl=s.indexOf('    controls.forEach');
s=s.slice(0,ctrl)+`    if(this.panel==='ad')controls.splice(0,3,['adSuccess','完成',()=>{this.resumes++;this.show('');}],['adCancel','取消',()=>this.show('lose')],['adError','失败',()=>this.show('error')]);
`+s.slice(ctrl);
s=s.replace('assetBatch:{cats:',"retainedNodes:this.retained.size,prefabs:{button:!!this.buttonPrefab,panel:!!this.panelPrefab,hud:!!this.hudPrefab,home:!!this.homePrefab},stateSample:this.stateSample,sound:this.sound,vibration:this.vibration,assetBatch:{cats:");
s=s.replace('({name,rect,visualRect,space})=>({name,rect,visualRect,space})','({name,rect,visualRect,space,state})=>({name,rect,visualRect,space,state})');
const path='assets/ui-preview/Preview.ts';if(fs.existsSync(path))throw Error('Already exists');
console.log('*** Begin Patch\n*** Add File: '+path+'\n'+s.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch');
