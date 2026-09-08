# 03 · Cocos 场景与组织记忆

核对日期：2026-09-08。**现状与建议分开；本轮没有创建场景、Prefab 或脚本。**

## 现状

实际只有 `assets/game/scenes/main.scene`；包含 Canvas 与其下 Camera，GameRoot 负责运行时创建 Content 及页面节点。没有现成 Prefab；`assets/game/prefabs/`、`scripts/ui/`、`scripts/gameplay/`、`scripts/presentation/` 仍是旧文档的规划，不是已落地目录。

GameRoot 使用 Graphics/Label 拼画面，集中实现首页、地图、图鉴、设置、游戏、暂停、结算。不能据此声称有独立页面控制器或正式视觉组件。

## 后续建议：保留单场景，逐步拆分

以下树是**建议职责层级**，名称尚未创建；待新 UI 路线确认并授权实施后按实际需要引入，不先建大量空壳。

```text
main.scene
└─ Canvas
   ├─ Camera
   ├─ BackgroundLayer     纯装饰，可延伸到安全区外
   ├─ GameplayLayer       同一坐标系下的轨道、设施、猫链、发射物
   ├─ HudLayer            安全区内的目标、暂停、呼噜、道具
   ├─ PageLayer           首页、地图、图鉴、外观、设置
   ├─ ModalLayer          暂停、结算、复活、确认；阻断背景输入
   └─ ToastLayer          短提示、加载反馈
```

GameplayLayer 内 Source / Track / Chain / Launcher / Projectile / Lair 分工独立；设施从路径端点和切线定位。轨道、猫链与发射器整体等比适配，不能分别拉伸。SafeArea 应约束交互层，不能为避让 HUD 独自挪走发射器。

## Prefab 候选与职责

| 候选 | 职责 | 不应承担 |
|---|---|---|
| `CatView` | 品种外观、表情、局部动画、回收清理 | 猫链顺序/匹配规则 |
| `LauncherView` | 当前猫、下一只、朝向、交换反馈 | 生成普通猫链/判失败 |
| `SourceView` / `LairView` | 唯一设施的状态与洞口表现 | 决定整条路径几何 |
| `HudPanel` / `BoosterItem` | 快照展示、操作意图与禁用态 | 直接修改库存/会话 |
| `CommonButton` / `DialogBase` / `Toast` | 复用布局、状态、热区 | 各页业务的万能管理器 |
| 页面/结算面板 | 各自导航和状态绑定 | 平台 API 与核心算法 |

同类五猫优先一个结构配 SpriteFrame/数据，不复制五套逻辑；页面按复杂度决定是否独立 Prefab，不要求每个文字或静态图都做 Prefab。

## 脚本渐进拆分建议

- `app/GameRoot.ts` 留初始化、模块装配、导航入口；分批移出 UI 绘制，不一次重写所有逻辑。
- `core/` 保留纯规则、数据与路径数学。
- `gameplay/` 将来放输入、猫链/设施视图和投射物同步；`ui/` 放面板与公共组件。
- `presentation/` 将来映射规则事件到动画/音效；`services/` 在现有存档之外按需增加资源/音频服务。
- `platform/` 延续现有接口，待单独任务接入真实抖音能力。

## 场景资源纪律

- 资源与 `.meta` 成对保留，检查 UUID 引用；不删除 meta 再生成来“修复”丢引用。
- 用序列化属性显式绑定必要节点，少用长路径字符串查找；不在每帧搜索场景树。
- 监听在启用时注册、禁用/销毁时清理；对象池回收清理 tween、监听、透明度和临时状态。
- 页面切换不能误删尚需复活的会话快照；异步广告回调必须核对会话和失败快照身份。
- 编辑器可打开、引用完整、状态切换可测、真机截图与批准基线一致后才算对应视图完成。仅场景 JSON 有效不代表游戏可用。
