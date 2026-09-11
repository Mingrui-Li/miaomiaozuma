import { _decorator, Component, Label, Sprite, SpriteFrame, UITransform } from 'cc';
const {ccclass,property}=_decorator;
/** Reusable editable panel surface with dynamic copy, independent of gameplay. */
@ccclass('MMPanelView')
export class PanelView extends Component {
  @property(Sprite) surface:Sprite|null=null;
  @property(Label) title:Label|null=null;
  @property(Label) message:Label|null=null;
  configure(frame:SpriteFrame,title:string,message:string,height=880):void {
    this.surface!.spriteFrame=frame;this.surface!.node.getComponent(UITransform)!.setContentSize(606,height);
    this.title!.string=title;this.message!.string=message;
  }
}
