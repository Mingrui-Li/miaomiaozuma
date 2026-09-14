import {_decorator,Color,Graphics,Label} from 'cc';
import {MMUIFlowBase,Panel} from './FlowBase';
import {FlowModel,Page,RequestKind,Outcome,CARD_NAMES,CARD_COPY,CARD_STARS,COSTUMES} from './FlowModel';
import {FIXTURES} from '../ui-greybox/Fixtures';
import {CommonButton} from '../game/scripts/ui/CommonButton';
const {ccclass}=_decorator;

@ccclass('MMUIFlowView')
export class FlowView extends MMUIFlowBase {
  protected model=new FlowModel();
  private detail=0;private costume='nest1';private tool=0;private settingsFrom:Panel='';
  private requestOutcome:Outcome='success';private lastRequest=0;private resultKind:RequestKind='boot';private lastPayload='';
  private inventory=[2,0,1];private busy=false;private bootstrap=false;private toastToken=0;
  private mapVisited=false;private restoreCredit=false;private revivePhase='';
  private go(page:Page):void {this.cancelTouch();this.model.navigate(page);this.panel='';this.selected='';this.restoreCredit=false;this.revivePhase='';if(page==='map'&&!this.mapVisited){this.model.chapter=Math.floor((this.model.current-1)/10);this.mapVisited=true;}this.home=page!=='game';this.draw();}
  private tell(message:string):void{this.model.toast=message;const id=++this.toastToken;this.scheduleOnce(()=>{if(id===this.toastToken){this.model.toast='';this.draw();}},2.5);this.draw();}
  private request(kind:RequestKind,payload='',success?:()=>void):void {
    const id=this.model.begin(kind,payload);this.lastRequest=id;this.resultKind=kind;this.lastPayload=payload;
    this.scheduleOnce(()=>{const matched=this.model.pending?.id===id;if(!matched)return;
      const ok=this.model.finish(id,this.requestOutcome);
      if(ok){success?.();}else if(kind==='level'||kind==='boot'){this.show('loadError');}else if(kind==='settings'||kind==='purchase'){this.show('saveError');}else {this.show(kind==='revive'?(this.restoreCredit?'restore':'error'):'shareResult');}
      this.draw();
    },0.8);this.draw();
  }
  protected override render():void {
    this.notice=this.model.toast||'UI-06 演示数据 · 不写入正式存档';
    this.home=this.model.page!=='game';super.render();
    const w=window as unknown as Record<string,any>;
    w.__UI_FLOW__={...w.__UI_FLOW__,page:this.model.page,chapter:this.model.chapter,cardPage:this.model.cardPage,current:this.model.current,selectedLevel:this.model.selectedLevel,fish:this.model.fish,stars:this.model.stars,settings:{...this.model.settings},owned:Array.from(this.model.owned),equipped:{...this.model.equipped},viewed:Array.from(this.model.viewed),pending:this.model.pending,requestOutcome:this.requestOutcome,toast:this.model.toast,guide:this.model.guide,inventory:this.inventory.slice(),busy:this.busy,controls:this.hits.map(({name,rect,visualRect,space,state})=>({name,rect,visualRect,space,state}))};
    w.__UI_FLOW__.labels=this.stage.getComponentsInChildren(Label).filter(l=>l.node.activeInHierarchy).map(l=>({name:l.node.name,text:l.string,size:l.fontSize,actual:l.actualFontSize}));
    w.__UI_FLOW__.revivePhase=this.revivePhase;w.__UI_FLOW__.restoreCredit=this.restoreCredit;
    if(!this.bootstrap){this.bootstrap=true;this.request('boot','',()=>this.go('home'));}
  }
  private heading(title:string,subtitle=''):void{this.text(this.stage,'PageTitle',title,375,160,620,68,46);if(subtitle)this.text(this.stage,'PageSubtitle',subtitle,375,220,650,42,26,'#785E50');}
  private btn(name:string,label:string,x:number,y:number,w:number,action:()=>void,primary=false,disabled=false):void{this.button(this.stage,name,label,{x,y,width:w,height:88},action,primary,disabled?'disabled':'normal');}
  private backHome():void{this.btn('backHome','返回首页',135,1120,480,()=>this.go('home'));}
  protected override renderContent():void {
    const m=this.model;
    if(m.page==='game'){
      super.renderContent();
      if(m.selectedLevel<=5){this.hits=this.hits.filter(h=>!h.name.startsWith('tool'));for(let i=0;i<3;i++){const n=this.stage.getChildByName('tool'+i);if(n)n.active=false;}}
      else for(let i=0;i<3;i++){
        const name=['逗猫棒','猫薄荷','彩虹猫'][i];this.hits=this.hits.filter(h=>h.name!=='tool'+i);
        this.btn('tool'+i,this.selected===name?'取消选择':name+' ×'+this.inventory[i],92+i*195,1188,176,()=>{this.tool=i;if(this.selected===name){this.selected='';return;}this.show('booster');},this.selected===name,this.busy);
      }
      if(m.selectedLevel===1&&!this.panel&&m.guide<2)this.text(this.stage,'Guide',m.guide===0?'轻轻点一下猫窝，交换猫猫':'松手，把猫猫送去贴贴',375,900,470,46,28);
      return;
    }
    if(m.page==='boot'){
      this.heading('喵喵回窝','温暖的小窝正在准备');this.cat({x:375,y:560},116,0,'BootCat');
      this.text(this.stage,'BootStatus',m.pending?'正在装入必要资源…':'准备就绪',375,800,640,56,32);
      this.text(this.stage,'Health','适度游戏，合理安排时间',375,990,650,42,25);
      this.btn('bootPrivacy','隐私说明',225,1100,300,()=>this.show('privacy'));return;
    }
    if(m.page==='home'){
      super.renderContent();this.text(this.stage,'Balance','小鱼干 '+m.fish,510,105,330,42,28);
      this.hits=this.hits.filter(h=>!['start','entry0','entry1','entry2','homeSettings'].includes(h.name));
      this.btn('start',m.current===1?'开始回窝':'继续第 '+m.current+' 关',135,890,480,()=>{m.openLevel(m.current);this.draw();},true);
      ['关卡','图鉴','外观'].forEach((label,i)=>this.btn('entry'+i,label,92+i*195,1050,176,()=>{if(i===1&&m.completed<3){this.tell('通过第3关后，猫咪图鉴就会打开');return;}this.go((['map','collection','cosmetics'] as Page[])[i]);}));
      this.btn('homeSettings','设置',32,64,120,()=>{this.settingsFrom='';this.show('settings');});return;
    }
    if(m.page==='map'){
      this.heading('猫猫回家路','第 '+(m.chapter+1)+' 章 · '+(m.chapter*10+1)+'—'+(m.chapter*10+10)+' 关');
      const positions=[[240,310],[480,310],[540,470],[300,470],[180,630],[420,630],[540,790],[300,790],[180,950],[420,950]];
      const n=this.nodeAt(this.stage,'MapPath',0,0,0,0),g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();g.strokeColor=new Color('#D9CBB6');g.lineWidth=8;
      positions.forEach(([x,y],i)=>{if(i===0)g.moveTo(x,-y);else g.lineTo(x,-y);});g.stroke();
      positions.forEach(([x,y],i)=>{const id=m.chapter*10+i+1,locked=id>m.current;this.btn('level'+id,(locked?'锁定 ':id===m.current?'当前 ':'')+id,x-70,y-44,140,()=>{if(m.openLevel(id))this.draw();else this.tell(m.toast);},id===m.current);
        this.text(this.stage,'Stars'+i,id<=m.completed?'★ ★ '+(id%3?'★':'☆'):locked?'待回窝':'出发吧',x,y+64,176,34,24,'#785E50');});
      this.btn('chapterPrev','上一章',65,1090,180,()=>{m.chapter--;},false,m.chapter===0);this.btn('mapHome','首页',285,1090,180,()=>this.go('home'));this.btn('chapterNext','下一章',505,1090,180,()=>{m.chapter++;},false,m.chapter===9);return;
    }
    if(m.page==='prepare'){
      this.heading('第 '+m.selectedLevel+' 关','目标：帮全部小猫贴贴回窝');
      const f=FIXTURES.find(f=>f.id===m.selectedLevel);
      if(f){const n=this.nodeAt(this.stage,'MiniTrack',175,340,0,0),g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();g.strokeColor=new Color('#D9CBB6');g.lineWidth=10;f.points.forEach((p,i)=>{if(!i)g.moveTo(p.x*.53,-p.y*.32);else g.lineTo(p.x*.53,-p.y*.32);});g.stroke();}
      else this.text(this.stage,'TrackPending','关卡路线准备中',375,540,600,50,30);
      for(let i=0;i<5;i++)this.cat({x:175+i*100,y:815},40,i,'Welcome'+i);
      if(m.selectedLevel>5)['逗猫棒','猫薄荷','彩虹猫'].forEach((label,i)=>this.btn('prepareTool'+i,label+' ×'+this.inventory[i],92+i*195,930,176,()=>{this.tool=i;this.show('booster');}));
      this.button(this.stage,'beginLevel',m.pending?'正在准备…':'开始回窝',{x:135,y:1060,width:480,height:88},()=>this.loadLevel(),true,m.pending?'loading':'normal');
      this.btn('cancelPrepare','返回',225,1185,300,()=>this.go(m.prepareFrom));return;
    }
    if(m.page==='collection'){
      this.heading('猫咪图鉴','累计 '+m.stars+' 颗星星 · '+(m.cardPage+1)+' / 2');
      for(let i=0;i<6;i++){
        const card=m.cardPage*6+i,x=80+(i%2)*315,y=285+Math.floor(i/2)*245,unlocked=m.stars>=CARD_STARS[card];
        this.button(this.stage,'card'+card,'',{x,y,width:280,height:220},()=>{if(!unlocked){this.tell('累计 '+CARD_STARS[card]+' 颗星星解锁');return;}this.detail=card;m.viewed.add(card);this.show('details');});
        this.cat({x:x+140,y:y+75},54,card%5,'CardArt'+i);
        if(!unlocked){const art=this.stage.getChildByName('CardArt'+i);const sprite=art?.getComponent('cc.Sprite') as any;if(sprite)sprite.color=new Color('#625B54');}
        this.text(this.stage,'CardName'+i,(unlocked&&!m.viewed.has(card)?'新 · ':'')+CARD_NAMES[card],x+140,y+153,250,42,28);
        this.text(this.stage,'CardGate'+i,unlocked?'点开听听猫猫的话':CARD_STARS[card]+' 星解锁',x+140,y+192,260,34,23,'#785E50');
      }
      this.btn('cardsPrev','上一页',65,1090,180,()=>{m.cardPage=0;},false,m.cardPage===0);this.btn('cardsHome','首页',285,1090,180,()=>this.go('home'));this.btn('cardsNext','下一页',505,1090,180,()=>{m.cardPage=1;},false,m.cardPage===1);return;
    }
    this.heading('装点小窝','小鱼干 '+m.fish+' · 外观没有数值加成');
    this.btn('nestTab','猫窝',95,280,250,()=>{m.category='nest';},m.category==='nest');this.btn('trailTab','拖尾',405,280,250,()=>{m.category='trail';},m.category==='trail');
    COSTUMES.filter(c=>c.kind===m.category).forEach((item,i)=>{
      const y=420+i*210,state=m.cosmeticState(item.id);this.box(this.stage,'CosmeticPanel'+i,{x:70,y,width:610,height:175},'#FFFBF4',32);
      this.circle(this.stage,'CosmeticSwatch'+i,{x:152,y:y+82},48,['#E6CEAC','#A9D8C0','#FFC078'][i]);
      this.text(this.stage,'CosmeticName'+i,item.name,355,y+48,290,42,30);
      this.text(this.stage,'CosmeticPrice'+i,item.price?item.price+' 小鱼干':'免费',350,y+105,220,36,25);
      const label=state==='equipped'?'使用中':state==='owned'?'使用':state==='insufficient'?'差 '+(item.price-m.fish):'解锁';
      this.btn('cosmetic-'+item.id,label,500,y+55,150,()=>{if(state==='owned'){m.equip(item.id);this.tell('已经换好啦');}else if(state==='insufficient')this.tell('小鱼干还不够，先去帮猫猫回窝吧');else {this.costume=item.id;this.show('purchase');}},false,state==='equipped');
    });this.backHome();
  }
  private loadLevel():void {
    this.request('level','',()=>{const index=FIXTURES.findIndex(f=>f.id===this.model.selectedLevel);if(index<0){this.model.error='关卡暂不可用，请稍后再试';this.show('loadError');return;}this.index=index;this.resumes=0;this.shots=0;this.model.resetRound();this.go('game');});
  }
  private beginRevive():void {
    const restore=()=>{this.revivePhase='restore';this.show('restore');this.request('revive','',()=>{this.resumes++;this.restoreCredit=false;this.revivePhase='';this.show('');});};
    if(this.model.selectedLevel<=5||this.restoreCredit){restore();return;}
    this.revivePhase='loading';this.show('ad');
    this.request('revive','',()=>{this.revivePhase='playing';this.show('ad');const id=this.model.begin('revive');this.scheduleOnce(()=>{if(this.model.pending?.id!==id)return;this.model.finish(id,'success');this.restoreCredit=true;restore();},.8);});
  }
  protected override startTouch(e:any):void{if(this.busy&&!this.hitAt(this.screenPoint(e)))return;super.startTouch(e);}
  protected override endTouch(e:any):void{const swaps=this.swaps,shots=this.shots;super.endTouch(e);if(this.swaps>swaps)this.model.guide=Math.max(this.model.guide,1);if(this.shots>shots)this.model.guide=2;}
  protected override dialog():void {
    const m=this.model;
    const title:Partial<Record<Panel,string>>={pause:'歇一会儿喵',win:m.selectedLevel===100?'大家都到家啦！':'猫猫到家啦！',lose:'罐头仓库挤满啦',settings:'设置',privacy:'隐私说明',details:CARD_NAMES[this.detail],booster:['逗猫棒','猫薄荷','彩虹猫'][this.tool],purchase:'把它带回小窝？',loadError:'暂时没准备好',saveError:'这次还没保存好',ad:'准备继续回窝',restore:'正在帮猫猫腾位置',error:'暂时没有可用视频',reward:'再带一份小鱼干回家',share:'分享回窝时刻',shareResult:'分享提示',test:'预览状态',restart:'重新开始这一关？',exit:'返回首页？'};
    this.box(this.stage,'ModalScrim',{x:0,y:0,width:750,height:1334},'#4A332B99',0);
    this.sprite(this.stage,'FlowDialog',{x:55,y:255,width:640,height:890},this.uiFrames[5],true);
    this.text(this.stage,'FlowDialogTitle',title[this.panel]??'提示',375,330,590,70,39);
    const copy=(s:string,y=425)=>this.text(this.stage,'DialogCopy'+y,s,375,y,570,56,27,'#785E50');
    const b=(n:string,l:string,y:number,fn:()=>void,primary=false,disabled=false)=>this.btn(n,l,135,y,480,fn,primary,disabled);
    const close=()=>this.show('');
    if(this.panel==='details'){this.cat({x:375,y:565},110,this.detail%5,'DetailArt');copy(CARD_COPY[this.detail],760);copy('日常伙伴 · '+CARD_STARS[this.detail]+' 星回忆',830);b('detailBack','返回图鉴',975,close);return;}
    if(this.panel==='privacy'){copy('本预览只使用当前页面的演示数据',510);copy('不上传照片，不连接账号服务',600);copy('正式隐私政策将在发布前接入',690);b('privacyBack','返回',965,()=>this.show(m.page==='boot'?'':'settings'));return;}
    if(this.panel==='settings'){
      (['music','sound','vibration'] as const).forEach((k,i)=>b('setting-'+k,['音乐','音效','震动'][i]+'：'+(m.settings[k]?'开':'关'),460+i*130,()=>this.request('settings',k),false,!!m.pending));
      b('privacy','隐私说明',850,()=>this.show('privacy'));b('settingsBack','返回',990,()=>{m.cancel();this.show(this.settingsFrom);});return;
    }
    if(this.panel==='purchase'){const c=COSTUMES.find(c=>c.id===this.costume)!;copy(c.name+' · '+c.price+' 小鱼干',525);copy('解锁后可以随时换上',620);b('buy',m.pending?'正在保存…':'确认解锁',800,()=>this.request('purchase',c.id,()=>{close();this.tell('小窝装饰已经备好啦');}),true,!!m.pending);b('buyCancel','取消',965,()=>{m.cancel();close();});return;}
    if(this.panel==='saveError'){copy(m.error,550);copy('原有设置和小鱼干保持原样',640);b('saveRetry','重试',805,()=>{const settings=this.resultKind==='settings';this.show(settings?'settings':'purchase');this.request(this.resultKind,this.lastPayload,()=>{this.show(settings?'settings':'');this.tell('已经保存好啦');});},true);b('saveBack','返回',970,()=>this.show(this.resultKind==='settings'?'settings':''));return;}
    if(this.panel==='loadError'){copy(m.error,520);copy('稍后再试，猫猫会等你',620);b('loadRetry','重试',800,()=>{close();if(m.page==='boot')this.request('boot','',()=>this.go('home'));else this.loadLevel();},true);b('loadCancel','返回首页',960,()=>this.go('home'));return;}
    if(this.panel==='booster'){copy(['移除指定的一只猫','让目标附近五只猫回窝','替换当前发射猫，下一只不变'][this.tool],500);copy('拥有 '+this.inventory[this.tool]+' 个',600);b('useTool',m.page==='prepare'?'知道啦':this.inventory[this.tool]?'使用':'暂时用完啦',815,()=>{if(m.page==='game')this.selected=['逗猫棒','猫薄荷','彩虹猫'][this.tool];close();},true,m.page==='game'&&!this.inventory[this.tool]);b('toolBack','返回',980,close);return;}
    if(this.panel==='pause'){b('continue','继续回窝',460,close,true);b('restart','重新开始',590,()=>this.show('restart'));b('settings','设置',720,()=>{this.settingsFrom='pause';this.show('settings');});b('exit','返回首页',850,()=>this.show('exit'));return;}
    if(this.panel==='restart'||this.panel==='exit'){copy('现在离开会结束这一局',530);b('confirm','确认',760,()=>{if(this.panel==='exit')this.go('home');else{m.resetRound();this.resumes=0;this.shots=0;close();}},true);b('cancel','取消',930,()=>this.show('pause'));return;}
    if(this.panel==='win'){
      copy('★ ★ ☆   分数 12800   最大连锁 8',425);copy('基础 +'+m.rewardBase+'   首次 +'+m.firstReward,500);copy(m.baseGranted?'小鱼干已经放好啦':'小鱼干正在结算',565);
      b('next',m.selectedLevel===100?'返回地图':'下一关',645,()=>{if(m.selectedLevel===100){m.chapter=9;this.go('map');}else{m.selectedLevel++;this.go('prepare');this.loadLevel();}},true);
      this.btn('replay','再玩一次',95,785,260,()=>{m.resetRound();this.resumes=0;close();});this.btn('winHome','首页',395,785,260,()=>this.go('home'));
      if(m.selectedLevel>5)b('bonus',m.bonusGranted?'额外奖励已收好':'视频额外 +'+m.rewardBase+' 小鱼干',915,()=>this.show('reward'),false,m.bonusGranted);
      b('share','分享高光',1045,()=>this.show('share'));return;
    }
    if(this.panel==='reward'||this.panel==='share'){
      const reward=this.panel==='reward';copy(reward?'仅增加基础奖励，首次奖励不翻倍':'视频不可用时可以普通分享',515);
      b('perform',m.pending?'正在准备…':reward?'看视频领取':'普通分享',785,()=>this.request(reward?'bonus':'share','',()=>{this.show('win');this.tell(reward?'额外小鱼干已经收好啦':'分享完成');}),true,!!m.pending);b('rewardBack','返回结算',965,()=>{m.cancel();this.show('win');});return;
    }
    if(this.panel==='shareResult'){copy(m.error||'暂时无法分享',570);b('shareBack','返回结算',920,()=>this.show('win'));return;}
    if(this.panel==='test'){
      const cases:[string,()=>void][]=[['正常状态',()=>{this.requestOutcome='success';}],['网络失败',()=>{this.requestOutcome='failure';}],['模拟取消',()=>{this.requestOutcome='cancel';}],['首关引导',()=>{m.current=1;m.completed=0;m.selectedLevel=1;m.guide=0;this.index=0;this.go('game');}],['终章与全图鉴',()=>{m.current=100;m.completed=99;m.stars=60;m.selectedLevel=100;this.index=6;this.go('game');}],['发射忙碌',()=>{this.busy=!this.busy;this.go('game');}]];
      cases.forEach(([label,fn],i)=>this.btn('case'+i,label,85+(i%2)*305,460+Math.floor(i/2)*160,275,()=>{fn();this.model.cancel();close();}));b('testBack','返回',1010,close);return;
    }
    const free=m.selectedLevel<=5,pending=!!m.pending;
    copy(this.panel==='error'?(m.error||'可以稍后重试，也可以免费重开'):'队伍后退25%，末端3只猫回窝',500);
    b('revive',pending?(this.revivePhase==='playing'?'等待视频结果…':this.revivePhase==='loading'?'视频准备中…':'正在帮猫猫腾位置…'):this.restoreCredit?'重试恢复':free?(this.resumes?'本局免费帮助已使用':'免费帮一次'):'视频 · 看完继续',675,()=>this.beginRevive(),true,pending||(free&&this.resumes>0));
    b('freeRestart','免费重新开始',840,()=>{m.resetRound();this.restoreCredit=false;this.revivePhase='';this.resumes=0;this.shots=0;close();},free&&this.resumes>0);b('freeMap','返回地图',1005,()=>this.go('map'));
  }
  protected override toolbarControls():[string,string,()=>void][] {
    return [['home','首页',()=>this.go('home')],['safe','安全区',()=>{this.notched=!this.notched;}],['states','状态',()=>this.show('test')],['win','胜利',()=>{this.go('game');this.model.awardBase();this.show('win');}],['lose','复活',()=>{this.go('game');this.show('lose');}],['boot','启动',()=>{this.go('boot');this.request('boot','',()=>this.go('home'));}]];
  }
}
