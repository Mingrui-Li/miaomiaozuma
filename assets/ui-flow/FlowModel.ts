/** Isolated UI fixtures, deliberately not wired to SaveService or platform APIs. */
export type Page='boot'|'home'|'map'|'prepare'|'game'|'collection'|'cosmetics';
export type RequestKind='boot'|'level'|'purchase'|'settings'|'revive'|'bonus'|'share';
export type Outcome='success'|'failure'|'cancel';
export const CARD_STARS=[3,6,9,12,15,18,21,24,30,36,48,60];
export const CARD_NAMES=['橘猫','布偶','蓝猫','三花','玄猫','午睡时光','毛线搭档','暖窝来信','探头小猫','雨天贴贴','月光散步','全员回窝'];
export const CARD_COPY=['饭可以晚点，贴贴不能。','今天也想软软地躺着。','我的安静，是在认真听你。','花色很多，快乐更多。','天黑啦，我陪你回家。','睡醒第一件事：伸个懒腰。','线可以乱，伙伴不能散。','留一个暖暖的位置给你。','外面有什么新鲜事呀？','雨声刚好，挤一挤更暖。','走慢一点，看看今晚的月亮。','一个也不少，大家都到家啦。'];
export const COSTUMES=[{id:'nest0',name:'奶油小窝',kind:'nest',price:0},{id:'nest1',name:'薄荷软垫',kind:'nest',price:150},{id:'nest2',name:'暖橘摇篮',kind:'nest',price:300},{id:'trail0',name:'轻轻脚印',kind:'trail',price:0},{id:'trail1',name:'星光尾迹',kind:'trail',price:150},{id:'trail2',name:'彩色晚霞',kind:'trail',price:500}];
export interface Request {id:number;kind:RequestKind;payload:string;}
export class FlowModel {
  page:Page='boot'; chapter=0; cardPage=0; category='nest'; selectedLevel=1; current=24;
  prepareFrom:Page='home'; fish=180; stars=24; completed=23;
  viewed=new Set<number>(); owned=new Set(['nest0','trail0']); equipped:Record<string,string>={nest:'nest0',trail:'trail0'};
  settings={music:true,sound:true,vibration:true}; toast=''; error=''; guide=0;
  pending:Request|null=null; private sequence=0; bonusGranted=false; baseGranted=false;
  navigate(page:Page):void{this.cancel();this.page=page;this.error='';this.toast='';}
  begin(kind:RequestKind,payload=''):number {this.cancel();const id=++this.sequence;this.pending={id,kind,payload};this.error='';return id;}
  cancel():void{this.pending=null;this.sequence++;}
  finish(id:number,outcome:Outcome):boolean {
    const request=this.pending;if(!request||id!==request.id)return false;
    this.pending=null;
    if(outcome!=='success'){this.error=outcome==='cancel'?'操作已取消':'暂时未能完成，请重试';return false;}
    if(request.kind==='purchase'){
      const item=COSTUMES.find(c=>c.id===request.payload);if(!item||this.owned.has(item.id))return false;
      if(this.fish<item.price){this.error='小鱼干还不够';return false;}
      this.fish-=item.price;this.owned.add(item.id);
    }
    if(request.kind==='settings'){
      const key=request.payload as keyof typeof this.settings;if(!(key in this.settings))return false;this.settings[key]=!this.settings[key];
    }
    if(request.kind==='bonus'){if(this.bonusGranted)return false;this.bonusGranted=true;this.fish+=this.rewardBase;}
    return true;
  }
  get rewardBase():number{return 20+this.selectedLevel*2+20;}
  get firstReward():number{return this.selectedLevel>this.completed?30:0;}
  awardBase():void{if(!this.baseGranted){this.fish+=this.rewardBase+this.firstReward;this.baseGranted=true;}}
  resetRound():void{this.cancel();this.bonusGranted=false;this.baseGranted=false;}
  openLevel(id:number):boolean{if(id<1||id>100||id>this.current){this.toast='先帮前面的小猫回窝吧';return false;}this.prepareFrom=this.page==='map'?'map':'home';this.selectedLevel=id;this.navigate('prepare');return true;}
  equip(id:string):boolean{const item=COSTUMES.find(c=>c.id===id);if(!item||!this.owned.has(id))return false;this.equipped[item.kind]=id;return true;}
  cosmeticState(id:string):'equipped'|'owned'|'affordable'|'insufficient'{const item=COSTUMES.find(c=>c.id===id)!;return this.equipped[item.kind]===id?'equipped':this.owned.has(id)?'owned':this.fish>=item.price?'affordable':'insufficient';}
}
