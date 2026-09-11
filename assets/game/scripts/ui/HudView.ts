import { _decorator, Component, Label, Graphics, Color } from 'cc';
const {ccclass,property}=_decorator;
@ccclass('MMHudView')
export class HudView extends Component {
  @property(Label) level:Label|null=null;
  @property(Label) goal:Label|null=null;
  @property(Graphics) progress:Graphics|null=null;
  updateView(level:number,progress:number,goal='目标：全部回窝'):void {
    this.level!.string=`第 ${level} 关`;this.goal!.string=goal;
    const g=this.progress!;g.clear();g.fillColor=new Color('#E8E1D2');g.roundRect(0,-8,400,16,8);g.fill();
    const width=Math.max(0,Math.min(1,progress))*400;
    if(width>0){g.fillColor=new Color('#548B70');g.roundRect(0,-8,width,16,Math.min(width/2,8));g.fill();}
  }
}
