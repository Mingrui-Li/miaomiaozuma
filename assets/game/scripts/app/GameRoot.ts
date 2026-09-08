import {
  _decorator, Color, Component, EventTouch, Graphics, Label, Node, sys,
  UITransform, Vec3, view,
} from 'cc';
import { LEVELS } from '../../configs/Levels';
import { PATHS } from '../../configs/Paths';
import { GameSession } from '../core/GameSession';
import { PathSampler } from '../core/PathSampler';
import { CAT_TYPES, CatType, ChainPiece } from '../core/Types';
import { MockPlatformAdapter } from '../platform/MockPlatformAdapter';
import { PlatformAdapter } from '../platform/PlatformAdapter';
import { SaveDataV1, SaveService } from '../services/SaveService';

const { ccclass } = _decorator;
const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1334;

const PALETTE = {
  cream: new Color('#FFF8EE'),
  coral: new Color('#FF8A65'),
  mint: new Color('#66C7A5'),
  ink: new Color('#3E2C2A'),
  muted: new Color('#815D54'),
  gold: new Color('#FFD166'),
  track: new Color('#C4A979'),
  grass: new Color('#A9D8B8'),
  white: Color.WHITE,
};

const CAT_COLORS: Record<CatType, Color> = {
  orange: new Color('#F6A45B'),
  ragdoll: new Color('#E9D7CE'),
  blue: new Color('#7EA7C9'),
  calico: new Color('#E7B06B'),
  black: new Color('#514C55'),
};

@ccclass('GameRoot')
export class GameRoot extends Component {
  private readonly platform: PlatformAdapter = new MockPlatformAdapter();
  private saveService!: SaveService;
  private save!: SaveDataV1;
  private content!: Node;
  private session: GameSession | null = null;
  private path: PathSampler | null = null;
  private catNodes = new Map<number, Node>();
  private scoreLabel: Label | null = null;
  private purrLabel: Label | null = null;
  private goalLabel: Label | null = null;
  private currentLabel: Label | null = null;
  private nextLabel: Label | null = null;
  private currentLevel = 1;
  private lastResultState = '';

  protected override onLoad(): void {
    view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, 2);
    this.saveService = new SaveService(sys.localStorage);
    this.save = this.saveService.load();
    this.content = new Node('Content');
    this.content.layer = this.node.layer;
    this.content.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    this.node.addChild(this.content);
    this.platform.report('app_ready');
    this.showHome();
  }

  protected override update(deltaTime: number): void {
    if (!this.session || !this.path) return;
    this.session.tick(deltaTime);
    this.renderSession();
    if (this.session.state === 'Won' && this.lastResultState !== 'Won') {
      this.lastResultState = 'Won';
      const reward = this.saveService.recordWin(this.save, this.currentLevel, this.session.score, this.session.stars());
      this.scheduleOnce(() => this.showResult(true, reward), 0.35);
    } else if (this.session.state === 'Lost' && this.lastResultState !== 'Lost') {
      this.lastResultState = 'Lost';
      this.scheduleOnce(() => this.showResult(false, 0), 0.25);
    }
  }

  private resetContent(background: Color = PALETTE.cream): void {
    this.content.removeAllChildren();
    this.catNodes.clear();
    this.scoreLabel = null;
    this.purrLabel = null;
    this.goalLabel = null;
    this.currentLabel = null;
    this.nextLabel = null;
    this.session = null;
    this.path = null;
    const bg = this.shape('Background', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    const graphics = bg.addComponent(Graphics);
    graphics.fillColor = background;
    graphics.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
    graphics.fill();
  }

  private showHome(): void {
    this.resetContent();
    this.platform.report('home_view');
    this.circle('Sun Glow', 0, 320, 265, new Color('#FFE6A7'));
    this.text('治愈系猫猫祖玛', 0, 520, 26, PALETTE.muted);
    this.text('喵喵回窝', 0, 440, 74, new Color('#6B3F36'), true);
    this.text('把走丢的小猫送回温暖的家', 0, 375, 30, PALETTE.muted);
    const hero: Array<[CatType, number, number]> = [
      ['orange', 0, 235], ['blue', -105, 135], ['calico', 105, 135],
    ];
    for (const [type, x, y] of hero) this.drawCat(this.content, type, x, y, 88, type === 'orange' ? '♥' : '•ᴗ•');
    this.card('Continue Card', 0, -80, 638, 205, PALETTE.white);
    this.text('继续闯关', -245, -30, 26, new Color('#A56A55'), false, 'LEFT');
    this.text(`第 ${this.save.highestUnlockedLevel} 关 · ${LEVELS[this.save.highestUnlockedLevel - 1].name}`, -245, -88, 38, PALETTE.ink, true, 'LEFT');
    this.text(`小鱼干 ${this.save.fishBalance}`, 175, -28, 24, PALETTE.muted);
    this.button('StartButton', `开始第 ${this.save.highestUnlockedLevel} 关`, 0, -265, 530, 100, PALETTE.coral, () => this.startLevel(this.save.highestUnlockedLevel));
    this.button('MapButton', '24 关地图', -165, -400, 250, 82, PALETTE.mint, () => this.showMap());
    this.button('CollectionButton', '猫猫图鉴', 165, -400, 250, 82, new Color('#9B82BD'), () => this.showCollection());
    this.button('SettingsButton', '设置', 0, -515, 200, 70, new Color('#E7B06B'), () => this.showSettings());
  }

  private showMap(): void {
    this.resetContent(new Color('#FFF3D5'));
    this.text('选择猫猫小路', 0, 560, 52, PALETTE.ink, true);
    this.text('每章 6 关 · 共 24 关', 0, 505, 25, PALETTE.muted);
    for (let index = 0; index < 24; index++) {
      const level = index + 1;
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = -270 + col * 180;
      const y = 390 - row * 150;
      const unlocked = level <= this.save.highestUnlockedLevel;
      const stars = this.save.bestStarsByLevel[String(level)] ?? 0;
      this.button(`Level-${level}`, unlocked ? `${level}\n${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : '🔒', x, y, 130, 105, unlocked ? PALETTE.coral : new Color('#CFC3BD'), () => {
        if (unlocked) this.startLevel(level);
      }, 27);
    }
    this.button('BackButton', '返回首页', 0, -555, 260, 76, PALETTE.mint, () => this.showHome());
  }

  private showCollection(): void {
    this.resetContent(new Color('#F4ECF8'));
    this.text('猫猫图鉴', 0, 560, 56, PALETTE.ink, true);
    this.text('累计星星会遇见更多猫猫', 0, 510, 25, PALETTE.muted);
    const totalStars = Object.values(this.save.bestStarsByLevel).reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < 12; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = -230 + col * 230;
      const y = 350 - row * 230;
      const requirement = [3,6,9,12,15,18,21,24,30,36,48,60][i];
      const unlocked = totalStars >= requirement || i < 5;
      this.card(`Card-${i}`, x, y, 190, 190, unlocked ? PALETTE.white : new Color('#D8D0D9'));
      if (unlocked) this.drawCat(this.content, CAT_TYPES[i % 5], x, y + 22, 82);
      this.text(unlocked ? ['橘团','雪团','蓝莓','花卷','煤球'][i % 5] : `${requirement} 星解锁`, x, y - 58, 24, unlocked ? PALETTE.ink : PALETTE.muted, true);
    }
    this.button('BackButton', '返回首页', 0, -580, 260, 76, PALETTE.mint, () => this.showHome());
  }

  private showSettings(): void {
    this.resetContent(new Color('#EEF6F2'));
    this.text('设置', 0, 530, 58, PALETTE.ink, true);
    const rows: Array<[keyof SaveDataV1['settings'], string]> = [['music','音乐'],['sfx','音效'],['vibration','震动']];
    rows.forEach(([key, title], index) => {
      const y = 315 - index * 150;
      this.card(`Setting-${key}`, 0, y, 610, 110, PALETTE.white);
      this.text(title, -230, y, 32, PALETTE.ink, true, 'LEFT');
      this.button(`Toggle-${key}`, this.save.settings[key] ? '开启' : '关闭', 210, y, 130, 68, this.save.settings[key] ? PALETTE.mint : new Color('#BFB7B2'), () => {
        this.save.settings[key] = !this.save.settings[key];
        this.saveService.save(this.save);
        this.showSettings();
      }, 24);
    });
    this.text('隐私政策 · 适龄提示 · 版本 0.1.0', 0, -240, 23, PALETTE.muted);
    this.button('BackButton', '保存并返回', 0, -450, 320, 84, PALETTE.coral, () => this.showHome());
  }

  private startLevel(levelId: number): void {
    const level = LEVELS[levelId - 1];
    this.currentLevel = levelId;
    this.resetContent(new Color('#F7E8C8'));
    this.path = new PathSampler(PATHS[level.pathId]);
    this.session = new GameSession(level, this.path.length);
    this.session.start();
    this.lastResultState = '';
    this.platform.report('level_start', { level_id: levelId });
    void this.platform.startRecord();

    this.drawHud(levelId, level.name);
    this.drawTrack();
    const input = this.shape('AimSurface', 0, -10, DESIGN_WIDTH, 1040);
    input.on(Node.EventType.TOUCH_END, this.onAimEnd, this);
    this.button('Swap', '↻ 交换', -270, -565, 150, 70, PALETTE.mint, () => {
      this.session?.swapShots();
      this.renderSession();
    }, 23);
    this.button('Rainbow', '彩虹猫', 270, -565, 150, 70, new Color('#9B82BD'), () => {
      this.session?.useRainbow();
      this.renderSession();
    }, 23);
    this.button('Home', '暂停', 0, 590, 120, 58, new Color('#E7B06B'), () => {
      this.session?.pause();
      this.showPause();
    }, 22);
    this.renderSession();
  }

  private drawHud(levelId: number, name: string): void {
    this.card('TopBar', 0, 590, 750, 154, PALETTE.cream);
    this.text(`第 ${levelId} 关 · ${name}`, -285, 615, 30, PALETTE.ink, true, 'LEFT');
    this.scoreLabel = this.text('0', 270, 615, 30, PALETTE.ink, true).getComponent(Label)!;
    this.goalLabel = this.text('送猫猫回窝', -285, 573, 22, PALETTE.muted, false, 'LEFT').getComponent(Label)!;
    this.card('PurrBG', 0, 510, 640, 42, PALETTE.white);
    this.purrLabel = this.text('呼噜值 0%', 0, 510, 22, PALETTE.ink, true).getComponent(Label)!;
    this.currentLabel = this.text('当前：橘猫', -120, -500, 24, PALETTE.ink, true).getComponent(Label)!;
    this.nextLabel = this.text('下一只：蓝猫', 150, -500, 22, PALETTE.muted).getComponent(Label)!;
  }

  private drawTrack(): void {
    if (!this.path) return;
    const trackNode = new Node('Track');
    trackNode.layer = this.node.layer;
    const graphics = trackNode.addComponent(Graphics);
    graphics.lineWidth = 82;
    graphics.strokeColor = new Color('#E7CFA6');
    const first = this.toLocal(this.path.samples[0].position.x, this.path.samples[0].position.y);
    graphics.moveTo(first.x, first.y);
    for (let i = 1; i < this.path.samples.length; i += 4) {
      const point = this.path.samples[i].position;
      const local = this.toLocal(point.x, point.y);
      graphics.lineTo(local.x, local.y);
    }
    graphics.stroke();
    graphics.lineWidth = 4;
    graphics.strokeColor = PALETTE.track;
    graphics.stroke();
    this.content.addChild(trackNode);
    trackNode.setSiblingIndex(1);
    const end = this.toLocal(this.path.samples[this.path.samples.length - 1].position.x, this.path.samples[this.path.samples.length - 1].position.y);
    this.circle('HomeTarget', end.x, end.y, 72, PALETTE.mint);
    this.text('⌂', end.x, end.y, 48, PALETTE.white, true);
  }

  private onAimEnd(event: EventTouch): void {
    if (!this.session || !this.path || this.session.state !== 'Playing') return;
    const location = event.getUILocation();
    const local = this.content.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(location.x, location.y));
    const design = { x: local.x + DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2 - local.y };
    const projection = this.path.projectPoint(design);
    this.session.shootAtDistance(projection.distance);
    void this.platform.vibrate('light');
    this.renderSession();
  }

  private renderSession(): void {
    if (!this.session || !this.path) return;
    const active = new Set<number>();
    for (const piece of this.session.pieces) {
      if (piece.distance < 0) continue;
      active.add(piece.id);
      let cat = this.catNodes.get(piece.id);
      if (!cat) {
        cat = this.createCatNode(piece);
        this.catNodes.set(piece.id, cat);
        this.content.addChild(cat);
      }
      const sample = this.path.sampleAtDistance(piece.distance);
      const local = this.toLocal(sample.position.x, sample.position.y);
      cat.setPosition(local.x, local.y);
    }
    for (const [id, node] of this.catNodes) {
      if (!active.has(id)) {
        node.destroy();
        this.catNodes.delete(id);
      }
    }
    this.scoreLabel!.string = this.session.score.toLocaleString();
    this.purrLabel!.string = `呼噜值 ${Math.round(this.session.purr)}%`;
    this.goalLabel!.string = `队伍 ${this.session.pieces.length} · 待出发 ${this.session.remainingToSpawn}`;
    this.currentLabel!.string = `当前：${this.catName(this.session.currentShot.catType)}`;
    this.nextLabel!.string = `下一只：${this.catName(this.session.nextShot.catType)}`;
  }

  private createCatNode(piece: ChainPiece): Node {
    const node = new Node(`Cat-${piece.id}`);
    node.layer = this.node.layer;
    node.addComponent(UITransform).setContentSize(64, 64);
    const graphics = node.addComponent(Graphics);
    const color = piece.kind === 'boxed' ? new Color('#B88652') : piece.kind === 'dusty' ? new Color('#A8A2A0') : piece.kind === 'rainbow' ? new Color('#C890D5') : CAT_COLORS[piece.catType ?? 'orange'];
    graphics.fillColor = color;
    graphics.circle(0, 0, 31);
    graphics.fill();
    graphics.moveTo(-22, 18); graphics.lineTo(-13, 38); graphics.lineTo(-4, 22); graphics.close(); graphics.fill();
    graphics.moveTo(22, 18); graphics.lineTo(13, 38); graphics.lineTo(4, 22); graphics.close(); graphics.fill();
    graphics.fillColor = PALETTE.ink;
    graphics.circle(-10, 4, 3); graphics.circle(10, 4, 3); graphics.fill();
    if (piece.kind === 'boxed') {
      graphics.strokeColor = PALETTE.white; graphics.lineWidth = 4; graphics.rect(-24, -20, 48, 32); graphics.stroke();
    }
    return node;
  }

  private showPause(): void {
    const overlay = this.card('PauseOverlay', 0, 0, 620, 520, PALETTE.white);
    this.text('猫猫等你回来', 0, 155, 46, PALETTE.ink, true, 'CENTER', overlay);
    this.button('Resume', '继续送猫猫', 0, 55, 430, 86, PALETTE.coral, () => {
      overlay.destroy();
      this.session?.resume();
    }, 28, overlay);
    this.button('Restart', '重新开始', 0, -55, 360, 76, PALETTE.mint, () => this.startLevel(this.currentLevel), 26, overlay);
    this.button('Exit', '返回首页', 0, -155, 300, 68, new Color('#CFC3BD'), () => this.showHome(), 24, overlay);
    overlay.setSiblingIndex(this.content.children.length - 1);
  }

  private showResult(victory: boolean, reward: number): void {
    const score = this.session?.score ?? 0;
    const stars = this.session?.stars() ?? 0;
    this.resetContent(victory ? new Color('#FFF3D5') : new Color('#EDE7F3'));
    this.circle('Glow', 0, 345, 250, victory ? PALETTE.gold : new Color('#CFC3DD'));
    this.drawCat(this.content, victory ? 'orange' : 'blue', 0, 365, 96, victory ? '♥ᴗ♥' : '；︿；');
    this.text(victory ? '全员回窝！' : '猫猫快迷路啦', 0, 225, 60, PALETTE.ink, true);
    this.text(victory ? '呼噜声响彻整个小院' : '再给它们一次机会吧', 0, 165, 28, PALETTE.muted);
    this.card('ResultCard', 0, -5, 620, 265, PALETTE.white);
    this.text(victory ? score.toLocaleString() : `还差 ${Math.max(1, this.session?.pieces.length ?? 1)} 只`, 0, 55, 58, PALETTE.ink, true);
    this.text(victory ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · 获得 ${reward} 小鱼干` : '免费复活会让猫链后退 6 格', 0, -35, 26, PALETTE.muted);
    if (victory) {
      this.button('Next', this.currentLevel < 24 ? '下一关' : '返回地图', 0, -240, 460, 92, PALETTE.coral, () => this.currentLevel < 24 ? this.startLevel(this.currentLevel + 1) : this.showMap());
      this.button('Replay', '再玩一次', 0, -360, 330, 78, PALETTE.mint, () => this.startLevel(this.currentLevel));
    } else {
      this.button('Revive', this.currentLevel <= 5 ? '免费复活' : '看视频复活', 0, -240, 460, 92, new Color('#7E68A5'), () => this.startLevel(this.currentLevel));
      this.button('Restart', '重新开始', 0, -360, 330, 78, PALETTE.mint, () => this.startLevel(this.currentLevel));
    }
    this.button('Home', '返回首页', 0, -470, 260, 66, new Color('#CFC3BD'), () => this.showHome(), 23);
  }

  private shape(name: string, x: number, y: number, width: number, height: number, parent = this.content): Node {
    const node = new Node(name);
    node.layer = this.node.layer;
    node.addComponent(UITransform).setContentSize(width, height);
    node.setPosition(x, y);
    parent.addChild(node);
    return node;
  }

  private card(name: string, x: number, y: number, width: number, height: number, color: Color, parent = this.content): Node {
    const node = this.shape(name, x, y, width, height, parent);
    const g = node.addComponent(Graphics);
    g.fillColor = color;
    const radius = Math.min(34, height / 2);
    g.roundRect(-width / 2, -height / 2, width, height, radius);
    g.fill();
    return node;
  }

  private circle(name: string, x: number, y: number, diameter: number, color: Color, parent = this.content): Node {
    const node = this.shape(name, x, y, diameter, diameter, parent);
    const g = node.addComponent(Graphics);
    g.fillColor = color;
    g.circle(0, 0, diameter / 2);
    g.fill();
    return node;
  }

  private text(name: string, x: number, y: number, size: number, color: Color, bold = false, align: 'LEFT' | 'CENTER' = 'CENTER', parent = this.content): Node {
    const node = this.shape(`Text/${name}`, x, y, 680, Math.max(48, size * 1.5), parent);
    const label = node.addComponent(Label);
    label.string = name;
    label.fontSize = size;
    label.lineHeight = Math.round(size * 1.25);
    label.color = color;
    label.isBold = bold;
    label.horizontalAlign = align === 'LEFT' ? 0 : 1;
    label.verticalAlign = 1;
    return node;
  }

  private button(name: string, title: string, x: number, y: number, width: number, height: number, color: Color, action: () => void, fontSize = 30, parent = this.content): Node {
    const node = this.card(name, x, y, width, height, color, parent);
    this.text(title, 0, 0, fontSize, PALETTE.white, true, 'CENTER', node);
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      action();
    });
    return node;
  }

  private drawCat(parent: Node, type: CatType, x: number, y: number, size: number, face = '•ᴗ•'): Node {
    const node = this.circle(`DecorCat/${type}`, x, y, size, CAT_COLORS[type], parent);
    const g = node.getComponent(Graphics)!;
    g.moveTo(-size * 0.34, size * 0.25); g.lineTo(-size * 0.18, size * 0.63); g.lineTo(-size * 0.04, size * 0.3); g.close(); g.fill();
    g.moveTo(size * 0.34, size * 0.25); g.lineTo(size * 0.18, size * 0.63); g.lineTo(size * 0.04, size * 0.3); g.close(); g.fill();
    this.text(face, 0, -2, Math.round(size * 0.23), PALETTE.ink, true, 'CENTER', node);
    return node;
  }

  private toLocal(x: number, y: number): { x: number; y: number } {
    return { x: x - DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2 - y };
  }

  private catName(type: CatType | null): string {
    if (!type) return '彩虹猫';
    return { orange: '橘猫', ragdoll: '布偶', blue: '蓝猫', calico: '三花', black: '玄猫' }[type];
  }
}
