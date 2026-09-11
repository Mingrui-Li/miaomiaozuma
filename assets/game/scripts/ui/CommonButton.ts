import { _decorator, Color, Component, Label, Sprite, SpriteFrame, UITransform } from 'cc';
const {ccclass,property}=_decorator;
export type ButtonState='normal'|'pressed'|'disabled'|'loading';
/** View-only control: emits no rewards, owns no navigation or domain state. */
@ccclass('MMCommonButton')
export class CommonButton extends Component {
  @property(Sprite) background:Sprite|null=null;
  @property(Label) caption:Label|null=null;
  private frames:SpriteFrame[]=[];
  private primary=false;
  state:ButtonState='normal';
  configure(frames:SpriteFrame[],primary:boolean,text:string,width:number,height:number,state:ButtonState='normal'):void {
    this.frames=frames;this.primary=primary;
    this.node.getComponent(UITransform)!.setContentSize(width,height);
    this.background!.node.getComponent(UITransform)!.setContentSize(width,height);
    this.caption!.node.getComponent(UITransform)!.setContentSize(width-24,height);
    this.caption!.string=text;this.caption!.fontSize=width<200?26:32;
    this.setState(state);
  }
  get interactable():boolean{return this.state!=='disabled' && this.state!=='loading';}
  setPressed(value:boolean):void{if(this.interactable)this.setState(value?'pressed':'normal');}
  setState(state:ButtonState):void {
    this.state=state;
    this.background!.spriteFrame=this.frames[state==='disabled'?4:(this.primary?0:2)+(state==='pressed'?1:0)];
    this.caption!.color=new Color(state==='disabled'?'#6F5C4E':'#4A332B');
    // Tint/texture feedback keeps the hit target and caption geometry stable.
    this.background!.color=new Color(state==='loading'?'#EFE4D8':'#FFFFFF');
  }
}
